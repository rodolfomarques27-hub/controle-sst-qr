import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";

import {
    AlertTriangle,
    CircleAlert,
    ShieldCheck,
    X,
} from "lucide-react";

import {
    EVENTO_CONFIRMACAO_SAFESCAN,
} from "../../services/safeScanConfirmService.js";

const CONFIGURACAO_CONFIRMACAO =
    Object.freeze({
        padrao: {
            Icone:
                ShieldCheck,
            icone:
                "bg-emerald-50 text-emerald-700 ring-emerald-100",
            botao:
                "bg-emerald-700 text-white hover:bg-emerald-800 focus:ring-emerald-100",
        },
        atencao: {
            Icone:
                AlertTriangle,
            icone:
                "bg-amber-50 text-amber-700 ring-amber-100",
            botao:
                "bg-amber-600 text-white hover:bg-amber-700 focus:ring-amber-100",
        },
        perigo: {
            Icone:
                CircleAlert,
            icone:
                "bg-red-50 text-red-700 ring-red-100",
            botao:
                "bg-red-600 text-white hover:bg-red-700 focus:ring-red-100",
        },
    });

export function SafeScanConfirmHost() {
    const [
        confirmacoes,
        setConfirmacoes,
    ] = useState([]);

    const pendentesRef =
        useRef(
            new Map()
        );

    const cancelarRef =
        useRef(
            null
        );

    const confirmacaoAtual =
        confirmacoes[0] ||
        null;

    const finalizar =
        useCallback(
            (
                id,
                resultado
            ) => {
                const resolver =
                    pendentesRef.current.get(
                        id
                    );

                if (resolver) {
                    pendentesRef.current.delete(
                        id
                    );

                    resolver(
                        resultado ===
                            true
                    );
                }

                setConfirmacoes(
                    (atuais) =>
                        atuais.filter(
                            (item) =>
                                item.id !==
                                id
                        )
                );
            },
            []
        );

    useEffect(
        () => {
            function receberConfirmacao(
                event
            ) {
                const detail =
                    event?.detail &&
                    typeof event.detail ===
                        "object"
                        ? event.detail
                        : {};

                const mensagem =
                    String(
                        detail.mensagem ??
                            ""
                    ).trim();

                if (
                    !mensagem ||
                    typeof detail.concluir !==
                        "function"
                ) {
                    return;
                }

                event.preventDefault();

                const id =
                    detail.id;

                if (
                    pendentesRef.current.has(
                        id
                    )
                ) {
                    return;
                }

                pendentesRef.current.set(
                    id,
                    detail.concluir
                );

                setConfirmacoes(
                    (atuais) => [
                        ...atuais,
                        {
                            id,
                            titulo:
                                String(
                                    detail.titulo ??
                                        ""
                                ).trim() ||
                                "Confirmar ação",
                            mensagem,
                            confirmarTexto:
                                String(
                                    detail.confirmarTexto ??
                                        ""
                                ).trim() ||
                                "Confirmar",
                            cancelarTexto:
                                String(
                                    detail.cancelarTexto ??
                                        ""
                                ).trim() ||
                                "Cancelar",
                            variante:
                                CONFIGURACAO_CONFIRMACAO[
                                    detail.variante
                                ]
                                    ? detail.variante
                                    : "padrao",
                        },
                    ]
                );
            }

            globalThis.addEventListener(
                EVENTO_CONFIRMACAO_SAFESCAN,
                receberConfirmacao
            );

            const pendentes =
                pendentesRef.current;

            return () => {
                globalThis.removeEventListener(
                    EVENTO_CONFIRMACAO_SAFESCAN,
                    receberConfirmacao
                );

                pendentes.forEach(
                    (resolver) => {
                        resolver(
                            false
                        );
                    }
                );

                pendentes.clear();
            };
        },
        []
    );

    useEffect(
        () => {
            if (
                !confirmacaoAtual
            ) {
                return undefined;
            }

            const timer =
                globalThis.setTimeout(
                    () => {
                        cancelarRef.current?.focus();
                    },
                    0
                );

            return () => {
                globalThis.clearTimeout(
                    timer
                );
            };
        },
        [
            confirmacaoAtual,
        ]
    );

    useEffect(
        () => {
            if (
                !confirmacaoAtual
            ) {
                return undefined;
            }

            function aoPressionarTecla(
                event
            ) {
                if (
                    event.key !==
                    "Escape"
                ) {
                    return;
                }

                event.preventDefault();

                finalizar(
                    confirmacaoAtual.id,
                    false
                );
            }

            globalThis.addEventListener(
                "keydown",
                aoPressionarTecla
            );

            return () => {
                globalThis.removeEventListener(
                    "keydown",
                    aoPressionarTecla
                );
            };
        },
        [
            confirmacaoAtual,
            finalizar,
        ]
    );

    if (
        !confirmacaoAtual
    ) {
        return null;
    }

    const configuracao =
        CONFIGURACAO_CONFIRMACAO[
            confirmacaoAtual.variante
        ];

    const Icone =
        configuracao.Icone;

    return (
        <div
            className="fixed inset-0 z-[360] flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-[2px]"
            role="presentation"
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="safescan-confirm-title"
                aria-describedby="safescan-confirm-message"
                className="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.32)]"
            >
                <div className="flex items-start gap-4 p-5 sm:p-6">
                    <div
                        className={
                            "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1 " +
                            configuracao.icone
                        }
                    >
                        <Icone className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                        <h2
                            id="safescan-confirm-title"
                            className="text-base font-bold text-slate-950 sm:text-lg"
                        >
                            {confirmacaoAtual.titulo}
                        </h2>

                        <p
                            id="safescan-confirm-message"
                            className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600"
                        >
                            {confirmacaoAtual.mensagem}
                        </p>
                    </div>

                    <button
                        type="button"
                        aria-label="Cancelar confirmação"
                        onClick={() =>
                            finalizar(
                                confirmacaoAtual.id,
                                false
                            )
                        }
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-4 focus:ring-slate-100"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/80 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
                    <button
                        ref={cancelarRef}
                        type="button"
                        onClick={() =>
                            finalizar(
                                confirmacaoAtual.id,
                                false
                            )
                        }
                        className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-4 focus:ring-slate-100"
                    >
                        {confirmacaoAtual.cancelarTexto}
                    </button>

                    <button
                        type="button"
                        onClick={() =>
                            finalizar(
                                confirmacaoAtual.id,
                                true
                            )
                        }
                        className={
                            "inline-flex min-h-10 items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-4 " +
                            configuracao.botao
                        }
                    >
                        {confirmacaoAtual.confirmarTexto}
                    </button>
                </div>
            </div>
        </div>
    );
}
