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
  const bboxLinha = extrairBboxLinhaOcr(line);

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
    bbox: bboxLinha,
    textoCamada: "",
  };
}

function converterNumeroBboxOcr(valor) {
  if (valor === null || valor === undefined) {
    return null;
  }

  if (typeof valor === "string" && valor.trim() === "") {
    return null;
  }

  const numero = Number(valor);
  if (!Number.isFinite(numero)) {
    return null;
  }

  return numero;
}

function normalizarBboxOcr(bbox) {
  if (!bbox || typeof bbox !== "object") {
    return null;
  }

  const x0 = converterNumeroBboxOcr(bbox.x0);
  const y0 = converterNumeroBboxOcr(bbox.y0);
  const x1 = converterNumeroBboxOcr(bbox.x1);
  const y1 = converterNumeroBboxOcr(bbox.y1);

  if ([x0, y0, x1, y1].some((valor) => valor === null)) {
    return null;
  }

  const largura = x1 - x0;
  const altura = y1 - y0;

  if (largura <= 0 || altura <= 0) {
    return null;
  }

  if (x0 === 0 && y0 === 0 && x1 === 0 && y1 === 0) {
    return null;
  }

  return {
    x0,
    y0,
    x1,
    y1,
    largura,
    altura,
    centroX: x0 + largura / 2,
    centroY: y0 + altura / 2,
  };
}

function extrairBboxDiretoOcr(origem) {
  if (!origem || typeof origem !== "object") {
    return null;
  }

  const bboxOrigem = origem?.bbox && typeof origem.bbox === "object" ? origem.bbox : null;
  const x0 = converterNumeroBboxOcr(origem?.x0 ?? bboxOrigem?.x0 ?? bboxOrigem?.left ?? origem?.left);
  const y0 = converterNumeroBboxOcr(origem?.y0 ?? bboxOrigem?.y0 ?? bboxOrigem?.top ?? origem?.top);

  let x1 = converterNumeroBboxOcr(origem?.x1 ?? bboxOrigem?.x1 ?? bboxOrigem?.right ?? origem?.right);
  let y1 = converterNumeroBboxOcr(origem?.y1 ?? bboxOrigem?.y1 ?? bboxOrigem?.bottom ?? origem?.bottom);

  const width = converterNumeroBboxOcr(origem?.width ?? bboxOrigem?.width);
  const height = converterNumeroBboxOcr(origem?.height ?? bboxOrigem?.height);

  if ((x1 === null || y1 === null) && x0 !== null && y0 !== null) {
    if (width !== null && height !== null && width > 0 && height > 0) {
      x1 = x0 + width;
      y1 = y0 + height;
    }
  }

  if (x0 === null || y0 === null || x1 === null || y1 === null) {
    return null;
  }

  const bboxNormalizado = normalizarBboxOcr({ x0, y0, x1, y1 });
  if (!bboxNormalizado) {
    return null;
  }

  return {
    x0: bboxNormalizado.x0,
    y0: bboxNormalizado.y0,
    x1: bboxNormalizado.x1,
    y1: bboxNormalizado.y1,
  };
}

function unirBboxesOcr(bboxes) {
  const bboxesValidos = (Array.isArray(bboxes) ? bboxes : [])
    .map((bbox) => normalizarBboxOcr(bbox))
    .filter(Boolean);

  if (!bboxesValidos.length) {
    return null;
  }

  return {
    x0: Math.min(...bboxesValidos.map((bbox) => bbox.x0)),
    y0: Math.min(...bboxesValidos.map((bbox) => bbox.y0)),
    x1: Math.max(...bboxesValidos.map((bbox) => bbox.x1)),
    y1: Math.max(...bboxesValidos.map((bbox) => bbox.y1)),
  };
}

function extrairBboxLinhaOcr(line) {
  const bboxDireto = extrairBboxDiretoOcr(line);
  if (bboxDireto) {
    return bboxDireto;
  }

  const colecoes = [line?.words, line?.children, line?.symbols].filter(Array.isArray);
  const bboxes = [];

  for (const colecao of colecoes) {
    for (const item of colecao) {
      const bboxItem = extrairBboxDiretoOcr(item);
      if (bboxItem) {
        bboxes.push(bboxItem);
      }
    }
  }

  return unirBboxesOcr(bboxes);
}

