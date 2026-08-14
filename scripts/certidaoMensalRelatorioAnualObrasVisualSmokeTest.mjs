import assert from "node:assert/strict";

import {
    gerarHtmlRelatorioAnualCertidaoMensal,
} from "../src/features/certidao-mensal-documental/services/certidaoMensalRelatorioAnualHtmlService.js";

function criarMes(indice) {
    return {
        mes: indice + 1,
        conformes:
            indice % 2 === 0
                ? 1
                : 0,
        pendentes:
            indice % 2 === 0
                ? 0
                : 1,
    };
}

function criarEmpresa(id, nome) {
    return {
        id,
        nome,
        cnpj:
            "00.000.000/0001-00",
        funcionarios: 10,
        logoUrl: "",
        meses:
            Array.from(
                { length: 12 },
                (_, indice) =>
                    criarMes(indice),
            ),
        totalConformes: 6,
        totalPendentes: 6,
        totalClassificado: 12,
    };
}

const empresasAlfa =
    Array.from(
        { length: 8 },
        (_, indice) =>
            criarEmpresa(
                `alfa-${indice + 1}`,
                `EMPRESA ALFA ${indice + 1}`,
            ),
    );

const empresasBeta = [
    criarEmpresa(
        "beta-1",
        "EMPRESA BETA 1",
    ),
];

const todasEmpresas = [
    ...empresasAlfa,
    ...empresasBeta,
];

const dados = {
    ano: 2026,
    geradoEm:
        new Date(
            "2026-08-07T08:00:00-03:00",
        ),
    empresas:
        todasEmpresas,
    totais: {
        conformes: 0,
        pendentes: 0,
        classificados: 0,
        percentualConforme: 0,
        percentualPendente: 0,
    },
    obras: [
        {
            id: "obra-alfa",
            nome:
                "OBRA INDUSTRIAL ALFA",
            numeroObra: "001",
            contratante: {
                id:
                    "contratante-alfa",
                nome:
                    "CONTRATANTE ALFA",
                cnpj:
                    "11.111.111/0001-11",
                logoUrl:
                    "https://exemplo.local/logo-alfa.png",
            },
            empresas:
                empresasAlfa,
            totais: {
                conformes: 70,
                pendentes: 30,
                classificados: 100,
                percentualConforme: 70,
                percentualPendente: 30,
            },
        },
        {
            id: "obra-beta",
            nome:
                "OBRA BETA",
            numeroObra: "002",
            contratante: {
                id:
                    "contratante-beta",
                nome:
                    "CONTRATANTE BETA",
                cnpj:
                    "22.222.222/0001-22",
                logoUrl:
                    "https://exemplo.local/logo-beta.png",
            },
            empresas:
                empresasBeta,
            totais: {
                conformes: 90,
                pendentes: 10,
                classificados: 100,
                percentualConforme: 90,
                percentualPendente: 10,
            },
        },
    ],
};

const html =
    gerarHtmlRelatorioAnualCertidaoMensal(
        dados,
    );

assert.ok(
    html.includes(
        "Relatório Anual de Pendências Documentais",
    ),
    "Título anual deve permanecer.",
);

assert.ok(
    html.includes(
        "CONTRATANTE ALFA",
    ),
);

assert.ok(
    html.includes(
        "CONTRATANTE BETA",
    ),
);

assert.ok(
    html.includes(
        "OBRA INDUSTRIAL ALFA",
    ),
);

assert.ok(
    html.includes(
        "OBRA BETA",
    ),
);

assert.ok(
    html.includes(
        "https://exemplo.local/logo-alfa.png",
    ),
    "Logo da primeira contratante deve permanecer.",
);

assert.ok(
    html.includes(
        "https://exemplo.local/logo-beta.png",
    ),
    "Logo da segunda contratante deve permanecer.",
);

assert.ok(
    html.includes(
        "70%",
    ),
    "Percentual Conforme da Obra Alfa deve existir.",
);

assert.ok(
    html.includes(
        "30%",
    ),
    "Percentual Pendente da Obra Alfa deve existir.",
);

