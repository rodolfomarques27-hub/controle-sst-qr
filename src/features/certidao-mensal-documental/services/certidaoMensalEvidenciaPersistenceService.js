import {
    CERTIDAO_MENSAL_BUCKET_DOCUMENTOS,
} from "./certidaoMensalDocumentPersistenceService.js";

export const CERTIDAO_MENSAL_RPC_SALVAR_EVIDENCIA =
    "salvar_certidao_mensal_evidencia";

export const CERTIDAO_MENSAL_TIPOS_EVIDENCIA =
    Object.freeze({
        PAGAMENTO_SALARIAL:
            "PAGAMENTO_SALARIAL",

        ADIANTAMENTO_SALARIAL:
            "ADIANTAMENTO_SALARIAL",
    });

const TIPOS_EVIDENCIA_PERMITIDOS =
    new Set(
        Object.values(
            CERTIDAO_MENSAL_TIPOS_EVIDENCIA
        )
    );

const MIME_PDF =
    "application/pdf";

const MIME_BINARIO_GENERICO =
    "application/octet-stream";

const LIMITE_PDF_BYTES =
    25 * 1024 * 1024;

const PADRAO_UUID =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PADRAO_COMPETENCIA =
    /^\d{4}-(0[1-9]|1[0-2])-01$/;

let clienteSupabasePadraoPromise =
    null;

function textoSeguro(
    valor
) {
    return String(
        valor ?? ""
    ).trim();
}

function numeroSeguro(
    valor
) {
    const numero =
        Number(
            valor
        );

    return Number.isFinite(
        numero
    )
        ? numero
        : 0;
}

function clonarJsonSeguro(
    valor
) {
    try {
        return JSON.parse(
            JSON.stringify(
                valor ?? {}
            )
        );
    }
    catch {
        throw new Error(
            "Os dados da evidência não podem ser serializados."
        );
    }
}

function criarErroPersistencia(
    mensagem,
    erroOriginal,
    detalhes = {}
) {
    const detalheOriginal =
        textoSeguro(
            erroOriginal?.message
        );

    const erro =
        new Error(
            detalheOriginal
                ? `${mensagem} ${detalheOriginal}`
                : mensagem
        );

    erro.cause =
        erroOriginal || null;

    Object.assign(
        erro,
        detalhes
    );

    return erro;
}

function validarClienteSupabase(
    clienteSupabase
) {
    if (
        !clienteSupabase ||
        typeof clienteSupabase.rpc !==
            "function" ||
        typeof clienteSupabase.storage?.from !==
            "function"
    ) {
        throw new Error(
            "Cliente Supabase inválido para persistência das evidências."
        );
    }

    return clienteSupabase;
}

async function obterClienteSupabasePadrao() {
    if (!clienteSupabasePadraoPromise) {
        clienteSupabasePadraoPromise =
            import(
                "../../../lib/supabaseClient.js"
            )
                .then(
                    ({
                        supabase,
                    }) =>
                        validarClienteSupabase(
                            supabase
                        )
                )
                .catch(
                    (error) => {
                        clienteSupabasePadraoPromise =
                            null;

                        throw criarErroPersistencia(
                            "Não foi possível carregar o cliente Supabase.",
                            error,
                            {
                                etapa:
                                    "cliente_supabase",
                            }
                        );
                    }
                );
    }

    return clienteSupabasePadraoPromise;
}

function validarUuid(
    valor,
    nomeCampo
) {
    const texto =
        textoSeguro(
            valor
        );

    if (
        !PADRAO_UUID.test(
            texto
        )
    ) {
        throw new Error(
            `${nomeCampo} inválido para a evidência complementar.`
        );
    }

    return texto;
}

function validarCompetencia(
    competencia
) {
    const valor =
        textoSeguro(
            competencia
        );

    if (
        !PADRAO_COMPETENCIA.test(
            valor
        )
    ) {
        throw new Error(
            "Competência inválida para a evidência complementar."
        );
    }

    return valor;
}

