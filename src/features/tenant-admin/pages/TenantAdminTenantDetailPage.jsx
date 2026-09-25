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
    enviarPrimeiroAcessoClienteService,
    listarPrimeiroAcessoTenantService,
} from "../services/tenantAdminFirstAccessService.js";

import {
    TenantAdminModulesPanel,
} from "../components/TenantAdminModulesPanel.jsx";

import {
    TenantAdminCompaniesPanel,
} from "../components/TenantAdminCompaniesPanel.jsx";

import {
    TenantAdminUserScopeModal,
} from "../components/TenantAdminUserScopeModal.jsx";

import {
    TenantAdminDomainReadinessPanel,
} from "../components/TenantAdminDomainReadinessPanel.jsx";

import {
    TenantAdminHero,
} from "../components/TenantAdminHero.jsx";

import {
    TenantAdminClientDataModal,
} from "../components/TenantAdminClientDataModal.jsx";

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

function mapearPrimeiroAcessoPorUsuario(
    valor
) {
    if (
        valor &&
        typeof valor ===
            "object" &&
        !Array.isArray(
            valor
        )
    ) {
        return valor;
    }

    return (
        Array.isArray(
            valor
        )
            ? valor
            : []
    ).reduce(
        (
            acumulador,
            linha
        ) => {
            const userId =
                String(
                    linha?.user_id ||
                    linha?.userId ||
                    ""
                ).trim();

            if (!userId) {
                return acumulador;
            }

            acumulador[userId] =
                {
                    status:
                        String(
                            linha?.status ||
                            "nao_enviado"
                        )
                            .trim()
                            .toLowerCase(),

                    envioTentativas:
                        Number(
                            linha?.envio_tentativas ??
                            linha?.envioTentativas ??
                            0
                        ),

                    ultimoEnvioEm:
                        linha?.ultimo_envio_em ??
                        linha?.ultimoEnvioEm ??
                        null,

                    concluidoEm:
                        linha?.concluido_em ??
                        linha?.concluidoEm ??
                        null,

                    ultimoErroCodigo:
                        String(
                            linha?.ultimo_erro_codigo ??
                            linha?.ultimoErroCodigo ??
                            ""
                        ).trim(),
                };

            return acumulador;
        },
        {}
    );
}
function configuracaoPrimeiroAcesso(
    estado,
    disponivel
) {
    if (!disponivel) {
        return {
            titulo:
                "Publicação pendente",

            classe:
                "border-slate-200 bg-slate-50 text-slate-600",

            detalhe:
                "Aguardando publicação do serviço.",
        };
    }

    const status =
        String(
            estado?.status ||
            "nao_enviado"
        )
            .trim()
            .toLowerCase();

    if (
        status ===
        "concluido"
    ) {
        return {
            titulo:
                "Primeiro acesso concluído",

            classe:
                "border-emerald-200 bg-emerald-50 text-emerald-700",

            detalhe:
                estado?.concluidoEm
                    ? `Concluído em ${formatarData(
                        estado.concluidoEm
                    )}`
                    : "Acesso configurado pelo cliente.",
        };
    }

    if (
        status ===
        "enviado"
    ) {
        return {
            titulo:
                "E-mail enviado",

            classe:
                "border-blue-200 bg-blue-50 text-blue-700",

            detalhe:
                estado?.ultimoEnvioEm
                    ? `Último envio ${formatarData(
                        estado.ultimoEnvioEm
                    )}`
                    : "Convite enviado.",
        };
    }

    if (
        status ===
        "falha"
    ) {
        return {
            titulo:
                "Falha no envio",

            classe:
                "border-red-200 bg-red-50 text-red-700",

            detalhe:
                "O convite pode ser reenviado.",
        };
    }

    return {
        titulo:
            "Convite pendente",

        classe:
            "border-amber-200 bg-amber-50 text-amber-700",

        detalhe:
            "Primeiro acesso ainda não enviado.",
    };
}

