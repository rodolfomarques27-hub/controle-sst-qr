import React, { useState } from "react";
import { ArrowLeft, KeyRound, Loader2, LogIn, Mail, ShieldCheck } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { PasswordInput } from "./commonComponents";

function obterUrlRedefinicaoSenhaLogin() {
    if (typeof window === "undefined") return undefined;

    const url = new URL(window.location.href);
    url.searchParams.set("redefinir-senha", "1");
    url.hash = "";

    return url.toString();
}

export function LoginScreen({ onLogin, modoRedefinirSenha = false, onSenhaAtualizada = () => { } }) {
    const [email, setEmail] = useState("");
    const [senha, setSenha] = useState("");
    const [novaSenha, setNovaSenha] = useState("");
    const [confirmarNovaSenha, setConfirmarNovaSenha] = useState("");
    const [carregando, setCarregando] = useState(false);
    const [carregandoRecuperacao, setCarregandoRecuperacao] = useState(false);
    const [carregandoNovaSenha, setCarregandoNovaSenha] = useState(false);
    const [erro, setErro] = useState("");
    const [mensagem, setMensagem] = useState("");

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

    const enviarRecuperacaoSenha = async () => {
        setErro("");
        setMensagem("");

        const emailTratado = String(email || "").trim().toLowerCase();

        if (!emailTratado) {
            setErro("Informe o e-mail cadastrado antes de solicitar a recuperação de senha.");
            return;
        }

        setCarregandoRecuperacao(true);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(emailTratado, {
                redirectTo: obterUrlRedefinicaoSenhaLogin(),
            });

            if (error) {
                setErro(error.message || "Não foi possível enviar o e-mail de recuperação.");
                return;
            }

            setMensagem("Enviamos um link de recuperação para o e-mail informado. Verifique a caixa de entrada e o spam.");
        } catch (error) {
            setErro(error?.message || "Não foi possível solicitar a recuperação de senha. Tente novamente.");
        } finally {
            setCarregandoRecuperacao(false);
        }
    };

    const voltarLoginRecuperacao = async () => {
        try {
            await supabase.auth.signOut();
        } catch {
            // Mesmo se o signOut falhar, retorna para o login visual.
        }

        onSenhaAtualizada();
    };

    const atualizarSenhaRecuperada = async (event) => {
        event?.preventDefault?.();
        setErro("");
        setMensagem("");

        const senhaTratada = String(novaSenha || "").trim();
        const confirmacaoTratada = String(confirmarNovaSenha || "").trim();

        if (senhaTratada.length < 6) {
            setErro("A nova senha precisa ter pelo menos 6 caracteres.");
            return;
        }

        if (senhaTratada !== confirmacaoTratada) {
            setErro("A confirmação da nova senha não confere.");
            return;
        }

        setCarregandoNovaSenha(true);

        try {
            const { error } = await supabase.auth.updateUser({ password: senhaTratada });

            if (error) {
                setErro(error.message || "Não foi possível atualizar a senha.");
                return;
            }

            setMensagem("Senha alterada com sucesso. Você já pode entrar com a nova senha.");
            setNovaSenha("");
            setConfirmarNovaSenha("");

            try {
                await supabase.auth.signOut();
            } catch {
                // Se o signOut falhar, ainda assim volta para o login.
            }

            window.setTimeout(() => {
                onSenhaAtualizada();
            }, 900);
        } catch (error) {
            setErro(error?.message || "Não foi possível atualizar a senha. Tente novamente.");
        } finally {
            setCarregandoNovaSenha(false);
        }
    };

    const loginBloqueado = carregando || carregandoRecuperacao || !String(email || "").trim() || !senha;
    const atualizacaoBloqueada = carregandoNovaSenha || !novaSenha || !confirmarNovaSenha;

    if (modoRedefinirSenha) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
                <div className="w-full max-w-md rounded-[2rem] bg-white p-8 shadow-2xl">
                    <div className="mb-6 flex items-center gap-3">
                        <div className="rounded-3xl bg-slate-950 p-4 text-white">
                            <KeyRound className="h-7 w-7" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-950">Redefinir senha</h1>
                            <p className="text-sm text-slate-500">Informe uma nova senha de acesso.</p>
                        </div>
                    </div>

                    <form className="space-y-4" onSubmit={atualizarSenhaRecuperada}>
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-slate-700">Nova senha</label>
                            <PasswordInput
                                value={novaSenha}
                                onChange={(e) => setNovaSenha(e.target.value)}
                                placeholder="Digite a nova senha"
                                autoComplete="new-password"
                                inputClassName="focus:ring-2 focus:ring-slate-300"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-slate-700">Confirmar nova senha</label>
                            <PasswordInput
                                value={confirmarNovaSenha}
                                onChange={(e) => setConfirmarNovaSenha(e.target.value)}
                                placeholder="Confirme a nova senha"
                                autoComplete="new-password"
                                inputClassName="focus:ring-2 focus:ring-slate-300"
                            />
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
                            disabled={atualizacaoBloqueada}
                            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {carregandoNovaSenha ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                            {carregandoNovaSenha ? "Atualizando senha..." : "Salvar nova senha"}
                        </button>

                        <button
                            type="button"
                            onClick={voltarLoginRecuperacao}
                            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Voltar ao login
                        </button>
                    </form>

                    <div className="mt-4 rounded-2xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-500">
                        O link de recuperação é validado pelo Supabase. Após salvar, entre novamente com a nova senha.
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
            <div className="w-full max-w-md rounded-[2rem] bg-white p-8 shadow-2xl">
                <div className="mb-6 flex items-center gap-3">
                    <div className="rounded-3xl bg-slate-950 p-4 text-white">
                        <ShieldCheck className="h-7 w-7" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-950">Controle SST QR</h1>
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
                                onChange={(e) => setEmail(e.target.value)}
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
                            onChange={(e) => setSenha(e.target.value)}
                            placeholder="Digite sua senha"
                            autoComplete="current-password"
                            inputClassName="focus:ring-2 focus:ring-slate-300"
                        />
                    </div>

                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={enviarRecuperacaoSenha}
                            disabled={carregandoRecuperacao}
                            className="text-sm font-semibold text-slate-600 transition hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {carregandoRecuperacao ? "Enviando recuperação..." : "Esqueci minha senha"}
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
                    O acesso é validado pelo Supabase. O perfil e as permissões são carregados automaticamente após o login.
                </div>
            </div>
        </div>
    );
}
