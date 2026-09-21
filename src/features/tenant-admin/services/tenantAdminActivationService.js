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

    const tenant =
        validarTenantId(
            tenantId
        );

    const {
        data,
        error,
    } =
        await supabase.functions.invoke(
            FUNCTION_NAME,
            {
                body:
                    {
                        tenantId:
                            tenant,

                        modo,
                    },
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