import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import {
    createOperationalAtomicJournalHandoffAdapter,
    OUTBOX_LEASE_SQL, JOURNAL_HANDOFF_SQL,
} from '../src/operationalAtomicJournalHandoffAdapter.mjs';
import {createOperationalOutboxAclSseConsumer} from '../src/operationalOutboxAclSseConsumer.mjs';

const tenantId='11111111-1111-4111-8111-111111111111';
const empresaId='22222222-2222-4222-8222-222222222222';
const userId='33333333-3333-4333-8333-333333333333';
const workerId='44444444-4444-4444-8444-444444444444';
const otherTenant='55555555-5555-4555-8555-555555555555';
const jwt=`Bearer ${'u'.repeat(40)}`;
const baseline=1792000000000;
const flush=async()=>{for(let i=0;i<8;i++) await new Promise(setImmediate);};
const opt=()=>({workerId,batchSize:10,leaseSeconds:60});
const eventFor=lease=>Object.freeze({
    deviceId:lease.deviceId,eventId:lease.eventId,cameraId:lease.cameraId,
    tenantId:lease.tenantId,empresaId:lease.empresaId,accepted:false,status:lease.status,
});

function fixture() {
    let now=baseline;
    let deviceActive=true,cameraEnabled=true,tenantActive=true,userActive=true;
    let dbOffline=false,denyRole=false,forceFalse=false,failBeforeCommit=false,throwAfterCommit=false;
    let beforeHandoff=null,afterHandoff=null;
    let leases=0,handoffs=0,directAcks=0,commitCount=0;
    const pending=new Map(),journal=new Map(),calls=[];
    function add(status='NO_FACE',values={}) {
        const row={deviceId:'device-A',eventId:randomUUID(),cameraId:'cam-A',
            tenantId,empresaId,status,accepted:false,
            leaseToken:randomUUID(),leaseUntil:new Date(now + 60000).toISOString(),...values};
        pending.set(`${row.deviceId}:${row.eventId}`,{row,owner:null,until:0,dispatched:false});
        return row;
    }
    async function query(sql,params) {
        calls.push({sql,params:structuredClone(params)});
        assert.ok(Object.isFrozen(params));
        if (dbOffline) throw new Error('mock_database_offline');
        if (sql === OUTBOX_LEASE_SQL) {
            assert.equal(params.length,3);
            assert.match(sql,/private\.camera_ia_lease_operational_outbox/);
            assert.doesNotMatch(sql,/camera_ia_ack_operational_outbox/);
            leases++;
            const [worker,batch,seconds]=params;
            if (denyRole) return {rows:[]};
            const results=[];
            for (const item of pending.values()) {
                if (results.length>=batch) break;
                if (item.dispatched || item.until>now || !deviceActive || !cameraEnabled || !tenantActive) continue;
                item.owner=worker;
                item.until=now+seconds*1000;
                item.row.leaseToken=randomUUID();
                item.row.leaseUntil=new Date(item.until).toISOString();
                results.push({...item.row});
            }
            return {rows:results};
        }
        if (sql === JOURNAL_HANDOFF_SQL) {
            assert.equal(params.length,4);
            assert.match(sql,/private\.camera_ia_handoff_operational_journal/);
            assert.doesNotMatch(sql,/camera_ia_ack_operational_outbox/);
            handoffs++;
            if (beforeHandoff) await beforeHandoff();
            if (failBeforeCommit) throw new Error('mock_tx_rollback');
            const [who,deviceId,eventId,token]=params;
            const item=pending.get(`${deviceId}:${eventId}`);
            const valid=!denyRole && !forceFalse && item && !item.dispatched &&
                item.owner===who && item.row.leaseToken===token && item.until>now &&
                deviceActive && cameraEnabled && tenantActive &&
                item.row.tenantId===tenantId && item.row.empresaId===empresaId && item.row.cameraId==='cam-A' &&
                item.row.accepted===false && ['NO_FACE','MULTIPLE_FACES'].includes(item.row.status);
            if (!valid) return {rows:[{handed_off:false}]};
            item.dispatched=true;
            const key=`${deviceId}:${eventId}`;
            if (!journal.has(key)) {
                journal.set(key,structuredClone(item.row));
                commitCount++;
            }
            if (afterHandoff) await afterHandoff();
            if (throwAfterCommit) throw new Error('mock_response_lost_after_commit');
            return {rows:[{handed_off:true}]};
        }
        throw new Error('unexpected_sql_statement');
    }
    const adapter=()=>createOperationalAtomicJournalHandoffAdapter({query,nowImpl:()=>now});
    const getCameraBinding=async id => id==='cam-A'&&cameraEnabled ? {cameraId:'cam-A',tenantId,empresaId}:null;
    const getTrustedDeliveryScope=async scope=>({
        deviceId:scope.deviceId,cameraId:scope.cameraId,
        tenantId,empresaId,deviceActive,cameraEnabled,tenantActive,
    });
    async function fetchImpl(url,options) {
        assert.equal(options.headers.authorization,jwt);
        if (url.endsWith('/auth/v1/user')) return {
            ok:userActive,status:userActive?200:401,text:async()=>JSON.stringify({id:userId}),
        };
        if (url.endsWith('/rest/v1/rpc/camera_ia_autorizar_visualizacao')) return {
            ok:true,status:200,headers:{get:()=> 'application/json'},
            text:async()=>JSON.stringify(userActive&&cameraEnabled&&tenantActive&&
                JSON.parse(options.body).p_camera_id==='cam-A'
                    ? [{camera_id:'cam-A',tenant_id:tenantId,empresa_id:empresaId}] : []),
        };
        throw new Error('untrusted_url');
    }
    const createConsumer=()=>createOperationalOutboxAclSseConsumer({
        supabaseUrl:'https://mock.supabase.co',anonKey:'a'.repeat(40),fetchImpl,
        getCameraBinding,getTrustedDeliveryScope,nowImpl:()=>now,...adapter(),
    });
    function viewer() {
        const req=new EventEmitter();req.method='GET';req.headers={authorization:jwt};
        const res=new EventEmitter();res.chunks=[];
        res.writeHead=(status,h)=>{res.status=status;res.headers=h;};
        res.write=s=>{res.chunks.push(s);return true;};
        res.end=(s='')=>{if(s)res.chunks.push(s);res.writableEnded=true;res.emit('close');};
        return {req,res};
    }
    return {add,pending,journal,calls,adapter,createConsumer,viewer,
        get leases(){return leases},get handoffs(){return handoffs},
        get directAcks(){return directAcks},get commits(){return commitCount},
        now:()=>now,advance:ms=>now+=ms,
        setDevice:x=>deviceActive=x,setCamera:x=>cameraEnabled=x,
        setTenant:x=>tenantActive=x,setUser:x=>userActive=x,
        setDbOffline:x=>dbOffline=x,setDenyRole:x=>denyRole=x,
        setForceFalse:x=>forceFalse=x,setFailBeforeCommit:x=>failBeforeCommit=x,
        setThrowAfterCommit:x=>throwAfterCommit=x,setBeforeHandoff:x=>beforeHandoff=x,
        setAfterHandoff:x=>afterHandoff=x,
    };
}

