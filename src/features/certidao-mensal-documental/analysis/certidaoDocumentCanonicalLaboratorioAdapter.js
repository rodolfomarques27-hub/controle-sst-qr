import {
    analisarDocumentoCert2,
} from "./certidaoDocumentCanonicalEngine.js";

import {
    normalizarCodigoTipoDocumentoCertidaoMensal,
    obterDataReferenciaCertidaoMensal,
} from "../domain/certidaoMensalPersistenceContract.js";

export const CERTIDAO_LABORATORIO_ORIGEM_MOTOR_CANONICO =
    "CANONICO_CERT2";

export const CERTIDAO_LABORATORIO_VERSAO_MOTOR_CANONICO =
    "CERT2_DOCUMENTO_CANONICO_V1";

const PADRAO_SHA256 =
    /^[a-f0-9]{64}$/i;

function textoSeguro(
    valor = ""
) {
    return String(
        valor ?? ""
    ).trim();
}

function numeroSeguro(
    valor,
    padrao = 0
) {
    const numero =
        Number(
            valor
        );

    return Number.isFinite(
        numero
    )
        ? numero
        : padrao;
}

function listaUnica(
    valores
) {
    return [
        ...new Set(
            (
                Array.isArray(
                    valores
                )
                    ? valores
                    : []
            )
                .map(
                    textoSeguro
                )
                .filter(
                    Boolean
                )
        ),
    ];
}

function normalizarTipoDocumentoSeguro(
    valor
) {
    const texto =
        textoSeguro(
            valor
        );

    if (!texto) {
        return "";
    }

    try {
        return normalizarCodigoTipoDocumentoCertidaoMensal(
            texto
        );
    }
    catch {
        return "";
    }
}

function resolverContextoCanonico(
    contexto = {}
) {
    const base =
        contexto &&
        typeof contexto ===
            "object"
            ? contexto
            : {};

    if (
        base
            ?.dataReferencia
    ) {
        return base;
    }

    const origemReferencia =
        base
            ?.competencia ||
        base
            ?.documento
            ?.competenciaEsperada ||
        new Date();

    const dataIso =
        obterDataReferenciaCertidaoMensal(
            origemReferencia
        );

    const dataReferencia =
        new Date(
            String(
                dataIso
            ) +
            "T12:00:00.000Z"
        );

    return {
        ...base,

        dataReferencia:
            Number.isNaN(
                dataReferencia
                    .getTime()
            )
                ? new Date()
                : dataReferencia,
    };
}

/*
 * ============================================================
 * SAFE_SCAN_CERT2_M3_A5_GUARD_TIPO_SELECIONADO
 *
 * Não reclassifica o documento.
 *
 * Apenas compara:
 * - família já classificada pelo motor canônico;
 * - slot/tipo documental escolhido na interface.
 *
 * Divergência permanece fail-closed.
 * ============================================================
 */
function criarAvaliacaoCompatibilidade({
    canonico,
    contexto,
} = {}) {
    const resolucao =
        canonico
            ?.compatibilidade
            ?.resolucaoLote ||
        null;

    const avaliacaoRaw =
        resolucao
            ?.avaliacao;

    if (
        !avaliacaoRaw ||
        typeof avaliacaoRaw !==
            "object"
    ) {
        return null;
    }

    const avaliacao = {
        ...avaliacaoRaw,
    };

    const tipoEsperado =
        normalizarTipoDocumentoSeguro(
            contexto
                ?.documento
                ?.id ||
            contexto
                ?.documento
                ?.tipoDocumento ||
            contexto
                ?.documento
                ?.tipo_documento
        );

    const tipoIdentificado =
        normalizarTipoDocumentoSeguro(
            canonico
                ?.classificacao
                ?.tipoCatalogo ||
            canonico
                ?.classificacao
                ?.id
        );

    if (
        tipoEsperado &&
        tipoIdentificado &&
        tipoEsperado !==
            tipoIdentificado
    ) {
        return {
            ...avaliacao,

            codigo:
                "TIPO_DOCUMENTAL_DIVERGENTE",

            documentoIncompativel:
                true,

            bloqueiaSubstituicao:
                true,

            requerConferenciaHumana:
                true,

            documentoEsperado:
                textoSeguro(
                    contexto
                        ?.documento
                        ?.titulo ||
                    tipoEsperado
                ),

            documentoIdentificado:
                textoSeguro(
                    canonico
                        ?.classificacao
                        ?.titulo ||
                    tipoIdentificado
                ),

            mensagem:
                "O PDF foi classificado pelo Motor Documental Canônico como um tipo diferente do documento selecionado.",
        };
    }

    return avaliacao;
}

