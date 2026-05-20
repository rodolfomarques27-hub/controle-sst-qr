/* eslint-disable no-unused-vars */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";
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
    RefreshCw,
    Search,
    ShieldCheck,
    Trash2,
    Upload,
    UserPlus,
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

const documentosEmpresaBase = [
    {
        tipo: "LTCAT",
        nome: "LTCAT",
        validadePadraoDias: null,
        regra:
            "Documento previdenciário utilizado para caracterizar exposição a agentes nocivos. Não possui validade fixa por NR. Deve ser revisado sempre que houver alteração no ambiente de trabalho, processo, layout, equipamentos, agentes nocivos, EPCs, EPIs ou medidas de controle.",
        fundamento: "Base legal: legislação previdenciária/eSocial. Não é documento de NR.",
    },
    {
        tipo: "PCMSO",
        nome: "PCMSO",
        validadePadraoDias: 365,
        regra:
            "Programa médico ocupacional baseado nos riscos identificados no PGR. Controle interno anual recomendado, considerando o relatório analítico anual, exames ocupacionais, mudanças de função, alteração de riscos ou exposição ocupacional.",
        fundamento: "Base normativa: NR-07, integrada aos riscos ocupacionais identificados no PGR/NR-01.",
    },
    {
        tipo: "PGR",
        nome: "PGR",
        validadePadraoDias: 730,
        regra:
            "Programa de Gerenciamento de Riscos. A avaliação de riscos deve ser revista no mínimo a cada 2 anos ou quando houver mudanças em processos, atividades, layout, equipamentos, medidas de prevenção, ocorrência de acidente/incidente relevante ou indicação de necessidade de nova avaliação.",
        fundamento: "Base normativa: NR-01 / GRO / PGR.",
    },
];

function obterDocumentoEmpresa(tipo) {
    return documentosEmpresaBase.find((d) => d.tipo === tipo) || documentosEmpresaBase[0];
}

function calcularVencimentoDocumento(tipo, dataEmissao) {
    const documento = obterDocumentoEmpresa(tipo);

    if (!dataEmissao || !documento.validadePadraoDias) return "";

    const data = new Date(`${dataEmissao}T12:00:00`);
    data.setDate(data.getDate() + documento.validadePadraoDias);
    return data.toISOString().slice(0, 10);
}


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
];

function normalizarColaborador(item) {
    return {
        id: item.id,
        empresaId: item.empresa_id || item.empresaId || null,
        nome: item.nome || "",
        empresa: item.empresas?.nome || item.empresa || "Empresa não informada",
        funcao: item.funcao || "-",
        matricula: item.matricula || "-",
        status: item.status || "Ativo",
        token: item.token_qr || item.token || `SST-${String(item.id).slice(0, 8)}`,
        treinamentos: item.treinamentos || [],
    };
}

function diasParaVencer(dataISO) {
    const venc = new Date(`${dataISO}T12:00:00`);
    const base = new Date(hoje.toISOString().slice(0, 10) + "T12:00:00");
    return Math.ceil((venc - base) / DAY);
}

function statusDocumento(dataISO) {
    const dias = diasParaVencer(dataISO);

    if (dias < 0) {
        return {
            chave: "vencido",
            texto: "Vencido",
            icon: XCircle,
            classe: "bg-red-50 text-red-700 ring-red-200",
            barra: "bg-red-500",
        };
    }

    if (dias <= 30) {
        return {
            chave: "vencendo",
            texto: "A vencer",
            icon: AlertTriangle,
            classe: "bg-amber-50 text-amber-700 ring-amber-200",
            barra: "bg-amber-500",
        };
    }

    return {
        chave: "emdia",
        texto: "Em dia",
        icon: CheckCircle2,
        classe: "bg-emerald-50 text-emerald-700 ring-emerald-200",
        barra: "bg-emerald-500",
    };
}

function statusEmpresaDocumento(dataVencimento) {
    if (!dataVencimento) {
        return {
            chave: "semvencimento",
            texto: "Sem vencimento fixo",
            icon: FileText,
            classe: "bg-slate-50 text-slate-700 ring-slate-200",
            barra: "bg-slate-500",
        };
    }

    return statusDocumento(dataVencimento);
}

function calcularSituacaoDocumentalEmpresa(docs = []) {
    const obrigatorios = ["LTCAT", "PCMSO", "PGR"];
    const faltantes = obrigatorios.filter((tipo) => !docs.some((doc) => doc.tipo_documento === tipo));

    if (docs.length === 0) {
        return {
            texto: "Sem documentos",
            classe: "bg-red-50 text-red-700 ring-red-200",
            detalhe: "Nenhum documento obrigatório cadastrado",
            faltantes,
        };
    }

    if (faltantes.length > 0) {
        return {
            texto: "Com pendências",
            classe: "bg-red-50 text-red-700 ring-red-200",
            detalhe: `Faltando: ${faltantes.join(", ")}`,
            faltantes,
        };
    }

    const statusDocs = docs.map((doc) => ({
        tipo: doc.tipo_documento,
        status: statusEmpresaDocumento(doc.data_vencimento),
    }));

    const vencidos = statusDocs.filter((item) => item.status.chave === "vencido");
    const vencendo = statusDocs.filter((item) => item.status.chave === "vencendo");

    if (vencidos.length > 0) {
        return {
            texto: "Documentos vencidos",
            classe: "bg-red-50 text-red-700 ring-red-200",
            detalhe: `Vencido(s): ${vencidos.map((item) => item.tipo).join(", ")}`,
            faltantes: [],
        };
    }

    if (vencendo.length > 0) {
        return {
            texto: "A vencer",
            classe: "bg-amber-50 text-amber-700 ring-amber-200",
            detalhe: `A vencer: ${vencendo.map((item) => item.tipo).join(", ")}`,
            faltantes: [],
        };
    }

    return {
        texto: "Regular",
        classe: "bg-emerald-50 text-emerald-700 ring-emerald-200",
        detalhe: "Documentos obrigatórios cadastrados e válidos",
        faltantes: [],
    };
}


function formatDate(dataISO) {
    if (!dataISO) return "-";
    return new Date(`${dataISO}T12:00:00`).toLocaleDateString("pt-BR");
}

function classNames(...items) {
    return items.filter(Boolean).join(" ");
}

function sanitizarNomeArquivo(nome) {
    return String(nome || "documento.pdf")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9._-]/g, "-")
        .replace(/-+/g, "-")
        .toLowerCase();
}

function obterUrlLogoEmpresa(caminho) {
    if (!caminho) return "";

    const { data } = supabase.storage
        .from("logos-empresas")
        .getPublicUrl(caminho);

    return data?.publicUrl || "";
}

function normalizarStatusEmpresa(status) {
    if (!status || status === "Ativa" || status === "Empresa ativa") return "Empresa ativa";
    if (status === "Inativa" || status === "Empresa inativa") return "Empresa inativa";
    if (status === "Inapta" || status === "Empresa inapta") return "Empresa inapta";
    if (status === "Bloqueada" || status === "Suspensa" || status === "Empresa suspensa") return "Empresa suspensa";
    return status;
}

function classeStatusEmpresa(status) {
    const statusNormalizado = normalizarStatusEmpresa(status);

    if (statusNormalizado === "Empresa ativa") {
        return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    }

    if (statusNormalizado === "Empresa inativa") {
        return "bg-slate-100 text-slate-700 ring-slate-300";
    }

    if (statusNormalizado === "Empresa inapta") {
        return "bg-red-50 text-red-700 ring-red-200";
    }

    if (statusNormalizado === "Empresa suspensa") {
        return "bg-amber-50 text-amber-700 ring-amber-200";
    }

    return "bg-slate-100 text-slate-700 ring-slate-300";
}

