import { documentosEmpresaBase } from "../constants/sstConstants";

const DIAS_ALERTA_DOCUMENTO_EMPRESA = 30;
const UM_DIA_MS = 1000 * 60 * 60 * 24;

function normalizarTexto(valor = "") {
    return String(valor || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase();
}

function pad2(valor) {
    return String(valor).padStart(2, "0");
}

function montarIsoSeguro(ano, mes, dia) {
    const anoNumero = Number(ano);
    const mesNumero = Number(mes);
    const diaNumero = Number(dia);

    if (!Number.isInteger(anoNumero) || !Number.isInteger(mesNumero) || !Number.isInteger(diaNumero)) return "";
    if (anoNumero < 1900 || anoNumero > 2100) return "";
    if (mesNumero < 1 || mesNumero > 12) return "";
    if (diaNumero < 1 || diaNumero > 31) return "";

    const data = new Date(Date.UTC(anoNumero, mesNumero - 1, diaNumero, 12, 0, 0));

    if (Number.isNaN(data.getTime())) return "";
    if (data.getUTCFullYear() !== anoNumero) return "";
    if (data.getUTCMonth() !== mesNumero - 1) return "";
    if (data.getUTCDate() !== diaNumero) return "";

    return `${anoNumero}-${pad2(mesNumero)}-${pad2(diaNumero)}`;
}

export function normalizarDataDocumentoEmpresa(valor) {
    if (!valor) return "";

    if (valor instanceof Date) {
        if (Number.isNaN(valor.getTime())) return "";
        return montarIsoSeguro(valor.getFullYear(), valor.getMonth() + 1, valor.getDate());
    }

    const texto = String(valor || "").trim();
    if (!texto) return "";

    const somenteData = texto.slice(0, 10);
    const iso = somenteData.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso) return montarIsoSeguro(iso[1], iso[2], iso[3]);

    const br = texto.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
    if (br) return montarIsoSeguro(br[3], br[2], br[1]);

    const data = new Date(texto);
    if (Number.isNaN(data.getTime())) return "";

    return montarIsoSeguro(data.getFullYear(), data.getMonth() + 1, data.getDate());
}

function dataIsoParaUtcMeioDia(dataIso = "") {
    const dataNormalizada = normalizarDataDocumentoEmpresa(dataIso);
    if (!dataNormalizada) return null;

    const [ano, mes, dia] = dataNormalizada.split("-").map(Number);
    const data = new Date(Date.UTC(ano, mes - 1, dia, 12, 0, 0));

    return Number.isNaN(data.getTime()) ? null : data;
}

function hojeIsoDocumentoEmpresa() {
    const agora = new Date();
    return montarIsoSeguro(agora.getFullYear(), agora.getMonth() + 1, agora.getDate());
}

function somarDiasDataIso(dataIso = "", dias = 0) {
    const data = dataIsoParaUtcMeioDia(dataIso);
    const diasNumero = Number(dias);

    if (!data || !Number.isFinite(diasNumero)) return "";

    data.setUTCDate(data.getUTCDate() + Math.round(diasNumero));

    return montarIsoSeguro(data.getUTCFullYear(), data.getUTCMonth() + 1, data.getUTCDate());
}

function diferencaDiasDataIso(dataInicialIso = "", dataFinalIso = "") {
    const inicial = dataIsoParaUtcMeioDia(dataInicialIso);
    const final = dataIsoParaUtcMeioDia(dataFinalIso);

    if (!inicial || !final) return null;

    return Math.round((final.getTime() - inicial.getTime()) / UM_DIA_MS);
}

export function obterDocumentoEmpresaBase(tipo = "") {
    const tipoNormalizado = normalizarTexto(tipo);

    return documentosEmpresaBase.find((documento) => {
        return normalizarTexto(documento.tipo) === tipoNormalizado || normalizarTexto(documento.nome) === tipoNormalizado;
    }) || null;
}