function calcularDiagnosticoEstruturalOcr(linhas) {
  const linhasSeguras = Array.isArray(linhas) ? linhas : [];
  const linhasComCoordenadas = linhasSeguras
    .map((linha, indice) => {
      const bbox = normalizarBboxOcr(linha?.bbox);
      return bbox ? { linha, bbox, indice } : null;
    })
    .filter(Boolean);

  const totalLinhasComCoordenadas = linhasComCoordenadas.length;
  const totalLinhasSemCoordenadas = linhasSeguras.length - totalLinhasComCoordenadas;

  const xValores = linhasComCoordenadas.flatMap(({ bbox }) => [bbox.x0, bbox.x1]);
  const yValores = linhasComCoordenadas.flatMap(({ bbox }) => [bbox.y0, bbox.y1]);
  const xMin = xValores.length ? Math.min(...xValores) : null;
  const xMax = xValores.length ? Math.max(...xValores) : null;
  const yMin = yValores.length ? Math.min(...yValores) : null;
  const yMax = yValores.length ? Math.max(...yValores) : null;

  const larguraEstimativa = Number.isFinite(xMin) && Number.isFinite(xMax) ? Math.max(0, xMax - xMin) : null;
  const alturaEstimativa = Number.isFinite(yMin) && Number.isFinite(yMax) ? Math.max(0, yMax - yMin) : null;

  const distribPorEixo = (valor, minimo, maximo) => {
    if (!Number.isFinite(valor) || !Number.isFinite(minimo) || !Number.isFinite(maximo) || maximo <= minimo) {
      return { esquerda: 0, centro: 0, direita: 0 };
    }

    const proporcao = (valor - minimo) / (maximo - minimo || 1);
    if (proporcao <= 1 / 3) {
      return { esquerda: 1, centro: 0, direita: 0 };
    }
    if (proporcao <= 2 / 3) {
      return { esquerda: 0, centro: 1, direita: 0 };
    }
    return { esquerda: 0, centro: 0, direita: 1 };
  };

  const distribuicaoHorizontal = linhasComCoordenadas.reduce(
    (acumulado, { bbox }) => {
      const atual = distribPorEixo(bbox.centroX, xMin, xMax);
      return {
        esquerda: acumulado.esquerda + atual.esquerda,
        centro: acumulado.centro + atual.centro,
        direita: acumulado.direita + atual.direita,
      };
    },
    { esquerda: 0, centro: 0, direita: 0 },
  );

  const distribuicaoVertical = linhasComCoordenadas.reduce(
    (acumulado, { bbox }) => {
      const atual = distribPorEixo(bbox.centroY, yMin, yMax);
      return {
        topo: acumulado.topo + atual.esquerda,
        meio: acumulado.meio + atual.centro,
        base: acumulado.base + atual.direita,
      };
    },
    { topo: 0, meio: 0, base: 0 },
  );

  const linhasPorPagina = linhasComCoordenadas.reduce((mapa, item) => {
    const pagina = Number(item?.linha?.pagina || 0) || 0;
    mapa.set(pagina, (mapa.get(pagina) || 0) + 1);
    return mapa;
  }, new Map());

  const paginas = Array.from(linhasPorPagina.entries())
    .sort((a, b) => a[0] - b[0])
    .slice(0, 10)
    .map(([pagina, totalLinhasPagina]) => ({ pagina, totalLinhasPagina }));

  const regioesProvaveis = {
    numero: { inicio: 0, fim: 15 },
    nome: { inicio: 15, fim: 55 },
    funcao: { inicio: 55, fim: 75 },
    assinatura: { inicio: 75, fim: 100 },
  };

  const amostraEstrutural = linhasComCoordenadas.slice(0, 10).map(({ linha, bbox, indice }) => {
    let regiaoProvavel = "nome";
    if (Number.isFinite(bbox.centroX) && Number.isFinite(xMin) && Number.isFinite(xMax) && xMax > xMin) {
      const percentual = ((bbox.centroX - xMin) / (xMax - xMin)) * 100;
      if (percentual <= 15) {
        regiaoProvavel = "numero";
      } else if (percentual <= 55) {
        regiaoProvavel = "nome";
      } else if (percentual <= 75) {
        regiaoProvavel = "funcao";
      } else {
        regiaoProvavel = "assinatura";
      }
    }

    return {
      pagina: linha?.pagina ?? null,
      indice: Number.isFinite(indice) ? indice : null,
      texto: linha?.texto ?? "",
      bbox,
      regiaoProvavel,
      assinatura_visual: Boolean(linha?.assinatura_visual),
      confianca: Number.isFinite(Number(linha?.confianca)) ? Number(linha?.confianca) : null,
    };
  });

  return {
    totalLinhasComCoordenadas,
    totalLinhasSemCoordenadas,
    limitesGerais: {
      xMin,
      xMax,
      yMin,
      yMax,
      larguraEstimativa,
      alturaEstimativa,
    },
    distribuicaoHorizontal,
    distribuicaoVertical,
    paginas,
    regioesProvaveis,
    amostraEstrutural,
  };
}

