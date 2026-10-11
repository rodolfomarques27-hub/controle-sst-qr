import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BIOMETRIC_REFERENCE_SET_STATUS,
  BIOMETRIC_REFERENCE_STATUS,
  EMBEDDING_DIM,
  MAX_ACTIVE_REFERENCES,
  MIN_ACTIVE_REFERENCES,
  activateBiometricReferenceSet,
  assertProfileCompatible,
  classifyReferenceSet,
  createBiometricReference,
  createBiometricReferenceSet,
  createQualityProfile,
  evaluateReferenceQuality,
  isProfileCompatible,
  rebuildBiometricCentroid,
  retireBiometricReferenceSet,
  transitionBiometricReference,
  validateEmbedding128,
} from '../src/identity/biometricReferenceLifecycle.mjs';

const PROFILE = Object.freeze({
  profileId: 'sface-v1',
  modelId: 'sface',
  modelSha256:
    'A'.repeat(64),
  embeddingDim: 128,
  alignmentVersion:
    'align-v1',
  preprocessVersion:
    'pre-v1',
  normalizationVersion:
    'l2-v1',
});

const OTHER_PROFILE =
  Object.freeze({
    ...PROFILE,
    profileId:
      'sface-v2',
    modelSha256:
      'B'.repeat(64),
  });

const QUALITY =
  Object.freeze({
    qualityProfileId:
      'quality-v1',

    version:
      '1',

    rules:
      Object.freeze({
        minFaceScore: 0.5,
        minFaceSizePx: 20,
        minVisibleAreaRatio: 0.5,
        maxAlignmentRms: 10,
        embeddingL2Tolerance: 1e-5,
      }),
  });

function unitEmbedding(
  index = 0,
) {
  const embedding =
    new Float32Array(
      EMBEDDING_DIM,
    );

  embedding[
    index %
      EMBEDDING_DIM
  ] = 1;

  return embedding;
}

function activeReference(
  referenceId,
  index = 0,
  overrides = {},
) {
  return createBiometricReference({
    referenceId,

    collaboratorId:
      'col-1',

    profile:
      PROFILE,

    qualityProfileId:
      QUALITY.qualityProfileId,

    sourceRef:
      `source://${referenceId}`,

    status:
      BIOMETRIC_REFERENCE_STATUS.ACTIVE,

    embedding:
      unitEmbedding(index),

    ...overrides,
  });
}

test(
  'qualityProfile exige todos os thresholds injetados e nao cria defaults produtivos',
  () => {
    assert.throws(
      () =>
        createQualityProfile({
          qualityProfileId:
            'q',

          version:
            '1',

          rules: {
            minFaceScore:
              0.5,
          },
        }),
      /deve ser injetado explicitamente/,
    );

    assert.deepEqual(
      createQualityProfile(
        QUALITY,
      ).rules,
      QUALITY.rules,
    );
  },
);

test(
  'qualidade aprova apenas evidencia sintetica completa, compativel e auditavel',
  () => {
    const result =
      evaluateReferenceQuality({
        qualityProfile:
          QUALITY,

        expectedProfile:
          PROFILE,

        evidence: {
          faceCount:
            1,

          faceScore:
            0.9,

          faceSize: {
            width: 120,
            height: 120,
          },

          visibleAreaRatio:
            0.95,

          alignmentRms:
            2,

          embedding:
            unitEmbedding(0),

          profile:
            PROFILE,

          sourceRef:
            'enrollment://synthetic/ref-1',
        },
      });

    assert.equal(
      result.approved,
      true,
    );

    assert.deepEqual(
      result.reasons,
      [],
    );
  },
);

