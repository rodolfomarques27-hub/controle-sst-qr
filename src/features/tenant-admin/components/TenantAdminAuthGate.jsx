import {
    useEffect,
    useState,
} from "react";

import {
    Loader2,
    LockKeyhole,
    LogIn,
    LogOut,
    Mail,
    ShieldAlert,
} from "lucide-react";

import {
    AccessEntryShell,
} from "../../../components/access/AccessEntryShell.jsx";

import {
    PasswordInput,
} from "../../../components/commonComponents.jsx";

import {
    concluirRotacaoSenhaContaMestreService,
    obterStatusRotacaoSenhaContaMestreService,
    verificarIdentidadeContaMestreService,
} from "../services/tenantAdminService.js";

function LoginAdmin({
    supabase,
}) {
    const [
        email,
        setEmail,
    ] =
        useState("");

    const [
        senha,
        setSenha,
    ] =
        useState("");

    const [
        erro,
        setErro,
    ] =
        useState("");

    const [
        mensagem,
        setMensagem,
    ] =
        useState("");

    const [
        carregando,
        setCarregando,
    ] =
        useState(false);

    const [
        carregandoRecuperacao,
        setCarregandoRecuperacao,
    ] =
        useState(false);

    async function solicitarRecuperacaoSenha() {
        const emailTratado =
            String(
                email ||
                ""
            )
                .trim()
                .toLowerCase();

        setErro("");
        setMensagem("");

        if (!emailTratado) {
            setErro(
                "Informe o e-mail da Conta Mestre."
            );
            return;
        }

        setCarregandoRecuperacao(
            true
        );

        try {
            const {
                error,
            } =
                await supabase.functions
                    .invoke(
                        "master-password-recovery",
                        {
                            body: {
                                email:
                                    emailTratado,
                            },
                        }
                    );

            if (error) {
                throw error;
            }

            setMensagem(
                "Se o e-mail estiver cadastrado, enviaremos um link seguro para redefinir a senha. Verifique também a caixa de spam."
            );
        }
        catch (error) {
            console.error(
                "Falha ao solicitar recuperação da Conta Mestre:",
                error
            );

            setErro(
                "Não foi possível enviar o link de recuperação. Tente novamente."
            );
        }
        finally {
            setCarregandoRecuperacao(
                false
            );
        }
    }

    async function entrar(
        event
    ) {
        event.preventDefault();

        const emailTratado =
            String(
                email || ""
            )
                .trim()
                .toLowerCase();

        if (
            !emailTratado ||
            !senha
        ) {
            setErro(
                "Informe o e-mail e a senha."
            );

            return;
        }

        setErro("");
        setMensagem("");
        setCarregando(true);

        try {
            const {
                error,
            } =
                await supabase.auth
                    .signInWithPassword({
                        email:
                            emailTratado,
                        password:
                            senha,
                    });

            if (error) {
                throw error;
            }
        } catch (error) {
            setErro(
                (
                    error?.message ===
                    "Invalid login credentials"
                        ? "E-mail ou senha inválidos."
                        : error?.message
                ) ||
                "Não foi possível autenticar."
            );
        } finally {
            setCarregando(false);
        }
    }

    return (
        <AccessEntryShell
            titulo="Entre no Painel Mestre"
            descricao="Use sua conta administrativa SafeScan para acessar a gestão global da plataforma."
            lateralRotulo="Administração"
            lateralTexto="Painel Mestre"
            rodape="Área exclusiva da administração global SafeScan."
        >
            <form
                className="tenant-admin-login-form space-y-2.5"
                onSubmit={entrar}
            >
                <style>
                    {`
                        .tenant-admin-login-form input[type="email"]:-webkit-autofill,
                        .tenant-admin-login-form input[type="email"]:-webkit-autofill:hover,
                        .tenant-admin-login-form input[type="email"]:-webkit-autofill:focus,
                        .tenant-admin-login-form input[type="email"]:-webkit-autofill:active {
                            -webkit-box-shadow: 0 0 0 1000px #141828 inset !important;
                            box-shadow: 0 0 0 1000px #141828 inset !important;
                            -webkit-text-fill-color: #e2e8f0 !important;
                            caret-color: #ffffff !important;
                            background-color: #141828 !important;
                            background-image: none !important;
                            transition: background-color 9999s ease-in-out 0s;
                        }

                        .tenant-admin-login-form input[type="email"]::selection {
                            background: rgba(16, 185, 129, 0.28);
                            color: #f8fafc;
                        }
                    `}
                </style>
                <div className="space-y-2">
                    <label className="block text-xs font-medium text-slate-200/85">
                        E-mail
                    </label>

                    <div className="flex items-center gap-2.5 rounded-lg border border-white/10 bg-white/[0.035] px-3.5 py-2.5 transition focus-within:border-emerald-400/40 focus-within:bg-white/[0.05] focus-within:ring-2 focus-within:ring-emerald-400/10">
                        <Mail className="h-4 w-4 shrink-0 text-slate-500" />

                        <input
                            type="email"
                            value={email}
                            onChange={
                                (event) => {
                                    setEmail(
                                        event.target.value
                                    );

                                    setErro("");
                                }
                            }
                            autoComplete="email"
                            placeholder="Digite seu e-mail"
                            className="w-full bg-transparent text-[13px] font-medium text-slate-100 outline-none placeholder:text-slate-500/80"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="block text-xs font-medium text-slate-200/85">
                        Senha
                    </label>

                    <PasswordInput
                        value={senha}
                        onChange={
                            (event) => {
                                setSenha(
                                    event.target.value
                                );

                                setErro("");
                            }
                        }
                        autoComplete="current-password"
                        placeholder="Digite sua senha"
                        inputClassName="rounded-lg !border-white/10 !bg-white/[0.035] py-2.5 text-[13px] font-medium text-slate-100 placeholder:text-slate-500/80 focus:!border-emerald-400/40 focus:!bg-white/[0.05] focus:!ring-2 focus:!ring-emerald-400/10"
                    />
                </div>

                {erro ? (
                    <div
                        role="alert"
                        className="flex items-center justify-center gap-2 rounded-lg border border-red-400/15 bg-red-400/[0.07] px-3 py-2.5 text-center text-[11px] font-medium leading-[1rem] text-red-100/85"
                    >
                        <ShieldAlert className="h-4 w-4 shrink-0" />

                        <span>
                            {erro}
                        </span>
                    </div>
                ) : null}

                {mensagem ? (
                    <div
                        role="status"
                        className="rounded-lg border border-emerald-400/15 bg-emerald-400/[0.07] px-3 py-2.5 text-[11px] font-medium leading-[1rem] text-emerald-100/90"
                    >
                        {mensagem}
                    </div>
                ) : null}

                <button
                    type="submit"
                    disabled={
                        carregando ||
                        !String(
                            email || ""
                        ).trim() ||
                        !senha
                    }
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-950/20 transition hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20 disabled:cursor-not-allowed disabled:bg-white/[0.07] disabled:text-white/30 disabled:shadow-none"
                >
                    {carregando ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <LogIn className="h-4 w-4" />
                    )}

                    {carregando
                        ? "Validando..."
                        : "Entrar no Painel Mestre"}
                </button>

                <button
                    type="button"
                    onClick={
                        solicitarRecuperacaoSenha
                    }
                    disabled={
                        carregando ||
                        carregandoRecuperacao ||
                        !String(
                            email ||
                            ""
                        ).trim()
                    }
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.025] px-4 py-2.5 text-xs font-semibold text-slate-300/80 transition hover:bg-white/[0.055] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                    {carregandoRecuperacao ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <LockKeyhole className="h-4 w-4" />
                    )}

                    {carregandoRecuperacao
                        ? "Enviando link seguro..."
                        : "Esqueci minha senha"}
                </button>
            </form>
        </AccessEntryShell>
    );
}

