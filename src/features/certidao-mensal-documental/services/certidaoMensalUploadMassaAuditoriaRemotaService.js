import {
    CERTIDAO_MENSAL_AUDITORIA_STORAGE_BUCKET,
    ESTADOS_AUDITORIA_STORAGE,
} from "./certidaoMensalUploadMassaAuditoriaStorageReaderService.js";

export const ESTADOS_AUDITORIA_REMOTA =
    Object.freeze({
        COMMIT_CONFIRMADO:
            "COMMIT_CONFIRMADO",

        NAO_COMMITIDO_CONFIRMADO:
            "NAO_COMMITIDO_CONFIRMADO",

        RESIDUO_STORAGE_CONFIRMADO:
            "RESIDUO_STORAGE_CONFIRMADO",

        ESTADO_REMOTO_INCONSISTENTE:
            "ESTADO_REMOTO_INCONSISTENTE",

        INDETERMINADO:
            "INDETERMINADO",
    });

const SHA256 =
    /^[a-f0-9]{64}$/;

const texto = (valor) =>
    String(valor ?? "").trim();

function hash(valor) {
    const normalizado =
        texto(valor).toLowerCase();

    return SHA256.test(normalizado)
        ? normalizado
        : "";
}

function resultado({
    estado,
    codigo,
    motivo,
    slotAtual = null,
    estadoSha = null,
    versaoFisica = null,
    estadoStorage = null,
    causa = null,
}) {
    return Object.freeze({
        versao:
            1,

        auditoriaConcluida:
            true,

        estado,
        codigo,
        motivo,

        podeRetryAutomatico:
            false,

        podeCleanupAutomatico:
            false,

        requerIntervencaoHumana:
            estado !==
            ESTADOS_AUDITORIA_REMOTA
                .COMMIT_CONFIRMADO,

        slotAtual,
        estadoSha,
        versaoFisica,
        estadoStorage,

        causa:
            causa
                ? Object.freeze({
                    codigo:
                        texto(
                            causa?.codigo ||
                            causa?.code
                        ),

                    mensagem:
                        texto(
                            causa?.message
                        ),
                })
                : null,
    });
}

function slotCanonico(
    estado
) {
    if (
        Number(estado?.versao) !== 1 ||
        estado?.leituraConcluida !== true ||
        typeof estado?.slotExiste !==
            "boolean"
    ) {
        return false;
    }

    if (!estado.slotExiste) {
        return (
            estado.documentoAtual ===
            null
        );
    }

    const documento =
        estado.documentoAtual;

    return Boolean(
        texto(documento?.itemId) &&
        texto(documento?.versaoId) &&
        Number(
            documento?.numeroVersao
        ) > 0 &&
        hash(
            documento?.hashSha256
        )
    );
}

function hashCanonico(
    estado,
    esperado
) {
    return Boolean(
        Number(estado?.versao) === 1 &&
        estado?.leituraConcluida === true &&
        typeof estado?.jaExiste ===
            "boolean" &&
        Array.isArray(
            estado?.ocorrencias
        ) &&
        hash(
            estado?.hashSha256
        ) === esperado
    );
}

function slotIgual(
    atual,
    anterior
) {
    if (
        !slotCanonico(atual) ||
        !slotCanonico(anterior)
    ) {
        return false;
    }

    if (
        atual.slotExiste !==
        anterior.slotExiste
    ) {
        return false;
    }

    if (!atual.slotExiste) {
        return true;
    }

    const a =
        atual.documentoAtual;

    const b =
        anterior.documentoAtual;

    return (
        texto(a?.itemId) ===
            texto(b?.itemId) &&
        texto(a?.versaoId) ===
            texto(b?.versaoId) &&
        Number(
            a?.numeroVersao
        ) ===
            Number(
                b?.numeroVersao
            ) &&
        hash(
            a?.hashSha256
        ) ===
            hash(
                b?.hashSha256
            )
    );
}

function ocorrenciaConfirmaVersao(
    estadoSha,
    versaoFisica
) {
    const versao =
        versaoFisica?.versaoFisica;

    if (!versao) {
        return false;
    }

    return estadoSha.ocorrencias.some(
        (ocorrencia) =>
            texto(
                ocorrencia?.id
            ) ===
                texto(
                    versao.id
                ) &&
            texto(
                ocorrencia?.itemId
            ) ===
                texto(
                    versao.itemId
                ) &&
            Number(
                ocorrencia?.numeroVersao
            ) ===
                Number(
                    versao.numeroVersao
                ) &&
            hash(
                ocorrencia?.hashSha256
            ) ===
                hash(
                    versao.hashSha256
                )
    );
}

