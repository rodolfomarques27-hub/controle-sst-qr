import {
    createCpuFloat32Tensor,
    createCpuInferenceSession,
} from "../inference/onnxRuntimeAdapter.mjs";

export const YUNET_DIVISOR =
    32;

export const YUNET_STRIDES =
    Object.freeze([
        8,
        16,
        32,
    ]);

export const YUNET_DEFAULT_SCORE_THRESHOLD =
    0.7;

export const YUNET_DEFAULT_NMS_THRESHOLD =
    0.3;

export const YUNET_DEFAULT_TOP_K =
    5000;

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

function requireUnitThreshold(
    value,
    name,
) {
    if (
        typeof value !== "number" ||
        !Number.isFinite(
            value,
        ) ||
        value < 0 ||
        value > 1
    ) {
        throw new TypeError(
            `${name} deve estar entre 0 e 1.`,
        );
    }

    return value;
}

function requireTopK(
    value,
) {
    if (
        !Number.isSafeInteger(
            value,
        ) ||
        value <= 0
    ) {
        throw new TypeError(
            "topK deve ser inteiro positivo.",
        );
    }

    return value;
}

function padToDivisor(
    value,
    divisor =
        YUNET_DIVISOR,
) {
    return (
        Math.floor(
            (
                value -
                1
            ) /
            divisor,
        ) +
        1
    ) *
        divisor;
}

function requireBgrBytes(
    data,
    width,
    height,
) {
    if (
        !(data instanceof Uint8Array)
    ) {
        throw new TypeError(
            "data deve ser Uint8Array/Buffer BGR HWC.",
        );
    }

    const expectedLength =
        width *
        height *
        3;

    if (
        data.length !==
        expectedLength
    ) {
        throw new RangeError(
            (
                "tamanho BGR diverge: " +
                `esperado=${expectedLength} atual=${data.length}`
            ),
        );
    }

    return data;
}

function clampUnit(
    value,
) {
    if (
        !Number.isFinite(
            value,
        )
    ) {
        throw new TypeError(
            "output YuNet contem valor nao finito.",
        );
    }

    return Math.min(
        1,
        Math.max(
            0,
            value,
        ),
    );
}

function requireOutputTensor({
    outputs,
    name,
    anchors,
    channels,
}) {
    const tensor =
        outputs?.[
            name
        ];

    if (
        !tensor ||
        !tensor.data ||
        !tensor.dims
    ) {
        throw new Error(
            `output YuNet ausente ou invalido: ${name}`,
        );
    }

    const dims =
        Array.from(
            tensor.dims,
            Number,
        );

    const expectedDims =
        [
            1,
            anchors,
            channels,
        ];

    if (
        dims.length !==
            expectedDims.length ||
        dims.some(
            (
                value,
                index,
            ) =>
                value !==
                expectedDims[index],
        )
    ) {
        throw new Error(
            (
                `shape inesperado em ${name}: ` +
                `${dims.join("x")} esperado=${expectedDims.join("x")}`
            ),
        );
    }

    const expectedLength =
        anchors *
        channels;

    if (
        tensor.data.length !==
        expectedLength
    ) {
        throw new Error(
            (
                `dados inesperados em ${name}: ` +
                `esperado=${expectedLength} atual=${tensor.data.length}`
            ),
        );
    }

    return tensor.data;
}

function toIntRect(
    detection,
) {
    return {
        x:
            Math.trunc(
                detection.x,
            ),

        y:
            Math.trunc(
                detection.y,
            ),

        width:
            Math.trunc(
                detection.width,
            ),

        height:
            Math.trunc(
                detection.height,
            ),
    };
}

