/**
 * SafeScan Brasil | R10K-3C4F-C3E-C
 * Offline ONLY. No socket, TLS client, DNS lookup, fetch or listener.
 *
 * Trusted future transport MUST honor openPinnedTlsSession({ ip, hostname,
 * servername, port, signal }): dial *ip*, with TLS SNI=hostname, verify
 * certificate chain + hostname before releasing a session. No DNS relookup,
 * proxies, redirects, coalesced connections or application bytes before
 * session attestation is accepted. Do not treat this mock contract as a
 * deployed SSRF control. All session attestations come from an INJECTED,
 * trusted provider; untrusted callbacks are forbidden in production.
 *
 * The approved endpoint/path is shared with the existing C3E-B policy.
 * HMAC validation and SQL claims remain the sole responsibility of C2.
 */
import { isIP } from 'node:net'; // parsing only; does not create sockets
import { isApprovedOperationalDestination } from './operationalIngressRoutePolicy.mjs';

const MAX_BODY_BYTES = 2048;
const ALLOWED_TLS = new Set(['TLSv1.2', 'TLSv1.3']);
const REPLY_STATUSES = new Set([202, 204, 400, 401, 404, 405, 408, 409, 413, 429, 503]);
const REQUIRED_HMAC_HEADERS = [
    'x-safescan-device-id', 'x-safescan-event-id',
    'x-safescan-timestamp', 'x-safescan-nonce', 'x-safescan-signature',
];
const TRANSPORT_HEADERS = new Set([
    'accept', 'content-type', ...REQUIRED_HMAC_HEADERS,
]);

function makeReply(status) {
    return new Response(null, { status, headers: { 'cache-control': 'no-store' } });
}