assert.throws(()=>createOperationalAtomicJournalHandoffAdapter(),/trusted_sql_and_clock_required/);
assert.match(JOURNAL_HANDOFF_SQL,/current_user = 'cam_ia_operational_outbox_dispatcher'/);
assert.doesNotMatch(OUTBOX_LEASE_SQL+JOURNAL_HANDOFF_SQL,/\b(DELETE|UPDATE|INSERT)\b|private\.camera_ia_ack_operational_outbox/i);
console.log('B3_FIXED_PARAMETERIZED_LEASE_AND_ATOMIC_HANDOFF_SQL=GREEN');

const f=fixture();const client=f.createConsumer();
const {req,res}=f.viewer();
assert.equal(await client.handleAuthorizedSse(req,res,{cameraId:'cam-A'}),true);
f.add('NO_FACE');
const first=await client.drainOnce(opt());
assert.deepEqual(first,{leased:1,durable:1,acknowledged:1,signaled:0,deferred:0,failed:0});
f.add('MULTIPLE_FACES');
const second=await client.drainOnce(opt());
assert.equal(second.acknowledged,1);
assert.equal(second.signaled,1);
await flush();
assert.equal(f.journal.size,2);assert.equal(f.commits,2);
assert.equal(f.handoffs,2);assert.equal(f.directAcks,0);
assert.match(res.chunks.join(''),/"status":"MULTIPLE_FACES"/);
assert.match(res.chunks.join(''),/"accepted":false/);
assert.doesNotMatch(res.chunks.join(''),/device-A|eventId|tenantId|empresaId/);
assert.ok(f.calls.every(call => call.sql===OUTBOX_LEASE_SQL || call.sql===JOURNAL_HANDOFF_SQL));
console.log('B3_REAL_C3FA_CONTRACT_ATOMIC_HANDOFF_NO_LEGACY_ACK=GREEN');

