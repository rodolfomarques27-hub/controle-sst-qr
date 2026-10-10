import {
    describe,
    expect,
    it,
} from "vitest";

import {
    compararFuncaoAsoComCadastro,
    extrairFuncaoAsoDocumento,
    normalizarFuncaoAso,
} from "../../src/services/asoFuncaoService.js";

const matrizesFuncao = [
    {
        chave:
            "tecnico_seguranca",
        rotulo:
            "Técnico de Segurança",
        termos: [
            "Técnico de Segurança",
            "Tec Segurança",
        ],
    },
    {
        chave:
            "eletricista",
        rotulo:
            "Eletricista",
        termos: [
            "Eletricista",
        ],
    },
];

describe(
    "interpretação de função em ASO",
    () => {
        it(
            "normaliza acento e abreviação antes de comparar função",
            () => {
                expect(
                    normalizarFuncaoAso(
                        "Téc. Segurança",
                    ),
                ).toBe(
                    "tecnico seguranca",
                );
            },
        );

        it(
            "não aplica extração de função a documento que não é ASO",
            () => {
                expect(
                    extrairFuncaoAsoDocumento({
                        tipoDocumento:
                            "Certificado NR-10",
                        texto:
                            "Função: Eletricista",
                    }),
                ).toMatchObject({
                    aplicavel:
                        false,
                    localizado:
                        false,
                });
            },
        );

        it(
            "extrai função da mesma linha com confiança alta",
            () => {
                expect(
                    extrairFuncaoAsoDocumento({
                        tipoDocumento:
                            "ASO",
                        texto:
                            "Atestado de Saúde Ocupacional\nFunção: Técnico de Segurança\nSetor: SST",
                    }),
                ).toMatchObject({
                    aplicavel:
                        true,
                    localizado:
                        true,
                    funcaoOriginal:
                        "Técnico de Segurança",
                    funcaoNormalizada:
                        "tecnico de seguranca",
                    confianca:
                        "alta",
                    origem:
                        "texto_campo_rotulado",
                });
            },
        );

        it(
            "extrai função da linha OCR seguinte quando o rótulo está isolado",
            () => {
                expect(
                    extrairFuncaoAsoDocumento({
                        tipoDocumento:
                            "ASO",
                        linhasOcr: [
                            {
                                texto:
                                    "Função:",
                                yCentro:
                                    1,
                            },
                            {
                                texto:
                                    "Eletricista",
                                yCentro:
                                    2,
                            },
                        ],
                    }),
                ).toMatchObject({
                    localizado:
                        true,
                    funcaoNormalizada:
                        "eletricista",
                    confianca:
                        "media",
                    origem:
                        "linha_ocr_seguinte",
                });
            },
        );

        it(
            "não transforma outro campo do ASO em função quando OCR perde o valor",
            () => {
                const resultado =
                    extrairFuncaoAsoDocumento({
                        tipoDocumento:
                            "ASO",
                        texto:
                            "Atestado de Saúde Ocupacional",
                        linhasOcr: [
                            {
                                texto:
                                    "Função:",
                                yCentro:
                                    1,
                            },
                            {
                                texto:
                                    "Setor: Obras",
                                yCentro:
                                    2,
                            },
                        ],
                    });

                expect(
                    resultado,
                ).toMatchObject({
                    aplicavel:
                        true,
                    localizado:
                        false,
                    funcaoNormalizada:
                        "",
                });
            },
        );

        it(
            "aceita igualdade textual exata mesmo sem catálogo de funções",
            () => {
                const resultado =
                    compararFuncaoAsoComCadastro({
                        tipoDocumento:
                            "ASO",
                        funcaoDocumento:
                            "Técnico de Segurança",
                        funcaoCadastro:
                            "Técnico de Segurança",
                    });

                expect(
                    resultado,
                ).toMatchObject({
                    status:
                        "equivalente",
                    equivalente:
                        true,
                    bloqueiaAtualizacao:
                        false,
                });
            },
        );

        it(
            "bloqueia atualização automática quando OCR retorna função não reconhecida",
            () => {
                const resultado =
                    compararFuncaoAsoComCadastro({
                        tipoDocumento:
                            "ASO",
                        funcaoDocumento:
                            "Mestre Especial X",
                        funcaoCadastro:
                            "Eletricista",
                        matrizesFuncao,
                    });

                expect(
                    resultado,
                ).toMatchObject({
                    status:
                        "funcao_aso_revisao_manual",
                    requerRevisaoManual:
                        true,
                    bloqueiaAtualizacao:
                        true,
                });
            },
        );

        it(
            "exige confirmação quando ASO e cadastro contêm funções canônicas diferentes",
            () => {
                const resultado =
                    compararFuncaoAsoComCadastro({
                        tipoDocumento:
                            "ASO",
                        funcaoDocumento:
                            "Eletricista",
                        funcaoCadastro:
                            "Técnico de Segurança",
                        matrizesFuncao,
                    });

                expect(
                    resultado,
                ).toMatchObject({
                    status:
                        "divergente",
                    divergencia:
                        true,
                    requerConfirmacao:
                        true,
                    bloqueiaAtualizacao:
                        false,
                });
            },
        );

        it(
            "manda para revisão manual quando o catálogo torna a função do OCR ambígua",
            () => {
                const resultado =
                    compararFuncaoAsoComCadastro({
                        tipoDocumento:
                            "ASO",
                        funcaoDocumento:
                            "Operador",
                        funcaoCadastro:
                            "",
                        matrizesFuncao: [
                            {
                                chave:
                                    "operador_a",
                                rotulo:
                                    "Operador",
                                termos: [
                                    "Operador",
                                ],
                            },
                            {
                                chave:
                                    "operador_b",
                                rotulo:
                                    "Operador",
                                termos: [
                                    "Operador",
                                ],
                            },
                        ],
                    });

                expect(
                    resultado,
                ).toMatchObject({
                    status:
                        "funcao_aso_ambigua",
                    funcaoDocumentoAmbigua:
                        true,
                    requerRevisaoManual:
                        true,
                    bloqueiaAtualizacao:
                        true,
                });
            },
        );
    },
);