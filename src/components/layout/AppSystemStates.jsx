import React from "react";
import { QrCode, ShieldCheck, XCircle } from "lucide-react";

export function AppCarregandoSistema() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
            <div className="rounded-3xl bg-white/10 p-6 text-center">
                <ShieldCheck className="mx-auto mb-3 h-8 w-8" />
                <p className="font-semibold">Carregando sistema...</p>
            </div>
        </div>
    );
}

export function AppConsultaPublicaCarregando() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
            <div className="rounded-3xl bg-white/10 p-6 text-center">
                <QrCode className="mx-auto mb-3 h-8 w-8" />
                <p className="font-semibold">Carregando consulta pública...</p>
            </div>
        </div>
    );
}

export function AppConsultaPublicaErro({ mensagem }) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
            <div className="w-full max-w-lg rounded-[2rem] bg-white p-8 text-center shadow-sm">
                <XCircle className="mx-auto mb-3 h-10 w-10 text-red-500" />
                <h1 className="text-xl font-bold text-slate-950">QR Code não encontrado</h1>
                <p className="mt-2 text-sm text-slate-500">
                    {mensagem || "Não foi possível localizar a consulta pública deste colaborador."}
                </p>
            </div>
        </div>
    );
}
