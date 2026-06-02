// Constantes de documentos de empresa.

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
