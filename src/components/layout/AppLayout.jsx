import React, { useEffect, useMemo, useState } from "react";
import { AppMobileHeader } from "./AppMobileHeader";
import { AppSidebar } from "./AppSidebar";
import { supabase } from "../../lib/supabaseClient";
import {
    carregarPermissaoSistemaAtualService,
    obterModuloPermissaoSistemaPorTela,
    usuarioPodeAcessarTelaSistema,
} from "../../services/usuariosPermissoesSistemaService";

function obterTelaItemNavegacao(item = {}) {
    return item.id || item.tela || item.chave || item.key || "";
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

        onSelecionarTela(id, label);
    };

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
        <div className="min-h-screen bg-slate-100 text-slate-900">
            <div
                className="app-shell flex min-h-screen"
                data-sidebar-open={menuLateralAberto ? "true" : "false"}
            >
                <AppSidebar
                    nav={navPermitida}
                    tela={tela}
                    menuLateralAberto={menuLateralAberto}
                    setMenuLateralAberto={setMenuLateralAberto}
                    usuario={usuario}
                    sair={sair}
                    onSelecionarTela={selecionarTelaComPermissao}
                />

                <main className="app-main">
                    <div className="app-content">
                        <AppMobileHeader
                            nav={navPermitida}
                            tela={tela}
                            usuario={usuario}
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
