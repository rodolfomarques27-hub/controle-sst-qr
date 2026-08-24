/*
 * ============================================================
 * CERT2 — READER DE SHA PRÉ-WRITE
 *
 * Responsabilidade única:
 *
 * confirmar, imediatamente antes da persistência, se o SHA-256
 * do NOVO PDF já existe em qualquer versão documental.
 *
 * Semântica preservada do guard histórico:
 *
 * - consulta global em certidao_mensal_versoes;
 * - nenhuma restrição por empresa;
 * - nenhuma restrição por competência;
 * - nenhuma restrição por tipo;
 * - SHA-256 é a prova de identidade binária.
 *
 * Este módulo NÃO decide nem executa persistência.
 * ============================================================
 */

const PADRAO_UUID =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PADRAO_HASH_SHA256 =
    /^[a-f0-9]{64}$/;

function textoSeguro(
    valor
) {
    return String(
        valor ?? ""
    ).trim();
}

function normalizarHashSha256(
    valor
) {
    const hash =
        textoSeguro(
            valor
        ).toLowerCase();

    return PADRAO_HASH_SHA256.test(
        hash
    )
        ? hash
        : "";
}

function normalizarNumeroVersao(
    valor
) {
    const numero =
        Number(
            valor
        );

    return (
        Number.isInteger(
            numero
        ) &&
        numero > 0
    )
        ? numero
        : 0;
}

function criarErroHashReader(
    mensagem,
    {
        codigo =
            "PREFLIGHT_HASH_LEITURA_REMOTA_FALHOU",

        etapa =
            "",

        causa =
            null,
    } = {}
) {
    const erro =
        new Error(
            mensagem
        );

    erro.name =
        "CertidaoMensalUploadMassaPreflightHashReaderError";

    erro.codigo =
        textoSeguro(
            codigo
        );

    erro.etapa =
        textoSeguro(
            etapa
        );

    if (causa) {
        erro.cause =
            causa;
    }

    return erro;
}

function criarErroCancelamento() {
    const erro =
        criarErroHashReader(
            "A revalidação do SHA pré-write foi cancelada.",
            {
                codigo:
                    "PREFLIGHT_HASH_CANCELADO",

                etapa:
                    "cancelamento",
            }
        );

    erro.name =
        "AbortError";

    return erro;
}

function erroLeitura(
    mensagem,
    etapa,
    causa = null
) {
    return criarErroHashReader(
        mensagem,
        {
            codigo:
                "PREFLIGHT_HASH_LEITURA_REMOTA_FALHOU",

            etapa,

            causa,
        }
    );
}

function erroInconsistencia(
    mensagem,
    etapa
) {
    return criarErroHashReader(
        mensagem,
        {
            codigo:
                "PREFLIGHT_HASH_ESTADO_REMOTO_INCONSISTENTE",

            etapa,
        }
    );
}

function congelarOcorrencia({
    id,
    itemId,
    numeroVersao,
    hashSha256,
    nomeOriginal,
    criadoEm,
}) {
    return Object.freeze({
        id,
        itemId,
        numeroVersao,
        hashSha256,
        nomeOriginal,
        criadoEm,
    });
}

function criarResultado({
    hashSha256,
    ocorrencias = [],
}) {
    const lista =
        Object.freeze([
            ...ocorrencias,
        ]);

    return Object.freeze({
        versao:
            1,

        leituraConcluida:
            true,

        hashSha256,

        jaExiste:
            lista.length >
            0,

        ocorrencias:
            lista,
    });
}

