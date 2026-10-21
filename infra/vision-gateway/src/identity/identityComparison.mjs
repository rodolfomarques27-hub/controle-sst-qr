import {
    IDENTITY_STATUS,
} from "./identityContract.mjs";

import {
    normalizeCollaboratorId,
} from "./identityReference.mjs";

import {
    SFACE_EMBEDDING_SIZE,
    cosineSimilarity128,
    normalizeEmbeddingL2,
} from "../recognition/sfaceEmbedding.mjs";

export const IDENTITY_COMPARISON_MODE =
    Object.freeze({
        VERIFICATION:
            "VERIFICATION",
        IDENTIFICATION:
            "IDENTIFICATION",
    });

export const IDENTITY_REFERENCE_STATE =
    Object.freeze({
        ACTIVE:
            "ACTIVE",
        REVOKED:
            "REVOKED",
    });

const VALID_MODES =
    new Set(
        Object.values(
            IDENTITY_COMPARISON_MODE,
        ),
    );

const VALID_REFERENCE_STATES =
    new Set(
        Object.values(
            IDENTITY_REFERENCE_STATE,
        ),
    );

const UNIT_NORM_TOLERANCE =
    1e-5;

function normalizeOpaqueString(
    value,
    name,
) {
    if (
        value === undefined ||
        value === null
    ) {
        throw new TypeError(
            `${name} e obrigatorio.`,
        );
    }

    const normalized =
        String(
            value,
        ).trim();

    if (!normalized) {
        throw new TypeError(
            `${name} deve ser uma string nao vazia.`,
        );
    }

    return normalized;
}

function normalizeSha256(
    value,
) {
    const normalized =
        normalizeOpaqueString(
            value,
            "modelSha256",
        ).toUpperCase();

    if (
        !/^[0-9A-F]{64}$/.test(
            normalized,
        )
    ) {
        throw new TypeError(
            "modelSha256 deve possuir 64 caracteres hexadecimais.",
        );
    }

    return normalized;
}

function createProfileId({
    modelId,
    modelSha256,
    embeddingDim,
    alignmentVersion,
    preprocessVersion,
    normalizationVersion,
}) {
    return [
        modelId,
        modelSha256,
        String(
            embeddingDim,
        ),
        alignmentVersion,
        preprocessVersion,
        normalizationVersion,
    ]
        .map(
            (
                value,
            ) =>
                encodeURIComponent(
                    value,
                ),
        )
        .join(
            "|",
        );
}

export function createIdentityComparisonProfile({
    modelId,
    modelSha256,
    embeddingDim,
    alignmentVersion,
    preprocessVersion,
    normalizationVersion,
} = {}) {
    const normalizedModelId =
        normalizeOpaqueString(
            modelId,
            "modelId",
        );

    const normalizedModelSha256 =
        normalizeSha256(
            modelSha256,
        );

    if (
        embeddingDim !==
        SFACE_EMBEDDING_SIZE
    ) {
        throw new TypeError(
            `embeddingDim deve ser exatamente ${SFACE_EMBEDDING_SIZE}.`,
        );
    }

    const normalizedAlignmentVersion =
        normalizeOpaqueString(
            alignmentVersion,
            "alignmentVersion",
        );

    const normalizedPreprocessVersion =
        normalizeOpaqueString(
            preprocessVersion,
            "preprocessVersion",
        );

    const normalizedNormalizationVersion =
        normalizeOpaqueString(
            normalizationVersion,
            "normalizationVersion",
        );

    const profile = {
        modelId:
            normalizedModelId,
        modelSha256:
            normalizedModelSha256,
        embeddingDim,
        alignmentVersion:
            normalizedAlignmentVersion,
        preprocessVersion:
            normalizedPreprocessVersion,
        normalizationVersion:
            normalizedNormalizationVersion,
    };

    return Object.freeze({
        ...profile,
        profileId:
            createProfileId(
                profile,
            ),
    });
}

function assertNormalizedEmbedding128(
    embedding,
    name,
) {
    if (
        !(
            embedding instanceof
            Float32Array
        )
    ) {
        throw new TypeError(
            `${name} deve ser Float32Array.`,
        );
    }

    if (
        embedding.length !==
        SFACE_EMBEDDING_SIZE
    ) {
        throw new RangeError(
            `${name} deve possuir exatamente ${SFACE_EMBEDDING_SIZE} valores.`,
        );
    }

    let sumSquares =
        0;

    for (
        let index = 0;
        index <
        embedding.length;
        index += 1
    ) {
        const value =
            embedding[
                index
            ];

        if (
            !Number.isFinite(
                value,
            )
        ) {
            throw new RangeError(
                `${name}[${index}] deve ser finito.`,
            );
        }

        sumSquares +=
            value *
            value;
    }

    const norm =
        Math.sqrt(
            sumSquares,
        );

    if (
        !Number.isFinite(
            norm,
        ) ||
        Math.abs(
            norm -
            1,
        ) >
            UNIT_NORM_TOLERANCE
    ) {
        throw new RangeError(
            `${name} deve estar L2-normalizado.`,
        );
    }

    return embedding;
}

