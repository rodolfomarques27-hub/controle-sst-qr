import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";

const arquivo =
  new URL(
    "../supabase/migrations/20260925154500_r22_certidao_email_tenant_scope.sql",
    import.meta.url,
  );

const fonte =
  readFileSync(
    arquivo,
    "utf8",
  ).replace(
    /\r\n?/g,
    "\n",
  );

function quantidade(
  regex,
) {
  return (
    fonte.match(
      regex,
    ) || []
  ).length;
}

const obrigatorios = [
  "add column tenant_id uuid null",
  "public.empresas empresa",
  "config.escopo =",
  "'EMPRESA'",
  "config.tenant_id is null",
  "certidao_mensal_email_config_tenant_id_fkey",
  "certidao_mensal_email_config_tenant_empresa_fkey",
  "public.empresas(",
  "tenant_id,",
  "certidao_mensal_email_config_tenant_scope_check",
  "certidao_mensal_email_config_tenant_global_uidx",
  "certidao_mensal_email_config_tenant_empresa_uidx",
  "listar_configuracoes_email_certidao_mensal_tenant",
  "salvar_configuracao_email_certidao_mensal_tenant",
  "excluir_configuracao_email_certidao_mensal_tenant",
  "usuario_pode_gerenciar_tenant",
  "obter_configuracao_email_certidao_mensal_para_envio",
  "admin_listar_configuracoes_email_certidao_mensal",
  "admin_salvar_configuracao_email_certidao_mensal",
  "admin_excluir_configuracao_email_certidao_mensal",
  "GLOBAL legado com tenant_id NULL nunca participa",
];

for (
  const marcador of
  obrigatorios
) {
  assert.ok(
    fonte.includes(
      marcador,
    ),
    `Marcador obrigatório ausente: ${marcador}`,
  );
}

assert.equal(
  quantidade(
    /public\.usuario_pode_gerenciar_tenant\s*\(\s*p_tenant_id\s*\)/g,
  ),
  3,
  "As três RPCs administrativas tenant-scoped devem exigir usuario_pode_gerenciar_tenant(p_tenant_id).",
);

assert.match(
  fonte,
  /update\s+public\.certidao_mensal_email_configuracoes\s+config[\s\S]*?set\s+tenant_id\s*=\s*empresa\.tenant_id[\s\S]*?config\.escopo\s*=\s*'EMPRESA'/i,
  "Backfill deve ocorrer deterministicamente via empresas.tenant_id somente para EMPRESA.",
);

assert.match(
  fonte,
  /config\.escopo\s*=\s*'EMPRESA'[\s\S]*?config\.tenant_id\s+is\s+null[\s\S]*?raise exception[\s\S]*?abortada/i,
  "Migration deve abortar se qualquer configuração EMPRESA permanecer sem tenant.",
);

assert.match(
  fonte,
  /escopo\s*=\s*'GLOBAL'[\s\S]*?tenant_id\s+is\s+null[\s\S]*?ativo\s*=\s*true/i,
  "GLOBAL legado ativo deve ser desativado, nunca atribuído por inferência.",
);

assert.match(
  fonte,
  /foreign key\s*\(\s*tenant_id,\s*empresa_id\s*\)[\s\S]*?references\s+public\.empresas\s*\(\s*tenant_id,\s*id\s*\)/i,
  "Integridade empresa × tenant deve usar FK composta real.",
);

assert.match(
  fonte,
  /create unique index\s+certidao_mensal_email_config_tenant_global_uidx[\s\S]*?\(\s*tenant_id\s*\)[\s\S]*?escopo\s*=\s*'GLOBAL'[\s\S]*?tenant_id\s+is\s+not\s+null/i,
  "Deve existir no máximo um GLOBAL por tenant.",
);

assert.match(
  fonte,
  /create unique index\s+certidao_mensal_email_config_tenant_empresa_uidx[\s\S]*?\(\s*tenant_id,\s*empresa_id\s*\)[\s\S]*?escopo\s*=\s*'EMPRESA'/i,
  "Deve existir no máximo uma configuração EMPRESA por tenant/empresa.",
);

assert.match(
  fonte,
  /drop index if exists\s+public\.certidao_mensal_email_config_global_uidx/i,
  "Índice GLOBAL absoluto legado deve ser removido.",
);

assert.match(
  fonte,
  /drop index if exists\s+public\.certidao_mensal_email_config_empresa_uidx/i,
  "Índice EMPRESA legado deve ser substituído pelo índice tenant-scoped.",
);

const inicioResolver =
  fonte.indexOf(
    "create or replace function\npublic.obter_configuracao_email_certidao_mensal_para_envio",
  );

const fimResolver =
  fonte.indexOf(
    "-- ============================================================================\n-- 10.",
    inicioResolver,
  );

assert.ok(
  inicioResolver >= 0 &&
    fimResolver > inicioResolver,
  "Bloco do resolver operacional não localizado.",
);

