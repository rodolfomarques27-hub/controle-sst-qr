import assert from 'node:assert/strict';
import { createHash, createHmac, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createOperationalIngestContract } from '../operationalIngestContract.mjs';
import {
    createOperationalTrustedEdgeProviders,
    DEVICE_LOOKUP_SQL,
    EVENT_CLAIM_SQL,
} from '../operationalTrustedEdgeProviders.mjs';

const PATH = '/api/camera-ia/devices/events';
const T = '11111111-1111-4111-8111-111111111111';
const E = '22222222-2222-4222-8222-222222222222';
const KEY1 = '33333333-3333-4333-8333-333333333333';
const KEY2 = '44444444-4444-4444-8444-444444444444';
const DEVICE = 'device-A';
const CAMERA = 'cam-A';
const NOW = 1792000000000;
const SECRET1 = Buffer.alloc(32, 73);
const SECRET2 = Buffer.alloc(32, 74);

function deviceRecord(overrides = {}) {
    return { deviceId: DEVICE, cameraId: CAMERA, tenantId: T, empresaId: E,
        keyId: KEY1, status: 'ativo', cameraEnabled: true, tenantActive: true,
        ...overrides };
}

function makeFake({ currentRole = 'cam_ia_operational_ingest_executor' } = {}) {
    const state = { role: currentRole, record: deviceRecord(), secret: SECRET1,
        keys: 0, calls: [], dbFailure: false, vaultFailure: false,
        seenEvents: new Set(), seenNonces: new Set(), beforeClaim: null, claimCount: 0,
        claimFail: false, claims: [] };
    async function query(sql, params) {
        state.calls.push({sql, params});
        if (state.dbFailure) throw new Error('db_unavailable');
        if (state.role !== 'cam_ia_operational_ingest_executor') {
            // Represents *both* the in-query current_user guard and C3B grants.
            // No real database or permissions are used in this mock.
            if (sql === DEVICE_LOOKUP_SQL) return { rows: [] };
            if (sql === EVENT_CLAIM_SQL) return {rows: [{claimed: false}]};
        }
        if (sql === DEVICE_LOOKUP_SQL) {
            assert.equal(params.length, 1);
            if (params[0] !== state.record.deviceId || state.record.status !== 'ativo' ||
                !state.record.cameraEnabled || !state.record.tenantActive) return {rows: []};
            return {rows: [{...state.record}]};
        }
        if (sql === EVENT_CLAIM_SQL) {
            if (state.beforeClaim) state.beforeClaim();
            if (state.claimFail) throw new Error('claim_unavailable');
            assert.equal(params.length, 9);
            const [deviceId,cameraId,tenantId,empresaId,keyId,eventId,nonce,status,epoch] = params;
            if (state.record.status !== 'ativo' || !state.record.cameraEnabled ||
                !state.record.tenantActive || deviceId !== state.record.deviceId ||
                cameraId !== state.record.cameraId || tenantId !== state.record.tenantId ||
                empresaId !== state.record.empresaId || keyId !== state.record.keyId ||
                !['NO_FACE', 'MULTIPLE_FACES'].includes(status) ||
                Math.abs(Math.floor(NOW/1000)-epoch) > 120 ||
                state.seenEvents.has(`${deviceId}:${eventId}`) ||
                state.seenNonces.has(`${deviceId}:${nonce}`)) return {rows: [{claimed: false}]};
            state.seenEvents.add(`${deviceId}:${eventId}`);
            state.seenNonces.add(`${deviceId}:${nonce}`);
            state.claims.push(params);
            state.claimCount++;
            return {rows: [{claimed: true}]};
        }
        throw new Error('forbidden_statement');
    }
    async function resolveSigningKey({deviceId,keyId}) {
        state.keys++;
        if (state.vaultFailure) throw new Error('vault_unavailable');
        return {deviceId,keyId,secretBase64:state.secret.toString('base64')};
    }
    const providers = createOperationalTrustedEdgeProviders({query, resolveSigningKey});
    const contract = createOperationalIngestContract({ ...providers, nowImpl:()=>NOW });
    return {state,providers,contract};
}

