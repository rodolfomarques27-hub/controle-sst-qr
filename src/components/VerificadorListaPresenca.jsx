import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  Search,
  ShieldCheck,
  Upload,
  XCircle,
} from "lucide-react";
import usePdfTabelaListaPresenca from "../hooks/usePdfTabelaListaPresenca";
import useVerificarListaPresenca, { compararTabelaPdfComColaboradores } from "../hooks/useVerificarListaPresenca";
import { normalizarNome } from "../utils/normalizarNome";

function formatarPercentual(valor) {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) {
    return "0%";
  }

  return `${Math.round(Math.max(0, Math.min(1, numero)) * 100)}%`;
}

function textoStatus(status) {
  switch (status) {
    case "encontrado_e_assinou":
      return "Presente e assinou";
    case "encontrado_sem_assinatura":
      return "Presente, sem assinatura";
    case "conferencia_visual":
      return "Conferência visual";
    default:
      return "Ausente";
  }
}

function classeStatus(status) {
  switch (status) {
    case "encontrado_e_assinou":
      return "border-green-200 bg-green-50 text-green-900";
    case "encontrado_sem_assinatura":
      return "border-amber-200 bg-amber-50 text-amber-900";
    case "conferencia_visual":
      return "border-blue-200 bg-blue-50 text-blue-900";
    default:
      return "border-red-200 bg-red-50 text-red-900";
  }
}

function gerarCsv(itens) {
  const cabecalho = ["Nome cadastro", "Função", "Nome OCR", "Status", "Score", "Motivo"];
  const linhas = [cabecalho.join(";")];

  for (const item of itens) {
    const valores = [
      item?.nomeCadastro || "",
      item?.funcaoCadastro || "",
      item?.nomeOCR || "",
      textoStatus(item?.status),
      String(Math.round(Number(item?.score || 0))),
      item?.motivo || "",
    ];

    linhas.push(valores.map((valor) => `"${String(valor).replace(/"/g, '""')}"`).join(";"));
  }

  return linhas.join("\n");
}

function gerarCsvTextoLimpo(valor) {
  return String(valor ?? "").replace(/\r\n?/g, "\n");
}

function formatarBboxCurto(bbox) {
  if (!bbox || typeof bbox !== "object") {
    return "-";
  }

  const x0 = Number(bbox.x0);
  const y0 = Number(bbox.y0);
  const x1 = Number(bbox.x1);
  const y1 = Number(bbox.y1);

  if (![x0, y0, x1, y1].every((valor) => Number.isFinite(valor))) {
    return "-";
  }

  return `x0:${Math.round(x0)} y0:${Math.round(y0)} x1:${Math.round(x1)} y1:${Math.round(y1)}`;
}

