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
    verificarAdministradorGlobalService,
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
        carregando,
        setCarregando,
    ] =
        useState(false);

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
                error?.message ||
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
                className="space-y-2.5"
                onSubmit={entrar}
            >
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

                    <div className="flex items-center gap-2.5 rounded-lg border border-white/10 bg-white/[0.035] px-3.5 py-2.5 transition focus-within:border-emerald-400/40 focus-within:bg-white/[0.05] focus-within:ring-2 focus-within:ring-emerald-400/10">
                        <LockKeyhole className="h-4 w-4 shrink-0 text-slate-500" />

                        <input
                            type="password"
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
                            className="w-full bg-transparent text-[13px] font-medium text-slate-100 outline-none placeholder:text-slate-500/80"
                        />
                    </div>
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
            </form>
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

export function TenantAdminAuthGate({
    supabase,
    children,
}) {
    const [usuario, setUsuario] =
        useState(null);

    const [carregandoSessao, setCarregandoSessao] =
        useState(true);

    const [autorizado, setAutorizado] =
        useState(null);

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
                        _evento,
                        sessao
                    ) => {
                        if (!ativo) {
                            return;
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
            setAutorizado(null);
            return;
        }

        let ativo =
            true;

        async function validar() {
            try {
                const resultado =
                    await verificarAdministradorGlobalService({
                        supabase,
                    });

                if (ativo) {
                    setAutorizado(
                        resultado
                    );
                }
            } catch {
                if (ativo) {
                    setAutorizado(false);
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

    return children({
        usuario,
        sair,
    });
}