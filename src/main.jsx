import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./styles/app-layout-global.css";
import App from "./App.jsx";

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
            // Sem sessionStorage, não tentamos recarga automática.
            return;
        }

        const recargaRecente =
            Number.isFinite(ultimaRecarga) &&
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
            // Se não pudermos marcar a tentativa, evitamos risco de loop.
            return;
        }

        event.preventDefault();
        window.location.reload();
    }
);

createRoot(document.getElementById("root")).render(
    <StrictMode>
        <App />
    </StrictMode>
);
