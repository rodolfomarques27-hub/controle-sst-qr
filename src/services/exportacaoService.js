// Serviços de exportação CSV/PDF do sistema SST.
import {
    baixarCSV,
    baixarPDF,
    baixarRelatorioHtmlComoPdf,
    escaparCSV,
    limparTextoPDF,
    quebrarTextoPDF,
} from "./exportacao/exportacaoBaseService";
import {
    classeStatusRelatorio,
    dividirEmLotesRelatorioEmpresas,
    escaparHTML,
    ICONES_RELATORIO_COLABORADORES,
    montarCabecalhoEmpresaTreinamentosRelatorio,
    montarCartaoResumoRelatorio,
    montarRodapeTreinamentosRelatorio,
    prepararColaboradoresRelatorio,
} from "./exportacao/relatorioColaboradoresUtils";

export {
    baixarCSV,
    baixarPDF,
    escaparCSV,
    limparTextoPDF,
    quebrarTextoPDF,
};

export {
    baixarRelatorioAniversariantesPDF,
} from "./exportacao/relatorioAniversariantesService";

export {
    baixarRelatorioAuditoriaSistemaPDF,
} from "./exportacao/relatorioAuditoriaSistemaService";

export {
    baixarRelatorioPendenciasTreinamentosPDF,
} from "./exportacao/relatorioPendenciasTreinamentosService";

export {
    baixarRelatorioDashboardSstPDF,
} from "./exportacao/relatorioDashboardSstService";

// Funções e relatórios específicos do sistema SST.

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

function montarFiltrosColaboradoresTreinamentosRelatorio(filtros = {}) {
    const itens = [
        ["Busca", filtros.busca || "-"],
        ["Empresa", filtros.empresa || "Todas"],
        ["Classifica\u00e7\u00e3o", filtros.classificacao || "Todos"],
        ["Colaboradores filtrados", filtros.colaboradoresFiltrados || "-"],
    ];

    return `
        <section style="margin: 10px 0 12px; border: 1px solid #d9e3f2; border-radius: 14px; padding: 10px 12px; background: #f8fbff;">
            <h2 style="margin: 0 0 8px; color: #0f172a; font-size: 12px; text-transform: uppercase; letter-spacing: .04em;">Filtros aplicados</h2>
            <div style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px;">
                ${itens.map(([label, valor]) => `
                    <div style="border: 1px solid #d9e3f2; border-radius: 10px; padding: 7px 8px; background: #ffffff;">
                        <strong style="display: block; color: #64748b; font-size: 7px; text-transform: uppercase; letter-spacing: .05em;">${escaparHTML(label)}</strong>
                        <span style="display: block; margin-top: 3px; color: #0f172a; font-size: 8px; font-weight: 800;">${escaparHTML(valor)}</span>
                    </div>
                `).join("")}
            </div>
        </section>
    `;
}

