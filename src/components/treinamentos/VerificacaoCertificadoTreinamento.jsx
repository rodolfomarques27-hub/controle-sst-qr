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
import {
    obterUltimaVerificacaoDocumental,
    verificarCertificadoTreinamento,
} from "../../services/documentosVerificacaoService";
import {
    obterTreinamento,
    treinamentoSemValidade,
} from "../../services/colaboradorDocumentosService";
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

function converterStatusVerificacaoParaStatusCertificado(statusVerificacao = "") {
    const status = String(statusVerificacao || "").trim().toLowerCase();

    if (status === "aprovado") return "Aprovado";
    if (status === "atencao") return "Atenção";
    if (status === "revisao_manual") return "Revisão manual";
    if (status === "suspeito") return "Suspeito";
    if (status === "bloqueado") return "Bloqueado";
    if (status === "erro") return "Erro na verificação";

    return "Pendente de verificação";
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

function normalizarDataIso(valor = "") {
    if (!valor) return "";

    const texto = String(valor || "").trim();
    const matchIso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);

    if (matchIso) {
        return `${matchIso[1]}-${matchIso[2]}-${matchIso[3]}`;
    }

    const data = new Date(texto);

    if (Number.isNaN(data.getTime())) return "";

    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const dia = String(data.getDate()).padStart(2, "0");

    return `${ano}-${mes}-${dia}`;
}

function formatarDataPainel(valor = "", fallback = "Não informada") {
    const dataIso = normalizarDataIso(valor);

    if (!dataIso) return fallback;

    const [ano, mes, dia] = dataIso.split("-");

    return `${dia}/${mes}/${ano}`;
}

