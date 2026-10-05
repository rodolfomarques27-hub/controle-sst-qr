import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, CircleAlert, Info, X } from "lucide-react";
import { EVENTO_FEEDBACK_SAFESCAN } from "../../services/safeScanFeedbackService.js";

const CONFIGURACAO_FEEDBACK = Object.freeze({
    sucesso: {
        titulo: "Operação concluída",
        Icone: CheckCircle2,
        borda: "border-emerald-200",
        icone: "bg-emerald-50 text-emerald-700 ring-emerald-100",
        tituloClasse: "text-emerald-950",
    },
    erro: {
        titulo: "Não foi possível concluir",
        Icone: CircleAlert,
        borda: "border-red-200",
        icone: "bg-red-50 text-red-700 ring-red-100",
        tituloClasse: "text-red-950",
    },
    atencao: {
        titulo: "Atenção",
        Icone: AlertTriangle,
        borda: "border-amber-200",
        icone: "bg-amber-50 text-amber-700 ring-amber-100",
        tituloClasse: "text-amber-950",
    },
    informacao: {
        titulo: "Informação",
        Icone: Info,
        borda: "border-blue-200",
        icone: "bg-blue-50 text-blue-700 ring-blue-100",
        tituloClasse: "text-blue-950",
    },
});

let sequenciaFeedback = 0;

function duracaoPadrao(tipo) {
    return tipo === "erro" ? 7000 : 5200;
}

export function SafeScanFeedbackHost() {
    const [feedbacks, setFeedbacks] = useState([]);

    useEffect(() => {
        const timers = new Set();

        function remover(id) {
            setFeedbacks((atuais) => atuais.filter((item) => item.id !== id));
        }

        function receberFeedback(event) {
            const detail = event?.detail && typeof event.detail === "object" ? event.detail : {};
            const mensagem = String(detail.mensagem ?? "").trim();

            if (!mensagem) return;

            const tipo = CONFIGURACAO_FEEDBACK[detail.tipo] ? detail.tipo : "informacao";
            const id = ++sequenciaFeedback;
            const duracao = Number.isFinite(Number(detail.duracaoMs))
                ? Math.max(0, Number(detail.duracaoMs))
                : duracaoPadrao(tipo);

            setFeedbacks((atuais) => [
                ...atuais.slice(-3),
                {
                    id,
                    tipo,
                    titulo: String(detail.titulo ?? "").trim(),
                    mensagem,
                },
            ]);

            if (duracao > 0) {
                const timer = globalThis.setTimeout(() => {
                    remover(id);
                    timers.delete(timer);
                }, duracao);

                timers.add(timer);
            }
        }

        globalThis.addEventListener(EVENTO_FEEDBACK_SAFESCAN, receberFeedback);

        return () => {
            globalThis.removeEventListener(EVENTO_FEEDBACK_SAFESCAN, receberFeedback);
            timers.forEach((timer) => globalThis.clearTimeout(timer));
        };
    }, []);

    const removerFeedback = (id) => {
        setFeedbacks((atuais) => atuais.filter((item) => item.id !== id));
    };

    if (!feedbacks.length) return null;

    return (
        <div
            aria-live="polite"
            aria-relevant="additions"
            className="pointer-events-none fixed right-4 top-4 z-[300] flex w-[min(420px,calc(100vw-2rem))] flex-col gap-3 sm:right-6 sm:top-6"
        >
            {feedbacks.map((item) => {
                const configuracao = CONFIGURACAO_FEEDBACK[item.tipo];
                const Icone = configuracao.Icone;

                return (
                    <div
                        key={item.id}
                        role={item.tipo === "erro" || item.tipo === "atencao" ? "alert" : "status"}
                        aria-atomic="true"
                        className={"pointer-events-auto w-full overflow-hidden rounded-2xl border bg-white shadow-[0_18px_48px_rgba(15,23,42,0.18)] " + configuracao.borda}
                    >
                        <div className="flex items-start gap-3 p-4">
                            <div
                                className={"flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 " + configuracao.icone}
                            >
                                <Icone className="h-5 w-5" />
                            </div>

                            <div className="min-w-0 flex-1">
                                <p className={"text-sm font-bold " + configuracao.tituloClasse}>
                                    {item.titulo || configuracao.titulo}
                                </p>

                                <p className="mt-1 whitespace-pre-line text-sm leading-5 text-slate-600">
                                    {item.mensagem}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => removerFeedback(item.id)}
                                aria-label="Fechar aviso"
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-4 focus:ring-slate-100"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
