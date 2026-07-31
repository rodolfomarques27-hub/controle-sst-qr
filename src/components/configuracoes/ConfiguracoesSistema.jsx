/* eslint-disable no-unused-vars */
import React, { useEffect, useMemo, useState } from "react";
import { CalendarClock,
    AlertTriangle,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Copy,
    Database,
    FileText,
    ImagePlus,
    HardDrive,
    KeyRound,
    Link2,

    RefreshCw,
    RotateCcw,
    Settings,
    ShieldAlert,
    ShieldCheck,
    SlidersHorizontal,
} from "lucide-react";
import dashboardHeroBackground from "../../assets/dashboard-hero-sst.webp";
import "../../styles/pages/configuracoes-hero-actions.css";
import "../../styles/pages/configuracoes-cards.css";
import { Header, Card } from "../commonComponents";
import { ArquivosStorageConfiguracoes } from "./ArquivosStorageConfiguracoes";
import { EmergenciaQrPinCard } from "./EmergenciaQrPinCard";
import { ModelosEmailSstConfiguracoes } from "./ModelosEmailSstConfiguracoes";
import {
    carregarConfiguracaoEventosAuditoriaSistemaSupabase,
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
    carregarTokenAuditoriaPublicaAtivoPadrao,
} from "../../services/auditoriaPublicaTokenService";

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
    obterResumoAcoesCriticasSistema,
    obterResumoPermissaoSistema,
} from "../../services/usuariosPermissoesSistemaService";
import { supabase } from "../../lib/supabaseClient";
import { reduzirFotoParaAuditoria } from "../../services/imagemService";
import { obterUrlPublicaStorage } from "../../services/supabaseServices";
import { QrCodeComLogo, QrCodeLogoControls } from "../qr/QrCodeComLogo";
import { montarUrlPublicaSistema } from "../../utils/urlPublicaUtils.js";
import {
    adicionarObra,
    atualizarObra,
    excluirObra,
    atualizarVinculoEmpresaObra,
    excluirVinculoEmpresaObra,
    listarObras,
    listarVinculosEmpresasObras,
    vincularEmpresaObra,
} from "../../services/obrasService";
import {
    carregarFundoLoginPublicoService,
    restaurarAjusteFundoLoginService,
    salvarAjusteFundoLoginService,
} from "../../services/fundoLoginPublicoService";

const classNames = (...classes) => classes.filter(Boolean).join(" ");

const FORMULARIO_OBRA_CONFIGURACOES_INICIAL = {
    id: "",
    nome: "",
    cep: "",
    numeroObra: "",
    cidade: "",
    uf: "",
    endereco: "",
    numeroEndereco: "",
    fiscalIdealiza: "",
    tecnicoSegurancaIdealiza: "",
    liderEncarregado: "",
    status: "Ativa",
    observacoes: "",
};

const UFS_OBRAS_CONFIGURACOES = [
    "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS",
    "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC",
    "SP", "SE", "TO",
];

function formatarCepObraConfiguracoes(valor = "") {
    const digitos = String(valor || "").replace(/\D/g, "").slice(0, 8);

    if (digitos.length > 5) return digitos.slice(0, 5) + "-" + digitos.slice(5);
    return digitos;
}

function criarFormularioObraConfiguracoes(obra = {}) {
    return {
        id: obra.id || "",
        nome: obra.nome || "",
        cep: obra.cep || "",
        numeroObra: obra.numeroObra || obra.numero_obra || "",
        cidade: obra.cidade || "",
        uf: obra.uf || "",
        endereco: obra.endereco || "",
        numeroEndereco: obra.numeroEndereco || obra.numero_endereco || "",
        fiscalIdealiza: obra.fiscalIdealiza || obra.fiscal_idealiza || "",
        tecnicoSegurancaIdealiza: obra.tecnicoSegurancaIdealiza || obra.tecnico_seguranca_idealiza || "",
        liderEncarregado: obra.liderEncarregado || obra.lider_encarregado || "",
        status: obra.status === "Inativa" ? "Inativa" : "Ativa",
        observacoes: obra.observacoes || "",
    };
}
function obterIdEmpresaObrasConfiguracoes(item = {}) {
    return String(item.id || item.empresa_id || item.empresaId || "").trim();
}

function obterNomeEmpresaObrasConfiguracoes(item = {}) {
    return String(item.nome || item.nome_fantasia || item.razao_social || item.empresa || "Empresa sem nome").trim();
}

function ordenarEmpresasObrasConfiguracoes(empresas = []) {
    return [...(empresas || [])]
        .filter((empresa) => obterIdEmpresaObrasConfiguracoes(empresa))
        .sort((a, b) => obterNomeEmpresaObrasConfiguracoes(a).localeCompare(obterNomeEmpresaObrasConfiguracoes(b), "pt-BR"));
}
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

const MAPA_ROTULOS_PERFIS_USUARIOS = {
    administrador: "Administrador",
    tecnico_sst: "Técnico SST",
    consulta: "Consulta",
    bloqueado: "Bloqueado",
    auditor: "Auditor",
    gestor: "Gestor",
};

function normalizarTextoPermissao(valor = "") {
    return String(valor || "").trim().toLowerCase();
}

function formatarPerfilPermissaoSistema(perfil = "") {
    const chave = normalizarTextoPermissao(perfil || "consulta");
    return MAPA_ROTULOS_PERFIS_USUARIOS[chave] || "Consulta";
}

const CHAVES_BLOCOS_CONFIGURACOES_PADRAO = [
    "config-versao-sistema",
    "config-limites-carregamento",
    "config-auditoria-publica",
    "config-emergencia-qr",
    "config-modelos-email-sst",
    "config-arquivos-storage",
    "config-obras",
    "config-relatorios-evidencias",
    "config-login-visual",
    "config-eventos-auditoria",
    "config-seguranca-publica",
    "config-storage-privado",
    "config-supabase-geral",
];

const VERSAO_LAYOUT_CONFIGURACOES_SISTEMA = "roteiro16-modelos-email-sst";
const CHAVE_LAYOUT_CONFIGURACOES_SISTEMA = "configuracoesSistemaVersaoLayout";
const CHAVE_BLOCOS_VISIVEIS_CONFIGURACOES = "configuracoesSistemaBlocosVisiveis";
const CHAVE_BLOCOS_RECOLHIDOS_CONFIGURACOES = "configuracoesSistemaBlocosRecolhidos";
const CHAVE_ORDEM_BLOCOS_CONFIGURACOES = "configuracoesSistemaOrdemBlocos";
const CHAVE_TAMANHOS_BLOCOS_CONFIGURACOES = "configuracoesSistemaTamanhosBlocos";
const BUCKET_FUNDO_LOGIN_CONFIGURACOES = "logos-empresas";
const CAMINHO_FUNDO_LOGIN_CONFIGURACOES = "configuracoes/login/fundo-login.jpg";

const CHAVE_VERSAO_FUNDO_LOGIN_CONFIGURACOES = "controleSstQrFundoLoginVersao";

const AJUSTE_FUNDO_LOGIN_PADRAO_CONFIGURACOES = {
    size: "cover",
    position: "center center",
    overlay: 0.62,
};

const PRE_AJUSTES_FUNDO_LOGIN_CONFIGURACOES = [
    {
        chave: "preencher",
        label: "Preencher",
        descricao: "Ocupa toda a tela",
        ajuste: { size: "cover", position: "center center", overlay: 0.62 },
    },
    {
        chave: "inteira",
        label: "Imagem inteira",
        descricao: "Mostra sem cortar",
        ajuste: { size: "contain", position: "center center", overlay: 0.64 },
    },
    {
        chave: "subir",
        label: "Subir",
        descricao: "Foco superior",
        ajuste: { size: "cover", position: "center 30%", overlay: 0.62 },
    },
    {
        chave: "descer",
        label: "Descer",
        descricao: "Foco inferior",
        ajuste: { size: "cover", position: "center 70%", overlay: 0.62 },
    },
    {
        chave: "esquerda",
        label: "Esquerda",
        descricao: "Foco à esquerda",
        ajuste: { size: "cover", position: "30% center", overlay: 0.62 },
    },
    {
        chave: "direita",
        label: "Direita",
        descricao: "Foco à direita",
        ajuste: { size: "cover", position: "70% center", overlay: 0.62 },
    },
    {
        chave: "zoom-leve",
        label: "Zoom leve",
        descricao: "Aproxima pouco",
        ajuste: { size: "115% auto", position: "center center", overlay: 0.62 },
    },
    {
        chave: "mais-escuro",
        label: "Mais escuro",
        descricao: "Aumenta contraste",
        ajuste: { size: "cover", position: "center center", overlay: 0.76 },
    },
    {
        chave: "mais-claro",
        label: "Mais claro",
        descricao: "Reduz escurecimento",
        ajuste: { size: "cover", position: "center center", overlay: 0.46 },
    },
];

function montarUrlPublicaConfiguracoesStorage(caminho, versao = "") {
    return obterUrlPublicaStorage(
        BUCKET_FUNDO_LOGIN_CONFIGURACOES,
        caminho,
        versao,
    );
}

function montarUrlFundoLoginConfiguracoes(versao = "") {
    return montarUrlPublicaConfiguracoesStorage(CAMINHO_FUNDO_LOGIN_CONFIGURACOES, versao);
}


function normalizarAjusteFundoLoginConfiguracoes(valor = {}) {
    const overlayNumerico = Number(valor?.overlay);

    return {
        size: String(valor?.size || AJUSTE_FUNDO_LOGIN_PADRAO_CONFIGURACOES.size),
        position: String(valor?.position || AJUSTE_FUNDO_LOGIN_PADRAO_CONFIGURACOES.position),
        overlay: Number.isFinite(overlayNumerico)
            ? Math.min(0.82, Math.max(0.28, overlayNumerico))
            : AJUSTE_FUNDO_LOGIN_PADRAO_CONFIGURACOES.overlay,
    };
}

function montarEstiloFundoLoginConfiguracoes(url, ajuste = AJUSTE_FUNDO_LOGIN_PADRAO_CONFIGURACOES) {
    if (!url) return undefined;

    const ajusteFinal = normalizarAjusteFundoLoginConfiguracoes(ajuste);
    const overlayPrincipal = ajusteFinal.overlay;
    const overlaySecundario = Math.max(0.34, overlayPrincipal - 0.12);

    return {
        backgroundImage: `linear-gradient(135deg, rgba(2, 6, 23, ${overlayPrincipal}), rgba(15, 23, 42, ${overlaySecundario})), url("${url}")`,
        backgroundSize: ajusteFinal.size,
        backgroundPosition: ajusteFinal.position,
        backgroundRepeat: "no-repeat",
    };
}


function carregarVersaoFundoLoginConfiguracoes() {
    if (typeof window === "undefined") return "";

    try {
        return window.localStorage.getItem(CHAVE_VERSAO_FUNDO_LOGIN_CONFIGURACOES) || "";
    } catch {
        return "";
    }
}


const BLOCOS_CONFIGURACOES_ABERTOS_PADRAO = new Set([
    "config-versao-sistema",
    "config-limites-carregamento",
    "config-auditoria-publica",
    "config-emergencia-qr",
    "config-arquivos-storage",
    "config-obras",
    "config-relatorios-evidencias",
]);

