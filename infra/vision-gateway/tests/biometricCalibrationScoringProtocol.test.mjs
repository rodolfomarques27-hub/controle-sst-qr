import test from "node:test";
import assert from "node:assert/strict";

import {
    MAX_ACTIVE_REFERENCES,
    MIN_ACTIVE_REFERENCES,
} from "../src/identity/biometricReferenceLifecycle.mjs";

import {
    CALIBRATION_EMBEDDING_RETENTION,
    CALIBRATION_PERSISTED_ARTIFACTS,
    CALIBRATION_REFERENCE_AGGREGATION,
    createBiometricCalibrationScoringProtocol,
    scoreBiometricCalibrationIdentification,
    scoreBiometricCalibrationVerification,
} from "../src/identity/biometricCalibrationScoringProtocol.mjs";

const PROFILE_ID =
    "sface-profile-calibration-v1";

function unitEmbedding(
    index,
) {
    const embedding =
        new Float32Array(
            128,
        );

    embedding[index] =
        1;

    return embedding;
}

function blendedEmbedding(
    first,
    second,
) {
    const embedding =
        new Float32Array(
            128,
        );

    embedding[0] =
        first;

    embedding[1] =
        second;

    return embedding;
}

function protocol({
    maximum =
        MAX_ACTIVE_REFERENCES,
} = {}) {
    return {
        profileId:
            PROFILE_ID,

        verificationReferenceAggregation:
            CALIBRATION_REFERENCE_AGGREGATION
                .PARTICIPANT_ENROLLMENT_CENTROID,

        identificationReferenceAggregation:
            CALIBRATION_REFERENCE_AGGREGATION
                .PARTICIPANT_ENROLLMENT_CENTROID,

        minimumEnrollmentReferencesPerParticipant:
            MIN_ACTIVE_REFERENCES,

        maximumEnrollmentReferencesPerParticipant:
            maximum,

        embeddingRetention:
            CALIBRATION_EMBEDDING_RETENTION
                .MEMORY_ONLY,

        persistedArtifacts:
            CALIBRATION_PERSISTED_ARTIFACTS
                .EXECUTION_MANIFEST_AND_R7C_DATASET,
    };
}

function enrollment(
    participantId,
    suffix,
    embedding,
) {
    return {
        sampleId:
            `${participantId}-enroll-${suffix}`,

        participantId,

        profileId:
            PROFILE_ID,

        role:
            "ENROLLMENT",

        embedding,
    };
}

function probe(
    participantId,
    suffix,
    embedding,
) {
    return {
        sampleId:
            `${participantId}-probe-${suffix}`,

        participantId,

        profileId:
            PROFILE_ID,

        role:
            "PROBE",

        embedding,
    };
}

function threeEnrollments(
    participantId,
    embedding,
) {
    return [
        enrollment(
            participantId,
            "01",
            embedding,
        ),
        enrollment(
            participantId,
            "02",
            embedding,
        ),
        enrollment(
            participantId,
            "03",
            embedding,
        ),
    ];
}

function standardSamples({
    includeParticipantB = false,
    probeParticipantId = "participant-a",
    probeEmbeddingIndex = 0,
    participantAEnrollmentCount = 3,
} = {}) {
    const samples =
        threeEnrollments(
            "participant-a",
            unitEmbedding(0),
        ).slice(
            0,
            participantAEnrollmentCount,
        );

    if (includeParticipantB) {
        samples.push(
            ...threeEnrollments(
                "participant-b",
                unitEmbedding(1),
            ),
        );
    }

    samples.push(
        probe(
            probeParticipantId,
            "01",
            unitEmbedding(
                probeEmbeddingIndex,
            ),
        ),
    );

    return samples;
}

function identificationRequestBase(samples) {
    return {
        protocol: protocol(),
        samples,
        probeSampleId: "participant-x-probe-01",
    };
}

