import assert from 'node:assert/strict';
import test from 'node:test';
import {createOperationalV2RecoverableJournalReader,JOURNAL_V2_INSPECT_SQL,JOURNAL_V2_PAGE_SQL}
    from '../src/operationalV2RecoverableJournalReader.mjs';

const tenantId='11111111-1111-4111-8111-111111111111';
const empresaId='22222222-2222-4222-8222-222222222222';
const other='33333333-3333-4333-8333-333333333333';
const cam='cam-A';
const baseline='2026-10-14T15:00:00.000Z';
const scope = ()=>({tenantId,empresaId,cameraId:cam,authorized:true});
const row = (n,override={}) => ({deviceId:'device-A',eventId:`00000000-0000-4000-8000-${n.toString(16).padStart(12,'0')}`,
    cameraId:cam,tenantId,empresaId,status:n%2 ? 'NO_FACE':'MULTIPLE_FACES',
    accepted:false,streamSequence:String(n),recordedAt:baseline,...override});

function fixture({count=125,legacy=0,gap=null}={}) {
    let acl=scope(), head=count,reads=0,queries=0,roleActive=true;
    let onQuery = null, onAcl = null;
    const records=Array.from({length:count},(_,i)=>row(i+1));
    const sqlLog=[];
    async function getAuthorizedScope(){
        reads++;
        if(onAcl) await onAcl(reads);
        return acl;
    }
    async function query(sql,args) {
        queries++;
        assert.ok(Object.isFrozen(args),'queries must bind frozen parameters');
        sqlLog.push({sql,args:[...args]});
        if(onQuery) await onQuery(sql,queries);
        if(!roleActive) throw new Error('mock_role_denied');
        if(sql===JOURNAL_V2_INSPECT_SQL) {
            assert.equal(args.length,4);
            assert.equal(args[0],tenantId);assert.equal(args[1],empresaId);assert.equal(args[2],cam);
            const after=BigInt(args[3]);
            return {rows:[{lastSequence:String(head),earliestAvailableSequence:head>0?'1':null,
                legacyUnorderedCount:String(legacy),resyncRequired:after>BigInt(head) ||
                    (gap!==null && after<BigInt(head) && BigInt(gap)===after+1n)}]};
        }
        if(sql===JOURNAL_V2_PAGE_SQL) {
            assert.equal(args.length,6);
            assert.equal(args[0],tenantId);assert.equal(args[1],empresaId);assert.equal(args[2],cam);
            const [after,limit,ack]=[BigInt(args[3]),args[4],args[5]];
            assert.ok(Number.isInteger(limit) && limit>=1 && limit<=100);
            if(legacy && !ack) throw new Error('mock_missing_cutover');
            return {rows:records.filter(r => BigInt(r.streamSequence)>after && BigInt(r.streamSequence)<=after+BigInt(limit) &&
                (gap===null || Number(r.streamSequence)!==gap)).map(r=>({...r}))};
        }
        throw new Error('unexpected_query');
    }
    const reader=()=>createOperationalV2RecoverableJournalReader({query,getAuthorizedScope});
    return {reader,sqlLog,records,
        setACL:value=>{acl=value},setHead:value=>{head=value},setLegacy:value=>{legacy=value},
        setGap:value=>{gap=value},setRole:value=>{roleActive=value},
        onQuery:fn=>{onQuery=fn},onAcl:fn=>{onAcl=fn},
        get reads(){return reads},get queries(){return queries}};
}

