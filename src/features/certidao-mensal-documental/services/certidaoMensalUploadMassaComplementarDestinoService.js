/*
 * ============================================================
 * SAFE_SCAN_F2_DESTINO_EVIDENCIA_COMPLEMENTAR
 *
 * Decide o destino técnico da evidência complementar antes de
 * qualquer persistência.
 *
 * Sem Supabase.
 * Sem RPC.
 * Sem Storage.
 * Sem persistência.
 * ============================================================
 */

const PADRAO_UUID =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PADRAO_HASH_SHA256 =
    /^[0-9a-f]{64}$/i;

const PADRAO_COMPETENCIA =
    /^\d{4}-(0[1-9]|1[0-2])-01$/;

const TIPOS_EVIDENCIA_PERMITIDOS =
    new Set([
        "PAGAMENTO_SALARIAL",
        "ADIANTAMENTO_SALARIAL",
    ]);

export const CERTIDAO_UPLOAD_MASSA_DESTINO_COMPLEMENTAR =
    Object.freeze({
        BLOQUEADO:
            "BLOQUEADO",

        NOVA_EVIDENCIA:
            "NOVA_EVIDENCIA",

        BACKFILL_EVIDENCIA_EXISTENTE:
            "BACKFILL_EVIDENCIA_EXISTENTE",

        JA_ASSOCIADA:
            "JA_ASSOCIADA",
    });

function textoSeguro(
    valor
) {
    return String(
        valor ?? ""
    ).trim();
}

function normalizarUuid(
    valor
) {
    const texto =
        textoSeguro(
            valor
        ).toLowerCase();

    return PADRAO_UUID.test(
        texto
    )
        ? texto
        : "";
}

function normalizarHash(
    valor
) {
    const texto =
        textoSeguro(
            valor
        ).toLowerCase();

    return PADRAO_HASH_SHA256.test(
        texto
    )
        ? texto
        : "";
}

function normalizarTipo(
    valor
) {
    const tipo =
        textoSeguro(
            valor
        ).toUpperCase();

    return TIPOS_EVIDENCIA_PERMITIDOS.has(
        tipo
    )
        ? tipo
        : "";
}

function criarResultado({
    destino,
    codigo,
    indice = null,
    payload = null,
    evidencia = null,
} = {}) {
    return Object.freeze({
        destino,
        codigo,
        indice,
        payload,
        evidencia,

        permiteNovaEvidencia:
            destino ===
            CERTIDAO_UPLOAD_MASSA_DESTINO_COMPLEMENTAR
                .NOVA_EVIDENCIA,

        permiteBackfill:
            destino ===
            CERTIDAO_UPLOAD_MASSA_DESTINO_COMPLEMENTAR
                .BACKFILL_EVIDENCIA_EXISTENTE,

        jaAssociada:
            destino ===
            CERTIDAO_UPLOAD_MASSA_DESTINO_COMPLEMENTAR
                .JA_ASSOCIADA,

        executavel:
            false,

        autorizadoPersistir:
            false,

        persistenciaExecutada:
            false,

        chamouRpc:
            false,

        chamouStorage:
            false,
    });
}

function bloquear(
    codigo,
    indice = null
) {
    return criarResultado({
        destino:
            CERTIDAO_UPLOAD_MASSA_DESTINO_COMPLEMENTAR
                .BLOQUEADO,

        codigo,
        indice,
    });
}

function normalizarCandidato(
    candidato,
    hashSha256
) {
    if (
        !candidato ||
        typeof candidato !==
            "object" ||
        Array.isArray(
            candidato
        )
    ) {
        return {
            erro:
                "CANDIDATO_DRY_RUN_AUSENTE",
        };
    }

    const indice =
        Number.isInteger(
            candidato?.indice
        )
            ? candidato.indice
            : null;

    if (
        candidato?.estado !==
            "CANDIDATO_ESTRUTURAL" ||
        candidato?.codigo !==
            "DRY_RUN_CANDIDATO_ESTRUTURAL" ||
        candidato?.dryRun !==
            true ||
        candidato?.executavel ===
            true ||
        candidato?.autorizadoPersistir ===
            true ||
        candidato?.persistenciaExecutada ===
            true ||
        candidato?.executorHabilitado ===
            true
    ) {
        return {
            erro:
                "CANDIDATO_DRY_RUN_NAO_INTEGRO",

            indice,
        };
    }

    const payload =
        candidato?.payloadIntencao;

    if (
        !payload ||
        typeof payload !==
            "object" ||
        Array.isArray(
            payload
        )
    ) {
        return {
            erro:
                "PAYLOAD_INTENCAO_AUSENTE",

            indice,
        };
    }

    const itemId =
        normalizarUuid(
            payload?.itemId
        );

    const empresaId =
        normalizarUuid(
            payload?.empresaId
        );

    const competencia =
        textoSeguro(
            payload?.competencia
        );

    const tipoEvidencia =
        normalizarTipo(
            payload?.tipoEvidencia
        );

    const colaboradorId =
        normalizarUuid(
            payload?.colaboradorId
        );

    const hash =
        normalizarHash(
            hashSha256
        );

    if (!itemId) {
        return {
            erro:
                "ITEM_ID_INVALIDO",

            indice,
        };
    }

    if (!empresaId) {
        return {
            erro:
                "EMPRESA_ID_INVALIDO",

            indice,
        };
    }

    if (
        !PADRAO_COMPETENCIA.test(
            competencia
        )
    ) {
        return {
            erro:
                "COMPETENCIA_INVALIDA",

            indice,
        };
    }

    if (!tipoEvidencia) {
        return {
            erro:
                "TIPO_EVIDENCIA_INVALIDO",

            indice,
        };
    }

    if (!colaboradorId) {
        return {
            erro:
                "COLABORADOR_ID_INVALIDO",

            indice,
        };
    }

    if (!hash) {
        return {
            erro:
                "HASH_SHA256_INVALIDO",

            indice,
        };
    }

    if (!payload?.arquivo) {
        return {
            erro:
                "ARQUIVO_ORIGINAL_AUSENTE",

            indice,
        };
    }

    return {
        erro:
            "",

        indice,

        payload:
            Object.freeze({
                arquivo:
                    payload.arquivo,

                itemId,

                empresaId,

                competencia,

                tipoEvidencia,

                colaboradorId,

                hashSha256:
                    hash,
            }),
    };
}

