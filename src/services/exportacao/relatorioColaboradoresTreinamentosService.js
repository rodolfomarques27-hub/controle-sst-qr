// Relatório visual de colaboradores e treinamentos.
import { baixarRelatorioHtmlComoPdf } from "./exportacaoBaseService";
import {
    classeStatusRelatorio,
    escaparHTML,
    ICONES_RELATORIO_COLABORADORES,
    montarCabecalhoEmpresaTreinamentosRelatorio,
    montarCartaoResumoRelatorio,
    montarRodapeTreinamentosRelatorio,
    prepararColaboradoresRelatorio,
} from "./relatorioColaboradoresUtils";

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

function obterEmpresaCompactaRelatorio(colaborador = {}, empresaPadrao = "") {
    const empresaExibicao = String(colaborador.empresaExibicao || "").trim();
    const correspondenciaSubcontratada = empresaExibicao.match(/subcontratada\s*:\s*([^/]+)/i);
    const prefixoSubcontratada = correspondenciaSubcontratada ? "Sub.: " : "";
    const nomeCompleto = String(
        correspondenciaSubcontratada?.[1] ||
        colaborador.empresaNome ||
        colaborador.empresa ||
        empresaPadrao ||
        "-"
    ).trim() || "-";

    if (nomeCompleto.length <= 20) {
        return { rotulo: "Empresa", nome: `${prefixoSubcontratada}${nomeCompleto}` };
    }

    const palavras = nomeCompleto.split(/\s+/).filter(Boolean);
    let nomeCurto = "";

    for (const palavra of palavras) {
        const candidato = nomeCurto ? `${nomeCurto} ${palavra}` : palavra;
        if (candidato.length > 18) break;
        nomeCurto = candidato;
    }

    return {
        rotulo: "Empresa",
        nome: `${prefixoSubcontratada}${nomeCurto || palavras[0] || nomeCompleto}`,
    };
}

