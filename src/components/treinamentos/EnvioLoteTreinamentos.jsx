/* eslint-disable no-unused-vars */
import React from "react";
import { CheckCircle2, FileSearch, FileText, Loader2, TriangleAlert, Upload } from "lucide-react";
import { FileUploadAviso } from "../FileUploadAviso";
import { classNames } from "../../utils/sstUtils";
import { avaliarTreinamentosColaborador } from "../../services/colaboradorDocumentosService";
import IndicadorSalvandoDocumento from "./IndicadorSalvandoDocumento";

function obterDivergenciaGradeArquivoLote({
    item,
    colaboradores = [],
    treinamentosBase = [],
}) {
    const treinamentoId =
        Number(
            item?.treinamentoId
        );

    const colaborador =
        colaboradores.find(
            (registro) =>
                String(
                    registro?.codigoFuncionario ||
                    ""
                ) ===
                String(
                    item?.colaboradorCodigo ||
                    ""
                )
        ) ||
        null;

    if (
        !colaborador ||
        !Number.isFinite(treinamentoId) ||
        treinamentoId <= 0
    ) {
        return null;
    }

    const avaliacao =
        avaliarTreinamentosColaborador(
            colaborador
        );

    const pertenceGrade =
        Array.isArray(
            avaliacao?.itensObrigatoriosMatriz
        ) &&
        avaliacao.itensObrigatoriosMatriz.some(
            (registro) =>
                Number(
                    registro?.treinamento?.id
                ) ===
                treinamentoId
        );

    if (pertenceGrade) {
        return null;
    }

    const treinamento =
        treinamentosBase.find(
            (registro) =>
                Number(registro?.id) ===
                treinamentoId
        ) ||
        null;

    return {
        colaborador,
        treinamento,
        treinamentoId,
    };
}

