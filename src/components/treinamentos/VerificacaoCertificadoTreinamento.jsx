/* eslint-disable no-unused-vars */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    AlertTriangle,
    ChevronDown,
    ChevronUp,
    RefreshCw,
    ShieldCheck,
} from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { obterUltimaVerificacaoDocumental } from "../../services/documentosVerificacaoService";
import { formatDate } from "../../utils/sstUtils";
import ResultadoVerificacaoDocumento from "../documentos/ResultadoVerificacaoDocumento";

const ORIGEM_TIPO_CERTIFICADO = "certificado";
const ORIGEM_TABELA_CERTIFICADOS = "certificados";

function obterIdCertificado(certificado = {}) {
    return certificado.id ||
        certificado.certificado_id ||
        certificado.certificadoId ||
        certificado.documento_id ||
        certificado.documentoId ||
        "";
}

function obterStatusValidacaoCertificado(certificado = {}) {
    return certificado.statusValidacao ||
        certificado.status_validacao ||
        certificado.statusVerificacao ||
        certificado.status_verificacao ||
        "Pendente de verificação";
}

function normalizarStatusPainel(status = "") {
    return String(status || "Pendente de verificação").trim();
}

function obterClassesStatus(status = "") {
    const normalizado = normalizarStatusPainel(status).toLowerCase();

    if (normalizado.includes("aprovado")) {
        return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    }

    if (normalizado.includes("atenção") || normalizado.includes("atencao") || normalizado.includes("revisão") || normalizado.includes("revisao")) {
        return "bg-amber-50 text-amber-700 ring-amber-200";
    }

    if (normalizado.includes("suspeito") || normalizado.includes("bloqueado") || normalizado.includes("erro")) {
        return "bg-red-50 text-red-700 ring-red-200";
    }

    return "bg-slate-100 text-slate-600 ring-slate-200";
}

function obterClassesRisco(nivelRisco = "") {
    const normalizado = String(nivelRisco || "").trim().toLowerCase();

    if (normalizado.includes("baixo")) {
        return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    }

    if (normalizado.includes("médio") || normalizado.includes("medio") || normalizado.includes("moderado")) {
        return "bg-amber-50 text-amber-700 ring-amber-200";
    }

    if (normalizado.includes("alto") || normalizado.includes("crítico") || normalizado.includes("critico")) {
        return "bg-red-50 text-red-700 ring-red-200";
    }

    return "bg-slate-100 text-slate-600 ring-slate-200";
}

function ResumoVerificacaoCertificado({ verificacao = null, statusCertificado = "" }) {
    const statusExibicao = verificacao?.statusVerificacao || statusCertificado;
    const nivelRisco = verificacao?.nivelRisco || "Aguardando análise";
    const scoreRisco = verificacao?.scoreRisco ?? null;
    const totalIndicios = Array.isArray(verificacao?.indicios) ? verificacao.indicios.length : 0;

    return (
        <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wide ring-1 ${obterClassesStatus(statusExibicao)}`}>
                {normalizarStatusPainel(statusExibicao)}
            </span>

            {verificacao && (
                <>
                    <span className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wide ring-1 ${obterClassesRisco(nivelRisco)}`}>
                        Risco: {nivelRisco || "Não informado"}
                    </span>

                    <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black uppercase tracking-wide text-slate-600 ring-1 ring-slate-200">
                        Score: {scoreRisco ?? 0}
                    </span>

                    <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black uppercase tracking-wide text-slate-600 ring-1 ring-slate-200">
                        {totalIndicios} indício(s)
                    </span>
                </>
            )}
        </div>
    );
}

