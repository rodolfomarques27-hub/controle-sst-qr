
export const CONSOLIDACAO_COLABORADOR_ARQUIVOS_SCHEMA_VERSION =
    "consolidacao-colaborador-arquivos-v1";

export const CONSOLIDACAO_COLABORADOR_MEDICAO_SCHEMA_VERSION =
    "consolidacao-colaborador-medicao-arquivos-v1";

const ZIP_PLAN_SCHEMA_VERSION =
    "consolidacao-colaborador-zip-plan-v1";

const BUCKET_CERTIFICADOS =
    "certificados-treinamentos";

const EXPIRACAO_URL_ASSINADA_PADRAO =
    60 *
    10;

const TIMEOUT_DOWNLOAD_PADRAO_MS =
    45_000;

async function gerarUrlAssinadaCertificadoPadrao(
    opcoes
) {
    const {
        gerarUrlAssinadaCertificado,
    } =
        await import(
            "../../../services/certificadosStorageService.js"
        );

    if (
        typeof gerarUrlAssinadaCertificado !==
        "function"
    ) {
        throw new Error(
            "Consolidação: gerarUrlAssinadaCertificado indisponível no Storage canônico."
        );
    }

    return gerarUrlAssinadaCertificado(
        opcoes
    );
}

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

function numeroBytesEsperado(
    valor
) {
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

    return Math.trunc(
        numero
    );
}

function validarSha256Esperado(
    valor
) {
    const sha =
        textoSeguro(
            valor
        )
            .replace(
                /^sha256:/i,
                ""
            )
            .toLowerCase();

    if (!sha) {
        return "";
    }

    if (
        !/^[a-f0-9]{64}$/.test(
            sha
        )
    ) {
        throw new Error(
            "Consolidação: SHA-256 esperado possui formato inválido."
        );
    }

    return sha;
}

function validarPlanoZip(
    planoZip
) {
    if (
        !planoZip ||
        typeof planoZip !==
            "object"
    ) {
        throw new Error(
            "Consolidação: Plano ZIP não informado."
        );
    }

    if (
        planoZip
            .schemaVersion !==
        ZIP_PLAN_SCHEMA_VERSION
    ) {
        throw new Error(
            "Consolidação: schema do Plano ZIP inválido."
        );
    }

    if (
        planoZip
            .podeGerar !==
        true
    ) {
        throw new Error(
            "Consolidação: Plano ZIP está bloqueado para geração."
        );
    }

    const arquivos =
        listaSegura(
            planoZip
                .arquivos
        );

    if (
        arquivos.length ===
        0
    ) {
        throw new Error(
            "Consolidação: Plano ZIP não possui arquivos."
        );
    }

    if (
        Number(
            planoZip
                .totalArquivos
        ) !==
        arquivos.length
    ) {
        throw new Error(
            "Consolidação: totalArquivos diverge do Plano ZIP materializado."
        );
    }

    const chaves =
        new Set();

    const caminhos =
        new Set();

    for (
        const arquivo
        of arquivos
    ) {
        const chaveSelecao =
            textoSeguro(
                arquivo
                    ?.chaveSelecao
            );

        const caminhoRelativo =
            textoSeguro(
                arquivo
                    ?.caminhoRelativo
            );

        const caminhoStorage =
            textoSeguro(
                arquivo
                    ?.arquivoUrl
            );

        const bucket =
            textoSeguro(
                arquivo
                    ?.bucket
            );

        if (!chaveSelecao) {
            throw new Error(
                "Consolidação: arquivo planejado sem chaveSelecao."
            );
        }

        if (!caminhoRelativo) {
            throw new Error(
                `Consolidação: arquivo ${chaveSelecao} sem caminhoRelativo.`
            );
        }

        if (!caminhoStorage) {
            throw new Error(
                `Consolidação: arquivo ${chaveSelecao} sem caminho físico no Storage.`
            );
        }

        if (
            /^https?:\/\//i.test(
                caminhoStorage
            )
        ) {
            throw new Error(
                `Consolidação: arquivo ${chaveSelecao} contém URL completa onde era esperado caminho privado do Storage.`
            );
        }

        if (
            bucket !==
            BUCKET_CERTIFICADOS
        ) {
            throw new Error(
                `Consolidação: bucket incompatível com o serviço canônico de certificados: ${bucket || "(vazio)"}`
            );
        }

        if (
            chaves.has(
                chaveSelecao
            )
        ) {
            throw new Error(
                `Consolidação: chaveSelecao duplicada no Plano ZIP: ${chaveSelecao}`
            );
        }

        const caminhoComparacao =
            caminhoRelativo
                .normalize(
                    "NFD"
                )
                .replace(
                    /[\u0300-\u036f]/g,
                    ""
                )
                .toLowerCase();

        if (
            caminhos.has(
                caminhoComparacao
            )
        ) {
            throw new Error(
                `Consolidação: caminho relativo duplicado: ${caminhoRelativo}`
            );
        }

        validarSha256Esperado(
            arquivo
                ?.arquivoSha256
        );

        chaves.add(
            chaveSelecao
        );

        caminhos.add(
            caminhoComparacao
        );
    }

    return arquivos;
}

