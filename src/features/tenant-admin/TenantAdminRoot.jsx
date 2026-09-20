import {
    supabase,
} from "../../lib/supabaseClient.js";

import {
    TenantAdminAuthGate,
} from "./components/TenantAdminAuthGate.jsx";

import {
    TenantAdminLayout,
} from "./components/TenantAdminLayout.jsx";

import {
    TenantAdminDashboardPage,
} from "./pages/TenantAdminDashboardPage.jsx";

export default function TenantAdminRoot() {
    return (
        <TenantAdminAuthGate
            supabase={supabase}
        >
            {({
                usuario,
                sair,
            }) => (
                <TenantAdminLayout
                    usuario={usuario}
                    onSair={sair}
                >
                    <TenantAdminDashboardPage />
                </TenantAdminLayout>
            )}
        </TenantAdminAuthGate>
    );
}