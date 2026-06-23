import { useEffect, useMemo, useState } from "react";
import { normalizarNome } from "../utils/normalizarNome";

function criarCanvas(largura, altura) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.floor(largura || 1));
  canvas.height = Math.max(1, Math.floor(altura || 1));
  return canvas;
}

function limparTexto(texto) {
  return String(texto || "").replace(/\s+/g, " ").trim();
}

function extrairLinhasTexto(texto) {
  return String(texto || "")
    .split(/\n+/)
    .map((linha) => limparTexto(linha))
    .filter(Boolean);
}

function montarTextoCompleto(paginas) {
  return paginas
    .flatMap((pagina) => pagina.linhas || [])
    .map((linha) => linha.texto || "")
    .filter(Boolean)
    .join("\n");
}

function garantirProgressivo(valor) {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) {
    return 0;
  }
  return Math.min(1, Math.max(0, numero));
}

async function obterDependenciasPdf() {
  const [{ getDocument, GlobalWorkerOptions }, pdfWorkerUrl, { createWorker }] = await Promise.all([
    import("pdfjs-dist"),
    import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
    import("tesseract.js"),
  ]);

  GlobalWorkerOptions.workerSrc = pdfWorkerUrl.default || pdfWorkerUrl;

  return {
    getDocument,
    createWorker,
  };
}

function identificarNumeroLinha(texto) {
  const primeiroToken = limparTexto(texto).split(" ")[0] || "";
  return /^[0-9]{1,4}$/.test(primeiroToken) ? primeiroToken : "";
}

function identificarFuncao(texto) {
  const textoNormalizado = normalizarNome(texto);
  const funcoesConhecidas = [
    "PEDREIRO",
    "AJUDANTE",
    "LIDER",
    "MOTORISTA",
    "ENCARREGADO",
    "OP DE MAQ",
    "OP DE BETONEIRA",
    "GREIDISTA",
    "CARPINTEIRO",
    "AUX ADM",
    "APONTADOR",
    "SOLDADOR",
    "ELETRICISTA",
    "SERVENTE",
    "MESTRE",
    "TECNICO",
    "VIGIA",
  ];

  return funcoesConhecidas.find((funcao) => textoNormalizado.includes(normalizarNome(funcao))) || "";
}

function extrairNomeLinha(texto) {
  const textoLimpo = limparTexto(texto);
  if (!textoLimpo) {
    return "";
  }

  const funcaoDetectada = identificarFuncao(textoLimpo);
  const tokens = textoLimpo.split(" ").filter(Boolean);

  if (/^[0-9]{1,4}$/.test(tokens[0] || "")) {
    tokens.shift();
  }

  if (funcaoDetectada) {
    const indiceFuncao = normalizarNome(textoLimpo).indexOf(normalizarNome(funcaoDetectada));
    if (indiceFuncao > -1) {
      const parteAntesDaFuncao = textoLimpo.slice(0, indiceFuncao).trim();
      return parteAntesDaFuncao.replace(/^[0-9]{1,4}\s*/, "").trim();
    }
  }

  return tokens
    .filter((token) => normalizarNome(token) !== "ASSINATURA")
    .join(" ")
    .trim();
}

function detectarAssinaturaVisual(canvas, bbox) {
  if (!canvas || !bbox) {
    return false;
  }

  const contexto = canvas.getContext("2d", { willReadFrequently: true });
  if (!contexto) {
    return false;
  }

  const inicioX = Math.max(0, Math.floor(canvas.width * 0.65));
  const fimX = Math.min(canvas.width, Math.floor(canvas.width * 0.97));
  const inicioY = Math.max(0, Math.floor((bbox.y0 || 0) - 6));
  const fimY = Math.min(canvas.height, Math.ceil((bbox.y1 || 0) + 6));

  if (fimX <= inicioX || fimY <= inicioY) {
    return false;
  }

  let pixelsEscuros = 0;
  let pixelsAmostrados = 0;

  for (let y = inicioY; y < fimY; y += 2) {
    const dados = contexto.getImageData(inicioX, y, fimX - inicioX, 1).data;
    for (let indice = 0; indice < dados.length; indice += 16) {
      const r = dados[indice];
      const g = dados[indice + 1];
      const b = dados[indice + 2];
      pixelsAmostrados += 1;
      if (r + g + b < 560) {
        pixelsEscuros += 1;
      }
    }
  }

  if (!pixelsAmostrados) {
    return false;
  }

  return pixelsEscuros > 24 && pixelsEscuros / pixelsAmostrados >= 0.08;
}

