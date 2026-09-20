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
                        label:
                            "Painel Mestre",
                        Icone:
                            LayoutDashboard,
                        ativo:
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
                        label:
                            "Clientes",
                        Icone:
                            Building2,
                    },
                    {
                        label:
                            "Novo cliente",
                        Icone:
                            UserPlus,
                    },
                ],
        },
        {
            titulo:
                "PLATAFORMA",
            itens:
                [
                    {
                        label:
                            "Domínios",
                        Icone:
                            Globe2,
                    },
                    {
                        label:
                            "Auditoria",
                        Icone:
                            ScrollText,
                    },
                    {
                        label:
                            "Configurações",
                        Icone:
                            Settings,
                    },
                ],
        },
    ];

export function TenantAdminSidebar({
    usuario,
    onSair,
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

                                        return (
                                            <button
                                                key={item.label}
                                                type="button"
                                                disabled={!item.ativo}
                                                className={
                                                    item.ativo
                                                        ? "flex w-full items-center gap-3 rounded-xl bg-emerald-500/10 px-3 py-2.5 text-sm font-semibold text-emerald-200"
                                                        : "flex w-full cursor-default items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-500"
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
                        onClick={onSair}
                        className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-xs text-slate-400 hover:text-white"
                    >
                        <LogOut className="h-3.5 w-3.5" />
                        Sair
                    </button>
                </div>
            </div>
        </aside>
    );
}