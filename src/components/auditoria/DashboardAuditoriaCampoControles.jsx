import { useState } from "react";
import {
    ArrowDown,
    ArrowUp,
    Eye,
    EyeOff,
    GripVertical,
    LayoutGrid,
    RotateCcw,
    Search,
    SlidersHorizontal,
} from "lucide-react";
import { Card } from "../commonComponents";
import { classNames } from "../../utils/sstUtils";

const SECOES_INDICADORES = {
    totalAuditorias: "Auditorias",
    auditoriasMes: "Auditorias",
    auditoriasAbertas: "Auditorias",
    auditoriasVencidas: "Auditorias",
    desviosCriticos: "Desvios",
    desviosAbertos: "Desvios",
    mediaConformidade: "Conformidade",
    auditoriasResolvidas: "Tratativas",
    auditoriasAVencer: "Prazos",
    auditoriasSemResponsavel: "Gestão",
    auditoriasSemPrazo: "Gestão",
    auditoriasComEvidencia: "Evidências",
};

const DESCRICOES_INDICADORES = {
    totalAuditorias: "Total de auditorias registradas",
    auditoriasMes: "Auditorias registradas no mês atual",
    auditoriasAbertas: "Auditorias em tratativa",
    auditoriasVencidas: "Auditorias com prazo vencido",
    desviosCriticos: "Desvios que exigem ação imediata",
    desviosAbertos: "Desvios ainda pendentes",
    mediaConformidade: "Média de conformidade do período",
    auditoriasResolvidas: "Tratativas já resolvidas, corrigidas ou concluídas",
    auditoriasAVencer: "Tratativas abertas com vencimento nos próximos 7 dias",
    auditoriasSemResponsavel: "Pendências abertas sem responsável definido",
    auditoriasSemPrazo: "Pendências abertas sem prazo de adequação",
    auditoriasComEvidencia: "Tratativas com evidência de correção registrada",
};

const DESCRICOES_QUADROS = {
    qrcodes: "QR Codes para máquinas, equipamentos e pontos de campo",
    historico: "Últimas auditorias registradas e filtros",
    resumoVisual: "Distribuição visual das auditorias",
    topDesvios: "Principais categorias de desvios registradas",
    empresas: "Ranking consolidado por empresa",
    areas: "Ranking consolidado por área e local",
    boasPraticas: "Registros positivos observados em campo",
};

function normalizarBusca(valor) {
    return String(valor || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

function obterSecao(chave) {
    return SECOES_INDICADORES[chave] || "Outros";
}

function obterDescricaoIndicador(chave) {
    return (
        DESCRICOES_INDICADORES[chave] ||
        "Indicador da Auditoria de Campo"
    );
}

function obterDescricaoQuadro(chave) {
    return (
        DESCRICOES_QUADROS[chave] ||
        "Quadro da Auditoria de Campo"
    );
}

function obterClasseSecao(secao) {
    if (secao === "Auditorias") {
        return "bg-blue-50 text-blue-700 ring-blue-100";
    }

    if (secao === "Desvios") {
        return "bg-rose-50 text-rose-700 ring-rose-100";
    }

    if (secao === "Conformidade") {
        return "bg-emerald-50 text-emerald-700 ring-emerald-100";
    }

    if (secao === "Tratativas") {
        return "bg-green-50 text-green-700 ring-green-100";
    }

    if (secao === "Prazos") {
        return "bg-amber-50 text-amber-700 ring-amber-100";
    }

    if (secao === "Gestão") {
        return "bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-100";
    }

    if (secao === "Evidências") {
        return "bg-cyan-50 text-cyan-700 ring-cyan-100";
    }

    return "bg-slate-50 text-slate-600 ring-slate-200";
}

function obterSiglaTamanho(chave) {
    if (chave === "medio") return "M";
    if (chave === "grande") return "G";
    if (chave === "destaque") return "D";

    return "P";
}

function ControleVisibilidade({
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

function ControleTamanho({
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
                        title={`${tamanho.label} · ${tamanho.descricao || ""}`}
                    >
                        {obterSiglaTamanho(tamanho.chave)}
                    </button>
                );
            })}
        </div>
    );
}

