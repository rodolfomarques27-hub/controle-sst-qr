import fs from "node:fs";
import path from "node:path";

const repo = process.cwd();
const relatorioPath = path.join(
    repo,
    "src/services/exportacao/relatorioRevisaoTreinamentosService.js"
);
const historicoPath = path.join(
    repo,
    "src/components/treinamentos/HistoricoRevisoesTreinamentosDrawer.jsx"
);

function ler(arquivo) {
    return fs.readFileSync(arquivo, "utf8");
}

function exigir(condicao, marcador, mensagem) {
    if (!condicao) {
        throw new Error(`${marcador}: ${mensagem}`);
    }
    console.log(`${marcador}=OK`);
}

const relatorio = ler(relatorioPath);
const historico = ler(historicoPath);

exigir(
    relatorio.includes("obterHistoricoRevisaoTreinamentosService"),
    "I3_P5_P1_SNAPSHOT_HISTORICO_SOURCE",
    "PDF deve carregar a revisão histórica persistida."
);

exigir(
    relatorio.includes("readOnlySource: true") &&
        relatorio.includes("persistido: false") &&
        relatorio.includes("previewLocal: true"),
    "I3_P5_P1_LOCAL_PREVIEW_CONTRACT",
    "Contrato da prévia local/read-only ausente."
);

exigir(
    relatorio.includes('import("html2canvas")') &&
        relatorio.includes('import("jspdf")'),
    "I3_P5_P1_DYNAMIC_PDF_DEPS",
    "Dependências pesadas do PDF devem ser carregadas sob demanda."
);

exigir(
    relatorio.includes("hero-pendencias-treinamentos-obras-v1.png") &&
        relatorio.includes("hero--compacto"),
    "I3_P5_P1_PERMANENT_PDF_VISUAL_FAMILY",
    "Hero existente e cabeçalho compacto de continuação devem ser preservados."
);

exigir(
    relatorio.includes('width: 210mm') &&
        relatorio.includes('height: 297mm') &&
        relatorio.includes("validarPaginasSemOverflow"),
    "I3_P5_P1_A4_OVERFLOW_GUARD",
    "Geometria A4/guard de overflow ausente."
);

exigir(
    relatorio.includes("status_temporal_anterior") ||
        relatorio.includes("statusTemporalAnterior"),
    "I3_P5_P1_HISTORICAL_STATUS_FIELDS",
    "Status anterior não foi representado no renderer."
);

exigir(
    relatorio.includes("dataRealizacaoSalva") &&
        relatorio.includes("dataRealizacaoRevisada") &&
        relatorio.includes("dataVencimentoSalva") &&
        relatorio.includes("dataVencimentoRevisada"),
    "I3_P5_P1_HISTORICAL_DATE_FIELDS",
    "Datas salvas/revisadas precisam vir do snapshot histórico."
);

exigir(
    relatorio.includes("Evidências consideradas no snapshot") &&
        relatorio.includes("ID da revisão") &&
        relatorio.includes("Snapshot histórico imutável"),
    "I3_P5_P1_AUDIT_CONTENT",
    "Conteúdo auditável mínimo ausente."
);

exigir(
    relatorio.includes('const nomeArquivo = `revisao-${numeroRevisao}.pdf`') &&
        relatorio.includes('const caminhoEsperado = `${colaboradorId}/${revisaoId}/${nomeArquivo}`'),
    "I3_P5_P1_FUTURE_CANONICAL_STORAGE_PATH",
    "Nome/caminho canônicos para futura persistência não foram preparados."
);

for (const proibido of [
    ".storage.from(",
    ".upload(",
    ".rpc(",
    "registrar_pdf_revisao_treinamentos",
    "concluirRevisaoTreinamentosService",
    "prepararPreviaRevisaoTreinamentosService",
    "verificarCertificadoTreinamento",
]) {
    exigir(
        !relatorio.includes(proibido),
        `I3_P5_P1_REPORT_NO_WRITE_${proibido.replace(/[^a-z0-9]+/gi, "_").toUpperCase()}`,
        `Operação proibida no relatório local: ${proibido}`
    );
}

