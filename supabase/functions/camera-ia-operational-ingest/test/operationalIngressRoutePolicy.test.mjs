import assert from 'node:assert/strict';
import test from 'node:test';
import { createHmac, createHash, randomUUID } from 'node:crypto';
import { createOperationalIngestContract } from '../operationalIngestContract.mjs';
import { createUnMountedOperationalIngressRoutePolicy,
    isApprovedOperationalDestination } from '../operationalIngressRoutePolicy.mjs';
import { createOperationalDeviceHttpsPublisher } from '../../../../infra/vision-gateway/src/http/operationalDeviceHttpsPublisher.mjs';

const PATH = '/api/camera-ia/devices/events';
const ENDPOINT = `https://operational.example.test${PATH}`;
const T = '11111111-1111-4111-8111-111111111111';
const E = '22222222-2222-4222-8222-222222222222';
const K = '33333333-3333-4333-8333-333333333333';
const DEVICE = 'device-A';
const CAMERA = 'cam-A';
const SECRET = Buffer.alloc(32, 71);
const NOW = 1792000000000;

function setup({ rateLimit = async () => true, handler } = {}) {
    const state = {
        claims: 0, verifiedCalls: 0, rateCalls: 0,
        events: new Set(), nonces: new Set(),
        status: 'ativo', keyId: K, secret: SECRET, registryDown: false,
    };
    const original = createOperationalIngestContract({
        nowImpl: () => NOW,
        getDeviceRegistryRecord: async ({ deviceId }) => {
            if (state.registryDown) throw new Error('registry_offline');
            return {
                deviceId, cameraId: CAMERA, tenantId: T, empresaId: E,
                keyId: state.keyId, status: state.status,
                cameraEnabled: true, tenantActive: true,
            };
        },
        getDeviceSigningKey: async ({deviceId,keyId}) => ({
            deviceId,keyId, secretBase64: state.secret.toString('base64'),
        }),
        claimOperationalEvent: async (c) => {
            if (state.events.has(c.p_event_id) || state.nonces.has(c.p_nonce)) return false;
            state.events.add(c.p_event_id);
            state.nonces.add(c.p_nonce);
            state.claims += 1;
            return true;
        },
    });
    const route = createUnMountedOperationalIngressRoutePolicy({
        approvedEndpointUrl: ENDPOINT,
        verifyHmacAndClaim: async (request) => {
            state.verifiedCalls++;
            return handler ? handler(request) : original.handle(request);
        },
        checkRateLimit: async (x) => {
            state.rateCalls++;
            return rateLimit(x);
        },
        bodyTimeoutMs: 110,
    });
    return { state, route, original };
}

function signedRequest({url=ENDPOINT, key=SECRET, extraHeaders={}, nonce=randomUUID(),
    eventId=randomUUID(), payloadPatch={}, rawBody, timestamp=String(Math.floor(NOW / 1000))} = {}) {
    const payload = {
        version: 1, eventId, deviceId: DEVICE, cameraId: CAMERA,
        tenantId: T, empresaId: E, accepted: false, status: 'NO_FACE',
        ...payloadPatch,
    };
    const body = rawBody ?? JSON.stringify(payload);
    const digest = createHash('sha256').update(body).digest('hex');
    const canonical = `${timestamp}\n${nonce}\n${digest}\n${PATH}`;
    const signature = createHmac('sha256', key).update(canonical).digest('base64url');
    return new Request(url, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'x-safescan-device-id': DEVICE,
            'x-safescan-event-id': eventId,
            'x-safescan-timestamp': timestamp,
            'x-safescan-nonce': nonce,
            'x-safescan-signature': signature,
            ...extraHeaders,
        },
        body,
    });
}

