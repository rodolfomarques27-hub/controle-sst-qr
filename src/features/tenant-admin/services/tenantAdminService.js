export async function verificarIdentidadeContaMestreService({
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
            "usuario_conta_mestre_identidade"
        );

    if (error) {
        throw new Error(
            error.message ||
            "Não foi possível validar a identidade da Conta Mestre."
        );
    }

    const resultado =
        Array.isArray(data)
            ? data[0]
            : data;

    return resultado === true;
}
export async function obterStatusRotacaoSenhaContaMestreService({
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
            "admin_status_rotacao_senha_conta_mestre"
        );

    if (error) {
        throw new Error(
            error.message ||
            "Não foi possível validar o estado de segurança da Conta Mestre."
        );
    }

    const resultado =
        Array.isArray(data)
            ? data[0]
            : data;

    if (
        !resultado ||
        typeof resultado !==
            "object"
    ) {
        return {
            obrigatoria:
                false,
            motivo:
                null,
            emailReferencia:
                null,
            marcadaEm:
                null,
            senhaRotacionadaEm:
                null,
            concluidaEm:
                null,
        };
    }

    return {
        obrigatoria:
            resultado.rotacao_senha_obrigatoria ===
            true,
        motivo:
            String(
                resultado.motivo_rotacao ||
                ""
            ).trim() ||
            null,
        emailReferencia:
            String(
                resultado.email_referencia ||
                ""
            ).trim() ||
            null,
        marcadaEm:
            resultado.marcada_em ||
            null,
        senhaRotacionadaEm:
            resultado.senha_rotacionada_em ||
            null,
        concluidaEm:
            resultado.concluida_em ||
            null,
    };
}

export async function concluirRotacaoSenhaContaMestreService({
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
            "admin_concluir_rotacao_senha_conta_mestre"
        );

    if (error) {
        throw new Error(
            error.message ||
            "Não foi possível concluir a atualização de segurança da Conta Mestre."
        );
    }

    const resultado =
        Array.isArray(data)
            ? data[0]
            : data;

    if (resultado !== true) {
        throw new Error(
            "A atualização de segurança da Conta Mestre não foi concluída."
        );
    }

    return true;
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

const SLUGS_TENANT_RESERVADOS =
    new Set([
        "www",
        "app",
        "admin",
        "api",
        "qr",
        "status",
        "assets",
        "static",
        "auth",
    ]);

export function montarProvisionamentoTenantRascunhoPayload({
    nomeTenant,
    slug,
    empresaNome,
    empresaTipo = "Contratante",
} = {}) {
    const nomeTenantNormalizado =
        String(
            nomeTenant || ""
        ).trim();

    const slugNormalizado =
        String(
            slug || ""
        )
            .trim()
            .toLowerCase();

    const empresaNomeNormalizado =
        String(
            empresaNome || ""
        ).trim();

    const tiposPermitidos =
        {
            contratante:
                "Contratante",
            terceirizada:
                "Terceirizada",
            subcontratada:
                "Subcontratada",
        };

    const empresaTipoNormalizado =
        tiposPermitidos[
            String(
                empresaTipo || ""
            )
                .trim()
                .toLowerCase()
        ];

    if (
        nomeTenantNormalizado.length <
            2 ||
        nomeTenantNormalizado.length >
            160
    ) {
        throw new Error(
            "Nome do cliente deve possuir entre 2 e 160 caracteres."
        );
    }

    if (
        slugNormalizado.length <
            2 ||
        slugNormalizado.length >
            63 ||
        !/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(
            slugNormalizado
        )
    ) {
        throw new Error(
            "Slug inválido. Use letras minúsculas, números e hífens."
        );
    }

    if (
        SLUGS_TENANT_RESERVADOS.has(
            slugNormalizado
        )
    ) {
        throw new Error(
            "Este slug é reservado pela plataforma SafeScan."
        );
    }

    if (
        empresaNomeNormalizado.length <
            2 ||
        empresaNomeNormalizado.length >
            160
    ) {
        throw new Error(
            "Nome da empresa inicial deve possuir entre 2 e 160 caracteres."
        );
    }

    if (!empresaTipoNormalizado) {
        throw new Error(
            "Tipo da empresa inicial inválido."
        );
    }

    const hostname =
        slugNormalizado +
        ".safescanbrasil.com.br";

    return {
        p_nome_tenant:
            nomeTenantNormalizado,
        p_slug:
            slugNormalizado,
        p_empresa_nome:
            empresaNomeNormalizado,
        p_hostname:
            hostname,
        p_empresa_tipo:
            empresaTipoNormalizado,
    };
}

export async function provisionarTenantRascunhoService({
    supabase,
    nomeTenant,
    slug,
    empresaNome,
    empresaTipo = "Contratante",
} = {}) {
    if (!supabase) {
        throw new Error(
            "Cliente Supabase não informado."
        );
    }

    const payload =
        montarProvisionamentoTenantRascunhoPayload({
            nomeTenant,
            slug,
            empresaNome,
            empresaTipo,
        });

    const {
        data,
        error,
    } =
        await supabase.rpc(
            "admin_provisionar_tenant_rascunho",
            payload
        );

    if (error) {
        throw new Error(
            error.message ||
            "Não foi possível provisionar o novo cliente."
        );
    }

    return data ?? null;
}