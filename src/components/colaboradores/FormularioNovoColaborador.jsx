/* eslint-disable no-unused-vars */
import React from "react";
import { Upload, Plus, UserPlus } from "lucide-react";
import { Card } from "../commonComponents";
import { FileUploadAviso, validarArquivoAntesUpload, validarListaArquivosAntesUpload } from "../FileUploadAviso";
import { STATUS_CLASSIFICACAO_COLABORADOR } from "../../constants/sstConstants";
import { obterMatrizFuncao } from "../../services/colaboradorDocumentosService";
import { classNames, formatDate } from "../../utils/sstUtils";

export function FormularioNovoColaborador({
    novo,
    setNovo,
    empresasBanco = [],
    funcoesSugeridas = [],
    treinamentosAplicadosNovo = [],
    treinamentosParaAdicionarNovo = [],
    idsAdicionaisNovo = [],
    arquivosMassaAnaliseNovo = [],
    arquivosMassaReconhecidosNovo = [],
    arquivosMassaNaoReconhecidosNovo = [],
    removerTreinamentoNovo,
    adicionarTreinamentoNovo,
    adicionar,
    salvando = false,
}) {
    return (
<Card className="overflow-hidden">
    <div className="-m-5 mb-5 bg-gradient-to-br from-slate-950 to-slate-800 p-5 text-white">
        <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-white/10 p-3">
                <UserPlus className="h-6 w-6" />
            </div>
            <div>
                <h2 className="text-lg font-bold">Novo colaborador</h2>
                <p className="text-sm text-slate-300">Foto, código automático e matriz de treinamentos por função.</p>
            </div>
        </div>
    </div>

    <div className="space-y-3">
        <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                Nome completo
            </label>
            <input
                value={novo.nome}
                onChange={(e) => setNovo({ ...novo, nome: e.target.value })}
                placeholder="Ex.: João da Silva"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
            />
        </div>

        <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                Empresa terceirizada
            </label>
            <input
                value={novo.empresaNome}
                onChange={(e) => setNovo({ ...novo, empresaNome: e.target.value })}
                placeholder="Ex.: ABC Montagens"
                list="empresas-cadastradas"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
            />
            <datalist id="empresas-cadastradas">
                {empresasBanco.map((e) => (
                    <option key={e.id} value={e.nome} />
                ))}
            </datalist>
        </div>

        <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                Situação na obra
            </label>
            <select
                value={novo.statusMobilizacao}
                onChange={(e) => setNovo({ ...novo, statusMobilizacao: e.target.value })}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
            >
                {STATUS_CLASSIFICACAO_COLABORADOR.map((status) => (
                    <option key={status}>{status}</option>
                ))}
            </select>
            <p className="mt-1 text-xs text-slate-400">
                Liberado e Com pendência entram como mobilização ativa. Bloqueado, Em análise, Desmobilizado e Inativo ficam fora da contagem de mobilizados.
            </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                    Data de nascimento
                </label>
                <input
                    type="date"
                    value={novo.dataNascimento}
                    onChange={(e) => setNovo({ ...novo, dataNascimento: e.target.value })}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                />
            </div>
            <label className="flex min-h-[46px] cursor-pointer items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                <input
                    type="checkbox"
                    checked={novo.mostrarAniversarioDashboard !== false}
                    onChange={(e) => setNovo({ ...novo, mostrarAniversarioDashboard: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300"
                />
                Mostrar em aniversariantes
            </label>
        </div>

        <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                Função
            </label>
            <input
                value={novo.funcao}
                onChange={(e) =>
                    setNovo({
                        ...novo,
                        funcao: e.target.value,
                        treinamentosRemovidos: [],
                        treinamentosAdicionais: [],
                    })
                }
                placeholder="Ex.: Pedreiro, Soldador, Eletricista, Operador de PEMT"
                list="funcoes-sugeridas"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
            />
            <datalist id="funcoes-sugeridas">
                {funcoesSugeridas.map((item) => (
                    <option key={item.chave} value={item.rotulo} />
                ))}
            </datalist>

            {novo.funcao && (
                <div className="mt-2 rounded-2xl bg-slate-50 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                            Matriz aplicada: {obterMatrizFuncao(novo.funcao).rotulo}
                        </p>
                        <span className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-500 ring-1 ring-slate-200">
                            {treinamentosAplicadosNovo.length} exigência(s)
                        </span>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1.5">
                        {treinamentosAplicadosNovo.map((treinamento) => {
                            const extra = idsAdicionaisNovo.includes(Number(treinamento.id));

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
                                        onClick={() => removerTreinamentoNovo(treinamento.id)}
                                        title="Retirar este treinamento deste colaborador"
                                        className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-50 text-[10px] font-bold text-red-700 ring-1 ring-red-200 hover:bg-red-100"
                                    >
                                        ×
                                    </button>
                                    {treinamento.nome}
                                </span>
                            );
                        })}

                        {treinamentosAplicadosNovo.length === 0 && (
                            <span className="rounded-full bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-700 ring-1 ring-red-200">
                                Nenhum treinamento selecionado
                            </span>
                        )}
                    </div>

                    <div className="mt-3">
                        <select
                            value=""
                            onChange={(e) => {
                                adicionarTreinamentoNovo(e.target.value);
                                e.target.value = "";
                            }}
                            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                        >
                            <option value="">+ Adicionar treinamento/documento para este colaborador</option>
                            {treinamentosParaAdicionarNovo.map((treinamento) => (
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
            )}
        </div>

        <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                Matrícula da empresa (opcional)
            </label>
            <input
                value={novo.matricula}
                onChange={(e) => setNovo({ ...novo, matricula: e.target.value })}
                placeholder="Ex.: matrícula da empresa, crachá ou RE"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
            />
            <p className="mt-1 text-xs text-slate-400">
                O código do sistema é gerado automaticamente. A matrícula é opcional e serve para código da empresa, crachá ou RE.
            </p>
        </div>

        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-600 hover:bg-slate-100">
            <Upload className="h-4 w-4" />
            {novo.foto ? novo.foto.name : "Adicionar foto do colaborador"}
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
                    setNovo({ ...novo, foto: arquivo });
                }}
            />
        </label>
        <FileUploadAviso arquivo={novo.foto} tipo="fotoAuditoria" />

        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-3">
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-blue-200 bg-white px-4 py-4 text-sm font-semibold text-blue-700 hover:bg-blue-50">
                <Upload className="h-4 w-4" />
                {novo.documentosMassa?.length
                    ? `${novo.documentosMassa.length} documento(s) selecionado(s)`
                    : "Subir documentos de treinamentos em massa"}
                <input
                    type="file"
                    multiple
                    accept="application/pdf,image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => {
                        const arquivos = Array.from(e.target.files || []);
                        if (!validarListaArquivosAntesUpload(arquivos, "documentoSimples")) {
                            e.target.value = "";
                            return;
                        }
                        setNovo({
                            ...novo,
                            documentosMassa: arquivos,
                        });
                    }}
                />
            </label>
            <FileUploadAviso arquivos={novo.documentosMassa} tipo="documentoSimples" />

            <p className="mt-2 text-[11px] leading-relaxed text-blue-900">
                O sistema identifica o treinamento pelo nome do arquivo, por exemplo: ASO, EPI, INTEGRAÇÃO, NR-06, NR-11, NR-12, NR-18, NR-21, NR-25, NR-26, REGISTRO ou OS.
            </p>

            {arquivosMassaAnaliseNovo.length > 0 && (
                <div className="mt-3 max-h-52 space-y-2 overflow-y-auto rounded-2xl bg-white p-2 ring-1 ring-blue-100 scrollbar-discreta">
                    {arquivosMassaReconhecidosNovo.map((item) => (
                        <div key={item.nomeArquivo} className="rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-900 ring-1 ring-emerald-100">
                            <strong>{item.nomeArquivo}</strong>
                            <br />
                            {item.treinamento.nome} · Realização: {formatDate(item.dataRealizacao)} · Vencimento: {formatDate(item.dataVencimento)}
                        </div>
                    ))}

                    {arquivosMassaNaoReconhecidosNovo.map((item) => (
                        <div key={item.nomeArquivo} className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-800 ring-1 ring-red-100">
                            <strong>{item.nomeArquivo}</strong>
                            <br />
                            Não reconhecido. Ajuste o nome do arquivo ou envie pela aba Treinamentos.
                        </div>
                    ))}
                </div>
            )}
        </div>

        <button
            onClick={adicionar}
            disabled={salvando}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
            <Plus className="h-4 w-4" />
            {salvando ? "Salvando no banco..." : "Cadastrar colaborador"}
        </button>
    </div>
</Card>
    );
}
