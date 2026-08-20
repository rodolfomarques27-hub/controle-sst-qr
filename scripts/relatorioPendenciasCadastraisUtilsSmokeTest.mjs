import assert from "node:assert/strict";

import {
    CAMPOS_PENDENCIAS_CADASTRAIS,
    CHAVES_PENDENCIAS_CADASTRAIS,
    avaliarPendenciasCadastraisColaborador,
    consolidarPendenciasCadastrais,
} from "../src/services/exportacao/relatorioPendenciasCadastraisUtils.js";

assert.equal(
    CAMPOS_PENDENCIAS_CADASTRAIS.length,
    12,
    "A matriz deve possuir 12 campos auditáveis."
);

assert.equal(
    CHAVES_PENDENCIAS_CADASTRAIS.length,
    12,
    "As chaves da matriz devem permanecer sincronizadas."
);

const completo = {
    id: "1",
    nome: "João da Silva",
    empresa: "Empresa A",
    funcao: "Eletricista",
    cpf: "000.000.000-00",
    foto_url: "fotos-colaboradores/1/foto.jpg",
    dataNascimento: "1990-01-01",
    telefone: "(12) 99999-9999",
    matriculaEsocial: "12345",
    dataAdmissao: "2026-01-10",
    contatoEmergenciaNome: "Maria",
    contatoEmergenciaParentesco: "Esposa",
    contatoEmergenciaTelefone: "(12) 98888-8888",
};

assert.equal(
    avaliarPendenciasCadastraisColaborador(
        completo,
        CHAVES_PENDENCIAS_CADASTRAIS
    ).quantidade,
    0,
    "Cadastro completo não pode gerar pendência."
);

const semFotoCpf = {
    ...completo,
    id: "2",
    nome: "Pedro",
    foto_url: "",
    cpf: "",
};

const avaliacaoFotoCpf =
    avaliarPendenciasCadastraisColaborador(
        semFotoCpf,
        [
            "foto",
            "cpf",
        ]
    );

assert.deepEqual(
    avaliacaoFotoCpf.pendencias.map(
        (item) =>
            item.chave
    ),
    [
        "foto",
        "cpf",
    ],
    "Foto e CPF ausentes devem ser detectados."
);

const somenteCpf =
    avaliarPendenciasCadastraisColaborador(
        semFotoCpf,
        [
            "cpf",
        ]
    );

assert.deepEqual(
    somenteCpf.pendencias.map(
        (item) =>
            item.chave
    ),
    [
        "cpf",
    ],
    "Campo não selecionado não pode aparecer no resultado."
);

const semFoto = {
    ...completo,
    id: "3",
    nome: "Carlos",
    foto_url: "",
};

const semCpf = {
    ...completo,
    id: "4",
    nome: "Ana",
    cpf: "",
};

const consolidado =
    consolidarPendenciasCadastrais(
        [
            semFoto,
            semCpf,
        ],
        [
            "foto",
            "cpf",
        ]
    );

assert.equal(
    consolidado.cadastrosComPendencia,
    2,
    "Foto + CPF deve operar com semântica OU entre colaboradores."
);

assert.equal(
    consolidado.totalPendencias,
    2,
    "Cada ausência deve ser contabilizada uma vez."
);

assert.equal(
    consolidado.totaisPorCampo.foto,
    1,
    "Uma pessoa deve estar sem foto."
);

assert.equal(
    consolidado.totaisPorCampo.cpf,
    1,
    "Uma pessoa deve estar sem CPF."
);

const vazioRepresentadoPorHifen = {
    ...completo,
    id: "5",
    matriculaEsocial: "-",
};

assert.equal(
    avaliarPendenciasCadastraisColaborador(
        vazioRepresentadoPorHifen,
        [
            "matriculaEsocial",
        ]
    ).quantidade,
    1,
    "Hífen não pode ser tratado como informação preenchida."
);

const semSelecao =
    consolidarPendenciasCadastrais(
        [
            semFotoCpf,
        ],
        []
    );

assert.equal(
    semSelecao.cadastrosComPendencia,
    0,
    "Sem campo selecionado não deve existir falso positivo."
);

console.log("");
console.log("============================================================");
console.log("SMOKE — PENDÊNCIAS CADASTRAIS: OK");
console.log("12 campos: OK");
console.log("Filtro por campo: OK");
console.log("Regra OU: OK");
console.log("Sem duplicação de colaborador: OK");
console.log("Hífen como ausência: OK");
console.log("============================================================");