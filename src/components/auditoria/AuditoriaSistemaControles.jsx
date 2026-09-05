import {
    ArrowDown,
    ArrowUp,
    GripVertical,
    LayoutGrid,
    RotateCcw,
} from "lucide-react";

const OPCOES_TAMANHO_AUDITORIA = [
    {
        valor: "padrao",
        sigla: "P",
        label: "Padrão",
    },
    {
        valor: "medio",
        sigla: "M",
        label: "Médio",
    },
    {
        valor: "grande",
        sigla: "G",
        label: "Grande",
    },
    {
        valor: "destaque",
        sigla: "D",
        label: "Destaque",
    },
];

function ordenarItens(
    itens = [],
    ordem = []
) {
    return [
        ...ordem
            .map((chave) =>
                itens.find(
                    (item) =>
                        item.chave ===
                        chave
                )
            )
            .filter(Boolean),

        ...itens.filter(
            (item) =>
                !ordem.includes(
                    item.chave
                )
        ),
    ];
}

function ControleVisibilidade({
    visivel,
    onClick,
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={visivel}
            className="inline-flex min-w-[116px] items-center justify-center gap-2 rounded-xl px-1.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
        >
            <span
                className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition ${
                    visivel
                        ? "bg-emerald-500"
                        : "bg-slate-300"
                }`}
            >
                <span
                    className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                        visivel
                            ? "translate-x-4"
                            : "translate-x-0"
                    }`}
                />
            </span>

            <span className="whitespace-nowrap">
                {visivel
                    ? "Visível"
                    : "Oculto"}
            </span>
        </button>
    );
}

function ControleTamanho({
    valorAtual,
    onChange,
}) {
    return (
        <div className="inline-flex items-center gap-1">
            {OPCOES_TAMANHO_AUDITORIA.map(
                (opcao) => {
                    const selecionado =
                        valorAtual ===
                        opcao.valor;

                    return (
                        <button
                            key={opcao.valor}
                            type="button"
                            onClick={() =>
                                onChange?.(
                                    opcao.valor
                                )
                            }
                            aria-pressed={
                                selecionado
                            }
                            title={opcao.label}
                            className={
                                selecionado
                                    ? "inline-flex h-7 min-w-7 items-center justify-center rounded-lg bg-slate-950 px-2 text-[10px] font-black text-white ring-1 ring-slate-950 shadow-sm"
                                    : "inline-flex h-7 min-w-7 items-center justify-center rounded-lg bg-white px-2 text-[10px] font-black text-slate-500 ring-1 ring-slate-200 transition hover:bg-slate-50 hover:text-slate-800"
                            }
                        >
                            {opcao.sigla}
                        </button>
                    );
                }
            )}
        </div>
    );
}

function ControleOrdem({
    indice,
    total,
    onSubir,
    onDescer,
    onDragStart,
}) {
    return (
        <div className="flex items-center justify-center gap-1.5">
            <button
                type="button"
                onClick={onSubir}
                disabled={indice === 0}
                title="Mover para cima"
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35"
            >
                <ArrowUp className="h-3.5 w-3.5" />
            </button>

            <button
                type="button"
                onClick={onDescer}
                disabled={
                    indice ===
                    total - 1
                }
                title="Mover para baixo"
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35"
            >
                <ArrowDown className="h-3.5 w-3.5" />
            </button>

            <span
                draggable
                onDragStart={onDragStart}
                title="Segure e arraste"
                className="inline-flex h-7 w-7 cursor-grab items-center justify-center rounded-lg bg-slate-50 text-slate-400 ring-1 ring-slate-200 active:cursor-grabbing"
            >
                <GripVertical className="h-3.5 w-3.5" />
            </span>
        </div>
    );
}

