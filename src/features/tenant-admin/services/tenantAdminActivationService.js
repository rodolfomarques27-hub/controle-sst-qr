const FUNCTION_NAME =
    "admin-ativar-tenant-orquestrado";

function texto(
    valor
) {
    return String(
        valor ?? ""
    ).trim();
}

function validarTenantId(
    tenantId
) {
    const valor =
        texto(
            tenantId
        );

    if (
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            valor
        )
    ) {
        throw new Error(
            "Tenant inválido para ativação."
        );
    }

    return valor;
}

async function extrairErroFunction(
    error
) {
    const contexto =
        error?.context;

    if (
        contexto &&
        typeof contexto.clone ===
            "function"
    ) {
        try {
            const payload =
                await contexto
                    .clone()
                    .json();

            const mensagem =
                texto(
                    payload?.erro ||
                    payload?.message
                );

            if (mensagem) {
                return mensagem;
            }
        }
        catch {
            // Usar fallback abaixo.
        }
    }

    return (
        error?.message ||
        "Falha ao executar o orquestrador de ativação."
    );
}

async function executarFunction({
    supabase,
    tenantId,
    modo,
}) {
    if (!supabase) {
        throw new Error(
            "Cliente Supabase não informado."
        );
    }

    const modoNormalizado =
        texto(
            modo
        ).toLowerCase();

    const requerTenant =
        modoNormalizado !==
            "infraestrutura";

    const tenant =
        requerTenant
            ? validarTenantId(
                tenantId
            )
            : "";

    const body =
        requerTenant
            ? {
                tenantId:
                    tenant,

                modo:
                    modoNormalizado,
            }
            : {
                modo:
                    modoNormalizado,
            };

    const {
        data,
        error,
    } =
        await supabase.functions.invoke(
            FUNCTION_NAME,
            {
                body,
            }
        );

    if (error) {
        throw new Error(
            await extrairErroFunction(
                error
            )
        );
    }

    if (
        !data ||
        typeof data !==
            "object"
    ) {
        throw new Error(
            "O orquestrador retornou uma resposta inválida."
        );
    }

    return data;
}

export async function diagnosticarAtivacaoTenantService({
    supabase,
    tenantId,
} = {}) {
    return executarFunction({
        supabase,
        tenantId,
        modo:
            "diagnostico",
    });
}

export async function diagnosticarInfraestruturaGlobalServerService({
    supabase,
} = {}) {
    const data =
        await executarFunction({
            supabase,
            modo:
                "infraestrutura",
        });

    if (
        data?.modo !==
            "infraestrutura" ||
        !data?.worker ||
        !data?.dns ||
        !data?.https
    ) {
        throw new Error(
            "O diagnóstico global server-side retornou uma resposta incompleta."
        );
    }

    return data;
}

export async function ativarTenantOrquestradoService({
    supabase,
    tenantId,
} = {}) {
    return executarFunction({
        supabase,
        tenantId,
        modo:
            "ativar",
    });
}

export async function obterLiberacaoAtivacaoTenantService({
    supabase,
    tenantId,
} = {}) {
    if (!supabase) {
        throw new Error(
            "Cliente Supabase não informado."
        );
    }

    const tenant =
        validarTenantId(
            tenantId
        );

    const {
        data,
        error,
    } =
        await supabase.rpc(
            "admin_obter_liberacao_ativacao_tenant",
            {
                p_tenant_id:
                    tenant,
            }
        );

    if (error) {
        throw new Error(
            error.message ||
            "Não foi possível consultar a liberação piloto do tenant."
        );
    }

    return (
        data ||
        {
            tenantId:
                tenant,
            habilitada:
                false,
        }
    );
}

export async function definirLiberacaoAtivacaoTenantService({
    supabase,
    tenantId,
    habilitada,
} = {}) {
    if (!supabase) {
        throw new Error(
            "Cliente Supabase não informado."
        );
    }

    if (
        typeof habilitada !==
        "boolean"
    ) {
        throw new Error(
            "Estado da liberação piloto inválido."
        );
    }

    const tenant =
        validarTenantId(
            tenantId
        );

    const {
        data,
        error,
    } =
        await supabase.rpc(
            "admin_definir_liberacao_ativacao_tenant",
            {
                p_tenant_id:
                    tenant,

                p_habilitada:
                    habilitada,
            }
        );

    if (error) {
        throw new Error(
            error.message ||
            "Não foi possível alterar a liberação piloto do tenant."
        );
    }

    return data ?? null;
}
