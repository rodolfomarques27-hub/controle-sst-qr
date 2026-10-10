const RECURSOS_PIN_PERMITIDOS =
    new Set([
        "pin_emergencia_empresa",
        "pin_acesso_usuario",
    ]);

function primeiraLinha(
    data
) {
    if (Array.isArray(data)) {
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

export async function consultarRecursosPinTenantAdminService({
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
            "admin_consultar_recursos_pin_tenant",
            {
                p_tenant_id:
                    tenantId,
            }
        );

    if (error) {
        throw new Error(
            error.message ||
            "Não foi possível consultar os recursos de PIN do cliente."
        );
    }

    const linha =
        primeiraLinha(
            data
        );

    if (!linha) {
        throw new Error(
            "Resposta inválida dos recursos de PIN."
        );
    }

    return {
        pinEmergenciaEmpresaAtivo:
            linha.pin_emergencia_empresa_ativo !==
            false,

        pinEmergenciaEmpresaConfigurado:
            Boolean(
                linha.pin_emergencia_empresa_configurado
            ),

        pinEmergenciaEmpresaAtualizadoEm:
            linha.pin_emergencia_empresa_atualizado_em ||
            null,

        pinAcessoUsuarioAtivo:
            linha.pin_acesso_usuario_ativo !==
            false,

        pinAcessoUsuarioConfigurado:
            Boolean(
                linha.pin_acesso_usuario_configurado
            ),

        pinAcessoUsuarioAtualizadoEm:
            linha.pin_acesso_usuario_atualizado_em ||
            null,
    };
}

export async function salvarRecursoPinTenantAdminService({
    supabase,
    tenantId,
    recursoChave,
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

    const recurso =
        String(
            recursoChave ||
            ""
        )
            .trim()
            .toLowerCase();

    if (
        !RECURSOS_PIN_PERMITIDOS.has(
            recurso
        )
    ) {
        throw new Error(
            "Recurso de PIN inválido."
        );
    }

    if (
        typeof ativo !==
        "boolean"
    ) {
        throw new Error(
            "Estado do recurso de PIN inválido."
        );
    }

    const {
        data,
        error,
    } =
        await supabase.rpc(
            "admin_salvar_recurso_pin_tenant",
            {
                p_tenant_id:
                    tenantId,

                p_recurso_chave:
                    recurso,

                p_ativo:
                    ativo,
            }
        );

    if (error) {
        throw new Error(
            error.message ||
            "Não foi possível atualizar o recurso de PIN."
        );
    }

    return (
        primeiraLinha(
            data
        ) ||
        null
    );
}
