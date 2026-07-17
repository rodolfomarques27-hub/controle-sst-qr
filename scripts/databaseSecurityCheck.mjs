import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const diretorioSql = join("supabase", "sql");
const arquivosSql = readdirSync(diretorioSql)
    .filter((arquivo) => arquivo.toLowerCase().endsWith(".sql"))
    .sort()
    .map((arquivo) => join(diretorioSql, arquivo));

const falhas = [];
let tabelasVerificadas = 0;
let propostasIgnoradas = 0;
let funcoesDefiner = 0;

const normalizar = (conteudo) =>
    conteudo
        .replace(/\/\*[\s\S]*?\*\//g, " ")
        .replace(/^\s*--.*$/gm, " ");

for (const arquivo of arquivosSql) {
    const original = readFileSync(arquivo, "utf8");
    const propostaNaoExecutavel = /PROPOSTA DE MIGRATION\. Nao executar automaticamente\./i.test(original);
    const sql = normalizar(original);

    if (/\bauth\.role\s*\(\s*\)/i.test(sql)) {
        falhas.push(`${arquivo}: use auth.uid()/JWT em vez de auth.role().`);
    }

    if (/\bgrant\s+all\b[\s\S]*?\bto\s+(?:anon|public)\b/i.test(sql)) {
        falhas.push(`${arquivo}: GRANT ALL para anon/public nao e permitido.`);
    }

    if (/\bgrant\s+(?:update|delete|truncate|references|trigger)\b[\s\S]*?\bto\s+(?:anon|public)\b/i.test(sql)) {
        falhas.push(`${arquivo}: permissao de escrita perigosa para anon/public.`);
    }

    const tabelasCriadas = [...sql.matchAll(/\bcreate\s+table\s+(?:if\s+not\s+exists\s+)?public\.([a-z0-9_]+)/gi)]
        .map((resultado) => resultado[1].toLowerCase());

    if (propostaNaoExecutavel && tabelasCriadas.length > 0) {
        propostasIgnoradas += tabelasCriadas.length;
    } else {
        for (const tabela of tabelasCriadas) {
            tabelasVerificadas += 1;
            const tabelaEscapada = tabela.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const habilitaRls = new RegExp(
                `\\balter\\s+table(?:\\s+if\\s+exists)?\\s+public\\.${tabelaEscapada}\\s+enable\\s+row\\s+level\\s+security\\b`,
                "i",
            );
            if (!habilitaRls.test(sql)) {
                falhas.push(`${arquivo}: a tabela public.${tabela} e criada sem habilitar RLS no mesmo roteiro.`);
            }
        }
    }

    funcoesDefiner += (sql.match(/\bsecurity\s+definer\b/gi) || []).length;
}

const roteiroVinculoLogin = readFileSync(
    join(diretorioSql, "roteiro_seguranca_restringir_vinculo_login_app.sql"),
    "utf8",
);
const edgeFunctionLogin = readFileSync(
    join("supabase", "functions", "admin-criar-login-app", "index.ts"),
    "utf8",
);

assert.match(
    roteiroVinculoLogin,
    /revoke\s+all\s+on\s+function\s+public\.admin_marcar_login_app_criado_sistema\([^;]+\)\s+from\s+authenticated/i,
    "A RPC de vinculo do login nao pode permanecer executavel diretamente por authenticated.",
);
assert.match(
    roteiroVinculoLogin,
    /grant\s+execute\s+on\s+function\s+public\.admin_marcar_login_app_criado_sistema\([^;]+\)\s+to\s+service_role/i,
    "A RPC de vinculo do login deve ser restrita ao service_role.",
);
assert.match(
    edgeFunctionLogin,
    /adminClient\.rpc\(\s*["']admin_marcar_login_app_criado_sistema["']/,
    "A Edge Function deve chamar a RPC de vinculo pelo cliente administrativo validado.",
);

assert.deepEqual(
    falhas,
    [],
    `Falhas na seguranca dos roteiros SQL:\n${falhas.map((falha) => `- ${falha}`).join("\n")}`,
);

console.log(
    `Banco aprovado: ${arquivosSql.length} roteiros, ${tabelasVerificadas} tabelas com RLS e ` +
        `${funcoesDefiner} declaracoes SECURITY DEFINER revisaveis. ` +
        `${propostasIgnoradas} tabela(s) em proposta nao executavel.`,
);
