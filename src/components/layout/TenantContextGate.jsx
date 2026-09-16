import {
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    RefreshCcw,
    ShieldX,
    TriangleAlert,
} from "lucide-react";

import {
    supabase,
} from "../../lib/supabaseClient.js";

import {
    AppCarregandoSistema,
} from "./AppSystemStates.jsx";

import {
    TenantRuntimeContext,
} from "./TenantRuntimeContext.js";

import {
    ESTADOS_CONTEXTO_TENANT,
    criarContextoTenantCarregando,
    criarContextoTenantDesconhecido,
    criarContextoTenantErro,
    criarParametrosResolucaoHostnameTenant,
    hostnameTenantValido,
    normalizarContextoTenantRpc,
} from "../../utils/tenantContextUtils.js";

import {
    TIPOS_AMBIENTE_RUNTIME_TENANT,
    classificarAmbienteRuntimeTenant,
} from "../../utils/tenantRuntimeContextUtils.js";

function TelaAmbienteNaoEncontrado({
    hostname = "",
}) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
            <div className="w-full max-w-lg rounded-[2rem] bg-white p-8 text-center shadow-sm">
                <ShieldX className="mx-auto mb-4 h-11 w-11 text-slate-500" />

                <h1 className="text-2xl font-bold text-slate-950">
                    Ambiente não encontrado
                </h1>

                <p className="mt-3 text-sm leading-6 text-slate-500">
                    O endereço acessado não está vinculado a um ambiente ativo e verificado do SafeScan Brasil.
                </p>

                {hostname ? (
                    <p className="mt-4 break-all rounded-2xl bg-slate-100 px-4 py-3 font-mono text-xs text-slate-600">
                        {hostname}
                    </p>
                ) : null}

                <p className="mt-4 text-xs leading-5 text-slate-400">
                    Nenhum ambiente alternativo foi carregado.
                </p>
            </div>
        </div>
    );
}

function TelaErroContextoTenant() {
    function recarregar() {
        window.location.reload();
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
            <div className="w-full max-w-lg rounded-[2rem] bg-white p-8 text-center shadow-sm">
                <TriangleAlert className="mx-auto mb-4 h-11 w-11 text-amber-500" />

                <h1 className="text-2xl font-bold text-slate-950">
                    Não foi possível validar o ambiente
                </h1>

                <p className="mt-3 text-sm leading-6 text-slate-500">
                    Houve uma falha técnica durante a validação deste endereço. Por segurança, nenhum ambiente alternativo foi carregado.
                </p>

                <button
                    type="button"
                    onClick={recarregar}
                    className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                    <RefreshCcw className="h-4 w-4" />
                    Tentar novamente
                </button>
            </div>
        </div>
    );
}

