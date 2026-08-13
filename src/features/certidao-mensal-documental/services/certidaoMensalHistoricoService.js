const TABELA_AUDITORIA =
    "certidao_mensal_auditoria";

const TABELA_VERSOES =
    "certidao_mensal_versoes";

const UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ROTULOS_EVENTOS =
    Object.freeze({
        DOCUMENTO_ENVIADO:
            "Documento enviado",

        DOCUMENTO_SUBSTITUIDO:
            "Nova versão enviada",

        DOCUMENTO_CONFIRMADO_CONFORME:
            "Documento confirmado",

        DOCUMENTO_MARCADO_NAO_CONFORME:
            "Documento não conforme",

        DOCUMENTO_REENVIO_SOLICITADO:
            "Reenvio solicitado",
    });

function normalizarTexto(valor) {
    return String(
        valor ?? ""
    ).trim();
}

function normalizarInteiro(
    valor,
    padrao = 0
) {
    const numero =
        Number(valor);

    return Number.isInteger(numero) &&
        numero >= 0
        ? numero
        : padrao;
}

function normalizarDados(valor) {
    if (
        !valor ||
        typeof valor !== "object" ||
        Array.isArray(valor)
    ) {
        return {};
    }

    return valor;
}

function validarItemId(itemId) {
    const valor =
        normalizarTexto(itemId);

    if (!UUID_PATTERN.test(valor)) {
        throw new TypeError(
            "Item documental inválido para consulta do histórico."
        );
    }

    return valor;
}

function criarErroConsulta(
    mensagem,
    erro
) {
    const detalhe =
        normalizarTexto(
            erro?.message
        );

    const erroNormalizado =
        new Error(
            detalhe
                ? `${mensagem}: ${detalhe}`
                : mensagem
        );

    if (erro?.code) {
        erroNormalizado.code =
            erro.code;
    }

    if (erro?.details) {
        erroNormalizado.details =
            erro.details;
    }

    if (erro?.hint) {
        erroNormalizado.hint =
            erro.hint;
    }

    return erroNormalizado;
}

function obterNomeArquivoDoCaminho(
    caminho
) {
    const valor =
        normalizarTexto(caminho);

    if (!valor) {
        return "";
    }

    const partes =
        valor
            .replaceAll("\\", "/")
            .split("/")
            .filter(Boolean);

    return partes.at(-1) || "";
}

function obterDescricaoEvento({
    tipoEvento,
    numeroVersao,
    motivo,
}) {
    switch (tipoEvento) {
        case "DOCUMENTO_ENVIADO":
            return numeroVersao
                ? `Versão ${numeroVersao} enviada ao sistema.`
                : "Documento enviado ao sistema.";

        case "DOCUMENTO_SUBSTITUIDO":
            return numeroVersao
                ? `Versão ${numeroVersao} enviada em substituição à anterior.`
                : "Nova versão enviada em substituição à anterior.";

        case "DOCUMENTO_CONFIRMADO_CONFORME":
            return "Documento confirmado como conforme na conferência humana.";

        case "DOCUMENTO_MARCADO_NAO_CONFORME":
            return motivo
                ? `Documento marcado como não conforme: ${motivo}`
                : "Documento marcado como não conforme.";

        case "DOCUMENTO_REENVIO_SOLICITADO":
            return motivo
                ? `Atualização solicitada: ${motivo}`
                : "Foi solicitada uma versão atualizada do documento.";

        default:
            return "Evento registrado na trilha documental.";
    }
}

