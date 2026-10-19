const ALLOWED_STATUSES = new Set([
    "NO_FACE",
    "MULTIPLE_FACES",
]);

const CAMERA_ID =
    /^[A-Za-z0-9_.:-]{1,160}$/;

const BEARER =
    /^[A-Za-z0-9._~+/=-]{20,8192}$/;

const MAX_CHUNK_BYTES = 8192;
const MAX_LINE_LENGTH = 2048;
const MAX_EVENT_LENGTH = 1024;

export function createCameraIaOperationalSseClient({
    getAccessToken,
    onResult,
    fetchImpl = globalThis.fetch,
} = {}) {
    if (
        typeof getAccessToken !== "function" ||
        typeof onResult !== "function" ||
        typeof fetchImpl !== "function"
    ) {
        throw new TypeError(
            "autenticacao, receptor e fetch obrigatorios"
        );
    }

    async function consume({ cameraId, signal } = {}) {
        if (
            typeof cameraId !== "string" ||
            !CAMERA_ID.test(cameraId)
        ) {
            throw new TypeError("cameraId invalido");
        }

        if (signal?.aborted) {
            throw new Error("request_aborted");
        }

        if (
            signal !== undefined &&
            (
                typeof signal?.aborted !== "boolean" ||
                typeof signal?.addEventListener !== "function"
            )
        ) {
            throw new TypeError("signal invalido");
        }

        const token = await getAccessToken();

        if (
            typeof token !== "string" ||
            !BEARER.test(token)
        ) {
            throw new Error("session_unavailable");
        }

        // A rota e sempre relativa a propria aplicacao.
        // Nunca apontar diretamente para o Gateway local.
        const path =
            `/api/camera-ia/cameras/` +
            `${encodeURIComponent(cameraId)}/results/stream`;

        const response = await fetchImpl(path, {
            method: "GET",

            headers: {
                accept: "text/event-stream",
                authorization: `Bearer ${token}`,
            },

            credentials: "omit",
            cache: "no-store",
            redirect: "error",
            mode: "same-origin",
            signal,
        });

        if (
            !response?.ok ||
            response.status !== 200
        ) {
            throw new Error("stream_unavailable");
        }

        const type =
            response.headers?.get?.("content-type") ?? "";

        if (
            !/^text\/event-stream(?:\s*;|\s*$)/i.test(type)
        ) {
            throw new Error(
                "invalid_stream_content_type"
            );
        }

        if (
            typeof response.body?.getReader !== "function"
        ) {
            throw new Error("stream_body_unavailable");
        }

        const reader = response.body.getReader();

        const decoder = new TextDecoder("utf-8", {
            fatal: true,
        });

        let lineBuffer = "";
        let payload = null;
        let malformed = false;
        let previousStatus = null;

        function dispatch() {
            if (
                !malformed &&
                payload !== null &&
                payload.length <= MAX_EVENT_LENGTH
            ) {
                let parsed;

                try {
                    parsed = JSON.parse(payload);
                }
                catch {
                    parsed = null;
                }

                if (
                    parsed &&
                    typeof parsed === "object" &&
                    !Array.isArray(parsed) &&
                    Object.keys(parsed).length === 2 &&
                    parsed.accepted === false &&
                    ALLOWED_STATUSES.has(parsed.status) &&
                    parsed.status !== previousStatus
                ) {
                    previousStatus = parsed.status;

                    onResult(
                        Object.freeze({
                            accepted: false,
                            status: parsed.status,
                        })
                    );
                }
            }

            payload = null;
            malformed = false;
        }

        function processLine(raw) {
            const line =
                raw.endsWith("\r")
                    ? raw.slice(0, -1)
                    : raw;

            if (line.length === 0) {
                dispatch();
            }
            else if (line.startsWith(":")) {
                // Heartbeat SSE.
            }
            else if (
                line.startsWith("data:") &&
                payload === null
            ) {
                payload = line.slice(5).trimStart();
            }
            else {
                malformed = true;
            }
        }

        function feed(text) {
            lineBuffer += text;

            let index;

            while (
                (index = lineBuffer.indexOf("\n")) !== -1
            ) {
                if (index > MAX_LINE_LENGTH) {
                    throw new Error(
                        "stream_line_too_large"
                    );
                }

                processLine(
                    lineBuffer.slice(0, index)
                );

                lineBuffer =
                    lineBuffer.slice(index + 1);
            }

            if (
                lineBuffer.length > MAX_LINE_LENGTH
            ) {
                throw new Error(
                    "stream_line_too_large"
                );
            }
        }

        try {
            while (true) {
                const { done, value } =
                    await reader.read();

                if (done) {
                    break;
                }

                if (
                    !(value instanceof Uint8Array) ||
                    value.byteLength > MAX_CHUNK_BYTES
                ) {
                    throw new Error(
                        "invalid_stream_chunk"
                    );
                }

                feed(
                    decoder.decode(value, {
                        stream: true,
                    })
                );
            }

            // Eventos parciais nunca sao publicados.
            decoder.decode();
        }
        finally {
            try {
                await reader.cancel();
            }
            catch {
                // Stream encerrado.
            }

            reader.releaseLock();
        }
    }

    return Object.freeze({ consume });
}
