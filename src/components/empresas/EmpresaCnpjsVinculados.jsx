import {
    useCallback,
    useEffect,
    useState,
} from "react";

import {
    Building2,
    Plus,
    RefreshCw,
    Save,
    Trash2,
    X,
} from "lucide-react";

import { supabase } from "../../lib/supabaseClient";

import {
    adicionarCnpjEmpresa,
    atualizarCnpjEmpresa,
    excluirCnpjEmpresa,
    formatarCnpjEmpresa,
    listarCnpjsEmpresa,
} from "../../services/empresaCnpjsService";

const FORMULARIO_INICIAL = {
    cnpj: "",
    tipo: "FILIAL",
    situacao: "ATIVO",
    vigenciaInicio: "",
    vigenciaFim: "",
    razaoSocialDocumental: "",
    observacao: "",
};

function formatarEntradaCnpj(valor = "") {
    const digitos = String(valor || "")
        .replace(/\D/g, "")
        .slice(0, 14);

    if (digitos.length <= 2) {
        return digitos;
    }

    if (digitos.length <= 5) {
        return digitos.replace(
            /^(\d{2})(\d+)/,
            "$1.$2"
        );
    }

    if (digitos.length <= 8) {
        return digitos.replace(
            /^(\d{2})(\d{3})(\d+)/,
            "$1.$2.$3"
        );
    }

    if (digitos.length <= 12) {
        return digitos.replace(
            /^(\d{2})(\d{3})(\d{3})(\d+)/,
            "$1.$2.$3/$4"
        );
    }

    return digitos.replace(
        /^(\d{2})(\d{3})(\d{3})(\d{4})(\d+)/,
        "$1.$2.$3/$4-$5"
    );
}

function rotuloTipo(tipo = "OUTRO") {
    if (tipo === "MATRIZ") {
        return "Matriz";
    }

    if (tipo === "FILIAL") {
        return "Filial";
    }

    return "Outro";
}

function rotuloSituacao(situacao = "ATIVO") {
    return situacao === "HISTORICO"
        ? "Histórico"
        : "Ativo";
}

function formatarDataVisual(valor = "") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
        return "";
    }

    const [ano, mes, dia] =
        valor.split("-");

    return `${dia}/${mes}/${ano}`;
}

function criarFormularioVinculo(vinculo = {}) {
    return {
        tipo:
            vinculo.tipo ||
            "OUTRO",

        situacao:
            vinculo.principal
                ? "ATIVO"
                : (
                    vinculo.situacao ||
                    "ATIVO"
                ),

        vigenciaInicio:
            vinculo.vigenciaInicio ||
            "",

        vigenciaFim:
            vinculo.vigenciaFim ||
            "",

        razaoSocialDocumental:
            vinculo.razaoSocialDocumental ||
            "",

        observacao:
            vinculo.observacao ||
            "",
    };
}

