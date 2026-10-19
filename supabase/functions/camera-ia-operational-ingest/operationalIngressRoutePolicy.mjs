/**
 * SafeScan Brasil | R10K-3C4F-C3E-B
 * OFFLINE, UNMOUNTED HTTP routing guard for device HMAC ingestion.
 * Web APIs only. No fetch, DNS, Deno.serve, network clients or credentials.
 *
 * This guard is not an authenticator: the supplied `verifyHmacAndClaim`
 * MUST be the previously approved C2 trusted HMAC->SQL contract.
 * The eventual proxy MUST validate the raw request-target, authenticate
 * the forwarding hop and enforce DNS/IP routing at the transport layer.
 * JWT verification settings, real rate limits and proxy are NOT configured.
 */
const PATH = '/api/camera-ia/devices/events';
const MAX_BODY = 2048;
const DEVICE_ID = /^[A-Za-z0-9_.:-]{1,160}$/;
const BLOCKED_HOST_ENDINGS = ['.localhost', '.local', '.internal', '.invalid'];
const SUPPORTED_RESPONSE_STATUSES = new Set([202, 204, 400, 401, 404, 405, 408, 409, 413, 429, 503]);
const BLOCKED_OVERRIDE_HEADERS = [
    'authorization', 'apikey', 'x-original-url', 'x-rewrite-url',
    'x-forwarded-host', 'x-forwarded-prefix', 'x-http-method-override',
    'content-encoding', 'proxy-authorization',
];
const FORWARDED_HEADER_NAMES = Object.freeze([
    'content-type', 'x-safescan-device-id', 'x-safescan-event-id',
    'x-safescan-timestamp', 'x-safescan-nonce', 'x-safescan-signature',
]);

function response(status) {
    return new Response(null, { status, headers: {
        'cache-control': 'no-store',
        'referrer-policy': 'no-referrer',
    } });
}

function canonicalEndpoint(value) {
    if (typeof value !== 'string' || value !== value.trim() || value.length > 1024) {
        throw new TypeError('approved_https_endpoint_required');
    }
    let parsed;
    try { parsed = new URL(value); } catch {
        throw new TypeError('approved_https_endpoint_required');
    }
    const host = parsed.hostname;
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password ||
        parsed.port || parsed.search || parsed.hash || parsed.pathname !== PATH ||
        !/^[a-z0-9.-]+$/.test(host) || !host.includes('.') ||
        host.startsWith('.') || host.endsWith('.') || host.includes('..') ||
        host === 'localhost' || BLOCKED_HOST_ENDINGS.some((end) => host.endsWith(end)) ||
        // Reject IPv4 literal, numeric aliases and obvious special-use labels.
        /^[0-9.]+$/.test(host) || host.endsWith('.arpa') || host.endsWith('.onion') ||
        host === '0.0.0.0' || host === '255.255.255.255' ||
        value !== parsed.href) {
        throw new TypeError('approved_https_endpoint_required');
    }
    return value;
}

/**
 * Pure exact allowlist check only; NOT a DNS/SSRF transport proof.
 * The actual network stack must pin/validate DNS resolution at connection.
 */
export function isApprovedOperationalDestination(candidateUrl, approvedEndpointUrl) {
    const expected = canonicalEndpoint(approvedEndpointUrl);
    return typeof candidateUrl === 'string' && candidateUrl === expected;
}

