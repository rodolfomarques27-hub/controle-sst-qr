import {
    createServer,
} from "node:http";

const LOOPBACK_HOSTS =
    new Set([
        "127.0.0.1",
        "::1",
        "localhost",
    ]);

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

export function createHealthServer({
    host = "127.0.0.1",
    port = 8787,
    getSnapshot = () => ({
        status:
            "ok",
    }),
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