export function criarCertidaoMensalUploadMassaAuditoriaRemota({
    slotReader = null,
    hashReader = null,
    versaoReader = null,
    consultarStorage = null,
} = {}) {
    const lerSlot =
        slotReader
            ?.lerEstadoRemotoPersistenciaPrincipalUploadMassa;

    const lerHash =
        hashReader
            ?.lerEstadoShaPersistenciaPrincipalUploadMassa;

    const lerVersao =
        versaoReader
            ?.lerVersaoFisicaCertidaoMensal;

    if (
        typeof lerSlot !== "function" ||
        typeof lerHash !== "function" ||
        typeof lerVersao !== "function" ||
        typeof consultarStorage !==
            "function"
    ) {
        throw new Error(
            "Dependências inválidas para auditoria remota."
        );
    }

    async function auditarEstadoRemotoPersistenciaPrincipal({
        chaveLogica = null,
        hashSha256 = "",
        snapshotSlotAntes = null,
        caminhoStorageTentativa = "",
        bucketIdTentativa =
            CERTIDAO_MENSAL_AUDITORIA_STORAGE_BUCKET,
        tamanhoBytesTentativa = null,
        provaAcessoEmpresa = null,
        storageScope = null,
        signal = null,
    } = {}) {
        const hashAlvo =
            hash(hashSha256);

        if (!hashAlvo) {
            return resultado({
                estado:
                    ESTADOS_AUDITORIA_REMOTA
                        .INDETERMINADO,

                codigo:
                    "AUDITORIA_HASH_INVALIDO",

                motivo:
                    "HASH_ALVO_INVALIDO",
            });
        }

        if (
            !slotCanonico(
                snapshotSlotAntes
            )
        ) {
            return resultado({
                estado:
                    ESTADOS_AUDITORIA_REMOTA
                        .INDETERMINADO,

                codigo:
                    "AUDITORIA_SNAPSHOT_ANTES_INVALIDO",

                motivo:
                    "SEM_BASELINE_REMOTO_CONFIAVEL",
            });
        }

        let slotAtual;
        let estadoSha;

        try {
            [
                slotAtual,
                estadoSha,
            ] =
                await Promise.all([
                    lerSlot({
                        chaveLogica,
                        signal,
                    }),

                    lerHash({
                        hashSha256:
                            hashAlvo,

                        signal,
                    }),
                ]);
        }
        catch (error) {
            return resultado({
                estado:
                    ESTADOS_AUDITORIA_REMOTA
                        .INDETERMINADO,

                codigo:
                    "AUDITORIA_READERS_FALHARAM",

                motivo:
                    "LEITURA_REMOTA_INDETERMINADA",

                causa:
                    error,
            });
        }

        if (
            !slotCanonico(
                slotAtual
            )
        ) {
            return resultado({
                estado:
                    ESTADOS_AUDITORIA_REMOTA
                        .INDETERMINADO,

                codigo:
                    "AUDITORIA_SLOT_INVALIDO",

                motivo:
                    "SLOT_ATUAL_NAO_CANONICO",

                slotAtual,
                estadoSha,
            });
        }

        if (
            !hashCanonico(
                estadoSha,
                hashAlvo
            )
        ) {
            return resultado({
                estado:
                    ESTADOS_AUDITORIA_REMOTA
                        .INDETERMINADO,

                codigo:
                    "AUDITORIA_SHA_INVALIDO",

                motivo:
                    "SHA_ATUAL_NAO_CANONICO",

                slotAtual,
                estadoSha,
            });
        }

        const documentoAtual =
            slotAtual.documentoAtual;

        const slotApontaNovoHash =
            slotAtual.slotExiste ===
                true &&
            hash(
                documentoAtual
                    ?.hashSha256
            ) ===
                hashAlvo;

        // Candidato a commit confirmado.
        if (slotApontaNovoHash) {
            if (
                estadoSha.jaExiste !==
                true
            ) {
                return resultado({
                    estado:
                        ESTADOS_AUDITORIA_REMOTA
                            .ESTADO_REMOTO_INCONSISTENTE,

                    codigo:
                        "AUDITORIA_SLOT_SHA_DIVERGENTES",

                    motivo:
                        "SLOT_APONTA_HASH_MAS_HASH_GLOBAL_NAO_ENCONTROU",

                    slotAtual,
                    estadoSha,
                });
            }

            let versaoFisica;

            try {
                versaoFisica =
                    await lerVersao({
                        versaoId:
                            documentoAtual
                                .versaoId,
                    });
            }
            catch (error) {
                return resultado({
                    estado:
                        ESTADOS_AUDITORIA_REMOTA
                            .INDETERMINADO,

                    codigo:
                        "AUDITORIA_VERSAO_THROW",

                    motivo:
                        "VERSAO_FISICA_NAO_PODE_SER_LIDA",

                    slotAtual,
                    estadoSha,

                    causa:
                        error,
                });
            }

            if (
                versaoFisica
                    ?.estadoVersao !==
                "EXISTE"
            ) {
                return resultado({
                    estado:
                        ESTADOS_AUDITORIA_REMOTA
                            .INDETERMINADO,

                    codigo:
                        "AUDITORIA_VERSAO_INDETERMINADA",

                    motivo:
                        "VERSAO_FISICA_NAO_CONFIRMADA",

                    slotAtual,
                    estadoSha,
                    versaoFisica,
                });
            }

            const fisica =
                versaoFisica
                    .versaoFisica;

            const fingerprintConfere =
                texto(
                    fisica?.id
                ) ===
                    texto(
                        documentoAtual
                            ?.versaoId
                    ) &&
                texto(
                    fisica?.itemId
                ) ===
                    texto(
                        documentoAtual
                            ?.itemId
                    ) &&
                Number(
                    fisica?.numeroVersao
                ) ===
                    Number(
                        documentoAtual
                            ?.numeroVersao
                    ) &&
                hash(
                    fisica?.hashSha256
                ) ===
                    hashAlvo;

            if (!fingerprintConfere) {
                return resultado({
                    estado:
                        ESTADOS_AUDITORIA_REMOTA
                            .ESTADO_REMOTO_INCONSISTENTE,

                    codigo:
                        "AUDITORIA_FINGERPRINT_VERSAO_DIVERGENTE",

                    motivo:
                        "SLOT_E_VERSAO_FISICA_NAO_CONFEREM",

                    slotAtual,
                    estadoSha,
                    versaoFisica,
                });
            }

            if (
                !ocorrenciaConfirmaVersao(
                    estadoSha,
                    versaoFisica
                )
            ) {
                return resultado({
                    estado:
                        ESTADOS_AUDITORIA_REMOTA
                            .ESTADO_REMOTO_INCONSISTENTE,

                    codigo:
                        "AUDITORIA_HASH_NAO_CONFIRMA_VERSAO",

                    motivo:
                        "HASH_GLOBAL_NAO_REFERENCIA_VERSAO_ATUAL",

                    slotAtual,
                    estadoSha,
                    versaoFisica,
                });
            }

            let estadoStorage;

            try {
                estadoStorage =
                    await consultarStorage({
                        storageScope,

                        bucketId:
                            fisica.bucketId,

                        caminhoStorage:
                            fisica.caminhoStorage,

                        provaAcessoEmpresa,

                        tamanhoBytesEsperado:
                            fisica.tamanhoBytes,
                    });
            }
            catch (error) {
                return resultado({
                    estado:
                        ESTADOS_AUDITORIA_REMOTA
                            .INDETERMINADO,

                    codigo:
                        "AUDITORIA_STORAGE_THROW",

                    motivo:
                        "STORAGE_NAO_PODE_SER_AUDITADO",

                    slotAtual,
                    estadoSha,
                    versaoFisica,

                    causa:
                        error,
                });
            }

            if (
                estadoStorage
                    ?.estadoStorage ===
                ESTADOS_AUDITORIA_STORAGE
                    .INDETERMINADO
            ) {
                return resultado({
                    estado:
                        ESTADOS_AUDITORIA_REMOTA
                            .INDETERMINADO,

                    codigo:
                        "AUDITORIA_STORAGE_INDETERMINADO",

                    motivo:
                        "STORAGE_NAO_CONCLUSIVO",

                    slotAtual,
                    estadoSha,
                    versaoFisica,
                    estadoStorage,
                });
            }

            if (
                estadoStorage
                    ?.estadoStorage !==
                    ESTADOS_AUDITORIA_STORAGE
                        .EXISTE ||
                estadoStorage
                    ?.tamanhoConfere ===
                    false
            ) {
                return resultado({
                    estado:
                        ESTADOS_AUDITORIA_REMOTA
                            .ESTADO_REMOTO_INCONSISTENTE,

                    codigo:
                        "AUDITORIA_DB_STORAGE_DIVERGENTES",

                    motivo:
                        "DB_CONFIRMA_VERSAO_MAS_STORAGE_NAO_CONFERE",

                    slotAtual,
                    estadoSha,
                    versaoFisica,
                    estadoStorage,
                });
            }

            if (
                estadoStorage
                    ?.tamanhoConfere !==
                true
            ) {
                return resultado({
                    estado:
                        ESTADOS_AUDITORIA_REMOTA
                            .INDETERMINADO,

                    codigo:
                        "AUDITORIA_STORAGE_TAMANHO_NAO_CONFIRMADO",

                    motivo:
                        "EXISTENCIA_CONFIRMADA_SEM_PROVA_DE_TAMANHO",

                    slotAtual,
                    estadoSha,
                    versaoFisica,
                    estadoStorage,
                });
            }

            return resultado({
                estado:
                    ESTADOS_AUDITORIA_REMOTA
                        .COMMIT_CONFIRMADO,

                codigo:
                    "AUDITORIA_COMMIT_CONFIRMADO",

                motivo:
                    "SLOT_SHA_VERSAO_E_STORAGE_CONCORDAM",

                slotAtual,
                estadoSha,
                versaoFisica,
                estadoStorage,
            });
        }

        // O slot não aponta o novo hash.
        // O baseline deve permanecer exatamente igual.
        if (
            !slotIgual(
                slotAtual,
                snapshotSlotAntes
            )
        ) {
            return resultado({
                estado:
                    ESTADOS_AUDITORIA_REMOTA
                        .ESTADO_REMOTO_INCONSISTENTE,

                codigo:
                    "AUDITORIA_SLOT_MUDOU_DURANTE_AMBIGUIDADE",

                motivo:
                    "SLOT_ATUAL_DIVERGE_DO_BASELINE",

                slotAtual,
                estadoSha,
            });
        }

        if (
            estadoSha.jaExiste ===
            true
        ) {
            return resultado({
                estado:
                    ESTADOS_AUDITORIA_REMOTA
                        .ESTADO_REMOTO_INCONSISTENTE,

                codigo:
                    "AUDITORIA_HASH_APARECEU_FORA_DO_SLOT",

                motivo:
                    "SHA_EXISTE_MAS_SLOT_PERMANECEU_NO_BASELINE",

                slotAtual,
                estadoSha,
            });
        }

        if (
            !texto(
                caminhoStorageTentativa
            )
        ) {
            return resultado({
                estado:
                    ESTADOS_AUDITORIA_REMOTA
                        .INDETERMINADO,

                codigo:
                    "AUDITORIA_CAMINHO_STORAGE_AUSENTE",

                motivo:
                    "SEM_CAMINHO_DA_TENTATIVA",

                slotAtual,
                estadoSha,
            });
        }

        let estadoStorage;

        try {
            estadoStorage =
                await consultarStorage({
                    storageScope,

                    bucketId:
                        bucketIdTentativa,

                    caminhoStorage:
                        caminhoStorageTentativa,

                    provaAcessoEmpresa,

                    tamanhoBytesEsperado:
                        tamanhoBytesTentativa,
                });
        }
        catch (error) {
            return resultado({
                estado:
                    ESTADOS_AUDITORIA_REMOTA
                        .INDETERMINADO,

                codigo:
                    "AUDITORIA_STORAGE_THROW",

                motivo:
                    "STORAGE_NAO_PODE_SER_AUDITADO",

                slotAtual,
                estadoSha,

                causa:
                    error,
            });
        }

        if (
            estadoStorage
                ?.estadoStorage ===
            ESTADOS_AUDITORIA_STORAGE
                .AUSENTE_CONFIRMADO
        ) {
            return resultado({
                estado:
                    ESTADOS_AUDITORIA_REMOTA
                        .NAO_COMMITIDO_CONFIRMADO,

                codigo:
                    "AUDITORIA_NAO_COMMITIDO_CONFIRMADO",

                motivo:
                    "SLOT_INALTERADO_SHA_AUSENTE_STORAGE_AUSENTE",

                slotAtual,
                estadoSha,
                estadoStorage,
            });
        }

        if (
            estadoStorage
                ?.estadoStorage ===
            ESTADOS_AUDITORIA_STORAGE
                .EXISTE
        ) {
            return resultado({
                estado:
                    ESTADOS_AUDITORIA_REMOTA
                        .RESIDUO_STORAGE_CONFIRMADO,

                codigo:
                    "AUDITORIA_RESIDUO_STORAGE_CONFIRMADO",

                motivo:
                    "DB_INALTERADO_MAS_OBJETO_STORAGE_EXISTE",

                slotAtual,
                estadoSha,
                estadoStorage,
            });
        }

        return resultado({
            estado:
                ESTADOS_AUDITORIA_REMOTA
                    .INDETERMINADO,

            codigo:
                "AUDITORIA_STORAGE_INDETERMINADO",

            motivo:
                "SLOT_E_SHA_INALTERADOS_MAS_STORAGE_NAO_CONCLUSIVO",

            slotAtual,
            estadoSha,
            estadoStorage,
        });
    }

    return Object.freeze({
        auditarEstadoRemotoPersistenciaPrincipal,
    });
}