function formatarDataHoraPainel(valor = "") {
    if (!valor) return "Não informada";

    const data = new Date(valor);

    if (Number.isNaN(data.getTime())) {
        return formatarDataPainel(valor);
    }

    return data.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function obterDataRealizacaoCertificado(certificado = {}) {
    return certificado.realizado ||
        certificado.dataRealizacao ||
        certificado.data_realizacao ||
        certificado.data_emissao ||
        certificado.dataEmissao ||
        "";
}

function obterDataVencimentoCertificado(certificado = {}) {
    return certificado.vencimento ||
        certificado.dataVencimento ||
        certificado.data_vencimento ||
        "";
}

function obterNomeArquivoCertificado(certificado = {}) {
    return certificado.arquivoNome ||
        certificado.arquivo_nome ||
        certificado.nomeArquivo ||
        certificado.nome_do_arquivo ||
        certificado.arquivo?.name ||
        certificado.arquivo ||
        "";
}

function obterUrlArquivoCertificado(certificado = {}) {
    return certificado.arquivoUrl ||
        certificado.arquivo_url ||
        certificado.urlArquivo ||
        certificado.url_do_arquivo ||
        certificado.url ||
        "";
}

function montarCertificadoParaReanalise(certificado = {}, certificadoId = "") {
    const treinamentoId = Number(certificado.treinamentoId || certificado.treinamento_codigo || certificado.treinamento?.id || 0);
    const treinamento = certificado.treinamento || obterTreinamento(treinamentoId) || {
        id: treinamentoId || null,
        nome: certificado.nomeTreinamento || certificado.nome_treinamento || certificado.tipo_treinamento || "",
    };
    const colaborador = certificado.colaborador || {};
    const dataRealizacao = obterDataRealizacaoCertificado(certificado);
    const dataVencimento = obterDataVencimentoCertificado(certificado);
    const arquivoNome = obterNomeArquivoCertificado(certificado);
    const arquivoUrl = obterUrlArquivoCertificado(certificado);

    return {
        treinamentoId,
        treinamento,
        colaborador,
        certificadoParaVerificacao: {
            ...certificado,
            id: certificadoId,
            colaborador_id: certificado.colaborador_id || certificado.colaboradorId || colaborador.id || null,
            colaboradorId: certificado.colaboradorId || certificado.colaborador_id || colaborador.id || null,
            treinamento_codigo: treinamentoId || certificado.treinamento_codigo || null,
            treinamentoId: treinamentoId || certificado.treinamentoId || null,
            tipo_treinamento: certificado.tipo_treinamento || certificado.nomeTreinamento || certificado.nome_treinamento || treinamento.nome || "",
            nome_treinamento: certificado.nome_treinamento || certificado.nomeTreinamento || certificado.tipo_treinamento || treinamento.nome || "",
            data_realizacao: dataRealizacao,
            dataRealizacao,
            data_vencimento: dataVencimento,
            dataVencimento,
            arquivo_url: arquivoUrl,
            arquivoUrl,
            arquivo_nome: arquivoNome,
            arquivoNome,
            observacao: certificado.observacao || null,
        },
    };
}

function verificarDivergenciaDatas({ certificado = {}, verificacao = null } = {}) {
    if (!verificacao) return false;

    const realizadoAtual = normalizarDataIso(obterDataRealizacaoCertificado(certificado));
    const vencimentoAtual = normalizarDataIso(obterDataVencimentoCertificado(certificado));
    const realizadoAnalise = normalizarDataIso(verificacao.dataRealizacao || verificacao.data_realizacao);
    const vencimentoAnalise = normalizarDataIso(verificacao.dataVencimento || verificacao.data_vencimento);

    return Boolean(
        (realizadoAtual && realizadoAnalise && realizadoAtual !== realizadoAnalise) ||
        (vencimentoAtual && vencimentoAnalise && vencimentoAtual !== vencimentoAnalise)
    );
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

function PainelDatasVerificacao({ certificado = {}, verificacao = null }) {
    const semValidade = treinamentoSemValidade(certificado.treinamentoId || certificado.treinamento_codigo || certificado.treinamento?.id);
    const datasDivergentes = verificarDivergenciaDatas({ certificado, verificacao });

    return (
        <div className="mb-3 rounded-2xl border border-slate-200 bg-white p-3">
            <div className="flex flex-col justify-between gap-2 lg:flex-row lg:items-start">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Conferência de datas</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">
                        A verificação local usa as datas cadastradas no sistema. A leitura automática da data impressa no PDF/imagem depende de OCR ou IA em etapa futura.
                    </p>
                </div>

                {datasDivergentes && (
                    <span className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-amber-700 ring-1 ring-amber-200">
                        Datas alteradas após a análise
                    </span>
                )}
            </div>

            <div className="mt-3 grid gap-2 md:grid-cols-2">
                <div className="rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-100">
                    <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Cadastro atual</p>
                    <p className="mt-1 text-xs font-semibold text-slate-700">
                        Realização: {formatarDataPainel(obterDataRealizacaoCertificado(certificado))}
                    </p>
                    <p className="mt-0.5 text-xs font-semibold text-slate-700">
                        Vencimento: {semValidade ? "Sem validade" : formatarDataPainel(obterDataVencimentoCertificado(certificado))}
                    </p>
                </div>

                <div className="rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-100">
                    <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Última análise salva</p>
                    <p className="mt-1 text-xs font-semibold text-slate-700">
                        Realização: {formatarDataPainel(verificacao?.dataRealizacao || verificacao?.data_realizacao)}
                    </p>
                    <p className="mt-0.5 text-xs font-semibold text-slate-700">
                        Vencimento: {semValidade ? "Sem validade" : formatarDataPainel(verificacao?.dataVencimento || verificacao?.data_vencimento)}
                    </p>
                </div>
            </div>
        </div>
    );
}

export function VerificacaoCertificadoTreinamento({ certificado = {} }) {
    const [aberto, setAberto] = useState(false);
    const [carregando, setCarregando] = useState(false);
    const [reanalisando, setReanalisando] = useState(false);
    const [erro, setErro] = useState("");
    const [verificacao, setVerificacao] = useState(null);
    const [statusAtualValidacao, setStatusAtualValidacao] = useState(() => obterStatusValidacaoCertificado(certificado));

    const certificadoId = useMemo(() => obterIdCertificado(certificado), [certificado]);

    useEffect(() => {
        setStatusAtualValidacao(obterStatusValidacaoCertificado(certificado));
    }, [certificado]);

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

            if (resultado?.statusVerificacao) {
                setStatusAtualValidacao(converterStatusVerificacaoParaStatusCertificado(resultado.statusVerificacao));
            }
        } catch (error) {
            setVerificacao(null);
            setErro(error?.message || "Erro ao carregar a verificação documental do certificado.");
        } finally {
            setCarregando(false);
        }
    }, [certificadoId]);

    const reanalisarCertificado = useCallback(async () => {
        if (!certificadoId) {
            setErro("Certificado sem ID para reanalisar.");
            return;
        }

        setAberto(true);
        setReanalisando(true);
        setErro("");

        try {
            const {
                treinamentoId,
                treinamento,
                colaborador,
                certificadoParaVerificacao,
            } = montarCertificadoParaReanalise(certificado, certificadoId);

            const resultado = await verificarCertificadoTreinamento({
                supabase,
                certificado: certificadoParaVerificacao,
                colaborador,
                treinamento,
                arquivo: null,
                registrosExistentes: [],
                usuario: null,
                salvarResultado: true,
                exigeVencimento: !treinamentoSemValidade(treinamentoId),
            });

            const statusValidacao = converterStatusVerificacaoParaStatusCertificado(resultado?.statusVerificacao);

            const { error } = await supabase
                .from("certificados")
                .update({ status_validacao: statusValidacao })
                .eq("id", certificadoId);

            if (error) {
                throw new Error(`Erro ao atualizar status do certificado após reanálise: ${error.message}`);
            }

            setVerificacao(resultado);
            setStatusAtualValidacao(statusValidacao);
        } catch (error) {
            setErro(error?.message || "Erro ao reanalisar o certificado.");
        } finally {
            setReanalisando(false);
        }
    }, [certificado, certificadoId]);

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
                            statusCertificado={statusAtualValidacao}
                        />
                    </div>

                    {verificacao?.createdAt && (
                        <p className="mt-2 text-[11px] font-semibold text-slate-400">
                            Última análise: {formatarDataHoraPainel(verificacao.createdAt)}
                        </p>
                    )}
                </div>

                <div className="flex flex-wrap gap-2 lg:justify-end">
                    {aberto && (
                        <>
                            <button
                                type="button"
                                onClick={reanalisarCertificado}
                                disabled={reanalisando || carregando}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100 disabled:opacity-60"
                            >
                                <RefreshCw className={`h-4 w-4 ${reanalisando ? "animate-spin" : ""}`} />
                                {reanalisando ? "Reanalisando..." : "Reanalisar certificado"}
                            </button>

                            <button
                                type="button"
                                onClick={carregarVerificacao}
                                disabled={carregando || reanalisando}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 ring-1 ring-blue-200 hover:bg-blue-100 disabled:opacity-60"
                            >
                                <RefreshCw className={`h-4 w-4 ${carregando ? "animate-spin" : ""}`} />
                                Atualizar
                            </button>
                        </>
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
                    {(carregando || reanalisando) && (
                        <div className="rounded-2xl border border-dashed border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">
                            {reanalisando ? "Reanalisando certificado com as datas atuais do sistema..." : "Carregando resultado da verificação documental..."}
                        </div>
                    )}

                    {!carregando && !reanalisando && erro && (
                        <div className="flex gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                            <span>{erro}</span>
                        </div>
                    )}

                    {!carregando && !reanalisando && !erro && !verificacao && (
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-600">
                            Nenhum resultado de verificação documental foi localizado para este certificado.
                            Clique em Reanalisar certificado para gerar uma nova análise local usando as datas cadastradas no sistema.
                        </div>
                    )}

                    {!carregando && !reanalisando && !erro && verificacao && (
                        <>
                            <PainelDatasVerificacao
                                certificado={certificado}
                                verificacao={verificacao}
                            />

                            {ResultadoVerificacaoDocumento ? (
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
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
