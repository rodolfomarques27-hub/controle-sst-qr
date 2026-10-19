// SafeScan Brasil | R10K-3C4F-C3F-B5-B3-B2-R1
// Offline read-only evidence index. Static analysis is NOT mutation-coverage proof.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

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
const KNOWN_GATES = Object.freeze([
  'usuario_ativo_sistema', 'usuario_tem_acesso_empresa', 'usuario_tem_acesso_tenant',
  'usuario_admin_global', 'camera_ia_autorizar_visualizacao',
]);
const EXTENSIONS = /\.(sql|js|jsx|mjs|cjs|ts|tsx)$/i;
const EXCLUDE_DIR = new Set(['.git', 'node_modules', 'dist', 'build', 'coverage', '.next', '.vercel', '.supabase', '.cache', 'vendor']);
const EXCLUDE_FILE = /(?:\.test\.|\.spec\.|\.min\.|\.snap$)/i;
const sourcePrefixes = ['supabase/migrations/', 'supabase/functions/', 'src/', 'infra/'];
const mutationRx = /\b(insert\s+into|update|delete\s+from|truncate(?:\s+table)?|merge\s+into)\s+(?:only\s+)?(?:(?:"?public"?|"?auth"?)\.)?"?([a-z_][a-z0-9_]*)"?/gi;
const funcRx = /\bcreate\s+(?:or\s+replace\s+)?function\s+((?:"?[a-z_][\w]*"?\.)?"?[a-z_][\w]*"?)\s*\(/gi;
const triggerRx = /\bcreate\s+(?:constraint\s+)?trigger\s+("?[a-z_]\w*"?)\s+([\s\S]{0,1300}?)\bon\s+(?:"?public"?\.)?"?([a-z_]\w*)"?\s+(?:for\s+each\s+(?:row|statement)\s+)?(?:when\s*\([\s\S]{0,500}?\)\s+)?execute\s+(?:function|procedure)\s+((?:"?public"?\.)?"?[a-z_]\w*"?)/gi;

function normalizeName(v) { return String(v ?? '').replaceAll('"', '').toLowerCase(); }
function locIndex(content) {
  const starts = [0];
  for (let i = 0; i < content.length; i++) if (content.charCodeAt(i) === 10) starts.push(i + 1);
  return (pos) => {
    let lo=0,hi=starts.length-1;
    while(lo<hi){const mid=(lo+hi+1)>>1;if(starts[mid]<=pos)lo=mid;else hi=mid-1;}
    return lo+1;
  };
}
function sqlWithoutComments(raw) {
  // Preserve exact offsets for evidence lines; this is not a complete SQL parser.
  return raw.replace(/--[^\r\n]*/g, x=>' '.repeat(x.length)).replace(/\/\*[\s\S]*?\*\//g, x=>x.replace(/[^\r\n]/g,' '));
}
function collect(root) {
  const result=[];
  function visit(dir, depth) {
    if(depth>14) return;
    for(const e of fs.readdirSync(dir,{withFileTypes:true})) {
      if(e.isSymbolicLink() || EXCLUDE_DIR.has(e.name))continue;
      const abs=path.join(dir,e.name);
      if(e.isDirectory()){visit(abs,depth+1);continue;}
      if(!e.isFile()||!EXTENSIONS.test(e.name)||EXCLUDE_FILE.test(e.name))continue;
      const rel=path.relative(root,abs).replaceAll('\\','/');
      if(!sourcePrefixes.some(x=>rel.startsWith(x)))continue;
      const stat=fs.statSync(abs);
      if(stat.size>2_000_000)continue;
      result.push({abs,rel});
      if(result.length>12000)throw new Error('SAFE_STOP: excessive source file count');
    }
  }
  visit(root,0);
  return result.sort((a,b)=>a.rel.localeCompare(b.rel));
}
function functionRanges(sql, lineOf, rel) {
  const list=[];
  for(const m of sql.matchAll(funcRx)){
    const prefix=sql.slice(m.index,m.index+2400);
    const opening=/\bas\s+(\$[a-z_0-9]*\$)/i.exec(prefix);
    let end=m.index+m[0].length;
    if(opening){
      const bodyStart=m.index+opening.index+opening[0].length;
      const offset=sql.indexOf(opening[1],bodyStart);
      if(offset!==-1)end=offset+opening[1].length;
    }
    list.push({start:m.index,end, name:normalizeName(m[1]), line:lineOf(m.index), file:rel});
  }
  return list;
}
function owningFunction(ranges,index){
  for(let i=ranges.length-1;i>=0;i--){if(ranges[i].start<=index&&index<ranges[i].end)return ranges[i].name;}
  return null;
}
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
  const refs=/\breferences\s+(?:(?:public|auth)\.)?"?([a-z_]\w*)"?\s*(?:\([^)]*\))?\s+on\s+delete\s+(cascade|set\s+null|set\s+default)/gi;
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
 const lines=[
 '# SafeScan Brasil — R10K-3C4F-C3F-B5-B3-B2-R1',
 '', '> Auditoria estática read-only; **não comprova cobertura exaustiva** de mutações nem autoriza migration.',
 '',`Arquivos examinados: **${report.filesScanned}** (SQL: ${report.sqlFiles}; JavaScript/TypeScript: ${report.jsFiles}).`,
 '', '| Domínio | Tabelas | Candidatos | SQL DML | DML Supabase | Triggers | Cobertura |', '|---|---|---:|---:|---:|---:|---|',
 ...Object.entries(report.domains).map(([domain,d])=>`| ${domain} | ${d.tables.map(t=>'\x60'+t+'\x60').join(', ')} | ${d.candidateCount} | ${d.sqlMutations} | ${d.javascriptMutations} | ${d.triggers} | ${d.coverage} |`),
 '', '## Evidências que ainda exigem revisão',
 `- RPCs referenciadas em JS/TS: **${report.evidence.rpcCalls.length}** (candidatas; não prova de mutação).`,
 `- Funções SQL declaradas detectadas: **${report.evidence.definitions.length}** (a definição efetiva depende da ordem das migrations).`,
 `- SQL dinâmico/referências dinâmicas: **${report.evidence.dynamic.length}** candidatas.`,
 `- Chamadas diretas às APIs Auth de escrita: **${report.evidence.externalWrites.length}** candidatas.`,
 `- Dependências FK com ação no DELETE: **${report.evidence.cascades.length}** candidatas.`,
 '', '## Funções de autorização ainda não localizadas na amostra',
 report.missingGates.length?report.missingGates.map(x=>'- `'+x+'`').join('\n'):'- Todas as cinco funções principais aparecem em alguma fonte analisada; isso **não** demonstra suas definições finais ou cobertura de mutações.',
 '', '## Exemplos por domínio (arquivo:linha)',
 ...Object.entries(report.domains).flatMap(([domain])=>[
   '### '+domain,
   ...report.rows.filter(r=>r.domain===domain && r.kind!=='SUPABASE_READ_OR_UNKNOWN').slice(0,18).map(r=>`- ${r.operation} ${r.kind} — \x60${r.file}:${r.line}\x60; contexto: \x60${r.owner||'fora de função identificada'}\x60`),
   '' ]),
 '## Critérios que permanecem abertos',...report.obligations.map(x=>'- '+x),
 '', '**B5B3B2_R1_COVERAGE=NOT_PROVEN**',
 '**MIGRATION_CREATED=FALSE**',
 '**DISTRIBUTED_INVALIDATION=NOT_IMPLEMENTED**',
 '', 'Os detalhes completos e as localizações estão nos arquivos CSV e JSON. Não executar migration nem inferir cobertura completa por contagem de ocorrências.',
 ];return lines.join('\n')+'\n';
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
