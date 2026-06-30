import React from "react";
import { CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { Card } from "../commonComponents";
import { classNames, formatDate } from "../../utils/sstUtils";

export function AlertasTstTreinamentos({
    alertasTstPorEmpresa = [],
    enviandoAlertaTst = false,
    onEnviarEmailAlertaTstAutomatico,
    onCopiarAvisoAlertaTst,
    recolhido = false,
    onAlternarRecolhido,
}) {
    const totalAlertas = alertasTstPorEmpresa.reduce((total, grupo) => total + grupo.itens.length, 0);

    return (
        <Card className={classNames("self-start treinamentos-alertas-tst-card", recolhido && "treinamentos-alertas-tst-card--recolhido")}>
            <div
                className={classNames(
                    "treinamentos-alertas-tst-card__cabecalho flex flex-col justify-between gap-3 lg:flex-row lg:items-start",
                    !recolhido && "mb-4"
                )}
            >
                <div>
                    <h2 className="text-lg font-bold text-slate-950">Alertas para TST</h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Treinamentos, certificados e ASO vencidos ou com vencimento nos próximos 30 dias.
                    </p>
                </div>

                <div className="flex flex-wrap gap-2 lg:justify-end">
                    {!recolhido && (
                        <span className="w-fit rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700 ring-1 ring-orange-200">
                            {totalAlertas} item(ns) em alerta
                        </span>
                    )}
                    <button
                        type="button"
                        onClick={onAlternarRecolhido}
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                    >
                        {recolhido ? (
                            <>
                                <ChevronDown className="h-3.5 w-3.5" />
                                Abrir
                            </>
                        ) : (
                            <>
                                <ChevronUp className="h-3.5 w-3.5" />
                                Recolher
                            </>
                        )}
                    </button>
                </div>
            </div>

            {recolhido ? null : alertasTstPorEmpresa.length === 0 ? (
                <div className="treinamentos-alertas-tst-card__vazio rounded-3xl border border-dashed border-slate-300 p-6 text-center">
                    <CheckCircle2 className="mx-auto h-9 w-9 text-emerald-500" />
                    <h3 className="mt-3 font-bold text-slate-900">Nenhum documento vencido ou a vencer</h3>
                    <p className="mt-1 text-sm text-slate-500">
                        Quando houver documentos vencidos ou a vencer, o aviso ao TST aparecerá aqui.
                    </p>
                </div>
            ) : (
                <div className="treinamentos-alertas-tst-card__lista space-y-3">
                    {alertasTstPorEmpresa.map((grupo) => (
                        <div key={grupo.empresa} className="treinamentos-alertas-tst-card__grupo rounded-3xl border border-slate-200 bg-white p-4">
                            <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Empresa</p>
                                    <h3 className="mt-1 text-base font-bold text-slate-950">{grupo.empresa}</h3>
                                    <p className="mt-1 text-sm text-slate-500">
                                        TST: {grupo.tstResponsavel || "Não informado"} · E-mail: {grupo.tstEmail || "Não cadastrado"}
                                    </p>
                                </div>

                                <div className="flex flex-wrap gap-2 lg:justify-end">
                                    <button
                                        type="button"
                                        onClick={() => onEnviarEmailAlertaTstAutomatico?.(grupo)}
                                        disabled={enviandoAlertaTst}
                                        className="inline-flex min-w-[190px] items-center justify-center whitespace-nowrap rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {enviandoAlertaTst ? "Enviando..." : "Enviar aviso por e-mail"}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => onCopiarAvisoAlertaTst?.(grupo)}
                                        className="inline-flex items-center justify-center whitespace-nowrap rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                                    >
                                        Copiar aviso
                                    </button>
                                </div>
                            </div>

                            <div className="treinamentos-alertas-tst-card__itens mt-3 space-y-2">
                                {grupo.itens
                                    .sort((a, b) => a.dias - b.dias)
                                    .map((item, index) => {
                                        const vencido = item.dias < 0;
                                        const textoPrazo = vencido
                                            ? `vencido há ${Math.abs(item.dias)} dia(s)`
                                            : `faltam ${item.dias} dia(s)`;

                                        return (
                                            <div
                                                key={`${grupo.empresa}-${item.codigo}-${item.treinamento}-${index}`}
                                                className={classNames(
                                                    "treinamentos-alertas-tst-card__item rounded-2xl px-3 py-2 text-sm ring-1",
                                                    vencido
                                                        ? "bg-red-50 text-red-900 ring-red-100"
                                                        : "bg-orange-50 text-orange-950 ring-orange-100"
                                                )}
                                            >
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span
                                                        className={classNames(
                                                            "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                                                            vencido ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"
                                                        )}
                                                    >
                                                        {vencido ? "Vencido" : "A vencer"}
                                                    </span>
                                                    <strong>{item.colaborador}</strong>
                                                </div>
                                                <p className="mt-1">
                                                    {item.treinamento} · vencimento em {formatDate(item.vencimento)} · {textoPrazo}
                                                </p>
                                                <p className="mt-1 text-xs opacity-80">
                                                    Código: {item.codigo || "-"} · Função: {item.funcao || "-"} · Situação: {item.situacaoObra || "-"}
                                                </p>
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {!recolhido && (
                <p className="treinamentos-alertas-tst-card__nota mt-3 rounded-2xl bg-slate-50 p-3 text-xs text-slate-500">
                    O botão de e-mail envia automaticamente pela função Supabase enviar-alerta-tst. Use Copiar aviso como alternativa manual quando precisar enviar pelo Outlook, Gmail ou WhatsApp.
                </p>
            )}
        </Card>
    );
}
