import * as ortNamespace from "onnxruntime-node";

const ort =
    ortNamespace.default ??
    ortNamespace;

export const ONNX_RUNTIME_PROVIDER =
    "cpu";

function assertRuntimeApi() {
    const hasInferenceSession =
        typeof ort.InferenceSession === "function" ||
        (
            typeof ort.InferenceSession === "object" &&
            ort.InferenceSession !== null
        );

    const hasInferenceSessionCreate =
        typeof ort.InferenceSession?.create ===
        "function";

    const hasTensor =
        typeof ort.Tensor ===
        "function";

    const hasEnv =
        typeof ort.env === "object" &&
        ort.env !== null;

    if (
        !hasInferenceSession ||
        !hasInferenceSessionCreate ||
        !hasTensor ||
        !hasEnv
    ) {
        throw new Error(
            "ONNX Runtime Node API incompleta.",
        );
    }

    return {
        hasInferenceSession,
        hasInferenceSessionCreate,
        hasTensor,
        hasEnv,
    };
}

function normalizeDims(
    dims,
) {
    if (
        !Array.isArray(
            dims,
        ) ||
        dims.length === 0
    ) {
        throw new TypeError(
            "dims deve ser um array nao vazio.",
        );
    }

    return dims.map(
        (
            dimension,
        ) => {
            const value =
                Number(
                    dimension,
                );

            if (
                !Number.isInteger(
                    value,
                ) ||
                value <= 0
            ) {
                throw new TypeError(
                    "cada dimensao deve ser inteiro positivo.",
                );
            }

            return value;
        },
    );
}

function normalizeFloat32Data(
    data,
) {
    const accepted =
        Array.isArray(
            data,
        ) ||
        ArrayBuffer.isView(
            data,
        );

    if (!accepted) {
        throw new TypeError(
            "data deve ser array ou TypedArray.",
        );
    }

    const normalized =
        Float32Array.from(
            data,
        );

    for (
        const value of
        normalized
    ) {
        if (
            !Number.isFinite(
                value,
            )
        ) {
            throw new TypeError(
                "data deve conter apenas numeros finitos.",
            );
        }
    }

    return normalized;
}

function calculateElementCount(
    dims,
) {
    return dims.reduce(
        (
            total,
            dimension,
        ) =>
            total *
            dimension,
        1,
    );
}

function requireModelPath(
    modelPath,
) {
    if (
        typeof modelPath !== "string" ||
        !modelPath.trim()
    ) {
        throw new TypeError(
            "modelPath deve ser uma string nao vazia.",
        );
    }

    if (
        modelPath.includes(
            "\0",
        )
    ) {
        throw new TypeError(
            "modelPath contem caractere NUL.",
        );
    }

    return modelPath.trim();
}

export function inspectOnnxRuntime() {
    const api =
        assertRuntimeApi();

    return Object.freeze({
        provider:
            ONNX_RUNTIME_PROVIDER,

        ...api,
    });
}

export function createCpuFloat32Tensor({
    data,
    dims,
} = {}) {
    assertRuntimeApi();

    const normalizedDims =
        normalizeDims(
            dims,
        );

    const normalizedData =
        normalizeFloat32Data(
            data,
        );

    const expectedElements =
        calculateElementCount(
            normalizedDims,
        );

    if (
        normalizedData.length !==
        expectedElements
    ) {
        throw new RangeError(
            (
                "quantidade de elementos diverge das dimensoes: " +
                `esperado=${expectedElements} atual=${normalizedData.length}`
            ),
        );
    }

    return new ort.Tensor(
        "float32",
        normalizedData,
        normalizedDims,
    );
}

export async function createCpuInferenceSession(
    modelPath,
) {
    assertRuntimeApi();

    const normalizedModelPath =
        requireModelPath(
            modelPath,
        );

    return ort.InferenceSession.create(
        normalizedModelPath,
        {
            executionProviders:
                [
                    ONNX_RUNTIME_PROVIDER,
                ],

            graphOptimizationLevel:
                "all",
        },
    );
}
