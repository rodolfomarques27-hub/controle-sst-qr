import assert from 'node:assert/strict';
import { randomUUID, createHash, createHmac } from 'node:crypto';
import { createOperationalIngestContract } from '../operationalIngestContract.mjs';
import { createUnMountedOperationalIngressRoutePolicy } from '../operationalIngressRoutePolicy.mjs';
import {
    isEligiblePublicOperationalIp,
    createUnMountedPinnedOperationalHttpsTransport,
} from '../operationalPinnedHttpsTransport.mjs';
import { createOperationalDeviceHttpsPublisher } from '../../../../infra/vision-gateway/src/http/operationalDeviceHttpsPublisher.mjs';

const PATH = '/api/camera-ia/devices/events';
const ENDPOINT = `https://operational.example.test${PATH}`;
const TENANT = '11111111-1111-4111-8111-111111111111';
const EMPRESA = '22222222-2222-4222-8222-222222222222';
const KEY_ID = '33333333-3333-4333-8333-333333333333';
const SECRET = Buffer.alloc(32, 71); // MOCK ONLY
const NOW = 1792000000000;
const IP = '1.1.1.1'; // test IP, no real request

function signedInit({ key = SECRET, eventId = randomUUID(), nonce = randomUUID(),
    extraHeaders = {}, timestamp = String(Math.floor(NOW / 1000)) } = {}) {
    const body = JSON.stringify({version:1,eventId,deviceId:'device-A',cameraId:'cam-A',
        tenantId:TENANT,empresaId:EMPRESA,accepted:false,status:'NO_FACE'});
    const digest = createHash('sha256').update(body).digest('hex');
    const sig = createHmac('sha256', key).update(`${timestamp}\n${nonce}\n${digest}\n${PATH}`).digest('base64url');
    return {
        method:'POST',redirect:'error',credentials:'omit',cache:'no-store',body,
        headers:{'content-type':'application/json','accept':'application/json',
            'x-safescan-device-id':'device-A','x-safescan-event-id':eventId,
            'x-safescan-timestamp':timestamp,'x-safescan-nonce':nonce,
            'x-safescan-signature':sig,...extraHeaders},
    };
}

function makeFixture({ addresses=[IP], peerAddress=IP, tls={},
    resolver, opener, handler, maxConcurrent=2, totalTimeoutMs=500 } = {}) {
    const state = { dns:0, open:0, request:0, closed:0, sql:0,
        events:new Set(), nonces:new Set(), seen:[] };
    const original = createOperationalIngestContract({
        nowImpl:()=>NOW,
        getDeviceRegistryRecord: async ({deviceId}) => ({
            deviceId,cameraId:'cam-A',tenantId:TENANT,empresaId:EMPRESA,
            keyId:KEY_ID,status:'ativo',cameraEnabled:true,tenantActive:true,
        }),
        getDeviceSigningKey: async ({deviceId,keyId}) => ({
            deviceId,keyId,secretBase64:SECRET.toString('base64'),
        }),
        claimOperationalEvent: async (args) => {
            if(state.events.has(args.p_event_id)||state.nonces.has(args.p_nonce)) return false;
            state.events.add(args.p_event_id); state.nonces.add(args.p_nonce);
            state.sql++; return true;
        },
    });
    const route = createUnMountedOperationalIngressRoutePolicy({
        approvedEndpointUrl: ENDPOINT,
        verifyHmacAndClaim: async(req)=>handler?handler(req):original.handle(req),
        checkRateLimit:async()=>true,bodyTimeoutMs:300,
    });
    const resolveAddresses= resolver || (async (host,{signal})=> {
        state.dns++;
        assert.equal(host,'operational.example.test');
        assert.equal(signal instanceof AbortSignal,true);
        return addresses;
    });
    const openPinnedTlsSession= opener || (async(o)=>{
        state.open++;
        assert.equal(o.hostname,'operational.example.test');
        assert.equal(o.servername,o.hostname);
        assert.equal(o.port,443);
        state.seen.push(o.ip);
        return {
            peerAddress,
            tls:{authorized:true,hostnameVerified:true,
                servername:o.hostname,verifiedHostname:o.hostname,
                protocol:'TLSv1.3',...tls},
            async request({method,headers,body,redirect,signal}) {
                state.request++;
                assert.equal(method,'POST');assert.equal(redirect,'error');
                assert.equal(typeof body,'string'); assert.equal(headers.get('content-type'),'application/json');
                assert.equal(signal instanceof AbortSignal,true);
                return route.handle(new Request(ENDPOINT,{method,headers,body}));
            },
            close() {state.closed++;},
        };
    });
    const transport=createUnMountedPinnedOperationalHttpsTransport({
        approvedEndpointUrl:ENDPOINT,resolveAddresses,openPinnedTlsSession,
        maxConcurrent,totalTimeoutMs,
    });
    return {state,transport,route};
}

