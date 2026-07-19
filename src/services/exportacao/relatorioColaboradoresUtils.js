// Utilitários compartilhados pelos relatórios de colaboradores.
import { criarUrlAssinadaStorage } from "../supabaseServices";

export function escaparHTML(valor) {
    return String(valor ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function ehUrlProntaRelatorio(valor = "") {
    return /^(https?:|blob:|data:)/i.test(String(valor || "").trim());
}

function extrairCaminhoFotoColaboradorRelatorio(valor = "") {
    const texto = String(valor || "").trim();
    if (!texto) return "";

    const marcadores = [
        "/storage/v1/object/sign/fotos-colaboradores/",
        "/storage/v1/object/public/fotos-colaboradores/",
        "fotos-colaboradores/",
    ];

    for (const marcador of marcadores) {
        const indice = texto.indexOf(marcador);
        if (indice >= 0) {
            return decodeURIComponent(texto.slice(indice + marcador.length).split("?")[0]).replace(/^\/+/, "");
        }
    }

    if (!ehUrlProntaRelatorio(texto)) {
        return texto.replace(/^\/+/, "");
    }

    return "";
}

async function resolverFotoColaboradorRelatorio(valor = "") {
    const texto = String(valor || "").trim();

    if (!texto) return "";
    if (ehUrlProntaRelatorio(texto)) return texto;

    const caminho = extrairCaminhoFotoColaboradorRelatorio(texto);
    if (!caminho) return "";

    try {
        return await criarUrlAssinadaStorage(
            "fotos-colaboradores",
            caminho,
            60 * 60,
        );
    } catch (error) {
        console.warn("Não foi possível assinar foto do colaborador para o relatório:", error?.message || error);
    }

    return "";
}

export async function prepararColaboradoresRelatorio(colaboradores = []) {
    return Promise.all(
        (Array.isArray(colaboradores) ? colaboradores : []).map(async (colaborador) => ({
            ...colaborador,
            fotoUrl: await resolverFotoColaboradorRelatorio(
                colaborador.fotoUrl ||
                colaborador.foto_url ||
                colaborador.fotoColaboradorUrl ||
                colaborador.foto_colaborador_url ||
                colaborador.avatarUrl ||
                colaborador.avatar_url ||
                ""
            ),
        }))
    );
}

export function classeStatusRelatorio(status = "") {
    const texto = String(status || "").toLowerCase();

    if (texto.includes("liberado") || texto.includes("mobilizado")) return "status-ok";
    if (texto.includes("pend")) return "status-alerta";
    if (texto.includes("bloque")) return "status-critico";
    if (texto.includes("análise") || texto.includes("analise")) return "status-info";
    if (texto.includes("desmobilizado") || texto.includes("inativo")) return "status-neutro";

    return "status-neutro";
}

export const ICONES_RELATORIO_COLABORADORES = {
    total: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3Zm-8 0c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3Zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13Zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5Z"/></svg>`,
    liberados: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 1 0 .01 20.01A10 10 0 0 0 12 2Zm-1.2 13.9-3.7-3.7 1.4-1.4 2.3 2.3 5-5 1.4 1.4-6.4 6.4Z"/></svg>`,
    pendencia: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M1 21h22L12 2 1 21Zm12-3h-2v-2h2v2Zm0-4h-2v-4h2v4Z"/></svg>`,
    bloqueados: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 9V7A5 5 0 0 0 7 7v2H5v13h14V9h-2ZM9 7a3 3 0 0 1 6 0v2H9V7Zm4 10.73V20h-2v-2.27A2 2 0 1 1 13 17.73Z"/></svg>`,
    analise: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21.71 20.29-5.01-5.01A8 8 0 1 0 15.29 16.7l5 5.01 1.42-1.42ZM10.5 17a6.5 6.5 0 1 1 0-13 6.5 6.5 0 0 1 0 13Z"/></svg>`,
    vencidos: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2h2v2h6V2h2v2h3v18H4V4h3V2Zm13 8H4v10h16V10ZM6 12h5v5H6v-5Zm12.3 6.3-1.4 1.4-2.4-2.4-2.4 2.4-1.4-1.4 2.4-2.4-2.4-2.4 1.4-1.4 2.4 2.4 2.4-2.4 1.4 1.4-2.4 2.4 2.4 2.4Z"/></svg>`,
    vencer: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1a11 11 0 1 0 .01 22.01A11 11 0 0 0 12 1Zm1 12.4 4 2.4-1 1.7-5-3V6h2v7.4Z"/></svg>`,
};

export function montarCartaoResumoRelatorio({ icone, titulo, valor, classe }) {
    return `
        <div class="kpi ${classe}">
            <div class="kpi-icone">${icone}</div>
            <div class="kpi-titulo">${escaparHTML(titulo)}</div>
            <div class="kpi-valor">${escaparHTML(valor)}</div>
        </div>
    `;
}