async function renderizarPaginaEmCanvas(pagina, escalaBase = 1) {
  const viewportBase = pagina.getViewport({ scale: 1 });
  const larguraMaxima = 1600;
  const escalaAjustada = Math.min(2, Math.max(0.8, larguraMaxima / (viewportBase.width || 1)));
  const viewport = pagina.getViewport({ scale: escalaBase * escalaAjustada });
  const canvas = criarCanvas(viewport.width, viewport.height);
  const contexto = canvas.getContext("2d", { willReadFrequently: true });

  if (!contexto) {
    throw new Error("Não foi possível criar o canvas para renderizar o PDF.");
  }

  await pagina.render({ canvasContext: contexto, viewport }).promise;
  return canvas;
}

async function executarOcrPagina(worker, canvas) {
  const resposta = await worker.recognize(canvas);
  return resposta?.data || resposta || {};
}

function montarLinhaReconhecida({ texto, line, pagina, indiceGlobal, canvas }) {
  const textoLimpo = limparTexto(texto);
  const confianca = Math.max(0, Math.min(100, Math.round(line?.confidence ?? 0)));
  const assinaturaVisual = detectarAssinaturaVisual(canvas, line?.bbox || null);
  const numero = identificarNumeroLinha(textoLimpo);
  const funcao = identificarFuncao(textoLimpo);
  const nome = extrairNomeLinha(textoLimpo);

  return {
    indice: indiceGlobal,
    pagina,
    numero,
    texto: textoLimpo,
    textoNormalizado: normalizarNome(textoLimpo),
    nome,
    nomeNormalizado: normalizarNome(nome),
    funcao,
    assinou: assinaturaVisual,
    assinatura_visual: assinaturaVisual,
    confianca,
    bbox: line?.bbox || null,
    textoCamada: "",
  };
}

function calcularDiagnosticoOcr({ paginas, linhas, textoCamadaTotal, isPdfEscaneado }) {
  const linhasSeguras = Array.isArray(linhas) ? linhas : [];
  const textoCamada = typeof textoCamadaTotal === "string" ? textoCamadaTotal : "";
  const totalLinhasOcr = linhasSeguras.length;
  const totalLinhasComBbox = linhasSeguras.filter((linha) => Boolean(linha?.bbox)).length;
  const totalLinhasSemBbox = totalLinhasOcr - totalLinhasComBbox;
  const totalLinhasComConfianca = linhasSeguras.filter((linha) => Number.isFinite(Number(linha?.confianca))).length;
  const somaConfianca = linhasSeguras.reduce((acumulado, linha) => {
    const confianca = Number(linha?.confianca);
    return Number.isFinite(confianca) ? acumulado + confianca : acumulado;
  }, 0);
  const mediaConfiancaLinhas = totalLinhasComConfianca > 0 ? somaConfianca / totalLinhasComConfianca : 0;
  const totalLinhasComAssinaturaVisual = linhasSeguras.filter((linha) => Boolean(linha?.assinatura_visual)).length;
  const amostraLinhas = linhasSeguras.slice(0, 10).map((linha) => ({
    pagina: linha?.pagina ?? null,
    indice: linha?.indice ?? null,
    texto: linha?.texto ?? "",
    nome: linha?.nome ?? "",
    funcao: linha?.funcao ?? "",
    confianca: Number.isFinite(Number(linha?.confianca)) ? Number(linha?.confianca) : null,
    bbox: linha?.bbox ?? null,
    assinatura_visual: Boolean(linha?.assinatura_visual),
  }));

  return {
    totalPaginas: Array.isArray(paginas) ? paginas.length : 0,
    totalLinhasOcr,
    totalLinhasComBbox,
    totalLinhasSemBbox,
    totalLinhasComConfianca,
    mediaConfiancaLinhas,
    totalLinhasComAssinaturaVisual,
    temCamadaTexto: textoCamada.trim().length > 0,
    tamanhoTextoCamada: textoCamada.length,
    isPdfEscaneado: Boolean(isPdfEscaneado),
    amostraLinhas,
  };
}

