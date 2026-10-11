const LOOPBACK_HOSTS =
    new Set([
        "127.0.0.1",
        "::1",
        "localhost",
    ]);

const SUPPORTED_TRANSPORTS =
    new Set([
        "udp",
        "tcp",
    ]);

function readTrimmed(env, name) {
    const value =
        env?.[name];

    if (
        value === undefined ||
        value === null
    ) {
        return "";
    }

    return String(value).trim();
}

function readPositiveInteger(
    env,
    name,
    fallback,
) {
    const raw =
        readTrimmed(
            env,
            name,
        );

    if (!raw) {
        return fallback;
    }

    if (!/^\d+$/.test(raw)) {
        throw new Error(
            `${name} deve ser um inteiro positivo.`,
        );
    }

    const value =
        Number.parseInt(
            raw,
            10,
        );

    if (
        !Number.isSafeInteger(value) ||
        value < 1 ||
        value > 65535
    ) {
        throw new Error(
            `${name} deve estar entre 1 e 65535.`,
        );
    }

    return value;
}

function normalizeCameraPath(value) {
    if (!value) {
        return "/onvif1";
    }

    return value.startsWith("/")
        ? value
        : `/${value}`;
}

function requireValue(
    env,
    name,
) {
    const value =
        readTrimmed(
            env,
            name,
        );

    if (!value) {
        throw new Error(
            `${name} e obrigatorio quando uma camera e configurada.`,
        );
    }

    return value;
}

export function loadVisionConfig({
    env = process.env,
} = {}) {
    const serviceHost =
        readTrimmed(
            env,
            "SAFESCAN_VISION_HOST",
        ) || "127.0.0.1";

    if (
        !LOOPBACK_HOSTS.has(
            serviceHost,
        )
    ) {
        throw new Error(
            "SAFESCAN_VISION_HOST deve permanecer em loopback.",
        );
    }

    const servicePort =
        readPositiveInteger(
            env,
            "SAFESCAN_VISION_PORT",
            8787,
        );

    const ffmpegPath =
        readTrimmed(
            env,
            "SAFESCAN_FFMPEG_PATH",
        ) || "ffmpeg";

    const cameraId =
        readTrimmed(
            env,
            "SAFESCAN_CAMERA_ID",
        );

    let camera =
        null;

    if (cameraId) {
        const host =
            requireValue(
                env,
                "SAFESCAN_CAMERA_HOST",
            );

        const port =
            readPositiveInteger(
                env,
                "SAFESCAN_CAMERA_PORT",
                554,
            );

        const path =
            normalizeCameraPath(
                readTrimmed(
                    env,
                    "SAFESCAN_CAMERA_PATH",
                ),
            );

        const transport =
            (
                readTrimmed(
                    env,
                    "SAFESCAN_CAMERA_TRANSPORT",
                ) || "udp"
            ).toLowerCase();

        if (
            !SUPPORTED_TRANSPORTS.has(
                transport,
            )
        ) {
            throw new Error(
                "SAFESCAN_CAMERA_TRANSPORT deve ser udp ou tcp.",
            );
        }

        const username =
            readTrimmed(
                env,
                "SAFESCAN_CAMERA_USERNAME",
            ) || null;

        const password =
            readTrimmed(
                env,
                "SAFESCAN_CAMERA_PASSWORD",
            ) || null;

        camera =
            Object.freeze({
                id:
                    cameraId,
                endpoint:
                    Object.freeze({
                        host,
                        port,
                        path,
                        transport,
                    }),
                credentials:
                    Object.freeze({
                        username,
                        password,
                    }),
            });
    }

    return Object.freeze({
        service:
            Object.freeze({
                host:
                    serviceHost,
                port:
                    servicePort,
            }),
        ffmpeg:
            Object.freeze({
                path:
                    ffmpegPath,
            }),
        camera,
    });
}

export function toPublicVisionConfig(
    config,
) {
    if (!config) {
        throw new TypeError(
            "config e obrigatorio.",
        );
    }

    return Object.freeze({
        service:
            Object.freeze({
                host:
                    config.service.host,
                port:
                    config.service.port,
            }),
        ffmpeg:
            Object.freeze({
                path:
                    config.ffmpeg.path,
            }),
        camera:
            config.camera
                ? Object.freeze({
                    id:
                        config.camera.id,
                    endpoint:
                        Object.freeze({
                            ...config.camera.endpoint,
                        }),
                    credentialsConfigured:
                        Boolean(
                            config.camera.credentials.username &&
                            config.camera.credentials.password,
                        ),
                })
                : null,
    });
}
