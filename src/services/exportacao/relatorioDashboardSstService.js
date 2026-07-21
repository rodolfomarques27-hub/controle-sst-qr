// Relatório visual do Dashboard SST.
import { baixarRelatorioHtmlComoPdf } from "./exportacaoBaseService";
import { escaparHTML } from "./relatorioColaboradoresUtils";

function valorSeguroRelatorioDashboard(valor, fallback = "-") {
    if (valor === null || valor === undefined || valor === "") return fallback;

    if (Array.isArray(valor)) return String(valor.length);

    if (typeof valor === "object") {
        const chavesPossiveis = ["total", "quantidade", "qtd", "valor", "count", "contador", "length"];
        const chaveEncontrada = chavesPossiveis.find((chave) => valor[chave] !== undefined && valor[chave] !== null && valor[chave] !== "");

        if (chaveEncontrada) return String(valor[chaveEncontrada]);

        return fallback;
    }

    return String(valor);
}

function numeroSeguroRelatorioDashboard(valor) {
    if (Array.isArray(valor)) return valor.length;

    if (valor && typeof valor === "object") {
        const chavesPossiveis = ["total", "quantidade", "qtd", "valor", "count", "contador", "length"];
        const chaveEncontrada = chavesPossiveis.find((chave) => valor[chave] !== undefined && valor[chave] !== null && valor[chave] !== "");
        if (chaveEncontrada) return numeroSeguroRelatorioDashboard(valor[chaveEncontrada]);
        return 0;
    }

    const numero = Number(valor || 0);
    return Number.isFinite(numero) ? numero : 0;
}

function quantidadeSeguraRelatorioDashboard(valor) {
    return String(numeroSeguroRelatorioDashboard(valor));
}

function formatarDataRelatorioDashboard(valor) {
    if (!valor) return "-";

    try {
        const data = valor instanceof Date ? valor : new Date(valor);
        if (Number.isNaN(data.getTime())) return String(valor);
        return data.toLocaleDateString("pt-BR");
    } catch {
        return String(valor);
    }
}

function textoStatusRelatorioDashboard(status = {}) {
    if (typeof status === "string") return status;
    return status?.texto || status?.label || status?.status || "-";
}

function classeStatusRelatorioDashboard(status = "") {
    const texto = String(status || "").toLowerCase();

    if (texto.includes("liberado") || texto.includes("em dia") || texto.includes("conclu") || texto.includes("corrig")) {
        return "status-ok";
    }

    if (texto.includes("vencer") || texto.includes("pend") || texto.includes("aten") || texto.includes("análise") || texto.includes("analise")) {
        return "status-alerta";
    }

    if (texto.includes("venc") || texto.includes("bloque") || texto.includes("crít") || texto.includes("crit")) {
        return "status-critico";
    }

    return "status-neutro";
}

function limitarItensRelatorioDashboard(lista = [], limite = 8) {
    const itens = Array.isArray(lista) ? lista.filter(Boolean) : [];
    return {
        itens: itens.slice(0, limite),
        restantes: Math.max(0, itens.length - limite),
        total: itens.length,
    };
}

function montarLinhasTabelaRelatorioDashboard({
    lista = [],
    limite = 8,
    vazio = "Nenhum registro encontrado.",
    colunas = [],
    renderLinha,
}) {
    const resumo = limitarItensRelatorioDashboard(lista, limite);

    if (!resumo.itens.length) {
        return `
            <table class="tabela-relatorio-dashboard">
                <thead><tr>${colunas.map((coluna) => `<th>${escaparHTML(coluna)}</th>`).join("")}</tr></thead>
                <tbody><tr><td colspan="${colunas.length || 1}" class="tabela-vazia">${escaparHTML(vazio)}</td></tr></tbody>
            </table>
        `;
    }

    return `
        <table class="tabela-relatorio-dashboard">
            <thead><tr>${colunas.map((coluna) => `<th>${escaparHTML(coluna)}</th>`).join("")}</tr></thead>
            <tbody>
                ${resumo.itens.map(renderLinha).join("")}
                ${resumo.restantes ? `<tr><td colspan="${colunas.length || 1}" class="mais-registros">+ ${resumo.restantes} registro(s) não exibido(s) neste resumo.</td></tr>` : ""}
            </tbody>
        </table>
    `;
}