function RecuperacaoSenhaAdmin({
    supabase,
    usuario,
    onConcluido,
}) {
    const [
        novaSenha,
        setNovaSenha,
    ] =
        useState("");

    const [
        confirmarSenha,
        setConfirmarSenha,
    ] =
        useState("");

    const [
        carregando,
        setCarregando,
    ] =
        useState(false);

    const [
        erro,
        setErro,
    ] =
        useState("");

    const [
        concluido,
        setConcluido,
    ] =
        useState(false);

    async function salvar(
        event
    ) {
        event?.preventDefault?.();

        setErro("");

        if (
            !novaSenha ||
            !confirmarSenha
        ) {
            setErro(
                "Informe e confirme a nova senha."
            );
            return;
        }

        if (
            novaSenha.length <
            6
        ) {
            setErro(
                "A nova senha deve ter pelo menos 6 caracteres."
            );
            return;
        }

        if (
            novaSenha !==
            confirmarSenha
        ) {
            setErro(
                "A confirmação da senha não confere."
            );
            return;
        }

        setCarregando(
            true
        );

        try {
            const {
                error,
            } =
                await supabase.auth
                    .updateUser({
                        password:
                            novaSenha,
                    });

            if (error) {
                throw error;
            }

            setNovaSenha("");
            setConfirmarSenha("");
            setConcluido(true);
        }
        catch (error) {
            console.error(
                "Falha ao redefinir senha da Conta Mestre:",
                error
            );

            setErro(
                error?.message ||
                "Não foi possível redefinir a senha."
            );
        }
        finally {
            setCarregando(false);
        }
    }

    return (
        <AccessEntryShell
            titulo="Redefinir senha da Conta Mestre"
            descricao="Defina uma nova senha para recuperar o acesso administrativo do SafeScan."
            lateralRotulo="Recuperação segura"
            lateralTexto="Conta Mestre"
            rodape="A senha anterior não pode ser exibida ou recuperada."
        >
            {concluido ? (
                <div className="space-y-4">
                    <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/[0.08] px-4 py-4">
                        <p className="text-sm font-bold text-emerald-100">
                            Senha redefinida com sucesso.
                        </p>

                        <p className="mt-1 text-xs leading-5 text-emerald-100/70">
                            A Conta Mestre permanece vinculada ao mesmo identificador global.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={
                            onConcluido
                        }
                        className="flex w-full items-center justify-center rounded-lg bg-emerald-500 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-400"
                    >
                        Continuar para o Painel Mestre
                    </button>
                </div>
            ) : (
                <form
                    onSubmit={
                        salvar
                    }
                    className="space-y-3"
                >
                    <div className="rounded-lg border border-white/10 bg-white/[0.035] px-3.5 py-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                            Conta
                        </p>

                        <p className="mt-1 break-all text-xs font-semibold text-slate-100">
                            {usuario?.email || "Conta Mestre autenticada"}
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-xs font-medium text-slate-200/85">
                            Nova senha
                        </label>

                        <PasswordInput
                            value={
                                novaSenha
                            }
                            onChange={
                                (event) =>
                                    setNovaSenha(
                                        event.target.value
                                    )
                            }
                            autoComplete="new-password"
                            placeholder="Digite a nova senha"
                            inputClassName="rounded-lg !border-white/10 !bg-white/[0.035] py-2.5 text-[13px] font-medium text-slate-100 placeholder:text-slate-500/80 focus:!border-emerald-400/40 focus:!ring-2 focus:!ring-emerald-400/10"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="block text-xs font-medium text-slate-200/85">
                            Confirmar nova senha
                        </label>

                        <PasswordInput
                            value={
                                confirmarSenha
                            }
                            onChange={
                                (event) =>
                                    setConfirmarSenha(
                                        event.target.value
                                    )
                            }
                            autoComplete="new-password"
                            placeholder="Confirme a nova senha"
                            inputClassName="rounded-lg !border-white/10 !bg-white/[0.035] py-2.5 text-[13px] font-medium text-slate-100 placeholder:text-slate-500/80 focus:!border-emerald-400/40 focus:!ring-2 focus:!ring-emerald-400/10"
                        />
                    </div>

                    {erro ? (
                        <div
                            role="alert"
                            className="flex items-start gap-2 rounded-lg border border-red-400/15 bg-red-400/[0.07] px-3 py-2.5 text-[11px] font-medium leading-[1rem] text-red-100/85"
                        >
                            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />

                            <span>
                                {erro}
                            </span>
                        </div>
                    ) : null}

                    <button
                        type="submit"
                        disabled={
                            carregando
                        }
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {carregando ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <LockKeyhole className="h-4 w-4" />
                        )}

                        {carregando
                            ? "Salvando nova senha..."
                            : "Redefinir senha"}
                    </button>
                </form>
            )}
        </AccessEntryShell>
    );
}
function EstadoAdmin({
    tipo,
    usuario,
    onSair,
}) {
    const carregando =
        tipo === "carregando";

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
            <div className="w-full max-w-lg rounded-[2rem] bg-white p-8 text-center shadow-2xl">
                {carregando ? (
                    <Loader2 className="mx-auto h-10 w-10 animate-spin text-emerald-600" />
                ) : (
                    <ShieldAlert className="mx-auto h-11 w-11 text-amber-500" />
                )}

                <h1 className="mt-5 text-xl font-bold text-slate-950">
                    {carregando
                        ? "Validando acesso administrativo"
                        : "Acesso restrito"}
                </h1>

                <p className="mt-3 text-sm leading-6 text-slate-500">
                    {carregando
                        ? "Confirmando sua autorização global no SafeScan."
                        : "A conta está autenticada, mas não possui autorização global da plataforma."}
                </p>

                {usuario?.email ? (
                    <p className="mt-4 rounded-xl bg-slate-100 px-4 py-3 font-mono text-xs text-slate-600">
                        {usuario.email}
                    </p>
                ) : null}

                {!carregando ? (
                    <button
                        type="button"
                        onClick={onSair}
                        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white"
                    >
                        <LogOut className="h-4 w-4" />
                        Sair
                    </button>
                ) : null}
            </div>
        </div>
    );
}

