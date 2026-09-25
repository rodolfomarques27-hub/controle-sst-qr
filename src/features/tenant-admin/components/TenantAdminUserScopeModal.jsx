import {
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    Building2,
    CheckCircle2,
    LockKeyhole,
    RefreshCw,
    Search,
    UserCog,
} from "lucide-react";

import dashboardHero from "../../../assets/dashboard-hero-sst.webp";

import {
    supabase,
} from "../../../lib/supabaseClient.js";

import {
    obterEscopoEmpresasMembershipAdminService,
    salvarEscopoEmpresasMembershipAdminService,
} from "../services/tenantAdminService.js";

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

function normalizarIds(
    valores
) {
    return [
        ...new Set(
            (
                Array.isArray(
                    valores
                )
                    ? valores
                    : []
            )
                .map(
                    (valor) =>
                        String(
                            valor || ""
                        ).trim()
                )
                .filter(
                    Boolean
                )
        ),
    ].sort((a, b) => a.localeCompare(b));
}

export function TenantAdminUserScopeModal({
    usuario,
    onCancelar,
    onConcluido,
}) {
    const [
        dados,
        setDados,
    ] =
        useState(null);

    const [
        carregando,
        setCarregando,
    ] =
        useState(true);

    const [
        salvando,
        setSalvando,
    ] =
        useState(false);

    const [
        erro,
        setErro,
    ] =
        useState("");

    const [
        escopo,
        setEscopo,
    ] =
        useState(
            "todas"
        );

    const [
        selecionadas,
        setSelecionadas,
    ] =
        useState([]);

    const [
        busca,
        setBusca,
    ] =
        useState("");

    const membershipId =
        usuario?.membership_id ||
        "";

    useEffect(
        () => {
            let cancelado =
                false;

            async function carregar() {
                if (!membershipId) {
                    setErro(
                        "Membership inválido."
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
                    const resultado =
                        await obterEscopoEmpresasMembershipAdminService({
                            supabase,
                            membershipId,
                        });

                    if (cancelado) {
                        return;
                    }

                    const admin =
                        ehAdministrador(
                            resultado?.papel ||
                            usuario?.papel
                        );

                    const empresas =
                        Array.isArray(
                            resultado?.empresas
                        )
                            ? resultado.empresas
                            : [];

                    setDados({
                        ...resultado,
                        empresas,
                    });

                    setEscopo(
                        admin
                            ? "todas"
                            : (
                                resultado?.escopo_empresas ===
                                "selecionadas"
                                    ? "selecionadas"
                                    : "todas"
                            )
                    );

                    setSelecionadas(
                        normalizarIds(
                            empresas
                                .filter(
                                    (empresa) =>
                                        empresa?.selecionada ===
                                        true
                                )
                                .map(
                                    (empresa) =>
                                        empresa.empresa_id
                                )
                        )
                    );
                } catch (error) {
                    if (!cancelado) {
                        setErro(
                            error?.message ||
                            "Não foi possível carregar o escopo."
                        );
                    }
                } finally {
                    if (!cancelado) {
                        setCarregando(
                            false
                        );
                    }
                }
            }

            carregar();

            return () => {
                cancelado =
                    true;
            };
        },
        [
            membershipId,
            usuario?.papel,
        ]
    );

    const administrador =
        ehAdministrador(
            dados?.papel ||
            usuario?.papel
        );

    const empresas =
        useMemo(
            () =>
                Array.isArray(
                    dados?.empresas
                )
                    ? dados.empresas
                    : [],
            [
                dados,
            ]
        );

    const empresasFiltradas =
        useMemo(
            () => {
                const termo =
                    busca
                        .trim()
                        .toLowerCase();

                if (!termo) {
                    return empresas;
                }

                return empresas.filter(
                    (empresa) =>
                        String(
                            empresa?.nome ||
                            ""
                        )
                            .toLowerCase()
                            .includes(
                                termo
                            )
                );
            },
            [
                busca,
                empresas,
            ]
        );

    const escopoOriginal =
        administrador
            ? "todas"
            : (
                dados?.escopo_empresas ===
                "selecionadas"
                    ? "selecionadas"
                    : "todas"
            );

    const selecionadasOriginais =
        normalizarIds(
            empresas
                .filter(
                    (empresa) =>
                        empresa?.selecionada ===
                        true
                )
                .map(
                    (empresa) =>
                        empresa.empresa_id
                )
        );

    const selecionadasAtuais =
        normalizarIds(
            selecionadas
        );

    const mudouEmpresas =
        JSON.stringify(
            selecionadasAtuais
        ) !==
        JSON.stringify(
            selecionadasOriginais
        );

    const alterado =
        !administrador &&
        (
            escopo !==
                escopoOriginal ||
            (
                escopo ===
                    "selecionadas" &&
                mudouEmpresas
            )
        );

    const podeSalvar =
        alterado &&
        !salvando &&
        (
            escopo ===
                "todas" ||
            selecionadasAtuais.length >
                0
        );

    function alternarEmpresa(
        empresaId
    ) {
        setSelecionadas(
            (atual) => {
                if (
                    atual.includes(
                        empresaId
                    )
                ) {
                    return atual.filter(
                        (id) =>
                            id !==
                            empresaId
                    );
                }

                return normalizarIds([
                    ...atual,
                    empresaId,
                ]);
            }
        );
    }

    async function salvar() {
        if (!podeSalvar) {
            return;
        }

        setSalvando(
            true
        );

        setErro("");

        try {
            await salvarEscopoEmpresasMembershipAdminService({
                supabase,
                membershipId,
                escopoEmpresas:
                    escopo,
                empresaIds:
                    escopo ===
                    "selecionadas"
                        ? selecionadasAtuais
                        : [],
            });

            await onConcluido(
                `Escopo empresarial de ${
                    textoSeguro(
                        usuario?.nome,
                        usuario?.email ||
                        "usuário"
                    )
                } atualizado.`
            );
        } catch (error) {
            setErro(
                error?.message ||
                "Não foi possível salvar o escopo."
            );
        } finally {
            setSalvando(
                false
            );
        }
    }

    if (!usuario) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/55 p-4">
            <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
                <header
                    className="relative isolate min-h-[clamp(154px,9.8vw,178px)] overflow-hidden border-b border-emerald-950/20 bg-[#071b14] text-white"
                    style={{
                        backgroundImage:
                            `linear-gradient(90deg, rgba(4, 22, 16, 0.96) 0%, rgba(4, 28, 19, 0.88) 42%, rgba(4, 27, 18, 0.42) 74%, rgba(4, 20, 15, 0.18) 100%), url(${dashboardHero})`,
                        backgroundSize:
                            "cover",
                        backgroundPosition:
                            "center 48%",
                    }}
                >
                    <div className="relative z-10 flex min-h-[clamp(154px,9.8vw,178px)] items-center gap-4 px-6 py-5 sm:px-7">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-300/10 text-emerald-200 backdrop-blur-sm">
                            <UserCog className="h-5 w-5" />
                        </div>

                        <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">
                                SAFESCAN BRASIL
                            </p>

                            <h3
                                id="titulo-escopo-usuario"
                                className="mt-2 text-[clamp(1.65rem,3vw,2.15rem)] font-black leading-none tracking-tight text-white"
                            >
                                Escopo de acesso
                            </h3>

                            <p className="mt-2 truncate text-sm font-semibold text-slate-100/95">
                                {
                                    textoSeguro(
                                        usuario?.nome,
                                        "Usuário"
                                    )
                                }
                            </p>

                            <p className="mt-1 break-all text-xs font-medium text-slate-200/80">
                                {
                                    textoSeguro(
                                        usuario?.email
                                    )
                                }
                            </p>

                            <span
                                aria-hidden="true"
                                className="mt-4 block h-[3px] w-16 rounded-full bg-emerald-400"
                            />
                        </div>
                    </div>
                </header>

                <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
                    {carregando ? (
                        <div className="flex min-h-[260px] items-center justify-center">
                            <RefreshCw className="h-7 w-7 animate-spin text-emerald-600" />
                        </div>
                    ) : (
                        <>
                            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                                <div className="flex items-start gap-3">
                                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />

                                    <div>
                                        <p className="text-xs font-bold text-emerald-900">
                                            Isolamento empresarial ativo
                                        </p>

                                        <p className="mt-1 text-xs leading-5 text-emerald-800">
                                            O escopo define quais empresas deste cliente podem ser acessadas por este usuário.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {erro ? (
                                <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700">
                                    {erro}
                                </div>
                            ) : null}

                            <section className="mt-5">
                                <h4 className="text-sm font-bold text-slate-900">
                                    Escopo de empresas
                                </h4>

                                <p className="mt-1 text-xs text-slate-500">
                                    Defina quais empresas deste cliente poderão ser acessadas por este usuário.
                                </p>

                                {administrador ? (
                                    <div className="mt-4 flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                        <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />

                                        <div>
                                            <p className="text-sm font-bold text-slate-800">
                                                Todas as empresas
                                            </p>

                                            <p className="mt-1 text-xs text-slate-500">
                                                Administradores não podem receber escopo empresarial restrito.
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                        <button
                                            type="button"
                                            onClick={
                                                () =>
                                                    setEscopo(
                                                        "todas"
                                                    )
                                            }
                                            className={
                                                "rounded-2xl border p-4 text-left outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 focus-visible:ring-offset-2 " +
                                                (
                                                    escopo ===
                                                    "todas"
                                                        ? "border-emerald-300 bg-emerald-50"
                                                        : "border-slate-200 bg-white"
                                                )
                                            }
                                        >
                                            <p className="text-sm font-bold text-slate-900">
                                                Todas as empresas
                                            </p>

                                            <p className="mt-1 text-xs text-slate-500">
                                                Acesso a todas as empresas do cliente.
                                            </p>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={
                                                () =>
                                                    setEscopo(
                                                        "selecionadas"
                                                    )
                                            }
                                            className={
                                                "rounded-2xl border p-4 text-left outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 focus-visible:ring-offset-2 " +
                                                (
                                                    escopo ===
                                                    "selecionadas"
                                                        ? "border-emerald-300 bg-emerald-50"
                                                        : "border-slate-200 bg-white"
                                                )
                                            }
                                        >
                                            <p className="text-sm font-bold text-slate-900">
                                                Empresas selecionadas
                                            </p>

                                            <p className="mt-1 text-xs text-slate-500">
                                                Acesso somente às empresas escolhidas.
                                            </p>
                                        </button>
                                    </div>
                                )}
                            </section>

                            {!administrador &&
                            escopo ===
                                "selecionadas" ? (
                                <section className="mt-5 border-t border-slate-200 pt-5">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-900">
                                                Empresas permitidas
                                            </h4>

                                            <p className="mt-1 text-xs text-slate-500">
                                                {
                                                    selecionadasAtuais.length
                                                } selecionada(s)
                                            </p>
                                        </div>

                                        <label className="relative block w-full sm:max-w-xs">
                                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

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
                                                placeholder="Buscar empresa..."
                                                className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-xs outline-none focus:border-emerald-300"
                                            />
                                        </label>
                                    </div>

                                    <div className="mt-4 space-y-2">
                                        {empresasFiltradas.map(
                                            (empresa) => {
                                                const marcada =
                                                    selecionadasAtuais.includes(
                                                        empresa.empresa_id
                                                    );

                                                return (
                                                    <button
                                                        key={
                                                            empresa.empresa_id
                                                        }
                                                        type="button"
                                                        onClick={
                                                            () =>
                                                                alternarEmpresa(
                                                                    empresa.empresa_id
                                                                )
                                                        }
                                                        className={
                                                            "flex w-full items-center gap-3 rounded-2xl border p-4 text-left " +
                                                            (
                                                                marcada
                                                                    ? "border-emerald-300 bg-emerald-50"
                                                                    : "border-slate-200 bg-white"
                                                            )
                                                        }
                                                    >
                                                        <span
                                                            className={
                                                                "flex h-5 w-5 items-center justify-center rounded-md border " +
                                                                (
                                                                    marcada
                                                                        ? "border-emerald-600 bg-emerald-600 text-white"
                                                                        : "border-slate-300 text-transparent"
                                                                )
                                                            }
                                                        >
                                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                                        </span>

                                                        <Building2 className="h-4 w-4 text-slate-400" />

                                                        <span>
                                                            <span className="block text-sm font-bold text-slate-800">
                                                                {
                                                                    textoSeguro(
                                                                        empresa.nome,
                                                                        "Empresa"
                                                                    )
                                                                }
                                                            </span>

                                                            <span className="mt-0.5 block text-[10px] text-slate-400">
                                                                {
                                                                    textoSeguro(
                                                                        empresa.tipo_empresa,
                                                                        "Tipo não informado"
                                                                    )
                                                                }
                                                                {" · "}
                                                                {
                                                                    textoSeguro(
                                                                        empresa.status,
                                                                        "Status não informado"
                                                                    )
                                                                }
                                                            </span>
                                                        </span>
                                                    </button>
                                                );
                                            }
                                        )}
                                    </div>

                                    {selecionadasAtuais.length ===
                                    0 ? (
                                        <p className="mt-3 text-xs font-semibold text-red-600">
                                            Selecione ao menos uma empresa.
                                        </p>
                                    ) : null}
                                </section>
                            ) : null}
                        </>
                    )}
                </div>

                <footer className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4">
                    <button
                        type="button"
                        onClick={
                            onCancelar
                        }
                        disabled={
                            salvando
                        }
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600"
                    >
                        Cancelar
                    </button>

                    {!administrador ? (
                        <button
                            type="button"
                            onClick={
                                salvar
                            }
                            disabled={
                                !podeSalvar
                            }
                            className="rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {
                                salvando
                                    ? "Salvando..."
                                    : "Salvar alterações"
                            }
                        </button>
                    ) : null}
                </footer>
            </div>
        </div>
    );
}
