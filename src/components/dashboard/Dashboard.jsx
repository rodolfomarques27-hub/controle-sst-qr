/* eslint-disable no-unused-vars */
import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
    AlertTriangle,
    BadgeCheck,
    Building2,
    CalendarClock,
    CheckCircle2,
    Eye,
    HardHat,
    Lock,
    Upload,
    UserRound,
    XCircle,
} from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { listarTodosArquivosStorage } from "../../services/supabaseServices";
import { Header } from "../commonComponents";
import { DashboardBlocosGrid } from "./DashboardBlocosGrid";
import { DashboardHeaderAcoes } from "./DashboardHeaderAcoes";
import { DashboardPreviewFiltro } from "./DashboardPreviewFiltro";
import { DashboardBlocoConteudo } from "./DashboardBlocoConteudo";
import { DashboardControles } from "./DashboardControles";
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
} from "../../constants/sstConstants";
import { baixarPDF } from "../../services/exportacaoService";
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
    classeTamanhoCartaDashboard,
    classeTamanhoBlocoDashboard,
    estiloCartaDashboard,
} from "../../services/dashboardService";
import {
    normalizarTextoBusca,
    diasParaVencer,
    formatDate,
    formatarBytes,
    calcularPercentualUsoStorage,
    normalizarEmailDestinatario,
} from "../../utils/sstUtils";

function emailTstDaEmpresa(colaborador) {
    return normalizarEmailDestinatario(colaborador?.empresaTstEmail || "");
}

