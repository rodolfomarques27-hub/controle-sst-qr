import {
    AlertTriangle,
    CheckCircle2,
    ExternalLink,
    Globe2,
    RefreshCw,
    ShieldAlert,
} from "lucide-react";

import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    supabase,
} from "../../../lib/supabaseClient.js";

import {
    TenantAdminHero,
} from "../components/TenantAdminHero.jsx";

import {
    listarTenantsPlataformaService,
} from "../services/tenantAdminService.js";

function texto(
    valor
) {
    return String(
        valor ?? ""
    ).trim();
}

function dominioTenant(
    tenant
) {
    return texto(
        tenant?.dominio_principal
    );
}

function dominioVerificado(
    tenant
) {
    return (
        tenant?.dominio_verificado ===
        true
    );
}

function StatusTenant({
    status,
}) {
    const valor =
        texto(
            status
        ).toLowerCase();

    if (
        valor ===
        "ativo"
    ) {
        return (
            <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                Ativo
            </span>
        );
    }

    if (
        valor ===
        "rascunho"
    ) {
        return (
            <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                Rascunho
            </span>
        );
    }

    return (
        <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600">
            {valor || "Não informado"}
        </span>
    );
}

function EstadoDominio({
    tenant,
}) {
    const dominio =
        dominioTenant(
            tenant
        );

    const verificado =
        dominioVerificado(
            tenant
        );

    if (!dominio) {
        return (
            <div className="flex items-start gap-2">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />

                <div>
                    <p className="text-xs font-semibold text-slate-600">
                        Não configurado
                    </p>

                    <p className="mt-1 text-[10px] font-semibold text-slate-400">
                        Sem domínio principal
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-start gap-2">
            {verificado ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            ) : (
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            )}

            <div className="min-w-0">
                <p
                    className="max-w-[360px] truncate text-xs font-bold text-slate-800"
                    title={
                        dominio
                    }
                >
                    {dominio}
                </p>

                <p
                    className={
                        verificado
                            ? "mt-1 text-[10px] font-bold text-emerald-700"
                            : "mt-1 text-[10px] font-bold text-amber-700"
                    }
                >
                    {verificado
                        ? "Verificado"
                        : "Pendente"}
                </p>
            </div>
        </div>
    );
}

