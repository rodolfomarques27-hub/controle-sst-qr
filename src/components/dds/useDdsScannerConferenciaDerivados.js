import { useMemo } from "react";

export default function useDdsScannerConferenciaDerivados({
    arquivoScannerDds,
    codigoConferenciaDds,
    dadosDds,
    leituraArquivoScannerDds,
    participantesAdicionaisConferenciaDds,
    participantesRegistroScannerDds,
    registroScannerDds,
    temasConferenciaAssistidaDds,
}) {
    const diasRegistroScannerDds = useMemo(
        () => Array.isArray(registroScannerDds?.dados?.diasSemana) ? registroScannerDds.dados.diasSemana : [],
        [registroScannerDds]
    );

    const resumoArquivoScannerDds = useMemo(() => {
        if (!arquivoScannerDds) return null;

        const tamanhoMb = arquivoScannerDds.size / (1024 * 1024);
        const tamanhoFormatado = tamanhoMb >= 1
            ? `${tamanhoMb.toFixed(2)} MB`
            : `${Math.max(1, Math.round(arquivoScannerDds.size / 1024))} KB`;

        return {
            nome: arquivoScannerDds.name || "Arquivo sem nome",
            tipo: arquivoScannerDds.type || "Tipo não identificado",
            tamanho: tamanhoFormatado,
        };
    }, [arquivoScannerDds]);

    const avisosLeituraArquivoScannerDds = useMemo(
        () => Array.isArray(leituraArquivoScannerDds?.avisos) ? leituraArquivoScannerDds.avisos : [],
        [leituraArquivoScannerDds]
    );

    const linhasLeituraArquivoScannerDds = useMemo(
        () => Array.isArray(leituraArquivoScannerDds?.linhasOcr) ? leituraArquivoScannerDds.linhasOcr : [],
        [leituraArquivoScannerDds]
    );

    const textoPreviaArquivoScannerDds = useMemo(() => {
        const texto = String(leituraArquivoScannerDds?.textoPrevia || leituraArquivoScannerDds?.textoExtraido || "").trim();

        if (!texto) return "";

        return texto.length > 900 ? `${texto.slice(0, 900).trim()}...` : texto;
    }, [leituraArquivoScannerDds]);

    const qualidadeLeituraArquivoScannerDds = useMemo(() => {
        if (!leituraArquivoScannerDds) {
            return {
                textoStatus: "-",
                statusConferencia: "Aguardando leitura",
                confiavel: false,
            };
        }

        const avisosTexto = avisosLeituraArquivoScannerDds.join(" ").toLowerCase();
        const confianca = Number(leituraArquivoScannerDds?.confianca || 0);
        const diagnosticoDdsOcr = leituraArquivoScannerDds?.diagnosticoDdsOcr || {};
        const scoreDdsOcr = Number(diagnosticoDdsOcr?.score || 0);
        const possuiAlvoDds =
            Boolean(diagnosticoDdsOcr?.encontrouCodigo) ||
            scoreDdsOcr >= 45 ||
            Number(diagnosticoDdsOcr?.termosLocalizados || 0) >= 3;
        const possuiTexto = Boolean(textoPreviaArquivoScannerDds);
        const possuiLinhas = linhasLeituraArquivoScannerDds.length > 0;
        const avisoSemTextoConfiavel =
            avisosTexto.includes("não encontrou texto documental confiável") ||
            avisosTexto.includes("nao encontrou texto documental confiavel") ||
            avisosTexto.includes("não foi encontrado texto confiável") ||
            avisosTexto.includes("nao foi encontrado texto confiavel") ||
            avisosTexto.includes("conferência manual");

        if (!possuiTexto) {
            return {
                textoStatus: "Não localizado",
                statusConferencia: "Exige conferência manual",
                confiavel: false,
            };
        }

        if (possuiTexto && possuiAlvoDds && confianca >= 45) {
            return {
                textoStatus: "Localizado para DDS",
                statusConferencia: "Leitura direcionada DDS aproveitável",
                confiavel: true,
            };
        }

        if (avisoSemTextoConfiavel || !possuiLinhas || confianca < 65) {
            return {
                textoStatus: "Parcial / não confiável",
                statusConferencia: "Exige conferência manual",
                confiavel: false,
            };
        }

        return {
            textoStatus: "Localizado",
            statusConferencia: "Leitura inicial aproveitável",
            confiavel: true,
        };
    }, [avisosLeituraArquivoScannerDds, leituraArquivoScannerDds, linhasLeituraArquivoScannerDds, textoPreviaArquivoScannerDds]);

    const diagnosticoEstruturalScannerDds = useMemo(() => {
        const normalizar = (valor = "") => String(valor || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, " ")
            .replace(/\s+/g, " ")
            .trim();

        const dataParaBr = (valor = "") => {
            const texto = String(valor || "").trim();
            const matchIso = texto.match(/^(\d{4})-(\d{2})-(\d{2})$/);

            if (matchIso) {
                return `${matchIso[3]}/${matchIso[2]}/${matchIso[1]}`;
            }

            return texto;
        };

        const textoLido = [
            leituraArquivoScannerDds?.textoExtraido || "",
            leituraArquivoScannerDds?.textoPrevia || "",
            ...linhasLeituraArquivoScannerDds.map((linha) => linha?.texto || ""),
        ].join(" ");

        const textoNormalizado = normalizar(textoLido);
        const contem = (...valores) => valores
            .map((valor) => normalizar(valor))
            .filter((valor) => valor.length >= 3)
            .some((valor) => textoNormalizado.includes(valor));

        const codigoEsperado = registroScannerDds?.codigo || codigoConferenciaDds || dadosDds.codigo || "";
        const empresaEsperada = registroScannerDds?.empresaNome || registroScannerDds?.dados?.empresaNome || "";
        const obraEsperada = registroScannerDds?.obraNome || registroScannerDds?.dados?.obraNome || "";
        const periodoInicio = registroScannerDds?.periodoInicio || registroScannerDds?.dados?.periodoInicio || "";
        const periodoFim = registroScannerDds?.periodoFim || registroScannerDds?.dados?.periodoFim || "";
        const participantesEsperados = participantesRegistroScannerDds.length;

        const gabaritoCarregado = Boolean(registroScannerDds);
        const folhaAnexada = Boolean(arquivoScannerDds);
        const leituraExecutada = Boolean(leituraArquivoScannerDds);

        const codigoLocalizado = leituraExecutada && contem(codigoEsperado);
        const empresaLocalizada = leituraExecutada && contem(empresaEsperada);
        const obraLocalizada = leituraExecutada && contem(obraEsperada);
        const periodoLocalizado = leituraExecutada && (
            contem(periodoInicio, dataParaBr(periodoInicio)) ||
            contem(periodoFim, dataParaBr(periodoFim))
        );

        let statusGeral = "Aguardando gabarito e folha";
        let statusVisual = "pendente";

        if (!gabaritoCarregado) {
            statusGeral = "Carregue o gabarito digital do DDS";
            statusVisual = "pendente";
        } else if (!folhaAnexada) {
            statusGeral = "Anexe a folha assinada";
            statusVisual = "pendente";
        } else if (!leituraExecutada) {
            statusGeral = "Execute a leitura inicial";
            statusVisual = "pendente";
        } else if (!qualidadeLeituraArquivoScannerDds.confiavel) {
            statusGeral = "Exige conferência manual";
            statusVisual = "manual";
        } else if (codigoLocalizado || empresaLocalizada || obraLocalizada || periodoLocalizado) {
            statusGeral = "Pré-conferência estrutural compatível";
            statusVisual = "ok";
        } else {
            statusGeral = "Leitura parcial: conferir manualmente";
            statusVisual = "manual";
        }

        const montarItem = ({ titulo, detalhe, status }) => ({ titulo, detalhe, status });

        return {
            statusGeral,
            statusVisual,
            codigoEsperado,
            empresaEsperada,
            obraEsperada,
            periodoTexto: [periodoInicio, periodoFim].filter(Boolean).join(" a "),
            participantesEsperados,
            itens: [
                montarItem({
                    titulo: "Gabarito digital",
                    detalhe: gabaritoCarregado ? "Registro DDS carregado pelo código." : "Busque o registro DDS antes da conferência.",
                    status: gabaritoCarregado ? "ok" : "pendente",
                }),
                montarItem({
                    titulo: "Folha anexada",
                    detalhe: folhaAnexada ? "Arquivo recebido para análise local." : "Anexe PDF ou imagem da folha assinada.",
                    status: folhaAnexada ? "ok" : "pendente",
                }),
                montarItem({
                    titulo: "Leitura inicial",
                    detalhe: leituraExecutada
                        ? `${qualidadeLeituraArquivoScannerDds.textoStatus}; ${linhasLeituraArquivoScannerDds.length} linha(s) OCR.`
                        : "Leitura ainda não executada.",
                    status: leituraExecutada
                        ? (qualidadeLeituraArquivoScannerDds.confiavel ? "ok" : "manual")
                        : "pendente",
                }),
                montarItem({
                    titulo: "Código DDS",
                    detalhe: !leituraExecutada
                        ? "Aguardando leitura."
                        : codigoLocalizado
                            ? `Código ${codigoEsperado} localizado no texto lido.`
                            : `Código ${codigoEsperado || "-"} não localizado com segurança.`,
                    status: !leituraExecutada ? "pendente" : (codigoLocalizado ? "ok" : "manual"),
                }),
                montarItem({
                    titulo: "Empresa",
                    detalhe: !empresaEsperada
                        ? "Empresa não informada no gabarito."
                        : empresaLocalizada
                            ? `Empresa localizada: ${empresaEsperada}.`
                            : `Empresa esperada: ${empresaEsperada}.`,
                    status: !leituraExecutada || !empresaEsperada ? "pendente" : (empresaLocalizada ? "ok" : "manual"),
                }),
                montarItem({
                    titulo: "Obra / setor",
                    detalhe: !obraEsperada
                        ? "Obra/setor não informado no gabarito."
                        : obraLocalizada
                            ? `Obra/setor localizado: ${obraEsperada}.`
                            : `Obra/setor esperado: ${obraEsperada}.`,
                    status: !leituraExecutada || !obraEsperada ? "pendente" : (obraLocalizada ? "ok" : "manual"),
                }),
                montarItem({
                    titulo: "Período semanal",
                    detalhe: !periodoInicio && !periodoFim
                        ? "Período não informado no gabarito."
                        : periodoLocalizado
                            ? `Período localizado: ${[periodoInicio, periodoFim].filter(Boolean).join(" a ")}.`
                            : `Período esperado: ${[periodoInicio, periodoFim].filter(Boolean).join(" a ")}.`,
                    status: !leituraExecutada || (!periodoInicio && !periodoFim) ? "pendente" : (periodoLocalizado ? "ok" : "manual"),
                }),
                montarItem({
                    titulo: "Participantes esperados",
                    detalhe: `${participantesEsperados} participante(s) no gabarito digital.`,
                    status: participantesEsperados > 0 ? "ok" : "pendente",
                }),
                montarItem({
                    titulo: "OCR visual auxiliar",
                    detalhe: "Não avaliada automaticamente. Permanece como conferência visual provável/manual, sem validação grafológica.",
                    status: "pendente",
                }),
            ],
        };
    }, [
        arquivoScannerDds,
        codigoConferenciaDds,
        dadosDds.codigo,
        leituraArquivoScannerDds,
        linhasLeituraArquivoScannerDds,
        participantesRegistroScannerDds.length,
        qualidadeLeituraArquivoScannerDds,
        registroScannerDds,
    ]);

    const preConferenciaParticipantesScannerDds = useMemo(() => {
        const normalizar = (valor = "") => String(valor || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, " ")
            .replace(/\s+/g, " ")
            .trim();

        const leituraExecutada = Boolean(leituraArquivoScannerDds);
        const leituraConfiavel = Boolean(qualidadeLeituraArquivoScannerDds?.confiavel);
        const participantesBase = Array.isArray(participantesRegistroScannerDds) ? participantesRegistroScannerDds : [];
        const totalPaginasArquivo = Number(leituraArquivoScannerDds?.totalPaginas || leituraArquivoScannerDds?.paginasLidas || 0);
        const paginasMarcacoesArquivoDds = new Set(
            (Array.isArray(leituraArquivoScannerDds?.marcacoesDdsDias) ? leituraArquivoScannerDds.marcacoesDdsDias : [])
                .map((item) => Number(item?.pagina || 0))
                .filter((pagina) => Number.isFinite(pagina) && pagina > 0)
        );

        const palavrasIgnoradas = new Set(["de", "da", "do", "das", "dos", "e"]);

        const paginaEsperadaPorNumero = (numero = 0) => {
            const valor = Number(numero || 0);

            if (!Number.isFinite(valor) || valor <= 0) return 1;
            if (valor <= 10) return 1;

            return Math.floor((valor - 11) / 20) + 2;
        };

        const textosPorPagina = (() => {
            const mapa = new Map();

            const registrar = (pagina, texto = "") => {
                const numeroPagina = Number(pagina || 0);
                const textoSeguro = String(texto || "").trim();

                if (!Number.isFinite(numeroPagina) || numeroPagina <= 0 || !textoSeguro) return;

                const atual = mapa.get(numeroPagina) || "";
                mapa.set(numeroPagina, `${atual} ${textoSeguro}`.trim());
            };

            for (const linha of linhasLeituraArquivoScannerDds) {
                registrar(linha?.pagina, linha?.texto || "");
            }

            const textoExtraido = String(leituraArquivoScannerDds?.textoExtraido || leituraArquivoScannerDds?.textoPrevia || "");
            const regexPagina = /Página\s+(\d+):\s*([\s\S]*?)(?=Página\s+\d+:|$)/gi;
            let match = regexPagina.exec(textoExtraido);

            while (match) {
                registrar(Number(match[1]), match[2] || "");
                match = regexPagina.exec(textoExtraido);
            }

            if (mapa.size === 0 && textoExtraido.trim()) {
                registrar(1, textoExtraido);
            }

            return mapa;
        })();

        const normalizarPagina = (pagina) => normalizar(textosPorPagina.get(pagina) || "");

        const contemTextoPagina = (pagina, valor = "") => {
            const termo = normalizar(valor);
            const textoPagina = normalizarPagina(pagina);

            if (!termo || termo.length < 3 || !textoPagina) return false;

            return textoPagina.includes(termo);
        };

        const contemNomeParcialPagina = (pagina, nome = "") => {
            const termoNome = normalizar(nome);
            const textoPagina = normalizarPagina(pagina);
            const palavrasNome = termoNome
                .split(" ")
                .filter((palavra) => palavra.length >= 4 && !palavrasIgnoradas.has(palavra));

            if (!textoPagina || palavrasNome.length === 0) return false;

            const encontradas = palavrasNome.filter((palavra) => textoPagina.includes(palavra)).length;

            if (palavrasNome.length === 1) {
                return encontradas === 1;
            }

            return encontradas >= Math.min(2, palavrasNome.length);
        };

        const participantes = participantesBase.map((participante, indice) => {
            const numero = Number(participante?.numero || indice + 1);
            const paginaEsperada = paginaEsperadaPorNumero(numero);
            const nome = participante?.nome || "";
            const funcao = participante?.funcao || "";
            const codigoSafescan =
                participante?.codigoSafescan ||
                participante?.codigoSafeScan ||
                participante?.codigoFuncionario ||
                participante?.codigo_funcionario ||
                participante?.codigo ||
                "";

            const paginaFoiAnalisada = Boolean(
                (totalPaginasArquivo >= paginaEsperada && paginaEsperada > 0) ||
                textosPorPagina.has(paginaEsperada) ||
                linhasLeituraArquivoScannerDds.some((linha) => Number(linha?.pagina || 0) === paginaEsperada) ||
                paginasMarcacoesArquivoDds.has(paginaEsperada)
            );

            if (!leituraExecutada) {
                return {
                    numero,
                    paginaEsperada,
                    nome,
                    funcao,
                    codigoSafescan,
                    status: "pendente",
                    statusTexto: "Aguardando leitura",
                    detalhe: "Execute a leitura inicial da folha assinada.",
                };
            }

            if (!paginaFoiAnalisada) {
                return {
                    numero,
                    paginaEsperada,
                    nome,
                    funcao,
                    codigoSafescan,
                    status: "pagina_nao_analisada",
                    statusTexto: "Página não anexada/lida",
                    detalhe: `Participante esperado na página ${paginaEsperada}, mas essa página não foi anexada/lida no arquivo atual.`,
                };
            }

            if (!leituraConfiavel) {
                return {
                    numero,
                    paginaEsperada,
                    nome,
                    funcao,
                    codigoSafescan,
                    status: "manual",
                    statusTexto: "Exige conferência manual",
                    detalhe: "OCR parcial/não confiável nesta página. Conferir participante manualmente.",
                };
            }
            const codigoLocalizado = contemTextoPagina(paginaEsperada, codigoSafescan);
            const nomeLocalizado = contemNomeParcialPagina(paginaEsperada, nome);

            if (codigoLocalizado || nomeLocalizado) {
                return {
                    numero,
                    paginaEsperada,
                    nome,
                    funcao,
                    codigoSafescan,
                    status: "localizado",
                    statusTexto: "Localizado na página esperada",
                    detalhe: codigoLocalizado
                        ? `Código SafeScan localizado na página ${paginaEsperada}.`
                        : `Nome localizado na página ${paginaEsperada}.`,
                };
            }

            return {
                numero,
                paginaEsperada,
                nome,
                funcao,
                codigoSafescan,
                status: "nao_localizado",
                statusTexto: "Não localizado",
                detalhe: `Nome/código não localizado com segurança na página ${paginaEsperada}.`,
            };
        });

        const total = participantes.length;
        const localizados = participantes.filter((item) => item.status === "localizado").length;
        const naoLocalizados = participantes.filter((item) => item.status === "nao_localizado").length;
        const paginasNaoAnalisadas = participantes.filter((item) => item.status === "pagina_nao_analisada").length;
        const manuaisDiretos = participantes.filter((item) => item.status === "manual").length;
        const manuais = manuaisDiretos;
        const pendentes = participantes.filter((item) => item.status === "pendente").length;

        let statusGeral = "Aguardando participantes";
        let statusVisual = "pendente";

        if (total === 0) {
            statusGeral = "Carregue o gabarito DDS";
            statusVisual = "pendente";
        } else if (!leituraExecutada) {
            statusGeral = "Execute a leitura inicial";
            statusVisual = "pendente";
        } else if (!leituraConfiavel) {
            statusGeral = "Exige conferência manual";
            statusVisual = "manual";
        } else if (paginasNaoAnalisadas > 0) {
            statusGeral = "Conferência parcial: há páginas não anexadas/lidas";
            statusVisual = "parcial";
        } else if (localizados === total) {
            statusGeral = "Participantes localizados na página esperada";
            statusVisual = "ok";
        } else if (localizados > 0) {
            statusGeral = "Conferência parcial de participantes";
            statusVisual = "manual";
        } else {
            statusGeral = "Participantes não localizados com segurança";
            statusVisual = "manual";
        }

        return {
            statusGeral,
            statusVisual,
            total,
            localizados,
            naoLocalizados,
            paginasNaoAnalisadas,
            manuais,
            pendentes,
            leituraExecutada,
            leituraConfiavel,
            participantes,
        };
    }, [
        leituraArquivoScannerDds,
        linhasLeituraArquivoScannerDds,
        participantesRegistroScannerDds,
        qualidadeLeituraArquivoScannerDds,
    ]);

    const diasConferenciaAssistidaDds = useMemo(() => {
        const normalizarTexto = (valor = "") => String(valor || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim()
            .toLowerCase();

        return diasRegistroScannerDds.map((dia, posicao) => {
            const temaPlanejado = String(
                dia?.tema || dia?.titulo || dia?.descricao || ""
            ).trim();

            const responsavelPlanejado = String(
                dia?.responsavel || dia?.aplicador || ""
            ).trim();

            const textoPlanejado =
                normalizarTexto(temaPlanejado);

            const semAtividadePlanejada = Boolean(
                dia?.semAtividade ||
                textoPlanejado.includes("nao houve atividade") ||
                textoPlanejado.includes("sem atividade") ||
                textoPlanejado.includes("nao teve atividade")
            );

            const textoBase = [
                dia?.data,
                dia?.curto,
                dia?.nome,
                temaPlanejado,
            ].filter(Boolean).join("-");

            const chaveAssistida =
                `${posicao + 1}-${textoBase || "dia"}`
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "")
                    .replace(/[^a-zA-Z0-9_-]+/g, "-")
                    .replace(/-+/g, "-")
                    .replace(/^-|-$/g, "");

            const confirmado =
                temasConferenciaAssistidaDds[posicao] &&
                typeof temasConferenciaAssistidaDds[posicao] === "object"
                    ? temasConferenciaAssistidaDds[posicao]
                    : {};

            const temaConfirmado = String(
                confirmado?.temaConfirmado || ""
            );

            const responsavelConfirmado = String(
                confirmado?.responsavelConfirmado || ""
            );

            const temaConfirmadoPreenchido =
                temaConfirmado.trim();

            const responsavelConfirmadoPreenchido =
                responsavelConfirmado.trim();

            const semAtividadeConfirmada =
                confirmado?.semAtividadeConfirmada === true;

            const statusTranscricao = semAtividadeConfirmada
                ? "sem_atividade"
                : temaConfirmadoPreenchido &&
                  responsavelConfirmadoPreenchido
                    ? "confirmado"
                    : "pendente";

            return {
                ...dia,
                posicaoSemana: posicao,
                indice: posicao,
                indiceAssistido: posicao + 1,
                chaveAssistida,
                temaPlanejado,
                responsavelPlanejado,
                semAtividadePlanejada,
                temaConfirmado,
                responsavelConfirmado,
                origemTemaConfirmado: String(
                    confirmado?.origemTemaConfirmado || ""
                ).trim(),
                semAtividadeConfirmada,
                statusTranscricao,
            };
        });
    }, [
        diasRegistroScannerDds,
        temasConferenciaAssistidaDds,
    ]);

    const diasAtivosConferenciaAssistidaDds = useMemo(
        () => diasConferenciaAssistidaDds.filter(
            (dia) => !dia.semAtividadeConfirmada
        ),
        [diasConferenciaAssistidaDds]
    );

    const estatisticasTemasConferenciaAssistidaDds =
        useMemo(() => {
            const ativos =
                diasConferenciaAssistidaDds.filter(
                    (dia) => !dia.semAtividadeConfirmada
                );

            const pendentes = ativos.filter(
                (dia) =>
                    !String(
                        dia.temaConfirmado || ""
                    ).trim() ||
                    !String(
                        dia.responsavelConfirmado || ""
                    ).trim()
            );

            return {
                temasConfirmados: ativos.filter(
                    (dia) =>
                        String(
                            dia.temaConfirmado || ""
                        ).trim()
                ).length,
                responsaveisIdentificados: ativos.filter(
                    (dia) =>
                        String(
                            dia.responsavelConfirmado || ""
                        ).trim()
                ).length,
                diasSemAtividade:
                    diasConferenciaAssistidaDds.filter(
                        (dia) =>
                            dia.semAtividadeConfirmada
                    ).length,
                pendencias: pendentes.length,
                diasPendentes: pendentes,
            };
        }, [diasConferenciaAssistidaDds]);

    const participantesCadastradosConferenciaAssistidaDds = useMemo(() => {
        const participantes = Array.isArray(preConferenciaParticipantesScannerDds?.participantes)
            ? preConferenciaParticipantesScannerDds.participantes
            : [];

        return participantes
            .filter((participante) => (
                participante?.status !== "pagina_nao_analisada" &&
                participante?.status !== "pendente"
            ))
            .map((participante) => ({
                ...participante,
                origem: participante?.origem || "cadastro",
                tipo: participante?.tipo || "colaborador",
            }));
    }, [preConferenciaParticipantesScannerDds]);

    const participantesAdicionaisAtivosConferenciaDds = useMemo(
        () =>
            participantesAdicionaisConferenciaDds
                .filter((participante) =>
                    String(participante?.nome || "").trim()
                )
                .map((participante) => ({
                    ...participante,
                    nome: String(participante.nome || "").trim(),
                    funcao: String(participante.funcao || "").trim(),
                    empresa: String(participante.empresa || "").trim(),
                    codigoSafescan: "",
                    origem: "adicional",
                    tipo: "visitante",
                })),
        [participantesAdicionaisConferenciaDds]
    );

    const participantesConferenciaAssistidaDds = useMemo(
        () => [
            ...participantesCadastradosConferenciaAssistidaDds,
            ...participantesAdicionaisAtivosConferenciaDds,
        ],
        [
            participantesCadastradosConferenciaAssistidaDds,
            participantesAdicionaisAtivosConferenciaDds,
        ]
    );

    return {
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
    };
}