function VinculoCnpjCard({
    vinculo,
    empresaId,
    onAtualizado,
}) {
    const [editando, setEditando] =
        useState(false);

    const [salvando, setSalvando] =
        useState(false);

    const [excluindo, setExcluindo] =
        useState(false);

    const [erro, setErro] =
        useState("");

    const [formulario, setFormulario] =
        useState(
            criarFormularioVinculo(
                vinculo
            )
        );

    useEffect(
        () => {
            setFormulario(
                criarFormularioVinculo(
                    vinculo
                )
            );

            setErro("");
        },
        [
            vinculo,
        ]
    );

    const cnpjVisual =
        vinculo.cnpjFormatado ||
        formatarCnpjEmpresa(
            vinculo.cnpj
        ) ||
        vinculo.cnpj;

    const salvar =
        async () => {
            setSalvando(true);
            setErro("");

            try {
                await atualizarCnpjEmpresa({
                    supabase,
                    vinculoId:
                        vinculo.id,
                    empresaId,
                    tipo:
                        formulario.tipo,
                    situacao:
                        vinculo.principal
                            ? "ATIVO"
                            : formulario.situacao,
                    vigenciaInicio:
                        formulario.vigenciaInicio,
                    vigenciaFim:
                        vinculo.principal
                            ? null
                            : formulario.vigenciaFim,
                    razaoSocialDocumental:
                        formulario.razaoSocialDocumental,
                    observacao:
                        formulario.observacao,
                });

                setEditando(false);

                await onAtualizado();
            } catch (error) {
                setErro(
                    error?.message ||
                    "Não foi possível atualizar o CNPJ."
                );
            } finally {
                setSalvando(false);
            }
        };

    const excluir =
        async () => {
            if (vinculo.principal) {
                return;
            }

            const confirmado =
                typeof window !== "undefined" &&
                window.confirm(
                    `Excluir o vínculo do CNPJ ${cnpjVisual}?`
                );

            if (!confirmado) {
                return;
            }

            setExcluindo(true);
            setErro("");

            try {
                await excluirCnpjEmpresa({
                    supabase,
                    vinculoId:
                        vinculo.id,
                    empresaId,
                });

                await onAtualizado();
            } catch (error) {
                setErro(
                    error?.message ||
                    "Não foi possível excluir o CNPJ."
                );
            } finally {
                setExcluindo(false);
            }
        };

    return (
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <strong className="text-sm font-extrabold text-slate-900">
                            {cnpjVisual}
                        </strong>

                        {vinculo.principal && (
                            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-emerald-700">
                                Principal
                            </span>
                        )}

                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                            {rotuloTipo(
                                vinculo.tipo
                            )}
                        </span>

                        <span
                            className={
                                vinculo.situacao ===
                                "HISTORICO"
                                    ? "rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700"
                                    : "rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-700"
                            }
                        >
                            {rotuloSituacao(
                                vinculo.situacao
                            )}
                        </span>
                    </div>

                    {vinculo.razaoSocialDocumental && (
                        <p className="mt-1 text-xs font-medium text-slate-600">
                            {
                                vinculo.razaoSocialDocumental
                            }
                        </p>
                    )}

                    {(
                        vinculo.vigenciaInicio ||
                        vinculo.vigenciaFim
                    ) && (
                        <p className="mt-1 text-xs text-slate-500">
                            Vigência:{" "}
                            {
                                formatarDataVisual(
                                    vinculo.vigenciaInicio
                                ) ||
                                "sem início definido"
                            }
                            {" → "}
                            {
                                formatarDataVisual(
                                    vinculo.vigenciaFim
                                ) ||
                                "atual"
                            }
                        </p>
                    )}

                    {vinculo.observacao && (
                        <p className="mt-1 text-xs text-slate-500">
                            {vinculo.observacao}
                        </p>
                    )}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                    <button
                        type="button"
                        onClick={() =>
                            setEditando(
                                (atual) =>
                                    !atual
                            )
                        }
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                    >
                        {editando
                            ? "Fechar"
                            : "Editar"}
                    </button>

                    {!vinculo.principal && (
                        <button
                            type="button"
                            onClick={excluir}
                            disabled={excluindo}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <Trash2 className="h-3.5 w-3.5" />

                            {excluindo
                                ? "Excluindo..."
                                : "Excluir"}
                        </button>
                    )}
                </div>
            </div>

            {editando && (
                <div className="mt-4 border-t border-slate-100 pt-4">
                    <div className="grid gap-3 md:grid-cols-2">
                        <div>
                            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                                Tipo
                            </label>

                            <select
                                value={
                                    formulario.tipo
                                }
                                onChange={(event) =>
                                    setFormulario(
                                        (atual) => ({
                                            ...atual,
                                            tipo:
                                                event.target.value,
                                        })
                                    )
                                }
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400"
                            >
                                <option value="MATRIZ">
                                    Matriz
                                </option>

                                <option value="FILIAL">
                                    Filial
                                </option>

                                <option value="OUTRO">
                                    Outro
                                </option>
                            </select>
                        </div>

                        <div>
                            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                                Situação
                            </label>

                            <select
                                value={
                                    vinculo.principal
                                        ? "ATIVO"
                                        : formulario.situacao
                                }
                                disabled={
                                    vinculo.principal
                                }
                                onChange={(event) =>
                                    setFormulario(
                                        (atual) => ({
                                            ...atual,
                                            situacao:
                                                event.target.value,
                                        })
                                    )
                                }
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400 disabled:bg-slate-100 disabled:text-slate-500"
                            >
                                <option value="ATIVO">
                                    Ativo
                                </option>

                                <option value="HISTORICO">
                                    Histórico
                                </option>
                            </select>
                        </div>

                        <div>
                            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                                Vigência inicial
                            </label>

                            <input
                                type="date"
                                value={
                                    formulario.vigenciaInicio
                                }
                                onChange={(event) =>
                                    setFormulario(
                                        (atual) => ({
                                            ...atual,
                                            vigenciaInicio:
                                                event.target.value,
                                        })
                                    )
                                }
                                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                                Vigência final
                            </label>

                            <input
                                type="date"
                                value={
                                    vinculo.principal
                                        ? ""
                                        : formulario.vigenciaFim
                                }
                                disabled={
                                    vinculo.principal
                                }
                                onChange={(event) =>
                                    setFormulario(
                                        (atual) => ({
                                            ...atual,
                                            vigenciaFim:
                                                event.target.value,
                                        })
                                    )
                                }
                                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 disabled:bg-slate-100"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                                Razão social documental
                            </label>

                            <input
                                value={
                                    formulario.razaoSocialDocumental
                                }
                                onChange={(event) =>
                                    setFormulario(
                                        (atual) => ({
                                            ...atual,
                                            razaoSocialDocumental:
                                                event.target.value,
                                        })
                                    )
                                }
                                placeholder="Nome que aparece nos documentos deste CNPJ"
                                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                                Observação
                            </label>

                            <textarea
                                rows={2}
                                value={
                                    formulario.observacao
                                }
                                onChange={(event) =>
                                    setFormulario(
                                        (atual) => ({
                                            ...atual,
                                            observacao:
                                                event.target.value,
                                        })
                                    )
                                }
                                placeholder="Ex.: antiga filial de São José dos Campos"
                                className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
                            />
                        </div>
                    </div>

                    {erro && (
                        <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                            {erro}
                        </p>
                    )}

                    <div className="mt-3 flex justify-end">
                        <button
                            type="button"
                            onClick={salvar}
                            disabled={salvando}
                            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <Save className="h-4 w-4" />

                            {salvando
                                ? "Salvando..."
                                : "Salvar vínculo"}
                        </button>
                    </div>
                </div>
            )}
        </article>
    );
}

