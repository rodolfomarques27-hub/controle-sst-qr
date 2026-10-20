const LANDMARK_COUNT = 5;
const CHANNELS = 3;
const GEOMETRY_EPSILON = 1e-9;
const COLLINEAR_RATIO_EPSILON = 1e-6;

export class FaceAlignmentError extends Error {
    constructor(code, message, details = {}) {
        super(message);
        this.name = "FaceAlignmentError";
        this.code = code;
        this.details = Object.freeze({
            ...details,
        });
    }
}

function fail(
    code,
    message,
    details,
) {
    throw new FaceAlignmentError(
        code,
        message,
        details,
    );
}

function requirePositiveSafeInteger(
    value,
    name,
    code,
) {
    if (
        !Number.isSafeInteger(
            value,
        ) ||
        value <= 0
    ) {
        fail(
            code,
            `${name} deve ser inteiro positivo.`,
        );
    }

    return value;
}

function requireFiniteNumber(
    value,
    name,
    code,
) {
    if (
        typeof value !== "number" ||
        !Number.isFinite(
            value,
        )
    ) {
        fail(
            code,
            `${name} deve ser numero finito.`,
        );
    }

    return value;
}

function requireUnitRatio(
    value,
    name,
    code,
    {
        allowZero = true,
    } = {},
) {
    requireFiniteNumber(
        value,
        name,
        code,
    );

    const minimum =
        allowZero
            ? 0
            : Number.EPSILON;

    if (
        value < minimum ||
        value > 1
    ) {
        fail(
            code,
            (
                `${name} deve estar ` +
                (
                    allowZero
                        ? "entre 0 e 1."
                        : "acima de 0 e ate 1."
                )
            ),
        );
    }

    return value;
}

function freezePoint(
    point,
) {
    return Object.freeze({
        x:
            point.x,
        y:
            point.y,
    });
}

function normalizeLandmarks(
    points,
    code,
) {
    if (
        !Array.isArray(
            points,
        ) ||
        points.length !==
            LANDMARK_COUNT
    ) {
        fail(
            code,
            (
                "landmarks devem conter exatamente " +
                `${LANDMARK_COUNT} pontos.`
            ),
        );
    }

    return Object.freeze(
        points.map(
            (
                point,
                index,
            ) => {
                const x =
                    point?.x;

                const y =
                    point?.y;

                if (
                    !Number.isFinite(
                        x,
                    ) ||
                    !Number.isFinite(
                        y,
                    )
                ) {
                    fail(
                        (
                            code ===
                            "INVALID_TARGET_TEMPLATE"
                        )
                            ? code
                            : "NON_FINITE_LANDMARK",
                        `landmark ${index} deve ter x/y finitos.`,
                    );
                }

                return freezePoint({
                    x,
                    y,
                });
            },
        ),
    );
}

function requireNonDegenerateGeometry(
    points,
    code,
) {
    let minX =
        Infinity;

    let minY =
        Infinity;

    let maxX =
        -Infinity;

    let maxY =
        -Infinity;

    for (const point of points) {
        minX =
            Math.min(
                minX,
                point.x,
            );

        minY =
            Math.min(
                minY,
                point.y,
            );

        maxX =
            Math.max(
                maxX,
                point.x,
            );

        maxY =
            Math.max(
                maxY,
                point.y,
            );
    }

    const extent =
        Math.max(
            maxX -
                minX,
            maxY -
                minY,
        );

    if (
        !Number.isFinite(
            extent,
        ) ||
        extent <=
            GEOMETRY_EPSILON
    ) {
        fail(
            code,
            "geometria de landmarks degenerada.",
        );
    }

    let best =
        null;

    for (
        let i = 0;
        i <
        points.length -
            2;
        i += 1
    ) {
        for (
            let j =
                i +
                1;
            j <
            points.length -
                1;
            j += 1
        ) {
            for (
                let k =
                    j +
                    1;
                k <
                points.length;
                k += 1
            ) {
                const a =
                    points[i];

                const b =
                    points[j];

                const c =
                    points[k];

                const cross =
                    (
                        b.x -
                        a.x
                    ) *
                    (
                        c.y -
                        a.y
                    ) -
                    (
                        b.y -
                        a.y
                    ) *
                    (
                        c.x -
                        a.x
                    );

                const magnitude =
                    Math.abs(
                        cross,
                    );

                if (
                    !best ||
                    magnitude >
                        best.magnitude
                ) {
                    best = {
                        i,
                        j,
                        k,
                        cross,
                        magnitude,
                    };
                }
            }
        }
    }

    const normalizedArea =
        best.magnitude /
        (
            extent *
            extent
        );

    if (
        !Number.isFinite(
            normalizedArea,
        ) ||
        normalizedArea <=
            COLLINEAR_RATIO_EPSILON
    ) {
        fail(
            code,
            (
                "geometria de landmarks degenerada " +
                "ou praticamente colinear."
            ),
        );
    }

    return Object.freeze({
        ...best,
        normalizedArea,
    });
}