function classificarRegiaoHorizontalOcr(centroX, limitesGerais) {
  const xMin = Number(limitesGerais?.xMin);
  const xMax = Number(limitesGerais?.xMax);

  if (!Number.isFinite(Number(centroX)) || !Number.isFinite(xMin) || !Number.isFinite(xMax) || xMax <= xMin) {
    return "indefinida";
  }

  const percentual = ((Number(centroX) - xMin) / (xMax - xMin)) * 100;
  if (!Number.isFinite(percentual)) {
    return "indefinida";
  }

  if (percentual <= 15) {
    return "numero";
  }
  if (percentual <= 55) {
    return "nome";
  }
  if (percentual <= 75) {
    return "funcao";
  }
  return "assinatura";
}

function calcularFaixaYLinhaOcr(bbox) {
  const normalizado = normalizarBboxOcr(bbox);
  if (!normalizado) {
    return null;
  }

  return {
    y0: normalizado.y0,
    y1: normalizado.y1,
    centroY: normalizado.centroY,
    altura: normalizado.altura,
  };
}

function calcularMedianaNumeros(valores) {
  const limpos = (Array.isArray(valores) ? valores : [])
    .map((valor) => Number(valor))
    .filter((valor) => Number.isFinite(valor))
    .sort((a, b) => a - b);

  if (!limpos.length) {
    return null;
  }

  const meio = Math.floor(limpos.length / 2);
  if (limpos.length % 2 === 0) {
    return (limpos[meio - 1] + limpos[meio]) / 2;
  }

  return limpos[meio];
}

