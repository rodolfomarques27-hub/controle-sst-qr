import assert from "node:assert/strict";
import {
    existsSync,
    readFileSync,
    readdirSync,
    statSync,
} from "node:fs";
import {
    extname,
    join,
    relative,
} from "node:path";

const raizDist = join(
    process.cwd(),
    process.argv[2] || "dist",
);

const manifestPath = join(
    raizDist,
    ".vite",
    "manifest.json",
);

const baselineBundle = Object.freeze({
    scriptsTotal: 8_623_323,
    cssTotal: 912_636,
    imagensTotal: 3_515_776,
});

const crescimentoPermitidoBundle = Object.freeze({
    scriptsTotal: 150_000,
    cssTotal: 65_000,
    imagensTotal: 0,
});

const limites = {
    scriptsIniciais: 600_000,
    js: 500_000,
    excelJs: 1_000_000,
    mjs: 2_400_000,
    scriptsTotal:
        baselineBundle.scriptsTotal +
        crescimentoPermitidoBundle.scriptsTotal,

    cssInicial: 600_000,
    cssLazyArquivo: 250_000,
    cssTotal:
        baselineBundle.cssTotal +
        crescimentoPermitidoBundle.cssTotal,

    imagensIniciais: 200_000,
    imagensPublicas: 700_000,
    imagemArquivo: 1_300_000,
    imagensTotal:
        baselineBundle.imagensTotal +
        crescimentoPermitidoBundle.imagensTotal,
};

function normalizar(caminho) {
    return caminho.replaceAll("\\", "/");
}

function listarArquivos(diretorio) {
    return readdirSync(diretorio).flatMap((nome) => {
        const caminho = join(diretorio, nome);

        return statSync(caminho).isDirectory()
            ? listarArquivos(caminho)
            : [caminho];
    });
}

function detalhar(arquivos) {
    return arquivos.map((arquivo) => ({
        arquivo: normalizar(relative(raizDist, arquivo)),
        bytes: statSync(arquivo).size,
    }));
}

function totalizar(itens) {
    return itens.reduce(
        (total, item) => total + item.bytes,
        0,
    );
}

function formatarMb(bytes) {
    return (bytes / 1024 / 1024).toFixed(2);
}

function filtrarExtensao(arquivos, extensoes) {
    return arquivos.filter((arquivo) =>
        extensoes.has(extname(arquivo).toLowerCase()),
    );
}

assert.ok(
    existsSync(raizDist),
    `Diretorio de build inexistente: ${raizDist}`,
);

assert.ok(
    existsSync(manifestPath),
    `Manifest Vite nao localizado: ${manifestPath}`,
);

const manifest = JSON.parse(
    readFileSync(manifestPath, "utf8"),
);

const entries = Object.entries(manifest)
    .filter(([, chunk]) => Boolean(chunk?.isEntry))
    .map(([chave]) => chave);

assert.ok(
    entries.length > 0,
    "Nenhum entry point encontrado no manifest Vite.",
);

// ------------------------------------------------------------
// CARGA INICIAL = entries + imports estaticos recursivos
// ------------------------------------------------------------

const chavesIniciais = new Set();
const fila = [...entries];

while (fila.length > 0) {
    const chave = fila.shift();

    if (chavesIniciais.has(chave)) {
        continue;
    }

    chavesIniciais.add(chave);

    for (const importado of manifest[chave]?.imports || []) {
        fila.push(importado);
    }
}

// ------------------------------------------------------------
// CLASSIFICACAO PELO MANIFEST
// ------------------------------------------------------------

const scriptsIniciais = new Set();
const cssInicial = new Set();
const cssLazy = new Set();
const assetsIniciais = new Set();
const assetsLazy = new Set();

for (const [chave, chunk] of Object.entries(manifest)) {
    const inicial = chavesIniciais.has(chave);

    if (inicial && chunk?.file) {
        const arquivo = normalizar(chunk.file);
        const extensao = extname(arquivo).toLowerCase();

        if (extensao === ".js" || extensao === ".mjs") {
            scriptsIniciais.add(arquivo);
        }
    }

    for (const arquivo of chunk?.css || []) {
        (inicial ? cssInicial : cssLazy).add(
            normalizar(arquivo),
        );
    }

    for (const arquivo of chunk?.assets || []) {
        (inicial ? assetsIniciais : assetsLazy).add(
            normalizar(arquivo),
        );
    }
}

// Classificacao conservadora:
// se o recurso aparece no boot e em rota lazy, prevalece boot.

for (const arquivo of cssInicial) {
    cssLazy.delete(arquivo);
}

for (const arquivo of assetsIniciais) {
    assetsLazy.delete(arquivo);
}

// ------------------------------------------------------------
// INVENTARIO REAL
// ------------------------------------------------------------

const todos = listarArquivos(raizDist);

const js = detalhar(
    filtrarExtensao(
        todos,
        new Set([".js"]),
    ),
);

const mjs = detalhar(
    filtrarExtensao(
        todos,
        new Set([".mjs"]),
    ),
);

const css = detalhar(
    filtrarExtensao(
        todos,
        new Set([".css"]),
    ),
);

const imagens = detalhar(
    filtrarExtensao(
        todos,
        new Set([
            ".png",
            ".jpg",
            ".jpeg",
            ".webp",
        ]),
    ),
);

const scripts = [...js, ...mjs];

// ------------------------------------------------------------
// SCRIPTS
// ------------------------------------------------------------

const scriptsBoot = scripts.filter((item) =>
    scriptsIniciais.has(item.arquivo),
);

const jsGrandes = js.filter((item) => {
    const limite =
        /vendor-excel(?:-|_)/i.test(item.arquivo)
            ? limites.excelJs
            : limites.js;

    return item.bytes > limite;
});

