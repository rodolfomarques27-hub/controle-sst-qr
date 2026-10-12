import {
    validateEmbedding128,
} from "./biometricReferenceLifecycle.mjs";

const SFACE_L2_TOLERANCE =
    1e-5;

function requireBrokerClient(
    brokerClient,
) {
    if (
        !brokerClient ||
        typeof brokerClient !== "object" ||
        typeof brokerClient.identify !== "function"
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

export function createBiometricIdentificationPipeline({
    brokerClient,
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
            const embedding =
                requireObservedEmbedding(
                    observedEmbedding,
                );

            return client.identify({
                tenantId,
                empresaId,
                profileId,
                requestId,
                observedEmbedding:
                    embedding,
            });
        },
    });
}
