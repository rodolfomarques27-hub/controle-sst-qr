import { useState } from "react";
import {
    AlertTriangle,
    ArrowDown,
    ArrowUp,
    Building2,
    CalendarDays,
    Clock3,
    Database,
    Eye,
    EyeOff,
    FileText,
    GripVertical,
    LayoutGrid,
    LockKeyhole,
    RotateCcw,
    Search,
    SlidersHorizontal,
    UsersRound,
} from "lucide-react";
import { Card } from "../commonComponents";
import { classNames } from "../../utils/sstUtils";
import {
    painelPadraoDashboard,
    cartasPadraoDashboard,
    tamanhosPadraoCartasDashboard,
    tamanhosPadraoBlocosDashboard,
    ordemPadraoBlocosDashboard,
    ordemPadraoCartasDashboard,
    opcoesTamanhoCartaDashboard,
    opcoesTamanhoBlocoDashboard,
    blocosRecolhidosPadraoDashboard,
} from "../../services/dashboardService";

const SECOES_CARTAS_DASHBOARD = {
    colaboradoresMobilizados: "Colaboradores",
    colaboradoresLiberados: "Colaboradores",
    comPendencia: "Colaboradores",
    emAnalise: "Colaboradores",
    empresasAtivas: "Empresas",
    documentosVencidos: "Empresas",
    documentosAVencer: "Empresas",
    treinamentosVencidos: "Documentos",
    documentosFuncionariosAVencer: "Documentos",
    horasTrabalhadasMes: "Indicadores",
    colaboradoresBloqueados: "Colaboradores",
    desviosAbertos: "Indicadores",
    aniversariantesMes: "Colaboradores",
    armazenamentoUtilizado: "Sistema",
};

const DESCRICOES_CARTAS_DASHBOARD = {
    colaboradoresMobilizados: "Total de colaboradores no período",
    colaboradoresLiberados: "Total de colaboradores liberados",
    comPendencia: "Colaboradores com pendências",
    emAnalise: "Processos em análise",
    empresasAtivas: "Empresas cadastradas e ativas",
    documentosVencidos: "Documentos em atraso",
    documentosAVencer: "Documentos próximos do vencimento",
    treinamentosVencidos: "Documentos de colaboradores em atraso",
    documentosFuncionariosAVencer: "Documentos de colaboradores próximos",
    horasTrabalhadasMes: "Horas registradas no período",
    colaboradoresBloqueados: "Colaboradores com acesso bloqueado",
    desviosAbertos: "Ocorrências em aberto",
    aniversariantesMes: "Colaboradores que fazem aniversário",
    armazenamentoUtilizado: "Uso do armazenamento em disco",
};

const ICONES_CARTAS_DASHBOARD = {
    colaboradoresMobilizados: UsersRound,
    colaboradoresLiberados: UsersRound,
    comPendencia: AlertTriangle,
    emAnalise: Clock3,
    empresasAtivas: Building2,
    documentosVencidos: FileText,
    documentosAVencer: FileText,
    treinamentosVencidos: FileText,
    documentosFuncionariosAVencer: FileText,
    horasTrabalhadasMes: Clock3,
    colaboradoresBloqueados: LockKeyhole,
    desviosAbertos: AlertTriangle,
    aniversariantesMes: CalendarDays,
    armazenamentoUtilizado: Database,
};

const DESCRICOES_BLOCOS_DASHBOARD = {
    pendencias: "Pendências que exigem acompanhamento",
    documentosAVencer30Dias: "Documentos próximos do vencimento",
    conformidade: "Resumo visual de conformidade",
    rankingEmpresas: "Comparativo consolidado por empresa",
    colaboradoresFuncao: "Distribuição dos colaboradores por função",
    alertas: "Alertas e situações que precisam de atenção",
    documentosTipo: "Distribuição documental por tipo",
    ultimosDocumentos: "Últimos documentos adicionados ao sistema",
};

