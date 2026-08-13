import assert from "node:assert/strict";

import {
    montarEvidenciasInternasCertidaoMensal,
    recalcularEvidenciaOcupacionalComSnapshotMaoDeObra,
} from "../src/features/certidao-mensal-documental/services/certidaoMensalInternalEvidenceService.js";

const EMPRESA =
    "empresa-c3-final";

function asoValido(id) {
    return {
        treinamentoId: 22,
        treinamento_id: 22,
        tipoTreinamento: "ASO",
        nomeTreinamento: "ASO",
        realizado: "2026-05-01",
        dataRealizacao: "2026-05-01",
        data_realizacao: "2026-05-01",
        vencimento: "2027-05-01",
        dataVencimento: "2027-05-01",
        data_vencimento: "2027-05-01",
        statusValidacao: "Validado",
        status_validacao: "Validado",
        id,
    };
}

function colaborador(id, comAso = true) {
    return {
        id,
        empresaId: EMPRESA,
        empresa_id: EMPRESA,
        nome: id,
        funcao: "Teste",
        status: "Ativo",
        statusMobilizacao: "Ativo",
        status_mobilizacao: "Ativo",
        dataAdmissao: "2026-01-01",
        data_admissao: "2026-01-01",
        treinamentos:
            comAso
                ? [asoValido(`aso-${id}`)]
                : [],
    };
}

const colaboradores =
    [
        colaborador("c1", true),
        colaborador("c2", true),
        colaborador("c3", false),
    ];

const evidenciaBase =
    montarEvidenciasInternasCertidaoMensal({
        competencia: "2026-07",
        empresaId: EMPRESA,
        colaboradores,
        documentosEmpresas: [
            {
                id: "pcmso-1",
                empresaId: EMPRESA,
                empresa_id: EMPRESA,
                tipoDocumento: "PCMSO",
                tipo_documento: "PCMSO",
                dataEmissao: "2026-01-01",
                data_emissao: "2026-01-01",
                dataVencimento: "2026-12-31",
                data_vencimento: "2026-12-31",
                statusValidacao: "Validado",
                status_validacao: "Validado",
            },
        ],
        movimentacoesVinculo: [],
        historicoVinculoCarregado: true,
        agora:
            new Date(
                "2026-08-12T12:00:00.000Z"
            ),
    });

/*
 * Simula situação real:
 * reconstrução automática possui somente 2,
 * mas o Item 14 foi confirmado manualmente com 3.
 */
const snapshotConfirmado =
    {
        statusSnapshot:
            "confirmado",
        origemDados:
            "confirmacao_manual",
        confirmadoPorUsuario:
            true,
        requerConfirmacaoHumana:
            false,
        competencia:
            "2026-07",
        dataReferencia:
            "2026-07-31",
        totalColaboradores:
            3,
        colaboradores:
            [
                {
                    id:
                        "c1",
                    nome:
                        "c1",
                },
                {
                    id:
                        "c2",
                    nome:
                        "c2",
                },
                {
                    id:
                        "c3",
                    nome:
                        "c3",
                },
            ],
    };

const evidenciaAlinhada =
    recalcularEvidenciaOcupacionalComSnapshotMaoDeObra({
        evidenciaInterna:
            evidenciaBase,
        snapshotMaoDeObra:
            snapshotConfirmado,
        colaboradores,
    });

assert.equal(
    evidenciaAlinhada.totalAtivos,
    3,
    "Item 15 deve usar exatamente o total confirmado pelo Item 14.",
);

assert.equal(
    evidenciaAlinhada.asosValidos,
    2,
    "Dois dos três colaboradores possuem ASO válido.",
);

assert.equal(
    evidenciaAlinhada.asosPendentes,
    1,
    "Um dos três colaboradores deve permanecer pendente.",
);

assert.equal(
    evidenciaAlinhada.origemUniversoOcupacional,
    "snapshot_mao_de_obra_confirmado",
    "A origem do universo deve indicar o snapshot confirmado.",
);

assert.equal(
    evidenciaAlinhada.historicoConfiavel,
    false,
    "Confirmar mão de obra não deve transformar automaticamente documentos ocupacionais históricos em evidência confiável.",
);

assert.equal(
    snapshotConfirmado.totalColaboradores,
    evidenciaAlinhada.totalAtivos,
    "Denominador do Item 15 deve ser idêntico ao total confirmado do Item 14.",
);

console.log(
    "TESTE_ITEM15_UNIVERSO_CONFIRMADO_35_OK"
);

console.log(
    "TESTE_ITEM15_DENOMINADOR_ALINHADO_ITEM14_OK"
);