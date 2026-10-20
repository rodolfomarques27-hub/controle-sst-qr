/**
 * SafeScan Brasil | R10K-3C4F-C3F-A | LOCAL / OFFLINE / UNMOUNTED
 *
 * Trusted operational outbox consumer. No DB connection, vault, Supabase fetch,
 * server, timer, scheduler or camera is created here. All providers are injected.
 * NEVER host a privileged DB connection in the Vision Gateway or browser.
 *
 * C3D: lease(workerId,batchSize,leaseSeconds) -> rows; ACK(workerId,deviceId,eventId,leaseToken)
 * after durable handoff only. A durable handoff provider MUST persist an idempotent
 * (deviceId,eventId) entry before returning its receipt. This cannot be guaranteed
 * by mocks and requires separate production validation. SSE is best-effort only.
 *
 * The actual Supabase user JWT+camera RPC ACL is enforced by the existing
 * operationalSupabaseAclRuntime, NEVER by caller-supplied permission booleans.
 */
import { createOperationalSupabaseAclRuntime } from '../../vision-gateway/src/http/operationalSupabaseAclRuntime.mjs';

const ID = /^[A-Za-z0-9_.:-]{1,160}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STATUSES = new Set(['NO_FACE', 'MULTIPLE_FACES']);
const LEASE_FIELDS = Object.freeze([
    'deviceId', 'eventId', 'cameraId', 'tenantId', 'empresaId',
    'status', 'accepted', 'leaseToken', 'leaseUntil',
]);
const SCOPE_FIELDS = Object.freeze([
    'deviceId', 'cameraId', 'tenantId', 'empresaId',
    'deviceActive', 'cameraEnabled', 'tenantActive',
]);
const RECEIPT_FIELDS = Object.freeze([
    'durable', 'deviceId', 'eventId', 'cameraId', 'tenantId', 'empresaId',
]);
function exactKeys(obj, keys) {
    return obj !== null && typeof obj === 'object' && !Array.isArray(obj) &&
        Object.keys(obj).length === keys.length && keys.every(k => Object.hasOwn(obj, k));
}
const norm = value => value.toLowerCase();
function matchesScope(row, scope) {
    return row.deviceId === scope.deviceId && row.cameraId === scope.cameraId &&
        norm(row.tenantId) === norm(scope.tenantId) &&
        norm(row.empresaId) === norm(scope.empresaId);
}
function validUuid(value) { return typeof value === 'string' && UUID.test(value); }
function normalizedLease(row, now) {
    if (!exactKeys(row, LEASE_FIELDS) ||
        typeof row.deviceId !== 'string' || !ID.test(row.deviceId) ||
        !validUuid(row.eventId) || typeof row.cameraId !== 'string' || !ID.test(row.cameraId) ||
        !validUuid(row.tenantId) || !validUuid(row.empresaId) ||
        !validUuid(row.leaseToken) || row.accepted !== false || !STATUSES.has(row.status)) {
        throw new Error('invalid_trusted_lease');
    }
    const until = row.leaseUntil instanceof Date
        ? row.leaseUntil.getTime()
        : (typeof row.leaseUntil === 'string' &&
          /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(row.leaseUntil)
            ? Date.parse(row.leaseUntil) : Number.NaN);
    if (!Number.isFinite(until) || until <= now) throw new Error('expired_trusted_lease');
    return Object.freeze({
        deviceId: row.deviceId, eventId: norm(row.eventId), cameraId: row.cameraId,
        tenantId: norm(row.tenantId), empresaId: norm(row.empresaId),
        status: row.status, accepted: false, leaseToken: norm(row.leaseToken),
        leaseUntilMs: until,
    });
}
function validScope(record, event) {
    return exactKeys(record, SCOPE_FIELDS) &&
        typeof record.deviceId === 'string' && ID.test(record.deviceId) &&
        typeof record.cameraId === 'string' && ID.test(record.cameraId) &&
        validUuid(record.tenantId) && validUuid(record.empresaId) &&
        record.deviceActive === true && record.cameraEnabled === true &&
        record.tenantActive === true && matchesScope(event, record);
}
function validCamera(binding, event) {
    return binding && typeof binding === 'object' && !Array.isArray(binding) &&
        binding.cameraId === event.cameraId && validUuid(binding.tenantId) &&
        validUuid(binding.empresaId) && matchesScope(event, {...binding, deviceId:event.deviceId});
}
function minimalEvent(row) {
    return Object.freeze({
        deviceId: row.deviceId, eventId: row.eventId, cameraId: row.cameraId,
        tenantId: row.tenantId, empresaId: row.empresaId, accepted: false,
        status: row.status,
    });
}
function receiptMatches(receipt, event) {
    return exactKeys(receipt, RECEIPT_FIELDS) && receipt.durable === true &&
        validUuid(receipt.eventId) && validUuid(receipt.tenantId) &&
        validUuid(receipt.empresaId) && matchesScope(event, receipt) &&
        norm(receipt.eventId) === event.eventId;
}

