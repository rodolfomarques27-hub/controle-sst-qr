import assert from 'node:assert/strict';
import test from 'node:test';
import {randomBytes} from 'node:crypto';
import {EventEmitter} from 'node:events';
import {createOperationalScopedSseCursor} from '../src/operationalScopedSseCursor.mjs';
import {createOperationalV2RecoverableSseController} from '../src/operationalV2RecoverableSseController.mjs';
import {JOURNAL_V2_INSPECT_SQL,JOURNAL_V2_PAGE_SQL} from '../src/operationalV2RecoverableJournalReader.mjs';
import {createSupabaseCameraViewAuthorizationAdapter} from '../../vision-gateway/src/http/supabaseCameraViewAuthorizationAdapter.mjs';

const userId='11111111-1111-4111-8111-111111111111';
const tenantId='22222222-2222-4222-8222-222222222222';
const empresaId='33333333-3333-4333-8333-333333333333';
const cameraId='cam-A';
const otherId='44444444-4444-4444-8444-444444444444';
const jwt='mock.jwt.local.offline.signature.placeholder.very.long.value';
const api='https://offline-acl.invalid/';
const bound={userId,tenantId,empresaId,cameraId};
const event=(n,changes={})=>({deviceId:'device-A',eventId:`00000000-0000-4000-8000-${n.toString(16).padStart(12,'0')}`,
    cameraId,tenantId,empresaId,status:n%2?'NO_FACE':'MULTIPLE_FACES',accepted:false,
    streamSequence:String(n),recordedAt:'2026-10-14T18:00:00.000Z',...changes});
function response(){
    const r=new EventEmitter();
    Object.assign(r,{headersSent:false,writableEnded:false,destroyed:false,status:0,chunks:[],headers:null,
        writeHead(status,headers){this.status=status;this.headers=headers;this.headersSent=true;},
        write(data){if(this.writableEnded)throw new Error('closed');this.chunks.push(data);this.onWrite?.(data);return true;},
        end(body){if(body)this.chunks.push(body);this.writableEnded=true;this.emit('close');}});
    return r;
}
function request(extraHeaders={},overrides={}){
    const r=new EventEmitter();
    return Object.assign(r,{method:'GET',url:'/internal-only/sse',aborted:false,
        headers:{authorization:`Bearer ${jwt}`,...extraHeaders}},overrides);
}
function getFrames(r){
    const str=r.chunks.join('');
    const regex=/id: ([^\n]+)\ndata: ([^\n]+)\n\n/g;
    return [...str.matchAll(regex)].map(match=>({id:match[1],data:JSON.parse(match[2])}));
}
function fixture({count=125,legacy=0,key=randomBytes(32)}={}){
    const state={allowed:true,binding:{tenantId,empresaId,cameraId},sqlFail:false,legacy,gap:null,
        eventChange:null,onWrite:null,onQuery:null,onAccess:null,authCalls:0,rpcCalls:0,sqlCalls:0,queries:[],
        records:Array.from({length:count},(_,i)=>event(i+1))};
    const mockFetch=async(url,options)=>{
        assert.equal(options.headers.authorization,`Bearer ${jwt}`);
        assert.equal(options.redirect,'error');
        const path=new URL(url).pathname;
        if(path==='/auth/v1/user'){
            state.authCalls++;
            if(state.onAccess)state.onAccess('auth',state.authCalls);
            return new Response(JSON.stringify({id:userId}),{status:state.allowed?200:401,
                headers:{'content-type':'application/json'}});
        }
        assert.equal(path,'/rest/v1/rpc/camera_ia_autorizar_visualizacao');
        state.rpcCalls++;
        if(state.onAccess)state.onAccess('rpc',state.rpcCalls);
        return new Response(JSON.stringify(state.allowed?[{
            camera_id:cameraId,tenant_id:tenantId,empresa_id:empresaId}]:[]),{
            status:200,headers:{'content-type':'application/json'}});
    };
    const authorizationAdapter=createSupabaseCameraViewAuthorizationAdapter({
        supabaseUrl:api,anonKey:'offline-anon-placeholder-not-a-real-key',fetchImpl:mockFetch,timeoutMs:1000
    });
    const queryJournal=async(sql,args)=>{
        state.sqlCalls++;
        state.queries.push({sql,args:[...args]});
        assert.ok(Object.isFrozen(args));
        assert.deepEqual(args.slice(0,3),[tenantId,empresaId,cameraId]);
        if(state.onQuery)await state.onQuery(sql,state.sqlCalls);
        if(state.sqlFail)throw new Error('mock_db_down');
        const after=Number(args[3]);
        if(sql===JOURNAL_V2_INSPECT_SQL) {
            return {rows:[{lastSequence:String(state.records.length),earliestAvailableSequence:state.records.length?'1':null,
                legacyUnorderedCount:String(state.legacy),resyncRequired:after>state.records.length ||
                    (state.gap!==null && state.gap===after+1)}]};
        }
        if(sql===JOURNAL_V2_PAGE_SQL){
            if(state.legacy && !args[5])throw new Error('legacy_unacknowledged');
            return {rows:state.records.filter(e=>Number(e.streamSequence)>after &&
                Number(e.streamSequence)<=after+args[4] && Number(e.streamSequence)!==state.gap)
                .map(e=>state.eventChange?state.eventChange({...e}):({...e}))};
        }
        throw new Error('unexpected_sql');
    };
    const cursorCodec=createOperationalScopedSseCursor({key});
    const create=options=>createOperationalV2RecoverableSseController({
        authorizationAdapter,getCameraBinding:async()=>({...state.binding}),queryJournal,cursorCodec,
        ...options
    });
    return {state,create,cursorCodec,request,response};
}

