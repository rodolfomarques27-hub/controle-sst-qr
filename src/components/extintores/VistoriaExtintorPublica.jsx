import React, { useEffect, useMemo, useState } from "react";
import {
    AlertTriangle,
    CalendarDays,
    Check,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Clock3,
    Gauge,
    MapPin,
    ShieldCheck,
    UserRound,
    Wrench,
} from "lucide-react";
import extintorPqsAbc from "../../assets/extintor-pqs-abc-6kg-ilustrativo-v2.png";
import extintorPqsBc from "../../assets/extintor-pqs-bc.png";
import extintorCo2 from "../../assets/extintor-co2.png";
import extintorAgua from "../../assets/extintor-agua-pressurizada.png";
import extintorEspuma from "../../assets/extintor-espuma-mecanica.png";
import {
    consultarFichaPublicaAnualExtintor,
    ITENS_CHECKLIST_EXTINTOR_MENSAL,
    listarExtintoresVistoria,
    listarInspecoesExtintores,
} from "../../services/extintoresVistoriaService";

const MESES = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const texto = (valor = "") => String(valor ?? "").trim();

function normalizarTipoExtintor(valor = "") {
    return texto(valor)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase();
}

function imagemPorTipoExtintor(tipo = "") {
    const tipoNormalizado = normalizarTipoExtintor(tipo);
    if (tipoNormalizado.includes("CO2")) return extintorCo2;
    if (tipoNormalizado.includes("AGUA")) return extintorAgua;
    if (tipoNormalizado.includes("ESPUMA")) return extintorEspuma;
    if (tipoNormalizado.includes("PQS BC")) return extintorPqsBc;
    return extintorPqsAbc;
}

function chaveCompetencia(inspecao = {}) {
    return texto(inspecao.competencia).slice(0, 7);
}

function formatarData(valor = "") {
    const dataIso = texto(valor).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataIso)) return "Não informado";
    const [ano, mes, dia] = dataIso.split("-");
    return `${dia}/${mes}/${ano}`;
}

function statusInspecao(inspecao, competencia, competenciaAtual) {
    if (!inspecao) {
        return competencia > competenciaAtual
            ? { chave: "aguardando", label: "Aguardando", cor: "slate" }
            : { chave: "pendente", label: "Pendente", cor: "red" };
    }

    if (texto(inspecao.status).toLowerCase() === "conforme") {
        return { chave: "conforme", label: "Aprovada", cor: "emerald" };
    }

    if (texto(inspecao.status).toLowerCase() === "em andamento") {
        return { chave: "andamento", label: "Em andamento", cor: "sky" };
    }

    return { chave: "atencao", label: "Observação", cor: "amber" };
}

function classeStatus(cor) {
    return {
        emerald: "border-emerald-300 bg-emerald-50 text-emerald-700",
        amber: "border-amber-300 bg-amber-50 text-amber-700",
        red: "border-red-200 bg-red-50 text-red-600",
        sky: "border-sky-300 bg-sky-50 text-sky-700",
        slate: "border-slate-200 bg-slate-50 text-slate-400",
    }[cor] || "border-slate-200 bg-slate-50 text-slate-500";
}

