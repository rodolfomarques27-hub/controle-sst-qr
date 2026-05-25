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
    ChevronDown,
    ChevronUp,
    CheckCircle2,
    ClipboardCheck,
    Database,
    Download,
    Eye,
    EyeOff,
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
const SENHA_AUDITORIA = import.meta.env.VITE_SENHA_AUDITORIA || "Rodolfo@2026";
const EMAIL_DESTINATARIO_ALERTAS = import.meta.env.VITE_EMAIL_ALERTA_SST || "";
const FUNCAO_EMAIL_ALERTA_TST = import.meta.env.VITE_FUNCAO_EMAIL_ALERTA_TST || "rapid-api";
const LIMITE_STORAGE_MB = Number(import.meta.env.VITE_STORAGE_LIMITE_MB || 1024);

const UPLOAD_BLOQUEAR_ACIMA_5MB = String(import.meta.env.VITE_BLOQUEAR_UPLOAD_ACIMA_5MB || "true") !== "false";
const UPLOAD_LIMITE_FORTE_MB = Number(import.meta.env.VITE_UPLOAD_LIMITE_FORTE_MB || 5);
const UPLOAD_MENSAGEM_ARQUIVO_GRANDE =
    "O arquivo está muito grande. Para reduzir o uso de armazenamento, compacte o PDF antes de enviar. Recomendamos escanear documentos em 150 ou 200 DPI, em preto e branco ou tons de cinza quando possível.";

const perfisUpload = {
    documentoSimples: {
        rotulo: "Documento simples",
        limiteIdealBytes: 2 * 1024 * 1024,
        limiteForteBytes: UPLOAD_LIMITE_FORTE_MB * 1024 * 1024,
        recomendacao: "até 2 MB",
    },
    documentoExtenso: {
        rotulo: "Documento extenso",
        limiteIdealBytes: 5 * 1024 * 1024,
        limiteForteBytes: UPLOAD_LIMITE_FORTE_MB * 1024 * 1024,
        recomendacao: "até 5 MB",
    },
    fotoAuditoria: {
        rotulo: "Foto / imagem",
        limiteIdealBytes: 800 * 1024,
        limiteForteBytes: UPLOAD_LIMITE_FORTE_MB * 1024 * 1024,
        recomendacao: "preferencialmente até 800 KB",
    },
};

function obterPerfilUpload(tipo = "documentoSimples") {
    return perfisUpload[tipo] || perfisUpload.documentoSimples;
}

function analisarTamanhoArquivoUpload(arquivo, tipo = "documentoSimples") {
    if (!arquivo) {
        return {
            ok: true,
            nivel: "vazio",
            texto: "Nenhum arquivo selecionado.",
            classe: "bg-slate-50 text-slate-500 ring-slate-200",
        };
    }

    const perfil = obterPerfilUpload(tipo);
    const tamanho = Number(arquivo.size || 0);
    const acimaForte = tamanho > perfil.limiteForteBytes;
    const acimaIdeal = tamanho > perfil.limiteIdealBytes;

    if (acimaForte) {
        return {
            ok: !UPLOAD_BLOQUEAR_ACIMA_5MB,
            nivel: UPLOAD_BLOQUEAR_ACIMA_5MB ? "bloqueado" : "critico",
            texto: `${perfil.rotulo}: ${formatarBytes(tamanho)}. Acima de ${UPLOAD_LIMITE_FORTE_MB} MB. ${UPLOAD_MENSAGEM_ARQUIVO_GRANDE}`,
            classe: "bg-red-50 text-red-700 ring-red-200",
        };
    }

    if (acimaIdeal) {
        return {
            ok: true,
            nivel: "atencao",
            texto: `${perfil.rotulo}: ${formatarBytes(tamanho)}. Recomendado: ${perfil.recomendacao}. ${UPLOAD_MENSAGEM_ARQUIVO_GRANDE}`,
            classe: "bg-orange-50 text-orange-700 ring-orange-200",
        };
    }

    return {
        ok: true,
        nivel: "normal",
        texto: `${perfil.rotulo}: ${formatarBytes(tamanho)}. Dentro do recomendado (${perfil.recomendacao}).`,
        classe: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    };
}

function validarArquivoAntesUpload(arquivo, tipo = "documentoSimples") {
    const analise = analisarTamanhoArquivoUpload(arquivo, tipo);

    if (!analise.ok) {
        alert(analise.texto);
        return false;
    }

    return true;
}

function validarListaArquivosAntesUpload(arquivos = [], tipo = "documentoSimples") {
    return Array.from(arquivos || []).every((arquivo) => validarArquivoAntesUpload(arquivo, tipo));
}

function FileUploadAviso({ arquivo, arquivos, tipo = "documentoSimples" }) {
    const lista = arquivos ? Array.from(arquivos || []) : arquivo ? [arquivo] : [];

    if (!lista.length) return null;

    return (
        <div className="mt-2 space-y-1">
            {lista.slice(0, 6).map((item) => {
                const analise = analisarTamanhoArquivoUpload(item, tipo);

                return (
                    <div key={`${item.name}-${item.size}`} className={classNames("rounded-xl px-3 py-2 text-[11px] ring-1", analise.classe)}>
                        <strong>{item.name}</strong> · {formatarBytes(item.size)}
                        <br />
                        {analise.texto}
                    </div>
                );
            })}
            {lista.length > 6 && (
                <div className="rounded-xl bg-slate-50 px-3 py-2 text-[11px] text-slate-500 ring-1 ring-slate-200">
                    + {lista.length - 6} arquivo(s) selecionado(s). A validação será feita antes do upload.
                </div>
            )}
        </div>
    );
}

function addDays(days) {
    const d = new Date(hoje);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
}

const treinamentosBase = [
    { id: 21, nome: "Ficha de Registro - CLT / eSocial", validadePadrao: null, categoria: "Documento sem validade", base: "CLT / eSocial / admissional" },

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

const STATUS_CLASSIFICACAO_COLABORADOR = [
    "Liberado",
    "Com pendência",
    "Bloqueado",
    "Em análise",
    "Desmobilizado",
    "Inativo",
];

const IDS_DOCUMENTOS_CRITICOS_COLABORADOR = [1, 14, 15, 21, 22];

function obterStatusInicialColaborador() {
    return "Em análise";
}

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
            status: statusDocumento(realizado.vencimento, treinamentoSemValidade(treinamento.id)),
        };
    });

    const pendentes = itens.filter((item) => item.status.chave === "pendente");
    const vencidos = itens.filter((item) => item.status.chave === "vencido");
    const vencendo = itens.filter((item) => item.status.chave === "vencendo");
    const emDia = itens.filter((item) => ["emdia", "semvalidade"].includes(item.status.chave));

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


