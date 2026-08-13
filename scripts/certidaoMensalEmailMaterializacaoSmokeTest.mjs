import assert from "node:assert/strict";

import {
    CERTIDAO_MENSAL_EMAIL_FUNCTION_NAME,
} from "../src/features/certidao-mensal-documental/domain/certidaoMensalEnvioEmailContract.js";

import {
    CERTIDAO_MENSAL_RPC_MATERIALIZAR_ITENS_EXTERNOS,
} from "../src/features/certidao-mensal-documental/services/certidaoMensalMaterializacaoItensService.js";

import {
    criarCertidaoMensalEmailEnvioService,
} from "../src/features/certidao-mensal-documental/services/certidaoMensalEmailEnvioService.js";

const COMPETENCIA_ID =
    "11111111-1111-4111-8111-111111111111";

const ENVIO_ID =
    "22222222-2222-4222-8222-222222222222";

const UUID_ENVIO =
    "33333333-3333-4333-8333-333333333333";

{
    const chamadas = [];

    const clienteSupabase = {
        from() {
            throw new Error(
                "A consulta da competência não deveria ocorrer quando o ID já foi informado.",
            );
        },

        async rpc(
            nome,
            parametros,
        ) {
            chamadas.push({
                etapa:
                    "MATERIALIZAR",
                nome,
                parametros,
            });

            return {
                data: {
                    competenciaId:
                        COMPETENCIA_ID,
                    totalDocumentosExternos:
                        15,
                    itensCriados:
                        15,
                    itensExistentes:
                        0,
                    itensDisponiveis:
                        15,
                    materializadoEm:
                        "2026-08-06T12:45:00.000Z",
                },
                error:
                    null,
            };
        },

        functions: {
            async invoke(
                nome,
                opcoes,
            ) {
                chamadas.push({
                    etapa:
                        "ENVIAR",
                    nome,
                    opcoes,
                });

                return {
                    data: {
                        ok:
                            true,
                        status:
                            "ENVIADO",
                        envioId:
                            ENVIO_ID,
                        reutilizado:
                            false,
                    },
                    error:
                        null,
                };
            },
        },
    };

    const servico =
        criarCertidaoMensalEmailEnvioService({
            clienteSupabase,
            gerarUuid() {
                return UUID_ENVIO;
            },
        });

    const resultado =
        await servico.enviarCertidaoMensalPorEmail({
            competenciaId:
                COMPETENCIA_ID,
        });

    assert.equal(
        chamadas.length,
        2,
        "O fluxo deve executar somente materialização e envio.",
    );

    assert.deepEqual(
        chamadas[0],
        {
            etapa:
                "MATERIALIZAR",
            nome:
                CERTIDAO_MENSAL_RPC_MATERIALIZAR_ITENS_EXTERNOS,
            parametros: {
                p_competencia_id:
                    COMPETENCIA_ID,
            },
        },
        "A materialização deve ocorrer antes do envio.",
    );

    assert.equal(
        chamadas[1].etapa,
        "ENVIAR",
        "A Edge Function deve ser chamada somente após a materialização.",
    );

    assert.equal(
        chamadas[1].nome,
        CERTIDAO_MENSAL_EMAIL_FUNCTION_NAME,
    );

    assert.equal(
        chamadas[1].opcoes.body.competenciaId,
        COMPETENCIA_ID,
    );

    assert.match(
        chamadas[1].opcoes.body.chaveIdempotencia,
        new RegExp(
            `^certidao:${COMPETENCIA_ID}:`,
        ),
    );

    assert.equal(
        resultado.ok,
        true,
    );

    assert.equal(
        resultado.envioId,
        ENVIO_ID,
    );

    assert.equal(
        resultado.materializacaoItens.itensDisponiveis,
        15,
        "O resultado deve preservar a confirmação dos quinze itens externos.",
    );
}

{
    let edgeInvocada =
        false;

    const clienteSupabase = {
        from() {
            throw new Error(
                "Consulta inesperada.",
            );
        },

        async rpc() {
            return {
                data:
                    null,
                error: {
                    message:
                        "Competência fechada.",
                },
            };
        },

        functions: {
            async invoke() {
                edgeInvocada =
                    true;

                return {
                    data:
                        null,
                    error:
                        null,
                };
            },
        },
    };

    const servico =
        criarCertidaoMensalEmailEnvioService({
            clienteSupabase,
            gerarUuid() {
                return UUID_ENVIO;
            },
        });

    await assert.rejects(
        () =>
            servico.enviarCertidaoMensalPorEmail({
                competenciaId:
                    COMPETENCIA_ID,
            }),
        (erro) => {
            assert.equal(
                erro.name,
                "CertidaoMensalEmailEnvioError",
            );

            assert.equal(
                erro.codigo,
                "MATERIALIZACAO_ITENS_EXTERNOS",
            );

            assert.match(
                erro.message,
                /competência fechada/i,
            );

            return true;
        },
    );

    assert.equal(
        edgeInvocada,
        false,
        "Falha na materialização deve impedir o envio do e-mail.",
    );
}

{
    let edgeInvocada =
        false;

    const clienteSupabase = {
        from() {
            throw new Error(
                "Consulta inesperada.",
            );
        },

        async rpc() {
            return {
                data: {
                    competenciaId:
                        COMPETENCIA_ID,
                    totalDocumentosExternos:
                        15,
                    itensCriados:
                        7,
                    itensExistentes:
                        0,
                    itensDisponiveis:
                        7,
                },
                error:
                    null,
            };
        },

        functions: {
            async invoke() {
                edgeInvocada =
                    true;

                return {
                    data:
                        null,
                    error:
                        null,
                };
            },
        },
    };

    const servico =
        criarCertidaoMensalEmailEnvioService({
            clienteSupabase,
            gerarUuid() {
                return UUID_ENVIO;
            },
        });

    await assert.rejects(
        () =>
            servico.enviarCertidaoMensalPorEmail({
                competenciaId:
                    COMPETENCIA_ID,
            }),
        (erro) => {
            assert.equal(
                erro.codigo,
                "MATERIALIZACAO_ITENS_EXTERNOS",
            );

            assert.match(
                erro.message,
                /15 documentos externos/i,
            );

            return true;
        },
    );

    assert.equal(
        edgeInvocada,
        false,
        "Resposta incompleta da RPC deve impedir a Edge Function.",
    );
}

console.log(
    "CERTIDÃO MENSAL — MATERIALIZAÇÃO ANTES DO E-MAIL APROVADA",
);

console.log(
    "Fluxos validados: RPC antes da Edge Function, quinze itens disponíveis, bloqueio de envio quando a materialização falha e nenhuma chamada real ao Supabase.",
);
