import {
    useMemo,
    useState,
} from "react";

import {
    AlertTriangle,
    Check,
    ClipboardCheck,
    Download,
    RefreshCw,
    UserRoundSearch,
    X,
} from "lucide-react";

import heroPendenciasCadastrais from "../../assets/heroes/relatorios/hero-pendencias-treinamentos-obras-v1.png";

import {
    baixarRelatorioPendenciasCadastraisPDF,
} from "../../services/exportacaoService";

import {
    CAMPOS_PENDENCIAS_CADASTRAIS,
    CHAVES_PENDENCIAS_CADASTRAIS,
    consolidarPendenciasCadastrais,
} from "../../services/exportacao/relatorioPendenciasCadastraisUtils.js";

import {
    construirResumoCadastralComFiltroQr,
    ESTADOS_QR_RELATORIO,
    resumirEstadosQrColaboradores,
} from "../../services/exportacao/relatorioPendenciasCadastraisQrUtils.js";

function descricaoFiltrosTela(
    filtros = {}
) {
    const partes = [];

    if (
        String(
            filtros.busca ||
            ""
        ).trim()
    ) {
        partes.push(
            `Busca: ${String(filtros.busca).trim()}`
        );
    }

    partes.push(
        `Empresa: ${
            filtros.empresa ||
            "Todas"
        }`
    );

    partes.push(
        `Classificação: ${
            filtros.classificacao ||
            "Todos"
        }`
    );

    if (
        filtros.filtroRapido
    ) {
        partes.push(
            `Filtro rápido: ${filtros.filtroRapido}`
        );
    }

    return partes.join(
        " • "
    );
}

