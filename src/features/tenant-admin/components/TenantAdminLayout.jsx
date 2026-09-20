import {
    ShieldCheck,
} from "lucide-react";

import {
    TenantAdminSidebar,
} from "./TenantAdminSidebar.jsx";

export function TenantAdminLayout({
    usuario,
    onSair,
    children,
}) {
    return (
        <div className="min-h-screen bg-[#F4F6F9]">
            <TenantAdminSidebar
                usuario={usuario}
                onSair={onSair}
            />

            <div className="min-h-screen lg:pl-[270px]">
                <header className="border-b border-slate-200 bg-white">
                    <div className="flex min-h-[68px] items-center justify-between px-5 lg:px-8">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">
                                SafeScan Brasil
                            </p>

                            <p className="text-sm font-semibold text-slate-800">
                                Administração central da plataforma
                            </p>
                        </div>

                        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2">
                            <ShieldCheck className="h-4 w-4 text-emerald-600" />

                            <span className="text-xs font-semibold text-emerald-800">
                                Administrador global
                            </span>
                        </div>
                    </div>
                </header>

                <main className="px-5 py-6 lg:px-8">
                    {children}
                </main>
            </div>
        </div>
    );
}