// Serviços de exportação CSV/PDF do sistema SST.
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

        return `
            <section class="detalhe-colaborador">
                <div class="detalhe-topo">
                    <div class="numero-colaborador">${indice + 1}</div>
                    <div class="avatar-colaborador">${escaparHTML(obterIniciaisEmpresa(colaborador.nome || "C"))}</div>
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
            <header class="cabecalho-relatorio">
                <div class="marca-empresa">
                    ${montarLogoEmpresaHtml(empresa)}
                    <div>
                        <h1>${escaparHTML(empresa.nome || "Empresa")}</h1>
                        <p>Relatório de colaboradores e treinamentos</p>
                    </div>
                </div>
                <div class="linha-titulo"></div>
                <div class="dados-empresa">
                    <div><span>🏢</span><strong>Empresa:</strong><em>${escaparHTML(empresa.nome || "-")}</em></div>
                    <div><span>▣</span><strong>CNPJ:</strong><em>${escaparHTML(empresa.cnpj || "-")}</em></div>
                    <div><span>♙</span><strong>Responsável:</strong><em>${escaparHTML(empresa.responsavel || "-")}</em></div>
                    <div><span>🗓</span><strong>Data de emissão:</strong><em>${escaparHTML(dataEmissao)}</em></div>
                    <div><span>🛡</span><strong>Sistema:</strong><em>Controle SST QR</em></div>
                </div>
            </header>

            <section class="bloco">
                <h2>Resumo geral</h2>
                <div class="kpis">
                    ${montarCartaoResumoRelatorio({ icone: "👥", titulo: "Total", valor: resumo.total, classe: "kpi-total" })}
                    ${montarCartaoResumoRelatorio({ icone: "✅", titulo: "Liberados", valor: resumo.liberados, classe: "kpi-ok" })}
                    ${montarCartaoResumoRelatorio({ icone: "⚠️", titulo: "Com pendência", valor: resumo.comPendencia, classe: "kpi-alerta" })}
                    ${montarCartaoResumoRelatorio({ icone: "🔒", titulo: "Bloqueados", valor: resumo.bloqueados, classe: "kpi-critico" })}
                    ${montarCartaoResumoRelatorio({ icone: "🔎", titulo: "Em análise", valor: resumo.emAnalise, classe: "kpi-info" })}
                    ${montarCartaoResumoRelatorio({ icone: "🗓", titulo: "Vencidos", valor: resumo.vencidos, classe: "kpi-vencido" })}
                    ${montarCartaoResumoRelatorio({ icone: "◷", titulo: "A vencer", valor: resumo.vencendo, classe: "kpi-vencendo" })}
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
                <span>Relatório gerado automaticamente</span>
            </footer>
        </section>
    `;
}