function centroid(
    points,
) {
    let x =
        0;

    let y =
        0;

    for (const point of points) {
        x +=
            point.x;

        y +=
            point.y;
    }

    return {
        x:
            x /
            points.length,

        y:
            y /
            points.length,
    };
}

export function estimateSimilarityTransform({
    sourceLandmarks,
    targetLandmarks,
    maxRmsError,
} = {}) {
    const source =
        normalizeLandmarks(
            sourceLandmarks,
            "INVALID_LANDMARK_COUNT",
        );

    const target =
        normalizeLandmarks(
            targetLandmarks,
            "INVALID_TARGET_TEMPLATE",
        );

    const sourceGeometry =
        requireNonDegenerateGeometry(
            source,
            "DEGENERATE_LANDMARK_GEOMETRY",
        );

    requireNonDegenerateGeometry(
        target,
        "INVALID_TARGET_TEMPLATE",
    );

    const targetCrossForSourceTriangle =
        (() => {
            const a =
                target[
                    sourceGeometry.i
                ];

            const b =
                target[
                    sourceGeometry.j
                ];

            const c =
                target[
                    sourceGeometry.k
                ];

            return (
                (
                    b.x -
                    a.x
                ) *
                (
                    c.y -
                    a.y
                ) -
                (
                    b.y -
                    a.y
                ) *
                (
                    c.x -
                    a.x
                )
            );
        })();

    if (
        Math.abs(
            targetCrossForSourceTriangle,
        ) <=
        GEOMETRY_EPSILON
    ) {
        fail(
            "INVALID_TARGET_TEMPLATE",
            (
                "template e degenerado para a " +
                "correspondencia dos landmarks."
            ),
        );
    }

    if (
        Math.sign(
            sourceGeometry.cross,
        ) !==
        Math.sign(
            targetCrossForSourceTriangle,
        )
    ) {
        fail(
            "REFLECTION_DETECTED",
            (
                "correspondencia de landmarks exige " +
                "reflexao, que nao e permitida."
            ),
        );
    }

    const normalizedMaxRmsError =
        requireFiniteNumber(
            maxRmsError,
            "maxRmsError",
            "INVALID_PARAMETER",
        );

    if (
        normalizedMaxRmsError <=
        0
    ) {
        fail(
            "INVALID_PARAMETER",
            "maxRmsError deve ser maior que zero.",
        );
    }

    const sourceCentroid =
        centroid(
            source,
        );

    const targetCentroid =
        centroid(
            target,
        );

    let denominator =
        0;

    let a =
        0;

    let b =
        0;

    for (
        let index = 0;
        index <
        LANDMARK_COUNT;
        index += 1
    ) {
        const sx =
            source[index].x -
            sourceCentroid.x;

        const sy =
            source[index].y -
            sourceCentroid.y;

        const tx =
            target[index].x -
            targetCentroid.x;

        const ty =
            target[index].y -
            targetCentroid.y;

        denominator +=
            sx *
                sx +
            sy *
                sy;

        a +=
            sx *
                tx +
            sy *
                ty;

        b +=
            sx *
                ty -
            sy *
                tx;
    }

    if (
        !Number.isFinite(
            denominator,
        ) ||
        denominator <=
            GEOMETRY_EPSILON
    ) {
        fail(
            "SIMILARITY_TRANSFORM_FAILED",
            (
                "variancia dos landmarks de origem " +
                "e insuficiente."
            ),
        );
    }

    const magnitude =
        Math.hypot(
            a,
            b,
        );

    if (
        !Number.isFinite(
            magnitude,
        ) ||
        magnitude <=
            GEOMETRY_EPSILON
    ) {
        fail(
            "SIMILARITY_TRANSFORM_FAILED",
            "nao foi possivel estimar rotacao/escala.",
        );
    }

    const scale =
        magnitude /
        denominator;

    if (
        !Number.isFinite(
            scale,
        ) ||
        scale <= 0
    ) {
        fail(
            "INVALID_SCALE",
            (
                "escala estimada deve ser " +
                "finita e positiva."
            ),
        );
    }

    const cos =
        a /
        magnitude;

    const sin =
        b /
        magnitude;

    const rotationRadians =
        Math.atan2(
            sin,
            cos,
        );

    const tx =
        targetCentroid.x -
        scale *
            (
                cos *
                    sourceCentroid.x -
                sin *
                    sourceCentroid.y
            );

    const ty =
        targetCentroid.y -
        scale *
            (
                sin *
                    sourceCentroid.x +
                cos *
                    sourceCentroid.y
            );

    if (
        ![
            cos,
            sin,
            rotationRadians,
            tx,
            ty,
        ].every(
            Number.isFinite,
        )
    ) {
        fail(
            "SIMILARITY_TRANSFORM_FAILED",
            (
                "transformacao estimada contem " +
                "valor nao finito."
            ),
        );
    }

    let sumSquaredError =
        0;

    let maxError =
        0;

    for (
        let index = 0;
        index <
        LANDMARK_COUNT;
        index += 1
    ) {
        const point =
            source[index];

        const predictedX =
            scale *
                (
                    cos *
                        point.x -
                    sin *
                        point.y
                ) +
            tx;

        const predictedY =
            scale *
                (
                    sin *
                        point.x +
                    cos *
                        point.y
                ) +
            ty;

        const dx =
            predictedX -
            target[index].x;

        const dy =
            predictedY -
            target[index].y;

        const error =
            Math.hypot(
                dx,
                dy,
            );

        sumSquaredError +=
            error *
            error;

        maxError =
            Math.max(
                maxError,
                error,
            );
    }

    const rmsError =
        Math.sqrt(
            sumSquaredError /
            LANDMARK_COUNT,
        );

    if (
        !Number.isFinite(
            rmsError,
        ) ||
        !Number.isFinite(
            maxError,
        )
    ) {
        fail(
            "SIMILARITY_TRANSFORM_FAILED",
            "erro residual nao finito.",
        );
    }

    if (
        rmsError >
        normalizedMaxRmsError
    ) {
        fail(
            "ALIGNMENT_RESIDUAL_TOO_HIGH",
            (
                `rmsError=${rmsError} excede ` +
                `maxRmsError=${normalizedMaxRmsError}.`
            ),
            {
                rmsError,
                maxError,
            },
        );
    }

    return Object.freeze({
        scale,

        cos,

        sin,

        rotationRadians,

        rotationDegrees:
            rotationRadians *
            180 /
            Math.PI,

        translation:
            Object.freeze({
                x:
                    tx,
                y:
                    ty,
            }),

        matrix:
            Object.freeze([
                Object.freeze([
                    scale *
                        cos,
                    -scale *
                        sin,
                    tx,
                ]),

                Object.freeze([
                    scale *
                        sin,
                    scale *
                        cos,
                    ty,
                ]),
            ]),

        rmsError,

        maxError,
    });
}

