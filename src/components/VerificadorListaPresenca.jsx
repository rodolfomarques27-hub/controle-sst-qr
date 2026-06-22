import { useCallback, useMemo, useRef, useState } from "react";
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
import useVerificarListaPresenca from "../hooks/useVerificarListaPresenca";
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

export default function VerificadorListaPresenca({
  colaboradores = [],
  colaboradorId = null,
  onConcluido = null,
}) {
  const [arquivo, setArquivo] = useState(null);
  const [termoBusca, setTermoBusca] = useState("");
  const inputRef = useRef(null);

  const {
    resultado,
    carregando,
    erro,
    progresso,
    etapa,
    verificarLista,
  } = useVerificarListaPresenca();

  const itens = useMemo(() => {
    const lista = Array.isArray(resultado?.resultado) ? resultado.resultado : [];
    const filtro = normalizarNome(termoBusca);

    if (!filtro) {
      return lista;
    }

    return lista.filter((item) => {
      const nome = normalizarNome(item?.nomeCadastro || "");
      const funcao = normalizarNome(item?.funcaoCadastro || "");
      return nome.includes(filtro) || funcao.includes(filtro);
    });
  }, [resultado, termoBusca]);

  const resumo = resultado?.resumo || {};
  const total = Number(resumo.total ?? itens.length);
  const encontrados = Number(resumo.encontrados ?? itens.filter((item) => item.status === "encontrado_e_assinou" || item.status === "encontrado_sem_assinatura").length);
  const assinados = Number(resumo.assinados ?? itens.filter((item) => item.assinou).length);
  const provaveis = Number(resumo.provaveis ?? itens.filter((item) => item.status === "conferencia_visual").length);
  const ausentes = Number(resumo.ausentes ?? itens.filter((item) => item.status === "ausente").length);

  const selecionarArquivo = useCallback((novoArquivo) => {
    if (!novoArquivo) {
      setArquivo(null);
      return;
    }

    if (novoArquivo.type !== "application/pdf") {
      return;
    }

    setArquivo(novoArquivo);
  }, []);

  const aoAlterarArquivo = useCallback((evento) => {
    selecionarArquivo(evento.target.files?.[0] || null);
  }, [selecionarArquivo]);

  const aoSoltarArquivo = useCallback((evento) => {
    evento.preventDefault();
    selecionarArquivo(evento.dataTransfer.files?.[0] || null);
  }, [selecionarArquivo]);

  const abrirSeletorArquivo = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const exportarCsv = useCallback(() => {
    const lista = Array.isArray(resultado?.resultado) ? resultado.resultado : [];
    const conteudo = gerarCsv(lista);
    const blob = new Blob([conteudo], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `lista-presenca-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [resultado]);

  const iniciarVerificacao = useCallback(async () => {
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

  const statusTopo = resultado?.status_verificacao || (resultado ? "APROVADO COM CONFERÊNCIA VISUAL" : "Aguardando arquivo");

  return (
    <section className="w-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Verificador de Lista de Presença</h2>
          <p className="text-sm text-slate-600">
            Faça upload de um PDF para comparar o OCR local com a lista de colaboradores fornecida.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={exportarCsv}
            disabled={!resultado}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Exportar CSV
          </button>

          <button
            type="button"
            onClick={iniciarVerificacao}
            disabled={!arquivo || carregando}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {carregando ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            Verificar lista
          </button>
        </div>
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

      <div className="mt-4 grid gap-3 md:grid-cols-5">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Total</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{total}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Encontrados</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{encontrados}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Assinados</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{assinados}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Conferência visual</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{provaveis}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Ausentes</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{ausentes}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Etapa</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{etapa === "idle" ? "Aguardando arquivo" : etapa}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Progresso</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{formatarPercentual(progresso)}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Status</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{statusTopo}</p>
        </div>
      </div>

      {erro ? (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{erro}</p>
        </div>
      ) : null}

      {carregando ? (
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="h-2 w-full bg-slate-100">
            <div
              className="h-full bg-orange-500 transition-all"
              style={{ width: `${Math.round(Math.max(0, Math.min(1, progresso)) * 100)}%` }}
            />
          </div>

          <div className="flex items-center gap-3 p-4 text-sm text-slate-700">
            <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
            <span>
              {etapa === "ocr" && "Lendo PDF com OCR local..."}
              {etapa === "comparando" && "Comparando com a lista de colaboradores..."}
              {etapa === "concluido" && "Processamento concluído."}
              {etapa === "erro" && "Ocorreu um erro no processamento."}
              {etapa === "idle" && "Preparando a análise..."}
            </span>
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2 text-sm text-slate-700">
          {resultado ? (
            <>
              <span className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1 font-medium text-green-800">
                <CheckCircle2 className="h-4 w-4" />
                {resultado.status_verificacao || "Resultado concluído"}
              </span>

              <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
                <ShieldCheck className="h-4 w-4" />
                OCR local
              </span>

              <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
                <AlertTriangle className="h-4 w-4" />
                {provaveis} em conferência visual
              </span>
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

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Colaboradores da lista</h3>
            <p className="text-xs text-slate-500">
              {itens.length} registros exibidos
              {resultado?.isPdfEscaneado ? " • PDF escaneado" : ""}
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
              {itens.length ? (
                itens.map((item) => (
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
    </section>
  );
}