function validarTipoEvidencia(
    tipoEvidencia
) {
    const valor =
        textoSeguro(
            tipoEvidencia
        ).toUpperCase();

    if (
        !TIPOS_EVIDENCIA_PERMITIDOS.has(
            valor
        )
    ) {
        throw new Error(
            "Tipo de evidência complementar não permitido."
        );
    }

    return valor;
}

function normalizarNomeArquivo(
    nomeOriginal
) {
    const nome =
        textoSeguro(
            nomeOriginal
        );

    const semExtensao =
        nome.replace(
            /\.pdf$/i,
            ""
        );

    const nomeSeguro =
        semExtensao
            .normalize(
                "NFD"
            )
            .replace(
                /[\u0300-\u036f]/g,
                ""
            )
            .replace(
                /[^a-zA-Z0-9._-]+/g,
                "-"
            )
            .replace(
                /[-_.]+|[-_.]+$/g,
                ""
            )
            .slice(
                0,
                100
            );

    return `${
        nomeSeguro ||
        "evidencia"
    }.pdf`;
}

function criarIdentificadorArquivo() {
    if (
        typeof globalThis
            ?.crypto
            ?.randomUUID ===
        "function"
    ) {
        return globalThis
            .crypto
            .randomUUID();
    }

    return (
        Date.now()
            .toString(36) +
        "-" +
        Math.random()
            .toString(36)
            .slice(
                2,
                14
            )
    );
}

function validarArquivoPdf(
    arquivo
) {
    if (!arquivo) {
        throw new Error(
            "Arquivo da evidência não informado."
        );
    }

    const nome =
        textoSeguro(
            arquivo?.name
        );

    if (
        !/\.pdf$/i.test(
            nome
        )
    ) {
        throw new Error(
            "A evidência complementar deve ser um arquivo PDF."
        );
    }

    const mimeType =
        textoSeguro(
            arquivo?.type
        ).toLowerCase();

    if (
        mimeType &&
        mimeType !==
            MIME_PDF &&
        mimeType !==
            MIME_BINARIO_GENERICO
    ) {
        throw new Error(
            "O tipo MIME da evidência não corresponde a um PDF."
        );
    }

    const tamanhoBytes =
        numeroSeguro(
            arquivo?.size
        );

    if (
        tamanhoBytes <= 0 ||
        tamanhoBytes >
            LIMITE_PDF_BYTES
    ) {
        throw new Error(
            "O PDF da evidência deve possuir até 25 MB."
        );
    }

    if (
        typeof arquivo.arrayBuffer !==
        "function"
    ) {
        throw new Error(
            "O navegador não disponibilizou os bytes do PDF."
        );
    }

    return {
        nomeOriginal:
            nome,

        tamanhoBytes,
    };
}

function validarParametrosEvidencia({
    arquivo,
    itemId,
    empresaId,
    competencia,
    tipoEvidencia,
    diagnostico = {},
    payload = {},
    evidenciaSubstituidaId = null,
} = {}) {
    const dadosArquivo =
        validarArquivoPdf(
            arquivo
        );

    const itemIdSeguro =
        validarUuid(
            itemId,
            "Item documental"
        );

    const empresaIdSeguro =
        validarUuid(
            empresaId,
            "Empresa"
        );

    const competenciaSegura =
        validarCompetencia(
            competencia
        );

    const tipoSeguro =
        validarTipoEvidencia(
            tipoEvidencia
        );

    const evidenciaSubstituidaIdSeguro =
        evidenciaSubstituidaId
            ? validarUuid(
                evidenciaSubstituidaId,
                "Evidência substituída"
            )
            : null;

    return {
        arquivo,

        itemId:
            itemIdSeguro,

        empresaId:
            empresaIdSeguro,

        competencia:
            competenciaSegura,

        tipoEvidencia:
            tipoSeguro,

        nomeOriginal:
            dadosArquivo
                .nomeOriginal,

        tamanhoBytes:
            dadosArquivo
                .tamanhoBytes,

        diagnostico:
            clonarJsonSeguro(
                diagnostico
            ),

        payload:
            clonarJsonSeguro(
                payload
            ),

        evidenciaSubstituidaId:
            evidenciaSubstituidaIdSeguro,
    };
}

