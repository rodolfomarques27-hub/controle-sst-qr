import {
    describe,
    expect,
    it,
} from "vitest";

import {
    TREINAMENTOS_REVISAO_DIVERGENCIAS,
    TREINAMENTOS_REVISAO_STATUS,
    montarRevisaoTreinamentosReadOnly,
} from "../../src/services/treinamentosRevisaoMotorService.js";

const colaborador =
    Object.freeze({
        id:
            "colaborador-reg2b",
        nome:
            "Colaborador REG-2B",
    });

describe(
    "Motor read-only de revisão de treinamentos",
    () => {
        it(
            "retorna revisão vazia e somente leitura sem certificados",
            () => {
                const resultado =
                    montarRevisaoTreinamentosReadOnly({
                        colaborador,
                        certificados:
                            [],
                        evidencias:
                            [],
                        verificacoes:
                            [],
                    });

                expect(
                    resultado.readOnly,
                ).toBe(
                    true,
                );

                expect(
                    resultado.totalTreinamentosLogicos,
                ).toBe(
                    0,
                );

                expect(
                    resultado.percentualConformidade,
                ).toBe(
                    0,
                );

                expect(
                    resultado.itens,
                ).toEqual(
                    [],
                );
            },
        );

        it(
            "não transforma documentos administrativos em treinamentos lógicos",
            () => {
                const resultado =
                    montarRevisaoTreinamentosReadOnly({
                        colaborador,
                        certificados: [
                            {
                                id:
                                    "epi",
                                treinamentoId:
                                    14,
                            },
                            {
                                id:
                                    "os",
                                treinamentoId:
                                    15,
                            },
                            {
                                id:
                                    "registro",
                                treinamentoId:
                                    21,
                            },
                            {
                                id:
                                    "aso",
                                treinamentoId:
                                    22,
                            },
                        ],
                    });

                expect(
                    resultado.totalTreinamentosLogicos,
                ).toBe(
                    0,
                );

                expect(
                    resultado.ignoradosDocumentais,
                ).toHaveLength(
                    4,
                );

                expect(
                    resultado.ignoradosDocumentais.every(
                        (item) =>
                            item.motivo ===
                            "DOCUMENTO_NAO_E_TREINAMENTO_LOGICO",
                    ),
                ).toBe(
                    true,
                );
            },
        );

        it(
            "treinamento desconhecido exige revisão manual",
            () => {
                const resultado =
                    montarRevisaoTreinamentosReadOnly({
                        colaborador,
                        certificados: [
                            {
                                id:
                                    "desconhecido-1",
                                treinamentoId:
                                    999,
                            },
                        ],
                    });

                expect(
                    resultado.totalTreinamentosLogicos,
                ).toBe(
                    1,
                );

                const item =
                    resultado.itens[0];

                expect(
                    item.statusRevisao,
                ).toBe(
                    TREINAMENTOS_REVISAO_STATUS
                        .REVISAO_MANUAL_NECESSARIA,
                );

                expect(
                    item.divergencias,
                ).toContain(
                    TREINAMENTOS_REVISAO_DIVERGENCIAS
                        .REGRA_NAO_RECONHECIDA,
                );

                expect(
                    item.divergencias,
                ).toContain(
                    TREINAMENTOS_REVISAO_DIVERGENCIAS
                        .EVIDENCIA_INSUFICIENTE,
                );

                expect(
                    resultado.requerRevisaoHumana,
                ).toBe(
                    true,
                );
            },
        );

        it(
            "duplicidade lógica não vira dois treinamentos",
            () => {
                const resultado =
                    montarRevisaoTreinamentosReadOnly({
                        colaborador,
                        certificados: [
                            {
                                id:
                                    "duplicado-1",
                                treinamentoId:
                                    999,
                            },
                            {
                                id:
                                    "duplicado-2",
                                treinamentoId:
                                    999,
                            },
                        ],
                    });

                expect(
                    resultado.totalTreinamentosLogicos,
                ).toBe(
                    1,
                );

                const item =
                    resultado.itens[0];

                expect(
                    item.quantidadeRegistrosCertificado,
                ).toBe(
                    2,
                );

                expect(
                    item.divergencias,
                ).toContain(
                    TREINAMENTOS_REVISAO_DIVERGENCIAS
                        .DUPLICIDADE_LOGICA,
                );
            },
        );
    },
);