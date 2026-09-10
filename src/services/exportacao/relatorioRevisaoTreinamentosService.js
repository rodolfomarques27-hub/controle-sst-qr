import heroPendenciasTreinamentosObrasUrl from "../../assets/heroes/relatorios/hero-pendencias-treinamentos-obras-v1.png";
import { obterHistoricoRevisaoTreinamentosService } from "../treinamentosRevisaoService";

export const RELATORIO_REVISAO_TREINAMENTOS_SCHEMA_VERSION =
    "relatorio-revisao-treinamentos-v1";

const PDF_LARGURA_MM = 210;
const PDF_ALTURA_MM = 297;
const ESCALA_RENDERIZACAO = 1.5;
const TIMEOUT_CARREGAMENTO_MS = 15000;
const TEMPO_ESTABILIZACAO_LAYOUT_MS = 80;
const ITENS_PRIMEIRA_PAGINA = 2;
const ITENS_CONTINUACAO = 4;
const EVIDENCIAS_POR_PAGINA = 4;

function textoSeguro(valor = "") {
    return String(valor ?? "").trim();
}

function numeroSeguro(valor = 0) {
    const numero = Number(valor);
    return Number.isFinite(numero) ? numero : 0;
}

function escaparHtml(valor = "") {
    return textoSeguro(valor)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatarData(valor = "") {
    const texto = textoSeguro(valor);
    if (!texto) return "-";

    const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(texto);
    if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;

    const data = new Date(texto);
    if (Number.isNaN(data.getTime())) return texto;

    return data.toLocaleDateString("pt-BR");
}

function formatarDataHora(valor = "") {
    const texto = textoSeguro(valor);
    if (!texto) return "-";

    const data = new Date(texto);
    if (Number.isNaN(data.getTime())) return texto;

    return data.toLocaleString("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
    });
}

function formatarPercentual(valor = 0) {
    const numero = numeroSeguro(valor);
    return `${numero.toLocaleString("pt-BR", {
        minimumFractionDigits: numero % 1 === 0 ? 0 : 1,
        maximumFractionDigits: 2,
    })}%`;
}

function rotuloResultado(resultado = "") {
    const chave = textoSeguro(resultado).toLowerCase();
    const rotulos = {
        conforme: "CONFORME",
        atencao: "ATENÇÃO",
        vencido: "VENCIDO",
        divergente: "DIVERGENTE",
        sem_evidencia_suficiente: "SEM EVIDÊNCIA SUFICIENTE",
        revisao_manual_necessaria: "REVISÃO MANUAL NECESSÁRIA",
    };
    return rotulos[chave] || textoSeguro(resultado).toUpperCase() || "NÃO CLASSIFICADO";
}

function classeResultado(resultado = "") {
    const chave = textoSeguro(resultado).toLowerCase();
    if (chave === "conforme") return "resultado resultado--conforme";
    if (chave === "atencao") return "resultado resultado--atencao";
    if (chave === "vencido") return "resultado resultado--vencido";
    if (chave === "divergente") return "resultado resultado--divergente";
    if (chave === "revisao_manual_necessaria") return "resultado resultado--manual";
    return "resultado resultado--neutro";
}

function rotuloStatusTemporal(valor = "") {
    const chave = textoSeguro(valor).toLowerCase();
    const rotulos = {
        em_dia: "Em dia",
        a_vencer: "A vencer",
        vencido: "Vencido",
        sem_validade: "Sem validade",
        sem_data_suficiente: "Sem dados suficientes",
        sem_data: "Sem dados suficientes",
        nao_aplicavel: "Não aplicável",
    };
    return rotulos[chave] || textoSeguro(valor) || "-";
}

function rotuloTecnicoHumano(valor = "") {
    const texto = textoSeguro(valor);
    if (!texto) return "-";

    const chave = texto.toLowerCase();
    const rotulos = {
        documento_principal_legado: "Documento principal legado",
        certificado_treinamento: "Certificado de treinamento",
        lista_presenca: "Lista de presença",
        evidencia_complementar: "Evidência complementar",
        revisao_manual_necessaria: "Revisão manual necessária",
        sem_evidencia_suficiente: "Sem evidência suficiente",
        conforme: "Conforme",
        atencao: "Atenção",
        vencido: "Vencido",
        divergente: "Divergente",
        nao_aplicavel: "Não aplicável",
    };

    return rotulos[chave] || texto;
}

function dividirEmLotes(lista = [], tamanho = 1) {
    const origem = Array.isArray(lista) ? lista : [];
    const limite = Math.max(1, Number(tamanho) || 1);
    const lotes = [];

    for (let indice = 0; indice < origem.length; indice += limite) {
        lotes.push(origem.slice(indice, indice + limite));
    }

    return lotes;
}

