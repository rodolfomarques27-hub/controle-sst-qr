import assert from "node:assert/strict";

import {
    CERTIDAO_MENSAL_VIGENCIA_CONTRATUAL_STATUS,
} from "../src/features/certidao-mensal-documental/domain/certidaoMensalVigenciaContratual.js";

import {
    criarControladorCicloCertidaoMensal,
} from "../src/features/certidao-mensal-documental/services/certidaoMensalCicloController.js";

const EMPRESA_ID =
    "11111111-1111-4111-8111-111111111111";

function criarCenario() {
    const chamadas = {
        iniciar: 0,
        historico: 0,
    };

    const controlador =
        criarControladorCicloCertidaoMensal({
            servicoCiclo: {
                async obterOuCriarCompetencia({
                    empresaId,
                    competencia,
                }) {
                    chamadas.iniciar += 1;

                    return {
                        competenciaId:
                            "22222222-2222-4222-8222-222222222222",
                        empresaId,
                        competencia,
                        status:
                            "ABERTA",
                    };
                },

                async listarItensAutomaticos() {
                    return [];
                },

                async consolidarRelacaoEmpregados() {
                    return {};
                },

                async listarHistoricoAnual() {
                    chamadas.historico += 1;
                    return [];
                },

                async consolidarItensAutomaticos() {
                    return {};
                },

                async fecharCompetencia() {
                    return {};
                },

                async reabrirCompetencia() {
                    return {};
                },
            },
        });

    return {
        chamadas,
        controlador,
    };
}

{
    const {
        chamadas,
        controlador,
    } = criarCenario();

    const resultado =
        await controlador.prepararContexto({
            empresaId:
                EMPRESA_ID,
            competencia:
                "2026-03-01",
            empresa: {
                data_inicio_contrato:
                    "2026-03-15",
            },
        });

    assert.equal(
        resultado.vigenciaContratual.status,
        CERTIDAO_MENSAL_VIGENCIA_CONTRATUAL_STATUS
            .DURANTE_DO_CONTRATO,
    );

    assert.equal(
        chamadas.iniciar,
        1,
    );

    assert.equal(
        chamadas.historico,
        1,
    );

    assert.ok(
        resultado.competenciaAtual,
    );
}

{
    const {
        chamadas,
        controlador,
    } = criarCenario();

    const resultado =
        await controlador.prepararContexto({
            empresaId:
                EMPRESA_ID,
            competencia:
                "2026-02-01",
            empresa: {
                data_inicio_contrato:
                    "2026-03-15",
            },
        });

    assert.equal(
        resultado.vigenciaContratual.status,
        CERTIDAO_MENSAL_VIGENCIA_CONTRATUAL_STATUS
            .ANTES_DO_CONTRATO,
    );

    assert.equal(
        chamadas.iniciar,
        0,
    );

    assert.equal(
        chamadas.historico,
        1,
    );

    assert.equal(
        resultado.competenciaAtual,
        null,
    );
}

{
    const {
        chamadas,
        controlador,
    } = criarCenario();

    const resultado =
        await controlador.prepararContexto({
            empresaId:
                EMPRESA_ID,
            competencia:
                "2026-08-01",
            empresa: {},
        });

    assert.equal(
        resultado.vigenciaContratual.status,
        CERTIDAO_MENSAL_VIGENCIA_CONTRATUAL_STATUS
            .SEM_INICIO_CONTRATO,
    );

    assert.equal(
        chamadas.iniciar,
        0,
    );

    assert.equal(
        chamadas.historico,
        1,
    );
}

console.log(
    "SafeScan: integração da vigência com o ciclo mensal aprovada.",
);
