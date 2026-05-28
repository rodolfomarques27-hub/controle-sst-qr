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
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
            >
                <Filter className="h-4 w-4" />
                Personalizar painel
            </button>

            <button
                type="button"
                onClick={enviarAlertasPendenciasCriticas}
                disabled={enviandoEmail || pendencias.length === 0}
                className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
                <AlertTriangle className="h-4 w-4" />
                {enviandoEmail ? "Enviando..." : "Enviar alertas por e-mail"}
            </button>

            <button
                type="button"
                onClick={baixarRelatorioDashboard}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
            >
                <Download className="h-4 w-4" />
                Exportar relatório
            </button>
        </div>
    );
}
