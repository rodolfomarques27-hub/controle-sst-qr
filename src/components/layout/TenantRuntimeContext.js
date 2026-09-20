import {
    createContext,
    useContext,
} from "react";

export const TenantRuntimeContext =
    createContext(
        null
    );

export function useTenantRuntimeContext() {
    const contexto =
        useContext(
            TenantRuntimeContext
        );

    if (!contexto) {
        throw new Error(
            "TenantRuntimeContext deve ser consumido dentro de TenantContextGate."
        );
    }

    return contexto;
}