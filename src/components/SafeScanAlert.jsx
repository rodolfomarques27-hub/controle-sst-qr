import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
    AlertTriangle,
    CircleCheckBig,
    CircleX,
    Info,
    X,
} from "lucide-react";
import resumoDashboardHero from "../assets/nova-auditoria-hero-bg.webp";

const CONFIGURACOES_TIPO = {
    info: {
        titulo: "Informação",
        Icone: Info,
        iconeClasse:
            "text-sky-500",
    },
    aviso: {
        titulo: "Atenção",
        Icone: AlertTriangle,
        iconeClasse:
            "text-amber-500",
    },
    erro: {
        titulo: "Não foi possível concluir",
        Icone: CircleX,
        iconeClasse:
            "text-red-500",
    },
    sucesso: {
        titulo: "Concluído com sucesso",
        Icone: CircleCheckBig,
        iconeClasse:
            "text-emerald-500",
    },
};

export default function SafeScanAlert({
    aberto = false,
    titulo = "",
    mensagem = "",
    tipo = "info",
    rotuloBotao = "Entendi",
    onFechar,
}) {
    const botaoRef =
        useRef(null);

    const configuracao =
        CONFIGURACOES_TIPO[tipo] ||
        CONFIGURACOES_TIPO.info;

    const Icone =
        configuracao.Icone;

    useEffect(() => {
        if (
            !aberto ||
            typeof document === "undefined"
        ) {
            return undefined;
        }

        const overflowAnterior =
            document.body.style.overflow;

        document.body.style.overflow =
            "hidden";

        const fecharComEscape = (evento) => {
            if (evento.key === "Escape") {
                onFechar?.();
            }
        };

        window.addEventListener(
            "keydown",
            fecharComEscape
        );

        const foco =
            window.setTimeout(
                () => {
                    botaoRef.current?.focus();
                },
                0
            );

        return () => {
            window.clearTimeout(foco);

            window.removeEventListener(
                "keydown",
                fecharComEscape
            );

            document.body.style.overflow =
                overflowAnterior;
        };
    }, [
        aberto,
        onFechar,
    ]);

    if (
        !aberto ||
        typeof document === "undefined"
    ) {
        return null;
    }

    const tituloFinal =
        String(
            titulo ||
            configuracao.titulo
        ).trim();

    return createPortal(
        <div
            className="
                fixed inset-0 z-[250]
                flex items-center justify-center
                bg-slate-950/55
                px-4 py-6
                backdrop-blur-[3px]
            "
            role="presentation"
        >
            <div
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="safescan-alert-title"
                aria-describedby="safescan-alert-message"
                className="
                    w-full
                    max-w-[620px]
                    overflow-hidden
                    rounded-[24px]
                    border border-slate-300/80
                    bg-white
                    shadow-[0_26px_80px_rgba(2,8,23,0.32)]
                "
            >
                <header
                    className="
                        relative
                        shrink-0
                        overflow-hidden
                        border-b border-slate-700/70
                        px-5 py-4
                        text-white
                        sm:px-6
                    "
                >
                    <div
                        className="
                            absolute inset-0
                            bg-cover
                            bg-center
                        "
                        style={{
                            backgroundImage:
                                `url(${resumoDashboardHero})`,
                            backgroundPosition:
                                "center 36%",
                        }}
                    />

                    <div
                        className="
                            absolute inset-0
                            bg-[linear-gradient(90deg,rgba(15,23,42,0.95)_0%,rgba(15,23,42,0.88)_52%,rgba(15,23,42,0.62)_100%)]
                        "
                    />

                    <div
                        aria-hidden="true"
                        className="
                            absolute
                            bottom-0 left-0 right-0
                            h-px
                            bg-gradient-to-r
                            from-emerald-400
                            via-cyan-400
                            to-sky-500
                        "
                    />

                    <div
                        className="
                            relative
                            flex
                            items-start
                            justify-between
                            gap-4
                        "
                    >
                        <div className="min-w-0">
                            <p
                                className="
                                    text-[10px]
                                    font-black
                                    uppercase
                                    tracking-[0.17em]
                                    text-emerald-300
                                "
                            >
                                SafeScan Brasil
                            </p>

                            <h2
                                id="safescan-alert-title"
                                className="
                                    mt-1
                                    text-[19px]
                                    font-black
                                    leading-tight
                                    tracking-[-0.02em]
                                    text-white
                                "
                            >
                                {tituloFinal}
                            </h2>
                        </div>

                        <button
                            type="button"
                            onClick={onFechar}
                            aria-label="Fechar aviso"
                            className="
                                grid
                                h-9 w-9
                                shrink-0
                                place-items-center
                                rounded-2xl
                                border border-white/25
                                bg-white/10
                                text-white
                                backdrop-blur
                                transition
                                hover:bg-white/20
                                focus:outline-none
                                focus:ring-4
                                focus:ring-cyan-300/30
                            "
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </header>

                <div
                    className="
                        flex
                        flex-col
                        gap-4
                        bg-white
                        px-5 py-4
                        sm:flex-row
                        sm:items-center
                        sm:justify-between
                        sm:gap-5
                        sm:px-6
                    "
                >
                    <div
                        className="
                            flex
                            min-w-0
                            flex-1
                            items-center
                            gap-2.5
                        "
                    >
                        <Icone
                            aria-hidden="true"
                            className={[
                                "h-[19px] w-[19px] shrink-0",
                                configuracao.iconeClasse,
                            ].join(" ")}
                        />

                        <p
                            id="safescan-alert-message"
                            className="
                                min-w-0
                                text-[13px]
                                font-semibold
                                leading-5
                                text-slate-700
                                sm:whitespace-nowrap
                            "
                        >
                            {mensagem}
                        </p>
                    </div>

                    <button
                        ref={botaoRef}
                        type="button"
                        onClick={onFechar}
                        className="
                            inline-flex
                            min-h-9
                            shrink-0
                            items-center
                            justify-center
                            rounded-xl
                            bg-[#071426]
                            px-4 py-2
                            text-[13px]
                            font-bold
                            text-white
                            shadow-[0_7px_16px_rgba(2,8,23,0.16)]
                            transition
                            hover:bg-[#0b2038]
                            focus:outline-none
                            focus:ring-4
                            focus:ring-cyan-300/45
                            active:translate-y-px
                            sm:min-w-[104px]
                        "
                    >
                        {rotuloBotao}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}