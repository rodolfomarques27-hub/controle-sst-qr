import { RefreshCw } from "lucide-react";

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
                    <img
                        src="/favicon.png?v=1050"
                        alt="SafeScan Brasil"
                        className="h-9 w-9 object-contain"
                    />
                </div>

                <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-100/80">
                        SafeScan Brasil
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
        <div className="flex min-h-[calc(100vh-8rem)] w-full items-center justify-center bg-transparent p-4 text-slate-900">
            <div className="w-full max-w-md">{conteudo}</div>
        </div>
    );
}
