import assert from "node:assert/strict";

import {
    montarEvidenciasInternasCertidaoMensal,
} from "../src/features/certidao-mensal-documental/services/certidaoMensalInternalEvidenceService.js";

const EMPRESA_ID =
    "empresa-item15-teste";

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

/*
 * CASO 1
 * ASO anterior à referência e ainda vigente.
 * PCMSO futuro não pode substituir o documento vigente na referência.
 */
const casoAtual =
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

assert.equal(
    casoAtual.totalAtivos,
    1,
    "Competência atual deve conter um colaborador.",
);

assert.equal(
    casoAtual.asosValidos,
    1,
    "ASO válido na referência deve ser reconhecido.",
);

assert.equal(
    casoAtual.asosPendentes,
    0,
    "Não deve haver ASO pendente.",
);

assert.equal(
    casoAtual.pcmsoVigente,
    true,
    "PCMSO emitido antes da referência deve estar vigente.",
);

assert.equal(
    casoAtual.validadePcmso,
    "2026-12-31",
    "PCMSO futuro não pode retroagir para agosto.",
);

assert.equal(
    casoAtual.pcmso?.id,
    "pcmso-antigo",
    "Documento futuro não pode substituir o PCMSO aplicável.",
);

/*
 * CASO 2
 * ASO realizado somente depois da competência.
 */
const asoFuturo =
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
        documentosEmpresas: [
            pcmso({
                id:
                    "pcmso-2",
                emissao:
                    "2026-01-01",
                vencimento:
                    "2026-12-31",
            }),
        ],
    });

assert.equal(
    asoFuturo.asosValidos,
    0,
    "ASO realizado após a referência não pode retroagir.",
);

assert.equal(
    asoFuturo.asosPendentes,
    1,
    "ASO futuro deve gerar pendência na competência anterior.",
);

/*
 * CASO 3
 * ASO pendente de verificação não pode gerar conformidade.
 */
const asoNaoValidado =
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
        documentosEmpresas: [
            pcmso({
                id:
                    "pcmso-3",
                emissao:
                    "2026-01-01",
                vencimento:
                    "2026-12-31",
            }),
        ],
    });

assert.equal(
    asoNaoValidado.asosValidos,
    0,
    "ASO ainda não validado não pode contar como válido.",
);

/*
 * CASO 4
 * PCMSO ainda não emitido na referência.
 */
const pcmsoSomenteFuturo =
    montar({
        colaboradores: [
            colaborador({
                id:
                    "colaborador-4",
                treinamentos: [
                    aso({
                        realizado:
                            "2026-05-01",
                        vencimento:
                            "2027-05-01",
                    }),
                ],
            }),
        ],
        documentosEmpresas: [
            pcmso({
                id:
                    "pcmso-apenas-futuro",
                emissao:
                    "2026-09-01",
                vencimento:
                    "2027-08-31",
            }),
        ],
    });

assert.equal(
    pcmsoSomenteFuturo.pcmso,
    null,
    "PCMSO futuro não deve ser localizado como aplicável.",
);

assert.equal(
    pcmsoSomenteFuturo.pcmsoVigente,
    false,
    "PCMSO futuro não pode tornar competência anterior conforme.",
);

/*
 * CASO 5
 * PCMSO pendente de verificação.
 */
const pcmsoNaoValidado =
    montar({
        colaboradores: [
            colaborador({
                id:
                    "colaborador-5",
                treinamentos: [
                    aso({
                        realizado:
                            "2026-05-01",
                        vencimento:
                            "2027-05-01",
                    }),
                ],
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

assert.equal(
    pcmsoNaoValidado.pcmsoVigente,
    false,
    "PCMSO não validado não pode gerar conformidade.",
);

/*
 * CASO 6
 * Competência histórica usa a composição daquela competência,
 * não a lista atual de trabalhadores.
 */
const casoHistorico =
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
                    "colaborador-historico",
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
                    "colaborador-admitido-depois",
                admissao:
                    "2026-10-01",
                treinamentos: [
                    aso({
                        realizado:
                            "2026-10-01",
                        vencimento:
                            "2027-10-01",
                    }),
                ],
            }),
        ],
        documentosEmpresas: [
            pcmso({
                id:
                    "pcmso-historico",
                emissao:
                    "2026-01-01",
                vencimento:
                    "2026-12-31",
            }),
        ],
    });

assert.equal(
    casoHistorico.totalRelacaoCompetencia,
    1,
    "Relação histórica deve excluir admissão posterior.",
);

assert.equal(
    casoHistorico.totalAtivos,
    1,
    "Item 15 deve usar o universo histórico da competência.",
);

assert.equal(
    casoHistorico.asosValidos,
    1,
    "ASO deve ser calculado sobre o universo histórico.",
);

assert.equal(
    casoHistorico.historicoConfiavel,
    false,
    "Competência ocupacional antiga sem snapshot deve continuar exigindo confirmação.",
);

console.log(
    "TESTE_ITEM15_TEMPORAL_OK",
);