export const BIOMETRIC_REFERENCE_STATUS = Object.freeze({
  SOURCE_CAPTURED: 'SOURCE_CAPTURED',
  QUALITY_PENDING: 'QUALITY_PENDING',
  QUALITY_APPROVED: 'QUALITY_APPROVED',
  EMBEDDING_READY: 'EMBEDDING_READY',
  ACTIVE: 'ACTIVE',
  QUARANTINED: 'QUARANTINED',
  REVOKED: 'REVOKED',
});

export const BIOMETRIC_REFERENCE_SET_STATUS = Object.freeze({
  BUILDING: 'BUILDING',
  INSUFFICIENT: 'INSUFFICIENT',
  READY: 'READY',
  ACTIVE: 'ACTIVE',
  SUPERSEDED: 'SUPERSEDED',
  REVOKED: 'REVOKED',
});

export const MIN_ACTIVE_REFERENCES = 3;
export const MAX_ACTIVE_REFERENCES = 5;
export const EMBEDDING_DIM = 128;

export const PROFILE_FIELDS = Object.freeze([
  'profileId',
  'modelId',
  'modelSha256',
  'embeddingDim',
  'alignmentVersion',
  'preprocessVersion',
  'normalizationVersion',
]);

export const QUALITY_RULE_FIELDS = Object.freeze([
  'minFaceScore',
  'minFaceSizePx',
  'minVisibleAreaRatio',
  'maxAlignmentRms',
  'embeddingL2Tolerance',
]);

const REFERENCE_TRANSITIONS = Object.freeze({
  SOURCE_CAPTURED: new Set([
    'QUALITY_PENDING',
    'QUARANTINED',
    'REVOKED',
  ]),

  QUALITY_PENDING: new Set([
    'QUALITY_APPROVED',
    'QUARANTINED',
    'REVOKED',
  ]),

  QUALITY_APPROVED: new Set([
    'EMBEDDING_READY',
    'QUARANTINED',
    'REVOKED',
  ]),

  EMBEDDING_READY: new Set([
    'ACTIVE',
    'QUARANTINED',
    'REVOKED',
  ]),

  ACTIVE: new Set([
    'QUARANTINED',
    'REVOKED',
  ]),

  QUARANTINED: new Set([
    'REVOKED',
  ]),

  REVOKED: new Set(),
});

function requireNonEmptyString(
  value,
  label,
) {
  if (
    typeof value !== 'string' ||
    value.trim() === ''
  ) {
    throw new TypeError(
      `${label} e obrigatorio.`,
    );
  }

  return value.trim();
}

function requireFiniteNumber(
  value,
  label,
) {
  if (!Number.isFinite(value)) {
    throw new TypeError(
      `${label} deve ser numero finito.`,
    );
  }

  return value;
}

function cloneProfile(profile) {
  if (
    !profile ||
    typeof profile !== 'object' ||
    Array.isArray(profile)
  ) {
    throw new TypeError(
      'profile e obrigatorio.',
    );
  }

  const normalized = {};

  for (
    const field of PROFILE_FIELDS
  ) {
    if (
      field === 'embeddingDim'
    ) {
      const dim =
        requireFiniteNumber(
          profile[field],
          `profile.${field}`,
        );

      if (
        !Number.isInteger(dim) ||
        dim !== EMBEDDING_DIM
      ) {
        throw new RangeError(
          `profile.embeddingDim deve ser ${EMBEDDING_DIM}.`,
        );
      }

      normalized[field] = dim;

      continue;
    }

    normalized[field] =
      requireNonEmptyString(
        profile[field],
        `profile.${field}`,
      );
  }

  return Object.freeze(
    normalized,
  );
}

export function isProfileCompatible(
  leftProfile,
  rightProfile,
) {
  const left =
    cloneProfile(leftProfile);

  const right =
    cloneProfile(rightProfile);

  return PROFILE_FIELDS.every(
    (field) =>
      left[field] === right[field],
  );
}

