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
    salvarRascunhoTemasConferenciaDds,
    supabase,
    temasConferenciaAssistidaDds,
}) {
    function persistirTemasConferencia(lista) {
        if (typeof salvarRascunhoTemasConferenciaDds === "function") {
            salvarRascunhoTemasConferenciaDds(lista);
        }
        return lista;
    }

    function atualizarTemaConferenciaAssistidaDds(
        indiceDia,
        campo,
        valor
    ) {
        if (conferenciaOficialConcluidaDds) return;

        setTemasConferenciaAssistidaDds((atuais) =>
            persistirTemasConferencia(diasRegistroScannerDds.map((_, indice) => {
                const atual =
                    atuais[indice] &&
                    typeof atuais[indice] === "object"
                        ? atuais[indice]
                        : {};

                if (indice !== indiceDia) return atual;

                const alteracaoTema =
                    campo === "temaConfirmado";

                const alteracaoConfirmacao =
                    alteracaoTema ||
                    campo ===
                        "responsavelConfirmado";

                return {
                    ...atual,
                    [campo]: String(valor ?? ""),
                    ...(alteracaoTema
                        ? {
                            origemTemaConfirmado:
                                "transcricao_manual",
                            origemDocumentalTemaConfirmado: "",
                        }
                        : {}),
                    ...(alteracaoConfirmacao
                        ? {
                            semAtividadeConfirmada:
                                false,
                            chuvaConfirmada: false,
                        }
                        : {}),
                };
            }))
        );

        setErroFechamentoConferenciaDds("");
    }

    /*
     * dds_proveniencia_tema_ocr_v1
     *
     * A sugestão OCR somente se torna confirmação oficial
     * após ação explícita do usuário.
     */
    function usarSugestaoOcrTemaConferenciaAssistidaDds(
        indiceDia,
        sugestaoOcrTema
    ) {
        if (conferenciaOficialConcluidaDds) return;

        const sugestao =
            sugestaoOcrTema &&
            typeof sugestaoOcrTema === "object"
                ? sugestaoOcrTema
                : {};

        const temaSugerido = String(
            sugestao?.temaSugerido || ""
        ).trim();

        const responsavelSugerido = String(
            sugestao?.responsavelSugerido || ""
        ).trim();

        if (
            !temaSugerido &&
            !responsavelSugerido
        ) {
            return;
        }

        setTemasConferenciaAssistidaDds((atuais) =>
            persistirTemasConferencia(diasRegistroScannerDds.map((_, indice) => {
                const atual =
                    atuais[indice] &&
                    typeof atuais[indice] === "object"
                        ? atuais[indice]
                        : {};

                if (indice !== indiceDia) return atual;

                return {
                    ...atual,
                    ...(temaSugerido
                        ? {
                            temaConfirmado:
                                temaSugerido,
                            origemTemaConfirmado:
                                "ocr_local_confirmado",
                            origemDocumentalTemaConfirmado: "",
                        }
                        : {}),
                    ...(responsavelSugerido
                        ? {
                            responsavelConfirmado:
                                responsavelSugerido,
                        }
                        : {}),
                    semAtividadeConfirmada:
                        false,
                    chuvaConfirmada: false,
                };
            }))
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
            persistirTemasConferencia(diasRegistroScannerDds.map((_, indice) => {
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
                    origemDocumentalTemaConfirmado: "",
                    semAtividadeConfirmada:
                        Boolean(
                            dia.semAtividadePlanejada
                        ),
                };
            }))
        );

        setErroFechamentoConferenciaDds("");
    }

    function alternarSemAtividadeConferenciaAssistidaDds(
        indiceDia
    ) {
        if (conferenciaOficialConcluidaDds) return;

        setTemasConferenciaAssistidaDds((atuais) =>
            persistirTemasConferencia(diasRegistroScannerDds.map((_, indice) => {
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
                    origemDocumentalTemaConfirmado: "",
                    semAtividadeConfirmada:
                        proximoSemAtividade,
                    chuvaConfirmada: false,
                };
            }))
        );

        setErroFechamentoConferenciaDds("");
    }

    function alternarChuvaConferenciaAssistidaDds(indiceDia) {
        if (conferenciaOficialConcluidaDds) return;
        setTemasConferenciaAssistidaDds((atuais) =>
            persistirTemasConferencia(diasRegistroScannerDds.map((_, indice) => {
                const atual = atuais[indice] && typeof atuais[indice] === "object" ? atuais[indice] : {};
                if (indice !== indiceDia) return atual;
                const proximaChuva = atual.chuvaConfirmada !== true;
                return {
                    ...atual,
                    temaConfirmado: proximaChuva ? "" : String(atual.temaConfirmado || ""),
                    responsavelConfirmado: proximaChuva ? "" : String(atual.responsavelConfirmado || ""),
                    origemTemaConfirmado: "transcricao_manual",
                    origemDocumentalTemaConfirmado: "",
                    semAtividadeConfirmada: false,
                    chuvaConfirmada: proximaChuva,
                };
            }))
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
                origemDocumentalTemaConfirmado:
                    dia.origemDocumentalTemaConfirmado || "",
                semAtividadeConfirmada:
                    Boolean(
                        dia.semAtividadeConfirmada
                    ),
                chuvaConfirmada: Boolean(dia.chuvaConfirmada),
                jornadaTipo:
                    dia.jornadaTipo || "",
                jornadaRotulo:
                    dia.jornadaRotulo || "",
                horaEntrada:
                    dia.horaEntrada || "",
                horaSaida:
                    dia.horaSaida || "",
                horaInicioAlmoco:
                    dia.horaInicioAlmoco || "",
                horaFimAlmoco:
                    dia.horaFimAlmoco || "",
                horaInicioDds:
                    dia.horaInicioDds || "",
                horaFimDds:
                    dia.horaFimDds || "",
                minutosNormaisPrevistos:
                    Number(
                        dia.minutosNormaisPrevistos ||
                        0
                    ),
                minutosTrabalhados:
                    Number(
                        dia.minutosTrabalhados ||
                        0
                    ),
                minutosRegulares:
                    Number(
                        dia.minutosRegulares ||
                        0
                    ),
                minutosExtras:
                    Number(
                        dia.minutosExtras ||
                        0
                    ),
                minutosDds:
                    Number(
                        dia.minutosDds ||
                        0
                    ),
                horasTrabalhadas:
                    Number(
                        dia.horasTrabalhadas ||
                        0
                    ),
                horasRegulares:
                    Number(
                        dia.horasRegulares ||
                        0
                    ),
                horasExtras:
                    Number(
                        dia.horasExtras ||
                        0
                    ),
                jornadaValida:
                    dia.jornadaValida === true,
                jornadaPendente:
                    dia.jornadaPendente === true,
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

        const redefinirComoManual =
            campo === "nome";

        setParticipantesAdicionaisConferenciaDds((atuais) =>
            atuais.map((participante, indiceAtual) =>
                indiceAtual === indice
                    ? {
                        ...participante,
                        ...(redefinirComoManual
                            ? {
                                colaboradorCadastroChave: "",
                                colaboradorId: "",
                                codigoSafescan: "",
                                origem: "adicional",
                                tipo: "visitante",
                            }
                            : {}),
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
                        colaboradorCadastroChave: "",
                        colaboradorId: "",
                        codigoSafescan: "",
                        origem: "adicional",
                        tipo: "visitante",
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

    function marcarSemanaAusenteAssistidaDds(numero) {
        if (conferenciaOficialConcluidaDds) return;

        setConferenciaAssistidaDds((atual) => {
            const proximo = { ...atual };

            for (const dia of diasAtivosConferenciaAssistidaDds) {
                proximo[
                    obterChaveFrequenciaAssistidaDds(
                        numero,
                        dia
                    )
                ] = "ausente";
            }

            return proximo;
        });
    }

    function marcarSemanaFeriasAssistidaDds(numero) {
        if (conferenciaOficialConcluidaDds) return;
        setConferenciaAssistidaDds((atual) => {
            const proximo = { ...atual };
            for (const dia of diasAtivosConferenciaAssistidaDds) {
                proximo[obterChaveFrequenciaAssistidaDds(numero, dia)] = "ferias";
            }
            return proximo;
        });
    }

    function marcarSemanaAtestadoAssistidaDds(numero) {
        if (conferenciaOficialConcluidaDds) return;
        setConferenciaAssistidaDds((atual) => {
            const proximo = { ...atual };
            for (const dia of diasAtivosConferenciaAssistidaDds) {
                proximo[obterChaveFrequenciaAssistidaDds(numero, dia)] = "atestado";
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
                chuvaConfirmada: false,
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

    function obterQuantidadePaginasLeituraDds() {
        const candidatos = [
            leituraArquivoScannerDds?.quantidadePaginas,
            leituraArquivoScannerDds?.totalPaginas,
            leituraArquivoScannerDds?.paginas,
            leituraArquivoScannerDds?.paginasDocumento,
        ];

        for (const candidato of candidatos) {
            const quantidade = Number(candidato);

            if (
                Number.isFinite(quantidade) &&
                quantidade > 0
            ) {
                return Math.floor(quantidade);
            }
        }

        const paginasAnalisadas =
            Array.isArray(
                leituraArquivoScannerDds?.paginasAnalisadas
            )
                ? leituraArquivoScannerDds.paginasAnalisadas
                : [];

        if (paginasAnalisadas.length > 0) {
            return Math.max(
                ...paginasAnalisadas
                    .map((pagina) =>
                        Number(
                            pagina?.pagina ??
                            pagina?.numero ??
                            pagina
                        )
                    )
                    .filter((pagina) =>
                        Number.isFinite(pagina)
                    )
            );
        }

        return null;
    }

    function normalizarDocumentoConferenciaDds(
        documento,
        hashSha256 = ""
    ) {
        if (!documento?.id) {
            return null;
        }

        return {
            id: documento.id,
            bucketId:
                documento.bucket_id ||
                documento.bucketId ||
                "dds-assinados",
            caminhoStorage:
                documento.caminho_storage ||
                documento.caminhoStorage ||
                "",
            nomeOriginal:
                documento.nome_original ||
                documento.nomeOriginal ||
                "",
            mimeType:
                documento.mime_type ||
                documento.mimeType ||
                "",
            tamanhoBytes:
                Number(
                    documento.tamanho_bytes ||
                    documento.tamanhoBytes ||
                    0
                ),
            hashSha256:
                documento.hash_sha256 ||
                documento.hashSha256 ||
                hashSha256 ||
                "",
            quantidadePaginas:
                documento.quantidade_paginas ??
                documento.quantidadePaginas ??
                null,
            registradoEm:
                documento.created_at ||
                documento.registradoEm ||
                "",
        };
    }

    async function persistirConferenciaEstruturadaDds({
        registroAtualizado,
        conferenciaAssistida,
        status,
        acao,
        motivo = null,
    }) {
        const registroId =
            registroAtualizado?.id ||
            registroScannerDds?.id ||
            "";

        if (!registroId) {
            throw new Error(
                "O registro DDS não possui identificador para a persistência estruturada."
            );
        }

        let documentoNormalizado =
            normalizarDocumentoConferenciaDds(
                conferenciaAssistida?.documento ||
                registroAtualizado?.dados
                    ?.conferenciaAssistida
                    ?.documento ||
                registroScannerDds?.dados
                    ?.conferenciaAssistida
                    ?.documento
            );

        if (arquivoScannerDds) {
            const resultadoDocumento =
                await registrarDocumentoDdsAssinado({
                    supabase,
                    registro: {
                        ...registroAtualizado,
                        id: registroId,
                        codigo:
                            registroAtualizado?.codigo ||
                            registroScannerDds?.codigo ||
                            codigoConferenciaDds ||
                            dadosDds.codigo ||
                            "",
                    },
                    arquivo: arquivoScannerDds,
                    leitura:
                        leituraArquivoScannerDds,
                    quantidadePaginas:
                        obterQuantidadePaginasLeituraDds(),
                });

            documentoNormalizado =
                normalizarDocumentoConferenciaDds(
                    resultadoDocumento?.documento,
                    resultadoDocumento?.hashSha256
                );
        }

        const conferenciaComDocumento = {
            ...conferenciaAssistida,
            documento:
                documentoNormalizado ||
                conferenciaAssistida?.documento ||
                null,
            persistenciaEstruturada: {
                versao: 1,
                status:
                    status ||
                    "em_conferencia",
                sincronizadaEm:
                    new Date().toISOString(),
            },
        };

        let registroFinal =
            registroAtualizado;

        if (
            JSON.stringify(
                registroAtualizado?.dados
                    ?.conferenciaAssistida ||
                {}
            ) !==
            JSON.stringify(
                conferenciaComDocumento
            )
        ) {
            registroFinal =
                await salvarRegistroDds({
                    supabase,
                    registro: {
                        ...registroAtualizado,
                        dados: {
                            ...(
                                registroAtualizado?.dados ||
                                registroScannerDds?.dados ||
                                {}
                            ),
                            conferenciaAssistida:
                                conferenciaComDocumento,
                        },
                    },
                });
        }

        const sincronizacao =
            await sincronizarConferenciaEstruturadaDds({
                supabase,
                registroId:
                    registroFinal?.id ||
                    registroId,
                documentoId:
                    documentoNormalizado?.id ||
                    null,
                status:
                    status ||
                    "em_conferencia",
                estatisticas:
                    conferenciaComDocumento
                        ?.estatisticas ||
                    {},
                leitura:
                    leituraArquivoScannerDds,
                snapshot:
                    conferenciaComDocumento,
                participantes:
                    participantesConferenciaAssistidaDds,
                dias:
                    diasConferenciaAssistidaDds,
                frequencia:
                    conferenciaComDocumento
                        ?.frequencia ||
                    conferenciaAssistidaDds,
                temasDias:
                    conferenciaComDocumento
                        ?.temasDias ||
                    [],
                acao,
                motivo,
            });

        return {
            registro: {
                ...registroFinal,
                dados: {
                    ...(
                        registroFinal?.dados ||
                        registroAtualizado?.dados ||
                        {}
                    ),
                    conferenciaAssistida: {
                        ...conferenciaComDocumento,
                        persistenciaEstruturada: {
                            ...conferenciaComDocumento
                                .persistenciaEstruturada,
                            conferenciaId:
                                sincronizacao
                                    ?.conferenciaId ||
                                "",
                            frequencias:
                                sincronizacao
                                    ?.frequencias
                                    ?.length ||
                                0,
                            temasDias:
                                sincronizacao
                                    ?.temasDias
                                    ?.length ||
                                0,
                        },
                    },
                },
            },
            conferenciaAssistida:
                conferenciaComDocumento,
            sincronizacao,
        };
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
                    colaboradorId: participante.colaboradorId || "",
                    colaboradorCadastroChave: participante.colaboradorCadastroChave || "",
                    idAdicional: participante.idAdicional || "",
                })),
                fechamento: dadosAtuais?.conferenciaAssistida?.fechamento || fechamentoConferenciaAssistidaDds || null,
                reciboFinal: dadosAtuais?.conferenciaAssistida?.reciboFinal || null,
            };

            let registroAtualizado = await salvarRegistroDds({
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

            const persistenciaEstruturada =
                await persistirConferenciaEstruturadaDds({
                    registroAtualizado,
                    conferenciaAssistida,
                    status: "em_conferencia",
                    acao: "salvar_conferencia",
                });

            registroAtualizado =
                persistenciaEstruturada.registro;

            const conferenciaAssistidaPersistida =
                registroAtualizado?.dados
                    ?.conferenciaAssistida ||
                persistenciaEstruturada
                    .conferenciaAssistida ||
                conferenciaAssistida;

            const registroAtualizadoComDados = {
                ...(registroAtualizado ||
                    registroScannerDds ||
                    {}),
                dados: {
                    ...dadosAtuais,
                    ...(registroAtualizado?.dados || {}),
                    conferenciaAssistida:
                        conferenciaAssistidaPersistida,
                },
            };

            setRegistroScannerDds(
                registroAtualizadoComDados
            );

            setConferenciaAssistidaDds(
                conferenciaAssistidaPersistida.frequencia ||
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
                    origemDocumentalTemaConfirmado:
                        String(
                            item?.origemDocumentalTemaConfirmado ||
                                ""
                        ),
                    semAtividadeConfirmada:
                        item?.semAtividadeConfirmada === true,
                    chuvaConfirmada: item?.chuvaConfirmada === true,
                    jornadaTipo: String(
                        item?.jornadaTipo || ""
                    ),
                    jornadaRotulo: String(
                        item?.jornadaRotulo || ""
                    ),
                    horaEntrada: String(
                        item?.horaEntrada || ""
                    ),
                    horaSaida: String(
                        item?.horaSaida || ""
                    ),
                    horaInicioAlmoco: String(
                        item?.horaInicioAlmoco || ""
                    ),
                    horaFimAlmoco: String(
                        item?.horaFimAlmoco || ""
                    ),
                    horaInicioDds: String(
                        item?.horaInicioDds || ""
                    ),
                    horaFimDds: String(
                        item?.horaFimDds || ""
                    ),
                    minutosNormaisPrevistos:
                        Number(
                            item?.minutosNormaisPrevistos ||
                            0
                        ),
                    minutosTrabalhados:
                        Number(
                            item?.minutosTrabalhados ||
                            0
                        ),
                    minutosRegulares:
                        Number(
                            item?.minutosRegulares ||
                            0
                        ),
                    minutosExtras:
                        Number(
                            item?.minutosExtras ||
                            0
                        ),
                    minutosDds:
                        Number(
                            item?.minutosDds ||
                            0
                        ),
                    horasTrabalhadas:
                        Number(
                            item?.horasTrabalhadas ||
                            0
                        ),
                    horasRegulares:
                        Number(
                            item?.horasRegulares ||
                            0
                        ),
                    horasExtras:
                        Number(
                            item?.horasExtras ||
                            0
                        ),
                    jornadaValida:
                        item?.jornadaValida === true,
                    jornadaPendente:
                        item?.jornadaPendente === true,
                }))
            );

            setConferenciaAssistidaSalvaEmDds(
                conferenciaAssistidaPersistida.atualizadoEm ||
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

        if (
            estatisticasTemasConferenciaAssistidaDds
                .jornadasPendentes > 0
        ) {
            const nomesDias =
                estatisticasTemasConferenciaAssistidaDds
                    .diasJornadaPendente
                    .map(
                        (dia) =>
                            dia.nome ||
                            dia.curto ||
                            dia.data
                    )
                    .filter(Boolean)
                    .join(", ");

            setErroFechamentoConferenciaDds(
                `Informe entrada e saída válidas antes de concluir. Jornadas pendentes: ${nomesDias}.`
            );
            return;
        }

        /*
         * dds_origem_documental_tema_confirmado_v1
         *
         * O método usado para preencher o tema não comprova sua
         * presença na folha assinada. A origem documental deve ser
         * confirmada explicitamente para cada dia com DDS aplicado.
         */
        const origensDocumentaisPermitidasDds =
            new Set([
                "pdf_assinado",
                "sistema_manual",
            ]);

        const diasSemOrigemDocumentalDds =
            diasConferenciaAssistidaDds.filter(
                (dia) => {
                    if (
                        dia.semAtividadeConfirmada ===
                        true
                    ) {
                        return false;
                    }

                    const temaPreenchido =
                        Boolean(
                            String(
                                dia.temaConfirmado ||
                                ""
                            ).trim()
                        );

                    const responsavelPreenchido =
                        Boolean(
                            String(
                                dia.responsavelConfirmado ||
                                ""
                            ).trim()
                        );

                    if (
                        !temaPreenchido ||
                        !responsavelPreenchido
                    ) {
                        return false;
                    }

                    return !origensDocumentaisPermitidasDds.has(
                        String(
                            dia.origemDocumentalTemaConfirmado ||
                            ""
                        ).trim()
                    );
                }
            );

        if (
            diasSemOrigemDocumentalDds.length > 0
        ) {
            const nomesDias =
                diasSemOrigemDocumentalDds
                    .map(
                        (dia) =>
                            dia.nome ||
                            dia.curto ||
                            dia.data
                    )
                    .filter(Boolean)
                    .join(", ");

            setErroFechamentoConferenciaDds(
                `Confirme a origem documental do tema antes de concluir. Dias pendentes: ${nomesDias}.`
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
                    colaboradorId: participante.colaboradorId || "",
                    colaboradorCadastroChave: participante.colaboradorCadastroChave || "",
                    idAdicional: participante.idAdicional || "",
                })),
                fechamento,
            };

            let registroAtualizado = await salvarRegistroDds({
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

            const persistenciaEstruturada =
                await persistirConferenciaEstruturadaDds({
                    registroAtualizado,
                    conferenciaAssistida,
                    status: "concluida",
                    acao: "concluir_conferencia",
                });

            registroAtualizado =
                persistenciaEstruturada.registro;

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
                    colaboradorId: participante.colaboradorId || "",
                    colaboradorCadastroChave: participante.colaboradorCadastroChave || "",
                    idAdicional: participante.idAdicional || "",
                })),
            };

            let registroAtualizado = await salvarRegistroDds({
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

            const conferenciaReaberta =
                registroAtualizado?.dados
                    ?.conferenciaAssistida ||
                conferenciaAssistidaDds;

            const persistenciaEstruturada =
                await persistirConferenciaEstruturadaDds({
                    registroAtualizado,
                    conferenciaAssistida:
                        conferenciaReaberta,
                    status: "reaberta",
                    acao: "reabrir_conferencia",
                    motivo:
                        "Conferência DDS reaberta para correção.",
                });

            registroAtualizado =
                persistenciaEstruturada.registro;

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
        usarSugestaoOcrTemaConferenciaAssistidaDds,
        usarPlanejamentoTemaConferenciaAssistidaDds,
        alternarSemAtividadeConferenciaAssistidaDds,
        alternarChuvaConferenciaAssistidaDds,
        atualizarParticipanteAdicionalConferenciaDds,
        limparParticipanteAdicionalConferenciaDds,
        definirStatusFrequenciaAssistidaDds,
        marcarSemanaCompletaAssistidaDds,
        marcarSemanaAusenteAssistidaDds,
        marcarSemanaFeriasAssistidaDds,
        marcarSemanaAtestadoAssistidaDds,
        limparParticipanteConferenciaAssistidaDds,
        limparConferenciaAssistidaDds,
        salvarConferenciaAssistidaDds,
        concluirConferenciaAssistidaDds,
        reabrirConferenciaAssistidaDds,
    };
}
