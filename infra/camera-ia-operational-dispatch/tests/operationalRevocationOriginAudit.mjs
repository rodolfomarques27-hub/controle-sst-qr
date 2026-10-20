// SafeScan R10K-3C4F-C3F-B5-B3-B1 | READ-ONLY STATIC DIAGNOSTIC
// No writes, network, secrets or face/biometric processing. Static scan cannot prove complete coverage.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import assert from 'node:assert/strict';

const targets = [
  ['user', /usuario_ativo_sistema\s*\(|\bauth\.users\b|usuarios_permissoes|user[_-]?status/gi],
  ['membership', /\btenant_memberships\b|\bmembership\b/gi],
  ['empresa', /usuario_tem_acesso_empresa\s*\(|\bempresas\b|\bempresa_id\b/gi],
  ['tenant', /\btenants\b|\btenant_id\b|tenant.*status/gi],
  ['camera', /\bcamera_ia_cameras\b|\bcamera_ia_view_permissions\b|\bcamera_id\b/gi],
  ['acl', /camera_ia_autorizar_visualizacao\s*\(|camera_ia_view_permissions|\bacl\b/gi],
  ['device', /\bcamera_ia_operational_devices\b|\bdevice_id\b|revoked_at/gi]
];
const mutation=/\b(update|delete\s+from|insert\s+into|create\s+(?:or\s+replace\s+)?trigger|alter\s+table)\b|\.(?:insert|upsert|update|delete)\s*\(/i;
const definitions=/\bcreate\s+(?:or\s+replace\s+)?(?:function|trigger)\b/i;
function walk(dir, root, results, depth=0) {
  if (depth>4) return;
  for (const d of readdirSync(dir,{withFileTypes:true})) {
    if (d.isSymbolicLink() || ['node_modules','.git','dist','.next','build','coverage'].includes(d.name)) continue;
    const p=join(dir,d.name);
    if(d.isDirectory()) {walk(p,root,results,depth+1);continue;}
    if(!d.isFile()|| !/\.(sql|js|jsx|ts|tsx|mjs)$/i.test(d.name))continue;
    const rel=relative(root,p).replaceAll('\\','/');
    if(!rel.startsWith('supabase/migrations/') && !rel.startsWith('supabase/functions/') && !rel.startsWith('src/services/') && !rel.startsWith('src/features/camera-ia/'))continue;
    if(statSync(p).size>2_000_000)continue;
    results.push({p,rel});
  }
}
function classify(line){
  const found=targets.filter(([,re])=>{re.lastIndex=0;return re.test(line);}).map(([key])=>key);
  return {found, isMutation:mutation.test(line), isDefinition:definitions.test(line)};
}
function extract(root){
  const files=[]; walk(root,root,files);files.sort((a,b)=>a.rel.localeCompare(b.rel));
  const reports=Object.fromEntries(targets.map(([k])=>[k,{references:0, mutations:[], definitions:[], samples:[]}]));
  for(const {p,rel} of files){
    const lines=readFileSync(p,'utf8').split(/\r?\n/);
    for(let i=0;i<lines.length;i++){
      const line=lines[i];if(/^\s*(--|\/\/|\*|#)/.test(line))continue;
      const c=classify(line);
      const previous=lines.slice(Math.max(0,i-4),i+1).join(' ');
      const potentialMutation=c.isMutation || mutation.test(previous);
      for(const key of c.found){
        const item=reports[key];item.references++;
        const position=`${rel}:${i+1}`;
        if(potentialMutation && item.mutations.length<30) item.mutations.push(position);
        if(c.isDefinition && item.definitions.length<30) item.definitions.push(position);
        if(item.samples.length<8)item.samples.push(position);
      }
    }
  }
  const required=['usuario_ativo_sistema','usuario_tem_acesso_empresa'];
  const declared={};
  for(const name of required){
    const escaped=name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    // Require CREATE FUNCTION; references in 3C4C do not count as definitions.
    const re=new RegExp('\\bcreate\\s+(?:or\\s+replace\\s+)?function\\s+(?:public\\.)?'+escaped+'\\s*\\(','i');
    const origins=[];
    for(const {p,rel} of files){const src=readFileSync(p,'utf8'); if(re.test(src))origins.push(rel);}
    declared[name]={found:origins.length>0, origins:origins.slice(0,12)};
  }
  return {kind:'STATIC_AUDIT_NOT_DATABASE_PROOF',files_scanned:files.length,domains:reports,external_definitions:declared,
    limitation:'Static line matching is not exhaustive; function body writes, dynamic SQL, triggers, APIs and imported code require manual verification',
    next:'Review exact origin functions, mutation call sites, privileges and commit-fenced publication before any migration'};
}
function selfTest(){
 assert.deepEqual(classify('update public.tenant_memberships set status=\'inativo\'').found,['membership','tenant']);
 assert.equal(classify('update public.camera_ia_cameras set habilitada=false').isMutation,true);
 assert.equal(classify('create function public.usuario_ativo_sistema()').isDefinition,true);
 assert.equal(classify('-- update public.tenants').isMutation,true); // comment filtered at scan boundary
 console.log('B3B1_STATIC_CLASSIFIER_SELF_TEST=GREEN');
}
if(process.argv[2]==='--self-test')selfTest();
else if(process.argv[2]==='--scan' && process.argv[3]) {
 const res=extract(process.argv[3]);
 console.log('B3B1_STATIC_SOURCE_SCAN=GREEN');
 console.log('B3B1_SOURCE_FILES='+res.files_scanned);
 for(const [k,v] of Object.entries(res.domains)){
   console.log('B3B1_DOMAIN_'+k.toUpperCase()+'_REFERENCES='+v.references);
   console.log('B3B1_DOMAIN_'+k.toUpperCase()+'_MUTATION_CANDIDATES='+v.mutations.length);
   console.log('B3B1_DOMAIN_'+k.toUpperCase()+'_MUTATION_LOCATIONS='+v.mutations.slice(0,8).join(';'));
 }
 for(const [key,v] of Object.entries(res.external_definitions)) {
   console.log(`B3B1_ORIGIN_${key.toUpperCase()}=${v.found?'FOUND':'NOT_FOUND'};SOURCES=${v.origins.join(';')}`);
 }
 console.log('B3B1_MUTATION_LOCATIONS=HEURISTIC_REQUIRES_MANUAL_REVIEW');
 console.log('B3B1_SCOPE_COVERAGE=NOT_PROVEN_BY_STATIC_SCAN');
 console.log('B3B1_DISTRIBUTED_INVALIDATION=NOT_IMPLEMENTED');
} else {console.error('Usage: node audit.mjs --self-test | --scan <repo>');process.exitCode=2;}