test(
  'qualidade rejeita multipla face e profile incompatível sem produzir MATCH',
  () => {
    const result =
      evaluateReferenceQuality({
        qualityProfile:
          QUALITY,

        expectedProfile:
          PROFILE,

        evidence: {
          faceCount:
            2,

          faceScore:
            0.9,

          faceSize: {
            width: 120,
            height: 120,
          },

          visibleAreaRatio:
            0.95,

          alignmentRms:
            2,

          embedding:
            unitEmbedding(0),

          profile:
            OTHER_PROFILE,

          sourceRef:
            'enrollment://synthetic/ref-2',
        },
      });

    assert.equal(
      result.approved,
      false,
    );

    assert.ok(
      result.reasons.includes(
        'FACE_COUNT_INVALID',
      ),
    );

    assert.ok(
      result.reasons.includes(
        'PROFILE_INCOMPATIBLE',
      ),
    );
  },
);

test(
  'embedding estrutural deve ser Float32Array 128-D finito',
  () => {
    assert.equal(
      validateEmbedding128(
        unitEmbedding(3),
      ).valid,
      true,
    );

    assert.equal(
      validateEmbedding128(
        new Float32Array(
          127,
        ),
      ).valid,
      false,
    );

    const invalid =
      unitEmbedding(0);

    invalid[7] =
      Number.NaN;

    assert.equal(
      validateEmbedding128(
        invalid,
      ).reason,
      'EMBEDDING_NON_FINITE',
    );
  },
);

test(
  'profile compatível exige igualdade exata de todos os campos versionados',
  () => {
    assert.equal(
      isProfileCompatible(
        PROFILE,
        {
          ...PROFILE,
        },
      ),
      true,
    );

    assert.equal(
      isProfileCompatible(
        PROFILE,
        OTHER_PROFILE,
      ),
      false,
    );

    assert.throws(
      () =>
        assertProfileCompatible(
          PROFILE,
          OTHER_PROFILE,
        ),
      /incompativeis/,
    );
  },
);

test(
  'lifecycle individual segue apenas transicoes autorizadas',
  () => {
    const captured =
      createBiometricReference({
        referenceId:
          'r1',

        collaboratorId:
          'col-1',

        profile:
          PROFILE,

        qualityProfileId:
          QUALITY.qualityProfileId,

        sourceRef:
          'enrollment://r1',
      });

    const pending =
      transitionBiometricReference(
        captured,
        BIOMETRIC_REFERENCE_STATUS.QUALITY_PENDING,
      );

    const approved =
      transitionBiometricReference(
        pending,
        BIOMETRIC_REFERENCE_STATUS.QUALITY_APPROVED,
      );

    const ready =
      createBiometricReference({
        ...approved,

        status:
          BIOMETRIC_REFERENCE_STATUS.EMBEDDING_READY,

        embedding:
          unitEmbedding(0),
      });

    const active =
      transitionBiometricReference(
        ready,
        BIOMETRIC_REFERENCE_STATUS.ACTIVE,
      );

    assert.equal(
      active.status,
      BIOMETRIC_REFERENCE_STATUS.ACTIVE,
    );

    assert.throws(
      () =>
        transitionBiometricReference(
          active,
          BIOMETRIC_REFERENCE_STATUS.QUALITY_PENDING,
        ),
      /Transicao biometrica invalida/,
    );
  },
);

test(
  'REVOKED e QUARANTINED nao contam para suficiencia do referenceSet',
  () => {
    const references = [
      activeReference(
        'r1',
        0,
      ),

      activeReference(
        'r2',
        1,
      ),

      createBiometricReference({
        ...activeReference(
          'r3',
          2,
        ),

        status:
          BIOMETRIC_REFERENCE_STATUS.REVOKED,
      }),

      createBiometricReference({
        ...activeReference(
          'r4',
          3,
        ),

        status:
          BIOMETRIC_REFERENCE_STATUS.QUARANTINED,
      }),
    ];

    assert.equal(
      classifyReferenceSet({
        collaboratorId:
          'col-1',

        profile:
          PROFILE,

        references,
      }),

      BIOMETRIC_REFERENCE_SET_STATUS.INSUFFICIENT,
    );
  },
);

