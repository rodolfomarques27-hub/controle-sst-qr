import {
    useEffect,
    useState,
} from "react";

import {
    AlertTriangle,
    BadgeCheck,
    Building2,
    CheckCircle2,
    CreditCard,
    Globe2,
    ImagePlus,
    ShieldCheck,
    UserRound,
    X,
} from "lucide-react";

function texto(
    valor
) {
    return String(
        valor ?? ""
    ).trim();
}

function formatarModeloCobranca(
    modelo
) {
    if (
        modelo ===
        "mensalidade_fixa"
    ) {
        return "Mensalidade fixa";
    }

    if (
        modelo ===
        "por_colaborador"
    ) {
        return "Por colaborador";
    }

    if (
        modelo ===
        "base_mais_colaborador"
    ) {
        return "Mensalidade base + colaborador";
    }

    return "Plano comercial";
}

function formatarMoeda(
    valor
) {
    const normalizado =
        texto(
            valor
        )
            .replace(
                /\./g,
                "."
            )
            .replace(
                ",",
                "."
            );

    const numero =
        Number(
            normalizado
        );

    return new Intl.NumberFormat(
        "pt-BR",
        {
            style:
                "currency",
            currency:
                "BRL",
        }
    ).format(
        Number.isFinite(
            numero
        )
            ? numero
            : 0
    );
}

function ResumoCard({
    Icone,
    titulo,
    children,
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2">
                <Icone className="h-4 w-4 text-emerald-700" />

                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                    {titulo}
                </p>
            </div>

            <div className="mt-3">
                {children}
            </div>
        </div>
    );
}

function ItemCriacao({
    children,
}) {
    return (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2.5">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />

            <span className="text-xs font-semibold text-slate-700">
                {children}
            </span>
        </div>
    );
}