export function baixarRelatorioColaboradoresTreinamentosPDF({
    nomeArquivo = "relatorio-colaboradores-treinamentos.pdf",
    colaboradores = [],
    titulo = "Relatório de colaboradores e treinamentos",
} = {}) {
    const dataEmissao = new Date().toLocaleDateString("pt-BR");
    const empresas = agruparPorEmpresaRelatorio(colaboradores);

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
        padding: 12mm;
        background: #fff;
        border: 1px solid #d8e2ef;
        border-radius: 18px;
        box-shadow: 0 12px 36px rgba(15, 23, 42, 0.12);
        position: relative;
    }

    .quebra-pagina { page-break-before: always; }

    .cabecalho-relatorio {
        display: grid;
        gap: 14px;
        margin-bottom: 14px;
    }

    .marca-empresa {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 18px;
        text-align: left;
    }

    .empresa-logo-img {
        width: 76px;
        height: 76px;
        object-fit: contain;
        border-radius: 14px;
    }

    .empresa-logo-fallback {
        width: 76px;
        height: 76px;
        display: grid;
        place-items: center;
        border: 3px solid var(--azul);
        color: var(--azul);
        border-radius: 18px;
        font-size: 26px;
        font-weight: 900;
    }

    .marca-empresa h1 {
        margin: 0;
        color: #0f172a;
        font-size: 31px;
        letter-spacing: 0.05em;
        text-transform: uppercase;
    }

    .marca-empresa p {
        margin: 4px 0 0;
        color: var(--azul);
        font-size: 18px;
        font-weight: 800;
        letter-spacing: 0.10em;
        text-transform: uppercase;
    }

    .linha-titulo {
        height: 2px;
        background: linear-gradient(90deg, transparent, var(--azul), transparent);
    }

    .dados-empresa {
        display: grid;
        grid-template-columns: 1.05fr 1fr 1.05fr 1fr 0.9fr;
        gap: 8px;
        align-items: stretch;
        border-bottom: 1px solid var(--linha);
        padding-bottom: 12px;
    }

    .dados-empresa div {
        display: grid;
        grid-template-columns: 22px 1fr;
        gap: 2px 6px;
        align-items: center;
        border-right: 1px solid var(--linha);
        min-height: 42px;
        padding-right: 8px;
    }

    .dados-empresa div:last-child { border-right: 0; }

    .dados-empresa span {
        grid-row: span 2;
        color: var(--azul);
        font-size: 18px;
    }

    .dados-empresa strong {
        font-size: 10px;
        color: #334155;
    }

    .dados-empresa em {
        font-style: normal;
        font-size: 10px;
        font-weight: 700;
        color: #0f172a;
    }

    .bloco {
        border: 1px solid var(--linha);
        border-radius: 14px;
        margin-top: 12px;
        overflow: hidden;
        background: #fff;
    }

    .bloco h2 {
        margin: 0;
        padding: 10px 12px;
        color: var(--azul);
        font-size: 15px;
        text-transform: uppercase;
        letter-spacing: 0.02em;
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
        min-height: 105px;
        display: grid;
        place-items: center;
        text-align: center;
        border: 1px solid var(--linha);
        border-radius: 10px;
        padding: 10px 6px;
        background: #fff;
    }

    .kpi-icone {
        font-size: 28px;
        line-height: 1;
        margin-bottom: 5px;
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
        font-size: 10px;
    }

    thead th {
        background: linear-gradient(180deg, #075bbd, #033f88);
        color: #fff;
        padding: 9px 6px;
        border-right: 1px solid rgba(255,255,255,0.25);
        text-align: center;
    }

    tbody td {
        padding: 8px 6px;
        border-bottom: 1px solid var(--linha);
        border-right: 1px solid var(--linha);
        text-align: center;
        vertical-align: middle;
    }

    tbody tr:nth-child(even) { background: #fbfdff; }

    .texto-forte {
        font-weight: 800;
        text-align: left;
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
        grid-template-columns: 34px 58px 1.15fr 1fr;
        gap: 12px;
        align-items: center;
        padding: 12px;
        background: #fbfdff;
        border-bottom: 1px solid var(--linha);
    }

    .numero-colaborador {
        width: 26px;
        height: 26px;
        display: grid;
        place-items: center;
        background: var(--azul);
        color: #fff;
        font-weight: 900;
        border-radius: 7px;
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
        border-left: 1px solid var(--linha);
        padding-left: 14px;
    }

    .detalhe-grids {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 10px;
        padding: 12px;
    }

    .lista-card {
        min-height: 140px;
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
<script>
    document.title = ${JSON.stringify(nomeArquivo)};
    window.addEventListener("load", function () {
        setTimeout(function () {
            window.print();
        }, 350);
    });
</script>
</body>
</html>`;

    const janela = window.open("", "_blank", "noopener,noreferrer");

    if (!janela) {
        const blob = new Blob([html], { type: "text/html;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = nomeArquivo.replace(/\.pdf$/i, ".html");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        return;
    }

    janela.document.open();
    janela.document.write(html);
    janela.document.close();
}