export function Dashboard({
    colaboradores,
    empresasBanco = [],
    documentosEmpresas = [],
    auditoria = [],
    auditoriasCampo = [],
    onSelectColab,
    onRegistrarEmailEnviado,
}) {
    const [enviandoEmail, setEnviandoEmail] = useState(false);
    const [usoStorageDashboard, setUsoStorageDashboard] = useState({
        totalBytes: 0,
        arquivos: 0,
        buckets: [],
    });
    const [carregandoStorageDashboard, setCarregandoStorageDashboard] = useState(false);
    const [mostrarFiltroPainel, setMostrarFiltroPainel] = useState(false);
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
            const buckets = ["certificados-treinamentos", "documentos-empresas", "contratos-empresas", "logos-empresas", "fotos-colaboradores", "auditorias-campo"];
            const resumoBuckets = [];

            const listarNivel = async (bucket, prefixo = "") => {
                let data;

                try {
                    data = await listarTodosArquivosStorage(bucket, prefixo);
                } catch (error) {
                    console.warn(`Erro ao listar bucket ${bucket}:`, error.message);
                    return { bytes: 0, arquivos: 0 };
                }

                let bytes = 0;
                let arquivos = 0;

                for (const item of data || []) {
                    const caminho = prefixo ? `${prefixo}/${item.name}` : item.name;
                    const pareceArquivo = item.name && /\.[a-z0-9]{2,5}$/i.test(item.name);

                    if (pareceArquivo) {
                        bytes += Number(item.metadata?.size || 0);
                        arquivos += 1;
                    } else {
                        const sub = await listarNivel(bucket, caminho);
                        bytes += sub.bytes;
                        arquivos += sub.arquivos;
                    }
                }

                return { bytes, arquivos };
            };

            for (const bucket of buckets) {
                const resumo = await listarNivel(bucket);

                if (resumo.arquivos > 0 || resumo.bytes > 0) {
                    resumoBuckets.push({ bucket, ...resumo });
                }
            }

            setUsoStorageDashboard({
                totalBytes: resumoBuckets.reduce((total, bucket) => total + bucket.bytes, 0),
                arquivos: resumoBuckets.reduce((total, bucket) => total + bucket.arquivos, 0),
                buckets: resumoBuckets.sort((a, b) => b.bytes - a.bytes),
            });
        } catch {
            setUsoStorageDashboard({ totalBytes: 0, arquivos: 0, buckets: [] });
        } finally {
            setCarregandoStorageDashboard(false);
        }
    }, []);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            carregarUsoStorageDashboard();
        }, 0);

        return () => window.clearTimeout(timer);
    }, [carregarUsoStorageDashboard]);

    const indicadores = useMemo(() => {
        const avaliacoes = colaboradores.map((colaborador) => {
            const avaliacao = avaliarTreinamentosColaborador(colaborador);

            return avaliacao.itens.map((item) => ({
                ...item,
                colaborador,
                vencimento: item.realizado?.vencimento || null,
            }));
        });

        const itens = avaliacoes.flat();
        const vencidos = itens.filter((item) => item.status.chave === "vencido").length;
        const vencendo = itens.filter((item) => item.status.chave === "vencendo").length;
        const pendentes = itens.filter((item) => item.status.chave === "pendente").length;
        const emDia = itens.filter((item) => ["emdia", "semvalidade"].includes(item.status.chave)).length;
        const empresas = new Set(colaboradores.map((c) => c.empresa).filter(Boolean)).size;

        return { itens, vencidos, vencendo, pendentes, emDia, empresas };
    }, [colaboradores]);

    const totalItens = indicadores.itens.length;
    const mesAtual = hoje.getMonth();
    const anoAtual = hoje.getFullYear();

    const documentosComStatus = documentosEmpresas.map((documento) => ({
        ...documento,
        status: statusEmpresaDocumento(documento.data_vencimento),
    }));

    const documentosVencidos = documentosComStatus.filter((documento) => documento.status.chave === "vencido");
    const documentosAVencer = documentosComStatus.filter((documento) => documento.status.chave === "vencendo");
    const empresasAtivas = empresasBanco.filter((empresa) => normalizarStatusEmpresa(empresa.status) === "Empresa ativa");
    const colaboradoresMobilizados = colaboradores.filter(colaboradorContaComoMobilizado);
    const colaboradoresBloqueados = colaboradores.filter((colaborador) => statusGeral(colaborador).texto === "Bloqueado").length;
    const colaboradoresEmAnalise = colaboradores.filter((colaborador) => statusGeral(colaborador).texto === "Em análise").length;
    const colaboradoresLiberados = colaboradores.filter((colaborador) => statusGeral(colaborador).texto === "Liberado").length;
    const colaboradoresComPendencia = colaboradores.filter((colaborador) => statusGeral(colaborador).texto === "Com pendência").length;
    const auditoriasMes = auditoria.filter((item) => {
        const data = item.created_at ? new Date(item.created_at) : null;
        return data && data.getMonth() === mesAtual && data.getFullYear() === anoAtual;
    }).length;
    const desviosAbertos = auditoria.filter((item) => {
        const texto = normalizarTextoBusca(`${item.acao || ""} ${item.tabela || ""} ${item.descricao || ""}`);
        return texto.includes("desvio") && !texto.includes("fechado") && !texto.includes("concluido") && !texto.includes("concluído");
    }).length;

    const auditoriasCampoNormalizadas = auditoriasCampo.map(normalizarAuditoriaCampo);
    const auditoriasCampoMes = auditoriasCampoNormalizadas.filter((item) => {
        const data = item.createdAt ? new Date(item.createdAt) : null;
        return data && data.getMonth() === mesAtual && data.getFullYear() === anoAtual;
    });
    const mediaConformidadeCampo = auditoriasCampoMes.length
        ? Math.round(auditoriasCampoMes.reduce((total, item) => total + Number(item.pontuacao || 0), 0) / auditoriasCampoMes.length)
        : 0;
    const desviosCampoAbertos = auditoriasCampoNormalizadas.filter(auditoriaCampoAberta).length;
    const desviosCampoCorrigidos = auditoriasCampoNormalizadas.filter((item) => {
        const status = normalizarTextoBusca(item.statusDesvio || "");
        return (item.totalDesvios || 0) > 0 && status.includes("corrigido");
    }).length;
    const topDesviosCampo = Object.values(
        auditoriasCampoNormalizadas.reduce((acc, item) => {
            const chave = item.categoriaDesvioPrincipal || item.desvios?.[0]?.categoria || "Desvio não classificado";
            if (!acc[chave]) acc[chave] = { categoria: chave, total: 0, abertos: 0, graves: 0 };
            acc[chave].total += Number(item.totalDesvios || 0) || 1;
            if (auditoriaCampoAberta(item)) acc[chave].abertos += 1;
            if (item.temDesvioGrave) acc[chave].graves += 1;
            return acc;
        }, {})
    ).sort((a, b) => b.total - a.total || b.graves - a.graves).slice(0, 5);

    const aniversariantesElegiveis = colaboradores.filter((colaborador) =>
        deveMostrarAniversarioColaborador(colaborador) && colaboradorContaComoMobilizado(colaborador)
    );
    const aniversariantesMes = aniversariantesElegiveis
        .filter((colaborador) => mesAniversarioColaborador(colaborador) === mesAtual + 1)
        .sort((a, b) => (diaAniversarioColaborador(a) || 99) - (diaAniversarioColaborador(b) || 99));
    const proximoAniversarioDashboard = proximoAniversariante(aniversariantesElegiveis);

    const storagePercentual = calcularPercentualUsoStorage(usoStorageDashboard.totalBytes);
    const totalStorageLabel = carregandoStorageDashboard ? "Carregando..." : formatarBytes(usoStorageDashboard.totalBytes);
    const storageLimiteBytesDashboard = Math.max(1, LIMITE_STORAGE_MB * 1024 * 1024);
    const storageLimiteLabelDashboard = formatarBytes(storageLimiteBytesDashboard).replace(".00", "");
    const storageStatusDashboard =
        storagePercentual >= 90
            ? {
                texto: "Crítico",
                detalhe: "Pouco espaço disponível",
                apoio: "Considere liberar espaço para evitar interrupções.",
                classe: "bg-red-50 text-red-700 ring-red-200",
                iconeClasse: "bg-red-50 text-red-600",
                valorClasse: "text-red-600",
                barraClasse: "bg-red-500",
                trilhoClasse: "bg-red-100",
                statusIcon: AlertTriangle,
            }
            : storagePercentual >= 70
                ? {
                    texto: "Atenção",
                    detalhe: "Acompanhe o limite do sistema",
                    apoio: "O armazenamento está subindo. Avalie arquivos grandes ou sem vínculo.",
                    classe: "bg-orange-50 text-orange-700 ring-orange-200",
                    iconeClasse: "bg-orange-50 text-orange-600",
                    valorClasse: "text-orange-600",
                    barraClasse: "bg-orange-500",
                    trilhoClasse: "bg-orange-100",
                    statusIcon: AlertTriangle,
                }
                : {
                    texto: "Normal",
                    detalhe: "Uso saudável do armazenamento",
                    apoio: "Capacidade dentro do limite configurado.",
                    classe: "bg-emerald-50 text-emerald-700 ring-emerald-200",
                    iconeClasse: "bg-emerald-50 text-emerald-600",
                    valorClasse: "text-slate-950",
                    barraClasse: "bg-emerald-500",
                    trilhoClasse: "bg-slate-100",
                    statusIcon: CheckCircle2,
                };

    const cards = [
        { chave: "colaboradoresMobilizados", label: "Colaboradores mobilizados", valor: colaboradoresMobilizados.length, icon: HardHat, detalhe: "Liberados ou com pendência" },
        { chave: "colaboradoresLiberados", label: "Colaboradores liberados", valor: colaboradoresLiberados, icon: BadgeCheck, detalhe: "Documentos em dia" },
        { chave: "comPendencia", label: "Com pendência", valor: colaboradoresComPendencia, icon: AlertTriangle, detalhe: "Sem bloqueio" },
        { chave: "emAnalise", label: "Em análise", valor: colaboradoresEmAnalise, icon: Eye, detalhe: "Aguardando conferência" },
        { chave: "empresasAtivas", label: "Empresas ativas", valor: empresasAtivas.length, icon: Building2, detalhe: "Contratadas liberadas" },
        { chave: "documentosVencidos", label: "Documentos vencidos", valor: documentosVencidos.length, icon: XCircle, detalhe: "Empresas / contratos" },
        { chave: "documentosAVencer", label: "Documentos a vencer", valor: documentosAVencer.length, icon: CalendarClock, detalhe: "Próximos 30 dias" },
        { chave: "treinamentosVencidos", label: "Treinamentos vencidos", valor: indicadores.vencidos, icon: AlertTriangle, detalhe: "Colaboradores" },
        { chave: "colaboradoresBloqueados", label: "Colaboradores bloqueados", valor: colaboradoresBloqueados, icon: Lock, detalhe: "Pendência bloqueante" },
        { chave: "desviosAbertos", label: "Desvios abertos", valor: desviosAbertos, icon: AlertTriangle, detalhe: "Registros não concluídos" },
        { chave: "aniversariantesMes", label: "Aniversariantes do mês", valor: aniversariantesMes.length, icon: UserRound, detalhe: aniversariantesMes.length > 0 ? "Quantidade no mês atual" : "Nenhum aniversariante no mês" },
        { chave: "armazenamentoUtilizado", label: "Armazenamento utilizado", valor: totalStorageLabel, icon: Upload, detalhe: `${storagePercentual}% do limite visual` },
    ];

    const cardsOrdenados = [
        ...ordemCartasDashboard
            .map((chave) => cards.find((item) => item.chave === chave))
            .filter(Boolean),
        ...cards.filter((item) => !ordemCartasDashboard.includes(item.chave)),
    ];

    const cardsVisiveis = cardsOrdenados.filter((item) => cartasVisiveisDashboard[item.chave] !== false);

    const pendencias = indicadores.itens
        .filter((item) => ["pendente", "vencido", "vencendo"].includes(item.status.chave))
        .sort((a, b) => {
            const ordem = { vencido: 1, vencendo: 2, pendente: 3 };
            const ordemStatus = ordem[a.status.chave] - ordem[b.status.chave];

            if (ordemStatus !== 0) return ordemStatus;

            if (!a.vencimento && !b.vencimento) return a.colaborador.nome.localeCompare(b.colaborador.nome);
            if (!a.vencimento) return 1;
            if (!b.vencimento) return -1;

            return diasParaVencer(a.vencimento) - diasParaVencer(b.vencimento);
        });

    const colaboradoresPorFuncao = Object.values(
        colaboradoresMobilizados.reduce((acc, colaborador) => {
            const funcao = obterFuncaoCargoColaborador(colaborador);

            if (!acc[funcao]) acc[funcao] = { funcao, quantidade: 0 };

            acc[funcao].quantidade += 1;

            return acc;
        }, {})
    ).sort((a, b) => b.quantidade - a.quantidade || a.funcao.localeCompare(b.funcao));

    const maiorQuantidadePorFuncao = Math.max(...colaboradoresPorFuncao.map((item) => item.quantidade), 1);

    const rankingPendenciasEmpresa = (() => {
        const empresasPorId = new Map();
        const chavePorNome = new Map();
        const grupos = {};

        const nomeNormalizado = (nome) => normalizarTextoBusca(nome || "Empresa não informada").trim() || "empresa-nao-informada";

        empresasBanco.forEach((empresa) => {
            const chave = empresa.id ? `id:${empresa.id}` : `nome:${nomeNormalizado(empresa.nome)}`;
            const nome = empresa.nome || "Empresa não informada";

            if (empresa.id) empresasPorId.set(String(empresa.id), empresa);
            chavePorNome.set(nomeNormalizado(nome), chave);

            if (!grupos[chave]) {
                grupos[chave] = {
                    empresa: nome,
                    totalColaboradores: 0,
                    documentosVencidos: 0,
                    documentosAVencer: 0,
                    treinamentosVencidos: 0,
                    treinamentosAVencer: 0,
                    pendenciasLeves: 0,
                    colaboradoresBloqueadosSet: new Set(),
                };
            }
        });

        const obterChaveGrupo = (empresaId, nomeEmpresa) => {
            if (empresaId) return `id:${empresaId}`;

            const nome = nomeNormalizado(nomeEmpresa);
            return chavePorNome.get(nome) || `nome:${nome}`;
        };

        const obterNomeEmpresa = (empresaId, nomeEmpresa) => {
            if (empresaId && empresasPorId.has(String(empresaId))) {
                return empresasPorId.get(String(empresaId))?.nome || nomeEmpresa || "Empresa não informada";
            }

            return nomeEmpresa || "Empresa não informada";
        };

        const obterOuCriarGrupo = (empresaId, nomeEmpresa) => {
            const chave = obterChaveGrupo(empresaId, nomeEmpresa);

            if (!grupos[chave]) {
                grupos[chave] = {
                    empresa: obterNomeEmpresa(empresaId, nomeEmpresa),
                    totalColaboradores: 0,
                    documentosVencidos: 0,
                    documentosAVencer: 0,
                    treinamentosVencidos: 0,
                    treinamentosAVencer: 0,
                    pendenciasLeves: 0,
                    colaboradoresBloqueadosSet: new Set(),
                };
            }

            return grupos[chave];
        };

        colaboradores.forEach((colaborador) => {
            const empresaId = colaborador.empresaId || colaborador.empresa_id || null;
            const nomeEmpresa = colaborador.empresaExibicao || colaborador.empresa || "Empresa não informada";
            const grupo = obterOuCriarGrupo(empresaId, nomeEmpresa);
            const chaveColaborador = colaborador.id || colaborador.codigoFuncionario || colaborador.nome;
            const classificacao = statusGeral(colaborador);

            grupo.totalColaboradores += 1;

            if (classificacao.texto === "Bloqueado" && chaveColaborador) {
                grupo.colaboradoresBloqueadosSet.add(chaveColaborador);
            } else if (["Com pendência", "Em análise"].includes(classificacao.texto)) {
                grupo.pendenciasLeves += 1;
            }
        });

        documentosEmpresas.forEach((documento) => {
            const empresaId = documento.empresa_id || documento.empresaId || null;
            const empresaBanco = empresaId ? empresasPorId.get(String(empresaId)) : null;
            const nomeEmpresa = empresaBanco?.nome || documento.empresa || documento.empresaNome || documento.nome_empresa || "Empresa não informada";
            const grupo = obterOuCriarGrupo(empresaId, nomeEmpresa);
            const status = statusEmpresaDocumento(documento.data_vencimento);

            if (status.chave === "vencido") grupo.documentosVencidos += 1;
            else if (status.chave === "vencendo") grupo.documentosAVencer += 1;
            else if (["semvencimento", "semdata"].includes(status.chave)) grupo.pendenciasLeves += 1;
        });

        indicadores.itens.forEach((item) => {
            const colaborador = item.colaborador || {};
            const empresaId = colaborador.empresaId || colaborador.empresa_id || null;
            const nomeEmpresa = colaborador.empresaExibicao || colaborador.empresa || "Empresa não informada";
            const grupo = obterOuCriarGrupo(empresaId, nomeEmpresa);
            const chaveColaborador = colaborador.id || colaborador.codigoFuncionario || colaborador.nome;

            if (item.status.chave === "vencido") {
                grupo.treinamentosVencidos += 1;
                if (chaveColaborador) grupo.colaboradoresBloqueadosSet.add(chaveColaborador);
            } else if (item.status.chave === "vencendo") {
                grupo.treinamentosAVencer += 1;
                grupo.pendenciasLeves += 1;
            } else if (item.status.chave === "pendente") {
                if (itemDocumentoCriticoColaborador(item)) {
                    if (chaveColaborador) grupo.colaboradoresBloqueadosSet.add(chaveColaborador);
                } else {
                    grupo.pendenciasLeves += 1;
                }
            }
        });

        return Object.values(grupos)
            .map((grupo) => {
                const colaboradoresBloqueados = grupo.colaboradoresBloqueadosSet.size;
                const critico = grupo.documentosVencidos > 0 || grupo.treinamentosVencidos > 0 || colaboradoresBloqueados > 0;
                const atencao = !critico && (grupo.documentosAVencer > 0 || grupo.treinamentosAVencer > 0 || grupo.pendenciasLeves > 0);
                const statusEmpresa = critico ? "Crítico" : atencao ? "Atenção" : "Regular";
                const statusEmpresaClasse = critico
                    ? "bg-red-50 text-red-700 ring-red-200"
                    : atencao
                        ? "bg-orange-50 text-orange-700 ring-orange-200"
                        : "bg-emerald-50 text-emerald-700 ring-emerald-200";
                const criticidade = critico ? 3 : atencao ? 2 : 1;
                const totalPendencias =
                    grupo.documentosVencidos +
                    grupo.documentosAVencer +
                    grupo.treinamentosVencidos +
                    grupo.treinamentosAVencer +
                    grupo.pendenciasLeves +
                    colaboradoresBloqueados;

                return {
                    empresa: grupo.empresa,
                    totalColaboradores: grupo.totalColaboradores,
                    documentosVencidos: grupo.documentosVencidos,
                    documentosAVencer: grupo.documentosAVencer,
                    treinamentosVencidos: grupo.treinamentosVencidos,
                    colaboradoresBloqueados,
                    pendenciasLeves: grupo.pendenciasLeves,
                    statusEmpresa,
                    statusEmpresaClasse,
                    criticidade,
                    totalPendencias,
                };
            })
            .filter((grupo) => grupo.totalColaboradores > 0 || grupo.totalPendencias > 0)
            .sort((a, b) =>
                b.criticidade - a.criticidade ||
                b.totalPendencias - a.totalPendencias ||
                b.documentosVencidos - a.documentosVencidos ||
                b.treinamentosVencidos - a.treinamentosVencidos ||
                b.colaboradoresBloqueados - a.colaboradoresBloqueados ||
                b.totalColaboradores - a.totalColaboradores ||
                a.empresa.localeCompare(b.empresa)
            );
    })();

    const documentosPorTipo = Object.values(
        documentosEmpresas.reduce((acc, documento) => {
            const tipo = documento.tipo_documento || "Sem tipo";

            if (!acc[tipo]) {
                acc[tipo] = {
                    tipo,
                    total: 0,
                    vencidos: 0,
                    vencendo: 0,
                    emDia: 0,
                };
            }

            const status = statusEmpresaDocumento(documento.data_vencimento);

            acc[tipo].total += 1;

            if (status.chave === "vencido") acc[tipo].vencidos += 1;
            else if (status.chave === "vencendo") acc[tipo].vencendo += 1;
            else acc[tipo].emDia += 1;

            return acc;
        }, {})
    ).sort((a, b) => b.total - a.total || a.tipo.localeCompare(b.tipo));

    const certificadosEnviados = indicadores.itens
        .filter((item) => item.realizado)
        .map((item) => ({
            origem: "Treinamento",
            nome: item.realizado?.arquivo || item.treinamento?.nome || "Certificado",
            titulo: item.treinamento?.nome || "Treinamento",
            colaborador: item.colaborador?.nome || "-",
            empresa: item.colaborador?.empresaExibicao || item.colaborador?.empresa || "-",
            data: item.realizado?.created_at || item.realizado?.realizado || item.realizado?.vencimento || "",
            status: item.status.texto,
        }));

    const documentosEmpresariaisEnviados = documentosEmpresas.map((doc) => {
        const empresa = empresasBanco.find((item) => String(item.id) === String(doc.empresa_id));

        return {
            origem: "Empresa",
            nome: doc.arquivo_nome || doc.tipo_documento || "Documento empresarial",
            titulo: doc.tipo_documento || "Documento empresarial",
            colaborador: empresa?.nome || "-",
            empresa: empresa?.nome || "-",
            data: doc.created_at || doc.data_emissao || doc.data_vencimento || "",
            status: statusEmpresaDocumento(doc.data_vencimento).texto,
        };
    });

    const ultimosDocumentosEnviados = [...certificadosEnviados, ...documentosEmpresariaisEnviados]
        .sort((a, b) => new Date(b.data || 0) - new Date(a.data || 0))
        .slice(0, 8);

    const ultimosEmailsEnviados = auditoria
        .filter((item) => normalizarTextoBusca(`${item.acao || ""} ${item.descricao || ""}`).includes("email"))
        .slice(0, 8);

    const ultimosAcessos = auditoria
        .filter((item) => normalizarTextoBusca(`${item.acao || ""} ${item.descricao || ""}`).includes("acesso"))
        .slice(0, 8);

    const alertasImportantes = [
        ...documentosVencidos.slice(0, 4).map((doc) => ({
            tipo: "Documento vencido",
            texto: `${doc.tipo_documento || "Documento"} venceu em ${formatDate(doc.data_vencimento)}`,
            classe: "bg-red-50 text-red-700 ring-red-100",
        })),
        ...pendencias.filter((item) => item.status.chave === "vencido").slice(0, 4).map((item) => ({
            tipo: "Treinamento vencido",
            texto: `${item.colaborador.nome} · ${item.treinamento.nome}`,
            classe: "bg-red-50 text-red-700 ring-red-100",
        })),
        ...pendencias.filter((item) => item.status.chave === "vencendo").slice(0, 4).map((item) => ({
            tipo: "A vencer",
            texto: `${item.colaborador.nome} · ${item.treinamento.nome} · ${formatDate(item.vencimento)}`,
            classe: "bg-orange-50 text-orange-700 ring-orange-100",
        })),
        ...(storagePercentual >= 80
            ? [{
                tipo: "Armazenamento",
                texto: `Uso estimado do Storage em ${storagePercentual}%`,
                classe: "bg-orange-50 text-orange-700 ring-orange-100",
            }]
            : []),
    ].slice(0, 8);

    const montarPayloadEmailPendencia = (item) => {
        const statusEmail =
            item.status.chave === "pendente"
                ? "FALTANTE"
                : item.status.chave === "vencendo"
                    ? "A VENCER"
                    : "VENCIDO";

        const dias = item.vencimento ? diasParaVencer(item.vencimento) : null;
        const empresa = item.colaborador?.empresaExibicao || item.colaborador?.empresa || "Empresa não informada";
        const para = emailTstDaEmpresa(item.colaborador);

        return {
            para,
            assunto: `Aviso SST - ${statusEmail} - ${item.colaborador?.nome || "Colaborador"}`,
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
                    tipoAlerta: "Pendência crítica",
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
                tipoAlerta: "Pendência crítica",
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
                tipoAlerta: "Pendência crítica",
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

    const enviarAlertasPendenciasCriticas = async () => {
        if (!pendencias.length) {
            alert("Não existem pendências críticas para enviar por e-mail.");
            return;
        }

        const semEmailTst = pendencias.filter((item) => !emailTstDaEmpresa(item.colaborador)).length;
        const confirmar = window.confirm(
            `Deseja enviar ${pendencias.length} alerta(s) por e-mail para o TST responsável de cada empresa?${semEmailTst ? `\n\nAtenção: ${semEmailTst} item(ns) estão sem e-mail de TST cadastrado e não serão enviados.` : ""}`
        );

        if (!confirmar) return;

        setEnviandoEmail(true);

        let enviados = 0;
        let falhas = 0;

        try {
            for (const item of pendencias) {
                const sucesso = await enviarAlertaEmailPendencia(item, false);

                if (sucesso) {
                    enviados += 1;
                } else {
                    falhas += 1;
                }
            }

            alert(`Envio finalizado. Enviados: ${enviados}. Falhas: ${falhas}.`);
        } finally {
            setEnviandoEmail(false);
        }
    };

    const baixarRelatorioDashboard = () => {
        const linhas = [
            ["Colaborador", "Empresa", "Função", "Situação na obra", "Status automático", "Treinamento/Documento", "Status", "Vencimento", "Base"],
        ];

        indicadores.itens.forEach((item) => {
            linhas.push([
                item.colaborador.nome,
                item.colaborador.empresaExibicao || item.colaborador.empresa,
                item.colaborador.funcao,
                item.colaborador.statusMobilizacao || obterStatusInicialColaborador(),
                statusGeral(item.colaborador).texto,
                item.treinamento.nome,
                item.status.texto,
                item.vencimento ? formatDate(item.vencimento) : "Sem certificado enviado",
                item.treinamento.base || "",
            ]);
        });

        baixarPDF("relatorio-dashboard-sst.pdf", "Relatorio Dashboard SST", linhas);
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

    const renderBlocoDashboard = (chave) => (
        <DashboardBlocoConteudo
            chave={chave}
            cardsVisiveis={cardsVisiveis}
            storageStatusDashboard={storageStatusDashboard}
            storagePercentual={storagePercentual}
            totalStorageLabel={totalStorageLabel}
            storageLimiteLabelDashboard={storageLimiteLabelDashboard}
            classeTamanhoCartaDashboard={classeTamanhoCartaDashboard}
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
            enviarAlertaEmailPendencia={enviarAlertaEmailPendencia}
            enviandoEmail={enviandoEmail}
            onSelectColab={onSelectColab}
            resumoConformidade={resumoConformidade}
            rankingPendenciasEmpresa={rankingPendenciasEmpresa}
            colaboradoresPorFuncao={colaboradoresPorFuncao}
            maiorQuantidadePorFuncao={maiorQuantidadePorFuncao}
            alertasImportantes={alertasImportantes}
            documentosPorTipo={documentosPorTipo}
            ultimosDocumentosEnviados={ultimosDocumentosEnviados}
        />
    );


    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Header
                titulo="Dashboard SST"
                subtitulo="Visão executiva dos colaboradores, empresas, documentos, treinamentos, auditoria e armazenamento."
                acao={
                    <DashboardHeaderAcoes
                        setMostrarFiltroPainel={setMostrarFiltroPainel}
                        enviarAlertasPendenciasCriticas={enviarAlertasPendenciasCriticas}
                        baixarRelatorioDashboard={baixarRelatorioDashboard}
                        enviandoEmail={enviandoEmail}
                        pendencias={pendencias}
                    />
                }
            />

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

            <DashboardBlocosGrid
                mostrarFiltroPainel={mostrarFiltroPainel}
                blocosDashboardExibidos={blocosDashboardExibidos}
                mensagemDashboardSemBlocos={mensagemDashboardSemBlocos}
                classeTamanhoBlocoDashboard={classeTamanhoBlocoDashboard}
                tamanhosBlocosDashboard={tamanhosBlocosDashboard}
                renderBlocoDashboard={renderBlocoDashboard}
            />


        </motion.div>
    );
}
