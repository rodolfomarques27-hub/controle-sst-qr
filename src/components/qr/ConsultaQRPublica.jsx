import React, { useCallback, useEffect, useState } from "react";
import { ChevronDown, ClipboardCheck, PhoneCall, ShieldCheck } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { FotoColaborador, StatusPill, obterFotoColaboradorSrc } from "../commonComponents";
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
import { obterTokenAuditoriaPublicaUrl } from "../../constants/auditoriaPublicaConstants";
import { carregarTokenAuditoriaPublicaAtivoPadrao } from "../../services/auditoriaPublicaTokenService";
import { validarContatoEmergenciaQrService } from "../../services/consultaPublicaQrService";
import {
    classNames,
    diasParaVencer,
    formatDate,
    formatarDataHora,
} from "../../utils/sstUtils";

function obterNomeTreinamentoOrdenacao(treinamento) {
    const treinamentoInfo = obterTreinamento(treinamento?.treinamentoId);
    return String(treinamento?.nomeTreinamento || treinamentoInfo?.nome || "");
}

function obterOrdemNumericaTreinamento(treinamento) {
    const nome = obterNomeTreinamentoOrdenacao(treinamento);
    const resultadoNr = nome.match(/\bNR\s*-?\s*(\d{1,2})(?:[.,](\d{1,2}))?/i);

    if (!resultadoNr) {
        return { grupo: 1, numero: 999, subnumero: 999, nome };
    }

    return {
        grupo: 0,
        numero: Number(resultadoNr[1] || 0),
        subnumero: Number(resultadoNr[2] || 0),
        nome,
    };
}

function compararTreinamentosPorOrdemNumerica(a, b) {
    const ordemA = obterOrdemNumericaTreinamento(a);
    const ordemB = obterOrdemNumericaTreinamento(b);

    if (ordemA.grupo !== ordemB.grupo) return ordemA.grupo - ordemB.grupo;
    if (ordemA.numero !== ordemB.numero) return ordemA.numero - ordemB.numero;
    if (ordemA.subnumero !== ordemB.subnumero) return ordemA.subnumero - ordemB.subnumero;

    return ordemA.nome.localeCompare(ordemB.nome, "pt-BR", { numeric: true, sensitivity: "base" });
}

