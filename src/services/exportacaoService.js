// Serviços de exportação CSV/PDF do sistema SST.
import { supabase } from "../lib/supabaseClient";
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
                    <div class="numero-colaborador">${indice + 1}</div>
                    <div class="avatar-colaborador ${colaborador.fotoUrl ? "avatar-colaborador--foto" : ""}">${fotoColaborador}</div>
                    <div class="detalhe-identificacao">
                        <h3>${escaparHTML(colaborador.nome || "-")}</h3>
                        <p><strong>Código:</strong> ${escaparHTML(colaborador.codigo || "-")}</p>
                        <p><strong>Função:</strong> ${escaparHTML(colaborador.funcao || "-")}</p>
                        <p><strong>Matriz aplicada:</strong> ${escaparHTML(colaborador.matriz || "-")}</p>
                    </div>
                    <div class="detalhe-status">
                        <p><strong>Empresa:</strong> ${escaparHTML(colaborador.empresaExibicao || colaborador.empresaNome || empresa.nome || "-")}</p>
                        <p><strong>Situação na obra:</strong> <span class="badge ${classeStatusRelatorio(colaborador.statusMobilizacao)}">${escaparHTML(colaborador.statusMobilizacao || "-")}</span></p>
                        <p><strong>Status geral:</strong> <span class="badge ${classeStatusRelatorio(colaborador.statusGeral)}">${escaparHTML(colaborador.statusGeral || "-")}</span></p>
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
                <table>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Colaborador</th>
                            <th>Função</th>
                            <th>Situação na obra</th>
                            <th>Status geral</th>
                            <th>Pendentes</th>
                            <th>Vencidos</th>
                            <th>A vencer</th>
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


function textoPdfRelatorio(valor) {
    const texto = limparTextoPDF(valor);
    return texto ? texto : "-";
}

function escaparStringPdfRelatorio(valor) {
    return textoPdfRelatorio(valor).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function bytesAsciiRelatorio(texto) {
    const bytes = new Uint8Array(String(texto).length);
    for (let i = 0; i < bytes.length; i += 1) {
        bytes[i] = String(texto).charCodeAt(i) & 0xff;
    }
    return bytes;
}

function concatenarBytesRelatorio(partes = []) {
    const total = partes.reduce((soma, parte) => soma + parte.length, 0);
    const saida = new Uint8Array(total);
    let offset = 0;

    partes.forEach((parte) => {
        saida.set(parte, offset);
        offset += parte.length;
    });

    return saida;
}

function base64ParaBytesRelatorio(base64 = "") {
    const binario = window.atob(base64);
    const bytes = new Uint8Array(binario.length);

    for (let i = 0; i < binario.length; i += 1) {
        bytes[i] = binario.charCodeAt(i);
    }

    return bytes;
}

function carregarImagemElementoRelatorio(src) {
    return new Promise((resolve) => {
        const imagem = new Image();
        imagem.crossOrigin = "anonymous";

        imagem.onload = () => resolve(imagem);
        imagem.onerror = () => resolve(null);
        imagem.src = src;
    });
}

async function carregarImagemJpegRelatorio(url, tamanhoMaximo = 180) {
    const endereco = String(url || "").trim();
    if (!endereco) return null;

    try {
        const resposta = await fetch(endereco, { mode: "cors", cache: "no-store" });
        if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);

        const blob = await resposta.blob();
        const objectUrl = URL.createObjectURL(blob);
        const imagem = await carregarImagemElementoRelatorio(objectUrl);
        URL.revokeObjectURL(objectUrl);

        if (!imagem) return null;

        const escala = Math.min(1, tamanhoMaximo / Math.max(imagem.naturalWidth || 1, imagem.naturalHeight || 1));
        const largura = Math.max(1, Math.round((imagem.naturalWidth || 1) * escala));
        const altura = Math.max(1, Math.round((imagem.naturalHeight || 1) * escala));

        const canvas = document.createElement("canvas");
        canvas.width = largura;
        canvas.height = altura;

        const contexto = canvas.getContext("2d");
        contexto.fillStyle = "#ffffff";
        contexto.fillRect(0, 0, largura, altura);
        contexto.drawImage(imagem, 0, 0, largura, altura);

        const dataUrl = canvas.toDataURL("image/jpeg", 0.86);
        const base64 = dataUrl.split(",")[1] || "";

        return {
            bytes: base64ParaBytesRelatorio(base64),
            width: largura,
            height: altura,
        };
    } catch (error) {
        console.warn("Não foi possível carregar imagem para o PDF:", error?.message || error);
        return null;
    }
}

