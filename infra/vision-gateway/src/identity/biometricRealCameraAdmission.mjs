export const REAL_CAMERA_ADMISSION_CONFIRMATION =
    "CONFIRMED";

export const REAL_CAMERA_ADMISSION_STATE =
    Object.freeze({
        CREATED:
            "CREATED",
        CONFIG_VALIDATED:
            "CONFIG_VALIDATED",
        AREA_CLEAR_CONFIRMED:
            "AREA_CLEAR_CONFIRMED",
        CAMERA_STARTING:
            "CAMERA_STARTING",
        STREAM_RUNNING:
            "STREAM_RUNNING",
        FRESH_FRAME_VALIDATED:
            "FRESH_FRAME_VALIDATED",
        VISION_SMOKE_VALIDATED:
            "VISION_SMOKE_VALIDATED",
        ADMISSION_PASSED:
            "ADMISSION_PASSED",
        FAILED:
            "FAILED",
        STOPPED:
            "STOPPED",
    });

export const REAL_CAMERA_ADMISSION_BLOCKER =
    Object.freeze({
        AREA_CLEAR_NOT_CONFIRMED:
            "AREA_CLEAR_NOT_CONFIRMED",
        CAMERA_NOT_CONFIGURED:
            "CAMERA_NOT_CONFIGURED",
        BROKER_MUST_BE_DISABLED:
            "BROKER_MUST_BE_DISABLED",
        HEALTH_SERVER_ALREADY_RUNNING:
            "HEALTH_SERVER_ALREADY_RUNNING",
        RUNTIME_INVALID:
            "RUNTIME_INVALID",
        SESSION_NOT_AVAILABLE:
            "SESSION_NOT_AVAILABLE",
        START_FAILED:
            "START_FAILED",
        STARTUP_TIMEOUT:
            "STARTUP_TIMEOUT",
        STREAM_LEFT_RUNNING_STATE:
            "STREAM_LEFT_RUNNING_STATE",
        FRAME_QUEUE_CONTRACT_INVALID:
            "FRAME_QUEUE_CONTRACT_INVALID",
        EXCLUSIVE_FRAME_CONSUMER_VIOLATION:
            "EXCLUSIVE_FRAME_CONSUMER_VIOLATION",
        FRESH_FRAME_TIMEOUT:
            "FRESH_FRAME_TIMEOUT",
        FRESH_FRAME_PENDING_REQUIRED:
            "FRESH_FRAME_PENDING_REQUIRED",
        FRESH_FRAME_UNAVAILABLE:
            "FRESH_FRAME_UNAVAILABLE",
        FRAME_INVALID:
            "FRAME_INVALID",
        DETECTION_FAILED:
            "DETECTION_FAILED",
        NO_FACE:
            "NO_FACE",
        MULTIPLE_FACES:
            "MULTIPLE_FACES",
        DETECTION_UNSTABLE:
            "DETECTION_UNSTABLE",
        ALIGNMENT_FAILED:
            "ALIGNMENT_FAILED",
        EMBEDDING_FAILED:
            "EMBEDDING_FAILED",
        STOP_FAILED:
            "STOP_FAILED",
    });

const BROKER_ENV_KEYS =
    Object.freeze([
        "SAFESCAN_BIOMETRIC_BROKER_URL",
        "SAFESCAN_BIOMETRIC_BROKER_TOKEN",
    ]);

const EMBEDDING_SIZE =
    128;

const EMBEDDING_L2_TOLERANCE =
    1e-5;

function requireFunction(
    value,
    name,
) {
    if (
        typeof value !==
        "function"
    ) {
        throw new TypeError(
            `${name} deve ser funcao.`,
        );
    }

    return value;
}

function requirePositiveInteger(
    value,
    name,
) {
    if (
        !Number.isSafeInteger(
            value,
        ) ||
        value <=
            0
    ) {
        throw new TypeError(
            `${name} deve ser inteiro positivo.`,
        );
    }

    return value;
}

function requireAlignmentConfig(
    value,
) {
    if (
        !value ||
        typeof value !==
            "object" ||
        Array.isArray(
            value,
        )
    ) {
        throw new TypeError(
            "alignmentConfig deve ser objeto.",
        );
    }

    const targetWidth =
        requirePositiveInteger(
            value.targetWidth,
            "alignmentConfig.targetWidth",
        );

    const targetHeight =
        requirePositiveInteger(
            value.targetHeight,
            "alignmentConfig.targetHeight",
        );

    if (
        targetWidth !==
            112 ||
        targetHeight !==
            112
    ) {
        throw new TypeError(
            "alignmentConfig deve usar 112x112 para SFace.",
        );
    }

    if (
        !Array.isArray(
            value.templateLandmarks,
        ) ||
        value.templateLandmarks.length !==
            5
    ) {
        throw new TypeError(
            "alignmentConfig.templateLandmarks deve possuir cinco pontos.",
        );
    }

    for (
        const [
            index,
            point,
        ] of
        value.templateLandmarks.entries()
    ) {
        if (
            !point ||
            typeof point !==
                "object" ||
            !Number.isFinite(
                point.x,
            ) ||
            !Number.isFinite(
                point.y,
            )
        ) {
            throw new TypeError(
                `alignmentConfig.templateLandmarks[${index}] invalido.`,
            );
        }
    }

    const numericKeys =
        [
            "paddingRatio",
            "minFaceSizePx",
            "minVisibleAreaRatio",
            "maxRmsError",
        ];

    const result =
        {
            targetWidth,
            targetHeight,
            templateLandmarks:
                value.templateLandmarks.map(
                    (
                        point,
                    ) =>
                        Object.freeze({
                            x:
                                point.x,
                            y:
                                point.y,
                        }),
                ),
        };

    for (
        const key of
        numericKeys
    ) {
        if (
            typeof value[key] !==
                "number" ||
            !Number.isFinite(
                value[key],
            )
        ) {
            throw new TypeError(
                `alignmentConfig.${key} deve ser numero finito.`,
            );
        }

        result[key] =
            value[key];
    }

    return Object.freeze(
        result,
    );
}

