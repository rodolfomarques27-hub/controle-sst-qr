function primeiraLinha(
    data
) {
    if (
        Array.isArray(
            data
        )
    ) {
        return (
            data[0] ||
            null
        );
    }

    if (
        data &&
        typeof data ===
            "object"
    ) {
        return data;
    }

    return null;
}

export async function consultarRecursoEmailOperacionalTenantService({
    supabase,
    tenantId,
} = {}) {
    if (!supabase) {
        throw new Error(
            "Cliente Supabase não informado."
        );
    }

    if (!tenantId) {
        throw new Error(
            "Tenant não informado."
        );
    }

    const {
        data,
        error,
    } =
        await supabase.rpc(
            "consultar_recurso_email_operacional_tenant",
            {
                p_tenant_id:
                    tenantId,
            }
        );

    if (error) {
        throw new Error(
            error.message ||
            "Não foi possível consultar o estado do e-mail operacional."
        );
    }

    const linha =
        primeiraLinha(
            data
        );

    if (!linha) {
        throw new Error(
            "Resposta inválida do recurso de e-mail operacional."
        );
    }

    return {
        ativo:
            linha.email_operacional_ativo !==
            false,

        configurado:
            Boolean(
                linha.email_operacional_configurado
            ),

        atualizadoEm:
            linha.email_operacional_atualizado_em ||
            null,
    };
}

export async function salvarRecursoEmailOperacionalTenantAdminService({
    supabase,
    tenantId,
    ativo,
} = {}) {
    if (!supabase) {
        throw new Error(
            "Cliente Supabase não informado."
        );
    }

    if (!tenantId) {
        throw new Error(
            "Tenant não informado."
        );
    }

    if (
        typeof ativo !==
        "boolean"
    ) {
        throw new Error(
            "Estado do e-mail operacional inválido."
        );
    }

    const {
        data,
        error,
    } =
        await supabase.rpc(
            "admin_salvar_recurso_email_operacional_tenant",
            {
                p_tenant_id:
                    tenantId,

                p_ativo:
                    ativo,
            }
        );

    if (error) {
        throw new Error(
            error.message ||
            "Não foi possível atualizar o e-mail operacional."
        );
    }

    return (
        primeiraLinha(
            data
        ) ||
        null
    );
}
