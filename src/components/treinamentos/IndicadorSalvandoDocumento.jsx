import React from "react";
import {
    CheckCircle2,
    FileText,
    Loader2,
    ShieldCheck,
} from "lucide-react";

export default function IndicadorSalvandoDocumento({
    titulo = "Salvando documento",
    descricao = "Aguarde enquanto o sistema envia, grava e atualiza as informações.",
    detalhe = "Não feche esta tela até a conclusão do processo.",
    compacto = false,
    percentual = null,
    atual = null,
    total = null,
}) {
    const possuiPercentual =
        percentual !== null &&
        percentual !== undefined &&
        Number.isFinite(
            Number(percentual)
        );

    const percentualSeguro =
        possuiPercentual
            ? Math.max(
                0,
                Math.min(
                    100,
                    Number(percentual)
                )
            )
            : null;

    const percentualArredondado =
        possuiPercentual
            ? Math.round(
                percentualSeguro
            )
            : null;

    const possuiContador =
        possuiPercentual &&
        Number(total) > 0 &&
        Number(atual) >= 0;

    const concluido =
        possuiPercentual &&
        percentualSeguro >= 100;

    return (
        <div
            className={[
                "relative ml-4 mr-6 overflow-hidden rounded-2xl border bg-white",
                "transition-colors duration-300",
                concluido
                    ? "border-emerald-200 shadow-[0_5px_18px_rgba(16,185,129,0.08)]"
                    : "border-slate-200 shadow-[0_5px_18px_rgba(15,23,42,0.055)]",
                compacto
                    ? "mt-3 px-4 py-3"
                    : "mt-4 px-4 py-4",
            ].join(" ")}
            role="status"
            aria-live="polite"
        >
            <div className="flex items-center gap-3">
                <div
                    className={[
                        "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white",
                        "shadow-sm transition-colors duration-300",
                        concluido
                            ? "bg-emerald-600 shadow-emerald-100"
                            : "bg-blue-600 shadow-blue-100",
                    ].join(" ")}
                >
                    {concluido ? (
                        <CheckCircle2 className="h-5 w-5" />
                    ) : (
                        <FileText className="h-5 w-5" />
                    )}

                    {!concluido ? (
                        <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-blue-700">
                            <Loader2 className="h-3 w-3 animate-spin" />
                        </span>
                    ) : null}
                </div>

                <div className="min-w-0 flex-1">
                    <p className="text-sm font-black leading-tight text-slate-900">
                        {titulo}
                    </p>

                    <p className="mt-1 text-[11px] font-semibold leading-relaxed text-slate-500">
                        {descricao}
                    </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                    {possuiPercentual ? (
                        <strong
                            className={[
                                "min-w-[42px] text-right text-lg font-black leading-none tracking-[-0.04em]",
                                concluido
                                    ? "text-emerald-700"
                                    : "text-blue-700",
                            ].join(" ")}
                        >
                            {percentualArredondado}%
                        </strong>
                    ) : null}

                    <span
                        className={[
                            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1",
                            "text-[9px] font-black uppercase tracking-[0.08em]",
                            concluido
                                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
                                : "bg-blue-50 text-blue-700 ring-1 ring-blue-100",
                        ].join(" ")}
                    >
                        {concluido ? (
                            <CheckCircle2 className="h-3 w-3" />
                        ) : (
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-600" />
                        )}

                        {concluido
                            ? "Concluído"
                            : "Em andamento"}
                    </span>
                </div>
            </div>

            <div
                className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 ring-1 ring-inset ring-slate-200/70"
                role={possuiPercentual ? "progressbar" : undefined}
                aria-valuemin={possuiPercentual ? 0 : undefined}
                aria-valuemax={possuiPercentual ? 100 : undefined}
                aria-valuenow={
                    possuiPercentual
                        ? percentualArredondado
                        : undefined
                }
                aria-label={
                    possuiPercentual
                        ? "Progresso real do salvamento do lote"
                        : "Processamento em andamento"
                }
            >
                {possuiPercentual ? (
                    <div
                        className={[
                            "h-full rounded-full transition-[width,background-color]",
                            "duration-300 ease-out",
                            concluido
                                ? "bg-gradient-to-r from-emerald-600 to-emerald-400"
                                : "bg-gradient-to-r from-blue-600 via-blue-500 to-sky-400",
                        ].join(" ")}
                        style={{
                            width:
                                `${percentualSeguro}%`,
                        }}
                    />
                ) : (
                    <div className="h-full w-full animate-pulse rounded-full bg-gradient-to-r from-blue-600 via-blue-500 to-sky-400" />
                )}
            </div>

            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                {detalhe ? (
                    <div className="flex min-w-0 items-center gap-1.5 text-[10px] font-semibold text-slate-500">
                        <ShieldCheck
                            className={[
                                "h-3.5 w-3.5 shrink-0",
                                concluido
                                    ? "text-emerald-600"
                                    : "text-blue-500",
                            ].join(" ")}
                        />

                        <span>
                            {concluido
                                ? "Processamento documental concluído."
                                : detalhe}
                        </span>
                    </div>
                ) : (
                    <span />
                )}

                {possuiContador ? (
                    <span
                        className={[
                            "shrink-0 whitespace-nowrap text-[10px] font-black",
                            concluido
                                ? "text-emerald-700"
                                : "text-slate-600",
                        ].join(" ")}
                    >
                        {atual} de {total} documentos salvos
                    </span>
                ) : null}
            </div>
        </div>
    );
}
