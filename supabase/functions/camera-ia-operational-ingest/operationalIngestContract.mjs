/**
 * SafeScan Brasil | R10K-3C4F-C2
 * Offline, unmounted Supabase Edge Function contract.
 * Uses Web APIs only (Node 24 and Deno); no real provider, route or secret.
 * NOT a production endpoint. The SQL provider must be trusted, atomic,
 * persist the minimal event, and re-check device/camera/tenant/key at commit.
 */
const PATH = '/api/camera-ia/devices/events';
const ID = /^[A-Za-z0-9_.:-]{1,160}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TIMESTAMP = /^[1-9][0-9]{0,11}$/;
const SIGNATURE = /^[A-Za-z0-9_-]{43}$/;
const STATUS = new Set(['NO_FACE', 'MULTIPLE_FACES']);
const FIELDS = [
    'version', 'eventId', 'deviceId', 'cameraId',
    'tenantId', 'empresaId', 'accepted', 'status',
];
const MAX_BYTES = 2048;
const MAX_SKEW = 120;

function reply(status) {
    return new Response(null, {
        status,
        headers: { 'cache-control': 'no-store' },
    });
}

function validPayload(payload, deviceId, eventId) {
    return Boolean(
        payload && typeof payload === 'object' && !Array.isArray(payload) &&
        Object.keys(payload).length === FIELDS.length &&
        FIELDS.every((key, i) => Object.keys(payload)[i] === key) &&
        payload.version === 1 && payload.accepted === false &&
        payload.deviceId === deviceId && payload.eventId === eventId &&
        typeof payload.cameraId === 'string' && ID.test(payload.cameraId) &&
        typeof payload.tenantId === 'string' && UUID.test(payload.tenantId) &&
        typeof payload.empresaId === 'string' && UUID.test(payload.empresaId) &&
        STATUS.has(payload.status)
    );
}

function canonicalBase64Key(input) {
    if (typeof input !== 'string' || input.length > 256) return null;
    try {
        const binary = atob(input);
        if (binary.length < 32 || binary.length > 64 || btoa(binary) !== input) {
            return null;
        }
        return Uint8Array.from(binary, (character) => character.charCodeAt(0));
    } catch {
        return null;
    }
}

function canonicalBase64UrlSignature(input) {
    if (!SIGNATURE.test(input ?? '')) return null;
    try {
        const base64 = input.replace(/-/g, '+').replace(/_/g, '/') + '=';
        const binary = atob(base64);
        if (binary.length !== 32) return null;
        const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
        let normalized = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_');
        while (normalized.endsWith('=')) normalized = normalized.slice(0, -1);
        return normalized === input ? bytes : null;
    } catch {
        return null;
    }
}

async function readLimitedBody(request) {
    const advertised = request.headers.get('content-length');
    if (advertised !== null && (!/^[0-9]{1,9}$/.test(advertised) ||
        Number(advertised) > MAX_BYTES)) {
        return null;
    }
    if (!request.body) return null;
    const reader = request.body.getReader();
    const chunks = [];
    let total = 0;
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (!(value instanceof Uint8Array)) return null;
            total += value.byteLength;
            if (total > MAX_BYTES) return null;
            chunks.push(value);
        }
        if (total < 1) return null;
        const body = new Uint8Array(total);
        let offset = 0;
        for (const chunk of chunks) {
            body.set(chunk, offset);
            offset += chunk.length;
        }
        return body;
    } finally {
        // Cancels unconsumed oversized request bodies; no body retained.
        try { await reader.cancel(); } catch { /* already closed */ }
        reader.releaseLock();
    }
}

function trustedRecord(deviceId, record) {
    if (!record || typeof record !== 'object' || Array.isArray(record) ||
        record.deviceId !== deviceId ||
        typeof record.cameraId !== 'string' || !ID.test(record.cameraId) ||
        typeof record.tenantId !== 'string' || !UUID.test(record.tenantId) ||
        typeof record.empresaId !== 'string' || !UUID.test(record.empresaId) ||
        typeof record.keyId !== 'string' || !UUID.test(record.keyId) ||
        record.status !== 'ativo' ||
        record.cameraEnabled !== true || record.tenantActive !== true) {
        return null;
    }
    return Object.freeze({
        deviceId,
        cameraId: record.cameraId,
        tenantId: record.tenantId.toLowerCase(),
        empresaId: record.empresaId.toLowerCase(),
        keyId: record.keyId.toLowerCase(),
    });
}

/**
 * Providers MUST execute only inside a trusted server-side boundary.
 * getDeviceRegistryRecord({deviceId}) -> active trusted DB record with keyId UUID
 * getDeviceSigningKey({deviceId,keyId}) -> {deviceId,keyId,secretBase64}
 * claimOperationalEvent({p_* nine SQL arguments}) -> strict boolean, atomic
 * No default providers, no Deno.serve, no route registration, no CORS.
 */
