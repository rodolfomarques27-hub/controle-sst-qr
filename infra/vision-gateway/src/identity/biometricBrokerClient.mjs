const LOOPBACK_HOSTS = new Set(["127.0.0.1", "::1", "localhost"]);
const EMBEDDING_SIZE = 128;
const UNIT_NORM_TOLERANCE = 1e-5;
const DEFAULT_TIMEOUT_MS = 5000;
const MAX_TIMEOUT_MS = 30000;
const MAX_TOKEN_BYTES = 4096;
const UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class BiometricBrokerClientError extends Error {
    constructor(message, { code = "BROKER_CLIENT_ERROR", status = null, cause } = {}) {
        super(message, cause === undefined ? undefined : { cause });
        this.name = "BiometricBrokerClientError";
        this.code = code;
        this.status = status;
    }
}

function normalizeUrl(value, allowInsecureHttpForTests) {
    if (typeof value !== "string" || !value.trim()) {
        throw new TypeError("url do broker e obrigatoria.");
    }

    let parsed;
    try {
        parsed = new URL(value.trim());
    }
    catch {
        throw new TypeError("url do broker deve ser valida.");
    }

    const testLoopback =
        allowInsecureHttpForTests === true &&
        parsed.protocol === "http:" &&
        LOOPBACK_HOSTS.has(parsed.hostname);

    if (parsed.protocol !== "https:" && !testLoopback) {
        throw new TypeError(
            "url do broker deve usar HTTPS fora de testes loopback.",
        );
    }
    if (parsed.username || parsed.password || parsed.search || parsed.hash) {
        throw new TypeError(
            "url do broker nao pode conter credenciais, query ou fragmento.",
        );
    }

    return parsed.href.replace(/\/+$/, "");
}

function normalizeToken(value) {
    if (typeof value !== "string") {
        throw new TypeError("token do broker e obrigatorio.");
    }
    const normalized = value.trim();
    const bytes = new TextEncoder().encode(normalized).byteLength;
    if (bytes < 32 || bytes > MAX_TOKEN_BYTES) {
        throw new TypeError(
            `token do broker deve possuir entre 32 e ${MAX_TOKEN_BYTES} bytes.`,
        );
    }
    return normalized;
}

function normalizeTimeoutMs(value) {
    const normalized = value ?? DEFAULT_TIMEOUT_MS;
    if (
        !Number.isSafeInteger(normalized) ||
        normalized < 1 ||
        normalized > MAX_TIMEOUT_MS
    ) {
        throw new TypeError(`timeoutMs deve estar entre 1 e ${MAX_TIMEOUT_MS}.`);
    }
    return normalized;
}

function requireUuid(value, name) {
    if (typeof value !== "string" || !UUID_PATTERN.test(value.trim())) {
        throw new TypeError(`${name} deve ser UUID valido.`);
    }
    return value.trim().toLowerCase();
}

function requireProfileId(value) {
    if (typeof value !== "string" || !value.trim() || value.trim().length > 160) {
        throw new TypeError("profileId deve possuir entre 1 e 160 caracteres.");
    }
    return value.trim();
}

function assertNormalizedEmbedding128(embedding) {
    if (!(embedding instanceof Float32Array)) {
        throw new TypeError("observedEmbedding deve ser Float32Array.");
    }
    if (embedding.length !== EMBEDDING_SIZE) {
        throw new RangeError(
            `observedEmbedding deve possuir exatamente ${EMBEDDING_SIZE} valores.`,
        );
    }

    let sumSquares = 0;
    for (let index = 0; index < embedding.length; index += 1) {
        const value = embedding[index];
        if (!Number.isFinite(value)) {
            throw new RangeError(`observedEmbedding[${index}] deve ser finito.`);
        }
        sumSquares += value * value;
    }

    const norm = Math.sqrt(sumSquares);
    if (!Number.isFinite(norm) || Math.abs(norm - 1) > UNIT_NORM_TOLERANCE) {
        throw new RangeError("observedEmbedding deve estar L2-normalizado.");
    }
    return embedding;
}

async function readJsonSafely(response) {
    try {
        return await response.json();
    }
    catch {
        return null;
    }
}

function safeResponseCode(body) {
    return body &&
        typeof body === "object" &&
        typeof body.code === "string" &&
        body.code.length <= 120
        ? body.code
        : null;
}

export function createBiometricBrokerClient({
    url,
    token,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    fetchImpl = globalThis.fetch,
    allowInsecureHttpForTests = false,
} = {}) {
    const normalizedUrl = normalizeUrl(url, allowInsecureHttpForTests);
    const normalizedToken = normalizeToken(token);
    const normalizedTimeoutMs = normalizeTimeoutMs(timeoutMs);

    if (typeof fetchImpl !== "function") {
        throw new TypeError("fetchImpl deve ser uma funcao.");
    }

    async function identify({
        tenantId,
        empresaId,
        profileId,
        requestId,
        observedEmbedding,
    } = {}) {
        const embedding = assertNormalizedEmbedding128(observedEmbedding);
        const wireEmbedding = Array.from(embedding);
        let requestBody = JSON.stringify({
            operation: "identify",
            input: {
                tenantId: requireUuid(tenantId, "tenantId"),
                empresaId: requireUuid(empresaId, "empresaId"),
                profileId: requireProfileId(profileId),
                requestId: requireUuid(requestId, "requestId"),
                observedEmbedding: wireEmbedding,
            },
        });
        wireEmbedding.fill(0);

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), normalizedTimeoutMs);

        try {
            let response;
            try {
                response = await fetchImpl(normalizedUrl, {
                    method: "POST",
                    headers: {
                        "content-type": "application/json",
                        "x-safescan-broker-token": normalizedToken,
                    },
                    body: requestBody,
                    signal: controller.signal,
                });
            }
            catch (error) {
                if (controller.signal.aborted) {
                    throw new BiometricBrokerClientError(
                        "biometric broker excedeu o timeout.",
                        { code: "BROKER_TIMEOUT", cause: error },
                    );
                }
                throw new BiometricBrokerClientError(
                    "falha de rede ao chamar biometric broker.",
                    { code: "BROKER_NETWORK_ERROR", cause: error },
                );
            }

            const body = await readJsonSafely(response);
            if (!response.ok) {
                throw new BiometricBrokerClientError(
                    "biometric broker rejeitou a requisicao.",
                    {
                        code: safeResponseCode(body) ?? "BROKER_HTTP_ERROR",
                        status: response.status,
                    },
                );
            }
            if (
                !body ||
                typeof body !== "object" ||
                body.ok !== true ||
                body.operation !== "identify" ||
                !body.result ||
                typeof body.result !== "object" ||
                Array.isArray(body.result)
            ) {
                throw new BiometricBrokerClientError(
                    "biometric broker retornou resposta invalida.",
                    { code: "BROKER_INVALID_RESPONSE", status: response.status },
                );
            }

            return Object.freeze({ ...body.result });
        }
        finally {
            clearTimeout(timer);
            requestBody = null;
        }
    }

    return Object.freeze({ identify });
}
