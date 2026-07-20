import {
    excluirExtintorRemoto,
    identificadorEhUuidExtintor,
    listarExtintoresRemotos,
    salvarExtintorRemoto,
} from "./extintoresVistoriaService.js";

const CHAVE_EXTINTORES_LEGADO =
    "safescan:vistoria:extintores:v1";

const PREFIXO_CACHE_EXTINTORES_OBRA =
    "safescan:vistoria:extintores:cache-remoto:v1:";

function textoSeguro(valor) {
    return String(valor || "").trim();
}

function erroSeguro(erro, fallback) {
    return textoSeguro(
        erro?.message ||
        erro?.details ||
        erro?.hint ||
        fallback,
    );
}

function obterStoragePadrao() {
    if (typeof window === "undefined") {
        return null;
    }

    return window.localStorage;
}

function lerJsonStorage(storage, chave, fallback) {
    if (!storage || !chave) {
        return fallback;
    }

    try {
        const valor = storage.getItem(chave);

        if (!valor) {
            return fallback;
        }

        const convertido = JSON.parse(valor);

        return convertido ?? fallback;
    }
    catch {
        return fallback;
    }
}

function salvarJsonStorage(storage, chave, valor) {
    if (!storage || !chave) {
        return;
    }

    storage.setItem(
        chave,
        JSON.stringify(valor),
    );
}

function normalizarCodigoLocal(codigo) {
    const numero = Number(
        textoSeguro(codigo).replace(/\D/g, ""),
    );

    return Number.isFinite(numero) && numero > 0
        ? `E-${String(numero).padStart(2, "0")}`
        : textoSeguro(codigo);
}

function chavesComparacaoExtintor(item = {}) {
    return new Set(
        [
            item.id,
            item.referenciaLocal,
            item.referencia_local,
            item.tokenQr,
            item.token_publico,
        ]
            .map(textoSeguro)
            .filter(Boolean),
    );
}

function registrosCorrespondem(primeiro = {}, segundo = {}) {
    const chavesPrimeiro =
        chavesComparacaoExtintor(primeiro);

    const chavesSegundo =
        chavesComparacaoExtintor(segundo);

    return [...chavesPrimeiro].some(
        (chave) => chavesSegundo.has(chave),
    );
}

function ordenarExtintores(itens = []) {
    return [...itens].sort((a, b) =>
        normalizarCodigoLocal(a?.codigo)
            .localeCompare(
                normalizarCodigoLocal(b?.codigo),
                "pt-BR",
                {
                    numeric: true,
                },
            ),
    );
}

function mesclarExtintores(base = [], novos = []) {
    let resultado = Array.isArray(base)
        ? [...base]
        : [];

    for (const novo of Array.isArray(novos) ? novos : []) {
        resultado = resultado.filter(
            (existente) =>
                !registrosCorrespondem(
                    existente,
                    novo,
                ),
        );

        resultado.push(novo);
    }

    return ordenarExtintores(resultado);
}

function chaveCacheObra(obraId) {
    const id = textoSeguro(obraId);

    return id
        ? `${PREFIXO_CACHE_EXTINTORES_OBRA}${id}`
        : "";
}

export function extintoresLocaisSaoCargaInicialPadrao(
    itens = [],
) {
    if (!Array.isArray(itens) || itens.length !== 20) {
        return false;
    }

    const ordenados = ordenarExtintores(itens);

    return ordenados.every((item, indice) => {
        const numero = indice + 1;

        const idEsperado = `extintor-${numero}`;

        const codigoEsperado =
            `E-${String(numero).padStart(2, "0")}`;

        const tipoEsperado =
            numero % 2 === 0
                ? "PQS ABC"
                : "CO2";

        const localizacaoEsperada =
            numero <= 10
                ? "Escritório e apoio"
                : "Frente de obra";

        return (
            textoSeguro(item?.id) === idEsperado &&
            normalizarCodigoLocal(item?.codigo) ===
                codigoEsperado &&
            textoSeguro(item?.pontoId) === "" &&
            textoSeguro(item?.ponto) === "" &&
            textoSeguro(item?.localizacao) ===
                localizacaoEsperada &&
            textoSeguro(item?.tipo) ===
                tipoEsperado &&
            textoSeguro(item?.capacidade) ===
                "6 kg" &&
            textoSeguro(item?.fabricante) === "" &&
            textoSeguro(item?.numeroSerie) === ""
        );
    });
}

