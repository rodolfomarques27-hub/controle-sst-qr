import {
    supabase,
    SUPABASE_CONFIGURADO,
    SUPABASE_URL,
} from "../../../lib/supabaseClient.js";

const PRIMEIRO_ACESSO_CONFIRMACAO =
    "primeiro_acesso_confirmar";

const PRIMEIRO_ACESSO_SENHA =
    "primeiro_acesso";

const PARAMETRO_TENANT =
    "tenant";

const PARAMETRO_CONFIRMATION_URL =
    "confirmation_url";

function textoSeguro(
    valor,
    limite = 5000
) {
    return String(
        valor ??
        ""
    )
        .replace(
            /\0/g,
            ""
        )
        .trim()
        .slice(
            0,
            limite
        );
}

function normalizarSlugTenant(
    valor
) {
    const slug =
        textoSeguro(
            valor,
            100
        )
            .toLowerCase();

    if (
        !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(
            slug
        )
    ) {
        return "";
    }

    return slug;
}

function erroMensagem(
    erro,
    fallback
) {
    const mensagem =
        textoSeguro(
            erro?.message,
            600
        );

    return mensagem ||
        fallback;
}

function exigirSupabaseConfigurado() {
    if (
        !SUPABASE_CONFIGURADO
        || !supabase
    ) {
        throw new Error(
            "O serviço de autenticação está indisponível neste ambiente."
        );
    }
}

function validarUrlAuthSupabase(
    valor
) {
    const link =
        textoSeguro(
            valor,
            6000
        );

    if (
        !link
        || !SUPABASE_URL
    ) {
        return "";
    }

    try {
        const destino =
            new URL(
                link
            );

        const origemSupabase =
            new URL(
                SUPABASE_URL
            );

        if (
            destino.protocol !==
            "https:"
        ) {
            return "";
        }

        if (
            destino.origin !==
            origemSupabase.origin
        ) {
            return "";
        }

        if (
            !destino.pathname.startsWith(
                "/auth/v1/verify"
            )
        ) {
            return "";
        }

        return destino.toString();
    } catch {
        return "";
    }
}

export function obterRotaPrimeiroAcessoCliente() {
    if (
        typeof window ===
        "undefined"
    ) {
        return {
            ativo:
                false,
            etapa:
                "",
            tenantSlug:
                "",
        };
    }

    const parametros =
        new URLSearchParams(
            window.location.search ||
            ""
        );

    const tenantSlug =
        normalizarSlugTenant(
            parametros.get(
                PARAMETRO_TENANT
            )
        );

    const confirmacao =
        parametros.get(
            PRIMEIRO_ACESSO_CONFIRMACAO
        ) ===
        "1";

    const senha =
        parametros.get(
            PRIMEIRO_ACESSO_SENHA
        ) ===
        "1";

    if (
        !confirmacao &&
        !senha
    ) {
        return {
            ativo:
                false,
            etapa:
                "",
            tenantSlug:
                "",
        };
    }

    if (
        !tenantSlug
    ) {
        return {
            ativo:
                true,
            etapa:
                "invalida",
            tenantSlug:
                "",
        };
    }

    return {
        ativo:
            true,
        etapa:
            confirmacao
                ? "confirmar"
                : "senha",
        tenantSlug,
    };
}

export function capturarLinkConfirmacaoPrimeiroAcessoCliente() {
    if (
        typeof window ===
        "undefined"
    ) {
        return {
            valido:
                false,
            url:
                "",
            erro:
                "Link de primeiro acesso indisponível.",
        };
    }

    const hash =
        String(
            window.location.hash ||
            ""
        )
            .replace(
                /^#/,
                ""
            );

    if (
        !hash
    ) {
        return {
            valido:
                false,
            url:
                "",
            erro:
                "O link seguro de primeiro acesso não foi localizado.",
        };
    }

    const parametros =
        new URLSearchParams(
            hash
        );

    const url =
        validarUrlAuthSupabase(
            parametros.get(
                PARAMETRO_CONFIRMATION_URL
            )
        );

    if (
        !url
    ) {
        return {
            valido:
                false,
            url:
                "",
            erro:
                "O link de autenticação é inválido ou não pertence ao ambiente SafeScan.",
        };
    }

    return {
        valido:
            true,
        url,
        erro:
            "",
    };
}

export function limparFragmentoPrimeiroAcessoCliente() {
    if (
        typeof window ===
        "undefined"
        || !window.history?.replaceState
    ) {
        return;
    }

    const urlLimpa =
        (
            window.location.pathname ||
            "/"
        ) +
        (
            window.location.search ||
            ""
        );

    window.history.replaceState(
        null,
        document.title,
        urlLimpa
    );
}

