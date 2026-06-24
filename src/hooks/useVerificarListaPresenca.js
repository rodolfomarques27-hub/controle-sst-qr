import { useCallback, useMemo, useState } from "react";
import { compararNomesLista, normalizarNome } from "../utils/normalizarNome";
import { executarPdfOcrArquivo } from "./usePdfOcr";

function formatarErro(erro, padrao) {
  if (!erro) {
    return padrao;
  }

  if (typeof erro === "string") {
    return erro;
  }

  if (erro instanceof Error) {
    return erro.message || padrao;
  }

  if (typeof erro === "object") {
    return erro.message || erro.details || erro.hint || padrao;
  }

  return padrao;
}

function obterTextoLinha(linha) {
  return String(linha?.nome || linha?.texto || linha?.textoCamada || "").trim();
}

function estimarAssinatura(linha) {
  if (typeof linha?.assinou === "boolean") {
    return linha.assinou;
  }

  if (typeof linha?.assinatura_visual === "boolean") {
    return linha.assinatura_visual;
  }

  const texto = normalizarNome(obterTextoLinha(linha));
  return texto.includes("ASSINATURA");
}

function assinaturaTextualSegura(valor) {
  const texto = normalizarNome(String(valor ?? ""));
  return ["SIM", "S", "X", "OK", "PRESENTE", "ASSINADO"].includes(texto);
}

function escolherMelhorCorrespondencia(colaborador, linhasOcr) {
  const nomeCadastro = String(colaborador?.nome || "").trim();
  let melhor = {
    score: 0,
    similaridade: 0,
    motivo: "Sem correspondência forte",
    linhaOCR: null,
  };

  for (const linha of linhasOcr) {
    const candidatos = [linha?.nome, linha?.texto, linha?.textoCamada].filter(Boolean);

    for (const candidato of candidatos) {
      const comparacao = compararNomesLista(nomeCadastro, candidato);
      if (comparacao.score > melhor.score) {
        melhor = {
          score: comparacao.score,
          similaridade: comparacao.similaridade,
          motivo: comparacao.motivo,
          linhaOCR: linha,
        };
      }
    }
  }

  return melhor;
}

function classificarColaborador({ colaborador, melhor, colaboradorId }) {
  const score = Number(melhor?.score || 0);
  const nomeOCRBruto = obterTextoLinha(melhor?.linhaOCR);
  const nomeOCR = score >= 45 ? nomeOCRBruto : "Não localizado no OCR";
  const funcaoCadastro = String(colaborador?.funcao || colaborador?.funcaoCadastro || "").trim();
  const assinou = score >= 45 ? estimarAssinatura(melhor?.linhaOCR) : false;
  const ehAlvo = colaboradorId != null && String(colaborador?.id) === String(colaboradorId);

  if (score >= 75) {
    return {
      id: colaborador?.id || null,
      nomeCadastro: colaborador?.nome || "",
      funcaoCadastro,
      nomeOCR,
      score,
      similaridade: melhor?.similaridade || 0,
      status: assinou ? "encontrado_e_assinou" : "encontrado_sem_assinatura",
      etiqueta: assinou ? "Presente e assinou" : "Presente, sem assinatura",
      assinou,
      motivo: melhor?.motivo || "Correspondência forte",
      linhaOCR: melhor?.linhaOCR || null,
      encontrado: true,
      provavel: false,
    };
  }

  if (score >= 45) {
    return {
      id: colaborador?.id || null,
      nomeCadastro: colaborador?.nome || "",
      funcaoCadastro,
      nomeOCR,
      score,
      similaridade: melhor?.similaridade || 0,
      status: "conferencia_visual",
      etiqueta: "Conferência visual",
      assinou,
      motivo: melhor?.motivo || "Correspondência parcial",
      linhaOCR: melhor?.linhaOCR || null,
      encontrado: false,
      provavel: true,
    };
  }

  return {
    id: colaborador?.id || null,
    nomeCadastro: colaborador?.nome || "",
    funcaoCadastro,
    nomeOCR,
    score,
    similaridade: melhor?.similaridade || 0,
    status: ehAlvo ? "conferencia_visual" : "ausente",
    etiqueta: ehAlvo ? "Conferência visual" : "Não localizado",
    assinou: false,
    motivo: ehAlvo ? "Colaborador em conferência visual" : "Sem correspondência suficiente",
    linhaOCR: melhor?.linhaOCR || null,
    encontrado: false,
    provavel: ehAlvo,
  };
}

