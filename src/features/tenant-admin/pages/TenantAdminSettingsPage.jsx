import {
    useEffect,
    useState,
} from "react";

import {
    Building2,
    Database,
    Globe2,
    LockKeyhole,
    ServerCog,
    ShieldCheck,
} from "lucide-react";

import {
    PasswordInput,
} from "../../../components/commonComponents.jsx";

import {
    LIMITE_STORAGE_MB,
} from "../../../constants/sistemaConstants.js";

import {
    TenantAdminHero,
} from "../components/TenantAdminHero.jsx";

import {
    obterEstadoMfaContaMestreService,
    obterEstadoSessaoContaMestreService,
    revogarSessoesContaMestreService,
} from "../services/tenantAdminService.js";

function formatarCapacidadeStorage(
    megabytes
) {
    const valor =
        Math.max(
            0,
            Number(
                megabytes
            ) || 0
        );

    if (
        valor >=
        1024
    ) {
        const gb =
            valor /
            1024;

        return `${
            Number.isInteger(
                gb
            )
                ? gb.toFixed(0)
                : gb.toFixed(1)
        } GB`;
    }

    return `${valor.toLocaleString(
        "pt-BR",
        {
            maximumFractionDigits:
                0,
        }
    )} MB`;
}

function CardStatus({
    titulo,
    valor,
    descricao,
    Icone,
}) {
    return (
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.13em] text-slate-500">
                        {titulo}
                    </p>

                    <p className="mt-3 text-2xl font-black tracking-tight text-slate-950">
                        {valor}
                    </p>

                    <p className="mt-1 text-xs font-medium leading-5 text-slate-500">
                        {descricao}
                    </p>
                </div>

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                    <Icone className="h-5 w-5" />
                </div>
            </div>
        </article>
    );
}

function CardArea({
    titulo,
    descricao,
    detalhe,
    Icone,
    onAbrir,
}) {
    return (
        <article className="flex min-h-[210px] flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                    <Icone className="h-5 w-5" />
                </div>

                <div className="min-w-0">
                    <h3 className="text-sm font-black text-slate-950">
                        {titulo}
                    </h3>

                    <p className="mt-1 text-xs font-medium leading-5 text-slate-500">
                        {descricao}
                    </p>
                </div>
            </div>

            <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                <p className="text-[11px] font-bold leading-5 text-slate-600">
                    {detalhe}
                </p>
            </div>

            <div className="mt-auto pt-5">
                <button
                    type="button"
                    onClick={
                        onAbrir
                    }
                    className="inline-flex w-full items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white transition hover:bg-slate-800"
                >
                    Abrir área
                </button>
            </div>
        </article>
    );
}


function formatarDataSessao(
    epoch
) {
    const valor =
        Number(
            epoch
        );

    if (
        !Number.isFinite(
            valor
        ) ||
        valor <= 0
    ) {
        return "—";
    }

    return new Date(
        valor *
        1000
    ).toLocaleString(
        "pt-BR"
    );
}

function resumirSessionId(
    sessionId
) {
    const valor =
        String(
            sessionId ||
            ""
        );

    if (
        valor.length <=
        16
    ) {
        return valor ||
            "—";
    }

    return `${valor.slice(
        0,
        8
    )}…${valor.slice(
        -6
    )}`;
}

