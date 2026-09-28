import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ehEntradaAppOperacionalDev, obterHostnameTenantDev, deveSelecionarTenantNoDev } from "../src/routes/runtimeEntryService.js";
import { membershipTenantRuntimeAtiva, montarPermissaoMembershipTenantRuntime, montarUsuarioMembershipTenantRuntime } from "../src/services/tenantModulesRuntimeService.js";

const raiz = new URL("../", import.meta.url);
const ler = (relativo) => readFileSync(new URL(relativo, raiz), "utf8");
const gate = ler("src/components/layout/TenantContextGate.jsx");
const app = ler("src/App.jsx");
const modulesSource = ler("src/services/tenantModulesRuntimeService.js");

const legacy = {
  email: "rodolfo@tenant-a.example.com",
  nome: "teste",
  funcao: "Responsável pelo SafeScan",
  perfil: "consulta",
  ativo: false,
  bloqueado: true,
  acesso_global: true,
  permissoes: { acessoTotal: true },
  precisa_trocar_senha: false,
};
const membershipAtiva = {
  id: "11111111-1111-4111-8111-111111111111",
  tenant_id: "22222222-2222-4222-8222-222222222222",
  user_id: "33333333-3333-4333-8333-333333333333",
  papel: "administrador",
  status: "ativo",
  permissoes: {},
};

const permissaoTenant = montarPermissaoMembershipTenantRuntime({ membership: membershipAtiva, permissaoLegada: legacy });
assert.equal(permissaoTenant.perfil, "administrador");
assert.equal(permissaoTenant.ativo, true);
assert.equal(permissaoTenant.bloqueado, false);
assert.equal(permissaoTenant.acesso_global, false);
assert.deepEqual(permissaoTenant.permissoes, {});
assert.equal("nome" in permissaoTenant, false);
assert.equal("funcao" in permissaoTenant, false);

const permissaoComLegadoAdmin = montarPermissaoMembershipTenantRuntime({
  membership: { ...membershipAtiva, papel: "consulta", permissoes: {} },
  permissaoLegada: { ...legacy, perfil: "administrador", ativo: true, bloqueado: false, acesso_global: true },
});
assert.equal(permissaoComLegadoAdmin.perfil, "consulta");
assert.equal(permissaoComLegadoAdmin.acesso_global, false);

const membershipRevogada = { ...membershipAtiva, status: "revogado" };
assert.equal(membershipTenantRuntimeAtiva({ membership: membershipRevogada, tenantId: membershipRevogada.tenant_id, userId: membershipRevogada.user_id }), false);
assert.equal(membershipTenantRuntimeAtiva({ membership: membershipAtiva, tenantId: membershipAtiva.tenant_id, userId: membershipAtiva.user_id }), true);
assert.equal(membershipTenantRuntimeAtiva({ membership: membershipAtiva, tenantId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", userId: membershipAtiva.user_id }), false);
assert.equal(membershipTenantRuntimeAtiva({ membership: membershipAtiva, tenantId: membershipAtiva.tenant_id, userId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" }), false);

const usuarioSeguro = montarUsuarioMembershipTenantRuntime({
  usuario: {
    id: membershipAtiva.user_id,
    email: "rodolfo@tenant-a.example.com",
    nome: "teste",
    funcao: "Responsável pelo SafeScan",
    perfil: "consulta",
    ativo: false,
    bloqueado: true,
  },
  membership: membershipAtiva,
});
assert.equal(usuarioSeguro.nome, "Rodolfo");
assert.equal(usuarioSeguro.funcao, "Administrador do ambiente");
assert.equal(usuarioSeguro.perfil, "administrador");
assert.equal(usuarioSeguro.ativo, true);
assert.equal(usuarioSeguro.bloqueado, false);

const localDevSemTenant = { hostname: "127.0.0.1", pathname: "/dev-app", search: "", hash: "" };
assert.equal(ehEntradaAppOperacionalDev(localDevSemTenant), true);
assert.equal(obterHostnameTenantDev(localDevSemTenant), "");
assert.equal(deveSelecionarTenantNoDev(localDevSemTenant), true);

const localDevTenantA = { ...localDevSemTenant, search: "?tenant_host=tenant-a.safescanbrasil.com.br" };
assert.equal(obterHostnameTenantDev(localDevTenantA), "tenant-a.safescanbrasil.com.br");
assert.equal(deveSelecionarTenantNoDev(localDevTenantA), false);

assert.match(gate, /resolver_branding_tenant_por_hostname/);
assert.match(gate, /criarParametrosResolucaoHostnameTenant\s*\(\s*hostnameResolucao\s*\)/s);
assert.match(gate, /TelaSelecaoAmbienteDev/);
assert.match(gate, /Esta seleção não concede acesso/);
assert.doesNotMatch(gate, /<TelaAmbienteNaoEncontrado\s+hostname=\{\s*classificacao\.hostname\s*\}/s);
const canonicalUnknownCount = (gate.match(/<TelaAmbienteNaoEncontrado\s+hostname=\{\s*hostnameResolucao\s*\}/gs) || []).length;
assert.equal(canonicalUnknownCount, 2);
assert.match(app, /membershipTenantRuntimeAtiva\s*\(\{/);
assert.match(app, /\|\|\s*!membershipAtiva/);
assert.match(app, /montarUsuarioMembershipTenantRuntime\s*\(\{/);
assert.doesNotMatch(modulesSource, /\.\.\.\(permissaoLegada\s*\|\|\s*\{\}\)/);
assert.match(modulesSource, /\.from\(\s*"tenant_modulos"\s*\)/s);

console.log("R2_2_D2A_G1_TENANT_RUNTIME_IDENTITY_GUARD_SMOKE_OK");
console.log("ACTIVE_MEMBERSHIP_WINS_OVER_LEGACY=TRUE");
console.log("REVOKED_MEMBERSHIP_NEVER_AUTHORIZES=TRUE");
console.log("LEGACY_PROFILE_CANNOT_DOWNGRADE_TENANT=TRUE");
console.log("LEGACY_PROFILE_CANNOT_UPGRADE_TENANT=TRUE");
console.log("LEGACY_NAME_NOT_PROPAGATED=TRUE");
console.log("LEGACY_FUNCTION_NOT_PROPAGATED=TRUE");
console.log("DEV_WITHOUT_TENANT_FAILS_CLOSED=TRUE");
console.log("DEV_TENANT_HOST_REQUIRES_CANONICAL_RESOLUTION=TRUE");
console.log("TENANT_ROLE_FROM_MEMBERSHIP=TRUE");
console.log("TENANT_MODULES_FROM_TENANT_MODULOS=TRUE");
console.log("UNKNOWN_HOST_BLOCKS_CANONICAL=2/2");
console.log("NO_STALE_IDENTITY_LEAK=TRUE");
console.log("SUPABASE_REAL_MUTATION=NAO");
