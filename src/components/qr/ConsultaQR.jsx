/* eslint-disable no-unused-vars */
import React, { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { QrCodeComLogo } from "./QrCodeComLogo";
import { ClipboardCheck, Download, QrCode, Search, ShieldCheck } from "lucide-react";
import { Card, FotoColaborador, Header, QRCodeReal, StatusPill, obterFotoColaboradorSrc } from "../commonComponents";
import { DAY } from "../../constants/sstConstants";
import { obterTreinamento, statusDocumento, statusGeral, treinamentoSemValidade } from "../../services/colaboradorDocumentosService";
import { classNames, diasParaVencer, formatDate, normalizarTextoBusca } from "../../utils/sstUtils";
import { montarUrlConsultaQrColaboradorPublica } from "../../constants/auditoriaPublicaConstants";
import { carregarTokenAuditoriaPublicaAtivoPadrao } from "../../services/auditoriaPublicaTokenService";
import { CrachaColaboradorPrint, CRACHA_COLABORADOR_PRINT_STYLES } from "./CrachaColaboradorPrint";

const CRACHA_COLABORADOR_HABILITADO = false;

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

function abreviarNomeEtiquetaQr(nome = "", limite = 24) {
    const partes = String(nome || "")
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (!partes.length) return "COLABORADOR";

    const conectores = new Set(["DA", "DE", "DO", "DAS", "DOS", "E"]);
    const nomeCompleto = partes.join(" ").toUpperCase();

    if (nomeCompleto.length <= limite) return nomeCompleto;

    if (partes.length <= 2) {
        return `${nomeCompleto.slice(0, Math.max(1, limite - 3)).trim()}...`;
    }

    const primeiro = partes[0];
    const ultimo = partes[partes.length - 1];
    const iniciais = partes
        .slice(1, -1)
        .filter((parte) => !conectores.has(parte.toUpperCase()))
        .map((parte) => `${parte.charAt(0).toUpperCase()}.`);

    const abreviado = [primeiro, ...iniciais, ultimo].join(" ").toUpperCase();

    if (abreviado.length <= limite) return abreviado;

    const primeiroUltimo = `${primeiro} ${ultimo}`.toUpperCase();

    if (primeiroUltimo.length <= limite) return primeiroUltimo;

    return `${primeiroUltimo.slice(0, Math.max(1, limite - 3)).trim()}...`;
}
const QR_CODE_PRINT_STYLES = `
* {
    box-sizing: border-box;
}

html,
body {
    min-height: 100%;
}

body {
    margin: 0;
    padding: 32px;
    background: #ffffff;
    color: #0f172a;
    font-family: Arial, Helvetica, sans-serif;
    text-align: center;
}

.cartao {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    gap: 22px;
    width: min(100%, 380px);
    border: 1px solid #e2e8f0;
    border-radius: 28px;
    padding: 28px;
    background: #ffffff;
    box-shadow: 0 8px 28px rgba(15, 23, 42, 0.08);
}

.qr-print-safe-box {
    position: relative !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    width: 260px !important;
    height: 260px !important;
    min-width: 260px !important;
    min-height: 260px !important;
    margin: 0 auto !important;
    overflow: visible !important;
    background: #ffffff !important;
    line-height: 0 !important;
}

.qr-print-safe-box > * {
    position: relative !important;
    display: block !important;
    width: 260px !important;
    height: 260px !important;
    min-width: 260px !important;
    min-height: 260px !important;
}

.qr-print-safe-box svg {
    display: block !important;
    width: 260px !important;
    height: 260px !important;
    max-width: 260px !important;
    max-height: 260px !important;
}

.qr-print-safe-box img {
    position: absolute !important;
    left: 50% !important;
    top: 50% !important;
    z-index: 10 !important;
    width: 58px !important;
    height: 58px !important;
    max-width: 58px !important;
    max-height: 58px !important;
    transform: translate(-50%, -50%) !important;
    object-fit: contain !important;
    border-radius: 16px !important;
    background: #ffffff !important;
}

h1 {
    display: block;
    width: 100%;
    max-width: 330px;
    margin: 0;
    padding-top: 4px;
    color: #0f172a;
    font-size: 20px;
    line-height: 1.2;
    font-weight: 900;
    letter-spacing: 0.01em;
    text-transform: uppercase;
    overflow-wrap: anywhere;
}


.grade-qrs {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 18px;
    width: 100%;
    max-width: 820px;
    margin: 0 auto;
    text-align: center;
}


.cartao-lote {
    width: 100%;
    max-width: none;
    min-height: 255px;
    padding: 8px 10px 10px;
    gap: 3px;
}

.cartao-lote-unico {
    width: 270px;
    max-width: 270px;
    margin: 0 auto;
}
.cartao-lote .qr-print-safe-box,
.cartao-lote .qr-print-safe-box > *,
.cartao-lote .qr-print-safe-box svg {
    width: 190px !important;
    height: 190px !important;
    min-width: 190px !important;
    min-height: 190px !important;
    max-width: 190px !important;
    max-height: 190px !important;
}

.cartao-lote .qr-print-safe-box img {
    width: 48px !important;
    height: 48px !important;
    max-width: 48px !important;
    max-height: 48px !important;
    border-radius: 14px !important;
}

.cartao-lote h1 {
    width: 190px;
    max-width: 190px;
    margin: 1px auto 0;
    padding: 0;
    font-size: 10.5px;
    line-height: 1.05;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-align: center;
}

.meta-qr {
    width: 190px;
    max-width: 190px;
    margin: 0 auto;
    color: #475569;
    font-size: 7px;
    line-height: 1.05;
    font-weight: 800;
    text-transform: uppercase;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-align: center;
}

@media print {
    body {
        padding: 18mm;
    }

    .cartao {
        box-shadow: none;
        break-inside: avoid;
        page-break-inside: avoid;
    }
}
`;
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
            });
    }, [busca, colaboradoresPorEmpresa]);

    const totalColaboradoresCarregados = colaboradores.length;
    const totalColaboradoresEmpresa = colaboradoresPorEmpresa.length;
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
    const montarUrlConsultaColaborador = (item) => typeof window !== "undefined"
        ? montarUrlConsultaQrColaboradorPublica({
            tokenQrColaborador: item?.token,
            tokenAuditoriaPublica,
        })
        : "";

    const urlConsultaColaborador = montarUrlConsultaColaborador(colaboradorAtual);
    const idImpressaoQrColaborador = `qr-colaborador-impressao-${colaboradorAtual.id || colaboradorAtual.token}`;
    const idImpressaoCrachaColaborador = `cracha-colaborador-impressao-${colaboradorAtual.id || colaboradorAtual.token}`;
    const idImpressaoLoteColaboradores = "qr-colaboradores-lote-impressao";
    const imprimirQrColaborador = () => {
        const elemento = document.getElementById(idImpressaoQrColaborador);
        if (!elemento) return;
        const janela = window.open("", "_blank", "width=520,height=640");
        if (!janela) return;
        janela.document.write(`<!doctype html><html><head><title>QR Code ${colaboradorAtual.nome || "Colaborador"}</title><style>${QR_CODE_PRINT_STYLES}</style></head><body>${elemento.innerHTML}</body></html>`);
        janela.document.close();
        janela.focus();
        janela.print();
    };

    const imprimirQrColaboradoresEmLote = () => {
        if (!colaboradoresFiltrados.length) return;

        const elemento = document.getElementById(idImpressaoLoteColaboradores);
        if (!elemento) return;

        const janela = window.open("", "_blank", "width=980,height=760");
        if (!janela) return;

        const titulo = filtroEmpresaQR === "Todas"
            ? "QR Codes dos funcionários"
            : `QR Codes - ${filtroEmpresaQR}`;

        janela.document.write(`<!doctype html><html><head><title>${titulo}</title><style>${QR_CODE_PRINT_STYLES}</style></head><body>${elemento.innerHTML}</body></html>`);
        janela.document.close();
        janela.focus();
        setTimeout(() => janela.print(), 700);
    };
    const imprimirCrachaColaborador = () => {
        const elemento = document.getElementById(idImpressaoCrachaColaborador);
        if (!elemento) return;

        const janela = window.open("", "_blank", "width=980,height=720");
        if (!janela) return;

        janela.document.write(`<!doctype html><html><head><title>Crachá ${colaboradorAtual.nome || "Colaborador"}</title><style>${CRACHA_COLABORADOR_PRINT_STYLES}</style></head><body>${elemento.innerHTML}</body></html>`);
        janela.document.close();
        janela.focus();
        setTimeout(() => janela.print(), 250);
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
                            {colaboradoresFiltrados.length} encontrado(s) · {totalColaboradoresEmpresa} na empresa/filtro · {totalColaboradoresCarregados} carregado(s)
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
                                <div className="cartao cartao-lote cartao-lote-unico">
                                    <div className="qr-print-safe-box">
                                        <QrCodeComLogo value={urlConsultaColaborador} size={210} level="H" includeMargin bgColor="#ffffff" fgColor="#0f172a" logoRatio={0.22} />
                                    </div>
                                    <h1>{abreviarNomeEtiquetaQr(colaboradorAtual.nome, 24)}</h1>
                                    <p className="meta-qr">
                                        {colaboradorAtual.empresaExibicao || colaboradorAtual.empresa || "Empresa não informada"}
                                    </p>
                                </div>
                            </div>
                            <div id={idImpressaoLoteColaboradores} className="hidden">
                                <div className="grade-qrs">
                                    {colaboradoresFiltrados.map((item) => (
                                        <div key={item.id || item.token || item.codigoFuncionario || item.nome} className="cartao cartao-lote">
                                            <div className="qr-print-safe-box">
                                                <QrCodeComLogo value={montarUrlConsultaColaborador(item)} size={210} level="H" includeMargin bgColor="#ffffff" fgColor="#0f172a" logoRatio={0.22} />
                                            </div>
                                            <h1>{abreviarNomeEtiquetaQr(item.nome, 24)}</h1>
                                            <p className="meta-qr">
                                                {item.empresaExibicao || item.empresa || "Empresa não informada"}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>{CRACHA_COLABORADOR_HABILITADO && (
                                <div id={idImpressaoCrachaColaborador} className="pointer-events-none fixed -left-[9999px] top-0 opacity-0">
                                    <CrachaColaboradorPrint
                                        colaborador={colaboradorAtual}
                                        urlConsultaColaborador={urlConsultaColaborador}
                                    />
                                </div>
                            )}
                            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                                <button
                                    type="button"
                                    onClick={imprimirQrColaborador}
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-2 text-xs font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 sm:w-auto"
                                >
                                    <Download className="h-4 w-4" />
                                    Imprimir QR Code do funcionário
                                </button>
                                <button
                                    type="button"
                                    onClick={imprimirQrColaboradoresEmLote}
                                    disabled={colaboradoresFiltrados.length === 0}
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-xs font-bold text-white ring-1 ring-slate-950 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                                >
                                    <Download className="h-4 w-4" />
                                    Imprimir QRs filtrados ({colaboradoresFiltrados.length})
                                </button>
                                {CRACHA_COLABORADOR_HABILITADO && (
                                    <button
                                        type="button"
                                        onClick={imprimirCrachaColaborador}
                                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-xs font-bold text-white ring-1 ring-slate-950 hover:bg-slate-800 sm:w-auto"
                                    >
                                        <Download className="h-4 w-4" />
                                        Imprimir crachá
                                    </button>
                                )}
                            </div>
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
                                <div key={`${t.id || t.treinamentoId}-${t.vencimento}`} className="rounded-3xl border border-slate-200 p-3 sm:p-4">
                                    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                        <div>
                                            <h4 className="font-bold leading-snug text-slate-950">{treinamentoInfo.nome}</h4>
                                            <p className="mt-1 text-sm text-slate-500">{treinamentoInfo.categoria}</p>
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


