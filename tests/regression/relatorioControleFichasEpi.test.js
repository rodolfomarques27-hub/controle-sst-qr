import {
    describe,
    expect,
    it,
} from "vitest";

import {
    aplicarFiltrosControleFichasEpi,
    classificarControleFichaEpi,
    normalizarFiltrosControleFichasEpi,
    normalizarTextoFiltroEpi,
} from "../../src/services/exportacao/relatorioControleFichasEpiFiltros.js";

const registros = [
    {
        nome:
            "Ana Souza",
        funcao:
            "Eletricista",
        empresa:
            "RIBEIRO AQUINO",
        situacao:
            "CONFORME",
        fichaTexto:
            "LOCALIZADA",
        controle12m:
            "EM DIA",
        controle12mRevisar:
            false,
    },
    {
        nome:
            "João Lima",
        funcao:
            "Soldador",
        empresa:
            "RIBEIRO AQUINO",
        situacao:
            "PENDENTE",
        fichaTexto:
            "NÃO CADASTRADA",
        controle12m:
            "-",
        controle12mRevisar:
            false,
    },
    {
        nome:
            "Maria Oliveira",
        funcao:
            "Técnica de Segurança",
        empresa:
            "RIBEIRO AQUINO",
        situacao:
            "CONFORME",
        fichaTexto:
            "LOCALIZADA",
        controle12m:
            "REVISAR",
        controle12mRevisar:
            true,
    },
    {
        nome:
            "Carlos Rocha",
        funcao:
            "Pedreiro",
        empresa:
            "Beta Engenharia",
        situacao:
            "REVISAR",
        fichaTexto:
            "SEM ARQUIVO",
        controle12m:
            "-",
        controle12mRevisar:
            false,
    },
];

describe(
    "Controle de fichas de EPI",
    () => {
        it(
            "normaliza acentos e filtros vazios",
            () => {
                expect(
                    normalizarTextoFiltroEpi(
                        "Técnica João",
                    ),
                ).toBe(
                    "tecnica joao",
                );

                expect(
                    normalizarFiltrosControleFichasEpi(),
                ).toEqual({
                    busca:
                        "",
                    empresa:
                        "Todas",
                    classificacao:
                        "TODOS",
                    classificacaoExibicao:
                        "Todos",
                });
            },
        );

        it(
            "separa conforme, pendente e revisão administrativa de 12 meses",
            () => {
                expect(
                    classificarControleFichaEpi(
                        registros[0],
                    ),
                ).toBe(
                    "CONFORME",
                );

                expect(
                    classificarControleFichaEpi(
                        registros[1],
                    ),
                ).toBe(
                    "PENDENTE",
                );

                expect(
                    classificarControleFichaEpi(
                        registros[2],
                    ),
                ).toBe(
                    "REVISAR_CONTROLE",
                );

                expect(
                    classificarControleFichaEpi(
                        registros[3],
                    ),
                ).toBe(
                    "PENDENTE",
                );
            },
        );

        it(
            "classificação desconhecida não elimina registros",
            () => {
                const resultado =
                    aplicarFiltrosControleFichasEpi(
                        registros,
                        {
                            classificacaoEpi:
                                "classificação inexistente",
                        },
                    );

                expect(
                    resultado,
                ).toHaveLength(
                    4,
                );
            },
        );

        it(
            "combina busca, empresa e classificação com AND",
            () => {
                const resultado =
                    aplicarFiltrosControleFichasEpi(
                        registros,
                        {
                            busca:
                                "maria",
                            empresa:
                                "RIBEIRO AQUINO",
                            classificacaoEpi:
                                "Revisar controle",
                        },
                    );

                expect(
                    resultado.map(
                        (item) =>
                            item.nome,
                    ),
                ).toEqual([
                    "Maria Oliveira",
                ]);
            },
        );

        it(
            "busca é insensível a acentos",
            () => {
                const resultado =
                    aplicarFiltrosControleFichasEpi(
                        registros,
                        {
                            busca:
                                "tecnica de seguranca",
                        },
                    );

                expect(
                    resultado.map(
                        (item) =>
                            item.nome,
                    ),
                ).toEqual([
                    "Maria Oliveira",
                ]);
            },
        );

        it(
            "entrada não-array falha fechada como lista vazia",
            () => {
                expect(
                    aplicarFiltrosControleFichasEpi(
                        null,
                        {},
                    ),
                ).toEqual(
                    [],
                );
            },
        );
    },
);