test(
  '0 ACTIVE => BUILDING, 1-2 => INSUFFICIENT, 3-5 => READY',
  () => {
    assert.equal(
      classifyReferenceSet({
        collaboratorId:
          'col-1',

        profile:
          PROFILE,

        references:
          [],
      }),

      BIOMETRIC_REFERENCE_SET_STATUS.BUILDING,
    );

    assert.equal(
      classifyReferenceSet({
        collaboratorId:
          'col-1',

        profile:
          PROFILE,

        references: [
          activeReference(
            'r1',
          ),
        ],
      }),

      BIOMETRIC_REFERENCE_SET_STATUS.INSUFFICIENT,
    );

    assert.equal(
      classifyReferenceSet({
        collaboratorId:
          'col-1',

        profile:
          PROFILE,

        references: [
          activeReference(
            'r1',
          ),

          activeReference(
            'r2',
          ),
        ],
      }),

      BIOMETRIC_REFERENCE_SET_STATUS.INSUFFICIENT,
    );

    assert.equal(
      classifyReferenceSet({
        collaboratorId:
          'col-1',

        profile:
          PROFILE,

        references: [
          activeReference(
            'r1',
          ),

          activeReference(
            'r2',
          ),

          activeReference(
            'r3',
          ),
        ],
      }),

      BIOMETRIC_REFERENCE_SET_STATUS.READY,
    );

    assert.equal(
      MIN_ACTIVE_REFERENCES,
      3,
    );

    assert.equal(
      MAX_ACTIVE_REFERENCES,
      5,
    );
  },
);

test(
  'mais de 5 referencias ACTIVE e rejeitado',
  () => {
    const references =
      Array.from(
        {
          length: 6,
        },

        (_, i) =>
          activeReference(
            `r${i + 1}`,
            i,
          ),
      );

    assert.throws(
      () =>
        classifyReferenceSet({
          collaboratorId:
            'col-1',

          profile:
            PROFILE,

          references,
        }),
      /Maximo de 5/,
    );
  },
);

test(
  'centroid usa apenas ACTIVE, e deterministico pela ordenacao de referenceId',
  () => {
    const r1 =
      activeReference(
        'r-b',
        0,
      );

    const r2 =
      activeReference(
        'r-a',
        1,
      );

    const r3 =
      activeReference(
        'r-c',
        2,
      );

    const revoked =
      createBiometricReference({
        ...activeReference(
          'r-z',
          3,
        ),

        status:
          BIOMETRIC_REFERENCE_STATUS.REVOKED,
      });

    const a =
      rebuildBiometricCentroid({
        centroidId:
          'c1',

        referenceSetId:
          'set-1',

        collaboratorId:
          'col-1',

        profile:
          PROFILE,

        references: [
          r1,
          revoked,
          r3,
          r2,
        ],

        version:
          '1',
      });

    const b =
      rebuildBiometricCentroid({
        centroidId:
          'c2',

        referenceSetId:
          'set-1',

        collaboratorId:
          'col-1',

        profile:
          PROFILE,

        references: [
          r2,
          r1,
          r3,
        ],

        version:
          '1',
      });

    assert.deepEqual(
      a.contributingReferenceIds,
      [
        'r-a',
        'r-b',
        'r-c',
      ],
    );

    assert.deepEqual(
      Array.from(
        a.embedding,
      ),

      Array.from(
        b.embedding,
      ),
    );

    assert.equal(
      validateEmbedding128(
        a.embedding,
        {
          l2Tolerance:
            1e-5,
        },
      ).valid,

      true,
    );
  },
);

