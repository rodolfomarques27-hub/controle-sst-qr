import {
    createCpuFloat32Tensor,
    createCpuInferenceSession,
} from "../inference/onnxRuntimeAdapter.mjs";

export const SFACE_INPUT_WIDTH = 112;
export const SFACE_INPUT_HEIGHT = 112;
export const SFACE_CHANNELS = 3;

export const SFACE_INPUT_BYTES =
    SFACE_INPUT_WIDTH *
    SFACE_INPUT_HEIGHT *
    SFACE_CHANNELS;

export const SFACE_EMBEDDING_SIZE = 128;

export const SFACE_CANONICAL_LANDMARKS_112 =
    Object.freeze([
        Object.freeze({
            x:
                38.2946,
            y:
                51.6963,
        }),

        Object.freeze({
            x:
                73.5318,
            y:
                51.5014,
        }),

        Object.freeze({
            x:
                56.0252,
            y:
                71.7366,
        }),

        Object.freeze({
            x:
                41.5493,
            y:
                92.3655,
        }),

        Object.freeze({
            x:
                70.7299,
            y:
                92.2041,
        }),
    ]);

function requireExact112Dimensions(
    width,
    height,
) {
    if (
        width !==
            SFACE_INPUT_WIDTH ||
        height !==
            SFACE_INPUT_HEIGHT
    ) {
        throw new RangeError(
            (
                "SFace exige exatamente 112x112; " +
                `atual=${width}x${height}`
            ),
        );
    }
}

function requireEmbedding128(
    embedding,
    name =
        "embedding",
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
            (
                `${name} deve possuir exatamente ` +
                `128 valores; atual=${embedding.length}`
            ),
        );
    }

    for (
        let index = 0;
        index <
        embedding.length;
        index += 1
    ) {
        if (
            !Number.isFinite(
                embedding[index],
            )
        ) {
            throw new RangeError(
                `${name}[${index}] deve ser finito.`,
            );
        }
    }

    return embedding;
}

function elementCount(
    shape,
) {
    return shape.reduce(
        (
            total,
            dimension,
        ) =>
            total *
            dimension,
        1,
    );
}

function requireStaticPositiveShape(
    shape,
    name,
) {
    const normalized =
        Array.from(
            shape ??
            [],
        );

    if (
        normalized.length ===
            0 ||
        !normalized.every(
            (
                dimension,
            ) =>
                Number.isSafeInteger(
                    dimension,
                ) &&
                dimension >
                    0,
        )
    ) {
        throw new Error(
            (
                `${name} deve possuir shape ` +
                "estatico positivo."
            ),
        );
    }

    return normalized;
}

function inspectSfaceSessionContract(
    session,
) {
    const inputNames =
        Array.from(
            session.inputNames ??
            [],
        );

    const outputNames =
        Array.from(
            session.outputNames ??
            [],
        );

    const inputMetadata =
        Array.from(
            session.inputMetadata ??
            [],
        );

    const outputMetadata =
        Array.from(
            session.outputMetadata ??
            [],
        );

    if (
        inputNames.length !==
            1 ||
        inputMetadata.length !==
            1
    ) {
        throw new Error(
            (
                "SFace deve expor exatamente 1 input; " +
                `names=${inputNames.length} ` +
                `metadata=${inputMetadata.length}`
            ),
        );
    }

    if (
        outputNames.length !==
            1 ||
        outputMetadata.length !==
            1
    ) {
        throw new Error(
            (
                "SFace deve expor exatamente 1 output; " +
                `names=${outputNames.length} ` +
                `metadata=${outputMetadata.length}`
            ),
        );
    }

    const input =
        inputMetadata[0];

    const output =
        outputMetadata[0];

    if (
        input?.name !==
            inputNames[0] ||
        output?.name !==
            outputNames[0]
    ) {
        throw new Error(
            (
                "metadata de input/output diverge " +
                "dos nomes expostos pela sessao."
            ),
        );
    }

    if (
        input?.isTensor !==
            true ||
        output?.isTensor !==
            true
    ) {
        throw new Error(
            "input e output SFace devem ser tensores.",
        );
    }

    if (
        input.type !==
        "float32"
    ) {
        throw new Error(
            (
                "input SFace deve ser float32; " +
                `atual=${input.type}`
            ),
        );
    }

    if (
        output.type !==
        "float32"
    ) {
        throw new Error(
            (
                "output SFace deve ser float32; " +
                `atual=${output.type}`
            ),
        );
    }

    const inputShape =
        requireStaticPositiveShape(
            input.shape,
            "input SFace",
        );

    const expectedInputShape =
        [
            1,
            3,
            SFACE_INPUT_HEIGHT,
            SFACE_INPUT_WIDTH,
        ];

    if (
        inputShape.length !==
            expectedInputShape.length ||
        inputShape.some(
            (
                value,
                index,
            ) =>
                value !==
                expectedInputShape[index],
        )
    ) {
        throw new Error(
            (
                "input SFace inesperado: " +
                JSON.stringify(
                    inputShape,
                )
            ),
        );
    }

    const outputShape =
        requireStaticPositiveShape(
            output.shape,
            "output SFace",
        );

    if (
        elementCount(
            outputShape,
        ) !==
        SFACE_EMBEDDING_SIZE
    ) {
        throw new Error(
            (
                "output SFace deve conter 128 features; " +
                `atual=${elementCount(outputShape)}`
            ),
        );
    }

    return Object.freeze({
        inputName:
            inputNames[0],

        outputName:
            outputNames[0],

        inputShape:
            Object.freeze(
                inputShape,
            ),

        outputShape:
            Object.freeze(
                outputShape,
            ),
    });
}

