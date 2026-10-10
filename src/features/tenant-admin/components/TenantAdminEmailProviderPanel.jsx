import {
    useCallback,
    useEffect,
    useState,
} from "react";

import {
    CheckCircle2,
    CircleAlert,
    Mail,
    PlugZap,
    RefreshCw,
    Save,
    ShieldCheck,
} from "lucide-react";

import {
    CONFIGURACAO_EMAIL_TENANT_PADRAO,
    definirModoEmailTenantAdminService,
    obterConfiguracaoEmailTenantAdminService,
    salvarConfiguracaoEmailTenantAdminService,
    testarConfiguracaoEmailTenantAdminService,
} from "../services/tenantAdminEmailProviderService.js";

import {
    mensagemTesteEmailTenant,
} from "../services/tenantAdminEmailMensagens.js";

import {
    supabase,
} from "../../../lib/supabaseClient.js";

import {
    consultarRecursoEmailOperacionalTenantService,
} from "../services/tenantAdminEmailOperationalGateService.js";

const FORMULARIO_PADRAO =
    Object.freeze({
        provedor:
            "GMAIL_SMTP",

        host:
            "smtp.gmail.com",

        porta:
            "465",

        modoSeguranca:
            "TLS_IMPLICITO",

        usuarioSmtp:
            "",

        remetenteEmail:
            "",

        remetenteNomePadrao:
            "SafeScan Brasil",

        responderParaPadrao:
            "",
    });

function texto(
    valor,
) {
    return String(
        valor ?? "",
    ).trim();
}

function formularioDaConfiguracao(
    configuracao,
) {
    const atual =
        configuracao ||
        CONFIGURACAO_EMAIL_TENANT_PADRAO;

    return {
        provedor:
            texto(
                atual.provedor,
            ) ||
            FORMULARIO_PADRAO.provedor,

        host:
            texto(
                atual.host,
            ) ||
            FORMULARIO_PADRAO.host,

        porta:
            atual.porta
                ? String(
                    atual.porta,
                )
                : FORMULARIO_PADRAO.porta,

        modoSeguranca:
            texto(
                atual.modoSeguranca,
            ) ||
            FORMULARIO_PADRAO.modoSeguranca,

        usuarioSmtp:
            texto(
                atual.usuarioSmtp,
            ),

        remetenteEmail:
            texto(
                atual.remetenteEmail,
            ),

        remetenteNomePadrao:
            texto(
                atual.remetenteNomePadrao,
            ) ||
            FORMULARIO_PADRAO.remetenteNomePadrao,

        responderParaPadrao:
            texto(
                atual.responderParaPadrao,
            ),
    };
}

function rotuloModo(
    modo,
) {
    const normalizado =
        texto(
            modo,
        ).toUpperCase();

    const rotulos = {
        DESATIVADO:
            "Desativado",

        PROVEDOR_CLIENTE:
            "Provedor próprio",

        SAFESCAN_GERENCIADO:
            "SafeScan gerenciado",
    };

    return (
        rotulos[
            normalizado
        ] ||
        "Desativado"
    );
}

function rotuloTeste(
    status,
) {
    const normalizado =
        texto(
            status,
        ).toUpperCase();

    const rotulos = {
        APROVADO:
            "Aprovado",

        REPROVADO:
            "Reprovado",

        NAO_TESTADO:
            "Não realizado",

        NAO_APLICAVEL:
            "Não aplicável",
    };

    return (
        rotulos[
            normalizado
        ] ||
        "Não realizado"
    );
}

function formatarDataHora(
    valor,
) {
    if (!valor) {
        return "—";
    }

    const data =
        new Date(
            valor,
        );

    if (
        Number.isNaN(
            data.getTime(),
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
        },
    ).format(
        data,
    );
}

