import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

const removerPreloaderInicial = () => {
    const preloader = document.getElementById("app-preloader");

    if (!preloader) return;

    preloader.classList.add("app-preloader--hidden");

    window.setTimeout(() => {
        preloader.remove();
    }, 220);
};

createRoot(document.getElementById("root")).render(
    <StrictMode>
        <App />
    </StrictMode>
);

window.requestAnimationFrame(removerPreloaderInicial);
