import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppMobileHeader } from "./AppMobileHeader";
import { AppSidebar } from "./AppSidebar";
import { CarregandoTela } from "../CarregandoTela";
import { supabase } from "../../lib/supabaseClient";
import {
    carregarPermissaoSistemaAtualService,
    obterModuloPermissaoSistemaPorTela,
    obterResumoPermissaoSistema,
    usuarioPodeAcessarTelaSistema,
} from "../../services/usuariosPermissoesSistemaService";

function obterTelaItemNavegacao(item = {}) {
    return item.id || item.tela || item.chave || item.key || "";
}

function formatarPerfilSistema(perfil = "") {
    const perfilNormalizado = String(perfil || "").trim().toLowerCase();

    const rotulos = {
        administrador: "Administrador",
        tecnico_sst: "Técnico SST",
        auditor: "Auditor",
        gestor: "Gestor",
        consulta: "Consulta",
        bloqueado: "Bloqueado",
    };

    return rotulos[perfilNormalizado] || perfil || "Sem permissão cadastrada";
}

function obterEmailUsuarioSistema(usuario = null, permissao = null) {
    return String(permissao?.email || usuario?.email || "").trim().toLowerCase();
}

function obterNomeUsuarioSistema(usuario = null, permissao = null) {
    const emailSistema = obterEmailUsuarioSistema(usuario, permissao);
    const nome = String(
        permissao?.nome
        || usuario?.nome
        || usuario?.name
        || usuario?.displayName
        || usuario?.user_metadata?.nome
        || usuario?.user_metadata?.name
        || ""
    ).trim();

    if (nome) return nome;
    if (emailSistema.includes("@")) return emailSistema.split("@")[0];

    return "Usuário logado";
}

function obterFuncaoUsuarioSistema(usuario = null, permissao = null) {
    return String(
        permissao?.funcao
        || usuario?.funcao
        || usuario?.cargo
        || usuario?.user_metadata?.funcao
        || usuario?.user_metadata?.cargo
        || ""
    ).trim();
}

function montarUsuarioComPerfilSistema(usuario = null, permissao = null, carregando = false, erro = "") {
    if (!usuario) return usuario;

    const resumo = obterResumoPermissaoSistema(permissao);
    const perfilSistemaRotulo = carregando
        ? "Carregando perfil..."
        : erro
          ? "Perfil não carregado"
          : formatarPerfilSistema(resumo.perfil);
    const emailSistema = obterEmailUsuarioSistema(usuario, permissao);
    const nomeSistema = obterNomeUsuarioSistema(usuario, permissao);
    const funcaoSistema = obterFuncaoUsuarioSistema(usuario, permissao);
    const fotoSistema = String(
        permissao?.foto_url
        || permissao?.fotoUrl
        || permissao?.avatar_url
        || permissao?.avatarUrl
        || usuario?.foto_url
        || usuario?.fotoUrl
        || usuario?.avatar_url
        || usuario?.avatarUrl
        || usuario?.picture
        || usuario?.user_metadata?.foto_url
        || usuario?.user_metadata?.fotoUrl
        || usuario?.user_metadata?.avatar_url
        || usuario?.user_metadata?.avatarUrl
        || usuario?.user_metadata?.picture
        || ""
    ).trim();

    return {
        ...usuario,
        email: emailSistema || usuario?.email || "",
        nome: nomeSistema,
        name: nomeSistema,
        displayName: nomeSistema,
        foto_url: fotoSistema,
        fotoUrl: fotoSistema || usuario?.fotoUrl || "",
        funcao: funcaoSistema,
        cargo: funcaoSistema,
        funcaoSistema,
        funcaoOriginal: usuario?.funcao || usuario?.cargo || "",
        perfil: perfilSistemaRotulo,
        perfilSistema: perfilSistemaRotulo,
        perfilSistemaChave: permissao?.perfil || "",
        perfilOriginal: usuario?.perfil || "",
        statusSistema: resumo.status,
        acessoGlobalSistema: resumo.acessoGlobal,
    };
}

