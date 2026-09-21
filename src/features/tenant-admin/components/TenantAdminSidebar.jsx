import {
    Building2,
    Globe2,
    LayoutDashboard,
    LogOut,
    ScrollText,
    Settings,
    ShieldCheck,
    UserPlus,
} from "lucide-react";

const grupos =
    [
        {
            titulo:
                "VISÃO GERAL",
            itens:
                [
                    {
                        chave:
                            "painel",
                        label:
                            "Painel Mestre",
                        Icone:
                            LayoutDashboard,
                        habilitado:
                            true,
                    },
                    {
                        chave:
                            "infraestrutura",
                        label:
                            "Infraestrutura",
                        Icone:
                            ShieldCheck,
                        habilitado:
                            true,
                    },
                ],
        },
        {
            titulo:
                "CLIENTES",
            itens:
                [
                    {
                        chave:
                            "clientes",
                        label:
                            "Clientes",
                        Icone:
                            Building2,
                        habilitado:
                            true,
                    },
                    {
                        chave:
                            "novo-cliente",
                        label:
                            "Novo cliente",
                        Icone:
                            UserPlus,
                        habilitado:
                            true,
                    },
                ],
        },
        {
            titulo:
                "PLATAFORMA",
            itens:
                [
                    {
                        chave:
                            "dominios",
                        label:
                            "Domínios",
                        Icone:
                            Globe2,
                        habilitado:
                            false,
                    },
                    {
                        chave:
                            "auditoria",
                        label:
                            "Auditoria",
                        Icone:
                            ScrollText,
                        habilitado:
                            false,
                    },
                    {
                        chave:
                            "configuracoes",
                        label:
                            "Configurações",
                        Icone:
                            Settings,
                        habilitado:
                            false,
                    },
                ],
        },
    ];

export function TenantAdminSidebar({
    usuario,
    onSair,
    secaoAtiva = "painel",
    onNavegar,
}) {
    return (
        <aside className="fixed inset-y-0 left-0 hidden w-[270px] flex-col border-r border-white/5 bg-[#07140f] text-white lg:flex">
            <div className="border-b border-white/5 px-5 py-5">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/10">
                        <ShieldCheck className="h-5 w-5 text-emerald-300" />
                    </div>

                    <div>
                        <p className="text-sm font-bold">
                            SafeScan Brasil
                        </p>

                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-300/60">
                            Painel Mestre
                        </p>
                    </div>
                </div>
            </div>

            <nav className="flex-1 px-3 py-5">
                {grupos.map(
                    (grupo) => (
                        <div
                            key={grupo.titulo}
                            className="mb-6"
                        >
                            <p className="px-3 text-[9px] font-bold tracking-[0.18em] text-slate-500">
                                {grupo.titulo}
                            </p>

                            <div className="mt-2 space-y-1">
                                {grupo.itens.map(
                                    (item) => {
                                        const Icone =
                                            item.Icone;

                                        const ativo =
                                            secaoAtiva ===
                                            item.chave;

                                        const habilitado =
                                            item.habilitado ===
                                            true;

                                        return (
                                            <button
                                                key={
                                                    item.chave
                                                }
                                                type="button"
                                                disabled={
                                                    !habilitado
                                                }
                                                onClick={
                                                    habilitado
                                                        ? () =>
                                                            onNavegar?.(
                                                                item.chave
                                                            )
                                                        : undefined
                                                }
                                                title={
                                                    habilitado
                                                        ? item.label
                                                        : "Disponível no próximo bloco do Painel Mestre."
                                                }
                                                className={
                                                    ativo
                                                        ? "flex w-full items-center gap-3 rounded-xl bg-emerald-500/10 px-3 py-2.5 text-sm font-semibold text-emerald-200"
                                                        : habilitado
                                                            ? "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
                                                            : "flex w-full cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-600"
                                                }
                                            >
                                                <Icone className="h-4 w-4" />

                                                <span>
                                                    {item.label}
                                                </span>
                                            </button>
                                        );
                                    }
                                )}
                            </div>
                        </div>
                    )
                )}
            </nav>

            <div className="border-t border-white/5 p-3">
                <div className="rounded-xl bg-white/[0.035] p-3">
                    <p className="truncate text-xs font-semibold text-slate-200">
                        {usuario?.email}
                    </p>

                    <button
                        type="button"
                        onClick={
                            onSair
                        }
                        className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-xs text-slate-400 transition hover:text-white"
                    >
                        <LogOut className="h-3.5 w-3.5" />
                        Sair
                    </button>
                </div>
            </div>
        </aside>
    );
}