function SegurancaContaMestreIndisponivel({
    usuario,
    onSair,
}) {
    return (
        <AccessEntryShell
            titulo="Validação de segurança indisponível"
            descricao="O SafeScan não conseguiu validar o estado de proteção da Conta Mestre."
            lateralRotulo="Proteção administrativa"
            lateralTexto="Acesso bloqueado"
            rodape="O Painel Mestre permanece bloqueado até que a validação server-side seja concluída."
        >
            <div className="space-y-4">
                <div className="rounded-lg border border-amber-400/20 bg-amber-400/[0.08] px-4 py-4">
                    <div className="flex items-start gap-3">
                        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />

                        <div>
                            <p className="text-sm font-bold text-amber-100">
                                Proteção administrativa indisponível
                            </p>

                            <p className="mt-1 text-xs font-medium leading-5 text-amber-100/70">
                                Por segurança, nenhuma área do Painel Mestre será liberada enquanto esta verificação estiver indisponível.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="rounded-lg border border-white/10 bg-white/[0.035] px-3.5 py-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                        Conta autenticada
                    </p>

                    <p className="mt-1 break-all text-xs font-semibold text-slate-100">
                        {usuario?.email || "Conta Mestre"}
                    </p>
                </div>

                <button
                    type="button"
                    onClick={onSair}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-bold text-slate-100 transition hover:bg-white/[0.08]"
                >
                    <LogOut className="h-4 w-4" />
                    Sair com segurança
                </button>
            </div>
        </AccessEntryShell>
    );
}

