import {
    buildRtspUrl,
    describeRtspEndpoint,
} from "./rtspUrl.mjs";

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
} = {}) {
    if (
        !camera ||
        typeof camera !== "object"
    ) {
        throw new TypeError(
            "camera e obrigatoria.",
        );
    }

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

        /*
         * O progresso e enviado para stdout.
         * O video e descartado pelo muxer null.
         */
        "-progress",
        "pipe:1",

        /*
         * A TWG homologada respondeu corretamente
         * usando RTP/UDP.
         */
        "-rtsp_transport",
        transport,

        /*
         * Timeout FFmpeg em microssegundos.
         * 10 segundos.
         */
        "-timeout",
        "10000000",

        "-i",
        rtspUrl,

        "-map",
        "0:v:0",

        "-an",

        "-f",
        "null",
        "-",
    ];
}

export function createRtspSession({
    camera,
    credentials = {},
    ffmpeg,
    health,
    logger = null,
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
        typeof health.markDegraded !== "function" ||
        typeof health.markOffline !== "function" ||
        typeof health.recordFrame !== "function"
    ) {
        throw new TypeError(
            "health deve ser um CameraHealthTracker compativel.",
        );
    }

    const endpoint =
        describeRtspEndpoint(
            camera.endpoint,
        );

    let child =
        null;

    let state =
        "STOPPED";

    let firstFrameSeen =
        false;

    let stopRequested =
        false;

    let lastFrame =
        0;

    function snapshot() {
        return Object.freeze({
            cameraId,
            state,
            running:
                Boolean(
                    child,
                ) &&
                state !==
                    "STOPPED",
            firstFrameSeen,
            lastFrame,
            endpoint,
        });
    }

    function start() {
        if (
            child &&
            state !== "STOPPED"
        ) {
            throw new Error(
                `Sessao RTSP ja iniciada: ${cameraId}`,
            );
        }

        const args =
            buildRtspFfmpegArgs({
                camera,
                credentials,
            });

        stopRequested =
            false;

        firstFrameSeen =
            false;

        lastFrame =
            0;

        state =
            "STARTING";

        health.markDegraded(
            "rtsp_starting",
        );

        /*
         * Nao registrar URL RTSP nem argumentos.
         * Eles podem conter credenciais.
         */
        logger?.info?.(
            "rtsp.session.starting",
            {
                cameraId,
                endpoint,
            },
        );

        try {
            child =
                ffmpeg.start({
                    cameraId,
                    args,
                });
        }
        catch (error) {
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
                },
            );

            throw error;
        }

        const progressState = {
            buffer:
                "",
            lastFrame:
                0,
        };

        const onFrame =
            (
                frame,
            ) => {
                lastFrame =
                    frame;

                if (!firstFrameSeen) {
                    firstFrameSeen =
                        true;

                    state =
                        "RUNNING";

                    health.markOnline();

                    logger?.info?.(
                        "rtsp.session.first_frame",
                        {
                            cameraId,
                            frame,
                        },
                    );

                    return;
                }

                health.recordFrame();
            };

        child.stdout?.on?.(
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

        child.once?.(
            "error",
            (
                error,
            ) => {
                state =
                    "STOPPED";

                child =
                    null;

                health.markOffline(
                    "ffmpeg_error",
                );

                logger?.error?.(
                    "rtsp.session.process_error",
                    {
                        cameraId,
                        error,
                    },
                );
            },
        );

        child.once?.(
            "exit",
            (
                code,
                signal,
            ) => {
                const reason =
                    stopRequested
                        ? "stopped"
                        : firstFrameSeen
                            ? "ffmpeg_exit"
                            : "ffmpeg_exit_before_first_frame";

                state =
                    "STOPPED";

                child =
                    null;

                health.markOffline(
                    reason,
                );

                logger?.info?.(
                    "rtsp.session.exited",
                    {
                        cameraId,
                        code:
                            code ?? null,
                        signal:
                            signal ?? null,
                        reason,
                    },
                );
            },
        );

        return snapshot();
    }

    function stop() {
        if (
            !child ||
            state === "STOPPED"
        ) {
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
            state =
                "STOPPED";

            child =
                null;

            health.markOffline(
                "stopped",
            );
        }

        return stopped;
    }

    return Object.freeze({
        start,
        stop,
        snapshot,
    });
}
