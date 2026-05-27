// Constantes e listas fixas do sistema SST.
// Este arquivo foi separado do App.jsx para reduzir acoplamento e facilitar manutenção.

export const TAMANHO_PAGINA_SUPABASE = 1000;

export const estilosGlobais = `
  .scrollbar-discreta {
    scrollbar-width: thin;
    scrollbar-color: #e2e8f0 transparent;
    scrollbar-gutter: stable;
  }

  .scrollbar-discreta::-webkit-scrollbar {
    width: 5px;
    height: 5px;
  }

  .scrollbar-discreta::-webkit-scrollbar-track {
    background: transparent;
    margin: 18px 0;
  }

  .scrollbar-discreta::-webkit-scrollbar-thumb {
    background: #e2e8f0;
    border-radius: 999px;
  }

  .scrollbar-discreta::-webkit-scrollbar-thumb:hover {
    background: #cbd5e1;
  }
`;

export const DAY = 1000 * 60 * 60 * 24;
export const FUNCAO_EMAIL_ALERTA_TST = import.meta.env.VITE_FUNCAO_EMAIL_ALERTA_TST || "rapid-api";
export const LIMITE_STORAGE_MB = Number(import.meta.env.VITE_STORAGE_LIMITE_MB || 1024);

export const UPLOAD_BLOQUEAR_ACIMA_5MB = String(import.meta.env.VITE_BLOQUEAR_UPLOAD_ACIMA_5MB || "true") !== "false";
export const UPLOAD_LIMITE_FORTE_MB = Number(import.meta.env.VITE_UPLOAD_LIMITE_FORTE_MB || 5);
export const UPLOAD_MENSAGEM_ARQUIVO_GRANDE =
    "O arquivo está muito grande. Para reduzir o uso de armazenamento, compacte o PDF antes de enviar. Recomendamos escanear documentos em 150 ou 200 DPI, em preto e branco ou tons de cinza quando possível.";

export const perfisUpload = {
    documentoSimples: {
        rotulo: "Documento simples",
        limiteIdealBytes: 2 * 1024 * 1024,
        limiteForteBytes: UPLOAD_LIMITE_FORTE_MB * 1024 * 1024,
        recomendacao: "até 2 MB",
    },
    documentoExtenso: {
        rotulo: "Documento extenso",
        limiteIdealBytes: 5 * 1024 * 1024,
        limiteForteBytes: UPLOAD_LIMITE_FORTE_MB * 1024 * 1024,
        recomendacao: "até 5 MB",
    },
    fotoAuditoria: {
        rotulo: "Foto / imagem",
        limiteIdealBytes: 800 * 1024,
        limiteForteBytes: UPLOAD_LIMITE_FORTE_MB * 1024 * 1024,
        recomendacao: "preferencialmente até 800 KB",
    },
};

