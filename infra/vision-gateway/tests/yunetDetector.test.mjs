import test from "node:test";
import assert from "node:assert/strict";
import {
    fileURLToPath,
} from "node:url";

import {
    YUNET_DEFAULT_NMS_THRESHOLD,
    YUNET_DEFAULT_SCORE_THRESHOLD,
    YUNET_DEFAULT_TOP_K,
    YUNET_MAX_DETECTION_HEIGHT,
    YUNET_MAX_DETECTION_WIDTH,
    applyYunetNms,
    createYunetDetector,
    decodeYunetOutputs,
    fitYunetDetectionDimensions,
    preprocessBgrHwcToNchw,
    remapYunetDetectionsToSource,
    resizeBgrForYunetDetection,
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
            0.7,
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
    "P31 detector fit preserva envelope 640x360 sem upscale",
    () => {
        assert.equal(
            YUNET_MAX_DETECTION_WIDTH,
            640,
        );

        assert.equal(
            YUNET_MAX_DETECTION_HEIGHT,
            360,
        );

        const cases =
            [
                [
                    1920,
                    1080,
                    640,
                    360,
                    true,
                ],
                [
                    1280,
                    720,
                    640,
                    360,
                    true,
                ],
                [
                    1280,
                    960,
                    480,
                    360,
                    true,
                ],
                [
                    640,
                    480,
                    480,
                    360,
                    true,
                ],
                [
                    640,
                    360,
                    640,
                    360,
                    false,
                ],
                [
                    320,
                    240,
                    320,
                    240,
                    false,
                ],
            ];

        for (
            const [
                width,
                height,
                expectedWidth,
                expectedHeight,
                expectedResized,
            ] of
            cases
        ) {
            const fit =
                fitYunetDetectionDimensions({
                    width,
                    height,
                });

            assert.equal(
                fit.detectionWidth,
                expectedWidth,
            );

            assert.equal(
                fit.detectionHeight,
                expectedHeight,
            );

            assert.equal(
                fit.resized,
                expectedResized,
            );

            assert.ok(
                fit.detectionWidth <=
                    width,
            );

            assert.ok(
                fit.detectionHeight <=
                    height,
            );
        }
    },
);

test(
    "P31 resize BGR nearest-neighbor e deterministico",
    () => {
        const width =
            640;

        const height =
            480;

        const data =
            new Uint8Array(
                width *
                height *
                3,
            );

        for (
            let y = 0;
            y < height;
            y += 1
        ) {
            for (
                let x = 0;
                x < width;
                x += 1
            ) {
                const offset =
                    (
                        y *
                        width +
                        x
                    ) *
                    3;

                data[
                    offset
                ] =
                    x %
                    251;

                data[
                    offset +
                        1
                ] =
                    y %
                    251;

                data[
                    offset +
                        2
                ] =
                    (
                        x +
                        y
                    ) %
                    251;
            }
        }

        const resized =
            resizeBgrForYunetDetection({
                data,
                width,
                height,
            });

        assert.equal(
            resized.detectionWidth,
            480,
        );

        assert.equal(
            resized.detectionHeight,
            360,
        );

        assert.equal(
            resized.resized,
            true,
        );

        assert.notEqual(
            resized.data,
            data,
        );

        const x =
            479;

        const y =
            359;

        const sourceX =
            Math.floor(
                x *
                width /
                resized.detectionWidth,
            );

        const sourceY =
            Math.floor(
                y *
                height /
                resized.detectionHeight,
            );

        const sourceOffset =
            (
                sourceY *
                width +
                sourceX
            ) *
                3;

        const targetOffset =
            (
                y *
                resized.detectionWidth +
                x
            ) *
                3;

        assert.deepEqual(
            Array.from(
                resized.data.slice(
                    targetOffset,
                    targetOffset +
                        3,
                ),
            ),
            Array.from(
                data.slice(
                    sourceOffset,
                    sourceOffset +
                        3,
                ),
            ),
        );
    },
);

test(
    "P31 frame dentro do limite nao e copiado nem ampliado",
    () => {
        for (
            const [
                width,
                height,
            ] of
            [
                [
                    640,
                    360,
                ],
                [
                    320,
                    240,
                ],
            ]
        ) {
            const data =
                new Uint8Array(
                    width *
                    height *
                    3,
                );

            const fitted =
                resizeBgrForYunetDetection({
                    data,
                    width,
                    height,
                });

            assert.equal(
                fitted.resized,
                false,
            );

            assert.equal(
                fitted.data,
                data,
            );

            assert.equal(
                fitted.detectionWidth,
                width,
            );

            assert.equal(
                fitted.detectionHeight,
                height,
            );
        }
    },
);