function buildSafeRuntimeEnv(
    env,
) {
    if (
        !env ||
        typeof env !==
            "object"
    ) {
        throw new TypeError(
            "env deve ser objeto.",
        );
    }

    const result =
        {
            ...env,
        };

    for (
        const key of
        BROKER_ENV_KEYS
    ) {
        delete result[key];
    }

    return result;
}

function zeroBytes(
    value,
) {
    if (
        value instanceof
        Uint8Array
    ) {
        value.fill(
            0,
        );
    }
}

function zeroEmbedding(
    value,
) {
    if (
        value instanceof
        Float32Array
    ) {
        value.fill(
            0,
        );
    }
}

function embeddingIsValid(
    value,
) {
    if (
        !(
            value instanceof
            Float32Array
        ) ||
        value.length !==
            EMBEDDING_SIZE
    ) {
        return false;
    }

    let sum =
        0;

    for (
        const component of
        value
    ) {
        if (
            !Number.isFinite(
                component,
            )
        ) {
            return false;
        }

        sum +=
            component *
            component;
    }

    return (
        Math.abs(
            Math.sqrt(
                sum,
            ) -
            1
        ) <=
        EMBEDDING_L2_TOLERANCE
    );
}

function queueContractIsValid(
    snapshot,
) {
    return (
        snapshot?.frames?.format ===
            "bgr24" &&
        Number.isSafeInteger(
            snapshot.frames.width,
        ) &&
        snapshot.frames.width >
            0 &&
        Number.isSafeInteger(
            snapshot.frames.height,
        ) &&
        snapshot.frames.height >
            0 &&
        snapshot.frames.queue?.capacity ===
            1 &&
        typeof snapshot.frames.queue.pending ===
            "boolean" &&
        Number.isSafeInteger(
            snapshot.frames.queue.received,
        ) &&
        Number.isSafeInteger(
            snapshot.frames.queue.delivered,
        ) &&
        Number.isSafeInteger(
            snapshot.lastFrame,
        )
    );
}

function frameIsValid(
    frame,
    snapshot,
) {
    return (
        frame instanceof
            Uint8Array &&
        frame.byteLength ===
            snapshot.frames.width *
            snapshot.frames.height *
            3
    );
}

const CAMERA_STOP_TIMEOUT_MS =
    5000;

const CAMERA_STOP_POLL_INTERVAL_MS =
    25;

export async function waitForCameraSessionStopped({
    session,
    timeoutMs =
        CAMERA_STOP_TIMEOUT_MS,
    pollIntervalMs =
        CAMERA_STOP_POLL_INTERVAL_MS,
    waitImpl =
        (delayMs) =>
            new Promise(
                (resolve) =>
                    setTimeout(
                        resolve,
                        delayMs,
                    ),
            ),
} = {}) {
    if (
        !session ||
        typeof session.snapshot !==
            "function"
    ) {
        const error =
            new Error(
                REAL_CAMERA_ADMISSION_BLOCKER.STOP_FAILED,
            );

        error.code =
            REAL_CAMERA_ADMISSION_BLOCKER.STOP_FAILED;

        throw error;
    }

    if (
        !Number.isFinite(
            timeoutMs,
        ) ||
        timeoutMs < 0
    ) {
        throw new TypeError(
            "timeoutMs deve ser numero finito maior ou igual a zero.",
        );
    }

    if (
        !Number.isFinite(
            pollIntervalMs,
        ) ||
        pollIntervalMs <= 0
    ) {
        throw new TypeError(
            "pollIntervalMs deve ser numero finito maior que zero.",
        );
    }

    if (
        typeof waitImpl !==
            "function"
    ) {
        throw new TypeError(
            "waitImpl deve ser funcao.",
        );
    }

    const maxSnapshots =
        Math.max(
            1,
            Math.ceil(
                timeoutMs /
                pollIntervalMs,
            ) + 1,
        );

    for (
        let attempt = 0;
        attempt < maxSnapshots;
        attempt += 1
    ) {
        const current =
            session.snapshot();

        if (
            current?.state ===
                "STOPPED" &&
            current?.running ===
                false
        ) {
            return current;
        }

        if (
            attempt + 1 <
            maxSnapshots
        ) {
            await waitImpl(
                pollIntervalMs,
            );
        }
    }

    const error =
        new Error(
            REAL_CAMERA_ADMISSION_BLOCKER.STOP_FAILED,
        );

    error.code =
        REAL_CAMERA_ADMISSION_BLOCKER.STOP_FAILED;

    throw error;
}
const SAFE_ALIGNMENT_FAILURE_CODES =
    Object.freeze([
        "ALIGNMENT_RESIDUAL_TOO_HIGH",
        "DEGENERATE_LANDMARK_GEOMETRY",
        "FACE_OUTSIDE_FRAME",
        "FACE_TOO_SMALL",
        "INSUFFICIENT_VISIBLE_AREA",
        "INVALID_BBOX",
        "INVALID_FRAME",
        "INVALID_LANDMARK_COUNT",
        "INVALID_OUTPUT_SIZE",
        "INVALID_PARAMETER",
        "INVALID_SCALE",
        "INVALID_TARGET_TEMPLATE",
        "NON_FINITE_LANDMARK",
        "REFLECTION_DETECTED",
        "SIMILARITY_TRANSFORM_FAILED",
    ]);

