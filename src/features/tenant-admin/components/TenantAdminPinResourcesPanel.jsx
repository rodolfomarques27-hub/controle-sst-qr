import {
    useCallback,
    useEffect,
    useState,
} from "react";

import {
    KeyRound,
    RefreshCw,
    ShieldCheck,
} from "lucide-react";

import {
    supabase,
} from "../../../lib/supabaseClient.js";

import {
    consultarRecursosPinTenantAdminService,
    salvarRecursoPinTenantAdminService,
} from "../services/tenantAdminPinResourcesService.js";

import {
    TenantAdminResourceConfirmModal,
} from "./TenantAdminResourceConfirmModal.jsx";

const RECURSOS =
    [
        {
            chave:
                "pin_emergencia_empresa",

            titulo:
                "PIN de emergência da empresa",

            descricao:
                "Libera o contato de emergência dos colaboradores pela consulta pública do QR Code.",

            campoAtivo:
                "pinEmergenciaEmpresaAtivo",

            campoConfigurado:
                "pinEmergenciaEmpresaConfigurado",

            campoAtualizado:
                "pinEmergenciaEmpresaAtualizadoEm",
        },
        {
            chave:
                "pin_acesso_usuario",

            titulo:
                "Meu PIN de acesso",

            descricao:
                "Libera o PIN pessoal utilizado em auditorias e vistorias públicas pelo QR Code.",

            campoAtivo:
                "pinAcessoUsuarioAtivo",

            campoConfigurado:
                "pinAcessoUsuarioConfigurado",

            campoAtualizado:
                "pinAcessoUsuarioAtualizadoEm",
        },
    ];

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