async function calcularHashSha256(
    arquivo
) {
    if (
        typeof globalThis
            ?.crypto
            ?.subtle
            ?.digest !==
        "function"
    ) {
        throw new Error(
            "SHA-256 não está disponível neste navegador."
        );
    }

    const buffer =
        await arquivo
            .arrayBuffer();

    const digest =
        await globalThis
            .crypto
            .subtle
            .digest(
                "SHA-256",
                buffer
            );

    return Array.from(
        new Uint8Array(
            digest
        )
    )
        .map(
            (byte) =>
                byte
                    .toString(16)
                    .padStart(
                        2,
                        "0"
                    )
        )
        .join("");
}

function extrairTotalPaginas(
    diagnostico
) {
    const candidatos = [
        diagnostico
            ?.leitura
            ?.totalPaginas,

        diagnostico
            ?.totalPaginas,
    ];

    for (
        const candidato
        of candidatos
    ) {
        const numero =
            Math.trunc(
                numeroSeguro(
                    candidato
                )
            );

        if (numero > 0) {
            return numero;
        }
    }

    return null;
}

export function criarCaminhoStorageEvidenciaCertidaoMensal({
    empresaId,
    competencia,
    tipoEvidencia,
    nomeOriginal,
} = {}) {
    const empresa =
        validarUuid(
            empresaId,
            "Empresa"
        );

    const competenciaSegura =
        validarCompetencia(
            competencia
        );

    const tipo =
        validarTipoEvidencia(
            tipoEvidencia
        );

    const nomeSeguro =
        normalizarNomeArquivo(
            nomeOriginal
        );

    const competenciaPasta =
        competenciaSegura.slice(
            0,
            7
        );

    const identificador =
        criarIdentificadorArquivo();

    return [
        empresa,
        competenciaPasta,
        "folha-pagamento",
        "evidencias",
        tipo.toLowerCase(),
        `${identificador}-${nomeSeguro}`,
    ].join("/");
}

function criarParametrosRpc({
    dados,
    caminhoStorage,
    hashSha256,
    hashCalculadoEm,
} = {}) {
    return {
        p_item_id:
            dados.itemId,

        p_tipo_evidencia:
            dados.tipoEvidencia,

        p_caminho_storage:
            caminhoStorage,

        p_nome_original:
            dados.nomeOriginal,

        p_mime_type:
            MIME_PDF,

        p_tamanho_bytes:
            dados.tamanhoBytes,

        p_hash_sha256:
            hashSha256,

        p_diagnostico:
            clonarJsonSeguro(
                dados.diagnostico
            ),

        p_payload:
            clonarJsonSeguro(
                {
                    ...dados.payload,

                    evidenciaComplementar: {
                        ...(dados.payload
                            ?.evidenciaComplementar ||
                        {}),

                        tipo:
                            dados.tipoEvidencia,

                        competencia:
                            dados.competencia,

                        hashSha256,

                        hashCalculadoEm,
                    },
                }
            ),

        p_total_paginas:
            extrairTotalPaginas(
                dados.diagnostico
            ),

        p_hash_calculado_em:
            hashCalculadoEm,

        p_evidencia_substituida_id:
            dados.evidenciaSubstituidaId,
    };
}

