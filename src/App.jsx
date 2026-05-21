/* eslint-disable no-unused-vars */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";
import { QRCodeSVG } from "qrcode.react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  BadgeCheck,
  Building2,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Database,
  Download,
  Eye,
  FileText,
  Filter,
  HardHat,
  LayoutDashboard,
  Lock,
  LogIn,
  Plus,
  QrCode,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
  UserPlus,
  UserRound,
  Users,
  XCircle,
} from "lucide-react";

const hoje = new Date();

const estilosGlobais = `
  .scrollbar-discreta {
    scrollbar-width: thin;
    scrollbar-color: #e2e8f0 transparent;
    scrollbar-gutter: stable;
  }

  .scrollbar-discreta::-webkit-scrollbar {
    width: 5px;
    height: 5px;
  }

  .scrollbar-discreta::-webkit-scrollbar-track {
    background: transparent;
    margin: 18px 0;
  }

  .scrollbar-discreta::-webkit-scrollbar-thumb {
    background: #e2e8f0;
    border-radius: 999px;
  }

  .scrollbar-discreta::-webkit-scrollbar-thumb:hover {
    background: #cbd5e1;
  }
`;

const DAY = 1000 * 60 * 60 * 24;

function addDays(days) {
  const d = new Date(hoje);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const treinamentosBase = [
  { id: 21, nome: "Ficha de Registro - CLT / eSocial", validadePadrao: 3650, categoria: "Documento", base: "CLT / eSocial / admissional" },

  { id: 1, nome: "NR-01 Integração / Mobilização SST", validadePadrao: 365, categoria: "Obrigatório", base: "NR-01 / Integração de obra" },
  { id: 15, nome: "NR-01 Ordem de Serviço da Função", validadePadrao: 365, categoria: "Documento", base: "NR-01 / Ordem de Serviço" },
  { id: 13, nome: "NR-01 / NR-18 Procedimento Operacional da Função / OS", validadePadrao: 365, categoria: "Atividade", base: "NR-01 / NR-18 / PGR / APR" },
  { id: 8, nome: "NR-06 Uso Correto de EPIs", validadePadrao: 365, categoria: "Obrigatório", base: "NR-06 / NR-01" },
  { id: 14, nome: "NR-06 Ficha de EPIs atualizada", validadePadrao: 365, categoria: "Documento", base: "NR-06 / registro de fornecimento de EPI" },
  { id: 22, nome: "NR-07 ASO - Atestado de Saúde Ocupacional", validadePadrao: 365, categoria: "Documento Médico", base: "NR-07" },
  { id: 4, nome: "NR-10 Segurança em Eletricidade", validadePadrao: 730, categoria: "Elétrica", base: "NR-10" },
  { id: 11, nome: "NR-11 Transporte e Movimentação de Cargas", validadePadrao: 365, categoria: "Movimentação", base: "NR-11" },
  { id: 3, nome: "NR-12 Máquinas e Equipamentos", validadePadrao: 730, categoria: "Operacional", base: "NR-12" },
  { id: 5, nome: "NR-12 / NR-18 PEMT / PTA", validadePadrao: 365, categoria: "Equipamento", base: "NR-18 / NR-12 / fabricante" },
  { id: 7, nome: "NR-12 / NR-18 Lixadeira / Esmerilhadeira", validadePadrao: 365, categoria: "Ferramentas", base: "NR-12 / NR-18" },
  { id: 18, nome: "NR-18 Ergonomia / Orientação Postural", validadePadrao: 365, categoria: "Ergonomia", base: "NR-18 / orientação postural de obra" },
  { id: 9, nome: "NR-18.06 Treinamento de Obra / Construção", validadePadrao: 365, categoria: "Construção", base: "NR-18" },
  { id: 12, nome: "NR-18 Escavação / Abertura de Valas", validadePadrao: 365, categoria: "Construção", base: "NR-18 / procedimento interno" },
  { id: 6, nome: "NR-18 / NR-34 Trabalho a Quente / Solda", validadePadrao: 365, categoria: "Alto Risco", base: "NR-18 / NR-34 como referência técnica" },
  { id: 16, nome: "NR-21 Trabalho a Céu Aberto / Protetor Solar", validadePadrao: 365, categoria: "Ambiental", base: "NR-21 / procedimento interno" },
  { id: 20, nome: "NR-23 Proteção Contra Incêndio", validadePadrao: 365, categoria: "Emergência", base: "NR-23" },
  { id: 17, nome: "NR-25 Meio Ambiente / Resíduos", validadePadrao: 365, categoria: "Meio Ambiente", base: "NR-25 / procedimento interno" },
  { id: 19, nome: "NR-26 Sinalização de Segurança / Vias", validadePadrao: 365, categoria: "Sinalização", base: "NR-26" },
  { id: 10, nome: "NR-33 Espaço Confinado", validadePadrao: 365, categoria: "Alto Risco", base: "NR-33" },
  { id: 2, nome: "NR-35 Trabalho em Altura", validadePadrao: 730, categoria: "Alto Risco", base: "NR-35" },
];

const documentosEmpresaBase = [
  {
    tipo: "LTCAT",
    nome: "LTCAT",
    validadePadraoDias: 1095,
    regra:
      "Controle interno de 3 anos. Revisar antes do prazo se houver alteração de layout, processo, atividade, equipamentos, agentes nocivos, EPCs, EPIs ou medidas de controle.",
    fundamento: "Base legal: previdenciária/eSocial.",
  },
  {
    tipo: "PCMSO",
    nome: "PCMSO",
    validadePadraoDias: 365,
    regra:
      "Controle anual recomendado, com base nos riscos do PGR, exames ocupacionais, mudanças de função ou alteração da exposição ocupacional.",
    fundamento: "Base normativa: NR-07 e PGR/NR-01.",
  },
  {
    tipo: "PGR",
    nome: "PGR",
    validadePadraoDias: 730,
    regra:
      "Revisar no mínimo a cada 2 anos ou quando houver mudança em processos, layout, equipamentos, medidas de prevenção ou ocorrência relevante.",
    fundamento: "Base normativa: NR-01/GRO/PGR.",
  },
];

function obterDocumentoEmpresa(tipo) {
  return documentosEmpresaBase.find((d) => d.tipo === tipo) || documentosEmpresaBase[0];
}

function calcularVencimentoDocumento(tipo, dataEmissao) {
  const documento = obterDocumentoEmpresa(tipo);

  if (!dataEmissao || !documento.validadePadraoDias) return "";

  const data = new Date(`${dataEmissao}T12:00:00`);
  data.setDate(data.getDate() + documento.validadePadraoDias);
  return data.toISOString().slice(0, 10);
}

const treinamentosBaseObra = [1, 14, 15, 8, 9, 16, 17, 18, 20, 21, 22];

const matrizTreinamentosPorFuncao = [
  {
    chave: "pedreiro",
    rotulo: "PEDREIRO",
    termos: ["pedreiro", "alvenaria", "bloquete", "pavimentador", "calceteiro"],
    treinamentos: [...treinamentosBaseObra, 11, 13],
  },
  {
    chave: "ajudante",
    rotulo: "AJUDANTE",
    termos: ["ajudante", "servente", "auxiliar"],
    treinamentos: [...treinamentosBaseObra, 11, 13],
  },
  {
    chave: "encarregado",
    rotulo: "ENCARREGADO",
    termos: ["encarregado", "mestre de obras", "supervisor"],
    treinamentos: [...treinamentosBaseObra, 11, 13],
  },
  {
    chave: "carpinteiro",
    rotulo: "CARPINTEIRO",
    termos: ["carpinteiro", "formas", "forma"],
    treinamentos: [...treinamentosBaseObra, 2, 3, 7, 11, 13],
  },
  {
    chave: "op-betoneira",
    rotulo: "OP. DE BETONEIRA",
    termos: ["betoneira", "op. de betoneira", "operador de betoneira"],
    treinamentos: [...treinamentosBaseObra, 3, 11, 13],
  },
  {
    chave: "tecnico-sst",
    rotulo: "TEC. SEG. DO TRAB.",
    termos: ["tecnico de seguranca", "técnico de segurança", "tec. seg", "seguranca do trabalho", "segurança do trabalho", "sst"],
    treinamentos: [...treinamentosBaseObra, 13],
  },
  {
    chave: "lider",
    rotulo: "LÍDER",
    termos: ["lider", "líder", "liderança"],
    treinamentos: [...treinamentosBaseObra, 11, 13],
  },
  {
    chave: "motorista",
    rotulo: "MOTORISTA",
    termos: ["motorista", "condutor"],
    treinamentos: [...treinamentosBaseObra, 11, 19, 13],
  },
  {
    chave: "armador",
    rotulo: "ARMADOR",
    termos: ["armador", "armação", "armacao", "ferreiro"],
    treinamentos: [...treinamentosBaseObra, 2, 11, 13],
  },
  {
    chave: "op-maquinas",
    rotulo: "OP. DE MÁQUINAS",
    termos: ["op. de maquinas", "op de maquinas", "operador de maquinas", "operador de máquinas", "maquinas", "máquinas", "retroescavadeira", "escavadeira", "pa carregadeira", "pá carregadeira"],
    treinamentos: [...treinamentosBaseObra, 3, 11, 19, 13],
  },
  {
    chave: "greidista",
    rotulo: "GREIDISTA",
    termos: ["greidista", "greide", "nivelamento"],
    treinamentos: [...treinamentosBaseObra, 3, 11, 19, 13],
  },
  {
    chave: "soldador",
    rotulo: "SOLDADOR / TRABALHO A QUENTE",
    termos: ["soldador", "solda", "caldeireiro"],
    treinamentos: [...treinamentosBaseObra, 3, 6, 7, 13],
  },
  {
    chave: "operador-pemt",
    rotulo: "OPERADOR DE PEMT / PTA",
    termos: ["pemt", "pta", "plataforma", "cesto", "elevatoria", "elevatória"],
    treinamentos: [...treinamentosBaseObra, 2, 3, 5, 13],
  },
  {
    chave: "eletricista",
    rotulo: "ELETRICISTA",
    termos: ["eletricista", "eletrica", "elétrica", "eletrico", "elétrico"],
    treinamentos: [...treinamentosBaseObra, 2, 3, 4, 13],
  },
  {
    chave: "geral",
    rotulo: "MATRIZ BÁSICA DE OBRA",
    termos: [],
    treinamentos: [...treinamentosBaseObra, 13],
  },
];

function normalizarTextoBusca(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function obterFuncoesPersonalizadasSalvas() {
  if (typeof window === "undefined") return [];

  try {
    const salvas = JSON.parse(window.localStorage.getItem("funcoesTreinamentosPersonalizadas") || "[]");
    return Array.isArray(salvas) ? salvas : [];
  } catch {
    return [];
  }
}

function salvarFuncoesPersonalizadas(lista) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("funcoesTreinamentosPersonalizadas", JSON.stringify(lista));
}

function obterTodasMatrizesFuncao() {
  const personalizadas = obterFuncoesPersonalizadasSalvas();
  const matrizGeral = matrizTreinamentosPorFuncao.find((item) => item.chave === "geral");
  const fixasSemGeral = matrizTreinamentosPorFuncao.filter((item) => item.chave !== "geral");

  return [...fixasSemGeral, ...personalizadas, matrizGeral];
}

function obterMatrizFuncao(funcao) {
  const texto = normalizarTextoBusca(funcao);
  const matrizes = obterTodasMatrizesFuncao();

  return (
    matrizes.find((item) =>
      item.chave !== "geral" && item.termos.some((termo) => texto.includes(normalizarTextoBusca(termo)))
    ) || matrizes.find((item) => item.chave === "geral")
  );
}

function treinamentosObrigatoriosFuncao(funcao) {
  const matriz = obterMatrizFuncao(funcao);
  return Array.from(new Set(matriz.treinamentos)).map((id) => obterTreinamento(id)).filter(Boolean);
}

function gerarCodigoFuncionario(nome = "") {
  const base = normalizarTextoBusca(nome)
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 4)
    .toUpperCase();

  const aleatorio = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `COL-${base || "SST"}-${aleatorio}`;
}

function obterUrlFotoColaborador(caminho) {
  if (!caminho) return "";

  if (String(caminho).startsWith("http")) return caminho;

  const { data } = supabase.storage
    .from("fotos-colaboradores")
    .getPublicUrl(caminho);

  return data?.publicUrl || "";
}

function FotoColaborador({ src, nome, className = "h-12 w-12", iconClassName = "h-5 w-5" }) {
  const [erroImagem, setErroImagem] = useState(false);
  const url = obterUrlFotoColaborador(src);

  if (!url || erroImagem) {
    return (
      <div className={classNames("flex shrink-0 items-center justify-center overflow-hidden bg-slate-100 text-slate-500", className)}>
        <UserRound className={iconClassName} />
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={`Foto ${nome || "colaborador"}`}
      className={classNames("shrink-0 object-cover", className)}
      onError={() => setErroImagem(true)}
    />
  );
}

function avaliarTreinamentosColaborador(colaborador) {
  const removidos = (colaborador.treinamentosRemovidos || []).map(Number);
  const adicionais = (colaborador.treinamentosAdicionais || []).map(Number);
  const obrigatoriosBase = treinamentosObrigatoriosFuncao(colaborador.funcao);
  const idsObrigatorios = Array.from(new Set([
    ...obrigatoriosBase.map((treinamento) => Number(treinamento.id)),
    ...adicionais,
  ]));

  const obrigatorios = idsObrigatorios
    .filter((id) => !removidos.includes(Number(id)))
    .map((id) => obterTreinamento(id))
    .filter(Boolean);

  const realizados = colaborador.treinamentos || [];

  const itens = obrigatorios.map((treinamento) => {
    const realizado = realizados.find((item) => Number(item.treinamentoId) === Number(treinamento.id));

    if (!realizado) {
      return {
        treinamento,
        realizado: null,
        status: {
          chave: "pendente",
          texto: "Pendente",
          icon: AlertTriangle,
          classe: "bg-blue-50 text-blue-700 ring-blue-200",
          barra: "bg-blue-500",
        },
      };
    }

    return {
      treinamento,
      realizado,
      status: statusDocumento(realizado.vencimento),
    };
  });

  const pendentes = itens.filter((item) => item.status.chave === "pendente");
  const vencidos = itens.filter((item) => item.status.chave === "vencido");
  const vencendo = itens.filter((item) => item.status.chave === "vencendo");
  const emDia = itens.filter((item) => item.status.chave === "emdia");

  return {
    matriz: obterMatrizFuncao(colaborador.funcao),
    itens,
    pendentes,
    vencidos,
    vencendo,
    emDia,
    total: itens.length,
  };
}


const colaboradoresIniciais = [
  {
    id: 101,
    nome: "Luiz Paulo Costa",
    empresa: "ABC Montagens",
    funcao: "Soldador",
    matricula: "M-0145",
    status: "Ativo",
    token: "SST-LUIZ-8F2A",
    treinamentos: [
      { treinamentoId: 1, realizado: addDays(-160), vencimento: addDays(205), arquivo: "integracao_luiz.pdf" },
      { treinamentoId: 2, realizado: addDays(-500), vencimento: addDays(230), arquivo: "nr35_luiz.pdf" },
      { treinamentoId: 6, realizado: addDays(-370), vencimento: addDays(-5), arquivo: "solda_luiz.pdf" },
      { treinamentoId: 7, realizado: addDays(-340), vencimento: addDays(25), arquivo: "lixadeira_luiz.pdf" },
    ],
  },
  {
    id: 102,
    nome: "Marcos Vinícius Lima",
    empresa: "RDB Serviços Industriais",
    funcao: "Montador",
    matricula: "RDB-229",
    status: "Ativo",
    token: "SST-MARCOS-A73C",
    treinamentos: [
      { treinamentoId: 1, realizado: addDays(-40), vencimento: addDays(325), arquivo: "integracao_marcos.pdf" },
      { treinamentoId: 2, realizado: addDays(-700), vencimento: addDays(30), arquivo: "nr35_marcos.pdf" },
      { treinamentoId: 3, realizado: addDays(-300), vencimento: addDays(430), arquivo: "nr12_marcos.pdf" },
    ],
  },
];

function normalizarColaborador(item) {
  return {
    id: item.id,
    empresaId: item.empresa_id || item.empresaId || null,
    nome: item.nome || "",
    empresa: item.empresas?.nome || item.empresa || "Empresa não informada",
    empresaTipo: item.empresas?.tipo_empresa || item.empresaTipo || "",
    empresaPaiId: item.empresas?.empresa_pai_id || item.empresaPaiId || null,
    empresaPaiNome: item.empresaPaiNome || "",
    empresaExibicao: item.empresaExibicao || item.empresas?.nome || item.empresa || "Empresa não informada",
    funcao: item.funcao || "-",
    matricula: item.matricula || "-",
    codigoFuncionario: item.codigo_funcionario || item.codigoFuncionario || `COL-${String(item.id).slice(0, 8).toUpperCase()}`,
    fotoUrl: item.foto_url || item.fotoUrl || "",
    fotoNome: item.foto_nome || item.fotoNome || "",
    status: item.status || "Ativo",
    statusMobilizacao: item.status_mobilizacao || item.statusMobilizacao || "Mobilizado",
    treinamentosRemovidos: item.treinamentos_removidos || item.treinamentosRemovidos || [],
    treinamentosAdicionais: item.treinamentos_adicionais || item.treinamentosAdicionais || [],
    token: item.token_qr || item.token || `SST-${String(item.id).slice(0, 8)}`,
    treinamentos: item.treinamentos || [],
  };
}

function normalizarCertificado(item) {
  const tipoTreinamento = item.tipo_treinamento || item.tipoTreinamento || item.nome_treinamento || item.nomeTreinamento || "";
  const idNumerico =
    Number.isFinite(Number(item.treinamento_codigo || item.treinamentoCodigo))
      ? Number(item.treinamento_codigo || item.treinamentoCodigo)
      : Number.isFinite(Number(item.treinamento_id || item.treinamentoId))
        ? Number(item.treinamento_id || item.treinamentoId)
        : obterTreinamentoIdPorTipo(tipoTreinamento);

  return {
    id: item.id,
    colaboradorId: item.colaborador_id || item.colaboradorId || null,
    treinamentoId: Number(idNumerico),
    tipoTreinamento,
    nomeTreinamento: item.nome_treinamento || item.nomeTreinamento || tipoTreinamento || "",
    realizado: item.data_realizacao || item.realizado || "",
    vencimento: item.data_vencimento || item.vencimento || "",
    arquivo: item.arquivo_nome || item.arquivo || "",
    arquivoUrl: item.arquivo_url || item.arquivoUrl || "",
    observacao: item.observacao || "",
    statusValidacao: item.status_validacao || "Validado",
    createdAt: item.created_at || "",
  };
}

function diasParaVencer(dataISO) {
  const venc = new Date(`${dataISO}T12:00:00`);
  const base = new Date(hoje.toISOString().slice(0, 10) + "T12:00:00");
  return Math.ceil((venc - base) / DAY);
}

function statusDocumento(dataISO) {
  const dias = diasParaVencer(dataISO);

  if (dias < 0) {
    return {
      chave: "vencido",
      texto: "Vencido",
      icon: XCircle,
      classe: "bg-red-50 text-red-700 ring-red-200",
      barra: "bg-red-500",
    };
  }

  if (dias <= 30) {
    return {
      chave: "vencendo",
      texto: "A vencer",
      icon: AlertTriangle,
      classe: "bg-orange-50 text-orange-700 ring-orange-200",
      barra: "bg-orange-500",
    };
  }

  return {
    chave: "emdia",
    texto: "Em dia",
    icon: CheckCircle2,
    classe: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    barra: "bg-emerald-500",
  };
}

function statusEmpresaDocumento(dataVencimento) {
  if (!dataVencimento) {
    return {
      chave: "semvencimento",
      texto: "Sem revisão",
      icon: FileText,
      classe: "bg-slate-50 text-slate-700 ring-slate-200",
      barra: "bg-slate-500",
    };
  }

  return statusDocumento(dataVencimento);
}

function calcularSituacaoDocumentalEmpresa(docs = []) {
  const obrigatorios = ["LTCAT", "PCMSO", "PGR"];
  const faltantes = obrigatorios.filter((tipo) => !docs.some((doc) => doc.tipo_documento === tipo));

  if (docs.length === 0) {
    return {
      texto: "Sem documentos",
      classe: "bg-blue-50 text-blue-700 ring-blue-200",
      detalhe: "Nenhum documento obrigatório cadastrado",
      faltantes,
    };
  }

  if (faltantes.length > 0) {
    return {
      texto: "Com pendências",
      classe: "bg-blue-50 text-blue-700 ring-blue-200",
      detalhe: `Faltando: ${faltantes.join(", ")}`,
      faltantes,
    };
  }

  const statusDocs = docs.map((doc) => ({
    tipo: doc.tipo_documento,
    status: statusEmpresaDocumento(doc.data_vencimento),
  }));

  const vencidos = statusDocs.filter((item) => item.status.chave === "vencido");
  const vencendo = statusDocs.filter((item) => item.status.chave === "vencendo");

  if (vencidos.length > 0) {
    return {
      texto: "Documentos vencidos",
      classe: "bg-red-50 text-red-700 ring-red-200",
      detalhe: `Vencido(s): ${vencidos.map((item) => item.tipo).join(", ")}`,
      faltantes: [],
    };
  }

  if (vencendo.length > 0) {
    return {
      texto: "A vencer",
      classe: "bg-orange-50 text-orange-700 ring-orange-200",
      detalhe: `A vencer: ${vencendo.map((item) => item.tipo).join(", ")}`,
      faltantes: [],
    };
  }

  return {
    texto: "Regular",
    classe: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    detalhe: "Documentos obrigatórios cadastrados e válidos",
    faltantes: [],
  };
}


function formatDate(dataISO) {
  if (!dataISO) return "-";
  return new Date(`${dataISO}T12:00:00`).toLocaleDateString("pt-BR");
}

function classNames(...items) {
  return items.filter(Boolean).join(" ");
}

function ehUuid(valor) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(valor || "").trim()
  );
}