export function preprocessSfaceBgr112({
    data,
    width =
        SFACE_INPUT_WIDTH,
    height =
        SFACE_INPUT_HEIGHT,
} = {}) {
    requireExact112Dimensions(
        width,
        height,
    );

    if (
        !(
            data instanceof
            Uint8Array
        )
    ) {
        throw new TypeError(
            "data deve ser Uint8Array/Buffer BGR24.",
        );
    }

    if (
        data.byteLength !==
        SFACE_INPUT_BYTES
    ) {
        throw new RangeError(
            (
                `SFace exige exatamente ${SFACE_INPUT_BYTES} ` +
                `bytes BGR24; atual=${data.byteLength}`
            ),
        );
    }

    const pixelCount =
        SFACE_INPUT_WIDTH *
        SFACE_INPUT_HEIGHT;

    const rgbNchw =
        new Float32Array(
            SFACE_INPUT_BYTES,
        );

    for (
        let pixel = 0;
        pixel <
        pixelCount;
        pixel += 1
    ) {
        const sourceOffset =
            pixel *
            SFACE_CHANNELS;

        const blue =
            data[
                sourceOffset
            ];

        const green =
            data[
                sourceOffset +
                1
            ];

        const red =
            data[
                sourceOffset +
                2
            ];

        rgbNchw[
            pixel
        ] =
            red;

        rgbNchw[
            pixelCount +
            pixel
        ] =
            green;

        rgbNchw[
            2 *
                pixelCount +
            pixel
        ] =
            blue;
    }

    return Object.freeze({
        data:
            rgbNchw,

        dims:
            Object.freeze([
                1,
                3,
                SFACE_INPUT_HEIGHT,
                SFACE_INPUT_WIDTH,
            ]),

        format:
            "rgb-nchw-float32",

        scale:
            1,

        mean:
            0,
    });
}

export function normalizeEmbeddingL2(
    embedding,
) {
    const validated =
        requireEmbedding128(
            embedding,
        );

    let sumSquares =
        0;

    for (
        const value of
        validated
    ) {
        sumSquares +=
            value *
            value;
    }

    if (
        !Number.isFinite(
            sumSquares,
        )
    ) {
        throw new RangeError(
            "norma L2 do embedding nao e finita.",
        );
    }

    const norm =
        Math.sqrt(
            sumSquares,
        );

    if (
        !Number.isFinite(
            norm,
        ) ||
        norm <=
            Number.EPSILON
    ) {
        throw new RangeError(
            (
                "norma L2 do embedding deve ser " +
                "finita e maior que zero."
            ),
        );
    }

    const normalized =
        new Float32Array(
            SFACE_EMBEDDING_SIZE,
        );

    for (
        let index = 0;
        index <
        normalized.length;
        index += 1
    ) {
        normalized[index] =
            validated[index] /
            norm;
    }

    return normalized;
}

