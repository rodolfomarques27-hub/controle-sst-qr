import React from "react";
import {
    BadgeCheck,
    Building2,
    CalendarDays,
    ClipboardCheck,
    ClipboardList,
    FileText,
    GitBranch,
    GraduationCap,
    LayoutDashboard,
    LockKeyhole,
    MonitorSmartphone,
    QrCode,
    Settings,
    ShieldCheck,
    Users,
} from "lucide-react";
import { Card, Header } from "./commonComponents";

export function Requisitos() {
    const modulosRevisados = [
        {
            titulo: "Login e recuperação de senha",
            descricao: "Login personalizado, fundo configurável e solicitação pública de recuperação de senha.",
            icone: LockKeyhole,
        },
        {
            titulo: "Dashboard SST",
            descricao: "Indicadores, cards, pendências e visão geral do controle de documentos.",
            icone: LayoutDashboard,
        },
        {
            titulo: "Empresas e documentos",
            descricao: "Gestão de empresas, PGR, PCMSO, LTCAT, contratos, logos e documentos vinculados.",
            icone: Building2,
        },
        {
            titulo: "Colaboradores",
            descricao: "Cadastro, foto, função, status, documentos e vínculo com empresa.",
            icone: Users,
        },
        {
            titulo: "Treinamentos",
            descricao: "Certificados, OCR, validade, status de análise, base de certificados e filtros.",
            icone: GraduationCap,
        },
        {
            titulo: "Aniversariantes",
            descricao: "Cards, relatório PDF, fotos circulares e gráfico mensal.",
            icone: CalendarDays,
        },
        {
            titulo: "Consulta QR",
            descricao: "QR público de colaborador, consulta segura e token sem dado sensível.",
            icone: QrCode,
        },
        {
            titulo: "Auditoria Campo",
            descricao: "Auditorias por área, ranking, evidências, relatórios e acesso público com token.",
            icone: ClipboardList,
        },
        {
            titulo: "Auditoria do Sistema",
            descricao: "Eventos críticos, filtros, relatório PDF e rastreabilidade técnica.",
            icone: FileText,
        },
        {
            titulo: "Acessos do App",
            descricao: "Usuários, perfis, permissões, bloqueio, senha temporária e solicitações.",
            icone: ShieldCheck,
        },
        {
            titulo: "Configurações",
            descricao: "Aba protegida, logs, fundo do login, limites, storage e revisão técnica.",
            icone: Settings,
        },
        {
            titulo: "Mobile e layout",
            descricao: "Cards, botões, filtros, cabeçalhos e telas públicas revisados para uso em campo.",
            icone: MonitorSmartphone,
        },
    ];

    const checklistFinal = [
        "Validar login normal e troca de senha temporária.",
        "Validar recuperação de senha pela solicitação pública.",
        "Validar Dashboard, Empresas, Colaboradores, Treinamentos e Aniversariantes.",
        "Validar Consulta QR pública em guia anônima e no celular.",
        "Validar Auditoria Campo, Auditoria do Sistema e relatórios PDF principais.",
        "Validar Acessos do App, perfis e telas restritas por permissão.",
        "Validar Configurações bloqueadas, logs críticos e fundo personalizado do login.",
        "Rodar build final e confirmar Git limpo antes do commit/push.",
    ];

    const pontosProtegidos = [
        "Login personalizado e fundo configurável.",
        "Recuperação de senha via solicitação no Acessos do App.",
        "Configurações bloqueadas e logs de ações críticas.",
        "QR público, QR colaborador e auditoria pública por token.",
        "Treinamentos/OCR, base de certificados e cards de colaboradores.",
        "PDFs principais já aprovados, principalmente Auditoria do Sistema.",
    ];

    const comandosValidacao = ["npm.cmd run build", "git status --short"];

    return (
        <div>
            <Header
                titulo="Fechamento final do sistema"
                subtitulo="Checklist de revisão do Controle SST QR antes do build final, validação visual e publicação."
            />

            <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                <Card>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
                                <BadgeCheck className="h-4 w-4" />
                                Roteiro 16
                            </div>
                            <h2 className="mt-3 text-xl font-black text-slate-950">Sistema em etapa de fechamento</h2>
                            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
                                Esta aba consolida os módulos já revisados e serve como checklist final para evitar que ajustes pequenos reabram funcionalidades aprovadas.
                            </p>
                        </div>
                    </div>

                    <div className="mt-6 grid gap-3 md:grid-cols-2">
                        {modulosRevisados.map((modulo) => {
                            const Icone = modulo.icone;
                            return (
                                <div key={modulo.titulo} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                                    <div className="flex items-start gap-3">
                                        <div className="flex h-11 w-11 flex-none items-center justify-center rounded-2xl bg-slate-100 text-slate-700 ring-1 ring-slate-200">
                                            <Icone className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-slate-950">{modulo.titulo}</p>
                                            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{modulo.descricao}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Card>

                <div className="space-y-6">
                    <Card>
                        <h2 className="flex items-center gap-2 text-lg font-black text-slate-950">
                            <ClipboardCheck className="h-5 w-5 text-emerald-600" />
                            Checklist obrigatório
                        </h2>

                        <div className="mt-4 space-y-3">
                            {checklistFinal.map((item, idx) => (
                                <div key={item} className="flex gap-3 rounded-2xl bg-slate-50 p-3 text-sm font-semibold leading-5 text-slate-700">
                                    <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-emerald-100 text-xs font-black text-emerald-700">
                                        {idx + 1}
                                    </span>
                                    <span>{item}</span>
                                </div>
                            ))}
                        </div>
                    </Card>

                    <Card>
                        <h2 className="flex items-center gap-2 text-lg font-black text-slate-950">
                            <ShieldCheck className="h-5 w-5 text-sky-600" />
                            Pontos protegidos
                        </h2>

                        <div className="mt-4 space-y-2">
                            {pontosProtegidos.map((item) => (
                                <div key={item} className="flex gap-2 rounded-2xl border border-slate-200 bg-white p-3 text-xs font-bold leading-5 text-slate-600">
                                    <BadgeCheck className="mt-0.5 h-4 w-4 flex-none text-emerald-600" />
                                    <span>{item}</span>
                                </div>
                            ))}
                        </div>
                    </Card>

                    <Card>
                        <h2 className="flex items-center gap-2 text-lg font-black text-slate-950">
                            <GitBranch className="h-5 w-5 text-slate-700" />
                            Validação após pacote
                        </h2>

                        <div className="mt-4 space-y-2">
                            {comandosValidacao.map((comando) => (
                                <div key={comando} className="rounded-2xl bg-slate-950 px-4 py-3 font-mono text-xs font-bold text-white">
                                    {comando}
                                </div>
                            ))}
                        </div>

                        <p className="mt-4 rounded-2xl bg-amber-50 p-3 text-xs font-bold leading-5 text-amber-800 ring-1 ring-amber-200">
                            Commit e push somente após build aprovado, Git conferido e validação visual no app.
                        </p>
                    </Card>
                </div>
            </div>
        </div>
    );
}
