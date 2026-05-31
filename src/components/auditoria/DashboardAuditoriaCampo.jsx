/* eslint-disable no-unused-vars */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import {
    AlertTriangle,
    BadgeCheck,
    CalendarClock,
    ClipboardCheck,
    Download,
    Filter,
    QrCode,
    RefreshCw,
    Send,
    Trash2,
} from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { Card, FotoAuditoriaPreview, Header } from "../commonComponents";
import { EditorNotificacaoHistoricoAuditoria } from "./EditorNotificacaoHistoricoAuditoria";
import {
    obterTipoAuditoriaCampoDireta,
    montarMensagemFluidaAuditoriaCampo,
    classeClassificacaoAuditoriaCampo,
    normalizarAuditoriaCampo,
    identificarAlvoAuditoriaCampo,
    fotosAuditoriaCampo,
    auditoriaCampoAberta,
    auditoriaCampoVencida,
} from "../../services/auditoriaCampoService";
import { tiposAuditoriaCampoDireta } from "../../constants/sstConstants";
import { normalizarTextoBusca, formatDate, formatarDataHora, classNames } from "../../utils/sstUtils";
import { LIMITE_QRCODES_CAMPO_POR_CARGA } from "../../constants/sistemaLimitesConstants";
import { carregarConfiguracaoAuditoriaPublicaSistema } from "../../constants/auditoriaPublicaConstants";

const hoje = new Date();

