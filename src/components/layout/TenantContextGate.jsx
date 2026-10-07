import "../../styles/app-layout-operational-suffix.css";

import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    Building2,
    RefreshCcw,
    ShieldX,
    TriangleAlert,
} from "lucide-react";

import {
    supabase,
} from "../../lib/supabaseClient.js";


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

import {
    PARAMETRO_HOST_TENANT_DEV,
    ehEntradaAppOperacionalDev,
    obterHostnameTenantDev,
} from "../../routes/runtimeEntryService.js";

function TelaSelecaoAmbienteDev() {
    const [identificadorAmbiente, setIdentificadorAmbiente] = useState("");
    const [erro, setErro] = useState("");

    async function abrirAmbiente(event) {
        event.preventDefault();

        const entradaNormalizada = String(identificadorAmbiente || "")
            .trim()
            .toLowerCase()
            .replace(/\.$/, "");

        const hostnameNormalizado =
            entradaNormalizada.includes(".")
                ? entradaNormalizada
                : `${entradaNormalizada}.safescanbrasil.com.br`;

        if (
            !entradaNormalizada
            || !hostnameTenantValido(hostnameNormalizado)
        ) {
            setErro("Informe um nome de ambiente válido.");
            return;
        }

        const {
            error: erroEncerrarSessao,
        } = await supabase.auth.signOut({
            scope: "local",
        });

        if (erroEncerrarSessao) {
            setErro(
                "Não foi possível encerrar a sessão anterior para trocar de ambiente. Tente novamente."
            );
            return;
        }

        const destino = new URL(window.location.href);
        destino.pathname = "/dev-app";
        destino.search = "";
        destino.searchParams.set(PARAMETRO_HOST_TENANT_DEV, hostnameNormalizado);
        window.location.assign(destino.toString());
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
            <form onSubmit={abrirAmbiente} className="w-full max-w-lg rounded-[2rem] bg-white p-8 shadow-sm">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                    <Building2 className="h-6 w-6" />
                </div>
                <div className="mt-5 text-center">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">SafeScan DEV</p>
                    <h1 className="mt-2 text-2xl font-bold text-slate-950">Selecionar ambiente</h1>
                    <p className="mt-3 text-sm leading-6 text-slate-500">Informe o nome do ambiente, como cliente-a. O domínio SafeScan será completado automaticamente.</p>
                </div>
                <label className="mt-6 block">
                    <span className="text-xs font-bold uppercase tracking-wide text-slate-600">Nome do ambiente</span>
                    <input
                        type="text"
                        value={identificadorAmbiente}
                        onChange={(event) => { setIdentificadorAmbiente(event.target.value); setErro(""); }}
                        placeholder="Digite seu domínio"
                        autoComplete="off"
                        spellCheck="false"
                        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                    />
                </label>
                {erro ? <p className="mt-3 text-sm font-semibold text-rose-600">{erro}</p> : null}
                <button type="submit" className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800">Continuar para o login</button>
                <p className="mt-4 text-center text-xs leading-5 text-slate-400">Esta seleção não concede acesso. Depois de selecionar o ambiente, entre com o e-mail e a senha de um usuário autorizado desse tenant.</p>
            </form>
        </div>
    );
}

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

    const [entradaDevOperacional] =
        useState(
            () =>
                ehEntradaAppOperacionalDev(
                    typeof window !== "undefined"
                        ? window.location
                        : null
                )
        );

    const [hostnameTenantDev] =
        useState(
            () =>
                obterHostnameTenantDev(
                    typeof window !== "undefined"
                        ? window.location
                        : null
                )
        );

    const selecionarTenantDev = Boolean(entradaDevOperacional && !hostnameTenantDev);
    const hostnameResolucao = hostnameTenantDev || classificacao.hostname;
    const requerResolucaoTenant = Boolean(classificacao.requerResolucaoTenant || (entradaDevOperacional && hostnameTenantDev));

    const [contextoTenant, setContextoTenant] =
        useState(
            () => {
                if (!requerResolucaoTenant) {
                    return null;
                }

                if (!hostnameTenantValido(hostnameResolucao)) {
                    return criarContextoTenantDesconhecido(hostnameResolucao);
                }

                return criarContextoTenantCarregando(hostnameResolucao);
            }
        );

    useEffect(
        () => {
            if (!requerResolucaoTenant) {
                return undefined;
            }

            if (!hostnameTenantValido(hostnameResolucao)) {
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
                                hostnameResolucao
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
                                hostnameResolucao
                            )
                        );

                        return;
                    }

                    const contextoNormalizado =
                        normalizarContextoTenantRpc(
                            data,
                            hostnameResolucao
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
                            hostnameResolucao
                        )
                    );
                }
            }

            void resolver();

            return () => {
                ativo =
                    false;
            };
        },
        [
            hostnameResolucao,
            requerResolucaoTenant,
        ]
    );

    const tenantResolvido =
        contextoTenant?.estado ===
        ESTADOS_CONTEXTO_TENANT.RESOLVIDO
            ? contextoTenant
            : null;

    const resolvendoTenant =
        Boolean(
            requerResolucaoTenant
            && contextoTenant?.estado ===
                ESTADOS_CONTEXTO_TENANT.CARREGANDO
        );

    const tenantResolvidoId =
        String(
            tenantResolvido?.tenant?.id || ""
        );

    const recarregarBrandingTenant =
        useCallback(
            async () => {
                if (
                    !requerResolucaoTenant
                    || !hostnameTenantValido(
                        hostnameResolucao
                    )
                    || !tenantResolvidoId
                ) {
                    return null;
                }

                const {
                    data,
                    error,
                } =
                    await supabase.rpc(
                        "resolver_branding_tenant_por_hostname",
                        criarParametrosResolucaoHostnameTenant(
                            hostnameResolucao
                        )
                    );

                if (error) {
                    throw new Error(
                        error.message
                        || "Não foi possível atualizar o branding do tenant."
                    );
                }

                const contextoAtualizado =
                    normalizarContextoTenantRpc(
                        data,
                        hostnameResolucao
                    );

                const tenantAtualizadoId =
                    String(
                        contextoAtualizado?.tenant?.id || ""
                    );

                if (
                    contextoAtualizado?.estado !==
                        ESTADOS_CONTEXTO_TENANT.RESOLVIDO
                    || tenantAtualizadoId !==
                        tenantResolvidoId
                ) {
                    throw new Error(
                        "O tenant retornado durante a atualização do branding não corresponde ao tenant atual."
                    );
                }

                const brandingAtualizado =
                    data?.branding
                    && typeof data.branding === "object"
                        ? data.branding
                        : null;

                setContextoTenant(
                    (contextoAtual) => {
                        if (
                            contextoAtual?.estado !==
                                ESTADOS_CONTEXTO_TENANT.RESOLVIDO
                            || String(
                                contextoAtual?.tenant?.id || ""
                            ) !== tenantResolvidoId
                        ) {
                            return contextoAtual;
                        }

                        return {
                            ...contextoAtual,
                            branding:
                                brandingAtualizado,
                        };
                    }
                );

                return brandingAtualizado;
            },
            [
                hostnameResolucao,
                requerResolucaoTenant,
                tenantResolvidoId,
            ]
        );

    const valorContexto =
        useMemo(
            () => ({
                tipoAmbiente:
                    classificacao.tipo,

                hostname:
                    tenantResolvido?.hostname
                    || hostnameResolucao,

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

                recarregarBrandingTenant,

                compatibilidade:
                    classificacao.tipo ===
                    TIPOS_AMBIENTE_RUNTIME_TENANT
                        .COMPATIBILIDADE,

                desenvolvimento:
                    classificacao.tipo ===
                    TIPOS_AMBIENTE_RUNTIME_TENANT
                        .DESENVOLVIMENTO,

                tenantDevSelecionado:
                    Boolean(
                        entradaDevOperacional
                        && hostnameTenantDev
                        && tenantResolvido
                    ),

                preview:
                    classificacao.tipo ===
                    TIPOS_AMBIENTE_RUNTIME_TENANT
                        .PREVIEW,

                resolvendoTenant,

                tenantResolvido:
                    Boolean(
                        tenantResolvido
                    ),
            }),
            [
                classificacao.tipo,
                entradaDevOperacional,
                hostnameResolucao,
                hostnameTenantDev,
                recarregarBrandingTenant,
                resolvendoTenant,
                tenantResolvido,
            ]
        );

    if (selecionarTenantDev) {
        return (
            <TelaSelecaoAmbienteDev />
        );
    }

    if (
        classificacao.tipo ===
        TIPOS_AMBIENTE_RUNTIME_TENANT
            .HOST_DESCONHECIDO
    ) {
        return (
            <TelaAmbienteNaoEncontrado
                hostname={
                    hostnameResolucao
                }
            />
        );
    }

    if (!requerResolucaoTenant) {
        return (
            <TenantRuntimeContext.Provider
                value={valorContexto}
            >
                {children}
            </TenantRuntimeContext.Provider>
        );
    }

    if (resolvendoTenant) {
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
        ESTADOS_CONTEXTO_TENANT
            .HOST_DESCONHECIDO
    ) {
        return (
            <TelaAmbienteNaoEncontrado
                hostname={
                    hostnameResolucao
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
