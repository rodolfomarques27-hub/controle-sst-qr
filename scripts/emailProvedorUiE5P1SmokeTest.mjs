import fs from "node:fs";
import crypto from "node:crypto";

const configPath =
    "src/components/configuracoes/ConfiguracoesSistema.jsx";

const componentPath =
    "src/components/configuracoes/ProvedorEmailConfiguracoes.jsx";

const servicePath =
    "src/services/emailProvedorConfiguracaoService.js";

const adminPath =
    "supabase/functions/admin-gerenciar-provedor-email/index.ts";

const sharedPath =
    "supabase/functions/_shared/emailProvedorResolver.ts";

const migrationPath =
    "supabase/migrations/20260907213932_20260907193000_email_provedor_configuracao_segura.sql";

const config =
    fs.readFileSync(
        configPath,
        "utf8",
    );

const component =
    fs.readFileSync(
        componentPath,
        "utf8",
    );

const service =
    fs.readFileSync(
        servicePath,
        "utf8",
    );

function fail(message) {
    throw new Error(
        `EMAIL_PROVIDER_UI_SMOKE_FAIL: ${message}`,
    );
}

function assert(condition, message) {
    if (!condition) {
        fail(message);
    }
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

function countAction(text, action) {
    const escaped =
        action.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&",
        );

    return (
        text.match(
            new RegExp(
                `acao\\s*:\\s*"${escaped}"`,
                "g",
            ),
        ) || []
    ).length;
}

/*
 * Backend congelado.
 */
assert(
    hash(adminPath) ===
        "B96BD04E691F3EC909B72994D79442A06FB8A7F0AF8BD26450C71346A3D0D758",
    "Edge administrativa mudou",
);

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

/*
 * Service P1A congelado.
 */
assert(
    hash(servicePath) ===
        "6957618B89208A4F5C77ED2E5F85B68CA22B1D9D5D53AA542CC90076ADE19E4B",
    "service P1A mudou durante P1B",
);

/*
 * Integração da seção.
 */
for (
    const trecho of [
        'import { ProvedorEmailConfiguracoes } from "./ProvedorEmailConfiguracoes";',
        '"config-provedor-email"',
        'case "config-provedor-email":',
        "<ProvedorEmailConfiguracoes",
    ]
) {
    assert(
        config.includes(trecho),
        `integração ausente: ${trecho}`,
    );
}

/*
 * Operações seguem congeladas.
 */
assert(
    component.includes(
        "OPERACOES_MUTACAO_LIBERADAS =\n    false",
    ),
    "gate remoto não está false",
);

for (
    const action of [
        "salvar",
        "testar",
        "ativar",
        "desativar",
    ]
) {
    assert(
        countAction(
            component,
            action,
        ) === 0,
        `ação remota entrou no componente: ${action}`,
    );
}

for (
    const serviceName of [
        "salvarConfiguracaoProvedorEmailService",
        "testarConfiguracaoProvedorEmailService",
        "ativarConfiguracaoProvedorEmailService",
        "desativarConfiguracaoProvedorEmailService",
    ]
) {
    assert(
        !component.includes(
            serviceName,
        ),
        `service administrativo conectado ao componente: ${serviceName}`,
    );
}

/*
 * Formulário local.
 */
for (
    const trecho of [
        "criarFormularioProvedorEmail",
        "alterarCampoFormulario",
        "Rascunho local",
        "Rascunho alterado",
        "formulario.provedor",
        "formulario.modoSeguranca",
        "formulario.host",
        "formulario.porta",
        "formulario.usuarioSmtp",
        "formulario.remetenteEmail",
        "formulario.remetenteNomePadrao",
        "formulario.responderParaPadrao",
        "Nada foi salvo no provedor, no banco ou no Vault.",
    ]
) {
    assert(
        component.includes(trecho),
        `contrato local ausente: ${trecho}`,
    );
}

/*
 * Provedores e segurança disponíveis.
 */
for (
    const value of [
        "GMAIL_SMTP",
        "MICROSOFT_365_SMTP",
        "SMTP_PERSONALIZADO",
        "TLS_IMPLICITO",
        "STARTTLS",
    ]
) {
    assert(
        component.includes(value),
        `opção ausente: ${value}`,
    );
}

/*
 * Credencial continua fora da UI.
 */
for (
    const forbidden of [
        'type="password"',
        "credencialNova",
        "appPassword",
        "GMAIL_APP_PASSWORD",
        "GMAIL_USER",
        "localStorage",
        "sessionStorage",
        "VITE_",
    ]
) {
    assert(
        !component.includes(forbidden),
        `padrão proibido no componente: ${forbidden}`,
    );
}

/*
 * O service possui os cinco contratos,
 * mas só obter está conectado no componente.
 */
for (
    const action of [
        "obter",
        "salvar",
        "testar",
        "ativar",
        "desativar",
    ]
) {
    assert(
        countAction(
            service,
            action,
        ) === 1,
        `contrato ${action} alterado no service`,
    );
}

assert(
    component.includes(
        "obterConfiguracaoProvedorEmailService",
    ),
    "leitura segura deixou de estar conectada",
);

console.log(
    "EMAIL_PROVIDER_UI_E5P1_READONLY_SMOKE_OK",
);

console.log(
    "EMAIL_PROVIDER_UI_E5P1R1_SEMANTIC_SMOKE_OK",
);

console.log(
    "EMAIL_PROVIDER_UI_E5P1R2R1_VISUAL_REFINEMENT_SMOKE_OK",
);

console.log(
    "EMAIL_PROVIDER_UI_E5P2P1A_R1_SERVICE_CONTRACTS_SMOKE_OK",
);

/*
 * Guia colapsável P1C.
 */
for (
    const trecho of [
        "Como configurar o e-mail",
        "Abrir guia",
        "Fechar guia",
        "<details",
        "<summary",
        "Gmail SMTP",
        "smtp.gmail.com",
        "465 + TLS implícito",
        "587 + STARTTLS",
        "Microsoft 365 SMTP",
        "smtp.office365.com",
        "SMTP personalizado",
        "Ative somente depois de um teste aprovado.",
        "fluxo write-only",
    ]
) {
    assert(
        component.includes(trecho),
        `guia de configuração incompleto: ${trecho}`,
    );
}

/*
 * O guia não pode liberar ações.
 */
assert(
    component.includes(
        "OPERACOES_MUTACAO_LIBERADAS =\n    false",
    ),
    "guia alterou o gate remoto",
);

for (
    const serviceName of [
        "salvarConfiguracaoProvedorEmailService",
        "testarConfiguracaoProvedorEmailService",
        "ativarConfiguracaoProvedorEmailService",
        "desativarConfiguracaoProvedorEmailService",
    ]
) {
    assert(
        !component.includes(
            serviceName,
        ),
        `guia conectou operação administrativa: ${serviceName}`,
    );
}

/*
 * Nenhum segredo entrou no guia.
 */
for (
    const forbidden of [
        'type="password"',
        "credencialNova",
        "GMAIL_APP_PASSWORD",
        "GMAIL_USER",
        "localStorage",
        "sessionStorage",
        "VITE_",
    ]
) {
    assert(
        !component.includes(forbidden),
        `padrão proibido após P1C: ${forbidden}`,
    );
}

console.log(
    "EMAIL_PROVIDER_UI_E5P2P1B_LOCAL_FORM_SMOKE_OK",
);

console.log(
    "EMAIL_PROVIDER_UI_E5P2P1C_COLLAPSIBLE_GUIDE_SMOKE_OK",
);