import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, BadgeCheck, CalendarClock, CheckCircle2, ClipboardCheck, Eye, FileCheck2, Gauge, GitBranch, History, MapPin, Save, ShieldCheck, Tag, Wrench } from "lucide-react";
import { ITENS_CHECKLIST_EXTINTOR_MENSAL, listarExtintoresVistoria, listarInspecoesExtintores, salvarInspecaoExtintor } from "../../services/extintoresVistoriaService";
import dashboardHeroBackground from "../../assets/dashboard-hero-sst.webp";
import extintorPqsAbc from "../../assets/extintor-pqs-abc-6kg-ilustrativo-v2.png";
import extintorPqsBc from "../../assets/extintor-pqs-bc.png";
import extintorCo2 from "../../assets/extintor-co2.png";
import extintorAgua from "../../assets/extintor-agua-pressurizada.png";
import extintorEspuma from "../../assets/extintor-espuma-mecanica.png";

function obterCompetenciaAtual() {
    const agora = new Date();
    return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}`;
}

function imagemPorTipoExtintor(tipo = "") {
    const normalizado = String(tipo).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
    if (normalizado.includes("CO2")) return extintorCo2;
    if (normalizado.includes("AGUA")) return extintorAgua;
    if (normalizado.includes("ESPUMA")) return extintorEspuma;
    if (normalizado.includes("PQS BC")) return extintorPqsBc;
    return extintorPqsAbc;
}

const ICONES_CHECKLIST = [Eye, Wrench, BadgeCheck, Gauge, GitBranch, ShieldCheck, FileCheck2];

export function VistoriaExtintoresPage() {
    const extintores = useMemo(() => listarExtintoresVistoria(), []);
    const [extintorId, setExtintorId] = useState(extintores[0]?.id || "");
    const [competencia, setCompetencia] = useState(obterCompetenciaAtual);
    const [respostas, setRespostas] = useState({});
    const [observacoes, setObservacoes] = useState("");
    const [mensagem, setMensagem] = useState("");
    const [historico, setHistorico] = useState(() => listarInspecoesExtintores());
    const extintor = extintores.find((item) => item.id === extintorId);
    const concluidos = ITENS_CHECKLIST_EXTINTOR_MENSAL.filter((item) => respostas[item.id] === "conforme" || respostas[item.id] === "nao_conforme").length;
    const historicoCompetencia = historico.filter((item) => item.competencia === competencia);
    const registroAtual = historicoCompetencia.find((item) => String(item.extintorId) === String(extintorId));
    const totalNaoConformes = historicoCompetencia.filter((item) => item.status === "Atenção").length;
    const totalItensAtencao = historicoCompetencia.reduce((total, item) => total + Object.values(item.respostas || {}).filter((resposta) => resposta === "nao_conforme").length, 0);
    const totalConformes = historicoCompetencia.filter((item) => item.status === "Conforme").length;
    const percentualConformes = extintores.length ? Math.round((totalConformes / extintores.length) * 100) : 0;
    const percentualAtencoes = historicoCompetencia.length ? Math.round((totalItensAtencao / (historicoCompetencia.length * ITENS_CHECKLIST_EXTINTOR_MENSAL.length)) * 100) : 0;
    const percentualNaoConformes = extintores.length ? Math.round((totalNaoConformes / extintores.length) * 100) : 0;
    const dataHero = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
    const diaHero = new Date().toLocaleDateString("pt-BR", { weekday: "long" });
    const horaHero = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

    useEffect(() => {
        const registro = historico.find(
            (item) => String(item.extintorId) === String(extintorId) && item.competencia === competencia,
        );
        setRespostas(registro?.respostas || {});
        setObservacoes(registro?.observacoes || "");
    }, [competencia, extintorId, historico]);

    function selecionar(evento) {
        setExtintorId(evento.target.value);
        setMensagem("");
    }

    function salvar() {
        if (!extintor) return;
        const registroExistente = historico.find(
            (item) => String(item.extintorId) === String(extintorId) && item.competencia === competencia,
        );
        const registro = salvarInspecaoExtintor({ id: registroExistente?.id, extintorId, codigo: extintor.codigo, competencia, respostas, observacoes, responsavel: "Usuário atual", status: Object.values(respostas).includes("nao_conforme") ? "Atenção" : concluidos === ITENS_CHECKLIST_EXTINTOR_MENSAL.length ? "Conforme" : "Em andamento" });
        setHistorico((atual) => [registro, ...atual.filter((item) => item.id !== registro.id)]);
        setMensagem(`Vistoria do ${extintor.codigo} salva localmente.`);
    }

    return (
        <section className="min-h-full bg-slate-50/70 px-4 pb-6 pt-0 md:px-7 md:pb-8 md:pt-0">
            <div className="mx-auto max-w-[1480px] space-y-6">
                <section className="relative overflow-hidden rounded-[22px] border border-[#E5E9EF] bg-[#111827] shadow-[0_10px_28px_rgba(26,35,50,0.12)]">
                    <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${dashboardHeroBackground})` }} />
                    <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(17,24,39,0.48)_0%,rgba(17,24,39,0.24)_48%,rgba(17,24,39,0.08)_100%)]" />
                    <div className="relative flex min-h-[145px] flex-col justify-between gap-5 px-6 py-6 text-white lg:flex-row lg:items-center" style={{ textShadow: "0 2px 10px rgba(0,0,0,.65)" }}>
                        <div><p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-300">SafeScan Brasil</p><h1 className="mt-2 text-xl font-black md:text-2xl">Vistoria de extintores</h1><p className="mt-2 text-base font-bold text-slate-200">Inspeção mensal e acompanhamento dos equipamentos.</p><div className="mt-5 h-1 w-14 rounded-full bg-[#1E7C3A]" /></div>
                        <div className="rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm font-black shadow-[0_8px_24px_rgba(0,0,0,.22)] backdrop-blur"><div className="flex flex-wrap items-center gap-2"><CalendarClock className="h-4 w-4 text-emerald-300" /><span>{dataHero}</span><span className="text-emerald-300">•</span><span className="capitalize">{diaHero}</span><span className="text-emerald-300">•</span><span>{horaHero}</span></div></div>
                    </div>
                </section>

                {mensagem && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{mensagem}</div>}

                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><Resumo titulo="Equipamentos cadastrados" subtitulo="Total de equipamentos" valor={extintores.length} percentual={100} icone={ShieldCheck} cor="sky" /><Resumo titulo="Inspeções aprovadas" subtitulo="Conformes" valor={totalConformes} percentual={percentualConformes} icone={CheckCircle2} cor="emerald" /><Resumo titulo="Atenções" subtitulo="Requerem atenção" valor={totalItensAtencao} percentual={percentualAtencoes} icone={AlertTriangle} cor="amber" /><Resumo titulo="Não conformes" subtitulo="Exigem ação" valor={totalNaoConformes} percentual={percentualNaoConformes} icone={AlertTriangle} cor="red" /></div>

                <div className="space-y-5">
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="border-b border-slate-200 p-5">
                            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_190px_230px] lg:items-end">
                                <label className="block text-xs font-black uppercase tracking-wide text-slate-600">Equipamento<select value={extintorId} onChange={selecionar} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"><option value="">Selecione um equipamento</option>{extintores.map((item) => <option key={item.id} value={item.id}>{item.codigo} · {item.localizacao} · {item.tipo} {item.capacidade}</option>)}</select></label>
                                <label className="block text-xs font-black uppercase tracking-wide text-slate-600">Mês / ano<input type="month" value={competencia} onChange={(evento) => { setCompetencia(evento.target.value); setMensagem(""); }} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" /></label>
                                <div><div className="flex items-center justify-between text-xs font-black uppercase tracking-wide text-slate-500"><span>Progresso da inspeção</span><span>{concluidos}/{ITENS_CHECKLIST_EXTINTOR_MENSAL.length}</span></div><div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-500 transition-all" style={{ width: `${Math.round((concluidos / ITENS_CHECKLIST_EXTINTOR_MENSAL.length) * 100)}%` }} /></div></div>
                            </div>
                        </div>

                        <div className="grid gap-4 p-4 xl:grid-cols-[320px_minmax(0,1fr)]">
                            <aside className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                                {extintor ? <><div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200"><div className="flex items-center justify-between gap-2 px-1 pb-2"><h2 className="text-3xl font-black text-slate-950">{extintor.codigo}</h2><span className="rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-black text-emerald-700">{extintor.situacaoOperacional || "Em operação"}</span></div><div className="flex h-[195px] items-center justify-center"><img src={imagemPorTipoExtintor(extintor.tipo)} alt={`Extintor ${extintor.tipo}`} className="h-full w-full object-contain" /></div></div><div className="mt-3"><div className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white px-3"><DadoEquipamento icone={Tag} rotulo="Tipo" valor={extintor.tipo} /><DadoEquipamento icone={MapPin} rotulo="Local" valor={extintor.localizacao || extintor.ponto || "Não informado"} /><DadoEquipamento icone={Gauge} rotulo="Capacidade" valor={extintor.capacidade} /><DadoEquipamento icone={ShieldCheck} rotulo="Código" valor={extintor.codigo} /><DadoEquipamento icone={CheckCircle2} rotulo="Situação" valor={extintor.situacaoOperacional || "Em operação"} destaque /><DadoEquipamento icone={CalendarClock} rotulo="Última vistoria" valor={registroAtual?.atualizadoEm ? new Date(registroAtual.atualizadoEm).toLocaleDateString("pt-BR") : "—"} /></div></div></> : <div className="flex min-h-[420px] items-center justify-center text-center text-sm font-bold text-slate-400">Selecione um equipamento para iniciar.</div>}
                            </aside>

                            <div className="min-w-0"><div className="mb-2"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-sky-700">Checklist de inspeção visual</p><h2 className="mt-0.5 text-lg font-black text-slate-950">Conferência do equipamento</h2></div><div className="space-y-2">{ITENS_CHECKLIST_EXTINTOR_MENSAL.map((item, indice) => <div key={item.id} className="grid min-h-[58px] gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-[0_2px_8px_rgba(15,23,42,0.03)] sm:grid-cols-[minmax(0,1fr)_300px] sm:items-center"><div className="flex items-center gap-2.5"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-50 text-xs font-black text-sky-700">{String(indice + 1).padStart(2, "0")}</span><IconeChecklist indice={indice} /><span className="text-sm font-bold text-slate-700">{item.label}</span></div><div className="grid grid-cols-2 gap-2"><Resposta ativo={respostas[item.id] === "conforme"} onClick={() => setRespostas((atual) => ({ ...atual, [item.id]: "conforme" }))} tipo="conforme">Conforme</Resposta><Resposta ativo={respostas[item.id] === "nao_conforme"} onClick={() => setRespostas((atual) => ({ ...atual, [item.id]: "nao_conforme" }))} tipo="nao_conforme">Não conforme</Resposta></div></div>)}</div></div>
                        </div>

                        <div className="grid gap-4 border-t border-slate-200 p-5 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-end"><label className="block text-xs font-bold text-slate-600">Observações<textarea value={observacoes} onChange={(evento) => setObservacoes(evento.target.value)} rows={3} placeholder="Descreva uma irregularidade ou observação" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" /></label><button type="button" onClick={salvar} disabled={!extintor} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"><Save size={18} /> Salvar vistoria</button></div>
                    </div>

                    <aside className="space-y-5"><div className="min-h-[220px] rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><History size={18} className="text-slate-500" /><h2 className="font-black text-slate-950">Histórico recente</h2></div><span className="text-xs font-bold text-slate-400">{historico.length} registro(s)</span></div><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{historico.slice(0, 6).map((item) => <div key={item.id} className="rounded-lg border border-slate-100 bg-slate-50/70 p-3"><div className="flex items-center justify-between gap-2"><p className="font-bold text-slate-800">{item.codigo}</p><Status status={item.status} /></div><p className="mt-1 text-xs text-slate-500">{item.competencia} · {item.responsavel || "Usuário atual"}</p></div>)}{!historico.length && <p className="text-sm text-slate-500">Nenhuma vistoria registrada ainda.</p>}</div></div><div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-xs leading-relaxed text-sky-800"><ClipboardCheck size={17} className="shrink-0" /><p className="font-bold">Periodicidade mensal</p><p>A inspeção visual não substitui manutenção técnica, recarga ou teste hidrostático.</p></div></aside>
                </div>
            </div>
        </section>
    );
}

