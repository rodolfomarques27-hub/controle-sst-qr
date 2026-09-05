import {
    ArrowDown,
    ArrowUp,
    GripVertical,
    LayoutGrid,
    RotateCcw,
} from "lucide-react";

const OPCOES_TAMANHO_CONFIGURACOES = [
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

function ControleAlternancia({
    ativo,
    rotuloAtivo,
    rotuloInativo,
    onClick,
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={ativo}
            className="inline-flex min-w-[116px] items-center justify-center gap-2 rounded-xl px-1.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
        >
            <span
                className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition ${
                    ativo
                        ? "bg-emerald-500"
                        : "bg-slate-300"
                }`}
            >
                <span
                    className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                        ativo
                            ? "translate-x-4"
                            : "translate-x-0"
                    }`}
                />
            </span>

            <span className="whitespace-nowrap">
                {ativo
                    ? rotuloAtivo
                    : rotuloInativo}
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
            {OPCOES_TAMANHO_CONFIGURACOES.map(
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

export function ConfiguracoesSistemaControles({
    secoes = [],
    obterVisibilidade,
    obterRecolhido,
    obterTamanho,
    onAlternarVisibilidade,
    onAlternarEstado,
    onAlterarTamanho,
    onMover,
    onAbrirTodos,
    onRecolherTodos,
    onRestaurarPadrao,
}) {
    const gradeQuadros = {
        gridTemplateColumns:
            "42px minmax(340px,1fr) 150px 150px 164px 150px",
    };

    const reordenarPorArraste = (
        chaveOrigem,
        indiceDestino
    ) => {
        const indiceOrigem =
            secoes.findIndex(
                (secao) =>
                    secao.chave ===
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

        const direcao =
            indiceDestino >
            indiceOrigem
                ? 1
                : -1;

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
            onMover?.(
                chaveOrigem,
                direcao
            );
        }
    };

    return (
        <div className="mb-6 mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-3 py-2.5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h2 className="text-sm font-black text-slate-950">
                            Personalizar painel de Configurações
                        </h2>

                        <p className="mt-0.5 text-xs text-slate-500">
                            Ajuste visibilidade, abertura, tamanho e ordem dos quadros.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={
                                onAbrirTodos
                            }
                            className="inline-flex h-8 items-center justify-center rounded-xl bg-white px-3 text-xs font-bold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
                        >
                            Abrir todos
                        </button>

                        <button
                            type="button"
                            onClick={
                                onRecolherTodos
                            }
                            className="inline-flex h-8 items-center justify-center rounded-xl bg-white px-3 text-xs font-bold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
                        >
                            Recolher todos
                        </button>

                        <button
                            type="button"
                            onClick={
                                onRestaurarPadrao
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
                <div className="min-w-[1120px]">
                    <div
                        className="grid items-center gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2 text-[9px] font-black uppercase tracking-wide text-slate-500"
                        style={
                            gradeQuadros
                        }
                    >
                        <span className="text-center">
                            #
                        </span>

                        <span>
                            Quadro
                        </span>

                        <span className="text-center">
                            Visibilidade
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

                    {secoes.map(
                        (
                            secao,
                            indice
                        ) => {
                            const Icon =
                                secao.icon ||
                                LayoutGrid;

                            const visivel =
                                obterVisibilidade?.(
                                    secao.chave
                                ) !== false;

                            const recolhido =
                                obterRecolhido?.(
                                    secao.chave
                                ) === true;

                            const tamanhoAtual =
                                obterTamanho?.(
                                    secao.chave
                                ) ||
                                "padrao";

                            return (
                                <div
                                    key={
                                        secao.chave
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
                                        visivel &&
                                        !recolhido
                                            ? "bg-white"
                                            : "bg-slate-50/50"
                                    }`}
                                    style={
                                        gradeQuadros
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
                                                    secao.titulo
                                                }
                                            </p>

                                            <p className="mt-0.5 truncate text-[10px] font-medium text-slate-400">
                                                {
                                                    secao.descricao
                                                }
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-center">
                                        <ControleAlternancia
                                            ativo={
                                                visivel
                                            }
                                            rotuloAtivo="Visível"
                                            rotuloInativo="Oculto"
                                            onClick={() =>
                                                onAlternarVisibilidade?.(
                                                    secao.chave
                                                )
                                            }
                                        />
                                    </div>

                                    <div className="flex items-center justify-center">
                                        <ControleAlternancia
                                            ativo={
                                                !recolhido
                                            }
                                            rotuloAtivo="Aberto"
                                            rotuloInativo="Recolhido"
                                            onClick={() =>
                                                onAlternarEstado?.(
                                                    secao.chave
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
                                                onAlterarTamanho?.(
                                                    secao.chave,
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
                                            secoes.length
                                        }
                                        onSubir={() =>
                                            onMover?.(
                                                secao.chave,
                                                -1
                                            )
                                        }
                                        onDescer={() =>
                                            onMover?.(
                                                secao.chave,
                                                1
                                            )
                                        }
                                        onDragStart={(
                                            evento
                                        ) => {
                                            evento.dataTransfer?.setData(
                                                "text/plain",
                                                secao.chave
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