function normalizeMode(
    value,
) {
    const normalized =
        normalizeOpaqueString(
            value,
            "mode",
        );

    if (
        !VALID_MODES.has(
            normalized,
        )
    ) {
        throw new TypeError(
            `mode invalido: ${normalized}`,
        );
    }

    return normalized;
}

function normalizeReferenceState(
    value,
) {
    const normalized =
        normalizeOpaqueString(
            value,
            "reference.state",
        );

    if (
        !VALID_REFERENCE_STATES.has(
            normalized,
        )
    ) {
        throw new TypeError(
            `reference.state invalido: ${normalized}`,
        );
    }

    return normalized;
}

function normalizeThreshold(
    value,
    name,
) {
    if (
        typeof value !==
            "number" ||
        !Number.isFinite(
            value,
        ) ||
        value <
            -1 ||
        value >
            1
    ) {
        throw new TypeError(
            `${name} deve ser numero finito entre -1 e 1.`,
        );
    }

    return value;
}

function normalizeAmbiguityMargin(
    value,
) {
    if (
        typeof value !==
            "number" ||
        !Number.isFinite(
            value,
        ) ||
        value <
            0 ||
        value >
            2
    ) {
        throw new TypeError(
            "ambiguityMargin deve ser numero finito entre 0 e 2.",
        );
    }

    return value;
}

function normalizeThresholds({
    candidateThreshold,
    matchThreshold,
    ambiguityMargin,
} = {}) {
    const normalizedCandidate =
        normalizeThreshold(
            candidateThreshold,
            "candidateThreshold",
        );

    const normalizedMatch =
        normalizeThreshold(
            matchThreshold,
            "matchThreshold",
        );

    const normalizedMargin =
        normalizeAmbiguityMargin(
            ambiguityMargin,
        );

    if (
        normalizedCandidate >
        normalizedMatch
    ) {
        throw new TypeError(
            "candidateThreshold nao pode ser maior que matchThreshold.",
        );
    }

    return Object.freeze({
        candidateThreshold:
            normalizedCandidate,
        matchThreshold:
            normalizedMatch,
        ambiguityMargin:
            normalizedMargin,
    });
}

function normalizeReference(
    reference,
    index,
) {
    if (
        !reference ||
        typeof reference !==
            "object"
    ) {
        throw new TypeError(
            `references[${index}] deve ser objeto.`,
        );
    }

    return Object.freeze({
        collaboratorId:
            normalizeCollaboratorId(
                reference.collaboratorId,
            ),
        referenceId:
            normalizeOpaqueString(
                reference.referenceId,
                `references[${index}].referenceId`,
            ),
        profileId:
            normalizeOpaqueString(
                reference.profileId,
                `references[${index}].profileId`,
            ),
        state:
            normalizeReferenceState(
                reference.state,
            ),
        embedding:
            assertNormalizedEmbedding128(
                reference.embedding,
                `references[${index}].embedding`,
            ),
    });
}

function normalizeReferences(
    references,
) {
    if (
        !Array.isArray(
            references,
        )
    ) {
        throw new TypeError(
            "references deve ser um array.",
        );
    }

    const normalized =
        references.map(
            (reference) =>
                normalizeReference(
                    reference,
                ),
        );

    const referenceIds =
        new Set();

    for (
        const reference of
        normalized
    ) {
        if (
            referenceIds.has(
                reference.referenceId,
            )
        ) {
            throw new TypeError(
                `referenceId duplicado: ${reference.referenceId}`,
            );
        }

        referenceIds.add(
            reference.referenceId,
        );
    }

    return normalized;
}

function buildCentroid(
    embeddings,
) {
    if (
        embeddings.length ===
        0
    ) {
        throw new TypeError(
            "centroid exige ao menos um embedding.",
        );
    }

    const accumulator =
        new Float32Array(
            SFACE_EMBEDDING_SIZE,
        );

    for (
        const embedding of
        embeddings
    ) {
        for (
            let index = 0;
            index <
            SFACE_EMBEDDING_SIZE;
            index += 1
        ) {
            accumulator[index] +=
                embedding[index];
        }
    }

    for (
        let index = 0;
        index <
        SFACE_EMBEDDING_SIZE;
        index += 1
    ) {
        accumulator[index] /=
            embeddings.length;
    }

    return normalizeEmbeddingL2(
        accumulator,
    );
}

