/* eslint-disable no-unused-vars */
import React, { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { motion } from "framer-motion";
import {
    AlertTriangle,
    BadgeCheck,
    Building2,
    CalendarClock,
    CheckCircle2,
    ClipboardCheck,
    Database,
    Download,
    Eye,
    FileText,
    Filter,
    HardHat,
    LayoutDashboard,
    Lock,
    LogIn,
    Plus,
    QrCode,
    Search,
    ShieldCheck,
    Upload,
    UserRound,
    Users,
    XCircle,
} from "lucide-react";

const hoje = new Date();
const DAY = 1000 * 60 * 60 * 24;

function addDays(days) {
    const d = new Date(hoje);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
}

const treinamentosBase = [
    { id: 1, nome: "Integração SST", validadePadrao: 365, categoria: "Obrigatório" },
    { id: 2, nome: "NR-35 Trabalho em Altura", validadePadrao: 730, categoria: "Alto Risco" },
    { id: 3, nome: "NR-12 Segurança em Máquinas", validadePadrao: 730, categoria: "Operacional" },
    { id: 4, nome: "NR-10 Segurança em Eletricidade", validadePadrao: 730, categoria: "Elétrica" },
    { id: 5, nome: "PEMT / PTA", validadePadrao: 365, categoria: "Equipamento" },
    { id: 6, nome: "Trabalho a Quente / Solda", validadePadrao: 365, categoria: "Alto Risco" },
    { id: 7, nome: "Lixadeira / Esmerilhadeira", validadePadrao: 365, categoria: "Ferramentas" },
];

const colaboradoresIniciais = [
    {
        id: 101,
        nome: "Luiz Paulo Costa",
        empresa: "ABC Montagens",
        funcao: "Soldador",
        matricula: "M-0145",
        status: "Ativo",
        token: "SST-LUIZ-8F2A",
        treinamentos: [
            { treinamentoId: 1, realizado: addDays(-160), vencimento: addDays(205), arquivo: "integracao_luiz.pdf" },
            { treinamentoId: 2, realizado: addDays(-500), vencimento: addDays(230), arquivo: "nr35_luiz.pdf" },
            { treinamentoId: 6, realizado: addDays(-370), vencimento: addDays(-5), arquivo: "solda_luiz.pdf" },
            { treinamentoId: 7, realizado: addDays(-340), vencimento: addDays(25), arquivo: "lixadeira_luiz.pdf" },
        ],
    },
    {
        id: 102,
        nome: "Marcos Vinícius Lima",
        empresa: "RDB Serviços Industriais",
        funcao: "Montador",
        matricula: "RDB-229",
        status: "Ativo",
        token: "SST-MARCOS-A73C",
        treinamentos: [
            { treinamentoId: 1, realizado: addDays(-40), vencimento: addDays(325), arquivo: "integracao_marcos.pdf" },
            { treinamentoId: 2, realizado: addDays(-700), vencimento: addDays(30), arquivo: "nr35_marcos.pdf" },
            { treinamentoId: 3, realizado: addDays(-300), vencimento: addDays(430), arquivo: "nr12_marcos.pdf" },
        ],
    },
    {
        id: 103,
        nome: "Renata Souza",
        empresa: "LR Manutenção",
        funcao: "Eletricista",
        matricula: "LR-087",
        status: "Ativo",
        token: "SST-RENATA-91D0",
        treinamentos: [
            { treinamentoId: 1, realizado: addDays(-200), vencimento: addDays(165), arquivo: "integracao_renata.pdf" },
            { treinamentoId: 4, realizado: addDays(-760), vencimento: addDays(-30), arquivo: "nr10_renata.pdf" },
            { treinamentoId: 5, realizado: addDays(-80), vencimento: addDays(285), arquivo: "pemt_renata.pdf" },
        ],
    },
    {
        id: 104,
        nome: "Carlos Henrique Alves",
        empresa: "MTS Engenharia",
        funcao: "Operador PEMT",
        matricula: "MTS-331",
        status: "Ativo",
        token: "SST-CARLOS-33EF",
        treinamentos: [
            { treinamentoId: 1, realizado: addDays(-90), vencimento: addDays(275), arquivo: "integracao_carlos.pdf" },
            { treinamentoId: 2, realizado: addDays(-200), vencimento: addDays(530), arquivo: "nr35_carlos.pdf" },
            { treinamentoId: 5, realizado: addDays(-350), vencimento: addDays(15), arquivo: "pemt_carlos.pdf" },
        ],
    },
];

function diasParaVencer(dataISO) {
    const venc = new Date(`${dataISO}T12:00:00`);
    const base = new Date(hoje.toISOString().slice(0, 10) + "T12:00:00");
    return Math.ceil((venc - base) / DAY);
}

function statusDocumento(dataISO) {
    const dias = diasParaVencer(dataISO);
    if (dias < 0) return { chave: "vencido", texto: "Vencido", icon: XCircle, classe: "bg-red-50 text-red-700 ring-red-200", barra: "bg-red-500" };
    if (dias <= 30) return { chave: "vencendo", texto: "A vencer", icon: AlertTriangle, classe: "bg-amber-50 text-amber-700 ring-amber-200", barra: "bg-amber-500" };
    return { chave: "emdia", texto: "Em dia", icon: CheckCircle2, classe: "bg-emerald-50 text-emerald-700 ring-emerald-200", barra: "bg-emerald-500" };
}

function formatDate(dataISO) {
    return new Date(`${dataISO}T12:00:00`).toLocaleDateString("pt-BR");
}

function classNames(...items) {
    return items.filter(Boolean).join(" ");
}

function StatusPill({ status, small = false }) {
    const Icon = status.icon;
    return (
        <span className={classNames("inline-flex items-center gap-1 rounded-full ring-1", status.classe, small ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm font-medium")}>
            <Icon className={small ? "h-3.5 w-3.5" : "h-4 w-4"} />
            {status.texto}
        </span>
    );
}

function QRCodeReal({ token, size = 160 }) {
    const urlConsulta = `https://controle-sst-qr.app/consulta/${token}`;

    return (
        <div className="rounded-2xl bg-white p-3 shadow-inner ring-1 ring-slate-200">
            <QRCodeSVG
                value={urlConsulta}
                size={size}
                level="H"
                includeMargin
                bgColor="#ffffff"
                fgColor="#0f172a"
            />
            <p className="mt-2 max-w-[180px] break-all text-center text-[10px] text-slate-400">{urlConsulta}</p>
        </div>
    );
}

function obterTreinamento(id) {
    return treinamentosBase.find((t) => t.id === id) || { nome: "Treinamento não cadastrado", categoria: "-" };
}

function statusGeral(colaborador) {
    const status = colaborador.treinamentos.map((t) => statusDocumento(t.vencimento).chave);
    if (status.includes("vencido")) return { texto: "Bloqueado", classe: "bg-red-600 text-white", detalhe: "Possui treinamento vencido" };
    if (status.includes("vencendo")) return { texto: "Atenção", classe: "bg-amber-500 text-white", detalhe: "Possui treinamento a vencer" };
    return { texto: "Apto", classe: "bg-emerald-600 text-white", detalhe: "Treinamentos válidos" };
}

function Card({ children, className = "" }) {
    return <div className={classNames("rounded-3xl border border-slate-200 bg-white p-5 shadow-sm", className)}>{children}</div>;
}

function Header({ titulo, subtitulo, acao }) {
    return (
        <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-950">{titulo}</h1>
                <p className="mt-1 text-sm text-slate-500">{subtitulo}</p>
            </div>
            {acao}
        </div>
    );
}

function Dashboard({ colaboradores, onSelectColab }) {
    const indicadores = useMemo(() => {
        const docs = colaboradores.flatMap((c) => c.treinamentos.map((t) => ({ ...t, colaborador: c })));
        const vencidos = docs.filter((d) => statusDocumento(d.vencimento).chave === "vencido").length;
        const vencendo = docs.filter((d) => statusDocumento(d.vencimento).chave === "vencendo").length;
        const emDia = docs.filter((d) => statusDocumento(d.vencimento).chave === "emdia").length;
        const empresas = new Set(colaboradores.map((c) => c.empresa)).size;
        return { docs, vencidos, vencendo, emDia, empresas };
    }, [colaboradores]);

    const cards = [
        { label: "Colaboradores", valor: colaboradores.length, icon: Users, detalhe: "Ativos no sistema" },
        { label: "Empresas", valor: indicadores.empresas, icon: Building2, detalhe: "Terceiras cadastradas" },
        { label: "Vencidos", valor: indicadores.vencidos, icon: XCircle, detalhe: "Bloqueiam atividade" },
        { label: "A vencer", valor: indicadores.vencendo, icon: AlertTriangle, detalhe: "Próximos 30 dias" },
    ];

    const pendencias = indicadores.docs
        .filter((d) => ["vencido", "vencendo"].includes(statusDocumento(d.vencimento).chave))
        .sort((a, b) => diasParaVencer(a.vencimento) - diasParaVencer(b.vencimento));

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Header
                titulo="Dashboard SST"
                subtitulo="Visão geral dos treinamentos, vencimentos e liberações por QR Code."
                acao={<button className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"><Download className="h-4 w-4" /> Exportar relatório</button>}
            />

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {cards.map((item) => {
                    const Icon = item.icon;
                    return (
                        <Card key={item.label} className="overflow-hidden">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm font-medium text-slate-500">{item.label}</p>
                                    <p className="mt-2 text-3xl font-bold text-slate-950">{item.valor}</p>
                                    <p className="mt-1 text-xs text-slate-400">{item.detalhe}</p>
                                </div>
                                <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
                                    <Icon className="h-5 w-5" />
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
                <Card>
                    <div className="mb-4 flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-slate-950">Pendências críticas</h2>
                            <p className="text-sm text-slate-500">Treinamentos vencidos ou a vencer em até 30 dias.</p>
                        </div>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{pendencias.length} itens</span>
                    </div>
                    <div className="overflow-hidden rounded-2xl border border-slate-200">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                                <tr>
                                    <th className="px-4 py-3">Colaborador</th>
                                    <th className="px-4 py-3">Treinamento</th>
                                    <th className="px-4 py-3">Vencimento</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {pendencias.map((d, idx) => {
                                    const st = statusDocumento(d.vencimento);
                                    return (
                                        <tr key={`${d.colaborador.id}-${d.treinamentoId}-${idx}`} className="hover:bg-slate-50">
                                            <td className="px-4 py-3">
                                                <div className="font-semibold text-slate-900">{d.colaborador.nome}</div>
                                                <div className="text-xs text-slate-500">{d.colaborador.empresa}</div>
                                            </td>
                                            <td className="px-4 py-3 text-slate-700">{obterTreinamento(d.treinamentoId).nome}</td>
                                            <td className="px-4 py-3 text-slate-700">{formatDate(d.vencimento)}</td>
                                            <td className="px-4 py-3"><StatusPill status={st} small /></td>
                                            <td className="px-4 py-3 text-right">
                                                <button onClick={() => onSelectColab(d.colaborador)} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"><Eye className="h-4 w-4" /></button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>

                <Card>
                    <h2 className="text-lg font-bold text-slate-950">Resumo de conformidade</h2>
                    <p className="mt-1 text-sm text-slate-500">Baseado nos certificados cadastrados.</p>
                    <div className="mt-6 space-y-5">
                        {[
                            { label: "Em dia", valor: indicadores.emDia, total: indicadores.docs.length, classe: "bg-emerald-500" },
                            { label: "A vencer", valor: indicadores.vencendo, total: indicadores.docs.length, classe: "bg-amber-500" },
                            { label: "Vencidos", valor: indicadores.vencidos, total: indicadores.docs.length, classe: "bg-red-500" },
                        ].map((i) => (
                            <div key={i.label}>
                                <div className="mb-2 flex justify-between text-sm">
                                    <span className="font-medium text-slate-700">{i.label}</span>
                                    <span className="text-slate-500">{i.valor}/{i.total}</span>
                                </div>
                                <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                                    <div className={classNames("h-full rounded-full", i.classe)} style={{ width: `${Math.max(4, (i.valor / Math.max(1, i.total)) * 100)}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                        <strong className="text-slate-900">Regra do sistema:</strong> vencido bloqueia a atividade; vencendo em até 30 dias gera alerta preventivo; em dia libera consulta no QR Code.
                    </div>
                </Card>
            </div>
        </motion.div>
    );
}

function Colaboradores({ colaboradores, setColaboradores, onSelectColab }) {
    const [busca, setBusca] = useState("");
    const [empresa, setEmpresa] = useState("Todas");
    const [novo, setNovo] = useState({ nome: "", empresa: "", funcao: "", matricula: "" });

    const empresas = ["Todas", ...Array.from(new Set(colaboradores.map((c) => c.empresa)))];
    const filtrados = colaboradores.filter((c) => {
        const texto = `${c.nome} ${c.empresa} ${c.funcao} ${c.matricula}`.toLowerCase();
        return texto.includes(busca.toLowerCase()) && (empresa === "Todas" || c.empresa === empresa);
    });

    const adicionar = () => {
        if (!novo.nome.trim() || !novo.empresa.trim() || !novo.funcao.trim()) return;
        const id = Date.now();
        setColaboradores([
            ...colaboradores,
            {
                id,
                nome: novo.nome.trim(),
                empresa: novo.empresa.trim(),
                funcao: novo.funcao.trim(),
                matricula: novo.matricula.trim() || `CAD-${String(id).slice(-4)}`,
                status: "Ativo",
                token: `SST-${String(id).slice(-6)}`,
                treinamentos: [{ treinamentoId: 1, realizado: addDays(0), vencimento: addDays(365), arquivo: "integracao.pdf" }],
            },
        ]);
        setNovo({ nome: "", empresa: "", funcao: "", matricula: "" });
    };

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Header titulo="Colaboradores" subtitulo="Cadastro, consulta e geração de QR Code individual." />

            <div className="grid gap-6 xl:grid-cols-[0.7fr_1.3fr]">
                <Card>
                    <h2 className="flex items-center gap-2 text-lg font-bold text-slate-950"><Plus className="h-5 w-5" /> Novo colaborador</h2>
                    <p className="mt-1 text-sm text-slate-500">Cadastro simplificado para a primeira versão do sistema.</p>
                    <div className="mt-5 space-y-3">
                        <input value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} placeholder="Nome completo" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300" />
                        <input value={novo.empresa} onChange={(e) => setNovo({ ...novo, empresa: e.target.value })} placeholder="Empresa terceirizada" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300" />
                        <input value={novo.funcao} onChange={(e) => setNovo({ ...novo, funcao: e.target.value })} placeholder="Função" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300" />
                        <input value={novo.matricula} onChange={(e) => setNovo({ ...novo, matricula: e.target.value })} placeholder="Matrícula / Código" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300" />
                        <button onClick={adicionar} className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800">Cadastrar e gerar QR Code</button>
                    </div>
                </Card>

                <Card>
                    <div className="mb-4 flex flex-col gap-3 lg:flex-row">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome, função ou matrícula" className="w-full rounded-2xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-slate-300" />
                        </div>
                        <div className="relative min-w-56">
                            <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <select value={empresa} onChange={(e) => setEmpresa(e.target.value)} className="w-full appearance-none rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-slate-300">
                                {empresas.map((e) => <option key={e}>{e}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                        {filtrados.map((c) => {
                            const geral = statusGeral(c);
                            return (
                                <button key={c.id} onClick={() => onSelectColab(c)} className="rounded-3xl border border-slate-200 bg-white p-4 text-left transition hover:border-slate-300 hover:shadow-md">
                                    <div className="flex items-start gap-4">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700"><UserRound className="h-6 w-6" /></div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <h3 className="truncate font-bold text-slate-950">{c.nome}</h3>
                                                    <p className="text-sm text-slate-500">{c.funcao}</p>
                                                </div>
                                                <span className={classNames("rounded-full px-2.5 py-1 text-xs font-semibold", geral.classe)}>{geral.texto}</span>
                                            </div>
                                            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500">
                                                <span className="rounded-xl bg-slate-50 px-3 py-2">{c.empresa}</span>
                                                <span className="rounded-xl bg-slate-50 px-3 py-2">{c.matricula}</span>
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </Card>
            </div>
        </motion.div>
    );
}

function Treinamentos({ colaboradores, setColaboradores }) {
    const [colabId, setColabId] = useState(colaboradores[0]?.id || "");
    const [treinamentoId, setTreinamentoId] = useState(treinamentosBase[0].id);
    const [vencimento, setVencimento] = useState(addDays(365));
    const [arquivo, setArquivo] = useState("certificado.pdf");
    const [arquivoSelecionado, setArquivoSelecionado] = useState(null);

    const adicionarTreinamento = () => {
        const nomeArquivo = arquivoSelecionado?.name || arquivo || "certificado.pdf";
        setColaboradores(colaboradores.map((c) => {
            if (String(c.id) !== String(colabId)) return c;
            const atualizados = c.treinamentos.filter((t) => t.treinamentoId !== Number(treinamentoId));
            return {
                ...c,
                treinamentos: [...atualizados, { treinamentoId: Number(treinamentoId), realizado: hoje.toISOString().slice(0, 10), vencimento, arquivo: nomeArquivo }],
            };
        }));
        setArquivo(nomeArquivo);
    };

    const documentos = colaboradores.flatMap((c) => c.treinamentos.map((t) => ({ ...t, colaborador: c, treinamento: obterTreinamento(t.treinamentoId) })));

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Header titulo="Treinamentos e certificados" subtitulo="Lançamento de certificados, validade e controle automático de status." />
            <div className="grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
                <Card>
                    <h2 className="flex items-center gap-2 text-lg font-bold text-slate-950"><Upload className="h-5 w-5" /> Lançar certificado</h2>
                    <p className="mt-1 text-sm text-slate-500">Simulação de upload e atualização da validade.</p>
                    <div className="mt-5 space-y-3">
                        <select value={colabId} onChange={(e) => setColabId(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300">
                            {colaboradores.map((c) => <option key={c.id} value={c.id}>{c.nome} — {c.empresa}</option>)}
                        </select>
                        <select value={treinamentoId} onChange={(e) => setTreinamentoId(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300">
                            {treinamentosBase.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
                        </select>
                        <input type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300" />
                        <input value={arquivo} onChange={(e) => setArquivo(e.target.value)} placeholder="Nome do arquivo PDF" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300" />
                        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-600 hover:bg-slate-100">
                            <Upload className="h-4 w-4" />
                            {arquivoSelecionado ? arquivoSelecionado.name : "Selecionar PDF do certificado"}
                            <input
                                type="file"
                                accept="application/pdf,image/*"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    setArquivoSelecionado(file || null);
                                    if (file) setArquivo(file.name);
                                }}
                            />
                        </label>
                        <button onClick={adicionarTreinamento} className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800">Salvar certificado</button>
                    </div>
                </Card>

                <Card>
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-lg font-bold text-slate-950">Base de certificados</h2>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{documentos.length} registros</span>
                    </div>
                    <div className="overflow-hidden rounded-2xl border border-slate-200">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                                <tr>
                                    <th className="px-4 py-3">Colaborador</th>
                                    <th className="px-4 py-3">Treinamento</th>
                                    <th className="px-4 py-3">Arquivo</th>
                                    <th className="px-4 py-3">Validade</th>
                                    <th className="px-4 py-3">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {documentos.map((d, idx) => (
                                    <tr key={`${d.colaborador.id}-${d.treinamentoId}-${idx}`} className="hover:bg-slate-50">
                                        <td className="px-4 py-3">
                                            <div className="font-semibold text-slate-900">{d.colaborador.nome}</div>
                                            <div className="text-xs text-slate-500">{d.colaborador.empresa}</div>
                                        </td>
                                        <td className="px-4 py-3 text-slate-700">{d.treinamento.nome}</td>
                                        <td className="px-4 py-3 text-slate-500"><FileText className="mr-1 inline h-4 w-4" />{d.arquivo}</td>
                                        <td className="px-4 py-3 text-slate-700">{formatDate(d.vencimento)}</td>
                                        <td className="px-4 py-3"><StatusPill status={statusDocumento(d.vencimento)} small /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </motion.div>
    );
}

function ConsultaQR({ colaborador }) {
    if (!colaborador) return null;
    const geral = statusGeral(colaborador);
    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Header titulo="Consulta por QR Code" subtitulo="Modelo da tela que abre no celular quando o QR Code do colaborador é escaneado." />
            <div className="mx-auto max-w-5xl rounded-[2rem] bg-slate-950 p-3 shadow-2xl">
                <div className="rounded-[1.5rem] bg-white p-5 md:p-8">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex gap-4">
                            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 text-slate-800"><HardHat className="h-8 w-8" /></div>
                            <div>
                                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700"><ShieldCheck className="h-3.5 w-3.5" /> Verificação SST</div>
                                <h2 className="text-2xl font-bold text-slate-950">{colaborador.nome}</h2>
                                <p className="mt-1 text-slate-500">{colaborador.funcao} · {colaborador.empresa}</p>
                                <p className="mt-1 text-sm text-slate-400">Matrícula: {colaborador.matricula}</p>
                            </div>
                        </div>
                        <div className="flex flex-col items-center gap-3">
                            <QRCodeReal token={colaborador.token} />
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">{colaborador.token}</span>
                        </div>
                    </div>

                    <div className="mt-8 rounded-3xl border border-slate-200 p-5">
                        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                            <div>
                                <p className="text-sm font-medium text-slate-500">Status geral do colaborador</p>
                                <h3 className="mt-1 text-xl font-bold text-slate-950">{geral.detalhe}</h3>
                            </div>
                            <span className={classNames("inline-flex items-center justify-center rounded-2xl px-5 py-3 text-base font-bold", geral.classe)}>{geral.texto}</span>
                        </div>
                    </div>

                    <div className="mt-6 grid gap-4 md:grid-cols-2">
                        {colaborador.treinamentos.map((t) => {
                            const st = statusDocumento(t.vencimento);
                            const dias = diasParaVencer(t.vencimento);
                            return (
                                <div key={t.treinamentoId} className="rounded-3xl border border-slate-200 p-4">
                                    <div className="mb-4 flex items-start justify-between gap-3">
                                        <div>
                                            <h4 className="font-bold text-slate-950">{obterTreinamento(t.treinamentoId).nome}</h4>
                                            <p className="mt-1 text-sm text-slate-500">{obterTreinamento(t.treinamentoId).categoria}</p>
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
                                            <p className="font-semibold text-slate-700">{formatDate(t.vencimento)}</p>
                                        </div>
                                    </div>
                                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                                        <div className={classNames("h-full rounded-full", st.barra)} style={{ width: st.chave === "vencido" ? "100%" : `${Math.max(12, Math.min(100, 100 - dias / 7))}%` }} />
                                    </div>
                                    <p className="mt-3 text-xs text-slate-500">{dias < 0 ? `Vencido há ${Math.abs(dias)} dia(s).` : `Faltam ${dias} dia(s) para vencer.`}</p>
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-6 rounded-3xl bg-slate-50 p-4 text-sm text-slate-600">
                        Dados sensíveis como CPF completo, endereço, ASO detalhado e documentos médicos não aparecem nesta consulta pública. A visualização completa fica restrita ao perfil autorizado.
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

function Empresas() {
    const empresas = [
        { nome: "ABC Montagens", cnpj: "00.000.000/0001-00", responsavel: "João Silva", status: "Ativa", pendencias: 1 },
        { nome: "RDB Serviços Industriais", cnpj: "11.111.111/0001-11", responsavel: "Patrícia Gomes", status: "Ativa", pendencias: 1 },
        { nome: "LR Manutenção", cnpj: "22.222.222/0001-22", responsavel: "Eduardo Reis", status: "Ativa", pendencias: 1 },
        { nome: "MTS Engenharia", cnpj: "33.333.333/0001-33", responsavel: "Camila Torres", status: "Ativa", pendencias: 1 },
    ];

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Header titulo="Empresas terceirizadas" subtitulo="Controle de prestadores, responsáveis e pendências documentais." acao={<button className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white"><Plus className="h-4 w-4" /> Nova empresa</button>} />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {empresas.map((e) => (
                    <Card key={e.nome}>
                        <div className="mb-4 flex items-start justify-between">
                            <div className="rounded-2xl bg-slate-100 p-3 text-slate-700"><Building2 className="h-5 w-5" /></div>
                            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">{e.status}</span>
                        </div>
                        <h3 className="font-bold text-slate-950">{e.nome}</h3>
                        <p className="mt-1 text-sm text-slate-500">{e.cnpj}</p>
                        <div className="mt-4 rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">
                            <p><strong>Responsável:</strong> {e.responsavel}</p>
                            <p><strong>Pendências:</strong> {e.pendencias}</p>
                        </div>
                    </Card>
                ))}
            </div>
        </motion.div>
    );
}

function Requisitos() {
    const requisitos = [
        "Login com perfis: Administrador, SST, Terceirizada, Portaria e Auditor.",
        "QR Code individual com link real de consulta e token aleatório, sem CPF ou dado sensível.",
        "Controle automático: vencido, a vencer em 30 dias e em dia.",
        "Upload de certificados em PDF com aprovação do Técnico de Segurança.",
        "Banco de dados para empresas, colaboradores, treinamentos, certificados, usuários e logs.",
        "Histórico de alterações para auditoria e fiscalização.",
        "Exportação de relatórios em Excel/PDF por empresa, função e treinamento.",
        "Bloqueio automático de atividade quando houver treinamento obrigatório vencido.",
        "Proteção LGPD: consulta pública mostra somente dados necessários para liberação em campo.",
    ];

    const tabelas = [
        { nome: "usuarios", campos: "id, nome, email, senha_hash, perfil, status" },
        { nome: "empresas", campos: "id, razao_social, cnpj, responsavel, email, status" },
        { nome: "colaboradores", campos: "id, empresa_id, nome, funcao, matricula, token_qr, status" },
        { nome: "treinamentos", campos: "id, nome, categoria, validade_padrao, obrigatorio" },
        { nome: "certificados", campos: "id, colaborador_id, treinamento_id, arquivo_url, data_realizacao, data_vencimento, validado_por" },
        { nome: "logs", campos: "id, usuario_id, acao, entidade, data_hora, detalhes" },
    ];

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Header titulo="Roteiro técnico do projeto" subtitulo="Etapas para transformar este protótipo em sistema real." />
            <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
                <Card>
                    <h2 className="text-lg font-bold text-slate-950">Funcionalidades obrigatórias</h2>
                    <div className="mt-4 space-y-3">
                        {requisitos.map((r, idx) => (
                            <div key={idx} className="flex gap-3 rounded-2xl bg-slate-50 p-3 text-sm text-slate-700">
                                <BadgeCheck className="mt-0.5 h-4 w-4 flex-none text-emerald-600" />
                                <span>{r}</span>
                            </div>
                        ))}
                    </div>
                </Card>
                <Card>
                    <h2 className="flex items-center gap-2 text-lg font-bold text-slate-950"><Database className="h-5 w-5" /> Banco de dados sugerido</h2>
                    <p className="mt-1 text-sm text-slate-500">Estrutura inicial para desenvolver a versão real em PostgreSQL, Supabase ou Firebase.</p>
                    <div className="mt-4 space-y-3">
                        {tabelas.map((t) => (
                            <div key={t.nome} className="rounded-3xl border border-slate-200 p-4">
                                <p className="font-bold text-slate-950">{t.nome}</p>
                                <p className="mt-1 text-xs text-slate-500">{t.campos}</p>
                            </div>
                        ))}
                    </div>
                </Card>
                <Card className="xl:col-span-2">
                    <h2 className="text-lg font-bold text-slate-950">Próximas fases</h2>
                    <div className="mt-4 grid gap-4 md:grid-cols-4">
                        {[
                            { fase: "Fase 1", titulo: "MVP", desc: "Dashboard, colaboradores, treinamentos, vencimentos e QR Code real." },
                            { fase: "Fase 2", titulo: "Login e perfis", desc: "Controle de acesso por administrador, SST, portaria, auditor e terceirizada." },
                            { fase: "Fase 3", titulo: "Documentos", desc: "Upload real, validação, histórico, armazenamento em nuvem e permissões." },
                            { fase: "Fase 4", titulo: "Produção", desc: "Banco PostgreSQL, hospedagem, domínio, backup, segurança e alertas." },
                        ].map((f) => (
                            <div key={f.fase} className="rounded-3xl border border-slate-200 p-4">
                                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{f.fase}</p>
                                <h3 className="mt-1 font-bold text-slate-950">{f.titulo}</h3>
                                <p className="mt-1 text-sm text-slate-500">{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        </motion.div>
    );
}

function LoginScreen({ onLogin }) {
    const [email, setEmail] = useState("sst@empresa.com");
    const [senha, setSenha] = useState("123456");
    const [perfil, setPerfil] = useState("Técnico de Segurança");

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md rounded-[2rem] bg-white p-8 shadow-2xl">
                <div className="mb-6 flex items-center gap-3">
                    <div className="rounded-3xl bg-slate-950 p-4 text-white"><ShieldCheck className="h-7 w-7" /></div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-950">Controle SST QR</h1>
                        <p className="text-sm text-slate-500">Acesso restrito ao sistema</p>
                    </div>
                </div>

                <div className="space-y-3">
                    <label className="block text-sm font-medium text-slate-700">E-mail</label>
                    <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300" />
                    <label className="block text-sm font-medium text-slate-700">Senha</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} className="w-full rounded-2xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-slate-300" />
                    </div>
                    <label className="block text-sm font-medium text-slate-700">Perfil de acesso</label>
                    <select value={perfil} onChange={(e) => setPerfil(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300">
                        <option>Administrador</option>
                        <option>Técnico de Segurança</option>
                        <option>Empresa Terceirizada</option>
                        <option>Portaria / Fiscalização</option>
                        <option>Auditor</option>
                    </select>
                </div>

                <button onClick={() => onLogin({ email, perfil })} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800">
                    <LogIn className="h-4 w-4" /> Entrar no sistema
                </button>
                <p className="mt-4 rounded-2xl bg-slate-50 p-3 text-xs text-slate-500">Protótipo: o login é simulado. Na versão real, a senha deve ser criptografada e validada no banco de dados.</p>
            </motion.div>
        </div>
    );
}

export default function App() {
    const [usuario, setUsuario] = useState(null);
    const [tela, setTela] = useState("dashboard");
    const [colaboradores, setColaboradores] = useState(() => {
        try {
            const salvos = localStorage.getItem("controle-sst-qr-colaboradores");
            return salvos ? JSON.parse(salvos) : colaboradoresIniciais;
        } catch {
            return colaboradoresIniciais;
        }
    });
    const [colaboradorSelecionado, setColaboradorSelecionado] = useState(colaboradoresIniciais[0]);

    useEffect(() => {
        localStorage.setItem("controle-sst-qr-colaboradores", JSON.stringify(colaboradores));
    }, [colaboradores]);

    const nav = [
        { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
        { id: "empresas", label: "Empresas", icon: Building2 },
        { id: "colaboradores", label: "Colaboradores", icon: Users },
        { id: "treinamentos", label: "Treinamentos", icon: ClipboardCheck },
        { id: "qr", label: "Consulta QR", icon: QrCode },
        { id: "roteiro", label: "Roteiro", icon: CalendarClock },
    ];

    const selecionarColaborador = (c) => {
        setColaboradorSelecionado(c);
        setTela("qr");
    };

    if (!usuario) return <LoginScreen onLogin={setUsuario} />;

    return (
        <div className="min-h-screen bg-slate-100 text-slate-900">
            <div className="flex min-h-screen">
                <aside className="hidden w-72 border-r border-slate-200 bg-white p-5 lg:block">
                    <div className="flex items-center gap-3 rounded-3xl bg-slate-950 p-4 text-white">
                        <div className="rounded-2xl bg-white/10 p-3"><ShieldCheck className="h-6 w-6" /></div>
                        <div>
                            <h1 className="font-bold">Controle SST QR</h1>
                            <p className="text-xs text-slate-300">Treinamentos · Terceiros</p>
                        </div>
                    </div>

                    <nav className="mt-6 space-y-2">
                        {nav.map((item) => {
                            const Icon = item.icon;
                            return (
                                <button key={item.id} onClick={() => setTela(item.id)} className={classNames("flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium transition", tela === item.id ? "bg-slate-950 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950")}>
                                    <Icon className="h-4 w-4" />
                                    {item.label}
                                </button>
                            );
                        })}
                    </nav>

                    <div className="mt-6 rounded-3xl bg-slate-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Usuário logado</p>
                        <p className="mt-1 text-sm font-bold text-slate-900">{usuario.email}</p>
                        <p className="mt-1 text-xs text-slate-500">Perfil: {usuario.perfil}</p>
                        <button onClick={() => setUsuario(null)} className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100">Sair</button>
                    </div>
                </aside>

                <main className="flex-1 p-4 md:p-8">
                    <div className="mb-5 flex items-center justify-between rounded-3xl bg-white p-3 shadow-sm lg:hidden">
                        <div className="flex items-center gap-2 font-bold"><ShieldCheck className="h-5 w-5" /> Controle SST QR</div>
                        <select value={tela} onChange={(e) => setTela(e.target.value)} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm">
                            {nav.map((n) => <option key={n.id} value={n.id}>{n.label}</option>)}
                        </select>
                    </div>

                    {tela === "dashboard" && <Dashboard colaboradores={colaboradores} onSelectColab={selecionarColaborador} />}
                    {tela === "empresas" && <Empresas />}
                    {tela === "colaboradores" && <Colaboradores colaboradores={colaboradores} setColaboradores={setColaboradores} onSelectColab={selecionarColaborador} />}
                    {tela === "treinamentos" && <Treinamentos colaboradores={colaboradores} setColaboradores={setColaboradores} />}
                    {tela === "qr" && <ConsultaQR colaborador={colaboradorSelecionado} />}
                    {tela === "roteiro" && <Requisitos />}
                </main>
            </div>
        </div>
    );
}
