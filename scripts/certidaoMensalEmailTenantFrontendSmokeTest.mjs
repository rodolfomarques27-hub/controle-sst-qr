import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";

const raiz =
  new URL(
    "../",
    import.meta.url,
  );

function ler(
  relativo,
) {
  return readFileSync(
    new URL(
      relativo,
      raiz,
    ),
    "utf8",
  );
}

const service =
  ler(
    "src/features/certidao-mensal-documental/services/certidaoMensalEmailConfiguracaoService.js",
  );

const componente =
  ler(
    "src/components/configuracoes/CertidaoMensalEmailConfiguracoes.jsx",
  );

const tenant =
  ler(
    "src/components/configuracoes/ConfiguracoesTenant.jsx",
  );

const sistema =
  ler(
    "src/components/configuracoes/ConfiguracoesSistema.jsx",
  );

const modelos =
  ler(
    "src/components/configuracoes/ModelosEmailSstConfiguracoes.jsx",
  );

for (
  const rpc of [
    "listar_configuracoes_email_certidao_mensal_tenant",
    "salvar_configuracao_email_certidao_mensal_tenant",
    "excluir_configuracao_email_certidao_mensal_tenant",
  ]
) {
  assert.ok(
    service.includes(
      rpc,
    ),
    `RPC tenant-scoped ausente no service: ${rpc}`,
  );
}

for (
  const legado of [
    "admin_listar_configuracoes_email_certidao_mensal",
    "admin_salvar_configuracao_email_certidao_mensal",
    "admin_excluir_configuracao_email_certidao_mensal",
  ]
) {
  assert.ok(
    !service.includes(
      legado,
    ),
    `RPC administrativa legada ainda presente no service: ${legado}`,
  );
}

assert.match(
  service,
  /listarConfiguracoesEmailCertidaoMensal\s*\(\s*tenantId\s*,\s*\)/s,
  "Listagem deve exigir tenantId.",
);

assert.match(
  service,
  /salvarConfiguracaoEmailCertidaoMensal\s*\(\s*tenantId\s*,\s*dados/s,
  "Salvamento deve exigir tenantId.",
);

assert.match(
  service,
  /excluirConfiguracaoEmailCertidaoMensal\s*\(\s*tenantId\s*,\s*empresaId/s,
  "Exclusão deve exigir tenantId.",
);

assert.ok(
  (
    service.match(
      /p_tenant_id:/g,
    ) || []
  ).length >= 3,
  "Todas as RPCs operacionais devem receber p_tenant_id.",
);

assert.match(
  service,
  /admin-gerenciar-provedor-email-tenant/,
  "Status seguro deve usar a Edge tenant administrativa.",
);

assert.match(
  service,
  /acao:\s*"obter"/,
  "Frontend operacional pode somente obter status seguro.",
);

for (
  const proibido of [
    "credencial_vault_id",
    "decrypted_secret",
    "credencialNova",
    "credencial_nova",
    "GMAIL_APP_PASSWORD",
    "SUPABASE_SERVICE_ROLE_KEY",
  ]
) {
  assert.ok(
    !service.includes(
      proibido,
    ),
    `Service frontend contém dado proibido: ${proibido}`,
  );
}

assert.match(
  componente,
  /tenantId\s*=\s*""/,
  "Componente deve receber tenantId.",
);

assert.match(
  componente,
  /listarConfiguracoesEmailCertidaoMensal\s*\(\s*tenantIdNormalizado\s*,\s*\)/s,
  "Listagem deve ser tenant-scoped.",
);

assert.match(
  componente,
  /salvarConfiguracaoEmailCertidaoMensal\s*\(\s*tenantIdNormalizado\s*,/s,
  "Salvamento deve ser tenant-scoped.",
);

assert.match(
  componente,
  /excluirConfiguracaoEmailCertidaoMensal\s*\(\s*tenantIdNormalizado\s*,\s*empresaId/s,
  "Exclusão deve ser tenant-scoped.",
);

assert.match(
  componente,
  /obterConfiguracaoEmailTenantSegura/,
  "Status seguro do provedor deve ser exibido.",
);

assert.match(
  componente,
  /Envio operacional do tenant/,
  "Card deve identificar envio operacional tenant.",
);

assert.doesNotMatch(
  componente,
  /AssinaturaModeloEmailSstConfiguracoes/,
  "Tenant não pode editar assinatura global.",
);

assert.doesNotMatch(
  componente,
  /Assinatura padrão das Certidões Mensais/,
  "Assinatura global duplicada deve ser removida.",
);

assert.doesNotMatch(
  componente,
  /Gmail existente/,
  "Tenant não pode presumir Gmail global.",
);

for (
  const proibido of [
    "credencial_vault_id",
    "decrypted_secret",
    "GMAIL_APP_PASSWORD",
    "SUPABASE_SERVICE_ROLE_KEY",
  ]
) {
  assert.ok(
    !componente.includes(
      proibido,
    ),
    `Componente contém dado sensível proibido: ${proibido}`,
  );
}

assert.match(
  tenant,
  /CertidaoMensalEmailConfiguracoes/,
  "Configurações do tenant devem incorporar o card.",
);

assert.match(
  tenant,
  /tenant\?\.id/,
  "tenant.id runtime deve ser utilizado.",
);

assert.match(
  tenant,
  /"certidao_mensal_documental"/,
  "Card deve possuir module gate.",
);

assert.match(
  tenant,
  /modulo\?\.disponivel\s*===\s*true/,
  "Módulo precisa estar disponível.",
);

assert.match(
  tenant,
  /perfilUsuarioChave\s*===\s*"administrador"/,
  "Somente administrador pode alterar.",
);

assert.match(
  tenant,
  /tenantId=\{tenantId\}/,
  "tenantId runtime deve chegar ao componente.",
);

assert.match(
  tenant,
  /podeAlterar=\{\s*podeAlterarCertidaoMensal\s*\}/s,
  "Gate de edição deve chegar ao componente.",
);

assert.doesNotMatch(
  sistema,
  /CertidaoMensalEmailConfiguracoes/,
  "Painel global não pode manter componente operacional da Certidão.",
);

assert.doesNotMatch(
  sistema,
  /config-email-certidao-mensal/,
  "Painel global não pode manter chave operacional da Certidão.",
);

assert.match(
  sistema,
  /ModelosEmailSstConfiguracoes/,
  "Modelos globais devem permanecer.",
);

assert.match(
  sistema,
  /ProvedorEmailConfiguracoes/,
  "Provedor central deve permanecer.",
);

assert.match(
  modelos,
  /AssinaturaModeloEmailSstConfiguracoes/,
  "Assinatura global deve permanecer em Modelos de E-mail SST.",
);

console.log("");
console.log(
  "R2_2_D2A_TENANT_CERTIDAO_EMAIL_FRONTEND_SMOKE_OK",
);
console.log("TENANT_ID_RUNTIME=SIM");
console.log("RPCS_TENANT_SCOPED=3");
console.log("LEGACY_ADMIN_RPCS_FRONTEND=0");
console.log("MODULE_GATE_CERTIDAO=SIM");
console.log("ADMIN_CAN_EDIT=SIM");
console.log("NON_ADMIN_READ_ONLY=SIM");
console.log("SAFE_PROVIDER_STATUS=SIM");
console.log("TENANT_SECRET_EXPOSURE=0");
console.log("TENANT_GLOBAL_SIGNATURE_EDITOR=0");
console.log("GLOBAL_EMAIL_MODELS_PRESERVED=SIM");
console.log("CENTRAL_PROVIDER_PRESERVED=SIM");
console.log("SUPABASE_REAL_MUTATION=NAO");
