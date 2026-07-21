const TABELA_FUNCOES_TREINAMENTOS =
    "funcoes_treinamentos";

function normalizarTextoComparacao(valor = "") {
    return String(valor ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function normalizarChaveFuncao(valor = "") {
    return String(valor ?? "")
        .trim()
        .toLowerCase();
}

function normalizarListaTexto(lista = []) {
    return Array.from(
        new Set(
            (Array.isArray(lista) ? lista : [])
                .map((item) =>
                    String(item ?? "").trim()
                )
                .filter(Boolean)
        )
    );
}

function normalizarListaTreinamentos(lista = []) {
    return Array.from(
        new Set(
            (Array.isArray(lista) ? lista : [])
                .map(Number)
                .filter(
                    (id) =>
                        Number.isFinite(id) &&
                        id > 0
                )
        )
    );
}

function criarChaveLegadaFuncao(funcao = {}) {
    const rotuloNormalizado =
        normalizarTextoComparacao(
            funcao?.rotulo ||
            funcao?.nome ||
            ""
        )
            .replace(/\s+/g, "-")
            .replace(/^-+|-+$/g, "");

    return rotuloNormalizado
        ? `custom-legado-${rotuloNormalizado}`
        : "";
}

export function normalizarRegistroFuncaoTreinamentos(
    registro = {}
) {
    const rotulo =
        String(
            registro?.rotulo ||
            registro?.nome ||
            ""
        ).trim();

    const chave =
        normalizarChaveFuncao(
            registro?.chave
        ) ||
        criarChaveLegadaFuncao(
            registro
        );

    const tipoInformado =
        String(
            registro?.tipo ||
            ""
        ).trim();

    const tipo =
        tipoInformado === "ajuste_fixa"
            ? "ajuste_fixa"
            : "personalizada";

    return {
        chave,
        rotulo,
        termos:
            normalizarListaTexto(
                registro?.termos
            ),
        treinamentos:
            normalizarListaTreinamentos(
                registro?.treinamentos
            ),
        tipo,
        ativa:
            registro?.ativa !== false,
        criadoEm:
            registro?.criado_em ||
            registro?.criadoEm ||
            "",
        atualizadoEm:
            registro?.atualizado_em ||
            registro?.atualizadoEm ||
            "",
    };
}

function registroFuncaoValido(registro = {}) {
    return Boolean(
        registro?.chave &&
        registro?.rotulo
    );
}

function erroIndicaTabelaFuncoesAusente(error = null) {
    const codigo =
        String(
            error?.code ||
            ""
        )
            .trim()
            .toUpperCase();

    const mensagem =
        String(
            error?.message ||
            error ||
            ""
        )
            .trim()
            .toLowerCase();

    return (
        codigo === "42P01" ||
        codigo === "PGRST205" ||
        mensagem.includes(
            "funcoes_treinamentos"
        ) && (
            mensagem.includes(
                "does not exist"
            ) ||
            mensagem.includes(
                "não existe"
            ) ||
            mensagem.includes(
                "could not find the table"
            ) ||
            mensagem.includes(
                "schema cache"
            )
        )
    );
}

function mesclarMatrizFixaComAjuste(
    matrizBase = {},
    ajuste = null
) {
    if (!ajuste) {
        return {
            ...matrizBase,
        };
    }

    return {
        ...matrizBase,
        rotulo:
            ajuste.rotulo ||
            matrizBase.rotulo,
        termos:
            ajuste.termos.length > 0
                ? ajuste.termos
                : matrizBase.termos,
        treinamentos:
            ajuste.treinamentos.length > 0
                ? ajuste.treinamentos
                : matrizBase.treinamentos,
        ajusteRemoto: true,
    };
}

export function mesclarMatrizesFuncaoRemotas({
    matrizesBase = [],
    funcoesRemotas = [],
    funcoesLocais = [],
} = {}) {
    const bases =
        Array.isArray(matrizesBase)
            ? matrizesBase.filter(Boolean)
            : [];

    const remotas =
        (Array.isArray(funcoesRemotas)
            ? funcoesRemotas
            : [])
            .map(
                normalizarRegistroFuncaoTreinamentos
            )
            .filter(
                (item) =>
                    item.ativa &&
                    registroFuncaoValido(item)
            );

    const locais =
        (Array.isArray(funcoesLocais)
            ? funcoesLocais
            : [])
            .map((item) =>
                normalizarRegistroFuncaoTreinamentos({
                    ...item,
                    tipo: "personalizada",
                })
            )
            .filter(
                (item) =>
                    item.ativa &&
                    registroFuncaoValido(item)
            );

    const matrizGeral =
        bases.find(
            (item) =>
                item?.chave === "geral"
        ) ||
        null;

    const matrizesFixas =
        bases.filter(
            (item) =>
                item?.chave !== "geral"
        );

    const chavesFixas =
        new Set(
            matrizesFixas.map(
                (item) =>
                    normalizarChaveFuncao(
                        item?.chave
                    )
            )
        );

    const ajustesFixos =
        new Map(
            remotas
                .filter(
                    (item) =>
                        item.tipo === "ajuste_fixa"
                )
                .map(
                    (item) => [
                        normalizarChaveFuncao(
                            item.chave
                        ),
                        item,
                    ]
                )
        );

    const fixasAjustadas =
        matrizesFixas.map(
            (matriz) =>
                mesclarMatrizFixaComAjuste(
                    matriz,
                    ajustesFixos.get(
                        normalizarChaveFuncao(
                            matriz?.chave
                        )
                    ) ||
                    null
                )
        );

    const personalizadasRemotas =
        remotas.filter(
            (item) =>
                item.tipo === "personalizada" &&
                !chavesFixas.has(
                    normalizarChaveFuncao(
                        item.chave
                    )
                )
        );

    const chavesPersonalizadasRemotas =
        new Set(
            personalizadasRemotas.map(
                (item) =>
                    normalizarChaveFuncao(
                        item.chave
                    )
            )
        );

    const rotulosPersonalizadosRemotos =
        new Set(
            personalizadasRemotas.map(
                (item) =>
                    normalizarTextoComparacao(
                        item.rotulo
                    )
            )
        );

    const personalizadasLocaisValidas =
        locais.filter((item) => {
            const chave =
                normalizarChaveFuncao(
                    item.chave
                );

            const rotulo =
                normalizarTextoComparacao(
                    item.rotulo
                );

            return (
                !chavesFixas.has(chave) &&
                !chavesPersonalizadasRemotas.has(
                    chave
                ) &&
                !rotulosPersonalizadosRemotos.has(
                    rotulo
                )
            );
        });

    const personalizadas =
        [
            ...personalizadasRemotas,
            ...personalizadasLocaisValidas,
        ].sort((a, b) =>
            String(a.rotulo).localeCompare(
                String(b.rotulo),
                "pt-BR",
                {
                    sensitivity: "base",
                }
            )
        );

    return [
        ...fixasAjustadas,
        ...personalizadas,
        ...(matrizGeral
            ? [matrizGeral]
            : []),
    ];
}

async function obterClienteSupabaseFuncoes({
    supabase = null,
    permitirIndisponivel = false,
} = {}) {
    if (supabase?.from) {
        return {
            cliente: supabase,
            disponivel: true,
            motivo: "",
        };
    }

    try {
        const moduloSupabase =
            await import(
                "../lib/supabaseClient.js"
            );

        if (
            !moduloSupabase.SUPABASE_CONFIGURADO ||
            !moduloSupabase.supabase?.from
        ) {
            if (permitirIndisponivel) {
                return {
                    cliente: null,
                    disponivel: false,
                    motivo:
                        "Supabase não configurado neste ambiente.",
                };
            }

            throw new Error(
                "Supabase não configurado neste ambiente."
            );
        }

        return {
            cliente:
                moduloSupabase.supabase,
            disponivel: true,
            motivo: "",
        };
    } catch (error) {
        if (permitirIndisponivel) {
            return {
                cliente: null,
                disponivel: false,
                motivo:
                    error?.message ||
                    "Cliente Supabase indisponível.",
            };
        }

        throw error;
    }
}

export async function carregarFuncoesTreinamentosRemotas({
    supabase = null,
} = {}) {
    const resultadoCliente =
        await obterClienteSupabaseFuncoes({
            supabase,
            permitirIndisponivel: true,
        });

    if (
        !resultadoCliente.disponivel ||
        !resultadoCliente.cliente
    ) {
        return {
            disponivel: false,
            funcoes: [],
            motivo:
                resultadoCliente.motivo ||
                "Cliente Supabase indisponível.",
        };
    }

    const cliente =
        resultadoCliente.cliente;

    const { data, error } =
        await cliente
            .from(
                TABELA_FUNCOES_TREINAMENTOS
            )
            .select(`
                chave,
                rotulo,
                termos,
                treinamentos,
                tipo,
                ativa,
                criado_em,
                atualizado_em
            `)
            .eq(
                "ativa",
                true
            )
            .order(
                "rotulo",
                {
                    ascending: true,
                }
            );

    if (error) {
        if (
            erroIndicaTabelaFuncoesAusente(
                error
            )
        ) {
            return {
                disponivel: false,
                funcoes: [],
                motivo:
                    "Tabela remota ainda não aplicada.",
            };
        }

        throw new Error(
            error.message ||
            "Erro ao carregar funções e matrizes remotas."
        );
    }

    return {
        disponivel: true,
        funcoes:
            (Array.isArray(data)
                ? data
                : [])
                .map(
                    normalizarRegistroFuncaoTreinamentos
                )
                .filter(
                    registroFuncaoValido
                ),
        motivo: "",
    };
}

function criarMensagemTabelaNaoAplicada() {
    return (
        "A estrutura remota de funções ainda não foi aplicada no Supabase. " +
        "Execute a migration 20260721101500_funcoes_treinamentos_persistencia_remota.sql."
    );
}

export async function salvarFuncaoTreinamentosRemota({
    supabase = null,
    funcao = {},
} = {}) {
    const resultadoCliente =
        await obterClienteSupabaseFuncoes({
            supabase,
        });

    const cliente =
        resultadoCliente.cliente;

    const registro =
        normalizarRegistroFuncaoTreinamentos(
            funcao
        );

    if (
        !registroFuncaoValido(
            registro
        )
    ) {
        throw new Error(
            "Informe uma função válida para salvar."
        );
    }

    if (
        registro.tipo === "personalizada" &&
        !registro.chave.startsWith(
            "custom-"
        )
    ) {
        throw new Error(
            "Funções personalizadas devem utilizar uma chave iniciada por custom-."
        );
    }

    if (
        registro.tipo === "ajuste_fixa" &&
        registro.chave.startsWith(
            "custom-"
        )
    ) {
        throw new Error(
            "Ajustes de funções fixas não podem utilizar chave personalizada."
        );
    }

    if (
        registro.termos.length === 0
    ) {
        throw new Error(
            "Informe pelo menos uma palavra-chave para a função."
        );
    }

    if (
        registro.treinamentos.length === 0
    ) {
        throw new Error(
            "Selecione pelo menos um treinamento ou documento obrigatório."
        );
    }

    const payload = {
        chave:
            registro.chave,
        rotulo:
            registro.rotulo,
        termos:
            registro.termos,
        treinamentos:
            registro.treinamentos,
        tipo:
            registro.tipo,
        ativa:
            registro.ativa,
    };

    const { data, error } =
        await cliente
            .from(
                TABELA_FUNCOES_TREINAMENTOS
            )
            .upsert(
                payload,
                {
                    onConflict: "chave",
                }
            )
            .select(`
                chave,
                rotulo,
                termos,
                treinamentos,
                tipo,
                ativa,
                criado_em,
                atualizado_em
            `)
            .single();

    if (error) {
        if (
            erroIndicaTabelaFuncoesAusente(
                error
            )
        ) {
            throw new Error(
                criarMensagemTabelaNaoAplicada()
            );
        }

        throw new Error(
            error.message ||
            "Erro ao salvar a função e sua matriz de treinamentos."
        );
    }

    return normalizarRegistroFuncaoTreinamentos(
        data
    );
}

export async function excluirFuncaoTreinamentosRemota({
    supabase = null,
    chave = "",
} = {}) {
    const resultadoCliente =
        await obterClienteSupabaseFuncoes({
            supabase,
        });

    const cliente =
        resultadoCliente.cliente;

    const chaveNormalizada =
        normalizarChaveFuncao(
            chave
        );

    if (!chaveNormalizada) {
        throw new Error(
            "Informe a função que será removida."
        );
    }

    const { error } =
        await cliente
            .from(
                TABELA_FUNCOES_TREINAMENTOS
            )
            .delete()
            .eq(
                "chave",
                chaveNormalizada
            );

    if (error) {
        if (
            erroIndicaTabelaFuncoesAusente(
                error
            )
        ) {
            throw new Error(
                criarMensagemTabelaNaoAplicada()
            );
        }

        throw new Error(
            error.message ||
            "Erro ao excluir ou restaurar a função."
        );
    }

    return true;
}

export const TABELA_FUNCOES_TREINAMENTOS_SISTEMA =
    TABELA_FUNCOES_TREINAMENTOS;
