/* eslint-disable no-unused-vars */
import React from "react";
import { FileSearch, FileText, Loader2, Upload } from "lucide-react";
import { FileUploadAviso } from "../FileUploadAviso";
import { classNames } from "../../utils/sstUtils";
import IndicadorSalvandoDocumento from "./IndicadorSalvandoDocumento";

export function EnvioLoteTreinamentos({
    arquivosLote = [],
    prepararArquivosLote,
    sincronizarArquivosDoStorage,
    sincronizandoStorage = false,
    resultadoLote = "",
    colabSelecionado = null,
    removerArquivoLote,
    alterarColaboradorArquivoLote,
    alterarTreinamentoArquivoLote,
    alterarDataArquivoLote,
    colaboradores = [],
    treinamentosBase = [],
    salvarCertificadosEmLote,
    salvandoLote = false,
    preparandoLoteCertificados = false,
}) {
    const inputLoteId = "treinamentos-envio-lote-arquivos";
      const arquivosPendentesProcessamento = arquivosLote.filter((item) => item.statusProcessamento !== "salvo");
      const totalArquivosSalvosProcessamento = arquivosLote.filter((item) => item.statusProcessamento === "salvo").length;
      const totalArquivosFalhaProcessamento = arquivosLote.filter((item) => item.statusProcessamento === "falhou").length;
      const totalArquivosParaSalvarProcessamento = arquivosPendentesProcessamento.length;
      const textoBotaoSalvarLote = totalArquivosParaSalvarProcessamento === 0
          ? "Todos os documentos do lote já foram salvos"
          : totalArquivosFalhaProcessamento > 0
              ? `Revisar ${totalArquivosParaSalvarProcessamento} documento(s) com falha`
              : totalArquivosSalvosProcessamento > 0
                  ? `Salvar ${totalArquivosParaSalvarProcessamento} documento(s) restante(s)`
                  : `Salvar ${arquivosLote.length} certificado(s) distribuído(s)`;

    return (
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

            <label htmlFor={inputLoteId} className={classNames(
                "mt-3 flex items-center justify-center gap-2 rounded-2xl border border-dashed border-blue-300 bg-white px-4 py-4 text-sm font-semibold text-blue-700 hover:bg-blue-50",
                preparandoLoteCertificados ? "cursor-wait opacity-80" : "cursor-pointer"
            )}>
                {preparandoLoteCertificados ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    <Upload className="h-4 w-4" />
                )}
                {preparandoLoteCertificados ? "Analisando certificados do lote..." : "Selecionar vários certificados"}
                <input
                    id={inputLoteId}
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/*"
                    multiple
                    disabled={preparandoLoteCertificados}
                    className="hidden"
                    onChange={async (e) => {
                        const arquivos = e.target.files;
                        await prepararArquivosLote?.(arquivos);
                        e.target.value = "";
                    }}
                />
            </label>
            <FileUploadAviso arquivos={arquivosLote.map((item) => item.arquivo)} tipo="documentoSimples" />

            {preparandoLoteCertificados && (
                <div className="mt-3 flex items-start gap-3 rounded-2xl bg-blue-100 px-4 py-3 text-sm text-blue-900 ring-1 ring-blue-200">
                    <FileSearch className="mt-0.5 h-5 w-5 shrink-0" />
                    <div className="min-w-0">
                        <p className="font-bold">Documentos do lote sendo analisados</p>
                        <p className="mt-0.5 text-xs leading-relaxed text-blue-800/80">
                            Aguarde a identificação automática de colaborador, tipo documental e datas antes de salvar o lote.
                        </p>
                    </div>
                    <Loader2 className="ml-auto h-5 w-5 shrink-0 animate-spin" />
                </div>
            )}

            <button
                type="button"
                onClick={sincronizarArquivosDoStorage}
                disabled={sincronizandoStorage}
                className="mt-3 w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
                {sincronizandoStorage ? "Sincronizando arquivos..." : "Sincronizar arquivos já enviados no Storage"}
            </button>

            {resultadoLote && arquivosLote.length === 0 && (
                <div className="mt-3 whitespace-pre-line rounded-2xl bg-slate-50 p-3 text-sm font-semibold leading-relaxed text-slate-700">
                    {resultadoLote}
                </div>
            )}

            {arquivosLote.length > 0 && (
                <div className="mt-4 space-y-3">
                    <div className="rounded-2xl bg-slate-50 p-3 text-xs text-slate-600">
                        <strong>Regra do lote:</strong> os arquivos serao analisados antes do salvamento para confirmar colaborador, treinamento, nome e assinatura quando aplicavel.
                        {" "}O colaborador selecionado <strong>{colabSelecionado?.nome}</strong> sera usado apenas como referencia inicial.
                        Documentos coletivos/listas de presenca sem nome e assinatura confirmados devem ficar em conferencia manual.
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

                                        {item.tipoDocumentoTreinamentoLabel && (
                                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                                <span className={classNames(
                                                    "inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ring-1",
                                                    item.tipoDocumentoTreinamento === "individual"
                                                        ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                                                        : item.tipoDocumentoTreinamento === "lista_presenca"
                                                            ? "bg-blue-50 text-blue-700 ring-blue-200"
                                                            : "bg-amber-50 text-amber-700 ring-amber-200"
                                                )}>
                                                    Tipo detectado: {item.tipoDocumentoTreinamentoLabel}
                                                </span>

                                                {item.tipoDocumentoTreinamentoConfianca ? (
                                                    <span className="text-[11px] font-semibold text-slate-500">
                                                        Confiança: {item.tipoDocumentoTreinamentoConfianca}%
                                                    </span>
                                                ) : null}
                                            </div>
                                        )}

                                        {item.tipoDocumentoTreinamentoMotivo && (
                                            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                                                {item.tipoDocumentoTreinamentoMotivo}
                                            </p>
                                        )}

                                        {item.statusProcessamento && (
                                              <div className="mt-2">
                                                  <span className={classNames(
                                                      "inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ring-1",
                                                      item.statusProcessamento === "salvo"
                                                          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                                                          : item.statusProcessamento === "falhou"
                                                              ? "bg-red-50 text-red-700 ring-red-200"
                                                              : item.statusProcessamento === "salvando"
                                                                  ? "bg-blue-50 text-blue-700 ring-blue-200"
                                                                  : "bg-slate-50 text-slate-700 ring-slate-200"
                                                  )}>
                                                      Status do envio: {
                                                          item.statusProcessamento === "salvo"
                                                              ? "Salvo"
                                                              : item.statusProcessamento === "falhou"
                                                                  ? "Falhou"
                                                                  : item.statusProcessamento === "salvando"
                                                                      ? "Salvando..."
                                                                      : "Pendente"
                                                      }
                                                  </span>
                                              </div>
                                          )}

                                          {item.erroProcessamento && (
                                              <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-[11px] font-semibold leading-relaxed text-red-700 ring-1 ring-red-200">
                                                  {item.erroProcessamento}
                                              </p>
                                          )}

                                          {item.sugestaoData?.mensagem && (
                                            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                                                {item.sugestaoData.mensagem}
                                            </p>
                                        )}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => removerArquivoLote(item.id)}
                                          disabled={item.statusProcessamento === "salvando"}
                                        className="rounded-xl bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
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
                                            disabled={item.statusProcessamento === "salvo" || item.statusProcessamento === "salvando"}
                                            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
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
                                            disabled={item.statusProcessamento === "salvo" || item.statusProcessamento === "salvando"}
                                            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
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

                    {(preparandoLoteCertificados || salvandoLote) && (
                <IndicadorSalvandoDocumento
                    titulo={salvandoLote ? "Salvando lote de documentos" : "Analisando documentos do lote"}
                    descricao={salvandoLote ? "Aguarde enquanto os certificados são enviados e distribuídos para o colaborador." : "Aguarde enquanto o sistema lê os arquivos e prepara a conferência."}
                    detalhe="Esse processo pode levar alguns segundos em arquivos PDF escaneados."
                />
            )}

            {resultadoLote && (
                        <div className="whitespace-pre-line rounded-2xl bg-slate-50 p-3 text-sm font-semibold leading-relaxed text-slate-700">
                            {resultadoLote}
                        </div>
                    )}

                    <button
                        onClick={salvarCertificadosEmLote}
                        disabled={salvandoLote || preparandoLoteCertificados || totalArquivosParaSalvarProcessamento === 0}
                        className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {preparandoLoteCertificados
                            ? "Aguardando análise do lote..."
                            : salvandoLote
                                ? (
                                <span className="inline-flex items-center justify-center gap-2">
                                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/50 border-t-white" />
                                    Salvando lote... aguarde
                                </span>
                            )
                                : textoBotaoSalvarLote}
                    </button>
                </div>
            )}
        </div>
    );
}