export function resolverDestinoEvidenciaComplementarUploadMassa({
    candidatoDryRun = null,
    hashSha256 = "",
    evidenciasAtivas = [],
} = {}) {
    const candidato =
        normalizarCandidato(
            candidatoDryRun,
            hashSha256
        );

    if (candidato.erro) {
        return bloquear(
            candidato.erro,
            candidato.indice ??
                null
        );
    }

    const {
        indice,
        payload,
    } =
        candidato;

    const evidencias =
        Array.isArray(
            evidenciasAtivas
        )
            ? evidenciasAtivas
            : [];

    /*
     * Identidade histórica para este fluxo:
     *
     * - evidência ativa;
     * - mesmo item documental;
     * - mesmo SHA-256.
     *
     * Nome do arquivo não é identidade.
     */
    const correspondentes =
        evidencias.filter(
            (evidencia) =>
                evidencia?.ativo ===
                    true &&
                normalizarUuid(
                    evidencia?.itemId
                ) ===
                    payload.itemId &&
                normalizarHash(
                    evidencia?.hashSha256
                ) ===
                    payload.hashSha256
        );

    if (
        correspondentes.length ===
        0
    ) {
        return criarResultado({
            destino:
                CERTIDAO_UPLOAD_MASSA_DESTINO_COMPLEMENTAR
                    .NOVA_EVIDENCIA,

            codigo:
                "SEM_EVIDENCIA_HISTORICA_EXATA",

            indice,
            payload,
        });
    }

    if (
        correspondentes.length >
        1
    ) {
        return bloquear(
            "MULTIPLAS_EVIDENCIAS_ATIVAS_MESMO_HASH",
            indice
        );
    }

    const evidencia =
        correspondentes[0];

    const evidenciaId =
        normalizarUuid(
            evidencia?.id
        );

    if (!evidenciaId) {
        return bloquear(
            "EVIDENCIA_HISTORICA_ID_INVALIDO",
            indice
        );
    }

    const tipoHistorico =
        normalizarTipo(
            evidencia?.tipoEvidencia
        );

    if (!tipoHistorico) {
        return bloquear(
            "EVIDENCIA_HISTORICA_TIPO_INVALIDO",
            indice
        );
    }

    if (
        tipoHistorico !==
        payload.tipoEvidencia
    ) {
        return bloquear(
            "TIPO_EVIDENCIA_DIVERGENTE_DO_HISTORICO",
            indice
        );
    }

    const colaboradorHistoricoBruto =
        textoSeguro(
            evidencia?.colaboradorId
        );

    const colaboradorHistorico =
        colaboradorHistoricoBruto
            ? normalizarUuid(
                colaboradorHistoricoBruto
            )
            : "";

    if (
        colaboradorHistoricoBruto &&
        !colaboradorHistorico
    ) {
        return bloquear(
            "COLABORADOR_HISTORICO_ID_INVALIDO",
            indice
        );
    }

    const evidenciaNormalizada =
        Object.freeze({
            id:
                evidenciaId,

            itemId:
                payload.itemId,

            colaboradorId:
                colaboradorHistorico,

            tipoEvidencia:
                tipoHistorico,

            hashSha256:
                payload.hashSha256,

            nomeOriginal:
                textoSeguro(
                    evidencia?.nomeOriginal
                ),
        });

    if (!colaboradorHistorico) {
        return criarResultado({
            destino:
                CERTIDAO_UPLOAD_MASSA_DESTINO_COMPLEMENTAR
                    .BACKFILL_EVIDENCIA_EXISTENTE,

            codigo:
                "EVIDENCIA_EXISTENTE_SEM_COLABORADOR",

            indice,

            payload:
                Object.freeze({
                    evidenciaId,

                    itemId:
                        payload.itemId,

                    empresaId:
                        payload.empresaId,

                    competencia:
                        payload.competencia,

                    tipoEvidencia:
                        payload.tipoEvidencia,

                    colaboradorId:
                        payload.colaboradorId,

                    hashSha256:
                        payload.hashSha256,
                }),

            evidencia:
                evidenciaNormalizada,
        });
    }

    if (
        colaboradorHistorico ===
        payload.colaboradorId
    ) {
        return criarResultado({
            destino:
                CERTIDAO_UPLOAD_MASSA_DESTINO_COMPLEMENTAR
                    .JA_ASSOCIADA,

            codigo:
                "EVIDENCIA_JA_ASSOCIADA_MESMO_COLABORADOR",

            indice,

            payload:
                Object.freeze({
                    evidenciaId,

                    itemId:
                        payload.itemId,

                    empresaId:
                        payload.empresaId,

                    competencia:
                        payload.competencia,

                    tipoEvidencia:
                        payload.tipoEvidencia,

                    colaboradorId:
                        payload.colaboradorId,

                    hashSha256:
                        payload.hashSha256,
                }),

            evidencia:
                evidenciaNormalizada,
        });
    }

    return bloquear(
        "CONFLITO_COLABORADOR_EVIDENCIA_HISTORICA",
        indice
    );
}