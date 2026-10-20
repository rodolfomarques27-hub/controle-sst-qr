// SafeScan Brasil | R10K-3C4F-C3F-B5-B3-B2-R2-C1
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
const QUALIFIED = String.raw`((?:("?(?:public|private|auth)"?)\s*\.\s*)?("?[a-z_][a-z0-9_]*"?))`;
const mutationRx = new RegExp(String.raw`\b(insert\s+into|update|delete\s+from|truncate(?:\s+table)?|merge\s+into)\s+(?:only\s+)?`+QUALIFIED,'gi');
const funcRx = /\bcreate\s+(?:or\s+replace\s+)?function\s+((?:"?[a-z_][\w]*"?\.)?"?[a-z_][\w]*"?)\s*\(/gi;
const triggerRx = new RegExp(String.raw`\bcreate\s+(?:constraint\s+)?trigger\s+("?[a-z_]\w*"?)\s+([\s\S]{0,1300}?)\bon\s+`+QUALIFIED+String.raw`\s+(?:for\s+each\s+(?:row|statement)\s+)?(?:when\s*\([\s\S]{0,500}?\)\s+)?execute\s+(?:function|procedure)\s+((?:(?:"?(?:public|private|auth)"?)\s*\.\s*)?"?[a-z_]\w*"?)`,'gi');

function normalizeName(v) { return String(v ?? '').replaceAll('"', '').toLowerCase(); }
function resolvedTable(rawSchema,rawName) {
  const name=normalizeName(rawName), schema=normalizeName(rawSchema||((name==='users')?'auth':'public'));
  const canonical=(name==='users' && schema==='auth')?'auth.users':name;
  if(!tableDomain.has(canonical)) return null;
  // auth.users is distinct from public.users; device registry must be private-qualified if qualified.
  if(name==='users' && schema!=='auth')return null;
  if(!['public','private','auth'].includes(schema))return null;
  return {table:canonical,schema};
}
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
function row({table,schema='public',kind,operation,rel,line,owner=null,confidence='STATIC_CANDIDATE',note=''}) {
  return {domain:tableDomain.get(table)||'EXTERNAL',table,schema,kind,operation,file:rel,line,owner:owner??'',confidence,note};
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
    const target=resolvedTable(m[3],m[4]); if(!target)continue;
    const op=m[1].replace(/\s+/g,' ').toUpperCase();
    const details={...target,rel,line:lineOf(m.index),owner:owningFunction(ranges,m.index)};
    add(row({...details,kind:'SQL_DML',operation:op,confidence:'LEXICAL_REVIEW_REQUIRED'}));
    if(op==='INSERT INTO') {
      const semi=sql.indexOf(';',m.index);
      const segment=sql.slice(m.index,semi===-1?Math.min(sql.length,m.index+8000):semi);
      if(/\bon\s+conflict\b[\s\S]*?\bdo\s+update\b/i.test(segment)){
        add(row({...details,kind:'SQL_UPSERT_UPDATE',operation:'ON CONFLICT DO UPDATE',confidence:'CONFLICT_BRANCH_REVIEW_REQUIRED'}));
      }
    }
  }
  for(const m of sql.matchAll(triggerRx)){
    const target=resolvedTable(m[4],m[5]);if(!target)continue;
    const trig={...target,trigger:normalizeName(m[1]),function:normalizeName(m[6]),file:rel,line:lineOf(m.index),events:(m[2].match(/\b(?:insert|update|delete|truncate)\b/gi)||[]).map(v=>v.toUpperCase())};
    evidence.triggers.push(trig);
    add(row({...target,kind:'SQL_TRIGGER',operation:trig.events.join('+')||'UNKNOWN',rel,line:trig.line,owner:trig.function,confidence:'TRIGGER_DECLARATION_ONLY'}));
  }
  const ddl=new RegExp(String.raw`\b(alter\s+table|create\s+table)\s+(?:if\s+(?:not\s+)?exists\s+)?(?:only\s+)?`+QUALIFIED,'gi');
  for(const m of sql.matchAll(ddl)){
    const target=resolvedTable(m[3],m[4]);if(!target)continue;
    add(row({...target,kind:'SQL_DDL',operation:m[1].replace(/\s+/g,' ').toUpperCase(),rel,line:lineOf(m.index),confidence:'SCHEMA_REVIEW_REQUIRED'}));
  }
  const refs=new RegExp(String.raw`\breferences\s+`+QUALIFIED+String.raw`\s*(?:\([^)]*\))?\s+on\s+delete\s+(cascade|set\s+null|set\s+default)`,'gi');
  for(const m of sql.matchAll(refs)){
    const target=resolvedTable(m[2],m[3]);if(!target)continue;
    evidence.cascades.push({referencedTable:target.table,schema:target.schema,action:m[4].toUpperCase(),file:rel,line:lineOf(m.index),confidence:'DEPENDENCY_REQUIRES_SCHEMA_CONTEXT'});
  }
  // Parse comma-separated GRANT/REVOKE ON TABLE targets; this remains syntactic evidence, not effective privileges.
  const grantRx=/\b(grant|revoke)\b[\s\S]{0,600}?\bon\s+(?:table\s+)?([\s\S]{1,750}?)\s+(?:to|from)\s+[\w" ,]+(?:;|$)/gi;
  const tableListRx=new RegExp(String.raw`^\s*`+QUALIFIED+String.raw`(?:\s*,\s*`+QUALIFIED+String.raw`)*\s*$`,'i');
  const oneTargetRx=new RegExp(String.raw`^\s*`+QUALIFIED+String.raw`\s*$`,'i');
  for(const m of sql.matchAll(grantRx)){
    const targets=m[2].trim();if(!tableListRx.test(targets))continue;
    for(const targetText of targets.split(',')) {
      const mm=oneTargetRx.exec(targetText); if(!mm)continue;
      const target=resolvedTable(mm[2],mm[3]); if(!target)continue;
      evidence.grants.push({...target,file:rel,line:lineOf(m.index),action:m[1].toUpperCase(),confidence:'DECLARATION_NOT_EFFECTIVE_PRIVILEGE'});
    }
  }
}
function scanJs(raw,rel,add,evidence){
 const lineOf=locIndex(raw);
 // Strict receiver filter: Buffer.from(), Array.from(), etc. must not become Supabase evidence.
 // Aliases and computed API references remain an explicit manual-review limitation.
 const from=/\.from\s*\(\s*(?:(['"`])([a-z_][a-z0-9_]*)\1\s*\))?/gi;
 for(const m of raw.matchAll(from)){
  const prefix=raw.slice(Math.max(0,m.index-160),m.index);
  const receiver=/(?:\b(?:supabase\w*|client|db|database))\s*(?:\.\s*schema\s*\(\s*(['"`])(public|private|auth)\1\s*\))?\s*$/i.exec(prefix);
  if(!receiver)continue;
  const schema=normalizeName(receiver[2]||'public');
  if(m[2]){
    const target=resolvedTable(schema,m[2]);if(!target)continue;
    const after=raw.slice(m.index+m[0].length,m.index+m[0].length+600);
    const method=/\.\s*(insert|upsert|update|delete)\s*\(/i.exec(after);
    const nextFrom=/\.from\s*\(/i.exec(after);
    const methodInChain=method&&(!nextFrom||method.index<nextFrom.index);
    if(methodInChain)add(row({...target,kind:'SUPABASE_DML',operation:method[1].toUpperCase(),rel,line:lineOf(m.index),confidence:'CHAIN_HEURISTIC_REVIEW_REQUIRED'}));
    else add(row({...target,kind:'SUPABASE_READ_OR_UNKNOWN',operation:'FROM',rel,line:lineOf(m.index),confidence:'CALL_SITE_REVIEW_REQUIRED'}));
  } else {
    evidence.dynamic.push({file:rel,line:lineOf(m.index),owner:'',reason:'DYNAMIC_SUPABASE_TABLE_REFERENCE',confidence:'REQUIRES_MANUAL_REVIEW'});
  }
 }
 const rpc=/\.rpc\s*\(\s*(['"`])([a-z_][a-z0-9_]*)\1/gi;
 for(const m of raw.matchAll(rpc)){
   evidence.rpcCalls.push({name:m[2],file:rel,line:lineOf(m.index),confidence:'RPC_CALL_SITE_NOT_MUTATION_PROOF'});
 }
 const authWrites=/\bauth\s*\.\s*(?:admin\s*\.\s*)?(?:updateUser|updateUserById|deleteUser|createUser|signUp|inviteUserByEmail)\s*\(/gi;
 for(const m of raw.matchAll(authWrites))evidence.externalWrites.push({kind:'AUTH_API_WRITE',file:rel,line:lineOf(m.index),confidence:'OUTSIDE_SQL_TRIGGER_SCOPE'});
}
function uniqueRows(a){const s=new Set();return a.filter(v=>{const key=[v.schema,v.table,v.kind,v.operation,v.file,v.line,v.owner].join('|');if(s.has(key))return false;s.add(key);return true;});}
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
 return {project:'SafeScan Brasil',phase:'R10K-3C4F-C3F-B5-B3-B2-R2-C1',mode:'STATIC_READ_ONLY',filesScanned:files.length,sqlFiles:sqlCount,jsFiles:jsCount,
   domains,rows:matrix,evidence,missingGates,obligations,
   mutationCoverage:'NOT_PROVEN',distributedInvalidation:'NOT_IMPLEMENTED',productionMigration:'NOT_CREATED',
   limitations:['Static lexical analysis; not a complete SQL/JavaScript parser', 'Static analysis recognizes public/private/auth but does not resolve aliases, dynamic SQL, search_path or actual runtime privileges','No live database catalog or actual privileges examined','Dynamic SQL, indirect RPC calls, auth identity changes, trigger execution and deployment state require further evidence','File and line candidates are not proof that the code path executes']};
}
function csvEscape(v){const s=String(v??'');return '"'+s.replaceAll('"','""')+'"';}
export function renderCsv(report){const keys=['domain','table','schema','kind','operation','file','line','owner','confidence','note'];return [keys.join(','),...report.rows.map(r=>keys.map(k=>csvEscape(r[k])).join(','))].join('\n')+'\n';}
export function renderMarkdown(report){
 const lines=[
 '# SafeScan Brasil — R10K-3C4F-C3F-B5-B3-B2-R2-C1',
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
export function compareR1(current,baseline){
 const domainCounts={};
 for(const k of Object.keys(DOMAIN_TABLES)) domainCounts[k]={r1:baseline.domains[k]?.candidateCount??null,r2:current.domains[k]?.candidateCount??null};
 const r1Ids=new Set(baseline.rows.map(r=>[r.file,r.line,r.table,r.kind,r.operation].join('|')));
 const r2Ids=new Set(current.rows.map(r=>[r.file,r.line,r.table,r.kind,r.operation].join('|')));
 return {baselineRows:baseline.rows.length,currentRows:current.rows.length,
  retained:[...r1Ids].filter(x=>r2Ids.has(x)).length,
  new:[...r2Ids].filter(x=>!r1Ids.has(x)).length,
  missing:[...r1Ids].filter(x=>!r2Ids.has(x)).length,
  domainCounts,coverage:'NOT_PROVEN',statement:'Lexical candidates and counts; no exhaustive mutation coverage proven'};
}
export function renderComparison(c){return [
 '## Comparação R1 → R2-C1','',`Candidatos R1: ${c.baselineRows}; R2: ${c.currentRows}; coincidentes: ${c.retained}; novos: ${c.new}; ausentes: ${c.missing}.`,
 '', '| Domínio | R1 | R2-C1 |', '|---|---:|---:|', ...Object.entries(c.domainCounts).map(([k,v])=>`| ${k} | ${v.r1} | ${v.r2} |`),
 '', '**COVERAGE=NOT_PROVEN**: mudanças no total refletem também correções de detecção e filtragem de falsos positivos.',
 '', 'Artefatos em pasta Downloads; nenhuma migration gerada; revisão manual dos caminhos reais ainda é mandatória.'
 ].join('\n')+'\n';}
function main(){const args=process.argv.slice(2);
 if(args[0]==='--scan' && args[1]) {
   const report=analyzeRepository(path.resolve(args[1]));
   if(args[2]==='--json')process.stdout.write(JSON.stringify(report,null,2)+'\n');
   else {process.stdout.write(renderMarkdown(report));}
 } else if(args[0]==='--export' && args[1] && args[2] && args[3]) {
   const root=fs.realpathSync(path.resolve(args[1]));
   const output=path.resolve(args[2]);
   const baseline=JSON.parse(fs.readFileSync(path.resolve(args[3]),'utf8'));
   if (baseline.phase!=='R10K-3C4F-C3F-B5-B3-B2-R1' || baseline.rows?.length!==71 || baseline.filesScanned!==726)throw new Error('SAFE_STOP: baseline R1 unexpected');
   if (output===root || output.startsWith(root+path.sep))throw new Error('SAFE_STOP: report output cannot be inside repository');
   if (fs.existsSync(output))throw new Error('SAFE_STOP: report destination already exists');
   const current=analyzeRepository(root);
   const sourceDeviceMigration=path.join(root,'supabase/migrations/20261014194000_r10k_3c4e2_device_registry_replay.sql');
   if(fs.existsSync(sourceDeviceMigration)) {
     if(current.domains.DEVICE.candidateCount===0 || !current.evidence.triggers.some(x=>x.schema==='private' && x.table==='camera_ia_operational_devices'))
       throw new Error('SAFE_STOP: private device or update trigger still missing from static analysis');
   }
   const comparison=compareR1(current,baseline);
   fs.mkdirSync(output,{recursive:false});
   fs.writeFileSync(path.join(output,'matriz_mutacoes_r2.csv'),renderCsv(current),{flag:'wx'});
   fs.writeFileSync(path.join(output,'auditoria_completa_r2.json'),JSON.stringify({...current,comparison},null,2)+'\n',{flag:'wx'});
   fs.writeFileSync(path.join(output,'relatorio_auditoria_r2.md'),renderMarkdown(current)+'\n'+renderComparison(comparison),{flag:'wx'});
   console.log('R2C1_R1_BASELINE_SHA_CHECK=HOST_PRECHECK_REQUIRED');
   console.log('R2C1_SOURCE_FILES='+current.filesScanned);
   console.log('R2C1_MUTATION_ROWS='+current.rows.length);
   for(const [domain,data] of Object.entries(current.domains))console.log('R2C1_DOMAIN_'+domain+'='+data.candidateCount+'_CANDIDATES;COVERAGE=NOT_PROVEN');
   console.log('R2C1_COMPARISON_R1_71_VS_R2_'+current.rows.length+'=GENERATED');
   console.log('R2C1_STATIC_COVERAGE=NOT_PROVEN');
   console.log('R2C1_DISTRIBUTED_INVALIDATION=NOT_IMPLEMENTED');
   console.log('R2C1_REPORTS_CREATED=TRUE');
 } else if(args[0]==='--self-check'){
   if(Object.keys(DOMAIN_TABLES).length!==7 || tableDomain.size!==9)throw new Error('Domain contract failed');
   console.log('B5B3B2_R1_STATIC_CONTRACT=GREEN');
 } else {console.error('Usage: node auditor.mjs --scan <repo> [--json] | --export <repo> <output-outside-repo> <R1-json> | --self-check');process.exitCode=2;}
}
if(process.argv[1] && path.resolve(process.argv[1])===path.resolve(fileURLToPath(import.meta.url)))main();
