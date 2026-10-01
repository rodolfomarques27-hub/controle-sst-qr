import { supabase } from "../lib/supabaseClient";

export const RECURSOS_OPERACIONAIS_PLANO_BASE =
    Object.freeze([
        Object.freeze({
            chave: "obras",
            nome: "Obras",
            descricao:
                "Cadastro e gestão operacional de obras do tenant.",
        }),

        Object.freeze({
            chave: "aniversariantes",
            nome: "Aniversariantes",
            descricao:
                "Exibição e acompanhamento dos aniversariantes.",
        }),

        Object.freeze({
            chave: "treinamentos",
            nome: "Treinamentos",
            descricao:
                "Gestão operacional de treinamentos, certificados e validades.",
        }),

        Object.freeze({
            chave: "gestao_documental_sst",
            nome: "Gestão Documental SST",
            descricao:
                "Documentos SST, validades, pendências e acompanhamento documental.",
        }),
    ]);

const CHAVES_RECURSOS_OPERACIONAIS =
    new Set(
        RECURSOS_OPERACIONAIS_PLANO_BASE.map(
            (recurso) =>
                recurso.chave,
        ),
    );

function textoSeguro(valor = "") {
    return String(
        valor ?? "",
    ).trim();
}

function criarErroRecursoOperacional(
    erroOriginal,
    mensagem,
) {
    const erro =
        new Error(
            mensagem,
        );

    erro.name =
        "TenantOperationalResourceError";

    erro.codigo =
        textoSeguro(
            erroOriginal?.code,
        );

    erro.detalhes =
        textoSeguro(
            erroOriginal?.details ||
                erroOriginal?.message,
        );

    erro.cause =
        erroOriginal || null;

    return erro;
}

export function normalizarChaveRecursoOperacional(
    valor = "",
) {
    const chave =
        textoSeguro(
            valor,
        ).toLowerCase();

    return CHAVES_RECURSOS_OPERACIONAIS.has(
        chave,
    )
        ? chave
        : "";
}

const RECURSO_OPERACIONAL_POR_TELA =
    Object.freeze({
        obras:
            "obras",

        aniversariantes:
            "aniversariantes",

        treinamentos:
            "treinamentos",
    });

export function obterRecursoOperacionalPorTela(
    tela = "",
) {
    const telaNormalizada =
        textoSeguro(
            tela,
        );

    return (
        RECURSO_OPERACIONAL_POR_TELA[
            telaNormalizada
        ]
        ||
        ""
    );
}

export function telaTemMapeamentoRecursoOperacional(
    tela = "",
) {
    return Boolean(
        obterRecursoOperacionalPorTela(
            tela,
        ),
    );
}

export function recursoOperacionalDisponivelTenantRuntime(
    recursos = [],
    recursoChave = "",
) {
    const chave =
        normalizarChaveRecursoOperacional(
            recursoChave,
        );

    if (!chave) {
        return true;
    }

    const recurso =
        (
            Array.isArray(recursos)
                ? recursos
                : []
        ).find(
            (item) =>
                normalizarChaveRecursoOperacional(
                    item?.chave,
                ) === chave,
        );

    /*
     * Compatibilidade:
     * ausência de configuração explícita mantém o recurso ativo.
     */
    if (!recurso) {
        return true;
    }

    return recurso.ativo === true;
}

export function telaDisponivelRecursoOperacionalTenantRuntime(
    recursos = [],
    tela = "",
) {
    const recursoChave =
        obterRecursoOperacionalPorTela(
            tela,
        );

    if (!recursoChave) {
        return true;
    }

    return recursoOperacionalDisponivelTenantRuntime(
        recursos,
        recursoChave,
    );
}
function validarTenant(
    tenantId,
) {
    const tenantIdNormalizado =
        textoSeguro(
            tenantId,
        );

    if (!tenantIdNormalizado) {
        throw criarErroRecursoOperacional(
            null,
            "Tenant não informado para consultar recursos operacionais.",
        );
    }

    return tenantIdNormalizado;
}

function validarClienteSupabase(
    supabaseClient,
) {
    if (!supabaseClient) {
        throw criarErroRecursoOperacional(
            null,
            "Cliente Supabase não disponível.",
        );
    }

    return supabaseClient;
}

function normalizarRegistro(
    registro = null,
) {
    const chave =
        normalizarChaveRecursoOperacional(
            registro?.recurso_chave,
        );

    if (!chave) {
        return null;
    }

    return {
        chave,
        ativo:
            registro?.ativo === true,
        configurado:
            true,
        atualizadoEm:
            registro?.updated_at ||
            null,
    };
}

export async function listarRecursosOperacionaisTenant({
    tenantId,
    supabaseClient = supabase,
} = {}) {
    const tenantIdNormalizado =
        validarTenant(
            tenantId,
        );

    const cliente =
        validarClienteSupabase(
            supabaseClient,
        );

    const {
        data,
        error,
    } =
        await cliente
            .from(
                "tenant_recursos_operacionais",
            )
            .select(
                "recurso_chave,ativo,updated_at",
            )
            .eq(
                "tenant_id",
                tenantIdNormalizado,
            );

    if (error) {
        throw criarErroRecursoOperacional(
            error,
            "Não foi possível carregar os recursos operacionais do Plano Base.",
        );
    }

    const registrosPorChave =
        new Map(
            (
                Array.isArray(data)
                    ? data
                    : []
            )
                .map(
                    normalizarRegistro,
                )
                .filter(Boolean)
                .map(
                    (registro) => [
                        registro.chave,
                        registro,
                    ],
                ),
        );

    return RECURSOS_OPERACIONAIS_PLANO_BASE.map(
        (recurso) => {
            const registro =
                registrosPorChave.get(
                    recurso.chave,
                );

            return {
                ...recurso,
                ativo:
                    registro
                        ? registro.ativo
                        : true,
                configurado:
                    registro
                        ? true
                        : false,
                atualizadoEm:
                    registro?.atualizadoEm ||
                    null,
            };
        },
    );
}

export async function salvarRecursoOperacionalTenant({
    tenantId,
    recursoChave,
    ativo,
    supabaseClient = supabase,
} = {}) {
    const tenantIdNormalizado =
        validarTenant(
            tenantId,
        );

    const cliente =
        validarClienteSupabase(
            supabaseClient,
        );

    const chave =
        normalizarChaveRecursoOperacional(
            recursoChave,
        );

    if (!chave) {
        throw criarErroRecursoOperacional(
            null,
            "Recurso operacional inválido.",
        );
    }

    if (typeof ativo !== "boolean") {
        throw criarErroRecursoOperacional(
            null,
            "Estado do recurso operacional não informado.",
        );
    }

    const {
        data,
        error,
    } =
        await cliente.rpc(
            "salvar_recurso_operacional_tenant",
            {
                p_tenant_id:
                    tenantIdNormalizado,

                p_recurso_chave:
                    chave,

                p_ativo:
                    ativo,
            },
        );

    if (error) {
        throw criarErroRecursoOperacional(
            error,
            "Não foi possível salvar o recurso operacional do Plano Base.",
        );
    }

    const registro =
        normalizarRegistro(
            Array.isArray(data)
                ? data[0]
                : data,
        );

    if (!registro) {
        throw criarErroRecursoOperacional(
            null,
            "O recurso foi salvo, mas a resposta do servidor não pôde ser validada.",
        );
    }

    return registro;
}