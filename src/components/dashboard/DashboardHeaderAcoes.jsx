import { AlertTriangle, Download, Filter } from "lucide-react";

export function DashboardHeaderAcoes({
    setMostrarFiltroPainel,
    enviarAlertasPendenciasCriticas,
    baixarRelatorioDashboard,
    enviandoEmail = false,
    pendencias = [],
}) {
    return (
        <div className="flex flex-wrap items-center gap-2">
            <button
                type="button"
                onClick={() => setMostrarFiltroPainel((valor) => !valor)}
                className="inline-flex items-center gap-2 rounded-2xl border border-[#E5E9EF] bg-white px-4 py-2.5 text-sm font-black text-[#1A2332] shadow-[0_6px_16px_rgba(26,35,50,0.06)] transition hover:-translate-y-0.5 hover:bg-[#F8FAFC] hover:shadow-[0_10px_22px_rgba(26,35,50,0.10)]"
            >
                <Filter className="h-4 w-4" />
                Personalizar painel
            </button>

            <button
                type="button"
                onClick={enviarAlertasPendenciasCriticas}
                disabled={enviandoEmail || pendencias.length === 0}
                className="inline-flex items-center gap-2 rounded-2xl border border-[#E5E9EF] bg-white px-4 py-2.5 text-sm font-black text-[#1A2332] shadow-[0_6px_16px_rgba(26,35,50,0.06)] transition hover:-translate-y-0.5 hover:bg-[#F8FAFC] hover:shadow-[0_10px_22px_rgba(26,35,50,0.10)] disabled:cursor-not-allowed"
            >
                <AlertTriangle className="h-4 w-4" />
                {enviandoEmail ? "Enviando..." : "Enviar alertas por e-mail"}
            </button>

            <button
                type="button"
                onClick={baixarRelatorioDashboard}
                className="inline-flex items-center gap-2 rounded-2xl border border-[#E5E9EF] bg-white px-4 py-2.5 text-sm font-black text-[#1A2332] shadow-[0_6px_16px_rgba(26,35,50,0.06)] transition hover:-translate-y-0.5 hover:bg-[#F8FAFC] hover:shadow-[0_10px_22px_rgba(26,35,50,0.10)]"
            >
                <Download className="h-4 w-4" />
                Exportar relatório
            </button>
        </div>
    );
}