test(
    "P31 remap restaura bbox e 5 landmarks e preserva metadados",
    () => {
        const original =
            {
                x:
                    10,
                y:
                    20,
                width:
                    100,
                height:
                    50,

                score:
                    0.903,

                stride:
                    16,

                anchorIndex:
                    123,

                diagnosticTag:
                    "preserved",

                landmarks:
                    [
                        {
                            x:
                                20,
                            y:
                                30,
                        },
                        {
                            x:
                                40,
                            y:
                                30,
                        },
                        {
                            x:
                                30,
                            y:
                                40,
                        },
                        {
                            x:
                                22,
                            y:
                                55,
                        },
                        {
                            x:
                                38,
                            y:
                                55,
                        },
                    ],
            };

        const [
            mapped,
        ] =
            remapYunetDetectionsToSource({
                detections:
                    [
                        original,
                    ],

                sourceWidth:
                    1920,

                sourceHeight:
                    1080,

                detectionWidth:
                    640,

                detectionHeight:
                    360,
            });

        assert.equal(
            mapped.x,
            30,
        );

        assert.equal(
            mapped.y,
            60,
        );

        assert.equal(
            mapped.width,
            300,
        );

        assert.equal(
            mapped.height,
            150,
        );

        assert.deepEqual(
            mapped.landmarks,
            [
                {
                    x:
                        60,
                    y:
                        90,
                },
                {
                    x:
                        120,
                    y:
                        90,
                },
                {
                    x:
                        90,
                    y:
                        120,
                },
                {
                    x:
                        66,
                    y:
                        165,
                },
                {
                    x:
                        114,
                    y:
                        165,
                },
            ],
        );

        assert.equal(
            mapped.score,
            0.903,
        );

        assert.equal(
            mapped.stride,
            16,
        );

        assert.equal(
            mapped.anchorIndex,
            123,
        );

        assert.equal(
            mapped.diagnosticTag,
            "preserved",
        );
    },
);

test(
    "P31 remap usa fatores X e Y efetivos apos arredondamento",
    () => {
        const fit =
            fitYunetDetectionDimensions({
                width:
                    1080,
                height:
                    1920,
            });

        assert.equal(
            fit.detectionWidth,
            203,
        );

        assert.equal(
            fit.detectionHeight,
            360,
        );

        const x =
            540;

        const y =
            960;

        const reducedX =
            x *
            fit.resizeScaleX;

        const reducedY =
            y *
            fit.resizeScaleY;

        const [
            mapped,
        ] =
            remapYunetDetectionsToSource({
                detections:
                    [
                        {
                            x:
                                reducedX,
                            y:
                                reducedY,

                            width:
                                10 *
                                fit.resizeScaleX,

                            height:
                                20 *
                                fit.resizeScaleY,

                            score:
                                0.91,

                            stride:
                                8,

                            anchorIndex:
                                7,

                            landmarks:
                                Array.from(
                                    {
                                        length:
                                            5,
                                    },
                                    () => ({
                                        x:
                                            reducedX,
                                        y:
                                            reducedY,
                                    }),
                                ),
                        },
                    ],

                sourceWidth:
                    fit.sourceWidth,

                sourceHeight:
                    fit.sourceHeight,

                detectionWidth:
                    fit.detectionWidth,

                detectionHeight:
                    fit.detectionHeight,
            });

        assert.ok(
            Math.abs(
                mapped.x -
                x
            ) <
                1e-9,
        );

        assert.ok(
            Math.abs(
                mapped.y -
                y
            ) <
                1e-9,
        );

        assert.ok(
            Math.abs(
                mapped.width -
                10
            ) <
                1e-9,
        );

        assert.ok(
            Math.abs(
                mapped.height -
                20
            ) <
                1e-9,
        );
    },
);

test(
    "P21 score 0.70 preserva igualdade no decoder e usa corte estrito no NMS",
    () => {
        assert.equal(
            YUNET_DEFAULT_SCORE_THRESHOLD,
            0.7,
        );

        /*
         * Decoder contract:
         * score igual ao threshold nao e rejeitado,
         * porque o decoder rejeita somente LT.
         */
        const decoderSource =
            decodeYunetOutputs.toString();

        assert.match(
            decoderSource,
            /score\s*<\s*normalizedScoreThreshold/,
        );

        assert.doesNotMatch(
            decoderSource,
            /score\s*<=\s*normalizedScoreThreshold/,
        );

        const detections =
            [
                {
                    x:
                        0,
                    y:
                        0,
                    width:
                        100,
                    height:
                        100,
                    score:
                        0.699999,
                },
                {
                    x:
                        200,
                    y:
                        0,
                    width:
                        100,
                    height:
                        100,
                    score:
                        0.7,
                },
                {
                    x:
                        400,
                    y:
                        0,
                    width:
                        100,
                    height:
                        100,
                    score:
                        0.700001,
                },
                {
                    x:
                        600,
                    y:
                        0,
                    width:
                        100,
                    height:
                        100,
                    score:
                        0.95,
                },
            ];

        const kept =
            applyYunetNms(
                detections,
                {
                    scoreThreshold:
                        0.7,

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
            0.700001,
        );

        assert.equal(
            kept.some(
                (item) =>
                    item.score ===
                    0.7,
            ),
            false,
        );

        assert.equal(
            kept.some(
                (item) =>
                    item.score <
                    0.7,
            ),
            false,
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
