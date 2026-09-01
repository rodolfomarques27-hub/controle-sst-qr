import {
    useCallback,
    useMemo,
    useState,
} from "react";

import {
    useCertidaoMensalUploadMassa,
} from "../hooks/useCertidaoMensalUploadMassa.js";

import {
    CertidaoUploadMassaJobContext,
} from "./CertidaoUploadMassaJobContextCore.js";

export {
    useCertidaoUploadMassaJob,
} from "./CertidaoUploadMassaJobContextCore.js";

// SAFE_SCAN_CERT2_CONTEXT_CORE_STABLE_R3_R1

import {
    salvarPdfCertidaoMensal,
} from "../services/certidaoMensalDocumentPersistenceService.js";

import {
    criarCertidaoMensalUploadMassaPreflightReader,
} from "../services/certidaoMensalUploadMassaPreflightReaderService.js";

import {
    criarCertidaoMensalUploadMassaPreflightHashReader,
} from "../services/certidaoMensalUploadMassaPreflightHashReaderService.js";

import {
    criarCertidaoMensalUploadMassaPreflightVigenciaReader,
} from "../services/certidaoMensalUploadMassaPreflightVigenciaReaderService.js";

import {
    criarCertidaoMensalUploadMassaPreflightComposto,
} from "../services/certidaoMensalUploadMassaPreflightCompostoService.js";

import {
    CERTIDAO_MENSAL_AUDITORIA_STORAGE_BUCKET,
    consultarEstadoStorageCertidaoMensal,
} from "../services/certidaoMensalUploadMassaAuditoriaStorageReaderService.js";

import {
    criarCertidaoMensalUploadMassaAuditoriaVersaoReader,
} from "../services/certidaoMensalUploadMassaAuditoriaVersaoReaderService.js";

import {
    criarCertidaoMensalUploadMassaAuditoriaRemota,
} from "../services/certidaoMensalUploadMassaAuditoriaRemotaService.js";

import {
    ESTADOS_AUDITORIA_ACESSO_EMPRESA,
    criarCertidaoMensalUploadMassaAuditoriaAcessoEmpresaReader,
} from "../services/certidaoMensalUploadMassaAuditoriaAcessoEmpresaReaderService.js";

// ============================================================
// SAFE_SCAN_CERTIDAO_UPLOAD_MASSA_JOB_CONTEXT_V1
//
// Ownership persistente do job de análise em massa.
//
// O Provider vive acima das páginas individuais da área interna.
// Portanto, trocar Dashboard / Empresas / Colaboradores / Certidão
// NÃO desmonta o hook e NÃO dispara seu cleanup de AbortController.
//
// O hook original permanece responsável por:
// - estado;
// - progresso;
// - AbortController;
// - cancelar;
// - limpar;
// - proteção de operação concorrente.
//
// Este Context NÃO:
// - autoriza persistência por conta própria;
// - altera Classifier;
// - altera Resolver;
// - decide empresa;
// - decide competência;
// - usa nome/caminho como prova documental.
//
// SAFE_SCAN_CERTIDAO_EXECUTOR_REAL_GATE_FECHADO_V1
//
// O Context apenas disponibiliza a função pública oficial
// de persistência ao Hook.
//
// O executor agora é genérico, mas continua inacessível
// enquanto habilitarPersistenciaPrincipal permanecer false.
// A autorização de write pertence exclusivamente ao gate do Hook.
// ============================================================

