import {
    validateEmbedding128,
} from "./biometricReferenceLifecycle.mjs";

import {
    IDENTITY_COMPARISON_MODE,
    decideIdentityRanking,
} from "./identityComparison.mjs";

import {
    requireHomologatedBiometricProductivePolicy,
} from "./biometricProductivePolicy.mjs";

const SFACE_L2_TOLERANCE =
    1e-5;

function requireBrokerClient(
    brokerClient,
) {
    if (
        !brokerClient ||
        typeof brokerClient !==
            "object" ||
        typeof brokerClient.identify !==
            "function"
    ) {
        throw new TypeError(
            "brokerClient.identify e obrigatorio.",
        );
    }

    return brokerClient;
}

function requireObservedEmbedding(
    observedEmbedding,
) {
    const validation =
        validateEmbedding128(
            observedEmbedding,
            {
                l2Tolerance:
                    SFACE_L2_TOLERANCE,
            },
        );

    if (!validation.valid) {
        throw new RangeError(
            `observedEmbedding invalido: ${validation.reason}.`,
        );
    }

    return observedEmbedding;
}

function requireBrokerResult(
    result,
) {
    if (
        !result ||
        typeof result !==
            "object" ||
        Array.isArray(
            result,
        )
    ) {
        throw new TypeError(
            "BIOMETRIC_BROKER_RESULT_INVALID",
        );
    }

    if (
        result.status !==
            "NO_REFERENCE" &&
        result.status !==
            "RANKED"
    ) {
        throw new TypeError(
            "BIOMETRIC_BROKER_RESULT_STATUS_INVALID",
        );
    }

    return result;
}

function requireRankCandidate(
    candidate,
    name,
) {
    if (
        !candidate ||
        typeof candidate !==
            "object" ||
        Array.isArray(
            candidate,
        )
    ) {
        throw new TypeError(
            `${name} invalido.`,
        );
    }

    const collaboratorId =
        String(
            candidate.colaboradorId ??
            "",
        ).trim();

    if (!collaboratorId) {
        throw new TypeError(
            `${name}.colaboradorId invalido.`,
        );
    }

    const score =
        candidate.score;

    if (
        typeof score !==
            "number" ||
        !Number.isFinite(
            score,
        ) ||
        score < -1 ||
        score > 1
    ) {
        throw new TypeError(
            `${name}.score invalido.`,
        );
    }

    return Object.freeze({
        collaboratorId,
        score,
    });
}

function decisionRankingFromBroker(
    result,
) {
    if (
        result.status ===
        "NO_REFERENCE"
    ) {
        return Object.freeze([]);
    }

    if (!result.top1) {
        throw new TypeError(
            "BIOMETRIC_BROKER_TOP1_REQUIRED",
        );
    }

    const ranking = [
        requireRankCandidate(
            result.top1,
            "top1",
        ),
    ];

    if (result.top2) {
        ranking.push(
            requireRankCandidate(
                result.top2,
                "top2",
            ),
        );
    }

    return Object.freeze(
        ranking,
    );
}

function publicThresholds(
    policy,
) {
    return Object.freeze({
        candidateThreshold:
            policy.candidateThreshold,
        matchThreshold:
            policy.matchThreshold,
        ambiguityMargin:
            policy.ambiguityMargin,
    });
}

export function createBiometricIdentificationPipeline({
    brokerClient,
    productivePolicy = null,
} = {}) {
    const client =
        requireBrokerClient(
            brokerClient,
        );

    return Object.freeze({
        async identifySface({
            tenantId,
            empresaId,
            profileId,
            requestId,
            observedEmbedding,
        } = {}) {
            const policy =
                requireHomologatedBiometricProductivePolicy(
                    productivePolicy,
                );

            const embedding =
                requireObservedEmbedding(
                    observedEmbedding,
                );

            const brokerResult =
                requireBrokerResult(
                    await client.identify({
                        tenantId,
                        empresaId,
                        profileId,
                        requestId,
                        observedEmbedding:
                            embedding,
                    }),
                );

            const ranking =
                decisionRankingFromBroker(
                    brokerResult,
                );

            const decision =
                decideIdentityRanking({
                    mode:
                        IDENTITY_COMPARISON_MODE.IDENTIFICATION,
                    profileId,
                    ranking,
                    candidateThreshold:
                        policy.candidateThreshold,
                    matchThreshold:
                        policy.matchThreshold,
                    ambiguityMargin:
                        policy.ambiguityMargin,
                });

            const auditedDecision =
                Object.freeze({
                    ...decision,
                    policyVersion:
                        policy.policyVersion,
                });

            return Object.freeze({
                ...brokerResult,
                policyVersion:
                    policy.policyVersion,
                thresholds:
                    publicThresholds(
                        policy,
                    ),
                decision:
                    auditedDecision,
            });
        },
    });
}
