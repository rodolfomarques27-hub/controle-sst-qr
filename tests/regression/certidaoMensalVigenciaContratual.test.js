import {
    describe,
    expect,
    it,
} from "vitest";

import {
    CERTIDAO_MENSAL_VIGENCIA_CONTRATUAL_STATUS as STATUS,
    classificarCompetenciaVigenciaContratual,
    competenciaCertidaoMensalEhExigivel,
    normalizarVigenciaContratualEmpresa,
} from "../../src/features/certidao-mensal-documental/domain/certidaoMensalVigenciaContratual.js";

describe(
    "vigência contratual da Certidão Mensal",
    () => {
        it(
            "bloqueia cobrança quando o início do contrato não foi informado",
            () => {
                const resultado =
                    classificarCompetenciaVigenciaContratual({
                        empresa:
                            {},
                        competencia:
                            "08/2026",
                    });

                expect(
                    resultado.status,
                ).toBe(
                    STATUS.SEM_INICIO_CONTRATO,
                );

                expect(
                    resultado.exigivel,
                ).toBe(
                    false,
                );

                expect(
                    resultado.bloqueado,
                ).toBe(
                    true,
                );
            },
        );

        it(
            "rejeita uma data civil impossível",
            () => {
                const resultado =
                    classificarCompetenciaVigenciaContratual({
                        empresa: {
                            data_inicio_contrato:
                                "2026-02-31",
                        },
                        competencia:
                            "02/2026",
                    });

                expect(
                    resultado.status,
                ).toBe(
                    STATUS.VIGENCIA_INVALIDA,
                );

                expect(
                    resultado.exigivel,
                ).toBe(
                    false,
                );
            },
        );

        it(
            "rejeita término anterior ao início",
            () => {
                const vigencia =
                    normalizarVigenciaContratualEmpresa({
                        data_inicio_contrato:
                            "2026-08-10",
                        data_fim_contrato:
                            "2026-07-31",
                    });

                expect(
                    vigencia.valida,
                ).toBe(
                    false,
                );

                expect(
                    vigencia.erro,
                ).toContain(
                    "não pode ser anterior",
                );
            },
        );

        it(
            "não cria cobrança retroativa antes do início do contrato",
            () => {
                const resultado =
                    classificarCompetenciaVigenciaContratual({
                        empresa: {
                            data_inicio_contrato:
                                "2026-04-15",
                        },
                        competencia:
                            "03/2026",
                    });

                expect(
                    resultado.status,
                ).toBe(
                    STATUS.ANTES_DO_CONTRATO,
                );

                expect(
                    resultado.exigivel,
                ).toBe(
                    false,
                );

                expect(
                    resultado.bloqueado,
                ).toBe(
                    false,
                );
            },
        );

        it(
            "considera os meses inicial e final como exigíveis e bloqueia mês posterior",
            () => {
                const empresa = {
                    data_inicio_contrato:
                        "2026-03-15",
                    data_fim_contrato:
                        "2026-07-20",
                };

                expect(
                    competenciaCertidaoMensalEhExigivel({
                        empresa,
                        competencia:
                            "03/2026",
                    }),
                ).toBe(
                    true,
                );

                expect(
                    competenciaCertidaoMensalEhExigivel({
                        empresa,
                        competencia:
                            "07/2026",
                    }),
                ).toBe(
                    true,
                );

                const posterior =
                    classificarCompetenciaVigenciaContratual({
                        empresa,
                        competencia:
                            "08/2026",
                    });

                expect(
                    posterior.status,
                ).toBe(
                    STATUS.APOS_DO_CONTRATO,
                );

                expect(
                    posterior.exigivel,
                ).toBe(
                    false,
                );
            },
        );

        it(
            "preserva compatibilidade com os nomes camelCase",
            () => {
                const resultado =
                    classificarCompetenciaVigenciaContratual({
                        empresa: {
                            dataInicioContrato:
                                "2026-03-15",
                            dataFimContrato:
                                "2026-07-20",
                        },
                        competencia:
                            "06/2026",
                    });

                expect(
                    resultado.status,
                ).toBe(
                    STATUS.DURANTE_DO_CONTRATO,
                );

                expect(
                    resultado.exigivel,
                ).toBe(
                    true,
                );
            },
        );
    },
);