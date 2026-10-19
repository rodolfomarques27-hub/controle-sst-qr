import {
    MAX_ACTIVE_REFERENCES,
    MIN_ACTIVE_REFERENCES,
    validateEmbedding128,
} from "./biometricReferenceLifecycle.mjs";

import {
    IDENTIFICATION_SEARCH_KIND,
    SAMPLE_ROLE,
} from "./biometricCalibrationCollectionProtocol.mjs";

import {
    cosineSimilarity128,
    normalizeEmbeddingL2,
} from "../recognition/sfaceEmbedding.mjs";

export const CALIBRATION_REFERENCE_AGGREGATION =
    Object.freeze({
        PARTICIPANT_ENROLLMENT_CENTROID:
            "PARTICIPANT_ENROLLMENT_CENTROID",
    });

export const CALIBRATION_EMBEDDING_RETENTION =
    Object.freeze({
        MEMORY_ONLY:
            "MEMORY_ONLY",
    });

export const CALIBRATION_PERSISTED_ARTIFACTS =
    Object.freeze({
        EXECUTION_MANIFEST_AND_R7C_DATASET:
            "EXECUTION_MANIFEST_AND_R7C_DATASET",
    });

export const CALIBRATION_SCORE_FUNCTION =
    Object.freeze({
        COSINE_SIMILARITY:
            "COSINE_SIMILARITY",
    });

const EMBEDDING_L2_TOLERANCE =
    1e-5;

const OPAQUE_ID_PATTERN =
    /^[A-Za-z0-9._:|%+-]{1,256}$/;

const PROTOCOL_KEYS =
    new Set([
        "profileId",
        "verificationReferenceAggregation",
        "identificationReferenceAggregation",
        "minimumEnrollmentReferencesPerParticipant",
        "maximumEnrollmentReferencesPerParticipant",
        "embeddingRetention",
        "persistedArtifacts",
    ]);

const SAMPLE_KEYS =
    new Set([
        "sampleId",
        "participantId",
        "profileId",
        "role",
        "embedding",
    ]);

const VERIFICATION_REQUEST_KEYS =
    new Set([
        "protocol",
        "samples",
        "enrollmentSampleId",
        "probeSampleId",
    ]);

const IDENTIFICATION_REQUEST_KEYS =
    new Set([
        "protocol",
        "samples",
        "probeSampleId",
        "galleryParticipantIds",
        "kind",
        "mateParticipantId",
    ]);

const FORBIDDEN_THRESHOLD_KEYS =
    new Set([
        "candidateThreshold",
        "matchThreshold",
        "ambiguityMargin",
        "recommendedThreshold",
    ]);

function assertPlainObject(
    value,
    name,
) {
    if (
        !value ||
        typeof value !== "object" ||
        Array.isArray(
            value,
        )
    ) {
        throw new TypeError(
            `${name} deve ser objeto.`,
        );
    }

    return value;
}

function assertExactKeys(
    value,
    allowed,
    name,
) {
    for (
        const key of
        Object.keys(
            value,
        )
    ) {
        if (
            FORBIDDEN_THRESHOLD_KEYS.has(
                key,
            )
        ) {
            throw new TypeError(
                `${name}.${key} nao e permitido no protocolo CALIBRATION.`,
            );
        }

        if (
            !allowed.has(
                key,
            )
        ) {
            throw new TypeError(
                `${name}.${key} nao e permitido.`,
            );
        }
    }
}

function normalizeOpaqueId(
    value,
    name,
) {
    if (
        typeof value !==
        "string"
    ) {
        throw new TypeError(
            `${name} deve ser identificador opaco.`,
        );
    }

    const normalized =
        value.trim();

    if (
        !OPAQUE_ID_PATTERN.test(
            normalized,
        )
    ) {
        throw new TypeError(
            `${name} deve ser identificador opaco valido.`,
        );
    }

    return normalized;
}

function requireInteger(
    value,
    name,
) {
    if (
        !Number.isInteger(
            value,
        )
    ) {
        throw new TypeError(
            `${name} deve ser inteiro.`,
        );
    }

    return value;
}