function RotacaoSenhaObrigatoriaAdmin({
    supabase,
    usuario,
    status,
}) {
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
        confirmarSenha,
        setConfirmarSenha,
    ] =
        useState("");

    const [
        carregando,
        setCarregando,
    ] =
        useState(false);

    const [
        erro,
        setErro,
    ] =
        useState("");

    const [
        senhaAtualizada,
        setSenhaAtualizada,
    ] =
        useState(false);

    async function encerrarTodasAsSessoes() {
        if (
            !supabase?.auth ||
            typeof supabase.auth.signOut !==
                "function"
        ) {
            throw new Error(
                "O serviço de encerramento de sessões não está disponível."
            );
        }

        const {
            error,
        } =
            await supabase.auth
                .signOut({
                    scope:
                        "global",
                });

        if (error) {
            throw error;
        }
    }

    async function tentarEncerrarSessoes() {
        setErro("");
        setCarregando(true);

        try {
            await encerrarTodasAsSessoes();
        }
        catch (error) {
            setErro(
                (
                    error?.message ||
                    "Não foi possível encerrar todas as sessões."
                )
            );
        }
        finally {
            setCarregando(false);
        }
    }

    async function salvar(
        event
    ) {
        event?.preventDefault?.();

        setErro("");

        if (
            !senhaAtual ||
            !novaSenha ||
            !confirmarSenha
        ) {
            setErro(
                "Informe a senha atual, a nova senha e a confirmação."
            );
            return;
        }

        if (
            novaSenha.length <
            6
        ) {
            setErro(
                "A nova senha deve ter pelo menos 6 caracteres."
            );
            return;
        }

        if (
            novaSenha !==
            confirmarSenha
        ) {
            setErro(
                "A confirmação da nova senha não confere."
            );
            return;
        }

        if (
            novaSenha ===
            senhaAtual
        ) {
            setErro(
                "A nova senha deve ser diferente da senha utilizada anteriormente."
            );
            return;
        }

        if (
            !supabase?.auth ||
            typeof supabase.auth.signInWithPassword !==
                "function" ||
            typeof supabase.auth.updateUser !==
                "function"
        ) {
            setErro(
                "Os serviços necessários para atualizar a credencial não estão disponíveis."
            );
            return;
        }

        const emailAtual =
            String(
                usuario?.email ||
                ""
            )
                .trim()
                .toLowerCase();

        if (!emailAtual) {
            setErro(
                "Não foi possível identificar o e-mail atual da Conta Mestre."
            );
            return;
        }

        setCarregando(true);

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
                            senhaAtual,
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
                    setSenhaAtual("");

                    setErro(
                        "A senha atual está incorreta."
                    );

                    return;
                }

                throw erroReautenticacao;
            }

            const {
                error:
                    erroAtualizacao,
            } =
                await supabase.auth
                    .updateUser({
                        password:
                            novaSenha,
                        current_password:
                            senhaAtual,
                    });

            if (erroAtualizacao) {
                throw erroAtualizacao;
            }

            setSenhaAtual("");
            setNovaSenha("");
            setConfirmarSenha("");

            setSenhaAtualizada(
                true
            );

            try {
                await encerrarTodasAsSessoes();
            }
            catch (error) {
                setErro(
                    "A nova senha foi registrada, mas ainda não foi possível encerrar todas as sessões. Tente novamente para concluir a proteção. " +
                    (
                        error?.message ||
                        ""
                    )
                );
            }
        }
        catch (error) {
            const mensagem =
                String(
                    error?.message ||
                    ""
                ).trim();

            const normalizada =
                mensagem
                    .toLowerCase();

            if (
                normalizada.includes(
                    "current password"
                ) ||
                (
                    normalizada.includes(
                        "password"
                    ) &&
                    normalizada.includes(
                        "incorrect"
                    )
                )
            ) {
                setErro(
                    "A senha atual está incorreta."
                );
            }
            else if (
                normalizada.includes(
                    "different from the old"
                ) ||
                normalizada.includes(
                    "different from old"
                ) ||
                normalizada.includes(
                    "same password"
                )
            ) {
                setErro(
                    "A nova senha deve ser diferente da senha utilizada anteriormente."
                );
            }
            else {
                setErro(
                    mensagem ||
                    "Não foi possível atualizar a credencial da Conta Mestre."
                );
            }

            setSenhaAtual("");
        }
        finally {
            setCarregando(false);
        }
    }

    return (
        <AccessEntryShell
            titulo="Atualização obrigatória de credencial"
            descricao="O e-mail da Conta Mestre foi alterado. Defina uma nova senha para concluir a proteção da conta."
            lateralRotulo="Segurança reforçada"
            lateralTexto="Conta Mestre"
            rodape="O Painel Mestre permanecerá bloqueado até a troca da senha, encerramento das sessões e novo login."
        >
            <div className="space-y-4">
                <div
                    role="status"
                    aria-live="polite"
                    className="rounded-lg border border-emerald-400/25 bg-emerald-400/[0.09] px-4 py-4"
                >
                    <p className="text-sm font-bold text-emerald-100">
                        E-mail confirmado com sucesso
                    </p>

                    <p className="mt-1 text-xs font-medium leading-5 text-emerald-100/75">
                        O novo e-mail da Conta Mestre foi confirmado. Por segurança, defina agora uma nova senha para concluir a atualização da conta.
                    </p>
                </div>
                <div className="rounded-lg border border-amber-400/20 bg-amber-400/[0.08] px-4 py-4">
                    <div className="flex items-start gap-3">
                        <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />

                        <div>
                            <p className="text-sm font-bold text-amber-100">
                                Nova senha obrigatória
                            </p>

                            <p className="mt-1 text-xs font-medium leading-5 text-amber-100/70">
                                A nova senha não pode ser igual à credencial atual. Depois da alteração, todas as sessões serão encerradas e será necessário entrar novamente.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="rounded-lg border border-white/10 bg-white/[0.035] px-3.5 py-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                        E-mail atual da Conta Mestre
                    </p>

                    <p className="mt-1 break-all text-xs font-semibold text-slate-100">
                        {
                            status?.emailReferencia ||
                            usuario?.email ||
                            "Conta Mestre autenticada"
                        }
                    </p>
                </div>

                {senhaAtualizada ? (
                    <div className="space-y-3">
                        <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/[0.08] px-4 py-4">
                            <p className="text-sm font-bold text-emerald-100">
                                Nova senha registrada
                            </p>

                            <p className="mt-1 text-xs font-medium leading-5 text-emerald-100/70">
                                Falta apenas encerrar todas as sessões. Depois, faça um novo login com o e-mail atual e a nova senha.
                            </p>
                        </div>

                        {erro ? (
                            <div
                                role="alert"
                                className="rounded-lg border border-red-400/20 bg-red-400/[0.08] px-4 py-3 text-xs font-bold leading-5 text-red-100"
                            >
                                {erro}
                            </div>
                        ) : null}

                        <button
                            type="button"
                            disabled={
                                carregando
                            }
                            onClick={
                                tentarEncerrarSessoes
                            }
                            className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {carregando ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <LogOut className="h-4 w-4" />
                            )}

                            {carregando
                                ? "Encerrando sessões..."
                                : "Encerrar sessões e entrar novamente"}
                        </button>
                    </div>
                ) : (
                    <form
                        onSubmit={
                            salvar
                        }
                        className="space-y-3"
                    >
                        <div>
                            <label className="block text-xs font-medium text-slate-200/85">
                                Senha atual
                            </label>

                            <PasswordInput
                                value={
                                    senhaAtual
                                }
                                onChange={
                                    (event) =>
                                        setSenhaAtual(
                                            event.target.value
                                        )
                                }
                                autoComplete="current-password"
                                placeholder="Digite a senha atual"
                                disabled={
                                    carregando
                                }
                                inputClassName="rounded-lg !border-white/10 !bg-white/[0.035] py-2.5 text-[13px] font-medium text-slate-100 placeholder:text-slate-500/80 focus:!border-emerald-400/40 focus:!ring-2 focus:!ring-emerald-400/10"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-200/85">
                                Nova senha
                            </label>

                            <PasswordInput
                                value={
                                    novaSenha
                                }
                                onChange={
                                    (event) =>
                                        setNovaSenha(
                                            event.target.value
                                        )
                                }
                                autoComplete="new-password"
                                placeholder="Digite a nova senha"
                                disabled={
                                    carregando
                                }
                                inputClassName="rounded-lg !border-white/10 !bg-white/[0.035] py-2.5 text-[13px] font-medium text-slate-100 placeholder:text-slate-500/80 focus:!border-emerald-400/40 focus:!ring-2 focus:!ring-emerald-400/10"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-200/85">
                                Confirmar nova senha
                            </label>

                            <PasswordInput
                                value={
                                    confirmarSenha
                                }
                                onChange={
                                    (event) =>
                                        setConfirmarSenha(
                                            event.target.value
                                        )
                                }
                                autoComplete="new-password"
                                placeholder="Confirme a nova senha"
                                disabled={
                                    carregando
                                }
                                inputClassName="rounded-lg !border-white/10 !bg-white/[0.035] py-2.5 text-[13px] font-medium text-slate-100 placeholder:text-slate-500/80 focus:!border-emerald-400/40 focus:!ring-2 focus:!ring-emerald-400/10"
                            />
                        </div>

                        <p className="text-[11px] font-medium leading-5 text-slate-400">
                            Após a alteração, você será desconectado de todas as sessões e deverá entrar novamente com a nova senha.
                        </p>

                        {erro ? (
                            <div
                                role="alert"
                                className="rounded-lg border border-red-400/20 bg-red-400/[0.08] px-4 py-3 text-xs font-bold leading-5 text-red-100"
                            >
                                {erro}
                            </div>
                        ) : null}

                        <button
                            type="submit"
                            disabled={
                                carregando
                            }
                            className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {carregando ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <LockKeyhole className="h-4 w-4" />
                            )}

                            {carregando
                                ? "Atualizando credencial..."
                                : "Definir nova senha"}
                        </button>
                    </form>
                )}
            </div>
        </AccessEntryShell>
    );
}

