import {
    useMemo,
    useState,
} from "react";

import heroRelatorioPendenciasUrl from "../../assets/heroes/relatorios/hero-pendencias-treinamentos-obras-v1.png";

export function RelatorioPendenciasTreinamentosFiltrosModal({
    empresas = [],
    classificacoes = [],
    onFechar = () => {},
    onGerar = async () => true,
}) {
    const [busca, setBusca] =
        useState("");

    const [empresa, setEmpresa] =
        useState("Todas");

    const [classificacao, setClassificacao] =
        useState("Todos");

    const [gerando, setGerando] =
        useState(false);

    const [erro, setErro] =
        useState("");

    const aguardarPinturaInterface =
        () =>
            new Promise(
                (resolve) => {
                    if (
                        typeof window === "undefined" ||
                        typeof window.requestAnimationFrame !== "function"
                    ) {
                        setTimeout(resolve, 0);
                        return;
                    }

                    window.requestAnimationFrame(
                        () => {
                            window.requestAnimationFrame(
                                resolve
                            );
                        }
                    );
                }
            );

    const empresasDisponiveis =
        useMemo(
            () => {
                const nomes =
                    (
                        Array.isArray(empresas)
                            ? empresas
                            : []
                    )
                        .map(
                            (valor) =>
                                String(
                                    valor || ""
                                ).trim()
                        )
                        .filter(
                            (valor) =>
                                valor &&
                                valor.toLocaleLowerCase(
                                    "pt-BR"
                                ) !==
                                    "todas"
                        );

                return [
                    "Todas",
                    ...Array.from(
                        new Set(nomes)
                    ).sort(
                        (a, b) =>
                            a.localeCompare(
                                b,
                                "pt-BR",
                                {
                                    sensitivity:
                                        "base",
                                }
                            )
                    ),
                ];
            },
            [empresas]
        );

    const classificacoesDisponiveis =
        useMemo(
            () => {
                const opcoes =
                    (
                        Array.isArray(classificacoes)
                            ? classificacoes
                            : []
                    )
                        .map(
                            (valor) =>
                                String(
                                    valor || ""
                                ).trim()
                        )
                        .filter(
                            (valor) =>
                                valor &&
                                valor.toLocaleLowerCase(
                                    "pt-BR"
                                ) !==
                                    "todos"
                        );

                return [
                    "Todos",
                    ...Array.from(
                        new Set(opcoes)
                    ),
                ];
            },
            [classificacoes]
        );

    const limparFiltros =
        () => {
            if (gerando) {
                return;
            }

            setBusca("");
            setEmpresa("Todas");
            setClassificacao("Todos");
            setErro("");
        };

    const gerarRelatorio =
        async (evento) => {
            evento.preventDefault();

            if (gerando) {
                return;
            }

            setGerando(true);
            setErro("");

            try {
                await aguardarPinturaInterface();

                const resultado =
                    await onGerar({
                        busca:
                            busca.trim(),

                        empresa,

                        classificacao,
                    });

                if (resultado === false) {
                    setErro(
                        "Nenhuma pendência encontrada para os filtros selecionados."
                    );

                    return;
                }

                onFechar();
            }
            catch (error) {
                console.error(
                    "Erro ao gerar relatório de pendências:",
                    error
                );

                setErro(
                    "Não foi possível gerar o relatório. Revise os filtros e tente novamente."
                );
            }
            finally {
                setGerando(false);
            }
        };

    return (
        <div
            className="
                fixed
                inset-0
                z-[120]
                flex
                items-center
                justify-center
                bg-slate-950/60
                px-4
                py-6
                backdrop-blur-sm
            "
        >
            <form
                role="dialog"
                aria-modal="true"
                aria-labelledby="titulo-filtros-relatorio-pendencias"
                aria-busy={gerando}
                onSubmit={gerarRelatorio}
                className="
                    w-full
                    max-w-2xl
                    overflow-hidden
                    rounded-[28px]
                    border
                    border-slate-200
                    bg-white
                    shadow-2xl
                "
            >
                <header
                    className="
                        relative
                        overflow-hidden
                        border-b
                        border-slate-800
                        bg-slate-950
                        px-6
                        py-4
                    "
                >
                    <img
                        src={heroRelatorioPendenciasUrl}
                        alt=""
                        aria-hidden="true"
                        className="
                            pointer-events-none
                            absolute
                            inset-0
                            h-full
                            w-full
                            object-cover
                            object-center
                            opacity-55
                        "
                    />

                    <div
                        aria-hidden="true"
                        className="
                            pointer-events-none
                            absolute
                            inset-0
                            bg-gradient-to-r
                            from-slate-950
                            via-slate-950/90
                            to-orange-950/55
                        "
                    />

                    <div
                        className="
                            relative
                            z-10
                            flex
                            items-start
                            justify-between
                            gap-5
                        "
                    >
                        <div>
                            <p
                                className="
                                    text-[11px]
                                    font-black
                                    uppercase
                                    tracking-[0.18em]
                                    text-orange-300
                                "
                            >
                                Relatório SST
                            </p>

                            <h2
                                id="titulo-filtros-relatorio-pendencias"
                                className="
                                    mt-1
                                    text-xl
                                    font-black
                                    tracking-tight
                                    text-white
                                "
                            >
                                Pendências de Treinamentos
                            </h2>

                            <p
                                className="
                                    mt-1.5
                                    max-w-xl
                                    text-sm
                                    font-medium
                                    leading-5
                                    text-slate-300
                                "
                            >
                                Selecione os filtros para definir quais
                                pendências serão incluídas no relatório.
                            </p>
                        </div>

                        <button
                            type="button"
                            aria-label="Fechar filtros do relatório de pendências"
                            disabled={gerando}
                            onClick={onFechar}
                            className="
                                inline-flex
                                h-10
                                w-10
                                shrink-0
                                items-center
                                justify-center
                                rounded-2xl
                                border
                                border-white/15
                                bg-white/10
                                text-lg
                                font-black
                                text-slate-200
                                transition
                                hover:bg-white/15
                                disabled:cursor-not-allowed
                                disabled:opacity-50
                            "
                        >
                            ×
                        </button>
                    </div>
                </header>

                <div
                    className="
                        space-y-5
                        px-6
                        py-6
                    "
                >
                    <div>
                        <label
                            htmlFor="relatorio-pendencias-filtro-busca"
                            className="
                                mb-2
                                block
                                text-xs
                                font-black
                                uppercase
                                tracking-wide
                                text-slate-600
                            "
                        >
                            Busca
                        </label>

                        <input
                            id="relatorio-pendencias-filtro-busca"
                            type="text"
                            value={busca}
                            autoFocus
                            placeholder="Nome, empresa, função, matrícula ou código"
                            onChange={(evento) =>
                                setBusca(
                                    evento.target.value
                                )
                            }
                            className="
                                w-full
                                rounded-2xl
                                border
                                border-slate-200
                                bg-white
                                px-4
                                py-3
                                text-sm
                                font-semibold
                                text-slate-800
                                outline-none
                                transition
                                placeholder:font-medium
                                placeholder:text-slate-400
                                focus:border-orange-400
                                focus:ring-4
                                focus:ring-orange-50
                            "
                        />
                    </div>

                    <div
                        className="
                            grid
                            gap-4
                            md:grid-cols-2
                        "
                    >
                        <div>
                            <label
                                htmlFor="relatorio-pendencias-filtro-empresa"
                                className="
                                    mb-2
                                    block
                                    text-xs
                                    font-black
                                    uppercase
                                    tracking-wide
                                    text-slate-600
                                "
                            >
                                Empresa
                            </label>

                            <select
                                id="relatorio-pendencias-filtro-empresa"
                                value={empresa}
                                onChange={(evento) =>
                                    setEmpresa(
                                        evento.target.value
                                    )
                                }
                                className="
                                    w-full
                                    rounded-2xl
                                    border
                                    border-slate-200
                                    bg-white
                                    px-4
                                    py-3
                                    text-sm
                                    font-semibold
                                    text-slate-800
                                    outline-none
                                    transition
                                    focus:border-orange-400
                                    focus:ring-4
                                    focus:ring-orange-50
                                "
                            >
                                {empresasDisponiveis.map(
                                    (nomeEmpresa) => (
                                        <option
                                            key={nomeEmpresa}
                                            value={nomeEmpresa}
                                        >
                                            {nomeEmpresa}
                                        </option>
                                    )
                                )}
                            </select>
                        </div>

                        <div>
                            <label
                                htmlFor="relatorio-pendencias-filtro-classificacao"
                                className="
                                    mb-2
                                    block
                                    text-xs
                                    font-black
                                    uppercase
                                    tracking-wide
                                    text-slate-600
                                "
                            >
                                Classificação
                            </label>

                            <select
                                id="relatorio-pendencias-filtro-classificacao"
                                value={classificacao}
                                onChange={(evento) =>
                                    setClassificacao(
                                        evento.target.value
                                    )
                                }
                                className="
                                    w-full
                                    rounded-2xl
                                    border
                                    border-slate-200
                                    bg-white
                                    px-4
                                    py-3
                                    text-sm
                                    font-semibold
                                    text-slate-800
                                    outline-none
                                    transition
                                    focus:border-orange-400
                                    focus:ring-4
                                    focus:ring-orange-50
                                "
                            >
                                {classificacoesDisponiveis.map(
                                    (opcao) => (
                                        <option
                                            key={opcao}
                                            value={opcao}
                                        >
                                            {opcao}
                                        </option>
                                    )
                                )}
                            </select>
                        </div>
                    </div>

                    {gerando ? (
                        <div
                            role="status"
                            aria-live="polite"
                            className="
                                flex
                                items-center
                                gap-3
                                rounded-2xl
                                border
                                border-orange-200
                                bg-orange-50
                                px-4
                                py-3
                                text-sm
                                font-bold
                                text-orange-800
                            "
                        >
                            <span
                                aria-hidden="true"
                                className="
                                    h-5
                                    w-5
                                    shrink-0
                                    animate-spin
                                    rounded-full
                                    border-2
                                    border-orange-200
                                    border-t-orange-600
                                "
                            />

                            <span>
                                Gerando PDF... isso pode levar alguns segundos.
                            </span>
                        </div>
                    ) : null}

                    {erro ? (
                        <div
                            role="alert"
                            className="
                                rounded-2xl
                                border
                                border-red-200
                                bg-red-50
                                px-4
                                py-3
                                text-sm
                                font-semibold
                                text-red-700
                            "
                        >
                            {erro}
                        </div>
                    ) : null}
                </div>

                <footer
                    className="
                        flex
                        flex-col-reverse
                        gap-3
                        border-t
                        border-slate-100
                        bg-slate-50/80
                        px-6
                        py-4
                        sm:flex-row
                        sm:items-center
                        sm:justify-between
                    "
                >
                    <button
                        type="button"
                        disabled={gerando}
                        onClick={limparFiltros}
                        className="
                            inline-flex
                            items-center
                            justify-center
                            rounded-2xl
                            border
                            border-slate-200
                            bg-white
                            px-4
                            py-2.5
                            text-sm
                            font-black
                            text-slate-600
                            transition
                            hover:bg-slate-100
                            disabled:cursor-not-allowed
                            disabled:opacity-50
                        "
                    >
                        Limpar filtros
                    </button>

                    <div
                        className="
                            flex
                            flex-col
                            gap-3
                            sm:flex-row
                        "
                    >
                        <button
                            type="button"
                            disabled={gerando}
                            onClick={onFechar}
                            className="
                                inline-flex
                                items-center
                                justify-center
                                rounded-2xl
                                px-4
                                py-2.5
                                text-sm
                                font-black
                                text-slate-600
                                transition
                                hover:bg-slate-200/70
                                disabled:cursor-not-allowed
                                disabled:opacity-50
                            "
                        >
                            Cancelar
                        </button>

                        <button
                            type="submit"
                            disabled={gerando}
                            className="
                                inline-flex
                                min-w-36
                                items-center
                                justify-center
                                gap-2
                                rounded-2xl
                                bg-orange-600
                                px-5
                                py-2.5
                                text-sm
                                font-black
                                text-white
                                shadow-sm
                                transition
                                hover:bg-orange-700
                                disabled:cursor-wait
                                disabled:opacity-60
                            "
                        >
                            {gerando ? (
                                <>
                                    <span
                                        aria-hidden="true"
                                        className="
                                            h-4
                                            w-4
                                            animate-spin
                                            rounded-full
                                            border-2
                                            border-white/35
                                            border-t-white
                                        "
                                    />

                                    Gerando PDF...
                                </>
                            ) : (
                                "Gerar PDF"
                            )}
                        </button>
                    </div>
                </footer>
            </form>
        </div>
    );
}