function escaparCSV(valor) {
    const texto = String(valor ?? "").replace(/"/g, '""');
    return `"${texto}"`;
}

function baixarCSV(nomeArquivo, linhas) {
    const csv = linhas.map((linha) => linha.map(escaparCSV).join(";")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = nomeArquivo;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function StatusPill({ status, small = false }) {
    const Icon = status.icon;

    return (
        <span
            className={classNames(
                "inline-flex items-center gap-1 rounded-full ring-1",
                status.classe,
                small ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm font-medium"
            )}
        >
            <Icon className={small ? "h-3.5 w-3.5" : "h-4 w-4"} />
            {status.texto}
        </span>
    );
}

function QRCodeReal({ token, size = 160 }) {
    const urlConsulta = `${window.location.origin}/consulta/${token}`;

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
            <p className="mt-2 max-w-[180px] break-all text-center text-[10px] text-slate-400">
                {urlConsulta}
            </p>
        </div>
    );
}

function obterTreinamento(id) {
    return treinamentosBase.find((t) => t.id === id) || { nome: "Treinamento não cadastrado", categoria: "-" };
}

function statusGeral(colaborador) {
    const treinamentos = colaborador.treinamentos || [];

    if (treinamentos.length === 0) {
        return {
            texto: "Pendente",
            classe: "bg-slate-600 text-white",
            detalhe: "Sem treinamentos lançados",
        };
    }

    const status = treinamentos.map((t) => statusDocumento(t.vencimento).chave);

    if (status.includes("vencido")) {
        return { texto: "Bloqueado", classe: "bg-red-600 text-white", detalhe: "Possui treinamento vencido" };
    }

    if (status.includes("vencendo")) {
        return { texto: "Atenção", classe: "bg-amber-500 text-white", detalhe: "Possui treinamento a vencer" };
    }

    return { texto: "Apto", classe: "bg-emerald-600 text-white", detalhe: "Treinamentos válidos" };
}

function Card({ children, className = "" }) {
    return (
        <div className={classNames("rounded-3xl border border-slate-200 bg-white p-5 shadow-sm", className)}>
            {children}
        </div>
    );
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

function LoginScreen({ onLogin }) {
    const [email, setEmail] = useState("sst@empresa.com");
    const [senha, setSenha] = useState("");
    const [perfil, setPerfil] = useState("Técnico de Segurança");
    const [carregando, setCarregando] = useState(false);
    const [erro, setErro] = useState("");

    const fazerLogin = async () => {
        setErro("");

        if (!email || !senha) {
            setErro("Preencha o e-mail e a senha.");
            return;
        }

        setCarregando(true);

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password: senha,
        });

        setCarregando(false);

        if (error) {
            setErro("E-mail ou senha incorretos.");
            return;
        }

        onLogin({
            id: data.user.id,
            email: data.user.email,
            perfil,
        });
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
            <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md rounded-[2rem] bg-white p-8 shadow-2xl"
            >
                <div className="mb-6 flex items-center gap-3">
                    <div className="rounded-3xl bg-slate-950 p-4 text-white">
                        <ShieldCheck className="h-7 w-7" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-950">Controle SST QR</h1>
                        <p className="text-sm text-slate-500">Acesso restrito ao sistema</p>
                    </div>
                </div>

                <div className="space-y-3">
                    <label className="block text-sm font-medium text-slate-700">E-mail</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Digite seu e-mail"
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                    />

                    <label className="block text-sm font-medium text-slate-700">Senha</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="password"
                            value={senha}
                            onChange={(e) => setSenha(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") fazerLogin();
                            }}
                            placeholder="Digite sua senha"
                            className="w-full rounded-2xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                        />
                    </div>

                    <label className="block text-sm font-medium text-slate-700">Perfil de acesso</label>
                    <select
                        value={perfil}
                        onChange={(e) => setPerfil(e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                    >
                        <option>Administrador</option>
                        <option>Técnico de Segurança</option>
                        <option>Empresa Terceirizada</option>
                        <option>Portaria / Fiscalização</option>
                        <option>Auditor</option>
                    </select>

                    {erro && (
                        <div className="rounded-2xl bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200">
                            {erro}
                        </div>
                    )}
                </div>

                <button
                    type="button"
                    onClick={fazerLogin}
                    disabled={carregando}
                    className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                    <LogIn className="h-4 w-4" />
                    {carregando ? "Entrando..." : "Entrar no sistema"}
                </button>

                <p className="mt-4 rounded-2xl bg-slate-50 p-3 text-xs text-slate-500">
                    O acesso é validado pelo Supabase. Só entra quem tiver e-mail e senha cadastrados.
                </p>
            </motion.div>
        </div>
    );
}

function Dashboard({ colaboradores, onSelectColab }) {
    const indicadores = useMemo(() => {
        const docs = colaboradores.flatMap((c) => (c.treinamentos || []).map((t) => ({ ...t, colaborador: c })));
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
                acao={
                    <button className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800">
                        <Download className="h-4 w-4" />
                        Exportar relatório
                    </button>
                }
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
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                            {pendencias.length} itens
                        </span>
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
                                {pendencias.length === 0 && (
                                    <tr>
                                        <td className="px-4 py-8 text-center text-sm text-slate-500" colSpan={5}>
                                            Nenhuma pendência crítica encontrada.
                                        </td>
                                    </tr>
                                )}

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
                                            <td className="px-4 py-3">
                                                <StatusPill status={st} small />
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    onClick={() => onSelectColab(d.colaborador)}
                                                    className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </button>
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
                                    <div
                                        className={classNames("h-full rounded-full", i.classe)}
                                        style={{ width: `${Math.max(4, (i.valor / Math.max(1, i.total)) * 100)}%` }}
                                    />
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

function Colaboradores({
    colaboradores,
    empresasBanco,
    carregandoBanco,
    erroBanco,
    onAtualizarBanco,
    onAdicionarColaborador,
    onExcluirColaborador,
    onSelectColab,
}) {
    const [busca, setBusca] = useState("");
    const [empresa, setEmpresa] = useState("Todas");
    const [salvando, setSalvando] = useState(false);
    const [novo, setNovo] = useState({
        nome: "",
        empresaNome: "",
        funcao: "",
        matricula: "",
    });

    const empresasFiltro = ["Todas", ...Array.from(new Set(colaboradores.map((c) => c.empresa).filter(Boolean)))];

    const filtrados = colaboradores.filter((c) => {
        const texto = `${c.nome} ${c.empresa} ${c.funcao} ${c.matricula}`.toLowerCase();
        return texto.includes(busca.toLowerCase()) && (empresa === "Todas" || c.empresa === empresa);
    });

    const adicionar = async () => {
        if (!novo.nome.trim() || !novo.empresaNome.trim() || !novo.funcao.trim()) {
            alert("Preencha nome, empresa terceirizada e função.");
            return;
        }

        setSalvando(true);

        const ok = await onAdicionarColaborador({
            nome: novo.nome.trim(),
            empresaNome: novo.empresaNome.trim(),
            funcao: novo.funcao.trim(),
            matricula: novo.matricula.trim(),
        });

        setSalvando(false);

        if (ok) {
            setNovo({ nome: "", empresaNome: "", funcao: "", matricula: "" });
        }
    };

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Header
                titulo="Colaboradores"
                subtitulo="Cadastro, consulta, remoção e geração de QR Code individual usando o banco Supabase."
                acao={
                    <button
                        onClick={onAtualizarBanco}
                        className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
                    >
                        <RefreshCw className={classNames("h-4 w-4", carregandoBanco && "animate-spin")} />
                        Atualizar banco
                    </button>
                }
            />

            {erroBanco && (
                <div className="mb-5 rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-700 ring-1 ring-red-200">
                    {erroBanco}
                </div>
            )}

            <div className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
                <Card className="overflow-hidden">
                    <div className="-m-5 mb-5 bg-gradient-to-br from-slate-950 to-slate-800 p-5 text-white">
                        <div className="flex items-center gap-3">
                            <div className="rounded-2xl bg-white/10 p-3">
                                <UserPlus className="h-6 w-6" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold">Novo colaborador</h2>
                                <p className="text-sm text-slate-300">Salva o funcionário diretamente no banco de dados.</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div>
                            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                                Nome completo
                            </label>
                            <input
                                value={novo.nome}
                                onChange={(e) => setNovo({ ...novo, nome: e.target.value })}
                                placeholder="Ex.: João da Silva"
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                                Empresa terceirizada
                            </label>
                            <input
                                value={novo.empresaNome}
                                onChange={(e) => setNovo({ ...novo, empresaNome: e.target.value })}
                                placeholder="Ex.: ABC Montagens"
                                list="empresas-cadastradas"
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                            />
                            <datalist id="empresas-cadastradas">
                                {empresasBanco.map((e) => (
                                    <option key={e.id} value={e.nome} />
                                ))}
                            </datalist>
                            <p className="mt-1 text-xs text-slate-400">
                                Se a empresa ainda não existir, o sistema cria automaticamente no Supabase.
                            </p>
                        </div>

                        <div>
                            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                                Função
                            </label>
                            <input
                                value={novo.funcao}
                                onChange={(e) => setNovo({ ...novo, funcao: e.target.value })}
                                placeholder="Ex.: Soldador, Montador, Eletricista"
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                                Matrícula / Código
                            </label>
                            <input
                                value={novo.matricula}
                                onChange={(e) => setNovo({ ...novo, matricula: e.target.value })}
                                placeholder="Ex.: M-0145"
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                            />
                        </div>

                        <button
                            onClick={adicionar}
                            disabled={salvando}
                            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <Plus className="h-4 w-4" />
                            {salvando ? "Salvando no banco..." : "Cadastrar colaborador"}
                        </button>
                    </div>
                </Card>

                <Card>
                    <div className="mb-4 flex flex-col gap-3 lg:flex-row">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                value={busca}
                                onChange={(e) => setBusca(e.target.value)}
                                placeholder="Buscar por nome, empresa, função ou matrícula"
                                className="w-full rounded-2xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                            />
                        </div>

                        <div className="relative min-w-56">
                            <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <select
                                value={empresa}
                                onChange={(e) => setEmpresa(e.target.value)}
                                className="w-full appearance-none rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                            >
                                {empresasFiltro.map((e) => (
                                    <option key={e}>{e}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="mb-4 grid gap-3 md:grid-cols-3">
                        <div className="rounded-2xl bg-slate-50 p-3">
                            <p className="text-xs font-medium text-slate-500">Total</p>
                            <p className="text-2xl font-bold text-slate-950">{colaboradores.length}</p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-3">
                            <p className="text-xs font-medium text-slate-500">Empresas</p>
                            <p className="text-2xl font-bold text-slate-950">{empresasFiltro.length - 1}</p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-3">
                            <p className="text-xs font-medium text-slate-500">Exibindo</p>
                            <p className="text-2xl font-bold text-slate-950">{filtrados.length}</p>
                        </div>
                    </div>

                    {carregandoBanco && (
                        <div className="rounded-3xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                            Carregando colaboradores do Supabase...
                        </div>
                    )}

                    {!carregandoBanco && filtrados.length === 0 && (
                        <div className="rounded-3xl border border-dashed border-slate-300 p-8 text-center">
                            <Users className="mx-auto h-10 w-10 text-slate-300" />
                            <h3 className="mt-3 font-bold text-slate-900">Nenhum colaborador encontrado</h3>
                            <p className="mt-1 text-sm text-slate-500">
                                Cadastre o primeiro colaborador no formulário ao lado.
                            </p>
                        </div>
                    )}

                    <div className="grid gap-4 lg:grid-cols-2">
                        {!carregandoBanco &&
                            filtrados.map((c) => {
                                const geral = statusGeral(c);

                                return (
                                    <div
                                        key={c.id}
                                        className="group rounded-3xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-md"
                                    >
                                        <div className="flex items-start gap-4">
                                            <button
                                                onClick={() => onSelectColab(c)}
                                                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 transition group-hover:bg-slate-950 group-hover:text-white"
                                            >
                                                <UserRound className="h-6 w-6" />
                                            </button>

                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div>
                                                        <h3 className="truncate font-bold text-slate-950">{c.nome}</h3>
                                                        <p className="text-sm text-slate-500">{c.funcao}</p>
                                                    </div>
                                                    <span className={classNames("rounded-full px-2.5 py-1 text-xs font-semibold", geral.classe)}>
                                                        {geral.texto}
                                                    </span>
                                                </div>

                                                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500">
                                                    <span className="rounded-xl bg-slate-50 px-3 py-2">{c.empresa}</span>
                                                    <span className="rounded-xl bg-slate-50 px-3 py-2">{c.matricula}</span>
                                                </div>

                                                <div className="mt-4 flex gap-2">
                                                    <button
                                                        onClick={() => onSelectColab(c)}
                                                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                                                    >
                                                        <QrCode className="h-3.5 w-3.5" />
                                                        Ver QR
                                                    </button>

                                                    <button
                                                        onClick={() => onExcluirColaborador(c)}
                                                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-100"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                        Excluir
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
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

    const colabSelecionadoId = colabId || colaboradores[0]?.id || "";

    const adicionarTreinamento = () => {
        if (!colabSelecionadoId) {
            alert("Cadastre um colaborador primeiro.");
            return;
        }

        const nomeArquivo = arquivoSelecionado?.name || arquivo || "certificado.pdf";

        setColaboradores(
            colaboradores.map((c) => {
                if (String(c.id) !== String(colabSelecionadoId)) return c;

                const atualizados = (c.treinamentos || []).filter((t) => t.treinamentoId !== Number(treinamentoId));

                return {
                    ...c,
                    treinamentos: [
                        ...atualizados,
                        {
                            treinamentoId: Number(treinamentoId),
                            realizado: hoje.toISOString().slice(0, 10),
                            vencimento,
                            arquivo: nomeArquivo,
                        },
                    ],
                };
            })
        );

        setArquivo(nomeArquivo);
    };

    const documentos = colaboradores.flatMap((c) =>
        (c.treinamentos || []).map((t) => ({ ...t, colaborador: c, treinamento: obterTreinamento(t.treinamentoId) }))
    );

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Header titulo="Treinamentos e certificados" subtitulo="Lançamento de certificados, validade e controle automático de status." />

            <div className="grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
                <Card>
                    <h2 className="flex items-center gap-2 text-lg font-bold text-slate-950">
                        <Upload className="h-5 w-5" />
                        Lançar certificado
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">Nesta versão, o lançamento ainda fica local. O próximo passo é salvar os certificados no Supabase Storage.</p>

                    <div className="mt-5 space-y-3">
                        <select
                            value={colabSelecionadoId}
                            onChange={(e) => setColabId(e.target.value)}
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                        >
                            {colaboradores.length === 0 && <option value="">Nenhum colaborador cadastrado</option>}
                            {colaboradores.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.nome} — {c.empresa}
                                </option>
                            ))}
                        </select>

                        <select
                            value={treinamentoId}
                            onChange={(e) => setTreinamentoId(e.target.value)}
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                        >
                            {treinamentosBase.map((t) => (
                                <option key={t.id} value={t.id}>
                                    {t.nome}
                                </option>
                            ))}
                        </select>

                        <input
                            type="date"
                            value={vencimento}
                            onChange={(e) => setVencimento(e.target.value)}
                            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                        />

                        <input
                            value={arquivo}
                            onChange={(e) => setArquivo(e.target.value)}
                            placeholder="Nome do arquivo PDF"
                            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                        />

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

                        <button
                            onClick={adicionarTreinamento}
                            className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
                        >
                            Salvar certificado
                        </button>
                    </div>
                </Card>

                <Card>
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-lg font-bold text-slate-950">Base de certificados</h2>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                            {documentos.length} registros
                        </span>
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
                                {documentos.length === 0 && (
                                    <tr>
                                        <td className="px-4 py-8 text-center text-sm text-slate-500" colSpan={5}>
                                            Nenhum certificado lançado ainda.
                                        </td>
                                    </tr>
                                )}

                                {documentos.map((d, idx) => (
                                    <tr key={`${d.colaborador.id}-${d.treinamentoId}-${idx}`} className="hover:bg-slate-50">
                                        <td className="px-4 py-3">
                                            <div className="font-semibold text-slate-900">{d.colaborador.nome}</div>
                                            <div className="text-xs text-slate-500">{d.colaborador.empresa}</div>
                                        </td>
                                        <td className="px-4 py-3 text-slate-700">{d.treinamento.nome}</td>
                                        <td className="px-4 py-3 text-slate-500">
                                            <FileText className="mr-1 inline h-4 w-4" />
                                            {d.arquivo}
                                        </td>
                                        <td className="px-4 py-3 text-slate-700">{formatDate(d.vencimento)}</td>
                                        <td className="px-4 py-3">
                                            <StatusPill status={statusDocumento(d.vencimento)} small />
                                        </td>
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
    const treinamentos = colaborador.treinamentos || [];

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Header titulo="Consulta por QR Code" subtitulo="Modelo da tela que abre no celular quando o QR Code do colaborador é escaneado." />

            <div className="mx-auto max-w-5xl rounded-[2rem] bg-slate-950 p-3 shadow-2xl">
                <div className="rounded-[1.5rem] bg-white p-5 md:p-8">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex gap-4">
                            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 text-slate-800">
                                <HardHat className="h-8 w-8" />
                            </div>

                            <div>
                                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                                    <ShieldCheck className="h-3.5 w-3.5" />
                                    Verificação SST
                                </div>
                                <h2 className="text-2xl font-bold text-slate-950">{colaborador.nome}</h2>
                                <p className="mt-1 text-slate-500">{colaborador.funcao} · {colaborador.empresa}</p>
                                <p className="mt-1 text-sm text-slate-400">Matrícula: {colaborador.matricula}</p>
                            </div>
                        </div>

                        <div className="flex flex-col items-center gap-3">
                            <QRCodeReal token={colaborador.token} />
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                                {colaborador.token}
                            </span>
                        </div>
                    </div>

                    <div className="mt-8 rounded-3xl border border-slate-200 p-5">
                        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                            <div>
                                <p className="text-sm font-medium text-slate-500">Status geral do colaborador</p>
                                <h3 className="mt-1 text-xl font-bold text-slate-950">{geral.detalhe}</h3>
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
                                        <div
                                            className={classNames("h-full rounded-full", st.barra)}
                                            style={{ width: st.chave === "vencido" ? "100%" : `${Math.max(12, Math.min(100, 100 - dias / 7))}%` }}
                                        />
                                    </div>

                                    <p className="mt-3 text-xs text-slate-500">
                                        {dias < 0 ? `Vencido há ${Math.abs(dias)} dia(s).` : `Faltam ${dias} dia(s) para vencer.`}
                                    </p>
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

function Empresas({
    empresasBanco,
    documentosEmpresas,
    colaboradores,
    carregandoBanco,
    erroBanco,
    onAtualizarBanco,
    onAdicionarEmpresa,
    onAtualizarEmpresa,
    onAdicionarDocumentoEmpresa,
    onExcluirDocumentoEmpresa,
    onVisualizarDocumentoEmpresa,
}) {
    const [novaEmpresa, setNovaEmpresa] = useState({
        nome: "",
        cnpj: "",
        responsavel: "",
        email: "",
        telefone: "",
        tipoEmpresa: "Terceirizada",
        logo: null,
        numeroContrato: "",
        dataInicioContrato: "",
        dataFimContrato: "",
        responsavelContratante: "",
        escopoServico: "",
        observacaoStatus: "",
    });

    const [novoDoc, setNovoDoc] = useState({
        empresaId: "",
        tipo: "PGR",
        dataEmissao: hoje.toISOString().slice(0, 10),
        dataVencimento: calcularVencimentoDocumento("PGR", hoje.toISOString().slice(0, 10)),
        arquivo: null,
        observacao: "",
    });

    const [salvandoEmpresa, setSalvandoEmpresa] = useState(false);
    const [salvandoDocumento, setSalvandoDocumento] = useState(false);
    const [empresaRevisao, setEmpresaRevisao] = useState(null);
    const [empresaEdicao, setEmpresaEdicao] = useState(null);
    const [salvandoEdicaoEmpresa, setSalvandoEdicaoEmpresa] = useState(false);
    const [buscaEmpresa, setBuscaEmpresa] = useState("");
    const [filtroStatusEmpresa, setFiltroStatusEmpresa] = useState("Todos");
    const [filtroTipoEmpresa, setFiltroTipoEmpresa] = useState("Todos");

    const documentoSelecionado = useMemo(() => obterDocumentoEmpresa(novoDoc.tipo), [novoDoc.tipo]);

    const documentosPorEmpresa = useMemo(() => {
        return documentosEmpresas.reduce((acc, doc) => {
            const empresaId = doc.empresa_id || doc.empresaId;
            if (!acc[empresaId]) acc[empresaId] = [];
            acc[empresaId].push(doc);
            return acc;
        }, {});
    }, [documentosEmpresas]);

    const colaboradoresPorEmpresa = useMemo(() => {
        return (colaboradores || []).reduce((acc, colaborador) => {
            const empresaId = colaborador.empresaId || colaborador.empresa_id;
            if (!empresaId) return acc;
            if (!acc[empresaId]) acc[empresaId] = [];
            acc[empresaId].push(colaborador);
            return acc;
        }, {});
    }, [colaboradores]);

    const adicionarEmpresa = async () => {
        if (!novaEmpresa.nome.trim()) {
            alert("Informe o nome da empresa.");
            return;
        }

        setSalvandoEmpresa(true);

        const ok = await onAdicionarEmpresa({
            nome: novaEmpresa.nome.trim(),
            cnpj: novaEmpresa.cnpj.trim(),
            responsavel: novaEmpresa.responsavel.trim(),
            email: novaEmpresa.email.trim(),
            telefone: novaEmpresa.telefone.trim(),
            tipoEmpresa: novaEmpresa.tipoEmpresa,
            logo: novaEmpresa.logo,
            numeroContrato: novaEmpresa.numeroContrato.trim(),
            dataInicioContrato: novaEmpresa.dataInicioContrato || null,
            dataFimContrato: novaEmpresa.dataFimContrato || null,
            responsavelContratante: novaEmpresa.responsavelContratante.trim(),
            escopoServico: novaEmpresa.escopoServico.trim(),
            observacaoStatus: novaEmpresa.observacaoStatus.trim(),
        });

        setSalvandoEmpresa(false);

        if (ok) {
            setNovaEmpresa({
                nome: "",
                cnpj: "",
                responsavel: "",
                email: "",
                telefone: "",
                tipoEmpresa: "Terceirizada",
                logo: null,
                numeroContrato: "",
                dataInicioContrato: "",
                dataFimContrato: "",
                responsavelContratante: "",
                escopoServico: "",
                observacaoStatus: "",
            });
        }
    };

    const alterarTipoDocumento = (tipo) => {
        setNovoDoc((atual) => ({
            ...atual,
            tipo,
            dataVencimento: calcularVencimentoDocumento(tipo, atual.dataEmissao),
        }));
    };

    const alterarEmissaoDocumento = (dataEmissao) => {
        setNovoDoc((atual) => ({
            ...atual,
            dataEmissao,
            dataVencimento: calcularVencimentoDocumento(atual.tipo, dataEmissao),
        }));
    };

    const abrirEdicaoEmpresa = (empresa) => {
        setEmpresaEdicao({
            id: empresa.id,
            nome: empresa.nome || "",
            cnpj: empresa.cnpj || "",
            responsavel: empresa.responsavel || "",
            email: empresa.email || "",
            telefone: empresa.telefone || "",
            status: normalizarStatusEmpresa(empresa.status),
            tipoEmpresa: empresa.tipo_empresa || "Terceirizada",
            logoAtual: empresa.logo_url || "",
            logoNomeAtual: empresa.logo_nome || "",
            logo: null,
            numeroContrato: empresa.numero_contrato || "",
            dataInicioContrato: empresa.data_inicio_contrato || "",
            dataFimContrato: empresa.data_fim_contrato || "",
            responsavelContratante: empresa.responsavel_contratante || "",
            escopoServico: empresa.escopo_servico || "",
            observacaoStatus: empresa.observacao_status || "",
        });
    };

    const salvarEdicaoEmpresa = async () => {
        if (!empresaEdicao?.nome?.trim()) {
            alert("Informe o nome da empresa.");
            return;
        }

        setSalvandoEdicaoEmpresa(true);

        const ok = await onAtualizarEmpresa({
            id: empresaEdicao.id,
            nome: empresaEdicao.nome.trim(),
            cnpj: empresaEdicao.cnpj.trim(),
            responsavel: empresaEdicao.responsavel.trim(),
            email: empresaEdicao.email.trim(),
            telefone: empresaEdicao.telefone.trim(),
            status: empresaEdicao.status || "Ativa",
            tipoEmpresa: empresaEdicao.tipoEmpresa,
            logo: empresaEdicao.logo,
            logoAtual: empresaEdicao.logoAtual,
            logoNomeAtual: empresaEdicao.logoNomeAtual,
            numeroContrato: empresaEdicao.numeroContrato.trim(),
            dataInicioContrato: empresaEdicao.dataInicioContrato || null,
            dataFimContrato: empresaEdicao.dataFimContrato || null,
            responsavelContratante: empresaEdicao.responsavelContratante.trim(),
            escopoServico: empresaEdicao.escopoServico.trim(),
            observacaoStatus: empresaEdicao.observacaoStatus.trim(),
        });

        setSalvandoEdicaoEmpresa(false);

        if (ok) {
            setEmpresaEdicao(null);
        }
    };

    const adicionarDocumento = async () => {
        if (!novoDoc.empresaId) {
            alert("Selecione a empresa.");
            return;
        }

        if (!novoDoc.tipo) {
            alert("Selecione o tipo do documento.");
            return;
        }

        if (!novoDoc.dataEmissao) {
            alert("Informe a data de emissão.");
            return;
        }

        setSalvandoDocumento(true);

        const ok = await onAdicionarDocumentoEmpresa({
            empresaId: novoDoc.empresaId,
            tipo: novoDoc.tipo,
            dataEmissao: novoDoc.dataEmissao,
            dataVencimento: novoDoc.dataVencimento || null,
            arquivo: novoDoc.arquivo,
            observacao: novoDoc.observacao.trim(),
        });

        setSalvandoDocumento(false);

        if (ok) {
            setNovoDoc({
                empresaId: novoDoc.empresaId,
                tipo: "PGR",
                dataEmissao: hoje.toISOString().slice(0, 10),
                dataVencimento: calcularVencimentoDocumento("PGR", hoje.toISOString().slice(0, 10)),
                arquivo: null,
                observacao: "",
            });
        }
    };

    const renderEmpresaCard = (empresa, docs, destaqueContratante = false) => {
        const logoUrl = obterUrlLogoEmpresa(empresa.logo_url);
        const funcionarios = colaboradoresPorEmpresa[empresa.id] || [];
        const situacaoDocumental = calcularSituacaoDocumentalEmpresa(docs);

        return (
            <div key={empresa.id} className={classNames("rounded-3xl border p-4", destaqueContratante ? "border-slate-300 bg-slate-50" : "border-slate-200 bg-white")}>
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                    <div className="flex items-start gap-3">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
                            {logoUrl ? (
                                <img src={logoUrl} alt={`Logo ${empresa.nome}`} className="h-full w-full object-contain p-1" />
                            ) : (
                                <Building2 className="h-6 w-6 text-slate-400" />
                            )}
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-950">{empresa.nome}</h3>
                            <p className="text-sm text-slate-500">{empresa.cnpj || "CNPJ não informado"}</p>
                            <p className="text-xs text-slate-400">
                                Responsável: {empresa.responsavel || "-"} · {empresa.email || "-"}
                            </p>
                            <p className="mt-1 text-xs font-semibold text-slate-600">
                                Tipo: {empresa.tipo_empresa || "Terceirizada"}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                                Funcionários vinculados: <strong>{funcionarios.length}</strong>
                            </p>
                            {empresa.numero_contrato && (
                                <p className="mt-1 text-xs text-slate-500">
                                    Contrato: <strong>{empresa.numero_contrato}</strong>
                                </p>
                            )}
                            {empresa.escopo_servico && (
                                <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                                    Escopo: {empresa.escopo_servico}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <span className={classNames("rounded-full px-3 py-1 text-xs font-semibold ring-1", classeStatusEmpresa(empresa.status))}>
                            {normalizarStatusEmpresa(empresa.status)}
                        </span>
                        <span
                            title={situacaoDocumental.detalhe}
                            className={classNames("rounded-full px-3 py-1 text-xs font-semibold ring-1", situacaoDocumental.classe)}
                        >
                            {situacaoDocumental.texto}
                        </span>
                        <button
                            onClick={() => abrirEdicaoEmpresa(empresa)}
                            className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                        >
                            <FileText className="h-3.5 w-3.5" />
                            Editar dados
                        </button>
                        <button
                            onClick={() => setEmpresaRevisao({ empresa, docs })}
                            className="inline-flex items-center gap-1 rounded-full bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                        >
                            <Eye className="h-3.5 w-3.5" />
                            Revisar documentos
                        </button>
                    </div>
                </div>

                <div className="mt-4 grid gap-3 lg:grid-cols-3">
                    {documentosEmpresaBase.map((tipoDoc) => {
                        const doc = docs.find((item) => item.tipo_documento === tipoDoc.tipo);
                        const st = statusEmpresaDocumento(doc?.data_vencimento);

                        return (
                            <div key={tipoDoc.tipo} className="rounded-2xl bg-white p-3 ring-1 ring-slate-200">
                                <div className="mb-2 flex items-start justify-between gap-2">
                                    <div>
                                        <p className="font-bold text-slate-900">{tipoDoc.nome}</p>
                                        <p className="text-xs text-slate-400">
                                            {doc ? `Emissão: ${formatDate(doc.data_emissao)}` : "Documento ainda não cadastrado"}
                                        </p>
                                    </div>
                                    {doc && <StatusPill status={st} small />}
                                </div>

                                {doc ? (
                                    <div className="space-y-2">
                                        <p className="text-xs text-slate-500">
                                            <strong>Revisão:</strong> {doc.data_vencimento ? formatDate(doc.data_vencimento) : "Sem vencimento fixo"}
                                        </p>
                                        <p className="truncate text-xs text-slate-500">
                                            <strong>Arquivo:</strong> {doc.arquivo_nome || "Arquivo ainda não anexado"}
                                        </p>
                                        {doc.observacao && (
                                            <p className="line-clamp-2 text-xs text-slate-500">{doc.observacao}</p>
                                        )}
                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                onClick={() => onVisualizarDocumentoEmpresa(doc)}
                                                disabled={!doc.arquivo_url}
                                                title="Abrir o documento enviado"
                                                className="inline-flex items-center gap-1 rounded-xl bg-slate-950 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                <Eye className="h-3.5 w-3.5" />
                                                Visualizar documento
                                            </button>

                                            <button
                                                onClick={() => onExcluirDocumentoEmpresa(doc)}
                                                title="Excluir este documento do cadastro da empresa"
                                                className="inline-flex items-center gap-1 rounded-xl bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-100"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                                Excluir documento
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-xs text-slate-500">Documento ainda não cadastrado para esta empresa.</p>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const empresasFiltradas = empresasBanco.filter((empresa) => {
        const texto = [
            empresa.nome,
            empresa.cnpj,
            empresa.responsavel,
            empresa.email,
            empresa.telefone,
            empresa.tipo_empresa,
            normalizarStatusEmpresa(empresa.status),
        ]
            .join(" ")
            .toLowerCase();

        const atendeBusca = texto.includes(buscaEmpresa.toLowerCase());
        const atendeStatus = filtroStatusEmpresa === "Todos" || normalizarStatusEmpresa(empresa.status) === filtroStatusEmpresa;
        const atendeTipo = filtroTipoEmpresa === "Todos" || (empresa.tipo_empresa || "Terceirizada") === filtroTipoEmpresa;

        return atendeBusca && atendeStatus && atendeTipo;
    });

    const empresasContratantes = empresasFiltradas.filter(
        (empresa) => (empresa.tipo_empresa || "Terceirizada") === "Contratante - Idealiza Cidades"
    );

    const empresasTerceirizadas = empresasFiltradas.filter(
        (empresa) => (empresa.tipo_empresa || "Terceirizada") !== "Contratante - Idealiza Cidades"
    );

    const documentosFiltrados = documentosEmpresas.filter((doc) =>
        empresasFiltradas.some((empresa) => empresa.id === doc.empresa_id)
    );

    const baixarRelatorioEmpresas = () => {
        const linhas = [
            ["Empresa", "Tipo", "Status da empresa", "Situação documental", "Nº funcionários", "CNPJ", "Responsável", "E-mail", "Telefone", "Nº contrato", "Início contrato", "Fim contrato", "Escopo do serviço", "Observação status", "LTCAT", "PCMSO", "PGR"],
        ];

        empresasFiltradas.forEach((empresa) => {
            const docs = documentosPorEmpresa[empresa.id] || [];

            const statusDoc = (tipo) => {
                const doc = docs.find((item) => item.tipo_documento === tipo);
                if (!doc) return "Pendente";
                const status = statusEmpresaDocumento(doc.data_vencimento);
                return `${status.texto} - emissão ${formatDate(doc.data_emissao)} - revisão ${doc.data_vencimento ? formatDate(doc.data_vencimento) : "sem vencimento fixo"}`;
            };

            const situacaoDocumental = calcularSituacaoDocumentalEmpresa(docs);
            const qtdFuncionarios = (colaboradoresPorEmpresa[empresa.id] || []).length;

            linhas.push([
                empresa.nome,
                empresa.tipo_empresa || "Terceirizada",
                normalizarStatusEmpresa(empresa.status),
                situacaoDocumental.texto,
                qtdFuncionarios,
                empresa.cnpj || "",
                empresa.responsavel || "",
                empresa.email || "",
                empresa.telefone || "",
                empresa.numero_contrato || "",
                empresa.data_inicio_contrato ? formatDate(empresa.data_inicio_contrato) : "",
                empresa.data_fim_contrato ? formatDate(empresa.data_fim_contrato) : "",
                empresa.escopo_servico || "",
                empresa.observacao_status || "",
                statusDoc("LTCAT"),
                statusDoc("PCMSO"),
                statusDoc("PGR"),
            ]);
        });

        baixarCSV("relatorio-empresas-documentos.csv", linhas);
    };

    const baixarRelatorioPendencias = () => {
        const linhas = [
            ["Empresa", "Tipo da empresa", "Status da empresa", "Situação documental", "Nº funcionários", "Documento", "Situação", "Emissão", "Próxima revisão", "Arquivo"],
        ];

        empresasFiltradas.forEach((empresa) => {
            const docs = documentosPorEmpresa[empresa.id] || [];

            documentosEmpresaBase.forEach((tipoDoc) => {
                const doc = docs.find((item) => item.tipo_documento === tipoDoc.tipo);

                if (!doc) {
                    const situacaoDocumental = calcularSituacaoDocumentalEmpresa(docs);
                    const qtdFuncionarios = (colaboradoresPorEmpresa[empresa.id] || []).length;

                    linhas.push([
                        empresa.nome,
                        empresa.tipo_empresa || "Terceirizada",
                        normalizarStatusEmpresa(empresa.status),
                        situacaoDocumental.texto,
                        qtdFuncionarios,
                        tipoDoc.tipo,
                        "Documento pendente",
                        "",
                        "",
                        "",
                    ]);
                    return;
                }

                const status = statusEmpresaDocumento(doc.data_vencimento);

                if (["vencido", "vencendo"].includes(status.chave)) {
                    const situacaoDocumental = calcularSituacaoDocumentalEmpresa(docs);
                    const qtdFuncionarios = (colaboradoresPorEmpresa[empresa.id] || []).length;

                    linhas.push([
                        empresa.nome,
                        empresa.tipo_empresa || "Terceirizada",
                        normalizarStatusEmpresa(empresa.status),
                        situacaoDocumental.texto,
                        qtdFuncionarios,
                        tipoDoc.tipo,
                        status.texto,
                        formatDate(doc.data_emissao),
                        doc.data_vencimento ? formatDate(doc.data_vencimento) : "Sem vencimento fixo",
                        doc.arquivo_nome || "",
                    ]);
                }
            });
        });

        baixarCSV("relatorio-pendencias-documentais.csv", linhas);
    };

    const baixarRelatorioDocumentos = () => {
        const linhas = [
            ["Empresa", "Nº funcionários", "Documento", "Status", "Emissão", "Próxima revisão", "Arquivo", "Observação"],
        ];

        documentosFiltrados.forEach((doc) => {
            const empresa = empresasBanco.find((item) => item.id === doc.empresa_id);
            const status = statusEmpresaDocumento(doc.data_vencimento);

            linhas.push([
                empresa?.nome || "",
                empresa ? (colaboradoresPorEmpresa[empresa.id] || []).length : 0,
                doc.tipo_documento,
                status.texto,
                formatDate(doc.data_emissao),
                doc.data_vencimento ? formatDate(doc.data_vencimento) : "Sem vencimento fixo",
                doc.arquivo_nome || "",
                doc.observacao || "",
            ]);
        });

        baixarCSV("relatorio-documentos-enviados.csv", linhas);
    };

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Header
                titulo="Empresas e documentos"
                subtitulo="Cadastro de empresas terceirizadas e controle de LTCAT, PCMSO e PGR."
                acao={
                    <button
                        onClick={onAtualizarBanco}
                        className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white"
                    >
                        <RefreshCw className={classNames("h-4 w-4", carregandoBanco && "animate-spin")} />
                        Atualizar banco
                    </button>
                }
            />

            {erroBanco && (
                <div className="mb-5 rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-700 ring-1 ring-red-200">
                    {erroBanco}
                </div>
            )}

            <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
                <div className="space-y-6">
                    <Card className="overflow-hidden">
                        <div className="-m-5 mb-5 bg-gradient-to-br from-slate-950 to-slate-800 p-5 text-white">
                            <div className="flex items-center gap-3">
                                <div className="rounded-2xl bg-white/10 p-3">
                                    <Building2 className="h-6 w-6" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold">Adicionar empresa</h2>
                                    <p className="text-sm text-slate-300">Cadastre a terceirizada antes de anexar documentos.</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <input
                                value={novaEmpresa.nome}
                                onChange={(e) => setNovaEmpresa({ ...novaEmpresa, nome: e.target.value })}
                                placeholder="Nome da empresa terceirizada"
                                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                            />
                            <input
                                value={novaEmpresa.cnpj}
                                onChange={(e) => setNovaEmpresa({ ...novaEmpresa, cnpj: e.target.value })}
                                placeholder="CNPJ"
                                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                            />
                            <input
                                value={novaEmpresa.responsavel}
                                onChange={(e) => setNovaEmpresa({ ...novaEmpresa, responsavel: e.target.value })}
                                placeholder="Responsável"
                                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                            />
                            <input
                                value={novaEmpresa.email}
                                onChange={(e) => setNovaEmpresa({ ...novaEmpresa, email: e.target.value })}
                                placeholder="E-mail"
                                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                            />
                            <input
                                value={novaEmpresa.telefone}
                                onChange={(e) => setNovaEmpresa({ ...novaEmpresa, telefone: e.target.value })}
                                placeholder="Telefone"
                                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                            />

                            <select
                                value={novaEmpresa.tipoEmpresa}
                                onChange={(e) => setNovaEmpresa({ ...novaEmpresa, tipoEmpresa: e.target.value })}
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                            >
                                <option>Terceirizada</option>
                                <option>Contratante - Idealiza Cidades</option>
                            </select>

                            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-600 hover:bg-slate-100">
                                <Upload className="h-4 w-4" />
                                {novaEmpresa.logo ? novaEmpresa.logo.name : "Adicionar logo da empresa"}
                                <input
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                                    className="hidden"
                                    onChange={(e) => setNovaEmpresa({ ...novaEmpresa, logo: e.target.files?.[0] || null })}
                                />
                            </label>

                            <div className="grid gap-3 md:grid-cols-2">
                                <input
                                    value={novaEmpresa.numeroContrato}
                                    onChange={(e) => setNovaEmpresa({ ...novaEmpresa, numeroContrato: e.target.value })}
                                    placeholder="Nº do contrato"
                                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                />

                                <input
                                    value={novaEmpresa.responsavelContratante}
                                    onChange={(e) => setNovaEmpresa({ ...novaEmpresa, responsavelContratante: e.target.value })}
                                    placeholder="Responsável da contratante"
                                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                />

                                <div>
                                    <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Início do contrato</label>
                                    <input
                                        type="date"
                                        value={novaEmpresa.dataInicioContrato}
                                        onChange={(e) => setNovaEmpresa({ ...novaEmpresa, dataInicioContrato: e.target.value })}
                                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Fim do contrato</label>
                                    <input
                                        type="date"
                                        value={novaEmpresa.dataFimContrato}
                                        onChange={(e) => setNovaEmpresa({ ...novaEmpresa, dataFimContrato: e.target.value })}
                                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                    />
                                </div>
                            </div>

                            <textarea
                                value={novaEmpresa.escopoServico}
                                onChange={(e) => setNovaEmpresa({ ...novaEmpresa, escopoServico: e.target.value })}
                                placeholder="Escopo do serviço"
                                rows={3}
                                className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                            />

                            <textarea
                                value={novaEmpresa.observacaoStatus}
                                onChange={(e) => setNovaEmpresa({ ...novaEmpresa, observacaoStatus: e.target.value })}
                                placeholder="Observação de bloqueio, suspensão ou condição especial"
                                rows={2}
                                className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                            />

                            <button
                                onClick={adicionarEmpresa}
                                disabled={salvandoEmpresa}
                                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                            >
                                <Plus className="h-4 w-4" />
                                {salvandoEmpresa ? "Salvando empresa..." : "Cadastrar empresa"}
                            </button>
                        </div>
                    </Card>

                    <Card>
                        <h2 className="text-lg font-bold text-slate-950">Adicionar documento da empresa</h2>
                        <p className="mt-1 text-sm text-slate-500">Controle de validade/revisão de LTCAT, PCMSO e PGR.</p>

                        <div className="mt-5 space-y-3">
                            <select
                                value={novoDoc.empresaId}
                                onChange={(e) => setNovoDoc({ ...novoDoc, empresaId: e.target.value })}
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                            >
                                <option value="">Selecione a empresa</option>
                                {empresasBanco.map((empresa) => (
                                    <option key={empresa.id} value={empresa.id}>
                                        {empresa.nome}
                                    </option>
                                ))}
                            </select>

                            <select
                                value={novoDoc.tipo}
                                onChange={(e) => alterarTipoDocumento(e.target.value)}
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                            >
                                {documentosEmpresaBase.map((doc) => (
                                    <option key={doc.tipo} value={doc.tipo}>
                                        {doc.nome}
                                    </option>
                                ))}
                            </select>

                            <div className="rounded-2xl bg-slate-50 p-3 text-xs text-slate-600">
                                <p className="font-bold text-slate-800">{documentoSelecionado.nome}</p>
                                <p className="mt-1"><strong>Regra:</strong> {documentoSelecionado.regra}</p>
                                <p className="mt-1 text-slate-500"><strong>Referência:</strong> {documentoSelecionado.fundamento}</p>
                            </div>

                            <div className="grid gap-3 md:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Emissão</label>
                                    <input
                                        type="date"
                                        value={novoDoc.dataEmissao}
                                        onChange={(e) => alterarEmissaoDocumento(e.target.value)}
                                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Vencimento / revisão</label>
                                    <input
                                        type="date"
                                        value={novoDoc.dataVencimento || ""}
                                        onChange={(e) => setNovoDoc({ ...novoDoc, dataVencimento: e.target.value })}
                                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                    />
                                </div>
                            </div>

                            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-600 hover:bg-slate-100">
                                <Upload className="h-4 w-4" />
                                {novoDoc.arquivo ? novoDoc.arquivo.name : "Selecionar PDF do documento"}
                                <input
                                    type="file"
                                    accept="application/pdf,image/*"
                                    className="hidden"
                                    onChange={(e) => setNovoDoc({ ...novoDoc, arquivo: e.target.files?.[0] || null })}
                                />
                            </label>

                            <textarea
                                value={novoDoc.observacao}
                                onChange={(e) => setNovoDoc({ ...novoDoc, observacao: e.target.value })}
                                placeholder="Observação opcional"
                                rows={3}
                                className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                            />

                            <button
                                onClick={adicionarDocumento}
                                disabled={salvandoDocumento}
                                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                            >
                                <FileText className="h-4 w-4" />
                                {salvandoDocumento ? "Salvando documento..." : "Salvar documento da empresa"}
                            </button>
                        </div>
                    </Card>
                </div>

                <Card>
                    <div className="mb-4 flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-slate-950">Empresas cadastradas</h2>
                            <p className="text-sm text-slate-500">Separação entre contratante e terceirizadas.</p>
                        </div>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                            {empresasFiltradas.length} de {empresasBanco.length} empresa(s)
                        </span>
                    </div>

                    <div className="mb-5 grid gap-3 lg:grid-cols-[1fr_220px_220px]">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                value={buscaEmpresa}
                                onChange={(e) => setBuscaEmpresa(e.target.value)}
                                placeholder="Pesquisar por empresa, CNPJ, responsável, e-mail ou status"
                                className="w-full rounded-2xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                            />
                        </div>

                        <select
                            value={filtroTipoEmpresa}
                            onChange={(e) => setFiltroTipoEmpresa(e.target.value)}
                            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                        >
                            <option>Todos</option>
                            <option>Contratante - Idealiza Cidades</option>
                            <option>Terceirizada</option>
                        </select>

                        <select
                            value={filtroStatusEmpresa}
                            onChange={(e) => setFiltroStatusEmpresa(e.target.value)}
                            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                        >
                            <option>Todos</option>
                            <option>Empresa ativa</option>
                            <option>Empresa inativa</option>
                            <option>Empresa inapta</option>
                            <option>Empresa suspensa</option>
                        </select>
                    </div>

                    <div className="mb-5 flex flex-wrap gap-2">
                        <button
                            onClick={baixarRelatorioEmpresas}
                            className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800"
                        >
                            <Download className="h-4 w-4" />
                            Baixar relatório geral
                        </button>

                        <button
                            onClick={baixarRelatorioPendencias}
                            className="inline-flex items-center gap-2 rounded-2xl bg-amber-50 px-4 py-2.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-200 hover:bg-amber-100"
                        >
                            <AlertTriangle className="h-4 w-4" />
                            Baixar pendências
                        </button>

                        <button
                            onClick={baixarRelatorioDocumentos}
                            className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                        >
                            <FileText className="h-4 w-4" />
                            Baixar documentos enviados
                        </button>
                    </div>

                    {carregandoBanco && (
                        <div className="rounded-3xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                            Carregando empresas e documentos...
                        </div>
                    )}

                    {!carregandoBanco && empresasBanco.length === 0 && (
                        <div className="rounded-3xl border border-dashed border-slate-300 p-8 text-center">
                            <Building2 className="mx-auto h-10 w-10 text-slate-300" />
                            <h3 className="mt-3 font-bold text-slate-900">Nenhuma empresa cadastrada</h3>
                            <p className="mt-1 text-sm text-slate-500">Cadastre a contratante e as terceirizadas no formulário ao lado.</p>
                        </div>
                    )}

                    {!carregandoBanco && empresasBanco.length > 0 && empresasFiltradas.length === 0 && (
                        <div className="rounded-3xl border border-dashed border-slate-300 p-8 text-center">
                            <Search className="mx-auto h-10 w-10 text-slate-300" />
                            <h3 className="mt-3 font-bold text-slate-900">Nenhuma empresa encontrada</h3>
                            <p className="mt-1 text-sm text-slate-500">Altere a pesquisa ou os filtros para visualizar empresas.</p>
                        </div>
                    )}

                    {!carregandoBanco && empresasFiltradas.length > 0 && (
                        <div className="space-y-6">
                            <section>
                                <div className="mb-3 flex items-center gap-2">
                                    <div className="rounded-xl bg-slate-950 p-2 text-white">
                                        <ShieldCheck className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-950">Empresa contratante</h3>
                                        <p className="text-xs text-slate-500">Idealiza Cidades / empresa principal do controle documental</p>
                                    </div>
                                </div>

                                {empresasContratantes.length === 0 ? (
                                    <div className="rounded-3xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
                                        Nenhuma empresa contratante cadastrada. Cadastre a empresa como <strong>Contratante - Idealiza Cidades</strong>.
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {empresasContratantes.map((empresa) => {
                                            const docs = documentosPorEmpresa[empresa.id] || [];
                                            return renderEmpresaCard(empresa, docs, true);
                                        })}
                                    </div>
                                )}
                            </section>

                            <section>
                                <div className="mb-3 flex items-center gap-2">
                                    <div className="rounded-xl bg-slate-100 p-2 text-slate-700">
                                        <Users className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-950">Empresas terceirizadas</h3>
                                        <p className="text-xs text-slate-500">Prestadoras de serviço vinculadas ao controle de documentos</p>
                                    </div>
                                </div>

                                {empresasTerceirizadas.length === 0 ? (
                                    <div className="rounded-3xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
                                        Nenhuma empresa terceirizada cadastrada.
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {empresasTerceirizadas.map((empresa) => {
                                            const docs = documentosPorEmpresa[empresa.id] || [];
                                            return renderEmpresaCard(empresa, docs, false);
                                        })}
                                    </div>
                                )}
                            </section>
                        </div>
                    )}
                </Card>      </div>

            {empresaEdicao && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
                    <div className="w-full max-w-2xl rounded-[2rem] bg-white p-6 shadow-2xl">
                        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Editar empresa</p>
                                <h2 className="mt-1 text-2xl font-bold text-slate-950">{empresaEdicao.nome}</h2>
                                <p className="mt-1 text-sm text-slate-500">Atualize os dados cadastrais da empresa terceirizada.</p>
                            </div>
                            <button
                                onClick={() => setEmpresaEdicao(null)}
                                className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
                            >
                                Fechar
                            </button>
                        </div>

                        <div className="mt-5 grid gap-3 md:grid-cols-2">
                            <div className="md:col-span-2">
                                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Nome da empresa</label>
                                <input
                                    value={empresaEdicao.nome}
                                    onChange={(e) => setEmpresaEdicao({ ...empresaEdicao, nome: e.target.value })}
                                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">CNPJ</label>
                                <input
                                    value={empresaEdicao.cnpj}
                                    onChange={(e) => setEmpresaEdicao({ ...empresaEdicao, cnpj: e.target.value })}
                                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Status</label>
                                <select
                                    value={normalizarStatusEmpresa(empresaEdicao.status)}
                                    onChange={(e) => setEmpresaEdicao({ ...empresaEdicao, status: e.target.value })}
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                >
                                    <option>Empresa ativa</option>
                                    <option>Empresa inativa</option>
                                    <option>Empresa inapta</option>
                                    <option>Empresa suspensa</option>
                                </select>
                            </div>

                            <div className="md:col-span-2">
                                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Tipo da empresa</label>
                                <select
                                    value={empresaEdicao.tipoEmpresa}
                                    onChange={(e) => setEmpresaEdicao({ ...empresaEdicao, tipoEmpresa: e.target.value })}
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                >
                                    <option>Terceirizada</option>
                                    <option>Contratante - Idealiza Cidades</option>
                                </select>
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Responsável</label>
                                <input
                                    value={empresaEdicao.responsavel}
                                    onChange={(e) => setEmpresaEdicao({ ...empresaEdicao, responsavel: e.target.value })}
                                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">E-mail</label>
                                <input
                                    value={empresaEdicao.email}
                                    onChange={(e) => setEmpresaEdicao({ ...empresaEdicao, email: e.target.value })}
                                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Telefone</label>
                                <input
                                    value={empresaEdicao.telefone}
                                    onChange={(e) => setEmpresaEdicao({ ...empresaEdicao, telefone: e.target.value })}
                                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Logo da empresa</label>
                                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-600 hover:bg-slate-100">
                                    <Upload className="h-4 w-4" />
                                    {empresaEdicao.logo ? empresaEdicao.logo.name : empresaEdicao.logoNomeAtual || "Alterar logo da empresa"}
                                    <input
                                        type="file"
                                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                                        className="hidden"
                                        onChange={(e) => setEmpresaEdicao({ ...empresaEdicao, logo: e.target.files?.[0] || null })}
                                    />
                                </label>
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Nº do contrato</label>
                                <input
                                    value={empresaEdicao.numeroContrato}
                                    onChange={(e) => setEmpresaEdicao({ ...empresaEdicao, numeroContrato: e.target.value })}
                                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Responsável da contratante</label>
                                <input
                                    value={empresaEdicao.responsavelContratante}
                                    onChange={(e) => setEmpresaEdicao({ ...empresaEdicao, responsavelContratante: e.target.value })}
                                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Início do contrato</label>
                                <input
                                    type="date"
                                    value={empresaEdicao.dataInicioContrato}
                                    onChange={(e) => setEmpresaEdicao({ ...empresaEdicao, dataInicioContrato: e.target.value })}
                                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Fim do contrato</label>
                                <input
                                    type="date"
                                    value={empresaEdicao.dataFimContrato}
                                    onChange={(e) => setEmpresaEdicao({ ...empresaEdicao, dataFimContrato: e.target.value })}
                                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Escopo do serviço</label>
                                <textarea
                                    value={empresaEdicao.escopoServico}
                                    onChange={(e) => setEmpresaEdicao({ ...empresaEdicao, escopoServico: e.target.value })}
                                    rows={3}
                                    className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Observação de bloqueio/suspensão</label>
                                <textarea
                                    value={empresaEdicao.observacaoStatus}
                                    onChange={(e) => setEmpresaEdicao({ ...empresaEdicao, observacaoStatus: e.target.value })}
                                    rows={2}
                                    className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                />
                            </div>
                        </div>

                        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                            <button
                                onClick={salvarEdicaoEmpresa}
                                disabled={salvandoEdicaoEmpresa}
                                className="flex-1 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                            >
                                {salvandoEdicaoEmpresa ? "Salvando alterações..." : "Salvar alterações"}
                            </button>

                            <button
                                onClick={() => setEmpresaEdicao(null)}
                                className="flex-1 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-200"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {empresaRevisao && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
                    <div className="max-h-[90vh] w-full max-w-5xl overflow-auto rounded-[2rem] bg-white p-6 shadow-2xl">
                        <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-4 md:flex-row md:items-start">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Revisão documental da empresa</p>
                                <h2 className="mt-1 text-2xl font-bold text-slate-950">{empresaRevisao.empresa.nome}</h2>
                                <p className="mt-1 text-sm text-slate-500">
                                    CNPJ: {empresaRevisao.empresa.cnpj || "Não informado"} · Responsável: {empresaRevisao.empresa.responsavel || "-"}
                                </p>
                                <p className="mt-1 text-sm text-slate-500">
                                    E-mail: {empresaRevisao.empresa.email || "-"} · Telefone: {empresaRevisao.empresa.telefone || "-"}
                                </p>
                            </div>

                            <button
                                onClick={() => setEmpresaRevisao(null)}
                                className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                            >
                                Fechar revisão
                            </button>
                        </div>

                        <div className="mt-5 grid gap-4 md:grid-cols-3">
                            {documentosEmpresaBase.map((tipoDoc) => {
                                const doc = empresaRevisao.docs.find((item) => item.tipo_documento === tipoDoc.tipo);
                                const st = statusEmpresaDocumento(doc?.data_vencimento);

                                return (
                                    <div key={tipoDoc.tipo} className="rounded-3xl border border-slate-200 p-4">
                                        <div className="mb-3 flex items-start justify-between gap-2">
                                            <div>
                                                <h3 className="text-lg font-bold text-slate-950">{tipoDoc.nome}</h3>
                                                <p className="text-xs text-slate-400">{tipoDoc.fundamento}</p>
                                            </div>
                                            {doc ? <StatusPill status={st} small /> : <span className="rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-200">Pendente</span>}
                                        </div>

                                        <div className="space-y-2 text-sm text-slate-600">
                                            <p><strong>Regra:</strong> {tipoDoc.regra}</p>
                                            <p><strong>Emissão:</strong> {doc ? formatDate(doc.data_emissao) : "Documento não enviado"}</p>
                                            <p><strong>Próxima revisão:</strong> {doc?.data_vencimento ? formatDate(doc.data_vencimento) : "Sem vencimento fixo / controlar por alteração"}</p>
                                            <p><strong>Arquivo:</strong> {doc?.arquivo_nome || "Arquivo ainda não anexado"}</p>
                                            {doc?.observacao && <p><strong>Observação:</strong> {doc.observacao}</p>}
                                        </div>

                                        {doc && (
                                            <div className="mt-4 flex flex-wrap gap-2">
                                                <button
                                                    onClick={() => onVisualizarDocumentoEmpresa(doc)}
                                                    disabled={!doc.arquivo_url}
                                                    className="inline-flex items-center gap-1 rounded-xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    <Eye className="h-3.5 w-3.5" />
                                                    Visualizar documento
                                                </button>

                                                <button
                                                    onClick={() => onExcluirDocumentoEmpresa(doc)}
                                                    className="inline-flex items-center gap-1 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-100"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                    Excluir documento
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <div className="mt-5 rounded-3xl bg-slate-50 p-4 text-sm text-slate-600">
                            <strong>Observação técnica:</strong> este painel serve para conferência documental. A validade automática é um controle interno e deve ser confirmada pelo responsável de SST conforme o documento emitido, escopo da empresa, alterações de risco e exigências contratuais do cliente.
                        </div>
                    </div>
                </div>
            )}
        </motion.div>
    );
}
function Requisitos() {
    const requisitos = [
        "Login com Supabase Auth.",
        "Colaboradores cadastrados no banco Supabase.",
        "Empresas criadas automaticamente no banco quando informadas no cadastro.",
        "Exclusão de colaboradores diretamente na tabela colaboradores.",
        "QR Code individual com link real de consulta e token aleatório, sem CPF ou dado sensível.",
        "Visualização dos documentos enviados por link temporário seguro do Supabase Storage.",
        "Próximo passo: salvar certificados dos colaboradores em Supabase Storage e tabela certificados.",
    ];

    const tabelas = [
        { nome: "empresas", campos: "id, nome, cnpj, responsavel, email, telefone, status, created_at" },
        { nome: "colaboradores", campos: "id, empresa_id, nome, funcao, matricula, token_qr, status, created_at" },
        { nome: "treinamentos", campos: "id, nome, categoria, validade_padrao_dias, obrigatorio, created_at" },
        { nome: "certificados", campos: "id, colaborador_id, treinamento_id, arquivo_url, data_realizacao, data_vencimento, status_validacao" },
    ];

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Header titulo="Roteiro técnico do projeto" subtitulo="Etapas para transformar este protótipo em sistema real." />

            <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
                <Card>
                    <h2 className="text-lg font-bold text-slate-950">Funcionalidades atuais</h2>

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
                    <h2 className="flex items-center gap-2 text-lg font-bold text-slate-950">
                        <Database className="h-5 w-5" />
                        Tabelas utilizadas
                    </h2>

                    <div className="mt-4 space-y-3">
                        {tabelas.map((t) => (
                            <div key={t.nome} className="rounded-3xl border border-slate-200 p-4">
                                <p className="font-bold text-slate-950">{t.nome}</p>
                                <p className="mt-1 text-xs text-slate-500">{t.campos}</p>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        </motion.div>
    );
}

export default function App() {
    const [usuario, setUsuario] = useState(null);
    const [carregandoSessao, setCarregandoSessao] = useState(true);
    const [tela, setTela] = useState("dashboard");
    const [colaboradores, setColaboradores] = useState([]);
    const [empresasBanco, setEmpresasBanco] = useState([]);
    const [documentosEmpresas, setDocumentosEmpresas] = useState([]);
    const [carregandoBanco, setCarregandoBanco] = useState(false);
    const [erroBanco, setErroBanco] = useState("");
    const [colaboradorSelecionado, setColaboradorSelecionado] = useState(null);

    const carregarEmpresas = useCallback(async () => {
        const { data, error } = await supabase
            .from("empresas")
            .select("id, nome, cnpj, responsavel, email, telefone, status, tipo_empresa, logo_url, logo_nome, numero_contrato, data_inicio_contrato, data_fim_contrato, responsavel_contratante, escopo_servico, observacao_status")
            .order("nome", { ascending: true });

        if (error) {
            throw new Error(`Erro ao carregar empresas: ${error.message}`);
        }

        setEmpresasBanco(data || []);
        return data || [];
    }, []);

    const carregarDocumentosEmpresas = useCallback(async () => {
        const { data, error } = await supabase
            .from("documentos_empresas")
            .select("id, empresa_id, tipo_documento, data_emissao, data_vencimento, arquivo_url, arquivo_nome, observacao, status_validacao, created_at")
            .order("created_at", { ascending: false });

        if (error) {
            throw new Error(`Erro ao carregar documentos das empresas: ${error.message}`);
        }

        setDocumentosEmpresas(data || []);
        return data || [];
    }, []);

    const carregarColaboradores = useCallback(async () => {
        setCarregandoBanco(true);
        setErroBanco("");

        try {
            const empresas = await carregarEmpresas();
            await carregarDocumentosEmpresas();

            const { data, error } = await supabase
                .from("colaboradores")
                .select(`
          id,
          nome,
          funcao,
          matricula,
          token_qr,
          status,
          empresa_id,
          empresas (
            id,
            nome
          )
        `)
                .order("created_at", { ascending: false });

            if (error) {
                throw new Error(`Erro ao carregar colaboradores: ${error.message}`);
            }

            const normalizados = (data || []).map(normalizarColaborador);
            setColaboradores(normalizados);
            setColaboradorSelecionado((atual) => atual || normalizados[0] || null);

            if (normalizados.length === 0 && empresas.length === 0) {
                setColaboradores([]);
            }
        } catch (error) {
            setErroBanco(error.message || "Erro ao conectar ao banco de dados.");
        } finally {
            setCarregandoBanco(false);
        }
    }, [carregarEmpresas, carregarDocumentosEmpresas]);

    async function enviarLogoEmpresa(arquivo, empresaId) {
        if (!arquivo) return { logoUrl: null, logoNome: null };

        const nomeSeguro = sanitizarNomeArquivo(arquivo.name);
        const caminho = `${empresaId || "nova-empresa"}/${Date.now()}-${nomeSeguro}`;

        const { error } = await supabase.storage
            .from("logos-empresas")
            .upload(caminho, arquivo, {
                cacheControl: "3600",
                upsert: true,
                contentType: arquivo.type || "image/png",
            });

        if (error) {
            throw new Error(`Erro ao enviar logo: ${error.message}`);
        }

        return { logoUrl: caminho, logoNome: nomeSeguro };
    }

    async function adicionarEmpresa(novaEmpresa) {
        setErroBanco("");

        try {
            const existente = empresasBanco.find(
                (empresa) => empresa.nome.toLowerCase() === novaEmpresa.nome.toLowerCase()
            );

            if (existente) {
                setErroBanco("Essa empresa já está cadastrada.");
                return false;
            }

            let { data, error } = await supabase
                .from("empresas")
                .insert({
                    nome: novaEmpresa.nome,
                    cnpj: novaEmpresa.cnpj || null,
                    responsavel: novaEmpresa.responsavel || null,
                    email: novaEmpresa.email || null,
                    telefone: novaEmpresa.telefone || null,
                    tipo_empresa: novaEmpresa.tipoEmpresa || "Terceirizada",
                    status: "Empresa ativa",
                    numero_contrato: novaEmpresa.numeroContrato || null,
                    data_inicio_contrato: novaEmpresa.dataInicioContrato || null,
                    data_fim_contrato: novaEmpresa.dataFimContrato || null,
                    responsavel_contratante: novaEmpresa.responsavelContratante || null,
                    escopo_servico: novaEmpresa.escopoServico || null,
                    observacao_status: novaEmpresa.observacaoStatus || null,
                })
                .select("id, nome, cnpj, responsavel, email, telefone, status, tipo_empresa, logo_url, logo_nome, numero_contrato, data_inicio_contrato, data_fim_contrato, responsavel_contratante, escopo_servico, observacao_status")
                .single();

            if (error) {
                throw new Error(`Erro ao cadastrar empresa: ${error.message}`);
            }

            if (novaEmpresa.logo) {
                const logo = await enviarLogoEmpresa(novaEmpresa.logo, data.id);

                const { data: empresaComLogo, error: logoError } = await supabase
                    .from("empresas")
                    .update({
                        logo_url: logo.logoUrl,
                        logo_nome: logo.logoNome,
                    })
                    .eq("id", data.id)
                    .select("id, nome, cnpj, responsavel, email, telefone, status, tipo_empresa, logo_url, logo_nome, numero_contrato, data_inicio_contrato, data_fim_contrato, responsavel_contratante, escopo_servico, observacao_status")
                    .single();

                if (logoError) {
                    throw new Error(`Empresa cadastrada, mas houve erro ao salvar o logo: ${logoError.message}`);
                }

                data = empresaComLogo;
            }

            setEmpresasBanco((atual) => [data, ...atual].sort((a, b) => a.nome.localeCompare(b.nome)));
            return true;
        } catch (error) {
            setErroBanco(error.message || "Erro ao cadastrar empresa.");
            return false;
        }
    }

    async function atualizarEmpresa(empresaAtualizada) {
        setErroBanco("");

        try {
            let logoAtualizada = {
                logo_url: empresaAtualizada.logoAtual || null,
                logo_nome: empresaAtualizada.logoNomeAtual || null,
            };

            if (empresaAtualizada.logo) {
                const logo = await enviarLogoEmpresa(empresaAtualizada.logo, empresaAtualizada.id);
                logoAtualizada = {
                    logo_url: logo.logoUrl,
                    logo_nome: logo.logoNome,
                };
            }

            const { data, error } = await supabase
                .from("empresas")
                .update({
                    nome: empresaAtualizada.nome,
                    cnpj: empresaAtualizada.cnpj || null,
                    responsavel: empresaAtualizada.responsavel || null,
                    email: empresaAtualizada.email || null,
                    telefone: empresaAtualizada.telefone || null,
                    status: normalizarStatusEmpresa(empresaAtualizada.status),
                    tipo_empresa: empresaAtualizada.tipoEmpresa || "Terceirizada",
                    logo_url: logoAtualizada.logo_url,
                    logo_nome: logoAtualizada.logo_nome,
                    numero_contrato: empresaAtualizada.numeroContrato || null,
                    data_inicio_contrato: empresaAtualizada.dataInicioContrato || null,
                    data_fim_contrato: empresaAtualizada.dataFimContrato || null,
                    responsavel_contratante: empresaAtualizada.responsavelContratante || null,
                    escopo_servico: empresaAtualizada.escopoServico || null,
                    observacao_status: empresaAtualizada.observacaoStatus || null,
                })
                .eq("id", empresaAtualizada.id)
                .select("id, nome, cnpj, responsavel, email, telefone, status, tipo_empresa, logo_url, logo_nome, numero_contrato, data_inicio_contrato, data_fim_contrato, responsavel_contratante, escopo_servico, observacao_status")
                .single();

            if (error) {
                throw new Error(`Erro ao atualizar empresa: ${error.message}`);
            }

            setEmpresasBanco((atual) =>
                atual.map((empresa) => (empresa.id === data.id ? data : empresa)).sort((a, b) => a.nome.localeCompare(b.nome))
            );

            setColaboradores((atual) =>
                atual.map((colaborador) =>
                    colaborador.empresaId === data.id ? { ...colaborador, empresa: data.nome } : colaborador
                )
            );

            return true;
        } catch (error) {
            setErroBanco(error.message || "Erro ao atualizar empresa.");
            return false;
        }
    }

    async function adicionarDocumentoEmpresa(novoDoc) {
        setErroBanco("");

        try {
            let arquivoUrl = null;
            let arquivoNome = novoDoc.arquivo?.name || null;

            if (novoDoc.arquivo) {
                const nomeSeguro = sanitizarNomeArquivo(novoDoc.arquivo.name);
                const tipoSeguro = sanitizarNomeArquivo(novoDoc.tipo);
                const caminho = `${novoDoc.empresaId}/${tipoSeguro}-${Date.now()}-${nomeSeguro}`;

                const { error: uploadError } = await supabase.storage
                    .from("documentos-empresas")
                    .upload(caminho, novoDoc.arquivo, {
                        cacheControl: "3600",
                        upsert: true,
                        contentType: novoDoc.arquivo.type || "application/pdf",
                    });

                if (uploadError) {
                    throw new Error(`Erro no upload do documento: ${uploadError.message}`);
                }

                arquivoUrl = caminho;
                arquivoNome = nomeSeguro;
            }

            const { data, error } = await supabase
                .from("documentos_empresas")
                .insert({
                    empresa_id: novoDoc.empresaId,
                    tipo_documento: novoDoc.tipo,
                    data_emissao: novoDoc.dataEmissao,
                    data_vencimento: novoDoc.dataVencimento,
                    arquivo_url: arquivoUrl,
                    arquivo_nome: arquivoNome,
                    observacao: novoDoc.observacao || null,
                    status_validacao: "Validado",
                })
                .select("id, empresa_id, tipo_documento, data_emissao, data_vencimento, arquivo_url, arquivo_nome, observacao, status_validacao, created_at")
                .single();

            if (error) {
                throw new Error(`Erro ao salvar documento: ${error.message}`);
            }

            setDocumentosEmpresas((atual) => [
                data,
                ...atual.filter(
                    (item) => !(item.empresa_id === data.empresa_id && item.tipo_documento === data.tipo_documento)
                ),
            ]);

            return true;
        } catch (error) {
            setErroBanco(error.message || "Erro ao salvar documento da empresa.");
            return false;
        }
    }

    async function excluirDocumentoEmpresa(documento) {
        const confirmar = window.confirm(`Deseja excluir definitivamente o documento ${documento.tipo_documento} desta empresa?`);

        if (!confirmar) return;

        setErroBanco("");

        const { error } = await supabase
            .from("documentos_empresas")
            .delete()
            .eq("id", documento.id);

        if (error) {
            setErroBanco(`Erro ao remover documento: ${error.message}`);
            return;
        }

        if (documento.arquivo_url) {
            await supabase.storage.from("documentos-empresas").remove([documento.arquivo_url]);
        }

        setDocumentosEmpresas((atual) => atual.filter((item) => item.id !== documento.id));
    }

    async function visualizarDocumentoEmpresa(documento) {
        setErroBanco("");

        if (!documento?.arquivo_url) {
            setErroBanco("Este documento ainda não possui arquivo anexado para visualização.");
            return;
        }

        const { data, error } = await supabase.storage
            .from("documentos-empresas")
            .createSignedUrl(documento.arquivo_url, 60 * 10);

        if (error) {
            setErroBanco(`Erro ao gerar link de visualização: ${error.message}`);
            return;
        }

        window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    }

    async function obterOuCriarEmpresa(nomeEmpresa) {
        const nomeTratado = nomeEmpresa.trim();

        const existente = empresasBanco.find(
            (empresa) => empresa.nome.toLowerCase() === nomeTratado.toLowerCase()
        );

        if (existente) return existente;

        const { data, error } = await supabase
            .from("empresas")
            .insert({
                nome: nomeTratado,
                status: "Empresa ativa",
            })
            .select("id, nome, cnpj, responsavel, email, telefone, status, tipo_empresa, logo_url, logo_nome, numero_contrato, data_inicio_contrato, data_fim_contrato, responsavel_contratante, escopo_servico, observacao_status")
            .single();

        if (error) {
            throw new Error(`Erro ao criar empresa: ${error.message}`);
        }

        setEmpresasBanco((atual) => [...atual, data].sort((a, b) => a.nome.localeCompare(b.nome)));
        return data;
    }

    async function adicionarColaborador(novo) {
        setErroBanco("");

        try {
            const empresaCriada = await obterOuCriarEmpresa(novo.empresaNome);

            const { data, error } = await supabase
                .from("colaboradores")
                .insert({
                    empresa_id: empresaCriada.id,
                    nome: novo.nome,
                    funcao: novo.funcao,
                    matricula: novo.matricula || null,
                    status: "Ativo",
                })
                .select(`
          id,
          nome,
          funcao,
          matricula,
          token_qr,
          status,
          empresa_id,
          empresas (
            id,
            nome
          )
        `)
                .single();

            if (error) {
                throw new Error(`Erro ao cadastrar colaborador: ${error.message}`);
            }

            const colaborador = normalizarColaborador(data);

            setColaboradores((atual) => [colaborador, ...atual]);
            setColaboradorSelecionado(colaborador);

            return true;
        } catch (error) {
            setErroBanco(error.message || "Erro ao cadastrar colaborador.");
            return false;
        }
    }

    async function excluirColaborador(colaborador) {
        const confirmar = window.confirm(`Deseja realmente excluir o colaborador ${colaborador.nome}?`);

        if (!confirmar) return;

        setErroBanco("");

        const { error } = await supabase
            .from("colaboradores")
            .delete()
            .eq("id", colaborador.id);

        if (error) {
            setErroBanco(`Erro ao excluir colaborador: ${error.message}`);
            return;
        }

        setColaboradores((atual) => atual.filter((item) => item.id !== colaborador.id));

        if (colaboradorSelecionado?.id === colaborador.id) {
            const restante = colaboradores.filter((item) => item.id !== colaborador.id);
            setColaboradorSelecionado(restante[0] || null);
        }
    }

    useEffect(() => {
        async function carregarSessao() {
            const { data } = await supabase.auth.getSession();

            if (data.session?.user) {
                setUsuario({
                    id: data.session.user.id,
                    email: data.session.user.email,
                    perfil: "Técnico de Segurança",
                });
            }

            setCarregandoSessao(false);
        }

        carregarSessao();

        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                setUsuario({
                    id: session.user.id,
                    email: session.user.email,
                    perfil: "Técnico de Segurança",
                });
            } else {
                setUsuario(null);
            }
        });

        return () => {
            listener.subscription.unsubscribe();
        };
    }, []);

    useEffect(() => {
        if (!usuario) return;

        const timer = window.setTimeout(() => {
            carregarColaboradores();
        }, 0);

        return () => window.clearTimeout(timer);
    }, [usuario, carregarColaboradores]);

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

    const sair = async () => {
        await supabase.auth.signOut();
        setUsuario(null);
        setColaboradores([]);
        setEmpresasBanco([]);
        setDocumentosEmpresas([]);
        setColaboradorSelecionado(null);
    };

    if (carregandoSessao) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
                <div className="rounded-3xl bg-white/10 p-6 text-center">
                    <ShieldCheck className="mx-auto mb-3 h-8 w-8" />
                    <p className="font-semibold">Carregando sistema...</p>
                </div>
            </div>
        );
    }

    if (!usuario) {
        return <LoginScreen onLogin={setUsuario} />;
    }

    return (
        <div className="min-h-screen bg-slate-100 text-slate-900">
            <div className="flex min-h-screen">
                <aside className="hidden w-72 border-r border-slate-200 bg-white p-5 lg:block">
                    <div className="flex items-center gap-3 rounded-3xl bg-slate-950 p-4 text-white">
                        <div className="rounded-2xl bg-white/10 p-3">
                            <ShieldCheck className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="font-bold">Controle SST QR</h1>
                            <p className="text-xs text-slate-300">Treinamentos · Terceiros</p>
                        </div>
                    </div>

                    <nav className="mt-6 space-y-2">
                        {nav.map((item) => {
                            const Icon = item.icon;

                            return (
                                <button
                                    key={item.id}
                                    onClick={() => setTela(item.id)}
                                    className={classNames(
                                        "flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium transition",
                                        tela === item.id
                                            ? "bg-slate-950 text-white shadow-sm"
                                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                                    )}
                                >
                                    <Icon className="h-4 w-4" />
                                    {item.label}
                                </button>
                            );
                        })}
                    </nav>

                    <div className="mt-6 rounded-3xl bg-slate-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Usuário logado</p>
                        <p className="mt-1 break-all text-sm font-bold text-slate-900">{usuario.email}</p>
                        <p className="mt-1 text-xs text-slate-500">Perfil: {usuario.perfil}</p>

                        <button
                            onClick={sair}
                            className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"
                        >
                            Sair
                        </button>
                    </div>
                </aside>

                <main className="flex-1 p-4 md:p-8">
                    <div className="mb-5 flex items-center justify-between rounded-3xl bg-white p-3 shadow-sm lg:hidden">
                        <div className="flex items-center gap-2 font-bold">
                            <ShieldCheck className="h-5 w-5" />
                            Controle SST QR
                        </div>

                        <select
                            value={tela}
                            onChange={(e) => setTela(e.target.value)}
                            className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
                        >
                            {nav.map((n) => (
                                <option key={n.id} value={n.id}>
                                    {n.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {tela === "dashboard" && (
                        <Dashboard colaboradores={colaboradores} onSelectColab={selecionarColaborador} />
                    )}

                    {tela === "empresas" && (
                        <Empresas
                            empresasBanco={empresasBanco}
                            documentosEmpresas={documentosEmpresas}
                            colaboradores={colaboradores}
                            carregandoBanco={carregandoBanco}
                            erroBanco={erroBanco}
                            onAtualizarBanco={carregarColaboradores}
                            onAdicionarEmpresa={adicionarEmpresa}
                            onAtualizarEmpresa={atualizarEmpresa}
                            onAdicionarDocumentoEmpresa={adicionarDocumentoEmpresa}
                            onExcluirDocumentoEmpresa={excluirDocumentoEmpresa}
                            onVisualizarDocumentoEmpresa={visualizarDocumentoEmpresa}
                        />
                    )}

                    {tela === "colaboradores" && (
                        <Colaboradores
                            colaboradores={colaboradores}
                            empresasBanco={empresasBanco}
                            carregandoBanco={carregandoBanco}
                            erroBanco={erroBanco}
                            onAtualizarBanco={carregarColaboradores}
                            onAdicionarColaborador={adicionarColaborador}
                            onExcluirColaborador={excluirColaborador}
                            onSelectColab={selecionarColaborador}
                        />
                    )}

                    {tela === "treinamentos" && (
                        <Treinamentos colaboradores={colaboradores} setColaboradores={setColaboradores} />
                    )}

                    {tela === "qr" && <ConsultaQR colaborador={colaboradorSelecionado} />}

                    {tela === "roteiro" && <Requisitos />}
                </main>
            </div>
        </div>
    );
}
