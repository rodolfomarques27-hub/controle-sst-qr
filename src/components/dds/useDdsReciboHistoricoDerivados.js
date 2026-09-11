import { useMemo } from "react";
import { normalizarFuncaoMaoDeObraDds } from "./DdsPageMaoDeObraSupport";

function obterDataIsoResumoHistoricoDds(valor = "") {
    const texto = String(valor || "").trim();

    const formatoBr = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto);

    if (formatoBr) {
        return `${formatoBr[3]}-${formatoBr[2]}-${formatoBr[1]}`;
    }

    const formatoIso = /^(\d{4})-(\d{2})-(\d{2})/.exec(texto);

    if (formatoIso) {
        return `${formatoIso[1]}-${formatoIso[2]}-${formatoIso[3]}`;
    }

    return "";
}

export default function useDdsReciboHistoricoDerivados({
    codigoConferenciaDds,
    conferenciaOficialConcluidaDds,
    dadosDds,
    estatisticasConferenciaAssistidaDds,
    fechamentoConferenciaAssistidaDds,
    historicoMensalMaoDeObraDds,
    mesHistoricoMaoDeObraDds,
    obterChaveFrequenciaAssistidaDds,
    registroHistoricoMensalConcluidoDds,
    registroScannerDds,
    resultadoFinalApresentacaoDds,
}) {
    const resumoHistoricoMensalMaoDeObraDds = useMemo(() => {
        const registros = Array.isArray(historicoMensalMaoDeObraDds)
            ? historicoMensalMaoDeObraDds
            : [];

        const registrosConcluidos = registros.filter(
            (registro) => registroHistoricoMensalConcluidoDds(registro)
        );

        const mesSelecionado = String(
            mesHistoricoMaoDeObraDds || ""
        ).trim();

        const possuiMesSelecionado = /^\d{4}-\d{2}$/.test(
            mesSelecionado
        );

        const diasApurados = new Set();
        const diasChuva = new Set();
        const empresas = new Set();
        const funcoes = new Set();

        let acumuladoPeriodo = 0;

        registrosConcluidos.forEach((registro) => {
            const dados = registro?.dados || {};
            const conferencia = dados?.conferenciaAssistida || {};
            const frequencia = conferencia?.frequencia || {};
            const participantes = Array.isArray(conferencia?.participantes)
                ? conferencia.participantes
                : [];
            const diasAtivos = Array.isArray(conferencia?.diasAtivos)
                ? conferencia.diasAtivos
                : [];
            const temasDias = Array.isArray(conferencia?.temasDias)
                ? conferencia.temasDias
                : [];
            const diasSemanaRegistro = Array.isArray(dados?.diasSemana)
                ? dados.diasSemana
                : [];

            const diasAtivosMes = diasAtivos.filter((dia) => {
                const dataIso = obterDataIsoResumoHistoricoDds(
                    dia?.data || dia?.dataDds || dia?.dia || ""
                );

                if (!dataIso) return false;

                return !possuiMesSelecionado ||
                    dataIso.slice(0, 7) === mesSelecionado;
            });

            temasDias.forEach((temaDia, indiceDia) => {
                if (temaDia?.chuvaConfirmada !== true) return;

                const diaSemana = diasSemanaRegistro[indiceDia] || {};
                const dataIso = obterDataIsoResumoHistoricoDds(
                    diaSemana?.data || diaSemana?.dataDds || diaSemana?.dia || ""
                );

                if (!dataIso) return;

                if (
                    possuiMesSelecionado &&
                    dataIso.slice(0, 7) !== mesSelecionado
                ) {
                    return;
                }

                diasChuva.add(dataIso);
            });
            const empresaNome = String(
                registro?.empresaNome ||
                dados?.empresaNome ||
                dados?.empresa ||
                ""
            ).trim();

            if (empresaNome) {
                empresas.add(empresaNome);
            }

            diasAtivosMes.forEach((dia) => {
                const dataIso = obterDataIsoResumoHistoricoDds(
                    dia?.data || dia?.dataDds || dia?.dia || ""
                );

                if (dataIso) {
                    diasApurados.add(dataIso);
                }
            });

            participantes.forEach((participante) => {
                const numero =
                    participante?.numero ||
                    participante?.ordem ||
                    participante?.indice ||
                    "";

                const funcao = String(
                    participante?.funcao ||
                    participante?.cargo ||
                    ""
                ).trim();

                if (funcao) {
                    funcoes.add(
                        normalizarFuncaoMaoDeObraDds(funcao)
                    );
                }

                diasAtivosMes.forEach((dia) => {
                    const chave =
                        typeof obterChaveFrequenciaAssistidaDds === "function"
                            ? obterChaveFrequenciaAssistidaDds(numero, dia)
                            : "";

                    const status = String(
                        frequencia?.[chave] || ""
                    )
                        .trim()
                        .toLowerCase();

                    if (status === "presente" || status === "p") {
                        acumuladoPeriodo += 1;
                    }
                });
            });
        });

        const quantidadeDias = diasApurados.size;
        const efetivoMedio = quantidadeDias > 0
            ? acumuladoPeriodo / quantidadeDias
            : 0;

        const ddsConcluidos = registrosConcluidos.length;
        const ddsPendentes = Math.max(
            registros.length - ddsConcluidos,
            0
        );

        return {
            ddsEncontrados: registros.length,
            ddsConcluidos,
            ddsPendentes,
            diasApurados: quantidadeDias,
            diasChuva: diasChuva.size,
            acumuladoPeriodo,
            efetivoMedio,
            empresas: empresas.size,
            funcoes: funcoes.size,
            possuiPendencias: ddsPendentes > 0,
        };
    }, [
        historicoMensalMaoDeObraDds,
        mesHistoricoMaoDeObraDds,
        obterChaveFrequenciaAssistidaDds,
        registroHistoricoMensalConcluidoDds,
    ]);

    const reciboConferenciaFinalDds = useMemo(() => {
        if (!conferenciaOficialConcluidaDds || !fechamentoConferenciaAssistidaDds || !resultadoFinalApresentacaoDds?.modoAssistido) {
            return null;
        }

        const dadosRegistro = registroScannerDds?.dados || {};
        const resumoResultado = resultadoFinalApresentacaoDds?.resumo || {};
        const resumoFechamento = fechamentoConferenciaAssistidaDds?.resumo || {};
        const estatisticasFechamento = fechamentoConferenciaAssistidaDds?.estatisticas || {};

        const codigo = registroScannerDds?.codigo || codigoConferenciaDds || dadosDds.codigo || fechamentoConferenciaAssistidaDds.codigo || "";
        const empresa = registroScannerDds?.empresaNome || dadosRegistro.empresaNome || dadosRegistro.empresa || dadosDds.empresaNome || "Empresa não informada";
        const obra = registroScannerDds?.obraNome || dadosRegistro.obraNome || dadosRegistro.obra || dadosDds.obraNome || "Obra não informada";
        const periodoInicio = registroScannerDds?.periodoInicio || dadosRegistro.periodoInicio || dadosDds.periodoInicio || "-";
        const periodoFim = registroScannerDds?.periodoFim || dadosRegistro.periodoFim || dadosDds.periodoFim || "-";
        const urlConferencia = registroScannerDds?.urlConferencia || dadosRegistro.urlConferencia || dadosDds.qrConferenciaUrl || "";

        const obterNumeroReciboDds = (
            valor,
            fallback = 0
        ) => {
            const numero = Number(
                valor ?? fallback ?? 0
            );

            return Number.isFinite(numero)
                ? numero
                : 0;
        };

        const participantes = obterNumeroReciboDds(
            resumoFechamento.participantes ??
            resumoResultado.participantesTotal
        );

        const presencas = obterNumeroReciboDds(
            resumoFechamento.presencas ??
            resumoResultado.presencas
        );

        const ausencias = obterNumeroReciboDds(
            resumoFechamento.ausencias ??
            resumoResultado.ausencias
        );

        const manuais = obterNumeroReciboDds(
            resumoFechamento.manuais ??
            resumoResultado.manuais
        );

        const homemDia = obterNumeroReciboDds(
            resumoFechamento.homemDia ??
            resumoResultado.homemDia
        );

        const funcionariosSemanaCompleta =
            obterNumeroReciboDds(
                resumoFechamento.funcionariosSemanaCompleta ??
                resumoResultado.funcionariosSemanaCompleta
            );

        const participantesAdicionais =
            obterNumeroReciboDds(
                resumoFechamento.participantesAdicionais ??
                resumoResultado.participantesAdicionais ??
                estatisticasFechamento.participantesAdicionais ?? estatisticasConferenciaAssistidaDds.participantesAdicionais
            );

        const presencasAdicionais =
            obterNumeroReciboDds(
                resumoFechamento.presencasAdicionais ??
                resumoResultado.presencasAdicionais ??
                estatisticasFechamento.presencasAdicionais ?? estatisticasConferenciaAssistidaDds.presencasAdicionais
            );

        const ausenciasAdicionais =
            obterNumeroReciboDds(
                resumoFechamento.ausenciasAdicionais ??
                resumoResultado.ausenciasAdicionais ??
                estatisticasFechamento.ausenciasAdicionais ?? estatisticasConferenciaAssistidaDds.ausenciasAdicionais
            );

        const manuaisAdicionais =
            obterNumeroReciboDds(
                resumoFechamento.manuaisAdicionais ??
                resumoResultado.manuaisAdicionais ??
                estatisticasFechamento.manuaisAdicionais ?? estatisticasConferenciaAssistidaDds.manuaisAdicionais
            );

        const homemDiaAdicionais =
            obterNumeroReciboDds(
                resumoFechamento.homemDiaAdicionais ??
                resumoResultado.homemDiaAdicionais ??
                estatisticasFechamento.homemDiaAdicionais ?? estatisticasConferenciaAssistidaDds.homemDiaAdicionais
            );

        const semanaCompletaAdicionais =
            obterNumeroReciboDds(
                resumoFechamento.semanaCompletaAdicionais ??
                resumoResultado.semanaCompletaAdicionais ??
                estatisticasFechamento.semanaCompletaAdicionais ?? estatisticasConferenciaAssistidaDds.semanaCompletaAdicionais
            );

        return {
            codigo,
            empresa,
            obra,
            periodoInicio,
            periodoFim,
            urlConferencia,
            concluidoEm:
                fechamentoConferenciaAssistidaDds.concluidoEm ||
                "",
            status:
                "Conferência concluída oficialmente",
            participantes,
            participantesCadastrados:
                obterNumeroReciboDds(
                    resumoFechamento.participantesCadastrados ??
                    resumoResultado.participantesCadastrados ??
                    estatisticasFechamento.participantesCadastrados ?? estatisticasConferenciaAssistidaDds.participantesCadastrados,
                    Math.max(
                        0,
                        participantes -
                        participantesAdicionais
                    )
                ),
            participantesAdicionais,
            presencas,
            presencasCadastrados:
                obterNumeroReciboDds(
                    resumoFechamento.presencasCadastrados ??
                    resumoResultado.presencasCadastrados ??
                    estatisticasFechamento.presencasCadastrados ?? estatisticasConferenciaAssistidaDds.presencasCadastrados,
                    Math.max(
                        0,
                        presencas -
                        presencasAdicionais
                    )
                ),
            presencasAdicionais,
            ausencias,
            ausenciasCadastrados:
                obterNumeroReciboDds(
                    resumoFechamento.ausenciasCadastrados ??
                    resumoResultado.ausenciasCadastrados ??
                    estatisticasFechamento.ausenciasCadastrados ?? estatisticasConferenciaAssistidaDds.ausenciasCadastrados,
                    Math.max(
                        0,
                        ausencias -
                        ausenciasAdicionais
                    )
                ),
            ausenciasAdicionais,
            manuais,
            manuaisCadastrados:
                obterNumeroReciboDds(
                    resumoFechamento.manuaisCadastrados ??
                    resumoResultado.manuaisCadastrados ??
                    estatisticasFechamento.manuaisCadastrados ?? estatisticasConferenciaAssistidaDds.manuaisCadastrados,
                    Math.max(
                        0,
                        manuais -
                        manuaisAdicionais
                    )
                ),
            manuaisAdicionais,
            homemDia,
            homemDiaCadastrados:
                obterNumeroReciboDds(
                    resumoFechamento.homemDiaCadastrados ??
                    resumoResultado.homemDiaCadastrados ??
                    estatisticasFechamento.homemDiaCadastrados ?? estatisticasConferenciaAssistidaDds.homemDiaCadastrados,
                    Math.max(
                        0,
                        homemDia -
                        homemDiaAdicionais
                    )
                ),
            homemDiaAdicionais,
            diasAtivos: obterNumeroReciboDds(
                resumoFechamento.diasAtivos ??
                resumoResultado.diasAtivos ??
                estatisticasFechamento.diasAtivos
            ),
            funcionariosSemanaCompleta,
            semanaCompletaCadastrados:
                obterNumeroReciboDds(
                    resumoFechamento.semanaCompletaCadastrados ??
                    resumoResultado.semanaCompletaCadastrados ??
                    estatisticasFechamento.semanaCompletaCadastrados ?? estatisticasConferenciaAssistidaDds.semanaCompletaCadastrados,
                    Math.max(
                        0,
                        funcionariosSemanaCompleta -
                        semanaCompletaAdicionais
                    )
                ),
            semanaCompletaAdicionais,
        };
    }, [
        codigoConferenciaDds,
        conferenciaOficialConcluidaDds,
        dadosDds,
        fechamentoConferenciaAssistidaDds,
        estatisticasConferenciaAssistidaDds,
        registroScannerDds,
        resultadoFinalApresentacaoDds,
    ]);

    return {
        reciboConferenciaFinalDds,
        resumoHistoricoMensalMaoDeObraDds,
    };
}
