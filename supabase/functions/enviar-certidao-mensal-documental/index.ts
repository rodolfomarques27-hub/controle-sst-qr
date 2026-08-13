import {
    criarContextoAutenticacao,
    validarAcessoCompetencia,
} from "./auth.ts";

import {
    carregarAssinaturaInline,
    carregarContextoEnvio,
} from "./dados.ts";

import {
    criarTransportadorEmail,
    enviarParteEmail,
} from "./email.ts";

import {
    concluirEnvio,
    criarEstruturaEnvio,
    criarOuReutilizarEnvio,
    falharEnvio,
    marcarEnvioEnviando,
    marcarParteEnviada,
    marcarParteEnviando,
    marcarParteErro,
    marcarPartesRestantesErro,
    obterEnvioExistente,
    resolverStatusFinalEnvio,
    validarEnvioExistente,
} from "./historico.ts";

import {
    planejarPartes,
} from "./partes.ts";

import type {
    AnexoPdf,
    PartePersistida,
    SupabaseClientAny,
} from "./types.ts";

import {
    ErroHttp,
    corsHeaders,
    lerSolicitacao,
    mensagemErro,
    objetoSeguro,
    renderizarModelo,
    respostaJson,
    textoSeguro,
} from "./utils.ts";

const VARIAVEL_PENDENTE_PATTERN =
    /{{\s*[a-z0-9_]+\s*}}/i;

export function validarModelosRenderizados(
    assunto: string,
    corpo: string,
) {
    const assuntoBase =
        assunto.trim();

    const corpoBase =
        corpo.trim();

    if (!assuntoBase) {
        throw new ErroHttp(
            422,
            "O assunto resultante não pode ficar vazio.",
        );
    }

    if (!corpoBase) {
        throw new ErroHttp(
            422,
            "O corpo resultante não pode ficar vazio.",
        );
    }

    if (assuntoBase.length > 180) {
        throw new ErroHttp(
            422,
            "O assunto resultante ultrapassa 180 caracteres.",
        );
    }

    if (corpoBase.length > 10000) {
        throw new ErroHttp(
            422,
            "O corpo resultante ultrapassa 10.000 caracteres.",
        );
    }

    if (/[\r\n]/.test(assuntoBase)) {
        throw new ErroHttp(
            422,
            "O assunto resultante contém quebra de linha não permitida.",
        );
    }

    if (
        VARIAVEL_PENDENTE_PATTERN.test(
            assuntoBase,
        ) ||
        VARIAVEL_PENDENTE_PATTERN.test(
            corpoBase,
        )
    ) {
        throw new ErroHttp(
            422,
            "O modelo contém variável não reconhecida.",
        );
    }

    return {
        assuntoBase,
        corpoBase,
    };
}

function montarRespostaReutilizada(
    envio: Record<string, unknown>,
) {
    const status =
        textoSeguro(
            envio.status,
            30,
        );

    return {
        ok:
            status === "ENVIADO",

        reutilizado:
            true,

        envio,
    };
}

async function registrarFalhaDasPartes(
    adminClient: SupabaseClientAny,
    partes: PartePersistida[],
    partesEnviadas: number,
    erro: string,
) {
    if (
        partes.length === 0 ||
        partesEnviadas >= partes.length
    ) {
        return;
    }

    try {
        await marcarPartesRestantesErro(
            adminClient,
            partes,
            partesEnviadas,
            erro,
        );
    } catch {
        // O registro consolidado continuará sendo atualizado.
    }
}

