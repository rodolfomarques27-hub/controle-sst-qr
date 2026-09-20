import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    AlertTriangle,
    ArrowLeft,
    BadgeCheck,
    Building2,
    CalendarDays,
    Globe2,
    Palette,
    RefreshCw,
    ShieldCheck,
    UserCog,
    UsersRound,
} from "lucide-react";

import {
    supabase,
} from "../../../lib/supabaseClient.js";

import {
    listarEmpresasTenantAdminService,
    listarUsuariosTenantAdminService,
} from "../services/tenantAdminService.js";

import {
    TenantAdminModulesPanel,
} from "../components/TenantAdminModulesPanel.jsx";

import {
    TenantAdminCompaniesPanel,
} from "../components/TenantAdminCompaniesPanel.jsx";

import {
    TenantAdminUserScopeModal,
} from "../components/TenantAdminUserScopeModal.jsx";

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

function textoSeguro(
    valor,
    fallback = "—"
) {
    const texto =
        String(
            valor ?? ""
        ).trim();

    return texto || fallback;
}

function ehAdministrador(
    papel
) {
    const normalizado =
        String(
            papel || ""
        )
            .trim()
            .toLowerCase();

    return (
        normalizado === "admin" ||
        normalizado === "administrador"
    );
}

function StatusPill({
    valor,
}) {
    const normalizado =
        String(
            valor || ""
        )
            .trim()
            .toLowerCase();

    const classe =
        normalizado === "ativo" ||
        normalizado === "ativa" ||
        normalizado === "empresa ativa"
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : normalizado === "pendente" ||
              normalizado === "rascunho"
                ? "border-amber-200 bg-amber-50 text-amber-700"
                : "border-slate-200 bg-slate-50 text-slate-600";

    const textoExibido =
        normalizado === "empresa ativa"
            ? "Ativa"
            : textoSeguro(
                valor,
                "Não informado"
            );

    return (
        <span
            className={
                "inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] " +
                classe
            }
        >
            {textoExibido}
        </span>
    );
}

function CardResumo({
    titulo,
    valor,
    detalhe,
    Icone,
}) {
    return (
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-xs font-semibold text-slate-500">
                        {titulo}
                    </p>

                    <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
                        {valor}
                    </p>

                    <p className="mt-1 text-[11px] text-slate-400">
                        {detalhe}
                    </p>
                </div>

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                    <Icone className="h-5 w-5" />
                </div>
            </div>
        </article>
    );
}

