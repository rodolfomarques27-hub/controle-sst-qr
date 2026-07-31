import { obterOrigemPublicaSistema } from "../utils/urlPublicaUtils.js";

export const CHAVE_STORAGE_CONFIG_AUDITORIA_PUBLICA = "sstAuditoriaPublicaConfig";

export const SENHA_REFERENCIA_AUDITORIA_CAMPO_PUBLICA_PADRAO = "2026";
export const ROTA_AUDITORIA_CAMPO_PUBLICA = "/#/auditoria-campo";

export const CONFIG_AUDITORIA_PUBLICA_PADRAO = {
    tokenPublico: "",
    senhaReferencia: SENHA_REFERENCIA_AUDITORIA_CAMPO_PUBLICA_PADRAO,
    exigirSenha: true,
};

export const PARAMETROS_TOKEN_AUDITORIA_PUBLICA = [
    "token",
    "chave",
    "token_publico",
    "tokenPublico",
    "auditoria_token",
    "auditoriaToken",
];

const textoSeguro = (valor, padrao = "") => {
    const texto = String(valor ?? "").trim();
    return texto || padrao;
};

const pareceTokenInicialDeDesenvolvimento = (valor = "") => {
    const token = String(valor || "").trim().toUpperCase();

    return token.startsWith("TOKEN-") && token.includes("AUDITORIA") && token.includes("CAMPO");
};

export const normalizarTokenPublicoOperacional = (valor = "") => {
    const token = textoSeguro(valor);

    if (pareceTokenInicialDeDesenvolvimento(token)) {
        return "";
    }

    return token;
};

function montarSearchParamsSeguro(texto = "") {
    const valor = String(texto || "").trim();
    if (!valor) return null;

    try {
        const normalizado = valor.startsWith("?") ? valor.slice(1) : valor.replace(/^#/, "");
        return new URLSearchParams(normalizado);
    } catch {
        return null;
    }
}

export function obterParametroUrlAuditoriaPublica(nome, { aceitarHash = true } = {}) {
    if (typeof window === "undefined" || !nome) return "";

    const tentativas = [];

    try {
        const url = new URL(window.location.href);
        tentativas.push(url.searchParams);
    } catch {
        // Mantém fallbacks abaixo.
    }

    const searchAtual = montarSearchParamsSeguro(window.location.search);
    if (searchAtual) tentativas.push(searchAtual);

    if (aceitarHash) {
        const hashAtual = String(window.location.hash || "");

        if (hashAtual) {
            const hashSemSinal = hashAtual.replace(/^#/, "");
            const indiceInterrogacao = hashSemSinal.indexOf("?");

            if (indiceInterrogacao >= 0) {
                const paramsHash = montarSearchParamsSeguro(hashSemSinal.slice(indiceInterrogacao + 1));
                if (paramsHash) tentativas.push(paramsHash);
            }

            if (hashSemSinal.includes("=") && indiceInterrogacao < 0) {
                const paramsHashDireto = montarSearchParamsSeguro(hashSemSinal);
                if (paramsHashDireto) tentativas.push(paramsHashDireto);
            }
        }
    }

    for (const params of tentativas) {
        const encontrado = normalizarTokenPublicoOperacional(params.get(nome));
        if (encontrado) return encontrado;
    }

    return "";
}

export function obterTokenAuditoriaPublicaUrl({ aceitarQr = false } = {}) {
    const parametros = aceitarQr
        ? [...PARAMETROS_TOKEN_AUDITORIA_PUBLICA, "qr"]
        : PARAMETROS_TOKEN_AUDITORIA_PUBLICA;

    for (const nome of parametros) {
        const token = obterParametroUrlAuditoriaPublica(nome);
        if (token) return token;
    }

    return "";
}

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
        const normalizado = normalizarConfiguracaoAuditoriaPublica(salvo || CONFIG_AUDITORIA_PUBLICA_PADRAO);

        // O token operacional não é mais fonte oficial no navegador.
        // Ele deve ser carregado do Supabase para evitar token fixo/local obsoleto.
        return {
            ...normalizado,
            tokenPublico: "",
        };
    } catch {
        return CONFIG_AUDITORIA_PUBLICA_PADRAO;
    }
}

export function salvarConfiguracaoAuditoriaPublicaSistema(configuracao = {}) {
    const normalizada = normalizarConfiguracaoAuditoriaPublica(configuracao);
    const persistida = {
        ...normalizada,
        tokenPublico: "",
    };

    if (typeof window !== "undefined") {
        window.localStorage.setItem(CHAVE_STORAGE_CONFIG_AUDITORIA_PUBLICA, JSON.stringify(persistida));
    }

    return persistida;
}

export function limparConfiguracaoAuditoriaPublicaLocal() {
    if (typeof window !== "undefined") {
        window.localStorage.removeItem(CHAVE_STORAGE_CONFIG_AUDITORIA_PUBLICA);
    }

    return CONFIG_AUDITORIA_PUBLICA_PADRAO;
}

export function restaurarConfiguracaoAuditoriaPublicaPadrao() {
    limparConfiguracaoAuditoriaPublicaLocal();
    return CONFIG_AUDITORIA_PUBLICA_PADRAO;
}

export function montarUrlConsultaQrColaboradorPublica({
    origem = "",
    tokenQrColaborador = "",
    tokenAuditoriaPublica = "",
} = {}) {
    const origemFinal = obterOrigemPublicaSistema(origem);
    const tokenQrFinal = textoSeguro(tokenQrColaborador);
    const tokenAuditoriaFinal = normalizarTokenPublicoOperacional(tokenAuditoriaPublica);
    const params = new URLSearchParams();

    if (tokenQrFinal) {
        params.set("qr", tokenQrFinal);
    }

    if (tokenAuditoriaFinal) {
        params.set("token", tokenAuditoriaFinal);
    }

    const consulta = params.toString();
    return `${origemFinal}/${consulta ? `?${consulta}` : ""}`;
}

export function montarLinkAuditoriaPublicaSistema({ origem = "", tokenPublico = "" } = {}) {
    const origemFinal = obterOrigemPublicaSistema(origem);
    const tokenFinal = normalizarTokenPublicoOperacional(tokenPublico);
    const params = new URLSearchParams();

    if (tokenFinal) {
        params.set("token", tokenFinal);
    }

    const consulta = params.toString();
    return `${origemFinal}${ROTA_AUDITORIA_CAMPO_PUBLICA}${consulta ? `?${consulta}` : ""}`;
}
