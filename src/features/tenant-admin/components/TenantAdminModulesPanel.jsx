import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    AlertTriangle,
    Boxes,
    CheckCircle2,
    LockKeyhole,
    PauseCircle,
    RefreshCw,
    ShieldCheck,
    SlidersHorizontal,
} from "lucide-react";

import {
    supabase,
} from "../../../lib/supabaseClient.js";

import {
    listarModulosTenantAdminService,
    salvarModuloTenantAdminService,
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

function statusAtualModulo(
    modulo
) {
    if (
        modulo?.obrigatorio
    ) {
        return "core";
    }

    if (
        !modulo?.contratado
    ) {
        return "nao_contratado";
    }

    const status =
        String(
            modulo?.entitlement_status ||
            ""
        )
            .trim()
            .toLowerCase();

    if (
        status === "ativo" ||
        status === "suspenso"
    ) {
        return status;
    }

    return "nao_contratado";
}

function rotuloStatusContrato(
    status
) {
    if (
        status === "ativo"
    ) {
        return "Ativo";
    }

    if (
        status === "suspenso"
    ) {
        return "Suspenso";
    }

    if (
        status === "nao_contratado"
    ) {
        return "Não contratado";
    }

    return "Core";
}

function configuracaoVisualModulo(
    modulo
) {
    const status =
        statusAtualModulo(
            modulo
        );

    if (
        status === "core"
    ) {
        return {
            texto:
                "Core",
            classe:
                "border-slate-200 bg-slate-100 text-slate-700",
        };
    }

    if (
        status === "ativo"
    ) {
        return {
            texto:
                "Contratado",
            classe:
                "border-emerald-200 bg-emerald-50 text-emerald-700",
        };
    }

    if (
        status === "suspenso"
    ) {
        return {
            texto:
                "Suspenso",
            classe:
                "border-amber-200 bg-amber-50 text-amber-700",
        };
    }

    return {
        texto:
            "Não contratado",
        classe:
            "border-slate-200 bg-white text-slate-500",
    };
}

function CardMetrica({
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

function ModuloCard({
    modulo,
    onGerenciar,
    bloqueado,
}) {
    const status =
        statusAtualModulo(
            modulo
        );

    const visual =
        configuracaoVisualModulo(
            modulo
        );

    const gerenciavel =
        modulo?.contratavel ===
            true &&
        modulo?.obrigatorio !==
            true;

    const disponivel =
        modulo?.disponivel ===
        true;

    return (
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <span
                            className={
                                "inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] " +
                                visual.classe
                            }
                        >
                            {visual.texto}
                        </span>

                        <span className="inline-flex rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">
                            {
                                textoSeguro(
                                    modulo?.categoria,
                                    "geral"
                                )
                            }
                        </span>
                    </div>

                    <h3 className="mt-3 text-base font-bold text-slate-900">
                        {
                            textoSeguro(
                                modulo?.modulo_nome,
                                "Módulo sem nome"
                            )
                        }
                    </h3>

                    <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">
                        {
                            textoSeguro(
                                modulo?.modulo_descricao,
                                "Sem descrição cadastrada."
                            )
                        }
                    </p>

                    <p className="mt-3 font-mono text-[10px] text-slate-400">
                        {
                            textoSeguro(
                                modulo?.modulo_chave
                            )
                        }
                    </p>
                </div>

                <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                    <span
                        className={
                            disponivel
                                ? "inline-flex rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-emerald-700"
                                : "inline-flex rounded-full bg-red-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-red-700"
                        }
                    >
                        {
                            disponivel
                                ? "Disponível"
                                : "Indisponível"
                        }
                    </span>

                    {gerenciavel ? (
                        <button
                            type="button"
                            onClick={
                                () =>
                                    onGerenciar(
                                        modulo
                                    )
                            }
                            disabled={
                                bloqueado
                            }
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800 disabled:cursor-wait disabled:opacity-50"
                        >
                            Gerenciar
                        </button>
                    ) : (
                        <span className="text-[10px] font-semibold text-slate-400">
                            Gerenciado pelo sistema
                        </span>
                    )}
                </div>
            </div>

            <div className="mt-5 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
                        Contrato
                    </p>

                    <p className="mt-1 text-sm font-bold text-slate-800">
                        {
                            rotuloStatusContrato(
                                status
                            )
                        }
                    </p>
                </div>

                <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
                        Disponibilidade
                    </p>

                    <p className="mt-1 text-sm font-bold text-slate-800">
                        {
                            disponivel
                                ? "Disponível"
                                : "Indisponível"
                        }
                    </p>
                </div>


            </div>
        </article>
    );
}

function GerenciarModuloModal({
    modulo,
    tenantId,
    onCancelar,
    onConcluido,
}) {
    const [
        statusSelecionado,
        setStatusSelecionado,
    ] =
        useState(
            statusAtualModulo(
                modulo
            )
        );

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

    if (!modulo) {
        return null;
    }

    const statusOriginal =
        statusAtualModulo(
            modulo
        );

    const alterado =
        statusSelecionado !==
        statusOriginal;

    async function salvarAlteracao() {
        if (
            !tenantId ||
            !alterado
        ) {
            return;
        }

        setSalvando(
            true
        );

        setErro("");

        try {
            await salvarModuloTenantAdminService({
                supabase,
                tenantId,
                moduloChave:
                    modulo.modulo_chave,
                status:
                    statusSelecionado,
                observacao:
                    "",
                configuracao:
                    modulo.configuracao ||
                    {},
            });

            await onConcluido(
                `${
                    textoSeguro(
                        modulo.modulo_nome,
                        "Módulo"
                    )
                } atualizado para ${
                    rotuloStatusContrato(
                        statusSelecionado
                    )
                }.`
            );
        } catch (error) {
            setErro(
                error?.message ||
                "Não foi possível atualizar o módulo do cliente."
            );
        } finally {
            setSalvando(
                false
            );
        }
    }

    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/55 p-4">
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="titulo-gerenciar-modulo"
                className="w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
            >
                <header className="border-b border-slate-200 px-6 py-5">
                    <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                            <SlidersHorizontal className="h-5 w-5" />
                        </div>

                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-emerald-700">
                                Gestão do módulo
                            </p>

                            <h3
                                id="titulo-gerenciar-modulo"
                                className="mt-1 text-xl font-bold text-slate-950"
                            >
                                {
                                    textoSeguro(
                                        modulo.modulo_nome
                                    )
                                }
                            </h3>

                            <p className="mt-1 text-xs text-slate-500">
                                Defina a situação deste módulo no contrato do cliente.
                            </p>
                        </div>
                    </div>
                </header>

                <div className="px-6 py-5">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <h4 className="text-sm font-bold text-slate-900">
                                Contrato do cliente
                            </h4>

                            <p className="mt-1 text-xs text-slate-500">
                                O módulo pertence ao ambiente do cliente e vale para todo o tenant.
                            </p>
                        </div>

                        <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-600">
                            Atual: {
                                rotuloStatusContrato(
                                    statusOriginal
                                )
                            }
                        </span>
                    </div>

                    <div className="mt-4 grid gap-3">
                        {[
                            {
                                valor:
                                    "ativo",
                                titulo:
                                    "Ativo",
                                descricao:
                                    "Módulo contratado e disponível no ambiente do cliente.",
                            },
                            {
                                valor:
                                    "suspenso",
                                titulo:
                                    "Suspenso",
                                descricao:
                                    "O contrato é mantido, mas o módulo fica temporariamente indisponível.",
                            },
                            {
                                valor:
                                    "nao_contratado",
                                titulo:
                                    "Não contratado",
                                descricao:
                                    "O módulo deixa de fazer parte do contrato do cliente.",
                            },
                        ].map(
                            (
                                opcao
                            ) => {
                                const selecionada =
                                    statusSelecionado ===
                                    opcao.valor;

                                const critica =
                                    opcao.valor ===
                                    "nao_contratado";

                                return (
                                    <button
                                        key={
                                            opcao.valor
                                        }
                                        type="button"
                                        onClick={
                                            () =>
                                                setStatusSelecionado(
                                                    opcao.valor
                                                )
                                        }
                                        disabled={
                                            salvando
                                        }
                                        className={
                                            "rounded-2xl border p-4 text-left transition disabled:opacity-50 " +
                                            (
                                                selecionada
                                                    ? critica
                                                        ? "border-red-300 bg-red-50"
                                                        : "border-emerald-300 bg-emerald-50"
                                                    : "border-slate-200 bg-white hover:bg-slate-50"
                                            )
                                        }
                                    >
                                        <p
                                            className={
                                                critica
                                                    ? "text-sm font-bold text-red-800"
                                                    : "text-sm font-bold text-slate-900"
                                            }
                                        >
                                            {opcao.titulo}
                                        </p>

                                        <p className="mt-1 text-xs leading-5 text-slate-500">
                                            {opcao.descricao}
                                        </p>
                                    </button>
                                );
                            }
                        )}
                    </div>

                    {statusSelecionado ===
                    "nao_contratado" ? (
                        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />

                            <p className="text-xs leading-5 text-red-700">
                                Esta ação remove o módulo do contrato do cliente e o torna indisponível no ambiente.
                            </p>
                        </div>
                    ) : null}

                    {erro ? (
                        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700">
                            {erro}
                        </div>
                    ) : null}
                </div>

                <footer className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        onClick={
                            onCancelar
                        }
                        disabled={
                            salvando
                        }
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    >
                        Cancelar
                    </button>

                    <button
                        type="button"
                        onClick={
                            salvarAlteracao
                        }
                        disabled={
                            salvando ||
                            !alterado
                        }
                        className="rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        {
                            salvando
                                ? "Salvando..."
                                : "Salvar alterações"
                        }
                    </button>
                </footer>
            </div>
        </div>
    );
}

export function TenantAdminModulesPanel({
    tenant,
}) {
    const [
        modulos,
        setModulos,
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
        moduloEmEdicao,
        setModuloEmEdicao,
    ] =
        useState(null);

    const [
        mensagemSucesso,
        setMensagemSucesso,
    ] =
        useState("");

    const tenantId =
        tenant?.tenant_id ||
        "";

    const carregarModulos =
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
                    const resultado =
                        await listarModulosTenantAdminService({
                            supabase,
                            tenantId,
                        });

                    setModulos(
                        resultado
                    );
                } catch (error) {
                    setModulos(
                        []
                    );

                    setErro(
                        error?.message ||
                        "Não foi possível carregar os módulos do cliente."
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
            carregarModulos();
        },
        [
            carregarModulos,
        ]
    );

    const metricas =
        useMemo(
            () => {
                const contrataveis =
                    modulos.filter(
                        (
                            modulo
                        ) =>
                            modulo?.contratavel ===
                            true
                    );

                return {
                    contrataveis:
                        contrataveis.length,

                    contratados:
                        contrataveis.filter(
                            (
                                modulo
                            ) =>
                                modulo?.contratado ===
                                true
                        ).length,

                    disponiveis:
                        contrataveis.filter(
                            (
                                modulo
                            ) =>
                                modulo?.disponivel ===
                                true
                        ).length,

                    suspensos:
                        contrataveis.filter(
                            (
                                modulo
                            ) =>
                                statusAtualModulo(
                                    modulo
                                ) ===
                                "suspenso"
                        ).length,

                    core:
                        modulos.filter(
                            (
                                modulo
                            ) =>
                                modulo?.obrigatorio ===
                                    true &&
                                modulo?.disponivel ===
                                    true
                        ).length,
                };
            },
            [
                modulos,
            ]
        );

    function abrirGerenciamento(
        modulo
    ) {
        setModuloEmEdicao(
            modulo
        );

        setMensagemSucesso(
            ""
        );
    }

    async function concluirGerenciamento(
        mensagem
    ) {
        await carregarModulos();

        setModuloEmEdicao(
            null
        );

        setMensagemSucesso(
            mensagem
        );
    }

    return (
        <>
            <section className="mt-5">
                <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Boxes className="h-4 w-4 text-emerald-700" />

                            <h2 className="text-sm font-bold text-slate-900">
                                Módulos do cliente
                            </h2>

                            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-emerald-700">
                                Contrato do tenant
                            </span>
                        </div>

                        <p className="mt-2 max-w-3xl text-xs leading-5 text-slate-500">
                            Configure somente os módulos contratados pelo cliente.
                            Empresas vinculadas são entidades operacionais e não possuem licenciamento próprio.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={
                            carregarModulos
                        }
                        disabled={
                            carregando
                        }
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

                {mensagemSucesso ? (
                    <div className="mt-4 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />

                        <p className="text-xs font-semibold text-emerald-800">
                            {mensagemSucesso}
                        </p>
                    </div>
                ) : null}

                <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <CardMetrica
                        titulo="Contratados"
                        valor={
                            carregando
                                ? "—"
                                : `${metricas.contratados}/${metricas.contrataveis}`
                        }
                        detalhe="Módulos comerciais"
                        Icone={ShieldCheck}
                    />

                    <CardMetrica
                        titulo="Disponíveis"
                        valor={
                            carregando
                                ? "—"
                                : metricas.disponiveis
                        }
                        detalhe="Operacionais no cliente"
                        Icone={CheckCircle2}
                    />

                    <CardMetrica
                        titulo="Suspensos"
                        valor={
                            carregando
                                ? "—"
                                : metricas.suspensos
                        }
                        detalhe="Bloqueados temporariamente"
                        Icone={PauseCircle}
                    />

                    <CardMetrica
                        titulo="Núcleo"
                        valor={
                            carregando
                                ? "—"
                                : metricas.core
                        }
                        detalhe="Módulo obrigatório"
                        Icone={LockKeyhole}
                    />
                </div>

                {erro ? (
                    <div className="mt-4 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />

                        <div>
                            <p className="font-bold">
                                Falha ao carregar os módulos
                            </p>

                            <p className="mt-1 text-xs leading-5">
                                {erro}
                            </p>
                        </div>
                    </div>
                ) : null}

                {carregando ? (
                    <div className="mt-4 flex min-h-[220px] items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <RefreshCw className="h-7 w-7 animate-spin text-emerald-600" />
                    </div>
                ) : null}

                {!carregando &&
                !erro &&
                modulos.length > 0 ? (
                    <div className="mt-4 grid gap-4 xl:grid-cols-2">
                        {modulos.map(
                            (
                                modulo
                            ) => (
                                <ModuloCard
                                    key={
                                        modulo.modulo_chave
                                    }
                                    modulo={
                                        modulo
                                    }
                                    onGerenciar={
                                        abrirGerenciamento
                                    }
                                    bloqueado={
                                        carregando
                                    }
                                />
                            )
                        )}
                    </div>
                ) : null}
            </section>

            <GerenciarModuloModal
                key={
                    moduloEmEdicao?.modulo_chave ||
                    "modal-fechado"
                }
                modulo={
                    moduloEmEdicao
                }
                tenantId={
                    tenantId
                }
                onCancelar={
                    () =>
                        setModuloEmEdicao(
                            null
                        )
                }
                onConcluido={
                    concluirGerenciamento
                }
            />
        </>
    );
}