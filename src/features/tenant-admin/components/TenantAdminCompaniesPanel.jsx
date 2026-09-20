import {
    useState,
} from "react";

import {
    ArrowLeft,
    Building2,
    RefreshCw,
} from "lucide-react";

function textoSeguro(
    valor,
    fallback = "—"
) {
    const texto =
        String(
            valor ?? ""
        ).trim();

    return texto || fallback;
}

function StatusPill({
    valor,
}) {
    const normalizado =
        String(
            valor || ""
        )
            .trim()
            .toLowerCase();

    const ativo =
        normalizado === "ativo" ||
        normalizado === "ativa" ||
        normalizado === "empresa ativa";

    const texto =
        normalizado === "empresa ativa"
            ? "Ativa"
            : textoSeguro(
                valor,
                "Não informado"
            );

    return (
        <span
            className={
                ativo
                    ? "inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-emerald-700"
                    : "inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-600"
            }
        >
            {texto}
        </span>
    );
}

function ResumoCard({
    titulo,
    valor,
    detalhe,
}) {
    return (
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold text-slate-500">
                {titulo}
            </p>

            <p className="mt-2 text-lg font-bold text-slate-950">
                {valor}
            </p>

            <p className="mt-1 text-[11px] text-slate-400">
                {detalhe}
            </p>
        </article>
    );
}

export function TenantAdminCompaniesPanel({
    empresas,
    carregando,
}) {
    const [
        empresaSelecionada,
        setEmpresaSelecionada,
    ] =
        useState(null);

    if (
        empresaSelecionada
    ) {
        return (
            <section className="mt-5">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <button
                        type="button"
                        onClick={
                            () =>
                                setEmpresaSelecionada(
                                    null
                                )
                        }
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Voltar às empresas
                    </button>

                    <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <div className="flex items-center gap-2 text-emerald-700">
                                <Building2 className="h-4 w-4" />

                                <span className="text-[10px] font-bold uppercase tracking-[0.1em]">
                                    Perfil da empresa
                                </span>
                            </div>

                            <h2 className="mt-2 text-2xl font-bold text-slate-950">
                                {
                                    textoSeguro(
                                        empresaSelecionada.nome
                                    )
                                }
                            </h2>

                            <p className="mt-1 font-mono text-xs text-slate-400">
                                {
                                    textoSeguro(
                                        empresaSelecionada.cnpj
                                    )
                                }
                            </p>
                        </div>

                        <StatusPill
                            valor={
                                empresaSelecionada.status
                            }
                        />
                    </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-3">
                    <ResumoCard
                        titulo="Tipo"
                        valor={
                            textoSeguro(
                                empresaSelecionada.tipo_empresa
                            )
                        }
                        detalhe="Classificação operacional"
                    />

                    <ResumoCard
                        titulo="Status"
                        valor={
                            textoSeguro(
                                empresaSelecionada.status
                            )
                        }
                        detalhe="Situação atual"
                    />

                    <ResumoCard
                        titulo="CNPJ"
                        valor={
                            textoSeguro(
                                empresaSelecionada.cnpj
                            )
                        }
                        detalhe="Identificação empresarial"
                    />
                </div>

                <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4">
                    <p className="text-xs font-semibold text-emerald-800">
                        A gestão de módulos foi centralizada no cliente para evitar configurações duplicadas.
                    </p>
                </div>
            </section>
        );
    }

    return (
        <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
                <h2 className="text-sm font-bold text-slate-900">
                    Empresas vinculadas
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                    Consulte as empresas vinculadas e abra o perfil administrativo quando necessário.
                </p>
            </div>

            {carregando ? (
                <div className="flex min-h-[150px] items-center justify-center">
                    <RefreshCw className="h-6 w-6 animate-spin text-emerald-600" />
                </div>
            ) : empresas.length === 0 ? (
                <div className="px-5 py-10 text-center text-xs text-slate-400">
                    Nenhuma empresa encontrada.
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead className="bg-slate-50">
                            <tr className="border-b border-slate-200">
                                <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">
                                    Empresa
                                </th>

                                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">
                                    Tipo
                                </th>

                                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">
                                    Status
                                </th>

                                <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">
                                    CNPJ
                                </th>

                                <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">
                                    Ação
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {empresas.map(
                                (
                                    empresa
                                ) => (
                                    <tr
                                        key={
                                            empresa.id
                                        }
                                        className="border-b border-slate-100 last:border-b-0"
                                    >
                                        <td className="px-5 py-4 text-sm font-bold text-slate-800">
                                            {
                                                textoSeguro(
                                                    empresa.nome
                                                )
                                            }
                                        </td>

                                        <td className="px-4 py-4 text-xs font-semibold text-slate-600">
                                            {
                                                textoSeguro(
                                                    empresa.tipo_empresa
                                                )
                                            }
                                        </td>

                                        <td className="px-4 py-4">
                                            <StatusPill
                                                valor={
                                                    empresa.status
                                                }
                                            />
                                        </td>

                                        <td className="px-5 py-4 text-right font-mono text-[11px] text-slate-500">
                                            {
                                                textoSeguro(
                                                    empresa.cnpj
                                                )
                                            }
                                        </td>

                                        <td className="px-5 py-4 text-right">
                                            <button
                                                type="button"
                                                onClick={
                                                    () =>
                                                        setEmpresaSelecionada(
                                                            empresa
                                                        )
                                                }
                                                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-800"
                                            >
                                                Abrir perfil
                                            </button>
                                        </td>
                                    </tr>
                                )
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}