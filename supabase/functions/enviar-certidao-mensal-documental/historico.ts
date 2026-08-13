import type {
    ContextoEnvio,
    JsonRecord,
    PartePersistida,
    PartePlanejada,
    SupabaseClientAny,
    UsuarioAutenticado,
} from "./types.ts";

import {
    ErroHttp,
    agoraIso,
    mensagemErro,
    objetoSeguro,
    textoSeguro,
} from "./utils.ts";

export type StatusFinalEnvio =
    "ENVIADO" |
    "PARCIAL" |
    "ERRO";

export function resolverStatusFinalEnvio(
    totalPartes: number,
    partesEnviadas: number,
    possuiErro: boolean,
): StatusFinalEnvio {
    if (
        !Number.isSafeInteger(totalPartes) ||
        totalPartes < 1
    ) {
        throw new ErroHttp(
            500,
            "O total de partes do envio é inválido.",
        );
    }

    if (
        !Number.isSafeInteger(partesEnviadas) ||
        partesEnviadas < 0 ||
        partesEnviadas > totalPartes
    ) {
        throw new ErroHttp(
            500,
            "A quantidade de partes enviadas é inválida.",
        );
    }

    if (possuiErro) {
        return partesEnviadas > 0
            ? "PARCIAL"
            : "ERRO";
    }

    if (partesEnviadas !== totalPartes) {
        throw new ErroHttp(
            500,
            "O envio terminou sem erro, mas nem todas as partes foram enviadas.",
        );
    }

    return "ENVIADO";
}

export async function obterEnvioExistente(
    adminClient: SupabaseClientAny,
    chaveIdempotencia: string,
): Promise<JsonRecord | null> {
    const {
        data,
        error,
    } =
        await adminClient
            .from(
                "certidao_mensal_envios",
            )
            .select(
                [
                    "id",
                    "competencia_id",
                    "empresa_id",
                    "chave_idempotencia",
                    "status",
                    "total_documentos",
                    "total_partes",
                    "partes_enviadas",
                    "mensagem_erro",
                    "iniciado_em",
                    "concluido_em",
                ].join(", "),
            )
            .eq(
                "chave_idempotencia",
                chaveIdempotencia,
            )
            .maybeSingle();

    if (error) {
        throw new ErroHttp(
            500,
            mensagemErro(error),
        );
    }

    return data
        ? objetoSeguro(data)
        : null;
}

export function validarEnvioExistente(
    envio: JsonRecord,
    competenciaId: string,
) {
    const competenciaExistente =
        textoSeguro(
            envio.competencia_id,
            50,
        );

    if (
        competenciaExistente &&
        competenciaExistente !== competenciaId
    ) {
        throw new ErroHttp(
            409,
            "A chave de idempotência já foi usada em outra competência.",
        );
    }

    return envio;
}

export async function criarOuReutilizarEnvio(
    adminClient: SupabaseClientAny,
    contexto: ContextoEnvio,
    usuario: UsuarioAutenticado,
    chaveIdempotencia: string,
    assuntoBase: string,
    corpoBase: string,
    partes: PartePlanejada[],
) {
    const tamanhoTotalBytes =
        0;

    const payload = {
        competencia_id:
            contexto.competenciaId,

        empresa_id:
            contexto.empresaId,

        configuracao_id:
            contexto.configuracao.id,

        chave_idempotencia:
            chaveIdempotencia,

        status:
            "PREPARANDO",

        destinatarios:
            contexto.destinatarios,

        copias:
            contexto.copias,

        responder_para:
            contexto.configuracao
                .responderPara ||
            null,

        remetente_nome:
            contexto.configuracao
                .nomeRemetente,

        assunto_base:
            assuntoBase,

        corpo_base:
            corpoBase,

        configuracao_escopo:
            contexto.configuracao
                .escopo,

        configuracao_versao:
            contexto.configuracao
                .versao,

        total_documentos:
            contexto.documentos.length,

        total_partes:
            partes.length,

        partes_enviadas:
            0,

        tamanho_total_bytes:
            tamanhoTotalBytes,

        mensagem_erro:
            null,

        solicitado_por:
            usuario.id,

        solicitado_por_email:
            usuario.email,

        iniciado_em:
            agoraIso(),

        concluido_em:
            null,
    };

    const {
        data,
        error,
    } =
        await adminClient
            .from(
                "certidao_mensal_envios",
            )
            .insert(payload)
            .select(
                [
                    "id",
                    "competencia_id",
                    "empresa_id",
                    "chave_idempotencia",
                    "status",
                    "total_documentos",
                    "total_partes",
                    "partes_enviadas",
                ].join(", "),
            )
            .single();

    if (
        !error &&
        data
    ) {
        return {
            reutilizado:
                false,

            envio:
                objetoSeguro(data),
        };
    }

    const erroRegistro =
        objetoSeguro(error);

    if (
        textoSeguro(
            erroRegistro.code,
            20,
        ) === "23505"
    ) {
        const existente =
            await obterEnvioExistente(
                adminClient,
                chaveIdempotencia,
            );

        if (existente) {
            validarEnvioExistente(
                existente,
                contexto.competenciaId,
            );

            return {
                reutilizado:
                    true,

                envio:
                    existente,
            };
        }
    }

    throw new ErroHttp(
        500,
        mensagemErro(error),
    );
}

