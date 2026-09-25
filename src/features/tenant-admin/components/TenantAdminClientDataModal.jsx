import {
    useEffect,
    useState,
} from "react";

import {
    UserCog,
} from "lucide-react";

import dashboardHero from "../../../assets/dashboard-hero-sst.webp";

import {
    salvarDadosClienteTenantAdminService,
} from "../services/tenantAdminClientDataService.js";

const INPUT_CLASS =
    "mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400";

function texto(valor) {
    return String(
        valor ?? ""
    ).trim();
}

function emailValido(valor) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/i
        .test(
            texto(
                valor
            )
        );
}

function localizarEmpresaInicial(
    usuario,
    empresas
) {
    const lista =
        Array.isArray(
            empresas
        )
            ? empresas
            : [];

    const empresaId =
        texto(
            usuario?.empresa_id
        );

    if (
        empresaId
    ) {
        const encontrada =
            lista.find(
                (empresa) =>
                    texto(
                        empresa?.id
                    ) ===
                    empresaId
            );

        if (
            encontrada
        ) {
            return encontrada;
        }
    }

    const empresaUsuario =
        texto(
            usuario?.empresa
        ).toLowerCase();

    if (
        empresaUsuario
    ) {
        const encontrada =
            lista.find(
                (empresa) =>
                    texto(
                        empresa?.nome
                    ).toLowerCase() ===
                        empresaUsuario ||
                    texto(
                        empresa?.razao_social
                    ).toLowerCase() ===
                        empresaUsuario
            );

        if (
            encontrada
        ) {
            return encontrada;
        }
    }

    if (
        lista.length ===
        1
    ) {
        return lista[0];
    }

    return null;
}

function criarFormularioInicial(
    usuario,
    empresas
) {
    const empresa =
        localizarEmpresaInicial(
            usuario,
            empresas
        );

    return {
        adminNome:
            texto(
                usuario?.nome
            ),

        adminEmail:
            texto(
                usuario?.email
            ),

        adminFuncao:
            texto(
                usuario?.funcao
            ),

        empresaId:
            texto(
                empresa?.id
            ),

        empresaNome:
            texto(
                empresa?.nome
            ),

        empresaRazaoSocial:
            texto(
                empresa?.razao_social
            ),

        empresaResponsavel:
            texto(
                empresa?.responsavel
            ),

        empresaEmail:
            texto(
                empresa?.email
            ),

        cnpj:
            texto(
                empresa?.cnpj
            ),
    };
}

function Campo({
    titulo,
    children,
}) {
    return (
        <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">
                {titulo}
            </span>

            {children}
        </label>
    );
}

