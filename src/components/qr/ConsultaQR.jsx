/* eslint-disable no-unused-vars */
import React, { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { ClipboardCheck, Download, QrCode, Search, ShieldCheck } from "lucide-react";
import { Card, FotoColaborador, Header, QRCodeReal, StatusPill, obterFotoColaboradorSrc } from "../commonComponents";
import { DAY } from "../../constants/sstConstants";
import { obterTreinamento, statusDocumento, statusGeral, treinamentoSemValidade } from "../../services/colaboradorDocumentosService";
import { classNames, diasParaVencer, formatDate, normalizarTextoBusca } from "../../utils/sstUtils";
import { montarUrlConsultaQrColaboradorPublica } from "../../constants/auditoriaPublicaConstants";
import { carregarTokenAuditoriaPublicaAtivoPadrao } from "../../services/auditoriaPublicaTokenService";

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

export function ConsultaQR({ colaborador, colaboradores = [], onSelecionarColaborador }) {
    const [busca, setBusca] = useState("");
    const [filtroEmpresaQR, setFiltroEmpresaQR] = useState("Todas");
    const [tokenAuditoriaPublica, setTokenAuditoriaPublica] = useState("");
    const [mensagemTokenAuditoriaPublica, setMensagemTokenAuditoriaPublica] = useState("Carregando token público da auditoria...");

    const colaboradorAtual =
        colaboradores.find((item) => String(item.id) === String(colaborador?.id)) ||
        colaborador ||
        colaboradores[0] ||
        null;


    useEffect(() => {
        let ativo = true;

        async function carregarTokenAuditoriaPublica() {
            const resultado = await carregarTokenAuditoriaPublicaAtivoPadrao();

            if (!ativo) return;

            if (resultado?.tokenPublico) {
                setTokenAuditoriaPublica(resultado.tokenPublico);
                setMensagemTokenAuditoriaPublica("Token público padrão da auditoria carregado.");
                return;
            }

            setTokenAuditoriaPublica("");
            setMensagemTokenAuditoriaPublica(resultado?.erro || "Token público da auditoria não encontrado no Supabase.");
        }

        carregarTokenAuditoriaPublica();

        return () => {
            ativo = false;
        };
    }, []);

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
            <div className="consulta-qr-page">
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
            </div>
        );
    }

    const geral = statusGeral(colaboradorAtual);
    const treinamentos = colaboradorAtual.treinamentos || [];
    const treinamentosOrdenados = [...treinamentos].sort(compararTreinamentosPorOrdemNumerica);
    const urlConsultaColaborador = typeof window !== "undefined"
        ? montarUrlConsultaQrColaboradorPublica({
            tokenQrColaborador: colaboradorAtual.token,
            tokenAuditoriaPublica,
        })
        : "";
    const idImpressaoQrColaborador = `qr-colaborador-impressao-${colaboradorAtual.id || colaboradorAtual.token}`;
    const imprimirQrColaborador = () => {
        const elemento = document.getElementById(idImpressaoQrColaborador);
        if (!elemento) return;
        const janela = window.open("", "_blank", "width=520,height=640");
        if (!janela) return;
        janela.document.write(`<!doctype html><html><head><title>QR Code ${colaboradorAtual.nome || "Colaborador"}</title><style>body{font-family:Arial,sans-serif;margin:0;padding:32px;text-align:center;color:#0f172a}.cartao{display:inline-flex;flex-direction:column;align-items:center;gap:18px;border:1px solid #e2e8f0;border-radius:28px;padding:28px;box-shadow:0 8px 28px rgba(15,23,42,.08)}h1{font-size:20px;margin:0;text-transform:uppercase;max-width:360px}</style></head><body>${elemento.innerHTML}</body></html>`);
        janela.document.close();
        janela.focus();
        janela.print();
    };

    return (
        <div className="consulta-qr-page">
            <Header
                titulo="Consulta por QR Code"
                subtitulo="Consulta real por token. O QR Code abre a situação do colaborador pelo link gerado."
            />

            <Card className="mb-5">
                <div className="grid gap-3 xl:grid-cols-[1fr_280px] xl:items-start">
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
                                            src={item}
                                            colaborador={item}
                                            colaboradorId={item.id}
                                            nome={item.nome}
                                            className="h-9 w-9 rounded-full"
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

            <div className="consulta-qr-card mx-auto w-full max-w-5xl rounded-[2rem] bg-slate-950 p-2 shadow-2xl sm:p-3">
                <div className="rounded-[1.5rem] bg-white p-4 sm:p-5 md:p-8">
                    <div className="consulta-qr-perfil-grid grid justify-items-center gap-5 text-center lg:grid-cols-[104px_1fr_178px] lg:items-start lg:justify-items-stretch lg:text-left">
                        <FotoColaborador
                            src={colaboradorAtual}
                            colaborador={colaboradorAtual}
                            colaboradorId={colaboradorAtual.id}
                            nome={colaboradorAtual.nome}
                            className="h-28 w-28 rounded-full lg:h-24 lg:w-24"
                            iconClassName="h-10 w-10"
                        />

                        <div className="consulta-qr-info w-full min-w-0">
                            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                                <ShieldCheck className="h-3.5 w-3.5" />
                                Verificação SST
                            </div>
                            <div className="flex flex-col items-center gap-2 sm:flex-row sm:flex-wrap sm:justify-center lg:justify-start">
                                <h2 className="max-w-full break-words text-xl font-bold leading-tight text-slate-950 sm:text-2xl">{colaboradorAtual.nome}</h2>
                                <span className={classNames("inline-flex max-w-full items-center justify-center rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wide sm:text-xs", geral.classe)}>
                                    Status SST: {geral.texto}
                                </span>
                            </div>
                            <p className="mt-3 text-sm font-semibold text-slate-500 sm:mt-2">{colaboradorAtual.funcao}</p>
                            <p className="mt-1 break-words text-sm text-slate-500">{colaboradorAtual.empresaExibicao || colaboradorAtual.empresa}</p>
                            <p className="mt-1 text-sm font-semibold text-slate-500">
                                Código: {colaboradorAtual.codigoFuncionario}
                            </p>

                            <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left">
                                <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Link público</p>
                                <p className="texto-quebra-segura mt-1 text-xs font-semibold text-slate-600">
                                    {urlConsultaColaborador || "Link público indisponível."}
                                </p>
                                <p className={classNames(
                                    "mt-2 text-[11px] font-bold",
                                    tokenAuditoriaPublica ? "text-emerald-600" : "text-orange-600"
                                )}>
                                    {mensagemTokenAuditoriaPublica}
                                </p>
                            </div>
                            <div id={idImpressaoQrColaborador} className="hidden">
                                <div className="cartao">
                                    <QRCodeSVG value={urlConsultaColaborador} size={260} level="H" includeMargin bgColor="#ffffff" fgColor="#0f172a" />
                                    <h1>{colaboradorAtual.nome}</h1>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={imprimirQrColaborador}
                                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-2 text-xs font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 sm:w-auto"
                            >
                                <Download className="h-4 w-4" />
                                Imprimir QR Code do funcionário
                            </button>
                        </div>

                        <div className="consulta-qr-code-area mt-2 flex w-full justify-center lg:mt-0 lg:justify-end">
                            <QRCodeReal token={colaboradorAtual.token} />
                        </div>
                    </div>

                    <div className="mt-5 rounded-3xl border border-slate-200 p-4 sm:p-5">
                        <div className="flex flex-col justify-between gap-3 text-center md:flex-row md:items-center md:text-left">
                            <div>
                                <p className="text-sm font-medium text-slate-500">Status geral do colaborador</p>
                                <h3 className="mt-1 text-base font-bold leading-relaxed text-slate-950">{geral.detalhe}</h3>
                            </div>
                            <span className={classNames("inline-flex w-full items-center justify-center rounded-2xl px-5 py-3 text-base font-bold md:w-auto", geral.classe)}>
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
                            const treinamentoInfo = obterTreinamento(t.treinamentoId);

                            return (
                                <div key={`${t.id || t.treinamentoId}-${t.vencimento}`} className="rounded-3xl border border-slate-200 p-4">
                                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                        <div>
                                            <h4 className="font-bold leading-snug text-slate-950">{treinamentoInfo.nome}</h4>
                                            <p className="mt-1 text-sm text-slate-500">{treinamentoInfo.categoria}</p>
                                        </div>
                                        <StatusPill status={st} small />
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 text-sm">
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
        </div>
    );
}
