import React, { useState } from "react";
import {
    AlertTriangle,
    CheckCircle2,
    ClipboardList,
    KeyRound,
    LockKeyhole,
    ShieldCheck,
    UserCog,
    UserPlus,
    UsersRound,
} from "lucide-react";
import { Card } from "../commonComponents";
import {
    ACOES_USUARIOS_PERMISSOES_PLANEJADAS,
    PERFIS_USUARIOS_PERMISSOES_PLANEJADOS,
    PERMISSOES_PADRAO_USUARIOS_POR_PERFIL,
} from "../../constants/usuariosPermissoesConstants";

const CARDS_ACESSOS_APP = [
    {
        titulo: "Cadastro de login",
        descricao: "Criar pessoa, definir e-mail, função, perfil e senha temporária.",
        status: "Próxima etapa",
        icone: UserPlus,
    },
    {
        titulo: "Usuários cadastrados",
        descricao: "Listar pessoas com acesso, editar perfil e acompanhar status ativo ou bloqueado.",
        status: "Será movido de Configurações",
        icone: UsersRound,
    },
    {
        titulo: "Solicitações de acesso",
        descricao: "Aprovar, recusar ou concluir pedidos feitos pelas telas restritas.",
        status: "Será movido de Configurações",
        icone: ClipboardList,
    },
    {
        titulo: "Perfis padrão",
        descricao: "Revisar o que Administrador, Técnico SST, Auditor, Gestor, Consulta e Bloqueado podem fazer.",
        status: "Movido para cá",
        icone: ShieldCheck,
    },
    {
        titulo: "Segurança e logs",
        descricao: "Registrar criação, alteração, bloqueio, desbloqueio e uso de senha temporária.",
        status: "Preparação",
        icone: LockKeyhole,
    },
];

function obterNomeUsuario(usuario) {
    const nome = String(usuario?.nome || usuario?.user_metadata?.nome || "").trim();
    const email = String(usuario?.email || "").trim();

    if (nome) return nome;
    if (email.includes("@")) return email.split("@")[0];
    return "Administrador";
}