export function ConsultaQRPublica({ dados }) {
    const formatarTelefoneConsultaPublica = (valor = "") => {
        const digitos = String(valor || "").replace(/\D/g, "").slice(0, 11);

        if (!digitos) return "";
        if (digitos.length <= 2) return `(${digitos}`;
        if (digitos.length <= 6) return `(${digitos.slice(0, 2)}) ${digitos.slice(2)}`;
        if (digitos.length <= 10) return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;

        return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7, 11)}`;
    };
    const colaborador = dados?.colaborador || {};
    const treinamentos = dados?.treinamentos || [];
    const treinamentosOrdenados = [...treinamentos].sort(compararTreinamentosPorOrdemNumerica);
    const geral = statusGeralConsultaPublica(colaborador, treinamentos);
    const [contatoEmergenciaAberto, setContatoEmergenciaAberto] = useState(false);
    const [senhaEmergenciaQr, setSenhaEmergenciaQr] = useState("");
    const [contatoEmergenciaLiberado, setContatoEmergenciaLiberado] = useState(null);
    const [erroContatoEmergencia, setErroContatoEmergencia] = useState("");
    const [carregandoContatoEmergencia, setCarregandoContatoEmergencia] = useState(false);
    const [telefoneEmergenciaCopiado, setTelefoneEmergenciaCopiado] = useState(false);

    const contatoEmergenciaDisponivel =
        colaborador.contatoEmergenciaDisponivel === true ||
        colaborador.contatoEmergenciaRestrito === true ||
        colaborador.contato_emergencia_disponivel === true ||
        Boolean(colaborador.contatoEmergenciaNome || colaborador.contato_emergencia_nome || colaborador.contatoEmergenciaTelefone || colaborador.contato_emergencia_telefone);

    const contatoEmergenciaNome = String(contatoEmergenciaLiberado?.nome || "").trim();
    const contatoEmergenciaParentesco = String(contatoEmergenciaLiberado?.parentesco || "").trim();
    const contatoEmergenciaTelefone = formatarTelefoneConsultaPublica(contatoEmergenciaLiberado?.telefone || "");
    const telefoneEmergenciaLimpo = String(contatoEmergenciaLiberado?.telefone || contatoEmergenciaTelefone || "").replace(/\D/g, "");
    const tokenContatoEmergenciaQr = String(
        colaborador.token ||
        colaborador.token_qr ||
        dados?.token ||
        (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("qr") : "") ||
        ""
    ).trim();

    const situacaoObraPublica = String(
        colaborador.statusMobilizacao ||
        colaborador.status_mobilizacao ||
        "Mobilizado"
    ).trim() || "Mobilizado";

    const validarSenhaContatoEmergenciaPublica = async (evento) => {
        evento?.preventDefault?.();

        if (!tokenContatoEmergenciaQr) {
            setErroContatoEmergencia("Token do QR nao localizado para validar emergencia.");
            return;
        }

        const senhaTratada = String(senhaEmergenciaQr || "").trim();

        if (!senhaTratada) {
            setErroContatoEmergencia("Informe a senha/PIN de emergencia da empresa.");
            return;
        }

        setCarregandoContatoEmergencia(true);
        setErroContatoEmergencia("");

        try {
            const resultado = await validarContatoEmergenciaQrService({
                supabase,
                tokenQr: tokenContatoEmergenciaQr,
                senha: senhaTratada,
            });

            const contato = resultado?.contatoEmergencia || {};
            setContatoEmergenciaLiberado({
                nome: contato.nome || "",
                parentesco: contato.parentesco || "",
                telefone: contato.telefone || "",
            });
            setTelefoneEmergenciaCopiado(false);
        } catch (error) {
            setContatoEmergenciaLiberado(null);
            setErroContatoEmergencia(error?.message || "Nao foi possivel liberar o contato de emergencia.");
        } finally {
            setCarregandoContatoEmergencia(false);
        }
    };

    const copiarTelefoneEmergenciaPublica = async () => {
        if (!contatoEmergenciaTelefone) return;

        try {
            if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(contatoEmergenciaTelefone);
            }

            setTelefoneEmergenciaCopiado(true);
            setTimeout(() => setTelefoneEmergenciaCopiado(false), 1800);
        } catch {
            setTelefoneEmergenciaCopiado(false);
        }
    };
    const tokenAuditoriaPublicaUrl = obterTokenAuditoriaPublicaUrl();
    const [tokenAuditoriaPublicaEfetivo, setTokenAuditoriaPublicaEfetivo] = useState(tokenAuditoriaPublicaUrl);
    const [auditoriasCampoQr, setAuditoriasCampoQr] = useState([]);
    const [carregandoAuditoriasCampoQr, setCarregandoAuditoriasCampoQr] = useState(false);


    useEffect(() => {
        let ativo = true;

        async function carregarTokenPublicoAuditoria() {
            const resultado = await carregarTokenAuditoriaPublicaAtivoPadrao();
            if (!ativo) return;

            if (resultado?.tokenPublico) {
                setTokenAuditoriaPublicaEfetivo(resultado.tokenPublico);
            } else if (tokenAuditoriaPublicaUrl) {
                setTokenAuditoriaPublicaEfetivo(tokenAuditoriaPublicaUrl);
            }
        }

        carregarTokenPublicoAuditoria();

        return () => {
            ativo = false;
        };
    }, [tokenAuditoriaPublicaUrl]);

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
        <div className="consulta-qr-publica-page min-h-screen bg-slate-100 px-3 py-4 text-slate-900 sm:p-4">
            <div className="consulta-qr-publica-card mx-auto w-full max-w-5xl rounded-[2rem] bg-slate-950 p-2 shadow-2xl sm:p-3">
                <div className="rounded-[1.5rem] bg-white p-4 sm:p-5 md:p-8">
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
                            className="h-28 w-28 rounded-full"
                            iconClassName="h-11 w-11"
                        />

                        <h2 className="mt-4 max-w-full break-words text-xl font-bold leading-tight text-slate-950 sm:text-2xl">{colaborador.nome}</h2>
                        <p className="mt-2 text-sm font-semibold text-slate-500">{colaborador.funcao}</p>
                        <p className="mt-1 break-words text-sm text-slate-500">{colaborador.empresa}</p>
                        <p className="mt-1 text-sm font-semibold text-slate-500">
                            Código: {colaborador.codigoFuncionario}
                        </p>
                        <div className="mt-3">
                            <span className={classNames("inline-flex max-w-full items-center justify-center rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wide sm:text-xs", geral.classe)}>
                                Status SST: {geral.texto}
                            </span>
                        </div>
                    </div>

                    <div className="mt-3 grid gap-2 text-left sm:grid-cols-2">
<div className="rounded-2xl bg-emerald-50 px-3 py-2 ring-1 ring-emerald-100">
    <p className="text-[10px] font-black uppercase tracking-wide text-emerald-700">Situacao na obra</p>
    <p className="mt-1 text-xs font-black text-slate-950">{situacaoObraPublica}</p>
</div>
<div className="rounded-2xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
    <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">Conformidade SST</p>
    <p className="mt-1 text-xs font-black text-slate-950">{geral.texto}</p>
</div>
</div>

                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                        <div className="flex min-h-[4.8rem] flex-col items-center justify-center rounded-2xl bg-slate-50 p-4 text-center ring-1 ring-slate-200">
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Última auditoria</p>
                            <p className="mt-1 text-sm font-bold text-slate-900">{carregandoAuditoriasCampoQr ? "Carregando..." : ultimaAuditoriaCampoQr ? formatarDataHora(ultimaAuditoriaCampoQr.createdAt) : "Sem registro"}</p>
                        </div>
                        <div className="flex min-h-[4.8rem] flex-col items-center justify-center rounded-2xl bg-slate-50 p-4 text-center ring-1 ring-slate-200">
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Pontuação média</p>
                            <p className="mt-1 text-sm font-bold text-slate-900">{mediaAuditoriaCampoQr === null ? "Sem média" : `${mediaAuditoriaCampoQr}%`}</p>
                        </div>
                        <div className="flex min-h-[4.8rem] flex-col items-center justify-center rounded-2xl bg-slate-50 p-4 text-center ring-1 ring-slate-200">
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Classificação</p>
                            <span className={classNames("mt-2 inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1", classeClassificacaoAuditoriaCampo(ultimaAuditoriaCampoQr?.classificacao))}>
                                {ultimaAuditoriaCampoQr?.classificacao || "Sem auditoria"}
                            </span>
                        </div>
                    </div>
                    {contatoEmergenciaDisponivel && (
<div className="mt-3 rounded-2xl bg-slate-50 p-3 text-left ring-1 ring-slate-200">
    <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-[180px] flex-1">
            <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">Emergencia</p>
            <p className="mt-0.5 text-xs font-semibold text-slate-600">Acesso restrito por senha/PIN.</p>
        </div>

        <button
            type="button"
            onClick={() => {
                setContatoEmergenciaAberto((valor) => !valor);
                setErroContatoEmergencia("");
            }}
            className="inline-flex min-w-[118px] shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white"
        >
            <PhoneCall className="h-3.5 w-3.5" />
            Emergencia
            <ChevronDown
                className={classNames(
                    "h-3.5 w-3.5 transition",
                    contatoEmergenciaAberto && "rotate-180"
                )}
            />
        </button>
    </div>

    {contatoEmergenciaAberto && (
        <div className="mt-3 rounded-2xl bg-white p-3 text-left ring-1 ring-slate-100">
            <div className="rounded-2xl border border-red-100 bg-red-50 px-3 py-2">
                <p className="text-xs font-black uppercase tracking-wide text-red-700">Area restrita</p>
                <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-600">
                    Digite a senha/PIN da empresa para liberar o contato.
                </p>
            </div>

            {contatoEmergenciaLiberado ? (
                <div className="mt-3 grid gap-3 rounded-2xl bg-emerald-50 p-3 text-center ring-1 ring-emerald-100 sm:grid-cols-3">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Nome</p>
                        <p className="mt-1 text-xs font-black text-slate-950">{contatoEmergenciaNome || "-"}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Parentesco</p>
                        <p className="mt-1 text-xs font-black text-slate-950">{contatoEmergenciaParentesco || "-"}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Telefone</p>
                        <div className="mt-1 flex flex-col items-center gap-1">
                            <a
                                href={telefoneEmergenciaLimpo ? `tel:${telefoneEmergenciaLimpo}` : undefined}
                                className="rounded-full bg-red-600 px-3 py-1.5 text-[11px] font-black text-white hover:bg-red-700"
                            >
                                Ligar agora
                            </a>
                            <button
                                type="button"
                                onClick={copiarTelefoneEmergenciaPublica}
                                className="text-[10px] font-black text-slate-600 underline"
                            >
                                {telefoneEmergenciaCopiado ? "Copiado" : "Copiar telefone"}
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <form onSubmit={validarSenhaContatoEmergenciaPublica} className="mt-3 space-y-2">
                    <label className="block">
                        <span className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">
                            Senha/PIN da empresa
                        </span>
                        <inpu
                            type="password"
                            value={senhaEmergenciaQr}
                            onChange={(evento) => setSenhaEmergenciaQr(evento.target.value)}
                            className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-950 outline-none transition focus:border-red-300 focus:ring-2 focus:ring-red-100"
                            placeholder="Digite a senha/PIN"
                            autoComplete="off"
                        />
                    </label>

                    {erroContatoEmergencia && (
                        <p className="rounded-2xl border border-red-100 bg-red-50 px-3 py-2 text-[11px] font-bold text-red-700">
                            {erroContatoEmergencia}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={carregandoContatoEmergencia}
                        className={classNames(
                            "inline-flex w-full items-center justify-center rounded-2xl px-4 py-3 text-xs font-black text-white transition",
                            carregandoContatoEmergencia
                                ? "cursor-wait bg-slate-400"
                                : "bg-slate-950 hover:bg-slate-800"
                        )}
                    >
                        {carregandoContatoEmergencia ? "Validando..." : "Acessar contato"}
                    </button>
                </form>
            )}
        </div>
    )}
</div>
                    )}
<AuditoriaCampoQRCode
                        colaborador={colaborador}
                        treinamentos={treinamentos}
                        tokenAuditoria={tokenAuditoriaPublicaEfetivo || tokenAuditoriaPublicaUrl}
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
                        {treinamentosOrdenados.map((t) => {
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
                                <div key={`${t.id || t.treinamentoId}-${t.vencimento}`} className="rounded-3xl border border-slate-200 p-3 sm:p-4">
                                    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                        <div>
                                            <h4 className="font-bold leading-snug text-slate-950">{t.nomeTreinamento || obterTreinamento(t.treinamentoId).nome}</h4>
                                            <p className="mt-1 text-sm text-slate-500">{obterTreinamento(t.treinamentoId).categoria}</p>
                                        </div>
                                        <StatusPill status={st} small />
                                    </div>

                                    <div className="flex gap-2 text-sm">
                                        <div className="min-w-0 flex-1 rounded-2xl bg-slate-50 px-2 py-3 text-center">
                                            <p className="text-xs text-slate-400">Realizado</p>
                                            <p className="font-semibold text-slate-700">{formatDate(t.realizado)}</p>
                                        </div>
                                        <div className="min-w-0 flex-1 rounded-2xl bg-slate-50 px-2 py-3 text-center">
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


                    <div className="mt-6 rounded-3xl bg-slate-50 p-4 text-left text-sm leading-relaxed text-slate-600 sm:text-justify">
                        Consulta pública limitada. Dados sensíveis como CPF, endereço, ASO detalhado e documentos médicos não são exibidos. A tela mantém a Auditoria de Campo e a listagem pública de treinamentos/certificados do colaborador.
                    </div>
                </div>
            </div>
        </div>
    );
}
