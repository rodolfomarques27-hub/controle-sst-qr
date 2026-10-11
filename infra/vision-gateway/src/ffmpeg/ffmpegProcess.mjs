import {
    spawn,
} from "node:child_process";

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

function normalizeArgs(
    args,
) {
    if (!Array.isArray(args)) {
        throw new TypeError(
            "args deve ser um array.",
        );
    }

    return args.map(
        (
            value,
            index,
        ) => {
            if (
                typeof value !== "string"
            ) {
                throw new TypeError(
                    `args[${index}] deve ser string.`,
                );
            }

            return value;
        },
    );
}

export function createFfmpegProcess({
    ffmpegPath = "ffmpeg",
    spawnImpl = spawn,
    logger = null,
} = {}) {
    const executable =
        requireNonEmptyString(
            ffmpegPath,
            "ffmpegPath",
        );

    if (
        typeof spawnImpl !== "function"
    ) {
        throw new TypeError(
            "spawnImpl deve ser uma funcao.",
        );
    }

    function start({
        cameraId,
        args = [],
    }) {
        const normalizedCameraId =
            requireNonEmptyString(
                cameraId,
                "cameraId",
            );

        const normalizedArgs =
            normalizeArgs(
                args,
            );

        /*
         * Nunca registrar os argumentos do FFmpeg.
         * URLs RTSP podem conter credenciais.
         */
        logger?.info?.(
            "ffmpeg.process.starting",
            {
                cameraId:
                    normalizedCameraId,
                executable,
                argumentCount:
                    normalizedArgs.length,
            },
        );

        const child =
            spawnImpl(
                executable,
                normalizedArgs,
                {
                    stdio: [
                        "ignore",
                        "pipe",
                        "pipe",
                        "pipe",
                    ],
                    windowsHide:
                        true,
                },
            );

        child.once(
            "spawn",
            () => {
                logger?.info?.(
                    "ffmpeg.process.spawned",
                    {
                        cameraId:
                            normalizedCameraId,
                        pid:
                            child.pid ?? null,
                    },
                );
            },
        );

        child.once(
            "error",
            (
                error,
            ) => {
                logger?.error?.(
                    "ffmpeg.process.error",
                    {
                        cameraId:
                            normalizedCameraId,
                        error,
                    },
                );
            },
        );

        child.once(
            "exit",
            (
                code,
                signal,
            ) => {
                logger?.info?.(
                    "ffmpeg.process.exit",
                    {
                        cameraId:
                            normalizedCameraId,
                        code:
                            code ?? null,
                        signal:
                            signal ?? null,
                    },
                );
            },
        );

        return child;
    }

    function stop(
        child,
        {
            signal = "SIGTERM",
        } = {},
    ) {
        if (
            !child ||
            typeof child.kill !== "function"
        ) {
            throw new TypeError(
                "child deve ser um processo FFmpeg valido.",
            );
        }

        if (
            child.exitCode !== null ||
            child.killed
        ) {
            return false;
        }

        return child.kill(
            signal,
        );
    }

    return Object.freeze({
        start,
        stop,
    });
}