function intersectionOverUnion(
    left,
    right,
) {
    const a =
        toIntRect(
            left,
        );

    const b =
        toIntRect(
            right,
        );

    const intersectionWidth =
        Math.max(
            0,
            Math.min(
                a.x +
                    a.width,
                b.x +
                    b.width,
            ) -
                Math.max(
                    a.x,
                    b.x,
                ),
        );

    const intersectionHeight =
        Math.max(
            0,
            Math.min(
                a.y +
                    a.height,
                b.y +
                    b.height,
            ) -
                Math.max(
                    a.y,
                    b.y,
                ),
        );

    const intersectionArea =
        intersectionWidth *
        intersectionHeight;

    const leftArea =
        Math.max(
            0,
            a.width,
        ) *
        Math.max(
            0,
            a.height,
        );

    const rightArea =
        Math.max(
            0,
            b.width,
        ) *
        Math.max(
            0,
            b.height,
        );

    const unionArea =
        leftArea +
        rightArea -
        intersectionArea;

    if (
        unionArea <= 0
    ) {
        return 0;
    }

    return (
        intersectionArea /
        unionArea
    );
}

export const YUNET_MAX_DETECTION_WIDTH =
    640;

export const YUNET_MAX_DETECTION_HEIGHT =
    360;

export function fitYunetDetectionDimensions({
    width,
    height,
} = {}) {
    const sourceWidth =
        requirePositiveInteger(
            width,
            "width",
        );

    const sourceHeight =
        requirePositiveInteger(
            height,
            "height",
        );

    const scale =
        Math.min(
            1,
            YUNET_MAX_DETECTION_WIDTH /
                sourceWidth,
            YUNET_MAX_DETECTION_HEIGHT /
                sourceHeight,
        );

    const detectionWidth =
        Math.max(
            1,
            Math.round(
                sourceWidth *
                scale,
            ),
        );

    const detectionHeight =
        Math.max(
            1,
            Math.round(
                sourceHeight *
                scale,
            ),
        );

    return Object.freeze({
        sourceWidth,
        sourceHeight,

        detectionWidth,
        detectionHeight,

        resized:
            detectionWidth !==
                sourceWidth ||
            detectionHeight !==
                sourceHeight,

        resizeScaleX:
            detectionWidth /
            sourceWidth,

        resizeScaleY:
            detectionHeight /
            sourceHeight,

        inverseScaleX:
            sourceWidth /
            detectionWidth,

        inverseScaleY:
            sourceHeight /
            detectionHeight,
    });
}

export function resizeBgrForYunetDetection({
    data,
    width,
    height,
} = {}) {
    const fit =
        fitYunetDetectionDimensions({
            width,
            height,
        });

    const bytes =
        requireBgrBytes(
            data,
            fit.sourceWidth,
            fit.sourceHeight,
        );

    /*
     * No upscale and no copy when already
     * inside the detector envelope.
     */
    if (!fit.resized) {
        return Object.freeze({
            data:
                bytes,

            ...fit,
        });
    }

    /*
     * Deterministic nearest-neighbor.
     *
     * Same interpolation family used by the
     * historical 640x360 real-camera proof.
     */
    const resizedData =
        new Uint8Array(
            fit.detectionWidth *
            fit.detectionHeight *
            3,
        );

    for (
        let y = 0;
        y <
        fit.detectionHeight;
        y += 1
    ) {
        const sourceY =
            Math.min(
                fit.sourceHeight -
                    1,

                Math.floor(
                    y *
                    fit.sourceHeight /
                    fit.detectionHeight,
                ),
            );

        for (
            let x = 0;
            x <
            fit.detectionWidth;
            x += 1
        ) {
            const sourceX =
                Math.min(
                    fit.sourceWidth -
                        1,

                    Math.floor(
                        x *
                        fit.sourceWidth /
                        fit.detectionWidth,
                    ),
                );

            const sourceOffset =
                (
                    sourceY *
                    fit.sourceWidth +
                    sourceX
                ) *
                3;

            const destinationOffset =
                (
                    y *
                    fit.detectionWidth +
                    x
                ) *
                3;

            resizedData[
                destinationOffset
            ] =
                bytes[
                    sourceOffset
                ];

            resizedData[
                destinationOffset +
                    1
            ] =
                bytes[
                    sourceOffset +
                        1
                ];

            resizedData[
                destinationOffset +
                    2
            ] =
                bytes[
                    sourceOffset +
                        2
                ];
        }
    }

    return Object.freeze({
        data:
            resizedData,

        ...fit,
    });
}

