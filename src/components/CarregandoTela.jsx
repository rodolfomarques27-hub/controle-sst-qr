import React from "react";
import { RefreshCw, ShieldCheck } from "lucide-react";

export function CarregandoTela({
    mensagem = "Carregando tela...",
    subtitulo = "Preparando as informações do sistema.",
    telaCheia = false,
}) {
    const conteudo = (
        <div className="relative overflow-hidden rounded-[2rem] bg-slate-950 px-6 py-6 text-white shadow-xl ring-1 ring-white/10">
            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-blue-500/20 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-12 -left-12 h-36 w-36 rounded-full bg-cyan-400/10 blur-2xl" />

            <div className="relative flex items-center gap-4">
                <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
                    <ShieldCheck className="h-6 w-6 text-cyan-200" />
                </div>

                <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-100/80">
                        Controle SST QR
                    </p>
                    <h2 className="mt-1 text-base font-black text-white">
                        {mensagem}
                    </h2>
                    <p className="mt-1 text-xs font-medium leading-5 text-slate-300">
                        {subtitulo}
                    </p>
                </div>

                <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15 sm:flex">
                    <RefreshCw className="h-5 w-5 animate-spin text-cyan-100" />
                </div>
            </div>

            <div className="relative mt-5 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-2/5 animate-pulse rounded-full bg-cyan-200/80" />
            </div>
        </div>
    );

    if (telaCheia) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-8 text-slate-900">
                <div className="w-full max-w-md">{conteudo}</div>
            </div>
        );
    }

    return (
        <div className="flex min-h-[420px] items-center justify-center rounded-[2rem] bg-gradient-to-br from-slate-100 via-white to-slate-100 p-4 text-slate-900 ring-1 ring-slate-200/70">
            <div className="w-full max-w-md">{conteudo}</div>
        </div>
    );
}
