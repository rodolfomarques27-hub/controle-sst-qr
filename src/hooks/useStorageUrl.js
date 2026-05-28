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

export function useStorageUrl(bucket, caminhoOuUrl, validadeSegundos = 600) {
    const [url, setUrl] = useState("");

    useEffect(() => {
        let cancelado = false;

        async function carregarUrl() {
            const valor = String(caminhoOuUrl || "").trim();

            if (!valor) {
                setUrl("");
                return;
            }

            if (valorEhUrlFinal(valor)) {
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