function sanitizeAlignmentFailureCode(
    error,
) {
    if (
        error?.name !==
            "FaceAlignmentError"
    ) {
        return null;
    }

    const code =
        error?.code;

    return (
        typeof code ===
            "string" &&
        SAFE_ALIGNMENT_FAILURE_CODES
            .includes(code)
    )
        ? code
        : null;
}

function sanitizeAlignmentFailureRmsBand(
    error,
) {
    if (
        error?.name !==
            "FaceAlignmentError" ||
        error?.code !==
            "ALIGNMENT_RESIDUAL_TOO_HIGH"
    ) {
        return null;
    }

    const rmsError =
        error?.details?.rmsError;

    if (
        typeof rmsError !==
            "number" ||
        !Number.isFinite(rmsError) ||
        rmsError < 0
    ) {
        return "UNKNOWN";
    }

    if (rmsError <= 0.05) {
        return "LE_0_05";
    }

    if (rmsError <= 0.10) {
        return "GT_0_05_LE_0_10";
    }

    if (rmsError <= 0.25) {
        return "GT_0_10_LE_0_25";
    }

    if (rmsError <= 0.50) {
        return "GT_0_25_LE_0_50";
    }

    if (rmsError <= 1.00) {
        return "GT_0_50_LE_1_00";
    }

    if (rmsError <= 1.25) {
        return "GT_1_00_LE_1_25";
    }

    if (rmsError <= 1.50) {
        return "GT_1_25_LE_1_50";
    }

    if (rmsError <= 1.75) {
        return "GT_1_50_LE_1_75";
    }

    if (rmsError <= 2.00) {
        return "GT_1_75_LE_2_00";
    }

    if (rmsError <= 4.00) {
        return "GT_2_00_LE_4_00";
    }

    if (rmsError <= 8.00) {
        return "GT_4_00_LE_8_00";
    }

    if (rmsError <= 16.00) {
        return "GT_8_00_LE_16_00";
    }

    return "GT_16_00";
}

function sanitizeSecondaryFaceScoreBand(
    detection,
) {
    const score =
        detection?.score;

    if (
        typeof score !==
            "number" ||
        !Number.isFinite(score)
    ) {
        return "UNKNOWN";
    }

    if (
        score > 0.60 &&
        score <= 0.70
    ) {
        return "GT_0_60_LE_0_70";
    }

    if (
        score > 0.70 &&
        score <= 0.80
    ) {
        return "GT_0_70_LE_0_80";
    }

    if (
        score > 0.80 &&
        score <= 0.90
    ) {
        return "GT_0_80_LE_0_90";
    }

    if (
        score > 0.90 &&
        score <= 1.00
    ) {
        return "GT_0_90_LE_1_00";
    }

    return "UNKNOWN";
}

function sanitizeMultipleFacesOverlapBand(
    first,
    second,
) {
    const boxes =
        [
            first,
            second,
        ];

    for (const box of boxes) {
        if (
            typeof box?.x !== "number" ||
            !Number.isFinite(box.x) ||
            typeof box?.y !== "number" ||
            !Number.isFinite(box.y) ||
            typeof box?.width !== "number" ||
            !Number.isFinite(box.width) ||
            box.width <= 0 ||
            typeof box?.height !== "number" ||
            !Number.isFinite(box.height) ||
            box.height <= 0
        ) {
            return "UNKNOWN";
        }
    }

    const intersectionWidth =
        Math.max(
            0,
            Math.min(
                first.x + first.width,
                second.x + second.width,
            ) -
                Math.max(
                    first.x,
                    second.x,
                ),
        );

    const intersectionHeight =
        Math.max(
            0,
            Math.min(
                first.y + first.height,
                second.y + second.height,
            ) -
                Math.max(
                    first.y,
                    second.y,
                ),
        );

    const intersectionArea =
        intersectionWidth *
        intersectionHeight;

    const unionArea =
        first.width * first.height +
        second.width * second.height -
        intersectionArea;

    if (
        !Number.isFinite(unionArea) ||
        unionArea <= 0
    ) {
        return "UNKNOWN";
    }

    const overlap =
        intersectionArea /
        unionArea;

    if (
        !Number.isFinite(overlap) ||
        overlap < 0
    ) {
        return "UNKNOWN";
    }

    if (overlap <= 0.10) {
        return "LE_0_10";
    }

    if (overlap <= 0.20) {
        return "GT_0_10_LE_0_20";
    }

    if (overlap <= 0.30) {
        return "GT_0_20_LE_0_30";
    }

    return "UNKNOWN";
}

