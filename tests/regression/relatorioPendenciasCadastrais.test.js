import {
    describe,
    expect,
    it,
} from "vitest";

import {
    avaliarPendenciasCadastraisColaborador,
    campoCadastralPreenchido,
    consolidarPendenciasCadastrais,
} from "../../src/services/exportacao/relatorioPendenciasCadastraisUtils.js";

import {
    construirResumoCadastralComFiltroQr,
    normalizarEstadosQrRelatorio,
} from "../../src/services/exportacao/relatorioPendenciasCadastraisQrUtils.js";

const colaboradorCompleto = {
    id:
        "colaborador-1",

    nome:
        "João da Silva",

    empresa:
        "Empresa A",

    funcao:
        "Eletricista",

    cpf:
        "000.000.000-00",

    foto_url:
        "fotos/colaborador-1.jpg",

    dataNascimento:
        "1990-01-01",

    telefone:
        "(12) 99999-9999",

    matriculaEsocial:
        "12345",

    dataAdmissao:
        "2026-01-10",

    contatoEmergenciaNome:
        "Maria",

    contatoEmergenciaParentesco:
        "Esposa",

    contatoEmergenciaTelefone:
        "(12) 98888-8888",
};

describe(
    "pendências cadastrais",
    () => {
        it(
            "trata placeholders textuais como informação ausente",
            () => {
                const placeholders = [
                    "",
                    " ",
                    "-",
                    "null",
                    "undefined",
                    "não informado",
                    "nao informado",
                ];

                for (const valor of placeholders) {
                    expect(
                        campoCadastralPreenchido(
                            {
                                matriculaEsocial:
                                    valor,
                            },
                            "matriculaEsocial",
                        ),
                    ).toBe(
                        false,
                    );
                }
            },
        );

        it(
            "ignora chaves cadastrais inexistentes sem criar falso positivo",
            () => {
                const resumo =
                    consolidarPendenciasCadastrais(
                        [
                            colaboradorCompleto,
                        ],
                        [
                            "cpf",
                            "campo_inexistente",
                        ],
                    );

                expect(
                    resumo.camposSelecionados,
                ).toEqual([
                    "cpf",
                ]);

                expect(
                    resumo.totalPendencias,
                ).toBe(
                    0,
                );

                expect(
                    resumo.totaisPorCampo,
                ).toEqual({
                    cpf:
                        0,
                });
            },
        );

        it(
            "não cria pendência quando nenhum campo foi selecionado",
            () => {
                const resultado =
                    avaliarPendenciasCadastraisColaborador(
                        {
                            id:
                                "incompleto",
                            cpf:
                                "",
                        },
                        [],
                    );

                expect(
                    resultado.quantidade,
                ).toBe(
                    0,
                );

                expect(
                    resultado.pendencias,
                ).toEqual(
                    [],
                );
            },
        );
    },
);

describe(
    "filtro QR cadastral",
    () => {
        const impressoSemCpf = {
            ...colaboradorCompleto,
            id:
                "1",
            cpf:
                "",
            qrUltimaImpressaoEm:
                "2026-08-18T18:00:00-03:00",
        };

        const semImpressaoSemCpf = {
            ...colaboradorCompleto,
            id:
                "2",
            cpf:
                "",
            qrUltimaImpressaoEm:
                "",
        };

        const semImpressaoComCpf = {
            ...colaboradorCompleto,
            id:
                "3",
            qrUltimaImpressaoEm:
                "",
        };

        const colaboradores = [
            impressoSemCpf,
            semImpressaoSemCpf,
            semImpressaoComCpf,
        ];

        it(
            "descarta estados QR inválidos e duplicados",
            () => {
                expect(
                    normalizarEstadosQrRelatorio([
                        "impresso",
                        "impresso",
                        "invalido",
                    ]),
                ).toEqual([
                    "impresso",
                ]);

                expect(
                    normalizarEstadosQrRelatorio(
                        "impresso",
                    ),
                ).toEqual(
                    [],
                );
            },
        );

        it(
            "QR-only filtra operacionalmente sem criar pendência cadastral",
            () => {
                const resumo =
                    construirResumoCadastralComFiltroQr({
                        colaboradores,
                        camposSelecionados:
                            [],
                        estadosQrSelecionados: [
                            "impresso",
                        ],
                    });

                expect(
                    resumo.avaliacoes.map(
                        ({ colaborador }) =>
                            colaborador.id,
                    ),
                ).toEqual([
                    "1",
                ]);

                expect(
                    resumo.totalPendencias,
                ).toBe(
                    0,
                );

                expect(
                    resumo.cadastrosComPendencia,
                ).toBe(
                    0,
                );
            },
        );

        it(
            "combina pendência de CPF e estado QR com semântica AND",
            () => {
                const resumo =
                    construirResumoCadastralComFiltroQr({
                        colaboradores,
                        camposSelecionados: [
                            "cpf",
                        ],
                        estadosQrSelecionados: [
                            "sem_impressao",
                        ],
                    });

                expect(
                    resumo.avaliacoes.map(
                        ({ colaborador }) =>
                            colaborador.id,
                    ),
                ).toEqual([
                    "2",
                ]);

                expect(
                    resumo.totalPendencias,
                ).toBe(
                    1,
                );
            },
        );

        it(
            "selecionar ambos os estados QR não restringe o universo cadastral",
            () => {
                const resumo =
                    construirResumoCadastralComFiltroQr({
                        colaboradores,
                        camposSelecionados: [
                            "cpf",
                        ],
                        estadosQrSelecionados: [
                            "impresso",
                            "sem_impressao",
                        ],
                    });

                expect(
                    resumo.avaliacoes.map(
                        ({ colaborador }) =>
                            colaborador.id,
                    ),
                ).toEqual([
                    "1",
                    "2",
                ]);

                expect(
                    resumo.totalPendencias,
                ).toBe(
                    2,
                );
            },
        );
    },
);