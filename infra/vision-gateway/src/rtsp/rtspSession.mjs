import {
    buildRtspUrl,
    describeRtspEndpoint,
} from "./rtspUrl.mjs";

import {
    createReconnectPolicy,
} from "./reconnectPolicy.mjs";

import {
    createRtspTcpInterleavedClient,
} from "./rtspTcpInterleavedClient.mjs";

import {
    createRawBgrFrameAssembler,
} from "../frames/rawBgrFrameAssembler.mjs";

import {
    createLatestFrameQueue,
} from "../frames/latestFrameQueue.mjs";

function requireNonEmptyString(
    value,
    name,
) {
    if (
        typeof value !== "string" ||
        !value.trim()
    ) {
        throw new TypeError(
            `${name} deve ser uma string nao vazia.`,
        );
    }

    return value.trim();
}

function normalizeTransport(
    value,
) {
    const transport =
        requireNonEmptyString(
            value,
            "camera.endpoint.transport",
        ).toLowerCase();

    if (
        transport !== "udp" &&
        transport !== "tcp"
    ) {
        throw new TypeError(
            "camera.endpoint.transport deve ser udp ou tcp.",
        );
    }

    return transport;
}

function requireStableFrameThreshold(
    value,
) {
    if (
        !Number.isSafeInteger(value) ||
        value < 2
    ) {
        throw new TypeError(
            "stableFrameThreshold deve ser inteiro maior ou igual a 2.",
        );
    }

    return value;
}

