export const SENHA_CONFIGURACOES_PADRAO = "2026";
export const CHAVE_SENHA_CONFIGURACOES_SISTEMA = "senhaConfiguracoesSistema";
export const TABELA_CONFIGURACOES_SISTEMA = "auditoria_sistema_configuracoes";
export const CHAVE_SUPABASE_SENHA_CONFIGURACOES = "senha_configuracoes_sistema";

export function normalizarSenhaConfiguracoesSistema(valor) {
    const senha = String(valor || "").trim();
    return senha || SENHA_CONFIGURACOES_PADRAO;
}

export function carregarSenhaConfiguracoesSistema() {
    if (typeof window === "undefined") return SENHA_CONFIGURACOES_PADRAO;

    try {
        return normalizarSenhaConfiguracoesSistema(window.localStorage.getItem(CHAVE_SENHA_CONFIGURACOES_SISTEMA));
    } catch {
        return SENHA_CONFIGURACOES_PADRAO;
    }
}

export function salvarSenhaConfiguracoesSistema(novaSenha) {
    const senha = normalizarSenhaConfiguracoesSistema(novaSenha);

    if (typeof window !== "undefined") {
        window.localStorage.setItem(CHAVE_SENHA_CONFIGURACOES_SISTEMA, senha);
    }

    return senha;
}

export function restaurarSenhaConfiguracoesSistema() {
    if (typeof window !== "undefined") {
        window.localStorage.removeItem(CHAVE_SENHA_CONFIGURACOES_SISTEMA);
    }

    return SENHA_CONFIGURACOES_PADRAO;
}

export function extrairSenhaConfiguracoesSupabase(valor) {
    if (!valor || typeof valor !== "object") return SENHA_CONFIGURACOES_PADRAO;

    return normalizarSenhaConfiguracoesSistema(
        valor.senha ||
        valor.senhaConfiguracoes ||
        valor.senha_configuracoes ||
        SENHA_CONFIGURACOES_PADRAO
    );
}

export async function carregarSenhaConfiguracoesSistemaSupabase(supabase) {
    const senhaLocal = carregarSenhaConfiguracoesSistema();

    if (!supabase) {
        return {
            senha: senhaLocal,
            origem: "local",
            mensagem: "Senha carregada localmente. Supabase indisponível.",
        };
    }

    const { data, error } = await supabase
        .from(TABELA_CONFIGURACOES_SISTEMA)
        .select("valor")
        .eq("chave", CHAVE_SUPABASE_SENHA_CONFIGURACOES)
        .maybeSingle();

    if (error) {
        return {
            senha: senhaLocal,
            origem: "local",
            erro: error.message,
            mensagem: "Não foi possível carregar a senha pelo Supabase. Mantida senha local.",
        };
    }

    const senha = extrairSenhaConfiguracoesSupabase(data?.valor);
    salvarSenhaConfiguracoesSistema(senha);

    return {
        senha,
        origem: data ? "supabase" : "local",
        mensagem: data
            ? "Senha das Configurações carregada do Supabase."
            : "Configuração de senha ainda não existe no Supabase. Mantido padrão/local.",
    };
}

export async function salvarSenhaConfiguracoesSistemaSupabase(supabase, novaSenha, usuario = null) {
    const senha = salvarSenhaConfiguracoesSistema(novaSenha);

    if (!supabase) {
        return {
            senha,
            origem: "local",
            mensagem: "Senha salva localmente. Supabase indisponível.",
        };
    }

    const payload = {
        chave: CHAVE_SUPABASE_SENHA_CONFIGURACOES,
        valor: {
            senha,
            atualizadoPorEmail: usuario?.email || null,
            atualizadoEm: new Date().toISOString(),
        },
        atualizado_por: usuario?.id || null,
    };

    const { error } = await supabase
        .from(TABELA_CONFIGURACOES_SISTEMA)
        .upsert(payload, { onConflict: "chave" });

    if (error) {
        return {
            senha,
            origem: "local",
            erro: error.message,
            mensagem: "Senha salva localmente, mas não foi sincronizada no Supabase.",
        };
    }

    return {
        senha,
        origem: "supabase",
        mensagem: "Senha das Configurações salva e sincronizada no Supabase.",
    };
}

export async function restaurarSenhaConfiguracoesSistemaSupabase(supabase, usuario = null) {
    return salvarSenhaConfiguracoesSistemaSupabase(supabase, SENHA_CONFIGURACOES_PADRAO, usuario);
}