function montarSecaoEmpresaRelatorio(empresa = {}, indiceEmpresa = 0, dataEmissao = "", filtros = {}) {
    const colaboradoresEmpresa = Array.isArray(empresa.colaboradores) ? empresa.colaboradores : [];
    const resumo = calcularResumoEmpresaRelatorio(colaboradoresEmpresa);
    const linhasTabela = colaboradoresEmpresa.map((colaborador, indice) => `
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

    const detalhes = colaboradoresEmpresa.map((colaborador, indice) => {
        const validos = limparListaRelatorio(colaborador.validos);
        const pendentes = limparListaRelatorio(colaborador.pendentes);
        const vencidos = limparListaRelatorio(colaborador.vencidos);
        const vencendo = limparListaRelatorio(colaborador.vencendo);

        const fotoColaborador = colaborador.fotoUrl
            ? `<img src="${escaparHTML(colaborador.fotoUrl)}" alt="Foto ${escaparHTML(colaborador.nome || "colaborador")}" />`
            : escaparHTML(obterIniciaisEmpresa(colaborador.nome || "C"));

        return `
            <section class="pagina-relatorio quebra-pagina pagina-relatorio--detalhe-colaborador">
                ${montarCabecalhoEmpresaTreinamentosRelatorio(empresa, dataEmissao, "Detalhamento de colaborador e treinamentos")}
                <section class="bloco bloco-detalhamento bloco-detalhamento--pagina-unica">
                    <h2>Detalhamento</h2>
                    <section class="detalhe-colaborador detalhe-colaborador--pagina-unica">
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
                </section>
                ${montarRodapeTreinamentosRelatorio("Relatório visual por empresa")}
            </section>
        `;
    }).join("");

    return `
        <section class="pagina-relatorio ${indiceEmpresa > 0 ? "quebra-pagina" : ""}">
            ${montarCabecalhoEmpresaTreinamentosRelatorio(empresa, dataEmissao, "Relatório de colaboradores e treinamentos")}
            ${indiceEmpresa === 0 ? montarFiltrosColaboradoresTreinamentosRelatorio(filtros) : ""}

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

            ${montarRodapeTreinamentosRelatorio("Relatório visual por empresa")}
        </section>
        ${detalhes || `
            <section class="pagina-relatorio quebra-pagina">
                ${montarCabecalhoEmpresaTreinamentosRelatorio(empresa, dataEmissao, "Detalhamento de colaborador e treinamentos")}
                <section class="bloco bloco-detalhamento"><h2>Detalhamento</h2><p class="lista-vazia">Nenhum colaborador para detalhar.</p></section>
                ${montarRodapeTreinamentosRelatorio("Relatório visual por empresa")}
            </section>
        `}
    `;
}



function normalizarTextoRelatorioEmpresas(valor = "", fallback = "-") {
    const texto = String(valor ?? "").trim();
    return texto || fallback;
}

function limitarTextoRelatorioEmpresas(valor = "", limite = 46) {
    const texto = normalizarTextoRelatorioEmpresas(valor);
    if (texto.length <= limite) return texto;
    return `${texto.slice(0, Math.max(0, limite - 3)).trim()}...`;
}

function classeStatusRelatorioEmpresas(status = "") {
    const texto = String(status || "").toLowerCase();

    if (texto.includes("venc") && !texto.includes("a vencer")) return "badge-vermelho";
    if (texto.includes("pend") || texto.includes("análise") || texto.includes("analise")) return "badge-laranja";
    if (texto.includes("a vencer") || texto.includes("monitor")) return "badge-amarelo";
    if (texto.includes("ativo") || texto.includes("em dia") || texto.includes("sem pend") || texto.includes("liber")) return "badge-verde";
    if (texto.includes("bloq") || texto.includes("inativ")) return "badge-vermelho";

    return "badge-neutro";
}

function contarDocumentosRelatorioEmpresas(empresas = []) {
    return empresas.reduce(
        (acc, empresa) => {
            const documentos = Array.isArray(empresa.documentos) ? empresa.documentos : [];

            documentos.forEach((doc) => {
                const chave = String(doc.chave || doc.status || "").toLowerCase();
                acc.total += 1;
                if (chave.includes("vencido")) acc.vencidos += 1;
                else if (chave.includes("vencendo") || String(doc.status || "").toLowerCase().includes("a vencer")) acc.vencer += 1;
                else if (chave.includes("pendente")) acc.pendentes += 1;
                else acc.emDia += 1;
            });

            return acc;
        },
        { total: 0, emDia: 0, pendentes: 0, vencidos: 0, vencer: 0 }
    );
}

function montarCabecalhoRelatorioEmpresas(titulo = "Relatório de empresas e documentos", subtitulo = "") {
    return `
        <header class="cabecalho-pdf-padrao">
            <div class="marca-pdf-padrao">
                <span class="marca-pdf-icone" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3 5 6v5c0 4.6 2.9 8.8 7 10 4.1-1.2 7-5.4 7-10V6l-7-3Z"/><path d="m9.5 12 1.8 1.8 3.7-4"/></svg></span>
                <div class="marca-pdf-textos">
                    <h1>SAFESCAN BRASIL</h1>
                    <p>GESTÃO DE SEGURANÇA DO TRABALHO</p>
                </div>
            </div>
            <div class="linha-pdf-padrao"></div>
            <div class="titulo-pdf-padrao">
                <h2>${escaparHTML(String(titulo || "").toUpperCase())}</h2>
                <p>${escaparHTML(subtitulo)}</p>
            </div>
        </header>
    `;
}

function montarRodapeRelatorioEmpresas(pagina = 1, total = 1, rotulo = "Relatório visual de empresas e documentos") {
    return `
        <footer class="rodape-relatorio-empresas">
            <span>© SafeScan Brasil</span>
            <span>${escaparHTML(rotulo)} · Página ${pagina} de ${total}</span>
        </footer>
    `;
}

function montarCardMetricaRelatorioEmpresas(titulo, valor, detalhe = "") {
    return `
        <article class="card-metrica-relatorio-empresas">
            <p>${escaparHTML(titulo)}</p>
            <strong>${escaparHTML(valor)}</strong>
            <span>${escaparHTML(detalhe)}</span>
        </article>
    `;
}

function montarTabelaRelatorioEmpresas({ colunas = [], linhas = [], vazio = "Nenhum registro encontrado.", classe = "" }) {
    const corpo = linhas.length
        ? linhas.join("")
        : `<tr><td colspan="${Math.max(colunas.length, 1)}" class="tabela-vazia-relatorio-empresas">${escaparHTML(vazio)}</td></tr>`;

    return `
        <table class="tabela-relatorio-empresas ${escaparHTML(classe)}">
            <thead>
                <tr>${colunas.map((coluna) => `<th>${escaparHTML(coluna)}</th>`).join("")}</tr>
            </thead>
            <tbody>${corpo}</tbody>
        </table>
    `;
}

function montarTabelaDocumentosEmpresaRelatorio(empresa = {}) {
    const documentos = Array.isArray(empresa.documentos) ? empresa.documentos : [];

    const linhas = documentos.map((doc) => `
        <tr>
            <td class="texto-forte">${escaparHTML(doc.tipo || "-")}</td>
            <td class="centralizado"><span class="badge-relatorio-empresas ${classeStatusRelatorioEmpresas(doc.status)}">${escaparHTML(doc.status || "-")}</span></td>
            <td class="centralizado">${escaparHTML(doc.emissao || "-")}</td>
            <td class="centralizado">${escaparHTML(doc.revisao || "-")}</td>
            <td>${escaparHTML(limitarTextoRelatorioEmpresas(doc.arquivo || "-", 38))}</td>
        </tr>
    `);

    return montarTabelaRelatorioEmpresas({
        colunas: ["Documento", "Status", "Emissão", "Próxima revisão", "Arquivo"],
        linhas,
        vazio: "Nenhum documento cadastrado para esta empresa.",
        classe: "tabela-documentos-empresa-relatorio",
    });
}

function montarCardEmpresaDetalheRelatorio(empresa = {}) {
    return `
        <section class="card-empresa-detalhe-relatorio">
            <div class="card-empresa-detalhe-relatorio__topo">
                <div>
                    <h3>${escaparHTML(empresa.nome || "Empresa")}</h3>
                    <p>${escaparHTML(empresa.tipo || "Terceirizada")} · Contratada por: ${escaparHTML(empresa.contratadaPor || "-")}</p>
                </div>
                <span class="badge-relatorio-empresas ${classeStatusRelatorioEmpresas(empresa.situacaoDocumental)}">${escaparHTML(empresa.situacaoDocumental || "-")}</span>
            </div>
            <div class="dados-grid-relatorio-empresas">
                <div><span>CNPJ</span><strong>${escaparHTML(empresa.cnpj || "-")}</strong></div>
                <div><span>Responsável</span><strong>${escaparHTML(empresa.responsavel || "-")}</strong></div>
                <div><span>Funcionários</span><strong>${escaparHTML(empresa.funcionarios ?? 0)}</strong></div>
                <div><span>Status</span><strong>${escaparHTML(empresa.statusEmpresa || "-")}</strong></div>
                <div><span>Contrato</span><strong>${escaparHTML(empresa.numeroContrato || "-")}</strong></div>
                <div><span>Vigência</span><strong>${escaparHTML(empresa.inicioContrato || "-")} até ${escaparHTML(empresa.fimContrato || "-")}</strong></div>
            </div>
            ${montarTabelaDocumentosEmpresaRelatorio(empresa)}
            <div class="escopo-relatorio-empresas">
                <strong>Escopo:</strong> ${escaparHTML(limitarTextoRelatorioEmpresas(empresa.escopoServico || "-", 220))}
            </div>
        </section>
    `;
}

function montarEstilosRelatorioEmpresas() {
    return `
        <style>
            :root { --azul:#064fae; --azul-escuro:#07162f; --linha:#d9e3f2; --texto:#0f172a; --suave:#f8fbff; --verde:#078a42; --laranja:#f28c00; --vermelho:#e01414; --amarelo:#b7791f; }
            * { box-sizing: border-box; }
            body { margin: 0; background: #eef4fb; color: var(--texto); font-family: Arial, Helvetica, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .pagina-relatorio { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 8mm; background: #fff; border: 1px solid #d8e2ef; border-radius: 18px; position: relative; page-break-after: always; overflow: hidden; }
            .pagina-relatorio:last-child { page-break-after: auto; }
            .conteudo-pagina-relatorio-empresas { min-height: 262mm; }
            .cabecalho-pdf-padrao { display: grid; gap: 6px; margin-bottom: 9px; }
            .marca-pdf-padrao { display: flex; align-items: center; justify-content: center; gap: 10px; text-align: left; padding-top: 1px; }
            .marca-pdf-icone { width: 30px; height: 30px; display: grid; place-items: center; color: #07162f; flex: 0 0 auto; }
            .marca-pdf-icone svg { width: 27px; height: 27px; fill: none; stroke: currentColor; stroke-width: 1.9; stroke-linecap: round; stroke-linejoin: round; }
            .marca-pdf-textos h1 { margin: 0; color: #07162f; font-size: 28px; line-height: .94; letter-spacing: .16em; text-transform: uppercase; font-weight: 900; }
            .marca-pdf-textos p { margin: 2px 0 0; color: #334155; font-size: 7px; line-height: 1; letter-spacing: .32em; text-transform: uppercase; font-weight: 900; text-align: center; }
            .linha-pdf-padrao { height: 2px; background: #07162f; width: 100%; margin: 0; }
            .titulo-pdf-padrao { border-top: 2px solid #07162f; border-bottom: 2px solid #07162f; text-align: center; padding: 7px 10px 8px; min-height: 42px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; overflow: hidden; }
            .titulo-pdf-padrao h2 { margin: 0; color: var(--azul); font-size: 13.8px; line-height: 1.16; text-transform: uppercase; letter-spacing: .045em; font-weight: 900; white-space: normal; max-width: 98%; }
            .titulo-pdf-padrao p { margin: 0; color: #64748b; font-size: 7.2px; line-height: 1.35; font-weight: 800; max-width: 96%; }
            .metadados-relatorio-empresas { display: grid; grid-template-columns: repeat(4, 1fr); border: 1px solid var(--linha); border-radius: 12px; overflow: hidden; margin: 8px 0; background: #f9fbff; }
            .metadados-relatorio-empresas div { padding: 7px 9px; border-right: 1px solid var(--linha); }
            .metadados-relatorio-empresas div:last-child { border-right: 0; }
            .metadados-relatorio-empresas span, .card-metrica-relatorio-empresas p { display: block; color: #64748b; font-size: 6.9px; text-transform: uppercase; letter-spacing: .06em; font-weight: 900; }
            .metadados-relatorio-empresas strong { display: block; margin-top: 2px; color: #07162f; font-size: 9px; font-weight: 900; }
            .cards-metricas-relatorio-empresas { display: grid; grid-template-columns: repeat(5, 1fr); gap: 7px; margin-bottom: 9px; }
            .card-metrica-relatorio-empresas { border: 1px solid var(--linha); border-radius: 12px; background: #fff; padding: 8px; min-height: 54px; }
            .card-metrica-relatorio-empresas strong { display: block; margin-top: 5px; color: #07162f; font-size: 20px; line-height: 1; font-weight: 900; }
            .card-metrica-relatorio-empresas span { display: block; margin-top: 4px; color: #64748b; font-size: 7px; font-weight: 700; }
            .bloco-relatorio-empresas { border: 1px solid var(--linha); border-radius: 13px; background: #fff; overflow: hidden; margin-bottom: 10px; }
            .bloco-relatorio-empresas__titulo { padding: 8px 10px; background: #f8fbff; border-bottom: 1px solid var(--linha); }
            .bloco-relatorio-empresas__titulo h3 { margin: 0; color: #07162f; font-size: 12px; text-transform: uppercase; letter-spacing: .045em; font-weight: 900; }
            .bloco-relatorio-empresas__titulo p { margin: 2px 0 0; color: #64748b; font-size: 7px; font-weight: 700; }
            .bloco-relatorio-empresas__corpo { padding: 9px; }
            .tabela-relatorio-empresas { width: 100%; border-collapse: separate; border-spacing: 0; table-layout: fixed; border: 1px solid #dbe6f5; border-radius: 10px; overflow: hidden; font-size: 7.8px; }
            .tabela-relatorio-empresas th { background: #07162f; color: #fff; padding: 8px 8px; text-align: left; font-size: 6.7px; line-height: 1.2; text-transform: uppercase; letter-spacing: .04em; border-right: 1px solid rgba(255,255,255,.18); }
            .tabela-relatorio-empresas th:last-child { border-right: 0; }
            .tabela-relatorio-empresas td { padding: 7px 8px; border-bottom: 1px solid #e2e8f0; border-right: 1px solid #edf2f7; vertical-align: middle; color: #334155; line-height: 1.32; overflow-wrap: anywhere; }
            .tabela-relatorio-empresas td:last-child { border-right: 0; }
            .tabela-relatorio-empresas tbody tr:last-child td { border-bottom: 0; }
            .tabela-relatorio-empresas tbody tr:nth-child(even) td { background: #f8fbff; }
            .texto-forte { color: #07162f !important; font-weight: 900; }
            .centralizado { text-align: center !important; }
            .tabela-resumo-empresas th:nth-child(1), .tabela-resumo-empresas td:nth-child(1) { width: 24%; }
            .tabela-resumo-empresas th:nth-child(2), .tabela-resumo-empresas td:nth-child(2) { width: 15%; }
            .tabela-resumo-empresas th:nth-child(3), .tabela-resumo-empresas td:nth-child(3) { width: 15%; text-align:center; }
            .tabela-resumo-empresas th:nth-child(4), .tabela-resumo-empresas td:nth-child(4) { width: 18%; text-align:center; }
            .tabela-resumo-empresas th:nth-child(5), .tabela-resumo-empresas td:nth-child(5) { width: 9%; text-align:center; }
            .tabela-resumo-empresas th:nth-child(6), .tabela-resumo-empresas td:nth-child(6) { width: 19%; text-align:center; }
            .tabela-pendencias-documentais th:nth-child(1), .tabela-pendencias-documentais td:nth-child(1) { width: 22%; }
            .tabela-pendencias-documentais th:nth-child(2), .tabela-pendencias-documentais td:nth-child(2) { width: 12%; }
            .tabela-pendencias-documentais th:nth-child(3), .tabela-pendencias-documentais td:nth-child(3) { width: 14%; text-align:center; }
            .tabela-pendencias-documentais th:nth-child(4), .tabela-pendencias-documentais td:nth-child(4) { width: 12%; text-align:center; }
            .tabela-pendencias-documentais th:nth-child(5), .tabela-pendencias-documentais td:nth-child(5) { width: 12%; text-align:center; }
            .tabela-pendencias-documentais th:nth-child(6), .tabela-pendencias-documentais td:nth-child(6) { width: 28%; }
            .tabela-documentos-empresa-relatorio th:nth-child(1), .tabela-documentos-empresa-relatorio td:nth-child(1) { width: 18%; }
            .tabela-documentos-empresa-relatorio th:nth-child(2), .tabela-documentos-empresa-relatorio td:nth-child(2) { width: 16%; text-align:center; }
            .tabela-documentos-empresa-relatorio th:nth-child(3), .tabela-documentos-empresa-relatorio td:nth-child(3) { width: 15%; text-align:center; }
            .tabela-documentos-empresa-relatorio th:nth-child(4), .tabela-documentos-empresa-relatorio td:nth-child(4) { width: 18%; text-align:center; }
            .tabela-documentos-empresa-relatorio th:nth-child(5), .tabela-documentos-empresa-relatorio td:nth-child(5) { width: 33%; }
            .badge-relatorio-empresas { display: inline-flex; align-items: center; justify-content: center; min-width: 66px; border-radius: 999px; padding: 4px 7px; font-size: 6.8px; line-height: 1; font-weight: 900; white-space: nowrap; }
            .badge-verde { color: #047857; background: #dcfce7; }
            .badge-laranja { color: #c05621; background: #ffedd5; }
            .badge-amarelo { color: #a16207; background: #fef3c7; }
            .badge-vermelho { color: #b91c1c; background: #fee2e2; }
            .badge-neutro { color: #334155; background: #e2e8f0; }
            .card-empresa-detalhe-relatorio { border: 1px solid var(--linha); border-radius: 13px; background: #fff; padding: 10px; margin-bottom: 10px; break-inside: avoid; page-break-inside: avoid; }
            .card-empresa-detalhe-relatorio__topo { display: flex; justify-content: space-between; gap: 10px; align-items: flex-start; border-bottom: 1px solid #e2e8f0; padding-bottom: 7px; margin-bottom: 8px; }
            .card-empresa-detalhe-relatorio h3 { margin: 0; color: #07162f; font-size: 13px; line-height: 1.1; text-transform: uppercase; font-weight: 900; }
            .card-empresa-detalhe-relatorio p { margin: 2px 0 0; color: #64748b; font-size: 7px; font-weight: 700; }
            .dados-grid-relatorio-empresas { display: grid; grid-template-columns: repeat(3, 1fr); gap: 7px; margin-bottom: 8px; }
            .dados-grid-relatorio-empresas div { border: 1px solid #e2e8f0; border-radius: 9px; background: #f8fbff; padding: 6px; min-height: 38px; }
            .dados-grid-relatorio-empresas span { display: block; color: #64748b; font-size: 6px; text-transform: uppercase; font-weight: 900; letter-spacing: .05em; }
            .dados-grid-relatorio-empresas strong { display: block; margin-top: 3px; color: #07162f; font-size: 7.4px; line-height: 1.2; font-weight: 900; }
            .escopo-relatorio-empresas { margin-top: 7px; color: #334155; font-size: 7px; line-height: 1.35; border: 1px solid #e2e8f0; background: #f8fbff; border-radius: 9px; padding: 7px; }
            .tabela-vazia-relatorio-empresas { text-align: center; color: #64748b; font-weight: 800; padding: 18px !important; }
            .rodape-relatorio-empresas { position: absolute; left: 8mm; right: 8mm; bottom: 8mm; min-height: 10mm; display: flex; align-items: center; justify-content: space-between; padding: 0 8px; border-radius: 0 0 10px 10px; background: linear-gradient(90deg, #043675, #064fae); color: #fff; font-size: 7px; font-weight: 900; }
        </style>
    `;
}

function montarFiltrosEmpresasDocumentosRelatorio(filtros = {}) {
    const itens = [
        ["Busca", filtros.busca || "-"],
        ["Tipo", filtros.tipo || "Todos"],
        ["Status", filtros.status || "Todos"],
        ["Empresas filtradas", filtros.empresasFiltradas || "-"],
        ["Documentos filtrados", filtros.documentosFiltrados || "-"],
    ];

    return `
        <section style="margin: 8px 0 10px; border: 1px solid #d9e3f2; border-radius: 14px; padding: 8px 10px; background: #f8fbff;">
            <h2 style="margin: 0 0 7px; color: #0f172a; font-size: 11px; text-transform: uppercase; letter-spacing: .04em;">Filtros aplicados</h2>
            <div style="display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 7px;">
                ${itens.map(([label, valor]) => `
                    <div style="border: 1px solid #d9e3f2; border-radius: 10px; padding: 6px 7px; background: #ffffff; min-height: 34px;">
                        <strong style="display: block; color: #64748b; font-size: 6.5px; text-transform: uppercase; letter-spacing: .05em;">${escaparHTML(label)}</strong>
                        <span style="display: block; margin-top: 3px; color: #0f172a; font-size: 7.5px; font-weight: 900; line-height: 1.2;">${escaparHTML(valor)}</span>
                    </div>
                `).join("")}
            </div>
        </section>
    `;
}

export async function baixarRelatorioEmpresasDocumentosPDF({
    nomeArquivo = "relatorio-empresas-documentos.pdf",
    empresas = [],
    filtros = {},
} = {}) {
    const listaEmpresas = Array.isArray(empresas) ? empresas : [];
    const dataEmissao = new Date().toLocaleDateString("pt-BR");
    const horaEmissao = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const resumoDocs = contarDocumentosRelatorioEmpresas(listaEmpresas);
    const empresasComPendencia = listaEmpresas.filter((empresa) => String(empresa.situacaoDocumental || "").toLowerCase().includes("pend")).length;
    const empresasAtivas = listaEmpresas.filter((empresa) => String(empresa.statusEmpresa || "").toLowerCase().includes("ativa")).length;
    const totalFuncionarios = listaEmpresas.reduce((acc, empresa) => acc + Number(empresa.funcionarios || 0), 0);
    const paginasDetalhe = dividirEmLotesRelatorioEmpresas(listaEmpresas, 2);
    const totalPaginas = 1 + paginasDetalhe.length;

    const linhasResumo = listaEmpresas.map((empresa) => `
        <tr>
            <td class="texto-forte">${escaparHTML(empresa.nome || "-")}</td>
            <td>${escaparHTML(empresa.tipo || "-")}</td>
            <td>${escaparHTML(limitarTextoRelatorioEmpresas(empresa.contratadaPor || "-", 34))}</td>
            <td class="centralizado"><span class="badge-relatorio-empresas ${classeStatusRelatorioEmpresas(empresa.statusEmpresa)}">${escaparHTML(empresa.statusEmpresa || "-")}</span></td>
            <td class="centralizado">${escaparHTML(empresa.funcionarios ?? 0)}</td>
            <td class="centralizado"><span class="badge-relatorio-empresas ${classeStatusRelatorioEmpresas(empresa.situacaoDocumental)}">${escaparHTML(empresa.situacaoDocumental || "-")}</span></td>
        </tr>
    `);

    const paginaResumo = `
        <main class="pagina-relatorio">
            <div class="conteudo-pagina-relatorio-empresas">
                ${montarCabecalhoRelatorioEmpresas("Relatório de empresas e documentos", "Resumo visual das empresas, contratos e documentos corporativos.")}
                ${montarFiltrosEmpresasDocumentosRelatorio(filtros)}
                <section class="metadados-relatorio-empresas">
                    <div><span>Emissão</span><strong>${escaparHTML(dataEmissao)} às ${escaparHTML(horaEmissao)}</strong></div>
                    <div><span>Base do relatório</span><strong>${listaEmpresas.length} empresa(s)</strong></div>
                    <div><span>Documentos monitorados</span><strong>${resumoDocs.total}</strong></div>
                    <div><span>Situação documental</span><strong>${empresasComPendencia} com pendência</strong></div>
                </section>
                <section class="cards-metricas-relatorio-empresas">
                    ${montarCardMetricaRelatorioEmpresas("Empresas", listaEmpresas.length, "Registros filtrados")}
                    ${montarCardMetricaRelatorioEmpresas("Ativas", empresasAtivas, "Operação liberada")}
                    ${montarCardMetricaRelatorioEmpresas("Funcionários", totalFuncionarios, "Vinculados às empresas")}
                    ${montarCardMetricaRelatorioEmpresas("Pendentes", resumoDocs.pendentes, "Documentos ausentes")}
                    ${montarCardMetricaRelatorioEmpresas("Vencidos", resumoDocs.vencidos, "Revisão vencida")}
                </section>
                <section class="bloco-relatorio-empresas">
                    <div class="bloco-relatorio-empresas__titulo"><h3>Resumo por empresa</h3><p>Visão consolidada das empresas filtradas na tela.</p></div>
                    <div class="bloco-relatorio-empresas__corpo">
                        ${montarTabelaRelatorioEmpresas({
                            colunas: ["Empresa", "Tipo", "Contratada por", "Status", "Func.", "Documental"],
                            linhas: linhasResumo,
                            vazio: "Nenhuma empresa encontrada para os filtros aplicados.",
                            classe: "tabela-resumo-empresas",
                        })}
                    </div>
                </section>
            </div>
            ${montarRodapeRelatorioEmpresas(1, totalPaginas)}
        </main>
    `;

    const paginasDetalheHtml = paginasDetalhe.map((grupo, indice) => `
        <main class="pagina-relatorio">
            <div class="conteudo-pagina-relatorio-empresas">
                ${montarCabecalhoRelatorioEmpresas("Detalhamento documental", "Documentos enviados, vigência e situação por empresa.")}
                ${grupo.map(montarCardEmpresaDetalheRelatorio).join("") || `
                    <section class="bloco-relatorio-empresas"><div class="bloco-relatorio-empresas__corpo tabela-vazia-relatorio-empresas">Nenhuma empresa para detalhar.</div></section>
                `}
            </div>
            ${montarRodapeRelatorioEmpresas(indice + 2, totalPaginas)}
        </main>
    `).join("");

    const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8" /><title>Relatório de empresas e documentos</title>${montarEstilosRelatorioEmpresas()}</head><body>${paginaResumo}${paginasDetalheHtml}</body></html>`;

    await baixarRelatorioHtmlComoPdf({ html, nomeArquivo });
}

function montarFiltrosPendenciasDocumentaisRelatorio(filtros = {}) {
    const itens = [
        ["Busca", filtros.busca || "-"],
        ["Tipo", filtros.tipo || "Todos"],
        ["Status", filtros.status || "Todos"],
        ["Empresas filtradas", filtros.empresasFiltradas || "-"],
        ["Documentos filtrados", filtros.documentosFiltrados || "-"],
        ["Pend\u00eancias filtradas", filtros.pendenciasFiltradas || "-"],
    ];

    return `
        <section style="margin: 8px 0 10px; border: 1px solid #d9e3f2; border-radius: 14px; padding: 8px 10px; background: #f8fbff;">
            <h2 style="margin: 0 0 7px; color: #0f172a; font-size: 11px; text-transform: uppercase; letter-spacing: .04em;">Filtros aplicados</h2>
            <div style="display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 7px;">
                ${itens.map(([label, valor]) => `
                    <div style="border: 1px solid #d9e3f2; border-radius: 10px; padding: 6px 7px; background: #ffffff; min-height: 34px;">
                        <strong style="display: block; color: #64748b; font-size: 6.5px; text-transform: uppercase; letter-spacing: .05em;">${escaparHTML(label)}</strong>
                        <span style="display: block; margin-top: 3px; color: #0f172a; font-size: 7.5px; font-weight: 900; line-height: 1.2;">${escaparHTML(valor)}</span>
                    </div>
                `).join("")}
            </div>
        </section>
    `;
}

export async function baixarRelatorioPendenciasDocumentaisPDF({
    nomeArquivo = "relatorio-pendencias-documentais.pdf",
    pendencias = [],
    filtros = {},
} = {}) {
    const listaPendencias = Array.isArray(pendencias) ? pendencias : [];
    const dataEmissao = new Date().toLocaleDateString("pt-BR");
    const horaEmissao = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const lotes = dividirEmLotesRelatorioEmpresas(listaPendencias, 14);
    const totalPaginas = lotes.length;

    const paginasHtml = lotes.map((grupo, indice) => {
        const linhas = grupo.map((item) => `
            <tr>
                <td class="texto-forte">${escaparHTML(item.empresa || "-")}</td>
                <td>${escaparHTML(item.documento || "-")}</td>
                <td class="centralizado"><span class="badge-relatorio-empresas ${classeStatusRelatorioEmpresas(item.situacao)}">${escaparHTML(item.situacao || "-")}</span></td>
                <td class="centralizado">${escaparHTML(item.emissao || "-")}</td>
                <td class="centralizado">${escaparHTML(item.revisao || "-")}</td>
                <td>${escaparHTML(limitarTextoRelatorioEmpresas(item.arquivo || "-", 44))}</td>
            </tr>
        `);

        return `
            <main class="pagina-relatorio">
                <div class="conteudo-pagina-relatorio-empresas">
                    ${montarCabecalhoRelatorioEmpresas("Relatório de pendências documentais", "Documentos pendentes, vencidos ou próximos da revisão.")}
                    ${montarFiltrosPendenciasDocumentaisRelatorio(filtros)}
                    <section class="metadados-relatorio-empresas">
                        <div><span>Emissão</span><strong>${escaparHTML(dataEmissao)} às ${escaparHTML(horaEmissao)}</strong></div>
                        <div><span>Base do relatório</span><strong>${listaPendencias.length} pendência(s)</strong></div>
                        <div><span>Página</span><strong>${indice + 1} de ${totalPaginas}</strong></div>
                        <div><span>Origem</span><strong>Empresas e documentos</strong></div>
                    </section>
                    <section class="bloco-relatorio-empresas">
                        <div class="bloco-relatorio-empresas__titulo"><h3>Lista de pendências</h3><p>Itens que exigem regularização documental.</p></div>
                        <div class="bloco-relatorio-empresas__corpo">
                            ${montarTabelaRelatorioEmpresas({
                                colunas: ["Empresa", "Documento", "Situação", "Emissão", "Revisão", "Arquivo"],
                                linhas,
                                vazio: "Nenhuma pendência documental encontrada.",
                                classe: "tabela-pendencias-documentais",
                            })}
                        </div>
                    </section>
                </div>
                ${montarRodapeRelatorioEmpresas(indice + 1, totalPaginas, "Relatório visual de pendências documentais")}
            </main>
        `;
    }).join("");

    const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8" /><title>Relatório de pendências documentais</title>${montarEstilosRelatorioEmpresas()}</head><body>${paginasHtml}</body></html>`;

    await baixarRelatorioHtmlComoPdf({ html, nomeArquivo });
}

export async function baixarRelatorioDocumentosEmpresaPDF({
    nomeArquivo = "documentos-enviados-empresa.pdf",
    empresa = {},
} = {}) {
    const dataEmissao = new Date().toLocaleDateString("pt-BR");
    const horaEmissao = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const documentos = Array.isArray(empresa.documentos) ? empresa.documentos : [];

    const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8" /><title>Documentos enviados - ${escaparHTML(empresa.nome || "Empresa")}</title>${montarEstilosRelatorioEmpresas()}</head><body>
        <main class="pagina-relatorio">
            <div class="conteudo-pagina-relatorio-empresas">
                ${montarCabecalhoRelatorioEmpresas(`Documentos enviados`, `Empresa: ${empresa.nome || "-"}`)}
                <section class="metadados-relatorio-empresas">
                    <div><span>Emissão</span><strong>${escaparHTML(dataEmissao)} às ${escaparHTML(horaEmissao)}</strong></div>
                    <div><span>Empresa</span><strong>${escaparHTML(limitarTextoRelatorioEmpresas(empresa.nome || "-", 28))}</strong></div>
                    <div><span>Documentos</span><strong>${documentos.length}</strong></div>
                    <div><span>Situação</span><strong>${escaparHTML(empresa.situacaoDocumental || "-")}</strong></div>
                </section>
                ${montarCardEmpresaDetalheRelatorio({ ...empresa, documentos })}
            </div>
            ${montarRodapeRelatorioEmpresas(1, 1, "Relatório visual de documentos da empresa")}
        </main>
    </body></html>`;

    await baixarRelatorioHtmlComoPdf({ html, nomeArquivo });
}

export async function baixarRelatorioColaboradoresTreinamentosPDF({
    nomeArquivo = "relatorio-colaboradores-treinamentos.pdf",
    colaboradores = [],
    titulo = "Relatório de colaboradores e treinamentos",
    filtros = {},
} = {}) {
    const dataEmissao = new Date().toLocaleDateString("pt-BR");
    const colaboradoresPreparados = await prepararColaboradoresRelatorio(colaboradores);
    const empresas = agruparPorEmpresaRelatorio(colaboradoresPreparados);

    if (!empresas.length) {
        alert("Nenhum colaborador encontrado para gerar o relatório.");
        return;
    }

    const conteudo = empresas.map((empresa, indice) => montarSecaoEmpresaRelatorio(empresa, indice, dataEmissao, filtros)).join("");

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
        min-height: 286mm;
        margin: 0 auto;
        padding: 7mm;
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


    .cabecalho-relatorio--padrao-institucional {
        gap: 8px;
        margin-bottom: 12px;
    }

    .marca-pdf-padrao {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        text-align: left;
        color: #07162f;
    }

    .marca-pdf-icone {
        width: 28px;
        height: 28px;
        display: grid;
        place-items: center;
        flex: 0 0 auto;
        color: #07162f;
    }

    .marca-pdf-icone svg {
        width: 28px;
        height: 28px;
        display: block;
        fill: none;
        stroke: currentColor;
        stroke-width: 1.9;
        stroke-linecap: round;
        stroke-linejoin: round;
    }

    .marca-pdf-icone svg * {
        fill: none;
        stroke: currentColor;
        stroke-width: 1.9;
        stroke-linecap: round;
        stroke-linejoin: round;
    }

    .marca-pdf-textos h1 {
        margin: 0;
        color: #07162f;
        font-size: 29px;
        line-height: 1;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        font-weight: 900;
    }

    .marca-pdf-textos p {
        margin: 3px 0 0;
        color: #334155;
        font-size: 7.8px;
        line-height: 1;
        font-weight: 900;
        letter-spacing: 0.28em;
        text-align: center;
        text-transform: uppercase;
    }

    .linha-pdf-padrao {
        height: 2px;
        width: 100%;
        border-radius: 999px;
        background: #07162f;
        box-shadow: 0 4px 0 #07162f;
        margin: 2px 0 8px;
    }

    .titulo-pdf-padrao {
        min-height: 30px;
        display: grid;
        align-content: center;
        justify-items: center;
        text-align: center;
        border-bottom: 2px solid #07162f;
        padding: 5px 18px 7px;
    }

    .titulo-pdf-padrao h2 {
        margin: 0;
        color: var(--azul);
        font-size: 15px;
        line-height: 1.15;
        font-weight: 900;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        white-space: normal;
    }

    .titulo-pdf-padrao p {
        margin: 2px 0 0;
        color: #64748b;
        font-size: 6.7px;
        line-height: 1.2;
        font-weight: 800;
    }

    .dados-empresa--padrao-pdf {
        margin-top: 3px;
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
        font-size: 7.9px;
        line-height: 1.05;
        color: #334155;
        white-space: nowrap;
    }

    .dados-empresa em {
        display: block;
        min-width: 0;
        font-style: normal;
        font-size: 7.9px;
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
        font-size: 7.9px;
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
        margin-top: 8px;
        overflow: hidden;
        background: #fff;
    }

    .bloco h2 {
        min-height: 34px;
        margin: 0;
        padding: 0 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--azul);
        font-size: 13px;
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
        gap: 8px;
        padding: 10px;
    }

    .kpi {
        min-height: 82px;
        display: grid;
        place-items: center;
        text-align: center;
        border: 1px solid var(--linha);
        border-radius: 10px;
        padding: 7px 5px;
        background: #fff;
    }

    .kpi-icone {
        display: grid;
        place-items: center;
        width: 24px;
        height: 24px;
        margin-bottom: 3px;
        color: var(--azul);
    }

    .kpi-icone svg {
        width: 24px;
        height: 24px;
        fill: currentColor;
        display: block;
    }

    .kpi-titulo {
        min-height: 20px;
        font-size: 8.7px;
        font-weight: 800;
    }

    .kpi-valor {
        font-size: 22px;
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



    .pagina-relatorio--detalhe-colaborador {
        page-break-before: always;
    }

    .bloco-detalhamento--pagina-unica {
        margin-top: 10px;
    }

    .detalhe-colaborador--pagina-unica {
        margin-top: 0;
        page-break-inside: avoid;
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
