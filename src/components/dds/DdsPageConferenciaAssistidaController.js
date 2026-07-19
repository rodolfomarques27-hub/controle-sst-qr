export default function criarControladorConferenciaAssistidaDds({
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
}) {
    function atualizarTemaConferenciaAssistidaDds(
        indiceDia,
        campo,
        valor
    ) {
        if (conferenciaOficialConcluidaDds) return;

        setTemasConferenciaAssistidaDds((atuais) =>
            diasRegistroScannerDds.map((_, indice) => {
                const atual =
                    atuais[indice] &&
                    typeof atuais[indice] === "object"
                        ? atuais[indice]
                        : {};

                if (indice !== indiceDia) return atual;

                return {
                    ...atual,
                    [campo]: String(valor ?? ""),
                    origemTemaConfirmado:
                        "transcricao_manual",
                    semAtividadeConfirmada: false,
                };
            })
        );

        setErroFechamentoConferenciaDds("");
    }

    function usarPlanejamentoTemaConferenciaAssistidaDds(
        indiceDia
    ) {
        if (conferenciaOficialConcluidaDds) return;

        const dia =
            diasConferenciaAssistidaDds[indiceDia];

        if (!dia) return;

        setTemasConferenciaAssistidaDds((atuais) =>
            diasRegistroScannerDds.map((_, indice) => {
                const atual =
                    atuais[indice] &&
                    typeof atuais[indice] === "object"
                        ? atuais[indice]
                        : {};

                if (indice !== indiceDia) return atual;

                return {
                    ...atual,
                    temaConfirmado:
                        dia.semAtividadePlanejada
                            ? ""
                            : dia.temaPlanejado,
                    responsavelConfirmado:
                        dia.semAtividadePlanejada
                            ? ""
                            : dia.responsavelPlanejado,
                    origemTemaConfirmado:
                        "planejamento_confirmado",
                    semAtividadeConfirmada:
                        Boolean(
                            dia.semAtividadePlanejada
                        ),
                };
            })
        );

        setErroFechamentoConferenciaDds("");
    }

    function alternarSemAtividadeConferenciaAssistidaDds(
        indiceDia
    ) {
        if (conferenciaOficialConcluidaDds) return;

        setTemasConferenciaAssistidaDds((atuais) =>
            diasRegistroScannerDds.map((_, indice) => {
                const atual =
                    atuais[indice] &&
                    typeof atuais[indice] === "object"
                        ? atuais[indice]
                        : {};

                if (indice !== indiceDia) return atual;

                const proximoSemAtividade =
                    atual.semAtividadeConfirmada !== true;

                return {
                    ...atual,
                    temaConfirmado:
                        proximoSemAtividade
                            ? ""
                            : String(
                                atual.temaConfirmado || ""
                            ),
                    responsavelConfirmado:
                        proximoSemAtividade
                            ? ""
                            : String(
                                atual.responsavelConfirmado || ""
                            ),
                    origemTemaConfirmado:
                        "transcricao_manual",
                    semAtividadeConfirmada:
                        proximoSemAtividade,
                };
            })
        );

        setErroFechamentoConferenciaDds("");
    }

    function montarTemasDiasConferenciaAssistidaDds() {
        return diasConferenciaAssistidaDds.map(
            (dia) => ({
                posicaoSemana: dia.posicaoSemana,
                indice: dia.indice,
                indiceAssistido: dia.indiceAssistido,
                chaveAssistida: dia.chaveAssistida,
                nome: dia.nome,
                curto: dia.curto,
                data: dia.data,
                temaPlanejado: dia.temaPlanejado,
                responsavelPlanejado:
                    dia.responsavelPlanejado,
                semAtividadePlanejada:
                    Boolean(
                        dia.semAtividadePlanejada
                    ),
                temaConfirmado: dia.temaConfirmado,
                responsavelConfirmado:
                    dia.responsavelConfirmado,
                origemTemaConfirmado:
                    dia.origemTemaConfirmado || "",
                semAtividadeConfirmada:
                    Boolean(
                        dia.semAtividadeConfirmada
                    ),
                status: dia.statusTranscricao,
            })
        );
    }

    function limparFrequenciaParticipanteAdicionalDds(numero) {
        const numeroSeguro = Number(numero || 0);

        if (!numeroSeguro) return;

        setConferenciaAssistidaDds((atual) => {
            const proximo = { ...atual };

            for (const dia of diasAtivosConferenciaAssistidaDds) {
                delete proximo[
                    obterChaveFrequenciaAssistidaDds(
                        numeroSeguro,
                        dia
                    )
                ];
            }

            return proximo;
        });
    }

    function atualizarParticipanteAdicionalConferenciaDds(
        indice,
        campo,
        valor
    ) {
        if (conferenciaOficialConcluidaDds) return;

        const valorSeguro = String(valor ?? "");
        const participanteAtual =
            participantesAdicionaisConferenciaDds[indice];

        if (
            campo === "nome" &&
            !valorSeguro.trim() &&
            participanteAtual?.numero
        ) {
            limparFrequenciaParticipanteAdicionalDds(
                participanteAtual.numero
            );
        }

        setParticipantesAdicionaisConferenciaDds((atuais) =>
            atuais.map((participante, indiceAtual) =>
                indiceAtual === indice
                    ? {
                        ...participante,
                        [campo]: valorSeguro,
                    }
                    : participante
            )
        );
    }

    function limparParticipanteAdicionalConferenciaDds(indice) {
        if (conferenciaOficialConcluidaDds) return;

        const participante =
            participantesAdicionaisConferenciaDds[indice];

        limparFrequenciaParticipanteAdicionalDds(
            participante?.numero
        );

        setParticipantesAdicionaisConferenciaDds((atuais) =>
            atuais.map((item, indiceAtual) =>
                indiceAtual === indice
                    ? {
                        ...item,
                        nome: "",
                        funcao: "",
                        empresa: "",
                    }
                    : item
            )
        );
    }

    function definirStatusFrequenciaAssistidaDds(numero, diaRef, status) {
        if (conferenciaOficialConcluidaDds) return;

        const chave = obterChaveFrequenciaAssistidaDds(numero, diaRef);

        setConferenciaAssistidaDds((atual) => ({
            ...atual,
            [chave]: status,
        }));
    }

    function marcarSemanaCompletaAssistidaDds(numero) {
        if (conferenciaOficialConcluidaDds) return;

        setConferenciaAssistidaDds((atual) => {
            const proximo = { ...atual };

            for (const dia of diasAtivosConferenciaAssistidaDds) {
                proximo[obterChaveFrequenciaAssistidaDds(numero, dia)] = "presente";
            }

            return proximo;
        });
    }

    function limparParticipanteConferenciaAssistidaDds(numero) {
        if (conferenciaOficialConcluidaDds) return;

        setConferenciaAssistidaDds((atual) => {
            const proximo = { ...atual };

            for (const dia of diasAtivosConferenciaAssistidaDds) {
                proximo[obterChaveFrequenciaAssistidaDds(numero, dia)] = "manual";
            }

            return proximo;
        });
    }

    function limparConferenciaAssistidaDds() {
        if (conferenciaOficialConcluidaDds) return;

        setConferenciaAssistidaDds({});
        setTemasConferenciaAssistidaDds(
            diasRegistroScannerDds.map(() => ({
                temaConfirmado: "",
                responsavelConfirmado: "",
                origemTemaConfirmado: "",
                semAtividadeConfirmada: false,
            }))
        );
        setParticipantesAdicionaisConferenciaDds(
            criarParticipantesAdicionaisConferenciaDds(
                participantesRegistroScannerDds
            )
        );
        setFechamentoConferenciaAssistidaDds(null);
        setReciboFinalEmitidoEmDds("");
        setErroFechamentoConferenciaDds("");
        setErroReciboFinalDds("");
    }

    async function salvarConferenciaAssistidaDds() {
        if (salvandoConferenciaAssistidaDds) return;

        if (conferenciaOficialConcluidaDds) {
            setErroConferenciaAssistidaDds("A conferência já foi concluída oficialmente. Reabra antes de editar ou salvar novamente.");
            return;
        }

        if (!supabase) {
            setErroConferenciaAssistidaDds("Cliente Supabase não disponível para salvar a conferência.");
            return;
        }

        const codigo = registroScannerDds?.codigo || codigoConferenciaDds || dadosDds.codigo || "";

        if (!codigo) {
            setErroConferenciaAssistidaDds("Busque ou gere um DDS antes de salvar a Conferência Assistida.");
            return;
        }

        setSalvandoConferenciaAssistidaDds(true);
        setErroConferenciaAssistidaDds("");

        try {
            const atualizadoEm = new Date().toISOString();
            const dadosAtuais = registroScannerDds?.dados || {};
            const temasDiasParaSalvar =
                montarTemasDiasConferenciaAssistidaDds();

            const conferenciaAssistida = {
                versao: 1,
                origem: "conferencia_assistida_dds",
                atualizadoEm,
                frequencia: conferenciaAssistidaDds,
                estatisticas: estatisticasConferenciaAssistidaDds,
                temasDias: temasDiasParaSalvar,
                diasAtivos: diasAtivosConferenciaAssistidaDds.map((dia) => ({
                    posicaoSemana: dia.posicaoSemana,
                    indice: dia.indice,
                    indiceAssistido: dia.indiceAssistido,
                    chaveAssistida: dia.chaveAssistida,
                    nome: dia.nome,
                    curto: dia.curto,
                    data: dia.data,
                    tema: dia.tema,
                })),
                participantes: participantesConferenciaAssistidaDds.map((participante) => ({
                    numero: participante.numero,
                    linhaImpressa: participante.linhaImpressa || participante.numero,
                    nome: participante.nome,
                    funcao: participante.funcao,
                    empresa: participante.empresa || participante.empresaNome || "",
                    codigoSafescan: participante.codigoSafescan || "",
                    origem: participante.origem || "cadastro",
                    tipo: participante.tipo || (
                        participante.origem === "adicional"
                            ? "visitante"
                            : "colaborador"
                    ),
                    idAdicional: participante.idAdicional || "",
                })),
                fechamento: dadosAtuais?.conferenciaAssistida?.fechamento || fechamentoConferenciaAssistidaDds || null,
                reciboFinal: dadosAtuais?.conferenciaAssistida?.reciboFinal || null,
            };

            const registroAtualizado = await salvarRegistroDds({
                supabase,
                registro: {
                    ...registroScannerDds,
                    codigo,
                    empresaId: registroScannerDds?.empresaId || registroScannerDds?.empresa_id || dadosAtuais.empresaId || dadosAtuais.empresa_id || "",
                    obraId: registroScannerDds?.obraId || registroScannerDds?.obra_id || dadosAtuais.obraId || dadosAtuais.obra_id || "",
                    empresaNome: registroScannerDds?.empresaNome || dadosAtuais.empresaNome || dadosAtuais.empresa || "",
                    obraNome: registroScannerDds?.obraNome || dadosAtuais.obraNome || dadosAtuais.obra || "",
                    periodoInicio: registroScannerDds?.periodoInicio || dadosAtuais.periodoInicio || "",
                    periodoFim: registroScannerDds?.periodoFim || dadosAtuais.periodoFim || "",
                    dados: {
                        ...dadosAtuais,
                        conferenciaAssistida,
                    },
                },
            });

            const registroAtualizadoComDados = {
                ...(registroAtualizado ||
                    registroScannerDds ||
                    {}),
                dados: {
                    ...dadosAtuais,
                    ...(registroAtualizado?.dados || {}),
                    conferenciaAssistida,
                },
            };

            setRegistroScannerDds(
                registroAtualizadoComDados
            );

            setConferenciaAssistidaDds(
                conferenciaAssistida.frequencia ||
                    conferenciaAssistidaDds
            );

            setTemasConferenciaAssistidaDds(
                temasDiasParaSalvar.map((item) => ({
                    temaConfirmado: String(
                        item?.temaConfirmado || ""
                    ),
                    responsavelConfirmado: String(
                        item?.responsavelConfirmado || ""
                    ),
                    origemTemaConfirmado: String(
                        item?.origemTemaConfirmado || ""
                    ),
                    semAtividadeConfirmada:
                        item?.semAtividadeConfirmada === true,
                }))
            );

            setConferenciaAssistidaSalvaEmDds(
                conferenciaAssistida.atualizadoEm ||
                    atualizadoEm
            );
        } catch (error) {
            setErroConferenciaAssistidaDds(error?.message || "Não foi possível salvar a Conferência Assistida DDS.");
        } finally {
            setSalvandoConferenciaAssistidaDds(false);
        }
    }

    async function concluirConferenciaAssistidaDds() {
        if (salvandoFechamentoConferenciaDds) return;

        if (!supabase) {
            setErroFechamentoConferenciaDds("Cliente Supabase não disponível para concluir a conferência.");
            return;
        }

        const codigo = registroScannerDds?.codigo || codigoConferenciaDds || dadosDds.codigo || "";

        if (!codigo) {
            setErroFechamentoConferenciaDds("Busque ou gere um DDS antes de concluir a Conferência Assistida.");
            return;
        }

        if (
            estatisticasConferenciaAssistidaDds.participantes <= 0 ||
            diasConferenciaAssistidaDds.length <= 0
        ) {
            setErroFechamentoConferenciaDds(
                "Não há base suficiente para concluir a conferência oficial."
            );
            return;
        }

        if (estatisticasConferenciaAssistidaDds.manuais > 0) {
            setErroFechamentoConferenciaDds(
                "Ainda existem campos Manual/vazio. Troque todos os ? por P ou X antes de concluir."
            );
            return;
        }

        if (
            estatisticasTemasConferenciaAssistidaDds.pendencias > 0
        ) {
            const nomesDias =
                estatisticasTemasConferenciaAssistidaDds
                    .diasPendentes
                    .map(
                        (dia) =>
                            dia.nome ||
                            dia.curto ||
                            dia.data
                    )
                    .filter(Boolean)
                    .join(", ");

            setErroFechamentoConferenciaDds(
                `Complete o tema e o responsável da folha assinada antes de concluir. Dias pendentes: ${nomesDias}.`
            );
            return;
        }

        setSalvandoFechamentoConferenciaDds(true);
        setErroFechamentoConferenciaDds("");

        try {
            const concluidoEm = new Date().toISOString();
            const dadosAtuais = registroScannerDds?.dados || {};

            const fechamento = {
                versao: 1,
                status: "concluida",
                origem: "fechamento_conferencia_assistida_dds",
                concluidoEm,
                codigo,
                estatisticas: estatisticasConferenciaAssistidaDds,
                resumo: {
                    participantes: estatisticasConferenciaAssistidaDds.participantes,
                    participantesCadastrados: estatisticasConferenciaAssistidaDds.participantesCadastrados,
                    participantesAdicionais: estatisticasConferenciaAssistidaDds.participantesAdicionais,
                    presencas: estatisticasConferenciaAssistidaDds.presencas,
                    presencasCadastrados: estatisticasConferenciaAssistidaDds.presencasCadastrados,
                    presencasAdicionais: estatisticasConferenciaAssistidaDds.presencasAdicionais,
                    ausencias: estatisticasConferenciaAssistidaDds.ausencias,
                    ausenciasCadastrados: estatisticasConferenciaAssistidaDds.ausenciasCadastrados,
                    ausenciasAdicionais: estatisticasConferenciaAssistidaDds.ausenciasAdicionais,
                    manuais: estatisticasConferenciaAssistidaDds.manuais,
                    manuaisCadastrados: estatisticasConferenciaAssistidaDds.manuaisCadastrados,
                    manuaisAdicionais: estatisticasConferenciaAssistidaDds.manuaisAdicionais,
                    homemDia: estatisticasConferenciaAssistidaDds.homemDia,
                    homemDiaCadastrados: estatisticasConferenciaAssistidaDds.homemDiaCadastrados,
                    homemDiaAdicionais: estatisticasConferenciaAssistidaDds.homemDiaAdicionais,
                    diasAtivos: diasAtivosConferenciaAssistidaDds.length,
                    temasConfirmados:
                        estatisticasTemasConferenciaAssistidaDds.temasConfirmados,
                    responsaveisIdentificados:
                        estatisticasTemasConferenciaAssistidaDds.responsaveisIdentificados,
                    diasSemAtividade:
                        estatisticasTemasConferenciaAssistidaDds.diasSemAtividade,
                    pendenciasTemas:
                        estatisticasTemasConferenciaAssistidaDds.pendencias,
                    funcionariosSemanaCompleta: estatisticasConferenciaAssistidaDds.funcionariosSemanaCompleta,
                    semanaCompletaCadastrados: estatisticasConferenciaAssistidaDds.semanaCompletaCadastrados,
                    semanaCompletaAdicionais: estatisticasConferenciaAssistidaDds.semanaCompletaAdicionais,
                },
            };

            const conferenciaAssistida = {
                ...(dadosAtuais.conferenciaAssistida || {}),
                versao: 1,
                origem: "conferencia_assistida_dds",
                atualizadoEm: concluidoEm,
                frequencia: conferenciaAssistidaDds,
                estatisticas: estatisticasConferenciaAssistidaDds,
                temasDias: montarTemasDiasConferenciaAssistidaDds(),
                diasAtivos: diasAtivosConferenciaAssistidaDds.map((dia) => ({
                    posicaoSemana: dia.posicaoSemana,
                    indice: dia.indice,
                    indiceAssistido: dia.indiceAssistido,
                    chaveAssistida: dia.chaveAssistida,
                    nome: dia.nome,
                    curto: dia.curto,
                    data: dia.data,
                    tema: dia.tema,
                })),
                participantes: participantesConferenciaAssistidaDds.map((participante) => ({
                    numero: participante.numero,
                    linhaImpressa: participante.linhaImpressa || participante.numero,
                    nome: participante.nome,
                    funcao: participante.funcao,
                    empresa: participante.empresa || participante.empresaNome || "",
                    codigoSafescan: participante.codigoSafescan || "",
                    origem: participante.origem || "cadastro",
                    tipo: participante.tipo || (
                        participante.origem === "adicional"
                            ? "visitante"
                            : "colaborador"
                    ),
                    idAdicional: participante.idAdicional || "",
                })),
                fechamento,
            };

            const registroAtualizado = await salvarRegistroDds({
                supabase,
                registro: {
                    ...registroScannerDds,
                    codigo,
                    empresaId: registroScannerDds?.empresaId || registroScannerDds?.empresa_id || dadosAtuais.empresaId || dadosAtuais.empresa_id || "",
                    obraId: registroScannerDds?.obraId || registroScannerDds?.obra_id || dadosAtuais.obraId || dadosAtuais.obra_id || "",
                    empresaNome: registroScannerDds?.empresaNome || dadosAtuais.empresaNome || dadosAtuais.empresa || "",
                    obraNome: registroScannerDds?.obraNome || dadosAtuais.obraNome || dadosAtuais.obra || "",
                    periodoInicio: registroScannerDds?.periodoInicio || dadosAtuais.periodoInicio || "",
                    periodoFim: registroScannerDds?.periodoFim || dadosAtuais.periodoFim || "",
                    dados: {
                        ...dadosAtuais,
                        conferenciaAssistida,
                    },
                },
            });

            setRegistroScannerDds(registroAtualizado);
            setConferenciaAssistidaDds(registroAtualizado?.dados?.conferenciaAssistida?.frequencia || conferenciaAssistidaDds);
            setTemasConferenciaAssistidaDds(
                Array.isArray(
                    registroAtualizado?.dados?.conferenciaAssistida?.temasDias
                )
                    ? registroAtualizado.dados.conferenciaAssistida.temasDias
                    : temasConferenciaAssistidaDds
            );
            setConferenciaAssistidaSalvaEmDds(registroAtualizado?.dados?.conferenciaAssistida?.atualizadoEm || concluidoEm);
            setFechamentoConferenciaAssistidaDds(registroAtualizado?.dados?.conferenciaAssistida?.fechamento || fechamento);
        } catch (error) {
            setErroFechamentoConferenciaDds(error?.message || "Não foi possível concluir a Conferência Assistida DDS.");
        } finally {
            setSalvandoFechamentoConferenciaDds(false);
        }
    }

    async function reabrirConferenciaAssistidaDds() {
        if (salvandoFechamentoConferenciaDds || salvandoConferenciaAssistidaDds) return;

        if (!supabase) {
            setErroFechamentoConferenciaDds("Cliente Supabase não disponível para reabrir a conferência.");
            return;
        }

        const codigo = registroScannerDds?.codigo || codigoConferenciaDds || dadosDds.codigo || "";

        if (!codigo) {
            setErroFechamentoConferenciaDds("Busque o DDS antes de reabrir a conferência.");
            return;
        }

        setSalvandoFechamentoConferenciaDds(true);
        setErroFechamentoConferenciaDds("");

        try {
            const reabertoEm = new Date().toISOString();
            const dadosAtuais = registroScannerDds?.dados || {};
            const conferenciaAtual = dadosAtuais.conferenciaAssistida || {};
            const { fechamento, reciboFinal, ...conferenciaSemFechamento } = conferenciaAtual;

            const conferenciaAssistida = {
                ...conferenciaSemFechamento,
                versao: 1,
                origem: "conferencia_assistida_dds",
                atualizadoEm: reabertoEm,
                reabertoEm,
                frequencia: conferenciaAssistidaDds,
                estatisticas: estatisticasConferenciaAssistidaDds,
                temasDias: montarTemasDiasConferenciaAssistidaDds(),
                diasAtivos: diasAtivosConferenciaAssistidaDds.map((dia) => ({
                    posicaoSemana: dia.posicaoSemana,
                    indice: dia.indice,
                    indiceAssistido: dia.indiceAssistido,
                    chaveAssistida: dia.chaveAssistida,
                    nome: dia.nome,
                    curto: dia.curto,
                    data: dia.data,
                    tema: dia.tema,
                })),
                participantes: participantesConferenciaAssistidaDds.map((participante) => ({
                    numero: participante.numero,
                    linhaImpressa: participante.linhaImpressa || participante.numero,
                    nome: participante.nome,
                    funcao: participante.funcao,
                    empresa: participante.empresa || participante.empresaNome || "",
                    codigoSafescan: participante.codigoSafescan || "",
                    origem: participante.origem || "cadastro",
                    tipo: participante.tipo || (
                        participante.origem === "adicional"
                            ? "visitante"
                            : "colaborador"
                    ),
                    idAdicional: participante.idAdicional || "",
                })),
            };

            const registroAtualizado = await salvarRegistroDds({
                supabase,
                registro: {
                    ...registroScannerDds,
                    codigo,
                    empresaId: registroScannerDds?.empresaId || registroScannerDds?.empresa_id || dadosAtuais.empresaId || dadosAtuais.empresa_id || "",
                    obraId: registroScannerDds?.obraId || registroScannerDds?.obra_id || dadosAtuais.obraId || dadosAtuais.obra_id || "",
                    empresaNome: registroScannerDds?.empresaNome || dadosAtuais.empresaNome || dadosAtuais.empresa || "",
                    obraNome: registroScannerDds?.obraNome || dadosAtuais.obraNome || dadosAtuais.obra || "",
                    periodoInicio: registroScannerDds?.periodoInicio || dadosAtuais.periodoInicio || "",
                    periodoFim: registroScannerDds?.periodoFim || dadosAtuais.periodoFim || "",
                    dados: {
                        ...dadosAtuais,
                        conferenciaAssistida,
                    },
                },
            });

            setRegistroScannerDds(registroAtualizado);
            setConferenciaAssistidaDds(registroAtualizado?.dados?.conferenciaAssistida?.frequencia || conferenciaAssistidaDds);
            setTemasConferenciaAssistidaDds(
                Array.isArray(
                    registroAtualizado?.dados?.conferenciaAssistida?.temasDias
                )
                    ? registroAtualizado.dados.conferenciaAssistida.temasDias
                    : temasConferenciaAssistidaDds
            );
            setConferenciaAssistidaSalvaEmDds(registroAtualizado?.dados?.conferenciaAssistida?.atualizadoEm || reabertoEm);
            setFechamentoConferenciaAssistidaDds(null);
            setReciboFinalEmitidoEmDds("");
            setErroReciboFinalDds("");
        } catch (error) {
            setErroFechamentoConferenciaDds(error?.message || "Não foi possível reabrir a Conferência Assistida DDS.");
        } finally {
            setSalvandoFechamentoConferenciaDds(false);
        }
    }

    return {
        atualizarTemaConferenciaAssistidaDds,
        usarPlanejamentoTemaConferenciaAssistidaDds,
        alternarSemAtividadeConferenciaAssistidaDds,
        atualizarParticipanteAdicionalConferenciaDds,
        limparParticipanteAdicionalConferenciaDds,
        definirStatusFrequenciaAssistidaDds,
        marcarSemanaCompletaAssistidaDds,
        limparParticipanteConferenciaAssistidaDds,
        limparConferenciaAssistidaDds,
        salvarConferenciaAssistidaDds,
        concluirConferenciaAssistidaDds,
        reabrirConferenciaAssistidaDds,
    };
}
