import {
    createOperationalTrustedDeviceBackendAdapter,
} from './operationalTrustedDeviceBackendAdapter.mjs';

import {
    createOperationalSupabaseAclRuntime,
} from './operationalSupabaseAclRuntime.mjs';

const CAMERA_ID = /^[A-Za-z0-9_.:-]{1,160}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STATUS = new Set(['NO_FACE', 'MULTIPLE_FACES']);
const CLAIM_FIELDS = [
    'p_device_id', 'p_camera_id', 'p_tenant_id', 'p_empresa_id',
    'p_key_id', 'p_event_id', 'p_nonce', 'p_status',
    'p_event_epoch_seconds',
];

function normalizeCameraBinding(cameraId, binding) {
    if (
        typeof cameraId !== 'string' || !CAMERA_ID.test(cameraId) ||
        !binding || typeof binding !== 'object' || Array.isArray(binding) ||
        binding.cameraId !== cameraId ||
        typeof binding.tenantId !== 'string' || !UUID.test(binding.tenantId) ||
        typeof binding.empresaId !== 'string' || !UUID.test(binding.empresaId)
    ) {
        throw new Error('trusted_camera_binding_unavailable');
    }
    return Object.freeze({
        cameraId,
        tenantId: binding.tenantId.toLowerCase(),
        empresaId: binding.empresaId.toLowerCase(),
    });
}

function validClaim(params) {
    return Boolean(
        params && typeof params === 'object' && !Array.isArray(params) &&
        Object.keys(params).length === CLAIM_FIELDS.length &&
        CLAIM_FIELDS.every((key) => Object.hasOwn(params, key)) &&
        typeof params.p_device_id === 'string' &&
        CAMERA_ID.test(params.p_device_id) &&
        typeof params.p_camera_id === 'string' &&
        CAMERA_ID.test(params.p_camera_id) &&
        UUID.test(params.p_tenant_id) && UUID.test(params.p_empresa_id) &&
        UUID.test(params.p_key_id) && UUID.test(params.p_event_id) &&
        UUID.test(params.p_nonce) && STATUS.has(params.p_status) &&
        Number.isSafeInteger(params.p_event_epoch_seconds) &&
        params.p_event_epoch_seconds > 0
    );
}

/**
 * Backend-only, offline composition. Never mounts a route or starts a camera.
 * Only a validated HMAC request may reach the trusted atomic claim, and only
 * a successful claim may cause a minimized SSE status transition.
 * Browser/user authorization is ALWAYS the Supabase user JWT + camera ACL RPC;
 * the legacy checkUserCameraAccess runtime is not part of this composition.
 *
 * SSE is best-effort. Accepted events are durably owned by claimOperationalEvent;
 * a production outbox/consumer is needed for replayable delivery guarantees.
 */
export function createOperationalVerifiedHmacAclSsePipeline({
    supabaseUrl,
    anonKey,
    fetchImpl,
    getCameraBinding,
    getDeviceRegistryRecord,
    getDeviceSigningKey,
    claimOperationalEvent,
    nowImpl = Date.now,
} = {}) {
    if (
        typeof getCameraBinding !== 'function' ||
        typeof getDeviceRegistryRecord !== 'function' ||
        typeof getDeviceSigningKey !== 'function' ||
        typeof claimOperationalEvent !== 'function' ||
        typeof fetchImpl !== 'function' ||
        typeof nowImpl !== 'function'
    ) {
        throw new TypeError('trusted_providers_required');
    }

    const aclRuntime = createOperationalSupabaseAclRuntime({
        supabaseUrl,
        anonKey,
        fetchImpl,
        getCameraBinding,
    });

    const pendingByScope = new Map();
    const framesByScope = new Map();

    async function trustedScope(cameraId) {
        return normalizeCameraBinding(
            cameraId,
            await getCameraBinding(cameraId),
        );
    }

    async function claimThenSignal(params) {
        if (!validClaim(params)) {
            return false;
        }

        // Re-check the camera binding before the atomic DB claim.
        // The DB provider must independently enforce the same scope and key_id.
        const camera = await trustedScope(params.p_camera_id);
        if (
            camera.tenantId !== params.p_tenant_id.toLowerCase() ||
            camera.empresaId !== params.p_empresa_id.toLowerCase()
        ) {
            return false;
        }

        const persisted = await claimOperationalEvent(params);
        if (persisted !== true) {
            return false;
        }

        const scopeKey = `${camera.tenantId}:${camera.empresaId}:${camera.cameraId}`;
        const previous = pendingByScope.get(scopeKey) ?? Promise.resolve();

        const notify = previous.catch(() => {}).then(async () => {
            // Revocations or tenant reassignments occurring after the SQL claim
            // must prevent propagation to SSE.
            const current = await trustedScope(params.p_camera_id);
            if (
                current.tenantId !== camera.tenantId ||
                current.empresaId !== camera.empresaId
            ) {
                return;
            }

            const lastFrame = framesByScope.get(scopeKey) ?? 0;
            if (lastFrame >= Number.MAX_SAFE_INTEGER) {
                return;
            }
            const nextFrame = lastFrame + 1;
            framesByScope.set(scopeKey, nextFrame);

            // Projection from trusted, post-commit SQL params only.
            // No user, device secret, frame, embedding, or raw request is sent.
            await aclRuntime.publishSnapshot({
                cameraId: params.p_camera_id,
                processedFrames: nextFrame,
                lastResult: Object.freeze({
                    accepted: false,
                    status: params.p_status,
                }),
            });
        });

        pendingByScope.set(scopeKey, notify);
        try {
            await notify;
        } catch {
            // SQL already committed: never change success to failure here;
            // retrying an accepted event must not circumvent replay defense.
        } finally {
            if (pendingByScope.get(scopeKey) === notify) {
                pendingByScope.delete(scopeKey);
            }
        }

        return true;
    }

    const backend = createOperationalTrustedDeviceBackendAdapter({
        getDeviceRegistryRecord,
        getDeviceSigningKey,
        claimOperationalEvent: claimThenSignal,
        nowImpl,
    });

    return Object.freeze({
        receiveVerifiedDeviceEvent: backend.receive,
        handleAuthorizedSse: aclRuntime.handle,
    });
}
