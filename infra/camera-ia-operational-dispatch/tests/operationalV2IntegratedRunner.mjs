/** SafeScan Brasil | R10K-3C4F-C3F-B4-E | OFFLINE INTEGRATION TEST
 * Uses independent Node processes and an exclusively disposable Docker PostgreSQL
 * seeded by the verified PowerShell applicator. Never listens on TCP/HTTP.
 */
import assert from 'node:assert/strict';
import {spawn,execFileSync} from 'node:child_process';
import {resolveTrustedDockerCli} from './trustedDockerCli.mjs';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
const dir=dirname(fileURLToPath(import.meta.url));
const script=join(dir,'operationalV2IntegratedWorker.mjs');
const dockerCli=resolveTrustedDockerCli();
const container=process.env.SAFESCAN_B4E_CONTAINER;
assert.match(container??'',/^safescan-b4e-[a-f0-9]{12}$/);
function child(mode,token){
    return new Promise((resolve,reject)=>{
        const proc=spawn(process.execPath,[script,mode,...(token?[token]:[])],{
            stdio:['ignore','pipe','pipe'],windowsHide:true,env:process.env});
        let out='',err='';
        proc.stdout.on('data',b=>{out+=b;if(out.length>8000)proc.kill()});
        proc.stderr.on('data',b=>{err+=b;if(err.length>8000)proc.kill()});
        proc.once('error',reject);
        proc.once('close',code=>{
            if(code!==0)return reject(new Error(`child_${mode}_failed:${err.slice(-600)}`));
            try{resolve(JSON.parse(out.trim()))}catch{reject(new Error(`child_${mode}_invalid_json`))}
        });
    });
}
function pg(sql){
    return execFileSync(dockerCli,['exec','-i',container,'psql','-X','-q','-t','-A','-v','ON_ERROR_STOP=1','-U','postgres','-d','postgres'],
        {input:sql,encoding:'utf8',timeout:90000,maxBuffer:2*1024*1024,stdio:['pipe','pipe','pipe']}).trim();
}
function scalar(sql){const val=pg(sql).split(/\r?\n/).filter(Boolean);assert.equal(val.length,1);return val[0]}
const before=scalar(`select count(*)::text from private.camera_ia_operational_delivery_journal where stream_sequence is not null;`);
assert.equal(before,'124');
const outbox=scalar(`select count(*)::text from private.camera_ia_operational_outbox where state='pending';`);
assert.equal(outbox,'1');
console.log('B4E_REAL_PG_INITIAL_124_JOURNAL_1_PENDING=GREEN');
const jobs=await Promise.all([child('drain'),child('drain-alt')]);
assert.equal(jobs.reduce((n,v)=>n+v.acknowledged,0),1);
assert.equal(jobs.reduce((n,v)=>n+v.durable,0),1);
assert.equal(scalar(`select count(*)::text from private.camera_ia_operational_delivery_journal where stream_sequence is not null;`),'125');
assert.equal(scalar(`select count(*)::text from private.camera_ia_operational_outbox where state<>'dispatched';`),'0');
assert.equal(scalar(`select last_sequence::text from private.camera_ia_operational_stream_heads where camera_id='cam-A';`),'125');
console.log('B4E_TWO_REAL_NODE_PROCESSES_SINGLE_ATOMIC_HANDOFF_NO_DUPLICATE_ACK=GREEN');
const first=await child('replay-first');
assert.equal(first.ok,true);assert.equal(first.status,200);assert.equal(first.count,100);
assert.equal(first.lastSeq,'100');
console.log('B4E_POSTGRES_100_EVENT_SSE_HMAC_CURSOR=GREEN');
execFileSync(dockerCli,['restart',container],{encoding:'utf8',timeout:90000,stdio:['ignore','pipe','pipe']});
let ready=false;
for(let n=0;n<90;n++){
    try{execFileSync(dockerCli,['exec',container,'pg_isready','-U','postgres','-d','postgres'],{
        timeout:4000,stdio:'ignore'});ready=true;break;}catch{await new Promise(r=>setTimeout(r,250))}
}
assert.equal(ready,true);
assert.equal(scalar(`select count(*)::text from private.camera_ia_operational_delivery_journal where stream_sequence is not null;`),'125');
const next=await child('replay',first.last);
assert.equal(next.ok,true);assert.equal(next.status,200);assert.equal(next.count,25);
assert.equal(next.firstSeq,'101');assert.equal(next.lastSeq,'125');
console.log('B4E_DOCKER_RESTART_NODE_REPLAY_100_PLUS_25_NO_SKIP=GREEN');
let interrupted=false;
try{await child('crash-after-25')}catch(error){interrupted=/child_crash-after-25_failed/.test(String(error))}
assert.equal(interrupted,true,'worker must actually crash in another process');
assert.equal(scalar(`select count(*)::text from private.camera_ia_operational_delivery_journal where stream_sequence is not null;`),'125');
const recovered=await child('replay');
assert.equal(recovered.ok,true);assert.equal(recovered.count,125);assert.equal(recovered.lastSeq,'125');
console.log('B4E_NODE_PROCESS_CRASH_RESTART_NO_JOURNAL_LOSS=GREEN');
const revoked=await child('revoked');
assert.equal(revoked.ok,false);assert.equal(revoked.count,2);
const denied=await child('unauthorized');
assert.equal(denied.status,401);assert.equal(denied.count,0);
const foreign=await child('foreign-cursor');
assert.equal(foreign.status,400);assert.equal(foreign.count,0);
console.log('B4E_ACL_REVOKE_AND_FOREIGN_SCOPE_FAIL_CLOSED=GREEN');
// One missing committed sequence: the controller must stop, never claim success.
pg(`delete from private.camera_ia_operational_delivery_journal where stream_sequence=120 and camera_id='cam-A';`);
const gap=await child('replay-gap');
assert.equal(gap.ok,false);assert.equal(gap.count,100);assert.equal(gap.resync,true);
console.log('B4E_REAL_POSTGRES_GAP_SECOND_PAGE_EXPLICIT_RESYNC=GREEN');
// Real savepoint/rollback: an outbox row must remain unacknowledged.
pg(`SET ROLE cam_ia_operational_ingest_executor;
select private.camera_ia_claim_operational_event('device-A','cam-A',
'11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222',
'33333333-3333-4333-8333-333333333333','91919191-9191-4919-8919-919191919191',
'92929292-9292-4929-8929-929292929292','NO_FACE',floor(extract(epoch from clock_timestamp()))::bigint);
RESET ROLE;`);
pg(`SET ROLE cam_ia_operational_outbox_dispatcher;
CREATE TEMP TABLE b4e_lease AS SELECT * FROM private.camera_ia_lease_operational_outbox(
'93939393-9393-4939-8939-939393939393',1,120);
RESET ROLE;
BEGIN;
SET LOCAL ROLE cam_ia_operational_outbox_dispatcher;
select private.camera_ia_handoff_operational_journal_v2(
'93939393-9393-4939-8939-939393939393','device-A','91919191-9191-4919-8919-919191919191',
(select "leaseToken" from pg_temp.b4e_lease));
ROLLBACK;`);
// Temporary lease exists only within the same psql invocation above.
assert.equal(scalar(`select state from private.camera_ia_operational_outbox where event_id='91919191-9191-4919-8919-919191919191';`),'leased');
console.log('B4E_FULL_ROLLBACK_LEAVES_OUTBOX_UNACKNOWLEDGED=GREEN');
pg(`update private.camera_ia_operational_devices set status='revogado' where device_id='device-A';`);
const noLongerAccessible=await child('replay');
assert.equal(noLongerAccessible.count,0);
assert.notEqual(noLongerAccessible.status,200);
console.log('B4E_REAL_DEVICE_REVOCATION_REPLAY_DENIED=GREEN');
console.log('R10K_3C4F_C3FB4E_INTEGRATED_OFFLINE=GREEN');
