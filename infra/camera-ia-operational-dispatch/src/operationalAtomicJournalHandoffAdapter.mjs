/**
 * SafeScan Brasil | R10K-3C4F-C3F-B3 | OFFLINE, UNMOUNTED
 * C3F-A compatibility shim for C3F-B2 ATOMIC PostgreSQL handoff.
 */

import {
    createAtomicJournalHandoffAdapterCore,
} from './atomicJournalHandoffAdapterCore.mjs';

// Fixed, parameterized statements; never interpolate role, identifiers or values.
// B2 REVOKES direct ACK EXECUTE from this role: only atomic handoff is allowed.
export const OUTBOX_LEASE_SQL = `SELECT o."deviceId", o."eventId", o."cameraId", o."tenantId", o."empresaId",
    o.status, o.accepted, o."leaseToken", o."leaseUntil"
FROM private.camera_ia_lease_operational_outbox($1::uuid,$2::integer,$3::integer) AS o
WHERE current_user = 'cam_ia_operational_outbox_dispatcher'`;

export const JOURNAL_HANDOFF_SQL = `SELECT CASE
    WHEN current_user = 'cam_ia_operational_outbox_dispatcher'
    THEN private.camera_ia_handoff_operational_journal($1::uuid,$2::text,$3::uuid,$4::uuid)
    ELSE false
END AS handed_off`;

export function createOperationalAtomicJournalHandoffAdapter({
    query,
    nowImpl = Date.now,
} = {}) {
    return createAtomicJournalHandoffAdapterCore({
        query,
        nowImpl,
        outboxLeaseSql:
            OUTBOX_LEASE_SQL,
        journalHandoffSql:
            JOURNAL_HANDOFF_SQL,
    });
}