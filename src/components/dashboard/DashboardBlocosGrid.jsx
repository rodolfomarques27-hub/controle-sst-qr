import React from "react";
import { Card } from "../commonComponents";
import { classNames } from "../../utils/sstUtils";

export function DashboardBlocosGrid({
    mostrarFiltroPainel,
    blocosDashboardExibidos,
    mensagemDashboardSemBlocos,
    classeTamanhoBlocoDashboard,
    tamanhosBlocosDashboard,
    renderBlocoDashboard,
}) {
    if (!blocosDashboardExibidos.length) {
        return (
            <Card className={mostrarFiltroPainel ? "mt-3" : "mt-6"}>
                <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">
                    {mensagemDashboardSemBlocos}
                </div>
            </Card>
        );
    }

    return (
        <div className={classNames("grid gap-6 md:grid-cols-2 xl:grid-cols-6", mostrarFiltroPainel ? "mt-3" : "mt-6")}>
            {blocosDashboardExibidos.map((chave) => (
                <div key={chave} className={classNames("min-w-0", classeTamanhoBlocoDashboard(chave, tamanhosBlocosDashboard))}>
                    {renderBlocoDashboard(chave)}
                </div>
            ))}
        </div>
    );
}