test(
  'centroid bloqueia mistura de colaborador ou profile',
  () => {
    const wrongCollaborator =
      activeReference(
        'r3',
        2,
        {
          collaboratorId:
            'col-2',
        },
      );

    assert.throws(
      () =>
        rebuildBiometricCentroid({
          centroidId:
            'c1',

          referenceSetId:
            'set-1',

          collaboratorId:
            'col-1',

          profile:
            PROFILE,

          references: [
            activeReference(
              'r1',
            ),

            activeReference(
              'r2',
              1,
            ),

            wrongCollaborator,
          ],

          version:
            '1',
        }),
      /colaboradores diferentes/,
    );

    const wrongProfile =
      activeReference(
        'r3',
        2,
        {
          profile:
            OTHER_PROFILE,
        },
      );

    assert.throws(
      () =>
        rebuildBiometricCentroid({
          centroidId:
            'c1',

          referenceSetId:
            'set-1',

          collaboratorId:
            'col-1',

          profile:
            PROFILE,

          references: [
            activeReference(
              'r1',
            ),

            activeReference(
              'r2',
              1,
            ),

            wrongProfile,
          ],

          version:
            '1',
        }),
      /incompativeis/,
    );
  },
);

test(
  'status READY nao pode ser forjado quando o conjunto ainda e insuficiente',
  () => {
    const refs = [
      activeReference(
        'r1',
        0,
      ),

      activeReference(
        'r2',
        1,
      ),
    ];

    assert.throws(
      () =>
        createBiometricReferenceSet({
          referenceSetId:
            'set-forged',

          collaboratorId:
            'col-1',

          profile:
            PROFILE,

          qualityProfileId:
            QUALITY.qualityProfileId,

          references:
            refs,

          status:
            BIOMETRIC_REFERENCE_SET_STATUS.READY,
        }),
      /diverge do estado derivado INSUFFICIENT/,
    );
  },
);

test(
  'referenceSet READY ativa somente com centroid das referencias ACTIVE atuais',
  () => {
    const refs = [
      activeReference(
        'r1',
        0,
      ),

      activeReference(
        'r2',
        1,
      ),

      activeReference(
        'r3',
        2,
      ),
    ];

    const set =
      createBiometricReferenceSet({
        referenceSetId:
          'set-1',

        collaboratorId:
          'col-1',

        profile:
          PROFILE,

        qualityProfileId:
          QUALITY.qualityProfileId,

        references:
          refs,
      });

    assert.equal(
      set.status,
      BIOMETRIC_REFERENCE_SET_STATUS.READY,
    );

    const centroid =
      rebuildBiometricCentroid({
        centroidId:
          'c1',

        referenceSetId:
          'set-1',

        collaboratorId:
          'col-1',

        profile:
          PROFILE,

        references:
          refs,

        version:
          '1',
      });

    const active =
      activateBiometricReferenceSet(
        set,
        refs,
        centroid,
      );

    assert.equal(
      active.status,
      BIOMETRIC_REFERENCE_SET_STATUS.ACTIVE,
    );

    assert.equal(
      active.centroid.centroidId,
      'c1',
    );
  },
);

test(
  'referenceSet ACTIVE pode ser SUPERSEDED ou REVOKED',
  () => {
    const refs = [
      activeReference(
        'r1',
        0,
      ),

      activeReference(
        'r2',
        1,
      ),

      activeReference(
        'r3',
        2,
      ),
    ];

    const set =
      createBiometricReferenceSet({
        referenceSetId:
          'set-1',

        collaboratorId:
          'col-1',

        profile:
          PROFILE,

        qualityProfileId:
          QUALITY.qualityProfileId,

        references:
          refs,
      });

    const centroid =
      rebuildBiometricCentroid({
        centroidId:
          'c1',

        referenceSetId:
          'set-1',

        collaboratorId:
          'col-1',

        profile:
          PROFILE,

        references:
          refs,

        version:
          '1',
      });

    const active =
      activateBiometricReferenceSet(
        set,
        refs,
        centroid,
      );

    assert.equal(
      retireBiometricReferenceSet(
        active,
        BIOMETRIC_REFERENCE_SET_STATUS.SUPERSEDED,
      ).status,

      BIOMETRIC_REFERENCE_SET_STATUS.SUPERSEDED,
    );

    assert.equal(
      retireBiometricReferenceSet(
        active,
        BIOMETRIC_REFERENCE_SET_STATUS.REVOKED,
      ).status,

      BIOMETRIC_REFERENCE_SET_STATUS.REVOKED,
    );
  },
);