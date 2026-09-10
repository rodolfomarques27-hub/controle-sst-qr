import React from "react";
import {
    ArrowLeft,
    BadgeCheck,
    CalendarClock,
    ChevronRight,
    CircleAlert,
    FileDown,
    FileText,
    History,
    LoaderCircle,
    ShieldCheck,
    X,
} from "lucide-react";
import treinamentosHeroBackground from "../../assets/dashboard-hero-sst.png";
import {
    listarHistoricoRevisoesTreinamentosService,
    obterHistoricoRevisaoTreinamentosService,
} from "../../services/treinamentosRevisaoService";
import {
    criarUrlAssinadaStorage,
} from "../../services/supabaseServices";

function textoSeguro(valor = "") {
    return String(valor ?? "").trim();
}

function formatarDataHora(valor = "") {
    const texto = textoSeguro(valor);
    if (!texto) return "-";

    const data = new Date(texto);
    if (Number.isNaN(data.getTime())) return texto;

    return data.toLocaleString("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
    });
}

function formatarData(valor = "") {
    const texto = textoSeguro(valor);
    if (!texto) return "-";

    const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(texto);
    if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;

    return formatarDataHora(texto);
}

function formatarPercentual(valor = 0) {
    const numero = Number(valor);
    if (!Number.isFinite(numero)) return "0%";

    return `${numero.toLocaleString("pt-BR", {
        minimumFractionDigits: numero % 1 === 0 ? 0 : 1,
        maximumFractionDigits: 2,
    })}%`;
}

function rotuloResultado(resultado = "") {
    const chave = textoSeguro(resultado).toLowerCase();
    const rotulos = {
        conforme: "Conforme",
        atencao: "Atenção",
        vencido: "Vencido",
        divergente: "Divergente",
        sem_evidencia_suficiente: "Sem evidência suficiente",
        revisao_manual_necessaria: "Revisão manual necessária",
    };
    return rotulos[chave] || textoSeguro(resultado) || "Não classificado";
}

function classeResultado(resultado = "") {
    const chave = textoSeguro(resultado).toLowerCase();
    if (chave === "conforme") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    if (chave === "atencao") return "bg-amber-50 text-amber-800 ring-amber-200";
    if (chave === "vencido") return "bg-red-50 text-red-700 ring-red-200";
    if (chave === "divergente") return "bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200";
    if (chave === "revisao_manual_necessaria") return "bg-orange-50 text-orange-800 ring-orange-200";
    return "bg-slate-100 text-slate-700 ring-slate-200";
}

function ResumoRevisaoHistorica({ revisao }) {
    const indicadores = [
        ["Conformes", revisao?.totalConformes, "text-emerald-700"],
        ["Atenção", revisao?.totalAtencao, "text-amber-700"],
        ["Vencidos", revisao?.totalVencidos, "text-red-700"],
        ["Divergentes", revisao?.totalDivergentes, "text-fuchsia-700"],
        ["Sem evidência", revisao?.totalSemEvidencia, "text-slate-700"],
        ["Revisão manual", revisao?.totalRevisaoManual, "text-orange-700"],
    ];

    return (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {indicadores.map(([rotulo, valor, classe]) => (
                <div key={rotulo} className="rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-100">
                    <p className={`text-lg font-black tabular-nums ${classe}`}>{Number(valor || 0)}</p>
                    <p className="mt-0.5 text-[9px] font-black uppercase tracking-[0.06em] text-slate-500">
                        {rotulo}
                    </p>
                </div>
            ))}
        </div>
    );
}

