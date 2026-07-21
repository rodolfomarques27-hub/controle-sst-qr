import React from "react";
import { DashboardBlocoRecolhivel } from "./DashboardBlocoRecolhivel";

export function DashboardColaboradoresFuncao({
    colaboradoresPorFuncao,
    maiorQuantidadePorFuncao,
    blocosRecolhidosDashboard,
    alternarBlocoRecolhidoDashboard,
    mensagemVaziaDashboard,
}) {
    const listaColaboradoresPorFuncao = Array.isArray(colaboradoresPorFuncao) ? colaboradoresPorFuncao : [];
    const maiorQuantidade = Math.max(Number(maiorQuantidadePorFuncao) || 1, 1);

    return (
        <DashboardBlocoRecolhivel
            chaveBloco="colaboradoresFuncao"
            blocosRecolhidosDashboard={blocosRecolhidosDashboard}
            alternarBlocoRecolhidoDashboard={alternarBlocoRecolhidoDashboard}
            titulo="Colaboradores mobilizados por função"
            subtitulo="Conta apenas ativos, mobilizados, liberados ou com pendência não bloqueante."
            badge={(
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                    {listaColaboradoresPorFuncao.length} função(ões)
                </span>
            )}
        >
            <div className="space-y-2">
                {listaColaboradoresPorFuncao.length === 0 ? (
                    mensagemVaziaDashboard("Nenhum colaborador mobilizado encontrado.")
                ) : (
                    listaColaboradoresPorFuncao.map((item) => (
                        <div key={item.funcao} className="rounded-2xl bg-slate-50 p-3 text-sm ring-1 ring-slate-100">
                            <div className="flex justify-between gap-3">
                                <span className="font-semibold text-slate-900">{item.funcao}</span>
                                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
                                    {item.quantidade}
                                </span>
                            </div>
                            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white ring-1 ring-slate-100">
                                <div
                                    className="h-full rounded-full bg-slate-900"
                                    style={{ width: `${Math.max(6, Math.round((item.quantidade / maiorQuantidade) * 100))}%` }}
                                />
                            </div>
                            <p className="mt-1 text-xs text-slate-500">
                                {item.quantidade} colaborador(es) considerado(s) mobilizado(s)
                            </p>
                        </div>
                    ))
                )}
            </div>
        </DashboardBlocoRecolhivel>
    );
}
