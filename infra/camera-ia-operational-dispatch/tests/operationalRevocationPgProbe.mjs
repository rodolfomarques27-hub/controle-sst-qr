// SafeScan B5-B3-B1: ephemeral fixture ONLY. It DOES NOT apply a revocation migration.
// --pg <container> uses local `docker exec`/psql only, never opens ports or network sockets.
import {spawn,spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const container=process.argv[3];
const args=()=>['exec','-i',container,'psql','-X','-A','-t','-v','ON_ERROR_STOP=1','-U','postgres','-d','postgres'];
function pg(sql,{expectFail=false}={}){
 const p=spawnSync('docker',args(sql),{input:sql,encoding:'utf8',timeout:15000,maxBuffer:500_000,windowsHide:true});
 if(p.error)throw p.error;
 if(expectFail){assert.notEqual(p.status,0,`Expected SQL denial: ${p.stdout}`);return p.stderr;}
 assert.equal(p.status,0,`SQL: ${p.stderr}`);return p.stdout.trim();
}
function asyncPg(sql,marker){
 let resolveMarker,rejectMarker;
 const markerSeen=new Promise((resolve,reject)=>{resolveMarker=resolve;rejectMarker=reject;});
 const finished=new Promise((resolve,reject)=>{
  const p=spawn('docker',args(sql),{stdio:['pipe','pipe','pipe'],windowsHide:true});
  let stdout='',stderr='';p.stdout.setEncoding('utf8');p.stderr.setEncoding('utf8');
  p.stdout.on('data',s=>{stdout+=s; if(marker && stdout.includes(marker))resolveMarker();});
  p.stderr.on('data',s=>stderr+=s);
  p.on('error',error=>{rejectMarker(error);reject(error)});
  p.on('close',code=>{if(code===0){if(!marker)resolveMarker();else if(!stdout.includes(marker))rejectMarker(new Error('Marker missing'));resolve({stdout,stderr})}
  else {const error=new Error(stderr);rejectMarker(error);reject(error);}});
  p.stdin.end(sql);
 });
 return {finished,markerSeen};
}
function selfTest(){
 assert.equal(/^[a-z0-9-]{4,64}$/.test('safe-diag-1'),true);
 assert.equal(/^[a-z0-9-]{4,64}$/.test('foo;rm -rf'),false);
 console.log('B3B1_PG_PROBE_SYNTAX=GREEN');
}
async function main(){
 assert.match(container,/^[a-z0-9-]{4,64}$/);
 pg(`CREATE SCHEMA b3diag;
CREATE ROLE b3diag_reader NOLOGIN;
CREATE TABLE b3diag.revocation_generation (scope_type text NOT NULL, scope_id text NOT NULL, generation bigint NOT NULL DEFAULT 0 CHECK (generation>=0), PRIMARY KEY(scope_type,scope_id));
INSERT INTO b3diag.revocation_generation(scope_type,scope_id)VALUES('tenant','A'),('tenant','B'),('device','D');
REVOKE ALL ON SCHEMA b3diag FROM PUBLIC;
REVOKE ALL ON TABLE b3diag.revocation_generation FROM PUBLIC;
CREATE FUNCTION b3diag.read_generation(p_type text,p_id text) RETURNS bigint LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog AS $$
SELECT generation FROM b3diag.revocation_generation WHERE scope_type=p_type AND scope_id=p_id $$;
REVOKE ALL ON FUNCTION b3diag.read_generation(text,text) FROM PUBLIC;
GRANT USAGE ON SCHEMA b3diag TO b3diag_reader;
GRANT EXECUTE ON FUNCTION b3diag.read_generation(text,text) TO b3diag_reader;`);
 assert.equal(pg(`BEGIN; UPDATE b3diag.revocation_generation SET generation=generation+1 WHERE scope_type='tenant' AND scope_id='A'; ROLLBACK; SELECT generation FROM b3diag.revocation_generation WHERE scope_type='tenant' AND scope_id='A';`).split(/\r?\n/).at(-1),'0');
 console.log('B3B1_PG_ROLLBACK_TRANSACTIONAL=GREEN');
 const roleDenied=pg('SET ROLE b3diag_reader; SELECT generation FROM b3diag.revocation_generation LIMIT 1;', {expectFail:true});
 assert.match(roleDenied,/permission denied/i);
 assert.equal(pg("SET ROLE b3diag_reader; SELECT b3diag.read_generation('tenant','A');").split(/\r?\n/).at(-1),'0');
 console.log('B3B1_PG_LEAST_PRIVILEGE_ROLE=GREEN');
 const a=asyncPg("SET application_name='b3diag_actor_a'; BEGIN; UPDATE b3diag.revocation_generation SET generation=generation+1 WHERE scope_type='tenant' AND scope_id='A'; SELECT pg_sleep(5); COMMIT; SELECT 'A_COMMITTED';");
 let lockHeld=false;
 for(let i=0;i<22;i++){
   const running=pg("SELECT count(*) FROM pg_stat_activity WHERE application_name='b3diag_actor_a' AND state='active' AND query LIKE 'SELECT pg_sleep(5)%';");
   if(running==='1'){lockHeld=true;break;}
   await new Promise(resolve=>setTimeout(resolve,120));
 }
 assert.equal(lockHeld,true,'A must hold the row lock before starting B');
 const started=Date.now();
 const b=asyncPg("BEGIN; UPDATE b3diag.revocation_generation SET generation=generation+1 WHERE scope_type='tenant' AND scope_id='A'; COMMIT; SELECT 'B_COMMITTED';");
 const [aResult,bResult]=await Promise.all([a.finished,b.finished]);
 assert.match(aResult.stdout,/A_COMMITTED/);assert.match(bResult.stdout,/B_COMMITTED/);
 assert.ok(Date.now()-started>400,'Second transaction must wait for row lock');
 assert.equal(pg("SELECT generation FROM b3diag.revocation_generation WHERE scope_type='tenant' AND scope_id='A';"),'2');
 assert.equal(pg("SELECT generation FROM b3diag.revocation_generation WHERE scope_type='tenant' AND scope_id='B';"),'0');
 console.log('B3B1_PG_COMMIT_ORDER_ROW_LOCK=GREEN');
 console.log('B3B1_PG_TENANT_SCOPE_ISOLATED=GREEN');
 const cacheA=pg("SELECT generation FROM b3diag.revocation_generation WHERE scope_type='device' AND scope_id='D';");
 pg("UPDATE b3diag.revocation_generation SET generation=generation+1 WHERE scope_type='device' AND scope_id='D';");
 const cacheB=pg("SELECT generation FROM b3diag.revocation_generation WHERE scope_type='device' AND scope_id='D';");
 assert.equal(cacheA,'0');assert.equal(cacheB,'1');
 console.log('B3B1_CROSS_PROCESS_STALE_SNAPSHOT=DEMONSTRATED');
 console.log('B3B1_PG_GENERATION_FIXTURE_ONLY=GREEN');
 console.log('B3B1_REAL_MUTATION_COVERAGE=NOT_PROVEN');
 console.log('B3B1_DISTRIBUTED_INVALIDATION=NOT_IMPLEMENTED');
}
if(process.argv[2]==='--self-test')selfTest();
else if(process.argv[2]==='--pg') main().catch(e=>{console.error('B3B1_SAFE_STOP='+String(e.message).slice(0,300));process.exitCode=1});
else {console.error('Usage --self-test | --pg container');process.exitCode=2;}
