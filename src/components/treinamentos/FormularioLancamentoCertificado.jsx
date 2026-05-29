/* eslint-disable no-unused-vars */
import React from "react";
import {
    ChevronDown,
    ChevronUp,
    FileText,
    Upload,
} from "lucide-react";
import { Card } from "../commonComponents";
import { FileUploadAviso } from "../FileUploadAviso";
import { classNames } from "../../utils/sstUtils";

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
    salvandoCertificado,
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
}) {
    return (
        <Card>
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-950">
                <Upload className="h-4 w-4" />
                Lançar certificado
            </h2>
            <p className="mt-1 text-sm text-slate-500">
                O arquivo será salvo no Supabase Storage usando o código do funcionário e o registro ficará vinculado ao UUID real do colaborador.
            </p>
        
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
        
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-600 hover:bg-slate-100">
                    <Upload className="h-4 w-4" />
                    {arquivoSelecionado ? arquivoSelecionado.name : "Selecionar PDF ou imagem do certificado"}
                    <input
                        type="file"
                        accept="application/pdf,image/*"
                        className="hidden"
                        onChange={(e) => selecionarArquivoCertificado(e.target.files?.[0] || null)}
                    />
                </label>
                <FileUploadAviso arquivo={arquivoSelecionado} tipo="documentoSimples" />
        
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
                    disabled={salvandoCertificado}
                    className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {salvandoCertificado ? "Salvando no Supabase..." : "Salvar certificado no banco"}
                </button>
        
                <div className="mt-6 border-t border-slate-200 pt-5">
                    <div className="rounded-3xl bg-blue-50 p-4">
                        <h3 className="flex items-center gap-2 text-sm font-bold text-blue-900">
                            <Upload className="h-4 w-4" />
                            Envio em lote
                        </h3>
                        <p className="mt-1 text-xs text-blue-800/80">
                            Selecione vários arquivos. O sistema tenta distribuir pelo nome do arquivo e identificar a data de emissão/realização no nome ou no conteúdo do PDF.
                            Antes de salvar, confira colaborador, treinamento e data de cada documento.
                        </p>
                    </div>
        
                    <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-blue-300 bg-white px-4 py-4 text-sm font-semibold text-blue-700 hover:bg-blue-50">
                        <Upload className="h-4 w-4" />
                        Selecionar vários certificados
                        <input
                            type="file"
                            accept="application/pdf,image/*"
                            multiple
                            className="hidden"
                            onChange={(e) => prepararArquivosLote(e.target.files)}
                        />
                    </label>
                    <FileUploadAviso arquivos={arquivosLote.map((item) => item.arquivo)} tipo="documentoSimples" />
        
                    <button
                        type="button"
                        onClick={sincronizarArquivosDoStorage}
                        disabled={sincronizandoStorage}
                        className="mt-3 w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {sincronizandoStorage ? "Sincronizando arquivos..." : "Sincronizar arquivos já enviados no Storage"}
                    </button>
        
                    {resultadoLote && arquivosLote.length === 0 && (
                        <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm font-semibold text-slate-700">
                            {resultadoLote}
                        </div>
                    )}
        
                    {arquivosLote.length > 0 && (
                        <div className="mt-4 space-y-3">
                            <div className="rounded-2xl bg-slate-50 p-3 text-xs text-slate-600">
                                <strong>Regra do lote:</strong> os arquivos serão vinculados ao colaborador selecionado
                                {" "}<strong>{colabSelecionado?.nome}</strong>. O treinamento é identificado automaticamente pelo nome de cada arquivo.
                                Confira qualquer item marcado como atenção antes de salvar.
                            </div>
        
                            <div className="max-h-96 space-y-2 overflow-y-auto pr-1 scrollbar-discreta">
                                {arquivosLote.map((item) => (
                                    <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-3">
                                        <div className="mb-2 flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-semibold text-slate-800">
                                                    <FileText className="mr-1 inline h-4 w-4" />
                                                    {item.arquivo.name}
                                                </p>
                                                <p className={classNames(
                                                    "mt-1 text-xs font-medium",
                                                    item.status === "Treinamento identificado" ||
                                                        item.status === "Treinamento e data identificados" ||
                                                        item.status === "Conferido"
                                                        ? "text-emerald-700"
                                                        : "text-orange-700"
                                                )}>
                                                    {item.status}
                                                </p>
                                                {item.sugestaoData?.mensagem && (
                                                    <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                                                        {item.sugestaoData.mensagem}
                                                    </p>
                                                )}
                                            </div>
        
                                            <button
                                                type="button"
                                                onClick={() => removerArquivoLote(item.id)}
                                                className="rounded-xl bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-100"
                                            >
                                                Remover
                                            </button>
                                        </div>
        
                                        <div className="grid gap-2">
                                            <div>
                                                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">Colaborador de destino</label>
                                                <select
                                                    value={item.colaboradorCodigo}
                                                    onChange={(e) => alterarColaboradorArquivoLote(item.id, e.target.value)}
                                                    className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                                                >
                                                    <option value="">Selecione o colaborador</option>
                                                    {colaboradores.map((c) => (
                                                        <option key={c.id} value={c.codigoFuncionario}>
                                                            {c.nome} — {c.empresaExibicao || c.empresa} — {c.codigoFuncionario}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
        
                                            <div>
                                                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">Treinamento identificado</label>
                                                <select
                                                    value={item.treinamentoId}
                                                    onChange={(e) => alterarTreinamentoArquivoLote(item.id, e.target.value)}
                                                    className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                                                >
                                                    <option value="">Selecione o treinamento</option>
                                                    {treinamentosBase.map((treinamento) => (
                                                        <option key={treinamento.id} value={treinamento.id}>
                                                            {treinamento.nome}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
        
                                            <div className="grid gap-2 sm:grid-cols-2">
                                                <div>
                                                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">Realização</label>
                                                    <input
                                                        type="date"
                                                        value={item.dataRealizacao}
                                                        onChange={(e) => alterarDataArquivoLote(item.id, e.target.value)}
                                                        className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                                                    />
                                                </div>
        
                                                <div>
                                                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">Vencimento</label>
                                                    <input
                                                        type="date"
                                                        value={item.dataVencimento}
                                                        readOnly
                                                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
        
                            {resultadoLote && (
                                <div className="rounded-2xl bg-slate-50 p-3 text-sm font-semibold text-slate-700">
                                    {resultadoLote}
                                </div>
                            )}
        
                            <button
                                onClick={salvarCertificadosEmLote}
                                disabled={salvandoLote}
                                className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {salvandoLote ? "Salvando lote..." : `Salvar ${arquivosLote.length} certificado(s) distribuído(s)`}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </Card>
    );
}
