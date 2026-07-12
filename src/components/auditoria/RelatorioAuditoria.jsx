/* eslint-disable no-unused-vars */
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Activity,
    CalendarClock,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Database,
    Download,
    Filter,
    Lock,
    LogIn,
    Mail,
    PencilLine,
    RefreshCw,
    Search,
    XCircle,
} from "lucide-react";
import dashboardHeroBackground from "../../assets/dashboard-hero-sst.webp";
import { CardRecolhivel, Header } from "../commonComponents";
import { LIMITE_STORAGE_MB } from "../../constants/sstConstants";
import {
    normalizarTextoBusca,
    formatarBytes,
    calcularPercentualUsoStorage,
    classNames,
} from "../../utils/sstUtils";
import {
    auditoriaEventoHabilitado,
    carregarConfiguracaoEventosAuditoriaSistemaSupabase,
    configuracaoPadraoEventosAuditoriaSistema,
    montarEventosAuditoriaSistema,
    obterModuloAuditoriaSistemaPorRegistro,
    obterNivelAuditoriaSistemaPorRegistro,
    obterRotuloAcaoAuditoriaSistema,
    normalizarConfiguracaoEventosAuditoriaSistema,
    obterConfiguracaoEventosAuditoriaSistema,
    salvarConfiguracaoEventosAuditoriaSistema,
    salvarConfiguracaoEventosAuditoriaSistemaSupabase,
} from "../../services/auditoriaSistemaConfigService";
import {
    ACOES_CRITICAS_PERMISSAO_SISTEMA,
    carregarPermissaoSistemaAtualService,
    obterBloqueioVisualAcaoCriticaSistema,
} from "../../services/usuariosPermissoesSistemaService";
import { supabase } from "../../lib/supabaseClient";
import { baixarCSV, baixarRelatorioAuditoriaSistemaPDF } from "../../services/exportacaoService";

const STORAGE_AUDITORIA_EXIBICAO_HABILITADA = false;
const hoje = new Date();
const LIMITE_REGISTROS_DETALHADOS_INICIAL = 30;


const CARTAS_AUDITORIA_SISTEMA_PADRAO = [
    "totalEventos",
    "eventosFiltrados",
    "acessos",
    "alteracoes",
    "emailsMes",
    "emailsSucesso",
    "emailsErro",
];

const BLOCOS_AUDITORIA_SISTEMA_PADRAO = [
    "atividades",
    "registros",
    "eventos",
    "permissoes",
];

const VISIBILIDADE_PADRAO_AUDITORIA = (chaves) =>
    chaves.reduce((acc, chave) => ({ ...acc, [chave]: true }), {});

const TAMANHOS_PADRAO_AUDITORIA = (chaves, tamanho = "padrao") =>
    chaves.reduce((acc, chave) => ({ ...acc, [chave]: tamanho }), {});

const VISIBILIDADE_PADRAO_CARTAS_AUDITORIA_SISTEMA = {
    ...VISIBILIDADE_PADRAO_AUDITORIA(CARTAS_AUDITORIA_SISTEMA_PADRAO),
    emailsMes: false,
    emailsSucesso: false,
    emailsErro: false,
};

const VISIBILIDADE_PADRAO_BLOCOS_AUDITORIA_SISTEMA = {
    ...VISIBILIDADE_PADRAO_AUDITORIA(BLOCOS_AUDITORIA_SISTEMA_PADRAO),
    permissoes: false,
};

const CHAVES_STORAGE_AUDITORIA_SISTEMA = Object.freeze({
    CARTAS_VISIVEIS: "auditoriaSistemaCartasVisiveisV2",
    TAMANHOS_CARTAS: "auditoriaSistemaTamanhosCartasV2",
    ORDEM_CARTAS: "auditoriaSistemaOrdemCartasV2",
    BLOCOS_VISIVEIS: "auditoriaSistemaBlocosVisiveisV2",
    TAMANHOS_BLOCOS: "auditoriaSistemaTamanhosBlocosV2",
    ORDEM_BLOCOS: "auditoriaSistemaOrdemBlocosV2",
});

const carregarPreferenciaAuditoriaSistema = (chave, padrao) => {
    if (typeof window === "undefined") return padrao;

    try {
        const salvo = JSON.parse(window.localStorage.getItem(chave) || "null");
        return salvo && typeof salvo === "object" ? { ...padrao, ...salvo } : padrao;
    } catch {
        return padrao;
    }
};

const carregarOrdemAuditoriaSistema = (chave, padrao) => {
    if (typeof window === "undefined") return padrao;

    try {
        const salvo = JSON.parse(window.localStorage.getItem(chave) || "null");
        if (!Array.isArray(salvo)) return padrao;

        return [
            ...salvo.filter((item) => padrao.includes(item)),
            ...padrao.filter((item) => !salvo.includes(item)),
        ];
    } catch {
        return padrao;
    }
};

const moverItemAuditoriaSistema = (lista, chave, direcao) => {
    const indice = lista.indexOf(chave);
    if (indice < 0) return lista;

    const destino = direcao === "cima" ? indice - 1 : indice + 1;
    if (destino < 0 || destino >= lista.length) return lista;

    const proxima = [...lista];
    [proxima[indice], proxima[destino]] = [proxima[destino], proxima[indice]];
    return proxima;
};

const classeTamanhoCartaAuditoriaSistema = (tamanho) => {
    if (tamanho === "medio") return "md:col-span-2";
    if (tamanho === "grande") return "md:col-span-2 xl:col-span-3";
    if (tamanho === "destaque") return "md:col-span-4";
    return "";
};

const classeTamanhoBlocoAuditoriaSistema = (tamanho) => {
    if (tamanho === "medio") return "xl:col-span-2";
    if (tamanho === "grande") return "xl:col-span-3";
    if (tamanho === "destaque") return "xl:col-span-4";
    return "xl:col-span-1";
};

const normalizarValorAuditoriaSistema = (valor) => String(valor || "").trim();

const obterDataFiltroAuditoriaSistema = (valor) => {
    if (!valor) return "";

    const data = new Date(valor);
    return Number.isNaN(data.getTime()) ? "" : data.toISOString().slice(0, 10);
};

const obterModuloAuditoriaSistema = (item = {}) => obterModuloAuditoriaSistemaPorRegistro(item);

const obterNivelAuditoriaSistema = (item = {}) => obterNivelAuditoriaSistemaPorRegistro(item);

const obterCategoriaAuditoriaSistemaPorMapa = (item = {}, eventosPorChave = {}) => {
    const chave = String(item.acao || "").trim().toUpperCase();
    return eventosPorChave[chave]?.categoria || "Evento identificado";
};

const ROTULOS_NIVEIS_AUDITORIA_SISTEMA = Object.freeze({
    Todos: "Todos os níveis",
    informacao: "Informação",
    alerta: "Alerta",
    critico: "Crítico",
    seguranca: "Segurança",
});

const classeNivelAuditoriaSistema = (nivel) => {
    if (nivel === "seguranca") return "bg-indigo-50 text-indigo-700 ring-indigo-200";
    if (nivel === "critico") return "bg-red-50 text-red-700 ring-red-200";
    if (nivel === "alerta") return "bg-amber-50 text-amber-700 ring-amber-200";
    return "bg-slate-100 text-slate-600 ring-slate-200";
};

const ehAlteracaoAuditoriaSistema = (item = {}) => {
    const acao = String(item?.acao || "").trim().toUpperCase();

    if (["INSERT", "UPDATE", "DELETE"].includes(acao)) return true;

    return [
        "ALTERAD",
        "ATUALIZAD",
        "RESTAURAD",
        "HABILITAD",
        "DESABILITAD",
        "CRIAD",
        "EDITAD",
        "EXCLUID",
        "SALVA",
        "APLICAD",
        "CONCEDID",
        "REMOVID",
    ].some((termo) => acao.includes(termo));
};

const formatarDataHoraAuditoriaSistema = (valor) => {
    if (!valor) return "-";

    const data = new Date(valor);
    return Number.isNaN(data.getTime()) ? "-" : data.toLocaleString("pt-BR");
};

const copiarTextoAuditoriaSistema = async (texto) => {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(texto);
        return true;
    }

    if (typeof document === "undefined") return false;

    const area = document.createElement("textarea");
    area.value = texto;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();

    try {
        return document.execCommand("copy");
    } finally {
        document.body.removeChild(area);
    }
};

const CHAVE_FILTROS_RELATORIO_AUDITORIA_SISTEMA = "controle-sst-qr:auditoria-sistema:filtros-salvos:v1";

function obterFiltrosPadraoRelatorioAuditoriaSistema() {
    return {
        busca: "",
        filtroAcao: "Todas",
        filtroUsuario: "Todos",
        filtroModulo: "Todos",
        filtroCategoria: "Todas",
        filtroNivel: "Todos",
        filtroPeriodoInicio: "",
        filtroPeriodoFim: "",
    };
}

function normalizarFiltroSalvoRelatorioAuditoriaSistema(valor, fallback = "") {
    const texto = String(valor ?? "").trim();
    return texto || fallback;
}

function carregarFiltrosSalvosRelatorioAuditoriaSistema() {
    if (typeof window === "undefined" || !window.localStorage) return null;

    try {
        const bruto = window.localStorage.getItem(CHAVE_FILTROS_RELATORIO_AUDITORIA_SISTEMA);
        if (!bruto) return null;

        const dados = JSON.parse(bruto);
        if (!dados || typeof dados !== "object") return null;

        const padrao = obterFiltrosPadraoRelatorioAuditoriaSistema();

        return {
            busca: normalizarFiltroSalvoRelatorioAuditoriaSistema(dados.busca, padrao.busca),
            filtroAcao: normalizarFiltroSalvoRelatorioAuditoriaSistema(dados.filtroAcao, padrao.filtroAcao),
            filtroUsuario: normalizarFiltroSalvoRelatorioAuditoriaSistema(dados.filtroUsuario, padrao.filtroUsuario),
            filtroModulo: normalizarFiltroSalvoRelatorioAuditoriaSistema(dados.filtroModulo, padrao.filtroModulo),
            filtroCategoria: normalizarFiltroSalvoRelatorioAuditoriaSistema(dados.filtroCategoria, padrao.filtroCategoria),
            filtroNivel: normalizarFiltroSalvoRelatorioAuditoriaSistema(dados.filtroNivel, padrao.filtroNivel),
            filtroPeriodoInicio: normalizarFiltroSalvoRelatorioAuditoriaSistema(dados.filtroPeriodoInicio, padrao.filtroPeriodoInicio),
            filtroPeriodoFim: normalizarFiltroSalvoRelatorioAuditoriaSistema(dados.filtroPeriodoFim, padrao.filtroPeriodoFim),
        };
    } catch (error) {
        console.error("Erro ao carregar filtros salvos da Auditoria do Sistema:", error);
        return null;
    }
}

