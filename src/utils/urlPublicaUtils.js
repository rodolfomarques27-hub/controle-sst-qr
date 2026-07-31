const ORIGEM_PUBLICA_PADRAO = "https://www.safescanbrasil.com.br";

const textoSeguroUrlPublica = (valor = "") => String(valor ?? "").trim();

export function obterOrigemPublicaSistema(origem = "") {
    const origemConfigurada = textoSeguroUrlPublica(import.meta.env?.VITE_PUBLIC_APP_URL)
        || ORIGEM_PUBLICA_PADRAO;
    const origemInformada = textoSeguroUrlPublica(origem)
        || (typeof window !== "undefined" ? window.location.origin : "")
        || origemConfigurada;

    try {
        const url = new URL(origemInformada);
        const host = url.hostname.toLowerCase();
        const origemLocal = host === "localhost" || host === "127.0.0.1" || host === "::1";
        return (origemLocal ? origemConfigurada : url.origin).replace(/\/$/, "");
    } catch {
        return origemConfigurada.replace(/\/$/, "");
    }
}

export function montarUrlPublicaSistema(caminho = "/", origem = "") {
    const origemPublica = obterOrigemPublicaSistema(origem);
    const caminhoSeguro = textoSeguroUrlPublica(caminho) || "/";
    return `${origemPublica}${caminhoSeguro.startsWith("/") ? caminhoSeguro : `/${caminhoSeguro}`}`;
}
