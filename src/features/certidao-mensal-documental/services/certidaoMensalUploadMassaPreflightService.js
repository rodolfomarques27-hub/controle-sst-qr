/*
 * ============================================================
 * CERT2 — PREFLIGHT PURO DE PERSISTÊNCIA PRINCIPAL EM LOTE
 *
 * Este módulo NÃO executa I/O.
 *
 * Responsabilidade:
 * comparar a fingerprint imutável produzida pelo Plan com um
 * snapshot remoto CANÔNICO obtido imediatamente antes do write.
 *
 * O reader remoto será conectado em microetapa posterior.
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

const EXPECTATIVA_ITEM_AUSENTE =
    "ITEM_AUSENTE";

const EXPECTATIVA_VERSAO_ATUAL_IGUAL =
    "VERSAO_ATUAL_IGUAL";

function textoSeguro(
    valor
) {
    return String(
        valor ?? ""
    ).trim();
}

function normalizarHash(
    valor
) {
    return textoSeguro(
        valor
    ).toLowerCase();
}

function normalizarTipoDocumento(
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

function chavesLogicasIguais(
    esquerda,
    direita
) {
    return Boolean(
        esquerda &&
        direita &&
        esquerda.empresaId ===
            direita.empresaId &&
        esquerda.competencia ===
            direita.competencia &&
        esquerda.tipoDocumento ===
            direita.tipoDocumento
    );
}

function normalizarDocumentoAtual(
    valor
) {
    const itemId =
        textoSeguro(
            valor?.itemId
        );

    const versaoId =
        textoSeguro(
            valor?.versaoId
        );

    const numeroVersao =
        normalizarNumeroVersao(
            valor?.numeroVersao
        );

    const hashSha256 =
        normalizarHash(
            valor?.hashSha256
        );

    if (
        !PADRAO_UUID.test(
            itemId
        ) ||
        !PADRAO_UUID.test(
            versaoId
        ) ||
        numeroVersao <= 0 ||
        !PADRAO_HASH_SHA256.test(
            hashSha256
        )
    ) {
        return null;
    }

    return Object.freeze({
        itemId,
        versaoId,
        numeroVersao,
        hashSha256,
    });
}

function criarResultado({
    podePersistir = false,
    codigo,
    expectativa = "",
    chaveLogica = null,
    divergencias = [],
} = {}) {
    return Object.freeze({
        versao:
            1,

        podePersistir:
            Boolean(
                podePersistir
            ),

        codigo:
            textoSeguro(
                codigo
            ),

        expectativa:
            textoSeguro(
                expectativa
            ),

        chaveLogica,

        divergencias:
            Object.freeze([
                ...(
                    Array.isArray(
                        divergencias
                    )
                        ? divergencias
                        : []
                ),
            ]),
    });
}

function contratoPreflightValido(
    preflight
) {
    if (
        Number(
            preflight?.versao
        ) !==
        1
    ) {
        return false;
    }

    const expectativa =
        textoSeguro(
            preflight?.expectativa
        );

    if (
        expectativa !==
            EXPECTATIVA_ITEM_AUSENTE &&
        expectativa !==
            EXPECTATIVA_VERSAO_ATUAL_IGUAL
    ) {
        return false;
    }

    const chave =
        normalizarChaveLogica(
            preflight?.chaveLogica
        );

    if (!chave) {
        return false;
    }

    if (
        expectativa ===
        EXPECTATIVA_ITEM_AUSENTE
    ) {
        return (
            preflight?.documentoAtual ===
            null
        );
    }

    return Boolean(
        normalizarDocumentoAtual(
            preflight?.documentoAtual
        )
    );
}

/*
 * ============================================================
 * ESTADO REMOTO CANÔNICO ESPERADO DO FUTURO READER
 *
 * {
 *   leituraConcluida: true,
 *   chaveLogica: {
 *     empresaId,
 *     competencia,
 *     tipoDocumento
 *   },
 *   slotExiste: false,
 *   documentoAtual: null
 * }
 *
 * OU
 *
 * {
 *   leituraConcluida: true,
 *   chaveLogica: {...},
 *   slotExiste: true,
 *   documentoAtual: {
 *     itemId,
 *     versaoId,
 *     numeroVersao,
 *     hashSha256
 *   }
 * }
 * ============================================================
 */

