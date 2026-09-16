export async function carregarAcessoTenantAtualService({
    supabase,
    tenantId,
    userId,
}) {
    if (!supabase) {
        throw new Error(
            "Cliente Supabase não informado para validar acesso ao tenant."
        );
    }

    const tenantIdNormalizado =
        String(tenantId || "").trim();

    const userIdNormalizado =
        String(userId || "").trim();

    if (!tenantIdNormalizado) {
        throw new Error(
            "Tenant não informado para validar acesso."
        );
    }

    if (!userIdNormalizado) {
        throw new Error(
            "Usuário não informado para validar acesso ao tenant."
        );
    }

    const {
        data: acessoPermitido,
        error: erroAcesso,
    } = await supabase.rpc(
        "usuario_tem_acesso_tenant",
        {
            p_tenant_id:
                tenantIdNormalizado,
        }
    );

    if (erroAcesso) {
        throw new Error(
            erroAcesso.message
            || "Não foi possível validar o acesso ao tenant."
        );
    }

    if (acessoPermitido !== true) {
        return {
            autorizado:
                false,

            membership:
                null,
        };
    }

    const {
        data: membership,
        error: erroMembership,
    } = await supabase
        .from("tenant_memberships")
        .select(
            [
                "id",
                "tenant_id",
                "user_id",
                "papel",
                "status",
                "permissoes",
                "created_at",
                "updated_at",
            ].join(",")
        )
        .eq(
            "tenant_id",
            tenantIdNormalizado
        )
        .eq(
            "user_id",
            userIdNormalizado
        )
        .maybeSingle();

    if (erroMembership) {
        throw new Error(
            erroMembership.message
            || "Não foi possível carregar a membership do usuário."
        );
    }

    return {
        autorizado:
            true,

        membership:
            membership
            ?? null,
    };
}
