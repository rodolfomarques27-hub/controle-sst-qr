/* eslint-disable no-unused-vars */
import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import { calcularResumoDashboardSst } from "../../services/dashboardResumoService";
import {
    normalizarTextoBusca,
    diasParaVencer,
    formatDate,
    formatarBytes,
    calcularPercentualUsoStorage,
    normalizarEmailDestinatario,
} from "../../utils/sstUtils";

const CACHE_USO_STORAGE_DASHBOARD = "dashboardSstUsoStorageResumo";
const hoje = new Date();

function emailTstDaEmpresa(colaborador) {
    return normalizarEmailDestinatario(colaborador?.empresaTstEmail || "");
}

export function Dashboard({
    colaboradores = [],
    empresasBanco = [],
    documentosEmpresas = [],
    auditoria = [],
    auditoriasCampo = [],
    onSelectColab,
    onRegistrarEmailEnviado,
}) {
    const [enviandoEmail, setEnviandoEmail] = useState(false);
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

            const resumoStorage = {
                totalBytes: resumoBuckets.reduce((total, bucket) => total + bucket.bytes, 0),
                arquivos: resumoBuckets.reduce((total, bucket) => total + bucket.arquivos, 0),
                buckets: resumoBuckets.sort((a, b) => b.bytes - a.bytes),
                atualizadoEm: new Date().toISOString(),
            };

            setUsoStorageDashboard(resumoStorage);

            if (typeof window !== "undefined") {
                window.localStorage.setItem(CACHE_USO_STORAGE_DASHBOARD, JSON.stringify(resumoStorage));
            }
        } catch {
            setUsoStorageDashboard((atual) => ({ ...atual, totalBytes: 0, arquivos: 0, buckets: [] }));
        } finally {
            setCarregandoStorageDashboard(false);
        }
    }, []);

    // Etapa 71: o uso do Storage não é mais carregado automaticamente na abertura do Dashboard.
    // Isso evita varrer buckets privados no acesso inicial. Use o botão do card para atualizar sob demanda.

    const resumoDashboardSst = useMemo(() => calcularResumoDashboardSst({
        colaboradores,
        empresasBanco,
        documentosEmpresas,
        auditoria,
        auditoriasCampo,
        usoStorageDashboard,
        carregandoStorageDashboard,
        dataReferencia: hoje,
    }), [
        colaboradores,
        empresasBanco,
        documentosEmpresas,
        auditoria,
        auditoriasCampo,
        usoStorageDashboard,
        carregandoStorageDashboard,
    ]);

    const {
        indicadores,
        totalItens,
        documentosVencidos,
        documentosAVencer,
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

    const obterClasseTamanhoCartaDashboard = useCallback((chave) => {
        const tamanho = tamanhosCartasDashboard?.[chave] || "padrao";

        if (tamanho === "destaque") return "sm:col-span-2 lg:col-span-3 xl:col-span-5";
        if (tamanho === "grande") return "sm:col-span-2 lg:col-span-2 xl:col-span-3";
        if (tamanho === "medio") return "sm:col-span-2 xl:col-span-2";

        return "";
    }, [tamanhosCartasDashboard]);

    const renderCardsPrincipaisDashboard = () => (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {cardsVisiveis.map((item) => {
                const Icon = item.icon;
                const estilos = estiloCartaDashboard(item.chave) || {};
                const StatusIcon = storageStatusDashboard.statusIcon || CheckCircle2;
                const ehArmazenamento = item.chave === "armazenamentoUtilizado";

                return (
                    <div
                        key={item.chave}
                        className={`rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200 transition hover:shadow-md ${obterClasseTamanhoCartaDashboard(item.chave)}`}
                    >
                        <div className="flex items-start gap-3">
                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ring-1 ${estilos.icone || "bg-slate-50 text-slate-600 ring-slate-100"}`}>
                                <Icon className="h-5 w-5" />
                            </div>

                            <div className="min-w-0 flex-1">
                                <div className="flex min-w-0 items-start justify-between gap-2">
                                    <h3 className="break-words text-sm font-black leading-snug text-slate-950">
                                        {item.label}
                                    </h3>

                                    {ehArmazenamento && (
                                        <button
                                            type="button"
                                            onClick={carregarUsoStorageDashboard}
                                            disabled={carregandoStorageDashboard}
                                            title="Atualizar armazenamento"
                                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100 disabled:opacity-60"
                                        >
                                            <Upload className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>

                                {ehArmazenamento ? (
                                    <>
                                        <div className="mt-3 flex items-end justify-between gap-2 border-b border-slate-100 pb-2">
                                            <span className={`text-3xl font-black leading-none ${storageStatusDashboard.valorClasse || "text-slate-950"}`}>
                                                {storagePercentual}%
                                            </span>
                                            <span className="pb-0.5 text-[11px] font-bold text-slate-500">
                                                {totalStorageLabel} / {storageLimiteLabelDashboard}
                                            </span>
                                        </div>

                                        <div className="mt-2 flex items-center gap-2">
                                            <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-black ring-1 ${storageStatusDashboard.classe || "bg-slate-50 text-slate-600 ring-slate-200"}`}>
                                                <StatusIcon className="h-3 w-3" />
                                                {storageStatusDashboard.texto}
                                            </span>
                                            <div className={`h-1 flex-1 overflow-hidden rounded-full ${storageStatusDashboard.trilhoClasse || "bg-slate-100"}`}>
                                                <div
                                                    className={`h-full rounded-full ${storageStatusDashboard.barraClasse || "bg-emerald-500"}`}
                                                    style={{ width: `${Math.max(3, storagePercentual)}%` }}
                                                />
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <p className={`mt-3 border-b border-slate-100 pb-2 text-3xl font-black leading-none ${estilos.valor || "text-slate-950"}`}>
                                            {item.valor}
                                        </p>
                                        <p className="mt-2 text-xs font-medium text-slate-500">{item.detalhe}</p>
                                    </>
                                )}
                            </div>
                        </div>
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
    };


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
