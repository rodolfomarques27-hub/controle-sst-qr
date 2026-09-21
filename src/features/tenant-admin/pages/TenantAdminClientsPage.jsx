import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    AlertTriangle,
    Building2,
    Globe2,
    Plus,
    RefreshCw,
    Search,
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

function normalizarTexto(
    valor
) {
    return String(
        valor || ""
    )
        .trim()
        .toLowerCase();
}

function possuiPendencia(
    tenant
) {
    return (
        tenant?.dominio_verificado !==
            true ||
        tenant?.possui_branding !==
            true ||
        numeroSeguro(
            tenant?.admins_ativos
        ) < 1
    );
}

function StatusTenant({
    status,
}) {
    const normalizado =
        normalizarTexto(
            status
        );

    let classe =
        "border-slate-200 bg-slate-50 text-slate-600";

    if (
        normalizado ===
        "ativo"
    ) {
        classe =
            "border-emerald-200 bg-emerald-50 text-emerald-700";
    }
    else if (
        normalizado ===
            "rascunho" ||
        normalizado ===
            "pendente"
    ) {
        classe =
            "border-amber-200 bg-amber-50 text-amber-700";
    }
    else if (
        normalizado ===
            "suspenso" ||
        normalizado ===
            "inativo"
    ) {
        classe =
            "border-red-200 bg-red-50 text-red-700";
    }

    return (
        <span
            className={
                "inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] " +
                classe
            }
        >
            {status || "não informado"}
        </span>
    );
}