export function TenantAdminTenantDetailPage({
    tenant,
    onVoltar,
}) {
    const [
        empresas,
        setEmpresas,
    ] =
        useState([]);

    const [
        usuarios,
        setUsuarios,
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
        abaAtiva,
        setAbaAtiva,
    ] =
        useState(
            "visao-geral"
        );

    const [
        usuarioEscopo,
        setUsuarioEscopo,
    ] =
        useState(null);

    const [
        mensagemEscopo,
        setMensagemEscopo,
    ] =
        useState("");

    const tenantId =
        tenant?.tenant_id ||
        "";

    const carregarDetalhes =
        useCallback(
            async () => {
                if (!tenantId) {
                    setErro(
                        "Tenant inválido."
                    );

                    setCarregando(
                        false
                    );

                    return;
                }

                setCarregando(
                    true
                );

                setErro("");

                try {
                    const [
                        empresasResultado,
                        usuariosResultado,
                    ] =
                        await Promise.all([
                            listarEmpresasTenantAdminService({
                                supabase,
                                tenantId,
                            }),
                            listarUsuariosTenantAdminService({
                                supabase,
                                tenantId,
                            }),
                        ]);

                    setEmpresas(
                        empresasResultado
                    );

                    setUsuarios(
                        usuariosResultado
                    );
                } catch (error) {
                    setEmpresas(
                        []
                    );

                    setUsuarios(
                        []
                    );

                    setErro(
                        error?.message ||
                        "Não foi possível carregar os detalhes do tenant."
                    );
                } finally {
                    setCarregando(
                        false
                    );
                }
            },
            [
                tenantId,
            ]
        );

    useEffect(
        () => {
            carregarDetalhes();
        },
        [
            carregarDetalhes,
        ]
    );

    const admins =
        useMemo(
            () =>
                usuarios.filter(
                    (usuario) =>
                        ehAdministrador(
                            usuario.papel
                        ) &&
                        String(
                            usuario.membership_status ||
                            ""
                        )
                            .trim()
                            .toLowerCase() ===
                        "ativo"
                ),
            [
                usuarios,
            ]
        );

    const metricas =
        [
            {
                titulo:
                    "Empresas",
                valor:
                    carregando
                        ? "—"
                        : empresas.length,
                detalhe:
                    "Estruturas vinculadas",
                Icone:
                    Building2,
            },
            {
                titulo:
                    "Membros",
                valor:
                    carregando
                        ? "—"
                        : usuarios.length,
                detalhe:
                    "Usuários vinculados",
                Icone:
                    UsersRound,
            },
            {
                titulo:
                    "Administradores",
                valor:
                    carregando
                        ? "—"
                        : admins.length,
                detalhe:
                    "Gestores ativos",
                Icone:
                    UserCog,
            },
            {
                titulo:
                    "Domínio",
                valor:
                    tenant?.dominio_verificado
                        ? "OK"
                        : "—",
                detalhe:
                    tenant?.dominio_verificado
                        ? "Verificado"
                        : "Não verificado",
                Icone:
                    Globe2,
            },
        ];

    return (
        <div className="mx-auto max-w-[1500px]">
            <section className="overflow-hidden rounded-[1.75rem] bg-gradient-to-r from-[#09271c] via-[#0b3324] to-[#0b3d2a] px-7 py-7 text-white shadow-sm">
                <button
                    type="button"
                    onClick={onVoltar}
                    className="inline-flex items-center gap-2 rounded-xl bg-white/[0.07] px-3 py-2 text-xs font-bold text-emerald-50 transition hover:bg-white/[0.12]"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Voltar aos clientes
                </button>

                <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-2 rounded-full bg-white/[0.07] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-100">
                                <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
                                Detalhe do tenant
                            </span>

                            <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-200">
                                {
                                    textoSeguro(
                                        tenant?.tenant_status,
                                        "Sem status"
                                    )
                                }
                            </span>
                        </div>

                        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
                            {
                                textoSeguro(
                                    tenant?.tenant_nome,
                                    "Tenant sem nome"
                                )
                            }
                        </h1>

                        <p className="mt-2 font-mono text-xs text-emerald-100/70">
                            {
                                textoSeguro(
                                    tenant?.tenant_slug
                                )
                            }
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={
                            carregarDetalhes
                        }
                        disabled={
                            carregando
                        }
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.07] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-white/[0.12] disabled:cursor-wait disabled:opacity-50"
                    >
                        <RefreshCw
                            className={
                                carregando
                                    ? "h-4 w-4 animate-spin"
                                    : "h-4 w-4"
                            }
                        />

                        Atualizar dados
                    </button>
                </div>
            </section>

            <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {metricas.map(
                    (metrica) => (
                        <CardResumo
                            key={
                                metrica.titulo
                            }
                            {...metrica}
                        />
                    )
                )}
            </section>

            <nav className="mt-5 flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
                <button
                    type="button"
                    onClick={
                        () =>
                            setAbaAtiva(
                                "visao-geral"
                            )
                    }
                    className={
                        abaAtiva === "visao-geral"
                            ? "rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-bold text-white shadow-sm"
                            : "rounded-xl px-4 py-2.5 text-xs font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
                    }
                >
                    Visão geral
                </button>

                <button
                    type="button"
                    onClick={
                        () =>
                            setAbaAtiva(
                                "modulos"
                            )
                    }
                    className={
                        abaAtiva === "modulos"
                            ? "rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm"
                            : "rounded-xl px-4 py-2.5 text-xs font-bold text-slate-500 transition hover:bg-emerald-50 hover:text-emerald-800"
                    }
                >
                    Módulos
                </button>
            </nav>

            {
                abaAtiva ===
                "visao-geral"
                    ? (
                        <>
            {erro ? (
                <div className="mt-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />

                    <div>
                        <p className="font-bold">
                            Falha ao carregar os detalhes
                        </p>

                        <p className="mt-1 text-xs leading-5">
                            {erro}
                        </p>
                    </div>
                </div>
            ) : null}

            <section className="mt-5 grid gap-5 xl:grid-cols-2">
                <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-emerald-700" />

                        <h2 className="text-sm font-bold text-slate-900">
                            Identificação do tenant
                        </h2>
                    </div>

                    <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                        <div>
                            <dt className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
                                Nome
                            </dt>

                            <dd className="mt-1 text-sm font-semibold text-slate-800">
                                {
                                    textoSeguro(
                                        tenant?.tenant_nome
                                    )
                                }
                            </dd>
                        </div>

                        <div>
                            <dt className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
                                Slug
                            </dt>

                            <dd className="mt-1 font-mono text-xs font-semibold text-slate-700">
                                {
                                    textoSeguro(
                                        tenant?.tenant_slug
                                    )
                                }
                            </dd>
                        </div>

                        <div>
                            <dt className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
                                Status
                            </dt>

                            <dd className="mt-1">
                                <StatusPill
                                    valor={
                                        tenant?.tenant_status
                                    }
                                />
                            </dd>
                        </div>

                        <div>
                            <dt className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
                                Branding
                            </dt>

                            <dd className="mt-1 inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                                <Palette className="h-4 w-4 text-slate-400" />

                                {
                                    tenant?.possui_branding
                                        ? "Configurado"
                                        : "Pendente"
                                }
                            </dd>
                        </div>

                        <div>
                            <dt className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
                                Criado em
                            </dt>

                            <dd className="mt-1 inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
                                <CalendarDays className="h-4 w-4 text-slate-400" />

                                {
                                    formatarData(
                                        tenant?.tenant_created_at
                                    )
                                }
                            </dd>
                        </div>

                        <div>
                            <dt className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
                                Atualizado em
                            </dt>

                            <dd className="mt-1 text-xs font-semibold text-slate-700">
                                {
                                    formatarData(
                                        tenant?.tenant_updated_at
                                    )
                                }
                            </dd>
                        </div>
                    </dl>
                </article>

                <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-2">
                        <Globe2 className="h-4 w-4 text-emerald-700" />

                        <h2 className="text-sm font-bold text-slate-900">
                            Domínio principal
                        </h2>
                    </div>

                    <div className="mt-5">
                        <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
                            Hostname
                        </p>

                        <p className="mt-1 break-all text-sm font-bold text-slate-800">
                            {
                                textoSeguro(
                                    tenant?.dominio_principal,
                                    "Não configurado"
                                )
                            }
                        </p>
                    </div>

                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
                                Status
                            </p>

                            <div className="mt-1">
                                <StatusPill
                                    valor={
                                        tenant?.dominio_status ||
                                        "Pendente"
                                    }
                                />
                            </div>
                        </div>

                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
                                Verificação
                            </p>

                            <p className="mt-1 inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
                                <BadgeCheck
                                    className={
                                        tenant?.dominio_verificado
                                            ? "h-4 w-4 text-emerald-600"
                                            : "h-4 w-4 text-slate-300"
                                    }
                                />

                                {
                                    tenant?.dominio_verificado
                                        ? formatarData(
                                            tenant?.dominio_verificado_em
                                        )
                                        : "Não verificado"
                                }
                            </p>
                        </div>
                    </div>
                </article>
            </section>

            <TenantAdminCompaniesPanel
                empresas={
                    empresas
                }
                carregando={
                    carregando
                }
            />

            {mensagemEscopo ? (
                <div className="mt-5 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                    <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />

                    <p className="text-xs font-semibold text-emerald-800">
                        {mensagemEscopo}
                    </p>
                </div>
            ) : null}

            <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 px-5 py-4">
                    <h2 className="text-sm font-bold text-slate-900">
                        Usuários do tenant
                    </h2>

                    <p className="mt-1 text-xs text-slate-500">
                        Memberships administradas pelo escopo do tenant.
                    </p>
                </div>

                {carregando ? (
                    <div className="flex min-h-[150px] items-center justify-center">
                        <RefreshCw className="h-6 w-6 animate-spin text-emerald-600" />
                    </div>
                ) : usuarios.length === 0 ? (
                    <div className="px-5 py-10 text-center text-xs text-slate-400">
                        Nenhum usuário encontrado.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead className="bg-slate-50">
                                <tr className="border-b border-slate-200">
                                    <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">
                                        Usuário
                                    </th>

                                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">
                                        E-mail
                                    </th>

                                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">
                                        Papel
                                    </th>

                                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">
                                        Status
                                    </th>

                                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">
                                        Empresa atual
                                    </th>

                                    <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">
                                        Ação
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {usuarios.map(
                                    (usuario) => (
                                        <tr
                                            key={
                                                usuario.membership_id
                                            }
                                            className="border-b border-slate-100 last:border-b-0"
                                        >
                                            <td className="px-5 py-4">
                                                <p className="text-sm font-bold text-slate-800">
                                                    {
                                                        textoSeguro(
                                                            usuario.nome,
                                                            "Usuário"
                                                        )
                                                    }
                                                </p>

                                                <p className="mt-0.5 text-[10px] text-slate-400">
                                                    {
                                                        textoSeguro(
                                                            usuario.funcao
                                                        )
                                                    }
                                                </p>
                                            </td>

                                            <td className="px-4 py-4 text-xs font-semibold text-slate-600">
                                                {
                                                    textoSeguro(
                                                        usuario.email
                                                    )
                                                }
                                            </td>

                                            <td className="px-4 py-4">
                                                <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
                                                    {
                                                        textoSeguro(
                                                            usuario.papel
                                                        )
                                                    }
                                                </span>
                                            </td>

                                            <td className="px-4 py-4">
                                                <StatusPill
                                                    valor={
                                                        usuario.membership_status
                                                    }
                                                />
                                            </td>

                                            <td className="px-4 py-4 text-xs font-semibold text-slate-600">
                                                {
                                                    textoSeguro(
                                                        usuario.empresa
                                                    )
                                                }
                                            </td>

                                            <td className="px-5 py-4 text-right">
                                                <button
                                                    type="button"
                                                    onClick={
                                                        () => {
                                                            setMensagemEscopo(
                                                                ""
                                                            );

                                                            setUsuarioEscopo(
                                                                usuario
                                                            );
                                                        }
                                                    }
                                                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800"
                                                >
                                                    Gerenciar escopo
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
                        </>
                    )
                    : (
                        <TenantAdminModulesPanel
                            tenant={
                                tenant
                            }
                        />
                    )
            }

            <TenantAdminUserScopeModal
                key={
                    usuarioEscopo?.membership_id ||
                    "escopo-fechado"
                }
                usuario={
                    usuarioEscopo
                }
                onCancelar={
                    () =>
                        setUsuarioEscopo(
                            null
                        )
                }
                onConcluido={
                    async (
                        mensagem
                    ) => {
                        setUsuarioEscopo(
                            null
                        );

                        setMensagemEscopo(
                            mensagem
                        );

                        await carregarDetalhes();
                    }
                }
            />
        </div>
    );
}