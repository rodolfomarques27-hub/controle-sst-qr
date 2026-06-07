/* eslint-disable no-unused-vars */
import React from "react";
import {
    ChevronDown,
    ChevronUp,
    FileSearch,
    Loader2,
    Upload,
} from "lucide-react";
import { Card } from "../commonComponents";
import { FileUploadAviso } from "../FileUploadAviso";
import { classNames } from "../../utils/sstUtils";
import { EnvioLoteTreinamentos } from "./EnvioLoteTreinamentos";

export function FormularioLancamentoCertificado({
    colaboradores = [],
    colabSelecionadoCodigo = "",
    onAlterarColaboradorCertificado,
    treinamentosDisponiveis = [],
    treinamentoSelecionadoId,
    setTreinamentoId,
    avaliacaoSelecionado,
    exigenciasAbertas,
    setExigenciasAbertas,
    dataRealizacao,
    setDataRealizacao,
    vencimento,
    observacao,
    setObservacao,
    arquivoSelecionado,
    selecionarArquivoCertificado,
    sugestaoDataArquivo,
    salvandoCertificado,
    analisandoArquivoCertificado = false,
    adicionarTreinamento,
    arquivosLote = [],
    prepararArquivosLote,
    sincronizarArquivosDoStorage,
    sincronizandoStorage,
    resultadoLote,
    colabSelecionado,
    removerArquivoLote,
    alterarColaboradorArquivoLote,
    alterarTreinamentoArquivoLote,
    alterarDataArquivoLote,
    treinamentosBase = [],
    salvarCertificadosEmLote,
    salvandoLote,
    preparandoLoteCertificados = false,
    recolhido = false,
    onAlternarRecolhido,
}) {
    return (
        <Card className="self-start">
            <div
                className={classNames(
                    "flex flex-col justify-between gap-3 lg:flex-row lg:items-start",
                    !recolhido && "mb-4"
                )}
            >
                <div>
                    <h2 className="flex items-center gap-2 text-lg font-bold text-slate-950">
                        <Upload className="h-4 w-4" />
                        Lançar certificado
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                        O arquivo será salvo no Supabase Storage usando o código do funcionário e o registro ficará vinculado ao UUID real do colaborador.
                    </p>
                </div>

                <div className="flex flex-wrap gap-2 lg:justify-end">
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

            {recolhido ? null : (
            <div className="mt-5 space-y-3">
                <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Colaborador</label>
                    <select
                        value={colabSelecionadoCodigo}
                        onChange={(e) => onAlterarColaboradorCertificado(e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                    >
                        {colaboradores.length === 0 && <option value="">Nenhum colaborador cadastrado</option>}
                        {colaboradores.map((c) => (
                            <option key={c.id} value={c.codigoFuncionario}>
                                {c.nome} — {c.empresaExibicao || c.empresa} — {c.codigoFuncionario}
                            </option>
                        ))}
                    </select>
                </div>
        
                <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Treinamento / documento</label>
                    <select
                        value={treinamentoSelecionadoId}
                        onChange={(e) => setTreinamentoId(Number(e.target.value))}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                    >
                        {treinamentosDisponiveis.map((t) => (
                            <option key={t.id} value={t.id}>
                                {t.nome}
                            </option>
                        ))}
                    </select>
                </div>
        
                {avaliacaoSelecionado && (
                    <div className="rounded-2xl bg-slate-50 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                                    Documentos exigidos para a função: {avaliacaoSelecionado.matriz.rotulo}
                                </p>
                                <p className="mt-1 text-[11px] text-slate-400">
                                    {avaliacaoSelecionado.emDia.length} em dia · {avaliacaoSelecionado.pendentes.length} pendente(s) · {avaliacaoSelecionado.vencendo.length} a vencer · {avaliacaoSelecionado.vencidos.length} vencido(s)
                                </p>
                            </div>
        
                            <button
                                type="button"
                                onClick={() => setExigenciasAbertas((valor) => !valor)}
                                className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                            >
                                {exigenciasAbertas ? (
                                    <>
                                        <ChevronUp className="h-4 w-4" />
                                        Recolher exigências
                                    </>
                                ) : (
                                    <>
                                        <ChevronDown className="h-4 w-4" />
                                        Ver exigências
                                    </>
                                )}
                            </button>
                        </div>
        
                        {exigenciasAbertas && (
                            <div className="mt-2 max-h-64 space-y-1.5 overflow-y-auto pr-1 scrollbar-discreta">
                                {avaliacaoSelecionado.itens.map((item) => (
                                    <div key={item.treinamento.id} className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 text-xs">
                                        <span className="font-medium text-slate-700">{item.treinamento.nome}</span>
                                        <span className={classNames("rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1", item.status.classe)}>
                                            {item.status.texto}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
        
                <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                        <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Realização / emissão</label>
                        <input
                            type="date"
                            value={dataRealizacao}
                            onChange={(e) => setDataRealizacao(e.target.value)}
                            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                        />
                    </div>
        
                    <div>
                        <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Validade / vencimento</label>
                        <input
                            type="date"
                            value={vencimento}
                            readOnly
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                        />
                    </div>
                </div>
        
                <textarea
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                    placeholder="Observação opcional"
                    rows={3}
                    className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                />
        
                <label className={classNames(
                    "flex items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-600 hover:bg-slate-100",
                    analisandoArquivoCertificado || salvandoCertificado ? "cursor-wait opacity-80" : "cursor-pointer"
                )}>
                    {analisandoArquivoCertificado ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Upload className="h-4 w-4" />
                    )}
                    {analisandoArquivoCertificado
                        ? "Analisando documento..."
                        : arquivoSelecionado
                            ? arquivoSelecionado.name
                            : "Selecionar PDF ou imagem do certificado"}
                    <input
                        type="file"
                        accept="application/pdf,image/*"
                        disabled={analisandoArquivoCertificado || salvandoCertificado}
                        className="hidden"
                        onChange={(e) => selecionarArquivoCertificado(e.target.files?.[0] || null)}
                    />
                </label>
                <FileUploadAviso arquivo={arquivoSelecionado} tipo="documentoSimples" />

                {analisandoArquivoCertificado && (
                    <div className="flex items-start gap-3 rounded-2xl bg-blue-50 px-4 py-3 text-sm text-blue-800 ring-1 ring-blue-100">
                        <FileSearch className="mt-0.5 h-5 w-5 shrink-0" />
                        <div className="min-w-0">
                            <p className="font-bold">Documento sendo analisado</p>
                            <p className="mt-0.5 text-xs leading-relaxed text-blue-700/80">
                                Aguarde a leitura do PDF/OCR antes de salvar. O sistema está tentando identificar tipo documental e data principal do arquivo.
                            </p>
                        </div>
                        <Loader2 className="ml-auto h-5 w-5 shrink-0 animate-spin" />
                    </div>
                )}
        
                {sugestaoDataArquivo && (
                    <div className={classNames(
                        "rounded-2xl px-3 py-2 text-xs font-medium ring-1",
                        sugestaoDataArquivo.data
                            ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                            : "bg-orange-50 text-orange-700 ring-orange-100"
                    )}>
                        {sugestaoDataArquivo.mensagem}
                    </div>
                )}
        
                <button
                    onClick={adicionarTreinamento}
                    disabled={salvandoCertificado || analisandoArquivoCertificado}
                    className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {analisandoArquivoCertificado
                        ? "Aguardando análise do documento..."
                        : salvandoCertificado
                            ? "Salvando no Supabase..."
                            : "Salvar certificado no banco"}
                </button>
        
                <EnvioLoteTreinamentos
                    arquivosLote={arquivosLote}
                    prepararArquivosLote={prepararArquivosLote}
                    sincronizarArquivosDoStorage={sincronizarArquivosDoStorage}
                    sincronizandoStorage={sincronizandoStorage}
                    resultadoLote={resultadoLote}
                    colabSelecionado={colabSelecionado}
                    removerArquivoLote={removerArquivoLote}
                    alterarColaboradorArquivoLote={alterarColaboradorArquivoLote}
                    alterarTreinamentoArquivoLote={alterarTreinamentoArquivoLote}
                    alterarDataArquivoLote={alterarDataArquivoLote}
                    colaboradores={colaboradores}
                    treinamentosBase={treinamentosBase}
                    salvarCertificadosEmLote={salvarCertificadosEmLote}
                    salvandoLote={salvandoLote}
                    preparandoLoteCertificados={preparandoLoteCertificados}
                />
            </div>
            )}
        </Card>
    );
}
