// Relatório visual da Auditoria do Sistema.
import { baixarRelatorioHtmlComoPdf } from "./exportacaoBaseService";
import {
    escaparHTML,
    ICONES_RELATORIO_COLABORADORES,
    montarCartaoResumoRelatorio,
} from "./relatorioColaboradoresUtils";

function classeNivelAuditoriaRelatorio(nivel = "") {
    const texto = String(nivel || "").toLowerCase();

    if (texto.includes("segurança") || texto.includes("seguranca")) return "status-seguranca";
    if (texto.includes("crítico") || texto.includes("critico")) return "status-critico";
    if (texto.includes("alerta")) return "status-alerta";

    return "status-info";
}

function calcularResumoAuditoriaSistemaRelatorio(registros = [], resumo = {}) {
    return {
        totalEventos: Number(resumo.totalEventos ?? registros.length) || 0,
        eventosFiltrados: Number(resumo.eventosFiltrados ?? registros.length) || 0,
        acessos: Number(resumo.acessos ?? 0) || 0,
        alteracoes: Number(resumo.alteracoes ?? 0) || 0,
        seguranca: Number(resumo.seguranca ?? registros.filter((item) => classeNivelAuditoriaRelatorio(item.nivel) === "status-seguranca").length) || 0,
        criticos: Number(resumo.criticos ?? registros.filter((item) => classeNivelAuditoriaRelatorio(item.nivel) === "status-critico").length) || 0,
        alertas: Number(resumo.alertas ?? registros.filter((item) => classeNivelAuditoriaRelatorio(item.nivel) === "status-alerta").length) || 0,
    };
}

function montarLinhaAuditoriaSistemaRelatorio(registro = {}, indice = 0) {
    return `
        <tr>
            <td>${indice + 1}</td>
            <td>${escaparHTML(registro.dataHora || "-")}</td>
            <td class="texto-forte">${escaparHTML(registro.usuario || "-")}</td>
            <td class="texto-forte">${escaparHTML(registro.evento || registro.acaoTecnica || "-")}</td>
            <td>${escaparHTML(registro.modulo || "-")}</td>
            <td class="texto-categoria-auditoria">${escaparHTML(registro.categoria || "-")}</td>
            <td><span class="status-texto ${classeNivelAuditoriaRelatorio(registro.nivel || registro.nivelChave)}">${escaparHTML(registro.nivel || "Informação")}</span></td>
            <td class="descricao-auditoria">${escaparHTML(registro.descricao || "-")}</td>
        </tr>
    `;
}

function montarFiltrosAuditoriaSistemaRelatorio(filtros = {}) {
    const itens = [
        ["Busca", filtros.busca || "-"],
        ["Ação", filtros.acao || "Todas"],
        ["Usuário", filtros.usuario || "Todos"],
        ["Módulo", filtros.modulo || "Todos"],
        ["Categoria", filtros.categoria || "Todas"],
        ["Nível", filtros.nivel || "Todos"],
        ["Período", filtros.periodo || "Todo o período"],
        ["Limite", filtros.limite || "Conforme configuração"],
    ];

    return `
        <section class="bloco bloco-filtros-auditoria">
            <h2>Filtros aplicados</h2>
            <div class="filtros-relatorio-auditoria">
                ${itens.map(([titulo, valor]) => `
                    <div>
                        <strong>${escaparHTML(titulo)}</strong>
                        <span>${escaparHTML(valor)}</span>
                    </div>
                `).join("")}
            </div>
        </section>
    `;
}

