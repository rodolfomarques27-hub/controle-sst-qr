import {
    Building2,
    ChevronDown,
    ChevronsLeft,
    Globe2,
    LayoutDashboard,
    LogOut,
    ScrollText,
    Settings,
    ShieldCheck,
    UserPlus,
} from "lucide-react";

import {
    useState,
} from "react";

import sidebarBackground from "../../../assets/sidebar-construcao.webp";

const CHAVE_GRUPOS_ADMIN =
    "safescan:tenant-admin:grupos-fechados";

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

function classNames(
    ...classes
) {
    return classes
        .filter(
            Boolean
        )
        .join(
            " "
        );
}

function lerGruposFechados() {
    if (
        typeof window ===
        "undefined"
    ) {
        return {};
    }

    try {
        const bruto =
            window.localStorage.getItem(
                CHAVE_GRUPOS_ADMIN
            );

        if (!bruto) {
            return {};
        }

        const parseado =
            JSON.parse(
                bruto
            );

        if (
            Object.prototype.toString.call(
                parseado
            ) !==
            "[object Object]"
        ) {
            return {};
        }

        return parseado;
    } catch {
        return {};
    }
}

function salvarGruposFechados(
    valor
) {
    try {
        if (
            typeof window ===
            "undefined"
        ) {
            return;
        }

        window.localStorage.setItem(
            CHAVE_GRUPOS_ADMIN,
            JSON.stringify(
                valor
            )
        );
    } catch {
        // Preferência visual não pode bloquear o Painel Mestre.
    }
}

function obterEmail(
    usuario
) {
    return String(
        usuario?.email ||
        "E-mail não informado"
    ).trim();
}

function obterNome(
    usuario,
    email
) {
    const nome =
        String(
            usuario?.nome ||
            usuario?.name ||
            usuario?.displayName ||
            usuario?.user_metadata?.nome ||
            usuario?.user_metadata?.name ||
            ""
        ).trim();

    if (nome) {
        return nome;
    }

    if (
        email.includes(
            "@"
        )
    ) {
        return email
            .split(
                "@"
            )[0];
    }

    return "Administrador SafeScan";
}

function obterIniciais(
    nome,
    email
) {
    const base =
        String(
            nome ||
            email ||
            "AS"
        )
            .trim()
            .replace(
                /@.*/,
                ""
            );

    const partes =
        base
            .split(
                /\s+/
            )
            .filter(
                Boolean
            )
            .slice(
                0,
                2
            );

    return (
        partes
            .map(
                (parte) =>
                    parte
                        .charAt(0)
                        .toUpperCase()
            )
            .join("") ||
        "AS"
    );
}

function obterFoto(
    usuario
) {
    return String(
        usuario?.foto_url ||
        usuario?.fotoUrl ||
        usuario?.avatar_url ||
        usuario?.avatarUrl ||
        usuario?.picture ||
        usuario?.user_metadata?.foto_url ||
        usuario?.user_metadata?.avatar_url ||
        usuario?.user_metadata?.picture ||
        ""
    ).trim();
}

