import test from "node:test";
import assert from "node:assert/strict";

import {
    FaceAlignmentError,
    alignFace,
    estimateSimilarityTransform,
} from "../src/alignment/faceAlignment.mjs";

const BASE_POINTS =
    Object.freeze([
        Object.freeze({
            x:
                10,
            y:
                12,
        }),

        Object.freeze({
            x:
                30,
            y:
                11,
        }),

        Object.freeze({
            x:
                20,
            y:
                22,
        }),

        Object.freeze({
            x:
                13,
            y:
                32,
        }),

        Object.freeze({
            x:
                28,
            y:
                31,
        }),
    ]);

function transformPoints(
    points,
    {
        scale = 1,
        angle = 0,
        tx = 0,
        ty = 0,
    } = {},
) {
    const cos =
        Math.cos(
            angle,
        );

    const sin =
        Math.sin(
            angle,
        );

    return points.map(
        (
            point,
        ) => ({
            x:
                scale *
                    (
                        cos *
                            point.x -
                        sin *
                            point.y
                    ) +
                tx,

            y:
                scale *
                    (
                        sin *
                            point.x +
                        cos *
                            point.y
                    ) +
                ty,
        }),
    );
}

function expectTransform({
    scale,
    angle,
    tx,
    ty,
}) {
    const target =
        transformPoints(
            BASE_POINTS,
            {
                scale,
                angle,
                tx,
                ty,
            },
        );

    const result =
        estimateSimilarityTransform({
            sourceLandmarks:
                BASE_POINTS,

            targetLandmarks:
                target,

            maxRmsError:
                1e-6,
        });

    assert.ok(
        Math.abs(
            result.scale -
            scale,
        ) <
        1e-10,
    );

    assert.ok(
        Math.abs(
            result.rotationRadians -
            angle,
        ) <
        1e-10,
    );

    assert.ok(
        Math.abs(
            result.translation.x -
            tx,
        ) <
        1e-10,
    );

    assert.ok(
        Math.abs(
            result.translation.y -
            ty,
        ) <
        1e-10,
    );

    assert.ok(
        result.rmsError <
        1e-10,
    );

    assert.ok(
        result.maxError <
        1e-10,
    );
}

function createFrame(
    width,
    height,
    pixelFactory =
        (
            x,
            y,
        ) => [
            x +
                1,
            y +
                10,
            x +
                y +
                20,
        ],
) {
    const data =
        new Uint8Array(
            width *
            height *
            3,
        );

    for (
        let y = 0;
        y <
        height;
        y += 1
    ) {
        for (
            let x = 0;
            x <
            width;
            x += 1
        ) {
            const pixel =
                pixelFactory(
                    x,
                    y,
                );

            const offset =
                (
                    y *
                        width +
                    x
                ) *
                3;

            data[offset] =
                pixel[0];

            data[
                offset +
                1
            ] =
                pixel[1];

            data[
                offset +
                2
            ] =
                pixel[2];
        }
    }

    return data;
}

function expectCode(
    code,
    callback,
) {
    assert.throws(
        callback,
        (
            error,
        ) => {
            assert.equal(
                error instanceof
                    FaceAlignmentError,
                true,
            );

            assert.equal(
                error.code,
                code,
            );

            return true;
        },
    );
}

test(
    "similarity recupera identidade",
    () => {
        expectTransform({
            scale:
                1,

            angle:
                0,

            tx:
                0,

            ty:
                0,
        });
    },
);

test(
    "similarity recupera escala uniforme",
    () => {
        expectTransform({
            scale:
                1.25,

            angle:
                0,

            tx:
                0,

            ty:
                0,
        });
    },
);

test(
    "similarity recupera rotacao",
    () => {
        expectTransform({
            scale:
                1,

            angle:
                Math.PI /
                9,

            tx:
                0,

            ty:
                0,
        });
    },
);

test(
    "similarity recupera translacao",
    () => {
        expectTransform({
            scale:
                1,

            angle:
                0,

            tx:
                17,

            ty:
                -9,
        });
    },
);

test(
    "similarity recupera escala rotacao e translacao combinadas",
    () => {
        expectTransform({
            scale:
                1.15,

            angle:
                12 *
                Math.PI /
                180,

            tx:
                14,

            ty:
                -7,
        });
    },
);

test(
    "similarity rejeita reflexao",
    () => {
        const reflected =
            BASE_POINTS.map(
                (
                    point,
                ) => ({
                    x:
                        50 -
                        point.x,

                    y:
                        point.y,
                }),
            );

        expectCode(
            "REFLECTION_DETECTED",
            () =>
                estimateSimilarityTransform({
                    sourceLandmarks:
                        BASE_POINTS,

                    targetLandmarks:
                        reflected,

                    maxRmsError:
                        100,
                }),
        );
    },
);

