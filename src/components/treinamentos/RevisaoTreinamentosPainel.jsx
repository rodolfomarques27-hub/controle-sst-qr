import React from "react";
import {
    AlertTriangle,
    BadgeCheck,
    CalendarClock,
    CheckCircle2,
    ChevronDown,
    CircleAlert,
    FileSearch,
    FileText,
    History,
    LoaderCircle,
    RefreshCw,
    SearchCheck,
    ShieldAlert,
    ShieldCheck,
    UserRoundCheck,
    X,
} from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import treinamentosHeroBackground from "../../assets/dashboard-hero-sst.png";
import {
    concluirRevisaoTreinamentosService,
    prepararPreviaRevisaoTreinamentosService,
} from "../../services/treinamentosRevisaoService";
import { HistoricoRevisoesTreinamentosDrawer } from "./HistoricoRevisoesTreinamentosDrawer";

const ORDEM_STATUS_REVISAO = [
    "CONFORME",
    "ATENÇÃO",
    "VENCIDO",
    "DIVERGENTE",
    "SEM EVIDÊNCIA SUFICIENTE",
    "REVISÃO MANUAL NECESSÁRIA",
];

const CONFIG_STATUS_REVISAO = {
    CONFORME: {
        rotulo: "Conforme",
        classe: "bg-emerald-50 text-emerald-700 ring-emerald-200",
        card: "border-emerald-200 bg-emerald-50/70",
        Icone: CheckCircle2,
    },
    "ATENÇÃO": {
        rotulo: "Atenção",
        classe: "bg-amber-50 text-amber-800 ring-amber-200",
        card: "border-amber-200 bg-amber-50/70",
        Icone: AlertTriangle,
    },
    VENCIDO: {
        rotulo: "Vencido",
        classe: "bg-red-50 text-red-700 ring-red-200",
        card: "border-red-200 bg-red-50/70",
        Icone: CircleAlert,
    },
    DIVERGENTE: {
        rotulo: "Divergente",
        classe: "bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200",
        card: "border-fuchsia-200 bg-fuchsia-50/70",
        Icone: ShieldAlert,
    },
    "SEM EVIDÊNCIA SUFICIENTE": {
        rotulo: "Sem evidência",
        classe: "bg-slate-100 text-slate-700 ring-slate-200",
        card: "border-slate-200 bg-slate-50",
        Icone: FileSearch,
    },
    "REVISÃO MANUAL NECESSÁRIA": {
        rotulo: "Revisão manual",
        classe: "bg-orange-50 text-orange-800 ring-orange-200",
        card: "border-orange-200 bg-orange-50/70",
        Icone: UserRoundCheck,
    },
};

function textoSeguro(valor = "") {
    return String(valor || "").trim();
}