function StatusTag({
    children,
    tipo = "neutro",
}) {
    const classes = {
        sucesso:
            "border-emerald-200 bg-emerald-50 text-emerald-700",

        alerta:
            "border-amber-200 bg-amber-50 text-amber-700",

        erro:
            "border-red-200 bg-red-50 text-red-700",

        neutro:
            "border-slate-200 bg-slate-50 text-slate-600",
    };

    return (
        <span
            className={
                "inline-flex rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.08em] " +
                (
                    classes[
                        tipo
                    ] ||
                    classes.neutro
                )
            }
        >
            {children}
        </span>
    );
}

export function TenantAdminEmailProviderPanel({
    tenant,
    ocultarModosAlternativos = false,
}) {
    const tenantId =
        texto(
            tenant?.tenant_id,
        );

    const [
        configuracao,
        setConfiguracao,
    ] =
        useState(
            CONFIGURACAO_EMAIL_TENANT_PADRAO,
        );

    const [
        formulario,
        setFormulario,
    ] =
        useState({
            ...FORMULARIO_PADRAO,
        });

    const [
        credencialNova,
        setCredencialNova,
    ] =
        useState("");

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
        testando,
        setTestando,
    ] =
        useState(false);

    const [
        alterandoModo,
        setAlterandoModo,
    ] =
        useState("");

    const [
        formularioAlterado,
        setFormularioAlterado,
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
        gateMestreAtivo,
        setGateMestreAtivo,
    ] =
        useState(true);

    const [
        gateMestreCarregado,
        setGateMestreCarregado,
    ] =
        useState(false);

    const aplicarConfiguracao =
        useCallback(
            (
                proximaConfiguracao,
            ) => {
                const segura = {
                    ...CONFIGURACAO_EMAIL_TENANT_PADRAO,
                    ...(
                        proximaConfiguracao ||
                        {}
                    ),
                };

                setConfiguracao(
                    segura,
                );

                setFormulario(
                    formularioDaConfiguracao(
                        segura,
                    ),
                );

                setCredencialNova(
                    "",
                );

                setFormularioAlterado(
                    false,
                );
            },
            [],
        );

    const carregar =
        useCallback(
            async () => {
                if (!tenantId) {
                    setErro(
                        "Tenant inválido para configuração de e-mail.",
                    );

                    setCarregando(
                        false,
                    );

                    return;
                }

                setCarregando(
                    true,
                );

                setErro(
                    "",
                );

                setGateMestreCarregado(
                    false,
                );

                try {
                    const gateMestre =
                        await consultarRecursoEmailOperacionalTenantService({
                            supabase,
                            tenantId,
                        });

                    const gateMestreAtivoSeguro =
                        gateMestre?.ativo !==
                        false;

                    setGateMestreAtivo(
                        gateMestreAtivoSeguro,
                    );

                    setGateMestreCarregado(
                        true,
                    );

                    if (!gateMestreAtivoSeguro) {
                        return;
                    }

                    const resultado =
                        await obterConfiguracaoEmailTenantAdminService({
                            tenantId,
                        });

                    aplicarConfiguracao(
                        resultado,
                    );
                }
                catch (
                    error
                ) {
                    setErro(
                        error?.message ||
                        "Não foi possível carregar a configuração de e-mail do tenant.",
                    );
                }
                finally {
                    setCarregando(
                        false,
                    );
                }
            },
            [
                aplicarConfiguracao,
                tenantId,
            ],
        );

    useEffect(
        () => {
            const timerId =
                globalThis.setTimeout(
                    () => {
                        void carregar();
                    },
                    0,
                );

            return () => {
                globalThis.clearTimeout(
                    timerId,
                );
            };
        },
        [
            carregar,
        ],
    );

    function atualizarCampo(
        campo,
        valor,
    ) {
        setFormulario(
            (
                atual,
            ) => ({
                ...atual,
                [campo]:
                    valor,
            }),
        );

        setFormularioAlterado(
            true,
        );

        setErro(
            "",
        );

        setSucesso(
            "",
        );
    }

    function selecionarProvedor(
        provedor,
    ) {
        if (
            provedor ===
            "GMAIL_SMTP"
        ) {
            setFormulario(
                (
                    atual,
                ) => ({
                    ...atual,
                    provedor,
                    host:
                        "smtp.gmail.com",
                    porta:
                        atual.modoSeguranca ===
                        "STARTTLS"
                            ? "587"
                            : "465",
                    modoSeguranca:
                        atual.modoSeguranca ===
                        "STARTTLS"
                            ? "STARTTLS"
                            : "TLS_IMPLICITO",
                }),
            );
        }
        else if (
            provedor ===
            "MICROSOFT_365_SMTP"
        ) {
            setFormulario(
                (
                    atual,
                ) => ({
                    ...atual,
                    provedor,
                    host:
                        "smtp.office365.com",
                    porta:
                        "587",
                    modoSeguranca:
                        "STARTTLS",
                }),
            );
        }
        else {
            setFormulario(
                (
                    atual,
                ) => ({
                    ...atual,
                    provedor,
                    host:
                        "",
                    porta:
                        "587",
                    modoSeguranca:
                        "STARTTLS",
                }),
            );
        }

        setFormularioAlterado(
            true,
        );

        setErro(
            "",
        );

        setSucesso(
            "",
        );
    }

    function selecionarSeguranca(
        modoSeguranca,
    ) {
        setFormulario(
            (
                atual,
            ) => ({
                ...atual,
                modoSeguranca,
                porta:
                    atual.provedor ===
                    "GMAIL_SMTP"
                        ? (
                            modoSeguranca ===
                            "TLS_IMPLICITO"
                                ? "465"
                                : "587"
                        )
                        : atual.porta,
            }),
        );

        setFormularioAlterado(
            true,
        );

        setErro(
            "",
        );

        setSucesso(
            "",
        );
    }

    async function salvar(
        event,
    ) {
        event?.preventDefault?.();

        setErro(
            "",
        );

        setSucesso(
            "",
        );

        if (
            !texto(
                formulario.usuarioSmtp,
            ) ||
            !texto(
                formulario.remetenteEmail,
            ) ||
            !texto(
                formulario.remetenteNomePadrao,
            )
        ) {
            setErro(
                "Preencha usuário SMTP, e-mail do remetente e nome do remetente.",
            );

            return;
        }

        if (
            !configuracao.credencialConfigurada &&
            credencialNova.length ===
                0
        ) {
            setErro(
                "Informe a credencial SMTP para a primeira configuração.",
            );

            return;
        }

        setSalvando(
            true,
        );

        try {
            const resultado =
                await salvarConfiguracaoEmailTenantAdminService({
                    tenantId,

                    configuracao: {
                        ...formulario,

                        porta:
                            Number(
                                formulario.porta,
                            ) || null,

                        versao:
                            configuracao.versao,
                    },

                    credencialNova,
                });

            aplicarConfiguracao(
                resultado,
            );

            setSucesso(
                "Configuração salva. Execute o teste SMTP antes de ativar o provedor próprio.",
            );
        }
        catch (
            error
        ) {
            setErro(
                error?.message ||
                "Não foi possível salvar a configuração.",
            );
        }
        finally {
            setSalvando(
                false,
            );
        }
    }

    async function testar() {
        setErro(
            "",
        );

        setSucesso(
            "",
        );

        if (
            formularioAlterado
        ) {
            setErro(
                "Salve as alterações antes de executar o teste SMTP.",
            );

            return;
        }

        if (
            !configuracao.credencialConfigurada
        ) {
            setErro(
                "Salve uma credencial SMTP antes de executar o teste.",
            );

            return;
        }

        setTestando(
            true,
        );

        try {
            const resultado =
                await testarConfiguracaoEmailTenantAdminService({
                    tenantId,
                });

            aplicarConfiguracao(
                resultado.configuracao,
            );

            if (
                resultado.teste?.status ===
                "APROVADO"
            ) {
                setSucesso(
                    "Conexão SMTP aprovada. O provedor próprio pode ser ativado.",
                );
            }
            else {
                setErro(
                    mensagemTesteEmailTenant(
                        resultado.teste?.codigo,
                    ),
                );
            }
        }
        catch (
            error
        ) {
            setErro(
                error?.message ||
                "Não foi possível testar a conexão SMTP.",
            );
        }
        finally {
            setTestando(
                false,
            );
        }
    }

    async function definirModo(
        modoEnvio,
    ) {
        setErro(
            "",
        );

        setSucesso(
            "",
        );

        if (
            modoEnvio ===
            "PROVEDOR_CLIENTE" &&
            (
                formularioAlterado ||
                !configuracao.credencialConfigurada ||
                configuracao.ultimoTesteStatus !==
                    "APROVADO"
            )
        ) {
            setErro(
                "Para ativar o provedor próprio, salve a configuração e conclua um teste SMTP aprovado.",
            );

            return;
        }

        if (
            modoEnvio ===
            "SAFESCAN_GERENCIADO" &&
            !configuracao.safescanGerenciadoDisponivel
        ) {
            setErro(
                "O provedor gerenciado SafeScan não está disponível para este tenant.",
            );

            return;
        }

        setAlterandoModo(
            modoEnvio,
        );

        try {
            const resultado =
                await definirModoEmailTenantAdminService({
                    tenantId,
                    modoEnvio,
                    versaoEsperada:
                        configuracao.versao,
                });

            aplicarConfiguracao(
                resultado,
            );

            setSucesso(
                `Modo operacional alterado para ${rotuloModo(
                    resultado.modoEnvio,
                )}.`,
            );
        }
        catch (
            error
        ) {
            setErro(
                error?.message ||
                "Não foi possível alterar o modo de envio.",
            );
        }
        finally {
            setAlterandoModo(
                "",
            );
        }
    }

    const testeAprovado =
        configuracao.ultimoTesteStatus ===
        "APROVADO";

    const provedorPersonalizado =
        formulario.provedor ===
        "SMTP_PERSONALIZADO";

    const gmail =
        formulario.provedor ===
        "GMAIL_SMTP";

    const microsoft =
        formulario.provedor ===
        "MICROSOFT_365_SMTP";

    if (
        carregando
    ) {
        return (
            <section className="mt-5 flex min-h-[260px] items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center gap-3 text-sm font-semibold text-slate-500">
                    <RefreshCw className="h-5 w-5 animate-spin text-emerald-600" />
                    Carregando configuração de e-mail...
                </div>
            </section>
        );
    }

    if (!gateMestreCarregado) {
        return (
            <section className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-5 shadow-sm">
                <div className="flex items-start gap-3 text-red-800">
                    <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" />

                    <div>
                        <p className="text-sm font-black">
                            Não foi possível validar a disponibilidade do e-mail operacional
                        </p>

                        <p className="mt-1 text-xs leading-5">
                            Nenhum controle de alteração foi liberado. Atualize a página ou tente novamente antes de configurar o SMTP.
                        </p>
                    </div>
                </div>
            </section>
        );
    }

    if (!gateMestreAtivo) {
        return (
            <section className="mt-5 overflow-hidden rounded-2xl border border-amber-300 bg-white shadow-sm">
                <div className="flex items-start gap-3 p-5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                        <Mail className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-amber-700">
                            Controle da Conta Mestre
                        </p>

                        <h2 className="mt-1 text-base font-black text-slate-950">
                            Indisponível pela Conta Mestre
                        </h2>

                        <p className="mt-2 text-xs leading-5 text-slate-600">
                            O e-mail operacional foi desabilitado para este ambiente.
                            A configuração SMTP, credencial, versão e histórico permanecem
                            preservados e voltarão a ficar disponíveis quando a Conta Mestre
                            reativar o recurso.
                        </p>

                        <button
                            type="button"
                            onClick={() => void carregar()}
                            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 transition hover:bg-amber-100"
                        >
                            <RefreshCw className="h-4 w-4" />
                            Atualizar estado
                        </button>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className="mt-5 space-y-5">
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                            <Mail className="h-5 w-5" />
                        </div>

                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-emerald-700">
                                E-mail operacional
                            </p>

                            <h2 className="mt-1 text-base font-bold text-slate-950">
                                Provedor do tenant
                            </h2>

                            <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">
                                Configuração disponível à Conta Mestre e ao administrador autorizado deste tenant.
                                Credenciais são gravadas de forma write-only e nunca são
                                devolvidas para esta tela.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <StatusTag
                            tipo={
                                configuracao.modoEnvio ===
                                "DESATIVADO"
                                    ? "neutro"
                                    : "sucesso"
                            }
                        >
                            {rotuloModo(
                                configuracao.modoEnvio,
                            )}
                        </StatusTag>

                        <button
                            type="button"
                            onClick={
                                () =>
                                    void carregar()
                            }
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
                        >
                            <RefreshCw className="h-4 w-4" />
                            Atualizar
                        </button>
                    </div>
                </div>
            </article>

            {erro ? (
                <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
                    <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />

                    <p className="text-xs font-semibold leading-5">
                        {erro}
                    </p>
                </div>
            ) : null}

            {sucesso ? (
                <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />

                    <p className="text-xs font-semibold leading-5">
                        {sucesso}
                    </p>
                </div>
            ) : null}

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
                <form
                    onSubmit={salvar}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                    <div>
                        <p className="text-sm font-bold text-slate-900">
                            Provedor próprio
                        </p>

                        <p className="mt-1 text-xs leading-5 text-slate-500">
                            Salvar a configuração não ativa o envio. O teste SMTP
                            precisa ser aprovado antes da ativação.
                        </p>
                    </div>

                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                        <label className="space-y-1.5">
                            <span className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">
                                Provedor
                            </span>

                            <select
                                value={formulario.provedor}
                                onChange={
                                    (
                                        event,
                                    ) =>
                                        selecionarProvedor(
                                            event.target.value,
                                        )
                                }
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-400"
                            >
                                <option value="GMAIL_SMTP">
                                    Gmail SMTP
                                </option>

                                <option value="MICROSOFT_365_SMTP">
                                    Microsoft 365 SMTP
                                </option>

                                <option value="SMTP_PERSONALIZADO">
                                    SMTP personalizado
                                </option>
                            </select>
                        </label>

                        <label className="space-y-1.5">
                            <span className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">
                                Segurança
                            </span>

                            <select
                                value={formulario.modoSeguranca}
                                disabled={microsoft}
                                onChange={
                                    (
                                        event,
                                    ) =>
                                        selecionarSeguranca(
                                            event.target.value,
                                        )
                                }
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none disabled:bg-slate-50 disabled:text-slate-400"
                            >
                                <option value="TLS_IMPLICITO">
                                    TLS implícito
                                </option>

                                <option value="STARTTLS">
                                    STARTTLS
                                </option>
                            </select>
                        </label>

                        <label className="space-y-1.5">
                            <span className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">
                                Host
                            </span>

                            <input
                                type="text"
                                value={formulario.host}
                                disabled={
                                    gmail ||
                                    microsoft
                                }
                                onChange={
                                    (
                                        event,
                                    ) =>
                                        atualizarCampo(
                                            "host",
                                            event.target.value,
                                        )
                                }
                                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none disabled:bg-slate-50"
                            />
                        </label>

                        <label className="space-y-1.5">
                            <span className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">
                                Porta
                            </span>

                            <input
                                type="number"
                                min="1"
                                max="65535"
                                value={formulario.porta}
                                disabled={!provedorPersonalizado}
                                onChange={
                                    (
                                        event,
                                    ) =>
                                        atualizarCampo(
                                            "porta",
                                            event.target.value,
                                        )
                                }
                                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none disabled:bg-slate-50"
                            />
                        </label>

                        <label className="space-y-1.5 md:col-span-2">
                            <span className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">
                                Usuário SMTP
                            </span>

                            <input
                                type="text"
                                value={formulario.usuarioSmtp}
                                onChange={
                                    (
                                        event,
                                    ) =>
                                        atualizarCampo(
                                            "usuarioSmtp",
                                            event.target.value,
                                        )
                                }
                                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-emerald-400"
                            />
                        </label>

                        <label className="space-y-1.5">
                            <span className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">
                                E-mail do remetente
                            </span>

                            <input
                                type="email"
                                value={formulario.remetenteEmail}
                                onChange={
                                    (
                                        event,
                                    ) =>
                                        atualizarCampo(
                                            "remetenteEmail",
                                            event.target.value,
                                        )
                                }
                                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-emerald-400"
                            />
                        </label>

                        <label className="space-y-1.5">
                            <span className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">
                                Nome do remetente
                            </span>

                            <input
                                type="text"
                                value={formulario.remetenteNomePadrao}
                                onChange={
                                    (
                                        event,
                                    ) =>
                                        atualizarCampo(
                                            "remetenteNomePadrao",
                                            event.target.value,
                                        )
                                }
                                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-emerald-400"
                            />
                        </label>

                        <label className="space-y-1.5 md:col-span-2">
                            <span className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">
                                Responder para — opcional
                            </span>

                            <input
                                type="email"
                                value={formulario.responderParaPadrao}
                                onChange={
                                    (
                                        event,
                                    ) =>
                                        atualizarCampo(
                                            "responderParaPadrao",
                                            event.target.value,
                                        )
                                }
                                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-emerald-400"
                            />
                        </label>

                        <label className="space-y-1.5 md:col-span-2">
                            <span className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">
                                Credencial SMTP
                            </span>

                            <input
                                type="password"
                                autoComplete="new-password"
                                value={credencialNova}
                                placeholder={
                                    configuracao.credencialConfigurada
                                        ? "Nova credencial — deixe em branco para manter a atual"
                                        : "Informe a credencial SMTP"
                                }
                                onChange={
                                    (
                                        event,
                                    ) => {
                                        setCredencialNova(
                                            event.target.value,
                                        );

                                        setFormularioAlterado(
                                            true,
                                        );

                                        setErro(
                                            "",
                                        );

                                        setSucesso(
                                            "",
                                        );
                                    }
                                }
                                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-emerald-400"
                            />

                            <p className="text-[11px] leading-5 text-slate-400">
                                A credencial é write-only. A tela conhece apenas se
                                existe uma credencial configurada.
                            </p>
                        </label>
                    </div>

                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
                        <div className="text-xs text-slate-500">
                            Credencial configurada:{" "}
                            <strong className="text-slate-700">
                                {
                                    configuracao.credencialConfigurada
                                        ? "Sim"
                                        : "Não"
                                }
                            </strong>
                        </div>

                        <button
                            type="submit"
                            disabled={salvando}
                            className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                        >
                            {
                                salvando
                                    ? (
                                        <RefreshCw className="h-4 w-4 animate-spin" />
                                    )
                                    : (
                                        <Save className="h-4 w-4" />
                                    )
                            }

                            {
                                salvando
                                    ? "Salvando..."
                                    : "Salvar configuração"
                            }
                        </button>
                    </div>
                </form>

                <div className="space-y-5">
                    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex items-center gap-2">
                            <PlugZap className="h-4 w-4 text-emerald-700" />

                            <h3 className="text-sm font-bold text-slate-900">
                                Teste do provedor
                            </h3>
                        </div>

                        <div className="mt-5 space-y-3">
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-xs text-slate-500">
                                    Resultado
                                </span>

                                <StatusTag
                                    tipo={
                                        testeAprovado
                                            ? "sucesso"
                                            : configuracao.ultimoTesteStatus ===
                                                "REPROVADO"
                                                ? "erro"
                                                : "neutro"
                                    }
                                >
                                    {rotuloTeste(
                                        configuracao.ultimoTesteStatus,
                                    )}
                                </StatusTag>
                            </div>

                            <div className="flex items-center justify-between gap-3 text-xs">
                                <span className="text-slate-500">
                                    Última execução
                                </span>

                                <strong className="text-right text-slate-700">
                                    {formatarDataHora(
                                        configuracao.ultimoTesteEm,
                                    )}
                                </strong>
                            </div>

                            <div className="flex items-center justify-between gap-3 text-xs">
                                <span className="text-slate-500">
                                    Versão
                                </span>

                                <strong className="text-slate-700">
                                    {
                                        configuracao.versao ||
                                        "—"
                                    }
                                </strong>
                            </div>
                        </div>

                        <button
                            type="button"
                            disabled={
                                testando ||
                                formularioAlterado ||
                                !configuracao.credencialConfigurada
                            }
                            onClick={
                                () =>
                                    void testar()
                            }
                            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                        >
                            {
                                testando
                                    ? (
                                        <RefreshCw className="h-4 w-4 animate-spin" />
                                    )
                                    : (
                                        <PlugZap className="h-4 w-4" />
                                    )
                            }

                            {
                                testando
                                    ? "Testando..."
                                    : "Testar conexão SMTP"
                            }
                        </button>

                        <p className="mt-3 text-[11px] leading-5 text-slate-400">
                            O teste valida a conexão SMTP. Nenhuma mensagem é enviada.
                        </p>
                    </article>

                    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4 text-emerald-700" />

                            <h3 className="text-sm font-bold text-slate-900">
                                Modo operacional
                            </h3>
                        </div>

                        <div className="mt-4 space-y-3">
                            {[
                                {
                                    modo:
                                        "PROVEDOR_CLIENTE",

                                    titulo:
                                        "Provedor próprio",

                                    detalhe:
                                        "Usa a configuração SMTP deste tenant.",

                                    permitido:
                                        !formularioAlterado &&
                                        configuracao.credencialConfigurada &&
                                        testeAprovado,
                                },
                                {
                                    modo:
                                        "SAFESCAN_GERENCIADO",

                                    titulo:
                                        "SafeScan gerenciado",

                                    detalhe:
                                        "Usa o provedor institucional quando disponível.",

                                    permitido:
                                        configuracao.safescanGerenciadoDisponivel,
                                },
                                {
                                    modo:
                                        "DESATIVADO",

                                    titulo:
                                        "Desativado",

                                    detalhe:
                                        "Bloqueia o envio operacional automático.",

                                    permitido:
                                        true,
                                },
                            ].filter(
                                (opcao) =>
                                    !ocultarModosAlternativos ||
                                    opcao.modo ===
                                        "PROVEDOR_CLIENTE",
                            ).map(
                                (
                                    opcao,
                                ) => {
                                    const atual =
                                        configuracao.modoEnvio ===
                                        opcao.modo;

                                    const processando =
                                        alterandoModo ===
                                        opcao.modo;

                                    return (
                                        <div
                                            key={opcao.modo}
                                            className={
                                                "rounded-xl border p-3 " +
                                                (
                                                    atual
                                                        ? "border-emerald-200 bg-emerald-50"
                                                        : "border-slate-200 bg-slate-50"
                                                )
                                            }
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <p className="text-xs font-bold text-slate-800">
                                                        {opcao.titulo}
                                                    </p>

                                                    <p className="mt-1 text-[11px] leading-5 text-slate-500">
                                                        {opcao.detalhe}
                                                    </p>
                                                </div>

                                                {
                                                    atual
                                                        ? (
                                                            <StatusTag tipo="sucesso">
                                                                Atual
                                                            </StatusTag>
                                                        )
                                                        : null
                                                }
                                            </div>

                                            <button
                                                type="button"
                                                disabled={
                                                    atual ||
                                                    !opcao.permitido ||
                                                    Boolean(
                                                        alterandoModo,
                                                    )
                                                }
                                                onClick={
                                                    () =>
                                                        void definirModo(
                                                            opcao.modo,
                                                        )
                                                }
                                                className="mt-3 inline-flex w-full items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-600 transition hover:border-emerald-200 hover:text-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                                            >
                                                {
                                                    processando
                                                        ? "Alterando..."
                                                        : atual
                                                            ? "Modo atual"
                                                            : "Ativar este modo"
                                                }
                                            </button>
                                        </div>
                                    );
                                },
                            )}
                        </div>
                    </article>
                </div>
            </div>
        </section>
    );
}