function validarDetalhe(detalhe = {}) {
    const revisao = detalhe?.revisao || {};
    const itens = Array.isArray(detalhe?.itens) ? detalhe.itens : [];

    const revisaoId = textoSeguro(revisao?.id);
    const colaboradorId = textoSeguro(revisao?.colaboradorId);
    const numeroRevisao = Number(revisao?.numeroRevisao) || 0;

    if (!revisaoId) {
        throw new Error("Revisão histórica sem identificador.");
    }
    if (!colaboradorId) {
        throw new Error("Revisão histórica sem colaborador.");
    }
    if (!numeroRevisao) {
        throw new Error("Revisão histórica sem número válido.");
    }
    if (textoSeguro(revisao?.status).toLowerCase() !== "concluida") {
        throw new Error("Somente revisões concluídas podem gerar relatório histórico.");
    }
    if (!itens.length) {
        throw new Error("Revisão histórica sem treinamentos persistidos.");
    }

    return {
        revisao,
        itens,
        revisaoId,
        colaboradorId,
        numeroRevisao,
    };
}

function montarIndicadores(revisao = {}) {
    return [
        ["Conformes", numeroSeguro(revisao.totalConformes), "verde"],
        ["Atenção", numeroSeguro(revisao.totalAtencao), "amarelo"],
        ["Vencidos", numeroSeguro(revisao.totalVencidos), "vermelho"],
        ["Divergentes", numeroSeguro(revisao.totalDivergentes), "roxo"],
        ["Sem evidência", numeroSeguro(revisao.totalSemEvidencia), "cinza"],
        ["Revisão manual", numeroSeguro(revisao.totalRevisaoManual), "laranja"],
    ];
}

function montarHero({ revisao, compacto = false } = {}) {
    const colaborador = revisao?.colaboradorSnapshot || {};
    const empresa = revisao?.empresaSnapshot || {};

    return `
        <header class="${compacto ? "hero hero--compacto" : "hero"}">
            <img class="hero__imagem" src="${escaparHtml(heroPendenciasTreinamentosObrasUrl)}" alt="" />
            <div class="hero__sombra"></div>
            <div class="hero__conteudo">
                <div>
                    <p class="hero__marca">SAFESCAN BRASIL</p>
                    <h1>${compacto ? "Revisão de treinamentos — continuação" : "Relatório de revisão de treinamentos"}</h1>
                    <p class="hero__subtitulo">Snapshot histórico imutável • Revisão #${numeroSeguro(revisao?.numeroRevisao)}</p>
                </div>
                <div class="hero__identidade">
                    <strong>${escaparHtml(colaborador?.nome || "Colaborador não informado")}</strong>
                    <span>${escaparHtml(empresa?.nome || empresa?.razaoSocial || "Empresa não informada")}</span>
                </div>
            </div>
        </header>
    `;
}

function montarRodape({ revisao, pagina, totalPaginas } = {}) {
    return `
        <footer class="rodape">
            <div>
                <strong>SafeScan Brasil</strong>
                <span>Documento gerado exclusivamente do snapshot histórico persistido.</span>
            </div>
            <div class="rodape__direita">
                <span>Revisão #${numeroSeguro(revisao?.numeroRevisao)} • ${escaparHtml(revisao?.id)}</span>
                <strong>Página ${pagina} de ${totalPaginas}</strong>
            </div>
        </footer>
    `;
}

function montarResumoExecutivo(revisao = {}) {
    const indicadores = montarIndicadores(revisao)
        .map(
            ([rotulo, valor, cor]) => `
                <div class="indicador indicador--${cor}">
                    <strong>${valor}</strong>
                    <span>${escaparHtml(rotulo)}</span>
                </div>
            `
        )
        .join("");

    return `
        <section class="resumo">
            <div class="resumo__principal">
                <p>CONFORMIDADE DA REVISÃO</p>
                <strong>${formatarPercentual(revisao?.percentualConformidade)}</strong>
                <span>${numeroSeguro(revisao?.totalConformes)} de ${numeroSeguro(revisao?.totalTreinamentos)} treinamentos conformes</span>
            </div>
            <div class="resumo__indicadores">${indicadores}</div>
        </section>
    `;
}

