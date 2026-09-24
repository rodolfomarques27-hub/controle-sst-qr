import {
    useEffect,
    useState,
} from "react";

import {
    ArrowRight,
    ShieldCheck,
    TriangleAlert,
} from "lucide-react";

import dashboardHero from "../../../assets/dashboard-hero-sst.webp";

function texto(valor) {
    return String(
        valor ??
        ""
    ).trim();
}

function parametrosUrl() {
    if (
        typeof window ===
        "undefined"
    ) {
        return null;
    }

    return new URLSearchParams(
        window.location.search
    );
}

function tenantAtual() {
    const parametros =
        parametrosUrl();

    return texto(
        parametros?.get(
            "tenant"
        )
    );
}

function extrairLinkConfirmacao() {
    if (
        typeof window ===
        "undefined"
    ) {
        return "";
    }

    const hash =
        String(
            window.location.hash ||
            ""
        ).replace(
            /^#/,
            ""
        );

    if (!hash) {
        return "";
    }

    const parametros =
        new URLSearchParams(
            hash
        );

    return texto(
        parametros.get(
            "confirmation_url"
        )
    );
}

function validarLinkConfirmacao({
    confirmationUrl,
    tenantSlug,
} = {}) {
    try {
        if (
            !confirmationUrl ||
            !tenantSlug
        ) {
            return false;
        }

        const supabaseBase =
            texto(
                import.meta.env.VITE_SUPABASE_URL
            );

        if (!supabaseBase) {
            return false;
        }

        const url =
            new URL(
                confirmationUrl
            );

        const supabaseUrl =
            new URL(
                supabaseBase
            );

        if (
            url.protocol !==
            "https:"
        ) {
            return false;
        }

        if (
            url.hostname !==
            supabaseUrl.hostname
        ) {
            return false;
        }

        if (
            url.pathname !==
            "/auth/v1/verify"
        ) {
            return false;
        }

        if (
            url.searchParams.get(
                "type"
            ) !==
            "recovery"
        ) {
            return false;
        }

        const redirectTo =
            texto(
                url.searchParams.get(
                    "redirect_to"
                )
            );

        if (!redirectTo) {
            return false;
        }

        const redirectUrl =
            new URL(
                redirectTo
            );

        if (
            redirectUrl.origin !==
            window.location.origin
        ) {
            return false;
        }

        if (
            redirectUrl.searchParams.get(
                "primeiro_acesso"
            ) !==
            "1"
        ) {
            return false;
        }

        if (
            texto(
                redirectUrl.searchParams.get(
                    "tenant"
                )
            ).toLowerCase() !==
            tenantSlug.toLowerCase()
        ) {
            return false;
        }

        return true;
    }
    catch {
        return false;
    }
}

export function PrimeiroAcessoConfirmarPage() {
    const [
        tenantSlug,
    ] =
        useState(
            () =>
                tenantAtual()
        );

    const [
        confirmationUrl,
    ] =
        useState(
            () =>
                extrairLinkConfirmacao()
        );

    const [
        processando,
        setProcessando,
    ] =
        useState(false);

    useEffect(
        () => {
            if (
                typeof window ===
                "undefined"
            ) {
                return;
            }

            if (
                !window.location.hash
            ) {
                return;
            }

            window.history.replaceState(
                null,
                "",
                (
                    window.location.pathname +
                    window.location.search
                )
            );
        },
        []
    );

    const linkValido =
        validarLinkConfirmacao({
            confirmationUrl,
            tenantSlug,
        });

    function continuar() {
        if (
            processando ||
            !linkValido
        ) {
            return;
        }

        setProcessando(
            true
        );

        window.location.assign(
            confirmationUrl
        );
    }

    return (
        <main className="relative min-h-screen overflow-hidden bg-[#061912] px-4 py-8 sm:px-6">
            <div
                className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-40"
                style={{
                    backgroundImage:
                        `url(${dashboardHero})`,
                }}
            />

            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(110deg,rgba(4,22,16,0.98)_0%,rgba(4,31,21,0.94)_48%,rgba(4,31,21,0.72)_100%)]" />

            <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl items-center justify-center">
                <section className="w-full max-w-xl overflow-hidden rounded-[28px] border border-white/10 bg-white shadow-2xl shadow-black/30">
                    <header
                        className="relative overflow-hidden bg-[#08281d] px-6 py-7 text-white sm:px-8"
                        style={{
                            backgroundImage:
                                `linear-gradient(90deg, rgba(3,24,16,.97), rgba(3,31,20,.82), rgba(3,24,16,.42)), url(${dashboardHero})`,
                            backgroundSize:
                                "cover",
                            backgroundPosition:
                                "center",
                        }}
                    >
                        <div className="relative z-10 flex items-start gap-4">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-300/10">
                                <ShieldCheck className="h-5 w-5 text-emerald-300" />
                            </div>

                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">
                                    SAFESCAN BRASIL
                                </p>

                                <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
                                    Confirme seu primeiro acesso
                                </h1>

                                <p className="mt-3 text-sm leading-6 text-emerald-50/85">
                                    Confirme o convite antes de iniciar a criação da sua senha administrativa.
                                </p>

                                <span className="mt-4 block h-[3px] w-16 rounded-full bg-emerald-400" />
                            </div>
                        </div>
                    </header>

                    <div className="p-6 sm:p-8">
                        {linkValido ? (
                            <>
                                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                                    <p className="text-sm font-black text-emerald-950">
                                        Convite localizado
                                    </p>

                                    <p className="mt-2 text-xs leading-5 text-emerald-800">
                                        Clique abaixo para validar seu convite e seguir para a definição da senha.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={
                                        continuar
                                    }
                                    disabled={
                                        processando
                                    }
                                    className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-black text-white transition hover:bg-emerald-500 disabled:cursor-wait disabled:bg-slate-400"
                                >
                                    {processando
                                        ? "Validando convite..."
                                        : "Continuar para criar minha senha"}

                                    {!processando ? (
                                        <ArrowRight className="h-4 w-4" />
                                    ) : null}
                                </button>

                                <p className="mt-4 text-center text-[11px] leading-5 text-slate-500">
                                    O link individual de autenticação só será utilizado após esta confirmação.
                                </p>
                            </>
                        ) : (
                            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                                <div className="flex gap-3">
                                    <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />

                                    <div>
                                        <p className="text-sm font-black text-amber-950">
                                            Convite inválido ou incompleto
                                        </p>

                                        <p className="mt-2 text-xs leading-5 text-amber-800">
                                            Solicite ao administrador SafeScan um novo convite de primeiro acesso.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </main>
    );
}
