import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const arquivosVersionados = execFileSync("git", ["ls-files"], { encoding: "utf8" })
    .split(/\r?\n/)
    .filter(Boolean);

const arquivosAmbienteVersionados = arquivosVersionados.filter((arquivo) =>
    /(^|\/)\.env($|\.)/.test(arquivo) && !arquivo.endsWith(".example")
);
assert.deepEqual(
    arquivosAmbienteVersionados,
    [],
    `Arquivos de ambiente nao podem ser versionados: ${arquivosAmbienteVersionados.join(", ")}`
);

const arquivosFonte = arquivosVersionados.filter((arquivo) =>
    /^(src|scripts)\//.test(arquivo) && /\.(js|jsx|mjs|css|html)$/.test(arquivo)
);

const padroesCriticos = [
    { nome: "chave service_role do Supabase", regex: /service_role\s*[:=]\s*["'][^"']{20,}/i },
    { nome: "chave privada", regex: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
    { nome: "token pessoal do GitHub", regex: /\bgh[pousr]_[A-Za-z0-9_]{30,}\b/ },
];

const ocorrencias = [];
for (const arquivo of arquivosFonte) {
    const conteudo = readFileSync(arquivo, "utf8");
    for (const padrao of padroesCriticos) {
        if (padrao.regex.test(conteudo)) ocorrencias.push(`${arquivo}: ${padrao.nome}`);
    }
}

assert.deepEqual(ocorrencias, [], `Possiveis segredos encontrados:\n${ocorrencias.join("\n")}`);
console.log(`Baseline de seguranca aprovado em ${arquivosFonte.length} arquivos de codigo.`);