test(
    "similarity rejeita residual excessivo",
    () => {
        const target =
            transformPoints(
                BASE_POINTS,
                {
                    scale:
                        1.1,

                    angle:
                        0.1,

                    tx:
                        3,

                    ty:
                        4,
                },
            );

        target[4] = {
            x:
                target[4].x +
                8,

            y:
                target[4].y -
                6,
        };

        expectCode(
            "ALIGNMENT_RESIDUAL_TOO_HIGH",
            () =>
                estimateSimilarityTransform({
                    sourceLandmarks:
                        BASE_POINTS,

                    targetLandmarks:
                        target,

                    maxRmsError:
                        0.5,
                }),
        );
    },
);

test(
    "alignFace preserva BGR e tamanho exato em identidade",
    () => {
        const width =
            4;

        const height =
            4;

        const data =
            createFrame(
                width,
                height,
                (
                    x,
                    y,
                ) => [
                    10 +
                        x,

                    60 +
                        y,

                    120 +
                        x +
                        y,
                ],
            );

        const landmarks =
            [
                {
                    x:
                        0,
                    y:
                        0,
                },

                {
                    x:
                        3,
                    y:
                        0,
                },

                {
                    x:
                        1,
                    y:
                        1,
                },

                {
                    x:
                        0,
                    y:
                        3,
                },

                {
                    x:
                        3,
                    y:
                        3,
                },
            ];

        const result =
            alignFace({
                data,
                width,
                height,

                detection: {
                    x:
                        0,

                    y:
                        0,

                    width:
                        4,

                    height:
                        4,

                    landmarks,
                },

                targetWidth:
                    4,

                targetHeight:
                    4,

                templateLandmarks:
                    landmarks,

                paddingRatio:
                    0,

                minFaceSizePx:
                    1,

                minVisibleAreaRatio:
                    1,

                maxRmsError:
                    1e-6,
            });

        assert.equal(
            result.format,
            "bgr24",
        );

        assert.equal(
            result.width,
            4,
        );

        assert.equal(
            result.height,
            4,
        );

        assert.equal(
            result.data.length,
            4 *
                4 *
                3,
        );

        assert.deepEqual(
            Array.from(
                result.data,
            ),
            Array.from(
                data,
            ),
        );
    },
);

test(
    "alignFace calcula padding e clipping na borda",
    () => {
        const data =
            createFrame(
                8,
                8,
            );

        const detection = {
            x:
                -1,

            y:
                1,

            width:
                5,

            height:
                5,

            landmarks:
                [
                    {
                        x:
                            0,
                        y:
                            2,
                    },

                    {
                        x:
                            3,
                        y:
                            2,
                    },

                    {
                        x:
                            1.5,
                        y:
                            3,
                    },

                    {
                        x:
                            0.5,
                        y:
                            5,
                    },

                    {
                        x:
                            2.5,
                        y:
                            5,
                    },
                ],
        };

        const localTemplate =
            detection.landmarks.map(
                (
                    point,
                ) => ({
                    x:
                        point.x +
                        3,

                    y:
                        point.y +
                        1,
                }),
            );

        const result =
            alignFace({
                data,

                width:
                    8,

                height:
                    8,

                detection,

                targetWidth:
                    12,

                targetHeight:
                    12,

                templateLandmarks:
                    localTemplate,

                paddingRatio:
                    0.4,

                minFaceSizePx:
                    2,

                minVisibleAreaRatio:
                    0.4,

                maxRmsError:
                    10,
            });

        assert.equal(
            result
                .diagnostics
                .requestedRoi
                .x <
                0,
            true,
        );

        assert.equal(
            result
                .diagnostics
                .clippedRoi
                .x,
            0,
        );

        assert.equal(
            result
                .diagnostics
                .visibleAreaRatio <
                1,
            true,
        );

        assert.equal(
            result.data.length,
            12 *
                12 *
                3,
        );
    },
);

test(
    "alignFace usa padding BGR zero quando a ROI ultrapassa o frame",
    () => {
        const data =
            createFrame(
                4,
                4,
                () => [
                    200,
                    150,
                    100,
                ],
            );

        const sourceLandmarks =
            [
                {
                    x:
                        0,
                    y:
                        0,
                },

                {
                    x:
                        3,
                    y:
                        0,
                },

                {
                    x:
                        1,
                    y:
                        1,
                },

                {
                    x:
                        0,
                    y:
                        3,
                },

                {
                    x:
                        3,
                    y:
                        3,
                },
            ];

        const result =
            alignFace({
                data,

                width:
                    4,

                height:
                    4,

                detection: {
                    x:
                        0,

                    y:
                        0,

                    width:
                        4,

                    height:
                        4,

                    landmarks:
                        sourceLandmarks,
                },

                targetWidth:
                    8,

                targetHeight:
                    8,

                templateLandmarks:
                    sourceLandmarks.map(
                        (
                            point,
                        ) => ({
                            x:
                                point.x +
                                2,

                            y:
                                point.y +
                                2,
                        }),
                    ),

                paddingRatio:
                    0.5,

                minFaceSizePx:
                    1,

                minVisibleAreaRatio:
                    0.2,

                maxRmsError:
                    1e-6,
            });

        assert.deepEqual(
            Array.from(
                result.data.slice(
                    0,
                    3,
                ),
            ),
            [
                0,
                0,
                0,
            ],
        );
    },
);

