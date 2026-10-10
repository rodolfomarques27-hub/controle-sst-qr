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
    },
);