import dashboardHeroPadrao from "../../assets/dashboard-hero-sst.webp";
import {
    FilePlus2,
    X,
} from "lucide-react";
import {
    treinamentoExclusivamenteManual,
} from "../../constants/treinamentosConstants";

export function ModalNovaFuncaoColaborador({
    aberto = false,
    novaFuncao,
    setNovaFuncao,
    treinamentosBase = [],
    onSalvar,
    onFechar,
}) {
    if (!aberto) return null;

    const treinamentosSelecionados =
        Array.isArray(
            novaFuncao?.treinamentos
        )
            ? novaFuncao.treinamentos
            : [];

    const treinamentosDisponiveisMatriz = treinamentosBase.filter(
        (treinamento) =>
            !treinamentoExclusivamenteManual(
                treinamento
            )
    );

    const alterarCampo = (
        campo,
        valor
    ) => {
        setNovaFuncao({
            ...novaFuncao,
            [campo]: valor,
        });
    };

    const alternarTreinamento = (
        treinamentoId,
        marcado
    ) => {
        if (treinamentoExclusivamenteManual(treinamentoId)) return;

        const atualizados =
            marcado
                ? [
                    ...treinamentosSelecionados,
                    treinamentoId,
                ]
                : treinamentosSelecionados.filter(
                    (id) =>
                        id !== treinamentoId
                );

        setNovaFuncao({
            ...novaFuncao,
            treinamentos:
                Array.from(
                    new Set(
                        atualizados
                    )
                ),
        });
    };

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-hidden bg-slate-950/70 p-4 backdrop-blur-sm">
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="nova-funcao-titulo"
                className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl"
            >
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
                                <FilePlus2 className="h-6 w-6" />
                            </span>

                            <div className="min-w-0">
                                <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">
                                    Gerenciamento de matrizes
                                </p>

                                <h2
                                    id="nova-funcao-titulo"
                                    className="mt-1 text-2xl font-black leading-tight text-white"
                                >
                                    Nova função
                                </h2>

                                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-100/95">
                                    Crie uma função personalizada, defina as palavras-chave de identificação e selecione os treinamentos e documentos obrigatórios.
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

                <div className="scrollbar-discreta min-h-0 flex-1 overflow-y-auto px-6 py-5">
                    <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
                                    Nome da função
                                </label>

                                <input
                                    value={
                                        novaFuncao?.rotulo ||
                                        ""
                                    }
                                    onChange={(evento) =>
                                        alterarCampo(
                                            "rotulo",
                                            evento.target.value
                                        )
                                    }
                                    placeholder="Ex.: Operador de rolo compactador"
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
                                    Palavras-chave
                                </label>

                                <input
                                    value={
                                        novaFuncao?.termos ||
                                        ""
                                    }
                                    onChange={(evento) =>
                                        alterarCampo(
                                            "termos",
                                            evento.target.value
                                        )
                                    }
                                    placeholder="Ex.: rolo, compactador, operador"
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                />

                                <p className="mt-2 text-xs leading-5 text-slate-500">
                                    Separe os termos por vírgula. O sistema utiliza essas palavras para identificar a matriz correta.
                                </p>
                            </div>
                        </div>
                    </section>

                    <section className="mt-5">
                        <div className="mb-4">
                            <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                                Treinamentos e documentos obrigatórios
                            </p>

                            <p className="mt-1 text-sm text-slate-500">
                                Marque todos os itens exigidos para a nova função.
                            </p>
                        </div>

                        <div className="mb-4 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs font-semibold leading-relaxed text-blue-800">
                            CIPA, NR-20 e Brigadista não podem compor matriz de função. Esses itens continuam sendo atribuídos somente no cadastro individual do colaborador.
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                            {treinamentosDisponiveisMatriz.map(
                                (treinamento) => {
                                    const marcado =
                                        treinamentosSelecionados.includes(
                                            treinamento.id
                                        );

                                    return (
                                        <label
                                            key={treinamento.id}
                                            className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${
                                                marcado
                                                    ? "border-emerald-300 bg-emerald-50"
                                                    : "border-slate-200 bg-white hover:bg-slate-50"
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={marcado}
                                                onChange={(evento) =>
                                                    alternarTreinamento(
                                                        treinamento.id,
                                                        evento.target.checked
                                                    )
                                                }
                                                className="mt-1 h-4 w-4 rounded border-slate-300"
                                            />

                                            <span className="min-w-0">
                                                <strong className="block text-sm font-black text-slate-900">
                                                    {treinamento.nome}
                                                </strong>

                                                <span className="mt-1 block text-xs text-slate-500">
                                                    {treinamento.base ||
                                                        `Código ${treinamento.id}`}
                                                </span>
                                            </span>
                                        </label>
                                    );
                                }
                            )}
                        </div>
                    </section>
                </div>

                <footer className="shrink-0 border-t border-slate-200 bg-white px-6 py-4 shadow-[0_-14px_35px_rgba(15,23,42,0.08)]">
                    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                        <button
                            type="button"
                            onClick={onFechar}
                            className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
                        >
                            Cancelar
                        </button>

                        <button
                            type="button"
                            onClick={onSalvar}
                            className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-6 py-3 text-sm font-black text-white shadow-sm transition hover:bg-slate-800"
                        >
                            Salvar função
                        </button>
                    </div>
                </footer>
            </section>
        </div>
    );
}
