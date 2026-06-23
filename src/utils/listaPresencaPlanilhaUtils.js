function normalizarTextoBase(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function normalizarCabecalhoPlanilha(valor) {
  const texto = normalizarTextoBase(valor);

  if (!texto) {
    return "ignorar";
  }

  if (
    texto === "n" ||
    texto === "nº" ||
    texto === "no" ||
    texto === "n°" ||
    texto === "numero" ||
    texto === "numero." ||
    texto === "nro" ||
    texto === "nr"
  ) {
    return "numero";
  }

  if (
    texto === "nome" ||
    texto === "colaborador" ||
    texto === "colaboradores" ||
    texto === "funcionario"
  ) {
    return "nome";
  }

  if (texto === "funcao" || texto === "cargo" || texto === "func") {
    return "funcao";
  }

  if (
    texto === "assinatura" ||
    texto === "assinado" ||
    texto === "presenca" ||
    texto === "presença" ||
    texto === "presente"
  ) {
    return "assinatura";
  }

  if (
    texto === "observacao" ||
    texto === "obs" ||
    texto === "comentario" ||
    texto === "comentario"
  ) {
    return "observacao";
  }

  return "ignorar";
}

function detectarSeparadorTabela(texto) {
  const conteudo = String(texto ?? "");
  if (conteudo.includes("\t")) {
    return "\t";
  }

  const linhas = conteudo.split(/\r?\n/).filter(Boolean).slice(0, 10);
  let totalPontoVirgula = 0;
  let totalVirgula = 0;

  for (const linha of linhas) {
    totalPontoVirgula += (linha.match(/;/g) || []).length;
    totalVirgula += (linha.match(/,/g) || []).length;
  }

  if (totalPontoVirgula > totalVirgula) {
    return ";";
  }

  if (totalVirgula > 0) {
    return ",";
  }

  return ";";
}

function separarLinhaTabela(linha, separador) {
  const texto = String(linha ?? "").replace(/\r/g, "");
  const delim = separador || detectarSeparadorTabela(texto);
  const celulas = [];
  let atual = "";
  let emAspas = false;

  for (let indice = 0; indice < texto.length; indice += 1) {
    const caractere = texto[indice];

    if (caractere === '"') {
      if (emAspas && texto[indice + 1] === '"') {
        atual += '"';
        indice += 1;
      } else {
        emAspas = !emAspas;
      }
      continue;
    }

    if (caractere === delim && !emAspas) {
      celulas.push(atual.trim());
      atual = "";
      continue;
    }

    atual += caractere;
  }

  celulas.push(atual.trim());

  return celulas.map((celula) =>
    String(celula ?? "")
      .replace(/^"(.*)"$/, "$1")
      .replace(/""/g, '"')
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function ehLinhaVazia(linha) {
  return !String(linha ?? "").replace(/\s+/g, "");
}

function normalizarValorAssinatura(valor) {
  const texto = normalizarTextoBase(valor);
  if (!texto) {
    return "";
  }

  if (["sim", "s", "x", "assinado", "presente", "ok", "true", "1"].includes(texto)) {
    return "sim";
  }

  return String(valor ?? "").replace(/\s+/g, " ").trim();
}

function detectarCabecalhos(celulas) {
  const cabecalhos = {};
  for (let indice = 0; indice < celulas.length; indice += 1) {
    const chave = normalizarCabecalhoPlanilha(celulas[indice]);
    if (chave !== "ignorar" && !cabecalhos[chave]) {
      cabecalhos[chave] = indice;
    }
  }
  return cabecalhos;
}

function montarItemPlanilha({
  celulas,
  cabecalhos,
  indiceLinha,
  linhaOriginal,
}) {
  const pegar = (chave, fallbackIndice) => {
    const indice = Number.isInteger(cabecalhos[chave]) ? cabecalhos[chave] : fallbackIndice;
    if (!Number.isInteger(indice) || indice < 0 || indice >= celulas.length) {
      return "";
    }
    return String(celulas[indice] ?? "").replace(/\s+/g, " ").trim();
  };

  const numero = pegar("numero", 0);
  const nome = pegar("nome", 1);
  const funcao = pegar("funcao", 2);
  const assinatura = normalizarValorAssinatura(pegar("assinatura", 3));
  const observacao = pegar("observacao", 4);

  if (!nome) {
    return null;
  }

  return {
    idTemporario: `linha-${indiceLinha + 1}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    numero,
    nome,
    funcao,
    assinatura,
    observacao,
    linhaOriginal,
    indiceLinha,
    origem: "planilha_colada",
  };
}

function parsearTextoListaPresenca(texto) {
  const conteudo = String(texto ?? "").replace(/\r/g, "");
  const separadorDetectado = detectarSeparadorTabela(conteudo);
  const linhasBrutas = conteudo
    .split(/\n+/)
    .map((linha) => linha.trim())
    .filter((linha) => !ehLinhaVazia(linha));

  const itens = [];
  const avisos = [];
  let cabecalhosDetectados = {};

  if (!linhasBrutas.length) {
    return {
      itens,
      cabecalhosDetectados,
      separadorDetectado,
      totalLinhas: 0,
      totalItens: 0,
      avisos,
    };
  }

  const primeiraLinha = separarLinhaTabela(linhasBrutas[0], separadorDetectado);
  const primeiraLinhaTemCabecalho = primeiraLinha.some((celula) => normalizarCabecalhoPlanilha(celula) !== "ignorar");

  let linhaInicialDados = 0;
  if (primeiraLinhaTemCabecalho) {
    cabecalhosDetectados = detectarCabecalhos(primeiraLinha);
    linhaInicialDados = 1;
  }

  for (let indiceLinha = linhaInicialDados; indiceLinha < linhasBrutas.length; indiceLinha += 1) {
    const linhaOriginal = linhasBrutas[indiceLinha];
    const celulas = separarLinhaTabela(linhaOriginal, separadorDetectado);
    const item = montarItemPlanilha({
      celulas,
      cabecalhos: cabecalhosDetectados,
      indiceLinha,
      linhaOriginal,
    });

    if (!item) {
      continue;
    }

    itens.push(item);
  }

  if (!cabecalhosDetectados.numero && !cabecalhosDetectados.nome) {
    cabecalhosDetectados = {
      numero: 0,
      nome: 1,
      funcao: 2,
      assinatura: 3,
      observacao: 4,
    };

    itens.length = 0;
    for (let indiceLinha = 0; indiceLinha < linhasBrutas.length; indiceLinha += 1) {
      const linhaOriginal = linhasBrutas[indiceLinha];
      const celulas = separarLinhaTabela(linhaOriginal, separadorDetectado);
      const item = montarItemPlanilha({
        celulas,
        cabecalhos: cabecalhosDetectados,
        indiceLinha,
        linhaOriginal,
      });
      if (item) {
        itens.push(item);
      }
    }

    if (linhasBrutas.length) {
      avisos.push("Cabeçalho não identificado; usando ordem padrão de colunas.");
    }
  }

  return {
    itens,
    cabecalhosDetectados,
    separadorDetectado,
    totalLinhas: linhasBrutas.length,
    totalItens: itens.length,
    avisos,
  };
}

function parsearArquivoCsvTexto(conteudo, nomeArquivo = "") {
  const texto = String(conteudo ?? "");
  const separadorDetectado = detectarSeparadorTabela(texto);
  const extensao = String(nomeArquivo || "").toLowerCase();

  const resultado = parsearTextoListaPresenca(texto);
  const origem =
    extensao.endsWith(".tsv") || separadorDetectado === "\t"
      ? "tsv"
      : extensao.endsWith(".csv") || separadorDetectado === "," || separadorDetectado === ";"
        ? "csv"
        : "texto_colado";

  return {
    ...resultado,
    origem,
  };
}

function gerarCsvModeloListaPresenca() {
  return [
    "Nº;Nome;Função;Assinatura;Observação",
    "1;ABILIO SOARES MAUTO;PEDREIRO;sim;",
    "2;ANDERSON AUGUSTO PEREIRA;GREIDISTA;sim;",
    "3;LUCAS VINICIUS GOMES DOS SANTOS;OP. DE MÁQUINAS;;",
  ].join("\n");
}

function validarItensPlanilhaListaPresenca(itens) {
  const lista = Array.isArray(itens) ? itens : [];
  const validos = [];
  const invalidos = [];
  const avisos = [];
  const nomesVistos = new Map();
  const numerosVistos = new Map();

  for (const item of lista) {
    const nome = String(item?.nome || "").replace(/\s+/g, " ").trim();
    const numero = String(item?.numero || "").replace(/\s+/g, " ").trim();
    const itemNormalizado = {
      ...item,
      numero,
      nome,
      funcao: String(item?.funcao || "").replace(/\s+/g, " ").trim(),
      assinatura: normalizarValorAssinatura(item?.assinatura),
      observacao: String(item?.observacao || "").replace(/\s+/g, " ").trim(),
    };

    if (!nome) {
      invalidos.push({
        ...itemNormalizado,
        motivo: "Sem nome",
      });
      continue;
    }

    if (nomesVistos.has(normalizarTextoBase(nome))) {
      avisos.push(`Nome duplicado: ${nome}`);
    } else {
      nomesVistos.set(normalizarTextoBase(nome), true);
    }

    if (numero) {
      if (numerosVistos.has(numero)) {
        avisos.push(`Número duplicado: ${numero}`);
      } else {
        numerosVistos.set(numero, true);
      }
    }

    validos.push(itemNormalizado);
  }

  return {
    validos,
    invalidos,
    avisos,
  };
}

const listaPresencaPlanilhaUtils = {
  normalizarCabecalhoPlanilha,
  detectarSeparadorTabela,
  separarLinhaTabela,
  parsearTextoListaPresenca,
  parsearArquivoCsvTexto,
  gerarCsvModeloListaPresenca,
  validarItensPlanilhaListaPresenca,
};

export {
  normalizarCabecalhoPlanilha,
  detectarSeparadorTabela,
  separarLinhaTabela,
  parsearTextoListaPresenca,
  parsearArquivoCsvTexto,
  gerarCsvModeloListaPresenca,
  validarItensPlanilhaListaPresenca,
};

export default listaPresencaPlanilhaUtils;