async function main(){
    for(const address of ['0.0.0.0','127.0.0.1','10.0.0.1','100.64.0.1',
        '169.254.169.254','172.16.0.1','192.0.2.1','192.168.1.1','198.18.1.1',
        '198.51.100.2','203.0.113.5','224.0.0.1','255.255.255.255',
        '::1','::ffff:127.0.0.1','fe80::1','fc00::1','2001:db8::1',
        '2002:c0a8:0101::1','2001::1','64:ff9b::a00:1','1.2.3.04','127.1']){
        assert.equal(isEligiblePublicOperationalIp(address),false,address);
    }
    for(const address of ['1.1.1.1','8.8.8.8','2606:4700:4700::1111','2001:4860:4860::8888']) {
        assert.equal(isEligiblePublicOperationalIp(address),true,address);
    }
    console.log('C3EC_PUBLIC_UNICAST_IP_GATE=GREEN');

    for(const addresses of [['10.0.0.1'],['1.1.1.1','169.254.169.254'],[],
        ['1.1.1.1','1.1.1.1'],['::ffff:10.0.0.1'],['2001:db8::1']]){
        const f=makeFixture({addresses});
        assert.equal((await f.transport.fetchImpl(ENDPOINT,signedInit())).status,503);
        assert.equal(f.state.open,0);
        assert.equal(f.state.request,0);
    }
    console.log('C3EC_DNS_PRIVATE_MIXED_REBIND_FAIL_CLOSED=GREEN');

    for(const peerAddress of ['10.0.0.8','8.8.8.8','::ffff:10.0.0.1']){
        const f=makeFixture({peerAddress});
        assert.equal((await f.transport.fetchImpl(ENDPOINT,signedInit())).status,503);
        assert.equal(f.state.open,1);
        assert.equal(f.state.request,0,'No application bytes before peer-IP verification');
        assert.equal(f.state.closed,1);
    }
    console.log('C3EC_PEER_IP_PIN_BEFORE_HTTP_BYTES=GREEN');

    for(const tls of [
        {authorized:false}, {hostnameVerified:false},
        {servername:'evil.example.test'}, {verifiedHostname:'evil.example.test'},
        {protocol:'TLSv1.1'},{protocol:null},
    ]){
        const f=makeFixture({tls});
        assert.equal((await f.transport.fetchImpl(ENDPOINT,signedInit())).status,503);
        assert.equal(f.state.request,0);
        assert.equal(f.state.closed,1);
    }
    console.log('C3EC_TLS_CA_HOSTNAME_SNI_PROTOCOL_GUARDS=GREEN');

    for(const url of [
        `https://evil.example.test${PATH}`, `${ENDPOINT}?q=1`,
        `https://operational.example.test:8443${PATH}`,
        `https://127.0.0.1${PATH}`,
        `http://operational.example.test${PATH}`,
    ]){
        const f=makeFixture();
        assert.equal((await f.transport.fetchImpl(url,signedInit())).status,503);
        assert.equal(f.state.dns,0);
    }
    for(const extraHeaders of [
        {'authorization':'Bearer untrusted.jwt'}, {'host':'evil.example.test'},
        {'x-forwarded-for':'127.0.0.1'}, {'content-length':'1'},
        {'x-original-url':'/private'}, {'cookie':'session=abc'},
        {'transfer-encoding':'chunked'},
    ]){
        const f=makeFixture();
        assert.equal((await f.transport.fetchImpl(ENDPOINT,signedInit({extraHeaders}))).status,503);
        assert.equal(f.state.dns,0);
    }
    const oversize=makeFixture();
    assert.equal((await oversize.transport.fetchImpl(ENDPOINT,{...signedInit(),body:'x'.repeat(2049)})).status,503);
    assert.equal(oversize.state.dns,0);
    assert.throws(()=>createUnMountedPinnedOperationalHttpsTransport({approvedEndpointUrl:ENDPOINT}));
    console.log('C3EC_EXACT_ENDPOINT_HEADER_BODY_DEFAULT_DENY=GREEN');

    const valid=makeFixture();
    assert.equal((await valid.transport.fetchImpl(ENDPOINT,signedInit())).status,202);
    assert.equal(valid.state.sql,1);
    assert.equal(valid.state.request,1);
    assert.equal(valid.state.closed,1);
    assert.equal(valid.transport.getActiveCount(),0);
    const badSig=makeFixture();
    assert.equal((await badSig.transport.fetchImpl(ENDPOINT,signedInit({key:Buffer.alloc(32,99)}))).status,401);
    assert.equal(badSig.state.sql,0);
    console.log('C3EC_TRUSTED_C3EB_C2_HMAC_SQL_CHAIN=GREEN');

    const published=makeFixture();
    const publisher=createOperationalDeviceHttpsPublisher({
        endpointUrl:ENDPOINT,deviceId:'device-A',cameraId:'cam-A',
        tenantId:TENANT,empresaId:EMPRESA,
        deviceSecretBase64:SECRET.toString('base64'),
        getTrustedCameraBinding:async()=>({cameraId:'cam-A',tenantId:TENANT,empresaId:EMPRESA}),
        fetchImpl:published.transport.fetchImpl,
        nowImpl:()=>NOW,nonceImpl:randomUUID,retryDelayMs:0,
    });
    assert.equal(await publisher.publishSnapshot({processedFrames:1,lastResult:{status:'NO_FACE',accepted:false}}),false);
    assert.equal(await publisher.publishSnapshot({processedFrames:2,lastResult:{status:'MULTIPLE_FACES',accepted:false}}),true);
    assert.equal(published.state.sql,1);
    publisher.close();
    console.log('C3EC_ORIGINAL_GATEWAY_HTTPS_PUBLISHER_CONTRACT=GREEN');

    let release;
    let requestEntered;
    const entered=new Promise(r=>{requestEntered=r;});
    const wait=new Promise(r=>{release=r;});
    const state={inflight:0,close:0};
    const concurrency=makeFixture({maxConcurrent:1,totalTimeoutMs:800,opener:async o=>({
        peerAddress:o.ip,
        tls:{authorized:true,hostnameVerified:true,servername:o.hostname,
            verifiedHostname:o.hostname,protocol:'TLSv1.3'},
        async request(){state.inflight++;requestEntered();await wait;return new Response(null,{status:204});},
        close(){state.close++;},
    })});
    const first=concurrency.transport.fetchImpl(ENDPOINT,signedInit());
    await entered;
    assert.equal((await concurrency.transport.fetchImpl(ENDPOINT,signedInit())).status,429);
    assert.equal(state.inflight,1);
    release();
    assert.equal((await first).status,204);
    assert.equal(concurrency.transport.getActiveCount(),0);
    console.log('C3EC_CONCURRENCY_LIMIT_NO_OVERBOOKING=GREEN');

    const hungDns=makeFixture({totalTimeoutMs:110,resolver:async()=>new Promise(()=>{})});
    assert.equal((await hungDns.transport.fetchImpl(ENDPOINT,signedInit())).status,503);
    assert.equal(hungDns.transport.getActiveCount(),0);
    const hungConnect=makeFixture({totalTimeoutMs:110,opener:async()=>new Promise(()=>{})});
    assert.equal((await hungConnect.transport.fetchImpl(ENDPOINT,signedInit())).status,503);
    const hungRequest=makeFixture({totalTimeoutMs:110,opener:async o=>({
        peerAddress:o.ip,
        tls:{authorized:true,hostnameVerified:true,servername:o.hostname,
            verifiedHostname:o.hostname,protocol:'TLSv1.3'},
        request:async()=>new Promise(()=>{}),close(){state.close++;},
    })});
    assert.equal((await hungRequest.transport.fetchImpl(ENDPOINT,signedInit())).status,503);
    assert.equal(hungRequest.transport.getActiveCount(),0);
    let lateClosed = 0;
    let lateRequest = 0;
    const late=makeFixture({totalTimeoutMs:110,opener:async(o)=>{
        await new Promise((resolve)=>setTimeout(resolve,160));
        return {
            peerAddress:o.ip,
            tls:{authorized:true,hostnameVerified:true,servername:o.hostname,
                verifiedHostname:o.hostname,protocol:'TLSv1.3'},
            request(){ lateRequest++; return new Response(null,{status:202}); },
            close(){ lateClosed++; },
        };
    }});
    assert.equal((await late.transport.fetchImpl(ENDPOINT,signedInit())).status,503);
    await new Promise((resolve)=>setTimeout(resolve,100));
    assert.equal(lateClosed,1,'Late TLS session must be closed');
    assert.equal(lateRequest,0,'Late TLS session must never send body');
    const aborted=makeFixture({totalTimeoutMs:600,resolver:async()=>new Promise(()=>{})});
    const controller=new AbortController();
    const abortedPromise=aborted.transport.fetchImpl(ENDPOINT,{...signedInit(),signal:controller.signal});
    controller.abort();
    assert.equal((await abortedPromise).status,503);
    assert.equal(aborted.transport.getActiveCount(),0);
    console.log('C3EC_TOTAL_DNS_TLS_REQUEST_DEADLINE_ABORT=GREEN');
    console.log('R10K_3C4F_C3EC_OFFLINE_TRANSPORT=GREEN');
}

main().catch(err=>{console.error(err);process.exitCode=1;});