test('B4D replay 125 in 100+25 pages, HMAC IDs and minimal SSE payload',async()=>{
    const f=fixture(),s=f.create(),r=response();
    assert.equal(await s.handle(request(),r,{cameraId}),true);
    assert.equal(r.status,200);assert.equal(r.writableEnded,true);
    assert.equal(r.headers['content-type'],'text/event-stream; charset=utf-8');
    const frames=getFrames(r);
    assert.equal(frames.length,125);
    assert.deepEqual(frames[0].data,{accepted:false,status:'NO_FACE'});
    assert.deepEqual(frames[124].data,{accepted:false,status:'NO_FACE'});
    assert.equal(f.cursorCodec.decode(frames[0].id,bound),'1');
    assert.equal(f.cursorCodec.decode(frames.at(-1).id,bound),'125');
    assert.equal(f.state.queries.filter(x=>x.sql===JOURNAL_V2_PAGE_SQL).length,2);
    assert.ok(f.state.rpcCalls>125,'ACL must revalidate before every SSE emission');
    assert.equal(JSON.stringify(frames).includes('deviceId'),false);
    assert.equal(JSON.stringify(frames).includes('embedding'),false);
    console.log('B4D_REAL_RPC_AUTH_MOCK_FETCH_125_PAGED_SSE=GREEN');
});

test('B4D Last-Event-ID reconnection, new instance, dedup and scoped token',async()=>{
    const key=randomBytes(32),f=fixture({key}),r1=response();
    assert.equal(await f.create({pageSize:100,maxPages:1}).handle(request(),r1,{cameraId}),true);
    assert.equal(getFrames(r1).length,100);
    const last=getFrames(r1).at(-1).id;
    const r2=response();
    assert.equal(await fixture({key}).create().handle(request({'last-event-id':last}),r2,{cameraId}),true);
    const frames=getFrames(r2);
    assert.equal(frames.length,25);
    assert.equal(f.cursorCodec.decode(frames[0].id,bound),'101');
    assert.equal(f.cursorCodec.decode(frames.at(-1).id,bound),'125');
    const tampered=response();
    await f.create().handle(request({'last-event-id':last.slice(0,-1)+'X'}),tampered,{cameraId});
    assert.equal(tampered.status,400);assert.equal(getFrames(tampered).length,0);
    const foreign=f.cursorCodec.encode({...bound,tenantId:otherId},'100');
    const rx=response();
    await f.create().handle(request({'last-event-id':foreign}),rx,{cameraId});
    assert.equal(rx.status,400);
    console.log('B4D_RESTART_RECONNECT_SCOPE_HMAC_NO_DUPLICATE=GREEN');
});

test('B4D revoked during replay: no additional frames and response ends',async()=>{
    const f=fixture({count:6}),r=response();
    let emitted=0;
    r.onWrite=chunk=>{if(chunk.startsWith('id: ')){emitted++;if(emitted===2)f.state.allowed=false;}};
    assert.equal(await f.create().handle(request(),r,{cameraId}),false);
    assert.equal(r.status,200);assert.equal(r.writableEnded,true);
    assert.equal(getFrames(r).length,2);
    assert.ok(f.state.authCalls>=3);
    console.log('B4D_REVOKED_DURING_REPLAY_FAIL_CLOSED=GREEN');
});

test('B4D scope changes and unauthorized JWT RPC cannot leak records',async()=>{
    const f=fixture({count:3});
    f.state.allowed=false;
    const blocked=response();await f.create().handle(request(),blocked,{cameraId});
    assert.equal(blocked.status,401);assert.equal(f.state.sqlCalls,0);
    f.state.allowed=true; f.state.binding.empresaId=otherId;
    const changed=response();await f.create().handle(request(),changed,{cameraId});
    assert.equal(changed.status,401);assert.equal(f.state.sqlCalls,0);
    f.state.binding.empresaId=empresaId;
    let checks=0;
    f.state.onAccess=(kind)=>{if(kind==='rpc' && ++checks===6)f.state.binding.empresaId=otherId;};
    const mid=response();assert.equal(await f.create().handle(request(),mid,{cameraId}),false);
    assert.ok(getFrames(mid).length<3);
    console.log('B4D_AUTH_SCOPE_CHANGED_DENIED=GREEN');
});

