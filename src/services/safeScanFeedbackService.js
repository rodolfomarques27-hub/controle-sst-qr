export const EVENTO_FEEDBACK_SAFESCAN = "safescan:feedback";

const TIPOS_FEEDBACK_SAFESCAN = new Set([
    "sucesso",
    "erro",
    "atencao",
    "informacao",
]);

export function emitirFeedbackSafeScan({
    tipo = "informacao",
    titulo = "",
    mensagem = "",
    duracaoMs,
} = {}) {
    const mensagemNormalizada = String(mensagem ?? "").trim();

    if (!mensagemNormalizada) return false;

    if (
        typeof globalThis.dispatchEvent !== "function" ||
        typeof globalThis.CustomEvent !== "function"
    ) {
        return false;
    }

    globalThis.dispatchEvent(
        new globalThis.CustomEvent(EVENTO_FEEDBACK_SAFESCAN, {
            detail: {
                tipo: TIPOS_FEEDBACK_SAFESCAN.has(tipo) ? tipo : "informacao",
                titulo: String(titulo ?? "").trim(),
                mensagem: mensagemNormalizada,
                duracaoMs: Number.isFinite(Number(duracaoMs))
                    ? Math.max(0, Number(duracaoMs))
                    : undefined,
            },
        })
    );

    return true;
}
