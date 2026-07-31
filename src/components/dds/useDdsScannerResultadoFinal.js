import { useEffect, useMemo, useRef } from "react";

export default function useDdsScannerResultadoFinal({
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
}) {
    const chaveRestauracaoConferenciaRef = useRef("");

    useEffect(() => {
        const codigoRegistro = String(registroScannerDds?.codigo || "").trim();
        const atualizadoEmRegistro = String(registroScannerDds?.dados?.conferenciaAssistida?.atualizadoEm || "").trim();
        const chaveRestauracao = codigoRegistro
            ? `${codigoRegistro}|${atualizadoEmRegistro || "sem-versao"}`
            : "";

        if (!chaveRestauracao || diasRegistroScannerDds.length === 0) return;
        if (chaveRestauracaoConferenciaRef.current === chaveRestauracao) return;
        chaveRestauracaoConferenciaRef.current = chaveRestauracao;

        const conferenciaSalva =
            registroScannerDds?.dados?.conferenciaAssistida;

        const participantesSalvos = Array.isArray(
            conferenciaSalva?.participantes
        )
            ? conferenciaSalva.participantes
            : [];

        setParticipantesAdicionaisConferenciaDds(
            criarParticipantesAdicionaisConferenciaDds(
                participantesRegistroScannerDds,
                participantesSalvos
            )
        );

        const temasDiasSalvos = Array.isArray(
            conferenciaSalva?.temasDias
        )
            ? conferenciaSalva.temasDias
            : [];

        if (temasDiasSalvos.length > 0) {
            setTemasConferenciaAssistidaDds(
                diasRegistroScannerDds.map(
                    (dia, indice) => {
                        const salvoPorPosicao =
                            temasDiasSalvos.find(
                                (item) => {
                                    const valor =
                                        item?.posicaoSemana;

                                    const valido =
                                        valor !== null &&
                                        valor !== undefined &&
                                        String(valor).trim() !== "" &&
                                        Number.isInteger(
                                            Number(valor)
                                        );

                                    return (
                                        valido &&
                                        Number(valor) === indice
                                    );
                                }
                            );

                        const salvoPorDataOuDia =
                            temasDiasSalvos.find(
                                (item) =>
                                    (
                                        String(
                                            item?.data || ""
                                        ).trim() &&
                                        String(
                                            item?.data || ""
                                        ) ===
                                            String(
                                                dia?.data || ""
                                            )
                                    ) ||
                                    (
                                        String(
                                            item?.curto || ""
                                        ).trim() &&
                                        String(
                                            item?.curto || ""
                                        ) ===
                                            String(
                                                dia?.curto ||
                                                dia?.dia ||
                                                ""
                                            )
                                    )
                            );

                        const salvo =
                            salvoPorPosicao ||
                            temasDiasSalvos[indice] ||
                            salvoPorDataOuDia ||
                            {};
                        return {
                            temaConfirmado: String(
                                salvo?.temaConfirmado || ""
                            ),
                            responsavelConfirmado:
                                String(
                                    salvo?.responsavelConfirmado ||
                                        ""
                                ),
                            origemTemaConfirmado:
                                String(
                                    salvo?.origemTemaConfirmado ||
                                        ""
                                ),
                            origemDocumentalTemaConfirmado:
                                String(
                                    salvo?.origemDocumentalTemaConfirmado ||
                                        ""
                                ),
                            semAtividadeConfirmada:
                                salvo?.semAtividadeConfirmada ===
                                true,
                            jornadaTipo:
                                String(
                                    salvo?.jornadaTipo ||
                                    ""
                                ),
                            jornadaRotulo:
                                String(
                                    salvo?.jornadaRotulo ||
                                    ""
                                ),
                            horaEntrada:
                                salvo?.horaEntrada ??
                                undefined,
                            horaSaida:
                                salvo?.horaSaida ??
                                undefined,
                            horaInicioAlmoco:
                                salvo?.horaInicioAlmoco ??
                                undefined,
                            horaFimAlmoco:
                                salvo?.horaFimAlmoco ??
                                undefined,
                            horaInicioDds:
                                salvo?.horaInicioDds ??
                                undefined,
                            horaFimDds:
                                salvo?.horaFimDds ??
                                undefined,
                            minutosNormaisPrevistos:
                                Number(
                                    salvo
                                        ?.minutosNormaisPrevistos ||
                                    0
                                ),
                            minutosTrabalhados:
                                Number(
                                    salvo
                                        ?.minutosTrabalhados ||
                                    0
                                ),
                            minutosRegulares:
                                Number(
                                    salvo
                                        ?.minutosRegulares ||
                                    0
                                ),
                            minutosExtras:
                                Number(
                                    salvo
                                        ?.minutosExtras ||
                                    0
                                ),
                            minutosDds:
                                Number(
                                    salvo?.minutosDds ||
                                    0
                                ),
                            horasTrabalhadas:
                                Number(
                                    salvo
                                        ?.horasTrabalhadas ||
                                    0
                                ),
                            horasRegulares:
                                Number(
                                    salvo
                                        ?.horasRegulares ||
                                    0
                                ),
                            horasExtras:
                                Number(
                                    salvo?.horasExtras ||
                                    0
                                ),
                            jornadaValida:
                                salvo?.jornadaValida ===
                                true,
                            jornadaPendente:
                                salvo?.jornadaPendente ===
                                true,
                        };
                    }
                )
            );
        } else {
            const diasAtivosAntigos =
                Array.isArray(
                    conferenciaSalva?.diasAtivos
                )
                    ? conferenciaSalva.diasAtivos
                    : [];

            setTemasConferenciaAssistidaDds(
                diasRegistroScannerDds.map(
                    (dia, indice) => {
                        const existeNosDiasAtivos =
                            diasAtivosAntigos.some(
                                (item) => {
                                    const posicaoSalva =
                                        item?.posicaoSemana;

                                    const indiceSalvo =
                                        item?.indice;

                                    const indiceAssistidoSalvo =
                                        item?.indiceAssistido;

                                    const possuiPosicao =
                                        posicaoSalva !== null &&
                                        posicaoSalva !== undefined &&
                                        String(
                                            posicaoSalva
                                        ).trim() !== "" &&
                                        Number.isInteger(
                                            Number(
                                                posicaoSalva
                                            )
                                        );

                                    const possuiIndice =
                                        indiceSalvo !== null &&
                                        indiceSalvo !== undefined &&
                                        String(
                                            indiceSalvo
                                        ).trim() !== "" &&
                                        Number.isInteger(
                                            Number(
                                                indiceSalvo
                                            )
                                        );

                                    const possuiIndiceAssistido =
                                        indiceAssistidoSalvo !== null &&
                                        indiceAssistidoSalvo !== undefined &&
                                        String(
                                            indiceAssistidoSalvo
                                        ).trim() !== "" &&
                                        Number.isInteger(
                                            Number(
                                                indiceAssistidoSalvo
                                            )
                                        );

                                    const mesmaData =
                                        String(
                                            item?.data || ""
                                        ).trim() &&
                                        String(
                                            item?.data || ""
                                        ) ===
                                            String(
                                                dia?.data || ""
                                            );

                                    const mesmoDia =
                                        String(
                                            item?.curto || ""
                                        ).trim() &&
                                        String(
                                            item?.curto || ""
                                        ) ===
                                            String(
                                                dia?.curto ||
                                                dia?.dia ||
                                                ""
                                            );

                                    return (
                                        (
                                            possuiPosicao &&
                                            Number(
                                                posicaoSalva
                                            ) === indice
                                        ) ||
                                        (
                                            possuiIndice &&
                                            Number(
                                                indiceSalvo
                                            ) === indice
                                        ) ||
                                        (
                                            possuiIndiceAssistido &&
                                            Number(
                                                indiceAssistidoSalvo
                                            ) === indice + 1
                                        ) ||
                                        mesmaData ||
                                        mesmoDia
                                    );
                                }
                            );

                        return {
                            temaConfirmado: "",
                            responsavelConfirmado: "",
                            origemTemaConfirmado: "",
                            origemDocumentalTemaConfirmado: "",
                            semAtividadeConfirmada:
                                Boolean(
                                    conferenciaSalva &&
                                    diasAtivosAntigos.length >
                                        0 &&
                                    !existeNosDiasAtivos
                                ),
                        };
                    }
                )
            );
        }

        if (
            conferenciaSalva?.frequencia &&
            typeof conferenciaSalva.frequencia === "object"
        ) {
            setConferenciaAssistidaDds(
                conferenciaSalva.frequencia
            );
            setConferenciaAssistidaSalvaEmDds(
                conferenciaSalva.atualizadoEm || ""
            );
            setFechamentoConferenciaAssistidaDds(
                conferenciaSalva.fechamento || null
            );
            setReciboFinalEmitidoEmDds(
                conferenciaSalva.reciboFinal?.emitidoEm || ""
            );
            setErroConferenciaAssistidaDds("");
            setErroReciboFinalDds("");
            setErroFechamentoConferenciaDds("");
            return;
        }

        setConferenciaAssistidaDds({});
        setTemasConferenciaAssistidaDds(
            diasRegistroScannerDds.map(() => ({
                temaConfirmado: "",
                responsavelConfirmado: "",
                origemTemaConfirmado: "",
                origemDocumentalTemaConfirmado: "",
                semAtividadeConfirmada: false,
            }))
        );
        setConferenciaAssistidaSalvaEmDds("");
        setFechamentoConferenciaAssistidaDds(null);
        setReciboFinalEmitidoEmDds("");
        setErroConferenciaAssistidaDds("");
        setErroFechamentoConferenciaDds("");
        setErroReciboFinalDds("");
    }, [
        registroScannerDds?.codigo,
        registroScannerDds?.dados?.conferenciaAssistida?.atualizadoEm,
        participantesRegistroScannerDds,
        diasRegistroScannerDds,
    ]);
    const apuracaoDiariaScannerDds = useMemo(() => {
        const nomesDias = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
        const curtosDias = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

        const normalizar = (valor = "") => String(valor || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toUpperCase()
            .trim();

        const diasBase = Array.isArray(diasRegistroScannerDds) && diasRegistroScannerDds.length
            ? diasRegistroScannerDds
            : diasDds;

        const dias = Array.from({ length: 7 }, (_, indice) => {
            const dia = diasBase[indice] || {};
            const tema = String(dia?.tema || "").trim();
            const responsavel = String(dia?.responsavel || "").trim();
            const semAtividade = normalizar(tema) === "NAO HOUVE ATIVIDADES";

            return {
                indice,
                curto: dia?.curto || dia?.dia || curtosDias[indice],
                nome: dia?.nome || nomesDias[indice],
                data: dia?.data || "",
                tema: tema || "-",
                responsavel: responsavel || "-",
                semAtividade,
            };
        });

        const marcacoes = Array.isArray(leituraArquivoScannerDds?.marcacoesDdsDias)
            ? leituraArquivoScannerDds.marcacoesDdsDias
            : [];

        const leituraExecutada = Boolean(leituraArquivoScannerDds);
        const leituraTextoConfiavel = Boolean(qualidadeLeituraArquivoScannerDds?.confiavel);
        const leituraVisualComMarcacoes = marcacoes.some((item) => (
            item?.tipoMarcacao === "dia" ||
            item?.tipoMarcacao === "semana_completa" ||
            item?.assinatura_visual ||
            item?.x_visual
        ));
        const leituraConfiavel = leituraTextoConfiavel || leituraVisualComMarcacoes;
        const participantes = Array.isArray(preConferenciaParticipantesScannerDds?.participantes)
            ? preConferenciaParticipantesScannerDds.participantes
            : [];

        const obterMarcacao = ({ paginaEsperada, numeroLinha, diaIndice }) => marcacoes.find((item) => (
            Number(item?.pagina || 0) === Number(paginaEsperada || 0) &&
            Number(item?.numeroLinha || 0) === Number(numeroLinha || 0) &&
            Number(item?.diaIndice || 0) === Number(diaIndice || 0)
        ));

        const obterMarcacaoSemanaCompleta = ({ paginaEsperada, numeroLinha }) => marcacoes.find((item) => (
            Number(item?.pagina || 0) === Number(paginaEsperada || 0) &&
            Number(item?.numeroLinha || 0) === Number(numeroLinha || 0) &&
            (
                item?.tipoMarcacao === "semana_completa" ||
                Number(item?.diaIndice || 0) === 7
            )
        ));

        const diasAtivosDebugScannerDds = dias.filter((dia) => !dia.semAtividade);

        const debugLinhasScannerDds = participantes.map((participante) => {
            const paginaEsperada = Number(participante?.paginaEsperada || 0);
            const numero = Number(participante?.numero || 0);
            const numeroLinha = paginaEsperada <= 1
                ? numero
                : numero - 10 - ((paginaEsperada - 2) * 20);

            const linhaNaoAnalisada = participante?.status === "pagina_nao_analisada" || !paginaEsperada || numeroLinha <= 0;

            const marcacaoSemanaCompleta = linhaNaoAnalisada
                ? null
                : obterMarcacaoSemanaCompleta({ paginaEsperada, numeroLinha });

            const semanaCompleta = Boolean(marcacaoSemanaCompleta?.assinatura_visual);

            return {
                numero,
                nome: participante?.nome || "-",
                paginaEsperada,
                numeroLinha,
                linhaNaoAnalisada,
                semanaCompleta,
                semanaDensidade: Number(marcacaoSemanaCompleta?.assinatura_densidade || 0),
                dias: diasAtivosDebugScannerDds.map((dia) => {
                    const marcacao = linhaNaoAnalisada
                        ? null
                        : obterMarcacao({
                            paginaEsperada,
                            numeroLinha,
                            diaIndice: dia.indice,
                        });

                    const xVisual = Boolean(marcacao?.x_visual);
                    const presencaVisual = Boolean(marcacao?.assinatura_visual);

                    let status = "vazio";

                    if (linhaNaoAnalisada) {
                        status = "nao_analisado";
                    } else if (xVisual) {
                        status = "x";
                    } else if (presencaVisual) {
                        status = "presenca";
                    } else if (semanaCompleta) {
                        status = "semana_completa";
                    }

                    return {
                        indice: dia.indice,
                        curto: dia.curto,
                        status,
                        xVisual,
                        presencaVisual,
                        semanaCompleta,
                        densidade: Number(marcacao?.assinatura_densidade || 0),
                        densidadeAzul: Number(marcacao?.assinatura_densidade_azul || 0),
                        xDensidade: Number(marcacao?.x_densidade || 0),
                        xDensidadeEscura: Number(marcacao?.x_densidade_escura || 0),
                        xDensidadeAzul: Number(marcacao?.x_densidade_azul || 0),
                        xDiagPrincipal: Number(marcacao?.x_proporcao_diagonal_principal || 0),
                        xDiagSecundaria: Number(marcacao?.x_proporcao_diagonal_secundaria || 0),
                    };
                }),
            };
        }).filter((linha) => linha.numero > 0).slice(0, 30);

        const diasApurados = dias.map((dia) => {
            let presentesProvaveis = 0;
            let ausentesProvaveis = 0;
            let naoAnalisados = 0;
            let conferenciaManual = 0;
            let semanaCompletaMarcada = 0;

            const amostra = [];

            for (const participante of participantes) {
                const paginaEsperada = Number(participante?.paginaEsperada || 0);
                const numero = Number(participante?.numero || 0);
                const numeroLinha = paginaEsperada <= 1
                    ? numero
                    : numero - 10 - ((paginaEsperada - 2) * 20);

                if (dia.semAtividade) {
                    continue;
                }

                if (!leituraExecutada || !leituraConfiavel) {
                    conferenciaManual += 1;
                    continue;
                }

                if (participante?.status === "pagina_nao_analisada" || !paginaEsperada || numeroLinha <= 0) {
                    naoAnalisados += 1;
                    continue;
                }

                const marcacao = obterMarcacao({
                    paginaEsperada,
                    numeroLinha,
                    diaIndice: dia.indice,
                });

                const marcacaoSemanaCompleta = obterMarcacaoSemanaCompleta({
                    paginaEsperada,
                    numeroLinha,
                });

                const ausenciaMarcadaComX = Boolean(marcacao?.x_visual);
                const presencaNoDia = Boolean(marcacao?.assinatura_visual);
                const presencaSemanaCompleta = Boolean(marcacaoSemanaCompleta?.assinatura_visual);

                if (ausenciaMarcadaComX) {
                    ausentesProvaveis += 1;
                } else if (presencaNoDia || presencaSemanaCompleta) {
                    presentesProvaveis += 1;

                    if (presencaSemanaCompleta && !presencaNoDia) {
                        semanaCompletaMarcada += 1;
                    }

                    if (amostra.length < 5) {
                        amostra.push({
                            numero,
                            nome: participante?.nome || "-",
                            codigoSafescan: participante?.codigoSafescan || "-",
                            densidade: Number((marcacao || marcacaoSemanaCompleta)?.assinatura_densidade || 0),
                            origem: presencaSemanaCompleta && !presencaNoDia ? "semana_completa" : "dia",
                        });
                    }
                } else {
                    conferenciaManual += 1;
                }
            }

            let status = "Aguardando leitura";

            if (dia.semAtividade) {
                status = "Sem atividade";
            } else if (!leituraExecutada) {
                status = "Aguardando leitura";
            } else if (!leituraConfiavel) {
                status = "Exige conferência manual";
            } else if (naoAnalisados > 0) {
                status = "Parcial";
            } else {
                status = "Apurado";
            }

            return {
                ...dia,
                status,
                presentesProvaveis,
                ausentesProvaveis,
                naoAnalisados,
                conferenciaManual,
                semanaCompletaMarcada,
                homemDia: presentesProvaveis,
                amostra,
            };
        });

        const totais = diasApurados.reduce((acc, dia) => {
            acc.presentesProvaveis += dia.presentesProvaveis;
            acc.ausentesProvaveis += dia.ausentesProvaveis;
            acc.naoAnalisados += dia.naoAnalisados;
            acc.conferenciaManual += dia.conferenciaManual;
            acc.semanaCompletaMarcada += dia.semanaCompletaMarcada;
            acc.homemDiaSemana += dia.homemDia;
            return acc;
        }, {
            presentesProvaveis: 0,
            ausentesProvaveis: 0,
            naoAnalisados: 0,
            conferenciaManual: 0,
            semanaCompletaMarcada: 0,
            homemDiaSemana: 0,
        });

        return {
            dias: diasApurados,
            totais,
            debugLinhas: debugLinhasScannerDds,
            marcacoesEncontradas: marcacoes.filter((item) => item?.assinatura_visual || item?.x_visual).length,
            leituraExecutada,
            leituraConfiavel,
        };
    }, [
        diasRegistroScannerDds,
        leituraArquivoScannerDds,
        preConferenciaParticipantesScannerDds,
        qualidadeLeituraArquivoScannerDds,
    ]);

    const resultadoFinalScannerDds = useMemo(() => {
        const gabaritoCarregado = Boolean(registroScannerDds);
        const folhaAnexada = Boolean(arquivoScannerDds);
        const leituraExecutada = Boolean(leituraArquivoScannerDds);
        const leituraTextoConfiavel = Boolean(qualidadeLeituraArquivoScannerDds?.confiavel);
        const leituraVisualComMarcacoesResultadoDds = Array.isArray(leituraArquivoScannerDds?.marcacoesDdsDias) && leituraArquivoScannerDds.marcacoesDdsDias.some((item) => (
            item?.tipoMarcacao === "dia" ||
            item?.tipoMarcacao === "semana_completa" ||
            item?.assinatura_visual ||
            item?.x_visual
        ));
        const leituraConfiavel = leituraTextoConfiavel || leituraVisualComMarcacoesResultadoDds;
        const participantesTotal = Number(preConferenciaParticipantesScannerDds?.total || 0);
        const participantesLocalizados = Number(preConferenciaParticipantesScannerDds?.localizados || 0);
        const participantesManuais = Number(preConferenciaParticipantesScannerDds?.manuais || 0);
        const participantesNaoLocalizados = Number(preConferenciaParticipantesScannerDds?.naoLocalizados || 0);
        const participantesPendentes = Number(preConferenciaParticipantesScannerDds?.pendentes || 0);
        const participantesPaginasNaoAnalisadas = Number(preConferenciaParticipantesScannerDds?.paginasNaoAnalisadas || 0);

        const itens = [
            {
                titulo: "Gabarito digital",
                ok: gabaritoCarregado,
                detalhe: gabaritoCarregado ? "Registro DDS carregado." : "Gabarito DDS ainda não carregado.",
            },
            {
                titulo: "Folha assinada",
                ok: folhaAnexada,
                detalhe: folhaAnexada ? "Arquivo anexado para conferência." : "Folha assinada ainda não anexada.",
            },
            {
                titulo: "Leitura inicial",
                ok: leituraExecutada && leituraConfiavel,
                detalhe: leituraExecutada
                    ? qualidadeLeituraArquivoScannerDds.statusConferencia
                    : "Leitura inicial ainda não executada.",
                manual: leituraExecutada && !leituraConfiavel,
            },
            {
                titulo: "Diagnóstico estrutural",
                ok: diagnosticoEstruturalScannerDds?.statusVisual === "ok",
                detalhe: diagnosticoEstruturalScannerDds?.statusGeral || "Aguardando diagnóstico estrutural.",
                manual: diagnosticoEstruturalScannerDds?.statusVisual === "manual",
            },
            {
                titulo: "Participantes",
                ok: participantesTotal > 0 && participantesLocalizados === participantesTotal,
                detalhe: `${participantesLocalizados}/${participantesTotal} participante(s) localizado(s); ${participantesManuais} em conferência manual; ${participantesPaginasNaoAnalisadas} em página não anexada/lida.`,
                manual: participantesTotal > 0 && (participantesManuais > 0 || participantesNaoLocalizados > 0 || participantesPendentes > 0),
            },
            {
                titulo: "OCR visual auxiliar",
                ok: false,
                detalhe: "Não há validação grafológica automática. A assinatura permanece como conferência visual provável/manual.",
                manual: true,
            },
        ];

        let statusFinal = "Exige conferência manual";
        let statusVisual = "manual";
        let titulo = "Exige conferência manual";
        let descricao = "A conferência automática não tem base suficiente para concluir o DDS sem revisão humana.";

        if (!gabaritoCarregado || !folhaAnexada || !leituraExecutada) {
            statusFinal = "Parcial";
            statusVisual = "parcial";
            titulo = "Conferência parcial";
            descricao = "Ainda faltam etapas obrigatórias para concluir a conferência do DDS.";
        } else if (
            leituraConfiavel &&
            diagnosticoEstruturalScannerDds?.statusVisual === "ok" &&
            participantesTotal > 0 &&
            participantesLocalizados === participantesTotal
        ) {
            statusFinal = "Conferido";
            statusVisual = "ok";
            titulo = "DDS conferido tecnicamente";
            descricao = "Gabarito, folha, leitura e participantes ficaram compatíveis. O OCR visual é apenas apoio técnico; a frequência oficial deve ser confirmada na Conferência Assistida.";
        } else if (
            leituraConfiavel &&
            participantesLocalizados > 0 &&
            participantesLocalizados < participantesTotal
        ) {
            statusFinal = "Parcial";
            statusVisual = "parcial";
            titulo = "Conferência parcial";
            descricao = "Parte dos dados foi localizada, mas ainda existem páginas complementares não anexadas/lidas.";
        }

        const recomendacoes = [];

        if (!gabaritoCarregado) {
            recomendacoes.push("Buscar o registro DDS pelo código impresso antes de concluir.");
        }

        if (!folhaAnexada) {
            recomendacoes.push("Anexar a folha DDS assinada em PDF ou imagem.");
        }

        if (!leituraExecutada) {
            recomendacoes.push("Executar a leitura inicial do arquivo anexado.");
        }

        if (leituraExecutada && !leituraConfiavel) {
            recomendacoes.push("Refazer o scan em melhor qualidade, preferencialmente alinhado, sem rotação e com boa iluminação.");
        }

        if (participantesManuais > 0 || participantesNaoLocalizados > 0 || participantesPaginasNaoAnalisadas > 0) {
            recomendacoes.push("Conferir manualmente as linhas dos participantes marcados como manual/não localizados e anexar as páginas complementares quando houver página não analisada.");
        }

        recomendacoes.push("Não usar o resultado como validação grafológica; manter conferência visual/documental.");

        return {
            statusFinal,
            statusVisual,
            titulo,
            descricao,
            itens,
            recomendacoes,
            resumo: {
                participantesTotal,
                participantesLocalizados,
                participantesManuais,
                participantesNaoLocalizados,
                participantesPendentes,
                participantesPaginasNaoAnalisadas,
            },
        };
    }, [
        arquivoScannerDds,
        diagnosticoEstruturalScannerDds,
        leituraArquivoScannerDds,
        preConferenciaParticipantesScannerDds,
        qualidadeLeituraArquivoScannerDds,
        registroScannerDds,
    ]);

    return {
        resultadoFinalScannerDds,
    };
}
