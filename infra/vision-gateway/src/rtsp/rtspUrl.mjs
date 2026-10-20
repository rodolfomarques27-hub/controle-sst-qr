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

function normalizePort(
    value,
) {
    const port =
        Number(
            value,
        );

    if (
        !Number.isInteger(
            port,
        ) ||
        port < 1 ||
        port > 65535
    ) {
        throw new TypeError(
            "camera.endpoint.port deve estar entre 1 e 65535.",
        );
    }

    return port;
}

function normalizePath(
    value,
) {
    const path =
        requireNonEmptyString(
            value,
            "camera.endpoint.path",
        );

    return path.startsWith("/")
        ? path
        : `/${path}`;
}

function formatHost(
    host,
) {
    const value =
        requireNonEmptyString(
            host,
            "camera.endpoint.host",
        );

    if (
        value.startsWith("[") &&
        value.endsWith("]")
    ) {
        return value;
    }

    return value.includes(":")
        ? `[${value}]`
        : value;
}

function normalizeCredentials(
    credentials = {},
) {
    const username =
        credentials?.username === undefined ||
        credentials?.username === null
            ? ""
            : String(
                credentials.username,
            ).trim();

    const password =
        credentials?.password === undefined ||
        credentials?.password === null
            ? ""
            : String(
                credentials.password,
            );

    if (
        Boolean(
            username,
        ) !==
        Boolean(
            password,
        )
    ) {
        throw new Error(
            "Credenciais RTSP devem conter usuario e senha juntos.",
        );
    }

    return Object.freeze({
        username,
        password,
    });
}

export function buildRtspUrl({
    endpoint,
    credentials = {},
} = {}) {
    if (
        !endpoint ||
        typeof endpoint !== "object"
    ) {
        throw new TypeError(
            "endpoint e obrigatorio.",
        );
    }

    const host =
        formatHost(
            endpoint.host,
        );

    const port =
        normalizePort(
            endpoint.port,
        );

    const path =
        normalizePath(
            endpoint.path,
        );

    const {
        username,
        password,
    } =
        normalizeCredentials(
            credentials,
        );

    const auth =
        username
            ? (
                `${encodeURIComponent(
                    username,
                )}:${encodeURIComponent(
                    password,
                )}@`
            )
            : "";

    return (
        `rtsp://${auth}` +
        `${host}:${port}${path}`
    );
}

export function describeRtspEndpoint(
    endpoint,
) {
    if (
        !endpoint ||
        typeof endpoint !== "object"
    ) {
        throw new TypeError(
            "endpoint e obrigatorio.",
        );
    }

    return Object.freeze({
        host:
            requireNonEmptyString(
                endpoint.host,
                "camera.endpoint.host",
            ),
        port:
            normalizePort(
                endpoint.port,
            ),
        path:
            normalizePath(
                endpoint.path,
            ),
        transport:
            requireNonEmptyString(
                endpoint.transport,
                "camera.endpoint.transport",
            ).toLowerCase(),
    });
}
