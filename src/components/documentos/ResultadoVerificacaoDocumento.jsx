import React, { useMemo, useState } from "react";
import {
    AlertTriangle,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Clock,
    FileText,
    ShieldAlert,
    ShieldCheck,
    Sparkles,
    XCircle,
} from "lucide-react";

const STATUS_CONFIG = {
    aprovado: {
        texto: "Aprovado",
        classe: "bg-emerald-50 text-emerald-700 ring-emerald-200",
        icone: CheckCircle2,
    },
    atencao: {
        texto: "Atenção",
        classe: "bg-amber-50 text-amber-700 ring-amber-200",
        icone: AlertTriangle,
    },
    revisao_manual: {
        texto: "Revisão manual",
        classe: "bg-orange-50 text-orange-700 ring-orange-200",
        icone: ShieldAlert,
    },
    suspeito: {
        texto: "Suspeito",
        classe: "bg-red-50 text-red-700 ring-red-200",
        icone: ShieldAlert,
    },
    bloqueado: {
        texto: "Bloqueado",
        classe: "bg-red-100 text-red-800 ring-red-300",
        icone: XCircle,
    },
    pendente: {
        texto: "Pendente",
        classe: "bg-slate-50 text-slate-700 ring-slate-200",
        icone: Clock,
    },
    erro: {
        texto: "Erro na verificação",
        classe: "bg-red-50 text-red-700 ring-red-200",
        icone: XCircle,
    },
};

const RISCO_CONFIG = {
    baixo: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    medio: "bg-amber-50 text-amber-700 ring-amber-200",
    alto: "bg-orange-50 text-orange-700 ring-orange-200",
    critico: "bg-red-50 text-red-700 ring-red-200",
    nao_avaliado: "bg-slate-50 text-slate-700 ring-slate-200",
};

function normalizarTexto(valor) {
    return String(valor || "").trim();
}

function normalizarLista(valor) {
    if (Array.isArray(valor)) return valor;

    if (typeof valor === "string") {
        try {
            const convertido = JSON.parse(valor);
            return Array.isArray(convertido) ? convertido : [];
        } catch {
            return valor.trim() ? [valor.trim()] : [];
        }
    }

    return [];
}

function normalizarObjeto(valor) {
    if (!valor) return null;

    if (typeof valor === "object") return valor;

    if (typeof valor === "string") {
        try {
            const convertido = JSON.parse(valor);
            return convertido && typeof convertido === "object" ? convertido : null;
        } catch {
            return null;
        }
    }

    return null;
}

function limitarTextoPainel(valor = "", limite = 900) {
    const texto = normalizarTexto(valor);

    if (texto.length <= limite) return texto;

    return `${texto.slice(0, limite)}...`;
}

function textoParecePdfBrutoPainel(valor = "") {
    const texto = String(valor || "");
    const amostra = texto.slice(0, 5000);

    if (!amostra) return false;

    const marcadores = [
        /%PDF-\d/i,
        /\/BitsPerComponent\b/i,
        /\/DCTDecode\b/i,
        /\/Subtype\s*\/Image\b/i,
        /\/XObject\b/i,
        /stream\s+[\s\S]{0,80}?(?:�|JFIF|Exif)/i,
        /endstream\s+endobj/i,
    ];

    const quantidadeEstranha = (amostra.match(/[�\uFFFD]/g) || []).length;
    const proporcaoEstranha = quantidadeEstranha / Math.max(1, amostra.length);

    return marcadores.some((regex) => regex.test(amostra)) || proporcaoEstranha > 0.025;
}

function obterTextoOcrPainel(valor = "") {
    const texto = normalizarTexto(valor);

    if (!texto || textoParecePdfBrutoPainel(texto)) return "";

    return texto;
}

function obterLeituraDocumentalLocal(retornoIa) {
    const objeto = normalizarObjeto(retornoIa);

    return objeto?.leitura_documental_local || objeto?.ocr_local || null;
}

function formatarTipoLeitura(tipo = "") {
    const chave = String(tipo || "").trim().toLowerCase();

    if (chave === "pdf_texto_local") return "PDF com texto local";
    if (chave === "pdf_sem_texto_legivel") return "PDF sem texto confiável";
    if (chave === "imagem_dependente_ocr") return "Imagem depende de OCR";
    if (chave === "nome_arquivo") return "Nome do arquivo";
    if (chave === "sem_arquivo_local") return "Sem arquivo local";
    if (chave === "erro_leitura_local") return "Erro na leitura local";

    return chave || "Não informado";
}

