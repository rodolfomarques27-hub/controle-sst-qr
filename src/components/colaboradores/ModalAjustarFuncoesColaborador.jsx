import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";
import dashboardHeroPadrao from "../../assets/dashboard-hero-sst.webp";
import {
    AlertTriangle,
    CheckCircle2,
    Loader2,
    RotateCcw,
    Search,
    Settings2,
    Trash2,
    X,
} from "lucide-react";
import {
    treinamentosBase,
    treinamentoExclusivamenteManual,
} from "../../constants/treinamentosConstants";
import {
    definirFuncoesTreinamentosRemotas,
    obterFuncoesPersonalizadasSalvas,
    obterTodasMatrizesFuncao,
    resolverFuncaoBase,
    salvarFuncoesPersonalizadas,
} from "../../services/colaboradorDocumentosService";
import {
    carregarFuncoesTreinamentosRemotas,
    excluirFuncaoTreinamentosRemota,
    salvarFuncaoTreinamentosRemota,
} from "../../services/funcoesTreinamentosService.js";
import {
    normalizarTextoBusca,
} from "../../utils/sstUtils";

function chaveEhPersonalizada(chave = "") {
    return String(chave)
        .trim()
        .toLowerCase()
        .startsWith("custom-");
}

function criarEstadoEdicao(funcao = null) {
    if (!funcao) {
        return {
            chave: "",
            rotulo: "",
            termos: "",
            treinamentos: [],
        };
    }

    return {
        chave:
            funcao.chave,
        rotulo:
            funcao.rotulo || "",
        termos:
            (
                Array.isArray(
                    funcao.termos
                )
                    ? funcao.termos
                    : []
            ).join(", "),
        treinamentos:
            Array.isArray(
                funcao.treinamentos
            )
                ? funcao.treinamentos.map(Number)
                : [],
    };
}

function contarColaboradoresVinculados({
    chave = "",
    colaboradores = [],
} = {}) {
    return (
        Array.isArray(colaboradores)
            ? colaboradores
            : []
    ).filter((colaborador) => {
        const resolucao =
            resolverFuncaoBase(
                colaborador?.funcao ||
                colaborador?.cargo ||
                colaborador?.cargo_funcao ||
                ""
            );

        return (
            String(
                resolucao?.chaveFuncaoBase ||
                ""
            ).trim() ===
            String(chave || "").trim()
        );
    }).length;
}

function montarFuncoesGerenciadas({
    funcoesRemotas = [],
    colaboradores = [],
} = {}) {
    const remotasPorChave =
        new Map(
            (
                Array.isArray(
                    funcoesRemotas
                )
                    ? funcoesRemotas
                    : []
            ).map((item) => [
                String(
                    item?.chave ||
                    ""
                ).trim(),
                item,
            ])
        );

    return obterTodasMatrizesFuncao()
        .filter(
            (item) =>
                item?.chave &&
                item.chave !== "geral"
        )
        .map((item) => {
            const chave =
                String(
                    item.chave
                ).trim();

            const remota =
                remotasPorChave.get(
                    chave
                ) ||
                null;

            const personalizada =
                chaveEhPersonalizada(
                    chave
                );

            return {
                ...item,
                personalizada,
                possuiRegistroRemoto:
                    Boolean(remota),
                origem:
                    remota
                        ? "remota"
                        : personalizada
                            ? "local"
                            : "fixa",
                colaboradoresVinculados:
                    contarColaboradoresVinculados({
                        chave,
                        colaboradores,
                    }),
            };
        })
        .sort((a, b) =>
            String(
                a.rotulo ||
                ""
            ).localeCompare(
                String(
                    b.rotulo ||
                    ""
                ),
                "pt-BR",
                {
                    sensitivity: "base",
                }
            )
        );
}

function separarTermos(
    texto = "",
    rotulo = ""
) {
    return Array.from(
        new Set(
            [
                rotulo,
                ...String(
                    texto ||
                    ""
                ).split(","),
            ]
                .map((item) =>
                    String(
                        item ||
                        ""
                    ).trim()
                )
                .filter(Boolean)
        )
    );
}

