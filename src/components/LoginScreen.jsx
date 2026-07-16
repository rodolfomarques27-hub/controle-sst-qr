import React, { useEffect, useState } from "react";
import { ClipboardList, Loader2, LogIn, Mail, ShieldCheck } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { PasswordInput } from "./commonComponents";
import { registrarSolicitacaoRecuperacaoSenhaLoginService } from "../services/acessosAppService";

const BUCKET_FUNDO_LOGIN = "logos-empresas";
const CAMINHO_FUNDO_LOGIN = "configuracoes/login/fundo-login.jpg";
const CAMINHO_CONFIG_FUNDO_LOGIN = "configuracoes/login/fundo-login-config.json";

const AJUSTE_FUNDO_LOGIN_PADRAO = {
    size: "cover",
    position: "center center",
    overlay: 0.62,
};

function normalizarAjusteFundoLogin(valor = {}) {
    const overlayNumerico = Number(valor?.overlay);

    return {
        size: String(valor?.size || AJUSTE_FUNDO_LOGIN_PADRAO.size),
        position: String(valor?.position || AJUSTE_FUNDO_LOGIN_PADRAO.position),
        overlay: Number.isFinite(overlayNumerico)
            ? Math.min(0.82, Math.max(0.28, overlayNumerico))
            : AJUSTE_FUNDO_LOGIN_PADRAO.overlay,
    };
}

function montarUrlPublicaFundoLogin(caminho) {
    try {
        const { data } = supabase.storage.from(BUCKET_FUNDO_LOGIN).getPublicUrl(caminho);
        const url = data?.publicUrl || "";

        if (!url) return "";

        return `${url}?v=${Date.now()}`;
    } catch {
        return "";
    }
}

function montarUrlFundoLoginPersonalizado() {
    return montarUrlPublicaFundoLogin(CAMINHO_FUNDO_LOGIN);
}

function montarUrlConfigFundoLoginPersonalizado() {
    return montarUrlPublicaFundoLogin(CAMINHO_CONFIG_FUNDO_LOGIN);
}

function montarEstiloFundoLogin(url, ajuste = AJUSTE_FUNDO_LOGIN_PADRAO) {
    if (!url) return undefined;

    const ajusteFinal = normalizarAjusteFundoLogin(ajuste);
    const overlayPrincipal = ajusteFinal.overlay;
    const overlaySecundario = Math.max(0.34, overlayPrincipal - 0.12);

    return {
        backgroundImage: `linear-gradient(135deg, rgba(2, 6, 23, ${overlayPrincipal}), rgba(15, 23, 42, ${overlaySecundario})), url("${url}")`,
        backgroundSize: ajusteFinal.size,
        backgroundPosition: ajusteFinal.position,
        backgroundRepeat: "no-repeat",
    };
}