function escolherMelhorCorrespondenciaTabelaPdf(colaborador, participantesTabelaPdf) {
  const nomeCadastro = String(colaborador?.nome || "").trim();
  let melhor = {
    score: 0,
    similaridade: 0,
    motivo: "Sem correspondencia forte",
    participante: null,
    candidatoTexto: "",
    candidatoOrigem: "",
  };

  for (const participante of participantesTabelaPdf) {
    const candidatos = [
      { texto: participante?.nome, origem: "nome" },
      { texto: participante?.linhaOriginal, origem: "linhaOriginal" },
      { texto: participante?.textoOCR, origem: "textoOCR" },
      { texto: participante?.texto, origem: "texto" },
    ]
      .map((item) => ({
        texto: String(item?.texto || "").trim(),
        origem: item?.origem || "",
      }))
      .filter((item) => item.texto);

    for (const candidato of candidatos) {
      const comparacao = compararNomesLista(nomeCadastro, candidato.texto);
      if (comparacao.score > melhor.score) {
        melhor = {
          score: comparacao.score,
          similaridade: comparacao.similaridade,
          motivo: comparacao.motivo,
          participante,
          candidatoTexto: candidato.texto,
          candidatoOrigem: candidato.origem,
        };
      }
    }
  }

  return melhor;
}

function classificarColaboradorTabelaPdf({ colaborador, melhor }) {
  const score = Number(melhor?.score || 0);
  const participante = melhor?.participante || null;
  const nomeOCRBruto = obterTextoLinha(participante);
  const nomeOCR = score >= 45 ? nomeOCRBruto : "Não localizado na tabela interna do PDF";
  const funcaoCadastro = String(colaborador?.funcao || colaborador?.funcaoCadastro || "").trim();
  const assinaturaSegura = assinaturaTextualSegura(participante?.assinatura);
  const diagnosticoComparacaoTabela = {
    candidatoTexto: melhor?.candidatoTexto || "",
    candidatoOrigem: melhor?.candidatoOrigem || "",
    participanteNome: participante?.nome || "",
    participanteFuncao: participante?.funcao || "",
    participanteAssinatura: participante?.assinatura || "",
    participantePagina: participante?.pagina || null,
    participanteNumero: participante?.numero || "",
    participanteLinhaOriginal: participante?.linhaOriginal || "",
    score: Number(melhor?.score || 0),
    similaridade: Number(melhor?.similaridade || 0),
    motivo: melhor?.motivo || "",
  };

  if (score >= 80 && assinaturaSegura) {
    return {
      colaborador: colaborador || null,
      nomeCadastro: colaborador?.nome || "",
      funcaoCadastro,
      nomeOCR,
      status: "encontrado_e_assinou",
      score,
      motivo: "Nome encontrado na tabela interna; assinatura textual segura",
      assinou: true,
      linhaOCR: participante,
      origem: "pdf_tabela_interna_comparada",
      diagnosticoComparacaoTabela,
    };
  }

  if (score >= 80) {
    return {
      colaborador: colaborador || null,
      nomeCadastro: colaborador?.nome || "",
      funcaoCadastro,
      nomeOCR,
      status: "conferencia_visual",
      score,
      motivo: "Nome encontrado na tabela interna; assinatura exige conferência visual",
      assinou: false,
      linhaOCR: participante,
      origem: "pdf_tabela_interna_comparada",
      diagnosticoComparacaoTabela,
    };
  }

  if (score >= 45) {
    return {
      colaborador: colaborador || null,
      nomeCadastro: colaborador?.nome || "",
      funcaoCadastro,
      nomeOCR,
      status: "conferencia_visual",
      score,
      motivo: "Correspondência parcial na tabela interna do PDF",
      assinou: false,
      linhaOCR: participante,
      origem: "pdf_tabela_interna_comparada",
      diagnosticoComparacaoTabela,
    };
  }

  return {
    colaborador: colaborador || null,
    nomeCadastro: colaborador?.nome || "",
    funcaoCadastro,
    nomeOCR: "Sem correspondência suficiente na tabela interna do PDF",
    status: "ausente",
    score,
    motivo: "Sem correspondência suficiente na tabela interna do PDF",
    assinou: false,
    linhaOCR: participante,
    origem: "pdf_tabela_interna_comparada",
    diagnosticoComparacaoTabela,
  };
}

