import {
    createCpuFloat32Tensor,
    createCpuInferenceSession,
} from "../inference/onnxRuntimeAdapter.mjs";

export const PPE_INPUT_SIZE =
    640;

export const PPE_CLASS_NAMES =
    Object.freeze([
        "hardhat",
        "no-hardhat",
        "vest",
        "no-vest",
        "person",
    ]);

const FEATURE_COUNT =
    4 +
    PPE_CLASS_NAMES.length;

const DEFAULT_CONFIDENCE_THRESHOLD =
    0.25;

const DEFAULT_NMS_THRESHOLD =
    0.45;

const DEFAULT_MAX_DETECTIONS =
    100;

function requirePositiveInteger(
    value,
    name,
) {
    if (
        !Number.isSafeInteger(value) ||
        value <= 0
    ) {
        throw new TypeError(
            `${name} deve ser inteiro positivo.`,
        );
    }

    return value;
}

function requireUnitValue(
    value,
    name,
) {
    if (
        typeof value !== "number" ||
        !Number.isFinite(value) ||
        value < 0 ||
        value > 1
    ) {
        throw new TypeError(
            `${name} deve estar entre 0 e 1.`,
        );
    }

    return value;
}

function requireFrame({
    data,
    width,
    height,
}) {
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

    if (
        !(data instanceof Uint8Array)
    ) {
        throw new TypeError(
            "data deve ser Uint8Array BGR.",
        );
    }

    const expected =
        normalizedWidth *
        normalizedHeight *
        3;

    if (
        data.length !== expected
    ) {
        throw new RangeError(
            (
                "tamanho BGR divergente: " +
                `esperado=${expected} atual=${data.length}`
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

function clamp(
    value,
    minimum,
    maximum,
) {
    return Math.min(
        maximum,
        Math.max(
            minimum,
            value,
        ),
    );
}

function prepareLetterboxBgr({
    data,
    width,
    height,
}) {
    const inputSize =
        PPE_INPUT_SIZE;

    const scale =
        Math.min(
            inputSize /
                width,
            inputSize /
                height,
        );

    const resizedWidth =
        Math.max(
            1,
            Math.round(
                width *
                scale,
            ),
        );

    const resizedHeight =
        Math.max(
            1,
            Math.round(
                height *
                scale,
            ),
        );

    const padX =
        Math.floor(
            (
                inputSize -
                resizedWidth
            ) /
            2,
        );

    const padY =
        Math.floor(
            (
                inputSize -
                resizedHeight
            ) /
            2,
        );

    const plane =
        inputSize *
        inputSize;

    const tensorData =
        new Float32Array(
            plane *
            3,
        );

    const padding =
        114 /
        255;

    tensorData.fill(
        padding,
    );

    for (
        let targetY = 0;
        targetY < resizedHeight;
        targetY += 1
    ) {
        const sourceY =
            Math.min(
                height - 1,
                Math.floor(
                    targetY /
                    scale,
                ),
            );

        for (
            let targetX = 0;
            targetX < resizedWidth;
            targetX += 1
        ) {
            const sourceX =
                Math.min(
                    width - 1,
                    Math.floor(
                        targetX /
                        scale,
                    ),
                );

            const sourceIndex =
                (
                    sourceY *
                    width +
                    sourceX
                ) *
                3;

            const destinationIndex =
                (
                    targetY +
                    padY
                ) *
                inputSize +
                (
                    targetX +
                    padX
                );

            const blue =
                data[
                    sourceIndex
                ];

            const green =
                data[
                    sourceIndex +
                    1
                ];

            const red =
                data[
                    sourceIndex +
                    2
                ];

            tensorData[
                destinationIndex
            ] =
                red /
                255;

            tensorData[
                plane +
                destinationIndex
            ] =
                green /
                255;

            tensorData[
                (
                    plane *
                    2
                ) +
                destinationIndex
            ] =
                blue /
                255;
        }
    }

    return {
        tensorData,
        scale,
        padX,
        padY,
    };
}

function intersectionOverUnion(
    left,
    right,
) {
    const x1 =
        Math.max(
            left.x1,
            right.x1,
        );

    const y1 =
        Math.max(
            left.y1,
            right.y1,
        );

    const x2 =
        Math.min(
            left.x2,
            right.x2,
        );

    const y2 =
        Math.min(
            left.y2,
            right.y2,
        );

    const width =
        Math.max(
            0,
            x2 -
            x1,
        );

    const height =
        Math.max(
            0,
            y2 -
            y1,
        );

    const intersection =
        width *
        height;

    const leftArea =
        Math.max(
            0,
            left.x2 -
            left.x1,
        ) *
        Math.max(
            0,
            left.y2 -
            left.y1,
        );

    const rightArea =
        Math.max(
            0,
            right.x2 -
            right.x1,
        ) *
        Math.max(
            0,
            right.y2 -
            right.y1,
        );

    const union =
        leftArea +
        rightArea -
        intersection;

    if (
        union <= 0
    ) {
        return 0;
    }

    return (
        intersection /
        union
    );
}

function classAwareNms(
    detections,
    threshold,
    maxDetections,
) {
    const ordered =
        [
            ...detections,
        ].sort(
            (
                left,
                right,
            ) =>
                right.confidence -
                left.confidence,
        );

    const kept =
        [];

    for (
        const candidate of
        ordered
    ) {
        const suppressed =
            kept.some(
                (
                    accepted,
                ) =>
                    accepted.classId ===
                        candidate.classId &&
                    intersectionOverUnion(
                        accepted,
                        candidate,
                    ) >
                        threshold,
            );

        if (suppressed) {
            continue;
        }

        kept.push(
            candidate,
        );

        if (
            kept.length >=
            maxDetections
        ) {
            break;
        }
    }

    return kept;
}

function resolveOutputLayout(
    output,
) {
    if (
        !output ||
        !output.data ||
        !output.dims
    ) {
        throw new Error(
            "PPE_OUTPUT_INVALID",
        );
    }

    const dims =
        Array.from(
            output.dims,
            Number,
        );

    if (
        dims.length !== 3 ||
        dims[0] !== 1
    ) {
        throw new Error(
            `PPE_OUTPUT_SHAPE_INVALID=${dims.join("x")}`,
        );
    }

    if (
        dims[1] ===
        FEATURE_COUNT &&
        Number.isSafeInteger(
            dims[2],
        ) &&
        dims[2] > 0
    ) {
        return {
            candidateCount:
                dims[2],

            valueAt:
                (
                    featureIndex,
                    candidateIndex,
                ) =>
                    output.data[
                        featureIndex *
                        dims[2] +
                        candidateIndex
                    ],
        };
    }

    if (
        dims[2] ===
        FEATURE_COUNT &&
        Number.isSafeInteger(
            dims[1],
        ) &&
        dims[1] > 0
    ) {
        return {
            candidateCount:
                dims[1],

            valueAt:
                (
                    featureIndex,
                    candidateIndex,
                ) =>
                    output.data[
                        candidateIndex *
                        FEATURE_COUNT +
                        featureIndex
                    ],
        };
    }

    throw new Error(
        `PPE_OUTPUT_FEATURES_INVALID=${dims.join("x")}`,
    );
}

function parseDetections({
    output,
    scale,
    padX,
    padY,
    sourceWidth,
    sourceHeight,
    confidenceThreshold,
}) {
    const {
        candidateCount,
        valueAt,
    } =
        resolveOutputLayout(
            output,
        );

    if (
        candidateCount >
        100000
    ) {
        throw new Error(
            "PPE_OUTPUT_CANDIDATE_LIMIT",
        );
    }

    const detections =
        [];

    for (
        let candidateIndex = 0;
        candidateIndex < candidateCount;
        candidateIndex += 1
    ) {
        let classId =
            -1;

        let confidence =
            0;

        for (
            let classIndex = 0;
            classIndex < PPE_CLASS_NAMES.length;
            classIndex += 1
        ) {
            const score =
                Number(
                    valueAt(
                        4 +
                            classIndex,
                        candidateIndex,
                    ),
                );

            if (
                !Number.isFinite(
                    score,
                )
            ) {
                continue;
            }

            if (
                score >
                confidence
            ) {
                confidence =
                    score;

                classId =
                    classIndex;
            }
        }

        if (
            classId < 0 ||
            confidence <
                confidenceThreshold
        ) {
            continue;
        }

        const centerX =
            Number(
                valueAt(
                    0,
                    candidateIndex,
                ),
            );

        const centerY =
            Number(
                valueAt(
                    1,
                    candidateIndex,
                ),
            );

        const width =
            Number(
                valueAt(
                    2,
                    candidateIndex,
                ),
            );

        const height =
            Number(
                valueAt(
                    3,
                    candidateIndex,
                ),
            );

        if (
            ![
                centerX,
                centerY,
                width,
                height,
            ].every(
                Number.isFinite,
            ) ||
            width <= 0 ||
            height <= 0
        ) {
            continue;
        }

        const x1 =
            clamp(
                (
                    centerX -
                    width /
                        2 -
                    padX
                ) /
                    scale,
                0,
                sourceWidth,
            );

        const y1 =
            clamp(
                (
                    centerY -
                    height /
                        2 -
                    padY
                ) /
                    scale,
                0,
                sourceHeight,
            );

        const x2 =
            clamp(
                (
                    centerX +
                    width /
                        2 -
                    padX
                ) /
                    scale,
                0,
                sourceWidth,
            );

        const y2 =
            clamp(
                (
                    centerY +
                    height /
                        2 -
                    padY
                ) /
                    scale,
                0,
                sourceHeight,
            );

        if (
            x2 <= x1 ||
            y2 <= y1
        ) {
            continue;
        }

        detections.push({
            classId,
            confidence,
            x1,
            y1,
            x2,
            y2,
        });
    }

    return detections;
}

function roundConfidence(
    value,
) {
    return (
        Math.round(
            value *
            1000,
        ) /
        1000
    );
}

function aggregateDetections(
    detections,
) {
    const counts =
        {
            hardhat: 0,
            noHardhat: 0,
            vest: 0,
            noVest: 0,
            person: 0,
        };

    const maxConfidence =
        {
            hardhat: 0,
            noHardhat: 0,
            vest: 0,
            noVest: 0,
            person: 0,
        };

    const keys =
        [
            "hardhat",
            "noHardhat",
            "vest",
            "noVest",
            "person",
        ];

    const keyByClass =
        [
            "hardhat",
            "noHardhat",
            "vest",
            "noVest",
            "person",
        ];

    for (
        const detection of
        detections
    ) {
        const key =
            keyByClass[
                detection.classId
            ];

        if (
            !keys.includes(
                key,
            )
        ) {
            continue;
        }

        counts[key] +=
            1;

        maxConfidence[key] =
            Math.max(
                maxConfidence[key],
                detection.confidence,
            );
    }

    for (
        const key of
        keys
    ) {
        maxConfidence[key] =
            roundConfidence(
                maxConfidence[key],
            );
    }

    return Object.freeze({
        detectionCount:
            detections.length,

        personCount:
            counts.person,

        counts:
            Object.freeze(
                counts,
            ),

        maxConfidence:
            Object.freeze(
                maxConfidence,
            ),
    });
}

export async function createPpeDetector({
    modelPath,
    confidenceThreshold =
        DEFAULT_CONFIDENCE_THRESHOLD,
    nmsThreshold =
        DEFAULT_NMS_THRESHOLD,
    maxDetections =
        DEFAULT_MAX_DETECTIONS,
} = {}) {
    const normalizedConfidenceThreshold =
        requireUnitValue(
            confidenceThreshold,
            "confidenceThreshold",
        );

    const normalizedNmsThreshold =
        requireUnitValue(
            nmsThreshold,
            "nmsThreshold",
        );

    if (
        !Number.isSafeInteger(
            maxDetections,
        ) ||
        maxDetections < 1 ||
        maxDetections > 1000
    ) {
        throw new TypeError(
            "maxDetections deve estar entre 1 e 1000.",
        );
    }

    const session =
        await createCpuInferenceSession(
            modelPath,
        );

    const inputNames =
        Array.isArray(
            session.inputNames,
        )
            ? session.inputNames
            : [];

    const outputNames =
        Array.isArray(
            session.outputNames,
        )
            ? session.outputNames
            : [];

    if (
        inputNames.length < 1 ||
        outputNames.length < 1
    ) {
        if (
            typeof session.release ===
            "function"
        ) {
            await session.release();
        }

        throw new Error(
            "PPE_MODEL_IO_INVALID",
        );
    }

    const inputName =
        inputNames[0];

    const outputName =
        outputNames[0];

    let released =
        false;

    async function detectBgr({
        data,
        width,
        height,
    } = {}) {
        if (released) {
            throw new Error(
                "PPE_DETECTOR_RELEASED",
            );
        }

        const frame =
            requireFrame({
                data,
                width,
                height,
            });

        const prepared =
            prepareLetterboxBgr(
                frame,
            );

        let inputTensor =
            null;

        try {
            inputTensor =
                createCpuFloat32Tensor({
                    data:
                        prepared.tensorData,

                    dims:
                        [
                            1,
                            3,
                            PPE_INPUT_SIZE,
                            PPE_INPUT_SIZE,
                        ],
                });

            const outputs =
                await session.run({
                    [inputName]:
                        inputTensor,
                });

            const output =
                outputs?.[
                    outputName
                ];

            const rawDetections =
                parseDetections({
                    output,
                    scale:
                        prepared.scale,
                    padX:
                        prepared.padX,
                    padY:
                        prepared.padY,
                    sourceWidth:
                        frame.width,
                    sourceHeight:
                        frame.height,
                    confidenceThreshold:
                        normalizedConfidenceThreshold,
                });

            const selected =
                classAwareNms(
                    rawDetections,
                    normalizedNmsThreshold,
                    maxDetections,
                );

            return aggregateDetections(
                selected,
            );
        }
        finally {
            prepared.tensorData.fill(
                0,
            );

            if (
                inputTensor?.data &&
                typeof inputTensor.data.fill ===
                    "function"
            ) {
                inputTensor.data.fill(
                    0,
                );
            }
        }
    }

    async function release() {
        if (released) {
            return true;
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
        inputSize:
            PPE_INPUT_SIZE,

        classNames:
            PPE_CLASS_NAMES,

        confidenceThreshold:
            normalizedConfidenceThreshold,

        nmsThreshold:
            normalizedNmsThreshold,

        detectBgr,
        release,
    });
}