export function assertProfileCompatible(
  leftProfile,
  rightProfile,
) {
  if (
    !isProfileCompatible(
      leftProfile,
      rightProfile,
    )
  ) {
    throw new Error(
      'Profiles biometricos incompativeis nao podem ser misturados.',
    );
  }
}

export function createQualityProfile({
  qualityProfileId,
  version,
  rules,
}) {
  const id =
    requireNonEmptyString(
      qualityProfileId,
      'qualityProfileId',
    );

  const normalizedVersion =
    requireNonEmptyString(
      version,
      'qualityProfile.version',
    );

  if (
    !rules ||
    typeof rules !== 'object' ||
    Array.isArray(rules)
  ) {
    throw new TypeError(
      'qualityProfile.rules deve ser informado sem defaults produtivos.',
    );
  }

  const normalizedRules = {};

  for (
    const field of QUALITY_RULE_FIELDS
  ) {
    if (!(field in rules)) {
      throw new Error(
        `qualityProfile.rules.${field} deve ser injetado explicitamente.`,
      );
    }

    normalizedRules[field] =
      requireFiniteNumber(
        rules[field],
        `qualityProfile.rules.${field}`,
      );
  }

  if (
    normalizedRules.minFaceScore < 0 ||
    normalizedRules.minFaceScore > 1
  ) {
    throw new RangeError(
      'minFaceScore deve estar entre 0 e 1.',
    );
  }

  if (
    normalizedRules.minFaceSizePx <= 0
  ) {
    throw new RangeError(
      'minFaceSizePx deve ser maior que zero.',
    );
  }

  if (
    normalizedRules.minVisibleAreaRatio < 0 ||
    normalizedRules.minVisibleAreaRatio > 1
  ) {
    throw new RangeError(
      'minVisibleAreaRatio deve estar entre 0 e 1.',
    );
  }

  if (
    normalizedRules.maxAlignmentRms < 0
  ) {
    throw new RangeError(
      'maxAlignmentRms nao pode ser negativo.',
    );
  }

  if (
    normalizedRules.embeddingL2Tolerance <= 0
  ) {
    throw new RangeError(
      'embeddingL2Tolerance deve ser maior que zero.',
    );
  }

  return Object.freeze({
    qualityProfileId: id,
    version: normalizedVersion,
    rules: Object.freeze(
      normalizedRules,
    ),
  });
}

export function validateEmbedding128(
  embedding,
  {
    l2Tolerance,
  } = {},
) {
  if (
    !(
      embedding instanceof
      Float32Array
    )
  ) {
    return Object.freeze({
      valid: false,
      reason: 'EMBEDDING_TYPE_INVALID',
    });
  }

  if (
    embedding.length !==
    EMBEDDING_DIM
  ) {
    return Object.freeze({
      valid: false,
      reason: 'EMBEDDING_DIM_INVALID',
    });
  }

  let sumSquares = 0;

  for (
    const value of embedding
  ) {
    if (
      !Number.isFinite(value)
    ) {
      return Object.freeze({
        valid: false,
        reason: 'EMBEDDING_NON_FINITE',
      });
    }

    sumSquares +=
      value * value;
  }

  const norm =
    Math.sqrt(sumSquares);

  if (
    !Number.isFinite(norm) ||
    norm === 0
  ) {
    return Object.freeze({
      valid: false,
      reason: 'EMBEDDING_NORM_INVALID',
    });
  }

  if (
    l2Tolerance !== undefined
  ) {
    const tolerance =
      requireFiniteNumber(
        l2Tolerance,
        'l2Tolerance',
      );

    if (tolerance <= 0) {
      throw new RangeError(
        'l2Tolerance deve ser maior que zero.',
      );
    }

    if (
      Math.abs(norm - 1) >
      tolerance
    ) {
      return Object.freeze({
        valid: false,
        reason:
          'EMBEDDING_NOT_L2_NORMALIZED',
      });
    }
  }

  return Object.freeze({
    valid: true,
    reason: null,
    norm,
  });
}

