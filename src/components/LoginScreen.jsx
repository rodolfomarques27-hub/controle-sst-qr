import React, { useState } from "react";
import { LogIn, ShieldCheck } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { PasswordInput } from "./commonComponents";

export function LoginScreen({ onLogin }) {
    const [email, setEmail] = useState("sst@empresa.com");
    const [senha, setSenha] = useState("");
    const [carregando, setCarregando] = useState(false);
    const [erro, setErro] = useState("");

    const fazerLogin = async () => {
        setErro("");

        if (!email || !senha) {
            setErro("Preencha o e-mail e a senha.");
            return;
        }

        setCarregando(true);

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password: senha,
        });

        setCarregando(false);

        if (error) {
            setErro("E-mail ou senha incorretos.");
            return;
        }

        onLogin({
            id: data.user.id,
            email: data.user.email,
            perfil: "",
        });
    };

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

                <div className="space-y-3">
                    <label className="block text-sm font-medium text-slate-700">E-mail</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Digite seu e-mail"
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                    />

                    <label className="block text-sm font-medium text-slate-700">Senha</label>
                    <PasswordInput
                        value={senha}
                        onChange={(e) => setSenha(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") fazerLogin();
                        }}
                        placeholder="Digite sua senha"
                        autoComplete="current-password"
                        inputClassName="focus:ring-2 focus:ring-slate-300"
                    />

                    {erro && (
                        <div className="rounded-2xl bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200">
                            {erro}
                        </div>
                    )}
                </div>

                <button
                    type="button"
                    onClick={fazerLogin}
                    disabled={carregando}
                    className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                    <LogIn className="h-4 w-4" />
                    {carregando ? "Entrando..." : "Entrar no sistema"}
                </button>

                <p className="mt-4 rounded-2xl bg-slate-50 p-3 text-xs text-slate-500">
                    O acesso é validado pelo Supabase. O perfil e as permissões são carregados automaticamente pelo sistema.
                </p>
            </div>
        </div>
    );
}
