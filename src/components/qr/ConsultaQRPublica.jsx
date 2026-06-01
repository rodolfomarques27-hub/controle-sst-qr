import React, { useCallback, useEffect, useState } from "react";
import { ClipboardCheck, ShieldCheck } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { FotoColaborador, StatusPill, obterFotoColaboradorSrc } from "../commonComponents";
import { MobilizacaoBadge } from "../MobilizacaoBadge";
import { AuditoriaCampoQRCode, statusGeralConsultaPublica } from "./AuditoriaCampoQRCode";
import {
    classeClassificacaoAuditoriaCampo,
    normalizarAuditoriaCampo,
} from "../../services/auditoriaCampoService";
import {
    obterTreinamento,
    statusDocumento,
    treinamentoSemValidade,
} from "../../services/colaboradorDocumentosService";
import { DAY } from "../../constants/sstConstants";
import {
    classNames,
    diasParaVencer,
    formatDate,
    formatarDataHora,
} from "../../utils/sstUtils";

export function ConsultaQRPublica({ dados }) {
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
        <div className="consulta-qr-publica-page min-h-screen bg-slate-100 p-4 text-slate-900">
            <div className="consulta-qr-publica-card mx-auto max-w-5xl rounded-[2rem] bg-slate-950 p-3 shadow-2xl">
                <div className="rounded-[1.5rem] bg-white p-5 md:p-8">
                    <div className="consulta-qr-publica-perfil flex flex-col items-center text-center">
                        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Verificação SST
                        </div>

                        <FotoColaborador
                            src={colaborador}
                            colaborador={colaborador}
                            colaboradorId={colaborador.id || colaborador.colaboradorId || colaborador.colaborador_id}
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
                        Consulta pública limitada. Dados sensíveis como CPF, endereço, ASO detalhado e documentos médicos não são exibidos. A tela mantém a Auditoria de Campo e a listagem pública de treinamentos/certificados do colaborador.
                    </div>
                </div>
            </div>
        </div>
    );
}

