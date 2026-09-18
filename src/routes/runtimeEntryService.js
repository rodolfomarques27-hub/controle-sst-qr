import {
    TIPOS_AMBIENTE_RUNTIME_TENANT,
    classificarAmbienteRuntimeTenant,
} from "../utils/tenantRuntimeContextUtils.js";

export const ROTA_APRESENTACAO_DEV =
    "/apresentacao";

function normalizarPathname(
    valor = ""
) {
    const pathname =
        String(
            valor || "/"
        )
            .trim()
            .toLowerCase();

    if (
        pathname.length > 1 &&
        pathname.endsWith("/")
    ) {
        return pathname.slice(
            0,
            -1
        );
    }

    return pathname || "/";
}

export function deveRenderizarSiteInstitucionalDev(
    localizacao = null
) {
    const alvo =
        localizacao ??
        (
            typeof window !== "undefined"
                ? window.location
                : null
        );

    if (!alvo) {
        return false;
    }

    const classificacao =
        classificarAmbienteRuntimeTenant(
            alvo.hostname
        );

    if (
        classificacao.tipo !==
        TIPOS_AMBIENTE_RUNTIME_TENANT.DESENVOLVIMENTO
    ) {
        return false;
    }

    return (
        normalizarPathname(
            alvo.pathname
        ) ===
        ROTA_APRESENTACAO_DEV
    );
}