const SUPPORTED_TRANSPORTS =
    new Set([
        "udp",
        "tcp",
    ]);

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
        Number(value);

    if (
        !Number.isInteger(port) ||
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

function normalizeTransport(
    value,
) {
    const transport =
        requireNonEmptyString(
            value,
            "camera.endpoint.transport",
        ).toLowerCase();

    if (
        !SUPPORTED_TRANSPORTS.has(
            transport,
        )
    ) {
        throw new TypeError(
            "camera.endpoint.transport deve ser udp ou tcp.",
        );
    }

    return transport;
}

function normalizeCameraDefinition(
    camera,
) {
    if (
        !camera ||
        typeof camera !== "object"
    ) {
        throw new TypeError(
            "camera deve ser um objeto.",
        );
    }

    if (
        !camera.endpoint ||
        typeof camera.endpoint !== "object"
    ) {
        throw new TypeError(
            "camera.endpoint e obrigatorio.",
        );
    }

    const id =
        requireNonEmptyString(
            camera.id,
            "camera.id",
        );

    const host =
        requireNonEmptyString(
            camera.endpoint.host,
            "camera.endpoint.host",
        );

    const port =
        normalizePort(
            camera.endpoint.port,
        );

    const path =
        normalizePath(
            camera.endpoint.path,
        );

    const transport =
        normalizeTransport(
            camera.endpoint.transport,
        );

    return Object.freeze({
        id,
        endpoint:
            Object.freeze({
                host,
                port,
                path,
                transport,
            }),
    });
}

export class CameraRegistry {
    #cameras =
        new Map();

    get size() {
        return this.#cameras.size;
    }

    register(
        camera,
    ) {
        const normalized =
            normalizeCameraDefinition(
                camera,
            );

        if (
            this.#cameras.has(
                normalized.id,
            )
        ) {
            throw new Error(
                `Camera ja registrada: ${normalized.id}`,
            );
        }

        this.#cameras.set(
            normalized.id,
            normalized,
        );

        return normalized;
    }

    get(
        cameraId,
    ) {
        return (
            this.#cameras.get(
                cameraId,
            ) ?? null
        );
    }

    has(
        cameraId,
    ) {
        return this.#cameras.has(
            cameraId,
        );
    }

    list() {
        return Array.from(
            this.#cameras.values(),
        );
    }

    updateEndpoint(
        cameraId,
        endpoint,
    ) {
        const current =
            this.#cameras.get(
                cameraId,
            );

        if (!current) {
            throw new Error(
                `Camera nao registrada: ${cameraId}`,
            );
        }

        const updated =
            normalizeCameraDefinition({
                id:
                    current.id,
                endpoint,
            });

        this.#cameras.set(
            current.id,
            updated,
        );

        return updated;
    }

    remove(
        cameraId,
    ) {
        return this.#cameras.delete(
            cameraId,
        );
    }
}