export function calcularVencimentoDocumento(tipo = "", dataEmissao = "") {
    const dataEmissaoIso = normalizarDataDocumentoEmpresa(dataEmissao);
    const documentoBase = obterDocumentoEmpresaBase(tipo);
    const validadeDias = Number(documentoBase?.validadePadraoDias);

    if (!dataEmissaoIso || !Number.isFinite(validadeDias) || validadeDias <= 0) {
        return "";
    }

    return somarDiasDataIso(dataEmissaoIso, validadeDias);
}

export function statusEmpresaDocumento(dataVencimento = "") {
    const vencimentoIso = normalizarDataDocumentoEmpresa(dataVencimento);

    if (!vencimentoIso) {
        return {
            chave: "pendente",
            texto: "Pendente",
            classe: "bg-slate-50 text-slate-700 ring-slate-200",
            detalhe: "Documento sem data de revisão ou vencimento definida.",
            dias: null,
        };
    }

    const hojeIso = hojeIsoDocumentoEmpresa();
    const dias = diferencaDiasDataIso(hojeIso, vencimentoIso);

    if (dias === null) {
        return {
            chave: "pendente",
            texto: "Pendente",
            classe: "bg-slate-50 text-slate-700 ring-slate-200",
            detalhe: "Não foi possível calcular o status da data informada.",
            dias: null,
        };
    }

    if (dias < 0) {
        return {
            chave: "vencido",
            texto: "Vencido",
            classe: "bg-red-50 text-red-700 ring-red-200",
            detalhe: `Documento vencido há ${Math.abs(dias)} dia(s).`,
            dias,
        };
    }

    if (dias <= DIAS_ALERTA_DOCUMENTO_EMPRESA) {
        return {
            chave: "vencendo",
            texto: "A vencer",
            classe: "bg-amber-50 text-amber-700 ring-amber-200",
            detalhe: `Documento vence em ${dias} dia(s).`,
            dias,
        };
    }

    return {
        chave: "em_dia",
        texto: "Em dia",
        classe: "bg-emerald-50 text-emerald-700 ring-emerald-200",
        detalhe: `Documento em dia. Próxima revisão em ${dias} dia(s).`,
        dias,
    };
}

export function normalizarStatusEmpresa(status = "") {
    const texto = String(status || "").trim();
    const chave = normalizarTexto(texto);

    if (["ativa", "ativo", "empresa ativa", "liberada", "liberado"].includes(chave)) return "Ativa";
    if (["inativa", "inativo", "desativada", "desativado"].includes(chave)) return "Inativa";
    if (["bloqueada", "bloqueado", "suspensa", "suspenso"].includes(chave)) return "Bloqueada";
    if (["com pendencia", "com pendência", "pendente", "pendencia", "pendência"].includes(chave)) return "Com pendência";
    if (["em analise", "em análise", "analise", "análise"].includes(chave)) return "Em análise";

    return texto || "Ativa";
}

export function classeStatusEmpresa(status = "") {
    const normalizado = normalizarStatusEmpresa(status);

    if (normalizado === "Ativa") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    if (normalizado === "Com pendência") return "bg-amber-50 text-amber-700 ring-amber-200";
    if (normalizado === "Bloqueada") return "bg-red-50 text-red-700 ring-red-200";
    if (normalizado === "Em análise") return "bg-blue-50 text-blue-700 ring-blue-200";
    if (normalizado === "Inativa") return "bg-slate-50 text-slate-600 ring-slate-200";

    return "bg-slate-50 text-slate-700 ring-slate-200";
}