function normalizeFrame({
    data,
    width,
    height,
}) {
    const normalizedWidth =
        requirePositiveSafeInteger(
            width,
            "width",
            "INVALID_FRAME",
        );

    const normalizedHeight =
        requirePositiveSafeInteger(
            height,
            "height",
            "INVALID_FRAME",
        );

    if (
        !(
            data instanceof
            Uint8Array
        )
    ) {
        fail(
            "INVALID_FRAME",
            "data deve ser Uint8Array/Buffer BGR24.",
        );
    }

    const expectedLength =
        normalizedWidth *
        normalizedHeight *
        CHANNELS;

    if (
        !Number.isSafeInteger(
            expectedLength,
        ) ||
        data.length !==
            expectedLength
    ) {
        fail(
            "INVALID_FRAME",
            (
                "tamanho BGR24 invalido: " +
                `esperado=${expectedLength} ` +
                `atual=${data.length}.`
            ),
        );
    }

    return {
        data,
        width:
            normalizedWidth,
        height:
            normalizedHeight,
    };
}

function normalizeDetection(
    detection,
    minFaceSizePx,
) {
    if (
        !detection ||
        typeof detection !==
            "object"
    ) {
        fail(
            "INVALID_BBOX",
            "detection deve ser objeto.",
        );
    }

    const x =
        requireFiniteNumber(
            detection.x,
            "detection.x",
            "INVALID_BBOX",
        );

    const y =
        requireFiniteNumber(
            detection.y,
            "detection.y",
            "INVALID_BBOX",
        );

    const width =
        requireFiniteNumber(
            detection.width,
            "detection.width",
            "INVALID_BBOX",
        );

    const height =
        requireFiniteNumber(
            detection.height,
            "detection.height",
            "INVALID_BBOX",
        );

    if (
        width <=
            0 ||
        height <=
            0
    ) {
        fail(
            "INVALID_BBOX",
            (
                "bbox deve possuir " +
                "width/height positivos."
            ),
        );
    }

    const normalizedMinFaceSize =
        requireFiniteNumber(
            minFaceSizePx,
            "minFaceSizePx",
            "INVALID_PARAMETER",
        );

    if (
        normalizedMinFaceSize <=
        0
    ) {
        fail(
            "INVALID_PARAMETER",
            "minFaceSizePx deve ser maior que zero.",
        );
    }

    if (
        Math.min(
            width,
            height,
        ) <
        normalizedMinFaceSize
    ) {
        fail(
            "FACE_TOO_SMALL",
            (
                "face abaixo do tamanho minimo " +
                "configurado."
            ),
            {
                width,
                height,
                minFaceSizePx:
                    normalizedMinFaceSize,
            },
        );
    }

    const landmarks =
        normalizeLandmarks(
            detection.landmarks,
            "INVALID_LANDMARK_COUNT",
        );

    requireNonDegenerateGeometry(
        landmarks,
        "DEGENERATE_LANDMARK_GEOMETRY",
    );

    return Object.freeze({
        x,
        y,
        width,
        height,
        landmarks,
    });
}