function montarMetadados(revisao = {}) {
    const colaborador = revisao?.colaboradorSnapshot || {};
    const empresa = revisao?.empresaSnapshot || {};

    const codigo =
        colaborador?.codigo ||
        colaborador?.codigoColaborador ||
        colaborador?.matricula ||
        colaborador?.matricula_esocial ||
        colaborador?.matriculaEsocial ||
        "Não registrado no snapshot";

    return `
        <section class="metadados">
            <div>
                <span>COLABORADOR</span>
                <strong>${escaparHtml(colaborador?.nome || "-")}</strong>
            </div>
            <div>
                <span>FUNÇÃO</span>
                <strong>${escaparHtml(colaborador?.funcao || colaborador?.cargo || "-")}</strong>
            </div>
            <div>
                <span>CÓDIGO / MATRÍCULA</span>
                <strong>${escaparHtml(codigo)}</strong>
            </div>
            <div>
                <span>EMPRESA</span>
                <strong>${escaparHtml(empresa?.nome || empresa?.razaoSocial || "-")}</strong>
            </div>
            <div>
                <span>REFERÊNCIA</span>
                <strong>${formatarData(revisao?.dataReferencia)}</strong>
            </div>
            <div>
                <span>CONCLUÍDA EM</span>
                <strong>${formatarDataHora(revisao?.createdAt)}</strong>
            </div>
            <div class="metadados__largo">
                <span>RESPONSÁVEL</span>
                <strong>${escaparHtml(revisao?.executadoPorEmail || "Não informado")}</strong>
            </div>
        </section>
    `;
}

function montarTreinamento(item = {}) {
    const evidencias = Array.isArray(item?.evidencias) ? item.evidencias : [];
    const divergencias = Array.isArray(item?.divergencias)
        ? item.divergencias.filter(Boolean)
        : [];

    const resumoEvidencias = evidencias.length
        ? evidencias
              .slice(0, 2)
              .map((evidencia) => textoSeguro(evidencia?.arquivoNome) || textoSeguro(evidencia?.tipoEvidencia) || "Evidência")
              .join(" • ")
        : "Nenhuma evidência persistida";

    const divergenciaTexto = divergencias.length
        ? divergencias.slice(0, 3).map(textoSeguro).filter(Boolean).join(" • ")
        : "Nenhuma divergência registrada";

    return `
        <article class="treinamento">
            <div class="treinamento__cabecalho">
                <div>
                    <span>TREINAMENTO ${numeroSeguro(item?.ordem)}</span>
                    <h2>${escaparHtml(item?.nomeTreinamento || "Treinamento não identificado")}</h2>
                </div>
                <span class="${classeResultado(item?.resultadoGeral)}">${escaparHtml(rotuloResultado(item?.resultadoGeral))}</span>
            </div>

            <div class="treinamento__datas">
                <div><span>REALIZAÇÃO SALVA</span><strong>${formatarData(item?.dataRealizacaoSalva)}</strong></div>
                <div><span>REALIZAÇÃO REVISADA</span><strong>${formatarData(item?.dataRealizacaoRevisada)}</strong></div>
                <div><span>VENCIMENTO SALVO</span><strong>${formatarData(item?.dataVencimentoSalva)}</strong></div>
                <div><span>VENCIMENTO REVISADO</span><strong>${formatarData(item?.dataVencimentoRevisada)}</strong></div>
            </div>

            <div class="treinamento__status">
                <div>
                    <span>STATUS ANTERIOR</span>
                    <strong>${escaparHtml(rotuloStatusTemporal(item?.statusTemporalAnterior))}</strong>
                </div>
                <div>
                    <span>STATUS REPROCESSADO</span>
                    <strong>${escaparHtml(rotuloStatusTemporal(item?.statusTemporalRevisado))}</strong>
                </div>
                <div>
                    <span>EVIDÊNCIAS</span>
                    <strong>${evidencias.length}</strong>
                </div>
                <div>
                    <span>INTEGRIDADE</span>
                    <strong>${escaparHtml(rotuloTecnicoHumano(item?.statusIntegridade))}</strong>
                </div>
            </div>

            <p class="treinamento__linha"><strong>Evidências:</strong> ${escaparHtml(resumoEvidencias)}</p>
            <p class="treinamento__linha"><strong>Divergências:</strong> ${escaparHtml(divergenciaTexto)}</p>
            ${
                textoSeguro(item?.decisaoHumana)
                    ? `<p class="treinamento__decisao"><strong>Decisão humana:</strong> ${escaparHtml(item.decisaoHumana)}${textoSeguro(item?.observacaoManual) ? ` • ${escaparHtml(item.observacaoManual)}` : ""}</p>`
                    : ""
            }
        </article>
    `;
}