function agruparLinhasOcrPorLinhaVisual(linhas, limitesGerais) {
  const linhasSeguras = Array.isArray(linhas) ? linhas : [];
  const linhasComCoordenadas = linhasSeguras
    .map((linha, indice) => {
      const bbox = normalizarBboxOcr(linha?.bbox);
      const faixaY = calcularFaixaYLinhaOcr(bbox);
      return bbox && faixaY ? { linha, bbox, faixaY, indice } : null;
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (a.linha?.pagina !== b.linha?.pagina) {
        return Number(a.linha?.pagina || 0) - Number(b.linha?.pagina || 0);
      }
      if (a.faixaY.centroY !== b.faixaY.centroY) {
        return a.faixaY.centroY - b.faixaY.centroY;
      }
      return a.bbox.x0 - b.bbox.x0;
    });

  const porPagina = new Map();
  for (const item of linhasComCoordenadas) {
    const pagina = Number(item?.linha?.pagina || 0) || 0;
    const lista = porPagina.get(pagina) || [];
    lista.push(item);
    porPagina.set(pagina, lista);
  }

  const grupos = [];
  const pages = Array.from(porPagina.entries()).sort((a, b) => a[0] - b[0]);

  for (const [pagina, itensPagina] of pages) {
    const limitesPagina = {
      xMin: limitesGerais?.xMin,
      xMax: limitesGerais?.xMax,
    };

    const xPagina = itensPagina.flatMap(({ bbox }) => [bbox.x0, bbox.x1]).filter((valor) => Number.isFinite(valor));
    if (xPagina.length) {
      limitesPagina.xMin = Math.min(...xPagina);
      limitesPagina.xMax = Math.max(...xPagina);
    }

    const alturas = itensPagina.map((item) => item.faixaY.altura);
    const alturaMediana = calcularMedianaNumeros(alturas);
    const toleranciaY = Math.max(8, Math.min(22, (alturaMediana ? alturaMediana * 0.9 : 12)));

    const gruposPagina = [];
    let grupoAtual = null;
    let indiceGrupo = 0;

    for (const item of itensPagina) {
      if (!grupoAtual) {
        grupoAtual = {
          pagina,
          indiceGrupo: indiceGrupo + 1,
          itens: [item],
          yMin: item.faixaY.y0,
          yMax: item.faixaY.y1,
          centroYMedio: item.faixaY.centroY,
        };
        indiceGrupo += 1;
        continue;
      }

      const diferencaY = Math.abs(item.faixaY.centroY - grupoAtual.centroYMedio);
      if (diferencaY <= toleranciaY) {
        grupoAtual.itens.push(item);
        grupoAtual.yMin = Math.min(grupoAtual.yMin, item.faixaY.y0);
        grupoAtual.yMax = Math.max(grupoAtual.yMax, item.faixaY.y1);
        grupoAtual.centroYMedio =
          grupoAtual.itens.reduce((acumulado, atual) => acumulado + atual.faixaY.centroY, 0) / grupoAtual.itens.length;
      } else {
        gruposPagina.push(grupoAtual);
        grupoAtual = {
          pagina,
          indiceGrupo: indiceGrupo + 1,
          itens: [item],
          yMin: item.faixaY.y0,
          yMax: item.faixaY.y1,
          centroYMedio: item.faixaY.centroY,
        };
        indiceGrupo += 1;
      }
    }

    if (grupoAtual) {
      gruposPagina.push(grupoAtual);
    }

    const gruposPaginaNormalizados = gruposPagina.map((grupo) => {
      const linhasGrupo = grupo.itens
        .map((item) => ({
          indice: item.linha?.indice ?? item.indice ?? null,
          texto: item.linha?.texto || "",
          nome: item.linha?.nome || "",
          funcao: item.linha?.funcao || "",
          confianca: Number.isFinite(Number(item.linha?.confianca)) ? Number(item.linha?.confianca) : null,
          bbox: item.linha?.bbox || null,
          assinatura_visual: Boolean(item.linha?.assinatura_visual),
          regiaoHorizontal: classificarRegiaoHorizontalOcr(item.bbox.centroX, limitesPagina),
        }))
        .sort((a, b) => {
          const bboxA = normalizarBboxOcr(a.bbox);
          const bboxB = normalizarBboxOcr(b.bbox);
          return (bboxA?.x0 ?? 0) - (bboxB?.x0 ?? 0);
        });

      const regioes = {
        numero: linhasGrupo.filter((linha) => linha.regiaoHorizontal === "numero"),
        nome: linhasGrupo.filter((linha) => linha.regiaoHorizontal === "nome"),
        funcao: linhasGrupo.filter((linha) => linha.regiaoHorizontal === "funcao"),
        assinatura: linhasGrupo.filter((linha) => linha.regiaoHorizontal === "assinatura"),
        indefinida: linhasGrupo.filter((linha) => linha.regiaoHorizontal === "indefinida"),
      };

      return {
        pagina,
        indiceGrupo: grupo.indiceGrupo,
        yMin: grupo.yMin,
        yMax: grupo.yMax,
        totalLinhas: linhasGrupo.length,
        textoLinha: linhasGrupo.map((linha) => linha.texto || "").filter(Boolean).join(" ").trim(),
        linhas: linhasGrupo,
        regioes,
      };
    });

    grupos.push(...gruposPaginaNormalizados);
  }

  return grupos;
}

function montarAmostraSegmentacaoOcr(gruposLinhaVisual) {
  return (Array.isArray(gruposLinhaVisual) ? gruposLinhaVisual : []).slice(0, 10).map((grupo) => {
    const extrairTextoRegiao = (regiao) => (Array.isArray(regiao) ? regiao.map((linha) => linha.texto || "").filter(Boolean).join(" ").trim() : "");
    const numero = extrairTextoRegiao(grupo?.regioes?.numero);
    const nome = extrairTextoRegiao(grupo?.regioes?.nome);
    const funcao = extrairTextoRegiao(grupo?.regioes?.funcao);
    const assinatura = extrairTextoRegiao(grupo?.regioes?.assinatura);

    return {
      pagina: grupo?.pagina ?? null,
      indiceGrupo: grupo?.indiceGrupo ?? null,
      yMin: Number.isFinite(Number(grupo?.yMin)) ? Number(grupo.yMin) : null,
      yMax: Number.isFinite(Number(grupo?.yMax)) ? Number(grupo.yMax) : null,
      totalLinhas: Number(grupo?.totalLinhas || 0),
      textoLinha: grupo?.textoLinha || "",
      numero,
      nome,
      funcao,
      assinatura,
      totalRegiaoNumero: Array.isArray(grupo?.regioes?.numero) ? grupo.regioes.numero.length : 0,
      totalRegiaoNome: Array.isArray(grupo?.regioes?.nome) ? grupo.regioes.nome.length : 0,
      totalRegiaoFuncao: Array.isArray(grupo?.regioes?.funcao) ? grupo.regioes.funcao.length : 0,
      totalRegiaoAssinatura: Array.isArray(grupo?.regioes?.assinatura) ? grupo.regioes.assinatura.length : 0,
    };
  });
}

