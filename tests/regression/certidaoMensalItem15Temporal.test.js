import {
    describe,
    expect,
    it,
} from "vitest";

import {
    montarEvidenciasInternasCertidaoMensal,
} from "../../src/features/certidao-mensal-documental/services/certidaoMensalInternalEvidenceService.js";

const EMPRESA_ID =
    "empresa-reg2b-item15";

function colaborador({
    id,
    admissao = "2026-01-01",
    treinamentos = [],
} = {}) {
    return {
        id,
        empresaId:
            EMPRESA_ID,
        empresa_id:
            EMPRESA_ID,
        status:
            "Ativo",
        statusMobilizacao:
            "Ativo",
        status_mobilizacao:
            "Ativo",
        dataAdmissao:
            admissao,
        data_admissao:
            admissao,
        treinamentos,
    };
}

function aso({
    realizado,
    vencimento,
    statusValidacao = "Validado",
} = {}) {
    return {
        treinamentoId:
            22,
        treinamento_id:
            22,
        tipoTreinamento:
            "ASO",
        nomeTreinamento:
            "ASO",
        realizado,
        dataRealizacao:
            realizado,
        data_realizacao:
            realizado,
        vencimento,
        dataVencimento:
            vencimento,
        data_vencimento:
            vencimento,
        statusValidacao,
        status_validacao:
            statusValidacao,
    };
}

function pcmso({
    id,
    emissao,
    vencimento,
    statusValidacao = "Validado",
} = {}) {
    return {
        id,
        empresaId:
            EMPRESA_ID,
        empresa_id:
            EMPRESA_ID,
        tipoDocumento:
            "PCMSO",
        tipo_documento:
            "PCMSO",
        dataEmissao:
            emissao,
        data_emissao:
            emissao,
        dataVencimento:
            vencimento,
        data_vencimento:
            vencimento,
        statusValidacao,
        status_validacao:
            statusValidacao,
    };
}

function montar({
    competencia = "2026-08",
    agora = new Date("2026-08-12T12:00:00.000Z"),
    colaboradores = [],
    documentosEmpresas = [],
    historicoVinculoCarregado = true,
} = {}) {
    return montarEvidenciasInternasCertidaoMensal({
        competencia,
        empresaId:
            EMPRESA_ID,
        colaboradores,
        documentosEmpresas,
        movimentacoesVinculo:
            [],
        historicoVinculoCarregado,
        agora,
    });
}

describe(
    "Certidão Mensal — temporalidade ASO/PCMSO",
    () => {
        it(
            "não deixa PCMSO futuro substituir o documento aplicável à competência",
            () => {
                const resultado =
                    montar({
                        colaboradores: [
                            colaborador({
                                id:
                                    "colaborador-1",
                                treinamentos: [
                                    aso({
                                        realizado:
                                            "2026-07-10",
                                        vencimento:
                                            "2027-07-10",
                                    }),
                                ],
                            }),
                        ],
                        documentosEmpresas: [
                            pcmso({
                                id:
                                    "pcmso-antigo",
                                emissao:
                                    "2026-01-10",
                                vencimento:
                                    "2026-12-31",
                            }),
                            pcmso({
                                id:
                                    "pcmso-futuro",
                                emissao:
                                    "2026-09-01",
                                vencimento:
                                    "2027-08-31",
                            }),
                        ],
                    });

                expect(
                    resultado.asosValidos,
                ).toBe(
                    1,
                );

                expect(
                    resultado.pcmso?.id,
                ).toBe(
                    "pcmso-antigo",
                );

                expect(
                    resultado.validadePcmso,
                ).toBe(
                    "2026-12-31",
                );
            },
        );

        it(
            "ASO realizado depois da competência não retroage",
            () => {
                const resultado =
                    montar({
                        colaboradores: [
                            colaborador({
                                id:
                                    "colaborador-2",
                                treinamentos: [
                                    aso({
                                        realizado:
                                            "2026-09-10",
                                        vencimento:
                                            "2027-09-10",
                                    }),
                                ],
                            }),
                        ],
                    });

                expect(
                    resultado.asosValidos,
                ).toBe(
                    0,
                );

                expect(
                    resultado.asosPendentes,
                ).toBe(
                    1,
                );
            },
        );

        it(
            "ASO pendente de verificação não produz conformidade",
            () => {
                const resultado =
                    montar({
                        colaboradores: [
                            colaborador({
                                id:
                                    "colaborador-3",
                                treinamentos: [
                                    aso({
                                        realizado:
                                            "2026-05-01",
                                        vencimento:
                                            "2027-05-01",
                                        statusValidacao:
                                            "Pendente de verificação",
                                    }),
                                ],
                            }),
                        ],
                    });

                expect(
                    resultado.asosValidos,
                ).toBe(
                    0,
                );
            },
        );

        it(
            "PCMSO emitido somente depois da referência não é aplicável",
            () => {
                const resultado =
                    montar({
                        colaboradores: [
                            colaborador({
                                id:
                                    "colaborador-4",
                            }),
                        ],
                        documentosEmpresas: [
                            pcmso({
                                id:
                                    "pcmso-futuro",
                                emissao:
                                    "2026-09-01",
                                vencimento:
                                    "2027-08-31",
                            }),
                        ],
                    });

                expect(
                    resultado.pcmso,
                ).toBeNull();

                expect(
                    resultado.pcmsoVigente,
                ).toBe(
                    false,
                );
            },
        );

        it(
            "PCMSO não validado não produz conformidade",
            () => {
                const resultado =
                    montar({
                        colaboradores: [
                            colaborador({
                                id:
                                    "colaborador-5",
                            }),
                        ],
                        documentosEmpresas: [
                            pcmso({
                                id:
                                    "pcmso-pendente",
                                emissao:
                                    "2026-01-01",
                                vencimento:
                                    "2026-12-31",
                                statusValidacao:
                                    "Pendente de verificação",
                            }),
                        ],
                    });

                expect(
                    resultado.pcmsoVigente,
                ).toBe(
                    false,
                );
            },
        );

        it(
            "competência histórica exclui admissão posterior",
            () => {
                const resultado =
                    montar({
                        competencia:
                            "2026-09",
                        agora:
                            new Date(
                                "2026-10-15T12:00:00.000Z",
                            ),
                        colaboradores: [
                            colaborador({
                                id:
                                    "historico",
                                admissao:
                                    "2026-01-10",
                                treinamentos: [
                                    aso({
                                        realizado:
                                            "2026-06-01",
                                        vencimento:
                                            "2027-06-01",
                                    }),
                                ],
                            }),
                            colaborador({
                                id:
                                    "admitido-depois",
                                admissao:
                                    "2026-10-01",
                            }),
                        ],
                    });

                expect(
                    resultado.totalRelacaoCompetencia,
                ).toBe(
                    1,
                );

                expect(
                    resultado.totalAtivos,
                ).toBe(
                    1,
                );

                expect(
                    resultado.historicoConfiavel,
                ).toBe(
                    false,
                );
            },
        );
    },
);