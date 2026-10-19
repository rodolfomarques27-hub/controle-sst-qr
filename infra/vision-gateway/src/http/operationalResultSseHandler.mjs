const ALLOWED = new Set(["NO_FACE", "MULTIPLE_FACES"]);
const MAX_SESSION_MS = 30_000;

function reject(response, status, code) {
    const body = JSON.stringify({ error: code });

    response.writeHead(status, {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
        "content-length": Buffer.byteLength(body),
    });

    response.end(body);
    return false;
}

export function createOperationalResultSseHandler({
    bridge,
    authenticateRequest,
} = {}) {
    if (
        !bridge ||
        typeof bridge.subscribe !== "function" ||
        typeof authenticateRequest !== "function"
    ) {
        throw new TypeError(
            "bridge e autenticador obrigatorios"
        );
    }

    async function handle(request, response, { cameraId } = {}) {
        if (request?.method !== "GET") {
            return reject(response, 405, "method_not_allowed");
        }

        // Restrito a servicos confiaveis.
        // Nao habilitar acesso direto pelo navegador.
        if (request.headers?.origin) {
            return reject(response, 403, "origin_not_allowed");
        }

        let principal;

        try {
            principal = await authenticateRequest(request);
        }
        catch {
            return reject(response, 401, "unauthorized");
        }

        if (
            !principal ||
            typeof principal !== "object" ||
            Array.isArray(principal)
        ) {
            return reject(response, 401, "unauthorized");
        }

        let closed = false;
        let unsubscribe = null;
        let expiry = null;

        const close = () => {
            if (closed) return;
            closed = true;

            if (expiry !== null) {
                clearTimeout(expiry);
            }

            unsubscribe?.();

            if (
                !response.destroyed &&
                !response.writableEnded
            ) {
                response.end();
            }
        };

        const onResult = (event) => {
            if (
                closed ||
                !event ||
                event.accepted !== false ||
                !ALLOWED.has(event.status)
            ) {
                return;
            }

            try {
                const message =
                    `data: ${JSON.stringify({
                        accepted: false,
                        status: event.status,
                    })}\n\n`;

                if (response.write(message) === false) {
                    close();
                }
            }
            catch {
                close();
            }
        };

        try {
            unsubscribe = await bridge.subscribe({
                cameraId,
                principal,
                onResult,
            });
        }
        catch {
            return reject(response, 403, "forbidden");
        }

        if (typeof unsubscribe !== "function") {
            return reject(response, 503, "bridge_unavailable");
        }

        if (request.aborted || response.destroyed) {
            close();
            return false;
        }

        response.once("close", close);
        request.once?.("aborted", close);

        try {
            response.writeHead(200, {
                "content-type":
                    "text/event-stream; charset=utf-8",
                "cache-control":
                    "no-store, no-transform",
                "x-content-type-options":
                    "nosniff",
                "x-accel-buffering":
                    "no",
            });

            response.write(": connected\n\n");

            // Exige nova autenticacao na reconexao.
            expiry = setTimeout(close, MAX_SESSION_MS);
            expiry.unref?.();
        }
        catch {
            close();
            return false;
        }

        return true;
    }

    return Object.freeze({ handle });
}
