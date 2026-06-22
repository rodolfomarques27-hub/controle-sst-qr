// Constantes de treinamentos, documentos de colaborador e matriz por função.

export const treinamentosBase = [
    { id: 21, nome: "Ficha de Registro - CLT / eSocial", validadePadrao: null, categoria: "Documento sem validade", base: "CLT / eSocial / admissional" },

    { id: 1, nome: "NR-01 Integração / Mobilização SST", validadePadrao: null, categoria: "Documento sem validade", base: "NR-01 / Integração de obra" },
    { id: 15, nome: "NR-01 Ordem de Serviço da Função", validadePadrao: null, categoria: "Documento sem validade", base: "NR-01 / Ordem de Serviço" },
    { id: 8, nome: "NR-06 Uso Correto de EPIs", validadePadrao: 365, categoria: "Obrigatório", base: "NR-06 / NR-01" },
    { id: 14, nome: "NR-06 Ficha de EPIs atualizada", validadePadrao: null, categoria: "Documento sem validade", base: "NR-06 / registro de fornecimento de EPI" },
    { id: 22, nome: "NR-07 ASO - Atestado de Saúde Ocupacional", validadePadrao: 365, categoria: "Documento Médico", base: "NR-07" },
    { id: 4, nome: "NR-10 Segurança em Eletricidade", validadePadrao: 730, categoria: "Elétrica", base: "NR-10" },
    { id: 11, nome: "NR-11 Transporte e Movimentação de Cargas", validadePadrao: 365, categoria: "Movimentação", base: "NR-11" },
    { id: 3, nome: "NR-12 Máquinas e Equipamentos", validadePadrao: 730, categoria: "Operacional", base: "NR-12" },
    { id: 5, nome: "NR-12 / NR-18 PEMT / PTA", validadePadrao: 365, categoria: "Equipamento", base: "NR-18 / NR-12 / fabricante" },
    { id: 7, nome: "NR-12 / NR-18 Lixadeira / Esmerilhadeira", validadePadrao: 365, categoria: "Ferramentas", base: "NR-12 / NR-18" },
    { id: 18, nome: "NR-17 Ergonomia / Orientação Postural", validadePadrao: 365, categoria: "Ergonomia", base: "NR-17 / ergonomia" },
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
        treinamentos: [...treinamentosBaseObra, 11],
    },
    {
        chave: "ajudante",
        rotulo: "AJUDANTE",
        termos: ["ajudante", "servente", "auxiliar"],
        treinamentos: [...treinamentosBaseObra, 11],
    },
    {
        chave: "encarregado",
        rotulo: "ENCARREGADO",
        termos: ["encarregado", "mestre de obras", "supervisor"],
        treinamentos: [...treinamentosBaseObra, 11],
    },
    {
        chave: "carpinteiro",
        rotulo: "CARPINTEIRO",
        termos: ["carpinteiro", "formas", "forma"],
        treinamentos: [...treinamentosBaseObra, 2, 3, 7, 11],
    },
    {
        chave: "op-betoneira",
        rotulo: "OP. DE BETONEIRA",
        termos: ["betoneira", "op. de betoneira", "operador de betoneira"],
        treinamentos: [...treinamentosBaseObra, 3, 11],
    },
    {
        chave: "tecnico-sst",
        rotulo: "TEC. SEG. DO TRAB.",
        termos: ["tecnico de seguranca", "técnico de segurança", "tec. seg", "seguranca do trabalho", "segurança do trabalho", "sst"],
        treinamentos: [...treinamentosBaseObra],
    },
    {
        chave: "lider",
        rotulo: "LÍDER",
        termos: ["lider", "líder", "liderança"],
        treinamentos: [...treinamentosBaseObra, 11],
    },
    {
        chave: "motorista",
        rotulo: "MOTORISTA",
        termos: ["motorista", "condutor"],
        treinamentos: [...treinamentosBaseObra, 11, 19],
    },
    {
        chave: "armador",
        rotulo: "ARMADOR",
        termos: ["armador", "armação", "armacao", "ferreiro"],
        treinamentos: [...treinamentosBaseObra, 2, 11],
    },
    {
        chave: "op-maquinas",
        rotulo: "OP. DE MÁQUINAS",
        termos: ["op. de maquinas", "op de maquinas", "operador de maquinas", "operador de máquinas", "maquinas", "máquinas", "retroescavadeira", "escavadeira", "pa carregadeira", "pá carregadeira"],
        treinamentos: [...treinamentosBaseObra, 3, 11, 19],
    },
    {
        chave: "greidista",
        rotulo: "GREIDISTA",
        termos: ["greidista", "greide", "nivelamento"],
        treinamentos: [...treinamentosBaseObra, 3, 11, 19],
    },
    {
        chave: "soldador",
        rotulo: "SOLDADOR / TRABALHO A QUENTE",
        termos: ["soldador", "solda", "caldeireiro"],
        treinamentos: [...treinamentosBaseObra, 3, 6, 7],
    },
    {
        chave: "operador-pemt",
        rotulo: "OPERADOR DE PEMT / PTA",
        termos: ["pemt", "pta", "plataforma", "cesto", "elevatoria", "elevatória"],
        treinamentos: [...treinamentosBaseObra, 2, 3, 5],
    },
    {
        chave: "eletricista",
        rotulo: "ELETRICISTA",
        termos: ["eletricista", "eletrica", "elétrica", "eletrico", "elétrico"],
        treinamentos: [...treinamentosBaseObra, 2, 3, 4],
    },
    {
        chave: "geral",
        rotulo: "MATRIZ BÁSICA DE OBRA",
        termos: [],
        treinamentos: [...treinamentosBaseObra],
    },
];
