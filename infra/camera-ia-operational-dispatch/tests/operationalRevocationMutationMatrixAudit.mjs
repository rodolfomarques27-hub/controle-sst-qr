// SafeScan Brasil | R10K-3C4F-C3F-B5-B3-B2-R1
// Offline read-only evidence index. Static analysis is NOT mutation-coverage proof.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {
  KNOWN_GATES,
  normalizeName,
  locIndex,
  sqlWithoutComments,
  collect,
  functionRanges,
  owningFunction,
  renderAuditMarkdown,
} from './operationalRevocationMutationMatrixAuditShared.mjs';

export const DOMAIN_TABLES = Object.freeze({
  USER: ['usuarios_permissoes_sistema', 'auth.users'],
  MEMBERSHIP: ['tenant_memberships'],
  EMPRESA: ['empresas', 'auditoria_usuarios_autorizados'],
  TENANT: ['tenants'],
  CAMERA: ['camera_ia_cameras'],
  ACL: ['camera_ia_view_permissions'],
  DEVICE: ['camera_ia_operational_devices'],
});
const tableDomain = new Map(Object.entries(DOMAIN_TABLES).flatMap(([domain, tables]) => tables.map(t => [t, domain])));
const mutationRx = /\b(insert\s+into|update|delete\s+from|truncate(?:\s+table)?|merge\s+into)\s+(?:only\s+)?(?:(?:"?public"?|"?auth"?)\.)?"?([a-z_][a-z0-9_]*)"?/gi;
const triggerRx = /\bcreate\s+(?:constraint\s+)?trigger\s+("?[a-z_]\w*"?)\s+([\s\S]{0,1300}?)\bon\s+(?:"?public"?\.)?"?([a-z_]\w*)"?\s+(?:for\s+each\s+(?:row|statement)\s+)?(?:when\s*\([\s\S]{0,500}?\)\s+)?execute\s+(?:function|procedure)\s+((?:"?public"?\.)?"?[a-z_]\w*"?)/gi;