export function remapYunetDetectionsToSource({
    detections,
    sourceWidth,
    sourceHeight,
    detectionWidth,
    detectionHeight,
} = {}) {
    if (
        !Array.isArray(
            detections,
        )
    ) {
        throw new TypeError(
            "detections deve ser array.",
        );
    }

    const normalizedSourceWidth =
        requirePositiveInteger(
            sourceWidth,
            "sourceWidth",
        );

    const normalizedSourceHeight =
        requirePositiveInteger(
            sourceHeight,
            "sourceHeight",
        );

    const normalizedDetectionWidth =
        requirePositiveInteger(
            detectionWidth,
            "detectionWidth",
        );

    const normalizedDetectionHeight =
        requirePositiveInteger(
            detectionHeight,
            "detectionHeight",
        );

    const inverseScaleX =
        normalizedSourceWidth /
        normalizedDetectionWidth;

    const inverseScaleY =
        normalizedSourceHeight /
        normalizedDetectionHeight;

    return Object.freeze(
        detections.map(
            (
                detection,
            ) => {
                if (
                    !detection ||
                    !Array.isArray(
                        detection.landmarks,
                    ) ||
                    detection.landmarks.length !==
                        5
                ) {
                    throw new TypeError(
                        "deteccao YuNet deve conter 5 landmarks.",
                    );
                }

                return Object.freeze({
                    ...detection,

                    x:
                        detection.x *
                        inverseScaleX,

                    y:
                        detection.y *
                        inverseScaleY,

                    width:
                        detection.width *
                        inverseScaleX,

                    height:
                        detection.height *
                        inverseScaleY,

                    landmarks:
                        Object.freeze(
                            detection
                                .landmarks
                                .map(
                                    (
                                        point,
                                    ) =>
                                        Object.freeze({
                                            x:
                                                point.x *
                                                inverseScaleX,

                                            y:
                                                point.y *
                                                inverseScaleY,
                                        }),
                                ),
                        ),
                });
            },
        ),
    );
}