export function CertidaoUploadMassaJobProvider({
    supabase = null,
    children,
}) {
    const [
        fontes,
        setFontes,
    ] =
        useState(
            () => ({
                empresas: [],
                colaboradores: [],
            })
        );

    const sincronizarFontes =
        useCallback(
            ({
                empresas = [],
                colaboradores = [],
            } = {}) => {
                const proximasEmpresas =
                    Array.isArray(
                        empresas
                    )
                        ? empresas
                        : [];

                const proximosColaboradores =
                    Array.isArray(
                        colaboradores
                    )
                        ? colaboradores
                        : [];

                setFontes(
                    (atual) => {
                        if (
                            atual.empresas ===
                                proximasEmpresas &&
                            atual.colaboradores ===
                                proximosColaboradores
                        ) {
                            return atual;
                        }

                        return {
                            empresas:
                                proximasEmpresas,

                            colaboradores:
                                proximosColaboradores,
                        };
                    }
                );
            },
            []
        );

    // ============================================================
    // SAFE_SCAN_CERTIDAO_EXECUTOR_GENERICO_R7_V1
    //
    // Adaptador puro entre Plan e Persistence.
    //
    // NÃO:
    // - decide empresa;
    // - decide competência;
    // - decide tipo;
    // - decide SHA;
    // - faz preflight próprio;
    // - usa allowlist local;
    // - executa retry;
    // - executa cleanup.
    //
    // O Plan faz o preflight imediatamente antes do write
    // e controla pausa + auditoria.
    // ============================================================

    const executorPersistenciaPrincipal =
        useCallback(
            async ({
                arquivo,
                payload,
            } = {}) => {
                if (
                    !arquivo ||
                    typeof arquivo !==
                        "object"
                ) {
                    throw new Error(
                        "Arquivo inválido para persistência principal."
                    );
                }

                if (
                    !payload ||
                    typeof payload !==
                        "object"
                ) {
                    throw new Error(
                        "Payload inválido para persistência principal."
                    );
                }

                return salvarPdfCertidaoMensal({
                    arquivo,
                    payload,
                });
            },
            []
        );

    // ============================================================
    // SAFE_SCAN_CERTIDAO_INFRA_READ_ONLY_R4_V1
    //
    // Infraestrutura REAL exclusivamente de leitura.
    //
    // IMPORTANTE:
    // - os factories abaixo NÃO fazem I/O ao serem criados;
    // - o Hook continua com gate de persistência false;
    // - nenhuma leitura remota é iniciada enquanto o gate estiver false;
    // - prova de acesso à empresa permanece ausente nesta etapa;
    // - portanto ausência física no Storage permanece INDETERMINADA.
    // ============================================================

    const infraestruturaPersistenciaSomenteLeitura =
        useMemo(
            () => {
                if (!supabase) {
                    return null;
                }

                const vigenciaReader =
                    criarCertidaoMensalUploadMassaPreflightVigenciaReader({
                        clienteSupabase:
                            supabase,
                    });

                const slotReader =
                    criarCertidaoMensalUploadMassaPreflightReader({
                        clienteSupabase:
                            supabase,
                    });

                const hashReader =
                    criarCertidaoMensalUploadMassaPreflightHashReader({
                        clienteSupabase:
                            supabase,
                    });

                const preflightComposto =
                    criarCertidaoMensalUploadMassaPreflightComposto({
                        vigenciaReader,
                        slotReader,
                        hashReader,
                    });

                const versaoReader =
                    criarCertidaoMensalUploadMassaAuditoriaVersaoReader({
                        clienteSupabase:
                            supabase,
                    });

                const acessoEmpresaReader =
                    criarCertidaoMensalUploadMassaAuditoriaAcessoEmpresaReader({
                        clienteSupabase:
                            supabase,
                    });

                const consultarStorageSomenteLeitura =
                    async ({
                        storageScope =
                            null,

                        bucketId =
                            CERTIDAO_MENSAL_AUDITORIA_STORAGE_BUCKET,

                        ...parametros
                    } = {}) => {
                        const scope =
                            storageScope ||
                            (
                                typeof supabase
                                    ?.storage
                                    ?.from ===
                                "function"
                                    ? supabase
                                        .storage
                                        .from(
                                            bucketId
                                        )
                                    : null
                            );

                        return consultarEstadoStorageCertidaoMensal({
                            ...parametros,

                            storageScope:
                                scope,

                            bucketId,
                        });
                    };

                const auditoriaRemota =
                    criarCertidaoMensalUploadMassaAuditoriaRemota({
                        slotReader,
                        hashReader,
                        versaoReader,

                        consultarStorage:
                            consultarStorageSomenteLeitura,
                    });

                return Object.freeze({
                    validarPreflightPersistenciaPrincipal:
                        preflightComposto
                            .validarAlvoPersistenciaPrincipalUploadMassa,

                    auditorPersistenciaPrincipal:
                        async (
                            entrada = {}
                        ) => {
                            /*
                             * =================================================
                             * SAFE_SCAN_CERTIDAO_PROVA_ACESSO_EMPRESA_R5_V1
                             *
                             * Única fonte aceita:
                             *
                             * entrada.chaveLogica.empresaId
                             *
                             * Nunca derivar empresa pelo caminho Storage.
                             * =================================================
                             */

                            const empresaId =
                                String(
                                    entrada
                                        ?.chaveLogica
                                        ?.empresaId ||
                                    ""
                                )
                                    .trim()
                                    .toLowerCase();

                            let provaAcessoEmpresa =
                                null;

                            if (empresaId) {
                                try {
                                    const estadoAcesso =
                                        await acessoEmpresaReader
                                            .lerProvaAcessoEmpresaCertidaoMensal({
                                                empresaId,
                                            });

                                    if (
                                        estadoAcesso
                                            ?.estadoAcesso ===
                                            ESTADOS_AUDITORIA_ACESSO_EMPRESA
                                                .CONFIRMADO &&
                                        estadoAcesso
                                            ?.provaAcessoEmpresa
                                            ?.confirmado ===
                                            true &&
                                        estadoAcesso
                                            ?.provaAcessoEmpresa
                                            ?.empresaId ===
                                            empresaId
                                    ) {
                                        provaAcessoEmpresa =
                                            estadoAcesso
                                                .provaAcessoEmpresa;
                                    }
                                }
                                catch {
                                    provaAcessoEmpresa =
                                        null;
                                }
                            }

                            return auditoriaRemota
                                .auditarEstadoRemotoPersistenciaPrincipal({
                                    ...entrada,

                                    provaAcessoEmpresa,
                                });
                        },
                });
            },
            [
                supabase,
            ]
        );

    const validarPreflightPersistenciaPrincipal =
        infraestruturaPersistenciaSomenteLeitura
            ?.validarPreflightPersistenciaPrincipal ||
        null;

    const auditorPersistenciaPrincipal =
        infraestruturaPersistenciaSomenteLeitura
            ?.auditorPersistenciaPrincipal ||
        null;

    const uploadMassa =
        useCertidaoMensalUploadMassa({
            supabase,

            empresas:
                fontes.empresas,

            colaboradores:
                fontes.colaboradores,

            executorPersistenciaPrincipal,

            validarPreflightPersistenciaPrincipal,

            auditorPersistenciaPrincipal,

            /*
             * SAFE_SCAN_CERTIDAO_GATE_GENERICO_R7_V1
             *
             * Executor genérico conectado.
             * Preflight composto e auditoria remota permanecem
             * injetados no Hook.
             *
             * Persistência continua BLOQUEADA neste checkpoint.
             */
            habilitarPersistenciaPrincipal:
                true,
        });

    return (
        <CertidaoUploadMassaJobContext.Provider
            value={{
                uploadMassa,
                sincronizarFontes,
            }}
        >
            {children}
        </CertidaoUploadMassaJobContext.Provider>
    );
}
