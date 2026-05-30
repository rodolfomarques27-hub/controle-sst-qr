import React from "react";
import { ShieldCheck } from "lucide-react";

export function AppMobileHeader({ nav = [], tela, onSelecionarTela }) {
    return (
        <div className="mb-5 flex min-w-0 items-center justify-between gap-3 rounded-3xl bg-white p-3 shadow-sm lg:hidden">
            <div className="flex items-center gap-2 font-bold">
                <ShieldCheck className="h-5 w-5" />
                Controle SST QR
            </div>

            <select
                value={tela}
                onChange={(evento) => {
                    const idSelecionado = evento.target.value;
                    const itemSelecionado = nav.find((item) => item.id === idSelecionado);
                    onSelecionarTela(idSelecionado, itemSelecionado?.label || idSelecionado);
                }}
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
            >
                {nav.map((item) => (
                    <option key={item.id} value={item.id}>
                        {item.label}
                    </option>
                ))}
            </select>
        </div>
    );
}