export async function criarEstruturaEnvio(
    adminClient: SupabaseClientAny,
    envioId: string,
    contexto: ContextoEnvio,
    partes: PartePlanejada[],
): Promise<PartePersistida[]> {
    const linhasPartes =
        partes.map(
            (parte) => ({
                envio_id:
                    envioId,

                numero_parte:
                    parte.numero,

                total_partes:
                    parte.total,

                status:
                    "PREPARANDO",

                assunto:
                    parte.assunto,

                quantidade_documentos:
                    parte.documentos.length,

                tamanho_anexos_bytes:
                    parte.tamanhoAnexosBytes,

                provedor_mensagem_id:
                    null,

                mensagem_erro:
                    null,

                iniciado_em:
                    null,

                enviado_em:
                    null,
            }),
        );

    const {
        data: partesData,
        error: partesError,
    } =
        await adminClient
            .from(
                "certidao_mensal_envio_partes",
            )
            .insert(
                linhasPartes,
            )
            .select(
                "id, numero_parte",
            );

    if (partesError) {
        throw new ErroHttp(
            500,
            mensagemErro(
                partesError,
            ),
        );
    }

    const parteIdPorNumero =
        new Map<number, string>();

    for (
        const valor of
        Array.isArray(partesData)
            ? partesData
            : []
    ) {
        const registro =
            objetoSeguro(valor);

        const numero =
            Number(
                registro.numero_parte,
            );

        const id =
            textoSeguro(
                registro.id,
                50,
            );

        if (
            Number.isSafeInteger(numero) &&
            numero >= 1 &&
            id
        ) {
            parteIdPorNumero.set(
                numero,
                id,
            );
        }
    }

    const idsPartesCriadas =
        Array.from(
            parteIdPorNumero.values(),
        );

    const compensarPartesCriadas =
        async (
            erroOriginal: string,
        ) => {
            const mensagemOriginal =
                textoSeguro(
                    erroOriginal,
                    2000,
                ) ||
                "Falha ao criar a estrutura do envio.";

            if (idsPartesCriadas.length === 0) {
                return mensagemOriginal;
            }

            const {
                error: compensacaoError,
            } =
                await adminClient
                    .from(
                        "certidao_mensal_envio_partes",
                    )
                    .update({
                        status:
                            "ERRO",

                        mensagem_erro:
                            mensagemOriginal,
                    })
                    .in(
                        "id",
                        idsPartesCriadas,
                    );

            if (!compensacaoError) {
                return mensagemOriginal;
            }

            return (
                mensagemOriginal +
                " Falha adicional ao compensar as partes criadas: " +
                mensagemErro(
                    compensacaoError,
                )
            ).slice(
                0,
                2000,
            );
        };

    if (
        parteIdPorNumero.size !==
        partes.length
    ) {
        const erroEstrutura =
            await compensarPartesCriadas(
                "A criação das partes retornou uma quantidade inconsistente.",
            );

        throw new ErroHttp(
            500,
            erroEstrutura,
        );
    }

    const partesPersistidas =
        partes.map(
            (parte) => {
                const id =
                    parteIdPorNumero.get(
                        parte.numero,
                    );

                if (!id) {
                    throw new ErroHttp(
                        500,
                        `A parte ${parte.numero} não recebeu identificador.`,
                    );
                }

                return {
                    ...parte,
                    id,
                };
            },
        );

    const linhasItens =
        partesPersistidas.flatMap(
            (parte) =>
                parte.documentos.map(
                    (documento) => ({
                        envio_id:
                            envioId,

                        competencia_id:
                            contexto.competenciaId,

                        parte_id:
                            parte.id,

                        item_id:
                            documento.itemId,

                        versao_id:
                            documento.possuiVersao
                                ? documento.versaoId
                                : null,

                        ordem_documento:
                            documento.ordem,

                        documento_tipo:
                            documento.tipoDocumento,

                        documento_titulo:
                            documento.titulo,

                        status_item:
                            documento.statusItem,

                        numero_versao:
                            documento.possuiVersao
                                ? documento.numeroVersao
                                : null,

                        bucket:
                            documento.possuiVersao
                                ? documento.bucket
                                : null,

                        caminho_storage:
                            documento.possuiVersao
                                ? documento.caminhoStorage
                                : null,

                        nome_arquivo:
                            documento.possuiVersao
                                ? documento.nomeArquivo
                                : null,

                        tipo_mime:
                            documento.possuiVersao
                                ? documento.tipoMime
                                : null,

                        tamanho_bytes:
                            documento.possuiVersao
                                ? documento.tamanhoBytes
                                : null,

                        hash_sha256:
                            documento.possuiVersao
                                ? documento.hashSha256
                                : null,

                        total_paginas:
                            documento.possuiVersao
                                ? documento.totalPaginas
                                : null,
                    }),
                ),
        );

    const {
        error: itensError,
    } =
        await adminClient
            .from(
                "certidao_mensal_envio_itens",
            )
            .insert(
                linhasItens,
            );

    if (itensError) {
        const erroEstrutura =
            await compensarPartesCriadas(
                (
                    "Falha ao registrar os itens imutáveis do envio: " +
                    mensagemErro(
                        itensError,
                    )
                ),
            );

        throw new ErroHttp(
            500,
            erroEstrutura,
        );
    }

    return partesPersistidas;
}

