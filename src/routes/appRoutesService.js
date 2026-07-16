import { obterParametroUrl } from "../utils/sstUtils";

export function obterTokenQrPublicoApp() {
    if (typeof window === "undefined") return "";
    return obterParametroUrl("qr") || "";
}

export function obterTokenVistoriaExtintorPublicoApp() {
    if (typeof window === "undefined") return "";
    return obterParametroUrl("vistoriaQr") || "";
}

export function obterTokenMapaPontoPublicoApp() {
    if (typeof window === "undefined") return "";
    const caminho = String(window.location.pathname || "");
    const prefixo = "/consulta-ponto/";
    if (!caminho.startsWith(prefixo)) return "";
    return decodeURIComponent(caminho.slice(prefixo.length).split("/")[0] || "");
}

export function obterRotaAtualCompletaApp() {
    if (typeof window === "undefined") return "";
    return `${window.location.pathname}${window.location.hash}`;
}

export function verificarRotaNovaAuditoriaCampoApp() {
    const rotaAtualCompleta = obterRotaAtualCompletaApp();

    return (
        rotaAtualCompleta.includes("/nova-auditoria-campo") ||
        rotaAtualCompleta.includes("/auditoria-campo")
    );
}
