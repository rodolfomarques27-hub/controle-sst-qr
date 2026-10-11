import test from "node:test";
import assert from "node:assert/strict";

import {
    ONNX_RUNTIME_PROVIDER,
    createCpuFloat32Tensor,
    inspectOnnxRuntime,
} from "../src/inference/onnxRuntimeAdapter.mjs";

test(
    "adapter expoe ONNX Runtime Node com provider CPU",
    () => {
        const runtime =
            inspectOnnxRuntime();

        assert.equal(
            runtime.provider,
            ONNX_RUNTIME_PROVIDER,
        );

        assert.equal(
            runtime.provider,
            "cpu",
        );

        assert.equal(
            runtime.hasInferenceSession,
            true,
        );

        assert.equal(
            runtime.hasInferenceSessionCreate,
            true,
        );

        assert.equal(
            runtime.hasTensor,
            true,
        );

        assert.equal(
            runtime.hasEnv,
            true,
        );

        assert.equal(
            Object.isFrozen(
                runtime,
            ),
            true,
        );
    },
);

test(
    "adapter cria tensor float32 CPU deterministico",
    () => {
        const tensor =
            createCpuFloat32Tensor({
                data:
                    [
                        1,
                        2,
                        3,
                        4,
                    ],
                dims:
                    [
                        2,
                        2,
                    ],
            });

        assert.equal(
            tensor.type,
            "float32",
        );

        assert.deepEqual(
            Array.from(
                tensor.dims,
            ),
            [
                2,
                2,
            ],
        );

        assert.deepEqual(
            Array.from(
                tensor.data,
            ),
            [
                1,
                2,
                3,
                4,
            ],
        );
    },
);

test(
    "adapter aceita TypedArray e preserva contrato float32",
    () => {
        const tensor =
            createCpuFloat32Tensor({
                data:
                    Float64Array.from([
                        0.25,
                        0.5,
                    ]),
                dims:
                    [
                        1,
                        2,
                    ],
            });

        assert.equal(
            tensor.type,
            "float32",
        );

        assert.deepEqual(
            Array.from(
                tensor.dims,
            ),
            [
                1,
                2,
            ],
        );

        assert.deepEqual(
            Array.from(
                tensor.data,
            ),
            [
                0.25,
                0.5,
            ],
        );
    },
);

test(
    "adapter rejeita dimensoes ou quantidade de elementos incoerentes",
    () => {
        assert.throws(
            () =>
                createCpuFloat32Tensor({
                    data:
                        [
                            1,
                            2,
                        ],
                    dims:
                        [
                            0,
                            2,
                        ],
                }),
            /inteiro positivo/,
        );

        assert.throws(
            () =>
                createCpuFloat32Tensor({
                    data:
                        [
                            1,
                            2,
                            3,
                        ],
                    dims:
                        [
                            2,
                            2,
                        ],
                }),
            /quantidade de elementos diverge/,
        );
    },
);
