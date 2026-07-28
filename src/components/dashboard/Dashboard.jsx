/* eslint-disable no-unused-vars */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    AlertTriangle,
    BadgeCheck,
    Building2,
    CalendarClock,
    CheckCircle2,
    Eye,
    HardHat,
    Lock,
    RefreshCw,
    Timer,
    Upload,
    UserRound,
    XCircle,
} from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { Header } from "../commonComponents";
import dashboardHeroBackground from "../../assets/dashboard-hero-sst.webp";
import { calcularUsoStorageRealSistema } from "../../services/storageSegurancaService";
import { DashboardBlocosGrid } from "./DashboardBlocosGrid";
import { DashboardHeaderAcoes } from "./DashboardHeaderAcoes";
import { DashboardPreviewFiltro } from "./DashboardPreviewFiltro";
import { DashboardBlocoConteudo } from "./DashboardBlocoConteudo";
import { DashboardControles } from "./DashboardControles";
import { DashboardStorageDesktop } from "./DashboardStorageDesktop";
import { DashboardStorageMobile } from "./DashboardStorageMobile";
import { DashboardCartaResumoModal } from "./DashboardCartaResumoModal";
import {
    normalizarAuditoriaCampo,
    auditoriaCampoAberta,
} from "../../services/auditoriaCampoService";
import {
    obterStatusInicialColaborador,
    avaliarTreinamentosColaborador,
    mesAniversarioColaborador,
    diaAniversarioColaborador,
    proximoAniversariante,
    deveMostrarAniversarioColaborador,
    obterFuncaoCargoColaborador,
    colaboradorContaComoMobilizado,
    itemDocumentoCriticoColaborador,
    statusGeral,
} from "../../services/colaboradorDocumentosService";
import {
    statusEmpresaDocumento,
    normalizarStatusEmpresa,
} from "../../services/empresaDocumentosService";
import {
    FUNCAO_EMAIL_ALERTA_TST,
    LIMITE_STORAGE_MB,
} from "../../constants/sistemaConstants";
import { TIPOS_MODELO_EMAIL_SST } from "../../constants/modelosEmailSstConstants";
import { baixarRelatorioDashboardSstPDF } from "../../services/exportacaoService";
import {
    painelPadraoDashboard,
    cartasPadraoDashboard,
    tamanhosPadraoCartasDashboard,
    tamanhosPadraoBlocosDashboard,
    ordemPadraoBlocosDashboard,
    ordemPadraoCartasDashboard,
    opcoesPainelDashboard,
    blocosRecolhidosPadraoDashboard,
    moverItemPainel,
    reordenarPorArrastePainel,
    prepararArrastePainel,
    normalizarTamanhoCartaDashboard,
    classeTamanhoCartaDashboard,
    classeValorCartaDashboard,
    classeTamanhoBlocoDashboard,
    estiloCartaDashboard,
} from "../../services/dashboardService";
import { calcularResumoDashboardSst } from "../../services/dashboardResumoService";
import { carregarHorasTrabalhadasDdsMes } from "../../services/dashboardHorasDdsService";
import { carregarHistoricoStorageDashboard } from "../../services/storageHistoricoDashboardService";
import {
    normalizarTextoBusca,
    diasParaVencer,
    formatDate,
    formatarBytes,
    calcularPercentualUsoStorage,
    normalizarEmailDestinatario,
} from "../../utils/sstUtils";

const CACHE_USO_STORAGE_DASHBOARD = "dashboardSstUsoStorageResumo";

const CHAVES_CARTAS_COM_RESUMO = new Set([
    "colaboradoresMobilizados",
    "colaboradoresLiberados",
    "comPendencia",
    "emAnalise",
    "empresasAtivas",
    "documentosVencidos",
    "documentosAVencer",
    "treinamentosVencidos",
    "documentosFuncionariosAVencer",
    "horasTrabalhadasMes",
    "colaboradoresBloqueados",
    "desviosAbertos",
    "aniversariantesMes",
    "armazenamentoUtilizado",
]);

function obterDataHeroDashboard(data = new Date()) {
    return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
    }).format(data);
}

function obterDiaSemanaHeroDashboard(data = new Date()) {
    return new Intl.DateTimeFormat("pt-BR", {
        weekday: "long",
    }).format(data);
}

function obterHoraHeroDashboard(data = new Date()) {
    return new Intl.DateTimeFormat("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
    }).format(data);
}

function obterPrimeiroNomeUsuarioHeroDashboard(usuario = null) {
    const email = String(usuario?.email || "").trim();
    const nomeCompleto = String(
        usuario?.nome
        || usuario?.name
        || usuario?.displayName
        || usuario?.user_metadata?.nome
        || usuario?.user_metadata?.name
        || ""
    ).trim();

    const origem = nomeCompleto || (email.includes("@") ? email.split("@")[0] : "");
    const origemLimpa = origem
        .replace(/\d+/g, "")
        .replace(/[._-]+/g, " ")
        .trim();

    if (/^rodolfo/i.test(origemLimpa)) return "Rodolfo";

    const primeiroNome = origemLimpa.split(/\s+/).filter(Boolean)[0] || "";

    return primeiroNome
        ? primeiroNome.charAt(0).toUpperCase() + primeiroNome.slice(1).toLowerCase()
        : "usuário";
}

function emailTstDaEmpresa(colaborador) {
    return normalizarEmailDestinatario(colaborador?.empresaTstEmail || "");
}

function emailTstDoCadastroEmpresa(empresa) {
    return normalizarEmailDestinatario(
        empresa?.tst_email ||
        empresa?.tstEmail ||
        ""
    );
}

