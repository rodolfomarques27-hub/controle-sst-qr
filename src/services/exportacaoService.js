// Serviços de exportação CSV/PDF do sistema SST.
import { supabase } from "../lib/supabaseClient";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
// Funções puras de geração/download local no navegador.

export function escaparCSV(valor) {
    const texto = String(valor ?? "").replace(/"/g, '""');
    return `"${texto}"`;
}


export function baixarCSV(nomeArquivo, linhas) {
    const csv = linhas.map((linha) => linha.map(escaparCSV).join(";")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = nomeArquivo;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}


export function limparTextoPDF(valor) {
    return String(valor ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\x20-\x7E]/g, " ")
        .replace(/[\\()]/g, "\\$&")
        .trim();
}


export function quebrarTextoPDF(valor, limite = 88) {
    const texto = limparTextoPDF(valor);

    if (!texto) return ["-"];

    const palavras = texto.split(/\s+/);
    const linhas = [];
    let atual = "";

    palavras.forEach((palavra) => {
        if ((atual + " " + palavra).trim().length > limite) {
            if (atual) linhas.push(atual);
            atual = palavra;
        } else {
            atual = `${atual} ${palavra}`.trim();
        }
    });

    if (atual) linhas.push(atual);

    return linhas.length ? linhas : ["-"];
}


export function baixarPDF(nomeArquivo, titulo, linhas) {
    const larguraPagina = 595;
    const alturaPagina = 842;
    const margem = 40;
    const limiteInferior = 45;
    const dataAtual = new Date().toLocaleDateString("pt-BR");

    const paginas = [];
    let comandos = [];
    let y = 800;

    const adicionarTexto = (texto, tamanho = 9, fonte = "F1", recuo = 0) => {
        const linhasQuebradas = quebrarTextoPDF(texto, recuo ? 78 : 95);

        linhasQuebradas.forEach((linha) => {
            if (y < limiteInferior) {
                paginas.push(comandos.join("\n"));
                comandos = [];
                y = 800;
                comandos.push(`BT /F2 13 Tf ${margem} ${y} Td (${limparTextoPDF(titulo)}) Tj ET`);
                y -= 18;
                comandos.push(`BT /F1 8 Tf ${margem} ${y} Td (Continuacao) Tj ET`);
                y -= 22;
            }

            comandos.push(`BT /${fonte} ${tamanho} Tf ${margem + recuo} ${y} Td (${limparTextoPDF(linha)}) Tj ET`);
            y -= tamanho + 4;
        });
    };

    comandos.push(`BT /F2 16 Tf ${margem} ${y} Td (${limparTextoPDF(titulo)}) Tj ET`);
    y -= 20;
    comandos.push(`BT /F1 9 Tf ${margem} ${y} Td (Gerado em ${limparTextoPDF(dataAtual)} pelo Controle SST QR) Tj ET`);
    y -= 26;

    const cabecalho = linhas[0] || [];
    const registros = linhas.slice(1);

    if (registros.length === 0) {
        adicionarTexto("Nenhum registro encontrado para os filtros selecionados.", 10, "F1");
    }

    registros.forEach((registro, indice) => {
        if (indice > 0) {
            adicionarTexto("------------------------------------------------------------", 8, "F1");
        }

        adicionarTexto(`Registro ${indice + 1}`, 11, "F2");

        cabecalho.forEach((campo, campoIndice) => {
            adicionarTexto(`${campo}: ${registro[campoIndice] ?? ""}`, 9, "F1", 10);
        });

        y -= 4;
    });

    paginas.push(comandos.join("\n"));

    const objetos = [];
    const adicionarObjeto = (conteudo) => {
        objetos.push(conteudo);
        return objetos.length;
    };

    adicionarObjeto("<< /Type /Catalog /Pages 2 0 R >>");

    const kids = paginas.map((_, i) => `${3 + i * 2} 0 R`).join(" ");
    adicionarObjeto(`<< /Type /Pages /Kids [${kids}] /Count ${paginas.length} >>`);

    paginas.forEach((conteudo, i) => {
        const paginaObj = 3 + i * 2;
        const conteudoObj = 4 + i * 2;

        objetos[paginaObj - 1] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${larguraPagina} ${alturaPagina}] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> /F2 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> >> >> /Contents ${conteudoObj} 0 R >>`;
        objetos[conteudoObj - 1] = `<< /Length ${conteudo.length} >>\nstream\n${conteudo}\nendstream`;
    });

    let pdf = "%PDF-1.4\n";
    const offsets = [0];

    objetos.forEach((objeto, indice) => {
        offsets.push(pdf.length);
        pdf += `${indice + 1} 0 obj\n${objeto}\nendobj\n`;
    });

    const inicioXref = pdf.length;
    pdf += `xref\n0 ${objetos.length + 1}\n`;
    pdf += "0000000000 65535 f \n";

    offsets.slice(1).forEach((offset) => {
        pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
    });

    pdf += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${inicioXref}\n%%EOF`;

    const blob = new Blob([pdf], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = nomeArquivo;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}


function escaparHTML(valor) {
    return String(valor ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function limparListaRelatorio(lista = []) {
    if (!Array.isArray(lista)) {
        const texto = String(lista || "").trim();
        return texto ? [texto] : [];
    }

    return lista
        .map((item) => {
            if (typeof item === "string") return item.trim();
            if (item?.nome) return String(item.nome).trim();
            if (item?.treinamento?.nome) return String(item.treinamento.nome).trim();
            return String(item || "").trim();
        })
        .filter(Boolean);
}

const ICONES_RELATORIO_COLABORADORES = {
    total: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3Zm-8 0c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3Zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13Zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5Z"/></svg>`,
    liberados: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 1 0 .01 20.01A10 10 0 0 0 12 2Zm-1.2 13.9-3.7-3.7 1.4-1.4 2.3 2.3 5-5 1.4 1.4-6.4 6.4Z"/></svg>`,
    pendencia: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M1 21h22L12 2 1 21Zm12-3h-2v-2h2v2Zm0-4h-2v-4h2v4Z"/></svg>`,
    bloqueados: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 9V7A5 5 0 0 0 7 7v2H5v13h14V9h-2ZM9 7a3 3 0 0 1 6 0v2H9V7Zm4 10.73V20h-2v-2.27A2 2 0 1 1 13 17.73Z"/></svg>`,
    analise: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21.71 20.29-5.01-5.01A8 8 0 1 0 15.29 16.7l5 5.01 1.42-1.42ZM10.5 17a6.5 6.5 0 1 1 0-13 6.5 6.5 0 0 1 0 13Z"/></svg>`,
    vencidos: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2h2v2h6V2h2v2h3v18H4V4h3V2Zm13 8H4v10h16V10ZM6 12h5v5H6v-5Zm12.3 6.3-1.4 1.4-2.4-2.4-2.4 2.4-1.4-1.4 2.4-2.4-2.4-2.4 1.4-1.4 2.4 2.4 2.4-2.4 1.4 1.4-2.4 2.4 2.4 2.4Z"/></svg>`,
    vencer: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1a11 11 0 1 0 .01 22.01A11 11 0 0 0 12 1Zm1 12.4 4 2.4-1 1.7-5-3V6h2v7.4Z"/></svg>`,
};

const ICONES_CABECALHO_RELATORIO_COLABORADORES = {
    empresa: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 21h18"/><path d="M8 21V9.2c0-.8.46-1.52 1.18-1.86L14 5l4.82 2.34C19.54 7.68 20 8.4 20 9.2V21"/><path d="M4.5 21v-7.4c0-.73.39-1.4 1.02-1.76L8 10.45"/><path d="M20 12.05l2.48 1.39c.63.36 1.02 1.03 1.02 1.76V21"/><path d="M11 10.5h1.2"/><path d="M15 10.5h1.2"/><path d="M11 13.5h1.2"/><path d="M15 13.5h1.2"/><path d="M11 16.5h1.2"/><path d="M15 16.5h1.2"/><path d="M13 21v-3.2h3V21"/></svg>`,
    cnpj: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6"/><path d="M9 12h6"/><path d="M9 16h3"/></svg>`,
    responsavel: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.8-4 5-6 8-6s6.2 2 8 6"/></svg>`,
    data: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="16" rx="2"/><path d="M16 3v4"/><path d="M8 3v4"/><path d="M4 10h16"/><path d="M8 14h3"/><path d="M13 14h3"/><path d="M8 17h3"/></svg>`,
    sistema: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 5 6v5c0 4.6 2.9 8.8 7 10 4.1-1.2 7-5.4 7-10V6l-7-3Z"/><path d="m9.5 12 1.8 1.8 3.7-4"/></svg>`,
};


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
        const { data, error } = await supabase.storage
            .from("fotos-colaboradores")
            .createSignedUrl(caminho, 60 * 60);

        if (!error && data?.signedUrl) {
            return data.signedUrl;
        }
    } catch (error) {
        console.warn("Não foi possível assinar foto do colaborador para o relatório:", error?.message || error);
    }

    return "";
}

async function prepararColaboradoresRelatorio(colaboradores = []) {
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

function limitarListaRelatorio(lista = [], limite = 5) {
    const itens = limparListaRelatorio(lista);
    const principais = itens.slice(0, limite);
    const restantes = Math.max(0, itens.length - principais.length);

    return {
        itens: principais,
        restantes,
        total: itens.length,
    };
}

function obterIniciaisEmpresa(nome = "") {
    const partes = String(nome || "Empresa")
        .split(/\s+/)
        .map((item) => item.trim())
        .filter(Boolean);

    if (!partes.length) return "SST";

    return partes
        .slice(0, 2)
        .map((item) => item[0])
        .join("")
        .toUpperCase();
}

function classeStatusRelatorio(status = "") {
    const texto = String(status || "").toLowerCase();

    if (texto.includes("liberado") || texto.includes("mobilizado")) return "status-ok";
    if (texto.includes("pend")) return "status-alerta";
    if (texto.includes("bloque")) return "status-critico";
    if (texto.includes("análise") || texto.includes("analise")) return "status-info";
    if (texto.includes("desmobilizado") || texto.includes("inativo")) return "status-neutro";

    return "status-neutro";
}

function agruparPorEmpresaRelatorio(colaboradores = []) {
    const mapa = new Map();

    colaboradores.forEach((colaborador) => {
        const empresaNome = String(colaborador.empresaNome || colaborador.empresa || "Empresa não informada").trim() || "Empresa não informada";
        const chave = String(colaborador.empresaId || empresaNome).trim().toLowerCase();

        if (!mapa.has(chave)) {
            mapa.set(chave, {
                id: colaborador.empresaId || chave,
                nome: empresaNome,
                cnpj: colaborador.empresaCnpj || "",
                responsavel: colaborador.empresaResponsavel || "",
                logoUrl: colaborador.empresaLogoUrl || "",
                colaboradores: [],
            });
        }

        const empresa = mapa.get(chave);

        empresa.cnpj = empresa.cnpj || colaborador.empresaCnpj || "";
        empresa.responsavel = empresa.responsavel || colaborador.empresaResponsavel || "";
        empresa.logoUrl = empresa.logoUrl || colaborador.empresaLogoUrl || "";
        empresa.colaboradores.push(colaborador);
    });

    return Array.from(mapa.values()).sort((a, b) => a.nome.localeCompare(b.nome));
}

function calcularResumoEmpresaRelatorio(colaboradores = []) {
    return colaboradores.reduce(
        (acc, colaborador) => {
            const status = String(colaborador.statusGeral || "").toLowerCase();

            acc.total += 1;
            acc.pendentes += Number(colaborador.pendentes?.length || colaborador.pendentesTotal || 0) || 0;
            acc.vencidos += Number(colaborador.vencidos?.length || colaborador.vencidosTotal || 0) || 0;
            acc.vencendo += Number(colaborador.vencendo?.length || colaborador.vencendoTotal || 0) || 0;

            if (status.includes("liberado")) acc.liberados += 1;
            else if (status.includes("pend")) acc.comPendencia += 1;
            else if (status.includes("bloque")) acc.bloqueados += 1;
            else if (status.includes("análise") || status.includes("analise")) acc.emAnalise += 1;

            return acc;
        },
        {
            total: 0,
            liberados: 0,
            comPendencia: 0,
            bloqueados: 0,
            emAnalise: 0,
            pendentes: 0,
            vencidos: 0,
            vencendo: 0,
        }
    );
}

function montarListaHtmlRelatorio(lista = [], vazio = "Nenhum item.") {
    const resumo = limitarListaRelatorio(lista, 6);

    if (!resumo.itens.length) {
        return `<p class="lista-vazia">${escaparHTML(vazio)}</p>`;
    }

    return [
        "<ul>",
        ...resumo.itens.map((item) => `<li>${escaparHTML(item)}</li>`),
        resumo.restantes ? `<li class="mais-itens">+ ${resumo.restantes} outro(s)</li>` : "",
        "</ul>",
    ].join("");
}

function montarLogoEmpresaHtml(empresa = {}) {
    if (empresa.logoUrl) {
        return `<img class="empresa-logo-img" src="${escaparHTML(empresa.logoUrl)}" alt="Logo ${escaparHTML(empresa.nome)}" />`;
    }

    return `<div class="empresa-logo-fallback">${escaparHTML(obterIniciaisEmpresa(empresa.nome))}</div>`;
}

function montarCartaoResumoRelatorio({ icone, titulo, valor, classe }) {
    return `
        <div class="kpi ${classe}">
            <div class="kpi-icone">${icone}</div>
            <div class="kpi-titulo">${escaparHTML(titulo)}</div>
            <div class="kpi-valor">${escaparHTML(valor)}</div>
        </div>
    `;
}

function montarSecaoEmpresaRelatorio(empresa = {}, indiceEmpresa = 0, dataEmissao = "") {
    const resumo = calcularResumoEmpresaRelatorio(empresa.colaboradores || []);
    const linhasTabela = (empresa.colaboradores || []).map((colaborador, indice) => `
        <tr>
            <td>${indice + 1}</td>
            <td class="texto-forte">${escaparHTML(colaborador.nome || "-")}</td>
            <td>${escaparHTML(colaborador.funcao || "-")}</td>
            <td><span class="badge ${classeStatusRelatorio(colaborador.statusMobilizacao)}">${escaparHTML(colaborador.statusMobilizacao || "-")}</span></td>
            <td><span class="badge ${classeStatusRelatorio(colaborador.statusGeral)}">${escaparHTML(colaborador.statusGeral || "-")}</span></td>
            <td>${Number(colaborador.pendentes?.length || colaborador.pendentesTotal || 0) || 0}</td>
            <td>${Number(colaborador.vencidos?.length || colaborador.vencidosTotal || 0) || 0}</td>
            <td>${Number(colaborador.vencendo?.length || colaborador.vencendoTotal || 0) || 0}</td>
        </tr>
    `).join("");

    const detalhes = (empresa.colaboradores || []).map((colaborador, indice) => {
        const validos = limparListaRelatorio(colaborador.validos);
        const pendentes = limparListaRelatorio(colaborador.pendentes);
        const vencidos = limparListaRelatorio(colaborador.vencidos);
        const vencendo = limparListaRelatorio(colaborador.vencendo);

        const fotoColaborador = colaborador.fotoUrl
            ? `<img src="${escaparHTML(colaborador.fotoUrl)}" alt="Foto ${escaparHTML(colaborador.nome || "colaborador")}" />`
            : escaparHTML(obterIniciaisEmpresa(colaborador.nome || "C"));

        return `
            <section class="detalhe-colaborador">
                <div class="detalhe-topo">
                    <div class="numero-colaborador">
                        <svg viewBox="0 0 26 26" aria-hidden="true" focusable="false">
                            <rect x="0" y="0" width="26" height="26" rx="7"></rect>
                            <text x="13" y="13" dominant-baseline="central" text-anchor="middle">${indice + 1}</text>
                        </svg>
                    </div>
                    <div class="avatar-colaborador ${colaborador.fotoUrl ? "avatar-colaborador--foto" : ""}">${fotoColaborador}</div>
                    <div class="detalhe-identificacao">
                        <h3>${escaparHTML(colaborador.nome || "-")}</h3>
                        <p><strong>Código:</strong> ${escaparHTML(colaborador.codigo || "-")}</p>
                        <p><strong>Função:</strong> ${escaparHTML(colaborador.funcao || "-")}</p>
                        <p><strong>Matriz aplicada:</strong> ${escaparHTML(colaborador.matriz || "-")}</p>
                    </div>
                    <div class="detalhe-status">
                        <div class="detalhe-status-linha detalhe-status-linha--empresa">
                            <strong>Empresa:</strong>
                            <span>${escaparHTML(colaborador.empresaExibicao || colaborador.empresaNome || empresa.nome || "-")}</span>
                        </div>
                        <div class="detalhe-status-linha">
                            <strong>Situação na obra:</strong>
                            <span class="detalhe-status-valor ${classeStatusRelatorio(colaborador.statusMobilizacao)}">${escaparHTML(colaborador.statusMobilizacao || "-")}</span>
                        </div>
                        <div class="detalhe-status-linha">
                            <strong>Status geral:</strong>
                            <span class="detalhe-status-valor ${classeStatusRelatorio(colaborador.statusGeral)}">${escaparHTML(colaborador.statusGeral || "-")}</span>
                        </div>
                    </div>
                </div>
                <div class="detalhe-grids">
                    <div class="lista-card lista-card-ok">
                        <h4>✅ Válidos (${validos.length})</h4>
                        ${montarListaHtmlRelatorio(validos, "Nenhum treinamento válido.")}
                    </div>
                    <div class="lista-card lista-card-pendente">
                        <h4>⚠️ Pendentes (${pendentes.length})</h4>
                        ${montarListaHtmlRelatorio(pendentes, "Nenhuma pendência.")}
                    </div>
                    <div class="lista-card lista-card-vencido">
                        <h4>🔒 Vencidos (${vencidos.length})</h4>
                        ${montarListaHtmlRelatorio(vencidos, "Nenhum treinamento vencido.")}
                    </div>
                    <div class="lista-card lista-card-vencendo">
                        <h4>◷ A vencer (${vencendo.length})</h4>
                        ${montarListaHtmlRelatorio(vencendo, "Nenhum treinamento a vencer.")}
                    </div>
                </div>
            </section>
        `;
    }).join("");

    return `
        <section class="pagina-relatorio ${indiceEmpresa > 0 ? "quebra-pagina" : ""}">
            <header class="cabecalho-relatorio cabecalho-relatorio--modelo-aprovado">
                <div class="marca-empresa">
                    ${montarLogoEmpresaHtml(empresa)}
                    <div class="marca-empresa-textos">
                        <h1>${escaparHTML(empresa.nome || "Empresa")}</h1>
                        <p>Controle SST QR</p>
                    </div>
                </div>

                <div class="titulo-relatorio-cabecalho">
                    <span></span>
                    <strong>Relatório de colaboradores e treinamentos</strong>
                    <span></span>
                </div>

                <div class="dados-empresa">
                    <div class="dados-empresa__item dados-empresa__item--empresa"><span>${ICONES_CABECALHO_RELATORIO_COLABORADORES.empresa}</span><strong>Empresa:</strong><em>${escaparHTML(empresa.nome || "-")}</em></div>
                    <div class="dados-empresa__item dados-empresa__item--cnpj"><span>${ICONES_CABECALHO_RELATORIO_COLABORADORES.cnpj}</span><strong>CNPJ:</strong><em>${escaparHTML(empresa.cnpj || "-")}</em></div>
                    <div class="dados-empresa__item dados-empresa__item--responsavel"><span>${ICONES_CABECALHO_RELATORIO_COLABORADORES.responsavel}</span><strong>Responsável:</strong><em>${escaparHTML(empresa.responsavel || "-")}</em></div>
                    <div class="dados-empresa__item dados-empresa__item--data"><span>${ICONES_CABECALHO_RELATORIO_COLABORADORES.data}</span><strong>Data de emissão:</strong><em>${escaparHTML(dataEmissao)}</em></div>
                    <div class="dados-empresa__item dados-empresa__item--sistema"><span>${ICONES_CABECALHO_RELATORIO_COLABORADORES.sistema}</span><strong>Sistema:</strong><em>Controle SST QR</em></div>
                </div>
            </header>

            <section class="bloco">
                <h2>Resumo geral</h2>
                <div class="kpis">
                    ${montarCartaoResumoRelatorio({ icone: ICONES_RELATORIO_COLABORADORES.total, titulo: "Total", valor: resumo.total, classe: "kpi-total" })}
                    ${montarCartaoResumoRelatorio({ icone: ICONES_RELATORIO_COLABORADORES.liberados, titulo: "Liberados", valor: resumo.liberados, classe: "kpi-ok" })}
                    ${montarCartaoResumoRelatorio({ icone: ICONES_RELATORIO_COLABORADORES.pendencia, titulo: "Com pendência", valor: resumo.comPendencia, classe: "kpi-alerta" })}
                    ${montarCartaoResumoRelatorio({ icone: ICONES_RELATORIO_COLABORADORES.bloqueados, titulo: "Bloqueados", valor: resumo.bloqueados, classe: "kpi-critico" })}
                    ${montarCartaoResumoRelatorio({ icone: ICONES_RELATORIO_COLABORADORES.analise, titulo: "Em análise", valor: resumo.emAnalise, classe: "kpi-info" })}
                    ${montarCartaoResumoRelatorio({ icone: ICONES_RELATORIO_COLABORADORES.vencidos, titulo: "Vencidos", valor: resumo.vencidos, classe: "kpi-vencido" })}
                    ${montarCartaoResumoRelatorio({ icone: ICONES_RELATORIO_COLABORADORES.vencer, titulo: "A vencer", valor: resumo.vencendo, classe: "kpi-vencendo" })}
                </div>
            </section>

            <section class="bloco">
                <h2>Resumo por colaborador</h2>
                <table class="tabela-resumo-colaboradores">
                    <colgroup>
                        <col class="col-numero" />
                        <col class="col-colaborador" />
                        <col class="col-funcao" />
                        <col class="col-situacao" />
                        <col class="col-status" />
                        <col class="col-pendentes" />
                        <col class="col-vencidos" />
                        <col class="col-vencer" />
                    </colgroup>
                    <thead>
                        <tr>
                            <th><div class="th-conteudo">#</div></th>
                            <th><div class="th-conteudo">Colaborador</div></th>
                            <th><div class="th-conteudo">Função</div></th>
                            <th><div class="th-conteudo">Situação na<br />obra</div></th>
                            <th><div class="th-conteudo">Status geral</div></th>
                            <th><div class="th-conteudo">Pendentes</div></th>
                            <th><div class="th-conteudo">Vencidos</div></th>
                            <th><div class="th-conteudo">A<br />vencer</div></th>
                        </tr>
                    </thead>
                    <tbody>
                        ${linhasTabela || `<tr><td colspan="8">Nenhum colaborador encontrado.</td></tr>`}
                    </tbody>
                </table>
            </section>

            <section class="bloco bloco-detalhamento">
                <h2>Detalhamento</h2>
                ${detalhes || `<p class="lista-vazia">Nenhum colaborador para detalhar.</p>`}
            </section>

            <footer class="rodape-relatorio">
                <span>🛡 Controle SST QR</span>
                <span>Relatório visual por empresa</span>
            </footer>
        </section>
    `;
}



async function aguardarImagesRelatorio(documento, tempoMaximo = 6000) {
    const imagens = Array.from(documento?.images || []);

    if (!imagens.length) return;

    const carregamentos = imagens.map((imagem) => {
        if (imagem.complete && imagem.naturalWidth > 0) {
            return Promise.resolve();
        }

        return new Promise((resolve) => {
            const finalizar = () => resolve();
            imagem.addEventListener("load", finalizar, { once: true });
            imagem.addEventListener("error", finalizar, { once: true });
        });
    });

    await Promise.race([
        Promise.all(carregamentos),
        new Promise((resolve) => setTimeout(resolve, tempoMaximo)),
    ]);
}

async function aguardarImagensRelatorio(documento, tempoMaximo = 6000) {
    return aguardarImagesRelatorio(documento, tempoMaximo);
}


function canvasTemConteudoVisivelRelatorio(canvas, origemYPx, alturaPx) {
    const largura = canvas.width;
    const altura = Math.max(1, Math.min(alturaPx, canvas.height - origemYPx));
    const contexto = canvas.getContext("2d", { willReadFrequently: true });

    if (!contexto || altura <= 0) return false;

    const passoX = Math.max(8, Math.floor(largura / 70));
    const passoY = Math.max(8, Math.floor(altura / 80));
    let pixelsComConteudo = 0;

    for (let y = 0; y < altura; y += passoY) {
        const linhaY = Math.min(canvas.height - 1, origemYPx + y);
        const dados = contexto.getImageData(0, linhaY, largura, 1).data;

        for (let x = 0; x < largura; x += passoX) {
            const indice = x * 4;
            const r = dados[indice];
            const g = dados[indice + 1];
            const b = dados[indice + 2];
            const a = dados[indice + 3];

            if (a > 0 && (r < 245 || g < 245 || b < 245)) {
                pixelsComConteudo += 1;

                if (pixelsComConteudo >= 12) {
                    return true;
                }
            }
        }
    }

    return false;
}

async function baixarRelatorioHtmlComoPdf({ html, nomeArquivo }) {
    const iframe = document.createElement("iframe");

    iframe.style.position = "fixed";
    iframe.style.left = "0";
    iframe.style.top = "0";
    iframe.style.width = "900px";
    iframe.style.height = "1400px";
    iframe.style.border = "0";
    iframe.style.background = "#ffffff";
    iframe.style.opacity = "0";
    iframe.style.pointerEvents = "none";
    iframe.style.zIndex = "-1";
    iframe.setAttribute("aria-hidden", "true");

    document.body.appendChild(iframe);

    const documento = iframe.contentWindow?.document;
    if (!documento) {
        document.body.removeChild(iframe);
        alert("Não foi possível preparar o relatório para download em PDF.");
        return;
    }

    documento.open();
    documento.write(html);
    documento.close();

    await new Promise((resolve) => setTimeout(resolve, 450));

    try {
        await documento.fonts?.ready;
    } catch {
        // segue normalmente se o navegador não expuser document.fonts
    }

    await aguardarImagensRelatorio(documento, 6000);

    const paginasHtml = Array.from(documento.querySelectorAll(".pagina-relatorio"));

    if (!paginasHtml.length) {
        document.body.removeChild(iframe);
        alert("Não foi possível encontrar o conteúdo do relatório para gerar o PDF.");
        return;
    }

    const pdf = new jsPDF("p", "mm", "a4");
    let primeiraPagina = true;

    for (const paginaHtml of paginasHtml) {
        const larguraCapturaPx = Math.ceil(paginaHtml.scrollWidth || paginaHtml.getBoundingClientRect().width || 794);
        const alturaCapturaPx = Math.ceil(paginaHtml.scrollHeight || paginaHtml.getBoundingClientRect().height || 1123);

        const canvas = await html2canvas(paginaHtml, {
            scale: 2,
            useCORS: true,
            allowTaint: false,
            backgroundColor: "#ffffff",
            logging: false,
            width: larguraCapturaPx,
            height: alturaCapturaPx,
            windowWidth: Math.max(larguraCapturaPx, 900),
            windowHeight: Math.max(alturaCapturaPx, 1400),
            scrollX: 0,
            scrollY: 0,
            x: 0,
            y: 0,
        });

        const larguraPdfMm = 210;
        const alturaPaginaPdfMm = 297;
        const alturaFatiaPx = Math.floor((canvas.width * alturaPaginaPdfMm) / larguraPdfMm);

        let origemYPx = 0;

        while (origemYPx < canvas.height) {
            const alturaAtualPx = Math.min(alturaFatiaPx, canvas.height - origemYPx);

            if (!canvasTemConteudoVisivelRelatorio(canvas, origemYPx, alturaAtualPx)) {
                break;
            }

            const canvasFatia = document.createElement("canvas");

            canvasFatia.width = canvas.width;
            canvasFatia.height = alturaAtualPx;

            const contexto = canvasFatia.getContext("2d");
            contexto.fillStyle = "#ffffff";
            contexto.fillRect(0, 0, canvasFatia.width, canvasFatia.height);
            contexto.drawImage(
                canvas,
                0,
                origemYPx,
                canvas.width,
                alturaAtualPx,
                0,
                0,
                canvas.width,
                alturaAtualPx
            );

            const imagem = canvasFatia.toDataURL("image/jpeg", 0.96);
            const alturaImagemMm = (alturaAtualPx * larguraPdfMm) / canvas.width;

            if (!primeiraPagina) {
                pdf.addPage();
            }

            pdf.addImage(imagem, "JPEG", 0, 0, larguraPdfMm, alturaImagemMm, undefined, "FAST");

            primeiraPagina = false;
            origemYPx += alturaAtualPx;
        }
    }

    document.body.removeChild(iframe);
    pdf.save(nomeArquivo.endsWith(".pdf") ? nomeArquivo : `${nomeArquivo}.pdf`);
}



function agruparPendenciasPorEmpresaRelatorio(pendencias = []) {
    const mapa = new Map();

    pendencias.forEach((pendencia) => {
        const empresaNome = String(pendencia.empresaNome || pendencia.empresa || "Empresa não informada").trim() || "Empresa não informada";
        const chave = String(pendencia.empresaId || empresaNome).trim().toLowerCase();

        if (!mapa.has(chave)) {
            mapa.set(chave, {
                id: pendencia.empresaId || chave,
                nome: empresaNome,
                cnpj: pendencia.empresaCnpj || "",
                responsavel: pendencia.empresaResponsavel || "",
                logoUrl: pendencia.empresaLogoUrl || "",
                pendencias: [],
            });
        }

        const empresa = mapa.get(chave);

        empresa.cnpj = empresa.cnpj || pendencia.empresaCnpj || "";
        empresa.responsavel = empresa.responsavel || pendencia.empresaResponsavel || "";
        empresa.logoUrl = empresa.logoUrl || pendencia.empresaLogoUrl || "";
        empresa.pendencias.push(pendencia);
    });

    return Array.from(mapa.values()).sort((a, b) => a.nome.localeCompare(b.nome));
}

function chavePendenciaRelatorio(situacao = "") {
    const texto = String(situacao || "").toLowerCase();

    if (texto.includes("vencido")) return "vencido";
    if (texto.includes("vencer")) return "vencendo";
    if (texto.includes("pend")) return "pendente";

    return "outro";
}

function classePendenciaRelatorio(situacao = "") {
    const chave = chavePendenciaRelatorio(situacao);

    if (chave === "vencido") return "status-critico";
    if (chave === "vencendo") return "status-alerta";
    if (chave === "pendente") return "status-info";

    return "status-neutro";
}

function calcularResumoPendenciasRelatorio(pendencias = []) {
    const colaboradoresUnicos = new Set();
    const funcoesUnicas = new Set();

    return pendencias.reduce(
        (acc, pendencia) => {
            const chave = chavePendenciaRelatorio(pendencia.situacao);

            acc.total += 1;
            if (chave === "pendente") acc.pendentes += 1;
            if (chave === "vencido") acc.vencidos += 1;
            if (chave === "vencendo") acc.vencendo += 1;

            if (pendencia.colaboradorId || pendencia.colaborador || pendencia.codigo) {
                colaboradoresUnicos.add(String(pendencia.colaboradorId || pendencia.codigo || pendencia.colaborador));
            }

            if (pendencia.funcao) {
                funcoesUnicas.add(String(pendencia.funcao));
            }

            acc.colaboradores = colaboradoresUnicos.size;
            acc.funcoes = funcoesUnicas.size;

            return acc;
        },
        {
            total: 0,
            pendentes: 0,
            vencidos: 0,
            vencendo: 0,
            colaboradores: 0,
            funcoes: 0,
        }
    );
}

function montarSecaoEmpresaPendenciasRelatorio(empresa = {}, indiceEmpresa = 0, dataEmissao = "") {
    const resumo = calcularResumoPendenciasRelatorio(empresa.pendencias || []);

    const linhasTabela = (empresa.pendencias || []).map((pendencia, indice) => `
        <tr>
            <td>${indice + 1}</td>
            <td class="texto-forte">${escaparHTML(pendencia.colaborador || "-")}</td>
            <td>${escaparHTML(pendencia.funcao || "-")}</td>
            <td class="texto-forte">${escaparHTML(pendencia.treinamento || "-")}</td>
            <td><span class="status-texto ${classePendenciaRelatorio(pendencia.situacao)}">${escaparHTML(pendencia.situacao || "-")}</span></td>
            <td>${escaparHTML(pendencia.vencimento || "-")}</td>
            <td>${escaparHTML(pendencia.base || "-")}</td>
        </tr>
    `).join("");

    return `
        <section class="pagina-relatorio ${indiceEmpresa > 0 ? "quebra-pagina" : ""}">
            <header class="cabecalho-relatorio cabecalho-relatorio--modelo-aprovado">
                <div class="marca-empresa">
                    ${montarLogoEmpresaHtml(empresa)}
                    <div class="marca-empresa-textos">
                        <h1>${escaparHTML(empresa.nome || "Empresa")}</h1>
                        <p>Controle SST QR</p>
                    </div>
                </div>

                <div class="titulo-relatorio-cabecalho">
                    <span></span>
                    <strong>Relatório de pendências de treinamentos</strong>
                    <span></span>
                </div>

                <div class="dados-empresa">
                    <div class="dados-empresa__item dados-empresa__item--empresa"><span>${ICONES_CABECALHO_RELATORIO_COLABORADORES.empresa}</span><strong>Empresa:</strong><em>${escaparHTML(empresa.nome || "-")}</em></div>
                    <div class="dados-empresa__item dados-empresa__item--cnpj"><span>${ICONES_CABECALHO_RELATORIO_COLABORADORES.cnpj}</span><strong>CNPJ:</strong><em>${escaparHTML(empresa.cnpj || "-")}</em></div>
                    <div class="dados-empresa__item dados-empresa__item--responsavel"><span>${ICONES_CABECALHO_RELATORIO_COLABORADORES.responsavel}</span><strong>Responsável:</strong><em>${escaparHTML(empresa.responsavel || "-")}</em></div>
                    <div class="dados-empresa__item dados-empresa__item--data"><span>${ICONES_CABECALHO_RELATORIO_COLABORADORES.data}</span><strong>Data de emissão:</strong><em>${escaparHTML(dataEmissao)}</em></div>
                    <div class="dados-empresa__item dados-empresa__item--sistema"><span>${ICONES_CABECALHO_RELATORIO_COLABORADORES.sistema}</span><strong>Sistema:</strong><em>Controle SST QR</em></div>
                </div>
            </header>

            <section class="bloco">
                <h2>Resumo geral das pendências</h2>
                <div class="kpis">
                    ${montarCartaoResumoRelatorio({ icone: ICONES_RELATORIO_COLABORADORES.total, titulo: "Total", valor: resumo.total, classe: "kpi-total" })}
                    ${montarCartaoResumoRelatorio({ icone: ICONES_RELATORIO_COLABORADORES.pendencia, titulo: "Pendentes", valor: resumo.pendentes, classe: "kpi-info" })}
                    ${montarCartaoResumoRelatorio({ icone: ICONES_RELATORIO_COLABORADORES.vencidos, titulo: "Vencidos", valor: resumo.vencidos, classe: "kpi-vencido" })}
                    ${montarCartaoResumoRelatorio({ icone: ICONES_RELATORIO_COLABORADORES.vencer, titulo: "A vencer", valor: resumo.vencendo, classe: "kpi-vencendo" })}
                    ${montarCartaoResumoRelatorio({ icone: ICONES_RELATORIO_COLABORADORES.analise, titulo: "Colaboradores", valor: resumo.colaboradores, classe: "kpi-alerta" })}
                    ${montarCartaoResumoRelatorio({ icone: ICONES_RELATORIO_COLABORADORES.liberados, titulo: "Funções", valor: resumo.funcoes, classe: "kpi-ok" })}
                    ${montarCartaoResumoRelatorio({ icone: ICONES_RELATORIO_COLABORADORES.bloqueados, titulo: "Crítico", valor: resumo.vencidos, classe: "kpi-critico" })}
                </div>
            </section>

            <section class="bloco">
                <h2>Lista de pendências</h2>
                <div class="observacao-pendencias">
                    Este relatório apresenta apenas treinamentos pendentes, vencidos ou a vencer conforme a matriz aplicada por função.
                </div>
                <table class="tabela-pendencias-treinamentos">
                    <colgroup>
                        <col class="col-numero" />
                        <col class="col-colaborador" />
                        <col class="col-funcao" />
                        <col class="col-treinamento" />
                        <col class="col-situacao" />
                        <col class="col-vencimento" />
                        <col class="col-base" />
                    </colgroup>
                    <thead>
                        <tr>
                            <th><div class="th-conteudo">#</div></th>
                            <th><div class="th-conteudo">Colaborador</div></th>
                            <th><div class="th-conteudo">Função</div></th>
                            <th><div class="th-conteudo">Treinamento</div></th>
                            <th><div class="th-conteudo">Situação</div></th>
                            <th><div class="th-conteudo">Vencimento</div></th>
                            <th><div class="th-conteudo">Base</div></th>
                        </tr>
                    </thead>
                    <tbody>
                        ${linhasTabela || `<tr><td colspan="7">Nenhuma pendência encontrada.</td></tr>`}
                    </tbody>
                </table>
            </section>

            <footer class="rodape-relatorio">
                <span>🛡 Controle SST QR</span>
                <span>Relatório visual por empresa</span>
            </footer>
        </section>
    `;
}

export async function baixarRelatorioColaboradoresTreinamentosPDF({
    nomeArquivo = "relatorio-colaboradores-treinamentos.pdf",
    colaboradores = [],
    titulo = "Relatório de colaboradores e treinamentos",
} = {}) {
    const dataEmissao = new Date().toLocaleDateString("pt-BR");
    const colaboradoresPreparados = await prepararColaboradoresRelatorio(colaboradores);
    const empresas = agruparPorEmpresaRelatorio(colaboradoresPreparados);

    if (!empresas.length) {
        alert("Nenhum colaborador encontrado para gerar o relatório.");
        return;
    }

    const conteudo = empresas.map((empresa, indice) => montarSecaoEmpresaRelatorio(empresa, indice, dataEmissao)).join("");

    const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>${escaparHTML(titulo)}</title>
<style>
    :root {
        --azul: #064fae;
        --azul-escuro: #032b63;
        --linha: #d9e3f2;
        --texto: #0f172a;
        --suave: #f8fbff;
        --verde: #078a42;
        --laranja: #f28c00;
        --vermelho: #e01414;
        --roxo: #6d28d9;
    }

    * { box-sizing: border-box; }
    body {
        margin: 0;
        background: #eef4fb;
        color: var(--texto);
        font-family: Arial, Helvetica, sans-serif;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }

    .pagina-relatorio {
        width: 210mm;
        min-height: 297mm;
        margin: 16px auto;
        padding: 10mm;
        background: #fff;
        border: 1px solid #d8e2ef;
        border-radius: 18px;
        box-shadow: 0 12px 36px rgba(15, 23, 42, 0.12);
        position: relative;
    }

    .quebra-pagina { page-break-before: always; }

    .cabecalho-relatorio {
        display: grid;
        gap: 10px;
        margin-bottom: 14px;
        padding-top: 2px;
    }

    .cabecalho-relatorio--aniversariantes {
        gap: 9px;
    }

    .marca-relatorio-controle {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        text-align: left;
        flex-wrap: nowrap;
    }

    .escudo-controle-sst-relatorio {
        width: 34px;
        height: 34px;
        display: grid;
        place-items: center;
        flex: 0 0 auto;
        color: #07162f;
        background: transparent;
        border: 0;
        border-radius: 0;
        box-shadow: none;
    }

    .escudo-controle-sst-relatorio svg {
        width: 30px;
        height: 30px;
        display: block;
        fill: none;
        stroke: currentColor;
        stroke-width: 1.9;
        stroke-linecap: round;
        stroke-linejoin: round;
    }

    .marca-relatorio-controle__textos h1 {
        margin: 0;
        color: #07162f;
        font-size: 31px;
        line-height: 1.02;
        letter-spacing: 0.035em;
        text-transform: uppercase;
        font-weight: 900;
    }

    .data-emissao-cabecalho {
        display: inline-flex;
        align-items: baseline;
        gap: 3px;
        min-height: auto;
        margin-left: 3px;
        padding: 0 0 0 8px;
        border: 0;
        border-left: 1px solid #e2e8f0;
        border-radius: 0;
        background: transparent;
        color: #94a3b8;
        white-space: nowrap;
        transform: translateY(1px);
    }

    .data-emissao-cabecalho strong {
        display: inline;
        margin: 0;
        color: #94a3b8;
        font-size: 5.8px;
        line-height: 1;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.025em;
    }

    .data-emissao-cabecalho em {
        display: inline;
        margin: 0;
        color: #64748b;
        font-style: normal;
        font-size: 6.8px;
        line-height: 1;
        font-weight: 700;
    }

    .titulo-relatorio-cabecalho--aniversariantes {
        margin-top: 0;
    }

    .cabecalho-relatorio--modelo-aprovado .marca-empresa {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 16px;
        text-align: left;
    }

    .empresa-logo-img {
        width: 74px;
        height: 74px;
        object-fit: contain;
        border-radius: 10px;
    }

    .empresa-logo-fallback {
        width: 74px;
        height: 74px;
        display: grid;
        place-items: center;
        border: 3px solid var(--azul);
        color: var(--azul);
        border-radius: 16px;
        font-size: 26px;
        font-weight: 900;
    }

    .marca-empresa-textos {
        min-width: 0;
    }

    .marca-empresa h1 {
        margin: 0;
        color: #07162f;
        font-size: 31px;
        line-height: 1.02;
        letter-spacing: 0.035em;
        text-transform: uppercase;
    }

    .marca-empresa p {
        margin: 4px 0 0;
        color: var(--azul);
        font-size: 16px;
        font-weight: 900;
        letter-spacing: 0.16em;
        text-transform: uppercase;
    }

    .titulo-relatorio-cabecalho {
        display: grid;
        grid-template-columns: minmax(70px, 1fr) auto minmax(70px, 1fr);
        align-items: center;
        gap: 16px;
        margin-top: 2px;
    }

    .titulo-relatorio-cabecalho span {
        height: 2px;
        border-radius: 999px;
        background: linear-gradient(90deg, transparent, var(--azul), transparent);
    }

    .titulo-relatorio-cabecalho strong {
        color: #07162f;
        font-size: 15px;
        font-weight: 900;
        letter-spacing: 0.02em;
        text-transform: uppercase;
        white-space: nowrap;
    }

    .dados-empresa {
        display: grid;
        grid-template-columns: 1.08fr 1.28fr 1.42fr 0.96fr 0.98fr;
        gap: 0;
        align-items: center;
        border-bottom: 1px solid var(--linha);
        padding: 8px 0 10px;
    }

    .dados-empresa__item {
        display: grid;
        grid-template-columns: 20px minmax(0, 1fr);
        gap: 1px 7px;
        align-items: center;
        border-right: 1px solid var(--linha);
        min-height: 36px;
        padding: 0 9px;
        overflow: visible;
    }

    .dados-empresa__item:first-child {
        padding-left: 0;
    }

    .dados-empresa__item:last-child {
        border-right: 0;
        padding-right: 0;
    }

    .dados-empresa span {
        grid-row: span 2;
        display: grid;
        place-items: center;
        color: var(--azul);
    }

    .dados-empresa span svg {
        width: 20px;
        height: 20px;
        display: block;
        fill: none;
        stroke: currentColor;
        stroke-width: 1.85;
        stroke-linecap: round;
        stroke-linejoin: round;
    }

    .dados-empresa span svg * {
        fill: none;
        stroke: currentColor;
        stroke-width: 1.85;
        stroke-linecap: round;
        stroke-linejoin: round;
    }

    .dados-empresa strong {
        display: block;
        min-width: 0;
        font-size: 8.6px;
        line-height: 1.05;
        color: #334155;
        white-space: nowrap;
    }

    .dados-empresa em {
        display: block;
        min-width: 0;
        font-style: normal;
        font-size: 8.6px;
        line-height: 1.08;
        font-weight: 800;
        color: #0f172a;
        white-space: nowrap;
    }

    .dados-empresa__item--cnpj {
        grid-template-columns: 20px minmax(0, 1fr);
        padding-left: 9px;
        padding-right: 9px;
    }

    .dados-empresa__item--cnpj em {
        font-size: 8.6px;
        letter-spacing: -0.025em;
    }

    .dados-empresa__item--data {
        grid-template-columns: 20px minmax(0, 1fr);
        padding-left: 10px;
        padding-right: 10px;
    }

    .dados-empresa__item--data strong,
    .dados-empresa__item--data em {
        font-size: 8.4px;
    }

    .bloco {
        border: 1px solid var(--linha);
        border-radius: 14px;
        margin-top: 12px;
        overflow: hidden;
        background: #fff;
    }

    .bloco h2 {
        min-height: 42px;
        margin: 0;
        padding: 0 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--azul);
        font-size: 15px;
        text-align: center;
        text-transform: uppercase;
        letter-spacing: 0.02em;
        line-height: 1.1;
        background: #f8fbff;
        border-bottom: 1px solid var(--linha);
    }

    .kpis {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 10px;
        padding: 12px;
    }

    .kpi {
        min-height: 100px;
        display: grid;
        place-items: center;
        text-align: center;
        border: 1px solid var(--linha);
        border-radius: 10px;
        padding: 10px 6px;
        background: #fff;
    }

    .kpi-icone {
        display: grid;
        place-items: center;
        width: 34px;
        height: 34px;
        margin-bottom: 5px;
        color: var(--azul);
    }

    .kpi-icone svg {
        width: 34px;
        height: 34px;
        fill: currentColor;
        display: block;
    }

    .kpi-titulo {
        min-height: 26px;
        font-size: 10px;
        font-weight: 800;
    }

    .kpi-valor {
        font-size: 27px;
        font-weight: 900;
        color: #0f172a;
    }

    .kpi-total .kpi-icone,
    .kpi-info .kpi-icone { color: var(--azul); }

    .kpi-ok .kpi-icone { color: var(--verde); }
    .kpi-alerta .kpi-icone { color: var(--laranja); }
    .kpi-critico .kpi-icone,
    .kpi-vencido .kpi-icone { color: var(--vermelho); }
    .kpi-vencendo .kpi-icone { color: var(--roxo); }

    table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
        font-size: 10px;
    }

    .tabela-resumo-colaboradores .col-numero { width: 4%; }
    .tabela-resumo-colaboradores .col-colaborador { width: 27%; }
    .tabela-resumo-colaboradores .col-funcao { width: 15%; }
    .tabela-resumo-colaboradores .col-situacao { width: 13%; }
    .tabela-resumo-colaboradores .col-status { width: 17%; }
    .tabela-resumo-colaboradores .col-pendentes { width: 8%; }
    .tabela-resumo-colaboradores .col-vencidos { width: 8%; }
    .tabela-resumo-colaboradores .col-vencer { width: 8%; }

    thead tr {
        height: 46px;
    }

    thead th {
        background: linear-gradient(180deg, #075bbd, #033f88);
        color: #fff;
        height: 46px;
        padding: 0;
        border-right: 1px solid rgba(255,255,255,0.25);
        text-align: center;
        vertical-align: middle;
        line-height: 1;
        white-space: normal;
        overflow: hidden;
    }

    .th-conteudo {
        width: 100%;
        height: 46px;
        min-height: 46px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0 8px;
        box-sizing: border-box;
        text-align: center;
        line-height: 1.08;
        font-size: 9.4px;
        font-weight: 900;
        white-space: normal;
        overflow: hidden;
    }

    .tabela-resumo-colaboradores th:nth-child(6) .th-conteudo,
    .tabela-resumo-colaboradores th:nth-child(7) .th-conteudo,
    .tabela-resumo-colaboradores th:nth-child(8) .th-conteudo {
        padding-left: 10px;
        padding-right: 10px;
        font-size: 9px;
    }

    tbody td {
        height: 36px;
        padding: 7px 8px;
        border-bottom: 1px solid var(--linha);
        border-right: 1px solid var(--linha);
        text-align: center;
        vertical-align: middle;
        overflow: hidden;
        overflow-wrap: anywhere;
    }

    .tabela-resumo-colaboradores tbody td:nth-child(6),
    .tabela-resumo-colaboradores tbody td:nth-child(7),
    .tabela-resumo-colaboradores tbody td:nth-child(8) {
        padding-left: 10px;
        padding-right: 10px;
    }

    .tabela-resumo-colaboradores tbody .badge {
        display: inline;
        min-width: 0;
        margin-left: 0;
        margin-right: 0;
        padding: 0;
        background: transparent !important;
        border: 0 !important;
        border-radius: 0 !important;
        box-shadow: none !important;
        text-align: center;
        font-size: 10px;
        font-weight: 900;
        line-height: inherit;
        white-space: nowrap;
    }

    .tabela-resumo-colaboradores tbody td:nth-child(4) .badge,
    .tabela-resumo-colaboradores tbody td:nth-child(5) .badge {
        min-width: 0;
        padding: 0;
        background: transparent !important;
        border: 0 !important;
        border-radius: 0 !important;
    }

    tbody tr:nth-child(even) { background: #fbfdff; }

    .texto-forte {
        font-weight: 800;
        text-align: left;
        line-height: 1.15;
        overflow-wrap: anywhere;
    }

    .badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        padding: 4px 8px;
        font-size: 9px;
        font-weight: 900;
        white-space: nowrap;
    }

    .status-ok { background: #e9f9ef; color: var(--verde); }
    .status-alerta { background: #fff4df; color: var(--laranja); }
    .status-critico { background: #fff0f0; color: var(--vermelho); }
    .status-info { background: #eef5ff; color: var(--azul); }
    .status-neutro { background: #f1f5f9; color: #475569; }

    .bloco-detalhamento {
        border: 0;
        overflow: visible;
    }

    .detalhe-colaborador {
        border: 1px solid var(--linha);
        border-radius: 14px;
        margin-top: 12px;
        overflow: hidden;
        page-break-inside: avoid;
        background: #fff;
    }

    .detalhe-topo {
        display: grid;
        grid-template-columns: 34px 58px minmax(215px, 0.92fr) minmax(330px, 1.45fr);
        gap: 10px;
        align-items: center;
        padding: 12px;
        background: #fbfdff;
        border-bottom: 1px solid var(--linha);
    }

    .numero-colaborador {
        width: 26px;
        height: 26px;
        display: block;
        align-self: center;
        justify-self: center;
        padding: 0;
        line-height: 0;
    }

    .numero-colaborador svg {
        width: 26px;
        height: 26px;
        display: block;
        overflow: visible;
    }

    .numero-colaborador rect {
        fill: var(--azul);
    }

    .numero-colaborador text {
        fill: #fff;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 14px;
        font-weight: 900;
        line-height: 1;
    }

    .avatar-colaborador {
        width: 58px;
        height: 58px;
        display: grid;
        place-items: center;
        border-radius: 999px;
        background: #e2e8f0;
        color: #475569;
        font-weight: 900;
        font-size: 18px;
        overflow: hidden;
        border: 1px solid #d8e2ef;
    }

    .avatar-colaborador img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
    }

    .avatar-colaborador--foto {
        background: #fff;
        color: transparent;
    }

    .detalhe-identificacao {
        min-width: 0;
    }

    .detalhe-identificacao h3 {
        margin: 0 0 6px;
        color: var(--azul);
        font-size: 15px;
        text-transform: uppercase;
    }

    .detalhe-identificacao p,
    .detalhe-status p {
        margin: 3px 0;
        font-size: 10px;
    }

    .detalhe-status {
        display: grid;
        gap: 6px;
        border-left: 1px solid var(--linha);
        padding-left: 12px;
        min-width: 0;
        overflow: visible;
    }

    .detalhe-status-linha {
        display: flex;
        align-items: baseline;
        gap: 6px;
        min-width: 0;
        max-width: 100%;
        white-space: nowrap;
        font-size: 10px;
        line-height: 1.25;
        overflow: visible;
    }

    .detalhe-status-linha strong {
        flex: 0 0 auto;
        display: inline-block;
        font-weight: 900;
        color: #0f172a;
        white-space: nowrap;
    }

    .detalhe-status-linha span {
        flex: 0 1 auto;
        display: inline-block;
        min-width: 0;
        font-weight: 800;
        white-space: nowrap;
        overflow: visible;
        text-overflow: clip;
    }

    .detalhe-status-linha--empresa span {
        max-width: none;
        overflow: visible;
        text-overflow: clip;
    }

    .detalhe-status-valor {
        background: transparent !important;
        border: 0 !important;
        border-radius: 0 !important;
        padding: 0 !important;
        box-shadow: none !important;
        font-weight: 900 !important;
    }

    .detalhe-status-valor.status-ok { color: var(--verde) !important; }
    .detalhe-status-valor.status-alerta { color: var(--laranja) !important; }
    .detalhe-status-valor.status-critico { color: var(--vermelho) !important; }
    .detalhe-status-valor.status-info { color: var(--azul) !important; }
    .detalhe-status-valor.status-neutro { color: #475569 !important; }

    .detalhe-grids {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 10px;
        padding: 12px;
    }

    .lista-card {
        min-height: 132px;
        border: 1px solid var(--linha);
        border-radius: 10px;
        padding: 10px;
        background: #fff;
    }

    .lista-card h4 {
        margin: 0 0 8px;
        font-size: 11px;
        text-transform: uppercase;
    }

    .lista-card ul {
        margin: 0;
        padding-left: 16px;
    }

    .lista-card li {
        margin-bottom: 5px;
        font-size: 9px;
        line-height: 1.32;
    }

    .lista-card-ok h4 { color: var(--verde); }
    .lista-card-pendente h4 { color: var(--laranja); }
    .lista-card-vencido h4 { color: var(--vermelho); }
    .lista-card-vencendo h4 { color: var(--roxo); }

    .lista-vazia {
        margin: 0;
        color: #475569;
        font-size: 9px;
        line-height: 1.35;
    }

    .mais-itens {
        color: var(--azul);
        font-weight: 900;
    }

    .rodape-relatorio {
        display: flex;
        justify-content: space-between;
        margin-top: 14px;
        padding: 10px 14px;
        color: #fff;
        background: linear-gradient(90deg, #032b63, #075bbd);
        border-radius: 0 0 12px 12px;
        font-size: 11px;
        font-weight: 800;
    }

    @media print {
        @page { size: A4; margin: 8mm; }

        body { background: #fff; }

        .pagina-relatorio {
            width: auto;
            min-height: auto;
            margin: 0;
            padding: 0;
            border: 0;
            border-radius: 0;
            box-shadow: none;
        }

        .quebra-pagina { page-break-before: always; }
    }
</style>
</head>
<body>
${conteudo}
</body>
</html>`;

    await baixarRelatorioHtmlComoPdf({
        html,
        nomeArquivo,
    });
}


export async function baixarRelatorioPendenciasTreinamentosPDF({
    nomeArquivo = "relatorio-pendencias-treinamentos.pdf",
    pendencias = [],
    titulo = "Relatório de pendências de treinamentos",
} = {}) {
    const dataEmissao = new Date().toLocaleDateString("pt-BR");
    const empresas = agruparPendenciasPorEmpresaRelatorio(pendencias);

    if (!empresas.length) {
        alert("Nenhuma pendência encontrada para gerar o relatório.");
        return;
    }

    const conteudo = empresas.map((empresa, indice) => montarSecaoEmpresaPendenciasRelatorio(empresa, indice, dataEmissao)).join("");

    const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>${escaparHTML(titulo)}</title>
<style>
    :root {
        --azul: #064fae;
        --azul-escuro: #032b63;
        --linha: #d9e3f2;
        --texto: #0f172a;
        --suave: #f8fbff;
        --verde: #078a42;
        --laranja: #f28c00;
        --vermelho: #e01414;
        --roxo: #6d28d9;
    }

    * { box-sizing: border-box; }
    body {
        margin: 0;
        background: #eef4fb;
        color: var(--texto);
        font-family: Arial, Helvetica, sans-serif;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }

    .pagina-relatorio {
        width: 210mm;
        min-height: 297mm;
        margin: 16px auto;
        padding: 10mm;
        background: #fff;
        border: 1px solid #d8e2ef;
        border-radius: 18px;
        box-shadow: 0 12px 36px rgba(15, 23, 42, 0.12);
        position: relative;
    }

    .quebra-pagina { page-break-before: always; }

    .cabecalho-relatorio {
        display: grid;
        gap: 10px;
        margin-bottom: 14px;
        padding-top: 2px;
    }

    .cabecalho-relatorio--aniversariantes {
        gap: 9px;
    }

    .marca-relatorio-controle {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 14px;
        text-align: left;
    }

    .escudo-controle-sst-relatorio {
        width: 56px;
        height: 56px;
        display: grid;
        place-items: center;
        border-radius: 18px;
        background: #111827;
        color: #ffffff;
        flex: 0 0 auto;
        box-shadow: none;
        border: 0;
    }

    .escudo-controle-sst-relatorio svg {
        width: 28px;
        height: 28px;
        display: block;
        fill: none;
        stroke: currentColor;
        stroke-width: 1.9;
        stroke-linecap: round;
        stroke-linejoin: round;
    }

    .marca-relatorio-controle__textos h1 {
        margin: 0;
        color: #07162f;
        font-size: 31px;
        line-height: 1.02;
        letter-spacing: 0.035em;
        text-transform: uppercase;
        font-weight: 900;
    }

    .titulo-relatorio-cabecalho--aniversariantes {
        margin-top: 0;
    }

    .cabecalho-relatorio--modelo-aprovado .marca-empresa {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 16px;
        text-align: left;
    }

    .empresa-logo-img {
        width: 74px;
        height: 74px;
        object-fit: contain;
        border-radius: 10px;
    }

    .empresa-logo-fallback {
        width: 74px;
        height: 74px;
        display: grid;
        place-items: center;
        border: 3px solid var(--azul);
        color: var(--azul);
        border-radius: 16px;
        font-size: 26px;
        font-weight: 900;
    }

    .marca-empresa-textos {
        min-width: 0;
    }

    .marca-empresa h1 {
        margin: 0;
        color: #07162f;
        font-size: 31px;
        line-height: 1.02;
        letter-spacing: 0.035em;
        text-transform: uppercase;
    }

    .marca-empresa p {
        margin: 4px 0 0;
        color: var(--azul);
        font-size: 16px;
        font-weight: 900;
        letter-spacing: 0.16em;
        text-transform: uppercase;
    }

    .titulo-relatorio-cabecalho {
        display: grid;
        grid-template-columns: minmax(70px, 1fr) auto minmax(70px, 1fr);
        align-items: center;
        gap: 16px;
        margin-top: 2px;
    }

    .titulo-relatorio-cabecalho span {
        height: 2px;
        border-radius: 999px;
        background: linear-gradient(90deg, transparent, var(--azul), transparent);
    }

    .titulo-relatorio-cabecalho strong {
        color: #07162f;
        font-size: 15px;
        font-weight: 900;
        letter-spacing: 0.02em;
        text-transform: uppercase;
        white-space: nowrap;
    }

    .dados-empresa {
        display: grid;
        grid-template-columns: 1.08fr 1.28fr 1.42fr 0.96fr 0.98fr;
        gap: 0;
        align-items: center;
        border-bottom: 1px solid var(--linha);
        padding: 8px 0 10px;
    }

    .dados-empresa__item {
        display: grid;
        grid-template-columns: 20px minmax(0, 1fr);
        gap: 1px 7px;
        align-items: center;
        border-right: 1px solid var(--linha);
        min-height: 36px;
        padding: 0 9px;
        overflow: visible;
    }

    .dados-empresa__item:first-child {
        padding-left: 0;
    }

    .dados-empresa__item:last-child {
        border-right: 0;
        padding-right: 0;
    }

    .dados-empresa span {
        grid-row: span 2;
        display: grid;
        place-items: center;
        color: var(--azul);
    }

    .dados-empresa span svg {
        width: 20px;
        height: 20px;
        display: block;
        fill: none;
        stroke: currentColor;
        stroke-width: 1.85;
        stroke-linecap: round;
        stroke-linejoin: round;
    }

    .dados-empresa span svg * {
        fill: none;
        stroke: currentColor;
        stroke-width: 1.85;
        stroke-linecap: round;
        stroke-linejoin: round;
    }

    .dados-empresa strong {
        display: block;
        min-width: 0;
        font-size: 8.6px;
        line-height: 1.05;
        color: #334155;
        white-space: nowrap;
    }

    .dados-empresa em {
        display: block;
        min-width: 0;
        font-style: normal;
        font-size: 8.6px;
        line-height: 1.08;
        font-weight: 800;
        color: #0f172a;
        white-space: nowrap;
    }

    .dados-empresa__item--cnpj {
        grid-template-columns: 20px minmax(0, 1fr);
        padding-left: 9px;
        padding-right: 9px;
    }

    .dados-empresa__item--cnpj em {
        font-size: 8.6px;
        letter-spacing: -0.025em;
    }

    .dados-empresa__item--data {
        grid-template-columns: 20px minmax(0, 1fr);
        padding-left: 10px;
        padding-right: 10px;
    }

    .dados-empresa__item--data strong,
    .dados-empresa__item--data em {
        font-size: 8.4px;
    }

    .bloco {
        border: 1px solid var(--linha);
        border-radius: 14px;
        margin-top: 12px;
        overflow: hidden;
        background: #fff;
    }

    .bloco h2 {
        min-height: 42px;
        margin: 0;
        padding: 0 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--azul);
        font-size: 15px;
        text-align: center;
        text-transform: uppercase;
        letter-spacing: 0.02em;
        line-height: 1.1;
        background: #f8fbff;
        border-bottom: 1px solid var(--linha);
    }

    .kpis {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 10px;
        padding: 12px;
    }

    .kpi {
        min-height: 100px;
        display: grid;
        place-items: center;
        text-align: center;
        border: 1px solid var(--linha);
        border-radius: 10px;
        padding: 10px 6px;
        background: #fff;
    }

    .kpi-icone {
        display: grid;
        place-items: center;
        width: 34px;
        height: 34px;
        margin-bottom: 5px;
        color: var(--azul);
    }

    .kpi-icone svg {
        width: 34px;
        height: 34px;
        fill: currentColor;
        display: block;
    }

    .kpi-titulo {
        min-height: 26px;
        font-size: 10px;
        font-weight: 800;
    }

    .kpi-valor {
        font-size: 27px;
        font-weight: 900;
        color: #0f172a;
    }

    .kpi-total .kpi-icone,
    .kpi-info .kpi-icone { color: var(--azul); }

    .kpi-ok .kpi-icone { color: var(--verde); }
    .kpi-alerta .kpi-icone { color: var(--laranja); }
    .kpi-critico .kpi-icone,
    .kpi-vencido .kpi-icone { color: var(--vermelho); }
    .kpi-vencendo .kpi-icone { color: var(--roxo); }

    table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
        font-size: 10px;
    }

    .tabela-resumo-colaboradores .col-numero { width: 4%; }
    .tabela-resumo-colaboradores .col-colaborador { width: 27%; }
    .tabela-resumo-colaboradores .col-funcao { width: 15%; }
    .tabela-resumo-colaboradores .col-situacao { width: 13%; }
    .tabela-resumo-colaboradores .col-status { width: 17%; }
    .tabela-resumo-colaboradores .col-pendentes { width: 8%; }
    .tabela-resumo-colaboradores .col-vencidos { width: 8%; }
    .tabela-resumo-colaboradores .col-vencer { width: 8%; }

    thead tr {
        height: 46px;
    }

    thead th {
        background: linear-gradient(180deg, #075bbd, #033f88);
        color: #fff;
        height: 46px;
        padding: 0;
        border-right: 1px solid rgba(255,255,255,0.25);
        text-align: center;
        vertical-align: middle;
        line-height: 1;
        white-space: normal;
        overflow: hidden;
    }

    .th-conteudo {
        width: 100%;
        height: 46px;
        min-height: 46px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0 8px;
        box-sizing: border-box;
        text-align: center;
        line-height: 1.08;
        font-size: 9.4px;
        font-weight: 900;
        white-space: normal;
        overflow: hidden;
    }

    .tabela-resumo-colaboradores th:nth-child(6) .th-conteudo,
    .tabela-resumo-colaboradores th:nth-child(7) .th-conteudo,
    .tabela-resumo-colaboradores th:nth-child(8) .th-conteudo {
        padding-left: 10px;
        padding-right: 10px;
        font-size: 9px;
    }

    tbody td {
        height: 36px;
        padding: 7px 8px;
        border-bottom: 1px solid var(--linha);
        border-right: 1px solid var(--linha);
        text-align: center;
        vertical-align: middle;
        overflow: hidden;
        overflow-wrap: anywhere;
    }

    .tabela-resumo-colaboradores tbody td:nth-child(6),
    .tabela-resumo-colaboradores tbody td:nth-child(7),
    .tabela-resumo-colaboradores tbody td:nth-child(8) {
        padding-left: 10px;
        padding-right: 10px;
    }

    .tabela-resumo-colaboradores tbody .badge {
        display: inline;
        min-width: 0;
        margin-left: 0;
        margin-right: 0;
        padding: 0;
        background: transparent !important;
        border: 0 !important;
        border-radius: 0 !important;
        box-shadow: none !important;
        text-align: center;
        font-size: 10px;
        font-weight: 900;
        line-height: inherit;
        white-space: nowrap;
    }

    .tabela-resumo-colaboradores tbody td:nth-child(4) .badge,
    .tabela-resumo-colaboradores tbody td:nth-child(5) .badge {
        min-width: 0;
        padding: 0;
        background: transparent !important;
        border: 0 !important;
        border-radius: 0 !important;
    }

    tbody tr:nth-child(even) { background: #fbfdff; }

    .texto-forte {
        font-weight: 800;
        text-align: left;
        line-height: 1.15;
        overflow-wrap: anywhere;
    }

    .badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        padding: 4px 8px;
        font-size: 9px;
        font-weight: 900;
        white-space: nowrap;
    }

    .status-ok { background: #e9f9ef; color: var(--verde); }
    .status-alerta { background: #fff4df; color: var(--laranja); }
    .status-critico { background: #fff0f0; color: var(--vermelho); }
    .status-info { background: #eef5ff; color: var(--azul); }
    .status-neutro { background: #f1f5f9; color: #475569; }

    .bloco-detalhamento {
        border: 0;
        overflow: visible;
    }

    .detalhe-colaborador {
        border: 1px solid var(--linha);
        border-radius: 14px;
        margin-top: 12px;
        overflow: hidden;
        page-break-inside: avoid;
        background: #fff;
    }

    .detalhe-topo {
        display: grid;
        grid-template-columns: 34px 58px minmax(215px, 0.92fr) minmax(330px, 1.45fr);
        gap: 10px;
        align-items: center;
        padding: 12px;
        background: #fbfdff;
        border-bottom: 1px solid var(--linha);
    }

    .numero-colaborador {
        width: 26px;
        height: 26px;
        display: block;
        align-self: center;
        justify-self: center;
        padding: 0;
        line-height: 0;
    }

    .numero-colaborador svg {
        width: 26px;
        height: 26px;
        display: block;
        overflow: visible;
    }

    .numero-colaborador rect {
        fill: var(--azul);
    }

    .numero-colaborador text {
        fill: #fff;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 14px;
        font-weight: 900;
        line-height: 1;
    }

    .avatar-colaborador {
        width: 58px;
        height: 58px;
        display: grid;
        place-items: center;
        border-radius: 999px;
        background: #e2e8f0;
        color: #475569;
        font-weight: 900;
        font-size: 18px;
        overflow: hidden;
        border: 1px solid #d8e2ef;
    }

    .avatar-colaborador img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
    }

    .avatar-colaborador--foto {
        background: #fff;
        color: transparent;
    }

    .detalhe-identificacao {
        min-width: 0;
    }

    .detalhe-identificacao h3 {
        margin: 0 0 6px;
        color: var(--azul);
        font-size: 15px;
        text-transform: uppercase;
    }

    .detalhe-identificacao p,
    .detalhe-status p {
        margin: 3px 0;
        font-size: 10px;
    }

    .detalhe-status {
        display: grid;
        gap: 6px;
        border-left: 1px solid var(--linha);
        padding-left: 12px;
        min-width: 0;
        overflow: visible;
    }

    .detalhe-status-linha {
        display: flex;
        align-items: baseline;
        gap: 6px;
        min-width: 0;
        max-width: 100%;
        white-space: nowrap;
        font-size: 10px;
        line-height: 1.25;
        overflow: visible;
    }

    .detalhe-status-linha strong {
        flex: 0 0 auto;
        display: inline-block;
        font-weight: 900;
        color: #0f172a;
        white-space: nowrap;
    }

    .detalhe-status-linha span {
        flex: 0 1 auto;
        display: inline-block;
        min-width: 0;
        font-weight: 800;
        white-space: nowrap;
        overflow: visible;
        text-overflow: clip;
    }

    .detalhe-status-linha--empresa span {
        max-width: none;
        overflow: visible;
        text-overflow: clip;
    }

    .detalhe-status-valor {
        background: transparent !important;
        border: 0 !important;
        border-radius: 0 !important;
        padding: 0 !important;
        box-shadow: none !important;
        font-weight: 900 !important;
    }

    .detalhe-status-valor.status-ok { color: var(--verde) !important; }
    .detalhe-status-valor.status-alerta { color: var(--laranja) !important; }
    .detalhe-status-valor.status-critico { color: var(--vermelho) !important; }
    .detalhe-status-valor.status-info { color: var(--azul) !important; }
    .detalhe-status-valor.status-neutro { color: #475569 !important; }

    .detalhe-grids {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 10px;
        padding: 12px;
    }

    .lista-card {
        min-height: 132px;
        border: 1px solid var(--linha);
        border-radius: 10px;
        padding: 10px;
        background: #fff;
    }

    .lista-card h4 {
        margin: 0 0 8px;
        font-size: 11px;
        text-transform: uppercase;
    }

    .lista-card ul {
        margin: 0;
        padding-left: 16px;
    }

    .lista-card li {
        margin-bottom: 5px;
        font-size: 9px;
        line-height: 1.32;
    }

    .lista-card-ok h4 { color: var(--verde); }
    .lista-card-pendente h4 { color: var(--laranja); }
    .lista-card-vencido h4 { color: var(--vermelho); }
    .lista-card-vencendo h4 { color: var(--roxo); }

    .lista-vazia {
        margin: 0;
        color: #475569;
        font-size: 9px;
        line-height: 1.35;
    }

    .mais-itens {
        color: var(--azul);
        font-weight: 900;
    }

    .rodape-relatorio {
        display: flex;
        justify-content: space-between;
        margin-top: 14px;
        padding: 10px 14px;
        color: #fff;
        background: linear-gradient(90deg, #032b63, #075bbd);
        border-radius: 0 0 12px 12px;
        font-size: 11px;
        font-weight: 800;
    }

    @media print {
        @page { size: A4; margin: 8mm; }

        body { background: #fff; }

        .pagina-relatorio {
            width: auto;
            min-height: auto;
            margin: 0;
            padding: 0;
            border: 0;
            border-radius: 0;
            box-shadow: none;
        }

        .quebra-pagina { page-break-before: always; }
    }

    .tabela-pendencias-treinamentos .col-numero { width: 4%; }
    .tabela-pendencias-treinamentos .col-colaborador { width: 22%; }
    .tabela-pendencias-treinamentos .col-funcao { width: 14%; }
    .tabela-pendencias-treinamentos .col-treinamento { width: 22%; }
    .tabela-pendencias-treinamentos .col-situacao { width: 12%; }
    .tabela-pendencias-treinamentos .col-vencimento { width: 12%; }
    .tabela-pendencias-treinamentos .col-base { width: 14%; }

    .tabela-pendencias-treinamentos tbody .texto-forte {
        font-size: 9px;
    }

    .tabela-pendencias-treinamentos tbody .status-texto {
        display: inline;
        background: transparent !important;
        border: 0 !important;
        border-radius: 0 !important;
        padding: 0 !important;
        box-shadow: none !important;
        font-weight: 900;
        white-space: nowrap;
    }

    .status-texto.status-alerta { color: var(--laranja) !important; }
    .status-texto.status-critico { color: var(--vermelho) !important; }
    .status-texto.status-info { color: var(--azul) !important; }
    .status-texto.status-neutro { color: #475569 !important; }

    .observacao-pendencias {
        margin: 10px 12px 12px;
        padding: 10px 12px;
        border-radius: 12px;
        background: #f8fbff;
        border: 1px solid var(--linha);
        color: #334155;
        font-size: 10px;
        line-height: 1.45;
    }

</style>
</head>
<body>
${conteudo}
</body>
</html>`;

    await baixarRelatorioHtmlComoPdf({
        html,
        nomeArquivo,
    });
}

const MESES_RELATORIO_ANIVERSARIANTES = [
    { numero: 1, nome: "Janeiro", curto: "Jan" },
    { numero: 2, nome: "Fevereiro", curto: "Fev" },
    { numero: 3, nome: "Março", curto: "Mar" },
    { numero: 4, nome: "Abril", curto: "Abr" },
    { numero: 5, nome: "Maio", curto: "Mai" },
    { numero: 6, nome: "Junho", curto: "Jun" },
    { numero: 7, nome: "Julho", curto: "Jul" },
    { numero: 8, nome: "Agosto", curto: "Ago" },
    { numero: 9, nome: "Setembro", curto: "Set" },
    { numero: 10, nome: "Outubro", curto: "Out" },
    { numero: 11, nome: "Novembro", curto: "Nov" },
    { numero: 12, nome: "Dezembro", curto: "Dez" },
];

function obterNomeMesRelatorioAniversariantes(numeroMes = 0) {
    return MESES_RELATORIO_ANIVERSARIANTES.find((item) => item.numero === Number(numeroMes))?.nome || "-";
}

function obterIniciaisPessoaRelatorio(nome = "") {
    const partes = String(nome || "")
        .split(/\s+/)
        .map((item) => item.trim())
        .filter(Boolean);

    if (!partes.length) return "?";

    return partes
        .slice(0, 2)
        .map((item) => item[0])
        .join("")
        .toUpperCase();
}

function montarEscudoControleSstRelatorio() {
    return `
        <div class="escudo-controle-sst-relatorio" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
                <path d="M12 3.25 5.75 5.65v5.1c0 4.35 2.56 8.08 6.25 9.35 3.69-1.27 6.25-5 6.25-9.35v-5.1L12 3.25Z" />
                <path d="m9.4 11.85 1.75 1.75 3.7-4" />
            </svg>
        </div>
    `;
}

function calcularResumoAniversariantesRelatorio(aniversariantes = []) {
    const hoje = new Date();
    const mesAtual = hoje.getMonth() + 1;
    const totaisPorMes = MESES_RELATORIO_ANIVERSARIANTES.map((mes) => ({ ...mes, total: 0 }));

    aniversariantes.forEach((colaborador) => {
        const mes = Number(colaborador.mes || 0);
        const indice = mes - 1;

        if (indice >= 0 && indice < totaisPorMes.length) {
            totaisPorMes[indice].total += 1;
        }
    });

    const maiorTotal = Math.max(0, ...totaisPorMes.map((item) => item.total));
    const mesComMais = totaisPorMes.find((item) => item.total === maiorTotal && item.total > 0) || null;
    const aniversariantesMesAtual = totaisPorMes.find((item) => item.numero === mesAtual)?.total || 0;

    const proximo = [...aniversariantes]
        .filter((item) => Number.isFinite(Number(item.diasRestantes)))
        .sort((a, b) => Number(a.diasRestantes) - Number(b.diasRestantes))[0] || null;

    return {
        total: aniversariantes.length,
        mesAtual,
        aniversariantesMesAtual,
        totaisPorMes,
        maiorTotal,
        mesComMais,
        proximo,
    };
}

function montarGraficoAniversariantesRelatorio(totaisPorMes = [], maiorTotal = 0) {
    return `
        <div class="grafico-aniversariantes">
            ${totaisPorMes.map((item) => {
                const altura = maiorTotal > 0 ? Math.max(18, Math.round((item.total / maiorTotal) * 92)) : 18;

                return `
                    <div class="grafico-mes">
                        <strong>${escaparHTML(item.total)}</strong>
                        <div class="grafico-barra" style="height:${altura}px"></div>
                        <span>${escaparHTML(item.curto)}</span>
                    </div>
                `;
            }).join("")}
        </div>
    `;
}

function montarLinhaAniversarianteRelatorio(colaborador = {}, indice = 0) {
    const fotoColaborador = colaborador.fotoUrl
        ? `<img src="${escaparHTML(colaborador.fotoUrl)}" alt="Foto ${escaparHTML(colaborador.nome || "colaborador")}" />`
        : escaparHTML(obterIniciaisPessoaRelatorio(colaborador.nome || "C"));

    return `
        <tr>
            <td>${indice + 1}</td>
            <td class="coluna-colaborador-aniversario">
                <div class="colaborador-aniversario-identificacao">
                    <div class="avatar-aniversariante ${colaborador.fotoUrl ? "avatar-aniversariante--foto" : ""}">${fotoColaborador}</div>
                    <div>
                        <strong>${escaparHTML(colaborador.nome || "-")}</strong>
                        <span>${escaparHTML(colaborador.empresaExibicao || colaborador.empresaNome || "Empresa não informada")}</span>
                    </div>
                </div>
            </td>
            <td>${escaparHTML(colaborador.funcao || "-")}</td>
            <td>${escaparHTML(colaborador.dataNascimento || "-")}</td>
            <td>${escaparHTML(colaborador.dia || "-")}</td>
            <td>${escaparHTML(colaborador.mesNome || obterNomeMesRelatorioAniversariantes(colaborador.mes))}</td>
            <td>${escaparHTML(colaborador.proximoAniversario || "-")}</td>
            <td><span class="status-texto ${classeStatusRelatorio(colaborador.statusGeral)}">${escaparHTML(colaborador.statusGeral || "-")}</span></td>
        </tr>
    `;
}

function montarSecaoAniversariantesRelatorio({ aniversariantes = [], filtros = {}, dataEmissao = "", titulo = "Relatório de aniversariantes" } = {}) {
    const resumo = calcularResumoAniversariantesRelatorio(aniversariantes);
    const linhasTabela = aniversariantes.map((colaborador, indice) => montarLinhaAniversarianteRelatorio(colaborador, indice)).join("");
    return `
        <section class="pagina-relatorio pagina-relatorio-aniversariantes">
            <header class="cabecalho-relatorio cabecalho-relatorio--modelo-aprovado cabecalho-relatorio--aniversariantes">
                <div class="cabecalho-aniversariantes-centralizado">
                    <div class="cabecalho-aniversariantes-marca">
                        ${montarEscudoControleSstRelatorio()}
                        <h1>CONTROLE SST QR</h1>
                    </div>
                    <h2>${escaparHTML(titulo)}</h2>
                    <p><span>Data de emissão:</span> <strong>${escaparHTML(dataEmissao)}</strong></p>
                </div>
            </header>

            <section class="bloco bloco-filtros-aniversariantes">
                <h2>Filtros aplicados</h2>
                <div class="filtros-relatorio-aniversariantes">
                    <div><strong>Mês:</strong><span>${escaparHTML(filtros.mes || "Todos os meses")}</span></div>
                    <div><strong>Empresa:</strong><span>${escaparHTML(filtros.empresa || "Todas")}</span></div>
                    <div><strong>Função:</strong><span>${escaparHTML(filtros.funcao || "Todas")}</span></div>
                    <div><strong>Status:</strong><span>${escaparHTML(filtros.status || "Todos")}</span></div>
                    <div><strong>Busca:</strong><span>${escaparHTML(filtros.busca || "-")}</span></div>
                </div>
            </section>

            <section class="bloco">
                <h2>Aniversariantes por mês</h2>
                ${montarGraficoAniversariantesRelatorio(resumo.totaisPorMes, resumo.maiorTotal)}
            </section>

            <section class="bloco">
                <h2>Lista de aniversariantes</h2>
                <table class="tabela-aniversariantes-relatorio">
                    <colgroup>
                        <col class="col-numero" />
                        <col class="col-colaborador" />
                        <col class="col-funcao" />
                        <col class="col-nascimento" />
                        <col class="col-dia" />
                        <col class="col-mes" />
                        <col class="col-proximo" />
                        <col class="col-status" />
                    </colgroup>
                    <thead>
                        <tr>
                            <th><div class="th-conteudo">#</div></th>
                            <th><div class="th-conteudo">Colaborador</div></th>
                            <th><div class="th-conteudo">Função</div></th>
                            <th><div class="th-conteudo">Data de nascimento</div></th>
                            <th><div class="th-conteudo">Dia</div></th>
                            <th><div class="th-conteudo">Mês</div></th>
                            <th><div class="th-conteudo">Próximo aniversário</div></th>
                            <th><div class="th-conteudo">Status</div></th>
                        </tr>
                    </thead>
                    <tbody>
                        ${linhasTabela || `<tr><td colspan="8">Nenhum aniversariante encontrado.</td></tr>`}
                    </tbody>
                </table>
            </section>

            <footer class="rodape-relatorio">
                <span>🛡 Controle SST QR</span>
                <span>Relatório visual de aniversariantes</span>
            </footer>
        </section>
    `;
}

export async function baixarRelatorioAniversariantesPDF({
    nomeArquivo = "relatorio-aniversariantes.pdf",
    aniversariantes = [],
    titulo = "Relatório de aniversariantes",
    filtros = {},
} = {}) {
    const dataEmissao = new Date().toLocaleDateString("pt-BR");
    const aniversariantesPreparados = await prepararColaboradoresRelatorio(aniversariantes);

    if (!aniversariantesPreparados.length) {
        alert("Nenhum aniversariante encontrado para gerar o relatório.");
        return;
    }

    const conteudo = montarSecaoAniversariantesRelatorio({
        aniversariantes: aniversariantesPreparados,
        filtros,
        dataEmissao,
        titulo,
    });

    const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>${escaparHTML(titulo)}</title>
<style>
    :root {
        --azul: #064fae;
        --azul-escuro: #032b63;
        --linha: #d9e3f2;
        --texto: #0f172a;
        --suave: #f8fbff;
        --verde: #078a42;
        --laranja: #f28c00;
        --vermelho: #e01414;
        --roxo: #6d28d9;
    }

    * { box-sizing: border-box; }
    body {
        margin: 0;
        background: #eef4fb;
        color: var(--texto);
        font-family: Arial, Helvetica, sans-serif;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }

    .pagina-relatorio {
        width: 210mm;
        min-height: 297mm;
        margin: 16px auto;
        padding: 10mm;
        background: #fff;
        border: 1px solid #d8e2ef;
        border-radius: 18px;
        box-shadow: 0 12px 36px rgba(15, 23, 42, 0.12);
        position: relative;
    }

    .cabecalho-relatorio {
        display: grid;
        gap: 10px;
        margin-bottom: 14px;
        padding-top: 2px;
    }

    .cabecalho-relatorio--aniversariantes {
        gap: 9px;
    }

    .cabecalho-aniversariantes-centralizado {
        display: grid;
        justify-items: center;
        gap: 10px;
        text-align: center;
        padding: 0 0 8px;
    }

    .cabecalho-aniversariantes-marca {
        width: 100%;
        max-width: 560px;
        display: grid;
        grid-template-columns: 40px auto 40px;
        align-items: center;
        justify-content: center;
        column-gap: 6px;
        margin-top: 0;
        transform: translateX(3px);
    }

    .cabecalho-aniversariantes-marca .escudo-controle-sst-relatorio {
        width: 34px;
        height: 34px;
        display: grid;
        place-items: center;
        justify-self: end;
        color: #ffffff;
        background: #111827;
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: 12px;
        box-shadow: inset 0 0 0 1px rgba(255,255,255,0.04);
        flex: 0 0 auto;
    }

    .cabecalho-aniversariantes-marca .escudo-controle-sst-relatorio svg {
        width: 22px;
        height: 22px;
        display: block;
        fill: none;
        stroke: currentColor;
        stroke-width: 1.9;
        stroke-linecap: round;
        stroke-linejoin: round;
    }

    .cabecalho-aniversariantes-centralizado h1 {
        margin: 0;
        color: #07162f;
        font-size: 31px;
        line-height: 1;
        letter-spacing: 0.035em;
        text-transform: uppercase;
        font-weight: 900;
        grid-column: 2;
        text-align: center;
    }

    .cabecalho-aniversariantes-centralizado h2 {
        width: 100%;
        margin: 2px 0 0;
        display: grid;
        grid-template-columns: minmax(112px, 1fr) auto minmax(112px, 1fr);
        align-items: center;
        gap: 14px;
        color: var(--azul);
        font-size: 15px;
        line-height: 1;
        font-weight: 900;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        white-space: nowrap;
    }

    .cabecalho-aniversariantes-centralizado h2::before,
    .cabecalho-aniversariantes-centralizado h2::after {
        content: "";
        height: 2px;
        border-radius: 999px;
        background: linear-gradient(90deg, transparent, var(--azul), transparent);
    }

    .cabecalho-aniversariantes-centralizado p {
        margin: 0;
        color: #94a3b8;
        font-size: 6.8px;
        line-height: 1;
        font-weight: 700;
        letter-spacing: 0.02em;
        text-transform: uppercase;
    }

    .cabecalho-aniversariantes-centralizado p span {
        color: #94a3b8;
        font-weight: 700;
    }

    .cabecalho-aniversariantes-centralizado p strong {
        color: #64748b;
        font-weight: 800;
    }

    .cabecalho-relatorio--modelo-aprovado .marca-empresa {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 16px;
        text-align: left;
    }

    .empresa-logo-img {
        width: 74px;
        height: 74px;
        object-fit: contain;
        border-radius: 10px;
    }

    .empresa-logo-fallback {
        width: 74px;
        height: 74px;
        display: grid;
        place-items: center;
        border: 3px solid var(--azul);
        color: var(--azul);
        border-radius: 16px;
        font-size: 26px;
        font-weight: 900;
    }

    .marca-empresa-textos {
        min-width: 0;
    }

    .marca-empresa h1 {
        margin: 0;
        color: #07162f;
        font-size: 31px;
        line-height: 1.02;
        letter-spacing: 0.035em;
        text-transform: uppercase;
    }

    .marca-empresa p {
        margin: 4px 0 0;
        color: var(--azul);
        font-size: 16px;
        font-weight: 900;
        letter-spacing: 0.16em;
        text-transform: uppercase;
    }

    .titulo-relatorio-cabecalho {
        display: grid;
        grid-template-columns: minmax(70px, 1fr) auto minmax(70px, 1fr);
        align-items: center;
        gap: 16px;
        margin-top: 2px;
    }

    .titulo-relatorio-cabecalho span {
        height: 2px;
        border-radius: 999px;
        background: linear-gradient(90deg, transparent, var(--azul), transparent);
    }

    .titulo-relatorio-cabecalho strong {
        color: #07162f;
        font-size: 15px;
        font-weight: 900;
        letter-spacing: 0.02em;
        text-transform: uppercase;
        white-space: nowrap;
    }

    .dados-empresa {
        display: grid;
        grid-template-columns: 1.08fr 1.28fr 1.42fr 0.96fr 0.98fr;
        gap: 0;
        align-items: center;
        border-bottom: 1px solid var(--linha);
        padding: 8px 0 10px;
    }

    .dados-empresa__item {
        display: grid;
        grid-template-columns: 20px minmax(0, 1fr);
        gap: 1px 7px;
        align-items: center;
        border-right: 1px solid var(--linha);
        min-height: 36px;
        padding: 0 9px;
        overflow: visible;
    }

    .dados-empresa__item:first-child { padding-left: 0; }
    .dados-empresa__item:last-child { border-right: 0; padding-right: 0; }

    .dados-empresa span {
        grid-row: span 2;
        display: grid;
        place-items: center;
        color: var(--azul);
    }

    .dados-empresa span svg {
        width: 18px;
        height: 18px;
        display: block;
        fill: none;
        stroke: currentColor;
        stroke-width: 1.85;
        stroke-linecap: round;
        stroke-linejoin: round;
    }

    .dados-empresa span svg * {
        fill: none;
        stroke: currentColor;
        stroke-width: 1.85;
        stroke-linecap: round;
        stroke-linejoin: round;
    }

    .dados-empresa strong {
        display: block;
        min-width: 0;
        font-size: 8.6px;
        line-height: 1.05;
        color: #334155;
        white-space: nowrap;
    }

    .dados-empresa em {
        display: block;
        min-width: 0;
        font-style: normal;
        font-size: 8.6px;
        line-height: 1.08;
        font-weight: 800;
        color: #0f172a;
        white-space: nowrap;
    }

    .dados-empresa__item--cnpj {
        grid-template-columns: 18px minmax(0, 1fr);
        padding-left: 10px;
    }

    .dados-empresa__item--cnpj span svg {
        width: 16px;
        height: 16px;
    }

    .bloco {
        border: 1px solid var(--linha);
        border-radius: 14px;
        margin-top: 12px;
        overflow: hidden;
        background: #fff;
    }

    .bloco h2 {
        min-height: 42px;
        margin: 0;
        padding: 0 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--azul);
        font-size: 15px;
        text-align: center;
        text-transform: uppercase;
        letter-spacing: 0.02em;
        line-height: 1.1;
        background: #f8fbff;
        border-bottom: 1px solid var(--linha);
    }

    .filtros-relatorio-aniversariantes {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 8px;
        padding: 12px;
    }

    .filtros-relatorio-aniversariantes div {
        min-height: 54px;
        display: grid;
        align-content: center;
        gap: 4px;
        border: 1px solid var(--linha);
        border-radius: 10px;
        background: #fbfdff;
        padding: 8px;
        text-align: center;
    }

    .filtros-relatorio-aniversariantes strong {
        color: #334155;
        font-size: 9px;
        text-transform: uppercase;
    }

    .filtros-relatorio-aniversariantes span {
        color: #0f172a;
        font-size: 10px;
        font-weight: 900;
        overflow-wrap: anywhere;
    }

    .kpis {
        display: grid;
        grid-template-columns: repeat(6, 1fr);
        gap: 10px;
        padding: 12px;
    }

    .kpi {
        min-height: 104px;
        display: grid;
        place-items: center;
        text-align: center;
        border: 1px solid var(--linha);
        border-radius: 10px;
        padding: 10px 6px;
        background: #fff;
    }

    .kpi-icone {
        display: grid;
        place-items: center;
        width: 34px;
        height: 34px;
        margin-bottom: 5px;
        color: var(--azul);
    }

    .kpi-icone svg {
        width: 34px;
        height: 34px;
        fill: currentColor;
        display: block;
    }

    .kpi-titulo {
        min-height: 26px;
        font-size: 9.5px;
        font-weight: 800;
    }

    .kpi-valor {
        font-size: 20px;
        font-weight: 900;
        color: #0f172a;
        line-height: 1.08;
        overflow-wrap: anywhere;
    }

    .kpi-total .kpi-icone,
    .kpi-info .kpi-icone { color: var(--azul); }
    .kpi-ok .kpi-icone { color: var(--verde); }
    .kpi-alerta .kpi-icone { color: var(--laranja); }
    .kpi-critico .kpi-icone,
    .kpi-vencido .kpi-icone { color: var(--vermelho); }
    .kpi-vencendo .kpi-icone { color: var(--roxo); }

    .grafico-aniversariantes {
        display: grid;
        grid-template-columns: repeat(12, 1fr);
        align-items: end;
        gap: 8px;
        padding: 28px 14px 14px;
        min-height: 174px;
        background: linear-gradient(180deg, #fff, #fbfdff);
    }

    .grafico-mes {
        display: grid;
        justify-items: center;
        align-items: end;
        gap: 13px;
        min-width: 0;
    }

    .grafico-mes strong {
        display: block;
        color: #07162f;
        font-size: 11px;
        line-height: 1;
        margin-bottom: 8px;
    }

    .grafico-barra {
        width: 22px;
        border-radius: 11px 11px 4px 4px;
        background: linear-gradient(180deg, #0b78e3, #064fae);
        border: 1px solid #075bbd;
        box-shadow: 0 6px 14px rgba(6, 79, 174, 0.18);
    }

    .grafico-mes span {
        color: #475569;
        font-size: 9px;
        font-weight: 900;
    }

    table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
        font-size: 9.5px;
    }

    .tabela-aniversariantes-relatorio .col-numero { width: 4%; }
    .tabela-aniversariantes-relatorio .col-colaborador { width: 27%; }
    .tabela-aniversariantes-relatorio .col-funcao { width: 13%; }
    .tabela-aniversariantes-relatorio .col-nascimento { width: 13%; }
    .tabela-aniversariantes-relatorio .col-dia { width: 6%; }
    .tabela-aniversariantes-relatorio .col-mes { width: 10%; }
    .tabela-aniversariantes-relatorio .col-proximo { width: 12%; }
    .tabela-aniversariantes-relatorio .col-status { width: 15%; }

    thead tr { height: 56px; }

    thead th {
        background: linear-gradient(180deg, #075bbd, #033f88);
        color: #fff;
        height: 56px;
        padding: 0;
        border-right: 1px solid rgba(255,255,255,0.25);
        text-align: center;
        vertical-align: middle;
        line-height: 1;
        white-space: normal;
        overflow: hidden;
    }

    .th-conteudo {
        width: 100%;
        height: 56px;
        min-height: 56px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0 8px;
        box-sizing: border-box;
        text-align: center;
        line-height: 1.12;
        font-size: 8.8px;
        font-weight: 900;
        white-space: normal;
        overflow: hidden;
    }

    tbody td {
        height: 42px;
        padding: 7px 7px;
        border-bottom: 1px solid var(--linha);
        border-right: 1px solid var(--linha);
        text-align: center;
        vertical-align: middle;
        overflow: hidden;
        overflow-wrap: anywhere;
    }

    tbody tr:nth-child(even) { background: #fbfdff; }

    .coluna-colaborador-aniversario {
        text-align: left;
    }

    .colaborador-aniversario-identificacao {
        display: grid;
        grid-template-columns: 38px minmax(0, 1fr);
        align-items: center;
        gap: 8px;
    }

    .colaborador-aniversario-identificacao strong {
        display: block;
        color: #0f172a;
        font-size: 9.5px;
        font-weight: 900;
        line-height: 1.16;
        overflow-wrap: anywhere;
    }

    .colaborador-aniversario-identificacao span {
        display: block;
        margin-top: 2px;
        color: #475569;
        font-size: 8.4px;
        font-weight: 700;
        line-height: 1.1;
        overflow-wrap: anywhere;
    }

    .avatar-aniversariante {
        width: 38px;
        height: 38px;
        display: grid;
        place-items: center;
        border-radius: 999px;
        background: #e2e8f0;
        color: #475569;
        font-weight: 900;
        font-size: 12px;
        overflow: hidden;
        border: 1px solid #d8e2ef;
    }

    .avatar-aniversariante img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
    }

    .avatar-aniversariante--foto {
        background: #fff;
        color: transparent;
    }

    .status-texto {
        display: inline;
        background: transparent !important;
        border: 0 !important;
        border-radius: 0 !important;
        padding: 0 !important;
        box-shadow: none !important;
        font-weight: 900;
        white-space: nowrap;
    }

    .status-texto.status-ok { color: var(--verde) !important; }
    .status-texto.status-alerta { color: var(--laranja) !important; }
    .status-texto.status-critico { color: var(--vermelho) !important; }
    .status-texto.status-info { color: var(--azul) !important; }
    .status-texto.status-neutro { color: #475569 !important; }

    .rodape-relatorio {
        display: flex;
        justify-content: space-between;
        margin-top: 14px;
        padding: 10px 14px;
        color: #fff;
        background: linear-gradient(90deg, #032b63, #075bbd);
        border-radius: 0 0 12px 12px;
        font-size: 11px;
        font-weight: 800;
    }

    @media print {
        @page { size: A4; margin: 8mm; }
        body { background: #fff; }
        .pagina-relatorio {
            width: auto;
            min-height: auto;
            margin: 0;
            padding: 0;
            border: 0;
            border-radius: 0;
            box-shadow: none;
        }
    }
</style>
</head>
<body>
${conteudo}
</body>
</html>`;

    await baixarRelatorioHtmlComoPdf({
        html,
        nomeArquivo,
    });
}
