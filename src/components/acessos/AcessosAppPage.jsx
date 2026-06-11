import React from "react";
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
        status: "Base já existente",
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
                <BadgeEtapa variante={indice === 0 ? "alerta" : "info"}>{item.status}</BadgeEtapa>
            </div>
            <p className="mt-4 text-sm font-semibold leading-6 text-slate-500">{item.descricao}</p>
        </article>
    );
}

export function AcessosAppPage({ usuario = null }) {
    const nomeUsuario = obterNomeUsuario(usuario);
    const totalPerfis = PERFIS_USUARIOS_PERMISSOES_PLANEJADOS.length;
    const totalModelos = PERMISSOES_PADRAO_USUARIOS_POR_PERFIL.length;

    return (
        <div className="page-shell space-y-5">
            <Card className="overflow-hidden border border-slate-200 bg-white p-0 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
                <div className="grid gap-0 lg:grid-cols-[0.58fr_0.42fr]">
                    <section className="px-6 py-7 sm:px-8">
                        <div className="flex flex-wrap items-center gap-3">
                            <BadgeEtapa variante="sucesso">Nova aba administrativa</BadgeEtapa>
                            <BadgeEtapa>Roteiro 14 · Pacote 2A</BadgeEtapa>
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
                                    Esta primeira entrega cria a estrutura visual e a rota. A criação real de login no Supabase Auth será feita em etapa separada por Edge Function segura, sem expor service_role no front-end.
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
                                    <p className="text-2xl font-black text-slate-950">{totalModelos}</p>
                                    <p className="mt-1 text-xs font-black text-slate-400">Modelos</p>
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
                                Nesta etapa a aba Configurações ainda permanece intacta. Na próxima microetapa, os blocos de pessoas, perfis e solicitações serão movidos para cá.
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
                        <div className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-100">
                            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Vem para Acessos</p>
                            <p className="mt-2 text-sm font-bold leading-6 text-slate-600">
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
