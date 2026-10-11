function requireFrameBytes(
    frame,
) {
    if (
        !(frame instanceof Uint8Array)
    ) {
        throw new TypeError(
            "frame deve ser Uint8Array ou Buffer.",
        );
    }

    if (
        frame.byteLength === 0
    ) {
        throw new RangeError(
            "frame nao pode ser vazio.",
        );
    }

    return frame;
}

export function createLatestFrameQueue() {
    let pendingFrame =
        null;

    let received =
        0;

    let delivered =
        0;

    let dropped =
        0;

    function snapshot() {
        return Object.freeze({
            capacity:
                1,

            pending:
                pendingFrame !== null,

            pendingBytes:
                pendingFrame?.byteLength ??
                0,

            received,
            delivered,
            dropped,
        });
    }

    function push(
        frame,
    ) {
        const bytes =
            requireFrameBytes(
                frame,
            );

        const replacement =
            pendingFrame !==
            null;

        /*
         * A fila assume propriedade de uma copia independente.
         * Alteracoes posteriores no buffer do produtor nao afetam
         * o frame pendente.
         */
        pendingFrame =
            Uint8Array.from(
                bytes,
            );

        received +=
            1;

        if (replacement) {
            dropped +=
                1;
        }

        return Object.freeze({
            accepted:
                true,

            replaced:
                replacement,

            ...snapshot(),
        });
    }

    function take() {
        if (
            pendingFrame ===
            null
        ) {
            return null;
        }

        const frame =
            pendingFrame;

        pendingFrame =
            null;

        delivered +=
            1;

        return frame;
    }

    function reset() {
        pendingFrame =
            null;

        received =
            0;

        delivered =
            0;

        dropped =
            0;

        return snapshot();
    }

    return Object.freeze({
        push,
        take,
        reset,
        snapshot,
    });
}