export function preprocessBgrHwcToNchw({
    data,
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

    const bytes =
        requireBgrBytes(
            data,
            normalizedWidth,
            normalizedHeight,
        );

    const paddedWidth =
        padToDivisor(
            normalizedWidth,
        );

    const paddedHeight =
        padToDivisor(
            normalizedHeight,
        );

    const channelSize =
        paddedWidth *
        paddedHeight;

    const tensorData =
        new Float32Array(
            channelSize *
            3,
        );

    for (
        let y = 0;
        y <
        normalizedHeight;
        y += 1
    ) {
        for (
            let x = 0;
            x <
            normalizedWidth;
            x += 1
        ) {
            const source =
                (
                    y *
                    normalizedWidth +
                    x
                ) *
                3;

            const destination =
                y *
                paddedWidth +
                x;

            tensorData[
                destination
            ] =
                bytes[
                    source
                ];

            tensorData[
                channelSize +
                    destination
            ] =
                bytes[
                    source +
                        1
                ];

            tensorData[
                (
                    channelSize *
                    2
                ) +
                    destination
            ] =
                bytes[
                    source +
                        2
                ];
        }
    }

    return Object.freeze({
        data:
            tensorData,

        dims:
            Object.freeze([
                1,
                3,
                paddedHeight,
                paddedWidth,
            ]),

        width:
            normalizedWidth,

        height:
            normalizedHeight,

        paddedWidth,
        paddedHeight,
    });
}

export function applyYunetNms(
    detections,
    {
        scoreThreshold =
            YUNET_DEFAULT_SCORE_THRESHOLD,

        nmsThreshold =
            YUNET_DEFAULT_NMS_THRESHOLD,

        topK =
            YUNET_DEFAULT_TOP_K,
    } = {},
) {
    const normalizedScoreThreshold =
        requireUnitThreshold(
            scoreThreshold,
            "scoreThreshold",
        );

    const normalizedNmsThreshold =
        requireUnitThreshold(
            nmsThreshold,
            "nmsThreshold",
        );

    const normalizedTopK =
        requireTopK(
            topK,
        );

    if (
        !Array.isArray(
            detections,
        )
    ) {
        throw new TypeError(
            "detections deve ser array.",
        );
    }

    const ranked =
        detections
            .map(
                (
                    detection,
                    order,
                ) => ({
                    detection,
                    order,
                }),
            )
            .filter(
                (
                    item,
                ) =>
                    item.detection.score >
                    normalizedScoreThreshold,
            )
            .sort(
                (
                    left,
                    right,
                ) =>
                    (
                        right.detection.score -
                        left.detection.score
                    ) ||
                    (
                        left.order -
                        right.order
                    ),
            )
            .slice(
                0,
                normalizedTopK,
            );

    const kept =
        [];

    for (
        const candidate of
        ranked
    ) {
        let keep =
            true;

        for (
            const selected of
            kept
        ) {
            const overlap =
                intersectionOverUnion(
                    candidate.detection,
                    selected.detection,
                );

            if (
                overlap >
                normalizedNmsThreshold
            ) {
                keep =
                    false;

                break;
            }
        }

        if (keep) {
            kept.push(
                candidate,
            );
        }
    }

    return kept.map(
        (
            item,
        ) =>
            item.detection,
    );
}

export function decodeYunetOutputs({
    outputs,
    paddedWidth,
    paddedHeight,
    scoreThreshold =
        YUNET_DEFAULT_SCORE_THRESHOLD,
    nmsThreshold =
        YUNET_DEFAULT_NMS_THRESHOLD,
    topK =
        YUNET_DEFAULT_TOP_K,
} = {}) {
    const width =
        requirePositiveInteger(
            paddedWidth,
            "paddedWidth",
        );

    const height =
        requirePositiveInteger(
            paddedHeight,
            "paddedHeight",
        );

    if (
        width %
            YUNET_DIVISOR !==
            0 ||
        height %
            YUNET_DIVISOR !==
            0
    ) {
        throw new RangeError(
            "dimensoes YuNet devem ser multiplas de 32.",
        );
    }

    const normalizedScoreThreshold =
        requireUnitThreshold(
            scoreThreshold,
            "scoreThreshold",
        );

    requireUnitThreshold(
        nmsThreshold,
        "nmsThreshold",
    );

    requireTopK(
        topK,
    );

    const faces =
        [];

    for (
        const stride of
        YUNET_STRIDES
    ) {
        const cols =
            width /
            stride;

        const rows =
            height /
            stride;

        const anchors =
            rows *
            cols;

        const cls =
            requireOutputTensor({
                outputs,
                name:
                    `cls_${stride}`,
                anchors,
                channels:
                    1,
            });

        const obj =
            requireOutputTensor({
                outputs,
                name:
                    `obj_${stride}`,
                anchors,
                channels:
                    1,
            });

        const bbox =
            requireOutputTensor({
                outputs,
                name:
                    `bbox_${stride}`,
                anchors,
                channels:
                    4,
            });

        const kps =
            requireOutputTensor({
                outputs,
                name:
                    `kps_${stride}`,
                anchors,
                channels:
                    10,
            });

        for (
            let row = 0;
            row < rows;
            row += 1
        ) {
            for (
                let col = 0;
                col < cols;
                col += 1
            ) {
                const index =
                    row *
                        cols +
                    col;

                const clsScore =
                    clampUnit(
                        cls[
                            index
                        ],
                    );

                const objScore =
                    clampUnit(
                        obj[
                            index
                        ],
                    );

                const score =
                    Math.sqrt(
                        clsScore *
                        objScore,
                    );

                if (
                    score <
                    normalizedScoreThreshold
                ) {
                    continue;
                }

                const bboxOffset =
                    index *
                    4;

                const centerX =
                    (
                        col +
                        bbox[
                            bboxOffset
                        ]
                    ) *
                    stride;

                const centerY =
                    (
                        row +
                        bbox[
                            bboxOffset +
                                1
                        ]
                    ) *
                    stride;

                const boxWidth =
                    Math.exp(
                        bbox[
                            bboxOffset +
                                2
                        ],
                    ) *
                    stride;

                const boxHeight =
                    Math.exp(
                        bbox[
                            bboxOffset +
                                3
                        ],
                    ) *
                    stride;

                const landmarks =
                    [];

                const kpsOffset =
                    index *
                    10;

                for (
                    let landmark = 0;
                    landmark < 5;
                    landmark += 1
                ) {
                    landmarks.push(
                        Object.freeze({
                            x:
                                (
                                    kps[
                                        kpsOffset +
                                            (
                                                landmark *
                                                2
                                            )
                                    ] +
                                    col
                                ) *
                                stride,

                            y:
                                (
                                    kps[
                                        kpsOffset +
                                            (
                                                landmark *
                                                2
                                            ) +
                                            1
                                    ] +
                                    row
                                ) *
                                stride,
                        }),
                    );
                }

                faces.push(
                    Object.freeze({
                        x:
                            centerX -
                            (
                                boxWidth /
                                2
                            ),

                        y:
                            centerY -
                            (
                                boxHeight /
                                2
                            ),

                        width:
                            boxWidth,

                        height:
                            boxHeight,

                        landmarks:
                            Object.freeze(
                                landmarks,
                            ),

                        score,
                        stride,
                        anchorIndex:
                            index,
                    }),
                );
            }
        }
    }

    /*
     * O OpenCV retorna diretamente quando existe 0 ou 1 face.
     * A chamada a NMSBoxes ocorre somente quando ha mais de uma.
     */
    if (
        faces.length <= 1
    ) {
        return faces;
    }

    return applyYunetNms(
        faces,
        {
            scoreThreshold:
                normalizedScoreThreshold,

            nmsThreshold,

            topK,
        },
    );
}

export async function createYunetDetector({
    modelPath,
    scoreThreshold =
        YUNET_DEFAULT_SCORE_THRESHOLD,
    nmsThreshold =
        YUNET_DEFAULT_NMS_THRESHOLD,
    topK =
        YUNET_DEFAULT_TOP_K,
} = {}) {
    const normalizedScoreThreshold =
        requireUnitThreshold(
            scoreThreshold,
            "scoreThreshold",
        );

    const normalizedNmsThreshold =
        requireUnitThreshold(
            nmsThreshold,
            "nmsThreshold",
        );

    const normalizedTopK =
        requireTopK(
            topK,
        );

    const session =
        await createCpuInferenceSession(
            modelPath,
        );

    const inputNames =
        Array.from(
            session.inputNames,
        );

    if (
        inputNames.length !== 1
    ) {
        if (
            typeof session.release ===
            "function"
        ) {
            await session.release();
        }

        throw new Error(
            `YuNet deve expor exatamente 1 input; atual=${inputNames.length}`,
        );
    }

    const inputName =
        inputNames[0];

    let released =
        false;

    function assertActive() {
        if (released) {
            throw new Error(
                "detector YuNet ja foi liberado.",
            );
        }
    }

    async function detectBgr({
        data,
        width,
        height,
    } = {}) {
        assertActive();

        const detectionInput =
            resizeBgrForYunetDetection({
                data,
                width,
                height,
            });

        try {
            const preprocessed =
                preprocessBgrHwcToNchw({
                    data:
                        detectionInput.data,

                    width:
                        detectionInput
                            .detectionWidth,

                    height:
                        detectionInput
                            .detectionHeight,
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
                    [inputName]:
                        tensor,
                });

            const detections =
                decodeYunetOutputs({
                    outputs,

                    paddedWidth:
                        preprocessed
                            .paddedWidth,

                    paddedHeight:
                        preprocessed
                            .paddedHeight,

                    scoreThreshold:
                        normalizedScoreThreshold,

                    nmsThreshold:
                        normalizedNmsThreshold,

                    topK:
                        normalizedTopK,
                });

            return remapYunetDetectionsToSource({
                detections,

                sourceWidth:
                    detectionInput
                        .sourceWidth,

                sourceHeight:
                    detectionInput
                        .sourceHeight,

                detectionWidth:
                    detectionInput
                        .detectionWidth,

                detectionHeight:
                    detectionInput
                        .detectionHeight,
            });
        }
        finally {
            /*
             * Only the detector-only reduced copy is
             * owned here. Never zero the caller frame.
             */
            if (
                detectionInput.resized
            ) {
                detectionInput
                    .data
                    .fill(
                        0,
                    );
            }
        }
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

        inputName,

        scoreThreshold:
            normalizedScoreThreshold,

        nmsThreshold:
            normalizedNmsThreshold,

        topK:
            normalizedTopK,

        detectBgr,
        release,
    });
}
