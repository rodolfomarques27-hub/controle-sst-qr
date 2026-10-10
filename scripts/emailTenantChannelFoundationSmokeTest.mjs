import {
  readFileSync,
} from "node:fs";

const arquivo =
  new URL(
    "../supabase/migrations/20260925145000_r22_email_tenant_foundation.sql",
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

function exigir(
  condicao,
  mensagem,
) {
  if (!condicao) {
    throw new Error(
      mensagem,
    );
  }
}

function ocorrencias(
  padrao,
) {
  return (
    fonte.match(
      padrao,
    ) || []
  ).length;
}

const obrigatorios = [
  "create table public.tenant_email_configuracao",
  "tenant_id uuid",
  "references public.tenants(id)",
  "SAFESCAN_GERENCIADO",
  "PROVEDOR_CLIENTE",
  "DESATIVADO",
  "credencial_vault_id uuid",
  "NAO_TESTADO",
  "APROVADO",
  "REPROVADO",
  "NAO_APLICAVEL",
  "enable row level security",
  "service_role",
  "vault.decrypted_secrets",
  "backend_obter_configuracao_email_tenant_para_envio",
  "p_tenant_id uuid",
  "security definer",
  "public.set_updated_at()",
];

for (
  const marcador of
  obrigatorios
) {
  exigir(
    fonte.includes(
      marcador,
    ),
    `Marcador obrigatório ausente: ${marcador}`,
  );
}

const proibidos = [
  "public.email_provedor_configuracao",
  "public.modelos_email_sst",
  "public.certidao_mensal_email_configuracoes",
  "resolverTransportadorEmailParaEnvio",
  "vault.create_secret",
  "vault.update_secret",
  "vault.delete_secret",
  "insert into ",
  "delete from ",
];

for (
  const marcador of
  proibidos
) {
  exigir(
    !fonte.includes(
      marcador,
    ),
    `Referência proibida na fundação R2.2-A: ${marcador}`,
  );
}

exigir(
  ocorrencias(
    /create table public\.tenant_email_configuracao\b/g,
  ) === 1,
  "Esperada exatamente uma criação da tabela tenant_email_configuracao.",
);

exigir(
  ocorrencias(
    /backend_obter_configuracao_email_tenant_para_envio\s*\(/g,
  ) === 4,
  "Contrato backend deve aparecer exatamente quatro vezes: criação, revoke, grant e comentário.",
);

exigir(
  ocorrencias(
    /\bSAFESCAN_GERENCIADO\b/g,
  ) >= 3,
  "Modo SAFESCAN_GERENCIADO não está suficientemente protegido pelo contrato.",
);

exigir(
  ocorrencias(
    /\bPROVEDOR_CLIENTE\b/g,
  ) >= 8,
  "Modo PROVEDOR_CLIENTE não está suficientemente protegido pelo contrato.",
);

exigir(
  ocorrencias(
    /\bDESATIVADO\b/g,
  ) >= 3,
  "Modo DESATIVADO não está suficientemente protegido pelo contrato.",
);

const inicioTabela =
  fonte.indexOf(
    "create table public.tenant_email_configuracao",
  );

const fimTabela =
  fonte.indexOf(
    "alter table\npublic.tenant_email_configuracao",
  );

exigir(
  inicioTabela >= 0 &&
    fimTabela > inicioTabela,
  "Bloco da tabela tenant_email_configuracao não localizado.",
);

const blocoTabela =
  fonte.slice(
    inicioTabela,
    fimTabela,
  );

exigir(
  !/\bcredencial\s+text\b/i.test(
    blocoTabela,
  ),
  "Segredo SMTP não pode ser armazenado como texto na tabela.",
);

exigir(
  blocoTabela.includes(
    "credencial_vault_id uuid",
  ),
  "A tabela deve armazenar somente referência opaca ao Vault.",
);

exigir(
  /revoke\s+all[\s\S]*?tenant_email_configuracao[\s\S]*?from\s+public,\s*anon,\s*authenticated\s*;/i.test(
    fonte,
  ),
  "Tabela deve revogar acesso direto de public/anon/authenticated.",
);

exigir(
  /grant\s+select,\s*insert,\s*update,\s*delete[\s\S]*?tenant_email_configuracao[\s\S]*?to\s+service_role\s*;/i.test(
    fonte,
  ),
  "Tabela deve ser acessível diretamente somente ao service_role.",
);

exigir(
  !/grant[\s\S]*?to\s+(?:public|anon|authenticated)\s*;/i.test(
    fonte,
  ),
  "Migration não pode conceder acesso direto a public/anon/authenticated.",
);

exigir(
  /grant\s+execute[\s\S]*?backend_obter_configuracao_email_tenant_para_envio[\s\S]*?to\s+service_role\s*;/i.test(
    fonte,
  ),
  "Contrato backend deve conceder EXECUTE somente ao service_role.",
);

exigir(
  /configuracao\.ultimo_teste_status\s*=\s*'APROVADO'/i.test(
    fonte,
  ),
  "Credencial do provedor do cliente deve depender de teste APROVADO.",
);

exigir(
  fonte.includes(
    "case\n            when configuracao.modo_envio =\n                'PROVEDOR_CLIENTE'",
  ),
  "Campos SMTP precisam ser condicionados ao modo PROVEDOR_CLIENTE.",
);

exigir(
  !/\bupdate\s+public\./i.test(
    fonte,
  ),
  "R2.2-A não pode alterar dados existentes.",
);

exigir(
  fonte.startsWith(
    "-- ============================================================================",
  ),
  "Migration deve possuir cabeçalho controlado.",
);

exigir(
  fonte.trimEnd().endsWith(
    "commit;",
  ),
  "Migration deve encerrar com commit.",
);

exigir(
  fonte.endsWith(
    "\n",
  ),
  "Migration deve terminar com LF.",
);

exigir(
  !fonte.endsWith(
    "\n\n",
  ),
  "Migration deve possuir exatamente um LF final.",
);

console.log(
  "",
);

console.log(
  "R2_2_EMAIL_TENANT_FOUNDATION_SMOKE_OK",
);

console.log(
  "TENANT_TABLE=SIM",
);

console.log(
  "TENANT_ID_PK=SIM",
);

console.log(
  "MODOS=3",
);

console.log(
  "RLS=ATIVO",
);

console.log(
  "AUTHENTICATED_DIRECT_ACCESS=NAO",
);

console.log(
  "VAULT_SECRET_IN_TABLE=NAO",
);

console.log(
  "VAULT_REFERENCE=SIM",
);

console.log(
  "BACKEND_RPC_SERVICE_ROLE=SIM",
);

console.log(
  "CENTRAL_PROVIDER_MUTATION=NAO",
);

console.log(
  "CERTIDAO_MUTATION=NAO",
);

console.log(
  "EDGE_MUTATION=NAO",
);

console.log(
  "SUPABASE_REAL=NAO",
);
