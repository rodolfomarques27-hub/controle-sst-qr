import { useEffect, useState } from "react";
import { criarUrlAssinadaStorage } from "../services/supabaseServices";

export function useStorageUrl(bucket, caminhoOuUrl, validadeSegundos = 600) {
    const [url, setUrl] = useState("");

    useEffect(() => {
        let ativo = true;

        async function carregarUrl() {
            if (!caminhoOuUrl) {
                if (ativo) setUrl("");
                return;
            }

            const gerada = await criarUrlAssinadaStorage(bucket, caminhoOuUrl, validadeSegundos);
            if (ativo) setUrl(gerada);
        }

        carregarUrl();

        return () => {
            ativo = false;
        };
    }, [bucket, caminhoOuUrl, validadeSegundos]);

    return url;
}

export default useStorageUrl;