export function createOperationalOutboxAclSseConsumer({
    supabaseUrl, anonKey, fetchImpl, getCameraBinding,
    leaseOperationalOutbox, ackOperationalOutbox,
    getTrustedDeliveryScope, handoffDurably, nowImpl = Date.now,
} = {}) {
    if ([fetchImpl, getCameraBinding, leaseOperationalOutbox, ackOperationalOutbox,
        getTrustedDeliveryScope, handoffDurably, nowImpl].some(x => typeof x !== 'function')) {
        throw new TypeError('trusted_injected_providers_required');
    }
    // No legacy checkUserCameraAccess or unprotected SSE interface.
    const aclSse = createOperationalSupabaseAclRuntime({
        supabaseUrl, anonKey, fetchImpl, getCameraBinding,
    });
    const frames = new Map();
    const emitted = new Set();
    let running = false;

    async function trustedAndActive(event) {
        const [scope, camera] = await Promise.all([
            getTrustedDeliveryScope(Object.freeze({
                deviceId: event.deviceId, cameraId: event.cameraId,
                tenantId: event.tenantId, empresaId: event.empresaId,
            })),
            getCameraBinding(event.cameraId),
        ]);
        return validScope(scope, event) && validCamera(camera, event);
    }

    async function drainOnce({workerId, batchSize = 10, leaseSeconds = 60} = {}) {
        if (!validUuid(workerId) || !Number.isInteger(batchSize) || batchSize < 1 || batchSize > 100 ||
            !Number.isInteger(leaseSeconds) || leaseSeconds < 10 || leaseSeconds > 300) {
            throw new TypeError('invalid_worker_or_lease_options');
        }
        if (running) return Object.freeze({busy:true});
        running = true;
        const stats = {leased:0, durable:0, acknowledged:0, signaled:0, deferred:0, failed:0};
        try {
            const rows = await leaseOperationalOutbox(Object.freeze({workerId, batchSize, leaseSeconds}));
            if (!Array.isArray(rows) || rows.length > batchSize) throw new Error('invalid_lease_batch');
            const leases = rows.map(row => normalizedLease(row, nowImpl()));
            const seen = new Set();
            for (const row of leases) {
                const key = `${row.deviceId}:${row.eventId}`;
                if (seen.has(key)) throw new Error('duplicate_lease_in_batch');
                seen.add(key);
            }
            stats.leased = leases.length;
            for (const lease of leases) {
                const event = minimalEvent(lease);
                try {
                    // DB-leased records are NOT inherently authorized for delivery now.
                    if (!(await trustedAndActive(event)) || lease.leaseUntilMs <= nowImpl()) {
                        stats.deferred++;
                        continue;
                    }
                    const receipt = await handoffDurably(event);
                    if (!receiptMatches(receipt, event)) {
                        stats.failed++; // No ACK. Expired lease can be recovered later.
                        continue;
                    }
                    stats.durable++;
                    if (!(await trustedAndActive(event)) || lease.leaseUntilMs <= nowImpl()) {
                        stats.deferred++;
                        continue;
                    }
                    // ACK is separate and may fail; durable sink MUST deduplicate retries.
                    const acked = await ackOperationalOutbox(Object.freeze({
                        workerId, deviceId: lease.deviceId, eventId: lease.eventId,
                        leaseToken: lease.leaseToken,
                    }));
                    if (acked !== true) {
                        stats.deferred++;
                        continue;
                    }
                    stats.acknowledged++;
                    // No promise that an SSE client received this; durable sink retains it.
                    try {
                        if (!(await trustedAndActive(event))) continue;
                        const key = `${event.deviceId}:${event.eventId}`;
                        if (emitted.has(key)) continue;
                        const scopeKey = `${event.tenantId}:${event.empresaId}:${event.cameraId}`;
                        const next = (frames.get(scopeKey) ?? 0) + 1;
                        if (!Number.isSafeInteger(next)) continue;
                        // Best effort ONLY; publishSnapshot creates baseline for first event.
                        const transitioned = await aclSse.publishSnapshot({
                            cameraId: event.cameraId, processedFrames: next,
                            lastResult: Object.freeze({accepted:false,status:event.status}),
                        });
                        frames.set(scopeKey,next);
                        if (emitted.size >= 4096) emitted.clear(); // optimization, NOT durable dedup
                        emitted.add(key);
                        if (transitioned === true) stats.signaled++;
                    } catch {
                        // ACK already committed: never undo durable handoff or leak status.
                        stats.failed++;
                    }
                } catch {
                    // Do not ACK on provider outage, invalid receipt, or revocation.
                    stats.failed++;
                }
            }
            return Object.freeze({...stats});
        } finally {
            running = false;
        }
    }

    return Object.freeze({
        drainOnce,
        handleAuthorizedSse: aclSse.handle,
    });
}
