import {
    describe,
    expect,
    it,
} from "vitest";

import {
    filtrarDatasPorCategoria,
    formatarDataBr,
    limparTextoPossivelDocumento,
    valorPareceSomenteDocumentoFiscal,
} from "../../src/services/documentosOcrUtils.js";

describe(
    "utilitários puros do OCR documental",
    () => {
        it(
            "remove escapes e controles sem colar palavras",
            () => {
                expect(
                    limparTextoPossivelDocumento(
                        "ASO\\n  Técnico\\tde Segurança\\r",
                    ),
                ).toBe(
                    "ASO Técnico de Segurança",
                );
            },
        );

        it(
            "formata data ISO no padrão brasileiro",
            () => {
                expect(
                    formatarDataBr(
                        "2026-10-10",
                    ),
                ).toBe(
                    "10/10/2026",
                );
            },
        );

        it(
            "preserva somente datas associadas à categoria solicitada",
            () => {
                const datas = [
                    {
                        iso:
                            "2026-01-01",
                        categorias: [
                            "emissao",
                        ],
                    },
                    {
                        iso:
                            "2027-01-01",
                        categorias: [
                            "validade",
                            "vencimento",
                        ],
                    },
                ];

                expect(
                    filtrarDatasPorCategoria(
                        datas,
                        "validade",
                    ),
                ).toEqual([
                    datas[1],
                ]);
            },
        );

        it(
            "reconhece CPF e CNPJ isolados como documento fiscal, com ou sem pontuação",
            () => {
                expect(
                    valorPareceSomenteDocumentoFiscal(
                        "123.456.789-00",
                    ),
                ).toBe(
                    true,
                );

                expect(
                    valorPareceSomenteDocumentoFiscal(
                        "12345678000199",
                    ),
                ).toBe(
                    true,
                );
            },
        );

        it(
            "não classifica texto documental comum ou data como CPF/CNPJ isolado",
            () => {
                for (
                    const valor of [
                        "",
                        "ASO João da Silva",
                        "10/10/2026",
                        "empresa 12345678000199 ativa",
                    ]
                ) {
                    expect(
                        valorPareceSomenteDocumentoFiscal(
                            valor,
                        ),
                    ).toBe(
                        false,
                    );
                }
            },
        );

        it(
            "usa defaults e null sem fabricar conteúdo",
            () => {
                expect(
                    limparTextoPossivelDocumento(),
                ).toBe(
                    "",
                );

                expect(
                    limparTextoPossivelDocumento(
                        null,
                    ),
                ).toBe(
                    "",
                );

                expect(
                    formatarDataBr(),
                ).toBe(
                    "",
                );

                expect(
                    formatarDataBr(
                        null,
                    ),
                ).toBe(
                    null,
                );
            },
        );

        it(
            "preserva separação ao limpar parênteses escapados, quebras e controles internos",
            () => {
                expect(
                    limparTextoPossivelDocumento(
                        "\\(ASO\\)\\nLinha\\rNova\u0007Fim",
                    ),
                ).toBe(
                    "(ASO) Linha Nova Fim",
                );
            },
        );

        it(
            "formata timestamp ISO e preserva entrada de data incompleta",
            () => {
                expect(
                    formatarDataBr(
                        "2026-10-10T15:30:00Z",
                    ),
                ).toBe(
                    "10/10/2026",
                );

                expect(
                    formatarDataBr(
                        "2026-10",
                    ),
                ).toBe(
                    "2026-10",
                );
            },
        );

        it(
            "reconhece variantes válidas adicionais de CPF e CNPJ",
            () => {
                for (
                    const valor of [
                        "12345678900",
                        "12.345.678/0001-90",
                        "123 456 789 00",
                    ]
                ) {
                    expect(
                        valorPareceSomenteDocumentoFiscal(
                            valor,
                        ),
                    ).toBe(
                        true,
                    );
                }
            },
        );

        it(
            "rejeita near-misses de CNPJ formatado",
            () => {
                for (
                    const valor of [
                        "X12.345.678/0001-90",
                        "12.345.678/0001-90X",
                        "1.345.678/0001-90",
                        "AB.345.678/0001-90",
                        "12.3.678/0001-90",
                        "12.ABC.678/0001-90",
                        "12.345.6/0001-90",
                        "12.345.ABC/0001-90",
                        "12.345.678/ABCD-90",
                        "12.345.678/0001-9",
                        "12.345.678/0001-AB",
                    ]
                ) {
                    expect(
                        valorPareceSomenteDocumentoFiscal(
                            valor,
                        ),
                    ).toBe(
                        false,
                    );
                }
            },
        );

        it(
            "rejeita near-misses de CPF formatado",
            () => {
                for (
                    const valor of [
                        "X123.456.789-00",
                        "123.456.789-00X",
                        "1.456.789-00",
                        "ABC.456.789-00",
                        "123.4.789-00",
                        "123.ABC.789-00",
                        "123.456.7-00",
                        "123.456.ABC-00",
                        "123.456.789-0",
                        "123.456.789-AB",
                    ]
                ) {
                    expect(
                        valorPareceSomenteDocumentoFiscal(
                            valor,
                        ),
                    ).toBe(
                        false,
                    );
                }
            },
        );
    },
);