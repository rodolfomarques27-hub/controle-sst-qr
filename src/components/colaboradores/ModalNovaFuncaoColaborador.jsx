import { treinamentoExclusivamenteManual } from "../../constants/treinamentosConstants";

export function ModalNovaFuncaoColaborador({
    aberto = false,
    novaFuncao,
    setNovaFuncao,
    treinamentosBase = [],
    onSalvar,
    onFechar,
}) {
    if (!aberto) return null;

    const treinamentosSelecionados = Array.isArray(novaFuncao?.treinamentos) ? novaFuncao.treinamentos : [];
    const treinamentosDisponiveisMatriz = treinamentosBase.filter(
        (treinamento) => !treinamentoExclusivamenteManual(treinamento)
    );

    const alterarCampo = (campo, valor) => {
        setNovaFuncao({
            ...novaFuncao,
            [campo]: valor,
        });
    };

    const alternarTreinamento = (treinamentoId, marcado) => {
        if (treinamentoExclusivamenteManual(treinamentoId)) return;

        const atualizados = marcado
            ? [...treinamentosSelecionados, treinamentoId]
            : treinamentosSelecionados.filter((id) => id !== treinamentoId);

        setNovaFuncao({
            ...novaFuncao,
            treinamentos: Array.from(new Set(atualizados)),
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-slate-950/70 p-4">
            <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl">
                <div className="shrink-0 border-b border-slate-200 bg-white p-6 pb-4">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Cadastro de função</p>
                            <h2 className="mt-1 text-2xl font-bold text-slate-950">Nova função e treinamentos obrigatórios</h2>
                            <p className="mt-1 text-sm text-slate-500">
                                Crie uma função personalizada e selecione quais treinamentos/documentos serão exigidos.
                            </p>
                        </div>
                        <button
                            onClick={onFechar}
                            className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                        >
                            Fechar
                        </button>
                    </div>
                </div>

                <div className="scrollbar-discreta flex-1 overflow-y-auto px-6 py-5">
                    <div className="grid gap-3 md:grid-cols-2">
                        <div>
                            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Nome da função</label>
                            <input
                                value={novaFuncao?.rotulo || ""}
                                onChange={(e) => alterarCampo("rotulo", e.target.value)}
                                placeholder="Ex.: Operador de rolo compactador"
                                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Palavras-chave</label>
                            <input
                                value={novaFuncao?.termos || ""}
                                onChange={(e) => alterarCampo("termos", e.target.value)}
                                placeholder="Ex.: rolo, compactador, operador"
                                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                            />
                            <p className="mt-1 text-xs text-slate-400">Separe por vírgula. O sistema usa isso para identificar a matriz.</p>
                        </div>
                    </div>

                    <div className="mt-5">
                        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                            Treinamentos/documentos obrigatórios
                        </p>

                        <p className="mb-3 rounded-2xl bg-blue-50 px-4 py-3 text-xs font-semibold leading-relaxed text-blue-700 ring-1 ring-blue-100">
                            CIPA, NR-20 e Brigadista não podem compor matriz de função. Esses itens são atribuídos somente no cadastro individual do colaborador.
                        </p>

                        <div className="grid gap-2 md:grid-cols-2">
                            {treinamentosDisponiveisMatriz.map((treinamento) => (
                                <label
                                    key={treinamento.id}
                                    className="flex cursor-pointer items-start gap-2 rounded-2xl border border-slate-200 bg-white p-3 text-sm hover:bg-slate-50"
                                >
                                    <input
                                        type="checkbox"
                                        checked={treinamentosSelecionados.includes(treinamento.id)}
                                        onChange={(e) => alternarTreinamento(treinamento.id, e.target.checked)}
                                        className="mt-1"
                                    />
                                    <span>
                                        <strong className="block text-slate-800">{treinamento.nome}</strong>
                                        <span className="text-xs text-slate-400">{treinamento.base}</span>
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="shrink-0 border-t border-slate-200 bg-white p-6">
                    <div className="flex flex-col gap-3 sm:flex-row">
                        <button
                            onClick={onSalvar}
                            className="flex-1 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
                        >
                            Salvar função
                        </button>

                        <button
                            onClick={onFechar}
                            className="flex-1 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-200"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
