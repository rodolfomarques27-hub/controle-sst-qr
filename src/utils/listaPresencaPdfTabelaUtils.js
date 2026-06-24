const GRUPOS_CABECALHO = {
  numero: ["n", "no", "numero", "nro", "nr"],
  nome: ["nome", "colaborador", "funcionario", "empregado", "participante"],
  funcao: ["funcao", "cargo", "atividade"],
  assinatura: ["assinatura", "assinado", "presenca", "presente"],
  observacao: ["observacao", "obs"],
};

const TERMOS_INSTITUCIONAIS = [
  "TREINAMENTO",
  "CARGA HORARIA",
  "CARGA HORÁRIA",
  "INSTRUTOR",
  "EMPRESA",
  "CNPJ",
  "DATA",
  "NR",
  "CONTEUDO",
  "OBJETIVO",
  "AVALIACAO",
  "CERTIFICADO",
  "CAMSCANNER",
  "SEGURANCA",
  "TRANSITO",
  "PROTECAO",
  "RESIDUOS",
  "MEIO AMBIENTE",
  "HORARIO",
  "HORÁRIO",
  "HORARIO NORMAL",
  "HORÁRIO NORMAL",
  "DENTRO DO HORARIO NORMAL DE TRABALHO",
  "DENTRO DO HORÁRIO NORMAL DE TRABALHO",
  "PAVIMENTADORA",
  "CONSTRUTORA",
  "LTDA",
  "MEI",
  "RAZAO SOCIAL",
  "RAZÃO SOCIAL",
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
  return texto.replace(/\r\n?/g, "\n").replace(/\s+/g, " ").trim();
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

function textoEhRuidoPdfTabela(texto) {
  const normalizado = normalizarTextoPdfTabela(texto);
  if (!normalizado) {
    return true;
  }

  const comparacao = normalizarTextoComparacaoPdf(normalizado);
  if (!comparacao) {
    return true;
  }

  if (/^(?:[-./\\_ ]+|\.\.\.+|-{2,}|_{2,}|\/{2,}|\\{2,})$/.test(comparacao)) {
    return true;
  }

  const letras = comparacao.replace(/[^a-zà-ÿ]/gi, "");
  const numeros = comparacao.replace(/[^0-9]/g, "");
  const simbolos = comparacao.replace(/[\p{L}\p{N}\s]/gu, "");
  const tokens = comparacao.split(" ").filter(Boolean);

  if (letras.length < 3) {
    return true;
  }

  if (comparacao.length > 0 && letras.length / comparacao.length < 0.4) {
    return true;
  }

  if (simbolos.length > 2 && simbolos.length >= comparacao.length * 0.3) {
    return true;
  }

  if (tokens.length <= 1 && numeros.length && letras.length < 5) {
    return true;
  }

  if (tokens.every((token) => token.length <= 2 && !/^[a-zà-ÿ]+$/i.test(token))) {
    return true;
  }

  return false;
}

function textoEhCabecalhoTabelaPdf(texto) {
  const textoNormalizado = normalizarTextoComparacaoPdf(texto);
  if (!textoNormalizado) {
    return false;
  }

  const tokens = textoNormalizado.split(" ").map((token) => token.trim()).filter(Boolean);
  if (!tokens.length) {
    return false;
  }

  const grupos = {
    numero: tokens.some((token) => GRUPOS_CABECALHO.numero.includes(token)),
    nome: tokens.some((token) => GRUPOS_CABECALHO.nome.includes(token)),
    funcao: tokens.some((token) => GRUPOS_CABECALHO.funcao.includes(token)),
    assinatura: tokens.some((token) => GRUPOS_CABECALHO.assinatura.includes(token)),
    observacao: tokens.some((token) => GRUPOS_CABECALHO.observacao.includes(token)),
  };

  const totalGrupos = Object.values(grupos).filter(Boolean).length;
  if (totalGrupos >= 2) {
    return true;
  }

  if (grupos.nome && (grupos.funcao || grupos.assinatura || grupos.numero)) {
    return true;
  }

  return false;
}

function nomeProvavelPdfTabela(texto) {
  const normalizado = normalizarTextoPdfTabela(texto);
  if (!normalizado || textoEhRuidoPdfTabela(normalizado)) {
    return false;
  }

  const comparacao = normalizarTextoComparacaoPdf(normalizado);
  const tokens = comparacao
    .split(" ")
    .map((token) => token.trim())
    .filter(Boolean)
    .filter((token) => !["de", "da", "do", "das", "dos", "e"].includes(token));

  const letrasTotal = comparacao.replace(/[^a-zà-ÿ]/gi, "");
  if (letrasTotal.length < 5) {
    return false;
  }

  if (tokens.length < 2 || tokens.length > 8) {
    return false;
  }

  const palavrasFortes = tokens.filter((token) => token.replace(/[^a-zà-ÿ]/gi, "").length >= 3);
  if (palavrasFortes.length < 2) {
    return false;
  }

  const funcaoDetectada = identificarFuncaoTexto(normalizado);
  if (funcaoDetectada) {
    const restante = comparacao.replace(normalizarTextoComparacaoPdf(funcaoDetectada), "").replace(/\s+/g, " ").trim();
    if (!restante || restante.length < 3) {
      return false;
    }
  }

  return true;
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
  return Number.isFinite(item?.width) ? item.width : 0;
}

function extrairAlturaItemPdf(item) {
  return Number.isFinite(item?.height) ? item.height : 0;
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
  return ordenados.length % 2 === 0 ? (ordenados[meio - 1] + ordenados[meio]) / 2 : ordenados[meio];
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
      width,
      height,
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
    const toleranciaY = Number.isFinite(toleranciaBase) ? toleranciaBase : Math.max(6, Math.min(18, calcularMediana(alturas) * 0.55 || 8));

    const linhasPagina = [];
    const ordenados = [...itensPagina].sort((a, b) => {
      if (Math.abs(a.y - b.y) > toleranciaY) {
        return b.y - a.y;
      }
      return a.x - b.x;
    });

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
      const xMax = linha.celulas.length ? Math.max(...linha.celulas.map((celula) => celula.x + (celula.width || 0))) : 0;
      const yMedio = linha.celulas.length > 0 ? linha.celulas.reduce((acc, celula) => acc + celula.y, 0) / linha.celulas.length : linha.yReferencia;

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
      const textoCelula = normalizarTextoComparacaoPdf(celula?.texto);
      if (!textoCelula) {
        continue;
      }
      if (GRUPOS_CABECALHO.numero.includes(textoCelula)) {
        mapaColunas.numero = mapaColunas.numero ?? celula.x;
      }
      if (GRUPOS_CABECALHO.nome.includes(textoCelula)) {
        mapaColunas.nome = mapaColunas.nome ?? celula.x;
      }
      if (GRUPOS_CABECALHO.funcao.includes(textoCelula)) {
        mapaColunas.funcao = mapaColunas.funcao ?? celula.x;
      }
      if (GRUPOS_CABECALHO.assinatura.includes(textoCelula)) {
        mapaColunas.assinatura = mapaColunas.assinatura ?? celula.x;
      }
      if (GRUPOS_CABECALHO.observacao.includes(textoCelula)) {
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
  const texto = String(valor || "").trim();
  if (!/^\d{1,3}$/.test(texto)) {
    return false;
  }

  const numero = Number(texto);
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

  const termosFortes = [
    "EMPRESA",
    "CNPJ",
    "CARGA HORARIA",
    "HORARIO",
    "HORARIO NORMAL",
    "DENTRO DO HORARIO NORMAL DE TRABALHO",
    "INSTRUTOR",
    "TREINAMENTO",
    "CONTEUDO",
    "OBJETIVO",
    "AVALIACAO",
    "CERTIFICADO",
    "LOCAL",
    "DATA",
    "ASSINATURA DO INSTRUTOR",
    "RESPONSAVEL",
    "PAVIMENTADORA",
    "CONSTRUTORA",
    "LTDA",
    "MEI",
    "RAZAO SOCIAL",
  ];

  if (termosFortes.some((termo) => textoNormalizado.includes(normalizarTextoComparacaoPdf(termo).toUpperCase()))) {
    return true;
  }

  return TERMOS_INSTITUCIONAIS.some((termo) => textoNormalizado.includes(normalizarTextoComparacaoPdf(termo).toUpperCase()));
}

function nomePareceEmpresaOuTextoInstitucional(nome) {
  const texto = normalizarTextoComparacaoPdf(nome).toUpperCase();
  if (!texto) {
    return true;
  }

  const termosEmpresa = [
    "LTDA",
    "EIRELI",
    "ME",
    "MEI",
    "CONSTRUTORA",
    "PAVIMENTADORA",
    "ENGENHARIA",
    "SERVICOS",
    "SERVIÇOS",
    "COMERCIO",
    "COMÉRCIO",
    "EMPRESA",
    "CNPJ",
    "RAZAO SOCIAL",
    "RAZÃO SOCIAL",
    "DENTRO DO HORARIO",
    "DENTRO DO HORÁRIO",
    "HORARIO NORMAL",
    "HORÁRIO NORMAL",
    "CARGA HORARIA",
    "CARGA HORÁRIA",
  ];

  if (termosEmpresa.some((termo) => texto.includes(normalizarTextoComparacaoPdf(termo).toUpperCase()))) {
    return true;
  }

  const palavras = texto.split(" ").filter(Boolean);
  if (palavras.length > 5) {
    return true;
  }

  if (/[;:]/.test(nome)) {
    return true;
  }

  if ((nome.match(/\//g) || []).length > 1) {
    return true;
  }

  if ((nome.match(/\d/g) || []).length > 2) {
    return true;
  }

  if (nome.length > 80) {
    return true;
  }

  const letrasTotal = texto.replace(/[^\p{L}]/gu, "");
  const simbolos = texto.replace(/[\p{L}\p{N}\s]/gu, "");
  if (texto.length > 0 && simbolos.length >= texto.length * 0.25) {
    return true;
  }

  return letrasTotal.length < 5;
}

function limparTokensTexto(textoOriginal) {
  return normalizarTextoPdfTabela(textoOriginal)
    .split(" ")
    .map((token) => token.trim())
    .filter(Boolean);
}

function extrairNumeroCurtoDaLinha(texto) {
  const textoNormalizado = normalizarTextoPdfTabela(texto);
  if (!textoNormalizado) {
    return "";
  }

  const tokens = limparTokensTexto(textoNormalizado);
  const tokenNumero = tokens.find((token) => numeroCurtoEhValido(token));
  return tokenNumero || "";
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

  const colunas = [
    ["numero", mapa.numero],
    ["nome", mapa.nome],
    ["funcao", mapa.funcao],
    ["assinatura", mapa.assinatura],
    ["observacao", mapa.observacao],
  ]
    .filter(([, x]) => Number.isFinite(x))
    .sort((a, b) => a[1] - b[1]);

  if (colunas.length >= 2) {
    const limites = colunas.map(([chave, x], indice) => ({
      chave,
      inicio: x,
      fim: Number.isFinite(colunas[indice + 1]?.[1]) ? (x + colunas[indice + 1][1]) / 2 : Infinity,
    }));

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

  const numeroLinha = extrairNumeroCurtoDaLinha(textoOriginal);
  if (numeroLinha) {
    linhasSaida.numero = numeroLinha;
    const restante = textoOriginal.replace(new RegExp(`^\\s*${numeroLinha}\\b\\s*`), "").trim();
    const funcaoDetectada = identificarFuncaoTexto(restante);

    if (funcaoDetectada) {
      const textoNormalizadoRestante = normalizarTextoComparacaoPdf(restante);
      const textoNormalizadoFuncao = normalizarTextoComparacaoPdf(funcaoDetectada);
      const indiceFuncao = textoNormalizadoRestante.indexOf(textoNormalizadoFuncao);
      if (indiceFuncao >= 0) {
        linhasSaida.nome = restante.slice(0, indiceFuncao).trim();
        linhasSaida.funcao = funcaoDetectada;
        linhasSaida.assinatura = restante.slice(indiceFuncao + funcaoDetectada.length).trim();
      } else {
        linhasSaida.nome = restante;
      }
    } else {
      linhasSaida.nome = restante;
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

function validarNomeTabelaPdf(texto) {
  const nome = normalizarTextoPdfTabela(texto);
  if (!nome || nome === "-" || nome === "." || nome === "..." || nome === "_" || nome === "/" || nome === "///") {
    return false;
  }

  if (textoEhRuidoPdfTabela(nome)) {
    return false;
  }

  if (nomePareceEmpresaOuTextoInstitucional(nome)) {
    return false;
  }

  if (nome.length > 80) {
    return false;
  }

  if (/[;:]/.test(nome)) {
    return false;
  }

  if ((nome.match(/\//g) || []).length > 1) {
    return false;
  }

  if ((nome.match(/\d/g) || []).length > 2) {
    return false;
  }

  const comparacao = normalizarTextoComparacaoPdf(nome);
  const tokens = comparacao
    .split(" ")
    .map((token) => token.trim())
    .filter(Boolean)
    .filter((token) => !["de", "da", "do", "das", "dos", "e"].includes(token));

  const letrasTotal = comparacao.replace(/[^a-zà-ÿ]/gi, "");
  if (letrasTotal.length < 5) {
    return false;
  }

  if (tokens.length < 2) {
    return false;
  }

  const palavrasFortes = tokens.filter((token) => token.replace(/[^a-zà-ÿ]/gi, "").length >= 3);
  if (palavrasFortes.length < 2) {
    return false;
  }

  return true;
}

function validarParticipanteTabelaPdf(dadosLinha, textoLinha) {
  const textoOriginal = normalizarTextoPdfTabela(textoLinha);
  const numero = normalizarTextoPdfTabela(dadosLinha?.numero || extrairNumeroCurtoDaLinha(textoOriginal));
  const nome = normalizarTextoPdfTabela(dadosLinha?.nome || "");
  const funcao = normalizarTextoPdfTabela(dadosLinha?.funcao || "");
  const assinatura = normalizarTextoPdfTabela(dadosLinha?.assinatura || "");

  if (!textoOriginal) {
    return { aceito: false, motivo: "vazio", numero, nome, funcao, assinatura, confianca: 0 };
  }

  if (textoEhCabecalhoTabelaPdf(textoOriginal)) {
    return { aceito: false, motivo: "cabecalho", numero, nome, funcao, assinatura, confianca: 0 };
  }

  if (textoInstitucionalDominante(textoOriginal)) {
    return { aceito: false, motivo: "institucional", numero, nome, funcao, assinatura, confianca: 0 };
  }

  if (textoEhRuidoPdfTabela(textoOriginal)) {
    return { aceito: false, motivo: "ruidoPdf", numero, nome, funcao, assinatura, confianca: 0 };
  }

  const nomeBase = nome || textoOriginal;
  const nomeValido = validarNomeTabelaPdf(nomeBase);
  const funcaoDetectada = Boolean(funcao) || Boolean(identificarFuncaoTexto(textoOriginal));
  const possuiNumero = numeroCurtoEhValido(numero) || /^\d{1,3}\b/.test(textoOriginal.trim());
  const nomeEhFuncao = Boolean(identificarFuncaoTexto(nomeBase)) && normalizarTextoComparacaoPdf(nomeBase).split(" ").filter(Boolean).length <= 2;

  if (nomePareceEmpresaOuTextoInstitucional(nomeBase)) {
    return {
      aceito: false,
      motivo: "institucional",
      numero,
      nome,
      funcao,
      assinatura,
      confianca: 0,
    };
  }

  if (!nomeValido) {
    return {
      aceito: false,
      motivo: !nomeBase ? "semNome" : textoEhRuidoPdfTabela(nomeBase) ? "ruidoPdf" : "nomeImprovavel",
      numero,
      nome,
      funcao,
      assinatura,
      confianca: 0,
    };
  }

  if (nomeEhFuncao) {
    return {
      aceito: false,
      motivo: "nomeImprovavel",
      numero,
      nome,
      funcao,
      assinatura,
      confianca: 0,
    };
  }

  if (!possuiNumero && !funcaoDetectada && !assinatura) {
    return {
      aceito: false,
      motivo: "nomeImprovavel",
      numero,
      nome,
      funcao,
      assinatura,
      confianca: 0,
    };
  }

  const palavrasNome = normalizarTextoComparacaoPdf(nomeBase)
    .split(" ")
    .filter(Boolean)
    .filter((token) => !["de", "da", "do", "das", "dos", "e"].includes(token));
  const totalLetrasNome = normalizarTextoComparacaoPdf(nomeBase).replace(/[^a-zà-ÿ]/gi, "").length;
  const confianca = Math.max(
    55,
    Math.min(
      95,
      60 + Math.min(15, palavrasNome.length * 4) + Math.min(8, totalLetrasNome / 4) + (funcaoDetectada ? 5 : 0) + (assinatura ? 2 : 0),
    ),
  );

  return {
    aceito: true,
    motivo: "ok",
    numero,
    nome,
    funcao,
    assinatura,
    confianca,
  };
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
    observacao: normalizarTextoPdfTabela(detalhe?.observacao ?? ""),
    xMin: Number.isFinite(detalhe?.xMin) ? detalhe.xMin : null,
    xMax: Number.isFinite(detalhe?.xMax) ? detalhe.xMax : null,
    yMedio: Number.isFinite(detalhe?.yMedio) ? detalhe.yMedio : null,
    totalCelulas: Number.isFinite(detalhe?.totalCelulas) ? detalhe.totalCelulas : 0,
    aceito: Boolean(detalhe?.aceito),
    motivo: normalizarTextoPdfTabela(detalhe?.motivo ?? ""),
  });
}

function normalizarNumeroAncoraTabelaPdf(valor) {
  const textoOriginal = normalizarTextoPdfTabela(valor);
  if (!textoOriginal) {
    return "";
  }

  const textoCorrigido = textoOriginal
    .replace(/[oO]/g, "0")
    .replace(/[gGqQ]/g, "9")
    .replace(/[Il]/g, "1")
    .replace(/[^\d]/g, "");

  if (!numeroCurtoEhValido(textoCorrigido)) {
    return "";
  }

  return textoCorrigido;
}

function extrairTextoCelulasPorFaixaXTabelaPdf(celulas, xInicio, xFim, celulaIgnorada = null) {
  const itens = Array.isArray(celulas) ? celulas : [];

  return normalizarTextoPdfTabela(
    itens
      .filter((celula) => {
        if (celulaIgnorada && celula === celulaIgnorada) {
          return false;
        }

        const x = Number.isFinite(celula?.x) ? celula.x : 0;
        return x >= xInicio && x < xFim;
      })
      .map((celula) => normalizarTextoPdfTabela(celula?.texto || ""))
      .filter(Boolean)
      .join(" "),
  );
}

function extrairParticipantesPorAncoraNumericaPdf(linhas) {
  const linhasEntrada = Array.isArray(linhas) ? linhas : [];
  const candidatos = [];
  const numerosDetectados = [];
  const numerosAceitos = [];
  const numerosRejeitados = [];
  const numerosDuplicados = [];
  const numerosAceitosUnicos = new Set();
  let totalLinhasComAncora = 0;
  let totalAceitos = 0;
  let totalRejeitados = 0;
  let totalDuplicadosNumero = 0;
  let totalIgnoradosPreFiltro = 0;

  for (const linha of linhasEntrada) {
    const textoLinha = normalizarTextoPdfTabela(linha?.texto || "");

    if (
      !textoLinha ||
      textoEhCabecalhoTabelaPdf(textoLinha) ||
      textoInstitucionalDominante(textoLinha) ||
      textoEhRuidoPdfTabela(textoLinha)
    ) {
      totalIgnoradosPreFiltro += 1;
      continue;
    }

    const celulas = Array.isArray(linha?.celulas) ? [...linha.celulas].sort((a, b) => a.x - b.x) : [];
    if (!celulas.length) {
      totalIgnoradosPreFiltro += 1;
      continue;
    }

    const ancora = celulas.find((celula) => {
      const x = Number.isFinite(celula?.x) ? celula.x : 0;
      if (x < 25 || x > 90) {
        return false;
      }

      const textoAncoraBruto = normalizarTextoPdfTabela(celula?.texto || "").replace(/\s+/g, "");
      if (!/^[0-9oOgGqQIl]{1,3}$/.test(textoAncoraBruto)) {
        return false;
      }

      return Boolean(normalizarNumeroAncoraTabelaPdf(textoAncoraBruto));
    });

    if (!ancora) {
      continue;
    }

    const numero = normalizarNumeroAncoraTabelaPdf(ancora?.texto);
    if (!numero) {
      continue;
    }

    totalLinhasComAncora += 1;
    numerosDetectados.push(numero);

    const nome = extrairTextoCelulasPorFaixaXTabelaPdf(celulas, 65, 285, ancora);
    const funcaoBruta = extrairTextoCelulasPorFaixaXTabelaPdf(celulas, 255, 375, ancora);
    const assinatura = extrairTextoCelulasPorFaixaXTabelaPdf(celulas, 355, 520, ancora);
    const observacao = extrairTextoCelulasPorFaixaXTabelaPdf(celulas, 520, Infinity, ancora);
    const funcaoDetectada = identificarFuncaoTexto(funcaoBruta) || funcaoBruta;

    const validacao = validarParticipanteTabelaPdf(
      {
        numero,
        nome,
        funcao: funcaoDetectada,
        assinatura,
        observacao,
      },
      textoLinha,
    );

    const duplicadoNumero = Boolean(validacao?.aceito) && numerosAceitosUnicos.has(numero);
    const aceitoFinal = Boolean(validacao?.aceito) && !duplicadoNumero;
    const motivoAncora = duplicadoNumero ? "duplicadoNumero" : normalizarTextoPdfTabela(validacao?.motivo || "outro");

    if (aceitoFinal) {
      numerosAceitosUnicos.add(numero);
      numerosAceitos.push(numero);
      totalAceitos += 1;
    } else {
      totalRejeitados += 1;
      numerosRejeitados.push(`${numero}:${motivoAncora}`);
      if (duplicadoNumero) {
        totalDuplicadosNumero += 1;
        numerosDuplicados.push(numero);
      }
    }

    if (candidatos.length < 30) {
      candidatos.push({
        pagina: linha?.pagina ?? null,
        numero,
        nome,
        funcao: funcaoDetectada,
        assinatura,
        observacao,
        aceito: aceitoFinal,
        motivo: motivoAncora,
        confianca: aceitoFinal && Number.isFinite(validacao?.confianca) ? Math.round(validacao.confianca) : 0,
        xMin: Number.isFinite(linha?.xMin) ? Math.round(linha.xMin) : null,
        xMax: Number.isFinite(linha?.xMax) ? Math.round(linha.xMax) : null,
        yMedio: Number.isFinite(linha?.yMedio) ? Math.round(linha.yMedio) : null,
        totalCelulas: celulas.length,
        linhaOriginal: textoLinha,
      });
    }
  }

  return {
    totalLinhasComAncora,
    totalAceitos,
    totalRejeitados,
    totalDuplicadosNumero,
    totalIgnoradosPreFiltro,
    totalCandidatosAmostra: candidatos.length,
    numerosDetectados: Array.from(new Set(numerosDetectados)).slice(0, 60),
    numerosAceitos: Array.from(new Set(numerosAceitos)).slice(0, 60),
    numerosRejeitados: numerosRejeitados.slice(0, 60),
    numerosDuplicados: Array.from(new Set(numerosDuplicados)).slice(0, 60),
    candidatosAmostra: candidatos,
  };
}

function montarAmostraColunasTabelaPdf(linhasAnalise) {
  const itens = Array.isArray(linhasAnalise) ? linhasAnalise : [];

  return itens.slice(0, 20).map((item) => ({
    pagina: item?.pagina ?? null,
    linhaOriginal: normalizarTextoPdfTabela(item?.linhaOriginal ?? ""),
    numero: normalizarTextoPdfTabela(item?.numero ?? ""),
    nome: normalizarTextoPdfTabela(item?.nome ?? ""),
    funcao: normalizarTextoPdfTabela(item?.funcao ?? ""),
    assinatura: normalizarTextoPdfTabela(item?.assinatura ?? ""),
    observacao: normalizarTextoPdfTabela(item?.observacao ?? ""),
    aceito: Boolean(item?.aceito),
    motivo: normalizarTextoPdfTabela(item?.motivo ?? ""),
    xMin: Number.isFinite(item?.xMin) ? Math.round(item.xMin) : null,
    xMax: Number.isFinite(item?.xMax) ? Math.round(item.xMax) : null,
    yMedio: Number.isFinite(item?.yMedio) ? Math.round(item.yMedio) : null,
    totalCelulas: Number.isFinite(item?.totalCelulas) ? item.totalCelulas : 0,
  }));
}

function extrairParticipantesTabelaPdf(itensTextoPdf, opcoes = {}) {
  const agrupamento = agruparItensTextoPdfEmLinhas(itensTextoPdf, opcoes);
  const cabecalho = detectarCabecalhoTabelaPdf(agrupamento.linhas);
  const linhasAvaliadas = agrupamento.linhas;

  const participantes = [];
  const avisos = [];
  const linhasAnalisadas = [];
  let totalLinhasIgnoradas = 0;
  let totalLinhasRuido = 0;
  let totalRejeitadosSemNome = 0;
  let totalRejeitadosNomeImprovavel = 0;

  for (const linha of linhasAvaliadas) {
    const textoLinha = normalizarTextoPdfTabela(linha?.texto);
    if (!textoLinha) {
      totalLinhasIgnoradas += 1;
      totalLinhasRuido += 1;
      registrarLinhaAnalise(linhasAnalisadas, {
        pagina: linha?.pagina,
        linhaOriginal: linha?.texto,
        aceito: false,
        motivo: "vazio",
      });
      continue;
    }

    const ehCabecalho = Boolean(cabecalho.encontrado && normalizarTextoPdfTabela(cabecalho.textoCabecalho) === textoLinha);
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

    if (textoInstitucionalDominante(textoLinha)) {
      totalLinhasIgnoradas += 1;
      registrarLinhaAnalise(linhasAnalisadas, {
        pagina: linha?.pagina,
        linhaOriginal: textoLinha,
        aceito: false,
        motivo: "institucional",
      });
      continue;
    }

    if (textoEhRuidoPdfTabela(textoLinha)) {
      totalLinhasIgnoradas += 1;
      totalLinhasRuido += 1;
      registrarLinhaAnalise(linhasAnalisadas, {
        pagina: linha?.pagina,
        linhaOriginal: textoLinha,
        aceito: false,
        motivo: "ruidoPdf",
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
      if (validacaoParticipante.motivo === "semNome") {
        totalRejeitadosSemNome += 1;
      } else if (validacaoParticipante.motivo === "nomeImprovavel") {
        totalRejeitadosNomeImprovavel += 1;
      } else if (validacaoParticipante.motivo === "ruidoPdf") {
        totalLinhasRuido += 1;
      }

      registrarLinhaAnalise(linhasAnalisadas, {
        pagina: linha?.pagina,
        linhaOriginal: textoLinha,
        numero: validacaoParticipante.numero,
        nome: validacaoParticipante.nome,
        funcao: validacaoParticipante.funcao,
        assinatura: validacaoParticipante.assinatura,
        observacao: observacaoLinha,
        xMin: linha?.xMin,
        xMax: linha?.xMax,
        yMedio: linha?.yMedio,
        totalCelulas: Array.isArray(linha?.celulas) ? linha.celulas.length : 0,
        aceito: false,
        motivo: validacaoParticipante.motivo || "outro",
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
      confianca: Number.isFinite(validacaoParticipante.confianca) ? validacaoParticipante.confianca : 0,
    });

    registrarLinhaAnalise(linhasAnalisadas, {
      pagina: linha?.pagina,
      linhaOriginal: textoLinha,
      numero: numeroLinha,
      nome: nomeLinha,
      funcao: funcaoLinha,
      assinatura: assinaturaLinha,
      observacao: observacaoLinha,
      xMin: linha?.xMin,
      xMax: linha?.xMax,
      yMedio: linha?.yMedio,
      totalCelulas: Array.isArray(linha?.celulas) ? linha.celulas.length : 0,
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
      totalLinhasRuido,
      totalRejeitadosSemNome,
      totalRejeitadosNomeImprovavel,
      temCamadaTexto: agrupamento.totalItensTexto > 0,
      paginasDetectadas: agrupamento.paginasDetectadas,
      avisos,
      linhasAnalisadas,
      colunasAnalisadasAmostra: montarAmostraColunasTabelaPdf(linhasAnalisadas),
      diagnosticoAncoraNumerica: extrairParticipantesPorAncoraNumericaPdf(agrupamento.linhas),
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
  const totalLinhas = Number.isFinite(resultado?.diagnostico?.totalLinhas) ? resultado.diagnostico.totalLinhas : 0;
  const totalIgnorados = Number.isFinite(resultado?.diagnostico?.totalLinhasIgnoradas) ? resultado.diagnostico.totalLinhasIgnoradas : 0;
  const totalRejeitadosSemNome = Number.isFinite(resultado?.diagnostico?.totalRejeitadosSemNome)
    ? resultado.diagnostico.totalRejeitadosSemNome
    : 0;
  const totalRejeitadosNomeImprovavel = Number.isFinite(resultado?.diagnostico?.totalRejeitadosNomeImprovavel)
    ? resultado.diagnostico.totalRejeitadosNomeImprovavel
    : 0;
  const totalLinhasRuido = Number.isFinite(resultado?.diagnostico?.totalLinhasRuido) ? resultado.diagnostico.totalLinhasRuido : 0;
  const rejeicoesFracas = totalRejeitadosSemNome + totalRejeitadosNomeImprovavel + totalLinhasRuido;
  const proporcaoRejeicao = totalLinhas > 0 ? rejeicoesFracas / totalLinhas : 0;
  const participantesComNomeValido = Array.isArray(resultado?.participantes)
    ? resultado.participantes.filter((item) => nomeProvavelPdfTabela(item?.nome || "") && item?.nome !== "-" && item?.nome.trim() !== "").length
    : 0;
  const participantesInvalidos = totalParticipantes > 0 ? totalParticipantes - participantesComNomeValido : 0;
  const candidatosRejeitadosAmostra = Array.isArray(resultado?.diagnostico?.linhasAnalisadas)
    ? resultado.diagnostico.linhasAnalisadas
        .filter((item) => !item?.aceito)
        .slice(0, 10)
        .map((item) => ({
          linhaOriginal: item?.linhaOriginal || "",
          motivo: item?.motivo || "outro",
        }))
    : [];

  if (!totalItensTexto) {
    avisos.push("PDF sem camada de texto detectável. Pode ser um PDF escaneado.");
  }

  if (!totalParticipantes) {
    avisos.push("Não foi possível montar tabela interna a partir do PDF.");
  }

  if (proporcaoRejeicao > 0.6 || (totalParticipantes > 0 && participantesInvalidos > totalParticipantes / 2)) {
    avisos.push(
      "A camada de texto do PDF foi detectada, mas não parece conter uma tabela de presença válida. Use o OCR experimental apenas como apoio visual.",
    );
  }

  const tabelaInternaConfiavel = totalItensTexto > 0 && totalParticipantes > 0 && proporcaoRejeicao <= 0.6 && participantesInvalidos <= totalParticipantes / 2;
  const valido = tabelaInternaConfiavel;

  if (!tabelaInternaConfiavel) {
    const participantesDescartados = Array.isArray(resultado?.participantes) ? resultado.participantes.length : 0;
    if (resultado?.diagnostico) {
      resultado.diagnostico.participantesDescartadosPorTabelaInvalida = participantesDescartados;
      resultado.diagnostico.tabelaInternaConfiavel = false;
      resultado.diagnostico.candidatosRejeitadosAmostra = candidatosRejeitadosAmostra;
      resultado.diagnostico.totalParticipantes = 0;
    }
    if (Array.isArray(resultado?.participantes)) {
      resultado.participantes = [];
    }
  } else if (resultado?.diagnostico) {
    resultado.diagnostico.tabelaInternaConfiavel = true;
    resultado.diagnostico.participantesDescartadosPorTabelaInvalida = 0;
    resultado.diagnostico.candidatosRejeitadosAmostra = candidatosRejeitadosAmostra;
  }

  return {
    valido,
    avisos,
    erros,
  };
}

export {
  agruparItensTextoPdfEmLinhas,
  converterTabelaPdfParaTextoPlanilha,
  detectarCabecalhoTabelaPdf,
  extrairParticipantesTabelaPdf,
  nomeProvavelPdfTabela,
  normalizarTextoComparacaoPdf,
  normalizarTextoPdfTabela,
  separarLinhaPdfEmColunas,
  textoEhCabecalhoTabelaPdf,
  textoEhRuidoPdfTabela,
  validarParticipanteTabelaPdf,
  validarResultadoTabelaPdf,
};

export default {
  agruparItensTextoPdfEmLinhas,
  converterTabelaPdfParaTextoPlanilha,
  detectarCabecalhoTabelaPdf,
  extrairParticipantesTabelaPdf,
  nomeProvavelPdfTabela,
  normalizarTextoComparacaoPdf,
  normalizarTextoPdfTabela,
  separarLinhaPdfEmColunas,
  textoEhCabecalhoTabelaPdf,
  textoEhRuidoPdfTabela,
  validarParticipanteTabelaPdf,
  validarResultadoTabelaPdf,
};