async function executarConsulta({
    clienteSupabase,
    hashSha256,
    signal,
}) {
    const valoresConsulta =
        [
            ...new Set([
                hashSha256,
                hashSha256.toUpperCase(),
            ]),
        ];

    try {
        let consulta =
            clienteSupabase
                .from(
                    "certidao_mensal_versoes"
                )
                .select(
                    [
                        "id",
                        "item_id",
                        "numero_versao",
                        "hash_sha256",
                        "nome_original",
                        "criado_em",
                    ].join(",")
                )
                .in(
                    "hash_sha256",
                    valoresConsulta
                )
                .limit(
                    5000
                );

        if (
            signal &&
            typeof consulta
                ?.abortSignal ===
                "function"
        ) {
            consulta =
                consulta.abortSignal(
                    signal
                );
        }

        return await consulta;
    }
    catch (error) {
        if (
            signal?.aborted ||
            error?.name ===
                "AbortError"
        ) {
            throw criarErroCancelamento();
        }

        if (
            error?.name ===
            "CertidaoMensalUploadMassaPreflightHashReaderError"
        ) {
            throw error;
        }

        throw erroLeitura(
            "Não foi possível consultar o SHA no histórico documental.",
            "select_hash_global",
            error
        );
    }
}

export function criarCertidaoMensalUploadMassaPreflightHashReader({
    clienteSupabase = null,
} = {}) {
    if (
        !clienteSupabase ||
        typeof clienteSupabase.from !==
            "function"
    ) {
        throw new Error(
            "Cliente Supabase inválido para o reader SHA de preflight."
        );
    }

    async function lerEstadoShaPersistenciaPrincipalUploadMassa({
        hashSha256 = "",
        signal = null,
    } = {}) {
        if (signal?.aborted) {
            throw criarErroCancelamento();
        }

        const hashCanonico =
            normalizarHashSha256(
                hashSha256
            );

        if (!hashCanonico) {
            throw criarErroHashReader(
                "O SHA-256 informado para o preflight pré-write é inválido.",
                {
                    codigo:
                        "PREFLIGHT_HASH_INVALIDO",

                    etapa:
                        "validacao_hash",
                }
            );
        }

        const resposta =
            await executarConsulta({
                clienteSupabase,
                hashSha256:
                    hashCanonico,
                signal,
            });

        if (signal?.aborted) {
            throw criarErroCancelamento();
        }

        if (resposta?.error) {
            throw erroLeitura(
                "O Supabase recusou a consulta de duplicidade SHA pré-write.",
                "select_hash_global",
                resposta.error
            );
        }

        if (
            !Array.isArray(
                resposta?.data
            )
        ) {
            throw erroInconsistencia(
                "A consulta de SHA pré-write não retornou uma coleção válida.",
                "select_hash_global"
            );
        }

        const ocorrencias =
            [];

        for (
            const registro of
            resposta.data
        ) {
            const id =
                textoSeguro(
                    registro?.id
                );

            const itemId =
                textoSeguro(
                    registro?.item_id
                );

            const numeroVersao =
                normalizarNumeroVersao(
                    registro?.numero_versao
                );

            const hashRegistro =
                normalizarHashSha256(
                    registro?.hash_sha256
                );

            const nomeOriginal =
                textoSeguro(
                    registro?.nome_original
                );

            const criadoEm =
                textoSeguro(
                    registro?.criado_em
                );

            /*
             * A própria query deveria retornar somente hashes
             * solicitados. Se vier qualquer linha incompatível,
             * tratamos como estado remoto inconsistente.
             */
            if (
                !PADRAO_UUID.test(
                    id
                ) ||
                !PADRAO_UUID.test(
                    itemId
                ) ||
                numeroVersao <=
                    0 ||
                !hashRegistro ||
                hashRegistro !==
                    hashCanonico
            ) {
                throw erroInconsistencia(
                    "A consulta de SHA pré-write retornou uma versão incompatível.",
                    "validacao_resultado_hash"
                );
            }

            ocorrencias.push(
                congelarOcorrencia({
                    id,
                    itemId,
                    numeroVersao,
                    hashSha256:
                        hashRegistro,
                    nomeOriginal,
                    criadoEm,
                })
            );
        }

        return criarResultado({
            hashSha256:
                hashCanonico,

            ocorrencias,
        });
    }

    return Object.freeze({
        lerEstadoShaPersistenciaPrincipalUploadMassa,
    });
}