/* eslint-disable no-unused-vars */
import React, { useEffect, useMemo, useState } from "react";
import {
    AlertTriangle,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Copy,
    Database,
    FileText,
    HardDrive,
    KeyRound,
    Link2,
    Lock,
    RefreshCw,
    RotateCcw,
    Settings,
    ShieldAlert,
    ShieldCheck,
    SlidersHorizontal,
} from "lucide-react";
import { Header, Card } from "../commonComponents";
import { ArquivosStorageConfiguracoes } from "./ArquivosStorageConfiguracoes";
import {
    carregarConfiguracaoEventosAuditoriaSistemaSupabase,
    carregarTokenAuditoriaPublicaAtivoSupabase,
    configuracaoPadraoEventosAuditoriaSistema,
    EVENTOS_AUDITORIA_SISTEMA_PADRAO,
    normalizarConfiguracaoEventosAuditoriaSistema,
    salvarConfiguracaoEventosAuditoriaSistema,
    salvarConfiguracaoEventosAuditoriaSistemaSupabase,
} from "../../services/auditoriaSistemaConfigService";
import {
    DESCRICOES_LIMITES_CARREGAMENTO_SISTEMA,
    LIMITES_CARREGAMENTO_SISTEMA,
    LIMITES_MAXIMOS_CARREGAMENTO_SISTEMA,
    LIMITES_MINIMOS_CARREGAMENTO_SISTEMA,
    normalizarLimitesCarregamentoSistema,
} from "../../constants/sistemaLimitesConstants";
import {
    carregarConfiguracaoAuditoriaPublicaSistema,
    montarLinkAuditoriaPublicaSistema,
    restaurarConfiguracaoAuditoriaPublicaPadrao,
    salvarConfiguracaoAuditoriaPublicaSistema,
} from "../../constants/auditoriaPublicaConstants";
import {
    SENHA_CONFIGURACOES_PADRAO,
    restaurarSenhaConfiguracoesSistema,
} from "../../constants/configuracoesSegurancaConstants";
import {
    ACOES_USUARIOS_PERMISSOES_PLANEJADAS,
    MODULOS_USUARIOS_PERMISSOES_PLANEJADOS,
    PERFIS_USUARIOS_PERMISSOES_PLANEJADOS,
    PERMISSOES_PADRAO_USUARIOS_POR_PERFIL,
} from "../../constants/usuariosPermissoesConstants";
import {
    avaliarSegurancaAuditoriaPublica,
    calcularResumoSegurancaAuditoriaPublica,
    montarChecklistSegurancaAuditoriaPublicaTexto,
} from "../../services/auditoriaPublicaSegurancaService";
import {
    avaliarSegurancaStorageSistema,
    calcularResumoSegurancaStorageSistema,
    montarChecklistSegurancaStorageSistemaTexto,
} from "../../services/storageSegurancaService";
import {
    avaliarRevisaoSupabaseSistema,
    calcularResumoRevisaoSupabaseSistema,
    montarChecklistRevisaoSupabaseSistemaTexto,
} from "../../services/supabaseRevisaoService";
import {
    ACOES_CRITICAS_PERMISSAO_SISTEMA,
    carregarPermissaoSistemaAtualService,
    concluirSolicitacaoAcessoSistemaService,
    listarSolicitacoesAcessoSistemaService,
    listarUsuariosPermissoesSistemaService,
    obterBloqueioVisualAcaoCriticaSistema,
    obterResumoAcoesCriticasSistema,
    obterResumoPermissaoSistema,
    responderSolicitacaoAcessoSistemaService,
    salvarUsuarioPermissaoSistemaService,
    usuarioPodeGerenciarPermissoesSistema,
} from "../../services/usuariosPermissoesSistemaService";
import { supabase } from "../../lib/supabaseClient";

const classNames = (...classes) => classes.filter(Boolean).join(" ");

