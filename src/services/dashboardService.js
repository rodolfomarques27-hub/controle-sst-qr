export const painelPadraoDashboard = {
    cards: true,
    pendencias: true,
    conformidade: true,
    colaboradoresFuncao: true,
    rankingEmpresas: true,
    documentosTipo: true,
    ultimosDocumentos: true,
    alertas: true,
};

export const cartasPadraoDashboard = {
    colaboradoresMobilizados: true,
    colaboradoresLiberados: true,
    comPendencia: true,
    emAnalise: true,
    empresasAtivas: true,
    documentosVencidos: true,
    documentosAVencer: true,
    treinamentosVencidos: true,
    colaboradoresBloqueados: true,
    desviosAbertos: true,
    aniversariantesMes: true,
    armazenamentoUtilizado: true,
};

export const tamanhosPadraoCartasDashboard = {
    colaboradoresMobilizados: "padrao",
    colaboradoresLiberados: "padrao",
    comPendencia: "padrao",
    emAnalise: "padrao",
    empresasAtivas: "padrao",
    documentosVencidos: "padrao",
    documentosAVencer: "padrao",
    treinamentosVencidos: "padrao",
    colaboradoresBloqueados: "padrao",
    desviosAbertos: "padrao",
    aniversariantesMes: "padrao",
    armazenamentoUtilizado: "padrao",
};

export const tamanhosPadraoBlocosDashboard = {
    cards: "destaque",
    pendencias: "grande",
    conformidade: "medio",
    rankingEmpresas: "destaque",
    colaboradoresFuncao: "medio",
    alertas: "medio",
    documentosTipo: "medio",
    ultimosDocumentos: "medio",
};

export const ordemPadraoBlocosDashboard = [
    "cards",
    "pendencias",
    "conformidade",
    "rankingEmpresas",
    "colaboradoresFuncao",
    "alertas",
    "documentosTipo",
    "ultimosDocumentos",
];

export const ordemPadraoCartasDashboard = [
    "colaboradoresMobilizados",
    "colaboradoresLiberados",
    "comPendencia",
    "emAnalise",
    "empresasAtivas",
    "documentosVencidos",
    "documentosAVencer",
    "treinamentosVencidos",
    "colaboradoresBloqueados",
    "desviosAbertos",
    "aniversariantesMes",
    "armazenamentoUtilizado",
];

export const opcoesTamanhoCartaDashboard = [
    { chave: "padrao", label: "Padrão", descricao: "1 coluna" },
    { chave: "medio", label: "Médio", descricao: "2 colunas" },
    { chave: "grande", label: "Grande", descricao: "3 colunas" },
    { chave: "destaque", label: "Destaque", descricao: "linha inteira" },
];

export const opcoesPainelDashboard = [
    { chave: "cards", label: "Cards principais" },
    { chave: "pendencias", label: "Pendências críticas" },
    { chave: "conformidade", label: "Resumo de conformidade" },
    { chave: "rankingEmpresas", label: "Ranking por empresa" },
    { chave: "colaboradoresFuncao", label: "Colaboradores por função" },
    { chave: "alertas", label: "Alertas importantes" },
    { chave: "documentosTipo", label: "Documentos por tipo" },
    { chave: "ultimosDocumentos", label: "Últimos documentos enviados" },
];

export const blocosComTamanhoDashboard = opcoesPainelDashboard;

export const opcoesTamanhoBlocoDashboard = [
    { chave: "padrao", label: "Padrão", descricao: "menor" },
    { chave: "medio", label: "Médio", descricao: "metade da linha" },
    { chave: "grande", label: "Grande", descricao: "maior destaque" },
    { chave: "destaque", label: "Destaque", descricao: "linha inteira" },
];

export const blocosRecolhidosPadraoDashboard = {
    pendencias: false,
    conformidade: false,
    rankingEmpresas: false,
    colaboradoresFuncao: false,
    alertas: false,
    documentosTipo: false,
    ultimosDocumentos: false,
};
