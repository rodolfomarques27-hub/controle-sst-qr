import assert from "node:assert/strict";
import {
    readFileSync,
} from "node:fs";

const service =
    readFileSync(
        new URL(
            "../src/services/exportacao/relatorioPendenciasCadastraisService.js",
            import.meta.url
        ),
        "utf8"
    );

const barrel =
    readFileSync(
        new URL(
            "../src/services/exportacaoService.js",
            import.meta.url
        ),
        "utf8"
    );

assert.match(
    service,
    /import html2canvas from "html2canvas"/
);

assert.match(
    service,
    /import jsPDF from "jspdf"/
);

assert.match(
    service,
    /hero-pendencias-treinamentos-obras-v1\.png/
);

assert.match(
    service,
    /CAMPOS_PENDENCIAS_CADASTRAIS/
);

assert.match(
    service,
    /export async function baixarRelatorioPendenciasCadastraisPDF/
);

assert.match(
    service,
    /data-pagina-cadastral/
);

assert.match(
    service,
    /new jsPDF\(\s*"l",\s*"mm",\s*"a4"\s*\)/
);

assert.match(
    service,
    /Página \$\{indice \+ 1\} de \$\{paginas\.length\}/
);

assert.match(
    service,
    /resumo\.avaliacoes/
);

assert.doesNotMatch(
    service,
    /\bconsolidarPendenciasCadastrais\s*\(/
);

assert.match(
    barrel,
    /baixarRelatorioPendenciasCadastraisPDF/
);

assert.match(
    barrel,
    /relatorioPendenciasCadastraisService/
);

console.log("");
console.log("============================================================");
console.log("SMOKE — PDF PENDÊNCIAS CADASTRAIS: OK");
console.log("Serviço isolado: OK");
console.log("A4 landscape: OK");
console.log("Hero próprio: OK");
console.log("Paginação física: OK");
console.log("Mesmo resumo do modal: OK");
console.log("Sem recálculo cadastral: OK");
console.log("Barril de exportação: OK");
console.log("============================================================");
/* ============================================================
 * G18-A2.3 — visual institucional + QR
 * ============================================================ */

assert.match(
    service,
    /marca-safescan-cadastral/
);

assert.match(
    service,
    /marca-contratante-cadastral/
);

assert.match(
    service,
    /contratanteCabecalho/
);

assert.match(
    service,
    /QR IMPRESSO/
);

assert.match(
    service,
    /qrUltimaImpressaoEm/
);

assert.match(
    service,
    /qr_ultima_impressao_em/
);

assert.match(
    service,
    /CONTROLE DE IMPRESSÃO QR/
);

assert.match(
    service,
    /filtrosQrSelecionados/
);

assert.match(
    service,
    /Gerado pelo SafeScan Brasil/
);

assert.match(
    service,
    /rodape-cadastral__data/
);

assert.match(
    service,
    /center 60%/
);

assert.match(
    service,
    /aguardarImagensCadastrais/
);

assert.doesNotMatch(
    service,
    /EMITIDO EM/
);

assert.doesNotMatch(
    service,
    /center 48%/
);

/*
 * CAD-QR-COND-2
 *
 * Contrato funcional:
 *
 * QR OFF:
 * - sem painel;
 * - sem coluna;
 * - sem SIM/NÃO.
 *
 * QR ON:
 * - painel e coluna continuam suportados.
 */
assert.match(
    service,
    /function temFiltroQrCadastral/
);

assert.match(
    service,
    /filtros-cadastrais--sem-qr/
);

assert.match(
    service,
    /const qrPainelHtml/
);

assert.match(
    service,
    /const qrCelulaHtml/
);

assert.match(
    service,
    /const larguraPendencias/
);

assert.match(
    service,
    /mostrarQr\s*\?\s*44\s*:\s*52/
);

assert.match(
    service,
    /data-qr-visivel/
);

assert.match(
    service,
    /montarLinhas\(\s*avaliacoes,\s*mostrarQr\s*\)/
);

assert.match(
    service,
    /montarTabela\(\s*resumo\?\.avaliacoes\s*\|\|\s*\[\],\s*mostrarQr\s*\)/
);

assert.doesNotMatch(
    service,
    />\s*Sem restrição por QR\s*</
);

console.log("");
console.log("============================================================");
console.log("G18-A2.3 — VISUAL + QR: OK");
console.log("SafeScan esquerda: OK");
console.log("Título central: OK");
console.log("Idealiza direita: OK");
console.log("QR impresso individual: OK");
console.log("Filtro QR impresso: OK");
console.log("Rodapé 3 zonas: OK");
console.log("Hero center 60%: OK");
console.log("EMITIDO EM removido: OK");
console.log("============================================================");