/** Conservative public-unicast address gate, independent of DNS library. */
export function isEligiblePublicOperationalIp(address) {
    if (typeof address !== 'string' || address !== address.trim() ||
        address.length > 80 || address.includes('%')) return false;
    const family = isIP(address);
    if (family === 4) {
        const [a, b, c] = address.split('.').map(Number);
        if (a === 0 || a === 10 || a === 127 || a >= 224 ||
            (a === 100 && b >= 64 && b <= 127) ||
            (a === 169 && b === 254) ||
            (a === 172 && b >= 16 && b <= 31) ||
            (a === 192 && (b === 0 || (b === 168) ||
                (b === 88 && c === 99))) ||
            (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
            (a === 203 && b === 0 && c === 113)) return false;
        return true;
    }
    if (family !== 6 || address.includes('.')) return false; // mapped IPv4 and translators
    const parts = address.toLowerCase().split('::');
    if (parts.length > 2) return false;
    const left = parts[0] ? parts[0].split(':') : [];
    const right = parts.length === 2 && parts[1] ? parts[1].split(':') : [];
    if (left.length + right.length > 8) return false;
    const fill = parts.length === 2 ? new Array(8 - left.length - right.length).fill('0') : [];
    const groups = [...left, ...fill, ...right].map((part) => Number.parseInt(part, 16));
    if (groups.length !== 8 || groups.some((v) => !Number.isInteger(v))) return false;
    const [first, second] = groups;
    if ((first & 0xe000) !== 0x2000) return false; // excludes ULA, link-local, loopback
    if (first === 0x2002) return false; // 6to4 can tunnel to private IPv4
    if (first === 0x2001 && (second === 0 || second === 2 ||
        second === 0x10 || second === 0x20 || second === 0x0db8)) return false;
    return true;
}

function requireOptions({ approvedEndpointUrl, resolveAddresses, openPinnedTlsSession,
    totalTimeoutMs, maxConcurrent } = {}) {
    if (typeof approvedEndpointUrl !== 'string' ||
        !isApprovedOperationalDestination(approvedEndpointUrl, approvedEndpointUrl) ||
        typeof resolveAddresses !== 'function' ||
        typeof openPinnedTlsSession !== 'function' ||
        !Number.isSafeInteger(totalTimeoutMs) || totalTimeoutMs < 100 || totalTimeoutMs > 30000 ||
        !Number.isSafeInteger(maxConcurrent) || maxConcurrent < 1 || maxConcurrent > 16) {
        throw new TypeError('trusted_pinned_transport_configuration_required');
    }
    return new URL(approvedEndpointUrl).hostname;
}

function validatedRequest(url, init, approved) {
    if (!isApprovedOperationalDestination(url, approved) ||
        init?.method !== 'POST' || init?.redirect !== 'error' ||
        init?.credentials !== 'omit' || init?.cache !== 'no-store' ||
        typeof init?.body !== 'string' ||
        new TextEncoder().encode(init.body).byteLength < 1 ||
        new TextEncoder().encode(init.body).byteLength > MAX_BODY_BYTES) return null;
    let headers;
    try { headers = new Headers(init.headers); } catch { return null; }
    if (headers.get('content-type') !== 'application/json' ||
        REQUIRED_HMAC_HEADERS.some((name) => !headers.has(name)) ||
        [...headers.keys()].some((name) => !TRANSPORT_HEADERS.has(name))) return null;
    return Object.freeze({
        method: 'POST', redirect: 'error',
        headers, body: init.body,
    });
}

function verifiedSession(session, ip, hostname) {
    return Boolean(session && typeof session === 'object' &&
        session.peerAddress === ip && isEligiblePublicOperationalIp(session.peerAddress) &&
        session.tls?.authorized === true && session.tls?.hostnameVerified === true &&
        session.tls?.servername === hostname && session.tls?.verifiedHostname === hostname &&
        ALLOWED_TLS.has(session.tls?.protocol) &&
        typeof session.request === 'function' && typeof session.close === 'function');
}

/**
 * Injected fetch-compatible adapter for offline verification with the
 * existing HTTPS publisher. It does not call global fetch or open sockets.
 * Errors are generic and contain no hostname, key or peer metadata.
 */
export function createUnMountedPinnedOperationalHttpsTransport({
    approvedEndpointUrl,
    resolveAddresses,
    openPinnedTlsSession,
    totalTimeoutMs = 5000,
    maxConcurrent = 2,
} = {}) {
    const hostname = requireOptions({ approvedEndpointUrl, resolveAddresses,
        openPinnedTlsSession, totalTimeoutMs, maxConcurrent });
    let active = 0;
    function closeSilently(opened) {
        try { void Promise.resolve(opened?.close?.()).catch(() => {}); }
        catch { /* already broken */ }
    }

    async function fetchImpl(url, init) {
        const payload = validatedRequest(url, init, approvedEndpointUrl);
        if (!payload || init?.signal?.aborted) return makeReply(503);
        if (active >= maxConcurrent) return makeReply(429);
        active += 1; // synchronous: no awaiting between check and reservation
        const controller = new AbortController();
        const signal = controller.signal;
        let session;
        let timer;
        let abortListener;
        let rejectCancelled;
        const cancelled = new Promise((_, reject) => { rejectCancelled = reject; });
        const timeout = new Promise((_, reject) => {
            timer = setTimeout(() => {
                controller.abort();
                reject(new Error('operation_deadline'));
            }, totalTimeoutMs);
        });
        if (init?.signal) {
            abortListener = () => {
                controller.abort();
                rejectCancelled(new Error('publisher_aborted'));
            };
            init.signal.addEventListener('abort', abortListener, { once: true });
            if (init.signal.aborted) abortListener();
        }

        async function operate() {
            const records = await resolveAddresses(hostname, { signal });
            if (!Array.isArray(records) || records.length < 1 || records.length > 8 ||
                records.some((ip) => !isEligiblePublicOperationalIp(ip)) ||
                new Set(records).size !== records.length) {
                throw new Error('dns_not_trusted');
            }
            if (signal.aborted) throw new Error('operation_cancelled');
            const ip = records[0]; // exactly one approved IP, never a second DNS resolution
            const opened = await openPinnedTlsSession({
                ip, hostname, servername: hostname, port: 443, signal,
            });
            // A late socket after the deadline must be closed, never used.
            if (signal.aborted) {
                closeSilently(opened);
                throw new Error('operation_cancelled');
            }
            session = opened;
            if (!verifiedSession(session, ip, hostname)) throw new Error('tls_peer_not_trusted');
            // No application bytes are passed before DNS, peer IP, and TLS checks.
            const result = await session.request({
                method: payload.method, headers: payload.headers,
                body: payload.body, redirect: payload.redirect, signal,
            });
            if (signal.aborted || !(result instanceof Response) ||
                !REPLY_STATUSES.has(result.status)) throw new Error('untrusted_response');
            return makeReply(result.status);
        }
        try {
            return await Promise.race([operate(), timeout, cancelled]);
        } catch {
            return makeReply(503);
        } finally {
            controller.abort();
            clearTimeout(timer);
            if (abortListener) init.signal.removeEventListener('abort', abortListener);
            // An asynchronous mock that ignores AbortSignal cannot be forcibly
            // cancelled. Future real transport MUST abort and close the socket.
            closeSilently(session);
            active -= 1;
        }
    }

    return Object.freeze({ fetchImpl, getActiveCount: () => active });
}
