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
function safeOutcome({
    admissionPassed,
    streamAdmission,
    visionAdmission,
    faceCount,
    embeddingValid,
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

            const baseline =
                drainPendingFrame(
                    session,
                );

            await waitForFreshFrame(
                session,
                baseline,
            );

            const beforeTake =
                session.snapshot();

            frame =
                session.takeLatestFrame();

            const afterTake =
                session.snapshot();

            if (
                afterTake.frames.queue.delivered !==
                baseline.delivered +
                    1
            ) {
                fail(
                    REAL_CAMERA_ADMISSION_BLOCKER
                        .EXCLUSIVE_FRAME_CONSUMER_VIOLATION,
                );
            }

            if (
                !frame
            ) {
                fail(
                    REAL_CAMERA_ADMISSION_BLOCKER
                        .FRESH_FRAME_UNAVAILABLE,
                );
            }

            if (
                !frameIsValid(
                    frame,
                    beforeTake,
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

            let detections;

            try {
                detections =
                    await detectBgr({
                        data:
                            frame,
                        width:
                            beforeTake.frames.width,
                        height:
                            beforeTake.frames.height,
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
                    detections,
                )
            ) {
                fail(
                    REAL_CAMERA_ADMISSION_BLOCKER
                        .DETECTION_FAILED,
                );
            }

            faceCount =
                detections.length;

            if (
                faceCount ===
                0
            ) {
                fail(
                    REAL_CAMERA_ADMISSION_BLOCKER
                        .NO_FACE,
                );
            }

            if (
                faceCount !==
                1
            ) {
                fail(
                    REAL_CAMERA_ADMISSION_BLOCKER
                        .MULTIPLE_FACES,
                );
            }

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
            catch {
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
