import {
    supabase,
} from "../../../lib/supabaseClient.js";

import {
    mensagemErroEdgeEmailTenant,
    mensagemFalhaEmailTenant,
} from "./tenantAdminEmailMensagens.js";

const EDGE_EMAIL_TENANT =
    "admin-gerenciar-provedor-email-tenant";

export const CONFIGURACAO_EMAIL_TENANT_PADRAO =
    Object.freeze({
        tenantId:
            null,

        modoEnvio:
            "DESATIVADO",

        provedor:
            null,

        host:
            null,

        porta:
            null,

        modoSeguranca:
            null,

        usuarioSmtp:
            null,

        remetenteEmail:
            null,

        remetenteNomePadrao:
            null,

        responderParaPadrao:
            null,

        credencialConfigurada:
            false,

        ultimoTesteStatus:
            "NAO_APLICAVEL",

        ultimoTesteCodigo:
            null,

        ultimoTesteEm:
            null,

        ultimoTestePor:
            null,

        versao:
            null,

        safescanGerenciadoDisponivel:
            false,
    });

function textoSeguro(
    valor,
) {
    return String(
        valor ?? "",
    ).trim();
}

function tenantIdObrigatorio(
    tenantId,
) {
    const normalizado =
        textoSeguro(
            tenantId,
        );

    if (
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            normalizado,
        )
    ) {
        throw new Error(
            "Tenant inválido para administração do provedor de e-mail.",
        );
    }

    return normalizado;
}

function normalizarConfiguracao(
    valor,
) {
    if (
        !valor ||
        typeof valor !==
            "object"
    ) {
        return {
            ...CONFIGURACAO_EMAIL_TENANT_PADRAO,
        };
    }

    return {
        tenantId:
            textoSeguro(
                valor.tenantId,
            ) || null,

        modoEnvio:
            textoSeguro(
                valor.modoEnvio,
            ) || "DESATIVADO",

        provedor:
            textoSeguro(
                valor.provedor,
            ) || null,

        host:
            textoSeguro(
                valor.host,
            ) || null,

        porta:
            Number(
                valor.porta,
            ) || null,

        modoSeguranca:
            textoSeguro(
                valor.modoSeguranca,
            ) || null,

        usuarioSmtp:
            textoSeguro(
                valor.usuarioSmtp,
            ) || null,

        remetenteEmail:
            textoSeguro(
                valor.remetenteEmail,
            ) || null,

        remetenteNomePadrao:
            textoSeguro(
                valor.remetenteNomePadrao,
            ) || null,

        responderParaPadrao:
            textoSeguro(
                valor.responderParaPadrao,
            ) || null,

        credencialConfigurada:
            valor.credencialConfigurada ===
            true,

        ultimoTesteStatus:
            textoSeguro(
                valor.ultimoTesteStatus,
            ) || "NAO_APLICAVEL",

        ultimoTesteCodigo:
            textoSeguro(
                valor.ultimoTesteCodigo,
            ) || null,

        ultimoTesteEm:
            textoSeguro(
                valor.ultimoTesteEm,
            ) || null,

        ultimoTestePor:
            textoSeguro(
                valor.ultimoTestePor,
            ) || null,

        versao:
            Number(
                valor.versao,
            ) || null,

        safescanGerenciadoDisponivel:
            valor.safescanGerenciadoDisponivel ===
            true,
    };
}

async function invocarEdgeTenant(
    acao,
    tenantId,
    payload = {},
) {
    const tenantIdNormalizado =
        tenantIdObrigatorio(
            tenantId,
        );

    const {
        data,
        error,
    } =
        await supabase.functions.invoke(
            EDGE_EMAIL_TENANT,
            {
                body: {
                    acao,
                    tenantId:
                        tenantIdNormalizado,
                    ...payload,
                },
            },
        );

    if (error) {
        throw new Error(
            await mensagemErroEdgeEmailTenant(error),
        );
    }

    if (
        data?.ok !==
        true
    ) {
        throw new Error(
            mensagemFalhaEmailTenant(null, data?.codigo),
        );
    }

    return {
        configuracao:
            normalizarConfiguracao(
                data?.configuracao,
            ),

        teste:
            data?.teste &&
            typeof data.teste ===
                "object"
                ? {
                    status:
                        textoSeguro(
                            data.teste.status,
                        ),

                    codigo:
                        textoSeguro(
                            data.teste.codigo,
                        ) || null,
                }
                : null,
    };
}

export async function obterConfiguracaoEmailTenantAdminService({
    tenantId,
} = {}) {
    const resultado =
        await invocarEdgeTenant(
            "obter",
            tenantId,
        );

    return resultado.configuracao;
}

export async function salvarConfiguracaoEmailTenantAdminService({
    tenantId,
    configuracao,
    credencialNova,
} = {}) {
    const atual =
        configuracao &&
        typeof configuracao ===
            "object"
            ? configuracao
            : {};

    const resultado =
        await invocarEdgeTenant(
            "salvar",
            tenantId,
            {
                provedor:
                    textoSeguro(
                        atual.provedor,
                    ),

                host:
                    textoSeguro(
                        atual.host,
                    ),

                porta:
                    Number(
                        atual.porta,
                    ) || null,

                modoSeguranca:
                    textoSeguro(
                        atual.modoSeguranca,
                    ),

                usuarioSmtp:
                    textoSeguro(
                        atual.usuarioSmtp,
                    ),

                remetenteEmail:
                    textoSeguro(
                        atual.remetenteEmail,
                    ),

                remetenteNomePadrao:
                    textoSeguro(
                        atual.remetenteNomePadrao,
                    ),

                responderParaPadrao:
                    textoSeguro(
                        atual.responderParaPadrao,
                    ) || null,

                credencialNova:
                    typeof credencialNova ===
                        "string" &&
                    credencialNova.length >
                        0
                        ? credencialNova
                        : null,

                versaoEsperada:
                    Number(
                        atual.versao,
                    ) || null,
            },
        );

    return resultado.configuracao;
}

export async function testarConfiguracaoEmailTenantAdminService({
    tenantId,
} = {}) {
    return await invocarEdgeTenant(
        "testar",
        tenantId,
    );
}

export async function definirModoEmailTenantAdminService({
    tenantId,
    modoEnvio,
    versaoEsperada,
} = {}) {
    const resultado =
        await invocarEdgeTenant(
            "definir_modo",
            tenantId,
            {
                modoEnvio:
                    textoSeguro(
                        modoEnvio,
                    ),

                versaoEsperada:
                    Number(
                        versaoEsperada,
                    ) || null,
            },
        );

    return resultado.configuracao;
}