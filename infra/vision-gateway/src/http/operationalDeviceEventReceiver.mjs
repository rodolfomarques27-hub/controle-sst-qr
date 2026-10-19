import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

const PATH = '/api/camera-ia/devices/events';
const ID = /^[A-Za-z0-9_.:-]{1,160}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TIMESTAMP = /^[1-9][0-9]{0,11}$/;
const SIGNATURE = /^[A-Za-z0-9_-]{43}$/;
const STATUSES = new Set(['NO_FACE', 'MULTIPLE_FACES']);
const EXPECTED_FIELDS = [
    'version', 'eventId', 'deviceId', 'cameraId',
    'tenantId', 'empresaId', 'accepted', 'status',
];
const MAX_BODY_BYTES = 2048;
const MAX_SKEW_SECONDS = 120;
const REPLAY_RETENTION_MS = 24 * 60 * 60 * 1000;

function validUuid(value) {
    return typeof value === 'string' && UUID.test(value);
}

function getHeader(headers, name) {
    if (!headers || typeof headers !== 'object') {
        return null;
    }

    const value = typeof headers.get === 'function'
        ? headers.get(name)
        : headers[name];

    return typeof value === 'string' ? value : null;
}

function decodeSecret(value) {
    if (typeof value !== 'string' || value.length > 256) {
        return null;
    }

    const key = Buffer.from(value, 'base64');
    return key.length >= 32 &&
        key.length <= 64 &&
        key.toString('base64') === value
        ? key
        : null;
}

function validPayload(data, deviceId, eventId) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        return false;
    }

    const fields = Object.keys(data);
    if (
        fields.length !== EXPECTED_FIELDS.length ||
        fields.some((field, i) => field !== EXPECTED_FIELDS[i]) ||
        data.version !== 1 ||
        data.accepted !== false ||
        data.deviceId !== deviceId ||
        data.eventId !== eventId ||
        !validUuid(eventId) ||
        typeof data.deviceId !== 'string' ||
        !ID.test(data.deviceId) ||
        typeof data.cameraId !== 'string' ||
        !ID.test(data.cameraId) ||
        !validUuid(data.tenantId) ||
        !validUuid(data.empresaId) ||
        !STATUSES.has(data.status)
    ) {
        return false;
    }

    return true;
}

function equalScope(payload, binding) {
    return Boolean(
        binding &&
        typeof binding === 'object' &&
        !Array.isArray(binding) &&
        binding.enabled === true &&
        binding.deviceId === payload.deviceId &&
        binding.cameraId === payload.cameraId &&
        validUuid(binding.tenantId) &&
        validUuid(binding.empresaId) &&
        binding.tenantId.toLowerCase() === payload.tenantId.toLowerCase() &&
        binding.empresaId.toLowerCase() === payload.empresaId.toLowerCase()
    );
}

function verifyHmac({ secret, timestamp, nonce, rawBody, signature }) {
    const digest = createHash('sha256').update(rawBody).digest('hex');
    const canonical = `${timestamp}\n${nonce}\n${digest}\n${PATH}`;
    const expected = createHmac('sha256', secret)
        .update(canonical, 'utf8').digest();
    const supplied = Buffer.from(signature, 'base64url');

    return supplied.length === expected.length &&
        supplied.toString('base64url') === signature &&
        timingSafeEqual(supplied, expected);
}

/**
 * Verifier only: it does not mount an HTTP route or open a socket.
 * getDeviceBinding reads a trusted, current device record (including secret).
 * commitEvent MUST atomically reject duplicate (deviceId, nonce) OR
 * (deviceId, eventId), and persist the sanitized event in the same operation.
 * The durable implementation must retain both uniqueness keys until expiresAtMs.
 * No in-memory replay implementation is supplied for production.
 */
export function createOperationalDeviceEventReceiver({
    getDeviceBinding,
    commitEvent,
    nowImpl = Date.now,
} = {}) {
    if (
        typeof getDeviceBinding !== 'function' ||
        typeof commitEvent !== 'function' ||
        typeof nowImpl !== 'function'
    ) {
        throw new TypeError('trusted_adapters_required');
    }

    async function receive({ method, path, headers, rawBody } = {}) {
        if (method !== 'POST') {
            return Object.freeze({ status: 405, accepted: false });
        }

        if (path !== PATH) {
            return Object.freeze({ status: 404, accepted: false });
        }

        const contentType = getHeader(headers, 'content-type');
        const deviceId = getHeader(headers, 'x-safescan-device-id');
        const eventId = getHeader(headers, 'x-safescan-event-id');
        const timestamp = getHeader(headers, 'x-safescan-timestamp');
        const nonce = getHeader(headers, 'x-safescan-nonce');
        const signature = getHeader(headers, 'x-safescan-signature');

        if (
            contentType !== 'application/json' ||
            typeof deviceId !== 'string' || !ID.test(deviceId) ||
            !validUuid(eventId) ||
            typeof timestamp !== 'string' || !TIMESTAMP.test(timestamp) ||
            !validUuid(nonce) ||
            typeof signature !== 'string' || !SIGNATURE.test(signature) ||
            !Buffer.isBuffer(rawBody) ||
            rawBody.length === 0 || rawBody.length > MAX_BODY_BYTES
        ) {
            return Object.freeze({ status: 400, accepted: false });
        }

        const nowMs = nowImpl();
        const epochSeconds = Number(timestamp);
        if (
            !Number.isSafeInteger(nowMs) ||
            !Number.isSafeInteger(epochSeconds) ||
            Math.abs(Math.floor(nowMs / 1000) - epochSeconds) > MAX_SKEW_SECONDS
        ) {
            return Object.freeze({ status: 401, accepted: false });
        }

        let payload;
        try {
            const text = new TextDecoder('utf-8', { fatal: true }).decode(rawBody);
            payload = JSON.parse(text);
            // Enforce the exact serializer used by the publisher: no duplicate
            // keys, alternate encodings, newlines or unexpected JSON values.
            if (JSON.stringify(payload) !== text ||
                !validPayload(payload, deviceId, eventId)) {
                return Object.freeze({ status: 400, accepted: false });
            }
        } catch {
            return Object.freeze({ status: 400, accepted: false });
        }

        try {
            const binding = await getDeviceBinding({ deviceId });
            if (!equalScope(payload, binding)) {
                return Object.freeze({ status: 401, accepted: false });
            }

            const secret = decodeSecret(binding.secretBase64);
            if (!secret || !verifyHmac({
                secret, timestamp, nonce, rawBody, signature,
            })) {
                return Object.freeze({ status: 401, accepted: false });
            }

            // Construct a new object: do not persist arbitrary input fields.
            const event = Object.freeze({
                version: 1,
                eventId: payload.eventId,
                deviceId: payload.deviceId,
                cameraId: payload.cameraId,
                tenantId: payload.tenantId.toLowerCase(),
                empresaId: payload.empresaId.toLowerCase(),
                accepted: false,
                status: payload.status,
            });

            // One atomic operation must claim nonce + eventId AND store event.
            // A failure is never interpreted as successful delivery.
            const stored = await commitEvent({
                deviceId,
                eventId,
                nonce,
                expiresAtMs: nowMs + REPLAY_RETENTION_MS,
                event,
            });

            if (stored !== true) {
                return Object.freeze({ status: 409, accepted: false });
            }

            return Object.freeze({ status: 202, accepted: true });
        } catch {
            return Object.freeze({ status: 503, accepted: false });
        }
    }

    return Object.freeze({ receive });
}