export function Dashboard({
    usuario = null,
    colaboradores = [],
    empresasBanco = [],
    documentosEmpresas = [],
    auditoria = [],
    auditoriasCampo = [],
    onSelectColab,
    onVisualizarDocumentoEmpresa,
    onVisualizarCertificado,
    onRegistrarEmailEnviado,
    onAtualizarInformacoes,
    atualizandoInformacoes = false,
}) {
    const [agoraHeroDashboard, setAgoraHeroDashboard] = useState(() => new Date());
    useEffect(() => {
        const intervaloAgoraHeroDashboard = setInterval(() => {
            setAgoraHeroDashboard(new Date());
        }, 60000);

        return () => clearInterval(intervaloAgoraHeroDashboard);
    }, []);
    const dataHeroDashboard = useMemo(() => obterDataHeroDashboard(agoraHeroDashboard), [agoraHeroDashboard]);
    const diaSemanaHeroDashboard = useMemo(() => obterDiaSemanaHeroDashboard(agoraHeroDashboard), [agoraHeroDashboard]);
    const horaHeroDashboard = useMemo(() => obterHoraHeroDashboard(agoraHeroDashboard), [agoraHeroDashboard]);
    const nomeUsuarioHeroDashboard = useMemo(() => obterPrimeiroNomeUsuarioHeroDashboard(usuario), [usuario]);

    const [enviandoEmail, setEnviandoEmail] = useState(false);
    const [atualizandoInformacoesLocais, setAtualizandoInformacoesLocais] = useState(false);
    const [usoStorageDashboard, setUsoStorageDashboard] = useState(() => {
        if (typeof window === "undefined") {
            return { totalBytes: 0, arquivos: 0, buckets: [], atualizadoEm: "" };
        }

        try {
            const salvo = JSON.parse(window.localStorage.getItem(CACHE_USO_STORAGE_DASHBOARD) || "null");

            if (salvo && typeof salvo === "object") {
                return {
                    totalBytes: Number(salvo.totalBytes || 0),
                    arquivos: Number(salvo.arquivos || 0),
                    buckets: Array.isArray(salvo.buckets) ? salvo.buckets : [],
                    atualizadoEm: salvo.atualizadoEm || "",
                };
            }
        } catch {
            // Mantém valores zerados se o cache local estiver inválido.
        }

        return { totalBytes: 0, arquivos: 0, buckets: [], atualizadoEm: "" };
    });
    const [carregandoStorageDashboard, setCarregandoStorageDashboard] = useState(false);
    const [historicoStorageDashboard, setHistoricoStorageDashboard] = useState([]);
    const [horasDdsMes, setHorasDdsMes] = useState({
        totalMinutos: 0,
        totalHorasFormatado: "0",
        totalPresencas: 0,
        totalDias: 0,
        itens: [],
        carregando: true,
        erro: "",
    });
    const storageAutoCarregadoDashboardRef = useRef(false);
    const [mostrarFiltroPainel, setMostrarFiltroPainel] = useState(false);
    const [resumoCartaDashboard, setResumoCartaDashboard] = useState(null);
    const [abaPersonalizacaoPainel, setAbaPersonalizacaoPainel] = useState("cartas");
    const [cartaArrastandoDashboard, setCartaArrastandoDashboard] = useState(null);
    const [blocoArrastandoDashboard, setBlocoArrastandoDashboard] = useState(null);
    const [blocosPainelDashboard, setBlocosPainelDashboard] = useState(() => {
        if (typeof window === "undefined") return painelPadraoDashboard;

        try {
            const salvo = JSON.parse(window.localStorage.getItem("dashboardSstBlocosVisiveis") || "null");
            return salvo && typeof salvo === "object" ? { ...painelPadraoDashboard, ...salvo } : painelPadraoDashboard;
        } catch {
            return painelPadraoDashboard;
        }
    });

    const [cartasVisiveisDashboard, setCartasVisiveisDashboard] = useState(() => {
        if (typeof window === "undefined") return cartasPadraoDashboard;

        try {
            const salvo = JSON.parse(window.localStorage.getItem("dashboardSstCartasVisiveis") || "null");
            return salvo && typeof salvo === "object" ? { ...cartasPadraoDashboard, ...salvo } : cartasPadraoDashboard;
        } catch {
            return cartasPadraoDashboard;
        }
    });

    const [tamanhosCartasDashboard, setTamanhosCartasDashboard] = useState(() => {
        if (typeof window === "undefined") return tamanhosPadraoCartasDashboard;

        try {
            const salvo = JSON.parse(window.localStorage.getItem("dashboardSstTamanhosCartas") || "null");
            return salvo && typeof salvo === "object" ? { ...tamanhosPadraoCartasDashboard, ...salvo } : tamanhosPadraoCartasDashboard;
        } catch {
            return tamanhosPadraoCartasDashboard;
        }
    });

    const [tamanhosBlocosDashboard, setTamanhosBlocosDashboard] = useState(() => {
        if (typeof window === "undefined") return tamanhosPadraoBlocosDashboard;

        try {
            const salvo = JSON.parse(window.localStorage.getItem("dashboardSstTamanhosBlocos") || "null");
            return salvo && typeof salvo === "object" ? { ...tamanhosPadraoBlocosDashboard, ...salvo } : tamanhosPadraoBlocosDashboard;
        } catch {
            return tamanhosPadraoBlocosDashboard;
        }
    });

    const [blocosRecolhidosDashboard, setBlocosRecolhidosDashboard] = useState(() => {
        if (typeof window === "undefined") return blocosRecolhidosPadraoDashboard;

        try {
            const salvo = JSON.parse(window.localStorage.getItem("dashboardSstBlocosRecolhidos") || "null");
            return salvo && typeof salvo === "object" ? { ...blocosRecolhidosPadraoDashboard, ...salvo } : blocosRecolhidosPadraoDashboard;
        } catch {
            return blocosRecolhidosPadraoDashboard;
        }
    });

    const [ordemBlocosDashboard, setOrdemBlocosDashboard] = useState(() => {
        if (typeof window === "undefined") return ordemPadraoBlocosDashboard;

        try {
            const salvo = JSON.parse(window.localStorage.getItem("dashboardSstOrdemBlocos") || "null");
            if (!Array.isArray(salvo)) return ordemPadraoBlocosDashboard;

            return [
                ...salvo.filter((chave) => ordemPadraoBlocosDashboard.includes(chave)),
                ...ordemPadraoBlocosDashboard.filter((chave) => !salvo.includes(chave)),
            ];
        } catch {
            return ordemPadraoBlocosDashboard;
        }
    });

    const [ordemCartasDashboard, setOrdemCartasDashboard] = useState(() => {
        if (typeof window === "undefined") return ordemPadraoCartasDashboard;

        try {
            const salvo = JSON.parse(window.localStorage.getItem("dashboardSstOrdemCartas") || "null");
            if (!Array.isArray(salvo)) return ordemPadraoCartasDashboard;

            return [
                ...salvo.filter((chave) => ordemPadraoCartasDashboard.includes(chave)),
                ...ordemPadraoCartasDashboard.filter((chave) => !salvo.includes(chave)),
            ];
        } catch {
            return ordemPadraoCartasDashboard;
        }
    });

    useEffect(() => {
        if (typeof window === "undefined") return;
        window.localStorage.setItem("dashboardSstBlocosVisiveis", JSON.stringify(blocosPainelDashboard));
    }, [blocosPainelDashboard]);

    useEffect(() => {
        if (typeof window === "undefined") return;
        window.localStorage.setItem("dashboardSstCartasVisiveis", JSON.stringify(cartasVisiveisDashboard));
    }, [cartasVisiveisDashboard]);

    useEffect(() => {
        if (typeof window === "undefined") return;
        window.localStorage.setItem("dashboardSstTamanhosCartas", JSON.stringify(tamanhosCartasDashboard));
    }, [tamanhosCartasDashboard]);

    useEffect(() => {
        if (typeof window === "undefined") return;
        window.localStorage.setItem("dashboardSstTamanhosBlocos", JSON.stringify(tamanhosBlocosDashboard));
    }, [tamanhosBlocosDashboard]);

    useEffect(() => {
        if (typeof window === "undefined") return;
        window.localStorage.setItem("dashboardSstBlocosRecolhidos", JSON.stringify(blocosRecolhidosDashboard));
    }, [blocosRecolhidosDashboard]);

    useEffect(() => {
        if (typeof window === "undefined") return;
        window.localStorage.setItem("dashboardSstOrdemBlocos", JSON.stringify(ordemBlocosDashboard));
    }, [ordemBlocosDashboard]);

    useEffect(() => {
        if (typeof window === "undefined") return;
        window.localStorage.setItem("dashboardSstOrdemCartas", JSON.stringify(ordemCartasDashboard));
    }, [ordemCartasDashboard]);

    const alternarBlocoPainel = (chave) => {
        setBlocosPainelDashboard((atual) => ({
            ...atual,
            [chave]: !atual[chave],
        }));
    };

    const alternarCartaPainel = (chave) => {
        setCartasVisiveisDashboard((atual) => ({
            ...atual,
            [chave]: !atual[chave],
        }));
    };

    const alterarTamanhoCartaPainel = (chave, tamanho) => {
        setTamanhosCartasDashboard((atual) => ({
            ...atual,
            [chave]: tamanho,
        }));
    };

    const alterarTamanhoBlocoPainel = (chave, tamanho) => {
        setTamanhosBlocosDashboard((atual) => ({
            ...atual,
            [chave]: tamanho,
        }));
    };

    const moverBlocoPainel = (chave, direcao) => {
        setOrdemBlocosDashboard((atual) => moverItemPainel(atual, chave, direcao));
    };

    const moverCartaPainel = (chave, direcao) => {
        setOrdemCartasDashboard((atual) => moverItemPainel(atual, chave, direcao));
    };

    const alternarBlocoRecolhidoDashboard = (chave) => {
        setBlocosRecolhidosDashboard((atual) => ({
            ...atual,
            [chave]: !atual[chave],
        }));
    };

    const soltarCartaPainel = (destino) => {
        setOrdemCartasDashboard((atual) => reordenarPorArrastePainel(atual, cartaArrastandoDashboard, destino));
        setCartaArrastandoDashboard(null);
    };

    const soltarBlocoPainel = (destino) => {
        setOrdemBlocosDashboard((atual) => reordenarPorArrastePainel(atual, blocoArrastandoDashboard, destino));
        setBlocoArrastandoDashboard(null);
    };

    const carregarUsoStorageDashboard = useCallback(async () => {
        setCarregandoStorageDashboard(true);

        try {
            const resumoStorage = await calcularUsoStorageRealSistema({ supabase });

            setUsoStorageDashboard(resumoStorage);
            const historicoStorage = await carregarHistoricoStorageDashboard({
                supabase,
                resumoStorage,
            });
            setHistoricoStorageDashboard(historicoStorage);

            if (typeof window !== "undefined") {
                window.localStorage.setItem(CACHE_USO_STORAGE_DASHBOARD, JSON.stringify(resumoStorage));
            }
        } catch (error) {
            console.warn("Erro ao carregar uso real do Storage:", error?.message || error);
            setUsoStorageDashboard((atual) => ({ ...atual, totalBytes: 0, arquivos: 0, buckets: [] }));
        } finally {
            setCarregandoStorageDashboard(false);
        }
    }, []);

    useEffect(() => {
        if (storageAutoCarregadoDashboardRef.current) return;

        const origemAtual = String(usoStorageDashboard?.origem || "");
        const origemConfiavel = ["storage.objects", "storage-api", "rpc", "rpc-resumo_storage_sst", "resumo_storage_sst"].includes(origemAtual);
        const temResumoValido = Number(usoStorageDashboard?.totalBytes || 0) > 0 && Number(usoStorageDashboard?.arquivos || 0) > 0;

        if (temResumoValido && origemConfiavel) return;

        storageAutoCarregadoDashboardRef.current = true;

        const timer = window.setTimeout(() => {
            carregarUsoStorageDashboard();
        }, 350);

        return () => window.clearTimeout(timer);
    }, [carregarUsoStorageDashboard, usoStorageDashboard?.arquivos, usoStorageDashboard?.origem, usoStorageDashboard?.totalBytes]);

    const carregarHorasDdsDashboard = useCallback(async () => {
        setHorasDdsMes((atual) => ({ ...atual, carregando: true, erro: "" }));

        try {
            const resumo = await carregarHorasTrabalhadasDdsMes({
                supabase,
                dataReferencia: new Date(),
            });
            setHorasDdsMes({ ...resumo, carregando: false, erro: "" });
        } catch (error) {
            console.warn("Erro ao carregar horas trabalhadas do DDS:", error?.message || error);
            setHorasDdsMes((atual) => ({
                ...atual,
                carregando: false,
                erro: error?.message || "Não foi possível carregar as horas do DDS.",
            }));
        }
    }, []);

    useEffect(() => {
        carregarHorasDdsDashboard();
    }, [carregarHorasDdsDashboard]);

    const atualizandoDashboardSstCompleto = Boolean(
        atualizandoInformacoes
        || atualizandoInformacoesLocais
        || carregandoStorageDashboard
        || horasDdsMes.carregando
    );

    const atualizarInformacoesDashboard = useCallback(async () => {
        if (atualizandoDashboardSstCompleto) return;

        setAtualizandoInformacoesLocais(true);

        try {
            await onAtualizarInformacoes?.();
            await Promise.all([
                carregarUsoStorageDashboard(),
                carregarHorasDdsDashboard(),
            ]);
        } finally {
            setAtualizandoInformacoesLocais(false);
        }
    }, [
        atualizandoDashboardSstCompleto,
        carregarHorasDdsDashboard,
        carregarUsoStorageDashboard,
        onAtualizarInformacoes,
    ]);

    const resumoDashboardSst = useMemo(() => calcularResumoDashboardSst({
        colaboradores,
        empresasBanco,
        documentosEmpresas,
        auditoria,
        auditoriasCampo,
        usoStorageDashboard,
        carregandoStorageDashboard,
        dataReferencia: agoraHeroDashboard,
    }), [
        colaboradores,
        empresasBanco,
        documentosEmpresas,
        auditoria,
        auditoriasCampo,
        usoStorageDashboard,
        carregandoStorageDashboard,
        agoraHeroDashboard,
    ]);

    const {
        indicadores,
        totalItens,
        documentosVencidos,
        documentosAVencer,
        documentosFuncionariosVencidos,
        documentosFuncionariosAVencer30Dias,
        empresasAtivas,
        colaboradoresMobilizados,
        colaboradoresBloqueados,
        colaboradoresEmAnalise,
        colaboradoresLiberados,
        colaboradoresComPendencia,
        desviosAbertos,
        auditoriasCampoNormalizadas,
        auditoriasCampoMes,
        mediaConformidadeCampo,
        desviosCampoAbertos,
        desviosCampoCorrigidos,
        topDesviosCampo,
        aniversariantesMes,
        proximoAniversarioDashboard,
        pendencias,
        colaboradoresPorFuncao,
        maiorQuantidadePorFuncao,
        rankingPendenciasEmpresa,
        documentosPorTipo,
        ultimosDocumentosEnviados,
        alertasImportantes,
        storagePercentual,
        totalStorageLabel,
        storageLimiteLabelDashboard,
    } = resumoDashboardSst;

    const storageStatusDashboard = {
        ...resumoDashboardSst.storageStatusDashboard,
        statusIcon: resumoDashboardSst.storageStatusDashboard?.statusIconKey === "normal" ? CheckCircle2 : AlertTriangle,
    };
    const storageLimiteBytesDashboard = Math.max(1, LIMITE_STORAGE_MB * 1024 * 1024);
    const storageDisponivelBytesDashboard = Math.max(
        0,
        storageLimiteBytesDashboard - Number(usoStorageDashboard?.totalBytes || 0)
    );
    const storageDisponivelLabelDashboard = formatarBytes(storageDisponivelBytesDashboard).replace(".00", "");

    const cards = [
        { chave: "colaboradoresMobilizados", label: "Colaboradores mobilizados", valor: colaboradoresMobilizados.length, icon: HardHat, detalhe: "Liberados ou com pendência não bloqueante" },
        { chave: "colaboradoresLiberados", label: "Colaboradores liberados", valor: colaboradoresLiberados, icon: BadgeCheck, detalhe: "Documentos em dia" },
        { chave: "comPendencia", label: "Com pendência", valor: colaboradoresComPendencia, icon: AlertTriangle, detalhe: "Sem bloqueio" },
        { chave: "emAnalise", label: "Em análise", valor: colaboradoresEmAnalise, icon: Eye, detalhe: "Aguardando conferência" },
        { chave: "empresasAtivas", label: "Empresas ativas", valor: empresasAtivas.length, icon: Building2, detalhe: "Contratadas liberadas" },
        { chave: "documentosVencidos", label: "Documentos de empresas vencidos", valor: documentosVencidos.length, icon: XCircle, detalhe: "Documentos e contratos" },
        { chave: "documentosAVencer", label: "Documentos de empresas a vencer", valor: documentosAVencer.length, icon: CalendarClock, detalhe: "Próximos 30 dias" },
        { chave: "treinamentosVencidos", label: "Documentos de funcionários vencidos", valor: documentosFuncionariosVencidos.length, icon: XCircle, detalhe: "Certificados e documentos" },
        { chave: "documentosFuncionariosAVencer", label: "Documentos de funcionários a vencer", valor: documentosFuncionariosAVencer30Dias.length, icon: CalendarClock, detalhe: "Próximos 30 dias" },
        {
            chave: "horasTrabalhadasMes",
            label: "Total de horas trabalhadas no mês",
            valor: horasDdsMes.carregando ? "—" : `${horasDdsMes.totalHorasFormatado} h`,
            icon: Timer,
            detalhe: horasDdsMes.erro
                ? "Falha ao consultar o DDS"
                : `${horasDdsMes.totalDias} dia(s) validado(s) no DDS`,
        },
        { chave: "colaboradoresBloqueados", label: "Colaboradores bloqueados", valor: colaboradoresBloqueados, icon: Lock, detalhe: "Pendência bloqueante" },
        { chave: "desviosAbertos", label: "Desvios abertos", valor: desviosAbertos, icon: AlertTriangle, detalhe: "Registros não concluídos" },
        { chave: "aniversariantesMes", label: "Aniversariantes do mês", valor: aniversariantesMes.length, icon: UserRound, detalhe: aniversariantesMes.length > 0 ? `${aniversariantesMes.length} no mês atual` : "Nenhum no mês atual" },
        { chave: "armazenamentoUtilizado", label: "Armazenamento", valor: `${storagePercentual}%`, icon: Upload, detalhe: `${totalStorageLabel} / ${storageLimiteLabelDashboard}` },
    ];

    const cardsOrdenados = [
        ...ordemCartasDashboard
            .map((chave) => cards.find((item) => item.chave === chave))
            .filter(Boolean),
        ...cards.filter((item) => !ordemCartasDashboard.includes(item.chave)),
    ];

    const cardsVisiveis = cardsOrdenados.filter((item) => cartasVisiveisDashboard[item.chave] !== false);

    const obterRegistroEmpresaDocumentoDashboard = (documento = {}) => {
        return empresasBanco.find(
            (item) => String(item.id) === String(documento.empresa_id || documento.empresaId || "")
        ) || null;
    };

    const obterEmpresaDocumentoDashboard = (documento = {}) => {
        const empresa = obterRegistroEmpresaDocumentoDashboard(documento);
        return empresa?.nome || "Empresa não informada";
    };

    const obterEmpresaCompletaColaboradorDashboard = (colaborador = {}) => {
        const empresaExibicao = String(
            colaborador.empresaExibicao || colaborador.empresa_exibicao || ""
        ).trim();
        const empresaDireta = String(
            colaborador.empresa || colaborador.empresaNome || ""
        ).trim();
        const empresaPai = String(
            colaborador.empresaPaiNome || colaborador.empresa_pai_nome || ""
        ).trim();

        if (/subcontratada\s*:/i.test(empresaExibicao)) {
            return empresaExibicao;
        }

        if (empresaPai && empresaDireta && empresaPai !== empresaDireta) {
            return `${empresaPai} / Subcontratada: ${empresaDireta}`;
        }

        return empresaExibicao || empresaDireta || empresaPai || "Empresa não informada";
    };

    const documentosAVencer30Dias = [
        ...documentosAVencer.map((documento) => {
            const empresa = obterRegistroEmpresaDocumentoDashboard(documento);
            const diasCalculados =
                documento.status?.dias ??
                diasParaVencer(documento.data_vencimento || documento.dataVencimento);

            return {
                id: `empresa-${documento.id || documento.tipo_documento || documento.tipoDocumento || "documento"}`,
                origem: "empresa",
                documento,
                empresa,
                colaborador: null,
                principal: empresa?.nome || "Empresa não informada",
                apoio: "Documento empresarial",
                nomeDocumento:
                    documento.tipo_documento ||
                    documento.tipoDocumento ||
                    "Documento empresarial",
                vencimento:
                    documento.data_vencimento ||
                    documento.dataVencimento ||
                    "",
                dias: diasCalculados,
                status: documento.status || {
                    chave: "vencendo",
                    texto: "A vencer",
                },
            };
        }),
        ...documentosFuncionariosAVencer30Dias.map((item) => ({
            id: `colaborador-${item.realizado?.id || item.colaborador?.id || "colaborador"}-${item.treinamento?.id || "documento"}`,
            origem: "colaborador",
            documento: item.realizado || null,
            empresa: null,
            colaborador: item.colaborador || null,
            item,
            principal: item.colaborador?.nome || "Colaborador não informado",
            apoio:
                obterEmpresaCompletaColaboradorDashboard(item.colaborador),
            nomeDocumento:
                item.treinamento?.nome ||
                "Documento não informado",
            vencimento: item.vencimento || "",
            dias: diasParaVencer(item.vencimento),
            status: item.status || {
                chave: "vencendo",
                texto: "A vencer",
            },
        })),
    ]
        .filter(
            (registro) =>
                registro.dias !== null &&
                registro.dias >= 0 &&
                registro.dias <= 30
        )
        .sort(
            (a, b) =>
                a.dias - b.dias ||
                String(a.principal || "").localeCompare(
                    String(b.principal || ""),
                    "pt-BR"
                ) ||
                String(a.nomeDocumento || "").localeCompare(
                    String(b.nomeDocumento || ""),
                    "pt-BR"
                )
        );

    const montarResumoDocumentoEmpresa = (chave, titulo, subtitulo, documentos = []) => ({
        chave,
        titulo,
        subtitulo,
        itens: documentos.map((documento) => ({
            id: documento.id,
            principal: obterEmpresaDocumentoDashboard(documento),
            titulo: documento.tipo_documento || "Documento empresarial",
            apoio: documento.arquivo_nome || documento.nome_do_arquivo || "",
            dataRotulo: "Vencimento",
            dataValor: formatDate(documento.data_vencimento),
            status: documento.status?.texto || "Documento",
            detalhe: documento.status?.detalhe || "",
        })),
    });

    const montarResumoDocumentoFuncionario = (chave, titulo, subtitulo, documentos = []) => ({
        chave,
        titulo,
        subtitulo,
        itens: documentos.map((item) => {
            const dias = diasParaVencer(item.vencimento);

            return {
                id: item.realizado?.id || `${item.colaborador?.id || "colaborador"}-${item.treinamento?.id || "documento"}`,
                principal: item.colaborador?.nome || "Colaborador não informado",
                titulo: item.treinamento?.nome || "Documento não informado",
                apoio: obterEmpresaCompletaColaboradorDashboard(item.colaborador),
                dataRotulo: "Vencimento",
                dataValor: formatDate(item.vencimento),
                status: item.status?.texto || "Documento",
                detalhe:
                    dias === null
                        ? ""
                        : dias < 0
                            ? `Vencido há ${Math.abs(dias)} dia(s)`
                            : `Faltam ${dias} dia(s)`,
            };
        }),
    });

    const montarResumoColaboradores = (chave, titulo, subtitulo, lista = [], status = "") => ({
        chave,
        titulo,
        subtitulo,
        itens: lista.map((colaborador) => {
            const classificacao = statusGeral(colaborador || {}).texto;

            return {
                id: colaborador.id,
                principal: colaborador.nome || "Colaborador não informado",
                titulo: colaborador.funcao || colaborador.cargo || "Função não informada",
                apoio: obterEmpresaCompletaColaboradorDashboard(colaborador),
                status: classificacao || status,
                alerta: statusGeral(colaborador || {}).avaliacao?.vencendo?.length > 0
                    ? "A vencer"
                    : "",
                detalhe: `Situação geral: ${classificacao}`,
            };
        }),
    });

    const abrirResumoCartaDashboard = (chave) => {
        const colaboradoresLiberadosLista = colaboradores.filter(
            (colaborador) => statusGeral(colaborador).texto === "Liberado"
        );
        const colaboradoresComPendenciaLista = colaboradores.filter(
            (colaborador) => statusGeral(colaborador).texto === "Com pendência"
        );
        const colaboradoresEmAnaliseLista = colaboradores.filter(
            (colaborador) => statusGeral(colaborador).texto === "Em análise"
        );
        const colaboradoresBloqueadosLista = colaboradores.filter(
            (colaborador) => statusGeral(colaborador).texto === "Bloqueado"
        );
        const composicaoMobilizados = colaboradoresMobilizados.reduce(
            (acumulador, colaborador) => {
                const classificacao = statusGeral(colaborador).texto;
                acumulador[classificacao] = (acumulador[classificacao] || 0) + 1;
                return acumulador;
            },
            {}
        );
        const colaboradoresComAlertaAVencer = colaboradoresMobilizados.filter(
            (colaborador) => statusGeral(colaborador).avaliacao?.vencendo?.length > 0
        ).length;
        const detalheComposicaoMobilizados = [
            `${composicaoMobilizados.Liberado || 0} liberado(s)`,
            `${composicaoMobilizados["Com pendência"] || 0} com pendência`,
            `${colaboradoresComAlertaAVencer} com alerta preventivo de vencimento`,
        ].join(" · ");
        const desviosAbertosLista = auditoria.filter((item) => {
            const texto = normalizarTextoBusca(
                `${item.acao || ""} ${item.tabela || ""} ${item.descricao || ""}`
            );

            return texto.includes("desvio") &&
                !texto.includes("fechado") &&
                !texto.includes("concluido") &&
                !texto.includes("concluído");
        });
        const resumos = {
            colaboradoresMobilizados: montarResumoColaboradores(
                "colaboradoresMobilizados",
                "Colaboradores mobilizados",
                `Colaboradores ativos no controle operacional: ${detalheComposicaoMobilizados}.`,
                colaboradoresMobilizados,
                "Mobilizado"
            ),
            colaboradoresLiberados: montarResumoColaboradores(
                "colaboradoresLiberados",
                "Colaboradores liberados",
                "Colaboradores com documentação e situação geral liberadas.",
                colaboradoresLiberadosLista,
                "Liberado"
            ),
            comPendencia: montarResumoColaboradores(
                "comPendencia",
                "Colaboradores com pendência",
                "Pendências documentais que ainda não resultaram em bloqueio.",
                colaboradoresComPendenciaLista,
                "Com pendência"
            ),
            emAnalise: montarResumoColaboradores(
                "emAnalise",
                "Colaboradores em análise",
                "Cadastros ou documentos aguardando conferência.",
                colaboradoresEmAnaliseLista,
                "Em análise"
            ),
            empresasAtivas: {
                chave: "empresasAtivas",
                titulo: "Empresas ativas",
                subtitulo: "Empresas classificadas como ativas no cadastro.",
                itens: empresasAtivas.map((empresa) => ({
                    id: empresa.id,
                    principal: empresa.nome || "Empresa não informada",
                    titulo: empresa.cnpj || empresa.cpf || "Documento não informado",
                    apoio: empresa.tst_responsavel || empresa.tstResponsavel
                        ? `Responsável SST: ${empresa.tst_responsavel || empresa.tstResponsavel}`
                        : "Responsável SST não informado",
                    status: "Ativa",
                    detalhe: normalizarStatusEmpresa(empresa.status),
                })),
            },
            documentosVencidos: montarResumoDocumentoEmpresa(
                "documentosVencidos",
                "Documentos de empresas vencidos",
                "Documentos e contratos empresariais fora da validade.",
                documentosVencidos
            ),
            documentosAVencer: montarResumoDocumentoEmpresa(
                "documentosAVencer",
                "Documentos de empresas a vencer",
                "Documentos e contratos com vencimento nos próximos 30 dias.",
                documentosAVencer
            ),
            treinamentosVencidos: montarResumoDocumentoFuncionario(
                "treinamentosVencidos",
                "Documentos de funcionários vencidos",
                "Certificados e documentos de colaboradores fora da validade.",
                documentosFuncionariosVencidos
            ),
            documentosFuncionariosAVencer: montarResumoDocumentoFuncionario(
                "documentosFuncionariosAVencer",
                "Documentos de funcionários a vencer",
                "Certificados e documentos com vencimento nos próximos 30 dias.",
                documentosFuncionariosAVencer30Dias
            ),
            horasTrabalhadasMes: {
                chave: "horasTrabalhadasMes",
                titulo: "Horas trabalhadas no mês",
                subtitulo: "Homem-hora calculado pelas jornadas válidas e presenças das conferências DDS concluídas no mês.",
                permiteOrdenacao: false,
                itens: horasDdsMes.erro ? [{
                    id: "erro-horas-dds",
                    principal: "Não foi possível consultar o DDS",
                    titulo: horasDdsMes.erro,
                    status: "Atenção",
                    detalhe: "Atualize o Dashboard para tentar novamente.",
                }] : horasDdsMes.itens,
            },
            colaboradoresBloqueados: montarResumoColaboradores(
                "colaboradoresBloqueados",
                "Colaboradores bloqueados",
                "Colaboradores com situação geral bloqueada por regra operacional ou documental.",
                colaboradoresBloqueadosLista,
                "Bloqueado"
            ),
            desviosAbertos: {
                chave: "desviosAbertos",
                titulo: "Desvios abertos",
                subtitulo: "Registros de desvio ainda sem fechamento ou conclusão.",
                itens: desviosAbertosLista.map((item, indice) => ({
                    id: item.id || `desvio-${indice}`,
                    principal: item.acao || "Desvio registrado",
                    titulo: item.descricao || item.tabela || "Descrição não informada",
                    apoio: item.usuario_nome || item.usuario || "Responsável não informado",
                    dataRotulo: "Registro",
                    dataValor: item.created_at ? formatDate(item.created_at) : "",
                    status: "Aberto",
                    detalhe: item.tabela || "",
                })),
            },
            aniversariantesMes: {
                chave: "aniversariantesMes",
                titulo: "Aniversariantes do mês",
                subtitulo: "Colaboradores ativos com exibição de aniversário habilitada.",
                itens: aniversariantesMes.map((colaborador) => ({
                    id: colaborador.id,
                    principal: colaborador.nome || "Colaborador não informado",
                    titulo: colaborador.funcao || colaborador.cargo || "Função não informada",
                    apoio: obterEmpresaCompletaColaboradorDashboard(colaborador),
                    dataRotulo: "Nascimento",
                    dataValor: formatDate(
                        colaborador.dataNascimentoOriginal ||
                        colaborador.dataNascimento ||
                        colaborador.data_nascimento
                    ),
                    status: "Aniversariante",
                    detalhe: "",
                })),
            },
            armazenamentoUtilizado: {
                chave: "armazenamentoUtilizado",
                titulo: "Armazenamento do sistema",
                subtitulo: "Visão geral da capacidade, disponibilidade e arquivos armazenados.",
                permiteOrdenacao: false,
                totalStorageLabel,
                limiteStorageLabel: storageLimiteLabelDashboard,
                percentualStorage: storagePercentual,
                statusStorage: storageStatusDashboard.texto,
                historico: historicoStorageDashboard,
                metricas: [
                    { id: "storage-usado", valor: `${storagePercentual}%`, rotulo: "usado" },
                    { id: "storage-livre", valor: `${Math.max(0, 100 - storagePercentual)}%`, rotulo: "livre" },
                    { id: "storage-arquivos", valor: new Intl.NumberFormat("pt-BR").format(Number(usoStorageDashboard?.arquivos || 0)), rotulo: "arquivos" },
                    { id: "storage-areas", valor: Array.isArray(usoStorageDashboard?.buckets) ? usoStorageDashboard.buckets.length : 0, rotulo: "áreas" },
                ],
                itens: [
                    {
                        id: "storage-capacidade",
                        principal: storageLimiteLabelDashboard,
                        titulo: "Capacidade total",
                        status: storageStatusDashboard.texto,
                        detalhe: "Limite configurado no sistema",
                    },
                    {
                        id: "storage-utilizado",
                        principal: totalStorageLabel,
                        titulo: "Espaço usado",
                        detalhe: `${storagePercentual}% da capacidade`,
                    },
                    {
                        id: "storage-disponivel",
                        principal: storageDisponivelLabelDashboard,
                        titulo: "Espaço livre",
                        detalhe: `${Math.max(0, 100 - storagePercentual)}% livre`,
                    },
                    {
                        id: "storage-arquivos",
                        principal: new Intl.NumberFormat("pt-BR").format(Number(usoStorageDashboard?.arquivos || 0)),
                        titulo: "Arquivos",
                        detalhe: `${Array.isArray(usoStorageDashboard?.buckets) ? usoStorageDashboard.buckets.length : 0} áreas de armazenamento`,
                    },
                ],
            },
        };

        const resumo = resumos[chave];

        if (resumo) {
            setResumoCartaDashboard(resumo);
        }
    };

    const obterAcentoCartaDashboard = (chave) => {
        const mapa = {
            colaboradoresMobilizados: {
                borda: "border-blue-200/80",
                faixa: "from-blue-500 to-cyan-400",
                fundoIcone: "bg-blue-50 text-blue-700 ring-blue-100",
            },
            colaboradoresLiberados: {
                borda: "border-emerald-200/80",
                faixa: "from-emerald-500 to-teal-400",
                fundoIcone: "bg-emerald-50 text-emerald-700 ring-emerald-100",
            },
            comPendencia: {
                borda: "border-orange-200/80",
                faixa: "from-orange-500 to-amber-400",
                fundoIcone: "bg-orange-50 text-orange-700 ring-orange-100",
            },
            emAnalise: {
                borda: "border-violet-200/80",
                faixa: "from-violet-500 to-fuchsia-400",
                fundoIcone: "bg-violet-50 text-violet-700 ring-violet-100",
            },
            empresasAtivas: {
                borda: "border-cyan-200/80",
                faixa: "from-cyan-500 to-sky-400",
                fundoIcone: "bg-cyan-50 text-cyan-700 ring-cyan-100",
            },
            documentosVencidos: {
                borda: "border-red-200/80",
                faixa: "from-red-500 to-rose-400",
                fundoIcone: "bg-red-50 text-red-700 ring-red-100",
            },
            documentosAVencer: {
                borda: "border-amber-200/80",
                faixa: "from-amber-500 to-orange-400",
                fundoIcone: "bg-amber-50 text-amber-700 ring-amber-100",
            },
            treinamentosVencidos: {
                borda: "border-purple-200/80",
                faixa: "from-purple-500 to-violet-400",
                fundoIcone: "bg-purple-50 text-purple-700 ring-purple-100",
            },
            documentosFuncionariosAVencer: {
                borda: "border-orange-200/80",
                faixa: "from-orange-500 to-amber-400",
                fundoIcone: "bg-orange-50 text-orange-700 ring-orange-100",
            },
            horasTrabalhadasMes: {
                borda: "border-indigo-200/80",
                faixa: "from-indigo-500 to-blue-400",
                fundoIcone: "bg-indigo-50 text-indigo-700 ring-indigo-100",
            },
            colaboradoresBloqueados: {
                borda: "border-teal-200/80",
                faixa: "from-teal-500 to-emerald-400",
                fundoIcone: "bg-teal-50 text-teal-700 ring-teal-100",
            },
            desviosAbertos: {
                borda: "border-red-200/80",
                faixa: "from-red-500 to-orange-400",
                fundoIcone: "bg-red-50 text-red-700 ring-red-100",
            },
            aniversariantesMes: {
                borda: "border-sky-200/80",
                faixa: "from-sky-500 to-blue-400",
                fundoIcone: "bg-sky-50 text-sky-700 ring-sky-100",
            },
            armazenamentoUtilizado: {
                borda: "border-slate-200",
                faixa: "from-slate-500 to-slate-300",
                fundoIcone: "bg-slate-100 text-slate-700 ring-slate-200",
            },
        };

        return mapa[chave] || {
            borda: "border-slate-200/80",
            faixa: "from-slate-500 to-slate-300",
            fundoIcone: "bg-slate-100 text-slate-700 ring-slate-200",
        };
    };

    const obterTituloCompactoCartaDashboard = (item) => {
        const mapa = {
            colaboradoresMobilizados: "Mobilizados",
            colaboradoresLiberados: "Liberados",
            comPendencia: "Com pendência",
            emAnalise: "Em análise",
            empresasAtivas: "Empresas ativas",
            documentosVencidos: "Docs emp. vencidos",
            documentosAVencer: "Docs emp. a vencer",
            treinamentosVencidos: "Docs func. vencidos",
            documentosFuncionariosAVencer: "Docs func. a vencer",
            horasTrabalhadasMes: "Horas trab. mês",
            colaboradoresBloqueados: "Bloqueados",
            desviosAbertos: "Desvios abertos",
            aniversariantesMes: "Aniversariantes",
            armazenamentoUtilizado: "Armazenamento",
        };

        return mapa[item.chave] || item.label;
    };

    const obterDetalheCompactoCartaDashboard = (item) => {
        const mapa = {
            colaboradoresMobilizados: "Liberados ou com pendência não bloqueante",
            colaboradoresLiberados: "Em dia",
            comPendencia: "Sem bloqueio",
            emAnalise: "Aguardando conferência",
            empresasAtivas: "Liberadas",
            documentosVencidos: "Documentos e contratos",
            documentosAVencer: "Próximos 30 dias",
            treinamentosVencidos: "Certificados",
            documentosFuncionariosAVencer: "Próximos 30 dias",
            horasTrabalhadasMes: item.detalhe,
            colaboradoresBloqueados: "Pendência bloqueante",
            desviosAbertos: "Registros não concluídos",
            aniversariantesMes: item.detalhe,
            armazenamentoUtilizado: `${totalStorageLabel} / ${storageLimiteLabelDashboard}`,
        };

        return mapa[item.chave] || item.detalhe;
    };

    const montarPayloadEmailPendencia = (item) => {
        const statusEmail =
            item.status.chave === "pendente"
                ? "FALTANTE"
                : item.status.chave === "vencendo"
                    ? "A VENCER"
                    : "VENCIDO";

        const dias = item.vencimento ? diasParaVencer(item.vencimento) : null;
        const empresa = obterEmpresaCompletaColaboradorDashboard(item.colaborador);
        const para = emailTstDaEmpresa(item.colaborador);

        return {
            para,
            tipoModelo: TIPOS_MODELO_EMAIL_SST.DOCUMENTO_COLABORADOR,
            assunto: `Aviso SST - ${statusEmail} - ${item.colaborador?.nome || "Colaborador"}`,
            sistema: "SafeScan Brasil",
            remetenteNome: "SafeScan Brasil - Controle de SST",
            urlSistema: "https://www.safescanbrasil.com.br",
            empresa,
            tstResponsavel: item.colaborador?.empresaTstResponsavel || "",
            itens: [
                {
                    colaborador: item.colaborador?.nome || "Colaborador não informado",
                    codigo: item.colaborador?.codigoFuncionario || "-",
                    funcao: item.colaborador?.funcao || "-",
                    situacaoObra: item.colaborador?.statusMobilizacao || obterStatusInicialColaborador(),
                    statusColaborador: statusGeral(item.colaborador || {}).texto,
                    treinamento: item.treinamento?.nome || "Documento não informado",
                    realizacao: item.realizado?.realizado ? formatDate(item.realizado.realizado) : "Não informada",
                    vencimento: item.realizado?.vencimento ? formatDate(item.realizado.vencimento) : "Não informada",
                    dias: dias ?? 0,
                    arquivo: item.realizado?.arquivo || "Não informado",
                },
            ],
        };
    };

    const enviarAlertaEmailPendencia = async (item, mostrarMensagem = true) => {
        if (!item) return false;

        if (mostrarMensagem) {
            setEnviandoEmail(true);
        }

        const tipoAlertaAuditoria =
            item.status?.chave === "vencendo"
                ? "Documento a vencer em 30 dias"
                : "Pendência crítica";

        try {
            const payload = montarPayloadEmailPendencia(item);

            if (!payload.para) {
                if (mostrarMensagem) {
                    alert(`Cadastre o e-mail do TST responsável da empresa ${payload.empresa} antes de enviar.`);
                }

                return false;
            }

            const { data, error } = await supabase.functions.invoke(FUNCAO_EMAIL_ALERTA_TST, {
                body: payload,
            });

            if (error || data?.ok === false) {
                console.error("Erro ao enviar alerta por e-mail:", error || data);
                await onRegistrarEmailEnviado?.({
                    empresaId: item.colaborador?.empresaId || null,
                    colaboradorId: item.colaborador?.id || null,
                    documentoId: item.realizado?.id || null,
                    destinatario: payload.para,
                    assunto: payload.assunto,
                    tipoAlerta: tipoAlertaAuditoria,
                    documento: item.treinamento?.nome || "Documento não informado",
                    statusEnvio: "Erro",
                    erro: error?.message || data?.erro || "Falha na função de e-mail.",
                });

                if (mostrarMensagem) {
                    alert(`Erro ao enviar alerta por e-mail: ${error?.message || data?.erro || "Falha na função de e-mail."}`);
                }

                return false;
            }

            console.log("Alerta enviado por e-mail:", data);
            await onRegistrarEmailEnviado?.({
                empresaId: item.colaborador?.empresaId || null,
                colaboradorId: item.colaborador?.id || null,
                documentoId: item.realizado?.id || null,
                destinatario: payload.para,
                assunto: payload.assunto,
                tipoAlerta: tipoAlertaAuditoria,
                documento: item.treinamento?.nome || "Documento não informado",
                statusEnvio: "Sucesso",
                erro: "",
            });

            if (mostrarMensagem) {
                alert(`Alerta enviado para ${payload.para}.`);
            }

            return true;
        } catch (erro) {
            console.error("Falha inesperada ao enviar e-mail:", erro);
            const payloadErro = montarPayloadEmailPendencia(item);
            await onRegistrarEmailEnviado?.({
                empresaId: item.colaborador?.empresaId || null,
                colaboradorId: item.colaborador?.id || null,
                documentoId: item.realizado?.id || null,
                destinatario: payloadErro.para,
                assunto: payloadErro.assunto,
                tipoAlerta: tipoAlertaAuditoria,
                documento: item.treinamento?.nome || "Documento não informado",
                statusEnvio: "Erro",
                erro: erro?.message || String(erro),
            });

            if (mostrarMensagem) {
                alert("Falha inesperada ao enviar e-mail.");
            }

            return false;
        } finally {
            if (mostrarMensagem) {
                setEnviandoEmail(false);
            }
        }
    };

    const montarPayloadEmailDocumentoEmpresa = (documento = {}) => {
        const empresa =
            obterRegistroEmpresaDocumentoDashboard(documento);

        const empresaPai =
            empresasBanco.find(
                (item) =>
                    String(item.id) ===
                    String(
                        empresa?.empresa_pai_id ||
                        empresa?.empresaPaiId ||
                        ""
                    )
            ) || null;

        const empresaContato =
            emailTstDoCadastroEmpresa(empresa)
                ? empresa
                : empresaPai || empresa;

        const para =
            emailTstDoCadastroEmpresa(empresaContato);

        const dias =
            documento.status?.dias ??
            diasParaVencer(
                documento.data_vencimento ||
                documento.dataVencimento
            );

        const nomeEmpresa =
            empresa?.nome ||
            "Empresa não informada";

        const nomeDocumento =
            documento.tipo_documento ||
            documento.tipoDocumento ||
            "Documento empresarial";

        return {
            para,
            tipoModelo: TIPOS_MODELO_EMAIL_SST.DOCUMENTO_EMPRESA,
            assunto:
                `Aviso SST - A VENCER - ${nomeEmpresa} - ${nomeDocumento}`,
            sistema: "SafeScan Brasil",
            remetenteNome: "SafeScan Brasil - Controle de SST",
            urlSistema: "https://www.safescanbrasil.com.br",
            empresa: nomeEmpresa,
            tstResponsavel:
                empresaContato?.tst_responsavel ||
                empresaContato?.tstResponsavel ||
                "",
            tstEmail: para,
            itens: [
                {
                    colaborador: "Documento empresarial",
                    codigo: "-",
                    funcao: "-",
                    situacaoObra:
                        normalizarStatusEmpresa(
                            empresa?.status
                        ),
                    statusColaborador: "Documento empresarial",
                    treinamento: nomeDocumento,
                    realizacao:
                        documento.data_emissao ||
                        documento.dataEmissao
                            ? formatDate(
                                documento.data_emissao ||
                                documento.dataEmissao
                            )
                            : "Não informada",
                    vencimento:
                        documento.data_vencimento ||
                        documento.dataVencimento
                            ? formatDate(
                                documento.data_vencimento ||
                                documento.dataVencimento
                            )
                            : "Não informada",
                    dias: dias ?? 0,
                    arquivo:
                        documento.arquivo_nome ||
                        documento.nome_do_arquivo ||
                        documento.arquivoNome ||
                        "Não informado",
                },
            ],
        };
    };

    const enviarAlertaEmailDocumentoEmpresa = async (
        documento,
        mostrarMensagem = true
    ) => {
        if (!documento) return false;

        if (mostrarMensagem) {
            setEnviandoEmail(true);
        }

        const payload =
            montarPayloadEmailDocumentoEmpresa(documento);

        const empresa =
            obterRegistroEmpresaDocumentoDashboard(documento);

        try {
            if (!payload.para) {
                if (mostrarMensagem) {
                    alert(
                        `Cadastre o e-mail do TST responsável da empresa ${payload.empresa} antes de enviar.`
                    );
                }

                return false;
            }

            const { data, error } =
                await supabase.functions.invoke(
                    FUNCAO_EMAIL_ALERTA_TST,
                    {
                        body: payload,
                    }
                );

            if (error || data?.ok === false) {
                console.error(
                    "Erro ao enviar alerta de documento empresarial:",
                    error || data
                );

                await onRegistrarEmailEnviado?.({
                    empresaId:
                        documento.empresa_id ||
                        documento.empresaId ||
                        empresa?.id ||
                        null,
                    colaboradorId: null,
                    documentoId: documento.id || null,
                    destinatario: payload.para,
                    assunto: payload.assunto,
                    tipoAlerta: "Documento empresarial a vencer em 30 dias",
                    documento:
                        documento.tipo_documento ||
                        documento.tipoDocumento ||
                        "Documento empresarial",
                    statusEnvio: "Erro",
                    erro:
                        error?.message ||
                        data?.erro ||
                        "Falha na função de e-mail.",
                });

                if (mostrarMensagem) {
                    alert(
                        `Erro ao enviar alerta por e-mail: ${error?.message || data?.erro || "Falha na função de e-mail."}`
                    );
                }

                return false;
            }

            await onRegistrarEmailEnviado?.({
                empresaId:
                    documento.empresa_id ||
                    documento.empresaId ||
                    empresa?.id ||
                    null,
                colaboradorId: null,
                documentoId: documento.id || null,
                destinatario: payload.para,
                assunto: payload.assunto,
                tipoAlerta: "Documento empresarial a vencer em 30 dias",
                documento:
                    documento.tipo_documento ||
                    documento.tipoDocumento ||
                    "Documento empresarial",
                statusEnvio: "Sucesso",
                erro: "",
            });

            if (mostrarMensagem) {
                alert(
                    `Alerta enviado para ${payload.para}.`
                );
            }

            return true;
        } catch (erro) {
            console.error(
                "Falha inesperada ao enviar documento empresarial:",
                erro
            );

            await onRegistrarEmailEnviado?.({
                empresaId:
                    documento.empresa_id ||
                    documento.empresaId ||
                    empresa?.id ||
                    null,
                colaboradorId: null,
                documentoId: documento.id || null,
                destinatario: payload.para,
                assunto: payload.assunto,
                tipoAlerta: "Documento empresarial a vencer em 30 dias",
                documento:
                    documento.tipo_documento ||
                    documento.tipoDocumento ||
                    "Documento empresarial",
                statusEnvio: "Erro",
                erro: erro?.message || String(erro),
            });

            if (mostrarMensagem) {
                alert(
                    `Falha inesperada ao enviar e-mail: ${erro?.message || String(erro)}`
                );
            }

            return false;
        } finally {
            if (mostrarMensagem) {
                setEnviandoEmail(false);
            }
        }
    };

    const agruparDocumentosParaEnvioEmLote = (registros = []) => {
        const grupos = new Map();

        registros.forEach((registroOriginal) => {
            const registro = registroOriginal?.origem
                ? registroOriginal
                : { origem: "colaborador", item: registroOriginal };

            const ehDocumentoEmpresa = registro.origem === "empresa";
            const payloadItem = ehDocumentoEmpresa
                ? montarPayloadEmailDocumentoEmpresa(registro.documento)
                : montarPayloadEmailPendencia(registro.item);

            const empresaRegistro = ehDocumentoEmpresa
                ? obterRegistroEmpresaDocumentoDashboard(registro.documento)
                : null;

            const colaborador = registro.item?.colaborador || null;
            const identificadorResponsavel = ehDocumentoEmpresa
                ? empresaRegistro?.id || payloadItem.empresa
                : colaborador?.id || colaborador?.codigoFuncionario || colaborador?.nome;

            const chaveGrupo = [
                ehDocumentoEmpresa ? "empresa" : "colaborador",
                identificadorResponsavel || "sem-identificador",
                payloadItem.para || "sem-email",
            ].join(":");

            if (!grupos.has(chaveGrupo)) {
                grupos.set(chaveGrupo, {
                    chave: chaveGrupo,
                    origem: ehDocumentoEmpresa ? "empresa" : "colaborador",
                    empresa: payloadItem.empresa,
                    para: payloadItem.para,
                    tstResponsavel: payloadItem.tstResponsavel,
                    nomeResponsavel: ehDocumentoEmpresa
                        ? payloadItem.empresa
                        : colaborador?.nome || "Colaborador",
                    registros: [],
                    itens: [],
                });
            }

            const grupo = grupos.get(chaveGrupo);
            grupo.registros.push(registro);
            grupo.itens.push(...payloadItem.itens);
        });

        return Array.from(grupos.values());
    };

    const registrarResultadoGrupoEmail = async (
        grupo,
        payload,
        statusEnvio,
        erro = ""
    ) => {
        for (const registro of grupo.registros) {
            const ehDocumentoEmpresa = registro.origem === "empresa";
            const documento = ehDocumentoEmpresa
                ? registro.documento
                : registro.item?.realizado;
            const colaborador = ehDocumentoEmpresa
                ? null
                : registro.item?.colaborador;
            const empresa = ehDocumentoEmpresa
                ? obterRegistroEmpresaDocumentoDashboard(documento)
                : null;
            const nomeDocumento = ehDocumentoEmpresa
                ? documento?.tipo_documento || documento?.tipoDocumento || "Documento empresarial"
                : registro.item?.treinamento?.nome || "Documento não informado";

            await onRegistrarEmailEnviado?.({
                empresaId: ehDocumentoEmpresa
                    ? documento?.empresa_id || documento?.empresaId || empresa?.id || null
                    : colaborador?.empresaId || null,
                colaboradorId: colaborador?.id || null,
                documentoId: documento?.id || null,
                destinatario: payload.para,
                assunto: payload.assunto,
                tipoAlerta: "Resumo de documentos vencidos e a vencer",
                documento: nomeDocumento,
                statusEnvio,
                erro,
            });
        }
    };

    const enviarGrupoDocumentosEmLote = async (grupo) => {
        const quantidade = grupo.itens.length;
        const payload = {
            para: grupo.para,
            tipoModelo: TIPOS_MODELO_EMAIL_SST.DOCUMENTOS_LOTE,
            assunto: `Aviso SST - ${grupo.empresa} - ${grupo.nomeResponsavel} - ${quantidade} documento(s)`,
            sistema: "SafeScan Brasil",
            remetenteNome: "SafeScan Brasil - Controle de SST",
            urlSistema: "https://www.safescanbrasil.com.br",
            empresa: grupo.empresa,
            tstResponsavel: grupo.tstResponsavel,
            itens: grupo.itens,
        };

        if (!payload.para) return false;

        try {
            const { data, error } = await supabase.functions.invoke(
                FUNCAO_EMAIL_ALERTA_TST,
                { body: payload }
            );

            if (error || data?.ok === false) {
                const mensagemErro = error?.message || data?.erro || "Falha na função de e-mail.";
                console.error("Erro ao enviar resumo de documentos em lote:", error || data);
                await registrarResultadoGrupoEmail(grupo, payload, "Erro", mensagemErro);
                return false;
            }

            await registrarResultadoGrupoEmail(grupo, payload, "Sucesso");
            return true;
        } catch (erro) {
            const mensagemErro = erro?.message || String(erro);
            console.error("Falha inesperada no envio agrupado de documentos:", erro);
            await registrarResultadoGrupoEmail(grupo, payload, "Erro", mensagemErro);
            return false;
        }
    };

    const enviarGruposDocumentosEmLote = async (grupos) => {
        let emailsEnviados = 0;
        let emailsComFalha = 0;
        let documentosEnviados = 0;

        for (const grupo of grupos) {
            if (!grupo.para) {
                emailsComFalha += 1;
                continue;
            }

            const sucesso = await enviarGrupoDocumentosEmLote(grupo);

            if (sucesso) {
                emailsEnviados += 1;
                documentosEnviados += grupo.itens.length;
            } else {
                emailsComFalha += 1;
            }
        }

        return { emailsEnviados, emailsComFalha, documentosEnviados };
    };

    const enviarAlertasPendenciasCriticas = async () => {
        if (!pendencias.length) {
            alert("Não existem pendências críticas para enviar por e-mail.");
            return;
        }

        const grupos = agruparDocumentosParaEnvioEmLote(pendencias);
        const gruposSemEmail = grupos.filter((grupo) => !grupo.para).length;
        const confirmar = window.confirm(
            `Deseja enviar ${grupos.length} e-mail(s) agrupado(s), contendo ${pendencias.length} documento(s)?${gruposSemEmail ? `\n\nAtenção: ${gruposSemEmail} colaborador(es) estão sem e-mail de TST cadastrado e não serão enviados.` : ""}`
        );

        if (!confirmar) return;

        setEnviandoEmail(true);

        try {
            const resultado = await enviarGruposDocumentosEmLote(grupos);
            alert(`Envio finalizado. E-mails enviados: ${resultado.emailsEnviados}. Documentos incluídos: ${resultado.documentosEnviados}. Falhas: ${resultado.emailsComFalha}.`);
        } finally {
            setEnviandoEmail(false);
        }
    };

    const enviarAlertasDocumentosAVencer30Dias = async () => {
        if (!documentosAVencer30Dias.length) {
            alert(
                "Não existem documentos com vencimento nos próximos 30 dias."
            );
            return;
        }

        const grupos = agruparDocumentosParaEnvioEmLote(
            documentosAVencer30Dias
        );
        const gruposSemEmail = grupos.filter(
            (grupo) => !grupo.para
        ).length;

        const confirmar =
            window.confirm(
                `Deseja enviar ${grupos.length} e-mail(s) agrupado(s), contendo ${documentosAVencer30Dias.length} documento(s)?${gruposSemEmail ? `\n\nAtenção: ${gruposSemEmail} colaborador(es) ou empresa(s) estão sem e-mail de TST cadastrado e não serão enviados.` : ""}`
            );

        if (!confirmar) return;

        setEnviandoEmail(true);

        try {
            const resultado = await enviarGruposDocumentosEmLote(grupos);
            alert(
                `Envio finalizado. E-mails enviados: ${resultado.emailsEnviados}. Documentos incluídos: ${resultado.documentosEnviados}. Falhas: ${resultado.emailsComFalha}.`
            );
        } finally {
            setEnviandoEmail(false);
        }
    };

    const baixarRelatorioDashboard = async () => {
        const cardsRelatorio = cardsOrdenados
            .filter((card) => cartasVisiveisDashboard[card.chave] !== false)
            .map(({ label, valor, detalhe }) => ({ label, valor, detalhe }));

        await baixarRelatorioDashboardSstPDF({
            nomeArquivo: "relatorio-dashboard-sst.pdf",
            cards: cardsRelatorio,
            indicadores,
            totalItens,
            resumoConformidade,
            rankingPendenciasEmpresa,
            colaboradoresPorFuncao,
            documentosPorTipo,
            ultimosDocumentosEnviados,
            pendencias,
            documentosVencidos,
            documentosAVencer,
            auditoriasCampoMes,
            mediaConformidadeCampo,
            desviosCampoAbertos,
            desviosCampoCorrigidos,
            aniversariantesMes,
            proximoAniversarioDashboard,
            alertasImportantes,
            storagePercentual,
            totalStorageLabel,
            storageLimiteLabelDashboard,
        });
    };

    const resumoConformidade = [
        { label: "Em dia", valor: indicadores.emDia, total: totalItens, classe: "bg-emerald-500" },
        { label: "Pendentes", valor: indicadores.pendentes, total: totalItens, classe: "bg-blue-500" },
        { label: "A vencer", valor: indicadores.vencendo, total: totalItens, classe: "bg-orange-500" },
        { label: "Vencidos", valor: indicadores.vencidos, total: totalItens, classe: "bg-red-500" },
    ];

    const opcoesBlocosOrdenadasDashboard = [
        ...ordemBlocosDashboard
            .map((chave) => opcoesPainelDashboard.find((opcao) => opcao.chave === chave))
            .filter(Boolean),
        ...opcoesPainelDashboard.filter((opcao) => !ordemBlocosDashboard.includes(opcao.chave)),
    ];

    const blocosDashboardOrdenados = opcoesBlocosOrdenadasDashboard
        .map((opcao) => opcao.chave)
        .filter((chave) => blocosPainelDashboard[chave]);

    const blocosDashboardExibidos = mostrarFiltroPainel
        ? abaPersonalizacaoPainel === "cartas"
            ? (blocosPainelDashboard.cards ? ["cards"] : [])
            : blocosDashboardOrdenados.filter((chave) => chave !== "cards")
        : blocosDashboardOrdenados;

    const mensagemDashboardSemBlocos = mostrarFiltroPainel
        ? abaPersonalizacaoPainel === "cartas"
            ? "A prévia da Seção 1 mostra somente as cartas principais. Ative as cartas para visualizar a configuração."
            : "A prévia da Seção 2 mostra somente os quadros do Dashboard SST. Ative os quadros para visualizar a configuração."
        : "Nenhum quadro selecionado para o Dashboard SST. Abra Personalizar painel e escolha as informações que deseja exibir.";

    const obterTamanhoCartaDashboard = useCallback(
        (chave) => normalizarTamanhoCartaDashboard(chave, tamanhosCartasDashboard),
        [tamanhosCartasDashboard]
    );

    const obterClasseTamanhoCartaDashboard = useCallback(
        (chave) => classeTamanhoCartaDashboard(chave, tamanhosCartasDashboard),
        [tamanhosCartasDashboard]
    );

    const obterClasseValorCartaDashboard = useCallback(
        (chave) => classeValorCartaDashboard(chave, tamanhosCartasDashboard),
        [tamanhosCartasDashboard]
    );

    const renderCardsPrincipaisDashboard = () => (
        <div className="dashboard-summary-grid">
            {cardsVisiveis.map((item) => {
                const Icon = item.icon;
                const estilos = estiloCartaDashboard(item.chave) || {};
                const ehArmazenamento = item.chave === "armazenamentoUtilizado";
                const acento = obterAcentoCartaDashboard(item.chave);
                const tituloCompacto = obterTituloCompactoCartaDashboard(item);
                const detalheCompacto = obterDetalheCompactoCartaDashboard(item);
                const storagePercentualRotulo = `${Number(storagePercentual || 0)}%`;
                const tituloExibido = ehArmazenamento ? "ARMAZENAMENTO" : tituloCompacto;
                const podeAbrirResumo =
                    !mostrarFiltroPainel &&
                    CHAVES_CARTAS_COM_RESUMO.has(item.chave);
                const storagePercentualValor = Math.max(0, Math.min(100, Number(storagePercentual || 0)));
                const storageAngulo = Math.round((storagePercentualValor / 100) * 360);
                const storageFundoAnel = "conic-gradient(from 180deg, rgba(16,185,129,0.96) 0deg, rgba(16,185,129,0.96) var(--storage-angulo), rgba(226,232,240,0.95) var(--storage-angulo), rgba(226,232,240,0.95) 360deg)";

                if (ehArmazenamento) {
                    const propriedadesStorage = {
                        titulo: tituloExibido,
                        detalhe: detalheCompacto,
                        percentual: storagePercentualValor,
                        classeTamanho: obterClasseTamanhoCartaDashboard(item.chave),
                        onClick: () => abrirResumoCartaDashboard(item.chave),
                    };

                    return (
                        <React.Fragment key={item.chave}>
                            <DashboardStorageDesktop {...propriedadesStorage} />
                            <DashboardStorageMobile {...propriedadesStorage} />
                        </React.Fragment>
                    );
                }
                return (
                    <div
                        key={item.chave}
                        data-dashboard-card-tamanho={obterTamanhoCartaDashboard(item.chave)}
                        data-dashboard-card={item.chave}
                        onClick={podeAbrirResumo ? () => abrirResumoCartaDashboard(item.chave) : undefined}
                        onKeyDown={podeAbrirResumo ? (evento) => {
                            if (evento.key === "Enter" || evento.key === " ") {
                                evento.preventDefault();
                                abrirResumoCartaDashboard(item.chave);
                            }
                        } : undefined}
                        role={podeAbrirResumo ? "button" : undefined}
                        tabIndex={podeAbrirResumo ? 0 : undefined}
                        title={podeAbrirResumo ? "Clique para ver os itens deste card" : undefined}
                        className={`dashboard-summary-card group relative flex flex-col h-auto min-h-[6.25rem] overflow-hidden rounded-[22px] border bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(246,249,252,0.96)_100%)] px-3 pt-3 pb-2 shadow-[0_10px_26px_rgba(26,35,50,0.08)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(26,35,50,0.13)] ${podeAbrirResumo ? "cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2" : ""} ${acento.borda} ${obterClasseTamanhoCartaDashboard(item.chave)}`}
                    >
                        <span className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${acento.faixa}`} />

                        <div className="flex min-h-0 flex-1 items-center justify-center gap-2">
                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl shadow-sm ring-1 ${acento.fundoIcone || estilos.icone || "bg-[#F4F6F9] text-[#1A2332] ring-[#E5E9EF]"}`}>
                                <Icon className="h-5 w-5" />
                            </div>

                            <div className="min-w-0 flex-1 text-center">
                                <div className="flex min-w-0 justify-center gap-2">
                                    <h3 className="min-w-0 whitespace-nowrap break-normal hyphens-none text-[12px] font-black uppercase tracking-[0.08em] leading-tight text-slate-800">
                                        {tituloExibido}
                                    </h3>
                                </div>

                                <p className={`mt-1.5 border-b border-slate-200/80 pb-1 text-[1.8rem] font-black leading-none tracking-tight ${obterClasseValorCartaDashboard(item.chave)} ${estilos.valor || "text-slate-950"}`}>
                                    {item.valor}
                                </p>
                            </div>
                        </div>

                        <p className="dashboard-summary-card-detail mt-auto w-full shrink-0 overflow-hidden text-ellipsis whitespace-nowrap text-center text-[10px] font-semibold leading-tight text-slate-500 break-normal hyphens-none">
                            {detalheCompacto}
                        </p>
                    </div>
                );
            })}
        </div>
    );

    const renderBlocoDashboard = (chave) => {
        if (chave === "cards") {
            return renderCardsPrincipaisDashboard();
        }

        return (
            <DashboardBlocoConteudo
                chave={chave}
                cardsVisiveis={cardsVisiveis}
                storageStatusDashboard={storageStatusDashboard}
                storagePercentual={storagePercentual}
                totalStorageLabel={totalStorageLabel}
                storageLimiteLabelDashboard={storageLimiteLabelDashboard}
                classeTamanhoCartaDashboard={obterClasseTamanhoCartaDashboard}
                tamanhosCartasDashboard={tamanhosCartasDashboard}
                estiloCartaDashboard={estiloCartaDashboard}
                auditoriasCampoMes={auditoriasCampoMes}
                mediaConformidadeCampo={mediaConformidadeCampo}
                desviosCampoAbertos={desviosCampoAbertos}
                desviosCampoCorrigidos={desviosCampoCorrigidos}
                auditoriasCampoNormalizadas={auditoriasCampoNormalizadas}
                blocosRecolhidosDashboard={blocosRecolhidosDashboard}
                alternarBlocoRecolhidoDashboard={alternarBlocoRecolhidoDashboard}
                topDesviosCampo={topDesviosCampo}
                pendencias={pendencias}
                documentosAVencer30Dias={documentosAVencer30Dias}
                enviarAlertaEmailPendencia={enviarAlertaEmailPendencia}
                enviarAlertaEmailDocumentoEmpresa={enviarAlertaEmailDocumentoEmpresa}
                enviarAlertasDocumentosAVencer30Dias={enviarAlertasDocumentosAVencer30Dias}
                enviandoEmail={enviandoEmail}
                onSelectColab={onSelectColab}
                onVisualizarDocumentoEmpresa={onVisualizarDocumentoEmpresa}
                onVisualizarCertificado={onVisualizarCertificado}
                resumoConformidade={resumoConformidade}
                rankingPendenciasEmpresa={rankingPendenciasEmpresa}
                colaboradoresPorFuncao={colaboradoresPorFuncao}
                maiorQuantidadePorFuncao={maiorQuantidadePorFuncao}
                alertasImportantes={alertasImportantes}
                documentosPorTipo={documentosPorTipo}
                ultimosDocumentosEnviados={ultimosDocumentosEnviados}
                proximoAniversarioDashboard={proximoAniversarioDashboard}
            />
        );
    };


    return (
        <div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Header
                className="dashboard-sst-page-header max-xl:!flex-col max-xl:!items-stretch max-xl:[&_.page-header-text]:!max-w-none max-xl:[&_.page-header-text]:!flex-none max-xl:[&_.page-actions]:!w-full max-xl:[&_.page-actions]:!justify-start"
                titulo="Dashboard SST"
                acao={
                    <div className="top-actions-nowrap dashboard-sst-actions-horizontal dashboard-sst-header-actions">
                        <button
                            type="button"
                            onClick={atualizarInformacoesDashboard}
                            disabled={atualizandoDashboardSstCompleto}
                            className="dashboard-sst-refresh-button inline-flex items-center gap-2 rounded-2xl border border-[#E5E9EF] bg-white px-4 py-2.5 text-sm font-black text-[#1A2332] shadow-[0_6px_16px_rgba(26,35,50,0.06)] transition hover:-translate-y-0.5 hover:bg-[#F8FAFC] hover:shadow-[0_10px_22px_rgba(26,35,50,0.10)] disabled:cursor-not-allowed disabled:opacity-60"
                            title="Atualizar colaboradores, empresas, documentos, auditorias e armazenamento do Dashboard SST"
                        >
                            <RefreshCw className={`h-4 w-4 ${atualizandoDashboardSstCompleto ? "animate-spin" : ""}`} />
                            {atualizandoDashboardSstCompleto ? "Atualizando..." : "Atualizar informações"}
                        </button>

                        <div className="dashboard-sst-desktop-actions">
                            <DashboardHeaderAcoes
                                setMostrarFiltroPainel={setMostrarFiltroPainel}
                                enviarAlertasPendenciasCriticas={enviarAlertasPendenciasCriticas}
                                baixarRelatorioDashboard={baixarRelatorioDashboard}
                                enviandoEmail={enviandoEmail}
                                pendencias={pendencias}
                            />
                        </div>
                    </div>
                }
            />

            <section className="dashboard-hero-sst relative mb-6 overflow-hidden rounded-[22px] border border-[#E5E9EF] bg-[#111827] shadow-[0_10px_28px_rgba(26,35,50,0.12)]">
                <div
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-100"
                    style={{
                        backgroundImage: `url(${dashboardHeroBackground})`,
                        backgroundPosition: "center center",
                        backgroundSize: "cover",
                    }}
                />
                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(17,24,39,0.34)_0%,rgba(17,24,39,0.22)_34%,rgba(17,24,39,0.08)_68%,rgba(17,24,39,0.06)_100%)]" />

                <div className="relative flex min-h-[155px] flex-col justify-between gap-5 px-6 py-6 text-white lg:flex-row lg:items-center">
                    <div className="min-w-0" style={{ textShadow: "0 2px 10px rgba(0,0,0,0.65)" }}>
                        <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-300">
                            SafeScan Brasil
                        </p>
                        <h2 className="mt-2 text-xl font-black leading-tight text-white md:text-2xl">
                            Olá, <span className="text-emerald-300">{nomeUsuarioHeroDashboard}</span>!
                        </h2>
                        <p className="mt-2 text-base font-bold text-slate-200 md:text-lg">
                            Bem-vindo ao painel SST.
                        </p>
                        <div className="mt-5 h-1 w-14 rounded-full bg-[#1E7C3A]" />
                    </div>

                    <div className="dashboard-hero-sst__date rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm font-black text-white shadow-[0_8px_24px_rgba(0,0,0,0.22)] backdrop-blur">
                        <div className="flex flex-wrap items-center gap-2">
                            <CalendarClock className="h-4 w-4 text-emerald-300" />
                            <span>{dataHeroDashboard}</span>
                            <span className="text-emerald-300">•</span>
                            <span className="capitalize">{diaSemanaHeroDashboard}</span>
                            <span className="text-emerald-300">•</span>
                            <span>{horaHeroDashboard}</span>
                        </div>
                    </div>
                </div>
            </section>
            <div className="dashboard-sst-mobile-secondary">
            <DashboardControles
                mostrarFiltroPainel={mostrarFiltroPainel}
                abaPersonalizacaoPainel={abaPersonalizacaoPainel}
                setAbaPersonalizacaoPainel={setAbaPersonalizacaoPainel}
                blocosPainelDashboard={blocosPainelDashboard}
                setBlocosPainelDashboard={setBlocosPainelDashboard}
                cartasVisiveisDashboard={cartasVisiveisDashboard}
                setCartasVisiveisDashboard={setCartasVisiveisDashboard}
                tamanhosCartasDashboard={tamanhosCartasDashboard}
                setTamanhosCartasDashboard={setTamanhosCartasDashboard}
                tamanhosBlocosDashboard={tamanhosBlocosDashboard}
                setTamanhosBlocosDashboard={setTamanhosBlocosDashboard}
                setBlocosRecolhidosDashboard={setBlocosRecolhidosDashboard}
                setOrdemBlocosDashboard={setOrdemBlocosDashboard}
                setOrdemCartasDashboard={setOrdemCartasDashboard}
                opcoesCartasOrdenadasDashboard={cardsOrdenados}
                opcoesBlocosOrdenadasDashboard={opcoesBlocosOrdenadasDashboard}
                cartaArrastandoDashboard={cartaArrastandoDashboard}
                setCartaArrastandoDashboard={setCartaArrastandoDashboard}
                blocoArrastandoDashboard={blocoArrastandoDashboard}
                setBlocoArrastandoDashboard={setBlocoArrastandoDashboard}
                alternarBlocoPainel={alternarBlocoPainel}
                alternarCartaPainel={alternarCartaPainel}
                alterarTamanhoCartaPainel={alterarTamanhoCartaPainel}
                alterarTamanhoBlocoPainel={alterarTamanhoBlocoPainel}
                moverBlocoPainel={moverBlocoPainel}
                moverCartaPainel={moverCartaPainel}
                soltarCartaPainel={soltarCartaPainel}
                soltarBlocoPainel={soltarBlocoPainel}
                prepararArrastePainel={prepararArrastePainel}
            />

            <DashboardPreviewFiltro
                mostrarFiltroPainel={mostrarFiltroPainel}
                abaPersonalizacaoPainel={abaPersonalizacaoPainel}
            />

            </div>

            <DashboardBlocosGrid
                mostrarFiltroPainel={mostrarFiltroPainel}
                blocosDashboardExibidos={blocosDashboardExibidos}
                mensagemDashboardSemBlocos={mensagemDashboardSemBlocos}
                classeTamanhoBlocoDashboard={classeTamanhoBlocoDashboard}
                tamanhosBlocosDashboard={tamanhosBlocosDashboard}
                renderBlocoDashboard={renderBlocoDashboard}
            />

            <DashboardCartaResumoModal
                resumo={resumoCartaDashboard}
                onClose={() => setResumoCartaDashboard(null)}
            />
        </div>
    );
}
