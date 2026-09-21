import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    AlertTriangle,
    BadgeCheck,
    Building2,
    Globe2,
    Network,
    Plus,
    RefreshCw,
    ShieldCheck,
    UsersRound,
} from "lucide-react";

import {
    supabase,
} from "../../../lib/supabaseClient.js";

import {
    listarTenantsPlataformaService,
} from "../services/tenantAdminService.js";

import {
    TenantAdminTenantDetailPage,
} from "./TenantAdminTenantDetailPage.jsx";

function numeroSeguro(
    valor
) {
    const numero =
        Number(
            valor ?? 0
        );

    return Number.isFinite(
        numero
    )
        ? numero
        : 0;
}

function formatarData(
    valor
) {
    if (!valor) {
        return "—";
    }

    const data =
        new Date(
            valor
        );

    if (
        Number.isNaN(
            data.getTime()
        )
    ) {
        return "—";
    }

    return new Intl.DateTimeFormat(
        "pt-BR",
        {
            dateStyle:
                "short",
            timeStyle:
                "short",
        }
    ).format(
        data
    );
}

function classeStatusTenant(
    status
) {
    const normalizado =
        String(
            status || ""
        )
            .trim()
            .toLowerCase();

    if (
        normalizado === "ativo"
    ) {
        return "border-emerald-200 bg-emerald-50 text-emerald-700";
    }

    if (
        normalizado === "rascunho" ||
        normalizado === "pendente"
    ) {
        return "border-amber-200 bg-amber-50 text-amber-700";
    }

    if (
        normalizado === "suspenso" ||
        normalizado === "inativo"
    ) {
        return "border-red-200 bg-red-50 text-red-700";
    }

    return "border-slate-200 bg-slate-50 text-slate-600";
}

function StatusTenant({
    status,
}) {
    const texto =
        String(
            status || "não informado"
        );

    return (
        <span
            className={
                "inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] " +
                classeStatusTenant(
                    texto
                )
            }
        >
            {texto}
        </span>
    );
}

function EstadoDominio({
    tenant,
}) {
    if (
        !tenant.dominio_principal
    ) {
        return (
            <div>
                <p className="text-xs font-semibold text-slate-500">
                    Não configurado
                </p>

                <p className="mt-1 text-[10px] text-slate-400">
                    Sem domínio principal
                </p>
            </div>
        );
    }

    return (
        <div className="min-w-0">
            <p
                className="max-w-[260px] truncate text-xs font-semibold text-slate-700"
                title={
                    tenant.dominio_principal
                }
            >
                {tenant.dominio_principal}
            </p>

            <div className="mt-1 flex items-center gap-1.5">
                <span
                    className={
                        tenant.dominio_verificado
                            ? "h-1.5 w-1.5 rounded-full bg-emerald-500"
                            : "h-1.5 w-1.5 rounded-full bg-amber-400"
                    }
                />

                <span
                    className={
                        tenant.dominio_verificado
                            ? "text-[10px] font-semibold text-emerald-700"
                            : "text-[10px] font-semibold text-amber-700"
                    }
                >
                    {
                        tenant.dominio_verificado
                            ? "Verificado"
                            : (
                                tenant.dominio_status ||
                                "Pendente"
                            )
                    }
                </span>
            </div>
        </div>
    );
}

