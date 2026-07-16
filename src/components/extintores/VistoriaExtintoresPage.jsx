import React, { useMemo, useState } from "react";
import { AlertTriangle, CalendarClock, CheckCircle2, ClipboardCheck, History, Save, ShieldCheck } from "lucide-react";
import { ITENS_CHECKLIST_EXTINTOR_MENSAL, listarExtintoresVistoria, listarInspecoesExtintores, salvarInspecaoExtintor } from "../../services/extintoresVistoriaService";
import dashboardHeroBackground from "../../assets/dashboard-hero-sst.png";

export function VistoriaExtintoresPage() {
    const extintores = useMemo(() => listarExtintoresVistoria(), []);
    const [extintorId, setExtintorId] = useState(extintores[0]?.id || "");
    const [respostas, setRespostas] = useState({});
    const [observacoes, setObservacoes] = useState("");
    const [mensagem, setMensagem] = useState("");
    const [historico, setHistorico] = useState(() => listarInspecoesExtintores());
    const extintor = extintores.find((item) => item.id === extintorId);
    const concluidos = ITENS_CHECKLIST_EXTINTOR_MENSAL.filter((item) => respostas[item.id] === "conforme" || respostas[item.id] === "nao_conforme").length;
    const totalAtencao = historico.filter((item) => item.status === "Atenção").length;
    const totalConformes = historico.filter((item) => item.status === "Conforme").length;
    const pendentes = Math.max(0, extintores.length - new Set(historico.map((item) => item.extintorId)).size);
    const dataHero = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
    const diaHero = new Date().toLocaleDateString("pt-BR", { weekday: "long" });
    const horaHero = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

    function selecionar(evento) {
        setExtintorId(evento.target.value);
        setRespostas({});
        setObservacoes("");
        setMensagem("");
    }

    function salvar() {
        if (!extintor) return;
        const registro = salvarInspecaoExtintor({ extintorId, codigo: extintor.codigo, competencia: new Date().toISOString().slice(0, 7), respostas, observacoes, responsavel: "Usuário atual", status: Object.values(respostas).includes("nao_conforme") ? "Atenção" : concluidos === ITENS_CHECKLIST_EXTINTOR_MENSAL.length ? "Conforme" : "Em andamento" });
        setHistorico((atual) => [registro, ...atual.filter((item) => item.id !== registro.id)]);
        setMensagem(`Vistoria do ${extintor.codigo} salva localmente.`);
    }

    return (
        <section className="min-h-full bg-slate-50/70 px-4 py-6 md:px-7 md:py-8">
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

                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><Resumo titulo="Equipamentos" subtitulo="Total cadastrado" valor={extintores.length} icone={ShieldCheck} cor="sky" /><Resumo titulo="Pendentes" subtitulo="Aguardando vistoria" valor={pendentes} icone={ClipboardCheck} cor="amber" /><Resumo titulo="Conformes" subtitulo="Inspeção aprovada" valor={totalConformes} icone={CheckCircle2} cor="emerald" /><Resumo titulo="Com atenção" subtitulo="Exigem acompanhamento" valor={totalAtencao} icone={AlertTriangle} cor="red" /></div>

                <div className="space-y-5">
                    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                        <div className="border-b border-slate-200 p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-sky-700">Checklist mensal</p><h2 className="mt-1 text-xl font-black text-slate-950">Conferência do equipamento</h2></div><span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600">{concluidos}/{ITENS_CHECKLIST_EXTINTOR_MENSAL.length} respondidos</span></div><label className="mt-4 block text-xs font-bold text-slate-600">Equipamento<select value={extintorId} onChange={selecionar} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"><option value="">Selecione um equipamento</option>{extintores.map((item) => <option key={item.id} value={item.id}>{item.codigo} · {item.localizacao} · {item.tipo} {item.capacidade}</option>)}</select></label>{extintor && <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-500"><span><b className="text-slate-900">{extintor.codigo}</b> · {extintor.localizacao}</span><span>{extintor.ponto}</span><span>{extintor.tipo} · {extintor.capacidade}</span></div>}</div>
                        <div className="space-y-2 p-5">{ITENS_CHECKLIST_EXTINTOR_MENSAL.map((item, indice) => <div key={item.id} className="flex flex-col gap-3 rounded-lg border border-slate-100 bg-slate-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><span className="mt-0.5 text-xs font-black text-slate-400">{String(indice + 1).padStart(2, "0")}</span><span className="text-sm font-semibold text-slate-700">{item.label}</span></div><div className="flex shrink-0 gap-2"><Resposta ativo={respostas[item.id] === "conforme"} onClick={() => setRespostas((atual) => ({ ...atual, [item.id]: "conforme" }))} tipo="conforme">Conforme</Resposta><Resposta ativo={respostas[item.id] === "nao_conforme"} onClick={() => setRespostas((atual) => ({ ...atual, [item.id]: "nao_conforme" }))} tipo="nao_conforme">Atenção</Resposta></div></div>)}</div>
                        <div className="border-t border-slate-200 p-5"><label className="block text-xs font-bold text-slate-600">Observações<textarea value={observacoes} onChange={(evento) => setObservacoes(evento.target.value)} rows={3} placeholder="Descreva uma irregularidade ou observação" className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" /></label><button type="button" onClick={salvar} disabled={!extintor} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"><Save size={17} /> Salvar vistoria</button></div>
                    </div>

                    <aside className="space-y-5"><div className="min-h-[220px] rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><History size={18} className="text-slate-500" /><h2 className="font-black text-slate-950">Histórico recente</h2></div><span className="text-xs font-bold text-slate-400">{historico.length} registro(s)</span></div><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{historico.slice(0, 6).map((item) => <div key={item.id} className="rounded-lg border border-slate-100 bg-slate-50/70 p-3"><div className="flex items-center justify-between gap-2"><p className="font-bold text-slate-800">{item.codigo}</p><Status status={item.status} /></div><p className="mt-1 text-xs text-slate-500">{item.competencia} · {item.responsavel || "Usuário atual"}</p></div>)}{!historico.length && <p className="text-sm text-slate-500">Nenhuma vistoria registrada ainda.</p>}</div></div><div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-xs leading-relaxed text-sky-800"><ClipboardCheck size={17} className="shrink-0" /><p className="font-bold">Periodicidade mensal</p><p>A inspeção visual não substitui manutenção técnica, recarga ou teste hidrostático.</p></div></aside>
                </div>
            </div>
        </section>
    );
}

function Resumo({ titulo, subtitulo, valor, icone: Icone, cor }) { const cores = { sky: "text-sky-600 bg-sky-50 border-sky-400", amber: "text-amber-600 bg-amber-50 border-amber-400", emerald: "text-emerald-600 bg-emerald-50 border-emerald-400", red: "text-red-600 bg-red-50 border-red-400" }; return <div className={`flex min-h-[82px] items-center gap-3 rounded-xl border border-slate-200 border-t-[3px] bg-white px-3 py-2.5 shadow-sm ${cores[cor]}`}><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${cores[cor]}`}><Icone size={18} /></span><div className="min-w-0 flex-1 text-center"><p className="truncate text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">{titulo}</p><p className="mt-0.5 text-2xl font-black leading-none text-slate-950">{valor}</p><p className="mt-1 truncate text-[9px] font-medium text-slate-500">{subtitulo}</p></div></div>; }
function Status({ status }) { const estilo = status === "Conforme" ? "bg-emerald-50 text-emerald-700" : status === "Atenção" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"; return <span className={`rounded-full px-2 py-1 text-[10px] font-black ${estilo}`}>{status}</span>; }
function Resposta({ ativo, onClick, tipo, children }) { return <button type="button" onClick={onClick} className={`rounded-md px-2.5 py-1.5 text-[11px] font-bold ring-1 ${ativo ? tipo === "conforme" ? "bg-emerald-100 text-emerald-800 ring-emerald-300" : "bg-amber-100 text-amber-800 ring-amber-300" : "bg-white text-slate-500 ring-slate-200"}`}>{ativo && <CheckCircle2 size={12} className="mr-1 inline" />}{children}</button>; }