function normalizeTargetTemplate({
    targetWidth,
    targetHeight,
    templateLandmarks,
}) {
    const width =
        requirePositiveSafeInteger(
            targetWidth,
            "targetWidth",
            "INVALID_OUTPUT_SIZE",
        );

    const height =
        requirePositiveSafeInteger(
            targetHeight,
            "targetHeight",
            "INVALID_OUTPUT_SIZE",
        );

    const landmarks =
        normalizeLandmarks(
            templateLandmarks,
            "INVALID_TARGET_TEMPLATE",
        );

    for (
        let index = 0;
        index <
        landmarks.length;
        index += 1
    ) {
        const point =
            landmarks[index];

        if (
            point.x < 0 ||
            point.y < 0 ||
            point.x >
                width -
                    1 ||
            point.y >
                height -
                    1
        ) {
            fail(
                "INVALID_TARGET_TEMPLATE",
                (
                    `template landmark ${index} ` +
                    "esta fora da imagem alvo."
                ),
            );
        }
    }

    requireNonDegenerateGeometry(
        landmarks,
        "INVALID_TARGET_TEMPLATE",
    );

    return Object.freeze({
        width,
        height,
        landmarks,
    });
}

function buildRoi({
    detection,
    frameWidth,
    frameHeight,
    paddingRatio,
    minVisibleAreaRatio,
}) {
    const normalizedPaddingRatio =
        requireFiniteNumber(
            paddingRatio,
            "paddingRatio",
            "INVALID_PARAMETER",
        );

    if (
        normalizedPaddingRatio <
        0
    ) {
        fail(
            "INVALID_PARAMETER",
            "paddingRatio nao pode ser negativo.",
        );
    }

    const normalizedMinVisibleAreaRatio =
        requireUnitRatio(
            minVisibleAreaRatio,
            "minVisibleAreaRatio",
            "INVALID_PARAMETER",
            {
                allowZero:
                    false,
            },
        );

    const padX =
        detection.width *
        normalizedPaddingRatio;

    const padY =
        detection.height *
        normalizedPaddingRatio;

    const x0 =
        Math.floor(
            detection.x -
            padX,
        );

    const y0 =
        Math.floor(
            detection.y -
            padY,
        );

    const x1 =
        Math.ceil(
            detection.x +
            detection.width +
            padX,
        );

    const y1 =
        Math.ceil(
            detection.y +
            detection.height +
            padY,
        );

    const requestedWidth =
        x1 -
        x0;

    const requestedHeight =
        y1 -
        y0;

    if (
        !Number.isSafeInteger(
            requestedWidth,
        ) ||
        !Number.isSafeInteger(
            requestedHeight,
        ) ||
        requestedWidth <=
            0 ||
        requestedHeight <=
            0
    ) {
        fail(
            "INVALID_BBOX",
            "ROI expandida invalida.",
        );
    }

    const clippedX0 =
        Math.max(
            0,
            Math.min(
                frameWidth,
                x0,
            ),
        );

    const clippedY0 =
        Math.max(
            0,
            Math.min(
                frameHeight,
                y0,
            ),
        );

    const clippedX1 =
        Math.max(
            0,
            Math.min(
                frameWidth,
                x1,
            ),
        );

    const clippedY1 =
        Math.max(
            0,
            Math.min(
                frameHeight,
                y1,
            ),
        );

    const clippedWidth =
        Math.max(
            0,
            clippedX1 -
                clippedX0,
        );

    const clippedHeight =
        Math.max(
            0,
            clippedY1 -
                clippedY0,
        );

    const requestedArea =
        requestedWidth *
        requestedHeight;

    const clippedArea =
        clippedWidth *
        clippedHeight;

    if (
        clippedArea <=
        0
    ) {
        fail(
            "FACE_OUTSIDE_FRAME",
            (
                "ROI da face nao " +
                "intersecta o frame."
            ),
        );
    }

    const visibleAreaRatio =
        clippedArea /
        requestedArea;

    if (
        visibleAreaRatio <
        normalizedMinVisibleAreaRatio
    ) {
        fail(
            "INSUFFICIENT_VISIBLE_AREA",
            (
                "area visivel abaixo do " +
                "minimo configurado."
            ),
            {
                visibleAreaRatio,

                minVisibleAreaRatio:
                    normalizedMinVisibleAreaRatio,
            },
        );
    }

    return Object.freeze({
        requested:
            Object.freeze({
                x:
                    x0,

                y:
                    y0,

                width:
                    requestedWidth,

                height:
                    requestedHeight,
            }),

        clipped:
            Object.freeze({
                x:
                    clippedX0,

                y:
                    clippedY0,

                width:
                    clippedWidth,

                height:
                    clippedHeight,
            }),

        visibleAreaRatio,
    });
}