function listarRegistrosCachePublicoExtintores({
    storage = obterStoragePadrao(),
} = {}) {
    const itens = lerJsonStorage(
        storage,
        CHAVE_EXTINTORES_LEGADO,
        [],
    );

    if (!Array.isArray(itens) || !itens.length) {
        return [];
    }

    if (extintoresLocaisSaoCargaInicialPadrao(itens)) {
        return [];
    }

    return ordenarExtintores(itens);
}

export function listarExtintoresLocaisExistentes({
    storage = obterStoragePadrao(),
} = {}) {
    return listarRegistrosCachePublicoExtintores({
        storage,
    }).filter(
        (item) =>
            !identificadorEhUuidExtintor(
                item?.id,
            ),
    );
}

export function listarCacheExtintoresObra({
    obraId = "",
    storage = obterStoragePadrao(),
} = {}) {
    const chave = chaveCacheObra(obraId);

    if (!chave) {
        return [];
    }

    const itens = lerJsonStorage(
        storage,
        chave,
        [],
    );

    return Array.isArray(itens)
        ? ordenarExtintores(itens)
        : [];
}

export function salvarCacheExtintoresObra({
    obraId = "",
    extintores = [],
    storage = obterStoragePadrao(),
} = {}) {
    const chave = chaveCacheObra(obraId);

    if (!chave) {
        return [];
    }

    const itens = ordenarExtintores(
        Array.isArray(extintores)
            ? extintores
            : [],
    );

    salvarJsonStorage(
        storage,
        chave,
        itens,
    );

    return itens;
}

export function mesclarCachePublicoExtintores({
    extintores = [],
    storage = obterStoragePadrao(),
} = {}) {
    if (!storage) {
        return [];
    }

    const atuais =
        listarRegistrosCachePublicoExtintores({
            storage,
        });

    const atualizados = mesclarExtintores(
        atuais,
        extintores,
    );

    salvarJsonStorage(
        storage,
        CHAVE_EXTINTORES_LEGADO,
        atualizados,
    );

    return atualizados;
}

export function removerExtintorDosCaches({
    extintor = {},
    obraId = "",
    storage = obterStoragePadrao(),
} = {}) {
    const cacheObra =
        listarCacheExtintoresObra({
            obraId,
            storage,
        }).filter(
            (item) =>
                !registrosCorrespondem(
                    item,
                    extintor,
                ),
        );

    salvarCacheExtintoresObra({
        obraId,
        extintores: cacheObra,
        storage,
    });

    if (storage) {
        const registrosPublicos =
            listarRegistrosCachePublicoExtintores({
                storage,
            }).filter(
                (item) =>
                    !registrosCorrespondem(
                        item,
                        extintor,
                    ),
            );

        salvarJsonStorage(
            storage,
            CHAVE_EXTINTORES_LEGADO,
            registrosPublicos,
        );
    }

    return cacheObra;
}

export function selecionarMapaCadastroExtintores({
    mapas = [],
    obraIdPreferida = "",
} = {}) {
    const lista = Array.isArray(mapas)
        ? mapas.filter(Boolean)
        : [];

    if (!lista.length) {
        return null;
    }

    const preferida = textoSeguro(
        obraIdPreferida,
    );

    if (preferida) {
        const encontrada = lista.find(
            (mapa) =>
                textoSeguro(
                    mapa?.obraId ||
                    mapa?.obra_id,
                ) === preferida,
        );

        if (encontrada) {
            return encontrada;
        }
    }

    return lista[0];
}

