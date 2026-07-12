import { classNames, normalizarTextoBusca } from "../utils/sstUtils";
import { obterStatusInicialColaborador } from "../services/colaboradorDocumentosService";

export function MobilizacaoBadge({ status }) {
    const statusTexto = String(status || obterStatusInicialColaborador());
    const statusBusca = normalizarTextoBusca(statusTexto);

    const classe =
        statusBusca.includes("liberado")
            ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
            : statusBusca.includes("pendencia") || statusBusca.includes("pendência") || statusBusca.includes("com pend")
                ? "bg-blue-50 text-blue-700 ring-blue-200"
                : statusBusca.includes("bloqueado")
                    ? "bg-red-50 text-red-700 ring-red-200"
                    : statusBusca.includes("analise") || statusBusca.includes("análise")
                        ? "bg-violet-50 text-violet-700 ring-violet-200"
                        : statusBusca.includes("desmobilizado") || statusBusca.includes("inativo")
                            ? "bg-slate-100 text-slate-700 ring-slate-300"
                            : "bg-slate-50 text-slate-700 ring-slate-200";

    return (
        <span
            className={classNames(
                "inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-bold ring-1",
                classe
            )}
        >
            {statusTexto}
        </span>
    );
}
