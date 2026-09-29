import {
    useEffect,
    useRef,
    useState,
} from "react";

const TURNSTILE_SCRIPT_ID =
    "safescan-cloudflare-turnstile";

const TURNSTILE_SCRIPT_URL =
    "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

const TURNSTILE_SITE_KEY =
    String(
        import.meta.env.VITE_TURNSTILE_SITE_KEY ||
        ""
    ).trim();

let promessaScriptTurnstile = null;

function obterTurnstileGlobal() {
    if (
        typeof window === "undefined"
    ) {
        return null;
    }

    return window.turnstile || null;
}

function carregarScriptTurnstile() {
    const turnstileAtual =
        obterTurnstileGlobal();

    if (
        turnstileAtual &&
        typeof turnstileAtual.render ===
            "function"
    ) {
        return Promise.resolve(
            turnstileAtual
        );
    }

    if (
        typeof document === "undefined"
    ) {
        return Promise.reject(
            new Error(
                "Turnstile indisponível fora do navegador."
            )
        );
    }

    if (promessaScriptTurnstile) {
        return promessaScriptTurnstile;
    }

    promessaScriptTurnstile =
        new Promise(
            (
                resolve,
                reject
            ) => {
                const concluir =
                    () => {
                        const api =
                            obterTurnstileGlobal();

                        if (
                            api &&
                            typeof api.render ===
                                "function"
                        ) {
                            resolve(api);
                            return;
                        }

                        reject(
                            new Error(
                                "API do Turnstile indisponível."
                            )
                        );
                    };

                const falhar =
                    () => {
                        reject(
                            new Error(
                                "Não foi possível carregar o Turnstile."
                            )
                        );
                    };

                const existente =
                    document.getElementById(
                        TURNSTILE_SCRIPT_ID
                    );

                if (existente) {
                    existente.addEventListener(
                        "load",
                        concluir,
                        {
                            once:
                                true,
                        }
                    );

                    existente.addEventListener(
                        "error",
                        falhar,
                        {
                            once:
                                true,
                        }
                    );

                    return;
                }

                const script =
                    document.createElement(
                        "script"
                    );

                script.id =
                    TURNSTILE_SCRIPT_ID;

                script.src =
                    TURNSTILE_SCRIPT_URL;

                script.async =
                    true;

                script.defer =
                    true;

                script.addEventListener(
                    "load",
                    concluir,
                    {
                        once:
                            true,
                    }
                );

                script.addEventListener(
                    "error",
                    falhar,
                    {
                        once:
                            true,
                    }
                );

                document.head.appendChild(
                    script
                );
            }
        )
            .catch(
                (error) => {
                    promessaScriptTurnstile =
                        null;

                    throw error;
                }
            );

    return promessaScriptTurnstile;
}

export function TurnstileWidget({
    action = "login",
    resetKey = 0,
    onTokenChange,
}) {
    const containerRef =
        useRef(null);

    const widgetIdRef =
        useRef(null);

    const callbackRef =
        useRef(
            onTokenChange
        );

    const [
        erro,
        setErro,
    ] =
        useState(
            () =>
                TURNSTILE_SITE_KEY
                    ? ""
                    : "Verificação de segurança não configurada neste ambiente."
        );

    useEffect(
        () => {
            callbackRef.current =
                onTokenChange;
        },
        [
            onTokenChange,
        ]
    );

    useEffect(
        () => {
            let ativo =
                true;

            callbackRef.current?.(
                ""
            );

            if (!TURNSTILE_SITE_KEY) {
                return undefined;
            }

            carregarScriptTurnstile()
                .then(
                    (turnstile) => {
                        if (
                            !ativo ||
                            !containerRef.current
                        ) {
                            return;
                        }

                        setErro("");

                        widgetIdRef.current =
                            turnstile.render(
                                containerRef.current,
                                {
                                    sitekey:
                                        TURNSTILE_SITE_KEY,

                                    theme:
                                        "dark",

                                    action,

                                    callback:
                                        (
                                            token
                                        ) => {
                                            if (!ativo) {
                                                return;
                                            }

                                            setErro("");

                                            callbackRef.current?.(
                                                String(
                                                    token ||
                                                    ""
                                                )
                                            );
                                        },

                                    "expired-callback":
                                        () => {
                                            if (!ativo) {
                                                return;
                                            }

                                            callbackRef.current?.(
                                                ""
                                            );
                                        },

                                    "error-callback":
                                        () => {
                                            if (!ativo) {
                                                return;
                                            }

                                            callbackRef.current?.(
                                                ""
                                            );

                                            setErro(
                                                "Não foi possível concluir a verificação de segurança. Tente novamente."
                                            );
                                        },
                                }
                            );
                    }
                )
                .catch(
                    () => {
                        if (!ativo) {
                            return;
                        }

                        callbackRef.current?.(
                            ""
                        );

                        setErro(
                            "Não foi possível carregar a verificação de segurança."
                        );
                    }
                );

            return () => {
                ativo =
                    false;

                const widgetId =
                    widgetIdRef.current;

                widgetIdRef.current =
                    null;

                const turnstile =
                    obterTurnstileGlobal();

                if (
                    widgetId !==
                        null &&
                    turnstile &&
                    typeof turnstile.remove ===
                        "function"
                ) {
                    try {
                        turnstile.remove(
                            widgetId
                        );
                    }
                    catch {
                        // Cleanup sem impacto funcional.
                    }
                }
            };
        },
        [
            action,
        ]
    );

    useEffect(
        () => {
            callbackRef.current?.(
                ""
            );

            const widgetId =
                widgetIdRef.current;

            const turnstile =
                obterTurnstileGlobal();

            if (
                widgetId ===
                    null ||
                !turnstile ||
                typeof turnstile.reset !==
                    "function"
            ) {
                return;
            }

            try {
                turnstile.reset(
                    widgetId
                );

                queueMicrotask(
                    () => {
                        setErro("");
                    }
                );
            }
            catch {
                queueMicrotask(
                    () => {
                        setErro(
                            "Atualize a verificação de segurança antes de continuar."
                        );
                    }
                );
            }
        },
        [
            resetKey,
        ]
    );

    return (
        <div className="space-y-1.5">
            <div
                ref={containerRef}
                className="flex min-h-[65px] w-full items-center justify-center"
            />

            {erro ? (
                <p
                    role="alert"
                    className="text-center text-[10px] font-medium leading-4 text-amber-200/85"
                >
                    {erro}
                </p>
            ) : null}
        </div>
    );
}