async function run() {
    for (const candidate of [
        'http://operational.example.test' + PATH,
        'https://127.0.0.1' + PATH,
        'https://localhost' + PATH,
        'https://camera.local' + PATH,
        'https://camera.internal' + PATH,
        'https://192.168.1.5' + PATH,
        'https://[::1]' + PATH,
        'https://user:password@operational.example.test' + PATH,
        'https://operational.example.test:8443' + PATH,
        'https://operational.example.test' + PATH + '?q=1',
        'https://operational.example.test/functions/v1/camera-ia-operational-ingest',
    ]) {
        assert.throws(() => createUnMountedOperationalIngressRoutePolicy({
            approvedEndpointUrl: candidate,
            verifyHmacAndClaim: async () => new Response(null,{status:202}),
            checkRateLimit: async () => true,
        }));
    }
    assert.throws(() => createUnMountedOperationalIngressRoutePolicy({approvedEndpointUrl:ENDPOINT}));
    assert.equal(isApprovedOperationalDestination(ENDPOINT, ENDPOINT), true);
    for (const invalid of [
        `https://evil.example.test${PATH}`,
        `https://operational.example.test${PATH}?preview=1`,
        `https://operational.example.test/functions/v1/camera-ia-operational-ingest`,
        `https://127.0.0.1${PATH}`,
    ]) assert.equal(isApprovedOperationalDestination(invalid, ENDPOINT), false);
    console.log('C3EB_EXACT_HOST_PATH_NO_UNTRUSTED_DESTINATIONS=GREEN');

    const context = setup();
    assert.equal((await context.route.handle(signedRequest())).status, 202);
    assert.equal(context.state.claims, 1);
    assert.equal(context.state.verifiedCalls, 1);
    console.log('C3EB_HMAC_THEN_ATOMIC_SQL=GREEN');

    const sender = setup();
    const publisher = createOperationalDeviceHttpsPublisher({
        endpointUrl: ENDPOINT,
        deviceId: DEVICE, cameraId: CAMERA, tenantId: T, empresaId: E,
        deviceSecretBase64: SECRET.toString('base64'),
        getTrustedCameraBinding: async () => ({cameraId:CAMERA,tenantId:T,empresaId:E}),
        fetchImpl: async (url, opts) => sender.route.handle(new Request(url, {
            method: opts.method, headers: opts.headers, body: opts.body,
        })),
        nowImpl: () => NOW,
        nonceImpl: randomUUID,
        pauseImpl: async () => {},
        retryDelayMs: 0,
    });
    assert.equal(await publisher.publishSnapshot({processedFrames:1,lastResult:{status:'NO_FACE',accepted:false}}),false);
    assert.equal(await publisher.publishSnapshot({processedFrames:2,lastResult:{status:'MULTIPLE_FACES',accepted:false}}),true);
    assert.equal(sender.state.claims,1);
    publisher.close();
    console.log('C3EB_ORIGINAL_HTTPS_PUBLISHER_CONTRACT=GREEN');

    const bad = setup();
    assert.equal((await bad.route.handle(signedRequest({key:Buffer.alloc(32,72)}))).status,401);
    assert.equal((await bad.route.handle(signedRequest({payloadPatch:{embedding:[0.1,0.2]}}))).status,400);
    assert.equal((await bad.route.handle(signedRequest({timestamp:String(Math.floor(NOW/1000)-121)}))).status,401);
    assert.equal(bad.state.claims,0);
    console.log('C3EB_BAD_HMAC_BIOMETRICS_TIMESTAMP_DENIED=GREEN');

    for (const url of [
        `https://evil.example.test${PATH}`,
        `${ENDPOINT}?device=1`,
        `${ENDPOINT}?`,
        `https://operational.example.test/functions/v1/camera-ia-operational-ingest`,
    ]) {
        const s = setup();
        assert.equal((await s.route.handle(signedRequest({url}))).status,404);
        assert.equal(s.state.rateCalls,0);
        assert.equal(s.state.verifiedCalls,0);
    }
    for (const headers of [
        {'authorization':'Bearer user.jwt.untrusted'},
        {'apikey':'secret-looking-opaque'},
        {'x-original-url':PATH},
        {'x-forwarded-host':'evil.example.test'},
        {'x-rewrite-url':PATH},
        {'x-http-method-override':'GET'},
        {'content-encoding':'gzip'},
    ]) {
        const s=setup();
        assert.equal((await s.route.handle(signedRequest({extraHeaders:headers}))).status,400);
        assert.equal(s.state.verifiedCalls,0);
    }
    console.log('C3EB_NO_JWT_BYPASS_QUERY_OR_PROXY_OVERRIDE=GREEN');

    const rejected = setup({rateLimit: async () => false});
    assert.equal((await rejected.route.handle(signedRequest())).status,429);
    assert.equal(rejected.state.verifiedCalls,0);
    const brokenLimit = setup({rateLimit: async () => {throw new Error('offline');}});
    assert.equal((await brokenLimit.route.handle(signedRequest())).status,503);
    assert.equal(brokenLimit.state.verifiedCalls,0);
    const untrusted = setup({handler: async()=>new Response('OK')});
    assert.equal((await untrusted.route.handle(signedRequest())).status,503);
    console.log('C3EB_REQUIRED_RATE_LIMIT_AND_UNTRUSTED_BACKEND_DENIED=GREEN');

    const oversized = setup();
    assert.equal((await oversized.route.handle(signedRequest({rawBody:'A'.repeat(2049)}))).status,413);
    assert.equal(oversized.state.verifiedCalls,0);
    assert.equal((await oversized.route.handle(signedRequest({
        extraHeaders: {'content-length':'2049'},
    }))).status,413);
    assert.equal(oversized.state.verifiedCalls,0);
    const slow = new ReadableStream({start(){/* never enqueue or close */},cancel(){}});
    const timeout = setup();
    const slowReq = new Request(ENDPOINT, {
        method:'POST',
        headers: {'content-type':'application/json','x-safescan-device-id':DEVICE},
        body:slow, duplex:'half',
    });
    assert.equal((await timeout.route.handle(slowReq)).status,408);
    assert.equal(timeout.state.verifiedCalls,0);
    console.log('C3EB_BODY_2KB_AND_READ_TIMEOUT=GREEN');

    const replay=setup();
    const original=signedRequest();
    const blob = new Uint8Array(await original.arrayBuffer());
    const headers = Object.fromEntries(original.headers.entries());
    const statuses=await Promise.all(Array.from({length:16},()=>replay.route.handle(
        new Request(ENDPOINT,{method:'POST',headers,body:blob}),
    )));
    assert.equal(statuses.filter((r)=>r.status===202).length,1);
    assert.equal(statuses.filter((r)=>r.status===409).length,15);
    assert.equal(replay.state.claims,1);
    console.log('C3EB_CONCURRENT_REPLAY_1_OF_16=GREEN');

    assert.equal((await setup().route.handle(new Request(ENDPOINT,{method:'GET'}))).status,405);
    console.log('R10K_3C4F_C3EB_OFFLINE_HTTP_POLICY=GREEN');
}
test(
    'operational ingress route policy — offline contract',
    async () => {
        await run();
    },
);