function obterTituloIndicio(indicio) {
    if (!indicio) return "Indício sem descrição";
    if (typeof indicio === "string") return indicio;
    return indicio.titulo || indicio.codigo || "Indício identificado";
}

function obterDetalheIndicio(indicio) {
    if (!indicio || typeof indicio === "string") return "";
    return indicio.detalhe || indicio.recomendacao || "";
}

function obterTextoRecomendacao(recomendacao) {
    if (typeof recomendacao === "string") return recomendacao;
    return recomendacao?.texto || recomendacao?.titulo || "Revisar manualmente o documento.";
}

function formatarStatus(status) {
    const chave = String(status || "pendente").trim().toLowerCase();
    return STATUS_CONFIG[chave] || STATUS_CONFIG.pendente;
}

function formatarRisco(risco) {
    const chave = String(risco || "nao_avaliado").trim().toLowerCase();

    if (chave === "nao_avaliado") return "Não avaliado";
    if (chave === "medio") return "Médio";
    if (chave === "critico") return "Crítico";

    return chave ? chave.charAt(0).toUpperCase() + chave.slice(1) : "Não avaliado";
}

function formatarData(data) {
    if (!data) return "";

    const texto = String(data).trim();
    const somenteData = texto.slice(0, 10);
    const partes = somenteData.split("-");

    if (partes.length === 3) {
        return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }

    return texto;
}

function obterResumoCurto(resumo, statusTexto, riscoTexto, score) {
    if (resumo) return resumo;
    return `Status ${statusTexto.toLowerCase()}, risco ${riscoTexto.toLowerCase()} e score ${score}/100.`;
}

