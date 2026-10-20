/**
 * SafeScan Brasil | R10K-3C4F-C3C
 * Offline, unmounted, inject-only providers for R10K-3C4F-C2.
 * NO database connection, secret store, network, server or role provisioning.
 *
 * A deployment must provide a narrowly privileged PostgreSQL query client
 * operating AS cam_ia_operational_ingest_executor and a trusted secret resolver.
 * SQL functions are SECURITY DEFINER; effective least privilege requires
 * real connection role and grants to be checked before deployment.
 */
const ID = /^[A-Za-z0-9_.:-]{1,160}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EPOCH = 999999999999;
const CLAIM_FIELDS = Object.freeze([
    'p_device_id', 'p_camera_id', 'p_tenant_id', 'p_empresa_id',
    'p_key_id', 'p_event_id', 'p_nonce', 'p_status', 'p_event_epoch_seconds',
]);
const RECORD_FIELDS = Object.freeze([
    'deviceId', 'cameraId', 'tenantId', 'empresaId', 'keyId',
    'status', 'cameraEnabled', 'tenantActive',
]);
const STATUSES = new Set(['NO_FACE', 'MULTIPLE_FACES']);

// Queries are fixed, parameterized and scoped to the SQL role created by C3B.
// Callers cannot provide SQL or interpolate identifiers. Effective role is
// checked IN EACH statement, never in a separate pooled connection.
export const DEVICE_LOOKUP_SQL = `SELECT d."deviceId", d."cameraId", d."tenantId", d."empresaId",
    d."keyId", d.status, d."cameraEnabled", d."tenantActive"
FROM private.camera_ia_get_active_operational_device($1::text) AS d
WHERE current_user = 'cam_ia_operational_ingest_executor'`;

export const EVENT_CLAIM_SQL = `SELECT CASE
    WHEN current_user = 'cam_ia_operational_ingest_executor'
    THEN private.camera_ia_claim_operational_event(
        $1::text, $2::text, $3::uuid, $4::uuid, $5::uuid,
        $6::uuid, $7::uuid, $8::text, $9::bigint
    )
    ELSE false
END AS claimed`;

function exactKeys(value, keys) {
    return value && typeof value === 'object' && !Array.isArray(value) &&
        Object.keys(value).length === keys.length &&
        keys.every((key) => Object.hasOwn(value, key));
}

function uuid(value) {
    return typeof value === 'string' && UUID.test(value);
}

function requireDeviceId(deviceId) {
    if (typeof deviceId !== 'string' || !ID.test(deviceId)) {
        throw new TypeError('invalid_device_id');
    }
    return deviceId;
}

function requireKeyId(keyId) {
    if (!uuid(keyId)) throw new TypeError('invalid_key_id');
    return keyId.toLowerCase();
}

function validSecretBase64(secretBase64) {
    if (typeof secretBase64 !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(secretBase64) ||
        secretBase64.length > 100) return false;
    try {
        const binary = atob(secretBase64);
        return binary.length >= 32 && binary.length <= 64 &&
            btoa(binary) === secretBase64;
    } catch {
        return false;
    }
}

function checkedRows(result) {
    if (!result || typeof result !== 'object' ||
        (Object.hasOwn(result, 'error') && result.error) ||
        !Array.isArray(result.rows)) {
        throw new TypeError('invalid_database_result');
    }
    if (result.rows.length > 1) throw new TypeError('multiple_database_rows');
    return result.rows;
}

/**
 * @param {object} options
 * @param {(sql:string, parameters: readonly unknown[]) => Promise<{rows:object[]}>} options.query
 *   A trusted backend-only PostgreSQL query facility. MUST NOT use service_role
 *   or elevate privileges. Not provided in this module.
 * @param {(input:{deviceId:string,keyId:string}) => Promise<object>} options.resolveSigningKey
 *   A backend-only vault resolver; keys are never retrieved from SQL or cached.
 *   Not provided in this module.
 * @returns {{getDeviceRegistryRecord:Function,getDeviceSigningKey:Function,claimOperationalEvent:Function}}
 */
export function createOperationalTrustedEdgeProviders({ query, resolveSigningKey } = {}) {
    if (typeof query !== 'function' || typeof resolveSigningKey !== 'function') {
        throw new TypeError('trusted_injected_database_and_vault_required');
    }

    async function getDeviceRegistryRecord({ deviceId } = {}) {
        const id = requireDeviceId(deviceId);
        const rows = checkedRows(await query(DEVICE_LOOKUP_SQL, Object.freeze([id])));
        if (rows.length === 0) return null;
        const record = rows[0];
        if (!exactKeys(record, RECORD_FIELDS) || record.deviceId !== id ||
            typeof record.cameraId !== 'string' || !ID.test(record.cameraId) ||
            !uuid(record.tenantId) || !uuid(record.empresaId) || !uuid(record.keyId) ||
            record.status !== 'ativo' || record.cameraEnabled !== true ||
            record.tenantActive !== true) {
            throw new TypeError('untrusted_device_record');
        }
        return Object.freeze({
            deviceId: id, cameraId: record.cameraId,
            tenantId: record.tenantId.toLowerCase(),
            empresaId: record.empresaId.toLowerCase(),
            keyId: record.keyId.toLowerCase(), status: 'ativo',
            cameraEnabled: true, tenantActive: true,
        });
    }

    async function getDeviceSigningKey({ deviceId, keyId } = {}) {
        const id = requireDeviceId(deviceId);
        const key = requireKeyId(keyId);
        // No cache: every event uses the key version currently validated by SQL.
        const resolved = await resolveSigningKey(Object.freeze({ deviceId: id, keyId: key }));
        if (!exactKeys(resolved, ['deviceId', 'keyId', 'secretBase64']) ||
            resolved.deviceId !== id || !uuid(resolved.keyId) ||
            resolved.keyId.toLowerCase() !== key ||
            !validSecretBase64(resolved.secretBase64)) {
            throw new TypeError('invalid_or_rotated_signing_key');
        }
        return Object.freeze({ deviceId: id, keyId: key,
            secretBase64: resolved.secretBase64 });
    }

    async function claimOperationalEvent(input) {
        if (!exactKeys(input, CLAIM_FIELDS) ||
            typeof input.p_device_id !== 'string' || !ID.test(input.p_device_id) ||
            typeof input.p_camera_id !== 'string' || !ID.test(input.p_camera_id) ||
            !uuid(input.p_tenant_id) || !uuid(input.p_empresa_id) ||
            !uuid(input.p_key_id) || !uuid(input.p_event_id) || !uuid(input.p_nonce) ||
            !STATUSES.has(input.p_status) ||
            !Number.isSafeInteger(input.p_event_epoch_seconds) ||
            input.p_event_epoch_seconds < 1 || input.p_event_epoch_seconds > EPOCH) {
            throw new TypeError('invalid_operational_claim');
        }
        const args = Object.freeze(CLAIM_FIELDS.map((name) => input[name]));
        const rows = checkedRows(await query(EVENT_CLAIM_SQL, args));
        if (rows.length !== 1 || !exactKeys(rows[0], ['claimed']) ||
            typeof rows[0].claimed !== 'boolean') {
            throw new TypeError('invalid_atomic_claim_result');
        }
        return rows[0].claimed;
    }

    return Object.freeze({ getDeviceRegistryRecord, getDeviceSigningKey,
        claimOperationalEvent });
}