export function TenantContextGate({
    children,
}) {
    const [classificacao] =
        useState(
            () =>
                classificarAmbienteRuntimeTenant(
                    typeof window !== "undefined"
                        ? window.location.hostname
                        : ""
                )
        );

    const [contextoTenant, setContextoTenant] =
        useState(
            () => {
                if (
                    !classificacao
                        .requerResolucaoTenant
                ) {
                    return null;
                }

                if (
                    !hostnameTenantValido(
                        classificacao.hostname
                    )
                ) {
                    return criarContextoTenantDesconhecido(
                        classificacao.hostname
                    );
                }

                return criarContextoTenantCarregando(
                    classificacao.hostname
                );
            }
        );

    useEffect(
        () => {
            if (
                !classificacao
                    .requerResolucaoTenant
            ) {
                return undefined;
            }

            if (
                !hostnameTenantValido(
                    classificacao.hostname
                )
            ) {
                return undefined;
            }

            let ativo =
                true;

            async function resolver() {
                try {
                    const {
                        data,
                        error,
                    } =
                        await supabase.rpc(
                            "resolver_branding_tenant_por_hostname",
                            criarParametrosResolucaoHostnameTenant(
                                classificacao.hostname
                            )
                        );

                    if (!ativo) {
                        return;
                    }

                    if (error) {
                        console.error(
                            "Falha ao resolver contexto de tenant por hostname.",
                            error
                        );

                        setContextoTenant(
                            criarContextoTenantErro(
                                classificacao.hostname
                            )
                        );

                        return;
                    }

                    const contextoNormalizado =
                        normalizarContextoTenantRpc(
                            data,
                            classificacao.hostname
                        );

                    setContextoTenant({
                        ...contextoNormalizado,

                        branding:
                            contextoNormalizado?.estado ===
                                ESTADOS_CONTEXTO_TENANT.RESOLVIDO &&
                            data?.branding &&
                            typeof data.branding === "object"
                                ? data.branding
                                : null,
                    });
                } catch (error) {
                    if (!ativo) {
                        return;
                    }

                    console.error(
                        "Erro inesperado ao resolver contexto de tenant.",
                        error
                    );

                    setContextoTenant(
                        criarContextoTenantErro(
                            classificacao.hostname
                        )
                    );
                }
            }

            resolver();

            return () => {
                ativo =
                    false;
            };
        },
        [
            classificacao.hostname,
            classificacao.requerResolucaoTenant,
        ]
    );

    const tenantResolvido =
        contextoTenant?.estado ===
        ESTADOS_CONTEXTO_TENANT.RESOLVIDO
            ? contextoTenant
            : null;

    const valorContexto =
        useMemo(
            () => ({
                tipoAmbiente:
                    classificacao.tipo,

                hostname:
                    classificacao.hostname,

                contextoTenant:
                    tenantResolvido,

                tenant:
                    tenantResolvido?.tenant
                    ?? null,

                dominio:
                    tenantResolvido?.dominio
                    ?? null,

                dominioCanonico:
                    tenantResolvido?.dominioCanonico
                    ?? null,

                origemPublicaCanonica:
                    tenantResolvido?.origemPublicaCanonica
                    ?? "",

                branding:
                    tenantResolvido?.branding
                    ?? null,

                compatibilidade:
                    classificacao.tipo ===
                    TIPOS_AMBIENTE_RUNTIME_TENANT
                        .COMPATIBILIDADE,

                desenvolvimento:
                    classificacao.tipo ===
                    TIPOS_AMBIENTE_RUNTIME_TENANT
                        .DESENVOLVIMENTO,

                preview:
                    classificacao.tipo ===
                    TIPOS_AMBIENTE_RUNTIME_TENANT
                        .PREVIEW,

                tenantResolvido:
                    Boolean(
                        tenantResolvido
                    ),
            }),
            [
                classificacao.hostname,
                classificacao.tipo,
                tenantResolvido,
            ]
        );

    if (
        classificacao.tipo ===
        TIPOS_AMBIENTE_RUNTIME_TENANT
            .HOST_DESCONHECIDO
    ) {
        return (
            <TelaAmbienteNaoEncontrado
                hostname={
                    classificacao.hostname
                }
            />
        );
    }

    if (
        !classificacao
            .requerResolucaoTenant
    ) {
        return (
            <TenantRuntimeContext.Provider
                value={valorContexto}
            >
                {children}
            </TenantRuntimeContext.Provider>
        );
    }

    if (
        contextoTenant?.estado ===
        ESTADOS_CONTEXTO_TENANT.CARREGANDO
    ) {
        return (
            <AppCarregandoSistema />
        );
    }

    if (
        contextoTenant?.estado ===
        ESTADOS_CONTEXTO_TENANT
            .HOST_DESCONHECIDO
    ) {
        return (
            <TelaAmbienteNaoEncontrado
                hostname={
                    classificacao.hostname
                }
            />
        );
    }

    if (
        contextoTenant?.estado !==
        ESTADOS_CONTEXTO_TENANT.RESOLVIDO
    ) {
        return (
            <TelaErroContextoTenant />
        );
    }

    return (
        <TenantRuntimeContext.Provider
            value={valorContexto}
        >
            {children}
        </TenantRuntimeContext.Provider>
    );
}