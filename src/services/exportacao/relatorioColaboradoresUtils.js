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

const ICONES_CABECALHO_RELATORIO_COLABORADORES = {
    empresa: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 21h18"/><path d="M8 21V9.2c0-.8.46-1.52 1.18-1.86L14 5l4.82 2.34C19.54 7.68 20 8.4 20 9.2V21"/><path d="M4.5 21v-7.4c0-.73.39-1.4 1.02-1.76L8 10.45"/><path d="M20 12.05l2.48 1.39c.63.36 1.02 1.03 1.02 1.76V21"/><path d="M11 10.5h1.2"/><path d="M15 10.5h1.2"/><path d="M11 13.5h1.2"/><path d="M15 13.5h1.2"/><path d="M11 16.5h1.2"/><path d="M15 16.5h1.2"/><path d="M13 21v-3.2h3V21"/></svg>`,
    cnpj: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6"/><path d="M9 12h6"/><path d="M9 16h3"/></svg>`,
    responsavel: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.8-4 5-6 8-6s6.2 2 8 6"/></svg>`,
    data: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="16" rx="2"/><path d="M16 3v4"/><path d="M8 3v4"/><path d="M4 10h16"/><path d="M8 14h3"/><path d="M13 14h3"/><path d="M8 17h3"/></svg>`,
    sistema: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 5 6v5c0 4.6 2.9 8.8 7 10 4.1-1.2 7-5.4 7-10V6l-7-3Z"/><path d="m9.5 12 1.8 1.8 3.7-4"/></svg>`,
};

export function montarCabecalhoEmpresaTreinamentosRelatorio(empresa = {}, dataEmissao = "", titulo = "Relatório de colaboradores e treinamentos") {
    return `
        <header class="cabecalho-relatorio cabecalho-relatorio--modelo-aprovado cabecalho-relatorio--padrao-institucional">
            <div class="marca-pdf-padrao">
                <span class="marca-pdf-icone" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3 5 6v5c0 4.6 2.9 8.8 7 10 4.1-1.2 7-5.4 7-10V6l-7-3Z"/><path d="m9.5 12 1.8 1.8 3.7-4"/></svg></span>
                <div class="marca-pdf-textos">
                    <h1>SAFESCAN BRASIL</h1>
                    <p>GESTÃO DE SEGURANÇA DO TRABALHO</p>
                </div>
            </div>

            <div class="linha-pdf-padrao"></div>

            <div class="titulo-pdf-padrao titulo-pdf-padrao--treinamentos">
                <h2>${escaparHTML(String(titulo || "Relatório de treinamentos").toUpperCase())}</h2>
                <p>Relatório visual por empresa, colaboradores e treinamentos.</p>
            </div>

            <div class="dados-empresa dados-empresa--padrao-pdf">
                <div class="dados-empresa__item dados-empresa__item--empresa"><span>${ICONES_CABECALHO_RELATORIO_COLABORADORES.empresa}</span><strong>Empresa:</strong><em>${escaparHTML(empresa.nome || "-")}</em></div>
                <div class="dados-empresa__item dados-empresa__item--cnpj"><span>${ICONES_CABECALHO_RELATORIO_COLABORADORES.cnpj}</span><strong>CNPJ:</strong><em>${escaparHTML(empresa.cnpj || "-")}</em></div>
                <div class="dados-empresa__item dados-empresa__item--responsavel"><span>${ICONES_CABECALHO_RELATORIO_COLABORADORES.responsavel}</span><strong>Responsável:</strong><em>${escaparHTML(empresa.responsavel || "-")}</em></div>
                <div class="dados-empresa__item dados-empresa__item--data"><span>${ICONES_CABECALHO_RELATORIO_COLABORADORES.data}</span><strong>Data de emissão:</strong><em>${escaparHTML(dataEmissao)}</em></div>
                <div class="dados-empresa__item dados-empresa__item--sistema"><span>${ICONES_CABECALHO_RELATORIO_COLABORADORES.sistema}</span><strong>Sistema:</strong><em>SafeScan Brasil</em></div>
            </div>
        </header>
    `;
}

export function montarRodapeTreinamentosRelatorio(texto = "Relatório visual por empresa") {
    return `
        <footer class="rodape-relatorio">
            <span>🛡 SafeScan Brasil</span>
            <span>${escaparHTML(texto)}</span>
        </footer>
    `;
}

export function dividirEmLotesRelatorioEmpresas(lista = [], tamanho = 8) {
    const itens = Array.isArray(lista) ? lista : [];
    const lotes = [];

    for (let i = 0; i < itens.length; i += tamanho) {
        lotes.push(itens.slice(i, i + tamanho));
    }

    return lotes.length ? lotes : [[]];
}