export function compararTabelaPdfComColaboradores({
  participantesTabelaPdf = [],
  colaboradores = [],
  colaboradorId = null,
} = {}) {
  const listaParticipantes = Array.isArray(participantesTabelaPdf) ? participantesTabelaPdf : [];
  const listaColaboradores = Array.isArray(colaboradores) ? colaboradores : [];

  const itens = listaColaboradores.map((colaborador) => {
    const melhor = escolherMelhorCorrespondenciaTabelaPdf(colaborador, listaParticipantes);
    return classificarColaboradorTabelaPdf({ colaborador, melhor, colaboradorId });
  });

  const encontrados = itens.filter((item) => item.status === "encontrado_e_assinou").length;
  const assinados = itens.filter((item) => item.assinou).length;
  const provaveis = itens.filter((item) => item.status === "conferencia_visual").length;
  const ausentes = itens.filter((item) => item.status === "ausente").length;

  return {
    itens,
    resumo: {
      total: itens.length,
      encontrados,
      assinados,
      provaveis,
      ausentes,
    },
    origem: "pdf_tabela_interna_comparada",
    diagnostico: {
      totalParticipantesTabelaPdf: listaParticipantes.length,
      totalColaboradores: listaColaboradores.length,
      colaboradorId: colaboradorId || null,
    },
  };
}

export function compararListaPresencaComColaboradores({
  linhasOcr = [],
  colaboradores = [],
  colaboradorId = null,
} = {}) {
  const itens = Array.isArray(colaboradores) ? colaboradores.map((colaborador) => {
    const melhor = escolherMelhorCorrespondencia(colaborador, Array.isArray(linhasOcr) ? linhasOcr : []);
    return classificarColaborador({ colaborador, melhor, colaboradorId });
  }) : [];

  const encontrados = itens.filter((item) => item.status === "encontrado_e_assinou" || item.status === "encontrado_sem_assinatura").length;
  const assinados = itens.filter((item) => item.assinou).length;
  const provaveis = itens.filter((item) => item.status === "conferencia_visual").length;
  const ausentes = itens.filter((item) => item.status === "ausente").length;

  return {
    itens,
    total: itens.length,
    encontrados,
    assinados,
    provaveis,
    ausentes,
  };
}

export default function useVerificarListaPresenca() {
  const [resultado, setResultado] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [progresso, setProgresso] = useState(0);
  const [etapa, setEtapa] = useState("idle");

  const verificarLista = useCallback(
    async ({ arquivo, colaboradores = [], colaboradorId = null } = {}) => {
      if (!arquivo) {
        const mensagem = "Selecione um arquivo PDF para iniciar a verificação.";
        setErro(mensagem);
        setResultado(null);
        setEtapa("erro");
        return { erro: mensagem };
      }

      setCarregando(true);
      setErro("");
      setProgresso(0);
      setEtapa("ocr");

      try {
        const ocr = await executarPdfOcrArquivo(arquivo, {
          onProgresso: (valor) => {
            setProgresso(Math.max(0, Math.min(1, Number(valor) || 0)));
          },
        });

        setEtapa("comparando");

        const resumo = compararListaPresencaComColaboradores({
          linhasOcr: ocr?.resultado || [],
          colaboradores,
          colaboradorId,
        });

        const possuiConferenciaVisual = resumo.itens.some((item) => item.status === "conferencia_visual");
        const possuiEncontrado = resumo.itens.some((item) => item.status === "encontrado_e_assinou" || item.status === "encontrado_sem_assinatura");
        const statusVerificacao = possuiEncontrado && !possuiConferenciaVisual
          ? "APROVADO"
          : "APROVADO COM CONFERÊNCIA VISUAL";

        const resultadoFinal = {
          origem_analise: "ocr_local_pdf",
          status_verificacao: statusVerificacao,
          resumo,
          resultado: resumo.itens,
          textoCompleto: ocr?.textoCompleto || "",
          paginaTotal: ocr?.paginaTotal || 0,
          isPdfEscaneado: Boolean(ocr?.isPdfEscaneado),
          textoCamadaTotal: ocr?.textoCamadaTotal || "",
          diagnosticoOcr: ocr?.diagnosticoOcr || null,
        };

        setResultado(resultadoFinal);
        setProgresso(1);
        setEtapa("concluido");
        return resultadoFinal;
      } catch (erroExecucao) {
        const mensagem = formatarErro(erroExecucao, "Não foi possível verificar a lista de presença.");
        setErro(mensagem);
        setResultado(null);
        setProgresso(0);
        setEtapa("erro");
        return { erro: mensagem };
      } finally {
        setCarregando(false);
      }
    },
    [],
  );

  const estado = useMemo(() => ({
    resultado,
    carregando,
    erro,
    progresso,
    etapa,
    verificarLista,
    setResultado,
    setErro,
  }), [resultado, carregando, erro, progresso, etapa, verificarLista]);

  return estado;
}