function PrimeiroAcessoTenantCell({
    usuario,
    estado,
    disponivel,
}) {
    const administradorAtivo =
        ehAdministrador(
            usuario?.papel
        ) &&
        String(
            usuario?.membership_status ||
            ""
        )
            .trim()
            .toLowerCase() ===
        "ativo";

    if (!administradorAtivo) {
        return (
            <div className="space-y-2">
                <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-500">
                    Não aplicável
                </span>

                <p className="text-[11px] leading-5 text-slate-400">
                    Primeiro acesso não se aplica a este usuário.
                </p>
            </div>
        );
    }

    const visual =
        configuracaoPrimeiroAcesso(
            estado,
            disponivel
        );

    return (
        <div className="space-y-2">
            <span
                className={
                    "inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold " +
                    visual.classe
                }
            >
                {visual.titulo}
            </span>

            <p className="text-[11px] leading-5 text-slate-500">
                {visual.detalhe}
            </p>
        </div>
    );
}
function PrimeiroAcessoTenantAction({
    usuario,
    estado,
    disponivel,
    enviando,
    onEnviar,
}) {
    const administradorAtivo =
        ehAdministrador(
            usuario?.papel
        ) &&
        String(
            usuario?.membership_status ||
            ""
        )
            .trim()
            .toLowerCase() ===
        "ativo";

    if (!administradorAtivo) {
        return null;
    }

    const status =
        String(
            estado?.status ||
            "nao_enviado"
        )
            .trim()
            .toLowerCase();

    if (
        status ===
        "concluido"
    ) {
        return null;
    }

    const reenviar =
        status ===
        "enviado" ||
        status ===
        "falha" ||
        Number(
            estado?.envioTentativas ||
            0
        ) > 0;

    return (
        <button
            type="button"
            disabled={
                !disponivel ||
                enviando
            }
            onClick={
                () =>
                    onEnviar(
                        usuario
                    )
            }
            className="inline-flex items-center justify-center whitespace-nowrap rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-bold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
        >
            {enviando
                ? "Enviando..."
                : reenviar
                    ? "Reenviar convite"
                    : "Enviar convite"}
        </button>
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
        usuarioAjusteDados,
        setUsuarioAjusteDados,
    ] =
        useState(null);

    const [
        mensagemEscopo,
        setMensagemEscopo,
    ] =
        useState("");

    const [
        primeiroAcessoPorUsuario,
        setPrimeiroAcessoPorUsuario,
    ] =
        useState({});

    const [
        primeiroAcessoDisponivel,
        setPrimeiroAcessoDisponivel,
    ] =
        useState(false);

    const [
        enviandoPrimeiroAcesso,
        setEnviandoPrimeiroAcesso,
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
                        primeiroAcessoResultado,
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
                            listarPrimeiroAcessoTenantService({
                                tenantId,
                            })
                                .then(
                                    (linhas) => ({
                                        disponivel:
                                            true,
                                        linhas,
                                    })
                                )
                                .catch(
                                    () => ({
                                        disponivel:
                                            false,
                                        linhas:
                                            [],
                                    })
                                ),
                        ]);

                    setEmpresas(
                        empresasResultado
                    );

                    setUsuarios(
                        usuariosResultado
                    );

                    setPrimeiroAcessoDisponivel(
                        primeiroAcessoResultado.disponivel
                    );

                    setPrimeiroAcessoPorUsuario(
                        mapearPrimeiroAcessoPorUsuario(
                            primeiroAcessoResultado.linhas
                        )
                    );
                } catch (error) {
                    setEmpresas(
                        []
                    );

                    setUsuarios(
                        []
                    );

                    setPrimeiroAcessoDisponivel(
                        false
                    );

                    setPrimeiroAcessoPorUsuario(
                        {}
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
            const timerId =
                globalThis.setTimeout(
                    () => {
                        void carregarDetalhes();
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
            carregarDetalhes,
        ]
    );

    const enviarPrimeiroAcesso =
        useCallback(
            async (
                usuario
            ) => {
                const userId =
                    String(
                        usuario?.user_id ||
                        ""
                    ).trim();

                if (
                    !tenantId ||
                    !userId ||
                    !primeiroAcessoDisponivel ||
                    enviandoPrimeiroAcesso
                ) {
                    return;
                }

                setMensagemEscopo(
                    ""
                );

                setEnviandoPrimeiroAcesso(
                    userId
                );

                try {
                    const anterior =
                        primeiroAcessoPorUsuario[
                            userId
                        ];

                    await enviarPrimeiroAcessoClienteService({
                        tenantId,
                        userId,
                    });

                    setMensagemEscopo(
                        Number(
                            anterior?.envioTentativas ||
                            0
                        ) > 0 ||
                        anterior?.status ===
                        "enviado" ||
                        anterior?.status ===
                        "falha"
                            ? "Convite de primeiro acesso reenviado com sucesso."
                            : "Convite de primeiro acesso enviado com sucesso."
                    );

                    await carregarDetalhes();
                }
                catch (error) {
                    setMensagemEscopo(
                        error?.message ||
                        "Não foi possível enviar o primeiro acesso."
                    );
                }
                finally {
                    setEnviandoPrimeiroAcesso(
                        ""
                    );
                }
            },
            [
                carregarDetalhes,
                enviandoPrimeiroAcesso,
                primeiroAcessoDisponivel,
                primeiroAcessoPorUsuario,
                tenantId,
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
            <TenantAdminHero
                eyebrow="DETALHE DO CLIENTE"
                titulo={
                    textoSeguro(
                        tenant?.tenant_nome,
                        "Tenant sem nome"
                    )
                }
                subtitulo={
                    `Ambiente ${textoSeguro(
                        tenant?.tenant_slug,
                        "sem-slug"
                    )} • ${
                        String(
                            tenant?.tenant_status ||
                            "Sem status"
                        ).toUpperCase()
                    } • ${
                        tenant?.dominio_verificado
                            ? "Domínio verificado"
                            : "Domínio pendente"
                    }`
                }
                acoes={
                    <div className="flex flex-wrap items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={
                                onVoltar
                            }
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 text-sm font-bold text-white backdrop-blur-sm transition hover:bg-white/15"
                        >
                            <ArrowLeft className="h-4 w-4" />

                            Voltar aos clientes
                        </button>

                        <button
                            type="button"
                            onClick={
                                carregarDetalhes
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

                            {
                                carregando
                                    ? "Atualizando..."
                                    : "Atualizar dados"
                            }
                        </button>
                    </div>
                }
            />

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

                <button
                    type="button"
                    onClick={
                        () =>
                            setAbaAtiva(
                                "dominio-ativacao"
                            )
                    }
                    className={
                        abaAtiva === "dominio-ativacao"
                            ? "rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm"
                            : "rounded-xl px-4 py-2.5 text-xs font-bold text-slate-500 transition hover:bg-emerald-50 hover:text-emerald-800"
                    }
                >
                    Domínio e ativação
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
                <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-sm font-bold text-slate-900">
                            Usuários e acessos
                        </h2>

                        <p className="mt-1 text-xs leading-5 text-slate-500">
                            Gerencie responsáveis, permissões e o primeiro acesso ao ambiente do cliente.
                        </p>
                    </div>

                    {!carregando ? (
                        <span className="inline-flex w-fit items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-bold text-slate-600">
                            {usuarios.length}
                            {" "}
                            {
                                usuarios.length === 1
                                    ? "usuário"
                                    : "usuários"
                            }
                        </span>
                    ) : null}
                </div>

                {carregando ? (
                    <div className="flex min-h-[180px] items-center justify-center">
                        <RefreshCw className="h-6 w-6 animate-spin text-emerald-600" />
                    </div>
                ) : usuarios.length === 0 ? (
                    <div className="px-5 py-12 text-center">
                        <UsersRound className="mx-auto h-8 w-8 text-slate-300" />

                        <p className="mt-3 text-sm font-bold text-slate-600">
                            Nenhum usuário encontrado
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                            Os usuários vinculados ao cliente aparecerão aqui.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4 bg-slate-50/50 p-4 sm:p-5">
                        {usuarios.map(
                            (usuario) => {
                                const estadoPrimeiroAcesso =
                                    primeiroAcessoPorUsuario[
                                        String(
                                            usuario.user_id ||
                                            ""
                                        ).trim()
                                    ] ||
                                    null;

                                return (
                                    <article
                                        key={
                                            usuario.membership_id ||
                                            usuario.user_id ||
                                            usuario.email
                                        }
                                        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                                    >
                                        <div className="grid lg:grid-cols-[1.15fr_1fr_1fr]">
                                            <div className="border-b border-slate-100 p-5 lg:border-b-0 lg:border-r">
                                                <div className="flex items-center gap-2 text-slate-500">
                                                    <UserCog
                                                        size={16}
                                                        aria-hidden="true"
                                                    />

                                                    <p className="text-[9px] font-black uppercase tracking-[0.12em]">
                                                        Identificação
                                                    </p>
                                                </div>

                                                <div className="mt-3 min-w-0">
                                                    <p className="text-sm font-black text-slate-900">
                                                        {
                                                            textoSeguro(
                                                                usuario.nome,
                                                                "Usuário"
                                                            )
                                                        }
                                                    </p>

                                                    <p className="mt-0.5 text-[11px] font-medium text-slate-400">
                                                        {
                                                            textoSeguro(
                                                                usuario.funcao
                                                            )
                                                        }
                                                    </p>

                                                    <p className="mt-2 break-all text-xs font-semibold leading-5 text-slate-600">
                                                        {
                                                            textoSeguro(
                                                                usuario.email
                                                            )
                                                        }
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="border-b border-slate-100 p-5 lg:border-b-0 lg:border-r">
                                                <div className="flex items-center gap-2 text-slate-500">
                                                    <Building2
                                                        size={16}
                                                        aria-hidden="true"
                                                    />

                                                    <p className="text-[9px] font-black uppercase tracking-[0.12em]">
                                                        Acesso atual
                                                    </p>
                                                </div>

                                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                                    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-700">
                                                        {
                                                            textoSeguro(
                                                                usuario.papel
                                                            )
                                                        }
                                                    </span>

                                                    <StatusPill
                                                        valor={
                                                            usuario.membership_status
                                                        }
                                                    />
                                                </div>

                                                <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-3">
                                                    <p className="text-[9px] font-black uppercase tracking-[0.1em] text-slate-400">
                                                        Empresa vinculada
                                                    </p>

                                                    <p className="mt-1 text-xs font-bold leading-5 text-slate-700">
                                                        {
                                                            textoSeguro(
                                                                usuario.empresa
                                                            )
                                                        }
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="p-5">
                                                <div className="flex items-center gap-2 text-slate-500">
                                                    <ShieldCheck
                                                        size={16}
                                                        aria-hidden="true"
                                                    />

                                                    <p className="text-[9px] font-black uppercase tracking-[0.12em]">
                                                        Primeiro acesso
                                                    </p>
                                                </div>

                                                <div className="mt-3">
                                                    <PrimeiroAcessoTenantCell
                                                        usuario={
                                                            usuario
                                                        }
                                                        estado={
                                                            estadoPrimeiroAcesso
                                                        }
                                                        disponivel={
                                                            primeiroAcessoDisponivel
                                                        }
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/80 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">
                                                    Ações do usuário
                                                </p>

                                                <p className="mt-0.5 text-[10px] text-slate-400">
                                                    Gerencie convite, dados cadastrais e escopo de acesso.
                                                </p>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                                                <PrimeiroAcessoTenantAction
                                                    usuario={
                                                        usuario
                                                    }
                                                    estado={
                                                        estadoPrimeiroAcesso
                                                    }
                                                    disponivel={
                                                        primeiroAcessoDisponivel
                                                    }
                                                    enviando={
                                                        enviandoPrimeiroAcesso ===
                                                        String(
                                                            usuario.user_id ||
                                                            ""
                                                        ).trim()
                                                    }
                                                    onEnviar={
                                                        enviarPrimeiroAcesso
                                                    }
                                                />

                                                {
                                                    ehAdministrador(
                                                        usuario?.papel
                                                    ) &&
                                                    String(
                                                        usuario?.membership_status ||
                                                        ""
                                                    )
                                                        .trim()
                                                        .toLowerCase() ===
                                                    "ativo"
                                                        ? (
                                                            <button
                                                                type="button"
                                                                onClick={
                                                                    () => {
                                                                        setMensagemEscopo(
                                                                            ""
                                                                        );

                                                                        setUsuarioAjusteDados(
                                                                            usuario
                                                                        );
                                                                    }
                                                                }
                                                                className="rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2.5 text-xs font-bold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100"
                                                            >
                                                                Ajustar dados
                                                            </button>
                                                        )
                                                        : null
                                                }

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
                                                    className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800"
                                                >
                                                    Gerenciar escopo
                                                </button>
                                            </div>
                                        </div>
                                    </article>
                                );
                            }
                        )}
                    </div>
                )}
            </section>
                        </>
                    )
                    : abaAtiva ===
                        "modulos"
                        ? (
                            <TenantAdminModulesPanel
                                tenant={
                                    tenant
                                }
                            />
                        )
                        : (
                            <TenantAdminDomainReadinessPanel
                                tenant={
                                    tenant
                                }
                                empresas={
                                    empresas
                                }
                                usuarios={
                                    usuarios
                                }
                            />
                        )
            }

            {usuarioAjusteDados ? (
                <TenantAdminClientDataModal
                    tenantId={
                        tenantId
                    }
                    usuario={
                        usuarioAjusteDados
                    }
                    empresas={
                        empresas
                    }
                    onClose={
                        () =>
                            setUsuarioAjusteDados(
                                null
                            )
                    }
                    onSaved={
                        async (
                            resultado
                        ) => {
                            setUsuarioAjusteDados(
                                null
                            );

                            setMensagemEscopo(
                                resultado?.primeiroAcessoReenvioNecessario
                                    ? "Dados atualizados. O e-mail de acesso foi alterado; reenvie o convite de primeiro acesso."
                                    : "Dados do cliente atualizados com sucesso."
                            );

                            await carregarDetalhes();
                        }
                    }
                />
            ) : null}
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