export function RelatorioAuditoria({
    auditoria = [],
    emailsEnviados = [],
    carregando,
    carregandoMaisAuditoria = false,
    existeMaisAuditoria = false,
    onAtualizar,
    onCarregarMaisAuditoria,
    onListarArquivosStorage,
    onExcluirArquivoStorage,
    onListarUsuariosAuditoria,
    onSalvarUsuarioAuditoria,
    onAlternarUsuarioAuditoria,
    onBloquear,
    onRegistrarAuditoria,
}) {
    const [busca, setBusca] = useState("");
    const [filtroAcao, setFiltroAcao] = useState("Todas");
    const [filtroUsuario, setFiltroUsuario] = useState("Todos");
    const [filtroModulo, setFiltroModulo] = useState("Todos");
    const [filtroCategoria, setFiltroCategoria] = useState("Todas");
    const [filtroNivel, setFiltroNivel] = useState("Todos");
    const [filtroPeriodoInicio, setFiltroPeriodoInicio] = useState("");
    const [filtroPeriodoFim, setFiltroPeriodoFim] = useState("");
    const [, setVersaoFiltroSalvoRelatorioAuditoriaSistema] = useState(0);

    const filtrosSalvosRelatorioAuditoriaSistemaDisponiveis = Boolean(
        carregarFiltrosSalvosRelatorioAuditoriaSistema()
    );
    const [filtrosStorage, setFiltrosStorage] = useState({
        empresa: "Todas",
        colaborador: "Todos",
        tipo: "Todos",
        dataInicio: "",
        dataFim: "",
        tamanho: "Todos",
        vinculo: "Todos",
    });
    const [arquivosStorageAuditoria, setArquivosStorageAuditoria] = useState([]);
    const [carregandoStorageAuditoria, setCarregandoStorageAuditoria] = useState(false);
    const [excluindoStorageAuditoria, setExcluindoStorageAuditoria] = useState("");
    const [limpandoStorageAuditoria, setLimpandoStorageAuditoria] = useState(false);
    const [progressoLimpezaStorage, setProgressoLimpezaStorage] = useState({ atual: 0, total: 0 });
    const storageMontadoRef = useRef(false);
    const [usuariosAuditoria, setUsuariosAuditoria] = useState([]);
    const [carregandoUsuariosAuditoria, setCarregandoUsuariosAuditoria] = useState(false);
    const [salvandoUsuarioAuditoria, setSalvandoUsuarioAuditoria] = useState(false);
    const [alterandoUsuarioAuditoria, setAlterandoUsuarioAuditoria] = useState("");
    const [novoUsuarioAuditoria, setNovoUsuarioAuditoria] = useState({
        email: "",
        nome: "",
        funcao: "",
    });
    const [detalhesAuditoriaAbertos, setDetalhesAuditoriaAbertos] = useState({});
    const [limiteRegistrosDetalhados, setLimiteRegistrosDetalhados] = useState(LIMITE_REGISTROS_DETALHADOS_INICIAL);
    const [configEventosAuditoria, setConfigEventosAuditoria] = useState(() =>
        obterConfiguracaoEventosAuditoriaSistema()
    );
    const [origemConfigEventosAuditoria, setOrigemConfigEventosAuditoria] = useState("local");
    const [mensagemConfigEventosAuditoria, setMensagemConfigEventosAuditoria] = useState("");
    const [carregandoConfigEventosAuditoria, setCarregandoConfigEventosAuditoria] = useState(false);
    const [salvandoConfigEventosAuditoria, setSalvandoConfigEventosAuditoria] = useState(false);
    const [permissaoSistemaAtual, setPermissaoSistemaAtual] = useState(null);
    const [mensagemPermissaoSistemaAuditoria, setMensagemPermissaoSistemaAuditoria] = useState("Carregando permissões do sistema...");
    const [mensagemResumoAuditoria, setMensagemResumoAuditoria] = useState("");

    const [mostrarPersonalizacaoAuditoria, setMostrarPersonalizacaoAuditoria] = useState(false);
    const [abaPersonalizacaoAuditoria, setAbaPersonalizacaoAuditoria] = useState("cartas");
    const [cartasVisiveisAuditoria, setCartasVisiveisAuditoria] = useState(() =>
        carregarPreferenciaAuditoriaSistema(
            CHAVES_STORAGE_AUDITORIA_SISTEMA.CARTAS_VISIVEIS,
            VISIBILIDADE_PADRAO_CARTAS_AUDITORIA_SISTEMA
        )
    );
    const [tamanhosCartasAuditoria, setTamanhosCartasAuditoria] = useState(() =>
        carregarPreferenciaAuditoriaSistema(
            CHAVES_STORAGE_AUDITORIA_SISTEMA.TAMANHOS_CARTAS,
            TAMANHOS_PADRAO_AUDITORIA(CARTAS_AUDITORIA_SISTEMA_PADRAO, "padrao")
        )
    );
    const [ordemCartasAuditoria, setOrdemCartasAuditoria] = useState(() =>
        carregarOrdemAuditoriaSistema(CHAVES_STORAGE_AUDITORIA_SISTEMA.ORDEM_CARTAS, CARTAS_AUDITORIA_SISTEMA_PADRAO)
    );
    const [blocosVisiveisAuditoria, setBlocosVisiveisAuditoria] = useState(() =>
        carregarPreferenciaAuditoriaSistema(
            CHAVES_STORAGE_AUDITORIA_SISTEMA.BLOCOS_VISIVEIS,
            VISIBILIDADE_PADRAO_BLOCOS_AUDITORIA_SISTEMA
        )
    );
    const [tamanhosBlocosAuditoria, setTamanhosBlocosAuditoria] = useState(() =>
        carregarPreferenciaAuditoriaSistema(
            CHAVES_STORAGE_AUDITORIA_SISTEMA.TAMANHOS_BLOCOS,
            TAMANHOS_PADRAO_AUDITORIA(BLOCOS_AUDITORIA_SISTEMA_PADRAO, "destaque")
        )
    );
    const [ordemBlocosAuditoria, setOrdemBlocosAuditoria] = useState(() =>
        carregarOrdemAuditoriaSistema(CHAVES_STORAGE_AUDITORIA_SISTEMA.ORDEM_BLOCOS, BLOCOS_AUDITORIA_SISTEMA_PADRAO)
    );

    useEffect(() => {
        storageMontadoRef.current = true;

        return () => {
            storageMontadoRef.current = false;
        };
    }, []);

    useEffect(() => {
        if (typeof window === "undefined") return undefined;

        const timer = window.setTimeout(async () => {
            setCarregandoConfigEventosAuditoria(true);

            try {
                const resultado = await carregarConfiguracaoEventosAuditoriaSistemaSupabase();
                setConfigEventosAuditoria(resultado.configuracao);
                setOrigemConfigEventosAuditoria(resultado.origem);

                if (resultado.erro) {
                    setMensagemConfigEventosAuditoria(
                        `Usando configuração local. Supabase: ${resultado.erro}`
                    );
                } else if (resultado.origem === "supabase") {
                    setMensagemConfigEventosAuditoria("Configuração carregada do Supabase.");
                }
            } finally {
                setCarregandoConfigEventosAuditoria(false);
            }
        }, 0);

        return () => window.clearTimeout(timer);
    }, []);


    useEffect(() => {
        if (typeof window === "undefined") return;
        window.localStorage.setItem(CHAVES_STORAGE_AUDITORIA_SISTEMA.CARTAS_VISIVEIS, JSON.stringify(cartasVisiveisAuditoria));
    }, [cartasVisiveisAuditoria]);

    useEffect(() => {
        if (typeof window === "undefined") return;
        window.localStorage.setItem(CHAVES_STORAGE_AUDITORIA_SISTEMA.TAMANHOS_CARTAS, JSON.stringify(tamanhosCartasAuditoria));
    }, [tamanhosCartasAuditoria]);

    useEffect(() => {
        if (typeof window === "undefined") return;
        window.localStorage.setItem(CHAVES_STORAGE_AUDITORIA_SISTEMA.ORDEM_CARTAS, JSON.stringify(ordemCartasAuditoria));
    }, [ordemCartasAuditoria]);

    useEffect(() => {
        if (typeof window === "undefined") return;
        window.localStorage.setItem(CHAVES_STORAGE_AUDITORIA_SISTEMA.BLOCOS_VISIVEIS, JSON.stringify(blocosVisiveisAuditoria));
    }, [blocosVisiveisAuditoria]);

    useEffect(() => {
        if (typeof window === "undefined") return;
        window.localStorage.setItem(CHAVES_STORAGE_AUDITORIA_SISTEMA.TAMANHOS_BLOCOS, JSON.stringify(tamanhosBlocosAuditoria));
    }, [tamanhosBlocosAuditoria]);

    useEffect(() => {
        if (typeof window === "undefined") return;
        window.localStorage.setItem(CHAVES_STORAGE_AUDITORIA_SISTEMA.ORDEM_BLOCOS, JSON.stringify(ordemBlocosAuditoria));
    }, [ordemBlocosAuditoria]);

    const persistirConfiguracaoEventosAuditoria = async (
        configuracao,
        mensagemSucesso = "Configuração salva.",
        dadosLog = {}
    ) => {
        const normalizada = normalizarConfiguracaoEventosAuditoriaSistema(configuracao);
        setConfigEventosAuditoria(normalizada);
        salvarConfiguracaoEventosAuditoriaSistema(normalizada);
        setSalvandoConfigEventosAuditoria(true);
        setMensagemConfigEventosAuditoria("Salvando configuração...");

        try {
            const resultado = await salvarConfiguracaoEventosAuditoriaSistemaSupabase(normalizada);
            const origem = resultado.origem || "local";
            setOrigemConfigEventosAuditoria(origem);

            if (resultado.ok) {
                setMensagemConfigEventosAuditoria(`${mensagemSucesso} Configuração sincronizada no Supabase.`);
            } else {
                setMensagemConfigEventosAuditoria(
                    `${mensagemSucesso} Mantida localmente. Supabase: ${resultado.erro}`
                );
            }

            if (typeof onRegistrarAuditoria === "function") {
                try {
                    await onRegistrarAuditoria(
                        "CONFIGURACAO_EVENTOS_AUDITORIA_ALTERADA",
                        "auditoria_sistema_configuracoes",
                        dadosLog?.descricao || "Alterou a configuração de eventos verificados pela Auditoria do Sistema.",
                        "eventos_verificados",
                        {
                            origem,
                            sincronizadoSupabase: Boolean(resultado.ok),
                            totalEventosConfigurados: Object.keys(normalizada).length,
                            senhaRegistrada: false,
                            tokenCompletoRegistrado: false,
                            ...(dadosLog?.dados || {}),
                        }
                    );
                } catch (error) {
                    console.warn("Erro ao registrar log de eventos da Auditoria do Sistema:", error?.message || error);
                }
            }
        } finally {
            setSalvandoConfigEventosAuditoria(false);
        }
    };

    const alternarEventoAuditoria = (chave) => {
        const eventoAtual = eventosAuditoriaSistema.find((evento) => evento.chave === chave);
        const habilitadoAnteriormente = configEventosAuditoria[chave] !== false;
        const habilitadoAgora = !habilitadoAnteriormente;
        const proxima = {
            ...configEventosAuditoria,
            [chave]: habilitadoAgora,
        };

        persistirConfiguracaoEventosAuditoria(proxima, "Evento atualizado.", {
            descricao: `${habilitadoAgora ? "Habilitou" : "Desabilitou"} evento auditável pela aba Auditoria do Sistema.`,
            dados: {
                tipo: "evento_individual",
                evento: chave,
                rotulo: eventoAtual?.label || obterRotuloAcaoAuditoriaSistema(chave),
                categoria: eventoAtual?.categoria || "Evento identificado",
                habilitadoAnteriormente,
                habilitadoAgora,
            },
        });
    };

    const definirTodosEventosAuditoria = (habilitado) => {
        const proxima = eventosAuditoriaSistema.reduce((acc, evento) => {
            acc[evento.chave] = habilitado;
            return acc;
        }, { ...configEventosAuditoria });

        persistirConfiguracaoEventosAuditoria(
            proxima,
            habilitado ? "Todos os eventos foram habilitados." : "Todos os eventos foram desabilitados.",
            {
                descricao: habilitado
                    ? "Habilitou todos os eventos verificados pela Auditoria do Sistema."
                    : "Desabilitou todos os eventos verificados pela Auditoria do Sistema.",
                dados: {
                    tipo: habilitado ? "habilitar_todos" : "desabilitar_todos",
                    habilitado,
                    totalEventosAfetados: eventosAuditoriaSistema.length,
                },
            }
        );
    };

    const restaurarPadraoEventosAuditoria = () => {
        persistirConfiguracaoEventosAuditoria(
            configuracaoPadraoEventosAuditoriaSistema(),
            "Configuração padrão restaurada.",
            {
                descricao: "Restaurou o padrão dos eventos verificados pela Auditoria do Sistema.",
                dados: {
                    tipo: "restaurar_padrao",
                    totalEventosAfetados: eventosAuditoriaSistema.length,
                },
            }
        );
    };

    const alternarDetalhesAuditoria = (id) => {
        setDetalhesAuditoriaAbertos((atual) => ({
            ...atual,
            [id]: !atual[id],
        }));
    };


    const alternarCartaAuditoriaSistema = (chave) => {
        setCartasVisiveisAuditoria((atual) => ({ ...atual, [chave]: !atual[chave] }));
    };

    const alterarTamanhoCartaAuditoriaSistema = (chave, tamanho) => {
        setTamanhosCartasAuditoria((atual) => ({ ...atual, [chave]: tamanho }));
    };

    const moverCartaAuditoriaSistema = (chave, direcao) => {
        setOrdemCartasAuditoria((atual) => moverItemAuditoriaSistema(atual, chave, direcao));
    };

    const alternarBlocoAuditoriaSistema = (chave) => {
        setBlocosVisiveisAuditoria((atual) => ({ ...atual, [chave]: !atual[chave] }));
    };

    const alterarTamanhoBlocoAuditoriaSistema = (chave, tamanho) => {
        setTamanhosBlocosAuditoria((atual) => ({ ...atual, [chave]: tamanho }));
    };

    const moverBlocoAuditoriaSistema = (chave, direcao) => {
        setOrdemBlocosAuditoria((atual) => moverItemAuditoriaSistema(atual, chave, direcao));
    };

    const restaurarPersonalizacaoAuditoriaSistema = () => {
        setCartasVisiveisAuditoria(VISIBILIDADE_PADRAO_CARTAS_AUDITORIA_SISTEMA);
        setTamanhosCartasAuditoria(TAMANHOS_PADRAO_AUDITORIA(CARTAS_AUDITORIA_SISTEMA_PADRAO, "padrao"));
        setOrdemCartasAuditoria(CARTAS_AUDITORIA_SISTEMA_PADRAO);
        setBlocosVisiveisAuditoria(VISIBILIDADE_PADRAO_BLOCOS_AUDITORIA_SISTEMA);
        setTamanhosBlocosAuditoria(TAMANHOS_PADRAO_AUDITORIA(BLOCOS_AUDITORIA_SISTEMA_PADRAO, "destaque"));
        setOrdemBlocosAuditoria(BLOCOS_AUDITORIA_SISTEMA_PADRAO);
    };

    const eventosAuditoriaSistema = montarEventosAuditoriaSistema(auditoria, configEventosAuditoria);

    const eventosAuditoriaSistemaPorChave = eventosAuditoriaSistema.reduce((acc, evento) => {
            acc[String(evento.chave || "").trim().toUpperCase()] = evento;
            return acc;
        }, {});

    const obterCategoriaAuditoriaSistema = (item = {}) =>
        obterCategoriaAuditoriaSistemaPorMapa(item, eventosAuditoriaSistemaPorChave);

    const auditoriaVerificada = useMemo(
        () => auditoria.filter((item) => auditoriaEventoHabilitado(item.acao, configEventosAuditoria)),
        [auditoria, configEventosAuditoria]
    );

    const eventosHabilitadosAuditoria = eventosAuditoriaSistema.filter((evento) => evento.habilitado).length;
    const eventosDesabilitadosAuditoria = eventosAuditoriaSistema.length - eventosHabilitadosAuditoria;

    const acoes = useMemo(
        () => Array.from(new Set(auditoriaVerificada.map((item) => item.acao).filter(Boolean))).sort(),
        [auditoriaVerificada]
    );

    const usuariosAuditoriaFiltro = useMemo(
        () => Array.from(new Set(auditoriaVerificada.map((item) => item.usuario_email || "Sistema / consulta pública").filter(Boolean))).sort(),
        [auditoriaVerificada]
    );

    const modulosAuditoriaFiltro = useMemo(
        () => Array.from(new Set(auditoriaVerificada.map((item) => obterModuloAuditoriaSistema(item)).filter(Boolean))).sort(),
        [auditoriaVerificada]
    );

    const categoriasAuditoriaFiltro = Array.from(
        new Set(
            auditoriaVerificada
                .map((item) => obterCategoriaAuditoriaSistemaPorMapa(item, eventosAuditoriaSistemaPorChave))
                .filter(Boolean)
        )
    ).sort();

    const registrosFiltrados = (() => {
        const termo = normalizarTextoBusca(busca);

        return auditoriaVerificada.filter((item) => {
            const origemAcesso = item.dados?.origemAcesso || {};
            const modulo = obterModuloAuditoriaSistema(item);
            const categoria = obterCategoriaAuditoriaSistemaPorMapa(item, eventosAuditoriaSistemaPorChave);
            const nivel = obterNivelAuditoriaSistema(item);
            const dataRegistro = obterDataFiltroAuditoriaSistema(item.created_at);
            const usuarioRegistro = item.usuario_email || "Sistema / consulta pública";
            const texto = normalizarTextoBusca(
                `${usuarioRegistro} ${item.acao || ""} ${modulo} ${categoria} ${nivel} ${item.tabela || ""} ${item.descricao || ""} ${item.registro_id || ""} ${origemAcesso.url || ""} ${origemAcesso.pagina || ""} ${origemAcesso.navegador || ""} ${origemAcesso.plataforma || ""}`
            );

            const bateBusca = !termo || texto.includes(termo);
            const bateAcao = filtroAcao === "Todas" || item.acao === filtroAcao;
            const bateUsuario = filtroUsuario === "Todos" || usuarioRegistro === filtroUsuario;
            const bateModulo = filtroModulo === "Todos" || modulo === filtroModulo;
            const bateCategoria = filtroCategoria === "Todas" || categoria === filtroCategoria;
            const bateNivel = filtroNivel === "Todos" || nivel === filtroNivel;
            const bateInicio = !filtroPeriodoInicio || (dataRegistro && dataRegistro >= filtroPeriodoInicio);
            const bateFim = !filtroPeriodoFim || (dataRegistro && dataRegistro <= filtroPeriodoFim);

            return bateBusca && bateAcao && bateUsuario && bateModulo && bateCategoria && bateNivel && bateInicio && bateFim;
        });
    })();

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setLimiteRegistrosDetalhados(LIMITE_REGISTROS_DETALHADOS_INICIAL);
        }, 0);

        return () => window.clearTimeout(timer);
    }, [busca, filtroAcao, filtroUsuario, filtroModulo, filtroCategoria, filtroNivel, filtroPeriodoInicio, filtroPeriodoFim, auditoriaVerificada.length]);

    const registrosDetalhadosVisiveis = registrosFiltrados.slice(0, limiteRegistrosDetalhados);
    const existemMaisRegistrosDetalhados = registrosFiltrados.length > registrosDetalhadosVisiveis.length;

    const ultimosAcessosAuditoria = auditoriaVerificada
        .filter((item) => normalizarTextoBusca(`${item.acao || ""} ${item.descricao || ""}`).includes("acesso"))
        .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
        .slice(0, 8);

    const mesAtualEmails = hoje.getMonth();
    const anoAtualEmails = hoje.getFullYear();
    const emailsMesAuditoria = emailsEnviados.filter((item) => {
        const data = item.data_envio ? new Date(item.data_envio) : null;
        return data && data.getMonth() === mesAtualEmails && data.getFullYear() === anoAtualEmails;
    });
    const emailsSucessoAuditoria = emailsMesAuditoria.filter((item) => normalizarTextoBusca(item.status_envio).includes("sucesso"));
    const emailsErroAuditoria = emailsMesAuditoria.filter((item) => normalizarTextoBusca(item.status_envio).includes("erro"));
    const ultimosEmailsAuditoria = [...emailsEnviados]
        .sort((a, b) => new Date(b.data_envio || 0) - new Date(a.data_envio || 0))
        .slice(0, 8);

    const obterEmpresaArquivoStorage = (arquivo) =>
        arquivo.empresaNome || arquivo.colaboradorEmpresa || "Sem empresa vinculada";

    const obterColaboradorArquivoStorage = (arquivo) =>
        arquivo.colaboradorNome || "Sem colaborador vinculado";

    const obterTipoArquivoStorage = (arquivo) =>
        arquivo.tipoDocumentoEmpresa || arquivo.treinamentoNome || arquivo.origemTipo || arquivo.bucket || "Tipo não identificado";

    const obterDataArquivoStorage = (arquivo) => {
        if (!arquivo?.atualizadoEm) return "";

        const data = new Date(arquivo.atualizadoEm);
        return Number.isNaN(data.getTime()) ? "" : data.toISOString().slice(0, 10);
    };

    const tamanhoArquivoDentroDoFiltro = (arquivo) => {
        const tamanho = Number(arquivo.tamanho || 0);

        if (filtrosStorage.tamanho === "Todos") return true;
        if (filtrosStorage.tamanho === "ate-1mb") return tamanho <= 1024 ** 2;
        if (filtrosStorage.tamanho === "1mb-10mb") return tamanho > 1024 ** 2 && tamanho <= 10 * 1024 ** 2;
        if (filtrosStorage.tamanho === "10mb-50mb") return tamanho > 10 * 1024 ** 2 && tamanho <= 50 * 1024 ** 2;
        if (filtrosStorage.tamanho === "acima-50mb") return tamanho > 50 * 1024 ** 2;

        return true;
    };

    const arquivosStorageAuditoriaSemRegistro = arquivosStorageAuditoria.filter((arquivo) => !arquivo.emUso);
    const arquivosStorageAuditoriaEmUso = arquivosStorageAuditoria.filter((arquivo) => arquivo.emUso);
    const storageTotalBytes = arquivosStorageAuditoria.reduce((total, arquivo) => total + Number(arquivo.tamanho || 0), 0);
    const storageEmUsoBytes = arquivosStorageAuditoriaEmUso.reduce((total, arquivo) => total + Number(arquivo.tamanho || 0), 0);
    const storageSemRegistroBytes = arquivosStorageAuditoriaSemRegistro.reduce((total, arquivo) => total + Number(arquivo.tamanho || 0), 0);
    const storageLimiteBytes = Math.max(1, LIMITE_STORAGE_MB * 1024 * 1024);
    const storagePercentual = calcularPercentualUsoStorage(storageTotalBytes);
    const storageStatus =
        storagePercentual >= 90
            ? {
                texto: "Crítico",
                detalhe: "Acima de 90% do limite configurado. Avaliar limpeza de arquivos sem vínculo ou aumento de plano.",
                classe: "bg-red-50 text-red-700 ring-red-200",
                barra: "bg-red-500",
            }
            : storagePercentual >= 70
                ? {
                    texto: "Atenção",
                    detalhe: "Entre 70% e 89% do limite configurado. Acompanhar crescimento dos uploads.",
                    classe: "bg-orange-50 text-orange-700 ring-orange-200",
                    barra: "bg-orange-500",
                }
                : {
                    texto: "Normal",
                    detalhe: "Até 70% do limite configurado. Capacidade dentro do controle esperado.",
                    classe: "bg-emerald-50 text-emerald-700 ring-emerald-200",
                    barra: "bg-emerald-500",
                };

    const arquivosStorageFiltrados = arquivosStorageAuditoria
        .filter((arquivo) => {
            const empresa = obterEmpresaArquivoStorage(arquivo);
            const colaborador = obterColaboradorArquivoStorage(arquivo);
            const tipo = obterTipoArquivoStorage(arquivo);
            const dataArquivo = obterDataArquivoStorage(arquivo);

            const bateEmpresa = filtrosStorage.empresa === "Todas" || empresa === filtrosStorage.empresa;
            const bateColaborador = filtrosStorage.colaborador === "Todos" || colaborador === filtrosStorage.colaborador;
            const bateTipo = filtrosStorage.tipo === "Todos" || tipo === filtrosStorage.tipo;
            const bateInicio = !filtrosStorage.dataInicio || (dataArquivo && dataArquivo >= filtrosStorage.dataInicio);
            const bateFim = !filtrosStorage.dataFim || (dataArquivo && dataArquivo <= filtrosStorage.dataFim);
            const bateTamanho = tamanhoArquivoDentroDoFiltro(arquivo);
            const bateVinculo =
                filtrosStorage.vinculo === "Todos" ||
                (filtrosStorage.vinculo === "Com vínculo" && arquivo.emUso) ||
                (filtrosStorage.vinculo === "Sem vínculo" && !arquivo.emUso);

            return bateEmpresa && bateColaborador && bateTipo && bateInicio && bateFim && bateTamanho && bateVinculo;
        })
        .sort((a, b) => {
            const dataA = a.atualizadoEm ? new Date(a.atualizadoEm).getTime() : 0;
            const dataB = b.atualizadoEm ? new Date(b.atualizadoEm).getTime() : 0;

            return dataB - dataA || Number(b.tamanho || 0) - Number(a.tamanho || 0);
        });

    const arquivosStorageFiltradosSemVinculo = arquivosStorageFiltrados.filter((arquivo) => !arquivo.emUso);
    const storageFiltradoSemVinculoBytes = arquivosStorageFiltradosSemVinculo.reduce(
        (total, arquivo) => total + Number(arquivo.tamanho || 0),
        0
    );

    const opcoesEmpresasStorage = Array.from(new Set(arquivosStorageAuditoria.map(obterEmpresaArquivoStorage))).sort();
    const opcoesColaboradoresStorage = Array.from(new Set(arquivosStorageAuditoria.map(obterColaboradorArquivoStorage))).sort();
    const opcoesTiposStorage = Array.from(new Set(arquivosStorageAuditoria.map(obterTipoArquivoStorage))).sort();

    const agruparArquivosStorage = (lista, obterChave) =>
        Object.values(
            lista.reduce((acc, arquivo) => {
                const chave = obterChave(arquivo) || "Não informado";

                if (!acc[chave]) {
                    acc[chave] = {
                        nome: chave,
                        arquivos: 0,
                        bytes: 0,
                        emUso: 0,
                        semRegistro: 0,
                    };
                }

                acc[chave].arquivos += 1;
                acc[chave].bytes += Number(arquivo.tamanho || 0);

                if (arquivo.emUso) acc[chave].emUso += 1;
                else acc[chave].semRegistro += 1;

                return acc;
            }, {})
        ).sort((a, b) => b.arquivos - a.arquivos || b.bytes - a.bytes || a.nome.localeCompare(b.nome));

    const arquivosPorEmpresaStorage = agruparArquivosStorage(arquivosStorageAuditoria, obterEmpresaArquivoStorage);
    const arquivosPorTipoStorage = agruparArquivosStorage(arquivosStorageAuditoria, obterTipoArquivoStorage);
    const storagePorBucket = agruparArquivosStorage(arquivosStorageAuditoria, (arquivo) => arquivo.bucket || "storage")
        .map((item) => ({ ...item, bucket: item.nome }))
        .sort((a, b) => b.bytes - a.bytes);
    const maioresArquivosStorage = [...arquivosStorageAuditoria]
        .sort((a, b) => Number(b.tamanho || 0) - Number(a.tamanho || 0))
        .slice(0, 6);
    const ultimoUploadStorage = [...arquivosStorageAuditoria]
        .filter((arquivo) => arquivo.atualizadoEm)
        .sort((a, b) => new Date(b.atualizadoEm).getTime() - new Date(a.atualizadoEm).getTime())[0];

    const bloqueioLimparArquivosStorageSistema = useMemo(
        () => obterBloqueioVisualAcaoCriticaSistema(
            permissaoSistemaAtual,
            ACOES_CRITICAS_PERMISSAO_SISTEMA.LIMPAR_ARQUIVOS
        ),
        [permissaoSistemaAtual]
    );

    useEffect(() => {
        let montado = true;

        async function carregarPermissaoSistemaAuditoria() {
            try {
                const permissao = await carregarPermissaoSistemaAtualService({ supabase });

                if (!montado) return;

                setPermissaoSistemaAtual(permissao);
                setMensagemPermissaoSistemaAuditoria(
                    permissao
                        ? "Permissões do sistema carregadas para ações críticas."
                        : "Nenhuma permissão do sistema cadastrada para o usuário atual."
                );
            } catch (erro) {
                if (!montado) return;
                setPermissaoSistemaAtual(null);
                setMensagemPermissaoSistemaAuditoria(
                    `Não foi possível carregar permissões do sistema: ${erro?.message || "erro não identificado"}`
                );
            }
        }

        carregarPermissaoSistemaAuditoria();

        return () => {
            montado = false;
        };
    }, []);

    const carregarStorageAuditoria = async () => {
        if (!onListarArquivosStorage) return;

        setCarregandoStorageAuditoria(true);

        try {
            const lista = await onListarArquivosStorage();

            if (storageMontadoRef.current) {
                setArquivosStorageAuditoria(lista || []);
            }
        } finally {
            if (storageMontadoRef.current) {
                setCarregandoStorageAuditoria(false);
            }
        }
    };


    const excluirStorageAuditoria = async (arquivo) => {
        if (!onExcluirArquivoStorage) return;

        if (bloqueioLimparArquivosStorageSistema.bloqueado) {
            if (typeof window !== "undefined") {
                window.alert(bloqueioLimparArquivosStorageSistema.mensagem);
            }
            return;
        }

        setExcluindoStorageAuditoria(arquivo.caminho);

        const ok = await onExcluirArquivoStorage(arquivo);

        setExcluindoStorageAuditoria("");

        if (ok) {
            await carregarStorageAuditoria();
            onAtualizar?.();
        }
    };

    const limparArquivosStorageSemVinculoFiltrados = async () => {
        if (!onExcluirArquivoStorage || arquivosStorageFiltradosSemVinculo.length === 0) return;

        if (bloqueioLimparArquivosStorageSistema.bloqueado) {
            if (typeof window !== "undefined") {
                window.alert(bloqueioLimparArquivosStorageSistema.mensagem);
            }
            return;
        }

        const totalArquivos = arquivosStorageFiltradosSemVinculo.length;
        const mensagemConfirmacao = `Confirma excluir ${totalArquivos} arquivo(s) sem vínculo exibido(s) no filtro atual?

Tamanho total: ${formatarBytes(storageFiltradoSemVinculoBytes)}.

Essa ação remove arquivos do Storage e não altera registros do banco.`;

        if (typeof window !== "undefined" && !window.confirm(mensagemConfirmacao)) return;

        setLimpandoStorageAuditoria(true);
        setExcluindoStorageAuditoria("__limpeza_em_lote__");
        setProgressoLimpezaStorage({ atual: 0, total: totalArquivos });

        let excluidos = 0;
        let falhas = 0;
        const confirmarOriginal = typeof window !== "undefined" ? window.confirm : null;

        try {
            if (typeof window !== "undefined") {
                window.confirm = () => true;
            }

            for (const [indice, arquivo] of arquivosStorageFiltradosSemVinculo.entries()) {
                if (!storageMontadoRef.current) break;

                try {
                    const ok = await onExcluirArquivoStorage({
                        ...arquivo,
                        ignorarConfirmacaoIndividual: true,
                        ignorarConfirmacao: true,
                        limpezaEmLote: true,
                    });

                    if (ok) excluidos += 1;
                    else falhas += 1;
                } catch (erro) {
                    falhas += 1;
                    console.warn("Erro ao excluir arquivo sem vínculo:", erro);
                } finally {
                    if (storageMontadoRef.current) {
                        setProgressoLimpezaStorage({ atual: indice + 1, total: totalArquivos });
                    }
                }
            }
        } finally {
            if (typeof window !== "undefined" && confirmarOriginal) {
                window.confirm = confirmarOriginal;
            }

            if (storageMontadoRef.current) {
                await carregarStorageAuditoria();
                onAtualizar?.();
                setLimpandoStorageAuditoria(false);
                setExcluindoStorageAuditoria("");
                setProgressoLimpezaStorage({ atual: 0, total: 0 });

                if (typeof window !== "undefined") {
                    window.alert(`Limpeza concluída. Excluído(s): ${excluidos}. Falha(s): ${falhas}.`);
                }
            }
        }
    };

    const carregarUsuariosAuditoria = async () => {
        if (!onListarUsuariosAuditoria) return;

        setCarregandoUsuariosAuditoria(true);

        const lista = await onListarUsuariosAuditoria();

        setUsuariosAuditoria(lista || []);
        setCarregandoUsuariosAuditoria(false);
    };

    const salvarUsuarioAuditoriaTela = async (evento) => {
        evento.preventDefault();

        if (!novoUsuarioAuditoria.email.trim()) {
            alert("Informe o e-mail do usuário que terá acesso à Auditoria.");
            return;
        }

        setSalvandoUsuarioAuditoria(true);

        const ok = await onSalvarUsuarioAuditoria?.({
            ...novoUsuarioAuditoria,
            email: novoUsuarioAuditoria.email.trim().toLowerCase(),
            nome: novoUsuarioAuditoria.nome.trim(),
            funcao: novoUsuarioAuditoria.funcao.trim(),
        });

        setSalvandoUsuarioAuditoria(false);

        if (ok) {
            setNovoUsuarioAuditoria({ email: "", nome: "", funcao: "" });
            carregarUsuariosAuditoria();
        }
    };

    const alternarUsuarioAuditoriaTela = async (usuarioAutorizado) => {
        setAlterandoUsuarioAuditoria(usuarioAutorizado.id);

        const ok = await onAlternarUsuarioAuditoria?.(usuarioAutorizado);

        setAlterandoUsuarioAuditoria("");

        if (ok) {
            carregarUsuariosAuditoria();
        }
    };


    const cartasResumoAuditoriaSistema = [
        { chave: "totalEventos", titulo: "Total de eventos", valor: auditoria.length, detalhe: "Eventos carregados", classe: "text-slate-950", icon: Activity },
        { chave: "eventosFiltrados", titulo: "Eventos filtrados", valor: registrosFiltrados.length, detalhe: "Resultado dos filtros", classe: "text-blue-700", icon: Filter },
        { chave: "acessos", titulo: "Acessos", valor: auditoriaVerificada.filter((item) => String(item.acao || "").includes("ACESSO")).length, detalhe: "Entradas e consultas", classe: "text-emerald-700", icon: LogIn },
        { chave: "alteracoes", titulo: "Alterações", valor: auditoriaVerificada.filter(ehAlteracaoAuditoriaSistema).length, detalhe: "Mudanças registradas", classe: "text-orange-700", icon: PencilLine },
        { chave: "emailsMes", titulo: "E-mails no mês", valor: emailsMesAuditoria.length, detalhe: "Envios no período", classe: "text-blue-700", icon: Mail },
        { chave: "emailsSucesso", titulo: "E-mails com sucesso", valor: emailsSucessoAuditoria.length, detalhe: "Entregas confirmadas", classe: "text-emerald-700", icon: CheckCircle2 },
        { chave: "emailsErro", titulo: "E-mails com erro", valor: emailsErroAuditoria.length, detalhe: "Falhas de envio", classe: "text-red-700", icon: XCircle },
    ];

    const cartasResumoAuditoriaOrdenadas = [
        ...ordemCartasAuditoria
            .map((chave) => cartasResumoAuditoriaSistema.find((carta) => carta.chave === chave))
            .filter(Boolean),
        ...cartasResumoAuditoriaSistema.filter((carta) => !ordemCartasAuditoria.includes(carta.chave)),
    ];

    const obterTemaCartaAuditoriaSistema = (chave = "") => {
        const chaveNormalizada = String(chave || "").toLowerCase();

        if (chaveNormalizada.includes("total")) {
            return {
                faixa: "from-slate-400 via-slate-700 to-slate-400",
                borda: "border-slate-100",
                icone: "bg-slate-50 text-slate-700 ring-slate-200",
                etiqueta: "text-slate-700",
                valor: "text-slate-950",
            };
        }

        if (chaveNormalizada.includes("filtrados") || chaveNormalizada.includes("emailsmes")) {
            return {
                faixa: "from-sky-400 via-blue-500 to-cyan-400",
                borda: "border-sky-100",
                icone: "bg-sky-50 text-blue-700 ring-sky-100",
                etiqueta: "text-blue-700",
                valor: "text-blue-700",
            };
        }

        if (chaveNormalizada.includes("acessos") || chaveNormalizada.includes("sucesso")) {
            return {
                faixa: "from-emerald-400 via-teal-500 to-cyan-400",
                borda: "border-emerald-100",
                icone: "bg-emerald-50 text-emerald-700 ring-emerald-100",
                etiqueta: "text-emerald-700",
                valor: "text-emerald-700",
            };
        }

        if (chaveNormalizada.includes("alteracoes")) {
            return {
                faixa: "from-amber-400 via-orange-500 to-rose-400",
                borda: "border-amber-100",
                icone: "bg-amber-50 text-orange-700 ring-amber-100",
                etiqueta: "text-orange-700",
                valor: "text-orange-700",
            };
        }

        if (chaveNormalizada.includes("erro")) {
            return {
                faixa: "from-rose-400 via-red-500 to-orange-400",
                borda: "border-rose-100",
                icone: "bg-rose-50 text-red-700 ring-rose-100",
                etiqueta: "text-red-700",
                valor: "text-red-700",
            };
        }

        return {
            faixa: "from-slate-300 via-slate-500 to-slate-300",
            borda: "border-slate-100",
            icone: "bg-slate-50 text-slate-700 ring-slate-200",
            etiqueta: "text-slate-700",
            valor: "text-slate-950",
        };
    };

    const opcoesBlocosAuditoriaSistema = [
        { chave: "atividades", titulo: "Últimas atividades" },
        { chave: "eventos", titulo: "Eventos verificados" },
        { chave: "permissoes", titulo: "Permissões antigas da Auditoria" },
        { chave: "registros", titulo: "Registros detalhados" },
    ];

    const renderControlePersonalizacaoAuditoria = ({ chave, titulo, visivel, tamanho, tipo }) => {
        const mover = tipo === "cartas" ? moverCartaAuditoriaSistema : moverBlocoAuditoriaSistema;
        const alternar = tipo === "cartas" ? alternarCartaAuditoriaSistema : alternarBlocoAuditoriaSistema;
        const alterarTamanho = tipo === "cartas" ? alterarTamanhoCartaAuditoriaSistema : alterarTamanhoBlocoAuditoriaSistema;

        return (
            <div key={chave} className="rounded-3xl bg-white p-4 ring-1 ring-slate-200">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="text-sm font-black text-slate-950">{titulo}</p>
                        <p className="mt-1 text-xs text-slate-500">Controle de exibição, ordem e tamanho.</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={() => mover(chave, "cima")}
                            className="rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                        >
                            ↑
                        </button>
                        <button
                            type="button"
                            onClick={() => mover(chave, "baixo")}
                            className="rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                        >
                            ↓
                        </button>
                        <button
                            type="button"
                            onClick={() => alternar(chave)}
                            className={classNames(
                                "rounded-xl px-3 py-2 text-xs font-black uppercase ring-1",
                                visivel
                                    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                                    : "bg-red-50 text-red-700 ring-red-200"
                            )}
                        >
                            {visivel ? "Visível" : "Oculto"}
                        </button>
                    </div>
                </div>

                <div className="mt-3 grid gap-2 md:grid-cols-4">
                    {[
                        ["padrao", "Padrão"],
                        ["medio", "Médio"],
                        ["grande", "Grande"],
                        ["destaque", "Destaque"],
                    ].map(([valor, label]) => (
                        <button
                            key={valor}
                            type="button"
                            onClick={() => alterarTamanho(chave, valor)}
                            className={classNames(
                                "rounded-2xl px-3 py-2 text-xs font-black ring-1 transition",
                                tamanho === valor
                                    ? "bg-slate-950 text-white ring-slate-950"
                                    : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
                            )}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>
        );
    };

    const renderBlocoAuditoriaPersonalizado = (chave, conteudo) => {
        if (blocosVisiveisAuditoria[chave] === false) return null;

        return (
            <div className={classeTamanhoBlocoAuditoriaSistema(tamanhosBlocosAuditoria[chave])}>
                {conteudo}
            </div>
        );
    };

    const filtrosAtuaisRelatorioAuditoriaSistema = useMemo(
        () => ({
            busca,
            filtroAcao,
            filtroUsuario,
            filtroModulo,
            filtroCategoria,
            filtroNivel,
            filtroPeriodoInicio,
            filtroPeriodoFim,
        }),
        [busca, filtroAcao, filtroUsuario, filtroModulo, filtroCategoria, filtroNivel, filtroPeriodoInicio, filtroPeriodoFim]
    );

    const salvarFiltrosRelatorioAuditoriaSistema = () => {
        if (typeof window === "undefined" || !window.localStorage) return;

        try {
            window.localStorage.setItem(CHAVE_FILTROS_RELATORIO_AUDITORIA_SISTEMA, JSON.stringify(filtrosAtuaisRelatorioAuditoriaSistema));
            setVersaoFiltroSalvoRelatorioAuditoriaSistema((valor) => valor + 1);
            alert("Filtros da Auditoria do Sistema salvos.");
        } catch (error) {
            console.error("Erro ao salvar filtros da Auditoria do Sistema:", error);
            alert("Não foi possível salvar os filtros da Auditoria do Sistema.");
        }
    };

    const aplicarFiltrosSalvosRelatorioAuditoriaSistema = () => {
        const filtrosSalvos = carregarFiltrosSalvosRelatorioAuditoriaSistema();

        if (!filtrosSalvos) {
            alert("Nenhum filtro salvo encontrado para a Auditoria do Sistema.");
            return;
        }

        setBusca(filtrosSalvos.busca || "");
        setFiltroAcao(filtrosSalvos.filtroAcao || "Todas");
        setFiltroUsuario(filtrosSalvos.filtroUsuario || "Todos");
        setFiltroModulo(filtrosSalvos.filtroModulo || "Todos");
        setFiltroCategoria(filtrosSalvos.filtroCategoria || "Todas");
        setFiltroNivel(filtrosSalvos.filtroNivel || "Todos");
        setFiltroPeriodoInicio(filtrosSalvos.filtroPeriodoInicio || "");
        setFiltroPeriodoFim(filtrosSalvos.filtroPeriodoFim || "");
        alert("Filtros salvos aplicados na Auditoria do Sistema.");
    };

    const limparFiltrosSalvosRelatorioAuditoriaSistema = () => {
        if (typeof window === "undefined" || !window.localStorage) return;

        window.localStorage.removeItem(CHAVE_FILTROS_RELATORIO_AUDITORIA_SISTEMA);
        setVersaoFiltroSalvoRelatorioAuditoriaSistema((valor) => valor + 1);
        alert("Filtros salvos da Auditoria do Sistema removidos.");
    };

    const montarLinhasRelatorioAuditoriaSistema = () => registrosFiltrados.map((item) => {
        const origemAcesso = item.dados?.origemAcesso || {};
        const modulo = obterModuloAuditoriaSistema(item);
        const categoria = obterCategoriaAuditoriaSistema(item);
        const nivel = obterNivelAuditoriaSistema(item);

        return {
            id: item.id,
            dataHora: formatarDataHoraAuditoriaSistema(item.created_at),
            usuario: item.usuario_email || "Sistema / consulta pública",
            acaoTecnica: item.acao || "-",
            evento: obterRotuloAcaoAuditoriaSistema(item.acao),
            modulo: modulo || "-",
            categoria: categoria || "-",
            nivel: ROTULOS_NIVEIS_AUDITORIA_SISTEMA[nivel] || "Informação",
            nivelChave: nivel || "informacao",
            tabela: item.tabela || "-",
            registro: item.registro_id || "-",
            descricao: item.descricao || "Evento registrado",
            origem: origemAcesso.url || "-",
            pagina: origemAcesso.pagina || "-",
            navegador: origemAcesso.navegador || "-",
            plataforma: origemAcesso.plataforma || "-",
        };
    });

    const montarResumoRelatorioAuditoriaSistema = () => ({
        totalEventos: auditoria.length,
        eventosFiltrados: registrosFiltrados.length,
        acessos: auditoriaVerificada.filter((item) => String(item.acao || "").includes("ACESSO")).length,
        alteracoes: auditoriaVerificada.filter(ehAlteracaoAuditoriaSistema).length,
        seguranca: registrosFiltrados.filter((item) => obterNivelAuditoriaSistema(item) === "seguranca").length,
        criticos: registrosFiltrados.filter((item) => obterNivelAuditoriaSistema(item) === "critico").length,
        alertas: registrosFiltrados.filter((item) => obterNivelAuditoriaSistema(item) === "alerta").length,
    });

    const montarFiltrosRelatorioAuditoriaSistema = () => ({
        busca: busca || "-",
        acao: filtroAcao === "Todas" ? "Todas as ações" : filtroAcao,
        usuario: filtroUsuario === "Todos" ? "Todos os usuários" : filtroUsuario,
        modulo: filtroModulo === "Todos" ? "Todos os módulos" : filtroModulo,
        categoria: filtroCategoria === "Todas" ? "Todas as categorias" : filtroCategoria,
        nivel: filtroNivel === "Todos" ? "Todos os níveis" : ROTULOS_NIVEIS_AUDITORIA_SISTEMA[filtroNivel] || filtroNivel,
        periodo: filtroPeriodoInicio || filtroPeriodoFim
            ? `${filtroPeriodoInicio || "início"} até ${filtroPeriodoFim || "hoje"}`
            : "Todo o período carregado",
        limite: `${auditoria.length} registro(s) carregado(s)`,
    });

    const baixarCsvAuditoria = () => {
        const cabecalho = ["Data/Hora", "Usuário", "Ação", "Evento", "Módulo", "Categoria", "Nível", "Tabela", "Registro", "Descrição", "Origem do acesso", "Página", "Navegador", "Plataforma"];
        const linhas = montarLinhasRelatorioAuditoriaSistema().map((item) => [
            item.dataHora,
            item.usuario,
            item.acaoTecnica,
            item.evento,
            item.modulo,
            item.categoria,
            item.nivel,
            item.tabela,
            item.registro,
            item.descricao,
            item.origem,
            item.pagina,
            item.navegador,
            item.plataforma,
        ]);

        baixarCSV(`relatorio-auditoria-${new Date().toISOString().slice(0, 10)}.csv`, [cabecalho, ...linhas]);
    };

    const baixarPdfAuditoria = async () => {
        await baixarRelatorioAuditoriaSistemaPDF({
            nomeArquivo: `relatorio-auditoria-sistema-${new Date().toISOString().slice(0, 10)}.pdf`,
            titulo: "Relatório da Auditoria do Sistema",
            registros: montarLinhasRelatorioAuditoriaSistema(),
            resumo: montarResumoRelatorioAuditoriaSistema(),
            filtros: montarFiltrosRelatorioAuditoriaSistema(),
        });
    };

    const copiarResumoAuditoria = async () => {
        const totalPorNivel = registrosFiltrados.reduce((acc, item) => {
            const nivel = obterNivelAuditoriaSistema(item);
            acc[nivel] = (acc[nivel] || 0) + 1;
            return acc;
        }, {});

        const totalPorModulo = registrosFiltrados.reduce((acc, item) => {
            const modulo = obterModuloAuditoriaSistema(item) || "Não classificado";
            acc[modulo] = (acc[modulo] || 0) + 1;
            return acc;
        }, {});

        const totalPorCategoria = registrosFiltrados.reduce((acc, item) => {
            const categoria = obterCategoriaAuditoriaSistema(item) || "Não classificada";
            acc[categoria] = (acc[categoria] || 0) + 1;
            return acc;
        }, {});

        const resumo = [
            "Resumo da Auditoria do Sistema",
            `Gerado em: ${formatarDataHoraAuditoriaSistema(new Date().toISOString())}`,
            `Eventos carregados: ${auditoriaVerificada.length}`,
            `Eventos filtrados: ${registrosFiltrados.length}`,
            `Acessos: ${auditoriaVerificada.filter((item) => String(item.acao || "").includes("ACESSO")).length}`,
            `Alterações: ${auditoriaVerificada.filter(ehAlteracaoAuditoriaSistema).length}`,
            "",
            "Eventos por nível:",
            ...Object.entries(totalPorNivel).map(([nivel, total]) => `- ${ROTULOS_NIVEIS_AUDITORIA_SISTEMA[nivel] || nivel}: ${total}`),
            "",
            "Eventos por módulo:",
            ...Object.entries(totalPorModulo).map(([modulo, total]) => `- ${modulo}: ${total}`),
            "",
            "Eventos por categoria:",
            ...Object.entries(totalPorCategoria).map(([categoria, total]) => `- ${categoria}: ${total}`),
        ].join("\n");

        try {
            const copiado = await copiarTextoAuditoriaSistema(resumo);
            setMensagemResumoAuditoria(copiado ? "Resumo copiado para a área de transferência." : "Não foi possível copiar automaticamente.");
        } catch (error) {
            setMensagemResumoAuditoria(error?.message || "Não foi possível copiar o resumo.");
        } finally {
            if (typeof window !== "undefined") {
                window.setTimeout(() => setMensagemResumoAuditoria(""), 4000);
            }
        }
    };

    const renderLinhaAtividadeAuditoria = ({ chave, titulo, subtitulo, data }) => (
        <div key={chave} className="rounded-2xl bg-white p-3 ring-1 ring-slate-200">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <p className="break-words text-sm font-black text-slate-950">{titulo}</p>
                    <p className="mt-1 break-words text-xs leading-relaxed text-slate-500">{subtitulo}</p>
                </div>
                <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-500 ring-1 ring-slate-200">
                    {formatarDataHoraAuditoriaSistema(data)}
                </span>
            </div>
        </div>
    );

    const renderAtividadesAuditoriaSistema = () => (
        <div className={classNames("grid gap-5", ultimosEmailsAuditoria.length > 0 ? "lg:grid-cols-2" : "lg:grid-cols-1")}>
            <CardRecolhivel
                titulo="Últimos acessos"
                subtitulo="Entradas recentes, consultas públicas e abertura da Auditoria."
                contador={ultimosAcessosAuditoria.length}
                defaultOpen={false}
            >
                <div className="space-y-3">
                    {ultimosAcessosAuditoria.length === 0 ? (
                        <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                            Nenhum acesso recente encontrado no limite carregado.
                        </p>
                    ) : (
                        ultimosAcessosAuditoria.map((item) =>
                            renderLinhaAtividadeAuditoria({
                                chave: item.id,
                                titulo: obterRotuloAcaoAuditoriaSistema(item.acao),
                                subtitulo: `${item.usuario_email || "Sistema / consulta pública"} · ${item.descricao || "Acesso registrado"}`,
                                data: item.created_at,
                            })
                        )
                    )}
                </div>
            </CardRecolhivel>

            {ultimosEmailsAuditoria.length > 0 && (
                <CardRecolhivel
                    titulo="Últimos e-mails enviados"
                    subtitulo="Eventos de envio registrados pela auditoria do sistema."
                    contador={ultimosEmailsAuditoria.length}
                    defaultOpen={false}
                >
                    <div className="space-y-3">
                        {ultimosEmailsAuditoria.map((email) =>
                            renderLinhaAtividadeAuditoria({
                                chave: email.id,
                                titulo: email.assunto || email.tipo_alerta || "E-mail registrado",
                                subtitulo: `${email.destinatario || "Destinatário não informado"} · ${email.status_envio || "Status não informado"}`,
                                data: email.data_envio,
                            })
                        )}
                    </div>
                </CardRecolhivel>
            )}
        </div>
    );

    const agoraHeroAuditoriaSistema = new Date();
    const dataHeroAuditoriaSistema = new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
    }).format(agoraHeroAuditoriaSistema);
    const diaSemanaHeroAuditoriaSistema = new Intl.DateTimeFormat("pt-BR", {
        weekday: "long",
    }).format(agoraHeroAuditoriaSistema);
    const horaHeroAuditoriaSistema = new Intl.DateTimeFormat("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
    }).format(agoraHeroAuditoriaSistema);

    return (
        <div>
            <Header
                titulo="Auditoria do Sistema"
                subtitulo={null}
                acao={
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => setMostrarPersonalizacaoAuditoria((atual) => !atual)}
                            className={classNames(
                                "inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold ring-1",
                                mostrarPersonalizacaoAuditoria
                                    ? "bg-slate-950 text-white ring-slate-950"
                                    : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
                            )}
                        >
                            Personalizar painel
                        </button>

                        <button
                            onClick={onAtualizar}
                            className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                        >
                            <RefreshCw className="h-4 w-4" />
                            Atualizar registros
                        </button>

                        <button
                            onClick={onBloquear}
                            className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                        >
                            <Lock className="h-4 w-4" />
                            Sair da área restrita
                        </button>

                        <button
                            type="button"
                            onClick={copiarResumoAuditoria}
                            className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                        >
                            Copiar resumo
                        </button>

                        <button
                            type="button"
                            onClick={baixarCsvAuditoria}
                            className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                        >
                            Baixar CSV
                        </button>

                        <button
                            type="button"
                            onClick={baixarPdfAuditoria}
                            className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
                        >
                            <Download className="h-4 w-4" />
                            Baixar PDF auditoria
                        </button>
                    </div>
                }
            />

            <section
                data-auditoria-sistema-hero="true"
                className="relative mb-6 overflow-hidden rounded-[22px] border border-[#E5E9EF] bg-[#111827] shadow-[0_10px_28px_rgba(26,35,50,0.12)]"
            >
                <div
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-100"
                    style={{
                        backgroundImage: `url(${dashboardHeroBackground})`,
                        backgroundPosition: "center center",
                        backgroundSize: "cover",
                    }}
                />
                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(17,24,39,0.36)_0%,rgba(17,24,39,0.24)_34%,rgba(17,24,39,0.10)_68%,rgba(17,24,39,0.08)_100%)]" />

                <div className="relative flex min-h-[155px] flex-col justify-between gap-5 px-6 py-6 text-white lg:flex-row lg:items-center">
                    <div className="min-w-0" style={{ textShadow: "0 2px 10px rgba(0,0,0,0.65)" }}>
                        <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-300">
                            SafeScan Brasil
                        </p>
                        <h2 className="mt-2 text-xl font-black leading-tight text-white md:text-2xl">
                            Auditoria do Sistema
                        </h2>
                        <p className="mt-2 max-w-3xl text-base font-bold text-slate-200 md:text-lg">
                            Histórico de rastreabilidade das ações realizadas no sistema, incluindo acessos, alterações, exclusões, uploads, QR Code e eventos administrativos.
                        </p>
                        <div className="mt-5 h-1 w-14 rounded-full bg-[#1E7C3A]" />
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm font-black text-white shadow-[0_8px_24px_rgba(0,0,0,0.22)] backdrop-blur">
                        <div className="flex flex-wrap items-center gap-2">
                            <CalendarClock className="h-4 w-4 text-emerald-300" />
                            <span>{dataHeroAuditoriaSistema}</span>
                            <span className="text-emerald-300">•</span>
                            <span className="capitalize">{diaSemanaHeroAuditoriaSistema}</span>
                            <span className="text-emerald-300">•</span>
                            <span>{horaHeroAuditoriaSistema}</span>
                        </div>
                    </div>
                </div>
            </section>

            {mensagemResumoAuditoria && (
                <div className="mb-5 rounded-3xl bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-700 ring-1 ring-emerald-200">
                    {mensagemResumoAuditoria}
                </div>
            )}

            {mostrarPersonalizacaoAuditoria && (
                <div className="mb-5 rounded-[2rem] bg-blue-50 p-5 ring-1 ring-blue-100">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <p className="text-lg font-black text-blue-950">Personalizar painel da Auditoria do sistema</p>
                            <p className="mt-1 text-sm text-blue-700">Escolha visibilidade, ordem e tamanho dos cards e quadros.</p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => setAbaPersonalizacaoAuditoria("cartas")}
                                className={classNames(
                                    "rounded-2xl px-4 py-2 text-sm font-black ring-1",
                                    abaPersonalizacaoAuditoria === "cartas"
                                        ? "bg-slate-950 text-white ring-slate-950"
                                        : "bg-white text-slate-700 ring-blue-100"
                                )}
                            >
                                Cartas principais
                            </button>
                            <button
                                type="button"
                                onClick={() => setAbaPersonalizacaoAuditoria("blocos")}
                                className={classNames(
                                    "rounded-2xl px-4 py-2 text-sm font-black ring-1",
                                    abaPersonalizacaoAuditoria === "blocos"
                                        ? "bg-slate-950 text-white ring-slate-950"
                                        : "bg-white text-slate-700 ring-blue-100"
                                )}
                            >
                                Organização dos quadros
                            </button>
                            <button
                                type="button"
                                onClick={restaurarPersonalizacaoAuditoriaSistema}
                                className="rounded-2xl bg-white px-4 py-2 text-sm font-black text-slate-700 ring-1 ring-blue-100 hover:bg-blue-50"
                            >
                                Restaurar
                            </button>
                        </div>
                    </div>

                    <div className="mt-4 grid gap-3 lg:grid-cols-2">
                        {abaPersonalizacaoAuditoria === "cartas"
                            ? ordemCartasAuditoria
                                .map((chave) => cartasResumoAuditoriaSistema.find((carta) => carta.chave === chave))
                                .filter(Boolean)
                                .map((carta) => renderControlePersonalizacaoAuditoria({
                                    chave: carta.chave,
                                    titulo: carta.titulo,
                                    visivel: cartasVisiveisAuditoria[carta.chave] !== false,
                                    tamanho: tamanhosCartasAuditoria[carta.chave] || "padrao",
                                    tipo: "cartas",
                                }))
                            : ordemBlocosAuditoria
                                .map((chave) => opcoesBlocosAuditoriaSistema.find((bloco) => bloco.chave === chave))
                                .filter(Boolean)
                                .map((bloco) => renderControlePersonalizacaoAuditoria({
                                    chave: bloco.chave,
                                    titulo: bloco.titulo,
                                    visivel: blocosVisiveisAuditoria[bloco.chave] !== false,
                                    tamanho: tamanhosBlocosAuditoria[bloco.chave] || "destaque",
                                    tipo: "blocos",
                                }))}
                    </div>
                </div>
            )}

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {cartasResumoAuditoriaOrdenadas
                    .filter((carta) => cartasVisiveisAuditoria[carta.chave] !== false)
                    .map((carta) => {
                        const Icon = carta.icon || Activity;
                        const tema = obterTemaCartaAuditoriaSistema(carta.chave);

                        return (
                            <div key={carta.chave} className={classeTamanhoCartaAuditoriaSistema(tamanhosCartasAuditoria[carta.chave])}>
                                <div
                                    className={classNames(
                                        "group relative h-full min-h-[5.6rem] overflow-hidden rounded-[22px] border bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(246,249,252,0.96)_100%)] px-3 py-2 shadow-[0_10px_26px_rgba(26,35,50,0.08)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(26,35,50,0.13)]",
                                        tema.borda
                                    )}
                                >
                                    <span className={classNames("absolute inset-x-0 top-0 h-1 bg-gradient-to-r", tema.faixa)} />
                                    <div className="flex min-h-0 flex-1 items-center justify-center gap-2 py-1">
                                        <div className={classNames("flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl shadow-sm ring-1", tema.icone)}>
                                            <Icon className="h-4 w-4" />
                                        </div>
                                        <div className="flex min-w-0 flex-1 flex-col text-center">
                                            <p className={classNames("texto-quebra-segura text-[11px] font-black uppercase tracking-[0.08em] leading-tight", tema.etiqueta)}>{carta.titulo}</p>
                                            <p className={classNames("texto-quebra-segura text-2xl font-black leading-tight", tema.valor)}>{carta.valor}</p>
                                            <p className="texto-quebra-segura text-[11px] font-semibold leading-tight text-slate-500">{carta.detalhe}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
            </div>

            <div className="mt-5 grid gap-5 xl:grid-cols-4">
                {renderBlocoAuditoriaPersonalizado("atividades", renderAtividadesAuditoriaSistema())}

                {renderBlocoAuditoriaPersonalizado("registros", (
                    <CardRecolhivel
                className="mt-5"
                titulo="Registros detalhados da auditoria"
                subtitulo="Filtros por texto, ação, usuário, módulo, categoria, nível e período. Carregamento limitado para manter a tela leve."
                contador={registrosFiltrados.length}
                defaultOpen
            >
                <div className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200">
                    <div className="mb-3 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <p className="text-xs font-black uppercase tracking-wide text-slate-500">Filtros salvos do relatório</p>
                            <p className="mt-1 text-xs font-semibold text-slate-500">Salve uma combinação de filtros para reutilizar na Auditoria do Sistema.</p>
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <button
                                type="button"
                                onClick={salvarFiltrosRelatorioAuditoriaSistema}
                                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-wide text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-100"
                            >
                                Salvar filtro
                            </button>
                            <button
                                type="button"
                                onClick={aplicarFiltrosSalvosRelatorioAuditoriaSistema}
                                disabled={!filtrosSalvosRelatorioAuditoriaSistemaDisponiveis}
                                className={classNames(
                                    "rounded-2xl border px-4 py-2 text-xs font-black uppercase tracking-wide shadow-sm transition",
                                    filtrosSalvosRelatorioAuditoriaSistemaDisponiveis
                                        ? "border-slate-900 bg-slate-900 text-white hover:bg-slate-800"
                                        : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                                )}
                            >
                                Aplicar filtro salvo
                            </button>
                            <button
                                type="button"
                                onClick={limparFiltrosSalvosRelatorioAuditoriaSistema}
                                disabled={!filtrosSalvosRelatorioAuditoriaSistemaDisponiveis}
                                className={classNames(
                                    "rounded-2xl border px-4 py-2 text-xs font-black uppercase tracking-wide shadow-sm transition",
                                    filtrosSalvosRelatorioAuditoriaSistemaDisponiveis
                                        ? "border-red-100 bg-white text-red-600 hover:bg-red-50"
                                        : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                                )}
                            >
                                Limpar filtro salvo
                            </button>
                        </div>
                    </div>

                    <div className="grid gap-3 xl:grid-cols-[minmax(260px,1.4fr)_repeat(4,minmax(160px,1fr))]">
                        <div className="relative xl:col-span-2">
                            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                value={busca}
                                onChange={(e) => setBusca(e.target.value)}
                                placeholder="Buscar por usuário, evento, módulo, registro ou descrição"
                                className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                            />
                        </div>

                        <select
                            value={filtroAcao}
                            onChange={(e) => setFiltroAcao(e.target.value)}
                            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                        >
                            <option value="Todas">Todas as ações</option>
                            {acoes.map((acao) => (
                                <option key={acao} value={acao}>
                                    {acao}
                                </option>
                            ))}
                        </select>

                        <select
                            value={filtroUsuario}
                            onChange={(e) => setFiltroUsuario(e.target.value)}
                            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                        >
                            <option value="Todos">Todos os usuários</option>
                            {usuariosAuditoriaFiltro.map((usuarioFiltro) => (
                                <option key={usuarioFiltro} value={usuarioFiltro}>
                                    {usuarioFiltro}
                                </option>
                            ))}
                        </select>

                        <select
                            value={filtroModulo}
                            onChange={(e) => setFiltroModulo(e.target.value)}
                            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                        >
                            <option value="Todos">Todos os módulos</option>
                            {modulosAuditoriaFiltro.map((moduloFiltro) => (
                                <option key={moduloFiltro} value={moduloFiltro}>
                                    {moduloFiltro}
                                </option>
                            ))}
                        </select>

                        <select
                            value={filtroCategoria}
                            onChange={(e) => setFiltroCategoria(e.target.value)}
                            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                        >
                            <option value="Todas">Todas as categorias</option>
                            {categoriasAuditoriaFiltro.map((categoriaFiltro) => (
                                <option key={categoriaFiltro} value={categoriaFiltro}>
                                    {categoriaFiltro}
                                </option>
                            ))}
                        </select>

                        <select
                            value={filtroNivel}
                            onChange={(e) => setFiltroNivel(e.target.value)}
                            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                        >
                            {Object.entries(ROTULOS_NIVEIS_AUDITORIA_SISTEMA).map(([valor, rotulo]) => (
                                <option key={valor} value={valor}>
                                    {rotulo}
                                </option>
                            ))}
                        </select>

                        <input
                            type="date"
                            value={filtroPeriodoInicio}
                            onChange={(e) => setFiltroPeriodoInicio(e.target.value)}
                            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                        />

                        <input
                            type="date"
                            value={filtroPeriodoFim}
                            onChange={(e) => setFiltroPeriodoFim(e.target.value)}
                            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                        />

                        <button
                            type="button"
                            onClick={() => {
                                setBusca("");
                                setFiltroAcao("Todas");
                                setFiltroUsuario("Todos");
                                setFiltroModulo("Todos");
                                setFiltroCategoria("Todas");
                                setFiltroNivel("Todos");
                                setFiltroPeriodoInicio("");
                                setFiltroPeriodoFim("");
                            }}
                            className="rounded-2xl bg-white px-4 py-3 text-sm font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                        >
                            Limpar filtros
                        </button>
                    </div>
                </div>

                <div className="mt-4 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <p className="text-sm font-bold text-slate-800">
                                Exibindo {registrosDetalhadosVisiveis.length} de {registrosFiltrados.length} registro(s) filtrado(s).
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                                A lista mostra inicialmente {LIMITE_REGISTROS_DETALHADOS_INICIAL} registros para evitar uma tela muito longa. Use o botão abaixo somente quando precisar investigar mais eventos.
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {existemMaisRegistrosDetalhados && (
                                <button
                                    type="button"
                                    onClick={() => setLimiteRegistrosDetalhados((atual) => Math.min(atual + 50, registrosFiltrados.length))}
                                    className="rounded-2xl bg-slate-950 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
                                >
                                    Mostrar mais 50
                                </button>
                            )}

                            {registrosDetalhadosVisiveis.length > LIMITE_REGISTROS_DETALHADOS_INICIAL && (
                                <button
                                    type="button"
                                    onClick={() => setLimiteRegistrosDetalhados(LIMITE_REGISTROS_DETALHADOS_INICIAL)}
                                    className="rounded-2xl bg-white px-4 py-2 text-xs font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                                >
                                    Recolher lista
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-5 max-h-[42rem] space-y-3 overflow-y-auto pr-1 scrollbar-discreta">
                    {carregando && (
                        <div className="rounded-3xl bg-slate-50 p-6 text-center text-sm text-slate-500">
                            Carregando auditoria...
                        </div>
                    )}

                    {!carregando && registrosFiltrados.length === 0 && (
                        <div className="rounded-3xl border border-dashed border-slate-300 p-8 text-center">
                            <Database className="mx-auto h-10 w-10 text-slate-300" />
                            <h3 className="mt-3 font-bold text-slate-900">Nenhum evento encontrado</h3>
                            <p className="mt-1 text-sm text-slate-500">
                                Quando houver acesso ou alteração no sistema, os eventos aparecerão aqui.
                            </p>
                        </div>
                    )}

                    {registrosDetalhadosVisiveis.map((item) => {
                        const origemAcesso = item.dados?.origemAcesso || {};
                        const temOrigemAcesso = Boolean(origemAcesso.url || origemAcesso.pagina || origemAcesso.navegador || origemAcesso.plataforma);
                        const dadosExtras = item.dados && typeof item.dados === "object"
                            ? Object.fromEntries(Object.entries(item.dados).filter(([chave]) => chave !== "origemAcesso"))
                            : {};
                        const temDadosExtras = Object.keys(dadosExtras).length > 0;
                        const detalhesAberto = Boolean(detalhesAuditoriaAbertos[item.id]);
                        const podeAbrirDetalhes = temOrigemAcesso || temDadosExtras || item.registro_id;
                        const modulo = obterModuloAuditoriaSistema(item);
                        const categoria = obterCategoriaAuditoriaSistema(item);
                        const nivel = obterNivelAuditoriaSistema(item);
                        const rotuloAcao = obterRotuloAcaoAuditoriaSistema(item.acao);

                        return (
                            <div key={item.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                                <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-bold text-white" title={item.acao || "Evento"}>
                                                {rotuloAcao}
                                            </span>
                                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                                                {modulo}
                                            </span>
                                            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-100">
                                                {categoria}
                                            </span>
                                            <span className={classNames("rounded-full px-3 py-1 text-xs font-semibold ring-1", classeNivelAuditoriaSistema(nivel))}>
                                                {ROTULOS_NIVEIS_AUDITORIA_SISTEMA[nivel] || "Informação"}
                                            </span>
                                            {item.tabela && (
                                                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500 ring-1 ring-slate-200">
                                                    {item.tabela}
                                                </span>
                                            )}
                                        </div>

                                        <p className="mt-3 font-bold text-slate-950">{item.descricao || "Evento registrado"}</p>
                                        <p className="mt-1 text-sm text-slate-500">
                                            Usuário: <strong>{item.usuario_email || "Sistema / consulta pública"}</strong>
                                        </p>
                                    </div>

                                    <div className="flex shrink-0 flex-col gap-2 lg:items-end">
                                        <p className="text-sm font-semibold text-slate-500">
                                            {item.created_at ? new Date(item.created_at).toLocaleString("pt-BR") : "-"}
                                        </p>

                                        {podeAbrirDetalhes && (
                                            <button
                                                type="button"
                                                onClick={() => alternarDetalhesAuditoria(item.id)}
                                                className="inline-flex items-center justify-center gap-1 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-200"
                                            >
                                                {detalhesAberto ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                                {detalhesAberto ? "Fechar detalhes" : "Abrir detalhes"}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {detalhesAberto && (
                                    <div className="mt-3 grid gap-3 lg:grid-cols-2">
                                        <div className="rounded-2xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-500 ring-1 ring-slate-100">
                                            <p className="font-bold text-slate-700">Informações do registro</p>
                                            <p className="mt-1 break-words">
                                                <strong>Registro:</strong> {item.registro_id || "-"}
                                            </p>
                                            <p className="mt-1 break-words">
                                                <strong>Ação técnica:</strong> {item.acao || "-"}
                                            </p>
                                            <p className="break-words">
                                                <strong>Tabela:</strong> {item.tabela || "-"}
                                            </p>
                                            <p className="break-words">
                                                <strong>Ação:</strong> {item.acao || "-"}
                                            </p>
                                            <p className="break-words">
                                                <strong>Módulo:</strong> {modulo}
                                            </p>
                                            <p className="break-words">
                                                <strong>Nível:</strong> {ROTULOS_NIVEIS_AUDITORIA_SISTEMA[nivel] || "Informação"}
                                            </p>
                                        </div>

                                        {temOrigemAcesso && (
                                            <div className="rounded-2xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-500 ring-1 ring-slate-100">
                                                <p className="font-bold text-slate-700">Origem do acesso</p>
                                                <p className="mt-1 break-words">
                                                    <strong>URL:</strong> {origemAcesso.url || "-"}
                                                </p>
                                                <p className="break-words">
                                                    <strong>Página:</strong> {origemAcesso.pagina || "-"}
                                                </p>
                                                <p>
                                                    <strong>Navegador:</strong> {origemAcesso.navegador || "-"}
                                                    {origemAcesso.plataforma ? ` · Plataforma: ${origemAcesso.plataforma}` : ""}
                                                    {origemAcesso.idioma ? ` · Idioma: ${origemAcesso.idioma}` : ""}
                                                </p>
                                            </div>
                                        )}

                                        {temDadosExtras && (
                                            <div className="rounded-2xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-500 ring-1 ring-slate-100 lg:col-span-2">
                                                <p className="font-bold text-slate-700">Outras informações</p>
                                                <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-white p-3 text-[11px] text-slate-600 ring-1 ring-slate-100 scrollbar-discreta">
                                                    {JSON.stringify(dadosExtras, null, 2)}
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {!carregando && auditoriaVerificada.length > 0 && (
                        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-4">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                <div>
                                    <p className="text-sm font-bold text-slate-800">
                                        Registros carregados: {auditoriaVerificada.length}
                                    </p>
                                    <p className="mt-1 text-xs text-slate-500">
                                        {existeMaisAuditoria
                                            ? "Existem registros antigos disponíveis. Carregue mais somente quando precisar consultar histórico anterior."
                                            : "Todos os registros disponíveis para esta consulta já foram carregados."}
                                    </p>
                                </div>

                                {existeMaisAuditoria ? (
                                    <button
                                        type="button"
                                        onClick={onCarregarMaisAuditoria}
                                        disabled={carregandoMaisAuditoria || !onCarregarMaisAuditoria}
                                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                                    >
                                        <RefreshCw className={classNames("h-4 w-4", carregandoMaisAuditoria && "animate-spin")} />
                                        {carregandoMaisAuditoria ? "Carregando..." : "Carregar mais registros"}
                                    </button>
                                ) : (
                                    <span className="inline-flex items-center justify-center rounded-2xl bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
                                        Histórico carregado
                                    </span>
                                )}
                            </div>
                        </div>
                    )}
                </div>
                    </CardRecolhivel>
                ))}

{renderBlocoAuditoriaPersonalizado("eventos", (
                    <CardRecolhivel
                className="mt-5"
                titulo="Eventos verificados pela Auditoria de sistema"
                subtitulo="Habilite ou desabilite quais tipos de evento devem ser registrados e exibidos no relatório. Alterações feitas aqui também ficam registradas na Auditoria do Sistema."
                contador={`${eventosHabilitadosAuditoria}/${eventosAuditoriaSistema.length}`}
                defaultOpen={false}
                acao={(
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => definirTodosEventosAuditoria(true)}
                            disabled={salvandoConfigEventosAuditoria}
                            className="rounded-2xl bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            Habilitar todos
                        </button>
                        <button
                            type="button"
                            onClick={() => definirTodosEventosAuditoria(false)}
                            disabled={salvandoConfigEventosAuditoria}
                            className="rounded-2xl bg-red-50 px-4 py-2 text-sm font-bold text-red-700 ring-1 ring-red-200 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            Desabilitar todos
                        </button>
                        <button
                            type="button"
                            onClick={restaurarPadraoEventosAuditoria}
                            disabled={salvandoConfigEventosAuditoria}
                            className="rounded-2xl bg-slate-50 px-4 py-2 text-sm font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            Restaurar padrão
                        </button>
                    </div>
                )}
            >
                <div className="mb-4 rounded-3xl bg-slate-50 p-4 text-sm text-slate-600 ring-1 ring-slate-200">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                            <p className="font-black text-slate-950">Status da configuração</p>
                            <p className="mt-1 text-xs leading-relaxed text-slate-500">
                                Origem atual: <strong>{origemConfigEventosAuditoria === "supabase" ? "Supabase" : "Local do navegador"}</strong>
                                {carregandoConfigEventosAuditoria ? " · carregando..." : ""}
                                {salvandoConfigEventosAuditoria ? " · salvando..." : ""}
                            </p>
                        </div>
                        <span className={classNames(
                            "w-fit rounded-full px-3 py-1 text-xs font-black uppercase ring-1",
                            origemConfigEventosAuditoria === "supabase"
                                ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                                : "bg-orange-50 text-orange-700 ring-orange-200"
                        )}>
                            {origemConfigEventosAuditoria === "supabase" ? "Sincronizado" : "Local"}
                        </span>
                    </div>
                    {mensagemConfigEventosAuditoria && (
                        <p className="mt-3 rounded-2xl bg-white px-3 py-2 text-xs font-semibold text-slate-500 ring-1 ring-slate-200">
                            {mensagemConfigEventosAuditoria}
                        </p>
                    )}
                </div>

                <div className="mb-4 grid gap-3 md:grid-cols-3">
                    <div className="rounded-3xl bg-emerald-50 p-4 ring-1 ring-emerald-200">
                        <p className="text-xs font-black uppercase tracking-wide text-emerald-700">Habilitados</p>
                        <p className="mt-2 text-2xl font-black text-emerald-800">{eventosHabilitadosAuditoria}</p>
                    </div>
                    <div className="rounded-3xl bg-red-50 p-4 ring-1 ring-red-200">
                        <p className="text-xs font-black uppercase tracking-wide text-red-700">Desabilitados</p>
                        <p className="mt-2 text-2xl font-black text-red-800">{eventosDesabilitadosAuditoria}</p>
                    </div>
                    <div className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200">
                        <p className="text-xs font-black uppercase tracking-wide text-slate-500">Eventos carregados</p>
                        <p className="mt-2 text-2xl font-black text-slate-950">{auditoria.length}</p>
                    </div>
                </div>

                <div className="grid gap-3 lg:grid-cols-2">
                    {eventosAuditoriaSistema.map((evento) => (
                        <div
                            key={evento.chave}
                            className={classNames(
                                "rounded-3xl border p-4 transition",
                                evento.habilitado
                                    ? "border-emerald-200 bg-emerald-50/70"
                                    : "border-red-200 bg-red-50/70"
                            )}
                        >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black uppercase text-slate-500 ring-1 ring-slate-200">
                                            {evento.categoria}
                                        </span>
                                        <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-slate-500 ring-1 ring-slate-200">
                                            {evento.total} registro(s)
                                        </span>
                                    </div>
                                    <p className="mt-2 break-words text-sm font-black text-slate-950">{evento.label}</p>
                                    <p className="mt-1 text-xs leading-relaxed text-slate-500">{evento.descricao}</p>
                                    <p className="mt-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">Ação: {evento.chave}</p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => alternarEventoAuditoria(evento.chave)}
                                    disabled={salvandoConfigEventosAuditoria}
                                    className={classNames(
                                        "shrink-0 rounded-2xl px-4 py-2 text-xs font-black uppercase ring-1 disabled:cursor-not-allowed disabled:opacity-60",
                                        evento.habilitado
                                            ? "bg-emerald-100 text-emerald-700 ring-emerald-200 hover:bg-emerald-200"
                                            : "bg-red-100 text-red-700 ring-red-200 hover:bg-red-200"
                                    )}
                                >
                                    {evento.habilitado ? "Habilitado" : "Desabilitado"}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <p className="mt-4 rounded-2xl bg-blue-50 p-3 text-xs leading-relaxed text-blue-700 ring-1 ring-blue-100">
                    Eventos desabilitados deixam de aparecer nos filtros, cards, CSV e relatórios. Quando a configuração estiver aplicada, novos eventos desabilitados também deixam de ser gravados pela Auditoria do Sistema.
                </p>
                    </CardRecolhivel>
                ))}

                

{renderBlocoAuditoriaPersonalizado("permissoes", (
                    <CardRecolhivel
                className="mt-5"
                titulo="Permissões da Auditoria de sistema"
                subtitulo="Libere ou bloqueie diretamente pelo sistema quem pode acessar somente a Auditoria de sistema. Dashboard Auditoria e Nova Auditoria continuam liberados para todos."
                contador={usuariosAuditoria.length}
                defaultOpen={false}
                acao={(
                    <button
                        type="button"
                        onClick={carregarUsuariosAuditoria}
                        disabled={carregandoUsuariosAuditoria}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-60"
                    >
                        <RefreshCw className={classNames("h-4 w-4", carregandoUsuariosAuditoria ? "animate-spin" : "")} />
                        {carregandoUsuariosAuditoria ? "Carregando..." : "Carregar usuários"}
                    </button>
                )}
            >
                <form onSubmit={salvarUsuarioAuditoriaTela} className="grid gap-3 xl:grid-cols-[1fr_1fr_1fr_auto]">
                    <input
                        type="email"
                        value={novoUsuarioAuditoria.email}
                        onChange={(e) => setNovoUsuarioAuditoria({ ...novoUsuarioAuditoria, email: e.target.value })}
                        placeholder="E-mail do usuário"
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                    />

                    <input
                        value={novoUsuarioAuditoria.nome}
                        onChange={(e) => setNovoUsuarioAuditoria({ ...novoUsuarioAuditoria, nome: e.target.value })}
                        placeholder="Nome"
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                    />

                    <input
                        value={novoUsuarioAuditoria.funcao}
                        onChange={(e) => setNovoUsuarioAuditoria({ ...novoUsuarioAuditoria, funcao: e.target.value })}
                        placeholder="Função"
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                    />

                    <button
                        type="submit"
                        disabled={salvandoUsuarioAuditoria}
                        className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                    >
                        {salvandoUsuarioAuditoria ? "Salvando..." : "Liberar Auditoria de sistema"}
                    </button>
                </form>

                <div className="mt-4 space-y-2">
                    {usuariosAuditoria.length === 0 && !carregandoUsuariosAuditoria && (
                        <div className="rounded-3xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                            Clique em <strong>Carregar usuários</strong> para visualizar quem tem acesso à Auditoria de sistema.
                        </div>
                    )}

                    {usuariosAuditoria.map((usuarioAutorizado) => (
                        <div
                            key={usuarioAutorizado.id}
                            className={classNames(
                                "rounded-3xl border p-4",
                                usuarioAutorizado.pode_acessar_auditoria
                                    ? "border-emerald-200 bg-emerald-50"
                                    : "border-red-200 bg-red-50"
                            )}
                        >
                            <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="break-words font-bold text-slate-950">{usuarioAutorizado.email}</p>
                                        <span
                                            className={classNames(
                                                "rounded-full px-3 py-1 text-xs font-bold ring-1",
                                                usuarioAutorizado.pode_acessar_auditoria
                                                    ? "bg-emerald-100 text-emerald-700 ring-emerald-200"
                                                    : "bg-red-100 text-red-700 ring-red-200"
                                            )}
                                        >
                                            {usuarioAutorizado.pode_acessar_auditoria ? "Auditoria de sistema liberada" : "Auditoria de sistema bloqueada"}
                                        </span>
                                    </div>

                                    <p className="mt-1 text-sm text-slate-500">
                                        {usuarioAutorizado.nome || "Nome não informado"} · {usuarioAutorizado.funcao || "Função não informada"}
                                    </p>
                                    <p className="mt-1 text-xs font-semibold text-slate-500">
                                        Perfil: {usuarioAutorizado.perfil || "usuario"} · Usuário {usuarioAutorizado.ativo ? "ativo" : "inativo"}
                                        {usuarioAutorizado.acesso_global ? " · Administrador global" : ""}
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => alternarUsuarioAuditoriaTela(usuarioAutorizado)}
                                    disabled={alterandoUsuarioAuditoria === usuarioAutorizado.id}
                                    className={classNames(
                                        "whitespace-nowrap rounded-2xl px-4 py-2 text-sm font-semibold ring-1 disabled:opacity-60",
                                        usuarioAutorizado.pode_acessar_auditoria
                                            ? "bg-red-50 text-red-700 ring-red-200 hover:bg-red-100"
                                            : "bg-emerald-50 text-emerald-700 ring-emerald-200 hover:bg-emerald-100"
                                    )}
                                >
                                    {alterandoUsuarioAuditoria === usuarioAutorizado.id
                                        ? "Atualizando..."
                                        : usuarioAutorizado.pode_acessar_auditoria
                                            ? "Bloquear Auditoria de sistema"
                                            : "Liberar Auditoria de sistema"}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <p className="mt-3 rounded-2xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-500">
                    Use esta área para liberar ou bloquear somente a Auditoria de sistema sem editar SQL manualmente. O Dashboard Auditoria e a Nova Auditoria permanecem disponíveis para todos os usuários logados.
                </p>
                    </CardRecolhivel>
                ))}

                {STORAGE_AUDITORIA_EXIBICAO_HABILITADA && renderBlocoAuditoriaPersonalizado("storage", (
                    <CardRecolhivel
                className="mt-5"
                titulo="Arquivos salvos no Storage"
                subtitulo="Controle de capacidade, vínculos, tipos de documentos, maiores arquivos e uploads recentes."
                contador={arquivosStorageAuditoria.length}
                defaultOpen={false}
                acao={(
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={carregarStorageAuditoria}
                            disabled={carregandoStorageAuditoria || limpandoStorageAuditoria}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                        >
                            <Database className="h-4 w-4" />
                            {carregandoStorageAuditoria
                                ? "Carregando..."
                                : arquivosStorageAuditoria.length > 0
                                    ? "Atualizar arquivos"
                                    : "Carregar arquivos"}
                        </button>

                        <button
                            type="button"
                            onClick={limparArquivosStorageSemVinculoFiltrados}
                            disabled={
                                carregandoStorageAuditoria ||
                                limpandoStorageAuditoria ||
                                arquivosStorageFiltradosSemVinculo.length === 0 ||
                                !onExcluirArquivoStorage ||
                                bloqueioLimparArquivosStorageSistema.bloqueado
                            }
                            title={bloqueioLimparArquivosStorageSistema.bloqueado ? bloqueioLimparArquivosStorageSistema.mensagem : "Exclui somente arquivos sem vínculo exibidos pelo filtro atual"}
                            className="inline-flex items-center justify-center rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                        >
                            {limpandoStorageAuditoria
                                ? `Limpando ${progressoLimpezaStorage.atual}/${progressoLimpezaStorage.total}`
                                : `Limpar sem vínculo (${arquivosStorageFiltradosSemVinculo.length})`}
                        </button>
                    </div>
                )}
            >
                {bloqueioLimparArquivosStorageSistema.bloqueado && (
                    <div className="mb-4 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
                        {bloqueioLimparArquivosStorageSistema.mensagem} A consulta dos arquivos continua disponível, mas exclusão e limpeza do Storage ficam desabilitadas para este usuário.
                    </div>
                )}

                <div className={classNames("mb-4 rounded-3xl p-4 ring-1", storageStatus.classe)}>
                    <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
                        <div>
                            <p className="text-sm font-bold">Alerta de armazenamento: {storageStatus.texto}</p>
                            <p className="mt-1 text-xs leading-relaxed">{storageStatus.detalhe}</p>
                        </div>
                        <div className="text-left lg:text-right">
                            <p className="text-3xl font-black">{storagePercentual}%</p>
                            <p className="text-xs font-semibold">{formatarBytes(storageTotalBytes)} de {formatarBytes(storageLimiteBytes)}</p>
                        </div>
                    </div>

                    <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/80 ring-1 ring-white/70">
                        <div
                            className={classNames("h-full rounded-full", storageStatus.barra)}
                            style={{ width: `${Math.max(2, storagePercentual)}%` }}
                        />
                    </div>

                    <p className="mt-2 text-[11px] leading-relaxed opacity-80">
                        Regra visual: até 70% normal; de 70% a 89% atenção; acima de 90% crítico.
                    </p>
                </div>

                <div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                    <div className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Total usado</p>
                        <p className="mt-2 text-2xl font-black text-slate-950">{formatarBytes(storageTotalBytes)}</p>
                        <p className="mt-1 text-xs text-slate-500">Limite: {formatarBytes(storageLimiteBytes)}</p>
                    </div>

                    <div className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Total de arquivos</p>
                        <p className="mt-2 text-2xl font-black text-slate-950">{arquivosStorageAuditoria.length}</p>
                        <p className="mt-1 text-xs text-slate-500">{arquivosStorageFiltrados.length} exibido(s) no filtro</p>
                    </div>

                    <div className="rounded-3xl bg-emerald-50 p-4 ring-1 ring-emerald-200">
                        <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Arquivos vinculados</p>
                        <p className="mt-2 text-2xl font-black text-emerald-800">{arquivosStorageAuditoriaEmUso.length}</p>
                        <p className="mt-1 text-xs text-emerald-700">{formatarBytes(storageEmUsoBytes)} em registros ativos</p>
                    </div>

                    <div className="rounded-3xl bg-red-50 p-4 ring-1 ring-red-200">
                        <p className="text-xs font-bold uppercase tracking-wide text-red-700">Sem vínculo</p>
                        <p className="mt-2 text-2xl font-black text-red-800">{arquivosStorageAuditoriaSemRegistro.length}</p>
                        <p className="mt-1 text-xs text-red-700">{formatarBytes(storageSemRegistroBytes)} sem registro</p>
                    </div>

                    <div className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Último upload</p>
                        <p className="mt-2 break-words text-sm font-black text-slate-950">
                            {ultimoUploadStorage?.nome || "Nenhum arquivo carregado"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                            {ultimoUploadStorage?.atualizadoEm ? new Date(ultimoUploadStorage.atualizadoEm).toLocaleString("pt-BR") : "-"}
                        </p>
                    </div>
                </div>

                <div className="mb-5 grid gap-4 xl:grid-cols-3">
                    <div className="rounded-3xl border border-slate-200 bg-white p-4">
                        <h3 className="font-bold text-slate-950">Arquivos por empresa</h3>
                        <p className="mt-1 text-xs text-slate-500">Quantidade e tamanho por empresa vinculada ao arquivo.</p>
                        <div className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1 scrollbar-discreta">
                            {arquivosPorEmpresaStorage.length === 0 && (
                                <p className="rounded-2xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">Carregue os arquivos para visualizar.</p>
                            )}
                            {arquivosPorEmpresaStorage.slice(0, 10).map((item) => (
                                <div key={item.nome} className="rounded-2xl bg-slate-50 px-3 py-2 text-xs ring-1 ring-slate-200">
                                    <div className="flex justify-between gap-3">
                                        <span className="break-words font-bold text-slate-700">{item.nome}</span>
                                        <span className="shrink-0 font-bold text-slate-950">{item.arquivos}</span>
                                    </div>
                                    <p className="mt-1 text-slate-500">{formatarBytes(item.bytes)} · {item.semRegistro} sem vínculo</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-white p-4">
                        <h3 className="font-bold text-slate-950">Arquivos por tipo</h3>
                        <p className="mt-1 text-xs text-slate-500">Certificados, documentos empresariais, contratos, logos e fotos.</p>
                        <div className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1 scrollbar-discreta">
                            {arquivosPorTipoStorage.length === 0 && (
                                <p className="rounded-2xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">Carregue os arquivos para visualizar.</p>
                            )}
                            {arquivosPorTipoStorage.slice(0, 10).map((item) => (
                                <div key={item.nome} className="rounded-2xl bg-slate-50 px-3 py-2 text-xs ring-1 ring-slate-200">
                                    <div className="flex justify-between gap-3">
                                        <span className="break-words font-bold text-slate-700">{item.nome}</span>
                                        <span className="shrink-0 font-bold text-slate-950">{item.arquivos}</span>
                                    </div>
                                    <p className="mt-1 text-slate-500">{formatarBytes(item.bytes)} · {item.emUso} vinculados</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-white p-4">
                        <h3 className="font-bold text-slate-950">Maiores arquivos</h3>
                        <p className="mt-1 text-xs text-slate-500">Prioridade para limpeza ou compactação quando o uso crescer.</p>
                        <div className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1 scrollbar-discreta">
                            {maioresArquivosStorage.length === 0 && (
                                <p className="rounded-2xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">Carregue os arquivos para visualizar.</p>
                            )}
                            {maioresArquivosStorage.map((arquivo) => (
                                <div key={`${arquivo.bucket}-${arquivo.caminho}`} className="rounded-2xl bg-slate-50 px-3 py-2 text-xs ring-1 ring-slate-200">
                                    <p className="break-words font-bold text-slate-700">{arquivo.nome}</p>
                                    <p className="mt-1 text-slate-500">
                                        {formatarBytes(arquivo.tamanho || 0)} · {obterEmpresaArquivoStorage(arquivo)} · {arquivo.emUso ? "vinculado" : "sem vínculo"}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="mb-5 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-3 flex flex-col justify-between gap-2 md:flex-row md:items-center">
                        <div>
                            <h3 className="font-bold text-slate-950">Filtros dos arquivos salvos</h3>
                            <p className="mt-1 text-xs text-slate-500">Filtre por empresa, colaborador, tipo, data de envio, tamanho e vínculo.</p>
                        </div>

                        <button
                            type="button"
                            onClick={() => setFiltrosStorage({
                                empresa: "Todas",
                                colaborador: "Todos",
                                tipo: "Todos",
                                dataInicio: "",
                                dataFim: "",
                                tamanho: "Todos",
                                vinculo: "Todos",
                            })}
                            className="w-fit rounded-2xl bg-white px-4 py-2 text-xs font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                        >
                            Limpar filtros
                        </button>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                        <select
                            value={filtrosStorage.empresa}
                            onChange={(e) => setFiltrosStorage((atual) => ({ ...atual, empresa: e.target.value }))}
                            className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                        >
                            <option value="Todas">Todas as empresas</option>
                            {opcoesEmpresasStorage.map((empresa) => (
                                <option key={empresa} value={empresa}>{empresa}</option>
                            ))}
                        </select>

                        <select
                            value={filtrosStorage.colaborador}
                            onChange={(e) => setFiltrosStorage((atual) => ({ ...atual, colaborador: e.target.value }))}
                            className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                        >
                            <option value="Todos">Todos os colaboradores</option>
                            {opcoesColaboradoresStorage.map((colaborador) => (
                                <option key={colaborador} value={colaborador}>{colaborador}</option>
                            ))}
                        </select>

                        <select
                            value={filtrosStorage.tipo}
                            onChange={(e) => setFiltrosStorage((atual) => ({ ...atual, tipo: e.target.value }))}
                            className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                        >
                            <option value="Todos">Todos os tipos</option>
                            {opcoesTiposStorage.map((tipo) => (
                                <option key={tipo} value={tipo}>{tipo}</option>
                            ))}
                        </select>

                        <select
                            value={filtrosStorage.tamanho}
                            onChange={(e) => setFiltrosStorage((atual) => ({ ...atual, tamanho: e.target.value }))}
                            className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                        >
                            <option value="Todos">Todos os tamanhos</option>
                            <option value="ate-1mb">Até 1 MB</option>
                            <option value="1mb-10mb">1 MB a 10 MB</option>
                            <option value="10mb-50mb">10 MB a 50 MB</option>
                            <option value="acima-50mb">Acima de 50 MB</option>
                        </select>

                        <select
                            value={filtrosStorage.vinculo}
                            onChange={(e) => setFiltrosStorage((atual) => ({ ...atual, vinculo: e.target.value }))}
                            className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                        >
                            <option value="Todos">Com e sem vínculo</option>
                            <option value="Com vínculo">Somente vinculados</option>
                            <option value="Sem vínculo">Somente sem vínculo</option>
                        </select>

                        <div className="grid grid-cols-2 gap-2">
                            <input
                                type="date"
                                value={filtrosStorage.dataInicio}
                                onChange={(e) => setFiltrosStorage((atual) => ({ ...atual, dataInicio: e.target.value }))}
                                className="min-w-0 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                title="Data inicial de envio"
                            />
                            <input
                                type="date"
                                value={filtrosStorage.dataFim}
                                onChange={(e) => setFiltrosStorage((atual) => ({ ...atual, dataFim: e.target.value }))}
                                className="min-w-0 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                title="Data final de envio"
                            />
                        </div>
                    </div>
                </div>

                {storagePorBucket.length > 0 && (
                    <div className="mb-5 rounded-3xl border border-slate-200 bg-white p-4">
                        <h3 className="font-bold text-slate-950">Uso por bucket</h3>
                        <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-5">
                            {storagePorBucket.map((bucketInfo) => (
                                <div key={bucketInfo.bucket} className="rounded-2xl bg-slate-50 p-3 text-xs ring-1 ring-slate-200">
                                    <p className="break-words font-bold text-slate-700">{bucketInfo.bucket}</p>
                                    <p className="mt-1 text-slate-500">
                                        {bucketInfo.arquivos} arquivo(s) · {formatarBytes(bucketInfo.bytes)}
                                    </p>
                                    <p className="mt-1 text-slate-400">
                                        {bucketInfo.emUso} em uso · {bucketInfo.semRegistro} sem vínculo
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {arquivosStorageAuditoria.length === 0 && !carregandoStorageAuditoria && (
                    <div className="rounded-3xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                        Clique em <strong>Carregar arquivos</strong> para consultar o Storage. A consulta não será atualizada automaticamente ao sair e voltar para a aba.
                    </div>
                )}

                {arquivosStorageAuditoria.length > 0 && (
                    <div>
                        <div className="mb-3 flex flex-col justify-between gap-2 md:flex-row md:items-center">
                            <p className="text-sm font-bold text-slate-950">
                                Arquivos encontrados: {arquivosStorageFiltrados.length} de {arquivosStorageAuditoria.length}
                            </p>
                            <p className="text-xs text-slate-500">
                                Sem vínculo no filtro: {arquivosStorageFiltradosSemVinculo.length} arquivo(s) · {formatarBytes(storageFiltradoSemVinculoBytes)}.
                            </p>
                        </div>

                        {arquivosStorageFiltrados.length === 0 && (
                            <div className="rounded-3xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                                Nenhum arquivo encontrado com os filtros selecionados.
                            </div>
                        )}

                        {arquivosStorageFiltrados.length > 0 && (
                            <div className="max-h-[32rem] space-y-2 overflow-y-auto pr-1 scrollbar-discreta">
                                {arquivosStorageFiltrados.map((arquivo) => (
                                    <div
                                        key={`${arquivo.bucket}-${arquivo.caminho}`}
                                        className={classNames(
                                            "rounded-2xl px-3 py-2 text-sm ring-1",
                                            arquivo.emUso
                                                ? "bg-emerald-50 text-emerald-900 ring-emerald-100"
                                                : "bg-red-50 text-red-900 ring-red-100"
                                        )}
                                    >
                                        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <p className="break-words font-bold">{arquivo.nome}</p>
                                                    <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-bold">
                                                        {arquivo.emUso ? "Em uso" : "Sem vínculo"}
                                                    </span>
                                                    <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-bold">
                                                        {formatarBytes(arquivo.tamanho || 0)}
                                                    </span>
                                                </div>

                                                <p className="mt-1 break-words text-xs opacity-80">
                                                    <strong>Empresa:</strong> {obterEmpresaArquivoStorage(arquivo)}
                                                </p>
                                                <p className="break-words text-xs opacity-80">
                                                    <strong>Colaborador:</strong> {obterColaboradorArquivoStorage(arquivo)}
                                                </p>
                                                <p className="break-words text-xs opacity-80">
                                                    <strong>Tipo:</strong> {obterTipoArquivoStorage(arquivo)}
                                                </p>
                                                <p className="break-words text-xs opacity-80">
                                                    <strong>Bucket:</strong> {arquivo.bucket || "-"} · <strong>Pasta:</strong> {arquivo.pasta || "raiz"}
                                                </p>
                                                <p className="break-words text-xs opacity-80">
                                                    <strong>Fonte do vínculo:</strong> {arquivo.tabelaOrigem || arquivo.origemRegistro || "Somente Storage"}
                                                </p>
                                                <p className="break-words text-xs opacity-80">
                                                    <strong>Data de envio/atualização:</strong> {arquivo.atualizadoEm ? new Date(arquivo.atualizadoEm).toLocaleString("pt-BR") : "Não identificada"}
                                                </p>
                                                <p className="break-words text-xs opacity-80">
                                                    <strong>Caminho:</strong> {arquivo.caminho}
                                                </p>

                                                {!arquivo.emUso && (
                                                    <p className="mt-1 break-words text-xs font-semibold text-red-700">
                                                        Arquivo sem vínculo com registro atual do sistema.
                                                    </p>
                                                )}
                                            </div>

                                            <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
                                                <button
                                                    type="button"
                                                    onClick={() => excluirStorageAuditoria(arquivo)}
                                                    disabled={arquivo.emUso || excluindoStorageAuditoria === arquivo.caminho || bloqueioLimparArquivosStorageSistema.bloqueado}
                                                    title={
                                                        bloqueioLimparArquivosStorageSistema.bloqueado
                                                            ? bloqueioLimparArquivosStorageSistema.mensagem
                                                            : arquivo.emUso
                                                                ? "Arquivo em uso não pode ser excluído por aqui"
                                                                : "Excluir arquivo sem vínculo do Storage"
                                                    }
                                                    className="rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                                                >
                                                    {excluindoStorageAuditoria === arquivo.caminho ? "Excluindo..." : "Excluir"}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {arquivosStorageAuditoriaSemRegistro.length > 0 && (
                    <p className="mt-3 rounded-2xl bg-red-50 p-3 text-xs text-red-700 ring-1 ring-red-100">
                        Use excluir apenas para arquivos sem vínculo. Arquivos em uso devem ser tratados pela base correta para manter o histórico do sistema.
                    </p>
                )}
                    </CardRecolhivel>
                ))}

                
            </div>
        </div>
    );
}