export function ModalAjustarFuncoesColaborador({
    aberto = false,
    colaboradores = [],
    podeEditar = false,
    podeExcluir = false,
    onFechar,
    onAtualizado,
}) {
    const [carregando, setCarregando] =
        useState(false);

    const [salvando, setSalvando] =
        useState(false);

    const [erro, setErro] =
        useState("");

    const [aviso, setAviso] =
        useState("");

    const [busca, setBusca] =
        useState("");

    const [
        remotoDisponivel,
        setRemotoDisponivel,
    ] = useState(false);

    const [funcoes, setFuncoes] =
        useState([]);

    const [
        chaveSelecionada,
        setChaveSelecionada,
    ] = useState("");

    const [edicao, setEdicao] =
        useState(
            criarEstadoEdicao()
        );

    const treinamentosDisponiveis =
        useMemo(
            () =>
                treinamentosBase.filter(
                    (treinamento) =>
                        !treinamentoExclusivamenteManual(
                            treinamento
                        )
                ),
            []
        );

    const carregarDados =
        useCallback(
            async (
                chavePreferida = ""
            ) => {
                setCarregando(true);
                setErro("");
                setAviso("");

                try {
                    const resultado =
                        await carregarFuncoesTreinamentosRemotas();

                    definirFuncoesTreinamentosRemotas(
                        resultado.funcoes
                    );

                    const lista =
                        montarFuncoesGerenciadas({
                            funcoesRemotas:
                                resultado.funcoes,
                            colaboradores,
                        });

                    setFuncoes(
                        lista
                    );

                    setRemotoDisponivel(
                        Boolean(
                            resultado.disponivel
                        )
                    );

                    if (
                        !resultado.disponivel
                    ) {
                        setAviso(
                            resultado.motivo ||
                            "A estrutura remota ainda não está disponível. As funções continuam visíveis, mas os ajustes remotos permanecem bloqueados."
                        );
                    }

                    const selecionada =
                        lista.find(
                            (item) =>
                                item.chave ===
                                chavePreferida
                        ) ||
                        lista[0] ||
                        null;

                    setChaveSelecionada(
                        selecionada?.chave ||
                        ""
                    );

                    setEdicao(
                        criarEstadoEdicao(
                            selecionada
                        )
                    );
                } catch (error) {
                    definirFuncoesTreinamentosRemotas(
                        []
                    );

                    const lista =
                        montarFuncoesGerenciadas({
                            funcoesRemotas: [],
                            colaboradores,
                        });

                    setFuncoes(
                        lista
                    );

                    setRemotoDisponivel(
                        false
                    );

                    setErro(
                        error?.message ||
                        "Não foi possível carregar o gerenciamento das funções."
                    );

                    const selecionada =
                        lista.find(
                            (item) =>
                                item.chave ===
                                chavePreferida
                        ) ||
                        lista[0] ||
                        null;

                    setChaveSelecionada(
                        selecionada?.chave ||
                        ""
                    );

                    setEdicao(
                        criarEstadoEdicao(
                            selecionada
                        )
                    );
                } finally {
                    setCarregando(
                        false
                    );
                }
            },
            [colaboradores]
        );

    useEffect(() => {
        if (!aberto) {
            return;
        }

        void carregarDados();
    }, [
        aberto,
        carregarDados,
    ]);

    const funcoesFiltradas =
        useMemo(() => {
            const buscaNormalizada =
                normalizarTextoBusca(
                    busca
                );

            if (!buscaNormalizada) {
                return funcoes;
            }

            return funcoes.filter(
                (item) =>
                    normalizarTextoBusca(
                        [
                            item.rotulo,
                            item.chave,
                            ...(
                                Array.isArray(
                                    item.termos
                                )
                                    ? item.termos
                                    : []
                            ),
                        ].join(" ")
                    ).includes(
                        buscaNormalizada
                    )
            );
        }, [
            busca,
            funcoes,
        ]);

    const funcaoSelecionada =
        useMemo(
            () =>
                funcoes.find(
                    (item) =>
                        item.chave ===
                        chaveSelecionada
                ) ||
                null,
            [
                chaveSelecionada,
                funcoes,
            ]
        );

    const selecionarFuncao = (
        funcao
    ) => {
        setErro("");
        setAviso("");

        setChaveSelecionada(
            funcao.chave
        );

        setEdicao(
            criarEstadoEdicao(
                funcao
            )
        );
    };

    const alterarCampo = (
        campo,
        valor
    ) => {
        setEdicao((atual) => ({
            ...atual,
            [campo]:
                valor,
        }));
    };

    const alternarTreinamento = (
        treinamentoId,
        marcado
    ) => {
        const id =
            Number(
                treinamentoId
            );

        setEdicao((atual) => {
            const atuais =
                Array.isArray(
                    atual.treinamentos
                )
                    ? atual.treinamentos.map(
                        Number
                    )
                    : [];

            return {
                ...atual,
                treinamentos:
                    marcado
                        ? Array.from(
                            new Set([
                                ...atuais,
                                id,
                            ])
                        )
                        : atuais.filter(
                            (item) =>
                                item !== id
                        ),
            };
        });
    };

    const salvarAjuste = async () => {
        if (
            !funcaoSelecionada ||
            !edicao.chave
        ) {
            return;
        }

        if (!podeEditar) {
            setErro(
                "Sem permissão para editar funções e matrizes."
            );
            return;
        }

        if (!remotoDisponivel) {
            setErro(
                "A estrutura remota ainda não está disponível. Aplique a migration antes de salvar ajustes."
            );
            return;
        }

        const rotulo =
            String(
                edicao.rotulo ||
                ""
            )
                .trim()
                .toUpperCase();

        const termos =
            separarTermos(
                edicao.termos,
                rotulo
            );

        const treinamentos =
            Array.from(
                new Set(
                    (
                        Array.isArray(
                            edicao.treinamentos
                        )
                            ? edicao.treinamentos
                            : []
                    )
                        .map(Number)
                        .filter(
                            (id) =>
                                Number.isFinite(id) &&
                                id > 0
                        )
                )
            );

        if (!rotulo) {
            setErro(
                "Informe o nome da função."
            );
            return;
        }

        if (
            termos.length === 0
        ) {
            setErro(
                "Informe pelo menos uma palavra-chave."
            );
            return;
        }

        if (
            treinamentos.length === 0
        ) {
            setErro(
                "Selecione pelo menos um treinamento ou documento obrigatório."
            );
            return;
        }

        setSalvando(true);
        setErro("");
        setAviso("");

        try {
            await salvarFuncaoTreinamentosRemota({
                funcao: {
                    chave:
                        edicao.chave,
                    rotulo,
                    termos,
                    treinamentos,
                    tipo:
                        funcaoSelecionada.personalizada
                            ? "personalizada"
                            : "ajuste_fixa",
                    ativa: true,
                },
            });

            if (
                funcaoSelecionada.personalizada
            ) {
                const locais =
                    obterFuncoesPersonalizadasSalvas()
                        .filter(
                            (item) =>
                                item?.chave !==
                                edicao.chave
                        );

                salvarFuncoesPersonalizadas(
                    locais
                );
            }

            await carregarDados(
                edicao.chave
            );

            onAtualizado?.();

            setAviso(
                funcaoSelecionada.personalizada
                    ? "Função e matriz atualizadas com sucesso."
                    : "Ajuste da função fixa salvo com sucesso."
            );
        } catch (error) {
            setErro(
                error?.message ||
                "Não foi possível salvar o ajuste da função."
            );
        } finally {
            setSalvando(
                false
            );
        }
    };

    const excluirOuRestaurar = async () => {
        if (!funcaoSelecionada) {
            return;
        }

        const personalizada =
            funcaoSelecionada.personalizada;

        if (
            personalizada &&
            !podeExcluir
        ) {
            setErro(
                "Sem permissão para excluir funções."
            );
            return;
        }

        if (
            !personalizada &&
            !podeEditar
        ) {
            setErro(
                "Sem permissão para restaurar funções."
            );
            return;
        }

        if (
            personalizada &&
            funcaoSelecionada.colaboradoresVinculados > 0
        ) {
            setErro(
                `A função possui ${funcaoSelecionada.colaboradoresVinculados} colaborador(es) vinculado(s). Altere a função desses colaboradores antes de excluir.`
            );
            return;
        }

        if (
            !funcaoSelecionada.possuiRegistroRemoto
        ) {
            if (
                personalizada &&
                funcaoSelecionada.origem === "local"
            ) {
                const confirmado =
                    window.confirm(
                        `Excluir a função local "${funcaoSelecionada.rotulo}"?`
                    );

                if (!confirmado) {
                    return;
                }

                const locais =
                    obterFuncoesPersonalizadasSalvas()
                        .filter(
                            (item) =>
                                item?.chave !==
                                funcaoSelecionada.chave
                        );

                salvarFuncoesPersonalizadas(
                    locais
                );

                await carregarDados();

                onAtualizado?.();

                setAviso(
                    "Função local excluída."
                );

                return;
            }

            setAviso(
                "Esta função fixa já utiliza a matriz padrão do sistema."
            );
            return;
        }

        if (!remotoDisponivel) {
            setErro(
                "A estrutura remota ainda não está disponível."
            );
            return;
        }

        const mensagem =
            personalizada
                ? `Excluir definitivamente a função "${funcaoSelecionada.rotulo}"?`
                : `Restaurar a matriz padrão da função "${funcaoSelecionada.rotulo}"?`;

        const confirmado =
            window.confirm(
                mensagem
            );

        if (!confirmado) {
            return;
        }

        setSalvando(true);
        setErro("");
        setAviso("");

        try {
            await excluirFuncaoTreinamentosRemota({
                chave:
                    funcaoSelecionada.chave,
            });

            if (personalizada) {
                const locais =
                    obterFuncoesPersonalizadasSalvas()
                        .filter(
                            (item) =>
                                item?.chave !==
                                funcaoSelecionada.chave
                        );

                salvarFuncoesPersonalizadas(
                    locais
                );
            }

            await carregarDados();

            onAtualizado?.();

            setAviso(
                personalizada
                    ? "Função excluída com sucesso."
                    : "Matriz padrão restaurada com sucesso."
            );
        } catch (error) {
            setErro(
                error?.message ||
                "Não foi possível concluir a operação."
            );
        } finally {
            setSalvando(
                false
            );
        }
    };

    if (!aberto) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
            <div className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl">
                <header
                    className="relative shrink-0 overflow-hidden border-b border-slate-800 px-6 py-5 text-white"
                    style={{
                        backgroundImage: `linear-gradient(90deg, rgba(6,18,37,0.97) 0%, rgba(8,18,35,0.93) 38%, rgba(9,24,39,0.76) 68%, rgba(10,29,46,0.60) 100%), url(${dashboardHeroPadrao})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                    }}
                >
                    <div className="relative flex items-start justify-between gap-5">
                        <div className="flex min-w-0 items-start gap-4">
                            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white shadow-sm ring-1 ring-white/20 backdrop-blur-sm">
                                <Settings2 className="h-6 w-6" />
                            </span>

                            <div className="min-w-0">
                                <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">
                                    Gerenciamento de matrizes
                                </p>

                                <h2 className="mt-1 text-2xl font-black leading-tight text-white">
                                    Ajustar funções
                                </h2>

                                <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-100/95">
                                    Ajuste palavras-chave e treinamentos obrigatórios. Funções personalizadas somente podem ser excluídas quando não possuem colaboradores vinculados.
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={onFechar}
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white ring-1 ring-white/15 backdrop-blur-sm transition hover:bg-white/20"
                            aria-label="Fechar"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </header>

                {(erro || aviso) && (
                    <div className="shrink-0 px-6 pt-4">
                        {erro && (
                            <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                                <span>{erro}</span>
                            </div>
                        )}

                        {!erro && aviso && (
                            <div className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-blue-800">
                                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                                <span>{aviso}</span>
                            </div>
                        )}
                    </div>
                )}

                <div className="grid min-h-0 flex-1 lg:grid-cols-[340px_minmax(0,1fr)]">
                    <aside className="flex min-h-0 flex-col border-b border-slate-200 bg-slate-50 lg:border-b-0 lg:border-r">
                        <div className="shrink-0 p-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                                <input
                                    value={busca}
                                    onChange={(evento) =>
                                        setBusca(
                                            evento.target.value
                                        )
                                    }
                                    placeholder="Buscar função"
                                    className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-200"
                                />
                            </div>

                            <p className="mt-3 text-xs font-bold text-slate-500">
                                {funcoesFiltradas.length} função(ões)
                            </p>
                        </div>

                        <div className="scrollbar-discreta min-h-0 flex-1 space-y-2 overflow-y-auto px-4 pb-4">
                            {carregando && (
                                <div className="flex items-center justify-center gap-2 rounded-2xl bg-white p-5 text-sm font-semibold text-slate-500 ring-1 ring-slate-200">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Carregando funções...
                                </div>
                            )}

                            {!carregando &&
                                funcoesFiltradas.map((funcao) => {
                                    const selecionada =
                                        funcao.chave ===
                                        chaveSelecionada;

                                    return (
                                        <button
                                            key={funcao.chave}
                                            type="button"
                                            onClick={() =>
                                                selecionarFuncao(
                                                    funcao
                                                )
                                            }
                                            className={`w-full rounded-2xl border p-4 text-left transition ${
                                                selecionada
                                                    ? "border-slate-950 bg-slate-950 text-white shadow-lg"
                                                    : "border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-100"
                                            }`}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-black">
                                                        {funcao.rotulo}
                                                    </p>

                                                    <p
                                                        className={`mt-1 text-xs font-semibold ${
                                                            selecionada
                                                                ? "text-slate-300"
                                                                : "text-slate-500"
                                                        }`}
                                                    >
                                                        {funcao.personalizada
                                                            ? "Função personalizada"
                                                            : funcao.possuiRegistroRemoto
                                                                ? "Função fixa ajustada"
                                                                : "Função fixa padrão"}
                                                    </p>
                                                </div>

                                                <span
                                                    className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black uppercase ${
                                                        selecionada
                                                            ? "bg-white/15 text-white"
                                                            : funcao.personalizada
                                                                ? "bg-violet-100 text-violet-700"
                                                                : "bg-slate-100 text-slate-600"
                                                    }`}
                                                >
                                                    {funcao.colaboradoresVinculados}
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })}
                        </div>
                    </aside>

                    <main className="flex min-h-0 flex-col">
                        <div className="scrollbar-discreta min-h-0 flex-1 overflow-y-auto p-5 lg:p-6">
                        {!funcaoSelecionada ? (
                            <div className="flex min-h-[360px] items-center justify-center rounded-3xl border border-dashed border-slate-300 text-sm font-semibold text-slate-500">
                                Selecione uma função para ajustar.
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                                                Função selecionada
                                            </p>

                                            <h3 className="mt-1 text-xl font-black text-slate-950">
                                                {funcaoSelecionada.rotulo}
                                            </h3>
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            <span className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-slate-600 ring-1 ring-slate-200">
                                                {funcaoSelecionada.colaboradoresVinculados} colaborador(es) vinculado(s)
                                            </span>

                                            <span className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-slate-600 ring-1 ring-slate-200">
                                                {funcaoSelecionada.personalizada
                                                    ? "Personalizada"
                                                    : "Fixa"}
                                            </span>
                                        </div>
                                    </div>
                                </section>

                                <section className="grid gap-4 md:grid-cols-2">
                                    <div>
                                        <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
                                            Nome da função
                                        </label>

                                        <input
                                            value={edicao.rotulo}
                                            onChange={(evento) =>
                                                alterarCampo(
                                                    "rotulo",
                                                    evento.target.value
                                                )
                                            }
                                            disabled={!podeEditar}
                                            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 disabled:bg-slate-100 disabled:text-slate-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
                                            Palavras-chave
                                        </label>

                                        <input
                                            value={edicao.termos}
                                            onChange={(evento) =>
                                                alterarCampo(
                                                    "termos",
                                                    evento.target.value
                                                )
                                            }
                                            disabled={!podeEditar}
                                            placeholder="Ex.: ajudante, ajudante geral, servente"
                                            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 disabled:bg-slate-100 disabled:text-slate-500"
                                        />

                                        <p className="mt-2 text-xs leading-5 text-slate-500">
                                            Separe os termos por vírgula. Eles identificam qual matriz será aplicada ao colaborador.
                                        </p>
                                    </div>
                                </section>

                                <section>
                                    <div className="mb-3">
                                        <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                                            Treinamentos e documentos obrigatórios
                                        </p>

                                        <p className="mt-1 text-sm text-slate-500">
                                            Marque todos os itens exigidos para esta função.
                                        </p>
                                    </div>

                                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                        {treinamentosDisponiveis.map((treinamento) => {
                                            const id =
                                                Number(
                                                    treinamento.id
                                                );

                                            const marcado =
                                                edicao.treinamentos.includes(
                                                    id
                                                );

                                            return (
                                                <label
                                                    key={id}
                                                    className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${
                                                        marcado
                                                            ? "border-emerald-300 bg-emerald-50"
                                                            : "border-slate-200 bg-white hover:bg-slate-50"
                                                    }`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={marcado}
                                                        disabled={!podeEditar}
                                                        onChange={(evento) =>
                                                            alternarTreinamento(
                                                                id,
                                                                evento.target.checked
                                                            )
                                                        }
                                                        className="mt-1 h-4 w-4 rounded border-slate-300"
                                                    />

                                                    <span className="min-w-0">
                                                        <span className="block text-sm font-black text-slate-900">
                                                            {treinamento.nome}
                                                        </span>

                                                        <span className="mt-1 block text-xs text-slate-500">
                                                            Código {id}
                                                        </span>
                                                    </span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </section>

                            </div>
                        )}
                        </div>

                        {funcaoSelecionada && (
                            <footer className="shrink-0 border-t border-slate-200 bg-white px-5 py-4 shadow-[0_-14px_35px_rgba(15,23,42,0.08)] lg:px-6">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex flex-col gap-3 sm:flex-row">
                                        <button
                                            type="button"
                                            data-acao="excluir-funcao"
                                            onClick={excluirOuRestaurar}
                                            disabled={
                                                salvando ||
                                                !funcaoSelecionada.personalizada ||
                                                !podeExcluir
                                            }
                                            title={
                                                !funcaoSelecionada.personalizada
                                                    ? "Funções fixas padrão não podem ser excluídas."
                                                    : !podeExcluir
                                                        ? "A função possui colaboradores vinculados e não pode ser excluída."
                                                        : "Excluir função personalizada"
                                            }
                                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-50 px-5 py-3 text-sm font-black text-red-700 ring-1 ring-red-200 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 disabled:ring-slate-200"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            Excluir função
                                        </button>

                                        {!funcaoSelecionada.personalizada && (
                                            <button
                                                type="button"
                                                data-acao="restaurar-funcao"
                                                onClick={excluirOuRestaurar}
                                                disabled={
                                                    salvando ||
                                                    !podeEditar ||
                                                    !funcaoSelecionada.possuiRegistroRemoto
                                                }
                                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-50 px-5 py-3 text-sm font-black text-amber-800 ring-1 ring-amber-200 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 disabled:ring-slate-200"
                                            >
                                                <RotateCcw className="h-4 w-4" />

                                                {funcaoSelecionada.possuiRegistroRemoto
                                                    ? "Restaurar padrão"
                                                    : "Sem ajuste remoto"}
                                            </button>
                                        )}
                                    </div>

                                    <div className="flex flex-col gap-3 sm:flex-row">
                                        <button
                                            type="button"
                                            onClick={onFechar}
                                            className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
                                        >
                                            Fechar
                                        </button>

                                        <button
                                            type="button"
                                            onClick={salvarAjuste}
                                            disabled={
                                                salvando ||
                                                carregando ||
                                                !podeEditar ||
                                                !remotoDisponivel
                                            }
                                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                                        >
                                            {salvando && (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            )}

                                            Salvar ajustes
                                        </button>
                                    </div>
                                </div>
                            </footer>
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
}
