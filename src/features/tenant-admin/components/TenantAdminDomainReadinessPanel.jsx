import {
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import {
    AlertTriangle,
    BadgeCheck,
    CheckCircle2,
    ExternalLink,
    Globe2,
    LoaderCircle,
    RefreshCw,
    ShieldCheck,
    Wifi,
    X,
    XCircle,
} from "lucide-react";

import {
    supabase,
} from "../../../lib/supabaseClient.js";

import {
    testarProntidaoDominioTenantService,
} from "../services/tenantAdminDomainReadinessService.js";

import {
    ativarTenantOrquestradoService,
    definirLiberacaoAtivacaoTenantService,
    diagnosticarAtivacaoTenantService,
    obterLiberacaoAtivacaoTenantService,
} from "../services/tenantAdminActivationService.js";

const MOTOR_DIAGNOSTICO_PUBLICADO =
    true;

const ATIVACAO_REAL_HABILITADA =
    false;

function texto(
    valor
) {
    return String(
        valor ?? ""
    ).trim();
}

function ehAdminAtivo(
    usuario
) {
    const papel =
        texto(
            usuario?.papel
        ).toLowerCase();

    const status =
        texto(
            usuario?.membership_status
        ).toLowerCase();

    return (
        (
            papel ===
                "administrador" ||
            papel ===
                "admin"
        ) &&
        status ===
            "ativo"
    );
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

function CheckItem({
    ok,
    titulo,
    detalhe,
}) {
    return (
        <div
            className={
                ok
                    ? "flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5"
                    : "flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3.5"
            }
        >
            {ok ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            ) : (
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            )}

            <div>
                <p
                    className={
                        ok
                            ? "text-xs font-bold text-emerald-900"
                            : "text-xs font-bold text-amber-900"
                    }
                >
                    {titulo}
                </p>

                <p
                    className={
                        ok
                            ? "mt-1 text-[11px] leading-5 text-emerald-700"
                            : "mt-1 text-[11px] leading-5 text-amber-700"
                    }
                >
                    {detalhe}
                </p>
            </div>
        </div>
    );
}

function ActivationStep({
    ok,
    titulo,
    detalhe,
}) {
    return (
        <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3.5">
            <div
                className={
                    ok
                        ? "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"
                        : "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400"
                }
            >
                {ok ? (
                    <CheckCircle2 className="h-4 w-4" />
                ) : (
                    <span className="h-2 w-2 rounded-full bg-current" />
                )}
            </div>

            <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800">
                    {titulo}
                </p>

                <p className="mt-1 text-[11px] leading-5 text-slate-500">
                    {detalhe}
                </p>
            </div>
        </div>
    );
}

export function TenantAdminDomainReadinessPanel({
    tenant,
    empresas,
    usuarios,
}) {
    const [
        testando,
        setTestando,
    ] =
        useState(false);

    const [
        resultado,
        setResultado,
    ] =
        useState(null);

    const [
        erro,
        setErro,
    ] =
        useState("");

    const [
        diagnosticandoServidor,
        setDiagnosticandoServidor,
    ] =
        useState(false);

    const [
        diagnosticoServidor,
        setDiagnosticoServidor,
    ] =
        useState(null);

    const [
        erroServidor,
        setErroServidor,
    ] =
        useState("");

    const [
        ativando,
        setAtivando,
    ] =
        useState(false);

    const [
        resultadoAtivacao,
        setResultadoAtivacao,
    ] =
        useState(null);

    const [
        liberacaoPiloto,
        setLiberacaoPiloto,
    ] =
        useState(null);

    const [
        carregandoLiberacaoPiloto,
        setCarregandoLiberacaoPiloto,
    ] =
        useState(false);

    const [
        alterandoLiberacaoPiloto,
        setAlterandoLiberacaoPiloto,
    ] =
        useState(false);

    const [
        erroLiberacaoPiloto,
        setErroLiberacaoPiloto,
    ] =
        useState("");

    const [
        confirmandoAtivacao,
        setConfirmandoAtivacao,
    ] =
        useState(false);

    const controllerRef =
        useRef(null);

    useEffect(
        () => {
            return () => {
                controllerRef.current?.abort();
            };
        },
        []
    );

    const hostname =
        texto(
            tenant?.dominio_principal
        );

    const slug =
        texto(
            tenant?.tenant_slug
        );

    const tenantId =
        texto(
            tenant?.tenant_id
        );


    useEffect(
        () => {
            let ativo =
                true;

            async function carregarLiberacaoPiloto() {
                if (!tenantId) {
                    setLiberacaoPiloto(
                        null
                    );

                    setErroLiberacaoPiloto(
                        ""
                    );

                    return;
                }

                setCarregandoLiberacaoPiloto(
                    true
                );

                setErroLiberacaoPiloto(
                    ""
                );

                try {
                    const resposta =
                        await obterLiberacaoAtivacaoTenantService({
                            supabase,
                            tenantId,
                        });

                    if (ativo) {
                        setLiberacaoPiloto(
                            resposta
                        );
                    }
                }
                catch (error) {
                    if (ativo) {
                        setErroLiberacaoPiloto(
                            error?.message ||
                            "Não foi possível consultar a liberação piloto."
                        );
                    }
                }
                finally {
                    if (ativo) {
                        setCarregandoLiberacaoPiloto(
                            false
                        );
                    }
                }
            }

            void carregarLiberacaoPiloto();

            return () => {
                ativo =
                    false;
            };
        },
        [
            tenantId,
        ]
    );

    const tenantStatus =
        texto(
            tenant?.tenant_status
        ).toLowerCase();

    const dominioStatus =
        texto(
            tenant?.dominio_status
        ).toLowerCase();

    const possuiEmpresa =
        Array.isArray(
            empresas
        ) &&
        empresas.length >
            0;

    const possuiAdminAtivo =
        Array.isArray(
            usuarios
        ) &&
        usuarios.some(
            ehAdminAtivo
        );

    const possuiBranding =
        tenant?.possui_branding ===
        true;

    const possuiDominio =
        Boolean(
            hostname
        );

    const dominioVerificado =
        tenant?.dominio_verificado ===
        true;

    const tenantAtivo =
        tenantStatus ===
            "ativo" ||
        resultadoAtivacao?.ativado ===
            true;

    const checklist =
        useMemo(
            () => [
                {
                    ok:
                        possuiEmpresa,

                    titulo:
                        "Empresa operacional",

                    detalhe:
                        possuiEmpresa
                            ? `${empresas.length} empresa(s) vinculada(s).`
                            : "O tenant precisa possuir ao menos uma empresa.",
                },

                {
                    ok:
                        possuiAdminAtivo,

                    titulo:
                        "Responsável administrativo",

                    detalhe:
                        possuiAdminAtivo
                            ? "Existe membership administrativa ativa."
                            : "Nenhum administrador ativo foi localizado.",
                },

                {
                    ok:
                        possuiBranding,

                    titulo:
                        "Identidade visual",

                    detalhe:
                        possuiBranding
                            ? "Branding do tenant localizado."
                            : "Branding do tenant está pendente.",
                },

                {
                    ok:
                        possuiDominio,

                    titulo:
                        "Domínio principal",

                    detalhe:
                        possuiDominio
                            ? hostname
                            : "Domínio principal ainda não configurado.",
                },

                {
                    ok:
                        dominioVerificado ||
                        resultadoAtivacao?.ativado ===
                            true,

                    titulo:
                        "Verificação registrada",

                    detalhe:
                        dominioVerificado
                            ? `Verificado em ${formatarData(
                                tenant?.dominio_verificado_em
                            )}.`
                            : resultadoAtivacao?.ativado
                                ? "Verificação registrada durante a ativação."
                                : "A verificação ainda não foi registrada no SafeScan.",
                },
            ],
            [
                possuiEmpresa,
                empresas,
                possuiAdminAtivo,
                possuiBranding,
                possuiDominio,
                hostname,
                dominioVerificado,
                tenant?.dominio_verificado_em,
                resultadoAtivacao,
            ]
        );

    const requisitosInternosOk =
        possuiEmpresa &&
        possuiAdminAtivo &&
        possuiBranding &&
        possuiDominio;

    const dnsOk =
        diagnosticoServidor?.dns?.ok ===
            true ||
        resultado?.dns?.ok ===
            true;

    const httpsOk =
        diagnosticoServidor?.https?.ok ===
            true ||
        resultado?.https?.ok ===
            true;

    const assinaturaSafeScanOk =
        diagnosticoServidor
            ?.https
            ?.assinaturaSafeScan ===
        true;

    const passosAtivacao =
        [
            {
                titulo:
                    "Empresa",

                detalhe:
                    "Empresa operacional vinculada ao tenant.",

                ok:
                    possuiEmpresa,
            },

            {
                titulo:
                    "Responsável",

                detalhe:
                    "Administrador ativo disponível.",

                ok:
                    possuiAdminAtivo,
            },

            {
                titulo:
                    "Identidade visual",

                detalhe:
                    "Branding do cliente configurado.",

                ok:
                    possuiBranding,
            },

            {
                titulo:
                    "Domínio",

                detalhe:
                    hostname ||
                    "Hostname ainda não definido.",

                ok:
                    possuiDominio,
            },

            {
                titulo:
                    "DNS público",

                detalhe:
                    dnsOk
                        ? "Domínio resolvendo publicamente."
                        : "Aguardando validação DNS.",

                ok:
                    dnsOk,
            },

            {
                titulo:
                    "HTTPS",

                detalhe:
                    httpsOk
                        ? "Conexão HTTPS disponível."
                        : "Aguardando validação HTTPS.",

                ok:
                    httpsOk,
            },

            {
                titulo:
                    "Assinatura SafeScan",

                detalhe:
                    assinaturaSafeScanOk
                        ? "O endereço respondeu com a assinatura SafeScan."
                        : "Será confirmada pelo motor server-side.",

                ok:
                    assinaturaSafeScanOk,
            },

            {
                titulo:
                    "Cliente ativo",

                detalhe:
                    tenantAtivo
                        ? "Tenant liberado para operação."
                        : "Ativação ainda não concluída.",

                ok:
                    tenantAtivo,
            },
        ];

    const passosConcluidos =
        passosAtivacao.filter(
            (passo) =>
                passo.ok
        ).length;

    const progresso =
        Math.round(
            (
                passosConcluidos /
                passosAtivacao.length
            ) *
            100
        );

    const prontoServidor =
        diagnosticoServidor
            ?.prontoParaAtivar ===
        true;

    const liberacaoPilotoAtiva =
        liberacaoPiloto?.habilitada ===
            true ||
        diagnosticoServidor
            ?.liberacaoPilotoAtiva ===
            true;

    const ativacaoPermitidaServidor =
        diagnosticoServidor
            ?.ativacaoPermitida ===
        true;

    const podeAtivar =
        MOTOR_DIAGNOSTICO_PUBLICADO &&
        prontoServidor &&
        ativacaoPermitidaServidor &&
        !tenantAtivo &&
        !ativando;

    async function testarDominio() {
        if (
            !hostname ||
            !slug ||
            testando
        ) {
            return;
        }

        controllerRef.current?.abort();

        const controller =
            new AbortController();

        controllerRef.current =
            controller;

        setTestando(
            true
        );

        setErro("");

        setResultado(
            null
        );

        try {
            const resposta =
                await testarProntidaoDominioTenantService({
                    hostname,
                    slug,
                    signal:
                        controller.signal,
                });

            setResultado(
                resposta
            );
        }
        catch (error) {
            if (
                error?.name ===
                "AbortError"
            ) {
                return;
            }

            setErro(
                error?.message ||
                "Não foi possível concluir a pré-checagem do domínio."
            );
        }
        finally {
            if (
                controllerRef.current ===
                controller
            ) {
                controllerRef.current =
                    null;

                setTestando(
                    false
                );
            }
        }
    }

    async function diagnosticarServidor() {
        if (
            !MOTOR_DIAGNOSTICO_PUBLICADO ||
            !tenantId ||
            diagnosticandoServidor ||
            ativando
        ) {
            return;
        }

        setDiagnosticandoServidor(
            true
        );

        setErroServidor(
            ""
        );

        setDiagnosticoServidor(
            null
        );

        try {
            const resposta =
                await diagnosticarAtivacaoTenantService({
                    supabase,
                    tenantId,
                });

            setDiagnosticoServidor(
                resposta
            );
        }
        catch (error) {
            setErroServidor(
                error?.message ||
                "Não foi possível executar o diagnóstico server-side."
            );
        }
        finally {
            setDiagnosticandoServidor(
                false
            );
        }
    }

    async function alternarLiberacaoPiloto() {
        if (
            !tenantId ||
            alterandoLiberacaoPiloto
        ) {
            return;
        }

        const proximoEstado =
            !liberacaoPilotoAtiva;

        setAlterandoLiberacaoPiloto(
            true
        );

        setErroLiberacaoPiloto(
            ""
        );

        try {
            const resposta =
                await definirLiberacaoAtivacaoTenantService({
                    supabase,
                    tenantId,
                    habilitada:
                        proximoEstado,
                });

            setLiberacaoPiloto(
                resposta
            );

            const diagnostico =
                await diagnosticarAtivacaoTenantService({
                    supabase,
                    tenantId,
                });

            setDiagnosticoServidor(
                diagnostico
            );
        }
        catch (error) {
            setErroLiberacaoPiloto(
                error?.message ||
                "Não foi possível alterar a liberação piloto."
            );
        }
        finally {
            setAlterandoLiberacaoPiloto(
                false
            );
        }
    }

    function abrirConfirmacaoAtivacao() {
        if (!podeAtivar) {
            return;
        }

        setConfirmandoAtivacao(
            true
        );
    }

    async function confirmarAtivacao() {
        if (
            !podeAtivar ||
            ativando
        ) {
            return;
        }

        setConfirmandoAtivacao(
            false
        );

        setAtivando(
            true
        );

        setErroServidor(
            ""
        );

        try {
            const resposta =
                await ativarTenantOrquestradoService({
                    supabase,
                    tenantId,
                });

            setResultadoAtivacao(
                resposta
            );

            if (
                resposta?.ativado ===
                true
            ) {
                setDiagnosticoServidor(
                    (
                        anterior
                    ) => ({
                        ...(
                            anterior ||
                            {}
                        ),

                        prontoParaAtivar:
                            true,

                        bloqueado:
                            false,
                    })
                );
            }
        }
        catch (error) {
            setErroServidor(
                error?.message ||
                "Não foi possível concluir a ativação do cliente."
            );
        }
        finally {
            setAtivando(
                false
            );
        }
    }

    function abrirDominio() {
        if (!hostname) {
            return;
        }

        globalThis.open(
            `https://${hostname}/`,
            "_blank",
            "noopener,noreferrer"
        );
    }

    return (
        <section className="mt-5 space-y-5">
            <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <Globe2 className="h-5 w-5 text-emerald-700" />

                            <h2 className="text-base font-bold text-slate-900">
                                Domínio e ativação
                            </h2>
                        </div>

                        <p className="mt-1 text-xs leading-5 text-slate-500">
                            O SafeScan confere a infraestrutura antes de liberar
                            o ambiente do cliente.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <span
                            className={
                                tenantAtivo
                                    ? "rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-emerald-700"
                                    : "rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-amber-700"
                            }
                        >
                            {tenantAtivo
                                ? "Cliente ativo"
                                : "Cliente em rascunho"}
                        </span>

                        <span
                            className={
                                dominioVerificado ||
                                tenantAtivo
                                    ? "rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-emerald-700"
                                    : "rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-600"
                            }
                        >
                            {dominioVerificado ||
                            tenantAtivo
                                ? "Domínio verificado"
                                : "Domínio não verificado"}
                        </span>
                    </div>
                </div>

                <div className="grid gap-5 p-5 xl:grid-cols-[1.1fr_0.9fr]">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">
                            Endereço principal
                        </p>

                        <p className="mt-2 break-all font-mono text-base font-bold text-slate-900">
                            {hostname || "Não configurado"}
                        </p>

                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
                                    Status no SafeScan
                                </p>

                                <p className="mt-1 text-sm font-bold text-slate-800">
                                    {tenantAtivo
                                        ? "ativo"
                                        : dominioStatus ||
                                            "não informado"}
                                </p>
                            </div>

                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
                                    Verificado em
                                </p>

                                <p className="mt-1 text-sm font-bold text-slate-800">
                                    {formatarData(
                                        tenant?.dominio_verificado_em
                                    )}
                                </p>
                            </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={
                                    testarDominio
                                }
                                disabled={
                                    testando ||
                                    !hostname
                                }
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-xs font-bold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-300"
                            >
                                {testando ? (
                                    <LoaderCircle className="h-4 w-4 animate-spin" />
                                ) : (
                                    <RefreshCw className="h-4 w-4" />
                                )}

                                {testando
                                    ? "Testando domínio..."
                                    : "Testar DNS e HTTPS"}
                            </button>

                            <button
                                type="button"
                                onClick={
                                    abrirDominio
                                }
                                disabled={
                                    !hostname
                                }
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <ExternalLink className="h-4 w-4" />
                                Abrir domínio
                            </button>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4 text-emerald-700" />

                            <p className="text-xs font-bold text-slate-900">
                                Situação de pré-ativação
                            </p>
                        </div>

                        <div className="mt-4 space-y-2">
                            <div className="flex items-center justify-between gap-4">
                                <span className="text-xs text-slate-500">
                                    Pré-requisitos internos
                                </span>

                                <strong
                                    className={
                                        requisitosInternosOk
                                            ? "text-xs text-emerald-700"
                                            : "text-xs text-amber-700"
                                    }
                                >
                                    {requisitosInternosOk
                                        ? "OK"
                                        : "Pendente"}
                                </strong>
                            </div>

                            <div className="flex items-center justify-between gap-4">
                                <span className="text-xs text-slate-500">
                                    Motor server-side
                                </span>

                                <strong
                                    className={
                                        MOTOR_DIAGNOSTICO_PUBLICADO
                                            ? "text-xs text-emerald-700"
                                            : "text-xs text-amber-700"
                                    }
                                >
                                    {MOTOR_DIAGNOSTICO_PUBLICADO
                                        ? "Publicado"
                                        : "Aguardando publicação"}
                                </strong>
                            </div>

                            <div className="flex items-center justify-between gap-4">
                                <span className="text-xs text-slate-500">
                                    DNS / HTTPS
                                </span>

                                <strong
                                    className={
                                        dnsOk &&
                                        httpsOk
                                            ? "text-xs text-emerald-700"
                                            : "text-xs text-amber-700"
                                    }
                                >
                                    {dnsOk &&
                                    httpsOk
                                        ? "OK"
                                        : "Pendente"}
                                </strong>
                            </div>

                            <div className="flex items-center justify-between gap-4 border-t border-slate-200 pt-3">
                                <span className="text-xs font-bold text-slate-700">
                                    Pronto para ativar
                                </span>

                                <strong
                                    className={
                                        podeAtivar ||
                                        tenantAtivo
                                            ? "text-xs text-emerald-700"
                                            : "text-xs text-amber-700"
                                    }
                                >
                                    {tenantAtivo
                                        ? "ATIVO"
                                        : podeAtivar
                                            ? "SIM"
                                            : "NÃO"}
                                </strong>
                            </div>
                        </div>
                    </div>
                </div>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2">
                    <BadgeCheck className="h-5 w-5 text-emerald-700" />

                    <h3 className="text-sm font-bold text-slate-900">
                        Checklist real de ativação
                    </h3>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {checklist.map(
                        (item) => (
                            <CheckItem
                                key={
                                    item.titulo
                                }
                                {...item}
                            />
                        )
                    )}
                </div>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <Wifi className="h-5 w-5 text-emerald-700" />

                            <h3 className="text-sm font-bold text-slate-900">
                                Pré-checagem externa
                            </h3>
                        </div>

                        <p className="mt-1 text-xs leading-5 text-slate-500">
                            Consulta DNS público e testa a resposta HTTPS sem
                            alterar o cadastro do cliente.
                        </p>
                    </div>

                    {resultado ? (
                        <span
                            className={
                                resultado.prontoParaRevisaoManual
                                    ? "rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-emerald-700"
                                    : "rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-amber-700"
                            }
                        >
                            {resultado.prontoParaRevisaoManual
                                ? "Pré-checagem OK"
                                : "Ainda não pronto"}
                        </span>
                    ) : null}
                </div>

                {erro ? (
                    <div className="mt-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
                        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />

                        <p className="text-xs leading-5 text-red-700">
                            {erro}
                        </p>
                    </div>
                ) : null}

                {resultado ? (
                    <div className="mt-4 space-y-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div
                                className={
                                    resultado.dns.ok
                                        ? "rounded-xl border border-emerald-200 bg-emerald-50 p-4"
                                        : "rounded-xl border border-amber-200 bg-amber-50 p-4"
                                }
                            >
                                <div className="flex items-center gap-2">
                                    {resultado.dns.ok ? (
                                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                    ) : (
                                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                                    )}

                                    <p className="text-xs font-bold text-slate-900">
                                        DNS
                                    </p>
                                </div>

                                <p className="mt-2 text-xs text-slate-600">
                                    {resultado.dns.ok
                                        ? "O domínio possui resposta compatível."
                                        : "O domínio ainda não está resolvendo para a infraestrutura esperada."}
                                </p>
                            </div>

                            <div
                                className={
                                    resultado.https.ok
                                        ? "rounded-xl border border-emerald-200 bg-emerald-50 p-4"
                                        : "rounded-xl border border-amber-200 bg-amber-50 p-4"
                                }
                            >
                                <div className="flex items-center gap-2">
                                    {resultado.https.ok ? (
                                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                    ) : (
                                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                                    )}

                                    <p className="text-xs font-bold text-slate-900">
                                        HTTPS
                                    </p>
                                </div>

                                <p className="mt-2 text-xs text-slate-600">
                                    {resultado.https.ok
                                        ? "O endereço respondeu pela rede HTTPS."
                                        : resultado.https.erro}
                                </p>
                            </div>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
                                Respostas DNS encontradas
                            </p>

                            <div className="mt-2 space-y-1 font-mono text-[11px] text-slate-600">
                                <p>
                                    CNAME:{" "}
                                    {resultado.dns.cnameTargets.length
                                        ? resultado.dns.cnameTargets.join(", ")
                                        : "nenhum"}
                                </p>

                                <p>
                                    A:{" "}
                                    {resultado.dns.ipv4Targets.length
                                        ? resultado.dns.ipv4Targets.join(", ")
                                        : "nenhum"}
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="mt-4 flex min-h-[110px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50">
                        <div className="text-center">
                            <Wifi className="mx-auto h-6 w-6 text-slate-300" />

                            <p className="mt-2 text-xs text-slate-400">
                                Execute a pré-checagem para consultar o estado
                                público do domínio.
                            </p>
                        </div>
                    </div>
                )}
            </article>

            <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="bg-gradient-to-r from-[#071d15] via-[#083223] to-[#075c3c] px-5 py-5 text-white">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="h-5 w-5 text-emerald-300" />

                                <h3 className="text-base font-bold">
                                    Ativação automática do cliente
                                </h3>
                            </div>

                            <p className="mt-1 max-w-2xl text-xs leading-5 text-emerald-50/75">
                                Quando o motor estiver publicado, esta operação
                                fará diagnóstico, validação e ativação sem sair
                                do Painel Mestre.
                            </p>
                        </div>

                        <span
                            className={
                                MOTOR_DIAGNOSTICO_PUBLICADO
                                    ? "w-fit rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-emerald-100"
                                    : "w-fit rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-amber-100"
                            }
                        >
                            {MOTOR_DIAGNOSTICO_PUBLICADO
                                ? "Motor disponível"
                                : "Publicação pendente"}
                        </span>
                    </div>
                </div>

                <div className="p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">
                                Progresso de ativação
                            </p>

                            <p className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
                                {progresso}%
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                                {passosConcluidos} de {passosAtivacao.length} verificações concluídas.
                            </p>
                        </div>

                        <div className="w-full max-w-sm">
                            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                                <div
                                    className="h-full rounded-full bg-emerald-600 transition-all duration-500"
                                    style={
                                        {
                                            width:
                                                `${progresso}%`,
                                        }
                                    }
                                />
                            </div>
                        </div>
                    </div>

                    <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        {passosAtivacao.map(
                            (passo) => (
                                <ActivationStep
                                    key={
                                        passo.titulo
                                    }
                                    {...passo}
                                />
                            )
                        )}
                    </div>

                    <div
                        className={
                            liberacaoPilotoAtiva
                                ? "mt-5 flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                                : "mt-5 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                        }
                    >
                        <div>
                            <p
                                className={
                                    liberacaoPilotoAtiva
                                        ? "text-xs font-bold uppercase tracking-[0.08em] text-emerald-800"
                                        : "text-xs font-bold uppercase tracking-[0.08em] text-amber-800"
                                }
                            >
                                Liberação piloto por tenant
                            </p>

                            <p
                                className={
                                    liberacaoPilotoAtiva
                                        ? "mt-1 text-xs leading-5 text-emerald-700"
                                        : "mt-1 text-xs leading-5 text-amber-700"
                                }
                            >
                                {carregandoLiberacaoPiloto
                                    ? "Consultando gate individual..."
                                    : liberacaoPilotoAtiva
                                        ? "Este tenant está autorizado individualmente para a ativação piloto."
                                        : "Este tenant ainda não possui autorização individual para ativação."}
                            </p>

                            <p className="mt-1 text-[11px] leading-5 text-slate-500">
                                A proteção global continua desabilitada. Esta autorização vale somente para o tenant selecionado e pode ser revogada.
                            </p>

                            {erroLiberacaoPiloto ? (
                                <p className="mt-2 text-[11px] font-semibold text-red-700">
                                    {erroLiberacaoPiloto}
                                </p>
                            ) : null}
                        </div>

                        <button
                            type="button"
                            disabled={
                                !tenantId ||
                                carregandoLiberacaoPiloto ||
                                alterandoLiberacaoPiloto
                            }
                            onClick={
                                alternarLiberacaoPiloto
                            }
                            className={
                                liberacaoPilotoAtiva
                                    ? "inline-flex h-10 shrink-0 items-center justify-center rounded-xl border border-red-200 bg-white px-4 text-xs font-bold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                                    : "inline-flex h-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 px-4 text-xs font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                            }
                        >
                            {alterandoLiberacaoPiloto
                                ? "Salvando..."
                                : liberacaoPilotoAtiva
                                    ? "Revogar liberação"
                                    : "Liberar tenant piloto"}
                        </button>
                    </div>

                    {erroServidor ? (
                        <div className="mt-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
                            <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />

                            <p className="text-xs leading-5 text-red-700">
                                {erroServidor}
                            </p>
                        </div>
                    ) : null}

                    {diagnosticoServidor ? (
                        <div
                            className={
                                diagnosticoServidor.prontoParaAtivar
                                    ? "mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4"
                                    : "mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4"
                            }
                        >
                            <p
                                className={
                                    diagnosticoServidor.prontoParaAtivar
                                        ? "text-sm font-bold text-emerald-900"
                                        : "text-sm font-bold text-amber-900"
                                }
                            >
                                {diagnosticoServidor.prontoParaAtivar
                                    ? "Todas as verificações passaram"
                                    : "Ativação ainda bloqueada"}
                            </p>

                            <p
                                className={
                                    diagnosticoServidor.prontoParaAtivar
                                        ? "mt-1 text-xs leading-5 text-emerald-700"
                                        : "mt-1 text-xs leading-5 text-amber-700"
                                }
                            >
                                {diagnosticoServidor.mensagem ||
                                    (
                                        diagnosticoServidor.prontoParaAtivar
                                            ? "O cliente está pronto para a confirmação final."
                                            : "O SafeScan encontrou uma pendência que precisa ser resolvida antes da ativação."
                                    )}
                            </p>
                        </div>
                    ) : null}

                    {resultadoAtivacao?.ativado ? (
                        <div className="mt-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />

                            <div>
                                <p className="text-sm font-bold text-emerald-900">
                                    Cliente ativado com sucesso
                                </p>

                                <p className="mt-1 text-xs leading-5 text-emerald-700">
                                    O domínio foi validado e o tenant foi liberado
                                    para operação pelo fluxo automático SafeScan.
                                </p>
                            </div>
                        </div>
                    ) : null}

                    <div className="mt-5 flex flex-col gap-3 border-t border-slate-200 pt-5 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <p className="text-xs font-bold text-slate-800">
                                Operação de um clique
                            </p>

                            <p className="mt-1 text-[11px] leading-5 text-slate-500">
                                {MOTOR_DIAGNOSTICO_PUBLICADO
                                    ? (
                                        ATIVACAO_REAL_HABILITADA
                                            ? "Execute o diagnóstico server-side. A ativação somente será liberada quando todos os gates estiverem GREEN."
                                            : "O diagnóstico server-side está disponível. A ativação real continua bloqueada por segurança."
                                    )
                                    : "O motor já está preparado localmente. Diagnóstico e ativação permanecem bloqueados até a publicação autorizada."}
                            </p>
                        </div>

                        <div className="flex flex-col gap-2 sm:flex-row">
                            <button
                                type="button"
                                disabled={
                                    !MOTOR_DIAGNOSTICO_PUBLICADO ||
                                    diagnosticandoServidor ||
                                    ativando ||
                                    tenantAtivo
                                }
                                onClick={
                                    diagnosticarServidor
                                }
                                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-xs font-bold text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                            >
                                {diagnosticandoServidor ? (
                                    <LoaderCircle className="h-4 w-4 animate-spin" />
                                ) : (
                                    <RefreshCw className="h-4 w-4" />
                                )}

                                {diagnosticandoServidor
                                    ? "Executando diagnóstico..."
                                    : "Diagnóstico automático"}
                            </button>

                            <button
                                type="button"
                                disabled={
                                    !podeAtivar
                                }
                                onClick={
                                    abrirConfirmacaoAtivacao
                                }
                                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none"
                            >
                                {ativando ? (
                                    <LoaderCircle className="h-4 w-4 animate-spin" />
                                ) : (
                                    <ShieldCheck className="h-4 w-4" />
                                )}

                                {tenantAtivo
                                    ? "Cliente ativo"
                                    : ativando
                                        ? "Ativando cliente..."
                                        : "Ativar cliente"}
                            </button>
                        </div>
                    </div>
                </div>
            </article>

            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                <div className="flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />

                    <div>
                        <p className="text-sm font-bold text-blue-900">
                            Operação centralizada no SafeScan
                        </p>

                        <p className="mt-1 text-xs leading-5 text-blue-700">
                            O fluxo final será executado por este painel. A
                            infraestrutura externa ficará transparente para o
                            administrador durante a ativação normal de clientes.
                        </p>
                    </div>
                </div>
            </div>

            {confirmandoAtivacao ? (
                <div
                    role="dialog"
                    aria-modal="true"
                    className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-[3px]"
                >
                    <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-white/10 bg-white shadow-[0_35px_100px_rgba(2,6,23,0.42)]">
                        <div className="bg-gradient-to-r from-[#071d15] via-[#083223] to-[#075c3c] px-6 py-5 text-white">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-200">
                                        Confirmação final
                                    </p>

                                    <h3 className="mt-2 text-xl font-bold">
                                        Ativar este cliente?
                                    </h3>

                                    <p className="mt-2 text-xs leading-5 text-emerald-50/75">
                                        O SafeScan registrará a verificação do
                                        domínio e alterará o tenant para ativo.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={
                                        () =>
                                            setConfirmandoAtivacao(
                                                false
                                            )
                                    }
                                    disabled={
                                        ativando
                                    }
                                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 transition hover:bg-white/20"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        <div className="p-6">
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                <p className="text-xs font-bold text-slate-900">
                                    {tenant?.tenant_nome || "Cliente"}
                                </p>

                                <p className="mt-1 break-all font-mono text-xs text-slate-500">
                                    {hostname}
                                </p>
                            </div>

                            <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />

                                <p className="text-xs leading-5 text-amber-800">
                                    Esta ação é real. Ela somente será disponibilizada
                                    quando o diagnóstico server-side confirmar todos
                                    os requisitos.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={
                                    () =>
                                        setConfirmandoAtivacao(
                                            false
                                        )
                                }
                                disabled={
                                    ativando
                                }
                                className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-xs font-bold text-slate-700"
                            >
                                Voltar
                            </button>

                            <button
                                type="button"
                                onClick={
                                    confirmarAtivacao
                                }
                                disabled={
                                    ativando
                                }
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                            >
                                <ShieldCheck className="h-4 w-4" />
                                Confirmar ativação
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </section>
    );
}