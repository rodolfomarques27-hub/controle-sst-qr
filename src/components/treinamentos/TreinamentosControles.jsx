import {
    ArrowDown,
    ArrowUp,
    Eye,
    EyeOff,
    GripVertical,
    LayoutGrid,
    RotateCcw,
    SlidersHorizontal,
} from "lucide-react";
import { Card } from "../commonComponents";

function obterSiglaTamanho(valor = "") {
    if (valor === "compacto") return "P";
    if (valor === "medio") return "M";
    if (valor === "largo") return "G";
    if (valor === "full") return "D";

    return "P";
}

function ControleEstado({
    aberto,
    onClick,
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="inline-flex min-w-[112px] items-center justify-center gap-2 rounded-xl px-1.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            title={
                aberto
                    ? "Recolher quadro"
                    : "Abrir quadro"
            }
        >
            <span
                className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition ${
                    aberto
                        ? "bg-emerald-500"
                        : "bg-slate-300"
                }`}
            >
                <span
                    className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                        aberto
                            ? "translate-x-4"
                            : "translate-x-0"
                    }`}
                />
            </span>

            <span className="whitespace-nowrap">
                {aberto
                    ? "Aberto"
                    : "Recolhido"}
            </span>
        </button>
    );
}

function ControleTamanho({
    opcoes = [],
    valorAtual,
    onChange,
}) {
    return (
        <div className="inline-flex items-center gap-1">
            {opcoes.map((tamanho) => {
                const selecionado =
                    valorAtual === tamanho.valor;

                return (
                    <button
                        key={tamanho.valor}
                        type="button"
                        onClick={() =>
                            onChange?.(
                                tamanho.valor
                            )
                        }
                        aria-pressed={selecionado}
                        className={
                            selecionado
                                ? "inline-flex h-7 min-w-7 items-center justify-center rounded-lg bg-slate-950 px-2 text-[10px] font-black text-white ring-1 ring-slate-950 shadow-sm"
                                : "inline-flex h-7 min-w-7 items-center justify-center rounded-lg bg-white px-2 text-[10px] font-black text-slate-500 ring-1 ring-slate-200 transition hover:bg-slate-50 hover:text-slate-800"
                        }
                        title={`${tamanho.label} · ${tamanho.descricao || ""}`}
                    >
                        {obterSiglaTamanho(
                            tamanho.valor
                        )}
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

export function TreinamentosControles({
    opcoesPainelTreinamentos = [],
    cardsRecolhidos = {},
    layoutCards = {
        ordem: [],
        tamanhos: {},
    },
    tamanhosPadrao = {},
    opcoesTamanho = [],
    onAlternarCard,
    onMoverCard,
    onAlterarTamanho,
    onAbrirTodos,
    onRecolherTodos,
    onRestaurarPadrao,
    onIniciarArrasto,
    onSoltarCard,
    cardArrastando = "",
    cardDestino = "",
    setCardArrastando,
    setCardDestino,
}) {
    const ordem =
        Array.isArray(layoutCards?.ordem)
            ? layoutCards.ordem
            : [];

    const itensOrdenados =
        ordem
            .map((chave) =>
                opcoesPainelTreinamentos.find(
                    (item) =>
                        item.chave === chave
                )
            )
            .filter(Boolean);

    const totalQuadros =
        itensOrdenados.length;

    const totalRecolhidos =
        itensOrdenados.filter(
            (item) =>
                cardsRecolhidos?.[
                    item.chave
                ] === true
        ).length;

    const totalAbertos =
        Math.max(
            0,
            totalQuadros -
                totalRecolhidos
        );

    const gradeQuadros = {
        gridTemplateColumns:
            "42px minmax(320px,1fr) 150px 164px 164px",
    };

    return (
        <Card className="mb-5 overflow-hidden border border-slate-200 bg-white p-0 shadow-sm">
            <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                            <SlidersHorizontal className="h-4 w-4" />
                        </div>

                        <div className="min-w-0">
                            <h2 className="text-base font-black tracking-tight text-slate-950">
                                Personalizar painel — Treinamentos e certificados
                            </h2>

                            <p className="mt-0.5 text-xs leading-5 text-slate-500">
                                Organize a ordem, abertura e tamanho dos quadros sem alterar os dados dos certificados.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={onAbrirTodos}
                            className="inline-flex h-8 items-center justify-center rounded-xl bg-white px-3 text-xs font-bold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
                        >
                            Abrir todos
                        </button>

                        <button
                            type="button"
                            onClick={onRecolherTodos}
                            className="inline-flex h-8 items-center justify-center rounded-xl bg-white px-3 text-xs font-bold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
                        >
                            Recolher todos
                        </button>

                        <button
                            type="button"
                            onClick={onRestaurarPadrao}
                            className="inline-flex h-8 items-center gap-2 rounded-xl bg-white px-3 text-xs font-bold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
                        >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Restaurar padrão
                        </button>
                    </div>
                </div>
            </div>

            <div className="space-y-4 p-4 sm:p-5">
                <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5">
                    <div className="mb-3 flex items-center justify-center gap-2 text-center">
                        <LayoutGrid className="h-4 w-4 text-slate-500" />

                        <div>
                            <span className="block text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                                Resumo do seu painel
                            </span>

                            <span className="mt-0.5 block text-xs text-slate-500">
                                Estado atual dos quadros principais.
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        <div className="flex min-h-[64px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-center">
                            <span className="block text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                                Quadros
                            </span>

                            <strong className="mt-1 block text-xl font-black leading-none text-slate-950">
                                {totalQuadros}
                            </strong>

                            <span className="mt-1 block text-[11px] text-slate-500">
                                configurados
                            </span>
                        </div>

                        <div className="flex min-h-[64px] flex-col items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-2.5 text-center">
                            <span className="block text-[10px] font-black uppercase tracking-[0.12em] text-emerald-600">
                                Abertos
                            </span>

                            <strong className="mt-1 block text-xl font-black leading-none text-emerald-800">
                                {totalAbertos}
                            </strong>

                            <span className="mt-1 block text-[11px] text-emerald-700/80">
                                exibindo conteúdo
                            </span>
                        </div>

                        <div className="flex min-h-[64px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-center">
                            <span className="block text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
                                Recolhidos
                            </span>

                            <strong className="mt-1 block text-xl font-black leading-none text-slate-700">
                                {totalRecolhidos}
                            </strong>

                            <span className="mt-1 block text-[11px] text-slate-500">
                                conteúdo fechado
                            </span>
                        </div>
                    </div>
                </section>

                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <div className="border-b border-slate-100 px-3 py-2.5">
                        <h3 className="text-sm font-black text-slate-950">
                            Quadros de Treinamentos e Certificados
                        </h3>

                        <p className="mt-0.5 text-xs text-slate-500">
                            Altere estado, tamanho e ordem dos quadros.
                        </p>
                    </div>

                    <div className="overflow-x-auto">
                        <div className="min-w-[820px]">
                            <div
                                className="grid items-center gap-2 border-b border-slate-100 bg-slate-50 px-3 py-1.5 text-[9px] font-black uppercase tracking-wide text-slate-500"
                                style={gradeQuadros}
                            >
                                <span className="text-center">
                                    #
                                </span>

                                <span>
                                    Quadro
                                </span>

                                <span className="text-center">
                                    Estado
                                </span>

                                <span className="text-center">
                                    Tamanho
                                </span>

                                <span className="text-center">
                                    Ordem
                                </span>
                            </div>

                            {itensOrdenados.map(
                                (item) => {
                                    const index =
                                        ordem.indexOf(
                                            item.chave
                                        );

                                    const aberto =
                                        cardsRecolhidos?.[
                                            item.chave
                                        ] !== true;

                                    const tamanhoAtual =
                                        layoutCards
                                            ?.tamanhos?.[
                                                item.chave
                                            ] ||
                                        tamanhosPadrao?.[
                                            item.chave
                                        ] ||
                                        "medio";

                                    const arrastando =
                                        cardArrastando ===
                                        item.chave;

                                    const destino =
                                        cardDestino ===
                                            item.chave &&
                                        cardArrastando !==
                                            item.chave;

                                    return (
                                        <div
                                            key={
                                                item.chave
                                            }
                                            onDragOver={(
                                                evento
                                            ) => {
                                                evento.preventDefault();

                                                setCardDestino?.(
                                                    item.chave
                                                );
                                            }}
                                            onDragLeave={() =>
                                                setCardDestino?.(
                                                    ""
                                                )
                                            }
                                            onDrop={(
                                                evento
                                            ) =>
                                                onSoltarCard?.(
                                                    evento,
                                                    item.chave
                                                )
                                            }
                                            className={`grid items-center gap-2 border-b border-slate-100 px-3 py-1.5 last:border-b-0 ${
                                                aberto
                                                    ? "bg-white"
                                                    : "bg-slate-50/50"
                                            } ${
                                                arrastando
                                                    ? "opacity-60 ring-2 ring-inset ring-blue-200"
                                                    : destino
                                                        ? "bg-blue-50/60 ring-2 ring-inset ring-blue-100"
                                                        : ""
                                            }`}
                                            style={
                                                gradeQuadros
                                            }
                                        >
                                            <span className="text-center text-xs font-black text-slate-500">
                                                {index +
                                                    1}
                                            </span>

                                            <div className="flex min-w-0 items-center gap-2.5">
                                                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100">
                                                    <LayoutGrid className="h-4 w-4" />
                                                </span>

                                                <div className="min-w-0">
                                                    <p className="truncate text-xs font-black text-slate-900">
                                                        {
                                                            item.titulo
                                                        }
                                                    </p>

                                                    <p className="mt-0.5 truncate text-[10px] font-medium text-slate-400">
                                                        {
                                                            item.descricao
                                                        }
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-center">
                                                <ControleEstado
                                                    aberto={
                                                        aberto
                                                    }
                                                    onClick={() =>
                                                        onAlternarCard?.(
                                                            item.chave
                                                        )
                                                    }
                                                />
                                            </div>

                                            <div className="flex items-center justify-center">
                                                <ControleTamanho
                                                    opcoes={
                                                        opcoesTamanho
                                                    }
                                                    valorAtual={
                                                        tamanhoAtual
                                                    }
                                                    onChange={(
                                                        novoTamanho
                                                    ) =>
                                                        onAlterarTamanho?.(
                                                            item.chave,
                                                            novoTamanho
                                                        )
                                                    }
                                                />
                                            </div>

                                            <div className="flex items-center justify-center">
                                                <ControleOrdem
                                                    index={
                                                        index
                                                    }
                                                    total={
                                                        ordem.length
                                                    }
                                                    onSubir={() =>
                                                        onMoverCard?.(
                                                            item.chave,
                                                            -1
                                                        )
                                                    }
                                                    onDescer={() =>
                                                        onMoverCard?.(
                                                            item.chave,
                                                            1
                                                        )
                                                    }
                                                    onDragStart={(
                                                        evento
                                                    ) =>
                                                        onIniciarArrasto?.(
                                                            evento,
                                                            item.chave
                                                        )
                                                    }
                                                    onDragEnd={() => {
                                                        setCardArrastando?.(
                                                            ""
                                                        );

                                                        setCardDestino?.(
                                                            ""
                                                        );
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    );
                                }
                            )}
                        </div>
                    </div>
                </section>
            </div>
        </Card>
    );
}
