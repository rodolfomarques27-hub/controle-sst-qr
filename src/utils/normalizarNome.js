function converterParaTexto(valor) {
  if (valor == null) {
    return "";
  }

  if (typeof valor === "string") {
    return valor;
  }

  return String(valor);
}

export function normalizarNome(nome) {
  const textoBase = converterParaTexto(nome);

  if (!textoBase) {
    return "";
  }

  return textoBase
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\[|\]|\||[<>{}(),;:!?'"`´^~]/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function obterPalavrasValidas(texto) {
  return normalizarNome(texto)
    .split(" ")
    .map((palavra) => palavra.trim())
    .filter((palavra) => palavra.length > 2);
}

function contarCaracteresUteis(texto) {
  return normalizarNome(texto).replace(/[^A-Z0-9]/g, "").length;
}

function calcularProporcaoEmComum(palavrasA, palavrasB) {
  if (!palavrasA.length || !palavrasB.length) {
    return 0;
  }

  const conjuntoB = new Set(palavrasB);
  let comuns = 0;

  for (const palavra of palavrasA) {
    if (conjuntoB.has(palavra)) {
      comuns += 1;
    }
  }

  const denominador = Math.max(palavrasA.length, palavrasB.length);
  return denominador > 0 ? comuns / denominador : 0;
}

function ocrTemConteudoMinimoParaComparar(textoOcr) {
  const textoNormalizado = normalizarNome(textoOcr);
  const caracteresUteis = contarCaracteresUteis(textoNormalizado);

  if (caracteresUteis < 3) {
    return false;
  }

  return obterPalavrasValidas(textoNormalizado).length > 0;
}

function ocrContemNomeCadastroCompleto(textoCadastro, textoOcr) {
  const cadastroNormalizado = normalizarNome(textoCadastro);
  const ocrNormalizado = normalizarNome(textoOcr);
  const palavrasCadastro = obterPalavrasValidas(cadastroNormalizado);

  if (palavrasCadastro.length < 2) {
    return false;
  }

  return ocrNormalizado.includes(cadastroNormalizado);
}

export function calcularSimilaridade(a, b) {
  const textoA = normalizarNome(a);
  const textoB = normalizarNome(b);

  if (!textoA && !textoB) {
    return 1;
  }

  if (!textoA || !textoB) {
    return 0;
  }

  if (!ocrTemConteudoMinimoParaComparar(textoB)) {
    return 0;
  }

  if (textoA === textoB) {
    return 1;
  }

  if (ocrContemNomeCadastroCompleto(textoA, textoB)) {
    return 0.95;
  }

  const palavrasA = obterPalavrasValidas(textoA);
  const palavrasB = obterPalavrasValidas(textoB);

  if (!palavrasA.length || !palavrasB.length) {
    return 0;
  }

  const proporcaoComum = calcularProporcaoEmComum(palavrasA, palavrasB);

  return Math.min(0.85, Math.max(0, proporcaoComum));
}

export function compararNomesLista(nomeCadastro, nomeOcr) {
  const nomeCadastroNormalizado = normalizarNome(nomeCadastro);
  const nomeOcrNormalizado = normalizarNome(nomeOcr);
  const similaridade = calcularSimilaridade(nomeCadastroNormalizado, nomeOcrNormalizado);
  const score = Math.round(similaridade * 100);
  const encontrado = similaridade >= 0.75;

  let motivo;

  if (!nomeCadastroNormalizado && !nomeOcrNormalizado) {
    motivo = "Nomes vazios ou não informados";
  } else if (!ocrTemConteudoMinimoParaComparar(nomeOcrNormalizado)) {
    motivo = "Trecho OCR muito curto para comparação confiável";
  } else if (nomeCadastroNormalizado === nomeOcrNormalizado) {
    motivo = "Nomes idênticos após normalização";
  } else if (ocrContemNomeCadastroCompleto(nomeCadastroNormalizado, nomeOcrNormalizado)) {
    motivo = "Nome completo localizado no OCR";
  } else if (similaridade >= 0.75) {
    motivo = "Correspondência forte por palavras em comum";
  } else if (similaridade >= 0.45) {
    motivo = "Correspondência parcial, recomenda conferência visual";
  } else {
    motivo = "Baixa similaridade entre os nomes";
  }

  return {
    nomeCadastroNormalizado,
    nomeOcrNormalizado,
    similaridade,
    score,
    encontrado,
    motivo,
  };
}
