import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  converterTabelaPdfParaTextoPlanilha,
  extrairParticipantesTabelaPdf,
  validarResultadoTabelaPdf,
} from "../utils/listaPresencaPdfTabelaUtils";

if (pdfjsLib?.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerSrc;
}

function validarArquivoPdf(arquivo) {
  if (!arquivo) {
    return "Selecione um arquivo PDF para ler a tabela interna.";
  }

  const nomeArquivo = typeof arquivo?.name === "string" ? arquivo.name.toLowerCase() : "";
  const tipoArquivo = typeof arquivo?.type === "string" ? arquivo.type.toLowerCase() : "";

  if (!nomeArquivo.endsWith(".pdf") && tipoArquivo !== "application/pdf") {
    return "O arquivo selecionado não é um PDF.";
  }

  return "";
}

async function lerArquivoComoArrayBuffer(arquivo) {
  if (typeof arquivo?.arrayBuffer === "function") {
    return arquivo.arrayBuffer();
  }

  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(leitor.result);
    leitor.onerror = () => reject(leitor.error || new Error("Não foi possível ler o arquivo."));
    leitor.readAsArrayBuffer(arquivo);
  });
}

async function extrairTabelaListaPresencaDePdf(arquivo, opcoes = {}) {
  const erroArquivo = validarArquivoPdf(arquivo);
  if (erroArquivo) {
    throw new Error(erroArquivo);
  }

  const progresso = typeof opcoes?.onProgresso === "function" ? opcoes.onProgresso : null;
  const atualizarProgresso = (valor) => {
    if (progresso) {
      progresso(Math.max(0, Math.min(1, valor)));
    }
  };

  atualizarProgresso(0.05);
  const arrayBuffer = await lerArquivoComoArrayBuffer(arquivo);
  atualizarProgresso(0.15);

  const documento = await pdfjsLib.getDocument({
    data: arrayBuffer,
    useWorkerFetch: false,
  }).promise;

  const totalPaginas = documento.numPages || 0;
  const itensTextoPdf = [];

  for (let paginaNumero = 1; paginaNumero <= totalPaginas; paginaNumero += 1) {
    atualizarProgresso(0.15 + (paginaNumero / Math.max(1, totalPaginas)) * 0.7);
    const pagina = await documento.getPage(paginaNumero);
    const textoPagina = await pagina.getTextContent();
    const itensPagina = Array.isArray(textoPagina?.items) ? textoPagina.items : [];

    for (const item of itensPagina) {
      const texto = typeof item?.str === "string" ? item.str : typeof item?.texto === "string" ? item.texto : "";
      const textoLimpo = typeof texto === "string" ? texto.trim() : "";
      if (!textoLimpo) {
        continue;
      }

      const transform = Array.isArray(item?.transform) ? item.transform : [];
      const x = Number.isFinite(transform[4]) ? transform[4] : 0;
      const y = Number.isFinite(transform[5]) ? transform[5] : 0;
      const width = Number.isFinite(item?.width) ? item.width : 0;
      const height = Number.isFinite(item?.height) ? item.height : 0;

      itensTextoPdf.push({
        str: textoLimpo,
        texto: textoLimpo,
        pagina: paginaNumero,
        x,
        y,
        width,
        height,
        transform,
      });
    }
  }

  atualizarProgresso(0.9);
  const resultadoTabela = extrairParticipantesTabelaPdf(itensTextoPdf, opcoes);
  const textoPlanilha = converterTabelaPdfParaTextoPlanilha(resultadoTabela.participantes || []);
  const validacao = validarResultadoTabelaPdf(resultadoTabela);
  atualizarProgresso(1);

  return {
    participantes: resultadoTabela.participantes || [],
    textoPlanilha,
    itensTextoPdf,
    totalItensTextoPdf: itensTextoPdf.length,
    totalPaginas,
    diagnostico: resultadoTabela.diagnostico || {},
    validacao,
    origem: "pdf_text_layer",
  };
}

export { extrairTabelaListaPresencaDePdf };

export default function usePdfTabelaListaPresenca({ arquivo = null, ativo = true } = {}) {
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [resultado, setResultado] = useState(null);
  const [progresso, setProgresso] = useState(0);
  const [etapa, setEtapa] = useState("");

  const atualizarProgresso = useCallback((valor) => {
    setProgresso(Math.max(0, Math.min(1, valor)));
  }, []);

  const executar = useCallback(
    async (arquivoManual) => {
      const arquivoAlvo = arquivoManual || arquivo || null;
      const erroArquivo = validarArquivoPdf(arquivoAlvo);

      if (erroArquivo) {
        setErro(erroArquivo);
        setResultado(null);
        setEtapa("erro");
        setProgresso(0);
        return null;
      }

      try {
        setCarregando(true);
        setErro("");
        setEtapa("Lendo camada de texto do PDF...");
        atualizarProgresso(0.05);

        const resultadoPdf = await extrairTabelaListaPresencaDePdf(arquivoAlvo, {
          onProgresso: atualizarProgresso,
        });

        setEtapa("Convertendo texto do PDF em tabela interna...");
        setResultado(resultadoPdf);
        atualizarProgresso(1);
        setEtapa("concluido");
        return resultadoPdf;
      } catch (erroExecucao) {
        const mensagem = erroExecucao instanceof Error ? erroExecucao.message : "Não foi possível ler a tabela interna do PDF.";
        setErro(mensagem || "Não foi possível ler a tabela interna do PDF.");
        setResultado(null);
        setEtapa("erro");
        setProgresso(0);
        return null;
      } finally {
        setCarregando(false);
      }
    },
    [arquivo, atualizarProgresso],
  );

  useEffect(() => {
    if (!ativo || !arquivo) {
      return;
    }

    void executar(arquivo);
  }, [ativo, arquivo, executar]);

  const estado = useMemo(
    () => ({
      carregando,
      erro,
      resultado,
      progresso,
      etapa,
      executar,
    }),
    [carregando, erro, resultado, progresso, etapa, executar],
  );

  return estado;
}
