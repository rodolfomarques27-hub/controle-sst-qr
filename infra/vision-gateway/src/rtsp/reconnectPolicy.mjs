function requirePositiveInteger(
    value,
    name,
) {
    if (
        !Number.isSafeInteger(value) ||
        value < 1
    ) {
        throw new TypeError(
            `${name} deve ser um inteiro positivo.`,
        );
    }

    return value;
}

function requireJitterRatio(
    value,
) {
    if (
        typeof value !== "number" ||
        !Number.isFinite(value) ||
        value < 0 ||
        value > 1
    ) {
        throw new TypeError(
            "jitterRatio deve estar entre 0 e 1.",
        );
    }

    return value;
}

function normalizeRandomValue(
    value,
) {
    const normalized =
        Number(value);

    if (
        !Number.isFinite(normalized) ||
        normalized < 0 ||
        normalized > 1
    ) {
        throw new TypeError(
            "random deve retornar valor entre 0 e 1.",
        );
    }

    return normalized;
}

export function createReconnectPolicy({
    baseDelayMs = 1000,
    maxDelayMs = 30000,
    jitterRatio = 0.2,
    random = Math.random,
} = {}) {
    const normalizedBaseDelayMs =
        requirePositiveInteger(
            baseDelayMs,
            "baseDelayMs",
        );

    const normalizedMaxDelayMs =
        requirePositiveInteger(
            maxDelayMs,
            "maxDelayMs",
        );

    const normalizedJitterRatio =
        requireJitterRatio(
            jitterRatio,
        );

    if (
        normalizedMaxDelayMs <
        normalizedBaseDelayMs
    ) {
        throw new TypeError(
            "maxDelayMs deve ser maior ou igual a baseDelayMs.",
        );
    }

    if (
        typeof random !== "function"
    ) {
        throw new TypeError(
            "random deve ser uma funcao.",
        );
    }

    let attempt =
        0;

    function next() {
        attempt +=
            1;

        const exponent =
            Math.min(
                attempt - 1,
                30,
            );

        const exponentialDelay =
            Math.min(
                normalizedMaxDelayMs,
                normalizedBaseDelayMs *
                    (2 ** exponent),
            );

        const randomValue =
            normalizeRandomValue(
                random(),
            );

        const centeredRandom =
            (randomValue * 2) -
            1;

        const jitterWindow =
            exponentialDelay *
            normalizedJitterRatio;

        const jitteredDelay =
            Math.round(
                exponentialDelay +
                (
                    centeredRandom *
                    jitterWindow
                ),
            );

        const delayMs =
            Math.max(
                0,
                Math.min(
                    normalizedMaxDelayMs,
                    jitteredDelay,
                ),
            );

        return Object.freeze({
            attempt,
            delayMs,
            exponentialDelayMs:
                exponentialDelay,
        });
    }

    function reset() {
        attempt =
            0;

        return snapshot();
    }

    function snapshot() {
        return Object.freeze({
            attempt,
            baseDelayMs:
                normalizedBaseDelayMs,
            maxDelayMs:
                normalizedMaxDelayMs,
            jitterRatio:
                normalizedJitterRatio,
        });
    }

    return Object.freeze({
        next,
        reset,
        snapshot,
    });
}
