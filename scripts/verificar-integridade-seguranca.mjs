import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const raizProjeto = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function ler(caminhoRelativo) {
    return readFile(path.join(raizProjeto, caminhoRelativo), "utf8");
}

const verificacoes = [
    {
        nome: "arquivos privados não caem em URL pública",
        arquivo: "src/hooks/useStorageUrl.js",
        validar: (conteudo) => (
            !conteudo.includes("montarUrlPublicaStorage") &&
            conteudo.includes("setUrl(\"\")")
        ),
    },
    {
        nome: "lista de presença usa o verificador ativo",
        arquivo: "src/components/VerificadorListaPresenca.jsx",
        validar: (conteudo) => conteudo.includes("./VerificadorListaPresencaAtivo"),
    },
    {
        nome: "cliente web não contém service role",
        arquivo: "src/lib/supabaseClient.js",
        validar: (conteudo) => !/service[_-]?role|SUPABASE_SERVICE_ROLE_KEY/i.test(conteudo),
    },
    {
        nome: "backups e ambientes locais estão ignorados",
        arquivo: ".gitignore",
        validar: (conteudo) => ["backups/", "backups-locais/", ".env*", "node_modules/", "dist/"].every((item) => conteudo.includes(item)),
    },
];

let falhas = 0;

for (const verificacao of verificacoes) {
    const conteudo = await ler(verificacao.arquivo);
    const passou = verificacao.validar(conteudo);

    if (passou) {
        console.log(`[OK] ${verificacao.nome}`);
    } else {
        falhas += 1;
        console.error(`[FALHA] ${verificacao.nome} (${verificacao.arquivo})`);
    }
}

if (falhas > 0) {
    process.exitCode = 1;
} else {
    console.log("Integridade de segurança do código: aprovada.");
}