test(
    "alignFace aceita face parcialmente fora do frame quando area visivel e suficiente",
    () => {
        const data =
            createFrame(
                10,
                10,
            );

        const detection = {
            x:
                -2,

            y:
                2,

            width:
                8,

            height:
                6,

            landmarks:
                [
                    {
                        x:
                            0,
                        y:
                            3,
                    },

                    {
                        x:
                            4,
                        y:
                            3,
                    },

                    {
                        x:
                            2,
                        y:
                            4,
                    },

                    {
                        x:
                            0.5,
                        y:
                            6,
                    },

                    {
                        x:
                            3.5,
                        y:
                            6,
                    },
                ],
        };

        const roiX =
            Math.floor(
                detection.x,
            );

        const roiY =
            Math.floor(
                detection.y,
            );

        const template =
            detection.landmarks.map(
                (
                    point,
                ) => ({
                    x:
                        point.x -
                        roiX,

                    y:
                        point.y -
                        roiY,
                }),
            );

        const result =
            alignFace({
                data,

                width:
                    10,

                height:
                    10,

                detection,

                targetWidth:
                    8,

                targetHeight:
                    6,

                templateLandmarks:
                    template,

                paddingRatio:
                    0,

                minFaceSizePx:
                    2,

                minVisibleAreaRatio:
                    0.7,

                maxRmsError:
                    1e-6,
            });

        assert.ok(
            result
                .diagnostics
                .visibleAreaRatio >=
                0.7,
        );
    },
);

test(
    "alignFace rejeita bbox invalida",
    () => {
        const data =
            createFrame(
                4,
                4,
            );

        expectCode(
            "INVALID_BBOX",
            () =>
                alignFace({
                    data,

                    width:
                        4,

                    height:
                        4,

                    detection: {
                        x:
                            0,

                        y:
                            0,

                        width:
                            0,

                        height:
                            4,

                        landmarks:
                            BASE_POINTS,
                    },

                    targetWidth:
                        4,

                    targetHeight:
                        4,

                    templateLandmarks:
                        BASE_POINTS,

                    paddingRatio:
                        0,

                    minFaceSizePx:
                        1,

                    minVisibleAreaRatio:
                        1,

                    maxRmsError:
                        1,
                }),
        );
    },
);

test(
    "alignFace rejeita frame invalido",
    () => {
        expectCode(
            "INVALID_FRAME",
            () =>
                alignFace({
                    data:
                        new Uint8Array(
                            5,
                        ),

                    width:
                        4,

                    height:
                        4,

                    detection: {
                        x:
                            0,

                        y:
                            0,

                        width:
                            4,

                        height:
                            4,

                        landmarks:
                            BASE_POINTS,
                    },

                    targetWidth:
                        4,

                    targetHeight:
                        4,

                    templateLandmarks:
                        BASE_POINTS,

                    paddingRatio:
                        0,

                    minFaceSizePx:
                        1,

                    minVisibleAreaRatio:
                        1,

                    maxRmsError:
                        1,
                }),
        );
    },
);

test(
    "alignFace rejeita face pequena",
    () => {
        const data =
            createFrame(
                20,
                20,
            );

        expectCode(
            "FACE_TOO_SMALL",
            () =>
                alignFace({
                    data,

                    width:
                        20,

                    height:
                        20,

                    detection: {
                        x:
                            1,

                        y:
                            1,

                        width:
                            3,

                        height:
                            3,

                        landmarks:
                            BASE_POINTS,
                    },

                    targetWidth:
                        40,

                    targetHeight:
                        40,

                    templateLandmarks:
                        BASE_POINTS,

                    paddingRatio:
                        0,

                    minFaceSizePx:
                        4,

                    minVisibleAreaRatio:
                        0.1,

                    maxRmsError:
                        1,
                }),
        );
    },
);

