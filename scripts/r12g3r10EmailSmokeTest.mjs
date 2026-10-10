import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
    mensagemFalhaEmailTenant,
    mensagemErroEdgeEmailTenant,
    mensagemTesteEmailTenant,
} from "../src/features/tenant-admin/services/tenantAdminEmailMensagens.js";

for (const [status, codigo, trecho] of [
    [400, "CONFIGURACAO_INVALIDA", "Revise"],
    [401, "PERMISSAO_NEGADA", "sessão"],
    [403, "PERMISSAO_NEGADA", "permissão"],
    [409, "CONFLITO_VERSAO", "alterada"],
    [500, "ERRO_INTERNO", "concluir"],
    [504, "", "demorou"],
]) {
    const erro = {
        context: {
            status,
            async json() {
                return {
                    codigo,
                    segredo: "SEGREDO_TESTE_NAO_EXIBIR",
                };
            },
        },
    };

    const mensagem = await mensagemErroEdgeEmailTenant(erro);

    assert.ok(
        mensagem.includes(trecho),
        `Código HTTP ${status} não traduzido.`,
    );

    assert.doesNotMatch(
        mensagem,
        /SEGREDO_TESTE_NAO_EXIBIR|non-2xx|FunctionsHttpError|stack|vault/i,
    );
}

assert.match(
    await mensagemErroEdgeEmailTenant({ context: null }),
    /conectar/,
);

assert.match(
    await mensagemErroEdgeEmailTenant({
        context: {
            status: 500,
            async json() {
                throw Error("segredo");
            },
        },
    }),
    /concluir/,
);

assert.match(
    mensagemFalhaEmailTenant(null, "PROVEDOR_NAO_CONFIGURADO"),
    /credencial SMTP/,
);

for (const [codigo, trecho] of [
    ["SMTP_AUTENTICACAO_FALHOU", "credencial"],
    ["SMTP_TIMEOUT", "demorou"],
    ["SMTP_CONEXAO_FALHOU", "conectar"],
    ["SMTP_TLS_FALHOU", "segura"],
    ["SMTP_TESTE_FALHOU", "validar"],
]) {
    assert.match(
        mensagemTesteEmailTenant(codigo),
        new RegExp(trecho),
    );
}

const migration = readFileSync(
    "supabase/migrations/20261008163525_r12g3r10_email_usuario_membership.sql",
    "utf8",
).replace(/\r\n?/g, "\n");

assert.match(
    migration,
    /create or replace function private\.usuario_email_usuario_elegivel\(/i,
);
assert.match(
    migration,
    /security definer[\s\S]*set search_path to 'pg_catalog'/i,
);
assert.match(migration, /membership\.tenant_id = p_tenant_id/);
assert.match(migration, /membership\.user_id = p_user_id/);
assert.match(migration, /membership\.status = 'ativo'/);
assert.match(migration, /tenant\.status = 'ativo'/);
assert.match(
    migration,
    /revoke all[\s\S]*from public, anon, authenticated, service_role/i,
);
assert.doesNotMatch(
    migration,
    /usuarios_permissoes_sistema|credencial_vault_id|vault\.secrets|\bupdate\b|\bdelete\b|\binsert\b/i,
);

const contratos = readFileSync(
    "supabase/migrations/20261007235930_auditoria_hotfix_email_usuario_contratos.sql",
    "utf8",
);

assert.match(contratos, /v_user_id\s*:=\s*auth\.uid\(\)/);

const service = readFileSync(
    "src/features/tenant-admin/services/tenantAdminEmailProviderService.js",
    "utf8",
);

const panel = readFileSync(
    "src/features/tenant-admin/components/TenantAdminEmailProviderPanel.jsx",
    "utf8",
);

assert.match(service, /await mensagemErroEdgeEmailTenant\(error\)/);
assert.match(service, /mensagemFalhaEmailTenant\(null, data\?\.codigo\)/);
assert.doesNotMatch(service, /error\?\.message/);

assert.match(
    panel,
    /mensagemTesteEmailTenant\(\s*resultado\.teste\?\.codigo/,
);

assert.match(panel, /ocultarModosAlternativos = false/);
assert.match(panel, /!ocultarModosAlternativos/);

console.log("R12G3R10_MESSAGES=GREEN");
console.log("R12G3R10_MEMBERSHIP_CONTRACT=GREEN");
console.log("R12G3R10_R9_VISUAL_PRESERVED=GREEN");
console.log("HTTP_TESTADOS=400,401,403,409,500,504,SEM_REDE");
console.log("SMTP_TESTADOS=AUTENTICACAO,TIMEOUT,CONEXAO,TLS,GENERICO");
console.log("REDE_REAL=NO");
console.log("EMAIL_REAL_ENVIADO=NO");
