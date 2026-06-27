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
        <Card className="h-full overflow-hidden rounded-[18px] border border-[#E5E9EF] bg-white shadow-[0_8px_22px_rgba(26,35,50,0.06)] ring-0">
            <div className={classNames("flex flex-col justify-between gap-3 md:flex-row md:items-start", recolhido ? "mb-0" : "mb-4 border-b border-[#EEF2F6] pb-4")}>
                <div className="min-w-0">
                    <h2 className="text-base font-black tracking-tight text-[#1A2332]">{titulo}</h2>
                    {subtitulo && <p className="mt-1 text-sm font-medium leading-snug text-[#6B7A8D]">{subtitulo}</p>}
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {badge}
                    <button
                        type="button"
                        onClick={() => alternarBlocoRecolhidoDashboard?.(chaveBloco)}
                        className="inline-flex items-center gap-1.5 rounded-full bg-[#F4F6F9] px-3 py-1.5 text-xs font-black text-[#1A2332] ring-1 ring-[#E5E9EF] transition hover:bg-[#E8F5EC] hover:text-[#1E7C3A]"
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