function AlertaTreinamentoForaGrade({
    item,
    colaboradores,
    treinamentosBase,
    onAdicionarTreinamentoGrade,
    adicionandoTreinamentoGradeArquivoId,
    podeAdicionarTreinamentoGrade,
}) {
    const [
        feedbackAdicionado,
        setFeedbackAdicionado,
    ] = React.useState(null);

    const [
        confirmacaoAberta,
        setConfirmacaoAberta,
    ] = React.useState(false);

    const divergencia =
        obterDivergenciaGradeArquivoLote({
            item,
            colaboradores,
            treinamentosBase,
        });

    const carregando =
        String(
            adicionandoTreinamentoGradeArquivoId ||
            ""
        ) ===
        String(
            item?.id ||
            ""
        );

    const bloqueadoPorProcessamento =
        item?.statusProcessamento ===
        "salvando";

    const podeAcionar =
        Boolean(
            divergencia &&
            podeAdicionarTreinamentoGrade &&
            typeof onAdicionarTreinamentoGrade ===
                "function" &&
            !carregando &&
            !bloqueadoPorProcessamento
        );

    /*
     * O feedback fica antes do teste de divergência porque,
     * depois que o colaborador é atualizado, a divergência deixa
     * de existir. Mesmo assim queremos mostrar a confirmação visual
     * por alguns segundos.
     */
    if (feedbackAdicionado) {
        return (
            <div
                aria-live="polite"
                className="relative overflow-hidden rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50/80 via-white to-white px-4 py-3 shadow-[0_3px_12px_rgba(16,185,129,0.08)]"
            >
                <span className="absolute inset-y-0 left-0 w-1 rounded-l-xl bg-emerald-500" />

                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-5">
                    <div className="flex min-w-0 items-start gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200">
                            <span
                                aria-hidden="true"
                                className="text-base font-black leading-none"
                            >
                                ✓
                            </span>
                        </span>

                        <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-black uppercase tracking-[0.1em] text-emerald-700">
                                Adicionado à grade individual
                            </p>

                            <p className="mt-1 break-words text-[13px] font-black leading-tight text-slate-950">
                                {feedbackAdicionado.treinamentoNome}
                            </p>

                            <p className="mt-1 text-[10px] font-medium leading-relaxed text-slate-600">
                                O treinamento agora faz parte da grade individual de{" "}
                                <strong className="font-black text-slate-800">
                                    {feedbackAdicionado.colaboradorNome}
                                </strong>.
                            </p>

                            <p className="mt-0.5 text-[9px] font-semibold leading-relaxed text-emerald-700/80">
                                A matriz global da função não foi alterada.
                            </p>
                        </div>
                    </div>

                    <span className="inline-flex items-center justify-center whitespace-nowrap rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.08em] text-emerald-700 shadow-sm">
                        Grade individual
                    </span>
                </div>
            </div>
        );
    }

    if (!divergencia) {
        return null;
    }

    const treinamentoNome =
        divergencia.treinamento?.nome ||
        `Treinamento ${divergencia.treinamentoId}`;

    const colaboradorNome =
        divergencia.colaborador?.nome ||
        "Colaborador não identificado";

    const funcaoColaborador =
        String(
            divergencia.colaborador?.funcao ||
            "Função não informada"
        ).trim();

    const confirmarAdicao =
        async () => {
            if (!podeAcionar) {
                return;
            }

            const sucesso =
                await onAdicionarTreinamentoGrade({
                    arquivoId:
                        item.id,

                    colaboradorCodigo:
                        item.colaboradorCodigo,

                    treinamentoId:
                        item.treinamentoId,
                });

            if (!sucesso) {
                return;
            }

            setConfirmacaoAberta(
                false
            );

            setFeedbackAdicionado({
                treinamentoNome,
                colaboradorNome,
            });

            if (
                typeof window !==
                "undefined"
            ) {
                window.setTimeout(
                    () => {
                        setFeedbackAdicionado(
                            null
                        );
                    },
                    5000
                );
            }
        };

    return (
        <>
            <div className="relative overflow-hidden rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50/75 via-white to-white px-4 py-3 shadow-[0_3px_12px_rgba(146,64,14,0.06)]">
                <span className="absolute inset-y-0 left-0 w-1 rounded-l-xl bg-amber-400" />

                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-6">
                    <div className="flex min-w-0 items-start gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100/80 text-amber-700 ring-1 ring-amber-200">
                            <TriangleAlert className="h-4 w-4" />
                        </span>

                        <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-black uppercase tracking-[0.1em] text-amber-700">
                                Fora da grade individual
                            </p>

                            <p className="mt-1 break-words text-[13px] font-black leading-tight text-slate-950">
                                {treinamentoNome}
                            </p>

                            <p className="mt-1 text-[10px] font-medium leading-relaxed text-slate-600">
                                Este treinamento não faz parte da grade individual de{" "}
                                <strong className="font-black text-slate-800">
                                    {colaboradorNome}
                                </strong>.
                            </p>

                            <p className="mt-0.5 text-[9px] font-medium leading-relaxed text-slate-500">
                                O documento pode ser salvo normalmente sem alterar a grade.
                            </p>

                            {!podeAdicionarTreinamentoGrade ? (
                                <p className="mt-1 text-[9px] font-semibold leading-relaxed text-amber-700/80">
                                    Seu perfil não possui permissão para alterar a grade individual do colaborador.
                                </p>
                            ) : null}
                        </div>
                    </div>

                    <div className="ml-12 shrink-0 self-start lg:ml-0 lg:justify-self-end lg:self-center">
                        <button
                            type="button"
                            disabled={!podeAcionar}
                            onClick={() => {
                                if (!podeAcionar) {
                                    return;
                                }

                                setConfirmacaoAberta(
                                    true
                                );
                            }}
                            className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-amber-300 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-wide text-amber-800 shadow-sm transition hover:border-amber-400 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-amber-50 text-amber-800 ring-1 ring-amber-200">
                                <span
                                    aria-hidden="true"
                                    className="text-[14px] font-bold leading-none"
                                >
                                    +
                                </span>
                            </span>

                            <span>
                                Adicionar à grade individual
                            </span>
                        </button>
                    </div>
                </div>
            </div>

            {confirmacaoAberta ? (
                <div
                    className="fixed inset-0 z-[120] flex items-center justify-center p-4"
                    role="presentation"
                >
                    <div
                        className="absolute inset-0 bg-slate-950/55 backdrop-blur-[2px]"
                        onClick={() => {
                            if (!carregando) {
                                setConfirmacaoAberta(
                                    false
                                );
                            }
                        }}
                    />

                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby={`confirmar-grade-${item?.id || "treinamento"}`}
                        className="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
                        onClick={(evento) =>
                            evento.stopPropagation()
                        }
                    >
                        <div className="border-b border-slate-100 px-6 py-5">
                            <div className="flex items-start gap-4">
                                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 ring-1 ring-amber-200">
                                    <TriangleAlert className="h-5 w-5" />
                                </span>

                                <div className="min-w-0">
                                    <p className="text-[10px] font-black uppercase tracking-[0.11em] text-amber-700">
                                        Grade individual
                                    </p>

                                    <h3
                                        id={`confirmar-grade-${item?.id || "treinamento"}`}
                                        className="mt-1 text-lg font-black leading-tight text-slate-950"
                                    >
                                        Adicionar à grade individual?
                                    </h3>

                                    <p className="mt-2 break-words text-sm font-bold leading-snug text-slate-800">
                                        {treinamentoNome}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 px-6 py-5">
                            <p className="text-sm leading-relaxed text-slate-600">
                                O treinamento será incluído somente na grade de{" "}
                                <strong className="font-black text-slate-900">
                                    {colaboradorNome}
                                </strong>.
                            </p>

                            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3">
                                <p className="text-[10px] font-black uppercase tracking-[0.08em] text-emerald-700">
                                    Matriz global preservada
                                </p>

                                <p className="mt-1 text-xs font-medium leading-relaxed text-slate-600">
                                    A matriz global da função{" "}
                                    <strong className="font-black text-slate-800">
                                        {funcaoColaborador}
                                    </strong>{" "}
                                    não será modificada.
                                </p>
                            </div>

                            <p className="text-[11px] leading-relaxed text-slate-500">
                                O documento poderá continuar sendo salvo normalmente mesmo sem essa alteração.
                            </p>
                        </div>

                        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/70 px-6 py-4 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                disabled={carregando}
                                onClick={() =>
                                    setConfirmacaoAberta(
                                        false
                                    )
                                }
                                className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-wide text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Cancelar
                            </button>

                            <button
                                type="button"
                                disabled={carregando}
                                onClick={confirmarAdicao}
                                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-xs font-black uppercase tracking-wide text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {carregando ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Adicionando...
                                    </>
                                ) : (
                                    <>
                                        <span
                                            aria-hidden="true"
                                            className="text-base leading-none"
                                        >
                                            +
                                        </span>

                                        Confirmar adição
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </>
    );
}
function obterNomeEmpresaDiretaSelecaoTreinamentos(
    colaborador = {}
) {
    const empresaCompleta =
        String(
            colaborador?.empresaExibicao ||
            colaborador?.empresa_exibicao ||
            colaborador?.empresaNome ||
            colaborador?.empresa_nome ||
            colaborador?.empresa ||
            "Empresa não informada"
        )
            .replace(/\s+/g, " ")
            .trim();

    const partes =
        empresaCompleta.split(
            /\bsubcontratada\s*:/i
        );

    const nomeExtraido =
        String(
            partes.length > 1
                ? partes[partes.length - 1]
                : ""
        )
            .replace(/\s+/g, " ")
            .trim();

    return (
        String(
            nomeExtraido ||
            colaborador?.empresaNome ||
            colaborador?.empresa_nome ||
            colaborador?.empresa ||
            empresaCompleta ||
            "Empresa não informada"
        )
            .replace(/\s+/g, " ")
            .trim() ||
        "Empresa não informada"
    );
}

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
    onAdicionarTreinamentoGrade,
    adicionandoTreinamentoGradeArquivoId = "",
    podeAdicionarTreinamentoGrade = false,
    salvarCertificadosEmLote,
    salvandoLote = false,
    preparandoLoteCertificados = false,
}) {
    const inputLoteId = "treinamentos-envio-lote-arquivos";
      const arquivosPendentesProcessamento = arquivosLote.filter((item) => item.statusProcessamento !== "salvo");
      const totalArquivosSalvosProcessamento = arquivosLote.filter((item) => item.statusProcessamento === "salvo").length;
      const percentualSalvamentoLote =
          arquivosLote.length > 0
              ? Math.round(
                  (totalArquivosSalvosProcessamento / arquivosLote.length) * 100
              )
              : 0;
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
                "mt-3 flex min-h-[58px] items-center justify-center gap-2 rounded-2xl border border-dashed border-blue-300 bg-gradient-to-r from-white via-blue-50/40 to-white px-4 py-4 text-sm font-bold text-blue-700 shadow-sm transition hover:bg-blue-50",
                preparandoLoteCertificados ? "cursor-wait border-solid border-blue-200 bg-blue-50 opacity-100" : "cursor-pointer"
            )}>
                {preparandoLoteCertificados ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    <Upload className="h-4 w-4" />
                )}
                {preparandoLoteCertificados ? "Analisando certificados do lote — preparando conferência..." : "Selecionar vários certificados"}
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

            {false && preparandoLoteCertificados && (
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

            {resultadoLote && arquivosLote.length === 0 && !preparandoLoteCertificados && !salvandoLote && (
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

                    <div
                                        className="max-h-96 space-y-2 overflow-y-auto py-3 pr-1 scrollbar-discreta"
                                        style={{
                                            WebkitMaskImage:
                                                "linear-gradient(to bottom, transparent 0, black 10px, black calc(100% - 10px), transparent 100%)",
                                            maskImage:
                                                "linear-gradient(to bottom, transparent 0, black 10px, black calc(100% - 10px), transparent 100%)",
                                            scrollPaddingBlock:
                                                "12px",
                                            scrollbarGutter:
                                                "stable",
                                        }}
                                    >
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
                                                    {c.nome} — {obterNomeEmpresaDiretaSelecaoTreinamentos(c)} — {c.codigoFuncionario}
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

                                    <AlertaTreinamentoForaGrade
                                        item={item}
                                        colaboradores={colaboradores}
                                        treinamentosBase={treinamentosBase}
                                        onAdicionarTreinamentoGrade={onAdicionarTreinamentoGrade}
                                        adicionandoTreinamentoGradeArquivoId={adicionandoTreinamentoGradeArquivoId}
                                        podeAdicionarTreinamentoGrade={podeAdicionarTreinamentoGrade}
                                    />

                                    {item.dataIdentificadaDocumento === false && item.dataConferidaManualmente !== true && (
                                        <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 shadow-sm">
                                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                                <div className="flex min-w-0 items-start gap-3">
                                                    <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-black text-amber-800 ring-1 ring-amber-300">
                                                        !
                                                    </span>

                                                    <div className="min-w-0">
                                                        <p className="text-xs font-black uppercase tracking-[0.08em] text-amber-900">
                                                            Data não identificada
                                                        </p>

                                                        <p className="mt-1 text-xs font-semibold leading-relaxed text-amber-900">
                                                            O sistema não encontrou uma data válida neste documento.
                                                        </p>

                                                        <p className="mt-1 text-xs leading-relaxed text-amber-800">
                                                            {item.dataProvisoria
                                                                ? "A data exibida abaixo foi preenchida automaticamente como referência provisória. Confira o documento e informe a data correta antes de salvar."
                                                                : "Confira o documento e informe manualmente a data correta antes de salvar."}
                                                        </p>
                                                    </div>
                                                </div>

                                                {item.dataRealizacao ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => alterarDataArquivoLote(item.id, item.dataRealizacao)}
                                                        disabled={item.statusProcessamento === "salvo" || item.statusProcessamento === "salvando"}
                                                        className="shrink-0 rounded-xl border border-amber-400 bg-white px-3 py-2 text-[11px] font-bold text-amber-900 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                                                    >
                                                        Confirmar data exibida
                                                    </button>
                                                ) : null}
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid gap-2 sm:grid-cols-2">
                                        <div>
                                            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">Realização</label>
                                            <input
                                                type="date"
                                                value={item.dataRealizacao}
                                                onChange={(e) => alterarDataArquivoLote(item.id, e.target.value)}
                                                className={classNames(
                                                    "w-full rounded-2xl border px-3 py-2 text-sm outline-none focus:ring-2",
                                                    item.dataIdentificadaDocumento === false && item.dataConferidaManualmente !== true
                                                        ? "border-amber-400 bg-amber-50 ring-2 ring-amber-100 focus:ring-amber-200"
                                                        : "border-slate-200 bg-white focus:ring-slate-300"
                                                )}
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
                    titulo={salvandoLote ? "Salvando documentos do lote" : "Preparando conferência do lote"}
                    descricao={salvandoLote ? "Os certificados estão sendo enviados e distribuídos para os colaboradores definidos." : "O sistema está lendo os arquivos e organizando os dados identificados."}
                    detalhe="Mantenha esta tela aberta até a conclusão do processo."
                    percentual={salvandoLote ? percentualSalvamentoLote : null}
                    atual={salvandoLote ? totalArquivosSalvosProcessamento : null}
                    total={salvandoLote ? arquivosLote.length : null}
                />
            )}

            {resultadoLote && !preparandoLoteCertificados && !salvandoLote && (
                        <div className="whitespace-pre-line rounded-2xl bg-slate-50 p-3 text-sm font-semibold leading-relaxed text-slate-700">
                            {resultadoLote}
                        </div>
                    )}

                    <button
                        onClick={salvarCertificadosEmLote}
                        disabled={salvandoLote || preparandoLoteCertificados || totalArquivosParaSalvarProcessamento === 0}
                        className="ml-4 mr-6 w-[calc(100%-2.5rem)] rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {preparandoLoteCertificados
                            ? "Aguardando análise do lote..."
                            : salvandoLote
                                ? (
                                <span className="inline-flex items-center justify-center gap-2">
                                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/50 border-t-white" />
                                    Salvando documentos do lote — aguarde
                                </span>
                            )
                                : textoBotaoSalvarLote}
                    </button>
                </div>
            )}
        </div>
    );
}
