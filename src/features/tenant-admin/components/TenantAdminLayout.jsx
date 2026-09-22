import {
    ShieldCheck,
} from "lucide-react";

import {
    useState,
} from "react";

import {
    TenantAdminSidebar,
} from "./TenantAdminSidebar.jsx";

const CHAVE_SIDEBAR_ADMIN =
    "safescan:tenant-admin:sidebar-open";

const contextoSecoes = {
    painel: {
        titulo:
            "Painel Mestre",
        descricao:
            "Visão executiva da plataforma e dos ambientes administrados.",
    },
    infraestrutura: {
        titulo:
            "Infraestrutura",
        descricao:
            "Saúde dos domínios, tenants e serviços globais da plataforma.",
    },
    clientes: {
        titulo:
            "Clientes",
        descricao:
            "Gestão centralizada dos tenants cadastrados no SafeScan.",
    },
    "novo-cliente": {
        titulo:
            "Novo cliente",
        descricao:
            "Onboarding e configuração inicial de um novo ambiente.",
    },
};

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

    const contexto =
        contextoSecoes[
            secaoAtiva
        ] ||
        contextoSecoes.painel;

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
                <header className="sticky top-0 z-30 border-b border-slate-200/90 bg-white/95 backdrop-blur">
                    <div className="flex min-h-[76px] items-center justify-between gap-5 px-5 sm:px-6 lg:px-8">
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-700">
                                    SafeScan Brasil
                                </span>

                                <span className="h-1 w-1 rounded-full bg-slate-300" />

                                <span className="truncate text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
                                    Administração global
                                </span>
                            </div>

                            <div className="mt-1">
                                <h2 className="truncate text-[15px] font-bold tracking-tight text-slate-900">
                                    {
                                        contexto.titulo
                                    }
                                </h2>

                                <p className="mt-0.5 hidden truncate text-[11px] text-slate-500 sm:block">
                                    {
                                        contexto.descricao
                                    }
                                </p>
                            </div>
                        </div>

                        <div className="flex shrink-0 items-center">
                            <div className="flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3.5 py-2">
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100">
                                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
                                </span>

                                <span className="hidden text-[11px] font-bold text-emerald-800 sm:inline">
                                    Administrador global
                                </span>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
                    {
                        children
                    }
                </main>
            </div>
        </div>
    );
}