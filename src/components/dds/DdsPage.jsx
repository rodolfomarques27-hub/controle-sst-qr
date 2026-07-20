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
    } = useDdsResultadoApresentacaoDerivados({
        conferenciaAssistidaDds,
        dadosDds,
        diasAtivosConferenciaAssistidaDds,
        estatisticasConferenciaAssistidaDds,
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
