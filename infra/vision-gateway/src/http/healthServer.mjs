import {
    createServer,
} from "node:http";

const LOOPBACK_HOSTS =
    new Set([
        "127.0.0.1",
        "::1",
        "localhost",
    ]);

const BIOMETRIC_OPERATIONAL_STATES =
    new Set([
        "NOT_INITIALIZED",
        "STARTING",
        "READY",
        "RUNNING",
        "STOPPED",
        "SHUTTING_DOWN",
    ]);

const FORBIDDEN_BIOMETRIC_KEY =
    /(embedding|vector|cipher|token|secret|password|credential|frame|image|pixel|bgr)/i;

const MAX_SANITIZE_DEPTH =
    8;

function validatePort(
    port,
) {
    const value =
        Number(port);

    if (
        !Number.isInteger(value) ||
        value < 1 ||
        value > 65535
    ) {
        throw new TypeError(
            "port deve estar entre 1 e 65535.",
        );
    }

    return value;
}

function writeJson(
    response,
    statusCode,
    payload,
) {
    const body =
        JSON.stringify(
            payload,
        );

    response.writeHead(
        statusCode,
        {
            "content-type":
                "application/json; charset=utf-8",
            "content-length":
                Buffer.byteLength(
                    body,
                ),
            "cache-control":
                "no-store",
        },
    );

    response.end(
        body,
    );
}

function sanitizeValue(
    value,
    depth = 0,
) {
    if (
        value === null ||
        typeof value === "string" ||
        typeof value === "boolean"
    ) {
        return value;
    }

    if (typeof value === "number") {
        return Number.isFinite(
            value,
        )
            ? value
            : null;
    }

    if (
        value === undefined ||
        typeof value === "function" ||
        typeof value === "symbol" ||
        typeof value === "bigint"
    ) {
        return undefined;
    }

    if (
        depth >=
        MAX_SANITIZE_DEPTH
    ) {
        return null;
    }

    if (
        ArrayBuffer.isView(
            value,
        )
    ) {
        return undefined;
    }

    if (Array.isArray(value)) {
        return value
            .map(
                (
                    item,
                ) =>
                    sanitizeValue(
                        item,
                        depth + 1,
                    ),
            )
            .filter(
                (
                    item,
                ) =>
                    item !== undefined,
            );
    }

    if (typeof value === "object") {
        const sanitized =
            {};

        for (
            const [
                key,
                child,
            ] of
            Object.entries(
                value,
            )
        ) {
            if (
                FORBIDDEN_BIOMETRIC_KEY.test(
                    key,
                )
            ) {
                continue;
            }

            const safeChild =
                sanitizeValue(
                    child,
                    depth + 1,
                );

            if (safeChild !== undefined) {
                sanitized[
                    key
                ] =
                    safeChild;
            }
        }

        return sanitized;
    }

    return undefined;
}

function normalizeCounter(
    value,
) {
    return (
        Number.isSafeInteger(
            value,
        ) &&
        value >= 0
    )
        ? value
        : 0;
}

function normalizeErrorCode(
    value,
) {
    if (
        value === null ||
        value === undefined
    ) {
        return null;
    }

    if (
        typeof value !== "string" ||
        value.length > 120 ||
        !/^[A-Za-z0-9_.:-]+$/.test(
            value,
        )
    ) {
        return null;
    }

    return value;
}

function sanitizeBiometricSnapshot(
    snapshot,
) {
    if (
        !snapshot ||
        typeof snapshot !== "object" ||
        Array.isArray(
            snapshot,
        )
    ) {
        throw new TypeError(
            "snapshot biometrico invalido.",
        );
    }

    if (
        typeof snapshot.cameraId !== "string" ||
        !snapshot.cameraId.trim()
    ) {
        throw new TypeError(
            "cameraId biometrico invalido.",
        );
    }

    if (
        typeof snapshot.state !== "string" ||
        !BIOMETRIC_OPERATIONAL_STATES.has(
            snapshot.state,
        )
    ) {
        throw new TypeError(
            "estado biometrico invalido.",
        );
    }

    return {
        cameraId:
            snapshot.cameraId.trim(),

        state:
            snapshot.state,

        running:
            snapshot.running === true,

        processing:
            snapshot.processing === true,

        processedFrames:
            normalizeCounter(
                snapshot.processedFrames,
            ),

        emptyPolls:
            normalizeCounter(
                snapshot.emptyPolls,
            ),

        errorCount:
            normalizeCounter(
                snapshot.errorCount,
            ),

        lastErrorCode:
            normalizeErrorCode(
                snapshot.lastErrorCode,
            ),

        lastResult:
            sanitizeValue(
                snapshot.lastResult,
            ) ??
            null,
    };
}