function calcularDiagnosticoSegmentacaoOcr(linhas) {
  const linhasSeguras = Array.isArray(linhas) ? linhas : [];
  const totalLinhasComCoordenadas = linhasSeguras.filter((linha) => Boolean(normalizarBboxOcr(linha?.bbox))).length;
  const totalLinhasSemCoordenadas = linhasSeguras.length - totalLinhasComCoordenadas;
  const linhasComCoordenadas = linhasSeguras.filter((linha) => Boolean(normalizarBboxOcr(linha?.bbox)));
  const limitesGerais = (() => {
    const bboxes = linhasComCoordenadas.map((linha) => normalizarBboxOcr(linha?.bbox)).filter(Boolean);
    const xMin = bboxes.length ? Math.min(...bboxes.map((bbox) => bbox.x0)) : null;
    const xMax = bboxes.length ? Math.max(...bboxes.map((bbox) => bbox.x1)) : null;
    return { xMin, xMax };
  })();
  const gruposLinhaVisual = agruparLinhasOcrPorLinhaVisual(linhasSeguras, limitesGerais);
  const porPagina = new Map();

  for (const grupo of gruposLinhaVisual) {
    const pagina = Number(grupo?.pagina || 0) || 0;
    const item = porPagina.get(pagina) || { pagina, totalGrupos: 0, totalLinhasComCoordenadas: 0 };
    item.totalGrupos += 1;
    item.totalLinhasComCoordenadas += Number(grupo?.totalLinhas || 0);
    porPagina.set(pagina, item);
  }

  const paginas = Array.from(porPagina.values())
    .sort((a, b) => a.pagina - b.pagina)
    .slice(0, 10)
    .map((item) => ({
      pagina: item.pagina,
      totalGrupos: item.totalGrupos,
      totalLinhasComCoordenadas: item.totalLinhasComCoordenadas,
    }));

  return {
    totalGruposLinhaVisual: gruposLinhaVisual.length,
    totalLinhasComCoordenadas,
    totalLinhasSemCoordenadas,
    paginas,
    amostraSegmentacao: montarAmostraSegmentacaoOcr(gruposLinhaVisual),
  };
}

function contarBboxesValidosOcr(itens) {
  if (!Array.isArray(itens)) {
    return {
      total: 0,
      totalComBboxBruto: 0,
      totalComBboxValido: 0,
      totalComBboxInvalido: 0,
    };
  }

  const total = itens.length;
  const totalComBboxBruto = itens.filter((item) => {
    if (!item || typeof item !== "object") {
      return false;
    }

    return Boolean(
      item?.bbox ||
      item?.x0 !== undefined ||
      item?.y0 !== undefined ||
      item?.x1 !== undefined ||
      item?.y1 !== undefined ||
      item?.left !== undefined ||
      item?.top !== undefined ||
      item?.right !== undefined ||
      item?.bottom !== undefined ||
      item?.width !== undefined ||
      item?.height !== undefined ||
      item?.x !== undefined ||
      item?.y !== undefined,
    );
  }).length;

  const totalComBboxValido = itens.filter((item) => Boolean(extrairBboxDiretoOcr(item))).length;

  return {
    total,
    totalComBboxBruto,
    totalComBboxValido,
    totalComBboxInvalido: totalComBboxBruto - totalComBboxValido,
  };
}