export function VerificacaoCertificadoTreinamento({ certificado = {} }) {
    const [aberto, setAberto] = useState(false);
    const [carregando, setCarregando] = useState(false);
    const [erro, setErro] = useState("");
    const [verificacao, setVerificacao] = useState(null);

    const certificadoId = useMemo(() => obterIdCertificado(certificado), [certificado]);
    const statusCertificado = useMemo(() => obterStatusValidacaoCertificado(certificado), [certificado]);

    const carregarVerificacao = useCallback(async () => {
        if (!certificadoId) {
            setVerificacao(null);
            setErro("Certificado sem ID para consultar a verificação documental.");
            return;
        }

        setCarregando(true);
        setErro("");

        try {
            const resultado = await obterUltimaVerificacaoDocumental({
                supabase,
                origemTipo: ORIGEM_TIPO_CERTIFICADO,
                origemTabela: ORIGEM_TABELA_CERTIFICADOS,
                documentoId: certificadoId,
            });

            setVerificacao(resultado);
        } catch (error) {
            setVerificacao(null);
            setErro(error?.message || "Erro ao carregar a verificação documental do certificado.");
        } finally {
            setCarregando(false);
        }
    }, [certificadoId]);

    useEffect(() => {
        if (!aberto) return;
        carregarVerificacao();
    }, [aberto, carregarVerificacao]);

    const alternarPainel = () => {
        setAberto((atual) => !atual);
    };

    return (
        <div className="rounded-2xl border border-blue-100 bg-white p-3 shadow-sm">
            <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-blue-600" />
                        <p className="text-xs font-black uppercase tracking-wide text-blue-700">
                            Verificação documental
                        </p>
                    </div>

                    <div className="mt-2">
                        <ResumoVerificacaoCertificado
                            verificacao={verificacao}
                            statusCertificado={statusCertificado}
                        />
                    </div>

                    {verificacao?.createdAt && (
                        <p className="mt-2 text-[11px] font-semibold text-slate-400">
                            Última análise: {formatDate(verificacao.createdAt)}
                        </p>
                    )}
                </div>

                <div className="flex flex-wrap gap-2 lg:justify-end">
                    {aberto && (
                        <button
                            type="button"
                            onClick={carregarVerificacao}
                            disabled={carregando}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 ring-1 ring-blue-200 hover:bg-blue-100 disabled:opacity-60"
                        >
                            <RefreshCw className={`h-4 w-4 ${carregando ? "animate-spin" : ""}`} />
                            Atualizar
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={alternarPainel}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800"
                    >
                        {aberto ? (
                            <>
                                <ChevronUp className="h-4 w-4" />
                                Recolher verificação
                            </>
                        ) : (
                            <>
                                <ChevronDown className="h-4 w-4" />
                                Abrir verificação
                            </>
                        )}
                    </button>
                </div>
            </div>

            {aberto && (
                <div className="mt-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
                    {carregando && (
                        <div className="rounded-2xl border border-dashed border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">
                            Carregando resultado da verificação documental...
                        </div>
                    )}

                    {!carregando && erro && (
                        <div className="flex gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                            <span>{erro}</span>
                        </div>
                    )}

                    {!carregando && !erro && !verificacao && (
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-600">
                            Nenhum resultado de verificação documental foi localizado para este certificado.
                            Salve ou reenvie o certificado para que a análise local seja registrada na tabela verificacoes_documentais.
                        </div>
                    )}

                    {!carregando && !erro && verificacao && (
                        ResultadoVerificacaoDocumento ? (
                            <ResultadoVerificacaoDocumento
                                resultado={verificacao}
                                verificacao={verificacao}
                                documento={certificado}
                                origemTipo={ORIGEM_TIPO_CERTIFICADO}
                                origemTabela={ORIGEM_TABELA_CERTIFICADOS}
                                compacto={false}
                                modoCompacto={false}
                            />
                        ) : (
                            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                                <p className="font-bold text-slate-900">{verificacao.resumo || "Verificação documental carregada."}</p>

                                {Array.isArray(verificacao.indicios) && verificacao.indicios.length > 0 && (
                                    <ul className="mt-3 list-disc space-y-1 pl-5">
                                        {verificacao.indicios.map((indicio, indice) => (
                                            <li key={`${indicio.codigo || indicio.titulo || "indicio"}-${indice}`}>
                                                {indicio.titulo || indicio.detalhe || "Indício identificado"}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )
                    )}
                </div>
            )}
        </div>
    );
}
