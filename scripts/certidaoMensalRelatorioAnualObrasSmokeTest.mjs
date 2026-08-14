import assert from "node:assert/strict";

import {
    agruparRelatorioAnualPorObras,
    OBRA_SEM_VINCULO_ID,
} from "../src/features/certidao-mensal-documental/services/certidaoMensalRelatorioAnualObrasService.js";

const empresasBanco = [
    {
        id: "contratante-01",
        nome: "CONTRATANTE ALFA",
        cnpj: "00.000.000/0001-01",
        tipo_empresa: "Contratante",
        logoUrl: "https://exemplo.local/alfa.png",
    },
    {
        id: "empresa-01",
        nome: "EMPRESA A",
        tipo_empresa: "Contratada",
        empresa_pai_id: "contratante-01",
    },
    {
        id: "empresa-02",
        nome: "EMPRESA B",
        tipo_empresa: "Contratada",
        empresa_pai_id: "contratante-01",
    },
    {
        id: "contratante-02",
        nome: "CONTRATANTE BETA",
        cnpj: "00.000.000/0001-02",
        tipo_empresa: "Contratante",
        logoUrl: "https://exemplo.local/beta.png",
    },
    {
        id: "empresa-03",
        nome: "EMPRESA C",
        tipo_empresa: "Subcontratada",
        empresa_pai_id: "contratante-02",
    },
    {
        id: "empresa-04",
        nome: "EMPRESA SEM OBRA",
        tipo_empresa: "Contratada",
        empresa_pai_id: "contratante-01",
    },
];

const relatorio = {
    ano: 2026,
    empresas: [
        {
            id: "empresa-01",
            nome: "EMPRESA A",
            totalConformes: 8,
            totalPendentes: 2,
        },
        {
            id: "empresa-02",
            nome: "EMPRESA B",
            totalConformes: 6,
            totalPendentes: 4,
        },
        {
            id: "empresa-03",
            nome: "EMPRESA C",
            totalConformes: 9,
            totalPendentes: 1,
        },
        {
            id: "empresa-04",
            nome: "EMPRESA SEM OBRA",
            totalConformes: 5,
            totalPendentes: 5,
        },
    ],
};

const obrasEmpresasBanco = [
    {
        id: "vinculo-01",
        empresaId: "contratante-01",
        obraId: "obra-01",
        status: "Ativa",
        obra: {
            id: "obra-01",
            nome: "OBRA INDUSTRIAL ALFA",
            numeroObra: "001",
            status: "Ativa",
        },
    },
    {
        id: "vinculo-02",
        empresaId: "empresa-01",
        obraId: "obra-01",
        status: "Ativa",
        obra: {
            id: "obra-01",
            nome: "OBRA INDUSTRIAL ALFA",
            numeroObra: "001",
            status: "Ativa",
        },
    },
    {
        id: "vinculo-03",
        empresaId: "empresa-02",
        obraId: "obra-01",
        status: "Ativa",
        obra: {
            id: "obra-01",
            nome: "OBRA INDUSTRIAL ALFA",
            numeroObra: "001",
            status: "Ativa",
        },
    },

    // duplicado proposital: não deve duplicar a empresa
    {
        id: "vinculo-04",
        empresaId: "empresa-02",
        obraId: "obra-01",
        status: "Ativa",
        obra: {
            id: "obra-01",
            nome: "OBRA INDUSTRIAL ALFA",
            numeroObra: "001",
            status: "Ativa",
        },
    },

    // Contratante 02 não está vinculada diretamente.
    // Deve ser encontrada pelo empresa_pai_id da empresa 03.
    {
        id: "vinculo-05",
        empresaId: "empresa-03",
        obraId: "obra-02",
        status: "Ativa",
        obra: {
            id: "obra-02",
            nome: "OBRA BETA",
            numeroObra: "002",
            status: "Ativa",
        },
    },

    // vínculo inativo não pode entrar
    {
        id: "vinculo-06",
        empresaId: "empresa-04",
        obraId: "obra-inativa",
        status: "Inativa",
        obra: {
            id: "obra-inativa",
            nome: "OBRA INATIVA",
            status: "Inativa",
        },
    },
];

const obras =
    agruparRelatorioAnualPorObras({
        relatorio,
        empresasBanco,
        obrasEmpresasBanco,
    });

assert.equal(
    obras.length,
    3,
    "Devem existir duas obras reais e o bloco sem obra.",
);

const obraAlfa =
    obras.find(
        (obra) =>
            obra.id === "obra-01",
    );

const obraBeta =
    obras.find(
        (obra) =>
            obra.id === "obra-02",
    );

const semObra =
    obras.find(
        (obra) =>
            obra.id === OBRA_SEM_VINCULO_ID,
    );

assert.ok(
    obraAlfa,
    "Obra Alfa deve existir.",
);

assert.ok(
    obraBeta,
    "Obra Beta deve existir.",
);

assert.ok(
    semObra,
    "Bloco sem obra deve existir.",
);

assert.equal(
    obraAlfa.nome,
    "OBRA INDUSTRIAL ALFA",
);