export const treinamentosBase = [
    { id: 21, nome: "Ficha de Registro - CLT / eSocial", validadePadrao: null, categoria: "Documento sem validade", base: "CLT / eSocial / admissional" },

    { id: 1, nome: "NR-01 Integração / Mobilização SST", validadePadrao: 365, categoria: "Obrigatório", base: "NR-01 / Integração de obra" },
    { id: 15, nome: "NR-01 Ordem de Serviço da Função", validadePadrao: 365, categoria: "Documento", base: "NR-01 / Ordem de Serviço" },
    { id: 13, nome: "NR-01 / NR-18 Procedimento Operacional da Função / OS", validadePadrao: 365, categoria: "Atividade", base: "NR-01 / NR-18 / PGR / APR" },
    { id: 8, nome: "NR-06 Uso Correto de EPIs", validadePadrao: 365, categoria: "Obrigatório", base: "NR-06 / NR-01" },
    { id: 14, nome: "NR-06 Ficha de EPIs atualizada", validadePadrao: 365, categoria: "Documento", base: "NR-06 / registro de fornecimento de EPI" },
    { id: 22, nome: "NR-07 ASO - Atestado de Saúde Ocupacional", validadePadrao: 365, categoria: "Documento Médico", base: "NR-07" },
    { id: 4, nome: "NR-10 Segurança em Eletricidade", validadePadrao: 730, categoria: "Elétrica", base: "NR-10" },
    { id: 11, nome: "NR-11 Transporte e Movimentação de Cargas", validadePadrao: 365, categoria: "Movimentação", base: "NR-11" },
    { id: 3, nome: "NR-12 Máquinas e Equipamentos", validadePadrao: 730, categoria: "Operacional", base: "NR-12" },
    { id: 5, nome: "NR-12 / NR-18 PEMT / PTA", validadePadrao: 365, categoria: "Equipamento", base: "NR-18 / NR-12 / fabricante" },
    { id: 7, nome: "NR-12 / NR-18 Lixadeira / Esmerilhadeira", validadePadrao: 365, categoria: "Ferramentas", base: "NR-12 / NR-18" },
    { id: 18, nome: "NR-18 Ergonomia / Orientação Postural", validadePadrao: 365, categoria: "Ergonomia", base: "NR-18 / orientação postural de obra" },
    { id: 9, nome: "NR-18.06 Treinamento de Obra / Construção", validadePadrao: 365, categoria: "Construção", base: "NR-18" },
    { id: 12, nome: "NR-18 Escavação / Abertura de Valas", validadePadrao: 365, categoria: "Construção", base: "NR-18 / procedimento interno" },
    { id: 6, nome: "NR-18 / NR-34 Trabalho a Quente / Solda", validadePadrao: 365, categoria: "Alto Risco", base: "NR-18 / NR-34 como referência técnica" },
    { id: 16, nome: "NR-21 Trabalho a Céu Aberto / Protetor Solar", validadePadrao: 365, categoria: "Ambiental", base: "NR-21 / procedimento interno" },
    { id: 20, nome: "NR-23 Proteção Contra Incêndio", validadePadrao: 365, categoria: "Emergência", base: "NR-23" },
    { id: 17, nome: "NR-25 Meio Ambiente / Resíduos", validadePadrao: 365, categoria: "Meio Ambiente", base: "NR-25 / procedimento interno" },
    { id: 19, nome: "NR-26 Sinalização de Segurança / Vias", validadePadrao: 365, categoria: "Sinalização", base: "NR-26" },
    { id: 10, nome: "NR-33 Espaço Confinado", validadePadrao: 365, categoria: "Alto Risco", base: "NR-33" },
    { id: 2, nome: "NR-35 Trabalho em Altura", validadePadrao: 730, categoria: "Alto Risco", base: "NR-35" },
];

export const documentosEmpresaBase = [
    {
        tipo: "LTCAT",
        nome: "LTCAT",
        validadePadraoDias: 1095,
        regra:
            "Controle interno de 3 anos. Revisar antes do prazo se houver alteração de layout, processo, atividade, equipamentos, agentes nocivos, EPCs, EPIs ou medidas de controle.",
        fundamento: "Base legal: previdenciária/eSocial.",
    },
    {
        tipo: "PCMSO",
        nome: "PCMSO",
        validadePadraoDias: 365,
        regra:
            "Controle anual recomendado, com base nos riscos do PGR, exames ocupacionais, mudanças de função ou alteração da exposição ocupacional.",
        fundamento: "Base normativa: NR-07 e PGR/NR-01.",
    },
    {
        tipo: "PGR",
        nome: "PGR",
        validadePadraoDias: 730,
        regra:
            "Revisar no mínimo a cada 2 anos ou quando houver mudança em processos, layout, equipamentos, medidas de prevenção ou ocorrência relevante.",
        fundamento: "Base normativa: NR-01/GRO/PGR.",
    },
];

export const STATUS_CLASSIFICACAO_COLABORADOR = [
    "Liberado",
    "Com pendência",
    "Bloqueado",
    "Em análise",
    "Desmobilizado",
    "Inativo",
];