test(
    "alignFace rejeita landmarks ausentes",
    () => {
        const data =
            createFrame(
                40,
                40,
            );

        expectCode(
            "INVALID_LANDMARK_COUNT",
            () =>
                alignFace({
                    data,

                    width:
                        40,

                    height:
                        40,

                    detection: {
                        x:
                            5,

                        y:
                            5,

                        width:
                            30,

                        height:
                            30,

                        landmarks:
                            BASE_POINTS.slice(
                                0,
                                4,
                            ),
                    },

                    targetWidth:
                        40,

                    targetHeight:
                        40,

                    templateLandmarks:
                        BASE_POINTS,

                    paddingRatio:
                        0,

                    minFaceSizePx:
                        4,

                    minVisibleAreaRatio:
                        0.1,

                    maxRmsError:
                        1,
                }),
        );
    },
);

test(
    "alignFace rejeita landmark nao finito",
    () => {
        const data =
            createFrame(
                40,
                40,
            );

        const invalid =
            BASE_POINTS.map(
                (
                    point,
                ) => ({
                    ...point,
                }),
            );

        invalid[2].x =
            Number.NaN;

        expectCode(
            "NON_FINITE_LANDMARK",
            () =>
                alignFace({
                    data,

                    width:
                        40,

                    height:
                        40,

                    detection: {
                        x:
                            5,

                        y:
                            5,

                        width:
                            30,

                        height:
                            30,

                        landmarks:
                            invalid,
                    },

                    targetWidth:
                        40,

                    targetHeight:
                        40,

                    templateLandmarks:
                        BASE_POINTS,

                    paddingRatio:
                        0,

                    minFaceSizePx:
                        4,

                    minVisibleAreaRatio:
                        0.1,

                    maxRmsError:
                        1,
                }),
        );
    },
);

test(
    "alignFace rejeita landmarks degenerados",
    () => {
        const data =
            createFrame(
                40,
                40,
            );

        const line =
            [
                0,
                1,
                2,
                3,
                4,
            ].map(
                (
                    value,
                ) => ({
                    x:
                        value,

                    y:
                        value,
                }),
            );

        expectCode(
            "DEGENERATE_LANDMARK_GEOMETRY",
            () =>
                alignFace({
                    data,

                    width:
                        40,

                    height:
                        40,

                    detection: {
                        x:
                            5,

                        y:
                            5,

                        width:
                            30,

                        height:
                            30,

                        landmarks:
                            line,
                    },

                    targetWidth:
                        40,

                    targetHeight:
                        40,

                    templateLandmarks:
                        BASE_POINTS,

                    paddingRatio:
                        0,

                    minFaceSizePx:
                        4,

                    minVisibleAreaRatio:
                        0.1,

                    maxRmsError:
                        1,
                }),
        );
    },
);

test(
    "alignFace rejeita template invalido",
    () => {
        const data =
            createFrame(
                40,
                40,
            );

        const invalidTemplate =
            BASE_POINTS.map(
                (
                    point,
                ) => ({
                    ...point,
                }),
            );

        invalidTemplate[0].x =
            100;

        expectCode(
            "INVALID_TARGET_TEMPLATE",
            () =>
                alignFace({
                    data,

                    width:
                        40,

                    height:
                        40,

                    detection: {
                        x:
                            5,

                        y:
                            5,

                        width:
                            30,

                        height:
                            30,

                        landmarks:
                            BASE_POINTS,
                    },

                    targetWidth:
                        40,

                    targetHeight:
                        40,

                    templateLandmarks:
                        invalidTemplate,

                    paddingRatio:
                        0,

                    minFaceSizePx:
                        4,

                    minVisibleAreaRatio:
                        0.1,

                    maxRmsError:
                        1,
                }),
        );
    },
);

test(
    "alignFace rejeita area visivel insuficiente",
    () => {
        const data =
            createFrame(
                10,
                10,
            );

        const detection = {
            x:
                -8,

            y:
                1,

            width:
                10,

            height:
                8,

            landmarks:
                [
                    {
                        x:
                            -1,
                        y:
                            2,
                    },

                    {
                        x:
                            1,
                        y:
                            2,
                    },

                    {
                        x:
                            0,
                        y:
                            4,
                    },

                    {
                        x:
                            -1,
                        y:
                            7,
                    },

                    {
                        x:
                            1,
                        y:
                            7,
                    },
                ],
        };

        expectCode(
            "INSUFFICIENT_VISIBLE_AREA",
            () =>
                alignFace({
                    data,

                    width:
                        10,

                    height:
                        10,

                    detection,

                    targetWidth:
                        20,

                    targetHeight:
                        20,

                    templateLandmarks:
                        BASE_POINTS.map(
                            (
                                point,
                            ) => ({
                                x:
                                    point.x /
                                    2,

                                y:
                                    point.y /
                                    2,
                            }),
                        ),

                    paddingRatio:
                        0,

                    minFaceSizePx:
                        2,

                    minVisibleAreaRatio:
                        0.5,

                    maxRmsError:
                        5,
                }),
        );
    },
);
