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
    definirSenhaTemporariaTenantAdminService,
    enviarRedefinicaoSenhaTenantAdminService,
    validarSenhaTemporariaTenantAdmin,
} from "../services/tenantAdminPasswordService.js";

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
    TenantAdminEmailProviderPanel,
} from "../components/TenantAdminEmailProviderPanel.jsx";

import {
    TenantAdminBrandingPanel,
} from "../components/TenantAdminBrandingPanel.jsx";

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
            className="r26-admin-action-emerald inline-flex items-center justify-center whitespace-nowrap rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-bold text-emerald-700 transition disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
        >
            {enviando
                ? "Enviando..."
                : reenviar
                    ? "Reenviar convite"
                    : "Enviar convite"}
        </button>
    );
}

function TenantAdminTemporaryPasswordModal({
    tenantId,
    usuario,
    onClose,
    onConcluido,
}) {
    const [
        senhaTemporaria,
        setSenhaTemporaria,
    ] =
        useState("");

    const [
        confirmarSenha,
        setConfirmarSenha,
    ] =
        useState("");

    const [
        salvando,
        setSalvando,
    ] =
        useState(false);

    const [
        erroModal,
        setErroModal,
    ] =
        useState("");

    if (!usuario) {
        return null;
    }

    const userId =
        String(
            usuario?.user_id ||
            ""
        ).trim();

    async function salvarSenhaTemporaria(event) {
        event.preventDefault();

        if (
            salvando ||
            !tenantId ||
            !userId
        ) {
            return;
        }

        setErroModal("");

        const validacao =
            validarSenhaTemporariaTenantAdmin(
                senhaTemporaria
            );

        if (validacao) {
            setErroModal(
                validacao
            );

            return;
        }

        if (
            senhaTemporaria !==
            confirmarSenha
        ) {
            setErroModal(
                "A confirmação da senha temporária não confere."
            );

            return;
        }

        try {
            setSalvando(
                true
            );

            const resultado =
                await definirSenhaTemporariaTenantAdminService({
                    tenantId,
                    userId,
                    senhaTemporaria,
                });

            setSenhaTemporaria("");
            setConfirmarSenha("");

            await onConcluido?.(
                resultado?.mensagem ||
                "Senha temporária definida com sucesso."
            );
        }
        catch (error) {
            setErroModal(
                error?.message ||
                "Não foi possível definir a senha temporária."
            );
        }
        finally {
            setSalvando(
                false
            );
        }
    }

    return (
        <div className="r26-admin-modal-backdrop fixed inset-0 flex items-center justify-center p-4 backdrop-blur-sm">
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="tenant-temp-password-title"
                className="r26-admin-modal-panel w-full border border-slate-200 bg-white p-6"
            >
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-emerald-600">
                    Segurança do acesso
                </p>

                <h2
                    id="tenant-temp-password-title"
                    className="mt-1 text-lg font-black text-slate-900"
                >
                    Definir senha temporária
                </h2>

                <p className="mt-2 text-xs leading-5 text-slate-500">
                    O usuário e o e-mail serão mantidos. No próximo acesso, este administrador deverá criar uma nova senha.
                </p>

                <p className="mt-3 break-all rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700">
                    {textoSeguro(
                        usuario?.email,
                        "E-mail não informado"
                    )}
                </p>

                <form
                    className="mt-5 space-y-4"
                    onSubmit={
                        salvarSenhaTemporaria
                    }
                >
                    <div>
                        <label className="mb-1.5 block text-xs font-bold text-slate-700">
                            Senha temporária
                        </label>

                        <input
                            type="password"
                            autoComplete="new-password"
                            value={
                                senhaTemporaria
                            }
                            onChange={
                                (event) =>
                                    setSenhaTemporaria(
                                        event.target.value
                                    )
                            }
                            disabled={
                                salvando
                            }
                            className="r26-admin-password-input h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition disabled:cursor-not-allowed disabled:bg-slate-100"
                        />
                    </div>

                    <div>
                        <label className="mb-1.5 block text-xs font-bold text-slate-700">
                            Confirmar senha temporária
                        </label>

                        <input
                            type="password"
                            autoComplete="new-password"
                            value={
                                confirmarSenha
                            }
                            onChange={
                                (event) =>
                                    setConfirmarSenha(
                                        event.target.value
                                    )
                            }
                            disabled={
                                salvando
                            }
                            className="r26-admin-password-input h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition disabled:cursor-not-allowed disabled:bg-slate-100"
                        />
                    </div>

                    <p className="text-[11px] leading-5 text-slate-400">
                        Mínimo de 12 caracteres, com letra maiúscula, minúscula, número e caractere especial.
                    </p>

                    {erroModal ? (
                        <div
                            role="alert"
                            className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-semibold leading-5 text-red-800"
                        >
                            {erroModal}
                        </div>
                    ) : null}

                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <button
                            type="button"
                            onClick={
                                onClose
                            }
                            disabled={
                                salvando
                            }
                            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Cancelar
                        </button>

                        <button
                            type="submit"
                            disabled={
                                salvando
                            }
                            className="r26-admin-primary rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {salvando
                                ? "Salvando..."
                                : "Definir senha temporária"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

const TENANT_ADMIN_DETAIL_RUNTIME_CSS = `
.r26-admin-action-emerald:hover {
    border-color:
        var(
            --color-emerald-300,
            #6ee7b7
        );

    background-color:
        var(
            --color-emerald-100,
            #d1fae5
        );
}

.r26-admin-action-amber:hover {
    border-color:
        var(
            --color-amber-300,
            #fcd34d
        );

    background-color:
        var(
            --color-amber-100,
            #fef3c7
        );
}

.r26-admin-action-blue:hover {
    border-color:
        var(
            --color-blue-300,
            #93c5fd
        );

    background-color:
        var(
            --color-blue-100,
            #dbeafe
        );
}

.r26-admin-modal-backdrop {
    z-index: 90;

    background-color:
        color-mix(
            in oklab,
            var(--color-slate-950, #020617) 65%,
            transparent
        );
}

.r26-admin-modal-panel {
    max-width: 32rem;
    border-radius: 1.5rem;

    box-shadow:
        var(
            --shadow-2xl,
            0 25px 50px -12px rgb(0 0 0 / 0.25)
        );
}

.r26-admin-password-input:focus {
    border-color:
        var(
            --color-emerald-400,
            #34d399
        );

    box-shadow:
        0 0 0 2px
        var(
            --color-emerald-100,
            #d1fae5
        );
}

.r26-admin-primary:hover {
    background-color:
        var(
            --color-emerald-700,
            #047857
        );
}

.r26-admin-hero-primary:hover {
    background-color:
        var(
            --color-emerald-500,
            #10b981
        );
}

.r26-admin-hero-primary:disabled {
    cursor: wait;
}
`.trim();
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
        usuarioSenhaTemporaria,
        setUsuarioSenhaTemporaria,
    ] =
        useState(null);

    const [
        operacaoSenhaUsuario,
        setOperacaoSenhaUsuario,
    ] =
        useState("");

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

    const enviarRedefinicaoSenha =
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
                    operacaoSenhaUsuario
                ) {
                    return;
                }

                const chaveOperacao =
                    `recovery:${userId}`;

                setMensagemEscopo("");
                setOperacaoSenhaUsuario(
                    chaveOperacao
                );

                try {
                    const resultado =
                        await enviarRedefinicaoSenhaTenantAdminService({
                            tenantId,
                            userId,
                        });

                    setMensagemEscopo(
                        resultado?.mensagem ||
                        "Link de redefinição enviado com sucesso."
                    );
                }
                catch (error) {
                    setMensagemEscopo(
                        error?.message ||
                        "Não foi possível enviar a redefinição de senha."
                    );
                }
                finally {
                    setOperacaoSenhaUsuario("");
                }
            },
            [
                operacaoSenhaUsuario,
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
            <style>{TENANT_ADMIN_DETAIL_RUNTIME_CSS}</style>
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
                            className="r26-admin-hero-primary inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white shadow-lg shadow-black/10 transition disabled:bg-slate-500"
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

                <button
                    type="button"
                    onClick={
                        () =>
                            setAbaAtiva(
                                "branding"
                            )
                    }
                    className={
                        abaAtiva === "branding"
                            ? "rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm"
                            : "rounded-xl px-4 py-2.5 text-xs font-bold text-slate-500 transition hover:bg-emerald-50 hover:text-emerald-800"
                    }
                >
                    Identidade visual
                </button>

                <button
                    type="button"
                    onClick={
                        () =>
                            setAbaAtiva(
                                "email"
                            )
                    }
                    className={
                        abaAtiva === "email"
                            ? "rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm"
                            : "rounded-xl px-4 py-2.5 text-xs font-bold text-slate-500 transition hover:bg-emerald-50 hover:text-emerald-800"
                    }
                >
                    E-mail
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
                                E-mail do administrador principal
                            </dt>

                            <dd className="mt-1 break-all text-sm font-semibold text-slate-800">
                                {
                                    textoSeguro(
                                        tenant?.admin_principal_email,
                                        "Não informado"
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
                                                    Gerencie convite, senha, dados cadastrais e escopo de acesso.
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
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    disabled={
                                                                        Boolean(
                                                                            operacaoSenhaUsuario
                                                                        )
                                                                    }
                                                                    onClick={
                                                                        () =>
                                                                            enviarRedefinicaoSenha(
                                                                                usuario
                                                                            )
                                                                    }
                                                                    className="r26-admin-action-emerald rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-bold text-emerald-700 transition disabled:cursor-not-allowed disabled:opacity-50"
                                                                >
                                                                    {
                                                                        operacaoSenhaUsuario ===
                                                                        `recovery:${String(
                                                                            usuario.user_id ||
                                                                            ""
                                                                        ).trim()}`
                                                                            ? "Enviando redefinição..."
                                                                            : "Enviar redefinição de senha"
                                                                    }
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    disabled={
                                                                        Boolean(
                                                                            operacaoSenhaUsuario
                                                                        )
                                                                    }
                                                                    onClick={
                                                                        () => {
                                                                            setMensagemEscopo("");

                                                                            setUsuarioSenhaTemporaria(
                                                                                usuario
                                                                            );
                                                                        }
                                                                    }
                                                                    className="r26-admin-action-amber rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs font-bold text-amber-800 transition disabled:cursor-not-allowed disabled:opacity-50"
                                                                >
                                                                    Definir senha temporária
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    onClick={
                                                                        () => {
                                                                            setMensagemEscopo("");

                                                                            setUsuarioAjusteDados(
                                                                                usuario
                                                                            );
                                                                        }
                                                                    }
                                                                    className="r26-admin-action-blue rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2.5 text-xs font-bold text-blue-700 transition"
                                                                >
                                                                    Ajustar dados
                                                                </button>
                                                            </>
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
                        : abaAtiva ===
                            "branding"
                            ? (
                                <TenantAdminBrandingPanel
                                    tenant={
                                        tenant
                                    }
                                />
                            )
                            : abaAtiva ===
                                "email"
                                ? (
                                    <TenantAdminEmailProviderPanel
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

            <TenantAdminTemporaryPasswordModal
                tenantId={
                    tenantId
                }
                usuario={
                    usuarioSenhaTemporaria
                }
                onClose={
                    () =>
                        setUsuarioSenhaTemporaria(
                            null
                        )
                }
                onConcluido={
                    async (
                        mensagem
                    ) => {
                        setUsuarioSenhaTemporaria(
                            null
                        );

                        setMensagemEscopo(
                            mensagem
                        );

                        await carregarDetalhes();
                    }
                }
            />

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