export function calcularSituacaoDocumentalEmpresa(documentos = []) {
    const listaDocumentos = Array.isArray(documentos) ? documentos : [];
    const tiposObrigatorios = documentosEmpresaBase.map((documento) => documento.tipo);

    const pendentes = [];
    const vencidos = [];
    const vencendo = [];
    const emDia = [];

    tiposObrigatorios.forEach((tipo) => {
        const documento = listaDocumentos.find((item) => String(item?.tipo_documento || item?.tipoDocumento || "") === String(tipo));

        if (!documento) {
            pendentes.push(tipo);
            return;
        }

        const status = statusEmpresaDocumento(documento.data_vencimento || documento.dataVencimento);

        if (status.chave === "vencido") {
            vencidos.push(tipo);
            return;
        }

        if (status.chave === "vencendo") {
            vencendo.push(tipo);
            return;
        }

        if (status.chave === "pendente") {
            pendentes.push(tipo);
            return;
        }

        emDia.push(tipo);
    });

    if (vencidos.length) {
        return {
            chave: "vencido",
            texto: "Com vencidos",
            classe: "bg-red-50 text-red-700 ring-red-200",
            detalhe: `Documento(s) vencido(s): ${vencidos.join(", ")}.`,
            pendentes,
            vencidos,
            vencendo,
            emDia,
        };
    }

    if (pendentes.length) {
        return {
            chave: "pendente",
            texto: "Com pendência",
            classe: "bg-amber-50 text-amber-700 ring-amber-200",
            detalhe: `Documento(s) pendente(s): ${pendentes.join(", ")}.`,
            pendentes,
            vencidos,
            vencendo,
            emDia,
        };
    }

    if (vencendo.length) {
        return {
            chave: "vencendo",
            texto: "A vencer",
            classe: "bg-orange-50 text-orange-700 ring-orange-200",
            detalhe: `Documento(s) próximo(s) do vencimento: ${vencendo.join(", ")}.`,
            pendentes,
            vencidos,
            vencendo,
            emDia,
        };
    }

    return {
        chave: "em_dia",
        texto: "Sem pendência",
        classe: "bg-emerald-50 text-emerald-700 ring-emerald-200",
        detalhe: "Todos os documentos obrigatórios da empresa estão cadastrados e em dia.",
        pendentes,
        vencidos,
        vencendo,
        emDia,
    };
}

export function normalizarDocumentoEmpresa(item = {}) {
    const dataEmissao = normalizarDataDocumentoEmpresa(item.data_emissao || item.dataEmissao);
    const dataVencimento = normalizarDataDocumentoEmpresa(item.data_vencimento || item.dataVencimento);
    const arquivoUrl = item.url_do_arquivo || item.arquivo_url || item.arquivoUrl || "";
    const arquivoNome = item.nome_do_arquivo || item.arquivo_nome || item.arquivoNome || "";

    return {
        ...item,
        id: item.id || "",
        empresa_id: item.empresa_id || item.empresaId || "",
        empresaId: item.empresa_id || item.empresaId || "",
        tipo_documento: item.tipo_documento || item.tipoDocumento || item.tipo || "",
        tipoDocumento: item.tipo_documento || item.tipoDocumento || item.tipo || "",
        data_emissao: dataEmissao,
        dataEmissao,
        data_vencimento: dataVencimento,
        dataVencimento,
        url_do_arquivo: arquivoUrl,
        arquivo_url: arquivoUrl,
        arquivoUrl,
        nome_do_arquivo: arquivoNome,
        arquivo_nome: arquivoNome,
        arquivoNome,
        observacao: item.observacao || "",
        status_validacao: item.status_validacao || item.statusValidacao || "Pendente de verificação",
        statusValidacao: item.status_validacao || item.statusValidacao || "Pendente de verificação",
        created_at: item.created_at || item.createdAt || "",
        updated_at: item.updated_at || item.updatedAt || "",
    };
}

export default {
    normalizarDataDocumentoEmpresa,
    obterDocumentoEmpresaBase,
    calcularVencimentoDocumento,
    statusEmpresaDocumento,
    calcularSituacaoDocumentalEmpresa,
    normalizarStatusEmpresa,
    classeStatusEmpresa,
    normalizarDocumentoEmpresa,
};
