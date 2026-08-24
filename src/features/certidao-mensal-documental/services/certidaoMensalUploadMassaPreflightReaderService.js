/*
 * ============================================================
 * CERT2 — READER REMOTO EXATO DO PREFLIGHT DE PERSISTÊNCIA
 *
 * Responsabilidade:
 *
 * produzir um snapshot remoto CANÔNICO para a chave exata:
 *
 * empresaId + competencia + tipoDocumento
 *
 * Este módulo NÃO decide se pode persistir.
 * A decisão pertence ao comparador puro de preflight.
 *
 * Este módulo NÃO:
 * - pesquisa competências vizinhas;
 * - aplica validade;
 * - aplica herança;
 * - usa resolvedor visual;
 * - usa filename/path;
 * - usa mês selecionado na interface.
 * ============================================================
 */

const PADRAO_UUID =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PADRAO_COMPETENCIA =
    /^\d{4}-(0[1-9]|1[0-2])-01$/;

const PADRAO_TIPO_DOCUMENTO =
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const PADRAO_HASH_SHA256 =
    /^[0-9a-f]{64}$/;

function textoSeguro(
    valor
) {
    return String(
        valor ?? ""
    ).trim();
}

function normalizarTipoDocumento(
    valor
) {
    return textoSeguro(
        valor
    ).toLowerCase();
}

function normalizarHash(
    valor
) {
    return textoSeguro(
        valor
    ).toLowerCase();
}

function normalizarNumeroVersao(
    valor
) {
    const numero =
        Number(
            valor
        );

    return (
        Number.isInteger(
            numero
        ) &&
        numero > 0
    )
        ? numero
        : 0;
}

function normalizarChaveLogica(
    valor
) {
    const empresaId =
        textoSeguro(
            valor?.empresaId
        );

    const competencia =
        textoSeguro(
            valor?.competencia
        );

    const tipoDocumento =
        normalizarTipoDocumento(
            valor?.tipoDocumento
        );

    if (
        !PADRAO_UUID.test(
            empresaId
        ) ||
        !PADRAO_COMPETENCIA.test(
            competencia
        ) ||
        !PADRAO_TIPO_DOCUMENTO.test(
            tipoDocumento
        )
    ) {
        return null;
    }

    return Object.freeze({
        empresaId,
        competencia,
        tipoDocumento,
    });
}

function criarErroReader(
    mensagem,
    {
        codigo =
            "PREFLIGHT_LEITURA_REMOTA_FALHOU",

        etapa =
            "",

        causa =
            null,
    } = {}
) {
    const erro =
        new Error(
            mensagem
        );

    erro.name =
        "CertidaoMensalUploadMassaPreflightReaderError";

    erro.codigo =
        textoSeguro(
            codigo
        );

    erro.etapa =
        textoSeguro(
            etapa
        );

    if (causa) {
        erro.cause =
            causa;
    }

    return erro;
}

function erroLeitura(
    mensagem,
    etapa,
    causa = null
) {
    return criarErroReader(
        mensagem,
        {
            codigo:
                "PREFLIGHT_LEITURA_REMOTA_FALHOU",

            etapa,

            causa,
        }
    );
}

function erroInconsistencia(
    mensagem,
    etapa
) {
    return criarErroReader(
        mensagem,
        {
            codigo:
                "PREFLIGHT_ESTADO_REMOTO_INCONSISTENTE",

            etapa,
        }
    );
}

function congelarEstadoAusente(
    chaveLogica
) {
    return Object.freeze({
        versao:
            1,

        leituraConcluida:
            true,

        chaveLogica,

        slotExiste:
            false,

        documentoAtual:
            null,
    });
}

function congelarEstadoExistente({
    chaveLogica,
    itemId,
    versaoId,
    numeroVersao,
    hashSha256,
}) {
    return Object.freeze({
        versao:
            1,

        leituraConcluida:
            true,

        chaveLogica,

        slotExiste:
            true,

        documentoAtual:
            Object.freeze({
                itemId,
                versaoId,
                numeroVersao,
                hashSha256,
            }),
    });
}

function obterLinhas(
    resposta,
    etapa
) {
    if (
        resposta?.error
    ) {
        throw erroLeitura(
            "O Supabase recusou a leitura do preflight.",
            etapa,
            resposta.error
        );
    }

    if (
        !Array.isArray(
            resposta?.data
        )
    ) {
        throw erroInconsistencia(
            "A leitura do preflight não retornou uma coleção válida.",
            etapa
        );
    }

    return resposta.data;
}

async function executarConsulta(
    factory,
    etapa
) {
    try {
        return await factory();
    }
    catch (error) {
        if (
            error
                ?.name ===
            "CertidaoMensalUploadMassaPreflightReaderError"
        ) {
            throw error;
        }

        throw erroLeitura(
            "Não foi possível executar a leitura remota do preflight.",
            etapa,
            error
        );
    }
}

