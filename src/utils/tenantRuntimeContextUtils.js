import {
    hostnameTenantValido,
    normalizarHostnameTenant,
} from "./tenantContextUtils.js";

export const TIPOS_AMBIENTE_RUNTIME_TENANT =
    Object.freeze({
        COMPATIBILIDADE: "compatibility",
        DESENVOLVIMENTO: "development",
        PREVIEW: "preview",
        TENANT: "tenant",
        HOST_DESCONHECIDO: "unknown-host",
    });

export const HOST_COMPATIBILIDADE_SAFE_SCAN =
    "www.safescanbrasil.com.br";

const HOSTS_DESENVOLVIMENTO =
    new Set([
        "localhost",
        "127.0.0.1",
        "::1",
        "[::1]",
    ]);

const HOSTS_RESERVADOS_SAFE_SCAN =
    new Set([
        "safescanbrasil.com.br",
        "app.safescanbrasil.com.br",
        "admin.safescanbrasil.com.br",
        "api.safescanbrasil.com.br",
        "qr.safescanbrasil.com.br",
        "status.safescanbrasil.com.br",
        "assets.safescanbrasil.com.br",
        "static.safescanbrasil.com.br",
        "auth.safescanbrasil.com.br",
    ]);

function textoHostnameSeguro(
    valor = ""
) {
    return String(
        valor ?? ""
    )
        .trim()
        .toLowerCase()
        .replace(/\.$/, "");
}

export function hostnamePreviewVercel(
    valor = ""
) {
    const hostname =
        normalizarHostnameTenant(
            valor
        );

    return (
        hostname.length >
            ".vercel.app".length
        &&
        hostname.endsWith(
            ".vercel.app"
        )
    );
}

export function classificarAmbienteRuntimeTenant(
    valor = ""
) {
    const bruto =
        textoHostnameSeguro(
            valor
        );

    if (
        HOSTS_DESENVOLVIMENTO.has(
            bruto
        )
    ) {
        return {
            tipo:
                TIPOS_AMBIENTE_RUNTIME_TENANT
                    .DESENVOLVIMENTO,

            hostname:
                bruto,

            requerResolucaoTenant:
                false,
        };
    }

    const hostname =
        normalizarHostnameTenant(
            bruto
        );

    if (
        HOSTS_DESENVOLVIMENTO.has(
            hostname
        )
    ) {
        return {
            tipo:
                TIPOS_AMBIENTE_RUNTIME_TENANT
                    .DESENVOLVIMENTO,

            hostname,

            requerResolucaoTenant:
                false,
        };
    }

    if (
        hostname ===
        HOST_COMPATIBILIDADE_SAFE_SCAN
    ) {
        return {
            tipo:
                TIPOS_AMBIENTE_RUNTIME_TENANT
                    .COMPATIBILIDADE,

            hostname,

            requerResolucaoTenant:
                false,
        };
    }

    if (
        hostnamePreviewVercel(
            hostname
        )
    ) {
        return {
            tipo:
                TIPOS_AMBIENTE_RUNTIME_TENANT
                    .PREVIEW,

            hostname,

            requerResolucaoTenant:
                false,
        };
    }

    if (
        !hostname
        ||
        HOSTS_RESERVADOS_SAFE_SCAN.has(
            hostname
        )
        ||
        !hostnameTenantValido(
            hostname
        )
    ) {
        return {
            tipo:
                TIPOS_AMBIENTE_RUNTIME_TENANT
                    .HOST_DESCONHECIDO,

            hostname,

            requerResolucaoTenant:
                false,
        };
    }

    return {
        tipo:
            TIPOS_AMBIENTE_RUNTIME_TENANT
                .TENANT,

        hostname,

        requerResolucaoTenant:
            true,
    };
}