export async function baixarRelatorioDashboardSstPDF({
    nomeArquivo = "relatorio-dashboard-sst.pdf",
    cards = [],
    indicadores = {},
    totalItens = 0,
    resumoConformidade = [],
    rankingPendenciasEmpresa = [],
    colaboradoresPorFuncao = [],
    documentosPorTipo = [],
    ultimosDocumentosEnviados = [],
    pendencias = [],
    documentosVencidos = [],
    documentosAVencer = [],
    auditoriasCampoMes = 0,
    mediaConformidadeCampo = 0,
    desviosCampoAbertos = 0,
    desviosCampoCorrigidos = 0,
    aniversariantesMes = [],
    proximoAniversarioDashboard = null,
    alertasImportantes = [],
    storagePercentual = 0,
    totalStorageLabel = "0 MB",
    storageLimiteLabelDashboard = "0 MB",
} = {}) {
    const dataEmissao = new Date().toLocaleDateString("pt-BR");
    const horaEmissao = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const cardsRelatorio = Array.isArray(cards) ? cards.filter(Boolean) : [];
    const totalDocumentosEmpresaCriticos = numeroSeguroRelatorioDashboard(documentosVencidos.length) + numeroSeguroRelatorioDashboard(documentosAVencer.length);
    const totalConcluidos = numeroSeguroRelatorioDashboard(indicadores.concluidos ?? indicadores.emDia);
    const percentualConformidade = totalItens ? Math.round((totalConcluidos / totalItens) * 100) : 0;

    const cardsHtml = cardsRelatorio.map((card) => `
        <article class="card-dashboard-relatorio">
            <p>${escaparHTML(card.label || card.titulo || "Indicador")}</p>
            <strong>${escaparHTML(valorSeguroRelatorioDashboard(card.valor, "0"))}</strong>
            <span>${escaparHTML(card.detalhe || "Resumo do card do Dashboard SST")}</span>
        </article>
    `).join("");

    const resumoConformidadeHtml = (Array.isArray(resumoConformidade) ? resumoConformidade : []).map((item) => {
        const valor = numeroSeguroRelatorioDashboard(item.valor);
        const total = numeroSeguroRelatorioDashboard(item.total || totalItens);
        const percentual = total ? Math.round((valor / total) * 100) : 0;

        return `
            <div class="linha-progresso">
                <span class="progresso-label">${escaparHTML(item.label || "Status")}</span>
                <div class="barra"><span style="width:${Math.max(0, Math.min(100, percentual))}%"></span></div>
                <strong class="progresso-valor">${valor} / ${total} (${percentual}%)</strong>
            </div>
        `;
    }).join("");

    const alertasHtml = limitarItensRelatorioDashboard(alertasImportantes, 5).itens
        .map((alerta) => `<li>${escaparHTML(alerta.titulo || alerta.texto || alerta.label || alerta)}</li>`)
        .join("");

    const rankingHtml = montarLinhasTabelaRelatorioDashboard({
        lista: rankingPendenciasEmpresa,
        limite: 6,
        vazio: "Nenhuma pendência por empresa encontrada.",
        colunas: ["Empresa", "Pendências", "Status"],
        renderLinha: (item) => {
            const pendenciasEmpresa = numeroSeguroRelatorioDashboard(item.total ?? item.valor ?? item.quantidade ?? item.pendencias ?? 0);
            const statusEmpresa = item.status || (pendenciasEmpresa > 0 ? "Monitorar" : "Sem pendência");

            return `
                <tr>
                    <td class="texto-forte">${escaparHTML(item.empresa || item.nome || item.label || "Empresa não informada")}</td>
                    <td class="centralizado">${escaparHTML(pendenciasEmpresa)}</td>
                    <td class="centralizado"><span class="badge ${classeStatusRelatorioDashboard(statusEmpresa)}">${escaparHTML(statusEmpresa)}</span></td>
                </tr>
            `;
        },
    });

    const funcoesDisponiveis = Array.isArray(colaboradoresPorFuncao) ? colaboradoresPorFuncao.filter(Boolean) : [];
    const funcoesHtml = funcoesDisponiveis.length
        ? montarLinhasTabelaRelatorioDashboard({
            lista: funcoesDisponiveis,
            limite: 6,
            vazio: "Nenhum colaborador por função encontrado.",
            colunas: ["Função", "Quantidade"],
            renderLinha: (item) => `
                <tr>
                    <td class="texto-forte">${escaparHTML(item.funcao || item.nome || item.label || "Função não informada")}</td>
                    <td class="centralizado">${escaparHTML(valorSeguroRelatorioDashboard(item.total || item.valor || item.quantidade || 0, "0"))}</td>
                </tr>
            `,
        })
        : `<p class="estado-vazio-tabela">Nenhum colaborador por função encontrado.</p>`;

    const documentosTipoHtml = montarLinhasTabelaRelatorioDashboard({
        lista: documentosPorTipo,
        limite: 8,
        vazio: "Nenhum documento por tipo encontrado.",
        colunas: ["Tipo", "Quantidade"],
        renderLinha: (item) => `
            <tr>
                <td class="texto-forte">${escaparHTML(item.tipo || item.nome || item.label || "Tipo não informado")}</td>
                <td class="centralizado">${escaparHTML(valorSeguroRelatorioDashboard(item.total || item.valor || item.quantidade || 0, "0"))}</td>
            </tr>
        `,
    });

    const pendenciasHtml = montarLinhasTabelaRelatorioDashboard({
        lista: pendencias,
        limite: 8,
        vazio: "Nenhuma pendência crítica encontrada.",
        colunas: ["Colaborador", "Empresa", "Documento", "Status", "Vencimento"],
        renderLinha: (item) => {
            const colaborador = item.colaborador || item;
            const treinamento = item.treinamento || item.documento || {};
            const status = textoStatusRelatorioDashboard(item.status || treinamento.status || colaborador.statusGeral);

            return `
                <tr>
                    <td class="texto-forte">${escaparHTML(colaborador.nome || item.nome || "-")}</td>
                    <td>${escaparHTML(colaborador.empresaExibicao || colaborador.empresa || item.empresa || "-")}</td>
                    <td>${escaparHTML(treinamento.nome || item.documentoNome || item.tipo || "-")}</td>
                    <td class="centralizado"><span class="badge ${classeStatusRelatorioDashboard(status)}">${escaparHTML(status)}</span></td>
                    <td class="centralizado">${escaparHTML(formatarDataRelatorioDashboard(item.vencimento || treinamento.vencimento || item.dataVencimento))}</td>
                </tr>
            `;
        },
    });

    const ultimosDocumentosHtml = montarLinhasTabelaRelatorioDashboard({
        lista: ultimosDocumentosEnviados,
        limite: 7,
        vazio: "Nenhum documento recente encontrado.",
        colunas: ["Documento", "Empresa/Colaborador", "Status", "Data"],
        renderLinha: (item) => {
            const status = textoStatusRelatorioDashboard(item.status || item.statusDocumento || item.statusGeral);

            return `
                <tr>
                    <td class="texto-forte">${escaparHTML(item.nome || item.documento || item.tipo || "-")}</td>
                    <td>${escaparHTML(item.empresa || item.colaborador || item.responsavel || "-")}</td>
                    <td class="centralizado"><span class="badge ${classeStatusRelatorioDashboard(status)}">${escaparHTML(status)}</span></td>
                    <td class="centralizado">${escaparHTML(formatarDataRelatorioDashboard(item.data || item.criadoEm || item.created_at || item.updated_at))}</td>
                </tr>
            `;
        },
    });

    const cabecalhoRelatorio = (subtitulo = "Resumo executivo com as informações dos cards e indicadores principais.") => `
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
                <h2>RELATÓRIO DO DASHBOARD SST</h2>
                <p>${escaparHTML(subtitulo)}</p>
            </div>
        </header>
    `;

    const rodapeRelatorio = (pagina, total = 3) => `
        <footer class="rodape-relatorio">
            <span>SafeScan Brasil — Relatório gerado automaticamente pelo Dashboard SST.</span>
            <span>Página ${pagina} de ${total}</span>
        </footer>
    `;

    const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Relatório do Dashboard SST</title>
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
        --cinza: #64748b;
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
        height: 297mm;
        margin: 0 auto;
        padding: 7mm;
        background: #fff;
        border: 1px solid #d8e2ef;
        border-radius: 16px;
        box-shadow: none;
        position: relative;
        overflow: hidden;
        page-break-after: always;
        break-after: page;
    }

    .pagina-relatorio:last-child {
        page-break-after: auto;
        break-after: auto;
    }

    .cabecalho-pdf-padrao {
        display: grid;
        gap: 6px;
        margin-bottom: 9px;
    }

    .marca-pdf-padrao {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        text-align: left;
        padding-top: 1px;
    }

    .marca-pdf-icone {
        width: 30px;
        height: 30px;
        display: grid;
        place-items: center;
        color: #07162f;
        flex: 0 0 auto;
    }

    .marca-pdf-icone svg {
        width: 27px;
        height: 27px;
        fill: none;
        stroke: currentColor;
        stroke-width: 1.9;
        stroke-linecap: round;
        stroke-linejoin: round;
    }

    .marca-pdf-textos h1 {
        margin: 0;
        color: #07162f;
        font-size: 28px;
        line-height: .94;
        font-weight: 900;
        letter-spacing: .16em;
        text-transform: uppercase;
    }

    .marca-pdf-textos p {
        margin: 2px 0 0;
        color: #334155;
        font-size: 7px;
        line-height: 1;
        font-weight: 900;
        letter-spacing: .32em;
        text-transform: uppercase;
        text-align: center;
    }

    .linha-pdf-padrao {
        height: 2px;
        background: #07162f;
        width: 100%;
        margin: 0;
    }

    .titulo-pdf-padrao {
        border-top: 2px solid #07162f;
        border-bottom: 2px solid #07162f;
        text-align: center;
        padding: 7px 10px 8px;
        min-height: 42px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 4px;
        overflow: hidden;
    }

    .titulo-pdf-padrao h2 {
        margin: 0;
        color: var(--azul);
        font-size: 13.8px;
        line-height: 1.16;
        font-weight: 900;
        letter-spacing: .045em;
        text-transform: uppercase;
        white-space: normal;
        max-width: 98%;
    }

    .titulo-pdf-padrao p {
        margin: 0;
        color: #64748b;
        font-size: 7.2px;
        line-height: 1.35;
        font-weight: 800;
        max-width: 96%;
    }

    .cabecalho-relatorio {
        display: grid;
        gap: 6px;
        margin-bottom: 9px;
    }

    .linha-cabecalho-padrao {
        height: 2px;
        background: #07162f;
        width: 100%;
        margin: 0;
    }

    .marca-relatorio-controle {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        text-align: left;
        padding-top: 1px;
    }

    .escudo-controle-sst-relatorio {
        width: 30px;
        height: 30px;
        display: grid;
        place-items: center;
        color: #07162f;
    }

    .escudo-controle-sst-relatorio svg {
        width: 27px;
        height: 27px;
        fill: none;
        stroke: currentColor;
        stroke-width: 1.9;
        stroke-linecap: round;
        stroke-linejoin: round;
    }

    .marca-relatorio-controle__textos h1 {
        margin: 0;
        color: #07162f;
        font-size: 28px;
        line-height: .94;
        font-weight: 900;
        letter-spacing: .16em;
        text-transform: uppercase;
    }

    .marca-relatorio-controle__textos p {
        margin: 2px 0 0;
        color: #64748b;
        font-size: 7px;
        font-weight: 900;
        letter-spacing: .34em;
        text-transform: uppercase;
    }

    .titulo-relatorio {
        border-top: 2px solid #07162f;
        border-bottom: 2px solid #07162f;
        text-align: center;
        padding: 4px 0 4px;
    }

    .titulo-relatorio h2 {
        margin: 0;
        color: var(--azul);
        font-size: 17px;
        line-height: 1;
        font-weight: 900;
        letter-spacing: .07em;
        text-transform: uppercase;
    }

    .titulo-relatorio p {
        margin: 3px 0 0;
        color: #64748b;
        font-size: 7.2px;
        font-weight: 700;
    }

    .faixa-info {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        border: 1px solid var(--linha);
        border-radius: 14px;
        overflow: hidden;
        margin-bottom: 9px;
        background: #f8fbff;
    }

    .faixa-info div { padding: 7px 8px; border-right: 1px solid var(--linha); }
    .faixa-info div:last-child { border-right: 0; }
    .faixa-info span { display: block; color: #64748b; font-size: 6.6px; font-weight: 900; letter-spacing: .08em; text-transform: uppercase; }
    .faixa-info strong { display: block; margin-top: 3px; color: #07162f; font-size: 8px; font-weight: 900; }

    .cards-dashboard-relatorio {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 6px;
        margin-bottom: 9px;
    }

    .card-dashboard-relatorio {
        min-height: 60px;
        padding: 7px;
        border: 1px solid var(--linha);
        border-radius: 12px;
        background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
    }

    .card-dashboard-relatorio p {
        margin: 0;
        color: #475569;
        font-size: 6.7px;
        line-height: 1.15;
        font-weight: 900;
        letter-spacing: .035em;
        text-transform: uppercase;
    }

    .card-dashboard-relatorio strong {
        display: block;
        margin-top: 4px;
        color: #07162f;
        font-size: 17px;
        line-height: 1;
        font-weight: 900;
    }

    .card-dashboard-relatorio span {
        display: block;
        margin-top: 4px;
        color: #64748b;
        font-size: 6.8px;
        line-height: 1.18;
        font-weight: 700;
    }

    .grid-duplo { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px; }
    .grid-duplo-pagina-2 { display: grid; grid-template-columns: 1fr 1.25fr; gap: 9px; margin-bottom: 9px; align-items: stretch; }
    .pilha-tabelas { display: grid; grid-template-columns: 1fr; gap: 9px; }
    .estado-vazio-tabela { margin: 0; min-height: 38px; padding: 12px 14px; border: 1px dashed #cbd5e1; border-radius: 10px; background: #f8fbff; color: #64748b; display: flex; align-items: center; justify-content: center; text-align: center; font-size: 7.8px; line-height: 1.35; font-weight: 800; }
    .secao-relatorio { border: 1px solid var(--linha); border-radius: 13px; background: #fff; overflow: hidden; margin-bottom: 9px; break-inside: avoid; page-break-inside: avoid; }
    .secao-titulo { padding: 8px 10px 7px; background: #f8fbff; border-bottom: 1px solid var(--linha); }
    .secao-titulo h3 { margin: 0; color: #07162f; font-size: 9.2px; line-height: 1.25; text-transform: uppercase; letter-spacing: .055em; }
    .secao-titulo p { margin: 3px 0 0; color: #64748b; font-size: 6.7px; line-height: 1.25; font-weight: 700; }
    .secao-corpo { padding: 11px 12px; }
    .secao-tabela-ampla .secao-corpo { padding: 12px; }

    .linha-progresso { display: grid; grid-template-columns: 64px 1fr 74px; align-items: center; gap: 9px; min-height: 18px; margin: 0 0 9px; padding: 1px 0; }
    .linha-progresso:last-child { margin-bottom: 0; }
    .progresso-label { color: #0f172a; font-size: 7.2px; line-height: 1.2; font-weight: 900; white-space: nowrap; }
    .progresso-valor { color: #0f172a; font-size: 7.1px; line-height: 1.2; font-weight: 900; text-align: right; white-space: nowrap; }
    .barra { width: 100%; height: 6px; border-radius: 999px; background: #e2e8f0; overflow: hidden; }
    .barra span { display: block; height: 100%; border-radius: 999px; background: linear-gradient(90deg, #064fae 0%, #0b66d8 100%); }

    .lista-alertas { margin: 0; padding-left: 15px; color: #334155; font-size: 7.4px; line-height: 1.35; font-weight: 700; }
    .lista-alertas li { margin-bottom: 3px; }
    .lista-alertas-vazia { color: #64748b; font-size: 7.5px; font-weight: 700; margin: 0; }

    .tabela-relatorio-dashboard { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 8px; table-layout: fixed; overflow: hidden; border-radius: 10px; border: 1px solid #dbe6f5; }
    .tabela-relatorio-dashboard th { background: #07162f; color: #fff; padding: 9px 10px; text-align: left; font-size: 6.9px; line-height: 1.28; letter-spacing: .025em; text-transform: uppercase; white-space: normal; vertical-align: middle; border-right: 1px solid rgba(255,255,255,.18); }
    .tabela-relatorio-dashboard th:last-child { border-right: 0; }
    .tabela-relatorio-dashboard td { border-bottom: 1px solid #e2e8f0; padding: 8px 10px; vertical-align: middle; color: #334155; line-height: 1.35; overflow-wrap: anywhere; border-right: 1px solid #edf2f7; }
    .tabela-relatorio-dashboard td:last-child { border-right: 0; }
    .tabela-relatorio-dashboard tbody tr:last-child td { border-bottom: 0; }
    .tabela-ranking-wrapper .tabela-relatorio-dashboard th:nth-child(1),
    .tabela-ranking-wrapper .tabela-relatorio-dashboard td:nth-child(1) { width: 58%; }
    .tabela-ranking-wrapper .tabela-relatorio-dashboard th:nth-child(2),
    .tabela-ranking-wrapper .tabela-relatorio-dashboard td:nth-child(2) { width: 18%; text-align: center; }
    .tabela-ranking-wrapper .tabela-relatorio-dashboard th:nth-child(3),
    .tabela-ranking-wrapper .tabela-relatorio-dashboard td:nth-child(3) { width: 24%; text-align: center; }
    .tabela-funcoes-wrapper .tabela-relatorio-dashboard th:nth-child(1),
    .tabela-funcoes-wrapper .tabela-relatorio-dashboard td:nth-child(1) { width: 75%; }
    .tabela-funcoes-wrapper .tabela-relatorio-dashboard th:nth-child(2),
    .tabela-funcoes-wrapper .tabela-relatorio-dashboard td:nth-child(2) { width: 25%; text-align: center; }
    .tabela-documentos-tipo-wrapper .tabela-relatorio-dashboard th:nth-child(1),
    .tabela-documentos-tipo-wrapper .tabela-relatorio-dashboard td:nth-child(1) { width: 72%; }
    .tabela-documentos-tipo-wrapper .tabela-relatorio-dashboard th:nth-child(2),
    .tabela-documentos-tipo-wrapper .tabela-relatorio-dashboard td:nth-child(2) { width: 28%; text-align: center; }
    .tabela-ultimos-documentos-wrapper .tabela-relatorio-dashboard th:nth-child(1),
    .tabela-ultimos-documentos-wrapper .tabela-relatorio-dashboard td:nth-child(1) { width: 37%; }
    .tabela-ultimos-documentos-wrapper .tabela-relatorio-dashboard th:nth-child(2),
    .tabela-ultimos-documentos-wrapper .tabela-relatorio-dashboard td:nth-child(2) { width: 31%; }
    .tabela-ultimos-documentos-wrapper .tabela-relatorio-dashboard th:nth-child(3),
    .tabela-ultimos-documentos-wrapper .tabela-relatorio-dashboard td:nth-child(3) { width: 15%; text-align: center; }
    .tabela-ultimos-documentos-wrapper .tabela-relatorio-dashboard th:nth-child(4),
    .tabela-ultimos-documentos-wrapper .tabela-relatorio-dashboard td:nth-child(4) { width: 17%; text-align: center; }
    .tabela-pendencias-wrapper .tabela-relatorio-dashboard th:nth-child(1),
    .tabela-pendencias-wrapper .tabela-relatorio-dashboard td:nth-child(1) { width: 25%; }
    .tabela-pendencias-wrapper .tabela-relatorio-dashboard th:nth-child(2),
    .tabela-pendencias-wrapper .tabela-relatorio-dashboard td:nth-child(2) { width: 17%; }
    .tabela-pendencias-wrapper .tabela-relatorio-dashboard th:nth-child(3),
    .tabela-pendencias-wrapper .tabela-relatorio-dashboard td:nth-child(3) { width: 34%; }
    .tabela-pendencias-wrapper .tabela-relatorio-dashboard th:nth-child(4),
    .tabela-pendencias-wrapper .tabela-relatorio-dashboard td:nth-child(4) { width: 12%; text-align: center; }
    .tabela-pendencias-wrapper .tabela-relatorio-dashboard th:nth-child(5),
    .tabela-pendencias-wrapper .tabela-relatorio-dashboard td:nth-child(5) { width: 12%; text-align: center; }
    .tabela-relatorio-dashboard tr:nth-child(even) td { background: #f8fbff; }
    .texto-forte { color: #0f172a !important; font-weight: 900; }
    .centralizado { text-align: center !important; }
    .tabela-vazia, .mais-registros { text-align: center; color: #64748b !important; font-weight: 800; }

    .badge { display: inline-flex; align-items: center; justify-content: center; border-radius: 999px; min-width: 54px; padding: 3px 7px; font-size: 6.8px; line-height: 1.1; font-weight: 900; white-space: nowrap; }
    .status-ok { background: #e7f8ef; color: var(--verde); }
    .status-alerta { background: #fff4de; color: #b45309; }
    .status-critico { background: #ffe8e8; color: var(--vermelho); }
    .status-neutro { background: #edf2f7; color: #475569; }

    .rodape-relatorio {
        position: absolute;
        left: 7mm;
        right: 7mm;
        bottom: 7mm;
        min-height: 22px;
        padding: 7px 9px;
        border-radius: 0 0 11px 11px;
        display: flex;
        justify-content: space-between;
        gap: 8px;
        color: #fff;
        background: linear-gradient(90deg, #032b63 0%, #064fae 100%);
        font-size: 7px;
        font-weight: 900;
    }

    .conteudo-pagina {
        padding-bottom: 35px;
    }
</style>
</head>
<body>
    <main class="pagina-relatorio">
        <div class="conteudo-pagina">
            ${cabecalhoRelatorio()}

            <section class="faixa-info">
                <div><span>Emissão</span><strong>${escaparHTML(dataEmissao)} às ${escaparHTML(horaEmissao)}</strong></div>
                <div><span>Base do relatório</span><strong>${escaparHTML(valorSeguroRelatorioDashboard(totalItens, "0"))} itens avaliados</strong></div>
                <div><span>Conformidade</span><strong>${escaparHTML(percentualConformidade)}% concluídos</strong></div>
                <div><span>Storage</span><strong>${escaparHTML(storagePercentual)}% — ${escaparHTML(totalStorageLabel)} / ${escaparHTML(storageLimiteLabelDashboard)}</strong></div>
            </section>

            <section class="cards-dashboard-relatorio">
                ${cardsHtml || `<article class="card-dashboard-relatorio"><p>Indicadores</p><strong>0</strong><span>Nenhum card disponível.</span></article>`}
            </section>

            <section class="grid-duplo">
                <div class="secao-relatorio">
                    <div class="secao-titulo"><h3>Conformidade dos treinamentos</h3><p>Distribuição geral dos status avaliados no Dashboard SST.</p></div>
                    <div class="secao-corpo">${resumoConformidadeHtml || `<p class="lista-alertas-vazia">Nenhum indicador de conformidade encontrado.</p>`}</div>
                </div>
                <div class="secao-relatorio">
                    <div class="secao-titulo"><h3>Resumo da auditoria de campo</h3><p>Leitura consolidada dos desvios registrados.</p></div>
                    <div class="secao-corpo">
                        <table class="tabela-relatorio-dashboard">
                            <tbody>
                                <tr><td class="texto-forte">Auditorias no mês</td><td>${escaparHTML(quantidadeSeguraRelatorioDashboard(auditoriasCampoMes))}</td></tr>
                                <tr><td class="texto-forte">Média de conformidade</td><td>${escaparHTML(mediaConformidadeCampo)}%</td></tr>
                                <tr><td class="texto-forte">Desvios abertos</td><td>${escaparHTML(desviosCampoAbertos)}</td></tr>
                                <tr><td class="texto-forte">Desvios corrigidos</td><td>${escaparHTML(desviosCampoCorrigidos)}</td></tr>
                                <tr><td class="texto-forte">Documentos de empresa críticos</td><td>${escaparHTML(totalDocumentosEmpresaCriticos)}</td></tr>
                                <tr><td class="texto-forte">Aniversariantes do mês</td><td>${escaparHTML((Array.isArray(aniversariantesMes) ? aniversariantesMes.length : 0))}</td></tr>
                                <tr><td class="texto-forte">Próximo aniversário</td><td>${escaparHTML(proximoAniversarioDashboard?.nome || proximoAniversarioDashboard?.colaborador?.nome || "Não informado")}</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            <section class="secao-relatorio">
                <div class="secao-titulo"><h3>Alertas importantes</h3><p>Pontos que exigem acompanhamento operacional.</p></div>
                <div class="secao-corpo">${alertasHtml ? `<ul class="lista-alertas">${alertasHtml}</ul>` : `<p class="lista-alertas-vazia">Nenhum alerta crítico encontrado no momento.</p>`}</div>
            </section>

        </div>
        ${rodapeRelatorio(1)}
    </main>

    <main class="pagina-relatorio">
        <div class="conteudo-pagina">
            ${cabecalhoRelatorio("Resumo operacional e documentos monitorados.")}

            <section class="secao-relatorio secao-tabela-ampla tabela-ranking-wrapper">
                <div class="secao-titulo"><h3>Ranking de pendências por empresa</h3><p>Empresas com maior necessidade de regularização.</p></div>
                <div class="secao-corpo">${rankingHtml}</div>
            </section>

            <section class="secao-relatorio secao-tabela-ampla tabela-funcoes-wrapper">
                <div class="secao-titulo"><h3>Colaboradores por função</h3><p>Distribuição operacional da mão de obra cadastrada.</p></div>
                <div class="secao-corpo">${funcoesHtml}</div>
            </section>

            <section class="secao-relatorio secao-tabela-ampla tabela-documentos-tipo-wrapper">
                <div class="secao-titulo"><h3>Documentos por tipo</h3><p>Leitura geral dos documentos corporativos monitorados.</p></div>
                <div class="secao-corpo">${documentosTipoHtml}</div>
            </section>
        </div>
        ${rodapeRelatorio(2)}
    </main>

    <main class="pagina-relatorio">
        <div class="conteudo-pagina">
            ${cabecalhoRelatorio("Últimos envios e pendências críticas para conferência.")}

            <section class="secao-relatorio secao-tabela-ampla tabela-ultimos-documentos-wrapper">
                <div class="secao-titulo"><h3>Últimos documentos enviados</h3><p>Resumo dos envios mais recentes.</p></div>
                <div class="secao-corpo">${ultimosDocumentosHtml}</div>
            </section>

            <section class="secao-relatorio secao-tabela-ampla tabela-pendencias-wrapper">
                <div class="secao-titulo"><h3>Pendências críticas</h3><p>Itens que impactam liberação, mobilização ou controle documental.</p></div>
                <div class="secao-corpo">${pendenciasHtml}</div>
            </section>
        </div>
        ${rodapeRelatorio(3)}
    </main>
</body>
</html>`;

    await baixarRelatorioHtmlComoPdf({ html, nomeArquivo });
}
