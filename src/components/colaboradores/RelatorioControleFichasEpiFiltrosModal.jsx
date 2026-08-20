import {
    useEffect,
    useMemo,
    useState,
} from "react";

import heroControleFichasEpiModalUrl from "../../assets/heroes/relatorios/hero-pendencias-treinamentos-obras-v1.png";

export function RelatorioControleFichasEpiFiltrosModal({
    aberto = false,
    empresas = [],
    onFechar = () => {},
    onGerar = async () => true,
}) {
    const [busca, setBusca] = useState("");
    const [empresa, setEmpresa] = useState("Todas");
    const [classificacaoEpi, setClassificacaoEpi] = useState("Todos");
    const [gerando, setGerando] = useState(false);
    const [erro, setErro] = useState("");

    const empresasDisponiveis =
        useMemo(
            () => {
                const nomes =
                    (Array.isArray(empresas) ? empresas : [])
                        .map(
                            (valor) =>
                                String(valor || "").trim()
                        )
                        .filter(
                            (valor) =>
                                valor &&
                                valor.toLocaleLowerCase("pt-BR") !==
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
                                    sensitivity: "base",
                                }
                            )
                    ),
                ];
            },
            [empresas]
        );


    useEffect(
        () => {
            if (!aberto) {
                return undefined;
            }

            const tratarEscape =
                (evento) => {
                    if (
                        evento.key === "Escape" &&
                        !gerando
                    ) {
                        onFechar();
                    }
                };

            window.addEventListener(
                "keydown",
                tratarEscape
            );

            return () => {
                window.removeEventListener(
                    "keydown",
                    tratarEscape
                );
            };
        },
        [
            aberto,
            gerando,
            onFechar,
        ]
    );

    if (!aberto) {
        return null;
    }

    const limparFiltros =
        () => {
            if (gerando) {
                return;
            }

            setBusca("");
            setEmpresa("Todas");
            setClassificacaoEpi("Todos");
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
                const resultado =
                    await onGerar({
                        busca:
                            busca.trim(),

                        empresa,

                        classificacaoEpi,
                    });

                /*
                 * `false` permite que a página informe:
                 * "nenhum resultado encontrado".
                 *
                 * Nesse caso o modal permanece aberto.
                 */
                if (resultado === false) {
                    setErro(
                        "Nenhum colaborador encontrado para os filtros selecionados."
                    );

                    return;
                }

                onFechar();
            }
            catch (error) {
                console.error(
                    "Erro ao gerar relatório de Controle de Fichas de EPI:",
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
                aria-labelledby="titulo-filtros-controle-epi"
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
                        src={heroControleFichasEpiModalUrl}
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
                            to-emerald-950/55
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
                                    text-emerald-300
                                "
                            >
                                Controle documental
                            </p>

                            <h2
                                id="titulo-filtros-controle-epi"
                                className="
                                    mt-1
                                    text-xl
                                    font-black
                                    tracking-tight
                                    text-white
                                "
                            >
                                Controle de Fichas de EPI
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
                                colaboradores serão incluídos no relatório.
                            </p>
                        </div>

                        <button
                            type="button"
                            aria-label="Fechar filtros do Controle de Fichas de EPI"
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
                            htmlFor="controle-epi-filtro-busca"
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
                            id="controle-epi-filtro-busca"
                            type="text"
                            value={busca}
                            autoFocus
                            placeholder="Nome, função, empresa ou classificação"
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
                                focus:border-emerald-400
                                focus:ring-4
                                focus:ring-emerald-50
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
                                htmlFor="controle-epi-filtro-empresa"
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
                                id="controle-epi-filtro-empresa"
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
                                    focus:border-emerald-400
                                    focus:ring-4
                                    focus:ring-emerald-50
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
                                htmlFor="controle-epi-filtro-classificacao"
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
                                id="controle-epi-filtro-classificacao"
                                value={classificacaoEpi}
                                onChange={(evento) =>
                                    setClassificacaoEpi(
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
                                    focus:border-emerald-400
                                    focus:ring-4
                                    focus:ring-emerald-50
                                "
                            >
                                <option value="Todos">
                                    Todos
                                </option>

                                <option value="Conforme">
                                    Conforme
                                </option>

                                <option value="Pendente">
                                    Pendente
                                </option>

                                <option value="Revisar controle">
                                    Revisar controle
                                </option>
                            </select>
                        </div>
                    </div>


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
                                rounded-2xl
                                bg-emerald-600
                                px-5
                                py-2.5
                                text-sm
                                font-black
                                text-white
                                shadow-sm
                                transition
                                hover:bg-emerald-700
                                disabled:cursor-wait
                                disabled:opacity-60
                            "
                        >
                            {gerando
                                ? "Gerando PDF..."
                                : "Gerar PDF"}
                        </button>
                    </div>
                </footer>
            </form>
        </div>
    );
}