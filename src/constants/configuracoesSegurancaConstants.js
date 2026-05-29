export const SENHA_CONFIGURACOES_PADRAO = "2026";
export const CHAVE_SENHA_CONFIGURACOES_SISTEMA = "senhaConfiguracoesSistema";

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
