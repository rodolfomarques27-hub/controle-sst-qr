/* eslint-disable no-unused-vars */
import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
    AlertTriangle,
    CheckCircle2,
    Database,
    RefreshCw,
    RotateCcw,
    Settings,
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

const classNames = (...classes) => classes.filter(Boolean).join(" ");

export function ConfiguracoesSistema({ usuario = null, podeAcessarAuditoria = false, limites = {} }) {
    const [configEventos, setConfigEventos] = useState(() => configuracaoPadraoEventosAuditoriaSistema());
    const [origemConfig, setOrigemConfig] = useState("local");
    const [mensagemConfig, setMensagemConfig] = useState("Carregando configuração...");
    const [carregandoConfig, setCarregandoConfig] = useState(false);
    const [salvandoConfig, setSalvandoConfig] = useState(false);

    const eventosAuditoria = useMemo(() => {
        const normalizada = normalizarConfiguracaoEventosAuditoriaSistema(configEventos);
        return EVENTOS_AUDITORIA_SISTEMA_PADRAO.map((evento) => ({
            ...evento,
            habilitado: normalizada[evento.chave] !== false,
        }));
    }, [configEventos]);

    const totalEventosHabilitados = eventosAuditoria.filter((evento) => evento.habilitado).length;

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
            valor: limites.auditoriaSistema || 300,
            detalhe: "registros iniciais",
            icon: SlidersHorizontal,
        },
        {
            label: "Limite Auditorias campo",
            valor: limites.auditoriasCampo || 500,
            detalhe: "registros iniciais",
            icon: SlidersHorizontal,
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
                        <div className="flex items-center gap-2">
                            <SlidersHorizontal className="h-5 w-5 text-slate-500" />
                            <h2 className="text-lg font-black text-slate-950">Limites de carregamento</h2>
                        </div>
                        <p className="mt-1 text-sm text-slate-500">
                            Estes limites estão definidos no código para manter a abertura inicial mais rápida.
                        </p>
                        <div className="mt-4 space-y-3">
                            {[
                                ["Auditoria de sistema", limites.auditoriaSistema || 300, "registros"],
                                ["E-mails enviados", limites.emailsEnviados || 200, "registros"],
                                ["Auditorias de campo", limites.auditoriasCampo || 500, "registros"],
                                ["Armazenamento", `${limites.storageMb || 1024} MB`, "limite visual"],
                            ].map(([label, valor, detalhe]) => (
                                <div key={label} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-3 ring-1 ring-slate-100">
                                    <div>
                                        <p className="text-sm font-bold text-slate-800">{label}</p>
                                        <p className="text-xs text-slate-500">{detalhe}</p>
                                    </div>
                                    <span className="rounded-xl bg-white px-3 py-1.5 text-sm font-black text-slate-950 ring-1 ring-slate-200">
                                        {valor}
                                    </span>
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