async function calcularSha256Hex(
    bytes,
    subtleCrypto =
        globalThis
            ?.crypto
            ?.subtle
) {
    if (!subtleCrypto) {
        throw new Error(
            "Consolidação: Web Crypto indisponível para validação SHA-256."
        );
    }

    const digest =
        await subtleCrypto.digest(
            "SHA-256",
            bytes
        );

    return Array.from(
        new Uint8Array(
            digest
        )
    )
        .map(
            (
                byte
            ) =>
                byte
                    .toString(
                        16
                    )
                    .padStart(
                        2,
                        "0"
                    )
        )
        .join(
            ""
        );
}

async function executarFetchComTimeout({
    url,
    fetchImpl,
    timeoutMs,
}) {
    if (
        typeof fetchImpl !==
        "function"
    ) {
        throw new Error(
            "Consolidação: implementação de fetch indisponível."
        );
    }

    const timeout =
        Number(
            timeoutMs
        );

    const usarTimeout =
        Number.isFinite(
            timeout
        ) &&
        timeout >
            0 &&
        typeof AbortController !==
            "undefined";

    const controller =
        usarTimeout
            ? new AbortController()
            : null;

    let timer =
        null;

    if (controller) {
        timer =
            setTimeout(
                () => {
                    controller.abort();
                },
                timeout
            );
    }

    try {
        return await fetchImpl(
            url,
            controller
                ? {
                      signal:
                          controller
                              .signal,
                  }
                : undefined
        );
    } finally {
        if (timer) {
            clearTimeout(
                timer
            );
        }
    }
}

function mensagemArquivo(
    arquivo
) {
    return (
        textoSeguro(
            arquivo
                ?.caminhoRelativo
        ) ||
        textoSeguro(
            arquivo
                ?.chaveSelecao
        ) ||
        "arquivo desconhecido"
    );
}