export function TenantAdminPinResourcesPanel({
    tenant,
}) {
    const tenantId =
        tenant?.tenant_id ||
        "";

    const tenantName =
        String(
            tenant?.tenant_nome ||
            "Tenant sem nome"
        ).trim() ||
        "Tenant sem nome";

    const [
        estado,
        setEstado,
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
        useState("");

    const [
        erro,
        setErro,
    ] =
        useState("");

    const [
        sucesso,
        setSucesso,
    ] =
        useState("");

    const [
        confirmacao,
        setConfirmacao,
    ] =
        useState(null);

    const carregar =
        useCallback(
            async () => {
                if (!tenantId) {
                    setEstado(
                        null
                    );

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

                setErro(
                    ""
                );

                try {
                    const resultado =
                        await consultarRecursosPinTenantAdminService({
                            supabase,
                            tenantId,
                        });

                    setEstado(
                        resultado
                    );
                }
                catch (error) {
                    setEstado(
                        null
                    );

                    setErro(
                        error?.message ||
                        "Não foi possível carregar os recursos de PIN."
                    );
                }
                finally {
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
            const timerId =
                globalThis.setTimeout(
                    () => {
                        void carregar();
                    },
                    0
                );

            return () => {
                globalThis.clearTimeout(
                    timerId
                );
            };
        },
        [
            carregar,
        ]
    );

    async function alterarRecurso(
        recurso,
        proximoEstado,
        confirmado = false
    ) {
        if (
            !tenantId ||
            !recurso?.chave ||
            typeof proximoEstado !==
                "boolean" ||
            salvando
        ) {
            return;
        }

        if (
            proximoEstado ===
                false &&
            !confirmado
        ) {
            setConfirmacao({
                recurso,
            });

            return;
        }

        setSalvando(
            recurso.chave
        );

        setErro(
            ""
        );

        setSucesso(
            ""
        );

        try {
            await salvarRecursoPinTenantAdminService({
                supabase,
                tenantId,
                recursoChave:
                    recurso.chave,
                ativo:
                    proximoEstado,
            });

            await carregar();

            setSucesso(
                `${recurso.titulo} para ${tenantName} ${
                    proximoEstado
                        ? "ativado"
                        : "desativado"
                } para este cliente.`
            );
        }
        catch (error) {
            setErro(
                error?.message ||
                "Não foi possível atualizar o recurso de PIN."
            );
        }
        finally {
            setSalvando(
                ""
            );
        }
    }

    return (
        <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <header className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                        <ShieldCheck className="h-5 w-5" />
                    </div>

                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-emerald-700">
                            Controle exclusivo da Conta Mestre
                        </p>

                        <h2 className="mt-1 text-lg font-black text-slate-950">
                            Segurança e PINs
                        </h2>

                        <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">
                            Habilite ou desabilite os recursos de PIN deste cliente. O administrador do tenant não pode alterar estes controles.
                        </p>

                        <div className="mt-3 inline-flex flex-wrap items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2">
                            <span className="text-[10px] font-black uppercase tracking-[0.1em] text-amber-700">
                                Cliente alvo
                            </span>

                            <strong className="text-xs font-black text-slate-900">
                                {tenantName}
                            </strong>
                        </div>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={
                        carregar
                    }
                    disabled={
                        carregando ||
                        Boolean(
                            salvando
                        )
                    }
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-50"
                >
                    <RefreshCw
                        className={
                            carregando
                                ? "h-4 w-4 animate-spin"
                                : "h-4 w-4"
                        }
                    />

                    Atualizar
                </button>
            </header>

            {erro ? (
                <div className="mx-5 mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold leading-5 text-red-700">
                    {erro}
                </div>
            ) : null}

            {sucesso ? (
                <div className="mx-5 mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold leading-5 text-emerald-800">
                    {sucesso}
                </div>
            ) : null}

            {carregando ? (
                <div className="flex min-h-[240px] items-center justify-center">
                    <RefreshCw className="h-6 w-6 animate-spin text-emerald-600" />
                </div>
            ) : estado ? (
                <div className="grid gap-4 bg-slate-50/50 p-5 xl:grid-cols-2">
                    {RECURSOS.map(
                        (
                            recurso
                        ) => {
                            const ativo =
                                estado[
                                    recurso.campoAtivo
                                ] !==
                                false;

                            const configurado =
                                Boolean(
                                    estado[
                                        recurso.campoConfigurado
                                    ]
                                );

                            const atualizadoEm =
                                estado[
                                    recurso.campoAtualizado
                                ];

                            const processando =
                                salvando ===
                                recurso.chave;

                            return (
                                <article
                                    key={
                                        recurso.chave
                                    }
                                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                                            <KeyRound className="h-5 w-5" />
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="text-sm font-black text-slate-900">
                                                    {
                                                        recurso.titulo
                                                    }
                                                </h3>

                                                <span
                                                    className={
                                                        ativo
                                                            ? "inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-emerald-700"
                                                            : "inline-flex rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-red-700"
                                                    }
                                                >
                                                    {
                                                        ativo
                                                            ? "Ativo"
                                                            : "Desativado"
                                                    }
                                                </span>
                                            </div>

                                            <p className="mt-2 text-xs leading-5 text-slate-500">
                                                {
                                                    recurso.descricao
                                                }
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-5 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1.5">
                                        <button
                                            type="button"
                                            disabled={
                                                processando ||
                                                ativo
                                            }
                                            onClick={
                                                () =>
                                                    alterarRecurso(
                                                        recurso,
                                                        true
                                                    )
                                            }
                                            className={
                                                ativo
                                                    ? "rounded-lg bg-emerald-700 px-3 py-2.5 text-xs font-black text-white shadow-sm"
                                                    : "rounded-lg bg-white px-3 py-2.5 text-xs font-bold text-slate-600 transition hover:text-emerald-700 disabled:cursor-wait disabled:opacity-50"
                                            }
                                        >
                                            Ativar
                                        </button>

                                        <button
                                            type="button"
                                            disabled={
                                                processando ||
                                                !ativo
                                            }
                                            onClick={
                                                () =>
                                                    alterarRecurso(
                                                        recurso,
                                                        false
                                                    )
                                            }
                                            className={
                                                !ativo
                                                    ? "rounded-lg bg-red-600 px-3 py-2.5 text-xs font-black text-white shadow-sm"
                                                    : "rounded-lg bg-white px-3 py-2.5 text-xs font-bold text-slate-600 transition hover:text-red-700 disabled:cursor-wait disabled:opacity-50"
                                            }
                                        >
                                            Desativar
                                        </button>
                                    </div>

                                    <div className="mt-4 border-t border-slate-100 pt-4">
                                        <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
                                            Origem do estado
                                        </p>

                                        <p className="mt-1 text-xs font-semibold text-slate-700">
                                            {
                                                configurado
                                                    ? "Definido pela Conta Mestre"
                                                    : "Padrão SafeScan — ativo"
                                            }
                                        </p>

                                        <p className="mt-1 text-[11px] text-slate-400">
                                            {
                                                configurado
                                                    ? `Última alteração: ${formatarData(
                                                        atualizadoEm
                                                    )}`
                                                    : "Nenhuma configuração explícita foi criada para este tenant."
                                            }
                                        </p>
                                    </div>

                                    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3">
                                        <p className="text-[11px] font-semibold leading-5 text-amber-800">
                                            Desativar bloqueia o recurso no backend, mas não apaga PIN, hash ou histórico. Ao reativar, a configuração existente continua preservada.
                                        </p>
                                    </div>

                                    {processando ? (
                                        <p className="mt-3 text-[11px] font-bold text-emerald-700">
                                            Salvando alteração...
                                        </p>
                                    ) : null}
                                </article>
                            );
                        }
                    )}
                </div>
            ) : (
                <div className="px-5 py-12 text-center text-sm font-semibold text-slate-500">
                    Não foi possível carregar os recursos de PIN.
                </div>
            )}

            <TenantAdminResourceConfirmModal
                aberto={
                    Boolean(
                        confirmacao
                    )
                }
                tenantName={
                    tenantName
                }
                recursoNome={
                    confirmacao?.recurso?.titulo ||
                    ""
                }
                processando={
                    Boolean(
                        salvando
                    )
                }
                onCancel={
                    () =>
                        setConfirmacao(
                            null
                        )
                }
                onConfirm={
                    () => {
                        const pendente =
                            confirmacao;

                        setConfirmacao(
                            null
                        );

                        if (
                            pendente?.recurso
                        ) {
                            void alterarRecurso(
                                pendente.recurso,
                                false,
                                true
                            );
                        }
                    }
                }
            />        </section>
    );
}
