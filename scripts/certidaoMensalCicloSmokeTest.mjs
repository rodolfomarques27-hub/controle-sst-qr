import assert from "node:assert/strict";
import {
    CERTIDAO_MENSAL_CICLO_RPC,
    criarServicoCicloCertidaoMensal,
    normalizarHistoricoAnualCertidaoMensal,
} from "../src/features/certidao-mensal-documental/services/certidaoMensalCicloService.js";

const COMPETENCIA_ID =
    "11111111-1111-4111-8111-111111111111";

const EMPRESA_ID =
    "22222222-2222-4222-8222-222222222222";

function criarClienteMock(
    respostas = [],
) {
    const chamadas = [];

    return {
        chamadas,
        async rpc(
            nome,
            parametros,
        ) {
            chamadas.push({
                nome,
                parametros,
            });

            const resposta =
                respostas.shift() || {
                    data: null,
                    error: null,
                };

            return resposta;
        },
    };
}

assert.throws(
    () =>
        criarServicoCicloCertidaoMensal({
            clienteSupabase: {},
        }),
    /Cliente Supabase inválido/,
    "O serviço deve recusar clientes sem RPC.",
);

{
    const respostaRpc = {
        competenciaId:
            COMPETENCIA_ID,
        empresaId:
            EMPRESA_ID,
        competencia:
            "2026-08-01",
        status:
            "ABERTA",
        contratoVersao:
            1,
        criada:
            true,
        reutilizada:
            false,
        fechadoEm:
            null,
        fechadoPor:
            null,
        atualizadoEm:
            "2026-08-05T15:00:00Z",
    };

    const cliente =
        criarClienteMock([
            {
                data:
                    respostaRpc,
                error:
                    null,
            },
        ]);

    const servico =
        criarServicoCicloCertidaoMensal({
            clienteSupabase:
                cliente,
        });

    const resultado =
        await servico.obterOuCriarCompetencia({
            empresaId:
                "  " + EMPRESA_ID + "  ",
            competencia:
                "  2026-08-01  ",
        });

    assert.deepEqual(
        resultado,
        respostaRpc,
        "A inicialização deve devolver o contrato JSON da RPC.",
    );

    assert.deepEqual(
        cliente.chamadas,
        [
            {
                nome:
                    CERTIDAO_MENSAL_CICLO_RPC
                        .OBTER_OU_CRIAR_COMPETENCIA,
                parametros: {
                    p_empresa_id:
                        EMPRESA_ID,
                    p_competencia:
                        "2026-08-01",
                },
            },
        ],
        "A inicialização deve normalizar empresa e competência.",
    );
}

{
    const cliente =
        criarClienteMock([
            {
                data: {
                    processados: 2,
                },
                error: null,
            },
        ]);

    const servico =
        criarServicoCicloCertidaoMensal({
            clienteSupabase:
                cliente,
        });

    const resultado =
        await servico.consolidarItensAutomaticos({
            competenciaId:
                COMPETENCIA_ID,
            itens: [
                {
                    tipoDocumento:
                        "relacao-empregados",
                    titulo:
                        "Relação de Empregados",
                    status:
                        "CONFORME",
                    snapshot: {
                        totalAtivos: 12,
                    },
                },
                {
                    tipoDocumento:
                        "aso-pcmso",
                    titulo:
                        "ASO + PCMSO",
                    status:
                        "PENDENTE",
                    snapshot: {
                        asosValidos: 10,
                    },
                },
            ],
        });

    assert.deepEqual(
        resultado,
        {
            processados: 2,
        },
        "A consolidação deve devolver o resumo da RPC.",
    );

    assert.equal(
        cliente.chamadas.length,
        1,
        "A consolidação deve executar somente uma RPC.",
    );

    assert.equal(
        cliente.chamadas[0].nome,
        CERTIDAO_MENSAL_CICLO_RPC
            .CONSOLIDAR_ITENS_AUTOMATICOS,
        "A consolidação deve usar a RPC correta.",
    );

    assert.deepEqual(
        cliente.chamadas[0].parametros,
        {
            p_competencia_id:
                COMPETENCIA_ID,
            p_itens: [
                {
                    tipoDocumento:
                        "relacao-empregados",
                    titulo:
                        "Relação de Empregados",
                    status:
                        "CONFORME",
                    snapshot: {
                        totalAtivos: 12,
                    },
                },
                {
                    tipoDocumento:
                        "aso-pcmso",
                    titulo:
                        "ASO + PCMSO",
                    status:
                        "PENDENTE",
                    snapshot: {
                        asosValidos: 10,
                    },
                },
            ],
        },
        "O payload automático deve manter os dois tipos exigidos.",
    );
}