assert.ok(
    html.includes(
        "90%",
    ),
    "Percentual Conforme da Obra Beta deve existir.",
);

assert.ok(
    html.includes(
        "10%",
    ),
    "Percentual Pendente da Obra Beta deve existir.",
);

assert.ok(
    html.includes(
        "Página 1 de 2",
    ),
    "A primeira página deve existir.",
);

assert.ok(
    html.includes(
        "Página 2 de 2",
    ),
    "A segunda página deve existir.",
);

assert.equal(
    html.includes(
        "Página 3 de",
    ),
    false,
    "O cenário deve utilizar somente duas páginas físicas.",
);

const paginas =
    html
        .split(
            /<article\s+class="pagina-relatorio"[^>]*>/,
        )
        .slice(1);

assert.equal(
    paginas.length,
    2,
    "A paginação deve aproveitar o espaço físico disponível.",
);

const cabecalhos =
    Array.from(
        html.matchAll(
            /<header class="cabecalho-relatorio">([\s\S]*?)<\/header>/g,
        ),
        (resultado) =>
            resultado[1],
    );

assert.equal(
    cabecalhos.length,
    2,
    "Cada página deve possuir um cabeçalho geral.",
);

cabecalhos.forEach(
    (cabecalho) => {
        assert.ok(
            cabecalho.includes(
                "CONTRATANTE ALFA",
            ),
            "A marca institucional deve permanecer fixa em todos os cabeçalhos.",
        );

        assert.ok(
            cabecalho.includes(
                "https://exemplo.local/logo-alfa.png",
            ),
            "O mesmo logo institucional deve aparecer em todas as páginas.",
        );

        assert.equal(
            cabecalho.includes(
                "https://exemplo.local/logo-beta.png",
            ),
            false,
            "A marca do cabeçalho não deve mudar por causa do bloco seguinte.",
        );
    },
);

assert.ok(
    paginas[0].includes(
        "EMPRESA ALFA 1",
    ),
);

assert.ok(
    paginas[0].includes(
        "EMPRESA ALFA 7",
    ),
    "A sétima empresa deve permanecer na primeira página porque 7 empresas ocupam 160,4 mm dentro dos 165 mm físicos disponíveis.",
);

assert.equal(
    paginas[0].includes(
        "EMPRESA ALFA 8",
    ),
    false,
    "A oitava empresa deve continuar na segunda página.",
);

assert.equal(
    paginas[1].includes(
        "EMPRESA ALFA 7",
    ),
    false,
    "A sétima empresa não deve ser deslocada desnecessariamente para a segunda página.",
);

assert.ok(
    paginas[1].includes(
        "EMPRESA ALFA 8",
    ),
    "Somente a oitava empresa deve iniciar a continuação da primeira obra.",
);

assert.ok(
    paginas[1].includes(
        "continuação",
    ),
    "A obra fracionada deve indicar continuação.",
);

assert.ok(
    paginas[1].includes(
        "OBRA BETA",
    ),
    "A segunda obra deve aproveitar o espaço físico restante.",
);

assert.ok(
    paginas[1].includes(
        "EMPRESA BETA 1",
    ),
    "A empresa Beta deve compartilhar a segunda folha quando houver capacidade.",
);

assert.ok(
    paginas[1].includes(
        "CONTRATANTE BETA",
    ),
    "A identificação da Contratante Beta deve permanecer no bloco da própria obra.",
);

assert.equal(
    html.includes(
        "Em análise",
    ),
    false,
);

assert.equal(
    html.includes(
        "Vencido",
    ),
    false,
);

assert.equal(
    html.includes(
        "<select",
    ),
    false,
    "O relatório não deve possuir seletor de obra.",
);

console.log(
    "CERTIDÃO MENSAL — PAGINAÇÃO MULTIOBRA APROVADA",
);

console.log(
    "Cenário validado: obra com 8 empresas em 7 + 1, capacidade física real de 165 mm preservada e segunda obra aproveitando o espaço restante da folha.",
);

console.log(
    "Contratantes, logos, percentuais independentes, Conforme/Pendente e ausência de seletor preservados.",
);