export function TenantAdminAuthGate({
    supabase,
    children,
}) {
    const [usuario, setUsuario] =
        useState(null);

    const [carregandoSessao, setCarregandoSessao] =
        useState(true);

    const [
        autorizacao,
        setAutorizacao,
    ] =
        useState({
            usuarioId:
                null,
            autorizado:
                null,
        });

    const autorizado =
        usuario?.id &&
        autorizacao.usuarioId ===
        usuario.id
            ? autorizacao.autorizado
            : null;

    const [
        recuperacaoSenhaAtiva,
        setRecuperacaoSenhaAtiva,
    ] =
        useState(false);
    const [
        segurancaContaMestre,
        setSegurancaContaMestre,
    ] =
        useState({
            usuarioId:
                null,
            status:
                null,
            erro:
                "",
        });

    const [
        feedbackRotacaoConcluida,
        setFeedbackRotacaoConcluida,
    ] =
        useState(false);

    const statusSegurancaContaMestre =
        usuario?.id &&
        segurancaContaMestre.usuarioId ===
            usuario.id
            ? segurancaContaMestre.status
            : null;

    const erroSegurancaContaMestre =
        usuario?.id &&
        segurancaContaMestre.usuarioId ===
            usuario.id
            ? segurancaContaMestre.erro
            : "";

    useEffect(() => {
        let ativo =
            true;

        async function carregar() {
            const {
                data,
            } =
                await supabase.auth
                    .getSession();

            if (!ativo) {
                return;
            }

            setUsuario(
                data?.session?.user ||
                null
            );

            setCarregandoSessao(false);
        }

        carregar();

        const {
            data,
        } =
            supabase.auth
                .onAuthStateChange(
                    (
                        evento,
                        sessao
                    ) => {
                        if (!ativo) {
                            return;
                        }

                        if (
                            evento ===
                            "PASSWORD_RECOVERY"
                        ) {
                            setRecuperacaoSenhaAtiva(
                                true
                            );
                        }

                        if (
                            evento ===
                            "SIGNED_OUT"
                        ) {
                            setRecuperacaoSenhaAtiva(
                                false
                            );

                            setSegurancaContaMestre({
                                usuarioId:
                                    null,
                                status:
                                    null,
                                erro:
                                    "",
                            });

                            setFeedbackRotacaoConcluida(
                                false
                            );
                        }

                        setUsuario(
                            sessao?.user ||
                            null
                        );

                        setCarregandoSessao(false);
                    }
                );

        return () => {
            ativo =
                false;

            data?.subscription
                ?.unsubscribe?.();
        };
    }, [supabase]);

    useEffect(() => {
        if (
            carregandoSessao ||
            !usuario?.id
        ) {
            return;
        }

        let ativo =
            true;

        async function validar() {
            try {
                const resultado =
                    await verificarIdentidadeContaMestreService({
                        supabase,
                    });

                if (ativo) {
                    setAutorizacao({
                        usuarioId:
                            usuario.id,
                        autorizado:
                            resultado,
                    });
                }
            } catch {
                if (ativo) {
                    setAutorizacao({
                        usuarioId:
                            usuario.id,
                        autorizado:
                            false,
                    });
                }
            }
        }

        validar();

        return () => {
            ativo =
                false;
        };
    }, [
        carregandoSessao,
        supabase,
        usuario?.id,
    ]);

    useEffect(() => {
        if (
            carregandoSessao ||
            recuperacaoSenhaAtiva ||
            !usuario?.id ||
            autorizado !==
                true
        ) {
            return;
        }

        let ativo =
            true;

        const usuarioId =
            usuario.id;

        async function validarSeguranca() {
            try {
                const status =
                    await obterStatusRotacaoSenhaContaMestreService({
                        supabase,
                    });

                if (!ativo) {
                    return;
                }

                if (
                    status?.obrigatoria ===
                        true &&
                    status?.senhaRotacionadaEm
                ) {
                    try {
                        await concluirRotacaoSenhaContaMestreService({
                            supabase,
                        });

                        if (!ativo) {
                            return;
                        }

                        setSegurancaContaMestre({
                            usuarioId,
                            status: {
                                ...status,
                                obrigatoria:
                                    false,
                            },
                            erro:
                                "",
                        });

                        setFeedbackRotacaoConcluida(
                            true
                        );

                        return;
                    }
                    catch (error) {
                        const mensagem =
                            String(
                                error?.message ||
                                ""
                            );

                        if (
                            mensagem.includes(
                                "MASTER_NEW_LOGIN_REQUIRED"
                            )
                        ) {
                            const {
                                error:
                                    erroLogout,
                            } =
                                await supabase.auth
                                    .signOut({
                                        scope:
                                            "global",
                                    });

                            if (erroLogout) {
                                throw new Error(
                                    "A senha já foi alterada, mas não foi possível encerrar todas as sessões. Tente sair novamente.",
                                    {
                                        cause:
                                            error,
                                    }
                                );
                            }

                            return;
                        }

                        throw error;
                    }
                }

                setSegurancaContaMestre({
                    usuarioId,
                    status,
                    erro:
                        "",
                });
            }
            catch (error) {
                if (!ativo) {
                    return;
                }

                setSegurancaContaMestre({
                    usuarioId,
                    status:
                        null,
                    erro:
                        (
                            error?.message ||
                            "Não foi possível validar o estado de segurança da Conta Mestre."
                        ),
                });
            }
        }

        validarSeguranca();

        return () => {
            ativo =
                false;
        };
    }, [
        autorizado,
        carregandoSessao,
        recuperacaoSenhaAtiva,
        supabase,
        usuario?.id,
    ]);
    async function sair() {
        await supabase.auth
            .signOut();
    }

    if (carregandoSessao) {
        return (
            <EstadoAdmin
                tipo="carregando"
                usuario={usuario}
                onSair={sair}
            />
        );
    }

    if (!usuario?.id) {
        return (
            <LoginAdmin
                supabase={supabase}
            />
        );
    }

    if (
        recuperacaoSenhaAtiva &&
        usuario?.id
    ) {
        return (
            <RecuperacaoSenhaAdmin
                supabase={
                    supabase
                }
                usuario={
                    usuario
                }
                onConcluido={
                    () =>
                        setRecuperacaoSenhaAtiva(
                            false
                        )
                }
            />
        );
    }

    if (autorizado === null) {
        return (
            <EstadoAdmin
                tipo="carregando"
                usuario={usuario}
                onSair={sair}
            />
        );
    }

    if (!autorizado) {
        return (
            <EstadoAdmin
                tipo="negado"
                usuario={usuario}
                onSair={sair}
            />
        );
    }

    if (
        erroSegurancaContaMestre
    ) {
        return (
            <SegurancaContaMestreIndisponivel
                usuario={
                    usuario
                }
                onSair={
                    sair
                }
            />
        );
    }

    if (
        statusSegurancaContaMestre ===
        null
    ) {
        return (
            <EstadoAdmin
                tipo="carregando"
                usuario={
                    usuario
                }
                onSair={
                    sair
                }
            />
        );
    }

    if (
        statusSegurancaContaMestre
            ?.obrigatoria ===
        true
    ) {
        return (
            <RotacaoSenhaObrigatoriaAdmin
                supabase={
                    supabase
                }
                usuario={
                    usuario
                }
                status={
                    statusSegurancaContaMestre
                }
            />
        );
    }
    const conteudo =
        children({
            usuario,
            sair,
        });

    return (
        <>
            {feedbackRotacaoConcluida ? (
                <div className="fixed left-1/2 top-5 z-[120] w-[min(92vw,720px)] -translate-x-1/2 px-2">
                    <div
                        role="status"
                        aria-live="polite"
                        aria-atomic="true"
                        className="flex items-start justify-between gap-4 rounded-2xl border border-emerald-200 bg-white px-5 py-4 shadow-[0_18px_50px_rgba(15,23,42,0.20)]"
                    >
                        <div>
                            <p className="text-sm font-black text-emerald-800">
                                Conta Mestre atualizada com sucesso
                            </p>

                            <p className="mt-1 text-xs font-medium leading-5 text-slate-600">
                                Seu novo e-mail e sua nova senha estão ativos. As proteções administrativas foram restabelecidas.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={
                                () =>
                                    setFeedbackRotacaoConcluida(
                                        false
                                    )
                            }
                            className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-bold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                        >
                            Fechar
                        </button>
                    </div>
                </div>
            ) : null}

            {conteudo}
        </>
    );
}