export function TenantAdminCreateClientConfirmModal({
    open,
    loading,
    formulario,
    consultaCnpj,
    logoPreview,
    onCancel,
    onConfirm,
}) {
    const [
        confirmado,
        setConfirmado,
    ] =
        useState(false);

    useEffect(
        () => {
            if (!open) {
                setConfirmado(
                    false
                );

                return undefined;
            }

            const overflowAnterior =
                globalThis.document?.body?.style?.overflow ??
                "";

            if (
                globalThis.document?.body
            ) {
                globalThis.document.body.style.overflow =
                    "hidden";
            }

            function handleKeyDown(
                event
            ) {
                if (
                    event.key ===
                        "Escape" &&
                    !loading
                ) {
                    onCancel?.();
                }
            }

            globalThis.addEventListener(
                "keydown",
                handleKeyDown
            );

            return () => {
                globalThis.removeEventListener(
                    "keydown",
                    handleKeyDown
                );

                if (
                    globalThis.document?.body
                ) {
                    globalThis.document.body.style.overflow =
                        overflowAnterior;
                }
            };
        },
        [
            open,
            loading,
            onCancel,
        ]
    );

    if (!open) {
        return null;
    }

    const nomeCliente =
        texto(
            formulario?.nomeTenant
        ) ||
        "Cliente";

    const nomeEmpresa =
        texto(
            formulario?.empresaNome
        ) ||
        texto(
            formulario?.razaoSocial
        ) ||
        "Empresa";

    const razaoSocial =
        texto(
            formulario?.razaoSocial
        );

    const cnpj =
        texto(
            formulario?.cnpj
        );

    const responsavel =
        texto(
            formulario?.adminNome
        );

    const emailResponsavel =
        texto(
            formulario?.adminEmail
        );

    const slug =
        texto(
            formulario?.slug
        );

    const hostname =
        slug
            ? `${slug}.safescanbrasil.com.br`
            : "—";

    const modelo =
        formatarModeloCobranca(
            formulario?.modeloCobranca
        );

    const valorBase =
        formatarMoeda(
            formulario?.valorBase
        );

    const valorColaborador =
        formatarMoeda(
            formulario?.valorColaborador
        );

    const armazenamento =
        Number(
            formulario?.armazenamentoIncluidoGb ||
            0
        );

    const usaValorBase =
        formulario?.modeloCobranca !==
        "por_colaborador";

    const usaValorColaborador =
        formulario?.modeloCobranca !==
        "mensalidade_fixa";

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="safescan-create-client-title"
            className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-[3px]"
            onMouseDown={
                (event) => {
                    if (
                        event.target ===
                            event.currentTarget &&
                        !loading
                    ) {
                        onCancel?.();
                    }
                }
            }
        >
            <div className="max-h-[calc(100vh-32px)] w-full max-w-[900px] overflow-y-auto rounded-[26px] border border-white/10 bg-white shadow-[0_35px_100px_rgba(2,6,23,0.42)]">
                <header className="relative overflow-hidden bg-gradient-to-r from-[#071d15] via-[#083223] to-[#075c3c] px-6 py-6 text-white sm:px-8">
                    <div className="absolute right-0 top-0 h-44 w-44 translate-x-12 -translate-y-16 rounded-full bg-emerald-400/10 blur-2xl" />

                    <div className="relative flex items-start justify-between gap-5">
                        <div className="min-w-0">
                            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5">
                                <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />

                                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-100">
                                    Confirmação de criação
                                </span>
                            </div>

                            <h2
                                id="safescan-create-client-title"
                                className="mt-4 text-2xl font-bold tracking-tight sm:text-[28px]"
                            >
                                Criar este cliente no SafeScan?
                            </h2>

                            <p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-50/80">
                                Confira os dados abaixo antes de concluir.
                                Esta confirmação cria o ambiente real do cliente
                                e o acesso administrativo inicial.
                            </p>
                        </div>

                        <button
                            type="button"
                            disabled={
                                loading
                            }
                            onClick={
                                onCancel
                            }
                            aria-label="Fechar confirmação"
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </header>

                <div className="space-y-5 p-6 sm:p-8">
                    <div className="grid gap-4 md:grid-cols-2">
                        <ResumoCard
                            Icone={
                                Building2
                            }
                            titulo="Cliente e empresa"
                        >
                            <p className="text-base font-bold text-slate-900">
                                {nomeCliente}
                            </p>

                            <p className="mt-1 text-sm font-semibold text-slate-700">
                                {nomeEmpresa}
                            </p>

                            {razaoSocial &&
                            razaoSocial !==
                                nomeEmpresa ? (
                                <p className="mt-1 text-xs text-slate-500">
                                    {razaoSocial}
                                </p>
                            ) : null}

                            <div className="mt-3 flex flex-wrap items-center gap-2">
                                <span className="text-xs text-slate-600">
                                    CNPJ {cnpj}
                                </span>

                                {consultaCnpj?.ativa ? (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-700">
                                        <BadgeCheck className="h-3 w-3" />
                                        CNPJ ATIVO
                                    </span>
                                ) : null}
                            </div>
                        </ResumoCard>

                        <ResumoCard
                            Icone={
                                UserRound
                            }
                            titulo="Responsável pelo sistema"
                        >
                            <p className="text-base font-bold text-slate-900">
                                {responsavel || "—"}
                            </p>

                            <p className="mt-1 text-sm text-slate-600">
                                {emailResponsavel || "—"}
                            </p>

                            <p className="mt-2 text-xs text-slate-500">
                                Acesso administrativo ao ambiente do cliente.
                            </p>
                        </ResumoCard>

                        <ResumoCard
                            Icone={
                                Globe2
                            }
                            titulo="Endereço de acesso"
                        >
                            <p className="break-all font-mono text-sm font-bold text-slate-900">
                                {hostname}
                            </p>

                            <p className="mt-2 text-xs text-slate-500">
                                O endereço será criado inicialmente como pendente
                                até a conclusão da ativação.
                            </p>
                        </ResumoCard>

                        <ResumoCard
                            Icone={
                                ImagePlus
                            }
                            titulo="Marca do cliente"
                        >
                            <div className="flex min-h-[72px] items-center gap-4">
                                <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white p-2">
                                    {logoPreview ? (
                                        <img
                                            src={
                                                logoPreview
                                            }
                                            alt="Logo do cliente"
                                            className="max-h-full max-w-full object-contain"
                                        />
                                    ) : (
                                        <ImagePlus className="h-6 w-6 text-slate-300" />
                                    )}
                                </div>

                                <div>
                                    <p className="text-sm font-bold text-slate-800">
                                        Logo selecionado
                                    </p>

                                    <p className="mt-1 text-xs text-slate-500">
                                        A imagem será preparada no padrão do SafeScan.
                                    </p>
                                </div>
                            </div>
                        </ResumoCard>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-5">
                        <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-emerald-700" />

                            <h3 className="text-sm font-bold text-slate-900">
                                Condições comerciais
                            </h3>
                        </div>

                        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            <div className="rounded-xl bg-slate-50 p-3.5">
                                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">
                                    Modelo
                                </p>

                                <p className="mt-1.5 text-sm font-bold text-slate-900">
                                    {modelo}
                                </p>
                            </div>

                            <div className="rounded-xl bg-slate-50 p-3.5">
                                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">
                                    Base mensal
                                </p>

                                <p className="mt-1.5 text-sm font-bold text-slate-900">
                                    {usaValorBase
                                        ? valorBase
                                        : "Não se aplica"}
                                </p>
                            </div>

                            <div className="rounded-xl bg-slate-50 p-3.5">
                                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">
                                    Por colaborador
                                </p>

                                <p className="mt-1.5 text-sm font-bold text-slate-900">
                                    {usaValorColaborador
                                        ? valorColaborador
                                        : "Não se aplica"}
                                </p>
                            </div>

                            <div className="rounded-xl bg-slate-50 p-3.5">
                                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">
                                    Armazenamento
                                </p>

                                <p className="mt-1.5 text-sm font-bold text-slate-900">
                                    {armazenamento} GB
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-[1fr_330px]">
                        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-5">
                            <p className="text-xs font-bold uppercase tracking-[0.1em] text-emerald-800">
                                O SafeScan criará
                            </p>

                            <div className="mt-4 grid gap-2 sm:grid-cols-2">
                                <ItemCriacao>
                                    Ambiente do cliente
                                </ItemCriacao>

                                <ItemCriacao>
                                    Cadastro da empresa
                                </ItemCriacao>

                                <ItemCriacao>
                                    Configuração comercial
                                </ItemCriacao>

                                <ItemCriacao>
                                    Endereço de acesso
                                </ItemCriacao>

                                <ItemCriacao>
                                    Marca personalizada
                                </ItemCriacao>

                                <ItemCriacao>
                                    Acesso do responsável
                                </ItemCriacao>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />

                                <div>
                                    <p className="text-sm font-bold text-amber-900">
                                        Ação real
                                    </p>

                                    <p className="mt-1.5 text-xs leading-5 text-amber-800">
                                        Ao confirmar, informações reais serão
                                        registradas no SafeScan. Revise cliente,
                                        CNPJ, responsável e valores antes de continuar.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-emerald-200 hover:bg-emerald-50/40">
                        <input
                            type="checkbox"
                            checked={
                                confirmado
                            }
                            disabled={
                                loading
                            }
                            onChange={
                                (event) =>
                                    setConfirmado(
                                        event.target.checked
                                    )
                            }
                            className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-600"
                        />

                        <div>
                            <p className="text-sm font-bold text-slate-900">
                                Revisei os dados e confirmo a criação deste cliente.
                            </p>

                            <p className="mt-1 text-xs leading-5 text-slate-500">
                                O botão de criação será liberado somente após esta confirmação.
                            </p>
                        </div>
                    </label>
                </div>

                <footer className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
                    <p className="text-[11px] leading-5 text-slate-500">
                        Nenhuma ação será executada se você cancelar esta confirmação.
                    </p>

                    <div className="flex flex-col-reverse gap-2 sm:flex-row">
                        <button
                            type="button"
                            disabled={
                                loading
                            }
                            onClick={
                                onCancel
                            }
                            className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-xs font-bold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Voltar e revisar
                        </button>

                        <button
                            type="button"
                            disabled={
                                loading ||
                                !confirmado
                            }
                            onClick={
                                onConfirm
                            }
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none"
                        >
                            <ShieldCheck className="h-4 w-4" />

                            {loading
                                ? "Criando cliente..."
                                : "Criar cliente agora"}
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    );
}