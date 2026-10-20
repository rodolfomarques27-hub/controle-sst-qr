import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash, createHmac, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createOperationalIngestContract } from '../operationalIngestContract.mjs';
import { createOperationalDeviceHttpsPublisher } from '../../../../infra/vision-gateway/src/http/operationalDeviceHttpsPublisher.mjs';

const PATH = '/api/camera-ia/devices/events';
const ENDPOINT = `https://operational.example.test${PATH}`;
const T = '11111111-1111-4111-8111-111111111111';
const E = '22222222-2222-4222-8222-222222222222';
const KEY_1 = '33333333-3333-4333-8333-333333333333';
const KEY_2 = '44444444-4444-4444-8444-444444444444';
const DEVICE = 'device-A';
const CAMERA = 'cam-A';
const NOW = 1792000000000;
const SECRET = Buffer.alloc(32, 71);

function setup() {
    const state = {
        status: 'ativo', cameraEnabled: true, tenantActive: true,
        keyId: KEY_1, secret: SECRET, registryError: false,
        keyError: false, claimError: false, cameraId: CAMERA,
        tenantId: T, empresaId: E,
        seenEvents: new Set(), seenNonces: new Set(),
        calls: { registry: 0, key: 0, claim: 0 },
        claims: [],
    };
    const contract = createOperationalIngestContract({
        nowImpl: () => NOW,
        getDeviceRegistryRecord: async ({deviceId}) => {
            state.calls.registry++;
            if (state.registryError) throw new Error('registry-offline');
            return { deviceId, cameraId: state.cameraId,
                tenantId: state.tenantId, empresaId: state.empresaId,
                keyId: state.keyId, status: state.status,
                tenantActive: state.tenantActive, cameraEnabled: state.cameraEnabled };
        },
        getDeviceSigningKey: async ({deviceId, keyId}) => {
            state.calls.key++;
            if (state.keyError) throw new Error('vault-offline');
            return {deviceId, keyId, secretBase64: state.secret.toString('base64')};
        },
        claimOperationalEvent: async (args) => {
            state.calls.claim++;
            if (state.claimError) throw new Error('sql-offline');
            // Emulate the same SQL guards + atomic unique constraints. No real DB.
            await Promise.resolve();
            if (state.status !== 'ativo' || !state.cameraEnabled ||
                !state.tenantActive || args.p_key_id !== state.keyId ||
                args.p_camera_id !== state.cameraId ||
                args.p_tenant_id !== state.tenantId ||
                args.p_empresa_id !== state.empresaId) return false;
            const eventKey = `${args.p_device_id}:${args.p_event_id}`;
            const nonceKey = `${args.p_device_id}:${args.p_nonce}`;
            if (state.seenEvents.has(eventKey) || state.seenNonces.has(nonceKey)) return false;
            state.seenEvents.add(eventKey);
            state.seenNonces.add(nonceKey);
            state.claims.push(args);
            return true;
        },
    });
    return { state, contract };
}

function signedRequest({
    payload = {}, eventId = randomUUID(), nonce = randomUUID(),
    deviceId = DEVICE, timestamp = Math.floor(NOW/1000),
    key = SECRET, path = PATH, method = 'POST',
    contentType = 'application/json', corruptSignature = false,
    rawBody = null,
} = {}) {
    const event = {
        version: 1, eventId, deviceId, cameraId: CAMERA,
        tenantId: T, empresaId: E, accepted: false, status: 'NO_FACE', ...payload,
    };
    const body = rawBody ?? JSON.stringify(event);
    const hash = createHash('sha256').update(body).digest('hex');
    const signature = createHmac('sha256', key).update(`${timestamp}\n${nonce}\n${hash}\n${PATH}`).digest('base64url');
    return new Request(`https://operational.example.test${path}`, {
        method,
        headers: {
            'content-type': contentType,
            'x-safescan-device-id': deviceId,
            'x-safescan-event-id': eventId,
            'x-safescan-timestamp': String(timestamp),
            'x-safescan-nonce': nonce,
            'x-safescan-signature': corruptSignature ? 'A'.repeat(43) : signature,
        },
        body: method === 'POST' ? body : undefined,
    });
}