function buildActiveCompatibleCentroids({
    references,
    profileId,
    targetCollaboratorId = null,
}) {
    const grouped =
        new Map();

    for (
        const reference of
        references
    ) {
        if (
            reference.state !==
            IDENTITY_REFERENCE_STATE.ACTIVE
        ) {
            continue;
        }

        if (
            reference.profileId !==
            profileId
        ) {
            continue;
        }

        if (
            targetCollaboratorId !==
                null &&
            reference.collaboratorId !==
                targetCollaboratorId
        ) {
            continue;
        }

        const existing =
            grouped.get(
                reference.collaboratorId,
            ) ?? [];

        existing.push(
            reference.embedding,
        );

        grouped.set(
            reference.collaboratorId,
            existing,
        );
    }

    return Array.from(
        grouped.entries(),
        ([
            collaboratorId,
            embeddings,
        ]) =>
            Object.freeze({
                collaboratorId,
                referenceCount:
                    embeddings.length,
                centroid:
                    buildCentroid(
                        embeddings,
                    ),
            }),
    );
}

function rankCentroids({
    observedEmbedding,
    centroids,
}) {
    return centroids
        .map(
            (
                item,
            ) =>
                Object.freeze({
                    collaboratorId:
                        item.collaboratorId,
                    referenceCount:
                        item.referenceCount,
                    score:
                        cosineSimilarity128(
                            observedEmbedding,
                            item.centroid,
                        ),
                }),
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
                    return right.score -
                        left.score;
                }

                if (
                    left.collaboratorId <
                    right.collaboratorId
                ) {
                    return -1;
                }

                if (
                    left.collaboratorId >
                    right.collaboratorId
                ) {
                    return 1;
                }

                return 0;
            },
        );
}

function createResult({
    status,
    mode,
    profileId,
    collaboratorId = null,
    score = null,
    runnerUpScore = null,
    margin = null,
    reason,
}) {
    return Object.freeze({
        status,
        mode,
        profileId,
        collaboratorId,
        score,
        runnerUpScore,
        margin,
        confidence:
            null,
        reason,
    });
}

function classifyVerification({
    ranking,
    mode,
    profileId,
    thresholds,
}) {
    if (
        ranking.length ===
        0
    ) {
        return createResult({
            status:
                IDENTITY_STATUS.NO_REFERENCE,
            mode,
            profileId,
            reason:
                "no_active_compatible_reference",
        });
    }

    const top1 =
        ranking[0];

    if (
        top1.score >=
        thresholds.matchThreshold
    ) {
        return createResult({
            status:
                IDENTITY_STATUS.MATCH,
            mode,
            profileId,
            collaboratorId:
                top1.collaboratorId,
            score:
                top1.score,
            reason:
                "verification_match_threshold_met",
        });
    }

    if (
        top1.score >=
        thresholds.candidateThreshold
    ) {
        return createResult({
            status:
                IDENTITY_STATUS.LOW_CONFIDENCE,
            mode,
            profileId,
            collaboratorId:
                top1.collaboratorId,
            score:
                top1.score,
            reason:
                "verification_candidate_below_match_threshold",
        });
    }

    return createResult({
        status:
            IDENTITY_STATUS.NO_MATCH,
        mode,
        profileId,
        score:
            top1.score,
        reason:
            "verification_below_candidate_threshold",
    });
}

function classifyIdentification({
    ranking,
    mode,
    profileId,
    thresholds,
}) {
    if (
        ranking.length ===
        0
    ) {
        return createResult({
            status:
                IDENTITY_STATUS.NO_REFERENCE,
            mode,
            profileId,
            reason:
                "no_active_compatible_reference",
        });
    }

    const top1 =
        ranking[0];

    const top2 =
        ranking[1] ??
        null;

    const runnerUpScore =
        top2?.score ??
        null;

    const margin =
        top2
            ? top1.score -
                top2.score
            : null;

    if (
        top1.score <
        thresholds.candidateThreshold
    ) {
        return createResult({
            status:
                IDENTITY_STATUS.NO_MATCH,
            mode,
            profileId,
            score:
                top1.score,
            runnerUpScore,
            margin,
            reason:
                "identification_below_candidate_threshold",
        });
    }

    const top2IsPlausible =
        top2 !==
            null &&
        top2.score >=
            thresholds.candidateThreshold;

    if (
        top2IsPlausible &&
        margin <=
            thresholds.ambiguityMargin
    ) {
        return createResult({
            status:
                IDENTITY_STATUS.AMBIGUOUS,
            mode,
            profileId,
            score:
                top1.score,
            runnerUpScore,
            margin,
            reason:
                "multiple_plausible_candidates_without_sufficient_margin",
        });
    }

    if (
        top1.score >=
        thresholds.matchThreshold
    ) {
        return createResult({
            status:
                IDENTITY_STATUS.MATCH,
            mode,
            profileId,
            collaboratorId:
                top1.collaboratorId,
            score:
                top1.score,
            runnerUpScore,
            margin,
            reason:
                "identification_match_threshold_and_margin_met",
        });
    }

    return createResult({
        status:
            IDENTITY_STATUS.LOW_CONFIDENCE,
        mode,
        profileId,
        collaboratorId:
            top1.collaboratorId,
        score:
            top1.score,
        runnerUpScore,
        margin,
        reason:
            "identification_candidate_below_match_threshold",
    });
}