export function evaluateReferenceQuality({
  qualityProfile,
  evidence,
  expectedProfile,
}) {
  const qp =
    createQualityProfile(
      qualityProfile,
    );

  if (
    !evidence ||
    typeof evidence !== 'object' ||
    Array.isArray(evidence)
  ) {
    throw new TypeError(
      'quality evidence e obrigatoria.',
    );
  }

  const reasons = [];

  if (
    evidence.faceCount !== 1
  ) {
    reasons.push(
      'FACE_COUNT_INVALID',
    );
  }

  if (
    !Number.isFinite(
      evidence.faceScore,
    ) ||
    evidence.faceScore <
      qp.rules.minFaceScore
  ) {
    reasons.push(
      'FACE_SCORE_BELOW_MIN',
    );
  }

  const width =
    evidence.faceSize?.width;

  const height =
    evidence.faceSize?.height;

  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    Math.min(width, height) <
      qp.rules.minFaceSizePx
  ) {
    reasons.push(
      'FACE_SIZE_BELOW_MIN',
    );
  }

  if (
    !Number.isFinite(
      evidence.visibleAreaRatio,
    ) ||
    evidence.visibleAreaRatio <
      qp.rules.minVisibleAreaRatio
  ) {
    reasons.push(
      'VISIBLE_AREA_BELOW_MIN',
    );
  }

  if (
    !Number.isFinite(
      evidence.alignmentRms,
    ) ||
    evidence.alignmentRms >
      qp.rules.maxAlignmentRms
  ) {
    reasons.push(
      'ALIGNMENT_RMS_ABOVE_MAX',
    );
  }

  const embeddingValidation =
    validateEmbedding128(
      evidence.embedding,
      {
        l2Tolerance:
          qp.rules.embeddingL2Tolerance,
      },
    );

  if (
    !embeddingValidation.valid
  ) {
    reasons.push(
      embeddingValidation.reason,
    );
  }

  try {
    assertProfileCompatible(
      evidence.profile,
      expectedProfile,
    );
  }
  catch {
    reasons.push(
      'PROFILE_INCOMPATIBLE',
    );
  }

  if (
    typeof evidence.sourceRef !==
      'string' ||
    evidence.sourceRef.trim() === ''
  ) {
    reasons.push(
      'SOURCE_NOT_AUDITABLE',
    );
  }

  return Object.freeze({
    approved:
      reasons.length === 0,

    reasons:
      Object.freeze(reasons),

    qualityProfileId:
      qp.qualityProfileId,

    qualityProfileVersion:
      qp.version,
  });
}

export function createBiometricReference({
  referenceId,
  collaboratorId,
  profile,
  qualityProfileId,
  sourceRef,
  status =
    BIOMETRIC_REFERENCE_STATUS.SOURCE_CAPTURED,
  embedding = null,
  audit = null,
}) {
  const normalizedStatus =
    requireNonEmptyString(
      status,
      'reference.status',
    );

  if (
    !(
      normalizedStatus in
      BIOMETRIC_REFERENCE_STATUS
    )
  ) {
    throw new Error(
      `reference.status invalido: ${normalizedStatus}`,
    );
  }

  let normalizedEmbedding = null;

  if (
    embedding !== null
  ) {
    const validation =
      validateEmbedding128(
        embedding,
      );

    if (
      !validation.valid
    ) {
      throw new Error(
        `embedding invalido: ${validation.reason}`,
      );
    }

    normalizedEmbedding =
      new Float32Array(
        embedding,
      );
  }

  if (
    [
      BIOMETRIC_REFERENCE_STATUS.EMBEDDING_READY,
      BIOMETRIC_REFERENCE_STATUS.ACTIVE,
    ].
    includes(
      normalizedStatus,
    ) &&
    normalizedEmbedding === null
  ) {
    throw new Error(
      `${normalizedStatus} exige embedding 128-D valido.`,
    );
  }

  return Object.freeze({
    referenceId:
      requireNonEmptyString(
        referenceId,
        'referenceId',
      ),

    collaboratorId:
      requireNonEmptyString(
        collaboratorId,
        'colaborador.id',
      ),

    profile:
      cloneProfile(profile),

    qualityProfileId:
      requireNonEmptyString(
        qualityProfileId,
        'qualityProfileId',
      ),

    sourceRef:
      requireNonEmptyString(
        sourceRef,
        'sourceRef',
      ),

    status:
      normalizedStatus,

    embedding:
      normalizedEmbedding,

    audit:
      audit &&
      typeof audit === 'object'
        ? Object.freeze({
            ...audit,
          })
        : null,
  });
}

