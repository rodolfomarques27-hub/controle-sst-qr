import { DashboardBlocoRecolhivel } from "./DashboardBlocoRecolhivel";
import { classNames, formatarDataHora } from "../../utils/sstUtils";
import { classeClassificacaoAuditoriaCampo } from "../../services/auditoriaCampoService";

export function DashboardAuditoriasCampo({
    auditoriasCampoMes = [],
    mediaConformidadeCampo = 0,
    desviosCampoAbertos = 0,
    desviosCampoCorrigidos = 0,
    auditoriasCampoNormalizadas = [],
    blocosRecolhidosDashboard,
    alternarBlocoRecolhidoDashboard,
}) {
    return (
        <DashboardBlocoRecolhivel
            chaveBloco="auditoriasCampo"
            blocosRecolhidosDashboard={blocosRecolhidosDashboard}
            alternarBlocoRecolhidoDashboard={alternarBlocoRecolhidoDashboard}
            titulo="Auditorias de campo"
            subtitulo="Histórico mensal de auditorias realizadas via QR Code por colaborador e empresa."
            badge={(
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                    {auditoriasCampoMes.length} no mês
                </span>
            )}
        >
            <div className="dashboard-auditoria-grid">
                <div className="dashboard-auditoria-card rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Auditorias do mês</p>
                    <p className="mt-2 text-2xl font-black text-slate-950">{auditoriasCampoMes.length}</p>
                </div>
                <div className="dashboard-auditoria-card rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Média de conformidade</p>
                    <p className="mt-2 text-2xl font-black text-slate-950">{mediaConformidadeCampo}%</p>
                </div>
                <div className="dashboard-auditoria-card rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Desvios abertos</p>
                    <p className="mt-2 text-2xl font-black text-red-600">{desviosCampoAbertos}</p>
                </div>
                <div className="dashboard-auditoria-card rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Desvios corrigidos</p>
                    <p className="mt-2 text-2xl font-black text-emerald-600">{desviosCampoCorrigidos}</p>
                </div>
            </div>

            <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 scrollbar-discreta">
                <table className="min-w-[850px] w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                        <tr>
                            <th className="px-4 py-3">Data</th>
                            <th className="px-4 py-3">Colaborador</th>
                            <th className="px-4 py-3">Empresa</th>
                            <th className="px-4 py-3">Pontuação</th>
                            <th className="px-4 py-3">Classificação</th>
                            <th className="px-4 py-3">Desvios</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                        {auditoriasCampoNormalizadas.length === 0 && (
                            <tr>
                                <td className="px-4 py-8 text-center text-sm text-slate-500" colSpan={6}>
                                    Nenhuma auditoria de campo registrada.
                                </td>
                            </tr>
                        )}
                        {auditoriasCampoNormalizadas.slice(0, 10).map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50">
                                <td className="px-4 py-3 text-slate-600">{formatarDataHora(item.createdAt)}</td>
                                <td className="px-4 py-3 font-semibold text-slate-900">{item.colaboradorNome || "-"}</td>
                                <td className="px-4 py-3 text-slate-600">{item.empresaNome || "-"}</td>
                                <td className="px-4 py-3 font-bold text-slate-900">{item.pontuacao}%</td>
                                <td className="px-4 py-3">
                                    <span className={classNames("rounded-full px-2 py-1 text-xs font-bold ring-1", classeClassificacaoAuditoriaCampo(item.classificacao))}>
                                        {item.classificacao || "-"}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-slate-600">{item.totalDesvios}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </DashboardBlocoRecolhivel>
    );
}

export function DashboardTopDesviosCampo({
    topDesviosCampo = [],
    blocosRecolhidosDashboard,
    alternarBlocoRecolhidoDashboard,
}) {
    return (
        <DashboardBlocoRecolhivel
            chaveBloco="topDesviosCampo"
            blocosRecolhidosDashboard={blocosRecolhidosDashboard}
            alternarBlocoRecolhidoDashboard={alternarBlocoRecolhidoDashboard}
            titulo="Top 5 desvios"
            subtitulo="Principais tipos de desvios registrados nas auditorias de campo."
            badge={(
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                    {topDesviosCampo.length} tipo(s)
                </span>
            )}
        >
            <div className="space-y-2">
                {topDesviosCampo.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">
                        Nenhum desvio de auditoria de campo registrado.
                    </div>
                )}
                {topDesviosCampo.map((item, index) => (
                    <div key={item.categoria} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
                        <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-slate-900">{index + 1}. {item.categoria}</p>
                            <p className="text-xs text-slate-500">{item.abertos} aberto(s) · {item.graves} grave(s)</p>
                        </div>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700 ring-1 ring-slate-200">
                            {item.total}
                        </span>
                    </div>
                ))}
            </div>
        </DashboardBlocoRecolhivel>
    );
}
