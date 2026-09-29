import {
    useEffect,
    useState,
} from "react";

import {
    ArrowRight,
    KeyRound,
    Loader2,
    ShieldCheck,
    TriangleAlert,
} from "lucide-react";

import {
    PasswordInput,
} from "./commonComponents.jsx";

import {
    supabase,
    SUPABASE_URL,
} from "../lib/supabaseClient.js";

const PASSWORD_UPDATE_RUNTIME_CSS = `
.r26-pw-panel {
    max-width: 36rem;
    border-radius: 1.5rem;
    box-shadow: var(
        --shadow-2xl,
        0 25px 50px -12px rgb(0 0 0 / 0.25)
    );
}

.r26-pw-icon {
    --tw-ring-color:
        color-mix(
            in oklab,
            var(--color-white, #fff) 15%,
            transparent
        );
}

.r26-pw-kicker {
    letter-spacing: 0.16em;
}

.r26-pw-success-title {
    color: var(
        --color-emerald-950,
        #022c22
    );
}

.r26-pw-warning-title {
    color: var(
        --color-amber-950,
        #451a03
    );
}

.r26-pw-warning-body {
    color: var(
        --color-amber-900,
        #78350f
    );
}

.r26-pw-primary:hover {
    background-color:
        var(
            --color-emerald-500,
            #10b981
        );
}

.r26-pw-primary:disabled {
    cursor: wait;
    background-color:
        var(
            --color-slate-400,
            #94a3b8
        );
}

.r26-pw-submit:hover {
    background-color:
        var(
            --color-emerald-700,
            #047857
        );
}

.r26-pw-submit:disabled {
    opacity: 0.6;
}
`.trim();
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
    return texto(
        parametrosUrl()?.get(
            "tenant"
        )
    );
}

function recoveryHostAtual() {
    return texto(
        parametrosUrl()?.get(
            "recovery_host"
        )
    ).toLowerCase();
}

