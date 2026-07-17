import React, { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronsLeft, LogOut, ShieldCheck } from "lucide-react";
import { classNames } from "../../utils/sstUtils";
import { supabase } from "../../lib/supabaseClient";
import sidebarBackground from "../../assets/sidebar-construcao.webp";

const BUCKET_FOTOS_USUARIOS_SIDEBAR = "fotos-colaboradores";

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

function obterFotoUsuarioSidebar(usuario = null) {
    const metadados = usuario?.user_metadata || {};
    return String(
        usuario?.foto_url
        || usuario?.fotoUrl
        || usuario?.fotoPerfil
        || usuario?.fotoPerfilUrl
        || usuario?.avatar_url
        || usuario?.avatarUrl
        || usuario?.photoURL
        || usuario?.picture
        || usuario?.imagem
        || usuario?.imagem_url
        || metadados?.foto_url
        || metadados?.fotoUrl
        || metadados?.fotoPerfil
        || metadados?.fotoPerfilUrl
        || metadados?.avatar_url
        || metadados?.avatarUrl
        || metadados?.photoURL
        || metadados?.picture
        || metadados?.imagem
        || metadados?.imagem_url
        || ""
    ).trim();
}

function valorFotoSidebarEhUrlFinal(valor = "") {
    const texto = String(valor || "").trim();
    return /^https?:\/\//i.test(texto) || texto.startsWith("blob:") || texto.startsWith("data:");
}

function normalizarCaminhoFotoSidebar(valor = "") {
    const texto = String(valor || "").trim();
    if (!texto) return "";

    if (valorFotoSidebarEhUrlFinal(texto) && !texto.includes("/storage/v1/object/")) return texto;

    try {
        const url = new URL(texto);
        const partes = url.pathname.split("/").filter(Boolean);
        const indiceBucket = partes.findIndex((parte) => parte === BUCKET_FOTOS_USUARIOS_SIDEBAR);
        if (indiceBucket >= 0 && partes.length > indiceBucket + 1) {
            return decodeURIComponent(partes.slice(indiceBucket + 1).join("/"));
        }
    } catch {
        // Mantem o valor original quando nao for uma URL completa.
    }

    return texto
        .replace(new RegExp(`^${BUCKET_FOTOS_USUARIOS_SIDEBAR}/`, "i"), "")
        .replace(/^\/+/, "")
        .trim();
}

async function resolverUrlFotoSidebar(valor = "") {
    const foto = normalizarCaminhoFotoSidebar(valor);

    if (!foto) return { url: "", revogar: false };
    if (valorFotoSidebarEhUrlFinal(foto) && !foto.includes("/storage/v1/object/")) {
        return { url: foto, revogar: false };
    }

    try {
        const { data, error } = await supabase.storage
            .from(BUCKET_FOTOS_USUARIOS_SIDEBAR)
            .download(foto);

        if (!error && data && typeof URL !== "undefined") {
            return { url: URL.createObjectURL(data), revogar: true };
        }
    } catch {
        // Se o download autenticado falhar, tenta URL assinada.
    }

    try {
        const { data, error } = await supabase.storage
            .from(BUCKET_FOTOS_USUARIOS_SIDEBAR)
            .createSignedUrl(foto, 60 * 60 * 6);

        if (!error && data?.signedUrl) {
            return { url: data.signedUrl, revogar: false };
        }
    } catch {
        // Mantem fallback para iniciais.
    }

    return { url: "", revogar: false };
}

async function buscarFotoUsuarioSidebarPorEmail(email = "") {
    const emailTratado = String(email || "").trim().toLowerCase();

    if (!emailTratado || !emailTratado.includes("@")) return "";

    try {
        const { data, error } = await supabase.rpc("admin_listar_usuarios_permissoes_sistema");

        if (!error && Array.isArray(data)) {
            const usuarioComFoto = data.find((item) =>
                String(item?.email || "").trim().toLowerCase() === emailTratado
                && obterFotoUsuarioSidebar(item)
            );

            const foto = obterFotoUsuarioSidebar(usuarioComFoto);

            if (foto) return foto;
        }
    } catch {
        // Mantem fallback para iniciais.
    }

    try {
        const { data, error } = await supabase
            .from("usuarios_permissoes_sistema")
            .select("*")
            .eq("email", emailTratado)
            .maybeSingle();

        if (!error) {
            return obterFotoUsuarioSidebar(data);
        }
    } catch {
        // Mantem fallback para iniciais.
    }

    return "";
}
const CHAVE_GRUPOS_FECHADOS_SIDEBAR = "safescan:sidebar:grupos-fechados";

function construirGruposFechadosPadrao(grupos = []) {
    return (Array.isArray(grupos) ? grupos : []).reduce((acumulado, grupo) => {
        if (grupo?.titulo) {
            acumulado[grupo.titulo] = true;
        }

        return acumulado;
    }, {});
}

