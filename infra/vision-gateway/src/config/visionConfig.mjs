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

const BROKER_DEFAULT_TIMEOUT_MS = 5000;
const BROKER_MAX_TIMEOUT_MS = 30000;
const BROKER_MAX_TOKEN_BYTES = 4096;

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

function readBrokerTimeoutMs(env) {
    const value = readPositiveInteger(
        env,
        "SAFESCAN_BIOMETRIC_BROKER_TIMEOUT_MS",
        BROKER_DEFAULT_TIMEOUT_MS,
    );

    if (value > BROKER_MAX_TIMEOUT_MS) {
        throw new Error(
            `SAFESCAN_BIOMETRIC_BROKER_TIMEOUT_MS deve estar entre 1 e ${BROKER_MAX_TIMEOUT_MS}.`,
        );
    }

    return value;
}

function normalizeBrokerUrl(value) {
    let parsed;

    try {
        parsed = new URL(value);
    }
    catch {
        throw new Error(
            "SAFESCAN_BIOMETRIC_BROKER_URL deve ser uma URL valida.",
        );
    }

    if (parsed.protocol !== "https:") {
        throw new Error(
            "SAFESCAN_BIOMETRIC_BROKER_URL deve usar HTTPS.",
        );
    }

    if (parsed.username || parsed.password || parsed.search || parsed.hash) {
        throw new Error(
            "SAFESCAN_BIOMETRIC_BROKER_URL nao pode conter credenciais, query ou fragmento.",
        );
    }

    let href =
        parsed.href;

    while (
        href.endsWith(
            "/",
        )
    ) {
        href =
            href.slice(
                0,
                -1,
            );
    }

    return href;
}

function normalizeBrokerToken(value) {
    const byteLength = new TextEncoder().encode(value).byteLength;

    if (byteLength < 32 || byteLength > BROKER_MAX_TOKEN_BYTES) {
        throw new Error(
            `SAFESCAN_BIOMETRIC_BROKER_TOKEN deve possuir entre 32 e ${BROKER_MAX_TOKEN_BYTES} bytes.`,
        );
    }

    return value;
}

function loadBrokerConfig(env) {
    const url = readTrimmed(env, "SAFESCAN_BIOMETRIC_BROKER_URL");
    const token = readTrimmed(env, "SAFESCAN_BIOMETRIC_BROKER_TOKEN");

    if (!url && !token) {
        return null;
    }

    if (!url) {
        throw new Error(
            "SAFESCAN_BIOMETRIC_BROKER_URL e obrigatorio quando o broker e configurado.",
        );
    }

    if (!token) {
        throw new Error(
            "SAFESCAN_BIOMETRIC_BROKER_TOKEN e obrigatorio quando o broker e configurado.",
        );
    }

    return Object.freeze({
        url: normalizeBrokerUrl(url),
        token: normalizeBrokerToken(token),
        timeoutMs: readBrokerTimeoutMs(env),
    });
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

    const broker =
        loadBrokerConfig(
            env,
        );

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
        broker,
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
        broker:
            config.broker
                ? Object.freeze({
                    configured: true,
                    timeoutMs: config.broker.timeoutMs,
                })
                : null,
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
