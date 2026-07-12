import { Database, Upload } from "lucide-react";
import { Card } from "../commonComponents";
import { classNames } from "../../utils/sstUtils";

export function DashboardCard({
    item,
    storageStatusDashboard,
    storagePercentual,
    totalStorageLabel,
    storageLimiteLabelDashboard,
    classeTamanhoCartaDashboard,
    estiloCartaDashboard,
}) {
    const Icon = item.icon;

    if (item.chave === "armazenamentoUtilizado") {
        const StatusIcon = storageStatusDashboard.statusIcon;
        const percentualBarra = Math.min(100, Math.max(storagePercentual > 0 ? 2 : 0, storagePercentual));

        return (
            <Card
                className={classNames(
                    "group h-full min-h-[142px] overflow-hidden border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md",
                    classeTamanhoCartaDashboard(item.chave)
                )}
            >
                <div className="flex h-full flex-col justify-between gap-2">
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                            <p className="text-[13px] font-bold leading-snug text-slate-700">Armazenamento utilizado</p>
                        </div>
                        <div className={classNames("shrink-0 rounded-2xl p-2.5 ring-1", storageStatusDashboard.iconeClasse)}>
                            <Upload className="h-4 w-4" />
                        </div>
                    </div>

                    <div>
                        <p className={classNames("break-words font-black leading-tight", "text-[21px]", storageStatusDashboard.valorClasse)}>
                            {totalStorageLabel}
                            <span className="ml-1 text-base font-semibold text-slate-400">/ {storageLimiteLabelDashboard}</span>
                        </p>

                        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                            <span className={classNames("inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-bold ring-1", storageStatusDashboard.classe)}>
                                <StatusIcon className="h-3 w-3" />
                                {storageStatusDashboard.texto}
                            </span>
                            <span className={classNames("font-bold", storagePercentual >= 90 ? "text-red-600" : storagePercentual >= 70 ? "text-orange-600" : "text-emerald-600")}>
                                {storagePercentual}% utilizado
                            </span>
                        </div>

                        <div className={classNames("mt-2 h-1.5 overflow-hidden rounded-full", storageStatusDashboard.trilhoClasse)}>
                            <div
                                className={classNames("h-full rounded-full transition-all", storageStatusDashboard.barraClasse)}
                                style={{ width: `${percentualBarra}%` }}
                            />
                        </div>

                        <p className="mt-2 inline-flex items-center gap-1.5 text-[10.5px] font-medium text-slate-400">
                            <Database className="h-3.5 w-3.5" />
                            Capacidade total: {storageLimiteLabelDashboard}
                        </p>
                    </div>
                </div>
            </Card>
        );
    }

    const estiloCarta = estiloCartaDashboard(item.chave, storageStatusDashboard);
    const valorClasse = "text-[26px]";

    return (
        <Card
            className={classNames(
                "group h-full min-h-[142px] overflow-hidden border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md",
                classeTamanhoCartaDashboard(item.chave)
            )}
        >
            <div className="flex h-full flex-col justify-between gap-3">
                <div className="flex items-start gap-3">
                    <div className={classNames("shrink-0 rounded-2xl p-2.5 ring-1", estiloCarta.icone)}>
                        <Icon className="h-4 w-4" />
                    </div>
                    <p className="min-w-0 text-[13px] font-bold leading-snug text-slate-700">{item.label}</p>
                </div>

                <div>
                    <p className={classNames("break-words font-black leading-none", valorClasse, estiloCarta.valor)}>{item.valor}</p>
                    <div className="mt-2 h-px bg-slate-100" />
                    <p className="mt-2 text-[11px] leading-snug text-slate-400">{item.detalhe}</p>
                </div>
            </div>
        </Card>
    );
}