exigir(
    historico.includes("Pré-visualizar PDF") &&
        historico.includes("previsualizarPdf") &&
        historico.includes('import(\n                "../../services/exportacao/relatorioRevisaoTreinamentosService.js"\n            )'),
    "I3_P5_P1_HISTORY_ENTRYPOINT",
    "Histórico não possui entrada lazy para pré-visualização local."
);

exigir(
    historico.includes("A prévia do PDF é local e não registra arquivo"),
    "I3_P5_P1_HISTORY_READONLY_NOTICE",
    "Aviso explícito de prévia local ausente."
);

for (const proibido of [
    ".storage.from(",
    ".upload(",
    ".rpc(",
    "registrar_pdf_revisao_treinamentos",
]) {
    exigir(
        !historico.includes(proibido),
        `I3_P5_P1_HISTORY_NO_WRITE_${proibido.replace(/[^a-z0-9]+/gi, "_").toUpperCase()}`,
        `Histórico não pode persistir PDF na P1: ${proibido}`
    );
}

exigir(
    historico.includes("PDF ainda não gerado"),
    "I3_P5_P1_PERSISTED_STATUS_PRESERVED",
    "Histórico deve continuar distinguindo prévia local de PDF persistido."
);


const limiteEvidenciasMatch = relatorio.match(/const EVIDENCIAS_POR_PAGINA = (\d+);/);
const limiteEvidencias = limiteEvidenciasMatch ? Number(limiteEvidenciasMatch[1]) : 0;

exigir(
    limiteEvidencias === 4,
    "I3_P5_P1_F3_EVIDENCE_PAGE_CAPACITY_4",
    "Apêndice deve limitar cada página a 4 evidências para reservar o rodapé."
);

exigir(
    Math.ceil(9 / limiteEvidencias) === 3,
    "I3_P5_P1_F3_NINE_EVIDENCES_THREE_PAGES",
    "Nove evidências devem ocupar 3 páginas do apêndice (4 + 4 + 1)."
);

exigir(
    relatorio.includes("break-inside: avoid") &&
        relatorio.includes("page-break-inside: avoid"),
    "I3_P5_P1_F3_EVIDENCE_CARD_NO_BREAK",
    "Cartão de evidência deve declarar proteção contra quebra interna."
);

exigir(
    relatorio.includes('pagina.querySelector(".conteudo")') &&
        relatorio.includes("excessoConteudoVertical"),
    "I3_P5_P1_F3_INNER_CONTENT_OVERFLOW_GUARD",
    "Guard precisa detectar overflow interno mesmo quando a página usa overflow hidden."
);

for (const [chave, rotulo] of [
    ["nao_aplicavel", "Não aplicável"],
    ["revisao_manual_necessaria", "Revisão manual necessária"],
    ["documento_principal_legado", "Documento principal legado"],
    ["certificado_treinamento", "Certificado de treinamento"],
]) {
    exigir(
        relatorio.includes(`${chave}: "${rotulo}"`),
        `I3_P5_P1_F3_HUMAN_LABEL_${chave.toUpperCase()}`,
        `Rótulo humano ausente para ${chave}.`
    );
}

exigir(
    relatorio.includes("colaborador?.matricula ||") &&
        relatorio.includes("colaborador?.matricula_esocial ||") &&
        relatorio.includes('"Não registrado no snapshot"'),
    "I3_P5_P1_F3_SNAPSHOT_MATRICULA_ONLY",
    "Código/matrícula deve usar exclusivamente campos persistidos no snapshot."
);

exigir(
    relatorio.includes("rotuloTecnicoHumano(item?.statusIntegridade)") &&
        relatorio.includes("rotuloTecnicoHumano(evidencia?.tipoEvidencia") &&
        relatorio.includes("rotuloTecnicoHumano(evidencia?.tipoDocumentoEsperado)") &&
        relatorio.includes("rotuloTecnicoHumano(evidencia?.statusIntegridade)"),
    "I3_P5_P1_F3_HUMAN_LABELS_APPLIED",
    "Rótulos humanos precisam ser aplicados na apresentação do relatório."
);

console.log("SAFESCAN_TREINAMENTOS_REVISAO_I3_P5_P1_F3_PDF_SMOKE_OK");
