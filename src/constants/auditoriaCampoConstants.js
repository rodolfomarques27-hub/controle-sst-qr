// Constantes de auditoria de campo.

export const respostasAuditoriaCampo = [
    { chave: "conforme", texto: "Conforme", pontos: 10, descricaoPontuacao: "10 pontos" },
    { chave: "observacao_leve", texto: "Observação leve", pontos: 8, descricaoPontuacao: "8 pontos" },
    { chave: "nao_conforme", texto: "Não conforme", pontos: 5, descricaoPontuacao: "5 pontos" },
    { chave: "desvio_grave", texto: "Desvio grave", pontos: 0, descricaoPontuacao: "0 ponto + ação imediata" },
    { chave: "nao_aplicavel", texto: "Não aplicável", pontos: 0, descricaoPontuacao: "Ignora o cálculo" },
];
export const categoriasAuditoriaCampo = [
    { chave: "epi", texto: "EPI" },
    { chave: "frente_trabalho", texto: "Frente de trabalho" },
    { chave: "comportamento_seguro", texto: "Comportamento seguro" },
];
export const statusDesvioAuditoriaCampo = ["Aberto", "Em tratativa", "Corrigido", "Cancelado"];
export const gravidadesAuditoriaCampo = ["Leve", "Moderada", "Grave", "Crítica"];
export const tiposAuditoriaCampoDireta = [
    { valor: "area", label: "Área", parametros: ["area"], grupo: "area" },
    { valor: "area_externa", label: "Área externa", parametros: ["externa", "area-externa", "area_externa"], grupo: "area" },
    { valor: "maquina", label: "Máquina", parametros: ["maquina", "máquina"], grupo: "maquina" },
    { valor: "equipamento", label: "Equipamento", parametros: ["equipamento"], grupo: "maquina" },
    { valor: "container", label: "Container", parametros: ["container", "contêiner", "conteiner"], grupo: "area" },
    { valor: "banheiro", label: "Banheiro", parametros: ["banheiro", "sanitario", "sanitário"], grupo: "area" },
    { valor: "veiculo", label: "Veículo", parametros: ["veiculo", "veículo"], grupo: "maquina" },
    { valor: "frente_servico", label: "Frente de serviço", parametros: ["frente-servico", "frente_servico", "frente"], grupo: "frente" },
    { valor: "almoxarifado", label: "Almoxarifado", parametros: ["almoxarifado"], grupo: "area" },
    { valor: "instalacao_provisoria", label: "Instalação provisória", parametros: ["instalacao-provisoria", "instalacao_provisoria", "instalação-provisória"], grupo: "area" },
    { valor: "auditoria_interna_geral", label: "Auditoria interna geral", parametros: ["auditoria-interna-geral", "auditoria_interna_geral", "geral"], grupo: "geral" },
    { valor: "outro", label: "Outro", parametros: ["outro"], grupo: "geral" },
];
export const categoriasPadronizadasAuditoriaCampo = [
    { valor: "isolamento", label: "Isolamento" },
    { valor: "organizacao_area", label: "Organização de área" },
    { valor: "sinalizacao", label: "Sinalização" },
    { valor: "acesso_seguro", label: "Acesso seguro" },
    { valor: "risco_queda", label: "Risco de queda" },
    { valor: "risco_atropelamento", label: "Risco de atropelamento" },
    { valor: "transito_maquinas", label: "Trânsito de máquinas" },
    { valor: "maquina_defeito", label: "Máquina com defeito" },
    { valor: "maquina_improvisacao", label: "Máquina com improvisação" },
    { valor: "vazamento", label: "Vazamento" },
    { valor: "epi", label: "EPI" },
    { valor: "outro", label: "Outro" },
];
export const statusAuditoriaCampoDireta = ["Aberta", "Em andamento", "Resolvida", "Cancelada", "Vencida"];
export const grausRiscoAuditoriaCampoDireta = ["Baixo", "Médio", "Alto", "Crítico"];
export const descricoesGrauRiscoAuditoriaCampoDireta = {
    Baixo: "Condição simples, sem risco imediato. Pode ser tratada na rotina normal.",
    Médio: "Pode gerar incidente ou desvio se não for corrigida. Requer prazo e responsável.",
    Alto: "Risco relevante para pessoas, máquinas ou operação. Priorizar correção e acompanhamento.",
    Crítico: "Risco grave ou iminente. Exige ação imediata e controle antes da continuidade da atividade.",
};
export const checklistDinamicoAuditoriaCampo = {
    area: [
        "Organização e limpeza",
        "Isolamento adequado",
        "Sinalização",
        "Acesso seguro",
        "Risco de queda",
        "Risco de atropelamento",
        "Trânsito de máquinas",
        "Armazenamento de materiais",
        "Iluminação",
        "Interferência com pedestres",
    ],
    maquina: [
        "Proteções instaladas",
        "Botão de emergência",
        "Sinalização da máquina",
        "Vazamentos",
        "Partes móveis protegidas",
        "Condição elétrica",
        "Condição mecânica",
        "Bloqueio de energia",
        "Acesso seguro",
        "Condição geral do equipamento",
    ],
    frente: [
        "APR disponível",
        "Equipe orientada",
        "EPIs utilizados",
        "Ferramentas adequadas",
        "Isolamento da atividade",
        "Riscos críticos controlados",
        "Permissão de trabalho, quando aplicável",
        "Organização da frente de serviço",
    ],
    geral: [
        "Condição segura do local",
        "Organização e limpeza",
        "Sinalização aplicável",
        "Riscos críticos controlados",
        "Ação recomendada definida",
    ],
};
