import { useEffect, useMemo, useRef, useState } from "react";
import { carregarRegistroDdsPorCodigo, listarRegistrosDds, salvarRegistroDds } from "../../services/ddsRegistrosService";
import { executarLeituraDdsLocal } from "../../services/documentosOcrService";
import {
    registrarDocumentoDdsAssinado,
    sincronizarConferenciaEstruturadaDds,
} from "../../services/ddsDocumentosService";
import { BookOpen, Printer, Building2, CalendarClock, QrCode, ListChecks, MessageSquareText, ClipboardList, ShieldCheck, Users } from "lucide-react";
import dashboardHeroSstDds from "../../assets/dashboard-hero-sst.webp";
import criarComponentesApresentacaoDds from "./DdsPagePresentation";
import criarSuporteDds from "./DdsPageSupport";
import criarControladorMaoDeObraDds from "./DdsPageMaoDeObraController";
import criarControladorConferenciaAssistidaDds from "./DdsPageConferenciaAssistidaController";
import criarControladorReciboDds from "./DdsPageReciboController";
import criarControladorScannerDds from "./DdsPageScannerController";
import useDdsScannerConferenciaDerivados from "./useDdsScannerConferenciaDerivados";
import useDdsScannerResultadoFinal from "./useDdsScannerResultadoFinal";
import useDdsReciboHistoricoDerivados from "./useDdsReciboHistoricoDerivados";
import useDdsResultadoApresentacaoDerivados from "./useDdsResultadoApresentacaoDerivados";
import criarControladorCalendarioMaoDeObraDds from "./DdsPageCalendarioMaoDeObraController";
import criarControladorTemasDds from "./DdsPageTemasController";
import criarControladorImpressaoDds from "./DdsPageImpressaoController";
import criarControladorDadosDds from "./DdsPageDadosController";
import {
    escaparHtmlControleMaoDeObraDds,
    formatarDataControleMaoDeObraDds,
    formatarNumeroMaoDeObraDds,
    normalizarFuncaoMaoDeObraDds,
    normalizarNomeEmpresaMaoDeObraDds,
    parseDataControleMaoDeObraDds,
    registroAtualPertenceAoMesHistoricoDds,
} from "./DdsPageMaoDeObraSupport";
import DdsConferenciaAssistidaSection from "./DdsConferenciaAssistidaSection";
import DdsLeituraArquivoScannerSection from "./DdsLeituraArquivoScannerSection";
import DdsReciboFinalSection from "./DdsReciboFinalSection";
import { montarSugestoesFrequenciaDds } from "../../utils/ddsSugestaoFrequenciaUtils";
import { extrairSugestoesTemaResponsavelDds } from "../../utils/ddsExtracaoTextoUtils";

const {
    diasDds,
    criarTemasEditaveisDds,
    participantesDds,
    participantesDdsContinuacao,
    LIMITE_PARTICIPANTES_PRIMEIRA_FOLHA_DDS,
    LIMITE_PARTICIPANTES_FOLHA_CONTINUACAO_DDS,
    QUANTIDADE_LINHAS_COMPLEMENTARES_DDS,
    aniversariantesDds,
    carregarObrasSetorDdsPorEmpresa,
    salvarObrasSetorDdsPorEmpresa,
    carregarFiscalIdealizaDdsPorEmpresa,
    salvarFiscalIdealizaDdsPorEmpresa,
    carregarEmpresaSelecionadaDds,
    salvarEmpresaSelecionadaDds,
    obterIdEmpresaObjetoDds,
    obterObraBaseDds,
    obterEmpresaIdObraDds,
    obterIdObraEmpresaDds,
    obterNomeObraEmpresaDds,
    obterFiscalObraEmpresaDds,
    obterLiderObraEmpresaDds,
    obterChaveEmpresaDds,
    filtrarColaboradoresPorEmpresaDds,
    adicionarDiasDds,
    obterInicioSemanaDds,
    obterFimSemanaDds,
    gerarDiasSemanaDds,
    normalizarTextoCodigoDds,
    obterNomeEmpresaObjetoDds,
    montarDadosDdsAutomaticos,
    dadosDdsPadrao,
    camposDadosDds,
    obterValorTextoDds,
    formatarResponsavelCabecalhoDds,
    normalizarParticipantesDdsSistema,
    montarFolhasDdsComLinhasComplementares,
    criarParticipantesAdicionaisConferenciaDds,
    CARDS_DDS_PADRAO,
    carregarCardsDdsLocal,
    salvarCardsDdsLocal,
    criarChaveTemasDdsLocal,
    normalizarTemasDdsEditaveis,
    carregarTemasDdsLocal,
    salvarTemasDdsLocal,
    criarOrientacoesPadraoDds,
    normalizarOrientacoesDdsLocal,
    carregarOrientacoesDdsLocal,
    salvarOrientacoesDdsLocal,
    carregarRecadosDdsLocal,
    salvarRecadosDdsLocal,
    resolverLogoEmpresaDds,
    obterLogoEmpresaSelecionadaDds,
    obterLogoRawEmpresaDds,
    obterEmpresaContratanteDds,
    obterLogosEmpresasCabecalhoDds,
    normalizarTextoTemaDds,
    temaDdsSemAtividade,
    montarAniversariantesSemanaDds,
    obterUuidSeguroDds,
} = criarSuporteDds();

const {
    DdsResumoCard,
    BotaoAlternarCardDds,
    DdsQrConferenciaImpresso,
    DdsPreviewImpresso,
    DdsPreviewImpressoContinuacao,
    DdsPrintStyles,
} = criarComponentesApresentacaoDds({
    diasDds,
    participantesDds,
    participantesDdsContinuacao,
    aniversariantesDds,
    dadosDdsPadrao,
    formatarResponsavelCabecalhoDds,
    criarOrientacoesPadraoDds,
    resolverLogoEmpresaDds,
    temaDdsSemAtividade,
});

function escaparHtmlRelatorioAnaliticoDds(valor) {
    return String(valor ?? "").replace(
        /[&<>"']/g,
        (caractere) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;",
        })[caractere]
    );
}

function formatarDataRelatorioAnaliticoDds(valor) {
    const texto = String(valor || "").trim();

    if (!texto) {
        return "-";
    }

    if (/^\d{2}\/\d{2}\/\d{4}$/.test(texto)) {
        return texto;
    }

    const textoNormalizado =
        /^\d{4}-\d{2}-\d{2}$/.test(texto)
            ? `${texto}T12:00:00`
            : texto;

    const data =
        new Date(textoNormalizado);

    if (Number.isNaN(data.getTime())) {
        return texto;
    }

    return data.toLocaleDateString("pt-BR");
}

function obterIndicadorRelatorioAnaliticoDds(
    relatorio,
    nome
) {
    return (
        relatorio?.blocos
            ?.flatMap(
                (bloco) =>
                    bloco?.indicadores || []
            )
            .find(
                (indicador) =>
                    indicador?.nome === nome
            ) ||
        null
    );
}

function obterClasseNivelRelatorioAnaliticoDds(nivel) {
    if (nivel === "critico") {
        return "border-red-200 bg-red-50 text-red-800";
    }

    if (nivel === "atencao") {
        return "border-amber-200 bg-amber-50 text-amber-800";
    }

    if (nivel === "normal") {
        return "border-emerald-200 bg-emerald-50 text-emerald-800";
    }

    return "border-slate-200 bg-slate-100 text-slate-600";
}

function obterRotuloNivelRelatorioAnaliticoDds(nivel) {
    if (nivel === "critico") {
        return "🔴 Crítico";
    }

    if (nivel === "atencao") {
        return "🟡 Atenção";
    }

    if (nivel === "normal") {
        return "🟢 Normal";
    }

    return "⚪ Sem dado";
}