function criarDocumentoPdfRelatorio() {
    const largura = 595;
    const altura = 842;
    const objetos = [];
    const paginas = [];
    const cacheImagem = new Map();

    const adicionarObjeto = (conteudo) => {
        const bytes = typeof conteudo === "string" ? bytesAsciiRelatorio(conteudo) : conteudo;
        objetos.push(bytes);
        return objetos.length;
    };

    const adicionarImagem = async (url, tamanhoMaximo = 180) => {
        const chave = String(url || "").trim();
        if (!chave) return null;
        if (cacheImagem.has(chave)) return cacheImagem.get(chave);

        const imagem = await carregarImagemJpegRelatorio(chave, tamanhoMaximo);
        if (!imagem) {
            cacheImagem.set(chave, null);
            return null;
        }

        const id = objetos.length + 1;
        const nome = `Im${id}`;
        const objetoImagem = concatenarBytesRelatorio([
            bytesAsciiRelatorio(`<< /Type /XObject /Subtype /Image /Width ${imagem.width} /Height ${imagem.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imagem.bytes.length} >>\nstream\n`),
            imagem.bytes,
            bytesAsciiRelatorio("\nendstream"),
        ]);

        adicionarObjeto(objetoImagem);

        const registro = {
            id,
            nome,
            width: imagem.width,
            height: imagem.height,
        };

        cacheImagem.set(chave, registro);
        return registro;
    };

    const novaPagina = () => {
        const pagina = {
            comandos: [],
            imagens: new Map(),
        };
        paginas.push(pagina);
        return pagina;
    };

    const cor = (r, g, b) => `${r} ${g} ${b}`;
    const yPdf = (y) => altura - y;

    const texto = (pagina, x, y, valor, tamanho = 9, fonte = "F1", rgb = [0, 0, 0]) => {
        pagina.comandos.push(
            `BT ${cor(...rgb)} rg /${fonte} ${tamanho} Tf ${x} ${yPdf(y)} Td (${escaparStringPdfRelatorio(valor)}) Tj ET`
        );
    };

    const textoCentro = (pagina, x, y, valor, tamanho = 9, fonte = "F1", rgb = [0, 0, 0]) => {
        const txt = textoPdfRelatorio(valor);
        const larguraEstimada = txt.length * tamanho * 0.48;
        texto(pagina, x - larguraEstimada / 2, y, txt, tamanho, fonte, rgb);
    };

    const retangulo = (pagina, x, y, w, h, rgb = [1, 1, 1], stroke = null, lw = 0.7) => {
        const comandoStroke = stroke
            ? `${lw} w ${cor(...stroke)} RG ${x} ${yPdf(y + h)} ${w} ${h} re B`
            : `${x} ${yPdf(y + h)} ${w} ${h} re f`;

        pagina.comandos.push(`q ${cor(...rgb)} rg ${comandoStroke} Q`);
    };

    const linha = (pagina, x1, y1, x2, y2, rgb = [0.78, 0.84, 0.92], lw = 0.8) => {
        pagina.comandos.push(`q ${lw} w ${cor(...rgb)} RG ${x1} ${yPdf(y1)} m ${x2} ${yPdf(y2)} l S Q`);
    };

    const imagem = (pagina, img, x, y, w, h) => {
        if (!img) return;
        pagina.imagens.set(img.nome, img);
        pagina.comandos.push(`q ${w} 0 0 ${h} ${x} ${yPdf(y + h)} cm /${img.nome} Do Q`);
    };

    const circuloFallback = (pagina, x, y, w, h, letras = "C", rgb = [0.88, 0.91, 0.95]) => {
        retangulo(pagina, x, y, w, h, rgb, [0.78, 0.84, 0.92], 0.6);
        textoCentro(pagina, x + w / 2, y + h / 2 + 4, letras, 13, "F2", [0.2, 0.27, 0.36]);
    };

    const finalizar = () => {
        const paginasRootId = adicionarObjeto("PAGES_PLACEHOLDER");
        const idsPaginas = [];

        paginas.forEach((pagina) => {
            const conteudo = pagina.comandos.join("\n");
            const conteudoId = adicionarObjeto(`<< /Length ${conteudo.length} >>\nstream\n${conteudo}\nendstream`);

            const xobjects = Array.from(pagina.imagens.values())
                .map((img) => `/${img.nome} ${img.id} 0 R`)
                .join(" ");

            const recursosImagem = xobjects ? `/XObject << ${xobjects} >>` : "";

            const paginaId = adicionarObjeto(`<< /Type /Page /Parent ${paginasRootId} 0 R /MediaBox [0 0 ${largura} ${altura}] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> /F2 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> >> ${recursosImagem} >> /Contents ${conteudoId} 0 R >>`);
            idsPaginas.push(paginaId);
        });

        objetos[paginasRootId - 1] = bytesAsciiRelatorio(`<< /Type /Pages /Kids [${idsPaginas.map((id) => `${id} 0 R`).join(" ")}] /Count ${idsPaginas.length} >>`);

        const catalogoId = adicionarObjeto(`<< /Type /Catalog /Pages ${paginasRootId} 0 R >>`);

        const partes = [bytesAsciiRelatorio("%PDF-1.4\n")];
        const offsets = [0];
        let posicao = partes[0].length;

        objetos.forEach((objeto, indice) => {
            offsets.push(posicao);
            const cabecalho = bytesAsciiRelatorio(`${indice + 1} 0 obj\n`);
            const rodape = bytesAsciiRelatorio("\nendobj\n");
            partes.push(cabecalho, objeto, rodape);
            posicao += cabecalho.length + objeto.length + rodape.length;
        });

        const inicioXref = posicao;
        let xref = `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
        offsets.slice(1).forEach((offset) => {
            xref += `${String(offset).padStart(10, "0")} 00000 n \n`;
        });
        xref += `trailer\n<< /Size ${objetos.length + 1} /Root ${catalogoId} 0 R >>\nstartxref\n${inicioXref}\n%%EOF`;

        partes.push(bytesAsciiRelatorio(xref));
        return concatenarBytesRelatorio(partes);
    };

    return {
        largura,
        altura,
        adicionarImagem,
        novaPagina,
        texto,
        textoCentro,
        retangulo,
        linha,
        imagem,
        circuloFallback,
        finalizar,
    };
}

function desenharIconeCabecalhoPdf(pdf, pagina, tipo, x, y) {
    const azul = [0.02, 0.29, 0.67];

    pdf.retangulo(pagina, x, y, 18, 18, [1, 1, 1], null);
    const c = pagina.comandos;

    if (tipo === "empresa") {
        c.push(`q 1.7 w ${corPdfRelatorio(azul)} RG ${x + 1} ${pdfYRelatorio(y + 17)} m ${x + 17} ${pdfYRelatorio(y + 17)} l S Q`);
        c.push(`q 1.7 w ${corPdfRelatorio(azul)} RG ${x + 5} ${pdfYRelatorio(y + 17)} m ${x + 5} ${pdfYRelatorio(y + 6)} l ${x + 10} ${pdfYRelatorio(y + 3)} l ${x + 15} ${pdfYRelatorio(y + 6)} l ${x + 15} ${pdfYRelatorio(y + 17)} l S Q`);
        c.push(`q ${corPdfRelatorio(azul)} rg ${x + 8} ${pdfYRelatorio(y + 10)} 2 2 re f ${x + 12} ${pdfYRelatorio(y + 10)} 2 2 re f ${x + 8} ${pdfYRelatorio(y + 14)} 2 2 re f ${x + 12} ${pdfYRelatorio(y + 14)} 2 2 re f Q`);
        return;
    }

    const letras = {
        cnpj: "ID",
        responsavel: "P",
        data: "D",
        sistema: "S",
    };

    pdf.textoCentro(pagina, x + 9, y + 13, letras[tipo] || "", 8, "F2", azul);
}

function corPdfRelatorio(rgb = [0, 0, 0]) {
    return `${rgb[0]} ${rgb[1]} ${rgb[2]}`;
}

function pdfYRelatorio(y) {
    return 842 - y;
}

function quebrarTextoCurtoRelatorio(valor = "", limite = 24) {
    const texto = textoPdfRelatorio(valor);
    if (texto.length <= limite) return [texto];

    const palavras = texto.split(/\s+/);
    const linhas = [];
    let linhaAtual = "";

    palavras.forEach((palavra) => {
        if (`${linhaAtual} ${palavra}`.trim().length > limite) {
            if (linhaAtual) linhas.push(linhaAtual);
            linhaAtual = palavra;
        } else {
            linhaAtual = `${linhaAtual} ${palavra}`.trim();
        }
    });

    if (linhaAtual) linhas.push(linhaAtual);

    return linhas.slice(0, 2);
}

function iniciaisRelatorio(nome = "") {
    return obterIniciaisEmpresa(nome || "C").slice(0, 2);
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

    const pdf = criarDocumentoPdfRelatorio();
    const azul = [0.02, 0.29, 0.67];
    const azulEscuro = [0.02, 0.12, 0.27];
    const verde = [0.02, 0.55, 0.25];
    const laranja = [0.95, 0.45, 0];
    const vermelho = [0.88, 0.05, 0.05];
    const roxo = [0.42, 0.16, 0.85];
    const cinzaLinha = [0.82, 0.87, 0.94];

    const desenharCabecalho = async (pagina, empresa) => {
        const logo = await pdf.adicionarImagem(empresa.logoUrl, 160);

        if (logo) {
            pdf.imagem(pagina, logo, 188, 24, 64, 64);
        } else {
            pdf.circuloFallback(pagina, 188, 24, 64, 64, obterIniciaisEmpresa(empresa.nome), [0.95, 0.97, 1]);
        }

        pdf.texto(pagina, 268, 46, empresa.nome || "Empresa", 24, "F2", azulEscuro);
        pdf.texto(pagina, 268, 66, "CONTROLE SST QR", 14, "F2", azul);

        pdf.linha(pagina, 35, 103, 157, 103, azul, 1.2);
        pdf.textoCentro(pagina, 297.5, 108, titulo, 13, "F2", azulEscuro);
        pdf.linha(pagina, 438, 103, 560, 103, azul, 1.2);

        const dados = [
            { tipo: "empresa", label: "Empresa:", valor: empresa.nome || "-", x: 38, w: 115 },
            { tipo: "cnpj", label: "CNPJ:", valor: empresa.cnpj || "-", x: 163, w: 116 },
            { tipo: "responsavel", label: "Responsável:", valor: empresa.responsavel || "-", x: 291, w: 130 },
            { tipo: "data", label: "Data de emissão:", valor: dataEmissao, x: 433, w: 70 },
            { tipo: "sistema", label: "Sistema:", valor: "Controle SST QR", x: 514, w: 68 },
        ];

        dados.forEach((item, indice) => {
            if (indice > 0) pdf.linha(pagina, item.x - 10, 126, item.x - 10, 166, cinzaLinha, 0.8);
            desenharIconeCabecalhoPdf(pdf, pagina, item.tipo, item.x, 132);
            pdf.texto(pagina, item.x + 25, 137, item.label, 7.5, "F2", [0.18, 0.24, 0.34]);

            const linhasValor = quebrarTextoCurtoRelatorio(item.valor, item.tipo === "responsavel" ? 25 : 17);
            linhasValor.forEach((linha, idx) => {
                pdf.texto(pagina, item.x + 25, 152 + idx * 10, linha, 7.3, "F2", [0, 0, 0]);
            });
        });

        pdf.linha(pagina, 34, 177, 561, 177, cinzaLinha, 0.9);
    };

    const desenharKpi = (pagina, x, y, w, h, label, valor, corIcone, simbolo) => {
        pdf.retangulo(pagina, x, y, w, h, [1, 1, 1], [0.84, 0.88, 0.94], 0.8);
        pdf.textoCentro(pagina, x + w / 2, y + 24, simbolo, 18, "F2", corIcone);
        pdf.textoCentro(pagina, x + w / 2, y + 47, label, 7.4, "F2", [0.05, 0.09, 0.16]);
        pdf.textoCentro(pagina, x + w / 2, y + 72, String(valor), 20, "F2", [0.02, 0.04, 0.08]);
    };

    const desenharResumo = (pagina, empresa, y) => {
        const resumo = calcularResumoEmpresaRelatorio(empresa.colaboradores || []);

        pdf.retangulo(pagina, 34, y, 527, 112, [1, 1, 1], [0.84, 0.88, 0.94], 0.8);
        pdf.texto(pagina, 45, y + 22, "RESUMO GERAL", 12, "F2", azul);

        const larguraKpi = 68;
        const gap = 6;
        const baseX = 45;
        const baseY = y + 36;

        desenharKpi(pagina, baseX + (larguraKpi + gap) * 0, baseY, larguraKpi, 64, "Total", resumo.total, azul, "T");
        desenharKpi(pagina, baseX + (larguraKpi + gap) * 1, baseY, larguraKpi, 64, "Liberados", resumo.liberados, verde, "OK");
        desenharKpi(pagina, baseX + (larguraKpi + gap) * 2, baseY, larguraKpi, 64, "Pendência", resumo.comPendencia, laranja, "!");
        desenharKpi(pagina, baseX + (larguraKpi + gap) * 3, baseY, larguraKpi, 64, "Bloqueados", resumo.bloqueados, vermelho, "X");
        desenharKpi(pagina, baseX + (larguraKpi + gap) * 4, baseY, larguraKpi, 64, "Em análise", resumo.emAnalise, azul, "?");
        desenharKpi(pagina, baseX + (larguraKpi + gap) * 5, baseY, larguraKpi, 64, "Vencidos", resumo.vencidos, vermelho, "V");
        desenharKpi(pagina, baseX + (larguraKpi + gap) * 6, baseY, larguraKpi, 64, "A vencer", resumo.vencendo, roxo, "H");

        return y + 124;
    };

    const desenharTabela = (pagina, empresa, y) => {
        pdf.retangulo(pagina, 34, y, 527, 28, [1, 1, 1], [0.84, 0.88, 0.94], 0.8);
        pdf.texto(pagina, 45, y + 18, "RESUMO POR COLABORADOR", 12, "F2", azul);

        const yTabela = y + 33;
        const colunas = [
            { label: "#", x: 34, w: 25 },
            { label: "Colaborador", x: 59, w: 120 },
            { label: "Função", x: 179, w: 82 },
            { label: "Situação", x: 261, w: 78 },
            { label: "Status", x: 339, w: 75 },
            { label: "Pend.", x: 414, w: 48 },
            { label: "Venc.", x: 462, w: 48 },
            { label: "A vencer", x: 510, w: 51 },
        ];

        pdf.retangulo(pagina, 34, yTabela, 527, 22, azul, azul, 0.8);
        colunas.forEach((coluna) => {
            pdf.textoCentro(pagina, coluna.x + coluna.w / 2, yTabela + 14, coluna.label, 7.5, "F2", [1, 1, 1]);
            pdf.linha(pagina, coluna.x + coluna.w, yTabela, coluna.x + coluna.w, yTabela + 22, [0.38, 0.6, 0.88], 0.4);
        });

        let yLinha = yTabela + 22;
        empresa.colaboradores.slice(0, 8).forEach((colaborador, indice) => {
            const pendentes = Number(colaborador.pendentes?.length || colaborador.pendentesTotal || 0) || 0;
            const vencidos = Number(colaborador.vencidos?.length || colaborador.vencidosTotal || 0) || 0;
            const vencendo = Number(colaborador.vencendo?.length || colaborador.vencendoTotal || 0) || 0;

            pdf.retangulo(pagina, 34, yLinha, 527, 24, indice % 2 === 0 ? [1, 1, 1] : [0.98, 0.99, 1], [0.86, 0.89, 0.94], 0.4);
            pdf.textoCentro(pagina, 46.5, yLinha + 15, String(indice + 1), 7.2, "F1", [0, 0, 0]);
            pdf.texto(pagina, 64, yLinha + 15, colaborador.nome || "-", 7.1, "F2", [0, 0, 0]);
            pdf.texto(pagina, 184, yLinha + 15, colaborador.funcao || "-", 6.8, "F1", [0, 0, 0]);
            pdf.textoCentro(pagina, 300, yLinha + 15, colaborador.statusMobilizacao || "-", 6.8, "F2", classeStatusRelatorio(colaborador.statusMobilizacao).includes("critico") ? vermelho : azul);
            pdf.textoCentro(pagina, 376, yLinha + 15, colaborador.statusGeral || "-", 6.8, "F2", classeStatusRelatorio(colaborador.statusGeral).includes("critico") ? vermelho : azul);
            pdf.textoCentro(pagina, 438, yLinha + 15, String(pendentes), 7.2, "F1", [0, 0, 0]);
            pdf.textoCentro(pagina, 486, yLinha + 15, String(vencidos), 7.2, "F1", [0, 0, 0]);
            pdf.textoCentro(pagina, 535, yLinha + 15, String(vencendo), 7.2, "F1", [0, 0, 0]);

            yLinha += 24;
        });

        return yLinha + 16;
    };

    const desenharDetalheColaborador = async (pagina, colaborador, indice, y) => {
        const foto = await pdf.adicionarImagem(colaborador.fotoUrl, 140);

        pdf.retangulo(pagina, 34, y, 527, 96, [1, 1, 1], [0.84, 0.88, 0.94], 0.8);
        pdf.retangulo(pagina, 42, y + 12, 18, 18, azul, azul, 0.6);
        pdf.textoCentro(pagina, 51, y + 25, String(indice + 1), 8, "F2", [1, 1, 1]);

        if (foto) {
            pdf.imagem(pagina, foto, 70, y + 18, 54, 54);
        } else {
            pdf.circuloFallback(pagina, 70, y + 18, 54, 54, iniciaisRelatorio(colaborador.nome), [0.88, 0.91, 0.95]);
        }

        pdf.texto(pagina, 140, y + 28, colaborador.nome || "-", 12, "F2", azul);
        pdf.texto(pagina, 140, y + 45, `Código: ${colaborador.codigo || "-"}`, 7.5, "F1", [0.05, 0.09, 0.16]);
        pdf.texto(pagina, 140, y + 58, `Função: ${colaborador.funcao || "-"}`, 7.5, "F1", [0.05, 0.09, 0.16]);
        pdf.texto(pagina, 140, y + 71, `Matriz aplicada: ${colaborador.matriz || "-"}`, 7.5, "F1", [0.05, 0.09, 0.16]);

        pdf.linha(pagina, 350, y + 15, 350, y + 82, [0.72, 0.78, 0.86], 0.8);
        pdf.texto(pagina, 370, y + 34, `Empresa: ${colaborador.empresaExibicao || colaborador.empresaNome || "-"}`, 7.5, "F1", [0.05, 0.09, 0.16]);
        pdf.texto(pagina, 370, y + 52, `Situação: ${colaborador.statusMobilizacao || "-"}`, 7.5, "F2", azul);
        pdf.texto(pagina, 370, y + 70, `Status geral: ${colaborador.statusGeral || "-"}`, 7.5, "F2", classeStatusRelatorio(colaborador.statusGeral).includes("critico") ? vermelho : azul);

        const listas = [
            { titulo: `VÁLIDOS (${limparListaRelatorio(colaborador.validos).length})`, lista: colaborador.validos, cor: verde, vazio: "Nenhum válido." },
            { titulo: `PENDENTES (${limparListaRelatorio(colaborador.pendentes).length})`, lista: colaborador.pendentes, cor: laranja, vazio: "Sem pendências." },
            { titulo: `VENCIDOS (${limparListaRelatorio(colaborador.vencidos).length})`, lista: colaborador.vencidos, cor: vermelho, vazio: "Nenhum vencido." },
            { titulo: `A VENCER (${limparListaRelatorio(colaborador.vencendo).length})`, lista: colaborador.vencendo, cor: roxo, vazio: "Nenhum a vencer." },
        ];

        const cardY = y + 110;
        const cardW = 124;
        listas.forEach((item, idx) => {
            const x = 34 + idx * 132;
            pdf.retangulo(pagina, x, cardY, cardW, 100, [1, 1, 1], [0.84, 0.88, 0.94], 0.7);
            pdf.texto(pagina, x + 8, cardY + 18, item.titulo, 8, "F2", item.cor);

            const resumo = limitarListaRelatorio(item.lista, 4);
            if (!resumo.itens.length) {
                pdf.texto(pagina, x + 8, cardY + 36, item.vazio, 6.8, "F1", [0.2, 0.27, 0.36]);
            } else {
                resumo.itens.forEach((linhaItem, linhaIndice) => {
                    pdf.texto(pagina, x + 8, cardY + 36 + linhaIndice * 12, `• ${linhaItem}`, 6.2, "F1", [0.05, 0.09, 0.16]);
                });

                if (resumo.restantes) {
                    pdf.texto(pagina, x + 8, cardY + 36 + resumo.itens.length * 12, `+ ${resumo.restantes} outro(s)`, 6.5, "F2", azul);
                }
            }
        });

        return y + 225;
    };

    for (const [indiceEmpresa, empresa] of empresas.entries()) {
        let pagina = pdf.novaPagina();
        await desenharCabecalho(pagina, empresa);
        let y = 195;
        y = desenharResumo(pagina, empresa, y);
        y = desenharTabela(pagina, empresa, y);

        pdf.texto(pagina, 45, y + 6, "DETALHAMENTO", 12, "F2", azul);
        y += 14;

        for (let i = 0; i < empresa.colaboradores.length; i += 1) {
            if (y > 590) {
                pagina = pdf.novaPagina();
                await desenharCabecalho(pagina, empresa);
                pdf.texto(pagina, 45, 195, "DETALHAMENTO - CONTINUAÇÃO", 12, "F2", azul);
                y = 215;
            }

            y = await desenharDetalheColaborador(pagina, empresa.colaboradores[i], i, y);
        }

        pdf.retangulo(pagina, 34, 803, 527, 24, azul, azul, 0.6);
        pdf.texto(pagina, 48, 819, "Controle SST QR", 9, "F2", [1, 1, 1]);
        pdf.texto(pagina, 482, 819, `Empresa ${indiceEmpresa + 1} de ${empresas.length}`, 8, "F2", [1, 1, 1]);
    }

    const bytes = pdf.finalizar();
    const blob = new Blob([bytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = nomeArquivo.endsWith(".pdf") ? nomeArquivo : `${nomeArquivo}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
