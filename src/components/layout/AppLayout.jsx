import React from "react";
import { AppMobileHeader } from "./AppMobileHeader";
import { AppSidebar } from "./AppSidebar";

export function AppLayout({
    estilosGlobais,
    nav = [],
    tela,
    menuLateralAberto,
    setMenuLateralAberto,
    usuario,
    sair,
    onSelecionarTela,
    children,
}) {
    return (
        <div className="min-h-screen bg-slate-100 text-slate-900">
            <style>{estilosGlobais}</style>
            <div className="app-shell flex min-h-screen">
                <AppSidebar
                    nav={nav}
                    tela={tela}
                    menuLateralAberto={menuLateralAberto}
                    setMenuLateralAberto={setMenuLateralAberto}
                    usuario={usuario}
                    sair={sair}
                    onSelecionarTela={onSelecionarTela}
                />

                <main className="app-main">
                    <div className="app-content">
                        <AppMobileHeader
                            nav={nav}
                            tela={tela}
                            onSelecionarTela={onSelecionarTela}
                        />

                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