const local=fixture(), localAdapter=local.adapter();local.add();
const [lease]=await localAdapter.leaseOperationalOutbox(opt());
const input=eventFor(lease);
assert.equal(localAdapter.ackOperationalOutbox({workerId,deviceId:lease.deviceId,eventId:lease.eventId,leaseToken:lease.leaseToken}),false);
assert.equal(local.handoffs,0);
const receipt=await localAdapter.handoffDurably(input);
assert.deepEqual(receipt,{durable:true,deviceId:lease.deviceId,eventId:lease.eventId,cameraId:lease.cameraId,tenantId:lease.tenantId,empresaId:lease.empresaId});
assert.equal(await localAdapter.handoffDurably(input),receipt);
assert.equal(local.handoffs,1);
assert.equal(localAdapter.ackOperationalOutbox({workerId:randomUUID(),deviceId:lease.deviceId,eventId:lease.eventId,leaseToken:lease.leaseToken}),false);
assert.equal(localAdapter.ackOperationalOutbox({workerId,deviceId:lease.deviceId,eventId:lease.eventId,leaseToken:randomUUID()}),false);
assert.equal(localAdapter.ackOperationalOutbox({workerId,deviceId:lease.deviceId,eventId:lease.eventId,leaseToken:lease.leaseToken}),true);
assert.equal(localAdapter.ackOperationalOutbox({workerId,deviceId:lease.deviceId,eventId:lease.eventId,leaseToken:lease.leaseToken}),false);
assert.equal(local.handoffs,1);assert.equal(local.commits,1);
console.log('B3_RECEIPT_ONE_SHOT_NO_SEPARATE_ACK=GREEN');

for(const kind of ['rollback','return_false','db_down','revoked_device','revoked_camera','revoked_tenant']) {
    const x=fixture();x.add();
    if(kind==='rollback') x.setFailBeforeCommit(true);
    if(kind==='return_false') x.setForceFalse(true);
    if(kind==='db_down') x.setDbOffline(true);
    if(kind==='revoked_device') x.setBeforeHandoff(async()=>x.setDevice(false));
    if(kind==='revoked_camera') x.setBeforeHandoff(async()=>x.setCamera(false));
    if(kind==='revoked_tenant') x.setBeforeHandoff(async()=>x.setTenant(false));
    if (kind === 'db_down') {
        await assert.rejects(x.createConsumer().drainOnce(opt()),/mock_database_offline/);
    } else {
        const result=await x.createConsumer().drainOnce(opt());
        assert.equal(result.acknowledged,0,kind);
    }
    assert.equal(x.commits,0,kind);
    assert.equal(x.journal.size,0,kind);
}
console.log('B3_REVOCATION_ROLLBACK_DB_UNAVAILABLE_FAIL_CLOSED=GREEN');

