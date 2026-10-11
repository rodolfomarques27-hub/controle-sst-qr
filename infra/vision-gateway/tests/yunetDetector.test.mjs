import test from "node:test";
import assert from "node:assert/strict";
import {
    fileURLToPath,
} from "node:url";

import {
    YUNET_DEFAULT_NMS_THRESHOLD,
    YUNET_DEFAULT_SCORE_THRESHOLD,
    YUNET_DEFAULT_TOP_K,
    applyYunetNms,
    createYunetDetector,
    decodeYunetOutputs,
    preprocessBgrHwcToNchw,
} from "../src/detection/yunetDetector.mjs";

const modelPath =
    fileURLToPath(
        new URL(
            "../models/face_detection_yunet_2026may.onnx",
            import.meta.url,
        ),
    );

function createOutputSet({
    paddedWidth = 32,
    paddedHeight = 32,
} = {}) {
    const outputs =
        {};

    for (
        const stride of
        [
            8,
            16,
            32,
        ]
    ) {
        const anchors =
            (
                paddedWidth /
                stride
            ) *
            (
                paddedHeight /
                stride
            );

        outputs[
            `cls_${stride}`
        ] = {
            dims:
                [
                    1,
                    anchors,
                    1,
                ],

            data:
                new Float32Array(
                    anchors,
                ),
        };

        outputs[
            `obj_${stride}`
        ] = {
            dims:
                [
                    1,
                    anchors,
                    1,
                ],

            data:
                new Float32Array(
                    anchors,
                ),
        };

        outputs[
            `bbox_${stride}`
        ] = {
            dims:
                [
                    1,
                    anchors,
                    4,
                ],

            data:
                new Float32Array(
                    anchors *
                    4,
                ),
        };

        outputs[
            `kps_${stride}`
        ] = {
            dims:
                [
                    1,
                    anchors,
                    10,
                ],

            data:
                new Float32Array(
                    anchors *
                    10,
                ),
        };
    }

    return outputs;
}

test(
    "defaults YuNet permanecem alinhados ao contrato aprovado",
    () => {
        assert.equal(
            YUNET_DEFAULT_SCORE_THRESHOLD,
            0.6,
        );

        assert.equal(
            YUNET_DEFAULT_NMS_THRESHOLD,
            0.3,
        );

        assert.equal(
            YUNET_DEFAULT_TOP_K,
            5000,
        );
    },
);

test(
    "preprocess converte BGR HWC para NCHW float32 sem normalizacao",
    () => {
        const result =
            preprocessBgrHwcToNchw({
                width:
                    2,

                height:
                    1,

                data:
                    Uint8Array.from([
                        10,
                        20,
                        30,

                        40,
                        50,
                        60,
                    ]),
            });

        assert.deepEqual(
            Array.from(
                result.dims,
            ),
            [
                1,
                3,
                32,
                32,
            ],
        );

        assert.equal(
            result.paddedWidth,
            32,
        );

        assert.equal(
            result.paddedHeight,
            32,
        );

        const channelSize =
            32 *
            32;

        assert.deepEqual(
            Array.from(
                result.data.slice(
                    0,
                    2,
                ),
            ),
            [
                10,
                40,
            ],
        );

        assert.deepEqual(
            Array.from(
                result.data.slice(
                    channelSize,
                    channelSize +
                        2,
                ),
            ),
            [
                20,
                50,
            ],
        );

        assert.deepEqual(
            Array.from(
                result.data.slice(
                    channelSize *
                        2,
                    (
                        channelSize *
                        2
                    ) +
                        2,
                ),
            ),
            [
                30,
                60,
            ],
        );

        assert.equal(
            result.data[
                2
            ],
            0,
        );
    },
);

test(
    "preprocess aplica padding inferior e direito para divisor 32",
    () => {
        const width =
            33;

        const height =
            35;

        const data =
            new Uint8Array(
                width *
                height *
                3,
            );

        const result =
            preprocessBgrHwcToNchw({
                data,
                width,
                height,
            });

        assert.equal(
            result.paddedWidth,
            64,
        );

        assert.equal(
            result.paddedHeight,
            64,
        );

        assert.deepEqual(
            Array.from(
                result.dims,
            ),
            [
                1,
                3,
                64,
                64,
            ],
        );
    },
);

