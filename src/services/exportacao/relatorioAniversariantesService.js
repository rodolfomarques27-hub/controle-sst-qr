// Relatório visual de aniversariantes.
import { baixarRelatorioHtmlComoPdf } from "./exportacaoBaseService";
import {
    classeStatusRelatorio,
    escaparHTML,
    prepararColaboradoresRelatorio,
} from "./relatorioColaboradoresUtils";

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
                <svg class="cabecalho-aniversariantes-svg" viewBox="0 0 1000 145" role="img" aria-label="Cabeçalho do relatório de aniversariantes">
                    <text x="500" y="42" text-anchor="middle" dominant-baseline="middle" class="cabecalho-svg-titulo">SAFESCAN BRASIL</text>

                    <line x1="0" y1="93" x2="288" y2="93" class="cabecalho-svg-linha" />
                    <rect x="288" y="78" width="424" height="30" rx="4" class="cabecalho-svg-fundo-subtitulo" />
                    <text x="500" y="93" text-anchor="middle" dominant-baseline="middle" class="cabecalho-svg-subtitulo">${escaparHTML(String(titulo || "Relatório de aniversariantes").toUpperCase())}</text>
                    <line x1="712" y1="93" x2="1000" y2="93" class="cabecalho-svg-linha" />

                    <text x="500" y="124" text-anchor="middle" dominant-baseline="middle" class="cabecalho-svg-data">Data de emissão: ${escaparHTML(dataEmissao)}</text>
                </svg>
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
                <span>🛡 SafeScan Brasil</span>
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

    .cabecalho-aniversariantes-svg {
        width: 100%;
        height: 118px;
        display: block;
        margin: 0 0 6px;
        overflow: visible;
    }

    .cabecalho-svg-titulo {
        fill: #07162f;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 46px;
        font-weight: 900;
        letter-spacing: 3px;
    }

    .cabecalho-svg-subtitulo {
        fill: var(--azul);
        font-family: Arial, Helvetica, sans-serif;
        font-size: 19px;
        font-weight: 900;
        letter-spacing: 1.25px;
    }

    .cabecalho-svg-fundo-subtitulo {
        fill: #ffffff;
    }

    .cabecalho-svg-linha {
        stroke: var(--azul);
        stroke-width: 2.4;
        stroke-linecap: round;
    }

    .cabecalho-svg-data {
        fill: #64748b;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.2px;
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