export function TenantAdminSidebar({
    usuario,
    onSair,
    secaoAtiva = "painel",
    onNavegar,
    menuLateralAberto,
    setMenuLateralAberto,
}) {
    const [
        expandidoPorHover,
        setExpandidoPorHover,
    ] =
        useState(
            false
        );

    const [
        hoverLiberado,
        setHoverLiberado,
    ] =
        useState(
            () =>
                Boolean(
                    menuLateralAberto
                )
        );

    const [
        usuarioAberto,
        setUsuarioAberto,
    ] =
        useState(
            false
        );

    const [
        gruposFechados,
        setGruposFechados,
    ] =
        useState(
            lerGruposFechados
        );

    const menuExpandido =
        menuLateralAberto ||
        expandidoPorHover;

    const email =
        obterEmail(
            usuario
        );

    const nome =
        obterNome(
            usuario,
            email
        );

    const iniciais =
        obterIniciais(
            nome,
            email
        );

    const foto =
        obterFoto(
            usuario
        );

    function abrirTemporariamente() {
        if (
            !menuLateralAberto &&
            hoverLiberado
        ) {
            setExpandidoPorHover(
                true
            );
        }
    }

    function fecharTemporariamente() {
        setExpandidoPorHover(
            false
        );

        setHoverLiberado(
            true
        );
    }

    function alternarMenuFixo() {
        const proximoAberto =
            !menuLateralAberto;

        setExpandidoPorHover(
            false
        );

        setHoverLiberado(
            proximoAberto
        );

        setMenuLateralAberto?.(
            proximoAberto
        );
    }

    function alternarGrupo(
        titulo
    ) {
        setGruposFechados(
            (estadoAtual) => {
                const proximoEstado = {
                    ...estadoAtual,
                    [titulo]:
                        !estadoAtual?.[
                            titulo
                        ],
                };

                salvarGruposFechados(
                    proximoEstado
                );

                return proximoEstado;
            }
        );
    }

    return (
        <aside
            data-sidebar-expanded={
                menuExpandido
                    ? "true"
                    : "false"
            }
            onMouseEnter={
                abrirTemporariamente
            }
            onMouseLeave={
                fecharTemporariamente
            }
            className={
                classNames(
                    "fixed inset-y-0 left-0 z-40 hidden h-screen max-h-screen flex-col overflow-hidden border-r border-[#253247] bg-[#1A2332] bg-cover bg-center text-[#A8B8C8] transition-all duration-300 lg:flex",
                    menuExpandido
                        ? "w-[264px] p-4"
                        : "w-16 p-3"
                )
            }
            style={{
                backgroundImage:
                    `linear-gradient(180deg, rgba(3, 8, 16, 0.86) 0%, rgba(5, 10, 18, 0.78) 42%, rgba(3, 6, 12, 0.94) 100%), linear-gradient(90deg, rgba(3, 8, 16, 0.92) 0%, rgba(3, 8, 16, 0.70) 62%, rgba(3, 8, 16, 0.42) 100%), url(${sidebarBackground})`,
                backgroundSize:
                    "cover",
                backgroundPosition:
                    "center top",
                textShadow:
                    "0 1px 2px rgba(0, 0, 0, 0.72)",
            }}
        >
            <div
                className={
                    classNames(
                        "flex min-w-0 items-center text-white",
                        menuExpandido
                            ? "w-full gap-2 px-0 py-1"
                            : "mx-auto h-10 w-10 justify-center p-0"
                    )
                }
            >
                <div
                    className={
                        classNames(
                            "flex shrink-0 items-center justify-center rounded-2xl bg-[#1E7C3A] shadow-sm shadow-black/30",
                            menuExpandido
                                ? "h-9 w-9"
                                : "h-10 w-10"
                        )
                    }
                >
                    <ShieldCheck
                    className={
                        menuExpandido
                            ? "h-5 w-5 shrink-0"
                            : "h-4 w-4 shrink-0"
                    }
                />
                </div>

                {menuExpandido && (
                    <div className="min-w-0 flex-1 overflow-hidden">
                        <h1
                            className="truncate text-[0.78rem] font-black leading-4 text-white drop-shadow"
                            title="SafeScan Brasil"
                        >
                            SafeScan Brasil
                        </h1>

                        <p
                            className="truncate text-[0.68rem] font-semibold leading-4 text-[#D7E0EA] drop-shadow"
                            title="Painel Mestre"
                        >
                            Painel Mestre
                        </p>
                    </div>
                )}
            </div>

            <nav
                className={
                    classNames(
                        "mt-5 min-h-0 flex-1 overflow-x-hidden overflow-y-auto pr-1",
                        menuExpandido
                            ? "space-y-1"
                            : "grid content-start justify-items-center gap-2"
                    )
                }
            >
                {grupos.map(
                    (
                        grupo,
                        indiceGrupo
                    ) => {
                        const grupoFechado =
                            Boolean(
                                gruposFechados[
                                    grupo.titulo
                                ]
                            );

                        const itensVisiveis =
                            grupoFechado
                                ? grupo.itens.filter(
                                    (item) =>
                                        !menuExpandido &&
                                        item.chave ===
                                            secaoAtiva
                                )
                                : grupo.itens;

                        return (
                            <div
                                key={
                                    grupo.titulo
                                }
                                className={
                                    classNames(
                                        indiceGrupo >
                                            0 &&
                                            (
                                                menuExpandido
                                                    ? "mt-4 border-t border-white/10 pt-3"
                                                    : "mt-3 border-t border-white/10 pt-3"
                                            )
                                    )
                                }
                            >
                                {menuExpandido && (
                                    <button
                                        type="button"
                                        onClick={
                                            () =>
                                                alternarGrupo(
                                                    grupo.titulo
                                                )
                                        }
                                        className="mb-2 flex w-full items-center justify-between gap-2 px-3 text-left text-[10px] font-black uppercase tracking-[0.18em] text-[#B7C4D6] transition hover:text-white"
                                        title={
                                            grupoFechado
                                                ? `Abrir ${grupo.titulo}`
                                                : `Fechar ${grupo.titulo}`
                                        }
                                    >
                                        <span>
                                            {
                                                grupo.titulo
                                            }
                                        </span>

                                        <ChevronDown
                                            className={
                                                classNames(
                                                    "h-3.5 w-3.5 shrink-0 transition-transform duration-200",
                                                    grupoFechado
                                                        ? "-rotate-90"
                                                        : "rotate-0"
                                                )
                                            }
                                        />
                                    </button>
                                )}

                                {itensVisiveis.length >
                                    0 && (
                                    <div
                                        className={
                                            menuExpandido
                                                ? "space-y-1"
                                                : "grid content-start justify-items-center gap-2"
                                        }
                                    >
                                        {itensVisiveis.map(
                                            (
                                                item
                                            ) => {
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
                                                        className={
                                                            classNames(
                                                                "flex items-center rounded-2xl text-left text-sm font-semibold transition",
                                                                menuExpandido
                                                                    ? "w-full gap-3 px-3 py-2"
                                                                    : "h-10 w-10 justify-center p-0",
                                                                ativo
                                                                    ? "bg-[#1E7C3A] text-white shadow-sm"
                                                                    : habilitado
                                                                        ? "text-[#E5ECF5] hover:bg-white/10 hover:text-white"
                                                                        : "cursor-not-allowed text-[#607087] opacity-70"
                                                            )
                                                        }
                                                        title={
                                                            !menuExpandido
                                                                ? item.label
                                                                : !habilitado
                                                                    ? `${item.label} — pendente no cronograma`
                                                                    : undefined
                                                        }
                                                    >
                                                        <Icone className="h-4 w-4 shrink-0" />

                                                        {menuExpandido && (
                                                            <span className="whitespace-nowrap text-[0.78rem] leading-tight">
                                                                {
                                                                    item.label
                                                                }
                                                            </span>
                                                        )}
                                                    </button>
                                                );
                                            }
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    }
                )}
            </nav>

            <div>
                {menuExpandido ? (
                    <div className="mt-3 rounded-3xl bg-[#101827]/90 p-3 text-white ring-1 ring-white/10">
                        <button
                            type="button"
                            onClick={
                                () =>
                                    setUsuarioAberto(
                                        (
                                            valor
                                        ) =>
                                            !valor
                                    )
                            }
                            className="flex w-full items-center justify-between gap-3 text-left"
                            aria-expanded={
                                usuarioAberto
                            }
                        >
                            <div className="flex min-w-0 flex-1 items-center gap-2">
                                {foto ? (
                                    <img
                                        src={
                                            foto
                                        }
                                        alt={
                                            nome
                                        }
                                        className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-white/15"
                                    />
                                ) : (
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1E7C3A] text-[0.68rem] font-black uppercase text-white ring-2 ring-white/15">
                                        {
                                            iniciais
                                        }
                                    </span>
                                )}

                                <div className="min-w-0 flex-1">
                                    <p
                                        className="truncate text-[0.78rem] font-bold leading-4 text-white"
                                        title={
                                            nome
                                        }
                                    >
                                        {
                                            nome
                                        }
                                    </p>

                                    <p className="truncate text-[0.66rem] font-semibold leading-4 text-[#A8B8C8]">
                                        Administrador global
                                    </p>
                                </div>
                            </div>

                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-2xl bg-white/5 text-[#A8B8C8] ring-1 ring-white/10 transition hover:bg-white/10 hover:text-white">
                                <ChevronDown
                                    className={
                                        classNames(
                                            "h-4 w-4 transition-transform duration-200",
                                            usuarioAberto
                                                ? "rotate-180"
                                                : "rotate-0"
                                        )
                                    }
                                />
                            </span>
                        </button>

                        {usuarioAberto && (
                            <div className="mt-3 min-w-0 space-y-1.5 border-t border-white/10 pt-3">
                                <div>
                                    <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-[#7E8EA3]">
                                        Perfil
                                    </p>

                                    <p className="truncate text-xs font-semibold leading-5 text-[#A8B8C8]">
                                        Administrador global
                                    </p>
                                </div>

                                <div>
                                    <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-[#7E8EA3]">
                                        E-mail
                                    </p>

                                    <p
                                        className="truncate text-[0.72rem] font-semibold leading-4 text-[#A8B8C8]"
                                        title={
                                            email
                                        }
                                    >
                                        {
                                            email
                                        }
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="mt-4 flex justify-center">
                        {foto ? (
                            <img
                                src={
                                    foto
                                }
                                alt={
                                    nome
                                }
                                className="h-9 w-9 rounded-full object-cover ring-2 ring-white/15"
                                title={`${nome} — Administrador global`}
                            />
                        ) : (
                            <span
                                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-[0.6rem] font-bold uppercase tracking-wide text-[#A8B8C8] ring-1 ring-white/10"
                                title={`${nome} — Administrador global`}
                            >
                                {
                                    iniciais
                                }
                            </span>
                        )}
                    </div>
                )}

                <div
                    className={
                        classNames(
                            "mt-3 grid shrink-0 gap-2",
                            menuExpandido
                                ? "grid-cols-2"
                                : "grid-cols-1"
                        )
                    }
                >
                    <button
                        type="button"
                        onClick={
                            onSair
                        }
                        className={
                            classNames(
                                "flex items-center justify-center gap-2 rounded-2xl bg-white/5 text-xs font-semibold text-[#A8B8C8] ring-1 ring-white/10 transition hover:bg-white/10 hover:text-white",
                                menuExpandido
                                    ? "px-2 py-2"
                                    : "mx-auto h-10 w-10 px-0"
                            )
                        }
                        title="Sair"
                        aria-label="Sair"
                    >
                        <LogOut className="h-4 w-4 shrink-0" />

                        {menuExpandido && (
                            <span>
                                Sair
                            </span>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={
                            alternarMenuFixo
                        }
                        className={
                            classNames(
                                "flex items-center justify-center gap-2 rounded-2xl bg-white/5 text-xs font-semibold text-[#A8B8C8] ring-1 ring-white/10 transition hover:bg-white/10 hover:text-white",
                                menuExpandido
                                    ? "px-2 py-2"
                                    : "mx-auto h-10 w-10 px-0"
                            )
                        }
                        title={
                            menuLateralAberto
                                ? "Recolher menu"
                                : "Fixar menu"
                        }
                        aria-label={
                            menuLateralAberto
                                ? "Recolher menu"
                                : "Fixar menu"
                        }
                    >
                        <ChevronsLeft
                            className={
                                classNames(
                                    "h-4 w-4 shrink-0 transition-transform duration-200",
                                    menuLateralAberto
                                        ? "rotate-0"
                                        : "rotate-180"
                                )
                            }
                        />

                        {menuExpandido && (
                            <span>
                                {
                                    menuLateralAberto
                                        ? "Recolher"
                                        : "Fixar"
                                }
                            </span>
                        )}
                    </button>
                </div>
            </div>
        </aside>
    );
}