function identificationRequestDefaults(
    samples,
    kind = "NON_MATED",
) {
    return {
        ...identificationRequestBase(samples),
        galleryParticipantIds: [
            "participant-a",
            "participant-b",
        ],
        kind,
    };
}

function verificationRequestBase(samples) {
    return {
        protocol: protocol(),
        samples,
        enrollmentSampleId: "participant-a-enroll-01",
        probeSampleId: "participant-a-probe-01",
    };
}

function assertProtocolRejects(
    value,
    expected,
) {
    assert.throws(
        () =>
            createBiometricCalibrationScoringProtocol(
                value,
            ),
        expected,
    );
}
test(
    "protocolo valido congela a semantica autorizada",
    () => {
        const result =
            createBiometricCalibrationScoringProtocol(
                protocol(),
            );

        assert.equal(
            result.profileId,
            PROFILE_ID,
        );

        assert.equal(
            result.verificationReferenceAggregation,
            "PARTICIPANT_ENROLLMENT_CENTROID",
        );

        assert.equal(
            result.identificationReferenceAggregation,
            "PARTICIPANT_ENROLLMENT_CENTROID",
        );

        assert.equal(
            result.minimumEnrollmentReferencesPerParticipant,
            MIN_ACTIVE_REFERENCES,
        );

        assert.equal(
            result.maximumEnrollmentReferencesPerParticipant,
            MAX_ACTIVE_REFERENCES,
        );

        assert.equal(
            result.embeddingRetention,
            "MEMORY_ONLY",
        );

        assert.equal(
            result.persistedArtifacts,
            "EXECUTION_MANIFEST_AND_R7C_DATASET",
        );
    },
);

test(
    "profileId e explicito e obrigatorio",
    () => {
        const value =
            protocol();

        delete value.profileId;

        assertProtocolRejects(
            value,
            /profileId/,
        );
    },
);

test(
    "verification aggregation aceita somente PARTICIPANT_ENROLLMENT_CENTROID",
    () => {
        const value =
            protocol();

        value.verificationReferenceAggregation =
            "SINGLE_REFERENCE";

        assertProtocolRejects(
            value,
            /PARTICIPANT_ENROLLMENT_CENTROID/,
        );
    },
);

test(
    "identification aggregation aceita somente PARTICIPANT_ENROLLMENT_CENTROID",
    () => {
        const value =
            protocol();

        value.identificationReferenceAggregation =
            "SINGLE_REFERENCE";

        assertProtocolRejects(
            value,
            /PARTICIPANT_ENROLLMENT_CENTROID/,
        );
    },
);

test(
    "minimumEnrollmentReferencesPerParticipant coincide com lifecycle",
    () => {
        const value =
            protocol();

        value.minimumEnrollmentReferencesPerParticipant =
            MIN_ACTIVE_REFERENCES -
            1;

        assertProtocolRejects(
            value,
            /exatamente/,
        );
    },
);

test(
    "maximumEnrollmentReferencesPerParticipant nao supera lifecycle",
    () => {
        const value =
            protocol();

        value.maximumEnrollmentReferencesPerParticipant =
            MAX_ACTIVE_REFERENCES +
            1;

        assertProtocolRejects(
            value,
            /maximumEnrollmentReferencesPerParticipant/,
        );
    },
);

test(
    "maximumEnrollmentReferencesPerParticipant nao pode ser menor que o minimo",
    () => {
        const value =
            protocol();

        value.maximumEnrollmentReferencesPerParticipant =
            MIN_ACTIVE_REFERENCES -
            1;

        assertProtocolRejects(
            value,
            /maximumEnrollmentReferencesPerParticipant/,
        );
    },
);

test(
    "embeddingRetention aceita somente MEMORY_ONLY",
    () => {
        const value =
            protocol();

        value.embeddingRetention =
            "PERSIST";

        assertProtocolRejects(
            value,
            /MEMORY_ONLY/,
        );
    },
);

