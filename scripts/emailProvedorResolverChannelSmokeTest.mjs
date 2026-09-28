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

function trechoEntre(
  fonte,
  inicio,
  fim,
) {
  const posInicio =
    fonte.indexOf(
      inicio,
    );

  const posFim =
    fonte.indexOf(
      fim,
      posInicio + inicio.length,
    );

  assert.ok(
    posInicio >= 0,
    `Início não localizado: ${inicio}`,
  );

  assert.ok(
    posFim > posInicio,
    `Fim não localizado após ${inicio}: ${fim}`,
  );

  return fonte.slice(
    posInicio,
    posFim,
  );
}

const resolver =
  ler(
    "supabase/functions/_shared/emailProvedorResolver.ts",
  );

const primeiroAcesso =
  ler(
    "supabase/functions/admin-primeiro-acesso-cliente/index.ts",
  );

const acessoUsuario =
  ler(
    "supabase/functions/enviar-email-acesso-usuario/index.ts",
  );

const certidaoTypes =
  ler(
    "supabase/functions/enviar-certidao-mensal-documental/types.ts",
  );

const certidaoDados =
  ler(
    "supabase/functions/enviar-certidao-mensal-documental/dados.ts",
  );

const certidaoEmail =
  ler(
    "supabase/functions/enviar-certidao-mensal-documental/email.ts",
  );

const certidaoIndex =
  ler(
    "supabase/functions/enviar-certidao-mensal-documental/index.ts",
  );

assert.match(
  resolver,
  /export type CanalEmail[\s\S]*?"PLATAFORMA"[\s\S]*?"TENANT"/,
  "Resolver deve declarar canais PLATAFORMA e TENANT.",
);

assert.match(
  resolver,
  /export type ModoEnvioTenant[\s\S]*?"SAFESCAN_GERENCIADO"[\s\S]*?"PROVEDOR_CLIENTE"[\s\S]*?"DESATIVADO"/,
  "Resolver deve conhecer os três modos operacionais do tenant.",
);

assert.match(
  resolver,
  /backend_obter_configuracao_email_tenant_para_envio/,
  "Canal TENANT deve consultar contrato backend tenant-scoped.",
);

const tenantCliente =
  trechoEntre(
    resolver,
    "async function resolverTransportadorTenantCliente",
    "async function resolverTransportadorTenant(",
  );

assert.match(
  tenantCliente,
  /"TENANT_CLIENTE"/,
  "Provedor próprio deve ser marcado como TENANT_CLIENTE.",
);

assert.doesNotMatch(
  tenantCliente,
  /resolverTransportadorPlataforma/,
  "Provedor próprio não pode fazer fallback para plataforma.",
);

assert.doesNotMatch(
  tenantCliente,
  /CENTRAL|LEGADO_GMAIL|GMAIL_USER|GMAIL_APP_PASSWORD|Deno\.env/,
  "Provedor próprio não pode acessar provedor central nem secrets legados.",
);

const tenantDispatcher =
  trechoEntre(
    resolver,
    "async function resolverTransportadorTenant(",
    "export async function resolverTransportadorEmailParaEnvio",
  );

assert.match(
  tenantDispatcher,
  /"DESATIVADO"[\s\S]*?PROVEDOR_NAO_CONFIGURADO/,
  "Modo DESATIVADO deve bloquear o envio.",
);

assert.match(
  tenantDispatcher,
  /"SAFESCAN_GERENCIADO"[\s\S]*?resolverTransportadorPlataforma/,
  "SAFESCAN_GERENCIADO deve usar deliberadamente o canal da plataforma.",
);

assert.match(
  tenantDispatcher,
  /resolverTransportadorTenantCliente/,
  "PROVEDOR_CLIENTE deve seguir para transportador próprio do tenant.",
);

assert.match(
  resolver,
  /opcoes\.canal\s*\?\?\s*"PLATAFORMA"/,
  "Compatibilidade legada deve permanecer com default PLATAFORMA.",
);

assert.equal(
  (
    primeiroAcesso.match(
      /canal:\s*"PLATAFORMA"/g,
    ) || []
  ).length,
  1,
  "Primeiro acesso deve declarar PLATAFORMA exatamente uma vez.",
);

assert.equal(
  (
    acessoUsuario.match(
      /"PLATAFORMA"/g,
    ) || []
  ).length,
  1,
  "Acesso de usuário deve declarar PLATAFORMA exatamente uma vez.",
);

assert.equal(
  (
    certidaoEmail.match(
      /canal:\s*"TENANT"/g,
    ) || []
  ).length,
  1,
  "Certidão deve declarar TENANT exatamente uma vez.",
);

assert.match(
  certidaoEmail,
  /canal:\s*"TENANT",\s*\n\s*tenantId,/s,
  "Certidão deve passar tenantId junto com o canal TENANT.",
);

assert.match(
  certidaoTypes,
  /tenantId:\s*string;/,
  "Contexto da Certidão deve tipar tenantId.",
);

assert.match(
  certidaoDados,
  /tenant_id/,
  "Dados da Certidão devem consultar tenant_id da empresa.",
);

assert.match(
  certidaoDados,
  /const tenantId\s*=/,
  "Dados da Certidão devem normalizar tenantId.",
);

assert.match(
  certidaoIndex,
  /contexto\.tenantId/,
  "Orquestrador da Certidão deve propagar tenantId.",
);

assert.doesNotMatch(
  primeiroAcesso,
  /canal:\s*"TENANT"/,
  "Primeiro acesso não pode usar canal TENANT.",
);

assert.doesNotMatch(
  acessoUsuario,
  /canal:\s*"TENANT"/,
  "Acesso de usuário não pode usar canal TENANT.",
);

console.log(
  "",
);

console.log(
  "EMAIL_PROVIDER_R22B_CHANNEL_SMOKE_OK",
);

console.log(
  "PLATAFORMA_FIRST_ACCESS=SIM",
);

console.log(
  "PLATAFORMA_USER_ACCESS=SIM",
);

console.log(
  "CERTIDAO_TENANT=SIM",
);

console.log(
  "TENANT_ID_FROM_EMPRESA=SIM",
);

console.log(
  "SAFESCAN_GERENCIADO_CENTRAL=SIM",
);

console.log(
  "PROVEDOR_CLIENTE_FALLBACK_CENTRAL=NAO",
);

console.log(
  "DESATIVADO_BLOQUEIA=SIM",
);

console.log(
  "SUPABASE_REAL=NAO",
);

console.log(
  "EMAIL_REAL=NAO",
);
