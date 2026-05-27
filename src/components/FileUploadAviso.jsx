import React from "react";
import {
    UPLOAD_BLOQUEAR_ACIMA_5MB,
    UPLOAD_LIMITE_FORTE_MB,
    UPLOAD_MENSAGEM_ARQUIVO_GRANDE,
    perfisUpload,
} from "../constants/sstConstants";
import { classNames, formatarBytes } from "../utils/sstUtils";

function obterPerfilUpload(tipo = "documentoSimples") {
    return perfisUpload[tipo] || perfisUpload.documentoSimples;
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
