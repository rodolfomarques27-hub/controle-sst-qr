export const BGR24_CHANNELS =
    3;

function requirePositiveInteger(
    value,
    name,
) {
    if (
        !Number.isSafeInteger(
            value,
        ) ||
        value <= 0
    ) {
        throw new TypeError(
            `${name} deve ser inteiro positivo.`,
        );
    }

    return value;
}

function calculateFrameSize(
    width,
    height,
) {
    const pixels =
        width *
        height;

    const frameSize =
        pixels *
        BGR24_CHANNELS;

    if (
        !Number.isSafeInteger(
            pixels,
        ) ||
        !Number.isSafeInteger(
            frameSize,
        ) ||
        frameSize <= 0
    ) {
        throw new RangeError(
            "dimensoes excedem o limite seguro para BGR24.",
        );
    }

    return frameSize;
}

function requireByteChunk(
    chunk,
) {
    if (
        !(chunk instanceof Uint8Array)
    ) {
        throw new TypeError(
            "chunk deve ser Uint8Array ou Buffer.",
        );
    }

    return chunk;
}

export function createRawBgrFrameAssembler({
    width,
    height,
} = {}) {
    const normalizedWidth =
        requirePositiveInteger(
            width,
            "width",
        );

    const normalizedHeight =
        requirePositiveInteger(
            height,
            "height",
        );

    const frameSize =
        calculateFrameSize(
            normalizedWidth,
            normalizedHeight,
        );

    const assemblyBuffer =
        new Uint8Array(
            frameSize,
        );

    let pendingBytes =
        0;

    let pushedChunks =
        0;

    let totalBytes =
        0;

    let completedFrames =
        0;

    function snapshot() {
        return Object.freeze({
            width:
                normalizedWidth,

            height:
                normalizedHeight,

            channels:
                BGR24_CHANNELS,

            frameSize,
            pendingBytes,
            pushedChunks,
            totalBytes,
            completedFrames,
        });
    }

    function push(
        chunk,
    ) {
        const bytes =
            requireByteChunk(
                chunk,
            );

        const nextTotalBytes =
            totalBytes +
            bytes.byteLength;

        if (
            !Number.isSafeInteger(
                nextTotalBytes,
            )
        ) {
            throw new RangeError(
                "contador totalBytes excedeu o limite seguro.",
            );
        }

        pushedChunks +=
            1;

        totalBytes =
            nextTotalBytes;

        if (
            bytes.byteLength === 0
        ) {
            return Object.freeze(
                [],
            );
        }

        const frames =
            [];

        let sourceOffset =
            0;

        while (
            sourceOffset <
            bytes.byteLength
        ) {
            const remainingFrameBytes =
                frameSize -
                pendingBytes;

            const remainingSourceBytes =
                bytes.byteLength -
                sourceOffset;

            const copyLength =
                Math.min(
                    remainingFrameBytes,
                    remainingSourceBytes,
                );

            assemblyBuffer.set(
                bytes.subarray(
                    sourceOffset,
                    sourceOffset +
                        copyLength,
                ),
                pendingBytes,
            );

            pendingBytes +=
                copyLength;

            sourceOffset +=
                copyLength;

            if (
                pendingBytes ===
                frameSize
            ) {
                /*
                 * O frame emitido recebe copia propria.
                 * Nunca retornamos o assemblyBuffer interno.
                 */
                const frame =
                    Uint8Array.from(
                        assemblyBuffer,
                    );

                frames.push(
                    frame,
                );

                completedFrames +=
                    1;

                pendingBytes =
                    0;
            }
        }

        return Object.freeze(
            frames,
        );
    }

    function reset() {
        assemblyBuffer.fill(
            0,
        );

        pendingBytes =
            0;

        pushedChunks =
            0;

        totalBytes =
            0;

        completedFrames =
            0;

        return snapshot();
    }

    return Object.freeze({
        push,
        reset,
        snapshot,
    });
}
