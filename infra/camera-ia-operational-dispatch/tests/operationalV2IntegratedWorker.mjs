/** SafeScan Brasil | R10K-3C4F-C3F-B4-E | TEST ONLY
 * Child PROCESS, actual ephemeral PostgreSQL reached exclusively through
 * `docker exec psql`; mock JWT/RPC ACL, local ephemeral cursor key.
 * No external network/socket/service, live Supabase, camera, server or writes to repo.
 */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {EventEmitter} from 'node:events';
import {createOperationalV2AtomicJournalHandoffAdapter} from '../src/operationalV2AtomicJournalHandoffAdapter.mjs';
import {createOperationalOutboxAclSseConsumer} from '../src/operationalOutboxAclSseConsumer.mjs';
import {createOperationalV2RecoverableSseController} from '../src/operationalV2RecoverableSseController.mjs';
import {createOperationalScopedSseCursor} from '../src/operationalScopedSseCursor.mjs';
import {createSupabaseCameraViewAuthorizationAdapter} from '../../vision-gateway/src/http/supabaseCameraViewAuthorizationAdapter.mjs';
import {OUTBOX_LEASE_V2_SQL,JOURNAL_HANDOFF_V2_SQL} from '../src/operationalV2AtomicJournalHandoffAdapter.mjs';
import {JOURNAL_V2_PAGE_SQL,JOURNAL_V2_INSPECT_SQL} from '../src/operationalV2RecoverableJournalReader.mjs';

