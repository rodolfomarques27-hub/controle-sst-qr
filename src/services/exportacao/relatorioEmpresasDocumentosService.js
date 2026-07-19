// Relatórios visuais de empresas e documentos.
import { baixarRelatorioHtmlComoPdf } from "./exportacaoBaseService";
import {
    dividirEmLotesRelatorioEmpresas,
    escaparHTML,
} from "./relatorioColaboradoresUtils";

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
