import { useEffect, useState } from "react";
import {
    Building2,
    ClipboardList,
    Loader2,
    LogIn,
    Mail,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { PasswordInput } from "./commonComponents";
import { registrarSolicitacaoRecuperacaoSenhaLoginService } from "../services/acessosAppService";
import {
    carregarFundoLoginPublicoService,
    obterUrlLogoContratanteLoginPublicoService,
} from "../services/fundoLoginPublicoService";

const AJUSTE_FUNDO_LOGIN_PADRAO = {
    size: "cover",
    position: "center center",
    overlay: 0.62,
};

const URL_LOGO_CONTRATANTE_LOGIN =
    obterUrlLogoContratanteLoginPublicoService({
        supabase,
    });

function LogoContratanteLogin() {
    const [falhaLogoContratante, setFalhaLogoContratante] = useState(false);

    if (!URL_LOGO_CONTRATANTE_LOGIN || falhaLogoContratante) {
        return <Building2 className="h-10 w-10 text-emerald-300/80" />;
    }

    return (
        <img
            src={URL_LOGO_CONTRATANTE_LOGIN}
            alt="Logo da empresa contratante"
            className="max-h-[96px] max-w-[128px] object-contain"
            onError={() => setFalhaLogoContratante(true)}
        />
    );
}

function normalizarAjusteFundoLogin(valor = {}) {
    const overlayNumerico = Number(valor?.overlay);

    return {
        size: String(
            valor?.size ||
            AJUSTE_FUNDO_LOGIN_PADRAO.size
        ),
        position: String(
            valor?.position ||
            AJUSTE_FUNDO_LOGIN_PADRAO.position
        ),
        overlay: Number.isFinite(overlayNumerico)
            ? Math.min(
                0.82,
                Math.max(
                    0.28,
                    overlayNumerico
                )
            )
            : AJUSTE_FUNDO_LOGIN_PADRAO.overlay,
    };
}

function montarEstiloFundoLogin(
    url,
    ajuste = AJUSTE_FUNDO_LOGIN_PADRAO
) {
    if (!url) return undefined;

    const ajusteFinal =
        normalizarAjusteFundoLogin(ajuste);

    const overlayPrincipal =
        Math.min(
            0.34,
            ajusteFinal.overlay
        );

    const overlaySecundario =
        Math.max(
            0.04,
            overlayPrincipal - 0.10
        );

    return {
        backgroundImage: `
            linear-gradient(
                135deg,
                rgba(2, 6, 23, ${overlayPrincipal}),
                rgba(2, 6, 23, ${overlaySecundario})
            ),
            url("${url}")
        `,
        backgroundSize: ajusteFinal.size,
        backgroundPosition: ajusteFinal.position,
        backgroundRepeat: "no-repeat",
    };
}

export function LoginScreen({ onLogin }) {
    const [email, setEmail] =
        useState("");

    const [senha, setSenha] =
        useState("");

    const [carregando, setCarregando] =
        useState(false);

    const [
        carregandoSolicitacaoSenha,
        setCarregandoSolicitacaoSenha,
    ] =
        useState(false);

    const [mostrarEsqueciSenha, setMostrarEsqueciSenha] =
        useState(false);

    const [erro, setErro] =
        useState("");

    const [mensagem, setMensagem] =
        useState("");

    const [
        fundoLoginUrl,
        setFundoLoginUrl,
    ] =
        useState("");

    const [
        ajusteFundoLogin,
        setAjusteFundoLogin,
    ] =
        useState(
            () => AJUSTE_FUNDO_LOGIN_PADRAO
        );

    useEffect(() => {
        let cancelado = false;

        async function carregarFundoLogin() {
            const resultado =
                await carregarFundoLoginPublicoService({
                    supabase,
                });

            if (
                cancelado ||
                !resultado.imagemUrl
            ) {
                if (!cancelado) {
                    setFundoLoginUrl("");
                    setAjusteFundoLogin(
                        AJUSTE_FUNDO_LOGIN_PADRAO
                    );
                }

                return;
            }

            const imagem =
                new Image();

            imagem.onload =
                () => {
                    if (!cancelado) {
                        setFundoLoginUrl(
                            resultado.imagemUrl
                        );
                    }
                };

            imagem.onerror =
                () => {
                    if (!cancelado) {
                        setFundoLoginUrl("");
                    }
                };

            imagem.src =
                resultado.imagemUrl;

            if (
                resultado.ajuste &&
                !cancelado
            ) {
                setAjusteFundoLogin(
                    normalizarAjusteFundoLogin(
                        resultado.ajuste
                    )
                );
            }
        }

        carregarFundoLogin();

        return () => {
            cancelado = true;
        };
    }, []);

    const fazerLogin =
        async (event) => {
            event?.preventDefault?.();

            setErro("");
            setMensagem("");

            const emailTratado =
                String(email || "")
                    .trim()
                    .toLowerCase();

            if (
                !emailTratado ||
                !senha
            ) {
                setErro(
                    "Informe o e-mail e a senha para acessar o sistema."
                );

                return;
            }

            setCarregando(true);

            try {
                const {
                    data,
                    error,
                } =
                    await supabase.auth
                        .signInWithPassword({
                            email: emailTratado,
                            password: senha,
                        });

                if (error) {
                    setMostrarEsqueciSenha(true);
                    setErro(
                        "Não foi possível entrar.\nConfira o e-mail, a senha ou solicite liberação ao administrador."
                    );

                    return;
                }

                if (!data?.user?.id) {
                    setErro(
                        "Login autenticado sem identificação do usuário. Tente novamente."
                    );

                    return;
                }

                onLogin({
                    id: data.user.id,
                    email:
                        data.user.email ||
                        emailTratado,
                    perfil: "",
                });
            }
            catch (error) {
                setErro(
                    error?.message ||
                    "Não foi possível entrar no sistema. Tente novamente."
                );
            }
            finally {
                setCarregando(false);
            }
        };

    const solicitarRecuperacaoSenha =
        async () => {
            setErro("");
            setMensagem("");

            const emailTratado =
                String(email || "")
                    .trim()
                    .toLowerCase();

            if (!emailTratado) {
                setErro(
                    "Informe o e-mail cadastrado antes de solicitar a recuperação de senha."
                );

                return;
            }

            setCarregandoSolicitacaoSenha(
                true
            );

            try {
                const solicitacao =
                    await registrarSolicitacaoRecuperacaoSenhaLoginService({
                        supabase,
                        email: emailTratado,
                    });

                const protocolo =
                    solicitacao?.id
                        ? ` Protocolo: ${solicitacao.id}.`
                        : "";

                setMensagem(
                    `Solicitação de recuperação de senha enviada para Acessos do App.${protocolo} Aguarde o administrador redefinir uma senha temporária.`
                );
            }
            catch (error) {
                setErro(
                    error?.message ||
                    "Não foi possível registrar a solicitação de recuperação de senha."
                );
            }
            finally {
                setCarregandoSolicitacaoSenha(
                    false
                );
            }
        };

    const loginBloqueado =
        carregando ||
        carregandoSolicitacaoSenha ||
        !String(email || "").trim() ||
        !senha;

    return (
        <div className="relative min-h-screen overflow-hidden bg-slate-950">
            <style>
                {`
                    .login-input-base:-webkit-autofill,
                    .login-input-base:-webkit-autofill:hover,
                    .login-input-base:-webkit-autofill:focus,
                    .login-input-base:-webkit-autofill:active {
                        -webkit-box-shadow: 0 0 0 1000px transparent inset !important;
                          box-shadow: 0 0 0 1000px transparent inset !important;
                          background-color: transparent !important;
                          background-image: none !important;
                          -webkit-background-clip: text !important;
                          background-clip: text !important;
                        -webkit-text-fill-color: #e2e8f0 !important;
                        caret-color: #ffffff !important;
                        border-radius: 0 !important;
                        transition: background-color 9999s ease-in-out 0s;
                    }

                    .login-password-input {
                        border-color: transparent !important;
                        background-color: transparent !important;
                        box-shadow: none !important;
                        color: #e2e8f0 !important;
                    }

                    .login-email-field:focus-within,
                    .login-password-field:focus-within {
                        outline: none !important;
                        border-color: rgba(52,211,153,0.40) !important;
                        background-color: rgba(255,255,255,0.05) !important;
                        box-shadow: 0 0 0 2px rgba(52,211,153,0.10) !important;
                    }

                    .login-password-input:focus,
                    .login-password-input:focus-visible {
                        outline: none !important;
                        border-color: transparent !important;
                        box-shadow: none !important;
                    }
                `}
            </style>

            <div
                className="absolute inset-0 bg-slate-950 bg-cover bg-center"
                style={
                    montarEstiloFundoLogin(
                        fundoLoginUrl,
                        ajusteFundoLogin
                    )
                }
            />

            <div className="pointer-events-none absolute inset-0 bg-slate-950/5" />

            <main className="relative z-10 flex min-h-screen items-center justify-center px-4 py-5 sm:px-6 lg:px-8">
                <div className="w-full max-w-[720px] overflow-hidden rounded-[1.2rem] border border-white/10 bg-slate-950/72 shadow-xl shadow-black/35 backdrop-blur-[2px]">
                    <div className="grid lg:min-h-[360px] lg:grid-cols-[70%_30%]">
                        <section className="flex items-center bg-slate-950/72 px-4 py-4 sm:px-4 sm:py-5 lg:px-5">
                            <div className="mx-auto w-full max-w-[352px]">


                                <div className="mb-3">

                                    <h1 className="text-[1.45rem] font-semibold leading-tight tracking-tight text-white">
                                        Bem-vindo de volta
                                    </h1>

                                    <p className="mt-1 max-w-sm text-[12px] font-normal leading-[1.15rem] text-slate-300/70">
                                        Entre com suas credenciais para acessar o sistema de gestão.
                                    </p>
                                </div>

                                <form
                                    className="space-y-2.5"
                                    onSubmit={fazerLogin}
                                >
                                    <div className="space-y-2">
                                        <label className="block text-xs font-medium text-slate-200/85">
                                            E-mail
                                        </label>

                                        <div className="login-email-field flex items-center gap-2.5 rounded-lg border border-white/10 bg-white/[0.035] px-3.5 py-2.5 transition">
                                            <Mail className="h-4 w-4 shrink-0 text-slate-500" />

                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(event) => {
                                                    setEmail(
                                                        event.target.value
                                                    );

                                                    setErro("");
                                                    setMensagem("");
                                                }}
                                                placeholder="Digite seu e-mail"
                                                autoComplete="email"
                                                className="login-input-base w-full bg-transparent text-[13px] font-medium text-slate-100 outline-none placeholder:text-slate-500/80"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="block text-xs font-medium text-slate-200/85">
                                            Senha
                                        </label>

                                        <PasswordInput
                                            value={senha}
                                            onChange={(event) => {
                                                setSenha(
                                                    event.target.value
                                                );

                                                setErro("");
                                                setMensagem("");
                                            }}
                                            placeholder="Digite sua senha"
                                            autoComplete="current-password"
                                            className="login-password-field rounded-lg border border-white/10 bg-white/[0.035] transition"
                                            inputClassName="login-input-base login-password-input !rounded-lg !border-transparent !bg-transparent !py-2.5 text-[13px] font-medium text-slate-100 placeholder:text-slate-500/80"
                                        />
                                    </div>

                                    <div className={mostrarEsqueciSenha ? "flex justify-end" : "hidden"}>
                                        <button
                                            type="button"
                                            onClick={solicitarRecuperacaoSenha}
                                            disabled={
                                                carregandoSolicitacaoSenha ||
                                                carregando
                                            }
                                            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-300/60 transition hover:text-emerald-200 disabled:cursor-not-allowed disabled:opacity-40"
                                        >
                                            {
                                                carregandoSolicitacaoSenha
                                                    ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    )
                                                    : (
                                                        <ClipboardList className="h-4 w-4" />
                                                    )
                                            }

                                            {
                                                carregandoSolicitacaoSenha
                                                    ? "Enviando solicitação..."
                                                    : "Esqueci minha senha"
                                            }
                                        </button>
                                    </div>

                                    {
                                        erro && (
                                            <div
                                                className="whitespace-pre-line rounded-lg border border-red-400/15 bg-red-400/[0.07] px-3 py-2.5 text-[11px] font-medium leading-[1rem] text-red-100/85"
                                                role="alert"
                                            >
                                                {erro}
                                            </div>
                                        )
                                    }

                                    {
                                        mensagem && (
                                            <div
                                                className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3.5 text-sm font-semibold leading-relaxed text-emerald-200"
                                                role="status"
                                            >
                                                {mensagem}
                                            </div>
                                        )
                                    }

                                    <button
                                        type="submit"
                                        disabled={loginBloqueado}
                                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-950/20 transition hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20 disabled:cursor-not-allowed disabled:bg-white/[0.07] disabled:text-white/30 disabled:shadow-none"
                                    >
                                        {
                                            carregando
                                                ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                )
                                                : (
                                                    <LogIn className="h-4 w-4" />
                                                )
                                        }

                                        {
                                            carregando
                                                ? "Validando acesso..."
                                                : "Entrar no sistema"
                                        }
                                    </button>
                                </form>

                                <div className="mt-3 border-t border-white/[0.07] pt-2.5">
                                    <p className="text-center text-[9px] font-normal leading-4 text-slate-300/45">
                                        Acesso protegido. Solicitações de recuperação de senha são encaminhadas ao administrador do sistema.
                                    </p>
                                </div>
                            </div>
                        </section>

                        <aside className="relative hidden overflow-hidden border-l border-white/10 bg-gradient-to-br from-emerald-950/70 via-emerald-900/62 to-slate-950/68 lg:flex lg:items-center lg:justify-center">
                            <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-emerald-300/10 blur-3xl" />
                            <div className="pointer-events-none absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-teal-200/10 blur-3xl" />

                            <div className="relative z-10 flex w-full max-w-[150px] flex-col items-center px-3 text-center">
                                <div className="mt-1 flex flex-col items-center gap-3">
                                    <div className="flex flex-col items-center gap-1.5">
                                        <span className="whitespace-nowrap text-[8px] font-semibold uppercase tracking-[0.1em] text-emerald-100/60">
                                            Sistema
                                        </span>

                                        <div className="flex h-[100px] w-[132px] items-center justify-center overflow-visible bg-transparent p-0">
                                            <img
                                                src="/brand/safescan-brasil-login.png"
                                                alt="SafeScan Brasil"
                                                className="max-h-[96px] max-w-[128px] object-contain"
                                            />
                                        </div>
                                    </div>

                                    <div className="h-px w-12 bg-white/10" />

                                    <div className="flex flex-col items-center gap-1.5">
                                        <span className="whitespace-nowrap text-[8px] font-semibold uppercase tracking-[0.1em] text-emerald-100/60">
                                            Contratante
                                        </span>

                                        <div className="flex h-[100px] w-[132px] items-center justify-center overflow-visible bg-transparent p-0">
                                            <LogoContratanteLogin />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </aside>
                    </div>
                </div>
            </main>
        </div>
    );
}