function calcularDiagnosticoEstruturaBrutaOcr(ocr) {
  const texto = String(ocr?.text || "");
  const lines = Array.isArray(ocr?.lines) ? ocr.lines : [];
  const words = Array.isArray(ocr?.words) ? ocr.words : [];
  const blocks = Array.isArray(ocr?.blocks) ? ocr.blocks : [];
  const paragraphs = Array.isArray(ocr?.paragraphs) ? ocr.paragraphs : [];
  const symbols = Array.isArray(ocr?.symbols) ? ocr.symbols : [];
  const linhas = contarBboxesValidosOcr(lines);
  const palavras = contarBboxesValidosOcr(words);
  const blocos = contarBboxesValidosOcr(blocks);
  const paragrafos = contarBboxesValidosOcr(paragraphs);
  const simbolos = contarBboxesValidosOcr(symbols);

  return {
    temTextoOcr: Boolean(texto && texto.trim()),
    tamanhoTextoOcr: texto.length,
    totalLines: lines.length,
    totalWords: words.length,
    totalBlocks: blocks.length,
    totalParagraphs: paragraphs.length,
    totalSymbols: symbols.length,
    linesComBboxBruto: linhas.totalComBboxBruto,
    linesComBboxValido: linhas.totalComBboxValido,
    linesComBboxInvalido: linhas.totalComBboxInvalido,
    wordsComBboxBruto: palavras.totalComBboxBruto,
    wordsComBboxValido: palavras.totalComBboxValido,
    wordsComBboxInvalido: palavras.totalComBboxInvalido,
    blocksComBboxValido: blocos.totalComBboxValido,
    paragraphsComBboxValido: paragrafos.totalComBboxValido,
    symbolsComBboxValido: simbolos.totalComBboxValido,
    chavesDisponiveis: Object.keys(ocr || {}).slice(0, 30),
  };
}

function calcularOrigemLeituraOcr({ textoCamadaTotal, isPdfEscaneado, diagnosticosEstruturaBruta }) {
  const diagnosticos = Array.isArray(diagnosticosEstruturaBruta) ? diagnosticosEstruturaBruta : [];
  const temCamadaTexto = String(textoCamadaTotal || "").trim().length > 0;
  const temOcrTexto = diagnosticos.some((diagnostico) => Boolean(diagnostico?.temTextoOcr));
  const temOcrEstruturado = diagnosticos.some((diagnostico) => Number(diagnostico?.totalLines || 0) > 0 || Number(diagnostico?.totalWords || 0) > 0);
  const temBboxValido = diagnosticos.some((diagnostico) => Number(diagnostico?.linesComBboxValido || 0) > 0 || Number(diagnostico?.wordsComBboxValido || 0) > 0);
  const usouFallbackTexto = diagnosticos.some((diagnostico) => Boolean(diagnostico?.usouFallbackTexto));

  let origemLeitura = "indefinida";
  if (temCamadaTexto && temOcrTexto && !temBboxValido) {
    origemLeitura = "pdf_text_layer_com_ocr_texto";
  } else if (temBboxValido) {
    origemLeitura = "ocr_estruturado_com_bbox";
  } else if (temOcrTexto && !temBboxValido) {
    origemLeitura = "ocr_texto_sem_bbox";
  } else if (temCamadaTexto && !temOcrTexto) {
    origemLeitura = "pdf_text_layer";
  }

  let origemDescricao = "Origem da leitura não identificada com segurança.";
  let recomendacaoTecnica = "Origem da leitura não identificada com segurança.";

  if (origemLeitura === "pdf_text_layer_com_ocr_texto") {
    origemDescricao = "Camada de texto do PDF e OCR experimental com texto, sem coordenadas úteis.";
    recomendacaoTecnica = "Priorizar tabela interna do PDF. OCR experimental está lendo texto, mas sem coordenadas úteis.";
  } else if (origemLeitura === "ocr_estruturado_com_bbox") {
    origemDescricao = "OCR experimental com texto e coordenadas válidas.";
    recomendacaoTecnica = "OCR possui coordenadas válidas para segmentação.";
  } else if (origemLeitura === "ocr_texto_sem_bbox") {
    origemDescricao = "OCR experimental retornou texto sem coordenadas válidas.";
    recomendacaoTecnica = "OCR retornou texto sem coordenadas válidas. Usar apenas como apoio.";
  } else if (origemLeitura === "pdf_text_layer") {
    origemDescricao = "PDF com camada de texto detectada.";
    recomendacaoTecnica = "PDF possui camada de texto. Priorizar leitura interna do PDF.";
  }

  return {
    origemLeitura,
    origemDescricao,
    temCamadaTexto,
    temOcrTexto,
    temOcrEstruturado,
    temBboxValido,
    usouFallbackTexto,
    recomendacaoTecnica,
    isPdfEscaneado: Boolean(isPdfEscaneado),
  };
}

