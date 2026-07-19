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