export function criarCertidaoMensalEvidenciaPersistenceService({
    clienteSupabase,
} = {}) {
    const cliente =
        validarClienteSupabase(
            clienteSupabase
        );

    async function removerUploadDeRollback(
        caminhoStorage
    ) {
        try {
            const {
                error,
            } =
                await cliente
                    .storage
                    .from(
                        CERTIDAO_MENSAL_BUCKET_DOCUMENTOS
                    )
                    .remove([
                        caminhoStorage,
                    ]);

            return error || null;
        }
        catch (error) {
            return error;
        }
    }

    async function salvarEvidenciaComplementar({
        arquivo,
        itemId,
        empresaId,
        competencia,
        tipoEvidencia,
        diagnostico = {},
        payload = {},
        evidenciaSubstituidaId = null,
    } = {}) {
        const dados =
            validarParametrosEvidencia({
                arquivo,
                itemId,
                empresaId,
                competencia,
                tipoEvidencia,
                diagnostico,
                payload,
                evidenciaSubstituidaId,
            });

        let hashSha256;

        try {
            hashSha256 =
                await calcularHashSha256(
                    arquivo
                );
        }
        catch (error) {
            throw criarErroPersistencia(
                "Não foi possível calcular o SHA-256 da evidência.",
                error,
                {
                    etapa:
                        "hash_sha256",
                }
            );
        }

        const hashCalculadoEm =
            new Date()
                .toISOString();

        const caminhoStorage =
            criarCaminhoStorageEvidenciaCertidaoMensal({
                empresaId:
                    dados.empresaId,

                competencia:
                    dados.competencia,

                tipoEvidencia:
                    dados.tipoEvidencia,

                nomeOriginal:
                    dados.nomeOriginal,
            });

        const {
            error: uploadError,
        } =
            await cliente
                .storage
                .from(
                    CERTIDAO_MENSAL_BUCKET_DOCUMENTOS
                )
                .upload(
                    caminhoStorage,
                    arquivo,
                    {
                        cacheControl:
                            "3600",

                        contentType:
                            MIME_PDF,

                        upsert:
                            false,
                    }
                );

        if (uploadError) {
            throw criarErroPersistencia(
                "Não foi possível enviar a evidência complementar ao armazenamento.",
                uploadError,
                {
                    etapa:
                        "storage_upload",

                    caminhoStorage,
                }
            );
        }

        const parametrosRpc =
            criarParametrosRpc({
                dados,
                caminhoStorage,
                hashSha256,
                hashCalculadoEm,
            });

        let respostaRpc;

        try {
            respostaRpc =
                await cliente.rpc(
                    CERTIDAO_MENSAL_RPC_SALVAR_EVIDENCIA,
                    parametrosRpc
                );
        }
        catch (error) {
            respostaRpc = {
                data:
                    null,

                error,
            };
        }

        if (respostaRpc?.error) {
            const rollbackError =
                await removerUploadDeRollback(
                    caminhoStorage
                );

            const mensagem =
                rollbackError
                    ? "O banco rejeitou a evidência e o rollback do arquivo também falhou."
                    : "O banco rejeitou a evidência. O arquivo enviado foi removido automaticamente.";

            throw criarErroPersistencia(
                mensagem,
                respostaRpc.error,
                {
                    etapa:
                        "database_rpc",

                    caminhoStorage,

                    rollbackExecutado:
                        !rollbackError,

                    rollbackError:
                        rollbackError ||
                        null,
                }
            );
        }

        return {
            bucketId:
                CERTIDAO_MENSAL_BUCKET_DOCUMENTOS,

            caminhoStorage,

            registro:
                respostaRpc?.data ||
                null,

            hashSha256,

            hashCalculadoEm,

            tipoEvidencia:
                dados.tipoEvidencia,

            evidenciaSubstituidaId:
                dados.evidenciaSubstituidaId,

            payload:
                clonarJsonSeguro(
                    dados.payload
                ),
        };
    }

    return Object.freeze({
        salvarEvidenciaComplementar,
    });
}

async function criarServicoPadrao() {
    const clienteSupabase =
        await obterClienteSupabasePadrao();

    return criarCertidaoMensalEvidenciaPersistenceService({
        clienteSupabase,
    });
}

export async function salvarEvidenciaComplementarCertidaoMensal(
    parametros
) {
    const servico =
        await criarServicoPadrao();

    return servico
        .salvarEvidenciaComplementar(
            parametros
        );
}

async function obterClienteEvidenciasConsulta(
    clienteSupabase
) {
    if (clienteSupabase) {
        return validarClienteSupabase(
            clienteSupabase
        );
    }

    return obterClienteSupabasePadrao();
}

