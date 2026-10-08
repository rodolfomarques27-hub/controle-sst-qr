import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";

const migration =
  readFileSync(
    new URL(
      "../supabase/migrations/20260925163000_r22_email_tenant_admin_contracts.sql",
      import.meta.url,
    ),
    "utf8",
  ).replace(/\r\n?/g, "\n");

const edge =
  readFileSync(
    new URL(
      "../supabase/functions/admin-gerenciar-provedor-email-tenant/index.ts",
      import.meta.url,
    ),
    "utf8",
  );

function ocorrencias(
  fonte,
  regex,
) {
  return (
    fonte.match(
      regex,
    ) || []
  ).length;
}

function blocoFuncaoSql(
  nome,
) {
  const inicio =
    migration.indexOf(
      `create or replace function\npublic.${nome}`,
    );

  assert.ok(
    inicio >= 0,
    `Função SQL não localizada: ${nome}`,
  );

  const fim =
    migration.indexOf(
      "\n$function$;",
      inicio,
    );

  assert.ok(
    fim > inicio,
    `Fim da função SQL não localizado: ${nome}`,
  );

  return migration.slice(
    inicio,
    fim + 12,
  );
}

assert.ok(
  migration.includes(
    "tenant_email_configuracao_teste_modo_check",
  ),
  "Contrato de teste da fundação tenant deve ser evoluído explicitamente.",
);

assert.match(
  migration,
  /provedor\s+is\s+null[\s\S]*?ultimo_teste_status\s*=\s*'NAO_APLICAVEL'[\s\S]*?provedor\s+is\s+not\s+null[\s\S]*?'NAO_TESTADO'[\s\S]*?'APROVADO'[\s\S]*?'REPROVADO'/i,
  "Status de teste deve representar a configuração SMTP própria sem seleção automática de modo.",
);

const leituraSegura =
  blocoFuncaoSql(
    "admin_obter_configuracao_email_tenant",
  );

assert.match(
  leituraSegura,
  /usuario_pode_gerenciar_tenant\s*\(\s*p_tenant_id\s*\)/i,
  "Leitura segura deve ser tenant-scoped.",
);

assert.ok(
  !leituraSegura.includes(
    "decrypted_secret",
  ),
  "Leitura segura nunca pode descriptografar a credencial.",
);

assert.ok(
  !/credencial_vault_id\s+(?:uuid|text)/i.test(
    leituraSegura,
  ),
  "Leitura segura não pode retornar Vault ID.",
);

assert.match(
  leituraSegura,
  /credencial_configurada\s+boolean/i,
  "Leitura segura deve retornar somente o estado da credencial.",
);

assert.match(
  leituraSegura,
  /safescan_gerenciado_disponivel\s+boolean/i,
  "Leitura segura deve informar somente a disponibilidade do modo gerenciado.",
);

for (
  const nome of [
    "backend_salvar_configuracao_email_tenant",
    "backend_obter_configuracao_email_tenant_para_teste",
    "backend_registrar_teste_email_tenant",
    "backend_definir_modo_email_tenant",
  ]
) {
  const bloco =
    blocoFuncaoSql(
      nome,
    );

  assert.ok(
    bloco.length >
      100,
    `Contrato backend vazio: ${nome}`,
  );

  const grantRegex =
    new RegExp(
      `grant\\s+execute[\\s\\S]*?${nome.replaceAll("_", "\\_")}[\\s\\S]*?to\\s+service_role`,
      "i",
    );

  assert.match(
    migration,
    grantRegex,
    `Contrato ${nome} deve ser exclusivo do service_role.`,
  );
}

