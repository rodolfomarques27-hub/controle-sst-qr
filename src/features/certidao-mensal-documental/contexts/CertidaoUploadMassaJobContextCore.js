import {
    createContext,
    useContext,
} from "react";

// ============================================================
// SAFE_SCAN_CERT2_CONTEXT_CORE_STABLE_R3_R1
//
// Identidade React estável do job de upload em massa.
//
// Deliberadamente não contém:
// - Provider;
// - estado do job;
// - persistência;
// - Supabase;
// - Storage;
// - OCR;
// - classifier;
// - resolver.
//
// Provider e consumidores compartilham este mesmo objeto
// de Context, inclusive através de Fast Refresh/HMR.
// ============================================================

export const CertidaoUploadMassaJobContext =
    createContext(
        null
    );

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