export function createBiometricCalibrationScoringProtocol(
    input,
) {
    const source =
        assertPlainObject(
            input,
            "protocol",
        );

    assertExactKeys(
        source,
        PROTOCOL_KEYS,
        "protocol",
    );

    const profileId =
        normalizeOpaqueId(
            source.profileId,
            "protocol.profileId",
        );

    if (
        source.verificationReferenceAggregation !==
        CALIBRATION_REFERENCE_AGGREGATION
            .PARTICIPANT_ENROLLMENT_CENTROID
    ) {
        throw new TypeError(
            "verificationReferenceAggregation deve ser PARTICIPANT_ENROLLMENT_CENTROID.",
        );
    }

    if (
        source.identificationReferenceAggregation !==
        CALIBRATION_REFERENCE_AGGREGATION
            .PARTICIPANT_ENROLLMENT_CENTROID
    ) {
        throw new TypeError(
            "identificationReferenceAggregation deve ser PARTICIPANT_ENROLLMENT_CENTROID.",
        );
    }

    const minimum =
        requireInteger(
            source.minimumEnrollmentReferencesPerParticipant,
            "protocol.minimumEnrollmentReferencesPerParticipant",
        );

    if (
        minimum !==
        MIN_ACTIVE_REFERENCES
    ) {
        throw new RangeError(
            `minimumEnrollmentReferencesPerParticipant deve ser exatamente ${MIN_ACTIVE_REFERENCES}.`,
        );
    }

    const maximum =
        requireInteger(
            source.maximumEnrollmentReferencesPerParticipant,
            "protocol.maximumEnrollmentReferencesPerParticipant",
        );

    if (
        maximum <
            minimum ||
        maximum >
            MAX_ACTIVE_REFERENCES
    ) {
        throw new RangeError(
            (
                "maximumEnrollmentReferencesPerParticipant deve estar " +
                `entre ${minimum} e ${MAX_ACTIVE_REFERENCES}.`
            ),
        );
    }

    if (
        source.embeddingRetention !==
        CALIBRATION_EMBEDDING_RETENTION
            .MEMORY_ONLY
    ) {
        throw new TypeError(
            "embeddingRetention deve ser MEMORY_ONLY.",
        );
    }

    if (
        source.persistedArtifacts !==
        CALIBRATION_PERSISTED_ARTIFACTS
            .EXECUTION_MANIFEST_AND_R7C_DATASET
    ) {
        throw new TypeError(
            (
                "persistedArtifacts deve ser " +
                "EXECUTION_MANIFEST_AND_R7C_DATASET."
            ),
        );
    }

    return Object.freeze({
        profileId,

        verificationReferenceAggregation:
            CALIBRATION_REFERENCE_AGGREGATION
                .PARTICIPANT_ENROLLMENT_CENTROID,

        identificationReferenceAggregation:
            CALIBRATION_REFERENCE_AGGREGATION
                .PARTICIPANT_ENROLLMENT_CENTROID,

        minimumEnrollmentReferencesPerParticipant:
            minimum,

        maximumEnrollmentReferencesPerParticipant:
            maximum,

        embeddingRetention:
            CALIBRATION_EMBEDDING_RETENTION
                .MEMORY_ONLY,

        persistedArtifacts:
            CALIBRATION_PERSISTED_ARTIFACTS
                .EXECUTION_MANIFEST_AND_R7C_DATASET,
    });
}

function normalizeSample({
    sample,
    index,
    profileId,
}) {
    const name =
        `samples[${index}]`;

    const source =
        assertPlainObject(
            sample,
            name,
        );

    assertExactKeys(
        source,
        SAMPLE_KEYS,
        name,
    );

    const sampleId =
        normalizeOpaqueId(
            source.sampleId,
            `${name}.sampleId`,
        );

    const participantId =
        normalizeOpaqueId(
            source.participantId,
            `${name}.participantId`,
        );

    const sampleProfileId =
        normalizeOpaqueId(
            source.profileId,
            `${name}.profileId`,
        );

    if (
        sampleProfileId !==
        profileId
    ) {
        throw new TypeError(
            `${name}.profileId diverge do profileId do protocolo.`,
        );
    }

    if (
        !Object.values(
            SAMPLE_ROLE,
        ).includes(
            source.role,
        )
    ) {
        throw new TypeError(
            `${name}.role invalido.`,
        );
    }

    const validation =
        validateEmbedding128(
            source.embedding,
            {
                l2Tolerance:
                    EMBEDDING_L2_TOLERANCE,
            },
        );

    if (
        !validation.valid
    ) {
        throw new RangeError(
            `${name}.embedding invalido: ${validation.reason}.`,
        );
    }

    return Object.freeze({
        sampleId,
        participantId,
        profileId:
            sampleProfileId,
        role:
            source.role,

        embedding:
            new Float32Array(
                source.embedding,
            ),
    });
}