{
    const cliente =
        criarClienteMock();

    const servico =
        criarServicoCicloCertidaoMensal({
            clienteSupabase:
                cliente,
        });

    await assert.rejects(
        () =>
            servico.consolidarItensAutomaticos({
                competenciaId:
                    COMPETENCIA_ID,
                itens: [
                    {
                        tipoDocumento:
                            "relacao-empregados",
                        titulo:
                            "Relação",
                        status:
                            "CONFORME",
                        snapshot: {},
                    },
                    {
                        tipoDocumento:
                            "relacao-empregados",
                        titulo:
                            "Relação duplicada",
                        status:
                            "CONFORME",
                        snapshot: {},
                    },
                ],
            }),
        /Relação de Empregados e ASO \+ PCMSO/,
        "Tipos automáticos duplicados devem ser recusados localmente.",
    );

    assert.equal(
        cliente.chamadas.length,
        0,
        "Payload inválido não pode alcançar o Supabase.",
    );
}

{
    const cliente =
        criarClienteMock([
            {
                data: {
                    statusDestino:
                        "FECHADA",
                    conformidade:
                        100,
                },
                error: null,
            },
        ]);

    const servico =
        criarServicoCicloCertidaoMensal({
            clienteSupabase:
                cliente,
        });

    const resultado =
        await servico.fecharCompetencia({
            competenciaId:
                COMPETENCIA_ID,
        });

    assert.equal(
        resultado.statusDestino,
        "FECHADA",
        "O fechamento deve devolver o resumo consolidado.",
    );

    assert.deepEqual(
        cliente.chamadas[0],
        {
            nome:
                CERTIDAO_MENSAL_CICLO_RPC
                    .FECHAR_COMPETENCIA,
            parametros: {
                p_competencia_id:
                    COMPETENCIA_ID,
            },
        },
        "O fechamento deve enviar somente o ID da competência.",
    );
}

{
    const cliente =
        criarClienteMock([
            {
                data: {
                    statusDestino:
                        "REABERTA",
                },
                error: null,
            },
        ]);

    const servico =
        criarServicoCicloCertidaoMensal({
            clienteSupabase:
                cliente,
        });

    await servico.reabrirCompetencia({
        competenciaId:
            COMPETENCIA_ID,
        motivo:
            "  Correção documental necessária.  ",
    });

    assert.deepEqual(
        cliente.chamadas[0],
        {
            nome:
                CERTIDAO_MENSAL_CICLO_RPC
                    .REABRIR_COMPETENCIA,
            parametros: {
                p_competencia_id:
                    COMPETENCIA_ID,
                p_motivo:
                    "Correção documental necessária.",
            },
        },
        "A reabertura deve normalizar o motivo.",
    );

    await assert.rejects(
        () =>
            servico.reabrirCompetencia({
                competenciaId:
                    COMPETENCIA_ID,
                motivo:
                    "não",
            }),
        /motivo válido/,
        "Motivos curtos devem ser recusados.",
    );
}