function ListaHistorico({
    revisoes = [],
    onAbrir,
    onPrevisualizarPdf,
    onConfirmarEmissaoPdf,
    onAbrirPdf,
    pdfEmAndamentoId = "",
    pdfPendenteRevisaoId = "",
    pdfBloqueadoId = "",
}) {
    if (revisoes.length === 0) {
        return (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center">
                <History className="mx-auto h-7 w-7 text-slate-400" />
                <p className="mt-3 text-sm font-black text-slate-700">Nenhuma revisão concluída</p>
                <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                    As prévias não entram no histórico. Somente revisões explicitamente concluídas são versionadas.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {revisoes.map((revisao) => (
                <article
                    key={revisao.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                    <div className="flex flex-col gap-3 sm:flex-row sm:flex-nowrap sm:items-start sm:justify-between sm:gap-1.5">
                        <div className="min-w-0 sm:flex-none">
                            <div className="flex flex-wrap items-center gap-1.5 sm:flex-nowrap sm:whitespace-nowrap">
                                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.05em] text-emerald-700 ring-1 ring-emerald-200">
                                    <BadgeCheck className="h-3 w-3" />
                                    Revisão #{Number(revisao.numeroRevisao || 0)}
                                </span>
                                <span className="inline-flex shrink-0 items-center rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-black text-slate-600 ring-1 ring-slate-200">
                                    {Number(revisao.totalTreinamentos || 0)} treinamento(s)
                                </span>
                            </div>
                            <p className="mt-3 text-3xl font-black tabular-nums tracking-tight text-slate-950">
                                {formatarPercentual(revisao.percentualConformidade)}
                            </p>
                            <p className="mt-1 text-xs font-semibold text-slate-500">
                                Conformidade registrada em {formatarDataHora(revisao.createdAt)}
                            </p>
                            <p className="mt-1 break-words text-[11px] font-semibold text-slate-500">
                                Responsável: {textoSeguro(revisao.executadoPorEmail) || "Não informado"}
                            </p>
                        </div>

                        <div className="flex shrink-0 flex-wrap items-center gap-1 sm:flex-nowrap sm:whitespace-nowrap">
                            {!revisao.pdfDisponivel && (
                                <button
                                    type="button"
                                    onClick={() => onPrevisualizarPdf?.(revisao)}
                                    disabled={Boolean(pdfEmAndamentoId) || pdfBloqueadoId === revisao.id}
                                    className="inline-flex shrink-0 items-center justify-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-2 text-[11px] font-black text-emerald-800 ring-1 ring-emerald-200 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                                    title="Gerar uma prévia local do PDF sem registrar arquivo no histórico."
                                >
                                    {pdfEmAndamentoId === revisao.id ? (
                                        <LoaderCircle className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <FileDown className="h-4 w-4" />
                                    )}
                                    {pdfEmAndamentoId === revisao.id
                                        ? "Processando PDF..."
                                        : pdfPendenteRevisaoId === revisao.id
                                            ? "Reabrir prévia"
                                            : "Pré-visualizar PDF"}
                                </button>
                            )}

                            {!revisao.pdfDisponivel &&
                                pdfPendenteRevisaoId === revisao.id &&
                                pdfBloqueadoId !== revisao.id && (
                                    <button
                                        type="button"
                                        onClick={() => onConfirmarEmissaoPdf?.(revisao)}
                                        disabled={Boolean(pdfEmAndamentoId)}
                                        className="inline-flex shrink-0 items-center justify-center gap-1 rounded-lg bg-emerald-700 px-2.5 py-2 text-[11px] font-black text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                                        title="Registrar definitivamente no histórico exatamente os bytes exibidos na prévia local."
                                    >
                                        {pdfEmAndamentoId === revisao.id ? (
                                            <LoaderCircle className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <ShieldCheck className="h-4 w-4" />
                                        )}
                                        {pdfEmAndamentoId === revisao.id
                                            ? "Processando PDF..."
                                            : "Confirmar emissão definitiva"}
                                    </button>
                                )}

                            {!revisao.pdfDisponivel && pdfBloqueadoId === revisao.id && (
                                <span className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-50 px-4 py-2.5 text-xs font-black text-amber-800 ring-1 ring-amber-200">
                                    <CircleAlert className="h-4 w-4" />
                                    Auditoria necessária
                                </span>
                            )}

                            {revisao.pdfDisponivel && (
                                <button
                                    type="button"
                                    onClick={() => onAbrirPdf?.(revisao)}
                                    disabled={Boolean(pdfEmAndamentoId)}
                                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-xs font-black text-emerald-800 ring-1 ring-emerald-200 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                                    title="Abrir o PDF histórico persistido por URL temporária assinada."
                                >
                                    {pdfEmAndamentoId === revisao.id ? (
                                        <LoaderCircle className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <FileText className="h-4 w-4" />
                                    )}
                                    Abrir PDF
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={() => onAbrir?.(revisao.id)}
                                disabled={Boolean(pdfEmAndamentoId)}
                                className="inline-flex shrink-0 items-center justify-center gap-1 rounded-lg bg-slate-950 px-2.5 py-2 text-[11px] font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                Abrir revisão
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    <div className="mt-4">
                        <ResumoRevisaoHistorica revisao={revisao} />
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] font-bold text-slate-500">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 ring-1 ring-slate-200">
                            <CalendarClock className="h-3.5 w-3.5" />
                            Referência {formatarData(revisao.dataReferencia)}
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 ring-1 ring-slate-200">
                            <FileText className="h-3.5 w-3.5" />
                            {revisao.pdfDisponivel
                                ? "PDF disponível"
                                : pdfBloqueadoId === revisao.id
                                    ? "PDF ainda não gerado — emissão bloqueada para auditoria"
                                    : pdfPendenteRevisaoId === revisao.id
                                        ? "PDF ainda não gerado — prévia pronta, emissão pendente"
                                        : "PDF ainda não gerado"}
                        </span>
                    </div>
                </article>
            ))}
        </div>
    );
}

function DetalheHistorico({ detalhe, onVoltar }) {
    const revisao = detalhe?.revisao || {};
    const itens = Array.isArray(detalhe?.itens) ? detalhe.itens : [];

    return (
        <div>
            <button
                type="button"
                onClick={onVoltar}
                className="mb-4 inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
            >
                <ArrowLeft className="h-4 w-4" />
                Voltar ao histórico
            </button>

            <section className="rounded-2xl bg-slate-950 p-4 text-white">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-300">
                            Revisão #{Number(revisao.numeroRevisao || 0)}
                        </p>
                        <p className="mt-1 text-3xl font-black tabular-nums">
                            {formatarPercentual(revisao.percentualConformidade)}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-slate-300">
                            {formatarDataHora(revisao.createdAt)} • {textoSeguro(revisao.executadoPorEmail) || "Responsável não informado"}
                        </p>
                    </div>
                    <div className="text-left sm:text-right">
                        <p className="text-[10px] font-black uppercase tracking-[0.06em] text-slate-400">Treinamentos</p>
                        <p className="mt-1 text-xl font-black tabular-nums">{Number(revisao.totalTreinamentos || 0)}</p>
                    </div>
                </div>
                <div className="mt-4">
                    <ResumoRevisaoHistorica revisao={revisao} />
                </div>
            </section>

            <div className="mt-4 space-y-3">
                {itens.map((item) => {
                    const evidencias = Array.isArray(item?.evidencias) ? item.evidencias : [];
                    const divergencias = Array.isArray(item?.divergencias) ? item.divergencias.filter(Boolean) : [];

                    return (
                        <details
                            key={item.id}
                            className="group rounded-2xl border border-slate-200 bg-white shadow-sm"
                        >
                            <summary className="cursor-pointer list-none p-4">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-400">
                                            Treinamento {Number(item.ordem || 0)}
                                        </p>
                                        <p className="mt-1 break-words text-sm font-black text-slate-950">
                                            {textoSeguro(item.nomeTreinamento) || "Treinamento não identificado"}
                                        </p>
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase ring-1 ${classeResultado(item.resultadoGeral)}`}>
                                                {rotuloResultado(item.resultadoGeral)}
                                            </span>
                                            <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-600 ring-1 ring-slate-200">
                                                {evidencias.length} evidência(s)
                                            </span>
                                        </div>
                                    </div>
                                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition group-open:rotate-90" />
                                </div>
                            </summary>

                            <div className="border-t border-slate-200 bg-slate-50/70 p-4">
                                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                                    <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200">
                                        <p className="text-[9px] font-black uppercase text-slate-400">Realização salva</p>
                                        <p className="mt-1 text-xs font-black text-slate-700">{formatarData(item.dataRealizacaoSalva)}</p>
                                    </div>
                                    <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200">
                                        <p className="text-[9px] font-black uppercase text-slate-400">Realização revisada</p>
                                        <p className="mt-1 text-xs font-black text-slate-700">{formatarData(item.dataRealizacaoRevisada)}</p>
                                    </div>
                                    <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200">
                                        <p className="text-[9px] font-black uppercase text-slate-400">Vencimento salvo</p>
                                        <p className="mt-1 text-xs font-black text-slate-700">{formatarData(item.dataVencimentoSalva)}</p>
                                    </div>
                                    <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200">
                                        <p className="text-[9px] font-black uppercase text-slate-400">Vencimento revisado</p>
                                        <p className="mt-1 text-xs font-black text-slate-700">{formatarData(item.dataVencimentoRevisada)}</p>
                                    </div>
                                </div>

                                {divergencias.length > 0 && (
                                    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                                        <p className="text-[10px] font-black uppercase tracking-[0.06em] text-amber-800">Divergências registradas</p>
                                        <div className="mt-2 flex flex-wrap gap-1.5">
                                            {divergencias.map((divergencia) => (
                                                <span key={String(divergencia)} className="rounded-full bg-white px-2 py-1 text-[10px] font-bold text-amber-800 ring-1 ring-amber-200">
                                                    {textoSeguro(divergencia)}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {textoSeguro(item.decisaoHumana) && (
                                    <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800">
                                        Decisão humana: <strong>{textoSeguro(item.decisaoHumana)}</strong>
                                        {textoSeguro(item.observacaoManual) ? ` • ${textoSeguro(item.observacaoManual)}` : ""}
                                    </div>
                                )}

                                <div className="mt-3 space-y-2">
                                    {evidencias.length > 0 ? evidencias.map((evidencia) => (
                                        <div key={evidencia.id} className="rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200">
                                            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                                <p className="break-words text-xs font-black text-slate-700">
                                                    {textoSeguro(evidencia.arquivoNome) || "Evidência sem nome"}
                                                </p>
                                                <span className="text-[10px] font-bold text-slate-500">
                                                    {textoSeguro(evidencia.tipoEvidencia) || "evidência"}
                                                </span>
                                            </div>
                                            <p className="mt-1 text-[10px] font-semibold text-slate-500">
                                                Integridade: {textoSeguro(evidencia.statusIntegridade) || "não informada"}
                                            </p>
                                        </div>
                                    )) : (
                                        <p className="text-xs font-semibold text-slate-500">Nenhuma evidência persistida neste item.</p>
                                    )}
                                </div>
                            </div>
                        </details>
                    );
                })}
            </div>
        </div>
    );
}

export function HistoricoRevisoesTreinamentosDrawer({
    supabase,
    colaborador,
    onFechar,
}) {
    const colaboradorId = textoSeguro(colaborador?.id);
    const [lista, setLista] = React.useState({ carregando: true, revisoes: [], erro: "" });
    const [detalhe, setDetalhe] = React.useState(null);
    const [carregandoDetalhe, setCarregandoDetalhe] = React.useState(false);
    const [erroDetalhe, setErroDetalhe] = React.useState("");
    const [pdfEmAndamentoId, setPdfEmAndamentoId] = React.useState("");
    const [pdfPendente, setPdfPendente] = React.useState(null);
    const [pdfBloqueadoId, setPdfBloqueadoId] = React.useState("");
    const [mensagemPdf, setMensagemPdf] = React.useState("");
    const [erroPdf, setErroPdf] = React.useState("");

    React.useEffect(() => {
        let ativo = true;

        listarHistoricoRevisoesTreinamentosService({
            supabase,
            colaboradorId,
        })
            .then((resultado) => {
                if (!ativo) return;
                setLista({
                    carregando: false,
                    revisoes: Array.isArray(resultado?.revisoes) ? resultado.revisoes : [],
                    erro: "",
                });
            })
            .catch((erro) => {
                if (!ativo) return;
                setLista({
                    carregando: false,
                    revisoes: [],
                    erro: erro?.message || "Não foi possível carregar o histórico de revisões.",
                });
            });

        return () => {
            ativo = false;
        };
    }, [supabase, colaboradorId]);

    React.useEffect(() => {
        const aoTeclado = (evento) => {
            if (evento.key === "Escape" && !carregandoDetalhe && !pdfEmAndamentoId) {
                evento.preventDefault();
                evento.stopPropagation();
                onFechar?.();
            }
        };

        window.addEventListener("keydown", aoTeclado, true);
        return () => window.removeEventListener("keydown", aoTeclado, true);
    }, [carregandoDetalhe, pdfEmAndamentoId, onFechar]);

    const abrirRevisao = async (revisaoId) => {
        if (carregandoDetalhe) return;

        setCarregandoDetalhe(true);
        setErroDetalhe("");

        try {
            const resultado = await obterHistoricoRevisaoTreinamentosService({
                supabase,
                revisaoId,
                colaboradorId,
            });
            setDetalhe(resultado);
        } catch (erro) {
            setDetalhe(null);
            setErroDetalhe(
                erro?.message || "Não foi possível abrir os dados históricos desta revisão."
            );
        } finally {
            setCarregandoDetalhe(false);
        }
    };

    const abrirBlobPdf = (blob, janelaPdf = null) => {
        const urlPdf = URL.createObjectURL(blob);

        if (janelaPdf && !janelaPdf.closed) {
            janelaPdf.location.href = urlPdf;
        } else {
            const link = document.createElement("a");
            link.href = urlPdf;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            link.click();
        }

        window.setTimeout(() => {
            URL.revokeObjectURL(urlPdf);
        }, 120000);
    };

    const abrirJanelaPreparacaoPdf = (mensagem) => {
        const janelaPdf =
            typeof window !== "undefined"
                ? window.open("about:blank", "_blank")
                : null;

        if (janelaPdf) {
            try {
                janelaPdf.opener = null;
                janelaPdf.document.title = "PDF histórico — SafeScan Brasil";
                janelaPdf.document.body.innerHTML =
                    `<p style="font-family:Arial,sans-serif;padding:24px;color:#334155">${mensagem}</p>`;
            } catch {
                // A aba pode restringir acesso ao documento; o fluxo segue normalmente.
            }
        }

        return janelaPdf;
    };

    const recarregarHistoricoPdf = async () => {
        const resultado = await listarHistoricoRevisoesTreinamentosService({
            supabase,
            colaboradorId,
        });

        setLista({
            carregando: false,
            revisoes: Array.isArray(resultado?.revisoes) ? resultado.revisoes : [],
            erro: "",
        });

        return resultado;
    };

    const previsualizarPdf = async (revisao) => {
        const revisaoId = textoSeguro(revisao?.id);
        if (
            !revisaoId ||
            pdfEmAndamentoId ||
            revisao?.pdfDisponivel ||
            pdfBloqueadoId === revisaoId
        ) {
            return;
        }

        setPdfEmAndamentoId(revisaoId);
        setMensagemPdf("");
        setErroPdf("");

        const janelaPdf =
            abrirJanelaPreparacaoPdf(
                pdfPendente?.revisaoId === revisaoId
                    ? "Reabrindo exatamente a prévia já preparada..."
                    : "Preparando prévia local do PDF..."
            );

        try {
            if (
                pdfPendente?.revisaoId === revisaoId &&
                pdfPendente?.pdf?.blob
            ) {
                abrirBlobPdf(
                    pdfPendente.pdf.blob,
                    janelaPdf
                );

                setMensagemPdf(
                    "Prévia reaberta com os mesmos bytes já preparados. Nenhuma escrita remota foi executada."
                );

                return;
            }

            const moduloPdf = await import(
                "../../services/exportacao/relatorioRevisaoTreinamentosService.js"
            );

            const resultado =
                await moduloPdf.prepararPdfRevisaoTreinamentosPorIdService({
                    supabase,
                    revisaoId,
                    colaboradorId,
                });

            setPdfPendente({
                revisaoId,
                revisao,
                pdf: resultado,
            });

            abrirBlobPdf(
                resultado.blob,
                janelaPdf
            );

            setMensagemPdf(
                "Prévia pronta. Revise o arquivo e, somente se estiver correto, use Confirmar emissão definitiva. A confirmação registrará exatamente este Blob, sem nova renderização."
            );
        } catch (erro) {
            try {
                janelaPdf?.close();
            } catch {
                // Sem ação adicional.
            }

            setErroPdf(
                erro?.message ||
                    "Não foi possível gerar a prévia local do PDF desta revisão."
            );
        } finally {
            setPdfEmAndamentoId("");
        }
    };

    const confirmarEmissaoPdf = async (revisao) => {
        const revisaoId = textoSeguro(revisao?.id);
        if (
            !revisaoId ||
            pdfEmAndamentoId ||
            revisao?.pdfDisponivel ||
            pdfBloqueadoId === revisaoId ||
            pdfPendente?.revisaoId !== revisaoId ||
            !pdfPendente?.pdf?.blob
        ) {
            return;
        }

        setPdfEmAndamentoId(revisaoId);
        setMensagemPdf("");
        setErroPdf("");

        try {
            const moduloPersistencia = await import(
                "../../services/treinamentosRevisaoPdfPersistenciaService.js"
            );

            const resultadoPersistencia =
                await moduloPersistencia.persistirPdfRevisaoTreinamentosService({
                    supabase,
                    revisao,
                    pdf: pdfPendente.pdf,
                });

            setPdfPendente(null);
            setPdfBloqueadoId("");

            setLista((estadoAtual) => ({
                ...estadoAtual,
                revisoes: estadoAtual.revisoes.map((item) =>
                    item.id === revisaoId
                        ? {
                            ...item,
                            pdfDisponivel: true,
                            pdf: {
                                bucket: resultadoPersistencia.bucket,
                                caminho: resultadoPersistencia.caminho,
                                nome: resultadoPersistencia.nomeArquivo,
                                sha256: resultadoPersistencia.sha256,
                                tamanhoBytes: resultadoPersistencia.tamanhoBytes,
                                geradoEm: "",
                            },
                        }
                        : item
                ),
            }));

            try {
                await recarregarHistoricoPdf();

                setMensagemPdf(
                    "PDF histórico registrado com sucesso. O histórico foi recarregado a partir do registro persistido."
                );
            } catch {
                setMensagemPdf(
                    "PDF histórico registrado com sucesso. A atualização automática do histórico falhou; feche e reabra o histórico antes de qualquer nova ação de emissão."
                );
            }
        } catch (erro) {
            const codigo = textoSeguro(erro?.codigo);

            if (codigo === "PDF_REVISAO_JA_PERSISTIDO") {
                try {
                    await recarregarHistoricoPdf();
                    setPdfPendente(null);
                    setPdfBloqueadoId("");
                    setMensagemPdf(
                        "O PDF já estava registrado no histórico. Os dados foram recarregados sem repetir a escrita."
                    );
                    return;
                } catch {
                    setPdfBloqueadoId(revisaoId);
                }
            }

            const codigosQueExigemAuditoria = new Set([
                "PDF_STORAGE_UPLOAD_AMBIGUO",
                "PDF_RPC_REGISTRO_AMBIGUO",
                "PDF_STORAGE_CONFLITO_IMUTAVEL",
                "PDF_RPC_CONFLITO_IMUTAVEL",
            ]);

            if (
                codigosQueExigemAuditoria.has(
                    codigo
                )
            ) {
                setPdfBloqueadoId(revisaoId);
            }

            setErroPdf(
                codigosQueExigemAuditoria.has(codigo)
                    ? `${erro?.message || "A emissão do PDF ficou inconclusiva."} A emissão foi bloqueada nesta sessão. Não repita a escrita antes de auditoria read-only.`
                    : erro?.message ||
                        "Não foi possível registrar o PDF histórico desta revisão."
            );
        } finally {
            setPdfEmAndamentoId("");
        }
    };

    const abrirPdfPersistido = async (revisao) => {
        const revisaoId = textoSeguro(revisao?.id);
        const bucket = textoSeguro(revisao?.pdf?.bucket);
        const caminho = textoSeguro(revisao?.pdf?.caminho);

        if (
            !revisaoId ||
            pdfEmAndamentoId ||
            !revisao?.pdfDisponivel
        ) {
            return;
        }

        if (
            bucket !== "revisoes-treinamentos" ||
            !caminho
        ) {
            setErroPdf(
                "Os metadados do PDF histórico estão incompletos ou apontam para bucket inesperado."
            );
            return;
        }

        setPdfEmAndamentoId(revisaoId);
        setMensagemPdf("");
        setErroPdf("");

        const janelaPdf =
            abrirJanelaPreparacaoPdf(
                "Gerando acesso temporário ao PDF histórico..."
            );

        try {
            const urlAssinada =
                await criarUrlAssinadaStorage(
                    bucket,
                    caminho,
                    300
                );

            if (!urlAssinada) {
                throw new Error(
                    "Não foi possível gerar a URL temporária do PDF histórico."
                );
            }

            if (janelaPdf && !janelaPdf.closed) {
                janelaPdf.location.href = urlAssinada;
            } else {
                const link = document.createElement("a");
                link.href = urlAssinada;
                link.target = "_blank";
                link.rel = "noopener noreferrer";
                link.click();
            }
        } catch (erro) {
            try {
                janelaPdf?.close();
            } catch {
                // Sem ação adicional.
            }

            setErroPdf(
                erro?.message ||
                    "Não foi possível abrir o PDF histórico desta revisão."
            );
        } finally {
            setPdfEmAndamentoId("");
        }
    };

    return (
        <div className="absolute inset-0 z-40" data-historico-revisoes-treinamentos>
            <button
                type="button"
                aria-label="Fechar histórico de revisões"
                className="absolute inset-0 h-full w-full cursor-default bg-slate-950/30 backdrop-blur-[1px]"
                onClick={() => {
                    if (!carregandoDetalhe && !pdfEmAndamentoId) onFechar?.();
                }}
            />

            <aside
                role="dialog"
                aria-modal="true"
                aria-label={`Histórico de revisões — ${textoSeguro(colaborador?.nome) || "colaborador"}`}
                className="absolute inset-y-0 right-0 flex w-full max-w-3xl flex-col border-l border-slate-200 bg-slate-50 shadow-2xl"
            >
                <header
                    className="relative isolate shrink-0 overflow-hidden border-b border-slate-800/70 bg-slate-950 text-white"
                    data-historico-revisoes-hero="true"
                >
                    <div
                        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                        style={{
                            backgroundImage: `url(${treinamentosHeroBackground})`,
                        }}
                        aria-hidden="true"
                    />

                    <div
                        className="absolute inset-0"
                        style={{
                            background:
                                "linear-gradient(90deg, rgba(2,12,29,0.97) 0%, rgba(8,22,40,0.92) 46%, rgba(12,34,48,0.78) 72%, rgba(9,31,42,0.66) 100%)",
                        }}
                        aria-hidden="true"
                    />

                    <div
                        className="relative z-10 min-h-[clamp(140px,8.6vw,150px)] px-4 pb-[52px] pt-4 sm:px-6 sm:pt-5"
                        style={{
                            minHeight: "132px",
                            paddingBottom: "42px",
                            paddingRight: "4rem",
                        }}
                    >
                        <p className="m-0 text-[clamp(0.64rem,0.48vw,0.72rem)] font-black uppercase leading-none tracking-[0.14em] text-emerald-300">
                            SAFESCAN BRASIL
                        </p>

                        <div className="mt-1 flex min-w-0 items-center gap-2">
                            <History className="h-5 w-5 shrink-0 text-slate-300" />

                            <h3 className="truncate text-lg font-black tracking-tight text-white">
                                Histórico de revisões
                            </h3>
                        </div>

                        <p className="mt-1 break-words text-xs font-bold leading-5 text-slate-100">
                            {textoSeguro(colaborador?.nome) || "Colaborador não informado"}
                        </p>

                        <p
                            className="mt-1 break-words text-xs font-semibold leading-5 text-slate-300"
                            style={{
                                maxWidth: "38rem",
                            }}
                        >
                            Cada registro é um snapshot imutável da situação encontrada na data da conclusão.
                        </p>

                        <div
                            className="mt-[clamp(7px,0.55vw,9px)] h-[3px] w-[clamp(42px,3.4vw,54px)] rounded-full bg-gradient-to-r from-green-500 to-emerald-500 shadow-[0_0_12px_rgba(34,197,94,0.2)]"
                            aria-hidden="true"
                        />
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            if (!carregandoDetalhe && !pdfEmAndamentoId) onFechar?.();
                        }}
                        disabled={carregandoDetalhe || Boolean(pdfEmAndamentoId)}
                        className="absolute right-4 top-4 z-20 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-black/30 text-white shadow-[0_8px_24px_rgba(0,0,0,0.22)] backdrop-blur transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50 sm:right-6"
                        aria-label="Fechar histórico"
                    >
                        <X className="h-4 w-4" />
                    </button>

                    <div
                        className="absolute inset-x-0 bottom-0 z-10 flex h-[clamp(42px,2.8vw,46px)] min-h-[42px] items-center gap-2 px-4 sm:px-6"
                        style={{
                            height: "34px",
                            minHeight: "34px",
                            background:
                                "linear-gradient(90deg, rgba(2,12,29,0.90) 0%, rgba(11,23,45,0.84) 58%, rgba(37,51,35,0.68) 100%)",
                        }}
                    >
                        <span
                            className="inline-flex h-[clamp(31px,2vw,34px)] shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-emerald-300/40 bg-emerald-950/65 px-3 text-[clamp(0.66rem,0.58vw,0.76rem)] font-black uppercase leading-none tracking-[0.05em] text-white shadow-[0_6px_14px_rgba(0,0,0,0.16)] backdrop-blur"
                            style={{
                                height: "24px",
                                paddingLeft: "10px",
                                paddingRight: "10px",
                                fontSize: "9px",
                            }}
                        >
                            <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
                            Histórico auditável
                        </span>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">
                    {lista.carregando && (
                        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-10 text-center shadow-sm">
                            <LoaderCircle className="mx-auto h-7 w-7 animate-spin text-blue-600" />
                            <p className="mt-3 text-sm font-black text-slate-700">Carregando histórico...</p>
                        </div>
                    )}

                    {!lista.carregando && lista.erro && (
                        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm font-semibold text-red-700">
                            <div className="flex items-start gap-2">
                                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                                <span>{lista.erro}</span>
                            </div>
                        </div>
                    )}

                    {!lista.carregando && !lista.erro && !detalhe && (
                        <ListaHistorico
                            revisoes={lista.revisoes}
                            onAbrir={abrirRevisao}
                            onPrevisualizarPdf={previsualizarPdf}
                            onConfirmarEmissaoPdf={confirmarEmissaoPdf}
                            onAbrirPdf={abrirPdfPersistido}
                            pdfEmAndamentoId={pdfEmAndamentoId}
                            pdfPendenteRevisaoId={textoSeguro(pdfPendente?.revisaoId)}
                            pdfBloqueadoId={pdfBloqueadoId}
                        />
                    )}

                    {!lista.carregando && !detalhe && mensagemPdf && (
                        <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
                            <div className="flex items-start gap-2">
                                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                                <span>{mensagemPdf}</span>
                            </div>
                        </div>
                    )}

                    {!lista.carregando && !detalhe && erroPdf && (
                        <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                            <div className="flex items-start gap-2">
                                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                                <span>{erroPdf}</span>
                            </div>
                        </div>
                    )}

                    {carregandoDetalhe && (
                        <div className="rounded-2xl border border-blue-200 bg-white px-5 py-10 text-center shadow-sm">
                            <LoaderCircle className="mx-auto h-7 w-7 animate-spin text-blue-600" />
                            <p className="mt-3 text-sm font-black text-slate-700">Abrindo revisão histórica...</p>
                        </div>
                    )}

                    {!carregandoDetalhe && erroDetalhe && !detalhe && (
                        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm font-semibold text-red-700">
                            <div className="flex items-start gap-2">
                                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                                <span>{erroDetalhe}</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setErroDetalhe("")}
                                className="mt-3 rounded-lg bg-white px-3 py-2 text-xs font-black text-red-700 ring-1 ring-red-200"
                            >
                                Voltar ao histórico
                            </button>
                        </div>
                    )}

                    {!carregandoDetalhe && detalhe && (
                        <DetalheHistorico
                            detalhe={detalhe}
                            onVoltar={() => {
                                setDetalhe(null);
                                setErroDetalhe("");
                            }}
                        />
                    )}
                </div>

                <footer className="border-t border-slate-200 bg-white px-4 py-3 sm:px-5">
                    <div className="flex items-center gap-2 text-[10px] font-bold leading-4 text-slate-500">
                        <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
                        <span>Consulta somente leitura. A prévia do PDF é local e não registra arquivo, não altera certificados, evidências ou revisões concluídas.</span>
                    </div>
                </footer>
            </aside>
        </div>
    );
}

export default HistoricoRevisoesTreinamentosDrawer;