export async function listarEvidenciasAtivasCertidaoMensal({
    itemId,
    clienteSupabase,
} = {}) {
    const itemIdSeguro =
        validarUuid(
            itemId,
            "Item documental"
        );

    const cliente =
        await obterClienteEvidenciasConsulta(
            clienteSupabase
        );

    if (
        typeof cliente.from !==
        "function"
    ) {
        throw new Error(
            "Cliente Supabase inválido para consulta das evidências."
        );
    }

    const {
        data,
        error,
    } =
        await cliente
            .from(
                "certidao_mensal_evidencias"
            )
            .select(
                [
                    "id",
                    "item_id",
                    "tipo_evidencia",
                    "bucket_id",
                    "caminho_storage",
                    "nome_original",
                    "mime_type",
                    "tamanho_bytes",
                    "hash_algoritmo",
                    "hash_sha256",
                    "hash_calculado_em",
                    "total_paginas",
                    "diagnostico",
                    "payload",
                    "ativo",
                    "substitui_evidencia_id",
                    "criado_por",
                    "criado_em",
                ].join(",")
            )
            .eq(
                "item_id",
                itemIdSeguro
            )
            .eq(
                "ativo",
                true
            )
            .order(
                "criado_em",
                {
                    ascending:
                        true,
                }
            );

    if (error) {
        throw criarErroPersistencia(
            "Não foi possível carregar as evidências complementares.",
            error,
            {
                etapa:
                    "database_select",

                itemId:
                    itemIdSeguro,
            }
        );
    }

    const registros =
        Array.isArray(
            data
        )
            ? data
            : [];

    return registros.map(
        (registro) => ({
            id:
                textoSeguro(
                    registro?.id
                ),

            itemId:
                textoSeguro(
                    registro?.item_id
                ),

            tipoEvidencia:
                textoSeguro(
                    registro?.tipo_evidencia
                ).toUpperCase(),

            bucketId:
                textoSeguro(
                    registro?.bucket_id
                ),

            caminhoStorage:
                textoSeguro(
                    registro?.caminho_storage
                ),

            nomeOriginal:
                textoSeguro(
                    registro?.nome_original
                ),

            mimeType:
                textoSeguro(
                    registro?.mime_type
                ),

            tamanhoBytes:
                numeroSeguro(
                    registro?.tamanho_bytes
                ),

            hashAlgoritmo:
                textoSeguro(
                    registro?.hash_algoritmo
                ),

            hashSha256:
                textoSeguro(
                    registro?.hash_sha256
                ).toLowerCase(),

            hashCalculadoEm:
                textoSeguro(
                    registro?.hash_calculado_em
                ),

            totalPaginas:
                Math.trunc(
                    numeroSeguro(
                        registro?.total_paginas
                    )
                ),

            diagnostico:
                clonarJsonSeguro(
                    registro?.diagnostico ||
                    {}
                ),

            payload:
                clonarJsonSeguro(
                    registro?.payload ||
                    {}
                ),

            ativo:
                registro?.ativo ===
                true,

            substituiEvidenciaId:
                textoSeguro(
                    registro
                        ?.substitui_evidencia_id
                ),

            criadoPor:
                textoSeguro(
                    registro?.criado_por
                ),

            criadoEm:
                textoSeguro(
                    registro?.criado_em
                ),
        })
    );
}

export async function criarUrlAssinadaEvidenciaCertidaoMensal({
    caminhoStorage,
    duracaoSegundos = 900,
    clienteSupabase,
} = {}) {
    const caminho =
        textoSeguro(
            caminhoStorage
        );

    if (!caminho) {
        throw new Error(
            "O caminho da evidência não foi informado."
        );
    }

    const cliente =
        await obterClienteEvidenciasConsulta(
            clienteSupabase
        );

    const duracao =
        Math.min(
            3600,
            Math.max(
                60,
                Math.trunc(
                    numeroSeguro(
                        duracaoSegundos
                    ) || 900
                )
            )
        );

    const {
        data,
        error,
    } =
        await cliente
            .storage
            .from(
                CERTIDAO_MENSAL_BUCKET_DOCUMENTOS
            )
            .createSignedUrl(
                caminho,
                duracao
            );

    if (error) {
        throw criarErroPersistencia(
            "Não foi possível gerar o acesso temporário à evidência.",
            error,
            {
                etapa:
                    "signed_url",

                caminhoStorage:
                    caminho,
            }
        );
    }

    const url =
        textoSeguro(
            data?.signedUrl ||
            data?.signedURL
        );

    if (!url) {
        throw new Error(
            "O Supabase não retornou a URL assinada da evidência."
        );
    }

    return url;
}
