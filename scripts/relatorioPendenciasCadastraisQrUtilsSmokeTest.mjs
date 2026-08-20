import assert from "node:assert/strict";

import {
    construirResumoCadastralComFiltroQr,
    normalizarEstadosQrRelatorio,
    obterEstadoQrRelatorio,
    possuiImpressaoQrConfirmada,
    resumirEstadosQrColaboradores,
} from "../src/services/exportacao/relatorioPendenciasCadastraisQrUtils.js";

const impressoSemCpf = {
    id:
        "1",

    nome:
        "Impresso sem CPF",

    cpf:
        "",

    qrUltimaImpressaoEm:
        "2026-08-18T18:00:00-03:00",
};

const semImpressaoSemCpf = {
    id:
        "2",

    nome:
        "Sem impressão e sem CPF",

    cpf:
        "",

    qrUltimaImpressaoEm:
        "",
};

const semImpressaoComCpf = {
    id:
        "3",

    nome:
        "Sem impressão com CPF",

    cpf:
        "000.000.000-00",

    qrUltimaImpressaoEm:
        "",
};

const lista = [
    impressoSemCpf,
    semImpressaoSemCpf,
    semImpressaoComCpf,
];

assert.equal(
    possuiImpressaoQrConfirmada(
        impressoSemCpf
    ),
    true
);

assert.equal(
    possuiImpressaoQrConfirmada(
        semImpressaoSemCpf
    ),
    false
);

assert.equal(
    obterEstadoQrRelatorio(
        impressoSemCpf
    ),
    "impresso"
);

assert.equal(
    obterEstadoQrRelatorio(
        semImpressaoSemCpf
    ),
    "sem_impressao"
);

assert.deepEqual(
    normalizarEstadosQrRelatorio([
        "impresso",
        "impresso",
        "invalido",
    ]),
    [
        "impresso",
    ]
);

const resumoQr =
    resumirEstadosQrColaboradores(
        lista
    );

assert.deepEqual(
    resumoQr,
    {
        total:
            3,

        impressos:
            1,

        semImpressao:
            2,
    }
);

/*
 * Nenhum critério:
 * nenhum falso positivo.
 */
const nenhumFiltro =
    construirResumoCadastralComFiltroQr({
        colaboradores:
            lista,

        camposSelecionados:
            [],

        estadosQrSelecionados:
            [],
    });

assert.equal(
    nenhumFiltro.avaliacoes.length,
    0
);

/*
 * QR-only — impresso.
 */
const somenteImpresso =
    construirResumoCadastralComFiltroQr({
        colaboradores:
            lista,

        camposSelecionados:
            [],

        estadosQrSelecionados: [
            "impresso",
        ],
    });

assert.equal(
    somenteImpresso.avaliacoes.length,
    1
);

assert.equal(
    somenteImpresso.avaliacoes[0].colaborador.id,
    "1"
);

assert.equal(
    somenteImpresso.totalPendencias,
    0,
    "QR-only não pode criar pendência cadastral."
);

assert.equal(
    somenteImpresso.cadastrosComPendencia,
    0,
    "QR-only não pode criar cadastro incompleto."
);

/*
 * QR-only — sem impressão.
 */
const somenteSemImpressao =
    construirResumoCadastralComFiltroQr({
        colaboradores:
            lista,

        camposSelecionados:
            [],

        estadosQrSelecionados: [
            "sem_impressao",
        ],
    });

assert.deepEqual(
    somenteSemImpressao.avaliacoes.map(
        (avaliacao) =>
            avaliacao.colaborador.id
    ),
    [
        "2",
        "3",
    ]
);

/*
 * Ambos os estados QR:
 * universo completo.
 */
const ambosQr =
    construirResumoCadastralComFiltroQr({
        colaboradores:
            lista,

        camposSelecionados:
            [],

        estadosQrSelecionados: [
            "impresso",
            "sem_impressao",
        ],
    });

assert.equal(
    ambosQr.avaliacoes.length,
    3
);

/*
 * CPF:
 * OR cadastral original permanece.
 */
const somenteCpf =
    construirResumoCadastralComFiltroQr({
        colaboradores:
            lista,

        camposSelecionados: [
            "cpf",
        ],

        estadosQrSelecionados:
            [],
    });

assert.deepEqual(
    somenteCpf.avaliacoes.map(
        (avaliacao) =>
            avaliacao.colaborador.id
    ),
    [
        "1",
        "2",
    ]
);

assert.equal(
    somenteCpf.totalPendencias,
    2
);

/*
 * CPF E QR impresso.
 */
const cpfEImpresso =
    construirResumoCadastralComFiltroQr({
        colaboradores:
            lista,

        camposSelecionados: [
            "cpf",
        ],

        estadosQrSelecionados: [
            "impresso",
        ],
    });

assert.deepEqual(
    cpfEImpresso.avaliacoes.map(
        (avaliacao) =>
            avaliacao.colaborador.id
    ),
    [
        "1",
    ]
);

assert.equal(
    cpfEImpresso.totalPendencias,
    1
);

/*
 * CPF E sem impressão.
 */
const cpfESemImpressao =
    construirResumoCadastralComFiltroQr({
        colaboradores:
            lista,

        camposSelecionados: [
            "cpf",
        ],

        estadosQrSelecionados: [
            "sem_impressao",
        ],
    });

assert.deepEqual(
    cpfESemImpressao.avaliacoes.map(
        (avaliacao) =>
            avaliacao.colaborador.id
    ),
    [
        "2",
    ]
);

assert.equal(
    cpfESemImpressao.totalPendencias,
    1
);

console.log("");
console.log("============================================================");
console.log("SMOKE — FILTRO QR CADASTRAL: OK");
console.log("QR-only: OK");
console.log("CPF + QR por AND: OK");
console.log("Ambos estados QR = sem restrição: OK");
console.log("QR não cria pendência cadastral: OK");
console.log("============================================================");