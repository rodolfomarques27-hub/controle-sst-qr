import { CheckCircle2, ClipboardCheck } from "lucide-react";
import { formatDate, classNames } from "../../utils/sstUtils";

export function PreviaNotificacaoAuditoriaCampo({
    auditoria = {},
    notificacao = {},
    observacoesStatus = {},
    alvoAuditoria = {},
    preview = "",
}) {
    const titulo = notificacao.titulo || auditoria.numeroAuditoria || "Auditoria de campo";
    const statusAtual = observacoesStatus.status || auditoria.statusDesvio || auditoria.statusAuditoria || "Aberto";
    const dataAuditoria = auditoria.createdAt || auditoria.created_at || auditoria.dataAuditoria || auditoria.data_auditoria || "";
    const textoPreview = preview || notificacao.mensagem || "Prévia indisponível.";

    const observacoes = [
        { rotulo: "Aberto", valor: observacoesStatus.observacaoAberto },
        { rotulo: "Em tratativa", valor: observacoesStatus.observacaoTratativa },
        { rotulo: "Corrigido", valor: observacoesStatus.observacaoCorrigido },
    ].filter((item) => String(item.valor || "").trim());

    return (
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Prévia da notificação</p>
                    <h3 className="mt-1 text-base font-black text-slate-950">{titulo}</h3>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                        {alvoAuditoria.tipo || "Auditoria"} · {alvoAuditoria.titulo || auditoria.titulo || "Alvo não informado"}
                    </p>
                </div>

                <span
                    className={classNames(
                        "inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs font-black ring-1",
                        statusAtual === "Corrigido"
                            ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                            : statusAtual === "Em tratativa"
                                ? "bg-blue-50 text-blue-700 ring-blue-200"
                                : "bg-orange-50 text-orange-700 ring-orange-200"
                    )}
                >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {statusAtual}
                </span>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Número</p>
                    <p className="mt-1 text-sm font-black text-slate-900">{auditoria.numeroAuditoria || "Sem número"}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Data</p>
                    <p className="mt-1 text-sm font-black text-slate-900">{dataAuditoria ? formatDate(dataAuditoria) : "Sem data"}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Auditor</p>
                    <p className="mt-1 text-sm font-black text-slate-900">{notificacao.auditor || auditoria.auditorNome || "Não informado"}</p>
                </div>
            </div>

            <div className="mt-4 rounded-2xl bg-slate-950 p-4 text-white">
                <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-slate-300">
                    <ClipboardCheck className="h-4 w-4" />
                    Mensagem
                </div>
                <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-slate-100">{textoPreview}</pre>
            </div>

            {observacoes.length > 0 && (
                <div className="mt-4 space-y-2">
                    {observacoes.map((item) => (
                        <div key={item.rotulo} className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
                            <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Observação · {item.rotulo}</p>
                            <p className="mt-1 whitespace-pre-wrap break-words text-sm font-semibold text-slate-700">{item.valor}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
