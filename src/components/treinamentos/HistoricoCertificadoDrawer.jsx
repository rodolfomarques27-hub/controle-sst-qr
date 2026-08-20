import React from "react";
import {
    ExternalLink,
    FileClock,
    FileText,
    History,
    LoaderCircle,
    X,
} from "lucide-react";

function textoSeguro(valor = "") {
    return String(valor || "").trim();
}

function formatarData(valor = "") {
    const texto = textoSeguro(valor);

    if (!texto) {
        return "-";
    }

    const iso =
        /^(\d{4})-(\d{2})-(\d{2})/.exec(
            texto
        );

    if (iso) {
        return `${iso[3]}/${iso[2]}/${iso[1]}`;
    }

    const data = new Date(texto);

    if (Number.isNaN(data.getTime())) {
        return texto;
    }

    return data.toLocaleDateString("pt-BR");
}

function formatarDataHora(valor = "") {
    const texto = textoSeguro(valor);

    if (!texto) {
        return "-";
    }

    const data = new Date(texto);

    if (Number.isNaN(data.getTime())) {
        return texto;
    }

    return data.toLocaleString(
        "pt-BR",
        {
            dateStyle: "short",
            timeStyle: "short",
        }
    );
}

function obterTituloDocumento(documento = {}) {
    return textoSeguro(
        documento?.treinamento?.nome ||
        documento?.nomeTreinamento ||
        documento?.nome_treinamento ||
        documento?.tipoTreinamento ||
        documento?.tipo_treinamento ||
        "Documento"
    );
}

function obterNomeColaborador(documento = {}) {
    return textoSeguro(
        documento?.colaborador?.nome ||
        documento?.colaboradorNome ||
        documento?.colaborador_nome ||
        ""
    );
}

function obterNomeArquivoAtual(documento = {}) {
    return textoSeguro(
        documento?.arquivo ||
        documento?.arquivoNome ||
        documento?.arquivo_nome ||
        documento?.nome_do_arquivo ||
        "Arquivo atual"
    );
}

function obterDataDocumentoAtual(documento = {}) {
    return (
        documento?.realizado ||
        documento?.data_realizacao ||
        documento?.dataRealizacao ||
        ""
    );
}

function obterNomeArquivoHistorico(item = {}) {
    return textoSeguro(
        item?.arquivo_nome ||
        item?.nome_do_arquivo ||
        "Arquivo da versão anterior"
    );
}