export function VistoriaExtintorPublica({ token = "" }) {
    const extintorLocal = useMemo(
        () => listarExtintoresVistoria().find((item) => item.tokenQr === token) || null,
        [token],
    );
    const inspecoesLocais = useMemo(
        () => extintorLocal
            ? listarInspecoesExtintores().filter((item) => String(item.extintorId) === String(extintorLocal.id))
            : [],
        [extintorLocal],
    );
    const [extintor, setExtintor] = useState(extintorLocal);
    const [inspecoes, setInspecoes] = useState(inspecoesLocais);
    const [carregando, setCarregando] = useState(Boolean(token));
    const [erro, setErro] = useState("");
    const anoAtual = new Date().getFullYear();
    const competenciaAtual = new Date().toISOString().slice(0, 7);
    const [anoSelecionado, setAnoSelecionado] = useState(anoAtual);
    const [mesAberto, setMesAberto] = useState(new Date().getMonth());

    useEffect(() => {
        let ativo = true;

        async function carregarFicha() {
            setCarregando(true);
            setErro("");
            try {
                const ficha = await consultarFichaPublicaAnualExtintor(token);
                if (!ativo) return;
                if (ficha?.extintor) {
                    setExtintor(ficha.extintor);
                    setInspecoes(ficha.inspecoes || []);
                }
            } catch (error) {
                if (ativo && !extintorLocal) {
                    setErro(error?.message || "Não foi possível consultar esta ficha.");
                }
            } finally {
                if (ativo) setCarregando(false);
            }
        }

        if (token) carregarFicha();
        else setCarregando(false);
        return () => { ativo = false; };
    }, [token, extintorLocal]);

    const anosDisponiveis = useMemo(() => {
        const anos = new Set([anoAtual]);
        inspecoes.forEach((item) => {
            const ano = Number(chaveCompetencia(item).slice(0, 4));
            if (ano) anos.add(ano);
        });
        return [...anos].sort((a, b) => b - a);
    }, [inspecoes, anoAtual]);

    const inspecoesPorMes = useMemo(() => {
        const mapa = new Map();
        inspecoes
            .filter((item) => Number(chaveCompetencia(item).slice(0, 4)) === anoSelecionado)
            .forEach((item) => {
                const chave = chaveCompetencia(item);
                if (!mapa.has(chave)) mapa.set(chave, item);
            });
        return mapa;
    }, [inspecoes, anoSelecionado]);

    const meses = useMemo(() => MESES.map((nome, indice) => {
        const competencia = `${anoSelecionado}-${String(indice + 1).padStart(2, "0")}`;
        const inspecao = inspecoesPorMes.get(competencia) || null;
        return { nome, indice, competencia, inspecao, status: statusInspecao(inspecao, competencia, competenciaAtual) };
    }), [anoSelecionado, inspecoesPorMes, competenciaAtual]);

    const resumo = useMemo(() => meses.reduce((total, mes) => {
        total[mes.status.chave] = (total[mes.status.chave] || 0) + 1;
        return total;
    }, {}), [meses]);

    const selecionado = meses[mesAberto] || meses[0];
    const situacaoOperacional = texto(extintor?.situacaoOperacional) || "Situação não informada";
    const emOperacao = situacaoOperacional.toLowerCase() === "em operação";

    if (carregando && !extintor) {
        return <EstadoFicha icone={Clock3} titulo="Carregando ficha anual" descricao="Consultando o registro oficial deste extintor." />;
    }

    if (!extintor) {
        return <EstadoFicha icone={AlertTriangle} titulo="Equipamento não encontrado" descricao={erro || "Este QR Code não está vinculado a um extintor disponível."} alerta />;
    }

    return (
        <main className="min-h-screen bg-slate-100 px-3 py-4 sm:px-5">
            <div className="mx-auto max-w-2xl space-y-4">
                <header className="rounded-[28px] bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-600">SafeScan Brasil</p>
                            <h1 className="mt-1 text-2xl font-black text-slate-950">Ficha anual do extintor</h1>
                        </div>
                        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
                            <ShieldCheck className="h-4 w-4" /> QR verificado
                        </div>
                    </div>

                    <div className="mt-4 grid grid-cols-[112px_1fr] gap-4 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
                        <div className="flex h-32 items-center justify-center overflow-hidden rounded-xl bg-white p-1 ring-1 ring-slate-200">
                            <img
                                src={imagemPorTipoExtintor(extintor.tipo)}
                                alt={`Extintor ${extintor.tipo || "PQS ABC"}`}
                                className="h-full w-full object-contain"
                            />
                        </div>
                        <div className="min-w-0 py-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <strong className="text-3xl font-black text-slate-950">{extintor.codigo}</strong>
                                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${emOperacao ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{situacaoOperacional}</span>
                            </div>
                            <p className="mt-1 font-bold text-slate-700">{extintor.tipo} · {extintor.capacidade}</p>
                            <p className="mt-3 flex items-start gap-1.5 text-sm text-slate-500"><MapPin className="mt-0.5 h-4 w-4 shrink-0" /> {extintor.localizacao || extintor.ponto || "Localização não informada"}</p>
                            {extintor.numeroSerie && <p className="mt-1 text-xs text-slate-400">Série: {extintor.numeroSerie}</p>}
                        </div>
                    </div>
                </header>

                <section className="grid grid-cols-3 gap-2 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
                    <Resumo numero={resumo.conforme || 0} label="Aprovadas" cor="emerald" icone={CheckCircle2} />
                    <Resumo numero={(resumo.atencao || 0) + (resumo.andamento || 0)} label="Observações" cor="amber" icone={AlertTriangle} />
                    <Resumo numero={resumo.pendente || 0} label="Pendentes" cor="red" icone={Clock3} />
                </section>

                <section className="rounded-[28px] bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-5">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.15em] text-sky-600">Histórico oficial</p>
                            <h2 className="mt-1 text-lg font-black text-slate-950">Inspeções por mês</h2>
                        </div>
                        <select value={anoSelecionado} onChange={(evento) => setAnoSelecionado(Number(evento.target.value))} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:border-sky-400">
                            {anosDisponiveis.map((ano) => <option key={ano} value={ano}>{ano}</option>)}
                        </select>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
                        {meses.map((mes) => {
                            const aberto = mes.indice === mesAberto;
                            return (
                                <button key={mes.competencia} type="button" onClick={() => setMesAberto(mes.indice)} className={`min-h-[104px] rounded-2xl border p-2 text-center transition ${aberto ? `${classeStatus(mes.status.cor)} shadow-sm ring-2 ring-current/10` : "border-slate-200 bg-white hover:bg-slate-50"}`}>
                                    <span className="block text-xs font-black text-slate-700">{mes.nome}</span>
                                    <span className={`mx-auto mt-2 flex h-8 w-8 items-center justify-center rounded-full border ${classeStatus(mes.status.cor)}`}>
                                        {mes.status.chave === "conforme" ? <Check className="h-5 w-5" /> : mes.status.chave === "atencao" ? <AlertTriangle className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
                                    </span>
                                    <span className="mt-2 block text-[10px] font-bold leading-tight text-slate-500">{mes.status.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    <DetalheMes mes={selecionado} />
                </section>

                <section className="grid gap-2 sm:grid-cols-2">
                    <Prazo icone={Wrench} label="Próxima manutenção/recarga" valor={formatarData(extintor.proximaManutencao)} />
                    <Prazo icone={Gauge} label="Próximo teste hidrostático" valor={formatarData(extintor.proximoEnsaioHidrostatico)} />
                </section>

                <p className="pb-3 text-center text-xs text-slate-400">Informações públicas · Consulta somente leitura</p>
            </div>
        </main>
    );
}

function Resumo({ numero, label, cor, icone: Icone }) {
    const classes = { emerald: "text-emerald-600", amber: "text-amber-600", red: "text-red-600" }[cor];
    return <div className="text-center"><Icone className={`mx-auto h-6 w-6 ${classes}`} /><strong className={`mt-1 block text-2xl font-black ${classes}`}>{numero}</strong><span className="text-[10px] font-bold uppercase text-slate-500">{label}</span></div>;
}

function DetalheMes({ mes }) {
    const [aberto, setAberto] = useState(true);
    const inspecao = mes?.inspecao;
    const respostas = inspecao?.respostas || {};

    return (
        <div className={`mt-4 overflow-hidden rounded-2xl border ${classeStatus(mes.status.cor)}`}>
            <button type="button" onClick={() => setAberto((valor) => !valor)} className="flex w-full items-center justify-between gap-3 p-3 text-left">
                <div><strong className="text-sm">{mes.nome}/{mes.competencia.slice(0, 4)}</strong><span className="ml-2 text-xs font-bold">· {mes.status.label}</span></div>
                {aberto ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </button>
            {aberto && (
                <div className="border-t border-current/10 bg-white p-3 text-slate-700">
                    {inspecao ? (
                        <>
                            <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                                {ITENS_CHECKLIST_EXTINTOR_MENSAL.map((item) => {
                                    const resposta = respostas[item.id];
                                    const aprovado = resposta === "conforme";
                                    return <div key={item.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-xs"><span>{item.label}</span><span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${aprovado ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{aprovado ? <Check className="h-4 w-4" /> : <AlertTriangle className="h-3.5 w-3.5" />}</span></div>;
                                })}
                            </div>
                            {inspecao.observacoes && <div className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-800 ring-1 ring-amber-200"><strong className="block">Observação</strong><p className="mt-1">{inspecao.observacoes}</p></div>}
                            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500"><span className="flex items-center gap-1.5"><UserRound className="h-4 w-4" /> {inspecao.responsavel || "Responsável não informado"}</span><span className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4" /> {formatarData(inspecao.atualizadoEm || `${mes.competencia}-01`)}</span></div>
                        </>
                    ) : <div className="py-5 text-center"><Clock3 className="mx-auto h-7 w-7 text-slate-300" /><p className="mt-2 text-sm font-bold text-slate-500">Nenhuma inspeção registrada neste mês.</p></div>}
                </div>
            )}
        </div>
    );
}

function Prazo({ icone: Icone, label, valor }) {
    return <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200"><span className="rounded-xl bg-sky-50 p-2 text-sky-700"><Icone className="h-5 w-5" /></span><div><span className="block text-[10px] font-black uppercase tracking-wide text-slate-400">{label}</span><strong className="mt-1 block text-sm text-slate-800">{valor}</strong></div></div>;
}

function EstadoFicha({ icone: Icone, titulo, descricao, alerta = false }) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4"><div className="w-full max-w-md rounded-2xl bg-white p-7 text-center shadow-sm"><Icone className={`mx-auto ${alerta ? "text-amber-500" : "text-sky-600"}`} size={40} /><h1 className="mt-3 text-xl font-black text-slate-950">{titulo}</h1><p className="mt-2 text-sm text-slate-500">{descricao}</p></div></div>;
}