function matchBiometricRoute(
    path,
) {
    const match =
        /^\/api\/v1\/cameras\/([^/]+)\/biometric$/.exec(
            path,
        );

    if (!match) {
        return null;
    }

    try {
        const cameraId =
            decodeURIComponent(
                match[1],
            ).trim();

        return {
            matched:
                true,

            cameraId:
                cameraId ||
                null,
        };
    }
    catch {
        return {
            matched:
                true,

            cameraId:
                null,
        };
    }
}

export function createHealthServer({
    host = "127.0.0.1",
    port = 8787,
    getSnapshot = () => ({
        status:
            "ok",
    }),
    getBiometricSnapshot = null,
    logger = null,
} = {}) {
    if (
        !LOOPBACK_HOSTS.has(
            host,
        )
    ) {
        throw new Error(
            "Health server deve permanecer em loopback.",
        );
    }

    const normalizedPort =
        validatePort(
            port,
        );

    if (
        typeof getSnapshot !== "function"
    ) {
        throw new TypeError(
            "getSnapshot deve ser uma funcao.",
        );
    }

    if (
        getBiometricSnapshot !== null &&
        typeof getBiometricSnapshot !== "function"
    ) {
        throw new TypeError(
            "getBiometricSnapshot deve ser funcao ou null.",
        );
    }

    const server =
        createServer(
            (
                request,
                response,
            ) => {
                const path =
                    (
                        request.url ?? "/"
                    ).split(
                        "?",
                        1,
                    )[0];

                if (
                    request.method === "GET" &&
                    path === "/health"
                ) {
                    try {
                        writeJson(
                            response,
                            200,
                            getSnapshot(),
                        );
                    }
                    catch (error) {
                        logger?.error?.(
                            "health.snapshot.error",
                            {
                                error,
                            },
                        );

                        writeJson(
                            response,
                            500,
                            {
                                status:
                                    "error",
                            },
                        );
                    }

                    return;
                }

                const biometricRoute =
                    matchBiometricRoute(
                        path,
                    );

                if (
                    request.method === "GET" &&
                    biometricRoute
                ) {
                    if (
                        typeof getBiometricSnapshot !==
                        "function"
                    ) {
                        writeJson(
                            response,
                            404,
                            {
                                error:
                                    "not_found",
                            },
                        );

                        return;
                    }

                    if (!biometricRoute.cameraId) {
                        writeJson(
                            response,
                            404,
                            {
                                error:
                                    "camera_not_found",
                            },
                        );

                        return;
                    }

                    try {
                        const snapshot =
                            getBiometricSnapshot(
                                biometricRoute.cameraId,
                            );

                        if (
                            snapshot === null ||
                            snapshot === undefined
                        ) {
                            writeJson(
                                response,
                                404,
                                {
                                    error:
                                        "camera_not_found",
                                },
                            );

                            return;
                        }

                        writeJson(
                            response,
                            200,
                            sanitizeBiometricSnapshot(
                                snapshot,
                            ),
                        );
                    }
                    catch (error) {
                        logger?.error?.(
                            "biometric.snapshot.error",
                            {
                                cameraId:
                                    biometricRoute.cameraId,
                                error,
                            },
                        );

                        writeJson(
                            response,
                            500,
                            {
                                error:
                                    "internal_error",
                            },
                        );
                    }

                    return;
                }

                writeJson(
                    response,
                    404,
                    {
                        error:
                            "not_found",
                    },
                );
            },
        );

    function start() {
        return new Promise(
            (
                resolve,
                reject,
            ) => {
                const onError =
                    (
                        error,
                    ) => {
                        server.off(
                            "listening",
                            onListening,
                        );

                        reject(
                            error,
                        );
                    };

                const onListening =
                    () => {
                        server.off(
                            "error",
                            onError,
                        );

                        logger?.info?.(
                            "health.server.listening",
                            {
                                host,
                                port:
                                    normalizedPort,
                            },
                        );

                        resolve(
                            server.address(),
                        );
                    };

                server.once(
                    "error",
                    onError,
                );

                server.once(
                    "listening",
                    onListening,
                );

                server.listen(
                    normalizedPort,
                    host,
                );
            },
        );
    }

    function stop() {
        if (!server.listening) {
            return Promise.resolve();
        }

        return new Promise(
            (
                resolve,
                reject,
            ) => {
                server.close(
                    (
                        error,
                    ) => {
                        if (error) {
                            reject(
                                error,
                            );

                            return;
                        }

                        logger?.info?.(
                            "health.server.stopped",
                        );

                        resolve();
                    },
                );
            },
        );
    }

    return Object.freeze({
        server,
        start,
        stop,
        address:
            () =>
                server.address(),
    });
}