function row({table,kind,operation,rel,line,owner=null,confidence='STATIC_CANDIDATE',note=''}) {
  return {domain:tableDomain.get(table)||'EXTERNAL',table,kind,operation,file:rel,line,owner:owner??'',confidence,note};
}
function scanSql(raw,rel,add,evidence){
  const sql=sqlWithoutComments(raw), lineOf=locIndex(sql);
  const ranges=functionRanges(sql,lineOf,rel);
  for(const f of ranges){
    evidence.definitions.push({name:f.name,file:rel,line:f.line});
    const body=sql.slice(f.start,f.end);
    const targets=Object.keys(Object.fromEntries([...tableDomain.keys()].map(t=>[t,1]))).filter(t=>new RegExp(`\\b${t.replace('.','\\.')}\\b`,'i').test(body));
    if(/\bexecute\s+(?:format\s*\(|'|\$|\w+)/i.test(body)) {
      evidence.dynamic.push({file:rel,line:f.line,owner:f.name,tables:targets,reason:'POSSIBLE_DYNAMIC_SQL_REQUIRES_MANUAL_REVIEW'});
    }
    const calls=KNOWN_GATES.filter(name=>new RegExp('\\b'+name+'\\s*\\(','i').test(body));
    if(calls.length)evidence.gateDependencies.push({file:rel,line:f.line,owner:f.name,calls});
  }
  for(const m of sql.matchAll(mutationRx)){
    const name=normalizeName(m[2]);if(!tableDomain.has(name))continue;
    // Ignore SQL examples in single-line comments (already masked); classify DML candidates, not proof of execution.
    add(row({table:name,kind:'SQL_DML',operation:m[1].replace(/\s+/g,' ').toUpperCase(),rel,line:lineOf(m.index),owner:owningFunction(ranges,m.index),confidence:'LEXICAL_REVIEW_REQUIRED'}));
  }
  for(const m of sql.matchAll(triggerRx)){
    const table=normalizeName(m[3]);if(!tableDomain.has(table))continue;
    const trig={table,trigger:normalizeName(m[1]),function:normalizeName(m[4]),file:rel,line:lineOf(m.index),events:(m[2].match(/\b(?:insert|update|delete|truncate)\b/gi)||[]).map(v=>v.toUpperCase())};
    evidence.triggers.push(trig);
    add(row({table,kind:'SQL_TRIGGER',operation:trig.events.join('+')||'UNKNOWN',rel,line:trig.line,owner:trig.function,confidence:'TRIGGER_DECLARATION_ONLY'}));
  }
  // DDL, FK dependencies and cascading actions are included as review candidates, not inferred data changes.
  const ddl=/\balter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?(?:"?public"?\.)?"?([a-z_]\w*)"?/gi;
  for(const m of sql.matchAll(ddl)){const name=normalizeName(m[1]);if(tableDomain.has(name))add(row({table:name,kind:'SQL_DDL',operation:'ALTER TABLE',rel,line:lineOf(m.index),confidence:'SCHEMA_REVIEW_REQUIRED'}));}
  const refs=/\breferences\s+(?:(?:public|auth)\.)?"?([a-z_]\w*)"?(?:\([^()\r\n]*\)|[ \t\r\n]+\([^()\r\n]*\))?[ \t\r\n]+on[ \t\r\n]+delete[ \t\r\n]+(cascade|set[ \t\r\n]+null|set[ \t\r\n]+default)/gi;
  for(const m of sql.matchAll(refs)){const name=normalizeName(m[1]);if(tableDomain.has(name))evidence.cascades.push({referencedTable:name,action:m[2].toUpperCase(),file:rel,line:lineOf(m.index),confidence:'DEPENDENCY_REQUIRES_SCHEMA_CONTEXT'});}
  const grants=/\b(?:grant|revoke)\s+([\s\S]{0,260}?)\bon\s+(?:table|function)\s+(?:"?public"?\.)?"?([a-z_]\w*)"?/gi;
  for(const m of sql.matchAll(grants)){const name=normalizeName(m[2]);if(tableDomain.has(name))evidence.grants.push({table:name,file:rel,line:lineOf(m.index),action:sql.slice(m.index,m.index+6).trim().toUpperCase()});}
}
function scanJs(raw,rel,add,evidence){
 const lineOf=locIndex(raw);
 // Find named Supabase table access; direct driver SQL, external auth APIs and dynamic table names remain unresolved.
 const from=/\.from\s*\(\s*(['"`])([a-z_][a-z0-9_]*)\1\s*\)/gi;
 for(const m of raw.matchAll(from)){
  const name=normalizeName(m[2]);if(!tableDomain.has(name))continue;
  const after=raw.slice(m.index+m[0].length,m.index+m[0].length+600);
  const method=/\.\s*(insert|upsert|update|delete)\s*\(/i.exec(after);
  const chained= /\.from\s*\(/i.exec(after);
  const methodInChain=method && (!chained||method.index<chained.index);
  if(methodInChain)add(row({table:name,kind:'SUPABASE_DML',operation:method[1].toUpperCase(),rel,line:lineOf(m.index),confidence:'CHAIN_HEURISTIC_REVIEW_REQUIRED'}));
  else add(row({table:name,kind:'SUPABASE_READ_OR_UNKNOWN',operation:'FROM',rel,line:lineOf(m.index),confidence:'CALL_SITE_REVIEW_REQUIRED'}));
 }
 const rpc=/\.rpc\s*\(\s*(['"`])([a-z_][a-z0-9_]*)\1/gi;
 for(const m of raw.matchAll(rpc)){
   evidence.rpcCalls.push({name:m[2],file:rel,line:lineOf(m.index),confidence:'RPC_CALL_SITE_NOT_MUTATION_PROOF'});
 }
 const authWrites=/\bauth\s*\.\s*(?:admin\s*\.\s*)?(?:updateUser|updateUserById|deleteUser|createUser|signUp|inviteUserByEmail)\s*\(/gi;
 for(const m of raw.matchAll(authWrites))evidence.externalWrites.push({kind:'AUTH_API_WRITE',file:rel,line:lineOf(m.index),confidence:'OUTSIDE_SQL_TRIGGER_SCOPE'});
 const dynamic=/\.from\s*\(\s*(?!['"`])/gi;
 for(const m of raw.matchAll(dynamic))evidence.dynamic.push({file:rel,line:lineOf(m.index),owner:'',reason:'DYNAMIC_SUPABASE_TABLE_REFERENCE'});
}
function uniqueRows(a){const s=new Set();return a.filter(v=>{const key=[v.table,v.kind,v.operation,v.file,v.line,v.owner].join('|');if(s.has(key))return false;s.add(key);return true;});}
export function analyzeRepository(root){
 if(!fs.statSync(root).isDirectory())throw new Error('Repository not found');
 const files=collect(root);
 const evidence={definitions:[],triggers:[],cascades:[],grants:[],rpcCalls:[],externalWrites:[],dynamic:[],gateDependencies:[]};
 const rows=[];let sqlCount=0,jsCount=0;
 for(const {abs,rel} of files){const src=fs.readFileSync(abs,'utf8');if(rel.endsWith('.sql')){sqlCount++;scanSql(src,rel,x=>rows.push(x),evidence);}else{jsCount++;scanJs(src,rel,x=>rows.push(x),evidence);}}
 const matrix=uniqueRows(rows).sort((a,b)=>a.domain.localeCompare(b.domain)||a.table.localeCompare(b.table)||a.file.localeCompare(b.file)||a.line-b.line);
 const domains=Object.fromEntries(Object.entries(DOMAIN_TABLES).map(([domain,tables])=>[domain,{
  tables, candidateCount:matrix.filter(x=>x.domain===domain).length,
  sqlMutations:matrix.filter(x=>x.domain===domain&&x.kind==='SQL_DML').length,
  javascriptMutations:matrix.filter(x=>x.domain===domain&&x.kind==='SUPABASE_DML').length,
  triggers:matrix.filter(x=>x.domain===domain&&x.kind==='SQL_TRIGGER').length,
  coverage:'NOT_PROVEN' }]));
 const missingGates=KNOWN_GATES.filter(n=>!evidence.definitions.some(d=>d.name.split('.').at(-1)===n));
 const obligations=[
  'Resolve the effective post-migration definitions of all user/company/global-admin authorization gates',
  'Enumerate every old and current INSERT/UPDATE/DELETE/UPSERT, SECURITY DEFINER wrapper, direct SQL and dynamic SQL path',
  'Verify Auth email/JWT identity changes and global-admin privileges not solely represented by tenant membership',
  'Verify trigger execution, cascade behavior, and table privileges after the full migration chain',
  'Define an explicit write-edge-to-generation invariant for each user/tenant/company/camera/ACL/device entitlement change',
  'Prove rollback, concurrent commit ordering and reader safety under a real fully migrated disposable database',
  'Prove distributed emitter invalidation separately from monotonic persisted generation',
 ];
 return {project:'SafeScan Brasil',phase:'R10K-3C4F-C3F-B5-B3-B2-R1',mode:'STATIC_READ_ONLY',filesScanned:files.length,sqlFiles:sqlCount,jsFiles:jsCount,
   domains,rows:matrix,evidence,missingGates,obligations,
   mutationCoverage:'NOT_PROVEN',distributedInvalidation:'NOT_IMPLEMENTED',productionMigration:'NOT_CREATED',
   limitations:['Static lexical analysis; not a complete SQL/JavaScript parser','No live database catalog or actual privileges examined','Dynamic SQL, indirect RPC calls, auth identity changes, trigger execution and deployment state require further evidence','File and line candidates are not proof that the code path executes']};
}
function csvEscape(v){const s=String(v??'');return '"'+s.replaceAll('"','""')+'"';}
export function renderCsv(report){const keys=['domain','table','kind','operation','file','line','owner','confidence','note'];return [keys.join(','),...report.rows.map(r=>keys.map(k=>csvEscape(r[k])).join(','))].join('\n')+'\n';}
export function renderMarkdown(report){
 return renderAuditMarkdown(
   report,
   '# SafeScan Brasil — R10K-3C4F-C3F-B5-B3-B2-R1',
 );
}
function main(){const args=process.argv.slice(2);
 if(args[0]==='--scan' && args[1]) {
   const report=analyzeRepository(path.resolve(args[1]));
   if(args[2]==='--json')process.stdout.write(JSON.stringify(report,null,2)+'\n');
   else {process.stdout.write(renderMarkdown(report));}
 } else if(args[0]==='--self-check'){
   if(Object.keys(DOMAIN_TABLES).length!==7 || tableDomain.size!==9)throw new Error('Domain contract failed');
   console.log('B5B3B2_R1_STATIC_CONTRACT=GREEN');
 } else {console.error('Usage: node auditor.mjs --scan <repo> [--json] | --self-check');process.exitCode=2;}
}
if(process.argv[1] && path.resolve(process.argv[1])===path.resolve(fileURLToPath(import.meta.url)))main();