function sanitizeMultipleFacesDiagnostics(
    detections,
) {
    if (
        !Array.isArray(detections) ||
        detections.length < 2
    ) {
        return Object.freeze({
            multipleFacesOverlapBand:
                "UNKNOWN",
            secondaryFaceScoreBand:
                "UNKNOWN",
        });
    }

    const overlapBandRank =
        Object.freeze({
            LE_0_10:
                0,
            GT_0_10_LE_0_20:
                1,
            GT_0_20_LE_0_30:
                2,
        });

    let maximumOverlapBand =
        "LE_0_10";

    let maximumOverlapRank =
        overlapBandRank
            .LE_0_10;

    let overlapUnknown =
        false;

    pairLoop:
    for (
        let firstIndex = 0;
        firstIndex < detections.length - 1;
        firstIndex += 1
    ) {
        for (
            let secondIndex = firstIndex + 1;
            secondIndex < detections.length;
            secondIndex += 1
        ) {
            const candidateBand =
                sanitizeMultipleFacesOverlapBand(
                    detections[firstIndex],
                    detections[secondIndex],
                );

            if (
                candidateBand ===
                "UNKNOWN"
            ) {
                overlapUnknown =
                    true;

                break pairLoop;
            }

            const candidateRank =
                overlapBandRank[
                    candidateBand
                ];

            if (
                !Number.isInteger(
                    candidateRank,
                )
            ) {
                overlapUnknown =
                    true;

                break pairLoop;
            }

            if (
                candidateRank >
                maximumOverlapRank
            ) {
                maximumOverlapRank =
                    candidateRank;

                maximumOverlapBand =
                    candidateBand;
            }
        }
    }

    return Object.freeze({
        multipleFacesOverlapBand:
            overlapUnknown
                ? "UNKNOWN"
                : maximumOverlapBand,

        secondaryFaceScoreBand:
            sanitizeSecondaryFaceScoreBand(
                detections[1],
            ),
    });
}
function safeOutcome({
    admissionPassed,
    streamAdmission,
    visionAdmission,
    faceCount,
    embeddingValid,
    alignmentFailureCode,
    alignmentFailureRmsBand,
    multipleFacesOverlapBand,
    secondaryFaceScoreBand,
    cameraStartAttempted,
    cameraStopAttempted,
    warnings,
    blockers,
}) {
    return Object.freeze({
        admissionPassed,
        streamAdmission,
        visionAdmission,
        faceCount,
        embeddingValid,
        alignmentFailureCode,
        alignmentFailureRmsBand,
        multipleFacesOverlapBand,
        secondaryFaceScoreBand,
        cameraStartAttempted,
        cameraStopAttempted,
        calibrationSampleCaptured:
            false,
        executionManifestCreated:
            false,
        r7cDatasetCreated:
            false,
        persistedArtifacts:
            false,
        warnings:
            Object.freeze([
                ...warnings,
            ]),
        blockers:
            Object.freeze([
                ...blockers,
            ]),
    });
}

function blockerFrom(
    error,
) {
    if (
        typeof error?.code ===
            "string" &&
        Object.values(
            REAL_CAMERA_ADMISSION_BLOCKER,
        ).includes(
            error.code,
        )
    ) {
        return error.code;
    }

    return null;
}

class AdmissionError extends Error {
    constructor(
        code,
    ) {
        super(
            code,
        );

        this.name =
            "AdmissionError";

        this.code =
            code;
    }
}

function fail(
    code,
) {
    throw new AdmissionError(
        code,
    );
}

