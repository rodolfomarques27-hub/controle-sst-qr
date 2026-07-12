import { DashboardBlocoRecolhivel } from "./DashboardBlocoRecolhivel";
import { classNames } from "../../utils/sstUtils";

export function DashboardRankingPendencias({
    rankingPendenciasEmpresa = [],
    blocosRecolhidosDashboard = {},
    alternarBlocoRecolhidoDashboard,
    mensagemVaziaDashboard,
}) {
    return (
        <DashboardBlocoRecolhivel
            chaveBloco="rankingEmpresas"
            blocosRecolhidosDashboard={blocosRecolhidosDashboard}
            alternarBlocoRecolhidoDashboard={alternarBlocoRecolhidoDashboard}
            titulo="Ranking de pendências por empresa"
            subtitulo="Tabela com tamanho e posição configuráveis no painel. Use Destaque para ocupar a linha inteira."
            badge={(
                <div className="flex flex-wrap gap-2 text-xs font-black">
                    <span className="rounded-full bg-[#E8F5EC] px-3 py-1 text-[#1E7C3A] ring-1 ring-[#CDE8D5]">Regular</span>
                    <span className="rounded-full bg-orange-50 px-3 py-1 text-orange-700 ring-1 ring-orange-200">Atenção</span>
                    <span className="rounded-full bg-red-50 px-3 py-1 text-red-700 ring-1 ring-red-200">Crítico</span>
                </div>
            )}
        >
            {rankingPendenciasEmpresa.length === 0 ? (
                mensagemVaziaDashboard("Nenhuma empresa encontrada para gerar o ranking.")
            ) : (
                <div className="overflow-x-auto scrollbar-discreta">
                    <table className="min-w-[920px] w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                                <th className="py-3 pr-3 font-semibold">Empresa</th>
                                <th className="px-3 py-3 text-center font-semibold">Total colab.</th>
                                <th className="px-3 py-3 text-center font-semibold">Docs vencidos</th>
                                <th className="px-3 py-3 text-center font-semibold">Docs a vencer</th>
                                <th className="px-3 py-3 text-center font-semibold">Trein. vencidos</th>
                                <th className="px-3 py-3 text-center font-semibold">Bloqueados</th>
                                <th className="py-3 pl-3 text-center font-semibold">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {rankingPendenciasEmpresa.slice(0, 10).map((item, index) => (
                                <tr key={item.empresa} className="align-middle text-slate-700 hover:bg-slate-50/80">
                                    <td className="py-3 pr-3">
                                        <div className="font-semibold text-slate-950">{index + 1}. {item.empresa}</div>
                                        {item.pendenciasLeves > 0 && item.statusEmpresa === "Atenção" && (
                                            <div className="mt-0.5 text-xs text-slate-500">Possui pendência leve ou item preventivo.</div>
                                        )}
                                    </td>
                                    <td className="px-3 py-3 text-center font-bold text-slate-900">{item.totalColaboradores}</td>
                                    <td className="px-3 py-3 text-center">
                                        <span className={classNames("inline-flex min-w-8 justify-center rounded-full px-2 py-1 text-xs font-bold ring-1", item.documentosVencidos > 0 ? "bg-red-50 text-red-700 ring-red-100" : "bg-slate-50 text-slate-600 ring-slate-100")}>{item.documentosVencidos}</span>
                                    </td>
                                    <td className="px-3 py-3 text-center">
                                        <span className={classNames("inline-flex min-w-8 justify-center rounded-full px-2 py-1 text-xs font-bold ring-1", item.documentosAVencer > 0 ? "bg-orange-50 text-orange-700 ring-orange-100" : "bg-slate-50 text-slate-600 ring-slate-100")}>{item.documentosAVencer}</span>
                                    </td>
                                    <td className="px-3 py-3 text-center">
                                        <span className={classNames("inline-flex min-w-8 justify-center rounded-full px-2 py-1 text-xs font-bold ring-1", item.treinamentosVencidos > 0 ? "bg-red-50 text-red-700 ring-red-100" : "bg-slate-50 text-slate-600 ring-slate-100")}>{item.treinamentosVencidos}</span>
                                    </td>
                                    <td className="px-3 py-3 text-center">
                                        <span className={classNames("inline-flex min-w-8 justify-center rounded-full px-2 py-1 text-xs font-bold ring-1", item.colaboradoresBloqueados > 0 ? "bg-red-50 text-red-700 ring-red-100" : "bg-slate-50 text-slate-600 ring-slate-100")}>{item.colaboradoresBloqueados}</span>
                                    </td>
                                    <td className="py-3 pl-3 text-center">
                                        <span className={classNames("inline-flex min-w-[86px] justify-center rounded-full px-3 py-1 text-xs font-bold ring-1", item.statusEmpresaClasse)}>
                                            {item.statusEmpresa}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </DashboardBlocoRecolhivel>
    );
}