export async function resolverArquivoFisicoConsolidacaoColaborador({
    supabase,
    arquivoPlanejado,
    fetchImpl =
        globalThis.fetch,
    gerarUrlAssinada =
        gerarUrlAssinadaCertificadoPadrao,
    expiracaoSegundos =
        EXPIRACAO_URL_ASSINADA_PADRAO,
    timeoutMs =
        TIMEOUT_DOWNLOAD_PADRAO_MS,
    subtleCrypto =
        globalThis
            ?.crypto
            ?.subtle,
}) {
    if (
        !arquivoPlanejado ||
        typeof arquivoPlanejado !==
            "object"
    ) {
        throw new Error(
            "Consolidação: arquivo planejado não informado."
        );
    }

    if (
        typeof gerarUrlAssinada !==
        "function"
    ) {
        throw new Error(
            "Consolidação: resolvedor de URL assinada indisponível."
        );
    }

    const bucket =
        textoSeguro(
            arquivoPlanejado
                ?.bucket
        );

    if (
        bucket !==
        BUCKET_CERTIFICADOS
    ) {
        throw new Error(
            `Consolidação: bucket não suportado para ${mensagemArquivo(arquivoPlanejado)}.`
        );
    }

    const caminhoStorage =
        textoSeguro(
            arquivoPlanejado
                ?.arquivoUrl
        );

    if (!caminhoStorage) {
        throw new Error(
            `Consolidação: caminho do Storage ausente para ${mensagemArquivo(arquivoPlanejado)}.`
        );
    }

    if (
        /^https?:\/\//i.test(
            caminhoStorage
        )
    ) {
        throw new Error(
            `Consolidação: referência física deve ser caminho privado, não URL completa: ${mensagemArquivo(arquivoPlanejado)}.`
        );
    }

    let urlAssinada;

    try {
        urlAssinada =
            textoSeguro(
                await gerarUrlAssinada({
                    supabase,
                    caminho:
                        caminhoStorage,
                    expiracaoSegundos,
                })
            );
    } catch (
        error
    ) {
        throw new Error(
            `Consolidação: não foi possível autorizar ${mensagemArquivo(arquivoPlanejado)}: ${error?.message || "erro desconhecido"}`,
            {
                cause:
                    error,
            }
        );
    }

    if (!urlAssinada) {
        throw new Error(
            `Consolidação: URL assinada vazia para ${mensagemArquivo(arquivoPlanejado)}.`
        );
    }

    let response;

    try {
        response =
            await executarFetchComTimeout({
                url:
                    urlAssinada,
                fetchImpl,
                timeoutMs,
            });
    } catch (
        error
    ) {
        const abortado =
            error?.name ===
            "AbortError";

        throw new Error(
            abortado
                ? `Consolidação: tempo limite excedido ao baixar ${mensagemArquivo(arquivoPlanejado)}.`
                : `Consolidação: falha ao baixar ${mensagemArquivo(arquivoPlanejado)}: ${error?.message || "erro desconhecido"}`,
            {
                cause:
                    error,
            }
        );
    }

    if (
        !response ||
        response.ok !==
            true
    ) {
        const status =
            Number(
                response
                    ?.status
            );

        throw new Error(
            `Consolidação: download recusado para ${mensagemArquivo(arquivoPlanejado)}${
                Number.isFinite(
                    status
                )
                    ? ` (HTTP ${status})`
                    : ""
            }.`
        );
    }

    let arrayBuffer;

    try {
        arrayBuffer =
            await response.arrayBuffer();
    } catch (
        error
    ) {
        throw new Error(
            `Consolidação: resposta física inválida para ${mensagemArquivo(arquivoPlanejado)}.`,
            {
                cause:
                    error,
            }
        );
    }

    const bytes =
        new Uint8Array(
            arrayBuffer
        );

    if (
        bytes.byteLength ===
        0
    ) {
        throw new Error(
            `Consolidação: arquivo físico vazio: ${mensagemArquivo(arquivoPlanejado)}.`
        );
    }

    const sha256Esperado =
        validarSha256Esperado(
            arquivoPlanejado
                ?.arquivoSha256
        );

    let sha256Real =
        "";

    let sha256Validado =
        false;

    if (sha256Esperado) {
        sha256Real =
            await calcularSha256Hex(
                bytes,
                subtleCrypto
            );

        if (
            sha256Real !==
            sha256Esperado
        ) {
            throw new Error(
                `Consolidação: SHA-256 divergente para ${mensagemArquivo(arquivoPlanejado)}.`
            );
        }

        sha256Validado =
            true;
    }

    const tamanhoBytesPlanejado =
        numeroBytesEsperado(
            arquivoPlanejado
                ?.tamanhoBytes
        );

    const tamanhoBytesReal =
        bytes.byteLength;

    return {
        schemaVersion:
            CONSOLIDACAO_COLABORADOR_ARQUIVOS_SCHEMA_VERSION,

        ...arquivoPlanejado,

        tamanhoBytesPlanejado,

        tamanhoBytesReal,

        tamanhoBytesConfere:
            tamanhoBytesPlanejado ===
                null
                ? null
                : tamanhoBytesPlanejado ===
                  tamanhoBytesReal,

        sha256Esperado,

        sha256Real,

        sha256Validado,

        contentType:
            textoSeguro(
                response
                    ?.headers
                    ?.get?.(
                        "content-type"
                    )
            ),

        dados:
            bytes,
    };
}