function normalizarDataAniversario(valor) {
    if (!valor) return "";

    const texto = String(valor).trim();
    if (!texto) return "";

    const somenteData = texto.slice(0, 10);

    // Formato padrão salvo pelo campo date do Supabase/input: YYYY-MM-DD.
    const iso = somenteData.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso) {
        const ano = Number(iso[1]);
        const mes = Number(iso[2]);
        const dia = Number(iso[3]);
        const data = new Date(ano, mes - 1, dia, 12, 0, 0);

        if (data.getFullYear() === ano && data.getMonth() === mes - 1 && data.getDate() === dia) {
            return `${iso[1]}-${iso[2]}-${iso[3]}`;
        }

        return "";
    }

    // Aceita datas digitadas/importadas como DD/MM/YYYY, DD-MM-YYYY ou DD.MM.YYYY.
    const br = texto.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
    if (br) {
        const dia = Number(br[1]);
        const mes = Number(br[2]);
        let ano = Number(br[3]);

        if (ano < 100) ano += ano >= 70 ? 1900 : 2000;

        const data = new Date(ano, mes - 1, dia, 12, 0, 0);
        if (data.getFullYear() === ano && data.getMonth() === mes - 1 && data.getDate() === dia) {
            return `${String(ano).padStart(4, "0")}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
        }
    }

    return "";
}

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
        cargo: item.cargo || item.cargo_funcao || item.funcao || "",
        funcao: item.funcao || item.cargo || item.cargo_funcao || "-",
        matricula: item.matricula || "-",
        codigoFuncionario: item.codigo_funcionario || item.codigoFuncionario || `COL-${String(item.id).slice(0, 8).toUpperCase()}`,
        fotoUrl: item.foto_url || item.fotoUrl || "",
        fotoNome: item.foto_nome || item.fotoNome || "",
        status: item.status || "Ativo",
        statusMobilizacao: item.status_mobilizacao || item.statusMobilizacao || "",
        dataNascimento: normalizarDataAniversario(item.data_nascimento || item.dataNascimento || item.nascimento || item.dt_nascimento || item.data_de_nascimento || item.data_aniversario || ""),
        mostrarAniversarioDashboard: item.mostrar_aniversario_dashboard !== false && item.mostrarAniversarioDashboard !== false,
        treinamentosRemovidos: item.treinamentos_removidos || item.treinamentosRemovidos || [],
        treinamentosAdicionais: item.treinamentos_adicionais || item.treinamentosAdicionais || [],
        token: item.token_qr || item.token || `SST-${String(item.id).slice(0, 8)}`,
        treinamentos: item.treinamentos || [],
    };
}


function normalizarDocumentoEmpresa(item) {
    return {
        ...item,
        arquivo_url: item.arquivo_url || item.url_do_arquivo || "",
        arquivo_nome: item.arquivo_nome || item.nome_do_arquivo || "",
        url_do_arquivo: item.url_do_arquivo || item.arquivo_url || "",
        nome_do_arquivo: item.nome_do_arquivo || item.arquivo_nome || "",
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
        arquivo: item.arquivo_nome || item.nome_do_arquivo || item.arquivo || "",
        arquivoUrl: item.arquivo_url || item.url_do_arquivo || item.arquivoUrl || "",
        observacao: item.observacao || "",
        statusValidacao: item.status_validacao || "Validado",
        createdAt: item.created_at || "",
    };
}

function diasParaVencer(dataISO) {
    if (!dataISO) return null;

    const venc = new Date(`${dataISO}T12:00:00`);
    const base = new Date(hoje.toISOString().slice(0, 10) + "T12:00:00");
    const dias = Math.ceil((venc - base) / DAY);

    return Number.isFinite(dias) ? dias : null;
}

function treinamentoSemValidade(treinamentoId) {
    const treinamento = obterTreinamento(Number(treinamentoId));
    return treinamento?.validadePadrao === null || treinamento?.validadePadrao === 0;
}

function statusDocumento(dataISO, semValidade = false) {
    if (semValidade) {
        return {
            chave: "semvalidade",
            texto: "Sem validade",
            icon: FileText,
            classe: "bg-slate-50 text-slate-700 ring-slate-200",
            barra: "bg-slate-400",
        };
    }

    const dias = diasParaVencer(dataISO);

    if (dias === null) {
        return {
            chave: "semdata",
            texto: "Sem data",
            icon: AlertTriangle,
            classe: "bg-blue-50 text-blue-700 ring-blue-200",
            barra: "bg-blue-500",
        };
    }

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

function obterDataAniversarioColaborador(colaborador) {
    return normalizarDataAniversario(
        colaborador?.dataNascimento ||
        colaborador?.data_nascimento ||
        colaborador?.nascimento ||
        colaborador?.dt_nascimento ||
        colaborador?.data_de_nascimento ||
        colaborador?.data_aniversario ||
        ""
    );
}

function mesAniversarioColaborador(colaborador) {
    const data = obterDataAniversarioColaborador(colaborador);
    if (!data) return null;

    const mes = Number(data.slice(5, 7));
    return mes >= 1 && mes <= 12 ? mes : null;
}

function diaAniversarioColaborador(colaborador) {
    const data = obterDataAniversarioColaborador(colaborador);
    if (!data) return null;

    const dia = Number(data.slice(8, 10));
    return dia >= 1 && dia <= 31 ? dia : null;
}

function formatarAniversario(dataISO) {
    const data = normalizarDataAniversario(dataISO);
    if (!data) return "-";
    return `${data.slice(8, 10)}/${data.slice(5, 7)}/${data.slice(0, 4)}`;
}

function proximoAniversariante(lista = []) {
    const hojeBase = new Date();
    const anoAtual = hojeBase.getFullYear();

    const candidatos = lista
        .map((colaborador) => {
            const mes = mesAniversarioColaborador(colaborador);
            const dia = diaAniversarioColaborador(colaborador);
            if (!mes || !dia) return null;

            let data = new Date(anoAtual, mes - 1, dia, 12, 0, 0);
            if (data < new Date(anoAtual, hojeBase.getMonth(), hojeBase.getDate(), 0, 0, 0)) {
                data = new Date(anoAtual + 1, mes - 1, dia, 12, 0, 0);
            }

            return { colaborador, data };
        })
        .filter(Boolean)
        .sort((a, b) => a.data - b.data);

    return candidatos[0] || null;
}

function deveMostrarAniversarioColaborador(colaborador) {
    return colaborador?.mostrarAniversarioDashboard !== false;
}


const respostasAuditoriaCampo = [
    { chave: "conforme", texto: "Conforme", pontos: 10 },
    { chave: "observacao_leve", texto: "Observação leve", pontos: -5 },
    { chave: "nao_conforme", texto: "Não conforme", pontos: -10 },
    { chave: "desvio_grave", texto: "Desvio grave", pontos: -30 },
    { chave: "nao_aplicavel", texto: "Não aplicável", pontos: 0 },
];

const categoriasAuditoriaCampo = [
    { chave: "epi", texto: "EPI" },
    { chave: "frente_trabalho", texto: "Frente de trabalho" },
    { chave: "comportamento_seguro", texto: "Comportamento seguro" },
];

const statusDesvioAuditoriaCampo = ["Aberto", "Em tratativa", "Corrigido", "Cancelado"];
const gravidadesAuditoriaCampo = ["Leve", "Moderada", "Grave", "Crítica"];

function obterRespostaAuditoriaCampo(chave) {
    return respostasAuditoriaCampo.find((item) => item.chave === chave) || respostasAuditoriaCampo[0];
}

function calcularResultadoAuditoriaCampo(respostas = {}) {
    const itens = categoriasAuditoriaCampo.map((categoria) => ({
        categoria,
        resposta: obterRespostaAuditoriaCampo(respostas[categoria.chave] || "conforme"),
    }));

    const aplicaveis = itens.filter((item) => item.resposta.chave !== "nao_aplicavel");
    const base = Math.max(1, aplicaveis.length * 10);
    const pontos = aplicaveis.reduce((total, item) => total + Number(item.resposta.pontos || 0), 0);
    const percentual = Math.max(0, Math.min(100, Math.round((pontos / base) * 100)));
    const temDesvioGrave = itens.some((item) => item.resposta.chave === "desvio_grave");

    let classificacao = "Crítico";

    if (temDesvioGrave) classificacao = "Ação imediata";
    else if (percentual >= 90) classificacao = "Excelente";
    else if (percentual >= 75) classificacao = "Conforme com observações";
    else if (percentual >= 50) classificacao = "Atenção";

    return {
        pontos,
        percentual,
        classificacao,
        temDesvioGrave,
        itens,
    };
}

function classeClassificacaoAuditoriaCampo(classificacao = "") {
    const texto = normalizarTextoBusca(classificacao);

    if (texto.includes("excelente")) return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    if (texto.includes("observ")) return "bg-blue-50 text-blue-700 ring-blue-200";
    if (texto.includes("atencao") || texto.includes("atenção")) return "bg-orange-50 text-orange-700 ring-orange-200";
    if (texto.includes("acao") || texto.includes("ação") || texto.includes("critico") || texto.includes("crítico")) return "bg-red-50 text-red-700 ring-red-200";

    return "bg-slate-50 text-slate-700 ring-slate-200";
}

function formatarDataHora(dataISO) {
    if (!dataISO) return "-";
    const data = new Date(dataISO);
    if (Number.isNaN(data.getTime())) return "-";
    return data.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function normalizarAuditoriaCampo(item = {}) {
    const checklist = Array.isArray(item.checklist) ? item.checklist : [];
    const desvios = Array.isArray(item.desvios) ? item.desvios : [];

    return {
        id: item.id,
        colaboradorId: item.colaborador_id || item.colaboradorId || null,
        empresaId: item.empresa_id || item.empresaId || null,
        tokenQr: item.token_qr || item.tokenQr || "",
        colaboradorNome: item.colaborador_nome || item.colaboradorNome || item.colaboradores?.nome || "",
        empresaNome: item.empresa_nome || item.empresaNome || item.empresas?.nome || "",
        funcao: item.funcao || item.colaboradores?.funcao || "",
        statusDocumental: item.status_documental || item.statusDocumental || "",
        checklist,
        pontuacao: Number(item.pontuacao || 0),
        classificacao: item.classificacao || "",
        temDesvioGrave: Boolean(item.tem_desvio_grave || item.temDesvioGrave),
        categoriaDesvioPrincipal: item.categoria_desvio_principal || item.categoriaDesvioPrincipal || "",
        totalDesvios: Number(item.total_desvios || item.totalDesvios || desvios.length || 0),
        statusDesvio: item.status_desvio || item.statusDesvio || "",
        auditorNome: item.auditor_nome || item.auditorNome || item.enviado_por || "",
        origem: item.origem || "QR Code",
        createdAt: item.created_at || item.createdAt || "",
        desvios,
    };
}

function auditoriaCampoAberta(item = {}) {
    const status = normalizarTextoBusca(item.statusDesvio || item.status_desvio || "");
    return (item.totalDesvios || item.total_desvios || 0) > 0 && !["corrigido", "cancelado", "fechado", "concluido", "concluído"].some((termo) => status.includes(termo));
}

function apenasNumeros(valor) {
    return String(valor || "").replace(/\D/g, "");
}

function formatarBytes(bytes = 0) {
    const valor = Number(bytes) || 0;

    if (valor < 1024) return `${valor} B`;
    if (valor < 1024 ** 2) return `${(valor / 1024).toFixed(1)} KB`;
    if (valor < 1024 ** 3) return `${(valor / 1024 ** 2).toFixed(2)} MB`;

    return `${(valor / 1024 ** 3).toFixed(2)} GB`;
}

function calcularPercentualUsoStorage(bytesUsados = 0) {
    const limiteBytes = Math.max(1, LIMITE_STORAGE_MB * 1024 * 1024);
    return Math.min(100, Math.max(0, Math.round((Number(bytesUsados || 0) / limiteBytes) * 100)));
}

function resumirNavegador(userAgent = "") {
    const agente = String(userAgent || "");

    if (agente.includes("Edg/")) return "Microsoft Edge";
    if (agente.includes("Chrome/")) return "Google Chrome";
    if (agente.includes("Firefox/")) return "Mozilla Firefox";
    if (agente.includes("Safari/") && !agente.includes("Chrome/")) return "Safari";

    return agente ? "Navegador identificado" : "Não identificado";
}

function obterOrigemAcesso() {
    if (typeof window === "undefined") {
        return {
            url: "Servidor / ambiente sem navegador",
            pagina: "-",
            navegador: "-",
            plataforma: "-",
            idioma: "-",
        };
    }

    return {
        url: window.location?.href || "",
        origem: window.location?.origin || "",
        pagina: `${window.location?.pathname || "/"}${window.location?.search || ""}`,
        navegador: resumirNavegador(window.navigator?.userAgent || ""),
        userAgent: window.navigator?.userAgent || "",
        plataforma: window.navigator?.platform || "",
        idioma: window.navigator?.language || "",
    };
}

function normalizarEmailDestinatario(valor) {
    return String(valor || "")
        .split(/[;,]/)
        .map((email) => email.trim())
        .filter(Boolean)
        .join(",");
}

function emailTstDaEmpresa(colaborador) {
    return normalizarEmailDestinatario(colaborador?.empresaTstEmail || "");
}

function formatarCnpj(valor) {
    const numeros = apenasNumeros(valor).slice(0, 14);

    if (!numeros) return "";

    return numeros
        .replace(/^(\d{2})(\d)/, "$1.$2")
        .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
        .replace(/\.(\d{3})(\d)/, ".$1/$2")
        .replace(/(\d{4})(\d)/, "$1-$2");
}

function formatarTelefone(valor) {
    const numeros = apenasNumeros(valor).slice(0, 11);

    if (!numeros) return "";

    if (numeros.length <= 10) {
        return numeros
            .replace(/^(\d{2})(\d)/, "($1) $2")
            .replace(/(\d{4})(\d)/, "$1-$2");
    }

    return numeros
        .replace(/^(\d{2})(\d)/, "($1) $2")
        .replace(/(\d{5})(\d)/, "$1-$2");
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

function obterUrlContratoEmpresa(caminho) {
    if (!caminho) return "";

    if (String(caminho).startsWith("http")) return caminho;

    const { data } = supabase.storage
        .from("contratos-empresas")
        .getPublicUrl(caminho);

    return data?.publicUrl || "";
}

function abrirArquivoUrl(url) {
    if (!url) return;

    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function normalizarStatusEmpresa(status) {
    if (!status || status === "Ativa" || status === "Empresa ativa") return "Empresa ativa";
    if (status === "Inativa" || status === "Empresa inativa") return "Empresa inativa";
    if (status === "Inapta" || status === "Empresa inapta") return "Empresa inapta";
    if (status === "Bloqueada" || status === "Suspensa" || status === "Empresa suspensa") return "Empresa suspensa";
    return status;
}

function obterFuncaoCargoColaborador(colaborador) {
    return String(colaborador?.funcao || colaborador?.cargo || "").trim() || "Função não informada";
}

function colaboradorContaComoMobilizado(colaborador) {
    const classificacao = statusGeral(colaborador).texto;

    return classificacao === "Liberado" || classificacao === "Com pendência";
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

function inferirTreinamentoPorNomeArquivo(nomeArquivo = "") {
    const texto = normalizarTextoBusca(nomeArquivo)
        .replace(/[_-]+/g, " ")
        .replace(/\.pdf$|\.png$|\.jpg$|\.jpeg$|\.webp$/g, " ");

    const contem = (...termos) => termos.some((termo) => texto.includes(normalizarTextoBusca(termo)));

    if (contem("registro", "ficha registro")) return obterTreinamento(21);
    if (contem("aso", "atestado de saude", "atestado saúde")) return obterTreinamento(22);
    if (contem("integracao", "integração", "mobilizacao", "mobilização")) return obterTreinamento(1);

    if (contem("ficha epi", "ficha de epi", "epis atualizada", "epi ") && !contem("nr 06", "nr06", "nr-06")) {
        return obterTreinamento(14);
    }

    if (contem("nr 06", "nr06", "nr-06", "uso correto de epi", "uso correto de epis")) return obterTreinamento(8);
    if (contem("ordem de servico", "ordem de serviço", " os ")) return obterTreinamento(15);
    if (contem("procedimento operacional", "procedimento da funcao", "procedimento da função")) return obterTreinamento(13);

    if (contem("nr 10", "nr10", "nr-10")) return obterTreinamento(4);
    if (contem("nr 11", "nr11", "nr-11")) return obterTreinamento(11);
    if (contem("nr 12", "nr12", "nr-12", "maquinas", "máquinas", "equipamentos")) {
        if (contem("pemt", "pta", "plataforma")) return obterTreinamento(5);
        if (contem("lixadeira", "esmerilhadeira")) return obterTreinamento(7);
        return obterTreinamento(3);
    }
    if (contem("nr 17", "nr17", "nr-17", "ergonomia", "postural")) return obterTreinamento(18);
    if (contem("nr 18", "nr18", "nr-18")) {
        if (contem("escavacao", "escavação", "vala", "valas")) return obterTreinamento(12);
        if (contem("solda", "quente")) return obterTreinamento(6);
        if (contem("pemt", "pta", "plataforma")) return obterTreinamento(5);
        if (contem("lixadeira", "esmerilhadeira")) return obterTreinamento(7);
        return obterTreinamento(9);
    }
    if (contem("nr 21", "nr21", "nr-21", "ceu aberto", "céu aberto", "protetor solar")) return obterTreinamento(16);
    if (contem("nr 23", "nr23", "nr-23", "incendio", "incêndio")) return obterTreinamento(20);
    if (contem("nr 25", "nr25", "nr-25", "residuo", "resíduo", "meio ambiente")) return obterTreinamento(17);
    if (contem("nr 26", "nr26", "nr-26", "sinalizacao", "sinalização", "vias")) return obterTreinamento(19);
    if (contem("nr 33", "nr33", "nr-33", "confinado")) return obterTreinamento(10);
    if (contem("nr 35", "nr35", "nr-35", "altura")) return obterTreinamento(2);

    if (contem("lista")) return obterTreinamento(3);
    if (contem("epi")) return obterTreinamento(14);

    return null;
}

function dataRealizacaoPorArquivo(arquivo) {
    if (arquivo?.lastModified) {
        const data = new Date(arquivo.lastModified);

        if (!Number.isNaN(data.getTime())) {
            return data.toISOString().slice(0, 10);
        }
    }

    return hoje.toISOString().slice(0, 10);
}

function converterDataParaISO(dia, mes, ano) {
    const d = Number(dia);
    const m = Number(mes);
    let a = Number(ano);

    if (!d || !m || !a) return "";

    if (a < 100) a += a >= 70 ? 1900 : 2000;

    if (d < 1 || d > 31 || m < 1 || m > 12 || a < 1990 || a > 2100) return "";

    const data = new Date(a, m - 1, d, 12, 0, 0);

    if (data.getFullYear() !== a || data.getMonth() !== m - 1 || data.getDate() !== d) {
        return "";
    }

    return data.toISOString().slice(0, 10);
}

function converterDataIsoDireta(ano, mes, dia) {
    return converterDataParaISO(dia, mes, ano);
}

function extrairDatasComContexto(texto = "") {
    const resultado = [];
    const textoNormalizado = String(texto || "").replace(/\s+/g, " ");
    const regexDataBr = /\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})\b/g;
    const regexDataIso = /\b(20\d{2}|19\d{2})[/.-](\d{1,2})[/.-](\d{1,2})\b/g;

    const palavrasEmissao = [
        "emissão",
        "emissao",
        "emitido",
        "realização",
        "realizacao",
        "realizado",
        "realizada",
        "data do treinamento",
        "treinamento",
        "data do aso",
        "aso",
        "admissão",
        "admissao",
        "data de admissão",
        "data de admissao",
        "data",
    ];

    const palavrasVencimento = [
        "validade",
        "vencimento",
        "vence",
        "vencer",
        "válido até",
        "valido ate",
        "apto até",
        "apto ate",
    ];

    const adicionar = (match, iso, indice) => {
        if (!iso) return;

        const data = new Date(`${iso}T12:00:00`);
        const hojeBase = new Date(hoje.toISOString().slice(0, 10) + "T12:00:00");
        const limiteFuturo = new Date(hojeBase);

        limiteFuturo.setDate(limiteFuturo.getDate() + 30);

        // Data de realização/emissão não deve ser muito futura.
        if (data > limiteFuturo) return;

        const inicio = Math.max(0, indice - 100);
        const fim = Math.min(textoNormalizado.length, indice + match[0].length + 100);
        const contexto = textoNormalizado.slice(inicio, fim).trim();
        const contextoBusca = normalizarTextoBusca(contexto);

        let pontuacao = 1;

        palavrasEmissao.forEach((palavra) => {
            if (contextoBusca.includes(normalizarTextoBusca(palavra))) pontuacao += 4;
        });

        palavrasVencimento.forEach((palavra) => {
            if (contextoBusca.includes(normalizarTextoBusca(palavra))) pontuacao -= 7;
        });

        resultado.push({
            iso,
            texto: match[0],
            contexto,
            pontuacao,
        });
    };

    let match;

    while ((match = regexDataBr.exec(textoNormalizado))) {
        adicionar(match, converterDataParaISO(match[1], match[2], match[3]), match.index);
    }

    while ((match = regexDataIso.exec(textoNormalizado))) {
        adicionar(match, converterDataIsoDireta(match[1], match[2], match[3]), match.index);
    }

    return resultado
        .filter((item, index, array) => array.findIndex((outro) => outro.iso === item.iso) === index)
        .sort((a, b) => b.pontuacao - a.pontuacao || b.iso.localeCompare(a.iso));
}

function limparTextoPdfBruto(texto = "") {
    return String(texto || "")
        .replace(/\\r/g, " ")
        .replace(/\\n/g, " ")
        .replace(/[()<>[\]{}]/g, " ")
        .replace(/\s+/g, " ");
}

async function lerTextoPossivelDoArquivo(arquivo) {
    if (!arquivo) return "";

    const nome = arquivo.name || "";
    const extensao = nome.split(".").pop()?.toLowerCase() || "";

    try {
        if (["txt", "csv"].includes(extensao) || String(arquivo.type || "").startsWith("text/")) {
            return await arquivo.text();
        }

        if (extensao === "pdf" || arquivo.type === "application/pdf") {
            const buffer = await arquivo.arrayBuffer();
            const bytes = new Uint8Array(buffer);
            let bruto = "";
            const tamanhoMaximo = Math.min(bytes.length, 2_000_000);

            for (let i = 0; i < tamanhoMaximo; i += 1) {
                const byte = bytes[i];

                if (byte >= 32 && byte <= 126) {
                    bruto += String.fromCharCode(byte);
                } else {
                    bruto += " ";
                }
            }

            return limparTextoPdfBruto(bruto);
        }

        // Imagens dependem de OCR. Sem OCR, tentamos apenas o nome do arquivo.
        return "";
    } catch {
        return "";
    }
}

async function detectarDataEmissaoArquivo(arquivo) {
    if (!arquivo) {
        return {
            data: "",
            origem: "nenhuma",
            confianca: 0,
            mensagem: "Nenhum arquivo selecionado.",
        };
    }

    const candidatos = [];
    const nomeArquivo = arquivo.name || "";

    extrairDatasComContexto(nomeArquivo).forEach((item) =>
        candidatos.push({
            ...item,
            origem: "nome do arquivo",
            pontuacao: item.pontuacao + 1,
        })
    );

    const textoArquivo = await lerTextoPossivelDoArquivo(arquivo);

    extrairDatasComContexto(textoArquivo).forEach((item) =>
        candidatos.push({
            ...item,
            origem: "conteúdo do arquivo",
            pontuacao: item.pontuacao + 3,
        })
    );

    const ordenados = candidatos
        .filter((item, index, array) =>
            array.findIndex((outro) => outro.iso === item.iso && outro.origem === item.origem) === index
        )
        .sort((a, b) => b.pontuacao - a.pontuacao || b.iso.localeCompare(a.iso));

    const melhor = ordenados[0];

    if (!melhor) {
        return {
            data: "",
            origem: "não identificada",
            confianca: 0,
            mensagem: "Não foi possível identificar a data no arquivo. Informe manualmente antes de salvar.",
        };
    }

    const confianca = Math.max(1, Math.min(100, Math.round(melhor.pontuacao * 12)));

    return {
        data: melhor.iso,
        origem: melhor.origem,
        confianca,
        contexto: melhor.contexto,
        mensagem: `Data sugerida: ${formatDate(melhor.iso)} (${melhor.origem}). Confira antes de salvar.`,
    };
}

function analisarArquivosTreinamentoMassa(arquivos = []) {
    return Array.from(arquivos || []).map((arquivo) => {
        const treinamento = inferirTreinamentoPorNomeArquivo(arquivo.name);
        const dataRealizacao = dataRealizacaoPorArquivo(arquivo);

        return {
            arquivo,
            nomeArquivo: arquivo.name,
            treinamento,
            dataRealizacao,
            dataVencimento: treinamento ? calcularVencimentoTreinamento(treinamento.id, dataRealizacao) : "",
            reconhecido: Boolean(treinamento),
        };
    });
}

function itemDocumentoCriticoColaborador(item) {
    const id = Number(item?.treinamento?.id || item?.treinamentoId || item?.treinamento_id || 0);
    const nome = normalizarTextoBusca(item?.treinamento?.nome || item?.nomeTreinamento || item?.tipoTreinamento || "");

    return (
        IDS_DOCUMENTOS_CRITICOS_COLABORADOR.includes(id) ||
        nome.includes("aso") ||
        nome.includes("atestado de saude") ||
        nome.includes("ficha de registro") ||
        nome.includes("registro clt") ||
        nome.includes("integracao") ||
        nome.includes("mobilizacao sst") ||
        nome.includes("ordem de servico") ||
        nome.includes("ficha de epi") ||
        nome.includes("epis atualizada")
    );
}

function documentoEmAnaliseColaborador(item) {
    const statusValidacao = normalizarTextoBusca(
        item?.realizado?.statusValidacao ||
        item?.realizado?.status_validacao ||
        item?.statusValidacao ||
        item?.status_validacao ||
        ""
    );

    return (
        Boolean(item?.realizado) &&
        (
            statusValidacao.includes("analise") ||
            statusValidacao.includes("conferencia") ||
            statusValidacao.includes("validacao") ||
            statusValidacao.includes("aguardando")
        ) &&
        !statusValidacao.includes("validado") &&
        !statusValidacao.includes("aprovado")
    );
}

function classeClassificacaoColaborador(status) {
    const texto = String(status || "");

    if (texto === "Liberado") return "bg-emerald-600 text-white";
    if (texto === "Com pendência") return "bg-blue-50 text-blue-700 ring-1 ring-blue-200";
    if (texto === "Bloqueado") return "bg-red-600 text-white";
    if (texto === "Em análise") return "bg-violet-50 text-violet-700 ring-1 ring-violet-200";
    if (texto === "Desmobilizado") return "bg-slate-600 text-white";
    if (texto === "Inativo") return "bg-slate-100 text-slate-700 ring-1 ring-slate-300";

    return "bg-slate-100 text-slate-700 ring-1 ring-slate-300";
}

function statusGeral(colaborador) {
    const avaliacao = avaliarTreinamentosColaborador(colaborador);
    const textoSituacao = normalizarTextoBusca(`${colaborador?.status || ""} ${colaborador?.statusMobilizacao || ""} ${colaborador?.status_mobilizacao || ""}`);

    if (textoSituacao.includes("desmobilizado") || textoSituacao.includes("desmobilizada")) {
        return {
            texto: "Desmobilizado",
            classe: classeClassificacaoColaborador("Desmobilizado"),
            detalhe: "Colaborador removido da obra.",
            avaliacao,
        };
    }

    if (textoSituacao.includes("inativo") || textoSituacao.includes("inativa")) {
        return {
            texto: "Inativo",
            classe: classeClassificacaoColaborador("Inativo"),
            detalhe: "Colaborador cadastrado, mas sem mobilização ativa.",
            avaliacao,
        };
    }

    const possuiDocumentoEmAnalise = avaliacao.itens.some(documentoEmAnaliseColaborador);

    if (
        textoSituacao.includes("em analise") ||
        textoSituacao.includes("em análise") ||
        textoSituacao.includes("aguardando conferencia") ||
        textoSituacao.includes("aguardando conferência") ||
        possuiDocumentoEmAnalise
    ) {
        return {
            texto: "Em análise",
            classe: classeClassificacaoColaborador("Em análise"),
            detalhe: "Documento enviado, mas aguardando conferência.",
            avaliacao,
        };
    }

    const documentosCriticosFaltantes = avaliacao.pendentes.filter(itemDocumentoCriticoColaborador);
    const bloqueadoPorStatus = textoSituacao.includes("bloqueado") || textoSituacao.includes("bloqueada") || textoSituacao.includes("impedido") || textoSituacao.includes("impedida");

    if (bloqueadoPorStatus || avaliacao.vencidos.length > 0 || documentosCriticosFaltantes.length > 0) {
        const motivos = [];

        if (bloqueadoPorStatus) motivos.push("status manual bloqueado");
        if (avaliacao.vencidos.length > 0) motivos.push(`${avaliacao.vencidos.length} documento(s) ou treinamento(s) obrigatório(s) vencido(s)`);
        if (documentosCriticosFaltantes.length > 0) motivos.push(`${documentosCriticosFaltantes.length} documento(s) crítico(s) faltante(s)`);

        return {
            texto: "Bloqueado",
            classe: classeClassificacaoColaborador("Bloqueado"),
            detalhe: motivos.join("; ") || "Existe pendência bloqueante.",
            avaliacao,
        };
    }

    const pendenciasNaoBloqueantes = avaliacao.pendentes.filter((item) => !itemDocumentoCriticoColaborador(item));

    if (pendenciasNaoBloqueantes.length > 0 || avaliacao.vencendo.length > 0) {
        const detalhes = [];

        if (pendenciasNaoBloqueantes.length > 0) detalhes.push(`${pendenciasNaoBloqueantes.length} pendência(s) não bloqueante(s)`);
        if (avaliacao.vencendo.length > 0) detalhes.push(`${avaliacao.vencendo.length} item(ns) a vencer em até 30 dias`);

        return {
            texto: "Com pendência",
            classe: classeClassificacaoColaborador("Com pendência"),
            detalhe: detalhes.join("; ") || "Existe pendência, mas não bloqueia a mobilização.",
            avaliacao,
        };
    }

    return {
        texto: "Liberado",
        classe: classeClassificacaoColaborador("Liberado"),
        detalhe: "Documentos e treinamentos obrigatórios em dia.",
        avaliacao,
    };
}

function Card({ children, className = "" }) {
    return (
        <div className={classNames("rounded-3xl border border-slate-200 bg-white p-5 shadow-sm", className)}>
            {children}
        </div>
    );
}

function CardRecolhivel({
    titulo,
    subtitulo,
    contador,
    acao,
    children,
    className = "",
    defaultOpen = true,
    compacto = false,
}) {
    const [aberto, setAberto] = useState(defaultOpen);

    return (
        <Card className={classNames("transition-all", className)}>
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <button
                    type="button"
                    onClick={() => setAberto((atual) => !atual)}
                    className="flex min-w-0 flex-1 items-start justify-between gap-3 rounded-2xl text-left transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-100"
                >
                    <div className="min-w-0 p-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <h2 className={classNames(compacto ? "text-sm" : "text-lg", "font-bold text-slate-950")}>{titulo}</h2>
                            {contador !== undefined && contador !== null && (
                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
                                    {contador}
                                </span>
                            )}
                        </div>

                        {subtitulo && <p className="mt-1 text-sm text-slate-500">{subtitulo}</p>}
                    </div>

                    <span className="mt-1 flex shrink-0 items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 ring-1 ring-slate-200">
                        {aberto ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        {aberto ? "Recolher" : "Abrir"}
                    </span>
                </button>

                {acao && (
                    <div className="shrink-0" onClick={(evento) => evento.stopPropagation()}>
                        {acao}
                    </div>
                )}
            </div>

            {aberto && <div className={classNames(compacto ? "mt-3" : "mt-4")}>{children}</div>}
        </Card>
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

function PasswordInput({
    value,
    onChange,
    placeholder = "Digite sua senha",
    onKeyDown,
    autoFocus = false,
    autoComplete = "current-password",
    name,
    id,
    className = "",
    inputClassName = "",
    disabled = false,
}) {
    const [mostrarSenha, setMostrarSenha] = useState(false);
    const IconeVisibilidade = mostrarSenha ? EyeOff : Eye;

    return (
        <div className={classNames("relative", className)}>
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
                id={id}
                name={name}
                type={mostrarSenha ? "text" : "password"}
                value={value}
                onChange={onChange}
                onKeyDown={onKeyDown}
                placeholder={placeholder}
                autoFocus={autoFocus}
                autoComplete={autoComplete}
                disabled={disabled}
                className={classNames(
                    "w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-12 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:opacity-60",
                    inputClassName
                )}
            />
            <button
                type="button"
                onClick={() => setMostrarSenha((atual) => !atual)}
                disabled={disabled}
                aria-label={mostrarSenha ? "Ocultar senha" : "Visualizar senha"}
                title={mostrarSenha ? "Ocultar senha" : "Visualizar senha"}
                className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
                <IconeVisibilidade className="h-4 w-4" />
            </button>
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
                    <PasswordInput
                        value={senha}
                        onChange={(e) => setSenha(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") fazerLogin();
                        }}
                        placeholder="Digite sua senha"
                        autoComplete="current-password"
                        inputClassName="focus:ring-2 focus:ring-slate-300"
                    />

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


function ListaCompacta({ titulo, subtitulo, vazio, children }) {
    return (
        <Card>
            <div className="mb-4">
                <h2 className="text-lg font-bold text-slate-950">{titulo}</h2>
                {subtitulo && <p className="mt-1 text-sm text-slate-500">{subtitulo}</p>}
            </div>

            <div className="space-y-2">
                {children || (
                    <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">
                        {vazio}
                    </div>
                )}
            </div>
        </Card>
    );
}

function Dashboard({
    colaboradores,
    empresasBanco = [],
    documentosEmpresas = [],
    auditoria = [],
    auditoriasCampo = [],
    onSelectColab,
    onRegistrarEmailEnviado,
}) {
    const [enviandoEmail, setEnviandoEmail] = useState(false);
    const [usoStorageDashboard, setUsoStorageDashboard] = useState({
        totalBytes: 0,
        arquivos: 0,
        buckets: [],
    });
    const [carregandoStorageDashboard, setCarregandoStorageDashboard] = useState(false);
    const painelPadraoDashboard = {
        cards: true,
        pendencias: true,
        conformidade: true,
        colaboradoresFuncao: true,
        rankingEmpresas: true,
        documentosTipo: true,
        ultimosDocumentos: true,
        alertas: true,
        auditoriasCampo: true,
        topDesviosCampo: true,
    };

    const cartasPadraoDashboard = {
        colaboradoresMobilizados: true,
        colaboradoresLiberados: true,
        comPendencia: true,
        emAnalise: true,
        empresasAtivas: true,
        documentosVencidos: true,
        documentosAVencer: true,
        treinamentosVencidos: true,
        colaboradoresBloqueados: true,
        desviosAbertos: true,
        aniversariantesMes: true,
        armazenamentoUtilizado: true,
        auditoriasCampoMes: true,
        mediaConformidadeCampo: true,
        desviosCampoCorrigidos: true,
    };

    const tamanhosPadraoCartasDashboard = {
        colaboradoresMobilizados: "padrao",
        colaboradoresLiberados: "padrao",
        comPendencia: "padrao",
        emAnalise: "padrao",
        empresasAtivas: "padrao",
        documentosVencidos: "padrao",
        documentosAVencer: "padrao",
        treinamentosVencidos: "padrao",
        colaboradoresBloqueados: "padrao",
        desviosAbertos: "padrao",
        aniversariantesMes: "padrao",
        armazenamentoUtilizado: "padrao",
        auditoriasCampoMes: "padrao",
        mediaConformidadeCampo: "padrao",
        desviosCampoCorrigidos: "padrao",
    };

    const tamanhosPadraoBlocosDashboard = {
        cards: "destaque",
        pendencias: "grande",
        conformidade: "medio",
        rankingEmpresas: "destaque",
        colaboradoresFuncao: "medio",
        alertas: "medio",
        documentosTipo: "medio",
        ultimosDocumentos: "medio",
        auditoriasCampo: "destaque",
        topDesviosCampo: "medio",
    };

    const ordemPadraoBlocosDashboard = [
        "cards",
        "pendencias",
        "conformidade",
        "rankingEmpresas",
        "colaboradoresFuncao",
        "alertas",
        "documentosTipo",
        "ultimosDocumentos",
        "auditoriasCampo",
        "topDesviosCampo",
    ];

    const ordemPadraoCartasDashboard = [
        "colaboradoresMobilizados",
        "colaboradoresLiberados",
        "comPendencia",
        "emAnalise",
        "empresasAtivas",
        "documentosVencidos",
        "documentosAVencer",
        "treinamentosVencidos",
        "colaboradoresBloqueados",
        "desviosAbertos",
        "aniversariantesMes",
        "armazenamentoUtilizado",
        "auditoriasCampoMes",
        "mediaConformidadeCampo",
        "desviosCampoCorrigidos",
    ];

    const opcoesTamanhoCartaDashboard = [
        { chave: "padrao", label: "Padrão", descricao: "1 coluna" },
        { chave: "medio", label: "Médio", descricao: "2 colunas" },
        { chave: "grande", label: "Grande", descricao: "3 colunas" },
        { chave: "destaque", label: "Destaque", descricao: "linha inteira" },
    ];
    const opcoesPainelDashboard = [
        { chave: "cards", label: "Cards principais" },
        { chave: "pendencias", label: "Pendências críticas" },
        { chave: "conformidade", label: "Resumo de conformidade" },
        { chave: "rankingEmpresas", label: "Ranking por empresa" },
        { chave: "colaboradoresFuncao", label: "Colaboradores por função" },
        { chave: "alertas", label: "Alertas importantes" },
        { chave: "documentosTipo", label: "Documentos por tipo" },
        { chave: "ultimosDocumentos", label: "Últimos documentos enviados" },
        { chave: "auditoriasCampo", label: "Auditorias de campo" },
        { chave: "topDesviosCampo", label: "Top 5 desvios" },
    ];
    const blocosComTamanhoDashboard = opcoesPainelDashboard;
    const opcoesTamanhoBlocoDashboard = [
        { chave: "padrao", label: "Padrão", descricao: "menor" },
        { chave: "medio", label: "Médio", descricao: "metade da linha" },
        { chave: "grande", label: "Grande", descricao: "maior destaque" },
        { chave: "destaque", label: "Destaque", descricao: "linha inteira" },
    ];
    const blocosRecolhidosPadraoDashboard = {
        pendencias: false,
        conformidade: false,
        rankingEmpresas: false,
        colaboradoresFuncao: false,
        alertas: false,
        documentosTipo: false,
        ultimosDocumentos: false,
        auditoriasCampo: false,
        topDesviosCampo: false,
    };
    const [mostrarFiltroPainel, setMostrarFiltroPainel] = useState(false);
    const [cartaArrastandoDashboard, setCartaArrastandoDashboard] = useState(null);
    const [blocoArrastandoDashboard, setBlocoArrastandoDashboard] = useState(null);
    const [blocosPainelDashboard, setBlocosPainelDashboard] = useState(() => {
        if (typeof window === "undefined") return painelPadraoDashboard;

        try {
            const salvo = JSON.parse(window.localStorage.getItem("dashboardSstBlocosVisiveis") || "null");
            return salvo && typeof salvo === "object" ? { ...painelPadraoDashboard, ...salvo } : painelPadraoDashboard;
        } catch {
            return painelPadraoDashboard;
        }
    });

    const [cartasVisiveisDashboard, setCartasVisiveisDashboard] = useState(() => {
        if (typeof window === "undefined") return cartasPadraoDashboard;

        try {
            const salvo = JSON.parse(window.localStorage.getItem("dashboardSstCartasVisiveis") || "null");
            return salvo && typeof salvo === "object" ? { ...cartasPadraoDashboard, ...salvo } : cartasPadraoDashboard;
        } catch {
            return cartasPadraoDashboard;
        }
    });

    const [tamanhosCartasDashboard, setTamanhosCartasDashboard] = useState(() => {
        if (typeof window === "undefined") return tamanhosPadraoCartasDashboard;

        try {
            const salvo = JSON.parse(window.localStorage.getItem("dashboardSstTamanhosCartas") || "null");
            return salvo && typeof salvo === "object" ? { ...tamanhosPadraoCartasDashboard, ...salvo } : tamanhosPadraoCartasDashboard;
        } catch {
            return tamanhosPadraoCartasDashboard;
        }
    });

    const [tamanhosBlocosDashboard, setTamanhosBlocosDashboard] = useState(() => {
        if (typeof window === "undefined") return tamanhosPadraoBlocosDashboard;

        try {
            const salvo = JSON.parse(window.localStorage.getItem("dashboardSstTamanhosBlocos") || "null");
            return salvo && typeof salvo === "object" ? { ...tamanhosPadraoBlocosDashboard, ...salvo } : tamanhosPadraoBlocosDashboard;
        } catch {
            return tamanhosPadraoBlocosDashboard;
        }
    });

    const [blocosRecolhidosDashboard, setBlocosRecolhidosDashboard] = useState(() => {
        if (typeof window === "undefined") return blocosRecolhidosPadraoDashboard;

        try {
            const salvo = JSON.parse(window.localStorage.getItem("dashboardSstBlocosRecolhidos") || "null");
            return salvo && typeof salvo === "object" ? { ...blocosRecolhidosPadraoDashboard, ...salvo } : blocosRecolhidosPadraoDashboard;
        } catch {
            return blocosRecolhidosPadraoDashboard;
        }
    });

    const [ordemBlocosDashboard, setOrdemBlocosDashboard] = useState(() => {
        if (typeof window === "undefined") return ordemPadraoBlocosDashboard;

        try {
            const salvo = JSON.parse(window.localStorage.getItem("dashboardSstOrdemBlocos") || "null");
            if (!Array.isArray(salvo)) return ordemPadraoBlocosDashboard;

            return [
                ...salvo.filter((chave) => ordemPadraoBlocosDashboard.includes(chave)),
                ...ordemPadraoBlocosDashboard.filter((chave) => !salvo.includes(chave)),
            ];
        } catch {
            return ordemPadraoBlocosDashboard;
        }
    });

    const [ordemCartasDashboard, setOrdemCartasDashboard] = useState(() => {
        if (typeof window === "undefined") return ordemPadraoCartasDashboard;

        try {
            const salvo = JSON.parse(window.localStorage.getItem("dashboardSstOrdemCartas") || "null");
            if (!Array.isArray(salvo)) return ordemPadraoCartasDashboard;

            return [
                ...salvo.filter((chave) => ordemPadraoCartasDashboard.includes(chave)),
                ...ordemPadraoCartasDashboard.filter((chave) => !salvo.includes(chave)),
            ];
        } catch {
            return ordemPadraoCartasDashboard;
        }
    });

    useEffect(() => {
        if (typeof window === "undefined") return;
        window.localStorage.setItem("dashboardSstBlocosVisiveis", JSON.stringify(blocosPainelDashboard));
    }, [blocosPainelDashboard]);

    useEffect(() => {
        if (typeof window === "undefined") return;
        window.localStorage.setItem("dashboardSstCartasVisiveis", JSON.stringify(cartasVisiveisDashboard));
    }, [cartasVisiveisDashboard]);

    useEffect(() => {
        if (typeof window === "undefined") return;
        window.localStorage.setItem("dashboardSstTamanhosCartas", JSON.stringify(tamanhosCartasDashboard));
    }, [tamanhosCartasDashboard]);

    useEffect(() => {
        if (typeof window === "undefined") return;
        window.localStorage.setItem("dashboardSstTamanhosBlocos", JSON.stringify(tamanhosBlocosDashboard));
    }, [tamanhosBlocosDashboard]);

    useEffect(() => {
        if (typeof window === "undefined") return;
        window.localStorage.setItem("dashboardSstBlocosRecolhidos", JSON.stringify(blocosRecolhidosDashboard));
    }, [blocosRecolhidosDashboard]);

    useEffect(() => {
        if (typeof window === "undefined") return;
        window.localStorage.setItem("dashboardSstOrdemBlocos", JSON.stringify(ordemBlocosDashboard));
    }, [ordemBlocosDashboard]);

    useEffect(() => {
        if (typeof window === "undefined") return;
        window.localStorage.setItem("dashboardSstOrdemCartas", JSON.stringify(ordemCartasDashboard));
    }, [ordemCartasDashboard]);

    const alternarBlocoPainel = (chave) => {
        setBlocosPainelDashboard((atual) => ({
            ...atual,
            [chave]: !atual[chave],
        }));
    };

    const alternarCartaPainel = (chave) => {
        setCartasVisiveisDashboard((atual) => ({
            ...atual,
            [chave]: !atual[chave],
        }));
    };

    const alterarTamanhoCartaPainel = (chave, tamanho) => {
        setTamanhosCartasDashboard((atual) => ({
            ...atual,
            [chave]: tamanho,
        }));
    };

    const alterarTamanhoBlocoPainel = (chave, tamanho) => {
        setTamanhosBlocosDashboard((atual) => ({
            ...atual,
            [chave]: tamanho,
        }));
    };

    const moverItemPainel = (lista, chave, direcao) => {
        const indice = lista.indexOf(chave);
        if (indice < 0) return lista;

        const novoIndice = indice + direcao;
        if (novoIndice < 0 || novoIndice >= lista.length) return lista;

        const novaLista = [...lista];
        const [item] = novaLista.splice(indice, 1);
        novaLista.splice(novoIndice, 0, item);
        return novaLista;
    };

    const moverBlocoPainel = (chave, direcao) => {
        setOrdemBlocosDashboard((atual) => moverItemPainel(atual, chave, direcao));
    };

    const moverCartaPainel = (chave, direcao) => {
        setOrdemCartasDashboard((atual) => moverItemPainel(atual, chave, direcao));
    };

    const alternarBlocoRecolhidoDashboard = (chave) => {
        setBlocosRecolhidosDashboard((atual) => ({
            ...atual,
            [chave]: !atual[chave],
        }));
    };

    const reordenarPorArrastePainel = (lista, origem, destino) => {
        if (!origem || !destino || origem === destino) return lista;

        const origemIndice = lista.indexOf(origem);
        const destinoIndice = lista.indexOf(destino);

        if (origemIndice < 0 || destinoIndice < 0) return lista;

        const novaLista = [...lista];
        const [item] = novaLista.splice(origemIndice, 1);
        novaLista.splice(destinoIndice, 0, item);
        return novaLista;
    };

    const soltarCartaPainel = (destino) => {
        setOrdemCartasDashboard((atual) => reordenarPorArrastePainel(atual, cartaArrastandoDashboard, destino));
        setCartaArrastandoDashboard(null);
    };

    const soltarBlocoPainel = (destino) => {
        setOrdemBlocosDashboard((atual) => reordenarPorArrastePainel(atual, blocoArrastandoDashboard, destino));
        setBlocoArrastandoDashboard(null);
    };

    const prepararArrastePainel = (evento) => {
        evento.dataTransfer.effectAllowed = "move";
        evento.dataTransfer.setData("text/plain", "mover");
    };

    const classeTamanhoCartaDashboard = (chave) => {
        const tamanho = tamanhosCartasDashboard[chave] || "padrao";

        if (tamanho === "destaque") return "md:col-span-2 xl:col-span-6";
        if (tamanho === "grande") return "md:col-span-2 xl:col-span-3";
        if (tamanho === "medio") return "md:col-span-2 xl:col-span-2";

        return "";
    };

    const classeTamanhoBlocoDashboard = (chave) => {
        const tamanho = tamanhosBlocosDashboard[chave] || "padrao";

        if (tamanho === "destaque") return "md:col-span-2 xl:col-span-6";
        if (tamanho === "grande") return "md:col-span-2 xl:col-span-4";
        if (tamanho === "medio") return "md:col-span-2 xl:col-span-3";

        return "md:col-span-1 xl:col-span-2";
    };

    const classeValorCartaDashboard = (chave) => {
        const tamanho = tamanhosCartasDashboard[chave] || "padrao";

        if (tamanho === "destaque") return "text-4xl";
        if (tamanho === "grande") return "text-3xl";

        return "text-2xl";
    };

    const carregarUsoStorageDashboard = useCallback(async () => {
        setCarregandoStorageDashboard(true);

        try {
            const buckets = ["certificados-treinamentos", "documentos-empresas", "contratos-empresas", "logos-empresas", "fotos-colaboradores"];
            const resumoBuckets = [];

            const listarNivel = async (bucket, prefixo = "") => {
                const { data, error } = await supabase.storage
                    .from(bucket)
                    .list(prefixo, {
                        limit: 1000,
                        sortBy: { column: "name", order: "asc" },
                    });

                if (error) return { bytes: 0, arquivos: 0 };

                let bytes = 0;
                let arquivos = 0;

                for (const item of data || []) {
                    const caminho = prefixo ? `${prefixo}/${item.name}` : item.name;
                    const pareceArquivo = item.name && /\.[a-z0-9]{2,5}$/i.test(item.name);

                    if (pareceArquivo) {
                        bytes += Number(item.metadata?.size || 0);
                        arquivos += 1;
                    } else {
                        const sub = await listarNivel(bucket, caminho);
                        bytes += sub.bytes;
                        arquivos += sub.arquivos;
                    }
                }

                return { bytes, arquivos };
            };

            for (const bucket of buckets) {
                const resumo = await listarNivel(bucket);

                if (resumo.arquivos > 0 || resumo.bytes > 0) {
                    resumoBuckets.push({ bucket, ...resumo });
                }
            }

            setUsoStorageDashboard({
                totalBytes: resumoBuckets.reduce((total, bucket) => total + bucket.bytes, 0),
                arquivos: resumoBuckets.reduce((total, bucket) => total + bucket.arquivos, 0),
                buckets: resumoBuckets.sort((a, b) => b.bytes - a.bytes),
            });
        } catch {
            setUsoStorageDashboard({ totalBytes: 0, arquivos: 0, buckets: [] });
        } finally {
            setCarregandoStorageDashboard(false);
        }
    }, []);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            carregarUsoStorageDashboard();
        }, 0);

        return () => window.clearTimeout(timer);
    }, [carregarUsoStorageDashboard]);

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
        const emDia = itens.filter((item) => ["emdia", "semvalidade"].includes(item.status.chave)).length;
        const empresas = new Set(colaboradores.map((c) => c.empresa).filter(Boolean)).size;

        return { itens, vencidos, vencendo, pendentes, emDia, empresas };
    }, [colaboradores]);

    const totalItens = indicadores.itens.length;
    const mesAtual = hoje.getMonth();
    const anoAtual = hoje.getFullYear();

    const documentosComStatus = documentosEmpresas.map((documento) => ({
        ...documento,
        status: statusEmpresaDocumento(documento.data_vencimento),
    }));

    const documentosVencidos = documentosComStatus.filter((documento) => documento.status.chave === "vencido");
    const documentosAVencer = documentosComStatus.filter((documento) => documento.status.chave === "vencendo");
    const empresasAtivas = empresasBanco.filter((empresa) => normalizarStatusEmpresa(empresa.status) === "Empresa ativa");
    const colaboradoresMobilizados = colaboradores.filter(colaboradorContaComoMobilizado);
    const colaboradoresBloqueados = colaboradores.filter((colaborador) => statusGeral(colaborador).texto === "Bloqueado").length;
    const colaboradoresEmAnalise = colaboradores.filter((colaborador) => statusGeral(colaborador).texto === "Em análise").length;
    const colaboradoresLiberados = colaboradores.filter((colaborador) => statusGeral(colaborador).texto === "Liberado").length;
    const colaboradoresComPendencia = colaboradores.filter((colaborador) => statusGeral(colaborador).texto === "Com pendência").length;
    const auditoriasMes = auditoria.filter((item) => {
        const data = item.created_at ? new Date(item.created_at) : null;
        return data && data.getMonth() === mesAtual && data.getFullYear() === anoAtual;
    }).length;
    const desviosAbertos = auditoria.filter((item) => {
        const texto = normalizarTextoBusca(`${item.acao || ""} ${item.tabela || ""} ${item.descricao || ""}`);
        return texto.includes("desvio") && !texto.includes("fechado") && !texto.includes("concluido") && !texto.includes("concluído");
    }).length;

    const auditoriasCampoNormalizadas = auditoriasCampo.map(normalizarAuditoriaCampo);
    const auditoriasCampoMes = auditoriasCampoNormalizadas.filter((item) => {
        const data = item.createdAt ? new Date(item.createdAt) : null;
        return data && data.getMonth() === mesAtual && data.getFullYear() === anoAtual;
    });
    const mediaConformidadeCampo = auditoriasCampoMes.length
        ? Math.round(auditoriasCampoMes.reduce((total, item) => total + Number(item.pontuacao || 0), 0) / auditoriasCampoMes.length)
        : 0;
    const desviosCampoAbertos = auditoriasCampoNormalizadas.filter(auditoriaCampoAberta).length;
    const desviosCampoCorrigidos = auditoriasCampoNormalizadas.filter((item) => {
        const status = normalizarTextoBusca(item.statusDesvio || "");
        return (item.totalDesvios || 0) > 0 && status.includes("corrigido");
    }).length;
    const topDesviosCampo = Object.values(
        auditoriasCampoNormalizadas.reduce((acc, item) => {
            const chave = item.categoriaDesvioPrincipal || item.desvios?.[0]?.categoria || "Desvio não classificado";
            if (!acc[chave]) acc[chave] = { categoria: chave, total: 0, abertos: 0, graves: 0 };
            acc[chave].total += Number(item.totalDesvios || 0) || 1;
            if (auditoriaCampoAberta(item)) acc[chave].abertos += 1;
            if (item.temDesvioGrave) acc[chave].graves += 1;
            return acc;
        }, {})
    ).sort((a, b) => b.total - a.total || b.graves - a.graves).slice(0, 5);

    const aniversariantesElegiveis = colaboradores.filter((colaborador) =>
        deveMostrarAniversarioColaborador(colaborador) && colaboradorContaComoMobilizado(colaborador)
    );
    const aniversariantesMes = aniversariantesElegiveis
        .filter((colaborador) => mesAniversarioColaborador(colaborador) === mesAtual + 1)
        .sort((a, b) => (diaAniversarioColaborador(a) || 99) - (diaAniversarioColaborador(b) || 99));
    const proximoAniversarioDashboard = proximoAniversariante(aniversariantesElegiveis);

    const storagePercentual = calcularPercentualUsoStorage(usoStorageDashboard.totalBytes);
    const totalStorageLabel = carregandoStorageDashboard ? "Carregando..." : formatarBytes(usoStorageDashboard.totalBytes);
    const storageLimiteBytesDashboard = Math.max(1, LIMITE_STORAGE_MB * 1024 * 1024);
    const storageLimiteLabelDashboard = formatarBytes(storageLimiteBytesDashboard).replace(".00", "");
    const storageStatusDashboard =
        storagePercentual >= 90
            ? {
                texto: "Crítico",
                detalhe: "Pouco espaço disponível",
                apoio: "Considere liberar espaço para evitar interrupções.",
                classe: "bg-red-50 text-red-700 ring-red-200",
                iconeClasse: "bg-red-50 text-red-600",
                valorClasse: "text-red-600",
                barraClasse: "bg-red-500",
                trilhoClasse: "bg-red-100",
                statusIcon: AlertTriangle,
            }
            : storagePercentual >= 70
                ? {
                    texto: "Atenção",
                    detalhe: "Acompanhe o limite do sistema",
                    apoio: "O armazenamento está subindo. Avalie arquivos grandes ou sem vínculo.",
                    classe: "bg-orange-50 text-orange-700 ring-orange-200",
                    iconeClasse: "bg-orange-50 text-orange-600",
                    valorClasse: "text-orange-600",
                    barraClasse: "bg-orange-500",
                    trilhoClasse: "bg-orange-100",
                    statusIcon: AlertTriangle,
                }
                : {
                    texto: "Normal",
                    detalhe: "Uso saudável do armazenamento",
                    apoio: "Capacidade dentro do limite configurado.",
                    classe: "bg-emerald-50 text-emerald-700 ring-emerald-200",
                    iconeClasse: "bg-emerald-50 text-emerald-600",
                    valorClasse: "text-slate-950",
                    barraClasse: "bg-emerald-500",
                    trilhoClasse: "bg-slate-100",
                    statusIcon: CheckCircle2,
                };

    const cards = [
        { chave: "colaboradoresMobilizados", label: "Colaboradores mobilizados", valor: colaboradoresMobilizados.length, icon: HardHat, detalhe: "Liberados ou com pendência" },
        { chave: "colaboradoresLiberados", label: "Colaboradores liberados", valor: colaboradoresLiberados, icon: BadgeCheck, detalhe: "Documentos em dia" },
        { chave: "comPendencia", label: "Com pendência", valor: colaboradoresComPendencia, icon: AlertTriangle, detalhe: "Sem bloqueio" },
        { chave: "emAnalise", label: "Em análise", valor: colaboradoresEmAnalise, icon: Eye, detalhe: "Aguardando conferência" },
        { chave: "empresasAtivas", label: "Empresas ativas", valor: empresasAtivas.length, icon: Building2, detalhe: "Contratadas liberadas" },
        { chave: "documentosVencidos", label: "Documentos vencidos", valor: documentosVencidos.length, icon: XCircle, detalhe: "Empresas / contratos" },
        { chave: "documentosAVencer", label: "Documentos a vencer", valor: documentosAVencer.length, icon: CalendarClock, detalhe: "Próximos 30 dias" },
        { chave: "treinamentosVencidos", label: "Treinamentos vencidos", valor: indicadores.vencidos, icon: AlertTriangle, detalhe: "Colaboradores" },
        { chave: "colaboradoresBloqueados", label: "Colaboradores bloqueados", valor: colaboradoresBloqueados, icon: Lock, detalhe: "Pendência bloqueante" },
        { chave: "desviosAbertos", label: "Desvios abertos", valor: desviosAbertos, icon: AlertTriangle, detalhe: "Registros não concluídos" },
        { chave: "auditoriasCampoMes", label: "Auditorias de campo no mês", valor: auditoriasCampoMes.length, icon: ClipboardCheck, detalhe: "Checklists via QR Code" },
        { chave: "mediaConformidadeCampo", label: "Média de conformidade", valor: `${mediaConformidadeCampo}%`, icon: BadgeCheck, detalhe: "Auditorias do mês" },
        { chave: "desviosCampoCorrigidos", label: "Desvios corrigidos", valor: desviosCampoCorrigidos, icon: CheckCircle2, detalhe: `${desviosCampoAbertos} aberto(s)` },
        { chave: "aniversariantesMes", label: "Aniversariantes do mês", valor: aniversariantesMes.length, icon: UserRound, detalhe: aniversariantesMes.length > 0 ? "Quantidade no mês atual" : "Nenhum aniversariante no mês" },
        { chave: "armazenamentoUtilizado", label: "Armazenamento utilizado", valor: totalStorageLabel, icon: Upload, detalhe: `${storagePercentual}% do limite visual` },
    ];

    const cardsOrdenados = [
        ...ordemCartasDashboard
            .map((chave) => cards.find((item) => item.chave === chave))
            .filter(Boolean),
        ...cards.filter((item) => !ordemCartasDashboard.includes(item.chave)),
    ];

    const cardsVisiveis = cardsOrdenados.filter((item) => cartasVisiveisDashboard[item.chave] !== false);

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

    const colaboradoresPorFuncao = Object.values(
        colaboradoresMobilizados.reduce((acc, colaborador) => {
            const funcao = obterFuncaoCargoColaborador(colaborador);

            if (!acc[funcao]) acc[funcao] = { funcao, quantidade: 0 };

            acc[funcao].quantidade += 1;

            return acc;
        }, {})
    ).sort((a, b) => b.quantidade - a.quantidade || a.funcao.localeCompare(b.funcao));

    const maiorQuantidadePorFuncao = Math.max(...colaboradoresPorFuncao.map((item) => item.quantidade), 1);

    const rankingPendenciasEmpresa = (() => {
        const empresasPorId = new Map();
        const chavePorNome = new Map();
        const grupos = {};

        const nomeNormalizado = (nome) => normalizarTextoBusca(nome || "Empresa não informada").trim() || "empresa-nao-informada";

        empresasBanco.forEach((empresa) => {
            const chave = empresa.id ? `id:${empresa.id}` : `nome:${nomeNormalizado(empresa.nome)}`;
            const nome = empresa.nome || "Empresa não informada";

            if (empresa.id) empresasPorId.set(String(empresa.id), empresa);
            chavePorNome.set(nomeNormalizado(nome), chave);

            if (!grupos[chave]) {
                grupos[chave] = {
                    empresa: nome,
                    totalColaboradores: 0,
                    documentosVencidos: 0,
                    documentosAVencer: 0,
                    treinamentosVencidos: 0,
                    treinamentosAVencer: 0,
                    pendenciasLeves: 0,
                    colaboradoresBloqueadosSet: new Set(),
                };
            }
        });

        const obterChaveGrupo = (empresaId, nomeEmpresa) => {
            if (empresaId) return `id:${empresaId}`;

            const nome = nomeNormalizado(nomeEmpresa);
            return chavePorNome.get(nome) || `nome:${nome}`;
        };

        const obterNomeEmpresa = (empresaId, nomeEmpresa) => {
            if (empresaId && empresasPorId.has(String(empresaId))) {
                return empresasPorId.get(String(empresaId))?.nome || nomeEmpresa || "Empresa não informada";
            }

            return nomeEmpresa || "Empresa não informada";
        };

        const obterOuCriarGrupo = (empresaId, nomeEmpresa) => {
            const chave = obterChaveGrupo(empresaId, nomeEmpresa);

            if (!grupos[chave]) {
                grupos[chave] = {
                    empresa: obterNomeEmpresa(empresaId, nomeEmpresa),
                    totalColaboradores: 0,
                    documentosVencidos: 0,
                    documentosAVencer: 0,
                    treinamentosVencidos: 0,
                    treinamentosAVencer: 0,
                    pendenciasLeves: 0,
                    colaboradoresBloqueadosSet: new Set(),
                };
            }

            return grupos[chave];
        };

        colaboradores.forEach((colaborador) => {
            const empresaId = colaborador.empresaId || colaborador.empresa_id || null;
            const nomeEmpresa = colaborador.empresaExibicao || colaborador.empresa || "Empresa não informada";
            const grupo = obterOuCriarGrupo(empresaId, nomeEmpresa);
            const chaveColaborador = colaborador.id || colaborador.codigoFuncionario || colaborador.nome;
            const classificacao = statusGeral(colaborador);

            grupo.totalColaboradores += 1;

            if (classificacao.texto === "Bloqueado" && chaveColaborador) {
                grupo.colaboradoresBloqueadosSet.add(chaveColaborador);
            } else if (["Com pendência", "Em análise"].includes(classificacao.texto)) {
                grupo.pendenciasLeves += 1;
            }
        });

        documentosEmpresas.forEach((documento) => {
            const empresaId = documento.empresa_id || documento.empresaId || null;
            const empresaBanco = empresaId ? empresasPorId.get(String(empresaId)) : null;
            const nomeEmpresa = empresaBanco?.nome || documento.empresa || documento.empresaNome || documento.nome_empresa || "Empresa não informada";
            const grupo = obterOuCriarGrupo(empresaId, nomeEmpresa);
            const status = statusEmpresaDocumento(documento.data_vencimento);

            if (status.chave === "vencido") grupo.documentosVencidos += 1;
            else if (status.chave === "vencendo") grupo.documentosAVencer += 1;
            else if (["semvencimento", "semdata"].includes(status.chave)) grupo.pendenciasLeves += 1;
        });

        indicadores.itens.forEach((item) => {
            const colaborador = item.colaborador || {};
            const empresaId = colaborador.empresaId || colaborador.empresa_id || null;
            const nomeEmpresa = colaborador.empresaExibicao || colaborador.empresa || "Empresa não informada";
            const grupo = obterOuCriarGrupo(empresaId, nomeEmpresa);
            const chaveColaborador = colaborador.id || colaborador.codigoFuncionario || colaborador.nome;

            if (item.status.chave === "vencido") {
                grupo.treinamentosVencidos += 1;
                if (chaveColaborador) grupo.colaboradoresBloqueadosSet.add(chaveColaborador);
            } else if (item.status.chave === "vencendo") {
                grupo.treinamentosAVencer += 1;
                grupo.pendenciasLeves += 1;
            } else if (item.status.chave === "pendente") {
                if (itemDocumentoCriticoColaborador(item)) {
                    if (chaveColaborador) grupo.colaboradoresBloqueadosSet.add(chaveColaborador);
                } else {
                    grupo.pendenciasLeves += 1;
                }
            }
        });

        return Object.values(grupos)
            .map((grupo) => {
                const colaboradoresBloqueados = grupo.colaboradoresBloqueadosSet.size;
                const critico = grupo.documentosVencidos > 0 || grupo.treinamentosVencidos > 0 || colaboradoresBloqueados > 0;
                const atencao = !critico && (grupo.documentosAVencer > 0 || grupo.treinamentosAVencer > 0 || grupo.pendenciasLeves > 0);
                const statusEmpresa = critico ? "Crítico" : atencao ? "Atenção" : "Regular";
                const statusEmpresaClasse = critico
                    ? "bg-red-50 text-red-700 ring-red-200"
                    : atencao
                        ? "bg-orange-50 text-orange-700 ring-orange-200"
                        : "bg-emerald-50 text-emerald-700 ring-emerald-200";
                const criticidade = critico ? 3 : atencao ? 2 : 1;
                const totalPendencias =
                    grupo.documentosVencidos +
                    grupo.documentosAVencer +
                    grupo.treinamentosVencidos +
                    grupo.treinamentosAVencer +
                    grupo.pendenciasLeves +
                    colaboradoresBloqueados;

                return {
                    empresa: grupo.empresa,
                    totalColaboradores: grupo.totalColaboradores,
                    documentosVencidos: grupo.documentosVencidos,
                    documentosAVencer: grupo.documentosAVencer,
                    treinamentosVencidos: grupo.treinamentosVencidos,
                    colaboradoresBloqueados,
                    pendenciasLeves: grupo.pendenciasLeves,
                    statusEmpresa,
                    statusEmpresaClasse,
                    criticidade,
                    totalPendencias,
                };
            })
            .filter((grupo) => grupo.totalColaboradores > 0 || grupo.totalPendencias > 0)
            .sort((a, b) =>
                b.criticidade - a.criticidade ||
                b.totalPendencias - a.totalPendencias ||
                b.documentosVencidos - a.documentosVencidos ||
                b.treinamentosVencidos - a.treinamentosVencidos ||
                b.colaboradoresBloqueados - a.colaboradoresBloqueados ||
                b.totalColaboradores - a.totalColaboradores ||
                a.empresa.localeCompare(b.empresa)
            );
    })();

    const documentosPorTipo = Object.values(
        documentosEmpresas.reduce((acc, documento) => {
            const tipo = documento.tipo_documento || "Sem tipo";

            if (!acc[tipo]) {
                acc[tipo] = {
                    tipo,
                    total: 0,
                    vencidos: 0,
                    vencendo: 0,
                    emDia: 0,
                };
            }

            const status = statusEmpresaDocumento(documento.data_vencimento);

            acc[tipo].total += 1;

            if (status.chave === "vencido") acc[tipo].vencidos += 1;
            else if (status.chave === "vencendo") acc[tipo].vencendo += 1;
            else acc[tipo].emDia += 1;

            return acc;
        }, {})
    ).sort((a, b) => b.total - a.total || a.tipo.localeCompare(b.tipo));

    const certificadosEnviados = indicadores.itens
        .filter((item) => item.realizado)
        .map((item) => ({
            origem: "Treinamento",
            nome: item.realizado?.arquivo || item.treinamento?.nome || "Certificado",
            titulo: item.treinamento?.nome || "Treinamento",
            colaborador: item.colaborador?.nome || "-",
            empresa: item.colaborador?.empresaExibicao || item.colaborador?.empresa || "-",
            data: item.realizado?.created_at || item.realizado?.realizado || item.realizado?.vencimento || "",
            status: item.status.texto,
        }));

    const documentosEmpresariaisEnviados = documentosEmpresas.map((doc) => {
        const empresa = empresasBanco.find((item) => String(item.id) === String(doc.empresa_id));

        return {
            origem: "Empresa",
            nome: doc.arquivo_nome || doc.tipo_documento || "Documento empresarial",
            titulo: doc.tipo_documento || "Documento empresarial",
            colaborador: empresa?.nome || "-",
            empresa: empresa?.nome || "-",
            data: doc.created_at || doc.data_emissao || doc.data_vencimento || "",
            status: statusEmpresaDocumento(doc.data_vencimento).texto,
        };
    });

    const ultimosDocumentosEnviados = [...certificadosEnviados, ...documentosEmpresariaisEnviados]
        .sort((a, b) => new Date(b.data || 0) - new Date(a.data || 0))
        .slice(0, 8);

    const ultimosEmailsEnviados = auditoria
        .filter((item) => normalizarTextoBusca(`${item.acao || ""} ${item.descricao || ""}`).includes("email"))
        .slice(0, 8);

    const ultimosAcessos = auditoria
        .filter((item) => normalizarTextoBusca(`${item.acao || ""} ${item.descricao || ""}`).includes("acesso"))
        .slice(0, 8);

    const alertasImportantes = [
        ...documentosVencidos.slice(0, 4).map((doc) => ({
            tipo: "Documento vencido",
            texto: `${doc.tipo_documento || "Documento"} venceu em ${formatDate(doc.data_vencimento)}`,
            classe: "bg-red-50 text-red-700 ring-red-100",
        })),
        ...pendencias.filter((item) => item.status.chave === "vencido").slice(0, 4).map((item) => ({
            tipo: "Treinamento vencido",
            texto: `${item.colaborador.nome} · ${item.treinamento.nome}`,
            classe: "bg-red-50 text-red-700 ring-red-100",
        })),
        ...pendencias.filter((item) => item.status.chave === "vencendo").slice(0, 4).map((item) => ({
            tipo: "A vencer",
            texto: `${item.colaborador.nome} · ${item.treinamento.nome} · ${formatDate(item.vencimento)}`,
            classe: "bg-orange-50 text-orange-700 ring-orange-100",
        })),
        ...(storagePercentual >= 80
            ? [{
                tipo: "Armazenamento",
                texto: `Uso estimado do Storage em ${storagePercentual}%`,
                classe: "bg-orange-50 text-orange-700 ring-orange-100",
            }]
            : []),
    ].slice(0, 8);

    const montarPayloadEmailPendencia = (item) => {
        const statusEmail =
            item.status.chave === "pendente"
                ? "FALTANTE"
                : item.status.chave === "vencendo"
                    ? "A VENCER"
                    : "VENCIDO";

        const dias = item.vencimento ? diasParaVencer(item.vencimento) : null;
        const empresa = item.colaborador?.empresaExibicao || item.colaborador?.empresa || "Empresa não informada";
        const para = emailTstDaEmpresa(item.colaborador);

        return {
            para,
            assunto: `Aviso SST - ${statusEmail} - ${item.colaborador?.nome || "Colaborador"}`,
            empresa,
            tstResponsavel: item.colaborador?.empresaTstResponsavel || "",
            itens: [
                {
                    colaborador: item.colaborador?.nome || "Colaborador não informado",
                    codigo: item.colaborador?.codigoFuncionario || "-",
                    funcao: item.colaborador?.funcao || "-",
                    situacaoObra: item.colaborador?.statusMobilizacao || obterStatusInicialColaborador(),
                    statusColaborador: statusGeral(item.colaborador || {}).texto,
                    treinamento: item.treinamento?.nome || "Documento não informado",
                    realizacao: item.realizado?.realizado ? formatDate(item.realizado.realizado) : "Não informada",
                    vencimento: item.realizado?.vencimento ? formatDate(item.realizado.vencimento) : "Não informada",
                    dias: dias ?? 0,
                    arquivo: item.realizado?.arquivo || "Não informado",
                },
            ],
        };
    };

    const enviarAlertaEmailPendencia = async (item, mostrarMensagem = true) => {
        if (!item) return false;

        if (mostrarMensagem) {
            setEnviandoEmail(true);
        }

        try {
            const payload = montarPayloadEmailPendencia(item);

            if (!payload.para) {
                if (mostrarMensagem) {
                    alert(`Cadastre o e-mail do TST responsável da empresa ${payload.empresa} antes de enviar.`);
                }

                return false;
            }

            const { data, error } = await supabase.functions.invoke(FUNCAO_EMAIL_ALERTA_TST, {
                body: payload,
            });

            if (error || data?.ok === false) {
                console.error("Erro ao enviar alerta por e-mail:", error || data);
                await onRegistrarEmailEnviado?.({
                    empresaId: item.colaborador?.empresaId || null,
                    colaboradorId: item.colaborador?.id || null,
                    documentoId: item.realizado?.id || null,
                    destinatario: payload.para,
                    assunto: payload.assunto,
                    tipoAlerta: "Pendência crítica",
                    documento: item.treinamento?.nome || "Documento não informado",
                    statusEnvio: "Erro",
                    erro: error?.message || data?.erro || "Falha na função de e-mail.",
                });

                if (mostrarMensagem) {
                    alert(`Erro ao enviar alerta por e-mail: ${error?.message || data?.erro || "Falha na função de e-mail."}`);
                }

                return false;
            }

            console.log("Alerta enviado por e-mail:", data);
            await onRegistrarEmailEnviado?.({
                empresaId: item.colaborador?.empresaId || null,
                colaboradorId: item.colaborador?.id || null,
                documentoId: item.realizado?.id || null,
                destinatario: payload.para,
                assunto: payload.assunto,
                tipoAlerta: "Pendência crítica",
                documento: item.treinamento?.nome || "Documento não informado",
                statusEnvio: "Sucesso",
                erro: "",
            });

            if (mostrarMensagem) {
                alert(`Alerta enviado para ${payload.para}.`);
            }

            return true;
        } catch (erro) {
            console.error("Falha inesperada ao enviar e-mail:", erro);
            const payloadErro = montarPayloadEmailPendencia(item);
            await onRegistrarEmailEnviado?.({
                empresaId: item.colaborador?.empresaId || null,
                colaboradorId: item.colaborador?.id || null,
                documentoId: item.realizado?.id || null,
                destinatario: payloadErro.para,
                assunto: payloadErro.assunto,
                tipoAlerta: "Pendência crítica",
                documento: item.treinamento?.nome || "Documento não informado",
                statusEnvio: "Erro",
                erro: erro?.message || String(erro),
            });

            if (mostrarMensagem) {
                alert("Falha inesperada ao enviar e-mail.");
            }

            return false;
        } finally {
            if (mostrarMensagem) {
                setEnviandoEmail(false);
            }
        }
    };

    const enviarAlertasPendenciasCriticas = async () => {
        if (!pendencias.length) {
            alert("Não existem pendências críticas para enviar por e-mail.");
            return;
        }

        const semEmailTst = pendencias.filter((item) => !emailTstDaEmpresa(item.colaborador)).length;
        const confirmar = window.confirm(
            `Deseja enviar ${pendencias.length} alerta(s) por e-mail para o TST responsável de cada empresa?${semEmailTst ? `\n\nAtenção: ${semEmailTst} item(ns) estão sem e-mail de TST cadastrado e não serão enviados.` : ""}`
        );

        if (!confirmar) return;

        setEnviandoEmail(true);

        let enviados = 0;
        let falhas = 0;

        try {
            for (const item of pendencias) {
                const sucesso = await enviarAlertaEmailPendencia(item, false);

                if (sucesso) {
                    enviados += 1;
                } else {
                    falhas += 1;
                }
            }

            alert(`Envio finalizado. Enviados: ${enviados}. Falhas: ${falhas}.`);
        } finally {
            setEnviandoEmail(false);
        }
    };

    const baixarRelatorioDashboard = () => {
        const linhas = [
            ["Colaborador", "Empresa", "Função", "Situação na obra", "Status automático", "Treinamento/Documento", "Status", "Vencimento", "Base"],
        ];

        indicadores.itens.forEach((item) => {
            linhas.push([
                item.colaborador.nome,
                item.colaborador.empresaExibicao || item.colaborador.empresa,
                item.colaborador.funcao,
                item.colaborador.statusMobilizacao || obterStatusInicialColaborador(),
                statusGeral(item.colaborador).texto,
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

    const opcoesBlocosOrdenadasDashboard = [
        ...ordemBlocosDashboard
            .map((chave) => opcoesPainelDashboard.find((opcao) => opcao.chave === chave))
            .filter(Boolean),
        ...opcoesPainelDashboard.filter((opcao) => !ordemBlocosDashboard.includes(opcao.chave)),
    ];

    const blocosDashboardOrdenados = opcoesBlocosOrdenadasDashboard
        .map((opcao) => opcao.chave)
        .filter((chave) => blocosPainelDashboard[chave]);

    const mensagemVaziaDashboard = (texto) => (
        <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">
            {texto}
        </div>
    );

    const CardDashboardRecolhivel = ({ chaveBloco, titulo, subtitulo, badge, children }) => {
        const recolhido = Boolean(blocosRecolhidosDashboard[chaveBloco]);

        return (
            <Card className="h-full">
                <div className={classNames("flex flex-col justify-between gap-3 md:flex-row md:items-start", recolhido ? "mb-0" : "mb-4")}>
                    <div className="min-w-0">
                        <h2 className="text-lg font-bold text-slate-950">{titulo}</h2>
                        {subtitulo && <p className="mt-1 text-sm text-slate-500">{subtitulo}</p>}
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                        {badge}
                        <button
                            type="button"
                            onClick={() => alternarBlocoRecolhidoDashboard(chaveBloco)}
                            className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                        >
                            {recolhido ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
                            {recolhido ? "Abrir" : "Recolher"}
                        </button>
                    </div>
                </div>

                {!recolhido && children}
            </Card>
        );
    };

    const renderBlocoDashboard = (chave) => {
        if (chave === "cards") {
            return (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
                    {cardsVisiveis.length === 0 ? (
                        <Card className="md:col-span-2 xl:col-span-6">
                            <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">
                                Nenhuma carta principal selecionada. Abra Personalizar painel e escolha as cartas que deseja exibir.
                            </div>
                        </Card>
                    ) : (
                        cardsVisiveis.map((item, index) => {
                            const Icon = item.icon;
                            const tamanho = tamanhosCartasDashboard[item.chave] || "padrao";

                            if (item.chave === "armazenamentoUtilizado") {
                                const StatusIcon = storageStatusDashboard.statusIcon;
                                const percentualBarra = Math.min(100, Math.max(storagePercentual > 0 ? 2 : 0, storagePercentual));

                                return (
                                    <Card
                                        key={item.chave}
                                        className={classNames(
                                            "overflow-hidden border-dashed bg-white transition hover:border-slate-300",
                                            classeTamanhoCartaDashboard(item.chave)
                                        )}
                                    >
                                        <div className="flex h-full min-h-[170px] flex-col justify-between gap-4">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex min-w-0 items-start gap-3">
                                                    <div className={classNames("shrink-0 rounded-3xl p-3", storageStatusDashboard.iconeClasse)}>
                                                        <Upload className={tamanho === "destaque" || tamanho === "grande" ? "h-6 w-6" : "h-5 w-5"} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-bold text-slate-600">Armazenamento utilizado</p>
                                                        <div className={classNames("mt-2 flex flex-wrap items-end gap-x-2 gap-y-1 font-black", tamanho === "destaque" || tamanho === "grande" ? "text-4xl" : "text-3xl")}>
                                                            <span className={storageStatusDashboard.valorClasse}>{totalStorageLabel}</span>
                                                            <span className="text-xl font-semibold text-slate-400">/ {storageLimiteLabelDashboard}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex shrink-0 flex-col items-end gap-2">
                                                    <span className={classNames("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ring-1", storageStatusDashboard.classe)}>
                                                        <StatusIcon className="h-3.5 w-3.5" />
                                                        {storageStatusDashboard.texto}
                                                    </span>
                                                    <span className={classNames("rounded-2xl px-3 py-1.5 text-sm font-black", storageStatusDashboard.classe)}>
                                                        {storagePercentual}%
                                                    </span>
                                                </div>
                                            </div>

                                            <div>
                                                <div className={classNames("h-3 overflow-hidden rounded-full", storageStatusDashboard.trilhoClasse)}>
                                                    <div
                                                        className={classNames("h-full rounded-full transition-all", storageStatusDashboard.barraClasse)}
                                                        style={{ width: `${percentualBarra}%` }}
                                                    />
                                                </div>

                                                <div className="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                                                    <span className="inline-flex items-center gap-2 font-semibold">
                                                        <Database className="h-4 w-4 text-slate-400" />
                                                        Capacidade total: {storageLimiteLabelDashboard}
                                                    </span>
                                                    <span className={classNames("inline-flex items-center gap-2 font-semibold", storagePercentual >= 90 ? "text-red-600" : storagePercentual >= 70 ? "text-orange-600" : "text-emerald-600")}>
                                                        <StatusIcon className="h-4 w-4" />
                                                        {storageStatusDashboard.detalhe}
                                                    </span>
                                                </div>

                                                {(tamanho === "destaque" || tamanho === "grande") && (
                                                    <p className="mt-2 text-xs leading-relaxed text-slate-400">
                                                        {storageStatusDashboard.apoio}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </Card>
                                );
                            }

                            return (
                                <Card
                                    key={item.chave}
                                    className={classNames(
                                        "overflow-hidden border-dashed transition hover:border-slate-300",
                                        classeTamanhoCartaDashboard(item.chave)
                                    )}
                                >
                                    <div
                                        className={classNames(
                                            "flex items-start justify-between gap-3",
                                            tamanho === "destaque" ? "min-h-[108px]" : tamanho === "grande" ? "min-h-[92px]" : ""
                                        )}
                                    >
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-slate-500">{item.label}</p>
                                            <p className={classNames("mt-2 break-words font-bold text-slate-950", classeValorCartaDashboard(item.chave))}>{item.valor}</p>
                                            <p className="mt-1 text-xs text-slate-400">{item.detalhe}</p>
                                        </div>
                                        <div className={classNames(
                                            "shrink-0 rounded-2xl bg-slate-100 p-3 text-slate-700",
                                            tamanho === "destaque" || tamanho === "grande" ? "p-4" : ""
                                        )}>
                                            <Icon className={tamanho === "destaque" || tamanho === "grande" ? "h-6 w-6" : "h-5 w-5"} />
                                        </div>
                                    </div>
                                </Card>
                            );
                        })
                    )}
                </div>
            );
        }

        if (chave === "auditoriasCampo") {
            return (
                <CardDashboardRecolhivel
                    chaveBloco="auditoriasCampo"
                    titulo="Auditorias de campo"
                    subtitulo="Histórico mensal de auditorias realizadas via QR Code por colaborador e empresa."
                    badge={(
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                            {auditoriasCampoMes.length} no mês
                        </span>
                    )}
                >
                    <div className="grid gap-3 md:grid-cols-4">
                        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Auditorias do mês</p>
                            <p className="mt-2 text-2xl font-black text-slate-950">{auditoriasCampoMes.length}</p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Média de conformidade</p>
                            <p className="mt-2 text-2xl font-black text-slate-950">{mediaConformidadeCampo}%</p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Desvios abertos</p>
                            <p className="mt-2 text-2xl font-black text-red-600">{desviosCampoAbertos}</p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Desvios corrigidos</p>
                            <p className="mt-2 text-2xl font-black text-emerald-600">{desviosCampoCorrigidos}</p>
                        </div>
                    </div>

                    <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 scrollbar-discreta">
                        <table className="min-w-[850px] w-full text-left text-sm">
                            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                                <tr>
                                    <th className="px-4 py-3">Data</th>
                                    <th className="px-4 py-3">Colaborador</th>
                                    <th className="px-4 py-3">Empresa</th>
                                    <th className="px-4 py-3">Pontuação</th>
                                    <th className="px-4 py-3">Classificação</th>
                                    <th className="px-4 py-3">Desvios</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {auditoriasCampoNormalizadas.length === 0 && (
                                    <tr>
                                        <td className="px-4 py-8 text-center text-sm text-slate-500" colSpan={6}>
                                            Nenhuma auditoria de campo registrada.
                                        </td>
                                    </tr>
                                )}
                                {auditoriasCampoNormalizadas.slice(0, 10).map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3 text-slate-600">{formatarDataHora(item.createdAt)}</td>
                                        <td className="px-4 py-3 font-semibold text-slate-900">{item.colaboradorNome || "-"}</td>
                                        <td className="px-4 py-3 text-slate-600">{item.empresaNome || "-"}</td>
                                        <td className="px-4 py-3 font-bold text-slate-900">{item.pontuacao}%</td>
                                        <td className="px-4 py-3">
                                            <span className={classNames("rounded-full px-2 py-1 text-xs font-bold ring-1", classeClassificacaoAuditoriaCampo(item.classificacao))}>
                                                {item.classificacao || "-"}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-slate-600">{item.totalDesvios}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardDashboardRecolhivel>
            );
        }

        if (chave === "topDesviosCampo") {
            return (
                <CardDashboardRecolhivel
                    chaveBloco="topDesviosCampo"
                    titulo="Top 5 desvios"
                    subtitulo="Principais tipos de desvios registrados nas auditorias de campo."
                    badge={(
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                            {topDesviosCampo.length} tipo(s)
                        </span>
                    )}
                >
                    <div className="space-y-2">
                        {topDesviosCampo.length === 0 && (
                            <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">
                                Nenhum desvio de auditoria de campo registrado.
                            </div>
                        )}
                        {topDesviosCampo.map((item, index) => (
                            <div key={item.categoria} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-bold text-slate-900">{index + 1}. {item.categoria}</p>
                                    <p className="text-xs text-slate-500">{item.abertos} aberto(s) · {item.graves} grave(s)</p>
                                </div>
                                <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700 ring-1 ring-slate-200">
                                    {item.total}
                                </span>
                            </div>
                        ))}
                    </div>
                </CardDashboardRecolhivel>
            );
        }

        if (chave === "pendencias") {
            return (
                <CardDashboardRecolhivel
                    chaveBloco="pendencias"
                    titulo="Pendências críticas"
                    subtitulo="Treinamentos pendentes, vencidos ou a vencer em até 30 dias."
                    badge={(
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                            {pendencias.length} itens
                        </span>
                    )}
                >
                    <div className="overflow-x-auto rounded-2xl border border-slate-200 scrollbar-discreta">
                        <table className="min-w-[760px] w-full text-left text-sm">
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

                                {pendencias.slice(0, 10).map((item, idx) => (
                                    <tr key={`${item.colaborador.id}-${item.treinamento.id}-${idx}`} className="hover:bg-slate-50">
                                        <td className="px-4 py-3">
                                            <div className="font-semibold text-slate-900">{item.colaborador.nome}</div>
                                            <div className="text-xs text-slate-500">
                                                {item.colaborador.empresaExibicao || item.colaborador.empresa} · {item.colaborador.statusMobilizacao || obterStatusInicialColaborador()} · {statusGeral(item.colaborador).texto}
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
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => enviarAlertaEmailPendencia(item)}
                                                    disabled={enviandoEmail}
                                                    className="inline-flex min-w-[78px] items-center justify-center whitespace-nowrap rounded-xl bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    E-mail
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => onSelectColab(item.colaborador)}
                                                    className="inline-flex min-w-[48px] items-center justify-center whitespace-nowrap rounded-xl bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                                                >
                                                    QR
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardDashboardRecolhivel>
            );
        }

        if (chave === "conformidade") {
            return (
                <CardDashboardRecolhivel
                    chaveBloco="conformidade"
                    titulo="Resumo de conformidade"
                    subtitulo="Baseado nos treinamentos exigidos para a função, incluindo os ainda não enviados."
                >
                    <div className="space-y-5">
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
                </CardDashboardRecolhivel>
            );
        }

        if (chave === "rankingEmpresas") {
            return (
                <CardDashboardRecolhivel
                    chaveBloco="rankingEmpresas"
                    titulo="Ranking de pendências por empresa"
                    subtitulo="Tabela com tamanho e posição configuráveis no painel. Use Destaque para ocupar a linha inteira."
                    badge={(
                        <div className="flex flex-wrap gap-2 text-xs font-semibold">
                            <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700 ring-1 ring-emerald-200">Regular</span>
                            <span className="rounded-full bg-orange-50 px-3 py-1 text-orange-700 ring-1 ring-orange-200">Atenção</span>
                            <span className="rounded-full bg-red-50 px-3 py-1 text-red-700 ring-1 ring-red-200">Crítico</span>
                        </div>
                    )}
                >
                    {rankingPendenciasEmpresa.length === 0 ? (
                        mensagemVaziaDashboard("Nenhuma empresa encontrada para gerar o ranking.")
                    ) : (
                        <div className="overflow-x-auto scrollbar-discreta">
                            <table className="min-w-[920px] w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                                        <th className="py-3 pr-3 font-semibold">Empresa</th>
                                        <th className="px-3 py-3 text-center font-semibold">Total colab.</th>
                                        <th className="px-3 py-3 text-center font-semibold">Docs vencidos</th>
                                        <th className="px-3 py-3 text-center font-semibold">Docs a vencer</th>
                                        <th className="px-3 py-3 text-center font-semibold">Trein. vencidos</th>
                                        <th className="px-3 py-3 text-center font-semibold">Bloqueados</th>
                                        <th className="py-3 pl-3 text-center font-semibold">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {rankingPendenciasEmpresa.slice(0, 10).map((item, index) => (
                                        <tr key={item.empresa} className="align-middle text-slate-700 hover:bg-slate-50/80">
                                            <td className="py-3 pr-3">
                                                <div className="font-semibold text-slate-950">{index + 1}. {item.empresa}</div>
                                                {item.pendenciasLeves > 0 && item.statusEmpresa === "Atenção" && (
                                                    <div className="mt-0.5 text-xs text-slate-500">Possui pendência leve ou item preventivo.</div>
                                                )}
                                            </td>
                                            <td className="px-3 py-3 text-center font-bold text-slate-900">{item.totalColaboradores}</td>
                                            <td className="px-3 py-3 text-center">
                                                <span className={classNames("inline-flex min-w-8 justify-center rounded-full px-2 py-1 text-xs font-bold ring-1", item.documentosVencidos > 0 ? "bg-red-50 text-red-700 ring-red-100" : "bg-slate-50 text-slate-600 ring-slate-100")}>{item.documentosVencidos}</span>
                                            </td>
                                            <td className="px-3 py-3 text-center">
                                                <span className={classNames("inline-flex min-w-8 justify-center rounded-full px-2 py-1 text-xs font-bold ring-1", item.documentosAVencer > 0 ? "bg-orange-50 text-orange-700 ring-orange-100" : "bg-slate-50 text-slate-600 ring-slate-100")}>{item.documentosAVencer}</span>
                                            </td>
                                            <td className="px-3 py-3 text-center">
                                                <span className={classNames("inline-flex min-w-8 justify-center rounded-full px-2 py-1 text-xs font-bold ring-1", item.treinamentosVencidos > 0 ? "bg-red-50 text-red-700 ring-red-100" : "bg-slate-50 text-slate-600 ring-slate-100")}>{item.treinamentosVencidos}</span>
                                            </td>
                                            <td className="px-3 py-3 text-center">
                                                <span className={classNames("inline-flex min-w-8 justify-center rounded-full px-2 py-1 text-xs font-bold ring-1", item.colaboradoresBloqueados > 0 ? "bg-red-50 text-red-700 ring-red-100" : "bg-slate-50 text-slate-600 ring-slate-100")}>{item.colaboradoresBloqueados}</span>
                                            </td>
                                            <td className="py-3 pl-3 text-center">
                                                <span className={classNames("inline-flex min-w-[86px] justify-center rounded-full px-3 py-1 text-xs font-bold ring-1", item.statusEmpresaClasse)}>
                                                    {item.statusEmpresa}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardDashboardRecolhivel>
            );
        }

        if (chave === "colaboradoresFuncao") {
            return (
                <CardDashboardRecolhivel
                    chaveBloco="colaboradoresFuncao"
                    titulo="Colaboradores mobilizados por função"
                    subtitulo="Conta apenas ativos, mobilizados, liberados ou com pendência não bloqueante."
                    badge={(
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                            {colaboradoresPorFuncao.length} função(ões)
                        </span>
                    )}
                >
                    <div className="space-y-2">
                        {colaboradoresPorFuncao.length === 0 ? (
                            mensagemVaziaDashboard("Nenhum colaborador mobilizado encontrado.")
                        ) : (
                            colaboradoresPorFuncao.slice(0, 8).map((item) => (
                                <div key={item.funcao} className="rounded-2xl bg-slate-50 p-3 text-sm ring-1 ring-slate-100">
                                    <div className="flex justify-between gap-3">
                                        <span className="font-semibold text-slate-900">{item.funcao}</span>
                                        <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-slate-600 ring-1 ring-slate-200">{item.quantidade}</span>
                                    </div>
                                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-white ring-1 ring-slate-100">
                                        <div
                                            className="h-full rounded-full bg-slate-900"
                                            style={{ width: `${Math.max(6, Math.round((item.quantidade / maiorQuantidadePorFuncao) * 100))}%` }}
                                        />
                                    </div>
                                    <p className="mt-1 text-xs text-slate-500">
                                        {item.quantidade} colaborador(es) considerado(s) mobilizado(s)
                                    </p>
                                </div>
                            ))
                        )}
                    </div>
                </CardDashboardRecolhivel>
            );
        }

        if (chave === "alertas") {
            return (
                <CardDashboardRecolhivel
                    chaveBloco="alertas"
                    titulo="Alertas importantes"
                    subtitulo="Itens que exigem atenção imediata."
                    badge={(
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                            {alertasImportantes.length} alerta(s)
                        </span>
                    )}
                >
                    <div className="space-y-2">
                        {alertasImportantes.length === 0 ? (
                            mensagemVaziaDashboard("Nenhum alerta importante no momento.")
                        ) : (
                            alertasImportantes.map((item, index) => (
                                <div key={`${item.tipo}-${index}`} className={classNames("rounded-2xl p-3 text-sm ring-1", item.classe)}>
                                    <p className="font-bold">{item.tipo}</p>
                                    <p className="mt-1 text-xs">{item.texto}</p>
                                </div>
                            ))
                        )}
                    </div>
                </CardDashboardRecolhivel>
            );
        }

        if (chave === "documentosTipo") {
            return (
                <CardDashboardRecolhivel
                    chaveBloco="documentosTipo"
                    titulo="Documentos por tipo"
                    subtitulo="Resumo dos documentos empresariais."
                    badge={(
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                            {documentosPorTipo.length} tipo(s)
                        </span>
                    )}
                >
                    <div className="space-y-2">
                        {documentosPorTipo.length === 0 ? (
                            mensagemVaziaDashboard("Nenhum documento empresarial cadastrado.")
                        ) : (
                            documentosPorTipo.slice(0, 8).map((item) => (
                                <div key={item.tipo} className="rounded-2xl bg-slate-50 p-3 text-sm ring-1 ring-slate-100">
                                    <div className="flex justify-between gap-3">
                                        <span className="font-semibold text-slate-900">{item.tipo}</span>
                                        <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-slate-600 ring-1 ring-slate-200">{item.total}</span>
                                    </div>
                                    <p className="mt-1 text-xs text-slate-500">
                                        {item.emDia} em dia · {item.vencendo} a vencer · {item.vencidos} vencido(s)
                                    </p>
                                </div>
                            ))
                        )}
                    </div>
                </CardDashboardRecolhivel>
            );
        }

        if (chave === "ultimosDocumentos") {
            return (
                <CardDashboardRecolhivel
                    chaveBloco="ultimosDocumentos"
                    titulo="Últimos documentos enviados"
                    subtitulo="Certificados e documentos empresariais mais recentes."
                    badge={(
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                            {ultimosDocumentosEnviados.length} envio(s)
                        </span>
                    )}
                >
                    <div className="space-y-2">
                        {ultimosDocumentosEnviados.length === 0 ? (
                            mensagemVaziaDashboard("Nenhum documento enviado ainda.")
                        ) : (
                            ultimosDocumentosEnviados.map((item, index) => (
                                <div key={`${item.origem}-${item.nome}-${index}`} className="rounded-2xl bg-slate-50 p-3 text-sm ring-1 ring-slate-100">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <span className="font-semibold text-slate-900">{item.titulo}</span>
                                        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-slate-600 ring-1 ring-slate-200">{item.origem}</span>
                                    </div>
                                    <p className="mt-1 text-xs text-slate-500">
                                        {item.colaborador} · {item.empresa} · {item.data ? new Date(`${item.data}`.includes("T") ? item.data : `${item.data}T12:00:00`).toLocaleDateString("pt-BR") : "-"}
                                    </p>
                                </div>
                            ))
                        )}
                    </div>
                </CardDashboardRecolhivel>
            );
        }

        return null;
    };


    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Header
                titulo="Dashboard SST"
                subtitulo="Visão executiva dos colaboradores, empresas, documentos, treinamentos, auditoria e armazenamento."
                acao={
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setMostrarFiltroPainel((valor) => !valor)}
                            className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
                        >
                            <Filter className="h-4 w-4" />
                            Personalizar painel
                        </button>

                        <button
                            type="button"
                            onClick={enviarAlertasPendenciasCriticas}
                            disabled={enviandoEmail || pendencias.length === 0}
                            className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <AlertTriangle className="h-4 w-4" />
                            {enviandoEmail ? "Enviando..." : "Enviar alertas por e-mail"}
                        </button>

                        <button
                            type="button"
                            onClick={baixarRelatorioDashboard}
                            className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
                        >
                            <Download className="h-4 w-4" />
                            Exportar relatório
                        </button>
                    </div>
                }
            />

            {mostrarFiltroPainel && (
                <Card className="mb-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                            <h2 className="text-base font-bold text-slate-950">Personalizar painel SST</h2>
                            <p className="mt-1 text-sm text-slate-500">
                                Marque apenas as informações que devem aparecer no dashboard principal. E-mails, acessos e armazenamento por bucket ficam no painel Auditoria.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setBlocosPainelDashboard(painelPadraoDashboard);
                                    setCartasVisiveisDashboard(cartasPadraoDashboard);
                                    setTamanhosCartasDashboard(tamanhosPadraoCartasDashboard);
                                    setTamanhosBlocosDashboard(tamanhosPadraoBlocosDashboard);
                                    setBlocosRecolhidosDashboard(blocosRecolhidosPadraoDashboard);
                                    setOrdemBlocosDashboard(ordemPadraoBlocosDashboard);
                                    setOrdemCartasDashboard(ordemPadraoCartasDashboard);
                                }}
                                className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                            >
                                Mostrar padrão
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setBlocosPainelDashboard({
                                        cards: true,
                                        pendencias: true,
                                        conformidade: true,
                                        colaboradoresFuncao: true,
                                        rankingEmpresas: true,
                                        documentosTipo: false,
                                        ultimosDocumentos: false,
                                        alertas: true,
                                    });
                                    setCartasVisiveisDashboard({
                                        ...cartasPadraoDashboard,
                                        armazenamentoUtilizado: false,
                                        aniversariantesMes: false,
                                        desviosAbertos: false,
                                    });
                                    setTamanhosCartasDashboard({
                                        ...tamanhosPadraoCartasDashboard,
                                        colaboradoresMobilizados: "medio",
                                        colaboradoresLiberados: "medio",
                                        comPendencia: "medio",
                                        colaboradoresBloqueados: "medio",
                                    });
                                    setTamanhosBlocosDashboard({
                                        ...tamanhosPadraoBlocosDashboard,
                                        cards: "destaque",
                                        pendencias: "destaque",
                                        conformidade: "medio",
                                        rankingEmpresas: "destaque",
                                        colaboradoresFuncao: "medio",
                                        alertas: "medio",
                                    });
                                    setOrdemBlocosDashboard([
                                        "cards",
                                        "pendencias",
                                        "rankingEmpresas",
                                        "conformidade",
                                        "colaboradoresFuncao",
                                        "alertas",
                                        "documentosTipo",
                                        "ultimosDocumentos",
                                    ]);
                                    setOrdemCartasDashboard(ordemPadraoCartasDashboard);
                                    setBlocosRecolhidosDashboard(blocosRecolhidosPadraoDashboard);
                                }}
                                className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-200"
                            >
                                Painel compacto
                            </button>
                        </div>
                    </div>

                    <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                        {opcoesPainelDashboard.map((opcao) => {
                            const ativo = Boolean(blocosPainelDashboard[opcao.chave]);

                            return (
                                <button
                                    key={opcao.chave}
                                    type="button"
                                    onClick={() => alternarBlocoPainel(opcao.chave)}
                                    className={classNames(
                                        "flex items-center justify-between gap-3 rounded-2xl px-3 py-2 text-left text-sm font-semibold ring-1 transition",
                                        ativo
                                            ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
                                            : "bg-slate-50 text-slate-500 ring-slate-200"
                                    )}
                                >
                                    <span>{opcao.label}</span>
                                    <span className={classNames(
                                        "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                                        ativo ? "bg-emerald-100 text-emerald-800" : "bg-white text-slate-500 ring-1 ring-slate-200"
                                    )}>
                                        {ativo ? "Visível" : "Oculto"}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {blocosPainelDashboard.cards && (
                        <div className="mt-5 border-t border-slate-100 pt-4">
                            <div className="mb-3 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-950">Cartas principais</h3>
                                    <p className="mt-0.5 text-xs text-slate-500">Escolha quais cards aparecem no topo do dashboard SST.</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setCartasVisiveisDashboard(cartasPadraoDashboard);
                                        setTamanhosCartasDashboard(tamanhosPadraoCartasDashboard);
                                        setOrdemCartasDashboard(ordemPadraoCartasDashboard);
                                    }}
                                    className="self-start rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 sm:self-auto"
                                >
                                    Restaurar cartas e tamanhos
                                </button>
                            </div>

                            <div className="grid gap-3 lg:grid-cols-2">
                                {cardsOrdenados.map((opcao, index) => {
                                    const ativo = cartasVisiveisDashboard[opcao.chave] !== false;
                                    const tamanhoAtual = tamanhosCartasDashboard[opcao.chave] || "padrao";

                                    return (
                                        <div
                                            key={opcao.chave}
                                            onDragOver={(evento) => evento.preventDefault()}
                                            onDrop={() => soltarCartaPainel(opcao.chave)}
                                            className={classNames(
                                                "rounded-2xl p-3 ring-1 transition",
                                                ativo ? "bg-blue-50/60 ring-blue-200" : "bg-slate-50 ring-slate-200",
                                                cartaArrastandoDashboard === opcao.chave ? "opacity-60 ring-2 ring-blue-300" : ""
                                            )}
                                        >
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="flex min-w-0 items-start gap-2">
                                                    <span
                                                        draggable
                                                        onDragStart={(evento) => {
                                                            prepararArrastePainel(evento);
                                                            setCartaArrastandoDashboard(opcao.chave);
                                                        }}
                                                        onDragEnd={() => setCartaArrastandoDashboard(null)}
                                                        className="mt-0.5 inline-flex h-7 w-7 shrink-0 cursor-grab items-center justify-center rounded-xl bg-white text-sm font-bold text-slate-500 ring-1 ring-slate-200 active:cursor-grabbing"
                                                        title="Segure e arraste para mudar a ordem"
                                                    >
                                                        ☰
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => alternarCartaPainel(opcao.chave)}
                                                        className="min-w-0 text-left"
                                                    >
                                                        <span className={classNames("block truncate text-sm font-bold", ativo ? "text-blue-900" : "text-slate-500")}>
                                                            #{index + 1}. {opcao.label}
                                                        </span>
                                                        <span className="mt-0.5 block text-xs text-slate-500">
                                                            {ativo ? "Aparece no painel" : "Oculto no painel"} · arraste pelo ícone ☰
                                                        </span>
                                                    </button>
                                                </div>

                                                <div className="flex shrink-0 items-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => moverCartaPainel(opcao.chave, -1)}
                                                        disabled={index === 0}
                                                        className="rounded-lg bg-white px-2 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                                        title="Mover para a esquerda / para cima"
                                                    >
                                                        ↑
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => moverCartaPainel(opcao.chave, 1)}
                                                        disabled={index === cardsOrdenados.length - 1}
                                                        className="rounded-lg bg-white px-2 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                                        title="Mover para a direita / para baixo"
                                                    >
                                                        ↓
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => alternarCartaPainel(opcao.chave)}
                                                        className={classNames(
                                                            "rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide ring-1",
                                                            ativo ? "bg-blue-100 text-blue-800 ring-blue-200" : "bg-white text-slate-500 ring-slate-200"
                                                        )}
                                                    >
                                                        {ativo ? "Visível" : "Oculto"}
                                                    </button>
                                                </div>
                                            </div>

                                            {ativo && (
                                                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                                                    {opcoesTamanhoCartaDashboard.map((tamanho) => {
                                                        const selecionado = tamanhoAtual === tamanho.chave;

                                                        return (
                                                            <button
                                                                key={tamanho.chave}
                                                                type="button"
                                                                onClick={() => alterarTamanhoCartaPainel(opcao.chave, tamanho.chave)}
                                                                className={classNames(
                                                                    "rounded-xl px-2 py-2 text-center ring-1 transition",
                                                                    selecionado
                                                                        ? "bg-slate-950 text-white ring-slate-950"
                                                                        : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
                                                                )}
                                                            >
                                                                <span className="block text-xs font-bold">{tamanho.label}</span>
                                                                <span className={classNames("mt-0.5 block text-[10px]", selecionado ? "text-slate-200" : "text-slate-400")}>
                                                                    {tamanho.descricao}
                                                                </span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div className="mt-5 border-t border-slate-100 pt-4">
                        <div className="mb-3 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                            <div>
                                <h3 className="text-sm font-bold text-slate-950">Organização dos quadros do Dashboard SST</h3>
                                <p className="mt-0.5 text-xs text-slate-500">
                                    Escolha a posição, o tamanho e a visibilidade de todos os quadros. A ordem abaixo é a mesma ordem exibida no dashboard.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setTamanhosBlocosDashboard(tamanhosPadraoBlocosDashboard);
                                    setBlocosRecolhidosDashboard(blocosRecolhidosPadraoDashboard);
                                    setOrdemBlocosDashboard(ordemPadraoBlocosDashboard);
                                }}
                                className="self-start rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 sm:self-auto"
                            >
                                Restaurar ordem e tamanhos
                            </button>
                        </div>

                        <div className="grid gap-3 lg:grid-cols-2">
                            {opcoesBlocosOrdenadasDashboard.map((opcao, index) => {
                                const ativo = Boolean(blocosPainelDashboard[opcao.chave]);
                                const tamanhoAtual = tamanhosBlocosDashboard[opcao.chave] || "padrao";

                                return (
                                    <div
                                        key={opcao.chave}
                                        onDragOver={(evento) => evento.preventDefault()}
                                        onDrop={() => soltarBlocoPainel(opcao.chave)}
                                        className={classNames(
                                            "rounded-2xl p-3 ring-1 transition",
                                            ativo ? "bg-emerald-50/60 ring-emerald-200" : "bg-slate-50 ring-slate-200",
                                            blocoArrastandoDashboard === opcao.chave ? "opacity-60 ring-2 ring-emerald-300" : ""
                                        )}
                                    >
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                            <div className="flex min-w-0 items-start gap-2">
                                                <span
                                                    draggable
                                                    onDragStart={(evento) => {
                                                        prepararArrastePainel(evento);
                                                        setBlocoArrastandoDashboard(opcao.chave);
                                                    }}
                                                    onDragEnd={() => setBlocoArrastandoDashboard(null)}
                                                    className="mt-0.5 inline-flex h-7 w-7 shrink-0 cursor-grab items-center justify-center rounded-xl bg-white text-sm font-bold text-slate-500 ring-1 ring-slate-200 active:cursor-grabbing"
                                                    title="Segure e arraste para mudar a posição do quadro"
                                                >
                                                    ☰
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => alternarBlocoPainel(opcao.chave)}
                                                    className="min-w-0 text-left"
                                                >
                                                    <span className={classNames("block text-sm font-bold", ativo ? "text-emerald-900" : "text-slate-500")}>
                                                        {index + 1}. {opcao.label}
                                                    </span>
                                                    <span className="mt-0.5 block text-xs text-slate-500">
                                                        {ativo ? "Aparece no painel" : "Oculto no painel"} · arraste pelo ícone ☰
                                                    </span>
                                                </button>
                                            </div>

                                            <div className="flex shrink-0 flex-wrap items-center gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => moverBlocoPainel(opcao.chave, -1)}
                                                    disabled={index === 0}
                                                    className="rounded-lg bg-white px-2 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                                    title="Mover para cima"
                                                >
                                                    ↑
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => moverBlocoPainel(opcao.chave, 1)}
                                                    disabled={index === opcoesBlocosOrdenadasDashboard.length - 1}
                                                    className="rounded-lg bg-white px-2 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                                    title="Mover para baixo"
                                                >
                                                    ↓
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => alternarBlocoPainel(opcao.chave)}
                                                    className={classNames(
                                                        "rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide ring-1",
                                                        ativo ? "bg-emerald-100 text-emerald-800 ring-emerald-200" : "bg-white text-slate-500 ring-slate-200"
                                                    )}
                                                >
                                                    {ativo ? "Visível" : "Oculto"}
                                                </button>
                                            </div>
                                        </div>

                                        {ativo && (
                                            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                                                {opcoesTamanhoBlocoDashboard.map((tamanho) => {
                                                    const selecionado = tamanhoAtual === tamanho.chave;

                                                    return (
                                                        <button
                                                            key={tamanho.chave}
                                                            type="button"
                                                            onClick={() => alterarTamanhoBlocoPainel(opcao.chave, tamanho.chave)}
                                                            className={classNames(
                                                                "rounded-xl px-2 py-2 text-center ring-1 transition",
                                                                selecionado
                                                                    ? "bg-slate-950 text-white ring-slate-950"
                                                                    : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
                                                            )}
                                                        >
                                                            <span className="block text-xs font-bold">{tamanho.label}</span>
                                                            <span className={classNames("mt-0.5 block text-[10px]", selecionado ? "text-slate-200" : "text-slate-400")}>
                                                                {tamanho.descricao}
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </Card>
            )}

            {blocosDashboardOrdenados.length === 0 ? (
                <Card className="mt-6">
                    <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">
                        Nenhum quadro selecionado para o Dashboard SST. Abra Personalizar painel e escolha as informações que deseja exibir.
                    </div>
                </Card>
            ) : (
                <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-6">
                    {blocosDashboardOrdenados.map((chave) => (
                        <div key={chave} className={classNames("min-w-0", classeTamanhoBlocoDashboard(chave))}>
                            {renderBlocoDashboard(chave)}
                        </div>
                    ))}
                </div>
            )}


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
    const [filtroClassificacao, setFiltroClassificacao] = useState("Todos");
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
        dataNascimento: "",
        mostrarAniversarioDashboard: true,
        statusMobilizacao: obterStatusInicialColaborador(),
        treinamentosRemovidos: [],
        treinamentosAdicionais: [],
        foto: null,
        documentosMassa: [],
    });

    const empresasFiltro = ["Todas", ...Array.from(new Set(colaboradores.map((c) => c.empresa).filter(Boolean)))];

    const filtrados = colaboradores.filter((c) => {
        const avaliacao = avaliarTreinamentosColaborador(c);
        const geral = statusGeral(c);
        const texto = normalizarTextoBusca(`${c.nome} ${c.empresa} ${c.empresaExibicao} ${c.empresaPaiNome} ${c.funcao} ${c.matricula} ${c.codigoFuncionario} ${c.statusMobilizacao} ${geral.texto} ${avaliacao.matriz.rotulo}`);
        const bateBusca = texto.includes(normalizarTextoBusca(busca));
        const bateEmpresa = empresa === "Todas" || c.empresa === empresa;
        const bateClassificacao = filtroClassificacao === "Todos" || geral.texto === filtroClassificacao;

        return bateBusca && bateEmpresa && bateClassificacao;
    });

    const resumoTreinamentos = useMemo(() => {
        const avaliacoes = colaboradores.map(avaliarTreinamentosColaborador);
        const classificacoes = colaboradores.map((c) => statusGeral(c).texto);

        return {
            pendentes: avaliacoes.reduce((total, item) => total + item.pendentes.length, 0),
            vencidos: avaliacoes.reduce((total, item) => total + item.vencidos.length, 0),
            vencendo: avaliacoes.reduce((total, item) => total + item.vencendo.length, 0),
            liberados: classificacoes.filter((status) => status === "Liberado").length,
            comPendencia: classificacoes.filter((status) => status === "Com pendência").length,
            bloqueados: classificacoes.filter((status) => status === "Bloqueado").length,
            emAnalise: classificacoes.filter((status) => status === "Em análise").length,
            desmobilizados: classificacoes.filter((status) => status === "Desmobilizado").length,
            inativos: classificacoes.filter((status) => status === "Inativo").length,
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
            dataNascimento: novo.dataNascimento || "",
            mostrarAniversarioDashboard: novo.mostrarAniversarioDashboard !== false,
            statusMobilizacao: novo.statusMobilizacao,
            treinamentosRemovidos: novo.treinamentosRemovidos || [],
            treinamentosAdicionais: novo.treinamentosAdicionais || [],
            foto: novo.foto,
            documentosMassa: novo.documentosMassa || [],
            codigoFuncionario: gerarCodigoFuncionario(novo.nome),
        });

        setSalvando(false);

        if (ok) {
            setNovo({
                nome: "",
                empresaNome: "",
                funcao: "",
                matricula: "",
                dataNascimento: "",
                mostrarAniversarioDashboard: true,
                statusMobilizacao: obterStatusInicialColaborador(),
                treinamentosRemovidos: [],
                treinamentosAdicionais: [],
                foto: null,
                documentosMassa: [],
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

    const arquivosMassaAnaliseNovo = analisarArquivosTreinamentoMassa(novo.documentosMassa || []);
    const arquivosMassaReconhecidosNovo = arquivosMassaAnaliseNovo.filter((item) => item.reconhecido);
    const arquivosMassaNaoReconhecidosNovo = arquivosMassaAnaliseNovo.filter((item) => !item.reconhecido);

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
            dataNascimento: colaborador.dataNascimento || "",
            mostrarAniversarioDashboard: colaborador.mostrarAniversarioDashboard !== false,
            codigoFuncionario: colaborador.codigoFuncionario || "",
            status: colaborador.status || "Ativo",
            statusMobilizacao: colaborador.statusMobilizacao || obterStatusInicialColaborador(),
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
            dataNascimento: colaboradorEdicao.dataNascimento || "",
            mostrarAniversarioDashboard: colaboradorEdicao.mostrarAniversarioDashboard !== false,
            status: colaboradorEdicao.status || "Ativo",
            statusMobilizacao: colaboradorEdicao.statusMobilizacao || obterStatusInicialColaborador(),
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
                                {STATUS_CLASSIFICACAO_COLABORADOR.map((status) => (
                                    <option key={status}>{status}</option>
                                ))}
                            </select>
                            <p className="mt-1 text-xs text-slate-400">
                                Liberado e Com pendência entram como mobilização ativa. Bloqueado, Em análise, Desmobilizado e Inativo ficam fora da contagem de mobilizados.
                            </p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                            <div>
                                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                                    Data de nascimento
                                </label>
                                <input
                                    type="date"
                                    value={novo.dataNascimento}
                                    onChange={(e) => setNovo({ ...novo, dataNascimento: e.target.value })}
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                />
                            </div>
                            <label className="flex min-h-[46px] cursor-pointer items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                                <input
                                    type="checkbox"
                                    checked={novo.mostrarAniversarioDashboard !== false}
                                    onChange={(e) => setNovo({ ...novo, mostrarAniversarioDashboard: e.target.checked })}
                                    className="h-4 w-4 rounded border-slate-300"
                                />
                                Mostrar em aniversariantes
                            </label>
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
                                onChange={(e) => {
                                    const arquivo = e.target.files?.[0] || null;
                                    if (arquivo && !validarArquivoAntesUpload(arquivo, "fotoAuditoria")) {
                                        e.target.value = "";
                                        return;
                                    }
                                    setNovo({ ...novo, foto: arquivo });
                                }}
                            />
                        </label>
                        <FileUploadAviso arquivo={novo.foto} tipo="fotoAuditoria" />

                        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-3">
                            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-blue-200 bg-white px-4 py-4 text-sm font-semibold text-blue-700 hover:bg-blue-50">
                                <Upload className="h-4 w-4" />
                                {novo.documentosMassa?.length
                                    ? `${novo.documentosMassa.length} documento(s) selecionado(s)`
                                    : "Subir documentos de treinamentos em massa"}
                                <input
                                    type="file"
                                    multiple
                                    accept="application/pdf,image/png,image/jpeg,image/webp"
                                    className="hidden"
                                    onChange={(e) => {
                                        const arquivos = Array.from(e.target.files || []);
                                        if (!validarListaArquivosAntesUpload(arquivos, "documentoSimples")) {
                                            e.target.value = "";
                                            return;
                                        }
                                        setNovo({
                                            ...novo,
                                            documentosMassa: arquivos,
                                        });
                                    }}
                                />
                            </label>
                            <FileUploadAviso arquivos={novo.documentosMassa} tipo="documentoSimples" />

                            <p className="mt-2 text-[11px] leading-relaxed text-blue-900">
                                O sistema identifica o treinamento pelo nome do arquivo, por exemplo: ASO, EPI, INTEGRAÇÃO, NR-06, NR-11, NR-12, NR-18, NR-21, NR-25, NR-26, REGISTRO ou OS.
                            </p>

                            {arquivosMassaAnaliseNovo.length > 0 && (
                                <div className="mt-3 max-h-52 space-y-2 overflow-y-auto rounded-2xl bg-white p-2 ring-1 ring-blue-100 scrollbar-discreta">
                                    {arquivosMassaReconhecidosNovo.map((item) => (
                                        <div key={item.nomeArquivo} className="rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-900 ring-1 ring-emerald-100">
                                            <strong>{item.nomeArquivo}</strong>
                                            <br />
                                            {item.treinamento.nome} · Realização: {formatDate(item.dataRealizacao)} · Vencimento: {formatDate(item.dataVencimento)}
                                        </div>
                                    ))}

                                    {arquivosMassaNaoReconhecidosNovo.map((item) => (
                                        <div key={item.nomeArquivo} className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-800 ring-1 ring-red-100">
                                            <strong>{item.nomeArquivo}</strong>
                                            <br />
                                            Não reconhecido. Ajuste o nome do arquivo ou envie pela aba Treinamentos.
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

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

                        <div className="relative min-w-56">
                            <ShieldCheck className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <select
                                value={filtroClassificacao}
                                onChange={(e) => setFiltroClassificacao(e.target.value)}
                                className="w-full appearance-none rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                            >
                                <option value="Todos">Todos os status</option>
                                {STATUS_CLASSIFICACAO_COLABORADOR.map((status) => (
                                    <option key={status} value={status}>{status}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
                        <div className="rounded-2xl bg-slate-50 p-3">
                            <p className="text-xs font-medium text-slate-500">Total</p>
                            <p className="text-2xl font-bold text-slate-950">{colaboradores.length}</p>
                        </div>
                        <div className="rounded-2xl bg-emerald-50 p-3">
                            <p className="text-xs font-medium text-emerald-700">Liberados</p>
                            <p className="text-2xl font-bold text-emerald-700">{resumoTreinamentos.liberados}</p>
                        </div>
                        <div className="rounded-2xl bg-blue-50 p-3">
                            <p className="text-xs font-medium text-blue-700">Com pendência</p>
                            <p className="text-2xl font-bold text-blue-700">{resumoTreinamentos.comPendencia}</p>
                        </div>
                        <div className="rounded-2xl bg-red-50 p-3">
                            <p className="text-xs font-medium text-red-700">Bloqueados</p>
                            <p className="text-2xl font-bold text-red-700">{resumoTreinamentos.bloqueados}</p>
                        </div>
                        <div className="rounded-2xl bg-violet-50 p-3">
                            <p className="text-xs font-medium text-violet-700">Em análise</p>
                            <p className="text-2xl font-bold text-violet-700">{resumoTreinamentos.emAnalise}</p>
                        </div>
                        <div className="rounded-2xl bg-slate-100 p-3">
                            <p className="text-xs font-medium text-slate-700">Desmobilizados</p>
                            <p className="text-2xl font-bold text-slate-700">{resumoTreinamentos.desmobilizados}</p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
                            <p className="text-xs font-medium text-slate-700">Inativos</p>
                            <p className="text-2xl font-bold text-slate-700">{resumoTreinamentos.inativos}</p>
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

                                                            <MobilizacaoBadge status={c.statusMobilizacao || geral.texto} />
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
                                                            {avaliacao.itens.map((item) => {
                                                                const temDocumentoLancado = Boolean(item.realizado);
                                                                const semValidade = treinamentoSemValidade(item.treinamento.id);
                                                                const dataElaboracao = item.realizado?.realizado || "";
                                                                const dataVencimento = item.realizado?.vencimento || "";

                                                                return (
                                                                    <div
                                                                        key={item.treinamento.id}
                                                                        className="flex flex-col gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs lg:flex-row lg:items-center lg:justify-between"
                                                                    >
                                                                        <div className="min-w-0 flex-1">
                                                                            <p className="break-words font-medium text-slate-700">{item.treinamento.nome}</p>

                                                                            {temDocumentoLancado ? (
                                                                                <div className="mt-1 flex flex-wrap gap-1.5 text-[10px] font-semibold">
                                                                                    <span className="rounded-full bg-white px-2 py-0.5 text-slate-600 ring-1 ring-slate-200">
                                                                                        Elaboração: {formatDate(dataElaboracao)}
                                                                                    </span>
                                                                                    <span className="rounded-full bg-white px-2 py-0.5 text-slate-600 ring-1 ring-slate-200">
                                                                                        Vencimento: {semValidade ? "Sem validade" : formatDate(dataVencimento)}
                                                                                    </span>
                                                                                </div>
                                                                            ) : (
                                                                                <p className="mt-1 text-[10px] font-medium text-slate-400">
                                                                                    Documento ainda não enviado.
                                                                                </p>
                                                                            )}
                                                                        </div>

                                                                        <span className={classNames("w-fit shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1", item.status.classe)}>
                                                                            {item.status.texto}
                                                                        </span>
                                                                    </div>
                                                                );
                                                            })}
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
                                        {STATUS_CLASSIFICACAO_COLABORADOR.map((status) => (
                                            <option key={status}>{status}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Data de nascimento</label>
                                    <input
                                        type="date"
                                        value={colaboradorEdicao.dataNascimento || ""}
                                        onChange={(e) => setColaboradorEdicao({ ...colaboradorEdicao, dataNascimento: e.target.value })}
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                    />
                                </div>

                                <label className="flex min-h-[46px] cursor-pointer items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                                    <input
                                        type="checkbox"
                                        checked={colaboradorEdicao.mostrarAniversarioDashboard !== false}
                                        onChange={(e) => setColaboradorEdicao({ ...colaboradorEdicao, mostrarAniversarioDashboard: e.target.checked })}
                                        className="h-4 w-4 rounded border-slate-300"
                                    />
                                    Mostrar em aniversariantes do mês
                                </label>

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
                                            onChange={(e) => {
                                                const arquivo = e.target.files?.[0] || null;
                                                if (arquivo && !validarArquivoAntesUpload(arquivo, "fotoAuditoria")) {
                                                    e.target.value = "";
                                                    return;
                                                }
                                                setColaboradorEdicao({ ...colaboradorEdicao, foto: arquivo });
                                            }}
                                        />
                                    </label>
                                    <FileUploadAviso arquivo={colaboradorEdicao.foto} tipo="fotoAuditoria" />
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


function MobilizacaoBadge({ status }) {
    const statusTexto = String(status || obterStatusInicialColaborador());
    const statusBusca = normalizarTextoBusca(statusTexto);

    const classe =
        statusBusca.includes("liberado")
            ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
            : statusBusca.includes("pendencia") || statusBusca.includes("pendência") || statusBusca.includes("com pend")
                ? "bg-blue-50 text-blue-700 ring-blue-200"
                : statusBusca.includes("bloqueado")
                    ? "bg-red-50 text-red-700 ring-red-200"
                    : statusBusca.includes("analise") || statusBusca.includes("análise")
                        ? "bg-violet-50 text-violet-700 ring-violet-200"
                        : statusBusca.includes("desmobilizado") || statusBusca.includes("inativo")
                            ? "bg-slate-100 text-slate-700 ring-slate-300"
                            : "bg-slate-50 text-slate-700 ring-slate-200";

    return (
        <span
            className={classNames(
                "inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-bold ring-1",
                classe
            )}
        >
            {statusTexto}
        </span>
    );
}

function statusGeralConsultaPublica(colaborador = {}, treinamentos = []) {
    return statusGeral({
        ...colaborador,
        statusMobilizacao: colaborador.statusMobilizacao || colaborador.status_mobilizacao || "",
        treinamentos,
    });
}


function AuditoriaCampoQRCode({ colaborador = {}, treinamentos = [], onAuditoriaSalva }) {
    const [aberta, setAberta] = useState(false);
    const [salvando, setSalvando] = useState(false);
    const [mensagem, setMensagem] = useState("");
    const [respostas, setRespostas] = useState({
        epi: "conforme",
        frente_trabalho: "conforme",
        comportamento_seguro: "conforme",
    });
    const [auditorNome, setAuditorNome] = useState("");
    const [desvio, setDesvio] = useState({
        descricao: "",
        gravidade: "Leve",
        acaoImediata: "",
        responsavel: "",
        prazo: "",
        status: "Aberto",
        observacao: "",
        fotoAntes: null,
        fotoDepois: null,
    });

    const resultado = useMemo(() => calcularResultadoAuditoriaCampo(respostas), [respostas]);
    const precisaDesvio = resultado.temDesvioGrave || resultado.itens.some((item) => ["nao_conforme", "observacao_leve"].includes(item.resposta.chave));

    const alterarResposta = (categoria, resposta) => {
        setRespostas((atual) => ({ ...atual, [categoria]: resposta }));
    };

    const uploadFotoAuditoria = async (arquivo, auditoriaId, tipo) => {
        if (!arquivo) return "";

        if (!validarArquivoAntesUpload(arquivo, "fotoAuditoria")) {
            throw new Error("Foto fora do tamanho recomendado para auditoria.");
        }

        const nomeArquivo = `${auditoriaId}/${tipo}-${Date.now()}-${sanitizarNomeArquivo(arquivo.name || "foto.jpg")}`;
        const { error } = await supabase.storage
            .from("auditorias-campo")
            .upload(nomeArquivo, arquivo, { upsert: true });

        if (error) throw error;

        const { data } = supabase.storage.from("auditorias-campo").getPublicUrl(nomeArquivo);
        return data?.publicUrl || nomeArquivo;
    };

    const salvarAuditoria = async () => {
        setMensagem("");

        if (precisaDesvio && !desvio.descricao.trim()) {
            setMensagem("Preencha a descrição do desvio antes de salvar a auditoria.");
            return;
        }

        setSalvando(true);

        try {
            const statusDocumental = statusGeralConsultaPublica(colaborador, treinamentos).texto;
            const checklist = resultado.itens.map((item) => ({
                categoria: item.categoria.texto,
                chave_categoria: item.categoria.chave,
                resposta: item.resposta.texto,
                chave_resposta: item.resposta.chave,
                pontos: item.resposta.pontos,
            }));

            const desvioPayloadBase = precisaDesvio
                ? {
                    categoria: resultado.temDesvioGrave ? "Desvio grave" : "Pendência de auditoria",
                    descricao: desvio.descricao.trim(),
                    gravidade: resultado.temDesvioGrave ? "Crítica" : desvio.gravidade,
                    acao_imediata: desvio.acaoImediata.trim(),
                    responsavel: desvio.responsavel.trim(),
                    prazo: desvio.prazo || null,
                    status: desvio.status,
                    observacao: desvio.observacao.trim(),
                }
                : null;

            const auditoriaPayload = {
                colaborador_id: colaborador.id || null,
                empresa_id: colaborador.empresaId || colaborador.empresa_id || null,
                token_qr: colaborador.token || colaborador.token_qr || "",
                colaborador_nome: colaborador.nome || "",
                empresa_nome: colaborador.empresaExibicao || colaborador.empresa || "",
                funcao: colaborador.funcao || "",
                status_documental: statusDocumental,
                checklist,
                pontuacao: resultado.percentual,
                classificacao: resultado.classificacao,
                tem_desvio_grave: resultado.temDesvioGrave,
                categoria_desvio_principal: desvioPayloadBase?.categoria || "",
                total_desvios: desvioPayloadBase ? 1 : 0,
                status_desvio: desvioPayloadBase?.status || "Sem desvio",
                auditor_nome: auditorNome.trim() || "Auditor via QR Code",
                origem: "QR Code do colaborador",
            };

            const auditoriaId = typeof crypto !== "undefined" && crypto.randomUUID
                ? crypto.randomUUID()
                : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
            const auditoriaCriada = {
                id: auditoriaId,
                ...auditoriaPayload,
                created_at: new Date().toISOString(),
            };

            const { error: erroAuditoria } = await supabase
                .from("auditorias_campo")
                .insert(auditoriaCriada);

            if (erroAuditoria) throw erroAuditoria;

            let desvioCriado = null;

            if (desvioPayloadBase) {
                let fotoAntesUrl = "";
                let fotoDepoisUrl = "";

                try {
                    fotoAntesUrl = await uploadFotoAuditoria(desvio.fotoAntes, auditoriaCriada.id, "antes");
                    fotoDepoisUrl = await uploadFotoAuditoria(desvio.fotoDepois, auditoriaCriada.id, "depois");
                } catch (erroFoto) {
                    setMensagem(`Auditoria salva, mas a foto não foi enviada: ${erroFoto.message}`);
                }

                const desvioPayload = {
                    ...desvioPayloadBase,
                    auditoria_id: auditoriaCriada.id,
                    colaborador_id: auditoriaPayload.colaborador_id,
                    empresa_id: auditoriaPayload.empresa_id,
                    foto_antes_url: fotoAntesUrl,
                    foto_depois_url: fotoDepoisUrl,
                };

                const desvioId = typeof crypto !== "undefined" && crypto.randomUUID
                    ? crypto.randomUUID()
                    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
                const desvioInserido = {
                    id: desvioId,
                    ...desvioPayload,
                    created_at: new Date().toISOString(),
                };

                const { error: erroDesvio } = await supabase
                    .from("auditoria_campo_desvios")
                    .insert(desvioInserido);

                if (erroDesvio) throw erroDesvio;
                desvioCriado = desvioInserido;
            }

            const normalizada = normalizarAuditoriaCampo({
                ...auditoriaCriada,
                desvios: desvioCriado ? [desvioCriado] : [],
            });

            onAuditoriaSalva?.(normalizada);
            setMensagem("Auditoria registrada com sucesso.");
            setAberta(false);
            setRespostas({ epi: "conforme", frente_trabalho: "conforme", comportamento_seguro: "conforme" });
            setDesvio({
                descricao: "",
                gravidade: "Leve",
                acaoImediata: "",
                responsavel: "",
                prazo: "",
                status: "Aberto",
                observacao: "",
                fotoAntes: null,
                fotoDepois: null,
            });
        } catch (erro) {
            setMensagem(`Erro ao registrar auditoria: ${erro.message}`);
        } finally {
            setSalvando(false);
        }
    };

    return (
        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h3 className="text-lg font-bold text-slate-950">Auditoria de campo</h3>
                    <p className="mt-1 text-sm text-slate-500">Checklist rápido por QR Code para EPI, frente de trabalho e comportamento seguro.</p>
                </div>
                <button
                    type="button"
                    onClick={() => setAberta((valor) => !valor)}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800"
                >
                    <ClipboardCheck className="h-4 w-4" />
                    {aberta ? "Fechar auditoria" : "Realizar Auditoria"}
                </button>
            </div>

            {mensagem && (
                <div className={classNames("mt-4 rounded-2xl px-4 py-3 text-sm font-semibold ring-1", mensagem.includes("Erro") ? "bg-red-50 text-red-700 ring-red-200" : "bg-emerald-50 text-emerald-700 ring-emerald-200")}>
                    {mensagem}
                </div>
            )}

            {aberta && (
                <div className="mt-5 space-y-5">
                    <div className="grid gap-3 md:grid-cols-3">
                        {categoriasAuditoriaCampo.map((categoria) => (
                            <div key={categoria.chave} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                                <label className="block text-sm font-bold text-slate-800">{categoria.texto}</label>
                                <select
                                    value={respostas[categoria.chave] || "conforme"}
                                    onChange={(e) => alterarResposta(categoria.chave, e.target.value)}
                                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                                >
                                    {respostasAuditoriaCampo.map((resposta) => (
                                        <option key={resposta.chave} value={resposta.chave}>
                                            {resposta.texto} ({resposta.pontos > 0 ? "+" : ""}{resposta.pontos})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        ))}
                    </div>

                    <div className="rounded-2xl bg-slate-950 p-4 text-white">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-300">Resultado parcial</p>
                        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                            <div>
                                <p className="text-3xl font-black">{resultado.percentual}%</p>
                                <p className="text-sm text-slate-300">{resultado.classificacao}</p>
                            </div>
                            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold">Pontos: {resultado.pontos}</span>
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <label className="block text-sm font-bold text-slate-700">Nome do auditor</label>
                            <input
                                value={auditorNome}
                                onChange={(e) => setAuditorNome(e.target.value)}
                                placeholder="Quem realizou a auditoria"
                                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700">Status do desvio</label>
                            <select
                                value={desvio.status}
                                onChange={(e) => setDesvio({ ...desvio, status: e.target.value })}
                                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                            >
                                {statusDesvioAuditoriaCampo.map((status) => <option key={status}>{status}</option>)}
                            </select>
                        </div>
                    </div>

                    {precisaDesvio && (
                        <div className="rounded-3xl border border-orange-200 bg-orange-50 p-4">
                            <h4 className="font-bold text-orange-900">Registro de desvio</h4>
                            <p className="mt-1 text-sm text-orange-700">Obrigatório quando houver observação, não conformidade ou desvio grave.</p>

                            <div className="mt-4 grid gap-4 md:grid-cols-2">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-bold text-slate-700">Descrição</label>
                                    <textarea
                                        value={desvio.descricao}
                                        onChange={(e) => setDesvio({ ...desvio, descricao: e.target.value })}
                                        rows={3}
                                        placeholder="Descreva o desvio identificado"
                                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700">Gravidade</label>
                                    <select
                                        value={desvio.gravidade}
                                        onChange={(e) => setDesvio({ ...desvio, gravidade: e.target.value })}
                                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                                    >
                                        {gravidadesAuditoriaCampo.map((gravidade) => <option key={gravidade}>{gravidade}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700">Responsável</label>
                                    <input
                                        value={desvio.responsavel}
                                        onChange={(e) => setDesvio({ ...desvio, responsavel: e.target.value })}
                                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700">Ação imediata</label>
                                    <input
                                        value={desvio.acaoImediata}
                                        onChange={(e) => setDesvio({ ...desvio, acaoImediata: e.target.value })}
                                        placeholder="Ex.: paralisar atividade e corrigir EPI"
                                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700">Prazo</label>
                                    <input
                                        type="date"
                                        value={desvio.prazo}
                                        onChange={(e) => setDesvio({ ...desvio, prazo: e.target.value })}
                                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700">Foto antes</label>
                                    <input
                                        type="file"
                                        accept="image/png,image/jpeg,image/webp"
                                        onChange={(e) => setDesvio({ ...desvio, fotoAntes: e.target.files?.[0] || null })}
                                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                                    />
                                    <FileUploadAviso arquivo={desvio.fotoAntes} tipo="fotoAuditoria" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700">Foto depois</label>
                                    <input
                                        type="file"
                                        accept="image/png,image/jpeg,image/webp"
                                        onChange={(e) => setDesvio({ ...desvio, fotoDepois: e.target.files?.[0] || null })}
                                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                                    />
                                    <FileUploadAviso arquivo={desvio.fotoDepois} tipo="fotoAuditoria" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-bold text-slate-700">Observação</label>
                                    <textarea
                                        value={desvio.observacao}
                                        onChange={(e) => setDesvio({ ...desvio, observacao: e.target.value })}
                                        rows={2}
                                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    <button
                        type="button"
                        disabled={salvando}
                        onClick={salvarAuditoria}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
                    >
                        {salvando ? "Salvando auditoria..." : "Salvar auditoria de campo"}
                    </button>
                </div>
            )}
        </div>
    );
}

function ConsultaQRPublica({ dados }) {
    const colaborador = dados?.colaborador || {};
    const treinamentos = dados?.treinamentos || [];
    const geral = statusGeralConsultaPublica(colaborador, treinamentos);
    const [auditoriasCampoQr, setAuditoriasCampoQr] = useState([]);
    const [carregandoAuditoriasCampoQr, setCarregandoAuditoriasCampoQr] = useState(false);

    const carregarAuditoriasCampoQr = useCallback(async () => {
        if (!dados) {
            setAuditoriasCampoQr([]);
            setCarregandoAuditoriasCampoQr(false);
            return;
        }

        const token = colaborador.token || colaborador.token_qr || new URLSearchParams(window.location.search).get("qr") || "";

        if (!token && !colaborador.id) {
            setAuditoriasCampoQr([]);
            return;
        }

        setCarregandoAuditoriasCampoQr(true);

        try {
            const { data, error } = await supabase.rpc("consulta_auditorias_campo_qr", {
                token_param: token,
            });

            if (!error) {
                const lista = Array.isArray(data) ? data : Array.isArray(data?.auditorias) ? data.auditorias : [];
                setAuditoriasCampoQr(lista.map((item) => normalizarAuditoriaCampo({
                    ...item,
                    desvios: item.desvios || item.auditoria_campo_desvios || [],
                })));
            }
        } finally {
            setCarregandoAuditoriasCampoQr(false);
        }
    }, [dados, colaborador.id, colaborador.token, colaborador.token_qr]);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            carregarAuditoriasCampoQr();
        }, 0);

        return () => window.clearTimeout(timer);
    }, [carregarAuditoriasCampoQr]);

    if (!dados) return null;

    const ultimaAuditoriaCampoQr = auditoriasCampoQr[0] || null;
    const mediaAuditoriaCampoQr = auditoriasCampoQr.length
        ? Math.round(auditoriasCampoQr.reduce((total, item) => total + Number(item.pontuacao || 0), 0) / auditoriasCampoQr.length)
        : null;

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
                        <div className="mt-3">
                            <MobilizacaoBadge status={colaborador.statusMobilizacao} />
                        </div>
                    </div>

                    <div className="mt-5">
                        <div className="w-full rounded-2xl bg-slate-950 px-5 py-4 text-center shadow-sm">
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-300">Status geral do colaborador</p>
                            <p className="mt-1 text-base font-bold text-white">{geral.texto}</p>
                        </div>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Última auditoria</p>
                            <p className="mt-1 text-sm font-bold text-slate-900">{carregandoAuditoriasCampoQr ? "Carregando..." : ultimaAuditoriaCampoQr ? formatarDataHora(ultimaAuditoriaCampoQr.createdAt) : "Sem registro"}</p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Pontuação média</p>
                            <p className="mt-1 text-sm font-bold text-slate-900">{mediaAuditoriaCampoQr === null ? "Sem média" : `${mediaAuditoriaCampoQr}%`}</p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Classificação</p>
                            <span className={classNames("mt-2 inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1", classeClassificacaoAuditoriaCampo(ultimaAuditoriaCampoQr?.classificacao))}>
                                {ultimaAuditoriaCampoQr?.classificacao || "Sem auditoria"}
                            </span>
                        </div>
                    </div>

                    <AuditoriaCampoQRCode
                        colaborador={colaborador}
                        treinamentos={treinamentos}
                        onAuditoriaSalva={(novaAuditoria) => setAuditoriasCampoQr((atual) => [novaAuditoria, ...atual])}
                    />

                    {auditoriasCampoQr.length > 0 && (
                        <div className="mt-6 rounded-3xl border border-slate-200 p-4">
                            <h3 className="text-lg font-bold text-slate-950">Histórico de auditorias do colaborador</h3>
                            <div className="mt-3 space-y-2">
                                {auditoriasCampoQr.slice(0, 5).map((auditoria) => (
                                    <div key={auditoria.id} className="flex flex-col gap-2 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <p className="text-sm font-bold text-slate-900">{formatarDataHora(auditoria.createdAt)}</p>
                                            <p className="text-xs text-slate-500">{auditoria.auditorNome || "Auditor não informado"} · {auditoria.totalDesvios} desvio(s)</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700 ring-1 ring-slate-200">{auditoria.pontuacao}%</span>
                                            <span className={classNames("rounded-full px-3 py-1 text-xs font-bold ring-1", classeClassificacaoAuditoriaCampo(auditoria.classificacao))}>{auditoria.classificacao}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

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
                            const semValidade = treinamentoSemValidade(t.treinamentoId);
                            const st = statusDocumento(t.vencimento, semValidade);
                            const dias = semValidade ? null : diasParaVencer(t.vencimento);
                            const dataInicio = new Date(`${t.realizado}T12:00:00`);
                            const dataFim = new Date(`${t.vencimento}T12:00:00`);
                            const totalValidade = dias === null ? 1 : Math.max(1, Math.ceil((dataFim - dataInicio) / DAY));
                            const percentualRestante =
                                dias === null
                                    ? 100
                                    : dias < 0
                                        ? 100
                                        : Math.max(4, Math.min(100, Math.round((dias / totalValidade) * 100)));
                            const alerta30Dias = dias !== null && dias >= 0 && dias <= 30;

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
                                            <p className="font-semibold text-slate-700">{semValidade ? "Sem validade" : formatDate(t.vencimento)}</p>
                                        </div>
                                    </div>

                                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                                        <div
                                            className={classNames("h-full rounded-full transition-all", dias < 0 || alerta30Dias ? "bg-red-500" : st.barra)}
                                            style={{ width: `${percentualRestante}%` }}
                                        />
                                    </div>

                                    <p className={classNames("mt-3 text-xs font-medium", alerta30Dias || dias < 0 ? "text-red-700" : "text-slate-500")}>
                                        {semValidade
                                            ? "Documento sem validade definida."
                                            : dias < 0
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
    onRegistrarEmailEnviado,
}) {
    const [colabId, setColabId] = useState(
        () =>
            (colaboradores.find((c) => String(c.id) === String(colaboradorInicialId)) || colaboradores[0])
                ?.codigoFuncionario || ""
    );
    const [treinamentoId, setTreinamentoId] = useState(treinamentosBase[0].id);
    const [dataRealizacao, setDataRealizacao] = useState(hoje.toISOString().slice(0, 10));
    const [arquivoSelecionado, setArquivoSelecionado] = useState(null);
    const [sugestaoDataArquivo, setSugestaoDataArquivo] = useState(null);
    const [observacao, setObservacao] = useState("");
    const [salvandoCertificado, setSalvandoCertificado] = useState(false);
    const [arquivosLote, setArquivosLote] = useState([]);
    const [salvandoLote, setSalvandoLote] = useState(false);
    const [sincronizandoStorage, setSincronizandoStorage] = useState(false);
    const [resultadoLote, setResultadoLote] = useState("");
    const [datasRevisao, setDatasRevisao] = useState({});
    const [salvandoDatasId, setSalvandoDatasId] = useState("");
    const [certificadosAbertos, setCertificadosAbertos] = useState({});
    const [gruposCertificadosAbertos, setGruposCertificadosAbertos] = useState({});
    const [buscaCertificados, setBuscaCertificados] = useState("");
    const [filtroStatusCertificados, setFiltroStatusCertificados] = useState("Todos");
    const [exigenciasAbertas, setExigenciasAbertas] = useState(false);
    const [enviandoAlertaTst, setEnviandoAlertaTst] = useState(false);

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
            setSugestaoDataArquivo(null);
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

    const prepararArquivosLote = async (listaArquivos) => {
        const arquivos = Array.from(listaArquivos || []);

        if (!validarListaArquivosAntesUpload(arquivos, "documentoSimples")) {
            setArquivosLote([]);
            return;
        }

        if (!colabSelecionado?.codigoFuncionario) {
            alert("Selecione o colaborador antes de enviar documentos em massa.");
            return;
        }

        const preparados = await Promise.all(
            arquivos.map(async (arquivo, index) => {
                const treinamento = inferirTreinamentoPorNomeArquivo(arquivo.name);
                const sugestaoData = await detectarDataEmissaoArquivo(arquivo);
                const dataArquivo = sugestaoData.data || dataRealizacaoPorArquivo(arquivo);
                const colaboradorSugerido = identificarColaboradorPorArquivo(arquivo);
                const pareceOutroColaborador =
                    colaboradorSugerido?.codigoFuncionario &&
                    String(colaboradorSugerido.codigoFuncionario) !== String(colabSelecionado.codigoFuncionario);

                return {
                    id: `${Date.now()}-${index}-${arquivo.name}`,
                    arquivo,
                    colaboradorCodigo: colabSelecionado.codigoFuncionario,
                    colaboradorSugeridoCodigo: colaboradorSugerido?.codigoFuncionario || "",
                    treinamentoId: treinamento?.id || "",
                    dataRealizacao: dataArquivo,
                    dataVencimento: treinamento ? calcularVencimentoTreinamento(treinamento.id, dataArquivo) : "",
                    sugestaoData,
                    status: treinamento
                        ? pareceOutroColaborador
                            ? `Atenção: arquivo parece ser de ${colaboradorSugerido.nome}`
                            : sugestaoData.data
                                ? "Treinamento e data identificados"
                                : "Treinamento identificado"
                        : "Treinamento não identificado",
                };
            })
        );

        setArquivosLote(preparados);
        setResultadoLote("");
    };

    const alterarColaboradorArquivoLote = (arquivoId, colaboradorCodigo) => {
        setArquivosLote((atual) =>
            atual.map((item) =>
                item.id === arquivoId
                    ? {
                        ...item,
                        colaboradorCodigo,
                        status: colaboradorCodigo
                            ? item.treinamentoId
                                ? "Conferido"
                                : "Treinamento não identificado"
                            : "Selecione o colaborador",
                    }
                    : item
            )
        );
    };

    const alterarTreinamentoArquivoLote = (arquivoId, treinamentoId) => {
        setArquivosLote((atual) =>
            atual.map((item) => {
                if (item.id !== arquivoId) return item;

                const treinamento = obterTreinamento(Number(treinamentoId));
                const dataBase = item.dataRealizacao || dataRealizacao;

                return {
                    ...item,
                    treinamentoId: treinamento?.id || "",
                    dataVencimento: treinamento ? calcularVencimentoTreinamento(treinamento.id, dataBase) : "",
                    status: treinamento && item.colaboradorCodigo ? "Conferido" : "Conferir dados",
                };
            })
        );
    };

    const alterarDataArquivoLote = (arquivoId, data) => {
        setArquivosLote((atual) =>
            atual.map((item) => {
                if (item.id !== arquivoId) return item;

                return {
                    ...item,
                    dataRealizacao: data,
                    dataVencimento: item.treinamentoId
                        ? calcularVencimentoTreinamento(item.treinamentoId, data)
                        : "",
                };
            })
        );
    };

    const selecionarArquivoCertificado = async (arquivo) => {
        setArquivoSelecionado(null);
        setSugestaoDataArquivo(null);

        if (!arquivo) return;

        if (!validarArquivoAntesUpload(arquivo, "documentoSimples")) return;

        setArquivoSelecionado(arquivo);

        const sugestao = await detectarDataEmissaoArquivo(arquivo);

        setSugestaoDataArquivo(sugestao);

        if (sugestao.data) {
            setDataRealizacao(sugestao.data);
        }
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

        const incompletos = arquivosLote.filter(
            (item) =>
                !item.colaboradorCodigo ||
                !item.treinamentoId ||
                !item.dataRealizacao ||
                (!treinamentoSemValidade(item.treinamentoId) && !item.dataVencimento)
        );

        if (incompletos.length > 0) {
            alert("Antes de salvar, confira colaborador, treinamento e datas de todos os arquivos do lote.");
            return;
        }

        setSalvandoLote(true);
        setResultadoLote("");

        let salvos = 0;
        let falhas = 0;
        const erros = [];

        for (const item of arquivosLote) {
            const colaboradorDoArquivo = colaboradores.find((c) => String(c.codigoFuncionario) === String(item.colaboradorCodigo));

            const ok = await onSalvarCertificado({
                colaboradorCodigo: String(item.colaboradorCodigo || ""),
                colaborador: colaboradorDoArquivo,
                treinamentoId: Number(item.treinamentoId),
                dataRealizacao: item.dataRealizacao,
                dataVencimento: item.dataVencimento,
                arquivo: item.arquivo,
                arquivoNome: item.arquivo.name,
                observacao: observacao.trim() || "Enviado em lote com distribuição automática por nome do arquivo",
            });

            if (ok) {
                salvos += 1;
            } else {
                falhas += 1;
                erros.push(item.arquivo.name);
            }
        }

        setSalvandoLote(false);
        setResultadoLote(
            `${salvos} certificado(s) salvo(s) e distribuído(s) por treinamento. ${falhas} falha(s).${erros.length ? ` Falhas: ${erros.join(", ")}` : ""
            }`
        );

        if (falhas === 0) {
            setArquivosLote([]);
            setObservacao("");
        }
    };

    const documentos = colaboradores.flatMap((c) =>
        (c.treinamentos || []).map((t) => ({ ...t, colaborador: c, treinamento: obterTreinamento(t.treinamentoId) }))
    );

    const documentosFiltrados = documentos.filter((documento) => {
        const vencimentoFiltro = datasRevisao[documento.id]?.vencimento ?? documento.vencimento ?? "";
        const status = statusDocumento(vencimentoFiltro, treinamentoSemValidade(documento.treinamentoId));
        const termo = normalizarTextoBusca(buscaCertificados);

        const textoBusca = normalizarTextoBusca(
            `${documento.colaborador?.nome || ""} ${documento.colaborador?.empresaExibicao || documento.colaborador?.empresa || ""} ${documento.colaborador?.codigoFuncionario || ""} ${documento.treinamento?.nome || ""} ${documento.arquivo || ""} ${status.texto || ""}`
        );

        const bateBusca = !termo || textoBusca.includes(termo);
        const bateStatus =
            filtroStatusCertificados === "Todos" ||
            (filtroStatusCertificados === "Em dia" && ["emdia", "semvalidade"].includes(status.chave)) ||
            (filtroStatusCertificados === "A vencer" && status.chave === "vencendo") ||
            (filtroStatusCertificados === "Vencido" && status.chave === "vencido");

        return bateBusca && bateStatus;
    });

    const documentosPorColaborador = colaboradores
        .map((colaborador) => {
            const avaliacao = avaliarTreinamentosColaborador(colaborador);
            const termo = normalizarTextoBusca(buscaCertificados);
            const certificadosDoColaborador = documentosFiltrados.filter(
                (documento) => String(documento.colaborador?.id) === String(colaborador.id)
            );

            const pendentesDoColaborador = avaliacao.itens
                .filter((item) => item.status.chave === "pendente")
                .filter((item) => {
                    const textoBusca = normalizarTextoBusca(
                        `${colaborador.nome || ""} ${colaborador.empresaExibicao || colaborador.empresa || ""} ${colaborador.codigoFuncionario || ""} ${item.treinamento?.nome || ""} pendente faltando`
                    );

                    const bateBusca = !termo || textoBusca.includes(termo);
                    const bateStatus = filtroStatusCertificados === "Todos" || filtroStatusCertificados === "Pendentes";

                    return bateBusca && bateStatus;
                });

            return {
                colaborador,
                certificados: certificadosDoColaborador,
                pendentes: pendentesDoColaborador,
                avaliacao,
            };
        })
        .filter((grupo) => {
            if (filtroStatusCertificados === "Pendentes") return grupo.pendentes.length > 0;

            return grupo.certificados.length > 0 || grupo.pendentes.length > 0;
        });

    const enviarDocumentoPendente = (colaborador, treinamento) => {
        setColabId(colaborador.codigoFuncionario);
        setTreinamentoId(Number(treinamento.id));
        setArquivoSelecionado(null);
        setSugestaoDataArquivo(null);
        setObservacao("");

        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const totalPorStatusCertificados = documentos.reduce(
        (acc, documento) => {
            const status = statusDocumento(documento.vencimento, treinamentoSemValidade(documento.treinamentoId));

            if (status.chave === "vencido") acc.vencidos += 1;
            else if (status.chave === "vencendo") acc.aVencer += 1;
            else acc.emDia += 1;

            return acc;
        },
        {
            emDia: 0,
            aVencer: 0,
            vencidos: 0,
            pendentes: colaboradores.reduce(
                (total, colaborador) => total + avaliarTreinamentosColaborador(colaborador).pendentes.length,
                0
            ),
        }
    );


    const alertasTstPorEmpresa = useMemo(() => {
        const grupos = {};

        colaboradores.forEach((colaborador) => {
            (colaborador.treinamentos || []).forEach((certificado) => {
                const dias = diasParaVencer(certificado.vencimento);

                if (dias === null || dias > 30) return;

                const tipoAlerta = dias < 0 ? "vencido" : "a vencer";
                const empresaNome = colaborador.empresaExibicao || colaborador.empresa || "Empresa não informada";
                const chave = colaborador.empresaId || empresaNome;
                const treinamento = obterTreinamento(certificado.treinamentoId);

                if (!grupos[chave]) {
                    grupos[chave] = {
                        empresa: empresaNome,
                        tstResponsavel: colaborador.empresaTstResponsavel || "",
                        tstEmail: emailTstDaEmpresa(colaborador),
                        itens: [],
                    };
                }

                grupos[chave].itens.push({
                    colaborador: colaborador.nome,
                    codigo: colaborador.codigoFuncionario,
                    funcao: colaborador.funcao,
                    situacaoObra: colaborador.statusMobilizacao || obterStatusInicialColaborador(),
                    statusColaborador: statusGeral(colaborador).texto,
                    empresa: empresaNome,
                    treinamento: certificado.nomeTreinamento || treinamento.nome,
                    realizacao: certificado.realizado || "",
                    vencimento: certificado.vencimento,
                    arquivo: certificado.arquivo || certificado.arquivoNome || "",
                    dias,
                    tipoAlerta,
                });
            });
        });

        return Object.values(grupos).sort((a, b) => a.empresa.localeCompare(b.empresa));
    }, [colaboradores]);

    const montarAvisoAlertaTst = (grupo) => {
        const destinatario = normalizarEmailDestinatario(grupo.tstEmail);

        const itensOrdenados = [...(grupo.itens || [])].sort((a, b) => a.dias - b.dias);
        const totalVencidos = itensOrdenados.filter((item) => item.dias < 0).length;
        const totalAVencer = itensOrdenados.filter((item) => item.dias >= 0).length;

        const assunto = `Aviso SST - ${totalVencidos} vencido(s) e ${totalAVencer} a vencer - ${grupo.empresa}`;

        const linhas = itensOrdenados
            .map((item, index) => {
                const statusPrazo =
                    item.dias < 0
                        ? `VENCIDO HÁ ${Math.abs(item.dias)} DIA(S)`
                        : `A VENCER EM ${item.dias} DIA(S)`;

                return [
                    `${index + 1}. COLABORADOR: ${item.colaborador}`,
                    `Código: ${item.codigo || "-"}`,
                    `Função: ${item.funcao || "-"}`,
                    `Situação na obra: ${item.situacaoObra || "-"}`,
                    `Status automático: ${item.statusColaborador || "-"}`,
                    `Empresa: ${item.empresa || grupo.empresa}`,
                    `Documento/Treinamento: ${item.treinamento}`,
                    `Data de elaboração/realização: ${item.realizacao ? formatDate(item.realizacao) : "Não informada"}`,
                    `Data de vencimento: ${formatDate(item.vencimento)}`,
                    `Status: ${statusPrazo}`,
                    `Arquivo: ${item.arquivo || "Não informado"}`,
                ].join("\n");
            })
            .join("\n\n");

        const corpo = [
            `Olá${grupo.tstResponsavel ? `, ${grupo.tstResponsavel}` : ""}.`,
            "",
            "Segue aviso automático de documentos/treinamentos SST vencidos ou com vencimento previsto para os próximos 30 dias.",
            "",
            `Empresa: ${grupo.empresa}`,
            `TST responsável: ${grupo.tstResponsavel || "Não informado"}`,
            `Resumo: ${totalVencidos} vencido(s) e ${totalAVencer} a vencer.`,
            "",
            linhas,
            "",
            "Solicitamos regularizar os documentos vencidos e programar a renovação dos próximos vencimentos para evitar bloqueio de atividade.",
            "",
            "Atenciosamente,",
            "Sistema de Controle SST QR",
        ].join("\n");

        return { destinatario, assunto, corpo };
    };

    const copiarAvisoAlertaTst = async (grupo) => {
        const { assunto, corpo } = montarAvisoAlertaTst(grupo);
        const texto = `${assunto}\n\n${corpo}`;

        try {
            await navigator.clipboard.writeText(texto);
            alert("Aviso copiado. Cole o conteúdo no e-mail ou WhatsApp do TST.");
        } catch {
            window.prompt("Copie o aviso abaixo:", texto);
        }
    };

    const abrirEmailAlertaTst = async (grupo) => {
        const { destinatario, assunto, corpo } = montarAvisoAlertaTst(grupo);

        if (!destinatario) {
            alert("Cadastre o e-mail do Técnico de Segurança responsável na empresa antes de enviar o aviso.");
            return;
        }

        const mailtoUrl = `mailto:${destinatario}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;

        try {
            await navigator.clipboard.writeText(`${assunto}\n\n${corpo}`);
        } catch {
            // Se o navegador bloquear a cópia automática, apenas tenta abrir o e-mail.
        }

        const link = document.createElement("a");

        link.href = mailtoUrl;
        link.target = "_self";
        link.rel = "noopener noreferrer";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        window.setTimeout(() => {
            alert("Se o e-mail não abrir, verifique se existe aplicativo de e-mail padrão configurado no computador. O aviso também foi copiado para a área de transferência quando permitido pelo navegador.");
        }, 700);
    };


    const enviarEmailAlertaTstAutomatico = async (grupo) => {
        const { destinatario, assunto } = montarAvisoAlertaTst(grupo);

        if (!destinatario) {
            alert("Cadastre o e-mail do Técnico de Segurança responsável na empresa antes de enviar o aviso.");
            return;
        }

        setEnviandoAlertaTst(true);

        try {
            const itens = [...(grupo.itens || [])].sort((a, b) => a.dias - b.dias).map((item) => ({
                colaborador: item.colaborador,
                codigo: item.codigo || "-",
                funcao: item.funcao || "-",
                situacaoObra: item.situacaoObra || "-",
                treinamento: item.treinamento,
                realizacao: item.realizacao ? formatDate(item.realizacao) : "Não informada",
                vencimento: formatDate(item.vencimento),
                dias: item.dias,
                arquivo: item.arquivo || "Não informado",
            }));

            const { data, error } = await supabase.functions.invoke(FUNCAO_EMAIL_ALERTA_TST, {
                body: {
                    para: destinatario,
                    assunto,
                    empresa: grupo.empresa,
                    tstResponsavel: grupo.tstResponsavel,
                    tstEmail: destinatario,
                    itens,
                },
            });

            if (error || data?.ok === false) {
                await onRegistrarEmailEnviado?.({
                    empresaId: grupo.empresaId || null,
                    colaboradorId: null,
                    documentoId: null,
                    destinatario,
                    assunto,
                    tipoAlerta: "Alerta TST por empresa",
                    documento: itens.map((item) => item.treinamento).filter(Boolean).join(" | ").slice(0, 500),
                    statusEnvio: "Erro",
                    erro: error?.message || data?.erro || `Falha na função ${FUNCAO_EMAIL_ALERTA_TST}.`,
                });
                alert(`Erro ao enviar e-mail pela aba Treinamentos: ${error?.message || data?.erro || `Falha na função ${FUNCAO_EMAIL_ALERTA_TST}.`}\n\nConfirme se a Edge Function está publicada e se as secrets GMAIL_USER e GMAIL_APP_PASSWORD estão configuradas.`);
                return;
            }

            await onRegistrarEmailEnviado?.({
                empresaId: grupo.empresaId || null,
                colaboradorId: null,
                documentoId: null,
                destinatario,
                assunto,
                tipoAlerta: "Alerta TST por empresa",
                documento: itens.map((item) => item.treinamento).filter(Boolean).join(" | ").slice(0, 500),
                statusEnvio: "Sucesso",
                erro: "",
            });

            alert(`Aviso enviado com sucesso para ${destinatario}.`);
        } catch (error) {
            await onRegistrarEmailEnviado?.({
                empresaId: grupo.empresaId || null,
                colaboradorId: null,
                documentoId: null,
                destinatario,
                assunto,
                tipoAlerta: "Alerta TST por empresa",
                documento: (grupo.itens || []).map((item) => item.treinamento).filter(Boolean).join(" | ").slice(0, 500),
                statusEnvio: "Erro",
                erro: error?.message || String(error),
            });
            alert(`Falha inesperada ao enviar e-mail: ${error?.message || String(error)}`);
        } finally {
            setEnviandoAlertaTst(false);
        }
    };

    const valoresRevisao = (doc) => ({
        realizado: datasRevisao[doc.id]?.realizado ?? doc.realizado ?? "",
        vencimento: datasRevisao[doc.id]?.vencimento ?? doc.vencimento ?? "",
    });

    const alterarDataRevisao = (doc, campo, valor) => {
        const docId = doc.id;

        setDatasRevisao((atual) => {
            const dadosAtuais = {
                realizado: atual[docId]?.realizado ?? doc.realizado ?? "",
                vencimento: atual[docId]?.vencimento ?? doc.vencimento ?? "",
                ...atual[docId],
            };

            const proximosDados = {
                ...dadosAtuais,
                [campo]: valor,
            };

            if (campo === "realizado") {
                const vencimentoAutomatico = calcularVencimentoTreinamento(doc.treinamentoId, valor);
                proximosDados.vencimento = vencimentoAutomatico || "";
            }

            return {
                ...atual,
                [docId]: proximosDados,
            };
        });
    };

    const salvarDatasCertificado = async (doc) => {
        if (!onAtualizarDatasCertificado) return;

        const valores = valoresRevisao(doc);

        const exigeVencimento = !treinamentoSemValidade(doc.treinamentoId);

        if (!valores.realizado || (exigeVencimento && !valores.vencimento)) {
            alert(exigeVencimento ? "Informe a data de realização e o vencimento." : "Informe a data de realização/emissão.");
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

            <Card className="mb-5">
                <div className="grid gap-3 xl:grid-cols-[1fr_220px]">
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            value={buscaCertificados}
                            onChange={(e) => setBuscaCertificados(e.target.value)}
                            placeholder="Pesquisar certificados por colaborador, empresa, código, treinamento ou arquivo"
                            className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                        />
                    </div>

                    <select
                        value={filtroStatusCertificados}
                        onChange={(e) => setFiltroStatusCertificados(e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                    >
                        <option value="Todos">Todos os status</option>
                        <option value="Pendentes">Pendentes ({totalPorStatusCertificados.pendentes})</option>
                        <option value="Em dia">Em dia ({totalPorStatusCertificados.emDia})</option>
                        <option value="A vencer">A vencer ({totalPorStatusCertificados.aVencer})</option>
                        <option value="Vencido">Vencidos ({totalPorStatusCertificados.vencidos})</option>
                    </select>
                </div>
            </Card>

            <div className="grid items-start gap-6 xl:grid-cols-[0.75fr_1.25fr]">
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
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                                            Documentos exigidos para a função: {avaliacaoSelecionado.matriz.rotulo}
                                        </p>
                                        <p className="mt-1 text-[11px] text-slate-400">
                                            {avaliacaoSelecionado.emDia.length} em dia · {avaliacaoSelecionado.pendentes.length} pendente(s) · {avaliacaoSelecionado.vencendo.length} a vencer · {avaliacaoSelecionado.vencidos.length} vencido(s)
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => setExigenciasAbertas((valor) => !valor)}
                                        className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                                    >
                                        {exigenciasAbertas ? (
                                            <>
                                                <ChevronUp className="h-4 w-4" />
                                                Recolher exigências
                                            </>
                                        ) : (
                                            <>
                                                <ChevronDown className="h-4 w-4" />
                                                Ver exigências
                                            </>
                                        )}
                                    </button>
                                </div>

                                {exigenciasAbertas && (
                                    <div className="mt-2 max-h-64 space-y-1.5 overflow-y-auto pr-1 scrollbar-discreta">
                                        {avaliacaoSelecionado.itens.map((item) => (
                                            <div key={item.treinamento.id} className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 text-xs">
                                                <span className="font-medium text-slate-700">{item.treinamento.nome}</span>
                                                <span className={classNames("rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1", item.status.classe)}>
                                                    {item.status.texto}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
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
                                onChange={(e) => selecionarArquivoCertificado(e.target.files?.[0] || null)}
                            />
                        </label>
                        <FileUploadAviso arquivo={arquivoSelecionado} tipo="documentoSimples" />

                        {sugestaoDataArquivo && (
                            <div className={classNames(
                                "rounded-2xl px-3 py-2 text-xs font-medium ring-1",
                                sugestaoDataArquivo.data
                                    ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                                    : "bg-orange-50 text-orange-700 ring-orange-100"
                            )}>
                                {sugestaoDataArquivo.mensagem}
                            </div>
                        )}

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
                                    Selecione vários arquivos. O sistema tenta distribuir pelo nome do arquivo e identificar a data de emissão/realização no nome ou no conteúdo do PDF.
                                    Antes de salvar, confira colaborador, treinamento e data de cada documento.
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
                            <FileUploadAviso arquivos={arquivosLote.map((item) => item.arquivo)} tipo="documentoSimples" />

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
                                        <strong>Regra do lote:</strong> os arquivos serão vinculados ao colaborador selecionado
                                        {" "}<strong>{colabSelecionado?.nome}</strong>. O treinamento é identificado automaticamente pelo nome de cada arquivo.
                                        Confira qualquer item marcado como atenção antes de salvar.
                                    </div>

                                    <div className="max-h-96 space-y-2 overflow-y-auto pr-1 scrollbar-discreta">
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
                                                            item.status === "Treinamento identificado" ||
                                                                item.status === "Treinamento e data identificados" ||
                                                                item.status === "Conferido"
                                                                ? "text-emerald-700"
                                                                : "text-orange-700"
                                                        )}>
                                                            {item.status}
                                                        </p>
                                                        {item.sugestaoData?.mensagem && (
                                                            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                                                                {item.sugestaoData.mensagem}
                                                            </p>
                                                        )}
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() => removerArquivoLote(item.id)}
                                                        className="rounded-xl bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-100"
                                                    >
                                                        Remover
                                                    </button>
                                                </div>

                                                <div className="grid gap-2">
                                                    <div>
                                                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">Colaborador de destino</label>
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

                                                    <div>
                                                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">Treinamento identificado</label>
                                                        <select
                                                            value={item.treinamentoId}
                                                            onChange={(e) => alterarTreinamentoArquivoLote(item.id, e.target.value)}
                                                            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                                                        >
                                                            <option value="">Selecione o treinamento</option>
                                                            {treinamentosBase.map((treinamento) => (
                                                                <option key={treinamento.id} value={treinamento.id}>
                                                                    {treinamento.nome}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    <div className="grid gap-2 sm:grid-cols-2">
                                                        <div>
                                                            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">Realização</label>
                                                            <input
                                                                type="date"
                                                                value={item.dataRealizacao}
                                                                onChange={(e) => alterarDataArquivoLote(item.id, e.target.value)}
                                                                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                                                            />
                                                        </div>

                                                        <div>
                                                            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">Vencimento</label>
                                                            <input
                                                                type="date"
                                                                value={item.dataVencimento}
                                                                readOnly
                                                                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
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
                                        {salvandoLote ? "Salvando lote..." : `Salvar ${arquivosLote.length} certificado(s) distribuído(s)`}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </Card>

                <div className="space-y-6">
                    <Card className="self-start">
                        <div className="mb-4 flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
                            <div>
                                <h2 className="text-lg font-bold text-slate-950">Alertas para TST</h2>
                                <p className="mt-1 text-sm text-slate-500">
                                    Treinamentos, certificados e ASO vencidos ou com vencimento nos próximos 30 dias.
                                </p>
                            </div>

                            <span className="w-fit rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700 ring-1 ring-orange-200">
                                {alertasTstPorEmpresa.reduce((total, grupo) => total + grupo.itens.length, 0)} item(ns) em alerta
                            </span>
                        </div>

                        {alertasTstPorEmpresa.length === 0 ? (
                            <div className="rounded-3xl border border-dashed border-slate-300 p-6 text-center">
                                <CheckCircle2 className="mx-auto h-9 w-9 text-emerald-500" />
                                <h3 className="mt-3 font-bold text-slate-900">Nenhum documento vencido ou a vencer</h3>
                                <p className="mt-1 text-sm text-slate-500">
                                    Quando houver documentos vencidos ou a vencer, o aviso ao TST aparecerá aqui.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {alertasTstPorEmpresa.map((grupo) => (
                                    <div key={grupo.empresa} className="rounded-3xl border border-slate-200 bg-white p-4">
                                        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
                                            <div>
                                                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Empresa</p>
                                                <h3 className="mt-1 text-base font-bold text-slate-950">{grupo.empresa}</h3>
                                                <p className="mt-1 text-sm text-slate-500">
                                                    TST: {grupo.tstResponsavel || "Não informado"} · E-mail: {grupo.tstEmail || "Não cadastrado"}
                                                </p>
                                            </div>

                                            <div className="flex flex-wrap gap-2 lg:justify-end">
                                                <button
                                                    type="button"
                                                    onClick={() => enviarEmailAlertaTstAutomatico(grupo)}
                                                    disabled={enviandoAlertaTst}
                                                    className="inline-flex min-w-[190px] items-center justify-center whitespace-nowrap rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                                                >
                                                    {enviandoAlertaTst ? "Enviando..." : "Enviar aviso por e-mail"}
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => copiarAvisoAlertaTst(grupo)}
                                                    className="inline-flex items-center justify-center whitespace-nowrap rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                                                >
                                                    Copiar aviso
                                                </button>
                                            </div>
                                        </div>

                                        <div className="mt-3 space-y-2">
                                            {grupo.itens
                                                .sort((a, b) => a.dias - b.dias)
                                                .map((item, index) => {
                                                    const vencido = item.dias < 0;
                                                    const textoPrazo = vencido
                                                        ? `vencido há ${Math.abs(item.dias)} dia(s)`
                                                        : `faltam ${item.dias} dia(s)`;

                                                    return (
                                                        <div
                                                            key={`${grupo.empresa}-${item.codigo}-${item.treinamento}-${index}`}
                                                            className={classNames(
                                                                "rounded-2xl px-3 py-2 text-sm ring-1",
                                                                vencido
                                                                    ? "bg-red-50 text-red-900 ring-red-100"
                                                                    : "bg-orange-50 text-orange-950 ring-orange-100"
                                                            )}
                                                        >
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <span
                                                                    className={classNames(
                                                                        "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                                                                        vencido ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"
                                                                    )}
                                                                >
                                                                    {vencido ? "Vencido" : "A vencer"}
                                                                </span>
                                                                <strong>{item.colaborador}</strong>
                                                            </div>
                                                            <p className="mt-1">
                                                                {item.treinamento} · vencimento em {formatDate(item.vencimento)} · {textoPrazo}
                                                            </p>
                                                            <p className="mt-1 text-xs opacity-80">
                                                                Código: {item.codigo || "-"} · Função: {item.funcao || "-"} · Situação: {item.situacaoObra || "-"}
                                                            </p>
                                                        </div>
                                                    );
                                                })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <p className="mt-3 rounded-2xl bg-slate-50 p-3 text-xs text-slate-500">
                            O botão de e-mail envia automaticamente pela função Supabase enviar-alerta-tst. Use Copiar aviso como alternativa manual quando precisar enviar pelo Outlook, Gmail ou WhatsApp.
                        </p>
                    </Card>

                    <Card className="self-start">
                        <div className="mb-4 flex items-center justify-between gap-3">
                            <h2 className="text-lg font-bold text-slate-950">Base de certificados</h2>
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                                {documentosFiltrados.length} certificado(s) · {totalPorStatusCertificados.pendentes} pendente(s)
                            </span>
                        </div>

                        <div className="space-y-3">
                            {documentos.length === 0 && totalPorStatusCertificados.pendentes === 0 && (
                                <div className="rounded-3xl border border-dashed border-slate-300 p-8 text-center">
                                    <FileText className="mx-auto h-10 w-10 text-slate-300" />
                                    <h3 className="mt-3 font-bold text-slate-900">Nenhum certificado lançado ainda</h3>
                                    <p className="mt-1 text-sm text-slate-500">
                                        Os certificados enviados aparecerão nesta base para revisão de validade e consulta.
                                    </p>
                                </div>
                            )}

                            {documentos.length > 0 && documentosPorColaborador.length === 0 && (
                                <div className="rounded-3xl border border-dashed border-slate-300 p-8 text-center">
                                    <Filter className="mx-auto h-10 w-10 text-slate-300" />
                                    <h3 className="mt-3 font-bold text-slate-900">Nenhum certificado encontrado</h3>
                                    <p className="mt-1 text-sm text-slate-500">
                                        Ajuste a busca ou o filtro de status para localizar os certificados.
                                    </p>
                                </div>
                            )}

                            {documentosPorColaborador.map((grupo) => {
                                const colaborador = grupo.colaborador;
                                const certificados = grupo.certificados || [];
                                const pendentes = grupo.pendentes || [];
                                const grupoKey = String(colaborador?.id || colaborador?.codigoFuncionario || "sem-colaborador");
                                const grupoAberto = Boolean(gruposCertificadosAbertos[grupoKey]);

                                const resumoStatus = certificados.reduce(
                                    (acc, certificado) => {
                                        const valores = valoresRevisao(certificado);
                                        const status = statusDocumento(
                                            valores.vencimento || certificado.vencimento,
                                            treinamentoSemValidade(certificado.treinamentoId)
                                        );

                                        if (status.chave === "vencido") acc.vencidos += 1;
                                        else if (status.chave === "vencendo") acc.aVencer += 1;
                                        else acc.emDia += 1;

                                        return acc;
                                    },
                                    { emDia: 0, aVencer: 0, vencidos: 0 }
                                );

                                return (
                                    <div
                                        key={grupoKey}
                                        className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md"
                                    >
                                        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                                            <div className="min-w-0">
                                                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Colaborador</p>
                                                <p className="mt-1 break-words text-lg font-bold leading-snug text-slate-950">
                                                    {colaborador.nome}
                                                </p>
                                                <p className="mt-1 break-words text-sm text-slate-500">
                                                    {colaborador.empresaExibicao || colaborador.empresa}
                                                </p>
                                                <p className="mt-1 text-xs font-semibold text-slate-500">
                                                    Código: {colaborador.codigoFuncionario}
                                                </p>
                                            </div>

                                            <div className="flex flex-col gap-2 lg:items-end">
                                                <div className="flex flex-wrap gap-2 lg:justify-end">
                                                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                                                        {certificados.length} certificado(s)
                                                    </span>

                                                    {pendentes.length > 0 && (
                                                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-200">
                                                            {pendentes.length} faltando
                                                        </span>
                                                    )}

                                                    {resumoStatus.emDia > 0 && (
                                                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                                                            {resumoStatus.emDia} em dia
                                                        </span>
                                                    )}

                                                    {resumoStatus.aVencer > 0 && (
                                                        <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700 ring-1 ring-orange-200">
                                                            {resumoStatus.aVencer} a vencer
                                                        </span>
                                                    )}

                                                    {resumoStatus.vencidos > 0 && (
                                                        <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-200">
                                                            {resumoStatus.vencidos} vencido(s)
                                                        </span>
                                                    )}
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setGruposCertificadosAbertos((atual) => ({
                                                            ...atual,
                                                            [grupoKey]: !atual[grupoKey],
                                                        }))
                                                    }
                                                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                                                >
                                                    {grupoAberto ? (
                                                        <>
                                                            <ChevronUp className="h-4 w-4" />
                                                            Recolher treinamentos
                                                        </>
                                                    ) : (
                                                        <>
                                                            <ChevronDown className="h-4 w-4" />
                                                            Ver treinamentos
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>

                                        {grupoAberto && (
                                            <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                                                {pendentes.length > 0 && (
                                                    <div className="rounded-2xl border border-dashed border-blue-200 bg-blue-50 p-3">
                                                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                                            <div>
                                                                <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
                                                                    Documentos faltantes para envio
                                                                </p>
                                                                <p className="mt-1 text-[11px] text-blue-700">
                                                                    Clique em enviar para preencher automaticamente o colaborador e o treinamento no lançamento.
                                                                </p>
                                                            </div>

                                                            <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-blue-700 ring-1 ring-blue-200">
                                                                {pendentes.length} pendente(s)
                                                            </span>
                                                        </div>

                                                        <div className="space-y-2">
                                                            {pendentes.map((item) => (
                                                                <div
                                                                    key={`pendente-${grupoKey}-${item.treinamento.id}`}
                                                                    className="flex flex-col justify-between gap-2 rounded-xl bg-white px-3 py-2 ring-1 ring-blue-100 lg:flex-row lg:items-center"
                                                                >
                                                                    <div className="min-w-0">
                                                                        <div className="flex flex-wrap items-center gap-2">
                                                                            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 ring-1 ring-blue-200">
                                                                                Pendente
                                                                            </span>
                                                                            <p className="break-words text-sm font-semibold text-slate-800">
                                                                                {item.treinamento.nome}
                                                                            </p>
                                                                        </div>
                                                                        <p className="mt-1 text-[11px] text-slate-500">
                                                                            Documento ainda não enviado para este colaborador.
                                                                        </p>
                                                                    </div>

                                                                    <button
                                                                        type="button"
                                                                        onClick={() => enviarDocumentoPendente(colaborador, item.treinamento)}
                                                                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                                                                    >
                                                                        <Upload className="h-4 w-4" />
                                                                        Enviar documento
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {certificados.length === 0 && pendentes.length === 0 && (
                                                    <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                                                        Nenhum item encontrado para este colaborador com o filtro atual.
                                                    </div>
                                                )}

                                                {certificados.map((d, idx) => {
                                                    const valores = valoresRevisao(d);
                                                    const semValidade = treinamentoSemValidade(d.treinamentoId);
                                                    const statusAtual = statusDocumento(valores.vencimento || d.vencimento, semValidade);
                                                    const itemKey = String(d.id || `${d.colaborador.id}-${d.treinamentoId}-${idx}`);
                                                    const aberto = Boolean(certificadosAbertos[itemKey]);

                                                    return (
                                                        <div
                                                            key={itemKey}
                                                            className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100"
                                                        >
                                                            <div className="grid gap-3 lg:grid-cols-[1fr_150px] lg:items-start">
                                                                <div className="min-w-0">
                                                                    <div className="flex flex-wrap items-center gap-2">
                                                                        <StatusPill status={statusAtual} small />
                                                                        <h3 className="break-words text-base font-bold leading-snug text-slate-900">
                                                                            {d.treinamento.nome}
                                                                        </h3>
                                                                    </div>

                                                                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                                                        <FileText className="h-4 w-4 text-slate-400" />
                                                                        <span className="break-words">{d.arquivo || "Arquivo não informado"}</span>
                                                                    </div>

                                                                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                                                        <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-slate-100">
                                                                            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Realização</p>
                                                                            <p className="text-xs font-semibold text-slate-700">{formatDate(valores.realizado)}</p>
                                                                        </div>

                                                                        <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-slate-100">
                                                                            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Vencimento</p>
                                                                            <p className="text-xs font-semibold text-slate-700">
                                                                                {semValidade ? "Sem validade" : formatDate(valores.vencimento)}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="flex flex-col gap-2 lg:items-stretch">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            setCertificadosAbertos((atual) => ({
                                                                                ...atual,
                                                                                [itemKey]: !atual[itemKey],
                                                                            }))
                                                                        }
                                                                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                                                                    >
                                                                        {aberto ? (
                                                                            <>
                                                                                <ChevronUp className="h-4 w-4" />
                                                                                Ocultar datas
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <ChevronDown className="h-4 w-4" />
                                                                                Revisar datas
                                                                            </>
                                                                        )}
                                                                    </button>

                                                                    <button
                                                                        onClick={() => onVisualizarCertificado(d)}
                                                                        className="rounded-xl bg-slate-950 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                                                                    >
                                                                        Abrir
                                                                    </button>

                                                                    <button
                                                                        onClick={() => onExcluirCertificado(d)}
                                                                        className="rounded-xl bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-100"
                                                                    >
                                                                        Excluir
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            {aberto && (
                                                                <div className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-slate-100">
                                                                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_auto] xl:items-end">
                                                                        <div>
                                                                            <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Realização</p>
                                                                            <input
                                                                                type="date"
                                                                                value={valores.realizado}
                                                                                onChange={(e) => alterarDataRevisao(d, "realizado", e.target.value)}
                                                                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
                                                                            />
                                                                        </div>

                                                                        <div>
                                                                            <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Vencimento</p>
                                                                            {semValidade ? (
                                                                                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600">
                                                                                    Sem validade
                                                                                </div>
                                                                            ) : (
                                                                                <input
                                                                                    type="date"
                                                                                    value={valores.vencimento}
                                                                                    onChange={(e) => alterarDataRevisao(d, "vencimento", e.target.value)}
                                                                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
                                                                                />
                                                                            )}
                                                                        </div>

                                                                        <button
                                                                            type="button"
                                                                            onClick={() => salvarDatasCertificado(d)}
                                                                            disabled={salvandoDatasId === d.id}
                                                                            className="rounded-xl bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 ring-1 ring-blue-200 hover:bg-blue-100 disabled:opacity-60"
                                                                        >
                                                                            {salvandoDatasId === d.id ? "Salvando..." : "Salvar datas"}
                                                                        </button>
                                                                    </div>

                                                                    <p className="mt-3 text-xs leading-relaxed text-slate-400">
                                                                        {semValidade
                                                                            ? "Este documento não possui validade. Ao revisar, somente a data de realização/emissão será atualizada."
                                                                            : "Ao alterar a realização, o vencimento é recalculado automaticamente pela validade do treinamento."}
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </Card>
                </div>
            </div>
        </motion.div>
    );
}

function ConsultaQR({ colaborador, colaboradores = [], onSelecionarColaborador }) {
    const [busca, setBusca] = useState("");
    const [filtroEmpresaQR, setFiltroEmpresaQR] = useState("Todas");

    const colaboradorAtual =
        colaboradores.find((item) => String(item.id) === String(colaborador?.id)) ||
        colaborador ||
        colaboradores[0] ||
        null;

    const empresasConsultaQR = useMemo(() => {
        const nomes = colaboradores
            .map((item) => item.empresaExibicao || item.empresa || "Empresa não informada")
            .filter(Boolean);

        return Array.from(new Set(nomes)).sort((a, b) => a.localeCompare(b));
    }, [colaboradores]);

    const colaboradoresPorEmpresa = useMemo(() => {
        if (filtroEmpresaQR === "Todas") return colaboradores;

        return colaboradores.filter(
            (item) => String(item.empresaExibicao || item.empresa || "Empresa não informada") === String(filtroEmpresaQR)
        );
    }, [colaboradores, filtroEmpresaQR]);

    const colaboradoresFiltrados = useMemo(() => {
        const termo = normalizarTextoBusca(busca);

        return colaboradoresPorEmpresa
            .filter((item) => {
                if (!termo) return true;

                const texto = normalizarTextoBusca(
                    `${item.nome} ${item.codigoFuncionario} ${item.funcao} ${item.empresaExibicao || item.empresa} ${statusGeral(item).texto}`
                );

                return texto.includes(termo);
            })
            .slice(0, 12);
    }, [busca, colaboradoresPorEmpresa]);

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
                <div className="grid gap-3 xl:grid-cols-[1fr_280px] xl:items-end">
                    <div>
                        <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                            Pesquisar funcionário
                        </label>
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                value={busca}
                                onChange={(e) => setBusca(e.target.value)}
                                placeholder="Pesquisar por nome, código ou função"
                                className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                            />
                        </div>

                        <p className="mt-1 text-xs text-slate-400">
                            {colaboradoresFiltrados.length} colaborador(es) encontrado(s)
                        </p>

                        {(busca || filtroEmpresaQR !== "Todas") && (
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
                                            <p className="truncate text-[11px] text-slate-400">
                                                {item.empresaExibicao || item.empresa} · {statusGeral(item).texto}
                                            </p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                            Filtrar por empresa
                        </label>
                        <select
                            value={filtroEmpresaQR}
                            onChange={(e) => setFiltroEmpresaQR(e.target.value)}
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                        >
                            <option value="Todas">Todas as empresas</option>
                            {empresasConsultaQR.map((empresa) => (
                                <option key={empresa} value={empresa}>
                                    {empresa}
                                </option>
                            ))}
                        </select>
                    </div>

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
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="break-words text-2xl font-bold leading-tight text-slate-950">{colaboradorAtual.nome}</h2>
                                <MobilizacaoBadge status={colaboradorAtual.statusMobilizacao} />
                            </div>
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
                            const semValidade = treinamentoSemValidade(t.treinamentoId);
                            const st = statusDocumento(t.vencimento, semValidade);
                            const dias = semValidade ? null : diasParaVencer(t.vencimento);
                            const dataInicio = new Date(`${t.realizado}T12:00:00`);
                            const dataFim = new Date(`${t.vencimento}T12:00:00`);
                            const totalValidade = dias === null ? 1 : Math.max(1, Math.ceil((dataFim - dataInicio) / DAY));
                            const percentualRestante =
                                dias === null
                                    ? 100
                                    : dias < 0
                                        ? 100
                                        : Math.max(4, Math.min(100, Math.round((dias / totalValidade) * 100)));
                            const alerta30Dias = dias !== null && dias >= 0 && dias <= 30;
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
                                            <p className="font-semibold text-slate-700">{semValidade ? "Sem validade" : formatDate(t.vencimento)}</p>
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
                                        {semValidade
                                            ? "Documento sem validade definida."
                                            : dias < 0
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
        tstResponsavel: "",
        tstEmail: "",
        tipoEmpresa: "Terceirizada",
        empresaPaiId: "",
        logo: null,
        contratoArquivo: null,
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
    const [escoposAbertos, setEscoposAbertos] = useState({});

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
            tstResponsavel: novaEmpresa.tstResponsavel.trim(),
            tstEmail: novaEmpresa.tstEmail.trim(),
            tipoEmpresa: novaEmpresa.tipoEmpresa,
            empresaPaiId: novaEmpresa.empresaPaiId || null,
            logo: novaEmpresa.logo,
            contratoArquivo: novaEmpresa.contratoArquivo,
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
                tstResponsavel: "",
                tstEmail: "",
                tipoEmpresa: "Terceirizada",
                empresaPaiId: "",
                logo: null,
                contratoArquivo: null,
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
            tstResponsavel: empresa.tst_responsavel || "",
            tstEmail: empresa.tst_email || "",
            status: normalizarStatusEmpresa(empresa.status),
            tipoEmpresa: empresa.tipo_empresa || "Terceirizada",
            empresaPaiId: empresa.empresa_pai_id || "",
            logoAtual: empresa.logo_url || "",
            logoNomeAtual: empresa.logo_nome || "",
            logo: null,
            contratoUrlAtual: empresa.contrato_url || "",
            contratoNomeAtual: empresa.contrato_nome || "",
            contratoArquivo: null,
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
            tstResponsavel: empresaEdicao.tstResponsavel.trim(),
            tstEmail: empresaEdicao.tstEmail.trim(),
            status: empresaEdicao.status || "Ativa",
            tipoEmpresa: empresaEdicao.tipoEmpresa,
            empresaPaiId: empresaEdicao.empresaPaiId || null,
            logo: empresaEdicao.logo,
            logoAtual: empresaEdicao.logoAtual,
            logoNomeAtual: empresaEdicao.logoNomeAtual,
            contratoUrlAtual: empresaEdicao.contratoUrlAtual,
            contratoNomeAtual: empresaEdicao.contratoNomeAtual,
            contratoArquivo: empresaEdicao.contratoArquivo,
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

        if (!validarArquivoAntesUpload(arquivo, "documentoExtenso")) return;

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
        const contratoUrl = obterUrlContratoEmpresa(empresa.contrato_url);
        const funcionarios = colaboradoresPorEmpresa[empresa.id] || [];
        const situacaoDocumental = calcularSituacaoDocumentalEmpresa(docs);
        const escopoAberto = Boolean(escoposAbertos[empresa.id]);

        return (
            <div key={empresa.id} className={classNames("rounded-3xl border p-4", destaqueContratante ? "border-slate-300 bg-slate-50" : "border-slate-200 bg-white")}>
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                    <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
                            {logoUrl ? (
                                <img src={logoUrl} alt={`Logo ${empresa.nome}`} className="h-full w-full object-contain p-1" />
                            ) : (
                                <Building2 className="h-6 w-6 text-slate-400" />
                            )}
                        </div>
                        <div className="min-w-0">
                            <h3 className="break-words font-bold text-slate-950">{empresa.nome}</h3>
                            <p className="text-sm text-slate-500">{formatarCnpj(empresa.cnpj) || "CNPJ não informado"}</p>
                            <p className="text-xs text-slate-400">
                                Responsável: {empresa.responsavel || "-"} · {empresa.email || "-"}
                            </p>
                            <p className="text-xs text-slate-400">
                                Telefone: {formatarTelefone(empresa.telefone) || "(00) 00000-0000"}
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
                                <div className="mt-1 rounded-2xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                        <p className={classNames("min-w-0 flex-1 text-justify leading-relaxed", escopoAberto ? "" : "line-clamp-2")}>
                                            <strong>Escopo:</strong> {empresa.escopo_servico}
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setEscoposAbertos((atual) => ({
                                                    ...atual,
                                                    [empresa.id]: !atual[empresa.id],
                                                }))
                                            }
                                            className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"
                                        >
                                            {escopoAberto ? (
                                                <>
                                                    <ChevronUp className="h-3.5 w-3.5" />
                                                    Recolher
                                                </>
                                            ) : (
                                                <>
                                                    <ChevronDown className="h-3.5 w-3.5" />
                                                    Abrir escopo
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex shrink-0 flex-col items-stretch gap-2 sm:min-w-[155px]">
                        <span className={classNames("whitespace-nowrap rounded-full px-3 py-1 text-center text-xs font-semibold ring-1", classeStatusEmpresa(empresa.status))}>
                            {normalizarStatusEmpresa(empresa.status)}
                        </span>
                        <span
                            title={situacaoDocumental.detalhe}
                            className={classNames("whitespace-nowrap rounded-full px-3 py-1 text-center text-xs font-semibold ring-1", situacaoDocumental.classe)}
                        >
                            {situacaoDocumental.texto}
                        </span>

                        {contratoUrl && (
                            <button
                                type="button"
                                onClick={() => abrirArquivoUrl(contratoUrl)}
                                className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 ring-1 ring-blue-200 hover:bg-blue-100"
                            >
                                <FileText className="h-3.5 w-3.5" />
                                Ver contrato
                            </button>
                        )}

                        <button
                            onClick={() => abrirEdicaoEmpresa(empresa)}
                            className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                        >
                            <FileText className="h-3.5 w-3.5" />
                            Editar dados
                        </button>
                        <button
                            onClick={() => setEmpresaRevisao({ empresa, docs })}
                            className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-full bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
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
                                                className="inline-flex items-center gap-1 whitespace-nowrap rounded-xl bg-slate-950 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                <Eye className="h-3.5 w-3.5" />
                                                Visualizar documento
                                            </button>

                                            <button
                                                onClick={() => onExcluirDocumentoEmpresa(doc)}
                                                title="Excluir este documento do cadastro da empresa"
                                                className="inline-flex items-center gap-1 whitespace-nowrap rounded-xl bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-100"
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
                        className="inline-flex items-center gap-2 whitespace-nowrap rounded-2xl bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
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
                                onChange={(e) => setNovaEmpresa({ ...novaEmpresa, cnpj: formatarCnpj(e.target.value) })}
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
                                onChange={(e) => setNovaEmpresa({ ...novaEmpresa, telefone: formatarTelefone(e.target.value) })}
                                placeholder="Telefone"
                                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                            />

                            <div className="grid gap-3 md:grid-cols-2">
                                <input
                                    value={novaEmpresa.tstResponsavel}
                                    onChange={(e) => setNovaEmpresa({ ...novaEmpresa, tstResponsavel: e.target.value })}
                                    placeholder="Técnico de Segurança responsável"
                                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                />

                                <input
                                    type="email"
                                    value={novaEmpresa.tstEmail}
                                    onChange={(e) => setNovaEmpresa({ ...novaEmpresa, tstEmail: e.target.value })}
                                    placeholder="E-mail do TST para alertas"
                                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                />
                            </div>

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
                                    onChange={(e) => {
                                        const arquivo = e.target.files?.[0] || null;
                                        if (arquivo && !validarArquivoAntesUpload(arquivo, "fotoAuditoria")) {
                                            e.target.value = "";
                                            return;
                                        }
                                        setNovaEmpresa({ ...novaEmpresa, logo: arquivo });
                                    }}
                                />
                            </label>
                            <FileUploadAviso arquivo={novaEmpresa.logo} tipo="fotoAuditoria" />

                            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-blue-200 bg-blue-50 px-4 py-4 text-sm font-semibold text-blue-700 hover:bg-blue-100">
                                <Upload className="h-4 w-4" />
                                {novaEmpresa.contratoArquivo ? novaEmpresa.contratoArquivo.name : "Anexar contrato da empresa"}
                                <input
                                    type="file"
                                    accept="application/pdf,image/png,image/jpeg,image/webp"
                                    className="hidden"
                                    onChange={(e) => {
                                        const arquivo = e.target.files?.[0] || null;
                                        if (arquivo && !validarArquivoAntesUpload(arquivo, "documentoExtenso")) {
                                            e.target.value = "";
                                            return;
                                        }
                                        setNovaEmpresa({ ...novaEmpresa, contratoArquivo: arquivo });
                                    }}
                                />
                            </label>
                            <FileUploadAviso arquivo={novaEmpresa.contratoArquivo} tipo="documentoExtenso" />

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
                                    onChange={(e) => {
                                        const arquivo = e.target.files?.[0] || null;
                                        if (arquivo && !validarArquivoAntesUpload(arquivo, "documentoExtenso")) {
                                            e.target.value = "";
                                            return;
                                        }
                                        setNovoDoc({ ...novoDoc, arquivo });
                                    }}
                                />
                            </label>
                            <FileUploadAviso arquivo={novoDoc.arquivo} tipo="documentoExtenso" />

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
                                        onChange={(e) => setEmpresaEdicao({ ...empresaEdicao, cnpj: formatarCnpj(e.target.value) })}
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

                                <div>
                                    <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Telefone</label>
                                    <input
                                        value={empresaEdicao.telefone}
                                        onChange={(e) => setEmpresaEdicao({ ...empresaEdicao, telefone: formatarTelefone(e.target.value) })}
                                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Técnico de Segurança responsável</label>
                                    <input
                                        value={empresaEdicao.tstResponsavel}
                                        onChange={(e) => setEmpresaEdicao({ ...empresaEdicao, tstResponsavel: e.target.value })}
                                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">E-mail do TST para alertas</label>
                                    <input
                                        type="email"
                                        value={empresaEdicao.tstEmail}
                                        onChange={(e) => setEmpresaEdicao({ ...empresaEdicao, tstEmail: e.target.value })}
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
                                            onChange={(e) => {
                                                const arquivo = e.target.files?.[0] || null;
                                                if (arquivo && !validarArquivoAntesUpload(arquivo, "fotoAuditoria")) {
                                                    e.target.value = "";
                                                    return;
                                                }
                                                setEmpresaEdicao({ ...empresaEdicao, logo: arquivo });
                                            }}
                                        />
                                    </label>
                                    <FileUploadAviso arquivo={empresaEdicao.logo} tipo="fotoAuditoria" />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Contrato da empresa</label>
                                    <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-blue-200 bg-blue-50 px-4 py-4 text-sm font-semibold text-blue-700 hover:bg-blue-100">
                                        <Upload className="h-4 w-4" />
                                        {empresaEdicao.contratoArquivo ? empresaEdicao.contratoArquivo.name : empresaEdicao.contratoNomeAtual || "Anexar contrato da empresa"}
                                        <input
                                            type="file"
                                            accept="application/pdf,image/png,image/jpeg,image/webp"
                                            className="hidden"
                                            onChange={(e) => {
                                                const arquivo = e.target.files?.[0] || null;
                                                if (arquivo && !validarArquivoAntesUpload(arquivo, "documentoExtenso")) {
                                                    e.target.value = "";
                                                    return;
                                                }
                                                setEmpresaEdicao({ ...empresaEdicao, contratoArquivo: arquivo });
                                            }}
                                        />
                                    </label>
                                    <FileUploadAviso arquivo={empresaEdicao.contratoArquivo} tipo="documentoExtenso" />
                                    {empresaEdicao.contratoUrlAtual && (
                                        <button
                                            type="button"
                                            onClick={() => abrirArquivoUrl(obterUrlContratoEmpresa(empresaEdicao.contratoUrlAtual))}
                                            className="mt-2 inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                                        >
                                            <Eye className="h-4 w-4" />
                                            Visualizar contrato atual
                                        </button>
                                    )}
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


function Aniversariantes({ colaboradores = [], empresasBanco = [] }) {
    const [mes, setMes] = useState("Todos");
    const [empresa, setEmpresa] = useState("Todas");
    const [funcao, setFuncao] = useState("Todas");
    const [status, setStatus] = useState("Todos");

    const colaboradoresElegiveis = colaboradores.filter((colaborador) =>
        deveMostrarAniversarioColaborador(colaborador)
    );

    const colaboradoresComAniversario = colaboradoresElegiveis.filter((colaborador) =>
        Boolean(obterDataAniversarioColaborador(colaborador))
    );

    const opcoesEmpresa = ["Todas", ...Array.from(new Set(colaboradoresElegiveis.map((c) => c.empresaExibicao || c.empresa).filter(Boolean))).sort()];
    const opcoesFuncao = ["Todas", ...Array.from(new Set(colaboradoresElegiveis.map((c) => c.funcao).filter(Boolean))).sort()];
    const opcoesStatus = ["Todos", ...STATUS_CLASSIFICACAO_COLABORADOR];

    const filtrados = colaboradoresElegiveis
        .filter((colaborador) => {
            const dataAniversario = obterDataAniversarioColaborador(colaborador);
            const mesColaborador = mesAniversarioColaborador(colaborador);
            const statusColaborador = statusGeral(colaborador).texto;
            const empresaColaborador = colaborador.empresaExibicao || colaborador.empresa;

            return (
                (mes === "Todos" || (dataAniversario && String(mesColaborador).padStart(2, "0") === mes)) &&
                (empresa === "Todas" || empresaColaborador === empresa) &&
                (funcao === "Todas" || colaborador.funcao === funcao) &&
                (status === "Todos" || statusColaborador === status)
            );
        })
        .sort((a, b) => {
            const dataA = obterDataAniversarioColaborador(a);
            const dataB = obterDataAniversarioColaborador(b);
            const mesA = mesAniversarioColaborador(a) || 99;
            const mesB = mesAniversarioColaborador(b) || 99;
            const diaA = diaAniversarioColaborador(a) || 99;
            const diaB = diaAniversarioColaborador(b) || 99;

            if (mes === "Todos" && Boolean(dataA) !== Boolean(dataB)) return dataA ? -1 : 1;
            if (mes === "Todos" && mesA !== mesB) return mesA - mesB;
            if (diaA !== diaB) return diaA - diaB;
            return a.nome.localeCompare(b.nome);
        });

    const proximo = proximoAniversariante(colaboradoresComAniversario);

    const exportarCSVAniversariantes = () => {
        const linhas = [
            ["Nome", "Empresa", "Função", "Data de aniversário", "Dia", "Status"],
            ...filtrados.map((colaborador) => [
                colaborador.nome,
                colaborador.empresaExibicao || colaborador.empresa,
                colaborador.funcao,
                formatarAniversario(obterDataAniversarioColaborador(colaborador)),
                diaAniversarioColaborador(colaborador) || "",
                statusGeral(colaborador).texto,
            ]),
        ];

        baixarCSV("aniversariantes.csv", linhas);
    };

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Header
                titulo="Aniversariantes"
                subtitulo="Consulta de aniversariantes de todos os meses, com todos os colaboradores autorizados para aparecer no painel. Use os filtros para separar por mês, empresa, função e status."
                acao={(
                    <button
                        type="button"
                        onClick={exportarCSVAniversariantes}
                        className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
                    >
                        <Download className="h-4 w-4" />
                        Exportar CSV
                    </button>
                )}
            />

            <div className="mb-5 grid gap-4 md:grid-cols-3">
                <Card>
                    <p className="text-sm font-semibold text-slate-500">Registros filtrados</p>
                    <p className="mt-2 text-3xl font-bold text-slate-950">{filtrados.length}</p>
                </Card>
                <Card>
                    <p className="text-sm font-semibold text-slate-500">Próximo aniversário</p>
                    <p className="mt-2 text-lg font-bold text-slate-950">{proximo?.colaborador?.nome || "-"}</p>
                    <p className="mt-1 text-sm text-slate-500">{proximo ? formatarAniversario(obterDataAniversarioColaborador(proximo.colaborador)) : "Sem data cadastrada"}</p>
                </Card>
                <Card>
                    <p className="text-sm font-semibold text-slate-500">Exportação</p>
                    <p className="mt-2 text-sm text-slate-600">PDF e Excel nativo ficam como evolução futura. Nesta etapa, o CSV já pode ser aberto no Excel.</p>
                </Card>
            </div>

            <Card className="mb-5">
                <div className="grid gap-3 md:grid-cols-4">
                    <select value={mes} onChange={(e) => setMes(e.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100">
                        <option value="Todos">Todos os meses</option>
                        {Array.from({ length: 12 }).map((_, index) => {
                            const valor = String(index + 1).padStart(2, "0");
                            const nomeMes = new Date(2026, index, 1).toLocaleDateString("pt-BR", { month: "long" });
                            return <option key={valor} value={valor}>{nomeMes}</option>;
                        })}
                    </select>

                    <select value={empresa} onChange={(e) => setEmpresa(e.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100">
                        {opcoesEmpresa.map((item) => <option key={item}>{item}</option>)}
                    </select>

                    <select value={funcao} onChange={(e) => setFuncao(e.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100">
                        {opcoesFuncao.map((item) => <option key={item}>{item}</option>)}
                    </select>

                    <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100">
                        {opcoesStatus.map((item) => <option key={item}>{item}</option>)}
                    </select>
                </div>
            </Card>

            <Card>
                <div className="overflow-x-auto scrollbar-discreta">
                    <table className="min-w-[860px] w-full text-left text-sm">
                        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                            <tr>
                                <th className="px-4 py-3">Nome</th>
                                <th className="px-4 py-3">Empresa</th>
                                <th className="px-4 py-3">Função</th>
                                <th className="px-4 py-3">Data de aniversário</th>
                                <th className="px-4 py-3">Dia</th>
                                <th className="px-4 py-3">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {filtrados.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">Nenhum colaborador encontrado para os filtros selecionados.</td>
                                </tr>
                            )}
                            {filtrados.map((colaborador) => {
                                const statusColaborador = statusGeral(colaborador);
                                return (
                                    <tr key={colaborador.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3 font-semibold text-slate-950">{colaborador.nome}</td>
                                        <td className="px-4 py-3 text-slate-600">{colaborador.empresaExibicao || colaborador.empresa}</td>
                                        <td className="px-4 py-3 text-slate-600">{colaborador.funcao}</td>
                                        <td className="px-4 py-3 text-slate-600">{formatarAniversario(obterDataAniversarioColaborador(colaborador))}</td>
                                        <td className="px-4 py-3 text-slate-600">{diaAniversarioColaborador(colaborador)}</td>
                                        <td className="px-4 py-3">
                                            <span className={classNames("rounded-full px-3 py-1 text-xs font-bold ring-1", statusColaborador.classe)}>{statusColaborador.texto}</span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </Card>
        </motion.div>
    );
}

function AuditoriaAcessoNegado() {
    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Header
                titulo="Acesso não autorizado"
                subtitulo="Seu usuário não possui permissão cadastrada no Supabase para acessar a Auditoria."
            />

            <div className="mx-auto max-w-xl">
                <Card>
                    <div className="flex items-start gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-700 ring-1 ring-red-100">
                            <Lock className="h-6 w-6" />
                        </div>

                        <div>
                            <h2 className="text-lg font-bold text-slate-950">Auditoria restrita</h2>
                            <p className="mt-1 text-sm leading-relaxed text-slate-500">
                                Para liberar o acesso, o administrador deve cadastrar o e-mail deste usuário na tabela
                                <strong> auditoria_usuarios_autorizados</strong> no Supabase.
                            </p>
                        </div>
                    </div>
                </Card>
            </div>
        </motion.div>
    );
}

function AuditoriaBloqueada({ onLiberar }) {
    const [senha, setSenha] = useState("");
    const [erro, setErro] = useState("");

    const validarSenha = (evento) => {
        evento.preventDefault();
        setErro("");

        if (senha.trim() === SENHA_AUDITORIA) {
            onLiberar?.();
            setSenha("");
            return;
        }

        setErro("Senha incorreta. A auditoria é restrita a pessoas autorizadas.");
    };

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Header
                titulo="Auditoria protegida"
                subtitulo="Acesso restrito aos registros de auditoria, arquivos do Storage e histórico de alterações."
            />

            <div className="mx-auto max-w-xl">
                <Card>
                    <div className="mb-5 flex items-start gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
                            <Lock className="h-6 w-6" />
                        </div>

                        <div>
                            <h2 className="text-lg font-bold text-slate-950">Digite a senha de auditoria</h2>
                            <p className="mt-1 text-sm leading-relaxed text-slate-500">
                                Esta área mostra acessos, alterações e arquivos salvos no Storage. O acesso deve ficar restrito aos responsáveis autorizados.
                            </p>
                        </div>
                    </div>

                    <form onSubmit={validarSenha} className="space-y-3">
                        <PasswordInput
                            value={senha}
                            onChange={(e) => setSenha(e.target.value)}
                            placeholder="Senha de acesso"
                            autoFocus
                            autoComplete="current-password"
                        />

                        {erro && (
                            <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 ring-1 ring-red-100">
                                {erro}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
                        >
                            <Lock className="h-4 w-4" />
                            Liberar auditoria
                        </button>
                    </form>

                    <p className="mt-4 rounded-2xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-500">
                        A senha da Auditoria pode ser alterada no arquivo <strong>.env</strong> usando a variável
                        <strong> VITE_SENHA_AUDITORIA</strong>. O acesso também depende da liberação do usuário no Supabase.
                    </p>
                </Card>
            </div>
        </motion.div>
    );
}

function RelatorioAuditoria({
    auditoria = [],
    emailsEnviados = [],
    carregando,
    onAtualizar,
    onListarArquivosStorage,
    onExcluirArquivoStorage,
    onListarUsuariosAuditoria,
    onSalvarUsuarioAuditoria,
    onAlternarUsuarioAuditoria,
    onBloquear,
}) {
    const [busca, setBusca] = useState("");
    const [filtroAcao, setFiltroAcao] = useState("Todas");
    const [filtrosStorage, setFiltrosStorage] = useState({
        empresa: "Todas",
        colaborador: "Todos",
        tipo: "Todos",
        dataInicio: "",
        dataFim: "",
        tamanho: "Todos",
        vinculo: "Todos",
    });
    const [arquivosStorageAuditoria, setArquivosStorageAuditoria] = useState([]);
    const [carregandoStorageAuditoria, setCarregandoStorageAuditoria] = useState(false);
    const [excluindoStorageAuditoria, setExcluindoStorageAuditoria] = useState("");
    const [usuariosAuditoria, setUsuariosAuditoria] = useState([]);
    const [carregandoUsuariosAuditoria, setCarregandoUsuariosAuditoria] = useState(false);
    const [salvandoUsuarioAuditoria, setSalvandoUsuarioAuditoria] = useState(false);
    const [alterandoUsuarioAuditoria, setAlterandoUsuarioAuditoria] = useState("");
    const [novoUsuarioAuditoria, setNovoUsuarioAuditoria] = useState({
        email: "",
        nome: "",
        funcao: "",
    });
    const [detalhesAuditoriaAbertos, setDetalhesAuditoriaAbertos] = useState({});

    const alternarDetalhesAuditoria = (id) => {
        setDetalhesAuditoriaAbertos((atual) => ({
            ...atual,
            [id]: !atual[id],
        }));
    };

    const acoes = useMemo(
        () => Array.from(new Set(auditoria.map((item) => item.acao).filter(Boolean))).sort(),
        [auditoria]
    );

    const registrosFiltrados = useMemo(() => {
        const termo = normalizarTextoBusca(busca);

        return auditoria.filter((item) => {
            const origemAcesso = item.dados?.origemAcesso || {};
            const texto = normalizarTextoBusca(
                `${item.usuario_email || ""} ${item.acao || ""} ${item.tabela || ""} ${item.descricao || ""} ${item.registro_id || ""} ${origemAcesso.url || ""} ${origemAcesso.pagina || ""} ${origemAcesso.navegador || ""} ${origemAcesso.plataforma || ""}`
            );

            const bateBusca = !termo || texto.includes(termo);
            const bateAcao = filtroAcao === "Todas" || item.acao === filtroAcao;

            return bateBusca && bateAcao;
        });
    }, [auditoria, busca, filtroAcao]);

    const ultimosAcessosAuditoria = auditoria
        .filter((item) => normalizarTextoBusca(`${item.acao || ""} ${item.descricao || ""}`).includes("acesso"))
        .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
        .slice(0, 8);

    const mesAtualEmails = hoje.getMonth();
    const anoAtualEmails = hoje.getFullYear();
    const emailsMesAuditoria = emailsEnviados.filter((item) => {
        const data = item.data_envio ? new Date(item.data_envio) : null;
        return data && data.getMonth() === mesAtualEmails && data.getFullYear() === anoAtualEmails;
    });
    const emailsSucessoAuditoria = emailsMesAuditoria.filter((item) => normalizarTextoBusca(item.status_envio).includes("sucesso"));
    const emailsErroAuditoria = emailsMesAuditoria.filter((item) => normalizarTextoBusca(item.status_envio).includes("erro"));
    const ultimosEmailsAuditoria = [...emailsEnviados]
        .sort((a, b) => new Date(b.data_envio || 0) - new Date(a.data_envio || 0))
        .slice(0, 8);

    const obterEmpresaArquivoStorage = (arquivo) =>
        arquivo.empresaNome || arquivo.colaboradorEmpresa || "Sem empresa vinculada";

    const obterColaboradorArquivoStorage = (arquivo) =>
        arquivo.colaboradorNome || "Sem colaborador vinculado";

    const obterTipoArquivoStorage = (arquivo) =>
        arquivo.tipoDocumentoEmpresa || arquivo.treinamentoNome || arquivo.origemTipo || arquivo.bucket || "Tipo não identificado";

    const obterDataArquivoStorage = (arquivo) => {
        if (!arquivo?.atualizadoEm) return "";

        const data = new Date(arquivo.atualizadoEm);
        return Number.isNaN(data.getTime()) ? "" : data.toISOString().slice(0, 10);
    };

    const tamanhoArquivoDentroDoFiltro = (arquivo) => {
        const tamanho = Number(arquivo.tamanho || 0);

        if (filtrosStorage.tamanho === "Todos") return true;
        if (filtrosStorage.tamanho === "ate-1mb") return tamanho <= 1024 ** 2;
        if (filtrosStorage.tamanho === "1mb-10mb") return tamanho > 1024 ** 2 && tamanho <= 10 * 1024 ** 2;
        if (filtrosStorage.tamanho === "10mb-50mb") return tamanho > 10 * 1024 ** 2 && tamanho <= 50 * 1024 ** 2;
        if (filtrosStorage.tamanho === "acima-50mb") return tamanho > 50 * 1024 ** 2;

        return true;
    };

    const arquivosStorageAuditoriaSemRegistro = arquivosStorageAuditoria.filter((arquivo) => !arquivo.emUso);
    const arquivosStorageAuditoriaEmUso = arquivosStorageAuditoria.filter((arquivo) => arquivo.emUso);
    const storageTotalBytes = arquivosStorageAuditoria.reduce((total, arquivo) => total + Number(arquivo.tamanho || 0), 0);
    const storageEmUsoBytes = arquivosStorageAuditoriaEmUso.reduce((total, arquivo) => total + Number(arquivo.tamanho || 0), 0);
    const storageSemRegistroBytes = arquivosStorageAuditoriaSemRegistro.reduce((total, arquivo) => total + Number(arquivo.tamanho || 0), 0);
    const storageLimiteBytes = Math.max(1, LIMITE_STORAGE_MB * 1024 * 1024);
    const storagePercentual = calcularPercentualUsoStorage(storageTotalBytes);
    const storageStatus =
        storagePercentual >= 90
            ? {
                texto: "Crítico",
                detalhe: "Acima de 90% do limite configurado. Avaliar limpeza de arquivos sem vínculo ou aumento de plano.",
                classe: "bg-red-50 text-red-700 ring-red-200",
                barra: "bg-red-500",
            }
            : storagePercentual >= 70
                ? {
                    texto: "Atenção",
                    detalhe: "Entre 70% e 89% do limite configurado. Acompanhar crescimento dos uploads.",
                    classe: "bg-orange-50 text-orange-700 ring-orange-200",
                    barra: "bg-orange-500",
                }
                : {
                    texto: "Normal",
                    detalhe: "Até 70% do limite configurado. Capacidade dentro do controle esperado.",
                    classe: "bg-emerald-50 text-emerald-700 ring-emerald-200",
                    barra: "bg-emerald-500",
                };

    const arquivosStorageFiltrados = arquivosStorageAuditoria
        .filter((arquivo) => {
            const empresa = obterEmpresaArquivoStorage(arquivo);
            const colaborador = obterColaboradorArquivoStorage(arquivo);
            const tipo = obterTipoArquivoStorage(arquivo);
            const dataArquivo = obterDataArquivoStorage(arquivo);

            const bateEmpresa = filtrosStorage.empresa === "Todas" || empresa === filtrosStorage.empresa;
            const bateColaborador = filtrosStorage.colaborador === "Todos" || colaborador === filtrosStorage.colaborador;
            const bateTipo = filtrosStorage.tipo === "Todos" || tipo === filtrosStorage.tipo;
            const bateInicio = !filtrosStorage.dataInicio || (dataArquivo && dataArquivo >= filtrosStorage.dataInicio);
            const bateFim = !filtrosStorage.dataFim || (dataArquivo && dataArquivo <= filtrosStorage.dataFim);
            const bateTamanho = tamanhoArquivoDentroDoFiltro(arquivo);
            const bateVinculo =
                filtrosStorage.vinculo === "Todos" ||
                (filtrosStorage.vinculo === "Com vínculo" && arquivo.emUso) ||
                (filtrosStorage.vinculo === "Sem vínculo" && !arquivo.emUso);

            return bateEmpresa && bateColaborador && bateTipo && bateInicio && bateFim && bateTamanho && bateVinculo;
        })
        .sort((a, b) => {
            const dataA = a.atualizadoEm ? new Date(a.atualizadoEm).getTime() : 0;
            const dataB = b.atualizadoEm ? new Date(b.atualizadoEm).getTime() : 0;

            return dataB - dataA || Number(b.tamanho || 0) - Number(a.tamanho || 0);
        });

    const opcoesEmpresasStorage = Array.from(new Set(arquivosStorageAuditoria.map(obterEmpresaArquivoStorage))).sort();
    const opcoesColaboradoresStorage = Array.from(new Set(arquivosStorageAuditoria.map(obterColaboradorArquivoStorage))).sort();
    const opcoesTiposStorage = Array.from(new Set(arquivosStorageAuditoria.map(obterTipoArquivoStorage))).sort();

    const agruparArquivosStorage = (lista, obterChave) =>
        Object.values(
            lista.reduce((acc, arquivo) => {
                const chave = obterChave(arquivo) || "Não informado";

                if (!acc[chave]) {
                    acc[chave] = {
                        nome: chave,
                        arquivos: 0,
                        bytes: 0,
                        emUso: 0,
                        semRegistro: 0,
                    };
                }

                acc[chave].arquivos += 1;
                acc[chave].bytes += Number(arquivo.tamanho || 0);

                if (arquivo.emUso) acc[chave].emUso += 1;
                else acc[chave].semRegistro += 1;

                return acc;
            }, {})
        ).sort((a, b) => b.arquivos - a.arquivos || b.bytes - a.bytes || a.nome.localeCompare(b.nome));

    const arquivosPorEmpresaStorage = agruparArquivosStorage(arquivosStorageAuditoria, obterEmpresaArquivoStorage);
    const arquivosPorTipoStorage = agruparArquivosStorage(arquivosStorageAuditoria, obterTipoArquivoStorage);
    const storagePorBucket = agruparArquivosStorage(arquivosStorageAuditoria, (arquivo) => arquivo.bucket || "storage")
        .map((item) => ({ ...item, bucket: item.nome }))
        .sort((a, b) => b.bytes - a.bytes);
    const maioresArquivosStorage = [...arquivosStorageAuditoria]
        .sort((a, b) => Number(b.tamanho || 0) - Number(a.tamanho || 0))
        .slice(0, 6);
    const ultimoUploadStorage = [...arquivosStorageAuditoria]
        .filter((arquivo) => arquivo.atualizadoEm)
        .sort((a, b) => new Date(b.atualizadoEm).getTime() - new Date(a.atualizadoEm).getTime())[0];

    const carregarStorageAuditoria = async () => {
        if (!onListarArquivosStorage) return;

        setCarregandoStorageAuditoria(true);

        const lista = await onListarArquivosStorage();

        setArquivosStorageAuditoria(lista || []);
        setCarregandoStorageAuditoria(false);
    };

    const excluirStorageAuditoria = async (arquivo) => {
        if (!onExcluirArquivoStorage) return;

        setExcluindoStorageAuditoria(arquivo.caminho);

        const ok = await onExcluirArquivoStorage(arquivo);

        setExcluindoStorageAuditoria("");

        if (ok) {
            const lista = await onListarArquivosStorage();
            setArquivosStorageAuditoria(lista || []);
            onAtualizar?.();
        }
    };

    const carregarUsuariosAuditoria = async () => {
        if (!onListarUsuariosAuditoria) return;

        setCarregandoUsuariosAuditoria(true);

        const lista = await onListarUsuariosAuditoria();

        setUsuariosAuditoria(lista || []);
        setCarregandoUsuariosAuditoria(false);
    };

    const salvarUsuarioAuditoriaTela = async (evento) => {
        evento.preventDefault();

        if (!novoUsuarioAuditoria.email.trim()) {
            alert("Informe o e-mail do usuário que terá acesso à Auditoria.");
            return;
        }

        setSalvandoUsuarioAuditoria(true);

        const ok = await onSalvarUsuarioAuditoria?.({
            ...novoUsuarioAuditoria,
            email: novoUsuarioAuditoria.email.trim().toLowerCase(),
            nome: novoUsuarioAuditoria.nome.trim(),
            funcao: novoUsuarioAuditoria.funcao.trim(),
        });

        setSalvandoUsuarioAuditoria(false);

        if (ok) {
            setNovoUsuarioAuditoria({ email: "", nome: "", funcao: "" });
            carregarUsuariosAuditoria();
        }
    };

    const alternarUsuarioAuditoriaTela = async (usuarioAutorizado) => {
        setAlterandoUsuarioAuditoria(usuarioAutorizado.id);

        const ok = await onAlternarUsuarioAuditoria?.(usuarioAutorizado);

        setAlterandoUsuarioAuditoria("");

        if (ok) {
            carregarUsuariosAuditoria();
        }
    };

    const baixarCsvAuditoria = () => {
        const cabecalho = ["Data/Hora", "Usuário", "Ação", "Tabela", "Registro", "Descrição", "Origem do acesso", "Página", "Navegador", "Plataforma"];
        const linhas = registrosFiltrados.map((item) => {
            const origemAcesso = item.dados?.origemAcesso || {};

            return [
                new Date(item.created_at).toLocaleString("pt-BR"),
                item.usuario_email || "-",
                item.acao || "-",
                item.tabela || "-",
                item.registro_id || "-",
                item.descricao || "-",
                origemAcesso.url || "-",
                origemAcesso.pagina || "-",
                origemAcesso.navegador || "-",
                origemAcesso.plataforma || "-",
            ];
        });

        const csv = [cabecalho, ...linhas]
            .map((linha) => linha.map((campo) => `"${String(campo).replace(/"/g, '""')}"`).join(";"))
            .join("\n");

        const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = `relatorio-auditoria-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();

        URL.revokeObjectURL(url);
    };

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Header
                titulo="Auditoria do sistema"
                subtitulo="Relatório de acessos, consultas QR e alterações feitas no banco de dados."
                acao={
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={onAtualizar}
                            className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                        >
                            <RefreshCw className="h-4 w-4" />
                            Atualizar
                        </button>

                        <button
                            onClick={onBloquear}
                            className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                        >
                            <Lock className="h-4 w-4" />
                            Bloquear auditoria
                        </button>

                        <button
                            onClick={baixarCsvAuditoria}
                            className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
                        >
                            <Download className="h-4 w-4" />
                            Baixar CSV
                        </button>
                    </div>
                }
            />

            <div className="grid gap-3 md:grid-cols-4">
                <CardRecolhivel titulo="Total de eventos" defaultOpen compacto>
                    <p className="text-3xl font-bold text-slate-950">{auditoria.length}</p>
                </CardRecolhivel>

                <CardRecolhivel titulo="Eventos filtrados" defaultOpen compacto>
                    <p className="text-3xl font-bold text-blue-700">{registrosFiltrados.length}</p>
                </CardRecolhivel>

                <CardRecolhivel titulo="Acessos" defaultOpen compacto>
                    <p className="text-3xl font-bold text-emerald-700">
                        {auditoria.filter((item) => String(item.acao || "").includes("ACESSO")).length}
                    </p>
                </CardRecolhivel>

                <CardRecolhivel titulo="Alterações" defaultOpen compacto>
                    <p className="text-3xl font-bold text-orange-700">
                        {auditoria.filter((item) => ["INSERT", "UPDATE", "DELETE"].includes(item.acao)).length}
                    </p>
                </CardRecolhivel>

                <CardRecolhivel titulo="E-mails no mês" defaultOpen compacto>
                    <p className="text-3xl font-bold text-blue-700">{emailsMesAuditoria.length}</p>
                </CardRecolhivel>

                <CardRecolhivel titulo="E-mails com sucesso" defaultOpen compacto>
                    <p className="text-3xl font-bold text-emerald-700">{emailsSucessoAuditoria.length}</p>
                </CardRecolhivel>

                <CardRecolhivel titulo="E-mails com erro" defaultOpen compacto>
                    <p className="text-3xl font-bold text-red-700">{emailsErroAuditoria.length}</p>
                </CardRecolhivel>
            </div>

            <div className="mt-5 grid gap-5 xl:grid-cols-2">
                <CardRecolhivel
                    titulo="Últimos acessos"
                    subtitulo="Entradas recentes, consultas públicas e abertura da Auditoria."
                    contador={ultimosAcessosAuditoria.length}
                    defaultOpen={false}
                >
                    <div className="space-y-2">
                        {ultimosAcessosAuditoria.length === 0 && (
                            <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">
                                Nenhum acesso registrado ainda.
                            </div>
                        )}

                        {ultimosAcessosAuditoria.map((item) => {
                            const origemAcesso = item.dados?.origemAcesso || {};

                            return (
                                <div key={item.id} className="rounded-2xl bg-slate-50 p-3 text-sm ring-1 ring-slate-100">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <p className="font-semibold text-slate-950">{item.usuario_email || "Sistema / consulta pública"}</p>
                                        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-slate-600 ring-1 ring-slate-200">{item.acao || "ACESSO"}</span>
                                    </div>
                                    <p className="mt-1 text-xs text-slate-500">
                                        {item.created_at ? new Date(item.created_at).toLocaleString("pt-BR") : "-"}
                                        {origemAcesso.navegador ? ` · ${origemAcesso.navegador}` : ""}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </CardRecolhivel>

                <CardRecolhivel
                    titulo="Últimos e-mails enviados"
                    subtitulo="Eventos de envio registrados pela auditoria do sistema."
                    contador={ultimosEmailsAuditoria.length}
                    defaultOpen={false}
                >
                    <div className="space-y-2">
                        {ultimosEmailsAuditoria.length === 0 && (
                            <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">
                                Nenhum envio de e-mail registrado ainda.
                            </div>
                        )}

                        {ultimosEmailsAuditoria.map((item) => (
                            <div key={item.id} className="rounded-2xl bg-slate-50 p-3 text-sm ring-1 ring-slate-100">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="font-semibold text-slate-950">{item.destinatario || "Destinatário não informado"}</p>
                                    <span className={classNames(
                                        "rounded-full px-2 py-0.5 text-[10px] font-bold ring-1",
                                        normalizarTextoBusca(item.status_envio).includes("erro")
                                            ? "bg-red-50 text-red-700 ring-red-200"
                                            : "bg-emerald-50 text-emerald-700 ring-emerald-200"
                                    )}>
                                        {item.status_envio || "E-mail"}
                                    </span>
                                </div>
                                <p className="mt-1 text-xs text-slate-500">
                                    {item.data_envio ? new Date(item.data_envio).toLocaleString("pt-BR") : "-"}
                                    {item.enviado_por ? ` · por ${item.enviado_por}` : ""}
                                </p>
                                <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                                    {item.assunto || "Sem assunto"}
                                    {item.documento ? ` · ${item.documento}` : ""}
                                </p>
                                {item.erro && <p className="mt-1 text-xs font-semibold text-red-700">Erro: {item.erro}</p>}
                            </div>
                        ))}
                    </div>
                </CardRecolhivel>
            </div>

            <CardRecolhivel
                className="mt-5"
                titulo="Usuários autorizados na Auditoria"
                subtitulo="Habilite ou desabilite quais usuários podem abrir a aba Auditoria. A permissão é validada no Supabase."
                contador={usuariosAuditoria.length}
                defaultOpen={false}
                acao={(
                    <button
                        type="button"
                        onClick={carregarUsuariosAuditoria}
                        disabled={carregandoUsuariosAuditoria}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-60"
                    >
                        <RefreshCw className={classNames("h-4 w-4", carregandoUsuariosAuditoria ? "animate-spin" : "")} />
                        {carregandoUsuariosAuditoria ? "Carregando..." : "Carregar usuários"}
                    </button>
                )}
            >
                <form onSubmit={salvarUsuarioAuditoriaTela} className="grid gap-3 xl:grid-cols-[1fr_1fr_1fr_auto]">
                    <input
                        type="email"
                        value={novoUsuarioAuditoria.email}
                        onChange={(e) => setNovoUsuarioAuditoria({ ...novoUsuarioAuditoria, email: e.target.value })}
                        placeholder="E-mail do usuário autorizado"
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                    />

                    <input
                        value={novoUsuarioAuditoria.nome}
                        onChange={(e) => setNovoUsuarioAuditoria({ ...novoUsuarioAuditoria, nome: e.target.value })}
                        placeholder="Nome"
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                    />

                    <input
                        value={novoUsuarioAuditoria.funcao}
                        onChange={(e) => setNovoUsuarioAuditoria({ ...novoUsuarioAuditoria, funcao: e.target.value })}
                        placeholder="Função"
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                    />

                    <button
                        type="submit"
                        disabled={salvandoUsuarioAuditoria}
                        className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                    >
                        {salvandoUsuarioAuditoria ? "Salvando..." : "Autorizar"}
                    </button>
                </form>

                <div className="mt-4 space-y-2">
                    {usuariosAuditoria.length === 0 && !carregandoUsuariosAuditoria && (
                        <div className="rounded-3xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                            Clique em <strong>Carregar usuários</strong> para visualizar quem tem acesso à Auditoria.
                        </div>
                    )}

                    {usuariosAuditoria.map((usuarioAutorizado) => (
                        <div
                            key={usuarioAutorizado.id}
                            className={classNames(
                                "rounded-3xl border p-4",
                                usuarioAutorizado.ativo
                                    ? "border-emerald-200 bg-emerald-50"
                                    : "border-slate-200 bg-slate-50"
                            )}
                        >
                            <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="break-words font-bold text-slate-950">{usuarioAutorizado.email}</p>
                                        <span
                                            className={classNames(
                                                "rounded-full px-3 py-1 text-xs font-bold ring-1",
                                                usuarioAutorizado.ativo
                                                    ? "bg-emerald-100 text-emerald-700 ring-emerald-200"
                                                    : "bg-slate-100 text-slate-600 ring-slate-200"
                                            )}
                                        >
                                            {usuarioAutorizado.ativo ? "Habilitado" : "Desabilitado"}
                                        </span>
                                    </div>

                                    <p className="mt-1 text-sm text-slate-500">
                                        {usuarioAutorizado.nome || "Nome não informado"} · {usuarioAutorizado.funcao || "Função não informada"}
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => alternarUsuarioAuditoriaTela(usuarioAutorizado)}
                                    disabled={alterandoUsuarioAuditoria === usuarioAutorizado.id}
                                    className={classNames(
                                        "whitespace-nowrap rounded-2xl px-4 py-2 text-sm font-semibold ring-1 disabled:opacity-60",
                                        usuarioAutorizado.ativo
                                            ? "bg-red-50 text-red-700 ring-red-200 hover:bg-red-100"
                                            : "bg-emerald-50 text-emerald-700 ring-emerald-200 hover:bg-emerald-100"
                                    )}
                                >
                                    {alterandoUsuarioAuditoria === usuarioAutorizado.id
                                        ? "Atualizando..."
                                        : usuarioAutorizado.ativo
                                            ? "Desabilitar acesso"
                                            : "Habilitar acesso"}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <p className="mt-3 rounded-2xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-500">
                    A senha da tela continua existindo, mas o Supabase bloqueia a Auditoria para e-mails não cadastrados ou desabilitados nesta lista.
                </p>
            </CardRecolhivel>

            <CardRecolhivel
                className="mt-5"
                titulo="Arquivos salvos no Storage"
                subtitulo="Controle de capacidade, vínculos, tipos de documentos, maiores arquivos e uploads recentes."
                contador={arquivosStorageAuditoria.length}
                defaultOpen={false}
                acao={(
                    <button
                        type="button"
                        onClick={carregarStorageAuditoria}
                        disabled={carregandoStorageAuditoria}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                    >
                        <Database className="h-4 w-4" />
                        {carregandoStorageAuditoria ? "Carregando..." : "Carregar arquivos"}
                    </button>
                )}
            >
                <div className={classNames("mb-4 rounded-3xl p-4 ring-1", storageStatus.classe)}>
                    <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
                        <div>
                            <p className="text-sm font-bold">Alerta de armazenamento: {storageStatus.texto}</p>
                            <p className="mt-1 text-xs leading-relaxed">{storageStatus.detalhe}</p>
                        </div>
                        <div className="text-left lg:text-right">
                            <p className="text-3xl font-black">{storagePercentual}%</p>
                            <p className="text-xs font-semibold">{formatarBytes(storageTotalBytes)} de {formatarBytes(storageLimiteBytes)}</p>
                        </div>
                    </div>

                    <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/80 ring-1 ring-white/70">
                        <div
                            className={classNames("h-full rounded-full", storageStatus.barra)}
                            style={{ width: `${Math.max(2, storagePercentual)}%` }}
                        />
                    </div>

                    <p className="mt-2 text-[11px] leading-relaxed opacity-80">
                        Regra visual: até 70% normal; de 70% a 89% atenção; acima de 90% crítico.
                    </p>
                </div>

                <div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                    <div className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Total usado</p>
                        <p className="mt-2 text-2xl font-black text-slate-950">{formatarBytes(storageTotalBytes)}</p>
                        <p className="mt-1 text-xs text-slate-500">Limite: {formatarBytes(storageLimiteBytes)}</p>
                    </div>

                    <div className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Total de arquivos</p>
                        <p className="mt-2 text-2xl font-black text-slate-950">{arquivosStorageAuditoria.length}</p>
                        <p className="mt-1 text-xs text-slate-500">{arquivosStorageFiltrados.length} exibido(s) no filtro</p>
                    </div>

                    <div className="rounded-3xl bg-emerald-50 p-4 ring-1 ring-emerald-200">
                        <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Arquivos vinculados</p>
                        <p className="mt-2 text-2xl font-black text-emerald-800">{arquivosStorageAuditoriaEmUso.length}</p>
                        <p className="mt-1 text-xs text-emerald-700">{formatarBytes(storageEmUsoBytes)} em registros ativos</p>
                    </div>

                    <div className="rounded-3xl bg-red-50 p-4 ring-1 ring-red-200">
                        <p className="text-xs font-bold uppercase tracking-wide text-red-700">Sem vínculo</p>
                        <p className="mt-2 text-2xl font-black text-red-800">{arquivosStorageAuditoriaSemRegistro.length}</p>
                        <p className="mt-1 text-xs text-red-700">{formatarBytes(storageSemRegistroBytes)} sem registro</p>
                    </div>

                    <div className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Último upload</p>
                        <p className="mt-2 break-words text-sm font-black text-slate-950">
                            {ultimoUploadStorage?.nome || "Nenhum arquivo carregado"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                            {ultimoUploadStorage?.atualizadoEm ? new Date(ultimoUploadStorage.atualizadoEm).toLocaleString("pt-BR") : "-"}
                        </p>
                    </div>
                </div>

                <div className="mb-5 grid gap-4 xl:grid-cols-3">
                    <div className="rounded-3xl border border-slate-200 bg-white p-4">
                        <h3 className="font-bold text-slate-950">Arquivos por empresa</h3>
                        <p className="mt-1 text-xs text-slate-500">Quantidade e tamanho por empresa vinculada ao arquivo.</p>
                        <div className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1 scrollbar-discreta">
                            {arquivosPorEmpresaStorage.length === 0 && (
                                <p className="rounded-2xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">Carregue os arquivos para visualizar.</p>
                            )}
                            {arquivosPorEmpresaStorage.slice(0, 10).map((item) => (
                                <div key={item.nome} className="rounded-2xl bg-slate-50 px-3 py-2 text-xs ring-1 ring-slate-200">
                                    <div className="flex justify-between gap-3">
                                        <span className="break-words font-bold text-slate-700">{item.nome}</span>
                                        <span className="shrink-0 font-bold text-slate-950">{item.arquivos}</span>
                                    </div>
                                    <p className="mt-1 text-slate-500">{formatarBytes(item.bytes)} · {item.semRegistro} sem vínculo</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-white p-4">
                        <h3 className="font-bold text-slate-950">Arquivos por tipo</h3>
                        <p className="mt-1 text-xs text-slate-500">Certificados, documentos empresariais, contratos, logos e fotos.</p>
                        <div className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1 scrollbar-discreta">
                            {arquivosPorTipoStorage.length === 0 && (
                                <p className="rounded-2xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">Carregue os arquivos para visualizar.</p>
                            )}
                            {arquivosPorTipoStorage.slice(0, 10).map((item) => (
                                <div key={item.nome} className="rounded-2xl bg-slate-50 px-3 py-2 text-xs ring-1 ring-slate-200">
                                    <div className="flex justify-between gap-3">
                                        <span className="break-words font-bold text-slate-700">{item.nome}</span>
                                        <span className="shrink-0 font-bold text-slate-950">{item.arquivos}</span>
                                    </div>
                                    <p className="mt-1 text-slate-500">{formatarBytes(item.bytes)} · {item.emUso} vinculados</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-white p-4">
                        <h3 className="font-bold text-slate-950">Maiores arquivos</h3>
                        <p className="mt-1 text-xs text-slate-500">Prioridade para limpeza ou compactação quando o uso crescer.</p>
                        <div className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1 scrollbar-discreta">
                            {maioresArquivosStorage.length === 0 && (
                                <p className="rounded-2xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">Carregue os arquivos para visualizar.</p>
                            )}
                            {maioresArquivosStorage.map((arquivo) => (
                                <div key={`${arquivo.bucket}-${arquivo.caminho}`} className="rounded-2xl bg-slate-50 px-3 py-2 text-xs ring-1 ring-slate-200">
                                    <p className="break-words font-bold text-slate-700">{arquivo.nome}</p>
                                    <p className="mt-1 text-slate-500">
                                        {formatarBytes(arquivo.tamanho || 0)} · {obterEmpresaArquivoStorage(arquivo)} · {arquivo.emUso ? "vinculado" : "sem vínculo"}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="mb-5 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-3 flex flex-col justify-between gap-2 md:flex-row md:items-center">
                        <div>
                            <h3 className="font-bold text-slate-950">Filtros dos arquivos salvos</h3>
                            <p className="mt-1 text-xs text-slate-500">Filtre por empresa, colaborador, tipo, data de envio, tamanho e vínculo.</p>
                        </div>

                        <button
                            type="button"
                            onClick={() => setFiltrosStorage({
                                empresa: "Todas",
                                colaborador: "Todos",
                                tipo: "Todos",
                                dataInicio: "",
                                dataFim: "",
                                tamanho: "Todos",
                                vinculo: "Todos",
                            })}
                            className="w-fit rounded-2xl bg-white px-4 py-2 text-xs font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                        >
                            Limpar filtros
                        </button>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                        <select
                            value={filtrosStorage.empresa}
                            onChange={(e) => setFiltrosStorage((atual) => ({ ...atual, empresa: e.target.value }))}
                            className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                        >
                            <option value="Todas">Todas as empresas</option>
                            {opcoesEmpresasStorage.map((empresa) => (
                                <option key={empresa} value={empresa}>{empresa}</option>
                            ))}
                        </select>

                        <select
                            value={filtrosStorage.colaborador}
                            onChange={(e) => setFiltrosStorage((atual) => ({ ...atual, colaborador: e.target.value }))}
                            className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                        >
                            <option value="Todos">Todos os colaboradores</option>
                            {opcoesColaboradoresStorage.map((colaborador) => (
                                <option key={colaborador} value={colaborador}>{colaborador}</option>
                            ))}
                        </select>

                        <select
                            value={filtrosStorage.tipo}
                            onChange={(e) => setFiltrosStorage((atual) => ({ ...atual, tipo: e.target.value }))}
                            className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                        >
                            <option value="Todos">Todos os tipos</option>
                            {opcoesTiposStorage.map((tipo) => (
                                <option key={tipo} value={tipo}>{tipo}</option>
                            ))}
                        </select>

                        <select
                            value={filtrosStorage.tamanho}
                            onChange={(e) => setFiltrosStorage((atual) => ({ ...atual, tamanho: e.target.value }))}
                            className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                        >
                            <option value="Todos">Todos os tamanhos</option>
                            <option value="ate-1mb">Até 1 MB</option>
                            <option value="1mb-10mb">1 MB a 10 MB</option>
                            <option value="10mb-50mb">10 MB a 50 MB</option>
                            <option value="acima-50mb">Acima de 50 MB</option>
                        </select>

                        <select
                            value={filtrosStorage.vinculo}
                            onChange={(e) => setFiltrosStorage((atual) => ({ ...atual, vinculo: e.target.value }))}
                            className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                        >
                            <option value="Todos">Com e sem vínculo</option>
                            <option value="Com vínculo">Somente vinculados</option>
                            <option value="Sem vínculo">Somente sem vínculo</option>
                        </select>

                        <div className="grid grid-cols-2 gap-2">
                            <input
                                type="date"
                                value={filtrosStorage.dataInicio}
                                onChange={(e) => setFiltrosStorage((atual) => ({ ...atual, dataInicio: e.target.value }))}
                                className="min-w-0 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                title="Data inicial de envio"
                            />
                            <input
                                type="date"
                                value={filtrosStorage.dataFim}
                                onChange={(e) => setFiltrosStorage((atual) => ({ ...atual, dataFim: e.target.value }))}
                                className="min-w-0 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                title="Data final de envio"
                            />
                        </div>
                    </div>
                </div>

                {storagePorBucket.length > 0 && (
                    <div className="mb-5 rounded-3xl border border-slate-200 bg-white p-4">
                        <h3 className="font-bold text-slate-950">Uso por bucket</h3>
                        <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-5">
                            {storagePorBucket.map((bucketInfo) => (
                                <div key={bucketInfo.bucket} className="rounded-2xl bg-slate-50 p-3 text-xs ring-1 ring-slate-200">
                                    <p className="break-words font-bold text-slate-700">{bucketInfo.bucket}</p>
                                    <p className="mt-1 text-slate-500">
                                        {bucketInfo.arquivos} arquivo(s) · {formatarBytes(bucketInfo.bytes)}
                                    </p>
                                    <p className="mt-1 text-slate-400">
                                        {bucketInfo.emUso} em uso · {bucketInfo.semRegistro} sem vínculo
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {arquivosStorageAuditoria.length === 0 && !carregandoStorageAuditoria && (
                    <div className="rounded-3xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                        Clique em <strong>Carregar arquivos</strong> para consultar o Storage.
                    </div>
                )}

                {arquivosStorageAuditoria.length > 0 && (
                    <div>
                        <div className="mb-3 flex flex-col justify-between gap-2 md:flex-row md:items-center">
                            <p className="text-sm font-bold text-slate-950">
                                Arquivos encontrados: {arquivosStorageFiltrados.length} de {arquivosStorageAuditoria.length}
                            </p>
                            <p className="text-xs text-slate-500">
                                Exibindo primeiro os uploads mais recentes.
                            </p>
                        </div>

                        {arquivosStorageFiltrados.length === 0 && (
                            <div className="rounded-3xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                                Nenhum arquivo encontrado com os filtros selecionados.
                            </div>
                        )}

                        {arquivosStorageFiltrados.length > 0 && (
                            <div className="max-h-[32rem] space-y-2 overflow-y-auto pr-1 scrollbar-discreta">
                                {arquivosStorageFiltrados.map((arquivo) => (
                                    <div
                                        key={`${arquivo.bucket}-${arquivo.caminho}`}
                                        className={classNames(
                                            "rounded-2xl px-3 py-2 text-sm ring-1",
                                            arquivo.emUso
                                                ? "bg-emerald-50 text-emerald-900 ring-emerald-100"
                                                : "bg-red-50 text-red-900 ring-red-100"
                                        )}
                                    >
                                        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <p className="break-words font-bold">{arquivo.nome}</p>
                                                    <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-bold">
                                                        {arquivo.emUso ? "Em uso" : "Sem vínculo"}
                                                    </span>
                                                    <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-bold">
                                                        {formatarBytes(arquivo.tamanho || 0)}
                                                    </span>
                                                </div>

                                                <p className="mt-1 break-words text-xs opacity-80">
                                                    <strong>Empresa:</strong> {obterEmpresaArquivoStorage(arquivo)}
                                                </p>
                                                <p className="break-words text-xs opacity-80">
                                                    <strong>Colaborador:</strong> {obterColaboradorArquivoStorage(arquivo)}
                                                </p>
                                                <p className="break-words text-xs opacity-80">
                                                    <strong>Tipo:</strong> {obterTipoArquivoStorage(arquivo)}
                                                </p>
                                                <p className="break-words text-xs opacity-80">
                                                    <strong>Bucket:</strong> {arquivo.bucket || "-"} · <strong>Pasta:</strong> {arquivo.pasta || "raiz"}
                                                </p>
                                                <p className="break-words text-xs opacity-80">
                                                    <strong>Fonte do vínculo:</strong> {arquivo.tabelaOrigem || arquivo.origemRegistro || "Somente Storage"}
                                                </p>
                                                <p className="break-words text-xs opacity-80">
                                                    <strong>Data de envio/atualização:</strong> {arquivo.atualizadoEm ? new Date(arquivo.atualizadoEm).toLocaleString("pt-BR") : "Não identificada"}
                                                </p>
                                                <p className="break-words text-xs opacity-80">
                                                    <strong>Caminho:</strong> {arquivo.caminho}
                                                </p>

                                                {!arquivo.emUso && (
                                                    <p className="mt-1 break-words text-xs font-semibold text-red-700">
                                                        Arquivo sem vínculo com registro atual do sistema.
                                                    </p>
                                                )}
                                            </div>

                                            <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
                                                <button
                                                    type="button"
                                                    onClick={() => excluirStorageAuditoria(arquivo)}
                                                    disabled={arquivo.emUso || excluindoStorageAuditoria === arquivo.caminho}
                                                    title={arquivo.emUso ? "Arquivo em uso não pode ser excluído por aqui" : "Excluir arquivo sem vínculo do Storage"}
                                                    className="rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                                                >
                                                    {excluindoStorageAuditoria === arquivo.caminho ? "Excluindo..." : "Excluir"}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {arquivosStorageAuditoriaSemRegistro.length > 0 && (
                    <p className="mt-3 rounded-2xl bg-red-50 p-3 text-xs text-red-700 ring-1 ring-red-100">
                        Use excluir apenas para arquivos sem vínculo. Arquivos em uso devem ser tratados pela base correta para manter o histórico do sistema.
                    </p>
                )}
            </CardRecolhivel>

            <CardRecolhivel
                className="mt-5"
                titulo="Registros detalhados da auditoria"
                subtitulo="Consulta completa com filtros, origem de acesso e dados extras de cada evento."
                contador={registrosFiltrados.length}
                defaultOpen={false}
            >
                <div className="grid gap-3 xl:grid-cols-[1fr_220px]">
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            value={busca}
                            onChange={(e) => setBusca(e.target.value)}
                            placeholder="Buscar por usuário, ação, tabela, registro ou descrição"
                            className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                        />
                    </div>

                    <select
                        value={filtroAcao}
                        onChange={(e) => setFiltroAcao(e.target.value)}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                    >
                        <option value="Todas">Todas as ações</option>
                        {acoes.map((acao) => (
                            <option key={acao} value={acao}>
                                {acao}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="mt-5 space-y-3">
                    {carregando && (
                        <div className="rounded-3xl bg-slate-50 p-6 text-center text-sm text-slate-500">
                            Carregando auditoria...
                        </div>
                    )}

                    {!carregando && registrosFiltrados.length === 0 && (
                        <div className="rounded-3xl border border-dashed border-slate-300 p-8 text-center">
                            <Database className="mx-auto h-10 w-10 text-slate-300" />
                            <h3 className="mt-3 font-bold text-slate-900">Nenhum evento encontrado</h3>
                            <p className="mt-1 text-sm text-slate-500">
                                Quando houver acesso ou alteração no sistema, os eventos aparecerão aqui.
                            </p>
                        </div>
                    )}

                    {registrosFiltrados.map((item) => {
                        const origemAcesso = item.dados?.origemAcesso || {};
                        const temOrigemAcesso = Boolean(origemAcesso.url || origemAcesso.pagina || origemAcesso.navegador || origemAcesso.plataforma);
                        const dadosExtras = item.dados && typeof item.dados === "object"
                            ? Object.fromEntries(Object.entries(item.dados).filter(([chave]) => chave !== "origemAcesso"))
                            : {};
                        const temDadosExtras = Object.keys(dadosExtras).length > 0;
                        const detalhesAberto = Boolean(detalhesAuditoriaAbertos[item.id]);
                        const podeAbrirDetalhes = temOrigemAcesso || temDadosExtras || item.registro_id;

                        return (
                            <div key={item.id} className="rounded-3xl border border-slate-200 bg-white p-4">
                                <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-bold text-white">
                                                {item.acao || "-"}
                                            </span>
                                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                                                {item.tabela || "-"}
                                            </span>
                                        </div>

                                        <p className="mt-3 font-bold text-slate-950">{item.descricao || "Evento registrado"}</p>
                                        <p className="mt-1 text-sm text-slate-500">
                                            Usuário: <strong>{item.usuario_email || "Sistema / consulta pública"}</strong>
                                        </p>
                                    </div>

                                    <div className="flex shrink-0 flex-col gap-2 lg:items-end">
                                        <p className="text-sm font-semibold text-slate-500">
                                            {item.created_at ? new Date(item.created_at).toLocaleString("pt-BR") : "-"}
                                        </p>

                                        {podeAbrirDetalhes && (
                                            <button
                                                type="button"
                                                onClick={() => alternarDetalhesAuditoria(item.id)}
                                                className="inline-flex items-center justify-center gap-1 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-200"
                                            >
                                                {detalhesAberto ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                                {detalhesAberto ? "Fechar detalhes" : "Abrir detalhes"}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {detalhesAberto && (
                                    <div className="mt-3 grid gap-3 lg:grid-cols-2">
                                        <div className="rounded-2xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-500 ring-1 ring-slate-100">
                                            <p className="font-bold text-slate-700">Informações do registro</p>
                                            <p className="mt-1 break-words">
                                                <strong>Registro:</strong> {item.registro_id || "-"}
                                            </p>
                                            <p className="break-words">
                                                <strong>Tabela:</strong> {item.tabela || "-"}
                                            </p>
                                            <p className="break-words">
                                                <strong>Ação:</strong> {item.acao || "-"}
                                            </p>
                                        </div>

                                        {temOrigemAcesso && (
                                            <div className="rounded-2xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-500 ring-1 ring-slate-100">
                                                <p className="font-bold text-slate-700">Origem do acesso</p>
                                                <p className="mt-1 break-words">
                                                    <strong>URL:</strong> {origemAcesso.url || "-"}
                                                </p>
                                                <p className="break-words">
                                                    <strong>Página:</strong> {origemAcesso.pagina || "-"}
                                                </p>
                                                <p>
                                                    <strong>Navegador:</strong> {origemAcesso.navegador || "-"}
                                                    {origemAcesso.plataforma ? ` · Plataforma: ${origemAcesso.plataforma}` : ""}
                                                    {origemAcesso.idioma ? ` · Idioma: ${origemAcesso.idioma}` : ""}
                                                </p>
                                            </div>
                                        )}

                                        {temDadosExtras && (
                                            <div className="rounded-2xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-500 ring-1 ring-slate-100 lg:col-span-2">
                                                <p className="font-bold text-slate-700">Outras informações</p>
                                                <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-white p-3 text-[11px] text-slate-600 ring-1 ring-slate-100 scrollbar-discreta">
                                                    {JSON.stringify(dadosExtras, null, 2)}
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </CardRecolhivel>
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
    const [auditoria, setAuditoria] = useState([]);
    const [emailsEnviados, setEmailsEnviados] = useState([]);
    const [auditoriasCampo, setAuditoriasCampo] = useState([]);
    const [carregandoAuditoria, setCarregandoAuditoria] = useState(false);
    const [podeAcessarAuditoria, setPodeAcessarAuditoria] = useState(false);
    const [verificandoAcessoAuditoria, setVerificandoAcessoAuditoria] = useState(false);
    const [auditoriaLiberada, setAuditoriaLiberada] = useState(() => {
        try {
            return window.sessionStorage.getItem("auditoriaLiberada") === "true";
        } catch {
            return false;
        }
    });

    const carregarEmpresas = useCallback(async () => {
        const { data, error } = await supabase
            .from("empresas")
            .select("id, nome, cnpj, responsavel, email, telefone, status, tipo_empresa, logo_url, logo_nome, contrato_url, contrato_nome, numero_contrato, data_inicio_contrato, data_fim_contrato, responsavel_contratante, tst_responsavel, tst_email, escopo_servico, observacao_status, empresa_pai_id")
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
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            throw new Error(`Erro ao carregar documentos das empresas: ${error.message}`);
        }

        const normalizados = (data || []).map(normalizarDocumentoEmpresa);
        setDocumentosEmpresas(normalizados);
        return normalizados;
    }, []);

    const carregarAuditoria = useCallback(async () => {
        setCarregandoAuditoria(true);

        const { data, error } = await supabase
            .from("auditoria_sistema")
            .select("id, created_at, usuario_email, acao, tabela, registro_id, descricao, dados")
            .order("created_at", { ascending: false })
            .limit(300);

        setCarregandoAuditoria(false);

        if (error) {
            console.warn("Erro ao carregar auditoria:", error.message);
            setAuditoria([]);
            return [];
        }

        setAuditoria(data || []);
        return data || [];
    }, []);


    const carregarEmailsEnviados = useCallback(async () => {
        const { data, error } = await supabase
            .from("emails_enviados")
            .select("id, empresa_id, colaborador_id, documento_id, destinatario, assunto, tipo_alerta, documento, status_envio, erro, data_envio, enviado_por")
            .order("data_envio", { ascending: false })
            .limit(300);

        if (error) {
            console.warn("Erro ao carregar histórico de e-mails:", error.message);
            setEmailsEnviados([]);
            return [];
        }

        setEmailsEnviados(data || []);
        return data || [];
    }, []);

    const carregarAuditoriasCampo = useCallback(async () => {
        const { data, error } = await supabase
            .from("auditorias_campo")
            .select("*, auditoria_campo_desvios(*)")
            .order("created_at", { ascending: false })
            .limit(500);

        if (error) {
            console.warn("Erro ao carregar auditorias de campo:", error.message);
            setAuditoriasCampo([]);
            return [];
        }

        const normalizadas = (data || []).map((item) => normalizarAuditoriaCampo({
            ...item,
            desvios: item.auditoria_campo_desvios || [],
        }));

        setAuditoriasCampo(normalizadas);
        return normalizadas;
    }, []);

    const registrarEmailEnviado = useCallback(
        async ({ empresaId = null, colaboradorId = null, documentoId = null, destinatario = "", assunto = "", tipoAlerta = "", documento = "", statusEnvio = "", erro = "" } = {}) => {
            const payload = {
                empresa_id: empresaId || null,
                colaborador_id: colaboradorId || null,
                documento_id: documentoId || null,
                destinatario: destinatario || null,
                assunto: assunto || null,
                tipo_alerta: tipoAlerta || null,
                documento: documento || null,
                status_envio: statusEnvio || "Registrado",
                erro: erro || null,
                data_envio: new Date().toISOString(),
                enviado_por: usuario?.email || null,
            };

            const { error } = await supabase.from("emails_enviados").insert(payload);

            if (error) {
                console.warn("Erro ao registrar histórico de e-mail:", error.message);
                return false;
            }

            setEmailsEnviados((atual) => [{ id: `${Date.now()}`, ...payload }, ...atual].slice(0, 300));
            return true;
        },
        [usuario?.email]
    );

    const registrarAuditoria = useCallback(
        async (acao, tabela, descricao, registroId = null, dados = {}) => {
            if (!usuario?.email) return;

            await supabase.from("auditoria_sistema").insert({
                usuario_id: usuario.id || null,
                usuario_email: usuario.email,
                acao,
                tabela,
                registro_id: registroId ? String(registroId) : null,
                descricao,
                dados: {
                    ...(dados || {}),
                    origemAcesso: obterOrigemAcesso(),
                },
            });
        },
        [usuario]
    );

    const carregarUsuariosAutorizadosAuditoria = useCallback(async () => {
        const { data, error } = await supabase
            .from("auditoria_usuarios_autorizados")
            .select("id, created_at, email, nome, funcao, ativo, observacao")
            .order("email", { ascending: true });

        if (error) {
            alert(`Erro ao carregar usuários autorizados: ${error.message}`);
            return [];
        }

        return data || [];
    }, []);

    const salvarUsuarioAutorizadoAuditoria = useCallback(
        async (usuarioAutorizado) => {
            if (!usuarioAutorizado?.email) {
                alert("Informe o e-mail do usuário autorizado.");
                return false;
            }

            const { error } = await supabase
                .from("auditoria_usuarios_autorizados")
                .upsert(
                    {
                        email: usuarioAutorizado.email.toLowerCase(),
                        nome: usuarioAutorizado.nome || null,
                        funcao: usuarioAutorizado.funcao || null,
                        ativo: true,
                    },
                    { onConflict: "email" }
                );

            if (error) {
                alert(`Erro ao autorizar usuário: ${error.message}`);
                return false;
            }

            await registrarAuditoria(
                "USUARIO_AUDITORIA_AUTORIZADO",
                "auditoria_usuarios_autorizados",
                `Autorizou usuário para Auditoria: ${usuarioAutorizado.email}`,
                usuarioAutorizado.email,
                usuarioAutorizado
            );

            return true;
        },
        [registrarAuditoria]
    );

    const alternarUsuarioAutorizadoAuditoria = useCallback(
        async (usuarioAutorizado) => {
            if (!usuarioAutorizado?.id) return false;

            if (
                usuarioAutorizado.ativo &&
                usuario?.email &&
                usuarioAutorizado.email?.toLowerCase() === usuario.email.toLowerCase()
            ) {
                alert("Você não pode desabilitar o próprio acesso à Auditoria pelo sistema.");
                return false;
            }

            const novoStatus = !usuarioAutorizado.ativo;

            const { error } = await supabase
                .from("auditoria_usuarios_autorizados")
                .update({ ativo: novoStatus })
                .eq("id", usuarioAutorizado.id);

            if (error) {
                alert(`Erro ao atualizar acesso: ${error.message}`);
                return false;
            }

            await registrarAuditoria(
                novoStatus ? "USUARIO_AUDITORIA_HABILITADO" : "USUARIO_AUDITORIA_DESABILITADO",
                "auditoria_usuarios_autorizados",
                `${novoStatus ? "Habilitou" : "Desabilitou"} acesso à Auditoria: ${usuarioAutorizado.email}`,
                usuarioAutorizado.id,
                {
                    email: usuarioAutorizado.email,
                    ativo: novoStatus,
                }
            );

            return true;
        },
        [registrarAuditoria, usuario]
    );

    const verificarAcessoAuditoria = useCallback(async () => {
        if (!usuario?.email) {
            setPodeAcessarAuditoria(false);
            return false;
        }

        setVerificandoAcessoAuditoria(true);

        const { data, error } = await supabase.rpc("usuario_pode_acessar_auditoria");

        setVerificandoAcessoAuditoria(false);

        if (error) {
            console.warn("Erro ao verificar permissão de auditoria:", error.message);
            setPodeAcessarAuditoria(false);
            return false;
        }

        setPodeAcessarAuditoria(Boolean(data));
        return Boolean(data);
    }, [usuario]);

    const liberarAuditoria = async () => {
        const autorizadoAuditoria = await verificarAcessoAuditoria();

        if (!autorizadoAuditoria) {
            alert("Seu usuário não está autorizado no Supabase para acessar a Auditoria.");
            return;
        }

        try {
            window.sessionStorage.setItem("auditoriaLiberada", "true");
        } catch {
            // Sessão indisponível; mantém apenas em memória.
        }

        setAuditoriaLiberada(true);
        carregarAuditoria();
        registrarAuditoria("ACESSO_AUDITORIA", "auditoria_sistema", "Liberou acesso à tela de Auditoria por senha e regra do Supabase");
    };

    const bloquearAuditoria = () => {
        try {
            window.sessionStorage.removeItem("auditoriaLiberada");
        } catch {
            // Sessão indisponível; mantém apenas em memória.
        }

        setAuditoriaLiberada(false);
        registrarAuditoria("BLOQUEIO_AUDITORIA", "auditoria_sistema", "Bloqueou novamente o acesso à tela de Auditoria");
    };

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
          data_nascimento,
          mostrar_aniversario_dashboard,
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
            empresa_pai_id,
            tst_responsavel,
            tst_email
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
                    empresaTstResponsavel: empresaAtual?.tst_responsavel || empresaPai?.tst_responsavel || "",
                    empresaTstEmail: empresaAtual?.tst_email || empresaPai?.tst_email || "",
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
                    .select("*")
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
        if (!validarArquivoAntesUpload(arquivo, "fotoAuditoria")) {
            throw new Error("Arquivo de logo fora do limite configurado.");
        }

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

    async function enviarContratoEmpresa(arquivo, empresaId) {
        if (!arquivo) return { contratoUrl: null, contratoNome: null };
        if (!validarArquivoAntesUpload(arquivo, "documentoExtenso")) {
            throw new Error("Contrato fora do limite configurado.");
        }

        const nomeSeguro = sanitizarNomeArquivo(arquivo.name);
        const caminho = `${empresaId || "nova-empresa"}/${Date.now()}-${nomeSeguro}`;

        const { error } = await supabase.storage
            .from("contratos-empresas")
            .upload(caminho, arquivo, {
                cacheControl: "3600",
                upsert: true,
                contentType: arquivo.type || "application/pdf",
            });

        if (error) {
            throw new Error(`Erro ao enviar contrato: ${error.message}`);
        }

        return { contratoUrl: caminho, contratoNome: nomeSeguro };
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
                    tst_responsavel: novaEmpresa.tstResponsavel || null,
                    tst_email: novaEmpresa.tstEmail || null,
                    escopo_servico: novaEmpresa.escopoServico || null,
                    observacao_status: novaEmpresa.observacaoStatus || null,
                })
                .select("id, nome, cnpj, responsavel, email, telefone, status, tipo_empresa, logo_url, logo_nome, contrato_url, contrato_nome, numero_contrato, data_inicio_contrato, data_fim_contrato, responsavel_contratante, tst_responsavel, tst_email, escopo_servico, observacao_status, empresa_pai_id")
                .single();

            if (error) {
                throw new Error(`Erro ao cadastrar empresa: ${error.message}`);
            }

            if (novaEmpresa.logo || novaEmpresa.contratoArquivo) {
                const atualizacaoArquivos = {};

                if (novaEmpresa.logo) {
                    const logo = await enviarLogoEmpresa(novaEmpresa.logo, data.id);
                    atualizacaoArquivos.logo_url = logo.logoUrl;
                    atualizacaoArquivos.logo_nome = logo.logoNome;
                }

                if (novaEmpresa.contratoArquivo) {
                    const contrato = await enviarContratoEmpresa(novaEmpresa.contratoArquivo, data.id);
                    atualizacaoArquivos.contrato_url = contrato.contratoUrl;
                    atualizacaoArquivos.contrato_nome = contrato.contratoNome;
                }

                const { data: empresaComArquivos, error: arquivosError } = await supabase
                    .from("empresas")
                    .update(atualizacaoArquivos)
                    .eq("id", data.id)
                    .select("id, nome, cnpj, responsavel, email, telefone, status, tipo_empresa, logo_url, logo_nome, contrato_url, contrato_nome, numero_contrato, data_inicio_contrato, data_fim_contrato, responsavel_contratante, tst_responsavel, tst_email, escopo_servico, observacao_status, empresa_pai_id")
                    .single();

                if (arquivosError) {
                    throw new Error(`Empresa cadastrada, mas houve erro ao salvar arquivos: ${arquivosError.message}`);
                }

                data = empresaComArquivos;
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

            let contratoAtualizado = {
                contrato_url: empresaAtualizada.contratoUrlAtual || null,
                contrato_nome: empresaAtualizada.contratoNomeAtual || null,
            };

            if (empresaAtualizada.contratoArquivo) {
                const contrato = await enviarContratoEmpresa(empresaAtualizada.contratoArquivo, empresaAtualizada.id);
                contratoAtualizado = {
                    contrato_url: contrato.contratoUrl,
                    contrato_nome: contrato.contratoNome,
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
                    contrato_url: contratoAtualizado.contrato_url,
                    contrato_nome: contratoAtualizado.contrato_nome,
                    numero_contrato: empresaAtualizada.numeroContrato || null,
                    data_inicio_contrato: empresaAtualizada.dataInicioContrato || null,
                    data_fim_contrato: empresaAtualizada.dataFimContrato || null,
                    responsavel_contratante: empresaAtualizada.responsavelContratante || null,
                    tst_responsavel: empresaAtualizada.tstResponsavel || null,
                    tst_email: empresaAtualizada.tstEmail || null,
                    escopo_servico: empresaAtualizada.escopoServico || null,
                    observacao_status: empresaAtualizada.observacaoStatus || null,
                })
                .eq("id", empresaAtualizada.id)
                .select("id, nome, cnpj, responsavel, email, telefone, status, tipo_empresa, logo_url, logo_nome, contrato_url, contrato_nome, numero_contrato, data_inicio_contrato, data_fim_contrato, responsavel_contratante, tst_responsavel, tst_email, escopo_servico, observacao_status, empresa_pai_id")
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
                if (!validarArquivoAntesUpload(novoDoc.arquivo, "documentoExtenso")) {
                    throw new Error("Documento empresarial fora do limite configurado.");
                }

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
                        url_do_arquivo: arquivoUrl,
                        nome_do_arquivo: arquivoNome,
                        observacao: novoDoc.observacao || null,
                        status_validacao: "Validado",
                    },
                    { onConflict: "empresa_id,tipo_documento" }
                )
                .select("*")
                .single();

            if (error) {
                throw new Error(`Erro ao salvar documento: ${error.message}`);
            }

            const documentoNormalizado = normalizarDocumentoEmpresa(data);

            setDocumentosEmpresas((atual) => [
                documentoNormalizado,
                ...atual.filter(
                    (item) => !(item.empresa_id === documentoNormalizado.empresa_id && item.tipo_documento === documentoNormalizado.tipo_documento)
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

        if ((documento.url_do_arquivo || documento.arquivo_url)) {
            await supabase.storage.from("documentos-empresas").remove([(documento.url_do_arquivo || documento.arquivo_url)]);
        }

        setDocumentosEmpresas((atual) => atual.filter((item) => item.id !== documento.id));
    }

    async function visualizarDocumentoEmpresa(documento) {
        setErroBanco("");

        if (!(documento?.url_do_arquivo || documento?.arquivo_url)) {
            setErroBanco("Este documento ainda não possui arquivo anexado para visualização.");
            return;
        }

        const { data, error } = await supabase.storage
            .from("documentos-empresas")
            .createSignedUrl((documento.url_do_arquivo || documento.arquivo_url), 60 * 10);

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
            .select("id, nome, cnpj, responsavel, email, telefone, status, tipo_empresa, logo_url, logo_nome, contrato_url, contrato_nome, numero_contrato, data_inicio_contrato, data_fim_contrato, responsavel_contratante, tst_responsavel, tst_email, escopo_servico, observacao_status, empresa_pai_id")
            .single();

        if (error) {
            throw new Error(`Erro ao criar empresa: ${error.message}`);
        }

        setEmpresasBanco((atual) => [...atual, data].sort((a, b) => a.nome.localeCompare(b.nome)));
        return data;
    }

    async function enviarFotoColaborador(arquivo, colaboradorId) {
        if (!arquivo) return { fotoUrl: null, fotoNome: null };
        if (!validarArquivoAntesUpload(arquivo, "fotoAuditoria")) {
            throw new Error("Arquivo de imagem fora do limite configurado.");
        }

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

    async function salvarCertificadosEmMassaColaborador(colaborador, arquivos = []) {
        const analise = analisarArquivosTreinamentoMassa(arquivos);
        const reconhecidos = analise.filter((item) => item.reconhecido);
        const ignorados = analise.filter((item) => !item.reconhecido);

        for (const item of reconhecidos) {
            const treinamento = item.treinamento;
            const arquivo = await enviarArquivoCertificado(item.arquivo, colaborador, treinamento.id);

            const payload = {
                colaborador_id: colaborador.id,
                tipo_treinamento: treinamento.nome,
                treinamento_codigo: Number(treinamento.id),
                nome_treinamento: treinamento.nome,
                data_realizacao: item.dataRealizacao,
                data_vencimento: item.dataVencimento,
                url_do_arquivo: arquivo.arquivoUrl,
                nome_do_arquivo: item.arquivo.name,
                observacao: "Enviado em massa no cadastro do colaborador",
                status_validacao: "Validado",
            };

            const { data: existentes, error: buscaError } = await supabase
                .from("certificados")
                .select("*")
                .eq("colaborador_id", colaborador.id)
                .eq("tipo_treinamento", treinamento.nome)
                .order("created_at", { ascending: false })
                .limit(1);

            if (buscaError) {
                throw new Error(`Erro ao verificar certificado existente: ${buscaError.message}`);
            }

            const existente = existentes?.[0] || null;
            const consulta = existente?.id
                ? supabase.from("certificados").update(payload).eq("id", existente.id)
                : supabase.from("certificados").insert(payload);

            const { error } = await consulta;

            if (error) {
                throw new Error(`Erro ao salvar ${item.arquivo.name}: ${error.message}`);
            }

            if ((existente?.url_do_arquivo || existente?.arquivo_url) && (existente.url_do_arquivo || existente.arquivo_url) !== arquivo.arquivoUrl) {
                await supabase.storage.from("certificados-treinamentos").remove([(existente.url_do_arquivo || existente.arquivo_url)]);
            }
        }

        return {
            reconhecidos: reconhecidos.length,
            ignorados: ignorados.map((item) => item.nomeArquivo),
        };
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
                    status_mobilizacao: novo.statusMobilizacao || obterStatusInicialColaborador(),
                    data_nascimento: novo.dataNascimento || null,
                    mostrar_aniversario_dashboard: novo.mostrarAniversarioDashboard !== false,
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
          data_nascimento,
          mostrar_aniversario_dashboard,
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
            data_nascimento,
            mostrar_aniversario_dashboard,
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

            let resultadoMassa = null;

            if (novo.documentosMassa?.length) {
                resultadoMassa = await salvarCertificadosEmMassaColaborador(colaborador, novo.documentosMassa);
            }

            await carregarColaboradores();

            setColaboradorSelecionado((atual) => atual || colaborador);

            if (resultadoMassa) {
                const mensagemIgnorados = resultadoMassa.ignorados.length
                    ? `\n\nArquivos não reconhecidos:\n- ${resultadoMassa.ignorados.join("\n- ")}`
                    : "";

                alert(
                    `Colaborador cadastrado. ${resultadoMassa.reconhecidos} documento(s) de treinamento foram vinculados automaticamente.${mensagemIgnorados}`
                );
            }

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
                    status_mobilizacao: colaboradorAtualizado.statusMobilizacao || obterStatusInicialColaborador(),
                    data_nascimento: colaboradorAtualizado.dataNascimento || null,
                    mostrar_aniversario_dashboard: colaboradorAtualizado.mostrarAniversarioDashboard !== false,
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
          data_nascimento,
          mostrar_aniversario_dashboard,
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

            setColaboradores((atual) =>
                atual.map((item) =>
                    item.id === colaborador.id
                        ? {
                            ...item,
                            ...colaborador,
                            treinamentos: item.treinamentos || colaborador.treinamentos || [],
                        }
                        : item
                )
            );

            if (colaboradorSelecionado?.id === colaborador.id) {
                setColaboradorSelecionado((atual) => ({
                    ...atual,
                    ...colaborador,
                    treinamentos: atual?.treinamentos || colaborador.treinamentos || [],
                }));
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
        if (!validarArquivoAntesUpload(arquivo, "documentoSimples")) {
            throw new Error("Certificado/documento fora do limite configurado.");
        }

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
                                url_do_arquivo: caminho,
                                nome_do_arquivo: maisRecente.name,
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

    async function listarArquivosCertificadosStorage() {
        setErroBanco("");

        try {
            const coletados = [];
            const bucketsAuditados = [
                {
                    bucket: "certificados-treinamentos",
                    origemTipo: "Colaborador / Certificado de treinamento",
                    tabelaOrigem: "certificados",
                },
                {
                    bucket: "documentos-empresas",
                    origemTipo: "Empresa / Documento empresarial",
                    tabelaOrigem: "documentos_empresas",
                },
                {
                    bucket: "contratos-empresas",
                    origemTipo: "Empresa / Contrato",
                    tabelaOrigem: "empresas.contrato_url",
                },
                {
                    bucket: "logos-empresas",
                    origemTipo: "Empresa / Logo",
                    tabelaOrigem: "empresas.logo_url",
                },
                {
                    bucket: "fotos-colaboradores",
                    origemTipo: "Colaborador / Foto",
                    tabelaOrigem: "colaboradores.foto_url",
                },
            ];

            const listarNivel = async (bucketInfo, prefixo = "") => {
                const { data, error } = await supabase.storage
                    .from(bucketInfo.bucket)
                    .list(prefixo, {
                        limit: 1000,
                        sortBy: { column: "name", order: "asc" },
                    });

                if (error) {
                    console.warn(`Erro ao listar bucket ${bucketInfo.bucket}:`, error.message);
                    return;
                }

                for (const item of data || []) {
                    const caminho = prefixo ? `${prefixo}/${item.name}` : item.name;
                    const pareceArquivo = item.name && /\.[a-z0-9]{2,5}$/i.test(item.name);

                    if (pareceArquivo) {
                        coletados.push({
                            bucket: bucketInfo.bucket,
                            origemTipo: bucketInfo.origemTipo,
                            tabelaOrigem: bucketInfo.tabelaOrigem,
                            nome: item.name,
                            caminho,
                            tamanho: item.metadata?.size || null,
                            atualizadoEm: item.updated_at || item.created_at || null,
                        });
                    } else {
                        await listarNivel(bucketInfo, caminho);
                    }
                }
            };

            for (const bucketInfo of bucketsAuditados) {
                await listarNivel(bucketInfo, "");
            }

            const { data: certificados, error: certificadosError } = await supabase
                .from("certificados")
                .select("*");

            if (certificadosError) {
                throw new Error(`Erro ao consultar certificados: ${certificadosError.message}`);
            }

            const { data: documentosEmpresaBanco, error: documentosEmpresaError } = await supabase
                .from("documentos_empresas")
                .select("*");

            if (documentosEmpresaError) {
                throw new Error(`Erro ao consultar documentos de empresas: ${documentosEmpresaError.message}`);
            }

            const colaboradoresPorId = colaboradores.reduce((acc, colaborador) => {
                acc[colaborador.id] = colaborador;
                return acc;
            }, {});

            const colaboradoresPorPasta = colaboradores.reduce((acc, colaborador) => {
                try {
                    const pasta = codigoPastaCertificado(colaborador);

                    if (pasta) acc[pasta] = colaborador;
                } catch {
                    // Ignora colaborador sem código válido para pasta.
                }

                return acc;
            }, {});

            const empresasPorId = empresasBanco.reduce((acc, empresa) => {
                acc[empresa.id] = empresa;
                return acc;
            }, {});

            const certificadosPorCaminho = (certificados || []).reduce((acc, item) => {
                const caminhoArquivo = item.url_do_arquivo || item.arquivo_url;
                if (caminhoArquivo) acc[`certificados-treinamentos:${caminhoArquivo}`] = item;
                return acc;
            }, {});

            const documentosEmpresaPorCaminho = (documentosEmpresaBanco || []).reduce((acc, item) => {
                const caminhoArquivo = item.url_do_arquivo || item.arquivo_url;
                if (caminhoArquivo) acc[`documentos-empresas:${caminhoArquivo}`] = item;
                return acc;
            }, {});

            const contratosPorCaminho = empresasBanco.reduce((acc, empresa) => {
                if (empresa.contrato_url) acc[`contratos-empresas:${empresa.contrato_url}`] = empresa;
                return acc;
            }, {});

            const logosPorCaminho = empresasBanco.reduce((acc, empresa) => {
                if (empresa.logo_url) acc[`logos-empresas:${empresa.logo_url}`] = empresa;
                return acc;
            }, {});

            const fotosPorCaminho = colaboradores.reduce((acc, colaborador) => {
                if (colaborador.fotoUrl) acc[`fotos-colaboradores:${colaborador.fotoUrl}`] = colaborador;
                return acc;
            }, {});

            return coletados
                .map((arquivo) => {
                    const partes = arquivo.caminho.split("/");
                    const pasta = partes.length > 1 ? partes.slice(0, -1).join("/") : "";
                    const primeiraPasta = partes[0] || "";
                    const segundaPasta = partes[1] || "";
                    const chave = `${arquivo.bucket}:${arquivo.caminho}`;

                    let emUso = false;
                    let origemRegistro = "";
                    let registroId = "";
                    let colaboradorNome = "";
                    let colaboradorCodigo = "";
                    let colaboradorEmpresa = "";
                    let empresaNome = "";
                    let empresaCnpj = "";
                    let tipoDocumentoEmpresa = "";
                    let treinamentoNome = "";
                    let origemIdentificacao = "";

                    if (arquivo.bucket === "certificados-treinamentos") {
                        const certificadoVinculado = certificadosPorCaminho[chave] || null;
                        const colaboradorVinculado = certificadoVinculado
                            ? colaboradoresPorId[certificadoVinculado.colaborador_id]
                            : null;
                        const colaboradorPelaPasta = colaboradoresPorPasta[primeiraPasta] || null;
                        const colaboradorArquivo = colaboradorVinculado || colaboradorPelaPasta || null;
                        const treinamento = obterTreinamento(Number(segundaPasta));

                        emUso = Boolean(certificadoVinculado);
                        origemRegistro = certificadoVinculado ? "Base de certificados" : colaboradorPelaPasta ? "Pasta do Storage" : "";
                        registroId = certificadoVinculado?.id || "";
                        colaboradorNome = colaboradorArquivo?.nome || "";
                        colaboradorCodigo = colaboradorArquivo?.codigoFuncionario || "";
                        colaboradorEmpresa = colaboradorArquivo?.empresaExibicao || colaboradorArquivo?.empresa || "";
                        treinamentoNome = certificadoVinculado?.nome_treinamento || treinamento?.nome || "";
                        origemIdentificacao = origemRegistro;
                    }

                    if (arquivo.bucket === "documentos-empresas") {
                        const documentoVinculado = documentosEmpresaPorCaminho[chave] || null;
                        const empresaVinculada = documentoVinculado
                            ? empresasPorId[documentoVinculado.empresa_id]
                            : empresasPorId[primeiraPasta];

                        emUso = Boolean(documentoVinculado);
                        origemRegistro = documentoVinculado ? "Base de documentos empresariais" : empresaVinculada ? "Pasta do Storage" : "";
                        registroId = documentoVinculado?.id || "";
                        empresaNome = empresaVinculada?.nome || "";
                        empresaCnpj = empresaVinculada?.cnpj || "";
                        tipoDocumentoEmpresa = documentoVinculado?.tipo_documento || segundaPasta || "";
                        origemIdentificacao = origemRegistro;
                    }

                    if (arquivo.bucket === "contratos-empresas") {
                        const empresaContrato = contratosPorCaminho[chave] || empresasPorId[primeiraPasta];

                        emUso = Boolean(contratosPorCaminho[chave]);
                        origemRegistro = contratosPorCaminho[chave] ? "Cadastro da empresa" : empresaContrato ? "Pasta do Storage" : "";
                        registroId = empresaContrato?.id || "";
                        empresaNome = empresaContrato?.nome || "";
                        empresaCnpj = empresaContrato?.cnpj || "";
                        tipoDocumentoEmpresa = "Contrato da empresa";
                        origemIdentificacao = origemRegistro;
                    }

                    if (arquivo.bucket === "logos-empresas") {
                        const empresaLogo = logosPorCaminho[chave] || empresasPorId[primeiraPasta];

                        emUso = Boolean(logosPorCaminho[chave]);
                        origemRegistro = logosPorCaminho[chave] ? "Cadastro da empresa" : empresaLogo ? "Pasta do Storage" : "";
                        registroId = empresaLogo?.id || "";
                        empresaNome = empresaLogo?.nome || "";
                        empresaCnpj = empresaLogo?.cnpj || "";
                        tipoDocumentoEmpresa = "Logo da empresa";
                        origemIdentificacao = origemRegistro;
                    }

                    if (arquivo.bucket === "fotos-colaboradores") {
                        const colaboradorFoto = fotosPorCaminho[chave] || colaboradoresPorId[primeiraPasta];

                        emUso = Boolean(fotosPorCaminho[chave]);
                        origemRegistro = fotosPorCaminho[chave] ? "Cadastro do colaborador" : colaboradorFoto ? "Pasta do Storage" : "";
                        registroId = colaboradorFoto?.id || "";
                        colaboradorNome = colaboradorFoto?.nome || "";
                        colaboradorCodigo = colaboradorFoto?.codigoFuncionario || "";
                        colaboradorEmpresa = colaboradorFoto?.empresaExibicao || colaboradorFoto?.empresa || "";
                        origemIdentificacao = origemRegistro;
                    }

                    return {
                        ...arquivo,
                        pasta,
                        pastaColaborador: primeiraPasta,
                        pastaTreinamento: segundaPasta,
                        treinamentoNome,
                        colaboradorNome,
                        colaboradorCodigo,
                        colaboradorEmpresa,
                        empresaNome,
                        empresaCnpj,
                        tipoDocumentoEmpresa,
                        origemColaborador: origemIdentificacao,
                        origemRegistro,
                        registroId,
                        emUso,
                    };
                })
                .sort((a, b) =>
                    a.bucket.localeCompare(b.bucket) ||
                    Number(a.emUso) - Number(b.emUso) ||
                    a.caminho.localeCompare(b.caminho)
                );
        } catch (error) {
            setErroBanco(error.message || "Erro ao listar arquivos do Storage.");
            alert(error.message || "Erro ao listar arquivos do Storage.");
            return [];
        }
    }

    async function excluirArquivoCertificadoStorage(arquivo) {
        setErroBanco("");

        if (!arquivo?.caminho) {
            alert("Arquivo inválido para exclusão.");
            return false;
        }

        if (arquivo.emUso) {
            alert(`Este arquivo está em uso em: ${arquivo.origemTipo || arquivo.tabelaOrigem || "base do sistema"}. Para evitar quebrar o histórico, exclua primeiro o registro vinculado.`);
            return false;
        }

        const confirmado = window.confirm(
            `Excluir definitivamente este arquivo do Storage?\n\nBucket: ${arquivo.bucket || "certificados-treinamentos"}\nArquivo: ${arquivo.nome}\nPasta: ${arquivo.pasta || "raiz"}`
        );

        if (!confirmado) return false;

        const { error } = await supabase.storage
            .from(arquivo.bucket || "certificados-treinamentos")
            .remove([arquivo.caminho]);

        if (error) {
            setErroBanco(`Erro ao excluir arquivo do Storage: ${error.message}`);
            alert(`Erro ao excluir arquivo do Storage: ${error.message}`);
            return false;
        }

        await registrarAuditoria("DELETE_STORAGE", arquivo.bucket || "storage", `Excluiu arquivo sem registro do Storage: ${arquivo.nome}`, arquivo.caminho, {
            bucket: arquivo.bucket || "",
            caminho: arquivo.caminho,
            pasta: arquivo.pasta || "",
            nome: arquivo.nome,
            origemTipo: arquivo.origemTipo || "",
            tabelaOrigem: arquivo.tabelaOrigem || "",
            colaboradorNome: arquivo.colaboradorNome || "",
            colaboradorCodigo: arquivo.colaboradorCodigo || "",
            colaboradorEmpresa: arquivo.colaboradorEmpresa || "",
            empresaNome: arquivo.empresaNome || "",
            empresaCnpj: arquivo.empresaCnpj || "",
            tipoDocumentoEmpresa: arquivo.tipoDocumentoEmpresa || "",
        });

        return true;
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

            const treinamentoSemVencimento = treinamentoSemValidade(certificado.treinamentoId);

            if (!treinamentoSemVencimento && !certificado.dataVencimento) {
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
                data_vencimento: treinamentoSemVencimento ? null : certificado.dataVencimento,
                url_do_arquivo: arquivo.arquivoUrl,
                nome_do_arquivo: certificado.arquivoNome || arquivo.arquivoNome,
                observacao: certificado.observacao || null,
                status_validacao: "Validado",
            };

            const { data: existentes, error: buscaError } = await supabase
                .from("certificados")
                .select("*")
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
                .select("*")
                .single();

            if (error) {
                throw new Error(`Erro ao salvar certificado na tabela certificados: ${error.message}`);
            }

            if ((existente?.url_do_arquivo || existente?.arquivo_url) && (existente.url_do_arquivo || existente.arquivo_url) !== arquivo.arquivoUrl) {
                await supabase.storage.from("certificados-treinamentos").remove([(existente.url_do_arquivo || existente.arquivo_url)]);
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
                data_vencimento: datas.vencimento || null,
            })
            .eq("id", certificado.id)
            .select("*")
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

        const timer = window.setTimeout(async () => {
            carregarColaboradores();
            carregarEmailsEnviados();
            carregarAuditoriasCampo();
            registrarAuditoria("ACESSO", "sistema", "Usuário acessou o sistema");

            const autorizadoAuditoria = await verificarAcessoAuditoria();

            if (autorizadoAuditoria) {
                carregarAuditoria();
            }
        }, 0);

        return () => window.clearTimeout(timer);
    }, [usuario, carregarColaboradores, carregarAuditoria, carregarEmailsEnviados, carregarAuditoriasCampo, registrarAuditoria, verificarAcessoAuditoria]);

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
        { id: "aniversariantes", label: "Aniversariantes", icon: CalendarClock },
        { id: "treinamentos", label: "Treinamentos", icon: ClipboardCheck },
        { id: "qr", label: "Consulta QR", icon: QrCode },
        ...(podeAcessarAuditoria ? [{ id: "auditoria", label: "Auditoria", icon: Database }] : []),
        { id: "roteiro", label: "Roteiro", icon: CalendarClock },
    ];

    const selecionarColaborador = (c) => {
        setColaboradorSelecionado(c);
        setTela("qr");
        registrarAuditoria("ACESSO_QR_INTERNO", "colaboradores", `Abriu consulta QR interna de ${c?.nome || "colaborador"}`, c?.id, {
            codigoFuncionario: c?.codigoFuncionario || null,
        });
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
        setAuditoriaLiberada(false);
        setPodeAcessarAuditoria(false);
        try {
            window.sessionStorage.removeItem("auditoriaLiberada");
        } catch {
            // Ignora indisponibilidade do sessionStorage.
        }
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
                                    onClick={() => {
                                        setTela(item.id);
                                        registrarAuditoria("ACESSO_TELA", "navegacao", `Acessou a tela: ${item.label}`);
                                    }}
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
                            onChange={(e) => {
                                setTela(e.target.value);
                                registrarAuditoria("ACESSO_TELA", "navegacao", `Acessou a tela: ${e.target.value}`);
                            }}
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
                        <Dashboard
                            colaboradores={colaboradores}
                            empresasBanco={empresasBanco}
                            documentosEmpresas={documentosEmpresas}
                            auditoria={auditoria}
                            auditoriasCampo={auditoriasCampo}
                            onSelectColab={selecionarColaborador}
                            onRegistrarEmailEnviado={registrarEmailEnviado}
                        />
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

                    {tela === "aniversariantes" && (
                        <Aniversariantes
                            colaboradores={colaboradores}
                            empresasBanco={empresasBanco}
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
                            onRegistrarEmailEnviado={registrarEmailEnviado}
                        />
                    )}

                    {tela === "qr" && (
                        <ConsultaQR
                            colaborador={colaboradorSelecionado}
                            colaboradores={colaboradores}
                            onSelecionarColaborador={setColaboradorSelecionado}
                        />
                    )}

                    {tela === "auditoria" && (
                        verificandoAcessoAuditoria ? (
                            <Card>
                                <div className="flex items-center gap-3 text-sm font-semibold text-slate-600">
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                    Verificando permissão de auditoria...
                                </div>
                            </Card>
                        ) : !podeAcessarAuditoria ? (
                            <AuditoriaAcessoNegado />
                        ) : auditoriaLiberada ? (
                            <RelatorioAuditoria
                                auditoria={auditoria}
                                emailsEnviados={emailsEnviados}
                                carregando={carregandoAuditoria}
                                onAtualizar={async () => { await carregarAuditoria(); await carregarEmailsEnviados(); await carregarAuditoriasCampo(); }}
                                onListarArquivosStorage={listarArquivosCertificadosStorage}
                                onExcluirArquivoStorage={excluirArquivoCertificadoStorage}
                                onListarUsuariosAuditoria={carregarUsuariosAutorizadosAuditoria}
                                onSalvarUsuarioAuditoria={salvarUsuarioAutorizadoAuditoria}
                                onAlternarUsuarioAuditoria={alternarUsuarioAutorizadoAuditoria}
                                onBloquear={bloquearAuditoria}
                            />
                        ) : (
                            <AuditoriaBloqueada onLiberar={liberarAuditoria} />
                        )
                    )}

                    {tela === "roteiro" && <Requisitos />}
                </main>
            </div>
        </div>
    );
}