function SessaoContaMestreCard({
    supabase,
    usuario,
}) {
    const [
        estado,
        setEstado,
    ] =
        useState({
            carregando:
                true,
            erro:
                "",
            dados:
                null,
        });

    const [
        processando,
        setProcessando,
    ] =
        useState("");

    const [
        confirmacao,
        setConfirmacao,
    ] =
        useState("");

    const [
        feedback,
        setFeedback,
    ] =
        useState("");

    async function carregar() {
        if (
            !supabase ||
            !usuario?.id
        ) {
            setEstado({
                carregando:
                    false,
                erro:
                    "Sessão da Conta Mestre indisponível.",
                dados:
                    null,
            });

            return;
        }

        setEstado(
            (atual) => ({
                ...atual,
                carregando:
                    true,
                erro:
                    "",
            })
        );

        try {
            const dados =
                await obterEstadoSessaoContaMestreService({
                    supabase,
                });

            setEstado({
                carregando:
                    false,
                erro:
                    "",
                dados,
            });
        }
        catch (error) {
            setEstado({
                carregando:
                    false,
                erro:
                    error?.message ||
                    "Não foi possível consultar a sessão atual.",
                dados:
                    null,
            });
        }
    }

    useEffect(() => {
        let ativo =
            true;

        async function carregarInicial() {
            try {
                const dados =
                    await obterEstadoSessaoContaMestreService({
                        supabase,
                    });

                if (!ativo) {
                    return;
                }

                setEstado({
                    carregando:
                        false,
                    erro:
                        "",
                    dados,
                });
            }
            catch (error) {
                if (!ativo) {
                    return;
                }

                setEstado({
                    carregando:
                        false,
                    erro:
                        error?.message ||
                        "Não foi possível consultar a sessão atual.",
                    dados:
                        null,
                });
            }
        }

        void carregarInicial();

        return () => {
            ativo =
                false;
        };
    }, [
        supabase,
        usuario?.id,
    ]);

    async function executarRevogacao(
        scope
    ) {
        setProcessando(
            scope
        );

        setFeedback(
            ""
        );

        try {
            const resultado =
                await revogarSessoesContaMestreService({
                    supabase,
                    escopo:
                        scope,
                });

            setConfirmacao(
                ""
            );

            if (
                scope ===
                "global"
            ) {
                window.location.assign(
                    "/admin"
                );

                return;
            }

            setFeedback(
                "As outras sessões foram encerradas. Esta sessão AAL2 permaneceu ativa."
            );

            await carregar();

            return resultado;
        }
        catch (error) {
            setFeedback(
                error?.message ||
                "Não foi possível concluir a revogação de sessões."
            );
        }
        finally {
            setProcessando(
                ""
            );
        }
    }

    const dados =
        estado.dados;

    const aal2 =
        dados?.aal ===
        "aal2";

    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">
                        Sessões da Conta Mestre
                    </p>

                    <h2 className="mt-1 text-lg font-black text-slate-950">
                        Controle de sessões autenticadas
                    </h2>

                    <p className="mt-1 max-w-3xl text-xs font-medium leading-5 text-slate-500">
                        Controle a sessão atual e invalide acessos antigos sem expor credenciais administrativas no navegador.
                    </p>
                </div>

                <span
                    className={
                        "inline-flex w-fit rounded-full px-3 py-1.5 text-[11px] font-black " +
                        (
                            estado.carregando
                                ? "bg-slate-100 text-slate-600"
                                : estado.erro
                                    ? "bg-red-50 text-red-700"
                                    : aal2
                                        ? "bg-emerald-50 text-emerald-700"
                                        : "bg-amber-50 text-amber-700"
                        )
                    }
                >
                    {estado.carregando
                        ? "Validando"
                        : estado.erro
                            ? "Indisponível"
                            : aal2
                                ? "Sessão AAL2 ativa"
                                : "AAL2 necessário"}
                </span>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                        Conta autenticada
                    </p>

                    <p className="mt-1 break-all text-xs font-black text-slate-950">
                        {dados?.email || usuario?.email || "—"}
                    </p>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                        Nível da sessão
                    </p>

                    <p className="mt-1 text-sm font-black uppercase text-slate-950">
                        {dados?.aal || "—"}
                    </p>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                        Sessão atual
                    </p>

                    <p className="mt-1 font-mono text-xs font-black text-slate-950">
                        {resumirSessionId(
                            dados?.sessionId
                        )}
                    </p>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                        Expira em
                    </p>

                    <p className="mt-1 text-xs font-black text-slate-950">
                        {formatarDataSessao(
                            dados?.expiresAt
                        )}
                    </p>
                </div>
            </div>

            <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs font-medium leading-5 text-slate-600">
                Emitida em:{" "}
                <strong>
                    {formatarDataSessao(
                        dados?.issuedAt
                    )}
                </strong>
            </div>

            {estado.erro ? (
                <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-bold leading-5 text-red-700">
                    {estado.erro}
                </div>
            ) : null}

            {feedback ? (
                <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs font-bold leading-5 text-emerald-700">
                    {feedback}
                </div>
            ) : null}

            {!confirmacao ? (
                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                    <button
                        type="button"
                        disabled={
                            !aal2 ||
                            estado.carregando ||
                            Boolean(
                                processando
                            )
                        }
                        onClick={() =>
                            setConfirmacao(
                                "others"
                            )
                        }
                        className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Encerrar outras sessões
                    </button>

                    <button
                        type="button"
                        disabled={
                            !aal2 ||
                            estado.carregando ||
                            Boolean(
                                processando
                            )
                        }
                        onClick={() =>
                            setConfirmacao(
                                "global"
                            )
                        }
                        className="inline-flex flex-1 items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-black text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Encerrar todas as sessões
                    </button>
                </div>
            ) : (
                <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4">
                    <p className="text-xs font-black text-amber-900">
                        {confirmacao === "global"
                            ? "Confirma encerrar todas as sessões, inclusive esta?"
                            : "Confirma encerrar todas as outras sessões e manter somente esta sessão atual?"}
                    </p>

                    <p className="mt-1 text-xs font-medium leading-5 text-amber-800">
                        JWTs administrativos antigos também serão bloqueados pelo cutoff de segurança.
                    </p>

                    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                        <button
                            type="button"
                            disabled={
                                Boolean(
                                    processando
                                )
                            }
                            onClick={() =>
                                void executarRevogacao(
                                    confirmacao
                                )
                            }
                            className="inline-flex flex-1 items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {processando
                                ? "Processando..."
                                : "Confirmar revogação"}
                        </button>

                        <button
                            type="button"
                            disabled={
                                Boolean(
                                    processando
                                )
                            }
                            onClick={() =>
                                setConfirmacao(
                                    ""
                                )
                            }
                            className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}
        </section>
    );
}

