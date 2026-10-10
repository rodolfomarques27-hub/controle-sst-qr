import {
    Building2,
    ShieldAlert,
    X,
} from "lucide-react";

export function TenantAdminResourceConfirmModal({
    aberto = false,
    tenantName = "",
    recursoNome = "",
    processando = false,
    onCancel,
    onConfirm,
}) {
    if (!aberto) {
        return null;
    }

    return (
        <div
            className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
            role="presentation"
            onMouseDown={
                (event) => {
                    if (
                        event.target ===
                            event.currentTarget &&
                        !processando
                    ) {
                        onCancel?.();
                    }
                }
            }
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="tenant-resource-confirm-title"
                aria-describedby="tenant-resource-confirm-description"
                className="w-full max-w-[520px] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
            >
                <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
                    <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                            <ShieldAlert className="h-5 w-5" />
                        </div>

                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-red-600">
                                Confirmação de segurança
                            </p>

                            <h2
                                id="tenant-resource-confirm-title"
                                className="mt-1 text-lg font-black text-slate-950"
                            >
                                Desativar recurso
                            </h2>
                        </div>
                    </div>

                    <button
                        type="button"
                        disabled={processando}
                        onClick={onCancel}
                        aria-label="Fechar confirmação"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-50"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </header>

                <div className="space-y-4 px-6 py-5">
                    <p
                        id="tenant-resource-confirm-description"
                        className="text-sm leading-6 text-slate-600"
                    >
                        Confira o cliente e o recurso antes de confirmar a desativação.
                    </p>

                    <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4">
                        <div className="flex items-start gap-3">
                            <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />

                            <div className="min-w-0">
                                <p className="text-[10px] font-black uppercase tracking-[0.1em] text-amber-700">
                                    Cliente alvo
                                </p>

                                <p className="mt-1 break-words text-base font-black text-slate-950">
                                    {
                                        tenantName ||
                                        "Tenant não identificado"
                                    }
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">
                            Recurso
                        </p>

                        <p className="mt-1 text-sm font-black text-slate-900">
                            {
                                recursoNome ||
                                "Recurso não identificado"
                            }
                        </p>
                    </div>

                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
                        <p className="text-xs font-bold leading-5 text-red-800">
                            A desativação bloqueia o uso deste recurso no backend.
                        </p>

                        <p className="mt-1 text-[11px] leading-5 text-red-700">
                            PINs, hashes, configurações e histórico permanecem preservados para uma futura reativação.
                        </p>
                    </div>
                </div>

                <footer className="grid gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:grid-cols-2">
                    <button
                        type="button"
                        disabled={processando}
                        onClick={onCancel}
                        className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:cursor-wait disabled:opacity-50"
                    >
                        Cancelar
                    </button>

                    <button
                        type="button"
                        disabled={processando}
                        onClick={onConfirm}
                        className="inline-flex h-11 items-center justify-center rounded-xl bg-red-600 px-4 text-sm font-black text-white shadow-sm transition hover:bg-red-700 disabled:cursor-wait disabled:bg-red-300"
                    >
                        {
                            processando
                                ? "Processando..."
                                : "Confirmar desativação"
                        }
                    </button>
                </footer>
            </div>
        </div>
    );
}