export function obterPontoIdExtintorNoMapa({
    extintor = {},
    mapa = {},
} = {}) {
    const pontos = Array.isArray(mapa?.pontos)
        ? mapa.pontos
        : [];

    const pontoInformado = textoSeguro(
        extintor?.pontoId ||
        extintor?.pontoIdRemoto ||
        extintor?.pontoReferenciaLocal ||
        extintor?.ponto_referencia_local,
    );

    if (
        pontoInformado &&
        pontos.some(
            (ponto) =>
                textoSeguro(ponto?.id) ===
                pontoInformado,
        )
    ) {
        return pontoInformado;
    }

    const idsExtintor =
        chavesComparacaoExtintor(extintor);

    const pontoVinculado = pontos.find(
        (ponto) =>
            (Array.isArray(ponto?.extintores)
                ? ponto.extintores
                : []
            ).some(
                (id) =>
                    idsExtintor.has(
                        textoSeguro(id),
                    ),
            ),
    );

    return textoSeguro(
        pontoVinculado?.id,
    );
}

export function filtrarExtintoresLocaisPorMapa({
    extintores = [],
    mapa = {},
} = {}) {
    const pontos = Array.isArray(mapa?.pontos)
        ? mapa.pontos
        : [];

    if (!pontos.length) {
        return [];
    }

    return ordenarExtintores(
        (Array.isArray(extintores)
            ? extintores
            : []
        ).filter(
            (extintor) =>
                Boolean(
                    obterPontoIdExtintorNoMapa({
                        extintor,
                        mapa,
                    }),
                ),
        ),
    );
}

async function listarMapasRemotosPadrao({
    supabase,
} = {}) {
    const modulo = await import(
        "./mapaObraService.js"
    );

    return modulo.listarMapasObraService({
        supabase,
    });
}

export async function carregarMapasCadastroExtintores({
    supabase,
    mapasLocais = [],
    listarMapasRemotos =
        listarMapasRemotosPadrao,
} = {}) {
    try {
        const remotos = await listarMapasRemotos({
            supabase,
        });

        if (Array.isArray(remotos) && remotos.length) {
            return {
                mapas: remotos,
                origem: "remoto",
                erro: "",
            };
        }

        const locais = Array.isArray(mapasLocais)
            ? mapasLocais
            : [];

        return {
            mapas: locais,
            origem: locais.length
                ? "local"
                : "vazio",
            erro: "",
        };
    }
    catch (erro) {
        const locais = Array.isArray(mapasLocais)
            ? mapasLocais
            : [];

        return {
            mapas: locais,
            origem: locais.length
                ? "local"
                : "erro",
            erro: erroSeguro(
                erro,
                "Não foi possível carregar os mapas.",
            ),
        };
    }
}

export async function carregarExtintoresCadastro({
    obraId = "",
    empresaId = "",
    mapa = {},
    storage = obterStoragePadrao(),
    listarRemotos =
        listarExtintoresRemotos,
} = {}) {
    const idObra = textoSeguro(obraId);

    const locais =
        filtrarExtintoresLocaisPorMapa({
            extintores:
                listarExtintoresLocaisExistentes({
                    storage,
                }),
            mapa,
        });

    if (!identificadorEhUuidExtintor(idObra)) {
        return {
            itens: locais,
            origem: locais.length
                ? "local"
                : "vazio",
            erro:
                "A obra selecionada ainda não possui um identificador remoto válido.",
            locaisPendentes: locais.length,
        };
    }

    try {
        const remotos = await listarRemotos({
            obraId: idObra,
            empresaId,
        });

        const itens = Array.isArray(remotos)
            ? ordenarExtintores(remotos)
            : [];

        salvarCacheExtintoresObra({
            obraId: idObra,
            extintores: itens,
            storage,
        });

        mesclarCachePublicoExtintores({
            extintores: itens,
            storage,
        });

        return {
            itens,
            origem: "remoto",
            erro: "",
            locaisPendentes: locais.length,
        };
    }
    catch (erro) {
        const cache =
            listarCacheExtintoresObra({
                obraId: idObra,
                storage,
            });

        const fallback = cache.length
            ? cache
            : locais;

        return {
            itens: fallback,
            origem: cache.length
                ? "cache"
                : locais.length
                    ? "local"
                    : "erro",
            erro: erroSeguro(
                erro,
                "Não foi possível carregar os extintores remotos.",
            ),
            locaisPendentes: locais.length,
        };
    }
}

