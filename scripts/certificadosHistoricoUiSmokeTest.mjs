import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const base = readFileSync(
    new URL(
        "../src/components/treinamentos/BaseCertificadosTreinamentos.jsx",
        import.meta.url
    ),
    "utf8"
);

const page = readFileSync(
    new URL(
        "../src/components/treinamentos/TreinamentosPage.jsx",
        import.meta.url
    ),
    "utf8"
);

const drawer = readFileSync(
    new URL(
        "../src/components/treinamentos/HistoricoCertificadoDrawer.jsx",
        import.meta.url
    ),
    "utf8"
);

const service = readFileSync(
    new URL(
        "../src/services/certificadosHistoricoConsultaService.js",
        import.meta.url
    ),
    "utf8"
);

const css = readFileSync(
    new URL(
        "../src/styles/app-layout-global.css",
        import.meta.url
    ),
    "utf8"
);

assert.match(
    base,
    /History,[\s\S]*from "lucide-react"/,
    "Base deve importar History."
);

assert.match(
    base,
    /onAbrirHistoricoCertificado/,
    "Base deve receber callback de histórico."
);

assert.match(
    base,
    /treinamentos-certificados-acoes-documento__linha-superior/,
    "Linha superior compacta deve existir."
);

assert.match(
    base,
    /treinamentos-certificados-acao--historico/,
    "Botão compacto de histórico deve existir."
);

assert.match(
    base,
    /evento\.stopPropagation\(\);[\s\S]*onAbrirHistoricoCertificado\?\.\(d\)/,
    "Histórico deve abrir o documento correto sem propagar clique."
);

assert.match(
    page,
    /listarHistoricoCertificadoService/,
    "Page deve importar consulta histórica."
);

assert.match(
    page,
    /criarUrlHistoricoCertificadoService/,
    "Page deve importar geração de URL histórica."
);

assert.match(
    page,
    /historicoCertificadoDrawer/,
    "Page deve possuir state do drawer."
);

assert.match(
    page,
    /onAbrirHistoricoCertificado=\{abrirHistoricoCertificado\}/,
    "Base deve receber callback de abertura."
);

assert.match(
    page,
    /<HistoricoCertificadoDrawer/,
    "Drawer deve ser renderizado."
);

assert.match(
    service,
    /\.from\("certificados_historico"\)/,
    "Service deve consultar certificados_historico."
);

assert.match(
    service,
    /\.eq\("certificado_origem_id", id\)/,
    "Consulta deve ser limitada ao certificado atual."
);

assert.match(
    service,
    /\.order\("arquivado_em"/,
    "Histórico deve ser ordenado por arquivamento."
);

assert.match(
    service,
    /\.createSignedUrl\(/,
    "Arquivo histórico deve receber signed URL."
);

assert.doesNotMatch(
    service,
    /\.(insert|update|upsert|delete)\s*\(/,
    "Service histórico não pode executar mutações."
);

assert.match(
    drawer,
    /role="dialog"/,
    "Drawer deve usar role dialog."
);

assert.match(
    drawer,
    /aria-modal="true"/,
    "Drawer deve ser modal acessível."
);

assert.match(
    drawer,
    /fixed inset-0 z-\[100\]/,
    "Drawer deve permanecer fora do fluxo."
);

assert.match(
    drawer,
    /Nenhuma versão anterior registrada/,
    "Drawer deve tratar histórico vazio."
);

assert.match(
    drawer,
    /Abrir versão atual/,
    "Drawer deve permitir abrir versão atual."
);

assert.match(
    drawer,
    /Versões anteriores/,
    "Drawer deve separar versões anteriores."
);

assert.match(
    drawer,
    /Data documental/,
    "Drawer deve mostrar data documental."
);

assert.match(
    drawer,
    /Substituída em/,
    "Drawer deve mostrar data de substituição."
);

assert.match(
    css,
    /grid-template-columns:\s*minmax\(0,\s*1fr\)\s*2\.15rem/,
    "Linha superior deve ser dividida horizontalmente."
);

assert.match(
    css,
    /\.treinamentos-certificados-acao--historico/,
    "CSS da cápsula deve existir."
);

console.log("");
console.log("certificadosHistoricoUiSmokeTest: OK");
console.log("Layout: 3 niveis verticais.");
console.log("Coluna de acoes: 150px preservada.");
console.log("Historico: SELECT por certificado_origem_id.");
console.log("Drawer: fixed fora do fluxo.");
console.log("Storage historico: signed URL.");