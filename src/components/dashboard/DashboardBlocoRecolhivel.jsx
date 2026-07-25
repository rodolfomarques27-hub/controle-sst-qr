import React from "react";
import {
    AlertTriangle,
    BadgeCheck,
    BellRing,
    Building2,
    ChevronDown,
    ChevronUp,
    ClipboardList,
    FileText,
    History,
    LayoutDashboard,
    QrCode,
    ShieldAlert,
    Users,
} from "lucide-react";
import { Card } from "../commonComponents";
import { classNames } from "../../utils/sstUtils";

const TEMAS_BLOCOS_RECOLHIVEIS = {
    default: {
        borda: "border-slate-200/80",
        fundo: "bg-white/95",
        acento: "from-cyan-400 via-blue-500 to-violet-500",
        icone: "bg-slate-100 text-slate-700 ring-slate-200/70",
    },
    rankingEmpresas: {
        borda: "border-blue-200/80",
        fundo: "bg-white/95",
        acento: "from-cyan-400 via-blue-500 to-sky-500",
        icone: "bg-blue-100 text-blue-700 ring-blue-200/70",
    },
    pendencias: {
        borda: "border-rose-200/80",
        fundo: "bg-white/95",
        acento: "from-rose-400 via-red-500 to-orange-400",
        icone: "bg-rose-100 text-rose-700 ring-rose-200/70",
    },
    conformidade: {
        borda: "border-emerald-200/80",
        fundo: "bg-white/95",
        acento: "from-emerald-400 via-teal-500 to-cyan-500",
        icone: "bg-emerald-100 text-emerald-700 ring-emerald-200/70",
    },
    colaboradoresFuncao: {
        borda: "border-violet-200/80",
        fundo: "bg-white/95",
        acento: "from-violet-400 via-fuchsia-500 to-indigo-500",
        icone: "bg-violet-100 text-violet-700 ring-violet-200/70",
    },
    alertas: {
        borda: "border-orange-200/80",
        fundo: "bg-white/95",
        acento: "from-orange-400 via-amber-500 to-yellow-500",
        icone: "bg-orange-100 text-orange-700 ring-orange-200/70",
    },
    documentosAVencer30Dias: {
        borda: "border-amber-200/80",
        fundo: "bg-white/95",
        acento: "from-amber-400 via-orange-500 to-yellow-400",
        icone: "bg-amber-100 text-amber-700 ring-amber-200/70",
    },
    documentosTipo: {
        borda: "border-sky-200/80",
        fundo: "bg-white/95",
        acento: "from-sky-400 via-blue-500 to-cyan-500",
        icone: "bg-sky-100 text-sky-700 ring-sky-200/70",
    },
    ultimosDocumentos: {
        borda: "border-slate-200/80",
        fundo: "bg-white/95",
        acento: "from-slate-400 via-slate-500 to-slate-600",
        icone: "bg-slate-100 text-slate-700 ring-slate-200/70",
    },
    auditoriasCampo: {
        borda: "border-cyan-200/80",
        fundo: "bg-white/95",
        acento: "from-cyan-400 via-sky-500 to-blue-500",
        icone: "bg-cyan-100 text-cyan-700 ring-cyan-200/70",
    },
    topDesviosCampo: {
        borda: "border-orange-200/80",
        fundo: "bg-white/95",
        acento: "from-orange-400 via-amber-500 to-rose-400",
        icone: "bg-orange-100 text-orange-700 ring-orange-200/70",
    },
};

function obterIconeBlocoRecolhivel(chaveBloco = "") {
    if (chaveBloco === "rankingEmpresas") return Building2;
    if (chaveBloco === "pendencias") return ShieldAlert;
    if (chaveBloco === "conformidade") return BadgeCheck;
    if (chaveBloco === "colaboradoresFuncao") return Users;
    if (chaveBloco === "alertas") return BellRing;
    if (chaveBloco === "documentosAVencer30Dias") return FileText;
    if (chaveBloco === "documentosTipo") return ClipboardList;
    if (chaveBloco === "ultimosDocumentos") return FileText;
    if (chaveBloco === "auditoriasCampo") return History;
    if (chaveBloco === "topDesviosCampo") return AlertTriangle;
    return LayoutDashboard;
}

export function DashboardBlocoRecolhivel({
    chaveBloco,
    titulo,
    subtitulo,
    badge,
    children,
    blocosRecolhidosDashboard = {},
    alternarBlocoRecolhidoDashboard,
}) {
    const recolhido = Boolean(blocosRecolhidosDashboard?.[chaveBloco]);
    const tema = TEMAS_BLOCOS_RECOLHIVEIS[chaveBloco] || TEMAS_BLOCOS_RECOLHIVEIS.default;
    const Icone = obterIconeBlocoRecolhivel(chaveBloco);

    const alternarBlocoRecolhivelPorArea = (evento) => {
        const alvoInterativo = evento.target.closest?.(
            "button, a, input, select, textarea, label, [role='button'], [data-dashboard-bloco-nao-alternar]"
        );

        if (alvoInterativo) return;
        if (!alternarBlocoRecolhidoDashboard) return;

        if (!recolhido) {
            const cabecalho = evento.currentTarget.querySelector("[data-dashboard-bloco-cabecalho='true']");
            if (cabecalho && !cabecalho.contains(evento.target)) return;
        }

        alternarBlocoRecolhidoDashboard(chaveBloco);
    };

    return (
        <div className="h-full" onClick={alternarBlocoRecolhivelPorArea}>
            <Card className={classNames("relative h-full overflow-hidden rounded-[22px] border bg-white/95 shadow-[0_18px_48px_-34px_rgba(15,23,42,0.5)] ring-0", tema.borda, tema.fundo)}>
            <span className={classNames("absolute inset-x-0 top-0 h-1 bg-gradient-to-r", tema.acento)} />
                <div data-dashboard-bloco-cabecalho="true" className={classNames("flex items-center gap-3 px-4 py-3.5 md:px-5", recolhido ? "border-b border-slate-100/80" : "border-b border-slate-100/80")}>
                <div className={classNames("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1", tema.icone)}>
                    <Icone className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                    <h2 className="truncate text-[15px] font-black tracking-tight text-[#1A2332]">{titulo}</h2>
                    {subtitulo && <p className="mt-0.5 line-clamp-2 text-[11px] font-medium leading-snug text-[#6B7A8D]">{subtitulo}</p>}
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {badge}
                    <button
                        type="button"
                        onClick={(evento) => {
                            evento.stopPropagation();
                            alternarBlocoRecolhidoDashboard?.(chaveBloco);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-full bg-[#1A2332] px-3 py-1.5 text-xs font-black text-white shadow-sm transition hover:bg-[#2A3647]"
                    >
                        {recolhido ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
                        {recolhido ? "Abrir" : "Recolher"}
                    </button>
                </div>
            </div>

            {!recolhido && <div className="px-4 py-4 md:px-5 md:py-5">{children}</div>}
            </Card>
        </div>
    );
}

export default DashboardBlocoRecolhivel;
