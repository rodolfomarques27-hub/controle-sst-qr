import { Card } from "../commonComponents";
import { DashboardCard } from "./DashboardCard";

export function DashboardCardsGrid({
    cardsVisiveis,
    storageStatusDashboard,
    storagePercentual,
    totalStorageLabel,
    storageLimiteLabelDashboard,
    classeTamanhoCartaDashboard,
    estiloCartaDashboard,
}) {
    return (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {cardsVisiveis.length === 0 ? (
                <Card className="md:col-span-2 xl:col-span-5">
                    <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">
                        Nenhuma carta principal selecionada. Abra Personalizar painel e escolha as cartas que deseja exibir.
                    </div>
                </Card>
            ) : (
                cardsVisiveis.map((item) => (
                    <DashboardCard
                        key={item.chave}
                        item={item}
                        storageStatusDashboard={storageStatusDashboard}
                        storagePercentual={storagePercentual}
                        totalStorageLabel={totalStorageLabel}
                        storageLimiteLabelDashboard={storageLimiteLabelDashboard}
                        classeTamanhoCartaDashboard={classeTamanhoCartaDashboard}
                        estiloCartaDashboard={estiloCartaDashboard}
                    />
                ))
            )}
        </div>
    );
}