function montarEvidencia(evidencia = {}, item = {}) {
    return `
        <article class="evidencia">
            <div class="evidencia__cabecalho">
                <div>
                    <span>${escaparHtml(item?.nomeTreinamento || "Treinamento")}</span>
                    <strong>${escaparHtml(evidencia?.arquivoNome || "Evidência sem nome")}</strong>
                </div>
                <span class="evidencia__tipo">${escaparHtml(rotuloTecnicoHumano(evidencia?.tipoEvidencia || "evidência"))}</span>
            </div>
            <div class="evidencia__grade">
                <div><span>DOCUMENTO ESPERADO</span><strong>${escaparHtml(rotuloTecnicoHumano(evidencia?.tipoDocumentoEsperado))}</strong></div>
                <div><span>DOCUMENTO IDENTIFICADO</span><strong>${escaparHtml(rotuloTecnicoHumano(evidencia?.tipoDocumentoIdentificado))}</strong></div>
                <div><span>TREINAMENTO ESPERADO</span><strong>${escaparHtml(evidencia?.treinamentoEsperado || "-")}</strong></div>
                <div><span>TREINAMENTO IDENTIFICADO</span><strong>${escaparHtml(evidencia?.treinamentoIdentificado || "-")}</strong></div>
            </div>
            <p><strong>Integridade:</strong> ${escaparHtml(rotuloTecnicoHumano(evidencia?.statusIntegridade))}</p>
            <p><strong>SHA-256 da evidência:</strong> ${escaparHtml(evidencia?.arquivoSha256 || "não informado")}</p>
        </article>
    `;
}

