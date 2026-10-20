// Offline shared contract for R1/R2 revocation audit tests.
// Keeps the seven common scenarios registered once per auditor.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export function withFixture(fn){const root=fs.mkdtempSync(path.join(os.tmpdir(),'safescan-b5b3b2r1-'));try{return fn(root);}finally{fs.rmSync(root,{recursive:true,force:true});}}
export function write(root,rel,body){const p=path.join(root,rel);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,body);}
export const fixtureSql=`-- public.tenants and UPDATE public.tenants must be ignored here
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

export function registerOperationalRevocationAuditSharedTests({
    analyzeRepository,
    DOMAIN_TABLES,
    renderCsv,
    renderMarkdown,
}) {
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
}