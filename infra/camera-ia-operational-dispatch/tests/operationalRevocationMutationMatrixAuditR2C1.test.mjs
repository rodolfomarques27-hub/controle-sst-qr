// Offline static-auditor contract tests; only temporary fixtures outside the repository.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {analyzeRepository, DOMAIN_TABLES, renderCsv, renderMarkdown, compareR1, renderComparison} from './operationalRevocationMutationMatrixAuditR2C1.mjs';
function withFixture(fn){const root=fs.mkdtempSync(path.join(os.tmpdir(),'safescan-b5b3b2r1-'));try{return fn(root);}finally{fs.rmSync(root,{recursive:true,force:true});}}
function write(root,rel,body){const p=path.join(root,rel);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,body);}
const fixtureSql=`-- public.tenants and UPDATE public.tenants must be ignored here
create or replace function public.usuario_ativo_sistema() returns boolean language sql as $function$
 select exists(select 1 from public.usuarios_permissoes_sistema where ativo = true);
$function$;
create or replace function public.admin_muda_tenant() returns void language plpgsql as $body$
begin
 update public.tenants set status='suspenso';
 update public.tenant_memberships set status='revogado';
 execute format('update %I set status = %L', 'tenants', 'suspenso');
end;
$body$;
create trigger tenant_changed after insert or update on public.tenants for each row execute function public.tenant_revoked();
alter table public.empresas add constraint fk_test foreign key(tenant_id) references public.tenants(id) on delete cascade;
`;
test('domain contract includes seven authorization domains and legacy paths',()=>{
 assert.equal(Object.keys(DOMAIN_TABLES).length,7);
 assert.deepEqual(DOMAIN_TABLES.EMPRESA,['empresas','auditoria_usuarios_autorizados']);
 assert.ok(DOMAIN_TABLES.USER.includes('auth.users'));
});
test('SQL detects function-owned mutations and trigger without promoting coverage',()=>withFixture(root=>{
 write(root,'supabase/migrations/0001.sql',fixtureSql);
 const a=analyzeRepository(root);
 assert.equal(a.mutationCoverage,'NOT_PROVEN');
 assert.equal(a.productionMigration,'NOT_CREATED');
 const tenant=a.rows.filter(x=>x.table==='tenants');
 assert.ok(tenant.some(x=>x.operation==='UPDATE' && x.owner==='public.admin_muda_tenant'));
 assert.ok(tenant.some(x=>x.kind==='SQL_TRIGGER'));
 assert.ok(a.evidence.dynamic.length>=1);
 assert.ok(a.evidence.cascades.some(x=>x.referencedTable==='tenants'&&x.action==='CASCADE'));
 assert.ok(a.evidence.definitions.some(x=>x.name==='public.usuario_ativo_sistema'));
 assert.equal(a.rows.some(x=>x.file.includes('node_modules')),false);
}));
test('old and modern company auth branches remain explicit review obligations',()=>withFixture(root=>{
 write(root,'supabase/migrations/a.sql', `create or replace function public.usuario_tem_acesso_empresa(p uuid) returns boolean language sql as $f$ select public.usuario_admin_global() or exists(select 1 from public.auditoria_usuarios_autorizados) or public.usuario_tem_acesso_tenant(p); $f$;`);
 const a=analyzeRepository(root);
 const deps=a.evidence.gateDependencies.flatMap(x=>x.calls);
 assert.ok(deps.includes('usuario_admin_global'));
 assert.ok(deps.includes('usuario_tem_acesso_tenant'));
 assert.ok(a.obligations.some(x=>x.includes('email/JWT')));
}));
test('Supabase DML and RPC, external Auth and dynamic references flagged',()=>withFixture(root=>{
 write(root,'src/services/s.js',`await supabase.from('tenant_memberships').update({status:'revogado'}).eq('id',x);\nawait supabase.from('camera_ia_view_permissions').delete().eq('id',y);\nawait supabase.rpc('admin_remover_acesso',{x});\nawait supabase.auth.admin.updateUserById(user,{email:'new@example.com'});\nawait supabase.from(target).update({a:true});`);
 const a=analyzeRepository(root);
 assert.ok(a.rows.some(x=>x.table==='tenant_memberships'&&x.kind==='SUPABASE_DML'&&x.operation==='UPDATE'));
 assert.ok(a.rows.some(x=>x.table==='camera_ia_view_permissions'&&x.operation==='DELETE'));
 assert.ok(a.evidence.rpcCalls.some(x=>x.name==='admin_remover_acesso'));
 assert.ok(a.evidence.externalWrites.length>0);
 assert.ok(a.evidence.dynamic.length>0);
}));
test('CSV and Markdown emit evidence without pretending exhaustiveness',()=>withFixture(root=>{
 write(root,'supabase/migrations/a.sql',fixtureSql);
 const a=analyzeRepository(root);const csv=renderCsv(a),md=renderMarkdown(a);
 assert.match(csv,/"TENANT","tenants"/);
 assert.match(md,/NOT_PROVEN/);
 assert.match(md,/MIGRATION_CREATED=FALSE/);
 assert.match(md,/supabase\/migrations\/a.sql:/);
}));
test('out-of-scope files, symlinks and generated folders excluded',()=>withFixture(root=>{
 write(root,'supabase/migrations/z.sql','UPDATE public.tenants set status=\'suspenso\';');
 write(root,'node_modules/pkg/index.js','await supabase.from("tenants").update({});');
 write(root,'src/x.test.mjs','await supabase.from("tenants").update({});');
 write(root,'docs/sample.sql','UPDATE public.tenants SET status=\'ativo\';');
 const a=analyzeRepository(root);assert.equal(a.filesScanned,1);
}));
test('table scope covers ACL and device independently',()=>withFixture(root=>{
 write(root,'supabase/migrations/x.sql','update public.camera_ia_view_permissions set habilitada=false;\nupdate public.camera_ia_operational_devices set revoked_at=now();');
 const a=analyzeRepository(root);
 assert.equal(a.domains.ACL.sqlMutations,1);
 assert.equal(a.domains.DEVICE.sqlMutations,1);
}));

