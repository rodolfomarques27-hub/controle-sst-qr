import { DashboardBlocoRecolhivel } from "./DashboardBlocoRecolhivel";
import { classNames } from "../../utils/sstUtils";

export function DashboardAlertas({
    alertasImportantes,
    blocosRecolhidosDashboard,
    alternarBlocoRecolhidoDashboard,
    mensagemVaziaDashboard,
}) {
    return (
        <DashboardBlocoRecolhivel
            chaveBloco="alertas"
            blocosRecolhidosDashboard={blocosRecolhidosDashboard}
            alternarBlocoRecolhidoDashboard={alternarBlocoRecolhidoDashboard}
            titulo="Alertas importantes"
            subtitulo="Itens que exigem atenção imediata."
            badge={(
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                    {alertasImportantes.length} alerta(s)
                </span>
            )}
        >
            <div className="space-y-2">
                {alertasImportantes.length === 0 ? (
                    mensagemVaziaDashboard("Nenhum alerta importante no momento.")
                ) : (
                    alertasImportantes.map((item, index) => (
                        <div key={`${item.tipo}-${index}`} className={classNames("rounded-2xl p-3 text-sm ring-1", item.classe)}>
                            <p className="font-bold">{item.tipo}</p>
                            <p className="mt-1 text-xs">{item.texto}</p>
                        </div>
                    ))
                )}
            </div>
        </DashboardBlocoRecolhivel>
    );
}
