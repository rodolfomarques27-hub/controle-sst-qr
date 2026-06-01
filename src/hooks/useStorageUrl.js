import { useEffect, useState } from "react";
import { criarUrlAssinadaStorage } from "../services/supabaseServices";

function valorEhUrlFinal(valor) {
    const texto = String(valor || "").trim();

    return (
        /^https?:\/\//i.test(texto) ||
        texto.startsWith("blob:") ||
        texto.startsWith("data:")
    );
}

function extrairCaminhoStorageDaUrl(valor = "", bucket = "") {
    const texto = String(valor || "").trim();
    if (!texto || !/^https?:\/\//i.test(texto)) return "";

    try {
        const url = new URL(texto);
        const partes = url.pathname.split("/").filter(Boolean);
        const indiceBucket = partes.findIndex((parte) => parte === bucket);

        if (indiceBucket >= 0 && partes.length > indiceBucket + 1) {
            return decodeURIComponent(partes.slice(indiceBucket + 1).join("/"));
        }
    } catch {
        // Se não conseguir interpretar a URL, mantém o fluxo padrão.
    }

    return "";
}

function normalizarCaminhoStorage(valor = "", bucket = "") {
    const texto = String(valor || "").trim();

    if (!texto) return "";

    if (/^(data:|blob:)\/\//i.test(texto) || /^data:/i.test(texto) || /^blob:/i.test(texto)) {
        return texto;
    }

    const caminhoExtraido = extrairCaminhoStorageDaUrl(texto, bucket);

    if (caminhoExtraido) {
        return caminhoExtraido;
    }

    if (/^https?:\/\//i.test(texto)) {
        return texto;
    }

    return texto
        .replace(new RegExp(`^${bucket}/`, "i"), "")
        .replace(/^\/+/g, "")
        .trim();
}

export function useStorageUrl(bucket, caminhoOuUrl, validadeSegundos = 600) {
    const [url, setUrl] = useState("");

    useEffect(() => {
        let cancelado = false;

        async function carregarUrl() {
            const valor = normalizarCaminhoStorage(caminhoOuUrl, bucket);

            if (!valor) {
                setUrl("");
                return;
            }

            if (valorEhUrlFinal(valor) && !extrairCaminhoStorageDaUrl(valor, bucket)) {
                setUrl(valor);
                return;
            }

            try {
                const urlAssinada = await criarUrlAssinadaStorage(bucket, valor, validadeSegundos);

                if (!cancelado) {
                    setUrl(urlAssinada || "");
                }
            } catch (error) {
                console.warn(`Erro ao gerar URL assinada do bucket ${bucket}:`, error?.message || error);

                if (!cancelado) {
                    setUrl("");
                }
            }
        }

        carregarUrl();

        return () => {
            cancelado = true;
        };
    }, [bucket, caminhoOuUrl, validadeSegundos]);

    return url;
}

export default useStorageUrl;
