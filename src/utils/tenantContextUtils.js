const REGEX_HOSTNAME_TENANT =
    /^(?=.{3,253}$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;

const textoSeguroTenant =
    (valor = "") =>
        String(valor ?? "").trim();

export const ESTADOS_CONTEXTO_TENANT =
    Object.freeze({
        CARREGANDO: "loading",
        RESOLVIDO: "resolved",
        HOST_DESCONHECIDO: "unknown-host",
        ERRO: "error",
    });

export function normalizarHostnameTenant(valor = "") {
    const texto =
        textoSeguroTenant(valor);

    if (!texto) {
        return "";
    }

    let candidato =
        texto;

    try {
        const possuiEsquema =
            /^[a-z][a-z0-9+.-]*:\/\//i.test(
                candidato
            );

        const url =
            new URL(
                possuiEsquema
                    ? candidato
                    : `https://${candidato}`
            );

        candidato =
            url.hostname;
    } catch {
        candidato =
            candidato
                .split(/[/?#]/, 1)[0]
                .replace(/:\d+$/, "");
    }

    return candidato
        .trim()
        .toLowerCase()
        .replace(/^\[|\]$/g, "")
        .replace(/\.$/, "");
}

export function hostnameTenantValido(valor = "") {
    const hostname =
        normalizarHostnameTenant(valor);

    return REGEX_HOSTNAME_TENANT.test(
        hostname
    );
}

export function criarParametrosResolucaoHostnameTenant(
    valor = ""
) {
    return {
        p_hostname:
            normalizarHostnameTenant(
                valor
            ),
    };
}

export function criarContextoTenantCarregando(
    valor = ""
) {
    return {
        estado:
            ESTADOS_CONTEXTO_TENANT.CARREGANDO,

        hostname:
            normalizarHostnameTenant(
                valor
            ),

        tenant:
            null,

        dominio:
            null,

        dominioCanonico:
            null,

        origemPublicaCanonica:
            "",
    };
}

export function criarContextoTenantDesconhecido(
    valor = ""
) {
    return {
        estado:
            ESTADOS_CONTEXTO_TENANT.HOST_DESCONHECIDO,

        hostname:
            normalizarHostnameTenant(
                valor
            ),

        tenant:
            null,

        dominio:
            null,

        dominioCanonico:
            null,

        origemPublicaCanonica:
            "",
    };
}

export function criarContextoTenantErro(
    valor = ""
) {
    return {
        estado:
            ESTADOS_CONTEXTO_TENANT.ERRO,

        hostname:
            normalizarHostnameTenant(
                valor
            ),

        tenant:
            null,

        dominio:
            null,

        dominioCanonico:
            null,

        origemPublicaCanonica:
            "",
    };
}

export function normalizarContextoTenantRpc(
    resultado = null,
    hostnameInformado = ""
) {
    const resposta =
        Array.isArray(resultado)
            ? resultado[0] ?? null
            : resultado;

    const hostname =
        normalizarHostnameTenant(
            resposta?.hostname
            || hostnameInformado
        );

    const estado =
        textoSeguroTenant(
            resposta?.estado
        ).toLowerCase();

    if (
        !resposta
        || estado ===
            ESTADOS_CONTEXTO_TENANT.HOST_DESCONHECIDO
    ) {
        return criarContextoTenantDesconhecido(
            hostname
        );
    }

    if (
        estado !==
        ESTADOS_CONTEXTO_TENANT.RESOLVIDO
    ) {
        return criarContextoTenantErro(
            hostname
        );
    }

    const tenantId =
        textoSeguroTenant(
            resposta?.tenant?.id
        );

    const tenantSlug =
        textoSeguroTenant(
            resposta?.tenant?.slug
        );

    const tenantNome =
        textoSeguroTenant(
            resposta?.tenant?.nome
        );

    const dominioTipo =
        textoSeguroTenant(
            resposta?.dominio?.tipo
        );

    const dominioCanonicoHostname =
        normalizarHostnameTenant(
            resposta?.dominioCanonico?.hostname
        );

    const dominioCanonicoTipo =
        textoSeguroTenant(
            resposta?.dominioCanonico?.tipo
        );

    const dominioCanonicoValido =
        resposta?.dominioCanonico?.principal === true
        && hostnameTenantValido(
            dominioCanonicoHostname
        )
        && Boolean(
            dominioCanonicoTipo
        );

    const dominioCanonico =
        dominioCanonicoValido
            ? {
                hostname:
                    dominioCanonicoHostname,

                tipo:
                    dominioCanonicoTipo,

                principal:
                    true,
            }
            : null;

    const origemPublicaCanonica =
        dominioCanonico
            ? `https://${dominioCanonico.hostname}`
            : "";

    if (
        !hostnameTenantValido(hostname)
        || !tenantId
        || !tenantSlug
        || !tenantNome
        || !dominioTipo
    ) {
        return criarContextoTenantErro(
            hostname
        );
    }

    return {
        estado:
            ESTADOS_CONTEXTO_TENANT.RESOLVIDO,

        hostname,

        tenant: {
            id:
                tenantId,

            slug:
                tenantSlug,

            nome:
                tenantNome,
        },

        dominio: {
            tipo:
                dominioTipo,

            principal:
                resposta?.dominio?.principal === true,
        },

        dominioCanonico,

        origemPublicaCanonica,
    };
}