const resolver =
  fonte.slice(
    inicioResolver,
    fimResolver,
  );

assert.match(
  resolver,
  /select\s+empresa\.tenant_id[\s\S]*?from\s+public\.empresas\s+empresa[\s\S]*?empresa\.id\s*=\s*p_empresa_id/i,
  "Resolver deve descobrir tenant exclusivamente pela empresa solicitada.",
);

assert.ok(
  (
    resolver.match(
      /config\.tenant_id\s*=\s*v_tenant_id/g,
    ) || []
  ).length >= 2,
  "EMPRESA e GLOBAL devem ser filtrados pelo mesmo tenant.",
);

assert.doesNotMatch(
  resolver,
  /config\.tenant_id\s+is\s+null/i,
  "GLOBAL legado sem tenant jamais pode participar do resolver operacional.",
);

assert.match(
  fonte,
  /revoke execute[\s\S]*?admin_listar_configuracoes_email_certidao_mensal\(\)[\s\S]*?from\s+authenticated/i,
  "RPC legada LISTAR deve perder EXECUTE de authenticated.",
);

assert.match(
  fonte,
  /revoke execute[\s\S]*?admin_salvar_configuracao_email_certidao_mensal[\s\S]*?from\s+authenticated/i,
  "RPC legada SALVAR deve perder EXECUTE de authenticated.",
);

assert.match(
  fonte,
  /revoke execute[\s\S]*?admin_excluir_configuracao_email_certidao_mensal[\s\S]*?from\s+authenticated/i,
  "RPC legada EXCLUIR deve perder EXECUTE de authenticated.",
);

const hardcodesProibidos = [
  "78e03188-cb88-40ee-95df-82cfbc2022ef",
  "21332ffa-414c-4f9b-91a3-b091daa8e9c4",
  "usuario@tenant-a.example.com",
  "rodolfomarques27@gmail.com",
];

for (
  const marcador of
  hardcodesProibidos
) {
  assert.ok(
    !fonte.includes(
      marcador,
    ),
    `R2.2-C não pode hardcodar dado de tenant/empresa/e-mail: ${marcador}`,
  );
}

assert.doesNotMatch(
  fonte,
  /\binsert\s+into\s+(?:public\.)?tenant_email_configuracao\b/i,
  "R2.2-C não pode inserir configuração de provedor de e-mail do tenant.",
);

assert.doesNotMatch(
  fonte,
  /\bupdate\s+(?:public\.)?tenant_email_configuracao\b/i,
  "R2.2-C não pode alterar configuração de provedor de e-mail do tenant.",
);

assert.doesNotMatch(
  fonte,
  /\bdelete\s+from\s+(?:public\.)?tenant_email_configuracao\b/i,
  "R2.2-C não pode excluir configuração de provedor de e-mail do tenant.",
);

assert.doesNotMatch(
  fonte,
  /\bmodo_envio\s*(?:=|:=)\s*'(?:SAFESCAN_GERENCIADO|PROVEDOR_CLIENTE|DESATIVADO)'/i,
  "R2.2-C não pode selecionar automaticamente modo de envio de e-mail para nenhum tenant.",
);

assert.ok(
  fonte.startsWith(
    "-- ============================================================================",
  ),
  "Migration deve possuir cabeçalho controlado.",
);

assert.ok(
  fonte.trimEnd().endsWith(
    "commit;",
  ),
  "Migration deve finalizar com commit.",
);

assert.ok(
  fonte.endsWith(
    "\n",
  ),
  "Migration deve terminar com LF.",
);

assert.ok(
  !fonte.endsWith(
    "\n\n",
  ),
  "Migration deve possuir exatamente um LF final.",
);

console.log(
  "",
);

console.log(
  "R2_2_C_CERTIDAO_EMAIL_TENANT_SCOPE_SMOKE_OK",
);

console.log(
  "TENANT_ID_COLUMN=SIM",
);

console.log(
  "BACKFILL_EMPRESA_DETERMINISTICO=SIM",
);

console.log(
  "EMPRESA_SEM_TENANT_ABORTA=SIM",
);

console.log(
  "GLOBAL_LEGADO_SEM_TENANT=INATIVO_E_IGNORADO",
);

console.log(
  "GLOBAL_UNICO_POR_TENANT=SIM",
);

console.log(
  "EMPRESA_UNICA_POR_TENANT=SIM",
);

console.log(
  "FK_EMPRESA_TENANT=SIM",
);

console.log(
  "RPCS_TENANT_SCOPED=3",
);

console.log(
  "LEGACY_AUTHENTICATED_EXECUTE=REVOGADO",
);

console.log(
  "RESOLVER_EMPRESA_GLOBAL_CROSS_TENANT=NAO",
);

console.log(
  "PROVIDER_MODE_AUTO_SELECTION=NAO",
);

console.log(
  "SUPABASE_REAL=NAO",
);