function sanitizarNomeArquivo(nome) {
  return String(nome || "documento.pdf")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

function obterUrlLogoEmpresa(caminho) {
  if (!caminho) return "";

  const { data } = supabase.storage
    .from("logos-empresas")
    .getPublicUrl(caminho);

  return data?.publicUrl || "";
}

function normalizarStatusEmpresa(status) {
  if (!status || status === "Ativa" || status === "Empresa ativa") return "Empresa ativa";
  if (status === "Inativa" || status === "Empresa inativa") return "Empresa inativa";
  if (status === "Inapta" || status === "Empresa inapta") return "Empresa inapta";
  if (status === "Bloqueada" || status === "Suspensa" || status === "Empresa suspensa") return "Empresa suspensa";
  return status;
}

function classeStatusEmpresa(status) {
  const statusNormalizado = normalizarStatusEmpresa(status);

  if (statusNormalizado === "Empresa ativa") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (statusNormalizado === "Empresa inativa") {
    return "bg-slate-100 text-slate-700 ring-slate-300";
  }

  if (statusNormalizado === "Empresa inapta") {
    return "bg-red-50 text-red-700 ring-red-200";
  }

  if (statusNormalizado === "Empresa suspensa") {
    return "bg-orange-50 text-orange-700 ring-orange-200";
  }

  return "bg-slate-100 text-slate-700 ring-slate-300";
}

function escaparCSV(valor) {
  const texto = String(valor ?? "").replace(/"/g, '""');
  return `"${texto}"`;
}

function baixarCSV(nomeArquivo, linhas) {
  const csv = linhas.map((linha) => linha.map(escaparCSV).join(";")).join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function limparTextoPDF(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/[\\()]/g, "\\$&")
    .trim();
}

function quebrarTextoPDF(valor, limite = 88) {
  const texto = limparTextoPDF(valor);

  if (!texto) return ["-"];

  const palavras = texto.split(/\s+/);
  const linhas = [];
  let atual = "";

  palavras.forEach((palavra) => {
    if ((atual + " " + palavra).trim().length > limite) {
      if (atual) linhas.push(atual);
      atual = palavra;
    } else {
      atual = `${atual} ${palavra}`.trim();
    }
  });

  if (atual) linhas.push(atual);

  return linhas.length ? linhas : ["-"];
}

function baixarPDF(nomeArquivo, titulo, linhas) {
  const larguraPagina = 595;
  const alturaPagina = 842;
  const margem = 40;
  const limiteInferior = 45;
  const dataAtual = new Date().toLocaleDateString("pt-BR");

  const paginas = [];
  let comandos = [];
  let y = 800;

  const adicionarTexto = (texto, tamanho = 9, fonte = "F1", recuo = 0) => {
    const linhasQuebradas = quebrarTextoPDF(texto, recuo ? 78 : 95);

    linhasQuebradas.forEach((linha) => {
      if (y < limiteInferior) {
        paginas.push(comandos.join("\n"));
        comandos = [];
        y = 800;
        comandos.push(`BT /F2 13 Tf ${margem} ${y} Td (${limparTextoPDF(titulo)}) Tj ET`);
        y -= 18;
        comandos.push(`BT /F1 8 Tf ${margem} ${y} Td (Continuacao) Tj ET`);
        y -= 22;
      }

      comandos.push(`BT /${fonte} ${tamanho} Tf ${margem + recuo} ${y} Td (${limparTextoPDF(linha)}) Tj ET`);
      y -= tamanho + 4;
    });
  };

  comandos.push(`BT /F2 16 Tf ${margem} ${y} Td (${limparTextoPDF(titulo)}) Tj ET`);
  y -= 20;
  comandos.push(`BT /F1 9 Tf ${margem} ${y} Td (Gerado em ${limparTextoPDF(dataAtual)} pelo Controle SST QR) Tj ET`);
  y -= 26;

  const cabecalho = linhas[0] || [];
  const registros = linhas.slice(1);

  if (registros.length === 0) {
    adicionarTexto("Nenhum registro encontrado para os filtros selecionados.", 10, "F1");
  }

  registros.forEach((registro, indice) => {
    if (indice > 0) {
      adicionarTexto("------------------------------------------------------------", 8, "F1");
    }

    adicionarTexto(`Registro ${indice + 1}`, 11, "F2");

    cabecalho.forEach((campo, campoIndice) => {
      adicionarTexto(`${campo}: ${registro[campoIndice] ?? ""}`, 9, "F1", 10);
    });

    y -= 4;
  });

  paginas.push(comandos.join("\n"));

  const objetos = [];
  const adicionarObjeto = (conteudo) => {
    objetos.push(conteudo);
    return objetos.length;
  };

  adicionarObjeto("<< /Type /Catalog /Pages 2 0 R >>");

  const kids = paginas.map((_, i) => `${3 + i * 2} 0 R`).join(" ");
  adicionarObjeto(`<< /Type /Pages /Kids [${kids}] /Count ${paginas.length} >>`);

  paginas.forEach((conteudo, i) => {
    const paginaObj = 3 + i * 2;
    const conteudoObj = 4 + i * 2;

    objetos[paginaObj - 1] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${larguraPagina} ${alturaPagina}] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> /F2 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> >> >> /Contents ${conteudoObj} 0 R >>`;
    objetos[conteudoObj - 1] = `<< /Length ${conteudo.length} >>\nstream\n${conteudo}\nendstream`;
  });

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objetos.forEach((objeto, indice) => {
    offsets.push(pdf.length);
    pdf += `${indice + 1} 0 obj\n${objeto}\nendobj\n`;
  });

  const inicioXref = pdf.length;
  pdf += `xref\n0 ${objetos.length + 1}\n`;
  pdf += "0000000000 65535 f \n";

  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });

  pdf += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${inicioXref}\n%%EOF`;

  const blob = new Blob([pdf], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function StatusPill({ status, small = false }) {
  const Icon = status.icon;
  const textoStatus =
    status.chave === "vencendo"
      ? "A vencer"
      : String(status.texto || "")
          .replace(/A vencer/gi, "A vencer")
          .replace(/A vencer/gi, "A vencer")
          .replace(/A vencer/gi, "A vencer")
          .replace(/Vencendo/gi, "A vencer")
          .replace(/A vencer/gi, "A vencer");

  return (
    <span
      translate="no"
      className={classNames(
        "notranslate inline-flex min-w-[72px] items-center justify-center gap-1 whitespace-nowrap rounded-full text-center ring-1",
        status.classe,
        small ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm font-medium"
      )}
    >
      <Icon className={small ? "h-3.5 w-3.5" : "h-4 w-4"} />
      {textoStatus}
    </span>
  );
}

function QRCodeReal({ token, size = 150 }) {
  const urlConsulta = `${window.location.origin}/?qr=${encodeURIComponent(token)}`;

  return (
    <div className="flex items-center justify-center rounded-3xl bg-white p-3 shadow-inner ring-1 ring-slate-200">
      <QRCodeSVG
        value={urlConsulta}
        size={size}
        level="H"
        includeMargin
        bgColor="#ffffff"
        fgColor="#0f172a"
      />
    </div>
  );
}

function LinkPublicoQR({ token }) {
  const urlConsulta = `${window.location.origin}/?qr=${encodeURIComponent(token)}`;

  return (
    <div className="mt-2 inline-flex max-w-full items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5 ring-1 ring-slate-200">
      <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-slate-400">Link público</span>
      <span className="max-w-[360px] truncate text-[11px] text-slate-500">{urlConsulta}</span>
    </div>
  );
}

function obterTreinamento(id) {
  return treinamentosBase.find((t) => Number(t.id) === Number(id)) || { nome: "Treinamento não cadastrado", categoria: "-", validadePadrao: 365 };
}

function obterTreinamentoIdPorTipo(valor) {
  const texto = normalizarTextoBusca(valor);

  if (!texto) return null;

  const encontrado = treinamentosBase.find((treinamento) => {
    const nome = normalizarTextoBusca(treinamento.nome);
    const categoria = normalizarTextoBusca(treinamento.categoria);
    const base = normalizarTextoBusca(treinamento.base);

    return (
      nome === texto ||
      nome.includes(texto) ||
      texto.includes(nome) ||
      categoria === texto ||
      base === texto
    );
  });

  return encontrado?.id || null;
}

function calcularVencimentoTreinamento(treinamentoId, dataRealizacao) {
  const treinamento = obterTreinamento(Number(treinamentoId));

  if (!dataRealizacao || !treinamento?.validadePadrao) return "";

  const data = new Date(`${dataRealizacao}T12:00:00`);
  data.setDate(data.getDate() + Number(treinamento.validadePadrao));
  return data.toISOString().slice(0, 10);
}

function statusGeral(colaborador) {
  const avaliacao = avaliarTreinamentosColaborador(colaborador);

  if (avaliacao.vencidos.length > 0) {
    return { texto: "Vencido", classe: "bg-red-600 text-white", detalhe: "Possui treinamento obrigatório vencido" };
  }

  if (avaliacao.pendentes.length > 0) {
    return { texto: "Pendente", classe: "bg-blue-50 text-blue-700 ring-1 ring-blue-200", detalhe: "Faltam treinamentos obrigatórios da função" };
  }

  if (avaliacao.vencendo.length > 0) {
    return { texto: "Atenção", classe: "bg-orange-500 text-white", detalhe: "Possui treinamento obrigatório a vencer em até 30 dias" };
  }

  return { texto: "Apto", classe: "bg-emerald-600 text-white", detalhe: "Treinamentos obrigatórios válidos" };
}

function Card({ children, className = "" }) {
  return (
    <div className={classNames("rounded-3xl border border-slate-200 bg-white p-5 shadow-sm", className)}>
      {children}
    </div>
  );
}

function Header({ titulo, subtitulo, acao }) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-950">{titulo}</h1>
        <p className="mt-1 text-sm text-slate-500">{subtitulo}</p>
      </div>
      {acao}
    </div>
  );
}

function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("sst@empresa.com");
  const [senha, setSenha] = useState("");
  const [perfil, setPerfil] = useState("Técnico de Segurança");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  const fazerLogin = async () => {
    setErro("");

    if (!email || !senha) {
      setErro("Preencha o e-mail e a senha.");
      return;
    }

    setCarregando(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });

    setCarregando(false);

    if (error) {
      setErro("E-mail ou senha incorretos.");
      return;
    }

    onLogin({
      id: data.user.id,
      email: data.user.email,
      perfil,
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-[2rem] bg-white p-8 shadow-2xl"
      >
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-3xl bg-slate-950 p-4 text-white">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-950">Controle SST QR</h1>
            <p className="text-sm text-slate-500">Acesso restrito ao sistema</p>
          </div>
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-700">E-mail</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Digite seu e-mail"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
          />

          <label className="block text-sm font-medium text-slate-700">Senha</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") fazerLogin();
              }}
              placeholder="Digite sua senha"
              className="w-full rounded-2xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-slate-300"
            />
          </div>

          <label className="block text-sm font-medium text-slate-700">Perfil de acesso</label>
          <select
            value={perfil}
            onChange={(e) => setPerfil(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
          >
            <option>Administrador</option>
            <option>Técnico de Segurança</option>
            <option>Empresa Terceirizada</option>
            <option>Portaria / Fiscalização</option>
            <option>Auditor</option>
          </select>

          {erro && (
            <div className="rounded-2xl bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200">
              {erro}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={fazerLogin}
          disabled={carregando}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
        >
          <LogIn className="h-4 w-4" />
          {carregando ? "Entrando..." : "Entrar no sistema"}
        </button>

        <p className="mt-4 rounded-2xl bg-slate-50 p-3 text-xs text-slate-500">
          O acesso é validado pelo Supabase. Só entra quem tiver e-mail e senha cadastrados.
        </p>
      </motion.div>
    </div>
  );
}

function Dashboard({ colaboradores, onSelectColab }) {
  const indicadores = useMemo(() => {
    const avaliacoes = colaboradores.map((colaborador) => {
      const avaliacao = avaliarTreinamentosColaborador(colaborador);

      return avaliacao.itens.map((item) => ({
        ...item,
        colaborador,
        vencimento: item.realizado?.vencimento || null,
      }));
    });

    const itens = avaliacoes.flat();
    const vencidos = itens.filter((item) => item.status.chave === "vencido").length;
    const vencendo = itens.filter((item) => item.status.chave === "vencendo").length;
    const pendentes = itens.filter((item) => item.status.chave === "pendente").length;
    const emDia = itens.filter((item) => item.status.chave === "emdia").length;
    const empresas = new Set(colaboradores.map((c) => c.empresa).filter(Boolean)).size;

    return { itens, vencidos, vencendo, pendentes, emDia, empresas };
  }, [colaboradores]);

  const totalItens = indicadores.itens.length;

  const cards = [
    { label: "Colaboradores", valor: colaboradores.length, icon: Users, detalhe: "Cadastrados no sistema" },
    { label: "Empresas", valor: indicadores.empresas, icon: Building2, detalhe: "Empresas vinculadas" },
    { label: "Pendentes", valor: indicadores.pendentes, icon: AlertTriangle, detalhe: "Sem certificado enviado" },
    { label: "A vencer", valor: indicadores.vencendo, icon: CalendarClock, detalhe: "Próximos 30 dias" },
    { label: "Vencidos", valor: indicadores.vencidos, icon: XCircle, detalhe: "Bloqueiam atividade" },
  ];

  const pendencias = indicadores.itens
    .filter((item) => ["pendente", "vencido", "vencendo"].includes(item.status.chave))
    .sort((a, b) => {
      const ordem = { vencido: 1, vencendo: 2, pendente: 3 };
      const ordemStatus = ordem[a.status.chave] - ordem[b.status.chave];

      if (ordemStatus !== 0) return ordemStatus;

      if (!a.vencimento && !b.vencimento) return a.colaborador.nome.localeCompare(b.colaborador.nome);
      if (!a.vencimento) return 1;
      if (!b.vencimento) return -1;

      return diasParaVencer(a.vencimento) - diasParaVencer(b.vencimento);
    });

  const baixarRelatorioDashboard = () => {
    const linhas = [
      ["Colaborador", "Empresa", "Função", "Situação na obra", "Treinamento/Documento", "Status", "Vencimento", "Base"],
    ];

    indicadores.itens.forEach((item) => {
      linhas.push([
        item.colaborador.nome,
        item.colaborador.empresaExibicao || item.colaborador.empresa,
        item.colaborador.funcao,
        item.colaborador.statusMobilizacao || "Mobilizado",
        item.treinamento.nome,
        item.status.texto,
        item.vencimento ? formatDate(item.vencimento) : "Sem certificado enviado",
        item.treinamento.base || "",
      ]);
    });

    baixarPDF("relatorio-dashboard-sst.pdf", "Relatorio Dashboard SST", linhas);
  };

  const resumoConformidade = [
    { label: "Em dia", valor: indicadores.emDia, total: totalItens, classe: "bg-emerald-500" },
    { label: "Pendentes", valor: indicadores.pendentes, total: totalItens, classe: "bg-blue-500" },
    { label: "A vencer", valor: indicadores.vencendo, total: totalItens, classe: "bg-orange-500" },
    { label: "Vencidos", valor: indicadores.vencidos, total: totalItens, classe: "bg-red-500" },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Header
        titulo="Dashboard SST"
        subtitulo="Visão geral dos treinamentos obrigatórios, pendências, vencimentos e liberações por QR Code."
        acao={
          <button
            onClick={baixarRelatorioDashboard}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
          >
            <Download className="h-4 w-4" />
            Exportar relatório
          </button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {cards.map((item) => {
          const Icon = item.icon;

          return (
            <Card key={item.label} className="overflow-hidden">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">{item.label}</p>
                  <p className="mt-2 text-3xl font-bold text-slate-950">{item.valor}</p>
                  <p className="mt-1 text-xs text-slate-400">{item.detalhe}</p>
                </div>
                <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-950">Pendências críticas</h2>
              <p className="text-sm text-slate-500">
                Treinamentos pendentes, vencidos ou a vencer em até 30 dias.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              {pendencias.length} itens
            </span>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Colaborador</th>
                  <th className="px-4 py-3">Treinamento</th>
                  <th className="px-4 py-3">Vencimento</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {pendencias.length === 0 && (
                  <tr>
                    <td className="px-4 py-8 text-center text-sm text-slate-500" colSpan={5}>
                      Nenhuma pendência crítica encontrada.
                    </td>
                  </tr>
                )}

                {pendencias.map((item, idx) => (
                  <tr key={`${item.colaborador.id}-${item.treinamento.id}-${idx}`} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{item.colaborador.nome}</div>
                      <div className="text-xs text-slate-500">
                        {item.colaborador.empresaExibicao || item.colaborador.empresa} · {item.colaborador.statusMobilizacao || "Mobilizado"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{item.treinamento.nome}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {item.vencimento ? formatDate(item.vencimento) : "Não enviado"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={classNames("rounded-full px-2 py-1 text-xs font-semibold ring-1", item.status.classe)}>
                        {item.status.texto}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => onSelectColab(item.colaborador)}
                        className="rounded-xl bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                      >
                        QR
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-bold text-slate-950">Resumo de conformidade</h2>
          <p className="mt-1 text-sm text-slate-500">
            Baseado nos treinamentos exigidos para a função, incluindo os ainda não enviados.
          </p>

          <div className="mt-6 space-y-5">
            {resumoConformidade.map((i) => (
              <div key={i.label}>
                <div className="mb-2 flex justify-between text-sm">
                  <span className="font-medium text-slate-700">{i.label}</span>
                  <span className="text-slate-500">{i.valor}/{i.total}</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={classNames("h-full rounded-full", i.classe)}
                    style={{ width: `${i.total ? Math.max(4, (i.valor / i.total) * 100) : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
            <strong className="text-slate-900">Regra do sistema:</strong> pendente indica ausência de certificado; vencido bloqueia a atividade; a vencer em até 30 dias gera alerta preventivo; em dia libera a consulta no QR Code.
          </div>
        </Card>
      </div>
    </motion.div>
  );
}


function Colaboradores({
  colaboradores,
  empresasBanco,
  carregandoBanco,
  erroBanco,
  onAtualizarBanco,
  onAdicionarColaborador,
  onAtualizarColaborador,
  onExcluirColaborador,
  onSelectColab,
  onEnviarTreinamento,
}) {
  const [busca, setBusca] = useState("");
  const [empresa, setEmpresa] = useState("Todas");
  const [salvando, setSalvando] = useState(false);
  const [colaboradorEdicao, setColaboradorEdicao] = useState(null);
  const [salvandoEdicaoColaborador, setSalvandoEdicaoColaborador] = useState(false);
  const [pendenciasAbertas, setPendenciasAbertas] = useState(null);
  const [modalFuncaoAberto, setModalFuncaoAberto] = useState(false);
  const [versaoFuncoes, setVersaoFuncoes] = useState(0);
  const [novaFuncao, setNovaFuncao] = useState({
    rotulo: "",
    termos: "",
    treinamentos: [...treinamentosBaseObra, 13],
  });
  const [novo, setNovo] = useState({
    nome: "",
    empresaNome: "",
    funcao: "",
    matricula: "",
    statusMobilizacao: "Mobilizado",
    treinamentosRemovidos: [],
    treinamentosAdicionais: [],
    foto: null,
  });

  const empresasFiltro = ["Todas", ...Array.from(new Set(colaboradores.map((c) => c.empresa).filter(Boolean)))];

  const filtrados = colaboradores.filter((c) => {
    const avaliacao = avaliarTreinamentosColaborador(c);
    const texto = `${c.nome} ${c.empresa} ${c.empresaExibicao} ${c.empresaPaiNome} ${c.funcao} ${c.matricula} ${c.codigoFuncionario} ${c.statusMobilizacao} ${avaliacao.matriz.rotulo}`.toLowerCase();
    return texto.includes(busca.toLowerCase()) && (empresa === "Todas" || c.empresa === empresa);
  });

  const resumoTreinamentos = useMemo(() => {
    const avaliacoes = colaboradores.map(avaliarTreinamentosColaborador);

    return {
      pendentes: avaliacoes.reduce((total, item) => total + item.pendentes.length, 0),
      vencidos: avaliacoes.reduce((total, item) => total + item.vencidos.length, 0),
      vencendo: avaliacoes.reduce((total, item) => total + item.vencendo.length, 0),
      regulares: colaboradores.filter((c) => statusGeral(c).texto === "Apto").length,
    };
  }, [colaboradores]);

  const baixarRelatorioColaboradores = () => {
    const linhas = [
      [
        "Colaborador",
        "Código",
        "Empresa",
        "Função",
        "Matrícula",
        "Situação na obra",
        "Matriz aplicada",
        "Status geral",
        "Treinamentos obrigatórios",
        "Treinamentos adicionados",
        "Treinamentos removidos",
        "Treinamentos válidos",
        "Pendentes",
        "Vencidos",
        "A vencer",
      ],
    ];

    filtrados.forEach((c) => {
      const avaliacao = avaliarTreinamentosColaborador(c);
      const geral = statusGeral(c);

      linhas.push([
        c.nome,
        c.codigoFuncionario,
        c.empresaExibicao || c.empresa,
        c.funcao,
        c.matricula,
        c.statusMobilizacao,
        avaliacao.matriz.rotulo,
        geral.texto,
        avaliacao.itens.map((item) => item.treinamento.nome).join(" | "),
        (c.treinamentosAdicionais || []).map((id) => obterTreinamento(id)?.nome).filter(Boolean).join(" | "),
        (c.treinamentosRemovidos || []).map((id) => obterTreinamento(id)?.nome).filter(Boolean).join(" | "),
        avaliacao.emDia.map((item) => item.treinamento.nome).join(" | "),
        avaliacao.pendentes.map((item) => item.treinamento.nome).join(" | "),
        avaliacao.vencidos.map((item) => item.treinamento.nome).join(" | "),
        avaliacao.vencendo.map((item) => `${item.treinamento.nome} - vence ${formatDate(item.realizado?.vencimento)}`).join(" | "),
      ]);
    });

    baixarPDF("relatorio-colaboradores-treinamentos.pdf", "Relatorio de colaboradores e treinamentos", linhas);
  };

  const baixarRelatorioPendencias = () => {
    const linhas = [
      ["Colaborador", "Código", "Empresa", "Função", "Situação na obra", "Treinamento", "Situação", "Vencimento", "Base"],
    ];

    filtrados.forEach((c) => {
      const avaliacao = avaliarTreinamentosColaborador(c);

      avaliacao.itens
        .filter((item) => ["pendente", "vencido", "vencendo"].includes(item.status.chave))
        .forEach((item) => {
          linhas.push([
            c.nome,
            c.codigoFuncionario,
            c.empresa,
            c.funcao,
            c.statusMobilizacao,
            item.treinamento.nome,
            item.status.texto,
            item.realizado?.vencimento ? formatDate(item.realizado.vencimento) : "Sem certificado lançado",
            item.treinamento.base || "",
          ]);
        });
    });

    baixarPDF("relatorio-pendencias-treinamentos.pdf", "Relatorio de pendencias de treinamentos", linhas);
  };

  const adicionar = async () => {
    if (!novo.nome.trim() || !novo.empresaNome.trim() || !novo.funcao.trim()) {
      alert("Preencha nome, empresa terceirizada e função.");
      return;
    }

    setSalvando(true);

    const ok = await onAdicionarColaborador({
      nome: novo.nome.trim(),
      empresaNome: novo.empresaNome.trim(),
      funcao: novo.funcao.trim(),
      matricula: novo.matricula.trim(),
      statusMobilizacao: novo.statusMobilizacao,
      treinamentosRemovidos: novo.treinamentosRemovidos || [],
      treinamentosAdicionais: novo.treinamentosAdicionais || [],
      foto: novo.foto,
      codigoFuncionario: gerarCodigoFuncionario(novo.nome),
    });

    setSalvando(false);

    if (ok) {
      setNovo({
        nome: "",
        empresaNome: "",
        funcao: "",
        matricula: "",
        statusMobilizacao: "Mobilizado",
        treinamentosRemovidos: [],
        treinamentosAdicionais: [],
        foto: null,
      });
    }
  };

  const funcoesSugeridas = obterTodasMatrizesFuncao().filter((item) => item.chave !== "geral");
  void versaoFuncoes;

  const idsBaseNovo = novo.funcao
    ? treinamentosObrigatoriosFuncao(novo.funcao).map((treinamento) => Number(treinamento.id))
    : [];
  const idsRemovidosNovo = (novo.treinamentosRemovidos || []).map(Number);
  const idsAdicionaisNovo = (novo.treinamentosAdicionais || []).map(Number);
  const idsAplicadosNovo = Array.from(new Set([...idsBaseNovo, ...idsAdicionaisNovo])).filter(
    (id) => !idsRemovidosNovo.includes(Number(id))
  );
  const treinamentosAplicadosNovo = idsAplicadosNovo.map((id) => obterTreinamento(id)).filter(Boolean);
  const treinamentosParaAdicionarNovo = treinamentosBase.filter(
    (treinamento) => !idsAplicadosNovo.includes(Number(treinamento.id))
  );

  const removerTreinamentoNovo = (treinamentoId) => {
    const id = Number(treinamentoId);
    const baseDaFuncao = idsBaseNovo.includes(id);

    if (baseDaFuncao) {
      setNovo({
        ...novo,
        treinamentosRemovidos: Array.from(new Set([...idsRemovidosNovo, id])),
      });
      return;
    }

    setNovo({
      ...novo,
      treinamentosAdicionais: idsAdicionaisNovo.filter((item) => item !== id),
    });
  };

  const adicionarTreinamentoNovo = (treinamentoId) => {
    const id = Number(treinamentoId);
    if (!id) return;

    if (idsBaseNovo.includes(id)) {
      setNovo({
        ...novo,
        treinamentosRemovidos: idsRemovidosNovo.filter((item) => item !== id),
      });
      return;
    }

    setNovo({
      ...novo,
      treinamentosAdicionais: Array.from(new Set([...idsAdicionaisNovo, id])),
    });
  };

  const idsBaseEdicao = colaboradorEdicao?.funcao
    ? treinamentosObrigatoriosFuncao(colaboradorEdicao.funcao).map((treinamento) => Number(treinamento.id))
    : [];
  const idsRemovidosEdicao = (colaboradorEdicao?.treinamentosRemovidos || []).map(Number);
  const idsAdicionaisEdicao = (colaboradorEdicao?.treinamentosAdicionais || []).map(Number);
  const idsAplicadosEdicao = Array.from(new Set([...idsBaseEdicao, ...idsAdicionaisEdicao])).filter(
    (id) => !idsRemovidosEdicao.includes(Number(id))
  );
  const treinamentosAplicadosEdicao = idsAplicadosEdicao.map((id) => obterTreinamento(id)).filter(Boolean);
  const treinamentosParaAdicionarEdicao = treinamentosBase.filter(
    (treinamento) => !idsAplicadosEdicao.includes(Number(treinamento.id))
  );

  const removerTreinamentoEdicao = (treinamentoId) => {
    if (!colaboradorEdicao) return;

    const id = Number(treinamentoId);
    const baseDaFuncao = idsBaseEdicao.includes(id);

    if (baseDaFuncao) {
      setColaboradorEdicao({
        ...colaboradorEdicao,
        treinamentosRemovidos: Array.from(new Set([...idsRemovidosEdicao, id])),
      });
      return;
    }

    setColaboradorEdicao({
      ...colaboradorEdicao,
      treinamentosAdicionais: idsAdicionaisEdicao.filter((item) => item !== id),
    });
  };

  const adicionarTreinamentoEdicao = (treinamentoId) => {
    if (!colaboradorEdicao) return;

    const id = Number(treinamentoId);
    if (!id) return;

    if (idsBaseEdicao.includes(id)) {
      setColaboradorEdicao({
        ...colaboradorEdicao,
        treinamentosRemovidos: idsRemovidosEdicao.filter((item) => item !== id),
      });
      return;
    }

    setColaboradorEdicao({
      ...colaboradorEdicao,
      treinamentosAdicionais: Array.from(new Set([...idsAdicionaisEdicao, id])),
    });
  };

  const salvarNovaFuncao = () => {
    if (!novaFuncao.rotulo.trim()) {
      alert("Informe o nome da função.");
      return;
    }

    if (!novaFuncao.treinamentos.length) {
      alert("Selecione pelo menos um treinamento/documento obrigatório.");
      return;
    }

    const listaAtual = obterFuncoesPersonalizadasSalvas();
    const chave = `custom-${normalizarTextoBusca(novaFuncao.rotulo).replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`;
    const termos = novaFuncao.termos
      .split(",")
      .map((termo) => termo.trim())
      .filter(Boolean);

    const nova = {
      chave,
      rotulo: novaFuncao.rotulo.trim().toUpperCase(),
      termos: Array.from(new Set([novaFuncao.rotulo.trim(), ...termos])),
      treinamentos: novaFuncao.treinamentos.map(Number),
    };

    salvarFuncoesPersonalizadas([...listaAtual, nova]);
    setVersaoFuncoes((valor) => valor + 1);
    setNovaFuncao({ rotulo: "", termos: "", treinamentos: [...treinamentosBaseObra, 13] });
    setModalFuncaoAberto(false);
  };

  const abrirRevisaoColaborador = (colaborador) => {
    setColaboradorEdicao({
      id: colaborador.id,
      nome: colaborador.nome || "",
      empresaNome: colaborador.empresa || "",
      funcao: colaborador.funcao || "",
      matricula: colaborador.matricula === "-" ? "" : colaborador.matricula || "",
      codigoFuncionario: colaborador.codigoFuncionario || "",
      status: colaborador.status || "Ativo",
      statusMobilizacao: colaborador.statusMobilizacao || "Mobilizado",
      treinamentosRemovidos: colaborador.treinamentosRemovidos || [],
      treinamentosAdicionais: colaborador.treinamentosAdicionais || [],
      fotoAtual: colaborador.fotoUrl || "",
      fotoNomeAtual: colaborador.fotoNome || "",
      foto: null,
    });
  };

  const salvarRevisaoColaborador = async () => {
    if (!colaboradorEdicao?.nome?.trim() || !colaboradorEdicao?.empresaNome?.trim() || !colaboradorEdicao?.funcao?.trim()) {
      alert("Preencha nome, empresa e função.");
      return;
    }

    setSalvandoEdicaoColaborador(true);

    const ok = await onAtualizarColaborador({
      id: colaboradorEdicao.id,
      nome: colaboradorEdicao.nome.trim(),
      empresaNome: colaboradorEdicao.empresaNome.trim(),
      funcao: colaboradorEdicao.funcao.trim(),
      matricula: colaboradorEdicao.matricula.trim(),
      status: colaboradorEdicao.status || "Ativo",
      statusMobilizacao: colaboradorEdicao.statusMobilizacao || "Mobilizado",
      treinamentosRemovidos: colaboradorEdicao.treinamentosRemovidos || [],
      treinamentosAdicionais: colaboradorEdicao.treinamentosAdicionais || [],
      codigoFuncionario: colaboradorEdicao.codigoFuncionarioOriginal || colaboradorEdicao.codigoFuncionario,
      foto: colaboradorEdicao.foto,
      fotoAtual: colaboradorEdicao.fotoAtual,
      fotoNomeAtual: colaboradorEdicao.fotoNomeAtual,
    });

    setSalvandoEdicaoColaborador(false);

    if (ok) {
      setColaboradorEdicao(null);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Header
        titulo="Colaboradores"
        subtitulo="Cadastro com foto, código automático, matriz de treinamentos por função e alerta de vencimentos."
        acao={
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setModalFuncaoAberto(true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              Nova função
            </button>

            <button
              onClick={onAtualizarBanco}
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
            >
              <RefreshCw className={classNames("h-4 w-4", carregandoBanco && "animate-spin")} />
              Atualizar banco
            </button>
          </div>
        }
      />

      {erroBanco && (
        <div className="mb-5 rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-700 ring-1 ring-red-200">
          {erroBanco}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
        <Card className="overflow-hidden">
          <div className="-m-5 mb-5 bg-gradient-to-br from-slate-950 to-slate-800 p-5 text-white">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-white/10 p-3">
                <UserPlus className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Novo colaborador</h2>
                <p className="text-sm text-slate-300">Foto, código automático e matriz de treinamentos por função.</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                Nome completo
              </label>
              <input
                value={novo.nome}
                onChange={(e) => setNovo({ ...novo, nome: e.target.value })}
                placeholder="Ex.: João da Silva"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                Empresa terceirizada
              </label>
              <input
                value={novo.empresaNome}
                onChange={(e) => setNovo({ ...novo, empresaNome: e.target.value })}
                placeholder="Ex.: ABC Montagens"
                list="empresas-cadastradas"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
              />
              <datalist id="empresas-cadastradas">
                {empresasBanco.map((e) => (
                  <option key={e.id} value={e.nome} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                Situação na obra
              </label>
              <select
                value={novo.statusMobilizacao}
                onChange={(e) => setNovo({ ...novo, statusMobilizacao: e.target.value })}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
              >
                <option>Mobilizado</option>
                <option>Desmobilizado</option>
              </select>
              <p className="mt-1 text-xs text-slate-400">
                Mobilizado = ativo na obra. Desmobilizado = fora da obra.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                Função
              </label>
              <input
                value={novo.funcao}
                onChange={(e) =>
                  setNovo({
                    ...novo,
                    funcao: e.target.value,
                    treinamentosRemovidos: [],
                    treinamentosAdicionais: [],
                  })
                }
                placeholder="Ex.: Pedreiro, Soldador, Eletricista, Operador de PEMT"
                list="funcoes-sugeridas"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
              />
              <datalist id="funcoes-sugeridas">
                {funcoesSugeridas.map((item) => (
                  <option key={item.chave} value={item.rotulo} />
                ))}
              </datalist>

              {novo.funcao && (
                <div className="mt-2 rounded-2xl bg-slate-50 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Matriz aplicada: {obterMatrizFuncao(novo.funcao).rotulo}
                    </p>
                    <span className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-500 ring-1 ring-slate-200">
                      {treinamentosAplicadosNovo.length} exigência(s)
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {treinamentosAplicadosNovo.map((treinamento) => {
                      const extra = idsAdicionaisNovo.includes(Number(treinamento.id));

                      return (
                        <span
                          key={treinamento.id}
                          className={classNames(
                            "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium ring-1",
                            extra
                              ? "bg-blue-50 text-blue-700 ring-blue-200"
                              : "bg-white text-slate-600 ring-slate-200"
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => removerTreinamentoNovo(treinamento.id)}
                            title="Retirar este treinamento deste colaborador"
                            className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-50 text-[10px] font-bold text-red-700 ring-1 ring-red-200 hover:bg-red-100"
                          >
                            ×
                          </button>
                          {treinamento.nome}
                        </span>
                      );
                    })}

                    {treinamentosAplicadosNovo.length === 0 && (
                      <span className="rounded-full bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-700 ring-1 ring-red-200">
                        Nenhum treinamento selecionado
                      </span>
                    )}
                  </div>

                  <div className="mt-3">
                    <select
                      value=""
                      onChange={(e) => {
                        adicionarTreinamentoNovo(e.target.value);
                        e.target.value = "";
                      }}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                    >
                      <option value="">+ Adicionar treinamento/documento para este colaborador</option>
                      {treinamentosParaAdicionarNovo.map((treinamento) => (
                        <option key={treinamento.id} value={treinamento.id}>
                          {treinamento.nome}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-[11px] text-slate-400">
                      Use o × para retirar itens que não se aplicam e o campo acima para adicionar exigências específicas.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                Matrícula da empresa (opcional)
              </label>
              <input
                value={novo.matricula}
                onChange={(e) => setNovo({ ...novo, matricula: e.target.value })}
                placeholder="Ex.: matrícula da empresa, crachá ou RE"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
              />
              <p className="mt-1 text-xs text-slate-400">
                O código do sistema é gerado automaticamente. A matrícula é opcional e serve para código da empresa, crachá ou RE.
              </p>
            </div>

            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-600 hover:bg-slate-100">
              <Upload className="h-4 w-4" />
              {novo.foto ? novo.foto.name : "Adicionar foto do colaborador"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => setNovo({ ...novo, foto: e.target.files?.[0] || null })}
              />
            </label>

            <button
              onClick={adicionar}
              disabled={salvando}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              {salvando ? "Salvando no banco..." : "Cadastrar colaborador"}
            </button>
          </div>
        </Card>

        <Card>
          <div className="mb-4 flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por nome, empresa, função, matrícula ou código"
                className="w-full rounded-2xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
              />
            </div>

            <div className="relative min-w-56">
              <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select
                value={empresa}
                onChange={(e) => setEmpresa(e.target.value)}
                className="w-full appearance-none rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
              >
                {empresasFiltro.map((e) => (
                  <option key={e}>{e}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-4 grid gap-3 md:grid-cols-5">
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="text-xs font-medium text-slate-500">Total</p>
              <p className="text-2xl font-bold text-slate-950">{colaboradores.length}</p>
            </div>
            <div className="rounded-2xl bg-emerald-50 p-3">
              <p className="text-xs font-medium text-emerald-700">Regulares</p>
              <p className="text-2xl font-bold text-emerald-700">{resumoTreinamentos.regulares}</p>
            </div>
            <div className="rounded-2xl bg-blue-50 p-3">
              <p className="text-xs font-medium text-blue-700">Pendentes</p>
              <p className="text-2xl font-bold text-blue-700">{resumoTreinamentos.pendentes}</p>
            </div>
            <div className="rounded-2xl bg-orange-50 p-3">
              <p className="text-xs font-medium text-orange-700">A vencer 30d</p>
              <p className="text-2xl font-bold text-orange-700">{resumoTreinamentos.vencendo}</p>
            </div>
            <div className="rounded-2xl bg-red-50 p-3">
              <p className="text-xs font-medium text-red-700">Vencidos</p>
              <p className="text-2xl font-bold text-red-700">{resumoTreinamentos.vencidos}</p>
            </div>
          </div>

          <div className="mb-4 flex flex-wrap justify-center gap-2 border-b border-slate-200 pb-4">
            <button
              onClick={baixarRelatorioColaboradores}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800"
            >
              <Download className="h-4 w-4" />
              Baixar PDF colaboradores
            </button>
            <button
              onClick={baixarRelatorioPendencias}
              className="inline-flex items-center gap-2 rounded-2xl bg-orange-50 px-4 py-2.5 text-xs font-semibold text-orange-700 ring-1 ring-orange-200 hover:bg-orange-100"
            >
              <AlertTriangle className="h-4 w-4" />
              Baixar PDF pendências
            </button>
          </div>

          {carregandoBanco && (
            <div className="rounded-3xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
              Carregando colaboradores do Supabase...
            </div>
          )}

          {!carregandoBanco && filtrados.length === 0 && (
            <div className="rounded-3xl border border-dashed border-slate-300 p-8 text-center">
              <Users className="mx-auto h-10 w-10 text-slate-300" />
              <h3 className="mt-3 font-bold text-slate-900">Nenhum colaborador encontrado</h3>
              <p className="mt-1 text-sm text-slate-500">
                Cadastre o primeiro colaborador no formulário ao lado.
              </p>
            </div>
          )}

          <div className="grid gap-4">
            {!carregandoBanco &&
              filtrados.map((c) => {
                const geral = statusGeral(c);
                const avaliacao = avaliarTreinamentosColaborador(c);
                const foto = obterUrlFotoColaborador(c.fotoUrl);

                return (
                  <div
                    key={c.id}
                    className="group rounded-3xl border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:shadow-md"
                  >
                    <div className="grid gap-4 lg:grid-cols-[1fr_170px] lg:items-stretch">
                      <div className="min-w-0 flex h-full flex-col">
                        <div className="flex items-start gap-4 lg:pt-1">
                          <button
                            onClick={() => onSelectColab(c)}
                            className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-100 text-slate-700 transition group-hover:bg-slate-950 group-hover:text-white"
                          >
                            {foto ? (
                              <img src={foto} alt={`Foto ${c.nome}`} className="h-full w-full object-cover" />
                            ) : (
                              <UserRound className="h-8 w-8" />
                            )}
                          </button>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-start gap-2">
                              <h3 className="max-w-full break-words text-lg font-bold leading-snug text-slate-950">
                                {c.nome}
                              </h3>

                              <span className={classNames(
                                "inline-flex shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1",
                                c.statusMobilizacao === "Mobilizado"
                                  ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                                  : "bg-red-50 text-red-700 ring-red-200"
                              )}>
                                {c.statusMobilizacao}
                              </span>
                            </div>

                            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                              <span>{c.funcao}</span>
                              <span className="text-slate-300">•</span>
                              <span className="text-xs font-semibold text-slate-500">
                                Código: {c.codigoFuncionario}
                              </span>
                            </div>

                            <p className="mt-1 break-words text-xs text-slate-500">
                              <strong>Empresa:</strong> {c.empresaExibicao || c.empresa}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setPendenciasAbertas(pendenciasAbertas === c.id ? null : c.id)}
                          className="mt-4 flex flex-1 flex-col justify-between rounded-2xl bg-slate-50 p-3 text-left transition hover:bg-slate-100"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                                Treinamentos obrigatórios
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                Clique para visualizar pendências.
                              </p>
                            </div>

                            <div className="min-w-[220px] flex-1">
                              <div className="mb-2 flex flex-wrap justify-end gap-2 text-xs font-semibold">
                                <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700 ring-1 ring-emerald-200">
                                  Em dia: {avaliacao.emDia.length}
                                </span>
                                <span className="rounded-full bg-blue-50 px-2 py-1 text-blue-700 ring-1 ring-blue-200">
                                  Pendentes: {avaliacao.pendentes.length}
                                </span>
                              </div>

                              <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                                <div
                                  className="h-full rounded-full bg-emerald-500 transition-all"
                                  style={{
                                    width: `${avaliacao.total ? Math.round((avaliacao.emDia.length / avaliacao.total) * 100) : 0}%`,
                                  }}
                                />
                              </div>

                              <p className="mt-1 text-right text-[11px] font-medium text-slate-500">
                                {avaliacao.emDia.length} de {avaliacao.total} treinamento(s) em dia
                              </p>
                            </div>
                          </div>
                        </button>

                        {pendenciasAbertas === c.id && (
                          <div className="mt-2 rounded-2xl border border-slate-200 bg-white p-3">
                            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                              Treinamentos e pendências
                            </p>

                            <div className="space-y-1.5">
                              {avaliacao.itens.map((item) => (
                                <div key={item.treinamento.id} className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-2 py-1.5 text-xs">
                                  <span className="min-w-0 break-words text-slate-600">{item.treinamento.nome}</span>
                                  <span className={classNames("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1", item.status.classe)}>
                                    {item.status.texto}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex h-full flex-col gap-2">
                        <div
                          title={geral.detalhe}
                          className={classNames("inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold", geral.classe)}
                        >
                          {geral.texto}
                        </div>

                        <button
                          onClick={() => onSelectColab(c)}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                        >
                          <QrCode className="h-3.5 w-3.5" />
                          Ver QR
                        </button>

                        <button
                          onClick={() => abrirRevisaoColaborador(c)}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          Revisar dados
                        </button>

                        <button
                          onClick={() => onEnviarTreinamento(c)}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 ring-1 ring-blue-200 hover:bg-blue-100"
                        >
                          <Upload className="h-3.5 w-3.5" />
                          Enviar treinamento
                        </button>

                        <button
                          onClick={() => onExcluirColaborador(c)}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-100"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Excluir
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </Card>
      </div>
      {modalFuncaoAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-slate-950/70 p-4">
          <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl">
            <div className="shrink-0 border-b border-slate-200 bg-white p-6 pb-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Cadastro de função</p>
                  <h2 className="mt-1 text-2xl font-bold text-slate-950">Nova função e treinamentos obrigatórios</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Crie uma função personalizada e selecione quais treinamentos/documentos serão exigidos.
                  </p>
                </div>
                <button
                  onClick={() => setModalFuncaoAberto(false)}
                  className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Fechar
                </button>
              </div>
            </div>

            <div className="scrollbar-discreta flex-1 overflow-y-auto px-6 py-5">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Nome da função</label>
                  <input
                    value={novaFuncao.rotulo}
                    onChange={(e) => setNovaFuncao({ ...novaFuncao, rotulo: e.target.value })}
                    placeholder="Ex.: Operador de rolo compactador"
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Palavras-chave</label>
                  <input
                    value={novaFuncao.termos}
                    onChange={(e) => setNovaFuncao({ ...novaFuncao, termos: e.target.value })}
                    placeholder="Ex.: rolo, compactador, operador"
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                  />
                  <p className="mt-1 text-xs text-slate-400">Separe por vírgula. O sistema usa isso para identificar a matriz.</p>
                </div>
              </div>

              <div className="mt-5">
                <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                  Treinamentos/documentos obrigatórios
                </p>

                <div className="grid gap-2 md:grid-cols-2">
                  {treinamentosBase.map((treinamento) => (
                    <label
                      key={treinamento.id}
                      className="flex cursor-pointer items-start gap-2 rounded-2xl border border-slate-200 bg-white p-3 text-sm hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        checked={novaFuncao.treinamentos.includes(treinamento.id)}
                        onChange={(e) => {
                          const atualizados = e.target.checked
                            ? [...novaFuncao.treinamentos, treinamento.id]
                            : novaFuncao.treinamentos.filter((id) => id !== treinamento.id);

                          setNovaFuncao({ ...novaFuncao, treinamentos: Array.from(new Set(atualizados)) });
                        }}
                        className="mt-1"
                      />
                      <span>
                        <strong className="block text-slate-800">{treinamento.nome}</strong>
                        <span className="text-xs text-slate-400">{treinamento.base}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="shrink-0 border-t border-slate-200 bg-white p-6">
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={salvarNovaFuncao}
                  className="flex-1 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Salvar função
                </button>

                <button
                  onClick={() => setModalFuncaoAberto(false)}
                  className="flex-1 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-200"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {colaboradorEdicao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-slate-950/70 p-4">
          <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl">
            <div className="shrink-0 border-b border-slate-200 bg-white p-6 pb-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Revisão de dados do colaborador</p>
                  <h2 className="mt-1 text-2xl font-bold text-slate-950">{colaboradorEdicao.nome}</h2>
                  <p className="mt-1 text-sm text-slate-500">Código do sistema: {colaboradorEdicao.codigoFuncionario}</p>
                </div>
                <button
                  onClick={() => setColaboradorEdicao(null)}
                  className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Fechar
                </button>
              </div>
            </div>

            <div className="scrollbar-discreta flex-1 overflow-y-auto px-6 py-5">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Nome completo</label>
                  <input
                    value={colaboradorEdicao.nome}
                    onChange={(e) => setColaboradorEdicao({ ...colaboradorEdicao, nome: e.target.value })}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Empresa</label>
                  <input
                    value={colaboradorEdicao.empresaNome}
                    onChange={(e) => setColaboradorEdicao({ ...colaboradorEdicao, empresaNome: e.target.value })}
                    list="empresas-cadastradas-edicao"
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                  />
                  <datalist id="empresas-cadastradas-edicao">
                    {empresasBanco.map((e) => (
                      <option key={e.id} value={e.nome} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Função</label>
                  <input
                    value={colaboradorEdicao.funcao}
                    onChange={(e) => setColaboradorEdicao({ ...colaboradorEdicao, funcao: e.target.value })}
                    list="funcoes-sugeridas-edicao"
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                  />
                  <datalist id="funcoes-sugeridas-edicao">
                    {funcoesSugeridas.map((item) => (
                      <option key={item.chave} value={item.rotulo} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Matrícula da empresa (opcional)</label>
                  <input
                    value={colaboradorEdicao.matricula}
                    onChange={(e) => setColaboradorEdicao({ ...colaboradorEdicao, matricula: e.target.value })}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Status</label>
                  <select
                    value={colaboradorEdicao.status}
                    onChange={(e) => setColaboradorEdicao({ ...colaboradorEdicao, status: e.target.value })}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                  >
                    <option>Ativo</option>
                    <option>Inativo</option>
                    <option>Bloqueado</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Situação na obra</label>
                  <select
                    value={colaboradorEdicao.statusMobilizacao}
                    onChange={(e) => setColaboradorEdicao({ ...colaboradorEdicao, statusMobilizacao: e.target.value })}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                  >
                    <option>Mobilizado</option>
                    <option>Desmobilizado</option>
                  </select>
                </div>

                <div className="md:col-span-2 rounded-2xl bg-slate-50 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Matriz aplicada: {obterMatrizFuncao(colaboradorEdicao.funcao).rotulo}
                    </p>
                    <span className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-500 ring-1 ring-slate-200">
                      {treinamentosAplicadosEdicao.length} exigência(s)
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {treinamentosAplicadosEdicao.map((treinamento) => {
                      const extra = idsAdicionaisEdicao.includes(Number(treinamento.id));

                      return (
                        <span
                          key={treinamento.id}
                          className={classNames(
                            "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium ring-1",
                            extra
                              ? "bg-blue-50 text-blue-700 ring-blue-200"
                              : "bg-white text-slate-600 ring-slate-200"
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => removerTreinamentoEdicao(treinamento.id)}
                            title="Retirar este treinamento deste colaborador"
                            className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-50 text-[10px] font-bold text-red-700 ring-1 ring-red-200 hover:bg-red-100"
                          >
                            ×
                          </button>
                          {treinamento.nome}
                        </span>
                      );
                    })}

                    {treinamentosAplicadosEdicao.length === 0 && (
                      <span className="rounded-full bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-700 ring-1 ring-red-200">
                        Nenhum treinamento selecionado
                      </span>
                    )}
                  </div>

                  <div className="mt-3">
                    <select
                      value=""
                      onChange={(e) => {
                        adicionarTreinamentoEdicao(e.target.value);
                        e.target.value = "";
                      }}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                    >
                      <option value="">+ Adicionar treinamento/documento para este colaborador</option>
                      {treinamentosParaAdicionarEdicao.map((treinamento) => (
                        <option key={treinamento.id} value={treinamento.id}>
                          {treinamento.nome}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-[11px] text-slate-400">
                      Use o × para retirar itens que não se aplicam e o campo acima para adicionar exigências específicas.
                    </p>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Foto do colaborador</label>
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-600 hover:bg-slate-100">
                    <Upload className="h-4 w-4" />
                    {colaboradorEdicao.foto ? colaboradorEdicao.foto.name : colaboradorEdicao.fotoNomeAtual || "Alterar foto do colaborador"}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(e) => setColaboradorEdicao({ ...colaboradorEdicao, foto: e.target.files?.[0] || null })}
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="shrink-0 border-t border-slate-200 bg-white p-6">
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={salvarRevisaoColaborador}
                  disabled={salvandoEdicaoColaborador}
                  className="flex-1 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {salvandoEdicaoColaborador ? "Salvando alterações..." : "Salvar alterações"}
                </button>
                <button
                  onClick={() => setColaboradorEdicao(null)}
                  className="flex-1 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-200"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}


function statusGeralConsultaPublica(treinamentos = []) {
  if (!treinamentos.length) {
    return {
      texto: "Pendente",
      classe: "bg-blue-600 text-white",
      detalhe: "Sem certificados lançados.",
    };
  }

  const vencidos = treinamentos.filter((item) => diasParaVencer(item.vencimento) < 0);
  const aVencer = treinamentos.filter((item) => {
    const dias = diasParaVencer(item.vencimento);
    return dias >= 0 && dias <= 30;
  });

  if (vencidos.length > 0) {
    return {
      texto: "Vencido",
      classe: "bg-red-600 text-white",
      detalhe: "Possui documento vencido.",
    };
  }

  if (aVencer.length > 0) {
    return {
      texto: "Atenção",
      classe: "bg-orange-500 text-white",
      detalhe: "Documento próximo do vencimento.",
    };
  }

  return {
    texto: "Em dia",
    classe: "bg-emerald-600 text-white",
    detalhe: "Documentos válidos.",
  };
}

function ConsultaQRPublica({ dados }) {
  if (!dados) return null;

  const colaborador = dados.colaborador || {};
  const treinamentos = dados.treinamentos || [];
  const geral = statusGeralConsultaPublica(treinamentos);

  return (
    <div className="min-h-screen bg-slate-100 p-4 text-slate-900">
      <div className="mx-auto max-w-5xl rounded-[2rem] bg-slate-950 p-3 shadow-2xl">
        <div className="rounded-[1.5rem] bg-white p-5 md:p-8">
          <div className="flex flex-col items-center text-center">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              <ShieldCheck className="h-3.5 w-3.5" />
              Verificação SST
            </div>

            <FotoColaborador
              src={colaborador.fotoUrl}
              nome={colaborador.nome}
              className="h-28 w-28 rounded-3xl"
              iconClassName="h-11 w-11"
            />

            <h2 className="mt-4 break-words text-2xl font-bold leading-tight text-slate-950">{colaborador.nome}</h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">{colaborador.funcao}</p>
            <p className="mt-1 text-sm text-slate-500">{colaborador.empresa}</p>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Código: {colaborador.codigoFuncionario}
            </p>
          </div>

          <div className="mt-5">
            <div className="w-full rounded-2xl bg-slate-950 px-5 py-4 text-center shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-300">Status geral do colaborador</p>
              <p className="mt-1 text-base font-bold text-white">{geral.texto}</p>
            </div>
          </div>

          {treinamentos.length === 0 && (
            <div className="mt-6 rounded-3xl border border-dashed border-slate-300 p-8 text-center">
              <ClipboardCheck className="mx-auto h-10 w-10 text-slate-300" />
              <h3 className="mt-3 font-bold text-slate-900">Sem certificados lançados</h3>
              <p className="mt-1 text-sm text-slate-500">
                Nenhum certificado público encontrado para este colaborador.
              </p>
            </div>
          )}

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {treinamentos.map((t) => {
              const st = statusDocumento(t.vencimento);
              const dias = diasParaVencer(t.vencimento);
              const dataInicio = new Date(`${t.realizado}T12:00:00`);
              const dataFim = new Date(`${t.vencimento}T12:00:00`);
              const totalValidade = Math.max(1, Math.ceil((dataFim - dataInicio) / DAY));
              const percentualRestante =
                dias < 0
                  ? 100
                  : Math.max(4, Math.min(100, Math.round((dias / totalValidade) * 100)));
              const alerta30Dias = dias >= 0 && dias <= 30;

              return (
                <div key={`${t.id || t.treinamentoId}-${t.vencimento}`} className="rounded-3xl border border-slate-200 p-4">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-slate-950">{t.nomeTreinamento || obterTreinamento(t.treinamentoId).nome}</h4>
                      <p className="mt-1 text-sm text-slate-500">{obterTreinamento(t.treinamentoId).categoria}</p>
                    </div>
                    <StatusPill status={st} small />
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-xs text-slate-400">Realizado</p>
                      <p className="font-semibold text-slate-700">{formatDate(t.realizado)}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-xs text-slate-400">Vencimento</p>
                      <p className="font-semibold text-slate-700">{formatDate(t.vencimento)}</p>
                    </div>
                  </div>

                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={classNames("h-full rounded-full transition-all", dias < 0 || alerta30Dias ? "bg-red-500" : st.barra)}
                      style={{ width: `${percentualRestante}%` }}
                    />
                  </div>

                  <p className={classNames("mt-3 text-xs font-medium", alerta30Dias || dias < 0 ? "text-red-700" : "text-slate-500")}>
                    {dias < 0
                      ? `Vencido há ${Math.abs(dias)} dia(s).`
                      : dias <= 5
                        ? `Atenção: faltam ${dias} dia(s) para vencer. Renovar com prioridade.`
                        : alerta30Dias
                          ? "Atenção: documento próximo da data de vencimento."
                          : `Faltam ${dias} dia(s) para vencer.`}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-6 rounded-3xl bg-slate-50 p-4 text-justify text-sm leading-relaxed text-slate-600">
            Consulta pública limitada. Dados sensíveis como CPF, endereço, ASO detalhado e documentos médicos não são exibidos.
          </div>
        </div>
      </div>
    </div>
  );
}

function Treinamentos({
  colaboradores,
  colaboradorInicialId,
  onSalvarCertificado,
  onVisualizarCertificado,
  onExcluirCertificado,
  onAtualizarDatasCertificado,
  onSincronizarStorage,
}) {
  const [colabId, setColabId] = useState(
    () =>
      (colaboradores.find((c) => String(c.id) === String(colaboradorInicialId)) || colaboradores[0])
        ?.codigoFuncionario || ""
  );
  const [treinamentoId, setTreinamentoId] = useState(treinamentosBase[0].id);
  const [dataRealizacao, setDataRealizacao] = useState(hoje.toISOString().slice(0, 10));
  const [arquivoSelecionado, setArquivoSelecionado] = useState(null);
  const [observacao, setObservacao] = useState("");
  const [salvandoCertificado, setSalvandoCertificado] = useState(false);
  const [arquivosLote, setArquivosLote] = useState([]);
  const [salvandoLote, setSalvandoLote] = useState(false);
  const [sincronizandoStorage, setSincronizandoStorage] = useState(false);
  const [resultadoLote, setResultadoLote] = useState("");
  const [datasRevisao, setDatasRevisao] = useState({});
  const [salvandoDatasId, setSalvandoDatasId] = useState("");

  const colabSelecionado =
    colaboradores.find((c) => String(c.codigoFuncionario) === String(colabId)) ||
    colaboradores.find((c) => String(c.id) === String(colaboradorInicialId)) ||
    colaboradores[0] ||
    null;

  const colabSelecionadoId = colabSelecionado?.id || "";
  const colabSelecionadoCodigo = colabSelecionado?.codigoFuncionario || "";
  const avaliacaoSelecionado = colabSelecionado ? avaliarTreinamentosColaborador(colabSelecionado) : null;
  const treinamentosDisponiveis = avaliacaoSelecionado?.itens?.length
    ? avaliacaoSelecionado.itens.map((item) => item.treinamento).filter(Boolean)
    : treinamentosBase;

  const treinamentoSelecionadoId = treinamentosDisponiveis.some((item) => Number(item.id) === Number(treinamentoId))
    ? Number(treinamentoId)
    : Number(treinamentosDisponiveis[0]?.id || treinamentoId);

  const vencimento = calcularVencimentoTreinamento(
    treinamentoSelecionadoId || treinamentosBase[0].id,
    dataRealizacao
  );

  const adicionarTreinamento = async () => {
    if (!colabSelecionadoId) {
      alert("Cadastre um colaborador primeiro.");
      return;
    }

    if (!arquivoSelecionado) {
      alert("Selecione o arquivo do certificado antes de salvar.");
      return;
    }

    setSalvandoCertificado(true);

    const ok = await onSalvarCertificado({
      colaboradorCodigo: String(colabSelecionado?.codigoFuncionario || ""),
      colaborador: colabSelecionado,
      treinamentoId: Number(treinamentoSelecionadoId),
      dataRealizacao,
      dataVencimento: vencimento,
      arquivo: arquivoSelecionado,
      arquivoNome: arquivoSelecionado.name,
      observacao: observacao.trim(),
    });

    setSalvandoCertificado(false);

    if (ok) {
      setArquivoSelecionado(null);
      setObservacao("");
    }
  };

  const identificarColaboradorPorArquivo = (arquivo) => {
    const nomeArquivoOriginal = arquivo?.name || "";
    const nomeArquivo = normalizarTextoBusca(nomeArquivoOriginal.replace(/\.[^.]+$/, ""));
    const nomeArquivoCompacto = nomeArquivo.replace(/[^a-z0-9]/g, "");

    let melhor = null;
    let melhorPontuacao = 0;

    colaboradores.forEach((colaborador) => {
      const codigo = normalizarTextoBusca(colaborador.codigoFuncionario || "").replace(/[^a-z0-9]/g, "");
      const nome = normalizarTextoBusca(colaborador.nome || "").replace(/[^a-z0-9\s]/g, " ");
      const nomeCompacto = nome.replace(/\s+/g, "");
      const palavrasNome = nome.split(/\s+/).filter((parte) => parte.length >= 3);

      let pontos = 0;

      if (codigo && nomeArquivoCompacto.includes(codigo)) pontos += 120;
      if (nomeCompacto && nomeArquivoCompacto.includes(nomeCompacto)) pontos += 90;

      const acertosNome = palavrasNome.filter((parte) => nomeArquivo.includes(parte)).length;
      pontos += acertosNome * 15;

      if (palavrasNome.length > 0 && acertosNome >= Math.min(2, palavrasNome.length)) {
        pontos += 25;
      }

      if (pontos > melhorPontuacao) {
        melhorPontuacao = pontos;
        melhor = colaborador;
      }
    });

    return melhorPontuacao >= 25 ? melhor : null;
  };

  const prepararArquivosLote = (listaArquivos) => {
    const arquivos = Array.from(listaArquivos || []);

    const preparados = arquivos.map((arquivo, index) => {
      const colaboradorSugerido = identificarColaboradorPorArquivo(arquivo);

      return {
        id: `${Date.now()}-${index}-${arquivo.name}`,
        arquivo,
        colaboradorCodigo: colaboradorSugerido?.codigoFuncionario || "",
        status: colaboradorSugerido ? "Identificado" : "Conferir manualmente",
      };
    });

    setArquivosLote(preparados);
    setResultadoLote("");
  };

  const alterarColaboradorArquivoLote = (arquivoId, colaboradorCodigo) => {
    setArquivosLote((atual) =>
      atual.map((item) =>
        item.id === arquivoId
          ? { ...item, colaboradorCodigo, status: colaboradorCodigo ? "Conferido" : "Conferir manualmente" }
          : item
      )
    );
  };

  const removerArquivoLote = (arquivoId) => {
    setArquivosLote((atual) => atual.filter((item) => item.id !== arquivoId));
  };

  const sincronizarArquivosDoStorage = async () => {
    if (!onSincronizarStorage) return;

    setSincronizandoStorage(true);
    setResultadoLote("");

    const resultado = await onSincronizarStorage();

    setResultadoLote(resultado || "Sincronização concluída.");
    setSincronizandoStorage(false);
  };

  const salvarCertificadosEmLote = async () => {
    if (!arquivosLote.length) {
      alert("Selecione os arquivos do lote.");
      return;
    }

    const semColaborador = arquivosLote.filter((item) => !item.colaboradorCodigo);

    if (semColaborador.length > 0) {
      alert("Antes de salvar, selecione o colaborador para todos os arquivos do lote.");
      return;
    }

    if (!treinamentoSelecionadoId) {
      alert("Selecione o treinamento/documento do lote.");
      return;
    }

    if (!dataRealizacao || !vencimento) {
      alert("Informe a data de realização e a validade do lote.");
      return;
    }

    setSalvandoLote(true);
    setResultadoLote("");

    let salvos = 0;
    let falhas = 0;

    for (const item of arquivosLote) {
      const colaboradorDoArquivo = colaboradores.find((c) => String(c.codigoFuncionario) === String(item.colaboradorCodigo));

      const ok = await onSalvarCertificado({
        colaboradorCodigo: String(item.colaboradorCodigo || ""),
        colaborador: colaboradorDoArquivo,
        treinamentoId: Number(treinamentoSelecionadoId),
        dataRealizacao,
        dataVencimento: vencimento,
        arquivo: item.arquivo,
        arquivoNome: item.arquivo.name,
        observacao: observacao.trim() || "Enviado em lote",
      });

      if (ok) {
        salvos += 1;
      } else {
        falhas += 1;
      }
    }

    setSalvandoLote(false);
    setResultadoLote(`${salvos} certificado(s) salvo(s). ${falhas} falha(s).`);

    if (falhas === 0) {
      setArquivosLote([]);
      setObservacao("");
    }
  };

  const documentos = colaboradores.flatMap((c) =>
    (c.treinamentos || []).map((t) => ({ ...t, colaborador: c, treinamento: obterTreinamento(t.treinamentoId) }))
  );

  const valoresRevisao = (doc) => ({
    realizado: datasRevisao[doc.id]?.realizado ?? doc.realizado ?? "",
    vencimento: datasRevisao[doc.id]?.vencimento ?? doc.vencimento ?? "",
  });

  const alterarDataRevisao = (docId, campo, valor) => {
    setDatasRevisao((atual) => ({
      ...atual,
      [docId]: {
        ...atual[docId],
        [campo]: valor,
      },
    }));
  };

  const salvarDatasCertificado = async (doc) => {
    if (!onAtualizarDatasCertificado) return;

    const valores = valoresRevisao(doc);

    if (!valores.realizado || !valores.vencimento) {
      alert("Informe a data de realização e o vencimento.");
      return;
    }

    setSalvandoDatasId(doc.id);

    const ok = await onAtualizarDatasCertificado(doc, {
      realizado: valores.realizado,
      vencimento: valores.vencimento,
    });

    setSalvandoDatasId("");

    if (ok) {
      setDatasRevisao((atual) => {
        const copia = { ...atual };
        delete copia[doc.id];
        return copia;
      });
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Header titulo="Treinamentos e certificados" subtitulo="Lançamento de certificados no Supabase, validade e controle automático de status." />

      <div className="grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
        <Card>
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-950">
            <Upload className="h-5 w-5" />
            Lançar certificado
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            O arquivo será salvo no Supabase Storage usando o código do funcionário e o registro ficará vinculado ao UUID real do colaborador.
          </p>

          <div className="mt-5 space-y-3">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Colaborador</label>
              <select
                value={colabSelecionadoCodigo}
                onChange={(e) => {
                  const novoColaboradorCodigo = e.target.value;
                  const novoColaborador = colaboradores.find((c) => String(c.codigoFuncionario) === String(novoColaboradorCodigo));
                  const novaAvaliacao = novoColaborador ? avaliarTreinamentosColaborador(novoColaborador) : null;
                  const primeiroTreinamento = novaAvaliacao?.itens?.[0]?.treinamento?.id || treinamentosBase[0].id;

                  setColabId(String(novoColaboradorCodigo));
                  setTreinamentoId(Number(primeiroTreinamento));
                }}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
              >
                {colaboradores.length === 0 && <option value="">Nenhum colaborador cadastrado</option>}
                {colaboradores.map((c) => (
                  <option key={c.id} value={c.codigoFuncionario}>
                    {c.nome} — {c.empresaExibicao || c.empresa} — {c.codigoFuncionario}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Treinamento / documento</label>
              <select
                value={treinamentoSelecionadoId}
                onChange={(e) => setTreinamentoId(Number(e.target.value))}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
              >
                {treinamentosDisponiveis.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome}
                  </option>
                ))}
              </select>
            </div>

            {avaliacaoSelecionado && (
              <div className="rounded-2xl bg-slate-50 p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Documentos exigidos para a função: {avaliacaoSelecionado.matriz.rotulo}
                </p>
                <div className="mt-2 space-y-1.5">
                  {avaliacaoSelecionado.itens.map((item) => (
                    <div key={item.treinamento.id} className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 text-xs">
                      <span className="font-medium text-slate-700">{item.treinamento.nome}</span>
                      <span className={classNames("rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1", item.status.classe)}>
                        {item.status.texto}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Realização / emissão</label>
                <input
                  type="date"
                  value={dataRealizacao}
                  onChange={(e) => setDataRealizacao(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Validade / vencimento</label>
                <input
                  type="date"
                  value={vencimento}
                  readOnly
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>
            </div>

            <textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Observação opcional"
              rows={3}
              className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
            />

            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-600 hover:bg-slate-100">
              <Upload className="h-4 w-4" />
              {arquivoSelecionado ? arquivoSelecionado.name : "Selecionar PDF ou imagem do certificado"}
              <input
                type="file"
                accept="application/pdf,image/*"
                className="hidden"
                onChange={(e) => setArquivoSelecionado(e.target.files?.[0] || null)}
              />
            </label>

            <button
              onClick={adicionarTreinamento}
              disabled={salvandoCertificado}
              className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {salvandoCertificado ? "Salvando no Supabase..." : "Salvar certificado no banco"}
            </button>

            <div className="mt-6 border-t border-slate-200 pt-5">
              <div className="rounded-3xl bg-blue-50 p-4">
                <h3 className="flex items-center gap-2 text-sm font-bold text-blue-900">
                  <Upload className="h-4 w-4" />
                  Envio em lote
                </h3>
                <p className="mt-1 text-xs text-blue-800/80">
                  Selecione vários arquivos. O sistema tenta distribuir pelo nome ou código do colaborador no nome do arquivo.
                  Antes de salvar, confira o colaborador de cada documento.
                </p>
              </div>

              <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-blue-300 bg-white px-4 py-4 text-sm font-semibold text-blue-700 hover:bg-blue-50">
                <Upload className="h-4 w-4" />
                Selecionar vários certificados
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => prepararArquivosLote(e.target.files)}
                />
              </label>

              <button
                type="button"
                onClick={sincronizarArquivosDoStorage}
                disabled={sincronizandoStorage}
                className="mt-3 w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sincronizandoStorage ? "Sincronizando arquivos..." : "Sincronizar arquivos já enviados no Storage"}
              </button>

              {resultadoLote && arquivosLote.length === 0 && (
                <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm font-semibold text-slate-700">
                  {resultadoLote}
                </div>
              )}

              {arquivosLote.length > 0 && (
                <div className="mt-4 space-y-3">
                  <div className="rounded-2xl bg-slate-50 p-3 text-xs text-slate-600">
                    <strong>Regra do lote:</strong> todos os arquivos abaixo serão lançados como
                    {" "}<strong>{obterTreinamento(Number(treinamentoSelecionadoId))?.nome}</strong>, com realização em
                    {" "}<strong>{formatDate(dataRealizacao)}</strong> e vencimento em
                    {" "}<strong>{formatDate(vencimento)}</strong>.
                  </div>

                  <div className="max-h-72 space-y-2 overflow-y-auto pr-1 scrollbar-discreta">
                    {arquivosLote.map((item) => (
                      <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-3">
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-800">
                              <FileText className="mr-1 inline h-4 w-4" />
                              {item.arquivo.name}
                            </p>
                            <p className={classNames(
                              "mt-1 text-xs font-medium",
                              item.status === "Identificado" || item.status === "Conferido" ? "text-emerald-700" : "text-orange-700"
                            )}>
                              {item.status}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => removerArquivoLote(item.id)}
                            className="rounded-xl bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-100"
                          >
                            Remover
                          </button>
                        </div>

                        <select
                          value={item.colaboradorCodigo}
                          onChange={(e) => alterarColaboradorArquivoLote(item.id, e.target.value)}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                        >
                          <option value="">Selecione o colaborador</option>
                          {colaboradores.map((c) => (
                            <option key={c.id} value={c.codigoFuncionario}>
                              {c.nome} — {c.empresaExibicao || c.empresa} — {c.codigoFuncionario}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>

                  {resultadoLote && (
                    <div className="rounded-2xl bg-slate-50 p-3 text-sm font-semibold text-slate-700">
                      {resultadoLote}
                    </div>
                  )}

                  <button
                    onClick={salvarCertificadosEmLote}
                    disabled={salvandoLote}
                    className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {salvandoLote ? "Salvando lote..." : `Salvar ${arquivosLote.length} certificado(s) em lote`}
                  </button>
                </div>
              )}
            </div>
          </div>
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-950">Base de certificados</h2>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              {documentos.length} registros
            </span>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Colaborador</th>
                  <th className="px-4 py-3">Treinamento</th>
                  <th className="px-4 py-3">Arquivo</th>
                  <th className="px-4 py-3">Revisar datas</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {documentos.length === 0 && (
                  <tr>
                    <td className="px-4 py-8 text-center text-sm text-slate-500" colSpan={6}>
                      Nenhum certificado lançado ainda.
                    </td>
                  </tr>
                )}

                {documentos.map((d, idx) => (
                  <tr key={`${d.id || d.colaborador.id}-${d.treinamentoId}-${idx}`} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{d.colaborador.nome}</div>
                      <div className="text-xs text-slate-500">{d.colaborador.empresa}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{d.treinamento.nome}</td>
                    <td className="px-4 py-3 text-slate-500">
                      <FileText className="mr-1 inline h-4 w-4" />
                      {d.arquivo}
                    </td>
                    <td className="px-4 py-3">
                      <div className="grid min-w-[230px] gap-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Realização</p>
                            <input
                              type="date"
                              value={valoresRevisao(d).realizado}
                              onChange={(e) => alterarDataRevisao(d.id, "realizado", e.target.value)}
                              className="w-full rounded-xl border border-slate-200 px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-slate-200"
                            />
                          </div>
                          <div>
                            <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Vencimento</p>
                            <input
                              type="date"
                              value={valoresRevisao(d).vencimento}
                              onChange={(e) => alterarDataRevisao(d.id, "vencimento", e.target.value)}
                              className="w-full rounded-xl border border-slate-200 px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-slate-200"
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => salvarDatasCertificado(d)}
                          disabled={salvandoDatasId === d.id}
                          className="rounded-xl bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 ring-1 ring-blue-200 hover:bg-blue-100 disabled:opacity-60"
                        >
                          {salvandoDatasId === d.id ? "Salvando..." : "Salvar datas"}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={statusDocumento(valoresRevisao(d).vencimento || d.vencimento)} small />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => onVisualizarCertificado(d)}
                          className="rounded-xl bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                        >
                          Abrir
                        </button>
                        <button
                          onClick={() => onExcluirCertificado(d)}
                          className="rounded-xl bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-100"
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </motion.div>
  );
}

function ConsultaQR({ colaborador, colaboradores = [], onSelecionarColaborador }) {
  const [busca, setBusca] = useState("");

  const colaboradorAtual =
    colaboradores.find((item) => String(item.id) === String(colaborador?.id)) ||
    colaborador ||
    colaboradores[0] ||
    null;

  const colaboradoresFiltrados = useMemo(() => {
    const termo = normalizarTextoBusca(busca);

    if (!termo) return colaboradores.slice(0, 8);

    return colaboradores
      .filter((item) => {
        const texto = normalizarTextoBusca(
          `${item.nome} ${item.codigoFuncionario} ${item.funcao} ${item.empresaExibicao || item.empresa}`
        );

        return texto.includes(termo);
      })
      .slice(0, 10);
  }, [busca, colaboradores]);

  if (!colaboradorAtual) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Header
          titulo="Consulta por QR Code"
          subtitulo="Selecione um colaborador para visualizar a consulta de treinamentos."
        />

        <Card>
          <div className="rounded-3xl border border-dashed border-slate-300 p-8 text-center">
            <QrCode className="mx-auto h-10 w-10 text-slate-300" />
            <h3 className="mt-3 font-bold text-slate-900">Nenhum colaborador selecionado</h3>
            <p className="mt-1 text-sm text-slate-500">
              Cadastre ou selecione um colaborador para gerar a consulta por QR Code.
            </p>
          </div>
        </Card>
      </motion.div>
    );
  }

  const geral = statusGeral(colaboradorAtual);
  const treinamentos = colaboradorAtual.treinamentos || [];
  const foto = colaboradorAtual.fotoUrl || "";

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Header
        titulo="Consulta por QR Code"
        subtitulo="Consulta real por token. O QR Code abre a situação do colaborador pelo link gerado."
      />

      <Card className="mb-5">
        <div className="grid gap-3 lg:grid-cols-[1fr_260px] lg:items-end">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
              Pesquisar funcionário
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Pesquisar por nome, código, função ou empresa"
                className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
              />
            </div>

            {busca && (
              <div className="mt-2 max-h-64 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm scrollbar-discreta">
                {colaboradoresFiltrados.length === 0 && (
                  <p className="px-3 py-2 text-sm text-slate-500">Nenhum funcionário encontrado.</p>
                )}

                {colaboradoresFiltrados.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onSelecionarColaborador?.(item);
                      setBusca("");
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-slate-50"
                  >
                    <FotoColaborador
                      src={item.fotoUrl}
                      nome={item.nome}
                      className="h-9 w-9 rounded-xl"
                      iconClassName="h-4 w-4"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{item.nome}</p>
                      <p className="truncate text-xs text-slate-500">
                        {item.funcao} · {item.codigoFuncionario}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <select
            value={colaboradorAtual.id}
            onChange={(e) => {
              const escolhido = colaboradores.find((item) => String(item.id) === String(e.target.value));
              if (escolhido) onSelecionarColaborador?.(escolhido);
            }}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
          >
            {colaboradores.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nome} — {item.codigoFuncionario}
              </option>
            ))}
          </select>
        </div>
      </Card>

      <div className="mx-auto max-w-5xl rounded-[2rem] bg-slate-950 p-3 shadow-2xl">
        <div className="rounded-[1.5rem] bg-white p-5 md:p-8">
          <div className="grid gap-5 lg:grid-cols-[104px_1fr_178px] lg:items-start">
            <FotoColaborador
              src={foto}
              nome={colaboradorAtual.nome}
              className="h-24 w-24 rounded-3xl"
              iconClassName="h-10 w-10"
            />

            <div className="min-w-0">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                <ShieldCheck className="h-3.5 w-3.5" />
                Verificação SST
              </div>
              <h2 className="break-words text-2xl font-bold leading-tight text-slate-950">{colaboradorAtual.nome}</h2>
              <p className="mt-2 text-sm font-semibold text-slate-500">{colaboradorAtual.funcao}</p>
              <p className="mt-1 text-sm text-slate-500">{colaboradorAtual.empresaExibicao || colaboradorAtual.empresa}</p>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                Código: {colaboradorAtual.codigoFuncionario}
              </p>

              <LinkPublicoQR token={colaboradorAtual.token} />
            </div>

            <div className="flex justify-center lg:justify-end">
              <QRCodeReal token={colaboradorAtual.token} />
            </div>
          </div>

          <div className="mt-5 rounded-3xl border border-slate-200 p-5">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <div>
                <p className="text-sm font-medium text-slate-500">Status geral do colaborador</p>
                <h3 className="mt-1 text-base font-bold leading-relaxed text-slate-950">{geral.detalhe}</h3>
              </div>
              <span className={classNames("inline-flex items-center justify-center rounded-2xl px-5 py-3 text-base font-bold", geral.classe)}>
                {geral.texto}
              </span>
            </div>
          </div>

          {treinamentos.length === 0 && (
            <div className="mt-6 rounded-3xl border border-dashed border-slate-300 p-8 text-center">
              <ClipboardCheck className="mx-auto h-10 w-10 text-slate-300" />
              <h3 className="mt-3 font-bold text-slate-900">Sem treinamentos lançados</h3>
              <p className="mt-1 text-sm text-slate-500">
                Lance os certificados na aba Treinamentos para atualizar a situação do colaborador.
              </p>
            </div>
          )}

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {treinamentos.map((t) => {
              const st = statusDocumento(t.vencimento);
              const dias = diasParaVencer(t.vencimento);
              const dataInicio = new Date(`${t.realizado}T12:00:00`);
              const dataFim = new Date(`${t.vencimento}T12:00:00`);
              const totalValidade = Math.max(1, Math.ceil((dataFim - dataInicio) / DAY));
              const percentualRestante =
                dias < 0
                  ? 100
                  : Math.max(4, Math.min(100, Math.round((dias / totalValidade) * 100)));
              const alerta30Dias = dias >= 0 && dias <= 30;
              const treinamentoInfo = obterTreinamento(t.treinamentoId);

              return (
                <div key={`${t.id || t.treinamentoId}-${t.vencimento}`} className="rounded-3xl border border-slate-200 p-4">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-slate-950">{treinamentoInfo.nome}</h4>
                      <p className="mt-1 text-sm text-slate-500">{treinamentoInfo.categoria}</p>
                    </div>
                    <StatusPill status={st} small />
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-xs text-slate-400">Realizado</p>
                      <p className="font-semibold text-slate-700">{formatDate(t.realizado)}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-xs text-slate-400">Vencimento</p>
                      <p className="font-semibold text-slate-700">{formatDate(t.vencimento)}</p>
                    </div>
                  </div>

                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={classNames(
                        "h-full rounded-full transition-all",
                        dias < 0 ? "bg-red-500" : alerta30Dias ? "bg-red-500" : st.barra
                      )}
                      style={{ width: `${percentualRestante}%` }}
                    />
                  </div>

                  <p className={classNames("mt-3 text-xs font-medium", alerta30Dias || dias < 0 ? "text-red-700" : "text-slate-500")}>
                    {dias < 0
                      ? `Vencido há ${Math.abs(dias)} dia(s).`
                      : dias <= 5
                        ? `Atenção: faltam ${dias} dia(s) para vencer. Renovar com prioridade.`
                        : alerta30Dias
                          ? "Atenção: documento próximo da data de vencimento."
                          : `Faltam ${dias} dia(s) para vencer.`}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-6 rounded-3xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-600">
            Dados sensíveis como CPF completo, endereço, ASO detalhado e documentos médicos não aparecem nesta consulta pública. A visualização completa fica restrita ao perfil autorizado.
          </div>
        </div>
      </div>
    </motion.div>
  );
}


function Empresas({
  empresasBanco,
  documentosEmpresas,
  colaboradores,
  carregandoBanco,
  erroBanco,
  onAtualizarBanco,
  onAdicionarEmpresa,
  onAtualizarEmpresa,
  onAdicionarDocumentoEmpresa,
  onExcluirDocumentoEmpresa,
  onVisualizarDocumentoEmpresa,
}) {
  const [novaEmpresa, setNovaEmpresa] = useState({
    nome: "",
    cnpj: "",
    responsavel: "",
    email: "",
    telefone: "",
    tipoEmpresa: "Terceirizada",
    empresaPaiId: "",
    logo: null,
    numeroContrato: "",
    dataInicioContrato: "",
    dataFimContrato: "",
    responsavelContratante: "",
    escopoServico: "",
    observacaoStatus: "",
  });

  const [novoDoc, setNovoDoc] = useState({
    empresaId: "",
    tipo: "PGR",
    dataEmissao: hoje.toISOString().slice(0, 10),
    dataVencimento: calcularVencimentoDocumento("PGR", hoje.toISOString().slice(0, 10)),
    arquivo: null,
    observacao: "",
  });

  const [salvandoEmpresa, setSalvandoEmpresa] = useState(false);
  const [salvandoDocumento, setSalvandoDocumento] = useState(false);
  const [empresaRevisao, setEmpresaRevisao] = useState(null);
  const [empresaEdicao, setEmpresaEdicao] = useState(null);
  const [salvandoEdicaoEmpresa, setSalvandoEdicaoEmpresa] = useState(false);
  const [buscaEmpresa, setBuscaEmpresa] = useState("");
  const [filtroStatusEmpresa, setFiltroStatusEmpresa] = useState("Todos");
  const [filtroTipoEmpresa, setFiltroTipoEmpresa] = useState("Todos");
  const [uploadRevisao, setUploadRevisao] = useState({});
  const [salvandoUploadRevisao, setSalvandoUploadRevisao] = useState("");

  const documentoSelecionado = useMemo(() => obterDocumentoEmpresa(novoDoc.tipo), [novoDoc.tipo]);

  const documentosPorEmpresa = useMemo(() => {
    return documentosEmpresas.reduce((acc, doc) => {
      const empresaId = doc.empresa_id || doc.empresaId;
      if (!acc[empresaId]) acc[empresaId] = [];
      acc[empresaId].push(doc);
      return acc;
    }, {});
  }, [documentosEmpresas]);

  const colaboradoresPorEmpresa = useMemo(() => {
    return (colaboradores || []).reduce((acc, colaborador) => {
      const empresaId = colaborador.empresaId || colaborador.empresa_id;
      if (!empresaId) return acc;
      if (!acc[empresaId]) acc[empresaId] = [];
      acc[empresaId].push(colaborador);
      return acc;
    }, {});
  }, [colaboradores]);

  const nomeEmpresaPai = (empresaPaiId) => {
    if (!empresaPaiId) return "";
    return empresasBanco.find((empresa) => empresa.id === empresaPaiId)?.nome || "";
  };

  const adicionarEmpresa = async () => {
    if (!novaEmpresa.nome.trim()) {
      alert("Informe o nome da empresa.");
      return;
    }

    setSalvandoEmpresa(true);

    const ok = await onAdicionarEmpresa({
      nome: novaEmpresa.nome.trim(),
      cnpj: novaEmpresa.cnpj.trim(),
      responsavel: novaEmpresa.responsavel.trim(),
      email: novaEmpresa.email.trim(),
      telefone: novaEmpresa.telefone.trim(),
      tipoEmpresa: novaEmpresa.tipoEmpresa,
      empresaPaiId: novaEmpresa.empresaPaiId || null,
      logo: novaEmpresa.logo,
      numeroContrato: novaEmpresa.numeroContrato.trim(),
      dataInicioContrato: novaEmpresa.dataInicioContrato || null,
      dataFimContrato: novaEmpresa.dataFimContrato || null,
      responsavelContratante: novaEmpresa.responsavelContratante.trim(),
      escopoServico: novaEmpresa.escopoServico.trim(),
      observacaoStatus: novaEmpresa.observacaoStatus.trim(),
    });

    setSalvandoEmpresa(false);

    if (ok) {
      setNovaEmpresa({
        nome: "",
        cnpj: "",
        responsavel: "",
        email: "",
        telefone: "",
        tipoEmpresa: "Terceirizada",
        empresaPaiId: "",
        logo: null,
        numeroContrato: "",
        dataInicioContrato: "",
        dataFimContrato: "",
        responsavelContratante: "",
        escopoServico: "",
        observacaoStatus: "",
      });
    }
  };

  const alterarTipoDocumento = (tipo) => {
    setNovoDoc((atual) => ({
      ...atual,
      tipo,
      dataVencimento: calcularVencimentoDocumento(tipo, atual.dataEmissao),
    }));
  };

  const alterarEmissaoDocumento = (dataEmissao) => {
    setNovoDoc((atual) => ({
      ...atual,
      dataEmissao,
      dataVencimento: calcularVencimentoDocumento(atual.tipo, dataEmissao),
    }));
  };

  const abrirEdicaoEmpresa = (empresa) => {
    setEmpresaEdicao({
      id: empresa.id,
      nome: empresa.nome || "",
      cnpj: empresa.cnpj || "",
      responsavel: empresa.responsavel || "",
      email: empresa.email || "",
      telefone: empresa.telefone || "",
      status: normalizarStatusEmpresa(empresa.status),
      tipoEmpresa: empresa.tipo_empresa || "Terceirizada",
      empresaPaiId: empresa.empresa_pai_id || "",
      logoAtual: empresa.logo_url || "",
      logoNomeAtual: empresa.logo_nome || "",
      logo: null,
      numeroContrato: empresa.numero_contrato || "",
      dataInicioContrato: empresa.data_inicio_contrato || "",
      dataFimContrato: empresa.data_fim_contrato || "",
      responsavelContratante: empresa.responsavel_contratante || "",
      escopoServico: empresa.escopo_servico || "",
      observacaoStatus: empresa.observacao_status || "",
    });
  };

  const salvarEdicaoEmpresa = async () => {
    if (!empresaEdicao?.nome?.trim()) {
      alert("Informe o nome da empresa.");
      return;
    }

    setSalvandoEdicaoEmpresa(true);

    const ok = await onAtualizarEmpresa({
      id: empresaEdicao.id,
      nome: empresaEdicao.nome.trim(),
      cnpj: empresaEdicao.cnpj.trim(),
      responsavel: empresaEdicao.responsavel.trim(),
      email: empresaEdicao.email.trim(),
      telefone: empresaEdicao.telefone.trim(),
      status: empresaEdicao.status || "Ativa",
      tipoEmpresa: empresaEdicao.tipoEmpresa,
      empresaPaiId: empresaEdicao.empresaPaiId || null,
      logo: empresaEdicao.logo,
      logoAtual: empresaEdicao.logoAtual,
      logoNomeAtual: empresaEdicao.logoNomeAtual,
      numeroContrato: empresaEdicao.numeroContrato.trim(),
      dataInicioContrato: empresaEdicao.dataInicioContrato || null,
      dataFimContrato: empresaEdicao.dataFimContrato || null,
      responsavelContratante: empresaEdicao.responsavelContratante.trim(),
      escopoServico: empresaEdicao.escopoServico.trim(),
      observacaoStatus: empresaEdicao.observacaoStatus.trim(),
    });

    setSalvandoEdicaoEmpresa(false);

    if (ok) {
      setEmpresaEdicao(null);
    }
  };

  const obterUploadRevisao = (tipo) => {
    const dataEmissao = hoje.toISOString().slice(0, 10);

    return {
      dataEmissao,
      dataVencimento: calcularVencimentoDocumento(tipo, dataEmissao),
      observacao: "",
      ...(uploadRevisao[tipo] || {}),
    };
  };

  const atualizarUploadRevisao = (tipo, campo, valor) => {
    setUploadRevisao((atual) => {
      const dadosAtuais = obterUploadRevisao(tipo);
      const atualizados = {
        ...dadosAtuais,
        [campo]: valor,
      };

      if (campo === "dataEmissao") {
        atualizados.dataVencimento = calcularVencimentoDocumento(tipo, valor);
      }

      return {
        ...atual,
        [tipo]: atualizados,
      };
    });
  };

  const enviarDocumentoPelaRevisao = async (empresa, tipo, arquivo) => {
    if (!arquivo) return;

    const dados = obterUploadRevisao(tipo);
    const chave = `${empresa.id}-${tipo}`;

    setSalvandoUploadRevisao(chave);

    const ok = await onAdicionarDocumentoEmpresa({
      empresaId: empresa.id,
      tipo,
      dataEmissao: dados.dataEmissao,
      dataVencimento: dados.dataVencimento || null,
      arquivo,
      observacao: dados.observacao || "",
    });

    setSalvandoUploadRevisao("");

    if (ok) {
      setUploadRevisao((atual) => ({
        ...atual,
        [tipo]: {
          dataEmissao: hoje.toISOString().slice(0, 10),
          dataVencimento: calcularVencimentoDocumento(tipo, hoje.toISOString().slice(0, 10)),
          observacao: "",
        },
      }));
    }
  };

  const adicionarDocumento = async () => {
    if (!novoDoc.empresaId) {
      alert("Selecione a empresa.");
      return;
    }

    if (!novoDoc.tipo) {
      alert("Selecione o tipo do documento.");
      return;
    }

    if (!novoDoc.dataEmissao) {
      alert("Informe a data de emissão.");
      return;
    }

    setSalvandoDocumento(true);

    const ok = await onAdicionarDocumentoEmpresa({
      empresaId: novoDoc.empresaId,
      tipo: novoDoc.tipo,
      dataEmissao: novoDoc.dataEmissao,
      dataVencimento: novoDoc.dataVencimento || null,
      arquivo: novoDoc.arquivo,
      observacao: novoDoc.observacao.trim(),
    });

    setSalvandoDocumento(false);

    if (ok) {
      setNovoDoc({
        empresaId: novoDoc.empresaId,
        tipo: "PGR",
        dataEmissao: hoje.toISOString().slice(0, 10),
        dataVencimento: calcularVencimentoDocumento("PGR", hoje.toISOString().slice(0, 10)),
        arquivo: null,
        observacao: "",
      });
    }
  };

  const renderEmpresaCard = (empresa, docs, destaqueContratante = false) => {
    const logoUrl = obterUrlLogoEmpresa(empresa.logo_url);
    const funcionarios = colaboradoresPorEmpresa[empresa.id] || [];
    const situacaoDocumental = calcularSituacaoDocumentalEmpresa(docs);

    return (
      <div key={empresa.id} className={classNames("rounded-3xl border p-4", destaqueContratante ? "border-slate-300 bg-slate-50" : "border-slate-200 bg-white")}>
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
          <div className="flex items-start gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
              {logoUrl ? (
                <img src={logoUrl} alt={`Logo ${empresa.nome}`} className="h-full w-full object-contain p-1" />
              ) : (
                <Building2 className="h-6 w-6 text-slate-400" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-slate-950">{empresa.nome}</h3>
              <p className="text-sm text-slate-500">{empresa.cnpj || "CNPJ não informado"}</p>
              <p className="text-xs text-slate-400">
                Responsável: {empresa.responsavel || "-"} · {empresa.email || "-"}
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-600">
                Tipo: {empresa.tipo_empresa || "Terceirizada"}
              </p>
              {empresa.empresa_pai_id && (
                <p className="mt-1 text-xs font-semibold text-slate-600">
                  Contratada por: {nomeEmpresaPai(empresa.empresa_pai_id) || "Empresa não identificada"}
                </p>
              )}
              <p className="mt-1 text-xs text-slate-500">
                Funcionários vinculados: <strong>{funcionarios.length}</strong>
              </p>
              {empresa.numero_contrato && (
                <p className="mt-1 text-xs text-slate-500">
                  Contrato: <strong>{empresa.numero_contrato}</strong>
                </p>
              )}
              {empresa.escopo_servico && (
                <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                  Escopo: {empresa.escopo_servico}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className={classNames("rounded-full px-3 py-1 text-xs font-semibold ring-1", classeStatusEmpresa(empresa.status))}>
              {normalizarStatusEmpresa(empresa.status)}
            </span>
            <span
              title={situacaoDocumental.detalhe}
              className={classNames("rounded-full px-3 py-1 text-xs font-semibold ring-1", situacaoDocumental.classe)}
            >
              {situacaoDocumental.texto}
            </span>
            <button
              onClick={() => abrirEdicaoEmpresa(empresa)}
              className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
            >
              <FileText className="h-3.5 w-3.5" />
              Editar dados
            </button>
            <button
              onClick={() => setEmpresaRevisao({ empresa, docs })}
              className="inline-flex items-center gap-1 rounded-full bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
            >
              <Eye className="h-3.5 w-3.5" />
              Revisar documentos
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {documentosEmpresaBase.map((tipoDoc) => {
            const doc = docs.find((item) => item.tipo_documento === tipoDoc.tipo);
            const st = statusEmpresaDocumento(doc?.data_vencimento);

            return (
              <div key={tipoDoc.tipo} className="rounded-2xl bg-white p-3 ring-1 ring-slate-200">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-slate-900">{tipoDoc.nome}</p>
                    <p className="text-xs text-slate-400">
                      {doc ? `Emissão: ${formatDate(doc.data_emissao)}` : "Documento ainda não cadastrado"}
                    </p>
                  </div>
                  {doc && <StatusPill status={st} small />}
                </div>

                {doc ? (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-500">
                      <strong>Revisão:</strong> {doc.data_vencimento ? formatDate(doc.data_vencimento) : "Sem revisão definida"}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      <strong>Arquivo:</strong> {doc.arquivo_nome || "Arquivo ainda não anexado"}
                    </p>
                    {doc.observacao && (
                      <p className="line-clamp-2 text-xs text-slate-500">{doc.observacao}</p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => onVisualizarDocumentoEmpresa(doc)}
                        disabled={!doc.arquivo_url}
                        title="Abrir o documento enviado"
                        className="inline-flex items-center gap-1 rounded-xl bg-slate-950 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Visualizar documento
                      </button>

                      <button
                        onClick={() => onExcluirDocumentoEmpresa(doc)}
                        title="Excluir este documento do cadastro da empresa"
                        className="inline-flex items-center gap-1 rounded-xl bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Excluir documento
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">Documento ainda não cadastrado para esta empresa.</p>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex justify-center border-t border-slate-200 pt-4">
          <button
            onClick={() => baixarRelatorioDocumentos(empresa, docs)}
            className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
          >
            <FileText className="h-4 w-4" />
            Baixar PDF documentos desta empresa
          </button>
        </div>
      </div>
    );
  };

  const empresasFiltradas = empresasBanco.filter((empresa) => {
    const texto = [
      empresa.nome,
      empresa.cnpj,
      empresa.responsavel,
      empresa.email,
      empresa.telefone,
      empresa.tipo_empresa,
      nomeEmpresaPai(empresa.empresa_pai_id),
      normalizarStatusEmpresa(empresa.status),
    ]
      .join(" ")
      .toLowerCase();

    const atendeBusca = texto.includes(buscaEmpresa.toLowerCase());
    const atendeStatus = filtroStatusEmpresa === "Todos" || normalizarStatusEmpresa(empresa.status) === filtroStatusEmpresa;
    const atendeTipo = filtroTipoEmpresa === "Todos" || (empresa.tipo_empresa || "Terceirizada") === filtroTipoEmpresa;

    return atendeBusca && atendeStatus && atendeTipo;
  });

  const empresasContratantes = empresasFiltradas.filter(
    (empresa) => (empresa.tipo_empresa || "Terceirizada") === "Contratante - Idealiza Cidades"
  );

  const empresasTerceirizadas = empresasFiltradas.filter(
    (empresa) => (empresa.tipo_empresa || "Terceirizada") === "Terceirizada"
  );

  const empresasSubcontratadas = empresasFiltradas.filter(
    (empresa) => (empresa.tipo_empresa || "Terceirizada") === "Subcontratada"
  );

  const subcontratadasPorContratante = empresasSubcontratadas.reduce((acc, empresa) => {
    const chave = empresa.empresa_pai_id || "sem-vinculo";

    if (!acc[chave]) {
      acc[chave] = {
        contratante: empresasBanco.find((item) => item.id === empresa.empresa_pai_id) || null,
        empresas: [],
      };
    }

    acc[chave].empresas.push(empresa);
    return acc;
  }, {});

  const gruposSubcontratadas = Object.values(subcontratadasPorContratante);

  const documentosFiltrados = documentosEmpresas.filter((doc) =>
    empresasFiltradas.some((empresa) => empresa.id === doc.empresa_id)
  );

  const baixarRelatorioEmpresas = () => {
    const linhas = [
      ["Empresa", "Tipo", "Contratada por", "Status da empresa", "Situação documental", "Nº funcionários", "CNPJ", "Responsável", "E-mail", "Telefone", "Nº contrato", "Início contrato", "Fim contrato", "Escopo do serviço", "Observação status", "LTCAT", "PCMSO", "PGR"],
    ];

    empresasFiltradas.forEach((empresa) => {
      const docs = documentosPorEmpresa[empresa.id] || [];

      const statusDoc = (tipo) => {
        const doc = docs.find((item) => item.tipo_documento === tipo);
        if (!doc) return "Pendente";
        const status = statusEmpresaDocumento(doc.data_vencimento);
        return `${status.texto} - emissão ${formatDate(doc.data_emissao)} - revisão ${doc.data_vencimento ? formatDate(doc.data_vencimento) : "sem revisão definida"}`;
      };

      const situacaoDocumental = calcularSituacaoDocumentalEmpresa(docs);
      const qtdFuncionarios = (colaboradoresPorEmpresa[empresa.id] || []).length;

      linhas.push([
        empresa.nome,
        empresa.tipo_empresa || "Terceirizada",
        nomeEmpresaPai(empresa.empresa_pai_id),
        normalizarStatusEmpresa(empresa.status),
        situacaoDocumental.texto,
        qtdFuncionarios,
        empresa.cnpj || "",
        empresa.responsavel || "",
        empresa.email || "",
        empresa.telefone || "",
        empresa.numero_contrato || "",
        empresa.data_inicio_contrato ? formatDate(empresa.data_inicio_contrato) : "",
        empresa.data_fim_contrato ? formatDate(empresa.data_fim_contrato) : "",
        empresa.escopo_servico || "",
        empresa.observacao_status || "",
        statusDoc("LTCAT"),
        statusDoc("PCMSO"),
        statusDoc("PGR"),
      ]);
    });

    baixarPDF("relatorio-empresas-documentos.pdf", "Relatorio geral de empresas e documentos", linhas);
  };

  const baixarRelatorioPendencias = () => {
    const linhas = [
      ["Empresa", "Tipo da empresa", "Contratada por", "Status da empresa", "Situação documental", "Nº funcionários", "Documento", "Situação", "Emissão", "Próxima revisão", "Arquivo"],
    ];

    empresasFiltradas.forEach((empresa) => {
      const docs = documentosPorEmpresa[empresa.id] || [];

      documentosEmpresaBase.forEach((tipoDoc) => {
        const doc = docs.find((item) => item.tipo_documento === tipoDoc.tipo);

        if (!doc) {
          const situacaoDocumental = calcularSituacaoDocumentalEmpresa(docs);
          const qtdFuncionarios = (colaboradoresPorEmpresa[empresa.id] || []).length;

          linhas.push([
            empresa.nome,
            empresa.tipo_empresa || "Terceirizada",
            nomeEmpresaPai(empresa.empresa_pai_id),
            normalizarStatusEmpresa(empresa.status),
            situacaoDocumental.texto,
            qtdFuncionarios,
            tipoDoc.tipo,
            "Documento pendente",
            "",
            "",
            "",
          ]);
          return;
        }

        const status = statusEmpresaDocumento(doc.data_vencimento);

        if (["vencido", "vencendo"].includes(status.chave)) {
          const situacaoDocumental = calcularSituacaoDocumentalEmpresa(docs);
          const qtdFuncionarios = (colaboradoresPorEmpresa[empresa.id] || []).length;

          linhas.push([
            empresa.nome,
            empresa.tipo_empresa || "Terceirizada",
            nomeEmpresaPai(empresa.empresa_pai_id),
            normalizarStatusEmpresa(empresa.status),
            situacaoDocumental.texto,
            qtdFuncionarios,
            tipoDoc.tipo,
            status.texto,
            formatDate(doc.data_emissao),
            doc.data_vencimento ? formatDate(doc.data_vencimento) : "Sem revisão definida",
            doc.arquivo_nome || "",
          ]);
        }
      });
    });

    baixarPDF("relatorio-pendencias-documentais.pdf", "Relatorio de pendencias documentais", linhas);
  };

  const baixarRelatorioDocumentos = (empresa, docsEmpresa = []) => {
    const linhas = [
      ["Empresa", "Tipo da empresa", "Contratada por", "Nº funcionários", "Documento", "Status", "Emissão", "Próxima revisão", "Arquivo", "Observação"],
    ];

    const qtdFuncionarios = (colaboradoresPorEmpresa[empresa.id] || []).length;

    docsEmpresa.forEach((doc) => {
      const status = statusEmpresaDocumento(doc.data_vencimento);

      linhas.push([
        empresa.nome || "",
        empresa.tipo_empresa || "Terceirizada",
        nomeEmpresaPai(empresa.empresa_pai_id),
        qtdFuncionarios,
        doc.tipo_documento,
        status.texto,
        formatDate(doc.data_emissao),
        doc.data_vencimento ? formatDate(doc.data_vencimento) : "Sem revisão definida",
        doc.arquivo_nome || "",
        doc.observacao || "",
      ]);
    });

    if (docsEmpresa.length === 0) {
      linhas.push([
        empresa.nome || "",
        empresa.tipo_empresa || "Terceirizada",
        nomeEmpresaPai(empresa.empresa_pai_id),
        qtdFuncionarios,
        "Sem documentos enviados",
        "Pendente",
        "",
        "",
        "",
        "Nenhum documento enviado para esta empresa.",
      ]);
    }

    const nomeSeguro = sanitizarNomeArquivo(empresa.nome || "empresa").replace(/\.pdf$/i, "");
    baixarPDF(`documentos-enviados-${nomeSeguro}.pdf`, `Documentos enviados - ${empresa.nome}`, linhas);
  };


  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Header
        titulo="Empresas e documentos"
        subtitulo="Cadastro de empresas terceirizadas e controle de LTCAT, PCMSO e PGR."
        acao={
          <button
            onClick={onAtualizarBanco}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white"
          >
            <RefreshCw className={classNames("h-4 w-4", carregandoBanco && "animate-spin")} />
            Atualizar banco
          </button>
        }
      />

      {erroBanco && (
        <div className="mb-5 rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-700 ring-1 ring-red-200">
          {erroBanco}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="space-y-6">
          <Card className="overflow-hidden">
            <div className="-m-5 mb-5 bg-gradient-to-br from-slate-950 to-slate-800 p-5 text-white">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-white/10 p-3">
                  <Building2 className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Adicionar empresa</h2>
                  <p className="text-sm text-slate-300">Cadastre contratante, terceirizada ou subcontratada antes de anexar documentos.</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <input
                value={novaEmpresa.nome}
                onChange={(e) => setNovaEmpresa({ ...novaEmpresa, nome: e.target.value })}
                placeholder="Nome da empresa"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
              />
              <input
                value={novaEmpresa.cnpj}
                onChange={(e) => setNovaEmpresa({ ...novaEmpresa, cnpj: e.target.value })}
                placeholder="CNPJ"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
              />
              <input
                value={novaEmpresa.responsavel}
                onChange={(e) => setNovaEmpresa({ ...novaEmpresa, responsavel: e.target.value })}
                placeholder="Responsável"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
              />
              <input
                value={novaEmpresa.email}
                onChange={(e) => setNovaEmpresa({ ...novaEmpresa, email: e.target.value })}
                placeholder="E-mail"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
              />
              <input
                value={novaEmpresa.telefone}
                onChange={(e) => setNovaEmpresa({ ...novaEmpresa, telefone: e.target.value })}
                placeholder="Telefone"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
              />

              <select
                value={novaEmpresa.tipoEmpresa}
                onChange={(e) => setNovaEmpresa({ ...novaEmpresa, tipoEmpresa: e.target.value })}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
              >
                <option>Terceirizada</option>
                <option>Subcontratada</option>
                <option>Contratante - Idealiza Cidades</option>
              </select>

              {novaEmpresa.tipoEmpresa === "Subcontratada" && (
                <select
                  value={novaEmpresa.empresaPaiId}
                  onChange={(e) => setNovaEmpresa({ ...novaEmpresa, empresaPaiId: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                >
                  <option value="">Selecione a empresa terceirizada contratante direta</option>
                  {empresasBanco
                    .filter((empresa) => (empresa.tipo_empresa || "Terceirizada") !== "Subcontratada")
                    .map((empresa) => (
                      <option key={empresa.id} value={empresa.id}>
                        {empresa.nome}
                      </option>
                    ))}
                </select>
              )}

              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-600 hover:bg-slate-100">
                <Upload className="h-4 w-4" />
                {novaEmpresa.logo ? novaEmpresa.logo.name : "Adicionar logo da empresa"}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={(e) => setNovaEmpresa({ ...novaEmpresa, logo: e.target.files?.[0] || null })}
                />
              </label>

              <div className="grid gap-3 md:grid-cols-2">
                <input
                  value={novaEmpresa.numeroContrato}
                  onChange={(e) => setNovaEmpresa({ ...novaEmpresa, numeroContrato: e.target.value })}
                  placeholder="Nº do contrato"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                />

                <input
                  value={novaEmpresa.responsavelContratante}
                  onChange={(e) => setNovaEmpresa({ ...novaEmpresa, responsavelContratante: e.target.value })}
                  placeholder="Responsável da contratante"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                />

                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Início do contrato</label>
                  <input
                    type="date"
                    value={novaEmpresa.dataInicioContrato}
                    onChange={(e) => setNovaEmpresa({ ...novaEmpresa, dataInicioContrato: e.target.value })}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Fim do contrato</label>
                  <input
                    type="date"
                    value={novaEmpresa.dataFimContrato}
                    onChange={(e) => setNovaEmpresa({ ...novaEmpresa, dataFimContrato: e.target.value })}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                  />
                </div>
              </div>

              <textarea
                value={novaEmpresa.escopoServico}
                onChange={(e) => setNovaEmpresa({ ...novaEmpresa, escopoServico: e.target.value })}
                placeholder="Escopo do serviço"
                rows={3}
                className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
              />

              <textarea
                value={novaEmpresa.observacaoStatus}
                onChange={(e) => setNovaEmpresa({ ...novaEmpresa, observacaoStatus: e.target.value })}
                placeholder="Observação de bloqueio, suspensão ou condição especial"
                rows={2}
                className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
              />

              <button
                onClick={adicionarEmpresa}
                disabled={salvandoEmpresa}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
              >
                <Plus className="h-4 w-4" />
                {salvandoEmpresa ? "Salvando empresa..." : "Cadastrar empresa"}
              </button>
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-bold text-slate-950">Adicionar documento da empresa</h2>
            <p className="mt-1 text-sm text-slate-500">Controle de validade/revisão de LTCAT, PCMSO e PGR.</p>

            <div className="mt-5 space-y-3">
              <select
                value={novoDoc.empresaId}
                onChange={(e) => setNovoDoc({ ...novoDoc, empresaId: e.target.value })}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
              >
                <option value="">Selecione a empresa</option>
                {empresasBanco.map((empresa) => (
                  <option key={empresa.id} value={empresa.id}>
                    {empresa.nome}
                  </option>
                ))}
              </select>

              <select
                value={novoDoc.tipo}
                onChange={(e) => alterarTipoDocumento(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
              >
                {documentosEmpresaBase.map((doc) => (
                  <option key={doc.tipo} value={doc.tipo}>
                    {doc.nome}
                  </option>
                ))}
              </select>

              <div className="rounded-2xl bg-slate-50 p-3 text-xs text-slate-600">
                <p className="font-bold text-slate-800">{documentoSelecionado.nome}</p>
                <p className="mt-1"><strong>Regra:</strong> {documentoSelecionado.regra}</p>
                <p className="mt-1 text-slate-500"><strong>Referência:</strong> {documentoSelecionado.fundamento}</p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Emissão</label>
                  <input
                    type="date"
                    value={novoDoc.dataEmissao}
                    onChange={(e) => alterarEmissaoDocumento(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Vencimento / revisão</label>
                  <input
                    type="date"
                    value={novoDoc.dataVencimento || ""}
                    onChange={(e) => setNovoDoc({ ...novoDoc, dataVencimento: e.target.value })}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                  />
                </div>
              </div>

              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-600 hover:bg-slate-100">
                <Upload className="h-4 w-4" />
                {novoDoc.arquivo ? novoDoc.arquivo.name : "Selecionar PDF do documento"}
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  className="hidden"
                  onChange={(e) => setNovoDoc({ ...novoDoc, arquivo: e.target.files?.[0] || null })}
                />
              </label>

              <textarea
                value={novoDoc.observacao}
                onChange={(e) => setNovoDoc({ ...novoDoc, observacao: e.target.value })}
                placeholder="Observação opcional"
                rows={3}
                className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
              />

              <button
                onClick={adicionarDocumento}
                disabled={salvandoDocumento}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
              >
                <FileText className="h-4 w-4" />
                {salvandoDocumento ? "Salvando documento..." : "Salvar documento da empresa"}
              </button>
            </div>
          </Card>
        </div>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-950">Empresas cadastradas</h2>
              <p className="text-sm text-slate-500">Separação entre contratante e terceirizadas.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              {empresasFiltradas.length} de {empresasBanco.length} empresa(s)
            </span>
          </div>

          <div className="mb-5 grid gap-3 lg:grid-cols-[1fr_220px_220px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={buscaEmpresa}
                onChange={(e) => setBuscaEmpresa(e.target.value)}
                placeholder="Pesquisar por empresa, CNPJ, responsável, e-mail ou status"
                className="w-full rounded-2xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
              />
            </div>

            <select
              value={filtroTipoEmpresa}
              onChange={(e) => setFiltroTipoEmpresa(e.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
            >
              <option>Todos</option>
              <option>Contratante - Idealiza Cidades</option>
              <option>Terceirizada</option>
              <option>Subcontratada</option>
            </select>

            <select
              value={filtroStatusEmpresa}
              onChange={(e) => setFiltroStatusEmpresa(e.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
            >
              <option>Todos</option>
              <option>Empresa ativa</option>
              <option>Empresa inativa</option>
              <option>Empresa inapta</option>
              <option>Empresa suspensa</option>
            </select>
          </div>

          {carregandoBanco && (
            <div className="rounded-3xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
              Carregando empresas e documentos...
            </div>
          )}

          {!carregandoBanco && empresasBanco.length === 0 && (
            <div className="rounded-3xl border border-dashed border-slate-300 p-8 text-center">
              <Building2 className="mx-auto h-10 w-10 text-slate-300" />
              <h3 className="mt-3 font-bold text-slate-900">Nenhuma empresa cadastrada</h3>
              <p className="mt-1 text-sm text-slate-500">Cadastre a contratante e as terceirizadas no formulário ao lado.</p>
            </div>
          )}

          {!carregandoBanco && empresasBanco.length > 0 && empresasFiltradas.length === 0 && (
            <div className="rounded-3xl border border-dashed border-slate-300 p-8 text-center">
              <Search className="mx-auto h-10 w-10 text-slate-300" />
              <h3 className="mt-3 font-bold text-slate-900">Nenhuma empresa encontrada</h3>
              <p className="mt-1 text-sm text-slate-500">Altere a pesquisa ou os filtros para visualizar empresas.</p>
            </div>
          )}

          {!carregandoBanco && empresasFiltradas.length > 0 && (
            <div className="space-y-6">
              <section>
                <div className="mb-3 flex items-center gap-2">
                  <div className="rounded-xl bg-slate-950 p-2 text-white">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-950">Empresa contratante</h3>
                    <p className="text-xs text-slate-500">Idealiza Cidades / empresa principal do controle documental</p>
                  </div>
                </div>

                {empresasContratantes.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
                    Nenhuma empresa contratante cadastrada. Cadastre a empresa como <strong>Contratante - Idealiza Cidades</strong>.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {empresasContratantes.map((empresa) => {
                      const docs = documentosPorEmpresa[empresa.id] || [];
                      return renderEmpresaCard(empresa, docs, true);
                    })}
                  </div>
                )}
              </section>

              <section>
                <div className="mb-3 flex items-center gap-2">
                  <div className="rounded-xl bg-slate-100 p-2 text-slate-700">
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-950">Empresas terceirizadas</h3>
                    <p className="text-xs text-slate-500">Prestadoras de serviço vinculadas ao controle de documentos</p>
                  </div>
                </div>

                {empresasTerceirizadas.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
                    Nenhuma empresa terceirizada cadastrada.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {empresasTerceirizadas.map((empresa) => {
                      const docs = documentosPorEmpresa[empresa.id] || [];
                      return renderEmpresaCard(empresa, docs, false);
                    })}
                  </div>
                )}
              </section>

              {gruposSubcontratadas.length > 0 && (
                <section className="space-y-5">
                  {gruposSubcontratadas.map((grupo) => {
                    const nomeContratante = grupo.contratante?.nome || "empresa não vinculada";

                    return (
                      <div key={grupo.contratante?.id || "sem-vinculo"}>
                        <div className="mb-3 flex items-center gap-2">
                          <div className="rounded-xl bg-slate-100 p-2 text-slate-700">
                            <Building2 className="h-4 w-4" />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-950">
                              {grupo.contratante
                                ? `Subcontratadas da ${nomeContratante}`
                                : "Subcontratadas sem empresa contratante"}
                            </h3>
                            <p className="text-xs text-slate-500">
                              {grupo.contratante
                                ? `Empresas contratadas por ${nomeContratante}`
                                : "Empresas subcontratadas ainda sem vínculo com uma terceirizada"}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-4">
                          {grupo.empresas.map((empresa) => {
                            const docs = documentosPorEmpresa[empresa.id] || [];
                            return renderEmpresaCard(empresa, docs, false);
                          })}
                        </div>
                      </div>
                    );
                  })}
                </section>
              )}
            </div>
          )}
          {empresasBanco.length > 0 && (
            <div className="mt-8 border-t border-slate-200 pt-5">
              <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">
                Relatórios gerais em PDF
              </p>

              <div className="flex flex-wrap justify-center gap-3">
                <button
                  onClick={baixarRelatorioEmpresas}
                  className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-xs font-semibold text-white hover:bg-slate-800"
                >
                  <Download className="h-4 w-4" />
                  Baixar PDF geral
                </button>

                <button
                  onClick={baixarRelatorioPendencias}
                  className="inline-flex items-center gap-2 rounded-2xl bg-orange-50 px-5 py-3 text-xs font-semibold text-orange-700 ring-1 ring-orange-200 hover:bg-orange-100"
                >
                  <AlertTriangle className="h-4 w-4" />
                  Baixar PDF pendências
                </button>

              </div>
            </div>
          )}

        </Card>      </div>

      {empresaEdicao && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-hidden bg-slate-950/70 p-4 md:items-center">
          <div className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-[2rem] bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white p-6 pb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Editar empresa</p>
                <h2 className="mt-1 text-2xl font-bold text-slate-950">{empresaEdicao.nome}</h2>
                <p className="mt-1 text-sm text-slate-500">Atualize os dados cadastrais da empresa terceirizada.</p>
              </div>
              <button
                onClick={() => setEmpresaEdicao(null)}
                className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
              >
                Fechar
              </button>
            </div>

            <div className="scrollbar-discreta flex-1 overflow-y-auto px-6 py-5">
              <div className="grid gap-3 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Nome da empresa</label>
                <input
                  value={empresaEdicao.nome}
                  onChange={(e) => setEmpresaEdicao({ ...empresaEdicao, nome: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">CNPJ</label>
                <input
                  value={empresaEdicao.cnpj}
                  onChange={(e) => setEmpresaEdicao({ ...empresaEdicao, cnpj: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Status</label>
                <select
                  value={normalizarStatusEmpresa(empresaEdicao.status)}
                  onChange={(e) => setEmpresaEdicao({ ...empresaEdicao, status: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                >
                  <option>Empresa ativa</option>
                  <option>Empresa inativa</option>
                  <option>Empresa inapta</option>
                  <option>Empresa suspensa</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Tipo da empresa</label>
                <select
                  value={empresaEdicao.tipoEmpresa}
                  onChange={(e) => setEmpresaEdicao({ ...empresaEdicao, tipoEmpresa: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                >
                  <option>Terceirizada</option>
                  <option>Subcontratada</option>
                  <option>Contratante - Idealiza Cidades</option>
                </select>
              </div>

              {empresaEdicao.tipoEmpresa === "Subcontratada" && (
                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                    Empresa terceirizada contratante direta
                  </label>
                  <select
                    value={empresaEdicao.empresaPaiId}
                    onChange={(e) => setEmpresaEdicao({ ...empresaEdicao, empresaPaiId: e.target.value })}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                  >
                    <option value="">Selecione a empresa contratante direta</option>
                    {empresasBanco
                      .filter((empresa) => empresa.id !== empresaEdicao.id && (empresa.tipo_empresa || "Terceirizada") !== "Subcontratada")
                      .map((empresa) => (
                        <option key={empresa.id} value={empresa.id}>
                          {empresa.nome}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Responsável</label>
                <input
                  value={empresaEdicao.responsavel}
                  onChange={(e) => setEmpresaEdicao({ ...empresaEdicao, responsavel: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">E-mail</label>
                <input
                  value={empresaEdicao.email}
                  onChange={(e) => setEmpresaEdicao({ ...empresaEdicao, email: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Telefone</label>
                <input
                  value={empresaEdicao.telefone}
                  onChange={(e) => setEmpresaEdicao({ ...empresaEdicao, telefone: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Logo da empresa</label>
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-600 hover:bg-slate-100">
                  <Upload className="h-4 w-4" />
                  {empresaEdicao.logo ? empresaEdicao.logo.name : empresaEdicao.logoNomeAtual || "Alterar logo da empresa"}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    className="hidden"
                    onChange={(e) => setEmpresaEdicao({ ...empresaEdicao, logo: e.target.files?.[0] || null })}
                  />
                </label>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Nº do contrato</label>
                <input
                  value={empresaEdicao.numeroContrato}
                  onChange={(e) => setEmpresaEdicao({ ...empresaEdicao, numeroContrato: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Responsável da contratante</label>
                <input
                  value={empresaEdicao.responsavelContratante}
                  onChange={(e) => setEmpresaEdicao({ ...empresaEdicao, responsavelContratante: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Início do contrato</label>
                <input
                  type="date"
                  value={empresaEdicao.dataInicioContrato}
                  onChange={(e) => setEmpresaEdicao({ ...empresaEdicao, dataInicioContrato: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Fim do contrato</label>
                <input
                  type="date"
                  value={empresaEdicao.dataFimContrato}
                  onChange={(e) => setEmpresaEdicao({ ...empresaEdicao, dataFimContrato: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Escopo do serviço</label>
                <textarea
                  value={empresaEdicao.escopoServico}
                  onChange={(e) => setEmpresaEdicao({ ...empresaEdicao, escopoServico: e.target.value })}
                  rows={3}
                  className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Observação de bloqueio/suspensão</label>
                <textarea
                  value={empresaEdicao.observacaoStatus}
                  onChange={(e) => setEmpresaEdicao({ ...empresaEdicao, observacaoStatus: e.target.value })}
                  rows={2}
                  className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                />
              </div>
              </div>
            </div>

            <div className="sticky bottom-0 z-10 flex flex-col gap-3 border-t border-slate-200 bg-white p-6 sm:flex-row">
              <button
                onClick={salvarEdicaoEmpresa}
                disabled={salvandoEdicaoEmpresa}
                className="flex-1 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {salvandoEdicaoEmpresa ? "Salvando alterações..." : "Salvar alterações"}
              </button>

              <button
                onClick={() => setEmpresaEdicao(null)}
                className="flex-1 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-200"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {empresaRevisao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-slate-950/70 p-4">
          <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl">
            <div className="shrink-0 border-b border-slate-200 bg-white p-6 pb-4">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Revisão documental da empresa</p>
                <h2 className="mt-1 text-2xl font-bold text-slate-950">{empresaRevisao.empresa.nome}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  CNPJ: {empresaRevisao.empresa.cnpj || "Não informado"} · Responsável: {empresaRevisao.empresa.responsavel || "-"}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  E-mail: {empresaRevisao.empresa.email || "-"} · Telefone: {empresaRevisao.empresa.telefone || "-"}
                </p>
              </div>

              <button
                onClick={() => setEmpresaRevisao(null)}
                className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Fechar revisão
              </button>
              </div>
            </div>

            <div className="scrollbar-discreta flex-1 overflow-y-auto px-6 py-5">
              <div className="grid items-stretch gap-4 md:grid-cols-3">
              {documentosEmpresaBase.map((tipoDoc) => {
                const docsAtualizadosRevisao = documentosPorEmpresa[empresaRevisao.empresa.id] || [];
                const doc = docsAtualizadosRevisao.find((item) => item.tipo_documento === tipoDoc.tipo);
                const st = statusEmpresaDocumento(doc?.data_vencimento);
                const dadosUpload = obterUploadRevisao(tipoDoc.tipo);
                const chaveUpload = `${empresaRevisao.empresa.id}-${tipoDoc.tipo}`;

                return (
                  <div key={tipoDoc.tipo} className="flex h-full min-h-[610px] flex-col rounded-3xl border border-slate-200 p-4">
                    <div className="mb-3 flex min-h-[88px] items-start justify-between gap-2">
                      <div className="pr-2">
                        <h3 className="text-lg font-bold text-slate-950">{tipoDoc.nome}</h3>
                        <p className="min-h-[48px] text-xs leading-relaxed text-slate-400">{tipoDoc.fundamento}</p>
                      </div>
                      <div className="shrink-0">
                        {doc ? <StatusPill status={st} small /> : <span className="rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-200">Pendente</span>}
                      </div>
                    </div>

                    <div className="flex min-h-[245px] flex-col justify-between rounded-2xl bg-white text-sm text-slate-600">
                      <div className="space-y-2">
                        <p className="min-h-[96px] leading-relaxed"><strong>Regra:</strong> {tipoDoc.regra}</p>
                        <p><strong>Emissão:</strong> {doc ? formatDate(doc.data_emissao) : "Documento não enviado"}</p>
                        <p><strong>Próxima revisão:</strong> {doc?.data_vencimento ? formatDate(doc.data_vencimento) : "Sem revisão definida"}</p>
                        <p className="break-words"><strong>Arquivo:</strong> {doc?.arquivo_nome || "Arquivo ainda não anexado"}</p>
                      </div>

                      {doc?.observacao && (
                        <p className="mt-2 text-xs leading-relaxed text-slate-500">
                          <strong>Observação:</strong> {doc.observacao}
                        </p>
                      )}
                    </div>

                    <div className="mt-5 min-h-[190px] rounded-2xl bg-slate-50 p-3">
                      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                        {doc ? "Substituir documento" : "Enviar documento"}
                      </p>

                      <div className="grid gap-2">
                        <div className="grid gap-2 sm:grid-cols-2">
                          <div>
                            <label className="mb-1 block text-[11px] font-semibold text-slate-500">Emissão</label>
                            <input
                              type="date"
                              value={dadosUpload.dataEmissao}
                              onChange={(e) => atualizarUploadRevisao(tipoDoc.tipo, "dataEmissao", e.target.value)}
                              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                            />
                          </div>

                          <div>
                            <label className="mb-1 block text-[11px] font-semibold text-slate-500">Próxima revisão</label>
                            <input
                              type="date"
                              value={dadosUpload.dataVencimento || ""}
                              onChange={(e) => atualizarUploadRevisao(tipoDoc.tipo, "dataVencimento", e.target.value)}
                              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                            />
                          </div>
                        </div>

                        <textarea
                          value={dadosUpload.observacao}
                          onChange={(e) => atualizarUploadRevisao(tipoDoc.tipo, "observacao", e.target.value)}
                          placeholder="Observação opcional"
                          rows={2}
                          className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                        />

                        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100">
                          <Upload className="h-3.5 w-3.5" />
                          {salvandoUploadRevisao === chaveUpload
                            ? "Enviando..."
                            : doc
                              ? "Selecionar PDF para substituir"
                              : "Selecionar PDF para enviar"}
                          <input
                            type="file"
                            accept="application/pdf,image/*"
                            className="hidden"
                            disabled={salvandoUploadRevisao === chaveUpload}
                            onChange={(e) => enviarDocumentoPelaRevisao(empresaRevisao.empresa, tipoDoc.tipo, e.target.files?.[0])}
                          />
                        </label>
                      </div>
                    </div>

                    {doc && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          onClick={() => onVisualizarDocumentoEmpresa(doc)}
                          disabled={!doc.arquivo_url}
                          className="inline-flex items-center gap-1 rounded-xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Visualizar documento
                        </button>

                        <button
                          onClick={() => onExcluirDocumentoEmpresa(doc)}
                          className="inline-flex items-center gap-1 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-100"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Excluir documento
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

              <div className="mt-5 rounded-3xl bg-slate-50 p-4 text-sm text-slate-600">
                <strong>Observação técnica:</strong> este painel serve para conferência documental. A validade automática é um controle interno e deve ser confirmada pelo responsável de SST conforme o documento emitido, escopo da empresa, alterações de risco e exigências contratuais do cliente.
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
function Requisitos() {
  const requisitos = [
    "Login com Supabase Auth.",
    "Colaboradores cadastrados no banco Supabase.",
    "Empresas criadas automaticamente no banco quando informadas no cadastro.",
    "Exclusão de colaboradores diretamente na tabela colaboradores.",
    "QR Code individual com link real de consulta e token aleatório, sem CPF ou dado sensível.",
    "Visualização dos documentos enviados por link temporário seguro do Supabase Storage.",
    "Próximo passo: salvar certificados dos colaboradores em Supabase Storage e tabela certificados.",
  ];

  const tabelas = [
    { nome: "empresas", campos: "id, nome, cnpj, responsavel, email, telefone, status, created_at" },
    { nome: "colaboradores", campos: "id, empresa_id, nome, funcao, matricula, token_qr, status, created_at" },
    { nome: "treinamentos", campos: "id, nome, categoria, validade_padrao_dias, obrigatorio, created_at" },
    { nome: "certificados", campos: "id, colaborador_id, treinamento_id, arquivo_url, data_realizacao, data_vencimento, status_validacao" },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Header titulo="Roteiro técnico do projeto" subtitulo="Etapas para transformar este protótipo em sistema real." />

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card>
          <h2 className="text-lg font-bold text-slate-950">Funcionalidades atuais</h2>

          <div className="mt-4 space-y-3">
            {requisitos.map((r, idx) => (
              <div key={idx} className="flex gap-3 rounded-2xl bg-slate-50 p-3 text-sm text-slate-700">
                <BadgeCheck className="mt-0.5 h-4 w-4 flex-none text-emerald-600" />
                <span>{r}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-950">
            <Database className="h-5 w-5" />
            Tabelas utilizadas
          </h2>

          <div className="mt-4 space-y-3">
            {tabelas.map((t) => (
              <div key={t.nome} className="rounded-3xl border border-slate-200 p-4">
                <p className="font-bold text-slate-950">{t.nome}</p>
                <p className="mt-1 text-xs text-slate-500">{t.campos}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </motion.div>
  );
}

export default function App() {
  const [usuario, setUsuario] = useState(null);
  const [carregandoSessao, setCarregandoSessao] = useState(true);
  const [tela, setTela] = useState("dashboard");
  const [colaboradores, setColaboradores] = useState([]);
  const [empresasBanco, setEmpresasBanco] = useState([]);
  const [documentosEmpresas, setDocumentosEmpresas] = useState([]);
  const [carregandoBanco, setCarregandoBanco] = useState(false);
  const [erroBanco, setErroBanco] = useState("");
  const [colaboradorSelecionado, setColaboradorSelecionado] = useState(null);
  const [consultaPublica, setConsultaPublica] = useState(null);
  const [carregandoConsultaPublica, setCarregandoConsultaPublica] = useState(false);
  const [erroConsultaPublica, setErroConsultaPublica] = useState("");

  const carregarEmpresas = useCallback(async () => {
    const { data, error } = await supabase
      .from("empresas")
      .select("id, nome, cnpj, responsavel, email, telefone, status, tipo_empresa, logo_url, logo_nome, numero_contrato, data_inicio_contrato, data_fim_contrato, responsavel_contratante, escopo_servico, observacao_status, empresa_pai_id")
      .order("nome", { ascending: true });

    if (error) {
      throw new Error(`Erro ao carregar empresas: ${error.message}`);
    }

    setEmpresasBanco(data || []);
    return data || [];
  }, []);

  const carregarDocumentosEmpresas = useCallback(async () => {
    const { data, error } = await supabase
      .from("documentos_empresas")
      .select("id, empresa_id, tipo_documento, data_emissao, data_vencimento, arquivo_url, arquivo_nome, observacao, status_validacao, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Erro ao carregar documentos das empresas: ${error.message}`);
    }

    setDocumentosEmpresas(data || []);
    return data || [];
  }, []);

  const carregarColaboradores = useCallback(async () => {
    setCarregandoBanco(true);
    setErroBanco("");

    try {
      const empresas = await carregarEmpresas();
      await carregarDocumentosEmpresas();

      const { data, error } = await supabase
        .from("colaboradores")
        .select(`
          id,
          nome,
          funcao,
          matricula,
          codigo_funcionario,
          status_mobilizacao,
          treinamentos_removidos,
          treinamentos_adicionais,
          foto_url,
          foto_nome,
          token_qr,
          status,
          empresa_id,
          empresas (
            id,
            nome,
            tipo_empresa,
            empresa_pai_id
          )
        `)
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(`Erro ao carregar colaboradores: ${error.message}`);
      }

      const empresasPorId = (empresas || []).reduce((acc, empresa) => {
        acc[empresa.id] = empresa;
        return acc;
      }, {});

      const normalizados = (data || []).map((item) => {
        const colaborador = normalizarColaborador(item);
        const empresaAtual = empresasPorId[colaborador.empresaId] || null;
        const empresaPai = empresaAtual?.empresa_pai_id ? empresasPorId[empresaAtual.empresa_pai_id] : null;
        const ehSubcontratada = Boolean(empresaPai);

        return {
          ...colaborador,
          empresaTipo: empresaAtual?.tipo_empresa || colaborador.empresaTipo || "",
          empresaPaiId: empresaAtual?.empresa_pai_id || colaborador.empresaPaiId || null,
          empresaPaiNome: empresaPai?.nome || colaborador.empresaPaiNome || "",
          empresaExibicao: ehSubcontratada
            ? `${empresaPai.nome} / Subcontratada: ${empresaAtual.nome}`
            : colaborador.empresa,
        };
      });

      const idsColaboradores = normalizados.map((colaborador) => colaborador.id);
      let certificadosPorColaborador = {};

      if (idsColaboradores.length > 0) {
        const { data: certificadosData, error: certificadosError } = await supabase
          .from("certificados")
          .select("id, colaborador_id, tipo_treinamento, treinamento_codigo, treinamento_id, nome_treinamento, data_realizacao, data_vencimento, arquivo_url, arquivo_nome, observacao, status_validacao, created_at")
          .in("colaborador_id", idsColaboradores)
          .order("created_at", { ascending: false });

        if (certificadosError) {
          throw new Error(`Erro ao carregar certificados: ${certificadosError.message}`);
        }

        certificadosPorColaborador = (certificadosData || []).reduce((acc, item) => {
          const certificado = normalizarCertificado(item);
          if (!acc[certificado.colaboradorId]) acc[certificado.colaboradorId] = [];
          acc[certificado.colaboradorId].push(certificado);
          return acc;
        }, {});
      }

      const colaboradoresComCertificados = normalizados.map((colaborador) => ({
        ...colaborador,
        treinamentos: certificadosPorColaborador[colaborador.id] || [],
      }));

      setColaboradores(colaboradoresComCertificados);
      setColaboradorSelecionado((atual) => atual || colaboradoresComCertificados[0] || null);

      if (colaboradoresComCertificados.length === 0 && empresas.length === 0) {
        setColaboradores([]);
      }
    } catch (error) {
      setErroBanco(error.message || "Erro ao conectar ao banco de dados.");
    } finally {
      setCarregandoBanco(false);
    }
  }, [carregarEmpresas, carregarDocumentosEmpresas]);

  async function enviarLogoEmpresa(arquivo, empresaId) {
    if (!arquivo) return { logoUrl: null, logoNome: null };

    const nomeSeguro = sanitizarNomeArquivo(arquivo.name);
    const caminho = `${empresaId || "nova-empresa"}/${Date.now()}-${nomeSeguro}`;

    const { error } = await supabase.storage
      .from("logos-empresas")
      .upload(caminho, arquivo, {
        cacheControl: "3600",
        upsert: true,
        contentType: arquivo.type || "image/png",
      });

    if (error) {
      throw new Error(`Erro ao enviar logo: ${error.message}`);
    }

    return { logoUrl: caminho, logoNome: nomeSeguro };
  }

  async function adicionarEmpresa(novaEmpresa) {
    setErroBanco("");

    try {
      const existente = empresasBanco.find(
        (empresa) => empresa.nome.toLowerCase() === novaEmpresa.nome.toLowerCase()
      );

      if (existente) {
        setErroBanco("Essa empresa já está cadastrada.");
        return false;
      }

      let { data, error } = await supabase
        .from("empresas")
        .insert({
          nome: novaEmpresa.nome,
          cnpj: novaEmpresa.cnpj || null,
          responsavel: novaEmpresa.responsavel || null,
          email: novaEmpresa.email || null,
          telefone: novaEmpresa.telefone || null,
          tipo_empresa: novaEmpresa.tipoEmpresa || "Terceirizada",
          empresa_pai_id: novaEmpresa.empresaPaiId || null,
          status: "Empresa ativa",
          numero_contrato: novaEmpresa.numeroContrato || null,
          data_inicio_contrato: novaEmpresa.dataInicioContrato || null,
          data_fim_contrato: novaEmpresa.dataFimContrato || null,
          responsavel_contratante: novaEmpresa.responsavelContratante || null,
          escopo_servico: novaEmpresa.escopoServico || null,
          observacao_status: novaEmpresa.observacaoStatus || null,
        })
        .select("id, nome, cnpj, responsavel, email, telefone, status, tipo_empresa, logo_url, logo_nome, numero_contrato, data_inicio_contrato, data_fim_contrato, responsavel_contratante, escopo_servico, observacao_status, empresa_pai_id")
        .single();

      if (error) {
        throw new Error(`Erro ao cadastrar empresa: ${error.message}`);
      }

      if (novaEmpresa.logo) {
        const logo = await enviarLogoEmpresa(novaEmpresa.logo, data.id);

        const { data: empresaComLogo, error: logoError } = await supabase
          .from("empresas")
          .update({
            logo_url: logo.logoUrl,
            logo_nome: logo.logoNome,
          })
          .eq("id", data.id)
          .select("id, nome, cnpj, responsavel, email, telefone, status, tipo_empresa, logo_url, logo_nome, numero_contrato, data_inicio_contrato, data_fim_contrato, responsavel_contratante, escopo_servico, observacao_status, empresa_pai_id")
          .single();

        if (logoError) {
          throw new Error(`Empresa cadastrada, mas houve erro ao salvar o logo: ${logoError.message}`);
        }

        data = empresaComLogo;
      }

      setEmpresasBanco((atual) => [data, ...atual].sort((a, b) => a.nome.localeCompare(b.nome)));
      return true;
    } catch (error) {
      setErroBanco(error.message || "Erro ao cadastrar empresa.");
      return false;
    }
  }

  async function atualizarEmpresa(empresaAtualizada) {
    setErroBanco("");

    try {
      let logoAtualizada = {
        logo_url: empresaAtualizada.logoAtual || null,
        logo_nome: empresaAtualizada.logoNomeAtual || null,
      };

      if (empresaAtualizada.logo) {
        const logo = await enviarLogoEmpresa(empresaAtualizada.logo, empresaAtualizada.id);
        logoAtualizada = {
          logo_url: logo.logoUrl,
          logo_nome: logo.logoNome,
        };
      }

      const { data, error } = await supabase
        .from("empresas")
        .update({
          nome: empresaAtualizada.nome,
          cnpj: empresaAtualizada.cnpj || null,
          responsavel: empresaAtualizada.responsavel || null,
          email: empresaAtualizada.email || null,
          telefone: empresaAtualizada.telefone || null,
          status: normalizarStatusEmpresa(empresaAtualizada.status),
          tipo_empresa: empresaAtualizada.tipoEmpresa || "Terceirizada",
          empresa_pai_id: empresaAtualizada.tipoEmpresa === "Subcontratada" ? empresaAtualizada.empresaPaiId : null,
          logo_url: logoAtualizada.logo_url,
          logo_nome: logoAtualizada.logo_nome,
          numero_contrato: empresaAtualizada.numeroContrato || null,
          data_inicio_contrato: empresaAtualizada.dataInicioContrato || null,
          data_fim_contrato: empresaAtualizada.dataFimContrato || null,
          responsavel_contratante: empresaAtualizada.responsavelContratante || null,
          escopo_servico: empresaAtualizada.escopoServico || null,
          observacao_status: empresaAtualizada.observacaoStatus || null,
        })
        .eq("id", empresaAtualizada.id)
        .select("id, nome, cnpj, responsavel, email, telefone, status, tipo_empresa, logo_url, logo_nome, numero_contrato, data_inicio_contrato, data_fim_contrato, responsavel_contratante, escopo_servico, observacao_status, empresa_pai_id")
        .single();

      if (error) {
        throw new Error(`Erro ao atualizar empresa: ${error.message}`);
      }

      setEmpresasBanco((atual) =>
        atual.map((empresa) => (empresa.id === data.id ? data : empresa)).sort((a, b) => a.nome.localeCompare(b.nome))
      );

      setColaboradores((atual) =>
        atual.map((colaborador) =>
          colaborador.empresaId === data.id ? { ...colaborador, empresa: data.nome } : colaborador
        )
      );

      return true;
    } catch (error) {
      setErroBanco(error.message || "Erro ao atualizar empresa.");
      return false;
    }
  }

  async function adicionarDocumentoEmpresa(novoDoc) {
    setErroBanco("");

    try {
      let arquivoUrl = null;
      let arquivoNome = novoDoc.arquivo?.name || null;

      if (novoDoc.arquivo) {
        const nomeSeguro = sanitizarNomeArquivo(novoDoc.arquivo.name);
        const tipoSeguro = sanitizarNomeArquivo(novoDoc.tipo);
        const caminho = `${novoDoc.empresaId}/${tipoSeguro}-${Date.now()}-${nomeSeguro}`;

        const { error: uploadError } = await supabase.storage
          .from("documentos-empresas")
          .upload(caminho, novoDoc.arquivo, {
            cacheControl: "3600",
            upsert: true,
            contentType: novoDoc.arquivo.type || "application/pdf",
          });

        if (uploadError) {
          throw new Error(`Erro no upload do documento: ${uploadError.message}`);
        }

        arquivoUrl = caminho;
        arquivoNome = nomeSeguro;
      }

      const { data, error } = await supabase
        .from("documentos_empresas")
        .upsert(
          {
            empresa_id: novoDoc.empresaId,
            tipo_documento: novoDoc.tipo,
            data_emissao: novoDoc.dataEmissao,
            data_vencimento: novoDoc.dataVencimento,
            arquivo_url: arquivoUrl,
            arquivo_nome: arquivoNome,
            observacao: novoDoc.observacao || null,
            status_validacao: "Validado",
          },
          { onConflict: "empresa_id,tipo_documento" }
        )
        .select("id, empresa_id, tipo_documento, data_emissao, data_vencimento, arquivo_url, arquivo_nome, observacao, status_validacao, created_at")
        .single();

      if (error) {
        throw new Error(`Erro ao salvar documento: ${error.message}`);
      }

      setDocumentosEmpresas((atual) => [
        data,
        ...atual.filter(
          (item) => !(item.empresa_id === data.empresa_id && item.tipo_documento === data.tipo_documento)
        ),
      ]);

      return true;
    } catch (error) {
      setErroBanco(error.message || "Erro ao salvar documento da empresa.");
      return false;
    }
  }

  async function excluirDocumentoEmpresa(documento) {
    const confirmar = window.confirm(`Deseja excluir definitivamente o documento ${documento.tipo_documento} desta empresa?`);

    if (!confirmar) return;

    setErroBanco("");

    const { error } = await supabase
      .from("documentos_empresas")
      .delete()
      .eq("id", documento.id);

    if (error) {
      setErroBanco(`Erro ao remover documento: ${error.message}`);
      return;
    }

    if (documento.arquivo_url) {
      await supabase.storage.from("documentos-empresas").remove([documento.arquivo_url]);
    }

    setDocumentosEmpresas((atual) => atual.filter((item) => item.id !== documento.id));
  }

  async function visualizarDocumentoEmpresa(documento) {
    setErroBanco("");

    if (!documento?.arquivo_url) {
      setErroBanco("Este documento ainda não possui arquivo anexado para visualização.");
      return;
    }

    const { data, error } = await supabase.storage
      .from("documentos-empresas")
      .createSignedUrl(documento.arquivo_url, 60 * 10);

    if (error) {
      setErroBanco(`Erro ao gerar link de visualização: ${error.message}`);
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function obterOuCriarEmpresa(nomeEmpresa) {
    const nomeTratado = nomeEmpresa.trim();

    const existente = empresasBanco.find(
      (empresa) => empresa.nome.toLowerCase() === nomeTratado.toLowerCase()
    );

    if (existente) return existente;

    const { data, error } = await supabase
      .from("empresas")
      .insert({
        nome: nomeTratado,
        status: "Empresa ativa",
      })
      .select("id, nome, cnpj, responsavel, email, telefone, status, tipo_empresa, logo_url, logo_nome, numero_contrato, data_inicio_contrato, data_fim_contrato, responsavel_contratante, escopo_servico, observacao_status, empresa_pai_id")
      .single();

    if (error) {
      throw new Error(`Erro ao criar empresa: ${error.message}`);
    }

    setEmpresasBanco((atual) => [...atual, data].sort((a, b) => a.nome.localeCompare(b.nome)));
    return data;
  }

  async function enviarFotoColaborador(arquivo, colaboradorId) {
    if (!arquivo) return { fotoUrl: null, fotoNome: null };

    const nomeSeguro = sanitizarNomeArquivo(arquivo.name);
    const caminho = `${colaboradorId}/${Date.now()}-${nomeSeguro}`;

    const { error } = await supabase.storage
      .from("fotos-colaboradores")
      .upload(caminho, arquivo, {
        cacheControl: "3600",
        upsert: true,
        contentType: arquivo.type || "image/png",
      });

    if (error) {
      throw new Error(`Erro ao enviar foto do colaborador: ${error.message}`);
    }

    return { fotoUrl: caminho, fotoNome: nomeSeguro };
  }

  async function adicionarColaborador(novo) {
    setErroBanco("");

    try {
      const empresaCriada = await obterOuCriarEmpresa(novo.empresaNome);

      let { data, error } = await supabase
        .from("colaboradores")
        .insert({
          empresa_id: empresaCriada.id,
          nome: novo.nome,
          funcao: novo.funcao,
          matricula: novo.matricula || null,
          codigo_funcionario: novo.codigoFuncionario || gerarCodigoFuncionario(novo.nome),
          status_mobilizacao: novo.statusMobilizacao || "Mobilizado",
          treinamentos_removidos: novo.treinamentosRemovidos || [],
          treinamentos_adicionais: novo.treinamentosAdicionais || [],
          status: "Ativo",
        })
        .select(`
          id,
          nome,
          funcao,
          matricula,
          codigo_funcionario,
          status_mobilizacao,
          treinamentos_removidos,
          treinamentos_adicionais,
          foto_url,
          foto_nome,
          token_qr,
          status,
          empresa_id,
          empresas (
            id,
            nome,
            tipo_empresa,
            empresa_pai_id
          )
        `)
        .single();

      if (error) {
        throw new Error(`Erro ao cadastrar colaborador: ${error.message}`);
      }

      if (novo.foto) {
        const foto = await enviarFotoColaborador(novo.foto, data.id);

        const { data: colaboradorComFoto, error: fotoError } = await supabase
          .from("colaboradores")
          .update({
            foto_url: foto.fotoUrl,
            foto_nome: foto.fotoNome,
          })
          .eq("id", data.id)
          .select(`
            id,
            nome,
            funcao,
            matricula,
            codigo_funcionario,
            status_mobilizacao,
            treinamentos_removidos,
            treinamentos_adicionais,
            foto_url,
            foto_nome,
            token_qr,
            status,
            empresa_id,
            empresas (
              id,
              nome
            )
          `)
          .single();

        if (fotoError) {
          throw new Error(`Colaborador cadastrado, mas houve erro ao salvar a foto: ${fotoError.message}`);
        }

        data = colaboradorComFoto;
      }

      const colaborador = normalizarColaborador(data);

      setColaboradores((atual) => [colaborador, ...atual]);
      setColaboradorSelecionado(colaborador);

      return true;
    } catch (error) {
      setErroBanco(error.message || "Erro ao cadastrar colaborador.");
      return false;
    }
  }

  async function atualizarColaborador(colaboradorAtualizado) {
    setErroBanco("");

    try {
      const empresaCriada = await obterOuCriarEmpresa(colaboradorAtualizado.empresaNome);

      let fotoAtualizada = {
        foto_url: colaboradorAtualizado.fotoAtual || null,
        foto_nome: colaboradorAtualizado.fotoNomeAtual || null,
      };

      if (colaboradorAtualizado.foto) {
        const foto = await enviarFotoColaborador(colaboradorAtualizado.foto, colaboradorAtualizado.id);
        fotoAtualizada = {
          foto_url: foto.fotoUrl,
          foto_nome: foto.fotoNome,
        };
      }

      const { data, error } = await supabase
        .from("colaboradores")
        .update({
          empresa_id: empresaCriada.id,
          nome: colaboradorAtualizado.nome,
          funcao: colaboradorAtualizado.funcao,
          matricula: colaboradorAtualizado.matricula || null,
          status: colaboradorAtualizado.status || "Ativo",
          status_mobilizacao: colaboradorAtualizado.statusMobilizacao || "Mobilizado",
          treinamentos_removidos: colaboradorAtualizado.treinamentosRemovidos || [],
          treinamentos_adicionais: colaboradorAtualizado.treinamentosAdicionais || [],
          foto_url: fotoAtualizada.foto_url,
          foto_nome: fotoAtualizada.foto_nome,
        })
        .eq("id", colaboradorAtualizado.id)
        .select(`
          id,
          nome,
          funcao,
          matricula,
          codigo_funcionario,
          status_mobilizacao,
          treinamentos_removidos,
          treinamentos_adicionais,
          foto_url,
          foto_nome,
          token_qr,
          status,
          empresa_id,
          empresas (
            id,
            nome,
            tipo_empresa,
            empresa_pai_id
          )
        `)
        .single();

      if (error) {
        throw new Error(`Erro ao atualizar colaborador: ${error.message}`);
      }

      const colaborador = normalizarColaborador(data);

      setColaboradores((atual) => atual.map((item) => (item.id === colaborador.id ? { ...item, ...colaborador } : item)));

      if (colaboradorSelecionado?.id === colaborador.id) {
        setColaboradorSelecionado((atual) => ({ ...atual, ...colaborador }));
      }

      return true;
    } catch (error) {
      setErroBanco(error.message || "Erro ao atualizar colaborador.");
      return false;
    }
  }

  function codigoPastaCertificado(colaborador) {
    const codigo = String(colaborador?.codigoFuncionario || colaborador?.codigo_funcionario || "").trim();

    if (!codigo) {
      throw new Error("O colaborador não possui código do funcionário para organizar o arquivo no Storage.");
    }

    return sanitizarNomeArquivo(codigo).replace(/\.[^.]+$/, "");
  }

  async function enviarArquivoCertificado(arquivo, colaborador, treinamentoId) {
    if (!arquivo) return { arquivoUrl: null, arquivoNome: null };

    const nomeSeguro = sanitizarNomeArquivo(arquivo.name);
    const codigoPasta = codigoPastaCertificado(colaborador);
    const caminho = `${codigoPasta}/${treinamentoId}/${Date.now()}-${nomeSeguro}`;

    const { error } = await supabase.storage
      .from("certificados-treinamentos")
      .upload(caminho, arquivo, {
        cacheControl: "3600",
        upsert: true,
        contentType: arquivo.type || "application/pdf",
      });

    if (error) {
      throw new Error(`Erro ao enviar certificado: ${error.message}`);
    }

    return { arquivoUrl: caminho, arquivoNome: nomeSeguro };
  }

  async function sincronizarCertificadosDoStorage() {
    setErroBanco("");
    setCarregandoBanco(true);

    try {
      let sincronizados = 0;
      let ignorados = 0;

      for (const colaborador of colaboradores) {
        for (const treinamento of treinamentosBase) {
          const pasta = `${codigoPastaCertificado(colaborador)}/${treinamento.id}`;

          const { data: arquivos, error } = await supabase.storage
            .from("certificados-treinamentos")
            .list(pasta, {
              limit: 100,
              sortBy: { column: "created_at", order: "desc" },
            });

          if (error) {
            ignorados += 1;
            continue;
          }

          const arquivosValidos = (arquivos || []).filter((arquivo) => arquivo.name && !arquivo.name.endsWith("/"));

          if (arquivosValidos.length === 0) continue;

          const maisRecente = arquivosValidos.sort((a, b) => {
            const dataB = new Date(b.updated_at || b.created_at || 0).getTime();
            const dataA = new Date(a.updated_at || a.created_at || 0).getTime();
            return dataB - dataA;
          })[0];

          const dataRealizacao = (maisRecente.created_at || maisRecente.updated_at || hoje.toISOString()).slice(0, 10);
          const dataVencimento = calcularVencimentoTreinamento(treinamento.id, dataRealizacao);
          const caminho = `${pasta}/${maisRecente.name}`;

          const { error: upsertError } = await supabase
            .from("certificados")
            .upsert(
              {
                colaborador_id: colaborador.id,
                tipo_treinamento: treinamento.nome,
                treinamento_codigo: Number(treinamento.id),
                nome_treinamento: treinamento.nome,
                data_realizacao: dataRealizacao,
                data_vencimento: dataVencimento,
                arquivo_url: caminho,
                arquivo_nome: maisRecente.name,
                observacao: "Sincronizado automaticamente do Storage",
                status_validacao: "Validado",
              },
              { onConflict: "colaborador_id,tipo_treinamento" }
            );

          if (upsertError) {
            throw new Error(`Erro ao sincronizar ${colaborador.nome} / ${treinamento.nome}: ${upsertError.message}`);
          }

          sincronizados += 1;
        }
      }

      await carregarColaboradores();

      return `${sincronizados} certificado(s) sincronizado(s) do Storage para a tabela certificados. ${ignorados} pasta(s) ignorada(s).`;
    } catch (error) {
      setErroBanco(error.message || "Erro ao sincronizar arquivos do Storage.");
      return error.message || "Erro ao sincronizar arquivos do Storage.";
    } finally {
      setCarregandoBanco(false);
    }
  }

  async function salvarCertificadoTreinamento(certificado) {
    setErroBanco("");

    try {
      if (!certificado.colaboradorCodigo && !certificado.colaborador?.codigoFuncionario && !certificado.colaborador?.id) {
        throw new Error("Selecione o colaborador.");
      }

      if (!certificado.treinamentoId) {
        throw new Error("Selecione o treinamento/documento.");
      }

      if (!certificado.dataRealizacao) {
        throw new Error("Informe a data de realização/emissão.");
      }

      if (!certificado.dataVencimento) {
        throw new Error("Informe a validade/revisão do certificado.");
      }

      if (!certificado.arquivo) {
        throw new Error("Selecione o arquivo PDF ou imagem do certificado.");
      }

      const codigoInformado = String(
        certificado.colaboradorCodigo ||
        certificado.colaborador?.codigoFuncionario ||
        ""
      ).trim();

      const idInformadoSomenteSeUuid = ehUuid(certificado.colaborador?.id)
        ? String(certificado.colaborador.id)
        : "";

      let colaboradorSeguro =
        colaboradores.find((c) => String(c.codigoFuncionario) === codigoInformado) ||
        colaboradores.find((c) => idInformadoSomenteSeUuid && String(c.id) === idInformadoSomenteSeUuid) ||
        colaboradores.find((c) => String(c.codigoFuncionario) === String(colaboradorSelecionado?.codigoFuncionario || "")) ||
        null;

      if (!colaboradorSeguro?.id || !ehUuid(colaboradorSeguro.id)) {
        throw new Error(
          "Colaborador inválido. O sistema não encontrou o UUID do colaborador. Volte na aba Colaboradores, clique em Enviar treinamento e tente novamente."
        );
      }

      const colaboradorIdSeguro = String(colaboradorSeguro.id);
      const treinamentoIdSeguro = Number(certificado.treinamentoId);

      if (!Number.isFinite(treinamentoIdSeguro)) {
        throw new Error("Treinamento/documento inválido. Selecione novamente o documento.");
      }

      const treinamento = obterTreinamento(treinamentoIdSeguro);

      if (!treinamento) {
        throw new Error("Treinamento/documento não encontrado na base do sistema.");
      }

      // Mesmo padrão da foto do colaborador:
      // 1) identifica o colaborador corretamente;
      // 2) salva o arquivo no Storage em pasta organizada pelo código do funcionário;
      // 3) grava/atualiza a referência na tabela certificados usando o UUID real do colaborador.
      const arquivo = await enviarArquivoCertificado(
        certificado.arquivo,
        colaboradorSeguro,
        treinamentoIdSeguro
      );

      const payload = {
        colaborador_id: colaboradorIdSeguro,
        tipo_treinamento: treinamento.nome,
        treinamento_codigo: treinamentoIdSeguro,
        nome_treinamento: treinamento.nome,
        data_realizacao: certificado.dataRealizacao,
        data_vencimento: certificado.dataVencimento,
        arquivo_url: arquivo.arquivoUrl,
        arquivo_nome: certificado.arquivoNome || arquivo.arquivoNome,
        observacao: certificado.observacao || null,
        status_validacao: "Validado",
      };

      const { data: existentes, error: buscaError } = await supabase
        .from("certificados")
        .select("id, arquivo_url")
        .eq("colaborador_id", colaboradorIdSeguro)
        .eq("tipo_treinamento", treinamento.nome)
        .order("created_at", { ascending: false })
        .limit(1);

      if (buscaError) {
        throw new Error(`Erro ao verificar certificado existente: ${buscaError.message}`);
      }

      const existente = existentes?.[0] || null;

      const consulta = existente?.id
        ? supabase
            .from("certificados")
            .update(payload)
            .eq("id", existente.id)
        : supabase
            .from("certificados")
            .insert(payload);

      const { data, error } = await consulta
        .select("id, colaborador_id, tipo_treinamento, treinamento_codigo, treinamento_id, nome_treinamento, data_realizacao, data_vencimento, arquivo_url, arquivo_nome, observacao, status_validacao, created_at")
        .single();

      if (error) {
        throw new Error(`Erro ao salvar certificado na tabela certificados: ${error.message}`);
      }

      if (existente?.arquivo_url && existente.arquivo_url !== arquivo.arquivoUrl) {
        await supabase.storage.from("certificados-treinamentos").remove([existente.arquivo_url]);
      }

      const certificadoNormalizado = normalizarCertificado(data);

      setColaboradores((atual) =>
        atual.map((colaborador) => {
          if (String(colaborador.id) !== String(certificadoNormalizado.colaboradorId)) return colaborador;

          const demais = (colaborador.treinamentos || []).filter(
            (item) => Number(item.treinamentoId) !== Number(certificadoNormalizado.treinamentoId)
          );

          return {
            ...colaborador,
            treinamentos: [certificadoNormalizado, ...demais],
          };
        })
      );

      setColaboradorSelecionado((atual) => {
        if (!atual || String(atual.id) !== String(certificadoNormalizado.colaboradorId)) return atual;

        const demais = (atual.treinamentos || []).filter(
          (item) => Number(item.treinamentoId) !== Number(certificadoNormalizado.treinamentoId)
        );

        return {
          ...atual,
          treinamentos: [certificadoNormalizado, ...demais],
        };
      });

      await carregarColaboradores();

      return true;
    } catch (error) {
      setErroBanco(error.message || "Erro ao salvar certificado.");
      alert(error.message || "Erro ao salvar certificado.");
      return false;
    }
  }


  async function atualizarDatasCertificado(certificado, datas) {
    setErroBanco("");

    if (!certificado?.id) {
      setErroBanco("Certificado inválido para atualização.");
      return false;
    }

    const { data, error } = await supabase
      .from("certificados")
      .update({
        data_realizacao: datas.realizado,
        data_vencimento: datas.vencimento,
      })
      .eq("id", certificado.id)
      .select("id, colaborador_id, tipo_treinamento, treinamento_codigo, treinamento_id, nome_treinamento, data_realizacao, data_vencimento, arquivo_url, arquivo_nome, observacao, status_validacao, created_at")
      .single();

    if (error) {
      setErroBanco(`Erro ao atualizar datas do certificado: ${error.message}`);
      alert(`Erro ao atualizar datas do certificado: ${error.message}`);
      return false;
    }

    const atualizado = normalizarCertificado(data);

    setColaboradores((atual) =>
      atual.map((colaborador) => {
        if (String(colaborador.id) !== String(atualizado.colaboradorId)) return colaborador;

        return {
          ...colaborador,
          treinamentos: (colaborador.treinamentos || []).map((item) =>
            item.id === atualizado.id ? atualizado : item
          ),
        };
      })
    );

    setColaboradorSelecionado((atual) => {
      if (!atual || String(atual.id) !== String(atualizado.colaboradorId)) return atual;

      return {
        ...atual,
        treinamentos: (atual.treinamentos || []).map((item) =>
          item.id === atualizado.id ? atualizado : item
        ),
      };
    });

    await carregarColaboradores();

    return true;
  }

  async function visualizarCertificadoTreinamento(certificado) {
    setErroBanco("");

    if (!certificado?.arquivoUrl) {
      setErroBanco("Este certificado ainda não possui arquivo anexado.");
      return;
    }

    const { data, error } = await supabase.storage
      .from("certificados-treinamentos")
      .createSignedUrl(certificado.arquivoUrl, 60 * 10);

    if (error) {
      setErroBanco(`Erro ao gerar link do certificado: ${error.message}`);
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function excluirCertificadoTreinamento(certificado) {
    const treinamento = obterTreinamento(certificado.treinamentoId);
    const confirmar = window.confirm(`Deseja excluir o certificado ${treinamento.nome}?`);

    if (!confirmar) return;

    setErroBanco("");

    const { error } = await supabase
      .from("certificados")
      .delete()
      .eq("id", certificado.id);

    if (error) {
      setErroBanco(`Erro ao excluir certificado: ${error.message}`);
      return;
    }

    if (certificado.arquivoUrl) {
      await supabase.storage.from("certificados-treinamentos").remove([certificado.arquivoUrl]);
    }

    setColaboradores((atual) =>
      atual.map((colaborador) => {
        if (String(colaborador.id) !== String(certificado.colaboradorId)) return colaborador;

        return {
          ...colaborador,
          treinamentos: (colaborador.treinamentos || []).filter((item) => item.id !== certificado.id),
        };
      })
    );
  }

  async function excluirColaborador(colaborador) {
    const confirmar = window.confirm(`Deseja realmente excluir o colaborador ${colaborador.nome}?`);

    if (!confirmar) return;

    setErroBanco("");

    const { error } = await supabase
      .from("colaboradores")
      .delete()
      .eq("id", colaborador.id);

    if (error) {
      setErroBanco(`Erro ao excluir colaborador: ${error.message}`);
      return;
    }

    setColaboradores((atual) => atual.filter((item) => item.id !== colaborador.id));

    if (colaboradorSelecionado?.id === colaborador.id) {
      const restante = colaboradores.filter((item) => item.id !== colaborador.id);
      setColaboradorSelecionado(restante[0] || null);
    }
  }

  useEffect(() => {
    async function carregarSessao() {
      const { data } = await supabase.auth.getSession();

      if (data.session?.user) {
        setUsuario({
          id: data.session.user.id,
          email: data.session.user.email,
          perfil: "Técnico de Segurança",
        });
      }

      setCarregandoSessao(false);
    }

    carregarSessao();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUsuario({
          id: session.user.id,
          email: session.user.email,
          perfil: "Técnico de Segurança",
        });
      } else {
        setUsuario(null);
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const parametros = new URLSearchParams(window.location.search);
    const tokenQr = parametros.get("qr");

    if (!tokenQr) return;

    let ativo = true;

    async function carregarConsultaPublica() {
      setCarregandoConsultaPublica(true);
      setErroConsultaPublica("");

      const { data, error } = await supabase.rpc("consulta_publica_qr", {
        token_param: tokenQr,
      });

      if (!ativo) return;

      if (error) {
        setErroConsultaPublica(`Erro ao carregar consulta pública: ${error.message}`);
        setConsultaPublica(null);
      } else {
        setConsultaPublica(data);
      }

      setCarregandoConsultaPublica(false);
    }

    carregarConsultaPublica();

    return () => {
      ativo = false;
    };
  }, []);

  useEffect(() => {
    if (!usuario) return;

    const timer = window.setTimeout(() => {
      carregarColaboradores();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [usuario, carregarColaboradores]);

  useEffect(() => {
    if (!usuario || colaboradores.length === 0) return;

    const parametros = new URLSearchParams(window.location.search);
    const tokenQr = parametros.get("qr");

    if (!tokenQr) return;

    const timer = window.setTimeout(() => {
      const encontrado = colaboradores.find((item) => String(item.token) === String(tokenQr));

      if (encontrado) {
        setColaboradorSelecionado(encontrado);
        setTela("qr");
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [usuario, colaboradores]);

  const nav = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "empresas", label: "Empresas", icon: Building2 },
    { id: "colaboradores", label: "Colaboradores", icon: Users },
    { id: "treinamentos", label: "Treinamentos", icon: ClipboardCheck },
    { id: "qr", label: "Consulta QR", icon: QrCode },
    { id: "roteiro", label: "Roteiro", icon: CalendarClock },
  ];

  const selecionarColaborador = (c) => {
    setColaboradorSelecionado(c);
    setTela("qr");
  };

  const abrirEnvioTreinamento = (c) => {
    setColaboradorSelecionado(c);
    setTela("treinamentos");
  };

  const sair = async () => {
    await supabase.auth.signOut();
    setUsuario(null);
    setColaboradores([]);
    setEmpresasBanco([]);
    setDocumentosEmpresas([]);
    setColaboradorSelecionado(null);
  };

  if (carregandoSessao) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="rounded-3xl bg-white/10 p-6 text-center">
          <ShieldCheck className="mx-auto mb-3 h-8 w-8" />
          <p className="font-semibold">Carregando sistema...</p>
        </div>
      </div>
    );
  }

  const parametrosAtuais = new URLSearchParams(window.location.search);
  const tokenQrPublico = parametrosAtuais.get("qr");

  if (tokenQrPublico && !usuario) {
    if (carregandoConsultaPublica || carregandoSessao) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
          <div className="rounded-3xl bg-white/10 p-6 text-center">
            <QrCode className="mx-auto mb-3 h-8 w-8" />
            <p className="font-semibold">Carregando consulta pública...</p>
          </div>
        </div>
      );
    }

    if (erroConsultaPublica || !consultaPublica) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
          <div className="w-full max-w-lg rounded-[2rem] bg-white p-8 text-center shadow-sm">
            <XCircle className="mx-auto mb-3 h-10 w-10 text-red-500" />
            <h1 className="text-xl font-bold text-slate-950">QR Code não encontrado</h1>
            <p className="mt-2 text-sm text-slate-500">
              {erroConsultaPublica || "Não foi possível localizar a consulta pública deste colaborador."}
            </p>
          </div>
        </div>
      );
    }

    return <ConsultaQRPublica dados={consultaPublica} />;
  }

  if (!usuario) {
    return <LoginScreen onLogin={setUsuario} />;
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 border-r border-slate-200 bg-white p-5 lg:block">
          <div className="flex items-center gap-3 rounded-3xl bg-slate-950 p-4 text-white">
            <div className="rounded-2xl bg-white/10 p-3">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-bold">Controle SST QR</h1>
              <p className="text-xs text-slate-300">Treinamentos · Terceiros</p>
            </div>
          </div>

          <nav className="mt-6 space-y-2">
            {nav.map((item) => {
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  onClick={() => setTela(item.id)}
                  className={classNames(
                    "flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium transition",
                    tela === item.id
                      ? "bg-slate-950 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="mt-6 rounded-3xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Usuário logado</p>
            <p className="mt-1 break-all text-sm font-bold text-slate-900">{usuario.email}</p>
            <p className="mt-1 text-xs text-slate-500">Perfil: {usuario.perfil}</p>

            <button
              onClick={sair}
              className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"
            >
              Sair
            </button>
          </div>
        </aside>

        <main className="flex-1 p-4 md:p-8">
          <div className="mb-5 flex items-center justify-between rounded-3xl bg-white p-3 shadow-sm lg:hidden">
            <div className="flex items-center gap-2 font-bold">
              <ShieldCheck className="h-5 w-5" />
              Controle SST QR
            </div>

            <select
              value={tela}
              onChange={(e) => setTela(e.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              {nav.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.label}
                </option>
              ))}
            </select>
          </div>

          {tela === "dashboard" && (
            <Dashboard colaboradores={colaboradores} onSelectColab={selecionarColaborador} />
          )}

          {tela === "empresas" && (
            <Empresas
              empresasBanco={empresasBanco}
              documentosEmpresas={documentosEmpresas}
              colaboradores={colaboradores}
              carregandoBanco={carregandoBanco}
              erroBanco={erroBanco}
              onAtualizarBanco={carregarColaboradores}
              onAdicionarEmpresa={adicionarEmpresa}
              onAtualizarEmpresa={atualizarEmpresa}
              onAdicionarDocumentoEmpresa={adicionarDocumentoEmpresa}
              onExcluirDocumentoEmpresa={excluirDocumentoEmpresa}
              onVisualizarDocumentoEmpresa={visualizarDocumentoEmpresa}
            />
          )}

          {tela === "colaboradores" && (
            <Colaboradores
              colaboradores={colaboradores}
              empresasBanco={empresasBanco}
              carregandoBanco={carregandoBanco}
              erroBanco={erroBanco}
              onAtualizarBanco={carregarColaboradores}
              onAdicionarColaborador={adicionarColaborador}
              onAtualizarColaborador={atualizarColaborador}
              onExcluirColaborador={excluirColaborador}
              onSelectColab={selecionarColaborador}
              onEnviarTreinamento={abrirEnvioTreinamento}
            />
          )}

          {tela === "treinamentos" && (
            <Treinamentos
              key={colaboradorSelecionado?.id || "treinamentos"}
              colaboradores={colaboradores}
              colaboradorInicialId={colaboradorSelecionado?.id}
              onSalvarCertificado={salvarCertificadoTreinamento}
              onVisualizarCertificado={visualizarCertificadoTreinamento}
              onExcluirCertificado={excluirCertificadoTreinamento}
              onAtualizarDatasCertificado={atualizarDatasCertificado}
              onSincronizarStorage={sincronizarCertificadosDoStorage}
            />
          )}

          {tela === "qr" && (
            <ConsultaQR
              colaborador={colaboradorSelecionado}
              colaboradores={colaboradores}
              onSelecionarColaborador={setColaboradorSelecionado}
            />
          )}

          {tela === "roteiro" && <Requisitos />}
        </main>
      </div>
    </div>
  );
}