async function run() {
    assert.throws(() => createOperationalIngestContract(), /trusted_providers/);
    assert.equal(typeof globalThis.crypto?.subtle?.verify, 'function');
    const indexContent = readFileSync(new URL('../index.ts', import.meta.url), 'utf8');
    const contractContent = readFileSync(new URL('../operationalIngestContract.mjs', import.meta.url), 'utf8');
    assert.doesNotMatch(indexContent + contractContent, /Deno\s*\.\s*serve\s*\(/);
    assert.doesNotMatch(indexContent + contractContent, /createServer\s*\(/);
    assert.doesNotMatch(indexContent + contractContent, /service_role|SERVICE_ROLE_KEY|SUPABASE_URL/);
    console.log('UNMOUNTED_AND_NO_REAL_CREDENTIALS=GREEN');

    const good = setup();
    let result = await good.contract.handle(signedRequest());
    assert.equal(result.status, 202);
    assert.equal(result.headers.get('access-control-allow-origin'), null);
    assert.equal(result.headers.get('cache-control'), 'no-store');
    assert.equal(good.state.claims.length, 1);
    assert.deepEqual(Object.keys(good.state.claims[0]), [
        'p_device_id','p_camera_id','p_tenant_id','p_empresa_id',
        'p_key_id','p_event_id','p_nonce','p_status','p_event_epoch_seconds'
    ]);
    assert.equal(good.state.claims[0].p_key_id, KEY_1);
    assert.equal(good.state.claims[0].p_status, 'NO_FACE');
    assert.equal(JSON.stringify(good.state.claims[0]).includes('secret'), false);
    console.log('HMAC_WEBCRYPTO_TO_SQL_NINE_FIELDS=GREEN');

    const hmac = setup();
    assert.equal((await hmac.contract.handle(signedRequest({corruptSignature:true}))).status, 401);
    assert.equal((await hmac.contract.handle(signedRequest({key:Buffer.alloc(32, 72)}))).status, 401);
    assert.equal(hmac.state.calls.claim, 0);
    assert.equal((await hmac.contract.handle(signedRequest({payload:{accepted:true}}))).status, 400);
    assert.equal((await hmac.contract.handle(signedRequest({payload:{embedding:[1,2,3]}}))).status, 400);
    assert.equal((await hmac.contract.handle(signedRequest({payload:{cameraId:['cam-A']}}))).status, 400);
    assert.equal((await hmac.contract.handle(signedRequest({rawBody:'{"version":1,"version":1}'}))).status, 400);
    assert.equal(hmac.state.calls.claim, 0);
    console.log('INVALID_HMAC_AND_BIOMETRICS_NO_SQL=GREEN');

    const bounds = setup();
    assert.equal((await bounds.contract.handle(signedRequest({timestamp:Math.floor(NOW/1000)-121}))).status, 401);
    assert.equal((await bounds.contract.handle(signedRequest({rawBody:'x'.repeat(2049)}))).status, 400);
    assert.equal((await bounds.contract.handle(signedRequest({path:'/wrong'}))).status, 404);
    assert.equal((await bounds.contract.handle(signedRequest({method:'GET'}))).status, 405);
    assert.equal((await bounds.contract.handle(signedRequest({contentType:'text/plain'}))).status, 400);
    assert.equal(bounds.state.calls.claim, 0);
    console.log('PATH_TIMESTAMP_BODY_BOUNDARIES=GREEN');

    const scope = setup();
    for (const value of ['suspenso','revogado','pendente']) {
        scope.state.status = value;
        assert.equal((await scope.contract.handle(signedRequest())).status, 401);
    }
    scope.state.status = 'ativo';
    scope.state.cameraEnabled = false;
    assert.equal((await scope.contract.handle(signedRequest())).status, 401);
    scope.state.cameraEnabled = true;
    scope.state.tenantActive = false;
    assert.equal((await scope.contract.handle(signedRequest())).status, 401);
    scope.state.tenantActive = true;
    scope.state.empresaId = '77777777-7777-4777-8777-777777777777';
    assert.equal((await scope.contract.handle(signedRequest())).status, 401);
    assert.equal(scope.state.calls.claim, 0);
    console.log('DEVICE_TENANT_COMPANY_CAMERA_DEFAULT_DENY=GREEN');

    const replay = setup();
    const eventId = randomUUID();
    const nonce = randomUUID();
    const concurrency = await Promise.all(Array.from({length:16}, () =>
        replay.contract.handle(signedRequest({eventId,nonce}))));
    assert.equal(concurrency.filter((r)=>r.status===202).length, 1);
    assert.equal(concurrency.filter((r)=>r.status===409).length, 15);
    assert.equal(replay.state.claims.length, 1);
    assert.equal((await replay.contract.handle(signedRequest({eventId}))).status,409);
    assert.equal((await replay.contract.handle(signedRequest({nonce}))).status,409);
    console.log('ATOMIC_MOCK_REPLAY_1_OF_16=GREEN');

    const rotated = setup();
    rotated.state.keyId = KEY_2;
    rotated.state.secret = Buffer.alloc(32, 72);
    assert.equal((await rotated.contract.handle(signedRequest())).status, 401);
    assert.equal((await rotated.contract.handle(signedRequest({key: rotated.state.secret}))).status, 202);
    assert.equal(rotated.state.claims[0].p_key_id, KEY_2);
    console.log('KEY_ROTATION_OLD_KEY_REJECTED=GREEN');

    const providers = setup();
    providers.state.registryError = true;
    assert.equal((await providers.contract.handle(signedRequest())).status, 503);
    providers.state.registryError = false;
    providers.state.keyError = true;
    assert.equal((await providers.contract.handle(signedRequest())).status, 503);
    providers.state.keyError = false;
    providers.state.claimError = true;
    assert.equal((await providers.contract.handle(signedRequest())).status, 503);
    assert.equal(providers.state.claims.length, 0);
    console.log('PROVIDERS_FAIL_CLOSED=GREEN');

    const sender = setup();
    const publisher = createOperationalDeviceHttpsPublisher({
        endpointUrl: ENDPOINT,
        deviceId: DEVICE,
        cameraId: CAMERA,
        tenantId: T,
        empresaId: E,
        deviceSecretBase64: SECRET.toString('base64'),
        getTrustedCameraBinding: async () => ({cameraId: CAMERA, tenantId: T, empresaId: E}),
        fetchImpl: async (url, requestOptions) => sender.contract.handle(new Request(url, {
            method: requestOptions.method,
            headers: requestOptions.headers,
            body: requestOptions.body,
        })),
        nowImpl: () => NOW,
        nonceImpl: randomUUID,
        pauseImpl: async () => {},
        retryDelayMs: 0,
    });
    assert.equal(await publisher.publishSnapshot({ processedFrames: 1, lastResult: {status:'NO_FACE',accepted:false} }), false);
    assert.equal(await publisher.publishSnapshot({ processedFrames: 2, lastResult: {status:'MULTIPLE_FACES',accepted:false} }), true);
    assert.equal(sender.state.claims.length, 1);
    assert.equal(sender.state.claims[0].p_status, 'MULTIPLE_FACES');
    publisher.close();
    console.log('ORIGINAL_GATEWAY_HTTPS_PUBLISHER_CONTRACT=GREEN');
    console.log('R10K_3C4F_C2_OFFLINE_CONTRACT=GREEN');
}

test(
    'operational ingest contract — offline contract',
    async () => {
        await run();
    },
);