export function transitionBiometricReference(
  reference,
  nextStatus,
  audit = null,
) {
  const current =
    createBiometricReference(
      reference,
    );

  const next =
    requireNonEmptyString(
      nextStatus,
      'nextStatus',
    );

  if (
    !(
      next in
      BIOMETRIC_REFERENCE_STATUS
    )
  ) {
    throw new Error(
      `nextStatus invalido: ${next}`,
    );
  }

  if (
    !REFERENCE_TRANSITIONS[
      current.status
    ].
    has(next)
  ) {
    throw new Error(
      `Transicao biometrica invalida: ${current.status} -> ${next}.`,
    );
  }

  if (
    next ===
      BIOMETRIC_REFERENCE_STATUS.ACTIVE &&
    current.embedding === null
  ) {
    throw new Error(
      'ACTIVE exige embedding 128-D valido.',
    );
  }

  return createBiometricReference({
    ...current,

    status:
      next,

    audit:
      audit &&
      typeof audit === 'object'
        ? {
            ...current.audit,
            ...audit,
          }
        : current.audit,
  });
}

function normalizedActiveReferences(
  references,
  collaboratorId,
  profile,
) {
  if (
    !Array.isArray(references)
  ) {
    throw new TypeError(
      'references deve ser array.',
    );
  }

  const active =
    references
      .map(
        (reference) =>
          createBiometricReference(
            reference,
          ),
      )
      .filter(
        (reference) =>
          reference.status ===
          BIOMETRIC_REFERENCE_STATUS.ACTIVE,
      )
      .sort(
        (a, b) =>
          a.referenceId.localeCompare(
            b.referenceId,
          ),
      );

  const seen =
    new Set();

  for (
    const reference of active
  ) {
    if (
      reference.collaboratorId !==
      collaboratorId
    ) {
      throw new Error(
        'Nao e permitido misturar referencias de colaboradores diferentes.',
      );
    }

    assertProfileCompatible(
      reference.profile,
      profile,
    );

    if (
      seen.has(
        reference.referenceId,
      )
    ) {
      throw new Error(
        `referenceId duplicado: ${reference.referenceId}`,
      );
    }

    seen.add(
      reference.referenceId,
    );
  }

  if (
    active.length >
    MAX_ACTIVE_REFERENCES
  ) {
    throw new Error(
      `Maximo de ${MAX_ACTIVE_REFERENCES} referencias ACTIVE por colaborador/profile excedido.`,
    );
  }

  return active;
}

export function classifyReferenceSet({
  collaboratorId,
  profile,
  references,
}) {
  const id =
    requireNonEmptyString(
      collaboratorId,
      'colaborador.id',
    );

  const normalizedProfile =
    cloneProfile(profile);

  const active =
    normalizedActiveReferences(
      references,
      id,
      normalizedProfile,
    );

  if (
    active.length === 0
  ) {
    return (
      BIOMETRIC_REFERENCE_SET_STATUS.BUILDING
    );
  }

  if (
    active.length <
    MIN_ACTIVE_REFERENCES
  ) {
    return (
      BIOMETRIC_REFERENCE_SET_STATUS.INSUFFICIENT
    );
  }

  return (
    BIOMETRIC_REFERENCE_SET_STATUS.READY
  );
}

