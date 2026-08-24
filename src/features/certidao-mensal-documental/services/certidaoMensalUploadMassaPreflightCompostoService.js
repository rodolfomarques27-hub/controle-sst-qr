import {
    validarPreflightPersistenciaPrincipalUploadMassa,
} from "./certidaoMensalUploadMassaPreflightService.js";

/*
 * ============================================================
 * CERT2 — PREFLIGHT COMPOSTO DE PERSISTÊNCIA PRINCIPAL
 *
 * Responsabilidade:
 *
 * combinar as duas provas imediatamente anteriores ao write:
 *
 * 1. estado remoto exato do slot documental;
 * 2. ausência global do SHA do novo PDF.
 *
 * Este módulo NÃO executa persistência.
 * ============================================================
 */

const PADRAO_HASH_SHA256 =
    /^[a-f0-9]{64}$/;

function textoSeguro(
    valor
) {
    return String(
        valor ?? ""
    ).trim();
}

function normalizarHashSha256(
    valor
) {
    const hash =
        textoSeguro(
            valor
        ).toLowerCase();

    return PADRAO_HASH_SHA256.test(
        hash
    )
        ? hash
        : "";
}

function criarErroCancelamento() {
    const erro =
        new Error(
            "O preflight composto foi cancelado."
        );

    erro.name =
        "AbortError";

    erro.codigo =
        "PREFLIGHT_COMPOSTO_CANCELADO";

    return erro;
}

function erroEhCancelamento(
    error,
    signal
) {
    return Boolean(
        signal?.aborted ||
        error?.name ===
            "AbortError" ||
        error?.codigo ===
            "PREFLIGHT_COMPOSTO_CANCELADO" ||
        error?.codigo ===
            "PREFLIGHT_HASH_CANCELADO"
    );
}

function congelarCausa(
    error
) {
    if (!error) {
        return null;
    }

    return Object.freeze({
        nome:
            textoSeguro(
                error?.name
            ),

        codigo:
            textoSeguro(
                error?.codigo
            ),

        etapa:
            textoSeguro(
                error?.etapa
            ),

        mensagem:
            textoSeguro(
                error?.message
            ),
    });
}

function criarResultado({
    podeExecutar = false,
    codigo = "",
    etapa = "",
    hashSha256 = "",
    resultadoSlot = null,
    estadoSha = null,
    causa = null,
} = {}) {
    return Object.freeze({
        versao:
            1,

        podeExecutar:
            Boolean(
                podeExecutar
            ),

        codigo:
            textoSeguro(
                codigo
            ),

        etapa:
            textoSeguro(
                etapa
            ),

        hashSha256:
            normalizarHashSha256(
                hashSha256
            ),

        resultadoSlot,

        estadoSha,

        causa:
            causa
                ? congelarCausa(
                    causa
                )
                : null,
    });
}

function estadoShaCanonicoValido({
    estadoSha,
    hashEsperado,
}) {
    if (
        Number(
            estadoSha?.versao
        ) !==
            1 ||
        estadoSha
            ?.leituraConcluida !==
            true ||
        typeof estadoSha
            ?.jaExiste !==
            "boolean" ||
        !Array.isArray(
            estadoSha?.ocorrencias
        )
    ) {
        return false;
    }

    const hashRemoto =
        normalizarHashSha256(
            estadoSha?.hashSha256
        );

    return Boolean(
        hashRemoto &&
        hashRemoto ===
            hashEsperado
    );
}

