import React, { useMemo, useState } from "react";
import { Upload } from "lucide-react";
import { FileUploadAviso, validarArquivoAntesUpload } from "../FileUploadAviso";
import { STATUS_CLASSIFICACAO_COLABORADOR, treinamentosBase } from "../../constants/sstConstants";
import {
    obterStatusInicialColaborador,
    obterMatrizFuncao,
    treinamentosObrigatoriosFuncao,
    obterTreinamento,
} from "../../services/colaboradorDocumentosService";
import { classNames } from "../../utils/sstUtils";

export function ModalRevisaoColaborador({
    colaboradorEdicao,
    setColaboradorEdicao,
    empresasBanco = [],
    funcoesSugeridas = [],
    onAtualizarColaborador,
}) {
    const [salvandoEdicaoColaborador, setSalvandoEdicaoColaborador] = useState(false);

    const idsBaseEdicao = useMemo(() => {
        if (!colaboradorEdicao?.funcao) return [];
        return treinamentosObrigatoriosFuncao(colaboradorEdicao.funcao).map((treinamento) => Number(treinamento.id));
    }, [colaboradorEdicao?.funcao]);

    const idsRemovidosEdicao = useMemo(
        () => (colaboradorEdicao?.treinamentosRemovidos || []).map(Number),
        [colaboradorEdicao?.treinamentosRemovidos]
    );

    const idsAdicionaisEdicao = useMemo(
        () => (colaboradorEdicao?.treinamentosAdicionais || []).map(Number),
        [colaboradorEdicao?.treinamentosAdicionais]
    );

    const idsAplicadosEdicao = useMemo(
        () => Array.from(new Set([...idsBaseEdicao, ...idsAdicionaisEdicao])).filter(
            (id) => !idsRemovidosEdicao.includes(Number(id))
        ),
        [idsBaseEdicao, idsAdicionaisEdicao, idsRemovidosEdicao]
    );

    const treinamentosAplicadosEdicao = useMemo(
        () => idsAplicadosEdicao.map((id) => obterTreinamento(id)).filter(Boolean),
        [idsAplicadosEdicao]
    );

    const treinamentosParaAdicionarEdicao = useMemo(
        () => treinamentosBase.filter((treinamento) => !idsAplicadosEdicao.includes(Number(treinamento.id))),
        [idsAplicadosEdicao]
    );

    if (!colaboradorEdicao) return null;

    const fechar = () => {
        setColaboradorEdicao(null);
    };

    const atualizarEdicao = (dados) => {
        setColaboradorEdicao((atual) => ({
            ...atual,
            ...dados,
        }));
    };

    const removerTreinamentoEdicao = (treinamentoId) => {
        const id = Number(treinamentoId);
        const baseDaFuncao = idsBaseEdicao.includes(id);

        if (baseDaFuncao) {
            atualizarEdicao({
                treinamentosRemovidos: Array.from(new Set([...idsRemovidosEdicao, id])),
            });
            return;
        }

        atualizarEdicao({
            treinamentosAdicionais: idsAdicionaisEdicao.filter((item) => item !== id),
        });
    };

    const adicionarTreinamentoEdicao = (treinamentoId) => {
        const id = Number(treinamentoId);
        if (!id) return;

        if (idsBaseEdicao.includes(id)) {
            atualizarEdicao({
                treinamentosRemovidos: idsRemovidosEdicao.filter((item) => item !== id),
            });
            return;
        }

        atualizarEdicao({
            treinamentosAdicionais: Array.from(new Set([...idsAdicionaisEdicao, id])),
        });
    };

    const salvarRevisaoColaborador = async () => {
        if (!colaboradorEdicao?.nome?.trim() || !colaboradorEdicao?.empresaNome?.trim() || !colaboradorEdicao?.funcao?.trim()) {
            alert("Preencha nome, empresa e função.");
            return;
        }

        setSalvandoEdicaoColaborador(true);

        const ok = await onAtualizarColaborador({
            id: colaboradorEdicao.id,
            nome: colaboradorEdicao.nome.trim(),
            empresaNome: colaboradorEdicao.empresaNome.trim(),
            funcao: colaboradorEdicao.funcao.trim(),
            matricula: colaboradorEdicao.matricula.trim(),
            dataNascimento: colaboradorEdicao.dataNascimento || "",
            mostrarAniversarioDashboard: colaboradorEdicao.mostrarAniversarioDashboard !== false,
            status: colaboradorEdicao.status || "Ativo",
            statusMobilizacao: colaboradorEdicao.statusMobilizacao || obterStatusInicialColaborador(),
            treinamentosRemovidos: colaboradorEdicao.treinamentosRemovidos || [],
            treinamentosAdicionais: colaboradorEdicao.treinamentosAdicionais || [],
            codigoFuncionario: colaboradorEdicao.codigoFuncionarioOriginal || colaboradorEdicao.codigoFuncionario,
            foto: colaboradorEdicao.foto,
            fotoAtual: colaboradorEdicao.fotoAtual,
            fotoNomeAtual: colaboradorEdicao.fotoNomeAtual,
        });

        setSalvandoEdicaoColaborador(false);

        if (ok) {
            fechar();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-slate-950/70 p-4">
            <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl">
                <div className="shrink-0 border-b border-slate-200 bg-white p-6 pb-4">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Revisão de dados do colaborador</p>
                            <h2 className="mt-1 text-2xl font-bold text-slate-950">{colaboradorEdicao.nome}</h2>
                            <p className="mt-1 text-sm text-slate-500">Código do sistema: {colaboradorEdicao.codigoFuncionario}</p>
                        </div>
                        <button
                            onClick={fechar}
                            className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                        >
                            Fechar
                        </button>
                    </div>
                </div>

                <div className="scrollbar-discreta flex-1 overflow-y-auto px-6 py-5">
                    <div className="grid gap-3 md:grid-cols-2">
                        <div className="md:col-span-2">
                            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Nome completo</label>
                            <input
                                value={colaboradorEdicao.nome}
                                onChange={(e) => atualizarEdicao({ nome: e.target.value })}
                                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Empresa</label>
                            <input
                                value={colaboradorEdicao.empresaNome}
                                onChange={(e) => atualizarEdicao({ empresaNome: e.target.value })}
                                list="empresas-cadastradas-edicao"
                                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                            />
                            <datalist id="empresas-cadastradas-edicao">
                                {empresasBanco.map((e) => (
                                    <option key={e.id} value={e.nome} />
                                ))}
                            </datalist>
                        </div>

                        <div>
                            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Função</label>
                            <input
                                value={colaboradorEdicao.funcao}
                                onChange={(e) => atualizarEdicao({ funcao: e.target.value })}
                                list="funcoes-sugeridas-edicao"
                                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                            />
                            <datalist id="funcoes-sugeridas-edicao">
                                {funcoesSugeridas.map((item) => (
                                    <option key={item.chave} value={item.rotulo} />
                                ))}
                            </datalist>
                        </div>

                        <div>
                            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Matrícula da empresa (opcional)</label>
                            <input
                                value={colaboradorEdicao.matricula}
                                onChange={(e) => atualizarEdicao({ matricula: e.target.value })}
                                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Status</label>
                            <select
                                value={colaboradorEdicao.status}
                                onChange={(e) => atualizarEdicao({ status: e.target.value })}
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                            >
                                <option>Ativo</option>
                                <option>Inativo</option>
                                <option>Bloqueado</option>
                            </select>
                        </div>

                        <div>
                            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Situação na obra</label>
                            <select
                                value={colaboradorEdicao.statusMobilizacao}
                                onChange={(e) => atualizarEdicao({ statusMobilizacao: e.target.value })}
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                            >
                                {STATUS_CLASSIFICACAO_COLABORADOR.map((status) => (
                                    <option key={status}>{status}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Data de nascimento</label>
                            <input
                                type="date"
                                value={colaboradorEdicao.dataNascimento || ""}
                                onChange={(e) => atualizarEdicao({ dataNascimento: e.target.value })}
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                            />
                        </div>

                        <label className="flex min-h-[46px] cursor-pointer items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                            <input
                                type="checkbox"
                                checked={colaboradorEdicao.mostrarAniversarioDashboard !== false}
                                onChange={(e) => atualizarEdicao({ mostrarAniversarioDashboard: e.target.checked })}
                                className="h-4 w-4 rounded border-slate-300"
                            />
                            Mostrar em aniversariantes do mês
                        </label>

                        <div className="md:col-span-2 rounded-2xl bg-slate-50 p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                                    Matriz aplicada: {obterMatrizFuncao(colaboradorEdicao.funcao).rotulo}
                                </p>
                                <span className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-500 ring-1 ring-slate-200">
                                    {treinamentosAplicadosEdicao.length} exigência(s)
                                </span>
                            </div>

                            <div className="mt-2 flex flex-wrap gap-1.5">
                                {treinamentosAplicadosEdicao.map((treinamento) => {
                                    const extra = idsAdicionaisEdicao.includes(Number(treinamento.id));

                                    return (
                                        <span
                                            key={treinamento.id}
                                            className={classNames(
                                                "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium ring-1",
                                                extra
                                                    ? "bg-blue-50 text-blue-700 ring-blue-200"
                                                    : "bg-white text-slate-600 ring-slate-200"
                                            )}
                                        >
                                            <button
                                                type="button"
                                                onClick={() => removerTreinamentoEdicao(treinamento.id)}
                                                title="Retirar este treinamento deste colaborador"
                                                className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-50 text-[10px] font-bold text-red-700 ring-1 ring-red-200 hover:bg-red-100"
                                            >
                                                ×
                                            </button>
                                            {treinamento.nome}
                                        </span>
                                    );
                                })}

                                {treinamentosAplicadosEdicao.length === 0 && (
                                    <span className="rounded-full bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-700 ring-1 ring-red-200">
                                        Nenhum treinamento selecionado
                                    </span>
                                )}
                            </div>

                            <div className="mt-3">
                                <select
                                    value=""
                                    onChange={(e) => {
                                        adicionarTreinamentoEdicao(e.target.value);
                                        e.target.value = "";
                                    }}
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                >
                                    <option value="">+ Adicionar treinamento/documento para este colaborador</option>
                                    {treinamentosParaAdicionarEdicao.map((treinamento) => (
                                        <option key={treinamento.id} value={treinamento.id}>
                                            {treinamento.nome}
                                        </option>
                                    ))}
                                </select>
                                <p className="mt-1 text-[11px] text-slate-400">
                                    Use o × para retirar itens que não se aplicam e o campo acima para adicionar exigências específicas.
                                </p>
                            </div>
                        </div>

                        <div className="md:col-span-2">
                            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Foto do colaborador</label>
                            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-600 hover:bg-slate-100">
                                <Upload className="h-4 w-4" />
                                {colaboradorEdicao.foto ? colaboradorEdicao.foto.name : colaboradorEdicao.fotoNomeAtual || "Alterar foto do colaborador"}
                                <input
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp"
                                    className="hidden"
                                    onChange={(e) => {
                                        const arquivo = e.target.files?.[0] || null;
                                        if (arquivo && !validarArquivoAntesUpload(arquivo, "fotoAuditoria")) {
                                            e.target.value = "";
                                            return;
                                        }
                                        atualizarEdicao({ foto: arquivo });
                                    }}
                                />
                            </label>
                            <FileUploadAviso arquivo={colaboradorEdicao.foto} tipo="fotoAuditoria" />
                        </div>
                    </div>
                </div>

                <div className="shrink-0 border-t border-slate-200 bg-white p-6">
                    <div className="flex flex-col gap-3 sm:flex-row">
                        <button
                            onClick={salvarRevisaoColaborador}
                            disabled={salvandoEdicaoColaborador}
                            className="flex-1 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                        >
                            {salvandoEdicaoColaborador ? "Salvando alterações..." : "Salvar alterações"}
                        </button>
                        <button
                            onClick={fechar}
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
