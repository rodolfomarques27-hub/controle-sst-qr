import { classNames } from "../../utils/sstUtils";

export function DashboardPreviewFiltro({ mostrarFiltroPainel, abaPersonalizacaoPainel }) {
    if (!mostrarFiltroPainel) return null;

    const modoCartas = abaPersonalizacaoPainel === "cartas";

    return (
        <div className={classNames(
            "mb-3 mt-6 rounded-2xl px-4 py-3 text-sm font-semibold ring-1",
            modoCartas
                ? "bg-blue-50 text-blue-800 ring-blue-200"
                : "bg-emerald-50 text-emerald-800 ring-emerald-200"
        )}>
            Prévia filtrada: {modoCartas
                ? "mostrando somente as cartas principais do Dashboard SST."
                : "mostrando somente os quadros do Dashboard SST."}
        </div>
    );
}
