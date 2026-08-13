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
    ["cnd-federal", "CND Federal", "Certidão Negativa de Débitos — Receita Federal / PGFN"],
    ["cnd-estadual", "CND Estadual", "Certidão Negativa de Débitos — SEFAZ/SP"],
    ["cnd-municipal", "CND Municipal", "Certidão Negativa de Débitos — Fazenda Municipal"],
    ["crf-fgts", "CRF FGTS", "Certificado de Regularidade do FGTS - CRF"],
    ["fgts", "FGTS", "GFD - Guia do FGTS Digital + comprovante de pagamento"],
    ["cndt-trabalhista", "CNDT (Trabalhista)", "Justiça do Trabalho"],
    ["falencia-concordata", "Falência e Concordata", "Tribunal de Justiça"],
    ["cadastro-tce-ceis", "Cadastro TCE / CEIS", "Consulta de impedimentos"],
    ["folha-pagamento", "Folha de Pagamento e Comprovantes", "Remuneração e comprovantes da competência"],
    ["folha-ponto", "Espelho de Ponto", "Entradas, saídas, intervalos e jornada da competência"],
    ["va-vt", "VA / VT", "Beneficiários e comprovantes de vale-alimentação e vale-transporte"],
    ["seguro-vida", "Seguro de Vida", "Apólice, certificado e vigência aplicável"],
    ["inss-dctfweb", "INSS / DCTFWeb", "DCTFWeb, guia/DARF e comprovante previdenciário da competência"],
    ["iss", "ISSQN", "Certidão de ISSQN / Taxa de Licença com controle de validade"],
    ["esocial", "eSocial SST", "Recibos SST: S\u20112210, S\u20112220 e S\u20112240"],
    ["relacao-empregados", "Relação de Empregados", "Composição da equipe", true],
    ["aso-pcmso", "ASO + PCMSO", "Saúde ocupacional", true],
].map(([id, titulo, subtitulo, origemSistema = false], indice) => Object.freeze({
    id,
    numero: indice + 1,
    titulo,
    subtitulo,
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