function RelatorioAnaliticoSstDdsCard({
    relatorio,
    codigoDds,
    obra,
    periodoInicio,
    periodoFim,
}) {
    /*
     * dds_relatorio_analitico_estado_visual_persistente_v1
     *
     * Mantém a preferência de abertura do relatório analítico
     * após a atualização da página no mesmo navegador.
     */
    const chaveEstadoVisualRelatorioAnaliticoDds =
        "safescan:dds:relatorio-analitico-expandido";

    const [aberto, setAberto] =
        useState(() => {
            if (
                typeof window === "undefined"
            ) {
                return true;
            }

            try {
                const estadoSalvo =
                    window.localStorage.getItem(
                        chaveEstadoVisualRelatorioAnaliticoDds
                    );

                if (
                    estadoSalvo === "recolhido"
                ) {
                    return false;
                }

                if (
                    estadoSalvo === "expandido"
                ) {
                    return true;
                }
            } catch {
                // O relatório permanece funcional sem armazenamento local.
            }

            return true;
        });

    function alternarEstadoVisualRelatorioAnaliticoDds() {
        const proximoValor =
            !aberto;

        setAberto(
            proximoValor
        );

        if (
            typeof window !== "undefined"
        ) {
            try {
                window.localStorage.setItem(
                    chaveEstadoVisualRelatorioAnaliticoDds,
                    proximoValor
                        ? "expandido"
                        : "recolhido"
                );
            } catch {
                // O clique continua funcionando sem armazenamento local.
            }
        }
    }

    const [abaAtiva, setAbaAtiva] =
        useState("resumo");

    if (!relatorio) {
        return null;
    }

    const blocos =
        Array.isArray(relatorio.blocos)
            ? relatorio.blocos
            : [];

    const resumo =
        relatorio.resumo || {};

    // dds_apresentacao_composicao_base_v1
    const composicaoBaseParticipantes =
        relatorio.composicaoBaseParticipantes || {};

    const normalizarQuantidadeComposicaoBase =
        (valor, fallback = 0) => {
            const numero =
                Number(valor);

            return Number.isFinite(numero)
                ? Math.max(0, numero)
                : fallback;
        };

    const participantesTotal =
        normalizarQuantidadeComposicaoBase(
            composicaoBaseParticipantes.totalAnalisado ??
            resumo.participantes,
            0
        );

    const participantesComplementares =
        normalizarQuantidadeComposicaoBase(
            composicaoBaseParticipantes
                .participantesComplementares ??
            resumo.participantesComplementares,
            0
        );

    const participantesGabarito =
        normalizarQuantidadeComposicaoBase(
            composicaoBaseParticipantes
                .participantesGabarito ??
            resumo.participantesGabarito,
            Math.max(
                0,
                participantesTotal -
                    participantesComplementares
            )
        );

    const descricaoComposicaoBase =
        String(
            composicaoBaseParticipantes.descricao ||
            `Composição da base: ${participantesTotal} = ${participantesGabarito} participante(s) do gabarito + ${participantesComplementares} participante(s) complementar(es).`
        ).trim();

    const presencas =
        Math.max(
            0,
            Number(resumo.presencas || 0)
        );

    const ausencias =
        Math.max(
            0,
            Number(resumo.ausencias || 0)
        );

    const manuais =
        Math.max(
            0,
            Number(resumo.manuais || 0)
        );

    const totalFrequencias =
        presencas +
        ausencias +
        manuais;

    const assiduidadeGeral =
        totalFrequencias > 0
            ? Number(
                (
                    presencas /
                    totalFrequencias *
                    100
                ).toFixed(2)
            )
            : null;

    const absenteismoGeral =
        totalFrequencias > 0
            ? Number(
                (
                    ausencias /
                    totalFrequencias *
                    100
                ).toFixed(2)
            )
            : null;

    const formatarPercentual =
        (valor) =>
            valor === null ||
            valor === undefined ||
            !Number.isFinite(Number(valor))
                ? "Sem dado"
                : `${Number(valor).toLocaleString(
                    "pt-BR",
                    {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                    }
                )}%`;

    const nivelAssiduidade =
        assiduidadeGeral === null
            ? "nao_calculavel"
            : assiduidadeGeral < 80
                ? "critico"
                : assiduidadeGeral < 90
                    ? "atencao"
                    : "normal";

    const nivelAbsenteismo =
        absenteismoGeral === null
            ? "nao_calculavel"
            : absenteismoGeral > 20
                ? "critico"
                : absenteismoGeral > 10
                    ? "atencao"
                    : "normal";

    const criarCardIndicador =
        (
            nomeIndicador,
            titulo
        ) => {
            const indicador =
                obterIndicadorRelatorioAnaliticoDds(
                    relatorio,
                    nomeIndicador
                );

            return {
                titulo,
                valor:
                    indicador?.valor ||
                    "Sem dado",
                nivel:
                    indicador?.nivel ||
                    "nao_calculavel",
            };
        };

    const cardsResumo = [
        {
            titulo: "Assiduidade geral",
            valor:
                formatarPercentual(
                    assiduidadeGeral
                ),
            nivel:
                nivelAssiduidade,
        },
        {
            titulo: "Absenteísmo geral",
            valor:
                formatarPercentual(
                    absenteismoGeral
                ),
            nivel:
                nivelAbsenteismo,
        },
        criarCardIndicador(
            "Taxa de cobertura de DDS",
            "Cobertura do DDS"
        ),
        criarCardIndicador(
            "Taxa de preenchimento completo",
            "Preenchimento documental"
        ),
        criarCardIndicador(
            "Rotatividade aparente",
            "Rotatividade aparente"
        ),
        criarCardIndicador(
            "Percentual de assinaturas suspeitas",
            "Assinaturas suspeitas"
        ),
    ];

    const abas = [
        {
            id: "resumo",
            rotulo: "Resumo executivo",
            bloco: null,
        },
        ...blocos.map(
            (
                bloco,
                indice
            ) => ({
                id:
                    `bloco-${indice}`,
                rotulo:
                    String(
                        bloco?.titulo ||
                        `Bloco ${indice + 1}`
                    ).replace(
                        /^\d+\.\s*/,
                        ""
                    ),
                bloco,
            })
        ),
    ];

    const abaSelecionada =
        abas.find(
            (aba) =>
                aba.id === abaAtiva
        ) ||
        abas[0];

    const top3 =
        Array.isArray(relatorio.top3)
            ? relatorio.top3
            : [];

    function imprimirRelatorioAnaliticoDds() {
        const janela =
            window.open(
                "",
                "_blank",
                "width=1500,height=950"
            );

        if (!janela) {
            window.alert(
                "O navegador bloqueou a janela de impressão. Libere os pop-ups para gerar o PDF analítico."
            );

            return;
        }

        const cardsHtml =
            cardsResumo
                .map(
                    (card) => `
                        <div class="resumo-card">
                            <span>${escaparHtmlRelatorioAnaliticoDds(card.titulo)}</span>
                            <strong>${escaparHtmlRelatorioAnaliticoDds(card.valor)}</strong>
                            <small>${escaparHtmlRelatorioAnaliticoDds(
                                obterRotuloNivelRelatorioAnaliticoDds(
                                    card.nivel
                                )
                            )}</small>
                        </div>
                    `
                )
                .join("");

        const top3Html =
            top3.length > 0
                ? top3
                    .map(
                        (
                            indicador,
                            indice
                        ) => `
                            <article class="prioridade">
                                <span>Prioridade ${indice + 1}</span>
                                <strong>${escaparHtmlRelatorioAnaliticoDds(indicador.nome)}</strong>
                                <b>${escaparHtmlRelatorioAnaliticoDds(indicador.valor)}</b>
                                <p>${escaparHtmlRelatorioAnaliticoDds(indicador.interpretacao)}</p>
                            </article>
                        `
                    )
                    .join("")
                : `
                    <p class="sem-prioridade">
                        Nenhum indicador calculável atingiu nível crítico ou de atenção.
                    </p>
                `;

        const blocosHtml =
            blocos
                .map(
                    (bloco) => {
                        const linhas =
                            (
                                bloco?.indicadores ||
                                []
                            )
                                .map(
                                    (indicador) => {
                                        const detalhes =
                                            Array.isArray(
                                                indicador.detalhes
                                            ) &&
                                            indicador.detalhes.length > 0
                                                ? `
                                                    <ul>
                                                        ${indicador.detalhes
                                                            .map(
                                                                (detalhe) =>
                                                                    `<li>${escaparHtmlRelatorioAnaliticoDds(detalhe)}</li>`
                                                            )
                                                            .join("")}
                                                    </ul>
                                                `
                                                : "";

                                        return `
                                            <tr>
                                                <td class="nome">
                                                    ${escaparHtmlRelatorioAnaliticoDds(indicador.nome)}
                                                </td>
                                                <td class="valor">
                                                    ${escaparHtmlRelatorioAnaliticoDds(indicador.valor)}
                                                </td>
                                                <td>
                                                    ${escaparHtmlRelatorioAnaliticoDds(indicador.interpretacao)}
                                                    ${detalhes}
                                                </td>
                                                <td class="alerta">
                                                    ${escaparHtmlRelatorioAnaliticoDds(
                                                        obterRotuloNivelRelatorioAnaliticoDds(
                                                            indicador.nivel
                                                        )
                                                    )}
                                                </td>
                                            </tr>
                                        `;
                                    }
                                )
                                .join("");

                        return `
                            <section class="bloco">
                                <h2>${escaparHtmlRelatorioAnaliticoDds(bloco.titulo)}</h2>

                                <table>
                                    <thead>
                                        <tr>
                                            <th>Indicador</th>
                                            <th>Valor</th>
                                            <th>Interpretação e detalhes</th>
                                            <th>Alerta</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        ${linhas}
                                    </tbody>
                                </table>
                            </section>
                        `;
                    }
                )
                .join("");

        janela.document.open();

        janela.document.write(`
            <!doctype html>
            <html lang="pt-BR">
                <head>
                    <meta charset="utf-8" />
                    <title>Relatório Analítico SST — DDS</title>

                    <style>
                        @page {
                            size: A4 landscape;
                            margin: 9mm;
                        }

                        * {
                            box-sizing: border-box;
                        }

                        body {
                            margin: 0;
                            color: #0f172a;
                            font-family: Arial, Helvetica, sans-serif;
                            font-size: 9px;
                        }

                        .cabecalho {
                            border-radius: 12px;
                            background: #0f172a;
                            color: #ffffff;
                            padding: 16px 18px;
                        }

                        .cabecalho small {
                            display: block;
                            color: #6ee7b7;
                            font-size: 8px;
                            font-weight: 800;
                            letter-spacing: .12em;
                            text-transform: uppercase;
                        }

                        .cabecalho h1 {
                            margin: 5px 0 4px;
                            font-size: 21px;
                        }

                        .cabecalho p {
                            margin: 2px 0;
                            color: #e2e8f0;
                            line-height: 1.4;
                        }

                        .identificacao {
                            display: grid;
                            grid-template-columns:
                                1fr
                                1.5fr
                                1fr
                                1fr;
                            gap: 6px;
                            margin-top: 8px;
                        }

                        .identificacao div,
                        .resumo-card {
                            border: 1px solid #cbd5e1;
                            border-radius: 8px;
                            background: #ffffff;
                            padding: 8px;
                        }

                        .identificacao span,
                        .resumo-card span {
                            display: block;
                            color: #64748b;
                            font-size: 7px;
                            font-weight: 800;
                            letter-spacing: .05em;
                            text-transform: uppercase;
                        }

                        .identificacao strong,
                        .resumo-card strong {
                            display: block;
                            margin-top: 4px;
                            color: #0f172a;
                            font-size: 11px;
                        }

                        .resumo {
                            display: grid;
                            grid-template-columns:
                                repeat(6, 1fr);
                            gap: 6px;
                            margin-top: 8px;
                        }

                        .resumo-card {
                            min-height: 62px;
                            text-align: center;
                        }

                        .resumo-card small {
                            display: block;
                            margin-top: 5px;
                            font-size: 7px;
                            font-weight: 800;
                        }

                        .top3 {
                            margin-top: 8px;
                            border: 1px solid #fecaca;
                            border-radius: 10px;
                            background: #fef2f2;
                            padding: 8px;
                        }

                        .top3 h2 {
                            margin: 0 0 7px;
                            color: #991b1b;
                            font-size: 10px;
                            text-transform: uppercase;
                        }

                        .prioridades {
                            display: grid;
                            grid-template-columns:
                                repeat(3, 1fr);
                            gap: 6px;
                        }

                        .prioridade {
                            border: 1px solid #fecaca;
                            border-radius: 8px;
                            background: #ffffff;
                            padding: 8px;
                        }

                        .prioridade span {
                            display: block;
                            color: #dc2626;
                            font-size: 7px;
                            font-weight: 800;
                            text-transform: uppercase;
                        }

                        .prioridade strong,
                        .prioridade b {
                            display: block;
                            margin-top: 4px;
                        }

                        .prioridade p,
                        .sem-prioridade {
                            margin: 5px 0 0;
                            line-height: 1.4;
                        }

                        .bloco {
                            margin-top: 8px;
                            break-inside: avoid-page;
                        }

                        .bloco h2 {
                            margin: 0;
                            border: 1px solid #cbd5e1;
                            border-bottom: 0;
                            border-radius: 8px 8px 0 0;
                            background: #e2e8f0;
                            padding: 6px 8px;
                            font-size: 10px;
                        }

                        table {
                            width: 100%;
                            border-collapse: collapse;
                            table-layout: fixed;
                        }

                        th,
                        td {
                            border: 1px solid #cbd5e1;
                            padding: 5px;
                            vertical-align: top;
                            line-height: 1.35;
                        }

                        th {
                            background: #f8fafc;
                            color: #475569;
                            font-size: 7px;
                            text-align: left;
                            text-transform: uppercase;
                        }

                        th:nth-child(1) {
                            width: 20%;
                        }

                        th:nth-child(2) {
                            width: 15%;
                        }

                        th:nth-child(3) {
                            width: 52%;
                        }

                        th:nth-child(4) {
                            width: 13%;
                        }

                        td.nome,
                        td.valor,
                        td.alerta {
                            font-weight: 800;
                        }

                        td.valor,
                        td.alerta {
                            text-align: center;
                        }

                        ul {
                            margin: 5px 0 0;
                            padding-left: 15px;
                        }

                        li {
                            margin: 2px 0;
                        }

                        @media print {
                            body {
                                print-color-adjust: exact;
                                -webkit-print-color-adjust: exact;
                            }
                        }
                    </style>
                </head>

                <body>
                    <header class="cabecalho">
                        <small>
                            SafeScan Brasil |
                            Relatório analítico SST
                        </small>

                        <h1>
                            Indicadores consolidados do DDS
                        </h1>

                        <p>
                            Presença, absenteísmo, cobertura,
                            conformidade documental, riscos,
                            comparativos e engajamento.
                        </p>
                    </header>

                    <section class="identificacao">
                        <div>
                            <span>Código DDS</span>
                            <strong>
                                ${escaparHtmlRelatorioAnaliticoDds(
                                    codigoDds || "-"
                                )}
                            </strong>
                        </div>

                        <div>
                            <span>Obra / setor</span>
                            <strong>
                                ${escaparHtmlRelatorioAnaliticoDds(
                                    obra || "-"
                                )}
                            </strong>
                        </div>

                        <div>
                            <span>Período</span>
                            <strong>
                                ${escaparHtmlRelatorioAnaliticoDds(
                                    formatarDataRelatorioAnaliticoDds(
                                        periodoInicio
                                    )
                                )}
                                a
                                ${escaparHtmlRelatorioAnaliticoDds(
                                    formatarDataRelatorioAnaliticoDds(
                                        periodoFim
                                    )
                                )}
                            </strong>
                        </div>

                        <div>
                            <span>Base analisada</span>
                            <strong>
                                ${escaparHtmlRelatorioAnaliticoDds(
                                    participantesTotal
                                )}
                                participante(s) |
                                ${escaparHtmlRelatorioAnaliticoDds(
                                    resumo.diasAtivos || 0
                                )}
                                dia(s)
                                <br />
                                Gabarito:
                                ${escaparHtmlRelatorioAnaliticoDds(
                                    participantesGabarito
                                )}
                                | Complementares:
                                ${escaparHtmlRelatorioAnaliticoDds(
                                    participantesComplementares
                                )}
                            </strong>
                        </div>
                    </section>

                    <section class="resumo">
                        ${cardsHtml}
                    </section>

                    <section class="top3">
                        <h2>
                            ${relatorio?.tituloPontosAtencao || "Pontos de atenção"}
                        </h2>

                        <div class="prioridades">
                            ${top3Html}
                        </div>
                    </section>

                    ${blocosHtml}
                </body>
            </html>
        `);

        janela.document.close();
        janela.focus();

        window.setTimeout(
            () => {
                janela.print();
            },
            400
        );
    }

    // dds_exportacao_xlsx_exceljs_v1
    async function exportarRelatorioAnaliticoDdsXlsxTeste() {
        try {
            const moduloExcelJs =
                await import("exceljs");

            const ExcelJS =
                moduloExcelJs?.default &&
                typeof moduloExcelJs.default.Workbook ===
                    "function"
                    ? moduloExcelJs.default
                    : moduloExcelJs;

            if (
                typeof ExcelJS?.Workbook !==
                "function"
            ) {
                throw new Error(
                    "A classe Workbook do ExcelJS não foi localizada."
                );
            }

            const workbook =
                new ExcelJS.Workbook();

            workbook.creator =
                "SafeScan Brasil";

            workbook.lastModifiedBy =
                "SafeScan Brasil";

            workbook.created =
                new Date();

            workbook.modified =
                new Date();

            workbook.subject =
                "Relatório Analítico SST — DDS";

            workbook.title =
                "Relatório Analítico SST — DDS";

            workbook.description =
                "Teste técnico da infraestrutura XLSX do relatório analítico DDS.";

            const planilha =
                workbook.addWorksheet(
                    "Resumo técnico",
                    {
                        views: [
                            {
                                state: "frozen",
                                ySplit: 1,
                            },
                        ],
                    }
                );

            planilha.columns = [
                {
                    key: "campo",
                    width: 32,
                },
                {
                    key: "valor",
                    width: 54,
                },
                {
                    key: "alerta",
                    width: 22,
                },
                {
                    key: "interpretacao",
                    width: 76,
                },
            ];

            planilha.mergeCells(
                "A1:D1"
            );

            const celulaTitulo =
                planilha.getCell("A1");

            celulaTitulo.value =
                "RELATÓRIO ANALÍTICO SST — DDS";

            celulaTitulo.font = {
                bold: true,
                size: 16,
                color: {
                    argb: "FFFFFFFF",
                },
            };

            celulaTitulo.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: {
                    argb: "FF0F766E",
                },
            };

            celulaTitulo.alignment = {
                horizontal: "center",
                vertical: "middle",
            };

            planilha.getRow(1).height =
                28;

            planilha.addRow([]);

            planilha.addRow([
                "Código DDS",
                codigoDds || "-",
            ]);

            planilha.addRow([
                "Obra / setor",
                obra || "-",
            ]);

            planilha.addRow([
                "Período",
                `${formatarDataRelatorioAnaliticoDds(
                    periodoInicio
                )} a ${formatarDataRelatorioAnaliticoDds(
                    periodoFim
                )}`,
            ]);

            planilha.addRow([
                "Participantes",
                participantesTotal,
            ]);

            planilha.addRow([
                "Participantes do gabarito",
                participantesGabarito,
            ]);

            planilha.addRow([
                "Participantes complementares",
                participantesComplementares,
            ]);

            planilha.addRow([
                "Composição da base",
                descricaoComposicaoBase,
            ]);

            planilha.addRow([
                "Dias ativos",
                resumo.diasAtivos || 0,
            ]);

            planilha.addRow([]);

            const linhaCabecalhoResumo =
                planilha.addRow([
                    "Indicador",
                    "Valor",
                    "Alerta",
                    "Interpretação",
                ]);

            linhaCabecalhoResumo.font = {
                bold: true,
                color: {
                    argb: "FFFFFFFF",
                },
            };

            linhaCabecalhoResumo.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: {
                    argb: "FF334155",
                },
            };

            cardsResumo.forEach(
                (card) => {
                    planilha.addRow([
                        card.titulo,
                        card.valor,
                        obterRotuloNivelRelatorioAnaliticoDds(
                            card.nivel
                        ),
                        "",
                    ]);
                }
            );

            planilha.addRow([]);

            const linhaTituloPontos =
                planilha.addRow([
                    (
                        relatorio
                            ?.tituloPontosAtencao ||
                        "Pontos de atenção"
                    ).toLocaleUpperCase(
                        "pt-BR"
                    ),
                ]);

            planilha.mergeCells(
                linhaTituloPontos.number,
                1,
                linhaTituloPontos.number,
                4
            );

            linhaTituloPontos.font = {
                bold: true,
                color: {
                    argb: "FF7C2D12",
                },
            };

            linhaTituloPontos.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: {
                    argb: "FFFFEDD5",
                },
            };

            const linhaCabecalhoPontos =
                planilha.addRow([
                    "Prioridade",
                    "Indicador",
                    "Valor",
                    "Interpretação",
                ]);

            linhaCabecalhoPontos.font = {
                bold: true,
            };

            top3.forEach(
                (
                    indicador,
                    indice
                ) => {
                    planilha.addRow([
                        indice + 1,
                        indicador.nome,
                        indicador.valor,
                        indicador.interpretacao,
                    ]);
                }
            );

            planilha.eachRow(
                {
                    includeEmpty: false,
                },
                (linha) => {
                    linha.alignment = {
                        vertical: "top",
                        wrapText: true,
                    };
                }
            );

            const buffer =
                await workbook.xlsx.writeBuffer();

            const arquivo =
                new Blob(
                    [buffer],
                    {
                        type:
                            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    }
                );

            const url =
                URL.createObjectURL(
                    arquivo
                );

            const link =
                document.createElement(
                    "a"
                );

            const codigoSeguro =
                String(
                    codigoDds ||
                    "dds"
                )
                    .replace(
                        /[^a-z0-9_-]+/gi,
                        "-"
                    )
                    .replace(
                        /^-+|-+$/g,
                        ""
                    );

            link.href =
                url;

            link.download =
                `relatorio-analitico-sst-${
                    codigoSeguro ||
                    "dds"
                }-teste.xlsx`;

            document.body.appendChild(
                link
            );

            link.click();
            link.remove();

            window.setTimeout(
                () => {
                    URL.revokeObjectURL(
                        url
                    );
                },
                1000
            );
        }
        catch (erro) {
            console.error(
                "Falha ao gerar o XLSX técnico do relatório DDS.",
                erro
            );

            window.alert(
                "Não foi possível gerar o XLSX técnico. Consulte o Console para verificar o erro."
            );
        }
    }

    function exportarRelatorioAnaliticoDds() {
        const linhas = [
            [
                "RELATÓRIO ANALÍTICO SST — DDS",
            ],
            [],
            [
                "Código DDS",
                codigoDds || "-",
            ],
            [
                "Obra / setor",
                obra || "-",
            ],
            [
                "Período",
                `${formatarDataRelatorioAnaliticoDds(
                    periodoInicio
                )} a ${formatarDataRelatorioAnaliticoDds(
                    periodoFim
                )}`,
            ],
            [
                "Participantes",
                participantesTotal,
            ],
            [
                "Participantes do gabarito",
                participantesGabarito,
            ],
            [
                "Participantes complementares",
                participantesComplementares,
            ],
            [
                "Composição da base",
                descricaoComposicaoBase,
            ],
            [
                "Dias ativos",
                resumo.diasAtivos || 0,
            ],
            [],
            [
                "RESUMO EXECUTIVO",
            ],
            [
                "Indicador",
                "Valor",
                "Alerta",
            ],
            ...cardsResumo.map(
                (card) => [
                    card.titulo,
                    card.valor,
                    obterRotuloNivelRelatorioAnaliticoDds(
                        card.nivel
                    ),
                ]
            ),
            [],
            [
                (
                    relatorio
                        ?.tituloPontosAtencao ||
                    "Pontos de atenção"
                ).toLocaleUpperCase(
                    "pt-BR"
                ),
            ],
            [
                "Prioridade",
                "Indicador",
                "Valor",
                "Interpretação",
            ],
            ...top3.map(
                (
                    indicador,
                    indice
                ) => [
                    indice + 1,
                    indicador.nome,
                    indicador.valor,
                    indicador.interpretacao,
                ]
            ),
            [],
            [
                "INDICADORES COMPLETOS",
            ],
            [
                "Bloco",
                "Indicador",
                "Valor",
                "Interpretação",
                "Alerta",
                "Detalhes",
            ],
        ];

        blocos.forEach(
            (bloco) => {
                (
                    bloco?.indicadores ||
                    []
                ).forEach(
                    (indicador) => {
                        linhas.push([
                            bloco.titulo,
                            indicador.nome,
                            indicador.valor,
                            indicador.interpretacao,
                            obterRotuloNivelRelatorioAnaliticoDds(
                                indicador.nivel
                            ),
                            Array.isArray(
                                indicador.detalhes
                            )
                                ? indicador.detalhes.join(
                                    " | "
                                )
                                : "",
                        ]);
                    }
                );
            }
        );

        const escaparCsv =
            (valor) =>
                `"${String(
                    valor ?? ""
                ).replace(
                    /"/g,
                    '""'
                )}"`;

        const csv =
            "\uFEFF" +
            linhas
                .map(
                    (linha) =>
                        linha
                            .map(escaparCsv)
                            .join(";")
                )
                .join("\r\n");

        const arquivo =
            new Blob(
                [csv],
                {
                    type:
                        "text/csv;charset=utf-8",
                }
            );

        const url =
            URL.createObjectURL(
                arquivo
            );

        const link =
            document.createElement("a");

        const codigoSeguro =
            String(
                codigoDds ||
                "dds"
            )
                .replace(
                    /[^a-z0-9_-]+/gi,
                    "-"
                )
                .replace(
                    /^-+|-+$/g,
                    ""
                );

        link.href = url;

        link.download =
            `relatorio-analitico-sst-${
                codigoSeguro ||
                "dds"
            }.csv`;

        document.body.appendChild(
            link
        );

        link.click();
        link.remove();

        URL.revokeObjectURL(url);
    }

    return (
        <section className="dds-no-print col-span-full w-full overflow-hidden rounded-3xl border border-slate-200 border-t-4 border-t-emerald-500 bg-white shadow-sm">
            <div className="flex flex-col gap-4 px-4 py-4 xl:flex-row xl:items-start xl:justify-between">
                {/*
                 * dds_relatorio_analitico_cabecalho_sem_scroll_click_v1
                 *
                 * Permite abrir e fechar o relatório clicando
                 * diretamente na área informativa do cabeçalho.
                 */}
                <div
                    onClick={
                        alternarEstadoVisualRelatorioAnaliticoDds
                    }
                    role="button"
                    tabIndex={0}
                    onKeyDown={(evento) => {
                        if (
                            evento.key === "Enter" ||
                            evento.key === " "
                        ) {
                            evento.preventDefault();

                            alternarEstadoVisualRelatorioAnaliticoDds();
                        }
                    }}
                    aria-expanded={aberto}
                    aria-controls="conteudo-relatorio-analitico-dds"
                    title={
                        aberto
                            ? "Clique para fechar o relatório"
                            : "Clique para abrir o relatório"
                    }
                    className="min-w-0 flex-1 cursor-pointer rounded-2xl transition hover:bg-slate-50/80 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                >
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">
                        Segurança do trabalho
                    </p>

                    <h3 className="mt-1 text-lg font-black text-slate-950">
                        Relatório Analítico SST — DDS
                    </h3>

                    <p className="mt-1 max-w-4xl text-xs font-semibold leading-5 text-slate-500">
                        Indicadores consolidados de presença,
                        cobertura, conformidade documental,
                        riscos, comparativos e engajamento.
                    </p>

                    <div className="mt-2 grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 text-[10px] font-bold text-slate-600">
                        <span className="shrink-0 whitespace-nowrap rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                            DDS: {codigoDds || "-"}
                        </span>

                        <span
                            className="min-w-0 truncate whitespace-nowrap rounded-full border border-slate-200 bg-slate-50 px-3 py-1"
                            title={obra || "Obra não informada"}
                        >
                            {obra || "Obra não informada"}
                        </span>

                        <span className="shrink-0 whitespace-nowrap rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                            {formatarDataRelatorioAnaliticoDds(
                                periodoInicio
                            )}
                            {" a "}
                            {formatarDataRelatorioAnaliticoDds(
                                periodoFim
                            )}
                        </span>
                    </div>
                </div>

                <div className="flex w-full flex-wrap items-center gap-2 xl:w-auto xl:justify-end">
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-emerald-800">
                        Implantação{" "}
                        {relatorio.progressoImplantacao}%
                    </span>

                    <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-sky-800">
                        {resumo.indicadoresCalculados || 0}/
                        {resumo.indicadoresTotal || 0} calculados
                    </span>

                    <button
                        type="button"
                        onClick={
                            imprimirRelatorioAnaliticoDds
                        }
                        className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-[11px] font-black text-emerald-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-100"
                    >
                        Imprimir PDF analítico
                    </button>

                    <button
                        type="button"
                        onClick={
                            exportarRelatorioAnaliticoDds
                        }
                        className="rounded-xl border border-sky-300 bg-sky-50 px-3 py-2 text-[11px] font-black text-sky-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-sky-100"
                    >
                        Exportar Excel analítico
                    </button>

                    <button
                        type="button"
                        onClick={
                            exportarRelatorioAnaliticoDdsXlsxTeste
                        }
                        className="rounded-xl border border-indigo-300 bg-indigo-50 px-3 py-2 text-[11px] font-black text-indigo-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-indigo-100"
                        title="Validação técnica da infraestrutura ExcelJS"
                    >
                        Exportar XLSX — teste técnico
                    </button>

                    <button
                        type="button"
                        onClick={(evento) => {
                            evento.stopPropagation();

                            alternarEstadoVisualRelatorioAnaliticoDds();
                        }}
                        aria-expanded={aberto}
                        aria-controls="conteudo-relatorio-analitico-dds"
                        title={
                            aberto
                                ? "Fechar conteúdo do relatório"
                                : "Abrir conteúdo do relatório"
                        }
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-black text-slate-700 shadow-sm transition hover:bg-slate-50"
                    >
                        {aberto ? "Fechar" : "Abrir"}
                    </button>
                </div>
            </div>

            {aberto && (
                <div id="conteudo-relatorio-analitico-dds">
                    <div className="border-y border-slate-200 bg-slate-50 px-3 py-2">
                        <div className="flex gap-2 overflow-x-auto pb-1">
                            {abas.map(
                                (aba) => (
                                    <button
                                        key={aba.id}
                                        type="button"
                                        onClick={() =>
                                            setAbaAtiva(
                                                aba.id
                                            )
                                        }
                                        className={
                                            "shrink-0 rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-wide transition " +
                                            (
                                                abaAtiva ===
                                                aba.id
                                                    ? "border-slate-900 bg-slate-900 text-white"
                                                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
                                            )
                                        }
                                    >
                                        {aba.rotulo}
                                    </button>
                                )
                            )}
                        </div>
                    </div>

                    {abaSelecionada.id ===
                    "resumo" ? (
                        <div className="space-y-4 p-4">
                            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
                                {cardsResumo.map(
                                    (card) => (
                                        <div
                                            key={card.titulo}
                                            className={
                                                "flex min-h-[100px] flex-col items-center justify-center rounded-2xl border p-3 text-center " +
                                                obterClasseNivelRelatorioAnaliticoDds(
                                                    card.nivel
                                                )
                                            }
                                        >
                                            <p className="text-[9px] font-black uppercase tracking-wide">
                                                {card.titulo}
                                            </p>

                                            <p className="mt-2 text-lg font-black">
                                                {card.valor}
                                            </p>

                                            <p className="mt-1 text-[9px] font-black uppercase tracking-wide">
                                                {obterRotuloNivelRelatorioAnaliticoDds(
                                                    card.nivel
                                                )}
                                            </p>
                                        </div>
                                    )
                                )}
                            </div>

                            <section className="rounded-2xl border border-red-200 bg-red-50 p-4">
                                <p className="text-[10px] font-black uppercase tracking-wide text-red-800">
                                    {relatorio?.tituloPontosAtencao ||
                                        "Pontos de atenção"}
                                </p>

                                {top3.length > 0 ? (
                                    <div className="mt-3 grid gap-3 lg:grid-cols-3">
                                        {top3.map(
                                            (
                                                indicador,
                                                indice
                                            ) => (
                                                <div
                                                    key={
                                                        indicador.bloco +
                                                        "-" +
                                                        indicador.nome
                                                    }
                                                    className="rounded-xl border border-red-100 bg-white p-4"
                                                >
                                                    <p className="text-[9px] font-black uppercase tracking-wide text-red-600">
                                                        Prioridade{" "}
                                                        {indice + 1}
                                                    </p>

                                                    <p className="mt-2 text-sm font-black leading-5 text-slate-950">
                                                        {indicador.nome}
                                                    </p>

                                                    <p className="mt-2 text-base font-black text-red-800">
                                                        {indicador.valor}
                                                    </p>

                                                    <p className="mt-2 text-xs font-semibold leading-5 text-slate-600">
                                                        {
                                                            indicador.interpretacao
                                                        }
                                                    </p>
                                                </div>
                                            )
                                        )}
                                    </div>
                                ) : (
                                    <p className="mt-3 text-sm font-bold text-emerald-800">
                                        Nenhum indicador calculável atingiu nível crítico ou de atenção.
                                    </p>
                                )}
                            </section>

                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                                <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
                                    <p className="text-[9px] font-black uppercase text-slate-500">
                                        Base total analisada
                                    </p>

                                    <p className="mt-1 text-lg font-black text-slate-950">
                                        {participantesTotal}
                                    </p>
                                </div>

                                <div className="rounded-xl border border-violet-200 bg-violet-50 p-3 text-center">
                                    <p className="text-[9px] font-black uppercase text-violet-700">
                                        Participantes do gabarito
                                    </p>

                                    <p className="mt-1 text-lg font-black text-violet-950">
                                        {participantesGabarito}
                                    </p>
                                </div>

                                <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-center">
                                    <p className="text-[9px] font-black uppercase text-sky-700">
                                        Participantes complementares
                                    </p>

                                    <p className="mt-1 text-lg font-black text-sky-950">
                                        {participantesComplementares}
                                    </p>
                                </div>

                                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center">
                                    <p className="text-[9px] font-black uppercase text-emerald-700">
                                        Presenças
                                    </p>

                                    <p className="mt-1 text-lg font-black text-emerald-900">
                                        {presencas}
                                    </p>
                                </div>

                                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-center">
                                    <p className="text-[9px] font-black uppercase text-red-700">
                                        Ausências
                                    </p>

                                    <p className="mt-1 text-lg font-black text-red-900">
                                        {ausencias}
                                    </p>
                                </div>

                                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-center">
                                    <p className="text-[9px] font-black uppercase text-amber-700">
                                        Pendências manuais
                                    </p>

                                    <p className="mt-1 text-lg font-black text-amber-900">
                                        {manuais}
                                    </p>
                                </div>
                            </div>

                            <section className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
                                <p className="text-[10px] font-black uppercase tracking-wide text-sky-800">
                                    Composição da base
                                </p>

                                <p className="mt-2 text-sm font-semibold leading-6 text-sky-950">
                                    {descricaoComposicaoBase}
                                </p>
                            </section>
                        </div>
                    ) : (
                        <div className="p-4">
                            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                                <div className="border-b border-slate-200 bg-slate-100 px-4 py-3">
                                    <h4 className="text-xs font-black uppercase tracking-wide text-slate-800">
                                        {
                                            abaSelecionada
                                                .bloco
                                                ?.titulo
                                        }
                                    </h4>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[900px] border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50 text-[9px] font-black uppercase tracking-wide text-slate-500">
                                                <th className="w-[22%] border-b border-slate-200 px-4 py-3 text-left">
                                                    Indicador
                                                </th>

                                                <th className="w-[16%] border-b border-slate-200 px-4 py-3 text-center">
                                                    Valor
                                                </th>

                                                <th className="w-[48%] border-b border-slate-200 px-4 py-3 text-left">
                                                    Interpretação e detalhamento
                                                </th>

                                                <th className="w-[14%] border-b border-slate-200 px-4 py-3 text-center">
                                                    Alerta
                                                </th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {(
                                                abaSelecionada
                                                    .bloco
                                                    ?.indicadores ||
                                                []
                                            ).map(
                                                (indicador) => (
                                                    <tr
                                                        key={
                                                            indicador.nome
                                                        }
                                                        className="align-top"
                                                    >
                                                        <td className="border-b border-slate-100 px-4 py-4 text-xs font-black leading-5 text-slate-900">
                                                            {
                                                                indicador.nome
                                                            }
                                                        </td>

                                                        <td className="border-b border-slate-100 px-4 py-4 text-center text-xs font-black leading-5 text-slate-950">
                                                            {
                                                                indicador.valor
                                                            }
                                                        </td>

                                                        <td className="border-b border-slate-100 px-4 py-4 text-xs font-semibold leading-5 text-slate-600">
                                                            <p>
                                                                {
                                                                    indicador.interpretacao
                                                                }
                                                            </p>

                                                            {Array.isArray(
                                                                indicador.detalhes
                                                            ) &&
                                                                indicador
                                                                    .detalhes
                                                                    .length >
                                                                    0 && (
                                                                    <ul className="mt-3 space-y-1.5 border-l-2 border-slate-200 pl-4 text-[11px] font-bold leading-5 text-slate-500">
                                                                        {indicador.detalhes.map(
                                                                            (
                                                                                detalhe,
                                                                                indice
                                                                            ) => (
                                                                                <li
                                                                                    key={
                                                                                        indicador.nome +
                                                                                        "-" +
                                                                                        indice
                                                                                    }
                                                                                >
                                                                                    {
                                                                                        detalhe
                                                                                    }
                                                                                </li>
                                                                            )
                                                                        )}
                                                                    </ul>
                                                                )}
                                                        </td>

                                                        <td className="border-b border-slate-100 px-4 py-4 text-center">
                                                            <span
                                                                className={
                                                                    "inline-flex rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-wide " +
                                                                    obterClasseNivelRelatorioAnaliticoDds(
                                                                        indicador.nivel
                                                                    )
                                                                }
                                                            >
                                                                {obterRotuloNivelRelatorioAnaliticoDds(
                                                                    indicador.nivel
                                                                )}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                )
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}

/*
 * dds_formato_data_exibicao_br_v1
 *
 * Mantém as datas no formato ISO utilizado pelo banco,
 * mas padroniza a apresentação visual como DD/MM/AAAA.
 */
function formatarDataExibicaoDds(
    valor
) {
    const texto =
        String(
            valor ||
            ""
        ).trim();

    if (!texto) {
        return "-";
    }

    const formatoIso =
        texto.match(
            /^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/
        );

    if (formatoIso) {
        return (
            formatoIso[3] +
            "/" +
            formatoIso[2] +
            "/" +
            formatoIso[1]
        );
    }

    const formatoBrasileiro =
        texto.match(
            /^(\d{2})\/(\d{2})\/(\d{4})$/
        );

    if (formatoBrasileiro) {
        return texto;
    }

    const data =
        new Date(texto);

    if (
        Number.isNaN(
            data.getTime()
        )
    ) {
        return texto;
    }

    return new Intl.DateTimeFormat(
        "pt-BR",
        {
            timeZone: "UTC",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        }
    ).format(data);
}


export function DdsPage({
    supabase = null,
    colaboradores = [],
    empresasBanco = [],
    obrasEmpresasBanco = [],
    usuario = null,
}) {
    const empresasDds = useMemo(
        () => (Array.isArray(empresasBanco) ? empresasBanco.filter(Boolean) : []),
        [empresasBanco]
    );

    const obrasEmpresasDds = useMemo(
        () => (Array.isArray(obrasEmpresasBanco) ? obrasEmpresasBanco.filter(Boolean) : []),
        [obrasEmpresasBanco]
    );

    const [empresaSelecionadaChaveDds, setEmpresaSelecionadaChaveDds] = useState(() => carregarEmpresaSelecionadaDds());
    const [obraSelecionadaIdDds, setObraSelecionadaIdDds] = useState("");
    const [deslocamentoSemanasDds, setDeslocamentoSemanasDds] = useState(0);
    const [obrasSetorPorEmpresaDds, setObrasSetorPorEmpresaDds] = useState(() => carregarObrasSetorDdsPorEmpresa());
    const [fiscalIdealizaPorEmpresaDds, setFiscalIdealizaPorEmpresaDds] = useState(() => carregarFiscalIdealizaDdsPorEmpresa());

    function atualizarEmpresaSelecionadaDds(chaveEmpresa) {
        setEmpresaSelecionadaChaveDds(chaveEmpresa);
        setObraSelecionadaIdDds("");
        salvarEmpresaSelecionadaDds(chaveEmpresa);
    }

    useEffect(() => {
        if (empresasDds.length === 0) {
            setEmpresaSelecionadaChaveDds("");
            salvarEmpresaSelecionadaDds("");
            return;
        }

        const existeEmpresaSelecionada = empresasDds.some((empresa, indice) =>
            obterChaveEmpresaDds(empresa, indice) === empresaSelecionadaChaveDds
        );

        if (!empresaSelecionadaChaveDds || !existeEmpresaSelecionada) {
            const chaveEmpresaInicial = obterChaveEmpresaDds(empresasDds[0], 0);
            setEmpresaSelecionadaChaveDds(chaveEmpresaInicial);
            salvarEmpresaSelecionadaDds(chaveEmpresaInicial);
        }
    }, [empresasDds, empresaSelecionadaChaveDds]);

    const empresaSelecionadaDds = useMemo(
        () => empresasDds.find((empresa, indice) =>
            obterChaveEmpresaDds(empresa, indice) === empresaSelecionadaChaveDds
        ) || null,
        [empresasDds, empresaSelecionadaChaveDds]
    );

    const colaboradoresEmpresaDds = useMemo(() => {
        const colaboradoresFiltradosDds = filtrarColaboradoresPorEmpresaDds(colaboradores, empresaSelecionadaDds);
        const colaboradoresOriginaisDds = Array.isArray(colaboradores) ? colaboradores : [];

        return colaboradoresFiltradosDds.map((colaboradorFiltrado) => {
            const idFiltradoDds = obterValorTextoDds(colaboradorFiltrado?.id, colaboradorFiltrado?.colaborador_id, colaboradorFiltrado?.token);
            const nomeFiltradoDds = normalizarTextoCodigoDds(obterValorTextoDds(
                colaboradorFiltrado?.nome,
                colaboradorFiltrado?.nomeCompleto,
                colaboradorFiltrado?.nome_completo,
                colaboradorFiltrado?.colaborador,
                colaboradorFiltrado?.nomeColaborador
            ));
            const empresaFiltradaDds = normalizarTextoCodigoDds(obterValorTextoDds(
                colaboradorFiltrado?.empresaExibicao,
                colaboradorFiltrado?.empresa_exibicao,
                colaboradorFiltrado?.empresaNome,
                colaboradorFiltrado?.empresa_nome,
                colaboradorFiltrado?.empresa
            ));

            const colaboradorOriginalDds = colaboradoresOriginaisDds.find((colaboradorOriginal) => {
                const idOriginalDds = obterValorTextoDds(colaboradorOriginal?.id, colaboradorOriginal?.colaborador_id, colaboradorOriginal?.token);

                if (idFiltradoDds && idOriginalDds && idFiltradoDds === idOriginalDds) {
                    return true;
                }

                const nomeOriginalDds = normalizarTextoCodigoDds(obterValorTextoDds(
                    colaboradorOriginal?.nome,
                    colaboradorOriginal?.nomeCompleto,
                    colaboradorOriginal?.nome_completo,
                    colaboradorOriginal?.colaborador,
                    colaboradorOriginal?.nomeColaborador
                ));

                if (!nomeFiltradoDds || !nomeOriginalDds || nomeFiltradoDds !== nomeOriginalDds) {
                    return false;
                }

                const empresaOriginalDds = normalizarTextoCodigoDds(obterValorTextoDds(
                    colaboradorOriginal?.empresaExibicao,
                    colaboradorOriginal?.empresa_exibicao,
                    colaboradorOriginal?.empresaNome,
                    colaboradorOriginal?.empresa_nome,
                    colaboradorOriginal?.empresa
                ));

                return !empresaFiltradaDds ||
                    !empresaOriginalDds ||
                    empresaOriginalDds.includes(empresaFiltradaDds) ||
                    empresaFiltradaDds.includes(empresaOriginalDds);
            });

            const codigoFuncionarioDds = obterValorTextoDds(
                colaboradorFiltrado?.codigoFuncionario,
                colaboradorFiltrado?.codigo_funcionario,
                colaboradorFiltrado?.codigoSafescan,
                colaboradorFiltrado?.codigoSafeScan,
                colaboradorFiltrado?.codigo_safescan,
                colaboradorFiltrado?.codigo,
                colaboradorFiltrado?.codigo_colaborador,
                colaboradorOriginalDds?.codigoFuncionario,
                colaboradorOriginalDds?.codigo_funcionario,
                colaboradorOriginalDds?.codigoSafescan,
                colaboradorOriginalDds?.codigoSafeScan,
                colaboradorOriginalDds?.codigo_safescan,
                colaboradorOriginalDds?.codigo,
                colaboradorOriginalDds?.codigo_colaborador
            );

            return {
                ...(colaboradorOriginalDds || {}),
                ...colaboradorFiltrado,
                codigoFuncionario: codigoFuncionarioDds,
                codigo_funcionario: codigoFuncionarioDds,
                codigoSafescan: obterValorTextoDds(colaboradorFiltrado?.codigoSafescan, codigoFuncionarioDds),
            };
        });
    }, [colaboradores, empresaSelecionadaDds]);

    const obrasEmpresaSelecionadaDds = useMemo(() => {
        const empresaIdSelecionada = obterIdEmpresaObjetoDds(empresaSelecionadaDds);

        if (!empresaIdSelecionada) return [];

        return obrasEmpresasDds.filter((item) => {
            const obraBase = obterObraBaseDds(item);

            return (
                obterEmpresaIdObraDds(item) === empresaIdSelecionada &&
                item?.status !== "Inativa" &&
                obraBase?.status !== "Inativa"
            );
        });
    }, [empresaSelecionadaDds, obrasEmpresasDds]);

    const inicioSemanaDds = useMemo(
        () => adicionarDiasDds(obterInicioSemanaDds(), deslocamentoSemanasDds * 7),
        [deslocamentoSemanasDds]
    );
    const fimSemanaDds = useMemo(() => obterFimSemanaDds(inicioSemanaDds), [inicioSemanaDds]);
    const diasSemanaDds = useMemo(() => gerarDiasSemanaDds(inicioSemanaDds), [inicioSemanaDds]);

    const dadosDdsAutomaticos = useMemo(() => {
        const dadosAutomaticos = montarDadosDdsAutomaticos({
            colaboradores: colaboradoresEmpresaDds,
            empresasBanco,
            empresaSelecionada: empresaSelecionadaDds,
            usuario,
            inicioSemana: inicioSemanaDds,
            fimSemana: fimSemanaDds,
        });

        const obraSetorSalva = String(obrasSetorPorEmpresaDds?.[empresaSelecionadaChaveDds] || "").trim();
        const fiscalIdealizaFoiSalvoAutomatico = empresaSelecionadaChaveDds
            ? Object.prototype.hasOwnProperty.call(fiscalIdealizaPorEmpresaDds || {}, empresaSelecionadaChaveDds)
            : false;
        const fiscalIdealizaSalvo = fiscalIdealizaFoiSalvoAutomatico
            ? String(fiscalIdealizaPorEmpresaDds?.[empresaSelecionadaChaveDds] || "")
            : "";

        return {
            ...dadosAutomaticos,
            obraSetor: obraSetorSalva || dadosAutomaticos.obraSetor,
            fiscalIdealiza: fiscalIdealizaFoiSalvoAutomatico ? fiscalIdealizaSalvo : dadosAutomaticos.fiscalIdealiza,
        };
    }, [
        colaboradoresEmpresaDds,
        empresasBanco,
        empresaSelecionadaDds,
        usuario,
        inicioSemanaDds,
        fimSemanaDds,
        obrasSetorPorEmpresaDds,
        fiscalIdealizaPorEmpresaDds,
        empresaSelecionadaChaveDds,
    ]);

    const [dadosDds, setDadosDds] = useState(dadosDdsAutomaticos);
    const [temasDdsEditaveis, setTemasDdsEditaveis] = useState(() => criarTemasEditaveisDds());
    const [chaveTemasDdsCarregada, setChaveTemasDdsCarregada] = useState("");
    const [recadosDdsEditaveis, setRecadosDdsEditaveis] = useState("");
    const [chaveRecadosDdsCarregada, setChaveRecadosDdsCarregada] = useState("");

    const [orientacoesDdsEditaveis, setOrientacoesDdsEditaveis] = useState(() => criarOrientacoesPadraoDds());
    const [chaveOrientacoesDdsCarregada, setChaveOrientacoesDdsCarregada] = useState("");
    const [cardsDdsAbertos, setCardsDdsAbertos] = useState(() => carregarCardsDdsLocal());
    const [registroDdsConferencia, setRegistroDdsConferencia] = useState(null);
    const [salvandoRegistroDds, setSalvandoRegistroDds] = useState(false);
    const [, setErroRegistroDds] = useState("");
    const [codigoConferenciaDds, setCodigoConferenciaDds] = useState("");
    const [registroScannerDds, setRegistroScannerDds] = useState(null);
    const [carregandoScannerDds, setCarregandoScannerDds] = useState(false);
    const [erroScannerDds, setErroScannerDds] = useState("");
    const [registrosDisponiveisDds, setRegistrosDisponiveisDds] = useState([]);
    const [carregandoRegistrosDisponiveisDds, setCarregandoRegistrosDisponiveisDds] = useState(false);
    const [erroListaRegistrosDds, setErroListaRegistrosDds] = useState("");
    const [empresaFiltroRegistrosDds, setEmpresaFiltroRegistrosDds] = useState("");
    const [excluindoRegistroDdsId, setExcluindoRegistroDdsId] = useState("");
    const [mensagemExclusaoRegistroDds, setMensagemExclusaoRegistroDds] = useState(null);
    /*
     * dds_lista_registros_estado_persistente_v1
     *
     * Mantém a preferência visual do usuário após atualização da página.
     */
    const [listaRegistrosDdsExpandida, setListaRegistrosDdsExpandida] = useState(() => {
        if (
            typeof window === "undefined"
        ) {
            return true;
        }

        try {
            const estadoSalvo =
                window.localStorage.getItem(
                    "safescan:dds:listagem-registros-expandida"
                );

            if (
                estadoSalvo === "fechada"
            ) {
                return false;
            }

            if (
                estadoSalvo === "aberta"
            ) {
                return true;
            }
        } catch {
            // O navegador pode bloquear o armazenamento local.
        }

        return true;
    });

    useEffect(() => {
        if (
            typeof window === "undefined"
        ) {
            return;
        }

        try {
            window.localStorage.setItem(
                "safescan:dds:listagem-registros-expandida",
                listaRegistrosDdsExpandida
                    ? "aberta"
                    : "fechada"
            );
        } catch {
            // A interface continua funcional mesmo sem localStorage.
        }
    }, [listaRegistrosDdsExpandida]);
    const [arquivoScannerDds, setArquivoScannerDds] = useState(null);
    const [erroArquivoScannerDds, setErroArquivoScannerDds] = useState("");
    const [leituraArquivoScannerDds, setLeituraArquivoScannerDds] = useState(null);
    const [carregandoLeituraArquivoScannerDds, setCarregandoLeituraArquivoScannerDds] = useState(false);
    const [erroLeituraArquivoScannerDds, setErroLeituraArquivoScannerDds] = useState("");
    const [mensagemDocumentoPersistidoDds, setMensagemDocumentoPersistidoDds] = useState(null);
    const [excluindoDocumentoPersistidoDds, setExcluindoDocumentoPersistidoDds] = useState(false);
    const [conferenciaAssistidaDds, setConferenciaAssistidaDds] = useState({});
    const [temasConferenciaAssistidaDds, setTemasConferenciaAssistidaDds] = useState([]);
    const [participantesAdicionaisConferenciaDds, setParticipantesAdicionaisConferenciaDds] = useState(() =>
        criarParticipantesAdicionaisConferenciaDds()
    );
    const [salvandoConferenciaAssistidaDds, setSalvandoConferenciaAssistidaDds] = useState(false);
    const [erroConferenciaAssistidaDds, setErroConferenciaAssistidaDds] = useState("");
    const [conferenciaAssistidaSalvaEmDds, setConferenciaAssistidaSalvaEmDds] = useState("");
    const [salvandoFechamentoConferenciaDds, setSalvandoFechamentoConferenciaDds] = useState(false);
    const [erroFechamentoConferenciaDds, setErroFechamentoConferenciaDds] = useState("");
    const [fechamentoConferenciaAssistidaDds, setFechamentoConferenciaAssistidaDds] = useState(null);
    const [reciboFinalEmitidoEmDds, setReciboFinalEmitidoEmDds] = useState("");
    const [mesHistoricoMaoDeObraDds, setMesHistoricoMaoDeObraDds] = useState(() => {
        const data = new Date();
        const ano = data.getFullYear();
        const mes = String(data.getMonth() + 1).padStart(2, "0");
        return ano + "-" + mes;
    });
    const [historicoMensalMaoDeObraDds, setHistoricoMensalMaoDeObraDds] = useState([]);
    const [carregandoHistoricoMensalMaoDeObraDds, setCarregandoHistoricoMensalMaoDeObraDds] = useState(false);
    const [erroHistoricoMensalMaoDeObraDds, setErroHistoricoMensalMaoDeObraDds] = useState("");
    const [historicoMensalConsultadoEmDds, setHistoricoMensalConsultadoEmDds] = useState("");

    const [salvandoReciboFinalDds, setSalvandoReciboFinalDds] = useState(false);
    const [erroReciboFinalDds, setErroReciboFinalDds] = useState("");
    const [codigoReciboCopiadoDds, setCodigoReciboCopiadoDds] = useState(false);
    const reciboConferenciaFinalRef = useRef(null);

    useEffect(() => {
        salvarCardsDdsLocal(cardsDdsAbertos);
    }, [cardsDdsAbertos]);

    function cardDdsAberto(chaveCard) {
        return cardsDdsAbertos?.[chaveCard] !== false;
    }

    function alternarCardDds(chaveCard) {
        setCardsDdsAbertos((cardsAtuais) => ({
            ...CARDS_DDS_PADRAO,
            ...(cardsAtuais || {}),
            [chaveCard]: cardsAtuais?.[chaveCard] === false,
        }));
    }
    const empresaContratanteDds = useMemo(() => obterEmpresaContratanteDds({
        empresaSelecionada: empresaSelecionadaDds,
        empresasDds,
    }), [empresaSelecionadaDds, empresasDds]);

    const logoContratanteDds = useMemo(
        () => resolverLogoEmpresaDds(obterLogoRawEmpresaDds(empresaContratanteDds)),
        [empresaContratanteDds]
    );
    const logosEmpresasCabecalhoDds = useMemo(() => obterLogosEmpresasCabecalhoDds({
        empresaSelecionada: empresaSelecionadaDds,
        empresasDds,
    }), [empresaSelecionadaDds, empresasDds]);
    const logoEmpresaDds = useMemo(() => obterLogoEmpresaSelecionadaDds({
        empresaSelecionada: empresaSelecionadaDds,
        colaboradoresEmpresa: colaboradoresEmpresaDds,
        dadosDds,
    }), [empresaSelecionadaDds, colaboradoresEmpresaDds, dadosDds]);

    const dadosDdsComRegistro = useMemo(() => ({
        ...dadosDds,
        tokenDds: registroDdsConferencia?.tokenPublico || "",
        qrConferenciaUrl: registroDdsConferencia?.urlConferencia || "",
        empresaLogoUrl: logoEmpresaDds,
        empresaLogoNome: empresaSelecionadaDds?.logo_nome || empresaSelecionadaDds?.logoNome || "",
        contratanteLogoUrl: logoContratanteDds,
        contratanteLogoNome: empresaContratanteDds?.logo_nome || empresaContratanteDds?.logoNome || "",
        contratanteNome: empresaContratanteDds?.nome || "",
        logosEmpresasCabecalho: logosEmpresasCabecalhoDds,
        recadosSemana: recadosDdsEditaveis,
        orientacoesImportantes: orientacoesDdsEditaveis,
    }), [dadosDds, registroDdsConferencia, logoEmpresaDds, empresaSelecionadaDds, logoContratanteDds, empresaContratanteDds, logosEmpresasCabecalhoDds, recadosDdsEditaveis, orientacoesDdsEditaveis]);

    /*
     * dds_lista_completa_registros_persistidos
     *
     * Carrega todos os DDS cadastrados usando paginação de 500 registros.
     * A listagem é utilizada no seletor e na tabela da Conferência DDS.
     */
    useEffect(() => {
        let componenteAtivo = true;

        async function carregarTodosRegistrosDisponiveisDds() {
            if (!supabase) {
                if (componenteAtivo) {
                    setRegistrosDisponiveisDds([]);
                    setErroListaRegistrosDds(
                        "Supabase não disponível para listar os DDS cadastrados."
                    );
                }

                return;
            }

            setCarregandoRegistrosDisponiveisDds(true);
            setErroListaRegistrosDds("");

            try {
                const registrosAcumulados = [];
                const tamanhoPagina = 500;
                const limitePaginas = 100;

                let paginaAtual = 0;

                while (paginaAtual < limitePaginas) {
                    const inicio =
                        paginaAtual * tamanhoPagina;

                    const fim =
                        inicio + tamanhoPagina - 1;

                    const {
                        data,
                        error,
                    } = await supabase
                        .from("dds_registros")
                        .select(
                            [
                                "id",
                                "codigo",
                                "empresa_nome",
                                "obra_nome",
                                "periodo_inicio",
                                "periodo_fim",
                                "status",
                                "created_at",
                                "updated_at",
                            ].join(",")
                        )
                        .order(
                            "periodo_inicio",
                            {
                                ascending: false,
                            }
                        )
                        .order(
                            "created_at",
                            {
                                ascending: false,
                            }
                        )
                        .range(
                            inicio,
                            fim
                        );

                    if (error) {
                        throw new Error(
                            error.message ||
                            "Não foi possível listar os DDS cadastrados."
                        );
                    }

                    const lote =
                        Array.isArray(data)
                            ? data
                            : [];

                    registrosAcumulados.push(
                        ...lote
                    );

                    if (
                        lote.length <
                        tamanhoPagina
                    ) {
                        break;
                    }

                    paginaAtual += 1;
                }

                const registrosPorCodigo =
                    new Map();

                registrosAcumulados.forEach(
                    (registro) => {
                        const codigo =
                            String(
                                registro?.codigo ||
                                ""
                            )
                                .trim()
                                .toUpperCase();

                        if (!codigo) {
                            return;
                        }

                        registrosPorCodigo.set(
                            codigo,
                            {
                                id:
                                    registro?.id ||
                                    codigo,
                                codigo,
                                empresaNome:
                                    String(
                                        registro?.empresa_nome ||
                                        ""
                                    ).trim(),
                                obraNome:
                                    String(
                                        registro?.obra_nome ||
                                        ""
                                    ).trim(),
                                periodoInicio:
                                    String(
                                        registro?.periodo_inicio ||
                                        ""
                                    ).trim(),
                                periodoFim:
                                    String(
                                        registro?.periodo_fim ||
                                        ""
                                    ).trim(),
                                status:
                                    String(
                                        registro?.status ||
                                        "Ativo"
                                    ).trim(),
                            }
                        );
                    }
                );

                if (componenteAtivo) {
                    setRegistrosDisponiveisDds(
                        Array.from(
                            registrosPorCodigo.values()
                        )
                    );
                }
            } catch (error) {
                if (componenteAtivo) {
                    setRegistrosDisponiveisDds([]);

                    setErroListaRegistrosDds(
                        error?.message ||
                        "Não foi possível carregar os DDS cadastrados."
                    );
                }
            } finally {
                if (componenteAtivo) {
                    setCarregandoRegistrosDisponiveisDds(
                        false
                    );
                }
            }
        }

        carregarTodosRegistrosDisponiveisDds();

        return () => {
            componenteAtivo = false;
        };
    }, [supabase]);


    /*
     * dds_exclusao_registro_lista_v1
     *
     * Exclui individualmente um DDS cadastrado, após a confirmação
     * exata do código. O registro principal é removido primeiro.
     * Depois são removidos os metadados e arquivos vinculados.
     */
    async function excluirRegistroCadastradoDds(
        registro
    ) {
        if (!supabase) {
            setMensagemExclusaoRegistroDds({
                tipo: "erro",
                texto:
                    "Supabase não disponível para excluir o DDS.",
            });

            return;
        }

        const registroId =
            String(
                registro?.id ||
                ""
            ).trim();

        const codigo =
            String(
                registro?.codigo ||
                ""
            )
                .trim()
                .toUpperCase();

        if (
            !registroId ||
            !codigo
        ) {
            setMensagemExclusaoRegistroDds({
                tipo: "erro",
                texto:
                    "O registro selecionado não possui identificação válida.",
            });

            return;
        }

        if (excluindoRegistroDdsId) {
            return;
        }

        const confirmacaoDigitada =
            window.prompt(
                "Para excluir definitivamente este DDS, digite exatamente o código abaixo:\n\n" +
                codigo
            );

        if (confirmacaoDigitada === null) {
            return;
        }

        if (
            String(confirmacaoDigitada)
                .trim()
                .toUpperCase() !==
            codigo
        ) {
            setMensagemExclusaoRegistroDds({
                tipo: "erro",
                texto:
                    "Código de confirmação incorreto. Nenhum DDS foi excluído.",
            });

            return;
        }

        const confirmado =
            window.confirm(
                "Confirma a exclusão definitiva do DDS " +
                codigo +
                "?\n\n" +
                "O registro, o QR público e os PDFs vinculados deixarão de estar disponíveis."
            );

        if (!confirmado) {
            return;
        }

        setExcluindoRegistroDdsId(
            registroId
        );

        setMensagemExclusaoRegistroDds(
            null
        );

        try {
            const {
                data:
                    documentosConsultados,
                error:
                    erroConsultarDocumentos,
            } =
                await supabase
                    .from("dds_documentos")
                    .select(
                        "id,bucket_id,caminho_storage"
                    )
                    .eq(
                        "registro_id",
                        registroId
                    );

            if (erroConsultarDocumentos) {
                throw new Error(
                    erroConsultarDocumentos.message ||
                    "Não foi possível consultar os PDFs vinculados ao DDS."
                );
            }

            const documentos =
                Array.isArray(
                    documentosConsultados
                )
                    ? documentosConsultados
                    : [];

            const {
                data:
                    registrosExcluidos,
                error:
                    erroExcluirRegistro,
            } =
                await supabase
                    .from("dds_registros")
                    .delete()
                    .eq(
                        "id",
                        registroId
                    )
                    .eq(
                        "codigo",
                        codigo
                    )
                    .select(
                        "id,codigo"
                    );

            if (erroExcluirRegistro) {
                throw new Error(
                    erroExcluirRegistro.message ||
                    "Não foi possível excluir o registro DDS."
                );
            }

            if (
                !Array.isArray(
                    registrosExcluidos
                ) ||
                registrosExcluidos.length === 0
            ) {
                throw new Error(
                    "O banco não confirmou a exclusão. Verifique a permissão de exclusão do usuário."
                );
            }

            const avisosLimpeza = [];

            const idsDocumentos =
                documentos
                    .map(
                        (documento) =>
                            String(
                                documento?.id ||
                                ""
                            ).trim()
                    )
                    .filter(Boolean);

            if (idsDocumentos.length > 0) {
                const {
                    error:
                        erroExcluirMetadados,
                } =
                    await supabase
                        .from("dds_documentos")
                        .delete()
                        .in(
                            "id",
                            idsDocumentos
                        );

                if (erroExcluirMetadados) {
                    avisosLimpeza.push(
                        "metadados dos PDFs: " +
                        (
                            erroExcluirMetadados.message ||
                            "falha desconhecida"
                        )
                    );
                }
            }

            const caminhosPorBucket =
                new Map();

            documentos.forEach(
                (documento) => {
                    const bucket =
                        String(
                            documento?.bucket_id ||
                            "dds-assinados"
                        ).trim() ||
                        "dds-assinados";

                    const caminho =
                        String(
                            documento?.caminho_storage ||
                            ""
                        ).trim();

                    if (!caminho) {
                        return;
                    }

                    if (
                        !caminhosPorBucket.has(
                            bucket
                        )
                    ) {
                        caminhosPorBucket.set(
                            bucket,
                            []
                        );
                    }

                    caminhosPorBucket
                        .get(bucket)
                        .push(caminho);
                }
            );

            for (
                const [
                    bucket,
                    caminhosOriginais,
                ] of caminhosPorBucket.entries()
            ) {
                const caminhos =
                    Array.from(
                        new Set(
                            caminhosOriginais
                        )
                    );

                if (caminhos.length === 0) {
                    continue;
                }

                const {
                    error:
                        erroRemoverStorage,
                } =
                    await supabase.storage
                        .from(bucket)
                        .remove(caminhos);

                if (erroRemoverStorage) {
                    avisosLimpeza.push(
                        "Storage " +
                        bucket +
                        ": " +
                        (
                            erroRemoverStorage.message ||
                            "falha desconhecida"
                        )
                    );
                }
            }

            setRegistrosDisponiveisDds(
                (registrosAtuais) =>
                    registrosAtuais.filter(
                        (registroAtual) =>
                            String(
                                registroAtual?.id ||
                                ""
                            ).trim() !==
                                registroId &&
                            String(
                                registroAtual?.codigo ||
                                ""
                            )
                                .trim()
                                .toUpperCase() !==
                                codigo
                    )
            );

            setHistoricoMensalMaoDeObraDds(
                (registrosAtuais) =>
                    (
                        Array.isArray(
                            registrosAtuais
                        )
                            ? registrosAtuais
                            : []
                    ).filter(
                        (registroAtual) =>
                            String(
                                registroAtual?.id ||
                                ""
                            ).trim() !==
                                registroId &&
                            String(
                                registroAtual?.codigo ||
                                ""
                            )
                                .trim()
                                .toUpperCase() !==
                                codigo
                    )
            );

            const codigoSelecionado =
                String(
                    codigoConferenciaDds ||
                    ""
                )
                    .trim()
                    .toUpperCase();

            const codigoRegistroCarregado =
                String(
                    registroScannerDds?.codigo ||
                    ""
                )
                    .trim()
                    .toUpperCase();

            const codigoRegistroEmitido =
                String(
                    registroDdsConferencia?.codigo ||
                    ""
                )
                    .trim()
                    .toUpperCase();

            if (
                codigoSelecionado === codigo ||
                codigoRegistroCarregado === codigo ||
                codigoRegistroEmitido === codigo
            ) {
                /*
                 * dds_limpeza_completa_registro_excluido_v1
                 *
                 * O formulário corrente e suas preferências por empresa
                 * permanecem intactos. Somente os estados pertencentes ao
                 * registro persistido que foi excluído são descartados.
                 */
                setCodigoConferenciaDds("");
                setRegistroScannerDds(null);
                setRegistroDdsConferencia(null);
                setErroScannerDds("");

                setArquivoScannerDds(null);
                setErroArquivoScannerDds("");
                setLeituraArquivoScannerDds(null);
                setErroLeituraArquivoScannerDds("");
                setMensagemDocumentoPersistidoDds(null);

                setConferenciaAssistidaDds({});
                setTemasConferenciaAssistidaDds([]);
                setParticipantesAdicionaisConferenciaDds(
                    criarParticipantesAdicionaisConferenciaDds()
                );
                setConferenciaAssistidaSalvaEmDds("");
                setErroConferenciaAssistidaDds("");

                setFechamentoConferenciaAssistidaDds(null);
                setErroFechamentoConferenciaDds("");

                setReciboFinalEmitidoEmDds("");
                setErroReciboFinalDds("");
                setCodigoReciboCopiadoDds(false);
            }

            setMensagemExclusaoRegistroDds({
                tipo:
                    avisosLimpeza.length > 0
                        ? "aviso"
                        : "sucesso",
                texto:
                    avisosLimpeza.length > 0
                        ? (
                            "DDS " +
                            codigo +
                            " excluído, mas houve aviso na limpeza: " +
                            avisosLimpeza.join(
                                " | "
                            )
                        )
                        : (
                            "DDS " +
                            codigo +
                            " e seus PDFs vinculados foram excluídos com sucesso."
                        ),
            });
        } catch (error) {
            setMensagemExclusaoRegistroDds({
                tipo: "erro",
                texto:
                    error?.message ||
                    "Não foi possível excluir o DDS selecionado.",
            });
        } finally {
            setExcluindoRegistroDdsId("");
        }
    }


    /*
     * dds_filtro_empresa_registros_v1
     *
     * Monta a relação de empresas e filtra os DDS sem alterar
     * os registros originais carregados do Supabase.
     */
    const empresasFiltroRegistrosDds = useMemo(() => {
        const empresasPorChave =
            new Map();

        registrosDisponiveisDds.forEach(
            (registro) => {
                const empresaNome =
                    String(
                        registro?.empresaNome ||
                        ""
                    ).trim();

                if (!empresaNome) {
                    return;
                }

                const chaveEmpresa =
                    empresaNome.toLocaleUpperCase(
                        "pt-BR"
                    );

                if (
                    !empresasPorChave.has(
                        chaveEmpresa
                    )
                ) {
                    empresasPorChave.set(
                        chaveEmpresa,
                        empresaNome
                    );
                }
            }
        );

        return Array.from(
            empresasPorChave.values()
        ).sort(
            (empresaA, empresaB) =>
                empresaA.localeCompare(
                    empresaB,
                    "pt-BR",
                    {
                        sensitivity:
                            "base",
                    }
                )
        );
    }, [registrosDisponiveisDds]);

    const registrosFiltradosDds = useMemo(() => {
        const empresaSelecionada =
            String(
                empresaFiltroRegistrosDds ||
                ""
            ).trim();

        if (!empresaSelecionada) {
            return registrosDisponiveisDds;
        }

        const chaveEmpresaSelecionada =
            empresaSelecionada.toLocaleUpperCase(
                "pt-BR"
            );

        return registrosDisponiveisDds.filter(
            (registro) =>
                String(
                    registro?.empresaNome ||
                    ""
                )
                    .trim()
                    .toLocaleUpperCase(
                        "pt-BR"
                    ) ===
                chaveEmpresaSelecionada
        );
    }, [
        empresaFiltroRegistrosDds,
        registrosDisponiveisDds,
    ]);

    useEffect(() => {
        if (
            !empresaFiltroRegistrosDds ||
            carregandoRegistrosDisponiveisDds
        ) {
            return;
        }

        const filtroAindaExiste =
            empresasFiltroRegistrosDds.some(
                (empresaNome) =>
                    empresaNome.toLocaleUpperCase(
                        "pt-BR"
                    ) ===
                    String(
                        empresaFiltroRegistrosDds
                    )
                        .trim()
                        .toLocaleUpperCase(
                            "pt-BR"
                        )
            );

        if (!filtroAindaExiste) {
            setEmpresaFiltroRegistrosDds(
                ""
            );
        }
    }, [
        carregandoRegistrosDisponiveisDds,
        empresaFiltroRegistrosDds,
        empresasFiltroRegistrosDds,
    ]);


    const participantesRegistroScannerDds = useMemo(() => {
        /*
         * sincronizacao_funcao_cadastro_atual_dds
         *
         * DDS aberto ou reaberto:
         * utiliza a função atual do cadastro do colaborador.
         *
         * DDS oficialmente concluído:
         * preserva o snapshot histórico registrado no fechamento.
         */
        const participantesSalvosDds =
            Array.isArray(
                registroScannerDds
                    ?.dados
                    ?.participantes
            )
                ? registroScannerDds
                    .dados
                    .participantes
                : [];

        const statusFechamentoDds =
            normalizarTextoCodigoDds(
                registroScannerDds
                    ?.dados
                    ?.conferenciaAssistida
                    ?.fechamento
                    ?.status ||
                registroScannerDds
                    ?.dados
                    ?.fechamento
                    ?.status ||
                registroScannerDds
                    ?.statusConferencia ||
                ""
            );

        if (
            statusFechamentoDds ===
            "concluida"
        ) {
            return participantesSalvosDds;
        }

        const colaboradoresAtuaisDds =
            Array.isArray(colaboradores)
                ? colaboradores
                : [];

        if (
            participantesSalvosDds.length === 0 ||
            colaboradoresAtuaisDds.length === 0
        ) {
            return participantesSalvosDds;
        }

        const obterTextoCadastroDds = (
            ...valores
        ) => {
            for (const valor of valores) {
                if (
                    valor === null ||
                    valor === undefined ||
                    typeof valor === "object"
                ) {
                    continue;
                }

                const texto =
                    String(valor).trim();

                if (texto) {
                    return texto;
                }
            }

            return "";
        };

        const normalizarChaveCadastroDds = (
            valor
        ) =>
            normalizarTextoCodigoDds(
                obterTextoCadastroDds(
                    valor
                )
            );

        const cadastrosPorCodigoDds =
            new Map();

        const cadastrosPorIdDds =
            new Map();

        const cadastrosPorNomeEmpresaDds =
            new Map();

        const cadastrosPorNomeUnicoDds =
            new Map();

        colaboradoresAtuaisDds.forEach(
            (colaborador) => {
                const nomeDds =
                    obterTextoCadastroDds(
                        colaborador?.nome,
                        colaborador?.nomeCompleto,
                        colaborador?.nome_completo,
                        colaborador?.colaborador,
                        colaborador?.nomeColaborador
                    );

                const empresaDds =
                    obterTextoCadastroDds(
                        colaborador
                            ?.empresa
                            ?.nome,
                        colaborador
                            ?.empresa
                            ?.razao_social,
                        colaborador
                            ?.empresa
                            ?.razaoSocial,
                        colaborador
                            ?.empresaExibicao,
                        colaborador
                            ?.empresa_exibicao,
                        colaborador
                            ?.empresaNome,
                        colaborador
                            ?.empresa_nome,
                        colaborador
                            ?.empresa
                    );

                const nomeNormalizadoDds =
                    normalizarChaveCadastroDds(
                        nomeDds
                    );

                const empresaNormalizadaDds =
                    normalizarChaveCadastroDds(
                        empresaDds
                    );

                const codigosDds = [
                    colaborador
                        ?.codigoFuncionario,
                    colaborador
                        ?.codigo_funcionario,
                    colaborador
                        ?.codigoSafescan,
                    colaborador
                        ?.codigoSafeScan,
                    colaborador
                        ?.codigo_safescan,
                    colaborador
                        ?.codigo,
                    colaborador
                        ?.codigo_colaborador,
                    colaborador
                        ?.codigoColaborador,
                    colaborador
                        ?.codigo_qr,
                    colaborador
                        ?.qr_codigo,
                    colaborador
                        ?.codigoQr,
                    colaborador
                        ?.matricula_esocial,
                    colaborador
                        ?.matriculaEsocial,
                    colaborador
                        ?.matricula,
                ]
                    .map(
                        normalizarChaveCadastroDds
                    )
                    .filter(Boolean);

                codigosDds.forEach(
                    (codigoDds) => {
                        if (
                            !cadastrosPorCodigoDds
                                .has(
                                    codigoDds
                                )
                        ) {
                            cadastrosPorCodigoDds
                                .set(
                                    codigoDds,
                                    colaborador
                                );
                        }
                    }
                );

                const idsDds = [
                    colaborador?.id,
                    colaborador
                        ?.colaborador_id,
                    colaborador
                        ?.colaboradorId,
                    colaborador?.token,
                ]
                    .map(
                        normalizarChaveCadastroDds
                    )
                    .filter(Boolean);

                idsDds.forEach(
                    (idDds) => {
                        if (
                            !cadastrosPorIdDds
                                .has(
                                    idDds
                                )
                        ) {
                            cadastrosPorIdDds
                                .set(
                                    idDds,
                                    colaborador
                                );
                        }
                    }
                );

                if (
                    nomeNormalizadoDds &&
                    empresaNormalizadaDds
                ) {
                    const chaveNomeEmpresaDds =
                        `${nomeNormalizadoDds}|${empresaNormalizadaDds}`;

                    if (
                        !cadastrosPorNomeEmpresaDds
                            .has(
                                chaveNomeEmpresaDds
                            )
                    ) {
                        cadastrosPorNomeEmpresaDds
                            .set(
                                chaveNomeEmpresaDds,
                                colaborador
                            );
                    }
                }

                if (nomeNormalizadoDds) {
                    if (
                        !cadastrosPorNomeUnicoDds
                            .has(
                                nomeNormalizadoDds
                            )
                    ) {
                        cadastrosPorNomeUnicoDds
                            .set(
                                nomeNormalizadoDds,
                                colaborador
                            );
                    }
                    else {
                        cadastrosPorNomeUnicoDds
                            .set(
                                nomeNormalizadoDds,
                                null
                            );
                    }
                }
            }
        );

        return participantesSalvosDds.map(
            (participante) => {
                const codigoParticipanteDds =
                    normalizarChaveCadastroDds(
                        obterTextoCadastroDds(
                            participante
                                ?.codigoSafescan,
                            participante
                                ?.codigoSafeScan,
                            participante
                                ?.codigoFuncionario,
                            participante
                                ?.codigo_funcionario,
                            participante
                                ?.codigo,
                            participante
                                ?.codigo_colaborador
                        )
                    );

                const idParticipanteDds =
                    normalizarChaveCadastroDds(
                        obterTextoCadastroDds(
                            participante
                                ?.colaboradorId,
                            participante
                                ?.colaborador_id,
                            participante
                                ?.id
                        )
                    );

                const nomeParticipanteDds =
                    normalizarChaveCadastroDds(
                        participante?.nome
                    );

                const empresaParticipanteDds =
                    normalizarChaveCadastroDds(
                        obterTextoCadastroDds(
                            participante
                                ?.empresa
                                ?.nome,
                            participante
                                ?.empresaNome,
                            participante
                                ?.empresa_nome,
                            participante
                                ?.empresa
                        )
                    );

                const chaveNomeEmpresaDds =
                    nomeParticipanteDds &&
                    empresaParticipanteDds
                        ? `${nomeParticipanteDds}|${empresaParticipanteDds}`
                        : "";

                const colaboradorAtualDds =
                    (
                        codigoParticipanteDds &&
                        cadastrosPorCodigoDds.get(
                            codigoParticipanteDds
                        )
                    ) ||
                    (
                        idParticipanteDds &&
                        cadastrosPorIdDds.get(
                            idParticipanteDds
                        )
                    ) ||
                    (
                        chaveNomeEmpresaDds &&
                        cadastrosPorNomeEmpresaDds.get(
                            chaveNomeEmpresaDds
                        )
                    ) ||
                    (
                        nomeParticipanteDds &&
                        cadastrosPorNomeUnicoDds.get(
                            nomeParticipanteDds
                        )
                    ) ||
                    null;

                if (!colaboradorAtualDds) {
                    return participante;
                }

                const funcaoAtualDds =
                    obterTextoCadastroDds(
                        colaboradorAtualDds
                            ?.funcao
                            ?.nome,
                        colaboradorAtualDds
                            ?.funcao
                            ?.descricao,
                        colaboradorAtualDds
                            ?.cargo
                            ?.nome,
                        colaboradorAtualDds
                            ?.cargo
                            ?.descricao,
                        colaboradorAtualDds
                            ?.funcao,
                        colaboradorAtualDds
                            ?.funcaoNome,
                        colaboradorAtualDds
                            ?.funcao_nome,
                        colaboradorAtualDds
                            ?.funcaoDescricao,
                        colaboradorAtualDds
                            ?.funcao_descricao,
                        colaboradorAtualDds
                            ?.cargo,
                        colaboradorAtualDds
                            ?.cargoNome,
                        colaboradorAtualDds
                            ?.cargo_nome,
                        colaboradorAtualDds
                            ?.cargoDescricao,
                        colaboradorAtualDds
                            ?.cargo_descricao
                    );

                const funcaoSalvaDds =
                    obterTextoCadastroDds(
                        participante?.funcao
                    );

                if (
                    !funcaoAtualDds ||
                    normalizarChaveCadastroDds(
                        funcaoAtualDds
                    ) ===
                    normalizarChaveCadastroDds(
                        funcaoSalvaDds
                    )
                ) {
                    return participante;
                }

                return {
                    ...participante,
                    funcao: funcaoAtualDds,
                };
            }
        );
    }, [
        colaboradores,
        registroScannerDds,
    ]);

    const colaboradoresCadastradosConferenciaDds = useMemo(() => {
        const listaColaboradores = Array.isArray(colaboradores)
            ? colaboradores
            : [];

        const codigosJaIncluidosDds = new Set(
            participantesRegistroScannerDds
                .map((participante) =>
                    normalizarTextoCodigoDds(
                        obterValorTextoDds(
                            participante?.codigoSafescan,
                            participante?.codigoSafeScan,
                            participante?.codigoFuncionario,
                            participante?.codigo_funcionario,
                            participante?.codigo
                        )
                    )
                )
                .filter(Boolean)
        );

        const nomesEmpresasJaIncluidosDds = new Set(
            participantesRegistroScannerDds
                .map((participante) => {
                    const nome = normalizarTextoCodigoDds(
                        participante?.nome
                    );

                    const empresa = normalizarTextoCodigoDds(
                        obterValorTextoDds(
                            participante?.empresa,
                            participante?.empresaNome,
                            participante?.empresa_nome
                        )
                    );

                    return nome
                        ? `${nome}|${empresa}`
                        : "";
                })
                .filter(Boolean)
        );

        const cadastrosPorChave = new Map();

        listaColaboradores.forEach(
            (colaborador, indice) => {
                const nome = obterValorTextoDds(
                    colaborador?.nome,
                    colaborador?.nomeCompleto,
                    colaborador?.nome_completo,
                    colaborador?.colaborador,
                    colaborador?.nomeColaborador
                );

                if (!nome) return;

                const funcao = obterValorTextoDds(
                    colaborador?.funcao,
                    colaborador?.funcaoNome,
                    colaborador?.funcao_nome,
                    colaborador?.cargo,
                    colaborador?.cargoNome,
                    colaborador?.cargo_nome
                );

                const empresa = obterValorTextoDds(
                    colaborador?.empresaExibicao,
                    colaborador?.empresa_exibicao,
                    colaborador?.empresaNome,
                    colaborador?.empresa_nome,
                    colaborador?.empresa?.nome,
                    colaborador?.empresa
                );

                const colaboradorId =
                    obterValorTextoDds(
                        colaborador?.id,
                        colaborador?.colaborador_id,
                        colaborador?.colaboradorId,
                        colaborador?.token
                    );

                const codigoSafescan =
                    obterValorTextoDds(
                        colaborador?.codigoFuncionario,
                        colaborador?.codigo_funcionario,
                        colaborador?.codigoSafescan,
                        colaborador?.codigoSafeScan,
                        colaborador?.codigo_safescan,
                        colaborador?.codigo,
                        colaborador?.codigo_colaborador,
                        colaborador?.codigoColaborador,
                        colaborador?.codigo_qr,
                        colaborador?.qr_codigo,
                        colaborador?.codigoQr,
                        colaborador?.matricula_esocial,
                        colaborador?.matriculaEsocial,
                        colaborador?.matricula
                    );

                const codigoNormalizado =
                    normalizarTextoCodigoDds(
                        codigoSafescan
                    );

                const nomeEmpresaNormalizado =
                    `${normalizarTextoCodigoDds(nome)}|${normalizarTextoCodigoDds(empresa)}`;

                const jaIncluidoNoDds =
                    (
                        codigoNormalizado &&
                        codigosJaIncluidosDds.has(
                            codigoNormalizado
                        )
                    ) ||
                    nomesEmpresasJaIncluidosDds.has(
                        nomeEmpresaNormalizado
                    );

                if (jaIncluidoNoDds) return;

                const chaveCadastro =
                    codigoSafescan ||
                    colaboradorId ||
                    `cadastro-dds-${indice}-${normalizarTextoCodigoDds(nome)}`;

                if (
                    !cadastrosPorChave.has(
                        chaveCadastro
                    )
                ) {
                    cadastrosPorChave.set(
                        chaveCadastro,
                        {
                            chaveCadastro,
                            colaboradorId,
                            codigoSafescan,
                            nome,
                            funcao,
                            empresa,
                        }
                    );
                }
            }
        );

        return Array.from(
            cadastrosPorChave.values()
        ).sort((a, b) =>
            a.nome.localeCompare(
                b.nome,
                "pt-BR",
                {
                    sensitivity: "base",
                }
            )
        );
    }, [
        colaboradores,
        participantesRegistroScannerDds,
    ]);

    const funcoesCadastradasConferenciaDds = useMemo(() => {
        const funcoesPorChave = new Map();

        colaboradoresCadastradosConferenciaDds.forEach(
            (colaborador) => {
                const funcao = String(
                    colaborador?.funcao || ""
                ).trim();

                const chave =
                    normalizarTextoCodigoDds(
                        funcao
                    );

                if (
                    funcao &&
                    chave &&
                    !funcoesPorChave.has(chave)
                ) {
                    funcoesPorChave.set(
                        chave,
                        funcao
                    );
                }
            }
        );

        return Array.from(
            funcoesPorChave.values()
        ).sort((a, b) =>
            a.localeCompare(
                b,
                "pt-BR",
                {
                    sensitivity: "base",
                }
            )
        );
    }, [
        colaboradoresCadastradosConferenciaDds,
    ]);

    const empresasCadastradasConferenciaDds = useMemo(() => {
        const empresasPorChave = new Map();

        const nomesEmpresas = [
            ...empresasDds.map(
                (empresa) =>
                    obterNomeEmpresaObjetoDds(
                        empresa
                    )
            ),
            ...colaboradoresCadastradosConferenciaDds.map(
                (colaborador) =>
                    colaborador?.empresa || ""
            ),
        ];

        nomesEmpresas.forEach((empresa) => {
            const nomeEmpresa =
                String(empresa || "").trim();

            const chave =
                normalizarTextoCodigoDds(
                    nomeEmpresa
                );

            if (
                nomeEmpresa &&
                chave &&
                !empresasPorChave.has(chave)
            ) {
                empresasPorChave.set(
                    chave,
                    nomeEmpresa
                );
            }
        });

        return Array.from(
            empresasPorChave.values()
        ).sort((a, b) =>
            a.localeCompare(
                b,
                "pt-BR",
                {
                    sensitivity: "base",
                }
            )
        );
    }, [
        colaboradoresCadastradosConferenciaDds,
        empresasDds,
    ]);


    const {
        buscarRegistroScannerDds,
        selecionarArquivoScannerDds,
        limparArquivoScannerDds,
        executarLeituraArquivoScannerDds,
        analisarDocumentoPersistidoDds,
        excluirDocumentoPersistidoDds,
    } = criarControladorScannerDds({
        arquivoScannerDds,
        carregandoLeituraArquivoScannerDds,
        carregandoScannerDds,
        carregarRegistroDdsPorCodigo,
        codigoConferenciaDds,
        dadosDds,
        executarLeituraDdsLocal,
        participantesRegistroScannerDds,
        registroScannerDds,
        setArquivoScannerDds,
        setCarregandoLeituraArquivoScannerDds,
        setCarregandoScannerDds,
        setCodigoConferenciaDds,
        setErroArquivoScannerDds,
        setErroLeituraArquivoScannerDds,
        setErroScannerDds,
        setLeituraArquivoScannerDds,
        setRegistroScannerDds,
        excluindoDocumentoPersistidoDds,
        setExcluindoDocumentoPersistidoDds,
        setMensagemDocumentoPersistidoDds,
        supabase,
    });

    const {
        avisosLeituraArquivoScannerDds,
        diagnosticoEstruturalScannerDds,
        diasAtivosConferenciaAssistidaDds,
        diasConferenciaAssistidaDds,
        diasRegistroScannerDds,
        estatisticasTemasConferenciaAssistidaDds,
        linhasLeituraArquivoScannerDds,
        participantesAdicionaisAtivosConferenciaDds,
        participantesConferenciaAssistidaDds,
        preConferenciaParticipantesScannerDds,
        qualidadeLeituraArquivoScannerDds,
        resumoArquivoScannerDds,
        textoPreviaArquivoScannerDds,
    } = useDdsScannerConferenciaDerivados({
        arquivoScannerDds,
        codigoConferenciaDds,
        dadosDds,
        leituraArquivoScannerDds,
        participantesAdicionaisConferenciaDds,
        participantesRegistroScannerDds,
        registroScannerDds,
        temasConferenciaAssistidaDds,
    });

    const obterChaveFrequenciaAssistidaDds = (numero, diaRef) => {
        const chaveDia = typeof diaRef === "object" && diaRef !== null
            ? (diaRef.chaveAssistida || diaRef.indiceAssistido || diaRef.indice || diaRef.data || diaRef.nome || diaRef.curto)
            : diaRef;

        return `${numero}-${chaveDia}`;
    };

    const obterStatusFrequenciaAssistidaDds = (numero, diaRef) => (
        conferenciaAssistidaDds[obterChaveFrequenciaAssistidaDds(numero, diaRef)] || "manual"
    );

    const sugestoesFrequenciaDds = useMemo(() => montarSugestoesFrequenciaDds({
        participantes: participantesConferenciaAssistidaDds,
        dias: diasAtivosConferenciaAssistidaDds,
        marcacoes: Array.isArray(leituraArquivoScannerDds?.marcacoesDdsDias)
            ? leituraArquivoScannerDds.marcacoesDdsDias
            : [],
    }), [diasAtivosConferenciaAssistidaDds, leituraArquivoScannerDds, participantesConferenciaAssistidaDds]);

    const sugestoesTemaResponsavelDds = useMemo(() => extrairSugestoesTemaResponsavelDds({
        linhasOcr: Array.isArray(leituraArquivoScannerDds?.linhasOcr) ? leituraArquivoScannerDds.linhasOcr : [],
        texto: leituraArquivoScannerDds?.textoExtraido || leituraArquivoScannerDds?.textoPrevia || "",
        dias: diasConferenciaAssistidaDds,
    }), [diasConferenciaAssistidaDds, leituraArquivoScannerDds]);

    const estatisticasConferenciaAssistidaDds = useMemo(() => {
        const dias = diasAtivosConferenciaAssistidaDds.map((dia) => ({
            ...dia,
            presentes: 0,
            ausentes: 0,
            manuais: 0,
            homemDia: 0,
        }));

        const cadastrados = {
            participantes: 0,
            presencas: 0,
            ausencias: 0,
            manuais: 0,
            homemDia: 0,
            semanaCompleta: 0,
        };

        const adicionais = {
            participantes: 0,
            presencas: 0,
            ausencias: 0,
            manuais: 0,
            homemDia: 0,
            semanaCompleta: 0,
        };

        let presencas = 0;
        let ausencias = 0;
        let manuais = 0;
        let homemDia = 0;
        let funcionariosSemanaCompleta = 0;

        for (
            const participante of
            participantesConferenciaAssistidaDds
        ) {
            const numero = Number(
                participante?.numero || 0
            );

            if (!numero) continue;

            const origem = String(
                participante?.origem || ""
            ).trim().toLowerCase();

            const tipo = String(
                participante?.tipo || ""
            ).trim().toLowerCase();

            const origemBaseDds = String(
                participante?.origemBaseDds || ""
            ).trim().toLowerCase();

            const participanteComplementar =
                origemBaseDds === "complementar" ||
                origem === "adicional" ||
                origem === "cadastro_adicional" ||
                tipo === "visitante";

            const categoria = participanteComplementar
                ? adicionais
                : cadastrados;

            categoria.participantes += 1;

            let todosDiasPresentes =
                dias.length > 0;

            dias.forEach((dia, indiceDia) => {
                const status =
                    conferenciaAssistidaDds[
                        obterChaveFrequenciaAssistidaDds(
                            numero,
                            dia
                        )
                    ] || "manual";

                if (status === "presente") {
                    dias[indiceDia].presentes += 1;
                    dias[indiceDia].homemDia += 1;

                    presencas += 1;
                    homemDia += 1;

                    categoria.presencas += 1;
                    categoria.homemDia += 1;
                } else if (status === "ausente") {
                    dias[indiceDia].ausentes += 1;

                    ausencias += 1;
                    categoria.ausencias += 1;
                    todosDiasPresentes = false;
                } else {
                    dias[indiceDia].manuais += 1;

                    manuais += 1;
                    categoria.manuais += 1;
                    todosDiasPresentes = false;
                }
            });

            if (todosDiasPresentes) {
                funcionariosSemanaCompleta += 1;
                categoria.semanaCompleta += 1;
            }
        }

        return {
            dias,
            participantes:
                participantesConferenciaAssistidaDds.length,
            participantesCadastrados:
                cadastrados.participantes,
            participantesAdicionais:
                adicionais.participantes,
            presencas,
            presencasCadastrados:
                cadastrados.presencas,
            presencasAdicionais:
                adicionais.presencas,
            ausencias,
            ausenciasCadastrados:
                cadastrados.ausencias,
            ausenciasAdicionais:
                adicionais.ausencias,
            manuais,
            manuaisCadastrados:
                cadastrados.manuais,
            manuaisAdicionais:
                adicionais.manuais,
            homemDia,
            homemDiaCadastrados:
                cadastrados.homemDia,
            homemDiaAdicionais:
                adicionais.homemDia,
            funcionariosSemanaCompleta,
            semanaCompletaCadastrados:
                cadastrados.semanaCompleta,
            semanaCompletaAdicionais:
                adicionais.semanaCompleta,
        };
    }, [
        conferenciaAssistidaDds,
        diasAtivosConferenciaAssistidaDds,
        participantesConferenciaAssistidaDds,
    ]);

    const conferenciaOficialConcluidaDds = fechamentoConferenciaAssistidaDds?.status === "concluida";

    const indicadoresJornadaResultadoOficialDds = useMemo(() => {
        const diasFrequencia =
            Array.isArray(
                estatisticasConferenciaAssistidaDds
                    ?.dias
            )
                ? estatisticasConferenciaAssistidaDds
                    .dias
                : [];

        const obterChaveDiaJornadaDds = (
            dia = {}
        ) =>
            String(
                dia?.data ||
                dia?.chave ||
                dia?.id ||
                dia?.curto ||
                dia?.nome ||
                ""
            )
                .trim()
                .toLowerCase();

        let minutosTotaisTrabalhados = 0;
        let minutosTotaisExtras = 0;

        diasAtivosConferenciaAssistidaDds.forEach(
            (dia, indiceDia) => {
                const chaveDia =
                    obterChaveDiaJornadaDds(
                        dia
                    );

                const resumoDia =
                    diasFrequencia.find(
                        (item) =>
                            chaveDia &&
                            obterChaveDiaJornadaDds(
                                item
                            ) === chaveDia
                    ) ||
                    diasFrequencia[indiceDia] ||
                    {};

                const presentesDia =
                    Math.max(
                        0,
                        Number(
                            resumoDia?.presentes ??
                            resumoDia?.presencas ??
                            resumoDia
                                ?.quantidadePresentes ??
                            0
                        )
                    );

                const minutosTrabalhadosDia =
                    Math.max(
                        0,
                        Number(
                            dia?.minutosTrabalhados ||
                            0
                        )
                    );

                const minutosExtrasDia =
                    Math.max(
                        0,
                        Number(
                            dia?.minutosExtras ||
                            0
                        )
                    );

                minutosTotaisTrabalhados +=
                    presentesDia *
                    minutosTrabalhadosDia;

                minutosTotaisExtras +=
                    presentesDia *
                    minutosExtrasDia;
            }
        );

        const resumoOficial =
            conferenciaOficialConcluidaDds
                ? fechamentoConferenciaAssistidaDds
                    ?.resumo
                : null;

        const presencas =
            Math.max(
                0,
                Number(
                    resumoOficial?.presencas ??
                    estatisticasConferenciaAssistidaDds
                        ?.presencas ??
                    0
                )
            );

        const ausencias =
            Math.max(
                0,
                Number(
                    resumoOficial?.ausencias ??
                    estatisticasConferenciaAssistidaDds
                        ?.ausencias ??
                    0
                )
            );

        const baseAbsenteismo =
            presencas +
            ausencias;

        const percentualAbsenteismo =
            baseAbsenteismo > 0
                ? (
                    ausencias /
                    baseAbsenteismo
                ) * 100
                : 0;

        return {
            horasTotaisTrabalhadas:
                Number(
                    (
                        minutosTotaisTrabalhados /
                        60
                    ).toFixed(2)
                ),
            horasExtras:
                Number(
                    (
                        minutosTotaisExtras /
                        60
                    ).toFixed(2)
                ),
            absenteismo:
                Number(
                    percentualAbsenteismo.toFixed(
                        2
                    )
                ),
        };
    }, [
        conferenciaOficialConcluidaDds,
        diasAtivosConferenciaAssistidaDds,
        estatisticasConferenciaAssistidaDds,
        fechamentoConferenciaAssistidaDds,
    ]);


    const {
        atualizarTemaConferenciaAssistidaDds,
        usarSugestaoOcrTemaConferenciaAssistidaDds,
        usarPlanejamentoTemaConferenciaAssistidaDds,
        alternarSemAtividadeConferenciaAssistidaDds,
        atualizarParticipanteAdicionalConferenciaDds,
        limparParticipanteAdicionalConferenciaDds,
        definirStatusFrequenciaAssistidaDds,
        marcarSemanaCompletaAssistidaDds,
        marcarSemanaAusenteAssistidaDds,
        limparParticipanteConferenciaAssistidaDds,
        limparConferenciaAssistidaDds,
        salvarConferenciaAssistidaDds,
        concluirConferenciaAssistidaDds,
        reabrirConferenciaAssistidaDds,
    } = criarControladorConferenciaAssistidaDds({
        codigoConferenciaDds,
        conferenciaAssistidaDds,
        conferenciaOficialConcluidaDds,
        criarParticipantesAdicionaisConferenciaDds,
        dadosDds,
        diasAtivosConferenciaAssistidaDds,
        diasConferenciaAssistidaDds,
        diasRegistroScannerDds,
        estatisticasConferenciaAssistidaDds,
        estatisticasTemasConferenciaAssistidaDds,
        fechamentoConferenciaAssistidaDds,
        obterChaveFrequenciaAssistidaDds,
        participantesAdicionaisConferenciaDds,
        participantesConferenciaAssistidaDds,
        participantesRegistroScannerDds,
        registroScannerDds,
        salvandoConferenciaAssistidaDds,
        salvandoFechamentoConferenciaDds,
        salvarRegistroDds,
        arquivoScannerDds,
        leituraArquivoScannerDds,
        registrarDocumentoDdsAssinado,
        sincronizarConferenciaEstruturadaDds,
        setConferenciaAssistidaDds,
        setConferenciaAssistidaSalvaEmDds,
        setErroConferenciaAssistidaDds,
        setErroFechamentoConferenciaDds,
        setErroReciboFinalDds,
        setFechamentoConferenciaAssistidaDds,
        setParticipantesAdicionaisConferenciaDds,
        setReciboFinalEmitidoEmDds,
        setRegistroScannerDds,
        setSalvandoConferenciaAssistidaDds,
        setSalvandoFechamentoConferenciaDds,
        setTemasConferenciaAssistidaDds,
        supabase,
        temasConferenciaAssistidaDds,
    });

    function selecionarParticipanteCadastradoConferenciaDds(
        indice,
        chaveCadastro
    ) {
        if (conferenciaOficialConcluidaDds) {
            return;
        }

        const chaveSegura =
            String(chaveCadastro || "").trim();

        if (!chaveSegura) {
            setParticipantesAdicionaisConferenciaDds(
                (atuais) =>
                    atuais.map(
                        (
                            participante,
                            indiceAtual
                        ) =>
                            indiceAtual === indice
                                ? {
                                    ...participante,
                                    colaboradorCadastroChave: "",
                                    colaboradorId: "",
                                    codigoSafescan: "",
                                    origem: "adicional",
                                    tipo: "visitante",
                                }
                                : participante
                    )
            );

            return;
        }

        const colaboradorSelecionado =
            colaboradoresCadastradosConferenciaDds.find(
                (colaborador) =>
                    colaborador.chaveCadastro ===
                    chaveSegura
            );

        if (!colaboradorSelecionado) {
            return;
        }

        limparParticipanteAdicionalConferenciaDds(
            indice
        );

        setParticipantesAdicionaisConferenciaDds(
            (atuais) =>
                atuais.map(
                    (
                        participante,
                        indiceAtual
                    ) =>
                        indiceAtual === indice
                            ? {
                                ...participante,
                                colaboradorCadastroChave:
                                    colaboradorSelecionado.chaveCadastro,
                                colaboradorId:
                                    colaboradorSelecionado.colaboradorId ||
                                    "",
                                codigoSafescan:
                                    colaboradorSelecionado.codigoSafescan ||
                                    "",
                                nome:
                                    colaboradorSelecionado.nome ||
                                    "",
                                funcao:
                                    colaboradorSelecionado.funcao ||
                                    "",
                                empresa:
                                    colaboradorSelecionado.empresa ||
                                    "",
                                origem:
                                    "cadastro_adicional",
                                tipo:
                                    "colaborador",
                                status:
                                    "manual",
                            }
                            : participante
                )
        );
    }

    useEffect(() => {
        if (conferenciaOficialConcluidaDds) {
            return;
        }

        if (
            participantesConferenciaAssistidaDds.length === 0 ||
            diasAtivosConferenciaAssistidaDds.length === 0
        ) {
            return;
        }

        setConferenciaAssistidaDds((estadoAtual) => {
            const estadoSeguro =
                estadoAtual &&
                typeof estadoAtual === "object"
                    ? estadoAtual
                    : {};

            const proximoEstado = {
                ...estadoSeguro,
            };

            let possuiAlteracao = false;

            participantesConferenciaAssistidaDds.forEach(
                (participante) => {
                    const numero = Number(
                        participante?.numero || 0
                    );

                    if (!numero) return;

                    diasAtivosConferenciaAssistidaDds.forEach(
                        (dia) => {
                            const chave =
                                obterChaveFrequenciaAssistidaDds(
                                    numero,
                                    dia
                                );

                            /*
                             * preenchimento_automatico_confianca_92
                             *
                             * Nunca substitui uma decisão já registrada,
                             * inclusive uma escolha manual representada por ?.
                             */
                            if (
                                Object.prototype.hasOwnProperty.call(
                                    proximoEstado,
                                    chave
                                )
                            ) {
                                return;
                            }

                            const sugestao =
                                sugestoesFrequenciaDds?.[
                                    obterChaveSugestaoFrequenciaDds(
                                        numero,
                                        dia
                                    )
                                ];

                            const statusSugerido =
                                String(
                                    sugestao?.sugestao || ""
                                )
                                    .trim()
                                    .toLowerCase();

                            const confiancaBruta =
                                Number(
                                    sugestao?.confianca || 0
                                );

                            const confiancaPercentual =
                                confiancaBruta > 0 &&
                                confiancaBruta <= 1
                                    ? confiancaBruta * 100
                                    : confiancaBruta;

                            const possuiSugestaoObjetiva =
                                statusSugerido === "presente" ||
                                statusSugerido === "ausente";

                            const possuiConfiancaMinima =
                                Number.isFinite(
                                    confiancaPercentual
                                ) &&
                                confiancaPercentual >= 92;

                            const possuiConflito =
                                sugestao?.prioridade === "alta" ||
                                sugestao?.requerConferenciaManual === true;

                            if (
                                !possuiSugestaoObjetiva ||
                                !possuiConfiancaMinima ||
                                possuiConflito
                            ) {
                                return;
                            }

                            proximoEstado[chave] =
                                statusSugerido;

                            possuiAlteracao = true;
                        }
                    );
                }
            );

            return possuiAlteracao
                ? proximoEstado
                : estadoAtual;
        });
    }, [
        conferenciaOficialConcluidaDds,
        diasAtivosConferenciaAssistidaDds,
        participantesConferenciaAssistidaDds,
        sugestoesFrequenciaDds,
    ]);

    // Restaurar Conferência Assistida salva no JSON dados.conferenciaAssistida.
    const {
        resultadoFinalScannerDds,
    } = useDdsScannerResultadoFinal({
        arquivoScannerDds,
        criarParticipantesAdicionaisConferenciaDds,
        diagnosticoEstruturalScannerDds,
        diasDds,
        diasRegistroScannerDds,
        leituraArquivoScannerDds,
        participantesRegistroScannerDds,
        preConferenciaParticipantesScannerDds,
        qualidadeLeituraArquivoScannerDds,
        registroScannerDds,
        setConferenciaAssistidaDds,
        setConferenciaAssistidaSalvaEmDds,
        setErroConferenciaAssistidaDds,
        setErroFechamentoConferenciaDds,
        setErroReciboFinalDds,
        setFechamentoConferenciaAssistidaDds,
        setParticipantesAdicionaisConferenciaDds,
        setReciboFinalEmitidoEmDds,
        setTemasConferenciaAssistidaDds,
    });

    const obraSetorFoiSalvaParaEmpresaDds = empresaSelecionadaChaveDds
        ? Object.prototype.hasOwnProperty.call(obrasSetorPorEmpresaDds || {}, empresaSelecionadaChaveDds)
        : false;

    const obraSetorSalvaEmpresaDds = obraSetorFoiSalvaParaEmpresaDds
        ? String(obrasSetorPorEmpresaDds?.[empresaSelecionadaChaveDds] || "")
        : "";

    const valorObraSetorDds = obraSetorFoiSalvaParaEmpresaDds
        ? obraSetorSalvaEmpresaDds
        : String(dadosDds.obraSetor || "");

    const fiscalIdealizaFoiSalvoParaEmpresaDds = empresaSelecionadaChaveDds
        ? Object.prototype.hasOwnProperty.call(fiscalIdealizaPorEmpresaDds || {}, empresaSelecionadaChaveDds)
        : false;

    const fiscalIdealizaSalvoEmpresaDds = fiscalIdealizaFoiSalvoParaEmpresaDds
        ? String(fiscalIdealizaPorEmpresaDds?.[empresaSelecionadaChaveDds] || "")
        : "";

    const valorFiscalIdealizaDds = fiscalIdealizaFoiSalvoParaEmpresaDds
        ? fiscalIdealizaSalvoEmpresaDds
        : String(dadosDds.fiscalIdealiza || "");

    useEffect(() => {
        setDadosDds({
            ...dadosDdsAutomaticos,
            obraSetor: obraSetorFoiSalvaParaEmpresaDds
                ? obraSetorSalvaEmpresaDds
                : dadosDdsAutomaticos.obraSetor,
            fiscalIdealiza: fiscalIdealizaFoiSalvoParaEmpresaDds
                ? fiscalIdealizaSalvoEmpresaDds
                : dadosDdsAutomaticos.fiscalIdealiza,
        });
    }, [
        dadosDdsAutomaticos,
        obraSetorFoiSalvaParaEmpresaDds,
        obraSetorSalvaEmpresaDds,
        fiscalIdealizaFoiSalvoParaEmpresaDds,
        fiscalIdealizaSalvoEmpresaDds,
    ]);

    const {
        aplicarObraCadastradaDds,
        atualizarCampoDadosDds,
    } = criarControladorDadosDds({
        empresaSelecionadaChaveDds,
        obrasEmpresaSelecionadaDds,
        obterFiscalObraEmpresaDds,
        obterIdObraEmpresaDds,
        obterLiderObraEmpresaDds,
        obterNomeObraEmpresaDds,
        salvarFiscalIdealizaDdsPorEmpresa,
        salvarObrasSetorDdsPorEmpresa,
        setDadosDds,
        setFiscalIdealizaPorEmpresaDds,
        setObraSelecionadaIdDds,
        setObrasSetorPorEmpresaDds,
    });

    const chaveOrientacoesDds = useMemo(() => criarChaveTemasDdsLocal({
        codigo: dadosDds.codigo,
    }), [dadosDds.codigo]);

    useEffect(() => {
        const orientacoesSalvas = carregarOrientacoesDdsLocal(chaveOrientacoesDds);

        setOrientacoesDdsEditaveis(orientacoesSalvas || criarOrientacoesPadraoDds());
        setChaveOrientacoesDdsCarregada(chaveOrientacoesDds);
    }, [chaveOrientacoesDds]);

    useEffect(() => {
        if (!chaveOrientacoesDds || chaveOrientacoesDdsCarregada !== chaveOrientacoesDds) return;

        salvarOrientacoesDdsLocal(chaveOrientacoesDds, orientacoesDdsEditaveis);
    }, [chaveOrientacoesDds, chaveOrientacoesDdsCarregada, orientacoesDdsEditaveis]);

    function atualizarOrientacaoDds(indiceOrientacao, valor) {
        setOrientacoesDdsEditaveis((orientacoesAtuais) => {
            const atualizadas = normalizarOrientacoesDdsLocal(orientacoesAtuais);

            atualizadas[indiceOrientacao] = valor;

            return atualizadas;
        });
    }

    function restaurarOrientacoesPadraoDds() {
        setOrientacoesDdsEditaveis(criarOrientacoesPadraoDds());
    }
    const chaveRecadosDds = useMemo(() => criarChaveTemasDdsLocal({
        codigo: dadosDds.codigo,
    }), [dadosDds.codigo]);

    useEffect(() => {
        const recadosSalvos = carregarRecadosDdsLocal(chaveRecadosDds);

        setRecadosDdsEditaveis(recadosSalvos);
        setChaveRecadosDdsCarregada(chaveRecadosDds);
    }, [chaveRecadosDds]);

    useEffect(() => {
        if (!chaveRecadosDds || chaveRecadosDdsCarregada !== chaveRecadosDds) return;

        salvarRecadosDdsLocal(chaveRecadosDds, recadosDdsEditaveis);
    }, [chaveRecadosDds, chaveRecadosDdsCarregada, recadosDdsEditaveis]);
    const chaveTemasDds = useMemo(() => criarChaveTemasDdsLocal({
        codigo: dadosDds.codigo,
    }), [dadosDds.codigo]);

    const temasRegistroAtualDds = useMemo(() => {
        const codigoAtual = String(dadosDds.codigo || "").trim();

        if (!codigoAtual) return null;

        const registroCompativel = [
            registroDdsConferencia,
            registroScannerDds,
        ].find((registro) => (
            String(registro?.codigo || "").trim() === codigoAtual
        ));

        const diasSalvos = registroCompativel?.dados?.diasSemana;

        return Array.isArray(diasSalvos)
            ? normalizarTemasDdsEditaveis(diasSalvos)
            : null;
    }, [
        dadosDds.codigo,
        registroDdsConferencia,
        registroScannerDds,
    ]);

    useEffect(() => {
        if (!chaveTemasDds) return;

        const temasLocais = carregarTemasDdsLocal(chaveTemasDds);
        const temasOrigem =
            temasRegistroAtualDds ||
            temasLocais ||
            criarTemasEditaveisDds();

        setTemasDdsEditaveis(
            normalizarTemasDdsEditaveis(temasOrigem)
        );
        setChaveTemasDdsCarregada(chaveTemasDds);
    }, [
        chaveTemasDds,
        temasRegistroAtualDds,
    ]);

    useEffect(() => {
        if (!chaveTemasDds || chaveTemasDdsCarregada !== chaveTemasDds) return;

        salvarTemasDdsLocal(chaveTemasDds, temasDdsEditaveis);
    }, [chaveTemasDds, chaveTemasDdsCarregada, temasDdsEditaveis]);
    const diasSemanaComTemasDds = useMemo(() => (
        diasSemanaDds.map((dia, indice) => {
            const temaEditavel = temasDdsEditaveis[indice] || {};
            const temaFinal = String(temaEditavel.tema ?? "").trim();
            const responsavelFinal = String(temaEditavel.responsavel ?? "").trim();
            const temaNormalizado = normalizarTextoTemaDds(temaFinal);
            const semAtividade = temaNormalizado === "NAO HOUVE ATIVIDADES";

            return {
                ...dia,
                tema: temaFinal,
                responsavel: responsavelFinal,
                semAtividade,
            };
        })
    ), [diasSemanaDds, temasDdsEditaveis]);
    const {
        alternarDiaSemAtividadeDds,
        aplicarResponsavelGeralTemasDds,
        atualizarTemaDiaDds,
        limparResponsaveisTemasDds,
    } = criarControladorTemasDds({
        criarTemasEditaveisDds,
        dadosDds,
        normalizarTemasDdsEditaveis,
        normalizarTextoTemaDds,
        setTemasDdsEditaveis,
    });

    const aniversariantesSemanaDds = useMemo(() => montarAniversariantesSemanaDds({
        colaboradores: colaboradoresEmpresaDds,
        inicioSemana: inicioSemanaDds,
        fimSemana: fimSemanaDds,
    }), [colaboradoresEmpresaDds, inicioSemanaDds, fimSemanaDds]);
    const participantesSistemaDds = useMemo(
        () => normalizarParticipantesDdsSistema(colaboradoresEmpresaDds),
        [colaboradoresEmpresaDds]
    );
    const {
        primeiraFolhaParticipantes,
        folhasContinuacaoDds,
    } = useMemo(
        () =>
            montarFolhasDdsComLinhasComplementares(
                participantesSistemaDds,
                LIMITE_PARTICIPANTES_PRIMEIRA_FOLHA_DDS,
                LIMITE_PARTICIPANTES_FOLHA_CONTINUACAO_DDS,
                QUANTIDADE_LINHAS_COMPLEMENTARES_DDS
            ),
        [participantesSistemaDds]
    );
    const totalFolhasDds = Math.max(1, 1 + folhasContinuacaoDds.length);

    const {
        resultadoFinalApresentacaoDds,
        resumoControleMaoDeObraDds,
        relatorioIndicadoresSstDds,
    } = useDdsResultadoApresentacaoDerivados({
        conferenciaAssistidaDds,
        dadosDds,
        diasAtivosConferenciaAssistidaDds,
        diasConferenciaAssistidaDds,
        estatisticasConferenciaAssistidaDds,
        estatisticasTemasConferenciaAssistidaDds,
        fechamentoConferenciaAssistidaDds,
        participantesConferenciaAssistidaDds,
        registroScannerDds,
        resultadoFinalScannerDds,
    });

    const registroHistoricoMensalConcluidoDds = (registro) => {
        const status = String(
            registro?.dados?.conferenciaAssistida?.fechamento?.status ||
            registro?.dados?.fechamento?.status ||
            registro?.statusConferencia ||
            ""
        ).trim().toLowerCase();

        return status === "concluida";
    };

    const {
        reciboConferenciaFinalDds,
        resumoHistoricoMensalMaoDeObraDds,
    } = useDdsReciboHistoricoDerivados({
        codigoConferenciaDds,
        conferenciaOficialConcluidaDds,
        dadosDds,
        estatisticasConferenciaAssistidaDds,
        fechamentoConferenciaAssistidaDds,
        historicoMensalMaoDeObraDds,
        registroHistoricoMensalConcluidoDds,
        registroScannerDds,
        resultadoFinalApresentacaoDds,
    });


    const {
        abrirConsultaPublicaReciboDds,
        copiarCodigoReciboDds,
        imprimirReciboConferenciaDds,
    } = criarControladorReciboDds({
        codigoConferenciaDds,
        dadosDds,
        dashboardHeroSstDds,
        reciboConferenciaFinalDds,
        reciboConferenciaFinalRef,
        registroScannerDds,
        salvarRegistroDds,
        setCodigoReciboCopiadoDds,
        setErroReciboFinalDds,
        setReciboFinalEmitidoEmDds,
        setRegistroScannerDds,
        setSalvandoReciboFinalDds,
        supabase,
    });

    const historicoDds = useMemo(() => {
        const eventos = [];
        const dadosRegistro = registroScannerDds?.dados || {};

        const codigo = registroScannerDds?.codigo || codigoConferenciaDds || dadosDds.codigo || "";
        const geradoEm = registroScannerDds?.geradoEm || registroScannerDds?.created_at || dadosRegistro.geradoEm || dadosRegistro.created_at || dadosDds.geradoEm || "";

        if (codigo || geradoEm) {
            eventos.push({
                titulo: "DDS gerado",
                detalhe: codigo ? `Código ${codigo}` : "Registro inicial criado.",
                data: geradoEm,
                status: "ok",
            });
        }

        if (leituraArquivoScannerDds) {
            const linhas = Array.isArray(leituraArquivoScannerDds?.linhas) ? leituraArquivoScannerDds.linhas.length : 0;
            const paginas = Number(leituraArquivoScannerDds?.paginas || leituraArquivoScannerDds?.totalPaginas || 0);

            eventos.push({
                titulo: "Arquivo analisado",
                detalhe: linhas > 0 || paginas > 0
                    ? `${paginas || "-"} página(s), ${linhas || "-"} linha(s) identificada(s).`
                    : "Leitura técnica executada.",
                data: "",
                status: "ok",
            });
        }

        if (conferenciaAssistidaSalvaEmDds) {
            eventos.push({
                titulo: "Conferência Assistida salva",
                detalhe: "Frequência confirmada na tabela P / X / ?.",
                data: conferenciaAssistidaSalvaEmDds,
                status: "ok",
            });
        }

        if (fechamentoConferenciaAssistidaDds?.concluidoEm) {
            eventos.push({
                titulo: "Conferência concluída oficialmente",
                detalhe: "Resultado oficial travado para auditoria.",
                data: fechamentoConferenciaAssistidaDds.concluidoEm,
                status: "ok",
            });
        }

        if (reciboFinalEmitidoEmDds) {
            eventos.push({
                titulo: "Recibo final emitido",
                detalhe: "Recibo impresso/gerado para conferência do registro.",
                data: reciboFinalEmitidoEmDds,
                status: "ok",
            });
        }

        return eventos;
    }, [
        codigoConferenciaDds,
        dadosDds,
        conferenciaAssistidaSalvaEmDds,
        fechamentoConferenciaAssistidaDds,
        leituraArquivoScannerDds,
        reciboFinalEmitidoEmDds,
        registroScannerDds,
    ]);


    const calendariosMaoDeObraDds = [
        {
            id: "sao-jose-dos-campos-sp",
            cidade: "São José dos Campos",
            uf: "SP",
            rotulo: "São José dos Campos / SP",
            feriadosMunicipaisFixos: [
                { mes: 3, dia: 19, nome: "São José" },
                { mes: 7, dia: 27, nome: "Aniversário de São José dos Campos" },
            ],
            feriadosEstaduaisFixos: [
                { mes: 7, dia: 9, nome: "Revolução Constitucionalista" },
            ],
        },
        {
            id: "sao-paulo-sp",
            cidade: "São Paulo",
            uf: "SP",
            rotulo: "São Paulo / SP",
            feriadosMunicipaisFixos: [
                { mes: 1, dia: 25, nome: "Aniversário de São Paulo" },
            ],
            feriadosEstaduaisFixos: [
                { mes: 7, dia: 9, nome: "Revolução Constitucionalista" },
            ],
        },
    ];

    const {
        obterObraReferenciaCalendarioMaoDeObraDds,
        resolverCalendarioMaoDeObraDds,
    } = criarControladorCalendarioMaoDeObraDds({
        calendariosMaoDeObraDds,
        dadosDds,
        obraSelecionadaIdDds,
        obrasEmpresasDds,
        reciboConferenciaFinalDds,
        registroScannerDds,
    });

    const obraReferenciaCalendarioMaoDeObraDds = obterObraReferenciaCalendarioMaoDeObraDds();
    const calendarioMaoDeObraSelecionadoDds = resolverCalendarioMaoDeObraDds(obraReferenciaCalendarioMaoDeObraDds);


    const {
        exportarHistoricoMensalMaoDeObraDds,
        imprimirHistoricoMensalMaoDeObraDds,
        exportarControleMaoDeObraDds,
        imprimirControleMaoDeObraDds,
        buscarHistoricoMensalMaoDeObraDds,
        carregarRegistroHistoricoMensalDds,
    } = criarControladorMaoDeObraDds({
        calendarioMaoDeObraSelecionadoDds,
        carregandoHistoricoMensalMaoDeObraDds,
        carregandoScannerDds,
        carregarRegistroDdsPorCodigo,
        dadosDds,
        dashboardHeroSstDds,
        diasAtivosConferenciaAssistidaDds,
        empresaSelecionadaDds,
        escaparHtmlControleMaoDeObraDds,
        formatarDataControleMaoDeObraDds,
        formatarNumeroMaoDeObraDds,
        historicoMensalMaoDeObraDds,
        listarRegistrosDds,
        mesHistoricoMaoDeObraDds,
        normalizarFuncaoMaoDeObraDds,
        normalizarNomeEmpresaMaoDeObraDds,
        obraSelecionadaIdDds,
        obterChaveFrequenciaAssistidaDds,
        obterIdEmpresaObjetoDds,
        obterStatusFrequenciaAssistidaDds,
        obterUuidSeguroDds,
        parseDataControleMaoDeObraDds,
        participantesConferenciaAssistidaDds,
        reciboConferenciaFinalDds,
        registroAtualPertenceAoMesHistoricoDds,
        registroHistoricoMensalConcluidoDds,
        registroScannerDds,
        setCarregandoHistoricoMensalMaoDeObraDds,
        setCarregandoScannerDds,
        setCodigoConferenciaDds,
        setErroHistoricoMensalMaoDeObraDds,
        setErroScannerDds,
        setHistoricoMensalConsultadoEmDds,
        setHistoricoMensalMaoDeObraDds,
        setRegistroScannerDds,
        supabase,
    });


    const {
        imprimirDdsComQrConferencia,
    } = criarControladorImpressaoDds({
        aniversariantesSemanaDds,
        dadosDds,
        dadosDdsComRegistro,
        diasSemanaComTemasDds,
        empresaSelecionadaDds,
        fimSemanaDds,
        folhasContinuacaoDds,
        inicioSemanaDds,
        obraSelecionadaIdDds,
        obterIdEmpresaObjetoDds,
        obterUuidSeguroDds,
        orientacoesDdsEditaveis,
        participantesSistemaDds,
        recadosDdsEditaveis,
        salvandoRegistroDds,
        salvarRegistroDds,
        setErroRegistroDds,
        setRegistroDdsConferencia,
        setSalvandoRegistroDds,
        supabase,
    });


    return (
        <div className="space-y-6">
            <DdsPrintStyles />
            <section className="dds-no-print relative overflow-hidden rounded-[30px] border border-slate-200 bg-slate-950 p-6 text-white shadow-[0_22px_60px_rgba(15,23,42,0.20)] sm:p-7 lg:p-8">
                <img
                    src={dashboardHeroSstDds}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 h-full w-full object-cover opacity-60"
                />
                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(15,23,42,0.90),rgba(15,23,42,0.72),rgba(15,23,42,0.42)),radial-gradient(circle_at_top_left,rgba(16,185,129,0.26),transparent_32%)]" />
                <div className="absolute inset-0 bg-slate-950/5" />

                <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="max-w-4xl">
                        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.28em] text-emerald-200 backdrop-blur">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_14px_rgba(110,231,183,0.8)]" />
                            SafeScan Brasil
                        </div>

                        <h1 className="mt-4 text-3xl font-black leading-tight tracking-tight text-white drop-shadow-sm sm:text-4xl lg:text-[42px]">
                            DDS — Diálogo Diário de Segurança
                        </h1>

                        <p className="mt-3 max-w-5xl text-sm font-semibold leading-6 text-slate-100 sm:text-[15px] xl:whitespace-nowrap">
                            Gere o DDS semanal de obra com assinatura manual, QR de conferência, temas por dia e controle visual para fiscalização.
                        </p>
                    </div>
</div>
            </section>
            <section className="dds-no-print grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <DdsResumoCard
                    icone={CalendarClock}
                    titulo="Semana atual"
                    valor={dadosDds.resumoSemana || "14 a 20/06"}
                    texto={dadosDds.periodo || "Domingo como primeiro dia da semana."}
                    cor="emerald"
                />
                <DdsResumoCard
                    icone={BookOpen}
                    titulo="Temas"
                    valor="7 dias"
                    texto="Tema e responsável por dia."
                    cor="sky"
                />
                <DdsResumoCard
                    icone={Users}
                    titulo="Participantes"
                    valor={String(participantesSistemaDds.length)}
                    texto="Todos os colaboradores carregados do sistema."
                    cor="violet"
                />
                <DdsResumoCard
                    icone={Printer}
                    titulo="Impressão"
                    valor="Imprimir DDS"
                    texto=""
                    cor="amber"
                    destaque
                    onClick={imprimirDdsComQrConferencia}
                />
            </section>

            <section className="dds-no-print space-y-4">
                <div className="min-h-[92px] rounded-3xl border border-slate-200 border-t-4 border-t-blue-500 bg-white p-4 shadow-sm">
                    <div
                        onClick={() => alternarCardDds("novo")}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(evento) => { if (evento.key === "Enter" || evento.key === " ") alternarCardDds("novo"); }}
                        className="flex min-h-[52px] cursor-default items-center justify-between gap-3 rounded-xl transition hover:bg-slate-50"
                    >
                        <div className="flex items-center gap-3">
                        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                            <Building2 className="h-5 w-5" />
                        </span>
                        <div>
                            <h2 className="text-lg font-black text-slate-950">Novo DDS semanal</h2>
                            <p className="text-sm font-semibold text-slate-500">Preencha os dados principais do DDS. A impressão será atualizada automaticamente.</p>
                        </div>
                    </div>
                        <button
                            type="button"
                            onClick={(evento) => { evento.stopPropagation(); alternarCardDds("novo"); }}
                            className="shrink-0"
                        >
                            <BotaoAlternarCardDds aberto={cardDdsAberto("novo")} />
                        </button>
                    </div>

                    {cardDdsAberto("novo") && (
                    <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                        <label className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                            <span className="text-[10px] font-black uppercase tracking-wide text-slate-400">Empresa cadastrada</span>
                            <select
                                value={empresaSelecionadaChaveDds}
                                onChange={(evento) => atualizarEmpresaSelecionadaDds(evento.target.value)}
                                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                            >
                                {empresasDds.length === 0 && (
                                    <option value="">Nenhuma empresa cadastrada</option>
                                )}
                                {empresasDds.map((empresa, indice) => {
                                    const chaveEmpresa = obterChaveEmpresaDds(empresa, indice);
                                    const nomeEmpresa = obterNomeEmpresaObjetoDds(empresa) || `Empresa ${indice + 1}`;

                                    return (
                                        <option key={chaveEmpresa} value={chaveEmpresa}>
                                            {nomeEmpresa}
                                        </option>
                                    );
                                })}
                            </select>
                        </label>

                        <label className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                            <span className="text-[10px] font-black uppercase tracking-wide text-slate-400">Obra cadastrada</span>
                            <select
                                value={obraSelecionadaIdDds}
                                onChange={(evento) => aplicarObraCadastradaDds(evento.target.value)}
                                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                            >
                                <option value="">
                                    {obrasEmpresaSelecionadaDds.length > 0 ? "Selecionar obra" : "Nenhuma obra cadastrada"}
                                </option>
                                {obrasEmpresaSelecionadaDds.map((obra, indice) => {
                                    const idObra = obterIdObraEmpresaDds(obra, indice);
                                    const nomeObra = obterNomeObraEmpresaDds(obra) || `Obra ${indice + 1}`;

                                    return (
                                        <option key={idObra} value={idObra}>
                                            {nomeObra}
                                        </option>
                                    );
                                })}
                            </select>
                            <span className="mt-2 block text-[11px] font-bold text-slate-500">
                                Ao selecionar, o DDS preenche Obra / Setor, Fiscal Idealiza e Líder / Encarregado.
                            </span>
                        </label>

                        {camposDadosDds.map((campo) => (
                            <label key={campo.chave} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                                <span className="text-[10px] font-black uppercase tracking-wide text-slate-400">{campo.rotulo}</span>
                                <input
                                    type="text"
                                    value={
                                        campo.chave === "obraSetor"
                                            ? valorObraSetorDds
                                            : campo.chave === "fiscalIdealiza"
                                                ? valorFiscalIdealizaDds
                                                : dadosDds[campo.chave] || ""
                                    }
                                    onChange={(evento) => atualizarCampoDadosDds(campo.chave, evento.target.value)}
                                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                                />
                                {campo.chave === "obraSetor" && (
                                    <span className="mt-2 block text-[11px] font-bold text-slate-500">
                                        Salvo automaticamente para a empresa selecionada neste computador.
                                    </span>
                                )}
                                {campo.chave === "fiscalIdealiza" && (
                                    <span className="mt-2 block text-[11px] font-bold text-slate-500">
                                        Salvo automaticamente para a empresa selecionada neste computador.
                                    </span>
                                )}

                            </label>
                        ))}

                        <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 md:col-span-2 xl:col-span-4">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-wide text-emerald-700">Semana do DDS</p>
                                    <p className="mt-1 text-sm font-black text-slate-800">{dadosDds.periodo}</p>
                                    <p className="mt-1 text-xs font-semibold text-slate-500">
                                        Código automático: <span className="font-black text-slate-800">{dadosDds.codigo}</span>
                                    </p>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setDeslocamentoSemanasDds((valor) => valor - 1)}
                                        className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-black text-emerald-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-50"
                                    >
                                        Semana anterior
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setDeslocamentoSemanasDds(0)}
                                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50"
                                    >
                                        Semana atual
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setDeslocamentoSemanasDds((valor) => valor + 1)}
                                        className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-black text-emerald-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-50"
                                    >
                                        Próxima semana
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    )}
                </div>

                <div
                    className="min-h-[92px] cursor-pointer rounded-3xl border border-slate-200 border-t-4 border-t-emerald-500 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-200"
                    role="button"
                    tabIndex={0}
                    onClick={() => alternarCardDds("qrConferencia")}
                    onKeyDown={(evento) => {
                        if (evento.key === "Enter" || evento.key === " ") {
                            evento.preventDefault();
                            alternarCardDds("qrConferencia");
                        }
                    }}
                >
                    <div className="flex min-h-[52px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-emerald-700 ring-1 ring-emerald-100">
                                <QrCode className="h-5 w-5" />
                            </span>
                            <div>
                                <h2 className="text-lg font-black text-emerald-950">QR de conferência</h2>
                                <p className="text-sm font-semibold text-emerald-800">
                                    O QR valida o documento. A assinatura continua manual.
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={(evento) => {
                                evento.stopPropagation();
                                alternarCardDds("qrConferencia");
                            }}
                            className="shrink-0"
                        >
                            <BotaoAlternarCardDds aberto={cardDdsAberto("qrConferencia")} />
                        </button>
                    </div>

                    {cardDdsAberto("qrConferencia") && (
                        <div className="mt-4 rounded-xl bg-white p-4 text-sm font-bold leading-6 text-slate-600 ring-1 ring-emerald-100">
                            A folha semanal terá domingo a sábado, rubrica nos dias com atividade, X preto/escuro para ausência e coluna final Semana completa para marcar presença nos dias úteis/com atividade.
                        </div>
                    )}
                </div>
                <div className="self-start rounded-3xl border border-slate-200 border-t-4 border-t-cyan-500 bg-white p-4 shadow-sm">
                    <div
                        onClick={() => alternarCardDds("conferencia")}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(evento) => { if (evento.key === "Enter" || evento.key === " ") alternarCardDds("conferencia"); }}
                        className="flex cursor-default items-center justify-between gap-3 rounded-xl transition hover:bg-white/50"
                    >
                        <div className="flex items-center gap-3">
                            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-cyan-700 ring-1 ring-cyan-100">
                                <ShieldCheck className="h-5 w-5" />
                            </span>
                            <div>
                                <h2 className="text-lg font-black text-cyan-950">Conferência DDS</h2>
                                <p className="text-sm font-semibold text-cyan-800">
                                    Busque o DDS salvo pelo código impresso antes de analisar a folha assinada.
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={(evento) => { evento.stopPropagation(); alternarCardDds("conferencia"); }}
                            className="shrink-0"
                        >
                            <BotaoAlternarCardDds aberto={cardDdsAberto("conferencia")} />
                        </button>
                    </div>

                    {cardDdsAberto("conferencia") && (
                        <div className="mt-3 grid grid-cols-1 gap-3">
                            <form
                                onSubmit={buscarRegistroScannerDds}
                                className="grid grid-cols-1 gap-2 xl:grid-cols-[minmax(220px,0.45fr)_minmax(360px,1fr)_auto_auto] xl:items-end"
                            >
                                <label className="block min-w-0">
                                    <span className="text-[10px] font-black uppercase tracking-wide text-cyan-700">
                                        Empresa
                                    </span>

                                    <select
                                        value={empresaFiltroRegistrosDds}
                                        disabled={carregandoRegistrosDisponiveisDds}
                                        onChange={(evento) => {
                                            const empresaSelecionada =
                                                String(
                                                    evento.target.value ||
                                                    ""
                                                ).trim();

                                            setEmpresaFiltroRegistrosDds(
                                                empresaSelecionada
                                            );

                                            setCodigoConferenciaDds("");
                                            setRegistroScannerDds(null);
                                            setErroScannerDds("");
                                            setArquivoScannerDds(null);
                                            setErroArquivoScannerDds("");
                                            setLeituraArquivoScannerDds(null);
                                            setErroLeituraArquivoScannerDds("");
                                            setMensagemDocumentoPersistidoDds(null);
                                            setMensagemExclusaoRegistroDds(null);
                                        }}
                                        className="mt-2 h-10 w-full min-w-0 rounded-xl border border-cyan-100 bg-cyan-50/60 px-3 text-sm font-black text-slate-800 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        <option value="">
                                            Todas as empresas
                                        </option>

                                        {empresasFiltroRegistrosDds.map(
                                            (empresaNome) => (
                                                <option
                                                    key={empresaNome}
                                                    value={empresaNome}
                                                >
                                                    {empresaNome}
                                                </option>
                                            )
                                        )}
                                    </select>
                                </label>

                                <label className="block min-w-0">
                                    <span className="flex items-center justify-between gap-3 text-[10px] font-black uppercase tracking-wide text-cyan-700">
                                        <span>
                                            DDS cadastrados
                                        </span>

                                        <span className="whitespace-nowrap text-slate-400">
                                            {carregandoRegistrosDisponiveisDds
                                                ? "Carregando..."
                                                : empresaFiltroRegistrosDds
                                                    ? `${registrosFiltradosDds.length} de ${registrosDisponiveisDds.length} registro(s)`
                                                    : `${registrosDisponiveisDds.length} registro(s)`}
                                        </span>
                                    </span>

                                    <select
                                        value={codigoConferenciaDds}
                                        disabled={carregandoRegistrosDisponiveisDds}
                                        onChange={(evento) => {
                                            const codigoSelecionado =
                                                String(
                                                    evento.target.value ||
                                                    ""
                                                )
                                                    .trim()
                                                    .toUpperCase();

                                            setCodigoConferenciaDds(
                                                codigoSelecionado
                                            );

                                            setRegistroScannerDds(null);
                                            setErroScannerDds("");
                                            setLeituraArquivoScannerDds(null);
                                            setErroLeituraArquivoScannerDds("");
                                            setMensagemDocumentoPersistidoDds(null);
                                        }}
                                        className="mt-2 h-10 w-full min-w-0 rounded-xl border border-cyan-100 bg-cyan-50/60 px-3 text-sm font-black text-slate-800 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        <option value="">
                                            {carregandoRegistrosDisponiveisDds
                                                ? "Carregando DDS cadastrados..."
                                                : registrosFiltradosDds.length > 0
                                                    ? "Selecione um DDS cadastrado"
                                                    : empresaFiltroRegistrosDds
                                                        ? "Nenhum DDS para a empresa selecionada"
                                                        : "Nenhum DDS cadastrado localizado"}
                                        </option>

                                        {codigoConferenciaDds &&
                                            !registrosFiltradosDds.some(
                                                (registro) =>
                                                    registro.codigo ===
                                                    String(
                                                        codigoConferenciaDds
                                                    )
                                                        .trim()
                                                        .toUpperCase()
                                            ) && (
                                                <option
                                                    value={codigoConferenciaDds}
                                                >
                                                    {codigoConferenciaDds} — código atual
                                                </option>
                                            )}

                                        {registrosFiltradosDds.map(
                                            (registro) => (
                                                <option
                                                    key={
                                                        registro.id ||
                                                        registro.codigo
                                                    }
                                                    value={registro.codigo}
                                                >
                                                    {registro.codigo}
                                                    {" — "}
                                                    {registro.obraNome ||
                                                        "Obra não informada"}
                                                    {" — "}
                                                    {formatarDataExibicaoDds(
                                                        registro.periodoInicio
                                                    )}
                                                    {" a "}
                                                    {formatarDataExibicaoDds(
                                                        registro.periodoFim
                                                    )}
                                                </option>
                                            )
                                        )}
                                    </select>
                                </label>

                                <button
                                    type="submit"
                                    disabled={
                                        carregandoScannerDds ||
                                        !codigoConferenciaDds
                                    }
                                    className="h-10 whitespace-nowrap rounded-xl bg-cyan-600 px-4 text-xs font-black text-white shadow-sm transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {carregandoScannerDds
                                        ? "Buscando..."
                                        : "Buscar registro"}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setCodigoConferenciaDds(
                                            dadosDds.codigo ||
                                            ""
                                        );

                                        setRegistroScannerDds(null);
                                        setErroScannerDds("");
                                        setLeituraArquivoScannerDds(null);
                                        setErroLeituraArquivoScannerDds("");
                                        setMensagemDocumentoPersistidoDds(null);
                                    }}
                                    className="h-10 whitespace-nowrap rounded-xl border border-cyan-200 bg-white px-4 text-xs font-black text-cyan-800 shadow-sm transition hover:bg-cyan-50"
                                >
                                    Usar código atual
                                </button>

                                {(erroScannerDds ||
                                    erroListaRegistrosDds) && (
                                    <p
                                        data-dds-mensagem-consulta
                                        className="w-fit max-w-full overflow-x-auto whitespace-nowrap rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 xl:col-span-4"
                                    >
                                        {erroScannerDds ||
                                            erroListaRegistrosDds}
                                    </p>
                                )}

                                {mensagemExclusaoRegistroDds?.texto && (
                                    <p
                                        data-dds-mensagem-exclusao-registro
                                        className={
                                            mensagemExclusaoRegistroDds.tipo === "erro"
                                                ? "w-fit max-w-full overflow-x-auto whitespace-nowrap rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 xl:col-span-4"
                                                : mensagemExclusaoRegistroDds.tipo === "aviso"
                                                    ? "w-fit max-w-full overflow-x-auto whitespace-nowrap rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 xl:col-span-4"
                                                    : "w-fit max-w-full overflow-x-auto whitespace-nowrap rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 xl:col-span-4"
                                        }
                                    >
                                        {mensagemExclusaoRegistroDds.texto}
                                    </p>
                                )}

                                <div
                                    data-dds-lista-registros
                                    className="overflow-hidden rounded-xl border border-slate-200 bg-white xl:col-span-4"
                                >
                                    {/* dds_lista_registros_header_click_v3 */}
                                     <div
                                         onClick={() =>
                                             setListaRegistrosDdsExpandida(
                                                 (valorAtual) => !valorAtual
                                             )
                                         }
                                         role="button"
                                         tabIndex={0}
                                         aria-expanded={listaRegistrosDdsExpandida}
                                         onKeyDown={(evento) => {
                                             if (
                                                 evento.target !==
                                                 evento.currentTarget
                                             ) {
                                                 return;
                                             }

                                             if (
                                                 evento.key === "Enter" ||
                                                 evento.key === " "
                                             ) {
                                                 evento.preventDefault();

                                                 setListaRegistrosDdsExpandida(
                                                     (valorAtual) => !valorAtual
                                                 );
                                             }
                                         }}
                                         className={
                                             listaRegistrosDdsExpandida
                                                 ? "flex cursor-pointer items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-3 py-2 transition hover:bg-slate-100"
                                                 : "flex cursor-pointer items-center justify-between gap-3 bg-slate-50 px-3 py-2 transition hover:bg-slate-100"
                                         }
                                     >
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-wide text-slate-700">
                                                {empresaFiltroRegistrosDds
                                                    ? "DDS da empresa selecionada"
                                                    : "Todos os DDS cadastrados"}
                                            </p>

                                            <p className="mt-0.5 text-[10px] font-semibold text-slate-500">
                                                {empresaFiltroRegistrosDds
                                                    ? empresaFiltroRegistrosDds
                                                    : "Selecione um registro para preencher o código da busca."}
                                            </p>
                                        </div>

                                        {/* dds_balao_lista_registros_toggle_v1 */}
                                        <button
                                             type="button"
                                             aria-label={
                                                 listaRegistrosDdsExpandida
                                                     ? "Ocultar DDS cadastrados"
                                                     : "Mostrar DDS cadastrados"
                                             }
                                             className="shrink-0 cursor-pointer whitespace-nowrap rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-[10px] font-black text-cyan-800 transition hover:border-cyan-300 hover:bg-cyan-100 focus:outline-none focus:ring-2 focus:ring-cyan-300"
                                         >
                                             {empresaFiltroRegistrosDds
                                                 ? `${registrosFiltradosDds.length} de ${registrosDisponiveisDds.length} registro(s)`
                                                 : `${registrosDisponiveisDds.length} registro(s)`}
                                             {" • "}
                                             {listaRegistrosDdsExpandida ? "Ocultar" : "Mostrar"}
                                         </button>
                                    </div>

                                    {listaRegistrosDdsExpandida && (
                                         carregandoRegistrosDisponiveisDds ? (
                                        <p className="px-3 py-4 text-center text-xs font-bold text-slate-500">
                                            Carregando os DDS cadastrados...
                                        </p>
                                    ) : registrosFiltradosDds.length > 0 ? (
                                        <div className="max-h-72 overflow-auto">
                                            {/* dds_lista_registros_alinhamento_central_v1 */}
                                            <table className="w-full min-w-[760px] table-fixed border-collapse text-center text-xs">
                                                <thead className="sticky top-0 z-10 bg-slate-100 text-[9px] font-black uppercase tracking-wide text-slate-500">
                                                    <tr>
                                                        {/* dds_lista_codigo_empresa_alinhados_esquerda_v2 */}
                                                         <th className="w-[16%] px-3 py-2 text-left">
                                                             Código
                                                         </th>

                                                        <th className="w-[34%] px-3 py-2 text-left">
                                                             Empresa / obra
                                                         </th>

                                                        <th className="w-[22%] px-3 py-2 text-center">
                                                            Período
                                                        </th>

                                                        <th className="w-[12%] px-3 py-2 text-center">
                                                            Status
                                                        </th>

                                                        <th className="w-[16%] px-3 py-2 text-center">
                                                            Ação
                                                        </th>
                                                    </tr>
                                                </thead>

                                                <tbody className="divide-y divide-slate-100">
                                                    {registrosFiltradosDds.map(
                                                        (registro) => (
                                                            <tr
                                                                key={
                                                                    registro.id ||
                                                                    registro.codigo
                                                                }
                                                                className={
                                                                    registro.codigo ===
                                                                    String(
                                                                        codigoConferenciaDds ||
                                                                        ""
                                                                    )
                                                                        .trim()
                                                                        .toUpperCase()
                                                                        ? "bg-cyan-50"
                                                                        : "bg-white hover:bg-slate-50"
                                                                }
                                                            >
                                                                <td className="whitespace-nowrap px-3 py-2 text-left font-black text-slate-900">
                                                                    {registro.codigo}
                                                                </td>

                                                                <td className="px-3 py-2 text-left">
                                                                     <p className="font-bold text-slate-800">
                                                                        {registro.obraNome ||
                                                                            "Obra não informada"}
                                                                    </p>

                                                                    <p className="mt-0.5 text-[10px] font-semibold text-slate-500">
                                                                        {registro.empresaNome ||
                                                                            "Empresa não informada"}
                                                                    </p>
                                                                </td>

                                                                <td className="whitespace-nowrap px-3 py-2 text-center font-semibold text-slate-600">
                                                                    {formatarDataExibicaoDds(
                                                                        registro.periodoInicio
                                                                    )}
                                                                    {" a "}
                                                                    {formatarDataExibicaoDds(
                                                                        registro.periodoFim
                                                                    )}
                                                                </td>

                                                                <td className="px-3 py-2 text-center">
                                                                    <span className="inline-flex whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-emerald-800">
                                                                        {registro.status ||
                                                                            "Ativo"}
                                                                    </span>
                                                                </td>

                                                                <td className="px-3 py-2 text-center">
                                                                    <div className="flex items-center justify-center gap-2">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                setCodigoConferenciaDds(
                                                                                    registro.codigo
                                                                                );

                                                                                setRegistroScannerDds(null);
                                                                                setErroScannerDds("");
                                                                                setLeituraArquivoScannerDds(null);
                                                                                setErroLeituraArquivoScannerDds("");
                                                                                setMensagemDocumentoPersistidoDds(null);
                                                                                setMensagemExclusaoRegistroDds(null);
                                                                            }}
                                                                            disabled={
                                                                                Boolean(
                                                                                    excluindoRegistroDdsId
                                                                                )
                                                                            }
                                                                            className="whitespace-nowrap rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-[10px] font-black text-cyan-800 transition hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-50"
                                                                        >
                                                                            Selecionar
                                                                        </button>

                                                                        <button
                                                                            type="button"
                                                                            onClick={() =>
                                                                                excluirRegistroCadastradoDds(
                                                                                    registro
                                                                                )
                                                                            }
                                                                            disabled={
                                                                                Boolean(
                                                                                    excluindoRegistroDdsId
                                                                                )
                                                                            }
                                                                            className="whitespace-nowrap rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-[10px] font-black text-red-700 transition hover:border-red-300 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                                                                        >
                                                                            {excluindoRegistroDdsId ===
                                                                            String(
                                                                                registro.id ||
                                                                                ""
                                                                            ).trim()
                                                                                ? "Excluindo..."
                                                                                : "Excluir"}
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                         <p className="px-3 py-4 text-center text-xs font-bold text-slate-500">
                                             {empresaFiltroRegistrosDds
                                                 ? "Nenhum DDS foi localizado para a empresa selecionada."
                                                 : "Nenhum DDS cadastrado foi localizado."}
                                         </p>
                                     )
                                 )}
                                </div>
                            </form>

                            <DdsLeituraArquivoScannerSection
                                arquivoScannerDds={arquivoScannerDds}
                                avisosLeituraArquivoScannerDds={avisosLeituraArquivoScannerDds}
                                carregandoLeituraArquivoScannerDds={carregandoLeituraArquivoScannerDds}
                                diagnosticoEstruturalScannerDds={diagnosticoEstruturalScannerDds}
                                erroArquivoScannerDds={erroArquivoScannerDds}
                                erroLeituraArquivoScannerDds={erroLeituraArquivoScannerDds}
                                executarLeituraArquivoScannerDds={executarLeituraArquivoScannerDds}
                                leituraArquivoScannerDds={leituraArquivoScannerDds}
                                limparArquivoScannerDds={limparArquivoScannerDds}
                                linhasLeituraArquivoScannerDds={linhasLeituraArquivoScannerDds}
                                qualidadeLeituraArquivoScannerDds={qualidadeLeituraArquivoScannerDds}
                                resumoArquivoScannerDds={resumoArquivoScannerDds}
                                selecionarArquivoScannerDds={selecionarArquivoScannerDds}
                                textoPreviaArquivoScannerDds={textoPreviaArquivoScannerDds}
                            />

                            {preConferenciaParticipantesScannerDds.total > 0 && (
<div className="min-h-[92px] rounded-3xl border border-slate-200 border-t-4 border-t-violet-500 bg-white p-4 shadow-sm lg:col-span-2">
    <div
        onClick={() => alternarCardDds("preConferencia")}
        role="button"
        tabIndex={0}
        onKeyDown={(evento) => {
            if (evento.key === "Enter" || evento.key === " ") {
                alternarCardDds("preConferencia");
            }
        }}
        className="flex min-h-[52px] cursor-default flex-col gap-3 rounded-xl transition hover:bg-slate-50 lg:flex-row lg:items-center lg:justify-between"
    >
        <div>
            <p className="text-violet-700 text-[10px] font-black uppercase tracking-wide">
                Pré-conferência de participantes
            </p>
            <h4 className="mt-1 text-base font-black text-slate-950">
                Participantes do gabarito x páginas anexadas
            </h4>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                Conferência técnica auxiliar. Não valida assinatura, biometria ou grafia; indica apenas se o participante foi localizado na página esperada da folha.
            </p>
        </div>

        <div
            className="flex flex-wrap items-center gap-2"
            onClick={(evento) => evento.stopPropagation()}
        >
            <span className={`rounded-xl border px-3 py-2 text-xs font-black ${
                preConferenciaParticipantesScannerDds.statusVisual === "ok"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : preConferenciaParticipantesScannerDds.statusVisual === "manual"
                        ? "border-amber-200 bg-amber-50 text-amber-800"
                        : "border-slate-200 bg-slate-50 text-slate-700"
            }`}>
                {preConferenciaParticipantesScannerDds.statusGeral}
            </span>

            <button
                type="button"
                onClick={() => alternarCardDds("preConferencia")}
                className="shrink-0"
            >
                <BotaoAlternarCardDds
                    aberto={cardDdsAberto("preConferencia")}
                />
            </button>
        </div>
    </div>

    <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-xl bg-slate-50 p-3 text-center ring-1 ring-slate-100">
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Participantes</p>
            <p className="mt-1 text-base font-black text-slate-950">{preConferenciaParticipantesScannerDds.total}</p>
        </div>
        <div className="rounded-xl bg-emerald-50 p-3 text-center ring-1 ring-emerald-100">
            <p className="text-[10px] font-black uppercase tracking-wide text-emerald-700">Localizados</p>
            <p className="mt-1 text-base font-black text-emerald-900">{preConferenciaParticipantesScannerDds.localizados}</p>
        </div>
        <div className="rounded-xl bg-amber-50 p-3 text-center ring-1 ring-amber-100">
            <p className="text-[10px] font-black uppercase tracking-wide text-amber-700">Manual</p>
            <p className="mt-1 text-base font-black text-amber-900">{preConferenciaParticipantesScannerDds.manuais}</p>
        </div>
        <div className="rounded-xl bg-red-50 p-3 text-center ring-1 ring-red-100">
            <p className="text-[10px] font-black uppercase tracking-wide text-red-700">Não localizados</p>
            <p className="mt-1 text-base font-black text-red-900">{preConferenciaParticipantesScannerDds.naoLocalizados}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 text-center ring-1 ring-slate-100">
            <p className="text-[10px] font-black uppercase tracking-wide text-orange-700">Pág. não anexada</p>
            <p className="mt-1 text-base font-black text-orange-900">{preConferenciaParticipantesScannerDds.paginasNaoAnalisadas}</p>
        </div>
    </div>

    {cardDdsAberto("preConferencia") && (
        <>
        {!preConferenciaParticipantesScannerDds.leituraConfiavel && preConferenciaParticipantesScannerDds.leituraExecutada && (
                <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs font-bold leading-5 text-amber-800">
                    A leitura atual não tem qualidade suficiente para localizar participantes com segurança. A tabela abaixo fica como apoio de conferência manual.
                </div>
            )}

            <div className="mt-4 overflow-hidden rounded-xl border border-violet-100">
                <div className="max-h-72 overflow-auto">
                    <table className="w-full border-collapse text-left text-xs">
                        <thead className="sticky top-0 bg-violet-50 text-[10px] uppercase tracking-wide text-violet-500">
                            <tr>
                                <th className="px-3 py-2">Nº</th>
                                <th className="px-3 py-2">Nome</th>
                                <th className="px-3 py-2">Função</th>
                                <th className="px-3 py-2">Código SafeScan</th>
                                <th className="px-3 py-2">Localização textual</th>
                                <th className="px-3 py-2">Evidência</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-violet-50">
                            {preConferenciaParticipantesScannerDds.participantes.slice(0, 80).map((participante, indice) => (
                                <tr key={`pre-conferencia-dds-${participante.codigoSafescan || participante.nome || indice}`}>
                                    <td className="px-3 py-2 font-black text-slate-500">{participante.numero || indice + 1}</td>
                                    <td className="px-3 py-2 font-bold text-slate-800">{participante.nome || "-"}</td>
                                    <td className="px-3 py-2 text-slate-600">{participante.funcao || "-"}</td>
                                    <td className="px-3 py-2 font-mono text-[11px] font-bold text-slate-700">{participante.codigoSafescan || "-"}</td>
                                    <td className="px-3 py-2">
                                        <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-wide ${
                                            participante.status === "localizado"
                                                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                                : participante.status === "manual" || participante.status === "pagina_nao_analisada"
                                                    ? "border-amber-200 bg-amber-50 text-amber-800"
                                                    : participante.status === "nao_localizado"
                                                        ? "border-red-200 bg-red-50 text-red-700"
                                                        : "border-slate-200 bg-slate-50 text-slate-600"
                                        }`}>
                                            {participante.statusTexto}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2 text-slate-600">{participante.detalhe}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <p className="mt-3 text-[11px] font-bold leading-5 text-slate-500">
                Observação: esta etapa não substitui conferência visual da assinatura. O status indica apenas localização textual provável ou necessidade de conferência manual.
            </p>
        </>
    )}
</div>
)}

{<DdsConferenciaAssistidaSection
     BotaoAlternarCardDds={BotaoAlternarCardDds}
     QUANTIDADE_LINHAS_COMPLEMENTARES_DDS={QUANTIDADE_LINHAS_COMPLEMENTARES_DDS}
     alternarCardDds={alternarCardDds}
     alternarSemAtividadeConferenciaAssistidaDds={alternarSemAtividadeConferenciaAssistidaDds}
     atualizarParticipanteAdicionalConferenciaDds={atualizarParticipanteAdicionalConferenciaDds}
     colaboradoresCadastradosConferenciaDds={colaboradoresCadastradosConferenciaDds}
     empresasCadastradasConferenciaDds={empresasCadastradasConferenciaDds}
     funcoesCadastradasConferenciaDds={funcoesCadastradasConferenciaDds}
     selecionarParticipanteCadastradoConferenciaDds={selecionarParticipanteCadastradoConferenciaDds}
     atualizarTemaConferenciaAssistidaDds={atualizarTemaConferenciaAssistidaDds}
     usarSugestaoOcrTemaConferenciaAssistidaDds={usarSugestaoOcrTemaConferenciaAssistidaDds}
     cardDdsAberto={cardDdsAberto}
     concluirConferenciaAssistidaDds={concluirConferenciaAssistidaDds}
     conferenciaAssistidaSalvaEmDds={conferenciaAssistidaSalvaEmDds}
     conferenciaOficialConcluidaDds={conferenciaOficialConcluidaDds}
     definirStatusFrequenciaAssistidaDds={definirStatusFrequenciaAssistidaDds}
     diasAtivosConferenciaAssistidaDds={diasAtivosConferenciaAssistidaDds}
     diasConferenciaAssistidaDds={diasConferenciaAssistidaDds}
     erroConferenciaAssistidaDds={erroConferenciaAssistidaDds}
     erroFechamentoConferenciaDds={erroFechamentoConferenciaDds}
     estatisticasConferenciaAssistidaDds={estatisticasConferenciaAssistidaDds}
     estatisticasTemasConferenciaAssistidaDds={estatisticasTemasConferenciaAssistidaDds}
     fechamentoConferenciaAssistidaDds={fechamentoConferenciaAssistidaDds}
     limparConferenciaAssistidaDds={limparConferenciaAssistidaDds}
     limparParticipanteAdicionalConferenciaDds={limparParticipanteAdicionalConferenciaDds}
     limparParticipanteConferenciaAssistidaDds={limparParticipanteConferenciaAssistidaDds}
     marcarSemanaCompletaAssistidaDds={marcarSemanaCompletaAssistidaDds}
     marcarSemanaAusenteAssistidaDds={marcarSemanaAusenteAssistidaDds}
     obterStatusFrequenciaAssistidaDds={obterStatusFrequenciaAssistidaDds}
     participantesAdicionaisAtivosConferenciaDds={participantesAdicionaisAtivosConferenciaDds}
     participantesAdicionaisConferenciaDds={participantesAdicionaisConferenciaDds}
     participantesConferenciaAssistidaDds={participantesConferenciaAssistidaDds}
     reabrirConferenciaAssistidaDds={reabrirConferenciaAssistidaDds}
     salvandoConferenciaAssistidaDds={salvandoConferenciaAssistidaDds}
     salvandoFechamentoConferenciaDds={salvandoFechamentoConferenciaDds}
     salvarConferenciaAssistidaDds={salvarConferenciaAssistidaDds}
     sugestoesFrequenciaDds={sugestoesFrequenciaDds}
     sugestoesTemaResponsavelDds={sugestoesTemaResponsavelDds}
     usarPlanejamentoTemaConferenciaAssistidaDds={usarPlanejamentoTemaConferenciaAssistidaDds}
 />}
{resultadoFinalApresentacaoDds && (
<div className={`min-h-[92px] rounded-3xl border border-slate-200 border-t-4 bg-white p-4 shadow-sm lg:col-span-2 ${
    resultadoFinalApresentacaoDds.statusVisual === "ok"
        ? "border-t-emerald-500"
        : resultadoFinalApresentacaoDds.statusVisual === "parcial"
            ? "border-t-amber-500"
            : "border-t-red-500"
}`}>
    <div
    onClick={() => alternarCardDds("resultadoOficial")}
    role="button"
    tabIndex={0}
    onKeyDown={(evento) => {
        if (evento.key === "Enter" || evento.key === " ") {
            alternarCardDds("resultadoOficial");
        }
    }}
    className="flex min-h-[52px] cursor-default flex-col gap-3 rounded-xl transition hover:bg-slate-50 lg:flex-row lg:items-center lg:justify-between"
>
        <div>
            <p className={`text-[10px] font-black uppercase tracking-wide ${
                resultadoFinalApresentacaoDds.statusVisual === "ok"
                    ? "text-emerald-700"
                    : resultadoFinalApresentacaoDds.statusVisual === "parcial"
                        ? "text-amber-700"
                        : "text-red-700"
            }`}>
                {resultadoFinalApresentacaoDds.modoAssistido ? "Resultado oficial da Conferência Assistida DDS" : "Resultado final da conferência DDS"}
            </p>
            <h4 className="mt-1 text-base font-black text-slate-950">
                {resultadoFinalApresentacaoDds.titulo}
            </h4>
            <p className="mt-1 max-w-4xl text-xs font-semibold leading-5 text-slate-500">
                {resultadoFinalApresentacaoDds.descricao}
            </p>
        </div>

        <div className="flex flex-wrap items-center gap-2" onClick={(evento) => evento.stopPropagation()}>
            <span className={`rounded-xl border px-4 py-2 text-sm font-black ${
                resultadoFinalApresentacaoDds.statusVisual === "ok"
                    ? "border-emerald-300 bg-white text-emerald-800"
                    : resultadoFinalApresentacaoDds.statusVisual === "parcial"
                        ? "border-amber-300 bg-white text-amber-800"
                        : "border-red-300 bg-white text-red-800"
            }`}>
                {resultadoFinalApresentacaoDds.statusFinal}
            </span>

            <button
                type="button"
                onClick={() => alternarCardDds("resultadoOficial")}
                className="shrink-0"
            >
                <BotaoAlternarCardDds
                    aberto={cardDdsAberto("resultadoOficial")}
                />
            </button>
        </div>
    </div>

    {cardDdsAberto("resultadoOficial") && (
        <>
    <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        <div className="flex min-h-[76px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-3 text-center ring-1 ring-slate-100">
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">
                Participantes
            </p>
            <p className="mt-1 text-lg font-black leading-none text-slate-950">
                {resultadoFinalApresentacaoDds.resumo.participantesTotal}
            </p>
        </div>

        <div className="flex min-h-[76px] flex-col items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center ring-1 ring-emerald-100">
            <p className="text-[10px] font-black uppercase tracking-wide text-emerald-700">
                {resultadoFinalApresentacaoDds.modoAssistido ? "Presenças" : "Localizados"}
            </p>
            <p className="mt-1 text-lg font-black leading-none text-emerald-900">
                {resultadoFinalApresentacaoDds.modoAssistido
                    ? resultadoFinalApresentacaoDds.resumo.presencas
                    : resultadoFinalApresentacaoDds.resumo.participantesLocalizados}
            </p>
        </div>

        <div className="flex min-h-[76px] flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 p-3 text-center ring-1 ring-red-100">
            <p className="text-[10px] font-black uppercase tracking-wide text-red-700">
                {resultadoFinalApresentacaoDds.modoAssistido ? "Ausências" : "Manual"}
            </p>
            <p className="mt-1 text-lg font-black leading-none text-red-900">
                {resultadoFinalApresentacaoDds.modoAssistido
                    ? resultadoFinalApresentacaoDds.resumo.ausencias
                    : resultadoFinalApresentacaoDds.resumo.participantesManuais}
            </p>
        </div>

        <div className="flex min-h-[76px] flex-col items-center justify-center rounded-xl border border-amber-200 bg-amber-50 p-3 text-center ring-1 ring-amber-100">
            <p className="text-[10px] font-black uppercase tracking-wide text-amber-700">
                {resultadoFinalApresentacaoDds.modoAssistido ? "Manual/vazio" : "Não localizados"}
            </p>
            <p className="mt-1 text-lg font-black leading-none text-amber-900">
                {resultadoFinalApresentacaoDds.modoAssistido
                    ? resultadoFinalApresentacaoDds.resumo.manuais
                    : resultadoFinalApresentacaoDds.resumo.participantesNaoLocalizados}
            </p>
        </div>

        <div className="flex min-h-[76px] flex-col items-center justify-center rounded-xl border border-orange-200 bg-orange-50 p-3 text-center ring-1 ring-orange-100">
            <p className="text-[10px] font-black uppercase tracking-wide text-orange-700">
                {resultadoFinalApresentacaoDds.modoAssistido ? "Acumulado do período" : "Pág. não anexada"}
            </p>
            <p className="mt-1 text-lg font-black leading-none text-orange-900">
                {resultadoFinalApresentacaoDds.modoAssistido
                    ? resultadoFinalApresentacaoDds.resumo.homemDia
                    : resultadoFinalApresentacaoDds.resumo.participantesPaginasNaoAnalisadas}
            </p>
        </div>
    </div>

    {resultadoFinalApresentacaoDds.modoAssistido &&
        conferenciaOficialConcluidaDds && (
            <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                <div className="flex min-h-[96px] flex-col items-center justify-center rounded-xl border border-sky-200 bg-sky-50 p-3 text-center ring-1 ring-sky-100">
                    <p className="text-[10px] font-black uppercase tracking-wide text-sky-700">
                        Horas totais trabalhadas
                    </p>

                    <p className="mt-2 text-xl font-black leading-none text-sky-950">
                        {indicadoresJornadaResultadoOficialDds.horasTotaisTrabalhadas.toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                        })} h
                    </p>

                    <p className="mt-2 text-[9px] font-bold leading-4 text-sky-700">
                        Soma das jornadas dos participantes presentes.
                    </p>
                </div>

                <div className="flex min-h-[96px] flex-col items-center justify-center rounded-xl border border-orange-200 bg-orange-50 p-3 text-center ring-1 ring-orange-100">
                    <p className="text-[10px] font-black uppercase tracking-wide text-orange-700">
                        Horas extras
                    </p>

                    <p className="mt-2 text-xl font-black leading-none text-orange-950">
                        {indicadoresJornadaResultadoOficialDds.horasExtras.toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                        })} h
                    </p>

                    <p className="mt-2 text-[9px] font-bold leading-4 text-orange-700">
                        Excedentes diários e jornadas extras integrais.
                    </p>
                </div>

                <div className="flex min-h-[96px] flex-col items-center justify-center rounded-xl border border-violet-200 bg-violet-50 p-3 text-center ring-1 ring-violet-100 sm:col-span-2 xl:col-span-1">
                    <p className="text-[10px] font-black uppercase tracking-wide text-violet-700">
                        Absenteísmo
                    </p>

                    <p className="mt-2 text-xl font-black leading-none text-violet-950">
                        {indicadoresJornadaResultadoOficialDds.absenteismo.toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                        })}%
                    </p>

                    <p className="mt-2 text-[9px] font-bold leading-4 text-violet-700">
                        Ausências sobre presenças e ausências apuradas.
                    </p>
                </div>
            </div>
        )}

    <div className="mt-4 grid gap-2 lg:grid-cols-3">
        {resultadoFinalApresentacaoDds.itens.map((item, indice) => {
            const classesCardResultadoDds = item.ok
                ? "border-emerald-200 bg-emerald-50 ring-emerald-100"
                : item.manual
                    ? "border-amber-200 bg-amber-50 ring-amber-100"
                    : "border-slate-200 bg-slate-50 ring-slate-100";

            const classesStatusResultadoDds = item.ok
                ? "border-emerald-200 text-emerald-700"
                : item.manual
                    ? "border-amber-200 text-amber-700"
                    : "border-slate-200 text-slate-500";

            return (
                <div
                    key={`resultado-final-dds-${indice}`}
                    className={`flex min-h-[112px] flex-col items-center justify-center rounded-xl border p-4 text-center ring-1 ${classesCardResultadoDds}`}
                >
                    <span
                        className={`inline-flex rounded-full border bg-white/80 px-3 py-1 text-[9px] font-black uppercase tracking-wide ${classesStatusResultadoDds}`}
                    >
                        {item.ok
                            ? "OK"
                            : item.manual
                                ? "Manual"
                                : "Pendente"}
                    </span>

                    <p className="mt-2 text-sm font-black text-slate-950">
                        {item.titulo}
                    </p>

                    <p className="mt-1 max-w-[420px] text-xs font-bold leading-5 text-slate-600">
                        {item.detalhe}
                    </p>
                </div>
            );
        })}
    </div>
        </>
    )}
</div>
)}

{<DdsReciboFinalSection
     BotaoAlternarCardDds={BotaoAlternarCardDds}
     DdsQrConferenciaImpresso={DdsQrConferenciaImpresso}
     abrirConsultaPublicaReciboDds={abrirConsultaPublicaReciboDds}
     alternarCardDds={alternarCardDds}
     cardDdsAberto={cardDdsAberto}
     codigoReciboCopiadoDds={codigoReciboCopiadoDds}
     copiarCodigoReciboDds={copiarCodigoReciboDds}
     erroReciboFinalDds={erroReciboFinalDds}
     imprimirReciboConferenciaDds={imprimirReciboConferenciaDds}
     reciboConferenciaFinalDds={reciboConferenciaFinalDds}
     reciboConferenciaFinalRef={reciboConferenciaFinalRef}
     reciboFinalEmitidoEmDds={reciboFinalEmitidoEmDds}
     salvandoReciboFinalDds={salvandoReciboFinalDds}
 />}

{historicoDds.length > 0 && (
<div className="min-h-[92px] rounded-3xl border border-slate-200 border-t-4 border-t-slate-500 bg-white p-4 shadow-sm lg:col-span-2">
    <div
    onClick={() => alternarCardDds("linhaTempo")}
    role="button"
    tabIndex={0}
    onKeyDown={(evento) => {
        if (evento.key === "Enter" || evento.key === " ") {
            evento.preventDefault();
            alternarCardDds("linhaTempo");
        }
    }}
    className="flex min-h-[52px] cursor-default flex-col gap-3 rounded-xl transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
>
        <div>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-wide">
                Histórico do DDS
            </p>
            <h4 className="mt-1 text-base font-black text-slate-950">
                Linha do tempo do registro
            </h4>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                Acompanhe as principais etapas registradas para conferência, auditoria e rastreabilidade.
            </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2" onClick={(evento) => evento.stopPropagation()}>
            <span className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-600">
                {historicoDds.length} evento(s)
            </span>

            <button
                type="button"
                onClick={() => alternarCardDds("linhaTempo")}
                className="shrink-0"
            >
                <BotaoAlternarCardDds
                    aberto={cardDdsAberto("linhaTempo")}
                />
            </button>
        </div>
    </div>

    {cardDdsAberto("linhaTempo") && (
<div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-5">
        {historicoDds.map((evento, indice) => (
            <div
                key={`historico-dds-${indice}`}
                className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 ring-1 ring-emerald-50"
            >
                <div className="flex items-start gap-2">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-white text-[11px] font-black text-emerald-700 ring-1 ring-emerald-100">
                        {indice + 1}
                    </span>

                    <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-wide text-emerald-700">
                            {evento.titulo}
                        </p>
                        <p className="mt-1 text-[11px] font-bold leading-4 text-slate-700">
                            {evento.detalhe}
                        </p>
                        {evento.data && (
                            <p className="mt-2 text-[10px] font-black text-slate-500">
                                {new Date(evento.data).toLocaleString("pt-BR")}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        ))}
    </div>
)}
</div>
)}

{reciboConferenciaFinalDds && (
<div className="min-h-[92px] rounded-3xl border border-slate-200 border-t-4 border-t-sky-500 bg-white p-4 shadow-sm lg:col-span-2">
    <div
    onClick={() => alternarCardDds("controleMaoObra")}
    role="button"
    tabIndex={0}
    onKeyDown={(evento) => {
        if (evento.key === "Enter" || evento.key === " ") {
            alternarCardDds("controleMaoObra");
        }
    }}
    className="grid min-h-[76px] cursor-default gap-4 rounded-xl transition hover:bg-slate-50 2xl:grid-cols-[minmax(0,1fr)_auto] 2xl:items-start"
>
        <div className="min-w-0 2xl:max-w-4xl">
            <p className="text-sky-700 text-[10px] font-black uppercase tracking-wide">
                Implantação / obra
            </p>
            <h4 className="mt-1 text-base font-black text-slate-950">
                Controle mensal de mão de obra
            </h4>
            <div className="mt-1 max-w-4xl text-xs font-semibold leading-5 text-slate-500">
                <p>
                    Gera PDF e Excel consolidado por empresa/contratada e função, usando a Conferência Assistida como base de presença.
                </p>
                <p>
                    Expediente normal: Seg a qui 07:00 às 17:00 / sex 07:00 às 16:00, almoço das 12:00 às 13:00 / DDS das 07:00 às 07:10.
                </p>
            </div>
        </div>

        <div className="flex w-full flex-wrap items-start gap-2 2xl:w-auto 2xl:self-start 2xl:flex-nowrap 2xl:justify-end" onClick={(evento) => evento.stopPropagation()}>
            <button
                type="button"
                onClick={imprimirControleMaoDeObraDds}
                className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-[11px] font-black text-emerald-800 shadow-sm transition hover:border-emerald-400 hover:bg-emerald-100"
            >
                Imprimir PDF
            </button>

            <button
                type="button"
                onClick={exportarControleMaoDeObraDds}
                className="rounded-xl border border-sky-300 bg-white px-3 py-2 text-[11px] font-black text-sky-800 shadow-sm transition hover:border-sky-400 hover:bg-sky-50"
            >
                Exportar Excel
            </button>

            <button
                type="button"
                onClick={() => alternarCardDds("controleMaoObra")}
                className="shrink-0"
            >
                <BotaoAlternarCardDds
                    aberto={cardDdsAberto("controleMaoObra")}
                />
            </button>
        </div>
    </div>

    {cardDdsAberto("controleMaoObra") && (
        <>
    <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl bg-white px-3 py-3 text-center ring-1 ring-sky-100">
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Funções</p>
            <p className="mt-1 text-base font-black text-slate-950">{resumoControleMaoDeObraDds.funcoes}</p>
        </div>
        <div className="rounded-xl bg-white px-3 py-3 text-center ring-1 ring-sky-100">
            <p className="text-[10px] font-black uppercase tracking-wide text-sky-700">Dias apurados</p>
            <p className="mt-1 text-base font-black text-sky-900">{resumoControleMaoDeObraDds.diasLancados}</p>
        </div>
        <div className="rounded-xl bg-white px-3 py-3 text-center ring-1 ring-sky-100">
            <p className="text-[10px] font-black uppercase tracking-wide text-orange-700">Acumulado do período</p>
            <p className="mt-1 text-base font-black text-orange-900">{resumoControleMaoDeObraDds.homemDia}</p>
        </div>
        <div className="rounded-xl bg-white px-3 py-3 text-center ring-1 ring-sky-100">
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Mês base</p>
            <p className="mt-1 text-base font-black text-slate-950">{resumoControleMaoDeObraDds.mesReferencia}</p>
        </div>
    </div>


    <div className="mt-3 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-center text-xs font-bold leading-5 text-orange-900">
        <span className="font-black uppercase tracking-wide">Jornada padrão:</span>{" "}
        Expediente normal: Seg a qui 07:00 às 17:00 / sex 07:00 às 16:00, almoço das 12:00 às 13:00 / DDS das 07:00 às 07:10.
    </div>

    {false && relatorioIndicadoresSstDds && (
        <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/80 shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-200 bg-white px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">
                        Relatório analítico SST
                    </p>

                    <h4 className="mt-1 text-base font-black text-slate-950">
                        Indicadores consolidados do DDS
                    </h4>

                    <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                        Presença, cobertura, conformidade, risco, comparativos e engajamento sem repetir a lista bruta.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-emerald-800">
                        Implantação {relatorioIndicadoresSstDds.progressoImplantacao}%
                    </span>

                    <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-sky-800">
                        {relatorioIndicadoresSstDds.resumo.indicadoresCalculados}/{relatorioIndicadoresSstDds.resumo.indicadoresTotal} calculados
                    </span>
                </div>
            </div>

            <div className="grid gap-3 p-3 xl:grid-cols-2">
                {relatorioIndicadoresSstDds.blocos.map((bloco) => (
                    <section
                        key={bloco.titulo}
                        className="overflow-hidden rounded-xl border border-slate-200 bg-white"
                    >
                        <div className="border-b border-slate-200 bg-slate-100 px-3 py-2.5">
                            <h5 className="text-[10px] font-black uppercase tracking-wide text-slate-800">
                                {bloco.titulo}
                            </h5>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[620px] table-fixed border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 text-[8px] font-black uppercase tracking-wide text-slate-500">
                                        <th className="w-[26%] border-b border-slate-200 px-3 py-2 text-left">
                                            Indicador
                                        </th>

                                        <th className="w-[22%] border-b border-slate-200 px-3 py-2 text-center">
                                            Valor
                                        </th>

                                        <th className="w-[38%] border-b border-slate-200 px-3 py-2 text-left">
                                            Interpretação
                                        </th>

                                        <th className="w-[14%] border-b border-slate-200 px-3 py-2 text-center">
                                            Alerta
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {bloco.indicadores.map((indicador) => (
                                        <tr
                                            key={bloco.titulo + "-" + indicador.nome}
                                            className="align-top"
                                        >
                                            <td className="border-b border-slate-100 px-3 py-3 text-[10px] font-black leading-4 text-slate-800">
                                                {indicador.nome}
                                            </td>

                                            <td className="border-b border-slate-100 px-3 py-3 text-center text-[10px] font-black leading-4 text-slate-950">
                                                {indicador.valor}
                                            </td>

                                            <td className="border-b border-slate-100 px-3 py-3 text-[9px] font-semibold leading-4 text-slate-600">
                                                <p>
                                                    {indicador.interpretacao}
                                                </p>

                                                {Array.isArray(indicador.detalhes) &&
                                                    indicador.detalhes.length > 0 && (
                                                        <p className="mt-1.5 text-[8px] font-bold leading-4 text-slate-500">
                                                            {indicador.detalhes
                                                                .slice(0, 8)
                                                                .join(" • ")}
                                                        </p>
                                                    )}
                                            </td>

                                            <td className="border-b border-slate-100 px-2 py-3 text-center">
                                                <span
                                                    className={
                                                        "inline-flex rounded-full border px-2 py-1 text-[8px] font-black uppercase tracking-wide " +
                                                        (
                                                            indicador.nivel === "critico"
                                                                ? "border-red-200 bg-red-50 text-red-800"
                                                                : indicador.nivel === "atencao"
                                                                    ? "border-amber-200 bg-amber-50 text-amber-800"
                                                                    : indicador.nivel === "normal"
                                                                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                                                        : "border-slate-200 bg-slate-100 text-slate-600"
                                                        )
                                                    }
                                                >
                                                    {
                                                        indicador.nivel === "critico"
                                                            ? "🔴 Crítico"
                                                            : indicador.nivel === "atencao"
                                                                ? "🟡 Atenção"
                                                                : indicador.nivel === "normal"
                                                                    ? "🟢 Normal"
                                                                    : "⚪ Sem dado"
                                                    }
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                ))}
            </div>

            <section className="mx-3 mb-3 rounded-xl border border-red-200 bg-red-50 p-3">
                <p className="text-[10px] font-black uppercase tracking-wide text-red-800">
                    {relatorioIndicadoresSstDds?.tituloPontosAtencao ||
                        "Pontos de atenção"}
                </p>

                {relatorioIndicadoresSstDds.top3.length > 0 ? (
                    <div className="mt-2 grid gap-2 lg:grid-cols-3">
                        {relatorioIndicadoresSstDds.top3.map((indicador, indice) => (
                            <div
                                key={indicador.bloco + "-" + indicador.nome}
                                className="rounded-lg border border-red-100 bg-white px-3 py-2.5"
                            >
                                <p className="text-[8px] font-black uppercase tracking-wide text-red-600">
                                    Prioridade {indice + 1}
                                </p>

                                <p className="mt-1 text-[10px] font-black leading-4 text-slate-900">
                                    {indicador.nome}
                                </p>

                                <p className="mt-1 text-[9px] font-bold leading-4 text-slate-600">
                                    {indicador.valor}
                                </p>

                                <p className="mt-1 text-[8px] font-semibold leading-4 text-slate-500">
                                    {indicador.interpretacao}
                                </p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="mt-2 text-xs font-bold text-emerald-800">
                        Nenhum indicador calculável atingiu nível de atenção ou crítico.
                    </p>
                )}
            </section>
        </div>
    )}


                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 xl:flex-nowrap">
            <span className="shrink-0 whitespace-nowrap text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
                Calendário do relatório
            </span>

            <span
                aria-hidden="true"
                className="hidden h-4 w-px shrink-0 bg-slate-200 xl:block"
            />

            <span className="min-w-0 flex-1 xl:whitespace-nowrap">
                Aplicado automaticamente a partir da cidade/UF cadastrada na obra.
            </span>

            <span
                aria-hidden="true"
                className="hidden h-4 w-px shrink-0 bg-slate-200 xl:block"
            />

            <span className="shrink-0 whitespace-nowrap text-slate-500">
                Calendário aplicado:
            </span>

            <strong className="shrink-0 whitespace-nowrap text-slate-950">
                {calendarioMaoDeObraSelecionadoDds.rotulo}
            </strong>

            <span
                aria-hidden="true"
                className="hidden h-4 w-px shrink-0 bg-slate-200 xl:block"
            />

            <span className="shrink-0 whitespace-nowrap text-slate-500">
                Origem:
            </span>

            <strong className="shrink-0 whitespace-nowrap text-slate-950">
                {calendarioMaoDeObraSelecionadoDds.origem === "cadastro da obra"
                    ? "cadastro da obra"
                    : "padrão SafeScan"}
            </strong>
        </div>
        </>
    )}
</div>
)}

<section className="dds-no-print col-span-full min-h-[92px] w-full rounded-3xl border border-slate-200 border-t-4 border-t-indigo-500 bg-white p-4 shadow-sm">
    <div
    onClick={() => alternarCardDds("historicoMaoObra")}
    role="button"
    tabIndex={0}
    onKeyDown={(evento) => {
        if (evento.key === "Enter" || evento.key === " ") {
            alternarCardDds("historicoMaoObra");
        }
    }}
    className="grid min-h-[76px] cursor-default gap-4 rounded-xl transition hover:bg-slate-50 2xl:grid-cols-[minmax(0,1fr)_auto] 2xl:items-start"
>
        <div className="min-w-0 2xl:max-w-3xl">
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-wide">
                Histórico mensal
            </p>
            <h3 className="mt-1 text-base font-black text-slate-950">
                Histórico mensal de mão de obra
            </h3>
            <p className="mt-1 max-w-3xl text-xs font-semibold leading-5 text-slate-500">
                Busca os DDS da obra selecionada no mês informado e resume a base oficial salva na Conferência Assistida.
            </p>
        </div>

        <div className="flex w-full flex-wrap items-end gap-2 2xl:w-auto 2xl:self-start 2xl:flex-nowrap 2xl:justify-end" onClick={(evento) => evento.stopPropagation()}>
            <label className="block w-full sm:w-[150px]">
                <span className="mb-1 block text-[10px] font-black uppercase tracking-wide text-slate-500">
                    Mês/Ano
                </span>
                <input
                    type="month"
                    value={mesHistoricoMaoDeObraDds}
                    onChange={(evento) => setMesHistoricoMaoDeObraDds(evento.target.value)}
                    className="h-8 w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-800 outline-none transition focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                />
            </label>
            <button
                type="button"
                onClick={buscarHistoricoMensalMaoDeObraDds}
                disabled={carregandoHistoricoMensalMaoDeObraDds}
                className="h-8 min-w-[170px] shrink-0 whitespace-nowrap rounded-xl bg-slate-950 px-4 text-xs font-black uppercase tracking-wide text-white shadow-lg shadow-slate-900/15 transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
                {carregandoHistoricoMensalMaoDeObraDds ? "Buscando..." : "Buscar DDS do mês"}
            </button>

            <button
                type="button"
                onClick={imprimirHistoricoMensalMaoDeObraDds}
                className="h-8 min-w-[180px] shrink-0 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-wide text-slate-700 transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50"
            >
                Imprimir PDF mensal
            </button>

            <button
                type="button"
                onClick={exportarHistoricoMensalMaoDeObraDds}
                className="h-8 min-w-[190px] shrink-0 whitespace-nowrap rounded-xl bg-emerald-600 px-4 text-xs font-black uppercase tracking-wide text-white shadow-lg shadow-emerald-600/20 transition hover:-translate-y-0.5 hover:bg-emerald-700"
            >
                Exportar Excel mensal
            </button>

            <button
                type="button"
                onClick={() => alternarCardDds("historicoMaoObra")}
                className="shrink-0"
            >
                <BotaoAlternarCardDds
                    aberto={cardDdsAberto("historicoMaoObra")}
                />
            </button>
</div>
    </div>

    {cardDdsAberto("historicoMaoObra") && (
        <>
    <div className="mt-3 inline-flex max-w-full items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
        Obra base: <span className="font-black text-slate-900">{dadosDds.obraSetor || registroScannerDds?.obraNome || "Selecione uma obra cadastrada no DDS"}</span>
        {historicoMensalConsultadoEmDds && (
            <span className="text-[11px] font-bold text-slate-400">
                Consulta: {new Date(historicoMensalConsultadoEmDds).toLocaleString("pt-BR")}
            </span>
        )}
    </div>

    {erroHistoricoMensalMaoDeObraDds && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
            {erroHistoricoMensalMaoDeObraDds}
        </div>
    )}

    <div className="mt-3 grid gap-2.5 md:grid-cols-3 xl:grid-cols-7">
        <div className="flex min-h-[58px] flex-col items-center justify-center rounded-xl border border-slate-100 bg-white p-3 text-center">
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">DDS encontrados</p>
            <p className="mt-1 text-base font-black text-slate-950">{resumoHistoricoMensalMaoDeObraDds.ddsEncontrados}</p>
        </div>
        <div className="flex min-h-[58px] flex-col items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-center">
            <p className="text-[10px] font-black uppercase tracking-wide text-emerald-700">Concluídos</p>
            <p className="mt-1 text-base font-black text-emerald-900">{resumoHistoricoMensalMaoDeObraDds.ddsConcluidos}</p>
        </div>
        <div className="flex min-h-[58px] flex-col items-center justify-center rounded-xl border border-sky-100 bg-sky-50 p-3 text-center">
            <p className="text-[10px] font-black uppercase tracking-wide text-sky-700">Dias apurados</p>
            <p className="mt-1 text-base font-black text-sky-900">{resumoHistoricoMensalMaoDeObraDds.diasApurados}</p>
        </div>
        <div className="flex min-h-[58px] flex-col items-center justify-center rounded-xl border border-orange-100 bg-orange-50 p-3 text-center">
            <p className="text-[10px] font-black uppercase tracking-wide text-orange-700">Acumulado</p>
            <p className="mt-1 text-base font-black text-orange-900">{formatarNumeroMaoDeObraDds(resumoHistoricoMensalMaoDeObraDds.acumuladoPeriodo)}</p>
        </div>
        <div className="flex min-h-[58px] flex-col items-center justify-center rounded-xl border border-violet-100 bg-violet-50 p-3 text-center">
            <p className="text-[10px] font-black uppercase tracking-wide text-violet-700">Efetivo médio</p>
            <p className="mt-1 text-base font-black text-violet-900">{formatarNumeroMaoDeObraDds(resumoHistoricoMensalMaoDeObraDds.efetivoMedio)}</p>
        </div>
        <div className="flex min-h-[58px] flex-col items-center justify-center rounded-xl border border-amber-100 bg-amber-50 p-3 text-center">
            <p className="text-[10px] font-black uppercase tracking-wide text-amber-700">Em aberto</p>
            <p className="mt-1 text-base font-black text-amber-900">{resumoHistoricoMensalMaoDeObraDds.ddsPendentes}</p>
        </div>
        <div className="flex min-h-[58px] flex-col items-center justify-center rounded-xl border border-slate-100 bg-white p-3 text-center">
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Funções</p>
            <p className="mt-1 text-base font-black text-slate-950">{resumoHistoricoMensalMaoDeObraDds.funcoes}</p>
        </div>
    </div>

    {resumoHistoricoMensalMaoDeObraDds.possuiPendencias && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-bold text-amber-800">
            Existem DDS em aberto fora da consolidação oficial. O PDF/Excel mensal considera somente DDS concluídos.
        </div>
    )}

    {historicoMensalMaoDeObraDds.length > 0 && (
        <div className="mt-3 overflow-hidden rounded-xl border border-slate-100">
            <div className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-3 bg-slate-50 px-4 py-2 text-[10px] font-black uppercase tracking-wide text-slate-500">
                <span>DDS</span>
                <span>Período</span>
                <span>Status</span>
                <span>Ação</span>
            </div>
            {historicoMensalMaoDeObraDds.slice(0, 8).map((registro) => {
                const status = registroHistoricoMensalConcluidoDds(registro) ? "Concluído" : "Em aberto";

                return (
                    <div key={registro.id || registro.codigo} className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-3 border-t border-slate-100 px-3 py-2.5 text-xs font-bold text-slate-600">
                        <span className="truncate text-slate-900">{registro.codigo || "DDS sem código"}</span>
                        <span>{formatarDataControleMaoDeObraDds(registro.periodoInicio)} a {formatarDataControleMaoDeObraDds(registro.periodoFim)}</span>
                        <span className={status === "Concluído" ? "text-emerald-700" : "text-amber-700"}>{status}</span>
                        <button
                            type="button"
                            onClick={() => carregarRegistroHistoricoMensalDds(registro)}
                            disabled={carregandoScannerDds}
                            className={status === "Concluído"
                                ? "rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                                : "rounded-xl border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"}
                        >
                            {status === "Concluído" ? "Carregar DDS" : "Revisar DDS"}
                        </button>
                    </div>
                );
            })}
        </div>
    )}
        </>
    )}
</section>

{registroScannerDds && (
    <RelatorioAnaliticoSstDdsCard
        relatorio={relatorioIndicadoresSstDds}
        codigoDds={
            registroScannerDds?.codigo ||
            codigoConferenciaDds ||
            dadosDds?.codigo ||
            ""
        }
        obra={
            registroScannerDds?.obraNome ||
            registroScannerDds?.dados?.obraNome ||
            registroScannerDds?.dados?.obraSetor ||
            dadosDds?.obraSetor ||
            dadosDds?.obraNome ||
            ""
        }
        periodoInicio={
            registroScannerDds?.periodoInicio ||
            registroScannerDds?.dados?.periodoInicio ||
            dadosDds?.periodoInicio ||
            ""
        }
        periodoFim={
            registroScannerDds?.periodoFim ||
            registroScannerDds?.dados?.periodoFim ||
            dadosDds?.periodoFim ||
            ""
        }
    />
)}


{registroScannerDds && (
                                <div data-dds-registro-localizado className="min-h-[92px] rounded-3xl border border-slate-200 border-t-4 border-t-emerald-500 bg-white p-4 shadow-sm lg:col-span-2">
                                    <div
    onClick={() => alternarCardDds("registroLocalizado")}
    role="button"
    tabIndex={0}
    onKeyDown={(evento) => {
        if (evento.key === "Enter" || evento.key === " ") {
            evento.preventDefault();
            alternarCardDds("registroLocalizado");
        }
    }}
    className="flex min-h-[52px] cursor-default flex-col gap-3 rounded-xl transition hover:bg-slate-50 lg:flex-row lg:items-center lg:justify-between"
>
    <div className="min-w-0 flex-1">
        <p className="text-[10px] font-black uppercase tracking-wide text-emerald-700">
            Registro localizado
        </p>

        <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 lg:flex-nowrap">
            <strong className="shrink-0 whitespace-nowrap text-base font-black text-slate-950">
                {registroScannerDds.codigo}
            </strong>

            <span className="min-w-0 truncate text-xs font-semibold text-slate-600">
                {registroScannerDds.empresaNome || "Empresa não informada"} • {registroScannerDds.obraNome || "Obra não informada"}
            </span>

            <span className="shrink-0 whitespace-nowrap text-xs font-semibold text-slate-500">
                Período: {formatarDataExibicaoDds(registroScannerDds.periodoInicio)} a {formatarDataExibicaoDds(registroScannerDds.periodoFim)}
            </span>
        </div>
    </div>

    <div
        className="flex shrink-0 flex-wrap items-center gap-2"
        onClick={(evento) => evento.stopPropagation()}
    >
        {registroScannerDds.urlConferencia && (
            <a
                href={registroScannerDds.urlConferencia}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-800 transition hover:bg-emerald-100"
            >
                Abrir QR público
            </a>
        )}

        <button
            type="button"
            onClick={analisarDocumentoPersistidoDds}
            disabled={
                carregandoLeituraArquivoScannerDds ||
                excluindoDocumentoPersistidoDds
            }
            className="rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-black text-cyan-800 transition hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
            {carregandoLeituraArquivoScannerDds
                ? "Analisando PDF..."
                : "Analisar PDF salvo"}
        </button>

        <button
            type="button"
            onClick={excluirDocumentoPersistidoDds}
            disabled={
                excluindoDocumentoPersistidoDds ||
                carregandoLeituraArquivoScannerDds
            }
            className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
            {excluindoDocumentoPersistidoDds
                ? "Excluindo PDF..."
                : "Excluir PDF salvo"}
        </button>

        <button
            type="button"
            onClick={() => alternarCardDds("registroLocalizado")}
            className="shrink-0"
        >
            <BotaoAlternarCardDds
                aberto={cardDdsAberto("registroLocalizado")}
            />
        </button>
    </div>
</div>

{mensagemDocumentoPersistidoDds?.texto && (
    <p
        className={
            mensagemDocumentoPersistidoDds.tipo === "erro"
                ? "mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700"
                : "mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800"
        }
    >
        {mensagemDocumentoPersistidoDds.texto}
    </p>
)}

<div className="mt-4 grid gap-2 sm:grid-cols-3">
    {/* dds_rotulo_participantes_gabarito_registro_v1 */}
    <div className="flex min-h-[76px] flex-col items-center justify-center rounded-xl border border-violet-100 bg-violet-50 p-2.5 text-center ring-1 ring-violet-100">
        <p className="text-[10px] font-black uppercase tracking-wide text-violet-700">
            Participantes do gabarito
        </p>

        <p className="mt-1 text-lg font-black text-violet-950">
            {participantesRegistroScannerDds.length}
        </p>

        {Number(
            relatorioIndicadoresSstDds
                ?.composicaoBaseParticipantes
                ?.participantesComplementares ||
            0
        ) > 0 && (
            <p className="mt-1 text-[10px] font-bold leading-4 text-violet-700">
                Base analisada:{" "}
                {Number(
                    relatorioIndicadoresSstDds
                        ?.composicaoBaseParticipantes
                        ?.totalAnalisado ||
                    participantesRegistroScannerDds.length
                )}{" "}
                ({participantesRegistroScannerDds.length} +{" "}
                {Number(
                    relatorioIndicadoresSstDds
                        ?.composicaoBaseParticipantes
                        ?.participantesComplementares ||
                    0
                )} complementares)
            </p>
        )}
    </div>

    <div className="flex min-h-[56px] flex-col items-center justify-center rounded-xl border border-sky-100 bg-sky-50 p-2.5 text-center ring-1 ring-sky-100">
        <p className="text-[10px] font-black uppercase tracking-wide text-sky-700">
            Dias DDS
        </p>

        <p className="mt-1 text-lg font-black text-sky-950">
            {diasRegistroScannerDds.length || 7}
        </p>
    </div>

    <div className="flex min-h-[56px] flex-col items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 p-2.5 text-center ring-1 ring-emerald-100">
        <p className="text-[10px] font-black uppercase tracking-wide text-emerald-700">
            Status
        </p>

        <p className="mt-1 text-base font-black text-emerald-900">
            Gabarito carregado
        </p>
    </div>
</div>

                                    {cardDdsAberto("registroLocalizado") && participantesRegistroScannerDds.length > 0 && (
                                        <div className="mt-4 overflow-hidden rounded-xl border border-slate-100">
                                            <div className="max-h-64 overflow-auto">
                                                <table className="w-full border-collapse text-left text-xs">
                                                    <thead className="sticky top-0 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-400">
                                                        <tr>
                                                            <th className="px-3 py-2">Nº</th>
                                                            <th className="px-3 py-2">Nome</th>
                                                            <th className="px-3 py-2">Função</th>
                                                            <th className="px-3 py-2">Código SafeScan</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {participantesRegistroScannerDds.slice(0, 80).map((participante, indice) => (
                                                            <tr key={`${participante.nome || "participante"}-${indice}`}>
                                                                <td className="px-3 py-2 font-black text-slate-500">{participante.numero || indice + 1}</td>
                                                                <td className="px-3 py-2 font-bold text-slate-800">{participante.nome || "-"}</td>
                                                                <td className="px-3 py-2 text-slate-600">{participante.funcao || "-"}</td>
                                                                <td className="px-3 py-2 font-mono text-[11px] font-bold text-slate-700">{participante.codigoSafescan || participante.codigoFuncionario || "-"}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </section>

            <section className="dds-no-print min-h-[92px] rounded-3xl border border-slate-200 border-t-4 border-t-sky-500 bg-white p-4 shadow-sm">
                <div
                    onClick={() => alternarCardDds("temas")}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(evento) => { if (evento.key === "Enter" || evento.key === " ") alternarCardDds("temas"); }}
                    className="flex min-h-[52px] cursor-default flex-col gap-3 rounded-xl transition hover:bg-slate-50 lg:flex-row lg:items-center lg:justify-between"
                >
                    <div className="flex items-start gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700 ring-1 ring-sky-100">
                            <ClipboardList className="h-5 w-5" />
                        </span>
                        <div>
                            <h2 className="text-lg font-black text-slate-950">
                                Temas por dia da semana
                            </h2>
                            <p className="mt-1 text-sm font-semibold text-slate-500">
                                Informe o tema e o responsável de cada dia ou marque quando não houver atividades.
                            </p>
                        </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2" onClick={(evento) => evento.stopPropagation()}>
                        <button
                            type="button"
                            onClick={() => alternarCardDds("temas")}
                            className="shrink-0"
                        >
                            <BotaoAlternarCardDds aberto={cardDdsAberto("temas")} />
                        </button>
                    </div>
                </div>

                {cardDdsAberto("temas") && (
                    <>
                        <div className="mt-4 flex flex-col gap-2 rounded-xl border border-sky-100 bg-sky-50/60 p-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-wide text-sky-700">
                                    Preenchimento semanal
                                </p>
                                <p className="mt-0.5 text-xs font-bold text-slate-600">
                                    Responsável geral: {dadosDds.responsavel || "Não informado"}
                                </p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={aplicarResponsavelGeralTemasDds}
                                    className="rounded-xl border border-sky-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-wide text-sky-700 shadow-sm transition hover:bg-sky-100"
                                >
                                    Aplicar responsável a todos
                                </button>

                                <button
                                    type="button"
                                    onClick={limparResponsaveisTemasDds}
                                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-wide text-slate-600 shadow-sm transition hover:bg-slate-100"
                                >
                                    Limpar responsáveis
                                </button>
                            </div>
                        </div>

                        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-7">
                            {diasSemanaComTemasDds.map((dia, indice) => (
                                <div
                                    key={`${dia.curto}-${dia.data}`}
                                    className={`rounded-xl border p-3 ${
                                        dia.semAtividade
                                            ? "border-amber-200 bg-amber-50/70"
                                            : "border-slate-200 bg-slate-50"
                                    }`}
                                >
                                    <div className="rounded-xl bg-slate-950 px-3 py-2 text-center text-white">
                                        <p className="text-[10px] font-black uppercase tracking-wide">
                                            {dia.nome}
                                        </p>
                                        <p className="mt-0.5 text-xs font-black text-emerald-200">
                                            {dia.data}
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => alternarDiaSemAtividadeDds(indice)}
                                        className="mt-3 w-full rounded-xl border border-amber-200 bg-amber-50 px-2 py-2 text-[9px] font-black uppercase tracking-wide text-amber-800 transition hover:bg-amber-100"
                                    >
                                        {dia.semAtividade
                                            ? "Retomar preenchimento"
                                            : "Não houve atividades"}
                                    </button>

                                    <label className="mt-3 block">
                                        <span className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                                            Tema
                                        </span>
                                        <textarea
                                            value={temasDdsEditaveis[indice]?.tema || ""}
                                            onChange={(evento) => atualizarTemaDiaDds(indice, "tema", evento.target.value)}
                                            rows={3}
                                            disabled={dia.semAtividade}
                                            placeholder={dia.semAtividade ? "Dia sem atividade" : "Digite o tema do DDS"}
                                            className="mt-1 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold leading-5 text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                                        />
                                    </label>

                                    <label className="mt-2 block">
                                        <span className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                                            Responsável
                                        </span>
                                        <input
                                            type="text"
                                            value={temasDdsEditaveis[indice]?.responsavel || ""}
                                            onChange={(evento) => atualizarTemaDiaDds(indice, "responsavel", evento.target.value)}
                                            disabled={dia.semAtividade}
                                            placeholder={dia.semAtividade ? "Não se aplica" : "Nome do responsável"}
                                            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                                        />
                                    </label>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </section>

            <section className="dds-no-print min-h-[92px] rounded-3xl border border-slate-200 border-t-4 border-t-amber-500 bg-white p-4 shadow-sm">
                <div
                    onClick={() => alternarCardDds("recados")}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(evento) => { if (evento.key === "Enter" || evento.key === " ") alternarCardDds("recados"); }}
                    className="flex min-h-[52px] cursor-default flex-col gap-3 rounded-xl transition hover:bg-slate-50 lg:flex-row lg:items-center lg:justify-between"
                >
                    <div className="flex items-start gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700 ring-1 ring-amber-100">
                            <MessageSquareText className="h-5 w-5" />
                        </span>
                        <div>
                            <h2 className="text-lg font-black text-slate-950">
                                Recados da semana
                            </h2>
                            <p className="mt-1 text-sm font-semibold text-slate-500">
                                Mensagem opcional impressa no rodapé. Deixe em branco se não houver recado.
                            </p>
                        </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2" onClick={(evento) => evento.stopPropagation()}>
                    <button
                        type="button"
                        onClick={() => setRecadosDdsEditaveis("")}
                        className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-black text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-white"
                    >
                        Limpar recados
                    </button>
                        <button
                            type="button"
                            onClick={() => alternarCardDds("recados")}
                            className="shrink-0"
                        >
                            <BotaoAlternarCardDds aberto={cardDdsAberto("recados")} />
                        </button>
                    </div>
                </div>

                {cardDdsAberto("recados") && (
                <textarea
                    value={recadosDdsEditaveis}
                    onChange={(evento) => setRecadosDdsEditaveis(evento.target.value)}
                    rows={4}
                    placeholder="Ex.: Reforçar uso de óculos de segurança, organização do canteiro, atenção em atividades com máquinas..."
                    className="mt-4 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold leading-6 text-slate-800 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                />
                )}
            </section>

            <section className="dds-no-print min-h-[92px] rounded-3xl border border-slate-200 border-t-4 border-t-violet-500 bg-white p-4 shadow-sm">
                <div
                    onClick={() => alternarCardDds("orientacoes")}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(evento) => { if (evento.key === "Enter" || evento.key === " ") alternarCardDds("orientacoes"); }}
                    className="flex min-h-[52px] cursor-default flex-col gap-3 rounded-xl transition hover:bg-slate-50 lg:flex-row lg:items-center lg:justify-between"
                >
                    <div className="flex items-start gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700 ring-1 ring-violet-100">
                            <ListChecks className="h-5 w-5" />
                        </span>
                        <div>
                            <h2 className="text-lg font-black text-slate-950">
                                Orientações importantes
                            </h2>
                            <p className="mt-1 text-sm font-semibold text-slate-500">
                                Itens fixos de segurança exibidos no rodapé da folha.
                            </p>
                        </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2" onClick={(evento) => evento.stopPropagation()}>
                    <button
                        type="button"
                        onClick={restaurarOrientacoesPadraoDds}
                        className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-black text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-white"
                    >
                        Restaurar orientações padrão
                    </button>
                        <button
                            type="button"
                            onClick={() => alternarCardDds("orientacoes")}
                            className="shrink-0"
                        >
                            <BotaoAlternarCardDds aberto={cardDdsAberto("orientacoes")} />
                        </button>
                    </div>
                </div>

                {cardDdsAberto("orientacoes") && (
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                    {orientacoesDdsEditaveis.map((orientacao, indice) => (
                        <label
                            key={`orientacao-dds-${indice}`}
                            className="block rounded-xl border border-slate-200 bg-slate-50 p-3"
                        >
                            <span className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                                Orientação {indice + 1}
                            </span>
                            <textarea
                                value={orientacao}
                                onChange={(evento) => atualizarOrientacaoDds(indice, evento.target.value)}
                                rows={3}
                                className="mt-1 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold leading-5 text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                            />
                        </label>
                    ))}
                </div>
                )}
            </section>
            <section className="dds-no-print min-h-[92px] rounded-3xl border border-slate-200 border-t-4 border-t-slate-500 bg-white p-4 shadow-sm">
                <div
                    onClick={() => alternarCardDds("preview")}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(evento) => { if (evento.key === "Enter" || evento.key === " ") alternarCardDds("preview"); }}
                    className="flex min-h-[52px] cursor-default flex-col gap-3 rounded-xl transition hover:bg-slate-50 lg:flex-row lg:items-center lg:justify-between"
                >
                    <div className="flex items-start gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-700 ring-1 ring-slate-100">
                            <Printer className="h-5 w-5" />
                        </span>
                        <div>
                            <h2 className="text-lg font-black text-slate-950">
                                DDS impresso
                            </h2>
                            <p className="mt-1 text-sm font-semibold text-slate-500">
                                Prévia da folha semanal gerada para impressão.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={(evento) => { evento.stopPropagation(); alternarCardDds("preview"); }}
                        className="shrink-0"
                    >
                        <BotaoAlternarCardDds aberto={cardDdsAberto("preview")} />
                    </button>
                </div>
            </section>
            <div className={`dds-print-area space-y-6 ${cardDdsAberto("preview") ? "" : "hidden print:block"}`}>
                <DdsPreviewImpresso
                    participantes={primeiraFolhaParticipantes}
                    mostrarAssinaturas={totalFolhasDds === 1}
                    dadosDds={dadosDdsComRegistro}
                    diasSemana={diasSemanaComTemasDds}
                    aniversariantes={aniversariantesSemanaDds}
                />

                {folhasContinuacaoDds.map((participantes, indice) => (
                    <DdsPreviewImpressoContinuacao
                        key={`folha-dds-${indice + 2}`}
                        participantes={participantes}
                        dadosDds={dadosDdsComRegistro}
                        diasSemana={diasSemanaComTemasDds}
                        numeroPagina={indice + 2}
                        totalPaginas={totalFolhasDds}
                        ultimaFolha={indice === folhasContinuacaoDds.length - 1}
                        numeroInicial={LIMITE_PARTICIPANTES_PRIMEIRA_FOLHA_DDS + 1 + (indice * LIMITE_PARTICIPANTES_FOLHA_CONTINUACAO_DDS)}
                    />
                ))}
            </div>
        </div>
    );
}

export default DdsPage;