function cssRelatorio() {
    return `
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; background: #e2e8f0; font-family: Arial, Helvetica, sans-serif; color: #0f172a; }
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .relatorio-root { display: flex; flex-direction: column; align-items: center; gap: 6mm; padding: 0; }
        .pagina-relatorio {
            width: 210mm;
            height: 297mm;
            min-height: 297mm;
            max-height: 297mm;
            overflow: hidden;
            background: #f8fafc;
            position: relative;
            display: flex;
            flex-direction: column;
        }
        .hero {
            height: 36mm;
            position: relative;
            overflow: hidden;
            background: #08111f;
            color: #fff;
            flex: 0 0 auto;
        }
        .hero--compacto { height: 26mm; }
        .hero__imagem {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
            opacity: .54;
        }
        .hero__sombra {
            position: absolute;
            inset: 0;
            background: linear-gradient(90deg, rgba(2,6,23,.96), rgba(2,6,23,.72) 58%, rgba(2,6,23,.36));
        }
        .hero__conteudo {
            position: relative;
            z-index: 1;
            height: 100%;
            padding: 6mm 9mm;
            display: flex;
            justify-content: space-between;
            align-items: end;
            gap: 8mm;
        }
        .hero--compacto .hero__conteudo { padding-top: 4mm; padding-bottom: 4mm; }
        .hero__marca { margin: 0 0 2mm; color: #7cf0bd; font-size: 8pt; font-weight: 800; letter-spacing: .12em; }
        .hero h1 { margin: 0; font-size: 19pt; line-height: 1.05; letter-spacing: -.02em; }
        .hero--compacto h1 { font-size: 15pt; }
        .hero__subtitulo { margin: 2mm 0 0; font-size: 8.5pt; color: #dbeafe; font-weight: 600; }
        .hero__identidade { min-width: 56mm; max-width: 72mm; text-align: right; display: flex; flex-direction: column; gap: 1mm; }
        .hero__identidade strong { font-size: 9pt; line-height: 1.15; }
        .hero__identidade span { font-size: 7.5pt; color: #cbd5e1; }

        .conteudo { flex: 1 1 auto; min-height: 0; padding: 5mm 7mm 16mm; overflow: hidden; }
        .secao-titulo { margin: 0 0 3mm; font-size: 10pt; font-weight: 900; text-transform: uppercase; letter-spacing: .06em; color: #475569; }

        .metadados {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 2mm;
            margin-bottom: 4mm;
        }
        .metadados > div {
            background: #fff;
            border: .25mm solid #dbe4ee;
            border-radius: 2.2mm;
            padding: 2.2mm 2.5mm;
            min-height: 13mm;
        }
        .metadados__largo { grid-column: span 3; }
        .metadados span, .treinamento__datas span, .treinamento__status span, .evidencia__grade span {
            display: block;
            font-size: 6.4pt;
            font-weight: 800;
            letter-spacing: .045em;
            color: #94a3b8;
        }
        .metadados strong { display: block; margin-top: 1mm; font-size: 8.3pt; line-height: 1.2; }

        .resumo {
            display: grid;
            grid-template-columns: 58mm minmax(0, 1fr);
            gap: 3mm;
            margin-bottom: 4mm;
        }
        .resumo__principal {
            display: grid;
            grid-template-rows: auto auto auto;
            align-content: center;
            justify-items: center;
            row-gap: 1.15mm;
            text-align: center;
            min-height: 33mm;
            border-radius: 3mm;
            padding: 3.8mm 4.4mm;
            background: #020617;
            color: #fff;
            box-sizing: border-box;
        }
        .resumo__principal p { margin: 0; width: 100%; font-size: 7pt; line-height: 1.08; font-weight: 900; letter-spacing: .055em; text-align: center; }
        .resumo__principal > strong { display: block; width: 100%; margin: 0; font-size: 26pt; line-height: .92; text-align: center; }
        .resumo__principal span { display: block; width: 100%; margin: 0; font-size: 7.4pt; line-height: 1.14; color: #cbd5e1; font-weight: 700; text-align: center; }
        .resumo__indicadores { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2mm; }
        .indicador {
            display: flex;
            flex-direction: row;
            align-items: center;
            justify-content: center;
            gap: .55mm;
            min-height: 13.8mm;
            text-align: center;
            border-radius: 2.4mm;
            padding: 1.6mm 2.5mm;
            background: #fff;
            border: .25mm solid #dbe4ee;
            white-space: nowrap;
            box-sizing: border-box;
        }
        .indicador strong { display: block; flex: 0 0 auto; margin: 0; font-size: 10.1pt; line-height: 1; font-weight: 900; color: inherit; }
        .indicador span { display: block; margin: 0; font-size: 7.6pt; line-height: 1; font-weight: 900; letter-spacing: .008em; text-transform: uppercase; color: inherit; white-space: nowrap; }
        .indicador--verde { color: #047857; }
        .indicador--amarelo { color: #b45309; }
        .indicador--vermelho { color: #b91c1c; }
        .indicador--roxo { color: #a21caf; }
        .indicador--cinza { color: #334155; }
        .indicador--laranja { color: #c2410c; }

        .treinamentos { display: flex; flex-direction: column; gap: 3mm; }
        .treinamento {
            background: #fff;
            border: .25mm solid #dbe4ee;
            border-radius: 3mm;
            padding: 3mm 3.5mm;
            break-inside: avoid;
        }
        .treinamento__cabecalho { display: flex; justify-content: space-between; align-items: start; gap: 4mm; }
        .treinamento__cabecalho > div { min-width: 0; }
        .treinamento__cabecalho > div > span { font-size: 6.4pt; font-weight: 900; color: #94a3b8; letter-spacing: .07em; }
        .treinamento h2 { margin: 1mm 0 0; font-size: 10.5pt; line-height: 1.15; }
        .resultado {
            display: inline;
            text-align: center;
            line-height: 1.1;
            min-height: 0;
            box-sizing: content-box;
            flex: 0 0 auto;
            border-radius: 0;
            padding: 0;
            margin: 0;
            font-size: 6.5pt;
            font-weight: 900;
            border: 0;
            background: transparent;
            white-space: nowrap;
        }
        .resultado--conforme { color: #047857; }
        .resultado--atencao { color: #92400e; }
        .resultado--vencido { color: #b91c1c; }
        .resultado--divergente { color: #a21caf; }
        .resultado--manual { color: #c2410c; }
        .resultado--neutro { color: #475569; }

        .treinamento__datas, .treinamento__status {
            display: grid;
            grid-template-columns: repeat(4, minmax(0,1fr));
            gap: 2mm;
            margin-top: 2.5mm;
        }
        .treinamento__datas > div, .treinamento__status > div {
            border-radius: 2mm;
            background: #f8fafc;
            padding: 1.7mm 2mm;
            min-height: 10mm;
        }
        .treinamento__datas strong, .treinamento__status strong {
            display: block;
            margin-top: .8mm;
            font-size: 7.2pt;
            line-height: 1.15;
            word-break: break-word;
        }
        .treinamento__linha, .treinamento__decisao {
            margin: 1.8mm 0 0;
            font-size: 6.8pt;
            line-height: 1.25;
            color: #475569;
        }
        .treinamento__decisao {
            border-radius: 2mm;
            background: #eff6ff;
            color: #1d4ed8;
            padding: 1.5mm 2mm;
        }

        .evidencias { display: flex; flex-direction: column; gap: 2.6mm; }
        .evidencia {
            background: #fff;
            border: .25mm solid #dbe4ee;
            border-radius: 3mm;
            padding: 3mm 3.5mm;
            break-inside: avoid;
            page-break-inside: avoid;
        }
        .evidencia__cabecalho { display: flex; justify-content: space-between; gap: 4mm; align-items: start; }
        .evidencia__cabecalho > div { min-width: 0; }
        .evidencia__cabecalho span { display: block; font-size: 6.4pt; font-weight: 900; color: #64748b; }
        .evidencia__cabecalho strong { display: block; margin-top: 1mm; font-size: 8.8pt; line-height: 1.2; word-break: break-word; }
        .evidencia__tipo { flex: 0 0 auto; border-radius: 99px; background: #f1f5f9; padding: 1.2mm 2mm; color: #475569 !important; }
        .evidencia__grade { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 2mm; margin-top: 2.5mm; }
        .evidencia__grade > div { background: #f8fafc; border-radius: 2mm; padding: 1.5mm 2mm; min-height: 10mm; }
        .evidencia__grade strong { display: block; margin-top: .8mm; font-size: 7pt; line-height: 1.15; word-break: break-word; }
        .evidencia p { margin: 1.5mm 0 0; font-size: 6.6pt; line-height: 1.2; color: #475569; word-break: break-all; }

        .auditoria {
            margin-top: 4mm;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 2mm;
        }
        .auditoria > div {
            background: #eef2ff;
            color: #3730a3;
            border-radius: 2mm;
            padding: 2.2mm 2.5mm;
            font-size: 7pt;
            line-height: 1.25;
        }

        .rodape {
            position: absolute;
            left: 7mm;
            right: 7mm;
            bottom: 4.5mm;
            border-top: .25mm solid #dbe4ee;
            padding-top: 2.2mm;
            display: flex;
            justify-content: space-between;
            gap: 6mm;
            color: #64748b;
            font-size: 6.2pt;
            line-height: 1.25;
        }
        .rodape > div { display: flex; flex-direction: column; gap: .7mm; }
        .rodape strong { color: #334155; }
        .rodape__direita { text-align: right; align-items: flex-end; }

        @media print {
            html, body { background: #fff; }
            .relatorio-root { gap: 0; }
            .pagina-relatorio { break-after: page; }
        }
    `;
}