export function TenantAdminDomainsPage() {
    const [
        tenants,
        setTenants,
    ] =
        useState([]);

    const [
        carregando,
        setCarregando,
    ] =
        useState(true);

    const [
        erro,
        setErro,
    ] =
        useState("");

    const carregar =
        useCallback(
            async () => {
                setCarregando(
                    true
                );

                setErro(
                    ""
                );

                try {
                    const data =
                        await listarTenantsPlataformaService({
                            supabase,
                        });

                    setTenants(
                        Array.isArray(
                            data
                        )
                            ? data
                            : []
                    );
                }
                catch (error) {
                    setErro(
                        error?.message ||
                        "Não foi possível carregar os domínios da plataforma."
                    );
                }
                finally {
                    setCarregando(
                        false
                    );
                }
            },
            []
        );

    useEffect(
        () => {
            const timeoutId =
                window.setTimeout(
                    () => {
                        carregar();
                    },
                    0
                );

            return () => {
                window.clearTimeout(
                    timeoutId
                );
            };
        },
        [
            carregar,
        ]
    );

    const metricas =
        useMemo(
            () => {
                const total =
                    tenants.length;

                const configurados =
                    tenants.filter(
                        (tenant) =>
                            Boolean(
                                dominioTenant(
                                    tenant
                                )
                            )
                    ).length;

                const verificados =
                    tenants.filter(
                        dominioVerificado
                    ).length;

                const pendentes =
                    tenants.filter(
                        (tenant) =>
                            Boolean(
                                dominioTenant(
                                    tenant
                                )
                            ) &&
                            !dominioVerificado(
                                tenant
                            )
                    ).length;

                const naoConfigurados =
                    total -
                    configurados;

                return {
                    total,
                    configurados,
                    verificados,
                    pendentes,
                    naoConfigurados,
                };
            },
            [
                tenants,
            ]
        );

    return (
        <div className="mx-auto w-full max-w-[1500px]">
            <TenantAdminHero
                titulo="Domínios"
                subtitulo="Acompanhe os endereços vinculados aos tenants e identifique rapidamente configurações pendentes."
                acoes={
                    <button
                        type="button"
                        onClick={
                            carregar
                        }
                        disabled={
                            carregando
                        }
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white shadow-lg shadow-black/10 transition hover:bg-emerald-500 disabled:cursor-wait disabled:bg-slate-500"
                    >
                        <RefreshCw
                            className={
                                carregando
                                    ? "h-4 w-4 animate-spin"
                                    : "h-4 w-4"
                            }
                        />

                        {carregando
                            ? "Atualizando..."
                            : "Atualizar domínios"}
                    </button>
                }
            />

            <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-xs font-semibold text-slate-500">
                                Tenants
                            </p>

                            <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                                {carregando
                                    ? "—"
                                    : metricas.total}
                            </p>

                            <p className="mt-1 text-[11px] text-slate-400">
                                Ambientes cadastrados
                            </p>
                        </div>

                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                            <Globe2 className="h-5 w-5" />
                        </span>
                    </div>
                </article>

                <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-xs font-semibold text-slate-500">
                        Configurados
                    </p>

                    <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                        {carregando
                            ? "—"
                            : metricas.configurados}
                    </p>

                    <p className="mt-1 text-[11px] text-slate-400">
                        Possuem domínio principal
                    </p>
                </article>

                <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-xs font-semibold text-slate-500">
                        Verificados
                    </p>

                    <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                        {carregando
                            ? "—"
                            : metricas.verificados}
                    </p>

                    <p className="mt-1 text-[11px] text-slate-400">
                        Domínios confirmados
                    </p>
                </article>

                <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-xs font-semibold text-slate-500">
                        Pendências
                    </p>

                    <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                        {carregando
                            ? "—"
                            : (
                                metricas.pendentes +
                                metricas.naoConfigurados
                            )}
                    </p>

                    <p className="mt-1 text-[11px] text-slate-400">
                        Exigem configuração ou verificação
                    </p>
                </article>
            </section>

            <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 px-5 py-4">
                    <h2 className="text-sm font-bold text-slate-900">
                        Domínios da plataforma
                    </h2>

                    <p className="mt-1 text-xs text-slate-500">
                        Visão consolidada dos hostnames atualmente associados aos tenants SafeScan.
                    </p>
                </div>

                {erro ? (
                    <div className="m-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />

                        <div>
                            <p className="text-xs font-bold">
                                Não foi possível carregar os domínios.
                            </p>

                            <p className="mt-1 text-xs leading-5 text-red-600">
                                {erro}
                            </p>
                        </div>
                    </div>
                ) : null}

                {!erro &&
                carregando ? (
                    <div className="flex min-h-[240px] items-center justify-center">
                        <div className="text-center">
                            <RefreshCw className="mx-auto h-7 w-7 animate-spin text-emerald-600" />

                            <p className="mt-3 text-xs font-semibold text-slate-500">
                                Carregando domínios...
                            </p>
                        </div>
                    </div>
                ) : null}

                {!erro &&
                !carregando &&
                tenants.length === 0 ? (
                    <div className="flex min-h-[240px] items-center justify-center px-6 text-center">
                        <div>
                            <Globe2 className="mx-auto h-8 w-8 text-slate-300" />

                            <p className="mt-3 text-sm font-bold text-slate-700">
                                Nenhum tenant cadastrado
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                                Não existem domínios para exibir.
                            </p>
                        </div>
                    </div>
                ) : null}

                {!erro &&
                !carregando &&
                tenants.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead className="bg-slate-50">
                                <tr className="border-b border-slate-200">
                                    <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">
                                        Cliente
                                    </th>

                                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">
                                        Status
                                    </th>

                                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">
                                        Domínio
                                    </th>

                                    <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">
                                        Verificação
                                    </th>

                                    <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">
                                        Acesso
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {tenants.map(
                                    (tenant) => {
                                        const dominio =
                                            dominioTenant(
                                                tenant
                                            );

                                        const verificado =
                                            dominioVerificado(
                                                tenant
                                            );

                                        return (
                                            <tr
                                                key={
                                                    tenant.tenant_id
                                                }
                                                className="border-b border-slate-100 last:border-b-0"
                                            >
                                                <td className="px-5 py-4">
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-900">
                                                            {tenant.tenant_nome ||
                                                                "Tenant sem nome"}
                                                        </p>

                                                        <p className="mt-0.5 font-mono text-[10px] text-slate-400">
                                                            {tenant.tenant_slug ||
                                                                "—"}
                                                        </p>
                                                    </div>
                                                </td>

                                                <td className="px-4 py-4">
                                                    <StatusTenant
                                                        status={
                                                            tenant.tenant_status
                                                        }
                                                    />
                                                </td>

                                                <td className="px-4 py-4">
                                                    <EstadoDominio
                                                        tenant={
                                                            tenant
                                                        }
                                                    />
                                                </td>

                                                <td className="px-4 py-4 text-center">
                                                    <span
                                                        className={
                                                            verificado
                                                                ? "inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700"
                                                                : dominio
                                                                    ? "inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700"
                                                                    : "inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500"
                                                        }
                                                    >
                                                        {verificado
                                                            ? "Verificado"
                                                            : dominio
                                                                ? "Pendente"
                                                                : "Não configurado"}
                                                    </span>
                                                </td>

                                                <td className="px-5 py-4 text-right">
                                                    {dominio ? (
                                                        <a
                                                            href={
                                                                `https://${dominio}`
                                                            }
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                                                        >
                                                            Abrir
                                                            <ExternalLink className="h-3.5 w-3.5" />
                                                        </a>
                                                    ) : (
                                                        <span className="text-xs font-semibold text-slate-300">
                                                            —
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    }
                                )}
                            </tbody>
                        </table>
                    </div>
                ) : null}
            </section>
        </div>
    );
}