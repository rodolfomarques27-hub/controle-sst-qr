import { obterParametroUrl } from "../utils/sstUtils";

export function obterTokenQrPublicoApp() {
    if (typeof window === "undefined") return "";
    return obterParametroUrl("qr") || "";
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