const foreign=fixture();foreign.add('NO_FACE',{tenantId:otherTenant});
let r=await foreign.createConsumer().drainOnce(opt());
assert.equal(r.acknowledged,0);assert.equal(foreign.journal.size,0);
const unsafe=fixture();unsafe.add('NO_FACE',{embedding:[1,2,3]});
await assert.rejects(unsafe.createConsumer().drainOnce(opt()),/untrusted_outbox_lease/);
assert.equal(unsafe.journal.size,0);
const badEvent=fixture();badEvent.add();
const adapter=badEvent.adapter();const [leased]=await adapter.leaseOperationalOutbox(opt());
await assert.rejects(adapter.handoffDurably({...eventFor(leased),cameraId:'cam-other'}),/unleased_or_out_of_scope_event/);
await assert.rejects(adapter.handoffDurably({...eventFor(leased),embedding:[4]}),/unleased_or_out_of_scope_event/);
assert.equal(badEvent.handoffs,0);
console.log('B3_TENANT_COMPANY_CAMERA_AND_BIOMETRIC_FAIL_CLOSED=GREEN');

const responseLost=fixture();responseLost.add();responseLost.setThrowAfterCommit(true);
r=await responseLost.createConsumer().drainOnce(opt());
assert.equal(r.acknowledged,0);
assert.equal(responseLost.commits,1); // committed at DB but response lost
assert.equal(responseLost.journal.size,1);
responseLost.advance(61000);
r=await responseLost.createConsumer().drainOnce(opt());
assert.equal(r.leased,0);assert.equal(responseLost.commits,1); // journal is recovery source
assert.equal(responseLost.directAcks,0);
console.log('B3_UNKNOWN_COMMIT_RESTART_JOURNAL_RECOVERY_NOT_FAKED=GREEN');

const retry=fixture();retry.add();retry.setFailBeforeCommit(true);
r=await retry.createConsumer().drainOnce(opt());
assert.equal(r.acknowledged,0);assert.equal(retry.commits,0);
retry.setFailBeforeCommit(false);retry.advance(61000);
r=await retry.createConsumer().drainOnce(opt());
assert.equal(r.acknowledged,1);assert.equal(retry.commits,1);assert.equal(retry.journal.size,1);
console.log('B3_EXPIRED_LEASE_RETRY_IDEMPOTENT=GREEN');

const collision=fixture();collision.add();
const workers=Array.from({length:16},()=>collision.createConsumer());
const results=await Promise.all(workers.map(x=>x.drainOnce({...opt(),workerId:randomUUID()})));
assert.equal(results.reduce((n,x)=>n+x.acknowledged,0),1);
assert.equal(collision.commits,1);assert.equal(collision.handoffs,1);
console.log('B3_16_CONCURRENT_CONSUMERS_SINGLE_SQL_COMMIT=GREEN');

const simultaneous=fixture();simultaneous.add();
const a=simultaneous.adapter();const [l]=await a.leaseOperationalOutbox(opt());
let unlock;const wait=new Promise(resolve=>{unlock=resolve;});
simultaneous.setBeforeHandoff(()=>wait);
const ongoing=a.handoffDurably(eventFor(l));
await assert.rejects(a.handoffDurably(eventFor(l)),/duplicate_handoff_in_flight/);
unlock();await ongoing;
assert.equal(simultaneous.handoffs,1);
console.log('B3_NO_PARALLEL_HANDOFF_FOR_SAME_LEASE=GREEN');

const role=fixture();role.add();role.setDenyRole(true);
r=await role.createConsumer().drainOnce(opt());
assert.equal(r.leased,0);assert.equal(role.handoffs,0);
console.log('B3_UNAUTHORIZED_ROLE_NO_LEASE=GREEN');
console.log('R10K_3C4F_C3FB3_OFFLINE_ADAPTER=GREEN');
console.log('REAL_DB=FALSE; AUTH_RPC=MOCK_FETCH; SQL=ATOMIC_HANDOFF_MOCK; SSE=UNMOUNTED');