export function criarCertidaoMensalUploadMassaPreflightReader({
    clienteSupabase = null,
} = {}) {
    if (
        !clienteSupabase ||
        typeof clienteSupabase.from !==
            "function"
    ) {
        throw new Error(
            "Cliente Supabase inválido para o reader de preflight."
        );
    }

    async function lerEstadoRemotoPersistenciaPrincipalUploadMassa({
        chaveLogica = null,
    } = {}) {
        const chave =
            normalizarChaveLogica(
                chaveLogica
            );

        if (!chave) {
            throw criarErroReader(
                "A chave lógica do preflight remoto é inválida.",
                {
                    codigo:
                        "PREFLIGHT_CHAVE_LOGICA_INVALIDA",

                    etapa:
                        "validacao_chave",
                }
            );
        }

        /*
         * ========================================================
         * 1 — COMPETÊNCIA EXATA
         * ========================================================
         */

        const respostaCompetencia =
            await executarConsulta(
                () =>
                    clienteSupabase
                        .from(
                            "certidao_mensal_competencias"
                        )
                        .select(
                            "id, empresa_id, competencia"
                        )
                        .eq(
                            "empresa_id",
                            chave.empresaId
                        )
                        .eq(
                            "competencia",
                            chave.competencia
                        )
                        .limit(
                            2
                        ),

                "select_competencia_exata"
            );

        const competencias =
            obterLinhas(
                respostaCompetencia,
                "select_competencia_exata"
            );

        if (
            competencias.length >
            1
        ) {
            throw erroInconsistencia(
                "A competência exata do preflight não é única.",
                "select_competencia_exata"
            );
        }

        /*
         * Competência ainda não materializada.
         *
         * Para novo principal isso representa slot ausente.
         * Para nova versão o comparador bloqueará como divergência.
         */
        if (
            competencias.length ===
            0
        ) {
            return congelarEstadoAusente(
                chave
            );
        }

        const competenciaRegistro =
            competencias[0];

        const competenciaId =
            textoSeguro(
                competenciaRegistro?.id
            );

        const empresaIdRemoto =
            textoSeguro(
                competenciaRegistro
                    ?.empresa_id
            );

        const competenciaRemota =
            textoSeguro(
                competenciaRegistro
                    ?.competencia
            );

        if (
            !PADRAO_UUID.test(
                competenciaId
            ) ||
            empresaIdRemoto !==
                chave.empresaId ||
            competenciaRemota !==
                chave.competencia
        ) {
            throw erroInconsistencia(
                "A competência retornada não corresponde à chave solicitada.",
                "validacao_competencia_exata"
            );
        }

        /*
         * ========================================================
         * 2 — ITEM EXATO
         * ========================================================
         */

        const respostaItem =
            await executarConsulta(
                () =>
                    clienteSupabase
                        .from(
                            "certidao_mensal_itens"
                        )
                        .select(
                            "id, competencia_id, tipo_documento, versao_atual_id"
                        )
                        .eq(
                            "competencia_id",
                            competenciaId
                        )
                        .eq(
                            "tipo_documento",
                            chave.tipoDocumento
                        )
                        .limit(
                            2
                        ),

                "select_item_exato"
            );

        const itens =
            obterLinhas(
                respostaItem,
                "select_item_exato"
            );

        if (
            itens.length >
            1
        ) {
            throw erroInconsistencia(
                "O item documental exato do preflight não é único.",
                "select_item_exato"
            );
        }

        if (
            itens.length ===
            0
        ) {
            return congelarEstadoAusente(
                chave
            );
        }

        const item =
            itens[0];

        const itemId =
            textoSeguro(
                item?.id
            );

        const competenciaIdItem =
            textoSeguro(
                item?.competencia_id
            );

        const tipoDocumentoItem =
            normalizarTipoDocumento(
                item?.tipo_documento
            );

        const versaoAtualId =
            textoSeguro(
                item?.versao_atual_id
            );

        if (
            !PADRAO_UUID.test(
                itemId
            ) ||
            competenciaIdItem !==
                competenciaId ||
            tipoDocumentoItem !==
                chave.tipoDocumento
        ) {
            throw erroInconsistencia(
                "O item retornado não corresponde à chave solicitada.",
                "validacao_item_exato"
            );
        }

        /*
         * Slot existe, mas sem ponte íntegra para a versão atual.
         * Isto é estado remoto inconsistente, nunca ausência.
         */
        if (
            !PADRAO_UUID.test(
                versaoAtualId
            )
        ) {
            throw erroInconsistencia(
                "O item documental existe, mas não possui versão atual válida.",
                "validacao_versao_atual_id"
            );
        }

        /*
         * ========================================================
         * 3 — VERSÃO ATUAL EXATA
         * ========================================================
         */

        const respostaVersao =
            await executarConsulta(
                () =>
                    clienteSupabase
                        .from(
                            "certidao_mensal_versoes"
                        )
                        .select(
                            "id, item_id, numero_versao, hash_sha256"
                        )
                        .eq(
                            "id",
                            versaoAtualId
                        )
                        .eq(
                            "item_id",
                            itemId
                        )
                        .limit(
                            2
                        ),

                "select_versao_atual_exata"
            );

        const versoes =
            obterLinhas(
                respostaVersao,
                "select_versao_atual_exata"
            );

        if (
            versoes.length !==
            1
        ) {
            throw erroInconsistencia(
                "A versão atual exata do item não pôde ser confirmada.",
                "select_versao_atual_exata"
            );
        }

        const versao =
            versoes[0];

        const versaoId =
            textoSeguro(
                versao?.id
            );

        const itemIdVersao =
            textoSeguro(
                versao?.item_id
            );

        const numeroVersao =
            normalizarNumeroVersao(
                versao?.numero_versao
            );

        const hashSha256 =
            normalizarHash(
                versao?.hash_sha256
            );

        if (
            !PADRAO_UUID.test(
                versaoId
            ) ||
            versaoId !==
                versaoAtualId ||
            itemIdVersao !==
                itemId ||
            numeroVersao <=
                0 ||
            !PADRAO_HASH_SHA256.test(
                hashSha256
            )
        ) {
            throw erroInconsistencia(
                "A versão atual retornada possui fingerprint inválida.",
                "validacao_versao_atual"
            );
        }

        return congelarEstadoExistente({
            chaveLogica:
                chave,

            itemId,

            versaoId,

            numeroVersao,

            hashSha256,
        });
    }

    return Object.freeze({
        lerEstadoRemotoPersistenciaPrincipalUploadMassa,
    });
}