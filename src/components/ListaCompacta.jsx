import React from "react";
import { Card } from "./commonComponents";

export function ListaCompacta({ titulo, subtitulo, vazio, children }) {
    return (
        <Card>
            <div className="mb-4">
                <h2 className="text-lg font-bold text-slate-950">{titulo}</h2>
                {subtitulo && <p className="mt-1 text-sm text-slate-500">{subtitulo}</p>}
            </div>

            <div className="space-y-2">
                {children || (
                    <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">
                        {vazio}
                    </div>
                )}
            </div>
        </Card>
    );
}

export default ListaCompacta;