function formatarDataHoraConfiguracoes(valor) {
    if (!valor) return "Sem data";

    try {
        return new Date(valor).toLocaleString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch {
        return "Sem data";
    }
}

function obterClasseStatusSolicitacaoAcesso(status = "pendente") {
    if (status === "aprovada") return "bg-emerald-50 text-emerald-700 ring-emerald-100";
    if (status === "concluida") return "bg-blue-50 text-blue-700 ring-blue-100";
    if (status === "recusada") return "bg-rose-50 text-rose-700 ring-rose-100";
    if (status === "cancelada") return "bg-slate-100 text-slate-500 ring-slate-200";
    return "bg-amber-50 text-amber-700 ring-amber-100";
}

function formatarStatusSolicitacaoAcesso(status = "pendente") {
    const mapa = {
        pendente: "Pendente",
        aprovada: "Aprovada",
        concluida: "Concluída",
        recusada: "Recusada",
        cancelada: "Cancelada",
    };

    return mapa[status] || "Pendente";
}

const MAPA_ROTULOS_PERFIS_USUARIOS = PERFIS_USUARIOS_PERMISSOES_PLANEJADOS.reduce((acc, perfil) => {
    acc[perfil.chave] = perfil.perfil;
    return acc;
}, {});

function normalizarTextoPermissao(valor = "") {
    return String(valor || "").trim().toLowerCase();
}

function formatarPerfilPermissaoSistema(perfil = "") {
    const chave = normalizarTextoPermissao(perfil || "consulta");
    return MAPA_ROTULOS_PERFIS_USUARIOS[chave] || "Consulta";
}

function obterClassePerfilPermissaoSistema(perfil = "") {
    const chave = normalizarTextoPermissao(perfil);

    if (chave === "administrador") return "bg-blue-50 text-blue-700 ring-blue-100";
    if (chave === "tecnico_sst") return "bg-emerald-50 text-emerald-700 ring-emerald-100";
    if (chave === "auditor") return "bg-violet-50 text-violet-700 ring-violet-100";
    if (chave === "gestor") return "bg-cyan-50 text-cyan-700 ring-cyan-100";
    if (chave === "bloqueado") return "bg-rose-50 text-rose-700 ring-rose-100";

    return "bg-slate-100 text-slate-600 ring-slate-200";
}

function formatarStatusUsuarioPermissaoSistema(usuarioPermissao = {}) {
    if (usuarioPermissao?.bloqueado) return "Bloqueado";
    if (usuarioPermissao?.ativo) return "Ativo";
    return "Inativo";
}

function obterClasseStatusUsuarioPermissaoSistema(usuarioPermissao = {}) {
    if (usuarioPermissao?.bloqueado) return "bg-rose-50 text-rose-700 ring-rose-100";
    if (usuarioPermissao?.ativo) return "bg-emerald-50 text-emerald-700 ring-emerald-100";
    return "bg-slate-100 text-slate-500 ring-slate-200";
}

function emailEhUsuarioAtualPermissaoSistema(email = "", usuarioAtual = null, permissaoAtual = null) {
    const emailTratado = normalizarTextoPermissao(email);
    const emailAtual = normalizarTextoPermissao(permissaoAtual?.email || usuarioAtual?.email);

    return Boolean(emailTratado && emailAtual && emailTratado === emailAtual);
}

function solicitacaoAcessoEhAreaSensivel(solicitacao = {}) {
    const textoBase = `${solicitacao.area_solicitada || ""} ${solicitacao.tela || ""}`
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

    return (
        textoBase.includes("configur")
        || textoBase.includes("auditoria do sistema")
        || textoBase.includes("storage")
        || textoBase.includes("supabase")
    );
}

function sugerirPerfilPorSolicitacaoAcesso(solicitacao = {}) {
    const textoBase = `${solicitacao.area_solicitada || ""} ${solicitacao.tela || ""}`
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

    if (solicitacaoAcessoEhAreaSensivel(solicitacao)) {
        return "consulta";
    }

    if (textoBase.includes("nova auditoria") || textoBase.includes("dashboard auditoria") || textoBase.includes("auditoria")) {
        return "auditor";
    }

    if (
        textoBase.includes("empresa")
        || textoBase.includes("colaborador")
        || textoBase.includes("treinamento")
        || textoBase.includes("qr")
    ) {
        return "tecnico_sst";
    }

    return "consulta";
}

const CHAVES_BLOCOS_CONFIGURACOES_PADRAO = [
    "config-usuarios-permissoes",
    "config-limites-carregamento",
    "config-auditoria-publica",
    "config-arquivos-storage",
    "config-relatorios-evidencias",
    "config-senha-configuracoes",
    "config-eventos-auditoria",
    "config-seguranca-publica",
    "config-storage-privado",
    "config-supabase-geral",
    "config-status-etapa",
];

const VERSAO_LAYOUT_CONFIGURACOES_SISTEMA = "roteiro13-painel-configuracoes-padrao-dashboard-sst";
const CHAVE_LAYOUT_CONFIGURACOES_SISTEMA = "configuracoesSistemaVersaoLayout";
const CHAVE_BLOCOS_RECOLHIDOS_CONFIGURACOES = "configuracoesSistemaBlocosRecolhidos";
const CHAVE_TAMANHOS_BLOCOS_CONFIGURACOES = "configuracoesSistemaTamanhosBlocos";


const BLOCOS_CONFIGURACOES_ABERTOS_PADRAO = new Set([
    "config-usuarios-permissoes",
    "config-limites-carregamento",
    "config-auditoria-publica",
    "config-arquivos-storage",
    "config-relatorios-evidencias",
]);

const CHAVES_BLOCOS_CONFIGURACOES_CRITICOS = new Set([
    "config-usuarios-permissoes",
    "config-auditoria-publica",
    "config-arquivos-storage",
    "config-senha-configuracoes",
    "config-eventos-auditoria",
    "config-storage-privado",
    "config-supabase-geral",
]);

const FILTROS_PAINEL_CONFIGURACOES = [
    { chave: "todos", label: "Todos" },
    { chave: "visiveis", label: "Visíveis" },
    { chave: "ocultos", label: "Ocultos" },
    { chave: "abertos", label: "Abertos" },
    { chave: "recolhidos", label: "Recolhidos" },
    { chave: "criticos", label: "Críticos" },
];

const BLOCOS_CONFIGURACOES_VISIVEIS_PADRAO = CHAVES_BLOCOS_CONFIGURACOES_PADRAO.reduce((acc, chave) => {
    acc[chave] = true;
    return acc;
}, {});

const ORDEM_TAMANHOS_BLOCOS_CONFIGURACOES = ["padrao", "medio", "grande", "destaque"];

const BLOCOS_CONFIGURACOES_TAMANHOS_PADRAO = CHAVES_BLOCOS_CONFIGURACOES_PADRAO.reduce((acc, chave) => {
    acc[chave] = "padrao";
    return acc;
}, {});

const BLOCOS_CONFIGURACOES_RECOLHIDOS_PADRAO = CHAVES_BLOCOS_CONFIGURACOES_PADRAO.reduce((acc, chave) => {
    acc[chave] = !BLOCOS_CONFIGURACOES_ABERTOS_PADRAO.has(chave);
    return acc;
}, {});

const carregarJsonLocalConfiguracoes = (chave, padrao) => {
    if (typeof window === "undefined") return padrao;

    try {
        const salvo = JSON.parse(window.localStorage.getItem(chave) || "null");
        return salvo && typeof salvo === "object" ? salvo : padrao;
    } catch {
        return padrao;
    }
};

const carregarBlocosRecolhidosLocalConfiguracoes = () => {
    if (typeof window === "undefined") return BLOCOS_CONFIGURACOES_RECOLHIDOS_PADRAO;

    try {
        const versaoAtual = window.localStorage.getItem(CHAVE_LAYOUT_CONFIGURACOES_SISTEMA);

        if (versaoAtual !== VERSAO_LAYOUT_CONFIGURACOES_SISTEMA) {
            window.localStorage.setItem(
                CHAVE_BLOCOS_RECOLHIDOS_CONFIGURACOES,
                JSON.stringify(BLOCOS_CONFIGURACOES_RECOLHIDOS_PADRAO)
            );
            window.localStorage.setItem(CHAVE_LAYOUT_CONFIGURACOES_SISTEMA, VERSAO_LAYOUT_CONFIGURACOES_SISTEMA);
            return BLOCOS_CONFIGURACOES_RECOLHIDOS_PADRAO;
        }

        return {
            ...BLOCOS_CONFIGURACOES_RECOLHIDOS_PADRAO,
            ...carregarJsonLocalConfiguracoes(CHAVE_BLOCOS_RECOLHIDOS_CONFIGURACOES, BLOCOS_CONFIGURACOES_RECOLHIDOS_PADRAO),
        };
    } catch {
        return BLOCOS_CONFIGURACOES_RECOLHIDOS_PADRAO;
    }
};

const carregarOrdemLocalConfiguracoes = () => {
    if (typeof window === "undefined") return CHAVES_BLOCOS_CONFIGURACOES_PADRAO;

    try {
        const salvo = JSON.parse(window.localStorage.getItem("configuracoesSistemaOrdemBlocos") || "null");
        if (!Array.isArray(salvo)) return CHAVES_BLOCOS_CONFIGURACOES_PADRAO;

        return [
            ...salvo.filter((chave) => CHAVES_BLOCOS_CONFIGURACOES_PADRAO.includes(chave)),
            ...CHAVES_BLOCOS_CONFIGURACOES_PADRAO.filter((chave) => !salvo.includes(chave)),
        ];
    } catch {
        return CHAVES_BLOCOS_CONFIGURACOES_PADRAO;
    }
};

export function ConfiguracoesSistema({
    usuario = null,
    podeAcessarAuditoria = false,
    limites = {},
    onSalvarLimites,
    senhaConfiguracoesSistema = SENHA_CONFIGURACOES_PADRAO,
    origemSenhaConfiguracoesSistema = "local",
    mensagemSenhaConfiguracoesSistema: mensagemSenhaConfiguracoesSistemaApp = "",
    onSalvarSenhaConfiguracoes,
    onListarArquivosStorage,
    onExcluirArquivoStorage,
    onAtualizarAuditoria,
    acaoTopo = null,
}) {
    const [configEventos, setConfigEventos] = useState(() => configuracaoPadraoEventosAuditoriaSistema());
    const [origemConfig, setOrigemConfig] = useState("local");
    const [mensagemConfig, setMensagemConfig] = useState("Carregando configuração...");
    const [carregandoConfig, setCarregandoConfig] = useState(false);
    const [salvandoConfig, setSalvandoConfig] = useState(false);
    const [limitesEditaveis, setLimitesEditaveis] = useState(() => normalizarLimitesCarregamentoSistema(limites));
    const [mensagemLimites, setMensagemLimites] = useState("Os limites estão prontos para edição local.");
    const [configAuditoriaPublica, setConfigAuditoriaPublica] = useState(() => carregarConfiguracaoAuditoriaPublicaSistema());
    const [mensagemAuditoriaPublica, setMensagemAuditoriaPublica] = useState("Carregando token público da auditoria no Supabase...");
    const [carregandoAuditoriaPublica, setCarregandoAuditoriaPublica] = useState(false);
    const [origemAuditoriaPublica, setOrigemAuditoriaPublica] = useState("supabase");
    const [mensagemStorage, setMensagemStorage] = useState("Checklist de Storage pronto para conferência operacional.");
    const [mensagemSupabase, setMensagemSupabase] = useState("Checklist Supabase/RLS/RPC pronto para conferência técnica.");
    const [mensagemEvidenciasConfiguracoes, setMensagemEvidenciasConfiguracoes] = useState(
        "Gere uma evidência administrativa simples das Configurações atuais para auditoria interna."
    );
    const [senhaConfiguracoesFormulario, setSenhaConfiguracoesFormulario] = useState({
        atual: "",
        nova: "",
        confirmar: "",
    });
    const [mensagemSenhaConfiguracoes, setMensagemSenhaConfiguracoes] = useState(
        mensagemSenhaConfiguracoesSistemaApp || "Senha das Configurações carregada localmente."
    );
    const [mostrarCamposSenhaConfiguracoes, setMostrarCamposSenhaConfiguracoes] = useState(false);

    const [mostrarOrganizacaoCards, setMostrarOrganizacaoCards] = useState(false);
    const [filtroPainelConfiguracoes, setFiltroPainelConfiguracoes] = useState("todos");
    const [blocosVisiveisConfiguracoes, setBlocosVisiveisConfiguracoes] = useState(() => ({
        ...BLOCOS_CONFIGURACOES_VISIVEIS_PADRAO,
        ...carregarJsonLocalConfiguracoes("configuracoesSistemaBlocosVisiveis", BLOCOS_CONFIGURACOES_VISIVEIS_PADRAO),
    }));
    const [blocosRecolhidosConfiguracoes, setBlocosRecolhidosConfiguracoes] = useState(() =>
        carregarBlocosRecolhidosLocalConfiguracoes()
    );
    const [ordemBlocosConfiguracoes, setOrdemBlocosConfiguracoes] = useState(() => carregarOrdemLocalConfiguracoes());
    const [tamanhosBlocosConfiguracoes, setTamanhosBlocosConfiguracoes] = useState(() => ({
        ...BLOCOS_CONFIGURACOES_TAMANHOS_PADRAO,
        ...carregarJsonLocalConfiguracoes(CHAVE_TAMANHOS_BLOCOS_CONFIGURACOES, BLOCOS_CONFIGURACOES_TAMANHOS_PADRAO),
    }));
    const [blocoArrastandoConfiguracoes, setBlocoArrastandoConfiguracoes] = useState("");

    const [perfilPermissoesAberto, setPerfilPermissoesAberto] = useState(
        () => PERMISSOES_PADRAO_USUARIOS_POR_PERFIL[0]?.chave || ""
    );
    const [permissaoSistemaAtual, setPermissaoSistemaAtual] = useState(null);
    const [carregandoPermissaoSistema, setCarregandoPermissaoSistema] = useState(false);
    const [mensagemPermissaoSistema, setMensagemPermissaoSistema] = useState(
        "Permissão geral ainda não carregada do Supabase."
    );
    const [usuariosPermissoesSistema, setUsuariosPermissoesSistema] = useState([]);
    const [carregandoUsuariosPermissoesSistema, setCarregandoUsuariosPermissoesSistema] = useState(false);
    const [mensagemUsuariosPermissoesSistema, setMensagemUsuariosPermissoesSistema] = useState(
        "Lista administrativa ainda não carregada do Supabase."
    );
    const [solicitacoesAcessoSistema, setSolicitacoesAcessoSistema] = useState([]);
    const [carregandoSolicitacoesAcessoSistema, setCarregandoSolicitacoesAcessoSistema] = useState(false);
    const [mensagemSolicitacoesAcessoSistema, setMensagemSolicitacoesAcessoSistema] = useState(
        "Solicitações de acesso ainda não carregadas."
    );
    const [respostaAdminSolicitacaoAcessoSistema, setRespostaAdminSolicitacaoAcessoSistema] = useState("");
    const [processandoRespostaSolicitacaoAcessoSistema, setProcessandoRespostaSolicitacaoAcessoSistema] = useState("");
    const [mensagemRespostaSolicitacaoAcessoSistema, setMensagemRespostaSolicitacaoAcessoSistema] = useState(
        "Selecione uma solicitação pendente para aprovar ou recusar."
    );
    const [solicitacaoAcessoPreparadaSistema, setSolicitacaoAcessoPreparadaSistema] = useState(null);
    const [mostrarFormularioNovoUsuarioPermissao, setMostrarFormularioNovoUsuarioPermissao] = useState(false);
    const [novoUsuarioPermissaoSistema, setNovoUsuarioPermissaoSistema] = useState({
        nome: "",
        email: "",
        funcao: "",
        perfil: "tecnico_sst",
        ativo: true,
        bloqueado: false,
        acesso_global: false,
    });
    const [usuarioPermissaoSistemaEmEdicao, setUsuarioPermissaoSistemaEmEdicao] = useState(null);
    const [mensagemFormularioNovoUsuarioPermissao, setMensagemFormularioNovoUsuarioPermissao] = useState(
        "Cadastro real habilitado. Preencha os dados e salve a permissão no Supabase."
    );
    const [salvandoNovoUsuarioPermissaoSistema, setSalvandoNovoUsuarioPermissaoSistema] = useState(false);

    const eventosAuditoria = useMemo(() => {
        const normalizada = normalizarConfiguracaoEventosAuditoriaSistema(configEventos);
        return EVENTOS_AUDITORIA_SISTEMA_PADRAO.map((evento) => ({
            ...evento,
            habilitado: normalizada[evento.chave] !== false,
        }));
    }, [configEventos]);

    const totalEventosHabilitados = eventosAuditoria.filter((evento) => evento.habilitado).length;

    const perfilPermissoesSelecionado = useMemo(
        () => PERMISSOES_PADRAO_USUARIOS_POR_PERFIL.find((perfil) => perfil.chave === perfilPermissoesAberto) || null,
        [perfilPermissoesAberto]
    );

    const resumoPermissaoSistemaAtual = useMemo(
        () => obterResumoPermissaoSistema(permissaoSistemaAtual),
        [permissaoSistemaAtual]
    );

    const modulosPermissaoSistemaAtual = useMemo(() => {
        const modulos = permissaoSistemaAtual?.permissoes?.modulos;
        return modulos && typeof modulos === "object" ? Object.keys(modulos) : [];
    }, [permissaoSistemaAtual]);

    const acoesCriticasPermissaoSistemaAtual = useMemo(() => {
        const acoesCriticas = permissaoSistemaAtual?.permissoes?.acoesCriticas;
        if (!acoesCriticas || typeof acoesCriticas !== "object") return [];

        return Object.entries(acoesCriticas)
            .filter(([, valor]) => valor === true || valor === "true")
            .map(([acao]) => acao);
    }, [permissaoSistemaAtual]);

    const resumoUsuariosPermissoesSistema = useMemo(() => {
        const total = usuariosPermissoesSistema.length;
        const ativos = usuariosPermissoesSistema.filter((item) => item.ativo && !item.bloqueado).length;
        const bloqueados = usuariosPermissoesSistema.filter((item) => item.bloqueado).length;
        const administradores = usuariosPermissoesSistema.filter(
            (item) => item.acesso_global || item.perfil === "administrador"
        ).length;

        return { total, ativos, bloqueados, administradores };
    }, [usuariosPermissoesSistema]);

    const resumoSolicitacoesAcessoSistema = useMemo(() => {
        const total = solicitacoesAcessoSistema.length;
        const pendentes = solicitacoesAcessoSistema.filter((item) => item.status === "pendente").length;
        const aprovadas = solicitacoesAcessoSistema.filter((item) => item.status === "aprovada").length;
        const concluidas = solicitacoesAcessoSistema.filter((item) => item.status === "concluida").length;
        const recusadas = solicitacoesAcessoSistema.filter((item) => item.status === "recusada").length;

        return { total, pendentes, aprovadas, concluidas, recusadas };
    }, [solicitacoesAcessoSistema]);

    const solicitacoesAcessoPendentesSistema = useMemo(
        () => solicitacoesAcessoSistema.filter((item) => item.status === "pendente"),
        [solicitacoesAcessoSistema]
    );

    const modoEdicaoUsuarioPermissaoSistema = Boolean(usuarioPermissaoSistemaEmEdicao?.email);

    const formularioUsuarioPermissaoEhUsuarioAtual = useMemo(
        () => emailEhUsuarioAtualPermissaoSistema(
            novoUsuarioPermissaoSistema.email,
            usuario,
            permissaoSistemaAtual
        ),
        [novoUsuarioPermissaoSistema.email, permissaoSistemaAtual, usuario]
    );

    const podeGerenciarPermissoesSistema = useMemo(
        () => usuarioPodeGerenciarPermissoesSistema(permissaoSistemaAtual),
        [permissaoSistemaAtual]
    );

    const bloqueioGerenciarPermissoesSistema = useMemo(
        () => obterBloqueioVisualAcaoCriticaSistema(
            permissaoSistemaAtual,
            ACOES_CRITICAS_PERMISSAO_SISTEMA.GERENCIAR_PERMISSOES
        ),
        [permissaoSistemaAtual]
    );

    const resumoAcoesCriticasSistemaAtual = useMemo(
        () => obterResumoAcoesCriticasSistema(permissaoSistemaAtual),
        [permissaoSistemaAtual]
    );

    const podeAlterarConfiguracoesCriticasSistema = Boolean(
        resumoAcoesCriticasSistemaAtual.podeAlterarConfiguracoesCriticas
    );

    const mensagemBloqueioConfiguracoesCriticasSistema =
        "Sem permissão para alterar configurações críticas do sistema.";


    useEffect(() => {
        if (typeof window === "undefined") return;
        window.localStorage.setItem("configuracoesSistemaBlocosVisiveis", JSON.stringify(blocosVisiveisConfiguracoes));
    }, [blocosVisiveisConfiguracoes]);

    useEffect(() => {
        if (typeof window === "undefined") return;
        window.localStorage.setItem(CHAVE_BLOCOS_RECOLHIDOS_CONFIGURACOES, JSON.stringify(blocosRecolhidosConfiguracoes));
    }, [blocosRecolhidosConfiguracoes]);

    useEffect(() => {
        if (typeof window === "undefined") return;
        window.localStorage.setItem("configuracoesSistemaOrdemBlocos", JSON.stringify(ordemBlocosConfiguracoes));
    }, [ordemBlocosConfiguracoes]);

    useEffect(() => {
        if (typeof window === "undefined") return;
        window.localStorage.setItem(CHAVE_TAMANHOS_BLOCOS_CONFIGURACOES, JSON.stringify(tamanhosBlocosConfiguracoes));
    }, [tamanhosBlocosConfiguracoes]);

    const moverBlocoConfiguracao = (chave, direcao) => {
        setOrdemBlocosConfiguracoes((atual) => {
            const base = [...atual];
            const indice = base.indexOf(chave);
            const novoIndice = indice + direcao;

            if (indice < 0 || novoIndice < 0 || novoIndice >= base.length) return atual;

            [base[indice], base[novoIndice]] = [base[novoIndice], base[indice]];
            return base;
        });
    };

    const moverBlocoParaConfiguracao = (chaveOrigem, chaveDestino) => {
        if (!chaveOrigem || !chaveDestino || chaveOrigem === chaveDestino) return;

        setOrdemBlocosConfiguracoes((atual) => {
            const base = [
                ...atual.filter((chave) => CHAVES_BLOCOS_CONFIGURACOES_PADRAO.includes(chave)),
                ...CHAVES_BLOCOS_CONFIGURACOES_PADRAO.filter((chave) => !atual.includes(chave)),
            ];
            const origem = base.indexOf(chaveOrigem);
            const destino = base.indexOf(chaveDestino);

            if (origem < 0 || destino < 0) return atual;

            const [item] = base.splice(origem, 1);
            base.splice(destino, 0, item);
            return base;
        });
    };

    const obterTamanhoBlocoConfiguracao = (chave) => {
        const tamanho = tamanhosBlocosConfiguracoes[chave] || BLOCOS_CONFIGURACOES_TAMANHOS_PADRAO[chave] || "medio";
        return ORDEM_TAMANHOS_BLOCOS_CONFIGURACOES.includes(tamanho) ? tamanho : "medio";
    };

    const alterarTamanhoBlocoConfiguracao = (chave, direcao) => {
        setTamanhosBlocosConfiguracoes((atual) => {
            const tamanhoAtual = obterTamanhoBlocoConfiguracao(chave);
            const indiceAtual = ORDEM_TAMANHOS_BLOCOS_CONFIGURACOES.indexOf(tamanhoAtual);
            const proximoIndice = Math.min(
                ORDEM_TAMANHOS_BLOCOS_CONFIGURACOES.length - 1,
                Math.max(0, indiceAtual + direcao)
            );

            return {
                ...atual,
                [chave]: ORDEM_TAMANHOS_BLOCOS_CONFIGURACOES[proximoIndice],
            };
        });
    };

    const obterClasseTamanhoBlocoConfiguracao = (chave) => {
        const tamanho = obterTamanhoBlocoConfiguracao(chave);

        if (tamanho === "destaque") return "xl:col-span-4";
        if (tamanho === "grande") return "xl:col-span-3";
        if (tamanho === "medio") return "xl:col-span-2";
        return "xl:col-span-1";
    };

    const formatarTamanhoBlocoConfiguracao = (chave) => {
        const tamanho = obterTamanhoBlocoConfiguracao(chave);
        if (tamanho === "destaque") return "Destaque";
        if (tamanho === "grande") return "Grande";
        if (tamanho === "medio") return "Médio";
        return "Padrão";
    };

    const definirTamanhoBlocoConfiguracao = (chave, tamanho) => {
        if (!ORDEM_TAMANHOS_BLOCOS_CONFIGURACOES.includes(tamanho)) return;

        setTamanhosBlocosConfiguracoes((atual) => ({
            ...atual,
            [chave]: tamanho,
        }));
    };

    const alternarVisibilidadeBlocoConfiguracao = (chave) => {
        setBlocosVisiveisConfiguracoes((atual) => ({
            ...atual,
            [chave]: atual[chave] === false,
        }));
    };

    const alternarRecolhidoBlocoConfiguracao = (chave) => {
        setBlocosRecolhidosConfiguracoes((atual) => ({
            ...atual,
            [chave]: !atual[chave],
        }));
    };

    const abrirTodosBlocosConfiguracao = () => {
        setBlocosRecolhidosConfiguracoes(CHAVES_BLOCOS_CONFIGURACOES_PADRAO.reduce((acc, chave) => {
            acc[chave] = false;
            return acc;
        }, {}));
    };

    const recolherTodosBlocosConfiguracao = () => {
        setBlocosRecolhidosConfiguracoes(CHAVES_BLOCOS_CONFIGURACOES_PADRAO.reduce((acc, chave) => {
            acc[chave] = true;
            return acc;
        }, {}));
    };

    const restaurarOrganizacaoCardsConfiguracoes = () => {
        setBlocosVisiveisConfiguracoes(BLOCOS_CONFIGURACOES_VISIVEIS_PADRAO);
        setBlocosRecolhidosConfiguracoes(BLOCOS_CONFIGURACOES_RECOLHIDOS_PADRAO);
        setOrdemBlocosConfiguracoes(CHAVES_BLOCOS_CONFIGURACOES_PADRAO);
        setTamanhosBlocosConfiguracoes(BLOCOS_CONFIGURACOES_TAMANHOS_PADRAO);
    };

    const bloquearConfiguracaoCriticaSeNecessario = (setMensagemDestino = null) => {
        if (podeAlterarConfiguracoesCriticasSistema) return false;

        if (typeof setMensagemDestino === "function") {
            setMensagemDestino(mensagemBloqueioConfiguracoesCriticasSistema);
        }

        return true;
    };

    const confirmarAcaoCriticaConfiguracoes = (
        mensagemConfirmacao,
        setMensagemDestino = null,
        mensagemCancelamento = "Ação crítica cancelada. Nenhuma configuração foi alterada."
    ) => {
        if (bloquearConfiguracaoCriticaSeNecessario(setMensagemDestino)) return false;

        if (typeof window !== "undefined" && !window.confirm(mensagemConfirmacao)) {
            if (typeof setMensagemDestino === "function") {
                setMensagemDestino(mensagemCancelamento);
            }

            return false;
        }

        return true;
    };

    const alterarCampoSenhaConfiguracoes = (campo, valor) => {
        setSenhaConfiguracoesFormulario((atual) => ({
            ...atual,
            [campo]: valor,
        }));
        setMensagemSenhaConfiguracoes("Preencha os campos e salve para alterar a senha local das Configurações.");
    };

    const salvarSenhaConfiguracoes = async (evento) => {
        evento.preventDefault();

        if (bloquearConfiguracaoCriticaSeNecessario(setMensagemSenhaConfiguracoes)) return;

        const senhaAtual = senhaConfiguracoesFormulario.atual.trim();
        const novaSenha = senhaConfiguracoesFormulario.nova.trim();
        const confirmarSenha = senhaConfiguracoesFormulario.confirmar.trim();

        if (senhaAtual !== senhaConfiguracoesSistema) {
            setMensagemSenhaConfiguracoes("Senha atual incorreta. A senha das Configurações não foi alterada.");
            return;
        }

        if (novaSenha.length < 4) {
            setMensagemSenhaConfiguracoes("A nova senha precisa ter pelo menos 4 caracteres.");
            return;
        }

        if (novaSenha !== confirmarSenha) {
            setMensagemSenhaConfiguracoes("A confirmação da nova senha não confere.");
            return;
        }

        setMensagemSenhaConfiguracoes("Salvando senha das Configurações...");

        if (typeof onSalvarSenhaConfiguracoes === "function") {
            const resultado = await onSalvarSenhaConfiguracoes(novaSenha);
            setMensagemSenhaConfiguracoes(resultado?.mensagem || "Senha das Configurações atualizada.");
        } else {
            setMensagemSenhaConfiguracoes("Senha das Configurações atualizada localmente.");
        }

        setSenhaConfiguracoesFormulario({ atual: "", nova: "", confirmar: "" });
    };

    const restaurarSenhaConfiguracoesPadrao = async () => {
        if (!confirmarAcaoCriticaConfiguracoes(
            "Restaurar a senha padrão 2026 das Configurações? Essa ação altera a proteção local desta área administrativa.",
            setMensagemSenhaConfiguracoes,
            "Restauração da senha padrão cancelada."
        )) return;

        const senhaPadrao = restaurarSenhaConfiguracoesSistema();
        setMensagemSenhaConfiguracoes("Restaurando senha padrão das Configurações...");

        if (typeof onSalvarSenhaConfiguracoes === "function") {
            const resultado = await onSalvarSenhaConfiguracoes(senhaPadrao);
            setMensagemSenhaConfiguracoes(resultado?.mensagem || "Senha padrão 2026 restaurada.");
        } else {
            setMensagemSenhaConfiguracoes("Senha padrão 2026 restaurada localmente.");
        }

        setSenhaConfiguracoesFormulario({ atual: "", nova: "", confirmar: "" });
    };

    const blocoConfiguracaoVisivel = (chave) => blocosVisiveisConfiguracoes[chave] !== false;
    const blocoConfiguracaoRecolhido = (chave) => Boolean(blocosRecolhidosConfiguracoes[chave]);

    const botaoRecolherBlocoConfiguracao = (chave, extraClassName = "") => {
        const recolhido = blocoConfiguracaoRecolhido(chave);

        return (
            <button
                type="button"
                onClick={() => alternarRecolhidoBlocoConfiguracao(chave)}
                className={classNames(
                    "inline-flex min-h-[34px] items-center justify-center gap-2 rounded-2xl bg-slate-950 px-3.5 py-2 text-xs font-black text-white shadow-sm ring-1 ring-slate-950 transition hover:-translate-y-0.5 hover:bg-slate-800",
                    extraClassName
                )}
            >
                {recolhido ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
                {recolhido ? "Abrir card" : "Recolher"}
            </button>
        );
    };

    const topoControleBlocoConfiguracao = (chave, titulo = "") => (
        <div className="mb-2 flex items-center justify-end gap-2">
            {botaoRecolherBlocoConfiguracao(chave, "w-full sm:w-auto")}
        </div>
    );

    const renderBlocoConfiguracaoComControle = (chave, titulo, descricao, conteudo) => {
        if (!blocoConfiguracaoVisivel(chave)) return null;

        if (blocoConfiguracaoRecolhido(chave)) {
            return (
                <Card className="h-full py-3">
                    <div className="flex min-w-0 items-center justify-between gap-3">
                        <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Card recolhido</p>
                            <h2 className="mt-0.5 truncate text-sm font-black leading-tight text-slate-950">{titulo}</h2>
                            <p className="mt-0.5 line-clamp-1 text-xs leading-relaxed text-slate-500">{descricao}</p>
                        </div>
                        <div className="shrink-0">
                            {botaoRecolherBlocoConfiguracao(chave, "px-3 py-1.5 text-[11px]")}
                        </div>
                    </div>
                </Card>
            );
        }

        if (React.isValidElement(conteudo)) {
            return React.cloneElement(conteudo, {
                className: classNames(conteudo.props.className || "", "h-full"),
                children: (
                    <>
                        {topoControleBlocoConfiguracao(chave, titulo)}
                        {conteudo.props.children}
                    </>
                ),
            });
        }

        return (
            <Card>
                {topoControleBlocoConfiguracao(chave, titulo)}
                {conteudo}
            </Card>
        );
    };

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setLimitesEditaveis(normalizarLimitesCarregamentoSistema(limites));
        }, 0);

        return () => window.clearTimeout(timer);
    }, [limites]);

    useEffect(() => {
        if (mensagemSenhaConfiguracoesSistemaApp) {
            setMensagemSenhaConfiguracoes(mensagemSenhaConfiguracoesSistemaApp);
        }
    }, [mensagemSenhaConfiguracoesSistemaApp]);

    const alterarLimite = (chave, valor) => {
        setLimitesEditaveis((atual) => ({
            ...atual,
            [chave]: valor,
        }));
    };

    const salvarLimites = () => {
        if (bloquearConfiguracaoCriticaSeNecessario(setMensagemLimites)) return;

        const normalizados = normalizarLimitesCarregamentoSistema(limitesEditaveis);

        if (typeof onSalvarLimites === "function") {
            const retorno = onSalvarLimites(normalizados);
            setLimitesEditaveis(normalizarLimitesCarregamentoSistema(retorno || normalizados));
        } else {
            setLimitesEditaveis(normalizados);
        }

        setMensagemLimites("Limites salvos localmente. Use Atualizar informações ou reabra a tela para aplicar a nova carga.");
    };

    const restaurarLimites = () => {
        if (!confirmarAcaoCriticaConfiguracoes(
            "Restaurar os limites padrão de carregamento? Isso pode alterar a quantidade de registros carregados nas telas.",
            setMensagemLimites,
            "Restauração dos limites cancelada."
        )) return;

        const padrao = normalizarLimitesCarregamentoSistema(LIMITES_CARREGAMENTO_SISTEMA);

        if (typeof onSalvarLimites === "function") {
            onSalvarLimites(padrao);
        }

        setLimitesEditaveis(padrao);
        setMensagemLimites("Limites padrão restaurados.");
    };

    const linkAuditoriaPublica = useMemo(() => montarLinkAuditoriaPublicaSistema({
        tokenPublico: configAuditoriaPublica.tokenPublico,
    }), [configAuditoriaPublica.tokenPublico]);

    const avaliacoesSegurancaAuditoriaPublica = useMemo(
        () => avaliarSegurancaAuditoriaPublica(configAuditoriaPublica),
        [configAuditoriaPublica]
    );

    const resumoSegurancaAuditoriaPublica = useMemo(
        () => calcularResumoSegurancaAuditoriaPublica(avaliacoesSegurancaAuditoriaPublica),
        [avaliacoesSegurancaAuditoriaPublica]
    );

    const avaliacoesSegurancaStorage = useMemo(() => avaliarSegurancaStorageSistema(), []);

    const resumoSegurancaStorage = useMemo(
        () => calcularResumoSegurancaStorageSistema(avaliacoesSegurancaStorage),
        [avaliacoesSegurancaStorage]
    );

    const avaliacoesRevisaoSupabase = useMemo(() => avaliarRevisaoSupabaseSistema(), []);

    const resumoRevisaoSupabase = useMemo(
        () => calcularResumoRevisaoSupabaseSistema(avaliacoesRevisaoSupabase),
        [avaliacoesRevisaoSupabase]
    );

    const alterarConfigAuditoriaPublica = (campo, valor) => {
        setConfigAuditoriaPublica((atual) => ({
            ...atual,
            [campo]: valor,
        }));
    };

    const salvarConfigAuditoriaPublica = () => {
        if (bloquearConfiguracaoCriticaSeNecessario(setMensagemAuditoriaPublica)) return;

        if (!String(configAuditoriaPublica.senhaReferencia || "").trim()) {
            setMensagemAuditoriaPublica("Informe uma senha de referência antes de salvar a configuração da Auditoria pública.");
            return;
        }

        const normalizada = salvarConfiguracaoAuditoriaPublicaSistema({
            senhaReferencia: configAuditoriaPublica.senhaReferencia,
            exigirSenha: configAuditoriaPublica.exigirSenha,
        });

        setConfigAuditoriaPublica((atual) => ({
            ...normalizada,
            tokenPublico: atual.tokenPublico,
        }));
        setMensagemAuditoriaPublica("Senha de referência salva localmente. O token público continua vindo do Supabase.");
    };

    const restaurarConfigAuditoriaPublica = async () => {
        if (!confirmarAcaoCriticaConfiguracoes(
            "Restaurar a configuração padrão da Auditoria pública? O token será recarregado do Supabase e a referência local será redefinida.",
            setMensagemAuditoriaPublica,
            "Restauração da Auditoria pública cancelada."
        )) return;

        restaurarConfiguracaoAuditoriaPublicaPadrao();
        await carregarConfiguracaoAuditoriaPublicaSupabase();
    };


    const montarRelatorioConfiguracoesSistemaTexto = () => {
        const dataGeracao = new Date().toLocaleString("pt-BR");
        const limitesTexto = DESCRICOES_LIMITES_CARREGAMENTO_SISTEMA.map((limite) => (
            `- ${limite.label}: ${limitesEditaveis[limite.chave] ?? limite.valor} (${limite.detalhe})`
        ));

        return [
            "RELATÓRIO ADMINISTRATIVO - CONFIGURAÇÕES DO SISTEMA SST",
            "",
            `Gerado em: ${dataGeracao}`,
            `Usuário autenticado: ${usuario?.email || "não informado"}`,
            `Perfil atual: ${resumoPermissaoSistemaAtual.perfil}`,
            `Status do usuário: ${resumoPermissaoSistemaAtual.status}`,
            `Acesso global: ${resumoPermissaoSistemaAtual.acessoGlobal ? "sim" : "não"}`,
            "",
            "1. PERMISSÕES E USUÁRIOS",
            `- Usuários cadastrados: ${resumoUsuariosPermissoesSistema.total}`,
            `- Usuários ativos: ${resumoUsuariosPermissoesSistema.ativos}`,
            `- Administradores: ${resumoUsuariosPermissoesSistema.administradores}`,
            `- Bloqueados: ${resumoUsuariosPermissoesSistema.bloqueados}`,
            `- Solicitações pendentes: ${resumoSolicitacoesAcessoSistema.pendentes}`,
            `- Solicitações aprovadas: ${resumoSolicitacoesAcessoSistema.aprovadas}`,
            `- Solicitações concluídas: ${resumoSolicitacoesAcessoSistema.concluidas}`,
            `- Solicitações recusadas: ${resumoSolicitacoesAcessoSistema.recusadas}`,
            "",
            "2. LIMITES DE CARREGAMENTO",
            ...limitesTexto,
            `- Limite visual do Storage: ${limitesEditaveis.storageMb || limites.storageMb || 1024} MB`,
            "",
            "3. AUDITORIA DO SISTEMA",
            `- Eventos habilitados: ${totalEventosHabilitados}/${eventosAuditoria.length}`,
            `- Origem da configuração: ${origemConfig === "supabase" ? "Supabase" : "Local"}`,
            `- Eventos em modo de salvamento: ${salvandoConfig ? "sim" : "não"}`,
            "",
            "4. AUDITORIA PÚBLICA / TOKEN",
            `- Origem do token/configuração: ${origemAuditoriaPublica || "não informada"}`,
            `- Token público: ${configAuditoriaPublica.tokenPublico ? "configurado" : "não configurado"}`,
            `- Exigir senha: ${configAuditoriaPublica.exigirSenha ? "sim" : "não"}`,
            `- Permitir nova auditoria: ${configAuditoriaPublica.permitirNovaAuditoria ? "sim" : "não"}`,
            `- Link público: ${linkAuditoriaPublica || "não disponível"}`,
            "",
            "5. SEGURANÇA E CHECKLISTS",
            `- Auditoria pública: ${resumoSegurancaAuditoriaPublica.texto} (${resumoSegurancaAuditoriaPublica.detalhe})`,
            `- Storage privado: ${resumoSegurancaStorage.texto} (${resumoSegurancaStorage.detalhe})`,
            `- Supabase/RLS/RPC: ${resumoRevisaoSupabase.texto} (${resumoRevisaoSupabase.detalhe})`,
            "",
            "6. AÇÕES CRÍTICAS DO USUÁRIO ATUAL",
            `- Pode excluir registros: ${resumoAcoesCriticasSistemaAtual.podeExcluir ? "sim" : "não"}`,
            `- Pode limpar arquivos: ${resumoAcoesCriticasSistemaAtual.podeLimparArquivos ? "sim" : "não"}`,
            `- Pode gerenciar permissões: ${resumoAcoesCriticasSistemaAtual.podeGerenciarPermissoes ? "sim" : "não"}`,
            `- Pode alterar configurações críticas: ${resumoAcoesCriticasSistemaAtual.podeAlterarConfiguracoesCriticas ? "sim" : "não"}`,
            "",
            "7. SENHA DAS CONFIGURAÇÕES",
            `- Tipo: ${senhaConfiguracoesSistema === SENHA_CONFIGURACOES_PADRAO ? "padrão 2026" : "personalizada"}`,
            `- Origem: ${origemSenhaConfiguracoesSistema || "local"}`,
            "",
            "Observação: esta evidência é um resumo administrativo da tela Configurações. Não substitui conferência direta das policies, RLS, RPCs e buckets no Supabase.",
        ].join("\n");
    };

    const copiarRelatorioConfiguracoesSistema = async () => {
        try {
            await navigator.clipboard?.writeText(montarRelatorioConfiguracoesSistemaTexto());
            setMensagemEvidenciasConfiguracoes("Relatório administrativo copiado para a área de transferência.");
        } catch {
            setMensagemEvidenciasConfiguracoes("Não foi possível copiar o relatório automaticamente. Use o botão de baixar arquivo TXT.");
        }
    };

    const baixarRelatorioConfiguracoesSistema = () => {
        if (typeof window === "undefined") return;

        const conteudo = montarRelatorioConfiguracoesSistemaTexto();
        const blob = new Blob([conteudo], { type: "text/plain;charset=utf-8" });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        const dataArquivo = new Date().toISOString().slice(0, 10);

        link.href = url;
        link.download = `relatorio-configuracoes-sst-${dataArquivo}.txt`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        setMensagemEvidenciasConfiguracoes("Relatório administrativo TXT gerado para download.");
    };

    const copiarLinkAuditoriaPublica = async () => {
        try {
            await navigator.clipboard?.writeText(linkAuditoriaPublica);
            setMensagemAuditoriaPublica("Link público copiado para a área de transferência.");
        } catch {
            setMensagemAuditoriaPublica("Não foi possível copiar automaticamente. Copie o link manualmente.");
        }
    };

    const copiarChecklistSegurancaAuditoriaPublica = async () => {
        try {
            await navigator.clipboard?.writeText(montarChecklistSegurancaAuditoriaPublicaTexto(avaliacoesSegurancaAuditoriaPublica));
            setMensagemAuditoriaPublica("Checklist de segurança copiado para a área de transferência.");
        } catch {
            setMensagemAuditoriaPublica("Não foi possível copiar o checklist automaticamente.");
        }
    };

    const copiarChecklistSegurancaStorage = async () => {
        try {
            await navigator.clipboard?.writeText(montarChecklistSegurancaStorageSistemaTexto(avaliacoesSegurancaStorage));
            setMensagemStorage("Checklist de Storage copiado para a área de transferência.");
        } catch {
            setMensagemStorage("Não foi possível copiar o checklist de Storage automaticamente.");
        }
    };

    const copiarChecklistRevisaoSupabase = async () => {
        try {
            await navigator.clipboard?.writeText(montarChecklistRevisaoSupabaseSistemaTexto(avaliacoesRevisaoSupabase));
            setMensagemSupabase("Checklist Supabase/RLS/RPC copiado para a área de transferência.");
        } catch {
            setMensagemSupabase("Não foi possível copiar o checklist Supabase automaticamente.");
        }
    };

    const carregarPermissaoSistemaAtual = async () => {
        setCarregandoPermissaoSistema(true);
        setMensagemPermissaoSistema("Carregando permissão geral do usuário no Supabase...");

        try {
            const permissao = await carregarPermissaoSistemaAtualService({ supabase });
            setPermissaoSistemaAtual(permissao);

            if (permissao) {
                setMensagemPermissaoSistema("Permissão geral carregada do Supabase. Esta permissão protege a rota de Configurações, botões críticos e gestão de usuários.");
            } else {
                setMensagemPermissaoSistema("Nenhuma permissão geral encontrada para o usuário autenticado. As ações administrativas permanecem bloqueadas.");
            }
        } catch (erro) {
            setPermissaoSistemaAtual(null);
            setMensagemPermissaoSistema(`Não foi possível carregar a permissão geral. Supabase: ${erro?.message || "erro não identificado"}`);
        } finally {
            setCarregandoPermissaoSistema(false);
        }
    };


    const carregarUsuariosPermissoesSistema = async () => {
        if (!podeGerenciarPermissoesSistema) {
            setUsuariosPermissoesSistema([]);
            setMensagemUsuariosPermissoesSistema(
                "Lista administrativa não consultada. O usuário atual não possui permissão para gerenciar permissões."
            );
            setCarregandoUsuariosPermissoesSistema(false);
            return;
        }

        setCarregandoUsuariosPermissoesSistema(true);
        setMensagemUsuariosPermissoesSistema("Carregando lista administrativa de usuários no Supabase...");

        try {
            const usuariosListados = await listarUsuariosPermissoesSistemaService({ supabase });
            setUsuariosPermissoesSistema(usuariosListados);

            if (usuariosListados.length > 0) {
                setMensagemUsuariosPermissoesSistema(
                    `${usuariosListados.length} usuário(s) carregado(s) da lista administrativa de permissões.`
                );
            } else {
                setMensagemUsuariosPermissoesSistema("Nenhum usuário foi retornado pela RPC administrativa de permissões.");
            }
        } catch (erro) {
            setUsuariosPermissoesSistema([]);
            setMensagemUsuariosPermissoesSistema(
                `Não foi possível carregar a lista administrativa. Supabase: ${erro?.message || "erro não identificado"}`
            );
        } finally {
            setCarregandoUsuariosPermissoesSistema(false);
        }
    };

    const carregarSolicitacoesAcessoSistema = async () => {
        if (!podeGerenciarPermissoesSistema) {
            setSolicitacoesAcessoSistema([]);
            setMensagemSolicitacoesAcessoSistema(
                "Solicitações não consultadas. O usuário atual não possui permissão para gerenciar permissões."
            );
            setCarregandoSolicitacoesAcessoSistema(false);
            return;
        }

        setCarregandoSolicitacoesAcessoSistema(true);
        setMensagemSolicitacoesAcessoSistema("Carregando solicitações de acesso no Supabase...");

        try {
            const solicitacoesListadas = await listarSolicitacoesAcessoSistemaService({ supabase });
            setSolicitacoesAcessoSistema(solicitacoesListadas);

            if (solicitacoesListadas.length > 0) {
                setMensagemSolicitacoesAcessoSistema(
                    `${solicitacoesListadas.length} solicitação(ões) carregada(s). ${solicitacoesListadas.filter((item) => item.status === "pendente").length} pendente(s).`
                );
            } else {
                setMensagemSolicitacoesAcessoSistema("Nenhuma solicitação de acesso foi encontrada.");
            }
        } catch (erro) {
            setSolicitacoesAcessoSistema([]);
            setMensagemSolicitacoesAcessoSistema(
                `Não foi possível carregar as solicitações de acesso. Supabase: ${erro?.message || "erro não identificado"}`
            );
        } finally {
            setCarregandoSolicitacoesAcessoSistema(false);
        }
    };

    const prepararUsuarioPermissaoPorSolicitacaoAcesso = (solicitacao = {}) => {
        if (!podeGerenciarPermissoesSistema) {
            setMensagemFormularioNovoUsuarioPermissao(bloqueioGerenciarPermissoesSistema.mensagem);
            return;
        }

        if (!solicitacao?.email) {
            setMensagemFormularioNovoUsuarioPermissao("Não foi possível preparar a permissão: solicitação sem e-mail.");
            return;
        }

        const perfilSugerido = sugerirPerfilPorSolicitacaoAcesso(solicitacao);
        const nomeSugerido = solicitacao.nome || solicitacao.email.split("@")[0] || "";
        const areaSensivel = solicitacaoAcessoEhAreaSensivel(solicitacao);

        setUsuarioPermissaoSistemaEmEdicao(null);
        setSolicitacaoAcessoPreparadaSistema(solicitacao);
        setNovoUsuarioPermissaoSistema({
            nome: nomeSugerido,
            email: solicitacao.email || "",
            funcao: "",
            perfil: perfilSugerido,
            ativo: true,
            bloqueado: false,
            acesso_global: false,
        });
        setMostrarFormularioNovoUsuarioPermissao(true);
        setMensagemFormularioNovoUsuarioPermissao(
            areaSensivel
                ? `Solicitação de ${solicitacao.email} preparada com perfil Consulta por segurança. Configurações, Storage e Auditoria do Sistema exigem ajuste manual por administrador antes de salvar.`
                : `Solicitação de ${solicitacao.email} preparada no formulário. Confira o perfil sugerido, ajuste se necessário e clique em Salvar no Supabase.`
        );

        window.requestAnimationFrame(() => {
            document.getElementById("formulario-usuario-permissao-sistema")?.scrollIntoView({
                behavior: "smooth",
                block: "start",
            });
        });
    };

    const responderSolicitacaoAcessoSistema = async (solicitacao, statusResposta) => {
        if (!podeGerenciarPermissoesSistema) {
            setMensagemRespostaSolicitacaoAcessoSistema(bloqueioGerenciarPermissoesSistema.mensagem);
            return;
        }

        if (!solicitacao?.id) {
            setMensagemRespostaSolicitacaoAcessoSistema("Solicitação sem identificação para aprovar ou recusar.");
            return;
        }

        const statusTratado = statusResposta === "aprovada" ? "aprovada" : "recusada";
        const textoAcao = statusTratado === "aprovada" ? "Aprovando" : "Recusando";
        const textoResultado = statusTratado === "aprovada" ? "aprovada" : "recusada";

        setProcessandoRespostaSolicitacaoAcessoSistema(solicitacao.id);
        setMensagemRespostaSolicitacaoAcessoSistema(`${textoAcao} solicitação de ${solicitacao.email || "usuário sem e-mail"}...`);

        try {
            const solicitacaoAtualizada = await responderSolicitacaoAcessoSistemaService({
                supabase,
                solicitacaoId: solicitacao.id,
                status: statusTratado,
                respostaAdmin: respostaAdminSolicitacaoAcessoSistema,
            });

            if (solicitacaoAtualizada?.id) {
                setSolicitacoesAcessoSistema((listaAtual) =>
                    listaAtual.map((item) => item.id === solicitacaoAtualizada.id ? solicitacaoAtualizada : item)
                );
            }

            if (statusTratado === "aprovada") {
                prepararUsuarioPermissaoPorSolicitacaoAcesso(solicitacaoAtualizada || solicitacao);
            }

            setMensagemRespostaSolicitacaoAcessoSistema(
                statusTratado === "aprovada"
                    ? `Solicitação ${textoResultado} com sucesso. O formulário de usuário/permissão foi preparado para conferência antes de salvar.`
                    : `Solicitação ${textoResultado} com sucesso. Nenhuma permissão de usuário foi alterada.`
            );
            setRespostaAdminSolicitacaoAcessoSistema("");
        } catch (erro) {
            setMensagemRespostaSolicitacaoAcessoSistema(
                `Não foi possível responder a solicitação. Supabase: ${erro?.message || "erro não identificado"}`
            );
        } finally {
            setProcessandoRespostaSolicitacaoAcessoSistema("");
        }
    };

    const alterarCampoNovoUsuarioPermissao = (campo, valor) => {
        if (!podeGerenciarPermissoesSistema) {
            setMensagemFormularioNovoUsuarioPermissao(bloqueioGerenciarPermissoesSistema.mensagem);
            return;
        }

        setNovoUsuarioPermissaoSistema((atual) => {
            const proximo = {
                ...atual,
                [campo]: valor,
            };

            if (campo === "perfil") {
                if (valor === "bloqueado") {
                    proximo.ativo = false;
                    proximo.bloqueado = true;
                    proximo.acesso_global = false;
                } else {
                    if (atual.perfil === "bloqueado") {
                        proximo.ativo = true;
                        proximo.bloqueado = false;
                    }

                    if (valor !== "administrador") {
                        proximo.acesso_global = false;
                    }
                }
            }

            if (campo === "bloqueado" && valor === true) {
                proximo.ativo = false;
                proximo.acesso_global = false;
            }

            if (campo === "ativo" && valor === true && proximo.perfil !== "bloqueado") {
                proximo.bloqueado = false;
            }

            if (campo === "acesso_global" && valor === true && proximo.perfil !== "administrador") {
                proximo.acesso_global = false;
            }

            return proximo;
        });

        if (campo === "perfil" && valor === "bloqueado") {
            setMensagemFormularioNovoUsuarioPermissao("Perfil Bloqueado selecionado. O usuário será salvo como inativo, bloqueado e sem acesso global.");
            return;
        }

        if (campo === "acesso_global" && valor === true && novoUsuarioPermissaoSistema.perfil !== "administrador") {
            setMensagemFormularioNovoUsuarioPermissao("Acesso global é permitido apenas para perfil Administrador. O campo foi mantido desmarcado.");
            return;
        }

        setMensagemFormularioNovoUsuarioPermissao(
            modoEdicaoUsuarioPermissaoSistema
                ? "Campos atualizados. Ao salvar, a permissão existente será atualizada no Supabase pela RPC administrativa."
                : "Campos atualizados. Ao salvar, a permissão será gravada no Supabase pela RPC administrativa."
        );
    };

    const limparFormularioNovoUsuarioPermissao = () => {
        setUsuarioPermissaoSistemaEmEdicao(null);
        setSolicitacaoAcessoPreparadaSistema(null);
        setNovoUsuarioPermissaoSistema({
            nome: "",
            email: "",
            funcao: "",
            perfil: "tecnico_sst",
            ativo: true,
            bloqueado: false,
            acesso_global: false,
        });
        setMensagemFormularioNovoUsuarioPermissao(
            "Formulário limpo. Nenhuma nova gravação foi enviada ao Supabase."
        );
    };

    const selecionarUsuarioPermissaoParaEdicao = (usuarioSelecionado = null) => {
        if (!podeGerenciarPermissoesSistema) {
            setMensagemFormularioNovoUsuarioPermissao(bloqueioGerenciarPermissoesSistema.mensagem);
            return;
        }

        if (!usuarioSelecionado?.email) {
            setMensagemFormularioNovoUsuarioPermissao("Não foi possível carregar este usuário para edição: e-mail não informado.");
            return;
        }

        setUsuarioPermissaoSistemaEmEdicao(usuarioSelecionado);
        setSolicitacaoAcessoPreparadaSistema(null);
        setNovoUsuarioPermissaoSistema({
            nome: usuarioSelecionado.nome || "",
            email: usuarioSelecionado.email || "",
            funcao: usuarioSelecionado.funcao || "",
            perfil: usuarioSelecionado.perfil || "consulta",
            ativo: Boolean(usuarioSelecionado.ativo),
            bloqueado: Boolean(usuarioSelecionado.bloqueado),
            acesso_global: Boolean(usuarioSelecionado.acesso_global),
        });
        setMostrarFormularioNovoUsuarioPermissao(true);
        setMensagemFormularioNovoUsuarioPermissao(
            `Editando permissão de ${usuarioSelecionado.email}. O e-mail fica travado para evitar criar cadastro duplicado.`
        );
    };

    const salvarNovoUsuarioPermissaoSistema = async (evento) => {
        evento.preventDefault();

        if (salvandoNovoUsuarioPermissaoSistema) return;

        if (!podeGerenciarPermissoesSistema) {
            setMensagemFormularioNovoUsuarioPermissao(bloqueioGerenciarPermissoesSistema.mensagem);
            return;
        }

        const emailTratado = novoUsuarioPermissaoSistema.email.trim().toLowerCase();
        const nomeTratado = novoUsuarioPermissaoSistema.nome.trim();

        if (!nomeTratado || !emailTratado) {
            setMensagemFormularioNovoUsuarioPermissao(
                "Preencha nome e e-mail antes de salvar a permissão do usuário no Supabase."
            );
            return;
        }

        setSalvandoNovoUsuarioPermissaoSistema(true);
        setMensagemFormularioNovoUsuarioPermissao(
            modoEdicaoUsuarioPermissaoSistema
                ? `Atualizando permissão de ${emailTratado} no Supabase...`
                : `Salvando permissão de ${emailTratado} no Supabase...`
        );

        try {
            const usuarioSalvo = await salvarUsuarioPermissaoSistemaService({
                supabase,
                usuario: novoUsuarioPermissaoSistema,
                usuarioAtual: permissaoSistemaAtual || usuario,
            });

            await carregarUsuariosPermissoesSistema();

            if (usuarioSalvo?.email === permissaoSistemaAtual?.email) {
                await carregarPermissaoSistemaAtual();
            }

            let mensagemConclusaoSolicitacao = "";

            if (
                solicitacaoAcessoPreparadaSistema?.id
                && (solicitacaoAcessoPreparadaSistema.email || "").toLowerCase() === emailTratado
            ) {
                try {
                    const solicitacaoConcluida = await concluirSolicitacaoAcessoSistemaService({
                        supabase,
                        solicitacaoId: solicitacaoAcessoPreparadaSistema.id,
                        respostaAdmin: `Permissão salva no Supabase para ${usuarioSalvo?.email || emailTratado}.`,
                    });

                    if (solicitacaoConcluida?.id) {
                        setSolicitacoesAcessoSistema((listaAtual) =>
                            listaAtual.map((item) => item.id === solicitacaoConcluida.id ? solicitacaoConcluida : item)
                        );
                    }

                    setSolicitacaoAcessoPreparadaSistema(null);
                    mensagemConclusaoSolicitacao = " Solicitação vinculada e marcada como concluída.";
                } catch (erroConclusao) {
                    mensagemConclusaoSolicitacao = ` Permissão salva, mas não foi possível concluir a solicitação: ${erroConclusao?.message || "erro não identificado"}.`;
                }
            }

            const operacao = modoEdicaoUsuarioPermissaoSistema ? "atualizada" : "salva";

            setUsuarioPermissaoSistemaEmEdicao(null);
            setNovoUsuarioPermissaoSistema({
                nome: "",
                email: "",
                funcao: "",
                perfil: "tecnico_sst",
                ativo: true,
                bloqueado: false,
                acesso_global: false,
            });

            setMensagemFormularioNovoUsuarioPermissao(
                `Permissão ${operacao} no Supabase para ${usuarioSalvo?.email || emailTratado}. A lista administrativa foi atualizada.${mensagemConclusaoSolicitacao}`
            );
        } catch (erro) {
            setMensagemFormularioNovoUsuarioPermissao(
                `Não foi possível salvar a permissão. Supabase: ${erro?.message || "erro não identificado"}`
            );
        } finally {
            setSalvandoNovoUsuarioPermissaoSistema(false);
        }
    };


    const carregarConfiguracaoAuditoriaPublicaSupabase = async () => {
        setCarregandoAuditoriaPublica(true);
        setMensagemAuditoriaPublica("Carregando token público ativo no Supabase...");

        try {
            const configuracaoLocal = carregarConfiguracaoAuditoriaPublicaSistema();
            const resultado = await carregarTokenAuditoriaPublicaAtivoSupabase();

            setOrigemAuditoriaPublica(resultado?.origem || "supabase");

            if (resultado?.tokenPublico) {
                setConfigAuditoriaPublica({
                    ...configuracaoLocal,
                    tokenPublico: resultado.tokenPublico,
                    exigirSenha: resultado.requerSenha !== false,
                });
                setMensagemAuditoriaPublica("Token público ativo carregado do Supabase. O navegador não é mais a fonte oficial do token.");
                return;
            }

            setConfigAuditoriaPublica({
                ...configuracaoLocal,
                tokenPublico: "",
            });
            setMensagemAuditoriaPublica(resultado?.erro || "Nenhum token público ativo foi encontrado no Supabase.");
        } finally {
            setCarregandoAuditoriaPublica(false);
        }
    };

    const carregarConfiguracao = async () => {
        setCarregandoConfig(true);
        setMensagemConfig("Carregando configuração dos eventos...");

        try {
            const resultado = await carregarConfiguracaoEventosAuditoriaSistemaSupabase();
            setConfigEventos(resultado.configuracao);
            setOrigemConfig(resultado.origem || "local");

            if (resultado.erro) {
                setMensagemConfig(`Usando configuração local. Supabase: ${resultado.erro}`);
            } else if (resultado.origem === "supabase") {
                setMensagemConfig("Configuração carregada do Supabase.");
            } else {
                setMensagemConfig("Configuração carregada localmente.");
            }
        } finally {
            setCarregandoConfig(false);
        }
    };

    useEffect(() => {
        const timer = window.setTimeout(() => {
            carregarConfiguracao();
        }, 0);

        return () => window.clearTimeout(timer);
    }, []);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            carregarConfiguracaoAuditoriaPublicaSupabase();
        }, 0);

        return () => window.clearTimeout(timer);
    }, []);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            carregarPermissaoSistemaAtual();
        }, 0);

        return () => window.clearTimeout(timer);
    }, []);


    useEffect(() => {
        if (carregandoPermissaoSistema) return undefined;

        if (!permissaoSistemaAtual) {
            setUsuariosPermissoesSistema([]);
            setSolicitacoesAcessoSistema([]);
            setMensagemUsuariosPermissoesSistema(
                "Lista administrativa aguardando uma permissão válida do usuário atual."
            );
            setMensagemSolicitacoesAcessoSistema(
                "Solicitações aguardando uma permissão válida do usuário atual."
            );
            return undefined;
        }

        if (!podeGerenciarPermissoesSistema) {
            setUsuariosPermissoesSistema([]);
            setSolicitacoesAcessoSistema([]);
            setMensagemUsuariosPermissoesSistema(
                "Lista administrativa não consultada. O usuário atual não possui permissão para gerenciar permissões."
            );
            setMensagemSolicitacoesAcessoSistema(
                "Solicitações não consultadas. O usuário atual não possui permissão para gerenciar permissões."
            );
            return undefined;
        }

        const timer = window.setTimeout(() => {
            carregarUsuariosPermissoesSistema();
            carregarSolicitacoesAcessoSistema();
        }, 0);

        return () => window.clearTimeout(timer);
    }, [
        carregandoPermissaoSistema,
        podeGerenciarPermissoesSistema,
        permissaoSistemaAtual?.email,
        permissaoSistemaAtual?.perfil,
        permissaoSistemaAtual?.ativo,
        permissaoSistemaAtual?.bloqueado,
        permissaoSistemaAtual?.acesso_global,
    ]);


    const persistirConfiguracao = async (proximaConfiguracao, mensagemSucesso = "Configuração salva.") => {
        if (bloquearConfiguracaoCriticaSeNecessario(setMensagemConfig)) return;

        const normalizada = normalizarConfiguracaoEventosAuditoriaSistema(proximaConfiguracao);
        setConfigEventos(normalizada);
        salvarConfiguracaoEventosAuditoriaSistema(normalizada);
        setSalvandoConfig(true);
        setMensagemConfig("Salvando configuração...");

        try {
            const resultado = await salvarConfiguracaoEventosAuditoriaSistemaSupabase(normalizada);
            setOrigemConfig(resultado.origem || "local");

            if (resultado.ok) {
                setMensagemConfig(`${mensagemSucesso} Sincronizada no Supabase.`);
            } else {
                setMensagemConfig(`${mensagemSucesso} Mantida localmente. Supabase: ${resultado.erro}`);
            }
        } finally {
            setSalvandoConfig(false);
        }
    };

    const alternarEvento = (chave) => {
        const proxima = {
            ...configEventos,
            [chave]: configEventos[chave] === false,
        };

        persistirConfiguracao(proxima, "Evento atualizado.");
    };

    const definirTodosEventos = (habilitado) => {
        if (!habilitado && !confirmarAcaoCriticaConfiguracoes(
            "Desabilitar todos os eventos da Auditoria do Sistema? Essa ação reduz a rastreabilidade administrativa.",
            setMensagemConfig,
            "Desabilitação em massa dos eventos cancelada."
        )) return;

        const proxima = EVENTOS_AUDITORIA_SISTEMA_PADRAO.reduce((acc, evento) => {
            acc[evento.chave] = habilitado;
            return acc;
        }, {});

        persistirConfiguracao(
            proxima,
            habilitado ? "Todos os eventos foram habilitados." : "Todos os eventos foram desabilitados."
        );
    };

    const restaurarPadrao = () => {
        if (!confirmarAcaoCriticaConfiguracoes(
            "Restaurar o padrão de eventos da Auditoria do Sistema? As opções locais serão substituídas pelo padrão seguro.",
            setMensagemConfig,
            "Restauração dos eventos padrão cancelada."
        )) return;

        persistirConfiguracao(configuracaoPadraoEventosAuditoriaSistema(), "Configuração padrão restaurada.");
    };

    const cardsResumo = [
        {
            label: "Eventos habilitados",
            valor: `${totalEventosHabilitados}/${eventosAuditoria.length}`,
            detalhe: "Auditoria de sistema",
            icon: ShieldCheck,
        },
        {
            label: "Origem",
            valor: origemConfig === "supabase" ? "Supabase" : "Local",
            detalhe: origemConfig === "supabase" ? "Sincronizada no banco" : "Configuração local",
            icon: Database,
        },
        {
            label: "Limites",
            valor: `${limitesEditaveis.auditoriaSistema || 300} / ${limitesEditaveis.auditoriasCampo || 500}`,
            detalhe: "auditoria sistema / campo",
            icon: SlidersHorizontal,
        },
        {
            label: "Permissão atual",
            valor: permissaoSistemaAtual ? formatarPerfilPermissaoSistema(resumoPermissaoSistemaAtual.perfil) : "Não carregada",
            detalhe: permissaoSistemaAtual
                ? `${resumoPermissaoSistemaAtual.status} · ${resumoPermissaoSistemaAtual.acessoGlobal ? "acesso global" : "sem acesso global"}`
                : "carregar permissões",
            icon: ShieldCheck,
        },
        {
            label: "Alertas técnicos",
            valor: resumoRevisaoSupabase.texto,
            detalhe: `${resumoSegurancaAuditoriaPublica.detalhe} · ${resumoSegurancaStorage.detalhe}`,
            icon: ShieldAlert,
        },
    ];

    const secoesConfiguracoes = [
        { chave: "config-usuarios-permissoes", titulo: "Permissões e usuários", descricao: "Perfis, solicitações de acesso e gestão administrativa.", icon: ShieldCheck },
        { chave: "config-limites-carregamento", titulo: "Limites de carregamento", descricao: "Quantidade de registros por tela para manter desempenho.", icon: SlidersHorizontal },
        { chave: "config-auditoria-publica", titulo: "Auditoria pública / token", descricao: "Token ativo, senha de referência e link público.", icon: KeyRound },
        { chave: "config-arquivos-storage", titulo: "Arquivos salvos no Storage", descricao: "Capacidade, vínculos, filtros e limpeza protegida.", icon: Database },
        { chave: "config-relatorios-evidencias", titulo: "Relatórios e evidências", descricao: "Resumo copiável e TXT das configurações atuais.", icon: FileText },
        { chave: "config-senha-configuracoes", titulo: "Configurações críticas", descricao: "Senha local e ações sensíveis da área administrativa.", icon: Lock },
        { chave: "config-eventos-auditoria", titulo: "Eventos da Auditoria do Sistema", descricao: "Eventos registrados e exibidos no histórico administrativo.", icon: Settings },
        { chave: "config-seguranca-publica", titulo: "Checklist da auditoria pública", descricao: "Conferência operacional do QR Code público.", icon: ShieldAlert },
        { chave: "config-storage-privado", titulo: "Checklist do Storage privado", descricao: "Buckets, URLs assinadas e arquivos sensíveis.", icon: HardDrive },
        { chave: "config-supabase-geral", titulo: "Informações técnicas Supabase", descricao: "Tabelas, policies, RPCs e pontos de performance.", icon: Database },
        { chave: "config-status-etapa", titulo: "Resumo técnico da tela", descricao: "Estado atual das configurações e do usuário autenticado.", icon: CheckCircle2 },
    ];


    const secoesConfiguracoesOrdenadas = [
        ...ordemBlocosConfiguracoes
            .map((chave) => secoesConfiguracoes.find((secao) => secao.chave === chave))
            .filter(Boolean),
        ...secoesConfiguracoes.filter((secao) => !ordemBlocosConfiguracoes.includes(secao.chave)),
    ];

    const secoesConfiguracoesVisiveisOrdenadas = secoesConfiguracoesOrdenadas.filter((secao) => blocoConfiguracaoVisivel(secao.chave));

    const resumoPainelConfiguracoes = {
        total: secoesConfiguracoesOrdenadas.length,
        visiveis: secoesConfiguracoesOrdenadas.filter((secao) => blocoConfiguracaoVisivel(secao.chave)).length,
        abertos: secoesConfiguracoesOrdenadas.filter((secao) => blocoConfiguracaoVisivel(secao.chave) && !blocoConfiguracaoRecolhido(secao.chave)).length,
        recolhidos: secoesConfiguracoesOrdenadas.filter((secao) => blocoConfiguracaoVisivel(secao.chave) && blocoConfiguracaoRecolhido(secao.chave)).length,
        ocultos: secoesConfiguracoesOrdenadas.filter((secao) => !blocoConfiguracaoVisivel(secao.chave)).length,
        criticos: secoesConfiguracoesOrdenadas.filter((secao) => CHAVES_BLOCOS_CONFIGURACOES_CRITICOS.has(secao.chave)).length,
    };

    const secoesPersonalizacaoConfiguracoes = secoesConfiguracoesOrdenadas.filter((secao) => {
        const visivel = blocoConfiguracaoVisivel(secao.chave);
        const recolhido = blocoConfiguracaoRecolhido(secao.chave);
        const critico = CHAVES_BLOCOS_CONFIGURACOES_CRITICOS.has(secao.chave);

        if (filtroPainelConfiguracoes === "visiveis") return visivel;
        if (filtroPainelConfiguracoes === "ocultos") return !visivel;
        if (filtroPainelConfiguracoes === "abertos") return visivel && !recolhido;
        if (filtroPainelConfiguracoes === "recolhidos") return visivel && recolhido;
        if (filtroPainelConfiguracoes === "criticos") return critico;

        return true;
    });

    const renderBlocoConfiguracao = (chave) => {
        switch (chave) {
        case "config-eventos-auditoria":
            return renderBlocoConfiguracaoComControle(
                "config-eventos-auditoria",
                "Eventos da Auditoria do Sistema",
                "Eventos registrados e exibidos na auditoria.",
                (
                <Card>
                    <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 md:flex-row md:items-start md:justify-between">
                        <div>
                            <div className="flex items-center gap-2">
                                <Settings className="h-5 w-5 text-slate-500" />
                                <h2 id="config-eventos-auditoria" className="scroll-mt-24 text-lg font-black text-slate-950">Eventos da Auditoria do Sistema</h2>
                            </div>
                            <p className="mt-1 text-sm text-slate-500">
                                Escolha quais eventos o sistema deve registrar e exibir na Auditoria do Sistema.
                            </p>
                            <p className="mt-2 text-xs font-semibold text-slate-500">
                                Origem atual: <span className="font-black text-slate-900">{origemConfig === "supabase" ? "Supabase" : "Local"}</span>
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => definirTodosEventos(true)}
                                disabled={salvandoConfig}
                                className="rounded-2xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100 disabled:opacity-60"
                            >
                                Habilitar todos
                            </button>
                            <button
                                type="button"
                                onClick={() => definirTodosEventos(false)}
                                disabled={salvandoConfig}
                                className="rounded-2xl bg-orange-50 px-3 py-2 text-xs font-bold text-orange-700 ring-1 ring-orange-200 hover:bg-orange-100 disabled:opacity-60"
                            >
                                Desabilitar todos
                            </button>
                            <button
                                type="button"
                                onClick={restaurarPadrao}
                                disabled={salvandoConfig}
                                className="inline-flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-xs font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-60"
                            >
                                <RotateCcw className="h-3.5 w-3.5" />
                                Restaurar padrão
                            </button>
                        </div>
                    </div>

                    {mensagemConfig && (
                        <div className={classNames(
                            "mt-4 rounded-2xl px-4 py-3 text-sm font-semibold ring-1",
                            mensagemConfig.includes("Supabase:")
                                ? "bg-orange-50 text-orange-700 ring-orange-200"
                                : "bg-emerald-50 text-emerald-700 ring-emerald-200"
                        )}>
                            {mensagemConfig}
                        </div>
                    )}

                    <div className="mt-4 config-inner-grid">
                        {eventosAuditoria.map((evento) => (
                            <div key={evento.chave} className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black uppercase tracking-wide text-slate-500 ring-1 ring-slate-200">
                                                {evento.categoria}
                                            </span>
                                            <span className={classNames(
                                                "rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wide ring-1",
                                                evento.habilitado
                                                    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                                                    : "bg-slate-100 text-slate-500 ring-slate-200"
                                            )}>
                                                {evento.habilitado ? "Habilitado" : "Desabilitado"}
                                            </span>
                                        </div>
                                        <h3 className="mt-3 text-sm font-black text-slate-950">{evento.label}</h3>
                                        <p className="mt-1 text-xs leading-relaxed text-slate-500">{evento.descricao}</p>
                                        <p className="mt-2 text-[11px] font-mono text-slate-400">{evento.chave}</p>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => alternarEvento(evento.chave)}
                                        disabled={salvandoConfig || !podeAlterarConfiguracoesCriticasSistema}
                                        title={podeAlterarConfiguracoesCriticasSistema ? "Alterar evento de auditoria" : mensagemBloqueioConfiguracoesCriticasSistema}
                                        className={classNames(
                                            "shrink-0 rounded-2xl px-3 py-2 text-xs font-black ring-1 disabled:cursor-not-allowed disabled:opacity-60",
                                            evento.habilitado
                                                ? "bg-slate-950 text-white ring-slate-950 hover:bg-slate-800"
                                                : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-100"
                                        )}
                                    >
                                        {evento.habilitado ? "Desabilitar" : "Habilitar"}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
                )
            );

        case "config-limites-carregamento":
            return renderBlocoConfiguracaoComControle(
                "config-limites-carregamento",
                "Limites de carregamento",
                "Quantidade de registros por tela/carga.",
                (
                    <Card>
                        <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <div className="flex items-center gap-2">
                                    <SlidersHorizontal className="h-5 w-5 text-slate-500" />
                                    <h2 id="config-limites-carregamento" className="scroll-mt-24 text-lg font-black text-slate-950">Limites de carregamento</h2>
                                </div>
                                <p className="mt-1 text-sm text-slate-500">
                                    Ajuste quantos registros cada tela deve buscar por carga para equilibrar velocidade e histórico disponível.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={restaurarLimites}
                                disabled={!podeAlterarConfiguracoesCriticasSistema}
                                title={podeAlterarConfiguracoesCriticasSistema ? "Restaurar limites padrão" : mensagemBloqueioConfiguracoesCriticasSistema}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-3 py-2 text-xs font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                            >
                                <RotateCcw className="h-3.5 w-3.5" />
                                Restaurar limites
                            </button>
                        </div>

                        {mensagemLimites && (
                            <div className="mt-4 rounded-2xl bg-blue-50 px-4 py-3 text-xs font-bold text-blue-700 ring-1 ring-blue-200">
                                {mensagemLimites}
                            </div>
                        )}

                        <div className="mt-4 space-y-3">
                            {DESCRICOES_LIMITES_CARREGAMENTO_SISTEMA.map((limite) => (
                                <label key={limite.chave} className="block rounded-2xl bg-slate-50 px-3 py-3 ring-1 ring-slate-100">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-sm font-bold text-slate-800">{limite.label}</p>
                                            <p className="mt-1 text-xs text-slate-500">{limite.ajuda}</p>
                                            <p className="mt-1 text-[11px] font-semibold text-slate-400">
                                                Mín. {LIMITES_MINIMOS_CARREGAMENTO_SISTEMA[limite.chave]} · Máx. {LIMITES_MAXIMOS_CARREGAMENTO_SISTEMA[limite.chave]} · {limite.detalhe}
                                            </p>
                                        </div>
                                        <input
                                            type="number"
                                            min={LIMITES_MINIMOS_CARREGAMENTO_SISTEMA[limite.chave]}
                                            max={LIMITES_MAXIMOS_CARREGAMENTO_SISTEMA[limite.chave]}
                                            value={limitesEditaveis[limite.chave] ?? limite.valor}
                                            onChange={(evento) => alterarLimite(limite.chave, evento.target.value)}
                                            className="w-24 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-center text-sm font-black text-slate-950 outline-none focus:ring-2 focus:ring-blue-100"
                                        />
                                    </div>
                                </label>
                            ))}

                            <div className="rounded-2xl bg-slate-50 px-3 py-3 ring-1 ring-slate-100">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-bold text-slate-800">Armazenamento</p>
                                        <p className="text-xs text-slate-500">limite visual do card Storage</p>
                                    </div>
                                    <span className="rounded-xl bg-white px-3 py-1.5 text-sm font-black text-slate-950 ring-1 ring-slate-200">
                                        {limites.storageMb || 1024} MB
                                    </span>
                                </div>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={salvarLimites}
                            disabled={!podeAlterarConfiguracoesCriticasSistema}
                            title={podeAlterarConfiguracoesCriticasSistema ? "Salvar limites de carregamento" : mensagemBloqueioConfiguracoesCriticasSistema}
                            className="mt-4 w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                        >
                            {podeAlterarConfiguracoesCriticasSistema ? "Salvar limites de carregamento" : "Limites bloqueados"}
                        </button>
                    </Card>
                )
            );


        case "config-relatorios-evidencias":
            return renderBlocoConfiguracaoComControle(
                "config-relatorios-evidencias",
                "Relatórios e evidências das Configurações",
                "Resumo administrativo copiável e arquivo TXT para conferência interna.",
                (
                    <Card>
                        <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <div className="flex items-center gap-2">
                                    <FileText className="h-5 w-5 text-slate-500" />
                                    <h2 id="config-relatorios-evidencias" className="scroll-mt-24 text-lg font-black text-slate-950">Relatórios e evidências das Configurações</h2>
                                </div>
                                <p className="mt-1 text-sm text-slate-500">
                                    Gere uma evidência simples do estado atual das permissões, limites, token público, checklists e ações críticas.
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={copiarRelatorioConfiguracoesSistema}
                                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-3 py-2 text-xs font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                                >
                                    <Copy className="h-3.5 w-3.5" />
                                    Copiar resumo
                                </button>
                                <button
                                    type="button"
                                    onClick={baixarRelatorioConfiguracoesSistema}
                                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-3 py-2 text-xs font-black text-white hover:bg-slate-800"
                                >
                                    <FileText className="h-3.5 w-3.5" />
                                    Baixar TXT
                                </button>
                            </div>
                        </div>

                        {mensagemEvidenciasConfiguracoes && (
                            <div className="mt-4 rounded-2xl bg-blue-50 px-4 py-3 text-xs font-bold text-blue-700 ring-1 ring-blue-200">
                                {mensagemEvidenciasConfiguracoes}
                            </div>
                        )}

                        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                            <div className="rounded-2xl bg-slate-50 px-3 py-3 ring-1 ring-slate-100">
                                <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Permissões</p>
                                <p className="mt-1 text-lg font-black text-slate-950">{resumoUsuariosPermissoesSistema.total}</p>
                                <p className="mt-1 text-xs font-semibold text-slate-500">
                                    {resumoUsuariosPermissoesSistema.ativos} ativos · {resumoUsuariosPermissoesSistema.bloqueados} bloqueados · {resumoUsuariosPermissoesSistema.administradores} administradores
                                </p>
                            </div>
                            <div className="rounded-2xl bg-slate-50 px-3 py-3 ring-1 ring-slate-100">
                                <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Solicitações</p>
                                <p className="mt-1 text-lg font-black text-slate-950">{resumoSolicitacoesAcessoSistema.total}</p>
                                <p className="mt-1 text-xs font-semibold text-slate-500">
                                    {resumoSolicitacoesAcessoSistema.pendentes} pendentes · {resumoSolicitacoesAcessoSistema.aprovadas} aprovadas · {resumoSolicitacoesAcessoSistema.concluidas} concluídas
                                </p>
                            </div>
                            <div className="rounded-2xl bg-slate-50 px-3 py-3 ring-1 ring-slate-100">
                                <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Auditoria</p>
                                <p className="mt-1 text-lg font-black text-slate-950">{totalEventosHabilitados}/{eventosAuditoria.length}</p>
                                <p className="mt-1 text-xs font-semibold text-slate-500">
                                    eventos habilitados · origem {origemConfig === "supabase" ? "Supabase" : "Local"}
                                </p>
                            </div>
                            <div className="rounded-2xl bg-slate-50 px-3 py-3 ring-1 ring-slate-100">
                                <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Segurança</p>
                                <p className="mt-1 text-lg font-black text-slate-950">{resumoRevisaoSupabase.texto}</p>
                                <p className="mt-1 text-xs font-semibold text-slate-500">
                                    Supabase · Storage {resumoSegurancaStorage.texto} · QR {resumoSegurancaAuditoriaPublica.texto}
                                </p>
                            </div>
                        </div>

                        <div className="mt-4 rounded-2xl bg-orange-50 px-4 py-3 text-xs font-semibold leading-relaxed text-orange-800 ring-1 ring-orange-200">
                            Esta etapa gera evidência simples em texto. O PDF das Configurações deve ficar para depois da tela estar totalmente estável, para evitar adicionar peso e complexidade agora.
                        </div>
                    </Card>
                )
            );

        case "config-senha-configuracoes":
            return renderBlocoConfiguracaoComControle(
                "config-senha-configuracoes",
                "Configurações críticas",
                "Senha, restauração padrão e ações sensíveis da área administrativa.",
                (
                <Card>
                    <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 md:flex-row md:items-start md:justify-between">
                        <div>
                            <div className="flex items-center gap-2">
                                <Lock className="h-5 w-5 text-slate-500" />
                                <h2 id="config-senha-configuracoes" className="scroll-mt-24 text-lg font-black text-slate-950">Configurações críticas</h2>
                            </div>
                            <p className="mt-1 text-sm text-slate-500">
                                Área separada para senha, restauração padrão e ações administrativas sensíveis. Use somente com permissão crítica liberada.
                            </p>
                            <p className="mt-2 text-xs font-semibold text-slate-500">
                                Status atual: <span className="font-black text-slate-900">{senhaConfiguracoesSistema === SENHA_CONFIGURACOES_PADRAO ? "Senha padrão 2026" : "Senha personalizada"}</span> · Origem: <span className="font-black text-slate-900">{origemSenhaConfiguracoesSistema === "supabase" ? "Supabase" : "Local"}</span>
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={restaurarSenhaConfiguracoesPadrao}
                            disabled={!podeAlterarConfiguracoesCriticasSistema}
                            title={podeAlterarConfiguracoesCriticasSistema ? "Restaurar senha padrão das Configurações" : mensagemBloqueioConfiguracoesCriticasSistema}
                            className="inline-flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-xs font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                        >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Restaurar senha padrão
                        </button>
                    </div>

                    <div className="mt-4 grid gap-3 lg:grid-cols-4">
                        {[
                            ["Alterar senha", podeAlterarConfiguracoesCriticasSistema],
                            ["Restaurar padrão", podeAlterarConfiguracoesCriticasSistema],
                            ["Gerenciar permissões", resumoAcoesCriticasSistemaAtual.podeGerenciarPermissoes],
                            ["Limpar Storage", resumoAcoesCriticasSistemaAtual.podeLimparArquivos],
                        ].map(([rotulo, permitido]) => (
                            <div
                                key={rotulo}
                                className={classNames(
                                    "rounded-2xl px-3 py-3 ring-1",
                                    permitido
                                        ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                                        : "bg-slate-50 text-slate-500 ring-slate-100"
                                )}
                            >
                                <p className="text-[10px] font-black uppercase tracking-wide">{rotulo}</p>
                                <p className="mt-1 text-xs font-black">{permitido ? "Liberado" : "Bloqueado"}</p>
                            </div>
                        ))}
                    </div>

                    <div className={classNames(
                        "mt-4 rounded-2xl px-4 py-3 text-sm font-semibold ring-1",
                        mensagemSenhaConfiguracoes.includes("atualizada") || mensagemSenhaConfiguracoes.includes("restaurada")
                            ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                            : mensagemSenhaConfiguracoes.includes("incorreta") || mensagemSenhaConfiguracoes.includes("não") || mensagemSenhaConfiguracoes.includes("não confere")
                                ? "bg-red-50 text-red-700 ring-red-200"
                                : "bg-blue-50 text-blue-700 ring-blue-200"
                    )}>
                        {mensagemSenhaConfiguracoes}
                    </div>

                    <form onSubmit={salvarSenhaConfiguracoes} className="form-grid mt-4">
                        <label className="space-y-1 text-sm font-semibold text-slate-600">
                            <span>Senha atual</span>
                            <input
                                type={mostrarCamposSenhaConfiguracoes ? "text" : "password"}
                                value={senhaConfiguracoesFormulario.atual}
                                onChange={(evento) => alterarCampoSenhaConfiguracoes("atual", evento.target.value)}
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                                autoComplete="off"
                            />
                        </label>
                        <label className="space-y-1 text-sm font-semibold text-slate-600">
                            <span>Nova senha</span>
                            <input
                                type={mostrarCamposSenhaConfiguracoes ? "text" : "password"}
                                value={senhaConfiguracoesFormulario.nova}
                                onChange={(evento) => alterarCampoSenhaConfiguracoes("nova", evento.target.value)}
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                                autoComplete="off"
                            />
                        </label>
                        <label className="space-y-1 text-sm font-semibold text-slate-600">
                            <span>Confirmar nova senha</span>
                            <input
                                type={mostrarCamposSenhaConfiguracoes ? "text" : "password"}
                                value={senhaConfiguracoesFormulario.confirmar}
                                onChange={(evento) => alterarCampoSenhaConfiguracoes("confirmar", evento.target.value)}
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                                autoComplete="off"
                            />
                        </label>
                        <div className="flex flex-wrap gap-2 lg:col-span-3">
                            <button
                                type="button"
                                onClick={() => setMostrarCamposSenhaConfiguracoes((atual) => !atual)}
                                className="rounded-2xl bg-white px-4 py-2 text-xs font-black text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                            >
                                {mostrarCamposSenhaConfiguracoes ? "Ocultar senhas" : "Mostrar senhas"}
                            </button>
                            <button
                                type="submit"
                                disabled={!podeAlterarConfiguracoesCriticasSistema}
                                title={podeAlterarConfiguracoesCriticasSistema ? "Salvar senha das Configurações" : mensagemBloqueioConfiguracoesCriticasSistema}
                                className="rounded-2xl bg-slate-950 px-4 py-2 text-xs font-black text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                            >
                                {podeAlterarConfiguracoesCriticasSistema ? "Salvar senha das Configurações" : "Senha bloqueada"}
                            </button>
                        </div>
                    </form>

                    <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-xs font-semibold leading-5 text-amber-700 ring-1 ring-amber-100">
                        Esta senha é apenas uma barreira operacional da aba. As ações críticas continuam dependentes da permissão carregada do Supabase, das RPCs administrativas e das policies/RLS.
                    </p>
                </Card>
                )
            );

        case "config-usuarios-permissoes":
            return renderBlocoConfiguracaoComControle(
                "config-usuarios-permissoes",
                "Permissões e usuários",
                "Perfis, solicitações de acesso e permissões por módulo.",
                (
                    <Card>
                        <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 md:flex-row md:items-start md:justify-between">
                            <div>
                                <div className="flex items-center gap-2">
                                    <ShieldCheck className="h-5 w-5 text-slate-500" />
                                    <h2 id="config-usuarios-permissoes" className="scroll-mt-24 text-lg font-black text-slate-950">Permissões e usuários</h2>
                                </div>
                                <p className="mt-1 text-sm text-slate-500">
                                    Painel administrativo para consultar o usuário atual, analisar solicitações de acesso e manter perfis por módulo.
                                </p>
                                <p className="mt-2 text-xs font-semibold text-slate-500">
                                    Usuário atual: <span className="font-black text-slate-900">{usuario?.email || "não informado"}</span> · Perfil atual: <span className="font-black text-slate-900">{formatarPerfilPermissaoSistema(permissaoSistemaAtual?.perfil || usuario?.perfil)}</span>
                                </p>
                            </div>
                            <span className="inline-flex items-center justify-center rounded-2xl bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 ring-1 ring-blue-200">
                                Controle por permissão
                            </span>
                        </div>

                        <div className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-xs font-semibold leading-relaxed text-amber-700 ring-1 ring-amber-200">
                            A rota de Configurações, a gestão de permissões e as ações críticas usam a permissão atual carregada do Supabase. Perfis sensíveis não são sugeridos automaticamente em solicitações de acesso.
                        </div>

                        <div className="mt-4 rounded-3xl bg-blue-50 p-4 ring-1 ring-blue-100">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                <div>
                                    <p className="text-xs font-black uppercase tracking-wide text-blue-700">Permissão carregada do Supabase</p>
                                    <p className="mt-1 text-sm font-black text-slate-950">
                                        {permissaoSistemaAtual?.email || usuario?.email || "usuário não informado"}
                                    </p>
                                    <p className="mt-1 text-xs font-semibold leading-relaxed text-blue-800">
                                        {mensagemPermissaoSistema}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={carregarPermissaoSistemaAtual}
                                    disabled={carregandoPermissaoSistema}
                                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-3 py-2 text-xs font-black text-blue-700 ring-1 ring-blue-200 hover:bg-blue-50 disabled:opacity-60"
                                >
                                    <RefreshCw className={classNames("h-3.5 w-3.5", carregandoPermissaoSistema && "animate-spin")} />
                                    {carregandoPermissaoSistema ? "Carregando" : "Atualizar permissão"}
                                </button>
                            </div>

                            <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                                <div className="rounded-2xl bg-white px-3 py-3 ring-1 ring-blue-100">
                                    <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Perfil Supabase</p>
                                    <p className="mt-1 text-sm font-black text-slate-950">{formatarPerfilPermissaoSistema(resumoPermissaoSistemaAtual.perfil)}</p>
                                </div>
                                <div className="rounded-2xl bg-white px-3 py-3 ring-1 ring-blue-100">
                                    <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Status</p>
                                    <p className="mt-1 text-sm font-black text-slate-950">{resumoPermissaoSistemaAtual.status}</p>
                                </div>
                                <div className="rounded-2xl bg-white px-3 py-3 ring-1 ring-blue-100">
                                    <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Acesso global</p>
                                    <p className={classNames("mt-1 text-sm font-black", resumoPermissaoSistemaAtual.acessoGlobal ? "text-emerald-700" : "text-slate-700")}>
                                        {resumoPermissaoSistemaAtual.acessoGlobal ? "Sim" : "Não"}
                                    </p>
                                </div>
                                <div className="rounded-2xl bg-white px-3 py-3 ring-1 ring-blue-100">
                                    <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Módulos lidos</p>
                                    <p className="mt-1 text-sm font-black text-slate-950">{modulosPermissaoSistemaAtual.length}</p>
                                </div>
                                <div className="rounded-2xl bg-white px-3 py-3 ring-1 ring-blue-100">
                                    <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Ações críticas</p>
                                    <p className="mt-1 text-sm font-black text-slate-950">{acoesCriticasPermissaoSistemaAtual.length}</p>
                                </div>
                            </div>

                            {permissaoSistemaAtual ? (
                                <div className="mt-3 grid gap-2 lg:grid-cols-2">
                                    <div className="rounded-2xl bg-white px-3 py-3 ring-1 ring-blue-100">
                                        <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Módulos retornados pela RPC</p>
                                        <div className="mt-2 flex flex-wrap gap-1.5">
                                            {modulosPermissaoSistemaAtual.length > 0 ? modulosPermissaoSistemaAtual.map((modulo) => (
                                                <span key={modulo} className="rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-700 ring-1 ring-slate-200">
                                                    {modulo}
                                                </span>
                                            )) : (
                                                <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-400 ring-1 ring-slate-200">
                                                    Nenhum módulo retornado
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="rounded-2xl bg-white px-3 py-3 ring-1 ring-blue-100">
                                        <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Ações críticas liberadas na leitura</p>
                                        <div className="mt-2 flex flex-wrap gap-1.5">
                                            {acoesCriticasPermissaoSistemaAtual.length > 0 ? acoesCriticasPermissaoSistemaAtual.map((acao) => (
                                                <span key={acao} className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-100">
                                                    {acao}
                                                </span>
                                            )) : (
                                                <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-400 ring-1 ring-slate-200">
                                                    Nenhuma ação crítica retornada
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : null}
                        </div>

                        <div className="mt-4 rounded-3xl bg-white p-4 ring-1 ring-slate-100">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                <div>
                                    <p className="text-xs font-black uppercase tracking-wide text-slate-400">Bloqueio visual das ações críticas</p>
                                    <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">
                                        Validação visual da permissão carregada. Os botões sensíveis ficam bloqueados sem autorização e as RPCs/RLS devem continuar protegendo a operação no Supabase.
                                    </p>
                                </div>
                                <span className={classNames(
                                    "rounded-full px-3 py-1.5 text-[11px] font-black ring-1",
                                    podeGerenciarPermissoesSistema
                                        ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                                        : "bg-rose-50 text-rose-700 ring-rose-100"
                                )}>
                                    {podeGerenciarPermissoesSistema ? "Gerenciar permissões liberado" : "Gerenciar permissões bloqueado"}
                                </span>
                            </div>
                            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                                {[
                                    ["Excluir", resumoAcoesCriticasSistemaAtual.podeExcluir],
                                    ["Limpar arquivos", resumoAcoesCriticasSistemaAtual.podeLimparArquivos],
                                    ["Gerenciar permissões", resumoAcoesCriticasSistemaAtual.podeGerenciarPermissoes],
                                    ["Configurações críticas", resumoAcoesCriticasSistemaAtual.podeAlterarConfiguracoesCriticas],
                                ].map(([rotulo, permitido]) => (
                                    <div key={rotulo} className={classNames(
                                        "rounded-2xl px-3 py-3 ring-1",
                                        permitido
                                            ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                                            : "bg-slate-50 text-slate-500 ring-slate-100"
                                    )}>
                                        <p className="text-[10px] font-black uppercase tracking-wide">{rotulo}</p>
                                        <p className="mt-1 text-xs font-black">{permitido ? "Liberado" : "Bloqueado"}</p>
                                    </div>
                                ))}
                            </div>
                            {!podeGerenciarPermissoesSistema ? (
                                <div className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-xs font-semibold leading-relaxed text-amber-800 ring-1 ring-amber-100">
                                    {bloqueioGerenciarPermissoesSistema.mensagem} A lista continua visível para conferência, mas cadastro e edição ficam bloqueados.
                                </div>
                            ) : null}
                        </div>

                        <div className="mt-4 rounded-3xl bg-white p-4 ring-1 ring-slate-100">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                <div>
                                    <p className="text-xs font-black uppercase tracking-wide text-slate-400">Lista administrativa de usuários</p>
                                    <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">
                                        Usuários cadastrados em usuarios_permissoes_sistema. A leitura administrativa mostra a base central que protege rotas, ações críticas e botões sensíveis.
                                    </p>
                                    <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">
                                        {mensagemUsuariosPermissoesSistema}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={carregarUsuariosPermissoesSistema}
                                    disabled={carregandoUsuariosPermissoesSistema || !podeGerenciarPermissoesSistema}
                                    title={podeGerenciarPermissoesSistema ? "Atualizar lista administrativa" : bloqueioGerenciarPermissoesSistema.mensagem}
                                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-3 py-2 text-xs font-black text-white ring-1 ring-slate-950 hover:bg-slate-800 disabled:opacity-60"
                                >
                                    <RefreshCw className={classNames("h-3.5 w-3.5", carregandoUsuariosPermissoesSistema && "animate-spin")} />
                                    {carregandoUsuariosPermissoesSistema
                                        ? "Carregando"
                                        : podeGerenciarPermissoesSistema
                                          ? "Atualizar lista"
                                          : "Lista bloqueada"}
                                </button>
                            </div>

                            <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                                <div className="rounded-2xl bg-slate-50 px-3 py-3 ring-1 ring-slate-100">
                                    <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Total</p>
                                    <p className="mt-1 text-sm font-black text-slate-950">{resumoUsuariosPermissoesSistema.total}</p>
                                </div>
                                <div className="rounded-2xl bg-emerald-50 px-3 py-3 ring-1 ring-emerald-100">
                                    <p className="text-[10px] font-black uppercase tracking-wide text-emerald-700">Ativos</p>
                                    <p className="mt-1 text-sm font-black text-emerald-800">{resumoUsuariosPermissoesSistema.ativos}</p>
                                </div>
                                <div className="rounded-2xl bg-blue-50 px-3 py-3 ring-1 ring-blue-100">
                                    <p className="text-[10px] font-black uppercase tracking-wide text-blue-700">Administradores</p>
                                    <p className="mt-1 text-sm font-black text-blue-800">{resumoUsuariosPermissoesSistema.administradores}</p>
                                </div>
                                <div className="rounded-2xl bg-rose-50 px-3 py-3 ring-1 ring-rose-100">
                                    <p className="text-[10px] font-black uppercase tracking-wide text-rose-700">Bloqueados</p>
                                    <p className="mt-1 text-sm font-black text-rose-800">{resumoUsuariosPermissoesSistema.bloqueados}</p>
                                </div>
                            </div>

                            <div className="mt-4 rounded-3xl bg-white p-4 ring-1 ring-slate-100">
                                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-wide text-slate-400">Solicitações de acesso</p>
                                        <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">
                                            Pedidos registrados pelo botão Solicitar acesso nas telas bloqueadas.
                                        </p>
                                        <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">
                                            {mensagemSolicitacoesAcessoSistema}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={carregarSolicitacoesAcessoSistema}
                                        disabled={carregandoSolicitacoesAcessoSistema || !podeGerenciarPermissoesSistema}
                                        title={podeGerenciarPermissoesSistema ? "Atualizar solicitações" : bloqueioGerenciarPermissoesSistema.mensagem}
                                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-3 py-2 text-xs font-black text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        <RefreshCw className={classNames("h-3.5 w-3.5", carregandoSolicitacoesAcessoSistema && "animate-spin")} />
                                        {carregandoSolicitacoesAcessoSistema ? "Carregando" : "Atualizar solicitações"}
                                    </button>
                                </div>

                                <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                                    <div className="rounded-2xl bg-slate-50 px-3 py-3 ring-1 ring-slate-100">
                                        <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Total</p>
                                        <p className="mt-1 text-sm font-black text-slate-950">{resumoSolicitacoesAcessoSistema.total}</p>
                                    </div>
                                    <div className="rounded-2xl bg-amber-50 px-3 py-3 ring-1 ring-amber-100">
                                        <p className="text-[10px] font-black uppercase tracking-wide text-amber-700">Pendentes</p>
                                        <p className="mt-1 text-sm font-black text-amber-800">{resumoSolicitacoesAcessoSistema.pendentes}</p>
                                    </div>
                                    <div className="rounded-2xl bg-emerald-50 px-3 py-3 ring-1 ring-emerald-100">
                                        <p className="text-[10px] font-black uppercase tracking-wide text-emerald-700">Aprovadas</p>
                                        <p className="mt-1 text-sm font-black text-emerald-800">{resumoSolicitacoesAcessoSistema.aprovadas}</p>
                                    </div>
                                    <div className="rounded-2xl bg-blue-50 px-3 py-3 ring-1 ring-blue-100">
                                        <p className="text-[10px] font-black uppercase tracking-wide text-blue-700">Concluídas</p>
                                        <p className="mt-1 text-sm font-black text-blue-800">{resumoSolicitacoesAcessoSistema.concluidas}</p>
                                    </div>
                                    <div className="rounded-2xl bg-rose-50 px-3 py-3 ring-1 ring-rose-100">
                                        <p className="text-[10px] font-black uppercase tracking-wide text-rose-700">Recusadas</p>
                                        <p className="mt-1 text-sm font-black text-rose-800">{resumoSolicitacoesAcessoSistema.recusadas}</p>
                                    </div>
                                </div>

                                <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
                                    <label className="block text-xs font-black uppercase tracking-wide text-slate-400">
                                        Observação do administrador
                                    </label>
                                    <textarea
                                        value={respostaAdminSolicitacaoAcessoSistema}
                                        onChange={(evento) => setRespostaAdminSolicitacaoAcessoSistema(evento.target.value)}
                                        disabled={!podeGerenciarPermissoesSistema || Boolean(processandoRespostaSolicitacaoAcessoSistema)}
                                        rows={2}
                                        placeholder="Exemplo: aprovado para teste operacional, recusado por falta de vínculo, aguardar validação..."
                                        className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                                    />
                                    <p className="mt-2 text-xs font-semibold leading-relaxed text-slate-500">
                                        {mensagemRespostaSolicitacaoAcessoSistema}
                                    </p>
                                </div>

                                <div className="mt-4 space-y-2">
                                    {solicitacoesAcessoSistema.length > 0 ? solicitacoesAcessoSistema.slice(0, 6).map((item) => (
                                        <div key={item.id || `${item.email}-${item.criado_em}`} className="rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
                                            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-black text-slate-950">{item.nome || "Usuário sem nome"}</p>
                                                    <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">{item.email || "email não informado"}</p>
                                                    <p className="mt-1 text-[11px] font-semibold text-slate-400">
                                                        {formatarDataHoraConfiguracoes(item.criado_em)}
                                                    </p>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    <span className="rounded-full bg-white px-3 py-1.5 text-[11px] font-black text-slate-700 ring-1 ring-slate-200">
                                                        Área: {item.area_solicitada || item.tela || "não informada"}
                                                    </span>
                                                    <span className="rounded-full bg-white px-3 py-1.5 text-[11px] font-black text-slate-700 ring-1 ring-slate-200">
                                                        Perfil: {item.perfil_atual || "não informado"}
                                                    </span>
                                                    <span className={classNames(
                                                        "rounded-full px-3 py-1.5 text-[11px] font-black ring-1",
                                                        obterClasseStatusSolicitacaoAcesso(item.status)
                                                    )}>
                                                        {formatarStatusSolicitacaoAcesso(item.status)}
                                                    </span>
                                                    {item.status === "aprovada" && podeGerenciarPermissoesSistema ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => prepararUsuarioPermissaoPorSolicitacaoAcesso(item)}
                                                            className="rounded-full bg-blue-50 px-3 py-1.5 text-[11px] font-black text-blue-700 ring-1 ring-blue-100 hover:bg-blue-100"
                                                        >
                                                            Preparar permissão
                                                        </button>
                                                    ) : null}
                                                    {item.status === "pendente" && podeGerenciarPermissoesSistema ? (
                                                        <div className="flex w-full flex-wrap gap-2 lg:w-auto">
                                                            <button
                                                                type="button"
                                                                onClick={() => responderSolicitacaoAcessoSistema(item, "aprovada")}
                                                                disabled={processandoRespostaSolicitacaoAcessoSistema === item.id}
                                                                className="rounded-full bg-emerald-600 px-3 py-1.5 text-[11px] font-black text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                                                            >
                                                                {processandoRespostaSolicitacaoAcessoSistema === item.id ? "Processando" : "Aprovar"}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => responderSolicitacaoAcessoSistema(item, "recusada")}
                                                                disabled={processandoRespostaSolicitacaoAcessoSistema === item.id}
                                                                className="rounded-full bg-rose-50 px-3 py-1.5 text-[11px] font-black text-rose-700 ring-1 ring-rose-100 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                                                            >
                                                                Recusar
                                                            </button>
                                                        </div>
                                                    ) : null}
                                                </div>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="rounded-2xl bg-slate-50 px-4 py-4 text-xs font-semibold text-slate-500 ring-1 ring-slate-100">
                                            Nenhuma solicitação carregada. Clique em Atualizar solicitações para consultar a RPC administrativa.
                                        </div>
                                    )}
                                </div>

                                {solicitacoesAcessoPendentesSistema.length > 0 ? (
                                    <div className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-xs font-semibold leading-relaxed text-amber-800 ring-1 ring-amber-100">
                                        Existem {solicitacoesAcessoPendentesSistema.length} solicitação(ões) pendente(s). Ao aprovar, o formulário de usuário/permissão será preenchido para conferência antes de salvar no Supabase.
                                    </div>
                                ) : null}
                            </div>

                            <div id="formulario-usuario-permissao-sistema" className="mt-4 rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-100">
                                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                                            {modoEdicaoUsuarioPermissaoSistema ? "Editar usuário / permissão" : "Novo usuário / permissão"}
                                        </p>
                                        <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">
                                            {modoEdicaoUsuarioPermissaoSistema
                                                ? "Edição administrativa de usuário já cadastrado. As alterações atualizam o Supabase e passam a valer no próximo carregamento da permissão."
                                                : "Cadastro administrativo de usuários no painel. Solicitações aprovadas podem preencher este formulário para conferência antes de salvar."}
                                        </p>
                                        <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">
                                            {mensagemFormularioNovoUsuarioPermissao}
                                        </p>
                                        {solicitacaoAcessoPreparadaSistema?.id ? (
                                            <p className="mt-2 rounded-2xl bg-blue-50 px-3 py-2 text-xs font-bold leading-relaxed text-blue-700 ring-1 ring-blue-100">
                                                Esta permissão será vinculada à solicitação aprovada de {solicitacaoAcessoPreparadaSistema.email}. Ao salvar, a solicitação será marcada como concluída.
                                            </p>
                                        ) : null}
                                        {formularioUsuarioPermissaoEhUsuarioAtual ? (
                                            <p className="mt-2 rounded-2xl bg-amber-50 px-3 py-2 text-xs font-bold leading-relaxed text-amber-800 ring-1 ring-amber-100">
                                                Você está editando o próprio usuário. O sistema impede salvar alterações que removam seu acesso administrativo às Configurações.
                                            </p>
                                        ) : null}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (!podeGerenciarPermissoesSistema) {
                                                setMensagemFormularioNovoUsuarioPermissao(bloqueioGerenciarPermissoesSistema.mensagem);
                                                return;
                                            }
                                            setMostrarFormularioNovoUsuarioPermissao((atual) => !atual);
                                        }}
                                        disabled={!podeGerenciarPermissoesSistema}
                                        className={classNames(
                                            "inline-flex items-center justify-center gap-2 rounded-2xl px-3 py-2 text-xs font-black ring-1",
                                            podeGerenciarPermissoesSistema
                                                ? "bg-white text-slate-700 ring-slate-200 hover:bg-slate-100"
                                                : "cursor-not-allowed bg-slate-100 text-slate-400 ring-slate-200"
                                        )}
                                    >
                                        {mostrarFormularioNovoUsuarioPermissao ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                        {mostrarFormularioNovoUsuarioPermissao
                                            ? "Ocultar formulário"
                                            : modoEdicaoUsuarioPermissaoSistema
                                              ? "Editar usuário"
                                              : "Adicionar usuário"}
                                    </button>
                                </div>

                                {!podeGerenciarPermissoesSistema ? (
                                    <div className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-xs font-semibold leading-relaxed text-amber-800 ring-1 ring-amber-100">
                                        {bloqueioGerenciarPermissoesSistema.mensagem} O formulário de cadastro e edição permanece travado para este perfil.
                                    </div>
                                ) : null}

                                {mostrarFormularioNovoUsuarioPermissao && podeGerenciarPermissoesSistema && (
                                    <form onSubmit={salvarNovoUsuarioPermissaoSistema} className="mt-4 space-y-4">
                                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                                            <label className="space-y-1 text-xs font-black uppercase tracking-wide text-slate-400">
                                                <span>Nome</span>
                                                <input
                                                    value={novoUsuarioPermissaoSistema.nome}
                                                    onChange={(evento) => alterarCampoNovoUsuarioPermissao("nome", evento.target.value)}
                                                    placeholder="Nome do usuário"
                                                    className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold normal-case tracking-normal text-slate-800 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                                                />
                                            </label>
                                            <label className="space-y-1 text-xs font-black uppercase tracking-wide text-slate-400">
                                                <span>E-mail</span>
                                                <input
                                                    type="email"
                                                    value={novoUsuarioPermissaoSistema.email}
                                                    onChange={(evento) => alterarCampoNovoUsuarioPermissao("email", evento.target.value)}
                                                    disabled={modoEdicaoUsuarioPermissaoSistema}
                                                    placeholder="usuario@empresa.com"
                                                    className={classNames(
                                                        "w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm font-semibold normal-case tracking-normal outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100",
                                                        modoEdicaoUsuarioPermissaoSistema
                                                            ? "cursor-not-allowed bg-slate-100 text-slate-500"
                                                            : "bg-white text-slate-800"
                                                    )}
                                                />
                                                {modoEdicaoUsuarioPermissaoSistema ? (
                                                    <span className="block text-[10px] font-semibold normal-case tracking-normal text-slate-400">
                                                        E-mail travado na edição para evitar cadastro duplicado.
                                                    </span>
                                                ) : null}
                                            </label>
                                            <label className="space-y-1 text-xs font-black uppercase tracking-wide text-slate-400">
                                                <span>Função</span>
                                                <input
                                                    value={novoUsuarioPermissaoSistema.funcao}
                                                    onChange={(evento) => alterarCampoNovoUsuarioPermissao("funcao", evento.target.value)}
                                                    placeholder="Técnico, gestor, auditor..."
                                                    className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold normal-case tracking-normal text-slate-800 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                                                />
                                            </label>
                                            <label className="space-y-1 text-xs font-black uppercase tracking-wide text-slate-400">
                                                <span>Perfil</span>
                                                <select
                                                    value={novoUsuarioPermissaoSistema.perfil}
                                                    onChange={(evento) => alterarCampoNovoUsuarioPermissao("perfil", evento.target.value)}
                                                    className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold normal-case tracking-normal text-slate-800 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                                                >
                                                    {PERFIS_USUARIOS_PERMISSOES_PLANEJADOS.map((perfil) => (
                                                        <option key={perfil.chave} value={perfil.chave}>{perfil.perfil}</option>
                                                    ))}
                                                </select>
                                            </label>
                                        </div>

                                        <div className="grid gap-3 md:grid-cols-3">
                                            <label className="flex items-start gap-3 rounded-2xl bg-white px-3 py-3 ring-1 ring-slate-100">
                                                <input
                                                    type="checkbox"
                                                    checked={novoUsuarioPermissaoSistema.ativo}
                                                    onChange={(evento) => alterarCampoNovoUsuarioPermissao("ativo", evento.target.checked)}
                                                    className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                />
                                                <span>
                                                    <span className="block text-sm font-black text-slate-900">Usuário ativo</span>
                                                    <span className="mt-0.5 block text-xs font-semibold leading-relaxed text-slate-500">Quando ativo e sem bloqueio, o usuário pode operar conforme o perfil e as permissões carregadas.</span>
                                                </span>
                                            </label>
                                            <label className="flex items-start gap-3 rounded-2xl bg-white px-3 py-3 ring-1 ring-slate-100">
                                                <input
                                                    type="checkbox"
                                                    checked={novoUsuarioPermissaoSistema.bloqueado}
                                                    onChange={(evento) => alterarCampoNovoUsuarioPermissao("bloqueado", evento.target.checked)}
                                                    className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                />
                                                <span>
                                                    <span className="block text-sm font-black text-slate-900">Bloqueado</span>
                                                    <span className="mt-0.5 block text-xs font-semibold leading-relaxed text-slate-500">Quando marcado, impede operação e mantém o cadastro para rastreabilidade.</span>
                                                </span>
                                            </label>
                                            <label className="flex items-start gap-3 rounded-2xl bg-white px-3 py-3 ring-1 ring-slate-100">
                                                <input
                                                    type="checkbox"
                                                    checked={novoUsuarioPermissaoSistema.acesso_global}
                                                    onChange={(evento) => alterarCampoNovoUsuarioPermissao("acesso_global", evento.target.checked)}
                                                    disabled={novoUsuarioPermissaoSistema.perfil !== "administrador"}
                                                    className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                                                />
                                                <span>
                                                    <span className="block text-sm font-black text-slate-900">Acesso global</span>
                                                    <span className="mt-0.5 block text-xs font-semibold leading-relaxed text-slate-500">Use somente para administradores responsáveis por Configurações, Storage e ações críticas.</span>
                                                </span>
                                            </label>
                                        </div>

                                        <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-xs font-semibold leading-relaxed text-emerald-700 ring-1 ring-emerald-100">
                                            {modoEdicaoUsuarioPermissaoSistema
                                                ? "Edição real habilitada: ao salvar, o cadastro existente será atualizado em usuarios_permissoes_sistema. As regras carregadas protegem rotas, ações críticas e botões sensíveis do sistema."
                                                : "Cadastro real habilitado: ao salvar, o usuário será criado ou atualizado em usuarios_permissoes_sistema. As regras carregadas protegem rotas, ações críticas e botões sensíveis do sistema."}
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                type="submit"
                                                disabled={salvandoNovoUsuarioPermissaoSistema || !podeGerenciarPermissoesSistema}
                                                className={classNames(
                                                    "rounded-2xl px-4 py-2 text-xs font-black text-white shadow-sm",
                                                    salvandoNovoUsuarioPermissaoSistema || !podeGerenciarPermissoesSistema
                                                        ? "cursor-not-allowed bg-slate-400"
                                                        : "bg-slate-950 hover:bg-slate-800"
                                                )}
                                            >
                                                {salvandoNovoUsuarioPermissaoSistema
                                                    ? "Salvando..."
                                                    : modoEdicaoUsuarioPermissaoSistema
                                                      ? "Salvar alterações"
                                                      : "Salvar no Supabase"}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={limparFormularioNovoUsuarioPermissao}
                                                disabled={salvandoNovoUsuarioPermissaoSistema}
                                                className="rounded-2xl bg-white px-4 py-2 text-xs font-black text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                {modoEdicaoUsuarioPermissaoSistema ? "Cancelar edição" : "Limpar formulário"}
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>

                            <div className="mt-4 space-y-2">
                                {usuariosPermissoesSistema.length > 0 ? usuariosPermissoesSistema.map((item) => (
                                    <div key={item.id || item.email} className="rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
                                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-black text-slate-950">{item.nome || "Usuário sem nome"}</p>
                                                <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">{item.email || "email não informado"}</p>
                                                <p className="mt-1 text-[11px] font-semibold text-slate-400">
                                                    {item.funcao || "função não informada"}
                                                </p>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <span className={classNames(
                                                    "rounded-full px-3 py-1.5 text-[11px] font-black ring-1",
                                                    obterClassePerfilPermissaoSistema(item.perfil)
                                                )}>
                                                    Perfil: {formatarPerfilPermissaoSistema(item.perfil)}
                                                </span>
                                                <span className={classNames(
                                                    "rounded-full px-3 py-1.5 text-[11px] font-black ring-1",
                                                    obterClasseStatusUsuarioPermissaoSistema(item)
                                                )}>
                                                    {formatarStatusUsuarioPermissaoSistema(item)}
                                                </span>
                                                <span className={classNames(
                                                    "rounded-full px-3 py-1.5 text-[11px] font-black ring-1",
                                                    item.bloqueado
                                                        ? "bg-rose-50 text-rose-700 ring-rose-100"
                                                        : "bg-slate-100 text-slate-500 ring-slate-200"
                                                )}>
                                                    Bloqueado: {item.bloqueado ? "Sim" : "Não"}
                                                </span>
                                                <span className={classNames(
                                                    "rounded-full px-3 py-1.5 text-[11px] font-black ring-1",
                                                    item.acesso_global
                                                        ? "bg-blue-50 text-blue-700 ring-blue-100"
                                                        : "bg-slate-100 text-slate-500 ring-slate-200"
                                                )}>
                                                    Acesso global: {item.acesso_global ? "Sim" : "Não"}
                                                </span>
                                                {emailEhUsuarioAtualPermissaoSistema(item.email, usuario, permissaoSistemaAtual) ? (
                                                    <span className="rounded-full bg-amber-50 px-3 py-1.5 text-[11px] font-black text-amber-800 ring-1 ring-amber-100">
                                                        Usuário atual
                                                    </span>
                                                ) : null}
                                                <button
                                                    type="button"
                                                    onClick={() => selecionarUsuarioPermissaoParaEdicao(item)}
                                                    disabled={salvandoNovoUsuarioPermissaoSistema || !podeGerenciarPermissoesSistema}
                                                    title={podeGerenciarPermissoesSistema ? "Editar permissão" : bloqueioGerenciarPermissoesSistema.mensagem}
                                                    className={classNames(
                                                        "rounded-full px-3 py-1.5 text-[11px] font-black ring-1 disabled:cursor-not-allowed",
                                                        podeGerenciarPermissoesSistema
                                                            ? "bg-slate-950 text-white ring-slate-950 hover:bg-slate-800 disabled:opacity-60"
                                                            : "bg-slate-100 text-slate-400 ring-slate-200"
                                                    )}
                                                >
                                                    Editar
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="rounded-2xl bg-slate-50 px-4 py-4 text-xs font-semibold text-slate-500 ring-1 ring-slate-100">
                                        Nenhum usuário carregado na lista administrativa. Clique em Atualizar lista para consultar a RPC administrativa.
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mt-4 grid gap-3 xl:grid-cols-[1.1fr_1fr]">
                            <div className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-100">
                                <p className="text-xs font-black uppercase tracking-wide text-slate-400">Perfis planejados</p>
                                <div className="mt-3 space-y-2">
                                    {PERFIS_USUARIOS_PERMISSOES_PLANEJADOS.map((item) => (
                                        <div key={item.perfil} className="rounded-2xl bg-white px-3 py-3 ring-1 ring-slate-100">
                                            <div className="flex items-start gap-2">
                                                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                                                <div>
                                                    <p className="text-sm font-black text-slate-900">{item.perfil}</p>
                                                    <p className="mt-1 text-xs leading-relaxed text-slate-500">{item.descricao}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-100">
                                    <p className="text-xs font-black uppercase tracking-wide text-slate-400">Módulos do sistema</p>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {MODULOS_USUARIOS_PERMISSOES_PLANEJADOS.map((modulo) => (
                                            <span key={modulo} className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-700 ring-1 ring-slate-200">
                                                {modulo}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-100">
                                    <p className="text-xs font-black uppercase tracking-wide text-slate-400">Ações futuras</p>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {ACOES_USUARIOS_PERMISSOES_PLANEJADAS.map((acao) => (
                                            <span key={acao} className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-700 ring-1 ring-slate-200">
                                                {acao}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-100">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                    <p className="text-xs font-black uppercase tracking-wide text-slate-400">Permissões padrão por perfil</p>
                                    <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">
                                        Matriz técnica compacta para orientar os bloqueios futuros. Ainda não aplica restrição real no sistema.
                                    </p>
                                </div>
                                <span className="rounded-full bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-wide text-slate-500 ring-1 ring-slate-200">
                                    {PERMISSOES_PADRAO_USUARIOS_POR_PERFIL.length} perfis · {ACOES_USUARIOS_PERMISSOES_PLANEJADAS.length} ações
                                </span>
                            </div>

                            <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                                {PERMISSOES_PADRAO_USUARIOS_POR_PERFIL.map((perfil) => {
                                    const ativo = perfilPermissoesAberto === perfil.chave;

                                    return (
                                        <button
                                            key={perfil.chave}
                                            type="button"
                                            onClick={() => setPerfilPermissoesAberto((atual) => atual === perfil.chave ? "" : perfil.chave)}
                                            className={classNames(
                                                "rounded-2xl bg-white p-3 text-left ring-1 transition hover:-translate-y-0.5 hover:shadow-sm",
                                                ativo ? "ring-blue-300 shadow-sm" : "ring-slate-100 hover:ring-slate-200"
                                            )}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <p className="text-sm font-black text-slate-950">{perfil.perfil}</p>
                                                    <p className="mt-0.5 text-[10px] font-black uppercase tracking-wide text-blue-700">{perfil.nivel}</p>
                                                </div>
                                                <span className={classNames(
                                                    "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-1",
                                                    ativo ? "bg-blue-50 text-blue-700 ring-blue-200" : "bg-slate-50 text-slate-500 ring-slate-200"
                                                )}>
                                                    {ativo ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                                </span>
                                            </div>

                                            <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
                                                <div className="rounded-xl bg-emerald-50 px-2 py-2 ring-1 ring-emerald-100">
                                                    <p className="text-sm font-black text-emerald-700">{perfil.acoesLiberadas.length}</p>
                                                    <p className="text-[9px] font-black uppercase tracking-wide text-emerald-700">liberadas</p>
                                                </div>
                                                <div className="rounded-xl bg-red-50 px-2 py-2 ring-1 ring-red-100">
                                                    <p className="text-sm font-black text-red-700">{perfil.acoesRestritas.length}</p>
                                                    <p className="text-[9px] font-black uppercase tracking-wide text-red-700">restritas</p>
                                                </div>
                                                <div className="rounded-xl bg-slate-50 px-2 py-2 ring-1 ring-slate-100">
                                                    <p className="text-sm font-black text-slate-700">{perfil.modulosLiberados.length}</p>
                                                    <p className="text-[9px] font-black uppercase tracking-wide text-slate-500">módulos</p>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            {perfilPermissoesSelecionado ? (
                                <div className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-blue-100">
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                        <div>
                                            <p className="text-base font-black text-slate-950">{perfilPermissoesSelecionado.perfil}</p>
                                            <p className="mt-0.5 text-[11px] font-black uppercase tracking-wide text-blue-700">{perfilPermissoesSelecionado.nivel}</p>
                                            <p className="mt-2 text-xs font-semibold leading-relaxed text-slate-500">{perfilPermissoesSelecionado.resumo}</p>
                                        </div>
                                        <span className="inline-flex items-center justify-center rounded-full bg-blue-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-blue-700 ring-1 ring-blue-100">
                                            Detalhes abertos
                                        </span>
                                    </div>

                                    <div className="mt-4 grid gap-3 lg:grid-cols-3">
                                        <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100 lg:col-span-3">
                                            <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Módulos liberados</p>
                                            <div className="mt-2 flex flex-wrap gap-1.5">
                                                {perfilPermissoesSelecionado.modulosLiberados.length > 0 ? perfilPermissoesSelecionado.modulosLiberados.map((modulo) => (
                                                    <span key={modulo} className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-slate-700 ring-1 ring-slate-200">
                                                        {modulo}
                                                    </span>
                                                )) : (
                                                    <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-slate-400 ring-1 ring-slate-200">
                                                        Nenhum módulo operacional planejado
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="rounded-2xl bg-emerald-50 p-3 ring-1 ring-emerald-100">
                                            <p className="text-[10px] font-black uppercase tracking-wide text-emerald-700">Ações liberadas</p>
                                            <div className="mt-2 flex flex-wrap gap-1.5">
                                                {perfilPermissoesSelecionado.acoesLiberadas.length > 0 ? perfilPermissoesSelecionado.acoesLiberadas.map((acao) => (
                                                    <span key={acao} className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-100">
                                                        {acao}
                                                    </span>
                                                )) : (
                                                    <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-slate-400 ring-1 ring-slate-100">
                                                        Nenhuma ação liberada
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="rounded-2xl bg-red-50 p-3 ring-1 ring-red-100">
                                            <p className="text-[10px] font-black uppercase tracking-wide text-red-700">Restrições planejadas</p>
                                            <div className="mt-2 flex flex-wrap gap-1.5">
                                                {perfilPermissoesSelecionado.acoesRestritas.length > 0 ? perfilPermissoesSelecionado.acoesRestritas.map((acao) => (
                                                    <span key={acao} className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-red-700 ring-1 ring-red-100">
                                                        {acao}
                                                    </span>
                                                )) : (
                                                    <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-slate-400 ring-1 ring-slate-100">
                                                        Sem restrição planejada
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
                                            <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Observação</p>
                                            <p className="mt-2 text-xs font-semibold leading-relaxed text-slate-500">{perfilPermissoesSelecionado.observacao}</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="mt-4 rounded-2xl bg-white p-4 text-center ring-1 ring-slate-100">
                                    <p className="text-sm font-black text-slate-900">Selecione um perfil para ver os detalhes.</p>
                                    <p className="mt-1 text-xs font-semibold text-slate-500">A matriz ajuda a validar o perfil antes de salvar novas permissões no Supabase.</p>
                                </div>
                            )}
                        </div>

                        <div className="mt-4 rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200">
                            <div className="flex items-start gap-3">
                                <ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-slate-500" />
                                <div>
                                    <p className="text-sm font-black text-slate-950">Regras de uso administrativo</p>
                                    <div className="mt-2 grid gap-2 text-xs font-semibold leading-relaxed text-slate-600 md:grid-cols-2">
                                        <p>1. Mantenha pelo menos um administrador ativo antes de alterar perfis.</p>
                                        <p>2. Use solicitações aprovadas para preparar permissões quando possível.</p>
                                        <p>3. Bloqueie perfis somente quando houver outro administrador com acesso validado.</p>
                                        <p>4. Revise a Auditoria do Sistema após alterações administrativas sensíveis.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>
                )
            );

        case "config-auditoria-publica":
            return renderBlocoConfiguracaoComControle(
                "config-auditoria-publica",
                "Auditoria pública e QR Code",
                "Token, senha de referência e link público.",
                (
                    <Card>
                        <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <div className="flex items-center gap-2">
                                    <KeyRound className="h-5 w-5 text-slate-500" />
                                    <h2 id="config-auditoria-publica" className="scroll-mt-24 text-lg font-black text-slate-950">Auditoria pública e QR Code</h2>
                                </div>
                                <p className="mt-1 text-sm text-slate-500">
                                    Configure o token usado nos links públicos e deixe a senha de referência documentada para operação.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={restaurarConfigAuditoriaPublica}
                                disabled={!podeAlterarConfiguracoesCriticasSistema}
                                title={podeAlterarConfiguracoesCriticasSistema ? "Restaurar configuração padrão da Auditoria pública" : mensagemBloqueioConfiguracoesCriticasSistema}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-3 py-2 text-xs font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                            >
                                <RotateCcw className="h-3.5 w-3.5" />
                                Restaurar
                            </button>
                        </div>

                        {mensagemAuditoriaPublica && (
                            <div className="mt-4 rounded-2xl bg-blue-50 px-4 py-3 text-xs font-bold text-blue-700 ring-1 ring-blue-200">
                                {mensagemAuditoriaPublica}
                            </div>
                        )}

                        <div className="mt-4 space-y-3">
                            <label className="block rounded-2xl bg-slate-50 px-3 py-3 ring-1 ring-slate-100">
                                <p className="text-sm font-bold text-slate-800">Token público operacional</p>
                                <p className="mt-1 text-xs text-slate-500">Carregado diretamente da tabela auditoria_tokens_publicos. O navegador não salva mais token fixo/local.</p>
                                <input
                                    value={configAuditoriaPublica.tokenPublico || ""}
                                    readOnly
                                    placeholder={carregandoAuditoriaPublica ? "Carregando token ativo do Supabase..." : "Token ativo não encontrado no Supabase"}
                                    className="mt-3 w-full cursor-not-allowed rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none"
                                />
                                <p className="mt-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                                    Origem: {origemAuditoriaPublica === "supabase" ? "Supabase" : origemAuditoriaPublica}
                                </p>
                            </label>

                            <label className="block rounded-2xl bg-slate-50 px-3 py-3 ring-1 ring-slate-100">
                                <p className="text-sm font-bold text-slate-800">Senha de referência</p>
                                <p className="mt-1 text-xs text-slate-500">Campo operacional. A validação real continua na RPC/tabela do Supabase.</p>
                                <input
                                    value={configAuditoriaPublica.senhaReferencia || ""}
                                    onChange={(evento) => alterarConfigAuditoriaPublica("senhaReferencia", evento.target.value)}
                                    placeholder="2026"
                                    className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-100"
                                />
                            </label>

                            <div className="rounded-2xl bg-slate-50 px-3 py-3 ring-1 ring-slate-100">
                                <div className="flex items-center gap-2">
                                    <Link2 className="h-4 w-4 text-slate-500" />
                                    <p className="text-sm font-bold text-slate-800">Link público atual</p>
                                </div>
                                <p className="texto-quebra-segura mt-2 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-500 ring-1 ring-slate-200">
                                    {configAuditoriaPublica.tokenPublico ? linkAuditoriaPublica : "Token ativo não encontrado no Supabase. Verifique a tabela auditoria_tokens_publicos."}
                                </p>
                                <button
                                    type="button"
                                    onClick={copiarLinkAuditoriaPublica}
                                    disabled={!configAuditoriaPublica.tokenPublico}
                                    className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-xs font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    <Copy className="h-3.5 w-3.5" />
                                    Copiar link
                                </button>
                            </div>

                            <div className="rounded-2xl bg-orange-50 px-3 py-3 text-xs font-semibold leading-relaxed text-orange-700 ring-1 ring-orange-200">
                                Segurança: o token público é carregado do Supabase. Alterar a senha de referência aqui não altera a senha validada pela RPC validar_acesso_auditoria_publica.
                            </div>
                            <div className="rounded-2xl bg-slate-50 px-3 py-3 text-xs font-semibold leading-relaxed text-slate-600 ring-1 ring-slate-100">
                                Ações de salvar/restaurar só ficam disponíveis para usuários com permissão crítica de Configurações.
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={salvarConfigAuditoriaPublica}
                            disabled={!podeAlterarConfiguracoesCriticasSistema}
                            title={podeAlterarConfiguracoesCriticasSistema ? "Salvar referência da Auditoria pública" : mensagemBloqueioConfiguracoesCriticasSistema}
                            className="mt-4 w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                        >
                            {podeAlterarConfiguracoesCriticasSistema ? "Salvar referência da Auditoria pública" : "Auditoria pública bloqueada"}
                        </button>
                    </Card>
                )
            );

        case "config-seguranca-publica":
            return renderBlocoConfiguracaoComControle(
                "config-seguranca-publica",
                "Revisão de segurança da Auditoria pública",
                "Checklist operacional do QR Code público.",
                (
                    <Card>
                        <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <div className="flex items-center gap-2">
                                    <ShieldAlert className="h-5 w-5 text-slate-500" />
                                    <h2 id="config-seguranca-publica" className="scroll-mt-24 text-lg font-black text-slate-950">Revisão de segurança da Auditoria pública</h2>
                                </div>
                                <p className="mt-1 text-sm text-slate-500">
                                    Checklist operacional para evitar token padrão, senha fraca no processo e exposição indevida no QR Code.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={copiarChecklistSegurancaAuditoriaPublica}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-3 py-2 text-xs font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                            >
                                <Copy className="h-3.5 w-3.5" />
                                Copiar checklist
                            </button>
                        </div>

                        <div className={classNames("mt-4 rounded-2xl px-4 py-3 text-sm font-black ring-1", resumoSegurancaAuditoriaPublica.classe)}>
                            Status: {resumoSegurancaAuditoriaPublica.texto} · {resumoSegurancaAuditoriaPublica.detalhe}
                        </div>

                        <div className="mt-4 space-y-3">
                            {avaliacoesSegurancaAuditoriaPublica.map((item) => (
                                <div key={item.chave} className="rounded-2xl bg-slate-50 px-3 py-3 ring-1 ring-slate-100">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-sm font-bold text-slate-900">{item.label}</p>
                                            <p className="mt-1 text-xs leading-relaxed text-slate-500">{item.descricao}</p>
                                            <p className="mt-2 text-[11px] font-semibold leading-relaxed text-slate-400">{item.recomendacao}</p>
                                        </div>
                                        <span className={classNames(
                                            "shrink-0 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wide ring-1",
                                            item.nivel === "ok" && "bg-emerald-50 text-emerald-700 ring-emerald-200",
                                            item.nivel === "alerta" && "bg-orange-50 text-orange-700 ring-orange-200",
                                            item.nivel === "critico" && "bg-red-50 text-red-700 ring-red-200",
                                            item.nivel === "info" && "bg-blue-50 text-blue-700 ring-blue-200"
                                        )}>
                                            {item.nivel === "ok" ? "OK" : item.nivel === "critico" ? "Crítico" : item.nivel === "alerta" ? "Atenção" : "Info"}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                )
            );

        case "config-storage-privado":
            return renderBlocoConfiguracaoComControle(
                "config-storage-privado",
                "Revisão de Storage e arquivos privados",
                "Buckets, URLs assinadas e arquivos sensíveis.",
                (
                    <Card>
                        <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <div className="flex items-center gap-2">
                                    <HardDrive className="h-5 w-5 text-slate-500" />
                                    <h2 id="config-storage-privado" className="scroll-mt-24 text-lg font-black text-slate-950">Revisão de Storage e arquivos privados</h2>
                                </div>
                                <p className="mt-1 text-sm text-slate-500">
                                    Checklist operacional para buckets, URLs assinadas e arquivos sensíveis do sistema SST.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={copiarChecklistSegurancaStorage}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-3 py-2 text-xs font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                            >
                                <Copy className="h-3.5 w-3.5" />
                                Copiar checklist Storage
                            </button>
                        </div>

                        {mensagemStorage && (
                            <div className="mt-4 rounded-2xl bg-blue-50 px-4 py-3 text-xs font-bold text-blue-700 ring-1 ring-blue-200">
                                {mensagemStorage}
                            </div>
                        )}

                        <div className={classNames("mt-4 rounded-2xl px-4 py-3 text-sm font-black ring-1", resumoSegurancaStorage.classe)}>
                            Status: {resumoSegurancaStorage.texto} · {resumoSegurancaStorage.detalhe}
                        </div>

                        <div className="mt-4 space-y-3">
                            {avaliacoesSegurancaStorage.map((item) => (
                                <div key={item.chave} className="rounded-2xl bg-slate-50 px-3 py-3 ring-1 ring-slate-100">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-wide text-slate-500 ring-1 ring-slate-200">
                                                    {item.grupo}
                                                </span>
                                                <span className={classNames(
                                                    "rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wide ring-1",
                                                    item.nivel === "ok" && "bg-emerald-50 text-emerald-700 ring-emerald-200",
                                                    item.nivel === "alerta" && "bg-orange-50 text-orange-700 ring-orange-200",
                                                    item.nivel === "critico" && "bg-red-50 text-red-700 ring-red-200",
                                                    item.nivel === "info" && "bg-blue-50 text-blue-700 ring-blue-200"
                                                )}>
                                                    {item.nivel === "ok" ? "OK" : item.nivel === "critico" ? "Crítico" : item.nivel === "alerta" ? "Atenção" : "Info"}
                                                </span>
                                            </div>
                                            <p className="mt-3 text-sm font-bold text-slate-900">{item.label}</p>
                                            <p className="mt-1 text-xs leading-relaxed text-slate-500">{item.descricao}</p>
                                            <p className="mt-2 text-[11px] font-semibold leading-relaxed text-slate-400">{item.recomendacao}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                )
            );


        case "config-arquivos-storage":
            if (!blocoConfiguracaoVisivel("config-arquivos-storage")) return null;

            if (blocoConfiguracaoRecolhido("config-arquivos-storage")) {
                return renderBlocoConfiguracaoComControle(
                    "config-arquivos-storage",
                    "Arquivos salvos no Storage",
                    "Capacidade, vínculos, limpeza e arquivos salvos.",
                    null
                );
            }

            return (
                <ArquivosStorageConfiguracoes
                    limiteStorageMb={limitesEditaveis.storageMb || limites.storageMb || 1024}
                    onListarArquivosStorage={onListarArquivosStorage}
                    onExcluirArquivoStorage={onExcluirArquivoStorage}
                    onAtualizarAuditoria={onAtualizarAuditoria}
                    controleCard={botaoRecolherBlocoConfiguracao("config-arquivos-storage", "w-full sm:w-auto")}
                />
            );

        case "config-supabase-geral":
            return renderBlocoConfiguracaoComControle(
                "config-supabase-geral",
                "Revisão geral Supabase / RLS / RPC",
                "Tabelas, policies, funções, buckets e pontos de performance.",
                (
                    <Card>
                        <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <div className="flex items-center gap-2">
                                    <Database className="h-5 w-5 text-slate-500" />
                                    <h2 id="config-supabase-geral" className="scroll-mt-24 text-lg font-black text-slate-950">Revisão geral Supabase / RLS / RPC</h2>
                                </div>
                                <p className="mt-1 text-sm text-slate-500">
                                    Checklist técnico para conferir tabelas, RLS, RPCs, Edge Functions, buckets e performance do Supabase.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={copiarChecklistRevisaoSupabase}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-3 py-2 text-xs font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                            >
                                <Copy className="h-3.5 w-3.5" />
                                Copiar checklist Supabase
                            </button>
                        </div>

                        {mensagemSupabase && (
                            <div className="mt-4 rounded-2xl bg-blue-50 px-4 py-3 text-xs font-bold text-blue-700 ring-1 ring-blue-200">
                                {mensagemSupabase}
                            </div>
                        )}

                        <div className={classNames("mt-4 rounded-2xl px-4 py-3 text-sm font-black ring-1", resumoRevisaoSupabase.classe)}>
                            Status: {resumoRevisaoSupabase.texto} · {resumoRevisaoSupabase.detalhe}
                        </div>

                        <div className="mt-4 space-y-3">
                            {avaliacoesRevisaoSupabase.map((item) => (
                                <div key={item.chave} className="rounded-2xl bg-slate-50 px-3 py-3 ring-1 ring-slate-100">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-wide text-slate-500 ring-1 ring-slate-200">
                                                    {item.grupo}
                                                </span>
                                                <span className={classNames(
                                                    "rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wide ring-1",
                                                    item.nivel === "ok" && "bg-emerald-50 text-emerald-700 ring-emerald-200",
                                                    item.nivel === "alerta" && "bg-orange-50 text-orange-700 ring-orange-200",
                                                    item.nivel === "critico" && "bg-red-50 text-red-700 ring-red-200",
                                                    item.nivel === "info" && "bg-blue-50 text-blue-700 ring-blue-200"
                                                )}>
                                                    {item.nivel === "ok" ? "OK" : item.nivel === "critico" ? "Crítico" : item.nivel === "alerta" ? "Atenção" : "Info"}
                                                </span>
                                            </div>
                                            <p className="mt-3 text-sm font-bold text-slate-900">{item.label}</p>
                                            <p className="mt-1 text-xs leading-relaxed text-slate-500">{item.descricao}</p>
                                            <p className="mt-2 text-[11px] font-semibold leading-relaxed text-slate-400">{item.recomendacao}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                )
            );

        case "config-status-etapa":
            return renderBlocoConfiguracaoComControle(
                "config-status-etapa",
                "Status da etapa",
                "Resumo da configuração e usuário atual.",
                (
                    <Card>
                        <div className="flex items-start gap-3">
                            <div className="rounded-2xl bg-blue-50 p-3 text-blue-700">
                                <CheckCircle2 className="h-5 w-5" />
                            </div>
                            <div>
                                <h2 id="config-status-etapa" className="scroll-mt-24 text-lg font-black text-slate-950">Status da etapa</h2>
                                <p className="mt-1 text-sm leading-relaxed text-slate-500">
                                    Esta tela centraliza as configurações sem alterar regras de login, RLS, Storage, upload ou QR público.
                                </p>
                                <p className="mt-3 text-xs font-semibold text-slate-400">
                                    Usuário atual: {usuario?.email || "não informado"}
                                </p>
                            </div>
                        </div>
                    </Card>
                )
            );

        default:
            return null;
        }
    };

    return (
        <div className="page-shell">
            <Header
                titulo="Configurações do sistema"
                subtitulo="Painel administrativo para permissões, limites, Storage, token público e configurações críticas do sistema SST."
                acao={(
                    <div className="top-actions-nowrap flex-wrap justify-end">
                        {acaoTopo}
                        <button
                            type="button"
                            onClick={() => setMostrarOrganizacaoCards((valor) => !valor)}
                            className={classNames(
                                "inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold shadow-sm ring-1 transition hover:-translate-y-0.5",
                                mostrarOrganizacaoCards
                                    ? "bg-blue-50 text-blue-700 ring-blue-100 hover:bg-blue-100"
                                    : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
                            )}
                        >
                            <SlidersHorizontal className="h-4 w-4" />
                            Personalizar painel
                        </button>
                        <button type="button" onClick={abrirTodosBlocosConfiguracao} className="inline-flex items-center rounded-2xl bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50">Abrir todos</button>
                        <button type="button" onClick={recolherTodosBlocosConfiguracao} className="inline-flex items-center rounded-2xl bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50">Recolher todos</button>
                        <button
                            type="button"
                            onClick={carregarConfiguracao}
                            disabled={carregandoConfig || salvandoConfig}
                            className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <RefreshCw className={classNames("h-4 w-4", carregandoConfig && "animate-spin")} />
                            Atualizar configurações
                        </button>
                    </div>
                )}
            />

            <div className="config-summary-grid cards-grid--fixed-5">
                {cardsResumo.map((card) => {
                    const Icon = card.icon;
                    return (
                        <Card key={card.label} className="config-summary-card summary-card-fixed h-full">
                            <div className="summary-card-content">
                                <div className="summary-card-icon flex shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 ring-1 ring-slate-200">
                                    <Icon className="h-4 w-4" />
                                </div>
                                <div className="flex min-w-0 flex-1 flex-col">
                                    <p className="summary-card-label texto-quebra-segura">{card.label}</p>
                                    <p className={classNames("summary-card-value texto-quebra-segura", card.label === "Token Auditoria pública" && "summary-card-value--token")}>{card.valor}</p>
                                    <p className="summary-card-detail">{card.detalhe}</p>
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>

            {mostrarOrganizacaoCards && (
                <Card className="mt-4 border-blue-100 bg-white">
                    <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                            <h2 className="text-lg font-black text-slate-950">Personalizar painel Configurações</h2>
                            <p className="mt-1 text-sm leading-relaxed text-slate-500">
                                Marque apenas os cards que devem aparecer na aba Configurações. Ajuste tamanho, ordem e abertura igual ao Dashboard SST.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={restaurarOrganizacaoCardsConfiguracoes}
                                className="inline-flex min-h-[36px] items-center justify-center rounded-2xl bg-slate-950 px-4 py-2 text-xs font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800"
                            >
                                Mostrar padrão
                            </button>
                            <button
                                type="button"
                                onClick={recolherTodosBlocosConfiguracao}
                                className="inline-flex min-h-[36px] items-center justify-center rounded-2xl bg-white px-4 py-2 text-xs font-black text-slate-700 ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:bg-slate-50"
                            >
                                Painel compacto
                            </button>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => setFiltroPainelConfiguracoes("todos")}
                        className="mt-5 w-full rounded-3xl bg-blue-600 p-4 text-left text-white ring-1 ring-blue-600 transition hover:-translate-y-0.5 hover:bg-blue-700"
                    >
                        <p className="text-xs font-black uppercase tracking-wide text-blue-100">Filtro 1</p>
                        <h3 className="mt-1 text-sm font-black">Cards e quadros da aba Configurações</h3>
                        <p className="mt-1 text-xs font-semibold text-blue-50">Edite visibilidade, ordem, abertura e tamanho dos cards administrativos em um único painel.</p>
                    </button>

                    <div className="mt-5 rounded-3xl bg-blue-50/60 p-3 ring-1 ring-blue-100">
                        <div className="flex flex-col gap-3 border-b border-blue-100 pb-3 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <p className="text-[11px] font-black uppercase tracking-wide text-blue-700">Seção 1</p>
                                <h3 className="text-sm font-black text-slate-950">Cards da aba Configurações</h3>
                                <p className="text-xs font-semibold text-slate-500">Mostrando {secoesPersonalizacaoConfiguracoes.length} de {secoesConfiguracoesOrdenadas.length} card(s).</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {FILTROS_PAINEL_CONFIGURACOES.map((filtro) => (
                                    <button
                                        key={filtro.chave}
                                        type="button"
                                        onClick={() => setFiltroPainelConfiguracoes(filtro.chave)}
                                        className={classNames(
                                            "rounded-2xl px-3 py-2 text-xs font-black ring-1 transition hover:-translate-y-0.5",
                                            filtroPainelConfiguracoes === filtro.chave
                                                ? "bg-blue-600 text-white ring-blue-600"
                                                : "bg-white text-blue-700 ring-blue-100 hover:bg-blue-50"
                                        )}
                                    >
                                        {filtro.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
                            {secoesPersonalizacaoConfiguracoes.map((secao) => {
                                const Icon = secao.icon;
                                const indiceReal = secoesConfiguracoesOrdenadas.findIndex((item) => item.chave === secao.chave);
                                const visivel = blocoConfiguracaoVisivel(secao.chave);
                                const recolhido = blocoConfiguracaoRecolhido(secao.chave);
                                const tamanhoAtual = obterTamanhoBlocoConfiguracao(secao.chave);

                                return (
                                    <div
                                        key={secao.chave}
                                        draggable
                                        onDragStart={(evento) => {
                                            setBlocoArrastandoConfiguracoes(secao.chave);
                                            evento.dataTransfer.setData("text/plain", secao.chave);
                                            evento.dataTransfer.effectAllowed = "move";
                                        }}
                                        onDragOver={(evento) => evento.preventDefault()}
                                        onDrop={(evento) => {
                                            evento.preventDefault();
                                            const origem = evento.dataTransfer.getData("text/plain") || blocoArrastandoConfiguracoes;
                                            moverBlocoParaConfiguracao(origem, secao.chave);
                                            setBlocoArrastandoConfiguracoes("");
                                        }}
                                        onDragEnd={() => setBlocoArrastandoConfiguracoes("")}
                                        className={classNames(
                                            "rounded-3xl bg-blue-50/70 p-3 ring-1 ring-blue-100 transition",
                                            blocoArrastandoConfiguracoes === secao.chave && "opacity-60 ring-2 ring-blue-300"
                                        )}
                                    >
                                        <div className="flex items-start gap-3">
                                            <span className="mt-1 inline-flex h-9 w-9 shrink-0 cursor-grab items-center justify-center rounded-2xl bg-white text-slate-500 ring-1 ring-blue-100 active:cursor-grabbing">☰</span>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-start justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <h4 className="text-sm font-black text-blue-950">#{indiceReal + 1}. {secao.titulo}</h4>
                                                        <p className="mt-0.5 text-xs font-semibold leading-relaxed text-slate-500">{secao.descricao}</p>
                                                    </div>
                                                    <div className="flex shrink-0 items-center gap-1">
                                                        <button type="button" onClick={() => moverBlocoConfiguracao(secao.chave, -1)} disabled={indiceReal === 0} className="rounded-xl bg-white px-2 py-1 text-xs font-black text-slate-600 ring-1 ring-blue-100 disabled:cursor-not-allowed disabled:opacity-40">↑</button>
                                                        <button type="button" onClick={() => moverBlocoConfiguracao(secao.chave, 1)} disabled={indiceReal === secoesConfiguracoesOrdenadas.length - 1} className="rounded-xl bg-white px-2 py-1 text-xs font-black text-slate-600 ring-1 ring-blue-100 disabled:cursor-not-allowed disabled:opacity-40">↓</button>
                                                        <button type="button" onClick={() => alternarVisibilidadeBlocoConfiguracao(secao.chave)} className={classNames("rounded-xl px-3 py-1 text-[11px] font-black uppercase ring-1", visivel ? "bg-blue-100 text-blue-700 ring-blue-200" : "bg-white text-slate-500 ring-slate-200")}>{visivel ? "Visível" : "Oculto"}</button>
                                                    </div>
                                                </div>

                                                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                                                    {[
                                                        ["padrao", "Padrão", "1 coluna"],
                                                        ["medio", "Médio", "2 colunas"],
                                                        ["grande", "Grande", "3 colunas"],
                                                        ["destaque", "Destaque", "linha inteira"],
                                                    ].map(([tamanho, label, detalhe]) => (
                                                        <button
                                                            key={tamanho}
                                                            type="button"
                                                            onClick={() => definirTamanhoBlocoConfiguracao(secao.chave, tamanho)}
                                                            className={classNames(
                                                                "rounded-2xl px-3 py-2 text-center ring-1 transition hover:-translate-y-0.5",
                                                                tamanhoAtual === tamanho
                                                                    ? "bg-slate-950 text-white ring-slate-950"
                                                                    : "bg-white text-slate-700 ring-blue-100 hover:bg-blue-50"
                                                            )}
                                                        >
                                                            <span className="block text-xs font-black">{label}</span>
                                                            <span className={classNames("block text-[10px] font-semibold", tamanhoAtual === tamanho ? "text-slate-200" : "text-slate-400")}>{detalhe}</span>
                                                        </button>
                                                    ))}
                                                </div>

                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    <button type="button" onClick={() => alternarRecolhidoBlocoConfiguracao(secao.chave)} className="rounded-2xl bg-white px-3 py-1.5 text-xs font-black text-blue-700 ring-1 ring-blue-100 hover:bg-blue-50">{recolhido ? "Abrir card" : "Recolher card"}</button>
                                                    <button type="button" onClick={() => definirTamanhoBlocoConfiguracao(secao.chave, "padrao")} className="rounded-2xl bg-white px-3 py-1.5 text-xs font-black text-slate-600 ring-1 ring-blue-100 hover:bg-blue-50">Diminuir</button>
                                                    <button type="button" onClick={() => definirTamanhoBlocoConfiguracao(secao.chave, "destaque")} className="rounded-2xl bg-white px-3 py-1.5 text-xs font-black text-slate-600 ring-1 ring-blue-100 hover:bg-blue-50">Aumentar</button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </Card>
            )}

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {secoesConfiguracoesOrdenadas.map((secao) => {
                    if (!blocoConfiguracaoVisivel(secao.chave)) return null;

                    return (
                        <div
                            key={secao.chave}
                            draggable={mostrarOrganizacaoCards}
                            onDragStart={(evento) => {
                                if (!mostrarOrganizacaoCards) return;
                                setBlocoArrastandoConfiguracoes(secao.chave);
                                evento.dataTransfer.setData("text/plain", secao.chave);
                                evento.dataTransfer.effectAllowed = "move";
                            }}
                            onDragOver={(evento) => {
                                if (mostrarOrganizacaoCards) evento.preventDefault();
                            }}
                            onDrop={(evento) => {
                                if (!mostrarOrganizacaoCards) return;
                                evento.preventDefault();
                                const origem = evento.dataTransfer.getData("text/plain") || blocoArrastandoConfiguracoes;
                                moverBlocoParaConfiguracao(origem, secao.chave);
                                setBlocoArrastandoConfiguracoes("");
                            }}
                            onDragEnd={() => setBlocoArrastandoConfiguracoes("")}
                            className={classNames(
                                "min-w-0 transition",
                                obterClasseTamanhoBlocoConfiguracao(secao.chave),
                                mostrarOrganizacaoCards && "cursor-grab active:cursor-grabbing",
                                blocoArrastandoConfiguracoes === secao.chave && "opacity-60"
                            )}
                        >
                            {renderBlocoConfiguracao(secao.chave)}
                        </div>
                    );
                })}
            </div>

            {secoesConfiguracoesVisiveisOrdenadas.length === 0 && (
                <Card className="mt-6 border-orange-100 bg-orange-50/60">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="mt-1 h-5 w-5 shrink-0 text-orange-600" />
                        <div>
                            <h2 className="text-lg font-black text-orange-900">Nenhum card de configuração visível</h2>
                            <p className="mt-1 text-sm font-semibold text-orange-700">Use Restaurar organização para reexibir os cards da tela Configurações.</p>
                        </div>
                    </div>
                </Card>
            )}

            {!podeAcessarAuditoria && (
                <div className="mt-6 rounded-3xl bg-orange-50 p-4 text-sm font-semibold text-orange-700 ring-1 ring-orange-200">
                    <div className="flex items-start gap-2">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <p>
                            Você pode visualizar esta tela, mas as configurações da Auditoria de sistema devem ser administradas por usuário com permissão de auditoria.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