export function AuditoriaSistemaControles({
    aba = "cartas",
    onAlterarAba,
    cartas = [],
    ordemCartas = [],
    visibilidadeCartas = {},
    tamanhosCartas = {},
    blocos = [],
    ordemBlocos = [],
    visibilidadeBlocos = {},
    tamanhosBlocos = {},
    onAlternarCarta,
    onAlterarTamanhoCarta,
    onMoverCarta,
    onAlternarBloco,
    onAlterarTamanhoBloco,
    onMoverBloco,
    onRestaurar,
}) {
    const exibindoCartas =
        aba === "cartas";

    const itens =
        ordenarItens(
            exibindoCartas
                ? cartas
                : blocos,
            exibindoCartas
                ? ordemCartas
                : ordemBlocos
        );

    const visibilidade =
        exibindoCartas
            ? visibilidadeCartas
            : visibilidadeBlocos;

    const tamanhos =
        exibindoCartas
            ? tamanhosCartas
            : tamanhosBlocos;

    const alternar =
        exibindoCartas
            ? onAlternarCarta
            : onAlternarBloco;

    const alterarTamanho =
        exibindoCartas
            ? onAlterarTamanhoCarta
            : onAlterarTamanhoBloco;

    const mover =
        exibindoCartas
            ? onMoverCarta
            : onMoverBloco;

    const tamanhoPadrao =
        exibindoCartas
            ? "padrao"
            : "destaque";

    const gradeItens = {
        gridTemplateColumns:
            "42px minmax(340px,1fr) 170px 164px 150px",
    };

    const reordenarPorArraste = (
        chaveOrigem,
        indiceDestino
    ) => {
        const indiceOrigem =
            itens.findIndex(
                (item) =>
                    item.chave ===
                    chaveOrigem
            );

        if (
            indiceOrigem < 0 ||
            indiceDestino < 0 ||
            indiceOrigem ===
                indiceDestino
        ) {
            return;
        }

        const subir =
            indiceDestino <
            indiceOrigem;

        const quantidade =
            Math.abs(
                indiceDestino -
                    indiceOrigem
            );

        for (
            let passo = 0;
            passo < quantidade;
            passo += 1
        ) {
            mover?.(
                chaveOrigem,
                subir
                    ? "cima"
                    : "baixo"
            );
        }
    };

    return (
        <div className="mb-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-3 py-2.5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h2 className="text-sm font-black text-slate-950">
                            Personalizar painel da Auditoria do sistema
                        </h2>

                        <p className="mt-0.5 text-xs text-slate-500">
                            Ajuste visibilidade, tamanho e ordem dos itens da Auditoria.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <div className="inline-flex rounded-xl bg-slate-100 p-1">
                            <button
                                type="button"
                                onClick={() =>
                                    onAlterarAba?.(
                                        "cartas"
                                    )
                                }
                                className={
                                    exibindoCartas
                                        ? "rounded-lg bg-slate-950 px-3 py-1.5 text-xs font-black text-white shadow-sm"
                                        : "rounded-lg px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-white"
                                }
                            >
                                Cartas principais
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    onAlterarAba?.(
                                        "blocos"
                                    )
                                }
                                className={
                                    !exibindoCartas
                                        ? "rounded-lg bg-slate-950 px-3 py-1.5 text-xs font-black text-white shadow-sm"
                                        : "rounded-lg px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-white"
                                }
                            >
                                Organização dos quadros
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={
                                onRestaurar
                            }
                            className="inline-flex h-8 items-center gap-2 rounded-xl bg-white px-3 text-xs font-bold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
                        >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Restaurar padrão
                        </button>
                    </div>
                </div>
            </div>
            <div className="overflow-x-auto">
                <div className="min-w-[900px]">
                    <div
                        className="grid items-center gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2 text-[9px] font-black uppercase tracking-wide text-slate-500"
                        style={
                            gradeItens
                        }
                    >
                        <span className="text-center">
                            #
                        </span>

                        <span>
                            {exibindoCartas
                                ? "Carta"
                                : "Quadro"}
                        </span>

                        <span className="text-center">
                            Visibilidade
                        </span>

                        <span className="text-center">
                            Tamanho
                        </span>

                        <span className="text-center">
                            Ordem
                        </span>
                    </div>

                    {itens.map(
                        (
                            item,
                            indice
                        ) => {
                            const Icon =
                                item.icon ||
                                LayoutGrid;

                            const visivel =
                                visibilidade?.[
                                    item.chave
                                ] !== false;

                            const tamanhoAtual =
                                tamanhos?.[
                                    item.chave
                                ] ||
                                tamanhoPadrao;

                            return (
                                <div
                                    key={
                                        item.chave
                                    }
                                    onDragOver={(
                                        evento
                                    ) => {
                                        evento.preventDefault();

                                        if (
                                            evento.dataTransfer
                                        ) {
                                            evento.dataTransfer.dropEffect =
                                                "move";
                                        }
                                    }}
                                    onDrop={(
                                        evento
                                    ) => {
                                        evento.preventDefault();

                                        const chaveOrigem =
                                            evento.dataTransfer?.getData(
                                                "text/plain"
                                            ) ||
                                            "";

                                        reordenarPorArraste(
                                            chaveOrigem,
                                            indice
                                        );
                                    }}
                                    className={`grid items-center gap-2 border-b border-slate-100 px-3 py-2 last:border-b-0 ${
                                        visivel
                                            ? "bg-white"
                                            : "bg-slate-50/60"
                                    }`}
                                    style={
                                        gradeItens
                                    }
                                >
                                    <span className="text-center text-xs font-black text-slate-500">
                                        {indice +
                                            1}
                                    </span>

                                    <div className="flex min-w-0 items-center gap-2.5">
                                        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                                            <Icon className="h-4 w-4" />
                                        </span>

                                        <div className="min-w-0">
                                            <p className="truncate text-xs font-black text-slate-900">
                                                {
                                                    item.titulo
                                                }
                                            </p>

                                            <p className="mt-0.5 truncate text-[10px] font-medium text-slate-400">
                                                {item.detalhe ||
                                                    (exibindoCartas
                                                        ? "Carta principal da Auditoria do Sistema."
                                                        : "Quadro operacional da Auditoria do Sistema.")}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-center">
                                        <ControleVisibilidade
                                            visivel={
                                                visivel
                                            }
                                            onClick={() =>
                                                alternar?.(
                                                    item.chave
                                                )
                                            }
                                        />
                                    </div>

                                    <div className="flex items-center justify-center">
                                        <ControleTamanho
                                            valorAtual={
                                                tamanhoAtual
                                            }
                                            onChange={(
                                                valor
                                            ) =>
                                                alterarTamanho?.(
                                                    item.chave,
                                                    valor
                                                )
                                            }
                                        />
                                    </div>

                                    <ControleOrdem
                                        indice={
                                            indice
                                        }
                                        total={
                                            itens.length
                                        }
                                        onSubir={() =>
                                            mover?.(
                                                item.chave,
                                                "cima"
                                            )
                                        }
                                        onDescer={() =>
                                            mover?.(
                                                item.chave,
                                                "baixo"
                                            )
                                        }
                                        onDragStart={(
                                            evento
                                        ) => {
                                            evento.dataTransfer?.setData(
                                                "text/plain",
                                                item.chave
                                            );

                                            if (
                                                evento.dataTransfer
                                            ) {
                                                evento.dataTransfer.effectAllowed =
                                                    "move";
                                            }
                                        }}
                                    />
                                </div>
                            );
                        }
                    )}
                </div>
            </div>
        </div>
    );
}
