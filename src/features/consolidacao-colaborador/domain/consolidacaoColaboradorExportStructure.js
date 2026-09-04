export const CONSOLIDACAO_COLABORADOR_SELECTION_SCHEMA_VERSION =
    "consolidacao-colaborador-selection-v1";

export const CONSOLIDACAO_COLABORADOR_EXPORT_SCHEMA_VERSION =
    "consolidacao-colaborador-export-structure-v1";

const CONSOLIDACAO_COLABORADOR_BASE_SCHEMA_VERSION =
    "consolidacao-colaborador-structure-v1";

function textoSeguro(
    valor
) {
    return String(
        valor ?? ""
    ).trim();
}

function arraySeguro(
    valor
) {
    return Array.isArray(
        valor
    )
        ? valor
        : [];
}

function clonarSerializavel(
    valor
) {
    if (
        valor ===
        undefined
    ) {
        return undefined;
    }

    return JSON.parse(
        JSON.stringify(
            valor
        )
    );
}

function obterIdentidadeFisicaEvidencia(
    evidencia = {}
) {
    const id =
        textoSeguro(
            evidencia?.id
        );

    if (id) {
        return {
            tipo:
                "id",

            valor:
                id,
        };
    }

    const sha256 =
        textoSeguro(
            evidencia?.arquivoSha256 ||
            evidencia?.arquivo_sha256
        );

    if (sha256) {
        return {
            tipo:
                "sha256",

            valor:
                sha256.toLowerCase(),
        };
    }

    const arquivoUrl =
        textoSeguro(
            evidencia?.arquivoUrl ||
            evidencia?.arquivo_url
        );

    if (arquivoUrl) {
        return {
            tipo:
                "url",

            valor:
                arquivoUrl,
        };
    }

    return null;
}

export function obterChaveSelecaoEvidenciaConsolidacao({
    documento,
    evidencia,
} = {}) {
    const certificadoId =
        textoSeguro(
            documento?.certificadoId
        );

    const identidade =
        obterIdentidadeFisicaEvidencia(
            evidencia
        );

    if (
        !certificadoId ||
        !identidade
    ) {
        return null;
    }

    return [
        certificadoId,
        identidade.tipo,
        encodeURIComponent(
            identidade.valor
        ),
    ].join(
        "::"
    );
}

export function listarChavesSelecionaveisDocumentoConsolidacao(
    documento = {}
) {
    return arraySeguro(
        documento?.evidenciasAtuais
    )
        .filter(
            (
                evidencia
            ) =>
                evidencia?.selecionavel ===
                    true &&
                evidencia?.historica !==
                    true
        )
        .map(
            (
                evidencia
            ) =>
                obterChaveSelecaoEvidenciaConsolidacao({
                    documento,
                    evidencia,
                })
        )
        .filter(
            Boolean
        );
}

function validarEstruturaBase(
    estruturaBase
) {
    if (
        !estruturaBase ||
        typeof estruturaBase !==
            "object" ||
        Array.isArray(
            estruturaBase
        )
    ) {
        throw new Error(
            "Estrutura Base inválido para exportação."
        );
    }

    if (
        estruturaBase
            .schemaVersion !==
        CONSOLIDACAO_COLABORADOR_BASE_SCHEMA_VERSION
    ) {
        throw new Error(
            `Schema do Estrutura Base incompatível: ${textoSeguro(
                estruturaBase
                    ?.schemaVersion
            ) || "não informado"}.`
        );
    }

    if (
        !Array.isArray(
            estruturaBase
                .documentos
        )
    ) {
        throw new Error(
            "Estrutura Base sem coleção documental válida."
        );
    }
}