export function RelatorioPendenciasCadastraisModal({
    colaboradores = [],
    filtros = {},
    contratanteCabecalho = null,
    onClose,
}) {
    const [
        camposSelecionados,
        setCamposSelecionados,
    ] =
        useState(
            () => [
                ...CHAVES_PENDENCIAS_CADASTRAIS,
            ]
        );

    /*
     * Filtro operacional independente.
     *
     * Estado inicial vazio:
     * QR não restringe o relatório.
     */
    const [
        estadosQrSelecionados,
        setEstadosQrSelecionados,
    ] =
        useState(
            []
        );

    const [
        gerandoPdf,
        setGerandoPdf,
    ] =
        useState(false);

    /*
     * Visão geral permanente.
     *
     * Calcula todos os 12 campos independentemente
     * da seleção atual e alimenta somente os números
     * apresentados nos cards.
     */
    const resumoTodosCampos =
        useMemo(
            () =>
                consolidarPendenciasCadastrais(
                    colaboradores,
                    CHAVES_PENDENCIAS_CADASTRAIS
                ),
            [
                colaboradores,
            ]
        );

    /*
     * Resumo da seleção atual.
     *
     * Continua sendo a fonte da prévia,
     * dos indicadores e do PDF.
     */
    /*
     * Controle operacional de impressão do QR.
     *
     * As contagens permanecem independentes
     * da seleção para permitir decisão do usuário.
     */
    const resumoQr =
        useMemo(
            () =>
                resumirEstadosQrColaboradores(
                    colaboradores
                ),
            [
                colaboradores,
            ]
        );

    /*
     * Resultado final do modal:
     *
     * - campos cadastrais mantêm semântica OU;
     * - QR usa AND quando somente um estado é selecionado;
     * - QR-only é permitido;
     * - QR não cria pendência cadastral.
     */
    const resumo =
        useMemo(
            () =>
                construirResumoCadastralComFiltroQr({
                    colaboradores,

                    camposSelecionados,

                    estadosQrSelecionados,
                }),
            [
                colaboradores,
                camposSelecionados,
                estadosQrSelecionados,
            ]
        );

    const temCriterioSelecionado =
        camposSelecionados.length >
            0 ||
        estadosQrSelecionados.length >
            0;

    const alternarCampo =
        (chave) => {
            setCamposSelecionados(
                (atuais) =>
                    atuais.includes(
                        chave
                    )
                        ? atuais.filter(
                            (item) =>
                                item !==
                                chave
                        )
                        : [
                            ...atuais,
                            chave,
                        ]
            );
        };

    const alternarEstadoQr =
        (estado) => {
            if (
                !ESTADOS_QR_RELATORIO.includes(
                    estado
                )
            ) {
                return;
            }

            setEstadosQrSelecionados(
                (atuais) =>
                    atuais.includes(
                        estado
                    )
                        ? atuais.filter(
                            (item) =>
                                item !==
                                estado
                        )
                        : [
                            ...atuais,
                            estado,
                        ]
            );
        };

    const selecionarTodos =
        () => {
            setCamposSelecionados(
                [
                    ...CHAVES_PENDENCIAS_CADASTRAIS,
                ]
            );

            setEstadosQrSelecionados(
                [
                    ...ESTADOS_QR_RELATORIO,
                ]
            );
        };

    const limparTodos =
        () => {
            setCamposSelecionados(
                []
            );

            setEstadosQrSelecionados(
                []
            );
        };

    const gerarPdf =
        async () => {
            if (
                gerandoPdf ||
                !temCriterioSelecionado ||
                resumo.avaliacoes.length ===
                    0
            ) {
                return;
            }

            setGerandoPdf(
                true
            );

            try {
                await baixarRelatorioPendenciasCadastraisPDF({
                    resumo,
                    camposSelecionados,
                    filtrosQrSelecionados:
                        estadosQrSelecionados,
                    filtros,
                    contratanteCabecalho,
                });
            } finally {
                setGerandoPdf(
                    false
                );
            }
        };

    const todosSelecionados =
        camposSelecionados.length ===
            CHAVES_PENDENCIAS_CADASTRAIS.length &&
        estadosQrSelecionados.length ===
            ESTADOS_QR_RELATORIO.length;

    const qrImpressoSelecionado =
        estadosQrSelecionados.includes(
            "impresso"
        );

    const semImpressaoSelecionado =
        estadosQrSelecionados.includes(
            "sem_impressao"
        );

    const filtrosTela =
        descricaoFiltrosTela(
            filtros
        );

    const filtrosTelaLista =
        filtrosTela
            ? filtrosTela.split(
                " • "
            )
            : [];

    const previa =
        resumo.avaliacoes.slice(
            0,
            12
        );

    return (
        <div
            className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="relatorio-pendencias-cadastrais-titulo"
        >
            <div className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl ring-1 ring-slate-200">
                <header
                    className="flex min-h-[132px] shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-slate-950 bg-cover bg-center px-6 py-5 text-white"
                    style={{
                        backgroundImage:
                            `linear-gradient(
                                90deg,
                                rgba(2, 6, 23, 0.97) 0%,
                                rgba(2, 6, 23, 0.88) 38%,
                                rgba(2, 6, 23, 0.66) 68%,
                                rgba(2, 6, 23, 0.46) 100%
                            ),
                            url(${heroPendenciasCadastrais})`,
                        backgroundPosition:
                            "center 48%",
                    }}
                >
                    <div className="flex min-w-0 items-start gap-4">
                        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/20">
                            <ClipboardCheck className="h-6 w-6 text-emerald-300" />
                        </div>

                        <div className="min-w-0">
                            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">
                                Conferência cadastral
                            </p>

                            <h2
                                id="relatorio-pendencias-cadastrais-titulo"
                                className="mt-1 text-xl font-black"
                            >
                                Relatório de Pendências Cadastrais
                            </h2>

                            <p className="mt-1 text-sm font-semibold text-slate-300">
                                Escolha exatamente quais informações faltantes deseja localizar.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-2xl bg-white/10 text-white ring-1 ring-white/20 transition hover:bg-white/20"
                        aria-label="Fechar relatório cadastral"
                        title="Fechar"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </header>

                <div className="overflow-y-auto p-6">
                    <div className="rounded-2xl bg-slate-50 px-4 py-4 ring-1 ring-slate-200">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="min-w-0 flex-1">
                                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                                    Filtros atuais da tela
                                </p>

                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                    {filtrosTelaLista.map((item) => (
                                        <span
                                            key={item}
                                            className="inline-flex items-center rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-700 ring-1 ring-slate-200"
                                        >
                                            {item}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="flex shrink-0 items-center gap-2 whitespace-nowrap">
                                <button
                                    type="button"
                                    onClick={selecionarTodos}
                                    disabled={todosSelecionados}
                                    className="cursor-pointer rounded-xl bg-slate-950 px-3 py-2 text-xs font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    Selecionar todos
                                </button>

                                <button
                                    type="button"
                                    onClick={limparTodos}
                                    disabled={!temCriterioSelecionado}
                                    className="cursor-pointer rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    Limpar
                                </button>
                            </div>
                        </div>
                    </div>

                    <section className="mt-5 rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-100">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="min-w-0">
                                <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">
                                    Controle de impressão do QR
                                </p>

                                <p className="mt-1 text-xs font-semibold leading-5 text-emerald-800/80">
                                    Estado operacional confirmado no SafeScan. Não altera as pendências cadastrais.
                                </p>

                                <p className="mt-1 text-[11px] font-bold text-emerald-700/70">
                                    {resumoQr.total} colaborador(es) no filtro atual
                                </p>
                            </div>

                            <div className="grid w-full gap-3 sm:w-auto sm:grid-cols-2">
                                <button
                                    type="button"
                                    onClick={() =>
                                        alternarEstadoQr(
                                            "impresso"
                                        )
                                    }
                                    aria-pressed={qrImpressoSelecionado}
                                    className={`relative min-w-[150px] cursor-pointer rounded-xl px-4 py-3 text-center transition ${
                                        qrImpressoSelecionado
                                            ? "bg-emerald-600 text-white ring-2 ring-emerald-600 shadow-sm"
                                            : "bg-white text-emerald-800 ring-1 ring-emerald-200 hover:bg-emerald-50"
                                    }`}
                                >
                                    <span
                                        className={`absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-md ${
                                            qrImpressoSelecionado
                                                ? "bg-white text-emerald-700"
                                                : "bg-emerald-50 text-emerald-200"
                                        }`}
                                    >
                                        {qrImpressoSelecionado && (
                                            <Check className="h-3.5 w-3.5" />
                                        )}
                                    </span>

                                    <p
                                        className={`pr-5 text-[10px] font-black uppercase tracking-wide ${
                                            qrImpressoSelecionado
                                                ? "text-emerald-50"
                                                : "text-emerald-600"
                                        }`}
                                    >
                                        QR impresso
                                    </p>

                                    <strong className="mt-1 block text-2xl font-black leading-none">
                                        {resumoQr.impressos}
                                    </strong>
                                </button>

                                <button
                                    type="button"
                                    onClick={() =>
                                        alternarEstadoQr(
                                            "sem_impressao"
                                        )
                                    }
                                    aria-pressed={semImpressaoSelecionado}
                                    className={`relative min-w-[180px] cursor-pointer rounded-xl px-4 py-3 text-center transition ${
                                        semImpressaoSelecionado
                                            ? "bg-slate-700 text-white ring-2 ring-slate-700 shadow-sm"
                                            : "bg-white text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50"
                                    }`}
                                >
                                    <span
                                        className={`absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-md ${
                                            semImpressaoSelecionado
                                                ? "bg-white text-slate-700"
                                                : "bg-slate-100 text-slate-300"
                                        }`}
                                    >
                                        {semImpressaoSelecionado && (
                                            <Check className="h-3.5 w-3.5" />
                                        )}
                                    </span>

                                    <p
                                        className={`pr-5 text-[10px] font-black uppercase tracking-wide ${
                                            semImpressaoSelecionado
                                                ? "text-slate-100"
                                                : "text-slate-500"
                                        }`}
                                    >
                                        Sem impressão confirmada
                                    </p>

                                    <strong className="mt-1 block text-2xl font-black leading-none">
                                        {resumoQr.semImpressao}
                                    </strong>
                                </button>
                            </div>
                        </div>
                    </section>

                    <section className="mt-5">
                        <div className="flex items-start gap-3">
                            <div className="min-w-0">
                                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                                    Quais informações deseja verificar?
                                </p>

                                <p className="mt-1 text-sm font-semibold text-slate-600">
                                    Selecione um ou mais campos. Serão exibidos os colaboradores que estiverem com qualquer um dos campos selecionados sem preenchimento.
                                </p>

                                <p className="mt-1 text-xs font-semibold text-slate-400">
                                    Ex.: ao marcar Foto e CPF, aparecem colaboradores sem foto, sem CPF ou sem ambos.
                                </p>
                            </div>


                        </div>

                        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {CAMPOS_PENDENCIAS_CADASTRAIS.map(
                                (campo) => {
                                    const selecionado =
                                        camposSelecionados.includes(
                                            campo.chave
                                        );

                                    const quantidade =
                                        resumoTodosCampos.totaisPorCampo[
                                            campo.chave
                                        ] ||
                                        0;

                                    return (
                                        <button
                                            key={campo.chave}
                                            type="button"
                                            onClick={() =>
                                                alternarCampo(
                                                    campo.chave
                                                )
                                            }
                                            aria-pressed={selecionado}
                                            className={`cursor-pointer rounded-2xl p-4 text-left transition ${
                                                selecionado
                                                    ? "bg-emerald-50 ring-2 ring-emerald-500 shadow-sm"
                                                    : "bg-white ring-1 ring-slate-200 hover:bg-slate-50"
                                            }`}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <p
                                                        className={`text-sm font-black ${
                                                            selecionado
                                                                ? "text-emerald-800"
                                                                : "text-slate-800"
                                                        }`}
                                                    >
                                                        {campo.rotulo}
                                                    </p>

                                                    <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                                        {campo.grupo}
                                                    </p>
                                                </div>

                                                <span
                                                    className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg ${
                                                        selecionado
                                                            ? "bg-emerald-600 text-white"
                                                            : "bg-slate-100 text-slate-300"
                                                    }`}
                                                >
                                                    {selecionado && (
                                                        <Check className="h-4 w-4" />
                                                    )}
                                                </span>
                                            </div>

                                            <div className="mt-3 flex items-end justify-between gap-2">
                                                <span className="text-2xl font-black text-slate-950">
                                                    {quantidade}
                                                </span>

                                                <span className="text-[10px] font-bold text-slate-400">
                                                    colaborador(es)
                                                </span>
                                            </div>

                                            {campo.opcionalNoFormulario && (
                                                <p className="mt-2 text-[10px] font-bold text-amber-700">
                                                    Opcional no formulário atual
                                                </p>
                                            )}
                                        </button>
                                    );
                                }
                            )}
                        </div>
                    </section>

                    <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                            <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                                Analisados
                            </p>

                            <p className="mt-1 text-2xl font-black text-slate-950">
                                {resumo.colaboradoresAnalisados}
                            </p>
                        </div>

                        <div className="rounded-2xl bg-orange-50 p-4 ring-1 ring-orange-100">
                            <p className="text-[10px] font-black uppercase tracking-wide text-orange-500">
                                Cadastros incompletos
                            </p>

                            <p className="mt-1 text-2xl font-black text-orange-700">
                                {resumo.cadastrosComPendencia}
                            </p>
                        </div>

                        <div className="rounded-2xl bg-rose-50 p-4 ring-1 ring-rose-100">
                            <p className="text-[10px] font-black uppercase tracking-wide text-rose-500">
                                Informações faltantes
                            </p>

                            <p className="mt-1 text-2xl font-black text-rose-700">
                                {resumo.totalPendencias}
                            </p>
                        </div>

                        <div className="rounded-2xl bg-blue-50 p-4 ring-1 ring-blue-100">
                            <p className="text-[10px] font-black uppercase tracking-wide text-blue-500">
                                Campos selecionados
                            </p>

                            <p className="mt-1 text-2xl font-black text-blue-700">
                                {camposSelecionados.length}
                            </p>
                        </div>
                    </section>

                    <section className="mt-6">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                                    Prévia
                                </p>

                                <h3 className="mt-1 text-lg font-black text-slate-950">
                                    Colaboradores encontrados
                                </h3>
                            </div>

                            {resumo.avaliacoes.length > 12 && (
                                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-500">
                                    Mostrando 12 de {resumo.avaliacoes.length}
                                </span>
                            )}
                        </div>

                        {!temCriterioSelecionado && (
                            <div className="mt-4 rounded-2xl border border-dashed border-slate-300 p-8 text-center">
                                <UserRoundSearch className="mx-auto h-9 w-9 text-slate-300" />

                                <p className="mt-3 font-black text-slate-800">
                                    Selecione pelo menos uma informação ou um estado de QR.
                                </p>

                                <p className="mt-1 text-sm text-slate-500">
                                    A prévia será atualizada automaticamente.
                                </p>
                            </div>
                        )}

                        {temCriterioSelecionado &&
                            previa.length === 0 && (
                                <div className="mt-4 rounded-2xl bg-emerald-50 p-8 text-center ring-1 ring-emerald-100">
                                    <Check className="mx-auto h-9 w-9 text-emerald-600" />

                                    <p className="mt-3 font-black text-emerald-800">
                                        Nenhum colaborador encontrado.
                                    </p>

                                    <p className="mt-1 text-sm font-semibold text-emerald-700">
                                        Nenhum colaborador corresponde à combinação de filtros selecionada.
                                    </p>
                                </div>
                            )}

                        {previa.length > 0 && (
                            <div className="mt-4 space-y-3">
                                {previa.map(
                                    (
                                        avaliacao,
                                        indice
                                    ) => {
                                        const colaborador =
                                            avaliacao.colaborador ||
                                            {};

                                        return (
                                            <div
                                                key={
                                                    colaborador.id ||
                                                    `${colaborador.nome || "colaborador"}-${indice}`
                                                }
                                                className="rounded-2xl bg-white p-4 ring-1 ring-slate-200"
                                            >
                                                <div className="flex flex-wrap items-start justify-between gap-3">
                                                    <div>
                                                        <p className="font-black text-slate-950">
                                                            {colaborador.nome ||
                                                                "Nome não informado"}
                                                        </p>

                                                        <p className="mt-1 text-xs font-semibold text-slate-500">
                                                            {colaborador.funcao ||
                                                                "Função não informada"}
                                                            {" • "}
                                                            {colaborador.empresa ||
                                                                colaborador.empresaNome ||
                                                                "Empresa não informada"}
                                                        </p>
                                                    </div>

                                                    <span className="rounded-full bg-orange-50 px-3 py-1.5 text-xs font-black text-orange-700 ring-1 ring-orange-100">
                                                        {avaliacao.quantidade} faltante(s)
                                                    </span>
                                                </div>

                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    {avaliacao.pendencias.map(
                                                        (pendencia) => (
                                                            <span
                                                                key={pendencia.chave}
                                                                className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 ring-1 ring-rose-100"
                                                            >
                                                                <AlertTriangle className="h-3.5 w-3.5" />

                                                                {pendencia.rotulo}
                                                            </span>
                                                        )
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    }
                                )}
                            </div>
                        )}
                    </section>


                </div>

                <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4">
                    <button
                        type="button"
                        onClick={gerarPdf}
                        disabled={
                            gerandoPdf ||
                            !temCriterioSelecionado ||
                            resumo.avaliacoes.length === 0
                        }
                        aria-busy={gerandoPdf}
                        className="inline-flex min-w-[132px] cursor-pointer items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-2.5 text-sm font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                        {gerandoPdf ? (
                            <>
                                <RefreshCw className="h-4 w-4 animate-spin" />
                                Gerando...
                            </>
                        ) : (
                            <>
                                <Download className="h-4 w-4" />
                                Gerar PDF
                            </>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={gerandoPdf}
                        className="cursor-pointer rounded-2xl bg-slate-950 px-5 py-2.5 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                        Fechar
                    </button>
                </footer>
            </div>
        </div>
    );
}