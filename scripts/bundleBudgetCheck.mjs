import assert from "node:assert/strict";
import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const diretorioInformado = process.argv[2] || "dist";
const raizDist = join(process.cwd(), diretorioInformado);
const limiteArquivoJs = 500_000;
// Baseline atual: 3,68 MB, com o maior pacote abaixo de 500 KB.
const limiteTotalJs = 4_100_000;
const limiteArquivoImagem = 1_300_000;
const limiteTotalImagens = 2_500_000;

function listarArquivos(diretorio) {
    return readdirSync(diretorio).flatMap((nome) => {
        const caminho = join(diretorio, nome);
        return statSync(caminho).isDirectory() ? listarArquivos(caminho) : [caminho];
    });
}

const arquivosJs = listarArquivos(raizDist).filter((arquivo) => arquivo.endsWith(".js"));
const detalhes = arquivosJs.map((arquivo) => ({
    arquivo: relative(raizDist, arquivo),
    bytes: statSync(arquivo).size,
}));
const totalJs = detalhes.reduce((total, item) => total + item.bytes, 0);
const acimaDoLimite = detalhes.filter((item) => item.bytes > limiteArquivoJs);
const extensoesImagem = new Set([".png", ".jpg", ".jpeg", ".webp"]);
const arquivosImagem = listarArquivos(raizDist).filter((arquivo) =>
    extensoesImagem.has(arquivo.slice(arquivo.lastIndexOf(".")).toLowerCase()),
);
const imagens = arquivosImagem.map((arquivo) => ({
    arquivo: relative(raizDist, arquivo),
    bytes: statSync(arquivo).size,
}));
const totalImagens = imagens.reduce((total, item) => total + item.bytes, 0);
const imagensAcimaDoLimite = imagens.filter((item) => item.bytes > limiteArquivoImagem);

assert.equal(acimaDoLimite.length, 0, `Chunk JS acima de 500 KB: ${JSON.stringify(acimaDoLimite)}`);
assert.ok(totalJs <= limiteTotalJs, `JavaScript total acima de 4,1 MB: ${totalJs} bytes.`);
assert.equal(imagensAcimaDoLimite.length, 0, `Imagem acima de 1,3 MB: ${JSON.stringify(imagensAcimaDoLimite)}`);
assert.ok(totalImagens <= limiteTotalImagens, `Imagens acima de 2,5 MB no total: ${totalImagens} bytes.`);

const maior = detalhes.sort((a, b) => b.bytes - a.bytes)[0];
console.log(
    `Bundle aprovado: ${arquivosJs.length} chunks (${(totalJs / 1024 / 1024).toFixed(2)} MB) e ` +
    `${imagens.length} imagens (${(totalImagens / 1024 / 1024).toFixed(2)} MB); maior ${maior?.arquivo || "n/a"}.`,
);
