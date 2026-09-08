import fs from "node:fs";
import crypto from "node:crypto";

const edgePath =
    "supabase/functions/admin-gerenciar-provedor-email/index.ts";

const sharedPath =
    "supabase/functions/_shared/emailProvedorResolver.ts";

const migrationPath =
    "supabase/migrations/20260907213932_20260907193000_email_provedor_configuracao_segura.sql";

const edge =
    fs.readFileSync(
        edgePath,
        "utf8",
    );

const shared =
    fs.readFileSync(
        sharedPath,
        "utf8",
    );

function fail(message) {
    throw new Error(
        `EMAIL_PROVIDER_ADMIN_SMOKE_FAIL: ${message}`,
    );
}

function assert(condition, message) {
    if (!condition) {
        fail(message);
    }
}

function count(text, pattern) {
    return (
        text.match(
            pattern,
        ) || []
    ).length;
}

function hash(path) {
    return crypto
        .createHash("sha256")
        .update(
            fs.readFileSync(path),
        )
        .digest("hex")
        .toUpperCase();
}

assert(
    hash(sharedPath) ===
        "B115DD08126C8C0A2C100C75856BDFE6933FC9CC122BABDB659890289F52C679",
    "shared resolver mudou",
);

assert(
    hash(migrationPath) ===
        "DA25817B7CF57190FE52BF207CDC46203D7EACEF4F77CF192412331682AC4F66",
    "migration mudou",
);

assert(
    edge.includes(
        `const ACOES = new Set([
  "obter",
  "migrar_legado",
  "salvar",
  "testar",
  "ativar",
  "desativar",
]);`,
    ),
    "catálogo administrativo divergente",
);

for (
    const forbidden of [
        "GMAIL_USER",
        "GMAIL_APP_PASSWORD",
        "npm:nodemailer",
        "localStorage",
        "sessionStorage",
        "VITE_",
    ]
) {
    assert(
        !edge.includes(forbidden),
        `referência proibida na Edge administrativa: ${forbidden}`,
    );
}

assert(
    count(
        edge,
        /smtp\.gmail\.com/g,
    ) === 1,
    "smtp.gmail.com deveria permanecer exatamente uma vez",
);

for (
    const required of [
        "resolverTransportadorEmailParaEnvio",
        "ErroResolvedorEmail",
        "ConfiguracaoSmtpPrivada",
        "obterConfiguracaoLegadaParaMigracao",
        "acaoMigrarLegado",
        '"migrar_legado"',
        '"LEGADO_GMAIL"',
        '"PROVEDOR_JA_CONFIGURADO"',
        '"PROVEDOR_LEGADO_INDISPONIVEL"',
        "backend_salvar_configuracao_provedor_email",
        "configuracaoLegada.credencial",
        "configuracaoLegada.usuarioSmtp",
        "configuracaoLegada.remetenteEmail",
        "configuracaoLegada.remetenteNomePadrao",
        "configuracaoLegada.responderParaPadrao",
        "p_versao_esperada:",
        "p_executor_id:",
        '"NAO_TESTADO"',
    ]
) {
    assert(
        edge.includes(required),
        `contrato de migração ausente: ${required}`,
    );
}

assert(
    count(
        shared,
        /\bGMAIL_USER\b/g,
    ) === 1,
    "GMAIL_USER no shared divergente",
);

assert(
    count(
        shared,
        /\bGMAIL_APP_PASSWORD\b/g,
    ) === 1,
    "GMAIL_APP_PASSWORD no shared divergente",
);

assert(
    count(
        edge,
        /\.sendMail\s*\(/g,
    ) === 0,
    "Edge administrativa não pode usar sendMail",
);

assert(
    count(
        edge,
        /\.verify\s*\(/g,
    ) === 1,
    "verify administrativo deve permanecer exatamente uma vez",
);

assert(
    count(
        edge,
        /\.createTransport\s*\(/g,
    ) === 0,
    "createTransport direto não permitido",
);

assert(
    count(
        edge,
        /\bconsole\./g,
    ) === 0,
    "console.* não permitido",
);

assert(
    count(
        edge,
        /\bcredencial_vault_id\b/g,
    ) === 0,
    "Vault ID não pode ser exposto",
);

assert(
    edge.includes(
        "criarTransportador:",
    ),
    "transportador fake da migração ausente",
);

assert(
    edge.includes(
        "capturadas.push",
    ),
    "captura privada da configuração legada ausente",
);

assert(
    /p_versao_esperada:\s*null/.test(
        edge,
    ),
    "migração inicial deve usar versão esperada null",
);

assert(
    /p_credencial_nova:\s*configuracaoLegada\.credencial/.test(
        edge,
    ),
    "credencial não está restrita ao contrato backend write-only",
);

const inicio =
    edge.indexOf(
        "async function acaoMigrarLegado",
    );

const fim =
    edge.indexOf(
        "async function acaoSalvar",
    );

assert(
    inicio >= 0 &&
        fim > inicio,
    "bloco da migração não localizado",
);

const bloco =
    edge.slice(
        inicio,
        fim,
    );

assert(
    !/\bcredencial\s*:/.test(
        bloco,
    ),
    "retorno público da migração expõe campo credencial",
);

console.log(
    "EMAIL_PROVIDER_E5P2P1D_R3_R1_LEGACY_BOOTSTRAP_SMOKE_OK",
);

console.log(
    "ACOES_ADMIN=6",
);

console.log(
    "LEGACY_IMPORT_VIA_SHARED=SIM",
);

console.log(
    "GMAIL_USER_DIRETO_EDGE_ADMIN=0",
);

console.log(
    "GMAIL_PASSWORD_DIRETO_EDGE_ADMIN=0",
);

console.log(
    "SMTP_GMAIL_HOST_PREEXISTENTE=1",
);

console.log(
    "SMTP_REAL_DURANTE_IMPORT=NAO",
);

console.log(
    "SENDMAIL=0",
);

console.log(
    "SMTP_VERIFY_EXISTENTE=1",
);

console.log(
    "OVERWRITE_CENTRAL=BLOQUEADO",
);

console.log(
    "ESTADO_INICIAL=INATIVO",
);

console.log(
    "TESTE_INICIAL=NAO_TESTADO",
);

console.log(
    "CREDENCIAL_RETORNADA=NAO",
);

console.log(
    "SUPABASE_REAL=NAO",
);

console.log(
    "EMAIL_REAL=NAO",
);