export function TenantAdminClientDataModal({
    tenantId,
    usuario,
    empresas,
    onClose,
    onSaved,
}) {
    const listaEmpresas =
        Array.isArray(
            empresas
        )
            ? empresas
            : [];

    const [
        form,
        setForm,
    ] =
        useState(
            () =>
                criarFormularioInicial(
                    usuario,
                    listaEmpresas
                )
        );

    const [
        salvando,
        setSalvando,
    ] =
        useState(false);

    const [
        erro,
        setErro,
    ] =
        useState("");

    useEffect(
        () => {
            const html =
                document.documentElement;

            const body =
                document.body;

            const htmlOverflowAnterior =
                html.style.overflow;

            const bodyOverflowAnterior =
                body.style.overflow;

            const bodyPaddingRightAnterior =
                body.style.paddingRight;

            const larguraScrollbar =
                Math.max(
                    0,
                    globalThis.innerWidth -
                    document.documentElement.clientWidth
                );

            html.style.overflow =
                "hidden";

            body.style.overflow =
                "hidden";

            if (
                larguraScrollbar >
                0
            ) {
                body.style.paddingRight =
                    `${larguraScrollbar}px`;
            }

            return () => {
                html.style.overflow =
                    htmlOverflowAnterior;

                body.style.overflow =
                    bodyOverflowAnterior;

                body.style.paddingRight =
                    bodyPaddingRightAnterior;
            };
        },
        []
    );

    function alterar(
        campo,
        valor
    ) {
        setForm(
            (atual) => ({
                ...atual,
                [campo]:
                    valor,
            })
        );
    }

    function selecionarEmpresa(
        empresaId
    ) {
        const empresa =
            listaEmpresas.find(
                (item) =>
                    texto(
                        item?.id
                    ) ===
                    texto(
                        empresaId
                    )
            ) ??
            null;

        setForm(
            (atual) => ({
                ...atual,

                empresaId:
                    texto(
                        empresa?.id
                    ),

                empresaNome:
                    texto(
                        empresa?.nome
                    ),

                empresaRazaoSocial:
                    texto(
                        empresa?.razao_social
                    ),

                empresaResponsavel:
                    texto(
                        empresa?.responsavel
                    ),

                empresaEmail:
                    texto(
                        empresa?.email
                    ),

                cnpj:
                    texto(
                        empresa?.cnpj
                    ),
            })
        );
    }

    async function salvar() {
        if (
            salvando
        ) {
            return;
        }

        const adminNome =
            texto(
                form.adminNome
            );

        const adminEmail =
            texto(
                form.adminEmail
            ).toLowerCase();

        const empresaId =
            texto(
                form.empresaId
            );

        const empresaNome =
            texto(
                form.empresaNome
            );

        const empresaEmail =
            texto(
                form.empresaEmail
            ).toLowerCase();

        if (
            !adminNome ||
            !empresaId ||
            !empresaNome
        ) {
            setErro(
                "Preencha nome do administrador e os dados da empresa."
            );

            return;
        }

        if (
            !emailValido(
                adminEmail
            )
        ) {
            setErro(
                "Informe um e-mail de acesso válido."
            );

            return;
        }

        if (
            empresaEmail &&
            !emailValido(
                empresaEmail
            )
        ) {
            setErro(
                "Informe um e-mail válido para a empresa."
            );

            return;
        }

        setErro("");
        setSalvando(true);

        try {
            const resultado =
                await salvarDadosClienteTenantAdminService({
                    tenantId,

                    userId:
                        usuario?.user_id,

                    empresaId,

                    adminNome,

                    adminEmail,

                    adminFuncao:
                        form.adminFuncao,

                    empresaNome,

                    empresaRazaoSocial:
                        form.empresaRazaoSocial,

                    empresaResponsavel:
                        form.empresaResponsavel,

                    empresaEmail,
                });

            await onSaved?.(
                resultado
            );
        }
        catch (error) {
            setErro(
                error?.message ||
                "Não foi possível salvar as alterações."
            );
        }
        finally {
            setSalvando(false);
        }
    }

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-ajuste-dados-cliente"
            className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-slate-950/60 p-4 backdrop-blur-sm sm:p-5"
        >
            <div className="mx-auto flex max-h-[calc(100vh-2rem)] w-full max-w-4xl flex-col overflow-hidden rounded-[28px] border border-white/10 bg-white shadow-[0_35px_100px_rgba(2,6,23,0.42)] sm:max-h-[calc(100vh-2.5rem)]">
                <header
                    className="relative isolate h-[128px] shrink-0 overflow-hidden border-b border-emerald-950/20 bg-[#071b14] text-white"
                    style={{
                        backgroundImage:
                            `linear-gradient(90deg, rgba(4, 22, 16, 0.96) 0%, rgba(4, 28, 19, 0.88) 42%, rgba(4, 27, 18, 0.42) 74%, rgba(4, 20, 15, 0.18) 100%), url(${dashboardHero})`,
                        backgroundSize:
                            "cover",
                        backgroundPosition:
                            "center 48%",
                    }}
                >
                    <div className="relative z-10 flex h-[128px] items-center gap-4 px-6 py-4 pr-24 sm:px-7 sm:pr-28">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-300/10 text-emerald-200 backdrop-blur-sm">
                            <UserCog className="h-5 w-5" />
                        </div>

                        <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">
                                SAFESCAN BRASIL
                            </p>

                            <h2
                                id="titulo-ajuste-dados-cliente"
                                className="mt-1.5 text-[clamp(1.45rem,2.4vw,1.9rem)] font-black leading-none tracking-tight text-white"
                            >
                                Ajustar dados
                            </h2>

                            <p className="mt-2 truncate text-sm font-semibold text-slate-100/95">
                                {
                                    texto(
                                        usuario?.nome
                                    ) ||
                                    "Administrador do cliente"
                                }
                            </p>

                            <p className="mt-1 break-all text-xs font-medium text-slate-200/80">
                                {
                                    texto(
                                        usuario?.email
                                    )
                                }
                            </p>

                            <span
                                aria-hidden="true"
                                className="mt-2.5 block h-[3px] w-14 rounded-full bg-emerald-400"
                            />
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={
                            onClose
                        }
                        disabled={
                            salvando
                        }
                        className="absolute right-5 top-5 z-20 inline-flex h-10 items-center justify-center rounded-xl border border-white/20 bg-white/10 px-4 text-xs font-bold text-white backdrop-blur-sm transition hover:bg-white/15 disabled:opacity-50 sm:right-6 sm:top-6"
                    >
                        Fechar
                    </button>
                </header>

                <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-6">
                    {erro ? (
                        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">
                            {erro}
                        </div>
                    ) : null}

                    <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                        <div className="mb-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">
                                Administrador do cliente
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                                Estes dados identificam o responsável que acessa o ambiente do cliente.
                            </p>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <Campo titulo="Nome">
                                <input
                                    type="text"
                                    value={
                                        form.adminNome
                                    }
                                    onChange={
                                        (event) =>
                                            alterar(
                                                "adminNome",
                                                event.target.value
                                            )
                                    }
                                    className={
                                        INPUT_CLASS
                                    }
                                />
                            </Campo>

                            <Campo titulo="E-mail de acesso">
                                <input
                                    type="email"
                                    value={
                                        form.adminEmail
                                    }
                                    onChange={
                                        (event) =>
                                            alterar(
                                                "adminEmail",
                                                event.target.value
                                            )
                                    }
                                    className={
                                        INPUT_CLASS
                                    }
                                />
                            </Campo>

                            <Campo titulo="Cargo / função">
                                <input
                                    type="text"
                                    value={
                                        form.adminFuncao
                                    }
                                    onChange={
                                        (event) =>
                                            alterar(
                                                "adminFuncao",
                                                event.target.value
                                            )
                                    }
                                    className={
                                        INPUT_CLASS
                                    }
                                />
                            </Campo>
                        </div>
                    </section>

                    <section className="rounded-2xl border border-slate-200 bg-white p-5">
                        <div className="mb-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">
                                Empresa
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                                Informações cadastrais vinculadas ao tenant.
                            </p>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <Campo titulo="Empresa">
                                <select
                                    value={
                                        form.empresaId
                                    }
                                    onChange={
                                        (event) =>
                                            selecionarEmpresa(
                                                event.target.value
                                            )
                                    }
                                    className={
                                        INPUT_CLASS
                                    }
                                >
                                    <option value="">
                                        Selecione...
                                    </option>

                                    {listaEmpresas.map(
                                        (empresa) => (
                                            <option
                                                key={
                                                    empresa.id
                                                }
                                                value={
                                                    empresa.id
                                                }
                                            >
                                                {
                                                    texto(
                                                        empresa.nome
                                                    ) ||
                                                    texto(
                                                        empresa.razao_social
                                                    ) ||
                                                    "Empresa"
                                                }
                                            </option>
                                        )
                                    )}
                                </select>
                            </Campo>

                            <Campo titulo="CNPJ">
                                <input
                                    type="text"
                                    value={
                                        form.cnpj
                                    }
                                    readOnly
                                    disabled
                                    className={
                                        INPUT_CLASS
                                    }
                                />
                            </Campo>

                            <Campo titulo="Nome de exibição">
                                <input
                                    type="text"
                                    value={
                                        form.empresaNome
                                    }
                                    onChange={
                                        (event) =>
                                            alterar(
                                                "empresaNome",
                                                event.target.value
                                            )
                                    }
                                    className={
                                        INPUT_CLASS
                                    }
                                />
                            </Campo>

                            <Campo titulo="Razão social">
                                <input
                                    type="text"
                                    value={
                                        form.empresaRazaoSocial
                                    }
                                    onChange={
                                        (event) =>
                                            alterar(
                                                "empresaRazaoSocial",
                                                event.target.value
                                            )
                                    }
                                    className={
                                        INPUT_CLASS
                                    }
                                />
                            </Campo>

                            <Campo titulo="Responsável">
                                <input
                                    type="text"
                                    value={
                                        form.empresaResponsavel
                                    }
                                    onChange={
                                        (event) =>
                                            alterar(
                                                "empresaResponsavel",
                                                event.target.value
                                            )
                                    }
                                    className={
                                        INPUT_CLASS
                                    }
                                />
                            </Campo>

                            <Campo titulo="E-mail da empresa">
                                <input
                                    type="email"
                                    value={
                                        form.empresaEmail
                                    }
                                    onChange={
                                        (event) =>
                                            alterar(
                                                "empresaEmail",
                                                event.target.value
                                            )
                                    }
                                    className={
                                        INPUT_CLASS
                                    }
                                />
                            </Campo>
                        </div>

                        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                            <p className="text-[10px] leading-4 text-slate-500">
                                O CNPJ permanece somente leitura. Este ajuste não altera senha, membership, permissões, escopo, domínio, ativação ou Conta Mestre.
                            </p>
                        </div>
                    </section>
                </div>

                <footer className="shrink-0 flex items-center justify-end gap-2 border-t border-slate-200 bg-white px-6 py-4">
                    <button
                        type="button"
                        onClick={
                            onClose
                        }
                        disabled={
                            salvando
                        }
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                    >
                        Cancelar
                    </button>

                    <button
                        type="button"
                        onClick={
                            salvar
                        }
                        disabled={
                            salvando
                        }
                        className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-500 disabled:cursor-wait disabled:bg-slate-400"
                    >
                        {salvando
                            ? "Salvando..."
                            : "Salvar alterações"}
                    </button>
                </footer>
            </div>
        </div>
    );
}