export function DashboardAuditoriaCampo({
    auditoriasCampo = [],
    carregando = false,
    erro = "",
    onRecarregar,
    onCarregarMaisAuditoriasCampo,
    carregandoMaisAuditoriasCampo = false,
    existeMaisAuditoriasCampo = false,
    limiteQrcodesCampo = LIMITE_QRCODES_CAMPO_POR_CARGA,
    onAuditoriaAtualizada,
}) {
    const [mostrarPersonalizacao, setMostrarPersonalizacao] = useState(false);
    const [configAuditoriaPublica] = useState(() => carregarConfiguracaoAuditoriaPublicaSistema());
    const tokenAuditoriaCampoConfigurado = String(configAuditoriaPublica.tokenPublico || "").trim();
    const limiteQrcodesCampoAtual = Math.max(10, Number(limiteQrcodesCampo || LIMITE_QRCODES_CAMPO_POR_CARGA));
    const [qrcodesCampo, setQrcodesCampo] = useState([]);
    const [qrcodesCampoCarregados, setQrcodesCampoCarregados] = useState(false);
    const [existeMaisQrcodesCampo, setExisteMaisQrcodesCampo] = useState(false);
    const [carregandoQrcodesCampo, setCarregandoQrcodesCampo] = useState(false);
    const [carregandoMaisQrcodesCampo, setCarregandoMaisQrcodesCampo] = useState(false);
    const [excluindoQrCampoId, setExcluindoQrCampoId] = useState(null);
    const [mensagemQrCampo, setMensagemQrCampo] = useState("");
    const [buscaQrCampoSalvo, setBuscaQrCampoSalvo] = useState("");
    const [filtroTipoQrCampoSalvo, setFiltroTipoQrCampoSalvo] = useState("todos");
    const [empresasCadastradasQrCampo, setEmpresasCadastradasQrCampo] = useState([]);
    const [carregandoEmpresasQrCampo, setCarregandoEmpresasQrCampo] = useState(false);
    const [mensagemEmpresasQrCampo, setMensagemEmpresasQrCampo] = useState("");
    const [qrFormCampo, setQrFormCampo] = useState({
        tipo: "maquina",
        identificacao: "",
        area: "",
        local: "",
        empresaResponsavel: "",
        token: tokenAuditoriaCampoConfigurado,
        observacao: "",
    });

    const cartasPadrao = {
        totalAuditorias: true,
        auditoriasMes: true,
        auditoriasAbertas: true,
        auditoriasVencidas: true,
        desviosCriticos: true,
        desviosAbertos: true,
        mediaConformidade: true,
    };
    const tamanhosCartasPadrao = {
        totalAuditorias: "padrao",
        auditoriasMes: "padrao",
        auditoriasAbertas: "padrao",
        auditoriasVencidas: "padrao",
        desviosCriticos: "padrao",
        desviosAbertos: "padrao",
        mediaConformidade: "padrao",
    };
    const ordemCartasPadrao = [
        "totalAuditorias",
        "auditoriasMes",
        "auditoriasAbertas",
        "auditoriasVencidas",
        "desviosCriticos",
        "desviosAbertos",
        "mediaConformidade",
    ];

    const blocosPadrao = {
        historico: true,
        resumoVisual: true,
        topDesvios: true,
        empresas: true,
        areas: true,
        boasPraticas: true,
        qrcodes: true,
    };
    const tamanhosBlocosPadrao = {
        historico: "destaque",
        resumoVisual: "medio",
        topDesvios: "medio",
        empresas: "medio",
        areas: "medio",
        boasPraticas: "medio",
        qrcodes: "destaque",
    };
    const ordemBlocosPadrao = [
        "historico",
        "resumoVisual",
        "topDesvios",
        "empresas",
        "areas",
        "boasPraticas",
        "qrcodes",
    ];

    const opcoesTamanho = [
        { chave: "padrao", label: "Padrão", descricao: "1 coluna" },
        { chave: "medio", label: "Médio", descricao: "2 colunas" },
        { chave: "grande", label: "Grande", descricao: "3 colunas" },
        { chave: "destaque", label: "Destaque", descricao: "linha inteira" },
    ];

    const [cartasVisiveis, setCartasVisiveis] = useState(() => {
        if (typeof window === "undefined") return cartasPadrao;
        try {
            const salvo = JSON.parse(window.localStorage.getItem("dashboardAuditoriaCampoCartasVisiveis") || "null");
            return salvo && typeof salvo === "object" ? { ...cartasPadrao, ...salvo } : cartasPadrao;
        } catch {
            return cartasPadrao;
        }
    });
    const [tamanhosCartas, setTamanhosCartas] = useState(() => {
        if (typeof window === "undefined") return tamanhosCartasPadrao;
        try {
            const salvo = JSON.parse(window.localStorage.getItem("dashboardAuditoriaCampoTamanhosCartas") || "null");
            return salvo && typeof salvo === "object" ? { ...tamanhosCartasPadrao, ...salvo } : tamanhosCartasPadrao;
        } catch {
            return tamanhosCartasPadrao;
        }
    });
    const [ordemCartas, setOrdemCartas] = useState(() => {
        if (typeof window === "undefined") return ordemCartasPadrao;
        try {
            const salvo = JSON.parse(window.localStorage.getItem("dashboardAuditoriaCampoOrdemCartas") || "null");
            return Array.isArray(salvo) ? [...salvo, ...ordemCartasPadrao.filter((chave) => !salvo.includes(chave))] : ordemCartasPadrao;
        } catch {
            return ordemCartasPadrao;
        }
    });
    const [blocosVisiveis, setBlocosVisiveis] = useState(() => {
        if (typeof window === "undefined") return blocosPadrao;
        try {
            const salvo = JSON.parse(window.localStorage.getItem("dashboardAuditoriaCampoBlocosVisiveis") || "null");
            return salvo && typeof salvo === "object" ? { ...blocosPadrao, ...salvo } : blocosPadrao;
        } catch {
            return blocosPadrao;
        }
    });
    const [tamanhosBlocos, setTamanhosBlocos] = useState(() => {
        if (typeof window === "undefined") return tamanhosBlocosPadrao;
        try {
            const salvo = JSON.parse(window.localStorage.getItem("dashboardAuditoriaCampoTamanhosBlocos") || "null");
            return salvo && typeof salvo === "object" ? { ...tamanhosBlocosPadrao, ...salvo } : tamanhosBlocosPadrao;
        } catch {
            return tamanhosBlocosPadrao;
        }
    });
    const [ordemBlocos, setOrdemBlocos] = useState(() => {
        if (typeof window === "undefined") return ordemBlocosPadrao;
        try {
            const salvo = JSON.parse(window.localStorage.getItem("dashboardAuditoriaCampoOrdemBlocos") || "null");
            return Array.isArray(salvo) ? [...salvo, ...ordemBlocosPadrao.filter((chave) => !salvo.includes(chave))] : ordemBlocosPadrao;
        } catch {
            return ordemBlocosPadrao;
        }
    });
    const blocosRecolhidosPadrao = {
        historico: true,
        resumoVisual: true,
        topDesvios: true,
        empresas: true,
        areas: true,
        boasPraticas: true,
        qrcodes: true,
    };
    const [blocosRecolhidos, setBlocosRecolhidos] = useState(() => {
        if (typeof window === "undefined") return blocosRecolhidosPadrao;
        try {
            const salvo = JSON.parse(window.localStorage.getItem("dashboardAuditoriaCampoBlocosRecolhidos") || "null");
            return salvo && typeof salvo === "object" ? { ...blocosRecolhidosPadrao, ...salvo } : blocosRecolhidosPadrao;
        } catch {
            return blocosRecolhidosPadrao;
        }
    });
    const [cartaArrastandoAuditoria, setCartaArrastandoAuditoria] = useState(null);
    const [blocoArrastandoAuditoria, setBlocoArrastandoAuditoria] = useState(null);
    const [auditoriasHistoricoAbertas, setAuditoriasHistoricoAbertas] = useState(() => {
        if (typeof window === "undefined") return {};
        try {
            const salvo = JSON.parse(window.localStorage.getItem("dashboardAuditoriaCampoAuditoriasAbertas") || "{}");
            return salvo && typeof salvo === "object" ? salvo : {};
        } catch {
            return {};
        }
    });
    const [filtrosAuditoriaCampo, setFiltrosAuditoriaCampo] = useState({
        busca: "",
        periodo: "todos",
        tipo: "todos",
        empresa: "todos",
        auditor: "todos",
        status: "todos",
        risco: "todos",
    });
    const [buscarAuditoriaRecolhido, setBuscarAuditoriaRecolhido] = useState(() => {
        if (typeof window === "undefined") return false;
        return window.localStorage.getItem("dashboardAuditoriaCampoBuscarRecolhido") === "true";
    });
    const [quantidadeHistoricoVisivel, setQuantidadeHistoricoVisivel] = useState(30);

    useEffect(() => { if (typeof window !== "undefined") window.localStorage.setItem("dashboardAuditoriaCampoCartasVisiveis", JSON.stringify(cartasVisiveis)); }, [cartasVisiveis]);
    useEffect(() => { if (typeof window !== "undefined") window.localStorage.setItem("dashboardAuditoriaCampoTamanhosCartas", JSON.stringify(tamanhosCartas)); }, [tamanhosCartas]);
    useEffect(() => { if (typeof window !== "undefined") window.localStorage.setItem("dashboardAuditoriaCampoOrdemCartas", JSON.stringify(ordemCartas)); }, [ordemCartas]);
    useEffect(() => { if (typeof window !== "undefined") window.localStorage.setItem("dashboardAuditoriaCampoBlocosVisiveis", JSON.stringify(blocosVisiveis)); }, [blocosVisiveis]);
    useEffect(() => { if (typeof window !== "undefined") window.localStorage.setItem("dashboardAuditoriaCampoTamanhosBlocos", JSON.stringify(tamanhosBlocos)); }, [tamanhosBlocos]);
    useEffect(() => { if (typeof window !== "undefined") window.localStorage.setItem("dashboardAuditoriaCampoOrdemBlocos", JSON.stringify(ordemBlocos)); }, [ordemBlocos]);
    useEffect(() => { if (typeof window !== "undefined") window.localStorage.setItem("dashboardAuditoriaCampoBlocosRecolhidos", JSON.stringify(blocosRecolhidos)); }, [blocosRecolhidos]);
    useEffect(() => { if (typeof window !== "undefined") window.localStorage.setItem("dashboardAuditoriaCampoAuditoriasAbertas", JSON.stringify(auditoriasHistoricoAbertas)); }, [auditoriasHistoricoAbertas]);
    useEffect(() => { if (typeof window !== "undefined") window.localStorage.setItem("dashboardAuditoriaCampoBuscarRecolhido", String(buscarAuditoriaRecolhido)); }, [buscarAuditoriaRecolhido]);
    useEffect(() => { setQuantidadeHistoricoVisivel(30); }, [filtrosAuditoriaCampo]);

    const carregarEmpresasCadastradasQrCampo = useCallback(async () => {
        setCarregandoEmpresasQrCampo(true);
        setMensagemEmpresasQrCampo("");

        try {
            const { data, error } = await supabase
                .from("empresas")
                .select("id,nome")
                .order("nome", { ascending: true });

            if (error) throw error;

            const mapaEmpresas = new Map();
            (Array.isArray(data) ? data : []).forEach((empresa) => {
                const nome = String(empresa?.nome || "").trim();
                if (!nome) return;
                const chave = normalizarTextoBusca(nome);
                if (!mapaEmpresas.has(chave)) {
                    mapaEmpresas.set(chave, { id: empresa.id || nome, nome });
                }
            });

            setEmpresasCadastradasQrCampo(Array.from(mapaEmpresas.values()));
        } catch (error) {
            setMensagemEmpresasQrCampo(`Não foi possível carregar empresas cadastradas: ${error.message}`);
        } finally {
            setCarregandoEmpresasQrCampo(false);
        }
    }, []);

    useEffect(() => {
        carregarEmpresasCadastradasQrCampo();
    }, [carregarEmpresasCadastradasQrCampo]);

    const empresasQrCampoOpcoes = useMemo(() => {
        const mapaEmpresas = new Map();

        empresasCadastradasQrCampo.forEach((empresa) => {
            const nome = String(empresa?.nome || "").trim();
            if (!nome) return;
            mapaEmpresas.set(normalizarTextoBusca(nome), { id: empresa.id || nome, nome });
        });

        const empresaAtual = String(qrFormCampo.empresaResponsavel || "").trim();
        if (empresaAtual && !mapaEmpresas.has(normalizarTextoBusca(empresaAtual))) {
            mapaEmpresas.set(normalizarTextoBusca(empresaAtual), { id: empresaAtual, nome: empresaAtual });
        }

        return Array.from(mapaEmpresas.values()).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    }, [empresasCadastradasQrCampo, qrFormCampo.empresaResponsavel]);

    const auditoriasNormalizadas = useMemo(() => auditoriasCampo.map(normalizarAuditoriaCampo), [auditoriasCampo]);
    const opcoesFiltroAuditoriaCampo = useMemo(() => {
        const unicos = (valores) => Array.from(new Set(valores.map((valor) => String(valor || "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, "pt-BR"));
        return {
            tipos: unicos(auditoriasNormalizadas.map((item) => item.tipoAuditoria || identificarAlvoAuditoriaCampo(item).tipo)),
            empresas: unicos(auditoriasNormalizadas.map((item) => item.empresaNome || item.empresaResponsavel)),
            auditores: unicos(auditoriasNormalizadas.map((item) => item.auditorNome)),
            status: unicos(auditoriasNormalizadas.map((item) => item.statusAuditoria || item.statusDesvio)),
            riscos: unicos(auditoriasNormalizadas.map((item) => item.grauRisco)),
        };
    }, [auditoriasNormalizadas]);
    const auditoriasFiltradas = useMemo(() => {
        const busca = normalizarTextoBusca(filtrosAuditoriaCampo.busca || "");
        const agora = new Date();
        return auditoriasNormalizadas.filter((item) => {
            const alvo = identificarAlvoAuditoriaCampo(item);
            const data = item.createdAt ? new Date(item.createdAt) : null;
            if (filtrosAuditoriaCampo.periodo === "mes" && (!data || data.getMonth() !== agora.getMonth() || data.getFullYear() !== agora.getFullYear())) return false;
            if (filtrosAuditoriaCampo.periodo === "vencidas" && !auditoriaCampoVencida(item)) return false;
            if (filtrosAuditoriaCampo.periodo === "criticas") {
                const classificacao = normalizarTextoBusca(item.classificacao || "");
                const risco = normalizarTextoBusca(item.grauRisco || "");
                if (!(risco.includes("critico") || risco.includes("crítico") || classificacao.includes("critico") || classificacao.includes("crítico") || classificacao.includes("acao") || classificacao.includes("ação") || Number(item.pontuacao || 0) < 50)) return false;
            }
            if (filtrosAuditoriaCampo.tipo !== "todos" && String(item.tipoAuditoria || alvo.tipo) !== filtrosAuditoriaCampo.tipo) return false;
            if (filtrosAuditoriaCampo.empresa !== "todos" && String(item.empresaNome || item.empresaResponsavel || "") !== filtrosAuditoriaCampo.empresa) return false;
            if (filtrosAuditoriaCampo.auditor !== "todos" && String(item.auditorNome || "") !== filtrosAuditoriaCampo.auditor) return false;
            if (filtrosAuditoriaCampo.status !== "todos" && String(item.statusAuditoria || item.statusDesvio || "") !== filtrosAuditoriaCampo.status) return false;
            if (filtrosAuditoriaCampo.risco !== "todos" && String(item.grauRisco || "") !== filtrosAuditoriaCampo.risco) return false;
            if (busca) {
                const baseBusca = normalizarTextoBusca([
                    item.numeroAuditoria,
                    item.titulo,
                    alvo.titulo,
                    alvo.descricao,
                    item.area,
                    item.local,
                    item.maquinaEquipamento,
                    item.empresaNome,
                    item.empresaResponsavel,
                    item.auditorNome,
                    item.situacaoEncontrada,
                    item.acaoRecomendada,
                    item.responsavelTratativa,
                ].filter(Boolean).join(" "));
                if (!baseBusca.includes(busca)) return false;
            }
            return true;
        }).sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
    }, [auditoriasNormalizadas, filtrosAuditoriaCampo]);
    const auditoriasBaseDashboard = auditoriasNormalizadas.filter((item) =>
        item.numeroAuditoria ||
        item.tipoAuditoria ||
        item.titulo ||
        item.area ||
        item.local ||
        item.maquinaEquipamento ||
        item.situacaoEncontrada
    );

    const mesAtual = hoje.getMonth();
    const anoAtual = hoje.getFullYear();

    const auditoriasMes = auditoriasBaseDashboard.filter((item) => {
        const data = item.createdAt ? new Date(item.createdAt) : null;
        return data && !Number.isNaN(data.getTime()) && data.getMonth() === mesAtual && data.getFullYear() === anoAtual;
    });

    const mediaConformidade = auditoriasMes.length
        ? Math.round(auditoriasMes.reduce((total, item) => total + Number(item.pontuacao || 0), 0) / auditoriasMes.length)
        : 0;

    const auditoriasAbertas = auditoriasBaseDashboard.filter((item) => {
        const status = normalizarTextoBusca(item.statusAuditoria || item.statusDesvio || "");
        return (
            status.includes("aberta") ||
            status.includes("aberto") ||
            status.includes("andamento") ||
            status.includes("tratativa")
        ) && !(
            status.includes("corrigido") ||
            status.includes("corrigida") ||
            status.includes("resolvida") ||
            status.includes("cancelada") ||
            status.includes("concluido") ||
            status.includes("concluído")
        );
    }).length;

    const auditoriasVencidas = auditoriasBaseDashboard.filter(auditoriaCampoVencida).length;
    const desviosAbertos = auditoriasBaseDashboard.filter(auditoriaCampoAberta).length;

    const desviosCriticos = auditoriasBaseDashboard.filter((item) => {
        const classificacao = normalizarTextoBusca(item.classificacao || "");
        const risco = normalizarTextoBusca(item.grauRisco || "");
        const categoria = normalizarTextoBusca(item.categoriaDesvioPrincipal || "");
        const status = normalizarTextoBusca(item.statusDesvio || item.statusAuditoria || "");

        const ehCritico =
            item.temDesvioGrave ||
            risco.includes("alto") ||
            risco.includes("critico") ||
            risco.includes("crítico") ||
            classificacao.includes("critico") ||
            classificacao.includes("crítico") ||
            classificacao.includes("acao") ||
            classificacao.includes("ação") ||
            categoria.includes("grave") ||
            categoria.includes("critico") ||
            categoria.includes("crítico") ||
            Number(item.pontuacao || 0) < 50;

        const estaEncerrado =
            status.includes("corrigido") ||
            status.includes("corrigida") ||
            status.includes("resolvida") ||
            status.includes("cancelada") ||
            status.includes("concluido") ||
            status.includes("concluído");

        return ehCritico && !estaEncerrado;
    }).length;

    const auditoriasCriticas = desviosCriticos;

    const topDesvios = Object.values(
        auditoriasBaseDashboard.reduce((acc, item) => {
            const chave =
                item.categoriaDesvioPrincipal ||
                item.grauRisco ||
                item.tipoAuditoria ||
                "Sem categoria informada";

            if (!acc[chave]) {
                acc[chave] = {
                    categoria: chave,
                    total: 0,
                    abertos: 0,
                };
            }

            acc[chave].total += Number(item.totalDesvios || 0) || 1;

            if (auditoriaCampoAberta(item)) {
                acc[chave].abertos += 1;
            }

            return acc;
        }, {})
    )
        .filter((item) => item.total > 0)
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

    const empresasAuditoria = Object.values(
        auditoriasBaseDashboard.reduce((acc, item) => {
            const empresa = item.empresaNome || item.empresaResponsavel || "Empresa não informada";

            if (!acc[empresa]) {
                acc[empresa] = {
                    empresa,
                    auditorias: 0,
                    desvios: 0,
                    soma: 0,
                };
            }

            acc[empresa].auditorias += 1;
            acc[empresa].desvios += Number(item.totalDesvios || 0);
            acc[empresa].soma += Number(item.pontuacao || 0);

            return acc;
        }, {})
    )
        .map((item) => ({
            ...item,
            media: item.auditorias ? Math.round(item.soma / item.auditorias) : 0,
        }))
        .sort((a, b) => b.desvios - a.desvios || b.auditorias - a.auditorias);

    const areasAuditoria = Object.values(
        auditoriasBaseDashboard.reduce((acc, item) => {
            const alvo =
                item.area ||
                item.local ||
                item.maquinaEquipamento ||
                identificarAlvoAuditoriaCampo(item).titulo ||
                "Área/local não informado";

            if (!acc[alvo]) {
                acc[alvo] = {
                    area: alvo,
                    auditorias: 0,
                    desvios: 0,
                    riscosAltos: 0,
                    soma: 0,
                };
            }

            const risco = normalizarTextoBusca(item.grauRisco || "");

            acc[alvo].auditorias += 1;
            acc[alvo].desvios += Number(item.totalDesvios || 0);
            acc[alvo].soma += Number(item.pontuacao || 0);

            if (risco.includes("alto") || risco.includes("critico") || risco.includes("crítico")) {
                acc[alvo].riscosAltos += 1;
            }

            return acc;
        }, {})
    )
        .map((item) => ({
            ...item,
            media: item.auditorias ? Math.round(item.soma / item.auditorias) : 0,
        }))
        .sort((a, b) => b.riscosAltos - a.riscosAltos || b.desvios - a.desvios || b.auditorias - a.auditorias)
        .slice(0, 10);

    const boasPraticasAuditoria = auditoriasBaseDashboard
        .filter((item) => String(item.boasPraticas || "").trim())
        .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))
        .slice(0, 10);

    const cartas = [
        {
            chave: "totalAuditorias",
            label: "Total de auditorias",
            valor: auditoriasBaseDashboard.length,
            icon: ClipboardCheck,
            detalhe: "Registros válidos no banco",
        },
        {
            chave: "auditoriasMes",
            label: "Auditorias do mês",
            valor: auditoriasMes.length,
            icon: ClipboardCheck,
            detalhe: "Registradas no mês atual",
        },
        {
            chave: "auditoriasAbertas",
            label: "Auditorias abertas",
            valor: auditoriasAbertas,
            icon: AlertTriangle,
            detalhe: "Aguardando tratativa",
        },
        {
            chave: "auditoriasVencidas",
            label: "Auditorias vencidas",
            valor: auditoriasVencidas,
            icon: CalendarClock,
            detalhe: "Prazo de adequação vencido",
        },
        {
            chave: "desviosCriticos",
            label: "Desvios críticos",
            valor: desviosCriticos,
            icon: AlertTriangle,
            detalhe: "Alto/crítico ou ação imediata",
        },
        {
            chave: "desviosAbertos",
            label: "Desvios abertos",
            valor: desviosAbertos,
            icon: AlertTriangle,
            detalhe: "Pendências não encerradas",
        },
        {
            chave: "mediaConformidade",
            label: "Média de conformidade",
            valor: `${mediaConformidade}%`,
            icon: BadgeCheck,
            detalhe: "Média das auditorias do mês",
        },
    ];
    const blocos = [
        { chave: "historico", label: "Últimas auditorias registradas" },
        { chave: "resumoVisual", label: "Resumo visual das auditorias" },
        { chave: "topDesvios", label: "Top 5 desvios" },
        { chave: "empresas", label: "Ranking por empresa" },
        { chave: "areas", label: "Ranking por área/local" },
        { chave: "boasPraticas", label: "Boas práticas para DDS" },
        { chave: "qrcodes", label: "QR Codes de campo" },
    ];

    const ordenar = (lista, ordem) => [
        ...ordem.map((chave) => lista.find((item) => item.chave === chave)).filter(Boolean),
        ...lista.filter((item) => !ordem.includes(item.chave)),
    ];
    const cartasOrdenadas = ordenar(cartas, ordemCartas);
    const blocosOrdenados = ordenar(blocos, ordemBlocos);

    const classeTamanho = (tamanho = "padrao") => {
        if (tamanho === "destaque") return "md:col-span-2 xl:col-span-4";
        if (tamanho === "grande") return "md:col-span-2 xl:col-span-3";
        if (tamanho === "medio") return "md:col-span-2";
        return "";
    };

    const mover = (setLista, chave, direcao) => {
        setLista((atual) => {
            const base = [...atual];
            const indice = base.indexOf(chave);
            const novoIndice = indice + direcao;
            if (indice < 0 || novoIndice < 0 || novoIndice >= base.length) return atual;
            [base[indice], base[novoIndice]] = [base[novoIndice], base[indice]];
            return base;
        });
    };

    const prepararArrasteAuditoria = (evento) => {
        if (evento?.dataTransfer) {
            evento.dataTransfer.effectAllowed = "move";
            evento.dataTransfer.setData("text/plain", "mover");
        }
    };

    const moverItemArrastado = (lista, origem, destino) => {
        if (!origem || origem === destino) return lista;
        const base = [...lista];
        const indiceOrigem = base.indexOf(origem);
        const indiceDestino = base.indexOf(destino);
        if (indiceOrigem < 0 || indiceDestino < 0) return lista;
        const [removido] = base.splice(indiceOrigem, 1);
        base.splice(indiceDestino, 0, removido);
        return base;
    };

    const soltarCartaAuditoria = (destino) => {
        if (!cartaArrastandoAuditoria) return;
        setOrdemCartas((atual) => moverItemArrastado(atual, cartaArrastandoAuditoria, destino));
        setCartaArrastandoAuditoria(null);
    };

    const soltarBlocoAuditoria = (destino) => {
        if (!blocoArrastandoAuditoria) return;
        setOrdemBlocos((atual) => moverItemArrastado(atual, blocoArrastandoAuditoria, destino));
        setBlocoArrastandoAuditoria(null);
    };

    const montarLinkQrCampo = useCallback((dados = qrFormCampo) => {
        const origem = typeof window !== "undefined" ? window.location.origin : "";
        const params = new URLSearchParams();
        const tokenPublico = String(dados.token || tokenAuditoriaCampoConfigurado).trim();
        if (tokenPublico) params.set("token", tokenPublico);
        if (dados.tipo) params.set("tipo", dados.tipo);
        if (dados.identificacao) params.set("id", dados.identificacao);
        if (dados.area) params.set("area", dados.area);
        if (dados.local) params.set("local", dados.local);
        if (dados.empresaResponsavel) params.set("empresa", dados.empresaResponsavel);
        return `${origem}/#/auditoria-campo?${params.toString()}`;
    }, [qrFormCampo, tokenAuditoriaCampoConfigurado]);

    const linkQrCampoAtual = useMemo(() => montarLinkQrCampo(qrFormCampo), [montarLinkQrCampo, qrFormCampo]);

    const carregarQrcodesCampo = useCallback(async ({ append = false } = {}) => {
        if (append) {
            setCarregandoMaisQrcodesCampo(true);
        } else {
            setCarregandoQrcodesCampo(true);
        }

        try {
            const offset = append ? qrcodesCampo.length : 0;
            const limiteBusca = limiteQrcodesCampoAtual + 1;
            const { data, error } = await supabase
                .from("auditoria_campo_qrcodes")
                .select("*")
                .neq("ativo", false)
                .order("criado_em", { ascending: false })
                .range(offset, offset + limiteBusca - 1);

            if (error) throw error;

            const registros = Array.isArray(data) ? data : [];
            const registrosVisiveis = registros.slice(0, limiteQrcodesCampoAtual);

            setQrcodesCampo((atual) => append ? [...atual, ...registrosVisiveis] : registrosVisiveis);
            setExisteMaisQrcodesCampo(registros.length > limiteQrcodesCampoAtual);
            setQrcodesCampoCarregados(true);
            setMensagemQrCampo(append ? "Mais QR Codes carregados." : "QR Codes carregados com sucesso.");
        } catch (error) {
            setMensagemQrCampo(`Não foi possível carregar os QR Codes salvos: ${error.message}`);
        } finally {
            setCarregandoQrcodesCampo(false);
            setCarregandoMaisQrcodesCampo(false);
        }
    }, [qrcodesCampo.length, limiteQrcodesCampoAtual]);

    const excluirQrCampo = async (item) => {
        if (!item) return;

        const identificacao = item.identificacao || item.codigo || "QR Code selecionado";
        const confirmar = window.confirm(
            `Deseja realmente excluir o QR Code ${identificacao}?\n\nEssa ação remove o QR Code da lista ativa e preserva o histórico de auditorias já vinculadas.`
        );

        if (!confirmar) return;

        const chaveExclusao = item.id || item.codigo || identificacao;
        setExcluindoQrCampoId(chaveExclusao);
        setMensagemQrCampo("");

        try {
            let consulta = supabase
                .from("auditoria_campo_qrcodes")
                .update({ ativo: false });

            if (item.id) {
                consulta = consulta.eq("id", item.id);
            } else if (item.codigo) {
                consulta = consulta.eq("codigo", item.codigo);
            } else {
                throw new Error("QR Code sem ID ou código para exclusão.");
            }

            const { error } = await consulta;

            if (error) throw error;

            setQrcodesCampo((atual) => atual.filter((qr) => {
                if (item.id) return qr.id !== item.id;
                return qr.codigo !== item.codigo;
            }));
            setMensagemQrCampo(`QR Code ${identificacao} removido da lista ativa com sucesso. O histórico de auditorias foi preservado.`);
        } catch (error) {
            setMensagemQrCampo(`Erro ao excluir QR Code: ${error.message}`);
        } finally {
            setExcluindoQrCampoId(null);
        }
    };

    const salvarQrCampo = async () => {
        const identificacao = String(qrFormCampo.identificacao || "").trim();
        const tokenPublicoQrCampo = String(qrFormCampo.token || tokenAuditoriaCampoConfigurado || "").trim();

        if (!identificacao) {
            setMensagemQrCampo("Informe a identificação do item. Ex.: GERADOR-01, CONTAINER-02, BANHEIRO-01.");
            return;
        }

        if (!tokenPublicoQrCampo) {
            setMensagemQrCampo("Não foi possível gerar/salvar QR Code: informe o token público ativo do Supabase em Configurações ou no campo Token público cadastrado.");
            return;
        }

        const tipo = obterTipoAuditoriaCampoDireta(qrFormCampo.tipo);
        const dadosQrCampo = { ...qrFormCampo, token: tokenPublicoQrCampo };
        const payload = {
            codigo: `${tipo.valor}-${identificacao}`.toUpperCase().replace(/[^A-Z0-9_-]+/g, "-"),
            tipo: tipo.valor,
            tipo_label: tipo.label,
            identificacao,
            area: String(qrFormCampo.area || "").trim() || null,
            local: String(qrFormCampo.local || "").trim() || null,
            empresa_responsavel: String(qrFormCampo.empresaResponsavel || "").trim() || null,
            token_publico: tokenPublicoQrCampo,
            link: montarLinkQrCampo(dadosQrCampo),
            observacao: String(qrFormCampo.observacao || "").trim() || null,
            ativo: true,
            criado_por: null,
        };

        try {
            const { data, error } = await supabase
                .from("auditoria_campo_qrcodes")
                .upsert(payload, { onConflict: "codigo" })
                .select()
                .single();

            if (error) throw error;
            setQrcodesCampo((atual) => [data, ...atual.filter((item) => item.codigo !== data.codigo)]);
            setQrcodesCampoCarregados(true);
            setMensagemQrCampo("QR Code salvo com sucesso no banco de dados.");
        } catch (error) {
            setMensagemQrCampo(`Erro ao salvar QR Code: ${error.message}`);
        }
    };

    const escaparTextoImpressaoQr = (valor) =>
        String(valor || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

    const montarHtmlImpressaoQrCampo = ({ titulo = "", qrHtml = "" } = {}) => {
        const tituloImpressao = escaparTextoImpressaoQr(String(titulo || "QR Code de campo").trim().toUpperCase());
        const conteudoQr = qrHtml || "<p class=\"aviso\">QR Code indisponível para impressão.</p>";

        return `<!doctype html>
<html>
<head>
    <meta charset="utf-8" />
    <title>${tituloImpressao}</title>
    <style>
        @page { size: auto; margin: 14mm; }
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; }
        body {
            min-height: 100vh;
            font-family: Arial, Helvetica, sans-serif;
            color: #020617;
            background: #ffffff;
            text-align: center;
        }
        .etiqueta {
            display: inline-flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;
            gap: 18px;
            width: 100%;
            max-width: 420px;
            padding: 8px;
        }
        .titulo {
            margin: 0;
            color: #020617;
            font-size: 28px;
            font-weight: 900;
            line-height: 1.1;
            letter-spacing: 0.04em;
            text-transform: uppercase;
            overflow-wrap: anywhere;
        }
        .qr {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 0;
            background: #ffffff;
        }
        .qr svg {
            width: 270px;
            height: 270px;
        }
        .aviso {
            margin: 0;
            color: #64748b;
            font-size: 14px;
            font-weight: 700;
        }
        @media print {
            body { padding: 0; }
            .etiqueta { gap: 16px; max-width: none; }
            .titulo { font-size: 26px; }
            .qr svg { width: 260px; height: 260px; }
        }
    </style>
</head>
<body>
    <main class="etiqueta">
        <h1 class="titulo">${tituloImpressao}</h1>
        <div class="qr">${conteudoQr}</div>
    </main>
</body>
</html>`;
    };

    const imprimirQrCampoAtual = () => {
        const elementoQr = document.querySelector("#qr-auditoria-campo-para-impressao svg");
        const qrHtml = elementoQr?.outerHTML || "";
        const identificacao = qrFormCampo.identificacao || "Identificação pendente";
        const janela = window.open("", "_blank", "width=720,height=760");

        if (!janela) {
            setMensagemQrCampo("O navegador bloqueou a janela de impressão. Libere pop-ups para imprimir o QR Code.");
            return;
        }

        janela.document.write(montarHtmlImpressaoQrCampo({ titulo: identificacao, qrHtml }));
        janela.document.close();
        janela.focus();
        janela.print();
    };

    const chaveQrCampoSalvo = (item) =>
        String(item?.id || item?.codigo || item?.identificacao || "qr-campo")
            .replace(/[^a-zA-Z0-9_-]+/g, "-")
            .slice(0, 80);

    const imprimirQrCampoSalvo = (item) => {
        if (!item) return;

        const chave = chaveQrCampoSalvo(item);
        const elementoQr = document.querySelector(`[data-qrcode-campo-id="${chave}"] svg`);
        const qrHtml = elementoQr?.outerHTML || "";
        const identificacao = item.identificacao || item.codigo || "QR Code de campo";
        const janela = window.open("", "_blank", "width=720,height=760");

        if (!janela) {
            setMensagemQrCampo("O navegador bloqueou a janela de impressão. Libere pop-ups para imprimir o QR Code salvo.");
            return;
        }

        janela.document.write(montarHtmlImpressaoQrCampo({ titulo: identificacao, qrHtml }));
        janela.document.close();
        janela.focus();
        janela.print();
    };

    const tiposFiltroQrcodesCampo = useMemo(() => {
        const tipos = qrcodesCampo.reduce((acc, item) => {
            const valor = item.tipo || "sem_tipo";
            const label = item.tipo_label || item.tipo || "Sem tipo";

            if (!acc.some((opcao) => opcao.valor === valor)) {
                acc.push({ valor, label });
            }

            return acc;
        }, []);

        return tipos.sort((a, b) => a.label.localeCompare(b.label));
    }, [qrcodesCampo]);

    const qrcodesCampoFiltrados = useMemo(() => {
        const termo = normalizarTextoBusca(buscaQrCampoSalvo);

        return qrcodesCampo.filter((item) => {
            const tipoConfere = filtroTipoQrCampoSalvo === "todos" || String(item.tipo || "") === filtroTipoQrCampoSalvo;
            const textoBusca = normalizarTextoBusca([
                item.codigo,
                item.tipo,
                item.tipo_label,
                item.identificacao,
                item.area,
                item.local,
                item.empresa_responsavel,
                item.observacao,
                item.link,
            ].filter(Boolean).join(" "));

            return tipoConfere && (!termo || textoBusca.includes(termo));
        });
    }, [qrcodesCampo, buscaQrCampoSalvo, filtroTipoQrCampoSalvo]);

    const limparFiltrosQrcodesCampo = () => {
        setBuscaQrCampoSalvo("");
        setFiltroTipoQrCampoSalvo("todos");
    };

    const dadosResumoVisualAuditoria = useMemo(() => {
        const total = auditoriasNormalizadas.length || 1;
        const porStatus = Object.values(auditoriasNormalizadas.reduce((acc, item) => {
            const chave = item.statusAuditoria || item.statusDesvio || "Sem status";
            if (!acc[chave]) acc[chave] = { label: chave, total: 0 };
            acc[chave].total += 1;
            return acc;
        }, {})).sort((a, b) => b.total - a.total).slice(0, 5);
        const porTipo = Object.values(auditoriasNormalizadas.reduce((acc, item) => {
            const alvo = identificarAlvoAuditoriaCampo(item);
            const chave = item.categoriaDesvioPrincipal || item.tipoAuditoria || alvo.tipo || "Sem categoria";
            if (!acc[chave]) acc[chave] = { label: chave, total: 0 };
            acc[chave].total += 1;
            return acc;
        }, {})).sort((a, b) => b.total - a.total).slice(0, 5);
        const porRisco = ["Baixo", "Médio", "Alto", "Crítico"].map((risco) => ({
            label: risco,
            total: auditoriasNormalizadas.filter((item) => normalizarTextoBusca(item.grauRisco) === normalizarTextoBusca(risco)).length,
        })).filter((item) => item.total > 0);
        return { total, porStatus, porTipo, porRisco };
    }, [auditoriasNormalizadas]);

    const renderBarraResumoAuditoria = (item, total, classe = "bg-blue-500") => {
        const percentual = total ? Math.round((item.total / total) * 100) : 0;
        return (
            <div key={item.label} className="space-y-1.5 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
                <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-bold text-slate-700">{item.label}</span>
                    <span className="font-black text-slate-950">{item.total}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white ring-1 ring-slate-100">
                    <div className={classNames("h-full rounded-full", classe)} style={{ width: `${Math.max(percentual, item.total > 0 ? 6 : 0)}%` }} />
                </div>
            </div>
        );
    };

    const blocoWrapper = (chave, titulo, subtitulo, children) => {
        const recolhido = Boolean(blocosRecolhidos[chave]);
        return (
            <Card className={classeTamanho(tamanhosBlocos[chave])}>
                <div className="flex items-start justify-between gap-2">
                    <div>
                        <h2 className="text-lg font-bold text-slate-950">{titulo}</h2>
                        <p className="mt-1 text-sm text-slate-500">{subtitulo}</p>
                    </div>
                    <button type="button" onClick={() => setBlocosRecolhidos((atual) => ({ ...atual, [chave]: !atual[chave] }))} className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100">
                        {recolhido ? "Abrir" : "Recolher"}
                    </button>
                </div>
                {!recolhido && <div className="mt-4">{children}</div>}
            </Card>
        );
    };

    const renderBloco = (chave) => {
        if (chave === "historico") {
            const atualizarFiltro = (campo, valor) => setFiltrosAuditoriaCampo((atual) => ({ ...atual, [campo]: valor }));
            const renderSelectFiltro = (campo, label, opcoes = []) => (
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
                    {label}
                    <select
                        value={filtrosAuditoriaCampo[campo]}
                        onChange={(evento) => atualizarFiltro(campo, evento.target.value)}
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm normal-case tracking-normal text-slate-700 outline-none focus:ring-2 focus:ring-blue-100"
                    >
                        <option value="todos">Todos</option>
                        {opcoes.map((opcao) => <option key={opcao} value={opcao}>{opcao}</option>)}
                    </select>
                </label>
            );

            return blocoWrapper(chave, "Histórico de auditorias", "Filtre, abra e acompanhe os registros de campo por área, máquina, empresa e responsável.", (
                <div className="space-y-4">
                    <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-xs font-black uppercase tracking-wide text-slate-500">Buscar auditoria</p>
                                <p className="mt-1 text-xs text-slate-500">Use filtros para localizar auditorias por número, empresa, auditor, risco ou status.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setBuscarAuditoriaRecolhido((valor) => !valor)}
                                className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-xs font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                            >
                                {buscarAuditoriaRecolhido ? "Abrir filtros" : "Recolher filtros"}
                            </button>
                        </div>

                        {!buscarAuditoriaRecolhido && (
                            <>
                                <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-end">
                                    <label className="block flex-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                                        Buscar auditoria
                                        <input
                                            value={filtrosAuditoriaCampo.busca}
                                            onChange={(evento) => atualizarFiltro("busca", evento.target.value)}
                                            placeholder="Número, área, máquina, empresa, auditor ou responsável"
                                            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm normal-case tracking-normal text-slate-700 outline-none focus:ring-2 focus:ring-blue-100"
                                        />
                                    </label>
                                    <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 lg:w-56">
                                        Período / destaque
                                        <select
                                            value={filtrosAuditoriaCampo.periodo}
                                            onChange={(evento) => atualizarFiltro("periodo", evento.target.value)}
                                            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm normal-case tracking-normal text-slate-700 outline-none focus:ring-2 focus:ring-blue-100"
                                        >
                                            <option value="todos">Todas</option>
                                            <option value="mes">Auditorias do mês</option>
                                            <option value="criticas">Críticas / ação imediata</option>
                                            <option value="vencidas">Vencidas</option>
                                        </select>
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setFiltrosAuditoriaCampo({ busca: "", periodo: "todos", tipo: "todos", empresa: "todos", auditor: "todos", status: "todos", risco: "todos" })}
                                        className="rounded-2xl bg-white px-4 py-2 text-sm font-bold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"
                                    >
                                        Limpar filtros
                                    </button>
                                </div>
                                <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                                    {renderSelectFiltro("tipo", "Tipo", opcoesFiltroAuditoriaCampo.tipos)}
                                    {renderSelectFiltro("empresa", "Empresa", opcoesFiltroAuditoriaCampo.empresas)}
                                    {renderSelectFiltro("auditor", "Auditor", opcoesFiltroAuditoriaCampo.auditores)}
                                    {renderSelectFiltro("status", "Status", opcoesFiltroAuditoriaCampo.status)}
                                    {renderSelectFiltro("risco", "Risco", opcoesFiltroAuditoriaCampo.riscos)}
                                </div>
                            </>
                        )}

                        <p className="mt-3 text-xs font-semibold text-slate-500">
                            Mostrando {auditoriasFiltradas.length} de {auditoriasNormalizadas.length} auditoria(s).
                        </p>
                    </div>

                    {auditoriasFiltradas.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">Nenhuma auditoria de campo encontrada com os filtros aplicados.</div>
                    ) : auditoriasFiltradas.slice(0, quantidadeHistoricoVisivel).map((item) => {
                        const alvo = identificarAlvoAuditoriaCampo(item);
                        const fotos = fotosAuditoriaCampo(item);
                        const temFotos = Boolean(fotos.antes || fotos.depois);
                        const chaveAuditoria = String(item.id || item.numeroAuditoria || `${alvo.titulo}-${item.createdAt}`);
                        const aberta = Boolean(auditoriasHistoricoAbertas[chaveAuditoria]);
                        const statusAtual = item.statusAuditoria || item.statusDesvio || "Não informado";
                        const contatoEmail = String(item.emailResponsavel || item.notificacao?.emailResponsavel || "").trim();
                        const contatoWhatsapp = String(item.whatsappResponsavel || item.notificacao?.whatsappResponsavel || "").replace(/\D/g, "");
                        const empresaDestaque = item.empresaNome || item.empresaResponsavel || "Empresa não informada";
                        const auditorDestaque = item.auditorNome || "Auditor não informado";
                        const normalizarComparacaoAuditoria = (valor) => String(valor || "")
                            .normalize("NFD")
                            .replace(/[\u0300-\u036f]/g, "")
                            .trim()
                            .toLowerCase();
                        const descricaoAlvoLimpa = alvo.descricao && normalizarComparacaoAuditoria(alvo.descricao) !== normalizarComparacaoAuditoria(empresaDestaque)
                            ? alvo.descricao
                            : "";
                        const mensagemEnvioAuditoria = montarMensagemFluidaAuditoriaCampo(item, alvo);
                        const assuntoEnvioAuditoria = item.notificacao?.titulo || item.titulo || `Auditoria ${item.numeroAuditoria || "de campo"}`;
                        const linkEnviarAuditoria = contatoEmail
                            ? `mailto:${contatoEmail}?subject=${encodeURIComponent(assuntoEnvioAuditoria)}&body=${encodeURIComponent(mensagemEnvioAuditoria)}`
                            : contatoWhatsapp
                                ? `https://wa.me/${contatoWhatsapp}?text=${encodeURIComponent(mensagemEnvioAuditoria)}`
                                : "";

                        return (
                            <div key={chaveAuditoria} className="overflow-hidden rounded-3xl bg-white ring-1 ring-slate-200 shadow-sm">
                                <div className="border-b border-slate-100 bg-slate-50/80 p-4">
                                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                {item.numeroAuditoria && <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">{item.numeroAuditoria}</span>}
                                                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 ring-1 ring-blue-100">{alvo.tipo}</span>
                                                {item.grauRisco && <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700 ring-1 ring-orange-100">Risco: {item.grauRisco}</span>}
                                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-200">Status: {statusAtual}</span>
                                                {item.categoriaDesvioPrincipal && <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 ring-1 ring-indigo-100">Categoria: {item.categoriaDesvioPrincipal}</span>}
                                            </div>
                                            <h3 className="mt-3 text-base font-black text-slate-950">{alvo.titulo}</h3>
                                            {descricaoAlvoLimpa && <p className="mt-1 text-xs font-medium text-slate-500">{descricaoAlvoLimpa}</p>}
                                            <div className="mt-3 space-y-1.5 text-sm">
                                                <p className="font-black text-slate-900">{empresaDestaque}</p>
                                                <p className="font-bold text-slate-700">Auditor: {auditorDestaque}</p>
                                                <p className="text-xs font-semibold text-slate-400">{formatarDataHora(item.createdAt)}</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center lg:flex-col lg:items-end">
                                            <span className={classNames("w-fit rounded-full px-3 py-1 text-xs font-bold ring-1", classeClassificacaoAuditoriaCampo(item.classificacao))}>
                                                {item.classificacao || "Sem classificação"} · {item.pontuacao}%
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => setAuditoriasHistoricoAbertas((atual) => ({ ...atual, [chaveAuditoria]: !atual[chaveAuditoria] }))}
                                                className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                                            >
                                                {aberta ? "Recolher auditoria" : "Abrir auditoria"}
                                            </button>
                                            {linkEnviarAuditoria ? (
                                                <a
                                                    href={linkEnviarAuditoria}
                                                    target={contatoWhatsapp && !contatoEmail ? "_blank" : undefined}
                                                    rel={contatoWhatsapp && !contatoEmail ? "noreferrer" : undefined}
                                                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800"
                                                >
                                                    <Send className="h-3.5 w-3.5" />
                                                    Enviar auditoria
                                                </a>
                                            ) : (
                                                <button type="button" disabled className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-400">
                                                    <Send className="h-3.5 w-3.5" />
                                                    Sem contato
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {aberta && (
                                    <>
                                        <div className="grid gap-3 p-4 lg:grid-cols-4">
                                            <div className="rounded-2xl bg-blue-50 p-3 ring-1 ring-blue-100">
                                                <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Tipo</p>
                                                <p className="mt-2 text-sm font-bold text-blue-950">{item.tipoAuditoria || alvo.tipo}</p>
                                            </div>
                                            <div className="rounded-2xl bg-orange-50 p-3 ring-1 ring-orange-100">
                                                <p className="text-xs font-bold uppercase tracking-wide text-orange-700">Grau de risco</p>
                                                <p className="mt-2 text-sm font-bold text-orange-950">{item.grauRisco || "Não informado"}</p>
                                            </div>
                                            <div className="rounded-2xl bg-emerald-50 p-3 ring-1 ring-emerald-100">
                                                <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Resultado</p>
                                                <p className="mt-2 text-sm font-bold text-emerald-950">{item.classificacao || "Sem classificação"} ({item.pontuacao || 0}%)</p>
                                            </div>
                                            <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
                                                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Empresa</p>
                                                <p className="mt-2 text-sm font-bold text-slate-900">{item.empresaNome || item.empresaResponsavel || "Não informada"}</p>
                                            </div>
                                        </div>

                                        <div className="grid gap-3 px-4 pb-4 lg:grid-cols-3">
                                            <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100 lg:col-span-2">
                                                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Situação encontrada</p>
                                                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{item.situacaoEncontrada || item.observacao || "Situação não informada."}</p>
                                            </div>
                                            <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
                                                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Tratativa</p>
                                                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{item.acaoRecomendada || "Ação recomendada não informada."}</p>
                                                <p className="mt-2 text-xs text-slate-500">Responsável: {item.responsavelTratativa || "Não informado"}</p>
                                                <p className="text-xs text-slate-500">Prazo: {item.prazoAdequacao ? formatDate(item.prazoAdequacao) : "Não informado"}</p>
                                                <p className="text-xs text-slate-500">Status: {statusAtual}</p>
                                            </div>
                                        </div>

                                        {temFotos && (
                                            <div className="px-4 pb-4">
                                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                                                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Fotos da auditoria</p>
                                                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                                        <FotoAuditoriaPreview url={fotos.antes} label="Foto antes" />
                                                        <FotoAuditoriaPreview url={fotos.depois} label="Foto depois" />
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <div className="border-t border-slate-100 px-4 pb-4 pt-4">
                                            <EditorNotificacaoHistoricoAuditoria auditoria={{ ...item, emailResponsavel: contatoEmail, whatsappResponsavel: contatoWhatsapp }} onAtualizada={onAuditoriaAtualizada} />
                                        </div>
                                    </>
                                )}
                            </div>
                        );
                    })}

                    {auditoriasFiltradas.length > 0 && (
                        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center">
                            <p className="text-xs font-semibold text-slate-500">
                                Histórico exibindo {Math.min(quantidadeHistoricoVisivel, auditoriasFiltradas.length)} de {auditoriasFiltradas.length} auditoria(s) filtrada(s).
                                {existeMaisAuditoriasCampo ? " Existem registros antigos disponíveis no banco." : " Todo o lote carregado já está disponível."}
                            </p>
                            <div className="mt-3 flex flex-wrap justify-center gap-2">
                                {quantidadeHistoricoVisivel < auditoriasFiltradas.length && (
                                    <button
                                        type="button"
                                        onClick={() => setQuantidadeHistoricoVisivel((valor) => valor + 30)}
                                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                                    >
                                        Mostrar mais na tela
                                    </button>
                                )}
                                {existeMaisAuditoriasCampo && (
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            await onCarregarMaisAuditoriasCampo?.();
                                            setQuantidadeHistoricoVisivel((valor) => valor + 30);
                                        }}
                                        disabled={carregandoMaisAuditoriasCampo}
                                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        <RefreshCw className={classNames("h-4 w-4", carregandoMaisAuditoriasCampo ? "animate-spin" : "")} />
                                        {carregandoMaisAuditoriasCampo ? "Carregando..." : "Carregar mais auditorias"}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            ));
        }
        if (chave === "resumoVisual") {
            const tabelaResumo = [
                ...dadosResumoVisualAuditoria.porStatus.map((item) => ({ ...item, grupo: "Status" })),
                ...dadosResumoVisualAuditoria.porTipo.map((item) => ({ ...item, grupo: "Tipo / categoria" })),
                ...dadosResumoVisualAuditoria.porRisco.map((item) => ({ ...item, grupo: "Risco" })),
            ].slice(0, 12);

            return blocoWrapper(chave, "Resumo visual das auditorias", "Distribuição por status, categoria padronizada e grau de risco para leitura gerencial.", (
                <div className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-3">
                        <div className="rounded-3xl bg-slate-950 p-4 text-white shadow-sm">
                            <p className="text-xs font-black uppercase tracking-wide text-slate-300">Total analisado</p>
                            <p className="mt-2 text-3xl font-black">{auditoriasNormalizadas.length}</p>
                            <p className="mt-1 text-xs text-slate-300">auditoria(s) no histórico</p>
                        </div>
                        <div className="rounded-3xl bg-red-50 p-4 ring-1 ring-red-100">
                            <p className="text-xs font-black uppercase tracking-wide text-red-600">Críticas / ação imediata</p>
                            <p className="mt-2 text-3xl font-black text-red-700">{auditoriasCriticas}</p>
                            <p className="mt-1 text-xs text-red-600">priorizar acompanhamento</p>
                        </div>
                        <div className="rounded-3xl bg-orange-50 p-4 ring-1 ring-orange-100">
                            <p className="text-xs font-black uppercase tracking-wide text-orange-600">Vencidas</p>
                            <p className="mt-2 text-3xl font-black text-orange-700">{auditoriasVencidas}</p>
                            <p className="mt-1 text-xs text-orange-600">fora do prazo de adequação</p>
                        </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-3">
                        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                            <p className="text-xs font-black uppercase tracking-wide text-slate-400">Por status</p>
                            <div className="mt-3 space-y-2">
                                {dadosResumoVisualAuditoria.porStatus.length === 0 ? <p className="text-sm text-slate-500">Sem dados.</p> : dadosResumoVisualAuditoria.porStatus.map((item) => renderBarraResumoAuditoria(item, dadosResumoVisualAuditoria.total, "bg-emerald-500"))}
                            </div>
                        </div>
                        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                            <p className="text-xs font-black uppercase tracking-wide text-slate-400">Por categoria</p>
                            <div className="mt-3 space-y-2">
                                {dadosResumoVisualAuditoria.porTipo.length === 0 ? <p className="text-sm text-slate-500">Sem dados.</p> : dadosResumoVisualAuditoria.porTipo.map((item) => renderBarraResumoAuditoria(item, dadosResumoVisualAuditoria.total, "bg-blue-500"))}
                            </div>
                        </div>
                        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                            <p className="text-xs font-black uppercase tracking-wide text-slate-400">Por risco</p>
                            <div className="mt-3 space-y-2">
                                {dadosResumoVisualAuditoria.porRisco.length === 0 ? <p className="text-sm text-slate-500">Sem dados.</p> : dadosResumoVisualAuditoria.porRisco.map((item) => renderBarraResumoAuditoria(item, dadosResumoVisualAuditoria.total, normalizarTextoBusca(item.label).includes("crit") ? "bg-red-500" : normalizarTextoBusca(item.label).includes("alto") ? "bg-orange-500" : normalizarTextoBusca(item.label).includes("medio") ? "bg-amber-500" : "bg-emerald-500"))}
                            </div>
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                                <tr>
                                    <th className="px-4 py-3">Grupo</th>
                                    <th className="px-4 py-3">Item</th>
                                    <th className="px-4 py-3 text-right">Qtd.</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {tabelaResumo.length === 0 ? (
                                    <tr><td colSpan="3" className="px-4 py-5 text-center text-slate-500">Nenhuma auditoria registrada.</td></tr>
                                ) : tabelaResumo.map((item) => (
                                    <tr key={`${item.grupo}-${item.label}`}>
                                        <td className="px-4 py-3 text-slate-500">{item.grupo}</td>
                                        <td className="px-4 py-3 font-bold text-slate-900">{item.label}</td>
                                        <td className="px-4 py-3 text-right font-black text-slate-950">{item.total}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ));
        }

        if (chave === "qrcodes") {
            const tipoSelecionado = obterTipoAuditoriaCampoDireta(qrFormCampo.tipo);
            return blocoWrapper(chave, "QR Codes de campo", "Crie, imprima e consulte QR Codes específicos para máquinas, equipamentos, containers, banheiros e pontos fixos.", (
                <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
                    <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
                        <div className="grid gap-3 md:grid-cols-2">
                            <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
                                Tipo
                                <select value={qrFormCampo.tipo} onChange={(e) => setQrFormCampo((atual) => ({ ...atual, tipo: e.target.value }))} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm normal-case tracking-normal outline-none focus:ring-2 focus:ring-blue-100">
                                    {tiposAuditoriaCampoDireta.map((tipo) => <option key={tipo.valor} value={tipo.valor}>{tipo.label}</option>)}
                                </select>
                            </label>
                            <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
                                Identificação
                                <input value={qrFormCampo.identificacao} onChange={(e) => setQrFormCampo((atual) => ({ ...atual, identificacao: e.target.value }))} placeholder="Ex.: GERADOR-01" className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm normal-case tracking-normal outline-none focus:ring-2 focus:ring-blue-100" />
                            </label>
                            <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
                                Área
                                <input value={qrFormCampo.area} onChange={(e) => setQrFormCampo((atual) => ({ ...atual, area: e.target.value }))} placeholder="Ex.: Pátio de máquinas" className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm normal-case tracking-normal outline-none focus:ring-2 focus:ring-blue-100" />
                            </label>
                            <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
                                Local
                                <input value={qrFormCampo.local} onChange={(e) => setQrFormCampo((atual) => ({ ...atual, local: e.target.value }))} placeholder="Ex.: Avenida 1" className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm normal-case tracking-normal outline-none focus:ring-2 focus:ring-blue-100" />
                            </label>
                            <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 md:col-span-2">
                                Empresa responsável
                                <input
                                    list="empresas-cadastradas-qr-campo"
                                    value={qrFormCampo.empresaResponsavel}
                                    onChange={(e) => setQrFormCampo((atual) => ({ ...atual, empresaResponsavel: e.target.value }))}
                                    placeholder={carregandoEmpresasQrCampo ? "Carregando empresas cadastradas..." : "Selecione ou digite a empresa responsável"}
                                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm normal-case tracking-normal outline-none focus:ring-2 focus:ring-blue-100"
                                />
                                <datalist id="empresas-cadastradas-qr-campo">
                                    {empresasQrCampoOpcoes.map((empresa) => (
                                        <option key={empresa.id || empresa.nome} value={empresa.nome} />
                                    ))}
                                </datalist>
                                <span className="mt-1 block text-[11px] font-medium normal-case tracking-normal text-slate-400">
                                    {carregandoEmpresasQrCampo
                                        ? "Buscando empresas cadastradas no sistema..."
                                        : empresasQrCampoOpcoes.length > 0
                                            ? `${empresasQrCampoOpcoes.length} empresa(s) cadastrada(s) disponível(is) para seleção.`
                                            : "Nenhuma empresa cadastrada carregada. Você ainda pode digitar manualmente."}
                                </span>
                                {mensagemEmpresasQrCampo && (
                                    <span className="mt-1 block text-[11px] font-bold normal-case tracking-normal text-amber-600">{mensagemEmpresasQrCampo}</span>
                                )}
                            </label>
                            <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 md:col-span-2">
                                Token público cadastrado no Supabase
                                <input value={qrFormCampo.token} onChange={(e) => setQrFormCampo((atual) => ({ ...atual, token: e.target.value }))} placeholder="Cole o token público ativo da tabela auditoria_tokens_publicos" className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm normal-case tracking-normal outline-none focus:ring-2 focus:ring-blue-100" />
                                <span className="mt-1 block text-[11px] font-medium normal-case tracking-normal text-slate-400">Token operacional vindo de Configurações. Ele também precisa existir e estar ativo no Supabase.</span>
                            </label>
                            <div className="md:col-span-2 rounded-2xl bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 ring-1 ring-blue-100">
                                Token operacional configurado: {tokenAuditoriaCampoConfigurado || "Não configurado"}
                            </div>
                            <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 md:col-span-2">
                                Observação
                                <input value={qrFormCampo.observacao} onChange={(e) => setQrFormCampo((atual) => ({ ...atual, observacao: e.target.value }))} placeholder="Ex.: QR fixado no painel do equipamento" className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm normal-case tracking-normal outline-none focus:ring-2 focus:ring-blue-100" />
                            </label>
                        </div>

                        <div id="qr-auditoria-campo-para-impressao" className="mt-4 rounded-3xl bg-white p-4 text-center ring-1 ring-slate-200">
                            <div className="card">
                                <div className="mx-auto flex w-fit justify-center rounded-3xl bg-white p-4 ring-1 ring-slate-200">
                                    <QRCodeSVG value={linkQrCampoAtual} size={210} level="M" />
                                </div>
                                <h2 className="mt-4 text-lg font-black uppercase text-slate-950">{qrFormCampo.identificacao || "Identificação pendente"}</h2>
                            </div>
                        </div>

                        {mensagemQrCampo && <p className={classNames("mt-3 rounded-2xl px-3 py-2 text-xs font-bold ring-1", mensagemQrCampo.includes("Erro") || mensagemQrCampo.includes("Não foi") ? "bg-red-50 text-red-700 ring-red-200" : "bg-emerald-50 text-emerald-700 ring-emerald-200")}>{mensagemQrCampo}</p>}

                        <div className="mt-4 grid gap-2 sm:grid-cols-3">
                            <button type="button" onClick={salvarQrCampo} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-3 py-3 text-sm font-bold text-white hover:bg-slate-800"><QrCode className="h-4 w-4" />Salvar QR</button>
                            <button type="button" onClick={imprimirQrCampoAtual} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-3 py-3 text-sm font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"><Download className="h-4 w-4" />Imprimir</button>
                            <button type="button" onClick={() => navigator.clipboard?.writeText(linkQrCampoAtual)} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-50 px-3 py-3 text-sm font-bold text-blue-700 ring-1 ring-blue-200 hover:bg-blue-100">Copiar link</button>
                        </div>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-white p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <p className="text-sm font-black text-slate-950">QR Codes salvos</p>
                                <p className="text-xs text-slate-500">Consulta do banco de dados de QR Codes gerados.</p>
                            </div>
                            <button type="button" onClick={() => carregarQrcodesCampo()} disabled={carregandoQrcodesCampo} className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 ring-1 ring-slate-200 disabled:cursor-not-allowed disabled:opacity-60">{qrcodesCampoCarregados ? "Atualizar" : "Carregar QR Codes"}</button>
                        </div>

                        {qrcodesCampoCarregados && qrcodesCampo.length > 0 && (
                            <div className="mt-3 grid gap-2 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100 md:grid-cols-[1fr_220px_auto]">
                                <label className="relative block">
                                    <span className="sr-only">Pesquisar QR Code</span>
                                    <input
                                        value={buscaQrCampoSalvo}
                                        onChange={(evento) => setBuscaQrCampoSalvo(evento.target.value)}
                                        placeholder="Pesquisar por código, identificação, área, local ou empresa"
                                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 pr-9 text-sm font-semibold text-slate-700 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                                    />
                                    <Filter className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
                                </label>
                                <select
                                    value={filtroTipoQrCampoSalvo}
                                    onChange={(evento) => setFiltroTipoQrCampoSalvo(evento.target.value)}
                                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                                >
                                    <option value="todos">Todos os tipos</option>
                                    {tiposFiltroQrcodesCampo.map((tipo) => (
                                        <option key={tipo.valor} value={tipo.valor}>{tipo.label}</option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    onClick={limparFiltrosQrcodesCampo}
                                    className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                                >
                                    Limpar filtro
                                </button>
                            </div>
                        )}

                        <div className="mt-3 max-h-[520px] overflow-auto pr-1 scrollbar-discreta">
                            {carregandoQrcodesCampo ? <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">Carregando QR Codes...</p> : !qrcodesCampoCarregados ? (
                                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-4 text-center">
                                    <p className="text-sm font-bold text-slate-700">Os QR Codes salvos não são carregados automaticamente.</p>
                                    <p className="mt-1 text-xs text-slate-500">Clique em Carregar QR Codes somente quando precisar consultar a lista, mantendo o Dashboard Auditoria mais leve.</p>
                                    <button type="button" onClick={() => carregarQrcodesCampo()} className="mt-3 rounded-xl bg-slate-950 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800">Carregar QR Codes</button>
                                </div>
                            ) : qrcodesCampo.length === 0 ? <p className="rounded-2xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">Nenhum QR Code salvo ainda.</p> : (
                                <div className="space-y-2">
                                    <p className="rounded-2xl bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 ring-1 ring-blue-100">Exibindo {qrcodesCampoFiltrados.length} de {qrcodesCampo.length} QR Code(s) salvo(s).</p>
                                    {qrcodesCampoFiltrados.length === 0 ? (
                                        <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-center text-sm font-semibold text-slate-500">Nenhum QR Code encontrado com os filtros aplicados.</p>
                                    ) : qrcodesCampoFiltrados.map((item) => {
                                        const chaveQrSalvo = chaveQrCampoSalvo(item);

                                        return (
                                        <div key={item.id || item.codigo} className="grid gap-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100 sm:grid-cols-[108px_minmax(0,1fr)]">
                                            <div className="flex items-start justify-center">
                                                <div data-qrcode-campo-id={chaveQrSalvo} className="flex aspect-square w-[96px] items-center justify-center self-start rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
                                                    <QRCodeSVG value={item.link || ""} size={72} level="M" />
                                                </div>
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="rounded-full bg-slate-950 px-2 py-1 text-[10px] font-black uppercase text-white">{item.codigo || "Sem código"}</span>
                                                    <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700 ring-1 ring-blue-100">{item.tipo_label || item.tipo}</span>
                                                </div>
                                                <p className="mt-2 truncate text-sm font-black text-slate-900" title={item.identificacao}>{item.identificacao}</p>
                                                <p className="truncate text-[11px] font-medium text-slate-500" title={[item.area, item.local, item.empresa_responsavel, item.observacao].filter(Boolean).join(" · ")}>{[item.area, item.local, item.empresa_responsavel, item.observacao].filter(Boolean).join(" · ") || "Sem local vinculado"}</p>
                                                <div className="mt-3 flex flex-wrap items-center gap-1.5 xl:flex-nowrap">
                                                    <button
                                                        type="button"
                                                        onClick={() => navigator.clipboard?.writeText(item.link || "")}
                                                        className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-blue-50 px-2.5 py-2 text-[11px] font-bold text-blue-700 ring-1 ring-blue-100 hover:bg-blue-100"
                                                    >
                                                        Copiar link
                                                    </button>
                                                    <a
                                                        href={item.link || "#"}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-emerald-50 px-2.5 py-2 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-100 hover:bg-emerald-100"
                                                    >
                                                        <QrCode className="h-3.5 w-3.5" />
                                                        Abrir auditoria
                                                    </a>
                                                    <button
                                                        type="button"
                                                        onClick={() => imprimirQrCampoSalvo(item)}
                                                        className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-white px-2.5 py-2 text-[11px] font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                                                    >
                                                        <Download className="h-3.5 w-3.5" />
                                                        Imprimir
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => excluirQrCampo(item)}
                                                        disabled={excluindoQrCampoId === (item.id || item.codigo || item.identificacao)}
                                                        className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-red-50 px-2.5 py-2 text-[11px] font-bold text-red-700 ring-1 ring-red-100 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                        {excluindoQrCampoId === (item.id || item.codigo || item.identificacao) ? "Excluindo..." : "Excluir QR"}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                        );
                                    })}
                                    {existeMaisQrcodesCampo && (
                                        <button type="button" onClick={() => carregarQrcodesCampo({ append: true })} disabled={carregandoMaisQrcodesCampo} className="w-full rounded-2xl bg-white px-4 py-3 text-sm font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60">
                                            {carregandoMaisQrcodesCampo ? "Carregando mais QR Codes..." : "Carregar mais QR Codes"}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ));
        }

        if (chave === "boasPraticas") {
            return blocoWrapper(chave, "Boas práticas para DDS", "Registros positivos observados em campo para usar em DDS futuro.", (
                <div className="space-y-2">
                    {boasPraticasAuditoria.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/40 p-5 text-center text-sm text-emerald-700">Nenhuma boa prática registrada ainda.</div>
                    ) : boasPraticasAuditoria.map((item) => (
                        <div key={item.id || `${item.colaboradorNome}-${item.createdAt}-boas-praticas`} className="rounded-2xl bg-emerald-50/60 p-3 ring-1 ring-emerald-100">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
                                    <p className="text-sm font-bold text-emerald-950">{identificarAlvoAuditoriaCampo(item).titulo}</p>
                                    <p className="text-xs text-emerald-700">{identificarAlvoAuditoriaCampo(item).tipo} · {item.empresaNome || item.empresaResponsavel || "Empresa não informada"} · {formatarDataHora(item.createdAt)}</p>
                                </div>
                                <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">DDS futuro</span>
                            </div>
                            <p className="mt-2 text-sm leading-relaxed text-emerald-900">{item.boasPraticas}</p>
                        </div>
                    ))}
                </div>
            ));
        }
        if (chave === "topDesvios") {
            return blocoWrapper(chave, "Top 5 desvios", "Principais categorias de desvios registradas em campo.", (
                <div className="space-y-2">
                    {topDesvios.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">Nenhum desvio registrado.</div>
                    ) : topDesvios.map((item, index) => (
                        <div key={item.categoria} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
                            <div>
                                <p className="text-sm font-bold text-slate-950">#{index + 1} {item.categoria}</p>
                                <p className="text-xs text-slate-500">{item.abertos} aberto(s)</p>
                            </div>
                            <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700 ring-1 ring-red-200">{item.total} desvio(s)</span>
                        </div>
                    ))}
                </div>
            ));
        }
        if (chave === "empresas") {
            return blocoWrapper(chave, "Ranking por empresa", "Resumo de auditorias, desvios e média por empresa.", (
                <div className="overflow-hidden rounded-2xl border border-slate-200">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                            <tr>
                                <th className="px-4 py-3">Empresa</th>
                                <th className="px-4 py-3">Auditorias</th>
                                <th className="px-4 py-3">Média</th>
                                <th className="px-4 py-3">Desvios</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {empresasAuditoria.length === 0 ? (
                                <tr><td colSpan="4" className="px-4 py-5 text-center text-slate-500">Nenhuma empresa auditada.</td></tr>
                            ) : empresasAuditoria.map((item) => (
                                <tr key={item.empresa}>
                                    <td className="px-4 py-3 font-semibold text-slate-900">{item.empresa}</td>
                                    <td className="px-4 py-3 text-slate-600">{item.auditorias}</td>
                                    <td className="px-4 py-3 text-slate-600">{item.media}%</td>
                                    <td className="px-4 py-3 text-slate-600">{item.desvios}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ));
        }
        if (chave === "areas") {
            return blocoWrapper(chave, "Ranking por área/local", "Áreas, locais ou máquinas com mais auditorias e desvios registrados.", (
                <div className="overflow-hidden rounded-2xl border border-slate-200">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                            <tr>
                                <th className="px-4 py-3">Área / Local / Máquina</th>
                                <th className="px-4 py-3">Auditorias</th>
                                <th className="px-4 py-3">Média</th>
                                <th className="px-4 py-3">Desvios</th>
                                <th className="px-4 py-3">Risco alto/crítico</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {areasAuditoria.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-4 py-5 text-center text-slate-500">
                                        Nenhuma área auditada.
                                    </td>
                                </tr>
                            ) : areasAuditoria.map((item) => (
                                <tr key={item.area}>
                                    <td className="px-4 py-3 font-semibold text-slate-900">{item.area}</td>
                                    <td className="px-4 py-3 text-slate-600">{item.auditorias}</td>
                                    <td className="px-4 py-3 text-slate-600">{item.media}%</td>
                                    <td className="px-4 py-3 text-slate-600">{item.desvios}</td>
                                    <td className="px-4 py-3">
                                        <span className={classNames(
                                            "rounded-full px-3 py-1 text-xs font-bold ring-1",
                                            item.riscosAltos > 0
                                                ? "bg-red-50 text-red-700 ring-red-200"
                                                : "bg-emerald-50 text-emerald-700 ring-emerald-200"
                                        )}>
                                            {item.riscosAltos}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ));
        }
        return null;
    };

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Header
                titulo="Dashboard Auditoria de Campo"
                subtitulo="Indicadores, histórico e desvios das auditorias realizadas via QR Code."
                acao={(
                    <div className="flex flex-wrap items-center gap-2">
                        <button type="button" onClick={onRecarregar} className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50">
                            <RefreshCw className={classNames("h-4 w-4", carregando ? "animate-spin" : "")} />
                            Atualizar dados
                        </button>
                        <button type="button" onClick={() => setMostrarPersonalizacao((valor) => !valor)} className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50">
                            <Filter className="h-4 w-4" />
                            Personalizar painel
                        </button>
                    </div>
                )}
            />

            {erro && (
                <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 ring-1 ring-red-200">
                    Erro ao carregar auditorias de campo: {erro}
                </div>
            )}

            {mostrarPersonalizacao && (
                <div className="mb-6 grid gap-4 xl:grid-cols-2">
                    <Card>
                        <div className="mb-4 flex items-start justify-between gap-3">
                            <div>
                                <h2 className="text-base font-bold text-slate-950">1. Cartas principais</h2>
                                <p className="mt-1 text-sm text-slate-500">Escolha quais cards aparecem e o tamanho de cada indicador.</p>
                            </div>
                            <button type="button" onClick={() => { setCartasVisiveis(cartasPadrao); setTamanhosCartas(tamanhosCartasPadrao); setOrdemCartas(ordemCartasPadrao); }} className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 ring-1 ring-slate-200">Restaurar</button>
                        </div>
                        <div className="space-y-3">
                            {cartasOrdenadas.map((opcao, index) => {
                                const ativo = cartasVisiveis[opcao.chave] !== false;
                                return (
                                    <div
                                        key={opcao.chave}
                                        onDragOver={(evento) => evento.preventDefault()}
                                        onDrop={() => soltarCartaAuditoria(opcao.chave)}
                                        className={classNames(
                                            "rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200 transition",
                                            cartaArrastandoAuditoria === opcao.chave ? "opacity-60 ring-2 ring-emerald-300" : ""
                                        )}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex min-w-0 items-start gap-2">
                                                <span
                                                    draggable
                                                    onDragStart={(evento) => {
                                                        prepararArrasteAuditoria(evento);
                                                        setCartaArrastandoAuditoria(opcao.chave);
                                                    }}
                                                    onDragEnd={() => setCartaArrastandoAuditoria(null)}
                                                    className="mt-0.5 inline-flex h-7 w-7 shrink-0 cursor-grab items-center justify-center rounded-xl bg-white text-sm font-bold text-slate-500 ring-1 ring-slate-200 active:cursor-grabbing"
                                                    title="Segure e arraste para mudar a ordem"
                                                >
                                                    ☰
                                                </span>
                                                <button type="button" onClick={() => setCartasVisiveis((atual) => ({ ...atual, [opcao.chave]: !ativo }))} className="min-w-0 text-left text-sm font-bold text-slate-800">
                                                    <span className="block truncate">#{index + 1}. {opcao.label}</span>
                                                    <span className="mt-0.5 block text-xs font-medium text-slate-500">{ativo ? "Aparece no painel" : "Oculto no painel"} · arraste pelo ícone ☰</span>
                                                </button>
                                            </div>
                                            <div className="flex shrink-0 items-center gap-1">
                                                <button type="button" onClick={() => mover(setOrdemCartas, opcao.chave, -1)} disabled={index === 0} className="rounded-lg bg-white px-2 py-1 text-xs font-bold ring-1 ring-slate-200 disabled:cursor-not-allowed disabled:opacity-40">↑</button>
                                                <button type="button" onClick={() => mover(setOrdemCartas, opcao.chave, 1)} disabled={index === cartasOrdenadas.length - 1} className="rounded-lg bg-white px-2 py-1 text-xs font-bold ring-1 ring-slate-200 disabled:cursor-not-allowed disabled:opacity-40">↓</button>
                                                <button
                                                    type="button"
                                                    onClick={(evento) => {
                                                        evento.stopPropagation();
                                                        setCartasVisiveis((atual) => ({ ...atual, [opcao.chave]: !ativo }));
                                                    }}
                                                    className={classNames("rounded-full px-2 py-1 text-[10px] font-bold uppercase ring-1 transition", ativo ? "bg-emerald-50 text-emerald-700 ring-emerald-200 hover:bg-emerald-100" : "bg-white text-slate-500 ring-slate-200 hover:bg-slate-50")}
                                                    title={ativo ? "Clique para ocultar este card" : "Clique para mostrar este card"}
                                                >
                                                    {ativo ? "Visível" : "Oculto"}
                                                </button>
                                            </div>
                                        </div>
                                        {ativo && (
                                            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                                                {opcoesTamanho.map((tamanho) => (
                                                    <button key={tamanho.chave} type="button" onClick={() => setTamanhosCartas((atual) => ({ ...atual, [opcao.chave]: tamanho.chave }))} className={classNames("rounded-xl px-2 py-2 text-center text-xs font-bold ring-1", tamanhosCartas[opcao.chave] === tamanho.chave ? "bg-slate-950 text-white ring-slate-950" : "bg-white text-slate-600 ring-slate-200")}>{tamanho.label}</button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </Card>
                    <Card>
                        <div className="mb-4 flex items-start justify-between gap-3">
                            <div>
                                <h2 className="text-base font-bold text-slate-950">2. Organização dos quadros</h2>
                                <p className="mt-1 text-sm text-slate-500">Controle a ordem, o tamanho e a visibilidade dos blocos de informação.</p>
                            </div>
                            <button type="button" onClick={() => { setBlocosVisiveis(blocosPadrao); setTamanhosBlocos(tamanhosBlocosPadrao); setOrdemBlocos(ordemBlocosPadrao); }} className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 ring-1 ring-slate-200">Restaurar</button>
                        </div>
                        <div className="space-y-3">
                            {blocosOrdenados.map((opcao, index) => {
                                const ativo = blocosVisiveis[opcao.chave] !== false;
                                return (
                                    <div
                                        key={opcao.chave}
                                        onDragOver={(evento) => evento.preventDefault()}
                                        onDrop={() => soltarBlocoAuditoria(opcao.chave)}
                                        className={classNames(
                                            "rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200 transition",
                                            blocoArrastandoAuditoria === opcao.chave ? "opacity-60 ring-2 ring-blue-300" : ""
                                        )}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex min-w-0 items-start gap-2">
                                                <span
                                                    draggable
                                                    onDragStart={(evento) => {
                                                        prepararArrasteAuditoria(evento);
                                                        setBlocoArrastandoAuditoria(opcao.chave);
                                                    }}
                                                    onDragEnd={() => setBlocoArrastandoAuditoria(null)}
                                                    className="mt-0.5 inline-flex h-7 w-7 shrink-0 cursor-grab items-center justify-center rounded-xl bg-white text-sm font-bold text-slate-500 ring-1 ring-slate-200 active:cursor-grabbing"
                                                    title="Segure e arraste para mudar a posição do quadro"
                                                >
                                                    ☰
                                                </span>
                                                <button type="button" onClick={() => setBlocosVisiveis((atual) => ({ ...atual, [opcao.chave]: !ativo }))} className="min-w-0 text-left text-sm font-bold text-slate-800">
                                                    <span className="block truncate">#{index + 1}. {opcao.label}</span>
                                                    <span className="mt-0.5 block text-xs font-medium text-slate-500">{ativo ? "Aparece no painel" : "Oculto no painel"} · arraste pelo ícone ☰</span>
                                                </button>
                                            </div>
                                            <div className="flex shrink-0 items-center gap-1">
                                                <button type="button" onClick={() => mover(setOrdemBlocos, opcao.chave, -1)} disabled={index === 0} className="rounded-lg bg-white px-2 py-1 text-xs font-bold ring-1 ring-slate-200 disabled:cursor-not-allowed disabled:opacity-40">↑</button>
                                                <button type="button" onClick={() => mover(setOrdemBlocos, opcao.chave, 1)} disabled={index === blocosOrdenados.length - 1} className="rounded-lg bg-white px-2 py-1 text-xs font-bold ring-1 ring-slate-200 disabled:cursor-not-allowed disabled:opacity-40">↓</button>
                                                <button
                                                    type="button"
                                                    onClick={(evento) => {
                                                        evento.stopPropagation();
                                                        setBlocosVisiveis((atual) => ({ ...atual, [opcao.chave]: !ativo }));
                                                    }}
                                                    className={classNames("rounded-full px-2 py-1 text-[10px] font-bold uppercase ring-1 transition", ativo ? "bg-blue-50 text-blue-700 ring-blue-200 hover:bg-blue-100" : "bg-white text-slate-500 ring-slate-200 hover:bg-slate-50")}
                                                    title={ativo ? "Clique para ocultar este quadro" : "Clique para mostrar este quadro"}
                                                >
                                                    {ativo ? "Visível" : "Oculto"}
                                                </button>
                                            </div>
                                        </div>
                                        {ativo && (
                                            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                                                {opcoesTamanho.map((tamanho) => (
                                                    <button key={tamanho.chave} type="button" onClick={() => setTamanhosBlocos((atual) => ({ ...atual, [opcao.chave]: tamanho.chave }))} className={classNames("rounded-xl px-2 py-2 text-center text-xs font-bold ring-1", tamanhosBlocos[opcao.chave] === tamanho.chave ? "bg-slate-950 text-white ring-slate-950" : "bg-white text-slate-600 ring-slate-200")}>{tamanho.label}</button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </Card>
                </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                {cartasOrdenadas.filter((item) => cartasVisiveis[item.chave] !== false).map((item) => {
                    const Icon = item.icon;
                    return (
                        <Card key={item.chave} className={classNames("overflow-hidden border-dashed transition hover:border-slate-300", classeTamanho(tamanhosCartas[item.chave]))}>
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-slate-500">{item.label}</p>
                                    <p className="mt-2 break-words text-3xl font-bold text-slate-950">{item.valor}</p>
                                    <p className="mt-1 text-xs text-slate-400">{item.detalhe}</p>
                                </div>
                                <div className="shrink-0 rounded-2xl bg-slate-100 p-3 text-slate-700"><Icon className="h-4 w-4" /></div>
                            </div>
                        </Card>
                    );
                })}
            </div>

            <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                {blocosOrdenados.filter((item) => blocosVisiveis[item.chave] !== false).map((item) => (
                    <React.Fragment key={item.chave}>{renderBloco(item.chave)}</React.Fragment>
                ))}
            </div>
        </motion.div>
    );
}