export function createOperationalIngestContract({
    getDeviceRegistryRecord,
    getDeviceSigningKey,
    claimOperationalEvent,
    cryptoImpl = globalThis.crypto,
    nowImpl = Date.now,
} = {}) {
    if (typeof getDeviceRegistryRecord !== 'function' ||
        typeof getDeviceSigningKey !== 'function' ||
        typeof claimOperationalEvent !== 'function' ||
        typeof nowImpl !== 'function' ||
        !cryptoImpl?.subtle ||
        typeof cryptoImpl.subtle.digest !== 'function' ||
        typeof cryptoImpl.subtle.importKey !== 'function' ||
        typeof cryptoImpl.subtle.verify !== 'function') {
        throw new TypeError('trusted_providers_and_webcrypto_required');
    }

    async function handle(request) {
        if (!(request instanceof Request)) return reply(400);
        if (request.method !== 'POST') return reply(405);
        let path;
        try { path = new URL(request.url).pathname; } catch { return reply(400); }
        if (path !== PATH) return reply(404);
        const headers = request.headers;
        const deviceId = headers.get('x-safescan-device-id');
        const eventId = headers.get('x-safescan-event-id');
        const timestamp = headers.get('x-safescan-timestamp');
        const nonce = headers.get('x-safescan-nonce');
        const signature = headers.get('x-safescan-signature');
        const signedBytes = canonicalBase64UrlSignature(signature);
        if (headers.get('content-type') !== 'application/json' ||
            typeof deviceId !== 'string' || !ID.test(deviceId) ||
            typeof eventId !== 'string' || !UUID.test(eventId) ||
            typeof timestamp !== 'string' || !TIMESTAMP.test(timestamp) ||
            typeof nonce !== 'string' || !UUID.test(nonce) || !signedBytes) {
            return reply(400);
        }
        const eventEpochSeconds = Number(timestamp);
        const nowMs = nowImpl();
        if (!Number.isSafeInteger(nowMs) ||
            !Number.isSafeInteger(eventEpochSeconds) ||
            Math.abs(Math.floor(nowMs / 1000) - eventEpochSeconds) > MAX_SKEW) {
            return reply(401);
        }
        let rawBody;
        let payload;
        try {
            rawBody = await readLimitedBody(request);
            if (!rawBody) return reply(400);
            const rawText = new TextDecoder('utf-8', { fatal: true }).decode(rawBody);
            payload = JSON.parse(rawText);
            if (JSON.stringify(payload) !== rawText ||
                !validPayload(payload, deviceId, eventId)) {
                return reply(400);
            }
        } catch {
            return reply(400);
        }

        try {
            const record = trustedRecord(
                deviceId,
                await getDeviceRegistryRecord({ deviceId }),
            );
            if (!record || record.cameraId !== payload.cameraId ||
                record.tenantId !== payload.tenantId.toLowerCase() ||
                record.empresaId !== payload.empresaId.toLowerCase()) {
                return reply(401);
            }
            const keyRecord = await getDeviceSigningKey({
                deviceId: record.deviceId, keyId: record.keyId,
            });
            if (!keyRecord || keyRecord.deviceId !== deviceId ||
                typeof keyRecord.keyId !== 'string' ||
                keyRecord.keyId.toLowerCase() !== record.keyId) {
                return reply(401);
            }
            const secret = canonicalBase64Key(keyRecord.secretBase64);
            if (!secret) return reply(401);
            const hash = await cryptoImpl.subtle.digest('SHA-256', rawBody);
            const digest = Array.from(new Uint8Array(hash), (b) =>
                b.toString(16).padStart(2, '0')).join('');
            const canonical = `${timestamp}\n${nonce}\n${digest}\n${PATH}`;
            const hmacKey = await cryptoImpl.subtle.importKey(
                'raw', secret, { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'],
            );
            const signed = await cryptoImpl.subtle.verify(
                'HMAC', hmacKey, signedBytes,
                new TextEncoder().encode(canonical),
            );
            if (signed !== true) return reply(401);

            // SQL must re-check active status, camera/tenant scope, timestamp
            // and keyId AT COMMIT, with unique event ID and nonce constraints.
            const claimed = await claimOperationalEvent(Object.freeze({
                p_device_id: deviceId,
                p_camera_id: record.cameraId,
                p_tenant_id: record.tenantId,
                p_empresa_id: record.empresaId,
                p_key_id: record.keyId,
                p_event_id: eventId.toLowerCase(),
                p_nonce: nonce.toLowerCase(),
                p_status: payload.status,
                p_event_epoch_seconds: eventEpochSeconds,
            }));
            return reply(claimed === true ? 202 : 409);
        } catch {
            return reply(503);
        }
    }
    return Object.freeze({ handle });
}
