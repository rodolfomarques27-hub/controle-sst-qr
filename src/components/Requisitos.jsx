import React, { useMemo, useState } from "react";
import {
    BadgeCheck,
    BookOpen,
    ClipboardCheck,
    FileText,
    FolderOpen,
    LifeBuoy,
    Search,
    ShieldCheck,
    Wrench,
} from "lucide-react";
import { Card, Header } from "./commonComponents";
import indiceDocumentacao from "../../docs/README.md?raw";
import manualAdministrador from "../../docs/manual-administrador.md?raw";
import manualOperacionalAbas from "../../docs/manual-operacional-abas.md?raw";
import manualBackupRestauracaoManutencao from "../../docs/manual-backup-restauracao-manutencao.md?raw";

const MANUAIS_SISTEMA = [
    {
        id: "indice",
        titulo: "Índice da documentação",
        subtitulo: "Visão geral dos manuais disponíveis e regra de uso da documentação.",
        arquivo: "docs/README.md",
        icone: FolderOpen,
        conteudo: indiceDocumentacao,
        destaque: "Consulta inicial",
    },
    {
        id: "administrador",
        titulo: "Manual do Administrador",
        subtitulo: "Administração do sistema, perfis, acessos, auditoria e configurações.",
        arquivo: "docs/manual-administrador.md",
        icone: ShieldCheck,
        conteudo: manualAdministrador,
        destaque: "Administração",
    },
    {
        id: "operacional",
        titulo: "Manual Operacional das Abas",
        subtitulo: "Uso das abas do sistema, relatórios, QR, treinamentos e auditorias.",
        arquivo: "docs/manual-operacional-abas.md",
        icone: ClipboardCheck,
        conteudo: manualOperacionalAbas,
        destaque: "Operação diária",
    },
    {
        id: "backup",
        titulo: "Manual de Backup, Restauração e Manutenção",
        subtitulo: "Backup do código, banco, Storage, Vercel e rotina mensal de manutenção.",
        arquivo: "docs/manual-backup-restauracao-manutencao.md",
        icone: Wrench,
        conteudo: manualBackupRestauracaoManutencao,
        destaque: "Manutenção",
    },
];

function obterResumoManual(conteudo = "") {
    const linhas = String(conteudo || "")
        .split(/\r?\n/)
        .map((linha) => linha.trim())
        .filter(Boolean);

    const secoes = linhas.filter((linha) => linha.startsWith("## ")).length;
    const comandos = linhas.filter((linha) => linha.startsWith("```powershell") || linha.startsWith("```text")).length;

    return {
        linhas: linhas.length,
        secoes,
        comandos,
    };
}

function renderizarTextoInline(texto = "", chaveBase = "inline") {
    const partes = String(texto).split(/(`[^`]+`)/g);

    return partes.map((parte, idx) => {
        if (parte.startsWith("`") && parte.endsWith("`")) {
            return (
                <code key={`${chaveBase}-${idx}`} className="rounded-lg bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-black text-slate-800 ring-1 ring-slate-200">
                    {parte.slice(1, -1)}
                </code>
            );
        }

        return <React.Fragment key={`${chaveBase}-${idx}`}>{parte}</React.Fragment>;
    });
}

function limparRotuloCodigo(linha = "") {
    const rotulo = String(linha || "")
        .replace(/^```/, "")
        .trim()
        .split(/\s+/)[0]
        .replace(/[^a-zA-Z0-9_-]/g, "");

    return rotulo || "text";
}