function requireFrameDimension(
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

function consumeProgressChunk(
    progressState,
    chunk,
    onFrame,
) {
    progressState.buffer +=
        chunk.toString(
            "utf8",
        );

    const lines =
        progressState.buffer.split(
            /\r?\n/,
        );

    progressState.buffer =
        lines.pop() ?? "";

    for (
        const line of
        lines
    ) {
        const separator =
            line.indexOf(
                "=",
            );

        if (separator <= 0) {
            continue;
        }

        const key =
            line
                .slice(
                    0,
                    separator,
                )
                .trim();

        const value =
            line
                .slice(
                    separator + 1,
                )
                .trim();

        if (key !== "frame") {
            continue;
        }

        const frame =
            Number.parseInt(
                value,
                10,
            );

        if (
            !Number.isInteger(
                frame,
            ) ||
            frame <=
                progressState.lastFrame
        ) {
            continue;
        }

        progressState.lastFrame =
            frame;

        onFrame(
            frame,
        );
    }
}

export function buildRtspFfmpegArgs({
    camera,
    credentials = {},
    frameWidth = 1920,
    frameHeight = 1080,
} = {}) {
    if (
        !camera ||
        typeof camera !== "object"
    ) {
        throw new TypeError(
            "camera e obrigatoria.",
        );
    }

    const normalizedFrameWidth =
        requireFrameDimension(
            frameWidth,
            "frameWidth",
        );

    const normalizedFrameHeight =
        requireFrameDimension(
            frameHeight,
            "frameHeight",
        );

    const transport =
        normalizeTransport(
            camera.endpoint?.transport,
        );

    const rtspUrl =
        buildRtspUrl({
            endpoint:
                camera.endpoint,
            credentials,
        });

    return [
        "-hide_banner",
        "-loglevel",
        "warning",
        "-nostats",
        "-progress",
        "pipe:3",
        "-rtsp_transport",
        transport,
        "-timeout",
        "10000000",
        "-i",
        rtspUrl,
        "-map",
        "0:v:0",
        "-an",
        "-vf",
        `scale=${normalizedFrameWidth}:${normalizedFrameHeight}`,
        "-pix_fmt",
        "bgr24",
        "-f",
        "rawvideo",
        "pipe:1",
    ];
}

function normalizeIngestMode(
    value,
) {
    const ingestMode =
        value === undefined ||
        value === null
            ? "ffmpeg-rtsp"
            : requireNonEmptyString(
                value,
                "ingestMode",
            ).toLowerCase();

    if (
        ingestMode !== "ffmpeg-rtsp" &&
        ingestMode !== "native-h265-tcp"
    ) {
        throw new TypeError(
            "ingestMode deve ser ffmpeg-rtsp ou native-h265-tcp.",
        );
    }

    return ingestMode;
}

export function buildH265DecoderFfmpegArgs({
    frameWidth = 1920,
    frameHeight = 1080,
} = {}) {
    const normalizedFrameWidth =
        requireFrameDimension(
            frameWidth,
            "frameWidth",
        );

    const normalizedFrameHeight =
        requireFrameDimension(
            frameHeight,
            "frameHeight",
        );

    return [
        "-hide_banner",
        "-loglevel",
        "warning",
        "-nostats",
        "-progress",
        "pipe:3",
        "-f",
        "hevc",
        "-i",
        "pipe:0",
        "-an",
        "-vf",
        `scale=${normalizedFrameWidth}:${normalizedFrameHeight}`,
        "-pix_fmt",
        "bgr24",
        "-f",
        "rawvideo",
        "pipe:1",
    ];
}

function createLegacyRtspSession({
    camera,
    credentials = {},
    ffmpeg,
    health,
    logger = null,
    reconnectPolicy =
        createReconnectPolicy(),
    setTimer =
        setTimeout,
    clearTimer =
        clearTimeout,
    stableFrameThreshold = 2,
    frameWidth = 1920,
    frameHeight = 1080,
} = {}) {
    if (
        !camera ||
        typeof camera !== "object"
    ) {
        throw new TypeError(
            "camera e obrigatoria.",
        );
    }

    const cameraId =
        requireNonEmptyString(
            camera.id,
            "camera.id",
        );

    if (
        !ffmpeg ||
        typeof ffmpeg.start !== "function" ||
        typeof ffmpeg.stop !== "function"
    ) {
        throw new TypeError(
            "ffmpeg deve expor start e stop.",
        );
    }

    if (
        !health ||
        typeof health.markOnline !== "function" ||
        typeof health.markStable !== "function" ||
        typeof health.markDegraded !== "function" ||
        typeof health.markOffline !== "function" ||
        typeof health.recordFrame !== "function" ||
        typeof health.recordReconnectAttempt !== "function"
    ) {
        throw new TypeError(
            "health deve ser um CameraHealthTracker compativel.",
        );
    }

    if (
        !reconnectPolicy ||
        typeof reconnectPolicy.next !== "function" ||
        typeof reconnectPolicy.reset !== "function" ||
        typeof reconnectPolicy.snapshot !== "function"
    ) {
        throw new TypeError(
            "reconnectPolicy invalida.",
        );
    }

    if (
        typeof setTimer !== "function" ||
        typeof clearTimer !== "function"
    ) {
        throw new TypeError(
            "setTimer e clearTimer devem ser funcoes.",
        );
    }

    const normalizedStableFrameThreshold =
        requireStableFrameThreshold(
            stableFrameThreshold,
        );

    const normalizedFrameWidth =
        requireFrameDimension(
            frameWidth,
            "frameWidth",
        );

    const normalizedFrameHeight =
        requireFrameDimension(
            frameHeight,
            "frameHeight",
        );

    const endpoint =
        describeRtspEndpoint(
            camera.endpoint,
        );

    const frameAssembler =
        createRawBgrFrameAssembler({
            width:
                normalizedFrameWidth,
            height:
                normalizedFrameHeight,
        });

    const latestFrameQueue =
        createLatestFrameQueue();

    let stderrBytes =
        0;

    let child =
        null;

    let reconnectTimer =
        null;

    let state =
        "STOPPED";

    let firstFrameSeen =
        false;

    let lastFrame =
        0;

    let stopRequested =
        false;

    let stableFrameCount =
        0;

    let generation =
        0;

    function snapshot() {
        return Object.freeze({
            cameraId,
            state,
            running:
                Boolean(
                    child,
                ) &&
                (
                    state === "STARTING" ||
                    state === "RUNNING" ||
                    state === "STOPPING"
                ),
            firstFrameSeen,
            lastFrame,
            stableFrameCount,
            reconnectScheduled:
                reconnectTimer !== null,
            reconnect:
                reconnectPolicy.snapshot(),
            frames:
                Object.freeze({
                    format:
                        "bgr24",
                    width:
                        normalizedFrameWidth,
                    height:
                        normalizedFrameHeight,
                    assembler:
                        frameAssembler.snapshot(),
                    queue:
                        latestFrameQueue.snapshot(),
                    stderrBytes,
                }),
            endpoint,
        });
    }

    function clearPendingReconnect() {
        if (reconnectTimer === null) {
            return false;
        }

        clearTimer(
            reconnectTimer,
        );

        reconnectTimer =
            null;

        return true;
    }

    function scheduleReconnect(
        reason,
    ) {
        if (
            stopRequested ||
            reconnectTimer !== null
        ) {
            return snapshot();
        }

        const decision =
            reconnectPolicy.next();

        state =
            "RECONNECTING";

        health.markDegraded(
            "rtsp_reconnecting",
        );

        logger?.warn?.(
            "rtsp.session.reconnect_scheduled",
            {
                cameraId,
                attempt:
                    decision.attempt,
                delayMs:
                    decision.delayMs,
                reason,
            },
        );

        reconnectTimer =
            setTimer(
                () => {
                    reconnectTimer =
                        null;

                    if (stopRequested) {
                        state =
                            "STOPPED";

                        health.markOffline(
                            "stopped",
                        );

                        return;
                    }

                    health.recordReconnectAttempt(
                        reason,
                    );

                    launch({
                        isReconnect:
                            true,
                    });
                },
                decision.delayMs,
            );

        return snapshot();
    }

    function launch({
        isReconnect,
    }) {
        if (stopRequested) {
            return snapshot();
        }

        state =
            "STARTING";

        if (!isReconnect) {
            health.markDegraded(
                "rtsp_starting",
            );
        }

        stableFrameCount =
            0;

        frameAssembler.reset();
        latestFrameQueue.reset();

        stderrBytes =
            0;

        const args =
            buildRtspFfmpegArgs({
                camera,
                credentials,
                frameWidth:
                    normalizedFrameWidth,
                frameHeight:
                    normalizedFrameHeight,
            });

        logger?.info?.(
            isReconnect
                ? "rtsp.session.reconnect_starting"
                : "rtsp.session.starting",
            {
                cameraId,
                endpoint,
            },
        );

        let currentChild;

        try {
            currentChild =
                ffmpeg.start({
                    cameraId,
                    args,
                });

            if (
                !currentChild?.stdio?.[3] ||
                typeof currentChild.stdio[3].on !==
                    "function"
            ) {
                throw new Error(
                    "FFmpeg nao expos pipe:3 para progress.",
                );
            }
        }
        catch (error) {
            if (currentChild) {
                try {
                    ffmpeg.stop(
                        currentChild,
                    );
                }
                catch {
                    /*
                     * Falha ao encerrar um child incompleto nao deve
                     * mascarar a causa original de inicializacao.
                     */
                }
            }

            child =
                null;

            state =
                "STOPPED";

            health.markOffline(
                "ffmpeg_start_failed",
            );

            logger?.error?.(
                "rtsp.session.start_failed",
                {
                    cameraId,
                    error,
                    reconnect:
                        isReconnect,
                },
            );

            if (
                isReconnect &&
                !stopRequested
            ) {
                scheduleReconnect(
                    "ffmpeg_start_failed",
                );

                return snapshot();
            }

            throw error;
        }

        child =
            currentChild;

        generation +=
            1;

        const currentGeneration =
            generation;

        let finished =
            false;

        let runFirstFrameSeen =
            false;

        const progressState = {
            buffer:
                "",
            lastFrame:
                0,
        };

        function onFrame(
            frame,
        ) {
            if (
                currentGeneration !==
                generation
            ) {
                return;
            }

            lastFrame =
                frame;

            stableFrameCount +=
                1;

            if (!runFirstFrameSeen) {
                runFirstFrameSeen =
                    true;

                firstFrameSeen =
                    true;

                state =
                    "RUNNING";

                health.markOnline({
                    resetReconnectAttempts:
                        !isReconnect,
                });

                logger?.info?.(
                    isReconnect
                        ? "rtsp.session.recovered_first_frame"
                        : "rtsp.session.first_frame",
                    {
                        cameraId,
                        frame,
                    },
                );
            }
            else {
                health.recordFrame();
            }

            if (
                isReconnect &&
                stableFrameCount >=
                    normalizedStableFrameThreshold &&
                reconnectPolicy
                    .snapshot()
                    .attempt >
                    0
            ) {
                reconnectPolicy.reset();

                health.markStable();

                logger?.info?.(
                    "rtsp.session.recovery_stable",
                    {
                        cameraId,
                        frame,
                        stableFrameCount,
                    },
                );
            }
        }

        function finish({
            reason,
            code = null,
            signal = null,
            error = null,
        }) {
            if (finished) {
                return;
            }

            finished =
                true;

            if (
                currentGeneration !==
                generation
            ) {
                return;
            }

            if (
                child ===
                currentChild
            ) {
                child =
                    null;
            }

            frameAssembler.reset();
            latestFrameQueue.reset();

            stderrBytes =
                0;

            if (stopRequested) {
                state =
                    "STOPPED";

                reconnectPolicy.reset();

                health.markOffline(
                    "stopped",
                );

                logger?.info?.(
                    "rtsp.session.exited",
                    {
                        cameraId,
                        code,
                        signal,
                        reason:
                            "stopped",
                    },
                );

                return;
            }

            state =
                "STOPPED";

            health.markOffline(
                reason,
            );

            if (error) {
                logger?.error?.(
                    "rtsp.session.process_error",
                    {
                        cameraId,
                        error,
                    },
                );
            }
            else {
                logger?.warn?.(
                    "rtsp.session.unexpected_exit",
                    {
                        cameraId,
                        code,
                        signal,
                        reason,
                    },
                );
            }

            scheduleReconnect(
                reason,
            );
        }

        currentChild.stdout?.on?.(
            "data",
            (
                chunk,
            ) => {
                if (
                    currentGeneration !==
                    generation
                ) {
                    return;
                }

                try {
                    const frames =
                        frameAssembler.push(
                            chunk,
                        );

                    for (
                        const frame of
                        frames
                    ) {
                        latestFrameQueue.push(
                            frame,
                        );
                    }
                }
                catch (error) {
                    try {
                        ffmpeg.stop(
                            currentChild,
                        );
                    }
                    catch {
                        /*
                         * O finish abaixo preserva o erro original
                         * do pipeline de frames.
                         */
                    }

                    finish({
                        reason:
                            "raw_frame_pipeline_error",
                        error,
                    });
                }
            },
        );

        currentChild.stdio[3].on(
            "data",
            (
                chunk,
            ) => {
                consumeProgressChunk(
                    progressState,
                    chunk,
                    onFrame,
                );
            },
        );

        currentChild.stderr?.on?.(
            "data",
            (
                chunk,
            ) => {
                if (
                    currentGeneration !==
                    generation
                ) {
                    return;
                }

                const chunkBytes =
                    Number(
                        chunk?.byteLength ??
                        0,
                    );

                if (
                    Number.isSafeInteger(
                        chunkBytes,
                    ) &&
                    chunkBytes > 0
                ) {
                    stderrBytes +=
                        chunkBytes;
                }
            },
        );

        currentChild.once?.(
            "error",
            (
                error,
            ) => {
                finish({
                    reason:
                        "ffmpeg_error",
                    error,
                });
            },
        );

        currentChild.once?.(
            "exit",
            (
                code,
                signal,
            ) => {
                finish({
                    reason:
                        runFirstFrameSeen
                            ? "ffmpeg_exit"
                            : "ffmpeg_exit_before_first_frame",
                    code:
                        code ?? null,
                    signal:
                        signal ?? null,
                });
            },
        );

        return snapshot();
    }

    function start() {
        if (
            child ||
            reconnectTimer !== null ||
            state !== "STOPPED"
        ) {
            throw new Error(
                `Sessao RTSP ja iniciada: ${cameraId}`,
            );
        }

        stopRequested =
            false;

        firstFrameSeen =
            false;

        lastFrame =
            0;

        stableFrameCount =
            0;

        reconnectPolicy.reset();

        return launch({
            isReconnect:
                false,
        });
    }

    function stop() {
        const reconnectWasPending =
            clearPendingReconnect();

        frameAssembler.reset();
        latestFrameQueue.reset();

        stderrBytes =
            0;

        if (
            !child &&
            (
                state === "STOPPED" ||
                state === "RECONNECTING"
            )
        ) {
            if (
                !reconnectWasPending &&
                state === "STOPPED"
            ) {
                return false;
            }

            stopRequested =
                true;

            state =
                "STOPPED";

            reconnectPolicy.reset();

            health.markOffline(
                "stopped",
            );

            logger?.info?.(
                "rtsp.session.reconnect_cancelled",
                {
                    cameraId,
                },
            );

            return true;
        }

        if (!child) {
            return false;
        }

        stopRequested =
            true;

        state =
            "STOPPING";

        health.markDegraded(
            "rtsp_stopping",
        );

        logger?.info?.(
            "rtsp.session.stopping",
            {
                cameraId,
            },
        );

        const stopped =
            ffmpeg.stop(
                child,
            );

        if (!stopped) {
            child =
                null;

            state =
                "STOPPED";

            reconnectPolicy.reset();

            health.markOffline(
                "stopped",
            );
        }

        return stopped;
    }

    function takeLatestFrame() {
        return latestFrameQueue.take();
    }

    return Object.freeze({
        start,
        stop,
        snapshot,
        takeLatestFrame,
    });
}

function createNativeH265RtspSession({
    camera,
    credentials = {},
    ffmpeg,
    health,
    logger = null,
    reconnectPolicy =
        createReconnectPolicy(),
    setTimer =
        setTimeout,
    clearTimer =
        clearTimeout,
    stableFrameThreshold = 2,
    frameWidth = 1920,
    frameHeight = 1080,
    interleavedClientFactory =
        createRtspTcpInterleavedClient,
} = {}) {
    if (
        !camera ||
        typeof camera !== "object"
    ) {
        throw new TypeError(
            "camera e obrigatoria.",
        );
    }

    const cameraId =
        requireNonEmptyString(
            camera.id,
            "camera.id",
        );

    if (
        !ffmpeg ||
        typeof ffmpeg.start !== "function" ||
        typeof ffmpeg.stop !== "function"
    ) {
        throw new TypeError(
            "ffmpeg deve expor start e stop.",
        );
    }

    if (
        !health ||
        typeof health.markOnline !== "function" ||
        typeof health.markStable !== "function" ||
        typeof health.markDegraded !== "function" ||
        typeof health.markOffline !== "function" ||
        typeof health.recordFrame !== "function" ||
        typeof health.recordReconnectAttempt !== "function"
    ) {
        throw new TypeError(
            "health deve ser um CameraHealthTracker compativel.",
        );
    }

    if (
        !reconnectPolicy ||
        typeof reconnectPolicy.next !== "function" ||
        typeof reconnectPolicy.reset !== "function" ||
        typeof reconnectPolicy.snapshot !== "function"
    ) {
        throw new TypeError(
            "reconnectPolicy invalida.",
        );
    }

    if (
        typeof setTimer !== "function" ||
        typeof clearTimer !== "function"
    ) {
        throw new TypeError(
            "setTimer e clearTimer devem ser funcoes.",
        );
    }

    if (
        typeof interleavedClientFactory !==
        "function"
    ) {
        throw new TypeError(
            "interleavedClientFactory deve ser funcao.",
        );
    }

    const normalizedStableFrameThreshold =
        requireStableFrameThreshold(
            stableFrameThreshold,
        );

    const normalizedFrameWidth =
        requireFrameDimension(
            frameWidth,
            "frameWidth",
        );

    const normalizedFrameHeight =
        requireFrameDimension(
            frameHeight,
            "frameHeight",
        );

    const endpoint =
        describeRtspEndpoint(
            camera.endpoint,
        );

    const frameAssembler =
        createRawBgrFrameAssembler({
            width:
                normalizedFrameWidth,
            height:
                normalizedFrameHeight,
        });

    const latestFrameQueue =
        createLatestFrameQueue();

    let stderrBytes =
        0;

    let child =
        null;

    let sourceClient =
        null;

    let reconnectTimer =
        null;

    let state =
        "STOPPED";

    let firstFrameSeen =
        false;

    let lastFrame =
        0;

    let stopRequested =
        false;

    let stableFrameCount =
        0;

    let generation =
        0;

    function snapshot() {
        return Object.freeze({
            cameraId,
            state,
            running:
                Boolean(
                    child,
                ) &&
                (
                    state === "STARTING" ||
                    state === "RUNNING" ||
                    state === "STOPPING"
                ),
            firstFrameSeen,
            lastFrame,
            stableFrameCount,
            reconnectScheduled:
                reconnectTimer !== null,
            reconnect:
                reconnectPolicy.snapshot(),
            frames:
                Object.freeze({
                    format:
                        "bgr24",
                    width:
                        normalizedFrameWidth,
                    height:
                        normalizedFrameHeight,
                    assembler:
                        frameAssembler.snapshot(),
                    queue:
                        latestFrameQueue.snapshot(),
                    stderrBytes,
                }),
            endpoint,
        });
    }

    function clearPendingReconnect() {
        if (reconnectTimer === null) {
            return false;
        }

        clearTimer(
            reconnectTimer,
        );

        reconnectTimer =
            null;

        return true;
    }

    function scheduleReconnect(
        reason,
    ) {
        if (
            stopRequested ||
            reconnectTimer !== null
        ) {
            return snapshot();
        }

        const decision =
            reconnectPolicy.next();

        state =
            "RECONNECTING";

        health.markDegraded(
            "rtsp_reconnecting",
        );

        logger?.warn?.(
            "rtsp.session.reconnect_scheduled",
            {
                cameraId,
                attempt:
                    decision.attempt,
                delayMs:
                    decision.delayMs,
                reason,
            },
        );

        reconnectTimer =
            setTimer(
                () => {
                    reconnectTimer =
                        null;

                    if (stopRequested) {
                        state =
                            "STOPPED";

                        health.markOffline(
                            "stopped",
                        );

                        return;
                    }

                    health.recordReconnectAttempt(
                        reason,
                    );

                    launch({
                        isReconnect:
                            true,
                    });
                },
                decision.delayMs,
            );

        return snapshot();
    }

    function launch({
        isReconnect,
    }) {
        if (stopRequested) {
            return snapshot();
        }

        state =
            "STARTING";

        if (!isReconnect) {
            health.markDegraded(
                "rtsp_starting",
            );
        }

        stableFrameCount =
            0;

        frameAssembler.reset();
        latestFrameQueue.reset();

        stderrBytes =
            0;

        logger?.info?.(
            isReconnect
                ? "rtsp.session.reconnect_starting"
                : "rtsp.session.starting",
            {
                cameraId,
                endpoint,
            },
        );

        let currentSource;

        try {
            currentSource =
                interleavedClientFactory({
                    camera,
                    credentials,
                    logger,
                });

            if (
                !currentSource ||
                typeof currentSource.start !== "function" ||
                typeof currentSource.stop !== "function" ||
                typeof currentSource.pause !== "function" ||
                typeof currentSource.resume !== "function"
            ) {
                throw new TypeError(
                    "interleavedClientFactory retornou cliente invalido.",
                );
            }
        }
        catch (error) {
            state =
                "STOPPED";

            health.markOffline(
                "rtsp_native_client_create_failed",
            );

            if (
                isReconnect &&
                !stopRequested
            ) {
                scheduleReconnect(
                    "rtsp_native_client_create_failed",
                );

                return snapshot();
            }

            throw error;
        }

        const args =
            buildH265DecoderFfmpegArgs({
                frameWidth:
                    normalizedFrameWidth,
                frameHeight:
                    normalizedFrameHeight,
            });

        let currentChild;

        try {
            currentChild =
                ffmpeg.start({
                    cameraId,
                    args,
                    stdinMode:
                        "pipe",
                });

            if (
                !currentChild?.stdin ||
                typeof currentChild.stdin.write !==
                    "function"
            ) {
                throw new Error(
                    "FFmpeg nao expos stdin para HEVC Annex-B.",
                );
            }

            if (
                !currentChild?.stdio?.[3] ||
                typeof currentChild.stdio[3].on !==
                    "function"
            ) {
                throw new Error(
                    "FFmpeg nao expos pipe:3 para progress.",
                );
            }
        }
        catch (error) {
            if (currentChild) {
                try {
                    ffmpeg.stop(
                        currentChild,
                    );
                }
                catch {
                    /* Intentionally ignored: best-effort cleanup. */
                }
            }

            state =
                "STOPPED";

            health.markOffline(
                "ffmpeg_start_failed",
            );

            if (
                isReconnect &&
                !stopRequested
            ) {
                scheduleReconnect(
                    "ffmpeg_start_failed",
                );

                return snapshot();
            }

            throw error;
        }

        child =
            currentChild;

        sourceClient =
            currentSource;

        generation +=
            1;

        const currentGeneration =
            generation;

        let finished =
            false;

        let runFirstFrameSeen =
            false;

        let backpressured =
            false;

        const progressState = {
            buffer:
                "",
            lastFrame:
                0,
        };

        function onFrame(
            frame,
        ) {
            if (
                currentGeneration !==
                generation
            ) {
                return;
            }

            lastFrame =
                frame;

            stableFrameCount +=
                1;

            if (!runFirstFrameSeen) {
                runFirstFrameSeen =
                    true;

                firstFrameSeen =
                    true;

                state =
                    "RUNNING";

                health.markOnline({
                    resetReconnectAttempts:
                        !isReconnect,
                });

                logger?.info?.(
                    isReconnect
                        ? "rtsp.session.recovered_first_frame"
                        : "rtsp.session.first_frame",
                    {
                        cameraId,
                        frame,
                    },
                );
            }
            else {
                health.recordFrame();
            }

            if (
                isReconnect &&
                stableFrameCount >=
                    normalizedStableFrameThreshold &&
                reconnectPolicy
                    .snapshot()
                    .attempt >
                    0
            ) {
                reconnectPolicy.reset();

                health.markStable();

                logger?.info?.(
                    "rtsp.session.recovery_stable",
                    {
                        cameraId,
                        frame,
                        stableFrameCount,
                    },
                );
            }
        }

        function stopSourceBestEffort() {
            if (
                sourceClient ===
                currentSource
            ) {
                sourceClient =
                    null;
            }

            try {
                Promise.resolve(
                    currentSource.stop(),
                ).catch(
                    () => {},
                );
            }
            catch {
                /* Intentionally ignored: best-effort cleanup. */
            }
        }

        function stopChildBestEffort() {
            try {
                currentChild.stdin?.end?.();
            }
            catch {
                /* Intentionally ignored: best-effort cleanup. */
            }

            try {
                ffmpeg.stop(
                    currentChild,
                );
            }
            catch {
                /* Intentionally ignored: best-effort cleanup. */
            }
        }

        function finish({
            reason,
            code = null,
            signal = null,
            error = null,
            stopChild = false,
        }) {
            if (finished) {
                return;
            }

            finished =
                true;

            if (
                currentGeneration !==
                generation
            ) {
                return;
            }

            stopSourceBestEffort();

            if (stopChild) {
                stopChildBestEffort();
            }

            if (
                child ===
                currentChild
            ) {
                child =
                    null;
            }

            frameAssembler.reset();
            latestFrameQueue.reset();

            stderrBytes =
                0;

            if (stopRequested) {
                state =
                    "STOPPED";

                reconnectPolicy.reset();

                health.markOffline(
                    "stopped",
                );

                logger?.info?.(
                    "rtsp.session.exited",
                    {
                        cameraId,
                        code,
                        signal,
                        reason:
                            "stopped",
                    },
                );

                return;
            }

            state =
                "STOPPED";

            health.markOffline(
                reason,
            );

            if (error) {
                logger?.error?.(
                    "rtsp.session.process_error",
                    {
                        cameraId,
                        error,
                    },
                );
            }
            else {
                logger?.warn?.(
                    "rtsp.session.unexpected_exit",
                    {
                        cameraId,
                        code,
                        signal,
                        reason,
                    },
                );
            }

            scheduleReconnect(
                reason,
            );
        }

        currentChild.stdout?.on?.(
            "data",
            (
                chunk,
            ) => {
                if (
                    currentGeneration !==
                    generation
                ) {
                    return;
                }

                try {
                    const frames =
                        frameAssembler.push(
                            chunk,
                        );

                    for (
                        const frame of
                        frames
                    ) {
                        latestFrameQueue.push(
                            frame,
                        );
                    }
                }
                catch (error) {
                    finish({
                        reason:
                            "raw_frame_pipeline_error",
                        error,
                        stopChild:
                            true,
                    });
                }
            },
        );

        currentChild.stdio[3].on(
            "data",
            (
                chunk,
            ) => {
                consumeProgressChunk(
                    progressState,
                    chunk,
                    onFrame,
                );
            },
        );

        currentChild.stderr?.on?.(
            "data",
            (
                chunk,
            ) => {
                if (
                    currentGeneration !==
                    generation
                ) {
                    return;
                }

                const chunkBytes =
                    Number(
                        chunk?.byteLength ??
                        0,
                    );

                if (
                    Number.isSafeInteger(
                        chunkBytes,
                    ) &&
                    chunkBytes > 0
                ) {
                    stderrBytes +=
                        chunkBytes;
                }
            },
        );

        currentChild.once?.(
            "error",
            (
                error,
            ) => {
                finish({
                    reason:
                        "ffmpeg_error",
                    error,
                });
            },
        );

        currentChild.once?.(
            "exit",
            (
                code,
                signal,
            ) => {
                finish({
                    reason:
                        runFirstFrameSeen
                            ? "ffmpeg_exit"
                            : "ffmpeg_exit_before_first_frame",
                    code:
                        code ?? null,
                    signal:
                        signal ?? null,
                });
            },
        );

        currentChild.stdin?.on?.(
            "error",
            (
                error,
            ) => {
                finish({
                    reason:
                        "ffmpeg_stdin_error",
                    error,
                    stopChild:
                        true,
                });
            },
        );

        function writeAnnexB(
            chunk,
        ) {
            if (
                finished ||
                currentGeneration !==
                    generation
            ) {
                return false;
            }

            const accepted =
                currentChild.stdin.write(
                    chunk,
                );

            if (
                !accepted &&
                !backpressured
            ) {
                backpressured =
                    true;

                currentSource.pause();

                currentChild.stdin.once(
                    "drain",
                    () => {
                        if (
                            finished ||
                            currentGeneration !==
                                generation
                        ) {
                            return;
                        }

                        backpressured =
                            false;

                        currentSource.resume();
                    },
                );
            }

            return accepted;
        }

        Promise.resolve()
            .then(
                () =>
                    currentSource.start({
                        onAnnexB:
                            writeAnnexB,
                        onError:
                            (
                                error,
                            ) => {
                                finish({
                                    reason:
                                        "rtsp_native_error",
                                    error,
                                    stopChild:
                                        true,
                                });
                            },
                        onClose:
                            () => {
                                finish({
                                    reason:
                                        "rtsp_native_closed",
                                    stopChild:
                                        true,
                                });
                            },
                    }),
            )
            .catch(
                (
                    error,
                ) => {
                    finish({
                        reason:
                            "rtsp_native_start_failed",
                        error,
                        stopChild:
                            true,
                    });
                },
            );

        return snapshot();
    }

    function start() {
        if (
            child ||
            reconnectTimer !== null ||
            state !== "STOPPED"
        ) {
            throw new Error(
                `Sessao RTSP ja iniciada: ${cameraId}`,
            );
        }

        stopRequested =
            false;

        firstFrameSeen =
            false;

        lastFrame =
            0;

        stableFrameCount =
            0;

        reconnectPolicy.reset();

        return launch({
            isReconnect:
                false,
        });
    }

    function stop() {
        const reconnectWasPending =
            clearPendingReconnect();

        frameAssembler.reset();
        latestFrameQueue.reset();

        stderrBytes =
            0;

        if (
            !child &&
            (
                state === "STOPPED" ||
                state === "RECONNECTING"
            )
        ) {
            if (
                !reconnectWasPending &&
                state === "STOPPED"
            ) {
                return false;
            }

            stopRequested =
                true;

            state =
                "STOPPED";

            reconnectPolicy.reset();

            health.markOffline(
                "stopped",
            );

            logger?.info?.(
                "rtsp.session.reconnect_cancelled",
                {
                    cameraId,
                },
            );

            return true;
        }

        if (!child) {
            return false;
        }

        stopRequested =
            true;

        state =
            "STOPPING";

        health.markDegraded(
            "rtsp_stopping",
        );

        logger?.info?.(
            "rtsp.session.stopping",
            {
                cameraId,
            },
        );

        const currentChild =
            child;

        const currentSource =
            sourceClient;

        sourceClient =
            null;

        if (currentSource) {
            try {
                Promise.resolve(
                    currentSource.stop(),
                ).catch(
                    () => {},
                );
            }
            catch {
                /* Intentionally ignored: best-effort cleanup. */
            }
        }

        try {
            currentChild?.stdin?.end?.();
        }
        catch {
            /* Intentionally ignored: best-effort cleanup. */
        }

        const stopped =
            currentChild
                ? ffmpeg.stop(
                    currentChild,
                )
                : false;

        if (
            !stopped &&
            child === currentChild
        ) {
            child =
                null;

            state =
                "STOPPED";

            reconnectPolicy.reset();

            health.markOffline(
                "stopped",
            );
        }

        return Boolean(
            stopped ||
            currentSource,
        );
    }

    function takeLatestFrame() {
        return latestFrameQueue.take();
    }

    return Object.freeze({
        start,
        stop,
        snapshot,
        takeLatestFrame,
    });
}

export function createRtspSession(
    options = {},
) {
    const ingestMode =
        normalizeIngestMode(
            options?.ingestMode,
        );

    if (ingestMode === "ffmpeg-rtsp") {
        return createLegacyRtspSession(
            options,
        );
    }

    return createNativeH265RtspSession(
        options,
    );
}
