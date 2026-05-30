import React from "react";
import { ShieldCheck } from "lucide-react";
import { classNames } from "../../utils/sstUtils";

export function AppSidebar({
    nav = [],
    tela,
    menuLateralAberto,
    setMenuLateralAberto,
    usuario,
    sair,
    onSelecionarTela,
}) {
    return (
        <aside
            className={classNames(
                "app-sidebar hidden border-r border-slate-200 bg-white transition-all duration-300 lg:block",
                menuLateralAberto ? "w-72 p-5" : "w-20 p-3"
            )}
        >
            <div className={classNames(
                "flex items-center bg-slate-950 text-white shadow-sm",
                menuLateralAberto ? "gap-3 rounded-3xl p-4" : "mx-auto h-12 w-12 justify-center rounded-2xl p-0"
            )}>
                <div className={classNames(
                    "flex shrink-0 items-center justify-center rounded-2xl bg-white/10",
                    menuLateralAberto ? "h-12 w-12" : "h-10 w-10"
                )}>
                    <ShieldCheck className="h-6 w-6" />
                </div>
                {menuLateralAberto && (
                    <div className="min-w-0 flex-1">
                        <h1 className="truncate font-bold">Controle SST QR</h1>
                        <p className="truncate text-xs text-slate-300">Treinamentos · Terceiros</p>
                    </div>
                )}
            </div>

            <button
                type="button"
                onClick={() => setMenuLateralAberto((valor) => !valor)}
                className={classNames(
                    "mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100",
                    !menuLateralAberto && "h-10 px-0"
                )}
                title={menuLateralAberto ? "Ocultar menu lateral" : "Abrir menu lateral"}
            >
                <span className="text-base leading-none">{menuLateralAberto ? "‹" : "›"}</span>
                {menuLateralAberto && <span>Ocultar menu</span>}
            </button>

            <nav className="mt-6 space-y-2">
                {nav.map((item) => {
                    const Icon = item.icon;

                    return (
                        <button
                            key={item.id}
                            onClick={() => onSelecionarTela(item.id, item.label)}
                            className={classNames(
                                "flex w-full items-center rounded-2xl text-left text-sm font-medium transition",
                                menuLateralAberto ? "gap-3 px-4 py-3" : "justify-center px-0 py-3",
                                tela === item.id
                                    ? "bg-slate-950 text-white shadow-sm"
                                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                            )}
                            title={!menuLateralAberto ? item.label : undefined}
                        >
                            <Icon className="h-4 w-4 shrink-0" />
                            {menuLateralAberto && <span className="truncate">{item.label}</span>}
                        </button>
                    );
                })}
            </nav>

            {menuLateralAberto ? (
                <div className="mt-6 rounded-3xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Usuário logado</p>
                    <p className="mt-1 break-all text-sm font-bold text-slate-900">{usuario.email}</p>
                    <p className="mt-1 text-xs text-slate-500">Perfil: {usuario.perfil}</p>

                    <button
                        onClick={sair}
                        className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"
                    >
                        Sair
                    </button>
                </div>
            ) : (
                <div className="mt-6 flex justify-center">
                    <button
                        onClick={sair}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-50 text-xs font-bold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"
                        title={`Sair de ${usuario.email}`}
                    >
                        Sair
                    </button>
                </div>
            )}
        </aside>
    );
}