function construirIndiceSelecao(
    estruturaBase
) {
    validarEstruturaBase(
        estruturaBase
    );

    const documentosPorId =
        new Map();

    const evidenciasPorChave =
        new Map();

    estruturaBase
        .documentos
        .forEach(
            (
                documento
            ) => {
                const certificadoId =
                    textoSeguro(
                        documento
                            ?.certificadoId
                    );

                if (
                    !certificadoId
                ) {
                    throw new Error(
                        "Documento lógico sem certificadoId no Estrutura Base."
                    );
                }

                if (
                    documentosPorId.has(
                        certificadoId
                    )
                ) {
                    throw new Error(
                        `certificadoId duplicado no Estrutura Base: ${certificadoId}.`
                    );
                }

                documentosPorId.set(
                    certificadoId,
                    documento
                );

                arraySeguro(
                    documento
                        ?.evidenciasAtuais
                ).forEach(
                    (
                        evidencia
                    ) => {
                        const chave =
                            obterChaveSelecaoEvidenciaConsolidacao({
                                documento,
                                evidencia,
                            });

                        if (
                            evidencia?.selecionavel ===
                                true &&
                            !chave
                        ) {
                            throw new Error(
                                `Evidência selecionável sem identidade física no certificado ${certificadoId}.`
                            );
                        }

                        if (!chave) {
                            return;
                        }

                        if (
                            evidenciasPorChave.has(
                                chave
                            )
                        ) {
                            throw new Error(
                                `Chave de seleção física duplicada: ${chave}.`
                            );
                        }

                        evidenciasPorChave.set(
                            chave,
                            {
                                chave,

                                documento,

                                evidencia,

                                selecionavel:
                                    evidencia
                                        ?.selecionavel ===
                                        true &&
                                    evidencia
                                        ?.historica !==
                                        true,
                            }
                        );
                    }
                );
            }
        );

    return {
        documentosPorId,
        evidenciasPorChave,
    };
}

function normalizarChavesSelecionadas({
    estruturaBase,
    selecao,
}) {
    const indice =
        construirIndiceSelecao(
            estruturaBase
        );

    let selecaoEfetiva =
        selecao;

    if (
        selecaoEfetiva ===
        undefined ||
        selecaoEfetiva ===
        null
    ) {
        selecaoEfetiva =
            criarSelecaoPadraoConsolidacaoColaborador(
                estruturaBase
            );
    }

    if (
        !selecaoEfetiva ||
        typeof selecaoEfetiva !==
            "object" ||
        Array.isArray(
            selecaoEfetiva
        )
    ) {
        throw new Error(
            "Seleção da Consolidação inválida."
        );
    }

    if (
        selecaoEfetiva
            .schemaVersion &&
        selecaoEfetiva
            .schemaVersion !==
            CONSOLIDACAO_COLABORADOR_SELECTION_SCHEMA_VERSION
    ) {
        throw new Error(
            `Schema de seleção incompatível: ${textoSeguro(
                selecaoEfetiva
                    ?.schemaVersion
            )}.`
        );
    }

    if (
        !Array.isArray(
            selecaoEfetiva
                .evidenciasSelecionadas
        )
    ) {
        throw new Error(
            "Seleção sem evidenciasSelecionadas válida."
        );
    }

    const chaves =
        [
            ...new Set(
                selecaoEfetiva
                    .evidenciasSelecionadas
                    .map(
                        textoSeguro
                    )
                    .filter(
                        Boolean
                    )
            ),
        ].sort();

    chaves.forEach(
        (
            chave
        ) => {
            const registro =
                indice
                    .evidenciasPorChave
                    .get(
                        chave
                    );

            if (!registro) {
                throw new Error(
                    `Evidência selecionada não pertence ao Estrutura Base: ${chave}.`
                );
            }

            if (
                !registro
                    .selecionavel
            ) {
                throw new Error(
                    `Evidência não selecionável foi solicitada para exportação: ${chave}.`
                );
            }
        }
    );

    return {
        indice,

        chaves,
    };
}

export function criarSelecaoPadraoConsolidacaoColaborador(
    estruturaBase
) {
    const {
        evidenciasPorChave,
    } =
        construirIndiceSelecao(
            estruturaBase
        );

    const evidenciasSelecionadas =
        [
            ...evidenciasPorChave
                .values(),
        ]
            .filter(
                (
                    registro
                ) =>
                    registro
                        .selecionavel &&
                    registro
                        .evidencia
                        ?.selecionadoPadrao ===
                        true
            )
            .map(
                (
                    registro
                ) =>
                    registro.chave
            )
            .sort();

    return {
        schemaVersion:
            CONSOLIDACAO_COLABORADOR_SELECTION_SCHEMA_VERSION,

        evidenciasSelecionadas,
    };
}

