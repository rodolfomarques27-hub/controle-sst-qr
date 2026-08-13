import assert from "node:assert/strict";

import {
    criarChaveContextoCicloCertidaoMensal,
    criarControladorCicloCertidaoMensal,
    normalizarCompetenciaCicloControlador,
    obterAnoCompetenciaCiclo,
} from "../src/features/certidao-mensal-documental/services/certidaoMensalCicloController.js";

const EMPRESA_ID =
    "22222222-2222-4222-8222-222222222222";

const COMPETENCIA_ID =
    "11111111-1111-4111-8111-111111111111";

function criarServicoMock({
    erroInicializacao = null,
} = {}) {
    const chamadas = [];

    return {
        chamadas,

        async obterOuCriarCompetencia(
            parametros,
        ) {
            chamadas.push({
                metodo:
                    "obterOuCriarCompetencia",
                parametros,
            });

            if (erroInicializacao) {
                throw erroInicializacao;
            }

            return {
                competenciaId:
                    COMPETENCIA_ID,
                empresaId:
                    parametros.empresaId,
                competencia:
                    parametros.competencia,
                status:
                    "ABERTA",
                criada:
                    true,
                reutilizada:
                    false,
            };
        },

        async listarItensAutomaticos(
            parametros,
        ) {
            chamadas.push({
                metodo:
                    "listarItensAutomaticos",
                parametros,
            });

            return [];
        },

        async consolidarRelacaoEmpregados() {
            return {
                processados:
                    1,
            };
        },

        async listarHistoricoAnual(
            parametros,
        ) {
            chamadas.push({
                metodo:
                    "listarHistoricoAnual",
                parametros,
            });

            return [
                {
                    competenciaId:
                        COMPETENCIA_ID,
                    competencia:
                        "2026-08-01",
                    status:
                        "ABERTA",
                },
            ];
        },

        async consolidarItensAutomaticos(
            parametros,
        ) {
            chamadas.push({
                metodo:
                    "consolidarItensAutomaticos",
                parametros,
            });

            return {
                processados:
                    2,
            };
        },

        async fecharCompetencia(
            parametros,
        ) {
            chamadas.push({
                metodo:
                    "fecharCompetencia",
                parametros,
            });

            return {
                competenciaId:
                    parametros.competenciaId,
                status:
                    "FECHADA",
            };
        },

        async reabrirCompetencia(
            parametros,
        ) {
            chamadas.push({
                metodo:
                    "reabrirCompetencia",
                parametros,
            });

            return {
                competenciaId:
                    parametros.competenciaId,
                status:
                    "REABERTA",
                motivo:
                    parametros.motivo,
            };
        },
    };
}

assert.throws(
    () =>
        criarControladorCicloCertidaoMensal({
            servicoCiclo: {},
        }),
    /sem o método obterOuCriarCompetencia/,
    "O controlador deve rejeitar serviços incompletos.",
);

assert.equal(
    normalizarCompetenciaCicloControlador(
        " 2026-08-01 ",
    ),
    "2026-08-01",
    "A competência deve ser normalizada.",
);

assert.equal(
    obterAnoCompetenciaCiclo(
        "2026-08-01",
    ),
    2026,
    "O ano deve ser extraído da competência.",
);

assert.equal(
    criarChaveContextoCicloCertidaoMensal({
        empresaId:
            EMPRESA_ID,
        competencia:
            "2026-08-01",
    }),
    `${EMPRESA_ID}|2026-08-01`,
    "A chave deve identificar empresa e competência.",
);