export default function VerificadorListaPresenca({
  colaboradores = [],
  colaboradorId = null,
  onConcluido = null,
}) {
  const [arquivo, setArquivo] = useState(null);
  const [termoBusca, setTermoBusca] = useState("");
  const [modoLeituraPdf, setModoLeituraPdf] = useState("tabela_pdf");
  const [resultadoTabelaPdf, setResultadoTabelaPdf] = useState(null);
  const [resultadoTabelaPdfComparada, setResultadoTabelaPdfComparada] = useState(null);
  const [erroTabelaPdf, setErroTabelaPdf] = useState("");
  const [erroComparacaoTabelaPdf, setErroComparacaoTabelaPdf] = useState("");
  const inputRef = useRef(null);

  const {
    resultado: resultadoOcr,
    carregando: carregandoOcr,
    erro: erroOcr,
    progresso: progressoOcr,
    etapa: etapaOcr,
    verificarLista,
  } = useVerificarListaPresenca();

  const leitorTabelaPdf = usePdfTabelaListaPresenca({ ativo: false });

  useEffect(() => {
    setResultadoTabelaPdf(leitorTabelaPdf.resultado || null);
  }, [leitorTabelaPdf.resultado]);

  useEffect(() => {
    setErroTabelaPdf(leitorTabelaPdf.erro || "");
  }, [leitorTabelaPdf.erro]);

  useEffect(() => {
    setResultadoTabelaPdfComparada(null);
    setErroComparacaoTabelaPdf("");
  }, [resultadoTabelaPdf]);

  const itensOcr = useMemo(() => {
    const lista = Array.isArray(resultadoOcr?.resultado) ? resultadoOcr.resultado : [];
    const filtro = normalizarNome(termoBusca);

    if (!filtro) {
      return lista;
    }

    return lista.filter((item) => {
      const nome = normalizarNome(item?.nomeCadastro || "");
      const funcao = normalizarNome(item?.funcaoCadastro || "");
      return nome.includes(filtro) || funcao.includes(filtro);
    });
  }, [resultadoOcr, termoBusca]);

  const resumoOcr = resultadoOcr?.resumo || {};
  const totalOcr = Number(resumoOcr.total ?? itensOcr.length);
  const encontradosOcr = Number(
    resumoOcr.encontrados ??
      itensOcr.filter((item) => item.status === "encontrado_e_assinou" || item.status === "encontrado_sem_assinatura").length,
  );
  const assinadosOcr = Number(resumoOcr.assinados ?? itensOcr.filter((item) => item.assinou).length);
  const provaveisOcr = Number(resumoOcr.provaveis ?? itensOcr.filter((item) => item.status === "conferencia_visual").length);
  const ausentesOcr = Number(resumoOcr.ausentes ?? itensOcr.filter((item) => item.status === "ausente").length);

  const resumoTabela = resultadoTabelaPdf?.diagnostico || {};
  const validacaoTabela = resultadoTabelaPdf?.validacao || {};
  const diagnosticoComparativoAncoraNumerica = resumoTabela?.diagnosticoComparativoAncoraNumerica || null;
  const tabelaInternaConfiavel = Boolean(resumoTabela?.tabelaInternaConfiavel);
  const participantesTabelaBase = tabelaInternaConfiavel && Array.isArray(resultadoTabelaPdf?.participantes) ? resultadoTabelaPdf.participantes : [];
  const totalParticipantesTabela = participantesTabelaBase.length;
  const diagnosticoOcr = resultadoOcr?.diagnosticoOcr || {};
  const amostraLinhasOcr = Array.isArray(diagnosticoOcr?.amostraLinhas) ? diagnosticoOcr.amostraLinhas : [];
  const totalLinhasOcr = Number(diagnosticoOcr?.totalLinhasOcr || 0);
  const totalLinhasComBbox = Number(diagnosticoOcr?.totalLinhasComBbox || 0);
  const totalLinhasSemBbox = Number(diagnosticoOcr?.totalLinhasSemBbox || 0);
  const totalLinhasComConfianca = Number(diagnosticoOcr?.totalLinhasComConfianca || 0);
  const mediaConfiancaLinhas = Math.round(Number(diagnosticoOcr?.mediaConfiancaLinhas || 0));
  const totalLinhasComAssinaturaVisual = Number(diagnosticoOcr?.totalLinhasComAssinaturaVisual || 0);
  const tamanhoTextoCamada = Number(diagnosticoOcr?.tamanhoTextoCamada || 0);
  const diagnosticoEstruturalOcr = diagnosticoOcr?.diagnosticoEstrutural || {};
  const limitesGeraisOcr = diagnosticoEstruturalOcr?.limitesGerais || null;
  const distribuicaoHorizontalOcr = diagnosticoEstruturalOcr?.distribuicaoHorizontal || {};
  const distribuicaoVerticalOcr = diagnosticoEstruturalOcr?.distribuicaoVertical || {};
  const paginasEstruturaisOcr = Array.isArray(diagnosticoEstruturalOcr?.paginas) ? diagnosticoEstruturalOcr.paginas : [];
  const regioesProvaveisOcr = diagnosticoEstruturalOcr?.regioesProvaveis || {};
  const amostraEstruturalOcr = Array.isArray(diagnosticoEstruturalOcr?.amostraEstrutural) ? diagnosticoEstruturalOcr.amostraEstrutural : [];
  const diagnosticoSegmentacaoOcr = diagnosticoOcr?.diagnosticoSegmentacao || {};
  const paginasSegmentacaoOcr = Array.isArray(diagnosticoSegmentacaoOcr?.paginas) ? diagnosticoSegmentacaoOcr.paginas : [];
  const amostraSegmentacaoOcr = Array.isArray(diagnosticoSegmentacaoOcr?.amostraSegmentacao) ? diagnosticoSegmentacaoOcr.amostraSegmentacao : [];
  const diagnosticoOrigemOcr = diagnosticoOcr?.diagnosticoOrigem || {};
  const diagnosticoEstruturaBrutaOcr = diagnosticoOcr?.diagnosticoEstruturaBruta || {};
  const paginasEstruturaBrutaOcr = Array.isArray(diagnosticoEstruturaBrutaOcr?.paginas) ? diagnosticoEstruturaBrutaOcr.paginas : [];
  const participantesTabelaConfiaveis = useMemo(() => participantesTabelaBase, [participantesTabelaBase]);
  const resultadoTabelaPdfComparadaValida = resultadoTabelaPdfComparada?.origem === "pdf_tabela_interna_comparada" ? resultadoTabelaPdfComparada : null;
  const resumoComparacaoTabela = resultadoTabelaPdfComparadaValida?.resumo || null;
  const itensComparacaoTabela = useMemo(() => {
    const lista = Array.isArray(resultadoTabelaPdfComparadaValida?.itens) ? resultadoTabelaPdfComparadaValida.itens : [];
    const filtro = normalizarNome(termoBusca);

    if (!filtro) {
      return lista;
    }

    return lista.filter((item) => {
      const nome = normalizarNome(item?.nomeCadastro || "");
      const funcao = normalizarNome(item?.funcaoCadastro || "");
      const origem = normalizarNome(item?.origem || "");
      return nome.includes(filtro) || funcao.includes(filtro) || origem.includes(filtro);
    });
  }, [resultadoTabelaPdfComparadaValida, termoBusca]);
  const camadaTextoDetectada = Boolean(resumoTabela?.temCamadaTexto);
  const validacaoOk = Boolean(validacaoTabela?.valido) && tabelaInternaConfiavel;
  const podeCompararTabela = tabelaInternaConfiavel && Array.isArray(resultadoTabelaPdf?.participantes) && resultadoTabelaPdf.participantes.length > 0;
  const avisosTabela = [
    ...(Array.isArray(validacaoTabela?.avisos) ? validacaoTabela.avisos : []),
    ...(Array.isArray(resumoTabela?.avisos) ? resumoTabela.avisos : []),
    ...(tabelaInternaConfiavel ? [] : ["Nenhum participante confiável foi detectado na tabela interna do PDF."]),
    ...(erroComparacaoTabelaPdf ? [erroComparacaoTabelaPdf] : []),
    ...(erroTabelaPdf ? [erroTabelaPdf] : []),
  ].filter(Boolean);

  const selecionarArquivo = useCallback((novoArquivo) => {
    if (!novoArquivo) {
      setArquivo(null);
      return;
    }

    const tipoArquivo = String(novoArquivo.type || "").toLowerCase();
    const nomeArquivo = String(novoArquivo.name || "").toLowerCase();
    if (tipoArquivo !== "application/pdf" && !nomeArquivo.endsWith(".pdf")) {
      return;
    }

    setArquivo(novoArquivo);
  }, []);

  const aoAlterarArquivo = useCallback(
    (evento) => {
      selecionarArquivo(evento.target.files?.[0] || null);
    },
    [selecionarArquivo],
  );

  const aoSoltarArquivo = useCallback(
    (evento) => {
      evento.preventDefault();
      selecionarArquivo(evento.dataTransfer.files?.[0] || null);
    },
    [selecionarArquivo],
  );

  const abrirSeletorArquivo = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const exportarCsv = useCallback(() => {
    const lista = Array.isArray(resultadoOcr?.resultado) ? resultadoOcr.resultado : [];
    const conteudo = gerarCsv(lista);
    const blob = new Blob([conteudo], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `lista-presenca-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [resultadoOcr]);

  const iniciarVerificacaoOcr = useCallback(async () => {
    if (!arquivo) {
      return;
    }

    const retorno = await verificarLista({
      arquivo,
      colaboradores,
      colaboradorId,
    });

    if (typeof onConcluido === "function" && retorno && !retorno.erro) {
      onConcluido(retorno);
    }
  }, [arquivo, colaboradorId, colaboradores, onConcluido, verificarLista]);

  const executarLeituraTabela = useCallback(async () => {
    if (!arquivo) {
      setErroTabelaPdf("Selecione um arquivo PDF para ler a tabela interna.");
      return;
    }

    setModoLeituraPdf("tabela_pdf");
    setErroTabelaPdf("");
    setResultadoTabelaPdf(null);
    await leitorTabelaPdf.executar(arquivo);
  }, [arquivo, leitorTabelaPdf]);

  const compararTabelaInterna = useCallback(() => {
    if (!podeCompararTabela) {
      setErroComparacaoTabelaPdf("Nenhum participante confiável foi detectado na tabela interna do PDF para comparar.");
      setResultadoTabelaPdfComparada(null);
      return;
    }

    const comparacao = compararTabelaPdfComColaboradores({
      participantesTabelaPdf: resultadoTabelaPdf?.participantes || [],
      colaboradores,
      colaboradorId,
    });

    setErroComparacaoTabelaPdf("");
    setResultadoTabelaPdfComparada(comparacao);
  }, [colaboradorId, colaboradores, podeCompararTabela, resultadoTabelaPdf?.participantes]);

  const statusTopoOcr = resultadoOcr?.status_verificacao || (resultadoOcr ? "APROVADO COM CONFERÊNCIA VISUAL" : "Aguardando arquivo");

  return (
    <section className="w-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Verificador de Lista de Presença</h2>
          <p className="text-sm text-slate-600">
            O sistema primeiro tenta ler a tabela interna do PDF. Se o PDF for escaneado sem camada de texto, use o OCR experimental apenas como apoio.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={exportarCsv}
            disabled={!resultadoOcr}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Exportar CSV OCR
          </button>

          {modoLeituraPdf === "tabela_pdf" ? (
            <>
              <button
                type="button"
                onClick={executarLeituraTabela}
                disabled={!arquivo || leitorTabelaPdf.carregando}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {leitorTabelaPdf.carregando ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                Ler PDF como tabela
              </button>

              <button
                type="button"
                onClick={compararTabelaInterna}
                disabled={!podeCompararTabela}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                Comparar tabela interna
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={iniciarVerificacaoOcr}
              disabled={!arquivo || carregandoOcr}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {carregandoOcr ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              Verificar lista
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setModoLeituraPdf("tabela_pdf")}
          className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
            modoLeituraPdf === "tabela_pdf"
              ? "bg-slate-900 text-white"
              : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          PDF tabela interna
        </button>

        <button
          type="button"
          onClick={() => setModoLeituraPdf("ocr_experimental")}
          className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
            modoLeituraPdf === "ocr_experimental"
              ? "bg-slate-900 text-white"
              : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          OCR PDF experimental
        </button>
      </div>

      <div
        onDragOver={(evento) => evento.preventDefault()}
        onDrop={aoSoltarArquivo}
        className="mt-4 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-5 transition hover:border-orange-300 hover:bg-orange-50/40"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white">
              <Upload className="h-5 w-5" />
            </div>

            <div>
              <p className="text-sm font-medium text-slate-900">Solte aqui o PDF da lista de presença</p>
              <p className="text-sm text-slate-600">Apenas arquivos PDF são aceitos.</p>

              {arquivo ? (
                <div className="mt-2 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                  <FileText className="h-4 w-4 text-orange-500" />
                  {arquivo.name}
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,.pdf"
              onChange={aoAlterarArquivo}
              className="hidden"
            />

            <button
              type="button"
              onClick={abrirSeletorArquivo}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
            >
              Escolher arquivo
            </button>
          </div>
        </div>
      </div>

      {modoLeituraPdf === "tabela_pdf" ? (
        <>
          <div className="mt-4 grid gap-3 md:grid-cols-5">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Páginas</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{Number(resumoTabela?.paginasDetectadas ?? resumoTabela?.totalPaginas ?? 0)}</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Itens de texto</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{Number(resumoTabela?.totalItensTexto || 0)}</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Participantes na tabela</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{totalParticipantesTabela}</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Camada de texto</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{camadaTextoDetectada ? "Sim" : "Não"}</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Validação</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{validacaoOk ? "OK" : "Aviso"}</p>
            </div>
          </div>

          {avisosTabela.length ? (
            <div className="mt-4 space-y-2">
              {avisosTabela.map((aviso, indice) => (
                <div
                  key={`${aviso}-${indice}`}
                  className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"
                >
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>{aviso}</p>
                </div>
              ))}
            </div>
          ) : null}
        </>
      ) : null}

      <div className="mt-4 grid gap-3 md:grid-cols-5">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Total</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{totalOcr}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Encontrados</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{encontradosOcr}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Assinados</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{assinadosOcr}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Conferência visual</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{provaveisOcr}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Ausentes</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{ausentesOcr}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Etapa</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            {modoLeituraPdf === "tabela_pdf" ? (leitorTabelaPdf.etapa || "Aguardando arquivo") : (etapaOcr === "idle" ? "Aguardando arquivo" : etapaOcr)}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Progresso</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            {modoLeituraPdf === "tabela_pdf" ? formatarPercentual(leitorTabelaPdf.progresso) : formatarPercentual(progressoOcr)}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Status</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            {modoLeituraPdf === "tabela_pdf"
              ? resultadoTabelaPdf
                ? validacaoOk
                  ? "Tabela interna lida"
                  : "Tabela interna com aviso"
                : "Aguardando leitura"
              : statusTopoOcr}
          </p>
        </div>
      </div>

      {modoLeituraPdf === "ocr_experimental" && resultadoOcr?.diagnosticoOcr ? (
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-900">Diagnóstico técnico do OCR experimental</h3>
            <p className="text-xs text-slate-500">
              Resumo técnico para avaliar qualidade da leitura OCR. Não altera aprovação automática.
            </p>
          </div>

          <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Linhas OCR</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{totalLinhasOcr}</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Com bbox</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{totalLinhasComBbox}</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Sem bbox</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{totalLinhasSemBbox}</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Média confiança</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{mediaConfiancaLinhas}</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Assinatura visual</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{totalLinhasComAssinaturaVisual}</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Camada de texto</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{diagnosticoOcr?.temCamadaTexto ? "Sim" : "Não"}</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">PDF escaneado</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{diagnosticoOcr?.isPdfEscaneado ? "Sim" : "Não"}</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Texto camada</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{tamanhoTextoCamada}</p>
            </div>
          </div>

          <div className="border-t border-slate-200 px-4 py-4">
            <div className="mb-3">
              <h4 className="text-sm font-semibold text-slate-900">Origem e estrutura bruta do OCR</h4>
              <p className="text-xs text-slate-500">
                Identifica se a leitura veio de camada de texto, OCR estruturado ou fallback textual. Uso apenas técnico, sem alterar aprovação automática.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              <div className="grid gap-2 md:grid-cols-3">
                <div>
                  <span className="font-medium text-slate-900">Origem da leitura:</span>{" "}
                  <span>{diagnosticoOrigemOcr?.origemLeitura || "-"}</span>
                </div>
                <div>
                  <span className="font-medium text-slate-900">Descrição:</span>{" "}
                  <span>{diagnosticoOrigemOcr?.origemDescricao || "-"}</span>
                </div>
                <div>
                  <span className="font-medium text-slate-900">Recomendação técnica:</span>{" "}
                  <span>{diagnosticoOrigemOcr?.recomendacaoTecnica || "-"}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Tem camada de texto</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{diagnosticoOrigemOcr?.temCamadaTexto ? "Sim" : "Não"}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Tem texto OCR</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{diagnosticoOrigemOcr?.temOcrTexto ? "Sim" : "Não"}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">OCR estruturado</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{diagnosticoOrigemOcr?.temOcrEstruturado ? "Sim" : "Não"}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Bbox válido</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{diagnosticoOrigemOcr?.temBboxValido ? "Sim" : "Não"}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Usou fallback texto</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{diagnosticoOrigemOcr?.usouFallbackTexto ? "Sim" : "Não"}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Páginas diagnosticadas</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{Number(diagnosticoEstruturaBrutaOcr?.totalPaginasDiagnosticadas || 0)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Lines OCR</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{Number(diagnosticoEstruturaBrutaOcr?.totalLines || 0)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Words OCR</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{Number(diagnosticoEstruturaBrutaOcr?.totalWords || 0)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Lines bbox válido</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{Number(diagnosticoEstruturaBrutaOcr?.totalLinesComBboxValido || 0)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Words bbox válido</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{Number(diagnosticoEstruturaBrutaOcr?.totalWordsComBboxValido || 0)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Lines bbox inválido</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{Number(diagnosticoEstruturaBrutaOcr?.totalLinesComBboxInvalido || 0)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Words bbox inválido</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{Number(diagnosticoEstruturaBrutaOcr?.totalWordsComBboxInvalido || 0)}</p>
              </div>
            </div>

            {paginasEstruturaBrutaOcr.length ? (
              <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Página</th>
                      <th className="px-4 py-3">Texto OCR</th>
                      <th className="px-4 py-3">Tamanho texto</th>
                      <th className="px-4 py-3">Lines</th>
                      <th className="px-4 py-3">Words</th>
                      <th className="px-4 py-3">Lines bbox válido</th>
                      <th className="px-4 py-3">Words bbox válido</th>
                      <th className="px-4 py-3">Lines bbox inválido</th>
                      <th className="px-4 py-3">Words bbox inválido</th>
                      <th className="px-4 py-3">Fallback texto</th>
                      <th className="px-4 py-3">Lines estruturadas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {paginasEstruturaBrutaOcr.map((item, indice) => (
                      <tr key={`${item?.pagina ?? "p"}-${indice}`}>
                        <td className="px-4 py-3 text-slate-700">{item?.pagina ?? "-"}</td>
                        <td className="px-4 py-3 text-slate-700">{item?.temTextoOcr ? "Sim" : "Não"}</td>
                        <td className="px-4 py-3 text-slate-700">{item?.tamanhoTextoOcr ?? "-"}</td>
                        <td className="px-4 py-3 text-slate-700">{item?.totalLines ?? "-"}</td>
                        <td className="px-4 py-3 text-slate-700">{item?.totalWords ?? "-"}</td>
                        <td className="px-4 py-3 text-slate-700">{item?.linesComBboxValido ?? "-"}</td>
                        <td className="px-4 py-3 text-slate-700">{item?.wordsComBboxValido ?? "-"}</td>
                        <td className="px-4 py-3 text-slate-700">{item?.linesComBboxInvalido ?? "-"}</td>
                        <td className="px-4 py-3 text-slate-700">{item?.wordsComBboxInvalido ?? "-"}</td>
                        <td className="px-4 py-3 text-slate-700">{item?.usouFallbackTexto ? "Sim" : "Não"}</td>
                        <td className="px-4 py-3 text-slate-700">{item?.usouLinesEstruturadas ? "Sim" : "Não"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>

          <div className="border-t border-slate-200 px-4 py-4">
            <div className="mb-3">
              <h4 className="text-sm font-semibold text-slate-900">Amostra técnica OCR</h4>
              <p className="text-xs text-slate-500">Até 10 linhas com dados brutos de leitura.</p>
            </div>

            {amostraLinhasOcr.length ? (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Página</th>
                      <th className="px-4 py-3">Índice</th>
                      <th className="px-4 py-3">Texto OCR</th>
                      <th className="px-4 py-3">Nome extraído</th>
                      <th className="px-4 py-3">Função</th>
                      <th className="px-4 py-3">Confiança</th>
                      <th className="px-4 py-3">Bbox</th>
                      <th className="px-4 py-3">Assinatura visual</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {amostraLinhasOcr.map((linha, indice) => (
                      <tr key={`${linha?.pagina ?? "p"}-${linha?.indice ?? indice}`}>
                        <td className="px-4 py-3 text-slate-700">{linha?.pagina ?? "-"}</td>
                        <td className="px-4 py-3 text-slate-700">{linha?.indice ?? "-"}</td>
                        <td className="px-4 py-3 text-slate-700">
                          <div className="max-w-[22rem] break-words">{linha?.texto || "-"}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          <div className="max-w-[18rem] break-words">{linha?.nome || "-"}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          <div className="max-w-[14rem] break-words">{linha?.funcao || "-"}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{Math.round(Number(linha?.confianca || 0))}</td>
                        <td className="px-4 py-3 text-slate-700">{formatarBboxCurto(linha?.bbox)}</td>
                        <td className="px-4 py-3 text-slate-700">{linha?.assinatura_visual ? "Sim" : "Não"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-600">
                Nenhuma amostra técnica disponível.
              </div>
            )}
          <div className="border-t border-slate-200 px-4 py-4">
            <div className="mb-3">
              <h4 className="text-sm font-semibold text-slate-900">Diagnóstico estrutural OCR</h4>
              <p className="text-xs text-slate-500">
                Distribuição aproximada das linhas por coordenadas. Uso apenas técnico, sem alterar aprovação automática.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Linhas com coordenadas</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{Number(diagnosticoEstruturalOcr?.totalLinhasComCoordenadas || 0)}</p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Linhas sem coordenadas</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{Number(diagnosticoEstruturalOcr?.totalLinhasSemCoordenadas || 0)}</p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Horizontal</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  E {Number(distribuicaoHorizontalOcr?.esquerda || 0)} / C {Number(distribuicaoHorizontalOcr?.centro || 0)} / D {Number(distribuicaoHorizontalOcr?.direita || 0)}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Vertical</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  T {Number(distribuicaoVerticalOcr?.topo || 0)} / M {Number(distribuicaoVerticalOcr?.meio || 0)} / B {Number(distribuicaoVerticalOcr?.base || 0)}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Limites X</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {Number.isFinite(Number(limitesGeraisOcr?.xMin)) && Number.isFinite(Number(limitesGeraisOcr?.xMax))
                    ? `${Math.round(Number(limitesGeraisOcr.xMin))} - ${Math.round(Number(limitesGeraisOcr.xMax))}`
                    : "-"}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Limites Y</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {Number.isFinite(Number(limitesGeraisOcr?.yMin)) && Number.isFinite(Number(limitesGeraisOcr?.yMax))
                    ? `${Math.round(Number(limitesGeraisOcr.yMin))} - ${Math.round(Number(limitesGeraisOcr.yMax))}`
                    : "-"}
                </p>
              </div>
            </div>

            {paginasEstruturaisOcr.length ? (
              <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Páginas analisadas</th>
                      <th className="px-4 py-3">Linhas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {paginasEstruturaisOcr.map((pagina, indice) => (
                      <tr key={`${pagina?.pagina ?? "p"}-${indice}`}>
                        <td className="px-4 py-3 text-slate-700">{pagina?.pagina ?? "-"}</td>
                        <td className="px-4 py-3 text-slate-700">{pagina?.totalLinhasPagina ?? pagina?.totalLinhas ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Região</th>
                    <th className="px-4 py-3">Início</th>
                    <th className="px-4 py-3">Fim</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {[
                    ["Nº", regioesProvaveisOcr?.numero],
                    ["Nome", regioesProvaveisOcr?.nome],
                    ["Função", regioesProvaveisOcr?.funcao],
                    ["Assinatura", regioesProvaveisOcr?.assinatura],
                  ].map(([rotulo, regiao]) => (
                    <tr key={rotulo}>
                      <td className="px-4 py-3 font-medium text-slate-900">{rotulo}</td>
                      <td className="px-4 py-3 text-slate-700">
                        {regiao && Number.isFinite(Number(regiao.inicio))
                          ? `${Math.round(Number(regiao.inicio))}%`
                          : "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {regiao && Number.isFinite(Number(regiao.fim))
                          ? `${Math.round(Number(regiao.fim))}%`
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {amostraEstruturalOcr.length ? (
              <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Página</th>
                      <th className="px-4 py-3">Índice</th>
                      <th className="px-4 py-3">Texto</th>
                      <th className="px-4 py-3">Região provável</th>
                      <th className="px-4 py-3">Bbox</th>
                      <th className="px-4 py-3">Assinatura visual</th>
                      <th className="px-4 py-3">Confiança</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {amostraEstruturalOcr.map((item, indice) => (
                      <tr key={`${item?.pagina ?? "p"}-${item?.indice ?? indice}`}>
                        <td className="px-4 py-3 text-slate-700">{item?.pagina ?? "-"}</td>
                        <td className="px-4 py-3 text-slate-700">{item?.indice ?? "-"}</td>
                        <td className="px-4 py-3 text-slate-700">
                          <div className="max-w-[22rem] break-words">{item?.texto || "-"}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{item?.regiaoProvavel || "-"}</td>
                        <td className="px-4 py-3 text-slate-700">{formatarBboxCurto(item?.bbox)}</td>
                        <td className="px-4 py-3 text-slate-700">{item?.assinatura_visual ? "Sim" : "Não"}</td>
                        <td className="px-4 py-3 text-slate-700">{Math.round(Number(item?.confianca || 0))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>

          <div className="border-t border-slate-200 px-4 py-4">
            <div className="mb-3">
              <h4 className="text-sm font-semibold text-slate-900">Diagnóstico de segmentação OCR</h4>
              <p className="text-xs text-slate-500">
                Agrupamento aproximado das linhas OCR por faixa visual e regiões de coluna. Uso apenas técnico, sem alterar aprovação automática.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Grupos de linha visual</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{Number(diagnosticoSegmentacaoOcr?.totalGruposLinhaVisual || 0)}</p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Linhas com coordenadas</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{Number(diagnosticoSegmentacaoOcr?.totalLinhasComCoordenadas || 0)}</p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Linhas sem coordenadas</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{Number(diagnosticoSegmentacaoOcr?.totalLinhasSemCoordenadas || 0)}</p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Páginas com grupos</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{paginasSegmentacaoOcr.length}</p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Amostras</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{amostraSegmentacaoOcr.length}</p>
              </div>
            </div>

            {paginasSegmentacaoOcr.length ? (
              <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Página</th>
                      <th className="px-4 py-3">Grupos</th>
                      <th className="px-4 py-3">Linhas com coordenadas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {paginasSegmentacaoOcr.map((pagina, indice) => (
                      <tr key={`${pagina?.pagina ?? "p"}-${indice}`}>
                        <td className="px-4 py-3 text-slate-700">{pagina?.pagina ?? "-"}</td>
                        <td className="px-4 py-3 text-slate-700">{pagina?.totalGrupos ?? "-"}</td>
                        <td className="px-4 py-3 text-slate-700">{pagina?.totalLinhasComCoordenadas ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            {amostraSegmentacaoOcr.length ? (
              <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Página</th>
                      <th className="px-4 py-3">Grupo</th>
                      <th className="px-4 py-3">Y</th>
                      <th className="px-4 py-3">Total linhas</th>
                      <th className="px-4 py-3">Nº</th>
                      <th className="px-4 py-3">Nome</th>
                      <th className="px-4 py-3">Função</th>
                      <th className="px-4 py-3">Assinatura</th>
                      <th className="px-4 py-3">Qtd. Nº</th>
                      <th className="px-4 py-3">Qtd. Nome</th>
                      <th className="px-4 py-3">Qtd. Função</th>
                      <th className="px-4 py-3">Qtd. Assinatura</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {amostraSegmentacaoOcr.map((item, indice) => (
                      <tr key={`${item?.pagina ?? "p"}-${item?.indiceGrupo ?? indice}`}>
                        <td className="px-4 py-3 text-slate-700">{item?.pagina ?? "-"}</td>
                        <td className="px-4 py-3 text-slate-700">{item?.indiceGrupo ?? "-"}</td>
                        <td className="px-4 py-3 text-slate-700">
                          {Number.isFinite(Number(item?.yMin)) && Number.isFinite(Number(item?.yMax))
                            ? `${Math.round(Number(item.yMin))} - ${Math.round(Number(item.yMax))}`
                            : "-"}
                        </td>
                        <td className="px-4 py-3 text-slate-700">{item?.totalLinhas ?? "-"}</td>
                        <td className="px-4 py-3 text-slate-700">
                          <div className="max-w-[10rem] break-words">{item?.numero || "-"}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          <div className="max-w-[16rem] break-words">{item?.nome || "-"}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          <div className="max-w-[14rem] break-words">{item?.funcao || "-"}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          <div className="max-w-[14rem] break-words">{item?.assinatura || "-"}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{Number(item?.totalRegiaoNumero || 0)}</td>
                        <td className="px-4 py-3 text-slate-700">{Number(item?.totalRegiaoNome || 0)}</td>
                        <td className="px-4 py-3 text-slate-700">{Number(item?.totalRegiaoFuncao || 0)}</td>
                        <td className="px-4 py-3 text-slate-700">{Number(item?.totalRegiaoAssinatura || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
          </div>
        </div>
      ) : null}

      {modoLeituraPdf === "ocr_experimental" && erroOcr ? (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{erroOcr}</p>
        </div>
      ) : null}

      {modoLeituraPdf === "tabela_pdf" && erroTabelaPdf ? (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{erroTabelaPdf}</p>
        </div>
      ) : null}

      {modoLeituraPdf === "ocr_experimental" && carregandoOcr ? (
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="h-2 w-full bg-slate-100">
            <div
              className="h-full bg-orange-500 transition-all"
              style={{ width: `${Math.round(Math.max(0, Math.min(1, progressoOcr)) * 100)}%` }}
            />
          </div>

          <div className="flex items-center gap-3 p-4 text-sm text-slate-700">
            <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
            <span>
              {etapaOcr === "ocr" && "Lendo PDF com OCR local..."}
              {etapaOcr === "comparando" && "Comparando com a lista de colaboradores..."}
              {etapaOcr === "concluido" && "Processamento concluído."}
              {etapaOcr === "erro" && "Ocorreu um erro no processamento."}
              {etapaOcr === "idle" && "Preparando a análise..."}
            </span>
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2 text-sm text-slate-700">
          {modoLeituraPdf === "ocr_experimental" && resultadoOcr ? (
            <>
              <span className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1 font-medium text-green-800">
                <CheckCircle2 className="h-4 w-4" />
                {resultadoOcr.status_verificacao || "Resultado concluído"}
              </span>

              <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
                <ShieldCheck className="h-4 w-4" />
                OCR local
              </span>

              <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
                <AlertTriangle className="h-4 w-4" />
                {provaveisOcr} em conferência visual
              </span>
            </>
          ) : modoLeituraPdf === "tabela_pdf" && resultadoTabelaPdf ? (
            <>
              <span className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1 font-medium text-green-800">
                <CheckCircle2 className="h-4 w-4" />
                {resultadoTabelaPdfComparadaValida ? "Tabela interna comparada" : validacaoOk ? "Tabela interna lida" : "Tabela interna com aviso"}
              </span>

              <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
                <ShieldCheck className="h-4 w-4" />
                PDF tabela interna
              </span>

              <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
                <AlertTriangle className="h-4 w-4" />
                {totalParticipantesTabela} participantes
              </span>

              {resultadoTabelaPdfComparadaValida ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 font-medium text-blue-800">
                  <CheckCircle2 className="h-4 w-4" />
                  PDF tabela interna comparada
                </span>
              ) : null}
            </>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
              <ShieldCheck className="h-4 w-4" />
              Nenhum resultado processado
            </span>
          )}
        </div>

        <label className="flex w-full max-w-md items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500 shadow-sm">
          <Search className="h-4 w-4" />
          <input
            type="text"
            value={termoBusca}
            onChange={(evento) => setTermoBusca(evento.target.value)}
            placeholder="Filtrar por nome ou função"
            className="w-full border-0 p-0 text-sm text-slate-900 outline-none placeholder:text-slate-400"
          />
        </label>
      </div>

      {modoLeituraPdf === "ocr_experimental" ? (
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Colaboradores da lista</h3>
              <p className="text-xs text-slate-500">
                {itensOcr.length} registros exibidos
                {resultadoOcr?.isPdfEscaneado ? " • PDF escaneado" : ""}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-white text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Nome cadastro</th>
                  <th className="px-4 py-3">Função</th>
                  <th className="px-4 py-3">Nome OCR</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Motivo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {itensOcr.length ? (
                  itensOcr.map((item) => (
                    <tr key={item?.id || `${item?.nomeCadastro || "colaborador"}-${item?.funcaoCadastro || "funcao"}`}>
                      <td className="px-4 py-3 font-medium text-slate-900">{item?.nomeCadastro || "-"}</td>
                      <td className="px-4 py-3 text-slate-700">{item?.funcaoCadastro || "-"}</td>
                      <td className="px-4 py-3 text-slate-700">{item?.nomeOCR || "-"}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${classeStatus(item?.status)}`}>
                          {item?.status === "encontrado_e_assinou" ? <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> : null}
                          {item?.status === "conferencia_visual" ? <AlertTriangle className="mr-1 h-3.5 w-3.5" /> : null}
                          {item?.status === "ausente" ? <XCircle className="mr-1 h-3.5 w-3.5" /> : null}
                          {textoStatus(item?.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{Math.round(Number(item?.score || 0))}</td>
                      <td className="px-4 py-3 text-slate-700">{item?.motivo || "-"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-4 py-8 text-center text-slate-500" colSpan={6}>
                      Nenhum colaborador encontrado para exibir.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {modoLeituraPdf === "tabela_pdf" ? (
        <>
          {resultadoTabelaPdfComparadaValida ? (
            <div className="mt-4 grid gap-3 md:grid-cols-5">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Total</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{Number(resumoComparacaoTabela?.total || 0)}</p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Encontrados</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{Number(resumoComparacaoTabela?.encontrados || 0)}</p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Assinados</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{Number(resumoComparacaoTabela?.assinados || 0)}</p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Conferência visual</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{Number(resumoComparacaoTabela?.provaveis || 0)}</p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Ausentes</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{Number(resumoComparacaoTabela?.ausentes || 0)}</p>
              </div>
            </div>
          ) : null}

          {resultadoTabelaPdfComparadaValida ? (
            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Colaboradores da lista</h3>
                  <p className="text-xs text-slate-500">
                    {itensComparacaoTabela.length} registros exibidos <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-blue-800">PDF tabela interna comparada</span>
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <thead className="bg-white text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Nome cadastro</th>
                      <th className="px-4 py-3">Função</th>
                      <th className="px-4 py-3">Nome PDF</th>
                      <th className="px-4 py-3">Candidato usado</th>
                      <th className="px-4 py-3">Origem candidato</th>
                      <th className="px-4 py-3">Estrategia</th>
                      <th className="px-4 py-3">Tokens</th>
                      <th className="px-4 py-3">Pagina</th>
                      <th className="px-4 py-3">Assinatura PDF</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Score</th>
                      <th className="px-4 py-3">Motivo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {itensComparacaoTabela.length ? (
                      itensComparacaoTabela.map((item) => (
                        <tr key={item?.id || `${item?.nomeCadastro || "colaborador"}-${item?.funcaoCadastro || "funcao"}`}>
                          <td className="px-4 py-3 font-medium text-slate-900">{item?.nomeCadastro || "-"}</td>
                          <td className="px-4 py-3 text-slate-700">{item?.funcaoCadastro || "-"}</td>
                          <td className="px-4 py-3 text-slate-700">{item?.nomeOCR || "-"}</td>
                          <td className="max-w-xs px-4 py-3 text-slate-700">
                            <span className="line-clamp-2">{item?.diagnosticoComparacaoTabela?.candidatoTexto || "-"}</span>
                          </td>
                          <td className="px-4 py-3 text-slate-700">{item?.diagnosticoComparacaoTabela?.candidatoOrigem || "-"}</td>
                          <td className="px-4 py-3 text-slate-700">{item?.diagnosticoComparacaoTabela?.estrategiaComparacao || "-"}</td>
                          <td className="max-w-xs px-4 py-3 text-slate-700">
                            <span className="line-clamp-2">
                              {Array.isArray(item?.diagnosticoComparacaoTabela?.tokensComparacao) && item.diagnosticoComparacaoTabela.tokensComparacao.length
                                ? item.diagnosticoComparacaoTabela.tokensComparacao.join(", ")
                                : "-"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-700">{item?.diagnosticoComparacaoTabela?.participantePagina || "-"}</td>
                          <td className="px-4 py-3 text-slate-700">{item?.diagnosticoComparacaoTabela?.participanteAssinatura || "-"}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${classeStatus(item?.status)}`}>
                              {item?.status === "encontrado_e_assinou" ? <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> : null}
                              {item?.status === "conferencia_visual" ? <AlertTriangle className="mr-1 h-3.5 w-3.5" /> : null}
                              {item?.status === "ausente" ? <XCircle className="mr-1 h-3.5 w-3.5" /> : null}
                              {textoStatus(item?.status)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-700">{Math.round(Number(item?.score || 0))}</td>
                          <td className="px-4 py-3 text-slate-700">{item?.motivo || "-"}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="px-4 py-8 text-center text-slate-500" colSpan={12}>
                          Nenhum colaborador encontrado para exibir.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Participantes extraídos da camada de texto</h3>
              <p className="text-xs text-slate-500">
                {totalParticipantesTabela} participantes detectados na tabela interna
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-white text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Nº</th>
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">Função</th>
                  <th className="px-4 py-3">Assinatura</th>
                  <th className="px-4 py-3">Observação</th>
                  <th className="px-4 py-3">Página</th>
                  <th className="px-4 py-3">Origem</th>
                  <th className="px-4 py-3">Confiança</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {participantesTabelaConfiaveis.length ? (
                  participantesTabelaConfiaveis.map((item) => (
                    <tr key={item?.idTemporario || `${item?.numero || "n"}-${item?.nome || "participante"}`}>
                      <td className="px-4 py-3 font-medium text-slate-900">{item?.numero || "-"}</td>
                      <td className="px-4 py-3 text-slate-700">{item?.nome || "-"}</td>
                      <td className="px-4 py-3 text-slate-700">{item?.funcao || "-"}</td>
                      <td className="px-4 py-3 text-slate-700">{item?.assinatura || "-"}</td>
                      <td className="px-4 py-3 text-slate-700">{item?.observacao || "-"}</td>
                      <td className="px-4 py-3 text-slate-700">{item?.pagina || "-"}</td>
                      <td className="px-4 py-3 text-slate-700">{item?.origem || "-"}</td>
                      <td className="px-4 py-3 text-slate-700">{Math.round(Number(item?.confianca || 0))}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-4 py-8 text-center text-slate-500" colSpan={8}>
                      Nenhum participante confiável foi detectado na tabela interna do PDF.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          </div>
        </>
      ) : null}

      {modoLeituraPdf === "tabela_pdf" && resultadoTabelaPdf ? (
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Diagnóstico da tabela interna</h3>
              <p className="text-xs text-slate-500">Resumo técnico da leitura da camada de texto do PDF</p>
            </div>
          </div>

          <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Páginas</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{Number(resumoTabela?.paginasDetectadas ?? resumoTabela?.totalPaginas ?? 0)}</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Itens de texto</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{Number(resumoTabela?.totalItensTexto || 0)}</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Participantes</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{totalParticipantesTabela}</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Camada de texto</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{camadaTextoDetectada ? "Sim" : "Não"}</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Validação</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{validacaoOk ? "OK" : "Aviso"}</p>
            </div>
            {Array.isArray(resumoTabela?.candidatosRejeitadosAmostra) && resumoTabela.candidatosRejeitadosAmostra.length ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 md:col-span-2 xl:col-span-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Candidatos rejeitados em amostra</p>
                <div className="mt-2 space-y-2 text-xs text-slate-700">
                  {resumoTabela.candidatosRejeitadosAmostra.map((item, indice) => (
                    <div key={`${item?.linhaOriginal || "amostra"}-${indice}`} className="rounded-lg border border-slate-200 bg-white p-2">
                      <p className="font-medium text-slate-900">{item?.motivo || "outro"}</p>
                      <p className="break-words text-slate-600">{item?.linhaOriginal || "-"}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {Array.isArray(resumoTabela?.colunasAnalisadasAmostra) && resumoTabela.colunasAnalisadasAmostra.length ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 md:col-span-2 xl:col-span-3">
                <div className="flex flex-col gap-1">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Amostra de colunas analisadas</p>
                  <p className="text-xs text-slate-500">
                    Mostra como a camada de texto foi separada em número, nome, função, assinatura e observação.
                  </p>
                </div>

                <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200 bg-white">
                  <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                    <thead className="bg-slate-50 uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-3 py-2">Página</th>
                        <th className="px-3 py-2">Nº</th>
                        <th className="px-3 py-2">Nome</th>
                        <th className="px-3 py-2">Função</th>
                        <th className="px-3 py-2">Assinatura</th>
                        <th className="px-3 py-2">Observação</th>
                        <th className="px-3 py-2">X</th>
                        <th className="px-3 py-2">Y</th>
                        <th className="px-3 py-2">Células</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2">Motivo</th>
                        <th className="px-3 py-2">Linha original</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {resumoTabela.colunasAnalisadasAmostra.map((item, indice) => (
                        <tr key={`${item?.pagina ?? "p"}-${item?.linhaOriginal || "linha"}-${indice}`}>
                          <td className="px-3 py-2 text-slate-700">{item?.pagina ?? "-"}</td>
                          <td className="px-3 py-2 text-slate-700">{item?.numero || "-"}</td>
                          <td className="px-3 py-2 text-slate-700">
                            <div className="max-w-[14rem] break-words">{item?.nome || "-"}</div>
                          </td>
                          <td className="px-3 py-2 text-slate-700">{item?.funcao || "-"}</td>
                          <td className="px-3 py-2 text-slate-700">{item?.assinatura || "-"}</td>
                          <td className="px-3 py-2 text-slate-700">{item?.observacao || "-"}</td>
                          <td className="px-3 py-2 text-slate-700">
                            {Number.isFinite(Number(item?.xMin)) && Number.isFinite(Number(item?.xMax))
                              ? `${Math.round(Number(item.xMin))}-${Math.round(Number(item.xMax))}`
                              : "-"}
                          </td>
                          <td className="px-3 py-2 text-slate-700">
                            {Number.isFinite(Number(item?.yMedio)) ? Math.round(Number(item.yMedio)) : "-"}
                          </td>
                          <td className="px-3 py-2 text-slate-700">{Number(item?.totalCelulas || 0)}</td>
                          <td className="px-3 py-2 text-slate-700">{item?.aceito ? "Aceito" : "Rejeitado"}</td>
                          <td className="px-3 py-2 text-slate-700">{item?.motivo || "-"}</td>
                          <td className="px-3 py-2 text-slate-700">
                            <div className="max-w-[22rem] break-words">{item?.linhaOriginal || "-"}</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </div>

          {resumoTabela?.diagnosticoAncoraNumerica ? (
            <div className="px-4 pb-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex flex-col gap-1">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Diagnóstico por âncora numérica</p>
                  <p className="text-xs text-slate-500">
                    Leitura paralela: tenta localizar linhas pelo número inicial e separar nome, função e assinatura por posição X.
                  </p>
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Linhas com âncora</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{Number(resumoTabela?.diagnosticoAncoraNumerica?.totalLinhasComAncora || 0)}</p>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Aceitos</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{Number(resumoTabela?.diagnosticoAncoraNumerica?.totalAceitos || 0)}</p>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Rejeitados</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{Number(resumoTabela?.diagnosticoAncoraNumerica?.totalRejeitados || 0)}</p>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Amostra</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{Number(resumoTabela?.diagnosticoAncoraNumerica?.totalCandidatosAmostra || 0)}</p>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Duplicados por número</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{Number(resumoTabela?.diagnosticoAncoraNumerica?.totalDuplicadosNumero || 0)}</p>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Ignorados no pré-filtro</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{Number(resumoTabela?.diagnosticoAncoraNumerica?.totalIgnoradosPreFiltro || 0)}</p>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Nomes ajustados</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{Number(resumoTabela?.diagnosticoAncoraNumerica?.totalNomesAjustados || 0)}</p>
                  </div>
                </div>

                {Array.isArray(resumoTabela?.diagnosticoAncoraNumerica?.numerosDetectados) && resumoTabela.diagnosticoAncoraNumerica.numerosDetectados.length ? (
                  <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Números detectados</p>
                    <p className="mt-1 break-words text-xs text-slate-700">
                      {resumoTabela.diagnosticoAncoraNumerica.numerosDetectados.join(", ")}
                    </p>
                  </div>
                ) : null}

                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Números aceitos</p>
                    <p className="mt-1 break-words text-xs text-slate-700">
                      {Array.isArray(resumoTabela?.diagnosticoAncoraNumerica?.numerosAceitos) && resumoTabela.diagnosticoAncoraNumerica.numerosAceitos.length
                        ? resumoTabela.diagnosticoAncoraNumerica.numerosAceitos.join(", ")
                        : "-"}
                    </p>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Números rejeitados</p>
                    <p className="mt-1 break-words text-xs text-slate-700">
                      {Array.isArray(resumoTabela?.diagnosticoAncoraNumerica?.numerosRejeitados) && resumoTabela.diagnosticoAncoraNumerica.numerosRejeitados.length
                        ? resumoTabela.diagnosticoAncoraNumerica.numerosRejeitados.join(", ")
                        : "-"}
                    </p>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Números duplicados</p>
                    <p className="mt-1 break-words text-xs text-slate-700">
                      {Array.isArray(resumoTabela?.diagnosticoAncoraNumerica?.numerosDuplicados) && resumoTabela.diagnosticoAncoraNumerica.numerosDuplicados.length
                        ? resumoTabela.diagnosticoAncoraNumerica.numerosDuplicados.join(", ")
                        : "-"}
                    </p>
                  </div>
                </div>

                {Array.isArray(resumoTabela?.diagnosticoAncoraNumerica?.nomesAjustadosAmostra) && resumoTabela.diagnosticoAncoraNumerica.nomesAjustadosAmostra.length ? (
                  <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200 bg-white">
                    <div className="border-b border-slate-200 bg-slate-50 px-3 py-2">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Amostra de nomes ajustados</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Mostra o nome antes e depois da limpeza aplicada apenas no diagnóstico por âncora numérica.
                      </p>
                    </div>

                    <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                      <thead className="bg-slate-50 uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-3 py-2">Nº</th>
                          <th className="px-3 py-2">Antes</th>
                          <th className="px-3 py-2">Depois</th>
                          <th className="px-3 py-2">Ajustes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {resumoTabela.diagnosticoAncoraNumerica.nomesAjustadosAmostra.map((item, indice) => (
                          <tr key={`${item?.numero || "n"}-${item?.antes || "nome"}-${indice}`}>
                            <td className="px-3 py-2 text-slate-700">{item?.numero || "-"}</td>
                            <td className="px-3 py-2 text-slate-700">
                              <div className="max-w-[18rem] break-words">{item?.antes || "-"}</div>
                            </td>
                            <td className="px-3 py-2 text-slate-700">
                              <div className="max-w-[18rem] break-words">{item?.depois || "-"}</div>
                            </td>
                            <td className="px-3 py-2 text-slate-700">
                              {Array.isArray(item?.ajustes) && item.ajustes.length ? item.ajustes.join(", ") : "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}

                {Array.isArray(resumoTabela?.diagnosticoAncoraNumerica?.candidatosAmostra) && resumoTabela.diagnosticoAncoraNumerica.candidatosAmostra.length ? (
                  <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200 bg-white">
                    <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                      <thead className="bg-slate-50 uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-3 py-2">Página</th>
                          <th className="px-3 py-2">Nº</th>
                          <th className="px-3 py-2">Nome</th>
                          <th className="px-3 py-2">Nome original</th>
                          <th className="px-3 py-2">Ajustes nome</th>
                          <th className="px-3 py-2">Função</th>
                          <th className="px-3 py-2">Assinatura</th>
                          <th className="px-3 py-2">Observação</th>
                          <th className="px-3 py-2">X</th>
                          <th className="px-3 py-2">Y</th>
                          <th className="px-3 py-2">Células</th>
                          <th className="px-3 py-2">Status</th>
                          <th className="px-3 py-2">Motivo</th>
                          <th className="px-3 py-2">Confiança</th>
                          <th className="px-3 py-2">Linha original</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {resumoTabela.diagnosticoAncoraNumerica.candidatosAmostra.map((item, indice) => (
                          <tr key={`${item?.pagina ?? "p"}-${item?.numero || "n"}-${indice}`}>
                            <td className="px-3 py-2 text-slate-700">{item?.pagina ?? "-"}</td>
                            <td className="px-3 py-2 text-slate-700">{item?.numero || "-"}</td>
                            <td className="px-3 py-2 text-slate-700">
                              <div className="max-w-[14rem] break-words">{item?.nome || "-"}</div>
                            </td>
                            <td className="px-3 py-2 text-slate-700">
                              <div className="max-w-[14rem] break-words">{item?.nomeOriginal || "-"}</div>
                            </td>
                            <td className="px-3 py-2 text-slate-700">
                              {Array.isArray(item?.nomeAjustes) && item.nomeAjustes.length ? item.nomeAjustes.join(", ") : "-"}
                            </td>
                            <td className="px-3 py-2 text-slate-700">{item?.funcao || "-"}</td>
                            <td className="px-3 py-2 text-slate-700">{item?.assinatura || "-"}</td>
                            <td className="px-3 py-2 text-slate-700">{item?.observacao || "-"}</td>
                            <td className="px-3 py-2 text-slate-700">
                              {Number.isFinite(Number(item?.xMin)) && Number.isFinite(Number(item?.xMax))
                                ? `${Math.round(Number(item.xMin))}-${Math.round(Number(item.xMax))}`
                                : "-"}
                            </td>
                            <td className="px-3 py-2 text-slate-700">
                              {Number.isFinite(Number(item?.yMedio)) ? Math.round(Number(item.yMedio)) : "-"}
                            </td>
                            <td className="px-3 py-2 text-slate-700">{Number(item?.totalCelulas || 0)}</td>
                            <td className="px-3 py-2 text-slate-700">{item?.aceito ? "Aceito" : "Rejeitado"}</td>
                            <td className="px-3 py-2 text-slate-700">{item?.motivo || "-"}</td>
                            <td className="px-3 py-2 text-slate-700">{Number(item?.confianca || 0)}</td>
                            <td className="px-3 py-2 text-slate-700">
                              <div className="max-w-[22rem] break-words">{item?.linhaOriginal || "-"}</div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-500">
                    Nenhum candidato por âncora numérica foi gerado no diagnóstico.
                  </div>
                )}
              </div>
            </div>
          ) : null}
          {diagnosticoComparativoAncoraNumerica ? (
            <div className="px-4 pb-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex flex-col gap-1">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Comparativo: principal x âncora</p>
                  <p className="text-xs text-slate-500">
                    Diagnóstico paralelo para comparar a extração principal da tabela interna com os candidatos aceitos por âncora numérica. Não altera o resultado principal.
                  </p>
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Principal</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{Number(diagnosticoComparativoAncoraNumerica?.totalPrincipal || 0)}</p>
                    <p className="mt-1 text-[11px] text-slate-500">Com número: {Number(diagnosticoComparativoAncoraNumerica?.totalPrincipalComNumero || 0)}</p>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Âncora aceitos</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{Number(diagnosticoComparativoAncoraNumerica?.totalAncoraAceitos || 0)}</p>
                    <p className="mt-1 text-[11px] text-slate-500">Com número: {Number(diagnosticoComparativoAncoraNumerica?.totalAncoraAceitosComNumero || 0)}</p>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Em ambos</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{Number(diagnosticoComparativoAncoraNumerica?.totalEmAmbosPorNumero || 0)}</p>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Só na principal</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{Number(diagnosticoComparativoAncoraNumerica?.totalSomentePrincipal || 0)}</p>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Só na âncora</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{Number(diagnosticoComparativoAncoraNumerica?.totalSomenteAncora || 0)}</p>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Nomes divergentes</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{Number(diagnosticoComparativoAncoraNumerica?.totalNomesDivergentes || 0)}</p>
                  </div>
                </div>
                {Array.isArray(diagnosticoComparativoAncoraNumerica?.amostraSomenteAncora) && diagnosticoComparativoAncoraNumerica.amostraSomenteAncora.length ? (
                  <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200 bg-white">
                    <div className="border-b border-slate-200 bg-slate-50 px-3 py-2">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Amostra: somente na âncora</p>
                    </div>

                    <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                      <thead className="bg-slate-50 uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-3 py-2">Nº</th>
                          <th className="px-3 py-2">Nome âncora</th>
                          <th className="px-3 py-2">Função</th>
                          <th className="px-3 py-2">Assinatura</th>
                          <th className="px-3 py-2">Confiança</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {diagnosticoComparativoAncoraNumerica.amostraSomenteAncora.map((item, indice) => (
                          <tr key={`${item?.numero || "n"}-${item?.nome || "nome"}-${indice}`}>
                            <td className="px-3 py-2 text-slate-700">{item?.numero || "-"}</td>
                            <td className="px-3 py-2 text-slate-700">
                              <div className="max-w-[18rem] break-words">{item?.nome || "-"}</div>
                            </td>
                            <td className="px-3 py-2 text-slate-700">{item?.funcao || "-"}</td>
                            <td className="px-3 py-2 text-slate-700">{item?.assinatura || "-"}</td>
                            <td className="px-3 py-2 text-slate-700">{Number(item?.confianca || 0)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}

                {Array.isArray(diagnosticoComparativoAncoraNumerica?.amostraNomesDivergentes) && diagnosticoComparativoAncoraNumerica.amostraNomesDivergentes.length ? (
                  <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200 bg-white">
                    <div className="border-b border-slate-200 bg-slate-50 px-3 py-2">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Amostra: nomes divergentes por número</p>
                    </div>

                    <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                      <thead className="bg-slate-50 uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-3 py-2">Nº</th>
                          <th className="px-3 py-2">Nome principal</th>
                          <th className="px-3 py-2">Nome âncora</th>
                          <th className="px-3 py-2">Função principal</th>
                          <th className="px-3 py-2">Função âncora</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {diagnosticoComparativoAncoraNumerica.amostraNomesDivergentes.map((item, indice) => (
                          <tr key={`${item?.numero || "n"}-${indice}`}>
                            <td className="px-3 py-2 text-slate-700">{item?.numero || "-"}</td>
                            <td className="px-3 py-2 text-slate-700">
                              <div className="max-w-[18rem] break-words">{item?.principalNome || "-"}</div>
                            </td>
                            <td className="px-3 py-2 text-slate-700">
                              <div className="max-w-[18rem] break-words">{item?.ancoraNome || "-"}</div>
                            </td>
                            <td className="px-3 py-2 text-slate-700">{item?.principalFuncao || "-"}</td>
                            <td className="px-3 py-2 text-slate-700">{item?.ancoraFuncao || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}


              </div>
            </div>
          ) : null}

          {avisosTabela.length ? (
            <div className="space-y-2 px-4 pb-4">
              {avisosTabela.map((aviso, indice) => (
                <div
                  key={`${aviso}-${indice}`}
                  className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"
                >
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>{aviso}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