export function createBiometricRealCameraAdmissionHarness({
    createRuntime,
    env,
    detector,
    alignFace,
    embeddingExtractor,
    alignmentConfig,
    startupTimeoutMs,
    freshFrameTimeoutMs,
    pollIntervalMs,
    sleep =
        (
            milliseconds,
        ) =>
            new Promise(
                (
                    resolve,
                ) =>
                    setTimeout(
                        resolve,
                        milliseconds,
                    ),
            ),
    nowMs =
        () =>
            Date.now(),
} = {}) {
    const runtimeFactory =
        requireFunction(
            createRuntime,
            "createRuntime",
        );

    const detectBgr =
        requireFunction(
            detector?.detectBgr,
            "detector.detectBgr",
        );

    const alignFaceImpl =
        requireFunction(
            alignFace,
            "alignFace",
        );

    const extractBgr112 =
        requireFunction(
            embeddingExtractor?.extractBgr112,
            "embeddingExtractor.extractBgr112",
        );

    const wait =
        requireFunction(
            sleep,
            "sleep",
        );

    const clock =
        requireFunction(
            nowMs,
            "nowMs",
        );

    const startupTimeout =
        requirePositiveInteger(
            startupTimeoutMs,
            "startupTimeoutMs",
        );

    const freshFrameTimeout =
        requirePositiveInteger(
            freshFrameTimeoutMs,
            "freshFrameTimeoutMs",
        );

    const pollInterval =
        requirePositiveInteger(
            pollIntervalMs,
            "pollIntervalMs",
        );

    if (
        pollInterval >
            startupTimeout ||
        pollInterval >
            freshFrameTimeout
    ) {
        throw new TypeError(
            "pollIntervalMs nao pode superar os timeouts.",
        );
    }

    const alignment =
        requireAlignmentConfig(
            alignmentConfig,
        );

    const sourceEnv =
        buildSafeRuntimeEnv(
            env,
        );

    let state =
        REAL_CAMERA_ADMISSION_STATE.CREATED;

    let used =
        false;

    let lastOutcome =
        null;

    function snapshot() {
        return Object.freeze({
            state,
            used,
            hasOutcome:
                lastOutcome !==
                null,
        });
    }

    async function waitForRunning(
        session,
    ) {
        const startedAt =
            clock();

        while (
            clock() -
            startedAt <=
            startupTimeout
        ) {
            const current =
                session.snapshot();

            if (
                current.state ===
                    "RUNNING" &&
                current.running ===
                    true &&
                current.firstFrameSeen ===
                    true
            ) {
                if (
                    !queueContractIsValid(
                        current,
                    )
                ) {
                    fail(
                        REAL_CAMERA_ADMISSION_BLOCKER
                            .FRAME_QUEUE_CONTRACT_INVALID,
                    );
                }

                return current;
            }

            if (
                current.state ===
                    "STOPPED" ||
                current.state ===
                    "RECONNECTING"
            ) {
                fail(
                    REAL_CAMERA_ADMISSION_BLOCKER
                        .STREAM_LEFT_RUNNING_STATE,
                );
            }

            await wait(
                pollInterval,
            );
        }

        fail(
            REAL_CAMERA_ADMISSION_BLOCKER
                .STARTUP_TIMEOUT,
        );
    }

    function drainPendingFrame(
        session,
    ) {
        const before =
            session.snapshot();

        if (
            !queueContractIsValid(
                before,
            )
        ) {
            fail(
                REAL_CAMERA_ADMISSION_BLOCKER
                    .FRAME_QUEUE_CONTRACT_INVALID,
            );
        }

        let expectedDelivered =
            before.frames.queue.delivered;

        let drainCount =
            0;

        while (
            session.snapshot()
                .frames
                .queue
                .pending
        ) {
            const beforeTake =
                session.snapshot();

            if (
                beforeTake.frames.queue.delivered !==
                expectedDelivered
            ) {
                fail(
                    REAL_CAMERA_ADMISSION_BLOCKER
                        .EXCLUSIVE_FRAME_CONSUMER_VIOLATION,
                );
            }

            const stale =
                session.takeLatestFrame();

            if (
                !(
                    stale instanceof
                    Uint8Array
                )
            ) {
                fail(
                    REAL_CAMERA_ADMISSION_BLOCKER
                        .FRESH_FRAME_UNAVAILABLE,
                );
            }

            zeroBytes(
                stale,
            );

            expectedDelivered +=
                1;

            const afterTake =
                session.snapshot();

            if (
                afterTake.frames.queue.delivered !==
                expectedDelivered
            ) {
                fail(
                    REAL_CAMERA_ADMISSION_BLOCKER
                        .EXCLUSIVE_FRAME_CONSUMER_VIOLATION,
                );
            }

            drainCount +=
                1;

            if (
                drainCount >
                    4
            ) {
                fail(
                    REAL_CAMERA_ADMISSION_BLOCKER
                        .EXCLUSIVE_FRAME_CONSUMER_VIOLATION,
                );
            }
        }

        const baseline =
            session.snapshot();

        if (
            baseline.frames.queue.delivered !==
                expectedDelivered ||
            baseline.frames.queue.pending
        ) {
            fail(
                REAL_CAMERA_ADMISSION_BLOCKER
                    .EXCLUSIVE_FRAME_CONSUMER_VIOLATION,
            );
        }

        return Object.freeze({
            lastFrame:
                baseline.lastFrame,
            delivered:
                baseline.frames.queue.delivered,
            width:
                baseline.frames.width,
            height:
                baseline.frames.height,
        });
    }

    async function waitForFreshFrame(
        session,
        baseline,
    ) {
        const startedAt =
            clock();

        while (
            clock() -
            startedAt <=
            freshFrameTimeout
        ) {
            const current =
                session.snapshot();

            if (
                current.state !==
                    "RUNNING" ||
                current.running !==
                    true
            ) {
                fail(
                    REAL_CAMERA_ADMISSION_BLOCKER
                        .STREAM_LEFT_RUNNING_STATE,
                );
            }

            if (
                !queueContractIsValid(
                    current,
                ) ||
                current.frames.width !==
                    baseline.width ||
                current.frames.height !==
                    baseline.height
            ) {
                fail(
                    REAL_CAMERA_ADMISSION_BLOCKER
                        .FRAME_QUEUE_CONTRACT_INVALID,
                );
            }

            if (
                current.frames.queue.delivered !==
                baseline.delivered
            ) {
                fail(
                    REAL_CAMERA_ADMISSION_BLOCKER
                        .EXCLUSIVE_FRAME_CONSUMER_VIOLATION,
                );
            }

            if (
                current.lastFrame >
                baseline.lastFrame
            ) {
                if (
                    !current.frames.queue.pending
                ) {
                    fail(
                        REAL_CAMERA_ADMISSION_BLOCKER
                            .FRESH_FRAME_PENDING_REQUIRED,
                    );
                }

                return current;
            }

            await wait(
                pollInterval,
            );
        }

        fail(
            REAL_CAMERA_ADMISSION_BLOCKER
                .FRESH_FRAME_TIMEOUT,
        );
    }

    async function run({
        areaClearConfirmation,
    } = {}) {
        if (used) {
            throw new Error(
                "Camera admission harness e one-shot.",
            );
        }

        used =
            true;

        const blockers =
            [];

        const warnings =
            [];

        let runtime =
            null;

        let session;

        let cameraId =
            null;

        let frame =
            null;

        let aligned =
            null;

        let embedding =
            null;

        let faceCount =
            null;

        let embeddingValid =
            false;

        let alignmentFailureCode =
            null;

        let alignmentFailureRmsBand =
            null;

        let multipleFacesOverlapBand =
            null;

        let secondaryFaceScoreBand =
            null;

        let streamAdmission =
            false;

        let visionAdmission;

        let admissionPassed;

        let cameraStartAttempted =
            false;

        let cameraStopAttempted =
            false;

        try {
            if (
                areaClearConfirmation !==
                REAL_CAMERA_ADMISSION_CONFIRMATION
            ) {
                fail(
                    REAL_CAMERA_ADMISSION_BLOCKER
                        .AREA_CLEAR_NOT_CONFIRMED,
                );
            }

            runtime =
                runtimeFactory({
                    env:
                        {
                            ...sourceEnv,
                        },
                });

            if (
                !runtime ||
                typeof runtime !==
                    "object" ||
                typeof runtime.startCamera !==
                    "function" ||
                typeof runtime.stopCamera !==
                    "function" ||
                !(
                    runtime.rtspSessions instanceof
                    Map
                )
            ) {
                fail(
                    REAL_CAMERA_ADMISSION_BLOCKER
                        .RUNTIME_INVALID,
                );
            }

            if (
                runtime.config?.broker
            ) {
                fail(
                    REAL_CAMERA_ADMISSION_BLOCKER
                        .BROKER_MUST_BE_DISABLED,
                );
            }

            cameraId =
                runtime.config
                    ?.camera
                    ?.id ??
                null;

            if (
                typeof cameraId !==
                    "string" ||
                !cameraId.trim()
            ) {
                fail(
                    REAL_CAMERA_ADMISSION_BLOCKER
                        .CAMERA_NOT_CONFIGURED,
                );
            }

            if (
                runtime.healthServer
                    ?.server
                    ?.listening ===
                true
            ) {
                fail(
                    REAL_CAMERA_ADMISSION_BLOCKER
                        .HEALTH_SERVER_ALREADY_RUNNING,
                );
            }

            state =
                REAL_CAMERA_ADMISSION_STATE.CONFIG_VALIDATED;

            state =
                REAL_CAMERA_ADMISSION_STATE.AREA_CLEAR_CONFIRMED;

            cameraStartAttempted =
                true;

            state =
                REAL_CAMERA_ADMISSION_STATE.CAMERA_STARTING;

            try {
                runtime.startCamera(
                    cameraId,
                );
            }
            catch {
                fail(
                    REAL_CAMERA_ADMISSION_BLOCKER
                        .START_FAILED,
                );
            }

            session =
                runtime.rtspSessions.get(
                    cameraId,
                );

            if (
                !session ||
                typeof session.snapshot !==
                    "function" ||
                typeof session.takeLatestFrame !==
                    "function"
            ) {
                fail(
                    REAL_CAMERA_ADMISSION_BLOCKER
                        .SESSION_NOT_AVAILABLE,
                );
            }

            await waitForRunning(
                session,
            );

            state =
                REAL_CAMERA_ADMISSION_STATE.STREAM_RUNNING;

            /*
             * D47-P28 temporal consensus.
             * Exactly three independent fresh frames.
             * No early-exit for valid ZERO/ONE/MULTI samples.
             */
            let baseline =
                drainPendingFrame(
                    session,
                );

            const temporalCounts =
                {
                    ZERO: 0,
                    ONE: 0,
                    MULTI: 0,
                };

            let detections =
                null;

            let beforeTake =
                null;

            let lastMultipleFaceCount =
                null;

            let lastMultipleFacesOverlapBand =
                null;

            let lastSecondaryFaceScoreBand =
                null;

            const releaseRetainedOne =
                () => {
                    if (
                        frame instanceof
                        Uint8Array
                    ) {
                        zeroBytes(
                            frame,
                        );
                    }

                    frame =
                        null;

                    beforeTake =
                        null;

                    detections =
                        null;
                };

            for (
                let temporalSample =
                    0;
                temporalSample <
                    3;
                temporalSample +=
                    1
            ) {
                await waitForFreshFrame(
                    session,
                    baseline,
                );

                const sampleBeforeTake =
                    session.snapshot();

                let currentFrame =
                    session.takeLatestFrame();

                const sampleAfterTake =
                    session.snapshot();

                try {
                    if (
                        sampleAfterTake.frames.queue.delivered !==
                        baseline.delivered +
                            1
                    ) {
                        fail(
                            REAL_CAMERA_ADMISSION_BLOCKER
                                .EXCLUSIVE_FRAME_CONSUMER_VIOLATION,
                        );
                    }

                    if (
                        !currentFrame
                    ) {
                        fail(
                            REAL_CAMERA_ADMISSION_BLOCKER
                                .FRESH_FRAME_UNAVAILABLE,
                        );
                    }

                    if (
                        !frameIsValid(
                            currentFrame,
                            sampleBeforeTake,
                        )
                    ) {
                        fail(
                            REAL_CAMERA_ADMISSION_BLOCKER
                                .FRAME_INVALID,
                        );
                    }

                    streamAdmission =
                        true;

                    state =
                        REAL_CAMERA_ADMISSION_STATE.FRESH_FRAME_VALIDATED;

                    let sampleDetections;

                    try {
                        sampleDetections =
                            await detectBgr({
                                data:
                                    currentFrame,
                                width:
                                    sampleBeforeTake.frames.width,
                                height:
                                    sampleBeforeTake.frames.height,
                            });
                    }
                    catch {
                        fail(
                            REAL_CAMERA_ADMISSION_BLOCKER
                                .DETECTION_FAILED,
                        );
                    }

                    if (
                        !Array.isArray(
                            sampleDetections,
                        )
                    ) {
                        fail(
                            REAL_CAMERA_ADMISSION_BLOCKER
                                .DETECTION_FAILED,
                        );
                    }

                    const sampleFaceCount =
                        sampleDetections.length;

                    if (
                        sampleFaceCount ===
                        0
                    ) {
                        temporalCounts.ZERO +=
                            1;

                        sampleDetections =
                            null;
                    }
                    else if (
                        sampleFaceCount ===
                        1
                    ) {
                        temporalCounts.ONE +=
                            1;

                        if (
                            frame instanceof
                            Uint8Array
                        ) {
                            zeroBytes(
                                frame,
                            );
                        }

                        frame =
                            currentFrame;

                        currentFrame =
                            null;

                        beforeTake =
                            sampleBeforeTake;

                        detections =
                            sampleDetections;

                        sampleDetections =
                            null;
                    }
                    else {
                        temporalCounts.MULTI +=
                            1;

                        const diagnostics =
                            sanitizeMultipleFacesDiagnostics(
                                sampleDetections,
                            );

                        lastMultipleFaceCount =
                            sampleFaceCount;

                        lastMultipleFacesOverlapBand =
                            diagnostics
                                .multipleFacesOverlapBand;

                        lastSecondaryFaceScoreBand =
                            diagnostics
                                .secondaryFaceScoreBand;

                        sampleDetections =
                            null;
                    }
                }
                finally {
                    if (
                        currentFrame instanceof
                        Uint8Array
                    ) {
                        zeroBytes(
                            currentFrame,
                        );
                    }

                    currentFrame =
                        null;
                }

                baseline =
                    Object.freeze({
                        lastFrame:
                            sampleAfterTake.lastFrame,
                        delivered:
                            sampleAfterTake.frames.queue.delivered,
                        width:
                            sampleAfterTake.frames.width,
                        height:
                            sampleAfterTake.frames.height,
                    });
            }

            const temporalDecision =
                temporalCounts.ZERO >=
                    2
                    ? "NO_FACE_STABLE"
                    : temporalCounts.ONE >=
                          2
                        ? "SINGLE_FACE_STABLE"
                        : temporalCounts.MULTI >=
                              2
                            ? "MULTIPLE_FACES_STABLE"
                            : "DETECTION_UNSTABLE";

            if (
                temporalDecision ===
                "NO_FACE_STABLE"
            ) {
                faceCount =
                    0;

                releaseRetainedOne();

                fail(
                    REAL_CAMERA_ADMISSION_BLOCKER
                        .NO_FACE,
                );
            }

            if (
                temporalDecision ===
                "MULTIPLE_FACES_STABLE"
            ) {
                faceCount =
                    lastMultipleFaceCount;

                multipleFacesOverlapBand =
                    lastMultipleFacesOverlapBand;

                secondaryFaceScoreBand =
                    lastSecondaryFaceScoreBand;

                releaseRetainedOne();

                fail(
                    REAL_CAMERA_ADMISSION_BLOCKER
                        .MULTIPLE_FACES,
                );
            }

            if (
                temporalDecision ===
                "DETECTION_UNSTABLE"
            ) {
                faceCount =
                    null;

                releaseRetainedOne();

                fail(
                    REAL_CAMERA_ADMISSION_BLOCKER
                        .DETECTION_UNSTABLE,
                );
            }

            if (
                temporalDecision !==
                    "SINGLE_FACE_STABLE" ||
                !(frame instanceof Uint8Array) ||
                !beforeTake ||
                !Array.isArray(
                    detections,
                ) ||
                detections.length !==
                    1
            ) {
                releaseRetainedOne();

                fail(
                    REAL_CAMERA_ADMISSION_BLOCKER
                        .DETECTION_FAILED,
                );
            }

            faceCount =
                1;
            try {
                aligned =
                    await alignFaceImpl({
                        data:
                            frame,
                        width:
                            beforeTake.frames.width,
                        height:
                            beforeTake.frames.height,
                        detection:
                            detections[0],
                        targetWidth:
                            alignment.targetWidth,
                        targetHeight:
                            alignment.targetHeight,
                        templateLandmarks:
                            alignment.templateLandmarks,
                        paddingRatio:
                            alignment.paddingRatio,
                        minFaceSizePx:
                            alignment.minFaceSizePx,
                        minVisibleAreaRatio:
                            alignment.minVisibleAreaRatio,
                        maxRmsError:
                            alignment.maxRmsError,
                    });
            }
            catch (error) {
                alignmentFailureCode =
                    sanitizeAlignmentFailureCode(
                        error,
                    );

                alignmentFailureRmsBand =
                    sanitizeAlignmentFailureRmsBand(
                        error,
                    );

                fail(
                    REAL_CAMERA_ADMISSION_BLOCKER
                        .ALIGNMENT_FAILED,
                );
            }

            if (
                !(
                    aligned?.data instanceof
                    Uint8Array
                ) ||
                aligned.width !==
                    alignment.targetWidth ||
                aligned.height !==
                    alignment.targetHeight ||
                aligned.data.byteLength !==
                    alignment.targetWidth *
                    alignment.targetHeight *
                    3
            ) {
                fail(
                    REAL_CAMERA_ADMISSION_BLOCKER
                        .ALIGNMENT_FAILED,
                );
            }

            try {
                embedding =
                    await extractBgr112({
                        data:
                            aligned.data,
                        width:
                            aligned.width,
                        height:
                            aligned.height,
                    });
            }
            catch {
                fail(
                    REAL_CAMERA_ADMISSION_BLOCKER
                        .EMBEDDING_FAILED,
                );
            }

            embeddingValid =
                embeddingIsValid(
                    embedding,
                );

            if (
                !embeddingValid
            ) {
                fail(
                    REAL_CAMERA_ADMISSION_BLOCKER
                        .EMBEDDING_FAILED,
                );
            }

            visionAdmission =
                true;

            state =
                REAL_CAMERA_ADMISSION_STATE.VISION_SMOKE_VALIDATED;

            admissionPassed =
                true;

            state =
                REAL_CAMERA_ADMISSION_STATE.ADMISSION_PASSED;
        }
        catch (error) {
            admissionPassed =
                false;

            visionAdmission =
                false;

            state =
                REAL_CAMERA_ADMISSION_STATE.FAILED;

            blockers.push(
                blockerFrom(
                    error,
                ) ??
                REAL_CAMERA_ADMISSION_BLOCKER.RUNTIME_INVALID,
            );
        }
        finally {
            zeroEmbedding(
                embedding,
            );

            zeroBytes(
                aligned?.data,
            );

            zeroBytes(
                frame,
            );

            if (
                cameraStartAttempted &&
                runtime &&
                cameraId
            ) {
                cameraStopAttempted =
                    true;

                try {
                    const stopSession =
                        runtime.rtspSessions.get(
                            cameraId,
                        );

                    runtime.stopCamera(
                        cameraId,
                    );

                    await waitForCameraSessionStopped({
                        session:
                            stopSession,
                    });
                }
                catch {
                    if (
                        !blockers.includes(
                            REAL_CAMERA_ADMISSION_BLOCKER.STOP_FAILED,
                        )
                    ) {
                        blockers.push(
                            REAL_CAMERA_ADMISSION_BLOCKER.STOP_FAILED,
                        );
                    }

                    admissionPassed =
                        false;

                    visionAdmission =
                        false;

                    state =
                        REAL_CAMERA_ADMISSION_STATE.FAILED;
                }
            }

            if (
                cameraStopAttempted &&
                !blockers.includes(
                    REAL_CAMERA_ADMISSION_BLOCKER.STOP_FAILED,
                )
            ) {
                state =
                    REAL_CAMERA_ADMISSION_STATE.STOPPED;
            }
        }

        lastOutcome =
            safeOutcome({
                admissionPassed:
                    admissionPassed &&
                    blockers.length ===
                        0,
                streamAdmission,
                visionAdmission:
                    visionAdmission &&
                    blockers.length ===
                        0,
                faceCount,
                embeddingValid:
                    embeddingValid &&
                    blockers.length ===
                        0,
                alignmentFailureCode,
                alignmentFailureRmsBand,
                multipleFacesOverlapBand,
                secondaryFaceScoreBand,
                cameraStartAttempted,
                cameraStopAttempted,
                warnings,
                blockers,
            });

        return lastOutcome;
    }

    return Object.freeze({
        run,
        snapshot,
    });
}