function criarDocumentoSelecionado({
    documento,
    evidenciasSelecionadas,
}) {
    return {
        certificadoId:
            documento
                ?.certificadoId ||
            null,

        colaboradorId:
            documento
                ?.colaboradorId ||
            null,

        treinamentoCodigo:
            documento
                ?.treinamentoCodigo ??
            null,

        tipoTreinamento:
            documento
                ?.tipoTreinamento ||
            null,

        nomeTreinamento:
            documento
                ?.nomeTreinamento ||
            null,

        categoriaConsolidacao:
            documento
                ?.categoriaConsolidacao ||
            null,

        categoriaRotulo:
            documento
                ?.categoriaRotulo ||
            null,

        pastaBase:
            documento
                ?.pastaBase ||
            null,

        categoriaOrdem:
            documento
                ?.categoriaOrdem ??
            null,

        dataRealizacao:
            documento
                ?.dataRealizacao ||
            null,

        dataVencimento:
            documento
                ?.dataVencimento ||
            null,

        regraCatalogoReconhecida:
            Boolean(
                documento
                    ?.regraCatalogoReconhecida
            ),

        obrigatorioMatriz:
            Boolean(
                documento
                    ?.obrigatorioMatriz
            ),

        adicionalEnviado:
            Boolean(
                documento
                    ?.adicionalEnviado
            ),

        statusTemporal:
            clonarSerializavel(
                documento
                    ?.statusTemporal ||
                null
            ),

        verificacaoDocumental:
            clonarSerializavel(
                documento
                    ?.verificacaoDocumental ||
                null
            ),

        alertas:
            clonarSerializavel(
                arraySeguro(
                    documento
                        ?.alertas
                )
            ),

        evidenciasSelecionadas:
            evidenciasSelecionadas
                .map(
                    (
                        item
                    ) =>
                        clonarSerializavel(
                            item
                        )
                ),
    };
}

function obterTamanhoBytesEvidencia(
    evidencia = {}
) {
    const valor =
        evidencia
            ?.tamanhoBytes ??
        evidencia
            ?.tamanho_bytes;

    if (
        valor ===
        null ||
        valor ===
        undefined ||
        valor ===
        ""
    ) {
        return null;
    }

    const numero =
        Number(
            valor
        );

    if (
        !Number.isFinite(
            numero
        ) ||
        numero <
            0
    ) {
        return null;
    }

    return numero;
}

function fingerprintFNV1a(
    texto
) {
    let hash =
        0x811c9dc5;

    for (
        let indice = 0;
        indice <
        texto.length;
        indice += 1
    ) {
        hash ^=
            texto.charCodeAt(
                indice
            );

        hash =
            Math.imul(
                hash,
                0x01000193
            );
    }

    return (
        hash >>> 0
    )
        .toString(
            16
        )
        .padStart(
            8,
            "0"
        );
}

function criarSelecaoId({
    estruturaBase,
    chaves,
}) {
    const origem =
        [
            textoSeguro(
                estruturaBase
                    ?.colaborador
                    ?.id
            ),

            textoSeguro(
                estruturaBase
                    ?.empresa
                    ?.id
            ),

            textoSeguro(
                estruturaBase
                    ?.obra
                    ?.id
            ),

            ...chaves,
        ].join(
            "|"
        );

    return `sel-${fingerprintFNV1a(
        origem
    )}`;
}

