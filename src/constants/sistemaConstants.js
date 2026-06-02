// Constantes gerais do sistema SST.
// Mantém limites, storage e regras globais pequenas.

export const TAMANHO_PAGINA_SUPABASE = 1000;
export const DAY = 1000 * 60 * 60 * 24;
export const FUNCAO_EMAIL_ALERTA_TST = import.meta.env.VITE_FUNCAO_EMAIL_ALERTA_TST || "rapid-api";
export const LIMITE_STORAGE_MB = Number(import.meta.env.VITE_STORAGE_LIMITE_MB || 1024);
export const UPLOAD_BLOQUEAR_ACIMA_5MB = String(import.meta.env.VITE_BLOQUEAR_UPLOAD_ACIMA_5MB || "true") !== "false";
export const UPLOAD_LIMITE_FORTE_MB = Number(import.meta.env.VITE_UPLOAD_LIMITE_FORTE_MB || 5);
export const UPLOAD_MENSAGEM_ARQUIVO_GRANDE =
    "O arquivo está muito grande. Para reduzir o uso de armazenamento, compacte o PDF antes de enviar. Recomendamos escanear documentos em 150 ou 200 DPI, em preto e branco ou tons de cinza quando possível.";
export const perfisUpload = {
    documentoSimples: {
        rotulo: "Documento simples",
        limiteIdealBytes: 2 * 1024 * 1024,
        limiteForteBytes: UPLOAD_LIMITE_FORTE_MB * 1024 * 1024,
        recomendacao: "até 2 MB",
    },
    documentoExtenso: {
        rotulo: "Documento extenso",
        limiteIdealBytes: 5 * 1024 * 1024,
        limiteForteBytes: UPLOAD_LIMITE_FORTE_MB * 1024 * 1024,
        recomendacao: "até 5 MB",
    },
    fotoAuditoria: {
        rotulo: "Foto / imagem",
        limiteIdealBytes: 800 * 1024,
        limiteForteBytes: UPLOAD_LIMITE_FORTE_MB * 1024 * 1024,
        recomendacao: "preferencialmente até 800 KB",
    },
};
