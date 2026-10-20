/**
 * SafeScan Brasil | R10K-3C4F-C3F-B4-C | OFFLINE / UNMOUNTED
 * Private V2 journal reader. No DB client, JWT provider, network or SSE listener.
 * query and getAuthorizedScope MUST be trusted backend-injected providers.
 * The authorized scope is obtained from a real ACL-backed provider, NEVER from
 * request query/body/Last-Event-ID. Re-authorize before and after each SQL step.
 * The provider used in B4-C tests is mock-only; no actual user auth is claimed.
 *
 * Cursor is a decimal PostgreSQL bigint sequence, scoped to one camera.
 * Historical B2 rows with NULL stream_sequence have NO reconstructible order:
 * explicit cutover acknowledgement is required and NEVER implies their replay.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ID = /^[A-Za-z0-9_.:-]{1,160}$/;
const DECIMAL = /^(?:0|[1-9][0-9]{0,18})$/;
const MAX_INT8 = 9223372036854775807n;
const STATUSES = new Set(['NO_FACE', 'MULTIPLE_FACES']);
const SCOPE_KEYS = Object.freeze(['tenantId','empresaId','cameraId','authorized']);
const INSPECT_KEYS = Object.freeze(['lastSequence','earliestAvailableSequence','legacyUnorderedCount','resyncRequired']);
const PAGE_KEYS = Object.freeze(['deviceId','eventId','cameraId','tenantId','empresaId','status','accepted','streamSequence','recordedAt']);

export const JOURNAL_V2_INSPECT_SQL = `SELECT i."lastSequence", i."earliestAvailableSequence", i."legacyUnorderedCount", i."resyncRequired"
FROM private.camera_ia_inspect_operational_journal_cursor_v2($1::uuid,$2::uuid,$3::text,$4::bigint) AS i`;
export const JOURNAL_V2_PAGE_SQL = `SELECT j."deviceId", j."eventId", j."cameraId", j."tenantId", j."empresaId", j.status,
    j.accepted, j."streamSequence", j."recordedAt"
FROM private.camera_ia_read_operational_journal_page_v2($1::uuid,$2::uuid,$3::text,$4::bigint,$5::integer,$6::boolean) AS j`;

const exact = (row, keys) => row !== null && typeof row === 'object' &&
    !Array.isArray(row) && Object.keys(row).length === keys.length &&
    keys.every(key => Object.hasOwn(row,key));
const validUUID = value => typeof value === 'string' && UUID.test(value);
const validID = value => typeof value === 'string' && ID.test(value);
const lower = value => value.toLowerCase();

function uint64(value, field) {
    // node-postgres returns bigint columns as decimal text by default.
    // Decimal strings are the only supported public representation; avoid JS precision loss.
    if (typeof value !== 'string' || !DECIMAL.test(value)) throw new TypeError(`invalid_${field}`);
    const number = BigInt(value);
    if (number > MAX_INT8) throw new TypeError(`overflow_${field}`);
    return number;
}
function checkedRows(result, limit) {
    if (!result || typeof result !== 'object' || Array.isArray(result) ||
        (Object.hasOwn(result,'error') && result.error) ||
        !Array.isArray(result.rows) || result.rows.length > limit) {
        throw new TypeError('untrusted_journal_sql_result');
    }
    return result.rows;
}
function parseScope(scope) {
    if (!exact(scope,SCOPE_KEYS) || scope.authorized !== true ||
        !validUUID(scope.tenantId) || !validUUID(scope.empresaId) || !validID(scope.cameraId)) {
        throw new Error('unauthorized_journal_scope');
    }
    return Object.freeze({tenantId:lower(scope.tenantId),empresaId:lower(scope.empresaId),cameraId:scope.cameraId});
}
function sameScope(a,b) {
    return a.tenantId === b.tenantId && a.empresaId === b.empresaId && a.cameraId === b.cameraId;
}
function inspected(row) {
    if (!exact(row,INSPECT_KEYS) || typeof row.resyncRequired !== 'boolean') {
        throw new TypeError('invalid_journal_cursor_metadata');
    }
    const last = uint64(row.lastSequence,'last_sequence');
    const earliest = row.earliestAvailableSequence === null ? null : uint64(row.earliestAvailableSequence,'earliest_sequence');
    const legacy = uint64(row.legacyUnorderedCount,'legacy_count');
    if ((earliest !== null && (earliest === 0n || earliest > last)) ||
        (earliest === null && last === 0n && row.resyncRequired === true)) {
        throw new TypeError('inconsistent_journal_cursor_metadata');
    }
    return Object.freeze({last,earliest,legacy,resync:row.resyncRequired});
}
function validRecordedAt(value) {
    if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.toISOString() : null;
    if (typeof value !== 'string' ||
        !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(value)) return null;
    const time = Date.parse(value);
    return Number.isFinite(time) ? new Date(time).toISOString() : null;
}
function normalizedEvent(row,scope,expected) {
    if (!exact(row,PAGE_KEYS) || !validID(row.deviceId) || !validUUID(row.eventId) ||
        !validID(row.cameraId) || !validUUID(row.tenantId) || !validUUID(row.empresaId) ||
        !STATUSES.has(row.status) || row.accepted !== false ||
        row.cameraId !== scope.cameraId || lower(row.tenantId) !== scope.tenantId ||
        lower(row.empresaId) !== scope.empresaId) throw new Error('untrusted_or_cross_scope_journal_event');
    const sequence = uint64(row.streamSequence,'event_sequence');
    const recordedAt = validRecordedAt(row.recordedAt);
    if (sequence !== expected || !recordedAt) throw new Error('journal_sequence_gap_or_invalid_timestamp');
    return Object.freeze({deviceId:row.deviceId,eventId:lower(row.eventId),cameraId:row.cameraId,
        tenantId:lower(row.tenantId),empresaId:lower(row.empresaId),status:row.status,accepted:false,
        streamSequence:sequence.toString(),recordedAt});
}

export function createOperationalV2RecoverableJournalReader({query,getAuthorizedScope} = {}) {
    if (typeof query !== 'function' || typeof getAuthorizedScope !== 'function') {
        throw new TypeError('trusted_query_and_acl_provider_required');
    }
    let reading = false;
    async function authorized(previous) {
        // This provider must revalidate JWT + RPC/ACL and account/device visibility;
        // an untrusted caller-supplied permission flag is not accepted as a provider.
        const current = parseScope(await getAuthorizedScope());
        if (previous && !sameScope(current,previous)) throw new Error('journal_scope_changed_or_revoked');
        return current;
    }
    async function readPage({afterSequence = '0',limit = 100,acknowledgeLegacy = false} = {}) {
        const after = uint64(afterSequence,'cursor');
        if (!Number.isInteger(limit) || limit < 1 || limit > 100 ||
            typeof acknowledgeLegacy !== 'boolean') throw new TypeError('invalid_journal_page_options');
        if (reading) throw new Error('concurrent_journal_read_denied');
        reading = true;
        try {
            const scope = await authorized();
            const params = [scope.tenantId,scope.empresaId,scope.cameraId,after.toString()];
            const inspectRows = checkedRows(await query(JOURNAL_V2_INSPECT_SQL,Object.freeze([...params])),1);
            await authorized(scope);
            if (inspectRows.length !== 1) throw new Error('journal_cursor_inspection_unavailable');
            const meta = inspected(inspectRows[0]);
            if (meta.resync || after > meta.last) throw new Error('journal_resync_required');
            if (meta.legacy > 0n && acknowledgeLegacy !== true) {
                throw new Error('legacy_journal_cutover_explicit_ack_required');
            }
            // Fast path still requires an ACL recheck; a zero-row page does not prove access.
            if (after === meta.last) {
                await authorized(scope);
                return Object.freeze({events:Object.freeze([]),nextSequence:after.toString(),
                    headSequence:meta.last.toString(),hasMore:false,
                    legacyUnorderedCount:meta.legacy.toString(),legacyCutoverAcknowledged:acknowledgeLegacy && meta.legacy>0n});
            }
            const expectedCount = Number((meta.last-after) < BigInt(limit) ? meta.last-after : BigInt(limit));
            if (meta.earliest === null || meta.earliest > after+1n) throw new Error('journal_resync_required');
            await authorized(scope);
            const pageRows = checkedRows(await query(JOURNAL_V2_PAGE_SQL,
                Object.freeze([...params,limit,acknowledgeLegacy])),limit);
            await authorized(scope);
            if (pageRows.length !== expectedCount) throw new Error('journal_missing_or_extra_sequence');
            const events = pageRows.map((row,index) => normalizedEvent(row,scope,after+BigInt(index+1)));
            const next = after+BigInt(events.length);
            return Object.freeze({events:Object.freeze(events),nextSequence:next.toString(),
                headSequence:meta.last.toString(),hasMore:next<meta.last,
                legacyUnorderedCount:meta.legacy.toString(),legacyCutoverAcknowledged:acknowledgeLegacy && meta.legacy>0n});
        } finally { reading = false; }
    }
    return Object.freeze({readPage});
}