function signedRequest({eventId=randomUUID(),nonce=randomUUID(),status='NO_FACE',
    deviceId=DEVICE,cameraId=CAMERA,tenantId=T,empresaId=E,key=SECRET1,
    timestamp=Math.floor(NOW/1000),invalidSignature=false,embedding=false} = {}) {
    const payload = {version:1,eventId,deviceId,cameraId,tenantId,empresaId,
        accepted:false,status};
    if (embedding) payload.embedding = [0.1];
    const body = JSON.stringify(payload);
    const digest = createHash('sha256').update(body).digest('hex');
    const sig = createHmac('sha256',key)
        .update(`${timestamp}\n${nonce}\n${digest}\n${PATH}`).digest('base64url');
    return new Request(`https://offline.example.test${PATH}`, {method:'POST',
        headers:{'content-type':'application/json','x-safescan-device-id':deviceId,
            'x-safescan-event-id':eventId,'x-safescan-timestamp':String(timestamp),
            'x-safescan-nonce':nonce,'x-safescan-signature':invalidSignature?'A'.repeat(43):sig},
        body });
}

async function run() {
    assert.throws(() => createOperationalTrustedEdgeProviders(), /trusted_injected/);
    const moduleText = readFileSync(new URL('../operationalTrustedEdgeProviders.mjs', import.meta.url),'utf8');
    assert.doesNotMatch(moduleText, /Deno\s*\.\s*serve\s*\(|createServer\s*\(|process\s*\.\s*env\b|Deno\s*\.\s*env\b|\bfetch\s*\(|\bcreateClient\s*\(/);
    assert.match(DEVICE_LOOKUP_SQL,/private\.camera_ia_get_active_operational_device\(\$1::text\)/);
    assert.match(EVENT_CLAIM_SQL,/private\.camera_ia_claim_operational_event\(/);
    assert.match(DEVICE_LOOKUP_SQL,/current_user = 'cam_ia_operational_ingest_executor'/);
    assert.match(EVENT_CLAIM_SQL,/current_user = 'cam_ia_operational_ingest_executor'/);
    assert.deepEqual([...EVENT_CLAIM_SQL.matchAll(/\$([1-9])::/g)].map(m=>Number(m[1])),[1,2,3,4,5,6,7,8,9]);
    console.log('C3C_NO_REAL_CONNECTION_AND_FIXED_SQL=GREEN');

    const good = makeFake();
    assert.equal((await good.contract.handle(signedRequest())).status,202);
    assert.equal(good.state.claimCount,1);
    assert.deepEqual(good.state.claims[0].slice(0,5),[DEVICE,CAMERA,T,E,KEY1]);
    assert.equal(good.state.calls.length,2);
    assert.equal(good.state.keys,1);
    assert.ok(good.state.calls.every(v=>v.sql===DEVICE_LOOKUP_SQL||v.sql===EVENT_CLAIM_SQL));
    assert.ok(!JSON.stringify(good.state.calls).includes(SECRET1.toString('base64')));
    console.log('C3C_HMAC_TO_NINE_POSITIONAL_SQL_FIELDS=GREEN');

    const invalid = makeFake();
    for (const request of [signedRequest({invalidSignature:true}),
        signedRequest({embedding:true}),signedRequest({key:Buffer.alloc(32,90)})]) {
        assert.notEqual((await invalid.contract.handle(request)).status,202);
    }
    assert.equal(invalid.state.claimCount,0);
    console.log('C3C_UNVERIFIED_AND_BIOMETRIC_NO_SQL_CLAIM=GREEN');

    const replay = makeFake();
    const eventId=randomUUID(),nonce=randomUUID();
    const all=await Promise.all(Array.from({length:16},()=>replay.contract.handle(signedRequest({eventId,nonce}))));
    assert.equal(all.filter(v=>v.status===202).length,1);
    assert.equal(all.filter(v=>v.status===409).length,15);
    assert.equal(replay.state.claimCount,1);
    console.log('C3C_ATOMIC_MOCK_REPLAY_1_OF_16=GREEN');

    for (const role of ['anon','authenticated','service_role','cam_ia_no_access']) {
        const m=makeFake({currentRole:role});
        assert.notEqual((await m.contract.handle(signedRequest())).status,202);
        assert.equal(m.state.keys,0);
        assert.equal(m.state.claimCount,0);
    }
    console.log('C3C_UNAUTHORIZED_ROLE_FAIL_CLOSED_MOCK=GREEN');

    const scope=makeFake();
    for (const overrides of [{cameraId:'cam-B'},{tenantId:'77777777-7777-4777-8777-777777777777'},
        {empresaId:'77777777-7777-4777-8777-777777777777'}, {status:'revogado'},
        {cameraEnabled:false},{tenantActive:false}]) {
        scope.state.record=deviceRecord(overrides);
        assert.notEqual((await scope.contract.handle(signedRequest())).status,202);
    }
    assert.equal(scope.state.claimCount,0);
    console.log('C3C_TENANT_COMPANY_CAMERA_REVOCATION_FAIL_CLOSED=GREEN');

    const rotated=makeFake();
    rotated.state.record=deviceRecord({keyId:KEY2});
    rotated.state.secret=SECRET2;
    assert.notEqual((await rotated.contract.handle(signedRequest({key:SECRET1}))).status,202);
    assert.equal((await rotated.contract.handle(signedRequest({key:SECRET2}))).status,202);
    assert.equal(rotated.state.claims[0][4],KEY2);
    const revokedDuringClaim=makeFake();
    revokedDuringClaim.state.beforeClaim=()=>{revokedDuringClaim.state.record.status='revogado'};
    assert.equal((await revokedDuringClaim.contract.handle(signedRequest())).status,409);
    assert.equal(revokedDuringClaim.state.claimCount,0);
    const rotatedDuringClaim=makeFake();
    rotatedDuringClaim.state.beforeClaim=()=>{rotatedDuringClaim.state.record.keyId=KEY2};
    assert.equal((await rotatedDuringClaim.contract.handle(signedRequest())).status,409);
    assert.equal(rotatedDuringClaim.state.claimCount,0);
    console.log('C3C_ROTATION_AND_REVOCATION_AT_MOCK_COMMIT=GREEN');
    console.log('C3C_KEY_ROTATION=GREEN');

    const failed=makeFake();
    failed.state.dbFailure=true;
    assert.equal((await failed.contract.handle(signedRequest())).status,503);
    failed.state.dbFailure=false;failed.state.vaultFailure=true;
    assert.equal((await failed.contract.handle(signedRequest())).status,503);
    failed.state.vaultFailure=false;failed.state.claimFail=true;
    assert.equal((await failed.contract.handle(signedRequest())).status,503);
    assert.equal(failed.state.claimCount,0);
    console.log('C3C_DB_VAULT_CLAIM_UNAVAILABLE_FAIL_CLOSED=GREEN');

    const malformed=makeFake();
    const malformedRecords=[{...deviceRecord(),secretBase64:'bad'},
        {...deviceRecord(),keyId:null}, {...deviceRecord(),unexpected:1}];
    for (const record of malformedRecords) {
        malformed.state.record=record;
        assert.notEqual((await malformed.contract.handle(signedRequest())).status,202);
    }
    assert.equal(malformed.state.claimCount,0);
    console.log('C3C_UNTRUSTED_DB_RECORD_FAIL_CLOSED=GREEN');

    const direct=makeFake();
    const claimArgs={p_device_id:DEVICE,p_camera_id:CAMERA,p_tenant_id:T,p_empresa_id:E,
        p_key_id:KEY1,p_event_id:randomUUID(),p_nonce:randomUUID(),
        p_status:'NO_FACE',p_event_epoch_seconds:Math.floor(NOW/1000)};
    assert.equal(await direct.providers.claimOperationalEvent(claimArgs),true);
    await assert.rejects(()=>direct.providers.claimOperationalEvent({...claimArgs,rawEmbedding:'x'}), /invalid_operational_claim/);
    await assert.rejects(()=>direct.providers.getDeviceSigningKey({deviceId:DEVICE,keyId:'wrong'}),/invalid_key_id/);
    console.log('C3C_PROVIDER_ARGUMENTS_MINIMAL=GREEN');
    console.log('R10K_3C4F_C3C_OFFLINE_ADAPTERS=GREEN');
}
run().catch((error)=>{console.error(error);process.exitCode=1;});
