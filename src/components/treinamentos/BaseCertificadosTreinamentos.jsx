/* eslint-disable no-unused-vars */
import React from "react";
import {
    ChevronDown,
    ChevronUp,
    FileText,
    Filter,
    Upload,
} from "lucide-react";
import { Card, StatusPill } from "../commonComponents";
import {
    statusDocumento,
    treinamentoSemValidade,
} from "../../services/colaboradorDocumentosService";
import { formatDate, classNames } from "../../utils/sstUtils";

export function BaseCertificadosTreinamentos({
    documentos = [],
    documentosFiltrados = [],
    documentosPorColaborador = [],
    totalPorStatusCertificados = { pendentes: 0 },
    gruposCertificadosAbertos = {},
    setGruposCertificadosAbertos,
    certificadosAbertos = {},
    setCertificadosAbertos,
    valoresRevisao,
    alterarDataRevisao,
    salvarDatasCertificado,
    salvandoDatasId = "",
    enviarDocumentoPendente,
    onVisualizarCertificado,
    onExcluirCertificado,
    recolhido = false,
    onAlternarRecolhido,
}) {
    return (
        <Card className="self-start">
            <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-start">
                <div>
                    <h2 className="text-lg font-bold text-slate-950">Base de certificados</h2>
                    <p className="mt-1 text-sm text-slate-500">Consulta, revisão de datas e abertura dos certificados enviados.</p>
                </div>

                <div className="flex flex-wrap gap-2 md:justify-end">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                        {documentosFiltrados.length} certificado(s) · {totalPorStatusCertificados.pendentes} pendente(s)
                    </span>
                    <button
                        type="button"
                        onClick={onAlternarRecolhido}
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                    >
                        {recolhido ? (
                            <>
                                <ChevronDown className="h-3.5 w-3.5" />
                                Abrir
                            </>
                        ) : (
                            <>
                                <ChevronUp className="h-3.5 w-3.5" />
                                Recolher
                            </>
                        )}
                    </button>
                </div>
            </div>

            {recolhido ? (
                <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                    Card recolhido. A base possui {documentosFiltrados.length} certificado(s) filtrado(s) e {totalPorStatusCertificados.pendentes} pendência(s).
                </p>
            ) : (
            <div className="space-y-3">
                {documentos.length === 0 && totalPorStatusCertificados.pendentes === 0 && (
                    <div className="rounded-3xl border border-dashed border-slate-300 p-8 text-center">
                        <FileText className="mx-auto h-10 w-10 text-slate-300" />
                        <h3 className="mt-3 font-bold text-slate-900">Nenhum certificado lançado ainda</h3>
                        <p className="mt-1 text-sm text-slate-500">
                            Os certificados enviados aparecerão nesta base para revisão de validade e consulta.
                        </p>
                    </div>
                )}

                {documentos.length > 0 && documentosPorColaborador.length === 0 && (
                    <div className="rounded-3xl border border-dashed border-slate-300 p-8 text-center">
                        <Filter className="mx-auto h-10 w-10 text-slate-300" />
                        <h3 className="mt-3 font-bold text-slate-900">Nenhum certificado encontrado</h3>
                        <p className="mt-1 text-sm text-slate-500">
                            Ajuste a busca ou o filtro de status para localizar os certificados.
                        </p>
                    </div>
                )}

                {documentosPorColaborador.map((grupo) => {
                    const colaborador = grupo.colaborador;
                    const certificados = grupo.certificados || [];
                    const pendentes = grupo.pendentes || [];
                    const grupoKey = String(colaborador?.id || colaborador?.codigoFuncionario || "sem-colaborador");
                    const grupoAberto = Boolean(gruposCertificadosAbertos[grupoKey]);

                    const resumoStatus = certificados.reduce(
                        (acc, certificado) => {
                            const valores = valoresRevisao(certificado);
                            const status = statusDocumento(
                                valores.vencimento || certificado.vencimento,
                                treinamentoSemValidade(certificado.treinamentoId)
                            );

                            if (status.chave === "vencido") acc.vencidos += 1;
                            else if (status.chave === "vencendo") acc.aVencer += 1;
                            else acc.emDia += 1;

                            return acc;
                        },
                        { emDia: 0, aVencer: 0, vencidos: 0 }
                    );

                    return (
                        <div
                            key={grupoKey}
                            className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md"
                        >
                            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                                <div className="min-w-0">
                                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Colaborador</p>
                                    <p className="mt-1 break-words text-lg font-bold leading-snug text-slate-950">
                                        {colaborador.nome}
                                    </p>
                                    <p className="mt-1 break-words text-sm text-slate-500">
                                        {colaborador.empresaExibicao || colaborador.empresa}
                                    </p>
                                    <p className="mt-1 text-xs font-semibold text-slate-500">
                                        Código: {colaborador.codigoFuncionario}
                                    </p>
                                </div>

                                <div className="flex flex-col gap-2 lg:items-end">
                                    <div className="flex flex-wrap gap-2 lg:justify-end">
                                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                                            {certificados.length} certificado(s)
                                        </span>

                                        {pendentes.length > 0 && (
                                            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-200">
                                                {pendentes.length} faltando
                                            </span>
                                        )}

                                        {resumoStatus.emDia > 0 && (
                                            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                                                {resumoStatus.emDia} em dia
                                            </span>
                                        )}

                                        {resumoStatus.aVencer > 0 && (
                                            <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700 ring-1 ring-orange-200">
                                                {resumoStatus.aVencer} a vencer
                                            </span>
                                        )}

                                        {resumoStatus.vencidos > 0 && (
                                            <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-200">
                                                {resumoStatus.vencidos} vencido(s)
                                            </span>
                                        )}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setGruposCertificadosAbertos((atual) => ({
                                                ...atual,
                                                [grupoKey]: !atual[grupoKey],
                                            }))
                                        }
                                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                                    >
                                        {grupoAberto ? (
                                            <>
                                                <ChevronUp className="h-4 w-4" />
                                                Recolher treinamentos
                                            </>
                                        ) : (
                                            <>
                                                <ChevronDown className="h-4 w-4" />
                                                Ver treinamentos
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {grupoAberto && (
                                <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                                    {pendentes.length > 0 && (
                                        <div className="rounded-2xl border border-dashed border-blue-200 bg-blue-50 p-3">
                                            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                                <div>
                                                    <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
                                                        Documentos faltantes para envio
                                                    </p>
                                                    <p className="mt-1 text-[11px] text-blue-700">
                                                        Clique em enviar para preencher automaticamente o colaborador e o treinamento no lançamento.
                                                    </p>
                                                </div>

                                                <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-blue-700 ring-1 ring-blue-200">
                                                    {pendentes.length} pendente(s)
                                                </span>
                                            </div>

                                            <div className="space-y-2">
                                                {pendentes.map((item) => (
                                                    <div
                                                        key={`pendente-${grupoKey}-${item.treinamento.id}`}
                                                        className="flex flex-col justify-between gap-2 rounded-xl bg-white px-3 py-2 ring-1 ring-blue-100 lg:flex-row lg:items-center"
                                                    >
                                                        <div className="min-w-0">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 ring-1 ring-blue-200">
                                                                    Pendente
                                                                </span>
                                                                <p className="break-words text-sm font-semibold text-slate-800">
                                                                    {item.treinamento.nome}
                                                                </p>
                                                            </div>
                                                            <p className="mt-1 text-[11px] text-slate-500">
                                                                Documento ainda não enviado para este colaborador.
                                                            </p>
                                                        </div>

                                                        <button
                                                            type="button"
                                                            onClick={() => enviarDocumentoPendente(colaborador, item.treinamento)}
                                                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                                                        >
                                                            <Upload className="h-4 w-4" />
                                                            Enviar documento
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {certificados.length === 0 && pendentes.length === 0 && (
                                        <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                                            Nenhum item encontrado para este colaborador com o filtro atual.
                                        </div>
                                    )}

                                    {certificados.map((d, idx) => {
                                        const valores = valoresRevisao(d);
                                        const semValidade = treinamentoSemValidade(d.treinamentoId);
                                        const statusAtual = statusDocumento(valores.vencimento || d.vencimento, semValidade);
                                        const itemKey = String(d.id || `${d.colaborador.id}-${d.treinamentoId}-${idx}`);
                                        const aberto = Boolean(certificadosAbertos[itemKey]);

                                        return (
                                            <div
                                                key={itemKey}
                                                className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100"
                                            >
                                                <div className="grid gap-3 lg:grid-cols-[1fr_150px] lg:items-start">
                                                    <div className="min-w-0">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <StatusPill status={statusAtual} small />
                                                            <h3 className="break-words text-base font-bold leading-snug text-slate-900">
                                                                {d.treinamento.nome}
                                                            </h3>
                                                        </div>

                                                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                                            <FileText className="h-4 w-4 text-slate-400" />
                                                            <span className="break-words">{d.arquivo || "Arquivo não informado"}</span>
                                                        </div>

                                                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                                            <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-slate-100">
                                                                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Realização</p>
                                                                <p className="text-xs font-semibold text-slate-700">{formatDate(valores.realizado)}</p>
                                                            </div>

                                                            <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-slate-100">
                                                                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Vencimento</p>
                                                                <p className="text-xs font-semibold text-slate-700">
                                                                    {semValidade ? "Sem validade" : formatDate(valores.vencimento)}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-col gap-2 lg:items-stretch">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setCertificadosAbertos((atual) => ({
                                                                    ...atual,
                                                                    [itemKey]: !atual[itemKey],
                                                                }))
                                                            }
                                                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                                                        >
                                                            {aberto ? (
                                                                <>
                                                                    <ChevronUp className="h-4 w-4" />
                                                                    Ocultar datas
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <ChevronDown className="h-4 w-4" />
                                                                    Revisar datas
                                                                </>
                                                            )}
                                                        </button>

                                                        <button
                                                            onClick={() => onVisualizarCertificado(d)}
                                                            className="rounded-xl bg-slate-950 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                                                        >
                                                            Abrir
                                                        </button>

                                                        <button
                                                            onClick={() => onExcluirCertificado(d)}
                                                            className="rounded-xl bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-100"
                                                        >
                                                            Excluir
                                                        </button>
                                                    </div>
                                                </div>

                                                {aberto && (
                                                    <div className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-slate-100">
                                                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_auto] xl:items-end">
                                                            <div>
                                                                <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Realização</p>
                                                                <input
                                                                    type="date"
                                                                    value={valores.realizado}
                                                                    onChange={(e) => alterarDataRevisao(d, "realizado", e.target.value)}
                                                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
                                                                />
                                                            </div>

                                                            <div>
                                                                <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Vencimento</p>
                                                                {semValidade ? (
                                                                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600">
                                                                        Sem validade
                                                                    </div>
                                                                ) : (
                                                                    <input
                                                                        type="date"
                                                                        value={valores.vencimento}
                                                                        onChange={(e) => alterarDataRevisao(d, "vencimento", e.target.value)}
                                                                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
                                                                    />
                                                                )}
                                                            </div>

                                                            <button
                                                                type="button"
                                                                onClick={() => salvarDatasCertificado(d)}
                                                                disabled={salvandoDatasId === d.id}
                                                                className="rounded-xl bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 ring-1 ring-blue-200 hover:bg-blue-100 disabled:opacity-60"
                                                            >
                                                                {salvandoDatasId === d.id ? "Salvando..." : "Salvar datas"}
                                                            </button>
                                                        </div>

                                                        <p className="mt-3 text-xs leading-relaxed text-slate-400">
                                                            {semValidade
                                                                ? "Este documento não possui validade. Ao revisar, somente a data de realização/emissão será atualizada."
                                                                : "Ao alterar a realização, o vencimento é recalculado automaticamente pela validade do treinamento."}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            )}
        </Card>
    );
}
