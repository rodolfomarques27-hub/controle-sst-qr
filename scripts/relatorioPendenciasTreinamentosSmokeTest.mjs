import fs from "node:fs";
import path from "node:path";

const raiz =
    process.cwd();

const renderer =
    path.join(
        raiz,
        "src",
        "services",
        "exportacao",
        "relatorioPendenciasTreinamentosService.js"
    );

const page =
    path.join(
        raiz,
        "src",
        "components",
        "colaboradores",
        "ColaboradoresPage.jsx"
    );

for (const arquivo of [renderer, page]) {
    if (!fs.existsSync(arquivo)) {
        throw new Error(
            `Arquivo obrigatório ausente: ${arquivo}`
        );
    }
}

const codigoRenderer =
    fs.readFileSync(
        renderer,
        "utf8"
    );

const codigoPage =
    fs.readFileSync(
        page,
        "utf8"
    );

const obrigatoriosRenderer = [
    'import html2canvas from "html2canvas";',
    'import jsPDF from "jspdf";',
    "const PDF_LARGURA_MM = 297;",
    "const PDF_ALTURA_MM = 210;",
    'new jsPDF("l", "mm", "a4")',
    "size: A4 landscape;",
    "contratanteCabecalho =",
    "contratanteCabecalho?.nome",
    'aria-label="Contratante:',
    "G2-C3B — REFINAMENTO VISUAL FINAL",
    "align-self: start;",
    "font-size: 2.1mm;",
    "font-size: 5.5mm;",
    "Gerado pelo SafeScan Brasil",
    "heroPendenciasTreinamentosObrasUrl",
    "overflow-wrap:",
    "anywhere;",
];

const obrigatoriosPage = [
    "const obterContratanteIdealizaRelatorio = () => {",
    '"Contratante - Idealiza Cidades"',
    "tipo === tipoEsperado",
    "obterUrlLogoEmpresa(",
    "contratanteCabecalho: obterContratanteIdealizaRelatorio(),",
];

const proibidosRenderer = [
    "data:image/webp;base64,",
    "exportacaoBaseService",
    "relatorioColaboradoresUtils",
    "dividirEmLotesRelatorioEmpresas",
    "pendenciasEmpresa, 10",
    "documentosOcrDds",
    "certidaoMensalRelatorioAnualHtmlService",
    "A4 portrait",
    "height: 297mm;",
    "SST • RELATÓRIO",
    'aria-label="Empresa: ${escaparHTML(',
];

for (const trecho of obrigatoriosRenderer) {
    if (!codigoRenderer.includes(trecho)) {
        throw new Error(
            `Contrato obrigatório ausente no renderer: ${trecho}`
        );
    }
}

for (const trecho of obrigatoriosPage) {
    if (!codigoPage.includes(trecho)) {
        throw new Error(
            `Contrato obrigatório ausente na ColaboradoresPage: ${trecho}`
        );
    }
}

for (const trecho of proibidosRenderer) {
    if (codigoRenderer.includes(trecho)) {
        throw new Error(
            `Contrato proibido detectado no renderer: ${trecho}`
        );
    }
}

if (
    codigoPage.includes(
        "\n        const obterContratanteIdealizaRelatorio = () => {"
    )
) {
    throw new Error(
        "Helper da Idealiza ainda possui recuo excessivo."
    );
}

if (
    !codigoPage.includes(
        "\n    const obterContratanteIdealizaRelatorio = () => {"
    )
) {
    throw new Error(
        "Indentação normalizada do helper não foi confirmada."
    );
}

if (
    /from\s+["'][^"']*dds/i.test(
        codigoRenderer
    ) ||
    /from\s+["'][^"']*dds/i.test(
        codigoPage
    )
) {
    throw new Error(
        "Dependência DDS detectada."
    );
}

console.log(
    "OK — Idealiza/contratante chega ao renderer."
);

console.log(
    "OK — Hero usa identidade da contratante."
);

console.log(
    "OK — Empresa fiscalizada permanece fora do hero."
);

console.log(
    "OK — Tipografia foi ampliada."
);

console.log(
    "OK — Tabela usa altura visual natural."
);

console.log(
    "OK — A4 landscape e paginação dinâmica preservados."
);

console.log(
    "OK — Base do relatório permanece isolada."
);

console.log(
    "OK — DDS permanece desacoplado."
);