function getVirtualCropChannel({
    data,
    frameWidth,
    frameHeight,
    roi,
    localX,
    localY,
    channel,
}) {
    if (
        localX < 0 ||
        localY < 0 ||
        localX >=
            roi.width ||
        localY >=
            roi.height
    ) {
        return 0;
    }

    const frameX =
        roi.x +
        localX;

    const frameY =
        roi.y +
        localY;

    if (
        frameX < 0 ||
        frameY < 0 ||
        frameX >=
            frameWidth ||
        frameY >=
            frameHeight
    ) {
        return 0;
    }

    return data[
        (
            frameY *
                frameWidth +
            frameX
        ) *
            CHANNELS +
        channel
    ];
}

function sampleVirtualCropBilinear({
    data,
    frameWidth,
    frameHeight,
    roi,
    x,
    y,
    channel,
}) {
    const x0 =
        Math.floor(
            x,
        );

    const y0 =
        Math.floor(
            y,
        );

    const x1 =
        x0 +
        1;

    const y1 =
        y0 +
        1;

    const wx =
        x -
        x0;

    const wy =
        y -
        y0;

    const p00 =
        getVirtualCropChannel({
            data,
            frameWidth,
            frameHeight,
            roi,
            localX:
                x0,
            localY:
                y0,
            channel,
        });

    const p10 =
        getVirtualCropChannel({
            data,
            frameWidth,
            frameHeight,
            roi,
            localX:
                x1,
            localY:
                y0,
            channel,
        });

    const p01 =
        getVirtualCropChannel({
            data,
            frameWidth,
            frameHeight,
            roi,
            localX:
                x0,
            localY:
                y1,
            channel,
        });

    const p11 =
        getVirtualCropChannel({
            data,
            frameWidth,
            frameHeight,
            roi,
            localX:
                x1,
            localY:
                y1,
            channel,
        });

    const top =
        p00 +
        (
            p10 -
            p00
        ) *
        wx;

    const bottom =
        p01 +
        (
            p11 -
            p01
        ) *
        wx;

    return Math.max(
        0,
        Math.min(
            255,
            Math.round(
                top +
                (
                    bottom -
                    top
                ) *
                wy,
            ),
        ),
    );
}