function montarPagina({
    revisao,
    conteudo,
    pagina,
    totalPaginas,
    primeira = false,
} = {}) {
    return `
        <section class="pagina-relatorio" data-pagina-relatorio="${pagina}">
            ${montarHero({ revisao, compacto: !primeira })}
            <main class="conteudo">${conteudo}</main>
            ${montarRodape({ revisao, pagina, totalPaginas })}
        </section>
    `;
}

export function prepararRelatorioRevisaoTreinamentos({
    detalhe,
} = {}) {
    const {
        revisao,
        itens,
        revisaoId,
        colaboradorId,
        numeroRevisao,
    } = validarDetalhe(detalhe);

    const primeiraFaixa = itens.slice(0, ITENS_PRIMEIRA_PAGINA);
    const restantes = itens.slice(ITENS_PRIMEIRA_PAGINA);
    const lotesTreinamentos = dividirEmLotes(restantes, ITENS_CONTINUACAO);

    const evidenciasComItem = itens.flatMap((item) =>
        (Array.isArray(item?.evidencias) ? item.evidencias : []).map((evidencia) => ({
            evidencia,
            item,
        }))
    );
    const lotesEvidencias = dividirEmLotes(evidenciasComItem, EVIDENCIAS_POR_PAGINA);

    const totalPaginas =
        1 +
        lotesTreinamentos.length +
        Math.max(1, lotesEvidencias.length);

    let paginaAtual = 1;
    const paginas = [];

    paginas.push(
        montarPagina({
            revisao,
            pagina: paginaAtual,
            totalPaginas,
            primeira: true,
            conteudo: `
                ${montarMetadados(revisao)}
                ${montarResumoExecutivo(revisao)}
                <h2 class="secao-titulo">Treinamentos avaliados</h2>
                <div class="treinamentos">
                    ${primeiraFaixa.map(montarTreinamento).join("")}
                </div>
            `,
        })
    );
    paginaAtual += 1;

    for (const lote of lotesTreinamentos) {
        paginas.push(
            montarPagina({
                revisao,
                pagina: paginaAtual,
                totalPaginas,
                conteudo: `
                    <h2 class="secao-titulo">Treinamentos avaliados — continuação</h2>
                    <div class="treinamentos">
                        ${lote.map(montarTreinamento).join("")}
                    </div>
                `,
            })
        );
        paginaAtual += 1;
    }

    const lotesEvidenciasSeguros = lotesEvidencias.length ? lotesEvidencias : [[]];

    for (const lote of lotesEvidenciasSeguros) {
        paginas.push(
            montarPagina({
                revisao,
                pagina: paginaAtual,
                totalPaginas,
                conteudo: `
                    <h2 class="secao-titulo">Evidências consideradas no snapshot</h2>
                    ${
                        lote.length
                            ? `<div class="evidencias">${lote
                                  .map(({ evidencia, item }) => montarEvidencia(evidencia, item))
                                  .join("")}</div>`
                            : `<div class="evidencia"><p>Nenhuma evidência física foi persistida nesta revisão.</p></div>`
                    }
                    ${
                        paginaAtual === totalPaginas
                            ? `
                                <section class="auditoria">
                                    <div><strong>ID da revisão</strong><br>${escaparHtml(revisaoId)}</div>
                                    <div><strong>Motor / schema</strong><br>${escaparHtml(revisao?.motorVersao || "-")} • v${numeroSeguro(revisao?.schemaVersao)}</div>
                                    <div><strong>Total de treinamentos</strong><br>${numeroSeguro(revisao?.totalTreinamentos)}</div>
                                    <div><strong>Total de evidências persistidas</strong><br>${numeroSeguro(detalhe?.totalEvidencias)}</div>
                                </section>
                            `
                            : ""
                    }
                `,
            })
        );
        paginaAtual += 1;
    }

    const nomeArquivo = `revisao-${numeroRevisao}.pdf`;
    const caminhoEsperado = `${colaboradorId}/${revisaoId}/${nomeArquivo}`;

    const html = `<!doctype html>
        <html lang="pt-BR">
            <head>
                <meta charset="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <style>${cssRelatorio()}</style>
            </head>
            <body>
                <main class="relatorio-root" data-revisao-treinamentos-relatorio data-total-paginas="${totalPaginas}">
                    ${paginas.join("")}
                </main>
            </body>
        </html>`;

    return {
        schemaVersion: RELATORIO_REVISAO_TREINAMENTOS_SCHEMA_VERSION,
        revisaoId,
        colaboradorId,
        numeroRevisao,
        nomeArquivo,
        caminhoEsperado,
        bucket: "revisoes-treinamentos",
        totalPaginas,
        html,
        readOnlySource: true,
    };
}

