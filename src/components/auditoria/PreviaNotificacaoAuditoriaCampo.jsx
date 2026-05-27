import React from "react";
import { CheckCircle2, FileText } from "lucide-react";
import { classNames } from "../../utils/sstUtils";

export function PreviaNotificacaoAuditoriaCampo({ auditoria = {}, notificacao = {}, observacoesStatus = {}, alvoAuditoria = {}, preview = "" }) {
    const complementos = Array.isArray(notificacao.complementos) ? notificacao.complementos.filter(Boolean) : [];
    const numero = auditoria.numeroAuditoria || "Sem número";
    const risco = auditoria.grauRisco || "Não informado";
    const resultado = auditoria.classificacao || "Sem classificação";
    const pontuacao = Number.isFinite(Number(auditoria.pontuacao)) ? `${auditoria.pontuacao}%` : "0%";
    const status = observacoesStatus.status || auditoria.statusDesvio || auditoria.status || "Aberto";
    const auditor = notificacao.auditor || auditoria.auditorNome || "Não informado";
    const alvo = alvoAuditoria.titulo || auditoria.maquinaEquipamento || auditoria.area || auditoria.local || auditoria.nomeColaborador || "Não informado";
    const tipoAlvo = alvoAuditoria.tipo || auditoria.tipoAuditoria || "Auditoria";
    const mensagem = notificacao.mensagem || preview || "Preencha a mensagem da notificação para visualizar.";
    const riscoClasse = String(risco).toLowerCase().includes("cr")
        ? "bg-red-50 text-red-700 ring-red-200"
        : String(risco).toLowerCase().includes("alto")
            ? "bg-orange-50 text-orange-700 ring-orange-200"
            : String(risco).toLowerCase().includes("m")
                ? "bg-amber-50 text-amber-700 ring-amber-200"
                : "bg-emerald-50 text-emerald-700 ring-emerald-200";
    const statusClasse = String(status).toLowerCase().includes("corrig") || String(status).toLowerCase().includes("resol")
        ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
        : String(status).toLowerCase().includes("tratativa") || String(status).toLowerCase().includes("andamento")
            ? "bg-orange-50 text-orange-700 ring-orange-200"
            : "bg-blue-50 text-blue-700 ring-blue-200";

    return (
        <div className="mt-3 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-blue-50 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-600">Prévia para envio</p>
                        <h4 className="mt-1 break-words text-base font-black text-slate-950">
                            {notificacao.titulo || "Auditoria de campo"}
                        </h4>
                        <p className="mt-1 text-xs leading-relaxed text-slate-500">
                            Confira o resumo antes de encaminhar ao responsável pela tratativa.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <span className="inline-flex items-center rounded-full bg-slate-950 px-3 py-1.5 text-xs font-black text-white">
                            {numero}
                        </span>
                        <span className={classNames("inline-flex items-center rounded-full px-3 py-1.5 text-xs font-black ring-1", riscoClasse)}>
                            Risco: {risco}
                        </span>
                        <span className={classNames("inline-flex items-center rounded-full px-3 py-1.5 text-xs font-black ring-1", statusClasse)}>
                            {status}
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid gap-3 p-4 md:grid-cols-4">
                <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
                    <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Alvo auditado</p>
                    <p className="mt-1 text-sm font-bold text-slate-900">{tipoAlvo}</p>
                    <p className="mt-1 truncate text-xs text-slate-500" title={alvo}>{alvo}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
                    <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Auditor</p>
                    <p className="mt-1 truncate text-sm font-bold text-slate-900" title={auditor}>{auditor}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
                    <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Resultado</p>
                    <p className="mt-1 text-sm font-bold text-slate-900">{resultado}</p>
                    <p className="mt-1 text-xs text-slate-500">Pontuação: {pontuacao}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
                    <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Responsável</p>
                    <p className="mt-1 truncate text-sm font-bold text-slate-900" title={auditoria.responsavelTratativa || "Não informado"}>
                        {auditoria.responsavelTratativa || "Não informado"}
                    </p>
                </div>
            </div>

            <div className="grid gap-3 px-4 pb-4 lg:grid-cols-[1.4fr_0.8fr]">
                <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
                    <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-600" />
                        <p className="text-xs font-black uppercase tracking-wide text-blue-700">Mensagem da notificação</p>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-800">
                        {mensagem}
                    </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <p className="text-xs font-black uppercase tracking-wide text-slate-500">Complementos</p>
                    </div>
                    {complementos.length > 0 ? (
                        <div className="mt-3 space-y-2">
                            {complementos.map((item, index) => (
                                <div key={`${item}-${index}`} className="rounded-2xl bg-slate-50 px-3 py-2 text-xs font-semibold leading-relaxed text-slate-700 ring-1 ring-slate-100">
                                    <span className="font-black text-slate-950">{index + 1}.</span> {item}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="mt-3 rounded-2xl bg-slate-50 px-3 py-2 text-xs text-slate-500 ring-1 ring-slate-100">
                            Nenhum complemento adicionado.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

export default PreviaNotificacaoAuditoriaCampo;
