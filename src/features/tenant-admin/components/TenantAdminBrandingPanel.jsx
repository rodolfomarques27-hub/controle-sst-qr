import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";

import {
    AlertTriangle,
    Building2,
    CheckCircle2,
    ImagePlus,
    Loader2,
    Palette,
    RefreshCw,
    Save,
    Trash2,
} from "lucide-react";

import {
    supabase,
} from "../../../lib/supabaseClient.js";

import {
    reduzirFotoParaAuditoria,
} from "../../../services/imagemService";

import {
    confirmarSafeScan,
} from "../../../services/safeScanConfirmService.js";

import {
    carregarBrandingTenantAdminService,
    normalizarAjusteBrandingTenantAdmin,
    obterLimitesBrandingTenantAdmin,
    removerFundoBrandingTenantAdminService,
    removerLogoBrandingTenantAdminService,
    salvarAjusteBrandingTenantAdminService,
    salvarFundoBrandingTenantAdminService,
    salvarLogoBrandingTenantAdminService,
} from "../services/tenantAdminBrandingService.js";

const LIMITES =
    obterLimitesBrandingTenantAdmin();

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

function formatarData(
    valor
) {
    if (!valor) {
        return "Ainda não salvo";
    }

    const data =
        new Date(
            valor
        );

    if (
        Number.isNaN(
            data.getTime()
        )
    ) {
        return "Ainda não salvo";
    }

    return new Intl.DateTimeFormat(
        "pt-BR",
        {
            dateStyle:
                "short",

            timeStyle:
                "short",
        }
    ).format(
        data
    );
}

function confirmarAcao(
    mensagem
) {
    return confirmarSafeScan({
        titulo:
            "Confirmar remoção",
        mensagem,
        confirmarTexto:
            "Remover",
        cancelarTexto:
            "Cancelar",
        variante:
            "perigo",
    });
}

