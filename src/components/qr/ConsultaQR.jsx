/* eslint-disable no-unused-vars */
import React, { useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { motion } from "framer-motion";
import { ClipboardCheck, Download, QrCode, Search, ShieldCheck } from "lucide-react";
import { Card, FotoColaborador, Header, LinkPublicoQR, QRCodeReal, StatusPill, obterFotoColaboradorSrc } from "../commonComponents";
import { MobilizacaoBadge } from "../MobilizacaoBadge";
import { DAY } from "../../constants/sstConstants";
import { obterTreinamento, statusDocumento, statusGeral, treinamentoSemValidade } from "../../services/colaboradorDocumentosService";
import { classNames, diasParaVencer, formatDate, normalizarTextoBusca } from "../../utils/sstUtils";

export function ConsultaQR({ colaborador, colaboradores = [], onSelecionarColaborador }) {
    const [busca, setBusca] = useState("");
    const [filtroEmpresaQR, setFiltroEmpresaQR] = useState("Todas");

    const colaboradorAtual =
        colaboradores.find((item) => String(item.id) === String(colaborador?.id)) ||
        colaborador ||
        colaboradores[0] ||
        null;

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
            <motion.div className="consulta-qr-page" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
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
            </motion.div>
        );
    }

    const geral = statusGeral(colaboradorAtual);
    const treinamentos = colaboradorAtual.treinamentos || [];
    const urlConsultaColaborador = typeof window !== "undefined" ? `${window.location.origin}/?qr=${encodeURIComponent(colaboradorAtual.token)}` : "";
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
        <motion.div className="consulta-qr-page" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Header
                titulo="Consulta por QR Code"
                subtitulo="Consulta real por token. O QR Code abre a situação do colaborador pelo link gerado."
            />

            <Card className="mb-5">
                <div className="grid gap-3 xl:grid-cols-[1fr_280px] xl:items-end">
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
                                            className="h-9 w-9 rounded-xl"
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

            <div className="consulta-qr-card mx-auto max-w-5xl rounded-[2rem] bg-slate-950 p-3 shadow-2xl">
                <div className="rounded-[1.5rem] bg-white p-5 md:p-8">
                    <div className="consulta-qr-perfil-grid grid gap-5 lg:grid-cols-[104px_1fr_178px] lg:items-start">
                        <FotoColaborador
                            src={colaboradorAtual}
                            colaborador={colaboradorAtual}
                            colaboradorId={colaboradorAtual.id}
                            nome={colaboradorAtual.nome}
                            className="h-24 w-24 rounded-3xl"
                            iconClassName="h-10 w-10"
                        />

                        <div className="consulta-qr-info min-w-0">
                            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                                <ShieldCheck className="h-3.5 w-3.5" />
                                Verificação SST
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="break-words text-2xl font-bold leading-tight text-slate-950">{colaboradorAtual.nome}</h2>
                                <MobilizacaoBadge status={colaboradorAtual.statusMobilizacao} />
                            </div>
                            <p className="mt-2 text-sm font-semibold text-slate-500">{colaboradorAtual.funcao}</p>
                            <p className="mt-1 text-sm text-slate-500">{colaboradorAtual.empresaExibicao || colaboradorAtual.empresa}</p>
                            <p className="mt-1 text-sm font-semibold text-slate-500">
                                Código: {colaboradorAtual.codigoFuncionario}
                            </p>

                            <LinkPublicoQR token={colaboradorAtual.token} />
                            <div id={idImpressaoQrColaborador} className="hidden">
                                <div className="cartao">
                                    <QRCodeSVG value={urlConsultaColaborador} size={260} level="H" includeMargin bgColor="#ffffff" fgColor="#0f172a" />
                                    <h1>{colaboradorAtual.nome}</h1>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={imprimirQrColaborador}
                                className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-xs font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                            >
                                <Download className="h-4 w-4" />
                                Imprimir QR Code do funcionário
                            </button>
                        </div>

                        <div className="consulta-qr-code-area flex justify-center lg:justify-end">
                            <QRCodeReal token={colaboradorAtual.token} />
                        </div>
                    </div>

                    <div className="mt-5 rounded-3xl border border-slate-200 p-5">
                        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                            <div>
                                <p className="text-sm font-medium text-slate-500">Status geral do colaborador</p>
                                <h3 className="mt-1 text-base font-bold leading-relaxed text-slate-950">{geral.detalhe}</h3>
                            </div>
                            <span className={classNames("inline-flex items-center justify-center rounded-2xl px-5 py-3 text-base font-bold", geral.classe)}>
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
                            const treinamentoInfo = obterTreinamento(t.treinamentoId);

                            return (
                                <div key={`${t.id || t.treinamentoId}-${t.vencimento}`} className="rounded-3xl border border-slate-200 p-4">
                                    <div className="mb-4 flex items-start justify-between gap-3">
                                        <div>
                                            <h4 className="font-bold text-slate-950">{treinamentoInfo.nome}</h4>
                                            <p className="mt-1 text-sm text-slate-500">{treinamentoInfo.categoria}</p>
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
        </motion.div>
    );
}
