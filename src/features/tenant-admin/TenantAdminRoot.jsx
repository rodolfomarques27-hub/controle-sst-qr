import {
    useCallback,
    useEffect,
    useState,
} from "react";

import {
    supabase,
} from "../../lib/supabaseClient.js";

import {
    TenantAdminAuthGate,
} from "./components/TenantAdminAuthGate.jsx";

import {
    TenantAdminLayout,
} from "./components/TenantAdminLayout.jsx";

import {
    TenantAdminDashboardPage,
} from "./pages/TenantAdminDashboardPage.jsx";

import {
    TenantAdminClientsPage,
} from "./pages/TenantAdminClientsPage.jsx";

import {
    TenantAdminNewClientPage,
} from "./pages/TenantAdminNewClientPage.jsx";

import {
    TenantAdminInfrastructurePage,
} from "./pages/TenantAdminInfrastructurePage.jsx";

import {
    TenantAdminDomainsPage,
} from "./pages/TenantAdminDomainsPage.jsx";

const SECOES_ADMIN =
    new Set([
        "painel",
        "clientes",
        "novo-cliente",
        "infraestrutura",
        "dominios",
    ]);

function obterSecaoAdminAtual() {
    if (
        typeof window ===
        "undefined"
    ) {
        return "painel";
    }

    const hash =
        String(
            window.location.hash ||
            ""
        )
            .replace(
                /^#/,
                ""
            )
            .trim()
            .toLowerCase();

    return SECOES_ADMIN.has(
        hash
    )
        ? hash
        : "painel";
}

export default function TenantAdminRoot() {
    const [
        secaoAtiva,
        setSecaoAtiva,
    ] =
        useState(
            obterSecaoAdminAtual
        );

    useEffect(
        () => {
            function sincronizarHash() {
                setSecaoAtiva(
                    obterSecaoAdminAtual()
                );
            }

            window.addEventListener(
                "hashchange",
                sincronizarHash
            );

            return () => {
                window.removeEventListener(
                    "hashchange",
                    sincronizarHash
                );
            };
        },
        []
    );

    const navegar =
        useCallback(
            (secao) => {
                const proximaSecao =
                    SECOES_ADMIN.has(
                        secao
                    )
                        ? secao
                        : "painel";

                const proximoHash =
                    "#" +
                    proximaSecao;

                if (
                    window.location.hash ===
                    proximoHash
                ) {
                    setSecaoAtiva(
                        proximaSecao
                    );

                    return;
                }

                window.location.hash =
                    proximaSecao;
            },
            []
        );

    function renderizarConteudo() {
        if (
            secaoAtiva ===
            "clientes"
        ) {
            return (
                <TenantAdminClientsPage
                    onNovoCliente={
                        () =>
                            navegar(
                                "novo-cliente"
                            )
                    }
                />
            );
        }

        if (
            secaoAtiva ===
            "novo-cliente"
        ) {
            return (
                <TenantAdminNewClientPage
                    onVoltar={
                        () =>
                            navegar(
                                "clientes"
                            )
                    }
                />
            );
        }

        if (
            secaoAtiva ===
            "infraestrutura"
        ) {
            return (
                <TenantAdminInfrastructurePage />
            );
        }

        if (
            secaoAtiva ===
            "dominios"
        ) {
            return (
                <TenantAdminDomainsPage />
            );
        }

        return (
            <TenantAdminDashboardPage
                onNavegar={
                    navegar
                }
            />
        );
    }

    return (
        <TenantAdminAuthGate
            supabase={supabase}
        >
            {({
                usuario,
                sair,
            }) => (
                <TenantAdminLayout
                    usuario={usuario}
                    onSair={sair}
                    secaoAtiva={
                        secaoAtiva
                    }
                    onNavegar={
                        navegar
                    }
                >
                    {renderizarConteudo()}
                </TenantAdminLayout>
            )}
        </TenantAdminAuthGate>
    );
}