const db=process.env.SAFESCAN_B4E_CONTAINER;
const key64=process.env.SAFESCAN_B4E_TEST_KEY_B64;
assert.match(db??'',/^safescan-b4e-[a-f0-9]{12}$/);
assert.match(key64??'',/^[A-Za-z0-9+/]{43}=$/);
const TENANT='11111111-1111-4111-8111-111111111111';
const COMPANY='22222222-2222-4222-8222-222222222222';
const USER='41414141-4141-4414-8414-414141414141';
const CAMERA='cam-A';
const WORKER='72727272-7272-4727-8727-727272727272';
const JWT='offline.jwt.test.token.not.real.and.long.enough';
const SCOPE=Object.freeze({tenantId:TENANT,empresaId:COMPANY,cameraId:CAMERA,userId:USER});
const b64key=Buffer.from(key64,'base64');assert.equal(b64key.byteLength,32);
const cursorCodec=createOperationalScopedSseCursor({key:b64key});
function sqlParam(value,type){
    if(type==='integer'){assert.ok(Number.isInteger(value)&&value>=0&&value<=300);return String(value);}
    if(type==='boolean'){assert.equal(typeof value,'boolean');return value?'true':'false';}
    if(type==='bigint'){assert.match(value,/^(0|[1-9]\d{0,18})$/);assert.ok(BigInt(value)<=9223372036854775807n);return value;}
    if(type==='uuid'){assert.match(value,/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i);return `'${value}'`;}
    if(type==='text'){assert.match(value,/^[\w.:-]{1,160}$/);return `'${value}'`;}
    throw Error('unsupported_test_parameter');
}
const definitions=new Map([
 [OUTBOX_LEASE_V2_SQL,{types:['uuid','integer','integer'],role:'cam_ia_operational_outbox_dispatcher',out:'lease'}],
 [JOURNAL_HANDOFF_V2_SQL,{types:['uuid','text','uuid','uuid'],role:'cam_ia_operational_outbox_dispatcher',out:'handoff'}],
 [JOURNAL_V2_INSPECT_SQL,{types:['uuid','uuid','text','bigint'],role:'cam_ia_operational_journal_reader',out:'inspect'}],
 [JOURNAL_V2_PAGE_SQL,{types:['uuid','uuid','text','bigint','integer','boolean'],role:'cam_ia_operational_journal_reader',out:'page'}],
]);
function formatSql(sql,args){
    const def=definitions.get(sql);if(!def||!Array.isArray(args)||args.length!==def.types.length)throw Error('unknown_sql_contract');
    const parameters=args.map((v,i)=>sqlParam(v,def.types[i]));
    const select={
        lease:`json_build_object('deviceId',"deviceId",'eventId',"eventId",'cameraId',"cameraId",'tenantId',"tenantId",'empresaId',"empresaId",'status',status,'accepted',accepted,'leaseToken',"leaseToken",'leaseUntil',to_char("leaseUntil" at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))`,
        handoff:`json_build_object('handed_off',handed_off)`,
        inspect:`json_build_object('lastSequence',"lastSequence"::text,'earliestAvailableSequence',"earliestAvailableSequence"::text,'legacyUnorderedCount',"legacyUnorderedCount"::text,'resyncRequired',"resyncRequired")`,
        page:`json_build_object('deviceId',"deviceId",'eventId',"eventId",'cameraId',"cameraId",'tenantId',"tenantId",'empresaId',"empresaId",'status',status,'accepted',accepted,'streamSequence',"streamSequence"::text,'recordedAt',to_char("recordedAt" at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))`
    }[def.out];
    return `BEGIN;\nPREPARE b4e_q(${def.types.join(',')}) AS ${sql};\nSET LOCAL ROLE ${def.role};\nCREATE TEMP TABLE b4e_result ON COMMIT DROP AS EXECUTE b4e_q(${parameters.join(',')});\nRESET ROLE;\nSELECT coalesce(json_agg(${select}),'[]'::json)::text FROM b4e_result;\nCOMMIT;`;
}
function dbQuery(sql,args){
    const source=formatSql(sql,args);
    let out;
    try{
        out=execFileSync('docker',['exec','-i',db,'psql','-X','-q','-t','-A','-v','ON_ERROR_STOP=1','-U','postgres','-d','postgres'],
            {input:source,encoding:'utf8',timeout:40000,maxBuffer:4*1024*1024,stdio:['pipe','pipe','pipe']}).trim();
    }catch(error){
        const diagnostic=String(error?.stderr??'');
        if(/B4B_(?:CURSOR_GAP_RESYNC_REQUIRED|CURSOR_AHEAD_RESYNC_REQUIRED|CURSOR_CHANGED_DURING_READ_RESYNC_REQUIRED|LEGACY_UNORDERED_EXPLICIT_CUTOVER_REQUIRED)/.test(diagnostic)){
            throw new Error('journal_resync_required', { cause: error });
        }
        throw new Error('disposable_postgres_query_failed', { cause: error });
    }
    const lines=out.split(/\r?\n/).filter(x=>x.trim().startsWith('['));
    assert.equal(lines.length,1,`unexpected_psql_result:${out.slice(0,100)}`);
    const rows=JSON.parse(lines[0]);assert.ok(Array.isArray(rows));return {rows};
}
function fetchMock(state){
    return async(url,options)=>{
        const u=new URL(url);assert.equal(options.redirect,'error');
        assert.equal(options.headers.authorization,`Bearer ${JWT}`);
        if(u.pathname==='/auth/v1/user')return new Response(JSON.stringify({id:USER}),{status:state.authorized?200:401,headers:{'content-type':'application/json'}});
        assert.equal(u.pathname,'/rest/v1/rpc/camera_ia_autorizar_visualizacao');
        return new Response(JSON.stringify(state.authorized?[{camera_id:CAMERA,tenant_id:TENANT,empresa_id:COMPANY}]:[]),{
            status:200,headers:{'content-type':'application/json'}});
    };
}
function fakeRes(onWrite){const r=new EventEmitter();Object.assign(r,{headersSent:false,writableEnded:false,destroyed:false,status:0,body:[],
    writeHead(status,headers){this.status=status;this.headersSent=true;this.headers=headers;},
    write(chunk){this.body.push(chunk);onWrite?.(chunk);return true;},
    end(chunk){if(chunk)this.body.push(chunk);this.writableEnded=true;this.emit('close');}});return r;}