const CHAVES_BLOCOS_CONFIGURACOES_CRITICOS = new Set([
    "config-auditoria-publica",
    "config-emergencia-qr",
    "config-modelos-email-sst",
    "config-arquivos-storage",
    "config-login-visual",
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

BLOCOS_CONFIGURACOES_TAMANHOS_PADRAO["config-modelos-email-sst"] = "destaque";

const BLOCOS_CONFIGURACOES_RECOLHIDOS_PADRAO = CHAVES_BLOCOS_CONFIGURACOES_PADRAO.reduce((acc, chave) => {
    acc[chave] = !BLOCOS_CONFIGURACOES_ABERTOS_PADRAO.has(chave);
    return acc;
}, {});

const clonarObjetoConfiguracoes = (valor = {}) => ({ ...(valor || {}) });

const criarLayoutVisualPadraoConfiguracoes = () => ({
    versao: VERSAO_LAYOUT_CONFIGURACOES_SISTEMA,
    visiveis: clonarObjetoConfiguracoes(BLOCOS_CONFIGURACOES_VISIVEIS_PADRAO),
    recolhidos: clonarObjetoConfiguracoes(BLOCOS_CONFIGURACOES_RECOLHIDOS_PADRAO),
    ordem: [...CHAVES_BLOCOS_CONFIGURACOES_PADRAO],
    tamanhos: clonarObjetoConfiguracoes(BLOCOS_CONFIGURACOES_TAMANHOS_PADRAO),
});

let layoutVisualConfiguracoesCache = null;

const salvarLayoutVisualLocalConfiguracoes = (layout) => {
    layoutVisualConfiguracoesCache = {
        versao: VERSAO_LAYOUT_CONFIGURACOES_SISTEMA,
        visiveis: clonarObjetoConfiguracoes(layout?.visiveis || BLOCOS_CONFIGURACOES_VISIVEIS_PADRAO),
        recolhidos: clonarObjetoConfiguracoes(layout?.recolhidos || BLOCOS_CONFIGURACOES_RECOLHIDOS_PADRAO),
        ordem: Array.isArray(layout?.ordem) ? [...layout.ordem] : [...CHAVES_BLOCOS_CONFIGURACOES_PADRAO],
        tamanhos: clonarObjetoConfiguracoes(layout?.tamanhos || BLOCOS_CONFIGURACOES_TAMANHOS_PADRAO),
    };

    if (typeof window === "undefined") return layoutVisualConfiguracoesCache;

    try {
        window.localStorage.setItem(CHAVE_LAYOUT_CONFIGURACOES_SISTEMA, VERSAO_LAYOUT_CONFIGURACOES_SISTEMA);
        window.localStorage.setItem(CHAVE_BLOCOS_VISIVEIS_CONFIGURACOES, JSON.stringify(layoutVisualConfiguracoesCache.visiveis));
        window.localStorage.setItem(CHAVE_BLOCOS_RECOLHIDOS_CONFIGURACOES, JSON.stringify(layoutVisualConfiguracoesCache.recolhidos));
        window.localStorage.setItem(CHAVE_ORDEM_BLOCOS_CONFIGURACOES, JSON.stringify(layoutVisualConfiguracoesCache.ordem));
        window.localStorage.setItem(CHAVE_TAMANHOS_BLOCOS_CONFIGURACOES, JSON.stringify(layoutVisualConfiguracoesCache.tamanhos));
    } catch {
        // Mantém o cache em memória quando o navegador bloquear localStorage.
    }

    return layoutVisualConfiguracoesCache;
};

const carregarJsonLocalConfiguracoes = (chave, padrao) => {
    if (typeof window === "undefined") return padrao;

    try {
        const salvo = JSON.parse(window.localStorage.getItem(chave) || "null");
        return salvo && typeof salvo === "object" ? salvo : padrao;
    } catch {
        return padrao;
    }
};

const normalizarOrdemLayoutVisualConfiguracoes = (ordem = []) => {
    if (!Array.isArray(ordem)) return [...CHAVES_BLOCOS_CONFIGURACOES_PADRAO];

    return [
        ...ordem.filter((chave) => CHAVES_BLOCOS_CONFIGURACOES_PADRAO.includes(chave)),
        ...CHAVES_BLOCOS_CONFIGURACOES_PADRAO.filter((chave) => !ordem.includes(chave)),
    ];
};

const carregarLayoutVisualLocalConfiguracoes = () => {
    if (layoutVisualConfiguracoesCache) return layoutVisualConfiguracoesCache;

    const layoutPadrao = criarLayoutVisualPadraoConfiguracoes();

    if (typeof window === "undefined") {
        layoutVisualConfiguracoesCache = layoutPadrao;
        return layoutVisualConfiguracoesCache;
    }

    try {
        const versaoAtual = window.localStorage.getItem(CHAVE_LAYOUT_CONFIGURACOES_SISTEMA);

        if (versaoAtual !== VERSAO_LAYOUT_CONFIGURACOES_SISTEMA) {
            return salvarLayoutVisualLocalConfiguracoes(layoutPadrao);
        }

        layoutVisualConfiguracoesCache = {
            versao: VERSAO_LAYOUT_CONFIGURACOES_SISTEMA,
            visiveis: {
                ...BLOCOS_CONFIGURACOES_VISIVEIS_PADRAO,
                ...carregarJsonLocalConfiguracoes(CHAVE_BLOCOS_VISIVEIS_CONFIGURACOES, BLOCOS_CONFIGURACOES_VISIVEIS_PADRAO),
            },
            recolhidos: {
                ...BLOCOS_CONFIGURACOES_RECOLHIDOS_PADRAO,
                ...carregarJsonLocalConfiguracoes(CHAVE_BLOCOS_RECOLHIDOS_CONFIGURACOES, BLOCOS_CONFIGURACOES_RECOLHIDOS_PADRAO),
            },
            ordem: normalizarOrdemLayoutVisualConfiguracoes(
                JSON.parse(window.localStorage.getItem(CHAVE_ORDEM_BLOCOS_CONFIGURACOES) || "null")
            ),
            tamanhos: {
                ...BLOCOS_CONFIGURACOES_TAMANHOS_PADRAO,
                ...carregarJsonLocalConfiguracoes(CHAVE_TAMANHOS_BLOCOS_CONFIGURACOES, BLOCOS_CONFIGURACOES_TAMANHOS_PADRAO),
            },
        };

        return layoutVisualConfiguracoesCache;
    } catch {
        layoutVisualConfiguracoesCache = layoutPadrao;
        return layoutVisualConfiguracoesCache;
    }
};

export function ConfiguracoesSistema({
    empresasBanco = [],
    usuario = null,
    podeAcessarAuditoria = false,
    permissaoSistemaUsuario = null,
    limites = {},
    onSalvarLimites,
    onRegistrarAuditoria,
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
    const [mensagemAuditoriaPublica, setMensagemAuditoriaPublica] = useState("Carregando token público pelo serviço central da auditoria pública...");
    const [carregandoAuditoriaPublica, setCarregandoAuditoriaPublica] = useState(false);
    const [origemAuditoriaPublica, setOrigemAuditoriaPublica] = useState("supabase");
    const [mensagemStorage, setMensagemStorage] = useState("Checklist de Storage pronto para conferência operacional.");
    const [mensagemSupabase, setMensagemSupabase] = useState("Checklist Supabase/RLS/RPC pronto para conferência técnica.");
    const [mensagemEvidenciasConfiguracoes, setMensagemEvidenciasConfiguracoes] = useState(
        "Gere uma evidência administrativa simples das Configurações atuais para auditoria interna."
    );

    const [arquivoFundoLogin, setArquivoFundoLogin] = useState(null);
    const [previewFundoLoginUrl, setPreviewFundoLoginUrl] = useState("");
    const [mensagemFundoLogin, setMensagemFundoLogin] = useState(
        "Fundo padrão ativo. Envie uma imagem para personalizar a tela de login."
    );
    const [salvandoFundoLogin, setSalvandoFundoLogin] = useState(false);
    const [ajusteFundoLogin, setAjusteFundoLogin] = useState(() => AJUSTE_FUNDO_LOGIN_PADRAO_CONFIGURACOES);
    const [ajusteFundoLoginAlterado, setAjusteFundoLoginAlterado] = useState(false);

    const [mostrarOrganizacaoCards, setMostrarOrganizacaoCards] = useState(false);
    const [filtroPainelConfiguracoes, setFiltroPainelConfiguracoes] = useState("todos");
    const [blocosVisiveisConfiguracoes, setBlocosVisiveisConfiguracoes] = useState(() =>
        carregarLayoutVisualLocalConfiguracoes().visiveis
    );
    const [blocosRecolhidosConfiguracoes, setBlocosRecolhidosConfiguracoes] = useState(() =>
        carregarLayoutVisualLocalConfiguracoes().recolhidos
    );
    const [ordemBlocosConfiguracoes, setOrdemBlocosConfiguracoes] = useState(() =>
        carregarLayoutVisualLocalConfiguracoes().ordem
    );
    const [tamanhosBlocosConfiguracoes, setTamanhosBlocosConfiguracoes] = useState(() =>
        carregarLayoutVisualLocalConfiguracoes().tamanhos
    );
    const [blocoArrastandoConfiguracoes, setBlocoArrastandoConfiguracoes] = useState("");

    const permissaoSistemaAtual = permissaoSistemaUsuario;
    const carregandoPermissaoSistema = false;
    const [obrasConfiguracoes, setObrasConfiguracoes] = useState([]);
    const [vinculosObrasConfiguracoes, setVinculosObrasConfiguracoes] = useState([]);
    const [carregandoObrasConfiguracoes, setCarregandoObrasConfiguracoes] = useState(false);
    const [mensagemObrasConfiguracoes, setMensagemObrasConfiguracoes] = useState("Obras ainda nao carregadas.");
    const [formObraConfiguracoes, setFormObraConfiguracoes] = useState(() => criarFormularioObraConfiguracoes(FORMULARIO_OBRA_CONFIGURACOES_INICIAL));
    const [municipiosObraConfiguracoes, setMunicipiosObraConfiguracoes] = useState([]);
    const [carregandoMunicipiosObraConfiguracoes, setCarregandoMunicipiosObraConfiguracoes] = useState(false);
    const [carregandoCepObraConfiguracoes, setCarregandoCepObraConfiguracoes] = useState(false);
    const [formularioObraAbertoConfiguracoes, setFormularioObraAbertoConfiguracoes] = useState(false);
    const [editandoObraConfiguracoesId, setEditandoObraConfiguracoesId] = useState("");
    const [salvandoObraConfiguracoes, setSalvandoObraConfiguracoes] = useState(false);
    const [excluindoObraConfiguracoesId, setExcluindoObraConfiguracoesId] = useState("");
    const [empresaVinculoObraConfiguracoesId, setEmpresaVinculoObraConfiguracoesId] = useState("");
    const [obraVinculoConfiguracoesId, setObraVinculoConfiguracoesId] = useState("");
    const [statusVinculoObraConfiguracoes, setStatusVinculoObraConfiguracoes] = useState("Ativa");
    const [salvandoVinculoObraConfiguracoes, setSalvandoVinculoObraConfiguracoes] = useState(false);

    const empresasVinculoObrasConfiguracoes = useMemo(
        () => ordenarEmpresasObrasConfiguracoes(empresasBanco),
        [empresasBanco]
    );
    const mensagemPermissaoSistema = permissaoSistemaAtual
        ? "Permissão geral carregada pelo estado central do sistema."
        : "Nenhuma permissão geral disponível para o usuário autenticado.";

    const eventosAuditoria = useMemo(() => {
        const normalizada = normalizarConfiguracaoEventosAuditoriaSistema(configEventos);
        return EVENTOS_AUDITORIA_SISTEMA_PADRAO.map((evento) => ({
            ...evento,
            habilitado: normalizada[evento.chave] !== false,
        }));
    }, [configEventos]);

    const totalEventosHabilitados = eventosAuditoria.filter((evento) => evento.habilitado).length;


    const resumoPermissaoSistemaAtual = useMemo(
        () => obterResumoPermissaoSistema(permissaoSistemaAtual),
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
        salvarLayoutVisualLocalConfiguracoes({
            visiveis: blocosVisiveisConfiguracoes,
            recolhidos: blocosRecolhidosConfiguracoes,
            ordem: normalizarOrdemLayoutVisualConfiguracoes(ordemBlocosConfiguracoes),
            tamanhos: tamanhosBlocosConfiguracoes,
        });
    }, [
        blocosRecolhidosConfiguracoes,
        blocosVisiveisConfiguracoes,
        ordemBlocosConfiguracoes,
        tamanhosBlocosConfiguracoes,
    ]);

    useEffect(() => {
        let cancelado = false;

        async function carregarFundoLoginExistente() {
            const resultado =
                await carregarFundoLoginPublicoService({
                    supabase,
                });

            if (cancelado) return;

            if (!resultado.imagemUrl) {
                setPreviewFundoLoginUrl("");
                setAjusteFundoLogin(
                    AJUSTE_FUNDO_LOGIN_PADRAO_CONFIGURACOES
                );
                setMensagemFundoLogin(
                    "Fundo padrão ativo. Envie uma imagem para personalizar a tela de login."
                );
                return;
            }

            setPreviewFundoLoginUrl(
                resultado.imagemUrl
            );
            setAjusteFundoLogin(
                normalizarAjusteFundoLoginConfiguracoes(
                    resultado.ajuste ||
                        AJUSTE_FUNDO_LOGIN_PADRAO_CONFIGURACOES
                )
            );
            setMensagemFundoLogin(
                "Fundo personalizado carregado do Storage."
            );
        }

        carregarFundoLoginExistente();

        return () => {
            cancelado = true;
        };
    }, []);

    const aplicarPreAjusteFundoLogin = (preAjuste) => {
        if (bloquearConfiguracaoCriticaSeNecessario(setMensagemFundoLogin)) return;

        setAjusteFundoLogin(normalizarAjusteFundoLoginConfiguracoes(preAjuste?.ajuste || AJUSTE_FUNDO_LOGIN_PADRAO_CONFIGURACOES));
        setAjusteFundoLoginAlterado(true);
        setMensagemFundoLogin(`Pré-ajuste aplicado: ${preAjuste?.label || "padrão"}. Clique em Salvar fundo do login para gravar.`);
    };

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

    const cliqueVeioDeControleInterativoConfiguracao = (evento) => {
        const alvo = evento?.target;

        if (!alvo || typeof alvo.closest !== "function") return false;

        const controleInterativo = alvo.closest(
            "button, input, textarea, select, option, a, label, summary, [role='button'], [role='checkbox'], [role='switch'], [contenteditable='true'], [data-nao-alternar-card='true']"
        );

        return Boolean(controleInterativo && controleInterativo !== evento.currentTarget);
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

    const registrarLogConfiguracoesSistema = async (acao, descricao, dados = {}, registroId = null) => {
        if (typeof onRegistrarAuditoria !== "function") return false;

        const dadosSeguros = {
            ...(dados || {}),
            modulo: "configuracoes",
            senhaRegistrada: false,
            tokenCompletoRegistrado: false,
        };

        try {
            return await onRegistrarAuditoria(
                acao,
                "configuracoes_sistema",
                descricao,
                registroId,
                dadosSeguros
            );
        } catch (error) {
            console.warn("Erro ao registrar log da aba Configurações:", error?.message || error);
            return false;
        }
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


    const blocoConfiguracaoVisivel = (chave) => blocosVisiveisConfiguracoes[chave] !== false;
    const blocoConfiguracaoRecolhido = (chave) => Boolean(blocosRecolhidosConfiguracoes[chave]);

    const botaoRecolherBlocoConfiguracao = (chave, extraClassName = "") => {
        const recolhido = blocoConfiguracaoRecolhido(chave);

        return (
            <button
                type="button"
                onClick={(evento) => {
                    evento.stopPropagation();
                    alternarRecolhidoBlocoConfiguracao(chave);
                }}
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

    const renderizarCabecalhoComControleBlocoConfiguracao = (cabecalho, chave) => {
        const controle = botaoRecolherBlocoConfiguracao(chave, "shrink-0");

        const alternarPeloCabecalho = (evento) => {
            if (cliqueVeioDeControleInterativoConfiguracao(evento)) return;
            alternarRecolhidoBlocoConfiguracao(chave);
        };

        const alternarPeloTecladoCabecalho = (evento) => {
            if (evento.target !== evento.currentTarget) return;

            if (evento.key === "Enter" || evento.key === " ") {
                evento.preventDefault();
                alternarRecolhidoBlocoConfiguracao(chave);
            }
        };

        if (!React.isValidElement(cabecalho)) {
            return (
                <div className="flex items-center justify-end gap-2">
                    {controle}
                </div>
            );
        }

        const filhosCabecalho = React.Children.toArray(cabecalho.props.children);
        const indiceAcoes = filhosCabecalho.length - 1;
        const acoes = filhosCabecalho[indiceAcoes];
        const classeAcoes = React.isValidElement(acoes) ? String(acoes.props.className || "") : "";
        const tipoAcoes = React.isValidElement(acoes) && typeof acoes.type === "string" ? acoes.type : "";
        const ultimoFilhoEhInterativo = ["button", "a", "input", "select", "textarea"].includes(tipoAcoes);
        const ultimoFilhoPareceAcoes =
            filhosCabecalho.length > 1 &&
            React.isValidElement(acoes) &&
            !ultimoFilhoEhInterativo &&
            classeAcoes.includes("flex");

        if (ultimoFilhoPareceAcoes) {
            return React.cloneElement(cabecalho, {
                role: "button",
                tabIndex: 0,
                onClick: alternarPeloCabecalho,
                onKeyDown: alternarPeloTecladoCabecalho,
                className: classNames(
                    cabecalho.props.className || "",
                    "rounded-xl items-start"
                ),
                children: (
                    <>
                        {filhosCabecalho.slice(0, indiceAcoes)}
                        {React.cloneElement(acoes, {
                            className: classNames(acoes.props.className || "", "items-center justify-end"),
                            children: (
                                <>
                                    {acoes.props.children}
                                    {controle}
                                </>
                            ),
                        })}
                    </>
                ),
            });
        }

        return React.cloneElement(cabecalho, {
            role: "button",
            tabIndex: 0,
            onClick: alternarPeloCabecalho,
            onKeyDown: alternarPeloTecladoCabecalho,
            className: classNames(
                cabecalho.props.className || "",
                "rounded-xl md:flex-row md:items-start md:justify-between"
            ),
            children: (
                <>
                    {cabecalho.props.children}
                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                        {controle}
                    </div>
                </>
            ),
        });
    };

    const renderizarConteudoAbertoComControleConfiguracao = (conteudo, chave) => {
        const filhosConteudo = React.Children.toArray(conteudo?.props?.children);

        if (!filhosConteudo.length) {
            return (
                <>
                    <div className="flex items-center justify-end gap-2">
                        {botaoRecolherBlocoConfiguracao(chave, "shrink-0")}
                    </div>
                    {conteudo?.props?.children}
                </>
            );
        }

        const [cabecalho, ...resto] = filhosConteudo;

        return (
            <>
                {renderizarCabecalhoComControleBlocoConfiguracao(cabecalho, chave)}
                {resto}
            </>
        );
    };

    const renderBlocoConfiguracaoComControle = (chave, titulo, descricao, conteudo) => {
        if (!blocoConfiguracaoVisivel(chave)) return null;

        if (blocoConfiguracaoRecolhido(chave)) {
            const secaoAtual = secoesConfiguracoes.find((secao) => secao.chave === chave);
            const IconeSecao = secaoAtual?.icon || Settings;

            return (
                <div
                    className="configuracoes-card-recolhido-wrapper h-full"
                    data-configuracoes-chave={chave}
                >
                    <Card className="configuracoes-card-recolhido h-full">
                        <div
                            role="button"
                            tabIndex={0}
                            aria-label={`Abrir ${titulo}`}
                            onClick={(evento) => {
                                if (cliqueVeioDeControleInterativoConfiguracao(evento)) return;
                                alternarRecolhidoBlocoConfiguracao(chave);
                            }}
                            onKeyDown={(evento) => {
                                if (evento.target !== evento.currentTarget) return;

                                if (evento.key === "Enter" || evento.key === " ") {
                                    evento.preventDefault();
                                    alternarRecolhidoBlocoConfiguracao(chave);
                                }
                            }}
                            className="configuracoes-card-recolhido__conteudo flex min-w-0 items-center justify-between gap-4"
                        >
                            <div className="configuracoes-card-recolhido__principal flex min-w-0 items-center gap-4">
                                <span className="configuracoes-card-recolhido__icone flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl">
                                    <IconeSecao className="h-5 w-5" />
                                </span>

                                <div className="min-w-0">
                                    <h2 className="truncate text-lg font-black leading-tight text-slate-950">
                                        {titulo}
                                    </h2>
                                    <p className="mt-1 line-clamp-1 text-sm leading-relaxed text-slate-500">
                                        {descricao}
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={(evento) => {
                                    evento.stopPropagation();
                                    alternarRecolhidoBlocoConfiguracao(chave);
                                }}
                                className="configuracoes-card-recolhido__botao inline-flex shrink-0 items-center justify-center gap-2 rounded-full"
                            >
                                <ChevronDown className="h-4 w-4" />
                                Abrir
                            </button>
                        </div>
                    </Card>
                </div>
            );
        }

        if (React.isValidElement(conteudo)) {
            return (
                <div className="h-full">
                    {React.cloneElement(conteudo, {
                        className: classNames(conteudo.props.className || "", "h-full"),
                        children: renderizarConteudoAbertoComControleConfiguracao(conteudo, chave),
                    })}
                </div>
            );
        }

        return (
            <div className="h-full">
                <Card className="h-full">
                    <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 md:flex-row md:items-start md:justify-between">
                        <div>
                            <h2 className="text-lg font-black text-slate-950">{titulo}</h2>
                            <p className="mt-1 text-sm text-slate-500">{descricao}</p>
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                            {botaoRecolherBlocoConfiguracao(chave, "shrink-0")}
                        </div>
                    </div>
                    <div className="mt-4">
                        {conteudo}
                    </div>
                </Card>
            </div>
        );
    };

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setLimitesEditaveis(normalizarLimitesCarregamentoSistema(limites));
        }, 0);

        return () => window.clearTimeout(timer);
    }, [limites]);


    const alterarLimite = (chave, valor) => {
        setLimitesEditaveis((atual) => ({
            ...atual,
            [chave]: valor,
        }));
    };

    const salvarLimites = async () => {
        if (bloquearConfiguracaoCriticaSeNecessario(setMensagemLimites)) return;

        const normalizados = normalizarLimitesCarregamentoSistema(limitesEditaveis);

        if (typeof onSalvarLimites === "function") {
            const retorno = onSalvarLimites(normalizados, { tipo: "alteracao" });
            setLimitesEditaveis(normalizarLimitesCarregamentoSistema(retorno || normalizados));
        } else {
            setLimitesEditaveis(normalizados);
        }

        setMensagemLimites("Limites e armazenamento salvos localmente. Use Atualizar configurações ou reabra a tela para aplicar a nova carga.");

        await registrarLogConfiguracoesSistema(
            "LIMITE_CARREGAMENTO_ALTERADO",
            "Alterou os limites e o armazenamento administrativo da aba Configurações.",
            {
                tipo: "alteracao",
                limites: normalizados,
                senhaRegistrada: false,
                tokenCompletoRegistrado: false,
            },
            "limites_carregamento"
        );
    };

    const restaurarLimites = async () => {
        if (!confirmarAcaoCriticaConfiguracoes(
            "Restaurar os limites padrão de carregamento e o limite administrativo de Storage? Isso pode alterar a quantidade de registros carregados nas telas e o percentual visual de armazenamento.",
            setMensagemLimites,
            "Restauração dos limites cancelada."
        )) return;

        const padrao = normalizarLimitesCarregamentoSistema(LIMITES_CARREGAMENTO_SISTEMA);

        if (typeof onSalvarLimites === "function") {
            onSalvarLimites(padrao, { tipo: "restauracao" });
        }

        setLimitesEditaveis(padrao);
        setMensagemLimites("Limites e armazenamento padrão restaurados.");

        await registrarLogConfiguracoesSistema(
            "LIMITE_CARREGAMENTO_ALTERADO",
            "Restaurou os limites e o armazenamento administrativo padrão da aba Configurações.",
            {
                tipo: "restauracao",
                limites: padrao,
                senhaRegistrada: false,
                tokenCompletoRegistrado: false,
            },
            "limites_carregamento"
        );
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

    const salvarConfigAuditoriaPublica = async () => {
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
        setMensagemAuditoriaPublica("Senha de referência operacional salva localmente. O token público continua centralizado no serviço da auditoria pública.");

        await registrarLogConfiguracoesSistema(
            "CONFIGURACAO_AUDITORIA_PUBLICA_ALTERADA",
            "Alterou a configuração operacional da Auditoria pública na aba Configurações.",
            {
                exigirSenha: Boolean(normalizada.exigirSenha),
                senhaReferenciaDocumentada: Boolean(normalizada.senhaReferencia),
                tokenPublicoAtivo: Boolean(configAuditoriaPublica.tokenPublico),
                senhaRegistrada: false,
                tokenCompletoRegistrado: false,
            },
            "auditoria_publica"
        );
    };

    const restaurarConfigAuditoriaPublica = async () => {
        if (!confirmarAcaoCriticaConfiguracoes(
            "Restaurar a configuração padrão da Auditoria pública? O token será recarregado pelo serviço central e a referência operacional será redefinida.",
            setMensagemAuditoriaPublica,
            "Restauração da Auditoria pública cancelada."
        )) return;

        restaurarConfiguracaoAuditoriaPublicaPadrao();
        await carregarConfiguracaoAuditoriaPublicaSupabase();

        await registrarLogConfiguracoesSistema(
            "CONFIGURACAO_RESTAURADA",
            "Restaurou a configuração operacional da Auditoria pública.",
            {
                tipo: "auditoria_publica",
                tokenRecarregadoServicoCentral: true,
                senhaRegistrada: false,
                tokenCompletoRegistrado: false,
            },
            "auditoria_publica"
        );
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
            "1. PERMISSÃO TÉCNICA ATUAL",
            `- Perfil carregado: ${resumoPermissaoSistemaAtual.perfil}`,
            `- Status: ${resumoPermissaoSistemaAtual.status}`,
            `- Acesso global: ${resumoPermissaoSistemaAtual.acessoGlobal ? "sim" : "não"}`,
            `- Pode excluir registros: ${resumoAcoesCriticasSistemaAtual.podeExcluir ? "sim" : "não"}`,
            `- Pode limpar arquivos: ${resumoAcoesCriticasSistemaAtual.podeLimparArquivos ? "sim" : "não"}`,
            `- Pode alterar configurações críticas: ${resumoAcoesCriticasSistemaAtual.podeAlterarConfiguracoesCriticas ? "sim" : "não"}`,
            "",
            "2. LIMITES E ARMAZENAMENTO",
            ...limitesTexto,
            "",
            "3. AUDITORIA DO SISTEMA",
            `- Eventos habilitados: ${totalEventosHabilitados}/${eventosAuditoria.length}`,
            `- Origem da configuração: ${origemConfig === "supabase" ? "Supabase" : "Local"}`,
            `- Eventos em modo de salvamento: ${salvandoConfig ? "sim" : "não"}`,
            "",
            "4. AUDITORIA PÚBLICA / TOKENS E QR CODE",
            `- Origem do token ativo: ${origemAuditoriaPublica || "não informada"}`,
            `- Token público: ${configAuditoriaPublica.tokenPublico ? "configurado" : "não configurado"}`,
            `- Exigir senha: ${configAuditoriaPublica.exigirSenha ? "sim" : "não"}`,
            `- Permitir nova auditoria: ${configAuditoriaPublica.permitirNovaAuditoria ? "sim" : "não"}`,
            `- QR colaborador: usa token_qr próprio do colaborador; consulta pública não exige login`,
            `- QR de Campo / Máquina / Equipamento: usa auditoria_campo_qrcodes e token público ativo; não existe token_maquina/token_equipamento separado`,
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
            `- Pode alterar configurações críticas: ${resumoAcoesCriticasSistemaAtual.podeAlterarConfiguracoesCriticas ? "sim" : "não"}`,
            "",
            "7. CONTROLE DE ACESSO ÀS CONFIGURAÇÕES",
            "- Proteção: autenticação do app e permissões do módulo Configurações",
            "- Senha secundária no navegador: removida",
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



    const carregarObrasConfiguracoes = async () => {
        setCarregandoObrasConfiguracoes(true);
        setMensagemObrasConfiguracoes("Carregando obras e vinculos...");

        try {
            const [obras, vinculos] = await Promise.all([
                listarObras(),
                listarVinculosEmpresasObras(),
            ]);

            setObrasConfiguracoes(obras);
            setVinculosObrasConfiguracoes(vinculos);
            setMensagemObrasConfiguracoes(`${obras.length} obra(s) e ${vinculos.length} vinculo(s) carregado(s).`);
        } catch (erro) {
            console.error("Erro ao carregar obras nas Configuracoes:", erro);
            setObrasConfiguracoes([]);
            setVinculosObrasConfiguracoes([]);
            setMensagemObrasConfiguracoes(`Nao foi possivel carregar as obras. Supabase: ${erro?.message || "erro nao identificado"}`);
        } finally {
            setCarregandoObrasConfiguracoes(false);
        }
    };

    const iniciarNovaObraConfiguracoes = () => {
        setEditandoObraConfiguracoesId("");
        setFormObraConfiguracoes(criarFormularioObraConfiguracoes(FORMULARIO_OBRA_CONFIGURACOES_INICIAL));
        setFormularioObraAbertoConfiguracoes(true);
        setMunicipiosObraConfiguracoes([]);
        setMensagemObrasConfiguracoes("Preencha os dados da nova obra.");
    };

    const editarObraConfiguracoes = (obra = {}) => {
        setEditandoObraConfiguracoesId(obra.id || "");
        setFormObraConfiguracoes(criarFormularioObraConfiguracoes(obra));
        setFormularioObraAbertoConfiguracoes(true);
        if (obra.uf) carregarMunicipiosObraConfiguracoes(obra.uf);
        setMensagemObrasConfiguracoes(`Editando obra: ${obra.nome || "obra sem nome"}.`);
    };

    const cancelarEdicaoObraConfiguracoes = () => {
        setEditandoObraConfiguracoesId("");
        setFormObraConfiguracoes(criarFormularioObraConfiguracoes(FORMULARIO_OBRA_CONFIGURACOES_INICIAL));
        setFormularioObraAbertoConfiguracoes(false);
        setMensagemObrasConfiguracoes("Edicao de obra cancelada.");
    };

    const atualizarCampoObraConfiguracoes = (campo, valor) => {
        setFormObraConfiguracoes((atual) => ({
            ...atual,
            [campo]: valor,
        }));
    };

    const carregarMunicipiosObraConfiguracoes = async (ufInformada = "") => {
        const uf = String(ufInformada || "").trim().toUpperCase().slice(0, 2);

        if (!uf) {
            setMunicipiosObraConfiguracoes([]);
            return [];
        }

        setCarregandoMunicipiosObraConfiguracoes(true);

        try {
            const resposta = await fetch("https://servicodados.ibge.gov.br/api/v1/localidades/estados/" + encodeURIComponent(uf) + "/municipios?orderBy=nome");

            if (!resposta.ok) throw new Error("HTTP " + resposta.status);

            const dados = await resposta.json();
            const municipios = Array.isArray(dados)
                ? dados.map((item) => ({
                    id: item.id,
                    nome: String(item.nome || "").trim(),
                })).filter((item) => item.nome)
                : [];

            setMunicipiosObraConfiguracoes(municipios);

            return municipios;
        } catch (erro) {
            console.error("Erro ao carregar municípios do IBGE:", erro);
            setMunicipiosObraConfiguracoes([]);
            setMensagemObrasConfiguracoes("Não foi possível carregar os municípios pelo IBGE. Cidade permanece com digitação manual.");
            return [];
        } finally {
            setCarregandoMunicipiosObraConfiguracoes(false);
        }
    };

    const atualizarUfObraConfiguracoes = (valor) => {
        const uf = String(valor || "").trim().toUpperCase().slice(0, 2);

        setFormObraConfiguracoes((atual) => ({
            ...atual,
            uf,
            cidade: atual.uf === uf ? atual.cidade : "",
        }));

        carregarMunicipiosObraConfiguracoes(uf);
    };

    const atualizarCepObraConfiguracoes = (valor) => {
        atualizarCampoObraConfiguracoes("cep", formatarCepObraConfiguracoes(valor));
    };

    const consultarCepObraConfiguracoes = async () => {
        const cep = String(formObraConfiguracoes.cep || "").replace(/\D/g, "").slice(0, 8);

        if (!cep) return;

        if (cep.length !== 8) {
            setMensagemObrasConfiguracoes("Informe um CEP com 8 dígitos para buscar o endereço.");
            return;
        }

        setCarregandoCepObraConfiguracoes(true);
        setMensagemObrasConfiguracoes("Consultando CEP...");

        try {
            const resposta = await fetch("https://viacep.com.br/ws/" + cep + "/json/");

            if (!resposta.ok) throw new Error("HTTP " + resposta.status);

            const dados = await resposta.json();

            if (dados?.erro) {
                setMensagemObrasConfiguracoes("CEP não localizado na base pública.");
                return;
            }

            const uf = String(dados.uf || "").trim().toUpperCase().slice(0, 2);
            const cidade = String(dados.localidade || "").trim();
            const endereco = [dados.logradouro, dados.bairro].filter(Boolean).join(" - ");

            setFormObraConfiguracoes((atual) => ({
                ...atual,
                cep: formatarCepObraConfiguracoes(cep),
                uf: uf || atual.uf,
                cidade: cidade || atual.cidade,
                endereco: endereco || atual.endereco,
            }));

            if (uf) await carregarMunicipiosObraConfiguracoes(uf);

            setMensagemObrasConfiguracoes("CEP localizado. Confira cidade, UF e endereço antes de salvar.");
        } catch (erro) {
            console.error("Erro ao consultar CEP:", erro);
            setMensagemObrasConfiguracoes("Não foi possível consultar o CEP. Preencha cidade, UF e endereço manualmente.");
        } finally {
            setCarregandoCepObraConfiguracoes(false);
        }
    };

    const salvarObraConfiguracoes = async (evento) => {
        evento?.preventDefault?.();

        const payload = {
            ...formObraConfiguracoes,
            nome: String(formObraConfiguracoes.nome || "").trim(),
            cep: String(formObraConfiguracoes.cep || "").replace(/\D/g, "").slice(0, 8),
            numeroObra: String(formObraConfiguracoes.numeroObra || "").trim(),
            cidade: String(formObraConfiguracoes.cidade || "").trim(),
            uf: String(formObraConfiguracoes.uf || "").trim().toUpperCase(),
            endereco: String(formObraConfiguracoes.endereco || "").trim(),
            numeroEndereco: String(formObraConfiguracoes.numeroEndereco || "").trim(),
            fiscalIdealiza: String(formObraConfiguracoes.fiscalIdealiza || "").trim(),
            tecnicoSegurancaIdealiza: String(formObraConfiguracoes.tecnicoSegurancaIdealiza || "").trim(),
            liderEncarregado: String(formObraConfiguracoes.liderEncarregado || "").trim(),
            status: formObraConfiguracoes.status === "Inativa" ? "Inativa" : "Ativa",
            observacoes: String(formObraConfiguracoes.observacoes || "").trim(),
        };

        if (!payload.nome) {
            setMensagemObrasConfiguracoes("Informe o nome da obra antes de salvar.");
            return;
        }

        setSalvandoObraConfiguracoes(true);
        setMensagemObrasConfiguracoes(editandoObraConfiguracoesId ? "Atualizando obra..." : "Cadastrando obra...");

        try {
            if (editandoObraConfiguracoesId) {
                await atualizarObra({
                    ...payload,
                    id: editandoObraConfiguracoesId,
                });
            } else {
                await adicionarObra(payload);
            }

            setEditandoObraConfiguracoesId("");
            setFormObraConfiguracoes(criarFormularioObraConfiguracoes(FORMULARIO_OBRA_CONFIGURACOES_INICIAL));
            setFormularioObraAbertoConfiguracoes(false);

            await carregarObrasConfiguracoes();

            setTimeout(() => {
                document.getElementById("config-obras")?.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 0);

            setMensagemObrasConfiguracoes(editandoObraConfiguracoesId ? "Obra atualizada com sucesso." : "Obra cadastrada com sucesso.");
        } catch (erro) {
            console.error("Erro ao salvar obra nas Configuracoes:", erro);
            setMensagemObrasConfiguracoes(`Nao foi possivel salvar a obra. Supabase: ${erro?.message || "erro nao identificado"}`);
        } finally {
            setSalvandoObraConfiguracoes(false);
        }
    };

    const excluirObraConfiguracoes = async (obra = {}) => {
        const obraId = String(obra?.id || "").trim();

        if (!obraId) {
            setMensagemObrasConfiguracoes(
                "Não foi possível identificar a obra para exclusão."
            );
            return;
        }

        const vinculosDaObra = vinculosObrasConfiguracoes.filter((vinculo) =>
            String(vinculo?.obraId || vinculo?.obra?.id || "") === obraId
        );

        if (vinculosDaObra.length > 0) {
            setMensagemObrasConfiguracoes(
                "Exclusão bloqueada: remova primeiro os vínculos empresa/obra desta obra."
            );
            return;
        }

        setExcluindoObraConfiguracoesId(obraId);
        setMensagemObrasConfiguracoes(
            "Verificando registros históricos da obra..."
        );

        try {
            const { count, error } = await supabase
                .from("dds_registros")
                .select("id", { count: "exact", head: true })
                .eq("obra_id", obraId);

            if (error) throw error;

            if (Number(count || 0) > 0) {
                setMensagemObrasConfiguracoes(
                    "Exclusão bloqueada: esta obra possui DDS histórico. Altere o status para Inativa para preservar os registros."
                );
                return;
            }

            const confirmar = window.confirm(
                `Excluir definitivamente a obra "${obra?.nome || "obra sem nome"}"? Esta ação não poderá ser desfeita.`
            );

            if (!confirmar) {
                setMensagemObrasConfiguracoes(
                    "Exclusão da obra cancelada."
                );
                return;
            }

            await excluirObra(obraId);

            if (editandoObraConfiguracoesId === obraId) {
                setEditandoObraConfiguracoesId("");
                setFormObraConfiguracoes(
                    criarFormularioObraConfiguracoes(
                        FORMULARIO_OBRA_CONFIGURACOES_INICIAL
                    )
                );
                setFormularioObraAbertoConfiguracoes(false);
            }

            await carregarObrasConfiguracoes();

            setMensagemObrasConfiguracoes(
                "Obra excluída com sucesso."
            );
        } catch (erro) {
            console.error(
                "Erro ao excluir obra nas Configurações:",
                erro
            );

            setMensagemObrasConfiguracoes(
                `Não foi possível excluir a obra. Supabase: ${erro?.message || "erro não identificado"}`
            );
        } finally {
            setExcluindoObraConfiguracoesId("");
        }
    };

    const salvarVinculoObraConfiguracoes = async (evento) => {
        evento?.preventDefault?.();

        if (!empresaVinculoObraConfiguracoesId) {
            setMensagemObrasConfiguracoes("Selecione a empresa para criar o vinculo.");
            return;
        }

        if (!obraVinculoConfiguracoesId) {
            setMensagemObrasConfiguracoes("Selecione a obra para criar o vinculo.");
            return;
        }

        const vinculoExistente = vinculosObrasConfiguracoes.find((vinculo) =>
            vinculo.empresaId === empresaVinculoObraConfiguracoesId &&
            vinculo.obraId === obraVinculoConfiguracoesId
        );

        setSalvandoVinculoObraConfiguracoes(true);
        setMensagemObrasConfiguracoes(vinculoExistente ? "Atualizando vinculo existente..." : "Criando vinculo empresa/obra...");

        try {
            if (vinculoExistente?.id) {
                await atualizarVinculoEmpresaObra({
                    id: vinculoExistente.id,
                    status: statusVinculoObraConfiguracoes,
                });
            } else {
                await vincularEmpresaObra(
                    empresaVinculoObraConfiguracoesId,
                    obraVinculoConfiguracoesId,
                    { status: statusVinculoObraConfiguracoes }
                );
            }

            await carregarObrasConfiguracoes();
            setMensagemObrasConfiguracoes(vinculoExistente ? "Vinculo atualizado com sucesso." : "Vinculo criado com sucesso.");
        } catch (erro) {
            console.error("Erro ao salvar vinculo empresa/obra:", erro);
            setMensagemObrasConfiguracoes(`Nao foi possivel salvar o vinculo. Supabase: ${erro?.message || "erro nao identificado"}`);
        } finally {
            setSalvandoVinculoObraConfiguracoes(false);
        }
    };

    const alternarStatusVinculoObraConfiguracoes = async (vinculo = {}) => {
        if (!vinculo.id) return;

        const proximoStatus = vinculo.status === "Inativa" ? "Ativa" : "Inativa";

        setSalvandoVinculoObraConfiguracoes(true);
        setMensagemObrasConfiguracoes(`Atualizando vinculo para ${proximoStatus}...`);

        try {
            await atualizarVinculoEmpresaObra({
                id: vinculo.id,
                status: proximoStatus,
            });

            await carregarObrasConfiguracoes();
            setMensagemObrasConfiguracoes(`Vinculo marcado como ${proximoStatus}.`);
        } catch (erro) {
            console.error("Erro ao atualizar status do vinculo:", erro);
            setMensagemObrasConfiguracoes(`Nao foi possivel atualizar o vinculo. Supabase: ${erro?.message || "erro nao identificado"}`);
        } finally {
            setSalvandoVinculoObraConfiguracoes(false);
        }
    };

    const removerVinculoObraConfiguracoes = async (vinculo = {}) => {
        if (!vinculo.id) return;

        const confirmar = window.confirm("Remover este vinculo empresa/obra?");
        if (!confirmar) return;

        setSalvandoVinculoObraConfiguracoes(true);
        setMensagemObrasConfiguracoes("Removendo vinculo empresa/obra...");

        try {
            await excluirVinculoEmpresaObra(vinculo.id);
            await carregarObrasConfiguracoes();
            setMensagemObrasConfiguracoes("Vinculo removido com sucesso.");
        } catch (erro) {
            console.error("Erro ao remover vinculo empresa/obra:", erro);
            setMensagemObrasConfiguracoes(`Nao foi possivel remover o vinculo. Supabase: ${erro?.message || "erro nao identificado"}`);
        } finally {
            setSalvandoVinculoObraConfiguracoes(false);
        }
    };
    useEffect(() => {
        const timer = window.setTimeout(() => {
            carregarObrasConfiguracoes();
        }, 0);

        return () => window.clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (!empresaVinculoObraConfiguracoesId && empresasVinculoObrasConfiguracoes.length > 0) {
            setEmpresaVinculoObraConfiguracoesId(obterIdEmpresaObrasConfiguracoes(empresasVinculoObrasConfiguracoes[0]));
        }
    }, [empresaVinculoObraConfiguracoesId, empresasVinculoObrasConfiguracoes]);

    useEffect(() => {
        if (!obraVinculoConfiguracoesId && obrasConfiguracoes.length > 0) {
            const primeiraObraAtiva = obrasConfiguracoes.find((obra) => obra.status !== "Inativa") || obrasConfiguracoes[0];
            setObraVinculoConfiguracoesId(primeiraObraAtiva?.id || "");
        }
    }, [obraVinculoConfiguracoesId, obrasConfiguracoes]);
    const carregarConfiguracaoAuditoriaPublicaSupabase = async () => {
        setCarregandoAuditoriaPublica(true);
        setMensagemAuditoriaPublica("Carregando token público ativo pelo serviço central da auditoria pública...");

        try {
            const configuracaoLocal = carregarConfiguracaoAuditoriaPublicaSistema();
            const resultado = await carregarTokenAuditoriaPublicaAtivoPadrao();

            setOrigemAuditoriaPublica(resultado?.origem || "servico-token");

            if (resultado?.tokenPublico) {
                setConfigAuditoriaPublica({
                    ...configuracaoLocal,
                    tokenPublico: resultado.tokenPublico,
                    exigirSenha: resultado.requerSenha !== false,
                });
                setMensagemAuditoriaPublica("Token público ativo carregado pelo serviço central. Prioridade: RPC obter_token_auditoria_publica_ativo, com fallback seguro na tabela auditoria_tokens_publicos.");
                return;
            }

            setConfigAuditoriaPublica({
                ...configuracaoLocal,
                tokenPublico: "",
            });
            setMensagemAuditoriaPublica(resultado?.erro || "Nenhum token público ativo foi encontrado pelo serviço central da auditoria pública.");
        } finally {
            setCarregandoAuditoriaPublica(false);
        }
    };

    const atualizarPreviewFundoLoginConfiguracoes = (versao = Date.now()) => {
        const versaoTexto = String(versao || Date.now());

        if (typeof window !== "undefined") {
            try {
                window.localStorage.setItem(CHAVE_VERSAO_FUNDO_LOGIN_CONFIGURACOES, versaoTexto);
            } catch {
                // Mantém apenas o estado em memória quando o navegador bloquear localStorage.
            }
        }

        setPreviewFundoLoginUrl(montarUrlFundoLoginConfiguracoes(versaoTexto));
    };

    const selecionarArquivoFundoLogin = (arquivo) => {
        setArquivoFundoLogin(arquivo || null);

        if (arquivo) {
            setMensagemFundoLogin(`Imagem selecionada: ${arquivo.name}. Escolha um pré-ajuste, se necessário, e clique em Salvar fundo do login.`);
        } else {
            setMensagemFundoLogin("Nenhuma imagem selecionada.");
        }
    };

    const salvarFundoLoginPersonalizado = async (evento) => {
        evento?.preventDefault?.();

        if (bloquearConfiguracaoCriticaSeNecessario(setMensagemFundoLogin)) return;

        if (!arquivoFundoLogin && !ajusteFundoLoginAlterado) {
            setMensagemFundoLogin("Selecione uma imagem ou aplique um pré-ajuste antes de salvar.");
            return;
        }

        if (arquivoFundoLogin && !String(arquivoFundoLogin.type || "").startsWith("image/")) {
            setMensagemFundoLogin("Arquivo inválido. Selecione uma imagem JPG, PNG ou WEBP.");
            return;
        }

        if (!confirmarAcaoCriticaConfiguracoes(
            arquivoFundoLogin
                ? "Substituir a imagem e salvar o pré-ajuste do fundo da tela de login?"
                : "Salvar o pré-ajuste da imagem de fundo da tela de login?",
            setMensagemFundoLogin
        )) {
            return;
        }

        setSalvandoFundoLogin(true);
        setMensagemFundoLogin(arquivoFundoLogin
            ? "Otimizando imagem no Storage e salvando pré-ajuste no banco..."
            : "Salvando pré-ajuste da imagem de fundo no banco..."
        );

        let imagemAtualizada = false;

        try {
            if (arquivoFundoLogin) {
                const imagemOtimizada = await reduzirFotoParaAuditoria(arquivoFundoLogin, {
                    maxLado: 2200,
                    alvoBytes: 950 * 1024,
                    qualidadeInicial: 0.86,
                    qualidadeMinima: 0.58,
                    tipoSaida: "image/jpeg",
                    forcarReducao: true,
                });

                const { error } = await supabase.storage
                    .from(BUCKET_FUNDO_LOGIN_CONFIGURACOES)
                    .upload(CAMINHO_FUNDO_LOGIN_CONFIGURACOES, imagemOtimizada, {
                        upsert: true,
                        cacheControl: "60",
                        contentType: imagemOtimizada.type || "image/jpeg",
                    });

                if (error) {
                    throw error;
                }

                imagemAtualizada = true;
            }

            const ajusteFinal = normalizarAjusteFundoLoginConfiguracoes(ajusteFundoLogin);
            const resultadoAjuste = await salvarAjusteFundoLoginService({
                supabase,
                ajuste: ajusteFinal,
            });

            atualizarPreviewFundoLoginConfiguracoes(
                resultadoAjuste?.versao || Date.now()
            );
            setAjusteFundoLogin(
                normalizarAjusteFundoLoginConfiguracoes(
                    resultadoAjuste?.ajuste || ajusteFinal
                )
            );
            setArquivoFundoLogin(null);
            setAjusteFundoLoginAlterado(false);
            setMensagemFundoLogin("Fundo do login atualizado. A imagem permanece no Storage e o pré-ajuste foi salvo no banco.");

            await registrarLogConfiguracoesSistema(
                "CONFIGURACAO_RESTAURADA",
                "Imagem de fundo da tela de login atualizada nas Configurações.",
                {
                    tipo: "aparencia_login",
                    bucket: BUCKET_FUNDO_LOGIN_CONFIGURACOES,
                    caminho: CAMINHO_FUNDO_LOGIN_CONFIGURACOES,
                    imagemPublica: true,
                    configuracaoBanco: true,
                    ajuste: ajusteFinal,
                },
                "aparencia-login"
            );
        } catch (error) {
            const detalhe = error?.message || "Não foi possível salvar a imagem de fundo do login.";
            setMensagemFundoLogin(
                imagemAtualizada
                    ? `A imagem foi salva, mas o pré-ajuste não foi gravado no banco: ${detalhe}`
                    : detalhe
            );
        } finally {
            setSalvandoFundoLogin(false);
        }
    };

    const removerFundoLoginPersonalizado = async () => {
        if (bloquearConfiguracaoCriticaSeNecessario(setMensagemFundoLogin)) return;

        if (!confirmarAcaoCriticaConfiguracoes(
            "Remover a imagem personalizada e voltar ao fundo azul padrão do login?",
            setMensagemFundoLogin
        )) {
            return;
        }

        setSalvandoFundoLogin(true);
        setMensagemFundoLogin("Restaurando o pré-ajuste e removendo a imagem personalizada...");

        try {
            await restaurarAjusteFundoLoginService({ supabase });

            const { error } = await supabase.storage
                .from(BUCKET_FUNDO_LOGIN_CONFIGURACOES)
                .remove([CAMINHO_FUNDO_LOGIN_CONFIGURACOES]);

            if (error) {
                throw error;
            }

            if (typeof window !== "undefined") {
                try {
                    window.localStorage.removeItem(CHAVE_VERSAO_FUNDO_LOGIN_CONFIGURACOES);
                } catch {
                    // Sem ação quando o navegador bloquear localStorage.
                }
            }

            setArquivoFundoLogin(null);
            setPreviewFundoLoginUrl("");
            setAjusteFundoLogin(AJUSTE_FUNDO_LOGIN_PADRAO_CONFIGURACOES);
            setAjusteFundoLoginAlterado(false);
            setMensagemFundoLogin("Imagem personalizada removida e pré-ajuste padrão restaurado no banco. O login voltará a usar o fundo azul padrão.");

            await registrarLogConfiguracoesSistema(
                "CONFIGURACAO_RESTAURADA",
                "Imagem de fundo da tela de login removida nas Configurações.",
                {
                    tipo: "aparencia_login",
                    bucket: BUCKET_FUNDO_LOGIN_CONFIGURACOES,
                    caminho: CAMINHO_FUNDO_LOGIN_CONFIGURACOES,
                    configuracaoBanco: true,
                    restauradoPadrao: true,
                },
                "aparencia-login"
            );
        } catch (error) {
            setMensagemFundoLogin(error?.message || "Não foi possível remover a imagem de fundo do login.");
        } finally {
            setSalvandoFundoLogin(false);
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


    const persistirConfiguracao = async (proximaConfiguracao, mensagemSucesso = "Configuração salva.", metadadosLog = {}) => {
        if (bloquearConfiguracaoCriticaSeNecessario(setMensagemConfig)) return;

        const normalizada = normalizarConfiguracaoEventosAuditoriaSistema(proximaConfiguracao);
        const totalEventos = EVENTOS_AUDITORIA_SISTEMA_PADRAO.length;
        const totalHabilitados = EVENTOS_AUDITORIA_SISTEMA_PADRAO.filter((evento) => normalizada[evento.chave] !== false).length;

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

            await registrarLogConfiguracoesSistema(
                "CONFIGURACAO_EVENTOS_AUDITORIA_ALTERADA",
                metadadosLog?.tipo === "restauracao"
                    ? "Restaurou a configuração padrão dos eventos da Auditoria do Sistema."
                    : "Alterou a configuração dos eventos da Auditoria do Sistema.",
                {
                    tipo: metadadosLog?.tipo || "alteracao",
                    eventoAlterado: metadadosLog?.eventoAlterado || null,
                    totalEventos,
                    totalHabilitados,
                    origem: resultado.origem || "local",
                    sincronizadoSupabase: Boolean(resultado.ok),
                    erroSupabase: resultado.ok ? "" : (resultado.erro || ""),
                    senhaRegistrada: false,
                    tokenCompletoRegistrado: false,
                },
                "eventos_auditoria_sistema"
            );
        } finally {
            setSalvandoConfig(false);
        }
    };

    const alternarEvento = (chave) => {
        const proxima = {
            ...configEventos,
            [chave]: configEventos[chave] === false,
        };

        persistirConfiguracao(proxima, "Evento atualizado.", {
            tipo: "alteracao",
            eventoAlterado: chave,
        });
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
            habilitado ? "Todos os eventos foram habilitados." : "Todos os eventos foram desabilitados.",
            {
                tipo: habilitado ? "habilitacao_em_massa" : "desabilitacao_em_massa",
            }
        );
    };

    const restaurarPadrao = () => {
        if (!confirmarAcaoCriticaConfiguracoes(
            "Restaurar o padrão de eventos da Auditoria do Sistema? As opções locais serão substituídas pelo padrão seguro.",
            setMensagemConfig,
            "Restauração dos eventos padrão cancelada."
        )) return;

        persistirConfiguracao(configuracaoPadraoEventosAuditoriaSistema(), "Configuração padrão restaurada.", {
            tipo: "restauracao",
        });
    };

    const totalObrasAtivasConfiguracoes = obrasConfiguracoes.filter((obra) => obra.status !== "Inativa").length;
    const totalVinculosObrasAtivosConfiguracoes = vinculosObrasConfiguracoes.filter((vinculo) => vinculo.status !== "Inativa").length;

    const cardsResumo = [
        {
            label: "Eventos habilitados",
            valor: `${totalEventosHabilitados}/${eventosAuditoria.length}`,
            detalhe: "Auditoria de sistema",
            icon: ShieldCheck,
        },
        {
            label: "Origem da configuração",
            valor: origemConfig === "supabase" ? "Supabase" : "Local",
            detalhe: origemConfig === "supabase" ? "Sincronizada no banco" : "Configuração local",
            icon: Database,
        },
        {
            label: "Limites",
            valor: `${limitesEditaveis.auditoriaSistema || 300} / ${limitesEditaveis.auditoriasCampo || 500}`,
            detalhe: "sistema / campo",
            icon: SlidersHorizontal,
        },
        {
            label: "Permissão técnica",
            valor: permissaoSistemaAtual ? formatarPerfilPermissaoSistema(resumoPermissaoSistemaAtual.perfil) : "Não carregada",
            detalhe: permissaoSistemaAtual
                ? `${resumoPermissaoSistemaAtual.status} · ${resumoPermissaoSistemaAtual.acessoGlobal ? "acesso global" : "sem acesso global"}`
                : "ações críticas bloqueadas",
            icon: ShieldCheck,
        },
        {
            label: "Alertas técnicos",
            valor: resumoRevisaoSupabase.texto,
            detalhe: "Conferências pendentes de segurança",
            icon: ShieldAlert,
        },
    ];

    const secoesConfiguracoes = [
        { chave: "config-versao-sistema", titulo: "Versão do sistema", descricao: "Versões atuais do site e do APK e data do último build.", icon: Settings },
        { chave: "config-limites-carregamento", titulo: "Limites e armazenamento", descricao: "Registros por carga e limite administrativo do Storage.", icon: SlidersHorizontal },
        { chave: "config-auditoria-publica", titulo: "Auditoria pública, tokens e QR", descricao: "Token ativo, QR colaborador e QR de campo.", icon: KeyRound },
        { chave: "config-emergencia-qr", titulo: "Senha/PIN de emergência QR", descricao: "Proteção do contato de emergência por empresa.", icon: KeyRound },
        { chave: "config-modelos-email-sst", titulo: "Modelos de e-mail SST", descricao: "Assunto, conteúdo, remetente, variáveis e ativação dos alertas.", icon: Settings },
        { chave: "config-arquivos-storage", titulo: "Arquivos salvos no Storage", descricao: "Capacidade, vínculos, filtros e limpeza protegida.", icon: Database },
        { chave: "config-obras", titulo: "Obras", descricao: "Cadastro mestre de obras e vinculos com empresas.", icon: Database },
        { chave: "config-relatorios-evidencias", titulo: "Relatórios e evidências", descricao: "Resumo copiável e TXT das configurações atuais.", icon: FileText },

        { chave: "config-login-visual", titulo: "Aparência do login", descricao: "Imagem pública de fundo da tela de acesso.", icon: ImagePlus },
        { chave: "config-eventos-auditoria", titulo: "Eventos da Auditoria do Sistema", descricao: "Eventos registrados e exibidos no histórico administrativo.", icon: Settings },
        { chave: "config-seguranca-publica", titulo: "Checklist da auditoria pública", descricao: "Conferência operacional de token público e QR Code.", icon: ShieldAlert },
        { chave: "config-storage-privado", titulo: "Checklist do Storage privado", descricao: "Buckets, URLs assinadas e arquivos sensíveis.", icon: HardDrive },
        { chave: "config-supabase-geral", titulo: "Revisão Supabase / RLS / RPC", descricao: "Conferência técnica de tabelas, RLS, RPCs e buckets.", icon: Database },
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
        case "config-versao-sistema": {
            const dataBuild = new Date(import.meta.env.VITE_APP_BUILD_DATE);
            const ambienteBuild = import.meta.env.VITE_APP_BUILD_ENV === "production" ? "Produção" : "Desenvolvimento";
            const ultimaAtualizacao = Number.isNaN(dataBuild.getTime())
                ? "Data não disponível"
                : new Intl.DateTimeFormat("pt-BR", {
                    dateStyle: "long",
                    timeStyle: "short",
                    timeZone: "America/Sao_Paulo",
                }).format(dataBuild);

            return renderBlocoConfiguracaoComControle(
                "config-versao-sistema",
                "Versão do sistema",
                "Identificação da versão publicada e do APK em desenvolvimento.",
                (
                    <Card>
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <div>
                                <div className="flex items-center gap-2">
                                    <Settings className="h-5 w-5 text-blue-600" />
                                    <h2 id="config-versao-sistema" className="scroll-mt-24 text-lg font-black text-slate-950">Versão do sistema</h2>
                                </div>
                                <p className="mt-1 text-sm text-slate-500">Referência para confirmar qual site e qual APK estão em uso.</p>
                            </div>
                            <span className="w-fit rounded-full bg-emerald-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-200">Versão atual</span>
                        </div>

                        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                            <div className="rounded-2xl bg-blue-50 p-4 ring-1 ring-blue-100">
                                <p className="text-[11px] font-black uppercase tracking-wide text-blue-600">Site</p>
                                <p className="mt-2 text-2xl font-black text-slate-950">v{import.meta.env.VITE_APP_VERSION}</p>
                            </div>
                            <div className="rounded-2xl bg-violet-50 p-4 ring-1 ring-violet-100">
                                <p className="text-[11px] font-black uppercase tracking-wide text-violet-600">APK SafeScan Campo</p>
                                <p className="mt-2 text-2xl font-black text-slate-950">v{import.meta.env.VITE_APK_VERSION}</p>
                            </div>
                            <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                                <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">Última atualização</p>
                                <p className="mt-2 text-sm font-black leading-5 text-slate-900">{ultimaAtualizacao}</p>
                            </div>
                            <div className="rounded-2xl bg-cyan-50 p-4 ring-1 ring-cyan-100">
                                <p className="text-[11px] font-black uppercase tracking-wide text-cyan-700">Build atual</p>
                                <p className="mt-2 font-mono text-lg font-black text-slate-950">{import.meta.env.VITE_APP_BUILD_ID}</p>
                            </div>
                            <div className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-100">
                                <p className="text-[11px] font-black uppercase tracking-wide text-amber-700">Ambiente / origem</p>
                                <p className="mt-2 text-sm font-black text-slate-950">{ambienteBuild}</p>
                                <p className="mt-1 truncate font-mono text-xs font-bold text-slate-600" title={import.meta.env.VITE_APP_BUILD_SOURCE}>
                                    {import.meta.env.VITE_APP_BUILD_SOURCE}
                                </p>
                            </div>
                        </div>
                    </Card>
                )
            );
        }
        case "config-eventos-auditoria":
            return renderBlocoConfiguracaoComControle(
                "config-eventos-auditoria",
                "Eventos da Auditoria do Sistema",
                "Controle dos eventos registrados no histórico.",
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
                "Limites e armazenamento",
                "Registros por carga e limite administrativo do Storage.",
                (
                    <Card>
                        <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <div className="flex items-center gap-2">
                                    <SlidersHorizontal className="h-5 w-5 text-slate-500" />
                                    <h2 id="config-limites-carregamento" className="scroll-mt-24 text-lg font-black text-slate-950">Limites e armazenamento</h2>
                                </div>
                                <p className="mt-1 text-sm text-slate-500">
                                    Ajuste quantos registros cada tela busca por carga e o limite administrativo usado no indicador de Storage.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={restaurarLimites}
                                disabled={!podeAlterarConfiguracoesCriticasSistema}
                                title={podeAlterarConfiguracoesCriticasSistema ? "Restaurar limites e armazenamento padrão" : mensagemBloqueioConfiguracoesCriticasSistema}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-3 py-2 text-xs font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                            >
                                <RotateCcw className="h-3.5 w-3.5" />
                                Restaurar padrão
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
                        </div>

                        <button
                            type="button"
                            onClick={salvarLimites}
                            disabled={!podeAlterarConfiguracoesCriticasSistema}
                            title={podeAlterarConfiguracoesCriticasSistema ? "Salvar limites e armazenamento" : mensagemBloqueioConfiguracoesCriticasSistema}
                            className="mt-4 w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                        >
                            {podeAlterarConfiguracoesCriticasSistema ? "Salvar limites e armazenamento" : "Limites bloqueados"}
                        </button>
                    </Card>
                )
            );


        case "config-obras":
            return renderBlocoConfiguracaoComControle(
                "config-obras",
                "Obras",
                "Cadastro mestre de obras e vinculos com empresas.",
                (
                    <Card>
                        <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 md:flex-row md:items-start md:justify-between">
                            <div>
                                <div className="flex items-center gap-2">
                                    <Database className="h-5 w-5 text-slate-500" />
                                    <h2 id="config-obras" className="scroll-mt-24 text-lg font-black text-slate-950">Obras</h2>
                                </div>
                                <p className="mt-1 text-sm text-slate-500">
                                    Consulte o cadastro mestre de obras e os vinculos atuais com empresas participantes.
                                </p>
                            </div>

                            <div className="flex flex-wrap items-center justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={iniciarNovaObraConfiguracoes}
                                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-3 py-2 text-xs font-black text-white hover:bg-emerald-700"
                                >
                                    Nova obra
                                </button>

                                <button
                                    type="button"
                                    onClick={carregarObrasConfiguracoes}
                                    disabled={carregandoObrasConfiguracoes}
                                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-3 py-2 text-xs font-black text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                                >
                                    <RefreshCw className={classNames("h-4 w-4", carregandoObrasConfiguracoes ? "animate-spin" : "")} />
                                    {carregandoObrasConfiguracoes ? "Carregando..." : "Atualizar obras"}
                                </button>
                            </div>
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-3">
                            <div className="rounded-2xl bg-slate-50 px-3 py-3 ring-1 ring-slate-100">
                                <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Obras cadastradas</p>
                                <p className="mt-1 text-2xl font-black text-slate-950">{obrasConfiguracoes.length}</p>
                                <p className="mt-1 text-xs font-semibold text-slate-500">total no cadastro mestre</p>
                            </div>
                            <div className="rounded-2xl bg-emerald-50 px-3 py-3 ring-1 ring-emerald-100">
                                <p className="text-[11px] font-black uppercase tracking-wide text-emerald-700">Obras ativas</p>
                                <p className="mt-1 text-2xl font-black text-emerald-900">{totalObrasAtivasConfiguracoes}</p>
                                <p className="mt-1 text-xs font-semibold text-emerald-700">disponiveis para vinculo</p>
                            </div>
                            <div className="rounded-2xl bg-blue-50 px-3 py-3 ring-1 ring-blue-100">
                                <p className="text-[11px] font-black uppercase tracking-wide text-blue-700">Vinculos ativos</p>
                                <p className="mt-1 text-2xl font-black text-blue-900">{totalVinculosObrasAtivosConfiguracoes}</p>
                                <p className="mt-1 text-xs font-semibold text-blue-700">empresa/obra</p>
                            </div>
                        </div>

                        {mensagemObrasConfiguracoes && (
                            <div className="mt-4 rounded-2xl bg-blue-50 px-4 py-3 text-xs font-bold text-blue-700 ring-1 ring-blue-200">
                                {mensagemObrasConfiguracoes}
                            </div>
                        )}

                        {formularioObraAbertoConfiguracoes && (
                            <form onSubmit={salvarObraConfiguracoes} onClick={(evento) => evento.stopPropagation()} onMouseDown={(evento) => evento.stopPropagation()} className="mt-4 rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-100">
                                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                                    <div>
                                        <h3 className="text-sm font-black text-slate-950">
                                            {editandoObraConfiguracoesId ? "Editar obra" : "Nova obra"}
                                        </h3>
                                        <p className="mt-1 text-xs font-semibold text-slate-500">
                                            Dados da obra usados no DDS e nos vinculos com empresas.
                                        </p>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={cancelarEdicaoObraConfiguracoes}
                                            className="rounded-2xl bg-white px-3 py-2 text-xs font-black text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"
                                        >
                                            Cancelar
                                        </button>

                                        <button
                                            type="submit"
                                            disabled={salvandoObraConfiguracoes}
                                            className="rounded-2xl bg-slate-950 px-3 py-2 text-xs font-black text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                                        >
                                            {salvandoObraConfiguracoes ? "Salvando..." : editandoObraConfiguracoesId ? "Salvar alteracoes" : "Cadastrar obra"}
                                        </button>
                                    </div>
                                </div>

                                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-12">
                                    <label className="block xl:col-span-5">
                                        <span className="mb-1 block text-[11px] font-black uppercase tracking-wide text-slate-500">Nome da obra</span>
                                        <input
                                            type="text"
                                            value={formObraConfiguracoes.nome}
                                            onChange={(evento) => atualizarCampoObraConfiguracoes("nome", evento.target.value)}
                                            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                            placeholder="Ex.: Obra Teste DDS"
                                        />
                                    </label>

                                                                        <label className="block xl:col-span-2">
                                        <span className="mb-1 block text-[11px] font-black uppercase tracking-wide text-slate-500">Nº da obra</span>
                                        <input
                                            type="text"
                                            value={formObraConfiguracoes.numeroObra}
                                            onChange={(evento) => atualizarCampoObraConfiguracoes("numeroObra", evento.target.value)}
                                            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                            placeholder="Ex.: 001/2026"
                                        />
                                    </label>
<label className="block xl:col-span-2">
                                        <span className="mb-1 block text-[11px] font-black uppercase tracking-wide text-slate-500">Status</span>
                                        <select
                                            value={formObraConfiguracoes.status}
                                            onChange={(evento) => atualizarCampoObraConfiguracoes("status", evento.target.value)}
                                            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                        >
                                            <option value="Ativa">Ativa</option>
                                            <option value="Inativa">Inativa</option>
                                        </select>
                                    </label>
                                    <label className="block xl:col-span-3">
                                        <span className="mb-1 block text-[11px] font-black uppercase tracking-wide text-slate-500">CEP</span>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={formObraConfiguracoes.cep}
                                                onChange={(evento) => atualizarCepObraConfiguracoes(evento.target.value)}
                                                onBlur={consultarCepObraConfiguracoes}
                                                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                                placeholder="00000-000"
                                                inputMode="numeric"
                                                maxLength={9}
                                            />
                                            <button
                                                type="button"
                                                onClick={consultarCepObraConfiguracoes}
                                                disabled={carregandoCepObraConfiguracoes}
                                                className="min-w-[64px] rounded-2xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-black text-sky-800 transition hover:bg-sky-100 disabled:opacity-60"
                                            >
                                                {carregandoCepObraConfiguracoes ? "..." : "Buscar"}
                                            </button>
                                        </div>
                                    </label>

                                    <label className="block xl:col-span-2">
                                        <span className="mb-1 block text-[11px] font-black uppercase tracking-wide text-slate-500">UF</span>
                                        <select
                                            value={formObraConfiguracoes.uf}
                                            onChange={(evento) => atualizarUfObraConfiguracoes(evento.target.value)}
                                            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                        >
                                            <option value="">Selecionar UF</option>
                                            {UFS_OBRAS_CONFIGURACOES.map((uf) => (
                                                <option key={uf} value={uf}>{uf}</option>
                                            ))}
                                        </select>
                                    </label>

                                    <label className="block xl:col-span-3">
                                        <span className="mb-1 block text-[11px] font-black uppercase tracking-wide text-slate-500">Cidade</span>
                                        <input
                                            type="text"
                                            list="municipios-obra-configuracoes"
                                            value={formObraConfiguracoes.cidade}
                                            onChange={(evento) => atualizarCampoObraConfiguracoes("cidade", evento.target.value)}
                                            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                            placeholder={carregandoMunicipiosObraConfiguracoes ? "Carregando municípios..." : "Selecione ou digite a cidade"}
                                        />
                                        <datalist id="municipios-obra-configuracoes">
                                            {municipiosObraConfiguracoes.map((municipio) => (
                                                <option key={municipio.id || municipio.nome} value={municipio.nome} />
                                            ))}
                                        </datalist>
                                    </label>

                                    <label className="block xl:col-span-5">
                                        <span className="mb-1 block text-[11px] font-black uppercase tracking-wide text-slate-500">Endereço</span>
                                        <input
                                            type="text"
                                            value={formObraConfiguracoes.endereco}
                                            onChange={(evento) => atualizarCampoObraConfiguracoes("endereco", evento.target.value)}
                                            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                            placeholder="Rua, número, bairro"
                                        />
                                    </label>

                                    <label className="block xl:col-span-2">
                                        <span className="mb-1 block text-[11px] font-black uppercase tracking-wide text-slate-500">Nº endereço</span>
                                        <input
                                            type="text"
                                            value={formObraConfiguracoes.numeroEndereco}
                                            onChange={(evento) => atualizarCampoObraConfiguracoes("numeroEndereco", evento.target.value)}
                                            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                            placeholder="Ex.: 120"
                                        />
                                    </label>

<label className="block xl:col-span-4">
                                        <span className="mb-1 block text-[11px] font-black uppercase tracking-wide text-slate-500">Fiscal Idealiza</span>
                                        <input
                                            type="text"
                                            value={formObraConfiguracoes.fiscalIdealiza}
                                            onChange={(evento) => atualizarCampoObraConfiguracoes("fiscalIdealiza", evento.target.value)}
                                            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                            placeholder="Nome do fiscal"
                                        />
                                    </label>

<label className="block xl:col-span-4">
                                        <span className="mb-1 block text-[11px] font-black uppercase tracking-wide text-slate-500">Lider / encarregado</span>
                                        <input
                                            type="text"
                                            value={formObraConfiguracoes.liderEncarregado}
                                            onChange={(evento) => atualizarCampoObraConfiguracoes("liderEncarregado", evento.target.value)}
                                            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                            placeholder="Nome do lider"
                                        />
                                    </label>

<label className="block xl:col-span-4">
                                        <span className="mb-1 block text-[11px] font-black uppercase tracking-wide text-slate-500">Técnico de Segurança do Trabalho Idealiza</span>
                                        <input
                                            type="text"
                                            value={formObraConfiguracoes.tecnicoSegurancaIdealiza}
                                            onChange={(evento) => atualizarCampoObraConfiguracoes("tecnicoSegurancaIdealiza", evento.target.value)}
                                            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                            placeholder="Nome do Técnico de Segurança do Trabalho"
                                        />
                                    </label>







                                    <label className="block xl:col-span-12">
                                        <span className="mb-1 block text-[11px] font-black uppercase tracking-wide text-slate-500">Observacoes</span>
                                        <textarea
                                            value={formObraConfiguracoes.observacoes}
                                            onChange={(evento) => atualizarCampoObraConfiguracoes("observacoes", evento.target.value)}
                                            className="min-h-[84px] w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                            placeholder="Observacoes internas da obra"
                                        />
                                    </label>
                                </div>
                            </form>
                        )}

                        <div className="mt-4 space-y-4">
                            <section className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <h3 className="text-sm font-black text-slate-900">
                                            Obras cadastradas
                                        </h3>
                                        <p className="mt-1 text-xs font-semibold text-slate-500">
                                            Consulte os responsáveis e gerencie cada obra individualmente.
                                        </p>
                                    </div>

                                    <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black uppercase tracking-wide text-slate-500 ring-1 ring-slate-200">
                                        {obrasConfiguracoes.length} registro(s)
                                    </span>
                                </div>

                                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                                    {obrasConfiguracoes.length === 0 ? (
                                        <p className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-500 ring-1 ring-slate-100 lg:col-span-2">
                                            Nenhuma obra carregada.
                                        </p>
                                    ) : (
                                        obrasConfiguracoes.slice(0, 12).map((obra) => (
                                            <article
                                                key={obra.id}
                                                className="rounded-2xl bg-white p-3 ring-1 ring-slate-100"
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-black text-slate-950">
                                                            {obra.nome || "Obra sem nome"}
                                                        </p>

                                                        <p className="mt-1 truncate text-xs font-semibold text-slate-500">
                                                            {[obra.cidade, obra.uf]
                                                                .filter(Boolean)
                                                                .join(" / ") || "Local não informado"}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="mt-3 grid grid-cols-2 gap-2">
                                                    <div className="min-w-0 rounded-xl bg-slate-50 px-3 py-2">
                                                        <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">
                                                            Fiscal Idealiza
                                                        </p>
                                                        <p className="mt-1 truncate text-xs font-semibold text-slate-700">
                                                            {obra.fiscalIdealiza || "Não informado"}
                                                        </p>
                                                    </div>

                                                    <div className="min-w-0 rounded-xl bg-slate-50 px-3 py-2">
                                                        <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">
                                                            Líder / Encarregado
                                                        </p>
                                                        <p className="mt-1 truncate text-xs font-semibold text-slate-700">
                                                            {obra.liderEncarregado || "Não informado"}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="mt-3 flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                                                    <span
                                                        className={classNames(
                                                            "shrink-0 rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wide ring-1",
                                                            obra.status === "Inativa"
                                                                ? "bg-slate-100 text-slate-500 ring-slate-200"
                                                                : "bg-emerald-50 text-emerald-700 ring-emerald-200"
                                                        )}
                                                    >
                                                        {obra.status}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => editarObraConfiguracoes(obra)}
                                                        disabled={Boolean(excluindoObraConfiguracoesId)}
                                                        className="rounded-full bg-slate-950 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                                                    >
                                                        Editar
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => excluirObraConfiguracoes(obra)}
                                                        disabled={Boolean(excluindoObraConfiguracoesId)}
                                                        className="rounded-full bg-red-50 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-red-700 ring-1 ring-red-200 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                                                    >
                                                        {excluindoObraConfiguracoesId === obra.id
                                                            ? "Excluindo..."
                                                            : "Excluir"}
                                                    </button>
                                                </div>
                                            </article>
                                        ))
                                    )}
                                </div>

                                {obrasConfiguracoes.length > 12 && (
                                    <p className="mt-3 text-xs font-semibold text-slate-500">
                                        Mostrando as 12 primeiras obras cadastradas.
                                    </p>
                                )}
                            </section>

                            <section className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <h3 className="text-sm font-black text-slate-900">
                                            Vínculos empresa/obra
                                        </h3>
                                        <p className="mt-1 text-xs font-semibold text-slate-500">
                                            Defina quais empresas participam de cada obra.
                                        </p>
                                    </div>

                                    <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black uppercase tracking-wide text-slate-500 ring-1 ring-slate-200">
                                        {vinculosObrasConfiguracoes.length} vínculo(s)
                                    </span>
                                </div>

                                <div className="mt-3 grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,.85fr)] xl:items-start">
                                    <form
                                        onSubmit={salvarVinculoObraConfiguracoes}
                                        className="rounded-2xl bg-white p-4 ring-1 ring-slate-100"
                                    >
                                        <div>
                                            <p className="text-xs font-black uppercase tracking-wide text-slate-700">
                                                Novo vínculo
                                            </p>
                                            <p className="mt-1 text-xs font-semibold text-slate-500">
                                                Selecione a empresa, a obra e o status inicial.
                                            </p>
                                        </div>

                                        <div className="mt-3 grid gap-3 lg:grid-cols-2">
                                            <label className="block lg:col-span-2">
                                                <span className="mb-1 block text-[10px] font-black uppercase tracking-wide text-slate-400">
                                                    Empresa
                                                </span>

                                                <select
                                                    value={empresaVinculoObraConfiguracoesId}
                                                    onChange={(evento) =>
                                                        setEmpresaVinculoObraConfiguracoesId(
                                                            evento.target.value
                                                        )
                                                    }
                                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                                >
                                                    {empresasVinculoObrasConfiguracoes.length === 0 ? (
                                                        <option value="">
                                                            Nenhuma empresa carregada
                                                        </option>
                                                    ) : (
                                                        empresasVinculoObrasConfiguracoes.map((empresa) => (
                                                            <option
                                                                key={obterIdEmpresaObrasConfiguracoes(empresa)}
                                                                value={obterIdEmpresaObrasConfiguracoes(empresa)}
                                                            >
                                                                {obterNomeEmpresaObrasConfiguracoes(empresa)}
                                                            </option>
                                                        ))
                                                    )}</select>
                                            </label>

                                            <label className="block">
                                                <span className="mb-1 block text-[10px] font-black uppercase tracking-wide text-slate-400">
                                                    Obra
                                                </span>

                                                <select
                                                    value={obraVinculoConfiguracoesId}
                                                    onChange={(evento) =>
                                                        setObraVinculoConfiguracoesId(
                                                            evento.target.value
                                                        )
                                                    }
                                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                                >
                                                    {obrasConfiguracoes.length === 0 ? (
                                                        <option value="">
                                                            Nenhuma obra cadastrada
                                                        </option>
                                                    ) : (
                                                        obrasConfiguracoes.map((obra) => (
                                                            <option
                                                                key={obra.id}
                                                                value={obra.id}
                                                            >
                                                                {obra.nome} - {obra.status}
                                                            </option>
                                                        ))
                                                    )}
                                                </select>
                                            </label>

                                            <label className="block">
                                                <span className="mb-1 block text-[10px] font-black uppercase tracking-wide text-slate-400">
                                                    Status inicial
                                                </span>

                                                <select
                                                    value={statusVinculoObraConfiguracoes}
                                                    onChange={(evento) =>
                                                        setStatusVinculoObraConfiguracoes(
                                                            evento.target.value
                                                        )
                                                    }
                                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                                >
                                                    <option value="Ativa">Ativa</option>
                                                    <option value="Inativa">Inativa</option>
                                                </select>
                                            </label>

                                            <button
                                                type="submit"
                                                disabled={
                                                    salvandoVinculoObraConfiguracoes ||
                                                    !empresaVinculoObraConfiguracoesId ||
                                                    !obraVinculoConfiguracoesId
                                                }
                                                className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 lg:col-span-2"
                                            >
                                                {salvandoVinculoObraConfiguracoes
                                                    ? "Salvando vínculo..."
                                                    : "Salvar vínculo"}
                                            </button>
                                        </div>
                                    </form>

                                    <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-100">
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <p className="text-xs font-black uppercase tracking-wide text-slate-700">
                                                    Vínculos atuais
                                                </p>
                                                <p className="mt-1 text-xs font-semibold text-slate-500">
                                                    Empresas já associadas às obras.
                                                </p>
                                            </div>

                                            <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-slate-500 ring-1 ring-slate-200">
                                                {vinculosObrasConfiguracoes.length}
                                            </span>
                                        </div>

                                        <div className="mt-3 space-y-2">
                                            {vinculosObrasConfiguracoes.length === 0 ? (
                                                <p className="rounded-xl bg-slate-50 px-3 py-3 text-xs font-semibold text-slate-500">
                                                    Nenhum vínculo carregado.
                                                </p>
                                            ) : (
                                                vinculosObrasConfiguracoes
                                                    .slice(0, 10)
                                                    .map((vinculo) => (
                                                        <article
                                                            key={vinculo.id}
                                                            className="grid gap-3 rounded-xl bg-slate-50 px-3 py-3 ring-1 ring-slate-100 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
                                                        >
                                                            <div className="min-w-0">
                                                                <p className="truncate text-xs font-black text-slate-950">
                                                                    {vinculo.empresa?.nome ||
                                                                        "Empresa não informada"}
                                                                </p>

                                                                <p className="mt-1 truncate text-[11px] font-semibold text-slate-500">
                                                                    →{" "}
                                                                    {vinculo.obra?.nome ||
                                                                        "Obra não informada"}
                                                                </p>
                                                            </div>

                                                            <div className="flex flex-nowrap items-center justify-end gap-2">
                                                                <span
                                                                    className={classNames(
                                                                        "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ring-1",
                                                                        vinculo.status === "Inativa"
                                                                            ? "bg-slate-100 text-slate-500 ring-slate-200"
                                                                            : "bg-emerald-50 text-emerald-700 ring-emerald-200"
                                                                    )}
                                                                >
                                                                    {vinculo.status}
                                                                </span>

                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        alternarStatusVinculoObraConfiguracoes(
                                                                            vinculo
                                                                        )
                                                                    }
                                                                    disabled={
                                                                        salvandoVinculoObraConfiguracoes
                                                                    }
                                                                    className="shrink-0 rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-wide text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                                                                >
                                                                    {vinculo.status === "Inativa"
                                                                        ? "Ativar"
                                                                        : "Inativar"}
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        removerVinculoObraConfiguracoes(
                                                                            vinculo
                                                                        )
                                                                    }
                                                                    disabled={
                                                                        salvandoVinculoObraConfiguracoes
                                                                    }
                                                                    className="shrink-0 rounded-full bg-red-50 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-red-700 ring-1 ring-red-200 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                                                                >
                                                                    Remover
                                                                </button>
                                                            </div>
                                                        </article>
                                                    ))
                                            )}
                                        </div>

                                        <div className="mt-3 rounded-xl bg-blue-50 px-3 py-2 text-[10px] font-semibold leading-4 text-blue-700 ring-1 ring-blue-100">
                                            <strong>Ativa:</strong> disponível para uso no DDS.{" "}
                                            <strong>Inativa:</strong> vínculo preservado, mas
                                            indisponível para novos registros.
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>


                    </Card>
                )
            );
        case "config-relatorios-evidencias":
            return renderBlocoConfiguracaoComControle(
                "config-relatorios-evidencias",
                "Relatórios e evidências das Configurações",
                "Resumo administrativo para conferência interna.",
                (
                    <Card>
                        <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <div className="flex items-center gap-2">
                                    <FileText className="h-5 w-5 text-slate-500" />
                                    <h2 id="config-relatorios-evidencias" className="scroll-mt-24 text-lg font-black text-slate-950">Relatórios e evidências das Configurações</h2>
                                </div>
                                <p className="mt-1 text-sm text-slate-500">
                                    Gere uma evidência simples do estado técnico atual: limites, token público, checklists, senha crítica e ações protegidas.
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
                            <div className="min-w-0 rounded-2xl bg-emerald-50 px-4 py-3 ring-1 ring-emerald-100">
                                <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Permissão técnica</p>
                                <p className="mt-1 text-lg font-black text-slate-950">{formatarPerfilPermissaoSistema(resumoPermissaoSistemaAtual.perfil)}</p>
                                <p className="mt-1 text-xs font-semibold text-slate-500">
                                    {resumoPermissaoSistemaAtual.status} · {resumoPermissaoSistemaAtual.acessoGlobal ? "acesso global" : "sem acesso global"}
                                </p>
                            </div>
                            <div className="min-w-0 rounded-2xl bg-blue-50 px-4 py-3 ring-1 ring-blue-100">
                                <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Ações críticas</p>
                                <p className="mt-1 text-lg font-black text-slate-950">{resumoAcoesCriticasSistemaAtual.podeAlterarConfiguracoesCriticas ? "Liberadas" : "Bloqueadas"}</p>
                                <p className="mt-1 text-xs font-semibold text-slate-500">
                                    Excluir {resumoAcoesCriticasSistemaAtual.podeExcluir ? "sim" : "não"} · Limpar Storage {resumoAcoesCriticasSistemaAtual.podeLimparArquivos ? "sim" : "não"}
                                </p>
                            </div>
                            <div className="min-w-0 rounded-2xl bg-cyan-50 px-4 py-3 ring-1 ring-cyan-100">
                                <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Auditoria</p>
                                <p className="mt-1 text-lg font-black text-slate-950">{totalEventosHabilitados}/{eventosAuditoria.length}</p>
                                <p className="mt-1 text-xs font-semibold text-slate-500">
                                    eventos habilitados · origem {origemConfig === "supabase" ? "Supabase" : "Local"}
                                </p>
                            </div>
                            <div className="min-w-0 rounded-2xl bg-amber-50 px-4 py-3 ring-1 ring-amber-100">
                                <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Segurança</p>
                                <p className="mt-1 text-lg font-black text-slate-950">{resumoRevisaoSupabase.texto}</p>
                                <p className="mt-1 text-xs font-semibold text-slate-500">
                                    Supabase · Storage {resumoSegurancaStorage.texto} · QR {resumoSegurancaAuditoriaPublica.texto}
                                </p>
                            </div>
                        </div>

                                                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl bg-white px-4 py-2.5 text-[11px] font-bold text-slate-600 ring-1 ring-slate-200">
                            <span className="font-black text-slate-800">
                                Legenda:
                            </span>

                            <span className="inline-flex items-center gap-2 whitespace-nowrap">
                                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                                Permissão e acesso
                            </span>

                            <span className="inline-flex items-center gap-2 whitespace-nowrap">
                                <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                                Ações administrativas
                            </span>

                            <span className="inline-flex items-center gap-2 whitespace-nowrap">
                                <span className="h-2.5 w-2.5 rounded-full bg-cyan-500" />
                                Auditoria e eventos
                            </span>

                            <span className="inline-flex items-center gap-2 whitespace-nowrap">
                                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                                Segurança e atenção
                            </span>
                        </div>
                    </Card>
                )
            );

        case "config-login-visual":
            return renderBlocoConfiguracaoComControle(
                "config-login-visual",
                "Aparência do login",
                "Imagem pública de fundo da tela de acesso.",
                (
                    <Card>
                        <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 md:flex-row md:items-start md:justify-between">
                            <div>
                                <div className="flex items-center gap-2">
                                    <ImagePlus className="h-5 w-5 text-slate-500" />
                                    <h2 id="config-login-visual" className="scroll-mt-24 text-lg font-black text-slate-950">Imagem de fundo do login</h2>
                                </div>
                                <p className="mt-1 text-sm text-slate-500">
                                    Personalize o fundo da tela de acesso sem alterar o fluxo de login, senha temporária ou permissões.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={removerFundoLoginPersonalizado}
                                disabled={!podeAlterarConfiguracoesCriticasSistema || salvandoFundoLogin}
                                title={podeAlterarConfiguracoesCriticasSistema ? "Remover imagem personalizada do login" : mensagemBloqueioConfiguracoesCriticasSistema}
                                className="inline-flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-xs font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                            >
                                <RotateCcw className="h-3.5 w-3.5" />
                                Voltar ao padrão
                            </button>
                        </div>

                        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
                            <form onSubmit={salvarFundoLoginPersonalizado} className="rounded-2xl bg-slate-50 px-4 py-4 ring-1 ring-slate-100">
                                <label className="block text-sm font-black text-slate-800">
                                    Imagem de fundo
                                </label>
                                <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">
                                    Use JPG, PNG ou WEBP. Depois escolha um pré-ajuste para enquadrar a imagem no login.
                                </p>

                                <input
                                    type="file"
                                    accept="image/*"
                                    disabled={!podeAlterarConfiguracoesCriticasSistema || salvandoFundoLogin}
                                    onChange={(evento) => selecionarArquivoFundoLogin(evento.target.files?.[0] || null)}
                                    className="mt-4 w-full rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-3 text-xs font-semibold text-slate-600 file:mr-3 file:rounded-xl file:border-0 file:bg-slate-950 file:px-3 file:py-2 file:text-xs file:font-black file:text-white disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                                />

                                <div className="mt-4 rounded-2xl bg-white px-3 py-3 ring-1 ring-slate-200">
                                    <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Pré-ajustes da imagem</p>
                                    <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                                        {PRE_AJUSTES_FUNDO_LOGIN_CONFIGURACOES.map((preAjuste) => (
                                            <button
                                                key={preAjuste.chave}
                                                type="button"
                                                onClick={() => aplicarPreAjusteFundoLogin(preAjuste)}
                                                disabled={!podeAlterarConfiguracoesCriticasSistema || salvandoFundoLogin}
                                                className={classNames(
                                                    "rounded-2xl px-3 py-2 text-left ring-1 transition disabled:cursor-not-allowed disabled:opacity-60",
                                                    ajusteFundoLogin.size === preAjuste.ajuste.size
                                                        && ajusteFundoLogin.position === preAjuste.ajuste.position
                                                        && Number(ajusteFundoLogin.overlay) === Number(preAjuste.ajuste.overlay)
                                                        ? "bg-blue-50 text-blue-800 ring-blue-200"
                                                        : "bg-slate-50 text-slate-700 ring-slate-200 hover:bg-slate-100"
                                                )}
                                            >
                                                <span className="block text-xs font-black">{preAjuste.label}</span>
                                                <span className="mt-0.5 block text-[10px] font-semibold text-slate-500">{preAjuste.descricao}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="mt-4 flex flex-wrap gap-2">
                                    <button
                                        type="submit"
                                        disabled={!podeAlterarConfiguracoesCriticasSistema || salvandoFundoLogin || (!arquivoFundoLogin && !ajusteFundoLoginAlterado)}
                                        className="rounded-2xl bg-slate-950 px-4 py-2 text-xs font-black text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                                    >
                                        {salvandoFundoLogin ? "Salvando..." : arquivoFundoLogin ? "Salvar fundo do login" : "Salvar pré-ajuste"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => selecionarArquivoFundoLogin(null)}
                                        disabled={salvandoFundoLogin}
                                        className="rounded-2xl bg-white px-4 py-2 text-xs font-black text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-60"
                                    >
                                        Limpar seleção
                                    </button>
                                </div>

                                <div className={classNames(
                                    "mt-4 rounded-2xl px-4 py-3 text-xs font-semibold leading-relaxed ring-1",
                                    mensagemFundoLogin.includes("atualizada") || mensagemFundoLogin.includes("removida")
                                        ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                                        : mensagemFundoLogin.includes("não") || mensagemFundoLogin.includes("inválido")
                                            ? "bg-red-50 text-red-700 ring-red-200"
                                            : "bg-blue-50 text-blue-700 ring-blue-200"
                                )}>
                                    {mensagemFundoLogin}
                                </div>
                            </form>

                            <div className="rounded-2xl bg-slate-950 p-4 text-white shadow-inner">
                                <p className="text-xs font-black uppercase tracking-wide text-blue-100">Prévia do fundo</p>
                                <div
                                    className="mt-3 flex min-h-[190px] items-center justify-center overflow-hidden rounded-2xl bg-slate-900 bg-cover bg-center ring-1 ring-white/10"
                                    style={montarEstiloFundoLoginConfiguracoes(previewFundoLoginUrl, ajusteFundoLogin)}
                                >
                                    <div className="rounded-2xl bg-white/95 px-5 py-4 text-center text-slate-950 shadow-xl">
                                        <p className="text-sm font-black">SafeScan Brasil</p>
                                        <p className="mt-1 text-[11px] font-semibold text-slate-500">
                                            {previewFundoLoginUrl ? "Imagem personalizada ativa" : "Fundo azul padrão"}
                                        </p>
                                    </div>
                                </div>
                                <p className="mt-3 text-xs font-semibold leading-relaxed text-blue-100">
                                    A prévia usa o mesmo enquadramento aplicado no login. Se a imagem falhar, o fundo azul padrão permanece.
                                </p>
                            </div>
                        </div>
                    </Card>
                )
            );


        case "config-auditoria-publica":
            return renderBlocoConfiguracaoComControle(
                "config-auditoria-publica",
                "Auditoria pública, tokens e QR Code",
                "Token ativo centralizado, QR colaborador e QR de campo.",
                (
                    <Card>
                        <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <div className="flex items-center gap-2">
                                    <KeyRound className="h-5 w-5 text-slate-500" />
                                    <h2 id="config-auditoria-publica" className="scroll-mt-24 text-lg font-black text-slate-950">Auditoria pública, tokens e QR Code</h2>
                                </div>
                                <p className="mt-1 text-sm text-slate-500">
                                    Centralize o token público, documente a senha operacional e diferencie Auditoria pública, QR colaborador e QR de Campo / Máquina / Equipamento.
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
                          <div data-qr-logo-configuracoes="true" className="mt-4 w-full rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200">
                              <div className="flex w-full flex-col gap-4 xl:flex-row xl:items-start xl:justify-between xl:gap-6">
                                  <div className="min-w-0 max-w-[520px]">
                                      <p className="text-sm font-black text-slate-950">Personalização dos QR Codes</p>
                                      <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                                          Escolha uma imagem PNG para aparecer no centro dos QR Codes. A imagem fica salva no sistema.
                                      </p>
                                      <p className="mt-1 text-[11px] font-bold text-slate-500">
                                          Recomendado: PNG quadrado, fundo limpo e até 350 KB.
                                      </p>
                                  </div>

                                  <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-end">
                                      <div className="flex shrink-0 items-center justify-center rounded-2xl bg-white px-3 py-3 ring-1 ring-slate-200">
                                          <QrCodeComLogo
                                              value={montarUrlPublicaSistema("/?qr=exemplo-logo-configuracoes")}
                                              size={82}
                                              level="H"
                                              includeMargin
                                              bgColor="#ffffff"
                                              fgColor="#0f172a"
                                              logoRatio={0.26}
                                          />
                                      </div>

                                      <QrCodeLogoControls className="w-full max-w-[170px] shrink-0 sm:items-start sm:text-left" />
                                  </div>
                              </div>
                          </div>





                        {mensagemAuditoriaPublica && (
                            <div className="mt-4 rounded-2xl bg-blue-50 px-4 py-3 text-xs font-bold text-blue-700 ring-1 ring-blue-200">
                                {mensagemAuditoriaPublica}
                            </div>
                        )}

                        <div className="mt-4 space-y-3">
                            <label className="block rounded-2xl bg-slate-50 px-3 py-3 ring-1 ring-slate-100">
                                <p className="text-sm font-bold text-slate-800">Token público ativo</p>
                                <p className="mt-1 text-xs text-slate-500">
                                    Carregado pelo serviço central da auditoria pública. Prioridade: RPC obter_token_auditoria_publica_ativo, com fallback seguro na tabela auditoria_tokens_publicos.
                                </p>
                                <input
                                    value={configAuditoriaPublica.tokenPublico || ""}
                                    readOnly
                                    placeholder={carregandoAuditoriaPublica ? "Carregando token ativo pelo serviço central..." : "Token ativo não encontrado"}
                                    className="mt-3 w-full cursor-not-allowed rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none"
                                />
                                <p className="mt-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                                    Origem: {origemAuditoriaPublica === "rpc" ? "RPC" : origemAuditoriaPublica === "supabase" ? "Supabase" : origemAuditoriaPublica || "serviço central"}
                                </p>
                            </label>

                            <div className="grid gap-3 lg:grid-cols-3">
                                <div className="rounded-2xl bg-emerald-50 px-3 py-3 ring-1 ring-emerald-100">
                                    <p className="text-sm font-black text-emerald-800">Auditoria pública geral</p>
                                    <p className="mt-2 text-xs font-semibold leading-relaxed text-emerald-700">
                                        Link público sem login. Usa token público ativo e senha validada pela RPC validar_acesso_auditoria_publica.
                                    </p>
                                </div>
                                <div className="rounded-2xl bg-blue-50 px-3 py-3 ring-1 ring-blue-100">
                                    <p className="text-sm font-black text-blue-800">QR do colaborador</p>
                                    <p className="mt-2 text-xs font-semibold leading-relaxed text-blue-700">
                                        Consulta pública usa token_qr próprio do colaborador. Auditoria pelo QR usa token público + token_qr e exige senha.
                                    </p>
                                </div>
                                <div className="rounded-2xl bg-violet-50 px-3 py-3 ring-1 ring-violet-100">
                                    <p className="text-sm font-black text-violet-800">QR de Campo / Máquina / Equipamento</p>
                                    <p className="mt-2 text-xs font-semibold leading-relaxed text-violet-700">
                                        Máquina e equipamento entram como alvo da Auditoria de Campo. Não existe token_maquina ou token_equipamento separado nesta etapa.
                                    </p>
                                </div>
                            </div>

                            <label className="block rounded-2xl bg-slate-50 px-3 py-3 ring-1 ring-slate-100">
                                <p className="text-sm font-bold text-slate-800">Senha de referência operacional</p>
                                <p className="mt-1 text-xs text-slate-500">
                                    Campo apenas documental da tela. Não altera a senha real validada pela RPC validar_acesso_auditoria_publica.
                                </p>
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
                                    <p className="text-sm font-bold text-slate-800">Link público atual da Auditoria pública</p>
                                </div>
                                <p className="texto-quebra-segura mt-2 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-500 ring-1 ring-slate-200">
                                    {configAuditoriaPublica.tokenPublico ? linkAuditoriaPublica : "Token ativo não encontrado pelo serviço central. Verifique a RPC obter_token_auditoria_publica_ativo e a tabela auditoria_tokens_publicos."}
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
                                Padronização: esta tela apenas exibe o token público ativo e documenta a referência operacional. A fonte oficial continua no Supabase/RPC; não criar token manual no navegador.
                            </div>
                            <div className="rounded-2xl bg-slate-50 px-3 py-3 text-xs font-semibold leading-relaxed text-slate-600 ring-1 ring-slate-100">
                                Ações de salvar/restaurar só ficam disponíveis para usuários com permissão crítica de Configurações.
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={salvarConfigAuditoriaPublica}
                            disabled={!podeAlterarConfiguracoesCriticasSistema}
                            title={podeAlterarConfiguracoesCriticasSistema ? "Salvar referência operacional da Auditoria pública" : mensagemBloqueioConfiguracoesCriticasSistema}
                            className="mt-4 w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                        >
                            {podeAlterarConfiguracoesCriticasSistema ? "Salvar referência operacional" : "Auditoria pública bloqueada"}
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

        case "config-emergencia-qr":
            if (!blocoConfiguracaoVisivel("config-emergencia-qr")) return null;

            if (blocoConfiguracaoRecolhido("config-emergencia-qr")) {
                return renderBlocoConfiguracaoComControle(
                    "config-emergencia-qr",
                    "Senha/PIN de emergência QR",
                    "Proteção do contato de emergência por empresa.",
                    null
                );
            }

            return (
                <div id="config-emergencia-qr" className="h-full scroll-mt-24">
                    <EmergenciaQrPinCard
                        empresasBanco={empresasBanco}
                        controleCard={botaoRecolherBlocoConfiguracao(
                            "config-emergencia-qr",
                            "shrink-0 whitespace-nowrap"
                        )}
                        onAlternarRecolhido={() =>
                            alternarRecolhidoBlocoConfiguracao(
                                "config-emergencia-qr"
                            )
                        }
                    />
                </div>
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



        case "config-modelos-email-sst":
            if (!blocoConfiguracaoVisivel("config-modelos-email-sst")) return null;

            if (blocoConfiguracaoRecolhido("config-modelos-email-sst")) {
                return renderBlocoConfiguracaoComControle(
                    "config-modelos-email-sst",
                    "Modelos de e-mail SST",
                    "Assunto, conteúdo, remetente, variáveis e ativação dos alertas.",
                    null
                );
            }

            return (
                <div
                    id="config-modelos-email-sst"
                    className="h-full scroll-mt-24"
                >
                    <ModelosEmailSstConfiguracoes
                        supabase={supabase}
                        podeAlterar={
                            podeAlterarConfiguracoesCriticasSistema
                        }
                        mensagemBloqueio={
                            mensagemBloqueioConfiguracoesCriticasSistema
                        }
                        onRegistrarAuditoria={
                            registrarLogConfiguracoesSistema
                        }
                        controleCard={botaoRecolherBlocoConfiguracao(
                            "config-modelos-email-sst",
                            "shrink-0 whitespace-nowrap"
                        )}
                        onRecolherCard={() => {
                            alternarRecolhidoBlocoConfiguracao(
                                "config-modelos-email-sst"
                            );
                        }}
                    />
                </div>
            );

        case "config-arquivos-storage":
            if (!blocoConfiguracaoVisivel("config-arquivos-storage")) return null;

            if (blocoConfiguracaoRecolhido("config-arquivos-storage")) {
                return renderBlocoConfiguracaoComControle(
                    "config-arquivos-storage",
                    "Arquivos salvos no Storage",
                    "Capacidade, vínculos, filtros e limpeza protegida.",
                    null
                );
            }

            return (
                <div
                    className="h-full"
                    aria-label="Recolher Arquivos salvos no Storage"
                    onClick={(evento) => {
                        if (cliqueVeioDeControleInterativoConfiguracao(evento)) return;
                        alternarRecolhidoBlocoConfiguracao("config-arquivos-storage");
                    }}
                >
                    <ArquivosStorageConfiguracoes
                        limiteStorageMb={limitesEditaveis.storageMb || limites.storageMb || 1024}
                        permissaoSistemaUsuario={permissaoSistemaAtual}
                        onListarArquivosStorage={onListarArquivosStorage}
                        onExcluirArquivoStorage={onExcluirArquivoStorage}
                        onAtualizarAuditoria={onAtualizarAuditoria}
                        controleCard={botaoRecolherBlocoConfiguracao("config-arquivos-storage", "shrink-0 whitespace-nowrap")}
                    />
                </div>
            );

        case "config-supabase-geral":
            return renderBlocoConfiguracaoComControle(
                "config-supabase-geral",
                "Revisão geral Supabase / RLS / RPC",
                "Conferência técnica de tabelas, RLS, RPCs e buckets.",
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

        default:
            return null;
        }
    };

    const obterTemaCardResumoConfiguracoes = (label = "") => {
        const chave = String(label || "").toLowerCase();

        if (chave.includes("eventos")) {
            return {
                faixa: "from-sky-400 via-blue-500 to-cyan-400",
                borda: "border-sky-100",
                icone: "bg-sky-50 text-blue-700 ring-sky-100",
                etiqueta: "text-blue-700",
            };
        }

        if (chave.includes("origem")) {
            return {
                faixa: "from-violet-400 via-purple-500 to-fuchsia-400",
                borda: "border-violet-100",
                icone: "bg-violet-50 text-violet-700 ring-violet-100",
                etiqueta: "text-violet-700",
            };
        }

        if (chave.includes("limites")) {
            return {
                faixa: "from-amber-400 via-orange-500 to-rose-400",
                borda: "border-amber-100",
                icone: "bg-amber-50 text-amber-700 ring-amber-100",
                etiqueta: "text-amber-700",
            };
        }

        if (chave.includes("permissão") || chave.includes("permissao")) {
            return {
                faixa: "from-emerald-400 via-teal-500 to-cyan-400",
                borda: "border-emerald-100",
                icone: "bg-emerald-50 text-emerald-700 ring-emerald-100",
                etiqueta: "text-emerald-700",
            };
        }

        if (chave.includes("alertas")) {
            return {
                faixa: "from-rose-400 via-red-500 to-orange-400",
                borda: "border-rose-100",
                icone: "bg-rose-50 text-rose-700 ring-rose-100",
                etiqueta: "text-rose-700",
            };
        }

        return {
            faixa: "from-slate-300 via-slate-500 to-slate-300",
            borda: "border-slate-100",
            icone: "bg-slate-50 text-slate-700 ring-slate-200",
            etiqueta: "text-slate-700",
        };
    };

    const agoraHeroConfiguracoes = new Date();
    const dataHeroConfiguracoes = new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
    }).format(agoraHeroConfiguracoes);
    const diaSemanaHeroConfiguracoes = new Intl.DateTimeFormat("pt-BR", {
        weekday: "long",
    }).format(agoraHeroConfiguracoes);
    const horaHeroConfiguracoes = new Intl.DateTimeFormat("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
    }).format(agoraHeroConfiguracoes);

    return (
        <div className="page-shell">
            <Header
                className="hero-integrated-page-header hero-header--configuracoes"
                titulo="Configurações do sistema"
                subtitulo={null}
                acao={(
                    <div className="configuracoes-hero-actions top-actions-nowrap flex-wrap justify-end">
                        {acaoTopo}
                        <button
                            type="button"
                            onClick={carregarConfiguracao}
                            disabled={carregandoConfig || salvandoConfig}
                            className="configuracoes-hero-action configuracoes-hero-action--atualizar inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <RefreshCw className={classNames("h-4 w-4", carregandoConfig && "animate-spin")} />
                            Atualizar configurações
                        </button>
                        <button
                            type="button"
                            aria-pressed={mostrarOrganizacaoCards}
                            onClick={() => setMostrarOrganizacaoCards((valor) => !valor)}
                            className="configuracoes-hero-action configuracoes-hero-action--personalizar inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition hover:-translate-y-0.5"
                        >
                            <SlidersHorizontal className="h-4 w-4" />
                            Personalizar painel
                        </button>
                        <button
                            type="button"
                            onClick={abrirTodosBlocosConfiguracao}
                            className="configuracoes-hero-action configuracoes-hero-action--abrir inline-flex items-center rounded-2xl px-4 py-2.5 text-sm font-bold transition hover:-translate-y-0.5"
                        >
                            Abrir todos
                        </button>
                        <button
                            type="button"
                            onClick={recolherTodosBlocosConfiguracao}
                            className="configuracoes-hero-action configuracoes-hero-action--recolher inline-flex items-center rounded-2xl px-4 py-2.5 text-sm font-bold transition hover:-translate-y-0.5"
                        >
                            Recolher todos
                        </button>
                    </div>
                )}
            />
            <section
                data-configuracoes-hero="true"
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
                            Configurações do sistema
                        </h2>
                        <p className="mt-2 max-w-3xl text-base font-bold text-slate-200 md:text-lg">
                            Painel técnico para limites, Storage, tokens públicos, auditoria, segurança e configurações críticas do sistema SST.
                        </p>
                        <div className="mt-5 h-1 w-14 rounded-full bg-[#1E7C3A]" />
                    </div>

                    <div className="dashboard-hero-sst__date rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm font-black text-white shadow-[0_8px_24px_rgba(0,0,0,0.22)] backdrop-blur">
                        <div className="flex flex-wrap items-center gap-2">
                            <CalendarClock className="h-4 w-4 text-emerald-300" />
                            <span>{dataHeroConfiguracoes}</span>
                            <span className="text-emerald-300">•</span>
                            <span className="capitalize">{diaSemanaHeroConfiguracoes}</span>
                            <span className="text-emerald-300">•</span>
                            <span>{horaHeroConfiguracoes}</span>
                        </div>
                    </div>
                </div>
            </section>

            <div className="config-summary-grid cards-grid--fixed-5">
                {cardsResumo.map((card) => {
                        const Icon = card.icon;
                        const tema = obterTemaCardResumoConfiguracoes(card.label);
                        return (
                            <Card
                                key={card.label}
                                className={classNames(
                                    "config-summary-card summary-card-fixed group relative h-full min-h-[5.6rem] overflow-hidden rounded-[22px] border bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(246,249,252,0.96)_100%)] px-3 py-2 shadow-[0_10px_26px_rgba(26,35,50,0.08)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(26,35,50,0.13)]",
                                    tema.borda
                                )}
                            >
                                <span className={classNames("absolute inset-x-0 top-0 h-1 bg-gradient-to-r", tema.faixa)} />
                                <div className="summary-card-content flex min-h-0 flex-1 items-center justify-center gap-2 py-1">
                                    <div className={classNames("summary-card-icon flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl shadow-sm ring-1", tema.icone)}>
                                        <Icon className="h-4 w-4" />
                                    </div>
                                    <div className="flex min-w-0 flex-1 flex-col text-center">
                                        <p className={classNames("summary-card-label texto-quebra-segura text-[11px] font-black uppercase tracking-[0.08em] leading-tight", tema.etiqueta)}>{card.label}</p>
                                        <p className={classNames("summary-card-value texto-quebra-segura", card.label === "Token Auditoria pública" && "summary-card-value--token")}>{card.valor}</p>
                                        <p className="summary-card-detail">{card.detalhe}</p>
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>
              {mostrarOrganizacaoCards && (
                  <Card className="mb-6 mt-4">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                              <h2 className="text-base font-bold text-slate-950">Personalizar painel de Configurações</h2>
                              <p className="mt-1 text-sm text-slate-500">
                                  Marque apenas as informações que devem aparecer na aba Configurações. Ajuste visibilidade, ordem, abertura e tamanho dos cards.
                              </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                              <button
                                  type="button"
                                  onClick={restaurarOrganizacaoCardsConfiguracoes}
                                  className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                              >
                                  Mostrar padrão
                              </button>
                              <button
                                  type="button"
                                  onClick={recolherTodosBlocosConfiguracao}
                                  className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-200"
                              >
                                  Painel compacto
                              </button>
                          </div>
                      </div>

                      <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-2 shadow-sm">
                          <div className="grid gap-2 md:grid-cols-2">
                              <button
                                  type="button"
                                  onClick={() => setFiltroPainelConfiguracoes("todos")}
                                  className={classNames(
                                      "rounded-2xl px-4 py-3 text-left ring-1 transition",
                                      filtroPainelConfiguracoes === "todos"
                                          ? "bg-blue-600 text-white ring-blue-600 shadow-sm"
                                          : "bg-blue-50 text-blue-800 ring-blue-200 hover:bg-blue-100"
                                  )}
                              >
                                  <span className="block text-xs font-black uppercase tracking-wide">Filtro 1</span>
                                  <span className="mt-1 block text-sm font-bold">Cards da aba Configurações</span>
                                  <span className={classNames("mt-0.5 block text-xs", filtroPainelConfiguracoes === "todos" ? "text-blue-100" : "text-blue-600")}>
                                      Edite todos os cards administrativos da tela.
                                  </span>
                              </button>

                              <button
                                  type="button"
                                  onClick={() => setFiltroPainelConfiguracoes("criticos")}
                                  className={classNames(
                                      "rounded-2xl px-4 py-3 text-left ring-1 transition",
                                      filtroPainelConfiguracoes === "criticos"
                                          ? "bg-emerald-600 text-white ring-emerald-600 shadow-sm"
                                          : "bg-emerald-50 text-emerald-800 ring-emerald-200 hover:bg-emerald-100"
                                  )}
                              >
                                  <span className="block text-xs font-black uppercase tracking-wide">Filtro 2</span>
                                  <span className="mt-1 block text-sm font-bold">Cards críticos e operacionais</span>
                                  <span className={classNames("mt-0.5 block text-xs", filtroPainelConfiguracoes === "criticos" ? "text-emerald-100" : "text-emerald-600")}>
                                      Foque nos cards sensíveis da configuração.
                                  </span>
                              </button>
                          </div>
                      </div>

                      <div className="mt-6 rounded-3xl border border-blue-200 bg-blue-50/60 p-4 shadow-sm">
                          <div className="mb-3 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                              <div>
                                  <div className="flex flex-wrap items-center gap-2">
                                      <span className="rounded-full bg-blue-600 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white">Seção 1</span>
                                      <h3 className="text-sm font-bold text-slate-950">Cards principais da aba Configurações</h3>
                                  </div>
                                  <p className="mt-1 text-xs text-slate-600">
                                      Mostrando {secoesPersonalizacaoConfiguracoes.length} de {secoesConfiguracoesOrdenadas.length} cards. Ajuste visibilidade, tamanho e ordem.
                                  </p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                  {FILTROS_PAINEL_CONFIGURACOES.map((filtro) => (
                                      <button
                                          key={filtro.chave}
                                          type="button"
                                          onClick={() => setFiltroPainelConfiguracoes(filtro.chave)}
                                          className={classNames(
                                              "self-start rounded-xl px-3 py-2 text-xs font-semibold ring-1 sm:self-auto",
                                              filtroPainelConfiguracoes === filtro.chave
                                                  ? "bg-blue-600 text-white ring-blue-600 hover:bg-blue-700"
                                                  : "bg-white text-blue-700 ring-blue-200 hover:bg-blue-50"
                                          )}
                                      >
                                          {filtro.label}
                                      </button>
                                  ))}
                              </div>
                          </div>

                          <div className="grid gap-3 lg:grid-cols-2">
                              {secoesPersonalizacaoConfiguracoes.map((secao) => {
                                  const Icon = secao.icon || Settings;
                                  const indiceReal = secoesConfiguracoesOrdenadas.findIndex((item) => item.chave === secao.chave);
                                  const visivel = blocoConfiguracaoVisivel(secao.chave);
                                  const recolhido = blocoConfiguracaoRecolhido(secao.chave);
                                  const tamanhoAtual = obterTamanhoBlocoConfiguracao(secao.chave);

                                  return (
                                      <div
                                          key={secao.chave}
                                          onDragOver={(evento) => evento.preventDefault()}
                                          onDrop={(evento) => {
                                              evento.preventDefault();
                                              const origem = evento.dataTransfer.getData("text/plain") || blocoArrastandoConfiguracoes;
                                              moverBlocoParaConfiguracao(origem, secao.chave);
                                              setBlocoArrastandoConfiguracoes("");
                                          }}
                                          className={classNames(
                                              "rounded-2xl p-3 ring-1 transition",
                                              visivel ? "bg-blue-50/60 ring-blue-200" : "bg-slate-50 ring-slate-200",
                                              blocoArrastandoConfiguracoes === secao.chave && "opacity-60 ring-2 ring-blue-300"
                                          )}
                                      >
                                          <div className="flex items-center justify-between gap-3">
                                              <div className="flex min-w-0 items-start gap-2">
                                                  <span
                                                      draggable
                                                      onDragStart={(evento) => {
                                                          setBlocoArrastandoConfiguracoes(secao.chave);
                                                          evento.dataTransfer.setData("text/plain", secao.chave);
                                                          evento.dataTransfer.effectAllowed = "move";
                                                      }}
                                                      onDragEnd={() => setBlocoArrastandoConfiguracoes("")}
                                                      className="mt-0.5 inline-flex h-7 w-7 shrink-0 cursor-grab items-center justify-center rounded-xl bg-white text-sm font-bold text-slate-500 ring-1 ring-slate-200 active:cursor-grabbing"
                                                      title="Segure e arraste para mudar a ordem"
                                                  >
                                                      ☰
                                                  </span>

                                                  <div className="min-w-0">
                                                      <div className="flex flex-wrap items-center gap-2">
                                                          <span className="inline-flex h-7 w-7 items-center justify-center rounded-xl bg-white text-slate-500 ring-1 ring-blue-100">
                                                              <Icon className="h-4 w-4" />
                                                          </span>
                                                          <h4 className="text-sm font-black text-blue-950">#{indiceReal + 1}. {secao.titulo}</h4>
                                                      </div>
                                                      <p className="mt-0.5 text-xs font-semibold leading-relaxed text-slate-500">{secao.descricao}</p>
                                                  </div>
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