export function validarSenhaPrimeiroAcessoCliente(
    senha
) {
    const valor =
        String(
            senha ??
            ""
        );

    if (
        valor.length <
        12
    ) {
        return "A senha deve possuir pelo menos 12 caracteres.";
    }

    if (
        !/[a-z]/.test(
            valor
        )
    ) {
        return "Inclua pelo menos uma letra minúscula.";
    }

    if (
        !/[A-Z]/.test(
            valor
        )
    ) {
        return "Inclua pelo menos uma letra maiúscula.";
    }

    if (
        !/[0-9]/.test(
            valor
        )
    ) {
        return "Inclua pelo menos um número.";
    }

    if (
        !/[^A-Za-z0-9]/.test(
            valor
        )
    ) {
        return "Inclua pelo menos um caractere especial.";
    }

    return "";
}

export async function listarPrimeiroAcessoTenantService({
    tenantId,
}) {
    exigirSupabaseConfigurado();

    const id =
        textoSeguro(
            tenantId,
            80
        );

    if (
        !id
    ) {
        throw new Error(
            "Cliente inválido."
        );
    }

    const {
        data,
        error,
    } =
        await supabase.rpc(
            "admin_listar_primeiro_acesso_tenant",
            {
                p_tenant_id:
                    id,
            }
        );

    if (
        error
    ) {
        throw new Error(
            erroMensagem(
                error,
                "Não foi possível consultar o primeiro acesso do cliente."
            )
        );
    }

    return Array.isArray(
        data
    )
        ? data
        : [];
}

export async function enviarPrimeiroAcessoClienteService({
    tenantId,
    userId,
}) {
    exigirSupabaseConfigurado();

    const tenantIdSeguro =
        textoSeguro(
            tenantId,
            80
        );

    const userIdSeguro =
        textoSeguro(
            userId,
            80
        );

    if (
        !tenantIdSeguro
        || !userIdSeguro
    ) {
        throw new Error(
            "Cliente ou usuário inválido."
        );
    }

    const {
        data,
        error,
    } =
        await supabase.functions.invoke(
            "admin-primeiro-acesso-cliente",
            {
                body: {
                    modo:
                        "enviar",
                    tenantId:
                        tenantIdSeguro,
                    userId:
                        userIdSeguro,
                },
            }
        );

    if (
        error
    ) {
        throw new Error(
            erroMensagem(
                error,
                "Não foi possível enviar o primeiro acesso."
            )
        );
    }

    if (
        data?.ok !==
        true
    ) {
        throw new Error(
            textoSeguro(
                data?.erro,
                600
            ) ||
            "Não foi possível enviar o primeiro acesso."
        );
    }

    return data;
}

export async function concluirPrimeiroAcessoClienteService({
    tenantSlug,
}) {
    exigirSupabaseConfigurado();

    const slug =
        normalizarSlugTenant(
            tenantSlug
        );

    if (
        !slug
    ) {
        throw new Error(
            "Cliente inválido."
        );
    }

    const {
        data,
        error,
    } =
        await supabase.functions.invoke(
            "admin-primeiro-acesso-cliente",
            {
                body: {
                    modo:
                        "concluir",
                    tenantSlug:
                        slug,
                },
            }
        );

    if (
        error
    ) {
        throw new Error(
            erroMensagem(
                error,
                "Não foi possível concluir o primeiro acesso."
            )
        );
    }

    if (
        data?.ok !==
        true
    ) {
        throw new Error(
            textoSeguro(
                data?.erro,
                600
            ) ||
            "Não foi possível concluir o primeiro acesso."
        );
    }

    return data;
}

export function montarUrlAmbientePrimeiroAcesso(
    hostname
) {
    const host =
        textoSeguro(
            hostname,
            253
        )
            .toLowerCase()
            .replace(
                /^https?:\/\//,
                ""
            )
            .replace(
                /\/.*$/,
                ""
            );

    if (
        !host
        || (
            host !==
            "safescanbrasil.com.br"
            &&
            host !==
            "www.safescanbrasil.com.br"
            &&
            !host.endsWith(
                ".safescanbrasil.com.br"
            )
        )
    ) {
        throw new Error(
            "Domínio do cliente inválido."
        );
    }

    return (
        "https://" +
        host +
        "/?primeiro_acesso=concluido"
    );
}

export {
    supabase as supabasePrimeiroAcessoCliente,
};