export function createBiometricReferenceSet({
  referenceSetId,
  collaboratorId,
  profile,
  qualityProfileId,
  references = [],
  status,
  centroid = null,
}) {
  const id =
    requireNonEmptyString(
      collaboratorId,
      'colaborador.id',
    );

  const normalizedProfile =
    cloneProfile(profile);

  const derived =
    classifyReferenceSet({
      collaboratorId: id,
      profile: normalizedProfile,
      references,
    });

  const normalizedStatus =
    status ?? derived;

  if (
    !(
      normalizedStatus in
      BIOMETRIC_REFERENCE_SET_STATUS
    )
  ) {
    throw new Error(
      `referenceSet.status invalido: ${normalizedStatus}`,
    );
  }

  if (
    [
      BIOMETRIC_REFERENCE_SET_STATUS.BUILDING,
      BIOMETRIC_REFERENCE_SET_STATUS.INSUFFICIENT,
      BIOMETRIC_REFERENCE_SET_STATUS.READY,
    ].
    includes(
      normalizedStatus,
    ) &&
    normalizedStatus !==
      derived
  ) {
    throw new Error(
      `referenceSet.status ${normalizedStatus} diverge do estado derivado ${derived}.`,
    );
  }

  if (
    normalizedStatus ===
      BIOMETRIC_REFERENCE_SET_STATUS.ACTIVE &&
    derived !==
      BIOMETRIC_REFERENCE_SET_STATUS.READY
  ) {
    throw new Error(
      'ReferenceSet ACTIVE exige quantidade suficiente de referencias ACTIVE.',
    );
  }

  if (
    normalizedStatus ===
      BIOMETRIC_REFERENCE_SET_STATUS.ACTIVE &&
    !centroid
  ) {
    throw new Error(
      'ReferenceSet ACTIVE exige centroid valido.',
    );
  }

  return Object.freeze({
    referenceSetId:
      requireNonEmptyString(
        referenceSetId,
        'referenceSetId',
      ),

    collaboratorId:
      id,

    profile:
      normalizedProfile,

    qualityProfileId:
      requireNonEmptyString(
        qualityProfileId,
        'qualityProfileId',
      ),

    status:
      normalizedStatus,

    referenceIds:
      Object.freeze(
        references
          .map(
            (reference) =>
              requireNonEmptyString(
                reference.referenceId,
                'reference.referenceId',
              ),
          )
          .sort(
            (a, b) =>
              a.localeCompare(b),
          ),
      ),

    centroid,
  });
}

function l2Normalize(
  vector,
) {
  let sumSquares = 0;

  for (
    const value of vector
  ) {
    sumSquares +=
      value * value;
  }

  const norm =
    Math.sqrt(
      sumSquares,
    );

  if (
    !Number.isFinite(norm) ||
    norm === 0
  ) {
    throw new Error(
      'Centroid nao pode ser normalizado.',
    );
  }

  const normalized =
    new Float32Array(
      vector.length,
    );

  for (
    let i = 0;
    i < vector.length;
    i += 1
  ) {
    normalized[i] =
      vector[i] / norm;
  }

  return normalized;
}

