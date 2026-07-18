/* eslint-disable no-unused-vars */
import React, { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { QrCodeComLogo } from "./QrCodeComLogo";
import { Camera, Check, ClipboardCheck, Copy, Download, Link2, QrCode, Search, ShieldCheck, ChevronDown, PhoneCall, X } from "lucide-react";
import { Card, FotoColaborador, Header, QRCodeReal, StatusPill, obterFotoColaboradorSrc } from "../commonComponents";
import { DAY } from "../../constants/sstConstants";
import { obterTreinamento, statusDocumento, statusGeral, treinamentoSemValidade } from "../../services/colaboradorDocumentosService";
import { classNames, diasParaVencer, formatDate, normalizarTextoBusca } from "../../utils/sstUtils";
import { montarUrlConsultaQrColaboradorPublica } from "../../constants/auditoriaPublicaConstants";
import { carregarTokenAuditoriaPublicaAtivoPadrao } from "../../services/auditoriaPublicaTokenService";
import { CrachaColaboradorPrint, CRACHA_COLABORADOR_PRINT_STYLES } from "./CrachaColaboradorPrint";
import { ColaboradorIdentificacoesSeguranca } from "../colaboradores/ColaboradorIdentificacoesSeguranca";
import dashboardHeroBackground from "../../assets/dashboard-hero-sst.webp";
import { useDispositivoMobile } from "../../hooks/useDispositivoMobile";

function CardIconSafe() {
    return (
        <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M4 21V7.8C4 6.7 4.7 5.8 5.7 5.5L12 3l6.3 2.5c1 .3 1.7 1.2 1.7 2.3V21" />
            <path d="M8 21v-7h8v7" />
            <path d="M8 9h.01" />
            <path d="M12 9h.01" />
            <path d="M16 9h.01" />
            <path d="M8 12h.01" />
            <path d="M16 12h.01" />
        </svg>
    );
}

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

function ScannerQrMobile() {
    const videoRef = React.useRef(null);
    const [ativo, setAtivo] = useState(false);
    const [mensagem, setMensagem] = useState("Toque para abrir a câmera e ler um QR Code impresso.");

    useEffect(() => () => {
        const stream = videoRef.current?.srcObject;
        stream?.getTracks?.().forEach((track) => track.stop());
    }, []);

    useEffect(() => {
        if (!ativo || !window.BarcodeDetector) return undefined;
        const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
        let cancelado = false;
        const ler = async () => {
            if (cancelado || !videoRef.current || videoRef.current.readyState < 2) return;
            try {
                const resultados = await detector.detect(videoRef.current);
                const valor = resultados?.[0]?.rawValue;
                if (valor && (String(valor).startsWith("http://") || String(valor).startsWith("https://"))) {
                    window.location.href = valor;
                    return;
                }
            } catch { /* continua tentando enquanto a câmera estiver aberta */ }
            if (!cancelado) window.setTimeout(ler, 350);
        };
        ler();
        return () => { cancelado = true; };
    }, [ativo]);

    const iniciarCamera = async () => {
        if (!navigator.mediaDevices?.getUserMedia) {
            setMensagem("A câmera não está disponível neste navegador.");
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } } });
            videoRef.current.srcObject = stream;
            await videoRef.current.play();
            setAtivo(true);
            setMensagem("Aponte a câmera para o QR Code impresso.");
        } catch {
            setMensagem("Não foi possível acessar a câmera. Verifique a permissão do navegador.");
        }
    };

    const fecharCamera = () => {
        const stream = videoRef.current?.srcObject;
        stream?.getTracks?.().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
        setAtivo(false);
        setMensagem("Toque para abrir a câmera e ler um QR Code impresso.");
    };

    return (
        <section className="mobile-qr-scanner">
            <div className="mobile-qr-scanner__icon"><Camera className="h-7 w-7" /></div>
            <h1>Escanear QR Code</h1>
            <p>{mensagem}</p>
            <video ref={videoRef} className={ativo ? "mobile-qr-scanner__video is-visible" : "mobile-qr-scanner__video"} playsInline muted />
            {!ativo ? (
                <button type="button" onClick={iniciarCamera}><Camera className="h-5 w-5" /> Abrir câmera</button>
            ) : (
                <button type="button" onClick={fecharCamera} className="mobile-qr-scanner__close"><X className="h-5 w-5" /> Fechar câmera</button>
            )}
            <small>O QR Code deve estar impresso e visível. Nenhuma lista de colaboradores é exibida no celular.</small>
        </section>
    );
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
function ConsultaQRDesktop({ colaborador, colaboradores = [], onSelecionarColaborador }) {
    const [busca, setBusca] = useState("");
    const [idColaboradorConsultaSelecionado, setIdColaboradorConsultaSelecionado] = useState("");
    const [filtrosConsultaQrAbertos, setFiltrosConsultaQrAbertos] = useState(() => {
        if (typeof window === "undefined") return true;

        return window.localStorage.getItem("consultaQr:filtrosAbertos") !== "false";
    });
    const [filtroEmpresaQR, setFiltroEmpresaQR] = useState("Todas");
    const [filtroFuncaoQR, setFiltroFuncaoQR] = useState("Todas");
    const [ordenacaoConsultaQR, setOrdenacaoConsultaQR] = useState("az");
    const [filtroEmpresaQrMassa, setFiltroEmpresaQrMassa] = useState("Todas");
    const [filtroFuncaoQrMassa, setFiltroFuncaoQrMassa] = useState("Todas");
    const [qrMassaAberto, setQrMassaAberto] = useState(false);
    const [idsColaboradoresQrMassaSelecionados, setIdsColaboradoresQrMassaSelecionados] = useState([]);
    const [linkPublicoCopiado, setLinkPublicoCopiado] = useState(false);
    const [contatoEmergenciaAberto, setContatoEmergenciaAberto] = useState(false);
    const [tokenAuditoriaPublica, setTokenAuditoriaPublica] = useState("");
    const [mensagemTokenAuditoriaPublica, setMensagemTokenAuditoriaPublica] = useState("Carregando token público da auditoria...");
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

    useEffect(() => {
        if (typeof window === "undefined") return;

        window.localStorage.setItem("consultaQr:filtrosAbertos", filtrosConsultaQrAbertos ? "true" : "false");
    }, [filtrosConsultaQrAbertos]);

    const empresasConsultaQR = useMemo(() => {
        const nomes = colaboradores
            .map((item) => item.empresaExibicao || item.empresa || "Empresa não informada")
            .filter(Boolean);

        return Array.from(new Set(nomes)).sort((a, b) => a.localeCompare(b));
    }, [colaboradores]);

    const obterIdColaboradorConsulta = (item = {}) =>
        String(item.id || item.token || item.codigoFuncionario || item.nome || "");

    useEffect(() => {
        const idRecebido = obterIdColaboradorConsulta(colaborador);
        if (!idRecebido) return;

        setIdColaboradorConsultaSelecionado(idRecebido);
    }, [colaborador]);

    const colaboradoresPorEmpresa = useMemo(() => {
        if (filtroEmpresaQR === "Todas") return colaboradores;

        return colaboradores.filter(
            (item) => String(item.empresaExibicao || item.empresa || "Empresa não informada") === String(filtroEmpresaQR)
        );
    }, [colaboradores, filtroEmpresaQR]);

    const funcoesConsultaQR = useMemo(() => {
        const funcoes = colaboradoresPorEmpresa
            .map((item) => item.funcao || item.cargo || "Função não informada")
            .filter(Boolean);

        return Array.from(new Set(funcoes)).sort((a, b) => a.localeCompare(b, "pt-BR"));
    }, [colaboradoresPorEmpresa]);

    useEffect(() => {
        if (filtroFuncaoQR === "Todas") return;
        if (funcoesConsultaQR.includes(filtroFuncaoQR)) return;

        setFiltroFuncaoQR("Todas");
    }, [filtroFuncaoQR, funcoesConsultaQR]);

    const colaboradoresFiltrados = useMemo(() => {
        const termo = normalizarTextoBusca(busca);

        const filtrados = colaboradoresPorEmpresa.filter((item) => {
            const funcaoItem = String(item.funcao || item.cargo || "Função não informada");

            if (filtroFuncaoQR !== "Todas" && funcaoItem !== String(filtroFuncaoQR)) {
                return false;
            }

            if (!termo) return true;

            const texto = normalizarTextoBusca(
                `${item.nome} ${item.codigoFuncionario} ${item.funcao} ${item.cargo} ${item.empresaExibicao || item.empresa} ${statusGeral(item).texto}`
            );

            return texto.includes(termo);
        });

        return [...filtrados].sort((a, b) => {
            const nomeA = String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR");

            return ordenacaoConsultaQR === "za" ? -nomeA : nomeA;
        });
    }, [busca, colaboradoresPorEmpresa, filtroFuncaoQR, ordenacaoConsultaQR]);

    const colaboradorAtual = useMemo(() => {
        if (!colaboradoresFiltrados.length) return null;

        const selecionado = colaboradoresFiltrados.find((item) =>
            obterIdColaboradorConsulta(item) === String(idColaboradorConsultaSelecionado || "")
        );

        return selecionado || colaboradoresFiltrados[0] || null;
    }, [colaboradoresFiltrados, idColaboradorConsultaSelecionado]);

    useEffect(() => {
        if (!colaboradoresFiltrados.length) return;

        const selecionadoAindaExiste = colaboradoresFiltrados.some((item) =>
            obterIdColaboradorConsulta(item) === String(idColaboradorConsultaSelecionado || "")
        );

        if (selecionadoAindaExiste) return;

        setIdColaboradorConsultaSelecionado(obterIdColaboradorConsulta(colaboradoresFiltrados[0]));
    }, [colaboradoresFiltrados, idColaboradorConsultaSelecionado]);

    const colaboradoresBaseQrMassa = useMemo(() => {
        if (filtroEmpresaQrMassa === "Todas") return colaboradores;

        return colaboradores.filter((item) =>
            String(item.empresaExibicao || item.empresa || "Empresa não informada") === String(filtroEmpresaQrMassa)
        );
    }, [colaboradores, filtroEmpresaQrMassa]);

    const funcoesQrMassa = useMemo(() => {
        const funcoes = colaboradoresBaseQrMassa
            .map((item) => item.funcao || item.cargo || "Função não informada")
            .filter(Boolean);

        return Array.from(new Set(funcoes)).sort((a, b) => a.localeCompare(b, "pt-BR"));
    }, [colaboradoresBaseQrMassa]);

    const colaboradoresQrMassaFiltrados = useMemo(() => {
        if (filtroFuncaoQrMassa === "Todas") return colaboradoresBaseQrMassa;

        return colaboradoresBaseQrMassa.filter((item) =>
            String(item.funcao || item.cargo || "Função não informada") === String(filtroFuncaoQrMassa)
        );
    }, [colaboradoresBaseQrMassa, filtroFuncaoQrMassa]);

    useEffect(() => {
        if (filtroFuncaoQrMassa === "Todas") return;
        if (funcoesQrMassa.includes(filtroFuncaoQrMassa)) return;

        setFiltroFuncaoQrMassa("Todas");
    }, [filtroFuncaoQrMassa, funcoesQrMassa]);

    const obterIdColaboradorQrMassa = (item = {}) =>
        String(item.id || item.token || item.codigoFuncionario || item.nome || "");

    const idsFiltradosQrMassa = useMemo(() => new Set(
        colaboradoresQrMassaFiltrados
            .map((item) => obterIdColaboradorQrMassa(item))
            .filter(Boolean)
    ), [colaboradoresQrMassaFiltrados]);

    const colaboradoresQrMassaSelecionados = useMemo(() => {
        const idsSelecionados = new Set(idsColaboradoresQrMassaSelecionados);

        return colaboradoresQrMassaFiltrados.filter((item) =>
            idsSelecionados.has(obterIdColaboradorQrMassa(item))
        );
    }, [colaboradoresQrMassaFiltrados, idsColaboradoresQrMassaSelecionados]);

    useEffect(() => {
        setIdsColaboradoresQrMassaSelecionados((idsAtuais) =>
            idsAtuais.filter((id) => idsFiltradosQrMassa.has(id))
        );
    }, [idsFiltradosQrMassa]);

    const selecionarTodosQrMassaFiltrados = () => {
        setIdsColaboradoresQrMassaSelecionados(
            colaboradoresQrMassaFiltrados
                .map((item) => obterIdColaboradorQrMassa(item))
                .filter(Boolean)
        );
    };

    const limparSelecaoQrMassa = () => {
        setIdsColaboradoresQrMassaSelecionados([]);
    };

    const alternarSelecaoColaboradorQrMassa = (item = {}) => {
        const id = obterIdColaboradorQrMassa(item);
        if (!id) return;

        setIdsColaboradoresQrMassaSelecionados((idsAtuais) =>
            idsAtuais.includes(id)
                ? idsAtuais.filter((idAtual) => idAtual !== id)
                : [...idsAtuais, id]
        );
    };

    const totalColaboradoresCarregados = colaboradores.length;
    const totalColaboradoresEmpresa = colaboradoresPorEmpresa.length;

    const topoConsultaQr = (
        <>
            <Header
                titulo="Consulta por QR Code"
                subtitulo={null}
            />

            <section className="empresas-hero-banner">
                <div
                    className="empresas-hero-banner__bg"
                    style={{
                        backgroundImage: `url(${dashboardHeroBackground})`,
                    }}
                />
                <div className="empresas-hero-banner__overlay" />
                <div className="empresas-hero-banner__content">
                    <div className="min-w-0">
                        <p className="empresas-hero-banner__eyebrow">SAFESCAN BRASIL</p>
                        <h2 className="empresas-hero-banner__title">
                            Consulta pública por QR Code
                        </h2>
                        <p className="empresas-hero-banner__text">
                            Consulte, copie e imprima QR Codes individuais ou em massa.
                        </p>
                    </div>
                </div>
            </section>
        </>
    );


    if (!colaboradorAtual) {
        return (
            <div className="consulta-qr-page">
                            {topoConsultaQr}


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

    const contatoEmergenciaNome = colaboradorAtual.contatoEmergenciaNome || colaboradorAtual.contato_emergencia_nome || "";
    const contatoEmergenciaParentesco = colaboradorAtual.contatoEmergenciaParentesco || colaboradorAtual.contato_emergencia_parentesco || "";
    const contatoEmergenciaTelefone = colaboradorAtual.contatoEmergenciaTelefone || colaboradorAtual.contato_emergencia_telefone || "";
    const telefoneEmergenciaLimpo = String(contatoEmergenciaTelefone || "").replace(/\D/g, "");
    const temContatoEmergencia = Boolean(
        contatoEmergenciaNome ||
        contatoEmergenciaParentesco ||
        contatoEmergenciaTelefone
    );

    const estadoObraTextoBruto = String(
        colaboradorAtual.statusMobilizacao ||
        colaboradorAtual.status_mobilizacao ||
        "Mobilizado"
    ).trim();

    const estadoObraTexto = estadoObraTextoBruto || "Mobilizado";
    const estadoObraBusca = normalizarTextoBusca(estadoObraTexto);
    const estadoObraClasse =
        estadoObraBusca.includes("bloquead") || estadoObraBusca.includes("imped")
            ? "border-red-100 bg-red-50 text-red-700"
            : estadoObraBusca.includes("desmobil") || estadoObraBusca.includes("inativ")
                ? "border-slate-200 bg-slate-50 text-slate-600"
                : estadoObraBusca.includes("analise") || estadoObraBusca.includes("aguard")
                    ? "border-amber-100 bg-amber-50 text-amber-700"
                    : "border-emerald-100 bg-emerald-50 text-emerald-700";
    const urlConsultaColaborador = montarUrlConsultaColaborador(colaboradorAtual);
    const copiarLinkPublicoColaborador = async () => {
        if (!urlConsultaColaborador) return;

        try {
            if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(urlConsultaColaborador);
            } else if (typeof document !== "undefined") {
                const campoTemporario = document.createElement("textarea");
                campoTemporario.value = urlConsultaColaborador;
                campoTemporario.setAttribute("readonly", "readonly");
                campoTemporario.style.position = "fixed";
                campoTemporario.style.left = "-9999px";
                document.body.appendChild(campoTemporario);
                campoTemporario.select();
                document.execCommand("copy");
                document.body.removeChild(campoTemporario);
            }

            setLinkPublicoCopiado(true);
            setTimeout(() => setLinkPublicoCopiado(false), 1800);
        } catch {
            setLinkPublicoCopiado(false);
        }
    };

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
        if (!colaboradoresQrMassaSelecionados.length) return;

        const elemento = document.getElementById(idImpressaoLoteColaboradores);
        if (!elemento) return;

        const janela = window.open("", "_blank", "width=980,height=760");
        if (!janela) return;

        const titulo = filtroEmpresaQrMassa === "Todas"
            ? "QR Codes dos funcionários"
            : `QR Codes - ${filtroEmpresaQrMassa}`;

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
                        {topoConsultaQr}


                                                            <Card className="relative mb-5 overflow-hidden rounded-[26px] border border-slate-200 bg-white p-0 shadow-sm">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-400 via-blue-500 to-emerald-500" />

                <div
                    className="select-none px-4 py-2.5 md:px-5 md:py-3"
                    onClick={(evento) => {
                        const alvoInterativo = evento.target.closest?.("button, input, select, textarea, a, label, [role='button']");
                        if (alvoInterativo) return;

                        setFiltrosConsultaQrAbertos((aberto) => !aberto);
                    }}
                >
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                        <div className="flex min-w-0 flex-col gap-1.5 lg:flex-row lg:items-center">
                            <div className="flex min-w-0 items-center gap-2">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100">
                                    <Search className="h-4 w-4" />
                                </span>

                                <div className="min-w-0">
                                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                                        Consulta de funcionários
                                    </p>
                                    <h2 className="mt-0.5 text-base font-black text-slate-950">
                                        Pesquisar e filtrar QR Codes
                                    </h2>
                                </div>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={(evento) => {
                                evento.stopPropagation();
                                setFiltrosConsultaQrAbertos((aberto) => !aberto);
                            }}
                            className="inline-flex w-full items-center justify-center rounded-2xl bg-white px-4 py-1.5 text-xs font-black text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50 sm:w-auto"
                        >
                            {filtrosConsultaQrAbertos ? "Fechar" : "Abrir"}
                        </button>
                    </div>

                    {filtrosConsultaQrAbertos && (
                        <>
                            <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] font-bold text-slate-500">
                                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-slate-700">
                                    {colaboradoresFiltrados.length} encontrado(s)
                                </span>
                                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-slate-700">
                                    {totalColaboradoresEmpresa} na empresa/filtro
                                </span>
                                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-slate-700">
                                    {filtroFuncaoQR === "Todas" ? "Função: todas" : "Função: " + filtroFuncaoQR}
                                </span>
                            </div>

                            <div className="mt-3 grid gap-3 xl:grid-cols-[1fr_280px_260px_180px] xl:items-end">
                                <label className="block cursor-default" onClick={(evento) => evento.stopPropagation()}>
                                    <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                                        Pesquisar funcionário
                                    </span>
                                    <div className="relative">
                                        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                        <input
                                            value={busca}
                                            onChange={(evento) => setBusca(evento.target.value)}
                                            placeholder="Pesquisar por nome, código, função ou empresa"
                                            className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50/70 pl-11 pr-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100"
                                        />
                                    </div>
                                </label>

                                <label className="block cursor-default" onClick={(evento) => evento.stopPropagation()}>
                                    <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                                        Filtrar por empresa
                                    </span>
                                    <select
                                        value={filtroEmpresaQR}
                                        onChange={(evento) => setFiltroEmpresaQR(evento.target.value)}
                                        className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100"
                                    >
                                        <option value="Todas">Todas as empresas</option>
                                        {empresasConsultaQR.map((empresa) => (
                                            <option key={empresa} value={empresa}>
                                                {empresa}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label className="block cursor-default" onClick={(evento) => evento.stopPropagation()}>
                                    <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                                        Filtrar por função
                                    </span>
                                    <select
                                        value={filtroFuncaoQR}
                                        onChange={(evento) => setFiltroFuncaoQR(evento.target.value)}
                                        className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100"
                                    >
                                        <option value="Todas">Todas as funções</option>
                                        {funcoesConsultaQR.map((funcao) => (
                                            <option key={funcao} value={funcao}>
                                                {funcao}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label className="block cursor-default" onClick={(evento) => evento.stopPropagation()}>
                                    <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                                        Ordenar
                                    </span>
                                    <select
                                        value={ordenacaoConsultaQR}
                                        onChange={(evento) => setOrdenacaoConsultaQR(evento.target.value)}
                                        className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100"
                                    >
                                        <option value="az">A-Z</option>
                                        <option value="za">Z-A</option>
                                    </select>
                                </label>
                            </div>

                            <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
                                <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                                            Funcionários encontrados
                                        </p>
                                        <p className="text-xs font-semibold text-slate-500">
                                            Clique em um funcionário para carregar o QR Code individual.
                                        </p>
                                    </div>
                                    <span className="inline-flex w-fit rounded-full bg-white px-3 py-1 text-xs font-black text-slate-700 ring-1 ring-slate-200">
                                        {colaboradoresFiltrados.length} resultado(s)
                                    </span>
                                </div>

                                {colaboradoresFiltrados.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-6 text-center">
                                        <Search className="mx-auto h-8 w-8 text-slate-300" />
                                        <p className="mt-2 text-sm font-black text-slate-900">
                                            Nenhum funcionário encontrado
                                        </p>
                                        <p className="mt-1 text-xs font-semibold text-slate-500">
                                            Ajuste a busca, empresa ou função para localizar o colaborador.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                        {colaboradoresFiltrados.slice(0, 24).map((item) => {
                                            const idItemLista = obterIdColaboradorConsulta(item);
                                            const idAtualLista = obterIdColaboradorConsulta(colaboradorAtual);
                                            const itemAtivo = idItemLista === idAtualLista;

                                            return (
                                                <button
                                                    key={idItemLista}
                                                    type="button"
                                                    onClick={(evento) => {
                                                        evento.stopPropagation();
                                                        setIdColaboradorConsultaSelecionado(idItemLista);
                                                        onSelecionarColaborador?.(item);
                                                    }}
                                                    className={classNames(
                                                        "flex items-center gap-3 rounded-2xl border px-3 py-2 text-left transition",
                                                        itemAtivo
                                                            ? "border-slate-950 bg-white shadow-sm"
                                                            : "border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-100"
                                                    )}
                                                >
                                                    <span className={classNames(
                                                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1",
                                                        itemAtivo
                                                            ? "bg-slate-950 text-white ring-slate-950"
                                                            : "bg-slate-50 text-slate-500 ring-slate-200"
                                                    )}>
                                                        {itemAtivo ? <Check className="h-4 w-4" /> : <QrCode className="h-4 w-4" />}
                                                    </span>

                                                    <span className="min-w-0">
                                                        <span className="block truncate text-xs font-black uppercase text-slate-950">
                                                            {item.nome || "Colaborador sem nome"}
                                                        </span>
                                                        <span className="block truncate text-[11px] font-bold uppercase text-slate-500">
                                                            {item.funcao || item.cargo || "Função não informada"}
                                                        </span>
                                                        <span className="block truncate text-[11px] font-semibold text-slate-400">
                                                            {item.empresaExibicao || item.empresa || "Empresa não informada"}
                                                        </span>
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}

                                {colaboradoresFiltrados.length > 24 && (
                                    <p className="mt-3 rounded-2xl bg-white px-4 py-2 text-center text-xs font-bold text-slate-500 ring-1 ring-slate-100">
                                        Exibindo os 24 primeiros de {colaboradoresFiltrados.length} resultado(s). Refine a busca para localizar mais rápido.
                                    </p>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </Card>
            <div className="consulta-qr-card w-full rounded-[2rem] border border-slate-100 bg-white p-0 shadow-lg ring-1 ring-slate-100/80">
                <div className="rounded-[1.5rem] bg-white p-4 sm:p-5 md:p-6">
                                        <div className="grid w-full gap-2 rounded-[1.25rem] bg-white lg:grid-cols-[560px_minmax(0,1fr)_16cm_minmax(0,1fr)_124px_118px] lg:items-center">
                        <div className="flex min-w-0 items-center justify-start gap-3 pl-0 pr-4 lg:border-r lg:border-slate-200">
                            <div className="flex shrink-0 flex-col items-center gap-1.5">

                                <FotoColaborador

                                    src={colaboradorAtual}

                                    colaborador={colaboradorAtual}

                                    colaboradorId={colaboradorAtual.id}

                                    nome={colaboradorAtual.nome}

                                    className="h-[88px] w-[88px] shrink-0 rounded-3xl border-4 border-white object-cover shadow-lg ring-1 ring-slate-200"

                                    iconClassName="h-9 w-9"

                                />


                                <span className={classNames(

                                    "inline-flex max-w-[104px] items-center justify-center truncate rounded-2xl border px-3 py-1 text-[10px] font-black uppercase tracking-[0.08em]",

                                    estadoObraClasse

                                )}>

                                    {estadoObraTexto}

                                </span>

                            </div>

                            <div className="min-w-0">
                                <div className="flex min-w-0 items-center gap-2">
                                    <h2 className="shrink-0 whitespace-nowrap text-lg font-black leading-tight tracking-tight text-slate-950 sm:text-xl">
                                        {colaboradorAtual.nome}
                                    </h2>

                                    <div className="relative shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => setContatoEmergenciaAberto((aberto) => !aberto)}
                                            className={classNames(
                                                "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-2xl border px-3 py-1.5 text-[10px] font-black transition",
                                                temContatoEmergencia
                                                    ? "border-red-100 bg-red-50 text-red-700 hover:bg-red-100"
                                                    : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100"
                                            )}
                                        >
                                            <PhoneCall className="h-3.5 w-3.5" />
                                            Emergência
                                            <ChevronDown
                                                className={classNames(
                                                    "h-3.5 w-3.5 transition",
                                                    contatoEmergenciaAberto && "rotate-180"
                                                )}
                                            />
                                        </button>

                                        {contatoEmergenciaAberto && (
                                            <div className="absolute left-0 top-full z-20 mt-2 w-[185px] rounded-2xl border border-red-100 bg-red-50/95 px-3 py-2 text-[10px] shadow-lg">
                                                {temContatoEmergencia ? (
                                                    <div className="space-y-0.5">
                                                        <p className="truncate font-black text-slate-950">
                                                            {contatoEmergenciaNome || "Contato de emergência"}
                                                        </p>
                                                        {contatoEmergenciaParentesco && (
                                                            <p className="font-semibold text-slate-500">
                                                                Parentesco: {contatoEmergenciaParentesco}
                                                            </p>
                                                        )}
                                                        {contatoEmergenciaTelefone && (
                                                            <a
                                                                href={`tel:${telefoneEmergenciaLimpo}`}
                                                                className="inline-flex font-black text-red-700 hover:text-red-800"
                                                            >
                                                                {contatoEmergenciaTelefone}
                                                            </a>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <p className="font-semibold text-slate-500">
                                                        Contato de emergência não cadastrado.
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-2.5 space-y-1.5 text-xs font-black uppercase text-slate-500">
                                    <p className="flex items-center gap-2">
                                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-slate-100 text-slate-500">
                                            <ClipboardCheck className="h-3.5 w-3.5" />
                                        </span>
                                        {colaboradorAtual.funcao}
                                    </p>
                                    <p className="flex items-center gap-2">
                                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-slate-100 text-slate-500">
                                            <CardIconSafe />
                                        </span>
                                        {colaboradorAtual.empresaExibicao || colaboradorAtual.empresa}
                                    </p>
                                    <p className="flex items-center gap-2">
                                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-slate-100 text-slate-500">
                                            <QrCode className="h-3.5 w-3.5" />
                                        </span>
                                        Código: {colaboradorAtual.codigoFuncionario}
                                    </p>
                                </div>

                                <ColaboradorIdentificacoesSeguranca
                                    colaborador={colaboradorAtual}
                                    treinamentos={treinamentos}
                                    className="mt-2.5"
                                />
                            </div>
                        </div>

                        <div className={classNames("flex min-h-[2.5cm] w-[16cm] max-w-full items-center rounded-3xl px-5 py-3 shadow-sm lg:col-start-3 lg:self-center lg:justify-self-center", geral.texto === "Liberado" ? "border border-emerald-100 bg-emerald-50/70" : "border border-red-100 bg-red-50/60")}>
                            <div className="flex w-full items-center justify-center gap-6">
                                <div className="flex min-w-0 items-center gap-3">
                                    <span className={classNames("inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl", geral.texto === "Liberado" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700")}>
                                        <ShieldCheck className="h-4 w-4" />
                                    </span>
                                    <div className="min-w-0">
                                        <p className="text-xs font-black text-slate-500">
                                            Status geral do colaborador
                                        </p>
                                        <h3 className="mt-0.5 truncate whitespace-nowrap text-xs font-black leading-snug text-slate-950 sm:text-sm">
                                            {geral.detalhe}
                                        </h3>
                                    </div>
                                </div>

                                <span className={classNames("inline-flex min-w-[112px] shrink-0 items-center justify-center rounded-2xl px-5 py-2.5 text-xs font-black", geral.classe)}>
                                    {geral.texto}
                                </span>
                            </div>
                        </div>

                        <div className="flex w-full justify-center lg:col-start-5 lg:justify-center lg:border-l lg:border-slate-200 lg:pl-6">
                            <div className="flex items-center justify-center rounded-xl border border-slate-100 bg-white p-1 shadow-sm">
                                <QrCodeComLogo value={urlConsultaColaborador} size={112} level="H" includeMargin bgColor="#ffffff" fgColor="#0f172a" logoRatio={0.22} />
                            </div>
                        </div>

                        <div className="flex w-full justify-center lg:col-start-6 lg:justify-start lg:pl-3">
                            <div className="flex h-[108px] w-[118px] shrink-0 flex-col justify-center gap-3">
                                <button
                                    type="button"
                                    onClick={copiarLinkPublicoColaborador}
                                    disabled={!urlConsultaColaborador}
                                    className={classNames(
                                        "inline-flex min-h-[1.3cm] w-full items-center justify-center gap-1.5 rounded-2xl px-2.5 py-2 text-[10px] font-black ring-1 transition",
                                        linkPublicoCopiado
                                            ? "bg-emerald-600 text-white ring-emerald-600"
                                            : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50",
                                        !urlConsultaColaborador && "cursor-not-allowed opacity-50"
                                    )}
                                >
                                    {linkPublicoCopiado ? <Check className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
                                    {linkPublicoCopiado ? "Copiado" : "Copiar link"}
                                </button>

                                <button
                                    type="button"
                                    onClick={imprimirQrColaborador}
                                    className="inline-flex min-h-[1.3cm] w-full items-center justify-center gap-1.5 rounded-2xl bg-slate-950 px-2.5 py-2 text-[10px] font-black text-white ring-1 ring-slate-950 transition hover:bg-slate-800"
                                >
                                    <Download className="h-3.5 w-3.5" />
                                    Imprimir QR
                                </button>


                            </div>
                        </div>

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
                                    {colaboradoresQrMassaSelecionados.map((item) => (
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
</div>
            </div>

<Card className="relative mt-10 mb-5 w-full overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-400 via-blue-500 to-emerald-500" />

                <div
                    className="select-none px-4 py-3 md:px-5 md:py-3"
                    onClick={(evento) => {
                        const alvoInterativo = evento.target.closest?.("button, input, select, textarea, a, label, [role='button']");
                        if (alvoInterativo) return;

                        setQrMassaAberto((aberto) => !aberto);
                    }}
                >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100">
                                <QrCode className="h-4.5 w-4.5" />
                            </span>

                            <div>
                                <h3 className="text-base font-black text-slate-950">
                                    Impressão de QR em massa
                                </h3>

                                <p className="mt-0.5 text-sm font-semibold leading-relaxed text-slate-600">
                                    Usa filtros próprios de empresa e função para imprimir vários funcionários de uma vez.
                                </p>

                                {qrMassaAberto && (
                                    <p className="mt-1.5 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                                        Imprimir QRs selecionados
                                    </p>
                                )}
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={(evento) => {
                                evento.stopPropagation();
                                setQrMassaAberto((aberto) => !aberto);
                            }}
                            className="inline-flex w-full items-center justify-center rounded-2xl bg-white px-4 py-2 text-xs font-black text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50 sm:w-auto"
                        >
                            {qrMassaAberto ? "Fechar" : "Abrir"}
                        </button>
                    </div>

                    {qrMassaAberto && (
                        <>
                            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">
                                <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                                    {colaboradoresQrMassaSelecionados.length} selecionado(s) para impressão
                                </span>
                                <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                                    {colaboradoresQrMassaFiltrados.length} disponível(is) pelos filtros
                                </span>
                                <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                                    {filtroEmpresaQrMassa === "Todas" ? "Empresa: todas" : "Empresa: " + filtroEmpresaQrMassa}
                                </span>
                                <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                                    {filtroFuncaoQrMassa === "Todas" ? "Função: todas" : "Função: " + filtroFuncaoQrMassa}
                                </span>
                            </div>

                            <div className="mt-4 grid gap-3 md:grid-cols-2">
                                <label className="block cursor-default" onClick={(evento) => evento.stopPropagation()}>
                                    <span className="mb-1 block text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                                        Filtrar por empresa
                                    </span>
                                    <select
                                        value={filtroEmpresaQrMassa}
                                        onChange={(evento) => setFiltroEmpresaQrMassa(evento.target.value)}
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                    >
                                        <option value="Todas">Todas as empresas</option>
                                        {empresasConsultaQR.map((empresa) => (
                                            <option key={empresa} value={empresa}>
                                                {empresa}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label className="block cursor-default" onClick={(evento) => evento.stopPropagation()}>
                                    <span className="mb-1 block text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                                        Filtrar por função
                                    </span>
                                    <select
                                        value={filtroFuncaoQrMassa}
                                        onChange={(evento) => setFiltroFuncaoQrMassa(evento.target.value)}
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                    >
                                        <option value="Todas">Todas as funções</option>
                                        {funcoesQrMassa.map((funcao) => (
                                            <option key={funcao} value={funcao}>
                                                {funcao}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            </div>

                            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                                <button
                                    type="button"
                                    onClick={(evento) => {
                                        evento.stopPropagation();
                                        selecionarTodosQrMassaFiltrados();
                                    }}
                                    disabled={colaboradoresQrMassaFiltrados.length === 0}
                                    className="inline-flex w-full items-center justify-center rounded-2xl bg-white px-4 py-2 text-xs font-black text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                                >
                                    Selecionar todos disponíveis ({colaboradoresQrMassaFiltrados.length})
                                </button>

                                <button
                                    type="button"
                                    onClick={(evento) => {
                                        evento.stopPropagation();
                                        limparSelecaoQrMassa();
                                    }}
                                    disabled={idsColaboradoresQrMassaSelecionados.length === 0}
                                    className="inline-flex w-full items-center justify-center rounded-2xl bg-white px-4 py-2 text-xs font-black text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                                >
                                    Limpar seleção
                                </button>

                                <button
                                    type="button"
                                    onClick={(evento) => {
                                        evento.stopPropagation();
                                        imprimirQrColaboradoresEmLote();
                                    }}
                                    disabled={colaboradoresQrMassaSelecionados.length === 0}
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-xs font-black text-white ring-1 ring-slate-950 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                                >
                                    <Download className="h-4 w-4" />
                                    Imprimir QRs selecionados ({colaboradoresQrMassaSelecionados.length})
                                </button>
                            </div>

                            <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
                                <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                                            Colaboradores selecionados
                                        </p>
                                        <p className="text-xs font-semibold text-slate-500">
                                            A impressão será gerada somente com os colaboradores selecionados abaixo.
                                        </p>
                                    </div>
                                    <span className="inline-flex w-fit rounded-full bg-white px-3 py-1 text-xs font-black text-slate-700 ring-1 ring-slate-200">
                                        {colaboradoresQrMassaSelecionados.length} selecionado(s)
                                    </span>
                                </div>

                                {colaboradoresQrMassaSelecionados.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-6 text-center">
                                        <QrCode className="mx-auto h-8 w-8 text-slate-300" />
                                        <p className="mt-2 text-sm font-black text-slate-900">
                                            Nenhum colaborador selecionado
                                        </p>
                                        <p className="mt-1 text-xs font-semibold text-slate-500">
                                            Use “Selecionar todos disponíveis” para incluir os resultados atuais na impressão.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                                        {colaboradoresQrMassaSelecionados.slice(0, 8).map((item) => {
                                            const idItemQrMassa = obterIdColaboradorQrMassa(item);

                                            return (
                                                <button
                                                    key={idItemQrMassa}
                                                    type="button"
                                                    onClick={(evento) => {
                                                        evento.stopPropagation();
                                                        alternarSelecaoColaboradorQrMassa(item);
                                                    }}
                                                    className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-left transition hover:bg-emerald-100"
                                                >
                                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-700 ring-1 ring-emerald-200">
                                                        <Check className="h-4 w-4" />
                                                    </span>
                                                    <span className="min-w-0">
                                                        <span className="block truncate text-xs font-black uppercase text-slate-950">
                                                            {item.nome || "Colaborador sem nome"}
                                                        </span>
                                                        <span className="block truncate text-[11px] font-bold uppercase text-slate-500">
                                                            {item.funcao || item.cargo || "Função não informada"}
                                                        </span>
                                                    </span>
                                                    <span className="ml-auto shrink-0 text-[10px] font-black uppercase text-emerald-700">
                                                        Remover
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {colaboradoresQrMassaSelecionados.length > 8 && (
                                <p className="mt-3 rounded-2xl bg-slate-50 px-4 py-2 text-center text-xs font-bold text-slate-500">
                                    Prévia limitada aos 8 primeiros selecionados. A impressão incluirá todos os {colaboradoresQrMassaSelecionados.length} colaborador(es) selecionado(s).
                                </p>
                            )}
                        </>
                    )}
                </div>
            </Card>
        </div>
    );
}

export function ConsultaQR(props) {
    const modoMobile = useDispositivoMobile();

    return modoMobile ? <ScannerQrMobile /> : <ConsultaQRDesktop {...props} />;
}
