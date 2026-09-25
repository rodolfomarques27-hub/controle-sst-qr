
import {
    useState,
} from "react";

import {
    TenantAdminSidebar,
} from "./TenantAdminSidebar.jsx";

const CHAVE_SIDEBAR_ADMIN =
    "safescan:tenant-admin:sidebar-open";


function lerPreferenciaSidebar() {
    if (
        typeof window ===
        "undefined"
    ) {
        return true;
    }

    try {
        const valor =
            window.localStorage.getItem(
                CHAVE_SIDEBAR_ADMIN
            );

        if (
            valor ===
            "false"
        ) {
            return false;
        }

        if (
            valor ===
            "true"
        ) {
            return true;
        }
    } catch {
        // Preferência visual não pode bloquear o Painel Mestre.
    }

    return true;
}

function salvarPreferenciaSidebar(
    aberto
) {
    try {
        if (
            typeof window ===
            "undefined"
        ) {
            return;
        }

        window.localStorage.setItem(
            CHAVE_SIDEBAR_ADMIN,
            aberto
                ? "true"
                : "false"
        );
    } catch {
        // Preferência visual não pode bloquear o Painel Mestre.
    }
}

export function TenantAdminLayout({
    usuario,
    onSair,
    secaoAtiva,
    onNavegar,
    children,
}) {
    const [
        menuLateralAberto,
        setMenuLateralAbertoEstado,
    ] =
        useState(
            lerPreferenciaSidebar
        );

    function setMenuLateralAberto(
        aberto
    ) {
        const proximoEstado =
            Boolean(
                aberto
            );

        salvarPreferenciaSidebar(
            proximoEstado
        );

        setMenuLateralAbertoEstado(
            proximoEstado
        );
    }

    return (
        <div className="min-h-screen bg-[#F4F6F9] text-[#1A2332]">
            <TenantAdminSidebar
                usuario={
                    usuario
                }
                onSair={
                    onSair
                }
                secaoAtiva={
                    secaoAtiva
                }
                onNavegar={
                    onNavegar
                }
                menuLateralAberto={
                    menuLateralAberto
                }
                setMenuLateralAberto={
                    setMenuLateralAberto
                }
            />

            <div
                className={
                    "min-h-screen transition-[padding] duration-300 " +
                    (
                        menuLateralAberto
                            ? "lg:pl-[264px]"
                            : "lg:pl-16"
                    )
                }
            >

                <main className="px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
                    {
                        children
                    }
                </main>
            </div>
        </div>
    );
}