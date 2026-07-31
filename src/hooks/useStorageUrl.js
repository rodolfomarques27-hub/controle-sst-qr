import { useEffect, useState } from "react";
import { criarUrlAssinadaStorage } from "../services/supabaseServices";
import { SUPABASE_URL } from "../lib/supabaseClient";

const CACHE_URLS_STORAGE = new Map();
const REQUISICOES_URLS_STORAGE = new Map();
const PRECARREGAMENTOS_IMAGEM = new Map();

const MARGEM_EXPIRACAO_CACHE_SEGUNDOS = 30;
const LIMITE_CACHE_URLS = 250;
const LIMITE_CACHE_IMAGENS = 120;

function limitarTamanhoMap(mapa, limite) {
    while (mapa.size > limite) {
        const primeiraChave = mapa.keys().next().value;

        if (primeiraChave === undefined) {
            return;
        }

        mapa.delete(primeiraChave);
    }
}

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

    if (
        !texto ||
        !bucket ||
        !/^https?:\/\//i.test(texto)
    ) {
        return "";
    }

    try {
        const url = new URL(texto);
        const partes = url.pathname.split("/").filter(Boolean);
        const indiceBucket = partes.findIndex((parte) => parte === bucket);

        if (
            indiceBucket >= 0 &&
            partes.length > indiceBucket + 1
        ) {
            return decodeURIComponent(
                partes.slice(indiceBucket + 1).join("/")
            );
        }
    } catch {
        // Mantém a URL original quando ela não puder ser interpretada.
    }

    return "";
}

function normalizarCaminhoStorage(valor = "", bucket = "") {
    const texto = String(valor || "").trim();

    if (!texto) return "";

    if (
        texto.startsWith("data:") ||
        texto.startsWith("blob:")
    ) {
        return texto;
    }

    const caminhoExtraido =
        extrairCaminhoStorageDaUrl(
            texto,
            bucket
        );

    if (caminhoExtraido) {
        return caminhoExtraido;
    }

    if (/^https?:\/\//i.test(texto)) {
        return texto;
    }

    return texto
        .replace(
            new RegExp(`^${bucket}/`, "i"),
            ""
        )
        .replace(
            /^\/+/g,
            ""
        )
        .trim();
}

function montarUrlPublicaStorage(bucket = "", caminho = "") {
    const base =
        String(SUPABASE_URL || "").replace(/\/$/, "");

    const caminhoLimpo =
        String(caminho || "").replace(/^\/+/, "");

    if (
        !base ||
        !bucket ||
        !caminhoLimpo
    ) {
        return "";
    }

    const caminhoCodificado =
        caminhoLimpo
            .split("/")
            .map((parte) => encodeURIComponent(parte))
            .join("/");

    return `${base}/storage/v1/object/public/${bucket}/${caminhoCodificado}`;
}

function criarChaveCacheStorage(
    bucket = "",
    valor = "",
    validadeSegundos = 600
) {
    return [
        bucket,
        Number(validadeSegundos) || 600,
        valor,
    ].join("::");
}

function obterDuracaoCacheMs(validadeSegundos = 600) {
    const validade =
        Math.max(
            30,
            Number(validadeSegundos) || 600
        );

    const margem =
        Math.min(
            MARGEM_EXPIRACAO_CACHE_SEGUNDOS,
            Math.max(
                5,
                Math.floor(validade / 4)
            )
        );

    return (
        Math.max(
            15,
            validade - margem
        ) * 1000
    );
}

function obterUrlCacheValida(chave = "") {
    const item =
        CACHE_URLS_STORAGE.get(chave);

    if (!item) return "";

    if (
        !item.url ||
        item.expiraEm <= Date.now()
    ) {
        CACHE_URLS_STORAGE.delete(chave);
        return "";
    }

    return item.url;
}

function salvarUrlNoCache(
    chave = "",
    url = "",
    validadeSegundos = 600
) {
    if (
        !chave ||
        !url
    ) {
        return;
    }

    CACHE_URLS_STORAGE.set(
        chave,
        {
            url,
            expiraEm:
                Date.now() +
                obterDuracaoCacheMs(validadeSegundos),
        }
    );

    limitarTamanhoMap(
        CACHE_URLS_STORAGE,
        LIMITE_CACHE_URLS
    );
}

function obterUrlImediataStorage(
    bucket,
    caminhoOuUrl,
    validadeSegundos = 600
) {
    const valor =
        normalizarCaminhoStorage(
            caminhoOuUrl,
            bucket
        );

    if (!valor) return "";

    if (
        valorEhUrlFinal(valor) &&
        !extrairCaminhoStorageDaUrl(valor, bucket)
    ) {
        return valor;
    }

    const chave =
        criarChaveCacheStorage(
            bucket,
            valor,
            validadeSegundos
        );

    return obterUrlCacheValida(chave);
}

