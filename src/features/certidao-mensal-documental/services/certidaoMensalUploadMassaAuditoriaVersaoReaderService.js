export const ESTADOS_AUDITORIA_VERSAO = Object.freeze({
    EXISTE: "EXISTE",
    INDETERMINADO: "INDETERMINADO",
});

const UUID =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const SHA256 =
    /^[a-f0-9]{64}$/;

const texto = (valor) =>
    String(valor ?? "").trim();

function uuid(valor) {
    const normalizado =
        texto(valor).toLowerCase();

    return UUID.test(normalizado)
        ? normalizado
        : "";
}

function sha(valor) {
    const normalizado =
        texto(valor).toLowerCase();

    return SHA256.test(normalizado)
        ? normalizado
        : "";
}

function numeroVersao(valor) {
    const numero =
        Number(valor);

    return (
        Number.isInteger(numero) &&
        numero > 0
    )
        ? numero
        : 0;
}

function tamanho(valor) {
    const numero =
        Number(valor);

    return (
        Number.isSafeInteger(numero) &&
        numero >= 0
    )
        ? numero
        : null;
}

function normalizarErro(error) {
    if (!error) {
        return null;
    }

    let statusHttp =
        null;

    for (
        const valor of [
            error?.status,
            error?.statusCode,
            error?.httpStatusCode,
        ]
    ) {
        const numero =
            Number(valor);

        if (
            Number.isInteger(numero) &&
            numero >= 100 &&
            numero <= 599
        ) {
            statusHttp =
                numero;

            break;
        }
    }

    return Object.freeze({
        statusHttp,

        codigo:
            texto(
                error?.code ||
                error?.error ||
                error?.name
            ).toUpperCase(),

        mensagem:
            texto(error?.message),
    });
}

function indeterminado({
    versaoId = "",
    codigo =
        "AUDITORIA_VERSAO_INDETERMINADA",
    motivo =
        "LEITURA_NAO_CONCLUSIVA",
    error = null,
} = {}) {
    return Object.freeze({
        versao: 1,

        leituraConcluida:
            true,

        estadoVersao:
            ESTADOS_AUDITORIA_VERSAO
                .INDETERMINADO,

        codigo,
        motivo,

        versaoIdSolicitado:
            versaoId,

        versaoFisica:
            null,

        erro:
            normalizarErro(error),
    });
}

export function criarCertidaoMensalUploadMassaAuditoriaVersaoReader({
    clienteSupabase = null,
} = {}) {
    if (
        !clienteSupabase ||
        typeof clienteSupabase.from !==
            "function"
    ) {
        throw new Error(
            "Cliente Supabase inválido para reader físico."
        );
    }

    async function lerVersaoFisicaCertidaoMensal({
        versaoId = "",
    } = {}) {
        const id =
            uuid(versaoId);

        if (!id) {
            return indeterminado({
                versaoId:
                    texto(versaoId),

                codigo:
                    "AUDITORIA_VERSAO_ID_INVALIDO",

                motivo:
                    "VERSAO_ID_INVALIDO",
            });
        }

        let resposta;

        try {
            resposta =
                await clienteSupabase
                    .from(
                        "certidao_mensal_versoes"
                    )
                    .select(
                        "id,item_id,numero_versao,hash_sha256,bucket_id,caminho_storage,tamanho_bytes"
                    )
                    .eq(
                        "id",
                        id
                    )
                    .limit(2);
        }
        catch (error) {
            return indeterminado({
                versaoId:
                    id,

                codigo:
                    "AUDITORIA_VERSAO_QUERY_THROW",

                motivo:
                    "FALHA_NA_LEITURA_DA_VERSAO",

                error,
            });
        }

        if (resposta?.error) {
            return indeterminado({
                versaoId:
                    id,

                codigo:
                    "AUDITORIA_VERSAO_QUERY_FALHOU",

                motivo:
                    "SUPABASE_RECUSOU_LEITURA_DA_VERSAO",

                error:
                    resposta.error,
            });
        }

        if (
            !Array.isArray(
                resposta?.data
            )
        ) {
            return indeterminado({
                versaoId:
                    id,

                codigo:
                    "AUDITORIA_VERSAO_RESPOSTA_INVALIDA",

                motivo:
                    "QUERY_NAO_RETORNOU_COLECAO",
            });
        }

        if (
            resposta.data.length !==
            1
        ) {
            return indeterminado({
                versaoId:
                    id,

                codigo:
                    resposta.data.length === 0
                        ? "AUDITORIA_VERSAO_NAO_CONFIRMADA"
                        : "AUDITORIA_VERSAO_MULTIPLA",

                motivo:
                    resposta.data.length === 0
                        ? "VERSAO_NAO_VISIVEL_OU_NAO_EXISTE"
                        : "VERSAO_ID_NAO_UNICO",
            });
        }

        const linha =
            resposta.data[0];

        const idLinha =
            uuid(linha?.id);

        const itemId =
            uuid(linha?.item_id);

        const numero =
            numeroVersao(
                linha?.numero_versao
            );

        const hashSha256 =
            sha(
                linha?.hash_sha256
            );

        const bucketId =
            texto(
                linha?.bucket_id
            );

        const caminhoStorage =
            texto(
                linha?.caminho_storage
            );

        const tamanhoBytes =
            tamanho(
                linha?.tamanho_bytes
            );

        if (
            idLinha !== id ||
            !itemId ||
            !numero ||
            !hashSha256 ||
            !bucketId ||
            !caminhoStorage ||
            tamanhoBytes === null
        ) {
            return indeterminado({
                versaoId:
                    id,

                codigo:
                    "AUDITORIA_VERSAO_FISICA_INCONSISTENTE",

                motivo:
                    "METADADOS_FISICOS_INVALIDOS",
            });
        }

        return Object.freeze({
            versao:
                1,

            leituraConcluida:
                true,

            estadoVersao:
                ESTADOS_AUDITORIA_VERSAO
                    .EXISTE,

            codigo:
                "AUDITORIA_VERSAO_FISICA_CONFIRMADA",

            motivo:
                "VERSAO_E_METADADOS_FISICOS_CONFIRMADOS",

            versaoIdSolicitado:
                id,

            versaoFisica:
                Object.freeze({
                    id,
                    itemId,

                    numeroVersao:
                        numero,

                    hashSha256,
                    bucketId,
                    caminhoStorage,
                    tamanhoBytes,
                }),

            erro:
                null,
        });
    }

    return Object.freeze({
        lerVersaoFisicaCertidaoMensal,
    });
}