function calcularDiagnosticoOcr({ paginas, linhas, textoCamadaTotal, isPdfEscaneado, diagnosticosEstruturaBruta }) {
  const linhasSeguras = Array.isArray(linhas) ? linhas : [];
  const textoCamada = typeof textoCamadaTotal === "string" ? textoCamadaTotal : "";
  const totalLinhasOcr = linhasSeguras.length;
  const totalLinhasComBboxBruto = linhasSeguras.filter((linha) => Boolean(linha?.bbox)).length;
  const totalLinhasComBbox = linhasSeguras.filter((linha) => Boolean(normalizarBboxOcr(linha?.bbox))).length;
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
    bbox: normalizarBboxOcr(linha?.bbox),
    assinatura_visual: Boolean(linha?.assinatura_visual),
  }));

  return {
    totalPaginas: Array.isArray(paginas) ? paginas.length : 0,
    totalLinhasOcr,
    totalLinhasComBboxBruto,
    totalLinhasComBboxInvalido: totalLinhasComBboxBruto - totalLinhasComBbox,
    totalLinhasComBbox,
    totalLinhasSemBbox,
    totalLinhasComConfianca,
    mediaConfiancaLinhas,
    totalLinhasComAssinaturaVisual,
    temCamadaTexto: textoCamada.trim().length > 0,
    tamanhoTextoCamada: textoCamada.length,
    isPdfEscaneado: Boolean(isPdfEscaneado),
    amostraLinhas,
    diagnosticoEstrutural: calcularDiagnosticoEstruturalOcr(linhasSeguras),
    diagnosticoSegmentacao: calcularDiagnosticoSegmentacaoOcr(linhasSeguras),
    diagnosticoOrigem: calcularOrigemLeituraOcr({
      textoCamadaTotal: textoCamada,
      isPdfEscaneado,
      diagnosticosEstruturaBruta,
    }),
    diagnosticoEstruturaBruta: {
      paginas: Array.isArray(diagnosticosEstruturaBruta) ? diagnosticosEstruturaBruta.slice(0, 10) : [],
      totalPaginasDiagnosticadas: Array.isArray(diagnosticosEstruturaBruta) ? diagnosticosEstruturaBruta.length : 0,
      totalLines: Array.isArray(diagnosticosEstruturaBruta)
        ? diagnosticosEstruturaBruta.reduce((acumulado, item) => acumulado + Number(item?.totalLines || 0), 0)
        : 0,
      totalWords: Array.isArray(diagnosticosEstruturaBruta)
        ? diagnosticosEstruturaBruta.reduce((acumulado, item) => acumulado + Number(item?.totalWords || 0), 0)
        : 0,
      totalLinesComBboxValido: Array.isArray(diagnosticosEstruturaBruta)
        ? diagnosticosEstruturaBruta.reduce((acumulado, item) => acumulado + Number(item?.linesComBboxValido || 0), 0)
        : 0,
      totalWordsComBboxValido: Array.isArray(diagnosticosEstruturaBruta)
        ? diagnosticosEstruturaBruta.reduce((acumulado, item) => acumulado + Number(item?.wordsComBboxValido || 0), 0)
        : 0,
      totalLinesComBboxInvalido: Array.isArray(diagnosticosEstruturaBruta)
        ? diagnosticosEstruturaBruta.reduce((acumulado, item) => acumulado + Number(item?.linesComBboxInvalido || 0), 0)
        : 0,
      totalWordsComBboxInvalido: Array.isArray(diagnosticosEstruturaBruta)
        ? diagnosticosEstruturaBruta.reduce((acumulado, item) => acumulado + Number(item?.wordsComBboxInvalido || 0), 0)
        : 0,
    },
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
  const diagnosticosEstruturaBruta = [];
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
      const diagnosticoEstruturaPagina = calcularDiagnosticoEstruturaBrutaOcr(ocr);
      diagnosticosEstruturaBruta.push({
        pagina: paginaAtual,
        ...diagnosticoEstruturaPagina,
        usouLinesEstruturadas: Array.isArray(ocr?.lines) && ocr.lines.length > 0,
        usouFallbackTexto: !(Array.isArray(ocr?.lines) && ocr.lines.length > 0),
      });
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
            line: { confidence: 0, bbox: null, words: [] },
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
      diagnosticosEstruturaBruta,
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
  }, [arquivo, arquivoChave, ativo]);

  return {
    resultado,
    carregando,
    erro,
    progresso,
    isPdfEscaneado,
  };
}