function ControleOrdem({
    index,
    total,
    onSubir,
    onDescer,
    onDragStart,
    onDragEnd,
}) {
    return (
        <div className="flex items-center gap-1.5">
            <button
                type="button"
                onClick={onSubir}
                disabled={index === 0}
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35"
                title="Mover para cima"
            >
                <ArrowUp className="h-3.5 w-3.5" />
            </button>

            <button
                type="button"
                onClick={onDescer}
                disabled={index === total - 1}
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35"
                title="Mover para baixo"
            >
                <ArrowDown className="h-3.5 w-3.5" />
            </button>

            <span
                draggable
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                className="inline-flex h-7 w-7 cursor-grab items-center justify-center rounded-lg bg-slate-50 text-slate-400 ring-1 ring-slate-200 active:cursor-grabbing"
                title="Segure e arraste"
            >
                <GripVertical className="h-3.5 w-3.5" />
            </span>
        </div>
    );
}

export function DashboardAuditoriaCampoControles({
    cartasOrdenadas = [],
    blocosOrdenados = [],
    cartasVisiveis,
    setCartasVisiveis,
    tamanhosCartas,
    setTamanhosCartas,
    setOrdemCartas,
    blocosVisiveis,
    setBlocosVisiveis,
    tamanhosBlocos,
    setTamanhosBlocos,
    setOrdemBlocos,
    cartasPadrao,
    tamanhosCartasPadrao,
    ordemCartasPadrao,
    blocosPadrao,
    tamanhosBlocosPadrao,
    ordemBlocosPadrao,
    opcoesTamanho = [],
    mover,
    prepararArrasteAuditoria,
    soltarCartaAuditoria,
    soltarBlocoAuditoria,
    cartaArrastandoAuditoria,
    setCartaArrastandoAuditoria,
    blocoArrastandoAuditoria,
    setBlocoArrastandoAuditoria,
}) {
    const [
        aba,
        setAba,
    ] = useState("indicadores");

    const [
        buscaIndicadores,
        setBuscaIndicadores,
    ] = useState("");

    const [
        filtroSecao,
        setFiltroSecao,
    ] = useState("todas");

    const [
        filtroIndicadores,
        setFiltroIndicadores,
    ] = useState("todos");

    const [
        buscaQuadros,
        setBuscaQuadros,
    ] = useState("");

    const [
        filtroQuadros,
        setFiltroQuadros,
    ] = useState("todos");

    const indicadores =
        Array.isArray(cartasOrdenadas)
            ? cartasOrdenadas
            : [];

    const quadros =
        Array.isArray(blocosOrdenados)
            ? blocosOrdenados
            : [];

    const secoes =
        Array.from(
            new Set(
                indicadores.map(
                    (item) =>
                        obterSecao(item.chave)
                )
            )
        );

    const indicadoresVisiveis =
        indicadores.filter(
            (item) =>
                cartasVisiveis[item.chave] !== false
        ).length;

    const quadrosVisiveis =
        quadros.filter(
            (item) =>
                blocosVisiveis[item.chave] !== false
        ).length;

    const totalVisiveis =
        indicadoresVisiveis +
        quadrosVisiveis;

    const totalItens =
        indicadores.length +
        quadros.length;

    const totalOcultos =
        Math.max(
            0,
            totalItens - totalVisiveis
        );

    const buscaIndicadoresNormalizada =
        normalizarBusca(buscaIndicadores);

    const indicadoresFiltrados =
        indicadores.filter((item) => {
            const secao =
                obterSecao(item.chave);

            const ativo =
                cartasVisiveis[item.chave] !== false;

            const combinaSecao =
                filtroSecao === "todas" ||
                filtroSecao === secao;

            const combinaStatus =
                filtroIndicadores === "todos" ||
                (
                    filtroIndicadores === "visiveis" &&
                    ativo
                ) ||
                (
                    filtroIndicadores === "ocultos" &&
                    !ativo
                );

            const texto =
                normalizarBusca(
                    `${item.label} ${obterDescricaoIndicador(item.chave)} ${secao}`
                );

            const combinaBusca =
                !buscaIndicadoresNormalizada ||
                texto.includes(
                    buscaIndicadoresNormalizada
                );

            return (
                combinaSecao &&
                combinaStatus &&
                combinaBusca
            );
        });

    const buscaQuadrosNormalizada =
        normalizarBusca(buscaQuadros);

    const quadrosFiltrados =
        quadros.filter((item) => {
            const ativo =
                blocosVisiveis[item.chave] !== false;

            const combinaStatus =
                filtroQuadros === "todos" ||
                (
                    filtroQuadros === "visiveis" &&
                    ativo
                ) ||
                (
                    filtroQuadros === "ocultos" &&
                    !ativo
                );

            const texto =
                normalizarBusca(
                    `${item.label} ${obterDescricaoQuadro(item.chave)}`
                );

            const combinaBusca =
                !buscaQuadrosNormalizada ||
                texto.includes(
                    buscaQuadrosNormalizada
                );

            return (
                combinaStatus &&
                combinaBusca
            );
        });

    const restaurarPadrao = () => {
        setCartasVisiveis(cartasPadrao);
        setTamanhosCartas(tamanhosCartasPadrao);
        setOrdemCartas(ordemCartasPadrao);
        setBlocosVisiveis(blocosPadrao);
        setTamanhosBlocos(tamanhosBlocosPadrao);
        setOrdemBlocos(ordemBlocosPadrao);
    };

    const gradeIndicadores = {
        gridTemplateColumns:
            "42px minmax(280px,1fr) 138px 142px 164px 164px",
    };

    const gradeQuadros = {
        gridTemplateColumns:
            "42px minmax(320px,1fr) 150px 164px 164px",
    };

    return (
        <Card className="mb-3 overflow-hidden border border-slate-200 bg-white p-0 shadow-sm">
            <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                    <div className="flex items-center gap-2">
                        <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                            <SlidersHorizontal className="h-4 w-4" />
                        </div>

                        <div>
                            <h2 className="text-base font-black tracking-tight text-slate-950">
                                Personalizar painel — Auditoria de Campo
                            </h2>

                            <p className="mt-0.5 text-xs text-slate-500">
                                Organize os indicadores e quadros sem alterar os dados das auditorias.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={restaurarPadrao}
                        className="inline-flex items-center gap-2 self-start rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
                    >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Restaurar padrão
                    </button>
                </div>
            </div>

            <div className="space-y-2.5 bg-slate-50/50 p-2.5 sm:p-3">
                <section className="rounded-xl border border-slate-200 bg-white p-2">
                    <div className="grid items-stretch gap-2 xl:grid-cols-3">
                        <div className="flex min-h-[58px] min-w-0 flex-col justify-center rounded-lg bg-white px-3 py-2 ring-1 ring-slate-200">
                            <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                                Resumo do seu painel
                            </span>

                            <div className="mt-1.5 flex min-w-0 flex-nowrap items-center gap-2 overflow-hidden text-[10px] font-semibold text-slate-600">
                                <span className="inline-flex shrink-0 items-center gap-1">
                                    <Eye className="h-3.5 w-3.5 text-emerald-600" />
                                    <strong className="text-xs font-black text-slate-950">
                                        {totalVisiveis}
                                    </strong>
                                    Visíveis
                                </span>

                                <span className="h-3 w-px shrink-0 bg-slate-200" />

                                <span className="inline-flex shrink-0 items-center gap-1">
                                    <EyeOff className="h-3.5 w-3.5 text-slate-500" />
                                    <strong className="text-xs font-black text-slate-950">
                                        {totalOcultos}
                                    </strong>
                                    Ocultos
                                </span>

                                <span className="h-3 w-px shrink-0 bg-slate-200" />

                                <span className="inline-flex shrink-0 items-center gap-1">
                                    <LayoutGrid className="h-3.5 w-3.5 text-blue-600" />
                                    <strong className="text-xs font-black text-slate-950">
                                        2
                                    </strong>
                                    Seções
                                </span>

                                <span className="h-3 w-px shrink-0 bg-slate-200" />

                                <span className="inline-flex min-w-0 items-center gap-1 whitespace-nowrap font-black text-slate-800">
                                    <SlidersHorizontal className="h-3.5 w-3.5" />
                                    Personalizado
                                </span>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() =>
                                setAba("indicadores")
                            }
                            className={classNames(
                                "min-h-[58px] rounded-lg px-3 py-2 text-left ring-1 transition",
                                aba === "indicadores"
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
                                setAba("quadros")
                            }
                            className={classNames(
                                "min-h-[58px] rounded-lg px-3 py-2 text-left ring-1 transition",
                                aba === "quadros"
                                    ? "bg-emerald-50 text-emerald-950 ring-emerald-200 shadow-sm hover:bg-emerald-100"
                                    : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
                            )}
                        >
                            <span className="block text-[10px] font-black uppercase tracking-[0.14em] opacity-70">
                                Quadros do painel
                            </span>

                            <span className="mt-0.5 block text-xs font-bold">
                                Blocos grandes da Auditoria de Campo
                            </span>
                        </button>
                    </div>
                </section>

                {aba === "indicadores" && (
                    <>
                        <section className="rounded-xl border border-slate-200 bg-white p-2.5">
                            <div className="grid gap-2 xl:grid-cols-[170px_170px_minmax(220px,1fr)_190px] xl:items-end">
                                <label className="block">
                                    <span className="mb-1 block text-[10px] font-black uppercase tracking-wide text-slate-500">
                                        Filtrar indicadores
                                    </span>

                                    <select
                                        value={filtroSecao}
                                        onChange={(evento) =>
                                            setFiltroSecao(
                                                evento.target.value
                                            )
                                        }
                                        className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-700 outline-none"
                                    >
                                        <option value="todas">
                                            Todas as seções
                                        </option>

                                        {secoes.map((secao) => (
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
                                        value={filtroIndicadores}
                                        onChange={(evento) =>
                                            setFiltroIndicadores(
                                                evento.target.value
                                            )
                                        }
                                        className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-700 outline-none"
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

                                    <span className="flex h-8 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5">
                                        <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />

                                        <input
                                            value={buscaIndicadores}
                                            onChange={(evento) =>
                                                setBuscaIndicadores(
                                                    evento.target.value
                                                )
                                            }
                                            placeholder="Buscar indicador..."
                                            className="min-w-0 flex-1 bg-transparent text-xs font-medium text-slate-700 outline-none"
                                        />
                                    </span>
                                </label>

                                <div>
                                    <span className="mb-1 block text-[10px] font-black uppercase tracking-wide text-slate-500">
                                        Ordenação
                                    </span>

                                    <div className="flex h-8 items-center justify-between rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-700">
                                        Ordem personalizada
                                        <GripVertical className="h-3.5 w-3.5 text-slate-400" />
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                            <div className="border-b border-slate-100 px-3 py-2.5">
                                <h3 className="text-sm font-black text-slate-950">
                                    Indicadores da Auditoria de Campo
                                </h3>

                                <p className="mt-0.5 text-xs text-slate-500">
                                    Altere visibilidade, tamanho e ordem dos indicadores.
                                </p>
                            </div>

                            <div className="overflow-x-auto">
                                <div className="min-w-[930px]">
                                    <div
                                        className="grid items-center gap-2 border-b border-slate-100 bg-slate-50 px-3 py-1.5 text-[9px] font-black uppercase tracking-wide text-slate-500"
                                        style={gradeIndicadores}
                                    >
                                        <span className="text-center">#</span>
                                        <span>Indicador</span>
                                        <span>Seção</span>
                                        <span>Visibilidade</span>
                                        <span>Tamanho</span>
                                        <span>Ordem</span>
                                    </div>

                                    {indicadoresFiltrados.map((item) => {
                                        const index =
                                            indicadores.findIndex(
                                                (opcao) =>
                                                    opcao.chave === item.chave
                                            );

                                        const ativo =
                                            cartasVisiveis[item.chave] !== false;

                                        const tamanho =
                                            tamanhosCartas[item.chave] ||
                                            "padrao";

                                        const secao =
                                            obterSecao(item.chave);

                                        const Icone =
                                            item.icon || LayoutGrid;

                                        return (
                                            <div
                                                key={item.chave}
                                                onDragOver={(evento) =>
                                                    evento.preventDefault()
                                                }
                                                onDrop={() =>
                                                    soltarCartaAuditoria(
                                                        item.chave
                                                    )
                                                }
                                                className={classNames(
                                                    "grid items-center gap-2 border-b border-slate-100 px-3 py-1.5 last:border-b-0",
                                                    ativo
                                                        ? "bg-white"
                                                        : "bg-slate-50/50",
                                                    cartaArrastandoAuditoria === item.chave
                                                        ? "opacity-60 ring-2 ring-inset ring-blue-200"
                                                        : ""
                                                )}
                                                style={gradeIndicadores}
                                            >
                                                <span className="text-center text-xs font-black text-slate-500">
                                                    {index + 1}
                                                </span>

                                                <div className="flex min-w-0 items-center gap-2.5">
                                                    <span
                                                        className={classNames(
                                                            "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ring-1",
                                                            obterClasseSecao(secao)
                                                        )}
                                                    >
                                                        <Icone className="h-4 w-4" />
                                                    </span>

                                                    <div className="min-w-0">
                                                        <p className="truncate text-xs font-black text-slate-900">
                                                            {item.label}
                                                        </p>

                                                        <p className="mt-0.5 truncate text-[10px] font-medium text-slate-400">
                                                            {obterDescricaoIndicador(
                                                                item.chave
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>

                                                <span
                                                    className={classNames(
                                                        "inline-flex w-fit rounded-full px-2.5 py-1 text-[10px] font-bold ring-1",
                                                        obterClasseSecao(secao)
                                                    )}
                                                >
                                                    {secao}
                                                </span>

                                                <ControleVisibilidade
                                                    ativo={ativo}
                                                    onClick={() =>
                                                        setCartasVisiveis(
                                                            (atual) => ({
                                                                ...atual,
                                                                [item.chave]:
                                                                    !ativo,
                                                            })
                                                        )
                                                    }
                                                />

                                                <ControleTamanho
                                                    opcoes={opcoesTamanho}
                                                    valorAtual={tamanho}
                                                    onChange={(novoTamanho) =>
                                                        setTamanhosCartas(
                                                            (atual) => ({
                                                                ...atual,
                                                                [item.chave]:
                                                                    novoTamanho,
                                                            })
                                                        )
                                                    }
                                                />

                                                <ControleOrdem
                                                    index={index}
                                                    total={indicadores.length}
                                                    onSubir={() =>
                                                        mover(
                                                            setOrdemCartas,
                                                            item.chave,
                                                            -1
                                                        )
                                                    }
                                                    onDescer={() =>
                                                        mover(
                                                            setOrdemCartas,
                                                            item.chave,
                                                            1
                                                        )
                                                    }
                                                    onDragStart={(evento) => {
                                                        prepararArrasteAuditoria(
                                                            evento
                                                        );
                                                        setCartaArrastandoAuditoria(
                                                            item.chave
                                                        );
                                                    }}
                                                    onDragEnd={() =>
                                                        setCartaArrastandoAuditoria(
                                                            null
                                                        )
                                                    }
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </section>
                    </>
                )}

                {aba === "quadros" && (
                    <>
                        <section className="rounded-xl border border-slate-200 bg-white p-2.5">
                            <div className="grid gap-2 xl:grid-cols-[180px_minmax(240px,1fr)_190px] xl:items-end">
                                <label className="block">
                                    <span className="mb-1 block text-[10px] font-black uppercase tracking-wide text-slate-500">
                                        Filtrar quadros
                                    </span>

                                    <select
                                        value={filtroQuadros}
                                        onChange={(evento) =>
                                            setFiltroQuadros(
                                                evento.target.value
                                            )
                                        }
                                        className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-700 outline-none"
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

                                    <span className="flex h-8 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5">
                                        <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />

                                        <input
                                            value={buscaQuadros}
                                            onChange={(evento) =>
                                                setBuscaQuadros(
                                                    evento.target.value
                                                )
                                            }
                                            placeholder="Buscar quadro..."
                                            className="min-w-0 flex-1 bg-transparent text-xs font-medium text-slate-700 outline-none"
                                        />
                                    </span>
                                </label>

                                <div>
                                    <span className="mb-1 block text-[10px] font-black uppercase tracking-wide text-slate-500">
                                        Ordenação
                                    </span>

                                    <div className="flex h-8 items-center justify-between rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-700">
                                        Ordem personalizada
                                        <GripVertical className="h-3.5 w-3.5 text-slate-400" />
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                            <div className="border-b border-slate-100 px-3 py-2.5">
                                <h3 className="text-sm font-black text-slate-950">
                                    Quadros da Auditoria de Campo
                                </h3>

                                <p className="mt-0.5 text-xs text-slate-500">
                                    Altere visibilidade, tamanho e ordem dos blocos grandes.
                                </p>
                            </div>

                            <div className="overflow-x-auto">
                                <div className="min-w-[820px]">
                                    <div
                                        className="grid items-center gap-2 border-b border-slate-100 bg-slate-50 px-3 py-1.5 text-[9px] font-black uppercase tracking-wide text-slate-500"
                                        style={gradeQuadros}
                                    >
                                        <span className="text-center">#</span>
                                        <span>Quadro</span>
                                        <span>Visibilidade</span>
                                        <span>Tamanho</span>
                                        <span>Ordem</span>
                                    </div>

                                    {quadrosFiltrados.map((item) => {
                                        const index =
                                            quadros.findIndex(
                                                (opcao) =>
                                                    opcao.chave === item.chave
                                            );

                                        const ativo =
                                            blocosVisiveis[item.chave] !== false;

                                        const tamanho =
                                            tamanhosBlocos[item.chave] ||
                                            "padrao";

                                        return (
                                            <div
                                                key={item.chave}
                                                onDragOver={(evento) =>
                                                    evento.preventDefault()
                                                }
                                                onDrop={() =>
                                                    soltarBlocoAuditoria(
                                                        item.chave
                                                    )
                                                }
                                                className={classNames(
                                                    "grid items-center gap-2 border-b border-slate-100 px-3 py-1.5 last:border-b-0",
                                                    ativo
                                                        ? "bg-white"
                                                        : "bg-slate-50/50",
                                                    blocoArrastandoAuditoria === item.chave
                                                        ? "opacity-60 ring-2 ring-inset ring-blue-200"
                                                        : ""
                                                )}
                                                style={gradeQuadros}
                                            >
                                                <span className="text-center text-xs font-black text-slate-500">
                                                    {index + 1}
                                                </span>

                                                <div className="flex min-w-0 items-center gap-2.5">
                                                    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100">
                                                        <LayoutGrid className="h-4 w-4" />
                                                    </span>

                                                    <div className="min-w-0">
                                                        <p className="truncate text-xs font-black text-slate-900">
                                                            {item.label}
                                                        </p>

                                                        <p className="mt-0.5 truncate text-[10px] font-medium text-slate-400">
                                                            {obterDescricaoQuadro(
                                                                item.chave
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>

                                                <ControleVisibilidade
                                                    ativo={ativo}
                                                    onClick={() =>
                                                        setBlocosVisiveis(
                                                            (atual) => ({
                                                                ...atual,
                                                                [item.chave]:
                                                                    !ativo,
                                                            })
                                                        )
                                                    }
                                                />

                                                <ControleTamanho
                                                    opcoes={opcoesTamanho}
                                                    valorAtual={tamanho}
                                                    onChange={(novoTamanho) =>
                                                        setTamanhosBlocos(
                                                            (atual) => ({
                                                                ...atual,
                                                                [item.chave]:
                                                                    novoTamanho,
                                                            })
                                                        )
                                                    }
                                                />

                                                <ControleOrdem
                                                    index={index}
                                                    total={quadros.length}
                                                    onSubir={() =>
                                                        mover(
                                                            setOrdemBlocos,
                                                            item.chave,
                                                            -1
                                                        )
                                                    }
                                                    onDescer={() =>
                                                        mover(
                                                            setOrdemBlocos,
                                                            item.chave,
                                                            1
                                                        )
                                                    }
                                                    onDragStart={(evento) => {
                                                        prepararArrasteAuditoria(
                                                            evento
                                                        );
                                                        setBlocoArrastandoAuditoria(
                                                            item.chave
                                                        );
                                                    }}
                                                    onDragEnd={() =>
                                                        setBlocoArrastandoAuditoria(
                                                            null
                                                        )
                                                    }
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </section>
                    </>
                )}
            </div>
        </Card>
    );
}