function DetalhesVerificacao({ dados, resumoCurto }) {
    return (
        <div className="mt-4 space-y-3">
            <div className="rounded-xl bg-slate-50 p-3 text-sm leading-relaxed text-slate-700 ring-1 ring-slate-100">
                {resumoCurto}
            </div>

            {(dados.tipoDocumento || dados.arquivoNome) && (
                <div className="rounded-xl bg-white p-3 text-xs text-slate-500 ring-1 ring-slate-100">
                    <strong className="text-slate-700">Documento:</strong> {dados.tipoDocumento || "Documento"}
                    {dados.arquivoNome ? ` • ${dados.arquivoNome}` : ""}
                </div>
            )}

            {(dados.ocrTexto || dados.leituraDocumentalLocal) && (
                <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3">
                    <h4 className="text-xs font-bold uppercase tracking-wide text-blue-700">
                        Leitura local / OCR documental
                    </h4>

                    {dados.leituraDocumentalLocal && (
                        <div className="mt-3 grid gap-2 text-xs text-blue-900 sm:grid-cols-3">
                            <div className="rounded-lg bg-white/80 p-2 ring-1 ring-blue-100">
                                <strong className="block text-blue-700">Tipo</strong>
                                {formatarTipoLeitura(dados.leituraDocumentalLocal.tipo_leitura || dados.leituraDocumentalLocal.tipoLeitura)}
                            </div>
                            <div className="rounded-lg bg-white/80 p-2 ring-1 ring-blue-100">
                                <strong className="block text-blue-700">Confiança</strong>
                                {Number(dados.leituraDocumentalLocal.confianca || 0)}/100
                            </div>
                            <div className="rounded-lg bg-white/80 p-2 ring-1 ring-blue-100">
                                <strong className="block text-blue-700">Datas lidas</strong>
                                {(dados.leituraDocumentalLocal.datas_encontradas || dados.leituraDocumentalLocal.datasEncontradas || []).length || 0}
                            </div>
                        </div>
                    )}

                    {dados.leituraDocumentalLocal?.resumo && (
                        <p className="mt-3 rounded-lg bg-white/80 p-2 text-xs leading-relaxed text-blue-900 ring-1 ring-blue-100">
                            {dados.leituraDocumentalLocal.resumo}
                        </p>
                    )}

                    {dados.ocrTexto && (
                        <p className="mt-3 rounded-lg bg-white p-3 text-xs leading-relaxed text-slate-600 ring-1 ring-blue-100">
                            {limitarTextoPainel(dados.ocrTexto)}
                        </p>
                    )}

                    {dados.ocrTextoOculto && (
                        <p className="mt-3 rounded-lg bg-white p-3 text-xs leading-relaxed text-blue-900 ring-1 ring-blue-100">
                            O texto bruto do PDF não foi exibido porque aparenta ser código interno do arquivo, imagem embutida ou conteúdo binário. A leitura será tratada como não confiável para comparação automática de datas.
                        </p>
                    )}

                    {Array.isArray(dados.leituraDocumentalLocal?.avisos) && dados.leituraDocumentalLocal.avisos.length > 0 && (
                        <ul className="mt-3 space-y-1 text-xs text-blue-900">
                            {dados.leituraDocumentalLocal.avisos.map((aviso, indice) => (
                                <li key={`${aviso}-${indice}`} className="rounded-lg bg-white/80 px-2 py-1 ring-1 ring-blue-100">
                                    {aviso}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}

            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Indícios encontrados
                </h4>

                {dados.indicios.length > 0 ? (
                    <div className="mt-3 space-y-2">
                        {dados.indicios.map((indicio, indice) => (
                            <div
                                key={`${obterTituloIndicio(indicio)}-${indice}`}
                                className="rounded-lg bg-white p-3 text-sm text-slate-700 ring-1 ring-slate-100"
                            >
                                <p className="font-semibold text-slate-900">
                                    {obterTituloIndicio(indicio)}
                                </p>
                                {obterDetalheIndicio(indicio) && (
                                    <p className="mt-1 text-xs text-slate-500">
                                        {obterDetalheIndicio(indicio)}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="mt-3 text-sm text-slate-600">
                        Nenhum indício relevante encontrado pelas regras locais.
                    </p>
                )}
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Recomendações
                </h4>

                {dados.recomendacoes.length > 0 ? (
                    <ul className="mt-3 space-y-2 text-sm text-slate-700">
                        {dados.recomendacoes.map((recomendacao, indice) => (
                            <li
                                key={`${obterTextoRecomendacao(recomendacao)}-${indice}`}
                                className="rounded-lg bg-white p-3 ring-1 ring-slate-100"
                            >
                                {obterTextoRecomendacao(recomendacao)}
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="mt-3 text-sm text-slate-600">
                        Nenhuma recomendação adicional registrada.
                    </p>
                )}
            </div>

            <p className="text-xs text-slate-400">
                A análise indica inconsistências e indícios. O sistema não confirma falsificação automaticamente.
            </p>
        </div>
    );
}

export default function ResultadoVerificacaoDocumento({
    verificacao = null,
    titulo = "Verificação documental",
    compacto = false,
    mostrarDetalhesInicial = false,
    className = "",
}) {
    const [detalhesAbertos, setDetalhesAbertos] = useState(Boolean(mostrarDetalhesInicial));

    const dados = useMemo(() => {
        const status = verificacao?.status_verificacao || verificacao?.statusVerificacao || "pendente";
        const nivelRisco = verificacao?.nivel_risco || verificacao?.nivelRisco || "nao_avaliado";
        const score = Number(verificacao?.score_risco ?? verificacao?.scoreRisco ?? 0);
        const indicios = normalizarLista(verificacao?.indicios);
        const recomendacoes = normalizarLista(verificacao?.recomendacoes);
        const resumo = normalizarTexto(verificacao?.resumo);
        const arquivoNome = normalizarTexto(verificacao?.arquivo_nome || verificacao?.arquivoNome || verificacao?.nome_do_arquivo);
        const tipoDocumento = normalizarTexto(verificacao?.tipo_documento || verificacao?.tipoDocumento || verificacao?.nome_documento || verificacao?.nomeDocumento);
        const createdAt = verificacao?.created_at || verificacao?.createdAt || "";
        const ocrTextoBruto = normalizarTexto(verificacao?.ocr_texto || verificacao?.ocrTexto);
        const ocrTexto = obterTextoOcrPainel(ocrTextoBruto);
        const ocrTextoOculto = Boolean(ocrTextoBruto && !ocrTexto);
        const leituraDocumentalLocal = obterLeituraDocumentalLocal(verificacao?.retorno_ia || verificacao?.retornoIa);

        return {
            status,
            nivelRisco,
            score: Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : 0,
            indicios,
            recomendacoes,
            resumo,
            arquivoNome,
            tipoDocumento,
            createdAt,
            ocrTexto,
            ocrTextoOculto,
            leituraDocumentalLocal,
        };
    }, [verificacao]);

    const statusConfig = formatarStatus(dados.status);
    const StatusIcon = statusConfig.icone || ShieldCheck;
    const riscoClasse = RISCO_CONFIG[String(dados.nivelRisco || "").toLowerCase()] || RISCO_CONFIG.nao_avaliado;
    const possuiVerificacao = Boolean(verificacao);
    const riscoTexto = formatarRisco(dados.nivelRisco);
    const resumoCurto = obterResumoCurto(dados.resumo, statusConfig.texto, riscoTexto, dados.score);

    if (!possuiVerificacao) {
        return (
            <div className={`rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-3 text-sm text-slate-600 ${className}`}>
                <div className="flex items-center gap-2 font-semibold text-slate-700">
                    <FileText className="h-4 w-4" />
                    {titulo}
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-500 sm:text-sm">
                    Nenhuma verificação documental registrada para este item até o momento.
                </p>
            </div>
        );
    }

    if (compacto) {
        return (
            <div className={`rounded-2xl border border-slate-200 bg-white p-3 shadow-sm ${className}`}>
                <div className="min-w-0">
                    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                        <Sparkles className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                        <span>Análise documental</span>
                    </div>

                    <div className="mt-1 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                        <div className="min-w-0">
                            <p className="text-sm font-semibold leading-tight text-slate-800">
                                {titulo}
                            </p>

                            {dados.createdAt && (
                                <p className="mt-1 text-[11px] text-slate-400">
                                    Verificado em {formatarData(dados.createdAt)}
                                </p>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={() => setDetalhesAbertos((atual) => !atual)}
                            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                        >
                            {detalhesAbertos ? "Recolher" : "Abrir"}
                            {detalhesAbertos ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold ring-1 ${statusConfig.classe}`}>
                            <StatusIcon className="h-3.5 w-3.5" />
                            {statusConfig.texto}
                        </span>

                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold ring-1 ${riscoClasse}`}>
                            Risco {riscoTexto}
                        </span>

                        <span className="inline-flex items-center rounded-full bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200">
                            Score {dados.score}/100
                        </span>
                    </div>
                </div>

                {detalhesAbertos && <DetalhesVerificacao dados={dados} resumoCurto={resumoCurto} />}
            </div>
        );
    }

    return (
        <div className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                        <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
                        Análise documental
                    </div>

                    <h3 className="mt-2 text-sm font-bold text-slate-900 sm:text-base">
                        {titulo}
                    </h3>

                    {(dados.tipoDocumento || dados.arquivoNome) && (
                        <p className="mt-1 break-words text-xs text-slate-500 sm:text-sm">
                            {dados.tipoDocumento || "Documento"}
                            {dados.arquivoNome ? ` • ${dados.arquivoNome}` : ""}
                        </p>
                    )}

                    {dados.createdAt && (
                        <p className="mt-1 text-xs text-slate-400">
                            Verificado em {formatarData(dados.createdAt)}
                        </p>
                    )}
                </div>

                <button
                    type="button"
                    onClick={() => setDetalhesAbertos((atual) => !atual)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                    {detalhesAbertos ? "Ocultar detalhes" : "Ver detalhes"}
                    {detalhesAbertos ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusConfig.classe}`}>
                    <StatusIcon className="h-3.5 w-3.5" />
                    {statusConfig.texto}
                </span>

                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ${riscoClasse}`}>
                    Risco: {riscoTexto}
                </span>

                <span className="inline-flex items-center rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                    Score: {dados.score}/100
                </span>
            </div>

            {detalhesAbertos ? (
                <DetalhesVerificacao dados={dados} resumoCurto={resumoCurto} />
            ) : dados.resumo ? (
                <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">
                    {dados.resumo}
                </p>
            ) : null}
        </div>
    );
}