function criarClassificacaoLegada(
    canonico
) {
    const classificacao =
        canonico
            ?.classificacao ||
        {};

    const id =
        normalizarTipoDocumentoSeguro(
            classificacao
                ?.tipoCatalogo ||
            classificacao
                ?.id
        ) ||
        textoSeguro(
            classificacao
                ?.id
        );

    return {
        id,

        tipoDocumento:
            textoSeguro(
                classificacao
                    ?.tipoCatalogo ||
                id
            ),

        tipoCatalogo:
            textoSeguro(
                classificacao
                    ?.tipoCatalogo ||
                id
            ),

        tipoClassificador:
            textoSeguro(
                classificacao
                    ?.tipoClassificador ||
                id
            ),

        titulo:
            textoSeguro(
                classificacao
                    ?.titulo ||
                "Documento não identificado"
            ),

        confianca:
            numeroSeguro(
                classificacao
                    ?.confianca
            ),

        variante:
            textoSeguro(
                classificacao
                    ?.variante
            ),

        complementar:
            classificacao
                ?.complementar ===
                true,

        identificado:
            Boolean(
                id &&
                id !==
                    "nao-identificado"
            ),
    };
}

function criarLeituraLegada(
    canonico
) {
    const leitura =
        canonico
            ?.leitura ||
        {};

    const textoExtraido =
        textoSeguro(
            leitura
                ?.texto
        );

    return {
        metodo:
            textoSeguro(
                leitura
                    ?.metodo
            ),

        textoExtraido,

        textoPrevia:
            textoExtraido,

        quantidadeCaracteres:
            numeroSeguro(
                leitura
                    ?.caracteres,
                textoExtraido.length
            ),

        totalPaginas:
            numeroSeguro(
                leitura
                    ?.paginas
            ),

        paginasLidas:
            numeroSeguro(
                leitura
                    ?.paginasLidas
            ),

        paginasProcessadas:
            Array.isArray(
                leitura
                    ?.paginasProcessadas
            )
                ? [
                    ...leitura
                        .paginasProcessadas,
                ]
                : [],

        confianca:
            numeroSeguro(
                leitura
                    ?.confianca
            ),

        avisos:
            listaUnica(
                leitura
                    ?.avisos
            ),

        erro:
            textoSeguro(
                canonico
                    ?.erro
            ),
    };
}

export function adaptarResultadoCanonicoParaLaboratorio({
    canonico,
    arquivo = null,
    contexto = {},
} = {}) {
    if (
        !canonico ||
        typeof canonico !==
            "object"
    ) {
        throw new Error(
            "Resultado canônico ausente para adaptação do laboratório."
        );
    }

    const classificacao =
        criarClassificacaoLegada(
            canonico
        );

    const avaliacao =
        criarAvaliacaoCompatibilidade({
            canonico,
            contexto,
        });

    const leitura =
        criarLeituraLegada(
            canonico
        );

    const hashSha256 =
        textoSeguro(
            canonico
                ?.rastreabilidade
                ?.hashSha256
        ).toLowerCase();

    const erro =
        textoSeguro(
            canonico
                ?.erro
        );

    const validacao =
        canonico
            ?.validacaoArquivo &&
        typeof canonico
            .validacaoArquivo ===
            "object"
            ? canonico
                .validacaoArquivo
            : {};

    const competenciaArmazenamentoIso =
        textoSeguro(
            canonico
                ?.competencia
                ?.armazenamentoIso
        );

    const avisos =
        listaUnica([
            ...(
                Array.isArray(
                    validacao
                        ?.avisos
                )
                    ? validacao
                        .avisos
                    : []
            ),

            ...(
                Array.isArray(
                    leitura
                        ?.avisos
                )
                    ? leitura
                        .avisos
                    : []
            ),
        ]);

    const sucesso =
        Boolean(
            !erro &&
            PADRAO_SHA256.test(
                hashSha256
            ) &&
            classificacao
                .identificado &&
            avaliacao
        );

    return {
        sucesso,

        status:
            sucesso
                ? "concluido"
                : "falha",

        arquivo: {
            ...validacao,

            nomeOriginal:
                textoSeguro(
                    arquivo
                        ?.name ||
                    validacao
                        ?.nomeOriginal
                ),

            tamanhoBytes:
                numeroSeguro(
                    arquivo
                        ?.size ||
                    validacao
                        ?.tamanhoBytes
                ),

            mimeType:
                textoSeguro(
                    arquivo
                        ?.type ||
                    validacao
                        ?.mimeType ||
                    "application/pdf"
                ),

            hashSha256,

            algoritmoHash:
                "SHA-256",

            totalPaginas:
                numeroSeguro(
                    leitura
                        ?.totalPaginas
                ),
        },

        leitura,

        avaliacaoTecnica: {
            quantidadeCaracteres:
                numeroSeguro(
                    leitura
                        ?.quantidadeCaracteres
                ),

            metodoLeitura:
                textoSeguro(
                    leitura
                        ?.metodo
                ),

            confianca:
                numeroSeguro(
                    leitura
                        ?.confianca
                ),

            prontoParaClassificacao:
                Boolean(
                    classificacao
                        .identificado &&
                    avaliacao
                ),

            requerConferenciaHumana:
                Boolean(
                    avaliacao
                        ?.requerConferenciaHumana ||
                    canonico
                        ?.avaliacao
                        ?.requerConferenciaHumana
                ),

            observacao:
                textoSeguro(
                    avaliacao
                        ?.mensagem
                ),
        },

        preAvaliacaoDocumental:
            avaliacao
                ? {
                    classificacao,
                    avaliacao,
                }
                : null,

        processamento: {
            origem:
                "motor_canonico_cert2",

            custoExterno:
                false,

            persistido:
                false,

            enviadoAoServidor:
                false,
        },

        avisos,

        erro,

        motorDocumental: {
            origem:
                CERTIDAO_LABORATORIO_ORIGEM_MOTOR_CANONICO,

            versao:
                textoSeguro(
                    canonico
                        ?.versaoContrato
                ) ||
                CERTIDAO_LABORATORIO_VERSAO_MOTOR_CANONICO,

            competenciaArmazenamentoIso,

            hashSha256,
        },
    };
}

