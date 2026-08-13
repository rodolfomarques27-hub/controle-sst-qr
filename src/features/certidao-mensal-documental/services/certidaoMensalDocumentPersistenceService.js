import {
    resolverDocumentoNaCompetencia,
} from "../domain/certidaoMensalRegraCompetencia.js";

export const CERTIDAO_MENSAL_BUCKET_DOCUMENTOS =
    "certidao-mensal-documentos";

export const CERTIDAO_MENSAL_RPC_SALVAR_DOCUMENTO =
    "salvar_certidao_mensal_documento";

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

const PADRAO_TIPO_DOCUMENTO =
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const PADRAO_HASH_SHA256 =
    /^[a-f0-9]{64}$/;

const STATUS_ITEM_PERMITIDOS =
    new Set([
        "PENDENTE",
        "ENVIADO",
        "EM_ANALISE",
        "CONFORME",
        "NAO_CONFORME",
        "REENVIO_SOLICITADO",
        "VENCIDO",
        "DISPENSADO",
    ]);

const STATUS_CONSULTA_PERMITIDOS =
    new Set([
        "NAO_APLICAVEL",
        "PENDENTE",
        "CONFIRMADA",
        "DIVERGENTE",
    ]);

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
                valor
            )
        );
    }
    catch {
        throw new Error(
            "O payload documental não pode ser serializado."
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
            "Cliente Supabase inválido para persistência documental."
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

function validarArquivoPdf(
    arquivo,
    payload
) {
    if (
        !arquivo ||
        typeof arquivo !==
            "object"
    ) {
        throw new Error(
            "O arquivo PDF não foi informado."
        );
    }

    const tamanhoArquivo =
        numeroSeguro(
            arquivo.size
        );

    if (
        tamanhoArquivo <= 0 ||
        tamanhoArquivo >
            LIMITE_PDF_BYTES
    ) {
        throw new Error(
            "O tamanho do PDF é inválido para persistência."
        );
    }

    const tamanhoPayload =
        numeroSeguro(
            payload?.arquivo
                ?.tamanhoBytes
        );

    if (
        tamanhoPayload !==
        tamanhoArquivo
    ) {
        throw new Error(
            "O tamanho do arquivo não corresponde ao payload analisado."
        );
    }

    const mimeArquivo =
        textoSeguro(
            arquivo.type
        ).toLowerCase();

    const mimePayload =
        textoSeguro(
            payload?.arquivo
                ?.mimeType
        ).toLowerCase();

    const mimesPermitidos =
        new Set([
            "",
            MIME_PDF,
            MIME_BINARIO_GENERICO,
        ]);

    if (
        !mimesPermitidos.has(
            mimeArquivo
        ) ||
        !mimesPermitidos.has(
            mimePayload
        )
    ) {
        throw new Error(
            "O arquivo informado não possui MIME compatível com PDF."
        );
    }
}

function validarPayloadDocumento(
    payload
) {
    if (
        !payload ||
        typeof payload !==
            "object"
    ) {
        throw new Error(
            "O payload documental não foi informado."
        );
    }

    const empresaId =
        textoSeguro(
            payload?.empresa?.id
        );

    if (
        !PADRAO_UUID.test(
            empresaId
        )
    ) {
        throw new Error(
            "O identificador da empresa não é um UUID válido."
        );
    }

    const competencia =
        textoSeguro(
            payload.competencia
        );

    if (
        !PADRAO_COMPETENCIA.test(
            competencia
        )
    ) {
        throw new Error(
            "A competência deve estar no formato YYYY-MM-01."
        );
    }

    const tipoDocumento =
        textoSeguro(
            payload?.item
                ?.tipoDocumento
        );

    if (
        !PADRAO_TIPO_DOCUMENTO.test(
            tipoDocumento
        )
    ) {
        throw new Error(
            "O tipo documental do payload é inválido."
        );
    }

    const titulo =
        textoSeguro(
            payload?.item?.titulo
        );

    if (!titulo) {
        throw new Error(
            "O título documental não foi informado."
        );
    }

    const statusItem =
        textoSeguro(
            payload?.item
                ?.statusInicial
        );

    if (
        !STATUS_ITEM_PERMITIDOS.has(
            statusItem
        )
    ) {
        throw new Error(
            "O status inicial do documento é inválido."
        );
    }

    const statusConsulta =
        textoSeguro(
            payload
                ?.consultaOficial
                ?.status
        );

    if (
        !STATUS_CONSULTA_PERMITIDOS.has(
            statusConsulta
        )
    ) {
        throw new Error(
            "O status da consulta oficial é inválido."
        );
    }

    const nomeOriginal =
        textoSeguro(
            payload?.arquivo
                ?.nomeOriginal
        );

    if (!nomeOriginal) {
        throw new Error(
            "O nome original do PDF não foi informado."
        );
    }

    const hashSha256 =
        textoSeguro(
            payload?.arquivo
                ?.hashSha256
        ).toLowerCase();

    if (
        !PADRAO_HASH_SHA256.test(
            hashSha256
        )
    ) {
        throw new Error(
            "O hash SHA-256 do PDF é inválido."
        );
    }

    const contratoVersao =
        Math.trunc(
            numeroSeguro(
                payload.contratoVersao
            )
        );

    if (contratoVersao <= 0) {
        throw new Error(
            "A versão do contrato documental é inválida."
        );
    }

    return {
        empresaId,
        competencia,
        tipoDocumento,
        titulo,
        statusItem,
        statusConsulta,
        nomeOriginal,
        hashSha256,
        contratoVersao,
    };
}

function normalizarNomeArquivo(
    nomeOriginal
) {
    const nomeSemExtensao =
        textoSeguro(
            nomeOriginal
        )
            .replace(
                /\.pdf$/i,
                ""
            )
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
                /^[-_.]+|[-_.]+$/g,
                ""
            )
            .slice(
                0,
                100
            );

    return `${
        nomeSemExtensao ||
        "documento"
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
            .slice(2, 14)
    );
}

export function criarCaminhoStorageCertidaoMensal({
    payload,
} = {}) {
    const dados =
        validarPayloadDocumento(
            payload
        );

    const competenciaPasta =
        dados.competencia.slice(
            0,
            7
        );

    const nomeSeguro =
        normalizarNomeArquivo(
            dados.nomeOriginal
        );

    const identificador =
        criarIdentificadorArquivo();

    return [
        dados.empresaId,
        competenciaPasta,
        dados.tipoDocumento,
        `${identificador}-${nomeSeguro}`,
    ].join("/");
}

function criarParametrosRpc({
    payload,
    caminhoStorage,
} = {}) {
    const dados =
        validarPayloadDocumento(
            payload
        );

    const totalPaginasNumero =
        Math.trunc(
            numeroSeguro(
                payload
                    ?.diagnostico
                    ?.leitura
                    ?.totalPaginas
            )
        );

    const hashCalculadoEm =
        textoSeguro(
            payload?.arquivo
                ?.calculadoEm
        ) || null;

    return {
        p_empresa_id:
            dados.empresaId,

        p_competencia:
            dados.competencia,

        p_tipo_documento:
            dados.tipoDocumento,

        p_titulo:
            dados.titulo,

        p_caminho_storage:
            caminhoStorage,

        p_nome_original:
            dados.nomeOriginal,

        p_mime_type:
            MIME_PDF,

        p_tamanho_bytes:
            numeroSeguro(
                payload
                    ?.arquivo
                    ?.tamanhoBytes
            ),

        p_hash_sha256:
            dados.hashSha256,

        p_diagnostico:
            clonarJsonSeguro(
                payload.diagnostico ||
                {}
            ),

        p_payload:
            clonarJsonSeguro(
                payload
            ),

        p_requer_consulta_oficial:
            Boolean(
                payload
                    ?.consultaOficial
                    ?.requerida
            ),

        p_status_consulta_oficial:
            dados.statusConsulta,

        p_status_item:
            dados.statusItem,

        p_total_paginas:
            totalPaginasNumero > 0
                ? totalPaginasNumero
                : null,

        p_hash_calculado_em:
            hashCalculadoEm,

        p_contrato_versao:
            dados.contratoVersao,
    };
}

export function criarCertidaoMensalDocumentPersistenceService({
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

    async function salvarPdfCertidaoMensal({
        arquivo,
        payload,
    } = {}) {
        validarArquivoPdf(
            arquivo,
            payload
        );

        validarPayloadDocumento(
            payload
        );

        const caminhoStorage =
            criarCaminhoStorageCertidaoMensal({
                payload,
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
                "Não foi possível enviar o PDF ao armazenamento.",
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
                payload,
                caminhoStorage,
            });

        let respostaRpc;

        try {
            respostaRpc =
                await cliente.rpc(
                    CERTIDAO_MENSAL_RPC_SALVAR_DOCUMENTO,
                    parametrosRpc
                );
        }
        catch (error) {
            respostaRpc = {
                data: null,
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
                    ? "O banco rejeitou o registro e o rollback do arquivo também falhou."
                    : "O banco rejeitou o registro. O arquivo enviado foi removido automaticamente.";

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
                        rollbackError || null,
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

            payload:
                clonarJsonSeguro(
                    payload
                ),
        };
    }

    async function buscarDocumentoAtual({
        empresaId,
        competencia,
        tipoDocumento,
    } = {}) {
        const empresaIdSeguro =
            textoSeguro(
                empresaId
            );

        if (
            !PADRAO_UUID.test(
                empresaIdSeguro
            )
        ) {
            throw new Error(
                "A empresa da consulta documental é inválida."
            );
        }

        const competenciaRecebida =
            textoSeguro(
                competencia
            );

        let competenciaNormalizada =
            competenciaRecebida;

        if (
            !PADRAO_COMPETENCIA.test(
                competenciaNormalizada
            )
        ) {
            const correspondencia =
                /^(0[1-9]|1[0-2])\/(\d{4})$/
                    .exec(
                        competenciaRecebida
                    );

            competenciaNormalizada =
                correspondencia
                    ? (
                        correspondencia[2] +
                        "-" +
                        correspondencia[1] +
                        "-01"
                    )
                    : "";
        }

        if (
            !PADRAO_COMPETENCIA.test(
                competenciaNormalizada
            )
        ) {
            throw new Error(
                "A competência da consulta documental é inválida."
            );
        }

        const tipoDocumentoSeguro =
            textoSeguro(
                tipoDocumento
            ).toLowerCase();

        if (
            !PADRAO_TIPO_DOCUMENTO.test(
                tipoDocumentoSeguro
            )
        ) {
            throw new Error(
                "O tipo documental da consulta é inválido."
            );
        }

        if (
            typeof cliente.from !==
            "function"
        ) {
            throw new Error(
                "O cliente Supabase não oferece leitura de tabelas."
            );
        }

        const anoAlvo =
            Number(
                competenciaNormalizada
                    .slice(
                        0,
                        4
                    )
            );

        const inicioJanela =
            `${
                anoAlvo - 1
            }-01-01`;

        const fimJanela =
            `${
                anoAlvo + 2
            }-01-01`;

        let respostaCompetencias;

        try {
            respostaCompetencias =
                await cliente
                    .from(
                        "certidao_mensal_competencias"
                    )
                    .select(
                        [
                            "id",
                            "empresa_id",
                            "competencia",
                            "status",
                            "atualizado_em",
                        ].join(",")
                    )
                    .eq(
                        "empresa_id",
                        empresaIdSeguro
                    )
                    .gte(
                        "competencia",
                        inicioJanela
                    )
                    .lt(
                        "competencia",
                        fimJanela
                    )
                    .order(
                        "competencia",
                        {
                            ascending:
                                true,
                        }
                    );
        }
        catch (error) {
            throw criarErroPersistencia(
                "Não foi possível consultar as competências documentais.",
                error,
                {
                    etapa:
                        "database_select_competencias_aplicaveis",
                }
            );
        }

        if (
            respostaCompetencias
                ?.error
        ) {
            throw criarErroPersistencia(
                "Não foi possível consultar as competências documentais.",
                respostaCompetencias.error,
                {
                    etapa:
                        "database_select_competencias_aplicaveis",
                }
            );
        }

        const competencias =
            Array.isArray(
                respostaCompetencias
                    ?.data
            )
                ? respostaCompetencias.data
                : [];

        if (!competencias.length) {
            return null;
        }

        const competenciaAlvo =
            competencias.find(
                (registro) =>
                    textoSeguro(
                        registro
                            ?.competencia
                    ) ===
                    competenciaNormalizada
            ) ||
            null;

        const competenciaIds =
            competencias
                .map(
                    (registro) =>
                        textoSeguro(
                            registro?.id
                        )
                )
                .filter(Boolean);

        if (!competenciaIds.length) {
            return null;
        }

        let respostaItens;

        try {
            respostaItens =
                await cliente
                    .from(
                        "certidao_mensal_itens"
                    )
                    .select(
                        [
                            "id",
                            "competencia_id",
                            "tipo_documento",
                            "titulo",
                            "origem",
                            "status",
                            "requer_consulta_oficial",
                            "status_consulta_oficial",
                            "versao_atual_id",
                            "atualizado_em",
                        ].join(",")
                    )
                    .in(
                        "competencia_id",
                        competenciaIds
                    )
                    .eq(
                        "tipo_documento",
                        tipoDocumentoSeguro
                    );
        }
        catch (error) {
            throw criarErroPersistencia(
                "Não foi possível consultar os itens documentais.",
                error,
                {
                    etapa:
                        "database_select_itens_aplicaveis",
                }
            );
        }

        if (respostaItens?.error) {
            throw criarErroPersistencia(
                "Não foi possível consultar os itens documentais.",
                respostaItens.error,
                {
                    etapa:
                        "database_select_itens_aplicaveis",
                }
            );
        }

        const itens =
            Array.isArray(
                respostaItens?.data
            )
                ? respostaItens.data
                : [];

        const itemAlvo =
            competenciaAlvo
                ? (
                    itens.find(
                        (item) =>
                            textoSeguro(
                                item
                                    ?.competencia_id
                            ) ===
                            textoSeguro(
                                competenciaAlvo
                                    ?.id
                            )
                    ) ||
                    null
                )
                : null;

        const versaoIds =
            [
                ...new Set(
                    itens
                        .map(
                            (item) =>
                                textoSeguro(
                                    item
                                        ?.versao_atual_id
                                )
                        )
                        .filter(Boolean)
                ),
            ];

        if (!versaoIds.length) {
            return null;
        }

        let respostaVersoes;

        try {
            respostaVersoes =
                await cliente
                    .from(
                        "certidao_mensal_versoes"
                    )
                    .select(
                        [
                            "id",
                            "item_id",
                            "numero_versao",
                            "bucket_id",
                            "caminho_storage",
                            "nome_original",
                            "mime_type",
                            "tamanho_bytes",
                            "hash_algoritmo",
                            "hash_sha256",
                            "hash_calculado_em",
                            "total_paginas",
                            "status_resultado",
                            "diagnostico",
                            "payload",
                            "criado_por",
                            "criado_em",
                        ].join(",")
                    )
                    .in(
                        "id",
                        versaoIds
                    );
        }
        catch (error) {
            throw criarErroPersistencia(
                "Não foi possível consultar as versões documentais aplicáveis.",
                error,
                {
                    etapa:
                        "database_select_versoes_aplicaveis",
                }
            );
        }

        if (respostaVersoes?.error) {
            throw criarErroPersistencia(
                "Não foi possível consultar as versões documentais aplicáveis.",
                respostaVersoes.error,
                {
                    etapa:
                        "database_select_versoes_aplicaveis",
                }
            );
        }

        const versoesBanco =
            Array.isArray(
                respostaVersoes?.data
            )
                ? respostaVersoes.data
                : [];

        const competenciasPorId =
            new Map(
                competencias.map(
                    (registro) => [
                        textoSeguro(
                            registro?.id
                        ),
                        registro,
                    ]
                )
            );

        const versoesPorId =
            new Map(
                versoesBanco.map(
                    (versao) => [
                        textoSeguro(
                            versao?.id
                        ),
                        versao,
                    ]
                )
            );

        const normalizarDataTemporal =
            (valor) => {
                const texto =
                    textoSeguro(
                        valor
                    ).slice(
                        0,
                        10
                    );

                if (
                    /^\d{4}-\d{2}-\d{2}$/
                        .test(
                            texto
                        )
                ) {
                    return texto;
                }

                const br =
                    /^(\d{2})\/(\d{2})\/(\d{4})$/
                        .exec(
                            texto
                        );

                return br
                    ? (
                        br[3] +
                        "-" +
                        br[2] +
                        "-" +
                        br[1]
                    )
                    : "";
            };

        const candidatos =
            itens
                .map(
                    (item) => {
                        const versao =
                            versoesPorId.get(
                                textoSeguro(
                                    item
                                        ?.versao_atual_id
                                )
                            );

                        const competenciaOrigem =
                            competenciasPorId.get(
                                textoSeguro(
                                    item
                                        ?.competencia_id
                                )
                            );

                        if (
                            !versao ||
                            !competenciaOrigem
                        ) {
                            return null;
                        }

                        const diagnostico =
                            (
                                versao
                                    ?.diagnostico &&
                                typeof versao
                                    .diagnostico ===
                                    "object"
                            )
                                ? versao.diagnostico
                                : (
                                    versao
                                        ?.payload
                                        ?.diagnostico ||
                                    {}
                                );

                        const dadosTemporais =
                            diagnostico
                                ?.avaliacao
                                ?.dadosTemporais ||
                            {};

                        return {
                            ...versao,

                            tipoDocumento:
                                tipoDocumentoSeguro,

                            competencia:
                                textoSeguro(
                                    competenciaOrigem
                                        ?.competencia
                                ),

                            status:
                                textoSeguro(
                                    item?.status ||
                                    versao
                                        ?.status_resultado
                                ).toUpperCase(),

                            dataEmissaoIso:
                                normalizarDataTemporal(
                                    dadosTemporais
                                        ?.dataEmissaoIso ||
                                    dadosTemporais
                                        ?.dataEmissao
                                ),

                            dataValidadeIso:
                                normalizarDataTemporal(
                                    dadosTemporais
                                        ?.dataValidadeIso ||
                                    dadosTemporais
                                        ?.dataValidade
                                ),

                            __competenciaOrigem:
                                competenciaOrigem,

                            __itemOrigem:
                                item,
                        };
                    }
                )
                .filter(Boolean);

        if (!candidatos.length) {
            return null;
        }

        /*
         * Competência fechada é fotografia histórica.
         * Não se aplica herança posterior silenciosamente.
         */
        if (
            String(
                competenciaAlvo
                    ?.status ||
                ""
            ).toUpperCase() ===
            "FECHADA"
        ) {
            if (
                !itemAlvo ||
                !textoSeguro(
                    itemAlvo
                        ?.versao_atual_id
                )
            ) {
                return null;
            }

            const candidataFechada =
                candidatos.find(
                    (candidata) =>
                        textoSeguro(
                            candidata?.id
                        ) ===
                        textoSeguro(
                            itemAlvo
                                ?.versao_atual_id
                        )
                );

            if (!candidataFechada) {
                return null;
            }

            const versaoVisual = {
                ...candidataFechada,
                status_resultado:
                    textoSeguro(
                        itemAlvo?.status ||
                        candidataFechada
                            ?.status_resultado
                    ).toUpperCase(),
            };

            return {
                competencia:
                    clonarJsonSeguro(
                        competenciaAlvo
                    ),

                competenciaOrigem:
                    clonarJsonSeguro(
                        competenciaAlvo
                    ),

                item:
                    clonarJsonSeguro(
                        itemAlvo
                    ),

                itemOrigem:
                    clonarJsonSeguro(
                        itemAlvo
                    ),

                versao:
                    clonarJsonSeguro(
                        versaoVisual
                    ),

                bucketId:
                    textoSeguro(
                        candidataFechada
                            ?.bucket_id
                    ),

                caminhoStorage:
                    textoSeguro(
                        candidataFechada
                            ?.caminho_storage
                    ),

                herdado:
                    false,

                resolucaoCompetencia: {
                    status:
                        textoSeguro(
                            itemAlvo?.status
                        ).toUpperCase(),

                    origemResolucao:
                        "HISTORICO_FECHADO",

                    herdado:
                        false,

                    motivo:
                        "COMPETENCIA_FECHADA_PRESERVADA",
                },
            };
        }

        /*
         * Competências fechadas já foram tratadas acima.
         *
         * Para competência aberta, a escolha documental
         * deve ser feita exclusivamente pelo resolvedor
         * central. Isso preserva documentos mensais na
         * própria competência e permite que documentos
         * de VALIDADE usem a certidão válida mais recente.
         */
        const resolucao =
            resolverDocumentoNaCompetencia({
                tipoDocumento:
                    tipoDocumentoSeguro,

                competencia:
                    competenciaNormalizada,

                versoes:
                    candidatos,

                itemPersistido:
                    itemAlvo,

                competenciaFechada:
                    false,
            });

        if (!resolucao?.versao) {
            return null;
        }

        const idVersaoEscolhida =
            textoSeguro(
                resolucao
                    ?.versao
                    ?.id
            );

        const candidataEscolhida =
            candidatos.find(
                (candidata) =>
                    textoSeguro(
                        candidata?.id
                    ) ===
                    idVersaoEscolhida
            ) ||
            resolucao.versao;

        const competenciaOrigem =
            candidataEscolhida
                ?.__competenciaOrigem ||
            competenciasPorId.get(
                textoSeguro(
                    candidataEscolhida
                        ?.__itemOrigem
                        ?.competencia_id
                )
            ) ||
            null;

        const itemOrigem =
            candidataEscolhida
                ?.__itemOrigem ||
            itens.find(
                (item) =>
                    textoSeguro(
                        item
                            ?.versao_atual_id
                    ) ===
                    idVersaoEscolhida
            ) ||
            null;

        if (
            !competenciaOrigem ||
            !itemOrigem
        ) {
            return null;
        }

        const herdado =
            textoSeguro(
                competenciaOrigem
                    ?.competencia
            ) !==
            competenciaNormalizada;

        /*
         * Item visual herdado não recebe o ID real da competência
         * de origem. Assim a interface não consegue alterar
         * acidentalmente um registro histórico de outro mês.
         */
        const itemVisual =
            herdado
                ? {
                    ...itemOrigem,

                    id:
                        "",

                    competencia_id:
                        textoSeguro(
                            competenciaAlvo
                                ?.id
                        ),

                    status:
                        textoSeguro(
                            resolucao
                                ?.status
                        ).toUpperCase(),

                    versao_atual_id:
                        idVersaoEscolhida,
                }
                : itemOrigem;

        const versaoVisual = {
            ...candidataEscolhida,

            status_resultado:
                textoSeguro(
                    resolucao
                        ?.status
                ).toUpperCase(),
        };

        return {
            competencia:
                clonarJsonSeguro(
                    competenciaAlvo || {
                        id:
                            "",
                        empresa_id:
                            empresaIdSeguro,
                        competencia:
                            competenciaNormalizada,
                        status:
                            "ABERTA",
                    }
                ),

            competenciaOrigem:
                clonarJsonSeguro(
                    competenciaOrigem
                ),

            item:
                clonarJsonSeguro(
                    itemVisual
                ),

            itemOrigem:
                clonarJsonSeguro(
                    itemOrigem
                ),

            versao:
                clonarJsonSeguro(
                    versaoVisual
                ),

            bucketId:
                textoSeguro(
                    candidataEscolhida
                        ?.bucket_id
                ),

            caminhoStorage:
                textoSeguro(
                    candidataEscolhida
                        ?.caminho_storage
                ),

            herdado,

            resolucaoCompetencia: {
                status:
                    textoSeguro(
                        resolucao
                            ?.status
                    ).toUpperCase(),

                origemResolucao:
                    textoSeguro(
                        resolucao
                            ?.origemResolucao
                    ),

                herdado:
                    Boolean(
                        resolucao
                            ?.herdado
                    ),

                motivo:
                    textoSeguro(
                        resolucao
                            ?.motivo
                    ),

                competenciaOrigem:
                    textoSeguro(
                        competenciaOrigem
                            ?.competencia
                    ),
            },
        };
    }

    async function criarUrlAssinadaPdf({
        caminhoStorage,
        duracaoSegundos = 600,
    } = {}) {
        const caminho =
            textoSeguro(
                caminhoStorage
            );

        if (!caminho) {
            throw new Error(
                "O caminho do PDF não foi informado."
            );
        }

        const duracao =
            Math.min(
                3600,
                Math.max(
                    60,
                    Math.trunc(
                        numeroSeguro(
                            duracaoSegundos
                        ) || 600
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
                "Não foi possível gerar o acesso temporário ao PDF.",
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
                "O Supabase não retornou a URL assinada do PDF."
            );
        }

        return url;
    }

    return Object.freeze({
        salvarPdfCertidaoMensal,
        buscarDocumentoAtual,
        criarUrlAssinadaPdf,
    });
}

async function criarServicoPadrao() {
    const clienteSupabase =
        await obterClienteSupabasePadrao();

    return criarCertidaoMensalDocumentPersistenceService({
        clienteSupabase,
    });
}

export async function salvarPdfCertidaoMensal(
    parametros
) {
    const servico =
        await criarServicoPadrao();

    return servico
        .salvarPdfCertidaoMensal(
            parametros
        );
}

export async function buscarDocumentoAtualCertidaoMensal(
    parametros
) {
    const servico =
        await criarServicoPadrao();

    return servico
        .buscarDocumentoAtual(
            parametros
        );
}

export async function criarUrlAssinadaPdfCertidaoMensal(
    parametros
) {
    const servico =
        await criarServicoPadrao();

    return servico
        .criarUrlAssinadaPdf(
            parametros
        );
}