{
    const servico =
        criarServicoMock();

    const controlador =
        criarControladorCicloCertidaoMensal({
            servicoCiclo:
                servico,
        });

    const resultado =
        await controlador.prepararContexto({
            empresaId:
                `  ${EMPRESA_ID}  `,
            competencia:
                "  2026-08-01  ",
            empresa: {
                data_inicio_contrato:
                    "2026-01-01",
            },
        });

    assert.deepEqual(
        servico.chamadas,
        [
            {
                metodo:
                    "obterOuCriarCompetencia",
                parametros: {
                    empresaId:
                        EMPRESA_ID,
                    competencia:
                        "2026-08-01",
                },
            },
            {
                metodo:
                    "listarItensAutomaticos",
                parametros: {
                    competenciaId:
                        COMPETENCIA_ID,
                },
            },
            {
                metodo:
                    "listarHistoricoAnual",
                parametros: {
                    empresaId:
                        EMPRESA_ID,
                    ano:
                        2026,
                },
            },
        ],
        "A preparação deve inicializar, listar os itens automáticos e depois carregar o histórico.",
    );

    assert.equal(
        resultado.chave,
        `${EMPRESA_ID}|2026-08-01`,
        "O contexto deve possuir chave estável.",
    );

    assert.equal(
        resultado.ano,
        2026,
        "O contexto deve informar o ano consultado.",
    );

    assert.equal(
        resultado.competenciaAtual.status,
        "ABERTA",
        "O registro atual deve ser preservado.",
    );

    assert.equal(
        resultado.historicoAnual.length,
        1,
        "O histórico anual deve ser preservado.",
    );
}

{
    const servico =
        criarServicoMock();

    const controlador =
        criarControladorCicloCertidaoMensal({
            servicoCiclo:
                servico,
        });

    await assert.rejects(
        () =>
            controlador.prepararContexto({
                empresaId:
                    EMPRESA_ID,
                competencia:
                    "2026-08-15",
            }),
        /primeiro dia do mês/,
        "Competências inválidas devem ser bloqueadas antes do serviço.",
    );

    assert.equal(
        servico.chamadas.length,
        0,
        "Entradas inválidas não podem alcançar o serviço.",
    );
}

{
    const erroEsperado =
        new Error(
            "Falha controlada de inicialização.",
        );

    const servico =
        criarServicoMock({
            erroInicializacao:
                erroEsperado,
        });

    const controlador =
        criarControladorCicloCertidaoMensal({
            servicoCiclo:
                servico,
        });

    await assert.rejects(
        () =>
            controlador.prepararContexto({
                empresaId:
                    EMPRESA_ID,
                competencia:
                    "2026-08-01",
                empresa: {
                    data_inicio_contrato:
                        "2026-01-01",
                },
            }),
        (erro) =>
            erro === erroEsperado,
        "O controlador deve preservar o erro original.",
    );

    assert.equal(
        servico.chamadas.length,
        1,
        "O histórico não pode ser consultado após falha na inicialização.",
    );
}

{
    const servico =
        criarServicoMock();

    const controlador =
        criarControladorCicloCertidaoMensal({
            servicoCiclo:
                servico,
        });

    const itens = [
        {
            tipoDocumento:
                "relacao-empregados",
            status:
                "CONFORME",
        },
        {
            tipoDocumento:
                "aso-pcmso",
            status:
                "PENDENTE",
        },
    ];

    await controlador
        .consolidarItensAutomaticos({
            competenciaId:
                COMPETENCIA_ID,
            itens,
        });

    await controlador
        .fecharCompetencia({
            competenciaId:
                COMPETENCIA_ID,
        });

    await controlador
        .reabrirCompetencia({
            competenciaId:
                COMPETENCIA_ID,
            motivo:
                "Correção documental necessária.",
        });

    assert.deepEqual(
        servico.chamadas,
        [
            {
                metodo:
                    "consolidarItensAutomaticos",
                parametros: {
                    competenciaId:
                        COMPETENCIA_ID,
                    itens,
                },
            },
            {
                metodo:
                    "fecharCompetencia",
                parametros: {
                    competenciaId:
                        COMPETENCIA_ID,
                },
            },
            {
                metodo:
                    "reabrirCompetencia",
                parametros: {
                    competenciaId:
                        COMPETENCIA_ID,
                    motivo:
                        "Correção documental necessária.",
                },
            },
        ],
        "As ações devem ser delegadas sem alterar o contrato.",
    );
}

console.log(
    "CERTIDÃO MENSAL — SMOKE DO CONTROLADOR APROVADO",
);

console.log(
    "Fluxos validados: preparação, histórico, consolidação, fechamento e reabertura.",
);

console.log(
    "Nenhuma RPC real ou conexão com o Supabase foi realizada.",
);