test(
    "persistedArtifacts aceita somente Execution Manifest e R7C",
    () => {
        const value =
            protocol();

        value.persistedArtifacts =
            "EMBEDDINGS";

        assertProtocolRejects(
            value,
            /EXECUTION_MANIFEST_AND_R7C_DATASET/,
        );
    },
);

test(
    "thresholds nao pertencem ao protocolo CALIBRATION",
    () => {
        for (
            const key of
            [
                "candidateThreshold",
                "matchThreshold",
                "ambiguityMargin",
                "recommendedThreshold",
            ]
        ) {
            const value =
                protocol();

            value[key] =
                0.5;

            assert.throws(
                () =>
                    createBiometricCalibrationScoringProtocol(
                        value,
                    ),
                /nao e permitido/,
                key,
            );
        }
    },
);

test(
    "verification usa centroide de todas as ENROLLMENT do participante alvo",
    () => {
        const samples =
            [
                enrollment(
                    "participant-a",
                    "01",
                    unitEmbedding(
                        0,
                    ),
                ),
                enrollment(
                    "participant-a",
                    "02",
                    unitEmbedding(
                        0,
                    ),
                ),
                enrollment(
                    "participant-a",
                    "03",
                    unitEmbedding(
                        1,
                    ),
                ),
                probe(
                    "participant-a",
                    "01",
                    unitEmbedding(
                        0,
                    ),
                ),
            ];

        const result =
            scoreBiometricCalibrationVerification({
                ...verificationRequestBase(samples),
            });

        const expected =
            2 /
            Math.sqrt(
                5,
            );

        assert.ok(
            Math.abs(
                result.score -
                expected
            ) <
            1e-6,
        );
    },
);

test(
    "enrollmentSampleId identifica o participante alvo da verification",
    () => {
        const samples = standardSamples({ includeParticipantB: true, probeParticipantId: "participant-x", probeEmbeddingIndex: 1 });

        const result =
            scoreBiometricCalibrationVerification({
                protocol:
                    protocol(),

                samples,

                enrollmentSampleId:
                    "participant-b-enroll-01",

                probeSampleId:
                    "participant-x-probe-01",
            });

        assert.ok(
            Math.abs(
                result.score -
                1
            ) <
            1e-7,
        );
    },
);

test(
    "verification rejeita participante com menos ENROLLMENT que o lifecycle",
    () => {
        const samples = standardSamples({ participantAEnrollmentCount: 2 });

        assert.throws(
            () =>
                scoreBiometricCalibrationVerification({
                    ...verificationRequestBase(samples),
                }),
            /minimo/,
        );
    },
);

test(
    "verification rejeita participante acima do maximo configurado",
    () => {
        const samples =
            [
                ...threeEnrollments(
                    "participant-a",
                    unitEmbedding(
                        0,
                    ),
                ),

                enrollment(
                    "participant-a",
                    "04",
                    unitEmbedding(
                        0,
                    ),
                ),

                probe(
                    "participant-a",
                    "01",
                    unitEmbedding(
                        0,
                    ),
                ),
            ];

        assert.throws(
            () =>
                scoreBiometricCalibrationVerification({
                    protocol:
                        protocol({
                            maximum:
                                3,
                        }),

                    samples,

                    enrollmentSampleId:
                        "participant-a-enroll-01",

                    probeSampleId:
                        "participant-a-probe-01",
                }),
            /maximo/,
        );
    },
);

test(
    "verification exige probe com role PROBE",
    () => {
        const samples =
            [
                ...threeEnrollments(
                    "participant-a",
                    unitEmbedding(
                        0,
                    ),
                ),
            ];

        assert.throws(
            () =>
                scoreBiometricCalibrationVerification({
                    protocol:
                        protocol(),

                    samples,

                    enrollmentSampleId:
                        "participant-a-enroll-01",

                    probeSampleId:
                        "participant-a-enroll-02",
                }),
            /PROBE/,
        );
    },
);