export function TenantAdminSettingsPage({
    supabase,
    usuario,
    onNavegar,
}) {
    const emailContaMestre =
        String(
            usuario?.email ||
            ""
        ).trim() ||
        "Não informado";

    const identificadorGlobal =
        String(
            usuario?.id ||
            ""
        ).trim() ||
        "Não informado";

    const [
        alterandoSenha,
        setAlterandoSenha,
    ] =
        useState(false);

    const [
        senhaAtual,
        setSenhaAtual,
    ] =
        useState("");

    const [
        novaSenha,
        setNovaSenha,
    ] =
        useState("");

    const [
        confirmarNovaSenha,
        setConfirmarNovaSenha,
    ] =
        useState("");

    const [
        salvandoSenha,
        setSalvandoSenha,
    ] =
        useState(false);

    const [
        erroSenha,
        setErroSenha,
    ] =
        useState("");

    const [
        sucessoSenha,
        setSucessoSenha,
    ] =
        useState("");

    const [
        alterandoEmail,
        setAlterandoEmail,
    ] =
        useState(false);

    const [
        novoEmail,
        setNovoEmail,
    ] =
        useState("");

    const [
        confirmarNovoEmail,
        setConfirmarNovoEmail,
    ] =
        useState("");

    const [
        senhaAtualEmail,
        setSenhaAtualEmail,
    ] =
        useState("");

    const [
        salvandoEmail,
        setSalvandoEmail,
    ] =
        useState(false);

    const [
        erroEmail,
        setErroEmail,
    ] =
        useState("");

    const [
        sucessoEmail,
        setSucessoEmail,
    ] =
        useState("");

    const capacidadeStorage =
        formatarCapacidadeStorage(
            LIMITE_STORAGE_MB
        );

    const [
        mfaContaMestre,
        setMfaContaMestre,
    ] =
        useState({
            carregando:
                true,
            erro:
                "",
            estado:
                null,
        });

    useEffect(() => {
        let ativo =
            true;

        async function carregarMfa() {
            if (
                !supabase ||
                !usuario?.id
            ) {
                if (ativo) {
                    setMfaContaMestre({
                        carregando:
                            false,
                        erro:
                            "Conta Mestre não disponível para validar MFA.",
                        estado:
                            null,
                    });
                }

                return;
            }

            try {
                const estado =
                    await obterEstadoMfaContaMestreService({
                        supabase,
                    });

                if (!ativo) {
                    return;
                }

                setMfaContaMestre({
                    carregando:
                        false,
                    erro:
                        "",
                    estado,
                });
            }
            catch (error) {
                if (!ativo) {
                    return;
                }

                setMfaContaMestre({
                    carregando:
                        false,
                    erro:
                        error?.message ||
                        "Não foi possível consultar o MFA da Conta Mestre.",
                    estado:
                        null,
                });
            }
        }

        carregarMfa();

        return () => {
            ativo =
                false;
        };
    }, [
        supabase,
        usuario?.id,
    ]);

    function abrir(
        secao
    ) {
        onNavegar?.(
            secao
        );
    }

    function limparCamposEmail() {
        setNovoEmail("");
        setConfirmarNovoEmail("");
        setSenhaAtualEmail("");
    }

    function abrirAlteracaoEmail() {
        setErroEmail("");
        setSucessoEmail("");
        limparCamposEmail();
        setAlterandoEmail(true);
    }

    function cancelarAlteracaoEmail() {
        setErroEmail("");
        limparCamposEmail();
        setAlterandoEmail(false);
    }

    async function salvarNovoEmail(
        event
    ) {
        event?.preventDefault?.();

        setErroEmail("");
        setSucessoEmail("");

        const emailAtual =
            String(
                usuario?.email ||
                ""
            )
                .trim()
                .toLowerCase();

        const novoEmailTratado =
            String(
                novoEmail ||
                ""
            )
                .trim()
                .toLowerCase();

        const confirmarEmailTratado =
            String(
                confirmarNovoEmail ||
                ""
            )
                .trim()
                .toLowerCase();

        if (
            !emailAtual ||
            !novoEmailTratado ||
            !confirmarEmailTratado ||
            !senhaAtualEmail
        ) {
            setErroEmail(
                "Informe o novo e-mail, confirme o novo e-mail e informe a senha atual."
            );
            return;
        }

        if (
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                novoEmailTratado
            )
        ) {
            setErroEmail(
                "Informe um endereço de e-mail válido."
            );
            return;
        }

        if (
            novoEmailTratado !==
            confirmarEmailTratado
        ) {
            setErroEmail(
                "A confirmação do novo e-mail não confere."
            );
            return;
        }

        if (
            novoEmailTratado ===
            emailAtual
        ) {
            setErroEmail(
                "O novo e-mail deve ser diferente do e-mail atual."
            );
            return;
        }

        if (
            !supabase?.auth ||
            typeof supabase.auth.signInWithPassword !==
                "function" ||
            typeof supabase.auth.updateUser !==
                "function" ||
            typeof supabase.rpc !==
                "function"
        ) {
            setErroEmail(
                "Os serviços necessários para alterar o e-mail não estão disponíveis."
            );
            return;
        }

        setSalvandoEmail(
            true
        );

        try {
            const {
                error:
                    erroReautenticacao,
            } =
                await supabase.auth
                    .signInWithPassword({
                        email:
                            emailAtual,
                        password:
                            senhaAtualEmail,
                    });

            if (erroReautenticacao) {
                const codigo =
                    String(
                        erroReautenticacao?.code ||
                        ""
                    )
                        .trim()
                        .toLowerCase();

                const mensagem =
                    String(
                        erroReautenticacao?.message ||
                        ""
                    )
                        .trim()
                        .toLowerCase();

                if (
                    codigo ===
                        "invalid_credentials" ||
                    mensagem.includes(
                        "invalid login credentials"
                    )
                ) {
                    setErroEmail(
                        "A senha atual está incorreta."
                    );
                    setSenhaAtualEmail("");
                    return;
                }

                throw erroReautenticacao;
            }

            const {
                data:
                    preflightData,
                error:
                    preflightError,
            } =
                await supabase.rpc(
                    "admin_prevalidar_email_conta_mestre",
                    {
                        p_novo_email:
                            novoEmailTratado,
                    }
                );

            if (preflightError) {
                const mensagemPreflight =
                    String(
                        preflightError?.message ||
                        ""
                    )
                        .trim()
                        .toLowerCase();

                if (
                    mensagemPreflight.includes(
                        "admin_prevalidar_email_conta_mestre"
                    ) ||
                    mensagemPreflight.includes(
                        "could not find the function"
                    )
                ) {
                    throw new Error(
                        "Proteção server-side da alteração de e-mail ainda não está publicada."
                    );
                }

                throw preflightError;
            }

            const preflight =
                Array.isArray(
                    preflightData
                )
                    ? preflightData[0]
                    : preflightData;

            if (
                !preflight ||
                preflight.permitido !==
                    true
            ) {
                const motivo =
                    String(
                        preflight?.motivo ||
                        ""
                    )
                        .trim()
                        .toUpperCase();

                const mensagens =
                    {
                        EMAIL_INVALIDO:
                            "Informe um endereço de e-mail válido.",
                        EMAIL_SEM_ALTERACAO:
                            "O novo e-mail deve ser diferente do e-mail atual.",
                        EMAIL_JA_VINCULADO_PERMISSOES:
                            "Este e-mail já está vinculado a outro usuário do sistema.",
                        EMAIL_JA_VINCULADO_AUDITORIA:
                            "Este e-mail já está vinculado a outro usuário autorizado.",
                    };

                setErroEmail(
                    mensagens[
                        motivo
                    ] ||
                        "O novo e-mail não passou pela validação de segurança."
                );

                return;
            }

            const {
                error:
                    updateError,
            } =
                await supabase.auth
                    .updateUser({
                        email:
                            novoEmailTratado,
                    });

            if (updateError) {
                throw updateError;
            }

            limparCamposEmail();

            setAlterandoEmail(
                false
            );

            setSucessoEmail(
                "Solicitação enviada. Confirme a alteração nos endereços de e-mail atual e novo. O e-mail da Conta Mestre só será atualizado após a conclusão do fluxo seguro do Supabase."
            );
        }
        catch (error) {
            const mensagemErro =
                String(
                    error?.message ||
                    ""
                ).trim();

            const mensagemNormalizada =
                mensagemErro
                    .toLowerCase();

            if (
                mensagemNormalizada.includes(
                    "already registered"
                ) ||
                mensagemNormalizada.includes(
                    "already been registered"
                ) ||
                mensagemNormalizada.includes(
                    "email address is already"
                )
            ) {
                setErroEmail(
                    "Este e-mail já está cadastrado em outra conta."
                );
            }
            else if (
                mensagemNormalizada.includes(
                    "proteção server-side"
                )
            ) {
                setErroEmail(
                    mensagemErro
                );
            }
            else {
                setErroEmail(
                    mensagemErro ||
                    "Não foi possível solicitar a alteração do e-mail. Nenhuma alteração foi confirmada."
                );
            }

            setSenhaAtualEmail("");
        }
        finally {
            setSalvandoEmail(
                false
            );
        }
    }

    function limparCamposSenha() {
        setSenhaAtual("");
        setNovaSenha("");
        setConfirmarNovaSenha("");
    }

    function abrirAlteracaoSenha() {
        setErroSenha("");
        setSucessoSenha("");
        limparCamposSenha();
        setAlterandoSenha(true);
    }

    function cancelarAlteracaoSenha() {
        setErroSenha("");
        limparCamposSenha();
        setAlterandoSenha(false);
    }

    async function salvarNovaSenha(
        event
    ) {
        event?.preventDefault?.();

        setErroSenha("");
        setSucessoSenha("");

        if (
            !senhaAtual ||
            !novaSenha ||
            !confirmarNovaSenha
        ) {
            setErroSenha(
                "Informe a senha atual, a nova senha e a confirmação."
            );
            return;
        }

        if (
            novaSenha.length <
            6
        ) {
            setErroSenha(
                "A nova senha deve ter pelo menos 6 caracteres."
            );
            return;
        }

        if (
            novaSenha !==
            confirmarNovaSenha
        ) {
            setErroSenha(
                "A confirmação da nova senha não confere."
            );
            return;
        }

        if (
            novaSenha ===
            senhaAtual
        ) {
            setErroSenha(
                "A nova senha deve ser diferente da senha atual."
            );
            return;
        }

        if (
            !supabase?.auth ||
            typeof supabase.auth.updateUser !==
                "function"
        ) {
            setErroSenha(
                "O serviço de autenticação não está disponível."
            );
            return;
        }

        setSalvandoSenha(
            true
        );

        try {
            const emailReautenticacao =
                String(
                    usuario?.email ||
                    ""
                ).trim();

            if (!emailReautenticacao) {
                throw new Error(
                    "E-mail da Conta Mestre não disponível para reautenticação."
                );
            }

            const {
                error:
                    erroReautenticacao,
            } =
                await supabase.auth
                    .signInWithPassword({
                        email:
                            emailReautenticacao,
                        password:
                            senhaAtual,
                    });

            if (erroReautenticacao) {
                const codigoReautenticacao =
                    String(
                        erroReautenticacao?.code ||
                        ""
                    )
                        .trim()
                        .toLowerCase();

                const mensagemReautenticacao =
                    String(
                        erroReautenticacao?.message ||
                        ""
                    )
                        .trim()
                        .toLowerCase();

                if (
                    codigoReautenticacao ===
                        "invalid_credentials" ||
                    mensagemReautenticacao.includes(
                        "invalid login credentials"
                    )
                ) {
                    setErroSenha(
                        "A senha atual está incorreta."
                    );

                    setSenhaAtual("");

                    return;
                }

                throw erroReautenticacao;
            }

            const {
                error,
            } =
                await supabase.auth
                    .updateUser({
                        password:
                            novaSenha,
                        current_password:
                            senhaAtual,
                    });

            if (error) {
                throw error;
            }

            limparCamposSenha();

            setAlterandoSenha(
                false
            );

            setSucessoSenha(
                "Senha alterada com sucesso."
            );
        }
        catch (error) {
            const mensagemErro =
                String(
                    error?.message ||
                    ""
                ).trim();

            const mensagemNormalizada =
                mensagemErro
                    .toLowerCase();

            if (
                mensagemNormalizada.includes(
                    "current password"
                ) ||
                (
                    mensagemNormalizada.includes(
                        "password"
                    ) &&
                    mensagemNormalizada.includes(
                        "incorrect"
                    )
                )
            ) {
                setErroSenha(
                    "A senha atual está incorreta."
                );
            }
            else if (
                mensagemNormalizada.includes(
                    "different from the old"
                ) ||
                mensagemNormalizada.includes(
                    "different from old"
                )
            ) {
                setErroSenha(
                    "A nova senha deve ser diferente da senha atual."
                );
            }
            else {
                setErroSenha(
                    mensagemErro ||
                    "Não foi possível alterar a senha. Confira os dados e tente novamente."
                );
            }

            setSenhaAtual("");
        }
        finally {
            setSalvandoSenha(
                false
            );
        }
    }

    return (
        <div className="space-y-5">
            <TenantAdminHero
                titulo="Configurações da plataforma"
                subtitulo="Centralize a governança administrativa e acesse os controles globais do SafeScan Brasil."
            />

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-start gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                            <ShieldCheck className="h-5 w-5" />
                        </div>

                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">
                                Identidade administrativa
                            </p>

                            <h2 className="mt-1 text-lg font-black text-slate-950">
                                Conta Mestre
                            </h2>

                            <p className="mt-1 max-w-3xl text-xs font-medium leading-5 text-slate-500">
                                Identidade global autenticada para administração da plataforma SafeScan Brasil.
                            </p>
                        </div>
                    </div>

                    <span className="inline-flex w-fit items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-700">
                        Acesso global validado
                    </span>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <article className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5">
                        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                            E-mail
                        </p>

                        <p className="mt-2 break-all text-xs font-black text-slate-900">
                            {emailContaMestre}
                        </p>
                    </article>

                    <article className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5">
                        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                            Identificador global
                        </p>

                        <p className="mt-2 break-all font-mono text-[11px] font-bold text-slate-700">
                            {identificadorGlobal}
                        </p>
                    </article>

                    <article className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5">
                        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                            Perfil
                        </p>

                        <p className="mt-2 text-xs font-black text-slate-900">
                            Administrador global
                        </p>
                    </article>

                    <article className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5">
                        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                            Vínculo
                        </p>

                        <p className="mt-2 text-xs font-black text-slate-900">
                            Independente de empresa
                        </p>
                    </article>
                </div>

                <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-3">
                    <p className="text-[11px] font-bold leading-5 text-emerald-900/80">
                        Os dados de identidade acima são somente leitura. Alterações de e-mail, MFA e sessões permanecem em etapas de segurança próprias.
                    </p>
                </div>

                            <div className="mt-4 border-t border-slate-100 pt-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                            Identidade de acesso
                        </p>

                        <h3 className="mt-1 text-sm font-black text-slate-950">
                            E-mail da Conta Mestre
                        </h3>

                        <p className="mt-1 text-xs font-medium leading-5 text-slate-500">
                            A troca exige sua senha atual e confirmação segura do endereço atual e do novo endereço.
                        </p>
                    </div>

                    {!alterandoEmail ? (
                        <button
                            type="button"
                            onClick={
                                abrirAlteracaoEmail
                            }
                            disabled={
                                alterandoSenha
                            }
                            className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 lg:w-auto"
                        >
                            Alterar e-mail
                        </button>
                    ) : null}
                </div>

                {sucessoEmail ? (
                    <div
                        role="status"
                        aria-live="polite"
                        className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold leading-5 text-emerald-800"
                    >
                        {sucessoEmail}
                    </div>
                ) : null}

                {alterandoEmail ? (
                    <form
                        onSubmit={
                            salvarNovoEmail
                        }
                        className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4"
                    >
                        <div className="grid gap-4 lg:grid-cols-3">
                            <label className="block">
                                <span className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
                                    Novo e-mail
                                </span>

                                <input
                                    type="email"
                                    value={
                                        novoEmail
                                    }
                                    onChange={
                                        (event) =>
                                            setNovoEmail(
                                                event.target.value
                                            )
                                    }
                                    disabled={
                                        salvandoEmail
                                    }
                                    autoComplete="email"
                                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                                    placeholder="novo@email.com"
                                />
                            </label>

                            <label className="block">
                                <span className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
                                    Confirmar novo e-mail
                                </span>

                                <input
                                    type="email"
                                    value={
                                        confirmarNovoEmail
                                    }
                                    onChange={
                                        (event) =>
                                            setConfirmarNovoEmail(
                                                event.target.value
                                            )
                                    }
                                    disabled={
                                        salvandoEmail
                                    }
                                    autoComplete="off"
                                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                                    placeholder="Repita o novo e-mail"
                                />
                            </label>

                            <label className="block">
                                <span className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
                                    Senha atual
                                </span>

                                <PasswordInput
                                    autoComplete="current-password"
                                    value={
                                        senhaAtualEmail
                                    }
                                    onChange={
                                        (event) =>
                                            setSenhaAtualEmail(
                                                event.target.value
                                            )
                                    }
                                    disabled={
                                        salvandoEmail
                                    }
                                    className="mt-2"
                                    inputClassName="rounded-xl border-slate-200 bg-white py-2.5 text-xs font-semibold text-slate-900 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                                    placeholder="Confirme sua senha atual"
                                />
                            </label>
                        </div>

                        <p className="mt-3 text-[11px] font-medium leading-5 text-slate-500">
                            A solicitação não altera imediatamente o e-mail exibido. Com o Secure Email Change ativo, a troca só é concluída após as confirmações exigidas pelo Supabase.
                        </p>

                        {erroEmail ? (
                            <div
                                role="alert"
                                className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-700"
                            >
                                {erroEmail}
                            </div>
                        ) : null}

                        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={
                                    cancelarAlteracaoEmail
                                }
                                disabled={
                                    salvandoEmail
                                }
                                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Cancelar
                            </button>

                            <button
                                type="submit"
                                disabled={
                                    salvandoEmail
                                }
                                className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {salvandoEmail
                                    ? "Validando..."
                                    : "Solicitar alteração"}
                            </button>
                        </div>
                    </form>
                ) : null}
            </div>

<div className="mt-4 border-t border-slate-100 pt-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                                Acesso e segurança
                            </p>

                            <h3 className="mt-1 text-sm font-black text-slate-950">
                                Senha da Conta Mestre
                            </h3>

                            <p className="mt-1 text-xs font-medium leading-5 text-slate-500">
                                A alteração exige a senha atual antes de aceitar uma nova credencial.
                            </p>
                        </div>

                        {!alterandoSenha ? (
                            <button
                                type="button"
                                onClick={
                                    abrirAlteracaoSenha
                                }
                                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white transition hover:bg-slate-800 lg:w-auto"
                            >
                                <LockKeyhole className="h-4 w-4" />
                                Alterar senha
                            </button>
                        ) : null}
                    </div>

                    {sucessoSenha ? (
                        <div
                            role="status"
                            aria-live="polite"
                            className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800"
                        >
                            {sucessoSenha}
                        </div>
                    ) : null}

                    {alterandoSenha ? (
                        <form
                            onSubmit={
                                salvarNovaSenha
                            }
                            className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4"
                        >
                            <div className="grid gap-4 lg:grid-cols-3">
                                <label className="block">
                                    <span className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
                                        Senha atual
                                    </span>

                                    <PasswordInput
                                        autoComplete="current-password"
                                        value={
                                            senhaAtual
                                        }
                                        onChange={
                                            (event) =>
                                                setSenhaAtual(
                                                    event.target.value
                                                )
                                        }
                                        disabled={
                                            salvandoSenha
                                        }
                                        className="mt-2"
                                        inputClassName="rounded-xl border-slate-200 bg-white py-2.5 text-xs font-semibold text-slate-900 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                                        placeholder="Digite a senha atual"
                                    />
                                </label>

                                <label className="block">
                                    <span className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
                                        Nova senha
                                    </span>

                                    <PasswordInput
                                        autoComplete="new-password"
                                        value={
                                            novaSenha
                                        }
                                        onChange={
                                            (event) =>
                                                setNovaSenha(
                                                    event.target.value
                                                )
                                        }
                                        disabled={
                                            salvandoSenha
                                        }
                                        className="mt-2"
                                        inputClassName="rounded-xl border-slate-200 bg-white py-2.5 text-xs font-semibold text-slate-900 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                                        placeholder="Digite a nova senha"
                                    />
                                </label>

                                <label className="block">
                                    <span className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
                                        Confirmar nova senha
                                    </span>

                                    <PasswordInput
                                        autoComplete="new-password"
                                        value={
                                            confirmarNovaSenha
                                        }
                                        onChange={
                                            (event) =>
                                                setConfirmarNovaSenha(
                                                    event.target.value
                                                )
                                        }
                                        disabled={
                                            salvandoSenha
                                        }
                                        className="mt-2"
                                        inputClassName="rounded-xl border-slate-200 bg-white py-2.5 text-xs font-semibold text-slate-900 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                                        placeholder="Confirme a nova senha"
                                    />
                                </label>
                            </div>

                            <p className="mt-3 text-[11px] font-medium leading-5 text-slate-500">
                                A nova senha deve possuir pelo menos 6 caracteres e não pode ser igual à senha atual.
                            </p>

                            {erroSenha ? (
                                <div
                                    role="alert"
                                    className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-700"
                                >
                                    {erroSenha}
                                </div>
                            ) : null}

                            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                                <button
                                    type="button"
                                    onClick={
                                        cancelarAlteracaoSenha
                                    }
                                    disabled={
                                        salvandoSenha
                                    }
                                    className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="submit"
                                    disabled={
                                        salvandoSenha
                                    }
                                    className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {salvandoSenha
                                        ? "Alterando senha..."
                                        : "Confirmar alteração"}
                                </button>
                            </div>
                        </form>
                    ) : null}
                </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">
                            Segurança da Conta Mestre
                        </p>

                        <h2 className="mt-1 text-lg font-black text-slate-950">
                            Autenticação em dois fatores (MFA)
                        </h2>

                        <p className="mt-1 max-w-3xl text-xs font-medium leading-5 text-slate-500">
                            O Painel Mestre exige TOTP e sessão AAL2. Esta tela exibe o estado da proteção, mas não oferece desativação simples do segundo fator.
                        </p>
                    </div>

                    <span className={
                        "inline-flex w-fit rounded-full px-3 py-1.5 text-[11px] font-black " +
                        (
                            mfaContaMestre.carregando
                                ? "bg-slate-100 text-slate-600"
                                : mfaContaMestre.erro
                                    ? "bg-red-50 text-red-700"
                                    : mfaContaMestre.estado?.currentLevel === "aal2" &&
                                        mfaContaMestre.estado?.fatoresTotpVerificados?.length > 0
                                        ? "bg-emerald-50 text-emerald-700"
                                        : "bg-amber-50 text-amber-700"
                        )
                    }>
                        {mfaContaMestre.carregando
                            ? "Validando"
                            : mfaContaMestre.erro
                                ? "Indisponível"
                                : mfaContaMestre.estado?.currentLevel === "aal2" &&
                                    mfaContaMestre.estado?.fatoresTotpVerificados?.length > 0
                                    ? "Proteção ativa"
                                    : "Verificação necessária"}
                    </span>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                            Nível da sessão
                        </p>

                        <p className="mt-1 text-sm font-black uppercase text-slate-950">
                            {mfaContaMestre.estado?.currentLevel || "—"}
                        </p>
                    </div>

                    <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                            Fatores TOTP verificados
                        </p>

                        <p className="mt-1 text-sm font-black text-slate-950">
                            {mfaContaMestre.estado?.fatoresTotpVerificados?.length ?? "—"}
                        </p>
                    </div>
                </div>

                {mfaContaMestre.erro ? (
                    <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-bold leading-5 text-red-700">
                        {mfaContaMestre.erro}
                    </div>
                ) : null}

                {mfaContaMestre.estado?.fatoresTotpVerificados?.length ? (
                    <div className="mt-4 space-y-2">
                        {mfaContaMestre.estado.fatoresTotpVerificados.map(
                            (fator) => (
                                <div
                                    key={
                                        fator.id
                                    }
                                    className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 px-4 py-3"
                                >
                                    <div>
                                        <p className="text-xs font-black text-slate-900">
                                            {fator.friendly_name || "Aplicativo autenticador"}
                                        </p>

                                        <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                                            TOTP verificado
                                        </p>
                                    </div>

                                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase text-emerald-700">
                                        Ativo
                                    </span>
                                </div>
                            )
                        )}
                    </div>
                ) : null}

                <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
                    <p className="text-xs font-bold leading-5 text-amber-800">
                        Remoção ou substituição do segundo fator não é disponibilizada como ação comum. Recuperação de MFA deverá seguir fluxo administrativo de contingência próprio.
                    </p>
                </div>
            </section>

            <SessaoContaMestreCard
                supabase={
                    supabase
                }
                usuario={
                    usuario
                }
            />

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <CardStatus
                    titulo="Ativação real"
                    valor="Protegida"
                    descricao="A liberação operacional continua fora desta página e exige o fluxo controlado de ativação."
                    Icone={
                        LockKeyhole
                    }
                />

                <CardStatus
                    titulo="Storage"
                    valor={
                        capacidadeStorage
                    }
                    descricao="Capacidade global configurada para o ambiente atual."
                    Icone={
                        Database
                    }
                />

                <CardStatus
                    titulo="MFA Conta Mestre"
                    valor={
                        mfaContaMestre.carregando
                            ? "Validando"
                            : mfaContaMestre.erro
                                ? "Indisponível"
                                : mfaContaMestre.estado?.currentLevel === "aal2" &&
                                    mfaContaMestre.estado?.fatoresTotpVerificados?.length > 0
                                    ? "AAL2"
                                    : "Pendente"
                    }
                    descricao="Segundo fator TOTP obrigatório para privilégios administrativos globais."
                    Icone={
                        LockKeyhole
                    }
                />

                <CardStatus
                    titulo="Governança"
                    valor="Global"
                    descricao="Configurações desta área pertencem ao Painel Mestre da plataforma."
                    Icone={
                        ShieldCheck
                    }
                />
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">
                        Áreas administrativas
                    </p>

                    <h2 className="mt-1 text-lg font-black text-slate-950">
                        Controles da plataforma
                    </h2>

                    <p className="mt-1 text-xs font-medium leading-5 text-slate-500">
                        Use os atalhos abaixo para acessar funções que já possuem fluxo próprio e validações específicas.
                    </p>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <CardArea
                        titulo="Infraestrutura"
                        descricao="Acompanhe os componentes técnicos e a prontidão da plataforma."
                        detalhe="A área permanece responsável pelo estado técnico dos serviços e da infraestrutura multiempresa."
                        Icone={
                            ServerCog
                        }
                        onAbrir={
                            () =>
                                abrir(
                                    "infraestrutura"
                                )
                        }
                    />

                    <CardArea
                        titulo="Domínios"
                        descricao="Consulte domínios e condições de prontidão dos ambientes."
                        detalhe="Alterações e diagnósticos de domínio continuam concentrados no módulo dedicado."
                        Icone={
                            Globe2
                        }
                        onAbrir={
                            () =>
                                abrir(
                                    "dominios"
                                )
                        }
                    />

                    <CardArea
                        titulo="Clientes"
                        descricao="Acesse os ambientes cadastrados e a gestão operacional dos tenants."
                        detalhe="Módulos, dados do cliente e configurações específicas permanecem no contexto de cada ambiente."
                        Icone={
                            Building2
                        }
                        onAbrir={
                            () =>
                                abrir(
                                    "clientes"
                                )
                        }
                    />
                </div>
            </section>

            <section className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5">
                <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-700 shadow-sm">
                        <ShieldCheck className="h-5 w-5" />
                    </div>

                    <div>
                        <h2 className="text-sm font-black text-emerald-950">
                            Proteção administrativa ativa
                        </h2>

                        <p className="mt-1 max-w-4xl text-xs font-medium leading-5 text-emerald-900/80">
                            Esta página funciona como central de governança e navegação. Nenhuma ativação real, exclusão de Storage, alteração de domínio ou mutation de tenant é executada diretamente por estes cards.
                        </p>
                    </div>
                </div>
            </section>
        </div>
    );
}