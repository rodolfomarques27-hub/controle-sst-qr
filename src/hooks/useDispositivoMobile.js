import { useEffect, useState } from "react";

const CONSULTA_LARGURA_CELULAR = "(max-width: 1023.98px)";
const CONSULTA_TOQUE_PRINCIPAL = "(hover: none) and (pointer: coarse)";
const CONSULTA_FALLBACK_ESTREITO = "(max-width: 767.98px)";
const PADRAO_USER_AGENT_CELULAR = /Android.+Mobile|iPhone|iPod|IEMobile|Windows Phone|Opera Mini/i;

function detectarDispositivoMobile() {
    if (typeof window === "undefined" || typeof navigator === "undefined") return false;

    const larguraCompativel = window.matchMedia(CONSULTA_LARGURA_CELULAR).matches;
    if (!larguraCompativel) return false;

    const userAgentDataMobile = navigator.userAgentData?.mobile === true;
    const userAgentCelular = PADRAO_USER_AGENT_CELULAR.test(navigator.userAgent || "");
    const toquePrincipal = window.matchMedia(CONSULTA_TOQUE_PRINCIPAL).matches;
    const fallbackEstreito = window.matchMedia(CONSULTA_FALLBACK_ESTREITO).matches;

    return userAgentDataMobile || userAgentCelular || (toquePrincipal && fallbackEstreito);
}

export function useDispositivoMobile() {
    const [dispositivoMobile, setDispositivoMobile] = useState(detectarDispositivoMobile);

    useEffect(() => {
        const consultas = [
            window.matchMedia(CONSULTA_LARGURA_CELULAR),
            window.matchMedia(CONSULTA_TOQUE_PRINCIPAL),
            window.matchMedia(CONSULTA_FALLBACK_ESTREITO),
        ];
        const atualizar = () => setDispositivoMobile(detectarDispositivoMobile());

        consultas.forEach((consulta) => consulta.addEventListener?.("change", atualizar));
        window.addEventListener("resize", atualizar);

        return () => {
            consultas.forEach((consulta) => consulta.removeEventListener?.("change", atualizar));
            window.removeEventListener("resize", atualizar);
        };
    }, []);

    return dispositivoMobile;
}