export function rebuildBiometricCentroid({
  centroidId,
  referenceSetId,
  collaboratorId,
  profile,
  references,
  version,
}) {
  const id =
    requireNonEmptyString(
      collaboratorId,
      'colaborador.id',
    );

  const normalizedProfile =
    cloneProfile(profile);

  const active =
    normalizedActiveReferences(
      references,
      id,
      normalizedProfile,
    );

  if (
    active.length <
    MIN_ACTIVE_REFERENCES
  ) {
    throw new Error(
      `Centroid exige ao menos ${MIN_ACTIVE_REFERENCES} referencias ACTIVE compativeis.`,
    );
  }

  const mean =
    new Float64Array(
      EMBEDDING_DIM,
    );

  for (
    const reference of active
  ) {
    const validation =
      validateEmbedding128(
        reference.embedding,
      );

    if (
      !validation.valid
    ) {
      throw new Error(
        `Referencia ${reference.referenceId} possui ${validation.reason}.`,
      );
    }

    for (
      let i = 0;
      i < EMBEDDING_DIM;
      i += 1
    ) {
      mean[i] +=
        reference.embedding[i];
    }
  }

  for (
    let i = 0;
    i < EMBEDDING_DIM;
    i += 1
  ) {
    mean[i] /=
      active.length;
  }

  return Object.freeze({
    centroidId:
      requireNonEmptyString(
        centroidId,
        'centroidId',
      ),

    referenceSetId:
      requireNonEmptyString(
        referenceSetId,
        'referenceSetId',
      ),

    collaboratorId:
      id,

    profile:
      normalizedProfile,

    version:
      requireNonEmptyString(
        version,
        'centroid.version',
      ),

    contributingReferenceIds:
      Object.freeze(
        active.map(
          (reference) =>
            reference.referenceId,
        ),
      ),

    embedding:
      l2Normalize(mean),
  });
}

export function activateBiometricReferenceSet(
  referenceSet,
  references,
  centroid,
) {
  const current =
    createBiometricReferenceSet({
      ...referenceSet,
      references,
      centroid:
        referenceSet.centroid,
    });

  if (
    current.status !==
    BIOMETRIC_REFERENCE_SET_STATUS.READY
  ) {
    throw new Error(
      'Somente referenceSet READY pode ser ativado.',
    );
  }

  if (
    !centroid ||
    typeof centroid !== 'object'
  ) {
    throw new TypeError(
      'centroid e obrigatorio.',
    );
  }

  if (
    centroid.referenceSetId !==
      current.referenceSetId ||
    centroid.collaboratorId !==
      current.collaboratorId
  ) {
    throw new Error(
      'Centroid nao pertence ao referenceSet/colaborador informado.',
    );
  }

  assertProfileCompatible(
    centroid.profile,
    current.profile,
  );

  const activeIds =
    normalizedActiveReferences(
      references,
      current.collaboratorId,
      current.profile,
    ).
    map(
      (reference) =>
        reference.referenceId,
    );

  const centroidIds =
    Array.isArray(
      centroid.contributingReferenceIds,
    )
      ? [
          ...centroid.contributingReferenceIds,
        ]
      : [];

  if (
    activeIds.length !==
      centroidIds.length ||
    activeIds.some(
      (id, index) =>
        id !==
        centroidIds[index],
    )
  ) {
    throw new Error(
      'Centroid deve representar exatamente as referencias ACTIVE atuais.',
    );
  }

  return Object.freeze({
    ...current,
    status:
      BIOMETRIC_REFERENCE_SET_STATUS.ACTIVE,
    centroid,
  });
}

export function retireBiometricReferenceSet(
  referenceSet,
  nextStatus,
) {
  if (
    ![
      BIOMETRIC_REFERENCE_SET_STATUS.SUPERSEDED,
      BIOMETRIC_REFERENCE_SET_STATUS.REVOKED,
    ].
    includes(nextStatus)
  ) {
    throw new Error(
      'ReferenceSet ativo somente pode ser SUPERSEDED ou REVOKED nesta operacao.',
    );
  }

  if (
    !referenceSet ||
    referenceSet.status !==
      BIOMETRIC_REFERENCE_SET_STATUS.ACTIVE
  ) {
    throw new Error(
      'Somente referenceSet ACTIVE pode ser retirado de operacao.',
    );
  }

  return Object.freeze({
    ...referenceSet,
    status:
      nextStatus,
  });
}