test('B4D invalid path/query/origin/JWT/Last-Event-ID fail closed',async()=>{
    const f=fixture({count:1}),s=f.create();
    for(const [req,expected] of [
        [request({origin:'https://example.invalid'}),403],
        [request({}, {method:'POST'}),405],
        [request({}, {url:'/test?jwt=leak'}),400],
        [request({'last-event-id':['x','y']}),400],
        [request({authorization:'Bearer no'}),401],
        [request({'last-event-id':'v1.invalid'}),400]
    ]){
        const res=response(); await s.handle(req,res,{cameraId});
        assert.equal(res.status,expected);assert.equal(getFrames(res).length,0);
    }
    assert.equal(f.state.sqlCalls,0);
    console.log('B4D_NO_HEADER_QUERY_ORIGIN_JWT_BYPASS=GREEN');
});

test('B4D gap and legacy cutover explicit 409; legacy server opt-in',async()=>{
    const f=fixture({count:3,legacy:2});
    const denied=response();await f.create().handle(request(),denied,{cameraId});
    assert.equal(denied.status,409);assert.match(denied.chunks.join(''),/resync_required/);
    const allowed=response();await f.create({acknowledgeLegacy:true}).handle(request(),allowed,{cameraId});
    assert.equal(allowed.status,200);assert.equal(getFrames(allowed).length,3);
    f.state.legacy=0;f.state.gap=2;
    const gap=response();await f.create().handle(request(),gap,{cameraId});
    assert.equal(gap.status,409);assert.equal(getFrames(gap).length,0);
    console.log('B4D_LEGACY_CUTOVER_AND_GAP_RESYNC_REQUIRED=GREEN');
});

test('B4D gap on second page sends resync control, never advances stale cursor',async()=>{
    const f=fixture({count:4});const r=response();
    f.state.onQuery=async(sql)=>{if(sql===JOURNAL_V2_PAGE_SQL && f.state.queries.filter(q=>q.sql===JOURNAL_V2_PAGE_SQL).length===2){f.state.gap=3;}};
    assert.equal(await f.create({pageSize:2}).handle(request(),r,{cameraId}),false);
    assert.equal(getFrames(r).length,2);
    assert.match(r.chunks.join(''),/event: resync-required/);
    assert.doesNotMatch(r.chunks.join(''),/"status":"NO_FACE".*"status":"MULTIPLE_FACES".*"status":"NO_FACE"/s);
    console.log('B4D_SECOND_PAGE_RESYNC_NO_SILENT_SKIP=GREEN');
});

test('B4D DB failure, malformed event and unstable page fail closed',async()=>{
    const f=fixture({count:3});f.state.sqlFail=true;
    const down=response();await f.create().handle(request(),down,{cameraId});
    assert.equal(down.status,503);assert.equal(getFrames(down).length,0);
    f.state.sqlFail=false;f.state.eventChange=row=>({...row,embedding:'untrusted'});
    const unexpected=response();await f.create().handle(request(),unexpected,{cameraId});
    assert.equal(unexpected.status,503);assert.equal(getFrames(unexpected).length,0);
    f.state.eventChange=row=>({...row,tenantId:otherId});
    const crossed=response();await f.create().handle(request(),crossed,{cameraId});
    assert.equal(crossed.status,503);assert.equal(getFrames(crossed).length,0);
    console.log('B4D_DB_FAILURE_BIOMETRIC_CROSS_SCOPE_FAIL_CLOSED=GREEN');
});

test('B4D concurrent 16 independent streams stay scoped and bounded',async()=>{
    const key=randomBytes(32),f=fixture({count:5,key});
    const results=await Promise.all(Array.from({length:16},async()=>{
        const responseObject=response();
        const ok=await f.create({pageSize:2,maxPages:2}).handle(request(),responseObject,{cameraId});
        return {ok,frames:getFrames(responseObject)};
    }));
    for(const {ok,frames} of results){
        assert.equal(ok,true);assert.equal(frames.length,4);
        assert.equal(f.cursorCodec.decode(frames.at(-1).id,bound),'4');
    }
    assert.equal(results.length,16);
    console.log('B4D_16_CONCURRENT_ISOLATED_BOUNDED_REPLAY=GREEN');
});

test('B4D SSE backpressure and aborted request stop further replay',async()=>{
    const f=fixture({count:5}),s=f.create(),r=response();
    let written=0;
    r.write=function(data){
        if(this.writableEnded)throw new Error('closed');
        this.chunks.push(data);
        written++;
        return written<3; // comment + first id; then backpressure on second id
    };
    const ok=await s.handle(request(),r,{cameraId});
    assert.equal(ok,false);assert.equal(r.writableEnded,true);
    assert.equal(getFrames(r).length,2);
    const req=request(),cancelled=response();
    cancelled.onWrite=chunk=>{if(chunk.startsWith('id: '))req.aborted=true;};
    assert.equal(await s.handle(req,cancelled,{cameraId}),false);
    assert.equal(getFrames(cancelled).length,1);
    console.log('B4D_BACKPRESSURE_ABORT_CLOSE_NO_EXTRA_EVENTS=GREEN');
});
