import assert from "node:assert/strict";

import {
    carregarContextoCicloCertidaoMensal,
    normalizarContextoCicloCertidaoMensalHook,
} from "../src/features/certidao-mensal-documental/hooks/useCertidaoMensalCiclo.js";

const EMPRESA_ID =
    "22222222-2222-4222-8222-222222222222";

const COMPETENCIA_ID =
    "11111111-1111-4111-8111-111111111111";

const EMPRESA =
    Object.freeze({
        data_inicio_contrato:
            "2026-01-01",
    });

{
    const contexto =
        normalizarContextoCicloCertidaoMensalHook({
            empresaId:
                `  ${EMPRESA_ID}  `,
            competencia:
                "08/2026",
            empresa:
                EMPRESA,
        });

    assert.deepEqual(
        contexto,
        {
            empresaId:
                EMPRESA_ID,
            competencia:
                "2026-08-01",
            chave:
                `${EMPRESA_ID}|2026-08-01`,
            ano:
                2026,
            empresa:
                EMPRESA,
        },
        "O hook deve converter MM/AAAA para a competência ISO.",
    );
}

{
    const contexto =
        normalizarContextoCicloCertidaoMensalHook({
            empresaId:
                "",
            competencia:
                "08/2026",
        });

    assert.equal(
        contexto,
        null,
        "O hook deve permanecer ocioso enquanto não houver empresa.",
    );
}

{
    const chamadas = [];

    const resultado =
        await carregarContextoCicloCertidaoMensal({
            empresaId:
                EMPRESA_ID,
            competencia:
                "08/2026",
            empresa:
                EMPRESA,
            obterControlador:
                async () => ({
                    async prepararContexto(
                        parametros,
                    ) {
                        chamadas.push(
                            parametros,
                        );

                        return {
                            chave:
                                `${EMPRESA_ID}|2026-08-01`,
                            ano:
                                2026,
                            competenciaAtual: {
                                competenciaId:
                                    COMPETENCIA_ID,
                                empresaId:
                                    EMPRESA_ID,
                                competencia:
                                    "2026-08-01",
                                status:
                                    "ABERTA",
                                criada:
                                    true,
                                reutilizada:
                                    false,
                            },
                            itensAutomaticos:
                                [],
                            historicoAnual:
                                [],
                            vigenciaContratual: {
                                exigivel:
                                    true,
                                status:
                                    "DURANTE_DO_CONTRATO",
                            },
                        };
                    },
                }),
        });

    assert.deepEqual(
        chamadas,
        [
            {
                empresaId:
                    EMPRESA_ID,
                competencia:
                    "2026-08-01",
                empresa:
                    EMPRESA,
            },
        ],
        "O hook deve entregar ao controlador somente o contrato canônico.",
    );

    assert.equal(
        resultado.competenciaAtual
            .competenciaId,
        COMPETENCIA_ID,
        "O hook deve preservar o identificador remoto da competência.",
    );

    assert.equal(
        resultado.itensAutomaticos.length,
        0,
        "O hook deve aceitar a lista automática ainda vazia.",
    );

    assert.equal(
        resultado.historicoAnual.length,
        0,
        "O hook deve aceitar histórico anual ainda vazio.",
    );

    assert.equal(
        resultado.vigenciaContratual.status,
        "DURANTE_DO_CONTRATO",
        "O hook deve preservar a classificação de vigência do controlador.",
    );
}

await assert.rejects(
    () =>
        carregarContextoCicloCertidaoMensal({
            empresaId:
                EMPRESA_ID,
            competencia:
                "2026-08-15",
            obterControlador:
                async () => {
                    throw new Error(
                        "O controlador não deveria ser carregado.",
                    );
                },
        }),
    /MM\/AAAA, AAAA-MM ou AAAA-MM-01/,
    "Uma competência fora do primeiro dia deve ser rejeitada antes do controlador.",
);

await assert.rejects(
    () =>
        carregarContextoCicloCertidaoMensal({
            empresaId:
                EMPRESA_ID,
            competencia:
                "08/2026",
            obterControlador:
                async () => ({
                    async prepararContexto() {
                        return {
                            chave:
                                `${EMPRESA_ID}|2026-07-01`,
                            ano:
                                2026,
                            competenciaAtual: {
                                competenciaId:
                                    COMPETENCIA_ID,
                            },
                            itensAutomaticos:
                                [],
                            historicoAnual:
                                [],
                        };
                    },
                }),
        }),
    /outra empresa ou competência/,
    "Respostas assíncronas de outro contexto devem ser rejeitadas.",
);

console.log(
    "CERTIDÃO MENSAL — SMOKE DO HOOK ANUAL APROVADO",
);

console.log(
    "Fluxos validados: normalização, contexto ocioso, carregamento e proteção contra resposta divergente.",
);

console.log(
    "Nenhuma RPC real ou conexão com o Supabase foi realizada.",
);