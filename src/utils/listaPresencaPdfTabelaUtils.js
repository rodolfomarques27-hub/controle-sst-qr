const GRUPOS_CABECALHO = {
  numero: ["n", "no", "numero", "nro", "nr"],
  nome: ["nome", "colaborador", "funcionario", "empregado", "participante"],
  funcao: ["funcao", "cargo", "atividade"],
  assinatura: ["assinatura", "assinado", "presenca", "presente"],
  observacao: ["observacao", "obs"],
};

const TERMOS_INSTITUCIONAIS = [
  "TREINAMENTO",
  "CARGA HORÁRIA",
  "CARGA HORARIA",
  "INSTRUTOR",
  "EMPRESA",
  "CNPJ",
  "DATA",
  "NR",
  "CONTEÚDO",
  "CONTEUDO",
  "OBJETIVO",
  "AVALIAÇÃO",
  "AVALIACAO",
  "CERTIFICADO",
  "CAMSCANNER",
];

const TERMOS_FUNCAO = [
  "PEDREIRO",
  "AJUDANTE",
  "LIDER",
  "GREIDISTA",
  "MOTORISTA",
  "ENCARREGADO",
  "OP DE MAQ",
  "OP DE MAO",
  "OP DE MÁQUINAS",
  "OP DE MAQUINAS",
  "OP DE BETONEIRA",
  "CARPINTEIRO",
  "AUX ADM",
  "SERVENTE",
  "OPERADOR",
  "ELETRICISTA",
  "APONTADOR",
  "SOLDADOR",
  "MESTRE",
  "TECNICO",
  "VIGIA",
];