function aguardarComTimeout({
    promise,
    timeoutMs,
    mensagem,
}) {
    let timeoutId = null;

    return Promise.race([
        promise,
        new Promise((_resolve, reject) => {
            timeoutId = setTimeout(() => reject(new Error(mensagem)), timeoutMs);
        }),
    ]).finally(() => {
        if (timeoutId !== null) clearTimeout(timeoutId);
    });
}

function criarFrameRenderizacao() {
    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.setAttribute("tabindex", "-1");
    iframe.style.position = "fixed";
    iframe.style.left = "-20000px";
    iframe.style.top = "0";
    iframe.style.width = "900px";
    iframe.style.height = "1300px";
    iframe.style.border = "0";
    iframe.style.opacity = "0";
    iframe.style.pointerEvents = "none";
    iframe.style.zIndex = "-2147483647";
    return iframe;
}

async function carregarHtmlNoFrame({
    iframe,
    html,
}) {
    const carregamento = new Promise((resolve, reject) => {
        iframe.onload = () => resolve();
        iframe.onerror = () =>
            reject(new Error("Falha ao carregar o documento temporário do relatório."));
    });

    iframe.srcdoc = html;
    document.body.appendChild(iframe);

    await aguardarComTimeout({
        promise: carregamento,
        timeoutMs: TIMEOUT_CARREGAMENTO_MS,
        mensagem: "Tempo excedido ao carregar o documento temporário do relatório.",
    });

    const documento = iframe.contentDocument;
    if (!documento?.body) {
        throw new Error("Documento temporário do relatório não ficou acessível.");
    }

    return documento;
}

async function aguardarRecursosDocumento(documento) {
    const imagens = Array.from(documento.images || []);

    await Promise.all(
        imagens.map((imagem) => {
            if (imagem.complete && imagem.naturalWidth > 0) {
                return Promise.resolve();
            }

            return aguardarComTimeout({
                promise: new Promise((resolve, reject) => {
                    imagem.addEventListener("load", resolve, { once: true });
                    imagem.addEventListener(
                        "error",
                        () => reject(new Error("Uma imagem do relatório não pôde ser carregada.")),
                        { once: true }
                    );
                }),
                timeoutMs: TIMEOUT_CARREGAMENTO_MS,
                mensagem: "Tempo excedido ao carregar uma imagem do relatório.",
            });
        })
    );

    if (documento.fonts?.ready) {
        await aguardarComTimeout({
            promise: documento.fonts.ready,
            timeoutMs: TIMEOUT_CARREGAMENTO_MS,
            mensagem: "Tempo excedido ao aguardar as fontes do relatório.",
        });
    }

    await new Promise((resolve) => setTimeout(resolve, TEMPO_ESTABILIZACAO_LAYOUT_MS));
}

function validarPaginasSemOverflow(paginas = []) {
    paginas.forEach((pagina, indice) => {
        const excessoHorizontal = Math.max(0, pagina.scrollWidth - pagina.clientWidth);
        const excessoVertical = Math.max(0, pagina.scrollHeight - pagina.clientHeight);
        const conteudo = pagina.querySelector(".conteudo");
        const excessoConteudoVertical = conteudo
            ? Math.max(0, conteudo.scrollHeight - conteudo.clientHeight)
            : 0;

        if (
            excessoHorizontal > 2 ||
            excessoVertical > 2 ||
            excessoConteudoVertical > 2
        ) {
            throw new Error(
                `Página ${indice + 1} do relatório excedeu o A4: ` +
                    `horizontal=${excessoHorizontal}px; vertical=${excessoVertical}px; ` +
                    `conteudoVertical=${excessoConteudoVertical}px.`
            );
        }
    });
}