export function TenantAdminDashboardPage({
    onNavegar,
}) {
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

    const [
        tenantSelecionado,
        setTenantSelecionado,
    ] =
        useState(null);

    const carregar =
        useCallback(
            async () => {
                setCarregando(
                    true
                );

                setErro("");

                try {
                    const resultado =
                        await listarTenantsPlataformaService({
                            supabase,
                        });

                    setTenants(
                        resultado
                    );
                } catch (error) {
                    setTenants(
                        []
                    );

                    setErro(
                        error?.message ||
                        "Não foi possível carregar os clientes."
                    );
                } finally {
                    setCarregando(
                        false
                    );
                }
            },
            []
        );

    useEffect(
        () => {
            let ativo =
                true;

            async function executar() {
                setCarregando(
                    true
                );

                setErro("");

                try {
                    const resultado =
                        await listarTenantsPlataformaService({
                            supabase,
                        });

                    if (!ativo) {
                        return;
                    }

                    setTenants(
                        resultado
                    );
                } catch (error) {
                    if (!ativo) {
                        return;
                    }

                    setTenants(
                        []
                    );

                    setErro(
                        error?.message ||
                        "Não foi possível carregar os clientes."
                    );
                } finally {
                    if (ativo) {
                        setCarregando(
                            false
                        );
                    }
                }
            }

            executar();

            return () => {
                ativo =
                    false;
            };
        },
        []
    );

    const metricas =
        useMemo(
            () => {
                const totalTenants =
                    tenants.length;

                const ativos =
                    tenants.filter(
                        (tenant) =>
                            String(
                                tenant.tenant_status ||
                                ""
                            )
                                .trim()
                                .toLowerCase() ===
                            "ativo"
                    ).length;

                const clientesComPendencias =
                    tenants.filter(
                        (tenant) =>
                            tenant.dominio_verificado !==
                                true ||
                            tenant.possui_branding !==
                                true ||
                            numeroSeguro(
                                tenant.admins_ativos
                            ) < 1
                    ).length;

                const dominiosVerificados =
                    tenants.filter(
                        (tenant) =>
                            tenant.dominio_verificado ===
                            true
                    ).length;

                return [
                    {
                        label:
                            "Clientes",
                        valor:
                            totalTenants,
                        detalhe:
                            "Tenants cadastrados",
                        Icone:
                            Building2,
                    },
                    {
                        label:
                            "Tenants ativos",
                        valor:
                            ativos,
                        detalhe:
                            "Ambientes liberados",
                        Icone:
                            BadgeCheck,
                    },
                    {
                        label:
                            "Clientes com pendências",
                        valor:
                            clientesComPendencias,
                        detalhe:
                            "Exigem configuração",
                        Icone:
                            Network,
                    },
                    {
                        label:
                            "Domínios",
                        valor:
                            dominiosVerificados,
                        detalhe:
                            "Subdomínios verificados",
                        Icone:
                            Globe2,
                    },
                ];
            },
            [
                tenants,
            ]
        );

    if (tenantSelecionado) {
        return (
            <TenantAdminTenantDetailPage
                tenant={
                    tenantSelecionado
                }
                onVoltar={
                    () =>
                        setTenantSelecionado(
                            null
                        )
                }
            />
        );
    }

    return (
        <div className="mx-auto max-w-[1500px]">
            <section className="overflow-hidden rounded-[1.75rem] bg-gradient-to-r from-[#09271c] via-[#0b3324] to-[#0b3d2a] px-7 py-8 text-white shadow-sm">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full bg-white/[0.07] px-3 py-1.5">
                            <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />

                            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-100">
                                Administração global
                            </span>
                        </div>

                        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
                            Painel Mestre SafeScan
                        </h1>

                        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                            Visão central dos clientes,
                            ambientes, domínios e
                            estruturas vinculadas à
                            plataforma SafeScan.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={
                            () =>
                                onNavegar?.(
                                    "novo-cliente"
                                )
                        }
                        className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-400"
                    >
                        <Plus className="h-4 w-4" />
                        Novo cliente
                    </button>
                </div>
            </section>

            <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {metricas.map(
                    (metrica) => {
                        const Icone =
                            metrica.Icone;

                        return (
                            <article
                                key={
                                    metrica.label
                                }
                                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <p className="text-xs font-semibold text-slate-500">
                                            {metrica.label}
                                        </p>

                                        <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
                                            {
                                                carregando
                                                    ? "—"
                                                    : metrica.valor
                                            }
                                        </p>

                                        <p className="mt-1 text-[11px] text-slate-400">
                                            {metrica.detalhe}
                                        </p>
                                    </div>

                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                                        <Icone className="h-5 w-5" />
                                    </div>
                                </div>
                            </article>
                        );
                    }
                )}
            </section>

            <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-sm font-bold text-slate-900">
                            Clientes da plataforma
                        </h2>

                        <p className="mt-1 text-xs text-slate-500">
                            Dados administrativos consolidados
                            diretamente do ambiente SafeScan.
                            Clique em um cliente para abrir os detalhes.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={carregar}
                        disabled={carregando}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-50"
                    >
                        <RefreshCw
                            className={
                                carregando
                                    ? "h-3.5 w-3.5 animate-spin"
                                    : "h-3.5 w-3.5"
                            }
                        />

                        Atualizar
                    </button>
                </div>

                {erro ? (
                    <div className="m-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />

                        <div>
                            <p className="font-semibold">
                                Não foi possível carregar o Painel Mestre.
                            </p>

                            <p className="mt-1 text-xs leading-5 text-red-600">
                                {erro}
                            </p>
                        </div>
                    </div>
                ) : null}

                {!erro && carregando ? (
                    <div className="flex min-h-[240px] items-center justify-center">
                        <div className="text-center">
                            <RefreshCw className="mx-auto h-7 w-7 animate-spin text-emerald-600" />

                            <p className="mt-3 text-xs font-semibold text-slate-500">
                                Carregando clientes...
                            </p>
                        </div>
                    </div>
                ) : null}

                {!erro &&
                !carregando &&
                tenants.length === 0 ? (
                    <div className="flex min-h-[240px] items-center justify-center px-6">
                        <div className="text-center">
                            <Building2 className="mx-auto h-8 w-8 text-slate-300" />

                            <p className="mt-3 text-sm font-semibold text-slate-700">
                                Nenhum cliente cadastrado
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                                A RPC não retornou tenants para esta conta.
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
                                        Membros
                                    </th>

                                    <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">
                                        Admins
                                    </th>

                                    <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">
                                        Branding
                                    </th>

                                    <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">
                                        Atualizado
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {tenants.map(
                                    (tenant) => (
                                        <tr
                                            key={
                                                tenant.tenant_id
                                            }
                                            role="button"
                                            tabIndex={0}
                                            title="Abrir detalhes deste cliente"
                                            onClick={
                                                () =>
                                                    setTenantSelecionado(
                                                        tenant
                                                    )
                                            }
                                            onKeyDown={
                                                (event) => {
                                                    if (
                                                        event.key === "Enter" ||
                                                        event.key === " "
                                                    ) {
                                                        event.preventDefault();

                                                        setTenantSelecionado(
                                                            tenant
                                                        );
                                                    }
                                                }
                                            }
                                            className="cursor-pointer border-b border-slate-100 transition last:border-b-0 hover:bg-emerald-50/40 focus:bg-emerald-50/40 focus:outline-none"
                                        >
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                                                        <Building2 className="h-4 w-4" />
                                                    </div>

                                                    <div>
                                                        <p className="text-sm font-bold text-slate-900">
                                                            {
                                                                tenant.tenant_nome ||
                                                                "Tenant sem nome"
                                                            }
                                                        </p>

                                                        <p className="mt-0.5 font-mono text-[10px] text-slate-400">
                                                            {
                                                                tenant.tenant_slug ||
                                                                "—"
                                                            }
                                                        </p>
                                                    </div>
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
                                                <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                                                    <UsersRound className="h-3.5 w-3.5 text-slate-400" />

                                                    {
                                                        numeroSeguro(
                                                            tenant.membros_ativos
                                                        )
                                                    }
                                                </div>
                                            </td>

                                            <td className="px-4 py-4 text-center">
                                                <span className="text-sm font-semibold text-slate-700">
                                                    {
                                                        numeroSeguro(
                                                            tenant.admins_ativos
                                                        )
                                                    }
                                                </span>
                                            </td>

                                            <td className="px-4 py-4 text-center">
                                                <span
                                                    className={
                                                        tenant.possui_branding
                                                            ? "inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700"
                                                            : "inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500"
                                                    }
                                                >
                                                    {
                                                        tenant.possui_branding
                                                            ? "Configurado"
                                                            : "Pendente"
                                                    }
                                                </span>
                                            </td>

                                            <td className="px-5 py-4 text-right">
                                                <p className="text-[11px] font-medium text-slate-600">
                                                    {
                                                        formatarData(
                                                            tenant.tenant_updated_at
                                                        )
                                                    }
                                                </p>
                                            </td>
                                        </tr>
                                    )
                                )}
                            </tbody>
                        </table>
                    </div>
                ) : null}
            </section>
        </div>
    );
}