function normalizeSamples({
    samples,
    profileId,
}) {
    if (
        !Array.isArray(
            samples,
        ) ||
        samples.length ===
            0
    ) {
        throw new TypeError(
            "samples deve ser array nao vazio.",
        );
    }

    const normalized =
        samples.map(
            (
                sample,
                index,
            ) =>
                normalizeSample({
                    sample,
                    index,
                    profileId,
                }),
        );

    const byId =
        new Map();

    for (
        const sample of
        normalized
    ) {
        if (
            byId.has(
                sample.sampleId,
            )
        ) {
            throw new TypeError(
                `sampleId duplicado: ${sample.sampleId}`,
            );
        }

        byId.set(
            sample.sampleId,
            sample,
        );
    }

    return Object.freeze({
        samples:
            Object.freeze(
                normalized,
            ),

        byId,
    });
}

function requireSample({
    sampleState,
    sampleId,
    role,
    name,
}) {
    const normalizedId =
        normalizeOpaqueId(
            sampleId,
            name,
        );

    const sample =
        sampleState.byId.get(
            normalizedId,
        );

    if (!sample) {
        throw new TypeError(
            `${name} nao existe em samples.`,
        );
    }

    if (
        sample.role !==
        role
    ) {
        throw new TypeError(
            `${name} deve referenciar sample ${role}.`,
        );
    }

    return sample;
}

function collectEnrollmentSamples({
    sampleState,
    participantId,
    protocol,
}) {
    const enrollments =
        sampleState.samples.filter(
            (
                sample,
            ) =>
                sample.participantId ===
                    participantId &&
                sample.role ===
                    SAMPLE_ROLE.ENROLLMENT,
        );

    if (
        enrollments.length <
        protocol.minimumEnrollmentReferencesPerParticipant
    ) {
        throw new RangeError(
            (
                `participant possui ${enrollments.length} ENROLLMENT; ` +
                `minimo=${protocol.minimumEnrollmentReferencesPerParticipant}.`
            ),
        );
    }

    if (
        enrollments.length >
        protocol.maximumEnrollmentReferencesPerParticipant
    ) {
        throw new RangeError(
            (
                `participant possui ${enrollments.length} ENROLLMENT; ` +
                `maximo=${protocol.maximumEnrollmentReferencesPerParticipant}.`
            ),
        );
    }

    return enrollments;
}

function buildEnrollmentCentroid(
    enrollments,
) {
    const accumulator =
        new Float32Array(
            128,
        );

    for (
        const sample of
        enrollments
    ) {
        for (
            let index = 0;
            index <
            accumulator.length;
            index += 1
        ) {
            accumulator[index] +=
                sample.embedding[
                    index
                ];
        }
    }

    for (
        let index = 0;
        index <
        accumulator.length;
        index += 1
    ) {
        accumulator[index] /=
            enrollments.length;
    }

    return normalizeEmbeddingL2(
        accumulator,
    );
}

export function scoreBiometricCalibrationVerification(
    input,
) {
    const source =
        assertPlainObject(
            input,
            "verification",
        );

    assertExactKeys(
        source,
        VERIFICATION_REQUEST_KEYS,
        "verification",
    );

    const protocol =
        createBiometricCalibrationScoringProtocol(
            source.protocol,
        );

    const sampleState =
        normalizeSamples({
            samples:
                source.samples,
            profileId:
                protocol.profileId,
        });

    const enrollmentAnchor =
        requireSample({
            sampleState,
            sampleId:
                source.enrollmentSampleId,
            role:
                SAMPLE_ROLE.ENROLLMENT,
            name:
                "verification.enrollmentSampleId",
        });

    const probe =
        requireSample({
            sampleState,
            sampleId:
                source.probeSampleId,
            role:
                SAMPLE_ROLE.PROBE,
            name:
                "verification.probeSampleId",
        });

    const enrollments =
        collectEnrollmentSamples({
            sampleState,
            participantId:
                enrollmentAnchor.participantId,
            protocol,
        });

    const centroid =
        buildEnrollmentCentroid(
            enrollments,
        );

    const score =
        cosineSimilarity128(
            probe.embedding,
            centroid,
        );

    return Object.freeze({
        score,
    });
}