export async function executarPdfOcrArquivo(arquivo, opcoes = {}) {
  const { onProgresso } = opcoes || {};

  if (!arquivo) {
    throw new Error("Nenhum arquivo PDF foi informado para OCR.");
  }

  const arrayBuffer = await arquivo.arrayBuffer();
  const { getDocument, createWorker } = await obterDependenciasPdf();
  const documentoPdf = await getDocument({ data: arrayBuffer }).promise;
  const totalPaginas = documentoPdf?.numPages || 0;
  const worker = await createWorker("por+eng", 1, {
    logger: (evento) => {
      if (typeof onProgresso !== "function") {
        return;
      }

      if (evento?.status === "recognizing text") {
        onProgresso(garantirProgressivo(evento.progress));
      }
    },
  });

  const paginas = [];
  const linhas = [];
  let textoCamadaTotal = "";
  let isPdfEscaneado = false;

  try {
    for (let paginaAtual = 1; paginaAtual <= totalPaginas; paginaAtual += 1) {
      const progressoLeitura = (paginaAtual - 1) / Math.max(1, totalPaginas);
      if (typeof onProgresso === "function") {
        onProgresso(garantirProgressivo(progressoLeitura * 0.4));
      }

      const pagina = await documentoPdf.getPage(paginaAtual);
      const canvas = await renderizarPaginaEmCanvas(pagina, 1);
      const textContent = await pagina.getTextContent();
      const textoCamada = (textContent?.items || [])
        .map((item) => item?.str || "")
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      textoCamadaTotal = [textoCamadaTotal, textoCamada].filter(Boolean).join(" ").trim();
      if (textoCamada.length < 50) {
        isPdfEscaneado = true;
      }

      const ocr = await executarOcrPagina(worker, canvas);
      const linhasPagina = [];

      const linhasTexto = Array.isArray(ocr?.lines) && ocr.lines.length
        ? ocr.lines
        : extrairLinhasTexto(ocr?.text || "");

      if (Array.isArray(ocr?.lines) && ocr.lines.length) {
        for (const [indiceLinha, line] of ocr.lines.entries()) {
          const textoLinha = line?.text || "";
          const linha = montarLinhaReconhecida({
            texto: textoLinha,
            line,
            pagina: paginaAtual,
            indiceGlobal: linhas.length + indiceLinha + 1,
            canvas,
          });

          if (linha.texto || linha.nome || linha.funcao) {
            linhasPagina.push(linha);
            linhas.push(linha);
          }
        }
      } else {
        linhasTexto.forEach((textoLinha, indiceLinha) => {
          const linha = montarLinhaReconhecida({
            texto: textoLinha,
            line: { confidence: 0, bbox: null },
            pagina: paginaAtual,
            indiceGlobal: linhas.length + indiceLinha + 1,
            canvas,
          });

          if (linha.texto || linha.nome || linha.funcao) {
            linhasPagina.push(linha);
            linhas.push(linha);
          }
        });
      }

      paginas.push({
        numero: paginaAtual,
        textoCamada,
        linhas: linhasPagina,
      });

      if (typeof onProgresso === "function") {
        onProgresso(garantirProgressivo(0.4 + (paginaAtual / Math.max(1, totalPaginas)) * 0.5));
      }
    }

    const textoCompleto = montarTextoCompleto(paginas);

    if (typeof onProgresso === "function") {
      onProgresso(1);
    }

    const diagnosticoOcr = calcularDiagnosticoOcr({
      paginas,
      linhas,
      textoCamadaTotal,
      isPdfEscaneado,
    });

    return {
      resultado: linhas,
      paginas,
      textoCompleto,
      textoCamadaTotal,
      paginaTotal: totalPaginas,
      isPdfEscaneado,
      progresso: 1,
      diagnosticoOcr,
    };
  } finally {
    await worker.terminate().catch(() => {});
  }
}

export default function usePdfOcr({ arquivo = null, ativo = true } = {}) {
  const [resultado, setResultado] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [progresso, setProgresso] = useState(0);
  const [isPdfEscaneado, setIsPdfEscaneado] = useState(false);

  const arquivoChave = useMemo(() => {
    if (!arquivo) {
      return "";
    }
    return [arquivo.name, arquivo.size, arquivo.lastModified, arquivo.type].join("|");
  }, [arquivo]);

  useEffect(() => {
    let cancelado = false;

    async function processar() {
      if (!ativo || !arquivo) {
        setResultado(null);
        setErro("");
        setCarregando(false);
        setProgresso(0);
        setIsPdfEscaneado(false);
        return;
      }

      setCarregando(true);
      setErro("");
      setProgresso(0);
      setIsPdfEscaneado(false);

      try {
        const saida = await executarPdfOcrArquivo(arquivo, {
          onProgresso: (valor) => {
            if (!cancelado) {
              setProgresso(garantirProgressivo(valor));
            }
          },
        });

        if (cancelado) {
          return;
        }

        setResultado(saida);
        setIsPdfEscaneado(Boolean(saida?.isPdfEscaneado));
        setProgresso(1);
      } catch (erroExecucao) {
        if (cancelado) {
          return;
        }

        setErro(erroExecucao instanceof Error ? erroExecucao.message : "Falha ao processar o PDF com OCR.");
        setResultado(null);
        setProgresso(0);
        setIsPdfEscaneado(false);
      } finally {
        if (!cancelado) {
          setCarregando(false);
        }
      }
    }

    processar();

    return () => {
      cancelado = true;
    };
  }, [arquivoChave, ativo]);

  return {
    resultado,
    carregando,
    erro,
    progresso,
    isPdfEscaneado,
  };
}
