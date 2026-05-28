import React from "react";
import { FotoColaborador } from "../commonComponents";
import { obterStatusInicialColaborador, statusGeral } from "../../services/colaboradorDocumentosService";
import { classNames, formatDate } from "../../utils/sstUtils";
import { DashboardBlocoRecolhivel } from "./DashboardBlocoRecolhivel";

export function DashboardPendencias({
    pendencias = [],
    blocosRecolhidosDashboard,
    alternarBlocoRecolhidoDashboard,
    enviarAlertaEmailPendencia,
    enviandoEmail,
    onSelectColab,
}) {
    return (
        <DashboardBlocoRecolhivel
            chaveBloco="pendencias"
            blocosRecolhidosDashboard={blocosRecolhidosDashboard}
            alternarBlocoRecolhidoDashboard={alternarBlocoRecolhidoDashboard}
            titulo="Pendências críticas"
            subtitulo="Treinamentos pendentes, vencidos ou a vencer em até 30 dias."
            badge={(
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                    {pendencias.length} itens
                </span>
            )}
        >
            <div className="overflow-x-auto rounded-2xl border border-slate-200 scrollbar-discreta">
                <table className="min-w-[760px] w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                        <tr>
                            <th className="px-4 py-3">Colaborador</th>
                            <th className="px-4 py-3">Treinamento</th>
                            <th className="px-4 py-3">Vencimento</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                        {pendencias.length === 0 && (
                            <tr>
                                <td className="px-4 py-8 text-center text-sm text-slate-500" colSpan={5}>
                                    Nenhuma pendência crítica encontrada.
                                </td>
                            </tr>
                        )}

                        {pendencias.slice(0, 10).map((item, idx) => (
                            <tr key={`${item.colaborador.id}-${item.treinamento.id}-${idx}`} className="hover:bg-slate-50">
                                <td className="px-4 py-3">
                                    <div className="flex min-w-0 items-center gap-3">
                                        <FotoColaborador
                                            src={item.colaborador.fotoUrl}
                                            nome={item.colaborador.nome}
                                            className="h-9 w-9 rounded-2xl"
                                            iconClassName="h-4 w-4"
                                        />
                                        <div className="min-w-0">
                                            <div className="truncate font-semibold text-slate-900">{item.colaborador.nome}</div>
                                            <div className="text-xs text-slate-500">
                                                {item.colaborador.empresaExibicao || item.colaborador.empresa} · {item.colaborador.statusMobilizacao || obterStatusInicialColaborador()} · {statusGeral(item.colaborador).texto}
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-slate-600">{item.treinamento.nome}</td>
                                <td className="px-4 py-3 text-slate-600">
                                    {item.vencimento ? formatDate(item.vencimento) : "Não enviado"}
                                </td>
                                <td className="px-4 py-3">
                                    <span className={classNames("rounded-full px-2 py-1 text-xs font-semibold ring-1", item.status.classe)}>
                                        {item.status.texto}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button
                                            type="button"
                                            onClick={() => enviarAlertaEmailPendencia(item)}
                                            disabled={enviandoEmail}
                                            className="inline-flex min-w-[78px] items-center justify-center whitespace-nowrap rounded-xl bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            E-mail
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => onSelectColab(item.colaborador)}
                                            className="inline-flex min-w-[48px] items-center justify-center whitespace-nowrap rounded-xl bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                                        >
                                            QR
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </DashboardBlocoRecolhivel>
    );
}
