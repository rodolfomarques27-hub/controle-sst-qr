/** SafeScan Brasil | R10K-3C4F-C3F-B5-B | DIAGNOSTIC TEST ONLY
 * Tests the ORIGINAL B4-D controller without changing its source. ALL provider
 * calls are locally injected: no network, real identities, cameras or credentials.
 * A passing vulnerability-reproduction test DOES NOT mean the vulnerability is fixed.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {randomBytes} from 'node:crypto';
import {EventEmitter} from 'node:events';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createOperationalV2RecoverableSseController} from '../src/operationalV2RecoverableSseController.mjs';
import {createOperationalScopedSseCursor} from '../src/operationalScopedSseCursor.mjs';
import {JOURNAL_V2_INSPECT_SQL,JOURNAL_V2_PAGE_SQL} from '../src/operationalV2RecoverableJournalReader.mjs';
import {createSupabaseCameraViewAuthorizationAdapter} from '../../vision-gateway/src/http/supabaseCameraViewAuthorizationAdapter.mjs';

const USER='11111111-1111-4111-8111-111111111111';
const TENANT='22222222-2222-4222-8222-222222222222';
const COMPANY='33333333-3333-4333-8333-333333333333';
const CAMERA='cam-A';
const JWT='offline.test.jwt.revocation.race.mock.only';
function row(n){return {deviceId:'device-A',eventId:`00000000-0000-4000-8000-${n.toString(16).padStart(12,'0')}`,
  tenantId:TENANT,empresaId:COMPANY,cameraId:CAMERA,status:n%2?'NO_FACE':'MULTIPLE_FACES',accepted:false,
  streamSequence:String(n),recordedAt:'2026-10-14T18:00:00.000Z'};}
function fakeResponse(){const r=new EventEmitter();Object.assign(r,{headersSent:false,writableEnded:false,destroyed:false,
  status:0,chunks:[],writes:0,writeHead(status,headers){this.status=status;this.headersSent=true;this.headers=headers},
  write(chunk){assert.equal(this.writableEnded,false);this.chunks.push(chunk);this.writes++;this.onWrite?.(chunk);return true},
  end(chunk){if(chunk)this.chunks.push(chunk);this.writableEnded=true;this.emit('close')}});return r;}
function frames(response){return [...response.chunks.join('').matchAll(/id: ([^\n]+)\ndata: ([^\n]+)\n\n/g)].map(m=>({id:m[1],data:JSON.parse(m[2])}));}
function fakeRequest(){const r=new EventEmitter();return Object.assign(r,{method:'GET',url:'/internal-test-only',aborted:false,
    headers:{authorization:`Bearer ${JWT}`}});}
export function fixture({total=3,pageSize=2,maxPages=2,key=randomBytes(32)}={}){
 const state={userActive:true,cameraActive:true,tenantActive:true,deviceActive:true,
    userChecks:0,rpcChecks:0,sqlChecks:0,encodeChecks:0,writes:0,
    beforeQuery:null,beforeEncode:null,afterWrite:null};
 const fetchMock=async(url,options)=>{
   assert.equal(options.redirect,'error');assert.equal(options.headers.authorization,`Bearer ${JWT}`);
   const path=new URL(url).pathname;
   if(path==='/auth/v1/user') {state.userChecks++;return new Response(JSON.stringify({id:USER}),{
      status:state.userActive?200:401,headers:{'content-type':'application/json'}});}
   assert.equal(path,'/rest/v1/rpc/camera_ia_autorizar_visualizacao');state.rpcChecks++;
   return new Response(JSON.stringify(state.userActive&&state.cameraActive&&state.tenantActive?
      [{camera_id:CAMERA,tenant_id:TENANT,empresa_id:COMPANY}]:[]),{status:200,headers:{'content-type':'application/json'}});
 };
 const auth=createSupabaseCameraViewAuthorizationAdapter({supabaseUrl:'https://offline-acl.invalid/',
    anonKey:'offline-not-a-secret',fetchImpl:fetchMock,timeoutMs:1500});
 const binding=async()=>{
   if(!state.cameraActive)throw new Error('camera_revoked');
   if(!state.tenantActive)throw new Error('tenant_revoked');
   return {tenantId:TENANT,empresaId:COMPANY,cameraId:CAMERA};
 };
 const query=async(sql,args)=>{
   state.sqlChecks++;await state.beforeQuery?.(sql);
   if(!state.deviceActive)throw new Error('device_revoked');
   assert.deepEqual(args.slice(0,3),[TENANT,COMPANY,CAMERA]);const after=Number(args[3]);
   if(sql===JOURNAL_V2_INSPECT_SQL)return {rows:[{lastSequence:String(total),
      earliestAvailableSequence:total?'1':null,legacyUnorderedCount:'0',resyncRequired:after>total}]};
   if(sql===JOURNAL_V2_PAGE_SQL)return {rows:Array.from({length:total},(_,i)=>row(i+1)).filter(x=>
      Number(x.streamSequence)>after&&Number(x.streamSequence)<=after+args[4])};
   throw new Error('unknown_sql_contract');
 };
 const realCodec=createOperationalScopedSseCursor({key});
 const cursorCodec={encode(scope,sequence){state.encodeChecks++;state.beforeEncode?.({scope,sequence});
      return realCodec.encode(scope,sequence)},decode:(...args)=>realCodec.decode(...args)};
 const controller=createOperationalV2RecoverableSseController({authorizationAdapter:auth,
   getCameraBinding:binding,queryJournal:query,cursorCodec,pageSize,maxPages});
 async function execute(){const r=fakeResponse();r.onWrite=chunk=>{if(chunk.startsWith('id:')){state.writes++;
    state.afterWrite?.(state.writes)}};
    const ok=await controller.handle(fakeRequest(),r,{cameraId:CAMERA});return {ok,code:r.status,
       count:frames(r).length,frames:frames(r),ended:r.writableEnded,state};}
 return {state,execute,cursorCodec};
}
function revoke(s,kind){if(kind==='user')s.userActive=false;
  else if(kind==='camera')s.cameraActive=false;
  else if(kind==='tenant')s.tenantActive=false;
  else if(kind==='device')s.deviceActive=false;
  else throw Error('bad_revocation_kind');}
export async function runScenario(kind){
 const f=kind==='device'?fixture({total:101,pageSize:100,maxPages:2}):fixture();let triggered=false;
 f.state.beforeEncode=()=>{if(!triggered){triggered=true;revoke(f.state,kind)}};
 const r=await f.execute();assert.equal(triggered,true);assert.ok(r.state.userChecks>0);
 const expected=kind==='device'?100:1;
 assert.equal(r.count,expected,'B5B diagnostic regression: expected frames after boundary revocation');
 assert.equal(r.ok,false,'further frames must eventually stop after boundary revocation');
 assert.equal(r.ended,true);
 return {kind,frameAfterRevocation:r.count,authorizedAfter:r.state.userActive,
  cameraActiveAfter:r.state.cameraActive,tenantActiveAfter:r.state.tenantActive,
  deviceActiveAfter:r.state.deviceActive,indicator:'RACE_REPRODUCED_NOT_FIXED'};
}
if(process.env.SAFESCAN_B5B_DIAGNOSTIC_CHILD!=='1'){
 test('B5B pre-read revocations are rejected before first SSE frame',async()=>{
   for(const kind of ['user','camera','tenant','device']){
     const f=fixture();let once=false;f.state.beforeQuery=async()=>{if(!once){once=true;revoke(f.state,kind)}};
     const r=await f.execute();assert.equal(r.count,0,`${kind} leaked before first page`);
     assert.equal(r.ok,false);
   }
   console.log('B5B_REVOKE_BEFORE_READ_BLOCKS_ALL_FOUR=GREEN');
 });
 test('B5B gated async PostgreSQL read: revocation during in-flight read blocks emission',async()=>{
   for(const kind of ['user','camera','tenant','device']){
     const f=fixture();let enter,release;const entered=new Promise(r=>{enter=r});
     const gate=new Promise(r=>{release=r});let once=false;
     f.state.beforeQuery=async()=>{if(!once){once=true;enter();await gate}};
     const ongoing=f.execute();await entered;revoke(f.state,kind);release();
     const result=await ongoing;assert.equal(result.count,0);assert.equal(result.ok,false);
   }
   console.log('B5B_PAUSED_SQL_READ_REVOCATION_BLOCKED=GREEN');
 });
 test('B5B user revoked after ACL check before write reproducibly leaks one frame',async()=>{
   const r=await runScenario('user');assert.equal(r.frameAfterRevocation,1);
   console.log('B5B_USER_TOCTOU_BEFORE_WRITE=REPRODUCED_NOT_FIXED');
 });
 test('B5B camera revoked after binding check before write reproducibly leaks one frame',async()=>{
   await runScenario('camera');console.log('B5B_CAMERA_TOCTOU_BEFORE_WRITE=REPRODUCED_NOT_FIXED');
 });
 test('B5B tenant revoked after binding check before write reproducibly leaks one frame',async()=>{
   await runScenario('tenant');console.log('B5B_TENANT_TOCTOU_BEFORE_WRITE=REPRODUCED_NOT_FIXED');
 });
 test('B5B device revoked after SQL read before write delivers cached page of 100 frames',async()=>{
   const r=await runScenario('device');assert.equal(r.frameAfterRevocation,100);
   console.log('B5B_DEVICE_PAGE_CACHE_100_FRAMES=REPRODUCED_NOT_FIXED');
 });
 test('B5B after first frame revocation stops further frames',async()=>{
   const f=fixture({total:5});f.state.afterWrite=n=>{if(n===1)f.state.userActive=false};
   const r=await f.execute();assert.equal(r.count,1);assert.equal(r.ok,false);
   console.log('B5B_REVOKE_AFTER_FIRST_WRITE_NEXT_FRAME_BLOCKED=GREEN');
 });
 test('B5B concurrent isolated sessions do not bypass per-event checks except demonstrated final gap',async()=>{
   const count=8;const f=fixture({total:4});let didRevoke=false;
   f.state.beforeEncode=()=>{if(!didRevoke){didRevoke=true;f.state.userActive=false}};
   const rs=await Promise.all(Array.from({length:count},()=>f.execute()));
   assert.equal(didRevoke,true);assert.ok(rs.some(r=>r.count>0));
   assert.ok(rs.every(r=>r.count<=1),'no stream may emit a second frame after global revocation');
   console.log('B5B_EIGHT_CONCURRENT_SESSIONS_RACE_BOUNDED_NOT_FIXED=GREEN');
 });
 test('B5B actual separate child process restart reproduces race without shared in-memory state',()=>{
   const worker=fileURLToPath(new URL('./operationalSseRevocationRaceWorker.mjs',import.meta.url));
   for(const kind of ['user','device'])for(let i=0;i<2;i++){
      const child=spawnSync(process.execPath,[worker,kind],{encoding:'utf8',timeout:6000,
          env:{...process.env,SAFESCAN_B5B_DIAGNOSTIC_CHILD:'1'}});
      assert.equal(child.status,0,`worker failed:${child.stderr}`);
      const parsed=JSON.parse(child.stdout.trim());
      assert.equal(parsed.frameAfterRevocation,kind==='device'?100:1);assert.equal(parsed.indicator,'RACE_REPRODUCED_NOT_FIXED');
   }
   console.log('B5B_INDEPENDENT_PROCESS_RESTART_RACE_REPRODUCED=GREEN');
 });
}
