import {
    Eye,
    LayoutGrid,
} from "lucide-react";
import { classNames } from "../../utils/sstUtils";

export function DashboardPreviewFiltro({
    mostrarFiltroPainel,
    abaPersonalizacaoPainel,
}) {
    if (!mostrarFiltroPainel) {
        return null;
    }

    const modoCartas =
        abaPersonalizacaoPainel === "cartas";

    return (
        <div className="mb-2 mt-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <span
                        className={classNames(
                            "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1",
                            modoCartas
                                ? "bg-blue-50 text-blue-700 ring-blue-100"
                                : "bg-emerald-50 text-emerald-700 ring-emerald-100"
                        )}
                    >
                        {modoCartas ? (
                            <Eye className="h-4 w-4" />
                        ) : (
                            <LayoutGrid className="h-4 w-4" />
                        )}
                    </span>

                    <div>
                        <p className="text-xs font-black text-slate-950">
                            Prévia do seu painel
                        </p>

                        <p className="mt-0.5 text-[11px] text-slate-500">
                            {modoCartas
                                ? "Veja abaixo somente os indicadores com a configuração atual."
                                : "Veja abaixo somente os quadros grandes com a configuração atual."}
                        </p>
                    </div>
                </div>

                <span
                    className={classNames(
                        "inline-flex self-start rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wide ring-1 sm:self-auto",
                        modoCartas
                            ? "bg-blue-50 text-blue-700 ring-blue-100"
                            : "bg-emerald-50 text-emerald-700 ring-emerald-100"
                    )}
                >
                    {modoCartas
                        ? "Indicadores"
                        : "Quadros do painel"}
                </span>
            </div>
        </div>
    );
}
