import { Component } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export class AppErrorBoundary extends Component {
    state = { hasError: false };

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error, info) {
        console.error("Erro não tratado na interface SafeScan Brasil:", error, info);
    }

    recarregarPagina = () => {
        if (typeof window !== "undefined") {
            window.location.reload();
        }
    };

    render() {
        if (!this.state.hasError) {
            return this.props.children;
        }

        return (
            <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-8 text-slate-900">
                <section
                    role="alert"
                    className="w-full max-w-lg rounded-[2rem] bg-white p-8 text-center shadow-xl ring-1 ring-slate-200"
                >
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-orange-50 text-orange-600 ring-1 ring-orange-100">
                        <AlertTriangle className="h-8 w-8" />
                    </div>

                    <div className="mt-5 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-emerald-700">
                        <img
                            src="/favicon.png?v=1050"
                            alt="SafeScan Brasil"
                            className="h-4 w-4 object-contain"
                        />
                        SafeScan Brasil
                    </div>

                    <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-950">
                        Não foi possível carregar esta área
                    </h1>
                    <p className="mx-auto mt-3 max-w-md text-sm font-medium leading-6 text-slate-500">
                        Atualize a tela para tentar novamente. Seus dados continuam protegidos e nenhuma alteração foi confirmada nesta etapa.
                    </p>

                    <button
                        type="button"
                        onClick={this.recarregarPagina}
                        className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Tentar novamente
                    </button>
                </section>
            </main>
        );
    }
}
