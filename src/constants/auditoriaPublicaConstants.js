export const CHAVE_STORAGE_CONFIG_AUDITORIA_PUBLICA = "sstAuditoriaPublicaConfig";

export const SENHA_REFERENCIA_AUDITORIA_CAMPO_PUBLICA_PADRAO = "2026";
export const ROTA_AUDITORIA_CAMPO_PUBLICA = "/#/auditoria-campo";

export const CONFIG_AUDITORIA_PUBLICA_PADRAO = {
    tokenPublico: "",
    senhaReferencia: SENHA_REFERENCIA_AUDITORIA_CAMPO_PUBLICA_PADRAO,
    exigirSenha: true,
};

const textoSeguro = (valor, padrao = "") => {
    const texto = String(valor ?? "").trim();
    return texto || padrao;
};

const pareceTokenInicialDeDesenvolvimento = (valor = "") => {
    const token = String(valor || "").trim().toUpperCase();

    return token.startsWith("TOKEN-") && token.includes("AUDITORIA") && token.includes("CAMPO");
};

const normalizarTokenPublicoOperacional = (valor = "") => {
    const token = textoSeguro(valor);

    if (pareceTokenInicialDeDesenvolvimento(token)) {
        return "";
    }

    return token;
};

export function normalizarConfiguracaoAuditoriaPublica(configuracao = {}) {
    return {
        tokenPublico: normalizarTokenPublicoOperacional(configuracao.tokenPublico),
        senhaReferencia: textoSeguro(configuracao.senhaReferencia, SENHA_REFERENCIA_AUDITORIA_CAMPO_PUBLICA_PADRAO),
        exigirSenha: configuracao.exigirSenha !== false,
    };
}

export function carregarConfiguracaoAuditoriaPublicaSistema() {
    if (typeof window === "undefined") {
        return CONFIG_AUDITORIA_PUBLICA_PADRAO;
    }

    try {
        const salvo = JSON.parse(window.localStorage.getItem(CHAVE_STORAGE_CONFIG_AUDITORIA_PUBLICA) || "null");
        return normalizarConfiguracaoAuditoriaPublica(salvo || CONFIG_AUDITORIA_PUBLICA_PADRAO);
    } catch {
        return CONFIG_AUDITORIA_PUBLICA_PADRAO;
    }
}

export function salvarConfiguracaoAuditoriaPublicaSistema(configuracao = {}) {
    const normalizada = normalizarConfiguracaoAuditoriaPublica(configuracao);

    if (typeof window !== "undefined") {
        window.localStorage.setItem(CHAVE_STORAGE_CONFIG_AUDITORIA_PUBLICA, JSON.stringify(normalizada));
    }

    return normalizada;
}

export function restaurarConfiguracaoAuditoriaPublicaPadrao() {
    return salvarConfiguracaoAuditoriaPublicaSistema(CONFIG_AUDITORIA_PUBLICA_PADRAO);
}

export function montarLinkAuditoriaPublicaSistema({ origem = "", tokenPublico = "" } = {}) {
    const origemFinal = origem || (typeof window !== "undefined" ? window.location.origin : "");
    const tokenFinal = normalizarTokenPublicoOperacional(tokenPublico);
    const params = new URLSearchParams();

    if (tokenFinal) {
        params.set("token", tokenFinal);
    }

    const consulta = params.toString();
    return `${origemFinal}${ROTA_AUDITORIA_CAMPO_PUBLICA}${consulta ? `?${consulta}` : ""}`;
}