test('B4C V2 reader: 125 events in two pages, ordered and scoped',async()=>{
    const f=fixture();const r=f.reader();
    assert.match(JOURNAL_V2_INSPECT_SQL,/camera_ia_inspect_operational_journal_cursor_v2/);
    assert.match(JOURNAL_V2_PAGE_SQL,/camera_ia_read_operational_journal_page_v2/);
    assert.doesNotMatch(JOURNAL_V2_PAGE_SQL,/camera_ia_read_operational_journal\(/);
    const p1=await r.readPage();
    assert.equal(p1.events.length,100);assert.equal(p1.nextSequence,'100');assert.equal(p1.headSequence,'125');
    assert.equal(p1.hasMore,true);assert.equal(p1.events[0].streamSequence,'1');
    const p2=await r.readPage({afterSequence:p1.nextSequence});
    assert.equal(p2.events.length,25);assert.equal(p2.nextSequence,'125');assert.equal(p2.hasMore,false);
    const p3=await r.readPage({afterSequence:'125'});
    assert.equal(p3.events.length,0);assert.equal(p3.nextSequence,'125');
    assert.equal(f.sqlLog.filter(c=>c.sql===JOURNAL_V2_PAGE_SQL).length,2);
    assert.equal(f.sqlLog.filter(c=>c.sql===JOURNAL_V2_INSPECT_SQL).length,3);
    assert.ok(f.reads>=10);
    assert.equal(JSON.stringify(p1).includes('embedding'),false);
    console.log('B4C_125_EVENTS_PAGINATED_NO_SKIP=GREEN');
});

test('B4C V2 reader: explicit legacy cutover and gaps fail closed',async()=>{
    const f=fixture({count:3,legacy:2});const r=f.reader();
    await assert.rejects(r.readPage(),/legacy_journal_cutover_explicit_ack_required/);
    assert.equal(f.sqlLog.some(c=>c.sql===JOURNAL_V2_PAGE_SQL),false);
    const first=await r.readPage({acknowledgeLegacy:true});
    assert.equal(first.events.length,3);assert.equal(first.legacyCutoverAcknowledged,true);
    assert.equal(first.legacyUnorderedCount,'2');
    f.setLegacy(0);f.setGap(2);
    await assert.rejects(r.readPage({afterSequence:'1'}),/journal_missing_or_extra_sequence|journal_resync_required/);
    await assert.rejects(r.readPage({afterSequence:'0'}),/journal_missing_or_extra_sequence/);
    f.setGap(null);f.setHead(4);
    await assert.rejects(r.readPage({afterSequence:'3'}),/journal_missing_or_extra_sequence/);
    console.log('B4C_LEGACY_AND_GAP_EXPLICIT_RESYNC=GREEN');
});

test('B4C V2 reader: malformed cursor, scope and data fail closed',async()=>{
    const f=fixture({count:1});const r=f.reader();
    for(const afterSequence of [-1,1,1n,'01','-1','NaN','1; DROP TABLE',
        '9223372036854775808',{},null]) {
        await assert.rejects(r.readPage({afterSequence}));
    }
    for(const limit of [0,101,1.1,'1',-3]) await assert.rejects(r.readPage({limit}));
    await assert.rejects(r.readPage({acknowledgeLegacy:1}));
    f.records[0].embedding='fake-secret';
    await assert.rejects(r.readPage(),/untrusted_or_cross_scope_journal_event/);
    delete f.records[0].embedding;
    f.records[0].tenantId=other;
    await assert.rejects(r.readPage(),/untrusted_or_cross_scope_journal_event/);
    f.records[0].tenantId=tenantId;
    f.records[0].status='AUTHORIZED';
    await assert.rejects(r.readPage(),/untrusted_or_cross_scope_journal_event/);
    f.records[0].status='NO_FACE';
    f.records[0].accepted=true;
    await assert.rejects(r.readPage(),/untrusted_or_cross_scope_journal_event/);
    f.records[0].accepted=false;
    f.records[0].recordedAt='invalid';
    await assert.rejects(r.readPage(),/journal_sequence_gap_or_invalid_timestamp/);
    console.log('B4C_SCOPE_BIOMETRICS_CURSOR_FAIL_CLOSED=GREEN');
});

test('B4C V2 reader: authorization must survive each SQL step',async()=>{
    const f=fixture({count:2});const r=f.reader();
    f.setACL({...scope(),authorized:false});
    await assert.rejects(r.readPage(),/unauthorized_journal_scope/);
    assert.equal(f.queries,0);
    f.setACL(scope());
    f.onQuery(async(sql)=>{if(sql===JOURNAL_V2_INSPECT_SQL)f.setACL({...scope(),authorized:false})});
    await assert.rejects(r.readPage(),/unauthorized_journal_scope/);
    assert.equal(f.sqlLog.some(c=>c.sql===JOURNAL_V2_PAGE_SQL),false);
    f.setACL(scope());
    f.onQuery(async(sql)=>{if(sql===JOURNAL_V2_PAGE_SQL)f.setACL({...scope(),authorized:false})});
    await assert.rejects(r.readPage(),/unauthorized_journal_scope/);
    f.setACL(scope());f.onQuery(null);
    f.onAcl(async n=>{if(n===f.reads+99)throw new Error('impossible')});
    assert.equal((await r.readPage({limit:1})).events.length,1);
    console.log('B4C_ACL_REVALIDATION_BEFORE_AFTER_SQL=GREEN');
});

test('B4C V2 reader: change of authorized scope mid-operation is denied',async()=>{
    const f=fixture({count:1}),r=f.reader();
    f.onQuery(async(sql)=>{if(sql===JOURNAL_V2_INSPECT_SQL)f.setACL({authorized:true,tenantId:other,empresaId,cameraId:cam})});
    await assert.rejects(r.readPage(),/journal_scope_changed_or_revoked/);
    assert.equal(f.sqlLog.some(c=>c.sql===JOURNAL_V2_PAGE_SQL),false);
    console.log('B4C_TENANT_COMPANY_CAMERA_SCOPE_PIN=GREEN');
});

test('B4C V2 reader: missing, malformed, unavailable inspect and SQL failures denied',async()=>{
    for(const kind of ['none','error','wrong','malformed']) {
        const f=fixture({count:2});f.onQuery(async()=>undefined);
        const query=async(sql)=>{
            if(sql===JOURNAL_V2_INSPECT_SQL){
                return {rows:kind==='none'?[]:kind==='error'?[{error:'oops'}]:kind==='wrong'?[{lastSequence:'2'}]:
                    [{lastSequence:2,earliestAvailableSequence:1,legacyUnorderedCount:0,resyncRequired:false}]};
            }
            throw new Error('must_not_read');
        };
        const r=createOperationalV2RecoverableJournalReader({query,getAuthorizedScope:async()=>scope()});
        await assert.rejects(r.readPage());
    }
    const f=fixture({count:2}); f.setRole(false);
    await assert.rejects(f.reader().readPage(),/mock_role_denied/);
    console.log('B4C_SQL_PROVIDER_FAILURES_FAIL_CLOSED=GREEN');
});

test('B4C V2 reader: concurrent reads on same instance fail closed',async()=>{
    const f=fixture({count:2});
    let release,started;
    const startedPromise=new Promise(resolve=>started=resolve);
    const barrier=new Promise(resolve=>release=resolve);
    let once=false;
    f.onQuery(async(sql)=>{if(!once && sql===JOURNAL_V2_INSPECT_SQL){once=true;started();await barrier}});
    const r=f.reader();const pending=r.readPage();await startedPromise;
    await assert.rejects(r.readPage(),/concurrent_journal_read_denied/);
    release(); assert.equal((await pending).events.length,2);
    console.log('B4C_SINGLE_INSTANCE_NON_OVERLAP=GREEN');
});

test('B4C V2 reader: cloned safe page cannot be modified by caller',async()=>{
    const f=fixture({count:1});const result=await f.reader().readPage();
    assert.ok(Object.isFrozen(result) && Object.isFrozen(result.events) && Object.isFrozen(result.events[0]));
    assert.throws(()=>{result.events[0].status='MULTIPLE_FACES'},TypeError);
    assert.throws(()=>{result.events.push(row(2))},TypeError);
    assert.equal(result.events[0].status,'NO_FACE');
    console.log('B4C_READ_ONLY_MINIMAL_EVENTS=GREEN');
});
