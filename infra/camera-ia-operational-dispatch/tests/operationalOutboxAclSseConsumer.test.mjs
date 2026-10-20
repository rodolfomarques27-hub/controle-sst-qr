import assert from 'node:assert/strict';
import test from 'node:test';
import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import { createOperationalOutboxAclSseConsumer } from '../src/operationalOutboxAclSseConsumer.mjs';

const tenantId = '11111111-1111-4111-8111-111111111111';
const empresaId = '22222222-2222-4222-8222-222222222222';
const userId = '33333333-3333-4333-8333-333333333333';
const workerId = '44444444-4444-4444-8444-444444444444';
const cameraId = 'cam-A';
const deviceId = 'device-A';
const jwt = `Bearer ${'u'.repeat(40)}`;
const otherTenantId = '55555555-5555-4555-8555-555555555555';
const otherEmpresaId = '66666666-6666-4666-8666-666666666666';
const fixedTime = 1792000000000;
const flush = async () => {for(let i=0;i<12;i++) await new Promise(setImmediate);};

function createFixture() {
    let now = fixedTime;
    let userActive = true;
    let deviceActive = true;
    let cameraEnabled = true;
    let tenantActive = true;
    let mismatch = false;
    let scopeFailure = false;
    let dbFailure = false;
    let sinkFailure = false;
    let ackFailure = false;
    let afterDurable = null;
    let ackCount = 0;
    let handoffCalls = 0;
    let fetchAuthCalls = 0;
    let fetchRpcCalls = 0;
    const pending = new Map();
    const delivered = new Map();
    function add(status = 'NO_FACE', overrides={}) {
        const row = {
            deviceId, eventId:randomUUID(), cameraId, tenantId,
            empresaId, status, accepted:false, leaseToken:randomUUID(),
            leaseUntil:new Date(now + 60000).toISOString(), ...overrides,
        };
        pending.set(`${row.deviceId}:${row.eventId}`, {row, leaseOwner:null, leasedUntil:0,acked:false});
        return row;
    }
    const getCameraBinding = async id => {
        if (id !== cameraId || !cameraEnabled) return null;
        return {cameraId,tenantId:mismatch?otherTenantId:tenantId,empresaId};
    };
    const getTrustedDeliveryScope = async scope => {
        if (scopeFailure) throw new Error('mock_scope_unavailable');
        return Object.freeze({
            deviceId:scope.deviceId,
            cameraId:scope.cameraId,
            tenantId:mismatch?otherTenantId:tenantId,
            empresaId, deviceActive,cameraEnabled,tenantActive,
        });
    };
    const leaseOperationalOutbox = async ({workerId:who,batchSize,leaseSeconds}) => {
        if (dbFailure) throw new Error('mock_db_outage');
        assert.equal(typeof who,'string');
        const rows=[];
        for (const entry of pending.values()) {
            if (rows.length >= batchSize) break;
            if (entry.acked || entry.leasedUntil > now) continue;
            if (!deviceActive || !cameraEnabled || !tenantActive) continue;
            entry.leaseOwner = who;
            entry.leasedUntil = now + leaseSeconds*1000;
            entry.row.leaseToken=randomUUID();
            entry.row.leaseUntil=new Date(entry.leasedUntil).toISOString();
            rows.push({...entry.row});
        }
        return rows;
    };
    const handoffDurably = async event => {
        handoffCalls++;
        assert.deepEqual(Object.keys(event),[
            'deviceId','eventId','cameraId','tenantId','empresaId','accepted','status',
        ]);
        assert.equal(event.accepted,false);
        assert.ok(['NO_FACE','MULTIPLE_FACES'].includes(event.status));
        assert.doesNotMatch(JSON.stringify(event),/embedding|cpf|nonce|token|secret|password|signature|image/i);
        if (sinkFailure) throw new Error('mock_sink_outage');
        const key=`${event.deviceId}:${event.eventId}`;
        const previous=delivered.get(key);
        if (previous && JSON.stringify(previous)!==JSON.stringify(event)) throw new Error('idempotency_conflict');
        delivered.set(key, structuredClone(event));
        if (afterDurable) await afterDurable();
        return {durable:true,deviceId:event.deviceId,eventId:event.eventId,
            cameraId:event.cameraId,tenantId:event.tenantId,empresaId:event.empresaId};
    };
    const ackOperationalOutbox = async ({workerId:who,deviceId:id,eventId,leaseToken}) => {
        if (dbFailure) throw new Error('mock_db_outage');
        if (ackFailure) return false;
        const entry=pending.get(`${id}:${eventId}`);
        if (!entry || entry.acked || entry.leaseOwner!==who ||
            entry.row.leaseToken!==leaseToken || entry.leasedUntil<=now ||
            !deviceActive || !cameraEnabled || !tenantActive) return false;
        entry.acked=true;
        ackCount++;
        return true;
    };
    async function fetchImpl(url,options) {
        assert.equal(options.headers.authorization,jwt);
        if(url.endsWith('/auth/v1/user')) {
            fetchAuthCalls++;
            return {ok:userActive,status:userActive?200:401,text:async()=>JSON.stringify({id:userId})};
        }
        if(url.endsWith('/rest/v1/rpc/camera_ia_autorizar_visualizacao')) {
            fetchRpcCalls++;
            return {ok:true,status:200,headers:{get:()=> 'application/json'},text:async()=>JSON.stringify(
                userActive && !mismatch && cameraEnabled && tenantActive &&
                JSON.parse(options.body).p_camera_id===cameraId
                    ? [{camera_id:cameraId,tenant_id:tenantId,empresa_id:empresaId}] : [],
            )};
        }
        throw new Error('unexpected_external_request');
    }
    const args={supabaseUrl:'https://mock.supabase.co',anonKey:'a'.repeat(40),fetchImpl,
        getCameraBinding,leaseOperationalOutbox,ackOperationalOutbox,
        getTrustedDeliveryScope,handoffDurably,nowImpl:()=>now};
    const create = () => createOperationalOutboxAclSseConsumer(args);
    const consumer=create();
    function sseSession(id=cameraId) {
        const req=new EventEmitter(); req.method='GET'; req.headers={authorization:jwt};
        const res=new EventEmitter(); res.chunks=[];
        res.writeHead=(status,headers)=>{res.status=status;res.headers=headers;};
        res.write=data=>{res.chunks.push(data);return true;};
        res.end=(data='')=>{if(data)res.chunks.push(data);res.writableEnded=true;res.emit('close');};
        return {req,res,camera:id};
    }
    return {consumer,create,add,pending,delivered,sseSession,args,
        get ackCount(){return ackCount},get handoffCalls(){return handoffCalls},
        get fetchAuthCalls(){return fetchAuthCalls},get fetchRpcCalls(){return fetchRpcCalls},
        setUser:x=>userActive=x,setDevice:x=>deviceActive=x,
        setCamera:x=>cameraEnabled=x,setTenant:x=>tenantActive=x,
        setMismatch:x=>mismatch=x,setScopeFailure:x=>scopeFailure=x,
        setDbFailure:x=>dbFailure=x,setSinkFailure:x=>sinkFailure=x,
        setAckFailure:x=>ackFailure=x,setAfterDurable:x=>afterDurable=x,
        advance:ms=>now+=ms,
    };
}
const opts = () => ({workerId});
test(
    'operational outbox ACL SSE consumer — offline contract',
    async () => {assert.throws(()=>createOperationalOutboxAclSseConsumer(),/trusted_injected_providers_required/);
const f=createFixture();
assert.deepEqual(Object.keys(f.consumer),['drainOnce','handleAuthorizedSse']);
assert.equal('publishSnapshot' in f.consumer,false);
assert.equal('subscribe' in f.consumer,false);
assert.equal('ackLease' in f.consumer,false);
assert.equal('handoffDurably' in f.consumer,false);
const denied=f.sseSession('cam-B');
assert.equal(await f.consumer.handleAuthorizedSse(denied.req,denied.res,{cameraId:'cam-B'}),false);
assert.notEqual(denied.res.status,200);
const viewer=f.sseSession();
assert.equal(await f.consumer.handleAuthorizedSse(viewer.req,viewer.res,{cameraId}),true);
assert.equal(viewer.res.status,200);
console.log('C3FA_RPC_ACL_JWT_NO_BYPASS=GREEN');
f.add('NO_FACE');
let result=await f.consumer.drainOnce(opts());
assert.deepEqual(result,{leased:1,durable:1,acknowledged:1,signaled:0,deferred:0,failed:0});
await flush();
assert.doesNotMatch(viewer.res.chunks.join(''),/"status":"NO_FACE"/);
f.add('MULTIPLE_FACES');
result=await f.consumer.drainOnce(opts());
assert.equal(result.acknowledged,1);
assert.equal(result.signaled,1);
await flush();
const output=viewer.res.chunks.join('');
assert.match(output,/"status":"MULTIPLE_FACES"/);
assert.match(output,/"accepted":false/);
assert.doesNotMatch(output,/device-A|cam-A|11111111|22222222|embedding|password|secret|eventId/);
assert.equal(f.delivered.size,2); assert.equal(f.ackCount,2);
console.log('C3FA_DURABLE_BEFORE_ACK_MINIMAL_ACL_SSE=GREEN');

f.setUser(false);
const before=viewer.res.chunks.join('');
f.add('NO_FACE');
result=await f.consumer.drainOnce(opts());
assert.equal(result.acknowledged,1);
await flush();
assert.equal(viewer.res.chunks.join(''),before);
assert.equal(viewer.res.writableEnded,true);
assert.ok(f.fetchAuthCalls>0 && f.fetchRpcCalls>0);
console.log('C3FA_USER_REVOKED_MIDSTREAM=GREEN');

const scenarios=[
    ['device',f.setDevice],['camera',f.setCamera],['tenant',f.setTenant],['scope',f.setMismatch],
];
for(const [name] of scenarios){
    const g=createFixture();const setLocal= {device:g.setDevice,camera:g.setCamera,tenant:g.setTenant,scope:g.setMismatch}[name];
    g.add();setLocal(name==='scope'?true:false);
    const r=await g.consumer.drainOnce(opts());
    assert.equal(r.acknowledged,0,name);
    assert.equal(g.delivered.size,0,name);
}
const foreign=createFixture();
foreign.add('NO_FACE',{tenantId:otherTenantId,empresaId:otherEmpresaId});
result=await foreign.consumer.drainOnce(opts());
assert.equal(result.acknowledged,0);assert.equal(foreign.delivered.size,0);
console.log('C3FA_TENANT_COMPANY_CAMERA_DEVICE_FAIL_CLOSED=GREEN');

for(const kind of ['scope','sink','db']) {
    const g=createFixture();g.add();
    if(kind==='scope') g.setScopeFailure(true);
    if(kind==='sink') g.setSinkFailure(true);
    if(kind==='db') g.setDbFailure(true);
    if(kind==='db') await assert.rejects(g.consumer.drainOnce(opts()),/mock_db_outage/);
    else {const r=await g.consumer.drainOnce(opts());assert.equal(r.acknowledged,0);}
    assert.equal(g.ackCount,0);
    if(kind==='sink') assert.equal(g.delivered.size,0);
}
console.log('C3FA_FAIL_CLOSED_NO_PREMATURE_ACK=GREEN');

const retry=createFixture();retry.add('MULTIPLE_FACES');
retry.setAckFailure(true);
result=await retry.consumer.drainOnce(opts());
assert.equal(result.durable,1);assert.equal(result.acknowledged,0);
assert.equal(retry.delivered.size,1);
retry.setAckFailure(false);
retry.advance(61000);
result=await retry.consumer.drainOnce(opts());
assert.equal(result.durable,1);assert.equal(result.acknowledged,1);
assert.equal(retry.delivered.size,1);
assert.equal(retry.ackCount,1);
console.log('C3FA_EXPIRED_LEASE_RECOVERY_DURABLE_DEDUP=GREEN');

const revokeMid=createFixture();revokeMid.add();
revokeMid.setAfterDurable(async()=>{revokeMid.setDevice(false);});
result=await revokeMid.consumer.drainOnce(opts());
assert.equal(result.acknowledged,0);assert.equal(revokeMid.delivered.size,1);
console.log('C3FA_REVOCATION_AFTER_DURABLE_BEFORE_ACK=GREEN');

const tamper=createFixture();tamper.add('NO_FACE',{embedding:[1,2,3]});
await assert.rejects(tamper.consumer.drainOnce(opts()),/invalid_trusted_lease/);
assert.equal(tamper.delivered.size,0);
const malformed=createFixture();malformed.add();
malformed.args.leaseOperationalOutbox=async()=>[{bad:'payload'}];
await assert.rejects(malformed.create().drainOnce(opts()),/invalid_trusted_lease/);
assert.equal(malformed.ackCount,0);
console.log('C3FA_INVALID_LEASE_AND_BIOMETRICS_DENIED=GREEN');

const concurr=createFixture();concurr.add();
const workers=Array.from({length:16},()=>concurr.create());
const concurrent=await Promise.all(workers.map(x=>x.drainOnce({workerId:randomUUID()})));
assert.equal(concurrent.reduce((n,r)=>n+(r.acknowledged??0),0),1);
assert.equal(concurr.delivered.size,1);assert.equal(concurr.ackCount,1);
console.log('C3FA_CONCURRENT_LEASE_1_OF_16_MOCK=GREEN');

const inProcess=createFixture();inProcess.add();
const savedLease=inProcess.args.leaseOperationalOutbox;
let unblock;
const waiting=new Promise(resolve=>{unblock=resolve;});
inProcess.args.leaseOperationalOutbox=async x=>{await waiting;return savedLease(x)};
const activeConsumer=inProcess.create();
const a=activeConsumer.drainOnce(opts());
assert.deepEqual(await activeConsumer.drainOnce(opts()),{busy:true});
unblock();await a;
console.log('C3FA_SINGLE_INSTANCE_NON_OVERLAP=GREEN');
console.log('R10K_3C4F_C3FA_OFFLINE_CONSUMER=GREEN');
console.log('REAL_NETWORK=FALSE; DB=MOCK_ONLY; DURABLE_SINK=MOCK_ONLY; ROUTES=OFF');
});
