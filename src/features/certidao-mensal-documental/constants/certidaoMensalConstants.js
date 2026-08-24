export const STATUS_DOCUMENTAL = Object.freeze({
    confirmado: { rotulo: "Confirmado", classe: "is-confirmado" },
    emAnalise: { rotulo: "Em análise", classe: "is-em-analise" },
    pendente: { rotulo: "Pendente", classe: "is-pendente" },
    reenvioSolicitado: {
        rotulo: "Reenvio solicitado",
        classe: "is-reenvio-solicitado",
    },
    vencido: { rotulo: "Vencido", classe: "is-vencido" },
});

export const DOCUMENTOS_CERTIDAO_MENSAL_BASE = Object.freeze([
    ["cnd-federal", "CND Federal", "Certidão Negativa de Débitos — Receita Federal / PGFN", false, "6 meses"],
    ["cnd-estadual", "CND Estadual", "Certidão Negativa de Débitos — SEFAZ/SP", false, "6 meses"],
    ["cnd-municipal", "CND Municipal", "Certidão Negativa de Débitos — Fazenda Municipal", false, "6 meses"],
    ["crf-fgts", "CRF FGTS", "Certificado de Regularidade do FGTS - CRF", false, "1 mês"],
    ["fgts", "FGTS", "GFD - Guia do FGTS Digital + comprovante de pagamento", false, "1 mês"],
    ["cndt-trabalhista", "CNDT (Trabalhista)", "Justiça do Trabalho", false, "6 meses"],
    ["falencia-concordata", "Falência e Concordata", "Tribunal de Justiça", false, "conforme certidão"],
    ["cadastro-tce-ceis", "Cadastro TCE / CEIS", "Consulta de impedimentos", false, "conforme consulta"],
    ["folha-pagamento", "Folha de Pagamento e Comprovantes", "Remuneração e comprovantes da competência", false, "1 mês"],
    ["folha-ponto", "Espelho de Ponto", "Entradas, saídas, intervalos e jornada da competência", false, "1 mês"],
    ["va-vt", "VA / VT", "Beneficiários e comprovantes de vale-alimentação e vale-transporte", false, "1 mês"],
    ["seguro-vida", "Seguro de Vida", "Apólice, certificado e vigência aplicável", false, "conforme apólice"],
    ["inss-dctfweb", "INSS / DCTFWeb", "DCTFWeb, guia/DARF e comprovante previdenciário da competência", false, "1 mês"],
    ["iss", "ISSQN", "Certidão de ISSQN / Taxa de Licença com controle de validade", false, "6 meses"],
    ["esocial", "eSocial SST", "Recibos SST: S‑2210, S‑2220 e S‑2240", false, "1 mês"],
    ["relacao-empregados", "Relação de Empregados", "Composição da equipe", true],
    ["aso-pcmso", "ASO + PCMSO", "Saúde ocupacional", true],
].map(([id, titulo, subtitulo, origemSistema = false, prazoDocumental = ""], indice) => Object.freeze({
    id,
    numero: indice + 1,
    titulo,
    subtitulo,
    prazoDocumental,
    acaoLabel: origemSistema ? "Automático" : "Enviar",
    detalhePrincipal: origemSistema ? "Consolidação ainda não calculada" : "Documento ainda não enviado",
    detalheSecundario: origemSistema ? "Dados internos do SafeScan" : "Aguardando arquivo da competência",
    status: "pendente",
    arquivoNome: "Nenhum arquivo enviado",
    pagina: "—",
    zoom: "—",
    camposExtraidos: [],
    regras: [],
    temEvidencia: false,
    origemSistema,
})));

export function obterCompetenciaAtual() {
    const agora = new Date();
    return `${String(agora.getMonth() + 1).padStart(2, "0")}/${agora.getFullYear()}`;
}