export function criarCertidaoMensalUploadMassaPreflightComposto({
    slotReader = null,
    hashReader = null,
} = {}) {
    const lerSlot =
        slotReader
            ?.lerEstadoRemotoPersistenciaPrincipalUploadMassa;

    const lerSha =
        hashReader
            ?.lerEstadoShaPersistenciaPrincipalUploadMassa;

    if (
        typeof lerSlot !==
        "function"
    ) {
        throw new Error(
            "Slot Reader inválido para o preflight composto."
        );
    }

    if (
        typeof lerSha !==
        "function"
    ) {
        throw new Error(
            "Hash Reader inválido para o preflight composto."
        );
    }

    async function validarAlvoPersistenciaPrincipalUploadMassa({
        preflight = null,
        hashSha256 = "",
        signal = null,
    } = {}) {
        /*
         * ========================================================
         * 0 — CANCELAMENTO E HASH NOVO
         * ========================================================
         */

        if (signal?.aborted) {
            throw criarErroCancelamento();
        }

        const hashNovo =
            normalizarHashSha256(
                hashSha256
            );

        if (!hashNovo) {
            return criarResultado({
                podeExecutar:
                    false,

                codigo:
                    "PREFLIGHT_COMPOSTO_HASH_INVALIDO",

                etapa:
                    "validacao_entrada",
            });
        }

        /*
         * ========================================================
         * 1 — VALIDAR CONTRATO DO PREFLIGHT SEM I/O
         *
         * O comparador puro já possui a autoridade sobre o
         * contrato produzido pelo Plan.
         *
         * Com estadoRemoto=null:
         *
         * contrato inválido
         * -> PREFLIGHT_CONTRATO_INVALIDO
         *
         * contrato válido
         * -> PREFLIGHT_ESTADO_REMOTO_INDETERMINADO
         *
         * Nenhuma consulta remota é necessária nessa etapa.
         * ========================================================
         */

        const validacaoContrato =
            validarPreflightPersistenciaPrincipalUploadMassa({
                preflight,

                estadoRemoto:
                    null,
            });

        if (
            validacaoContrato
                ?.codigo ===
            "PREFLIGHT_CONTRATO_INVALIDO"
        ) {
            return criarResultado({
                podeExecutar:
                    false,

                codigo:
                    "PREFLIGHT_CONTRATO_INVALIDO",

                etapa:
                    "validacao_contrato",

                hashSha256:
                    hashNovo,

                resultadoSlot:
                    validacaoContrato,
            });
        }

        if (
            validacaoContrato
                ?.codigo !==
            "PREFLIGHT_ESTADO_REMOTO_INDETERMINADO"
        ) {
            return criarResultado({
                podeExecutar:
                    false,

                codigo:
                    "PREFLIGHT_COMPOSTO_CONTRATO_INDETERMINADO",

                etapa:
                    "validacao_contrato",

                hashSha256:
                    hashNovo,

                resultadoSlot:
                    validacaoContrato,
            });
        }

        /*
         * ========================================================
         * 2 — SLOT READER REMOTO
         * ========================================================
         */

        let estadoSlot;

        try {
            estadoSlot =
                await lerSlot.call(
                    slotReader,
                    {
                        chaveLogica:
                            preflight
                                ?.chaveLogica,
                    }
                );
        }
        catch (error) {
            if (
                erroEhCancelamento(
                    error,
                    signal
                )
            ) {
                throw criarErroCancelamento();
            }

            return criarResultado({
                podeExecutar:
                    false,

                codigo:
                    "PREFLIGHT_SLOT_READER_FALHOU",

                etapa:
                    "slot_reader",

                hashSha256:
                    hashNovo,

                causa:
                    error,
            });
        }

        if (signal?.aborted) {
            throw criarErroCancelamento();
        }

        /*
         * ========================================================
         * 3 — COMPARADOR PURO DA FINGERPRINT
         * ========================================================
         */

        const resultadoSlot =
            validarPreflightPersistenciaPrincipalUploadMassa({
                preflight,

                estadoRemoto:
                    estadoSlot,
            });

        if (
            resultadoSlot
                ?.podePersistir !==
            true
        ) {
            /*
             * SHORT-CIRCUIT:
             *
             * fingerprint falhou.
             * SHA NÃO é consultado.
             */
            return criarResultado({
                podeExecutar:
                    false,

                codigo:
                    textoSeguro(
                        resultadoSlot
                            ?.codigo
                    ) ||
                    "PREFLIGHT_SLOT_BLOQUEADO",

                etapa:
                    "slot_fingerprint",

                hashSha256:
                    hashNovo,

                resultadoSlot,
            });
        }

        /*
         * ========================================================
         * 4 — HASH READER GLOBAL PRÉ-WRITE
         * ========================================================
         */

        let estadoSha;

        try {
            estadoSha =
                await lerSha.call(
                    hashReader,
                    {
                        hashSha256:
                            hashNovo,

                        signal,
                    }
                );
        }
        catch (error) {
            if (
                erroEhCancelamento(
                    error,
                    signal
                )
            ) {
                throw criarErroCancelamento();
            }

            return criarResultado({
                podeExecutar:
                    false,

                codigo:
                    "PREFLIGHT_HASH_READER_FALHOU",

                etapa:
                    "hash_reader",

                hashSha256:
                    hashNovo,

                resultadoSlot,

                causa:
                    error,
            });
        }

        if (signal?.aborted) {
            throw criarErroCancelamento();
        }

        /*
         * O Hash Reader possui seu próprio contrato.
         * Mesmo assim, o composto não confia cegamente em
         * dependência externa/injetada.
         */
        if (
            !estadoShaCanonicoValido({
                estadoSha,

                hashEsperado:
                    hashNovo,
            })
        ) {
            return criarResultado({
                podeExecutar:
                    false,

                codigo:
                    "PREFLIGHT_HASH_ESTADO_INVALIDO",

                etapa:
                    "hash_validacao",

                hashSha256:
                    hashNovo,

                resultadoSlot,

                estadoSha,
            });
        }

        /*
         * ========================================================
         * 5 — DUPLICIDADE EXATA ENCONTRADA NO ÚLTIMO INSTANTE
         * ========================================================
         */

        if (
            estadoSha
                .jaExiste ===
            true
        ) {
            return criarResultado({
                podeExecutar:
                    false,

                /*
                 * Preserva a classe semântica já aprovada
                 * no upload em massa.
                 */
                codigo:
                    "DUPLICADO_EXATO_HISTORICO",

                etapa:
                    "hash_pre_write",

                hashSha256:
                    hashNovo,

                resultadoSlot,

                estadoSha,
            });
        }

        /*
         * ========================================================
         * 6 — AUTORIZAÇÃO COMPOSTA
         *
         * Ainda NÃO é write.
         *
         * Significa somente:
         *
         * - fingerprint do slot está íntegra;
         * - SHA novo não consta no histórico consultado.
         * ========================================================
         */

        return criarResultado({
            podeExecutar:
                true,

            codigo:
                "PREFLIGHT_COMPOSTO_OK",

            etapa:
                "concluido",

            hashSha256:
                hashNovo,

            resultadoSlot,

            estadoSha,
        });
    }

    return Object.freeze({
        validarAlvoPersistenciaPrincipalUploadMassa,
    });
}