function Resumo({ titulo, subtitulo, valor, percentual, icone: Icone, cor }) { const cores = { sky: { icone: "border-sky-300 bg-sky-50 text-sky-600", barra: "bg-sky-500" }, amber: { icone: "border-amber-300 bg-amber-50 text-amber-600", barra: "bg-amber-400" }, emerald: { icone: "border-emerald-300 bg-emerald-50 text-emerald-600", barra: "bg-emerald-400" }, red: { icone: "border-red-300 bg-red-50 text-red-600", barra: "bg-red-400" } }; const estilo = cores[cor]; return <div className="min-h-[104px] rounded-xl border border-slate-200 bg-white p-3 shadow-sm"><div className="flex items-center justify-center gap-3"><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${estilo.icone}`}><Icone size={20} /></span><div className="min-w-0 text-center"><p className="truncate text-[9px] font-black uppercase tracking-[0.1em] text-slate-500">{titulo}</p><p className="mt-0.5 text-2xl font-black leading-none text-slate-950">{valor}</p><p className="mt-1 truncate text-[9px] font-medium text-slate-500">{subtitulo}</p></div></div><div className="mt-3 flex items-center gap-2"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${estilo.barra}`} style={{ width: `${Math.min(100, Math.max(0, percentual))}%` }} /></div><span className="w-8 text-center text-[9px] font-black text-slate-500">{percentual}%</span></div></div>; }
function IconeChecklist({ indice }) { const Icone = ICONES_CHECKLIST[indice] || ClipboardCheck; return <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600"><Icone size={17} /></span>; }
function DadoEquipamento({ icone: Icone, rotulo, valor, destaque = false }) { return <div className="grid grid-cols-[22px_82px_minmax(0,1fr)] items-center gap-1 py-2 text-xs"><Icone size={15} className="text-sky-600" /><span className="font-bold text-slate-500">{rotulo}</span><span className={`truncate font-black ${destaque ? "text-emerald-700" : "text-slate-800"}`}>{valor}</span></div>; }
function Status({ status }) { const estilo = status === "Conforme" ? "bg-emerald-50 text-emerald-700" : status === "Atenção" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"; return <span className={`rounded-full px-2 py-1 text-[10px] font-black ${estilo}`}>{status}</span>; }
function Resposta({ ativo, onClick, tipo, children }) { return <button type="button" onClick={onClick} className={`min-h-10 w-full rounded-lg px-3 py-2 text-xs font-black ring-1 transition ${ativo ? tipo === "conforme" ? "bg-emerald-100 text-emerald-800 ring-emerald-400" : "bg-red-100 text-red-800 ring-red-400" : tipo === "conforme" ? "bg-white text-emerald-700 ring-emerald-200 hover:bg-emerald-50" : "bg-white text-red-700 ring-red-200 hover:bg-red-50"}`}>{ativo && <CheckCircle2 size={14} className="mr-1.5 inline" />}{children}</button>; }