export async function* iterarArquivosFisicosConsolidacaoColaborador({
    supabase,
    planoZip,
    fetchImpl =
        globalThis.fetch,
    gerarUrlAssinada =
        gerarUrlAssinadaCertificadoPadrao,
    expiracaoSegundos =
        EXPIRACAO_URL_ASSINADA_PADRAO,
    timeoutMs =
        TIMEOUT_DOWNLOAD_PADRAO_MS,
    subtleCrypto =
        globalThis
            ?.crypto
            ?.subtle,
}) {
    const arquivos =
        validarPlanoZip(
            planoZip
        );

    for (
        const arquivoPlanejado
        of arquivos
    ) {
        yield await resolverArquivoFisicoConsolidacaoColaborador({
            supabase,
            arquivoPlanejado,
            fetchImpl,
            gerarUrlAssinada,
            expiracaoSegundos,
            timeoutMs,
            subtleCrypto,
        });
    }
}

export async function medirArquivosFisicosConsolidacaoColaborador(
    opcoes
) {
    const planoZip =
        opcoes
            ?.planoZip;

    const arquivosMedidos =
        [];

    let totalBytesReal =
        0;

    let maiorArquivoBytes =
        0;

    let arquivosComTamanhoPlanejado =
        0;

    let divergenciasTamanho =
        0;

    let arquivosComSha256 =
        0;

    let arquivosSha256Validados =
        0;

    for await (
        const arquivoResolvido
        of iterarArquivosFisicosConsolidacaoColaborador(
            opcoes
        )
    ) {
        const {
            dados,
            ...metadados
        } =
            arquivoResolvido;

        const tamanho =
            dados.byteLength;

        totalBytesReal +=
            tamanho;

        maiorArquivoBytes =
            Math.max(
                maiorArquivoBytes,
                tamanho
            );

        if (
            metadados
                .tamanhoBytesPlanejado !==
            null
        ) {
            arquivosComTamanhoPlanejado +=
                1;

            if (
                metadados
                    .tamanhoBytesConfere !==
                true
            ) {
                divergenciasTamanho +=
                    1;
            }
        }

        if (
            metadados
                .sha256Esperado
        ) {
            arquivosComSha256 +=
                1;
        }

        if (
            metadados
                .sha256Validado ===
            true
        ) {
            arquivosSha256Validados +=
                1;
        }

        arquivosMedidos.push(
            metadados
        );
    }

    return {
        schemaVersion:
            CONSOLIDACAO_COLABORADOR_MEDICAO_SCHEMA_VERSION,

        planoId:
            textoSeguro(
                planoZip
                    ?.planoId
            ),

        selecaoId:
            textoSeguro(
                planoZip
                    ?.selecaoId
            ),

        totalArquivos:
            arquivosMedidos.length,

        totalBytesReal,

        maiorArquivoBytes,

        arquivosComTamanhoPlanejado,

        divergenciasTamanho,

        arquivosComSha256,

        arquivosSha256Validados,

        todosSha256DisponiveisValidados:
            arquivosComSha256 >
                0 &&
            arquivosComSha256 ===
                arquivosSha256Validados,

        arquivos:
            arquivosMedidos,
    };
}