function normalizeGalleryParticipantIds(
    values,
) {
    if (
        !Array.isArray(
            values,
        ) ||
        values.length <
            2
    ) {
        throw new TypeError(
            "galleryParticipantIds deve possuir ao menos dois participantes.",
        );
    }

    const normalized =
        values.map(
            (
                value,
                index,
            ) =>
                normalizeOpaqueId(
                    value,
                    `galleryParticipantIds[${index}]`,
                ),
        );

    if (
        new Set(
            normalized,
        ).size !==
        normalized.length
    ) {
        throw new TypeError(
            "galleryParticipantIds nao pode conter duplicados.",
        );
    }

    return Object.freeze(
        normalized,
    );
}

export function scoreBiometricCalibrationIdentification(
    input,
) {
    const source =
        assertPlainObject(
            input,
            "identification",
        );

    assertExactKeys(
        source,
        IDENTIFICATION_REQUEST_KEYS,
        "identification",
    );

    const protocol =
        createBiometricCalibrationScoringProtocol(
            source.protocol,
        );

    const sampleState =
        normalizeSamples({
            samples:
                source.samples,
            profileId:
                protocol.profileId,
        });

    const probe =
        requireSample({
            sampleState,
            sampleId:
                source.probeSampleId,
            role:
                SAMPLE_ROLE.PROBE,
            name:
                "identification.probeSampleId",
        });

    if (
        !Object.values(
            IDENTIFICATION_SEARCH_KIND,
        ).includes(
            source.kind,
        )
    ) {
        throw new TypeError(
            "identification.kind invalido.",
        );
    }

    const galleryParticipantIds =
        normalizeGalleryParticipantIds(
            source.galleryParticipantIds,
        );

    let mateParticipantId =
        null;

    if (
        source.kind ===
        IDENTIFICATION_SEARCH_KIND.MATED
    ) {
        if (
            !Object.hasOwn(
                source,
                "mateParticipantId",
            )
        ) {
            throw new TypeError(
                "mateParticipantId e obrigatorio para MATED.",
            );
        }

        mateParticipantId =
            normalizeOpaqueId(
                source.mateParticipantId,
                "identification.mateParticipantId",
            );

        if (
            !galleryParticipantIds.includes(
                mateParticipantId,
            )
        ) {
            throw new TypeError(
                "mateParticipantId deve pertencer a galleryParticipantIds.",
            );
        }
    }
    else if (
        Object.hasOwn(
            source,
            "mateParticipantId",
        ) &&
        source.mateParticipantId !==
            undefined
    ) {
        throw new TypeError(
            "mateParticipantId nao e permitido para NON_MATED.",
        );
    }

    const ranking =
        galleryParticipantIds
            .map(
                (
                    participantId,
                ) => {
                    const enrollments =
                        collectEnrollmentSamples({
                            sampleState,
                            participantId,
                            protocol,
                        });

                    const centroid =
                        buildEnrollmentCentroid(
                            enrollments,
                        );

                    const score =
                        cosineSimilarity128(
                            probe.embedding,
                            centroid,
                        );

                    return {
                        participantId,
                        score,
                    };
                },
            )
            .sort(
                (
                    left,
                    right,
                ) => {
                    if (
                        right.score !==
                        left.score
                    ) {
                        return (
                            right.score -
                            left.score
                        );
                    }

                    return left.participantId.localeCompare(
                        right.participantId,
                    );
                },
            );

    const top1 =
        ranking[0];

    const top2 =
        ranking[1];

    const result =
        {
            top1Score:
                top1.score,

            top2Score:
                top2.score,

            margin:
                top1.score -
                top2.score,

            candidateCount:
                ranking.length,
        };

    if (
        source.kind ===
        IDENTIFICATION_SEARCH_KIND.MATED
    ) {
        result.top1IsMate =
            top1.participantId ===
            mateParticipantId;
    }

    return Object.freeze(
        result,
    );
}
