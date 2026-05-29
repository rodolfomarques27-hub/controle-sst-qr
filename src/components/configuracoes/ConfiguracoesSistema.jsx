/* eslint-disable no-unused-vars */
import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
    AlertTriangle,
    CheckCircle2,
    Copy,
    Database,
    KeyRound,
    Link2,
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
    TOKEN_AUDITORIA_CAMPO_PUBLICA_PADRAO,
} from "../../constants/auditoriaPublicaConstants";
import {
    avaliarSegurancaAuditoriaPublica,
    calcularResumoSegurancaAuditoriaPublica,
    montarChecklistSegurancaAuditoriaPublicaTexto,
} from "../../services/auditoriaPublicaSegurancaService";

const classNames = (...classes) => classes.filter(Boolean).join(" ");

export function ConfiguracoesSistema({ usuario = null, podeAcessarAuditoria = false, limites = {}, onSalvarLimites }) {
    const [configEventos, setConfigEventos] = useState(() => configuracaoPadraoEventosAuditoriaSistema());
    const [origemConfig, setOrigemConfig] = useState("local");
    const [mensagemConfig, setMensagemConfig] = useState("Carregando configuração...");
    const [carregandoConfig, setCarregandoConfig] = useState(false);
    const [salvandoConfig, setSalvandoConfig] = useState(false);
    const [limitesEditaveis, setLimitesEditaveis] = useState(() => normalizarLimitesCarregamentoSistema(limites));
    const [mensagemLimites, setMensagemLimites] = useState("Os limites estão prontos para edição local.");
    const [configAuditoriaPublica, setConfigAuditoriaPublica] = useState(() => carregarConfiguracaoAuditoriaPublicaSistema());
    const [mensagemAuditoriaPublica, setMensagemAuditoriaPublica] = useState("Configuração pública carregada localmente.");

    const eventosAuditoria = useMemo(() => {
        const normalizada = normalizarConfiguracaoEventosAuditoriaSistema(configEventos);
        return EVENTOS_AUDITORIA_SISTEMA_PADRAO.map((evento) => ({
            ...evento,
            habilitado: normalizada[evento.chave] !== false,
        }));
    }, [configEventos]);

    const totalEventosHabilitados = eventosAuditoria.filter((evento) => evento.habilitado).length;

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

    const alterarConfigAuditoriaPublica = (campo, valor) => {
        setConfigAuditoriaPublica((atual) => ({
            ...atual,
            [campo]: valor,
        }));
    };

    const salvarConfigAuditoriaPublica = () => {
        const normalizada = salvarConfiguracaoAuditoriaPublicaSistema(configAuditoriaPublica);
        setConfigAuditoriaPublica(normalizada);
        setMensagemAuditoriaPublica("Configuração da Auditoria pública salva localmente. Gere novos QR Codes para usar o token atualizado.");
    };

    const restaurarConfigAuditoriaPublica = () => {
        const padrao = restaurarConfiguracaoAuditoriaPublicaPadrao();
        setConfigAuditoriaPublica(padrao);
        setMensagemAuditoriaPublica("Configuração padrão da Auditoria pública restaurada.");
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
            label: "Token Auditoria pública",
            valor: configAuditoriaPublica.tokenPublico || TOKEN_AUDITORIA_CAMPO_PUBLICA_PADRAO,
            detalhe: "usado em links e QR Codes",
            icon: KeyRound,
        },
        {
            label: "Segurança Auditoria pública",
            valor: resumoSegurancaAuditoriaPublica.texto,
            detalhe: resumoSegurancaAuditoriaPublica.detalhe,
            icon: ShieldAlert,
        },
    ];

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Header
                titulo="Configurações do sistema"
                subtitulo="Centralize parâmetros operacionais, auditoria e limites usados pelo sistema SST."
                acao={(
                    <button
                        type="button"
                        onClick={carregarConfiguracao}
                        disabled={carregandoConfig || salvandoConfig}
                        className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <RefreshCw className={classNames("h-4 w-4", carregandoConfig && "animate-spin")} />
                        Atualizar configurações
                    </button>
                )}
            />

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {cardsResumo.map((card) => {
                    const Icon = card.icon;
                    return (
                        <Card key={card.label}>
                            <div className="flex items-start gap-3">
                                <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
                                    <Icon className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-slate-950">{card.label}</p>
                                    <p className="mt-2 text-2xl font-black text-slate-950">{card.valor}</p>
                                    <p className="mt-1 text-xs font-medium text-slate-500">{card.detalhe}</p>
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
                <Card>
                    <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 md:flex-row md:items-start md:justify-between">
                        <div>
                            <div className="flex items-center gap-2">
                                <Settings className="h-5 w-5 text-slate-500" />
                                <h2 className="text-lg font-black text-slate-950">Eventos da Auditoria de sistema</h2>
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

                    <div className="mt-4 grid gap-3 lg:grid-cols-2">
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

                <div className="space-y-6">
                    <Card>
                        <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <div className="flex items-center gap-2">
                                    <SlidersHorizontal className="h-5 w-5 text-slate-500" />
                                    <h2 className="text-lg font-black text-slate-950">Limites de carregamento</h2>
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

                    <Card>
                        <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <div className="flex items-center gap-2">
                                    <KeyRound className="h-5 w-5 text-slate-500" />
                                    <h2 className="text-lg font-black text-slate-950">Auditoria pública e QR Code</h2>
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
                                <p className="text-sm font-bold text-slate-800">Token público padrão</p>
                                <p className="mt-1 text-xs text-slate-500">Usado para gerar links e QR Codes da Nova Auditoria de Campo.</p>
                                <input
                                    value={configAuditoriaPublica.tokenPublico || ""}
                                    onChange={(evento) => alterarConfigAuditoriaPublica("tokenPublico", evento.target.value)}
                                    placeholder="TOKEN-AUDITORIA-CAMPO-2026"
                                    className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-100"
                                />
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
                                <p className="mt-2 break-all rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-500 ring-1 ring-slate-200">
                                    {linkAuditoriaPublica}
                                </p>
                                <button
                                    type="button"
                                    onClick={copiarLinkAuditoriaPublica}
                                    className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-xs font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                                >
                                    <Copy className="h-3.5 w-3.5" />
                                    Copiar link
                                </button>
                            </div>

                            <div className="rounded-2xl bg-orange-50 px-3 py-3 text-xs font-semibold leading-relaxed text-orange-700 ring-1 ring-orange-200">
                                Segurança: alterar a senha aqui não altera a senha validada pelo Supabase. Para mudar a senha real, atualize também o registro/token usado pela RPC validar_acesso_auditoria_publica.
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={salvarConfigAuditoriaPublica}
                            className="mt-4 w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white hover:bg-slate-800"
                        >
                            Salvar configuração da Auditoria pública
                        </button>
                    </Card>

                    <Card>
                        <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <div className="flex items-center gap-2">
                                    <ShieldAlert className="h-5 w-5 text-slate-500" />
                                    <h2 className="text-lg font-black text-slate-950">Revisão de segurança da Auditoria pública</h2>
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

                    <Card>
                        <div className="flex items-start gap-3">
                            <div className="rounded-2xl bg-blue-50 p-3 text-blue-700">
                                <CheckCircle2 className="h-5 w-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-slate-950">Status da etapa</h2>
                                <p className="mt-1 text-sm leading-relaxed text-slate-500">
                                    Esta tela centraliza as configurações sem alterar regras de login, RLS, Storage, upload ou QR público.
                                </p>
                                <p className="mt-3 text-xs font-semibold text-slate-400">
                                    Usuário atual: {usuario?.email || "não informado"}
                                </p>
                            </div>
                        </div>
                    </Card>

                    {!podeAcessarAuditoria && (
                        <div className="rounded-3xl bg-orange-50 p-4 text-sm font-semibold text-orange-700 ring-1 ring-orange-200">
                            <div className="flex items-start gap-2">
                                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                                <p>
                                    Você pode visualizar esta tela, mas as configurações da Auditoria de sistema devem ser administradas por usuário com permissão de auditoria.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
