import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

import {
    calcularSituacaoDocumentalEmpresa,
    calcularVencimentoDocumento,
    normalizarDataDocumentoEmpresa,
    statusEmpresaDocumento,
} from "../../src/services/empresaDocumentosService.js";

describe(
    "validade e situação documental da empresa",
    () => {
        beforeEach(
            () => {
                vi.useFakeTimers();

                vi.setSystemTime(
                    new Date(
                        "2026-10-10T12:00:00.000Z",
                    ),
                );
            },
        );

        afterEach(
            () => {
                vi.useRealTimers();
            },
        );

        it(
            "normaliza datas ISO e brasileiras e rejeita calendário impossível",
            () => {
                expect(
                    normalizarDataDocumentoEmpresa(
                        "10/10/2026",
                    ),
                ).toBe(
                    "2026-10-10",
                );

                expect(
                    normalizarDataDocumentoEmpresa(
                        "2026-10-10T18:30:00",
                    ),
                ).toBe(
                    "2026-10-10",
                );

                expect(
                    normalizarDataDocumentoEmpresa(
                        "31/02/2026",
                    ),
                ).toBe(
                    "",
                );
            },
        );

        it(
            "calcula vencimento pelo catálogo e não inventa validade para tipo desconhecido",
            () => {
                expect(
                    calcularVencimentoDocumento(
                        "PCMSO",
                        "2026-01-15",
                    ),
                ).toBe(
                    "2027-01-15",
                );

                expect(
                    calcularVencimentoDocumento(
                        "TIPO INEXISTENTE",
                        "2026-01-15",
                    ),
                ).toBe(
                    "",
                );
            },
        );

        it(
            "classifica ausência de vencimento como pendência",
            () => {
                expect(
                    statusEmpresaDocumento(
                        "",
                    ),
                ).toMatchObject({
                    chave:
                        "pendente",
                    dias:
                        null,
                });
            },
        );

        it(
            "classifica documento vencido",
            () => {
                expect(
                    statusEmpresaDocumento(
                        "2026-10-09",
                    ),
                ).toMatchObject({
                    chave:
                        "vencido",
                    dias:
                        -1,
                });
            },
        );

        it(
            "classifica documento dentro da janela de 30 dias como a vencer",
            () => {
                expect(
                    statusEmpresaDocumento(
                        "2026-10-30",
                    ),
                ).toMatchObject({
                    chave:
                        "vencendo",
                    dias:
                        20,
                });
            },
        );

        it(
            "classifica validade superior à janela preventiva como em dia",
            () => {
                expect(
                    statusEmpresaDocumento(
                        "2026-12-01",
                    ),
                ).toMatchObject({
                    chave:
                        "em_dia",
                    dias:
                        52,
                });
            },
        );

        it(
            "não libera empresa quando um documento possui verificação crítica",
            () => {
                const resultado =
                    calcularSituacaoDocumentalEmpresa([
                        {
                            tipo_documento:
                                "LTCAT",
                            data_vencimento:
                                "2027-12-31",
                            status_validacao:
                                "Revisão manual",
                        },
                        {
                            tipo_documento:
                                "PCMSO",
                            data_vencimento:
                                "2027-12-31",
                            status_validacao:
                                "Aprovado",
                        },
                        {
                            tipo_documento:
                                "PGR",
                            data_vencimento:
                                "2027-12-31",
                            status_validacao:
                                "Aprovado",
                        },
                    ]);

                expect(
                    resultado,
                ).toMatchObject({
                    chave:
                        "bloqueado",
                    texto:
                        "Com pendência",
                });

                expect(
                    resultado.bloqueados,
                ).toContain(
                    "LTCAT",
                );
            },
        );

        it(
            "libera empresa somente quando todos os obrigatórios existem e estão em dia",
            () => {
                const resultado =
                    calcularSituacaoDocumentalEmpresa([
                        {
                            tipo_documento:
                                "LTCAT",
                            data_vencimento:
                                "2028-12-31",
                            status_validacao:
                                "Aprovado",
                        },
                        {
                            tipo_documento:
                                "PCMSO",
                            data_vencimento:
                                "2027-12-31",
                            status_validacao:
                                "Aprovado",
                        },
                        {
                            tipo_documento:
                                "PGR",
                            data_vencimento:
                                "2027-12-31",
                            status_validacao:
                                "Aprovado",
                        },
                    ]);

                expect(
                    resultado,
                ).toMatchObject({
                    chave:
                        "em_dia",
                    texto:
                        "Sem pendência",
                    pendentes:
                        [],
                    bloqueados:
                        [],
                    vencidos:
                        [],
                    vencendo:
                        [],
                    emDia: [
                        "LTCAT",
                        "PCMSO",
                        "PGR",
                    ],
                });
            },
        );
    },
);