function montarTabelaAuditoriaSistemaRelatorio({ registros = [], indiceInicial = 0, vazio = "Nenhum registro encontrado para os filtros selecionados." } = {}) {
    const linhasTabela = registros.map((registro, indice) => montarLinhaAuditoriaSistemaRelatorio(registro, indiceInicial + indice)).join("");

    return `
        <section class="bloco bloco-registros-auditoria">
            <h2>Registros detalhados</h2>
            <table class="tabela-auditoria-sistema-relatorio">
                <colgroup>
                    <col class="col-numero" />
                    <col class="col-data" />
                    <col class="col-usuario" />
                    <col class="col-evento" />
                    <col class="col-modulo" />
                    <col class="col-categoria" />
                    <col class="col-nivel" />
                    <col class="col-descricao" />
                </colgroup>
                <thead>
                    <tr>
                        <th><div class="th-conteudo">#</div></th>
                        <th><div class="th-conteudo">Data/Hora</div></th>
                        <th><div class="th-conteudo">Usuário</div></th>
                        <th><div class="th-conteudo">Evento</div></th>
                        <th><div class="th-conteudo">Módulo</div></th>
                        <th><div class="th-conteudo">Categoria</div></th>
                        <th><div class="th-conteudo">Nível</div></th>
                        <th><div class="th-conteudo">Descrição</div></th>
                    </tr>
                </thead>
                <tbody>
                    ${linhasTabela || `<tr><td colspan="8">${escaparHTML(vazio)}</td></tr>`}
                </tbody>
            </table>
        </section>
    `;
}

function montarRodapeAuditoriaSistemaRelatorio(pagina = 1, totalPaginas = 1) {
    return `
        <footer class="rodape-relatorio rodape-relatorio-auditoria">
            <span>🛡 SafeScan Brasil</span>
            <span>Relatório visual da Auditoria do Sistema · Página ${escaparHTML(pagina)} de ${escaparHTML(totalPaginas)}</span>
        </footer>
    `;
}

function montarCabecalhoAuditoriaSistemaRelatorio(titulo = "Relatório da Auditoria do Sistema") {
    return `
        <header class="cabecalho-relatorio cabecalho-relatorio--modelo-aprovado cabecalho-relatorio--auditoria-sistema">
            <div class="marca-relatorio-controle marca-relatorio-controle--somente-texto">
                <div class="marca-relatorio-controle__textos">
                    <h1>SAFESCAN BRASIL</h1>
                </div>
            </div>

            <div class="titulo-relatorio-cabecalho">
                <span></span>
                <strong>${escaparHTML(String(titulo || "Relatório da Auditoria do Sistema").toUpperCase())}</strong>
                <span></span>
            </div>
        </header>
    `;
}

function dividirRegistrosAuditoriaSistemaRelatorio(registros = [], limitePrimeiraPagina = 10, limiteDemaisPaginas = 18) {
    const lista = Array.isArray(registros) ? registros : [];

    if (!lista.length) {
        return [{ registros: [], indiceInicial: 0 }];
    }

    const paginas = [];
    let cursor = 0;

    paginas.push({
        registros: lista.slice(0, limitePrimeiraPagina),
        indiceInicial: 0,
    });
    cursor = limitePrimeiraPagina;

    while (cursor < lista.length) {
        paginas.push({
            registros: lista.slice(cursor, cursor + limiteDemaisPaginas),
            indiceInicial: cursor,
        });
        cursor += limiteDemaisPaginas;
    }

    return paginas;
}

