import { useEffect, useMemo, useState } from "react";
import { CalendarClock, FileText, X } from "lucide-react";
import resumoDashboardHero from "../../assets/nova-auditoria-hero-bg.webp";
import { DashboardStorageResumoConteudo } from "./DashboardStorageResumoConteudo";

function classeStatusResumoDashboard(status = "") {
    const texto = String(status).trim().toLowerCase();

    if (texto === "liberado" || texto === "ativa" || texto === "sem pendência" || texto === "normal") {
        return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    }

    if (texto.includes("a vencer") || texto.includes("atenção")) {
        return "bg-amber-50 text-amber-700 ring-amber-200";
    }

    if (texto.includes("bloqueado") || texto.includes("vencido")) {
        return "bg-red-50 text-red-700 ring-red-200";
    }

    if (texto.includes("pendência")) {
        return "bg-orange-50 text-orange-700 ring-orange-200";
    }

    if (texto.includes("análise")) {
        return "bg-violet-50 text-violet-700 ring-violet-200";
    }

    return "bg-white text-slate-700 ring-slate-200";
}

export function DashboardCartaResumoModal({
    resumo = null,
    onClose,
}) {
    const [ordem, setOrdem] = useState("az");

    useEffect(() => {
        if (!resumo || typeof window === "undefined") return undefined;

        const fecharComEscape = (evento) => {
            if (evento.key === "Escape") {
                onClose?.();
            }
        };

        window.addEventListener("keydown", fecharComEscape);

        return () => {
            window.removeEventListener("keydown", fecharComEscape);
        };
    }, [resumo, onClose]);

    const itens = useMemo(
        () => Array.isArray(resumo?.itens) ? resumo.itens : [],
        [resumo]
    );
    const permiteOrdenacao = resumo?.permiteOrdenacao !== false;
    const itensOrdenados = useMemo(() => {
        if (!permiteOrdenacao) return itens;

        const lista = [...itens];

        lista.sort((itemA, itemB) => {
            const nomeA = String(itemA.principal || itemA.titulo || "");
            const nomeB = String(itemB.principal || itemB.titulo || "");
            const comparacao = nomeA.localeCompare(nomeB, "pt-BR", {
                sensitivity: "base",
                numeric: true,
            });

            return ordem === "za" ? -comparacao : comparacao;
        });

        return lista;
    }, [itens, ordem, permiteOrdenacao]);

    if (!resumo) return null;

    return (
        <div
            className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
            role="presentation"
            onMouseDown={(evento) => {
                if (evento.target === evento.currentTarget) {
                    onClose?.();
                }
            }}
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="dashboard-carta-resumo-titulo"
                className="flex min-h-0 max-h-[86vh] w-full max-w-3xl flex-col overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.30)]"
            >
                <header className="relative shrink-0 overflow-hidden border-b border-slate-200 px-5 py-5 text-white">
                    <div
                        className="absolute inset-0 bg-cover bg-center"
                        style={{ backgroundImage: `url(${resumoDashboardHero})` }}
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(15,23,42,0.92)_0%,rgba(15,23,42,0.80)_48%,rgba(15,23,42,0.58)_100%)]" />

                    <div className="relative flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-300">
                                Resumo do Dashboard
                            </p>
                            <h2
                                id="dashboard-carta-resumo-titulo"
                                className="mt-1 text-xl font-black text-white"
                            >
                                {resumo.titulo}
                            </h2>
                            <p className="mt-1 max-w-2xl text-sm font-semibold text-slate-200">
                                {resumo.subtitulo}
                            </p>

                            {permiteOrdenacao && (
                                <label className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-slate-200">
                                    Ordenar
                                    <select
                                        value={ordem}
                                        onChange={(evento) => setOrdem(evento.target.value)}
                                        className="rounded-xl border border-white/25 bg-slate-900/70 px-3 py-1.5 text-xs font-black text-white outline-none focus:ring-2 focus:ring-emerald-300"
                                    >
                                        <option value="az">Nome A–Z</option>
                                        <option value="za">Nome Z–A</option>
                                    </select>
                                </label>
                            )}
                        </div>

                        <div className="flex shrink-0 items-center gap-3">
                            <span className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-black text-white ring-1 ring-white/25 backdrop-blur">
                                {itens.length} item(ns)
                            </span>
                            <button
                                type="button"
                                onClick={onClose}
                                className="grid h-10 w-10 place-items-center rounded-2xl border border-white/25 bg-white/10 text-white backdrop-blur transition hover:bg-white/20"
                                aria-label="Fechar resumo"
                                title="Fechar resumo"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                </header>

                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                    {resumo.chave === "armazenamentoUtilizado" ? (
                        <DashboardStorageResumoConteudo resumo={resumo} />
                    ) : itens.length === 0 ? (
                        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center">
                            <FileText className="mx-auto h-8 w-8 text-slate-400" />
                            <p className="mt-3 font-black text-slate-800">
                                Nenhum item encontrado
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                                O total deste card está zerado para o período atual.
                            </p>
                        </div>
                    ) : (
                        <div className={resumo.layout === "grade" ? "grid gap-3 sm:grid-cols-2" : "space-y-3"}>
                            {itensOrdenados.map((item, indice) => (
                                <article
                                    key={item.id || `${resumo.chave}-${indice}`}
                                    className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4"
                                >
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                        <div className="min-w-0">
                                            <p className="text-sm font-black text-slate-950">
                                                {item.principal}
                                            </p>
                                            <p className="mt-1 text-sm font-semibold text-slate-700">
                                                {item.titulo}
                                            </p>
                                            {item.apoio && (
                                                <p className="mt-1 text-xs text-slate-500">
                                                    {item.apoio}
                                                </p>
                                            )}
                                        </div>

                                        {(item.status || item.alerta) && (
                                            <div className="flex w-fit shrink-0 flex-wrap items-center justify-end gap-2">
                                                {item.status && (
                                                    <span className={`rounded-full px-3 py-1.5 text-xs font-black ring-1 ${classeStatusResumoDashboard(item.status)}`}>
                                                        {item.status}
                                                    </span>
                                                )}
                                                {item.alerta && (
                                                    <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-700 ring-1 ring-amber-200">
                                                        {item.alerta}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {(item.dataValor || item.detalhe) && (
                                        <div className="mt-3 flex flex-col gap-2 border-t border-slate-200 pt-3 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between">
                                            {item.dataValor && (
                                                <span className="inline-flex items-center gap-2 font-bold">
                                                    <CalendarClock className="h-4 w-4" />
                                                    {item.dataRotulo || "Data"}: {item.dataValor}
                                                </span>
                                            )}
                                            {item.detalhe && (
                                                <span className="font-semibold">
                                                    {item.detalhe}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </article>
                            ))}
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