function criarResultadoFalha({
    arquivo,
    erro,
} = {}) {
    return {
        sucesso:
            false,

        status:
            "falha",

        arquivo: {
            nomeOriginal:
                textoSeguro(
                    arquivo
                        ?.name
                ),

            tamanhoBytes:
                numeroSeguro(
                    arquivo
                        ?.size
                ),

            mimeType:
                textoSeguro(
                    arquivo
                        ?.type ||
                    "application/pdf"
                ),

            hashSha256:
                "",
        },

        leitura:
            null,

        avaliacaoTecnica: {
            prontoParaClassificacao:
                false,
        },

        preAvaliacaoDocumental:
            null,

        processamento: {
            origem:
                "motor_canonico_cert2",

            custoExterno:
                false,

            persistido:
                false,

            enviadoAoServidor:
                false,
        },

        avisos:
            [],

        erro:
            textoSeguro(
                erro
                    ?.message ||
                erro
            ) ||
            "Falha na análise canônica do PDF.",

        motorDocumental: {
            origem:
                CERTIDAO_LABORATORIO_ORIGEM_MOTOR_CANONICO,

            versao:
                CERTIDAO_LABORATORIO_VERSAO_MOTOR_CANONICO,

            competenciaArmazenamentoIso:
                "",

            hashSha256:
                "",
        },
    };
}

/*
 * ============================================================
 * SAFE_SCAN_CERT2_M3_A5_ANALISE_INDIVIDUAL_CANONICA
 *
 * Mantém a assinatura operacional usada pelo hook legado,
 * porém executa uma única análise pelo motor canônico.
 *
 * "analisarDocumento" é injetável exclusivamente para teste.
 * ============================================================
 */
export async function diagnosticarCertidaoPdfCanonicoParaLaboratorio(
    arquivo,
    {
        contexto = {},
        onProgress = null,
        signal = null,
        dependencias = {},
        analisarDocumento =
            analisarDocumentoCert2,
    } = {}
) {
    if (!arquivo) {
        return criarResultadoFalha({
            arquivo,
            erro:
                new Error(
                    "Nenhum arquivo PDF foi informado."
                ),
        });
    }

    const emitir =
        (
            typeof onProgress ===
            "function"
        )
            ? onProgress
            : null;

    try {
        emitir?.({
            status:
                "validando_arquivo",

            percentual:
                5,

            mensagem:
                "Iniciando análise pelo Motor Documental Canônico CERT2.",
        });

        const contextoCanonico =
            resolverContextoCanonico(
                contexto
            );

        const canonico =
            await analisarDocumento({
                arquivo,
                contexto:
                    contextoCanonico,

                onProgress:
                    emitir
                        ? (
                            progresso
                        ) => {
                            const percentual =
                                numeroSeguro(
                                    progresso
                                        ?.percentual ??
                                    progresso
                                        ?.progresso,
                                    50
                                );

                            emitir({
                                ...progresso,

                                status:
                                    textoSeguro(
                                        progresso
                                            ?.status ||
                                        progresso
                                            ?.etapa ||
                                        "processando"
                                    ),

                                percentual,

                                mensagem:
                                    textoSeguro(
                                        progresso
                                            ?.mensagem
                                    ) ||
                                    "Processando PDF pelo Motor Documental Canônico CERT2.",
                            });
                        }
                        : null,

                signal,
                dependencias,
            });

        const adaptado =
            adaptarResultadoCanonicoParaLaboratorio({
                canonico,
                arquivo,
                contexto:
                    contextoCanonico,
            });

        emitir?.({
            status:
                adaptado
                    .sucesso
                    ? "concluido"
                    : "falha",

            percentual:
                100,

            mensagem:
                adaptado
                    .sucesso
                    ? "Leitura e avaliação canônica concluídas."
                    : (
                        adaptado
                            .erro ||
                        "A análise canônica não produziu um resultado persistível."
                    ),
        });

        return adaptado;
    }
    catch (error) {
        if (
            signal
                ?.aborted ||
            error
                ?.name ===
                "AbortError"
        ) {
            throw error;
        }

        const falha =
            criarResultadoFalha({
                arquivo,
                erro:
                    error,
            });

        emitir?.({
            status:
                "falha",

            percentual:
                100,

            mensagem:
                falha
                    .erro,
        });

        return falha;
    }
}

export default diagnosticarCertidaoPdfCanonicoParaLaboratorio;