function montarSecaoAuditoriaSistemaRelatorio({ registros = [], resumo = {}, filtros = {}, dataEmissao = "", titulo = "Relatório da Auditoria do Sistema" } = {}) {
    const resumoCalculado = calcularResumoAuditoriaSistemaRelatorio(registros, resumo);
    const paginasRegistros = dividirRegistrosAuditoriaSistemaRelatorio(registros);
    const totalPaginas = paginasRegistros.length;

    return paginasRegistros.map((paginaRegistros, indicePagina) => {
        const paginaAtual = indicePagina + 1;
        const primeiraPagina = indicePagina === 0;

        return `
            <section class="pagina-relatorio pagina-relatorio-auditoria-sistema ${primeiraPagina ? "" : "quebra-pagina pagina-relatorio-auditoria-sistema--continua"}">
                ${montarCabecalhoAuditoriaSistemaRelatorio(titulo)}

                ${primeiraPagina ? `
                    <section class="bloco">
                        <h2>Resumo geral</h2>
                        <div class="kpis">
                            ${montarCartaoResumoRelatorio({ icone: ICONES_RELATORIO_COLABORADORES.total, titulo: "Total", valor: resumoCalculado.totalEventos, classe: "kpi-total" })}
                            ${montarCartaoResumoRelatorio({ icone: ICONES_RELATORIO_COLABORADORES.analise, titulo: "Filtrados", valor: resumoCalculado.eventosFiltrados, classe: "kpi-info" })}
                            ${montarCartaoResumoRelatorio({ icone: ICONES_RELATORIO_COLABORADORES.liberados, titulo: "Acessos", valor: resumoCalculado.acessos, classe: "kpi-ok" })}
                            ${montarCartaoResumoRelatorio({ icone: ICONES_RELATORIO_COLABORADORES.pendencia, titulo: "Alterações", valor: resumoCalculado.alteracoes, classe: "kpi-alerta" })}
                            ${montarCartaoResumoRelatorio({ icone: ICONES_RELATORIO_COLABORADORES.bloqueados, titulo: "Segurança", valor: resumoCalculado.seguranca, classe: "kpi-seguranca" })}
                            ${montarCartaoResumoRelatorio({ icone: ICONES_RELATORIO_COLABORADORES.vencidos, titulo: "Críticos", valor: resumoCalculado.criticos, classe: "kpi-critico" })}
                            ${montarCartaoResumoRelatorio({ icone: ICONES_RELATORIO_COLABORADORES.vencer, titulo: "Alertas", valor: resumoCalculado.alertas, classe: "kpi-vencendo" })}
                        </div>
                    </section>

                    ${montarFiltrosAuditoriaSistemaRelatorio(filtros)}

                    <div class="observacao-auditoria observacao-auditoria--externa">
                        Relatório gerado com base nos eventos carregados e nos filtros aplicados na tela Auditoria do Sistema.
                    </div>
                ` : `
                    <div class="observacao-auditoria observacao-auditoria--continua">
                        Continuação dos registros detalhados da Auditoria do Sistema.
                    </div>
                `}

                ${montarTabelaAuditoriaSistemaRelatorio({
                    registros: paginaRegistros.registros,
                    indiceInicial: paginaRegistros.indiceInicial,
                })}

                ${montarRodapeAuditoriaSistemaRelatorio(paginaAtual, totalPaginas)}
            </section>
        `;
    }).join("");
}

