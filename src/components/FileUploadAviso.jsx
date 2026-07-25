import React from "react";
import {
    UPLOAD_BLOQUEAR_ACIMA_5MB,
    UPLOAD_LIMITE_FORTE_MB,
    UPLOAD_MENSAGEM_ARQUIVO_GRANDE,
    UPLOAD_MENSAGEM_IMAGEM_OTIMIZAVEL,
    UPLOAD_MENSAGEM_PDF_GRANDE,
    perfisUpload,
} from "../constants/sistemaConstants";
import { classNames, formatarBytes } from "../utils/sstUtils";

function obterPerfilUpload(tipo = "documentoSimples") {
    return perfisUpload[tipo] || perfisUpload.documentoSimples;
}

function arquivoEhImagem(arquivo) {
    return String(arquivo?.type || "").toLowerCase().startsWith("image/");
}

function arquivoEhPdf(arquivo) {
    const tipo = String(arquivo?.type || "").toLowerCase();
    const nome = String(arquivo?.name || "").toLowerCase();
    return tipo === "application/pdf" || nome.endsWith(".pdf");
}

function mensagemArquivoGrande(arquivo) {
    if (arquivoEhImagem(arquivo)) return UPLOAD_MENSAGEM_IMAGEM_OTIMIZAVEL;
    if (arquivoEhPdf(arquivo)) return UPLOAD_MENSAGEM_PDF_GRANDE || UPLOAD_MENSAGEM_ARQUIVO_GRANDE;
    return UPLOAD_MENSAGEM_ARQUIVO_GRANDE;
}

export function analisarTamanhoArquivoUpload(arquivo, tipo = "documentoSimples") {
    if (!arquivo) {
        return {
            ok: true,
            nivel: "vazio",
            texto: "Nenhum arquivo selecionado.",
            classe: "bg-slate-50 text-slate-500 ring-slate-200",
        };
    }

    const perfil = obterPerfilUpload(tipo);
    const limiteForteMb = Number(perfil.limiteForteMb || UPLOAD_LIMITE_FORTE_MB);
    const tamanho = Number(arquivo.size || 0);
    const imagem = arquivoEhImagem(arquivo);
    const acimaForte = tamanho > perfil.limiteForteBytes;
    const acimaIdeal = tamanho > perfil.limiteIdealBytes;
    const mensagemGrande = mensagemArquivoGrande(arquivo);

    if (acimaForte) {
        if (imagem) {
            return {
                ok: true,
                nivel: "otimizavel",
                texto: `${perfil.rotulo}: ${formatarBytes(tamanho)}. Acima de ${limiteForteMb} MB, mas será tentada redução automática antes do upload. ${mensagemGrande}`,
                classe: "bg-blue-50 text-blue-700 ring-blue-200",
            };
        }

        return {
            ok: !UPLOAD_BLOQUEAR_ACIMA_5MB,
            nivel: UPLOAD_BLOQUEAR_ACIMA_5MB ? "bloqueado" : "critico",
            texto: `${perfil.rotulo}: ${formatarBytes(tamanho)}. Acima de ${limiteForteMb} MB. ${mensagemGrande}`,
            classe: "bg-red-50 text-red-700 ring-red-200",
        };
    }

    if (acimaIdeal) {
        return {
            ok: true,
            nivel: imagem ? "otimizavel" : "atencao",
            texto: `${perfil.rotulo}: ${formatarBytes(tamanho)}. Recomendado: ${perfil.recomendacao}. ${mensagemGrande}`,
            classe: imagem ? "bg-blue-50 text-blue-700 ring-blue-200" : "bg-orange-50 text-orange-700 ring-orange-200",
        };
    }

    return {
        ok: true,
        nivel: "normal",
        texto: `${perfil.rotulo}: ${formatarBytes(tamanho)}. Dentro do recomendado (${perfil.recomendacao}).`,
        classe: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    };
}

export function validarArquivoAntesUpload(arquivo, tipo = "documentoSimples") {
    const analise = analisarTamanhoArquivoUpload(arquivo, tipo);

    if (!analise.ok) {
        alert(analise.texto);
        return false;
    }

    return true;
}

export function validarListaArquivosAntesUpload(arquivos = [], tipo = "documentoSimples") {
    return Array.from(arquivos || []).every((arquivo) => validarArquivoAntesUpload(arquivo, tipo));
}

export function FileUploadAviso({ arquivo, arquivos, tipo = "documentoSimples" }) {
    const lista = arquivos ? Array.from(arquivos || []) : arquivo ? [arquivo] : [];

    if (!lista.length) return null;

    return (
        <div className="mt-2 w-full space-y-1">
            {lista.slice(0, 6).map((item) => {
                const analise = analisarTamanhoArquivoUpload(item, tipo);

                return (
                    <div key={`${item.name}-${item.size}`} className={classNames("w-full rounded-xl px-3 py-2 text-[11px] ring-1", analise.classe)}>
                        <strong className="break-words">{item.name}</strong> · {formatarBytes(item.size)}
                        <br />
                        {analise.texto}
                    </div>
                );
            })}
            {lista.length > 6 && (
                <div className="w-full rounded-xl bg-slate-50 px-3 py-2 text-[11px] text-slate-500 ring-1 ring-slate-200">
                    + {lista.length - 6} arquivo(s) selecionado(s). A validação será feita antes do upload.
                </div>
            )}
        </div>
    );
}