export function TenantAdminClientsPage({
    onNovoCliente,
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
        busca,
        setBusca,
    ] =
        useState("");

    const [
        filtroStatus,
        setFiltroStatus,
    ] =
        useState("todos");

    const [
        filtroOnboarding,
        setFiltroOnboarding,
    ] =
        useState("todos");

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
                }
                catch (error) {
                    setTenants(
                        []
                    );

                    setErro(
                        error?.message ||
                        "Não foi possível carregar os clientes."
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
            carregar();
        },
        [
            carregar,
        ]
    );

    const statusDisponiveis =
        useMemo(
            () => {
                return [
                    ...new Set(
                        tenants
                            .map(
                                (tenant) =>
                                    normalizarTexto(
                                        tenant.tenant_status
                                    )
                            )
                            .filter(
                                Boolean
                            )
                    ),
                ].sort(
                    (a, b) =>
                        a.localeCompare(
                            b,
                            "pt-BR"
                        )
                );
            },
            [
                tenants,
            ]
        );

    const tenantsFiltrados =
        useMemo(
            () => {
                const buscaNormalizada =
                    normalizarTexto(
                        busca
                    );

                return tenants.filter(
                    (tenant) => {
                        const texto =
                            [
                                tenant.tenant_nome,
                                tenant.tenant_slug,
                                tenant.dominio_principal,
                            ]
                                .map(
                                    normalizarTexto
                                )
                                .join(
                                    " "
                                );

                        const status =
                            normalizarTexto(
                                tenant.tenant_status
                            );

                        const pendente =
                            possuiPendencia(
                                tenant
                            );

                        const passaBusca =
                            !buscaNormalizada ||
                            texto.includes(
                                buscaNormalizada
                            );

                        const passaStatus =
                            filtroStatus ===
                                "todos" ||
                            status ===
                                filtroStatus;

                        const passaOnboarding =
                            filtroOnboarding ===
                                "todos" ||
                            (
                                filtroOnboarding ===
                                    "pendentes" &&
                                pendente
                            ) ||
                            (
                                filtroOnboarding ===
                                    "completos" &&
                                !pendente
                            );

                        return (
                            passaBusca &&
                            passaStatus &&
                            passaOnboarding
                        );
                    }
                );
            },
            [
                busca,
                filtroOnboarding,
                filtroStatus,
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
            <section className="rounded-[1.75rem] bg-gradient-to-r from-[#09271c] via-[#0b3324] to-[#0b3d2a] px-7 py-7 text-white shadow-sm">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full bg-white/[0.07] px-3 py-1.5">
                            <Building2 className="h-3.5 w-3.5 text-emerald-300" />

                            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-100">
                                Gestão de clientes
                            </span>
                        </div>

                        <h1 className="mt-4 text-3xl font-bold tracking-tight">
                            Clientes
                        </h1>

                        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                            Consulte os ambientes cadastrados,
                            filtre pendências e abra o perfil
                            administrativo de cada cliente.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={
                            onNovoCliente
                        }
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-400"
                    >
                        <Plus className="h-4 w-4" />
                        Novo cliente
                    </button>
                </div>
            </section>

            <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="grid gap-3 lg:grid-cols-[minmax(300px,1fr)_220px_230px_auto]">
                    <label className="relative block">
                        <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />

                        <input
                            type="search"
                            value={
                                busca
                            }
                            onChange={
                                (event) =>
                                    setBusca(
                                        event.target.value
                                    )
                            }
                            placeholder="Nome, slug ou domínio"
                            className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-800 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
                        />
                    </label>

                    <select
                        value={
                            filtroStatus
                        }
                        onChange={
                            (event) =>
                                setFiltroStatus(
                                    event.target.value
                                )
                        }
                        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none"
                    >
                        <option value="todos">
                            Todos os status
                        </option>

                        {statusDisponiveis.map(
                            (status) => (
                                <option
                                    key={
                                        status
                                    }
                                    value={
                                        status
                                    }
                                >
                                    {status}
                                </option>
                            )
                        )}
                    </select>

                    <select
                        value={
                            filtroOnboarding
                        }
                        onChange={
                            (event) =>
                                setFiltroOnboarding(
                                    event.target.value
                                )
                        }
                        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none"
                    >
                        <option value="todos">
                            Todos os onboardings
                        </option>

                        <option value="pendentes">
                            Com pendências
                        </option>

                        <option value="completos">
                            Configuração completa
                        </option>
                    </select>

                    <button
                        type="button"
                        onClick={
                            () => {
                                setBusca(
                                    ""
                                );

                                setFiltroStatus(
                                    "todos"
                                );

                                setFiltroOnboarding(
                                    "todos"
                                );
                            }
                        }
                        className="h-10 rounded-xl border border-slate-200 px-4 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                    >
                        Limpar filtros
                    </button>
                </div>
            </section>

            <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
                    <div>
                        <h2 className="text-sm font-bold text-slate-900">
                            Clientes da plataforma
                        </h2>

                        <p className="mt-1 text-xs text-slate-500">
                            {carregando
                                ? "Atualizando dados..."
                                : `${tenantsFiltrados.length} de ${tenants.length} cliente(s) exibido(s).`}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={
                            carregar
                        }
                        disabled={
                            carregando
                        }
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-50"
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
                    <div className="m-5 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />

                        <p className="text-xs leading-5">
                            {erro}
                        </p>
                    </div>
                ) : null}

                {!erro &&
                !carregando &&
                tenantsFiltrados.length ===
                    0 ? (
                    <div className="flex min-h-[240px] items-center justify-center px-6 text-center">
                        <div>
                            <Building2 className="mx-auto h-8 w-8 text-slate-300" />

                            <p className="mt-3 text-sm font-semibold text-slate-700">
                                Nenhum cliente encontrado
                            </p>
                        </div>
                    </div>
                ) : null}

                {!erro &&
                tenantsFiltrados.length >
                    0 ? (
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
                                        Onboarding
                                    </th>

                                    <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">
                                        Ação
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {tenantsFiltrados.map(
                                    (tenant) => {
                                        const pendente =
                                            possuiPendencia(
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
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                                                            <Building2 className="h-4 w-4" />
                                                        </div>

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
                                                    <div className="flex items-start gap-2">
                                                        <Globe2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />

                                                        <div>
                                                            <p className="max-w-[280px] truncate text-xs font-semibold text-slate-700">
                                                                {tenant.dominio_principal ||
                                                                    "Não configurado"}
                                                            </p>

                                                            <p
                                                                className={
                                                                    tenant.dominio_verificado
                                                                        ? "mt-1 text-[10px] font-semibold text-emerald-700"
                                                                        : "mt-1 text-[10px] font-semibold text-amber-700"
                                                                }
                                                            >
                                                                {tenant.dominio_verificado
                                                                    ? "Verificado"
                                                                    : "Pendente"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="px-4 py-4 text-center">
                                                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                                                        <UsersRound className="h-3.5 w-3.5 text-slate-400" />

                                                        {numeroSeguro(
                                                            tenant.membros_ativos
                                                        )}
                                                    </span>
                                                </td>

                                                <td className="px-4 py-4 text-center">
                                                    <span
                                                        className={
                                                            pendente
                                                                ? "inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700"
                                                                : "inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700"
                                                        }
                                                    >
                                                        {pendente
                                                            ? "Pendente"
                                                            : "Completo"}
                                                    </span>
                                                </td>

                                                <td className="px-5 py-4 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={
                                                            () =>
                                                                setTenantSelecionado(
                                                                    tenant
                                                                )
                                                        }
                                                        className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                                                    >
                                                        Abrir
                                                    </button>
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