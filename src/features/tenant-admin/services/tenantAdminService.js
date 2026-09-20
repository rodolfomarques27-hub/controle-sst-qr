export async function verificarAdministradorGlobalService({
    supabase,
} = {}) {
    if (!supabase) {
        throw new Error(
            "Cliente Supabase não informado."
        );
    }

    const {
        data,
        error,
    } =
        await supabase.rpc(
            "usuario_admin_global"
        );

    if (error) {
        throw new Error(
            error.message ||
            "Não foi possível validar o administrador global."
        );
    }

    const resultado =
        Array.isArray(data)
            ? data[0]
            : data;

    return resultado === true;
}
export async function listarTenantsPlataformaService({
    supabase,
} = {}) {
    if (!supabase) {
        throw new Error(
            "Cliente Supabase não informado."
        );
    }

    const {
        data,
        error,
    } =
        await supabase.rpc(
            "admin_listar_tenants_plataforma"
        );

    if (error) {
        throw new Error(
            error.message ||
            "Não foi possível carregar os clientes da plataforma."
        );
    }

    if (!Array.isArray(data)) {
        return [];
    }

    return data;
}

export async function listarEmpresasTenantAdminService({
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
        await supabase
            .from("empresas")
            .select(
                "id,nome,cnpj,status,tipo_empresa,created_at"
            )
            .eq(
                "tenant_id",
                tenantId
            )
            .order(
                "nome",
                {
                    ascending:
                        true,
                }
            );

    if (error) {
        throw new Error(
            error.message ||
            "Não foi possível carregar as empresas do tenant."
        );
    }

    return Array.isArray(data)
        ? data
        : [];
}

export async function listarUsuariosTenantAdminService({
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
            "admin_listar_usuarios_tenant_sistema",
            {
                p_tenant_id:
                    tenantId,
            }
        );

    if (error) {
        throw new Error(
            error.message ||
            "Não foi possível carregar os usuários do tenant."
        );
    }

    return Array.isArray(data)
        ? data
        : [];
}

export async function listarModulosTenantAdminService({
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
            "admin_listar_modulos_tenant",
            {
                p_tenant_id:
                    tenantId,
            }
        );

    if (error) {
        throw new Error(
            error.message ||
            "Não foi possível carregar os módulos do tenant."
        );
    }

    return Array.isArray(data)
        ? data
        : [];
}

export async function salvarModuloTenantAdminService({
    supabase,
    tenantId,
    moduloChave,
    status,
    observacao = "",
    configuracao = {},
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

    const moduloNormalizado =
        String(
            moduloChave || ""
        ).trim();

    if (!moduloNormalizado) {
        throw new Error(
            "Módulo não informado."
        );
    }

    const statusNormalizado =
        String(
            status || ""
        )
            .trim()
            .toLowerCase();

    if (
        ![
            "ativo",
            "suspenso",
            "nao_contratado",
        ].includes(
            statusNormalizado
        )
    ) {
        throw new Error(
            "Status de módulo inválido."
        );
    }

    const configuracaoSegura =
        configuracao &&
        typeof configuracao === "object" &&
        !Array.isArray(
            configuracao
        )
            ? configuracao
            : {};

    const {
        data,
        error,
    } =
        await supabase.rpc(
            "admin_salvar_modulo_tenant",
            {
                p_tenant_id:
                    tenantId,
                p_modulo_chave:
                    moduloNormalizado,
                p_status:
                    statusNormalizado,
                p_observacao:
                    String(
                        observacao || ""
                    ).trim(),
                p_configuracao:
                    configuracaoSegura,
            }
        );

    if (error) {
        throw new Error(
            error.message ||
            "Não foi possível atualizar o módulo do tenant."
        );
    }

    return data ?? null;
}

export async function obterEscopoEmpresasMembershipAdminService({
    supabase,
    membershipId,
} = {}) {
    if (!supabase) {
        throw new Error(
            "Cliente Supabase não informado."
        );
    }

    if (!membershipId) {
        throw new Error(
            "Membership não informado."
        );
    }

    const {
        data,
        error,
    } =
        await supabase.rpc(
            "admin_obter_escopo_empresas_membership",
            {
                p_membership_id:
                    membershipId,
            }
        );

    if (error) {
        throw new Error(
            error.message ||
            "Não foi possível carregar o escopo empresarial."
        );
    }

    const resultado =
        Array.isArray(data)
            ? data[0]
            : data;

    if (
        !resultado ||
        typeof resultado !== "object"
    ) {
        throw new Error(
            "Resposta inválida do escopo empresarial."
        );
    }

    return resultado;
}

export async function salvarEscopoEmpresasMembershipAdminService({
    supabase,
    membershipId,
    escopoEmpresas,
    empresaIds = [],
} = {}) {
    if (!supabase) {
        throw new Error(
            "Cliente Supabase não informado."
        );
    }

    if (!membershipId) {
        throw new Error(
            "Membership não informado."
        );
    }

    const escopo =
        String(
            escopoEmpresas || ""
        )
            .trim()
            .toLowerCase();

    if (
        ![
            "todas",
            "selecionadas",
        ].includes(
            escopo
        )
    ) {
        throw new Error(
            "Escopo empresarial inválido."
        );
    }

    const ids =
        Array.isArray(
            empresaIds
        )
            ? [
                ...new Set(
                    empresaIds
                        .map(
                            (id) =>
                                String(
                                    id || ""
                                ).trim()
                        )
                        .filter(
                            Boolean
                        )
                ),
            ]
            : [];

    if (
        escopo ===
            "selecionadas" &&
        ids.length === 0
    ) {
        throw new Error(
            "Selecione ao menos uma empresa."
        );
    }

    const {
        data,
        error,
    } =
        await supabase.rpc(
            "admin_salvar_escopo_empresas_membership",
            {
                p_membership_id:
                    membershipId,
                p_escopo_empresas:
                    escopo,
                p_empresa_ids:
                    escopo ===
                    "selecionadas"
                        ? ids
                        : [],
            }
        );

    if (error) {
        throw new Error(
            error.message ||
            "Não foi possível salvar o escopo empresarial."
        );
    }

    return data ?? null;
}