async function readBodyWithDeadline(request, { maxBodyBytes, bodyTimeoutMs }) {
    if (!request.body) return { status: 400 };
    const advertised = request.headers.get('content-length');
    if (advertised !== null) {
        if (!/^[0-9]{1,9}$/.test(advertised)) return { status: 400 };
        if (Number(advertised) > maxBodyBytes) return { status: 413 };
    }
    const reader = request.body.getReader();
    let timeoutHandle;
    let timedOut = false;
    const timeout = new Promise((_, reject) => {
        timeoutHandle = setTimeout(() => {
            timedOut = true;
            // Do not await cancellation: a malicious stream may never settle.
            try { void reader.cancel('deadline_exceeded').catch(() => {}); } catch { /* noop */ }
            reject(new Error('deadline_exceeded'));
        }, bodyTimeoutMs);
    });
    const chunks = [];
    let total = 0;
    try {
        const bytes = await Promise.race([(async () => {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                if (!(value instanceof Uint8Array)) throw new TypeError('invalid_request_chunk');
                total += value.byteLength;
                if (total > maxBodyBytes) return null;
                chunks.push(value);
            }
            if (total === 0) throw new TypeError('empty_request_body');
            const out = new Uint8Array(total);
            let offset = 0;
            for (const chunk of chunks) { out.set(chunk, offset); offset += chunk.byteLength; }
            return out;
        })(), timeout]);
        if (bytes === null) return { status: 413 };
        if (advertised !== null && Number(advertised) !== bytes.byteLength) {
            return { status: 400 };
        }
        return { bytes };
    } catch {
        return { status: timedOut ? 408 : 400 };
    } finally {
        clearTimeout(timeoutHandle);
        try { void reader.cancel('request_consumed').catch(() => {}); } catch { /* noop */ }
        try { reader.releaseLock(); } catch { /* pending read after timeout */ }
    }
}

/**
 * Inject an explicit allowlisted endpoint, a trusted rate limiter (no
 * X-Forwarded-For from devices), and the original C2 HMAC->SQL handle method.
 * Does not bind a listener, call fetch or modify Supabase configuration.
 */
export function createUnMountedOperationalIngressRoutePolicy({
    approvedEndpointUrl,
    verifyHmacAndClaim,
    checkRateLimit,
    bodyTimeoutMs = 3000,
    maxBodyBytes = MAX_BODY,
} = {}) {
    const approved = canonicalEndpoint(approvedEndpointUrl);
    if (typeof verifyHmacAndClaim !== 'function' || typeof checkRateLimit !== 'function' ||
        !Number.isSafeInteger(bodyTimeoutMs) || bodyTimeoutMs < 100 || bodyTimeoutMs > 10000 ||
        !Number.isSafeInteger(maxBodyBytes) || maxBodyBytes < 1 || maxBodyBytes > MAX_BODY) {
        throw new TypeError('injected_trusted_handler_and_rate_limit_required');
    }

    async function handle(request) {
        if (!(request instanceof Request)) return response(400);
        if (request.method !== 'POST') return response(405);
        // Exact absolute URL, not just pathname: disallow query, host aliases,
        // alternate ports, fragment, rewrites and signed-path overrides.
        if (request.url !== approved) return response(404);
        if (request.headers.get('content-type') !== 'application/json' ||
            BLOCKED_OVERRIDE_HEADERS.some((key) => request.headers.has(key))) {
            return response(400);
        }
        const deviceId = request.headers.get('x-safescan-device-id');
        if (typeof deviceId !== 'string' || !DEVICE_ID.test(deviceId)) return response(400);
        try {
            // Device ID is not an IP identity. Real edge rate limiting must also
            // apply a verified source identity outside this isolated contract.
            const allowed = await checkRateLimit(Object.freeze({ deviceId }));
            if (allowed !== true) return response(429);
        } catch {
            return response(503);
        }
        const body = await readBodyWithDeadline(request, { maxBodyBytes, bodyTimeoutMs });
        if (!body.bytes) return response(body.status);
        const safeHeaders = new Headers();
        for (const name of FORWARDED_HEADER_NAMES) {
            if (request.headers.has(name)) safeHeaders.set(name, request.headers.get(name));
        }
        const canonicalRequest = new Request(approved, {
            method: 'POST', headers: safeHeaders, body: body.bytes,
        });
        try {
            // Critical: never send this to an unauthenticated event insertion API.
            // The injected C2 handler must verify HMAC BEFORE SQL claim.
            const verifiedResponse = await verifyHmacAndClaim(canonicalRequest);
            if (!(verifiedResponse instanceof Response) ||
                !SUPPORTED_RESPONSE_STATUSES.has(verifiedResponse.status)) {
                return response(503);
            }
            return response(verifiedResponse.status);
        } catch {
            return response(503);
        }
    }

    return Object.freeze({ handle, approvedEndpointUrl: approved });
}
