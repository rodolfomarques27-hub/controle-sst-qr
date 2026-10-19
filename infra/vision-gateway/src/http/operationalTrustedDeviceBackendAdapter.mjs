import {
    createOperationalDeviceEventReceiver,
} from './operationalDeviceEventReceiver.mjs';

const ID = /^[A-Za-z0-9_.:-]{1,160}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TIMESTAMP = /^[1-9][0-9]{0,11}$/;
const STATUS = new Set(['NO_FACE', 'MULTIPLE_FACES']);

function uuid(value) {
    return typeof value === 'string' && UUID.test(value)
        ? value.toLowerCase()
        : null;
}

function getTimestamp(headers) {
    const raw = typeof headers?.get === 'function'
        ? headers.get('x-safescan-timestamp')
        : headers?.['x-safescan-timestamp'];
    if (typeof raw !== 'string' || !TIMESTAMP.test(raw)) {
        return null;
    }
    const parsed = Number(raw);
    return Number.isSafeInteger(parsed) ? parsed : null;
}

function validateRegistryRecord(deviceId, record) {
    if (
        !record || typeof record !== 'object' || Array.isArray(record) ||
        record.deviceId !== deviceId ||
        typeof record.cameraId !== 'string' || !ID.test(record.cameraId) ||
        !uuid(record.tenantId) || !uuid(record.empresaId) ||
        !uuid(record.keyId) ||
        record.status !== 'ativo' ||
        record.cameraEnabled !== true ||
        record.tenantActive !== true
    ) {
        return null;
    }

    return Object.freeze({
        deviceId,
        cameraId: record.cameraId,
        tenantId: uuid(record.tenantId),
        empresaId: uuid(record.empresaId),
        keyId: uuid(record.keyId),
    });
}

/**
 * Backend-only composition. NO HTTP route or real provider is created here.
 *
 * getDeviceRegistryRecord: trusted DB-side view of an ACTIVE device, camera and
 * tenant (no secret); returns keyId UUID and the exact tenant/empresa/camera.
 * getDeviceSigningKey: trusted external vault lookup ({deviceId,keyId}), returning
 * {deviceId,keyId,secretBase64}. Never store this secret in Supabase tables.
 * claimOperationalEvent: backend-only, atomic private SQL claim; boolean result.
 * These providers MUST remain private to a trusted backend (not browser/Gateway).
 */
export function createOperationalTrustedDeviceBackendAdapter({
    getDeviceRegistryRecord,
    getDeviceSigningKey,
    claimOperationalEvent,
    nowImpl = Date.now,
} = {}) {
    if (
        typeof getDeviceRegistryRecord !== 'function' ||
        typeof getDeviceSigningKey !== 'function' ||
        typeof claimOperationalEvent !== 'function' ||
        typeof nowImpl !== 'function'
    ) {
        throw new TypeError('trusted_backend_providers_required');
    }

    async function receive({ method, path, headers, rawBody } = {}) {
        // Per-request state: simultaneous devices or tenants never share keys.
        let bound = null;

        const receiver = createOperationalDeviceEventReceiver({
            nowImpl,
            async getDeviceBinding({ deviceId }) {
                if (typeof deviceId !== 'string' || !ID.test(deviceId)) {
                    return null;
                }

                const record = validateRegistryRecord(
                    deviceId,
                    await getDeviceRegistryRecord({ deviceId }),
                );
                if (!record) {
                    return null;
                }

                const signingKey = await getDeviceSigningKey({
                    deviceId: record.deviceId,
                    keyId: record.keyId,
                });

                if (
                    !signingKey || typeof signingKey !== 'object' ||
                    Array.isArray(signingKey) ||
                    signingKey.deviceId !== deviceId ||
                    uuid(signingKey.keyId) !== record.keyId ||
                    typeof signingKey.secretBase64 !== 'string'
                ) {
                    return null;
                }

                bound = record;
                return {
                    ...record,
                    enabled: true,
                    secretBase64: signingKey.secretBase64,
                };
            },
            async commitEvent({ deviceId, eventId, nonce, event }) {
                if (
                    !bound || !event ||
                    bound.deviceId !== deviceId ||
                    event.deviceId !== deviceId ||
                    event.eventId !== eventId ||
                    event.cameraId !== bound.cameraId ||
                    uuid(event.tenantId) !== bound.tenantId ||
                    uuid(event.empresaId) !== bound.empresaId ||
                    event.accepted !== false ||
                    !STATUS.has(event.status) ||
                    !uuid(eventId) || !uuid(nonce)
                ) {
                    return false;
                }

                const epochSeconds = getTimestamp(headers);
                if (epochSeconds === null) {
                    return false;
                }

                // Called ONLY after receiver verified HMAC using this request's
                // versioned external key. SQL must re-check active status/keyId,
                // camera, tenant, time and replay in a single transaction.
                return (await claimOperationalEvent(Object.freeze({
                    p_device_id: bound.deviceId,
                    p_camera_id: bound.cameraId,
                    p_tenant_id: bound.tenantId,
                    p_empresa_id: bound.empresaId,
                    p_key_id: bound.keyId,
                    p_event_id: eventId.toLowerCase(),
                    p_nonce: nonce.toLowerCase(),
                    p_status: event.status,
                    p_event_epoch_seconds: epochSeconds,
                }))) === true;
            },
        });

        return receiver.receive({ method, path, headers, rawBody });
    }

    return Object.freeze({ receive });
}
