export const CONSOLIDACAO_COLABORADOR_ZIP_PLAN_SCHEMA_VERSION =
    "consolidacao-colaborador-zip-plan-v1";

const STRUCTURE_SCHEMA_VERSION =
    "consolidacao-colaborador-structure-v1";

const EXPORT_SCHEMA_VERSION =
    "consolidacao-colaborador-export-structure-v1";

const PASTAS_BASE_PERMITIDAS =
    new Set([
        "01_DOCUMENTOS_PESSOAIS",
        "02_ASO",
        "03_ORDEM_DE_SERVICO",
        "04_EPI",
        "05_TREINAMENTOS",
    ]);

const LIMITE_CAMINHO_RELATIVO =
    230;

const LIMITE_NOME_ZIP =
    180;

const LIMITE_NOME_COLABORADOR_ZIP_SEM_ABREVIAR =
    28;

const CARACTERES_INVALIDOS_WINDOWS =
    /[<>:"/\\|?*]/g;

function textoSeguro(
    valor = ""
) {
    return String(
        valor ??
            ""
    ).trim();
}

function listaSegura(
    valor
) {
    return Array.isArray(
        valor
    )
        ? valor
        : [];
}

function numeroInteiroSeguro(
    valor,
    fallback = 0
) {
    const numero =
        Number(
            valor
        );

    if (
        !Number.isFinite(
            numero
        )
    ) {
        return fallback;
    }

    return Math.trunc(
        numero
    );
}

function normalizarComparacao(
    valor
) {
    return textoSeguro(
        valor
    )
        .normalize(
            "NFD"
        )
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .toLowerCase();
}

function limparSegmentoWindows(
    valor,
    {
        fallback = "ITEM",
        limite = null,
    } = {}
) {
    let resultado =
        Array.from(
            textoSeguro(
                valor
            )
        )
            .filter(
                (
                    caractere
                ) => {
                    const codigo =
                        caractere.charCodeAt(
                            0
                        );

                    return !(
                        codigo <=
                            31 ||
                        (
                            codigo >=
                                127 &&
                            codigo <=
                                159
                        )
                    );
                }
            )
            .join(
                ""
            )
            .replace(
                CARACTERES_INVALIDOS_WINDOWS,
                "-"
            )
            .replace(
                /\s+/g,
                " "
            )
            .replace(
                /^[. ]+/g,
                ""
            )
            .replace(
                /[. ]+$/g,
                ""
            )
            .trim();

    if (!resultado) {
        resultado =
            fallback;
    }

    if (
        /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i.test(
            resultado
        )
    ) {
        resultado =
            `_${resultado}`;
    }

    if (
        Number.isInteger(
            limite
        ) &&
        limite > 0 &&
        resultado.length >
            limite
    ) {
        resultado =
            resultado
                .slice(
                    0,
                    limite
                )
                .replace(
                    /[. ]+$/g,
                    ""
                )
                .trim();

        if (!resultado) {
            resultado =
                fallback;
        }
    }

    return resultado;
}

function obterPrimeiroTexto(
    objeto,
    campos
) {
    for (
        const campo
        of campos
    ) {
        const valor =
            textoSeguro(
                objeto?.[
                    campo
                ]
            );

        if (valor) {
            return valor;
        }
    }

    return "";
}

function obterNomeColaborador(
    estrutura
) {
    const nome =
        obterPrimeiroTexto(
            estrutura
                ?.colaborador,
            [
                "nomeCompleto",
                "nome_completo",
                "nome",
            ]
        );

    if (!nome) {
        throw new Error(
            "Plano ZIP: colaborador sem nome canônico."
        );
    }

    return limparSegmentoWindows(
        nome.toLocaleUpperCase(
            "pt-BR"
        ),
        {
            fallback:
                "COLABORADOR",
        }
    );
}

function obterNomeEmpresa(
    estrutura
) {
    const nome =
        obterPrimeiroTexto(
            estrutura
                ?.empresa,
            [
                "razaoSocial",
                "razao_social",
                "nomeFantasia",
                "nome_fantasia",
                "nome",
            ]
        );

    if (!nome) {
        throw new Error(
            "Plano ZIP: empresa sem nome canônico."
        );
    }

    return limparSegmentoWindows(
        nome.toLocaleUpperCase(
            "pt-BR"
        ),
        {
            fallback:
                "EMPRESA",
            limite:
                72,
        }
    );
}

function extrairExtensao(
    evidencia
) {
    const candidatos =
        [
            evidencia
                ?.arquivoNomeOriginal,
            evidencia
                ?.arquivoUrl,
            evidencia
                ?.arquivo_url,
        ];

    for (
        const candidato
        of candidatos
    ) {
        const texto =
            textoSeguro(
                candidato
            );

        if (!texto) {
            continue;
        }

        const limpo =
            texto
                .split(
                    "?"
                )[0]
                .split(
                    "#"
                )[0];

        const nome =
            limpo
                .split(
                    /[\\/]+/
                )
                .pop() ||
            "";

        const match =
            nome.match(
                /\.([a-zA-Z0-9]{1,8})$/
            );

        if (match) {
            return (
                "." +
                match[1]
                    .toLowerCase()
            );
        }
    }

    return ".pdf";
}

function normalizarTipoEvidencia(
    valor
) {
    return normalizarComparacao(
        valor
    )
        .replace(
            /[^a-z0-9]+/g,
            "_"
        )
        .replace(
            /^_+|_+$/g,
            ""
        );
}

function obterRotuloEvidencia(
    evidencia
) {
    const tipo =
        normalizarTipoEvidencia(
            evidencia
                ?.tipoEvidencia
        );

    if (
        tipo.includes(
            "lista"
        )
    ) {
        return "LISTA";
    }

    if (
        tipo.includes(
            "certificado"
        )
    ) {
        return "CERTIFICADO";
    }

    if (
        tipo.includes(
            "complement"
        )
    ) {
        return "COMPLEMENTAR";
    }

    if (
        tipo.includes(
            "principal"
        )
    ) {
        return "DOCUMENTO";
    }

    return "EVIDENCIA";
}

function obterNomeDocumento(
    documento
) {
    return (
        textoSeguro(
            documento
                ?.nomeTreinamento
        ) ||
        textoSeguro(
            documento
                ?.nomeDocumento
        ) ||
        textoSeguro(
            documento
                ?.tipoTreinamento
        ) ||
        (
            documento
                ?.treinamentoCodigo
                ? `DOCUMENTO ${documento.treinamentoCodigo}`
                : "DOCUMENTO"
        )
    );
}

function obterDescricaoArquivo(
    documento,
    evidencia,
    totalEvidenciasDocumento
) {
    const codigo =
        numeroInteiroSeguro(
            documento
                ?.treinamentoCodigo,
            0
        );

    const rotulo =
        obterRotuloEvidencia(
            evidencia
        );

    if (
        codigo ===
        8
    ) {
        return "NR 06 TREINAMENTO";
    }

    if (
        codigo ===
        14
    ) {
        return "NR 06 FICHA EPI";
    }

    if (
        codigo ===
        3
    ) {
        if (
            rotulo ===
            "LISTA"
        ) {
            return "NR 12 LISTA";
        }

        if (
            rotulo ===
            "CERTIFICADO"
        ) {
            return "NR 12 CERTIFICADO";
        }

        return `NR 12 ${rotulo}`;
    }

    let descricao =
        limparSegmentoWindows(
            obterNomeDocumento(
                documento
            ).toLocaleUpperCase(
                "pt-BR"
            ),
            {
                fallback:
                    "DOCUMENTO",
                limite:
                    96,
            }
        );

    if (
        totalEvidenciasDocumento >
        1
    ) {
        descricao +=
            ` - ${rotulo}`;
    }

    return descricao;
}

function montarNomeArquivo({
    nomeColaborador,
    documento,
    evidencia,
    totalEvidenciasDocumento,
    limiteDisponivel,
}) {
    const extensao =
        extrairExtensao(
            evidencia
        );

    const prefixo =
        `${nomeColaborador} - `;

    const espacoDescricao =
        Math.min(
            180,
            limiteDisponivel
        ) -
        prefixo.length -
        extensao.length;

    if (
        espacoDescricao <
        8
    ) {
        throw new Error(
            "Plano ZIP: caminho não permite preservar o nome completo do colaborador."
        );
    }

    const descricao =
        limparSegmentoWindows(
            obterDescricaoArquivo(
                documento,
                evidencia,
                totalEvidenciasDocumento
            ),
            {
                fallback:
                    "DOCUMENTO",
                limite:
                    espacoDescricao,
            }
        );

    return (
        prefixo +
        descricao +
        extensao
    );
}

function separarExtensao(
    nomeArquivo
) {
    const match =
        textoSeguro(
            nomeArquivo
        ).match(
            /^(.*?)(\.[a-zA-Z0-9]{1,8})$/
        );

    if (!match) {
        return {
            base:
                nomeArquivo,
            extensao:
                "",
        };
    }

    return {
        base:
            match[1],
        extensao:
            match[2],
    };
}

function adicionarSufixo(
    nomeArquivo,
    indice
) {
    const {
        base,
        extensao,
    } =
        separarExtensao(
            nomeArquivo
        );

    return (
        `${base} - ` +
        String(
            indice
        ).padStart(
            2,
            "0"
        ) +
        extensao
    );
}

function obterTamanhoBytes(
    evidencia
) {
    const bruto =
        evidencia
            ?.tamanhoBytes ??
        evidencia
            ?.tamanho_bytes;

    if (
        bruto ===
            null ||
        bruto ===
            undefined ||
        bruto ===
            ""
    ) {
        return null;
    }

    const numero =
        Number(
            bruto
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

    return Math.trunc(
        numero
    );
}

function ordenarDocumentos(
    documentos
) {
    return [
        ...documentos,
    ].sort(
        (
            a,
            b
        ) => {
            const ordemA =
                numeroInteiroSeguro(
                    a
                        ?.categoriaOrdem,
                    999
                );

            const ordemB =
                numeroInteiroSeguro(
                    b
                        ?.categoriaOrdem,
                    999
                );

            if (
                ordemA !==
                ordemB
            ) {
                return (
                    ordemA -
                    ordemB
                );
            }

            const codigoA =
                numeroInteiroSeguro(
                    a
                        ?.treinamentoCodigo,
                    99999
                );

            const codigoB =
                numeroInteiroSeguro(
                    b
                        ?.treinamentoCodigo,
                    99999
                );

            if (
                codigoA !==
                codigoB
            ) {
                return (
                    codigoA -
                    codigoB
                );
            }

            return obterNomeDocumento(
                a
            ).localeCompare(
                obterNomeDocumento(
                    b
                ),
                "pt-BR"
            );
        }
    );
}

function ordenarEvidencias(
    evidencias
) {
    return [
        ...evidencias,
    ].sort(
        (
            a,
            b
        ) =>
            textoSeguro(
                a
                    ?.chaveSelecao
            ).localeCompare(
                textoSeguro(
                    b
                        ?.chaveSelecao
                ),
                "pt-BR"
            )
    );
}

function validarEstrutura(
    estrutura
) {
    if (
        estrutura
            ?.schemaVersion !==
        STRUCTURE_SCHEMA_VERSION
    ) {
        throw new Error(
            "Plano ZIP: schema do Estrutura base inválido."
        );
    }

    const exportacao =
        estrutura
            ?.exportacao;

    if (
        !exportacao ||
        typeof exportacao !==
            "object"
    ) {
        throw new Error(
            "Plano ZIP: bloco exportacao ausente."
        );
    }

    if (
        exportacao
            ?.schemaVersion !==
        EXPORT_SCHEMA_VERSION
    ) {
        throw new Error(
            "Plano ZIP: schema do Estrutura de Exportação inválido."
        );
    }

    if (
        exportacao
            .podeGerar !==
        true
    ) {
        throw new Error(
            "Plano ZIP: Export Structure bloqueado para geração."
        );
    }

    const documentos =
        listaSegura(
            exportacao
                .documentosSelecionados
        );

    const evidencias =
        listaSegura(
            exportacao
                .evidenciasSelecionadas
        );

    if (
        documentos.length ===
        0 ||
        evidencias.length ===
        0
    ) {
        throw new Error(
            "Plano ZIP: seleção vazia."
        );
    }

    if (
        numeroInteiroSeguro(
            exportacao
                .totalDocumentos,
            -1
        ) !==
        documentos.length
    ) {
        throw new Error(
            "Plano ZIP: totalDocumentos divergente."
        );
    }

    if (
        numeroInteiroSeguro(
            exportacao
                .totalArquivos,
            -1
        ) !==
        evidencias.length
    ) {
        throw new Error(
            "Plano ZIP: totalArquivos divergente."
        );
    }

    const selecaoId =
        textoSeguro(
            exportacao
                .selecaoId
        );

    if (!selecaoId) {
        throw new Error(
            "Plano ZIP: selecaoId ausente."
        );
    }

    return {
        exportacao,
        documentos,
        evidencias,
        selecaoId,
    };
}

function indexarEvidencias(
    evidencias
) {
    const mapa =
        new Map();

    for (
        const evidencia
        of evidencias
    ) {
        const chave =
            textoSeguro(
                evidencia
                    ?.chaveSelecao
            );

        if (!chave) {
            throw new Error(
                "Plano ZIP: evidência sem chaveSelecao."
            );
        }

        if (
            mapa.has(
                chave
            )
        ) {
            throw new Error(
                `Plano ZIP: chaveSelecao duplicada: ${chave}`
            );
        }

        if (
            evidencia
                ?.historica ===
            true
        ) {
            throw new Error(
                `Plano ZIP: evidência histórica selecionada: ${chave}`
            );
        }

        const arquivoUrl =
            textoSeguro(
                evidencia
                    ?.arquivoUrl ||
                evidencia
                    ?.arquivo_url
            );

        if (!arquivoUrl) {
            throw new Error(
                `Plano ZIP: evidência sem referência física: ${chave}`
            );
        }

        mapa.set(
            chave,
            evidencia
        );
    }

    return mapa;
}

function abreviarNomeColaboradorZip(
    nomeColaborador
) {
    const nome =
        limparSegmentoWindows(
            nomeColaborador,
            {
                fallback:
                    "COLABORADOR",
            }
        );

    if (
        nome.length <=
        LIMITE_NOME_COLABORADOR_ZIP_SEM_ABREVIAR
    ) {
        return nome;
    }

    const partes =
        nome
            .split(
                /\s+/g
            )
            .filter(
                Boolean
            );

    if (
        partes.length <=
        2
    ) {
        return nome;
    }

    const primeiro =
        partes[0];

    const ultimo =
        partes[
            partes.length -
            1
        ];

    const intermediarios =
        partes
            .slice(
                1,
                -1
            )
            .map(
                (
                    parte
                ) => {
                    const inicial =
                        Array.from(
                            parte
                        )[0];

                    return inicial
                        ? `${inicial}.`
                        : "";
                }
            )
            .filter(
                Boolean
            );

    return [
        primeiro,
        ...intermediarios,
        ultimo,
    ].join(
        " "
    );
}

function criarNomeZip(
    nomeEmpresa,
    nomeColaborador
) {
    const colaboradorArquivo =
        abreviarNomeColaboradorZip(
            nomeColaborador
        );

    const nomeZip =
        `${colaboradorArquivo} - ${nomeEmpresa}.zip`;

    if (
        nomeZip.length >
        LIMITE_NOME_ZIP
    ) {
        throw new Error(
            "Plano ZIP: nome externo excede o limite seguro mesmo após abreviação."
        );
    }

    return nomeZip;
}

export function criarPlanoZipConsolidacaoColaborador(
    estruturaExportacao
) {
    const {
        exportacao,
        documentos,
        evidencias,
        selecaoId,
    } =
        validarEstrutura(
            estruturaExportacao
        );

    const nomeColaborador =
        obterNomeColaborador(
            estruturaExportacao
        );

    const nomeEmpresa =
        obterNomeEmpresa(
            estruturaExportacao
        );

    const evidenciasPorChave =
        indexarEvidencias(
            evidencias
        );

    const consumidas =
        new Set();

    const caminhosUsados =
        new Set();

    const pastas =
        new Set();

    const arquivos =
        [];

    let ordem =
        0;

    for (
        const documento
        of ordenarDocumentos(
            documentos
        )
    ) {
        const pastaBase =
            textoSeguro(
                documento
                    ?.pastaBase
            );

        if (
            !PASTAS_BASE_PERMITIDAS.has(
                pastaBase
            )
        ) {
            throw new Error(
                `Plano ZIP: pastaBase inválida: ${pastaBase || "(vazia)"}`
            );
        }

        const referencias =
            ordenarEvidencias(
                listaSegura(
                    documento
                        ?.evidenciasSelecionadas
                )
            );

        if (
            referencias.length ===
            0
        ) {
            throw new Error(
                "Plano ZIP: documento selecionado sem evidências."
            );
        }

        const pastaRelativa =
            pastaBase;

        pastas.add(
            pastaRelativa
        );

        for (
            const referencia
            of referencias
        ) {
            const chaveSelecao =
                textoSeguro(
                    referencia
                        ?.chaveSelecao
                );

            const evidencia =
                evidenciasPorChave.get(
                    chaveSelecao
                );

            if (!evidencia) {
                throw new Error(
                    `Plano ZIP: evidência não localizada no conjunto global: ${chaveSelecao}`
                );
            }

            if (
                consumidas.has(
                    chaveSelecao
                )
            ) {
                throw new Error(
                    `Plano ZIP: evidência consumida mais de uma vez: ${chaveSelecao}`
                );
            }

            const limiteNome =
                LIMITE_CAMINHO_RELATIVO -
                pastaRelativa.length -
                7;

            const nomeBase =
                montarNomeArquivo({
                    nomeColaborador,
                    documento,
                    evidencia,
                    totalEvidenciasDocumento:
                        referencias.length,
                    limiteDisponivel:
                        limiteNome,
                });

            let nomeArquivo =
                nomeBase;

            let caminhoRelativo =
                `${pastaRelativa}/${nomeArquivo}`;

            let sufixo =
                1;

            while (
                caminhosUsados.has(
                    normalizarComparacao(
                        caminhoRelativo
                    )
                )
            ) {
                sufixo +=
                    1;

                nomeArquivo =
                    adicionarSufixo(
                        nomeBase,
                        sufixo
                    );

                caminhoRelativo =
                    `${pastaRelativa}/${nomeArquivo}`;
            }

            if (
                caminhoRelativo.length >
                LIMITE_CAMINHO_RELATIVO
            ) {
                throw new Error(
                    `Plano ZIP: caminho excedeu ${LIMITE_CAMINHO_RELATIVO} caracteres.`
                );
            }

            caminhosUsados.add(
                normalizarComparacao(
                    caminhoRelativo
                )
            );

            consumidas.add(
                chaveSelecao
            );

            ordem +=
                1;

            arquivos.push({
                ordem,

                certificadoId:
                    documento
                        ?.certificadoId ||
                    evidencia
                        ?.certificadoId ||
                    null,

                treinamentoCodigo:
                    documento
                        ?.treinamentoCodigo ??
                    evidencia
                        ?.treinamentoCodigo ??
                    null,

                categoriaConsolidacao:
                    textoSeguro(
                        documento
                            ?.categoriaConsolidacao ||
                        evidencia
                            ?.categoriaConsolidacao
                    ),

                categoriaOrdem:
                    numeroInteiroSeguro(
                        documento
                            ?.categoriaOrdem,
                        999
                    ),

                pastaBase,

                tipoEvidencia:
                    textoSeguro(
                        evidencia
                            ?.tipoEvidencia
                    ),

                chaveSelecao,

                evidenciaId:
                    evidencia
                        ?.id ||
                    null,

                bucket:
                    textoSeguro(
                        evidencia
                            ?.bucket
                    ) ||
                    "certificados-treinamentos",

                arquivoUrl:
                    textoSeguro(
                        evidencia
                            ?.arquivoUrl ||
                        evidencia
                            ?.arquivo_url
                    ),

                arquivoSha256:
                    textoSeguro(
                        evidencia
                            ?.arquivoSha256 ||
                        evidencia
                            ?.arquivo_sha256
                    ),

                arquivoNomeOriginal:
                    textoSeguro(
                        evidencia
                            ?.arquivoNomeOriginal ||
                        evidencia
                            ?.arquivoNome ||
                        evidencia
                            ?.arquivo_nome
                    ),

                tamanhoBytes:
                    obterTamanhoBytes(
                        evidencia
                    ),

                nomeArquivo,

                caminhoRelativo,

                origem:
                    textoSeguro(
                        evidencia
                            ?.origem
                    ),
            });
        }
    }

    if (
        consumidas.size !==
        evidenciasPorChave.size
    ) {
        throw new Error(
            "Plano ZIP: existe evidência selecionada sem documento correspondente."
        );
    }

    if (
        arquivos.length !==
        exportacao
            .totalArquivos
    ) {
        throw new Error(
            "Plano ZIP: quantidade planejada diverge do Export Structure."
        );
    }

    return {
        schemaVersion:
            CONSOLIDACAO_COLABORADOR_ZIP_PLAN_SCHEMA_VERSION,

        exportSchemaVersion:
            estruturaExportacao
                .schemaVersion,

        selecaoId,

        planoId:
            `zip-${selecaoId}`,

        nomeZip:
            criarNomeZip(
                nomeEmpresa,
                nomeColaborador
            ),

        raiz: {
            empresa:
                nomeEmpresa,

            colaborador:
                nomeColaborador,
        },

        estruturaPastas:
            [
                ...pastas,
            ].sort(),

        arquivos,

        totalPastas:
            pastas.size,

        totalDocumentos:
            documentos.length,

        totalArquivos:
            arquivos.length,

        totalBytesEstimado:
            exportacao
                .totalBytesEstimado ??
            null,

        tamanhoBytesCompleto:
            exportacao
                .tamanhoBytesCompleto ===
            true,

        podeGerar:
            true,
    };
}