function BadgeEtapa({ children, variante = "info" }) {
    const classes = {
        info: "bg-blue-50 text-blue-700 ring-blue-100",
        alerta: "bg-orange-50 text-orange-700 ring-orange-100",
        sucesso: "bg-emerald-50 text-emerald-700 ring-emerald-100",
        neutro: "bg-slate-50 text-slate-600 ring-slate-200",
    };

    return (
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-black ring-1 ${classes[variante] || classes.info}`}>
            {children}
        </span>
    );
}

function CardFuncionalidade({ item, indice }) {
    const Icone = item.icone;

    return (
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm">
                        <Icone className="h-5 w-5" strokeWidth={2.2} />
                    </div>
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Etapa {indice + 1}</p>
                        <h3 className="mt-1 text-base font-black text-slate-950">{item.titulo}</h3>
                    </div>
                </div>
                <BadgeEtapa variante={indice === 0 ? "alerta" : indice === 3 ? "sucesso" : "info"}>{item.status}</BadgeEtapa>
            </div>
            <p className="mt-4 text-sm font-semibold leading-6 text-slate-500">{item.descricao}</p>
        </article>
    );
}

function RevisaoPerfisPadrao() {
    const [perfilAtivo, setPerfilAtivo] = useState(() => PERMISSOES_PADRAO_USUARIOS_POR_PERFIL[0]?.chave || "");
    const perfilSelecionado = PERMISSOES_PADRAO_USUARIOS_POR_PERFIL.find((perfil) => perfil.chave === perfilAtivo) ||
        PERMISSOES_PADRAO_USUARIOS_POR_PERFIL[0] || null;

    return (
        <Card className="border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                        <ShieldCheck className="h-5 w-5" strokeWidth={2.2} />
                    </div>
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Revisão dos perfis padrão</p>
                        <h3 className="mt-1 text-xl font-black text-slate-950">O que cada perfil pode fazer</h3>
                        <p className="mt-2 max-w-4xl text-sm font-semibold leading-6 text-slate-500">
                            Consulte a regra base antes de criar login, aprovar solicitações ou alterar perfis. A permissão real continua validada pelo Supabase/RPC.
                        </p>
                    </div>
                </div>
                <BadgeEtapa variante="sucesso">{PERMISSOES_PADRAO_USUARIOS_POR_PERFIL.length} perfis padrão</BadgeEtapa>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
                {PERMISSOES_PADRAO_USUARIOS_POR_PERFIL.map((perfil) => {
                    const ativo = perfilAtivo === perfil.chave;

                    return (
                        <button
                            key={perfil.chave}
                            type="button"
                            onClick={() => setPerfilAtivo(perfil.chave)}
                            className={`inline-flex items-center justify-center rounded-2xl px-4 py-2 text-xs font-black ring-1 transition ${
                                ativo
                                    ? "bg-slate-950 text-white ring-slate-950 shadow-sm"
                                    : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
                            }`}
                        >
                            {perfil.perfil}
                        </button>
                    );
                })}
            </div>

            {perfilSelecionado ? (
                <div className="mt-5 rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-100">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div>
                            <p className="text-xs font-black uppercase tracking-wide text-blue-700">Perfil selecionado</p>
                            <h4 className="mt-1 text-2xl font-black text-slate-950">{perfilSelecionado.perfil}</h4>
                            <p className="mt-1 text-[11px] font-black uppercase tracking-wide text-slate-500">{perfilSelecionado.nivel}</p>
                            <p className="mt-2 max-w-4xl text-sm font-semibold leading-6 text-slate-600">{perfilSelecionado.resumo}</p>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center sm:min-w-[330px]">
                            <div className="rounded-2xl bg-white px-3 py-3 ring-1 ring-slate-100">
                                <p className="text-xl font-black text-slate-950">{perfilSelecionado.modulosLiberados.length}</p>
                                <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">módulos</p>
                            </div>
                            <div className="rounded-2xl bg-emerald-50 px-3 py-3 ring-1 ring-emerald-100">
                                <p className="text-xl font-black text-emerald-700">{perfilSelecionado.acoesLiberadas.length}</p>
                                <p className="text-[10px] font-black uppercase tracking-wide text-emerald-700">liberadas</p>
                            </div>
                            <div className="rounded-2xl bg-red-50 px-3 py-3 ring-1 ring-red-100">
                                <p className="text-xl font-black text-red-700">{perfilSelecionado.acoesRestritas.length}</p>
                                <p className="text-[10px] font-black uppercase tracking-wide text-red-700">restritas</p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-5 grid gap-3 xl:grid-cols-3">
                        <div className="rounded-3xl bg-white p-4 ring-1 ring-slate-100 xl:col-span-3">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                <p className="text-xs font-black uppercase tracking-wide text-slate-500">Pode acessar estes módulos</p>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                                {perfilSelecionado.modulosLiberados.length > 0 ? perfilSelecionado.modulosLiberados.map((modulo) => (
                                    <span key={modulo} className="rounded-full bg-slate-50 px-3 py-1.5 text-[11px] font-black text-slate-700 ring-1 ring-slate-200">
                                        {modulo}
                                    </span>
                                )) : (
                                    <span className="rounded-full bg-slate-50 px-3 py-1.5 text-[11px] font-black text-slate-400 ring-1 ring-slate-200">
                                        Nenhum módulo operacional liberado
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="rounded-3xl bg-emerald-50 p-4 ring-1 ring-emerald-100">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                                <p className="text-xs font-black uppercase tracking-wide text-emerald-700">Pode fazer</p>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                                {perfilSelecionado.acoesLiberadas.length > 0 ? perfilSelecionado.acoesLiberadas.map((acao) => (
                                    <span key={acao} className="rounded-full bg-white px-3 py-1.5 text-[11px] font-black text-emerald-700 ring-1 ring-emerald-100">
                                        {acao}
                                    </span>
                                )) : (
                                    <span className="rounded-full bg-white px-3 py-1.5 text-[11px] font-black text-slate-400 ring-1 ring-slate-100">
                                        Nenhuma ação liberada
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="rounded-3xl bg-red-50 p-4 ring-1 ring-red-100">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-red-700" />
                                <p className="text-xs font-black uppercase tracking-wide text-red-700">Não deve fazer</p>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                                {perfilSelecionado.acoesRestritas.length > 0 ? perfilSelecionado.acoesRestritas.map((acao) => (
                                    <span key={acao} className="rounded-full bg-white px-3 py-1.5 text-[11px] font-black text-red-700 ring-1 ring-red-100">
                                        {acao}
                                    </span>
                                )) : (
                                    <span className="rounded-full bg-white px-3 py-1.5 text-[11px] font-black text-slate-400 ring-1 ring-slate-100">
                                        Sem restrição padrão
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="rounded-3xl bg-white p-4 ring-1 ring-slate-100">
                            <p className="text-xs font-black uppercase tracking-wide text-slate-400">Observação de uso</p>
                            <p className="mt-2 text-xs font-semibold leading-relaxed text-slate-600">{perfilSelecionado.observacao}</p>
                        </div>
                    </div>
                </div>
            ) : null}

            <div className="mt-5 rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-100">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-xs font-black uppercase tracking-wide text-slate-400">Comparativo rápido</p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">Use este resumo para validar se o perfil escolhido combina com a função do usuário.</p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1.5 text-[11px] font-black text-slate-500 ring-1 ring-slate-200">
                        {ACOES_USUARIOS_PERMISSOES_PLANEJADAS.length} ações avaliadas
                    </span>
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                    {PERMISSOES_PADRAO_USUARIOS_POR_PERFIL.map((perfil) => (
                        <button
                            key={`resumo-${perfil.chave}`}
                            type="button"
                            onClick={() => setPerfilAtivo(perfil.chave)}
                            className={`rounded-2xl p-3 text-left ring-1 transition hover:-translate-y-0.5 hover:shadow-sm ${
                                perfilAtivo === perfil.chave
                                    ? "bg-blue-50 ring-blue-200"
                                    : "bg-white ring-slate-100 hover:ring-slate-200"
                            }`}
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <p className="text-sm font-black text-slate-950">{perfil.perfil}</p>
                                    <p className="mt-0.5 text-[10px] font-black uppercase tracking-wide text-slate-400">{perfil.nivel}</p>
                                </div>
                                <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-slate-500 ring-1 ring-slate-200">
                                    Rever
                                </span>
                            </div>
                            <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
                                <div className="rounded-xl bg-slate-50 px-2 py-2 ring-1 ring-slate-100">
                                    <p className="text-sm font-black text-slate-800">{perfil.modulosLiberados.length}</p>
                                    <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">módulos</p>
                                </div>
                                <div className="rounded-xl bg-emerald-50 px-2 py-2 ring-1 ring-emerald-100">
                                    <p className="text-sm font-black text-emerald-700">{perfil.acoesLiberadas.length}</p>
                                    <p className="text-[9px] font-black uppercase tracking-wide text-emerald-700">pode</p>
                                </div>
                                <div className="rounded-xl bg-red-50 px-2 py-2 ring-1 ring-red-100">
                                    <p className="text-sm font-black text-red-700">{perfil.acoesRestritas.length}</p>
                                    <p className="text-[9px] font-black uppercase tracking-wide text-red-700">não pode</p>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </Card>
    );
}

export function AcessosAppPage({ usuario = null }) {
    const nomeUsuario = obterNomeUsuario(usuario);
    const totalPerfis = PERFIS_USUARIOS_PERMISSOES_PLANEJADOS.length;
    const totalPerfisPadrao = PERMISSOES_PADRAO_USUARIOS_POR_PERFIL.length;

    return (
        <div className="page-shell space-y-5">
            <Card className="overflow-hidden border border-slate-200 bg-white p-0 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
                <div className="grid gap-0 lg:grid-cols-[0.58fr_0.42fr]">
                    <section className="px-6 py-7 sm:px-8">
                        <div className="flex flex-wrap items-center gap-3">
                            <BadgeEtapa variante="sucesso">Nova aba administrativa</BadgeEtapa>
                            <BadgeEtapa>Roteiro 14 · Pacote 3A</BadgeEtapa>
                        </div>
                        <h2 className="mt-5 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                            Acessos do App
                        </h2>
                        <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-slate-500">
                            Central para cadastrar pessoas, criar login real, revisar perfis, bloquear usuários e controlar permissões de acesso ao sistema SST.
                        </p>
                        <div className="mt-6 rounded-3xl border border-orange-100 bg-orange-50/70 p-4 text-sm font-bold leading-6 text-orange-800">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={2.2} />
                                <p>
                                    Esta etapa move a revisão dos perfis padrão para Acessos do App. A criação real de login no Supabase Auth continuará para etapa separada por Edge Function segura.
                                </p>
                            </div>
                        </div>
                    </section>

                    <aside className="border-t border-slate-200 bg-slate-50/80 px-6 py-7 sm:px-8 lg:border-l lg:border-t-0">
                        <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Resumo do acesso</p>
                        <div className="mt-4 space-y-3">
                            <div className="rounded-3xl bg-white p-4 ring-1 ring-slate-200">
                                <p className="text-xs font-black text-slate-400">Usuário atual</p>
                                <p className="mt-1 text-base font-black text-slate-950">{nomeUsuario}</p>
                                <p className="mt-1 text-xs font-bold text-slate-500">{usuario?.email || "E-mail não informado"}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-3xl bg-white p-4 text-center ring-1 ring-slate-200">
                                    <p className="text-2xl font-black text-slate-950">{totalPerfis}</p>
                                    <p className="mt-1 text-xs font-black text-slate-400">Perfis</p>
                                </div>
                                <div className="rounded-3xl bg-white p-4 text-center ring-1 ring-slate-200">
                                    <p className="text-2xl font-black text-slate-950">{totalPerfisPadrao}</p>
                                    <p className="mt-1 text-xs font-black text-slate-400">Perfis padrão</p>
                                </div>
                            </div>
                        </div>
                    </aside>
                </div>
            </Card>

            <div className="grid gap-4 xl:grid-cols-5">
                {CARDS_ACESSOS_APP.map((item, indice) => (
                    <CardFuncionalidade key={item.titulo} item={item} indice={indice} />
                ))}
            </div>

            <RevisaoPerfisPadrao />

            <div className="grid gap-4 lg:grid-cols-[0.45fr_0.55fr]">
                <Card className="border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
                            <KeyRound className="h-5 w-5" strokeWidth={2.2} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-950">Fluxo aprovado</h3>
                            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                                O administrador criará o login com senha temporária. No primeiro acesso, o usuário deverá trocar a senha antes de usar o sistema normalmente.
                            </p>
                        </div>
                    </div>
                    <div className="mt-5 space-y-3 text-sm font-bold text-slate-600">
                        {[
                            "Criar usuário no Supabase Auth somente por Edge Function.",
                            "Salvar perfil e permissões em usuarios_permissoes_sistema.",
                            "Nunca gravar senha temporária em tabela comum.",
                            "Registrar alterações na Auditoria do Sistema.",
                        ].map((item) => (
                            <div key={item} className="flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
                                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" strokeWidth={2.4} />
                                <span>{item}</span>
                            </div>
                        ))}
                    </div>
                </Card>

                <Card className="border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                            <UserCog className="h-5 w-5" strokeWidth={2.2} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-950">Separação da Configurações</h3>
                            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                                A revisão completa dos perfis padrão já fica em Acessos do App. Nas próximas microetapas, usuários cadastrados e solicitações também serão movidos para cá.
                            </p>
                        </div>
                    </div>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-100">
                            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Fica em Configurações</p>
                            <p className="mt-2 text-sm font-bold leading-6 text-slate-600">
                                Storage, limites, token público, eventos, senha crítica, checklists e Supabase/RLS/RPC.
                            </p>
                        </div>
                        <div className="rounded-3xl bg-emerald-50 p-4 ring-1 ring-emerald-100">
                            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">Vem para Acessos</p>
                            <p className="mt-2 text-sm font-bold leading-6 text-emerald-700">
                                Usuários, login, senha temporária, perfis, solicitações, bloqueios e permissões por módulo.
                            </p>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}

export default AcessosAppPage;