test('private device DML and trigger recognized and qualified',()=>withFixture(root=>{
 write(root,'supabase/migrations/zz.sql',`CREATE TABLE private.camera_ia_operational_devices(id uuid, revoked_at timestamptz);
 UPDATE private.camera_ia_operational_devices SET revoked_at=now();
 CREATE TRIGGER cam_ia_op_device_guard_update BEFORE UPDATE ON private.camera_ia_operational_devices FOR EACH ROW EXECUTE FUNCTION private.cam_ia_op_device_guard_update();`);
 const a=analyzeRepository(root);
 assert.ok(a.rows.some(r=>r.domain==='DEVICE'&&r.kind==='SQL_DML'&&r.schema==='private'));
 assert.ok(a.evidence.triggers.some(t=>t.table==='camera_ia_operational_devices'&&t.schema==='private'));
 assert.ok(a.rows.some(r=>r.domain==='DEVICE'&&r.kind==='SQL_DDL'));
 assert.equal(a.mutationCoverage,'NOT_PROVEN');
}));
test('auth.users qualified identity writes remain explicit USER',()=>withFixture(root=>{
 write(root,'supabase/migrations/a.sql',`UPDATE auth.users SET email='test@example.com'; DELETE FROM "auth"."users" WHERE id IS NULL; UPDATE public.users SET email='x';`);
 const a=analyzeRepository(root);
 assert.equal(a.rows.filter(r=>r.kind==='SQL_DML'&&r.domain==='USER').length,2);
 assert.ok(a.rows.filter(r=>r.kind==='SQL_DML'&&r.domain==='USER').every(r=>r.table==='auth.users'&&r.schema==='auth'));
}));
test('upsert has separate conflict update candidate',()=>withFixture(root=>{
 write(root,'supabase/migrations/a.sql',`INSERT INTO public.tenant_memberships (id,status) VALUES (1,'ativo') ON CONFLICT (id) DO UPDATE SET status='revogado';`);
 const a=analyzeRepository(root);
 assert.ok(a.rows.some(r=>r.kind==='SQL_DML'&&r.operation==='INSERT INTO'));
 assert.ok(a.rows.some(r=>r.kind==='SQL_UPSERT_UPDATE'&&r.operation==='ON CONFLICT DO UPDATE'));
}));
test('privileges multiple table targets include all tracked',()=>withFixture(root=>{
 write(root,'supabase/migrations/a.sql',`GRANT SELECT ON TABLE public.tenants, public.empresas, private.camera_ia_operational_devices TO service_role;
REVOKE ALL ON TABLE public.tenants, public.empresas FROM anon;`);
 const a=analyzeRepository(root);
 assert.ok(a.evidence.grants.some(x=>x.table==='tenants'&&x.action==='GRANT'));
 assert.ok(a.evidence.grants.some(x=>x.table==='empresas'&&x.action==='GRANT'));
 assert.ok(a.evidence.grants.some(x=>x.table==='camera_ia_operational_devices'&&x.schema==='private'));
 assert.ok(a.evidence.grants.some(x=>x.table==='empresas'&&x.action==='REVOKE'));
}));
test('Buffer.from not Supabase evidence, real dynamic Supabase is flagged',()=>withFixture(root=>{
 write(root,'src/testsupport/a.mjs',`const a=Buffer.from('tenants'); const b=Array.from(xs); const z=supabase.from(target).update({status:'ativo'}); const t=supabase.from('tenants').update({status:'ativo'});`);
 const a=analyzeRepository(root);
 assert.equal(a.evidence.dynamic.length,1);
 assert.equal(a.rows.filter(x=>x.table==='tenants'&&x.kind==='SUPABASE_DML').length,1);
}));
test('Supabase private schema device mutation recognized',()=>withFixture(root=>{
 write(root,'src/a.mjs',`await supabase.schema('private').from('camera_ia_operational_devices').update({status:'revogado'}).eq('id',id);`);
 const a=analyzeRepository(root);
 assert.ok(a.rows.some(r=>r.domain==='DEVICE'&&r.schema==='private'&&r.kind==='SUPABASE_DML'));
}));
test('qualified ON DELETE CASCADE and CREATE TABLE captured, not treated as mutation coverage',()=>withFixture(root=>{
 write(root,'supabase/migrations/a.sql',`CREATE TABLE private.camera_ia_operational_devices(id uuid); ALTER TABLE public.tenant_memberships ADD FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;`);
 const a=analyzeRepository(root);
 assert.ok(a.rows.some(r=>r.domain==='DEVICE'&&r.operation==='CREATE TABLE'));
 assert.ok(a.evidence.cascades.some(r=>r.referencedTable==='tenants'&&r.action==='CASCADE'));
 assert.equal(a.mutationCoverage,'NOT_PROVEN');
}));
test('R1 to R2 comparison reports candidate deltas without claiming complete coverage',()=>withFixture(root=>{
 write(root,'supabase/migrations/a.sql',`UPDATE private.camera_ia_operational_devices SET status='revogado';`);
 const report=analyzeRepository(root);
 const baseline={rows:[{file:'a',line:1,table:'tenants',kind:'SQL_DML',operation:'UPDATE'}],domains:Object.fromEntries(Object.keys(DOMAIN_TABLES).map(k=>[k,{candidateCount:0}]))};
 const c=compareR1(report,baseline);
 assert.equal(c.coverage,'NOT_PROVEN');
 assert.equal(c.new,1);assert.equal(c.missing,1);
 assert.match(renderComparison(c),/NOT_PROVEN/);
}));