export function EmpresaCnpjsVinculados({
    empresa,
    onAlterarCnpjPrincipal,
    statusEmpresa = "Empresa ativa",
    onAlterarStatusEmpresa,
}) {
    const empresaId =
        empresa?.id || "";

    const [vinculos, setVinculos] =
        useState([]);

    const [carregando, setCarregando] =
        useState(false);

    const [erro, setErro] =
        useState("");

    const [
        exibindoFormulario,
        setExibindoFormulario,
    ] = useState(false);

    const [
        salvandoNovo,
        setSalvandoNovo,
    ] = useState(false);

    const [novoCnpj, setNovoCnpj] =
        useState({
            ...FORMULARIO_INICIAL,
        });

    const carregar =
        useCallback(
            async () => {
                if (!empresaId) {
                    setVinculos([]);
                    return;
                }

                setCarregando(true);
                setErro("");

                try {
                    const dados =
                        await listarCnpjsEmpresa({
                            supabase,
                            empresaId,
                        });

                    setVinculos(
                        dados
                    );
                } catch (error) {
                    setErro(
                        error?.message ||
                        "Não foi possível carregar os CNPJs vinculados."
                    );
                } finally {
                    setCarregando(false);
                }
            },
            [
                empresaId,
            ]
        );

    useEffect(
        () => {
            carregar();
        },
        [
            carregar,
        ]
    );

    useEffect(
        () => {
            setExibindoFormulario(false);

            setNovoCnpj({
                ...FORMULARIO_INICIAL,
            });
        },
        [
            empresaId,
        ]
    );

    const adicionar =
        async () => {
            setSalvandoNovo(true);
            setErro("");

            try {
                await adicionarCnpjEmpresa({
                    supabase,
                    empresaId,
                    cnpj:
                        novoCnpj.cnpj,
                    tipo:
                        novoCnpj.tipo,
                    situacao:
                        novoCnpj.situacao,
                    vigenciaInicio:
                        novoCnpj.vigenciaInicio,
                    vigenciaFim:
                        novoCnpj.vigenciaFim,
                    razaoSocialDocumental:
                        novoCnpj.razaoSocialDocumental,
                    observacao:
                        novoCnpj.observacao,
                });

                setNovoCnpj({
                    ...FORMULARIO_INICIAL,
                });

                setExibindoFormulario(false);

                await carregar();
            } catch (error) {
                setErro(
                    error?.message ||
                    "Não foi possível adicionar o CNPJ."
                );
            } finally {
                setSalvandoNovo(false);
            }
        };

    if (!empresaId) {
        return null;
    }

    return (
        <section className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white">
                        <Building2 className="h-5 w-5" />
                    </div>

                    <div className="min-w-0">
                        <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
                            Cadastro empresarial
                        </p>

                        <h4 className="text-sm font-extrabold text-slate-900">
                            CNPJs / Matriz e Filiais
                        </h4>

                        <p className="mt-0.5 text-xs leading-5 text-slate-500">
                            Gerencie matriz, filiais e CNPJs históricos vinculados à mesma empresa.
                        </p>
                    </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                    <button
                        type="button"
                        onClick={carregar}
                        disabled={carregando}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                    >
                        <RefreshCw
                            className={
                                carregando
                                    ? "h-3.5 w-3.5 animate-spin"
                                    : "h-3.5 w-3.5"
                            }
                        />

                        Atualizar
                    </button>

                    <button
                        type="button"
                        onClick={() =>
                            setExibindoFormulario(
                                (atual) =>
                                    !atual
                            )
                        }
                        className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white transition hover:bg-slate-800"
                    >
                        {exibindoFormulario ? (
                            <X className="h-3.5 w-3.5" />
                        ) : (
                            <Plus className="h-3.5 w-3.5" />
                        )}

                        {exibindoFormulario
                            ? "Cancelar"
                            : "Adicionar CNPJ"}
                    </button>
                </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div>
                    <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                        CNPJ principal
                    </label>

                    <input
                        value={empresa?.cnpj || ""}
                        onChange={(event) =>
                            onAlterarCnpjPrincipal?.(
                                formatarEntradaCnpj(
                                    event.target.value
                                )
                            )
                        }
                        placeholder="00.000.000/0000-00"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400"
                    />

                    <p className="mt-1 text-[11px] leading-4 text-slate-400">
                        Referência principal atual da empresa.
                    </p>
                </div>

                <div>
                    <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                        Status da empresa
                    </label>

                    <select
                        value={statusEmpresa}
                        onChange={(event) =>
                            onAlterarStatusEmpresa?.(
                                event.target.value
                            )
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400"
                    >
                        <option>
                            Empresa ativa
                        </option>

                        <option>
                            Empresa inativa
                        </option>

                        <option>
                            Empresa inapta
                        </option>

                        <option>
                            Empresa suspensa
                        </option>
                    </select>

                    <p className="mt-1 text-[11px] leading-4 text-slate-400">
                        Situação geral do cadastro da empresa.
                    </p>
                </div>
            </div>

            <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-800">
                <strong>
                    Regra geral do SafeScan:
                </strong>{" "}
                o CNPJ principal permanece como referência atual da empresa. Matriz, filiais e CNPJs históricos ficam vinculados ao mesmo cadastro para conferência documental.
            </div>

            {exibindoFormulario && (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                    <div>
                        <strong className="text-sm text-slate-900">
                            Novo CNPJ vinculado
                        </strong>

                        <p className="mt-0.5 text-xs text-slate-500">
                            Este vínculo não substitui automaticamente o CNPJ principal.
                        </p>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <div>
                            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                                CNPJ
                            </label>

                            <input
                                value={
                                    novoCnpj.cnpj
                                }
                                onChange={(event) =>
                                    setNovoCnpj(
                                        (atual) => ({
                                            ...atual,
                                            cnpj:
                                                formatarEntradaCnpj(
                                                    event.target.value
                                                ),
                                        })
                                    )
                                }
                                placeholder="00.000.000/0000-00"
                                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                                    Tipo
                                </label>

                                <select
                                    value={
                                        novoCnpj.tipo
                                    }
                                    onChange={(event) =>
                                        setNovoCnpj(
                                            (atual) => ({
                                                ...atual,
                                                tipo:
                                                    event.target.value,
                                            })
                                        )
                                    }
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400"
                                >
                                    <option value="MATRIZ">
                                        Matriz
                                    </option>

                                    <option value="FILIAL">
                                        Filial
                                    </option>

                                    <option value="OUTRO">
                                        Outro
                                    </option>
                                </select>
                            </div>

                            <div>
                                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                                    Situação
                                </label>

                                <select
                                    value={
                                        novoCnpj.situacao
                                    }
                                    onChange={(event) =>
                                        setNovoCnpj(
                                            (atual) => ({
                                                ...atual,
                                                situacao:
                                                    event.target.value,
                                            })
                                        )
                                    }
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400"
                                >
                                    <option value="ATIVO">
                                        Ativo
                                    </option>

                                    <option value="HISTORICO">
                                        Histórico
                                    </option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                                Vigência inicial
                            </label>

                            <input
                                type="date"
                                value={
                                    novoCnpj.vigenciaInicio
                                }
                                onChange={(event) =>
                                    setNovoCnpj(
                                        (atual) => ({
                                            ...atual,
                                            vigenciaInicio:
                                                event.target.value,
                                        })
                                    )
                                }
                                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                                Vigência final
                            </label>

                            <input
                                type="date"
                                value={
                                    novoCnpj.vigenciaFim
                                }
                                onChange={(event) =>
                                    setNovoCnpj(
                                        (atual) => ({
                                            ...atual,
                                            vigenciaFim:
                                                event.target.value,
                                        })
                                    )
                                }
                                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                                Razão social documental
                            </label>

                            <input
                                value={
                                    novoCnpj.razaoSocialDocumental
                                }
                                onChange={(event) =>
                                    setNovoCnpj(
                                        (atual) => ({
                                            ...atual,
                                            razaoSocialDocumental:
                                                event.target.value,
                                        })
                                    )
                                }
                                placeholder="Opcional — nome que aparece nos documentos deste estabelecimento"
                                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                                Observação
                            </label>

                            <textarea
                                rows={2}
                                value={
                                    novoCnpj.observacao
                                }
                                onChange={(event) =>
                                    setNovoCnpj(
                                        (atual) => ({
                                            ...atual,
                                            observacao:
                                                event.target.value,
                                        })
                                    )
                                }
                                placeholder="Ex.: antiga filial encerrada; documentos anteriores podem utilizar este CNPJ."
                                className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
                            />
                        </div>
                    </div>

                    <div className="mt-3 flex justify-end">
                        <button
                            type="button"
                            onClick={adicionar}
                            disabled={salvandoNovo}
                            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-extrabold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <Save className="h-4 w-4" />

                            {salvandoNovo
                                ? "Salvando..."
                                : "Salvar CNPJ"}
                        </button>
                    </div>
                </div>
            )}

            {erro && (
                <p className="mt-4 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                    {erro}
                </p>
            )}

            <div className="mt-4 space-y-3">
                {carregando ? (
                    <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-white py-8 text-sm font-semibold text-slate-500">
                        <RefreshCw className="h-4 w-4 animate-spin" />

                        Carregando CNPJs...
                    </div>
                ) : vinculos.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center">
                        <p className="text-sm font-bold text-slate-700">
                            Nenhum CNPJ vinculado localizado.
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                            Use “Adicionar CNPJ” para registrar matriz, filial ou vínculo histórico.
                        </p>
                    </div>
                ) : (
                    vinculos.map(
                        (vinculo) => (
                            <VinculoCnpjCard
                                key={
                                    vinculo.id
                                }
                                vinculo={
                                    vinculo
                                }
                                empresaId={
                                    empresaId
                                }
                                onAtualizado={
                                    carregar
                                }
                            />
                        )
                    )
                )}
            </div>
        </section>
    );
}

export default EmpresaCnpjsVinculados;