export function normalizarEventoHistoricoCertidaoMensal(
    evento,
    versao = null
) {
    const dados =
        normalizarDados(
            evento?.dados
        );

    const tipoEvento =
        normalizarTexto(
            evento?.tipo_evento
        ).toUpperCase();

    const numeroVersao =
        normalizarInteiro(
            versao?.numero_versao ??
            dados.numeroVersao
        );

    const motivo =
        normalizarTexto(
            dados.motivo
        );

    const observacao =
        normalizarTexto(
            dados.observacao
        );

    const caminhoStorage =
        normalizarTexto(
            versao?.caminho_storage ??
            dados.caminhoStorage
        );

    const nomeArquivo =
        normalizarTexto(
            versao?.nome_original
        ) ||
        obterNomeArquivoDoCaminho(
            caminhoStorage
        ) ||
        "Documento registrado";

    return {
        id:
            normalizarTexto(
                evento?.id
            ),

        competenciaId:
            normalizarTexto(
                evento?.competencia_id
            ),

        itemId:
            normalizarTexto(
                evento?.item_id
            ),

        versaoId:
            normalizarTexto(
                evento?.versao_id
            ),

        tipoEvento,

        rotulo:
            ROTULOS_EVENTOS[
                tipoEvento
            ] ||
            "Evento documental",

        descricao:
            obterDescricaoEvento({
                tipoEvento,
                numeroVersao,
                motivo,
            }),

        criadoEm:
            normalizarTexto(
                evento?.criado_em
            ),

        usuarioId:
            normalizarTexto(
                evento?.usuario_id
            ),

        numeroVersao,

        nomeArquivo,

        caminhoStorage,

        hashSha256:
            normalizarTexto(
                versao?.hash_sha256 ??
                dados.hashSha256
            ),

        tamanhoBytes:
            normalizarInteiro(
                versao?.tamanho_bytes
            ),

        totalPaginas:
            normalizarInteiro(
                versao?.total_paginas
            ),

        motivo,

        observacao,

        statusAnterior:
            normalizarTexto(
                dados.statusAnterior
            ),

        statusDestino:
            normalizarTexto(
                dados.statusDestino ??
                dados.decisao
            ),

        decididoEm:
            normalizarTexto(
                dados.decididoEm
            ),

        registradoEm:
            normalizarTexto(
                dados.registradoEm
            ),
    };
}

export function criarCertidaoMensalHistoricoService(
    cliente
) {
    if (
        !cliente ||
        typeof cliente.from !==
            "function"
    ) {
        throw new TypeError(
            "Cliente Supabase inválido para o histórico documental."
        );
    }

    return {
        async buscarHistoricoDocumento({
            itemId,
        }) {
            const itemIdValidado =
                validarItemId(
                    itemId
                );

            const respostaAuditoria =
                await cliente
                    .from(
                        TABELA_AUDITORIA
                    )
                    .select(
                        [
                            "id",
                            "competencia_id",
                            "item_id",
                            "versao_id",
                            "tipo_evento",
                            "dados",
                            "usuario_id",
                            "criado_em",
                        ].join(",")
                    )
                    .eq(
                        "item_id",
                        itemIdValidado
                    )
                    .order(
                        "criado_em",
                        {
                            ascending:
                                false,
                        }
                    );

            if (
                respostaAuditoria
                    ?.error
            ) {
                throw criarErroConsulta(
                    "Não foi possível consultar a trilha de auditoria",
                    respostaAuditoria.error
                );
            }

            const eventos =
                Array.isArray(
                    respostaAuditoria
                        ?.data
                )
                    ? respostaAuditoria.data
                    : [];

            const versoesIds = [
                ...new Set(
                    eventos
                        .map(
                            (evento) =>
                                normalizarTexto(
                                    evento
                                        ?.versao_id
                                )
                        )
                        .filter(Boolean)
                ),
            ];

            let versoes = [];

            if (versoesIds.length) {
                const respostaVersoes =
                    await cliente
                        .from(
                            TABELA_VERSOES
                        )
                        .select(
                            [
                                "id",
                                "numero_versao",
                                "caminho_storage",
                                "nome_original",
                                "hash_sha256",
                                "tamanho_bytes",
                                "total_paginas",
                                "criado_em",
                                "criado_por",
                            ].join(",")
                        )
                        .in(
                            "id",
                            versoesIds
                        );

                if (
                    respostaVersoes
                        ?.error
                ) {
                    throw criarErroConsulta(
                        "Não foi possível consultar as versões documentais",
                        respostaVersoes.error
                    );
                }

                versoes =
                    Array.isArray(
                        respostaVersoes
                            ?.data
                    )
                        ? respostaVersoes.data
                        : [];
            }

            const versoesPorId =
                new Map(
                    versoes.map(
                        (versao) => [
                            normalizarTexto(
                                versao?.id
                            ),
                            versao,
                        ]
                    )
                );

            return eventos.map(
                (evento) =>
                    normalizarEventoHistoricoCertidaoMensal(
                        evento,
                        versoesPorId.get(
                            normalizarTexto(
                                evento
                                    ?.versao_id
                            )
                        ) || null
                    )
            );
        },
    };
}

async function criarServicoPadrao() {
    const {
        supabase,
    } = await import(
        "../../../lib/supabaseClient.js"
    );

    return criarCertidaoMensalHistoricoService(
        supabase
    );
}

export async function buscarHistoricoDocumentoCertidaoMensal(
    parametros
) {
    const servico =
        await criarServicoPadrao();

    return servico
        .buscarHistoricoDocumento(
            parametros
        );
}
