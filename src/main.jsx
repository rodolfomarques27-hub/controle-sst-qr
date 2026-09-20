import {
    StrictMode,
    Suspense,
    lazy,
} from "react";

import {
    createRoot,
} from "react-dom/client";

import "./index.css";
import "./styles/app-layout-global.css";

import {
    deveRenderizarPainelAdmin,
    deveRenderizarPortalAcesso,
    deveRenderizarSiteInstitucionalDev,
} from "./routes/runtimeEntryService.js";

const App =
    lazy(
        () =>
            import(
                "./App.jsx"
            )
    );

const TenantContextGate =
    lazy(
        () =>
            import(
                "./components/layout/TenantContextGate.jsx"
            ).then(
                (modulo) => ({
                    default:
                        modulo.TenantContextGate,
                })
            )
    );

const SiteInstitucionalPage =
    lazy(
        () =>
            import(
                "./features/site-institucional/pages/SiteInstitucionalPage.jsx"
            ).then(
                (modulo) => ({
                    default:
                        modulo.SiteInstitucionalPage,
                })
            )
    );

const TenantAdminRoot =
    lazy(
        () =>
            import(
                "./features/tenant-admin/TenantAdminRoot.jsx"
            )
    );

const AccessPortalPage =
    lazy(
        () =>
            import(
                "./features/access-portal/AccessPortalPage.jsx"
            ).then(
                (modulo) => ({
                    default:
                        modulo.AccessPortalPage,
                })
            )
    );

const CHAVE_RECARGA_PRELOAD =
    "safescan:vite-preload-reload";

const INTERVALO_RECARGA_PRELOAD_MS =
    15_000;

window.addEventListener(
    "vite:preloadError",
    (event) => {
        const agora =
            Date.now();

        let ultimaRecarga;

        try {
            ultimaRecarga =
                Number(
                    window.sessionStorage.getItem(
                        CHAVE_RECARGA_PRELOAD
                    ) || 0
                );
        } catch {
            return;
        }

        const recargaRecente =
            Number.isFinite(
                ultimaRecarga
            ) &&
            ultimaRecarga > 0 &&
            agora - ultimaRecarga <
                INTERVALO_RECARGA_PRELOAD_MS;

        if (recargaRecente) {
            return;
        }

        try {
            window.sessionStorage.setItem(
                CHAVE_RECARGA_PRELOAD,
                String(agora)
            );
        } catch {
            return;
        }

        event.preventDefault();
        window.location.reload();
    }
);

const renderizarPainelAdmin =
    deveRenderizarPainelAdmin();

const renderizarPortalAcesso =
    deveRenderizarPortalAcesso();

const renderizarSiteInstitucionalDev =
    deveRenderizarSiteInstitucionalDev();

const superficie =
    renderizarPainelAdmin ? (
        <TenantAdminRoot />
    ) : renderizarPortalAcesso ? (
        <AccessPortalPage />
    ) : renderizarSiteInstitucionalDev ? (
        <SiteInstitucionalPage />
    ) : (
        <TenantContextGate>
            <App />
        </TenantContextGate>
    );

createRoot(
    document.getElementById(
        "root"
    )
).render(
    <StrictMode>
        <Suspense fallback={null}>
            {superficie}
        </Suspense>
    </StrictMode>
);