export async function baixarRelatorioAuditoriaSistemaPDF({
    nomeArquivo = "relatorio-auditoria-sistema.pdf",
    registros = [],
    resumo = {},
    filtros = {},
    titulo = "Relatório da Auditoria do Sistema",
} = {}) {
    const dataEmissao = new Date().toLocaleDateString("pt-BR");
    const conteudo = montarSecaoAuditoriaSistemaRelatorio({ registros, resumo, filtros, dataEmissao, titulo });

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
        --indigo: #4f46e5;
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

    .pagina-relatorio-auditoria-sistema {
        height: 286mm;
        min-height: 286mm;
        max-height: 286mm;
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }

    .pagina-relatorio-auditoria-sistema--continua .cabecalho-relatorio {
        margin-bottom: 8px;
    }

    .cabecalho-relatorio {
        display: grid;
        gap: 6px;
        margin-bottom: 8px;
        padding-top: 0;
    }

    .marca-relatorio-controle {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        text-align: center;
        flex-wrap: nowrap;
    }

    .marca-relatorio-controle--somente-texto {
        justify-content: center;
        width: 100%;
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

    .titulo-relatorio-cabecalho {
        display: grid;
        grid-template-columns: minmax(70px, 1fr) auto minmax(70px, 1fr);
        align-items: center;
        gap: 16px;
        margin-top: 0;
        padding-bottom: 8px;
        border-bottom: 1px solid var(--linha);
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
        grid-template-columns: 1.1fr 1.1fr 1.2fr 0.9fr 1fr;
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

    .dados-empresa span svg,
    .dados-empresa span svg * {
        width: 20px;
        height: 20px;
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
    .kpi-seguranca .kpi-icone { color: var(--indigo); }

    .filtros-relatorio-auditoria {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 7px;
        padding: 9px;
    }

    .filtros-relatorio-auditoria div {
        min-height: 44px;
        display: grid;
        align-content: center;
        gap: 3px;
        border: 1px solid var(--linha);
        border-radius: 10px;
        background: #fbfdff;
        padding: 6px;
        text-align: center;
    }

    .filtros-relatorio-auditoria strong {
        color: #334155;
        font-size: 7.9px;
        text-transform: uppercase;
    }

    .filtros-relatorio-auditoria span {
        color: #0f172a;
        font-size: 9.2px;
        font-weight: 900;
        overflow-wrap: anywhere;
    }

    .observacao-auditoria {
        margin: 7px 0 8px;
        padding: 7px 10px;
        border-radius: 10px;
        background: #f8fbff;
        border: 1px solid var(--linha);
        color: #334155;
        font-size: 8.8px;
        line-height: 1.35;
    }

    .observacao-auditoria--externa {
        margin-top: 12px;
    }

    .observacao-auditoria--continua {
        margin-top: 2px;
        margin-bottom: 7px;
    }

    .bloco-registros-auditoria {
        margin-top: 0;
        flex: 0 0 auto;
    }

    table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
        font-size: 8.5px;
    }

    .tabela-auditoria-sistema-relatorio .col-numero { width: 4%; }
    .tabela-auditoria-sistema-relatorio .col-data { width: 12%; }
    .tabela-auditoria-sistema-relatorio .col-usuario { width: 17%; }
    .tabela-auditoria-sistema-relatorio .col-evento { width: 14%; }
    .tabela-auditoria-sistema-relatorio .col-modulo { width: 10%; }
    .tabela-auditoria-sistema-relatorio .col-categoria { width: 12%; }
    .tabela-auditoria-sistema-relatorio .col-nivel { width: 9%; }
    .tabela-auditoria-sistema-relatorio .col-descricao { width: 22%; }

    thead tr { height: 42px; }

    thead th {
        background: linear-gradient(180deg, #075bbd, #033f88);
        color: #fff;
        height: 42px;
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
        height: 42px;
        min-height: 42px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0 6px;
        box-sizing: border-box;
        text-align: center;
        line-height: 1.1;
        font-size: 7.9px;
        font-weight: 900;
        white-space: normal;
        overflow: hidden;
    }

    tbody td {
        height: 30px;
        padding: 5px 6px;
        border-bottom: 1px solid var(--linha);
        border-right: 1px solid var(--linha);
        text-align: center;
        vertical-align: middle;
        overflow: hidden;
        overflow-wrap: anywhere;
    }

    tbody tr:nth-child(even) { background: #fbfdff; }

    .texto-forte {
        font-weight: 800;
        text-align: left;
        line-height: 1.15;
        overflow-wrap: anywhere;
    }

    .texto-categoria-auditoria {
        font-weight: 700;
        line-height: 1.18;
        color: #334155;
    }

    .descricao-auditoria {
        text-align: left;
        line-height: 1.25;
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

    .status-texto.status-alerta { color: var(--laranja) !important; }
    .status-texto.status-critico { color: var(--vermelho) !important; }
    .status-texto.status-info { color: var(--azul) !important; }
    .status-texto.status-seguranca { color: var(--indigo) !important; }
    .status-texto.status-neutro { color: #475569 !important; }

    .rodape-relatorio {
        display: flex;
        justify-content: space-between;
        margin-top: auto;
        padding: 8px 12px;
        color: #fff;
        background: linear-gradient(90deg, #032b63, #075bbd);
        border-radius: 0 0 12px 12px;
        font-size: 9.8px;
        font-weight: 800;
    }

    .rodape-relatorio-auditoria {
        break-inside: avoid;
        page-break-inside: avoid;
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

        .pagina-relatorio-auditoria-sistema {
            min-height: auto;
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