function normalizarTextoPdfTabela(valor) {
  const texto = typeof valor === "string" ? valor : valor == null ? "" : String(valor);
  return texto
    .replace(/\r\n?/g, "\n")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizarTextoComparacaoPdf(valor) {
  return normalizarTextoPdfTabela(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function textoEhCabecalhoTabelaPdf(texto) {
  const textoNormalizado = normalizarTextoComparacaoPdf(texto);
  if (!textoNormalizado) {
    return false;
  }

  const tokens = textoNormalizado
    .split(" ")
    .map((token) => token.trim())
    .filter(Boolean);

  if (!tokens.length) {
    return false;
  }

  if (tokens.length >= 2) {
    const possuiGrupoNumero = tokens.some((token) => GRUPOS_CABECALHO.numero.includes(token));
    const possuiGrupoNome = tokens.some((token) => GRUPOS_CABECALHO.nome.includes(token));
    const possuiGrupoFuncao = tokens.some((token) => GRUPOS_CABECALHO.funcao.includes(token));
    const possuiGrupoAssinatura = tokens.some((token) => GRUPOS_CABECALHO.assinatura.includes(token));
    const possuiGrupoObservacao = tokens.some((token) => GRUPOS_CABECALHO.observacao.includes(token));

    const totalGruposFortes = [
      possuiGrupoNumero,
      possuiGrupoNome,
      possuiGrupoFuncao,
      possuiGrupoAssinatura,
      possuiGrupoObservacao,
    ].filter(Boolean).length;

    if (totalGruposFortes >= 2) {
      return true;
    }

    if (possuiGrupoNome && (possuiGrupoFuncao || possuiGrupoAssinatura || possuiGrupoNumero)) {
      return true;
    }
  }

  const temGrupoNome = tokens.some((token) => GRUPOS_CABECALHO.nome.includes(token));
  const temGrupoFuncao = tokens.some((token) => GRUPOS_CABECALHO.funcao.includes(token));
  const temGrupoAssinatura = tokens.some((token) => GRUPOS_CABECALHO.assinatura.includes(token));
  const temGrupoNumero = tokens.some((token) => GRUPOS_CABECALHO.numero.includes(token));

  if (temGrupoNome && (temGrupoFuncao || temGrupoAssinatura || temGrupoNumero)) {
    return true;
  }

  return false;
}

function extrairTextoItemPdf(item) {
  const texto = item?.texto ?? item?.str ?? "";
  return normalizarTextoPdfTabela(texto);
}

function extrairXItemPdf(item) {
  if (Number.isFinite(item?.x)) {
    return item.x;
  }
  if (Array.isArray(item?.transform) && Number.isFinite(item.transform[4])) {
    return item.transform[4];
  }
  return null;
}

function extrairYItemPdf(item) {
  if (Number.isFinite(item?.y)) {
    return item.y;
  }
  if (Array.isArray(item?.transform) && Number.isFinite(item.transform[5])) {
    return item.transform[5];
  }
  return null;
}

function extrairLarguraItemPdf(item) {
  if (Number.isFinite(item?.width)) {
    return item.width;
  }
  return null;
}

function extrairAlturaItemPdf(item) {
  if (Number.isFinite(item?.height)) {
    return item.height;
  }
  return null;
}

function calcularMediana(valores) {
  if (!Array.isArray(valores) || valores.length === 0) {
    return 0;
  }
  const ordenados = [...valores].filter((valor) => Number.isFinite(valor)).sort((a, b) => a - b);
  if (!ordenados.length) {
    return 0;
  }
  const meio = Math.floor(ordenados.length / 2);
  return ordenados.length % 2 === 0
    ? (ordenados[meio - 1] + ordenados[meio]) / 2
    : ordenados[meio];
}

function agruparItensTextoPdfEmLinhas(itensTextoPdf, opcoes = {}) {
  const itens = Array.isArray(itensTextoPdf) ? itensTextoPdf : [];
  const toleranciaBase = Number.isFinite(opcoes?.toleranciaY) ? opcoes.toleranciaY : null;
  const itensLimpos = [];

  for (const item of itens) {
    const texto = extrairTextoItemPdf(item);
    if (!texto) {
      continue;
    }

    const x = extrairXItemPdf(item);
    const y = extrairYItemPdf(item);
    const width = extrairLarguraItemPdf(item);
    const height = extrairAlturaItemPdf(item);

    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      continue;
    }

    itensLimpos.push({
      texto,
      pagina: Number.isFinite(item?.pagina) ? item.pagina : Number.isFinite(item?.pageNumber) ? item.pageNumber : 1,
      x,
      y,
      width: Number.isFinite(width) ? width : 0,
      height: Number.isFinite(height) ? height : 0,
    });
  }

  const totalItensTexto = itensLimpos.length;
  if (!totalItensTexto) {
    return {
      linhas: [],
      totalItensTexto: 0,
      totalLinhas: 0,
      paginasDetectadas: 0,
    };
  }

  const paginas = new Map();
  for (const item of itensLimpos) {
    if (!paginas.has(item.pagina)) {
      paginas.set(item.pagina, []);
    }
    paginas.get(item.pagina).push(item);
  }

  const linhas = [];

  for (const [pagina, itensPagina] of paginas.entries()) {
    const alturas = itensPagina.map((item) => item.height).filter((valor) => Number.isFinite(valor) && valor > 0);
    const toleranciaY = Number.isFinite(toleranciaBase)
      ? toleranciaBase
      : Math.max(6, Math.min(18, calcularMediana(alturas) * 0.55 || 8));

    const ordenados = [...itensPagina].sort((a, b) => {
      if (Math.abs(a.y - b.y) > toleranciaY) {
        return b.y - a.y;
      }
      return a.x - b.x;
    });

    const linhasPagina = [];

    for (const item of ordenados) {
      const yCentro = item.y + (item.height > 0 ? item.height / 2 : 0);
      let linhaExistente = null;

      for (const linha of linhasPagina) {
        if (Math.abs(linha.yReferencia - yCentro) <= toleranciaY) {
          linhaExistente = linha;
          break;
        }
      }

      if (!linhaExistente) {
        linhaExistente = {
          pagina,
          yReferencia: yCentro,
          celulas: [],
        };
        linhasPagina.push(linhaExistente);
      }

      linhaExistente.celulas.push({
        texto: item.texto,
        x: item.x,
        y: item.y,
        width: item.width,
        height: item.height,
      });
    }

    for (const linha of linhasPagina) {
      linha.celulas.sort((a, b) => a.x - b.x);
      const textos = linha.celulas.map((celula) => celula.texto).filter(Boolean);
      const xMin = linha.celulas.length ? Math.min(...linha.celulas.map((celula) => celula.x)) : 0;
      const xMax = linha.celulas.length
        ? Math.max(...linha.celulas.map((celula) => celula.x + (celula.width || 0)))
        : 0;
      const yMedio =
        linha.celulas.length > 0
          ? linha.celulas.reduce((acc, celula) => acc + celula.y, 0) / linha.celulas.length
          : linha.yReferencia;

      linhas.push({
        pagina,
        yMedio,
        xMin,
        xMax,
        texto: normalizarTextoPdfTabela(textos.join(" ")),
        celulas: linha.celulas,
      });
    }
  }

  linhas.sort((a, b) => {
    if (a.pagina !== b.pagina) {
      return a.pagina - b.pagina;
    }
    return b.yMedio - a.yMedio;
  });

  return {
    linhas,
    totalItensTexto,
    totalLinhas: linhas.length,
    paginasDetectadas: paginas.size,
  };
}

function detectarCabecalhoTabelaPdf(linhas) {
  const linhasEntrada = Array.isArray(linhas) ? linhas : [];

  for (let indiceLinha = 0; indiceLinha < linhasEntrada.length; indiceLinha += 1) {
    const linha = linhasEntrada[indiceLinha];
    const textoCabecalho = normalizarTextoPdfTabela(linha?.texto);
    if (!textoEhCabecalhoTabelaPdf(textoCabecalho)) {
      continue;
    }

    const mapaColunas = {
      numero: null,
      nome: null,
      funcao: null,
      assinatura: null,
      observacao: null,
    };

    for (const celula of Array.isArray(linha?.celulas) ? linha.celulas : []) {
      const textoCelula = normalizarTextoComparacaoPdf(celula?.texto).toUpperCase();
      if (!textoCelula) {
        continue;
      }
      if (textoCelula.includes("N") && (textoCelula.includes("NUMERO") || textoCelula === "N" || textoCelula === "NO")) {
        mapaColunas.numero = mapaColunas.numero ?? celula.x;
      }
      if (textoCelula.includes("NOME") || textoCelula.includes("COLABORADOR") || textoCelula.includes("FUNCIONARIO")) {
        mapaColunas.nome = mapaColunas.nome ?? celula.x;
      }
      if (textoCelula.includes("FUNCAO") || textoCelula.includes("CARGO")) {
        mapaColunas.funcao = mapaColunas.funcao ?? celula.x;
      }
      if (textoCelula.includes("ASSINATURA") || textoCelula.includes("PRESENCA")) {
        mapaColunas.assinatura = mapaColunas.assinatura ?? celula.x;
      }
      if (textoCelula.includes("OBSERVACAO")) {
        mapaColunas.observacao = mapaColunas.observacao ?? celula.x;
      }
    }

    return {
      encontrado: true,
      indiceLinha,
      mapaColunas,
      textoCabecalho,
    };
  }

  return {
    encontrado: false,
    indiceLinha: -1,
    mapaColunas: {
      numero: null,
      nome: null,
      funcao: null,
      assinatura: null,
      observacao: null,
    },
    textoCabecalho: "",
  };
}

function numeroCurtoEhValido(valor) {
  if (!/^\d{1,3}$/.test(String(valor || "").trim())) {
    return false;
  }
  const numero = Number(valor);
  return Number.isInteger(numero) && numero >= 1 && numero <= 999;
}

function identificarFuncaoTexto(textoOriginal) {
  const textoNormalizado = normalizarTextoComparacaoPdf(textoOriginal).toUpperCase();
  if (!textoNormalizado) {
    return "";
  }

  for (const funcao of TERMOS_FUNCAO) {
    const termo = normalizarTextoComparacaoPdf(funcao).toUpperCase();
    if (textoNormalizado.includes(termo)) {
      return funcao;
    }
  }

  return "";
}

function textoInstitucionalDominante(textoOriginal) {
  const textoNormalizado = normalizarTextoComparacaoPdf(textoOriginal).toUpperCase();
  if (!textoNormalizado) {
    return false;
  }
  return TERMOS_INSTITUCIONAIS.some((termo) => textoNormalizado.includes(normalizarTextoComparacaoPdf(termo).toUpperCase()));
}

function limparTokensTexto(textoOriginal) {
  return normalizarTextoPdfTabela(textoOriginal)
    .split(" ")
    .map((token) => token.trim())
    .filter(Boolean);
}

function separarLinhaPdfEmColunas(linha, mapaColunas) {
  const textoOriginal = normalizarTextoPdfTabela(linha?.texto);
  const celulas = Array.isArray(linha?.celulas) ? [...linha.celulas].sort((a, b) => a.x - b.x) : [];
  const mapa = mapaColunas || {};

  const linhasSaida = {
    numero: "",
    nome: "",
    funcao: "",
    assinatura: "",
    observacao: "",
    textoOriginal,
  };

  if (!textoOriginal) {
    return linhasSaida;
  }

  const celulasComTexto = celulas.filter((celula) => normalizarTextoPdfTabela(celula?.texto));

  const obterTextoEntre = (inicio, fim) => {
    const itens = celulasComTexto.filter((celula) => {
      const x = Number.isFinite(celula.x) ? celula.x : 0;
      return x >= inicio && x < fim;
    });
    return normalizarTextoPdfTabela(itens.map((celula) => celula.texto).join(" "));
  };

  const ordenarMapas = [
    ["numero", mapa.numero],
    ["nome", mapa.nome],
    ["funcao", mapa.funcao],
    ["assinatura", mapa.assinatura],
    ["observacao", mapa.observacao],
  ]
    .filter(([, x]) => Number.isFinite(x))
    .sort((a, b) => a[1] - b[1]);

  if (ordenarMapas.length >= 2) {
    const limites = ordenarMapas.map(([, x], indice) => {
      const proximo = ordenarMapas[indice + 1]?.[1];
      return {
        chave: ordenarMapas[indice][0],
        inicio: x,
        fim: Number.isFinite(proximo) ? (x + proximo) / 2 : Infinity,
      };
    });

    const obterCampo = (chave) => {
      const limite = limites.find((item) => item.chave === chave);
      if (!limite) {
        return "";
      }
      return obterTextoEntre(limite.inicio, limite.fim);
    };

    linhasSaida.numero = obterCampo("numero");
    linhasSaida.nome = obterCampo("nome");
    linhasSaida.funcao = obterCampo("funcao");
    linhasSaida.assinatura = obterCampo("assinatura");
    linhasSaida.observacao = obterCampo("observacao");
    return linhasSaida;
  }

  const tokens = limparTokensTexto(textoOriginal);
  const indiceNumero = tokens.findIndex((token) => numeroCurtoEhValido(token));
  if (indiceNumero >= 0) {
    linhasSaida.numero = tokens[indiceNumero];
    const restante = tokens.slice(indiceNumero + 1);
    const funcaoDetectada = identificarFuncaoTexto(restante.join(" "));
    if (funcaoDetectada) {
      const textoRestante = restante.join(" ");
      const textoNormalizadoFuncao = normalizarTextoComparacaoPdf(funcaoDetectada);
      const posicaoFuncao = normalizarTextoComparacaoPdf(textoRestante).indexOf(textoNormalizadoFuncao);
      if (posicaoFuncao >= 0) {
        const antesFuncao = textoRestante.slice(0, posicaoFuncao).trim();
        const depoisFuncao = textoRestante.slice(posicaoFuncao + funcaoDetectada.length).trim();
        linhasSaida.nome = antesFuncao;
        linhasSaida.funcao = funcaoDetectada;
        linhasSaida.assinatura = depoisFuncao;
      } else {
        linhasSaida.nome = restante.join(" ");
      }
    } else {
      linhasSaida.nome = restante.join(" ");
    }
    return linhasSaida;
  }

  const funcaoDetectada = identificarFuncaoTexto(textoOriginal);
  if (funcaoDetectada) {
    const textoNormalizado = normalizarTextoComparacaoPdf(textoOriginal);
    const indiceFuncao = textoNormalizado.indexOf(normalizarTextoComparacaoPdf(funcaoDetectada));
    linhasSaida.nome = textoOriginal.slice(0, Math.max(0, indiceFuncao)).trim();
    linhasSaida.funcao = funcaoDetectada;
  } else {
    linhasSaida.nome = textoOriginal;
  }

  return linhasSaida;
}

function textoPareceLinhaParticipante(textoOriginal) {
  const texto = normalizarTextoPdfTabela(textoOriginal);
  if (!texto) {
    return false;
  }

  if (textoInstitucionalDominante(texto)) {
    return false;
  }

  const tokens = limparTokensTexto(texto);
  const letras = texto.replace(/[^A-Za-zÀ-ÿ]/g, "");
  const palavras = tokens.filter((token) => /[A-Za-zÀ-ÿ]/.test(token));
  const palavrasLongas = palavras.filter((token) => token.replace(/[^A-Za-zÀ-ÿ]/g, "").length >= 3);
  const proporcaoLetras = texto.length > 0 ? letras.length / texto.length : 0;

  if (palavras.length < 2) {
    return false;
  }
  if (palavrasLongas.length < 2) {
    return false;
  }
  if (letras.length < 6) {
    return false;
  }
  if (proporcaoLetras < 0.45) {
    return false;
  }

  const funcaoDetectada = identificarFuncaoTexto(texto);
  const textoSemFuncao = funcaoDetectada
    ? normalizarTextoComparacaoPdf(texto).replace(normalizarTextoComparacaoPdf(funcaoDetectada), "").trim()
    : texto;

  return textoSemFuncao.length >= 4;
}

function linhaEhCabecalhoOuInstitucional(linha, cabecalhoDetectado) {
  const textoLinha = normalizarTextoPdfTabela(linha?.texto);
  if (!textoLinha) {
    return true;
  }

  const textoComparacao = normalizarTextoComparacaoPdf(textoLinha).toUpperCase();
  if (
    TERMOS_INSTITUCIONAIS.some((termo) => textoComparacao.includes(normalizarTextoComparacaoPdf(termo).toUpperCase()))
  ) {
    return true;
  }

  if (textoEhCabecalhoTabelaPdf(textoLinha)) {
    return true;
  }

  return Boolean(cabecalhoDetectado && normalizarTextoPdfTabela(cabecalhoDetectado.textoCabecalho) === textoLinha);
}

function registrarLinhaAnalise(linhasAnalise, detalhe) {
  if (!Array.isArray(linhasAnalise) || linhasAnalise.length >= 20) {
    return;
  }

  linhasAnalise.push({
    pagina: detalhe?.pagina ?? 1,
    linhaOriginal: normalizarTextoPdfTabela(detalhe?.linhaOriginal ?? ""),
    numero: normalizarTextoPdfTabela(detalhe?.numero ?? ""),
    nome: normalizarTextoPdfTabela(detalhe?.nome ?? ""),
    funcao: normalizarTextoPdfTabela(detalhe?.funcao ?? ""),
    assinatura: normalizarTextoPdfTabela(detalhe?.assinatura ?? ""),
    aceito: Boolean(detalhe?.aceito),
    motivo: normalizarTextoPdfTabela(detalhe?.motivo ?? ""),
  });
}

function extrairNumeroCurtoDaLinha(texto) {
  const textoNormalizado = normalizarTextoPdfTabela(texto);
  if (!textoNormalizado) {
    return "";
  }

  const tokens = textoNormalizado.split(" ").filter(Boolean);
  const tokenNumero = tokens.find((token) => numeroCurtoEhValido(token));
  return tokenNumero || "";
}

function linhaTemParticipanteProvavel(linha, dadosLinha) {
  const numeroLinha = normalizarTextoPdfTabela(dadosLinha?.numero || "");
  const nomeLinha = normalizarTextoPdfTabela(dadosLinha?.nome || "");
  const textoLinha = normalizarTextoPdfTabela(linha?.texto);

  if (!textoLinha) {
    return false;
  }

  if (numeroLinha && !numeroCurtoEhValido(numeroLinha)) {
    return false;
  }

  const textoBase = nomeLinha || textoLinha;
  if (!textoPareceLinhaParticipante(textoBase)) {
    return false;
  }

  const palavrasNome = normalizarTextoComparacaoPdf(nomeLinha || textoBase)
    .split(" ")
    .filter(Boolean);
  const possuiNomeComDuasPalavras = palavrasNome.filter((palavra) => palavra.replace(/[^a-z0-9]/g, "").length >= 3).length >= 2;
  const possuiNomeLongo = normalizarTextoComparacaoPdf(nomeLinha || textoBase).replace(/\s+/g, "").length >= 8;

  return possuiNomeComDuasPalavras || possuiNomeLongo;
}

function validarParticipanteTabelaPdf(dadosLinha, textoLinha) {
  const textoOriginal = normalizarTextoPdfTabela(textoLinha);
  const numero = normalizarTextoPdfTabela(dadosLinha?.numero || extrairNumeroCurtoDaLinha(textoOriginal));
  const nome = normalizarTextoPdfTabela(dadosLinha?.nome || "");
  const funcao = normalizarTextoPdfTabela(dadosLinha?.funcao || "");
  const assinatura = normalizarTextoPdfTabela(dadosLinha?.assinatura || "");

  if (!textoOriginal) {
    return { aceito: false, motivo: "vazio", numero, nome, funcao, assinatura };
  }

  if (textoEhCabecalhoTabelaPdf(textoOriginal)) {
    return { aceito: false, motivo: "cabecalho", numero, nome, funcao, assinatura };
  }

  if (textoInstitucionalDominante(textoOriginal)) {
    return { aceito: false, motivo: "institucional", numero, nome, funcao, assinatura };
  }

  const textoComparacao = normalizarTextoComparacaoPdf(textoOriginal);
  const possuiNumeroCurtoNoInicio = /^\d{1,3}\b/.test(textoOriginal.trim()) || Boolean(numero);
  const palavrasNome = normalizarTextoComparacaoPdf(nome || textoOriginal)
    .split(" ")
    .filter(Boolean)
    .filter((token) => token.replace(/[^a-z0-9]/g, "").length >= 2);
  const temNomeComDuasPalavras = palavrasNome.length >= 2;
  const temPalavraForte = palavrasNome.some((token) => token.replace(/[^a-z0-9]/g, "").length >= 4);
  const funcaoDetectada = Boolean(funcao) || Boolean(identificarFuncaoTexto(textoOriginal));
  const nomeProvavel = textoPareceLinhaParticipante(nome || textoOriginal);

  if (possuiNumeroCurtoNoInicio && (nomeProvavel || temNomeComDuasPalavras || (temPalavraForte && funcaoDetectada))) {
    return { aceito: true, motivo: "ok", numero, nome, funcao, assinatura };
  }

  if (temNomeComDuasPalavras && (funcaoDetectada || assinatura || numero)) {
    return { aceito: true, motivo: "ok", numero, nome, funcao, assinatura };
  }

  if (temPalavraForte && funcaoDetectada) {
    return { aceito: true, motivo: "ok", numero, nome, funcao, assinatura };
  }

  if (textoComparacao.includes("treinamento") || textoComparacao.includes("carga horaria")) {
    return { aceito: false, motivo: "institucional", numero, nome, funcao, assinatura };
  }

  return {
    aceito: false,
    motivo: nome ? "nomeImprovavel" : "semNome",
    numero,
    nome,
    funcao,
    assinatura,
  };
}

function extrairParticipantesTabelaPdf(itensTextoPdf, opcoes = {}) {
  const agrupamento = agruparItensTextoPdfEmLinhas(itensTextoPdf, opcoes);
  const cabecalho = detectarCabecalhoTabelaPdf(agrupamento.linhas);
  const linhasAvaliadas = agrupamento.linhas;

  const participantes = [];
  const avisos = [];
  const linhasAnalisadas = [];
  let totalLinhasIgnoradas = 0;

  for (const linha of linhasAvaliadas) {
    const textoLinha = normalizarTextoPdfTabela(linha?.texto);
    if (!textoLinha) {
      totalLinhasIgnoradas += 1;
      registrarLinhaAnalise(linhasAnalisadas, {
        pagina: linha?.pagina,
        linhaOriginal: linha?.texto,
        aceito: false,
        motivo: "vazio",
      });
      continue;
    }

    const textoComparacao = normalizarTextoComparacaoPdf(textoLinha).toUpperCase();
    const ehCabecalho = Boolean(
      cabecalho.encontrado && normalizarTextoPdfTabela(cabecalho.textoCabecalho) === textoLinha,
    );
    if (ehCabecalho) {
      totalLinhasIgnoradas += 1;
      registrarLinhaAnalise(linhasAnalisadas, {
        pagina: linha?.pagina,
        linhaOriginal: textoLinha,
        aceito: false,
        motivo: "cabecalho",
      });
      continue;
    }

    if (
      TERMOS_INSTITUCIONAIS.some((termo) => textoComparacao.includes(normalizarTextoComparacaoPdf(termo).toUpperCase()))
    ) {
      totalLinhasIgnoradas += 1;
      registrarLinhaAnalise(linhasAnalisadas, {
        pagina: linha?.pagina,
        linhaOriginal: textoLinha,
        aceito: false,
        motivo: "institucional",
      });
      continue;
    }

    const dadosLinha = separarLinhaPdfEmColunas(linha, cabecalho.mapaColunas);
    const numeroLinha = normalizarTextoPdfTabela(dadosLinha.numero || extrairNumeroCurtoDaLinha(textoLinha));
    const nomeLinha = normalizarTextoPdfTabela(dadosLinha.nome || "");
    const funcaoLinha = normalizarTextoPdfTabela(dadosLinha.funcao || "");
    const assinaturaLinha = normalizarTextoPdfTabela(dadosLinha.assinatura || "");
    const observacaoLinha = normalizarTextoPdfTabela(dadosLinha.observacao || "");

    const validacaoParticipante = validarParticipanteTabelaPdf(
      {
        ...dadosLinha,
        numero: numeroLinha,
        nome: nomeLinha,
        funcao: funcaoLinha,
        assinatura: assinaturaLinha,
        observacao: observacaoLinha,
      },
      textoLinha,
    );

    if (!validacaoParticipante.aceito) {
      totalLinhasIgnoradas += 1;
      registrarLinhaAnalise(linhasAnalisadas, {
        pagina: linha?.pagina,
        linhaOriginal: textoLinha,
        numero: validacaoParticipante.numero,
        nome: validacaoParticipante.nome,
        funcao: validacaoParticipante.funcao,
        assinatura: validacaoParticipante.assinatura,
        aceito: false,
        motivo: validacaoParticipante.motivo || "outro",
      });
      continue;
    }

    const letrasNome = nomeLinha.replace(/[^A-Za-zÀ-ÿ]/g, "").length;
    const confianca = Math.max(
      40,
      Math.min(
        95,
        55 +
          Math.min(20, letrasNome / 2) +
          (funcaoLinha ? 8 : 0) +
          (assinaturaLinha ? 6 : 0) +
          (linha.celulas.length >= 3 ? 6 : 0),
      ),
    );

    if (confianca < 45) {
      totalLinhasIgnoradas += 1;
      registrarLinhaAnalise(linhasAnalisadas, {
        pagina: linha?.pagina,
        linhaOriginal: textoLinha,
        numero: dadosLinha.numero,
        nome: nomeLinha,
        funcao: funcaoLinha,
        assinatura: assinaturaLinha,
        aceito: false,
        motivo: "baixaConfianca",
      });
      continue;
    }

    participantes.push({
      idTemporario: `${linha.pagina || 1}-${participantes.length + 1}-${Math.round(linha.yMedio || 0)}`,
      numero: numeroLinha,
      nome: nomeLinha,
      funcao: funcaoLinha,
      assinatura: assinaturaLinha,
      observacao: observacaoLinha,
      pagina: linha.pagina || 1,
      linhaOriginal: textoLinha,
      origem: "pdf_tabela_interna",
      confianca,
    });

    registrarLinhaAnalise(linhasAnalisadas, {
      pagina: linha?.pagina,
      linhaOriginal: textoLinha,
      numero: numeroLinha,
      nome: nomeLinha,
      funcao: funcaoLinha,
      assinatura: assinaturaLinha,
      aceito: true,
      motivo: "ok",
    });
  }

  const participantesOrdenados = [...participantes].sort((a, b) => {
    const numeroA = Number.parseInt(a.numero, 10);
    const numeroB = Number.parseInt(b.numero, 10);
    if (Number.isFinite(numeroA) && Number.isFinite(numeroB) && numeroA !== numeroB) {
      return numeroA - numeroB;
    }
    if (a.pagina !== b.pagina) {
      return a.pagina - b.pagina;
    }
    return (a.idTemporario || "").localeCompare(b.idTemporario || "");
  });

  if (cabecalho.encontrado && !participantesOrdenados.length) {
    avisos.push("Não foi possível montar tabela interna a partir do PDF.");
  }

  return {
    participantes: participantesOrdenados,
    linhas: agrupamento.linhas,
    cabecalho,
    diagnostico: {
      totalItensTexto: agrupamento.totalItensTexto,
      totalLinhas: agrupamento.totalLinhas,
      totalParticipantes: participantesOrdenados.length,
      totalLinhasIgnoradas,
      temCamadaTexto: agrupamento.totalItensTexto > 0,
      paginasDetectadas: agrupamento.paginasDetectadas,
      avisos,
      linhasAnalisadas,
    },
  };
}

function converterTabelaPdfParaTextoPlanilha(participantes) {
  const itens = Array.isArray(participantes) ? participantes : [];
  const linhas = ["Nº;Nome;Função;Assinatura;Observação"];

  for (const participante of itens) {
    linhas.push(
      [
        participante?.numero ?? "",
        participante?.nome ?? "",
        participante?.funcao ?? "",
        participante?.assinatura ?? "",
        participante?.observacao ?? "",
      ]
        .map((valor) => normalizarTextoPdfTabela(valor).replace(/;/g, ","))
        .join(";"),
    );
  }

  return linhas.join("\n");
}

function validarResultadoTabelaPdf(resultado) {
  const avisos = [];
  const erros = [];
  const totalItensTexto = Number.isFinite(resultado?.diagnostico?.totalItensTexto) ? resultado.diagnostico.totalItensTexto : 0;
  const totalParticipantes = Number.isFinite(resultado?.diagnostico?.totalParticipantes)
    ? resultado.diagnostico.totalParticipantes
    : Array.isArray(resultado?.participantes)
      ? resultado.participantes.length
      : 0;

  if (!totalItensTexto) {
    avisos.push("PDF sem camada de texto detectável. Pode ser um PDF escaneado.");
  }

  if (!totalParticipantes) {
    avisos.push("Não foi possível montar tabela interna a partir do PDF.");
  }

  return {
    valido: totalItensTexto > 0 && totalParticipantes > 0,
    avisos,
    erros,
  };
}

export {
  agruparItensTextoPdfEmLinhas,
  converterTabelaPdfParaTextoPlanilha,
  detectarCabecalhoTabelaPdf,
  extrairParticipantesTabelaPdf,
  normalizarTextoComparacaoPdf,
  normalizarTextoPdfTabela,
  validarParticipanteTabelaPdf,
  textoEhCabecalhoTabelaPdf,
  separarLinhaPdfEmColunas,
  validarResultadoTabelaPdf,
};

export default {
  agruparItensTextoPdfEmLinhas,
  converterTabelaPdfParaTextoPlanilha,
  detectarCabecalhoTabelaPdf,
  extrairParticipantesTabelaPdf,
  normalizarTextoComparacaoPdf,
  normalizarTextoPdfTabela,
  validarParticipanteTabelaPdf,
  textoEhCabecalhoTabelaPdf,
  separarLinhaPdfEmColunas,
  validarResultadoTabelaPdf,
};