test(
    "decode aplica score sqrt(cls vezes obj), bbox e cinco landmarks",
    () => {
        const outputs =
            createOutputSet();

        outputs.cls_8.data[0] =
            0.81;

        outputs.obj_8.data[0] =
            1;

        outputs.bbox_8.data[
            0
        ] =
            1;

        outputs.bbox_8.data[
            1
        ] =
            1;

        outputs.bbox_8.data[
            2
        ] =
            Math.log(
                2,
            );

        outputs.bbox_8.data[
            3
        ] =
            Math.log(
                2,
            );

        for (
            let landmark = 0;
            landmark < 5;
            landmark += 1
        ) {
            outputs.kps_8.data[
                landmark *
                    2
            ] =
                landmark;

            outputs.kps_8.data[
                (
                    landmark *
                    2
                ) +
                    1
            ] =
                landmark +
                0.5;
        }

        const detections =
            decodeYunetOutputs({
                outputs,
                paddedWidth:
                    32,
                paddedHeight:
                    32,
            });

        assert.equal(
            detections.length,
            1,
        );

        const face =
            detections[0];

        assert.ok(
            Math.abs(
                face.score -
                0.9
            ) <
            0.00001,
        );

        assert.ok(
            Math.abs(
                face.x -
                0
            ) <
            0.00001,
        );

        assert.ok(
            Math.abs(
                face.y -
                0
            ) <
            0.00001,
        );

        assert.ok(
            Math.abs(
                face.width -
                16
            ) <
            0.00001,
        );

        assert.ok(
            Math.abs(
                face.height -
                16
            ) <
            0.00001,
        );

        assert.equal(
            face.landmarks.length,
            5,
        );

        assert.deepEqual(
            face.landmarks[0],
            {
                x:
                    0,
                y:
                    4,
            },
        );

        assert.deepEqual(
            face.landmarks[1],
            {
                x:
                    8,
                y:
                    12,
            },
        );
    },
);

test(
    "decode respeita score threshold",
    () => {
        const outputs =
            createOutputSet();

        outputs.cls_8.data[0] =
            0.25;

        outputs.obj_8.data[0] =
            1;

        const detections =
            decodeYunetOutputs({
                outputs,
                paddedWidth:
                    32,
                paddedHeight:
                    32,
            });

        assert.equal(
            detections.length,
            0,
        );
    },
);

test(
    "NMS usa score descendente, IoU e topK de forma deterministica",
    () => {
        const detections =
            [
                {
                    x:
                        0,
                    y:
                        0,
                    width:
                        20,
                    height:
                        20,
                    score:
                        0.95,
                },
                {
                    x:
                        1,
                    y:
                        1,
                    width:
                        20,
                    height:
                        20,
                    score:
                        0.9,
                },
                {
                    x:
                        100,
                    y:
                        100,
                    width:
                        20,
                    height:
                        20,
                    score:
                        0.8,
                },
            ];

        const kept =
            applyYunetNms(
                detections,
                {
                    scoreThreshold:
                        0.6,

                    nmsThreshold:
                        0.3,

                    topK:
                        5000,
                },
            );

        assert.equal(
            kept.length,
            2,
        );

        assert.equal(
            kept[0].score,
            0.95,
        );

        assert.equal(
            kept[1].score,
            0.8,
        );

        const topOne =
            applyYunetNms(
                detections,
                {
                    scoreThreshold:
                        0.6,

                    nmsThreshold:
                        0.3,

                    topK:
                        1,
                },
            );

        assert.equal(
            topOne.length,
            1,
        );

        assert.equal(
            topOne[0].score,
            0.95,
        );
    },
);

test(
    "detector real carrega YuNet homologado e executa inferencia CPU",
    async () => {
        const detector =
            await createYunetDetector({
                modelPath,
            });

        try {
            assert.equal(
                detector.provider,
                "cpu",
            );

            assert.equal(
                detector.inputName,
                "input",
            );

            const width =
                32;

            const height =
                32;

            const detections =
                await detector.detectBgr({
                    width,
                    height,

                    data:
                        new Uint8Array(
                            width *
                            height *
                            3,
                        ),
                });

            assert.equal(
                Array.isArray(
                    detections,
                ),
                true,
            );

            for (
                const face of
                detections
            ) {
                assert.equal(
                    Number.isFinite(
                        face.score,
                    ),
                    true,
                );

                assert.equal(
                    face.landmarks.length,
                    5,
                );
            }
        }
        finally {
            const released =
                await detector.release();

            assert.equal(
                released,
                true,
            );
        }
    },
);
