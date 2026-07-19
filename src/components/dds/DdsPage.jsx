import { useEffect, useMemo, useRef, useState } from "react";
import { carregarRegistroDdsPorCodigo, listarRegistrosDds, salvarRegistroDds } from "../../services/ddsRegistrosService";
import { executarLeituraDdsLocal } from "../../services/documentosOcrService";
import { BookOpen, Printer, Building2, CalendarClock, QrCode, ListChecks, MessageSquareText, ClipboardList, ShieldCheck, Users } from "lucide-react";
import dashboardHeroSstDds from "../../assets/dashboard-hero-sst.webp";
import criarComponentesApresentacaoDds from "./DdsPagePresentation";
import criarSuporteDds from "./DdsPageSupport";
import criarControladorMaoDeObraDds from "./DdsPageMaoDeObraController";
import criarControladorConferenciaAssistidaDds from "./DdsPageConferenciaAssistidaController";
import criarControladorReciboDds from "./DdsPageReciboController";
import criarControladorScannerDds from "./DdsPageScannerController";
import DdsConferenciaAssistidaSection from "./DdsConferenciaAssistidaSection";
import DdsLeituraArquivoScannerSection from "./DdsLeituraArquivoScannerSection";
import DdsReciboFinalSection from "./DdsReciboFinalSection";

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
    const [arquivoScannerDds, setArquivoScannerDds] = useState(null);
    const [erroArquivoScannerDds, setErroArquivoScannerDds] = useState("");
    const [leituraArquivoScannerDds, setLeituraArquivoScannerDds] = useState(null);
    const [carregandoLeituraArquivoScannerDds, setCarregandoLeituraArquivoScannerDds] = useState(false);
    const [erroLeituraArquivoScannerDds, setErroLeituraArquivoScannerDds] = useState("");
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

    const participantesRegistroScannerDds = useMemo(
        () => Array.isArray(registroScannerDds?.dados?.participantes) ? registroScannerDds.dados.participantes : [],
        [registroScannerDds]
    );


    const {
        buscarRegistroScannerDds,
        selecionarArquivoScannerDds,
        limparArquivoScannerDds,
        executarLeituraArquivoScannerDds,
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
        supabase,
    });

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

    const obterChaveFrequenciaAssistidaDds = (numero, diaRef) => {
        const chaveDia = typeof diaRef === "object" && diaRef !== null
            ? (diaRef.chaveAssistida || diaRef.indiceAssistido || diaRef.indice || diaRef.data || diaRef.nome || diaRef.curto)
            : diaRef;

        return `${numero}-${chaveDia}`;
    };

    const obterStatusFrequenciaAssistidaDds = (numero, diaRef) => (
        conferenciaAssistidaDds[obterChaveFrequenciaAssistidaDds(numero, diaRef)] || "manual"
    );

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

            const categoria = (
                origem === "adicional" ||
                tipo === "visitante"
            )
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


    const {
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














    // Restaurar Conferência Assistida salva no JSON dados.conferenciaAssistida.
    useEffect(() => {
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
                            semAtividadeConfirmada:
                                salvo?.semAtividadeConfirmada ===
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

    function aplicarObraCadastradaDds(idObra) {
        setObraSelecionadaIdDds(idObra);

        const obra = obrasEmpresaSelecionadaDds.find((item, indice) =>
            obterIdObraEmpresaDds(item, indice) === idObra
        );

        if (!obra) return;

        const nomeObra = obterNomeObraEmpresaDds(obra);
        const fiscalObra = obterFiscalObraEmpresaDds(obra);
        const liderObra = obterLiderObraEmpresaDds(obra);

        if (nomeObra) atualizarObraSetorDds(nomeObra);
        if (fiscalObra) atualizarFiscalIdealizaDds(fiscalObra);
        if (liderObra) {
            setDadosDds((dadosAtuais) => ({
                ...dadosAtuais,
                encarregado: liderObra,
            }));
        }
    }

    function atualizarObraSetorDds(valor) {
        setDadosDds((dadosAtuais) => ({
            ...dadosAtuais,
            obraSetor: valor,
        }));

        if (empresaSelecionadaChaveDds) {
            setObrasSetorPorEmpresaDds((dadosAtuais) => {
                const atualizados = {
                    ...(dadosAtuais || {}),
                    [empresaSelecionadaChaveDds]: valor,
                };

                salvarObrasSetorDdsPorEmpresa(atualizados);
                return atualizados;
            });
        }
    }

    function atualizarFiscalIdealizaDds(valor) {
        setDadosDds((dadosAtuais) => ({
            ...dadosAtuais,
            fiscalIdealiza: valor,
        }));

        if (empresaSelecionadaChaveDds) {
            setFiscalIdealizaPorEmpresaDds((dadosAtuais) => {
                const atualizados = {
                    ...(dadosAtuais || {}),
                    [empresaSelecionadaChaveDds]: valor,
                };

                salvarFiscalIdealizaDdsPorEmpresa(atualizados);
                return atualizados;
            });
        }
    }

    function atualizarCampoDadosDds(chave, valor) {
        if (chave === "obraSetor") {
            atualizarObraSetorDds(valor);
            return;
        }

        if (chave === "fiscalIdealiza") {
            atualizarFiscalIdealizaDds(valor);
            return;
        }

        setDadosDds((dadosAtuais) => ({
            ...dadosAtuais,
            [chave]: valor,
        }));
    }

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
    function atualizarTemaDiaDds(indiceDia, campo, valor) {
        setTemasDdsEditaveis((temasAtuais) => {
            const atualizados = criarTemasEditaveisDds().map((temaPadrao, indice) => ({
                ...temaPadrao,
                ...(temasAtuais[indice] || {}),
            }));

            atualizados[indiceDia] = {
                ...(atualizados[indiceDia] || {}),
                [campo]: valor,
            };

            return atualizados;
        });
    }

    function alternarDiaSemAtividadeDds(indiceDia) {
        setTemasDdsEditaveis((temasAtuais) => {
            const atualizados = normalizarTemasDdsEditaveis(temasAtuais);
            const atual = atualizados[indiceDia] || {
                tema: "",
                responsavel: "",
            };
            const semAtividadeAtual =
                normalizarTextoTemaDds(atual.tema) ===
                "NAO HOUVE ATIVIDADES";

            atualizados[indiceDia] = semAtividadeAtual
                ? {
                    tema: "",
                    responsavel: "",
                }
                : {
                    tema: "NÃO HOUVE ATIVIDADES",
                    responsavel: "",
                };

            return atualizados;
        });
    }

    function aplicarResponsavelGeralTemasDds() {
        const responsavelGeral = String(
            dadosDds.responsavel || ""
        ).trim();

        if (!responsavelGeral) {
            window.alert(
                "O responsável geral do DDS não está preenchido."
            );
            return;
        }

        setTemasDdsEditaveis((temasAtuais) =>
            normalizarTemasDdsEditaveis(temasAtuais).map((item) => {
                const semAtividade =
                    normalizarTextoTemaDds(item.tema) ===
                    "NAO HOUVE ATIVIDADES";

                return semAtividade
                    ? item
                    : {
                        ...item,
                        responsavel: responsavelGeral,
                    };
            })
        );
    }

    function limparResponsaveisTemasDds() {
        setTemasDdsEditaveis((temasAtuais) =>
            normalizarTemasDdsEditaveis(temasAtuais).map((item) => ({
                ...item,
                responsavel: "",
            }))
        );
    }

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

    const resultadoFinalApresentacaoDds = useMemo(() => {
        const valoresConferencia = Object.values(conferenciaAssistidaDds || {});
        const temAlgumaConfirmacaoAssistida = valoresConferencia.some((status) =>
            status === "presente" || status === "ausente" || status === "manual"
        );

        const temBaseAssistida = Boolean(
            temAlgumaConfirmacaoAssistida &&
            diasAtivosConferenciaAssistidaDds.length > 0 &&
            estatisticasConferenciaAssistidaDds.participantes > 0
        );

        if (!temBaseAssistida) {
            return resultadoFinalScannerDds;
        }

        const participantes = Number(estatisticasConferenciaAssistidaDds.participantes || 0);
        const presencas = Number(estatisticasConferenciaAssistidaDds.presencas || 0);
        const ausencias = Number(estatisticasConferenciaAssistidaDds.ausencias || 0);
        const manuais = Number(estatisticasConferenciaAssistidaDds.manuais || 0);
        const homemDia = Number(estatisticasConferenciaAssistidaDds.homemDia || 0);
        const diasAtivos = Number(diasAtivosConferenciaAssistidaDds.length || 0);
        const funcionariosSemanaCompleta = Number(estatisticasConferenciaAssistidaDds.funcionariosSemanaCompleta || 0);
        const totalCampos = participantes * diasAtivos;
        const conferenciaConcluidaOficialmente = fechamentoConferenciaAssistidaDds?.status === "concluida";

        const conferenciaFechada = totalCampos > 0 && manuais === 0;
        const statusVisual = conferenciaFechada ? "ok" : "parcial";
        const statusFinal = conferenciaConcluidaOficialmente ? "Conferência concluída oficialmente" : conferenciaFechada ? "Conferido oficialmente" : "Conferência assistida parcial";
        const titulo = conferenciaConcluidaOficialmente
            ? "Conferência DDS concluída oficialmente"
            : conferenciaFechada
                ? "Frequência oficial conferida"
                : "Frequência oficial com campos pendentes";
        const descricao = conferenciaConcluidaOficialmente
            ? "A Conferência Assistida foi concluída oficialmente e salva no registro DDS. O OCR visual permanece apenas como apoio técnico."
            : conferenciaFechada
                ? "A frequência oficial do DDS foi confirmada pela Conferência Assistida. O OCR visual permanece apenas como apoio técnico."
                : "A Conferência Assistida já possui dados oficiais, mas ainda existem campos marcados como manual/vazio para revisar.";

        const itens = [
            {
                titulo: "Conferência Assistida",
                ok: conferenciaFechada,
                manual: !conferenciaFechada,
                detalhe: `${presencas} presença(s), ${ausencias} ausência(s), ${manuais} manual/vazio e ${homemDia} homem-dia confirmado(s).`,
            },
            {
                titulo: "Dias ativos",
                ok: diasAtivos > 0,
                detalhe: `${diasAtivos} dia(s) com atividade usado(s) no cálculo oficial.`,
            },
            {
                titulo: "OCR visual auxiliar",
                ok: false,
                manual: true,
                detalhe: "Leitura automática usada apenas como apoio; a estatística oficial vem da Conferência Assistida.",
            },
        ];

        const recomendacoes = [];

        if (manuais > 0) {
            recomendacoes.push("Revisar os campos marcados como ? para fechar a frequência oficial sem pendências.");
        } else {
            recomendacoes.push("Manter a Conferência Assistida salva como base oficial da estatística DDS.");
        }

        recomendacoes.push("Usar o OCR visual apenas como apoio técnico, sem substituir a confirmação P / X / ?.");
        recomendacoes.push("Não usar o resultado como validação grafológica; manter conferência visual/documental.");

        return {
            ...resultadoFinalScannerDds,
            modoAssistido: true,
            statusFinal,
            statusVisual,
            titulo,
            descricao,
            itens,
            recomendacoes,
            resumo: {
                ...(resultadoFinalScannerDds?.resumo || {}),
                participantesTotal: participantes,
                participantesLocalizados: participantes,
                participantesManuais: manuais,
                participantesNaoLocalizados: ausencias,
                participantesPaginasNaoAnalisadas: 0,
                presencas,
                ausencias,
                manuais,
                homemDia,
                diasAtivos,
                totalCampos,
                funcionariosSemanaCompleta,
            },
        };
    }, [
        conferenciaAssistidaDds,
        diasAtivosConferenciaAssistidaDds,
        estatisticasConferenciaAssistidaDds,
        fechamentoConferenciaAssistidaDds,
        resultadoFinalScannerDds,
    ]);

    const resumoControleMaoDeObraDds = useMemo(() => {
        const funcoes = new Set();

        participantesConferenciaAssistidaDds.forEach((participante) => {
            const funcao = String(participante?.funcao || "Sem função").trim() || "Sem função";
            funcoes.add(funcao.toUpperCase());
        });

        const datasLancadas = diasAtivosConferenciaAssistidaDds
            .map((dia) => String(dia?.data || dia?.dataDds || dia?.dia || "").trim())
            .filter(Boolean);

        const primeiraData = datasLancadas[0] || dadosDds.periodoInicio || registroScannerDds?.periodoInicio || "";
        let mesReferencia = "-";

        if (primeiraData) {
            const data = new Date(primeiraData.includes("/") ? primeiraData.split("/").reverse().join("-") : primeiraData);
            if (!Number.isNaN(data.getTime())) {
                mesReferencia = data.toLocaleDateString("pt-BR", { month: "2-digit", year: "numeric" });
            }
        }

        return {
            funcoes: funcoes.size,
            diasLancados: datasLancadas.length,
            homemDia: Number(estatisticasConferenciaAssistidaDds?.homemDia || 0),
            mesReferencia,
        };
    }, [
        dadosDds.periodoInicio,
        diasAtivosConferenciaAssistidaDds,
        estatisticasConferenciaAssistidaDds,
        participantesConferenciaAssistidaDds,
        registroScannerDds,
    ]);

    const registroHistoricoMensalConcluidoDds = (registro) => {
        const status = String(
            registro?.dados?.conferenciaAssistida?.fechamento?.status ||
            registro?.dados?.fechamento?.status ||
            registro?.statusConferencia ||
            ""
        ).trim().toLowerCase();

        return status === "concluida";
    };

    const resumoHistoricoMensalMaoDeObraDds = useMemo(() => {
        const registros = Array.isArray(historicoMensalMaoDeObraDds) ? historicoMensalMaoDeObraDds : [];
        const registrosConcluidos = registros.filter((registro) => registroHistoricoMensalConcluidoDds(registro));
        const diasApurados = new Set();
        const empresas = new Set();
        const funcoes = new Set();

        let acumuladoPeriodo = 0;

        registrosConcluidos.forEach((registro) => {
            const dados = registro?.dados || {};
            const conferencia = dados?.conferenciaAssistida || {};
            const fechamento = conferencia?.fechamento || {};
            const estatisticas = fechamento?.estatisticas || conferencia?.estatisticas || {};
            const participantes = Array.isArray(conferencia?.participantes) ? conferencia.participantes : [];
            const diasAtivos = Array.isArray(conferencia?.diasAtivos) ? conferencia.diasAtivos : [];

            const presencasRegistro = Number(
                estatisticas?.presencas ??
                estatisticas?.homemDia ??
                fechamento?.resumo?.presencas ??
                0
            );

            if (Number.isFinite(presencasRegistro)) {
                acumuladoPeriodo += presencasRegistro;
            }

            const empresaNome = String(registro?.empresaNome || dados?.empresaNome || dados?.empresa || "").trim();
            if (empresaNome) empresas.add(empresaNome);

            diasAtivos.forEach((dia) => {
                const dataDia = String(dia?.data || dia?.dataDds || dia?.dia || "").trim();
                if (dataDia) diasApurados.add(dataDia);
            });

            participantes.forEach((participante) => {
                const funcao = String(participante?.funcao || participante?.cargo || "").trim();
                if (funcao) funcoes.add(funcao);
            });
        });

        const quantidadeDias = diasApurados.size;
        const efetivoMedio = quantidadeDias > 0 ? acumuladoPeriodo / quantidadeDias : 0;
        const ddsConcluidos = registrosConcluidos.length;
        const ddsPendentes = Math.max(registros.length - ddsConcluidos, 0);

        return {
            ddsEncontrados: registros.length,
            ddsConcluidos,
            ddsPendentes,
            diasApurados: quantidadeDias,
            acumuladoPeriodo,
            efetivoMedio,
            empresas: empresas.size,
            funcoes: funcoes.size,
            possuiPendencias: ddsPendentes > 0,
        };
    }, [historicoMensalMaoDeObraDds]);

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

    function escaparHtmlControleMaoDeObraDds(valor = "") {
        return String(valor ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function parseDataControleMaoDeObraDds(valor = "") {
        const texto = String(valor || "").trim();

        if (!texto) return null;

        if (/^\d{4}-\d{2}-\d{2}/.test(texto)) {
            const [ano, mes, dia] = texto.slice(0, 10).split("-").map(Number);
            return new Date(ano, mes - 1, dia);
        }

        if (/^\d{2}\/\d{2}\/\d{4}/.test(texto)) {
            const [dia, mes, ano] = texto.slice(0, 10).split("/").map(Number);
            return new Date(ano, mes - 1, dia);
        }

        const data = new Date(texto);
        return Number.isNaN(data.getTime()) ? null : data;
    }

    function formatarDataControleMaoDeObraDds(valor = "") {
        const data = parseDataControleMaoDeObraDds(valor);

        if (!data) return "-";

        return data.toLocaleDateString("pt-BR");
    }

    function normalizarNomeEmpresaMaoDeObraDds(valor = "") {
        return String(valor || "Empresa não informada").trim().toUpperCase() || "EMPRESA NÃO INFORMADA";
    }

    function normalizarFuncaoMaoDeObraDds(valor = "") {
        return String(valor || "Sem função").trim().toUpperCase() || "SEM FUNÇÃO";
    }

    function formatarNumeroMaoDeObraDds(valor = 0) {
        const numero = Number(valor || 0);

        if (Number.isInteger(numero)) {
            return String(numero);
        }

        return numero.toFixed(1).replace(".", ",");
    }

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

    function normalizarChaveCalendarioMaoDeObraDds(valor = "") {
        return String(valor || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, " ")
            .trim();
    }

    function obterObrasDisponiveisCalendarioMaoDeObraDds() {
        return obrasEmpresasDds.filter(Boolean);
    }

    function obterIdObraCalendarioMaoDeObraDds() {
        return String(
            reciboConferenciaFinalDds?.obraId ||
            reciboConferenciaFinalDds?.obra_id ||
            registroScannerDds?.obraId ||
            registroScannerDds?.obra_id ||
            registroScannerDds?.dados?.obraId ||
            registroScannerDds?.dados?.obra_id ||
            dadosDds?.obraId ||
            dadosDds?.obra_id ||
            obraSelecionadaIdDds ||
            ""
        ).trim();
    }

    function obterNomeObraCalendarioMaoDeObraDds() {
        return String(
            reciboConferenciaFinalDds?.obra ||
            reciboConferenciaFinalDds?.obraNome ||
            registroScannerDds?.obraNome ||
            registroScannerDds?.dados?.obraNome ||
            dadosDds?.obraNome ||
            dadosDds?.obraSetor ||
            dadosDds?.obra ||
            ""
        ).trim();
    }

    function obterObraReferenciaCalendarioMaoDeObraDds() {
        const obraId = obterIdObraCalendarioMaoDeObraDds();
        const obraNome = obterNomeObraCalendarioMaoDeObraDds();
        const obraIdBusca = normalizarChaveCalendarioMaoDeObraDds(obraId);
        const obraNomeBusca = normalizarChaveCalendarioMaoDeObraDds(obraNome);
        const obrasDisponiveis = obterObrasDisponiveisCalendarioMaoDeObraDds();

        const obraEncontrada = obrasDisponiveis.find((obra) => {
            const id = normalizarChaveCalendarioMaoDeObraDds(obra?.id || obra?.obraId || obra?.obra_id);
            const nome = normalizarChaveCalendarioMaoDeObraDds(obra?.nome || obra?.obraNome || obra?.obra_nome || obra?.obra || obra?.descricao);

            return (obraIdBusca && id && id === obraIdBusca) || (obraNomeBusca && nome && nome === obraNomeBusca);
        });

        if (obraEncontrada) return obraEncontrada;

        return {
            id: obraId,
            nome: obraNome,
            cidade:
                reciboConferenciaFinalDds?.cidade ||
                reciboConferenciaFinalDds?.obraCidade ||
                registroScannerDds?.cidade ||
                registroScannerDds?.obraCidade ||
                registroScannerDds?.dados?.cidade ||
                registroScannerDds?.dados?.obraCidade ||
                dadosDds?.cidade ||
                dadosDds?.obraCidade ||
                "",
            uf:
                reciboConferenciaFinalDds?.uf ||
                reciboConferenciaFinalDds?.obraUf ||
                registroScannerDds?.uf ||
                registroScannerDds?.obraUf ||
                registroScannerDds?.dados?.uf ||
                registroScannerDds?.dados?.obraUf ||
                dadosDds?.uf ||
                dadosDds?.obraUf ||
                "",
        };
    }

    function resolverCalendarioMaoDeObraDds(obraReferencia = null) {
        const cidade = String(
            obraReferencia?.cidade ||
            obraReferencia?.municipio ||
            obraReferencia?.município ||
            obraReferencia?.cidade_nome ||
            obraReferencia?.obraCidade ||
            ""
        ).trim();

        const uf = String(
            obraReferencia?.uf ||
            obraReferencia?.estado ||
            obraReferencia?.obraUf ||
            obraReferencia?.obraEstado ||
            ""
        ).trim().toUpperCase().slice(0, 2);

        const cidadeBusca = normalizarChaveCalendarioMaoDeObraDds(cidade);
        const ufBusca = normalizarChaveCalendarioMaoDeObraDds(uf);

        if (!cidadeBusca && !ufBusca) {
            return {
                ...calendariosMaoDeObraDds[0],
                origem: "fallback padrão",
            };
        }

        const preset = calendariosMaoDeObraDds.find((calendario) =>
            normalizarChaveCalendarioMaoDeObraDds(calendario.cidade) === cidadeBusca &&
            normalizarChaveCalendarioMaoDeObraDds(calendario.uf) === ufBusca
        );

        if (preset) {
            return {
                ...preset,
                origem: "cadastro da obra",
            };
        }

        const feriadosEstaduaisFixos =
            uf === "SP"
                ? [{ mes: 7, dia: 9, nome: "Revolução Constitucionalista" }]
                : [];

        const cidadeRotulo = cidade || "Município não informado";
        const ufRotulo = uf || "UF não informada";

        return {
            id: "obra-" + normalizarChaveCalendarioMaoDeObraDds(cidadeRotulo + "-" + ufRotulo).replace(/\s+/g, "-"),
            cidade: cidadeRotulo,
            uf: ufRotulo,
            rotulo: cidadeRotulo + " / " + ufRotulo,
            feriadosMunicipaisFixos: [],
            feriadosEstaduaisFixos,
            origem: "cadastro da obra",
        };
    }

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



















    async function imprimirDdsComQrConferencia() {
        if (salvandoRegistroDds) return;

        const diasPendentes = diasSemanaComTemasDds.filter((dia) => (
            !dia.semAtividade &&
            (
                !String(dia.tema || "").trim() ||
                !String(dia.responsavel || "").trim()
            )
        ));

        if (diasPendentes.length > 0) {
            const nomesDias = diasPendentes
                .map((dia) => dia.nome || dia.curto)
                .filter(Boolean)
                .join(", ");

            const mensagem =
                "Preencha o tema e o responsável ou marque 'Não houve atividades' em: " +
                nomesDias +
                ".";

            setErroRegistroDds(mensagem);
            window.alert(mensagem);
            return;
        }

        setErroRegistroDds("");

        if (!supabase) {
            window.print();
            return;
        }

        setSalvandoRegistroDds(true);
        setErroRegistroDds("");

        try {
            const registro = await salvarRegistroDds({
                supabase,
                registro: {
                    codigo: dadosDds.codigo,
                    empresaId: obterUuidSeguroDds(obterIdEmpresaObjetoDds(empresaSelecionadaDds)),
                    obraId: obterUuidSeguroDds(obraSelecionadaIdDds),
                    empresaNome: dadosDds.empresa,
                    obraNome: dadosDds.obraSetor,
                    periodoInicio: inicioSemanaDds,
                    periodoFim: fimSemanaDds,
                    responsavelNome: dadosDds.responsavel,
                    fiscalIdealiza: dadosDds.fiscalIdealiza,
                    liderEncarregado: dadosDds.encarregado,
                    dados: {
                        periodo: dadosDds.periodo,
                        resumoSemana: dadosDds.resumoSemana,
                        turno: dadosDds.turno,
                        funcaoResponsavel: dadosDds.funcaoResponsavel,
                        totalParticipantes: participantesSistemaDds.length,
                        totalFolhas: folhasContinuacaoDds.length + 1,
                        recadosSemana: recadosDdsEditaveis,
                        orientacoesImportantes: orientacoesDdsEditaveis,
                        aniversariantesSemana: aniversariantesSemanaDds,
                        logosEmpresasCabecalho: dadosDdsComRegistro.logosEmpresasCabecalho || [],
                        empresaLogoUrl: dadosDdsComRegistro.empresaLogoUrl || "" ,
                        empresaLogoNome: dadosDdsComRegistro.empresaLogoNome || "" ,
                        contratanteLogoUrl: dadosDdsComRegistro.contratanteLogoUrl || "" ,
                        contratanteLogoNome: dadosDdsComRegistro.contratanteLogoNome || "" ,
                        participantes: participantesSistemaDds.map((participante, indice) => ({
                            numero: participante.numero || indice + 1,
                            codigoSafescan:
                                participante.codigoFuncionario ||
                                participante.codigo_funcionario ||
                                participante.codigoSafescan ||
                                participante.codigoSafeScan ||
                                participante.codigo_safescan ||
                                participante.codigo ||
                                participante.codigo_colaborador ||
                                participante.codigoColaborador ||
                                participante.codigo_qr ||
                                participante.qr_codigo ||
                                participante.codigoQr ||
                                participante.matricula_esocial ||
                                participante.matriculaEsocial ||
                                participante.matricula ||
                                "",
                            nome: participante.nome,
                            funcao: participante.funcao,
                            empresa: participante.empresa,
                        })),
                        diasSemana: diasSemanaComTemasDds.map((dia) => ({
                            dia: dia.dia,
                            data: dia.data,
                            tema: dia.tema,
                            responsavel: dia.responsavel,
                            semAtividade: Boolean(dia.semAtividade),
                        })),
                    },
                    status: "Ativo",
                },
            });

            setRegistroDdsConferencia(registro);
            window.setTimeout(() => window.print(), 150);
        } catch (error) {
            const mensagem = error?.message || "Não foi possível gerar o QR de conferência do DDS.";
            setErroRegistroDds(mensagem);
            window.alert(mensagem);
        } finally {
            setSalvandoRegistroDds(false);
        }
    }



    function registroAtualPertenceAoMesHistoricoDds(registro, periodo) {
        if (!registro || !periodo?.inicio || !periodo?.fim) return false;

        const inicio = parseDataControleMaoDeObraDds(periodo.inicio);
        const fim = parseDataControleMaoDeObraDds(periodo.fim);

        if (!inicio || !fim) return false;

        const codigo = String(registro?.codigo || registro?.dados?.codigo || "").trim();
        const codigoMes = codigo.match(/DDS-(\d{4})-(\d{2})/i);

        if (codigoMes) {
            const anoCodigo = Number(codigoMes[1]);
            const mesCodigo = Number(codigoMes[2]) - 1;

            if (anoCodigo === inicio.getFullYear() && mesCodigo === inicio.getMonth()) {
                return true;
            }
        }

        const datas = [
            registro?.periodoInicio,
            registro?.periodoFim,
            registro?.dataInicio,
            registro?.dataFim,
            registro?.data,
            registro?.criadoEm,
            registro?.createdAt,
            registro?.created_at,
            registro?.updatedAt,
            registro?.updated_at,
            registro?.dados?.periodoInicio,
            registro?.dados?.periodoFim,
            registro?.dados?.dataInicio,
            registro?.dados?.dataFim,
            registro?.dados?.data,
            registro?.dados?.salvoEm,
            registro?.dados?.conferenciaAssistida?.salvoEm,
            registro?.dados?.conferenciaAssistida?.fechamento?.concluidoEm,
            registro?.dados?.conferenciaAssistida?.fechamento?.data,
        ];

        return datas.some((valor) => {
            const data = parseDataControleMaoDeObraDds(valor);
            return data && data >= inicio && data <= fim;
        });
    }







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
                                className="flex flex-nowrap items-end gap-2 overflow-x-auto pb-1 lg:max-w-[640px]"
                            >
                                <label className="block w-[200px] shrink-0">
                                    <span className="text-[10px] font-black uppercase tracking-wide text-cyan-700">
                                        Código do DDS
                                    </span>
                                    <input
                                        type="text"
                                        value={codigoConferenciaDds}
                                        onChange={(evento) => setCodigoConferenciaDds(evento.target.value)}
                                        placeholder={dadosDds.codigo || "Ex.: DDS-EMP-2026-06-14"}
                                        className="mt-2 w-full rounded-xl border border-cyan-100 bg-cyan-50/60 px-3 py-2 text-sm font-black text-slate-800 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                                    />
                                </label>

                                <div className="mt-3 flex flex-wrap gap-2">
                                    <button
                                        type="submit"
                                        disabled={carregandoScannerDds}
                                        className="h-9 whitespace-nowrap shrink-0 rounded-xl bg-cyan-600 px-3 py-2 text-[11px] font-black text-white shadow-sm transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {carregandoScannerDds ? "Buscando..." : "Buscar registro"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCodigoConferenciaDds(dadosDds.codigo || "")}
                                        className="h-9 whitespace-nowrap shrink-0 rounded-xl border border-cyan-200 bg-white px-3 py-2 text-[11px] font-black text-cyan-800 shadow-sm transition hover:bg-cyan-50"
                                    >
                                        Usar código atual
                                    </button>
                                </div>

                                {erroScannerDds && (
                                    <p className="mt-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
                                        {erroScannerDds}
                                    </p>
                                )}
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
     atualizarTemaConferenciaAssistidaDds={atualizarTemaConferenciaAssistidaDds}
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
     obterStatusFrequenciaAssistidaDds={obterStatusFrequenciaAssistidaDds}
     participantesAdicionaisAtivosConferenciaDds={participantesAdicionaisAtivosConferenciaDds}
     participantesAdicionaisConferenciaDds={participantesAdicionaisConferenciaDds}
     participantesConferenciaAssistidaDds={participantesConferenciaAssistidaDds}
     reabrirConferenciaAssistidaDds={reabrirConferenciaAssistidaDds}
     salvandoConferenciaAssistidaDds={salvandoConferenciaAssistidaDds}
     salvandoFechamentoConferenciaDds={salvandoFechamentoConferenciaDds}
     salvarConferenciaAssistidaDds={salvarConferenciaAssistidaDds}
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
        <div className="rounded-xl bg-white/80 p-3 text-center ring-1 ring-white">
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Participantes</p>
            <p className="mt-1 text-base font-black text-slate-950">{resultadoFinalApresentacaoDds.resumo.participantesTotal}</p>
        </div>
        <div className="rounded-xl bg-white/80 p-3 text-center ring-1 ring-white">
            <p className="text-[10px] font-black uppercase tracking-wide text-emerald-700">{resultadoFinalApresentacaoDds.modoAssistido ? "Presenças" : "Localizados"}</p>
            <p className="mt-1 text-base font-black text-emerald-900">{resultadoFinalApresentacaoDds.modoAssistido ? resultadoFinalApresentacaoDds.resumo.presencas : resultadoFinalApresentacaoDds.resumo.participantesLocalizados}</p>
        </div>
        <div className="rounded-xl bg-white/80 p-3 text-center ring-1 ring-white">
            <p className="text-[10px] font-black uppercase tracking-wide text-amber-700">{resultadoFinalApresentacaoDds.modoAssistido ? "Ausências" : "Manual"}</p>
            <p className="mt-1 text-base font-black text-amber-900">{resultadoFinalApresentacaoDds.modoAssistido ? resultadoFinalApresentacaoDds.resumo.ausencias : resultadoFinalApresentacaoDds.resumo.participantesManuais}</p>
        </div>
        <div className="rounded-xl bg-white/80 p-3 text-center ring-1 ring-white">
            <p className="text-[10px] font-black uppercase tracking-wide text-red-700">{resultadoFinalApresentacaoDds.modoAssistido ? "Manual/vazio" : "Não localizados"}</p>
            <p className="mt-1 text-base font-black text-red-900">{resultadoFinalApresentacaoDds.modoAssistido ? resultadoFinalApresentacaoDds.resumo.manuais : resultadoFinalApresentacaoDds.resumo.participantesNaoLocalizados}</p>
        </div>
        <div className="rounded-xl bg-white/80 p-3 text-center ring-1 ring-white">
            <p className="text-[10px] font-black uppercase tracking-wide text-orange-700">{resultadoFinalApresentacaoDds.modoAssistido ? "Acumulado do período" : "Pág. não anexada"}</p>
            <p className="mt-1 text-base font-black text-orange-900">{resultadoFinalApresentacaoDds.modoAssistido ? resultadoFinalApresentacaoDds.resumo.homemDia : resultadoFinalApresentacaoDds.resumo.participantesPaginasNaoAnalisadas}</p>
        </div>
    </div>

    <div className="mt-4 grid gap-2 lg:grid-cols-3">
        {resultadoFinalApresentacaoDds.itens.map((item, indice) => (
            <div
                key={`resultado-final-dds-${indice}`}
                className="rounded-xl bg-white/80 p-3 ring-1 ring-white"
            >
                <p className={`text-[10px] font-black uppercase tracking-wide ${
                    item.ok
                        ? "text-emerald-700"
                        : item.manual
                            ? "text-amber-700"
                            : "text-slate-400"
                }`}>
                    {item.ok ? "OK" : item.manual ? "Manual" : "Pendente"}
                </p>
                <p className="mt-1 text-sm font-black text-slate-950">{item.titulo}</p>
                <p className="mt-1 text-xs font-bold leading-5 text-slate-600">{item.detalhe}</p>
            </div>
        ))}
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
    className="flex min-h-[52px] cursor-default flex-col gap-3 rounded-xl transition hover:bg-slate-50 lg:flex-row lg:items-center lg:justify-between"
>
        <div>
            <p className="text-sky-700 text-[10px] font-black uppercase tracking-wide">
                Implantação / obra
            </p>
            <h4 className="mt-1 text-base font-black text-slate-950">
                Controle mensal de mão de obra
            </h4>
            <p className="mt-1 max-w-4xl text-xs font-semibold leading-5 text-slate-500">
                Gera PDF e Excel consolidado por empresa/contratada e função, usando a Conferência Assistida como base de presença. Expediente normal: 07:00 às 17:00, almoço das 12:00 às 13:00 e DDS das 07:00 às 07:10.
            </p>
        </div>

        <div className="flex flex-wrap items-center gap-2" onClick={(evento) => evento.stopPropagation()}>
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
        Expediente normal das 07:00 às 17:00, almoço das 12:00 às 13:00 e DDS das 07:00 às 07:10.
    </div>
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
    className="grid min-h-[52px] cursor-default gap-4 rounded-xl transition hover:bg-slate-50 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center"
>
        <div className="min-w-0">
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-wide">
                Histórico mensal
            </p>
            <h3 className="mt-1 whitespace-nowrap text-base font-black text-slate-950">
                Histórico mensal de mão de obra
            </h3>
            <p className="mt-1 max-w-[620px] whitespace-nowrap text-xs font-semibold leading-5 text-slate-500">
                Busca os DDS da obra selecionada no mês informado e resume a base oficial salva na Conferência Assistida.
            </p>
        </div>

        <div className="flex flex-wrap items-end gap-2 xl:flex-nowrap xl:justify-end xl:min-w-[760px]" onClick={(evento) => evento.stopPropagation()}>
            <label className="block">
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
                Período: {registroScannerDds.periodoInicio || "-"} a {registroScannerDds.periodoFim || "-"}
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
            onClick={() => alternarCardDds("registroLocalizado")}
            className="shrink-0"
        >
            <BotaoAlternarCardDds
                aberto={cardDdsAberto("registroLocalizado")}
            />
        </button>
    </div>
</div>

<div className="mt-4 grid gap-2 sm:grid-cols-3">
    <div className="flex min-h-[56px] flex-col items-center justify-center rounded-xl border border-violet-100 bg-violet-50 p-2.5 text-center ring-1 ring-violet-100">
        <p className="text-[10px] font-black uppercase tracking-wide text-violet-700">
            Participantes
        </p>

        <p className="mt-1 text-lg font-black text-violet-950">
            {participantesRegistroScannerDds.length}
        </p>
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