assert.equal(
    obraAlfa.totalEmpresas,
    2,
    "Vínculos duplicados não podem duplicar empresas.",
);

assert.deepEqual(
    obraAlfa.empresas.map(
        (empresa) =>
            empresa.id,
    ),
    [
        "empresa-01",
        "empresa-02",
    ],
);

assert.equal(
    obraAlfa.contratante?.id,
    "contratante-01",
);

assert.equal(
    obraAlfa.contratante?.nome,
    "CONTRATANTE ALFA",
);

assert.equal(
    obraAlfa.contratante?.logoUrl,
    "https://exemplo.local/alfa.png",
);

assert.equal(
    obraAlfa.totais.conformes,
    14,
);

assert.equal(
    obraAlfa.totais.pendentes,
    6,
);

assert.equal(
    obraAlfa.totais.percentualConforme,
    70,
);

assert.equal(
    obraAlfa.totais.percentualPendente,
    30,
);

assert.equal(
    obraBeta.totalEmpresas,
    1,
);

assert.equal(
    obraBeta.contratante?.id,
    "contratante-02",
    "Contratante deve ser localizada pelo vínculo hierárquico.",
);

assert.equal(
    obraBeta.totais.percentualConforme,
    90,
);

assert.equal(
    obraBeta.totais.percentualPendente,
    10,
);

assert.equal(
    semObra.semVinculo,
    true,
);

assert.equal(
    semObra.totalEmpresas,
    1,
);

assert.equal(
    semObra.empresas[0].id,
    "empresa-04",
);

assert.equal(
    semObra.contratante?.id,
    "contratante-01",
);

assert.equal(
    semObra.totais.percentualConforme,
    50,
);

assert.equal(
    semObra.totais.percentualPendente,
    50,
);

const idsTodasEmpresas =
    obras.flatMap(
        (obra) =>
            obra.empresas.map(
                (empresa) =>
                    empresa.id,
            ),
    );

assert.deepEqual(
    [...idsTodasEmpresas].sort(),
    [
        "empresa-01",
        "empresa-02",
        "empresa-03",
        "empresa-04",
    ],
    "Nenhuma empresa fiscalizável pode desaparecer.",
);

const {
    resolverContratanteCabecalhoRelatorioAnual,
} = await import(
    "../src/features/certidao-mensal-documental/services/certidaoMensalRelatorioAnualObrasService.js"
);

/*
 * A marca institucional precisa vir da classificação canônica
 * do cadastro, e não da posição da empresa ou da ordem das obras.
 */
const empresasCabecalho = [
    {
        id:
            "empresa-terceirizada-01",

        nome:
            "EMPRESA TERCEIRIZADA",

        tipo_empresa:
            "Terceirizada",
    },

    {
        id:
            "empresa-idealiza",

        nome:
            "IDEALIZA CIDADES",

        tipo_empresa:
            "Contratante - Idealiza Cidades",

        logo_url:
            "https://exemplo.local/idealiza.png",
    },

    {
        id:
            "empresa-outra-contratante",

        nome:
            "OUTRA CONTRATANTE",

        tipo_empresa:
            "Contratante",
    },
];

const cabecalhoA =
    resolverContratanteCabecalhoRelatorioAnual({
        empresasBanco:
            empresasCabecalho,
    });

const cabecalhoB =
    resolverContratanteCabecalhoRelatorioAnual({
        empresasBanco:
            [...empresasCabecalho]
                .reverse(),
    });

assert.equal(
    cabecalhoA?.id,
    "empresa-idealiza",
    "O cadastro Contratante - Idealiza Cidades deve definir a marca institucional.",
);

assert.equal(
    cabecalhoB?.id,
    "empresa-idealiza",
    "A ordem de empresas ou obras não pode alterar a contratante institucional.",
);

const cabecalhoTipoNormalizado =
    resolverContratanteCabecalhoRelatorioAnual({
        empresasBanco: [
            {
                id:
                    "empresa-idealiza-normalizada",

                nome:
                    "IDEALIZA CIDADES",

                tipo_empresa:
                    "  CONTRATANTE - IDEALIZA CIDADES  ",
            },
        ],
    });

assert.equal(
    cabecalhoTipoNormalizado?.id,
    "empresa-idealiza-normalizada",
    "A classificação institucional deve tolerar diferenças de caixa e espaços.",
);

const semContratanteCanonica =
    resolverContratanteCabecalhoRelatorioAnual({
        empresasBanco: [
            {
                id:
                    "empresa-comum",

                nome:
                    "EMPRESA COMUM",

                tipo_empresa:
                    "Terceirizada",
            },
        ],
    });

assert.equal(
    semContratanteCanonica,
    null,
    "Sem cadastro institucional canônico, o resolver explícito deve retornar null.",
);

console.log(
    "CERTIDÃO MENSAL — AGRUPAMENTO ANUAL POR OBRA APROVADO",
);

console.log(
    "Cenários validados: separação por obra, contratante vinculada, contratante por empresa-pai, deduplicação, vínculos inativos ignorados, percentuais por obra e preservação de empresa sem obra.",
);

console.log(
    "Nenhuma conexão real, alteração de banco, impressão, deploy ou e-mail foi executado.",
);