export function LoginScreen({ onLogin }) {
    const [email, setEmail] = useState("");
    const [senha, setSenha] = useState("");
    const [carregando, setCarregando] = useState(false);
    const [carregandoSolicitacaoSenha, setCarregandoSolicitacaoSenha] = useState(false);
    const [erro, setErro] = useState("");
    const [mensagem, setMensagem] = useState("");
    const [fundoLoginUrl, setFundoLoginUrl] = useState("");
    const [ajusteFundoLogin, setAjusteFundoLogin] = useState(() => AJUSTE_FUNDO_LOGIN_PADRAO);

    useEffect(() => {
        const url = montarUrlFundoLoginPersonalizado();

        if (!url) return;

        let cancelado = false;
        const imagem = new Image();

        async function carregarAjuste() {
            const urlConfig = montarUrlConfigFundoLoginPersonalizado();

            if (!urlConfig) return;

            try {
                const resposta = await fetch(urlConfig, { cache: "no-store" });
                if (!resposta.ok) return;

                const dados = await resposta.json();
                if (!cancelado) setAjusteFundoLogin(normalizarAjusteFundoLogin(dados));
            } catch {
                if (!cancelado) setAjusteFundoLogin(AJUSTE_FUNDO_LOGIN_PADRAO);
            }
        }

        imagem.onload = () => {
            if (!cancelado) setFundoLoginUrl(url);
        };

        imagem.onerror = () => {
            if (!cancelado) setFundoLoginUrl("");
        };

        imagem.src = url;
        carregarAjuste();

        return () => {
            cancelado = true;
        };
    }, []);

    const fazerLogin = async (event) => {
        event?.preventDefault?.();
        setErro("");
        setMensagem("");

        const emailTratado = String(email || "").trim().toLowerCase();

        if (!emailTratado || !senha) {
            setErro("Informe o e-mail e a senha para acessar o sistema.");
            return;
        }

        setCarregando(true);

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: emailTratado,
                password: senha,
            });

            if (error) {
                setErro("Não foi possível entrar. Confira o e-mail, a senha ou solicite liberação ao administrador.");
                return;
            }

            if (!data?.user?.id) {
                setErro("Login autenticado sem identificação do usuário. Tente novamente.");
                return;
            }

            onLogin({
                id: data.user.id,
                email: data.user.email || emailTratado,
                perfil: "",
            });
        } catch (error) {
            setErro(error?.message || "Não foi possível entrar no sistema. Tente novamente.");
        } finally {
            setCarregando(false);
        }
    };

    const solicitarRecuperacaoSenha = async () => {
        setErro("");
        setMensagem("");

        const emailTratado = String(email || "").trim().toLowerCase();

        if (!emailTratado) {
            setErro("Informe o e-mail cadastrado antes de solicitar a recuperação de senha.");
            return;
        }

        setCarregandoSolicitacaoSenha(true);

        try {
            const solicitacao = await registrarSolicitacaoRecuperacaoSenhaLoginService({
                supabase,
                email: emailTratado,
            });

            const protocolo = solicitacao?.id ? ` Protocolo: ${solicitacao.id}.` : "";
            setMensagem(`Solicitação de recuperação de senha enviada para Acessos do App.${protocolo} Aguarde o administrador redefinir uma senha temporária.`);
        } catch (error) {
            setErro(error?.message || "Não foi possível registrar a solicitação de recuperação de senha.");
        } finally {
            setCarregandoSolicitacaoSenha(false);
        }
    };

    const loginBloqueado = carregando || carregandoSolicitacaoSenha || !String(email || "").trim() || !senha;

    return (
        <div
            className="flex min-h-screen items-center justify-center bg-slate-950 bg-cover bg-center p-4"
            style={montarEstiloFundoLogin(fundoLoginUrl, ajusteFundoLogin)}
        >
            <div className="w-full max-w-md rounded-[2rem] bg-white p-8 shadow-2xl">
                <div className="mb-6 flex items-center gap-3">
                    <div className="rounded-3xl bg-slate-950 p-4 text-white">
                        <ShieldCheck className="h-7 w-7" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-950">SafeScan Brasil</h1>
                        <p className="text-sm text-slate-500">Acesso restrito ao sistema</p>
                    </div>
                </div>

                <form className="space-y-4" onSubmit={fazerLogin}>
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-700">E-mail</label>
                        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 focus-within:ring-2 focus-within:ring-slate-300">
                            <Mail className="h-4 w-4 text-slate-400" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    setErro("");
                                    setMensagem("");
                                }}
                                placeholder="Digite seu e-mail"
                                autoComplete="email"
                                className="w-full bg-transparent text-sm outline-none"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-700">Senha</label>
                        <PasswordInput
                            value={senha}
                            onChange={(e) => {
                                setSenha(e.target.value);
                                setErro("");
                                setMensagem("");
                            }}
                            placeholder="Digite sua senha"
                            autoComplete="current-password"
                            inputClassName="focus:ring-2 focus:ring-slate-300"
                        />
                    </div>

                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={solicitarRecuperacaoSenha}
                            disabled={carregandoSolicitacaoSenha || carregando}
                            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {carregandoSolicitacaoSenha ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardList className="h-4 w-4" />}
                            {carregandoSolicitacaoSenha ? "Enviando solicitação..." : "Esqueci minha senha"}
                        </button>
                    </div>

                    {erro && (
                        <div className="rounded-2xl bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200">
                            {erro}
                        </div>
                    )}

                    {mensagem && (
                        <div className="rounded-2xl bg-emerald-50 p-3 text-sm font-medium text-emerald-700 ring-1 ring-emerald-200">
                            {mensagem}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loginBloqueado}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {carregando ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                        {carregando ? "Validando acesso..." : "Entrar no sistema"}
                    </button>
                </form>

                <div className="mt-4 rounded-2xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-500">
                    O acesso é validado pelo Supabase. Solicitações de senha são analisadas pelo administrador em Acessos do App.
                </div>
            </div>
        </div>
    );
}
