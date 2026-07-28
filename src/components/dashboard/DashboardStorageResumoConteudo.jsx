import { useMemo } from "react";
import { Building2, CheckCircle2, Database, FileText, HardDrive } from "lucide-react";

function formatarDataCurta(valor = "") {
    const partes = String(valor || "").split("-");
    if (partes.length !== 3) return valor;
    return `${partes[2]}/${partes[1]}`;
}

function formatarMb(bytes = 0) {
    return `${new Intl.NumberFormat("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(Number(bytes || 0) / (1024 * 1024))} MB`;
}

function StorageEvolucaoGrafico({ historico = [] }) {
    const grafico = useMemo(() => {
        const dados = historico.filter((item) => Number(item?.totalBytes || 0) >= 0);
        const largura = 760;
        const altura = 170;
        const margemX = 18;
        const margemY = 18;
        const valores = dados.map((item) => Number(item.totalBytes || 0));
        const maximo = Math.max(...valores, 1);
        const minimo = Math.min(...valores, 0);
        const intervalo = Math.max(maximo - minimo, maximo * 0.12, 1);
        const base = Math.max(0, minimo - intervalo * 0.2);
        const topo = maximo + intervalo * 0.18;
        const faixa = Math.max(topo - base, 1);
        const passoX = dados.length > 1
            ? (largura - margemX * 2) / (dados.length - 1)
            : 0;
        const pontos = dados.map((item, indice) => ({
            ...item,
            x: dados.length > 1 ? margemX + indice * passoX : largura / 2,
            y: margemY + (1 - ((Number(item.totalBytes || 0) - base) / faixa)) * (altura - margemY * 2),
        }));
        const linha = pontos.map((ponto) => `${ponto.x},${ponto.y}`).join(" ");
        const area = pontos.length
            ? `${pontos[0].x},${altura - margemY} ${linha} ${pontos[pontos.length - 1].x},${altura - margemY}`
            : "";

        return { largura, altura, pontos, linha, area };
    }, [historico]);

    if (grafico.pontos.length === 0) {
        return (
            <div className="grid h-40 place-items-center rounded-2xl border border-dashed border-slate-300 bg-white text-sm font-semibold text-slate-500">
                O histórico começará após a próxima atualização do Storage.
            </div>
        );
    }

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-3">
            <svg
                viewBox={`0 0 ${grafico.largura} ${grafico.altura}`}
                className="h-40 w-full overflow-visible"
                role="img"
                aria-label={`Evolução real do armazenamento em ${grafico.pontos.length} registro(s)`}
            >
                <defs>
                    <linearGradient id="storage-area-gradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.28" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
                    </linearGradient>
                </defs>
                {[0.25, 0.5, 0.75].map((proporcao) => (
                    <line
                        key={proporcao}
                        x1="18"
                        x2="742"
                        y1={grafico.altura * proporcao}
                        y2={grafico.altura * proporcao}
                        stroke="#e2e8f0"
                        strokeDasharray="5 6"
                    />
                ))}
                {grafico.area && <polygon points={grafico.area} fill="url(#storage-area-gradient)" />}
                {grafico.linha && (
                    <polyline
                        points={grafico.linha}
                        fill="none"
                        stroke="#059669"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                )}
                {grafico.pontos.map((ponto) => (
                    <g key={ponto.data}>
                        <circle cx={ponto.x} cy={ponto.y} r="6" fill="#ffffff" stroke="#059669" strokeWidth="4" />
                        <title>{`${formatarDataCurta(ponto.data)}: ${formatarMb(ponto.totalBytes)}`}</title>
                    </g>
                ))}
            </svg>
            <div className="mt-1 flex items-center justify-between text-[11px] font-bold text-slate-500">
                <span>{formatarDataCurta(grafico.pontos[0]?.data)}</span>
                <span>{grafico.pontos.length === 1 ? "Histórico iniciado hoje" : `${grafico.pontos.length} registros reais`}</span>
                <span>{formatarDataCurta(grafico.pontos[grafico.pontos.length - 1]?.data)}</span>
            </div>
        </div>
    );
}

export function DashboardStorageResumoConteudo({ resumo = {} }) {
    const metricas = Array.isArray(resumo.metricas) ? resumo.metricas : [];
    const icones = [HardDrive, Database, FileText, Building2];

    return (
        <div className="space-y-4">
            <section className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Uso de armazenamento</p>
                        <div className="mt-1 flex flex-wrap items-baseline gap-x-2">
                            <strong className="text-3xl font-black text-slate-950">{resumo.totalStorageLabel}</strong>
                            <span className="text-base font-bold text-slate-500">de {resumo.limiteStorageLabel}</span>
                        </div>
                    </div>
                    <span className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 ring-1 ring-emerald-200">
                        <CheckCircle2 className="h-4 w-4" />
                        {resumo.statusStorage}
                    </span>
                </div>
                <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-200">
                    <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-600 transition-all"
                        style={{ width: `${Math.min(100, Math.max(0, Number(resumo.percentualStorage || 0)))}%` }}
                    />
                </div>
                <div className="mt-2 flex justify-between text-xs font-bold text-slate-500">
                    <span>{resumo.percentualStorage}% da capacidade utilizada</span>
                    <span>Limite total: {resumo.limiteStorageLabel}</span>
                </div>
            </section>

            <section>
                <div className="mb-2 flex items-center justify-between gap-3">
                    <div>
                        <h3 className="text-sm font-black text-slate-900">Evolução do uso</h3>
                        <p className="text-xs text-slate-500">Snapshots reais registrados diariamente.</p>
                    </div>
                </div>
                <StorageEvolucaoGrafico historico={resumo.historico || []} />
            </section>

            <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {metricas.map((metrica, indice) => {
                    const Icone = icones[indice] || HardDrive;
                    return (
                        <article key={metrica.id} className="rounded-2xl border border-slate-200 bg-white p-3">
                            <div className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
                                <Icone className="h-4 w-4" />
                            </div>
                            <strong className="mt-3 block text-lg font-black text-slate-950">{metrica.valor}</strong>
                            <span className="text-xs font-semibold text-slate-500">{metrica.rotulo}</span>
                        </article>
                    );
                })}
            </section>
        </div>
    );
}