export function criarEstruturaExportacaoConsolidacaoColaborador({
    estruturaBase,
    selecao = null,
} = {}) {
    const {
        indice,
        chaves,
    } =
        normalizarChavesSelecionadas({
            estruturaBase,
            selecao,
        });

    const chavesSet =
        new Set(
            chaves
        );

    const documentosSelecionados =
        [];

    const evidenciasSelecionadas =
        [];

    estruturaBase
        .documentos
        .forEach(
            (
                documento
            ) => {
                const evidenciasDocumentoSelecionadas =
                    [];

                arraySeguro(
                    documento
                        ?.evidenciasAtuais
                ).forEach(
                    (
                        evidencia
                    ) => {
                        const chave =
                            obterChaveSelecaoEvidenciaConsolidacao({
                                documento,
                                evidencia,
                            });

                        if (
                            !chave ||
                            !chavesSet.has(
                                chave
                            )
                        ) {
                            return;
                        }

                        const registroIndice =
                            indice
                                .evidenciasPorChave
                                .get(
                                    chave
                                );

                        if (
                            !registroIndice ||
                            !registroIndice
                                .selecionavel
                        ) {
                            throw new Error(
                                `Seleção física inconsistente durante materialização: ${chave}.`
                            );
                        }

                        const evidenciaExportacao =
                            {
                                certificadoId:
                                    documento
                                        ?.certificadoId ||
                                    null,

                                treinamentoCodigo:
                                    documento
                                        ?.treinamentoCodigo ??
                                    null,

                                categoriaConsolidacao:
                                    documento
                                        ?.categoriaConsolidacao ||
                                    null,

                                chaveSelecao:
                                    chave,

                                ...clonarSerializavel(
                                    evidencia
                                ),
                            };

                        evidenciasDocumentoSelecionadas.push(
                            evidenciaExportacao
                        );

                        evidenciasSelecionadas.push(
                            clonarSerializavel(
                                evidenciaExportacao
                            )
                        );
                    }
                );

                if (
                    evidenciasDocumentoSelecionadas
                        .length ===
                    0
                ) {
                    return;
                }

                documentosSelecionados.push(
                    criarDocumentoSelecionado({
                        documento,

                        evidenciasSelecionadas:
                            evidenciasDocumentoSelecionadas,
                    })
                );
            }
        );

    const tamanhos =
        evidenciasSelecionadas.map(
            obterTamanhoBytesEvidencia
        );

    const tamanhoBytesCompleto =
        tamanhos.length >
            0 &&
        tamanhos.every(
            (
                valor
            ) =>
                valor !==
                null
        );

    const totalBytesEstimado =
        tamanhoBytesCompleto
            ? tamanhos.reduce(
                  (
                      total,
                      valor
                  ) =>
                      total +
                      valor,
                  0
              )
            : null;

    const bloqueiosExportacao =
        [];

    if (
        evidenciasSelecionadas
            .length ===
        0
    ) {
        bloqueiosExportacao.push(
            {
                codigo:
                    "SELECAO_VAZIA",

                nivel:
                    "critico",

                mensagem:
                    "Nenhuma evidência física foi selecionada para a Consolidação.",
            }
        );
    }

    const bloqueiosBase =
        clonarSerializavel(
            arraySeguro(
                estruturaBase
                    ?.bloqueios
            )
        );

    const snapshotBase =
        clonarSerializavel(
            estruturaBase
        );

    return {
        ...snapshotBase,

        exportacao: {
            schemaVersion:
                CONSOLIDACAO_COLABORADOR_EXPORT_SCHEMA_VERSION,

            selecaoSchemaVersion:
                CONSOLIDACAO_COLABORADOR_SELECTION_SCHEMA_VERSION,

            selecaoId:
                criarSelecaoId({
                    estruturaBase,

                    chaves,
                }),

            evidenciasSelecionadasChaves:
                [
                    ...chaves,
                ],

            documentosSelecionados,

            evidenciasSelecionadas,

            totalDocumentos:
                documentosSelecionados
                    .length,

            totalArquivos:
                evidenciasSelecionadas
                    .length,

            totalBytesEstimado,

            tamanhoBytesCompleto,

            selecaoVazia:
                evidenciasSelecionadas
                    .length ===
                0,

            bloqueios:
                bloqueiosExportacao,

            podeGerar:
                bloqueiosBase
                    .length ===
                    0 &&
                bloqueiosExportacao
                    .length ===
                    0,
        },
    };
}