const mjsGrandes = mjs.filter(
    (item) => item.bytes > limites.mjs,
);

const totalScriptsBoot = totalizar(scriptsBoot);
const totalScripts = totalizar(scripts);

// ------------------------------------------------------------
// CSS
// ------------------------------------------------------------

const cssBoot = css.filter((item) =>
    cssInicial.has(item.arquivo),
);

const cssSobDemanda = css.filter((item) =>
    cssLazy.has(item.arquivo),
);

const cssMapeado = new Set([
    ...cssInicial,
    ...cssLazy,
]);

const cssNaoMapeado = css.filter(
    (item) => !cssMapeado.has(item.arquivo),
);

const cssLazyGrande = cssSobDemanda.filter(
    (item) => item.bytes > limites.cssLazyArquivo,
);

const totalCssBoot = totalizar(cssBoot);
const totalCss = totalizar(css);

// ------------------------------------------------------------
// IMAGENS
// ------------------------------------------------------------

const imagensBoot = imagens.filter((item) =>
    assetsIniciais.has(item.arquivo),
);

const imagensMapeadas = new Set([
    ...assetsIniciais,
    ...assetsLazy,
]);

const imagensPublicas = imagens.filter(
    (item) => !imagensMapeadas.has(item.arquivo),
);

const imagensGrandes = imagens.filter(
    (item) => item.bytes > limites.imagemArquivo,
);

const totalImagensBoot = totalizar(imagensBoot);
const totalImagensPublicas = totalizar(imagensPublicas);
const totalImagens = totalizar(imagens);

// ------------------------------------------------------------
// ASSERTS
// ------------------------------------------------------------

assert.ok(
    totalScriptsBoot <= limites.scriptsIniciais,
    `Scripts iniciais acima de 600 KB: ${totalScriptsBoot} bytes.`,
);

assert.equal(
    jsGrandes.length,
    0,
    `Chunk JS acima do orçamento: ${JSON.stringify(jsGrandes)}`,
);

assert.equal(
    mjsGrandes.length,
    0,
    `Arquivo MJS acima de 2,4 MB: ${JSON.stringify(mjsGrandes)}`,
);

assert.ok(
    totalScripts <= limites.scriptsTotal,
    `Scripts acima do orçamento global (${limites.scriptsTotal} bytes): ${totalScripts} bytes.`,
);

assert.equal(
    cssNaoMapeado.length,
    0,
    `CSS fora do manifest Vite: ${JSON.stringify(cssNaoMapeado)}`,
);

assert.ok(
    totalCssBoot <= limites.cssInicial,
    `CSS inicial acima de 600 KB: ${totalCssBoot} bytes.`,
);

assert.equal(
    cssLazyGrande.length,
    0,
    `CSS lazy acima de 250 KB: ${JSON.stringify(cssLazyGrande)}`,
);

assert.ok(
    totalCss <= limites.cssTotal,
    `CSS acima do orçamento global (${limites.cssTotal} bytes): ${totalCss} bytes.`,
);

assert.equal(
    imagensGrandes.length,
    0,
    `Imagem acima de 1,3 MB: ${JSON.stringify(imagensGrandes)}`,
);

assert.ok(
    totalImagensBoot <= limites.imagensIniciais,
    `Imagens iniciais acima de 200 KB: ${totalImagensBoot} bytes.`,
);

assert.ok(
    totalImagensPublicas <= limites.imagensPublicas,
    `Assets publicos acima de 700 KB: ${totalImagensPublicas} bytes.`,
);

assert.ok(
    totalImagens <= limites.imagensTotal,
    `Imagens acima do orçamento global (${limites.imagensTotal} bytes): ${totalImagens} bytes.`,
);

// ------------------------------------------------------------
// RELATORIO
// ------------------------------------------------------------

const maiorScript = [...scripts]
    .sort((a, b) => b.bytes - a.bytes)[0];

const maiorCss = [...css]
    .sort((a, b) => b.bytes - a.bytes)[0];

console.log("Bundle Budget v2 aprovado:");

console.log(
    `- scripts iniciais: ${totalScriptsBoot} bytes (${formatarMb(totalScriptsBoot)} MB) / ${limites.scriptsIniciais}`,
);

console.log(
    `- scripts totais: ${totalScripts} bytes (${formatarMb(totalScripts)} MB) / ${limites.scriptsTotal}`,
);

console.log(
    `- CSS inicial: ${totalCssBoot} bytes (${formatarMb(totalCssBoot)} MB) / ${limites.cssInicial}`,
);

console.log(
    `- CSS total: ${totalCss} bytes (${formatarMb(totalCss)} MB) / ${limites.cssTotal}`,
);

console.log(
    `- imagens iniciais: ${totalImagensBoot} bytes (${formatarMb(totalImagensBoot)} MB) / ${limites.imagensIniciais}`,
);

console.log(
    `- imagens publicas/nao mapeadas: ${totalImagensPublicas} bytes (${formatarMb(totalImagensPublicas)} MB) / ${limites.imagensPublicas}`,
);

console.log(
    `- imagens totais: ${totalImagens} bytes (${formatarMb(totalImagens)} MB) / ${limites.imagensTotal}`,
);

console.log(
    `- maior script: ${maiorScript?.arquivo || "n/a"}`,
);

console.log(
    `- maior CSS: ${maiorCss?.arquivo || "n/a"}`,
);

if (imagensPublicas.length > 0) {
    console.log(
        `- assets publicos: ${imagensPublicas
            .map(
                (item) =>
                    `${item.arquivo} (${item.bytes} bytes)`,
            )
            .join(", ")}`,
    );
}