export async function processarRequisicao(
    req: Request,
): Promise<Response> {
    if (req.method === "OPTIONS") {
        return new Response(
            "ok",
            {
                status:
                    200,

                headers:
                    corsHeaders,
            },
        );
    }

    if (req.method !== "POST") {
        return respostaJson(
            405,
            {
                ok:
                    false,

                erro:
                    "Método não permitido. Use POST.",
            },
        );
    }

    let adminClient: SupabaseClientAny =
        null;

    let envioId =
        "";

    let partesPersistidas: PartePersistida[] =
        [];

    let partesEnviadas =
        0;

    let finalizado =
        false;

    try {
        const solicitacao =
            await lerSolicitacao(
                req,
            );

        const autenticacao =
            await criarContextoAutenticacao(
                req,
            );

        adminClient =
            autenticacao.adminClient;

        await validarAcessoCompetencia(
            autenticacao.userClient,
            solicitacao.competenciaId,
        );

        const envioExistente =
            await obterEnvioExistente(
                adminClient,
                solicitacao.chaveIdempotencia,
            );

        if (envioExistente) {
            const envioValidado =
                validarEnvioExistente(
                    envioExistente,
                    solicitacao.competenciaId,
                );

            return respostaJson(
                200,
                montarRespostaReutilizada(
                    envioValidado,
                ),
            );
        }

        const contexto =
            await carregarContextoEnvio(
                adminClient,
                solicitacao.competenciaId,
            );

        const assinatura =
            await carregarAssinaturaInline(
                adminClient,
            );

        const modelos =
            validarModelosRenderizados(
                renderizarModelo(
                    contexto.configuracao
                        .assuntoModelo,
                    contexto.variaveis,
                ),

                renderizarModelo(
                    contexto.configuracao
                        .corpoModelo,
                    contexto.variaveis,
                ),
            );

        const partesPlanejadas =
            planejarPartes(
                contexto.documentos,
                false,
                contexto.configuracao
                    .limiteMensagemBytes,
                assinatura?.bytes.byteLength ||
                    0,
                modelos.assuntoBase,
            );

        const criacao =
            await criarOuReutilizarEnvio(
                adminClient,
                contexto,
                autenticacao.usuario,
                solicitacao.chaveIdempotencia,
                modelos.assuntoBase,
                modelos.corpoBase,
                partesPlanejadas,
            );

        if (criacao.reutilizado) {
            const envioValidado =
                validarEnvioExistente(
                    objetoSeguro(
                        criacao.envio,
                    ),
                    solicitacao.competenciaId,
                );

            return respostaJson(
                200,
                montarRespostaReutilizada(
                    envioValidado,
                ),
            );
        }

        envioId =
            textoSeguro(
                objetoSeguro(
                    criacao.envio,
                ).id,
                50,
            );

        if (!envioId) {
            throw new ErroHttp(
                500,
                "O envio consolidado não recebeu identificador.",
            );
        }

        partesPersistidas =
            await criarEstruturaEnvio(
                adminClient,
                envioId,
                contexto,
                partesPlanejadas,
            );

        if (
            partesPersistidas.length !==
            partesPlanejadas.length
        ) {
            throw new ErroHttp(
                500,
                "A quantidade de partes persistidas ficou inconsistente.",
            );
        }

        await marcarEnvioEnviando(
            adminClient,
            envioId,
        );

        const {
            gmailUser,
            transporter,
        } =
            await criarTransportadorEmail();

        let erroOperacional =
            "";

        for (
            let indice = 0;
            indice < partesPersistidas.length;
            indice++
        ) {
            const parte =
                partesPersistidas[indice];

            try {
                await marcarParteEnviando(
                    adminClient,
                    parte.id,
                );

                const anexos: AnexoPdf[] =
                    [];

                const mensagemId =
                    await enviarParteEmail({
                        transporter,
                        gmailUser,

                        configuracao:
                            contexto.configuracao,

                        destinatarios:
                            contexto.destinatarios,

                        copias:
                            contexto.copias,

                        parte,

                        corpo:
                            modelos.corpoBase,

                        anexos,
                        assinatura,
                    });

                await marcarParteEnviada(
                    adminClient,
                    parte.id,
                    mensagemId,
                );

                partesEnviadas++;
            } catch (error) {
                erroOperacional =
                    mensagemErro(error);

                try {
                    await marcarParteErro(
                        adminClient,
                        parte.id,
                        erroOperacional,
                    );
                } catch (erroHistorico) {
                    erroOperacional =
                        (
                            erroOperacional +
                            " Falha adicional ao registrar a parte: " +
                            mensagemErro(
                                erroHistorico,
                            )
                        ).slice(
                            0,
                            2000,
                        );
                }

                try {
                    await marcarPartesRestantesErro(
                        adminClient,
                        partesPersistidas,
                        indice + 1,
                        "Parte não enviada porque uma parte anterior falhou.",
                    );
                } catch (erroHistorico) {
                    erroOperacional =
                        (
                            erroOperacional +
                            " Falha adicional ao atualizar as partes restantes: " +
                            mensagemErro(
                                erroHistorico,
                            )
                        ).slice(
                            0,
                            2000,
                        );
                }

                break;
            }
        }

        const statusFinal =
            resolverStatusFinalEnvio(
                partesPersistidas.length,
                partesEnviadas,
                Boolean(
                    erroOperacional,
                ),
            );

        await concluirEnvio(
            adminClient,
            envioId,
            statusFinal,
            partesEnviadas,
            erroOperacional ||
                null,
        );

        finalizado =
            true;

        return respostaJson(
            200,
            {
                ok:
                    statusFinal ===
                    "ENVIADO",

                reutilizado:
                    false,

                envioId,

                status:
                    statusFinal,

                totalDocumentos:
                    contexto.documentos.length,

                totalPartes:
                    partesPersistidas.length,

                partesEnviadas,

                totalPendencias:
                    contexto.totalPendencias,


                erro:
                    erroOperacional ||
                    null,
            },
        );
    } catch (error) {
        const erro =
            mensagemErro(error);

        if (
            adminClient &&
            envioId &&
            !finalizado
        ) {
            await registrarFalhaDasPartes(
                adminClient,
                partesPersistidas,
                partesEnviadas,
                erro,
            );

            await falharEnvio(
                adminClient,
                envioId,
                partesEnviadas,
                erro,
            );
        }

        const status =
            error instanceof ErroHttp
                ? error.status
                : 500;

        return respostaJson(
            status,
            {
                ok:
                    false,

                erro,

                ...(envioId
                    ? {
                        envioId,
                    }
                    : {}),
            },
        );
    }
}

if (import.meta.main) {
    Deno.serve(
        processarRequisicao,
    );
}