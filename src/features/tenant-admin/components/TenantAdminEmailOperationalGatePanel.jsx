import {
    useCallback,
    useEffect,
    useState,
} from "react";

import {
    MailCheck,
    RefreshCw,
    ShieldCheck,
} from "lucide-react";

import {
    supabase,
} from "../../../lib/supabaseClient.js";

import {
    consultarRecursoEmailOperacionalTenantService,
    salvarRecursoEmailOperacionalTenantAdminService,
} from "../services/tenantAdminEmailOperationalGateService.js";

import {
    TenantAdminResourceConfirmModal,
} from "./TenantAdminResourceConfirmModal.jsx";

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

export function TenantAdminEmailOperationalGatePanel({
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
        useState(false);

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
        confirmacaoAberta,
        setConfirmacaoAberta,
    ] =
        useState(false);

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
                        await consultarRecursoEmailOperacionalTenantService({
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
                        "Não foi possível carregar o estado do e-mail operacional."
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

    async function alterar(
        proximoEstado,
        confirmado = false
    ) {
        if (
            !tenantId ||
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
            setConfirmacaoAberta(
                true
            );

            return;
        }

        setSalvando(
            true
        );

        setErro(
            ""
        );

        setSucesso(
            ""
        );

        try {
            await salvarRecursoEmailOperacionalTenantAdminService({
                supabase,
                tenantId,
                ativo:
                    proximoEstado,
            });

            await carregar();

            setSucesso(
                proximoEstado
                    ? `E-mail operacional ativado para ${tenantName}.`
                    : `E-mail operacional desativado para ${tenantName}.`
            );
        }
        catch (error) {
            setErro(
                error?.message ||
                "Não foi possível alterar o e-mail operacional."
            );
        }
        finally {
            setSalvando(
                false
            );
        }
    }

    if (carregando) {
        return (
            <section className="mt-5 flex min-h-[170px] items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center gap-3 text-sm font-semibold text-slate-500">
                    <RefreshCw className="h-5 w-5 animate-spin text-emerald-600" />

                    Carregando controle do e-mail operacional...
                </div>
            </section>
        );
    }

    const ativo =
        estado?.ativo !==
        false;

    const configurado =
        Boolean(
            estado?.configurado
        );

    return (
        <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-5 p-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-start gap-3">
                    <div
                        className={
                            ativo
                                ? "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"
                                : "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-700"
                        }
                    >
                        <MailCheck className="h-5 w-5" />
                    </div>

                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-emerald-700">
                                Controle exclusivo da Conta Mestre
                            </p>

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

                        <h2 className="mt-2 text-lg font-black text-slate-950">
                            E-mail operacional
                        </h2>

                        <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">
                            Controla se este tenant pode utilizar os envios operacionais de e-mail. O administrador do cliente não pode reativar este recurso quando a Conta Mestre o desabilitar.
                        </p>

                        <div className="mt-3 inline-flex flex-wrap items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2">
                            <span className="text-[10px] font-black uppercase tracking-[0.1em] text-amber-700">
                                Cliente alvo
                            </span>

                            <strong className="text-xs font-black text-slate-900">
                                {tenantName}
                            </strong>
                        </div>

                        <div className="mt-4 flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />

                            <div>
                                <p className="text-[11px] font-bold text-slate-700">
                                    {
                                        configurado
                                            ? "Definido pela Conta Mestre"
                                            : "Padrão SafeScan — ativo"
                                    }
                                </p>

                                <p className="mt-1 text-[10px] leading-4 text-slate-400">
                                    {
                                        configurado
                                            ? `Última alteração: ${formatarData(
                                                estado?.atualizadoEm
                                            )}`
                                            : "Nenhuma configuração explícita foi criada para este tenant."
                                    }
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="w-full shrink-0 lg:w-[300px]">
                    <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1.5">
                        <button
                            type="button"
                            disabled={
                                salvando ||
                                ativo
                            }
                            onClick={
                                () =>
                                    void alterar(
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
                                salvando ||
                                !ativo
                            }
                            onClick={
                                () =>
                                    void alterar(
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

                    <button
                        type="button"
                        disabled={
                            carregando ||
                            salvando
                        }
                        onClick={
                            () =>
                                void carregar()
                        }
                        className="mt-2 inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-50"
                    >
                        <RefreshCw
                            className={
                                salvando
                                    ? "h-3.5 w-3.5 animate-spin"
                                    : "h-3.5 w-3.5"
                            }
                        />

                        {
                            salvando
                                ? "Salvando..."
                                : "Atualizar estado"
                        }
                    </button>
                </div>
            </div>

            {!ativo ? (
                <div className="border-t border-red-200 bg-red-50 px-5 py-4">
                    <p className="text-xs font-bold text-red-800">
                        Envios operacionais bloqueados pela Conta Mestre.
                    </p>

                    <p className="mt-1 text-[11px] leading-5 text-red-700">
                        A configuração SMTP abaixo permanece preservada, mas o backend não permite o envio operacional enquanto este recurso estiver desativado.
                    </p>
                </div>
            ) : (
                <div className="border-t border-emerald-100 bg-emerald-50/60 px-5 py-3">
                    <p className="text-[11px] font-semibold text-emerald-800">
                        O tenant está autorizado pela Conta Mestre a utilizar e-mail operacional.
                    </p>
                </div>
            )}

            {erro ? (
                <div className="border-t border-red-200 bg-red-50 px-5 py-3 text-xs font-semibold text-red-700">
                    {erro}
                </div>
            ) : null}

            {sucesso ? (
                <div className="border-t border-emerald-200 bg-emerald-50 px-5 py-3 text-xs font-semibold text-emerald-800">
                    {sucesso}
                </div>
            ) : null}

            <TenantAdminResourceConfirmModal
                aberto={
                    confirmacaoAberta
                }
                tenantName={
                    tenantName
                }
                recursoNome="E-mail operacional"
                processando={
                    salvando
                }
                onCancel={
                    () =>
                        setConfirmacaoAberta(
                            false
                        )
                }
                onConfirm={
                    () => {
                        setConfirmacaoAberta(
                            false
                        );

                        void alterar(
                            false,
                            true
                        );
                    }
                }
            />        </section>
    );
}