assert.match(
  migration,
  /vault\.create_secret\s*\(/i,
  "Salvar tenant deve criar secret no Vault somente no backend.",
);

assert.match(
  migration,
  /vault\.update_secret\s*\(/i,
  "Salvar tenant deve rotacionar secret no Vault somente no backend.",
);

assert.match(
  migration,
  /backend_salvar_configuracao_email_tenant[\s\S]*?modo_envio[\s\S]*?'DESATIVADO'/i,
  "Primeiro rascunho SMTP deve nascer fail-closed.",
);

assert.match(
  migration,
  /v_modo\s*=\s*'PROVEDOR_CLIENTE'[\s\S]*?ultimo_teste_status\s*<>\s*'APROVADO'/i,
  "PROVEDOR_CLIENTE deve exigir teste aprovado.",
);

assert.match(
  migration,
  /PROVEDOR_CLIENTE exige configuração própria completa, credencial válida e teste aprovado/i,
  "Gate de PROVEDOR_CLIENTE deve existir server-side.",
);

assert.match(
  migration,
  /v_modo\s*=\s*'SAFESCAN_GERENCIADO'[\s\S]*?email_provedor_configuracao[\s\S]*?ativo\s*=\s*true[\s\S]*?ultimo_teste_status\s*=\s*'APROVADO'/i,
  "SAFESCAN_GERENCIADO deve validar o provedor central ativo e aprovado.",
);

assert.match(
  migration,
  /safescanbrasil\[\.\]com\[\.\]br/i,
  "SAFESCAN_GERENCIADO deve exigir remetente institucional SafeScan.",
);

assert.match(
  migration,
  /vault\.secrets[\s\S]*?credencial_vault_id/i,
  "SAFESCAN_GERENCIADO deve exigir credencial central existente.",
);

assert.doesNotMatch(
  migration,
  /\binsert\s+into\s+public\.email_provedor_configuracao\b/i,
  "D1 não pode inserir no provedor central.",
);

assert.doesNotMatch(
  migration,
  /\bupdate\s+public\.email_provedor_configuracao\b/i,
  "D1 não pode alterar o provedor central.",
);

assert.doesNotMatch(
  migration,
  /\bdelete\s+from\s+public\.email_provedor_configuracao\b/i,
  "D1 não pode excluir o provedor central.",
);

assert.match(
  edge,
  /"obter"[\s\S]*?"salvar"[\s\S]*?"testar"[\s\S]*?"definir_modo"/,
  "Catálogo de ações da Edge tenant está incompleto.",
);

assert.match(
  edge,
  /const\s+ACOES_TECNICAS[\s\S]*?"salvar"[\s\S]*?"testar"[\s\S]*?"definir_modo"/,
  "Ações técnicas devem possuir gate administrativo próprio.",
);

assert.match(
  edge,
  /"usuario_pode_gerenciar_tenant"/,
  "Operações técnicas devem consultar a autorização administrativa do tenant.",
);

assert.match(
  edge,
  /p_tenant_id:\s*tenantId/,
  "A autorização deve receber o tenant explícito.",
);

const inicioGateTenant = edge.indexOf(
  "ACOES_TECNICAS.has(",
);

const fimGateTenant = edge.indexOf(
  "return await acaoSalvar(",
  inicioGateTenant,
);

assert.ok(
  inicioGateTenant >= 0 &&
    fimGateTenant > inicioGateTenant,
  "O gate tenant-scoped deve anteceder o salvamento.",
);

const blocoGateTenant = edge.slice(
  inicioGateTenant,
  fimGateTenant,
);

const marcadoresGateTenant = [
  "ACOES_TECNICAS.has(",
  "podeGerenciarTenant(",
  "userClient,",
  "tenantId,",
  "!permitido",
  "throw new ErroHttp(",
  "403,",
  '"PERMISSAO_NEGADA"',
];

let posicaoGateTenant = 0;

for (const marcador of marcadoresGateTenant) {
  const posicaoMarcador = blocoGateTenant.indexOf(
    marcador,
    posicaoGateTenant,
  );

  assert.ok(
    posicaoMarcador >= 0,
    "Gate tenant-scoped incompleto: " + marcador,
  );

  posicaoGateTenant = posicaoMarcador + marcador.length;
}

assert.doesNotMatch(
  edge,
  /Operação técnica de SMTP restrita à Conta Mestre SafeScan/,
  "A exclusividade anterior da Conta Mestre não pode permanecer.",
);

const inicioR11A3 =
  edge.indexOf(
    "async function acaoDefinirModo(",
  );

const restoR11A3 =
  edge.slice(
    Math.max(0, inicioR11A3),
  );

const fimRelativoR11A3 =
  restoR11A3.search(
    /\r?\nDeno\.serve\(/,
  );

assert.ok(
  inicioR11A3 >= 0 &&
    fimRelativoR11A3 > 0,
  "R11-A3: função definir_modo deve estar localizada.",
);

const blocoR11A3 =
  restoR11A3.slice(
    0,
    fimRelativoR11A3,
  );

assert.match(
  blocoR11A3,
  /modoEnvio\s*!==\s*"PROVEDOR_CLIENTE"[\s\S]*?await userClient\.rpc\(\s*"usuario_admin_global"/,
  "R11-A3: modos alternativos exigem autorização global.",
);

assert.match(
  blocoR11A3,
  /!erroAdminGlobal[\s\S]*?adminGlobal === true[\s\S]*?Array\.isArray\(adminGlobal\)[\s\S]*?adminGlobal\[0\] === true/,
  "R11-A3: erro de RPC deve negar acesso.",
);

assert.match(
  blocoR11A3,
  /if\s*\(\s*!permitido\s*\)[\s\S]*?403,[\s\S]*?"PERMISSAO_NEGADA"[\s\S]*?backend_definir_modo_email_tenant/,
  "R11-A3: acesso negado deve bloquear escrita de modo.",
);

assert.match(
  edge,
  /ACOES_TECNICAS\.has\([\s\S]*?podeGerenciarTenant\([\s\S]*?tenantId/,
  "R11-A3: gate administrativo do tenant deve ser preservado.",
);

console.log(
  "R11A3_MASTER_ONLY_MODES=GREEN",
);

assert.match(
  edge,
  /tenantIdObrigatorio/,
  "tenant_id explícito deve ser obrigatório.",
);

assert.match(
  edge,
  /admin_obter_configuracao_email_tenant/,
  "Edge deve usar somente leitura segura para respostas.",
);

assert.match(
  edge,
  /backend_salvar_configuracao_email_tenant/,
  "Edge deve usar backend tenant para salvar.",
);

assert.match(
  edge,
  /backend_obter_configuracao_email_tenant_para_teste/,
  "Edge deve usar backend privado para teste.",
);

assert.match(
  edge,
  /backend_registrar_teste_email_tenant/,
  "Edge deve registrar teste tenant com controle de versão.",
);

assert.match(
  edge,
  /backend_definir_modo_email_tenant/,
  "Edge deve alterar modo somente por contrato explícito.",
);

assert.match(
  edge,
  /normalizarConfiguracaoSmtpPrivada\s*\([\s\S]*?configuracaoData,[\s\S]*?"TENANT_CLIENTE"/,
  "Teste SMTP deve usar origem TENANT_CLIENTE.",
);

assert.equal(
  ocorrencias(
    edge,
    /\.verify\s*\(\s*\)/g,
  ),
  1,
  "Teste SMTP tenant deve executar exatamente um verify().",
);

assert.equal(
  ocorrencias(
    edge,
    /\.sendMail\s*\(/g,
  ),
  0,
  "Teste administrativo nunca pode enviar e-mail real.",
);

assert.equal(
  ocorrencias(
    edge,
    /\bcreateTransport\s*\(/g,
  ),
  0,
  "Edge tenant não pode criar transportador diretamente fora do shared helper.",
);

assert.equal(
  ocorrencias(
    edge,
    /GMAIL_USER/g,
  ),
  0,
  "Edge tenant não pode acessar secret legado GMAIL_USER.",
);

assert.equal(
  ocorrencias(
    edge,
    /GMAIL_APP_PASSWORD/g,
  ),
  0,
  "Edge tenant não pode acessar secret legado GMAIL_APP_PASSWORD.",
);

assert.equal(
  ocorrencias(
    edge,
    /resolverTransportadorEmailParaEnvio/g,
  ),
  0,
  "Edge administrativa tenant não pode usar resolver operacional com fallback.",
);

assert.match(
  edge,
  /SUPABASE_SERVICE_ROLE_KEY/,
  "Edge deve manter escrita técnica atrás do service_role.",
);

assert.match(
  edge,
  /credencialOpcional/,
  "Credencial tenant deve possuir caminho write-only explícito.",
);

assert.ok(
  !edge.includes(
    "credencial_vault_id",
  ),
  "Edge nunca pode trafegar Vault ID.",
);

assert.ok(
  !edge.includes(
    "decrypted_secret",
  ),
  "Edge nunca pode referenciar diretamente secret descriptografado.",
);

assert.ok(
  migration.trimEnd().endsWith(
    "commit;",
  ),
  "Migration D1 deve encerrar com commit.",
);

assert.ok(
  migration.endsWith(
    "\n",
  ),
  "Migration D1 deve terminar com LF.",
);

assert.ok(
  edge.endsWith(
    "\n",
  ),
  "Edge D1 deve terminar com LF.",
);

console.log(
  "",
);

console.log(
  "R2_2_D1_EMAIL_TENANT_ADMIN_SMOKE_OK",
);

console.log(
  "TENANT_ID_EXPLICITO=SIM",
);

console.log(
  "LEITURA_TENANT_SEGURA=SIM",
);

console.log(
  "SECRET_FRONTEND=NAO",
);

console.log(
  "VAULT_ID_FRONTEND=NAO",
);

console.log(
  "TECNICO_GLOBAL_OU_ADMIN_TENANT=SIM",
);

console.log(
  "PROVEDOR_CLIENTE_FAIL_CLOSED=SIM",
);

console.log(
  "PROVEDOR_CLIENTE_TESTE_APROVADO=OBRIGATORIO",
);

console.log(
  "SAFESCAN_GERENCIADO_DOMINIO_INSTITUCIONAL=OBRIGATORIO",
);

console.log(
  "SMTP_VERIFY=1",
);

console.log(
  "SMTP_SENDMAIL=0",
);

console.log(
  "LEGACY_GMAIL_FALLBACK=NAO",
);

console.log(
  "SUPABASE_REAL=NAO",
);

console.log(
  "VAULT_REAL=NAO",
);

console.log(
  "SMTP_REAL=NAO",
);