function MarkdownManual({ conteudo }) {
    const elementos = useMemo(() => {
        const linhas = String(conteudo || "").split(/\r?\n/);
        const itens = [];

        for (let i = 0; i < linhas.length; i += 1) {
            const linhaOriginal = linhas[i] || "";
            const linha = linhaOriginal.trim();
            const chave = `linha-${i}`;

            if (!linha) {
                itens.push(<div key={chave} className="h-3" />);
                continue;
            }

            if (linha.startsWith("```")) {
                const rotulo = limparRotuloCodigo(linha);
                const bloco = [];
                i += 1;

                while (i < linhas.length && !String(linhas[i] || "").trim().startsWith("```")) {
                    bloco.push(linhas[i] || "");
                    i += 1;
                }

                itens.push(
                    <div key={chave} className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-950 shadow-sm">
                        <div className="border-b border-white/10 px-4 py-2 font-mono text-[11px] font-black uppercase tracking-[0.16em] text-slate-300">
                            {rotulo}
                        </div>
                        <pre className="overflow-x-auto p-4 text-xs font-bold leading-6 text-white">
                            <code>{bloco.join("\n")}</code>
                        </pre>
                    </div>
                );
                continue;
            }

            if (linha.startsWith("# ")) {
                itens.push(
                    <h2 key={chave} className="mt-1 text-2xl font-black tracking-tight text-slate-950">
                        {renderizarTextoInline(linha.replace(/^#\s+/, ""), chave)}
                    </h2>
                );
                continue;
            }

            if (linha.startsWith("## ")) {
                itens.push(
                    <h3 key={chave} className="mt-7 border-t border-slate-200 pt-5 text-lg font-black text-slate-950">
                        {renderizarTextoInline(linha.replace(/^##\s+/, ""), chave)}
                    </h3>
                );
                continue;
            }

            if (linha.startsWith("### ")) {
                itens.push(
                    <h4 key={chave} className="mt-5 text-base font-black text-slate-800">
                        {renderizarTextoInline(linha.replace(/^###\s+/, ""), chave)}
                    </h4>
                );
                continue;
            }

            if (linha.startsWith("- ")) {
                itens.push(
                    <div key={chave} className="flex gap-3 rounded-2xl bg-slate-50 px-4 py-2 text-sm font-semibold leading-6 text-slate-700 ring-1 ring-slate-100">
                        <BadgeCheck className="mt-1 h-4 w-4 flex-none text-emerald-600" />
                        <span>{renderizarTextoInline(linha.replace(/^-\s+/, ""), chave)}</span>
                    </div>
                );
                continue;
            }

            if (/^\d+\.\s+/.test(linha)) {
                const numero = linha.match(/^(\d+)\./)?.[1] || "";
                itens.push(
                    <div key={chave} className="flex gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold leading-6 text-slate-700">
                        <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-slate-900 text-[11px] font-black text-white">
                            {numero}
                        </span>
                        <span>{renderizarTextoInline(linha.replace(/^\d+\.\s+/, ""), chave)}</span>
                    </div>
                );
                continue;
            }

            itens.push(
                <p key={chave} className="text-sm font-semibold leading-7 text-slate-600">
                    {renderizarTextoInline(linha, chave)}
                </p>
            );
        }

        return itens;
    }, [conteudo]);

    return <div className="space-y-2">{elementos}</div>;
}

export function Requisitos() {
    const [manualSelecionadoId, setManualSelecionadoId] = useState("indice");
    const [termoBusca, setTermoBusca] = useState("");

    const manuaisFiltrados = useMemo(() => {
        const termo = termoBusca.trim().toLowerCase();

        if (!termo) return MANUAIS_SISTEMA;

        return MANUAIS_SISTEMA.filter((manual) => {
            const base = `${manual.titulo} ${manual.subtitulo} ${manual.arquivo} ${manual.conteudo}`.toLowerCase();
            return base.includes(termo);
        });
    }, [termoBusca]);

    const manualSelecionado = MANUAIS_SISTEMA.find((manual) => manual.id === manualSelecionadoId) || MANUAIS_SISTEMA[0];
    const resumoSelecionado = obterResumoManual(manualSelecionado.conteudo);

    return (
        <div>
            <Header
                titulo="Manuais"
                subtitulo="Consulta oficial dos manuais do Controle SST QR, com documentação de administração, operação, backup, restauração e manutenção."
            />

            <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
                <div className="space-y-6">
                    <Card>
                        <div className="flex items-start gap-4">
                            <div className="flex h-14 w-14 flex-none items-center justify-center rounded-3xl bg-slate-950 text-white shadow-sm">
                                <BookOpen className="h-7 w-7" />
                            </div>
                            <div>
                                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
                                    <BadgeCheck className="h-4 w-4" />
                                    Base homologada
                                </div>
                                <h2 className="mt-3 text-xl font-black text-slate-950">Documentação integrada ao sistema</h2>
                                <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                                    A antiga aba Roteiro agora funciona como central de consulta dos manuais aprovados. O identificador interno continua como roteiro para preservar permissões e evitar quebra de acesso.
                                </p>
                            </div>
                        </div>
                    </Card>

                    <Card>
                        <label className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                            Buscar nos manuais
                        </label>
                        <div className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-white px-4 py-3 shadow-sm focus-within:ring-2 focus-within:ring-slate-300">
                            <Search className="h-5 w-5 text-slate-400" />
                            <input
                                value={termoBusca}
                                onChange={(evento) => setTermoBusca(evento.target.value)}
                                placeholder="Ex.: backup, QR, permissões, PDF, Vercel..."
                                className="w-full bg-transparent text-sm font-bold text-slate-800 outline-none placeholder:text-slate-400"
                            />
                        </div>
                    </Card>

                    <div className="space-y-3">
                        {manuaisFiltrados.map((manual) => {
                            const Icone = manual.icone;
                            const ativo = manual.id === manualSelecionado.id;
                            const resumo = obterResumoManual(manual.conteudo);

                            return (
                                <button
                                    key={manual.id}
                                    type="button"
                                    onClick={() => setManualSelecionadoId(manual.id)}
                                    className={`w-full rounded-3xl border p-4 text-left shadow-sm transition ${
                                        ativo
                                            ? "border-slate-950 bg-slate-950 text-white"
                                            : "border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50"
                                    }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={`flex h-12 w-12 flex-none items-center justify-center rounded-2xl ${ativo ? "bg-white/10 text-white" : "bg-slate-100 text-slate-700"}`}>
                                            <Icone className="h-6 w-6" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className={`mb-2 inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${ativo ? "bg-white/10 text-white" : "bg-emerald-50 text-emerald-700"}`}>
                                                {manual.destaque}
                                            </div>
                                            <p className="text-sm font-black">{manual.titulo}</p>
                                            <p className={`mt-1 text-xs font-semibold leading-5 ${ativo ? "text-slate-200" : "text-slate-500"}`}>{manual.subtitulo}</p>
                                            <div className={`mt-3 flex flex-wrap gap-2 text-[11px] font-black ${ativo ? "text-slate-100" : "text-slate-500"}`}>
                                                <span>{resumo.secoes} seções</span>
                                                <span>•</span>
                                                <span>{resumo.comandos} blocos</span>
                                                <span>•</span>
                                                <span>{manual.arquivo}</span>
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {manuaisFiltrados.length === 0 && (
                        <Card>
                            <p className="text-sm font-bold text-slate-600">Nenhum manual encontrado para a busca informada.</p>
                        </Card>
                    )}
                </div>

                <Card className="xl:sticky xl:top-4 xl:self-start">
                    <div className="mb-5 flex flex-col gap-3 border-b border-slate-200 pb-5 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-slate-600">
                                <FileText className="h-4 w-4" />
                                {manualSelecionado.arquivo}
                            </div>
                            <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">{manualSelecionado.titulo}</h2>
                            <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{manualSelecionado.subtitulo}</p>
                        </div>

                        <div className="grid grid-cols-3 gap-2 rounded-3xl bg-slate-50 p-2 text-center ring-1 ring-slate-200">
                            <div className="rounded-2xl bg-white px-3 py-2 shadow-sm">
                                <p className="text-lg font-black text-slate-950">{resumoSelecionado.secoes}</p>
                                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Seções</p>
                            </div>
                            <div className="rounded-2xl bg-white px-3 py-2 shadow-sm">
                                <p className="text-lg font-black text-slate-950">{resumoSelecionado.comandos}</p>
                                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Blocos</p>
                            </div>
                            <div className="rounded-2xl bg-white px-3 py-2 shadow-sm">
                                <p className="text-lg font-black text-slate-950">{resumoSelecionado.linhas}</p>
                                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Linhas</p>
                            </div>
                        </div>
                    </div>

                    <MarkdownManual conteudo={manualSelecionado.conteudo} />

                    <div className="mt-6 rounded-3xl bg-amber-50 p-4 text-xs font-bold leading-6 text-amber-800 ring-1 ring-amber-200">
                        <div className="mb-2 flex items-center gap-2 text-sm font-black text-amber-900">
                            <LifeBuoy className="h-4 w-4" />
                            Regra de manutenção
                        </div>
                        Use esta aba apenas para consulta. Alterações nos manuais devem continuar sendo feitas nos arquivos da pasta docs, com commit separado, build aprovado e Git limpo.
                    </div>
                </Card>
            </div>
        </div>
    );
}
