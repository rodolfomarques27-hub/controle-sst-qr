import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./styles/app-layout-global.css";
import App from "./App.jsx";
import { AppErrorBoundary } from "./components/layout/AppErrorBoundary.jsx";

createRoot(document.getElementById("root")).render(
    <StrictMode>
        <AppErrorBoundary>
            <App />
        </AppErrorBoundary>
    </StrictMode>
);