test(
    "samples com profileId incompatível sao rejeitadas",
    () => {
        const samples = standardSamples();

        samples[0].profileId =
            "other-profile";

        assert.throws(
            () =>
                scoreBiometricCalibrationVerification({
                    ...verificationRequestBase(samples),
                }),
            /profileId/,
        );
    },
);

test(
    "embedding deve ser Float32Array 128 L2 normalizado",
    () => {
        const samples =
            [
                ...threeEnrollments(
                    "participant-a",
                    unitEmbedding(
                        0,
                    ),
                ),

                probe(
                    "participant-a",
                    "01",
                    new Float32Array(
                        128,
                    ),
                ),
            ];

        assert.throws(
            () =>
                scoreBiometricCalibrationVerification({
                    ...verificationRequestBase(samples),
                }),
            /embedding invalido/,
        );
    },
);

test(
    "frame crop e campos extras nao podem entrar nas samples",
    () => {
        for (
            const key of
            [
                "frame",
                "crop",
                "image",
            ]
        ) {
            const samples =
                [
                    ...threeEnrollments(
                        "participant-a",
                        unitEmbedding(
                            0,
                        ),
                    ),

                    probe(
                        "participant-a",
                        "01",
                        unitEmbedding(
                            0,
                        ),
                    ),
                ];

            samples[0][key] =
                "forbidden";

            assert.throws(
                () =>
                    scoreBiometricCalibrationVerification({
                        protocol:
                            protocol(),

                        samples,

                        enrollmentSampleId:
                            "participant-a-enroll-01",

                        probeSampleId:
                            "participant-a-probe-01",
                    }),
                /nao e permitido/,
                key,
            );
        }
    },
);

test(
    "identification ordena centroides e calcula top1 top2 margin",
    () => {
        const probeEmbedding =
            blendedEmbedding(
                0.8,
                0.6,
            );

        const samples =
            [
                ...threeEnrollments(
                    "participant-a",
                    unitEmbedding(
                        0,
                    ),
                ),

                ...threeEnrollments(
                    "participant-b",
                    unitEmbedding(
                        1,
                    ),
                ),

                probe(
                    "participant-a",
                    "01",
                    probeEmbedding,
                ),
            ];

        const result =
            scoreBiometricCalibrationIdentification({
                protocol:
                    protocol(),

                samples,

                probeSampleId:
                    "participant-a-probe-01",

                galleryParticipantIds:
                    [
                        "participant-a",
                        "participant-b",
                    ],

                kind:
                    "MATED",

                mateParticipantId:
                    "participant-a",
            });

        assert.ok(
            Math.abs(
                result.top1Score -
                0.8
            ) <
            1e-6,
        );

        assert.ok(
            Math.abs(
                result.top2Score -
                0.6
            ) <
            1e-6,
        );

        assert.ok(
            Math.abs(
                result.margin -
                0.2
            ) <
            1e-6,
        );

        assert.equal(
            result.candidateCount,
            2,
        );

        assert.equal(
            result.top1IsMate,
            true,
        );
    },
);

test(
    "MATED deriva top1IsMate do ranking e nao de threshold",
    () => {
        const samples = standardSamples({ includeParticipantB: true, probeParticipantId: "participant-x" });

        const result =
            scoreBiometricCalibrationIdentification({
                ...identificationRequestDefaults(samples, "MATED"),

                mateParticipantId:
                    "participant-b",
            });

        assert.equal(
            result.top1IsMate,
            false,
        );
    },
);

test(
    "NON_MATED nao produz top1IsMate",
    () => {
        const samples = standardSamples({ includeParticipantB: true, probeParticipantId: "participant-x" });

        const result =
            scoreBiometricCalibrationIdentification({
                ...identificationRequestDefaults(samples),
            });

        assert.equal(
            Object.hasOwn(
                result,
                "top1IsMate",
            ),
            false,
        );
    },
);