export function validarPreflightPersistenciaPrincipalUploadMassa({
    preflight = null,
    estadoRemoto = null,
} = {}) {
    if (
        !contratoPreflightValido(
            preflight
        )
    ) {
        return criarResultado({
            podePersistir:
                false,

            codigo:
                "PREFLIGHT_CONTRATO_INVALIDO",
        });
    }

    const expectativa =
        textoSeguro(
            preflight.expectativa
        );

    const chaveEsperada =
        normalizarChaveLogica(
            preflight.chaveLogica
        );

    /*
     * Fail-closed:
     * ausência de snapshot remoto comprovado nunca autoriza write.
     */
    if (
        estadoRemoto
            ?.leituraConcluida !==
        true
    ) {
        return criarResultado({
            podePersistir:
                false,

            codigo:
                "PREFLIGHT_ESTADO_REMOTO_INDETERMINADO",

            expectativa,

            chaveLogica:
                chaveEsperada,
        });
    }

    const chaveRemota =
        normalizarChaveLogica(
            estadoRemoto?.chaveLogica
        );

    if (!chaveRemota) {
        return criarResultado({
            podePersistir:
                false,

            codigo:
                "PREFLIGHT_ESTADO_REMOTO_INCONSISTENTE",

            expectativa,

            chaveLogica:
                chaveEsperada,

            divergencias: [
                "CHAVE_REMOTA_INVALIDA",
            ],
        });
    }

    if (
        !chavesLogicasIguais(
            chaveEsperada,
            chaveRemota
        )
    ) {
        return criarResultado({
            podePersistir:
                false,

            codigo:
                "PREFLIGHT_CHAVE_REMOTA_DIVERGENTE",

            expectativa,

            chaveLogica:
                chaveEsperada,

            divergencias: [
                "CHAVE_LOGICA",
            ],
        });
    }

    /*
     * ========================================================
     * ITEM_AUSENTE
     *
     * Só autoriza ausência EXPLICITAMENTE comprovada.
     * ========================================================
     */
    if (
        expectativa ===
        EXPECTATIVA_ITEM_AUSENTE
    ) {
        if (
            estadoRemoto?.slotExiste ===
            false
        ) {
            return criarResultado({
                podePersistir:
                    true,

                codigo:
                    "PREFLIGHT_OK_ITEM_AUSENTE",

                expectativa,

                chaveLogica:
                    chaveEsperada,
            });
        }

        if (
            estadoRemoto?.slotExiste ===
            true
        ) {
            return criarResultado({
                podePersistir:
                    false,

                codigo:
                    "ESTADO_REMOTO_DIVERGIU",

                expectativa,

                chaveLogica:
                    chaveEsperada,

                divergencias: [
                    "ITEM_PASSOU_A_EXISTIR",
                ],
            });
        }

        return criarResultado({
            podePersistir:
                false,

            codigo:
                "PREFLIGHT_ESTADO_REMOTO_INCONSISTENTE",

            expectativa,

            chaveLogica:
                chaveEsperada,

            divergencias: [
                "SLOT_EXISTE_INDETERMINADO",
            ],
        });
    }

    /*
     * ========================================================
     * VERSAO_ATUAL_IGUAL
     * ========================================================
     */

    if (
        estadoRemoto?.slotExiste !==
        true
    ) {
        return criarResultado({
            podePersistir:
                false,

            codigo:
                estadoRemoto?.slotExiste ===
                    false
                    ? "ESTADO_REMOTO_DIVERGIU"
                    : "PREFLIGHT_ESTADO_REMOTO_INCONSISTENTE",

            expectativa,

            chaveLogica:
                chaveEsperada,

            divergencias: [
                estadoRemoto?.slotExiste ===
                    false
                    ? "ITEM_DEIXOU_DE_EXISTIR"
                    : "SLOT_EXISTE_INDETERMINADO",
            ],
        });
    }

    const documentoEsperado =
        normalizarDocumentoAtual(
            preflight.documentoAtual
        );

    const documentoRemoto =
        normalizarDocumentoAtual(
            estadoRemoto?.documentoAtual
        );

    if (!documentoRemoto) {
        return criarResultado({
            podePersistir:
                false,

            codigo:
                "PREFLIGHT_ESTADO_REMOTO_INCONSISTENTE",

            expectativa,

            chaveLogica:
                chaveEsperada,

            divergencias: [
                "DOCUMENTO_ATUAL_REMOTO_INVALIDO",
            ],
        });
    }

    const divergencias =
        [];

    if (
        documentoRemoto.itemId !==
        documentoEsperado.itemId
    ) {
        divergencias.push(
            "ITEM_ID"
        );
    }

    if (
        documentoRemoto.versaoId !==
        documentoEsperado.versaoId
    ) {
        divergencias.push(
            "VERSAO_ID"
        );
    }

    if (
        documentoRemoto.numeroVersao !==
        documentoEsperado.numeroVersao
    ) {
        divergencias.push(
            "NUMERO_VERSAO"
        );
    }

    if (
        documentoRemoto.hashSha256 !==
        documentoEsperado.hashSha256
    ) {
        divergencias.push(
            "HASH_SHA256"
        );
    }

    if (
        divergencias.length >
        0
    ) {
        return criarResultado({
            podePersistir:
                false,

            codigo:
                "ESTADO_REMOTO_DIVERGIU",

            expectativa,

            chaveLogica:
                chaveEsperada,

            divergencias,
        });
    }

    return criarResultado({
        podePersistir:
            true,

        codigo:
            "PREFLIGHT_OK_VERSAO_ATUAL_IGUAL",

        expectativa,

        chaveLogica:
            chaveEsperada,
    });
}