export function TenantAdminBrandingPanel({
    tenant,
    modoEmbutido = false,
    onBrandingAtualizado = null,
}) {
    const tenantId =
        String(
            tenant?.tenant_id ||
            ""
        ).trim();

    const inputLogoRef =
        useRef(null);

    const inputFundoRef =
        useRef(null);

    const [
        estado,
        setEstado,
    ] =
        useState(null);

    const [
        ajuste,
        setAjuste,
    ] =
        useState(
            () =>
                normalizarAjusteBrandingTenantAdmin()
        );

    const [
        arquivoFundo,
        setArquivoFundo,
    ] =
        useState(null);

    const [
        arquivoLogo,
        setArquivoLogo,
    ] =
        useState(null);

    const [
        previewFundoLocal,
        setPreviewFundoLocal,
    ] =
        useState("");

    const [
        previewLogoLocal,
        setPreviewLogoLocal,
    ] =
        useState("");

    const [
        carregando,
        setCarregando,
    ] =
        useState(true);

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

    const [
        mensagem,
        setMensagem,
    ] =
        useState("");

    const recarregar =
        useCallback(
            async () => {
                if (!tenantId) {
                    setErro(
                        "Tenant inválido."
                    );

                    setCarregando(
                        false
                    );

                    return;
                }

                setCarregando(
                    true
                );

                setErro("");

                try {
                    const resultado =
                        await carregarBrandingTenantAdminService({
                            supabase,
                            tenantId,
                        });

                    setEstado(
                        resultado
                    );

                    setAjuste(
                        normalizarAjusteBrandingTenantAdmin(
                            resultado.ajuste
                        )
                    );
                }
                catch (error) {
                    setEstado(
                        null
                    );

                    setErro(
                        error?.message ||
                        "Não foi possível carregar a identidade visual do tenant."
                    );
                }
                finally {
                    setCarregando(
                        false
                    );
                }
            },
            [
                tenantId,
            ]
        );

    useEffect(
        () => {
            void recarregar();
        },
        [
            recarregar,
        ]
    );

    useEffect(
        () => {
            return () => {
                if (
                    previewFundoLocal
                        .startsWith(
                            "blob:"
                        )
                ) {
                    URL.revokeObjectURL(
                        previewFundoLocal
                    );
                }
            };
        },
        [
            previewFundoLocal,
        ]
    );

    useEffect(
        () => {
            return () => {
                if (
                    previewLogoLocal
                        .startsWith(
                            "blob:"
                        )
                ) {
                    URL.revokeObjectURL(
                        previewLogoLocal
                    );
                }
            };
        },
        [
            previewLogoLocal,
        ]
    );

    function abrirSeletorLogo() {
        if (salvando) {
            return;
        }

        const input =
            inputLogoRef.current;

        if (!input) {
            setErro(
                "Não foi possível abrir o seletor da logo."
            );

            return;
        }

        setMensagem(
            ""
        );

        setErro(
            ""
        );

        input.value =
            "";

        input.click();
    }

    function abrirSeletorFundo() {
        if (salvando) {
            return;
        }

        const input =
            inputFundoRef.current;

        if (!input) {
            setErro(
                "Não foi possível abrir o seletor do fundo."
            );

            return;
        }

        setMensagem(
            ""
        );

        setErro(
            ""
        );

        input.value =
            "";

        input.click();
    }

    function selecionarFundo(
        arquivo
    ) {
        setMensagem(
            ""
        );

        setErro(
            ""
        );

        if (
            previewFundoLocal
                .startsWith(
                    "blob:"
                )
        ) {
            URL.revokeObjectURL(
                previewFundoLocal
            );
        }

        setPreviewFundoLocal(
            ""
        );

        setArquivoFundo(
            null
        );

        if (!arquivo) {
            return;
        }

        if (
            !LIMITES
                .tiposFundo
                .includes(
                    String(
                        arquivo.type ||
                        ""
                    ).toLowerCase()
                )
        ) {
            setErro(
                "O fundo deve ser JPG, PNG ou WEBP."
            );

            return;
        }

        if (
            Number(
                arquivo.size ||
                0
            ) >
            LIMITES.fundoBytes
        ) {
            setErro(
                "O fundo excede o limite de 5 MiB."
            );

            return;
        }

        setArquivoFundo(
            arquivo
        );

        setPreviewFundoLocal(
            URL.createObjectURL(
                arquivo
            )
        );
    }

    function selecionarLogo(
        arquivo
    ) {
        setMensagem(
            ""
        );

        setErro(
            ""
        );

        if (
            previewLogoLocal
                .startsWith(
                    "blob:"
                )
        ) {
            URL.revokeObjectURL(
                previewLogoLocal
            );
        }

        setPreviewLogoLocal(
            ""
        );

        setArquivoLogo(
            null
        );

        if (!arquivo) {
            return;
        }

        if (
            String(
                arquivo.type ||
                ""
            ).toLowerCase() !==
            LIMITES.tipoLogo
        ) {
            setErro(
                "A logo deve estar em PNG."
            );

            return;
        }

        if (
            Number(
                arquivo.size ||
                0
            ) >
            LIMITES.logoBytes
        ) {
            setErro(
                "A logo excede o limite de 2 MiB."
            );

            return;
        }

        setArquivoLogo(
            arquivo
        );

        setPreviewLogoLocal(
            URL.createObjectURL(
                arquivo
            )
        );
    }

    async function sincronizarBrandingRuntime() {
        if (
            typeof onBrandingAtualizado !==
            "function"
        ) {
            return;
        }

        await onBrandingAtualizado();
    }

    async function salvarAparencia() {
        if (
            salvando ||
            !tenantId
        ) {
            return;
        }

        setSalvando(
            true
        );

        setErro(
            ""
        );

        setMensagem(
            "Salvando identidade visual do tenant..."
        );

        try {
            if (arquivoFundo) {
                const fundoOtimizado =
                    await reduzirFotoParaAuditoria(
                        arquivoFundo,
                        {
                            maxLado:
                                2200,

                            alvoBytes:
                                950 * 1024,

                            qualidadeInicial:
                                0.86,

                            qualidadeMinima:
                                0.58,

                            tipoSaida:
                                "image/jpeg",

                            forcarReducao:
                                true,
                        }
                    );

                await salvarFundoBrandingTenantAdminService({
                    supabase,
                    tenantId,
                    arquivo:
                        fundoOtimizado,
                });
            }

            if (arquivoLogo) {
                await salvarLogoBrandingTenantAdminService({
                    supabase,
                    tenantId,
                    arquivo:
                        arquivoLogo,
                });
            }

            await salvarAjusteBrandingTenantAdminService({
                supabase,
                tenantId,
                ajuste,
            });

            setArquivoFundo(
                null
            );

            setArquivoLogo(
                null
            );

            setPreviewFundoLocal(
                ""
            );

            setPreviewLogoLocal(
                ""
            );

            await recarregar();
            await sincronizarBrandingRuntime();

            setMensagem(
                "Identidade visual atualizada. O login deste tenant usará a nova configuração."
            );
        }
        catch (error) {
            setErro(
                error?.message ||
                "Não foi possível salvar a identidade visual."
            );

            setMensagem(
                ""
            );
        }
        finally {
            setSalvando(
                false
            );
        }
    }

    async function removerFundo() {
        if (
            !tenantId ||
            salvando
        ) {
            return;
        }

        const confirmado =
            await confirmarAcao(
                "Remover o fundo personalizado deste tenant?"
            );

        if (!confirmado) {
            return;
        }

        setSalvando(
            true
        );

        setErro(
            ""
        );

        try {
            await removerFundoBrandingTenantAdminService({
                supabase,
                tenantId,
            });

            setArquivoFundo(
                null
            );

            setPreviewFundoLocal(
                ""
            );

            await recarregar();
            await sincronizarBrandingRuntime();

            setMensagem(
                "Fundo personalizado removido."
            );
        }
        catch (error) {
            setErro(
                error?.message ||
                "Não foi possível remover o fundo."
            );
        }
        finally {
            setSalvando(
                false
            );
        }
    }

    async function removerLogo() {
        if (
            !tenantId ||
            salvando
        ) {
            return;
        }

        const confirmado =
            await confirmarAcao(
                "Remover a logo personalizada deste tenant?"
            );

        if (!confirmado) {
            return;
        }

        setSalvando(
            true
        );

        setErro(
            ""
        );

        try {
            await removerLogoBrandingTenantAdminService({
                supabase,
                tenantId,
            });

            setArquivoLogo(
                null
            );

            setPreviewLogoLocal(
                ""
            );

            await recarregar();
            await sincronizarBrandingRuntime();

            setMensagem(
                "Logo personalizada removida."
            );
        }
        catch (error) {
            setErro(
                error?.message ||
                "Não foi possível remover a logo."
            );
        }
        finally {
            setSalvando(
                false
            );
        }
    }

    const fundoPreview =
        previewFundoLocal ||
        estado?.fundoUrl ||
        "";

    const logoPreview =
        previewLogoLocal ||
        estado?.logoUrl ||
        "";

    if (carregando) {
        return (
            <section
                className={
                    modoEmbutido
                        ? "flex items-center justify-center bg-white"
                        : "mt-5 flex items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm"
                }
                style={{ minHeight: 260 }}
            >
                <div className="flex items-center gap-3 text-sm font-semibold text-slate-500">
                    <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />

                    Carregando identidade visual...
                </div>
            </section>
        );
    }

    return (
        <section
            className={
                modoEmbutido
                    ? "bg-white"
                    : "mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            }
        >
            <div
                className={
                    modoEmbutido
                        ? "flex flex-col gap-3 px-5 pt-4 sm:flex-row sm:items-center sm:justify-between"
                        : "flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                }
            >
                <div>
                    {!modoEmbutido ? (
                        <div className="flex items-center gap-2">
                            <Palette className="h-4 w-4 text-emerald-700" />

                            <h2 className="text-sm font-bold text-slate-900">
                                Identidade visual / Aparência do login
                            </h2>
                        </div>
                    ) : null}

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                        Personalização exclusiva de {textoSeguro(
                            tenant?.tenant_nome,
                            "este tenant"
                        )}. Nenhum outro cliente é alterado.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={
                        () =>
                            void recarregar()
                    }
                    disabled={
                        salvando
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <RefreshCw className="h-4 w-4" />

                    Atualizar
                </button>
            </div>

            <div className="grid gap-5 p-5 xl:grid-cols-2">
                <div>
                    <p className="text-xs font-bold uppercase text-slate-400">
                        Prévia do login
                    </p>

                    <div
                        className="relative mt-3 overflow-hidden rounded-2xl bg-slate-950 bg-cover bg-center shadow-inner"
                        style={
                            fundoPreview
                                ? {
                                    backgroundImage:
                                        `url("${fundoPreview}")`,

                                    backgroundSize:
                                        ajuste.size,

                                    backgroundPosition:
                                        ajuste.position,

                                    backgroundRepeat:
                                        "no-repeat",
                                }
                                : undefined
                        }
                    >
                        <div
                            className="absolute inset-0 bg-slate-950"
                            style={{
                                opacity:
                                    Math.min(
                                        0.82,
                                        Math.max(
                                            0.28,
                                            Number(
                                                ajuste.overlay
                                            ) ||
                                            0.62
                                        )
                                    ),
                            }}
                        />

                        <div className="relative z-10 flex items-center justify-center p-6" style={{ minHeight: 360 }}>
                            <div className="w-full overflow-hidden rounded-2xl border border-white/10 shadow-xl" style={{ maxWidth: 360, backgroundColor: "rgba(2, 6, 23, 0.75)" }}>
                                <div className="grid" style={{ gridTemplateColumns: "1fr 120px" }}>
                                    <div className="p-5">
                                        <p className="text-lg font-semibold text-white">
                                            Bem-vindo de volta
                                        </p>

                                        <p className="mt-1 text-xs leading-5 text-slate-300">
                                            Entre com suas credenciais para acessar o sistema de gestão.
                                        </p>

                                        <div className="mt-5 h-9 rounded-lg border border-white/10" style={{ backgroundColor: "rgba(255, 255, 255, 0.04)" }} />

                                        <div className="mt-2.5 h-9 rounded-lg border border-white/10" style={{ backgroundColor: "rgba(255, 255, 255, 0.04)" }} />

                                        <div className="mt-4 h-9 rounded-lg bg-emerald-600" />
                                    </div>

                                    <aside className="flex items-center justify-center border-l border-white/10 p-4" style={{ backgroundColor: "rgba(15, 23, 42, 0.60)" }}>
                                        {
                                            logoPreview
                                                ? (
                                                    <img
                                                        src={
                                                            logoPreview
                                                        }
                                                        alt="Prévia da logo do cliente"
                                                        className="max-h-24 max-w-full object-contain"
                                                    />
                                                )
                                                : (
                                                    <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-white/10" style={{ backgroundColor: "rgba(255, 255, 255, 0.04)" }}>
                                                        <Building2 className="h-9 w-9 text-emerald-300" />
                                                    </div>
                                                )
                                        }
                                    </aside>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1">
                            Logo: {estado?.possuiLogo ? "configurada" : "padrão"}
                        </span>

                        <span className="rounded-full bg-slate-100 px-2.5 py-1">
                            Fundo: {estado?.possuiFundo ? "configurado" : "padrão"}
                        </span>

                        <span className="rounded-full bg-slate-100 px-2.5 py-1">
                            Atualizado: {formatarData(
                                estado?.updatedAt
                            )}
                        </span>
                    </div>
                </div>

                <div className="space-y-4">
                    <article className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                        <div className="flex items-center gap-2">
                            <ImagePlus className="h-4 w-4 text-emerald-700" />

                            <h3 className="text-sm font-bold text-slate-900">
                                Logo do cliente
                            </h3>
                        </div>

                        <p className="mt-1 text-xs leading-5 text-slate-500">
                            PNG transparente, até 2 MiB.
                        </p>

                        <input
                            ref={
                                inputLogoRef
                            }
                            type="file"
                            accept="image/png"
                            disabled={
                                salvando
                            }
                            onChange={
                                (event) =>
                                    selecionarLogo(
                                        event.target.files?.[0] ||
                                        null
                                    )
                            }
                            className="hidden"
                            tabIndex={-1}
                        />

                        <button
                            type="button"
                            onClick={
                                abrirSeletorLogo
                            }
                            disabled={
                                salvando
                            }
                            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-3.5 py-2.5 text-xs font-bold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <ImagePlus className="h-4 w-4" />

                            Selecionar logo
                        </button>

                        <p
                            className="mt-2 truncate text-[11px] font-semibold text-slate-500"
                            title={
                                arquivoLogo?.name ||
                                "Nenhum novo arquivo selecionado."
                            }
                        >
                            {
                                arquivoLogo?.name
                                    ? "Selecionado: " + arquivoLogo.name
                                    : "Nenhum novo arquivo selecionado."
                            }
                        </p>

                        {
                            estado?.possuiLogo
                                ? (
                                    <button
                                        type="button"
                                        onClick={
                                            () =>
                                                void removerLogo()
                                        }
                                        disabled={
                                            salvando
                                        }
                                        className="mt-3 inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />

                                        Remover logo
                                    </button>
                                )
                                : null
                        }
                    </article>

                    <article className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                        <div className="flex items-center gap-2">
                            <ImagePlus className="h-4 w-4 text-emerald-700" />

                            <h3 className="text-sm font-bold text-slate-900">
                                Fundo do login
                            </h3>
                        </div>

                        <p className="mt-1 text-xs leading-5 text-slate-500">
                            JPG, PNG ou WEBP. O arquivo é otimizado antes do envio. Limite de entrada: 5 MiB.
                        </p>

                        <input
                            ref={
                                inputFundoRef
                            }
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            disabled={
                                salvando
                            }
                            onChange={
                                (event) =>
                                    selecionarFundo(
                                        event.target.files?.[0] ||
                                        null
                                    )
                            }
                            className="hidden"
                            tabIndex={-1}
                        />

                        <button
                            type="button"
                            onClick={
                                abrirSeletorFundo
                            }
                            disabled={
                                salvando
                            }
                            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-3.5 py-2.5 text-xs font-bold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <ImagePlus className="h-4 w-4" />

                            Selecionar fundo
                        </button>

                        <p
                            className="mt-2 truncate text-[11px] font-semibold text-slate-500"
                            title={
                                arquivoFundo?.name ||
                                "Nenhum novo arquivo selecionado."
                            }
                        >
                            {
                                arquivoFundo?.name
                                    ? "Selecionado: " + arquivoFundo.name
                                    : "Nenhum novo arquivo selecionado."
                            }
                        </p>

                        {
                            estado?.possuiFundo
                                ? (
                                    <button
                                        type="button"
                                        onClick={
                                            () =>
                                                void removerFundo()
                                        }
                                        disabled={
                                            salvando
                                        }
                                        className="mt-3 inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />

                                        Remover fundo
                                    </button>
                                )
                                : null
                        }
                    </article>

                    <article className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                        <h3 className="text-sm font-bold text-slate-900">
                            Enquadramento do fundo
                        </h3>

                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                            <label className="text-xs font-bold text-slate-600">
                                Ajuste
                                <select
                                    value={
                                        ajuste.size
                                    }
                                    disabled={
                                        salvando
                                    }
                                    onChange={
                                        (event) =>
                                            setAjuste(
                                                (atual) =>
                                                    normalizarAjusteBrandingTenantAdmin({
                                                        ...atual,
                                                        size:
                                                            event.target.value,
                                                    })
                                            )
                                    }
                                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-300"
                                >
                                    <option value="cover">
                                        Preencher área
                                    </option>

                                    <option value="contain">
                                        Mostrar imagem inteira
                                    </option>
                                </select>
                            </label>

                            <label className="text-xs font-bold text-slate-600">
                                Posição
                                <select
                                    value={
                                        ajuste.position
                                    }
                                    disabled={
                                        salvando
                                    }
                                    onChange={
                                        (event) =>
                                            setAjuste(
                                                (atual) =>
                                                    normalizarAjusteBrandingTenantAdmin({
                                                        ...atual,
                                                        position:
                                                            event.target.value,
                                                    })
                                            )
                                    }
                                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-300"
                                >
                                    <option value="center center">
                                        Centro
                                    </option>

                                    <option value="center top">
                                        Superior
                                    </option>

                                    <option value="center bottom">
                                        Inferior
                                    </option>

                                    <option value="left center">
                                        Esquerda
                                    </option>

                                    <option value="right center">
                                        Direita
                                    </option>
                                </select>
                            </label>
                        </div>

                        <label className="mt-4 block text-xs font-bold text-slate-600">
                            Escurecimento do fundo: {Math.round(
                                Number(
                                    ajuste.overlay
                                ) * 100
                            )}%
                            <input
                                type="range"
                                min="0.28"
                                max="0.82"
                                step="0.02"
                                value={
                                    ajuste.overlay
                                }
                                disabled={
                                    salvando
                                }
                                onChange={
                                    (event) =>
                                        setAjuste(
                                            (atual) =>
                                                normalizarAjusteBrandingTenantAdmin({
                                                    ...atual,
                                                    overlay:
                                                        Number(
                                                            event.target.value
                                                        ),
                                                })
                                        )
                                }
                                className="mt-2 w-full accent-emerald-700"
                            />
                        </label>
                    </article>

                    {
                        erro
                            ? (
                                <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
                                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />

                                    {erro}
                                </div>
                            )
                            : null
                    }

                    {
                        mensagem
                            ? (
                                <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
                                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />

                                    {mensagem}
                                </div>
                            )
                            : null
                    }

                    <button
                        type="button"
                        onClick={
                            () =>
                                void salvarAparencia()
                        }
                        disabled={
                            salvando
                        }
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {
                            salvando
                                ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                )
                                : (
                                    <Save className="h-4 w-4" />
                                )
                        }

                        {
                            salvando
                                ? "Salvando..."
                                : "Salvar aparência do login"
                        }
                    </button>
                </div>
            </div>
        </section>
    );
}