function lerGruposFechadosSidebarSalvos() {
    if (typeof window === "undefined") return null;

    try {
        const bruto = window.localStorage.getItem(CHAVE_GRUPOS_FECHADOS_SIDEBAR);
        if (!bruto) return null;

        const parseado = JSON.parse(bruto);
        const objetoSimples = Object.prototype.toString.call(parseado) === "[object Object]";

        if (!objetoSimples) {
            return null;
        }

        return Object.entries(parseado).reduce((acumulado, [chave, valor]) => {
            if (typeof chave !== "string" || !chave.trim()) {
                return acumulado;
            }

            acumulado[chave] = Boolean(valor);
            return acumulado;
        }, {});
    } catch {
        return null;
    }
}

function salvarGruposFechadosSidebar(gruposFechados = {}) {
    try {
        if (typeof window === "undefined") return;
        window.localStorage.setItem(CHAVE_GRUPOS_FECHADOS_SIDEBAR, JSON.stringify(gruposFechados));
    } catch {
        // ignorar indisponibilidade do localStorage
    }
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
    const [hoverLiberado, setHoverLiberado] = useState(() => Boolean(menuLateralAberto));
    const [usuarioLogadoAberto, setUsuarioLogadoAberto] = useState(false);
    const [gruposFechados, setGruposFechados] = useState(() => lerGruposFechadosSidebarSalvos() || construirGruposFechadosPadrao(nav));
    const [fotoUsuarioUrl, setFotoUsuarioUrl] = useState("");
    const [fotoUsuarioComErro, setFotoUsuarioComErro] = useState(false);
    const menuExpandido = menuLateralAberto || expandidoPorHover;

    const emailUsuario = usuario?.email || "e-mail n\u00e3o informado";
    const nomeUsuario = obterNomeUsuario(usuario, emailUsuario);
    const funcaoUsuario = usuario?.funcao || usuario?.cargo || "Fun\u00e7\u00e3o n\u00e3o informada";
    const perfilUsuario = formatarPerfilUsuario(usuario?.perfil);

    const fotoUsuario = obterFotoUsuarioSidebar(usuario);
    const mostrarFotoUsuario = Boolean(fotoUsuarioUrl && !fotoUsuarioComErro);
    const iniciaisUsuario = obterIniciaisUsuario(nomeUsuario, emailUsuario);

    useEffect(() => {
        let cancelado = false;
        let objectUrl = "";

        setFotoUsuarioComErro(false);

        async function carregarFotoUsuario() {
            let fotoParaResolver = fotoUsuario;

            if (!fotoParaResolver) {
                fotoParaResolver = await buscarFotoUsuarioSidebarPorEmail(emailUsuario);
            }

            if (cancelado) return;

            if (!fotoParaResolver) {
                setFotoUsuarioUrl("");
                return;
            }

            const resultado = await resolverUrlFotoSidebar(fotoParaResolver);

            if (cancelado) {
                if (resultado.revogar && resultado.url && typeof URL !== "undefined") {
                    URL.revokeObjectURL(resultado.url);
                }
                return;
            }

            objectUrl = resultado.revogar ? resultado.url : "";
            setFotoUsuarioUrl(resultado.url || "");
        }

        carregarFotoUsuario();

        return () => {
            cancelado = true;
            if (objectUrl && typeof URL !== "undefined") {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [emailUsuario, fotoUsuario]);
    const salvarPreferenciaSidebar = (proximoAberto) => {
        try {
            if (typeof window === "undefined") return;

            window.localStorage.setItem("safescan:sidebar:collapsed", proximoAberto ? "false" : "true");
            window.localStorage.setItem("menuLateralAbertoSST", proximoAberto ? "true" : "false");
        } catch {
            // ignorar indisponibilidade do localStorage
        }
    };

    const abrirTemporariamente = () => {
        if (!menuLateralAberto) {
            if (!hoverLiberado) {
                return;
            }
            setExpandidoPorHover(true);
        }
    };

    const fecharTemporariamente = () => {
        setExpandidoPorHover(false);
        setHoverLiberado(true);
    };

    const alternarMenuFixo = () => {
        const proximoAberto = !menuLateralAberto;
        setExpandidoPorHover(false);
        if (!proximoAberto) {
            setHoverLiberado(false);
        } else {
            setHoverLiberado(true);
        }
        salvarPreferenciaSidebar(proximoAberto);
        setMenuLateralAberto(proximoAberto);
    };

    const alternarGrupo = (titulo) => {
        setGruposFechados((valorAtual) => {
            const proximoEstado = {
                ...(valorAtual && typeof valorAtual === "object" ? valorAtual : {}),
                [titulo]: !Boolean(valorAtual?.[titulo]),
            };

            salvarGruposFechadosSidebar(proximoEstado);
            return proximoEstado;
        });
    };

    const gruposNavegacao = useMemo(() => {
        const ordemGrupos = ["VIS\u00c3O GERAL", "AUDITORIA", "CADASTROS", "DDS", "VISTORIA", "SISTEMA"];

        return ordemGrupos
            .map((titulo) => ({
                titulo,
                itens: (nav || []).filter((item) => item.grupo === titulo),
            }))
            .filter((grupo) => grupo.itens.length > 0);
    }, [nav]);

    useEffect(() => {
        if (!Array.isArray(gruposNavegacao) || gruposNavegacao.length === 0) {
            return undefined;
        }

        setGruposFechados((estadoAtual) => {
            const estadoBase = estadoAtual && typeof estadoAtual === "object" ? estadoAtual : {};
            const proximoEstado = { ...estadoBase };
            let alterado = false;

            gruposNavegacao.forEach((grupo) => {
                if (typeof proximoEstado[grupo.titulo] !== "boolean") {
                    proximoEstado[grupo.titulo] = true;
                    alterado = true;
                }
            });

            if (!alterado) {
                return estadoAtual;
            }

            salvarGruposFechadosSidebar(proximoEstado);
            return proximoEstado;
        });

        return undefined;
    }, [gruposNavegacao]);

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
                backgroundImage: `linear-gradient(180deg, rgba(3, 8, 16, 0.86) 0%, rgba(5, 10, 18, 0.78) 42%, rgba(3, 6, 12, 0.94) 100%), linear-gradient(90deg, rgba(3, 8, 16, 0.92) 0%, rgba(3, 8, 16, 0.70) 62%, rgba(3, 8, 16, 0.42) 100%), url(${sidebarBackground})`,
                backgroundSize: "cover",
                backgroundPosition: "center top",
                textShadow: "0 1px 2px rgba(0, 0, 0, 0.72)",
            }}
        >
            <div
                className={classNames(
                    "app-sidebar-brand flex min-w-0 items-center text-white",
                    menuExpandido ? "w-full gap-2 px-0 py-1" : "mx-auto h-12 w-12 justify-center p-0"
                )}
            >
                <div
                    className={classNames(
                        "app-sidebar-brand-icon flex shrink-0 items-center justify-center rounded-2xl bg-[#1E7C3A] shadow-sm shadow-black/30",
                        menuExpandido ? "h-9 w-9" : "h-12 w-12"
                    )}
                >
                    <ShieldCheck className={classNames("shrink-0", menuExpandido ? "h-5 w-5" : "h-5 w-5")} />
                </div>

                {menuExpandido && (
                    <div className="min-w-0 flex-1 overflow-hidden">
                        <h1 className="truncate text-[0.78rem] font-black leading-4 text-white drop-shadow" title="SafeScan Brasil">
                            SafeScan Brasil
                        </h1>
                        <p className="truncate text-[0.68rem] font-semibold leading-4 text-[#D7E0EA] drop-shadow" title="Controle de SST">
                            Controle de SST
                        </p>
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
                                    className="mb-2 flex w-full items-center justify-between gap-2 px-3 text-left text-[10px] font-black uppercase tracking-[0.18em] text-[#B7C4D6] transition hover:text-white"
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
                                                    "app-sidebar-nav-button flex items-center rounded-2xl text-left text-sm font-semibold transition",
                                                    menuExpandido ? "w-full gap-3 px-3 py-2" : "h-10 w-10 justify-center p-0",
                                                    tela === item.id
                                                        ? "bg-[#1E7C3A] text-white shadow-sm"
                                                        : "text-[#E5ECF5] hover:bg-white/10 hover:text-white"
                                                )}
                                                title={!menuExpandido ? `${grupo.titulo} - ${item.label}` : undefined}
                                            >
                                                <Icon className="app-sidebar-nav-icon h-4 w-4 shrink-0" />
                                                {menuExpandido && <span className="whitespace-nowrap text-[0.78rem] leading-tight">{item.label}</span>}
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
                            {mostrarFotoUsuario ? (
                                <img
                                    src={fotoUsuarioUrl}
                                    alt={nomeUsuario}
                                    onError={() => setFotoUsuarioComErro(true)}
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
                    {mostrarFotoUsuario ? (
                        <img
                            src={fotoUsuarioUrl}
                            alt={nomeUsuario}
                            onError={() => setFotoUsuarioComErro(true)}
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
                            menuLateralAberto ? "rotate-0" : "rotate-180"
                        )}
                    />
                    {menuExpandido && <span>{menuLateralAberto ? "Recolher" : "Fixar"}</span>}
                </button>
            </div>
        </aside>
    );
}