export const IDS_DOCUMENTOS_CRITICOS_COLABORADOR = [1, 14, 15, 21, 22];

export const treinamentosBaseObra = [1, 14, 15, 8, 9, 16, 17, 18, 20, 21, 22];

export const matrizTreinamentosPorFuncao = [
    {
        chave: "pedreiro",
        rotulo: "PEDREIRO",
        termos: ["pedreiro", "alvenaria", "bloquete", "pavimentador", "calceteiro"],
        treinamentos: [...treinamentosBaseObra, 11, 13],
    },
    {
        chave: "ajudante",
        rotulo: "AJUDANTE",
        termos: ["ajudante", "servente", "auxiliar"],
        treinamentos: [...treinamentosBaseObra, 11, 13],
    },
    {
        chave: "encarregado",
        rotulo: "ENCARREGADO",
        termos: ["encarregado", "mestre de obras", "supervisor"],
        treinamentos: [...treinamentosBaseObra, 11, 13],
    },
    {
        chave: "carpinteiro",
        rotulo: "CARPINTEIRO",
        termos: ["carpinteiro", "formas", "forma"],
        treinamentos: [...treinamentosBaseObra, 2, 3, 7, 11, 13],
    },
    {
        chave: "op-betoneira",
        rotulo: "OP. DE BETONEIRA",
        termos: ["betoneira", "op. de betoneira", "operador de betoneira"],
        treinamentos: [...treinamentosBaseObra, 3, 11, 13],
    },
    {
        chave: "tecnico-sst",
        rotulo: "TEC. SEG. DO TRAB.",
        termos: ["tecnico de seguranca", "técnico de segurança", "tec. seg", "seguranca do trabalho", "segurança do trabalho", "sst"],
        treinamentos: [...treinamentosBaseObra, 13],
    },
    {
        chave: "lider",
        rotulo: "LÍDER",
        termos: ["lider", "líder", "liderança"],
        treinamentos: [...treinamentosBaseObra, 11, 13],
    },
    {
        chave: "motorista",
        rotulo: "MOTORISTA",
        termos: ["motorista", "condutor"],
        treinamentos: [...treinamentosBaseObra, 11, 19, 13],
    },
    {
        chave: "armador",
        rotulo: "ARMADOR",
        termos: ["armador", "armação", "armacao", "ferreiro"],
        treinamentos: [...treinamentosBaseObra, 2, 11, 13],
    },
    {
        chave: "op-maquinas",
        rotulo: "OP. DE MÁQUINAS",
        termos: ["op. de maquinas", "op de maquinas", "operador de maquinas", "operador de máquinas", "maquinas", "máquinas", "retroescavadeira", "escavadeira", "pa carregadeira", "pá carregadeira"],
        treinamentos: [...treinamentosBaseObra, 3, 11, 19, 13],
    },
    {
        chave: "greidista",
        rotulo: "GREIDISTA",
        termos: ["greidista", "greide", "nivelamento"],
        treinamentos: [...treinamentosBaseObra, 3, 11, 19, 13],
    },
    {
        chave: "soldador",
        rotulo: "SOLDADOR / TRABALHO A QUENTE",
        termos: ["soldador", "solda", "caldeireiro"],
        treinamentos: [...treinamentosBaseObra, 3, 6, 7, 13],
    },
    {
        chave: "operador-pemt",
        rotulo: "OPERADOR DE PEMT / PTA",
        termos: ["pemt", "pta", "plataforma", "cesto", "elevatoria", "elevatória"],
        treinamentos: [...treinamentosBaseObra, 2, 3, 5, 13],
    },
    {
        chave: "eletricista",
        rotulo: "ELETRICISTA",
        termos: ["eletricista", "eletrica", "elétrica", "eletrico", "elétrico"],
        treinamentos: [...treinamentosBaseObra, 2, 3, 4, 13],
    },
    {
        chave: "geral",
        rotulo: "MATRIZ BÁSICA DE OBRA",
        termos: [],
        treinamentos: [...treinamentosBaseObra, 13],
    },
];

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
