import React from "react";

export default function IndicadorSalvandoDocumento({
    titulo = "Salvando documento",
    descricao = "Aguarde enquanto o sistema envia, grava e atualiza as informações.",
    detalhe = "Não feche esta tela até a conclusão do processo.",
    compacto = false,
}) {
    return (
        <div className={`${compacto ? "mt-3 p-3" : "mt-4 p-4"} rounded-2xl border border-blue-100 bg-blue-50/80 shadow-sm`}>
            <div className="flex items-center gap-3">
                <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm">
                    <svg
                        className="h-6 w-6 animate-spin"
                        viewBox="0 0 24 24"
                        fill="none"
                        aria-hidden="true"
                    >
                        <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="9"
                            stroke="currentColor"
                            strokeWidth="3"
                        />
                        <path
                            className="opacity-90"
                            d="M21 12a9 9 0 0 0-9-9"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                        />
                    </svg>

                    <svg
                        className="absolute h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        aria-hidden="true"
                    >
                        <path
                            d="M7 3.75h7.25L18 7.5v12.75H7V3.75Z"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinejoin="round"
                        />
                        <path
                            d="M14 3.75V8h4"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinejoin="round"
                        />
                    </svg>
                </div>

                <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-blue-950">
                        {titulo}...
                    </p>
                    <p className="mt-1 text-xs font-semibold leading-relaxed text-blue-800">
                        {descricao}
                    </p>
                    {detalhe ? (
                        <p className="mt-1 text-[11px] font-medium text-blue-700/80">
                            {detalhe}
                        </p>
                    ) : null}
                </div>
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                <div className="h-full w-2/3 animate-pulse rounded-full bg-blue-600" />
            </div>
        </div>
    );
}
