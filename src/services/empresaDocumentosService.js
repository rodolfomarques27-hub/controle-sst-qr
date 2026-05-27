import { FileText } from "lucide-react";
import { documentosEmpresaBase } from "../constants/sstConstants";
import { statusDocumento } from "./colaboradorDocumentosService";

export function obterDocumentoEmpresa(tipo) {
    return documentosEmpresaBase.find((d) => d.tipo === tipo) || documentosEmpresaBase[0];
}

export function calcularVencimentoDocumento(tipo, dataEmissao) {
    const documento = obterDocumentoEmpresa(tipo);

    if (!dataEmissao || !documento.validadePadraoDias) return "";

    const data = new Date(`${dataEmissao}T12:00:00`);
    data.setDate(data.getDate() + documento.validadePadraoDias);
    return data.toISOString().slice(0, 10);
}

export function normalizarDocumentoEmpresa(item) {
    return {
        ...item,
        arquivo_url: item.arquivo_url || item.url_do_arquivo || "",
        arquivo_nome: item.arquivo_nome || item.nome_do_arquivo || "",
        url_do_arquivo: item.url_do_arquivo || item.arquivo_url || "",
        nome_do_arquivo: item.nome_do_arquivo || item.arquivo_nome || "",
    };
}

export function statusEmpresaDocumento(dataVencimento) {
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

export function calcularSituacaoDocumentalEmpresa(docs = []) {
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

export function normalizarStatusEmpresa(status) {
    if (!status || status === "Ativa" || status === "Empresa ativa") return "Empresa ativa";
    if (status === "Inativa" || status === "Empresa inativa") return "Empresa inativa";
    if (status === "Inapta" || status === "Empresa inapta") return "Empresa inapta";
    if (status === "Bloqueada" || status === "Suspensa" || status === "Empresa suspensa") return "Empresa suspensa";
    return status;
}

export function classeStatusEmpresa(status) {
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
