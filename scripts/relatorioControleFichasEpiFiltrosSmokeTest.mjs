import assert from "node:assert/strict";

import {
    aplicarFiltrosControleFichasEpi,
    classificarControleFichaEpi,
    normalizarFiltrosControleFichasEpi,
    normalizarTextoFiltroEpi,
    obterFiltrosControleFichasEpiParaExibicao,
} from "../src/services/exportacao/relatorioControleFichasEpiFiltros.js";

const lista = [
    {
        nome: "Ana Souza",
        funcao: "Eletricista",
        empresa: "RIBEIRO AQUINO",
        situacao: "CONFORME",
        fichaTexto: "LOCALIZADA",
        controle12m: "EM DIA",
        controle12mRevisar: false,
    },

    {
        nome: "João Lima",
        funcao: "Soldador",
        empresa: "RIBEIRO AQUINO",
        situacao: "PENDENTE",
        fichaTexto: "NÃO CADASTRADA",
        controle12m: "-",
        controle12mRevisar: false,
    },

    /*
     * Caso real mais importante:
     *
     * ficha documental CONFORME,
     * porém sem atualização dentro
     * do ciclo administrativo de 12 meses.
     */
    {
        nome: "Maria Oliveira",
        funcao: "Técnica de Segurança",
        empresa: "RIBEIRO AQUINO",
        situacao: "CONFORME",
        fichaTexto: "LOCALIZADA",
        controle12m: "REVISAR",
        controle12mRevisar: true,
    },

    /*
     * Registro incompleto:
     * documentalmente REVISAR porque
     * falta arquivo/data.
     *
     * No filtro simplificado isso é
     * PENDÊNCIA, não revisão de 12 meses.
     */
    {
        nome: "Carlos Rocha",
        funcao: "Pedreiro",
        empresa: "Beta Engenharia",
        situacao: "REVISAR",
        fichaTexto: "SEM ARQUIVO",
        controle12m: "-",
        controle12mRevisar: false,
    },
];

assert.equal(
    normalizarTextoFiltroEpi(
        "Técnica João"
    ),
    "tecnica joao"
);

assert.deepEqual(
    normalizarFiltrosControleFichasEpi(),
    {
        busca: "",
        empresa: "Todas",
        classificacao: "TODOS",
        classificacaoExibicao: "Todos",
    }
);

/*
 * CLASSIFICAÇÃO FINAL.
 */
assert.equal(
    classificarControleFichaEpi(
        lista[0]
    ),
    "CONFORME"
);

assert.equal(
    classificarControleFichaEpi(
        lista[1]
    ),
    "PENDENTE"
);

assert.equal(
    classificarControleFichaEpi(
        lista[2]
    ),
    "REVISAR_CONTROLE"
);

assert.equal(
    classificarControleFichaEpi(
        lista[3]
    ),
    "PENDENTE"
);

/*
 * TODOS.
 */
assert.equal(
    aplicarFiltrosControleFichasEpi(
        lista,
        {}
    ).length,
    4
);

/*
 * CONFORME:
 *
 * Maria NÃO entra porque passou
 * dos 12 meses.
 */
assert.deepEqual(
    aplicarFiltrosControleFichasEpi(
        lista,
        {
            classificacaoEpi:
                "Conforme",
        }
    ).map(
        (item) =>
            item.nome
    ),
    [
        "Ana Souza",
    ]
);

/*
 * REVISAR CONTROLE:
 *
 * somente quem está documentalmente
 * válido e ultrapassou 12 meses.
 */
assert.deepEqual(
    aplicarFiltrosControleFichasEpi(
        lista,
        {
            classificacaoEpi:
                "Revisar controle",
        }
    ).map(
        (item) =>
            item.nome
    ),
    [
        "Maria Oliveira",
    ]
);

/*
 * PENDENTE:
 *
 * sem ficha OU ficha incompleta.
 */
assert.deepEqual(
    aplicarFiltrosControleFichasEpi(
        lista,
        {
            classificacaoEpi:
                "Pendente",
        }
    ).map(
        (item) =>
            item.nome
    ),
    [
        "João Lima",
        "Carlos Rocha",
    ]
);

/*
 * EMPRESA + REVISAR CONTROLE.
 *
 * Caso que estava falhando na tela.
 */
assert.deepEqual(
    aplicarFiltrosControleFichasEpi(
        lista,
        {
            empresa:
                "RIBEIRO AQUINO",

            classificacaoEpi:
                "Revisar controle",
        }
    ).map(
        (item) =>
            item.nome
    ),
    [
        "Maria Oliveira",
    ]
);

/*
 * Busca + Empresa + Classificação = AND.
 */
assert.deepEqual(
    aplicarFiltrosControleFichasEpi(
        lista,
        {
            busca:
                "maria",

            empresa:
                "RIBEIRO AQUINO",

            classificacaoEpi:
                "Revisar controle",
        }
    ).map(
        (item) =>
            item.nome
    ),
    [
        "Maria Oliveira",
    ]
);

assert.deepEqual(
    obterFiltrosControleFichasEpiParaExibicao(
        {
            empresa:
                "RIBEIRO AQUINO",

            classificacaoEpi:
                "Revisar controle",
        }
    ),
    {
        busca: "-",
        empresa: "RIBEIRO AQUINO",
        classificacaoEpi:
            "Revisar controle",
        classificacao:
            "Revisar controle",
    }
);

console.log("");
console.log("=".repeat(76));
console.log("EPI-FILTROS-4D3 — SMOKE DA CLASSIFICAÇÃO ÚNICA: OK");
console.log("Conforme dentro de 12 meses: OK");
console.log("Revisar controle após 12 meses: OK");
console.log("Pendência documental: OK");
console.log("RIBEIRO AQUINO + Revisar controle: OK");
console.log("Busca + Empresa + Classificação: AND OK");
console.log("=".repeat(76));