function agruparPorEmpresaRelatorio(colaboradores = []) {
    const mapa = new Map();

    colaboradores.forEach((colaborador) => {
        const empresaNome = String(colaborador.empresaNome || colaborador.empresa || "Empresa não informada").trim() || "Empresa não informada";
        const chave = String(colaborador.empresaId || empresaNome).trim().toLowerCase();

        if (!mapa.has(chave)) {
            const empresaCompacta = obterEmpresaCompactaRelatorio(colaborador, empresaNome);
            mapa.set(chave, {
                id: colaborador.empresaId || chave,
                nome: empresaCompacta.nome,
                rotulo: empresaCompacta.rotulo,
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
    `);

    const montarTabelaResumo = (linhas = []) => `
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
                ${linhas.join("") || `<tr><td colspan="8">Nenhum colaborador encontrado.</td></tr>`}
            </tbody>
        </table>
    `;

    const limitePrimeiraPaginaResumo = 14;
    const limiteContinuacaoResumo = 26;
    const linhasPrimeiraPagina = linhasTabela.slice(0, limitePrimeiraPaginaResumo);
    const paginasContinuacaoResumo = [];
    for (
        let indice = limitePrimeiraPaginaResumo;
        indice < linhasTabela.length;
        indice += limiteContinuacaoResumo
    ) {
        paginasContinuacaoResumo.push(`
            <section class="pagina-relatorio quebra-pagina pagina-relatorio--resumo-continuacao">
                <section class="bloco bloco--resumo-continuacao">
                    <h2>Resumo por colaborador - continuação</h2>
                    ${montarTabelaResumo(linhasTabela.slice(indice, indice + limiteContinuacaoResumo))}
                </section>
                ${montarRodapeTreinamentosRelatorio("Relatório visual por empresa")}
            </section>
        `);
    }

    const cartoesDetalhes = colaboradoresEmpresa.map((colaborador, indice) => {
        const validos = limparListaRelatorio(colaborador.validos);
        const pendentes = limparListaRelatorio(colaborador.pendentes);
        const vencidos = limparListaRelatorio(colaborador.vencidos);
        const vencendo = limparListaRelatorio(colaborador.vencendo);

        const fotoColaborador = colaborador.fotoUrl
            ? `<img src="${escaparHTML(colaborador.fotoUrl)}" alt="Foto ${escaparHTML(colaborador.nome || "colaborador")}" />`
            : escaparHTML(obterIniciaisEmpresa(colaborador.nome || "C"));
        const empresaCompacta = obterEmpresaCompactaRelatorio(colaborador, empresa.nome);

        return `
                    <section class="detalhe-colaborador detalhe-colaborador--compacto">
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
                                    <strong>${escaparHTML(empresaCompacta.rotulo)}:</strong>
                                    <span>${escaparHTML(empresaCompacta.nome)}</span>
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
    });

    const detalhes = [];
    for (let indice = 0; indice < cartoesDetalhes.length; indice += 3) {
        detalhes.push(`
            <section class="pagina-relatorio quebra-pagina pagina-relatorio--detalhe-colaborador">
                ${montarCabecalhoEmpresaTreinamentosRelatorio(empresa, dataEmissao, "Detalhamento de colaborador e treinamentos", { exibirDadosEmpresa: false })}
                <section class="bloco bloco-detalhamento bloco-detalhamento--pagina-dupla">
                    <h2>Detalhamento</h2>
                    <div class="detalhes-duplos">
                        ${cartoesDetalhes.slice(indice, indice + 3).join("")}
                    </div>
                </section>
                ${montarRodapeTreinamentosRelatorio("Relatório visual por empresa")}
            </section>
        `);
    }

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
                ${montarTabelaResumo(linhasPrimeiraPagina)}
            </section>

            ${montarRodapeTreinamentosRelatorio("Relatório visual por empresa")}
        </section>
        ${paginasContinuacaoResumo.join("")}
        ${detalhes.join("") || `
            <section class="pagina-relatorio quebra-pagina">
                ${montarCabecalhoEmpresaTreinamentosRelatorio(empresa, dataEmissao, "Detalhamento de colaborador e treinamentos", { exibirDadosEmpresa: false })}
                <section class="bloco bloco-detalhamento"><h2>Detalhamento</h2><p class="lista-vazia">Nenhum colaborador para detalhar.</p></section>
                ${montarRodapeTreinamentosRelatorio("Relatório visual por empresa")}
            </section>
        `}
    `;
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

    .bloco-detalhamento--pagina-dupla {
        margin-top: 8px;
    }

    .detalhes-duplos {
        display: grid;
        grid-template-rows: repeat(3, minmax(0, auto));
        gap: 8px;
    }

    .pagina-relatorio--resumo-continuacao {
        display: flex;
        flex-direction: column;
    }

    .bloco--resumo-continuacao {
        margin-top: 0;
    }

    .pagina-relatorio--resumo-continuacao .rodape-relatorio {
        margin-top: auto;
    }

    .pagina-relatorio--resumo-continuacao .tabela-resumo-colaboradores tbody td {
        height: 34px;
        padding-top: 5px;
        padding-bottom: 5px;
    }

    .detalhe-colaborador--pagina-unica {
        margin-top: 0;
        page-break-inside: avoid;
    }

    .detalhe-colaborador--compacto {
        margin-top: 0;
    }

    .detalhe-colaborador--compacto .detalhe-topo {
        grid-template-columns: 30px 48px minmax(215px, 0.92fr) minmax(330px, 1.45fr);
        gap: 8px;
        padding: 8px 10px;
    }

    .detalhe-colaborador--compacto .avatar-colaborador {
        width: 48px;
        height: 48px;
    }

    .detalhe-colaborador--compacto .detalhe-identificacao h3 {
        margin-bottom: 3px;
        font-size: 14px;
    }

    .detalhe-colaborador--compacto .detalhe-identificacao p,
    .detalhe-colaborador--compacto .detalhe-status-linha {
        font-size: 9px;
        line-height: 1.18;
    }

    .detalhe-colaborador--compacto .detalhe-grids {
        gap: 8px;
        padding: 8px 10px;
    }

    .detalhe-colaborador--compacto .lista-card {
        min-height: 104px;
        padding: 8px;
    }

    .detalhe-colaborador--compacto .lista-card h4 {
        margin-bottom: 5px;
        font-size: 9px;
    }

    .detalhe-colaborador--compacto .lista-card li {
        margin-bottom: 3px;
        font-size: 7.5px;
        line-height: 1.22;
    }

    .detalhe-colaborador--compacto .lista-vazia {
        font-size: 8px;
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