function normalizarBuscaPainel(valor) {
    return String(valor || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

function obterSecaoCartaDashboard(chave) {
    return SECOES_CARTAS_DASHBOARD[chave] || "Outros";
}

function obterDescricaoCartaDashboard(chave) {
    return DESCRICOES_CARTAS_DASHBOARD[chave] || "Indicador do Dashboard SST";
}

function obterClasseSecaoDashboard(secao) {
    if (secao === "Colaboradores") return "bg-blue-50 text-blue-700 ring-blue-100";
    if (secao === "Empresas") return "bg-emerald-50 text-emerald-700 ring-emerald-100";
    if (secao === "Documentos") return "bg-violet-50 text-violet-700 ring-violet-100";
    if (secao === "Indicadores") return "bg-amber-50 text-amber-700 ring-amber-100";
    if (secao === "Sistema") return "bg-slate-100 text-slate-700 ring-slate-200";
    return "bg-slate-50 text-slate-600 ring-slate-200";
}

function obterClasseIconeCartaDashboard(secao, chave) {
    if (chave === "desviosAbertos" || chave === "comPendencia") {
        return "bg-rose-50 text-rose-600 ring-rose-100";
    }

    if (secao === "Colaboradores") return "bg-blue-50 text-blue-600 ring-blue-100";
    if (secao === "Empresas") return "bg-emerald-50 text-emerald-600 ring-emerald-100";
    if (secao === "Documentos") return "bg-violet-50 text-violet-600 ring-violet-100";
    if (secao === "Indicadores") return "bg-amber-50 text-amber-600 ring-amber-100";
    return "bg-cyan-50 text-cyan-700 ring-cyan-100";
}

function obterInicialTamanhoDashboard(chave) {
    if (chave === "medio") return "M";
    if (chave === "grande") return "G";
    if (chave === "destaque") return "D";
    return "P";
}

function BotaoVisibilidadePainel({
    ativo,
    onClick,
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="inline-flex items-center gap-2 rounded-xl px-1.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            title={ativo ? "Ocultar no painel" : "Exibir no painel"}
        >
            <span
                className={classNames(
                    "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition",
                    ativo ? "bg-emerald-500" : "bg-slate-300"
                )}
            >
                <span
                    className={classNames(
                        "h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                        ativo ? "translate-x-4" : "translate-x-0"
                    )}
                />
            </span>

            <span className="whitespace-nowrap">
                {ativo ? "Visível" : "Oculto"}
            </span>
        </button>
    );
}

function BotoesTamanhoPainel({
    opcoes,
    valorAtual,
    onChange,
}) {
    return (
        <div className="inline-flex items-center gap-1">
            {opcoes.map((tamanho) => {
                const selecionado =
                    valorAtual === tamanho.chave;

                return (
                    <button
                        key={tamanho.chave}
                        type="button"
                        onClick={() => onChange(tamanho.chave)}
                        className={classNames(
                            "inline-flex h-7 min-w-7 items-center justify-center rounded-lg px-2 text-[10px] font-black ring-1 transition",
                            selecionado
                                ? "bg-slate-950 text-white ring-slate-950 shadow-sm"
                                : "bg-white text-slate-500 ring-slate-200 hover:bg-slate-50 hover:text-slate-800"
                        )}
                        title={`${tamanho.label} · ${tamanho.descricao}`}
                    >
                        {obterInicialTamanhoDashboard(
                            tamanho.chave
                        )}
                    </button>
                );
            })}
        </div>
    );
}

export function DashboardControles({
    mostrarFiltroPainel,
    abaPersonalizacaoPainel,
    setAbaPersonalizacaoPainel,
    blocosPainelDashboard,
    setBlocosPainelDashboard,
    cartasVisiveisDashboard,
    setCartasVisiveisDashboard,
    tamanhosCartasDashboard,
    setTamanhosCartasDashboard,
    tamanhosBlocosDashboard,
    setTamanhosBlocosDashboard,
    setBlocosRecolhidosDashboard,
    setOrdemBlocosDashboard,
    setOrdemCartasDashboard,
    opcoesCartasOrdenadasDashboard,
    opcoesBlocosOrdenadasDashboard,
    cartaArrastandoDashboard,
    setCartaArrastandoDashboard,
    blocoArrastandoDashboard,
    setBlocoArrastandoDashboard,
    alternarBlocoPainel,
    alternarCartaPainel,
    alterarTamanhoCartaPainel,
    alterarTamanhoBlocoPainel,
    moverBlocoPainel,
    moverCartaPainel,
    soltarCartaPainel,
    soltarBlocoPainel,
    prepararArrastePainel,
}) {
    const [
        buscaCartas,
        setBuscaCartas,
    ] = useState("");

    const [
        filtroSecaoCartas,
        setFiltroSecaoCartas,
    ] = useState("todas");

    const [
        filtroStatusCartas,
        setFiltroStatusCartas,
    ] = useState("todos");

    const cartasOrdenadas =
        Array.isArray(
            opcoesCartasOrdenadasDashboard
        )
            ? opcoesCartasOrdenadasDashboard
            : [];

    const quadrosOrdenados =
        Array.isArray(
            opcoesBlocosOrdenadasDashboard
        )
            ? opcoesBlocosOrdenadasDashboard.filter(
                (opcao) =>
                    opcao.chave !== "cards"
            )
            : [];

    const secoesCartas =
        Array.from(
            new Set(
                cartasOrdenadas.map(
                    (opcao) =>
                        obterSecaoCartaDashboard(
                            opcao.chave
                        )
                )
            )
        );

    const buscaNormalizada =
        normalizarBuscaPainel(
            buscaCartas
        );

    const cartasFiltradas =
        cartasOrdenadas.filter(
            (opcao) => {
                const secao =
                    obterSecaoCartaDashboard(
                        opcao.chave
                    );

                const ativo =
                    cartasVisiveisDashboard[
                        opcao.chave
                    ] !== false;

                const combinaSecao =
                    filtroSecaoCartas === "todas"
                    || secao === filtroSecaoCartas;

                const combinaStatus =
                    filtroStatusCartas === "todos"
                    || (
                        filtroStatusCartas === "visiveis"
                        && ativo
                    )
                    || (
                        filtroStatusCartas === "ocultos"
                        && !ativo
                    );

                const textoBusca =
                    normalizarBuscaPainel(
                        `${opcao.label} ${obterDescricaoCartaDashboard(opcao.chave)} ${secao}`
                    );

                const combinaBusca =
                    !buscaNormalizada
                    || textoBusca.includes(
                        buscaNormalizada
                    );

                return (
                    combinaSecao
                    && combinaStatus
                    && combinaBusca
                );
            }
        );

    const totalCartas =
        cartasOrdenadas.length;

    const totalCartasVisiveis =
        cartasOrdenadas.filter(
            (opcao) =>
                cartasVisiveisDashboard[
                    opcao.chave
                ] !== false
        ).length;

    const totalCartasOcultas =
        Math.max(
            0,
            totalCartas -
                totalCartasVisiveis
        );

    const totalQuadros =
        quadrosOrdenados.length;

    const totalQuadrosVisiveis =
        quadrosOrdenados.filter(
            (opcao) =>
                Boolean(
                    blocosPainelDashboard[
                        opcao.chave
                    ]
                )
        ).length;

    const restaurarPadraoCompleto = () => {
        setBlocosPainelDashboard(
            painelPadraoDashboard
        );

        setCartasVisiveisDashboard(
            cartasPadraoDashboard
        );

        setTamanhosCartasDashboard(
            tamanhosPadraoCartasDashboard
        );

        setTamanhosBlocosDashboard(
            tamanhosPadraoBlocosDashboard
        );

        setBlocosRecolhidosDashboard(
            blocosRecolhidosPadraoDashboard
        );

        setOrdemBlocosDashboard(
            ordemPadraoBlocosDashboard
        );

        setOrdemCartasDashboard(
            ordemPadraoCartasDashboard
        );
    };

    const aplicarPainelCompacto = () => {
        setBlocosPainelDashboard({
            cards: true,
            pendencias: true,
            documentosAVencer30Dias: true,
            conformidade: true,
            colaboradoresFuncao: true,
            rankingEmpresas: true,
            documentosTipo: false,
            ultimosDocumentos: false,
            alertas: true,
        });

        setCartasVisiveisDashboard({
            ...cartasPadraoDashboard,
            armazenamentoUtilizado: false,
            aniversariantesMes: false,
            desviosAbertos: false,
        });

        setTamanhosCartasDashboard({
            ...tamanhosPadraoCartasDashboard,
            colaboradoresMobilizados: "medio",
            colaboradoresLiberados: "medio",
            comPendencia: "medio",
            colaboradoresBloqueados: "medio",
        });

        setTamanhosBlocosDashboard({
            ...tamanhosPadraoBlocosDashboard,
            cards: "destaque",
            pendencias: "destaque",
            documentosAVencer30Dias: "grande",
            conformidade: "medio",
            rankingEmpresas: "destaque",
            colaboradoresFuncao: "medio",
            alertas: "medio",
        });

        setOrdemBlocosDashboard([
            "cards",
            "pendencias",
            "documentosAVencer30Dias",
            "rankingEmpresas",
            "conformidade",
            "colaboradoresFuncao",
            "alertas",
            "documentosTipo",
            "ultimosDocumentos",
        ]);

        setOrdemCartasDashboard(
            ordemPadraoCartasDashboard
        );

        setBlocosRecolhidosDashboard(
            blocosRecolhidosPadraoDashboard
        );
    };

    if (!mostrarFiltroPainel) {
        return null;
    }

    const estiloGradeCartas = {
        gridTemplateColumns:
            "42px minmax(280px,1fr) 138px 142px 164px 164px",
    };

    const estiloGradeQuadros = {
        gridTemplateColumns:
            "42px minmax(320px,1fr) 150px 180px 164px",
    };

    return (
        <Card className="mb-3 overflow-hidden border border-slate-200 bg-white p-0 shadow-sm">
            <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                                <SlidersHorizontal className="h-4 w-4" />
                            </div>

                            <div>
                                <h2 className="text-base font-black tracking-tight text-slate-950">
                                    Personalizar painel SST
                                </h2>

                                <p className="mt-0.5 text-xs text-slate-500">
                                    Organize, exiba ou oculte somente os itens do Dashboard SST.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={
                                restaurarPadraoCompleto
                            }
                            className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
                        >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Restaurar padrão
                        </button>

                        <button
                            type="button"
                            onClick={
                                aplicarPainelCompacto
                            }
                            className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-3 py-2 text-xs font-bold text-white transition hover:bg-slate-800"
                        >
                            <LayoutGrid className="h-3.5 w-3.5" />
                            Painel compacto
                        </button>
                    </div>
                </div>
            </div>

            <div className="space-y-2.5 bg-slate-50/50 p-2.5 sm:p-3">
                <section className="rounded-xl border border-slate-200 bg-white p-2 shadow-[0_4px_14px_rgba(15,23,42,0.025)]">
                    <div className="grid items-stretch gap-2 xl:grid-cols-3">
                                                <div className="flex h-full min-h-[58px] min-w-0 flex-col justify-center rounded-lg bg-white px-3 py-2 ring-1 ring-slate-200">
                            <span className="block text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                                Resumo do seu painel
                            </span>

                            <div className="mt-1.5 flex min-w-0 flex-nowrap items-center gap-2 overflow-hidden text-[10px] font-semibold text-slate-600">
                                <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap">
                                    <Eye
                                        className="h-3.5 w-3.5 text-emerald-600"
                                        strokeWidth={2.25}
                                    />

                                    <strong className="text-xs font-black text-slate-950">
                                        {totalCartasVisiveis}
                                    </strong>

                                    <span>Visíveis</span>
                                </span>

                                <span className="h-3 w-px shrink-0 bg-slate-200" />

                                <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap">
                                    <EyeOff
                                        className="h-3.5 w-3.5 text-slate-500"
                                        strokeWidth={2.25}
                                    />

                                    <strong className="text-xs font-black text-slate-950">
                                        {totalCartasOcultas}
                                    </strong>

                                    <span>Ocultos</span>
                                </span>

                                <span className="h-3 w-px shrink-0 bg-slate-200" />

                                <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap">
                                    <LayoutGrid
                                        className="h-3.5 w-3.5 text-blue-600"
                                        strokeWidth={2.25}
                                    />

                                    <strong className="text-xs font-black text-slate-950">
                                        {secoesCartas.length}
                                    </strong>

                                    <span>Seções</span>
                                </span>

                                <span className="h-3 w-px shrink-0 bg-slate-200" />

                                <span className="inline-flex min-w-0 items-center gap-1 whitespace-nowrap">
                                    <SlidersHorizontal
                                        className="h-3.5 w-3.5 shrink-0 text-slate-600"
                                        strokeWidth={2.25}
                                    />

                                    <span className="truncate font-black text-slate-800">
                                        Personalizado
                                    </span>
                                </span>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() =>
                                setAbaPersonalizacaoPainel(
                                    "cartas"
                                )
                            }
                            className={classNames(
                                "h-full min-h-[58px] rounded-lg px-3 py-2 text-left ring-1 transition",
                                abaPersonalizacaoPainel === "cartas"
                                    ? "bg-emerald-50 text-emerald-950 ring-emerald-200 shadow-sm hover:bg-emerald-100"
                                    : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
                            )}
                        >
                            <span className="block text-[10px] font-black uppercase tracking-[0.14em] opacity-70">
                                Indicadores
                            </span>

                            <span className="mt-0.5 block text-xs font-bold">
                                Métricas exibidas no topo
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() =>
                                setAbaPersonalizacaoPainel(
                                    "quadros"
                                )
                            }
                            className={classNames(
                                "h-full min-h-[58px] rounded-lg px-3 py-2 text-left ring-1 transition",
                                abaPersonalizacaoPainel === "quadros"
                                    ? "bg-emerald-50 text-emerald-950 ring-emerald-200 shadow-sm hover:bg-emerald-100"
                                    : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
                            )}
                        >
                            <span className="block text-[10px] font-black uppercase tracking-[0.14em] opacity-70">
                                Quadros do painel
                            </span>

                            <span className="mt-0.5 block text-xs font-bold">
                                Blocos grandes do Dashboard SST
                            </span>
                        </button>
                    </div>
                </section>

                {abaPersonalizacaoPainel === "cartas" && (
                    <>
                        <section className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-[0_4px_14px_rgba(15,23,42,0.025)]">
                            <div className="grid gap-2 xl:grid-cols-[170px_170px_minmax(220px,1fr)_190px] xl:items-end">
                                <label className="block">
                                    <span className="mb-1 block text-[10px] font-black uppercase tracking-wide text-slate-500">
                                        Filtrar widgets
                                    </span>

                                    <select
                                        value={filtroSecaoCartas}
                                        onChange={(evento) =>
                                            setFiltroSecaoCartas(
                                                evento.target.value
                                            )
                                        }
                                        className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-700 outline-none transition focus:border-slate-400"
                                    >
                                        <option value="todas">
                                            Todas as seções
                                        </option>

                                        {secoesCartas.map((secao) => (
                                            <option
                                                key={secao}
                                                value={secao}
                                            >
                                                {secao}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label className="block">
                                    <span className="mb-1 block text-[10px] font-black uppercase tracking-wide text-transparent">
                                        Status
                                    </span>

                                    <select
                                        value={filtroStatusCartas}
                                        onChange={(evento) =>
                                            setFiltroStatusCartas(
                                                evento.target.value
                                            )
                                        }
                                        className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-700 outline-none transition focus:border-slate-400"
                                    >
                                        <option value="todos">
                                            Todos os status
                                        </option>

                                        <option value="visiveis">
                                            Somente visíveis
                                        </option>

                                        <option value="ocultos">
                                            Somente ocultos
                                        </option>
                                    </select>
                                </label>

                                <label className="block">
                                    <span className="mb-1 block text-[10px] font-black uppercase tracking-wide text-transparent">
                                        Busca
                                    </span>

                                    <span className="flex h-8 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 focus-within:border-slate-400">
                                        <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />

                                        <input
                                            value={buscaCartas}
                                            onChange={(evento) =>
                                                setBuscaCartas(
                                                    evento.target.value
                                                )
                                            }
                                            placeholder="Buscar widget por nome..."
                                            className="min-w-0 flex-1 bg-transparent text-xs font-medium text-slate-700 outline-none placeholder:text-slate-400"
                                        />
                                    </span>
                                </label>

                                <div>
                                    <span className="mb-1 block text-[10px] font-black uppercase tracking-wide text-slate-500">
                                        Ordenação
                                    </span>

                                    <div className="flex h-8 items-center justify-between rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-700">
                                        <span>
                                            Ordem personalizada
                                        </span>

                                        <GripVertical className="h-3.5 w-3.5 text-slate-400" />
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_6px_18px_rgba(15,23,42,0.03)]">
                            <div className="flex flex-col gap-2 border-b border-slate-100 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <h3 className="text-sm font-black text-slate-950">
                                        Indicadores do Dashboard SST
                                    </h3>

                                    <p className="mt-0.5 text-xs text-slate-500">
                                        Arraste para ordenar, altere a visibilidade e escolha o tamanho de cada indicador.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() =>
                                        setBlocosPainelDashboard(
                                            (atual) => ({
                                                ...atual,
                                                cards: !atual.cards,
                                            })
                                        )
                                    }
                                    className={classNames(
                                        "inline-flex items-center gap-2 self-start rounded-xl px-3 py-2 text-xs font-bold ring-1 transition sm:self-auto",
                                        blocosPainelDashboard.cards
                                            ? "bg-emerald-50 text-emerald-700 ring-emerald-100 hover:bg-emerald-100"
                                            : "bg-slate-50 text-slate-500 ring-slate-200 hover:bg-slate-100"
                                    )}
                                >
                                    {blocosPainelDashboard.cards ? (
                                        <Eye className="h-3.5 w-3.5" />
                                    ) : (
                                        <EyeOff className="h-3.5 w-3.5" />
                                    )}

                                    {blocosPainelDashboard.cards
                                        ? "Seção visível"
                                        : "Seção oculta"}
                                </button>
                            </div>

                            <div className="overflow-x-auto">
                                <div className="min-w-[930px]">
                                    <div
                                        className="grid items-center gap-2 border-b border-slate-100 bg-slate-50 px-3 py-1.5 text-[9px] font-black uppercase tracking-wide text-slate-500"
                                        style={estiloGradeCartas}
                                    >
                                        <span className="text-center">#</span>
                                        <span>Widget</span>
                                        <span>Seção</span>
                                        <span>Visibilidade</span>
                                        <span>Tamanho</span>
                                        <span>Ordem</span>
                                    </div>

                                    {cartasFiltradas.length === 0 ? (
                                        <div className="px-4 py-8 text-center">
                                            <p className="text-sm font-bold text-slate-700">
                                                Nenhum widget encontrado
                                            </p>

                                            <p className="mt-1 text-xs text-slate-400">
                                                Ajuste os filtros ou a busca para visualizar os itens.
                                            </p>
                                        </div>
                                    ) : (
                                        cartasFiltradas.map((opcao) => {
                                            const index =
                                                cartasOrdenadas.findIndex(
                                                    (item) =>
                                                        item.chave === opcao.chave
                                                );

                                            const ativo =
                                                cartasVisiveisDashboard[
                                                    opcao.chave
                                                ] !== false;

                                            const tamanhoAtual =
                                                tamanhosCartasDashboard[
                                                    opcao.chave
                                                ] || "padrao";

                                            const secao =
                                                obterSecaoCartaDashboard(
                                                    opcao.chave
                                                );

                                            const Icone =
                                                ICONES_CARTAS_DASHBOARD[
                                                    opcao.chave
                                                ] || LayoutGrid;

                                            return (
                                                <div
                                                    key={opcao.chave}
                                                    onDragOver={(evento) =>
                                                        evento.preventDefault()
                                                    }
                                                    onDrop={() =>
                                                        soltarCartaPainel(
                                                            opcao.chave
                                                        )
                                                    }
                                                    className={classNames(
                                                        "grid items-center gap-2 border-b border-slate-100 px-3 py-1.5 transition last:border-b-0 hover:bg-slate-50/70",
                                                        !ativo
                                                            ? "bg-slate-50/50"
                                                            : "bg-white",
                                                        cartaArrastandoDashboard === opcao.chave
                                                            ? "opacity-60 ring-2 ring-inset ring-blue-200"
                                                            : ""
                                                    )}
                                                    style={estiloGradeCartas}
                                                >
                                                    <span className="text-center text-xs font-black tabular-nums text-slate-500">
                                                        {index + 1}
                                                    </span>

                                                    <div className="flex min-w-0 items-center gap-2.5">
                                                        <span
                                                            className={classNames(
                                                                "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ring-1",
                                                                obterClasseIconeCartaDashboard(
                                                                    secao,
                                                                    opcao.chave
                                                                )
                                                            )}
                                                        >
                                                            <Icone className="h-4 w-4" />
                                                        </span>

                                                        <div className="min-w-0">
                                                            <p
                                                                className={classNames(
                                                                    "truncate text-xs font-black",
                                                                    ativo
                                                                        ? "text-slate-900"
                                                                        : "text-slate-500"
                                                                )}
                                                            >
                                                                {opcao.label}
                                                            </p>

                                                            <p className="mt-0.5 truncate text-[10px] font-medium text-slate-400">
                                                                {obterDescricaoCartaDashboard(
                                                                    opcao.chave
                                                                )}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <span
                                                        className={classNames(
                                                            "inline-flex w-fit rounded-full px-2.5 py-1 text-[10px] font-bold ring-1",
                                                            obterClasseSecaoDashboard(
                                                                secao
                                                            )
                                                        )}
                                                    >
                                                        {secao}
                                                    </span>

                                                    <BotaoVisibilidadePainel
                                                        ativo={ativo}
                                                        onClick={() =>
                                                            alternarCartaPainel(
                                                                opcao.chave
                                                            )
                                                        }
                                                    />

                                                    <BotoesTamanhoPainel
                                                        opcoes={
                                                            opcoesTamanhoCartaDashboard
                                                        }
                                                        valorAtual={
                                                            tamanhoAtual
                                                        }
                                                        onChange={(tamanho) =>
                                                            alterarTamanhoCartaPainel(
                                                                opcao.chave,
                                                                tamanho
                                                            )
                                                        }
                                                    />

                                                    <div className="flex items-center gap-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                moverCartaPainel(
                                                                    opcao.chave,
                                                                    -1
                                                                )
                                                            }
                                                            disabled={
                                                                index === 0
                                                            }
                                                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
                                                            title="Mover para cima"
                                                        >
                                                            <ArrowUp className="h-3.5 w-3.5" />
                                                        </button>

                                                        <span className="inline-flex h-7 min-w-10 items-center justify-center rounded-lg bg-white px-2 text-[10px] font-black tabular-nums text-slate-700 ring-1 ring-slate-200">
                                                            {index + 1}
                                                        </span>

                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                moverCartaPainel(
                                                                    opcao.chave,
                                                                    1
                                                                )
                                                            }
                                                            disabled={
                                                                index ===
                                                                cartasOrdenadas.length - 1
                                                            }
                                                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
                                                            title="Mover para baixo"
                                                        >
                                                            <ArrowDown className="h-3.5 w-3.5" />
                                                        </button>

                                                        <span
                                                            draggable
                                                            onDragStart={(evento) => {
                                                                prepararArrastePainel(
                                                                    evento
                                                                );

                                                                setCartaArrastandoDashboard(
                                                                    opcao.chave
                                                                );
                                                            }}
                                                            onDragEnd={() =>
                                                                setCartaArrastandoDashboard(
                                                                    null
                                                                )
                                                            }
                                                            className="inline-flex h-7 w-7 cursor-grab items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 active:cursor-grabbing"
                                                            title="Arraste para reordenar"
                                                        >
                                                            <GripVertical className="h-4 w-4" />
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </section>
                    </>
                )}

                {abaPersonalizacaoPainel === "quadros" && (
                    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_6px_18px_rgba(15,23,42,0.03)]">
                        <div className="flex flex-col gap-2 border-b border-slate-100 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h3 className="text-sm font-black text-slate-950">
                                    Quadros do Dashboard SST
                                </h3>

                                <p className="mt-0.5 text-xs text-slate-500">
                                    Organize somente os blocos grandes do painel. Os indicadores continuam na outra aba.
                                </p>
                            </div>

                            <span className="inline-flex self-start rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black text-emerald-700 ring-1 ring-emerald-100 sm:self-auto">
                                {totalQuadrosVisiveis} de {totalQuadros} visíveis
                            </span>
                        </div>

                        <div className="overflow-x-auto">
                            <div className="min-w-[860px]">
                                <div
                                    className="grid items-center gap-2 border-b border-slate-100 bg-slate-50 px-3 py-1.5 text-[9px] font-black uppercase tracking-wide text-slate-500"
                                    style={estiloGradeQuadros}
                                >
                                    <span className="text-center">#</span>
                                    <span>Quadro</span>
                                    <span>Visibilidade</span>
                                    <span>Tamanho</span>
                                    <span>Ordem</span>
                                </div>

                                {quadrosOrdenados.map((opcao) => {
                                    const indexCompleto =
                                        opcoesBlocosOrdenadasDashboard.findIndex(
                                            (item) =>
                                                item.chave === opcao.chave
                                        );

                                    const indexQuadro =
                                        quadrosOrdenados.findIndex(
                                            (item) =>
                                                item.chave === opcao.chave
                                        );

                                    const ativo =
                                        Boolean(
                                            blocosPainelDashboard[
                                                opcao.chave
                                            ]
                                        );

                                    const tamanhoAtual =
                                        tamanhosBlocosDashboard[
                                            opcao.chave
                                        ] || "padrao";

                                    return (
                                        <div
                                            key={opcao.chave}
                                            onDragOver={(evento) =>
                                                evento.preventDefault()
                                            }
                                            onDrop={() =>
                                                soltarBlocoPainel(
                                                    opcao.chave
                                                )
                                            }
                                            className={classNames(
                                                "grid items-center gap-2 border-b border-slate-100 px-3 py-1.5 transition last:border-b-0 hover:bg-slate-50/70",
                                                ativo
                                                    ? "bg-white"
                                                    : "bg-slate-50/50",
                                                blocoArrastandoDashboard === opcao.chave
                                                    ? "opacity-60 ring-2 ring-inset ring-emerald-200"
                                                    : ""
                                            )}
                                            style={estiloGradeQuadros}
                                        >
                                            <span className="text-center text-xs font-black tabular-nums text-slate-500">
                                                {indexQuadro + 1}
                                            </span>

                                            <div className="flex min-w-0 items-center gap-2.5">
                                                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                                                    <LayoutGrid className="h-4 w-4" />
                                                </span>

                                                <div className="min-w-0">
                                                    <p
                                                        className={classNames(
                                                            "truncate text-xs font-black",
                                                            ativo
                                                                ? "text-slate-900"
                                                                : "text-slate-500"
                                                        )}
                                                    >
                                                        {opcao.label}
                                                    </p>

                                                    <p className="mt-0.5 truncate text-[10px] font-medium text-slate-400">
                                                        {DESCRICOES_BLOCOS_DASHBOARD[
                                                            opcao.chave
                                                        ] || "Quadro do Dashboard SST"}
                                                    </p>
                                                </div>
                                            </div>

                                            <BotaoVisibilidadePainel
                                                ativo={ativo}
                                                onClick={() =>
                                                    alternarBlocoPainel(
                                                        opcao.chave
                                                    )
                                                }
                                            />

                                            <BotoesTamanhoPainel
                                                opcoes={
                                                    opcoesTamanhoBlocoDashboard
                                                }
                                                valorAtual={
                                                    tamanhoAtual
                                                }
                                                onChange={(tamanho) =>
                                                    alterarTamanhoBlocoPainel(
                                                        opcao.chave,
                                                        tamanho
                                                    )
                                                }
                                            />

                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        moverBlocoPainel(
                                                            opcao.chave,
                                                            -1
                                                        )
                                                    }
                                                    disabled={
                                                        indexCompleto === 0
                                                    }
                                                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
                                                    title="Mover para cima"
                                                >
                                                    <ArrowUp className="h-3.5 w-3.5" />
                                                </button>

                                                <span className="inline-flex h-7 min-w-10 items-center justify-center rounded-lg bg-white px-2 text-[10px] font-black tabular-nums text-slate-700 ring-1 ring-slate-200">
                                                    {indexQuadro + 1}
                                                </span>

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        moverBlocoPainel(
                                                            opcao.chave,
                                                            1
                                                        )
                                                    }
                                                    disabled={
                                                        indexCompleto ===
                                                        opcoesBlocosOrdenadasDashboard.length - 1
                                                    }
                                                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
                                                    title="Mover para baixo"
                                                >
                                                    <ArrowDown className="h-3.5 w-3.5" />
                                                </button>

                                                <span
                                                    draggable
                                                    onDragStart={(evento) => {
                                                        prepararArrastePainel(
                                                            evento
                                                        );

                                                        setBlocoArrastandoDashboard(
                                                            opcao.chave
                                                        );
                                                    }}
                                                    onDragEnd={() =>
                                                        setBlocoArrastandoDashboard(
                                                            null
                                                        )
                                                    }
                                                    className="inline-flex h-7 w-7 cursor-grab items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 active:cursor-grabbing"
                                                    title="Arraste para reordenar"
                                                >
                                                    <GripVertical className="h-4 w-4" />
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </section>
                )}

                <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-slate-50 text-slate-500 ring-1 ring-slate-200">
                            <Eye className="h-3.5 w-3.5" />
                        </span>

                        <span>
                            As alterações continuam sendo salvas automaticamente neste navegador.
                        </span>
                    </div>

                    <span className="inline-flex items-center rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-100">
                        Somente Personalizar painel
                    </span>
                </div>
            </div>
        </Card>
    );
}