function localizarRemotoCorrespondente({
    extintorLocal = {},
    remotos = [],
} = {}) {
    const codigoLocal = normalizarCodigoLocal(
        extintorLocal?.codigo,
    );

    return (
        (Array.isArray(remotos)
            ? remotos
            : []
        ).find(
            (remoto) =>
                registrosCorrespondem(
                    remoto,
                    extintorLocal,
                ),
        ) ||
        (Array.isArray(remotos)
            ? remotos
            : []
        ).find(
            (remoto) =>
                normalizarCodigoLocal(
                    remoto?.codigo,
                ) === codigoLocal,
        ) ||
        null
    );
}

export async function migrarExtintoresLocaisCadastro({
    obraId = "",
    empresaId = "",
    mapa = {},
    storage = obterStoragePadrao(),
    listarRemotos =
        listarExtintoresRemotos,
    salvarRemoto =
        salvarExtintorRemoto,
} = {}) {
    const idObra = textoSeguro(obraId);

    if (!identificadorEhUuidExtintor(idObra)) {
        throw new Error(
            "A obra selecionada não possui um identificador remoto válido.",
        );
    }

    const candidatos =
        filtrarExtintoresLocaisPorMapa({
            extintores:
                listarExtintoresLocaisExistentes({
                    storage,
                }),
            mapa,
        });

    if (!candidatos.length) {
        const remotosAtuais = await listarRemotos({
            obraId: idObra,
            empresaId,
        });

        return {
            migrados: 0,
            itens: ordenarExtintores(
                remotosAtuais,
            ),
        };
    }

    let remotosAtuais = await listarRemotos({
        obraId: idObra,
        empresaId,
    });

    const resultados = [];

    for (const candidato of candidatos) {
        const correspondente =
            localizarRemotoCorrespondente({
                extintorLocal: candidato,
                remotos: remotosAtuais,
            });

        const pontoId =
            obterPontoIdExtintorNoMapa({
                extintor: candidato,
                mapa,
            });

        const salvo = await salvarRemoto({
            extintor: {
                ...candidato,
                id:
                    correspondente?.id ||
                    candidato.id,
                referenciaLocal:
                    candidato.referenciaLocal ||
                    candidato.id,
            },
            obraId: idObra,
            empresaId,
            pontoId,
        });

        resultados.push(salvo);

        remotosAtuais = mesclarExtintores(
            remotosAtuais,
            [salvo],
        );
    }

    const remotosFinais = await listarRemotos({
        obraId: idObra,
        empresaId,
    });

    salvarCacheExtintoresObra({
        obraId: idObra,
        extintores: remotosFinais,
        storage,
    });

    mesclarCachePublicoExtintores({
        extintores: remotosFinais,
        storage,
    });

    return {
        migrados: resultados.length,
        itens: ordenarExtintores(
            remotosFinais,
        ),
    };
}

export async function salvarExtintorCadastro({
    extintor = {},
    obraId = "",
    empresaId = "",
    pontoId = "",
    storage = obterStoragePadrao(),
    salvarRemoto =
        salvarExtintorRemoto,
} = {}) {
    const registro = await salvarRemoto({
        extintor,
        obraId,
        empresaId,
        pontoId,
    });

    const atuais =
        listarCacheExtintoresObra({
            obraId,
            storage,
        });

    const itens = mesclarExtintores(
        atuais,
        [registro],
    );

    salvarCacheExtintoresObra({
        obraId,
        extintores: itens,
        storage,
    });

    mesclarCachePublicoExtintores({
        extintores: [registro],
        storage,
    });

    return {
        registro,
        itens,
    };
}

export async function excluirExtintorCadastro({
    extintor = {},
    obraId = "",
    storage = obterStoragePadrao(),
    excluirRemoto =
        excluirExtintorRemoto,
} = {}) {
    const id = textoSeguro(extintor?.id);

    if (identificadorEhUuidExtintor(id)) {
        await excluirRemoto(id);
    }

    const itens = removerExtintorDosCaches({
        extintor,
        obraId,
        storage,
    });

    return {
        excluido: true,
        itens,
    };
}