async function resolverUrlStorageComCache(
    bucket,
    caminhoOuUrl,
    validadeSegundos = 600
) {
    const valor =
        normalizarCaminhoStorage(
            caminhoOuUrl,
            bucket
        );

    if (!valor) return "";

    if (
        valorEhUrlFinal(valor) &&
        !extrairCaminhoStorageDaUrl(valor, bucket)
    ) {
        return valor;
    }

    const chave =
        criarChaveCacheStorage(
            bucket,
            valor,
            validadeSegundos
        );

    const urlCache =
        obterUrlCacheValida(chave);

    if (urlCache) {
        return urlCache;
    }

    const requisicaoExistente =
        REQUISICOES_URLS_STORAGE.get(chave);

    if (requisicaoExistente) {
        return requisicaoExistente;
    }

    const requisicao =
        (async () => {
            try {
                const urlAssinada =
                    await criarUrlAssinadaStorage(
                        bucket,
                        valor,
                        validadeSegundos
                    );

                if (urlAssinada) {
                    salvarUrlNoCache(
                        chave,
                        urlAssinada,
                        validadeSegundos
                    );
                }

                return urlAssinada || "";
            } catch (error) {
                console.warn(
                    `Erro ao gerar URL assinada do bucket ${bucket}:`,
                    error?.message || error
                );

                const urlPublica =
                    montarUrlPublicaStorage(
                        bucket,
                        valor
                    );

                if (urlPublica) {
                    salvarUrlNoCache(
                        chave,
                        urlPublica,
                        Math.min(
                            60,
                            Number(validadeSegundos) || 60
                        )
                    );
                }

                return urlPublica;
            } finally {
                REQUISICOES_URLS_STORAGE.delete(chave);
            }
        })();

    REQUISICOES_URLS_STORAGE.set(
        chave,
        requisicao
    );

    return requisicao;
}

export async function precarregarStorageUrl(
    bucket,
    caminhoOuUrl,
    validadeSegundos = 600
) {
    const url =
        await resolverUrlStorageComCache(
            bucket,
            caminhoOuUrl,
            validadeSegundos
        );

    if (
        !url ||
        typeof window === "undefined" ||
        typeof window.Image !== "function"
    ) {
        return url;
    }

    const carregamentoExistente =
        PRECARREGAMENTOS_IMAGEM.get(url);

    if (carregamentoExistente) {
        return carregamentoExistente;
    }

    const carregamento =
        new Promise((resolve) => {
            const imagem =
                new window.Image();

            let finalizado =
                false;

            const finalizar =
                (sucesso) => {
                    if (finalizado) return;

                    finalizado =
                        true;

                    imagem.onload =
                        null;

                    imagem.onerror =
                        null;

                    if (!sucesso) {
                        PRECARREGAMENTOS_IMAGEM.delete(url);
                    }

                    resolve(url);
                };

            imagem.decoding =
                "async";

            imagem.onload =
                () => finalizar(true);

            imagem.onerror =
                () => finalizar(false);

            imagem.src =
                url;

            if (imagem.complete) {
                finalizar(
                    imagem.naturalWidth > 0
                );
            }
        });

    PRECARREGAMENTOS_IMAGEM.set(
        url,
        carregamento
    );

    limitarTamanhoMap(
        PRECARREGAMENTOS_IMAGEM,
        LIMITE_CACHE_IMAGENS
    );

    return carregamento;
}

export function useStorageUrl(
    bucket,
    caminhoOuUrl,
    validadeSegundos = 600
) {
    const [url, setUrl] =
        useState(
            () =>
                obterUrlImediataStorage(
                    bucket,
                    caminhoOuUrl,
                    validadeSegundos
                )
        );

    useEffect(() => {
        let cancelado =
            false;

        const urlImediata =
            obterUrlImediataStorage(
                bucket,
                caminhoOuUrl,
                validadeSegundos
            );

        if (urlImediata) {
            setUrl(urlImediata);

            return () => {
                cancelado =
                    true;
            };
        }

        setUrl("");

        async function carregarUrl() {
            const urlResolvida =
                await resolverUrlStorageComCache(
                    bucket,
                    caminhoOuUrl,
                    validadeSegundos
                );

            if (!cancelado) {
                setUrl(
                    urlResolvida || ""
                );
            }
        }

        void carregarUrl();

        return () => {
            cancelado =
                true;
        };
    }, [
        bucket,
        caminhoOuUrl,
        validadeSegundos,
    ]);

    return url;
}

export default useStorageUrl;