function hostSafeScanValido(hostname) {
    const host =
        texto(
            hostname
        ).toLowerCase();

    return Boolean(
        host &&
        host.endsWith(
            ".safescanbrasil.com.br"
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
    recoveryHost,
}) {
    try {
        if (
            !confirmationUrl ||
            !tenantSlug ||
            !hostSafeScanValido(
                recoveryHost
            ) ||
            !SUPABASE_URL
        ) {
            return false;
        }

        const url =
            new URL(
                confirmationUrl
            );

        const supabaseUrl =
            new URL(
                SUPABASE_URL
            );

        if (
            url.protocol !==
                "https:" ||
            url.hostname !==
                supabaseUrl.hostname ||
            url.pathname !==
                "/auth/v1/verify" ||
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
                window.location.origin ||
            redirectUrl.searchParams.get(
                "password_recovery"
            ) !==
                "1" ||
            texto(
                redirectUrl.searchParams.get(
                    "tenant"
                )
            ).toLowerCase() !==
                tenantSlug.toLowerCase() ||
            texto(
                redirectUrl.searchParams.get(
                    "recovery_host"
                )
            ).toLowerCase() !==
                recoveryHost
        ) {
            return false;
        }

        return true;
    }
    catch {
        return false;
    }
}

function validarNovaSenha(senha) {
    const valor =
        String(
            senha ??
            ""
        );

    if (valor.length < 12) {
        return "A nova senha deve possuir pelo menos 12 caracteres.";
    }

    if (!/[a-z]/.test(valor)) {
        return "Inclua pelo menos uma letra minúscula.";
    }

    if (!/[A-Z]/.test(valor)) {
        return "Inclua pelo menos uma letra maiúscula.";
    }

    if (!/[0-9]/.test(valor)) {
        return "Inclua pelo menos um número.";
    }

    if (!/[^A-Za-z0-9]/.test(valor)) {
        return "Inclua pelo menos um caractere especial.";
    }

    return "";
}

function PainelBase({
    titulo,
    subtitulo,
    children,
}) {
    return (
        <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10">
            <style>{PASSWORD_UPDATE_RUNTIME_CSS}</style>
            <section className="r26-pw-panel w-full overflow-hidden border border-white/10 bg-white">
                <header className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-950 px-7 py-7 text-white">
                    <div className="flex items-start gap-3">
                        <div className="r26-pw-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1">
                            <ShieldCheck className="h-6 w-6 text-emerald-300" />
                        </div>

                        <div>
                            <p className="r26-pw-kicker text-[10px] font-black uppercase text-emerald-300">
                                SAFESCAN BRASIL
                            </p>

                            <h1 className="mt-1 text-xl font-black">
                                {titulo}
                            </h1>

                            <p className="mt-3 text-sm leading-6 text-slate-200">
                                {subtitulo}
                            </p>
                        </div>
                    </div>
                </header>

                <div className="p-7">
                    {children}
                </div>
            </section>
        </main>
    );
}

export function PasswordUpdateScreen({
    modo = "atualizar",
    usuario = null,
}) {
    const [
        tenantSlug,
    ] =
        useState(
            () =>
                tenantAtual()
        );

    const [
        recoveryHost,
    ] =
        useState(
            () =>
                recoveryHostAtual()
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

    const [
        novaSenha,
        setNovaSenha,
    ] =
        useState("");

    const [
        confirmarSenha,
        setConfirmarSenha,
    ] =
        useState("");

    const [
        erro,
        setErro,
    ] =
        useState("");

    useEffect(
        () => {
            if (
                typeof window ===
                    "undefined" ||
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

    if (
        modo ===
        "confirmar"
    ) {
        const linkValido =
            validarLinkConfirmacao({
                confirmationUrl,
                tenantSlug,
                recoveryHost,
            });

        return (
            <PainelBase
                titulo="Confirmar redefinição"
                subtitulo="O link individual de autenticação somente será utilizado após sua confirmação."
            >
                {linkValido ? (
                    <>
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                            <p className="r26-pw-success-title text-sm font-black">
                                Solicitação localizada
                            </p>

                            <p className="mt-2 text-xs leading-5 text-emerald-800">
                                Clique abaixo para validar o link seguro e seguir para a definição da nova senha.
                            </p>
                        </div>

                        <button
                            type="button"
                            disabled={
                                processando
                            }
                            onClick={
                                () => {
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
                            }
                            className="r26-pw-primary mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-black text-white transition"
                        >
                            {processando
                                ? "Validando link..."
                                : "Continuar para redefinir senha"}

                            {!processando ? (
                                <ArrowRight className="h-4 w-4" />
                            ) : null}
                        </button>

                        <p className="mt-4 text-center text-[11px] leading-5 text-slate-500">
                            O link Auth não é consumido automaticamente por esta página.
                        </p>
                    </>
                ) : (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                        <div className="flex gap-3">
                            <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />

                            <div>
                                <p className="r26-pw-warning-title text-sm font-black">
                                    Link inválido ou incompleto
                                </p>

                                <p className="mt-2 text-xs leading-5 text-amber-800">
                                    Solicite à Conta Mestre um novo link de redefinição.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </PainelBase>
        );
    }

    const hostDestinoValido =
        hostSafeScanValido(
            recoveryHost
        );

    if (
        !usuario?.id ||
        !hostDestinoValido
    ) {
        return (
            <PainelBase
                titulo="Redefinição indisponível"
                subtitulo="Não foi possível validar uma sessão segura para esta redefinição."
            >
                <div className="r26-pw-warning-body rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6">
                    Solicite à Conta Mestre um novo link de redefinição de senha.
                </div>
            </PainelBase>
        );
    }

    async function atualizarSenha(event) {
        event.preventDefault();

        if (processando) {
            return;
        }

        setErro("");

        const erroSenha =
            validarNovaSenha(
                novaSenha
            );

        if (erroSenha) {
            setErro(
                erroSenha
            );

            return;
        }

        if (
            novaSenha !==
            confirmarSenha
        ) {
            setErro(
                "A confirmação da senha não confere."
            );

            return;
        }

        try {
            setProcessando(
                true
            );

            const {
                error:
                    senhaError,
            } =
                await supabase.auth.updateUser({
                    password:
                        novaSenha,
                });

            if (senhaError) {
                throw new Error(
                    senhaError.message ||
                    "Não foi possível atualizar a senha."
                );
            }

            /*
             * Compatibilidade com o fluxo de senha temporária.
             * A RPC já existente apenas finaliza eventual flag pendente.
             */
            await supabase.rpc(
                "finalizar_troca_senha_temporaria_sistema"
            );

            setNovaSenha("");
            setConfirmarSenha("");

            window.location.replace(
                `https://${recoveryHost}/`
            );
        }
        catch (error) {
            setErro(
                error?.message ||
                "Não foi possível atualizar a senha."
            );

            setProcessando(
                false
            );
        }
    }

    return (
        <PainelBase
            titulo="Definir nova senha"
            subtitulo="Crie uma nova credencial para o mesmo usuário e e-mail da sua conta."
        >
            <form
                className="space-y-4"
                onSubmit={
                    atualizarSenha
                }
            >
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center gap-2 text-slate-700">
                        <KeyRound className="h-4 w-4" />

                        <p className="text-xs font-black uppercase tracking-[0.1em]">
                            Requisitos da senha
                        </p>
                    </div>

                    <p className="mt-2 text-xs leading-5 text-slate-500">
                        Mínimo de 12 caracteres, com letra maiúscula, minúscula, número e caractere especial.
                    </p>
                </div>

                <div>
                    <label htmlFor="r26-password-update-new" className="mb-1.5 block text-xs font-bold text-slate-700">
                        Nova senha
                    </label>

                    <PasswordInput
                        id="r26-password-update-new"
                        value={
                            novaSenha
                        }
                        onChange={
                            (
                                event
                            ) =>
                                setNovaSenha(
                                    event.target.value
                                )
                        }
                        autoComplete="new-password"
                        placeholder="Digite a nova senha"
                        disabled={
                            processando
                        }
                    />
                </div>

                <div>
                    <label htmlFor="r26-password-update-confirm" className="mb-1.5 block text-xs font-bold text-slate-700">
                        Confirmar nova senha
                    </label>

                    <PasswordInput
                        id="r26-password-update-confirm"
                        value={
                            confirmarSenha
                        }
                        onChange={
                            (
                                event
                            ) =>
                                setConfirmarSenha(
                                    event.target.value
                                )
                        }
                        autoComplete="new-password"
                        placeholder="Repita a nova senha"
                        visibilityLabel="confirmação de senha"
                        disabled={
                            processando
                        }
                    />
                </div>

                {erro ? (
                    <div
                        role="alert"
                        className="rounded-2xl border border-red-200 bg-red-50 p-3 text-xs font-semibold leading-5 text-red-800"
                    >
                        {erro}
                    </div>
                ) : null}

                <button
                    type="submit"
                    disabled={
                        processando
                    }
                    className="r26-pw-submit inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white transition disabled:cursor-not-allowed"
                >
                    {processando ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : null}

                    {processando
                        ? "Atualizando senha..."
                        : "Salvar nova senha"}
                </button>
            </form>
        </PainelBase>
    );
}