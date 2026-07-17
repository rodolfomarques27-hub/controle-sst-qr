import assert from "node:assert/strict";
import { readdirSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";

const diretorioInformado = process.argv[2] || "dist";
const raizDist = join(process.cwd(), diretorioInformado);

const limiteArquivoJs = 500_000;
const limiteArquivoMjs = 2_400_000;
const limiteTotalScripts = 6_500_000;
const limiteArquivoCss = 550_000;
const limiteTotalCss = 700_000;
const limiteArquivoImagem = 1_300_000;
const limiteTotalImagens = 2_500_000;

function listarArquivos(diretorio) {
    return readdirSync(diretorio).flatMap((nome) => {
        const caminho = join(diretorio, nome);
        return statSync(caminho).isDirectory() ? listarArquivos(caminho) : [caminho];
    });
}

function detalharArquivos(arquivos) {
    return arquivos.map((arquivo) => ({
        arquivo: relative(raizDist, arquivo),
        bytes: statSync(arquivo).size,
    }));
}

function totalizar(detalhes) {
    return detalhes.reduce((total, item) => total + item.bytes, 0);
}

function formatarMb(bytes) {
    return (bytes / 1024 / 1024).toFixed(2);
}

const todosArquivos = listarArquivos(raizDist);
const arquivosJs = todosArquivos.filter((arquivo) => extname(arquivo).toLowerCase() === ".js");
const arquivosMjs = todosArquivos.filter((arquivo) => extname(arquivo).toLowerCase() === ".mjs");
const arquivosCss = todosArquivos.filter((arquivo) => extname(arquivo).toLowerCase() === ".css");
const extensoesImagem = new Set([".png", ".jpg", ".jpeg", ".webp"]);
const arquivosImagem = todosArquivos.filter((arquivo) => extensoesImagem.has(extname(arquivo).toLowerCase()));

const detalhesJs = detalharArquivos(arquivosJs);
const detalhesMjs = detalharArquivos(arquivosMjs);
const detalhesScripts = [...detalhesJs, ...detalhesMjs];
const detalhesCss = detalharArquivos(arquivosCss);
const imagens = detalharArquivos(arquivosImagem);

const totalScripts = totalizar(detalhesScripts);
const totalCss = totalizar(detalhesCss);
const totalImagens = totalizar(imagens);

const jsAcimaDoLimite = detalhesJs.filter((item) => item.bytes > limiteArquivoJs);
const mjsAcimaDoLimite = detalhesMjs.filter((item) => item.bytes > limiteArquivoMjs);
const cssAcimaDoLimite = detalhesCss.filter((item) => item.bytes > limiteArquivoCss);
const imagensAcimaDoLimite = imagens.filter((item) => item.bytes > limiteArquivoImagem);

assert.equal(jsAcimaDoLimite.length, 0, `Chunk JS acima de 500 KB: ${JSON.stringify(jsAcimaDoLimite)}`);
assert.equal(mjsAcimaDoLimite.length, 0, `Arquivo MJS acima de 2,4 MB: ${JSON.stringify(mjsAcimaDoLimite)}`);
assert.ok(totalScripts <= limiteTotalScripts, `Scripts JS/MJS acima de 6,5 MB no total: ${totalScripts} bytes.`);
assert.equal(cssAcimaDoLimite.length, 0, `Arquivo CSS acima de 550 KB: ${JSON.stringify(cssAcimaDoLimite)}`);
assert.ok(totalCss <= limiteTotalCss, `CSS acima de 700 KB no total: ${totalCss} bytes.`);
assert.equal(imagensAcimaDoLimite.length, 0, `Imagem acima de 1,3 MB: ${JSON.stringify(imagensAcimaDoLimite)}`);
assert.ok(totalImagens <= limiteTotalImagens, `Imagens acima de 2,5 MB no total: ${totalImagens} bytes.`);

const maiorScript = [...detalhesScripts].sort((a, b) => b.bytes - a.bytes)[0];
const maiorCss = [...detalhesCss].sort((a, b) => b.bytes - a.bytes)[0];

console.log(
    `Bundle aprovado: ${arquivosJs.length} JS + ${arquivosMjs.length} MJS ` +
    `(${formatarMb(totalScripts)} MB), ${arquivosCss.length} CSS (${formatarMb(totalCss)} MB) e ` +
    `${imagens.length} imagens (${formatarMb(totalImagens)} MB); ` +
    `maior script ${maiorScript?.arquivo || "n/a"}; maior CSS ${maiorCss?.arquivo || "n/a"}.`,
);