import React from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Card } from "../commonComponents";
import { classNames } from "../../utils/sstUtils";

export function DashboardBlocoRecolhivel({
    chaveBloco,
    titulo,
    subtitulo,
    badge,
    children,
    blocosRecolhidosDashboard = {},
    alternarBlocoRecolhidoDashboard,
}) {
    const recolhido = Boolean(blocosRecolhidosDashboard?.[chaveBloco]);

    return (
        <Card className="h-full">
            <div className={classNames("flex flex-col justify-between gap-3 md:flex-row md:items-start", recolhido ? "mb-0" : "mb-4")}>
                <div className="min-w-0">
                    <h2 className="text-lg font-bold text-slate-950">{titulo}</h2>
                    {subtitulo && <p className="mt-1 text-sm text-slate-500">{subtitulo}</p>}
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {badge}
                    <button
                        type="button"
                        onClick={() => alternarBlocoRecolhidoDashboard?.(chaveBloco)}
                        className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                    >
                        {recolhido ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
                        {recolhido ? "Abrir" : "Recolher"}
                    </button>
                </div>
            </div>

            {!recolhido && children}
        </Card>
    );
}

export default DashboardBlocoRecolhivel;