export function cosineSimilarity128(
    left,
    right,
) {
    const leftValidated =
        requireEmbedding128(
            left,
            "left",
        );

    const rightValidated =
        requireEmbedding128(
            right,
            "right",
        );

    let dot =
        0;

    let leftSquares =
        0;

    let rightSquares =
        0;

    for (
        let index = 0;
        index <
        SFACE_EMBEDDING_SIZE;
        index += 1
    ) {
        const leftValue =
            leftValidated[
                index
            ];

        const rightValue =
            rightValidated[
                index
            ];

        dot +=
            leftValue *
            rightValue;

        leftSquares +=
            leftValue *
            leftValue;

        rightSquares +=
            rightValue *
            rightValue;
    }

    const denominator =
        Math.sqrt(
            leftSquares,
        ) *
        Math.sqrt(
            rightSquares,
        );

    if (
        !Number.isFinite(
            denominator,
        ) ||
        denominator <=
            Number.EPSILON
    ) {
        throw new RangeError(
            (
                "cosine similarity exige embeddings " +
                "com norma positiva e finita."
            ),
        );
    }

    const similarity =
        dot /
        denominator;

    if (
        !Number.isFinite(
            similarity,
        )
    ) {
        throw new RangeError(
            (
                "cosine similarity produziu " +
                "valor nao finito."
            ),
        );
    }

    return Math.max(
        -1,
        Math.min(
            1,
            similarity,
        ),
    );
}

export async function createSfaceEmbeddingExtractor({
    modelPath,
} = {}) {
    let session =
        null;

    try {
        session =
            await createCpuInferenceSession(
                modelPath,
            );

        const contract =
            inspectSfaceSessionContract(
                session,
            );

        let released =
            false;

        function assertActive() {
            if (released) {
                throw new Error(
                    "extractor SFace ja foi liberado.",
                );
            }
        }

        async function extractBgr112({
            data,
            width =
                SFACE_INPUT_WIDTH,
            height =
                SFACE_INPUT_HEIGHT,
        } = {}) {
            assertActive();

            const preprocessed =
                preprocessSfaceBgr112({
                    data,
                    width,
                    height,
                });

            const tensor =
                createCpuFloat32Tensor({
                    data:
                        preprocessed.data,

                    dims:
                        Array.from(
                            preprocessed.dims,
                        ),
                });

            const outputs =
                await session.run({
                    [contract.inputName]:
                        tensor,
                });

            const outputKeys =
                Object.keys(
                    outputs ??
                    {},
                );

            if (
                outputKeys.length !==
                    1 ||
                outputKeys[0] !==
                    contract.outputName
            ) {
                throw new Error(
                    (
                        "session.run retornou outputs " +
                        "inesperados: " +
                        JSON.stringify(
                            outputKeys,
                        )
                    ),
                );
            }

            const output =
                outputs[
                    contract.outputName
                ];

            if (
                output?.type !==
                "float32"
            ) {
                throw new Error(
                    (
                        "output runtime deve ser float32; " +
                        `atual=${output?.type}`
                    ),
                );
            }

            const outputDims =
                requireStaticPositiveShape(
                    output?.dims,
                    "output runtime SFace",
                );

            if (
                elementCount(
                    outputDims,
                ) !==
                SFACE_EMBEDDING_SIZE
            ) {
                throw new Error(
                    (
                        "output runtime deve conter " +
                        "128 features; " +
                        `atual=${elementCount(outputDims)}`
                    ),
                );
            }

            if (
                !(
                    output?.data instanceof
                    Float32Array
                )
            ) {
                throw new TypeError(
                    (
                        "output runtime SFace deve " +
                        "fornecer Float32Array."
                    ),
                );
            }

            return normalizeEmbeddingL2(
                output.data,
            );
        }

        async function release() {
            if (released) {
                return false;
            }

            released =
                true;

            if (
                typeof session.release ===
                "function"
            ) {
                await session.release();
            }

            return true;
        }

        return Object.freeze({
            provider:
                "cpu",

            inputName:
                contract.inputName,

            outputName:
                contract.outputName,

            inputShape:
                contract.inputShape,

            outputShape:
                contract.outputShape,

            inputWidth:
                SFACE_INPUT_WIDTH,

            inputHeight:
                SFACE_INPUT_HEIGHT,

            embeddingSize:
                SFACE_EMBEDDING_SIZE,

            extractBgr112,
            release,
        });
    }
    catch (error) {
        if (
            session &&
            typeof session.release ===
                "function"
        ) {
            try {
                await session.release();
            }
            catch {
                /*
                 * Nao mascarar o erro original
                 * de abertura/contrato.
                 */
            }
        }

        throw error;
    }
}
