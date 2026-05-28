import React from "react";
import { DashboardBlocoRecolhivel } from "./DashboardBlocoRecolhivel";
import { classNames } from "../../utils/sstUtils";

export function DashboardConformidade({
    resumoConformidade,
    blocosRecolhidosDashboard,
    alternarBlocoRecolhidoDashboard,
}) {
    return (
        <DashboardBlocoRecolhivel
            chaveBloco="conformidade"
            blocosRecolhidosDashboard={blocosRecolhidosDashboard}
            alternarBlocoRecolhidoDashboard={alternarBlocoRecolhidoDashboard}
            titulo="Resumo de conformidade"
            subtitulo="Baseado nos treinamentos exigidos para a função, incluindo os ainda não enviados."
        >
            <div className="space-y-5">
                {resumoConformidade.map((i) => (
                    <div key={i.label}>
                        <div className="mb-2 flex justify-between text-sm">
                            <span className="font-medium text-slate-700">{i.label}</span>
                            <span className="text-slate-500">{i.valor}/{i.total}</span>
                        </div>
                        <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                            <div
                                className={classNames("h-full rounded-full", i.classe)}
                                style={{ width: `${i.total ? Math.max(4, (i.valor / i.total) * 100) : 0}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                <strong className="text-slate-900">Regra do sistema:</strong> pendente indica ausência de certificado; vencido bloqueia a atividade; a vencer em até 30 dias gera alerta preventivo; em dia libera a consulta no QR Code.
            </div>
        </DashboardBlocoRecolhivel>
    );
}
