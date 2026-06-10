import React, { useState } from "react";
import { ChevronDown, ShieldCheck } from "lucide-react";
import { classNames } from "../../utils/sstUtils";

const PERFIS_USUARIO_LABEL = {
    administrador: "Administrador",
    tecnico_sst: "Técnico SST",
    auditor: "Auditor",
    gestor: "Gestor",
    consulta: "Consulta",
    bloqueado: "Bloqueado",
};

function formatarPerfilUsuario(perfil = "") {
    const chave = String(perfil || "").trim().toLowerCase();
    return PERFIS_USUARIO_LABEL[chave] || perfil || "Perfil não informado";
}

function obterNomeUsuario(usuario = null, email = "") {
    const nome = String(usuario?.nome || usuario?.name || usuario?.displayName || "").trim();
    if (nome) return nome;

    const emailTratado = String(email || "").trim();
    if (emailTratado.includes("@")) return emailTratado.split("@")[0];

    return "Usuário logado";
}

export function AppSidebar({
    nav = [],
    tela,
    menuLateralAberto,
    setMenuLateralAberto,
    usuario,
    sair,
    onSelecionarTela,
}) {
    const [expandidoPorHover, setExpandidoPorHover] = useState(false);
    const [usuarioLogadoAberto, setUsuarioLogadoAberto] = useState(false);
    const menuExpandido = menuLateralAberto || expandidoPorHover;
    const emailUsuario = usuario?.email || "e-mail não informado";
    const nomeUsuario = obterNomeUsuario(usuario, emailUsuario);
    const funcaoUsuario = usuario?.funcao || usuario?.cargo || "Função não informada";
    const perfilUsuario = formatarPerfilUsuario(usuario?.perfil);

    const abrirTemporariamente = () => {
        if (!menuLateralAberto) {
            setExpandidoPorHover(true);
        }
    };

    const fecharTemporariamente = () => {
        setExpandidoPorHover(false);
    };

    const alternarMenuFixo = () => {
        setExpandidoPorHover(false);
        setMenuLateralAberto((valor) => !valor);
    };

    return (
        <aside
            data-sidebar-expanded={menuExpandido ? "true" : "false"}
            onMouseEnter={abrirTemporariamente}
            onMouseLeave={fecharTemporariamente}
            className={classNames(
                "app-sidebar hidden h-screen max-h-screen overflow-hidden border-r border-slate-200 bg-white transition-all duration-300 lg:flex lg:flex-col",
                menuExpandido ? "w-72 p-4" : "w-20 p-3"
            )}
        >
            <div
                className={classNames(
                    "app-sidebar-brand flex items-center bg-slate-950 text-white shadow-sm",
                    menuExpandido ? "gap-3 rounded-3xl p-3" : "mx-auto h-12 w-12 justify-center rounded-2xl p-0"
                )}
            >
                <div
                    className={classNames(
                        "app-sidebar-brand-icon flex shrink-0 items-center justify-center rounded-2xl",
                        menuExpandido ? "h-10 w-10 bg-white/10" : "h-12 w-12 bg-transparent"
                    )}
                >
                    <ShieldCheck className={classNames("shrink-0", menuExpandido ? "h-5 w-5" : "h-5 w-5")} />
                </div>
                {menuExpandido && (
                    <div className="min-w-0 flex-1">
                        <h1 className="truncate font-bold">Controle SST QR</h1>
                        <p className="truncate text-xs text-slate-300">Treinamentos · Terceiros</p>
                    </div>
                )}
            </div>

            <button
                type="button"
                onClick={alternarMenuFixo}
                className={classNames(
                    "app-sidebar-toggle mt-2 flex items-center justify-center gap-2 rounded-2xl bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100",
                    menuExpandido ? "w-full" : "mx-auto h-10 w-10 px-0"
                )}
                title={menuLateralAberto ? "Fixar menu recolhido" : "Fixar menu aberto"}
            >
                <span className="text-base leading-none">{menuExpandido ? "‹" : "›"}</span>
                {menuExpandido && <span>{menuLateralAberto ? "Ocultar menu" : "Fixar menu"}</span>}
            </button>

            <nav
                className={classNames(
                    "app-sidebar-nav mt-4 min-h-0 flex-1 overflow-hidden",
                    menuExpandido ? "space-y-1" : "grid justify-items-center gap-2"
                )}
            >
                {nav.map((item) => {
                    const Icon = item.icon;

                    return (
                        <button
                            key={item.id}
                            onClick={() => onSelecionarTela(item.id, item.label)}
                            className={classNames(
                                "app-sidebar-nav-button flex items-center rounded-2xl text-left text-sm font-medium transition",
                                menuExpandido ? "w-full gap-3 px-3 py-2" : "h-10 w-10 justify-center p-0",
                                tela === item.id
                                    ? "bg-slate-950 text-white shadow-sm"
                                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                            )}
                            title={!menuExpandido ? item.label : undefined}
                        >
                            <Icon className="app-sidebar-nav-icon h-4 w-4 shrink-0" />
                            {menuExpandido && <span className="truncate">{item.label}</span>}
                        </button>
                    );
                })}
            </nav>

            {menuExpandido ? (
                <div className="app-sidebar-user mt-3 rounded-3xl bg-slate-50 p-3 ring-1 ring-slate-100">
                    <button
                        type="button"
                        onClick={() => setUsuarioLogadoAberto((valor) => !valor)}
                        className="flex w-full items-center justify-between gap-3 text-left"
                        aria-expanded={usuarioLogadoAberto}
                    >
                        <div className="min-w-0 flex-1">
                            <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-slate-400">Usuário logado</p>
                            <p className="mt-1 truncate text-sm font-bold leading-5 text-slate-950" title={nomeUsuario}>
                                {nomeUsuario}
                            </p>
                            <p className="truncate text-[0.7rem] font-semibold leading-4 text-slate-500" title={perfilUsuario}>
                                {perfilUsuario}
                            </p>
                        </div>

                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-500 ring-1 ring-slate-200 transition hover:bg-slate-100">
                            <ChevronDown
                                className={classNames(
                                    "h-4 w-4 transition-transform duration-200",
                                    usuarioLogadoAberto ? "rotate-180" : "rotate-0"
                                )}
                            />
                        </span>
                    </button>

                    {usuarioLogadoAberto && (
                        <div className="mt-3 min-w-0 space-y-1.5 border-t border-slate-200 pt-3">
                            <div>
                                <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-slate-400">Função</p>
                                <p className="truncate text-xs font-semibold leading-5 text-slate-600" title={funcaoUsuario}>
                                    {funcaoUsuario}
                                </p>
                            </div>

                            <div>
                                <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-slate-400">Perfil</p>
                                <p className="truncate text-xs font-bold leading-5 text-slate-950" title={perfilUsuario}>
                                    {perfilUsuario}
                                </p>
                            </div>

                            <div>
                                <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-slate-400">E-mail</p>
                                <p className="truncate text-[0.72rem] font-semibold leading-4 text-slate-700" title={emailUsuario}>
                                    {emailUsuario}
                                </p>
                            </div>

                            <button
                                onClick={sair}
                                className="mt-2 rounded-xl bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"
                            >
                                Sair
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="app-sidebar-user-compact mt-4 flex justify-center">
                    <button
                        onClick={sair}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-50 text-xs font-bold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"
                        title={`Sair de ${nomeUsuario} · ${perfilUsuario} · ${emailUsuario}`}
                    >
                        Sair
                    </button>
                </div>
            )}
        </aside>
    );
}
