/* eslint-disable no-unused-vars */
import React, { useEffect, useMemo, useState } from "react";
import {
    AlertTriangle,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Copy,
    Database,
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
    carregarPermissaoSistemaAtualService,
    obterResumoPermissaoSistema,
} from "../../services/usuariosPermissoesSistemaService";
import { supabase } from "../../lib/supabaseClient";

const classNames = (...classes) => classes.filter(Boolean).join(" ");

const CHAVES_BLOCOS_CONFIGURACOES_PADRAO = [
    "config-eventos-auditoria",
    "config-limites-carregamento",
    "config-senha-configuracoes",
    "config-usuarios-permissoes",
    "config-auditoria-publica",
    "config-seguranca-publica",
    "config-storage-privado",
    "config-supabase-geral",
    "config-status-etapa",
];

const BLOCOS_CONFIGURACOES_VISIVEIS_PADRAO = CHAVES_BLOCOS_CONFIGURACOES_PADRAO.reduce((acc, chave) => {
    acc[chave] = true;
    return acc;
}, {});

const BLOCOS_CONFIGURACOES_RECOLHIDOS_PADRAO = CHAVES_BLOCOS_CONFIGURACOES_PADRAO.reduce((acc, chave) => {
    acc[chave] = false;
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
    const [blocosVisiveisConfiguracoes, setBlocosVisiveisConfiguracoes] = useState(() => ({
        ...BLOCOS_CONFIGURACOES_VISIVEIS_PADRAO,
        ...carregarJsonLocalConfiguracoes("configuracoesSistemaBlocosVisiveis", BLOCOS_CONFIGURACOES_VISIVEIS_PADRAO),
    }));
    const [blocosRecolhidosConfiguracoes, setBlocosRecolhidosConfiguracoes] = useState(() => ({
        ...BLOCOS_CONFIGURACOES_RECOLHIDOS_PADRAO,
        ...carregarJsonLocalConfiguracoes("configuracoesSistemaBlocosRecolhidos", BLOCOS_CONFIGURACOES_RECOLHIDOS_PADRAO),
    }));
    const [ordemBlocosConfiguracoes, setOrdemBlocosConfiguracoes] = useState(() => carregarOrdemLocalConfiguracoes());

    const [perfilPermissoesAberto, setPerfilPermissoesAberto] = useState(
        () => PERMISSOES_PADRAO_USUARIOS_POR_PERFIL[0]?.chave || ""
    );
    const [permissaoSistemaAtual, setPermissaoSistemaAtual] = useState(null);
    const [carregandoPermissaoSistema, setCarregandoPermissaoSistema] = useState(false);
    const [mensagemPermissaoSistema, setMensagemPermissaoSistema] = useState(
        "Permissão geral ainda não carregada do Supabase."
    );

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


    useEffect(() => {
        if (typeof window === "undefined") return;
        window.localStorage.setItem("configuracoesSistemaBlocosVisiveis", JSON.stringify(blocosVisiveisConfiguracoes));
    }, [blocosVisiveisConfiguracoes]);

    useEffect(() => {
        if (typeof window === "undefined") return;
        window.localStorage.setItem("configuracoesSistemaBlocosRecolhidos", JSON.stringify(blocosRecolhidosConfiguracoes));
    }, [blocosRecolhidosConfiguracoes]);

    useEffect(() => {
        if (typeof window === "undefined") return;
        window.localStorage.setItem("configuracoesSistemaOrdemBlocos", JSON.stringify(ordemBlocosConfiguracoes));
    }, [ordemBlocosConfiguracoes]);

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
        setBlocosRecolhidosConfiguracoes(BLOCOS_CONFIGURACOES_RECOLHIDOS_PADRAO);
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
                    "inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-xs font-black text-white shadow-sm ring-1 ring-slate-950 hover:bg-slate-800",
                    extraClassName
                )}
            >
                {recolhido ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
                {recolhido ? "Abrir card" : "Recolher card"}
            </button>
        );
    };

    const rodapeControleBlocoConfiguracao = (chave) => (
        <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Controle do card</p>
                    <p className="mt-0.5 text-xs font-semibold text-slate-500">
                        Use este botão para abrir ou recolher somente esta seção.
                    </p>
                </div>
                {botaoRecolherBlocoConfiguracao(chave, "w-full sm:w-auto")}
            </div>
        </div>
    );

    const renderBlocoConfiguracaoComControle = (chave, titulo, descricao, conteudo) => {
        if (!blocoConfiguracaoVisivel(chave)) return null;

        if (blocoConfiguracaoRecolhido(chave)) {
            return (
                <Card>
                    <div className="flex flex-col gap-4">
                        <div>
                            <p className="text-xs font-black uppercase tracking-wide text-slate-400">Card recolhido</p>
                            <h2 className="mt-1 text-lg font-black text-slate-950">{titulo}</h2>
                            <p className="mt-1 text-sm text-slate-500">{descricao}</p>
                        </div>
                        {rodapeControleBlocoConfiguracao(chave)}
                    </div>
                </Card>
            );
        }

        if (React.isValidElement(conteudo)) {
            return React.cloneElement(conteudo, {
                className: classNames(conteudo.props.className || "", "h-full"),
                children: (
                    <>
                        {conteudo.props.children}
                        {rodapeControleBlocoConfiguracao(chave)}
                    </>
                ),
            });
        }

        return (
            <Card>
                {conteudo}
                {rodapeControleBlocoConfiguracao(chave)}
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
        restaurarConfiguracaoAuditoriaPublicaPadrao();
        await carregarConfiguracaoAuditoriaPublicaSupabase();
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
                setMensagemPermissaoSistema("Permissão geral carregada do Supabase. Esta leitura ainda não bloqueia telas, botões ou rotas.");
            } else {
                setMensagemPermissaoSistema("Nenhuma permissão geral encontrada para o usuário autenticado. O sistema continua sem bloqueio real nesta etapa.");
            }
        } catch (erro) {
            setPermissaoSistemaAtual(null);
            setMensagemPermissaoSistema(`Não foi possível carregar a permissão geral. Supabase: ${erro?.message || "erro não identificado"}`);
        } finally {
            setCarregandoPermissaoSistema(false);
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


    const persistirConfiguracao = async (proximaConfiguracao, mensagemSucesso = "Configuração salva.") => {
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
            label: "Origem da configuração",
            valor: origemConfig === "supabase" ? "Supabase" : "Local",
            detalhe: origemConfig === "supabase" ? "Sincronizada no banco" : "Fallback do navegador",
            icon: Database,
        },
        {
            label: "Limite Auditoria sistema",
            valor: limitesEditaveis.auditoriaSistema || 300,
            detalhe: "registros iniciais",
            icon: SlidersHorizontal,
        },
        {
            label: "Limite Auditorias campo",
            valor: limitesEditaveis.auditoriasCampo || 500,
            detalhe: "registros iniciais",
            icon: SlidersHorizontal,
        },
        {
            label: "Senha Configurações",
            valor: senhaConfiguracoesSistema === SENHA_CONFIGURACOES_PADRAO ? "Padrão" : "Personalizada",
            detalhe: senhaConfiguracoesSistema === SENHA_CONFIGURACOES_PADRAO ? "senha 2026" : "salva localmente",
            icon: Lock,
        },
        {
            label: "Usuários e permissões",
            valor: permissaoSistemaAtual ? resumoPermissaoSistemaAtual.perfil : "Planejado",
            detalhe: permissaoSistemaAtual
                ? `${resumoPermissaoSistemaAtual.status} · ${resumoPermissaoSistemaAtual.acessoGlobal ? "acesso global" : "sem acesso global"}`
                : "painel visual sem bloqueio real",
            icon: ShieldCheck,
        },
        {
            label: "Token Auditoria pública",
            valor: configAuditoriaPublica.tokenPublico || "Não configurado",
            detalhe: configAuditoriaPublica.tokenPublico ? "carregado do Supabase" : "token ativo não encontrado no Supabase",
            icon: KeyRound,
        },
        {
            label: "Segurança Auditoria pública",
            valor: resumoSegurancaAuditoriaPublica.texto,
            detalhe: resumoSegurancaAuditoriaPublica.detalhe,
            icon: ShieldAlert,
        },
        {
            label: "Segurança Storage",
            valor: resumoSegurancaStorage.texto,
            detalhe: resumoSegurancaStorage.detalhe,
            icon: HardDrive,
        },
        {
            label: "Revisão Supabase",
            valor: resumoRevisaoSupabase.texto,
            detalhe: resumoRevisaoSupabase.detalhe,
            icon: Database,
        },
    ];

    const secoesConfiguracoes = [
        { chave: "config-eventos-auditoria", titulo: "Auditoria de sistema", descricao: "Eventos registrados e exibidos na auditoria.", icon: Settings },
        { chave: "config-limites-carregamento", titulo: "Limites", descricao: "Quantidade de registros por tela/carga.", icon: SlidersHorizontal },
        { chave: "config-senha-configuracoes", titulo: "Senha das Configurações", descricao: "Senha local usada para abrir esta tela.", icon: Lock },
        { chave: "config-usuarios-permissoes", titulo: "Usuários e Permissões", descricao: "Perfis e permissões planejadas por módulo.", icon: ShieldCheck },
        { chave: "config-auditoria-publica", titulo: "Auditoria pública", descricao: "Token, senha de referência e link público.", icon: KeyRound },
        { chave: "config-seguranca-publica", titulo: "Segurança pública", descricao: "Checklist operacional do QR Code público.", icon: ShieldAlert },
        { chave: "config-storage-privado", titulo: "Storage privado", descricao: "Buckets, URLs assinadas e arquivos sensíveis.", icon: HardDrive },
        { chave: "config-supabase-geral", titulo: "Supabase/RLS/RPC", descricao: "Tabelas, policies, funções e performance.", icon: Database },
        { chave: "config-status-etapa", titulo: "Status", descricao: "Resumo da configuração e usuário atual.", icon: CheckCircle2 },
    ];


    const secoesConfiguracoesOrdenadas = [
        ...ordemBlocosConfiguracoes
            .map((chave) => secoesConfiguracoes.find((secao) => secao.chave === chave))
            .filter(Boolean),
        ...secoesConfiguracoes.filter((secao) => !ordemBlocosConfiguracoes.includes(secao.chave)),
    ];

    const secoesConfiguracoesVisiveisOrdenadas = secoesConfiguracoesOrdenadas.filter((secao) => blocoConfiguracaoVisivel(secao.chave));

    const renderBlocoConfiguracao = (chave) => {
        switch (chave) {
        case "config-eventos-auditoria":
            return renderBlocoConfiguracaoComControle(
                "config-eventos-auditoria",
                "Eventos da Auditoria de sistema",
                "Eventos registrados e exibidos na auditoria.",
                (
                <Card>
                    <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 md:flex-row md:items-start md:justify-between">
                        <div>
                            <div className="flex items-center gap-2">
                                <Settings className="h-5 w-5 text-slate-500" />
                                <h2 id="config-eventos-auditoria" className="scroll-mt-24 text-lg font-black text-slate-950">Eventos da Auditoria de sistema</h2>
                            </div>
                            <p className="mt-1 text-sm text-slate-500">
                                Escolha quais eventos o sistema deve registrar e exibir na Auditoria de sistema.
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
                                        disabled={salvandoConfig}
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
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-3 py-2 text-xs font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
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
                            className="mt-4 w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white hover:bg-slate-800"
                        >
                            Salvar limites de carregamento
                        </button>
                    </Card>
                )
            );

        case "config-senha-configuracoes":
            return renderBlocoConfiguracaoComControle(
                "config-senha-configuracoes",
                "Senha das Configurações",
                "Senha local usada para abrir a tela Configurações.",
                (
                <Card>
                    <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 md:flex-row md:items-start md:justify-between">
                        <div>
                            <div className="flex items-center gap-2">
                                <Lock className="h-5 w-5 text-slate-500" />
                                <h2 id="config-senha-configuracoes" className="scroll-mt-24 text-lg font-black text-slate-950">Senha das Configurações</h2>
                            </div>
                            <p className="mt-1 text-sm text-slate-500">
                                Altere a senha local exigida para abrir a aba Configurações neste navegador.
                            </p>
                            <p className="mt-2 text-xs font-semibold text-slate-500">
                                Status atual: <span className="font-black text-slate-900">{senhaConfiguracoesSistema === SENHA_CONFIGURACOES_PADRAO ? "Senha padrão 2026" : "Senha personalizada"}</span> · Origem: <span className="font-black text-slate-900">{origemSenhaConfiguracoesSistema === "supabase" ? "Supabase" : "Local"}</span>
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={restaurarSenhaConfiguracoesPadrao}
                            className="inline-flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-xs font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                        >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Restaurar senha padrão
                        </button>
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
                                className="rounded-2xl bg-slate-950 px-4 py-2 text-xs font-black text-white shadow-sm hover:bg-slate-800"
                            >
                                Salvar senha das Configurações
                            </button>
                        </div>
                    </form>

                    <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-xs font-semibold leading-5 text-amber-700 ring-1 ring-amber-100">
                        Esta senha é local do navegador. Ela não substitui permissões, RLS ou autenticação do Supabase.
                    </p>
                </Card>
                )
            );

        case "config-usuarios-permissoes":
            return renderBlocoConfiguracaoComControle(
                "config-usuarios-permissoes",
                "Usuários e Permissões",
                "Perfis e permissões planejadas por módulo.",
                (
                    <Card>
                        <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 md:flex-row md:items-start md:justify-between">
                            <div>
                                <div className="flex items-center gap-2">
                                    <ShieldCheck className="h-5 w-5 text-slate-500" />
                                    <h2 id="config-usuarios-permissoes" className="scroll-mt-24 text-lg font-black text-slate-950">Usuários e Permissões</h2>
                                </div>
                                <p className="mt-1 text-sm text-slate-500">
                                    Painel inicial para organizar perfis, módulos e ações antes de aplicar bloqueios reais no sistema.
                                </p>
                                <p className="mt-2 text-xs font-semibold text-slate-500">
                                    Usuário atual: <span className="font-black text-slate-900">{usuario?.email || "não informado"}</span> · Perfil atual: <span className="font-black text-slate-900">{usuario?.perfil || "não informado"}</span>
                                </p>
                            </div>
                            <span className="inline-flex items-center justify-center rounded-2xl bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 ring-1 ring-blue-200">
                                Etapa visual
                            </span>
                        </div>

                        <div className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-xs font-semibold leading-relaxed text-amber-700 ring-1 ring-amber-200">
                            Esta etapa ainda não bloqueia botões, rotas, uploads, exclusões ou relatórios. Os bloqueios reais devem ser ativados em microetapas futuras, começando pelas ações críticas.
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
                                    <p className="mt-1 text-sm font-black text-slate-950">{resumoPermissaoSistemaAtual.perfil}</p>
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
                                    <p className="mt-1 text-xs font-semibold text-slate-500">A matriz segue planejada e ainda não bloqueia ações reais no sistema.</p>
                                </div>
                            )}
                        </div>

                        <div className="mt-4 rounded-3xl border border-dashed border-slate-300 bg-white p-4">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="mt-1 h-5 w-5 shrink-0 text-orange-600" />
                                <div>
                                    <p className="text-sm font-black text-slate-950">Próximas microetapas recomendadas</p>
                                    <div className="mt-2 grid gap-2 text-xs font-semibold leading-relaxed text-slate-600 md:grid-cols-2">
                                        <p>1. Exibir a permissão carregada do Supabase no painel. Concluído nesta etapa.</p>
                                        <p>2. Criar leitura administrativa da lista de usuários autorizados, sem edição ainda.</p>
                                        <p>3. Aplicar bloqueio real apenas em ações críticas: excluir, limpar arquivos e configurações.</p>
                                        <p>4. Registrar toda alteração de permissão na Auditoria do Sistema.</p>
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
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-3 py-2 text-xs font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
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
                        </div>

                        <button
                            type="button"
                            onClick={salvarConfigAuditoriaPublica}
                            className="mt-4 w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white hover:bg-slate-800"
                        >
                            Salvar referência da Auditoria pública
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
                subtitulo="Centralize parâmetros operacionais, auditoria e limites usados pelo sistema SST."
                acao={(
                    <div className="top-actions-nowrap">
                        {acaoTopo}
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

            <Card className="mt-6 border-blue-100 bg-blue-50/40">
                <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <p className="text-xs font-black uppercase tracking-wide text-blue-700">Organização das configurações</p>
                        <h2 className="mt-1 text-lg font-black text-slate-950">Seções rápidas do sistema</h2>
                        <p className="mt-1 text-sm text-slate-600">Abra, recolha, oculte e organize os cards de configuração conforme a rotina de uso.</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => setMostrarOrganizacaoCards((valor) => !valor)}
                                className="rounded-2xl bg-slate-950 px-3 py-2 text-xs font-black text-white hover:bg-slate-800"
                            >
                                {mostrarOrganizacaoCards ? "Ocultar organização" : "Organizar cards"}
                            </button>
                            <button type="button" onClick={abrirTodosBlocosConfiguracao} className="rounded-2xl bg-white px-3 py-2 text-xs font-bold text-slate-700 ring-1 ring-blue-100 hover:bg-blue-50">Abrir todos</button>
                            <button type="button" onClick={recolherTodosBlocosConfiguracao} className="rounded-2xl bg-white px-3 py-2 text-xs font-bold text-slate-700 ring-1 ring-blue-100 hover:bg-blue-50">Recolher todos</button>
                            <button type="button" onClick={restaurarOrganizacaoCardsConfiguracoes} className="rounded-2xl bg-white px-3 py-2 text-xs font-bold text-slate-700 ring-1 ring-blue-100 hover:bg-blue-50">Restaurar organização</button>
                        </div>
                    </div>
                    <div className="cards-grid cards-grid--compact lg:min-w-[420px]">
                        {secoesConfiguracoesVisiveisOrdenadas.map((secao) => {
                            const Icon = secao.icon;

                            return (
                                <a
                                    key={secao.chave}
                                    href={`#${secao.chave}`}
                                    className="group rounded-2xl bg-white px-3 py-3 text-left ring-1 ring-blue-100 transition hover:-translate-y-0.5 hover:ring-blue-200"
                                >
                                    <div className="flex items-start gap-2">
                                        <span className="rounded-xl bg-blue-50 p-2 text-blue-700 ring-1 ring-blue-100">
                                            <Icon className="h-4 w-4" />
                                        </span>
                                        <span className="min-w-0">
                                            <span className="texto-quebra-segura block text-xs font-black text-slate-950 group-hover:text-blue-700">{secao.titulo}</span>
                                            <span className="texto-quebra-segura mt-0.5 block text-[11px] leading-snug text-slate-500">{secao.descricao}</span>
                                        </span>
                                    </div>
                                </a>
                            );
                        })}
                    </div>
                </div>

                {mostrarOrganizacaoCards && (
                    <div className="mt-4 config-inner-grid">
                        {secoesConfiguracoesOrdenadas.map((secao, index) => {
                            const Icon = secao.icon;
                            const visivel = blocoConfiguracaoVisivel(secao.chave);
                            const recolhido = blocoConfiguracaoRecolhido(secao.chave);

                            return (
                                <div key={secao.chave} className="rounded-3xl bg-white p-3 ring-1 ring-blue-100">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex min-w-0 items-start gap-2">
                                            <span className="rounded-xl bg-blue-50 p-2 text-blue-700 ring-1 ring-blue-100">
                                                <Icon className="h-4 w-4" />
                                            </span>
                                            <div className="min-w-0">
                                                <p className="text-sm font-black text-slate-950">#{index + 1}. {secao.titulo}</p>
                                                <p className="mt-1 text-xs leading-relaxed text-slate-500">{secao.descricao}</p>
                                                <p className="mt-1 text-[11px] font-semibold text-slate-400">
                                                    {visivel ? "Visível" : "Oculto"} · {recolhido ? "Recolhido" : "Aberto"}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex shrink-0 flex-wrap justify-end gap-1">
                                            <button type="button" onClick={() => moverBlocoConfiguracao(secao.chave, -1)} disabled={index === 0} className="rounded-xl bg-slate-50 px-2 py-1 text-xs font-black text-slate-600 ring-1 ring-slate-200 disabled:cursor-not-allowed disabled:opacity-40">↑</button>
                                            <button type="button" onClick={() => moverBlocoConfiguracao(secao.chave, 1)} disabled={index === secoesConfiguracoesOrdenadas.length - 1} className="rounded-xl bg-slate-50 px-2 py-1 text-xs font-black text-slate-600 ring-1 ring-slate-200 disabled:cursor-not-allowed disabled:opacity-40">↓</button>
                                            <button type="button" onClick={() => alternarRecolhidoBlocoConfiguracao(secao.chave)} className="rounded-xl bg-blue-50 px-2 py-1 text-xs font-black text-blue-700 ring-1 ring-blue-100">{recolhido ? "Abrir" : "Recolher"}</button>
                                            <button type="button" onClick={() => alternarVisibilidadeBlocoConfiguracao(secao.chave)} className={classNames("rounded-xl px-2 py-1 text-xs font-black ring-1", visivel ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-slate-100 text-slate-500 ring-slate-200")}>{visivel ? "Visível" : "Oculto"}</button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </Card>

            <div className="config-sections-grid mt-6">
                {secoesConfiguracoesOrdenadas.map((secao) => (
                    <React.Fragment key={secao.chave}>{renderBlocoConfiguracao(secao.chave)}</React.Fragment>
                ))}
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
