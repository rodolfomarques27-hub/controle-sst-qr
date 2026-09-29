import {
    supabase,
    SUPABASE_CONFIGURADO,
} from "../../../lib/supabaseClient.js";

function textoSeguro(valor, limite = 800) {
    return String(valor ?? "")
        .replace(/\0/g, "")
        .trim()
        .slice(0, limite);
}

function exigirSupabaseConfigurado() {
    if (!SUPABASE_CONFIGURADO || !supabase) {
        throw new Error(
            "O serviço de autenticação está indisponível neste ambiente."
        );
    }
}

async function mensagemErro(error, fallback) {
    let mensagemResposta = "";

    try {
        if (
            error?.context &&
            typeof error.context.json === "function"
        ) {
            const payload =
                await error.context.json();

            mensagemResposta =
                textoSeguro(
                    payload?.erro,
                    800
                );
        }
    }
    catch {
        mensagemResposta = "";
    }

    return (
        mensagemResposta ||
        textoSeguro(
            error?.message,
            800
        ) ||
        fallback
    );
}

export function validarSenhaTemporariaTenantAdmin(senha) {
    const valor =
        String(
            senha ??
            ""
        );

    if (valor.length < 12) {
        return "A senha temporária deve possuir pelo menos 12 caracteres.";
    }

    if (!/[a-z]/.test(valor)) {
        return "Inclua pelo menos uma letra minúscula.";
    }

    if (!/[A-Z]/.test(valor)) {
        return "Inclua pelo menos uma letra maiúscula.";
    }

    if (!/[0-9]/.test(valor)) {
        return "Inclua pelo menos um número.";
    }

    if (!/[^A-Za-z0-9]/.test(valor)) {
        return "Inclua pelo menos um caractere especial.";
    }

    return "";
}

async function executarAcaoSenhaTenant({
    modo,
    tenantId,
    userId,
    senhaTemporaria,
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

    if (!tenantIdSeguro || !userIdSeguro) {
        throw new Error(
            "Cliente ou administrador inválido."
        );
    }

    const body = {
        modo,
        tenantId:
            tenantIdSeguro,
        userId:
            userIdSeguro,
    };

    if (modo === "definir_senha_temporaria") {
        body.senhaTemporaria =
            String(
                senhaTemporaria ??
                ""
            );
    }

    const {
        data,
        error,
    } =
        await supabase.functions.invoke(
            "admin-gerenciar-senha-tenant",
            {
                body,
            }
        );

    if (error) {
        throw new Error(
            await mensagemErro(
                error,
                "Não foi possível concluir a operação de senha."
            )
        );
    }

    if (data?.ok !== true) {
        throw new Error(
            textoSeguro(
                data?.erro,
                800
            ) ||
            "Não foi possível concluir a operação de senha."
        );
    }

    return data;
}

export async function enviarRedefinicaoSenhaTenantAdminService({
    tenantId,
    userId,
}) {
    return executarAcaoSenhaTenant({
        modo:
            "enviar_redefinicao",
        tenantId,
        userId,
    });
}

export async function definirSenhaTemporariaTenantAdminService({
    tenantId,
    userId,
    senhaTemporaria,
}) {
    const erroSenha =
        validarSenhaTemporariaTenantAdmin(
            senhaTemporaria
        );

    if (erroSenha) {
        throw new Error(
            erroSenha
        );
    }

    return executarAcaoSenhaTenant({
        modo:
            "definir_senha_temporaria",
        tenantId,
        userId,
        senhaTemporaria,
    });
}