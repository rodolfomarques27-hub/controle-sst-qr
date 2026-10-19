/** SafeScan Brasil | R10K-3C4F-C3F-B5-B2 | OFFLINE security tests
 * Reproduce known races with a trusted monotonic fake fence. No SQL, remote
 * services, cameras, secrets or HTTP listener. GREEN means the FENCED entry
 * point blocks known revocations; it does not prove distributed atomicity.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {EventEmitter} from 'node:events';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createOperationalV2FencedSseController} from '../src/operationalV2RecoverableSseController.mjs';
import {createOperationalScopedSseCursor} from '../src/operationalScopedSseCursor.mjs';
import {JOURNAL_V2_INSPECT_SQL,JOURNAL_V2_PAGE_SQL} from '../src/operationalV2RecoverableJournalReader.mjs';
import {createSupabaseCameraViewAuthorizationAdapter} from '../../vision-gateway/src/http/supabaseCameraViewAuthorizationAdapter.mjs';
const USER='11111111-1111-4111-8111-111111111111';
const TENANT='22222222-2222-4222-8222-222222222222';
const COMPANY='33333333-3333-4333-8333-333333333333';
const CAMERA='cam-A',DEVICE='device-A';
const JWT='offline.test.jwt.revocation.fence.only';
function row(n){return {deviceId:DEVICE,eventId:`00000000-0000-4000-8000-${n.toString(16).padStart(12,'0')}`,
  tenantId:TENANT,empresaId:COMPANY,cameraId:CAMERA,status:n%2?'NO_FACE':'MULTIPLE_FACES',accepted:false,
  streamSequence:String(n),recordedAt:'2026-10-14T18:00:00.000Z'};}
function response(){const r=new EventEmitter();return Object.assign(r,{headersSent:false,writableEnded:false,destroyed:false,
  status:0,chunks:[],writeHead(code){this.headersSent=true;this.status=code},
  write(chunk){if(this.writableEnded)throw Error('write_after_close');this.chunks.push(chunk);this.onWrite?.(chunk);return true},
  end(chunk){if(chunk)this.chunks.push(chunk);this.writableEnded=true;this.emit('close')}});}
function countFrames(r){return [...r.chunks.join('').matchAll(/id: ([^\n]+)\ndata: ([^\n]+)\n\n/g)].length;}
function req(){const r=new EventEmitter();return Object.assign(r,{method:'GET',url:'/internal-only-sse',aborted:false,
    headers:{authorization:`Bearer ${JWT}`}});}
function fixture({total=3,pageSize=2,maxPages=2,key=randomBytes(32)}={}){
 const s={userActive:true,cameraActive:true,tenantActive:true,deviceActive:true,version:0,
   beforeEncode:null,afterWrite:null,duringAcquire:null,checkCount:0,acquireCount:0,sqlCount:0};
 const active=()=>s.userActive&&s.cameraActive&&s.tenantActive&&s.deviceActive;
 const revoke=kind=>{const attr=kind+'Active';assert.equal(typeof s[attr],'boolean');s[attr]=false;s.version++;};
 const auth=createSupabaseCameraViewAuthorizationAdapter({supabaseUrl:'https://offline-guard.invalid/',
    anonKey:'offline-not-a-secret',timeoutMs:1500,fetchImpl:async(url,options)=>{
      assert.equal(options.redirect,'error');assert.equal(options.headers.authorization,`Bearer ${JWT}`);
      if(new URL(url).pathname==='/auth/v1/user')return new Response(JSON.stringify({id:USER}),
        {status:s.userActive?200:401,headers:{'content-type':'application/json'}});
      assert.equal(new URL(url).pathname,'/rest/v1/rpc/camera_ia_autorizar_visualizacao');
      return new Response(JSON.stringify(s.userActive&&s.cameraActive&&s.tenantActive?
        [{camera_id:CAMERA,tenant_id:TENANT,empresa_id:COMPANY}]:[]),
        {status:200,headers:{'content-type':'application/json'}});
    }});
 const query=async(sql,args)=>{
   s.sqlCount++;
   if(!s.deviceActive)throw Error('device_revoked');
   assert.deepEqual(args.slice(0,3),[TENANT,COMPANY,CAMERA]);
   const after=Number(args[3]);
   if(sql===JOURNAL_V2_INSPECT_SQL)return {rows:[{lastSequence:String(total),earliestAvailableSequence:total?'1':null,
     legacyUnorderedCount:'0',resyncRequired:after>total}]};
   if(sql===JOURNAL_V2_PAGE_SQL)return {rows:Array.from({length:total},(_,i)=>row(i+1))
     .filter(e=>Number(e.streamSequence)>after&&Number(e.streamSequence)<=after+args[4])};
   throw Error('unexpected_sql');
 };
 const realCodec=createOperationalScopedSseCursor({key});
 const codec={encode(scope,seq){s.beforeEncode?.();return realCodec.encode(scope,seq)},
   decode(...args){return realCodec.decode(...args)}};
 const fence={
   async acquire({scope,event}){
     s.acquireCount++;
     if(!active())throw Error('fence_scope_revoked');
     const proof=Object.freeze({authorized:true,version:String(s.version),userId:scope.userId,
       tenantId:scope.tenantId,empresaId:scope.empresaId,cameraId:scope.cameraId,
       deviceId:event.deviceId,eventId:event.eventId});
     await s.duringAcquire?.();
     return proof;
   },
   isCurrent({proof,scope,event}){
     s.checkCount++;
     return active()&&proof.authorized===true&&proof.version===String(s.version)&&
       proof.userId===scope.userId&&proof.tenantId===scope.tenantId&&
       proof.empresaId===scope.empresaId&&proof.cameraId===scope.cameraId&&
       proof.deviceId===event.deviceId&&proof.eventId===event.eventId;
   }
 };
 const opts={authorizationAdapter:auth,getCameraBinding:async()=>{
    if(!s.cameraActive||!s.tenantActive)throw Error('binding_revoked');
    return {tenantId:TENANT,empresaId:COMPANY,cameraId:CAMERA}},
   queryJournal:query,cursorCodec:codec,revocationFence:fence,pageSize,maxPages};
 const run=async(overrides={})=>{const r=response();r.onWrite=chunk=>{
    if(chunk.startsWith('id:'))s.afterWrite?.();};
   const ok=await createOperationalV2FencedSseController({...opts,...overrides}).handle(req(),r,{cameraId:CAMERA});
   return {ok,frames:countFrames(r),res:r};};
 return {s,run,revoke,fence,opts};
}
async function attempt(kind){const f=fixture({total:kind==='device'?101:3,pageSize:100,maxPages:2});
  let revoked=false;f.s.beforeEncode=()=>{if(!revoked){revoked=true;f.revoke(kind)}};
  const r=await f.run();assert.equal(revoked,true);assert.equal(r.frames,0);
  assert.equal(r.ok,false);assert.equal(r.res.writableEnded,true);
  assert.ok(f.s.checkCount>=1);return {kind,framesAfterRevocation:r.frames};}
export async function childScenario(kind){return attempt(kind);}
if(process.env.SAFESCAN_B5B2_CHILD!=='1'){
 test('B5B2 strict factory rejects absent/invalid synchronous fencing',async()=>{
   const f=fixture();
   assert.throws(()=>createOperationalV2FencedSseController({...f.opts,revocationFence:null}),
     /trusted_sse_acl_reader_cursor_dependencies_required/);
   for(const bad of [false,undefined,Promise.resolve(true)]){
     const r=await f.run({revocationFence:{acquire:f.fence.acquire,isCurrent:()=>bad}});
     assert.equal(r.frames,0);assert.equal(r.ok,false);
   }
   console.log('B5B2_FENCED_FACTORY_DEFAULT_DENY=GREEN');
 });
 test('B5B2 all four revocations at cursor encode block first frame',async()=>{
   for(const kind of ['user','camera','tenant','device'])await attempt(kind);
   console.log('B5B2_USER_CAMERA_TENANT_DEVICE_PREWRITE_ZERO_FRAMES=GREEN');
 });
 test('B5B2 device page cache 100 frames blocked before any data frame',async()=>{
   const r=await attempt('device');assert.equal(r.framesAfterRevocation,0);
   console.log('B5B2_CACHED_PAGE_100_DEVICE_REVOKED_ZERO_FRAMES=GREEN');
 });
 test('B5B2 revocation during async acquire denies emission',async()=>{
   for(const kind of ['user','camera','tenant','device']){
     const f=fixture();let once=false;f.s.duringAcquire=async()=>{
       if(!once){once=true;f.revoke(kind)}};
     const r=await f.run();assert.equal(r.frames,0);assert.equal(r.ok,false);
   }
   console.log('B5B2_REVOKED_DURING_FENCE_ACQUIRE_DENIED=GREEN');
 });
 test('B5B2 revocation after first write denies all subsequent frames',async()=>{
   for(const kind of ['user','camera','tenant','device']){
     const f=fixture({total:125,pageSize:100,maxPages:2});let once=false;
     f.s.afterWrite=()=>{if(!once){once=true;f.revoke(kind)}};
     const r=await f.run();assert.equal(r.frames,1);assert.equal(r.ok,false);
   }
   console.log('B5B2_REVOKE_AFTER_FIRST_WRITE_NO_FURTHER_EVENTS=GREEN');
 });
 test('B5B2 secure replay 125 events paginated when all remain authorized',async()=>{
   const f=fixture({total:125,pageSize:100,maxPages:2});const r=await f.run();
   assert.equal(r.ok,true);assert.equal(r.frames,125);assert.equal(f.s.checkCount,125);
   assert.equal(f.s.acquireCount,125);
   console.log('B5B2_HEALTHY_125_EVENT_PAGINATION=GREEN');
 });
 test('B5B2 16 concurrent streams observe shared revocation without later frames',async()=>{
   const f=fixture({total:4,pageSize:2,maxPages:2});let once=false;
   f.s.beforeEncode=()=>{if(!once){once=true;f.revoke('user')}};
   const result=await Promise.all(Array.from({length:16},()=>f.run()));
   assert.equal(once,true);assert.ok(result.every(r=>r.frames===0&&r.ok===false));
   console.log('B5B2_16_CONCURRENT_NO_EMIT_AFTER_KNOWN_REVOKE=GREEN');
 });
 test('B5B2 fail closed on bogus proof scope/device and thrown provider',async()=>{
   const f=fixture({total:3});
   for(const forged of [
     {authorized:true,version:'0',userId:USER,tenantId:TENANT,empresaId:COMPANY,cameraId:CAMERA,deviceId:'other',eventId:row(1).eventId},
     {authorized:true,version:'0',userId:USER,tenantId:TENANT,empresaId:COMPANY,cameraId:CAMERA,deviceId:DEVICE,eventId:row(2).eventId},
     {authorized:true,version:'0',userId:USER,tenantId:TENANT,empresaId:COMPANY,cameraId:CAMERA,deviceId:DEVICE,eventId:row(1).eventId,extra:'ignored'}
   ].slice(0,2)){
     const r=await f.run({revocationFence:{acquire:async()=>forged,isCurrent:()=>true}});
     assert.equal(r.frames,0);assert.equal(r.ok,false);
   }
   const thrown=await f.run({revocationFence:{acquire:async()=>{throw Error('offline_fence_unavailable')},isCurrent:()=>true}});
   assert.equal(thrown.frames,0);assert.equal(thrown.ok,false);
   console.log('B5B2_UNTRUSTED_PROOF_OR_UNAVAILABLE_FENCE_DENIED=GREEN');
 });
 test('B5B2 child processes freshly instantiate secure controller and block revocation',()=>{
   const worker=fileURLToPath(new URL('./operationalSseRevocationFenceWorker.mjs',import.meta.url));
   for(const kind of ['user','device'])for(let i=0;i<2;i++){
     const result=spawnSync(process.execPath,[worker,kind],{encoding:'utf8',timeout:7000,
       env:{...process.env,SAFESCAN_B5B2_CHILD:'1'}});
     assert.equal(result.status,0,result.stderr);
     assert.equal(JSON.parse(result.stdout.trim()).framesAfterRevocation,0);
   }
   console.log('B5B2_INDEPENDENT_PROCESS_RESTART_KNOWN_REVOKE_DENIED=GREEN');
 });
 test('B5B2 HTTP write cannot be made atomic with a database revocation',async()=>{
   const f=fixture({total:3});let once=false;
   f.s.afterWrite=()=>{if(!once){once=true;f.revoke('user')}};
   const r=await f.run();assert.equal(once,true);assert.equal(r.frames,1);
   assert.equal(r.ok,false);
   console.log('B5B2_HTTP_BOUNDARY_NONATOMIC_LIMIT_DOCUMENTED=GREEN');
 });
}