export function AppLayout({
    nav = [],
    tela,
    menuLateralAberto,
    setMenuLateralAberto,
    usuario,
    sair,
    onSelecionarTela,
    children,
}) {
    const [permissaoSistemaMenu, setPermissaoSistemaMenu] = useState(null);
    const [carregandoPermissaoSistemaMenu, setCarregandoPermissaoSistemaMenu] = useState(() => Boolean(usuario?.email));
    const [erroPermissaoSistemaMenu, setErroPermissaoSistemaMenu] = useState("");
    const [telaEmTransicao, setTelaEmTransicao] = useState(false);
    const temporizadorTransicaoRef = useRef(null);

    const iniciarTransicaoTela = useCallback(() => {
        setTelaEmTransicao(true);
        window.clearTimeout(temporizadorTransicaoRef.current);
        temporizadorTransicaoRef.current = window.setTimeout(() => {
            setTelaEmTransicao(false);
        }, 650);
    }, []);

    useEffect(() => {
        iniciarTransicaoTela();
        return () => window.clearTimeout(temporizadorTransicaoRef.current);
    }, [tela, iniciarTransicaoTela]);

    useEffect(() => {
        let componenteAtivo = true;

        async function carregarPermissaoMenu() {
            if (!usuario?.email) {
                setPermissaoSistemaMenu(null);
                setErroPermissaoSistemaMenu("");
                setCarregandoPermissaoSistemaMenu(false);
                return;
            }

            try {
                setCarregandoPermissaoSistemaMenu(true);
                setErroPermissaoSistemaMenu("");
                const permissao = await carregarPermissaoSistemaAtualService({ supabase });

                if (componenteAtivo) {
                    setPermissaoSistemaMenu(permissao);
                }
            } catch (error) {
                if (componenteAtivo) {
                    setPermissaoSistemaMenu(null);
                    setErroPermissaoSistemaMenu(error?.message || "Não foi possível carregar permissões do menu.");
                }
            } finally {
                if (componenteAtivo) {
                    setCarregandoPermissaoSistemaMenu(false);
                }
            }
        }

        carregarPermissaoMenu();

        return () => {
            componenteAtivo = false;
        };
    }, [usuario?.email]);

    const navPermitida = useMemo(() => {
        if (!usuario?.email || carregandoPermissaoSistemaMenu || erroPermissaoSistemaMenu || !permissaoSistemaMenu) {
            return nav;
        }

        return nav.filter((item) => {
            const telaItem = obterTelaItemNavegacao(item);
            const moduloItem = obterModuloPermissaoSistemaPorTela(telaItem);

            if (!moduloItem) return true;

            return usuarioPodeAcessarTelaSistema(permissaoSistemaMenu, telaItem);
        });
    }, [nav, usuario?.email, carregandoPermissaoSistemaMenu, erroPermissaoSistemaMenu, permissaoSistemaMenu]);

    const selecionarTelaComPermissao = (id, label = id) => {
        const modulo = obterModuloPermissaoSistemaPorTela(id);

        if (modulo && permissaoSistemaMenu && !usuarioPodeAcessarTelaSistema(permissaoSistemaMenu, id)) {
            return;
        }

        iniciarTransicaoTela();
        onSelecionarTela(id, label);
    };

    const usuarioComPerfilSistema = useMemo(() => montarUsuarioComPerfilSistema(
        usuario,
        permissaoSistemaMenu,
        carregandoPermissaoSistemaMenu,
        erroPermissaoSistemaMenu
    ), [usuario, permissaoSistemaMenu, carregandoPermissaoSistemaMenu, erroPermissaoSistemaMenu]);

    useEffect(() => {
        if (typeof window === "undefined" || typeof document === "undefined") return undefined;

        let quadro = 0;

        const textoNormalizado = (valor = "") => String(valor || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();

        const limitarPercentual = (valor) => Math.max(0, Math.min(100, Number(valor) || 0));

        const atualizarCartaoArmazenamento = () => {
            const cartoes = Array.from(document.querySelectorAll(
                ".dashboard-summary-grid > .dashboard-summary-card, .dashboard-summary-grid > .summary-card-fixed, .dashboard-summary-grid > .info-card"
            ));

            cartoes.forEach((cartao) => {
                const texto = textoNormalizado(cartao.textContent || "");
                const ehArmazenamento = texto.includes("armazenamento");

                if (!ehArmazenamento) {
                    cartao.removeAttribute("data-dashboard-storage-card");
                    cartao.removeAttribute("data-dashboard-storage-level");
                    cartao.style.removeProperty("--storage-percent");
                    cartao.querySelectorAll("[data-storage-extra-icon='true']").forEach((elemento) => {
                        elemento.removeAttribute("data-storage-extra-icon");
                    });
                    return;
                }

                const percentualEncontrado = (cartao.textContent || "").match(/(\d{1,3})(?:[,.]\d+)?\s*%/);
                const percentual = limitarPercentual(percentualEncontrado ? percentualEncontrado[1] : 0);
                const nivel = percentual >= 90 ? "critico" : percentual >= 70 ? "atencao" : "normal";

                cartao.setAttribute("data-dashboard-storage-card", "true");
                cartao.setAttribute("data-dashboard-storage-level", nivel);
                cartao.style.setProperty("--storage-percent", `${percentual}%`);

                const candidatosIcone = Array.from(cartao.querySelectorAll("[class*='emerald'], [class*='green']"));
                candidatosIcone.forEach((elemento) => {
                    const textoElemento = String(elemento.textContent || "").trim();
                    const temSvg = Boolean(elemento.querySelector("svg"));
                    const ehIconeSolto = temSvg && textoElemento.length === 0;

                    if (ehIconeSolto) {
                        elemento.setAttribute("data-storage-extra-icon", "true");
                    }
                });
            });
        };

        const agendarAtualizacao = () => {
            window.cancelAnimationFrame(quadro);
            quadro = window.requestAnimationFrame(atualizarCartaoArmazenamento);
        };

        agendarAtualizacao();

        const observador = new MutationObserver(agendarAtualizacao);
        observador.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true,
        });

        window.addEventListener("resize", agendarAtualizacao);

        return () => {
            window.cancelAnimationFrame(quadro);
            observador.disconnect();
            window.removeEventListener("resize", agendarAtualizacao);
        };
    }, [tela]);
