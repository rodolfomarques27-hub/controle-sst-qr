import {
    createContext,
    useCallback,
    useContext,
    useState,
} from "react";

import {
    useCertidaoMensalUploadMassa,
} from "../hooks/useCertidaoMensalUploadMassa.js";

// ============================================================
// SAFE_SCAN_CERTIDAO_UPLOAD_MASSA_FAIL_CLOSED_V1
//
// Remove infraestrutura montada exclusivamente para o write
// principal enquanto habilitarPersistenciaPrincipal permanece false.
//
// Preserva:
// - Context;
// - ownership do job;
// - fontes;
// - supabase;
// - hook integral;
// - fluxo de análise/read-only do hook;
// - gate principal false.
// ============================================================

const CertidaoUploadMassaJobContext =
    createContext(
        null
    );

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

    const uploadMassa =
        useCertidaoMensalUploadMassa({
            supabase,

            empresas:
                fontes.empresas,

            colaboradores:
                fontes.colaboradores,

            habilitarPersistenciaPrincipal:
                false,
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

export function useCertidaoUploadMassaJob() {
    const contexto =
        useContext(
            CertidaoUploadMassaJobContext
        );

    if (!contexto) {
        throw new Error(
            "useCertidaoUploadMassaJob deve ser usado dentro de CertidaoUploadMassaJobProvider."
        );
    }

    return contexto;
}
