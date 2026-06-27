import React, { useMemo, useState } from "react";
import { ChevronDown, ChevronsLeft, LogOut, ShieldCheck } from "lucide-react";
import { classNames } from "../../utils/sstUtils";
import sidebarBackground from "../../assets/hero.png";

const PERFIS_USUARIO_LABEL = {
    administrador: "Administrador",
    tecnico_sst: "T\u00e9cnico SST",
    auditor: "Auditor",
    gestor: "Gestor",
    consulta: "Consulta",
    bloqueado: "Bloqueado",
};

function formatarPerfilUsuario(perfil = "") {
    const chave = String(perfil || "").trim().toLowerCase();
    return PERFIS_USUARIO_LABEL[chave] || perfil || "Perfil n\u00e3o informado";
}

function obterNomeUsuario(usuario = null, email = "") {
    const nome = String(usuario?.nome || usuario?.name || usuario?.displayName || "").trim();
    if (nome) return nome;

    const emailTratado = String(email || "").trim();
    if (emailTratado.includes("@")) return emailTratado.split("@")[0];

    return "Usu\u00e1rio logado";
}

function obterIniciaisUsuario(nome = "", email = "") {
    const base = String(nome || email || "US").trim().replace(/@.*/, "");
    const partes = base.split(/\s+/).filter(Boolean).slice(0, 2);
    const iniciais = partes.map((parte) => parte[0] || "").join("").padEnd(2, "S");
    return iniciais.slice(0, 2).toUpperCase();
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
    const [gruposFechados, setGruposFechados] = useState({});
    const menuExpandido = menuLateralAberto || expandidoPorHover;

    const emailUsuario = usuario?.email || "e-mail n\u00e3o informado";
    const nomeUsuario = obterNomeUsuario(usuario, emailUsuario);
    const funcaoUsuario = usuario?.funcao || usuario?.cargo || "Fun\u00e7\u00e3o n\u00e3o informada";
    const perfilUsuario = formatarPerfilUsuario(usuario?.perfil);

    const fotoUsuario = String(
        usuario?.fotoUrl
        || usuario?.foto_url
        || usuario?.foto
        || usuario?.avatarUrl
        || usuario?.avatar_url
        || usuario?.photoURL
        || usuario?.picture
        || usuario?.user_metadata?.avatar_url
        || usuario?.user_metadata?.picture
        || usuario?.user_metadata?.photoURL
        || ""
    ).trim();

    const iniciaisUsuario = obterIniciaisUsuario(nomeUsuario, emailUsuario);

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

    const alternarGrupo = (titulo) => {
        setGruposFechados((valorAtual) => ({
            ...valorAtual,
            [titulo]: !valorAtual[titulo],
        }));
    };

    const gruposNavegacao = useMemo(() => {
        const ordemGrupos = ["VIS\u00c3O GERAL", "AUDITORIA", "CADASTROS", "SISTEMA"];

        return ordemGrupos
            .map((titulo) => ({
                titulo,
                itens: (nav || []).filter((item) => item.grupo === titulo),
            }))
            .filter((grupo) => grupo.itens.length > 0);
    }, [nav]);

    return (
        <aside
            data-sidebar-expanded={menuExpandido ? "true" : "false"}
            onMouseEnter={abrirTemporariamente}
            onMouseLeave={fecharTemporariamente}
            className={classNames(
                "app-sidebar hidden h-screen max-h-screen overflow-hidden border-r border-[#253247] bg-[#1A2332] bg-cover bg-center text-[#A8B8C8] transition-all duration-300 lg:flex lg:flex-col",
                menuExpandido ? "w-[264px] p-4" : "w-16 p-3"
            )}
            style={{
                backgroundImage: `linear-gradient(rgba(10, 18, 32, 0.78), rgba(8, 13, 23, 0.92)), url(${sidebarBackground})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
            }}
        >
            <div
                className={classNames(
                    "app-sidebar-brand flex items-center bg-[#101827]/90 text-white shadow-sm ring-1 ring-white/10",
                    menuExpandido ? "gap-3 rounded-3xl p-3" : "mx-auto h-12 w-12 justify-center rounded-2xl p-0"
                )}
            >
                <div
                    className={classNames(
                        "app-sidebar-brand-icon flex shrink-0 items-center justify-center rounded-2xl",
                        menuExpandido ? "h-10 w-10 bg-[#1E7C3A]" : "h-12 w-12 bg-transparent"
                    )}
                >
                    <ShieldCheck className={classNames("shrink-0", menuExpandido ? "h-5 w-5" : "h-5 w-5")} />
                </div>

                {menuExpandido && (
                    <div className="min-w-0 flex-1">
                        <h1 className="truncate font-bold">SafeScan Brasil</h1>
                        <p className="truncate text-xs text-[#A8B8C8]">Controle de SST</p>
                    </div>
                )}
            </div>

            <nav
                className={classNames(
                    "app-sidebar-nav mt-5 min-h-0 flex-1 overflow-y-auto pr-1",
                    menuExpandido ? "space-y-1" : "grid justify-items-center gap-2"
                )}
            >
                {gruposNavegacao.map((grupo, indiceGrupo) => {
                    const grupoFechado = Boolean(gruposFechados[grupo.titulo]);
                    const itensVisiveis = grupoFechado
                        ? grupo.itens.filter((item) => !menuExpandido && item.id === tela)
                        : grupo.itens;

                    return (
                        <div
                            key={grupo.titulo}
                            className={classNames(
                                "app-sidebar-nav-group",
                                indiceGrupo > 0 && (menuExpandido ? "mt-4 border-t border-white/10 pt-3" : "mt-3 border-t border-white/10 pt-3")
                            )}
                        >
                            {menuExpandido && (
                                <button
                                    type="button"
                                    onClick={() => alternarGrupo(grupo.titulo)}
                                    className="mb-2 flex w-full items-center justify-between gap-2 px-3 text-left text-[10px] font-black uppercase tracking-[0.18em] text-[#7E8EA3] transition hover:text-white"
                                    title={grupoFechado ? `Abrir ${grupo.titulo}` : `Fechar ${grupo.titulo}`}
                                >
                                    <span>{grupo.titulo}</span>
                                    <ChevronDown
                                        className={classNames(
                                            "h-3.5 w-3.5 shrink-0 transition-transform duration-200",
                                            grupoFechado ? "-rotate-90" : "rotate-0"
                                        )}
                                    />
                                </button>
                            )}

                            {itensVisiveis.length > 0 && (
                                <div className={menuExpandido ? "space-y-1" : "grid justify-items-center gap-2"}>
                                    {itensVisiveis.map((item) => {
                                        const Icon = item.icon;

                                        return (
                                            <button
                                                key={item.id}
                                                onClick={() => onSelecionarTela(item.id, item.label)}
                                                className={classNames(
                                                    "app-sidebar-nav-button flex items-center rounded-2xl text-left text-sm font-medium transition",
                                                    menuExpandido ? "w-full gap-3 px-3 py-2" : "h-10 w-10 justify-center p-0",
                                                    tela === item.id
                                                        ? "bg-[#1E7C3A] text-white shadow-sm"
                                                        : "text-[#A8B8C8] hover:bg-white/5 hover:text-white"
                                                )}
                                                title={!menuExpandido ? `${grupo.titulo} - ${item.label}` : undefined}
                                            >
                                                <Icon className="app-sidebar-nav-icon h-4 w-4 shrink-0" />
                                                {menuExpandido && <span className="truncate">{item.label}</span>}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </nav>

            {menuExpandido ? (
                <div className="app-sidebar-user mt-3 rounded-3xl bg-[#101827]/90 p-3 text-white ring-1 ring-white/10">
                    <button
                        type="button"
                        onClick={() => setUsuarioLogadoAberto((valor) => !valor)}
                        className="flex w-full items-center justify-between gap-3 text-left"
                        aria-expanded={usuarioLogadoAberto}
                    >
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                            {fotoUsuario ? (
                                <img
                                    src={fotoUsuario}
                                    alt={nomeUsuario}
                                    className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-white/15"
                                />
                            ) : (
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1E7C3A] text-[0.68rem] font-black uppercase text-white ring-2 ring-white/15">
                                    {iniciaisUsuario}
                                </span>
                            )}

                            <div className="min-w-0 flex-1">
                                <p className="truncate text-[0.78rem] font-bold leading-4 text-white" title={nomeUsuario}>
                                    {nomeUsuario}
                                </p>
                                <p className="truncate text-[0.66rem] font-semibold leading-4 text-[#A8B8C8]" title={perfilUsuario}>
                                    {perfilUsuario}
                                </p>
                            </div>
                        </div>

                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-2xl bg-white/5 text-[#A8B8C8] ring-1 ring-white/10 transition hover:bg-white/10 hover:text-white">
                            <ChevronDown
                                className={classNames(
                                    "h-4 w-4 transition-transform duration-200",
                                    usuarioLogadoAberto ? "rotate-180" : "rotate-0"
                                )}
                            />
                        </span>
                    </button>

                    {usuarioLogadoAberto && (
                        <div className="mt-3 min-w-0 space-y-1.5 border-t border-white/10 pt-3">
                            <div>
                                <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-[#7E8EA3]">{"Fun\u00e7\u00e3o"}</p>
                                <p className="truncate text-xs font-semibold leading-5 text-[#A8B8C8]" title={funcaoUsuario}>
                                    {funcaoUsuario}
                                </p>
                            </div>

                            <div>
                                <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-[#7E8EA3]">E-mail</p>
                                <p className="truncate text-[0.72rem] font-semibold leading-4 text-[#A8B8C8]" title={emailUsuario}>
                                    {emailUsuario}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="app-sidebar-user-compact mt-4 flex justify-center">
                    {fotoUsuario ? (
                        <img
                            src={fotoUsuario}
                            alt={nomeUsuario}
                            className="h-10 w-10 rounded-full object-cover ring-2 ring-white/15"
                            title={`${nomeUsuario} - ${perfilUsuario} - ${emailUsuario}`}
                        />
                    ) : (
                        <span
                            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-[0.6rem] font-bold uppercase tracking-wide text-[#A8B8C8] ring-1 ring-white/10"
                            title={`${nomeUsuario} - ${perfilUsuario} - ${emailUsuario}`}
                        >
                            {iniciaisUsuario}
                        </span>
                    )}
                </div>
            )}

            <div
                className={classNames(
                    "mt-3 grid shrink-0 gap-2",
                    menuExpandido ? "grid-cols-2" : "grid-cols-1"
                )}
            >
                <button
                    onClick={sair}
                    className={classNames(
                        "app-sidebar-logout flex items-center justify-center gap-2 rounded-2xl bg-white/5 text-xs font-semibold text-[#A8B8C8] ring-1 ring-white/10 transition hover:bg-white/10 hover:text-white",
                        menuExpandido ? "px-2 py-2" : "mx-auto h-10 w-10 px-0"
                    )}
                    title={`Sair de ${nomeUsuario}`}
                >
                    <LogOut className="h-4 w-4 shrink-0" />
                    {menuExpandido && <span>Sair</span>}
                </button>

                <button
                    type="button"
                    onClick={alternarMenuFixo}
                    className={classNames(
                        "app-sidebar-toggle flex items-center justify-center gap-2 rounded-2xl bg-white/5 text-xs font-semibold text-[#A8B8C8] ring-1 ring-white/10 transition hover:bg-white/10 hover:text-white",
                        menuExpandido ? "px-2 py-2" : "mx-auto h-10 w-10 px-0"
                    )}
                    title={menuLateralAberto ? "Recolher menu" : "Fixar menu"}
                >
                    <ChevronsLeft
                        className={classNames(
                            "h-4 w-4 shrink-0 transition-transform duration-200",
                            menuExpandido ? "rotate-0" : "rotate-180"
                        )}
                    />
                    {menuExpandido && <span>Recolher</span>}
                </button>
            </div>
        </aside>
    );
}