return (
        <div className="min-h-screen bg-[#F4F6F9] text-slate-900">
            {telaEmTransicao && (
                <div
                    className="fixed inset-0 z-[9999]"
                    data-testid="app-tab-loading-overlay"
                    role="status"
                    aria-live="polite"
                >
                    <CarregandoTela
                        mensagem="Carregando área..."
                        subtitulo="Preparando as informações desta seção."
                        telaCheia
                    />
                </div>
            )}
            <div
                className="app-shell flex min-h-screen w-full bg-[#F4F6F9]"
                data-sidebar-open={menuLateralAberto ? "true" : "false"}
            >
                <AppSidebar
                    nav={navPermitida}
                    tela={tela}
                    menuLateralAberto={menuLateralAberto}
                    setMenuLateralAberto={setMenuLateralAberto}
                    usuario={usuarioComPerfilSistema}
                    sair={sair}
                    onSelecionarTela={selecionarTelaComPermissao}
                />

                <main className="app-main flex min-w-0 flex-1 bg-[#F4F6F9]">
                    <div className="app-content min-w-0 flex-1 bg-[#F4F6F9]">
                        <AppMobileHeader
                            nav={navPermitida}
                            tela={tela}
                            usuario={usuarioComPerfilSistema}
                            sair={sair}
                            onSelecionarTela={selecionarTelaComPermissao}
                        />

                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