function formatarData(valor = "") {
    const texto = textoSeguro(valor);

    if (!texto) return "-";

    const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(texto);
    if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;

    const data = new Date(texto);
    if (Number.isNaN(data.getTime())) return texto;

    return data.toLocaleDateString("pt-BR");
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

function formatarPercentual(valor = 0) {
    const numero = Number(valor);
    if (!Number.isFinite(numero)) return "0%";

    return `${numero.toLocaleString("pt-BR", {
        minimumFractionDigits: numero % 1 === 0 ? 0 : 1,
        maximumFractionDigits: 2,
    })}%`;
}

function obterConfigStatus(status = "") {
    return CONFIG_STATUS_REVISAO[status] || {
        rotulo: textoSeguro(status) || "Não classificado",
        classe: "bg-slate-100 text-slate-700 ring-slate-200",
        card: "border-slate-200 bg-white",
        Icone: FileText,
    };
}

function StatusRevisaoPill({ status = "" }) {
    const config = obterConfigStatus(status);
    const Icone = config.Icone;

    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.06em] ring-1 ${config.classe}`}
        >
            <Icone className="h-3.5 w-3.5" />
            {config.rotulo}
        </span>
    );
}

function obterSituacaoCpf(evidencia = {}) {
    if (evidencia?.identidadeEncontrada?.cpfCadastroConfirmado) {
        return {
            texto: "CPF confirmado no documento",
            classe: "text-emerald-700",
        };
    }

    if (Array.isArray(evidencia?.identidadeEncontrada?.cpfsExtraidos) && evidencia.identidadeEncontrada.cpfsExtraidos.length > 0) {
        return {
            texto: "CPF localizado, sem confirmação automática",
            classe: "text-amber-700",
        };
    }

    return {
        texto: "CPF não confirmado pela leitura",
        classe: "text-slate-500",
    };
}

function ResumoStatus({ previa = {} }) {
    const resumo = previa?.resumo || {};

    return (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-2">
            {ORDEM_STATUS_REVISAO.map((status) => {
                const config = obterConfigStatus(status);
                const Icone = config.Icone;

                return (
                    <div
                        key={status}
                        className={`rounded-2xl border p-3 ${config.card}`}
                    >
                        <div className="flex items-center justify-between gap-2">
                            <Icone className="h-4 w-4 shrink-0 text-slate-600" />
                            <span className="text-xl font-black tabular-nums text-slate-950">
                                {Number(resumo?.[status] || 0)}
                            </span>
                        </div>
                        <p className="mt-2 text-[10px] font-black uppercase leading-4 tracking-[0.06em] text-slate-600">
                            {config.rotulo}
                        </p>
                    </div>
                );
            })}
        </div>
    );
}

function EvidenciaRevisao({ evidencia = {}, indice = 0 }) {
    const situacaoCpf = obterSituacaoCpf(evidencia);
    const divergencias = Array.isArray(evidencia?.divergencias)
        ? evidencia.divergencias.filter(Boolean)
        : [];
    const reprocessamento = evidencia?.reprocessamento || {};

    return (
        <article className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-400">
                        Evidência {indice + 1}
                    </p>
                    <p className="mt-1 break-words text-sm font-black text-slate-900">
                        {textoSeguro(evidencia?.arquivoNome) || "Arquivo sem nome informado"}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                        {textoSeguro(evidencia?.tipoEvidencia) || "evidência complementar"}
                    </p>
                </div>

                <span
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase ring-1 ${
                        reprocessamento?.ok === true
                            ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                            : "bg-red-50 text-red-700 ring-red-200"
                    }`}
                >
                    {reprocessamento?.ok === true ? (
                        <BadgeCheck className="h-3.5 w-3.5" />
                    ) : (
                        <CircleAlert className="h-3.5 w-3.5" />
                    )}
                    {reprocessamento?.ok === true ? "Reprocessada" : "Falha na leitura"}
                </span>
            </div>

            <div className="mt-3 grid gap-2 md:grid-cols-2">
                <div className="rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-100">
                    <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Identidade</p>
                    <p className="mt-1 text-xs font-bold text-slate-700">
                        {evidencia?.identidadeEncontrada?.nomeCadastroConfirmado
                            ? "Nome do colaborador confirmado"
                            : evidencia?.identidadeEncontrada?.nomeExtraido
                                ? "Nome localizado, exige conferência"
                                : "Nome não confirmado pela leitura"}
                    </p>
                    <p className={`mt-1 text-[11px] font-semibold ${situacaoCpf.classe}`}>
                        {situacaoCpf.texto}
                    </p>
                </div>

                <div className="rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-100">
                    <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Documento / treinamento</p>
                    <p className="mt-1 text-xs font-bold text-slate-700">
                        Esperado: {textoSeguro(evidencia?.tipoDocumentoEsperado) || "-"}
                    </p>
                    <p className="mt-1 text-[11px] font-semibold text-slate-500">
                        Identificado: {textoSeguro(evidencia?.tipoDocumentoIdentificado) || "Não confirmado"}
                    </p>
                    <p className="mt-1 text-[11px] font-semibold text-slate-500">
                        Treinamento identificado: {textoSeguro(evidencia?.treinamentoIdentificado) || "Não confirmado"}
                    </p>
                </div>
            </div>

            {divergencias.length > 0 && (
                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                    <p className="text-[10px] font-black uppercase tracking-wide text-amber-800">Divergências desta evidência</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                        {divergencias.map((divergencia) => (
                            <span
                                key={divergencia}
                                className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-amber-800 ring-1 ring-amber-200"
                            >
                                {divergencia}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {reprocessamento?.erro && (
                <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold leading-5 text-red-700 ring-1 ring-red-100">
                    {textoSeguro(reprocessamento.erro)}
                </p>
            )}
        </article>
    );
}

function ItemRevisaoTreinamento({ item = {}, indice = 0 }) {
    const divergencias = Array.isArray(item?.divergencias)
        ? item.divergencias.filter(Boolean)
        : [];
    const evidencias = Array.isArray(item?.evidencias)
        ? item.evidencias
        : [];

    return (
        <article className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="p-4 sm:p-5">
                <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
                    <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-400">
                            Treinamento lógico {indice + 1}
                        </p>
                        <h3 className="mt-1 break-words text-base font-black text-slate-950 sm:text-lg">
                            {textoSeguro(item?.treinamentoNome) || "Treinamento não identificado"}
                        </h3>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                            <StatusRevisaoPill status={item?.statusRevisao} />
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-600 ring-1 ring-slate-200">
                                {Number(item?.quantidadeEvidencias || evidencias.length || 0)} evidência(s)
                            </span>
                            {item?.requerRevisaoHumana === true && (
                                <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[10px] font-black text-orange-800 ring-1 ring-orange-200">
                                    Conferência humana necessária
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="grid shrink-0 grid-cols-2 gap-2 sm:min-w-[310px]">
                        <div className="rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-100">
                            <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">Status anterior</p>
                            <p className="mt-1 text-xs font-black text-slate-700">
                                {textoSeguro(item?.statusTemporalAnterior?.texto) || "-"}
                            </p>
                        </div>
                        <div className="rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-100">
                            <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">Status reprocessado</p>
                            <p className="mt-1 text-xs font-black text-slate-700">
                                {textoSeguro(item?.statusTemporalMotor?.texto) || "-"}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                        <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">Realização salva</p>
                        <p className="mt-1 text-xs font-bold text-slate-700">{formatarData(item?.dataRealizacaoSalva)}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                        <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">Realização revisada</p>
                        <p className="mt-1 text-xs font-bold text-slate-700">{formatarData(item?.dataRealizacaoRevisada)}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                        <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">Vencimento salvo</p>
                        <p className="mt-1 text-xs font-bold text-slate-700">
                            {item?.semValidade ? "Sem validade" : formatarData(item?.dataVencimentoSalva)}
                        </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                        <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">Vencimento revisado</p>
                        <p className="mt-1 text-xs font-bold text-slate-700">
                            {item?.semValidade ? "Sem validade" : formatarData(item?.dataVencimentoRevisada)}
                        </p>
                    </div>
                </div>

                {divergencias.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                        {divergencias.map((divergencia) => (
                            <span
                                key={divergencia}
                                className="rounded-full bg-fuchsia-50 px-2.5 py-1 text-[10px] font-black text-fuchsia-700 ring-1 ring-fuchsia-200"
                            >
                                {divergencia}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            <details className="group border-t border-slate-200">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-xs font-black text-slate-700 transition hover:bg-slate-50 sm:px-5">
                    <span className="inline-flex items-center gap-2">
                        <FileSearch className="h-4 w-4 text-slate-500" />
                        Ver análise das evidências
                    </span>
                    <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
                </summary>

                <div className="space-y-3 bg-slate-50/70 px-4 py-4 sm:px-5">
                    {evidencias.length > 0 ? (
                        evidencias.map((evidencia, indiceEvidencia) => (
                            <EvidenciaRevisao
                                key={evidencia?.id || `${item?.chave || indice}-${indiceEvidencia}`}
                                evidencia={evidencia}
                                indice={indiceEvidencia}
                            />
                        ))
                    ) : (
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm font-semibold text-slate-500">
                            Nenhuma evidência física foi localizada para este treinamento.
                        </div>
                    )}
                </div>
            </details>
        </article>
    );
}

export function RevisaoTreinamentosPainel({
    aberto = false,
    colaborador = null,
    podeExecutarPrevia = true,
    podeConcluirRevisao = false,
    onFechar,
}) {
    const [previa, setPrevia] = React.useState(null);
    const [carregando, setCarregando] = React.useState(false);
    const [progressoAnalise, setProgressoAnalise] = React.useState(null);
    const [erro, setErro] = React.useState("");
    const [confirmandoConclusao, setConfirmandoConclusao] = React.useState(false);
    const [concluindo, setConcluindo] = React.useState(false);
    const [conclusao, setConclusao] = React.useState(null);
    const [erroConclusao, setErroConclusao] = React.useState("");
    const [resultadoConclusaoDesconhecido, setResultadoConclusaoDesconhecido] = React.useState(false);
    const [historicoAberto, setHistoricoAberto] = React.useState(false);

    const colaboradorId = textoSeguro(colaborador?.id);
    const ocupado = carregando || concluindo;
    const fechamentoPainelBloqueado = ocupado || historicoAberto;

    React.useEffect(() => {
        if (
            !aberto ||
            typeof window === "undefined" ||
            typeof document === "undefined"
        ) return undefined;

        const body = document.body;
        const html = document.documentElement;
        const overflowBodyAnterior = body.style.overflow;
        const overflowHtmlAnterior = html.style.overflow;
        const overscrollBodyAnterior = body.style.overscrollBehavior;
        const overscrollHtmlAnterior = html.style.overscrollBehavior;
        const paddingRightAnterior = body.style.paddingRight;
        const larguraBarraRolagem = Math.max(0, window.innerWidth - html.clientWidth);
        const paddingRightComputado = Number.parseFloat(
            window.getComputedStyle(body).paddingRight
        ) || 0;

        body.style.overflow = "hidden";
        html.style.overflow = "hidden";
        body.style.overscrollBehavior = "none";
        html.style.overscrollBehavior = "none";

        if (larguraBarraRolagem > 0) {
            body.style.paddingRight = `${paddingRightComputado + larguraBarraRolagem}px`;
        }

        const aoTeclado = (evento) => {
            if (evento.key === "Escape" && !fechamentoPainelBloqueado) {
                onFechar?.();
            }
        };

        window.addEventListener("keydown", aoTeclado);

        return () => {
            window.removeEventListener("keydown", aoTeclado);
            body.style.overflow = overflowBodyAnterior;
            html.style.overflow = overflowHtmlAnterior;
            body.style.overscrollBehavior = overscrollBodyAnterior;
            html.style.overscrollBehavior = overscrollHtmlAnterior;
            body.style.paddingRight = paddingRightAnterior;
        };
    }, [aberto, fechamentoPainelBloqueado, onFechar]);

    if (!aberto) return null;

    const iniciarRevisao = async () => {
        if (!colaboradorId || ocupado || !podeExecutarPrevia) return;

        setCarregando(true);
        setProgressoAnalise(null);
        setErro("");
        setConfirmandoConclusao(false);
        setConclusao(null);
        setErroConclusao("");
        setResultadoConclusaoDesconhecido(false);
        setHistoricoAberto(false);

        try {
            const resultado = await prepararPreviaRevisaoTreinamentosService({
                supabase,
                colaboradorId,
                onProgresso: (evento = {}) => {
                    const total = Math.max(0, Number(evento?.total) || 0);
                    const concluidas = Math.max(
                        0,
                        Math.min(total, Number(evento?.concluidas) || 0)
                    );
                    const percentual = Math.max(
                        0,
                        Math.min(100, Number(evento?.percentual) || 0)
                    );

                    setProgressoAnalise({
                        fase: textoSeguro(evento?.fase),
                        concluidas,
                        total,
                        percentual,
                    });
                },
            });

            if (resultado?.readOnly !== true) {
                throw new Error("A revisão retornada não confirmou o contrato somente leitura.");
            }

            setPrevia(resultado);
        } catch (erroRevisao) {
            console.error("Erro ao preparar prévia de revisão de treinamentos:", erroRevisao);
            setPrevia(null);
            setProgressoAnalise(null);
            setErro(
                erroRevisao?.message ||
                "Não foi possível preparar a revisão dos treinamentos deste colaborador."
            );
        } finally {
            setCarregando(false);
            setProgressoAnalise(null);
        }
    };

    const concluirRevisao = async () => {
        if (
            !previa ||
            ocupado ||
            conclusao ||
            resultadoConclusaoDesconhecido ||
            !podeConcluirRevisao
        ) return;

        setConcluindo(true);
        setErroConclusao("");

        try {
            const resultado = await concluirRevisaoTreinamentosService({
                supabase,
                previa,
                decisoesHumanas: {},
                confirmarConclusao: true,
            });

            if (!resultado?.ok || !resultado?.revisao_id) {
                throw new Error("A conclusão não retornou uma revisão persistida válida.");
            }

            setConclusao(resultado);
            setConfirmandoConclusao(false);
        } catch (erroRevisao) {
            console.error("Erro ao concluir revisão de treinamentos:", erroRevisao);

            if (erroRevisao?.resultadoDesconhecido === true) {
                setResultadoConclusaoDesconhecido(true);
                setConfirmandoConclusao(false);
                setErroConclusao(
                    "O servidor não confirmou o resultado da conclusão. Não repita esta ação automaticamente. " +
                    "A revisão deverá ser conferida no histórico antes de uma nova tentativa."
                );
            } else {
                setErroConclusao(
                    erroRevisao?.message ||
                    "Não foi possível registrar a conclusão desta revisão."
                );
            }
        } finally {
            setConcluindo(false);
        }
    };

    const itens = Array.isArray(previa?.itens) ? previa.itens : [];
    const diagnostico = previa?.diagnostico || {};
    const percentualConformidadePrevia = formatarPercentual(previa?.percentualConformidade);
    const totalTreinamentosPrevia = Number(previa?.totalTreinamentosLogicos || 0);
    const totalConformesPrevia = Number(previa?.resumo?.CONFORME || 0);
    const totalEvidenciasTreinamentoPrevia = itens.reduce(
        (total, item) => total + (Array.isArray(item?.evidencias) ? item.evidencias.length : 0),
        0
    );
    const totalDocumentosReprocessados = Number(diagnostico?.evidenciasReprocessadas || 0);
    const totalDocumentosContextuais = Math.max(
        0,
        totalDocumentosReprocessados - totalEvidenciasTreinamentoPrevia
    );
    const progressoDisponivel =
        carregando &&
        Number(progressoAnalise?.total || 0) > 0;
    const percentualProgressoAnalise = Math.max(
        0,
        Math.min(100, Number(progressoAnalise?.percentual) || 0)
    );
    const progressoFinalizando =
        progressoDisponivel &&
        percentualProgressoAnalise >= 100;
    const progressoRaio = 40;
    const progressoCircunferencia = 2 * Math.PI * progressoRaio;
    const progressoOffset =
        progressoCircunferencia * (1 - percentualProgressoAnalise / 100);

    return (
        <div
            className="fixed inset-0 z-[120]"
            data-revisao-treinamentos-painel
        >
            <button
                type="button"
                aria-label="Fechar revisão de treinamentos"
                className="absolute inset-0 h-full w-full cursor-default bg-slate-950/55 backdrop-blur-[2px]"
                onClick={() => {
                    if (!fechamentoPainelBloqueado) onFechar?.();
                }}
            />

            <section
                role="dialog"
                aria-modal="true"
                aria-label={`Revisão de treinamentos — ${textoSeguro(colaborador?.nome) || "colaborador"}`}
                className="absolute inset-3 z-10 flex flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-slate-50 shadow-2xl sm:inset-5 lg:inset-x-[4vw] lg:inset-y-[3vh]"
            >
                <header
                    className="relative isolate shrink-0 overflow-hidden border-b border-slate-800/70 bg-slate-950 text-white"
                    data-revisao-treinamentos-hero="true"
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
                                "linear-gradient(90deg, rgba(2,12,29,0.96) 0%, rgba(8,22,40,0.91) 42%, rgba(12,34,48,0.76) 70%, rgba(9,31,42,0.62) 100%)",
                        }}
                        aria-hidden="true"
                    />

                    <div className="relative z-10 min-h-[clamp(140px,8.6vw,150px)] px-4 pb-[52px] pt-4 sm:px-6 sm:pt-5">
                        <div className="max-w-3xl pr-14 sm:pr-16">
                            <p className="m-0 text-[clamp(0.64rem,0.48vw,0.72rem)] font-black uppercase leading-none tracking-[0.14em] text-emerald-300">
                                SAFESCAN BRASIL
                            </p>

                            <h2 className="mt-[clamp(5px,0.35vw,7px)] break-words text-[clamp(1.2rem,1.7vw,1.55rem)] font-black leading-[1.1] tracking-tight text-white">
                                Revisão de treinamentos
                            </h2>

                            <p className="mt-[clamp(4px,0.3vw,6px)] break-words text-[clamp(0.76rem,0.72vw,0.88rem)] font-bold leading-[1.25] text-slate-100">
                                {textoSeguro(colaborador?.nome) || "Colaborador não informado"}
                            </p>

                            <p className="mt-1 break-words text-xs font-semibold leading-5 text-slate-300">
                                {textoSeguro(colaborador?.empresaExibicao || colaborador?.empresa) || "Empresa não informada"}
                                {textoSeguro(colaborador?.funcao || colaborador?.cargo)
                                    ? ` • ${textoSeguro(colaborador?.funcao || colaborador?.cargo)}`
                                    : ""}
                                {textoSeguro(colaborador?.codigoFuncionario)
                                    ? ` • Código ${textoSeguro(colaborador?.codigoFuncionario)}`
                                    : ""}
                            </p>

                            <div
                                className="mt-[clamp(7px,0.55vw,9px)] h-[3px] w-[clamp(42px,3.4vw,54px)] rounded-full bg-gradient-to-r from-green-500 to-emerald-500 shadow-[0_0_12px_rgba(34,197,94,0.2)]"
                                aria-hidden="true"
                            />
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            if (!fechamentoPainelBloqueado) onFechar?.();
                        }}
                        disabled={fechamentoPainelBloqueado}
                        className="absolute right-4 top-4 z-20 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-black/30 text-white shadow-[0_8px_24px_rgba(0,0,0,0.22)] backdrop-blur transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50 sm:right-6"
                        aria-label="Fechar painel de revisão"
                        title={fechamentoPainelBloqueado ? "Feche o histórico ou aguarde a operação em andamento" : "Fechar"}
                    >
                        <X className="h-4 w-4" />
                    </button>

                    <div
                        className="absolute inset-x-0 bottom-0 z-10 flex h-[clamp(42px,2.8vw,46px)] min-h-[42px] items-center gap-2 px-4 sm:px-6"
                        style={{
                            background:
                                "linear-gradient(90deg, rgba(2,12,29,0.88) 0%, rgba(11,23,45,0.82) 56%, rgba(64,48,17,0.58) 100%)",
                        }}
                    >
                        <span className="inline-flex h-[clamp(31px,2vw,34px)] shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-emerald-300/40 bg-emerald-950/65 px-3 text-[clamp(0.66rem,0.58vw,0.76rem)] font-black uppercase leading-none tracking-[0.05em] text-white shadow-[0_6px_14px_rgba(0,0,0,0.16)] backdrop-blur">
                            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-300" />
                            Prévia somente leitura
                        </span>

                        <span className="inline-flex h-[clamp(31px,2vw,34px)] min-w-0 items-center justify-center gap-1.5 overflow-hidden whitespace-nowrap rounded-full border border-slate-300/25 bg-slate-900/65 px-3 text-[clamp(0.66rem,0.58vw,0.76rem)] font-black uppercase leading-none tracking-[0.05em] text-white shadow-[0_6px_14px_rgba(0,0,0,0.16)] backdrop-blur">
                            <SearchCheck className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                            <span className="truncate">
                                Pós-revisão documental
                            </span>
                        </span>
                    </div>
                </header>

                <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 xl:overflow-hidden">
                    {!previa && !carregando && (
                        <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                                <SearchCheck className="h-7 w-7" />
                            </div>
                            <h3 className="mt-5 text-xl font-black text-slate-950">
                                Reprocessar documentos já cadastrados
                            </h3>
                            <p className="mx-auto mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
                                A revisão considera todos os treinamentos do colaborador, independentemente dos filtros aplicados à Base de Certificados. Os arquivos existentes serão reprocessados sem alterar datas, vínculos, certificados ou treinamentos.
                            </p>

                            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-left text-xs font-semibold leading-5 text-emerald-800">
                                <div className="flex items-start gap-2">
                                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                                    <span>
                                        Esta etapa gera apenas uma prévia técnica. Não conclui revisão, não gera PDF e não grava correções.
                                    </span>
                                </div>
                            </div>

                            {!podeExecutarPrevia && (
                                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm font-semibold text-amber-800">
                                    O painel foi aberto, mas a execução da prévia não está liberada para este perfil.
                                </div>
                            )}

                            {erro && (
                                <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-left text-sm font-semibold text-red-700">
                                    {erro}
                                </div>
                            )}

                            <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
                                <button
                                    type="button"
                                    onClick={iniciarRevisao}
                                    disabled={!colaboradorId || !podeExecutarPrevia}
                                    title={
                                        !podeExecutarPrevia
                                            ? "Sem permissão para executar a prévia de revisão."
                                            : "Iniciar reprocessamento somente leitura."
                                    }
                                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-6 py-3 text-sm font-black text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <SearchCheck className="h-4 w-4" />
                                    Iniciar revisão
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setHistoricoAberto(true)}
                                    disabled={!colaboradorId}
                                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-black text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <History className="h-4 w-4" />
                                    Histórico de revisões
                                </button>
                            </div>
                        </div>
                    )}

                    {carregando && (
                        <div className="mx-auto max-w-3xl rounded-3xl border border-blue-200 bg-white p-8 text-center shadow-sm">
                            {progressoDisponivel ? (
                                <>
                                    <div
                                        className="relative mx-auto h-24 w-24"
                                        data-progresso-circular-animado
                                        role="progressbar"
                                        aria-label="Progresso real da análise de evidências"
                                        aria-valuemin={0}
                                        aria-valuemax={100}
                                        aria-valuenow={percentualProgressoAnalise}
                                    >
                                        <svg
                                            viewBox="0 0 96 96"
                                            className="h-full w-full"
                                            aria-hidden="true"
                                        >
                                            <circle
                                                cx="48"
                                                cy="48"
                                                r={progressoRaio}
                                                fill="none"
                                                stroke="rgb(219 234 254)"
                                                strokeWidth="8"
                                            />
                                            <circle
                                                cx="48"
                                                cy="48"
                                                r={progressoRaio}
                                                fill="none"
                                                stroke="rgb(37 99 235)"
                                                strokeWidth="8"
                                                strokeLinecap="round"
                                                style={{
                                                    strokeDasharray: progressoCircunferencia,
                                                    strokeDashoffset: progressoOffset,
                                                    transform: "rotate(-90deg)",
                                                    transformOrigin: "50% 50%",
                                                    transition:
                                                        "stroke-dashoffset 420ms cubic-bezier(0.22, 1, 0.36, 1)",
                                                }}
                                            />
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="whitespace-nowrap text-lg font-black leading-none tracking-tight tabular-nums text-blue-700">
                                                {formatarPercentual(percentualProgressoAnalise)}
                                            </span>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <LoaderCircle className="mx-auto h-9 w-9 animate-spin text-blue-600" />
                            )}
                            <h3 className="mt-4 text-lg font-black text-slate-950">
                                Analisando evidências...
                            </h3>
                            {progressoDisponivel ? (
                                <p className="mt-2 text-sm font-black text-slate-600">
                                    {Number(progressoAnalise?.concluidas || 0)} de{" "}
                                    {Number(progressoAnalise?.total || 0)} evidências analisadas
                                </p>
                            ) : (
                                <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                                    Preparando as evidências deste colaborador para reprocessamento.
                                </p>
                            )}
                            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                                Os documentos existentes estão sendo reprocessados. Nenhum dado será alterado.
                            </p>
                            <p className="mt-3 text-xs font-bold text-slate-400">
                                {progressoFinalizando
                                    ? "Todas as evidências foram analisadas. Finalizando o resultado da revisão..."
                                    : "A porcentagem avança somente quando uma evidência termina de ser analisada."}
                            </p>
                        </div>
                    )}

                    {previa && !carregando && (
                        <div className="grid gap-4 xl:h-full xl:min-h-0 xl:grid-cols-[300px_minmax(0,1fr)]">
                            <aside
                                className="space-y-4 xl:min-h-0 xl:overflow-y-auto xl:overscroll-contain xl:pr-1"
                                data-resumo-previa-scroll
                            >
                                <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                                    <p className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">
                                        Resumo da prévia
                                    </p>
                                    <div className="mt-3 flex items-end justify-between gap-3 rounded-2xl bg-slate-950 px-4 py-4 text-white">
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-wide text-slate-300">
                                                Conformidade
                                            </p>
                                            <p className="mt-1 text-3xl font-black tabular-nums">
                                                {percentualConformidadePrevia}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-black uppercase tracking-wide text-slate-300">Total</p>
                                            <p className="mt-1 text-xl font-black tabular-nums">
                                                {totalTreinamentosPrevia}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-3">
                                        <ResumoStatus previa={previa} />
                                    </div>
                                </section>

                                <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                                    <div className="flex items-center gap-2">
                                        <CalendarClock className="h-4 w-4 text-slate-500" />
                                        <p className="text-xs font-black text-slate-700">Execução</p>
                                    </div>
                                    <div className="mt-3 space-y-2 text-xs font-semibold text-slate-500">
                                        <p>Gerada em: <strong className="text-slate-700">{formatarDataHora(previa?.geradoEm)}</strong></p>
                                        <p>Documentos reprocessados: <strong className="text-slate-700">{totalDocumentosReprocessados}</strong></p>
                                        <p>Evidências de treinamento: <strong className="text-slate-700">{totalEvidenciasTreinamentoPrevia}</strong></p>
                                        <p>Documentos contextuais: <strong className="text-slate-700">{totalDocumentosContextuais}</strong></p>
                                        <p>Falhas de reprocessamento: <strong className="text-slate-700">{Number(diagnostico?.evidenciasComFalhaReprocessamento || 0)}</strong></p>
                                        <p>SHAs consultados: <strong className="text-slate-700">{Number(diagnostico?.shasConsultados || 0)}</strong></p>
                                    </div>
                                </section>

                                <button
                                    type="button"
                                    onClick={iniciarRevisao}
                                    disabled={ocupado}
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-xs font-black text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <RefreshCw className="h-4 w-4" />
                                    Repetir prévia
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setHistoricoAberto(true)}
                                    disabled={ocupado || !colaboradorId}
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-xs font-black text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                    data-abrir-historico-revisoes
                                >
                                    <History className="h-4 w-4" />
                                    Histórico de revisões
                                </button>

                                {conclusao ? (
                                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-xs font-semibold leading-5 text-emerald-800">
                                        <div className="flex items-start gap-2">
                                            <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0" />
                                            <div>
                                                <p className="font-black">
                                                    Revisão #{Number(conclusao?.numero_revisao || 0)} registrada
                                                </p>
                                                <p className="mt-1">
                                                    Snapshot auditável persistido com {formatarPercentual(conclusao?.percentual_conformidade)} de conformidade.
                                                </p>
                                                <p className="mt-1 break-all text-[11px] text-emerald-700/80">
                                                    ID: {textoSeguro(conclusao?.revisao_id)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                                        <div className="flex items-start gap-2">
                                            <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-600" />
                                            <div className="min-w-0">
                                                <p className="text-xs font-black text-slate-800">Registrar revisão</p>
                                                <p className="mt-1 text-[11px] font-semibold leading-5 text-slate-500">
                                                    Cria um snapshot imutável desta análise. Não corrige automaticamente nenhum treinamento.
                                                </p>
                                            </div>
                                        </div>

                                        <div
                                            data-revisao-conformidade-registro
                                            className="mt-3 rounded-xl bg-slate-950 px-3 py-3 text-white"
                                        >
                                            <div className="flex items-end justify-between gap-3">
                                                <div>
                                                    <p className="text-[9px] font-black uppercase tracking-[0.08em] text-slate-300">
                                                        Conformidade desta revisão
                                                    </p>
                                                    <p className="mt-1 text-2xl font-black tabular-nums">
                                                        {percentualConformidadePrevia}
                                                    </p>
                                                </div>
                                                <p className="text-right text-[10px] font-bold leading-4 text-slate-300">
                                                    {totalConformesPrevia} de {totalTreinamentosPrevia}<br />
                                                    treinamentos conformes
                                                </p>
                                            </div>
                                        </div>

                                        {!podeConcluirRevisao && (
                                            <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-[11px] font-bold leading-4 text-amber-800 ring-1 ring-amber-200">
                                                É necessária permissão de edição em Treinamentos para concluir a revisão.
                                            </p>
                                        )}

                                        {erroConclusao && (
                                            <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-[11px] font-bold leading-4 text-red-700 ring-1 ring-red-200">
                                                {erroConclusao}
                                            </p>
                                        )}

                                        {!confirmandoConclusao ? (
                                            <button
                                                type="button"
                                                onClick={() => setConfirmandoConclusao(true)}
                                                disabled={!podeConcluirRevisao || ocupado || resultadoConclusaoDesconhecido}
                                                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-xs font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                <BadgeCheck className="h-4 w-4" />
                                                Concluir e registrar revisão
                                            </button>
                                        ) : (
                                            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                                                <p className="text-[11px] font-black leading-4 text-amber-900">
                                                    Confirmar registro desta revisão?
                                                </p>
                                                <p className="mt-1 text-[11px] font-semibold leading-4 text-amber-800">
                                                    A revisão será versionada como snapshot. Itens de revisão manual continuarão registrados como pendência; nenhum dado original será alterado.
                                                </p>
                                                <div
                                                    data-revisao-conformidade-confirmacao
                                                    className="mt-3 rounded-lg border border-amber-200 bg-white/80 px-3 py-2"
                                                >
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div>
                                                            <p className="text-[9px] font-black uppercase tracking-[0.06em] text-amber-700">
                                                                Conformidade da avaliação
                                                            </p>
                                                            <p className="mt-0.5 text-lg font-black tabular-nums text-slate-950">
                                                                {percentualConformidadePrevia}
                                                            </p>
                                                        </div>
                                                        <p className="text-right text-[10px] font-bold leading-4 text-slate-600">
                                                            {totalConformesPrevia} de {totalTreinamentosPrevia}<br />
                                                            conformes
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="mt-3 grid grid-cols-2 gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setConfirmandoConclusao(false)}
                                                        disabled={concluindo}
                                                        className="rounded-lg bg-white px-3 py-2 text-[11px] font-black text-slate-700 ring-1 ring-slate-200 disabled:opacity-50"
                                                    >
                                                        Cancelar
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={concluirRevisao}
                                                        disabled={concluindo}
                                                        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-[11px] font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
                                                    >
                                                        {concluindo ? (
                                                            <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                                                        ) : (
                                                            <BadgeCheck className="h-3.5 w-3.5" />
                                                        )}
                                                        {concluindo ? "Registrando..." : "Confirmar e registrar"}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold leading-5 text-emerald-800">
                                    <div className="flex items-start gap-2">
                                        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                                        <span>
                                            A prévia continua somente leitura. Somente a ação explícita de concluir cria um snapshot histórico; nenhuma correção automática é aplicada.
                                        </span>
                                    </div>
                                </div>
                            </aside>

                            <section
                                className="min-w-0 space-y-3 xl:min-h-0 xl:overflow-y-auto xl:overscroll-contain xl:pr-1"
                                data-treinamentos-avaliados-scroll
                            >
                                <div className="flex flex-col justify-between gap-2 rounded-3xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center">
                                    <div>
                                        <h3 className="text-sm font-black text-slate-900">Treinamentos avaliados</h3>
                                        <p className="mt-1 text-xs font-semibold text-slate-500">
                                            Estado salvo × reprocessado, divergências e evidências consideradas.
                                        </p>
                                    </div>
                                    <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600 ring-1 ring-slate-200">
                                        {itens.length} item(ns)
                                    </span>
                                </div>

                                {itens.length > 0 ? (
                                    itens.map((item, indice) => (
                                        <ItemRevisaoTreinamento
                                            key={item?.chave || item?.certificadoPrincipalId || `${indice}`}
                                            item={item}
                                            indice={indice}
                                        />
                                    ))
                                ) : (
                                    <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
                                        <FileText className="mx-auto h-9 w-9 text-slate-300" />
                                        <h3 className="mt-3 text-sm font-black text-slate-700">
                                            Nenhum treinamento lógico foi retornado
                                        </h3>
                                        <p className="mt-1 text-xs font-semibold text-slate-500">
                                            Confira o cadastro do colaborador e a matriz de treinamentos.
                                        </p>
                                    </div>
                                )}
                            </section>
                        </div>
                    )}
                </div>
                {historicoAberto && (
                    <HistoricoRevisoesTreinamentosDrawer
                        supabase={supabase}
                        colaborador={colaborador}
                        onFechar={() => setHistoricoAberto(false)}
                    />
                )}
            </section>
        </div>
    );
}