{
    const cliente =
        criarClienteMock([
            {
                data: [
                    {
                        competencia_id:
                            COMPETENCIA_ID,
                        competencia:
                            "2026-01-01",
                        fechado_em:
                            "2026-02-05T13:00:00Z",
                        fechado_por:
                            EMPRESA_ID,
                        resumo: {
                            conformidade:
                                92,
                        },
                    },
                    {
                        competencia_id:
                            "33333333-3333-4333-8333-333333333333",
                        competencia:
                            "2026-02-01",
                        fechado_em:
                            "2026-03-05T13:00:00Z",
                        fechado_por:
                            EMPRESA_ID,
                        resumo: null,
                    },
                ],
                error: null,
            },
        ]);

    const servico =
        criarServicoCicloCertidaoMensal({
            clienteSupabase:
                cliente,
        });

    const historico =
        await servico.listarHistoricoAnual({
            empresaId:
                EMPRESA_ID,
            ano:
                2026,
        });

    assert.equal(
        historico.length,
        2,
        "O histórico deve preservar as competências retornadas.",
    );

    assert.equal(
        historico[0].competenciaLabel,
        "01/2026",
        "A competência deve ser formatada para exibição.",
    );

    assert.deepEqual(
        historico[1].resumo,
        {},
        "Resumo nulo deve ser normalizado para objeto vazio.",
    );

    assert.deepEqual(
        cliente.chamadas[0],
        {
            nome:
                CERTIDAO_MENSAL_CICLO_RPC
                    .LISTAR_HISTORICO_ANUAL,
            parametros: {
                p_empresa_id:
                    EMPRESA_ID,
                p_ano:
                    2026,
            },
        },
        "O histórico deve usar empresa e ano normalizados.",
    );
}

assert.deepEqual(
    normalizarHistoricoAnualCertidaoMensal(
        null,
    ),
    [],
    "Resposta anual ausente deve gerar uma lista vazia.",
);

{
    const cliente =
        criarClienteMock([
            {
                data: null,
                error: {
                    code:
                        "42501",
                    message:
                        "Usuário sem acesso à competência informada.",
                },
            },
        ]);

    const servico =
        criarServicoCicloCertidaoMensal({
            clienteSupabase:
                cliente,
        });

    await assert.rejects(
        async () => {
            try {
                await servico.fecharCompetencia({
                    competenciaId:
                        COMPETENCIA_ID,
                });
            }
            catch (erro) {
                assert.equal(
                    erro.name,
                    "CertidaoMensalCicloError",
                    "O erro remoto deve ser tipado.",
                );

                assert.equal(
                    erro.codigo,
                    "42501",
                    "O código do PostgreSQL deve ser preservado.",
                );

                assert.equal(
                    erro.rpc,
                    CERTIDAO_MENSAL_CICLO_RPC
                        .FECHAR_COMPETENCIA,
                    "A RPC de origem deve ser preservada.",
                );

                throw erro;
            }
        },
        /Usuário sem acesso/,
        "Erros do Supabase devem manter uma mensagem operacional.",
    );
}

{
    const cliente =
        criarClienteMock();

    const servico =
        criarServicoCicloCertidaoMensal({
            clienteSupabase:
                cliente,
        });

    await assert.rejects(
        () =>
            servico.listarHistoricoAnual({
                empresaId:
                    EMPRESA_ID,
                ano:
                    1999,
            }),
        /ano informado é inválido/,
        "Anos fora do intervalo devem ser bloqueados.",
    );

    await assert.rejects(
        () =>
            servico.fecharCompetencia({
                competenciaId:
                    "id-invalido",
            }),
        /Identificador da competência inválido/,
        "IDs inválidos não podem alcançar o banco.",
    );

    assert.equal(
        cliente.chamadas.length,
        0,
        "Validações locais não podem executar RPCs.",
    );
}

{
    const cliente =
        criarClienteMock();

    const servico =
        criarServicoCicloCertidaoMensal({
            clienteSupabase:
                cliente,
        });

    await assert.rejects(
        () =>
            servico.obterOuCriarCompetencia({
                empresaId:
                    EMPRESA_ID,
                competencia:
                    "2026-08-15",
            }),
        /primeiro dia do mês/,
        "Competências fora do primeiro dia devem ser bloqueadas localmente.",
    );

    await assert.rejects(
        () =>
            servico.obterOuCriarCompetencia({
                empresaId:
                    "empresa-invalida",
                competencia:
                    "2026-08-01",
            }),
        /Identificador da empresa inválido/,
        "Empresas inválidas não podem alcançar o banco.",
    );

    assert.equal(
        cliente.chamadas.length,
        0,
        "Validações locais da inicialização não podem executar RPCs.",
    );
}

console.log(
    "CERTIDÃO MENSAL — SMOKE DO CICLO ANUAL APROVADO",
);
console.log(
    "RPCs validadas: inicialização, consolidação, fechamento, reabertura e histórico anual.",
);
console.log(
    "Nenhuma conexão real com o Supabase foi realizada.",
);