export function HistoricoCertificadoDrawer({
    aberto = false,
    documento = null,
    historico = [],
    carregando = false,
    erro = "",
    onFechar,
    onAbrirAtual,
    onAbrirHistorico,
}) {
    const [abrindoId, setAbrindoId] =
        React.useState("");

    const [erroAbertura, setErroAbertura] =
        React.useState("");

    React.useEffect(() => {
        if (
            !aberto ||
            typeof window === "undefined"
        ) {
            return undefined;
        }

        const overflowAnterior =
            document.body.style.overflow;

        document.body.style.overflow =
            "hidden";

        const aoTeclado = (evento) => {
            if (evento.key === "Escape") {
                onFechar?.();
            }
        };

        window.addEventListener(
            "keydown",
            aoTeclado
        );

        return () => {
            window.removeEventListener(
                "keydown",
                aoTeclado
            );

            document.body.style.overflow =
                overflowAnterior;
        };
    }, [
        aberto,
        onFechar,
    ]);

    React.useEffect(() => {
        if (!aberto) {
            setAbrindoId("");
            setErroAbertura("");
        }
    }, [aberto]);

    if (!aberto) {
        return null;
    }

    const itens =
        Array.isArray(historico)
            ? historico
            : [];

    const titulo =
        obterTituloDocumento(
            documento || {}
        );

    const colaborador =
        obterNomeColaborador(
            documento || {}
        );

    const abrirVersaoAnterior = async (item) => {
        const id =
            textoSeguro(item?.id);

        setErroAbertura("");
        setAbrindoId(id);

        try {
            await onAbrirHistorico?.(item);
        } catch (erroAbrir) {
            setErroAbertura(
                erroAbrir?.message ||
                "Não foi possível abrir esta versão."
            );
        } finally {
            setAbrindoId("");
        }
    };

    return (
        <div
            className="historico-certificado-drawer fixed inset-0 z-[100]"
            data-historico-certificado-drawer
        >
            <button
                type="button"
                aria-label="Fechar histórico do documento"
                className="historico-certificado-drawer__backdrop absolute inset-0 h-full w-full cursor-default bg-slate-950/45 backdrop-blur-[1px]"
                onClick={() => onFechar?.()}
            />

            <section
                role="dialog"
                aria-modal="true"
                aria-label={`Histórico de versões — ${titulo}`}
                className="historico-certificado-drawer__painel absolute inset-y-0 right-0 z-10 flex w-full max-w-[29rem] flex-col border-l border-slate-200 bg-white shadow-2xl"
            >
                <header className="border-b border-slate-200 px-5 py-4">
                    <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 text-blue-700">
                                <History className="h-4 w-4 shrink-0" />

                                <span className="text-[11px] font-black uppercase tracking-[0.12em]">
                                    Histórico do documento
                                </span>
                            </div>

                            <h2 className="mt-2 break-words text-lg font-black leading-tight text-slate-950">
                                {titulo}
                            </h2>

                            {colaborador && (
                                <p className="mt-1 break-words text-xs font-semibold text-slate-500">
                                    {colaborador}
                                </p>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={() => onFechar?.()}
                            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200"
                            aria-label="Fechar histórico"
                            title="Fechar"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto px-5 py-4">
                    <section className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
                        <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-700">
                            Atual
                        </span>

                        <div className="mt-3 flex items-start gap-2">
                            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />

                            <div className="min-w-0">
                                <p className="break-words text-sm font-bold text-slate-900">
                                    {obterNomeArquivoAtual(
                                        documento || {}
                                    )}
                                </p>

                                <p className="mt-1 text-xs font-semibold text-slate-600">
                                    Data documental:{" "}
                                    {formatarData(
                                        obterDataDocumentoAtual(
                                            documento || {}
                                        )
                                    )}
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => onAbrirAtual?.()}
                            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white transition hover:bg-slate-800"
                        >
                            <ExternalLink className="h-4 w-4" />
                            Abrir versão atual
                        </button>
                    </section>

                    <div className="my-5 flex items-center gap-3">
                        <div className="h-px flex-1 bg-slate-200" />

                        <span className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                            Versões anteriores
                        </span>

                        <div className="h-px flex-1 bg-slate-200" />
                    </div>

                    {carregando && (
                        <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-7 text-sm font-semibold text-slate-600">
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                            Carregando histórico...
                        </div>
                    )}

                    {!carregando &&
                        Boolean(erro) && (
                            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                                {erro}
                            </div>
                        )}

                    {!carregando &&
                        !erro &&
                        itens.length === 0 && (
                            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-7 text-center">
                                <FileClock className="mx-auto h-8 w-8 text-slate-300" />

                                <p className="mt-3 text-sm font-black text-slate-700">
                                    Nenhuma versão anterior registrada
                                </p>

                                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                                    O histórico começará a aparecer aqui quando este documento for substituído por um novo arquivo.
                                </p>
                            </div>
                        )}

                    {!carregando &&
                        !erro &&
                        itens.length > 0 && (
                            <div className="space-y-3">
                                {itens.map(
                                    (
                                        item,
                                        indice
                                    ) => {
                                        const id =
                                            textoSeguro(
                                                item?.id ||
                                                `${item?.certificado_origem_id || "historico"}-${indice}`
                                            );

                                        const abrindo =
                                            abrindoId === id;

                                        return (
                                            <article
                                                key={id}
                                                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-slate-600">
                                                            Versão anterior
                                                        </span>

                                                        <p className="mt-3 break-words text-sm font-bold text-slate-900">
                                                            {obterNomeArquivoHistorico(
                                                                item
                                                            )}
                                                        </p>
                                                    </div>

                                                    <FileClock className="h-5 w-5 shrink-0 text-slate-400" />
                                                </div>

                                                <div className="mt-3 grid grid-cols-2 gap-2">
                                                    <div className="rounded-xl bg-slate-50 px-3 py-2">
                                                        <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">
                                                            Data documental
                                                        </p>

                                                        <p className="mt-1 text-xs font-bold text-slate-700">
                                                            {formatarData(
                                                                item?.data_realizacao
                                                            )}
                                                        </p>
                                                    </div>

                                                    <div className="rounded-xl bg-slate-50 px-3 py-2">
                                                        <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">
                                                            Substituída em
                                                        </p>

                                                        <p className="mt-1 text-xs font-bold text-slate-700">
                                                            {formatarDataHora(
                                                                item?.arquivado_em
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>

                                                <button
                                                    type="button"
                                                    disabled={abrindo}
                                                    onClick={() =>
                                                        abrirVersaoAnterior(
                                                            item
                                                        )
                                                    }
                                                    className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-black text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
                                                >
                                                    {abrindo ? (
                                                        <LoaderCircle className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <ExternalLink className="h-4 w-4" />
                                                    )}

                                                    {abrindo
                                                        ? "Abrindo..."
                                                        : "Abrir PDF"}
                                                </button>
                                            </article>
                                        );
                                    }
                                )}
                            </div>
                        )}

                    {Boolean(erroAbertura) && (
                        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                            {erroAbertura}
                        </div>
                    )}
                </div>

                <footer className="border-t border-slate-200 bg-slate-50 px-5 py-3">
                    <p className="text-[10px] font-semibold leading-relaxed text-slate-500">
                        As versões anteriores são preservadas para rastreabilidade documental.
                    </p>
                </footer>
            </section>
        </div>
    );
}

export default HistoricoCertificadoDrawer;