function warpAlignedFace({
    frame,
    roi,
    transform,
    targetWidth,
    targetHeight,
}) {
    const outputLength =
        targetWidth *
        targetHeight *
        CHANNELS;

    if (
        !Number.isSafeInteger(
            outputLength,
        )
    ) {
        fail(
            "INVALID_OUTPUT_SIZE",
            (
                "buffer alvo excede " +
                "limite de inteiro seguro."
            ),
        );
    }

    const output =
        new Uint8Array(
            outputLength,
        );

    const {
        scale,
        cos,
        sin,
        translation,
    } =
        transform;

    for (
        let targetY = 0;
        targetY <
        targetHeight;
        targetY += 1
    ) {
        for (
            let targetX = 0;
            targetX <
            targetWidth;
            targetX += 1
        ) {
            const dx =
                targetX -
                translation.x;

            const dy =
                targetY -
                translation.y;

            const sourceX =
                (
                    cos *
                        dx +
                    sin *
                        dy
                ) /
                scale;

            const sourceY =
                (
                    -sin *
                        dx +
                    cos *
                        dy
                ) /
                scale;

            const destination =
                (
                    targetY *
                        targetWidth +
                    targetX
                ) *
                CHANNELS;

            for (
                let channel = 0;
                channel <
                CHANNELS;
                channel += 1
            ) {
                output[
                    destination +
                    channel
                ] =
                    sampleVirtualCropBilinear({
                        data:
                            frame.data,

                        frameWidth:
                            frame.width,

                        frameHeight:
                            frame.height,

                        roi,

                        x:
                            sourceX,

                        y:
                            sourceY,

                        channel,
                    });
            }
        }
    }

    return output;
}

export function alignFace({
    data,
    width,
    height,
    detection,
    targetWidth,
    targetHeight,
    templateLandmarks,
    paddingRatio,
    minFaceSizePx,
    minVisibleAreaRatio,
    maxRmsError,
} = {}) {
    const frame =
        normalizeFrame({
            data,
            width,
            height,
        });

    const normalizedDetection =
        normalizeDetection(
            detection,
            minFaceSizePx,
        );

    const target =
        normalizeTargetTemplate({
            targetWidth,
            targetHeight,
            templateLandmarks,
        });

    const roi =
        buildRoi({
            detection:
                normalizedDetection,

            frameWidth:
                frame.width,

            frameHeight:
                frame.height,

            paddingRatio,

            minVisibleAreaRatio,
        });

    const localLandmarks =
        Object.freeze(
            normalizedDetection.landmarks.map(
                (
                    point,
                ) =>
                    freezePoint({
                        x:
                            point.x -
                            roi.requested.x,

                        y:
                            point.y -
                            roi.requested.y,
                    }),
            ),
        );

    const transform =
        estimateSimilarityTransform({
            sourceLandmarks:
                localLandmarks,

            targetLandmarks:
                target.landmarks,

            maxRmsError,
        });

    const alignedData =
        warpAlignedFace({
            frame,

            roi:
                roi.requested,

            transform,

            targetWidth:
                target.width,

            targetHeight:
                target.height,
        });

    const diagnostics =
        Object.freeze({
            scale:
                transform.scale,

            rotationRadians:
                transform.rotationRadians,

            rotationDegrees:
                transform.rotationDegrees,

            translation:
                transform.translation,

            rmsError:
                transform.rmsError,

            maxError:
                transform.maxError,

            visibleAreaRatio:
                roi.visibleAreaRatio,

            requestedRoi:
                roi.requested,

            clippedRoi:
                roi.clipped,
        });

    return Object.freeze({
        data:
            alignedData,

        width:
            target.width,

        height:
            target.height,

        format:
            "bgr24",

        transform,

        diagnostics,
    });
}