async function atualizarParte(
    adminClient: SupabaseClientAny,
    parteId: string,
    valores: Record<string, unknown>,
) {
    const {
        error,
    } =
        await adminClient
            .from(
                "certidao_mensal_envio_partes",
            )
            .update({
                ...valores,
            })
            .eq(
                "id",
                parteId,
            );

    if (error) {
        throw new ErroHttp(
            500,
            mensagemErro(error),
        );
    }
}

export async function marcarEnvioEnviando(
    adminClient: SupabaseClientAny,
    envioId: string,
) {
    const {
        error,
    } =
        await adminClient
            .from(
                "certidao_mensal_envios",
            )
            .update({
                status:
                    "ENVIANDO",

                mensagem_erro:
                    null,

                concluido_em:
                    null,
            })
            .eq(
                "id",
                envioId,
            );

    if (error) {
        throw new ErroHttp(
            500,
            mensagemErro(error),
        );
    }
}

export async function marcarParteEnviando(
    adminClient: SupabaseClientAny,
    parteId: string,
) {
    await atualizarParte(
        adminClient,
        parteId,
        {
            status:
                "ENVIANDO",

            iniciado_em:
                agoraIso(),

            enviado_em:
                null,

            provedor_mensagem_id:
                null,

            mensagem_erro:
                null,
        },
    );
}

export async function marcarParteEnviada(
    adminClient: SupabaseClientAny,
    parteId: string,
    mensagemId: string,
) {
    await atualizarParte(
        adminClient,
        parteId,
        {
            status:
                "ENVIADO",

            provedor_mensagem_id:
                textoSeguro(
                    mensagemId,
                    1000,
                ) ||
                null,

            enviado_em:
                agoraIso(),

            mensagem_erro:
                null,
        },
    );
}

export async function marcarParteErro(
    adminClient: SupabaseClientAny,
    parteId: string,
    erro: string,
) {
    await atualizarParte(
        adminClient,
        parteId,
        {
            status:
                "ERRO",

            mensagem_erro:
                textoSeguro(
                    erro,
                    2000,
                ),
        },
    );
}

export async function marcarPartesRestantesErro(
    adminClient: SupabaseClientAny,
    partes: PartePersistida[],
    indiceInicial: number,
    erro: string,
) {
    const ids =
        partes
            .slice(
                indiceInicial,
            )
            .map(
                (parte) =>
                    parte.id,
            );

    if (ids.length === 0) {
        return;
    }

    const {
        error,
    } =
        await adminClient
            .from(
                "certidao_mensal_envio_partes",
            )
            .update({
                status:
                    "ERRO",

                mensagem_erro:
                    textoSeguro(
                        erro,
                        2000,
                    ),
            })
            .in(
                "id",
                ids,
            );

    if (error) {
        throw new ErroHttp(
            500,
            mensagemErro(error),
        );
    }
}

export async function concluirEnvio(
    adminClient: SupabaseClientAny,
    envioId: string,
    status: StatusFinalEnvio,
    partesEnviadas: number,
    erro: string | null,
) {
    const {
        error,
    } =
        await adminClient
            .from(
                "certidao_mensal_envios",
            )
            .update({
                status,

                partes_enviadas:
                    partesEnviadas,

                mensagem_erro:
                    erro
                        ? textoSeguro(
                            erro,
                            2000,
                        )
                        : null,

                concluido_em:
                    agoraIso(),
            })
            .eq(
                "id",
                envioId,
            );

    if (error) {
        throw new ErroHttp(
            500,
            mensagemErro(error),
        );
    }
}

export async function falharEnvio(
    adminClient: SupabaseClientAny,
    envioId: string,
    partesEnviadas: number,
    erro: string,
) {
    try {
        await concluirEnvio(
            adminClient,
            envioId,
            partesEnviadas > 0
                ? "PARCIAL"
                : "ERRO",
            partesEnviadas,
            erro,
        );
    } catch {
        // O erro original da operação deve permanecer prioritário.
    }
}