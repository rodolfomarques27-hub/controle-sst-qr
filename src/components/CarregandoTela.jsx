import React from "react";
import { RefreshCw } from "lucide-react";

export function CarregandoTela({ mensagem = "Carregando tela..." }) {
    return (
        <div className="flex min-h-[320px] items-center justify-center rounded-3xl bg-white p-8 text-slate-600 shadow-sm">
            <div className="text-center">
                <RefreshCw className="mx-auto mb-3 h-6 w-6 animate-spin" />
                <p className="text-sm font-semibold">{mensagem}</p>
            </div>
        </div>
    );
}