async function carregarDependenciasPdf() {
    const [html2canvasModulo, jsPdfModulo] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
    ]);

    const html2canvas = html2canvasModulo?.default;
    const jsPDF = jsPdfModulo?.default || jsPdfModulo?.jsPDF;

    if (typeof html2canvas !== "function") {
        throw new Error("html2canvas não ficou disponível para gerar o PDF.");
    }
    if (typeof jsPDF !== "function") {
        throw new Error("jsPDF não ficou disponível para gerar o PDF.");
    }

    return {
        html2canvas,
        jsPDF,
    };
}

function configurarMetadadosPdf(pdf, revisao = {}) {
    pdf.setProperties?.({
        title: `SafeScan Brasil - Revisão de Treinamentos #${numeroSeguro(revisao?.numeroRevisao)}`,
        subject: "Snapshot histórico de revisão de treinamentos",
        author: "SafeScan Brasil",
        creator: "SafeScan Brasil",
        keywords: "SafeScan,SST,treinamentos,revisão,auditoria",
    });

    const dataCriacao = new Date(revisao?.createdAt || "");
    if (!Number.isNaN(dataCriacao.getTime())) {
        pdf.setCreationDate?.(dataCriacao);
    }

    const fileId = textoSeguro(revisao?.id).replace(/-/g, "").slice(0, 32).toUpperCase();
    if (/^[0-9A-F]{32}$/.test(fileId)) {
        pdf.setFileId?.(fileId);
    }
}

export async function criarPdfRevisaoTreinamentosBlobService({
    detalhe,
} = {}) {
    const preparado = prepararRelatorioRevisaoTreinamentos({
        detalhe,
    });

    if (
        typeof document === "undefined" ||
        !document.body
    ) {
        throw new Error("A geração física do PDF requer execução no navegador.");
    }

    const iframe = criarFrameRenderizacao();

    try {
        const documento = await carregarHtmlNoFrame({
            iframe,
            html: preparado.html,
        });

        await aguardarRecursosDocumento(documento);

        const paginas = Array.from(
            documento.querySelectorAll("[data-pagina-relatorio]")
        );

        if (paginas.length !== preparado.totalPaginas) {
            throw new Error(
                `Quantidade física de páginas divergente: preparada=${preparado.totalPaginas}; DOM=${paginas.length}.`
            );
        }

        validarPaginasSemOverflow(paginas);

        const {
            html2canvas,
            jsPDF,
        } = await carregarDependenciasPdf();

        const pdf = new jsPDF("p", "mm", "a4");
        configurarMetadadosPdf(pdf, detalhe?.revisao);

        for (let indice = 0; indice < paginas.length; indice += 1) {
            const pagina = paginas[indice];
            const canvas = await html2canvas(pagina, {
                scale: ESCALA_RENDERIZACAO,
                useCORS: true,
                allowTaint: false,
                backgroundColor: "#f8fafc",
                logging: false,
                width: pagina.scrollWidth,
                height: pagina.scrollHeight,
                windowWidth: pagina.scrollWidth,
                windowHeight: pagina.scrollHeight,
                scrollX: 0,
                scrollY: 0,
            });

            const imagem = canvas.toDataURL("image/jpeg", 0.92);

            if (indice > 0) {
                pdf.addPage("a4", "p");
            }

            pdf.addImage(
                imagem,
                "JPEG",
                0,
                0,
                PDF_LARGURA_MM,
                PDF_ALTURA_MM,
                undefined,
                "FAST"
            );
        }

        const blob = pdf.output("blob");

        if (!(blob instanceof Blob) || blob.size <= 0) {
            throw new Error("O navegador não produziu um PDF válido.");
        }

        return {
            ...preparado,
            blob,
            tamanhoBytes: blob.size,
        };
    } finally {
        iframe.remove();
    }
}

export async function prepararPdfRevisaoTreinamentosPorIdService({
    supabase,
    revisaoId,
    colaboradorId,
} = {}) {
    const detalhe = await obterHistoricoRevisaoTreinamentosService({
        supabase,
        revisaoId,
        colaboradorId,
    });

    const resultado = await criarPdfRevisaoTreinamentosBlobService({
        detalhe,
    });

    return {
        ...resultado,
        detalhe,
        persistido: false,
        previewLocal: true,
    };
}