test(
    "NON_MATED rejeita mateParticipantId",
    () => {
        const samples = standardSamples({ includeParticipantB: true, probeParticipantId: "participant-x" });

        assert.throws(
            () =>
                scoreBiometricCalibrationIdentification({
                    ...identificationRequestDefaults(samples),

                    mateParticipantId:
                        "participant-a",
                }),
            /nao e permitido/,
        );
    },
);

test(
    "MATED exige mateParticipantId dentro da galeria",
    () => {
        const samples = standardSamples({ includeParticipantB: true, probeParticipantId: "participant-x" });

        assert.throws(
            () =>
                scoreBiometricCalibrationIdentification({
                    ...identificationRequestDefaults(samples, "MATED"),

                    mateParticipantId:
                        "participant-c",
                }),
            /galleryParticipantIds/,
        );
    },
);

test(
    "galleryParticipantIds exige pelo menos dois candidatos",
    () => {
        const samples = standardSamples({ probeParticipantId: "participant-x" });

        assert.throws(
            () =>
                scoreBiometricCalibrationIdentification({
                    ...identificationRequestBase(samples),

                    galleryParticipantIds:
                        [
                            "participant-a",
                        ],

                    kind:
                        "NON_MATED",
                }),
            /ao menos dois/,
        );
    },
);

test(
    "galleryParticipantIds nao aceita participante duplicado",
    () => {
        const samples = standardSamples({ probeParticipantId: "participant-x" });

        assert.throws(
            () =>
                scoreBiometricCalibrationIdentification({
                    ...identificationRequestBase(samples),

                    galleryParticipantIds:
                        [
                            "participant-a",
                            "participant-a",
                        ],

                    kind:
                        "NON_MATED",
                }),
            /duplicados/,
        );
    },
);

test(
    "cada candidato da identification exige references ENROLLMENT suficientes",
    () => {
        const samples =
            [
                ...threeEnrollments(
                    "participant-a",
                    unitEmbedding(
                        0,
                    ),
                ),

                enrollment(
                    "participant-b",
                    "01",
                    unitEmbedding(
                        1,
                    ),
                ),

                probe(
                    "participant-x",
                    "01",
                    unitEmbedding(
                        0,
                    ),
                ),
            ];

        assert.throws(
            () =>
                scoreBiometricCalibrationIdentification({
                    ...identificationRequestDefaults(samples),
                }),
            /minimo/,
        );
    },
);

test(
    "threshold nao pode ser injetado em request de verification",
    () => {
        const samples = standardSamples();

        assert.throws(
            () =>
                scoreBiometricCalibrationVerification({
                    ...verificationRequestBase(samples),

                    matchThreshold:
                        0.5,
                }),
            /nao e permitido/,
        );
    },
);

test(
    "threshold nao pode ser injetado em request de identification",
    () => {
        const samples = standardSamples({ includeParticipantB: true, probeParticipantId: "participant-x" });

        assert.throws(
            () =>
                scoreBiometricCalibrationIdentification({
                    ...identificationRequestDefaults(samples),

                    candidateThreshold:
                        0.4,
                }),
            /nao e permitido/,
        );
    },
);

test(
    "outputs de scoring nao expoem embeddings frames crops ou ids de participantes",
    () => {
        const samples = standardSamples({ includeParticipantB: true, probeParticipantId: "participant-x" });

        const result =
            scoreBiometricCalibrationIdentification({
                ...identificationRequestDefaults(samples),
            });

        assert.deepEqual(
            Object.keys(
                result,
            ),
            [
                "top1Score",
                "top2Score",
                "margin",
                "candidateCount",
            ],
        );

        const serialized =
            JSON.stringify(
                result,
            ).toLowerCase();

        for (
            const forbidden of
            [
                "participant-a",
                "participant-b",
                "embedding",
                "frame",
                "crop",
                "candidateThreshold",
                "matchThreshold",
                "ambiguityMargin",
                "decision",
            ]
        ) {
            assert.equal(
                serialized.includes(
                    forbidden.toLowerCase(),
                ),
                false,
                forbidden,
            );
        }
    },
);