function fakeReq(token){const r=new EventEmitter();return Object.assign(r,{method:'GET',url:'/internal-test-only',aborted:false,
    headers:{authorization:`Bearer ${JWT}`,...(token?{'last-event-id':token}:{})}});}
function frames(res){return [...res.body.join('').matchAll(/id: ([^\n]+)\ndata: ([^\n]+)\n\n/g)].map(m=>({id:m[1],status:JSON.parse(m[2]).status,
    accepted:JSON.parse(m[2]).accepted}));}
async function replay(token,{revokeAt=0,deny=false,maxPages=2,terminateAt=0}={}){
    const state={authorized:!deny,count:0};
    const authorizationAdapter=createSupabaseCameraViewAuthorizationAdapter({supabaseUrl:'https://offline-rpc.invalid/',
        anonKey:'offline-anon-placeholder-not-a-real-key',fetchImpl:fetchMock(state),timeoutMs:2000});
    const controller=createOperationalV2RecoverableSseController({
        authorizationAdapter,cursorCodec,queryJournal:async(sql,args)=>dbQuery(sql,args),
        getCameraBinding:async()=>({tenantId:TENANT,empresaId:COMPANY,cameraId:CAMERA}),
        acknowledgeLegacy:false,pageSize:100,maxPages,
    });
    const res=fakeRes(chunk=>{if(chunk.startsWith('id:')){state.count++;if(revokeAt&&state.count>=revokeAt)state.authorized=false; if(terminateAt&&state.count>=terminateAt)process.exit(27);}});
    const ok=await controller.handle(fakeReq(token),res,{cameraId:CAMERA});
    const data=frames(res);
    assert.ok(data.every(x=>x.accepted===false&&['NO_FACE','MULTIPLE_FACES'].includes(x.status)));
    return {ok,status:res.status,count:data.length,first:data[0]?.id??null,last:data.at(-1)?.id??null,
        firstSeq:data[0]?cursorCodec.decode(data[0].id,SCOPE):null,
        lastSeq:data.at(-1)?cursorCodec.decode(data.at(-1).id,SCOPE):null,
        resync:res.body.join('').includes('resync_required')};
}
async function drain(workerId=WORKER){
    const state={authorized:true};
    const injected=createOperationalV2AtomicJournalHandoffAdapter({query:async(sql,args)=>dbQuery(sql,args)});
    const consumer=createOperationalOutboxAclSseConsumer({
        supabaseUrl:'https://offline-rpc.invalid/',anonKey:'offline-anon-placeholder-not-a-real-key',fetchImpl:fetchMock(state),
        getCameraBinding:async()=>({cameraId:CAMERA,tenantId:TENANT,empresaId:COMPANY}),
        leaseOperationalOutbox:injected.leaseOperationalOutbox,handoffDurably:injected.handoffDurably,
        ackOperationalOutbox:injected.ackOperationalOutbox,
        getTrustedDeliveryScope:async()=>({deviceId:'device-A',cameraId:CAMERA,tenantId:TENANT,empresaId:COMPANY,
            deviceActive:true,cameraEnabled:true,tenantActive:true}),
    });
    return await consumer.drainOnce({workerId,batchSize:1,leaseSeconds:120});
}
const mode=process.argv[2];let result;
if(mode==='drain')result=await drain();
else if(mode==='drain-alt')result=await drain('75757575-7575-4757-8757-757575757575');
else if(mode==='replay')result=await replay(process.argv[3]||undefined);
else if(mode==='replay-first')result=await replay(undefined,{maxPages:1});
else if(mode==='revoked')result=await replay(undefined,{revokeAt:2});
else if(mode==='crash-after-25')result=await replay(undefined,{terminateAt:25});
else if(mode==='unauthorized')result=await replay(undefined,{deny:true});
else if(mode==='foreign-cursor')result=await replay(cursorCodec.encode({...SCOPE,empresaId:'23232323-2323-4232-8232-232323232323'},'100'));
else if(mode==='replay-gap')result=await replay(undefined);
else throw Error('invalid_worker_mode');
console.log(JSON.stringify(result));
