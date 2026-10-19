/**
 * SafeScan Brasil | R10K-3C4F-C3F-B4-C | OFFLINE, UNMOUNTED
 * C3F-A compatibility shim for C3F-B4-B V2 ATOMIC PostgreSQL handoff.
 *
 * IMPORTANT: handoffDurably() executes exactly one SECURITY DEFINER SQL
 * function that writes to the journal AND acknowledges the outbox within
 * ONE transaction. ackOperationalOutbox() is a LOCAL one-shot observation
 * of that already-committed result; it NEVER sends a legacy ACK query.
 *
 * This shim has no DB client, credentials, sockets, timers, Supabase SDK,
 * worker process, frontend code, or SSE server. query and clock are injected.
 * A production query provider MUST execute under the narrowly scoped
 * cam_ia_operational_outbox_dispatcher role; check connection ownership,
 * privileges and transaction boundaries separately before integration.
 *
 * Lost in-memory correlation after process death is NOT recovered here;
 * the durable journal remains the source of truth for C3F-B4-D replay.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ID = /^[A-Za-z0-9_.:-]{1,160}$/;
const STATUS = new Set(['NO_FACE', 'MULTIPLE_FACES']);
const LEASE_KEYS = Object.freeze(['deviceId','eventId','cameraId','tenantId','empresaId','status','accepted','leaseToken','leaseUntil']);
const EVENT_KEYS = Object.freeze(['deviceId','eventId','cameraId','tenantId','empresaId','accepted','status']);
const ACK_KEYS = Object.freeze(['workerId','deviceId','eventId','leaseToken']);
const lower = value => value.toLowerCase();
const validUuid = value => typeof value === 'string' && UUID.test(value);
const validId = value => typeof value === 'string' && ID.test(value);
const exact = (value, keys) => value !== null && typeof value === 'object' && !Array.isArray(value) &&
    Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const keyOf = (deviceId,eventId) => `${deviceId}\u0000${lower(eventId)}`;

// Fixed, parameterized statements; never interpolate role, identifiers or values.
// B4-B REVOKES direct ACK EXECUTE from this role: only sequenced V2 atomic handoff is allowed.
export const OUTBOX_LEASE_V2_SQL = `SELECT o."deviceId", o."eventId", o."cameraId", o."tenantId", o."empresaId",
    o.status, o.accepted, o."leaseToken", o."leaseUntil"
FROM private.camera_ia_lease_operational_outbox($1::uuid,$2::integer,$3::integer) AS o
WHERE current_user = 'cam_ia_operational_outbox_dispatcher'`;
export const JOURNAL_HANDOFF_V2_SQL = `SELECT CASE
    WHEN current_user = 'cam_ia_operational_outbox_dispatcher'
    THEN private.camera_ia_handoff_operational_journal_v2($1::uuid,$2::text,$3::uuid,$4::uuid)
    ELSE false
END AS handed_off`;

function checkedRows(result, max) {
    if (!result || typeof result !== 'object' || Array.isArray(result) ||
        (Object.hasOwn(result,'error') && result.error) ||
        !Array.isArray(result.rows) || result.rows.length > max) {
        throw new TypeError('untrusted_sql_result');
    }
    return result.rows;
}
function validClock(now) {
    const ms = now();
    if (!Number.isSafeInteger(ms) || ms < 1) throw new TypeError('untrusted_clock');
    return ms;
}
function leaseMs(value) {
    if (value instanceof Date) return value.getTime();
    if (typeof value !== 'string' ||
        !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(value)) return NaN;
    return Date.parse(value);
}
function normalizeLease(value, now) {
    if (!exact(value, LEASE_KEYS) || !validId(value.deviceId) || !validId(value.cameraId) ||
        !validUuid(value.eventId) || !validUuid(value.tenantId) || !validUuid(value.empresaId) ||
        !validUuid(value.leaseToken) || value.accepted !== false || !STATUS.has(value.status)) {
        throw new TypeError('untrusted_outbox_lease');
    }
    const until = leaseMs(value.leaseUntil);
    if (!Number.isSafeInteger(until) || until <= now || until > now + 300000) {
        throw new TypeError('untrusted_lease_expiration');
    }
    return Object.freeze({
        deviceId:value.deviceId,eventId:lower(value.eventId),cameraId:value.cameraId,
        tenantId:lower(value.tenantId),empresaId:lower(value.empresaId),
        status:value.status,accepted:false,leaseToken:lower(value.leaseToken),
        leaseUntil:new Date(until).toISOString(),leaseUntilMs:until,
    });
}
function eventMatches(event, lease) {
    return exact(event, EVENT_KEYS) && event.accepted === false &&
        validId(event.deviceId) && validId(event.cameraId) &&
        validUuid(event.eventId) && validUuid(event.tenantId) && validUuid(event.empresaId) &&
        STATUS.has(event.status) && event.deviceId === lease.deviceId &&
        event.cameraId === lease.cameraId && lower(event.eventId) === lease.eventId &&
        lower(event.tenantId) === lease.tenantId && lower(event.empresaId) === lease.empresaId &&
        event.status === lease.status;
}
function receipt(lease) {
    return Object.freeze({durable:true,deviceId:lease.deviceId,eventId:lease.eventId,
        cameraId:lease.cameraId,tenantId:lease.tenantId,empresaId:lease.empresaId});
}

/** Compatibility providers for the original C3F-A without changing that file. */
export function createOperationalV2AtomicJournalHandoffAdapter({query,nowImpl = Date.now} = {}) {
    if (typeof query !== 'function' || typeof nowImpl !== 'function') {
        throw new TypeError('trusted_sql_and_clock_required');
    }
    // Lease association is process-local and deliberately NOT a durable cursor.
    const tracked = new Map();
    let leasing = false;

    async function leaseOperationalOutbox({workerId,batchSize,leaseSeconds} = {}) {
        if (!validUuid(workerId) || !Number.isInteger(batchSize) || batchSize < 1 || batchSize > 100 ||
            !Number.isInteger(leaseSeconds) || leaseSeconds < 10 || leaseSeconds > 300) {
            throw new TypeError('invalid_lease_request');
        }
        if (leasing) throw new Error('concurrent_lease_call_denied');
        leasing = true;
        try {
            const now = validClock(nowImpl);
            // Bounded metadata; abandon only entries expired and NOT needed for confirmation.
            for (const [key, entry] of tracked) {
                if (entry.lease.leaseUntilMs <= now) tracked.delete(key);
            }
            if (tracked.size + batchSize > 256) throw new Error('lease_state_capacity_exceeded');
            const rows = checkedRows(await query(OUTBOX_LEASE_V2_SQL,
                Object.freeze([lower(workerId),batchSize,leaseSeconds])), batchSize);
            const unique = new Set();
            const leases = rows.map(row => normalizeLease(row,validClock(nowImpl)));
            for (const lease of leases) {
                const key = keyOf(lease.deviceId,lease.eventId);
                if (unique.has(key) || tracked.has(key)) throw new Error('duplicate_or_reissued_live_lease');
                unique.add(key);
            }
            for (const lease of leases) {
                tracked.set(keyOf(lease.deviceId,lease.eventId),{
                    workerId:lower(workerId),lease,state:'leased',receipt:null,
                });
            }
            return Object.freeze(leases.map(lease => Object.freeze({
                deviceId:lease.deviceId,eventId:lease.eventId,cameraId:lease.cameraId,
                tenantId:lease.tenantId,empresaId:lease.empresaId,status:lease.status,
                accepted:false,leaseToken:lease.leaseToken,leaseUntil:lease.leaseUntil,
            })));
        } finally { leasing = false; }
    }

    async function handoffDurably(event) {
        if (!event || typeof event !== 'object' || !validId(event.deviceId) ||
            !validUuid(event.eventId)) throw new TypeError('invalid_handoff_event');
        const entry = tracked.get(keyOf(event.deviceId,event.eventId));
        if (!entry || !eventMatches(event,entry.lease) ||
            entry.lease.leaseUntilMs <= validClock(nowImpl)) {
            throw new Error('unleased_or_out_of_scope_event');
        }
        if (entry.state === 'handed_off') return entry.receipt;
        if (entry.state !== 'leased') throw new Error('duplicate_handoff_in_flight');
        entry.state = 'in_flight';
        try {
            const rows = checkedRows(await query(JOURNAL_HANDOFF_V2_SQL,Object.freeze([
                entry.workerId,entry.lease.deviceId,entry.lease.eventId,entry.lease.leaseToken,
            ])),1);
            if (rows.length !== 1 || !exact(rows[0],['handed_off']) || rows[0].handed_off !== true) {
                throw new Error('atomic_journal_handoff_not_confirmed');
            }
            entry.state = 'handed_off';
            entry.receipt = receipt(entry.lease);
            return entry.receipt;
        } catch(error) {
            // Never manufacture success from a timeout or unknown SQL outcome.
            entry.state = 'leased';
            throw error;
        }
    }

    function ackOperationalOutbox(input) {
        // COMPATIBILITY ONLY. ZERO SQL I/O. B4-B V2 has ALREADY committed the ACK.
        if (!exact(input,ACK_KEYS) || !validUuid(input.workerId) ||
            !validId(input.deviceId) || !validUuid(input.eventId) || !validUuid(input.leaseToken)) {
            return false;
        }
        const key = keyOf(input.deviceId,input.eventId);
        const entry = tracked.get(key);
        if (!entry || entry.state !== 'handed_off' ||
            entry.workerId !== lower(input.workerId) ||
            entry.lease.deviceId !== input.deviceId ||
            entry.lease.leaseToken !== lower(input.leaseToken)) return false;
        tracked.delete(key);
        return true;
    }

    return Object.freeze({leaseOperationalOutbox,handoffDurably,ackOperationalOutbox});
}