function normalizeDecisionRanking(
    ranking,
) {
    if (
        !Array.isArray(
            ranking,
        )
    ) {
        throw new TypeError(
            "ranking deve ser array.",
        );
    }

    return ranking
        .map(
            (
                candidate,
                index,
            ) => {
                if (
                    !candidate ||
                    typeof candidate !==
                        "object" ||
                    Array.isArray(
                        candidate,
                    )
                ) {
                    throw new TypeError(
                        `ranking[${index}] deve ser objeto.`,
                    );
                }

                return Object.freeze({
                    collaboratorId:
                        normalizeCollaboratorId(
                            candidate.collaboratorId,
                        ),
                    score:
                        normalizeThreshold(
                            candidate.score,
                            `ranking[${index}].score`,
                        ),
                });
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
                    return right.score -
                        left.score;
                }

                return left.collaboratorId
                    .localeCompare(
                        right.collaboratorId,
                    );
            },
        );
}

export function decideIdentityRanking({
    mode,
    profileId,
    ranking,
    candidateThreshold,
    matchThreshold,
    ambiguityMargin,
} = {}) {
    const normalizedMode =
        normalizeMode(
            mode,
        );

    const normalizedProfileId =
        normalizeOpaqueString(
            profileId,
            "profileId",
        );

    const normalizedRanking =
        normalizeDecisionRanking(
            ranking,
        );

    const thresholds =
        normalizeThresholds({
            candidateThreshold,
            matchThreshold,
            ambiguityMargin,
        });

    if (
        normalizedMode ===
        IDENTITY_COMPARISON_MODE.VERIFICATION
    ) {
        return classifyVerification({
            ranking:
                normalizedRanking,
            mode:
                normalizedMode,
            profileId:
                normalizedProfileId,
            thresholds,
        });
    }

    return classifyIdentification({
        ranking:
            normalizedRanking,
        mode:
            normalizedMode,
        profileId:
            normalizedProfileId,
        thresholds,
    });
}

export function compareIdentityEmbeddings({
    mode,
    profile,
    observedEmbedding,
    references,
    targetCollaboratorId,
    candidateThreshold,
    matchThreshold,
    ambiguityMargin,
} = {}) {
    const normalizedMode =
        normalizeMode(
            mode,
        );

    const normalizedProfile =
        createIdentityComparisonProfile(
            profile,
        );

    const normalizedObserved =
        assertNormalizedEmbedding128(
            observedEmbedding,
            "observedEmbedding",
        );

    const normalizedReferences =
        normalizeReferences(
            references,
        );

    const thresholds =
        normalizeThresholds({
            candidateThreshold,
            matchThreshold,
            ambiguityMargin,
        });

    let normalizedTargetCollaboratorId =
        null;

    if (
        normalizedMode ===
        IDENTITY_COMPARISON_MODE.VERIFICATION
    ) {
        normalizedTargetCollaboratorId =
            normalizeCollaboratorId(
                targetCollaboratorId,
            );
    }
    else if (
        targetCollaboratorId !==
            undefined &&
        targetCollaboratorId !==
            null
    ) {
        throw new TypeError(
            "targetCollaboratorId so e permitido em VERIFICATION.",
        );
    }

    const centroids =
        buildActiveCompatibleCentroids({
            references:
                normalizedReferences,
            profileId:
                normalizedProfile.profileId,
            targetCollaboratorId:
                normalizedTargetCollaboratorId,
        });

    const ranking =
        rankCentroids({
            observedEmbedding:
                normalizedObserved,
            centroids,
        });

    if (
        normalizedMode ===
        IDENTITY_COMPARISON_MODE.VERIFICATION
    ) {
        return classifyVerification({
            ranking,
            mode:
                normalizedMode,
            profileId:
                normalizedProfile.profileId,
            thresholds,
        });
    }

    return classifyIdentification({
        ranking,
        mode:
            normalizedMode,
        profileId:
            normalizedProfile.profileId,
        thresholds,
    });
}
