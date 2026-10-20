import test from 'node:test';
import assert from 'node:assert/strict';

import {
    analyzeRepository,
    DOMAIN_TABLES,
    renderCsv,
    renderMarkdown,
    compareR1,
    renderComparison,
} from './operationalRevocationMutationMatrixAuditR2C1.mjs';

import {
    registerOperationalRevocationAuditSharedTests,
    withFixture,
    write,
} from './operationalRevocationMutationMatrixAuditSharedTests.mjs';

registerOperationalRevocationAuditSharedTests({
    analyzeRepository,
    DOMAIN_TABLES,
    renderCsv,
    renderMarkdown,
});
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
