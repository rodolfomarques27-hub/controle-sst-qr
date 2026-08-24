import {
    CERTIDAO_MENSAL_ORIGEM_ITEM,
    CERTIDAO_MENSAL_STATUS_CONSULTA_OFICIAL,
    CERTIDAO_MENSAL_STATUS_ITEM,
    CERTIDAO_MENSAL_VERSAO_CONTRATO,
} from "../domain/certidaoMensalPersistenceContract.js";

// ============================================================
// SAFE_SCAN_UPLOAD_MASSA_PERSISTENCIA_PLANO_V1
//
// Adaptador PURO.
//
// Responsabilidade:
// transformar somente documentos principais já resolvidos pelo
// lote em um PLANO de persistência.
//
// Este módulo NÃO:
// - acessa Supabase;
// - acessa Storage;
// - chama RPC;
// - reclassifica PDF;
// - recalcula empresa;
// - recalcula competência;
// - usa filename/pasta como evidência documental.
// ============================================================

export const CERTIDAO_UPLOAD_MASSA_ACAO_PERSISTENCIA =
    Object.freeze({
        PERSISTIR_NOVO_PRINCIPAL:
            "PERSISTIR_NOVO_PRINCIPAL",

        PERSISTIR_NOVA_VERSAO:
            "PERSISTIR_NOVA_VERSAO",

        MANTER_ATUAL:
            "MANTER_ATUAL",

        AGUARDAR_DECISAO:
            "AGUARDAR_DECISAO",

        AGUARDAR_REVISAO:
            "AGUARDAR_REVISAO",

        IGNORAR_DUPLICADO:
            "IGNORAR_DUPLICADO",

        IGNORAR_COMPLEMENTAR:
            "IGNORAR_COMPLEMENTAR",

        BLOQUEAR_DADOS_INVALIDOS:
            "BLOQUEAR_DADOS_INVALIDOS",
    });

const CODIGO_CONFLITO_LOGICO =
    "CONFLITO_LOGICO_VERSAO";

const DECISAO_MANTER_ATUAL =
    "MANTER_ATUAL";

const DECISAO_NOVA_VERSAO =
    "USAR_NOVO_COMO_NOVA_VERSAO";

const DUPLICIDADES_EXATAS =
    new Set([
        "DUPLICADO_EXATO_LOTE",
        "DUPLICADO_EXATO_HISTORICO",
    ]);

const PADRAO_UUID =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PADRAO_COMPETENCIA =
    /^\d{4}-(0[1-9]|1[0-2])-01$/;

const PADRAO_TIPO_DOCUMENTO =
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const PADRAO_HASH_SHA256 =
    /^[a-f0-9]{64}$/;

function textoSeguro(
    valor = ""
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

function obterConflitoLogico(
    item
) {
    const resolucao =
        item?.resolucao ||
        {};

    return (
        item?.conflitoLogico ||
        resolucao?.conflitoLogico ||
        null
    );
}

function obterDuplicidade(
    item
) {
    return textoSeguro(
        item
            ?.duplicidade
            ?.codigo
    );
}

function ehComplementar(
    item
) {
    const resolucao =
        item?.resolucao ||
        {};

    return Boolean(
        resolucao?.complementar ===
            true ||
        resolucao?.politica ===
            "COMPLEMENTAR"
    );
}

function obterIdentidadePersistivel(
    item
) {
    const resolucao =
        item?.resolucao ||
        {};

    const empresa =
        resolucao?.empresa ||
        {};

    const empresaId =
        textoSeguro(
            empresa?.id
        );

    const competencia =
        textoSeguro(
            resolucao
                ?.destino
                ?.competenciaIso
        );

    /*
     * CRÍTICO:
     *
     * a identidade persistível usa SOMENTE o tipo documental
     * canônico produzido pelo Resolver.
     *
     * tipoClassificador NÃO é fallback aqui.
     */
    const tipoDocumento =
        textoSeguro(
            resolucao?.tipoDocumento
        ).toLowerCase();

    const titulo =
        textoSeguro(
            resolucao?.titulo
        );

    const hashSha256 =
        textoSeguro(
            item
                ?.hash
                ?.sha256
        ).toLowerCase();

    const arquivo =
        item?.arquivo ||
        null;

    const nomeOriginal =
        textoSeguro(
            item
                ?.proveniencia
                ?.nomeOriginal ||
            arquivo?.name
        );

    const tamanhoBytes =
        numeroSeguro(
            arquivo?.size ||
            item
                ?.proveniencia
                ?.tamanhoBytes
        );

    return {
        empresa,
        empresaId,
        competencia,
        tipoDocumento,
        titulo,
        hashSha256,
        arquivo,
        nomeOriginal,
        tamanhoBytes,
    };
}

function validarIdentidadePersistivel(
    identidade
) {
    if (
        !PADRAO_UUID.test(
            identidade?.empresaId ||
            ""
        )
    ) {
        return {
            valido: false,
            codigo:
                "EMPRESA_ID_INVALIDO",
        };
    }

    if (
        !PADRAO_COMPETENCIA.test(
            identidade?.competencia ||
            ""
        )
    ) {
        return {
            valido: false,
            codigo:
                "COMPETENCIA_INVALIDA",
        };
    }

    if (
        !PADRAO_TIPO_DOCUMENTO.test(
            identidade?.tipoDocumento ||
            ""
        )
    ) {
        return {
            valido: false,
            codigo:
                "TIPO_DOCUMENTO_INVALIDO",
        };
    }

    if (
        !textoSeguro(
            identidade?.titulo
        )
    ) {
        return {
            valido: false,
            codigo:
                "TITULO_AUSENTE",
        };
    }

    if (
        !PADRAO_HASH_SHA256.test(
            identidade?.hashSha256 ||
            ""
        )
    ) {
        return {
            valido: false,
            codigo:
                "HASH_SHA256_INVALIDO",
        };
    }

    if (
        !identidade?.arquivo ||
        typeof identidade.arquivo !==
            "object" ||
        identidade.tamanhoBytes <= 0
    ) {
        return {
            valido: false,
            codigo:
                "FILE_ORIGINAL_AUSENTE",
        };
    }

    if (
        !identidade?.nomeOriginal
    ) {
        return {
            valido: false,
            codigo:
                "NOME_ORIGINAL_AUSENTE",
        };
    }

    return {
        valido: true,
        codigo:
            "DADOS_PERSISTIVEIS_VALIDOS",
    };
}

export function avaliarItemPrincipalPersistenciaUploadMassa(
    item
) {
    const resolucao =
        item?.resolucao ||
        {};

    if (
        item?.erro
    ) {
        return {
            elegivel: false,
            acao:
                CERTIDAO_UPLOAD_MASSA_ACAO_PERSISTENCIA
                    .BLOQUEAR_DADOS_INVALIDOS,
            codigo:
                "ITEM_COM_ERRO",
        };
    }

    if (
        ehComplementar(
            item
        )
    ) {
        return {
            elegivel: false,
            acao:
                CERTIDAO_UPLOAD_MASSA_ACAO_PERSISTENCIA
                    .IGNORAR_COMPLEMENTAR,
            codigo:
                "COMPLEMENTAR_FORA_DO_GATE",
        };
    }

    const duplicidade =
        obterDuplicidade(
            item
        );

    if (
        DUPLICIDADES_EXATAS.has(
            duplicidade
        )
    ) {
        return {
            elegivel: false,
            acao:
                CERTIDAO_UPLOAD_MASSA_ACAO_PERSISTENCIA
                    .IGNORAR_DUPLICADO,
            codigo:
                duplicidade,
        };
    }

    if (
        resolucao
            ?.empresa
            ?.status !==
        "IDENTIFICADA"
    ) {
        return {
            elegivel: false,
            acao:
                CERTIDAO_UPLOAD_MASSA_ACAO_PERSISTENCIA
                    .BLOQUEAR_DADOS_INVALIDOS,
            codigo:
                "EMPRESA_NAO_IDENTIFICADA",
        };
    }

    const conflito =
        obterConflitoLogico(
            item
        );

    if (
        conflito?.codigo ===
        CODIGO_CONFLITO_LOGICO
    ) {
        const decisao =
            textoSeguro(
                conflito?.decisao
            );

        if (
            decisao ===
            DECISAO_MANTER_ATUAL
        ) {
            return {
                elegivel: false,
                acao:
                    CERTIDAO_UPLOAD_MASSA_ACAO_PERSISTENCIA
                        .MANTER_ATUAL,
                codigo:
                    "DECISAO_MANTER_ATUAL",
            };
        }

        if (
            decisao !==
            DECISAO_NOVA_VERSAO
        ) {
            return {
                elegivel: false,
                acao:
                    CERTIDAO_UPLOAD_MASSA_ACAO_PERSISTENCIA
                        .AGUARDAR_DECISAO,
                codigo:
                    "CONFLITO_SEM_DECISAO",
            };
        }

        const identidade =
            obterIdentidadePersistivel(
                item
            );

        const validacao =
            validarIdentidadePersistivel(
                identidade
            );

        if (!validacao.valido) {
            return {
                elegivel: false,
                acao:
                    CERTIDAO_UPLOAD_MASSA_ACAO_PERSISTENCIA
                        .BLOQUEAR_DADOS_INVALIDOS,
                codigo:
                    validacao.codigo,
            };
        }

        return {
            elegivel: true,
            acao:
                CERTIDAO_UPLOAD_MASSA_ACAO_PERSISTENCIA
                    .PERSISTIR_NOVA_VERSAO,
            codigo:
                "NOVA_VERSAO_AUTORIZADA",
            identidade,
        };
    }

    if (
        resolucao?.status !==
        "PRONTO"
    ) {
        return {
            elegivel: false,
            acao:
                CERTIDAO_UPLOAD_MASSA_ACAO_PERSISTENCIA
                    .AGUARDAR_REVISAO,
            codigo:
                "DOCUMENTO_AINDA_EM_REVISAO",
        };
    }

    const identidade =
        obterIdentidadePersistivel(
            item
        );

    const validacao =
        validarIdentidadePersistivel(
            identidade
        );

    if (!validacao.valido) {
        return {
            elegivel: false,
            acao:
                CERTIDAO_UPLOAD_MASSA_ACAO_PERSISTENCIA
                    .BLOQUEAR_DADOS_INVALIDOS,
            codigo:
                validacao.codigo,
        };
    }

    return {
        elegivel: true,
        acao:
            CERTIDAO_UPLOAD_MASSA_ACAO_PERSISTENCIA
                .PERSISTIR_NOVO_PRINCIPAL,
        codigo:
            "NOVO_PRINCIPAL_ELEGIVEL",
        identidade,
    };
}

function criarDiagnosticoPersistencia(
    item
) {
    const resolucao =
        item?.resolucao ||
        {};

    const leitura =
        item?.leitura ||
        {};

    return {
        leitura: {
            metodo:
                textoSeguro(
                    leitura?.metodo
                ),

            totalPaginas:
                numeroSeguro(
                    leitura?.totalPaginas
                ),

            paginasLidas:
                numeroSeguro(
                    leitura?.paginasLidas
                ),

            confianca:
                numeroSeguro(
                    leitura?.confianca
                ),
        },

        classificacao: {
            tipoDocumento:
                textoSeguro(
                    resolucao?.tipoDocumento
                ),

            tipoClassificador:
                textoSeguro(
                    resolucao?.tipoClassificador
                ),

            titulo:
                textoSeguro(
                    resolucao?.titulo
                ),

            confianca:
                numeroSeguro(
                    resolucao?.confianca
                ),
        },

        resolucaoLote: {
            status:
                textoSeguro(
                    resolucao?.status
                ),

            politica:
                textoSeguro(
                    resolucao?.politica
                ),

            fonteCompetencia:
                textoSeguro(
                    resolucao
                        ?.destino
                        ?.fonte
                ),

            motivos:
                Array.isArray(
                    resolucao?.motivos
                )
                    ? resolucao.motivos
                    : [],
        },
    };
}

export function criarPayloadPrincipalUploadMassa(
    item
) {
    const avaliacao =
        avaliarItemPrincipalPersistenciaUploadMassa(
            item
        );

    if (!avaliacao.elegivel) {
        const erro =
            new Error(
                (
                    "Item não elegível para persistência principal: " +
                    avaliacao.codigo
                )
            );

        erro.codigo =
            avaliacao.codigo;

        erro.acao =
            avaliacao.acao;

        throw erro;
    }

    const resolucao =
        item?.resolucao ||
        {};

    const identidade =
        avaliacao.identidade;

    const avaliacaoDocumental =
        resolucao?.avaliacao ||
        {};

    const requerConsultaOficial =
        Boolean(
            avaliacaoDocumental
                ?.requerConsultaOficial
        );

    const mimeType =
        textoSeguro(
            identidade
                ?.arquivo
                ?.type ||
            item
                ?.proveniencia
                ?.mimeType
        ) ||
        "application/pdf";

    const conflito =
        obterConflitoLogico(
            item
        );

    return {
        contratoVersao:
            CERTIDAO_MENSAL_VERSAO_CONTRATO,

        competencia:
            identidade.competencia,

        empresa: {
            id:
                identidade.empresaId,

            nome:
                textoSeguro(
                    identidade
                        ?.empresa
                        ?.nome
                ),

            cnpj:
                textoSeguro(
                    identidade
                        ?.empresa
                        ?.cnpjCorrespondente
                ),
        },

        item: {
            /*
             * Sempre tipo CANÔNICO.
             */
            tipoDocumento:
                identidade.tipoDocumento,

            titulo:
                identidade.titulo,

            origem:
                CERTIDAO_MENSAL_ORIGEM_ITEM
                    .UPLOAD,

            statusInicial:
                CERTIDAO_MENSAL_STATUS_ITEM
                    .EM_ANALISE,
        },

        arquivo: {
            nomeOriginal:
                identidade.nomeOriginal,

            mimeType,

            tamanhoBytes:
                identidade.tamanhoBytes,

            hashAlgoritmo:
                "SHA-256",

            hashSha256:
                identidade.hashSha256,

            /*
             * O lote atual não fabrica timestamp de hash.
             * Não inventamos um.
             */
            hashCalculadoEm:
                "",
        },

        diagnostico:
            criarDiagnosticoPersistencia(
                item
            ),

        consultaOficial: {
            requerida:
                requerConsultaOficial,

            status:
                requerConsultaOficial
                    ? CERTIDAO_MENSAL_STATUS_CONSULTA_OFICIAL
                        .PENDENTE
                    : CERTIDAO_MENSAL_STATUS_CONSULTA_OFICIAL
                        .NAO_APLICAVEL,
        },

        uploadMassa: {
            origem:
                "UPLOAD_MASSA",

            decisaoConflito:
                textoSeguro(
                    conflito?.decisao
                ),

            persistenciaExecutada:
                false,
        },
    };
}

// ============================================================
// SAFE_SCAN_UPLOAD_MASSA_EXECUTOR_INJETAVEL_V1
//
// Não conhece Supabase, Storage nem RPC.
// Só chama uma função explicitamente injetada quando o gate
// também está explicitamente habilitado.
// ============================================================

/*
 * ============================================================
 * SAFE_SCAN_UPLOAD_MASSA_PROPAGACAO_AMBIGUIDADE_V1
 *
 * Transporta os metadados de segurança produzidos pela
 * Persistence pelas camadas do upload em massa.
 *
 * Não executa I/O, retry, cleanup nem auditoria remota.
 * ============================================================
 */
function obterMetadadosFalhaPersistenciaUploadMassa(
    origem = null
) {
    const estadoPersistencia =
        textoSeguro(
            origem?.estadoPersistencia
        ).toUpperCase();

    const requerAuditoriaRemota =
        origem?.requerAuditoriaRemota ===
        true;

    const tipoAuditoria =
        textoSeguro(
            origem?.tipoAuditoria
        );

    const possuiContratoPersistencia =
        Boolean(
            estadoPersistencia ||
            requerAuditoriaRemota ||
            origem?.ambigua ===
                true ||
            tipoAuditoria
        );

    const codigoPersistencia =
        textoSeguro(
            origem?.codigoPersistencia ||
            (
                possuiContratoPersistencia
                    ? origem?.codigo
                    : ""
            )
        );

    const etapaPersistencia =
        textoSeguro(
            origem?.etapaPersistencia ||
            (
                possuiContratoPersistencia
                    ? origem?.etapa
                    : ""
            )
        );

    const statusHttpBruto =
        origem?.statusHttp;

    const statusHttpNumero =
        Number(
            statusHttpBruto
        );

    const statusHttp =
        statusHttpBruto !==
            null &&
        statusHttpBruto !==
            undefined &&
        statusHttpBruto !==
            "" &&
        Number.isInteger(
            statusHttpNumero
        )
            ? statusHttpNumero
            : null;

    const auditoriaRemota =
        origem?.auditoriaRemota &&
        typeof origem.auditoriaRemota ===
            "object"
            ? origem.auditoriaRemota
            : null;

    const auditoriaExecutada =
        origem?.auditoriaExecutada ===
        true;

    const estadoAuditoriaRemota =
        textoSeguro(
            origem?.estadoAuditoriaRemota ||
            auditoriaRemota?.estado
        ).toUpperCase();

    const codigoAuditoriaRemota =
        textoSeguro(
            origem?.codigoAuditoriaRemota ||
            auditoriaRemota?.codigo
        );

    const pausaObrigatoria =
        estadoPersistencia ===
            "AMBIGUO" ||
        estadoPersistencia ===
            "FALHA_CONFIRMADA_COM_RESIDUO_STORAGE" ||
        requerAuditoriaRemota;

    return {
        codigoPersistencia,
        etapaPersistencia,
        estadoPersistencia,

        ambigua:
            origem?.ambigua ===
            true,

        requerAuditoriaRemota,
        tipoAuditoria,

        rollbackAutomaticoBloqueado:
            origem?.rollbackAutomaticoBloqueado ===
            true,

        rollbackExecutado:
            origem?.rollbackExecutado ===
            true,

        statusHttp,

        caminhoStorage:
            textoSeguro(
                origem?.caminhoStorage
            ),

        auditoriaExecutada,
        estadoAuditoriaRemota,
        codigoAuditoriaRemota,
        auditoriaRemota,

        pausaObrigatoria,
    };
}

/*
 * ============================================================
 * SAFE_SCAN_UPLOAD_MASSA_AUDITORIA_CALLBACK_V1
 *
 * Auditoria posterior à falha.
 * A falha original permanece falha.
 * ============================================================
 */
function normalizarAuditoriaFalhaPersistenciaUploadMassa({
    executada = false,
    retorno = null,
    error = null,
} = {}) {
    if (
        executada !==
        true
    ) {
        return {
            auditoriaExecutada:
                false,

            estadoAuditoriaRemota:
                "",

            codigoAuditoriaRemota:
                "",

            auditoriaRemota:
                null,
        };
    }

    if (error) {
        const auditoriaRemota = {
            versao:
                1,

            auditoriaConcluida:
                false,

            estado:
                "INDETERMINADO",

            codigo:
                "AUDITORIA_CALLBACK_FALHOU",

            motivo:
                "CALLBACK_DE_AUDITORIA_LANCOU_ERRO",

            erro:
                String(
                    error?.message ||
                    error ||
                    "Falha desconhecida."
                ).trim(),
        };

        return {
            auditoriaExecutada:
                true,

            estadoAuditoriaRemota:
                auditoriaRemota.estado,

            codigoAuditoriaRemota:
                auditoriaRemota.codigo,

            auditoriaRemota,
        };
    }

    const valido =
        retorno &&
        typeof retorno ===
            "object" &&
        retorno?.auditoriaConcluida ===
            true &&
        Boolean(
            textoSeguro(
                retorno?.estado
            )
        ) &&
        Boolean(
            textoSeguro(
                retorno?.codigo
            )
        );

    if (!valido) {
        const auditoriaRemota = {
            versao:
                1,

            auditoriaConcluida:
                false,

            estado:
                "INDETERMINADO",

            codigo:
                "AUDITORIA_CALLBACK_RESPOSTA_INVALIDA",

            motivo:
                "CONTRATO_DE_AUDITORIA_INVALIDO",
        };

        return {
            auditoriaExecutada:
                true,

            estadoAuditoriaRemota:
                auditoriaRemota.estado,

            codigoAuditoriaRemota:
                auditoriaRemota.codigo,

            auditoriaRemota,
        };
    }

    return {
        auditoriaExecutada:
            true,

        estadoAuditoriaRemota:
            textoSeguro(
                retorno.estado
            ).toUpperCase(),

        codigoAuditoriaRemota:
            textoSeguro(
                retorno.codigo
            ),

        auditoriaRemota:
            retorno,
    };
}

export async function executarPlanoPersistenciaPrincipalUploadMassa({
    resultado = null,
    executarPersistencia = null,

    /*
     * SAFE_SCAN_UPLOAD_MASSA_PREFLIGHT_BEFORE_EXECUTOR_V1
     *
     * Validador composto injetado.
     *
     * O Plan não conhece Supabase, Storage, RPC ou readers.
     * Gate habilitado sem este validador permanece fail-closed.
     */
    validarPreflightAntesPersistencia =
        null,

    auditarFalhaPersistencia =
        null,

    signal =
        null,

    habilitado = false,

    /*
     * SAFE_SCAN_UPLOAD_MASSA_ALVO_UNICO_V1
     *
     * Mesmo com gate habilitado, nenhuma persistência é executada
     * sem um alvo documental explicitamente informado.
     */
    alvo = null,

    interromperNoErro = true,
} = {}) {
    const plano =
        criarPlanoPersistenciaPrincipalUploadMassa({
            resultado,
        });

    const executorDisponivel =
        typeof executarPersistencia ===
        "function";

    const acoesExecutaveis =
        new Set([
            CERTIDAO_UPLOAD_MASSA_ACAO_PERSISTENCIA
                .PERSISTIR_NOVO_PRINCIPAL,

            CERTIDAO_UPLOAD_MASSA_ACAO_PERSISTENCIA
                .PERSISTIR_NOVA_VERSAO,
        ]);

    if (
        habilitado !== true ||
        !executorDisponivel
    ) {
        return {
            habilitado:
                habilitado === true,

            executorDisponivel,

            executorInvocado:
                false,

            chamadas:
                0,

            interrompidoPorErro:
                false,

            motivo:
                habilitado !== true
                    ? "GATE_DESABILITADO"
                    : "EXECUTOR_AUSENTE",

            alvo:
                null,

            plano,

            resultados:
                [],
        };
    }

    if (
        !alvo ||
        typeof alvo !==
            "object"
    ) {
        return {
            habilitado:
                true,

            executorDisponivel:
                true,

            executorInvocado:
                false,

            chamadas:
                0,

            interrompidoPorErro:
                false,

            motivo:
                "ALVO_OBRIGATORIO",

            alvo:
                null,

            plano,

            resultados:
                [],
        };
    }

    const indiceAlvo =
        Number(
            alvo?.indice
        );

    const hashAlvo =
        textoSeguro(
            alvo?.hashSha256
        ).toLowerCase();

    const acaoAlvo =
        textoSeguro(
            alvo?.acao
        );

    const alvoValido =
        Number.isInteger(
            indiceAlvo
        ) &&
        indiceAlvo >= 0 &&
        PADRAO_HASH_SHA256.test(
            hashAlvo
        ) &&
        acoesExecutaveis.has(
            acaoAlvo
        );

    if (!alvoValido) {
        return {
            habilitado:
                true,

            executorDisponivel:
                true,

            executorInvocado:
                false,

            chamadas:
                0,

            interrompidoPorErro:
                false,

            motivo:
                "ALVO_INVALIDO",

            alvo: {
                indice:
                    Number.isInteger(
                        indiceAlvo
                    )
                        ? indiceAlvo
                        : null,

                hashSha256:
                    hashAlvo,

                acao:
                    acaoAlvo,
            },

            plano,

            resultados:
                [],
        };
    }

    const itemPlano =
        plano.itens.find(
            (item) =>
                item?.indice ===
                indiceAlvo
        ) ||
        null;

    if (!itemPlano) {
        return {
            habilitado:
                true,

            executorDisponivel:
                true,

            executorInvocado:
                false,

            chamadas:
                0,

            interrompidoPorErro:
                false,

            motivo:
                "ALVO_NAO_ENCONTRADO",

            alvo: {
                indice:
                    indiceAlvo,

                hashSha256:
                    hashAlvo,

                acao:
                    acaoAlvo,
            },

            plano,

            resultados:
                [],
        };
    }

    if (
        itemPlano?.acao !==
        acaoAlvo
    ) {
        return {
            habilitado:
                true,

            executorDisponivel:
                true,

            executorInvocado:
                false,

            chamadas:
                0,

            interrompidoPorErro:
                false,

            motivo:
                "ALVO_ACAO_DIVERGENTE",

            alvo: {
                indice:
                    indiceAlvo,

                hashSha256:
                    hashAlvo,

                acao:
                    acaoAlvo,
            },

            plano,

            resultados:
                [],
        };
    }

    if (
        !acoesExecutaveis.has(
            itemPlano?.acao
        ) ||
        !itemPlano?.payload
    ) {
        return {
            habilitado:
                true,

            executorDisponivel:
                true,

            executorInvocado:
                false,

            chamadas:
                0,

            interrompidoPorErro:
                false,

            motivo:
                "ALVO_NAO_ELEGIVEL",

            alvo: {
                indice:
                    indiceAlvo,

                hashSha256:
                    hashAlvo,

                acao:
                    acaoAlvo,
            },

            plano,

            resultados:
                [],
        };
    }

    const hashPayload =
        textoSeguro(
            itemPlano
                ?.payload
                ?.arquivo
                ?.hashSha256
        ).toLowerCase();

    if (
        hashPayload !==
        hashAlvo
    ) {
        return {
            habilitado:
                true,

            executorDisponivel:
                true,

            executorInvocado:
                false,

            chamadas:
                0,

            interrompidoPorErro:
                false,

            motivo:
                "ALVO_HASH_DIVERGENTE",

            alvo: {
                indice:
                    indiceAlvo,

                hashSha256:
                    hashAlvo,

                acao:
                    acaoAlvo,
            },

            plano,

            resultados:
                [],
        };
    }

    const itensOrigem =
        Array.isArray(
            resultado?.itens
        )
            ? resultado.itens
            : [];

    const itemOrigem =
        itensOrigem[
            indiceAlvo
        ] ||
        null;

    const hashOrigem =
        textoSeguro(
            itemOrigem
                ?.hash
                ?.sha256
        ).toLowerCase();

    if (
        hashOrigem !==
        hashAlvo
    ) {
        return {
            habilitado:
                true,

            executorDisponivel:
                true,

            executorInvocado:
                false,

            chamadas:
                0,

            interrompidoPorErro:
                false,

            motivo:
                "ALVO_HASH_ORIGEM_DIVERGENTE",

            alvo: {
                indice:
                    indiceAlvo,

                hashSha256:
                    hashAlvo,

                acao:
                    acaoAlvo,
            },

            plano,

            resultados:
                [],
        };
    }

    const arquivo =
        itemOrigem?.arquivo ||
        null;

    if (
        !arquivo ||
        typeof arquivo !==
            "object"
    ) {
        return {
            habilitado:
                true,

            executorDisponivel:
                true,

            executorInvocado:
                false,

            chamadas:
                0,

            interrompidoPorErro:
                false,

            motivo:
                "FILE_ORIGINAL_AUSENTE",

            alvo: {
                indice:
                    indiceAlvo,

                hashSha256:
                    hashAlvo,

                acao:
                    acaoAlvo,
            },

            plano,

            resultados: [
                {
                    indice:
                        indiceAlvo,

                    acao:
                        acaoAlvo,

                    sucesso:
                        false,

                    codigo:
                        "FILE_ORIGINAL_AUSENTE",

                    retorno:
                        null,

                    erro:
                        "O File original do item não está disponível.",
                },
            ],
        };
    }

    const resultados =
        [];

    const alvoRetorno = {
        indice:
            indiceAlvo,

        hashSha256:
            hashAlvo,

        acao:
            acaoAlvo,
    };

    /*
     * ============================================================
     * SAFE_SCAN_UPLOAD_MASSA_PREFLIGHT_BEFORE_EXECUTOR_V1
     *
     * A partir deste ponto:
     *
     * - alvo local já foi validado;
     * - ação local já foi validada;
     * - SHA do alvo já foi confrontado com o Plan;
     * - File original já existe;
     *
     * A persistência ainda NÃO foi iniciada.
     *
     * O preflight composto deve autorizar explicitamente o write.
     * ============================================================
     */

    if (
        typeof validarPreflightAntesPersistencia !==
        "function"
    ) {
        return {
            habilitado:
                true,

            executorDisponivel:
                true,

            executorInvocado:
                false,

            chamadas:
                0,

            interrompidoPorErro:
                false,

            motivo:
                "PREFLIGHT_COMPOSTO_AUSENTE",

            alvo:
                alvoRetorno,

            plano,

            resultados: [
                {
                    indice:
                        indiceAlvo,

                    acao:
                        acaoAlvo,

                    sucesso:
                        false,

                    codigo:
                        "PREFLIGHT_COMPOSTO_AUSENTE",

                    retorno:
                        null,

                    erro:
                        "O preflight composto obrigatório não foi fornecido.",
                },
            ],
        };
    }

    const hashNovoPreflight =
        textoSeguro(
            itemPlano
                ?.payload
                ?.arquivo
                ?.hashSha256
        ).toLowerCase();

    let resultadoPreflight;

    try {
        resultadoPreflight =
            await validarPreflightAntesPersistencia({
                preflight:
                    itemPlano.preflight ||
                    null,

                hashSha256:
                    hashNovoPreflight,

                signal,
            });
    }
    catch (error) {
        /*
         * Cancelamento não é convertido em falha comum.
         */
        if (
            signal?.aborted ||
            error?.name ===
                "AbortError"
        ) {
            throw error;
        }

        const codigoPreflight =
            textoSeguro(
                error?.codigo
            ) ||
            "PREFLIGHT_COMPOSTO_FALHOU";

        return {
            habilitado:
                true,

            executorDisponivel:
                true,

            executorInvocado:
                false,

            chamadas:
                0,

            interrompidoPorErro:
                false,

            motivo:
                "PREFLIGHT_COMPOSTO_FALHOU",

            alvo:
                alvoRetorno,

            plano,

            resultados: [
                {
                    indice:
                        indiceAlvo,

                    acao:
                        acaoAlvo,

                    sucesso:
                        false,

                    codigo:
                        codigoPreflight,

                    retorno:
                        null,

                    erro:
                        textoSeguro(
                            error?.message
                        ) ||
                        codigoPreflight,
                },
            ],
        };
    }

    if (signal?.aborted) {
        const erroCancelamento =
            new Error(
                "O preflight foi cancelado antes do início da persistência."
            );

        erroCancelamento.name =
            "AbortError";

        erroCancelamento.codigo =
            "PREFLIGHT_COMPOSTO_CANCELADO";

        throw erroCancelamento;
    }

    /*
     * Fail-closed:
     *
     * somente podeExecutar === true permite alcançar
     * executarPersistencia(...).
     */
    if (
        resultadoPreflight
            ?.podeExecutar !==
        true
    ) {
        const codigoPreflight =
            textoSeguro(
                resultadoPreflight
                    ?.codigo
            ) ||
            "PREFLIGHT_COMPOSTO_BLOQUEOU";

        return {
            habilitado:
                true,

            executorDisponivel:
                true,

            executorInvocado:
                false,

            chamadas:
                0,

            interrompidoPorErro:
                false,

            motivo:
                "PREFLIGHT_COMPOSTO_BLOQUEOU",

            alvo:
                alvoRetorno,

            plano,

            resultados: [
                {
                    indice:
                        indiceAlvo,

                    acao:
                        acaoAlvo,

                    sucesso:
                        false,

                    codigo:
                        codigoPreflight,

                    retorno:
                        resultadoPreflight ??
                        null,

                    erro:
                        codigoPreflight,
                },
            ],
        };
    }

    /*
     * Cardinalidade obrigatória:
     *
     * depois de TODAS as provas acima, esta função executa
     * no máximo UM documento por chamada.
     */
    const chamadas =
        1;

    let interrompidoPorErro =
        false;

    try {
        const retorno =
            await executarPersistencia({
                arquivo,

                payload:
                    itemPlano.payload,

                /*
                 * Metadado de controle do Plan.
                 * Não integra o payload documental persistido.
                 */
                preflight:
                    itemPlano.preflight ||
                    null,

                indice:
                    indiceAlvo,

                acao:
                    acaoAlvo,
            });

        resultados.push({
            indice:
                indiceAlvo,

            acao:
                acaoAlvo,

            sucesso:
                true,

            codigo:
                "EXECUTOR_CONCLUIDO",

            retorno:
                retorno ?? null,

            erro:
                "",
        });
    }
    catch (error) {
        const metadadosFalhaBase =
            obterMetadadosFalhaPersistenciaUploadMassa(
                error
            );

        let metadadosAuditoria =
            normalizarAuditoriaFalhaPersistenciaUploadMassa();

        if (
            metadadosFalhaBase
                .pausaObrigatoria ===
                true &&
            typeof auditarFalhaPersistencia ===
                "function"
        ) {
            try {
                const retornoAuditoria =
                    await auditarFalhaPersistencia({
                        erroPersistencia:
                            error,

                        metadadosFalha:
                            metadadosFalhaBase,

                        alvo:
                            alvoRetorno,

                        arquivo,

                        payload:
                            itemPlano.payload,

                        preflight:
                            resultadoPreflight ||
                            null,

                        snapshotSlotAntes:
                            resultadoPreflight
                                ?.resultadoSlot ||
                            null,

                        estadoShaAntes:
                            resultadoPreflight
                                ?.estadoSha ||
                            null,

                        chaveLogica:
                            resultadoPreflight
                                ?.resultadoSlot
                                ?.chaveLogica ||
                            itemPlano
                                ?.preflight
                                ?.chaveLogica ||
                            null,

                        hashSha256:
                            hashNovoPreflight,

                        caminhoStorageTentativa:
                            metadadosFalhaBase
                                .caminhoStorage,

                        tamanhoBytesTentativa:
                            Number.isFinite(
                                Number(
                                    arquivo?.size
                                )
                            )
                                ? Number(
                                    arquivo.size
                                )
                                : null,

                        signal,
                    });

                metadadosAuditoria =
                    normalizarAuditoriaFalhaPersistenciaUploadMassa({
                        executada:
                            true,

                        retorno:
                            retornoAuditoria,
                    });
            }
            catch (errorAuditoria) {
                metadadosAuditoria =
                    normalizarAuditoriaFalhaPersistenciaUploadMassa({
                        executada:
                            true,

                        error:
                            errorAuditoria,
                    });
            }
        }

        const metadadosFalha = {
            ...metadadosFalhaBase,
            ...metadadosAuditoria,
        };

        resultados.push({
            indice:
                indiceAlvo,

            acao:
                acaoAlvo,

            sucesso:
                false,

            codigo:
                "EXECUTOR_FALHOU",

            retorno:
                null,

            erro:
                String(
                    error?.message ||
                    "Executor de persistência falhou."
                ).trim(),

            ...metadadosFalha,
        });

        if (
            metadadosFalha
                .pausaObrigatoria ===
                true ||
            interromperNoErro !==
                false
        ) {
            interrompidoPorErro =
                true;
        }
    }

    return {
        habilitado:
            true,

        executorDisponivel:
            true,

        executorInvocado:
            chamadas ===
            1,

        chamadas,

        interrompidoPorErro,

        motivo:
            "",

        alvo: {
            indice:
                indiceAlvo,

            hashSha256:
                hashAlvo,

            acao:
                acaoAlvo,
        },

        plano,

        resultados,
    };
}

/*
 * ============================================================
 * SAFE_SCAN_UPLOAD_MASSA_FILA_ALVOS_V1
 *
 * Deriva, de forma pura, os alvos executáveis de um plano já
 * classificado.
 *
 * NÃO executa persistência.
 * NÃO consulta banco.
 * NÃO altera o resultado original.
 *
 * Somente entram na fila:
 * - PERSISTIR_NOVO_PRINCIPAL
 * - PERSISTIR_NOVA_VERSAO
 *
 * Cada alvo mantém o contrato já aprovado:
 * { indice, hashSha256, acao }
 * ============================================================
 */
export function criarFilaAlvosPersistenciaPrincipalUploadMassa({
    plano = null,
} = {}) {
    const itensPlano =
        Array.isArray(
            plano?.itens
        )
            ? plano.itens
            : [];

    const acoesExecutaveis =
        new Set([
            CERTIDAO_UPLOAD_MASSA_ACAO_PERSISTENCIA
                .PERSISTIR_NOVO_PRINCIPAL,

            CERTIDAO_UPLOAD_MASSA_ACAO_PERSISTENCIA
                .PERSISTIR_NOVA_VERSAO,
        ]);

    const fila =
        [];

    for (
        const itemPlano of
        itensPlano
    ) {
        const indice =
            itemPlano?.indice;

        const acao =
            String(
                itemPlano?.acao ||
                ""
            ).trim();

        const hashSha256 =
            String(
                itemPlano
                    ?.payload
                    ?.arquivo
                    ?.hashSha256 ||
                ""
            )
                .trim()
                .toLowerCase();

        if (
            !Number.isInteger(
                indice
            ) ||
            indice < 0 ||
            !acoesExecutaveis.has(
                acao
            ) ||
            !/^[0-9a-f]{64}$/.test(
                hashSha256
            )
        ) {
            continue;
        }

        fila.push({
            indice,
            hashSha256,
            acao,
        });
    }

    return fila;
}
/*
 * ============================================================
 * SAFE_SCAN_UPLOAD_MASSA_ORQUESTRADOR_SEQUENCIAL_V1
 *
 * Orquestra uma fila de alvos já validada, SEM conhecer
 * Supabase, Storage, RPC ou detalhes da persistência.
 *
 * A função executarAlvo é injetada.
 *
 * Regras:
 * - execução estritamente sequencial;
 * - resultado individual por alvo;
 * - falha isolada quando interromperNoErro=false;
 * - interrupção explícita quando interromperNoErro=true;
 * - alvo inválido nunca chega ao executor.
 * ============================================================
 */
export async function executarFilaAlvosPersistenciaPrincipalUploadMassa({
    fila = [],
    executarAlvo = null,
    interromperNoErro = false,
} = {}) {
    const alvos =
        Array.isArray(
            fila
        )
            ? fila
            : [];

    if (
        typeof executarAlvo !==
        "function"
    ) {
        return {
            executorDisponivel:
                false,

            totalFila:
                alvos.length,

            tentados:
                0,

            sucessos:
                0,

            falhas:
                0,

            interrompidoPorErro:
                false,

            motivo:
                "EXECUTOR_ALVO_AUSENTE",

            resultados:
                [],
        };
    }

    const acoesExecutaveis =
        new Set([
            CERTIDAO_UPLOAD_MASSA_ACAO_PERSISTENCIA
                .PERSISTIR_NOVO_PRINCIPAL,

            CERTIDAO_UPLOAD_MASSA_ACAO_PERSISTENCIA
                .PERSISTIR_NOVA_VERSAO,
        ]);

    const resultados =
        [];

    let tentados =
        0;

    let sucessos =
        0;

    let falhas =
        0;

    let interrompidoPorErro =
        false;

    for (
        const alvo of
        alvos
    ) {
        const indice =
            alvo?.indice;

        const acao =
            String(
                alvo?.acao ||
                ""
            ).trim();

        const hashSha256 =
            String(
                alvo?.hashSha256 ||
                ""
            )
                .trim()
                .toLowerCase();

        const alvoValido =
            Number.isInteger(
                indice
            ) &&
            indice >= 0 &&
            acoesExecutaveis.has(
                acao
            ) &&
            /^[0-9a-f]{64}$/.test(
                hashSha256
            );

        if (
            !alvoValido
        ) {
            falhas +=
                1;

            resultados.push({
                indice:
                    Number.isInteger(
                        indice
                    )
                        ? indice
                        : null,

                acao,

                hashSha256,

                sucesso:
                    false,

                codigo:
                    "ALVO_INVALIDO",

                retorno:
                    null,

                erro:
                    "Alvo inválido para execução.",
            });

            if (
                interromperNoErro ===
                true
            ) {
                interrompidoPorErro =
                    true;

                break;
            }

            continue;
        }

        tentados +=
            1;

        try {
            const retorno =
                await executarAlvo({
                    indice,
                    hashSha256,
                    acao,
                });

            sucessos +=
                1;

            resultados.push({
                indice,
                acao,
                hashSha256,

                sucesso:
                    true,

                codigo:
                    "ALVO_CONCLUIDO",

                retorno:
                    retorno ?? null,

                erro:
                    "",
            });
        }
        catch (error) {
            falhas +=
                1;

            const metadadosFalha =
                obterMetadadosFalhaPersistenciaUploadMassa(
                    error
                );

            resultados.push({
                indice,
                acao,
                hashSha256,

                sucesso:
                    false,

                codigo:
                    "ALVO_FALHOU",

                retorno:
                    null,

                erro:
                    String(
                        error?.message ||
                        "Executor do alvo falhou."
                    ).trim(),

                ...metadadosFalha,
            });

            if (
                metadadosFalha
                    .pausaObrigatoria ===
                    true ||
                interromperNoErro ===
                    true
            ) {
                interrompidoPorErro =
                    true;

                break;
            }
        }
    }

    const falhaComPausaObrigatoria =
        resultados.find(
            (item) =>
                item?.pausaObrigatoria ===
                true
        ) ||
        null;

    return {
        executorDisponivel:
            true,

        totalFila:
            alvos.length,

        tentados,
        sucessos,
        falhas,
        interrompidoPorErro,

        pausaObrigatoria:
            Boolean(
                falhaComPausaObrigatoria
            ),

        estadoPersistencia:
            textoSeguro(
                falhaComPausaObrigatoria
                    ?.estadoPersistencia
            ),

        requerAuditoriaRemota:
            falhaComPausaObrigatoria
                ?.requerAuditoriaRemota ===
            true,

        tipoAuditoria:
            textoSeguro(
                falhaComPausaObrigatoria
                    ?.tipoAuditoria
            ),

        auditoriaExecutada:
            falhaComPausaObrigatoria
                ?.auditoriaExecutada ===
            true,

        estadoAuditoriaRemota:
            textoSeguro(
                falhaComPausaObrigatoria
                    ?.estadoAuditoriaRemota
            ),

        codigoAuditoriaRemota:
            textoSeguro(
                falhaComPausaObrigatoria
                    ?.codigoAuditoriaRemota
            ),

        auditoriaRemota:
            falhaComPausaObrigatoria
                ?.auditoriaRemota ||
            null,

        motivo:
            falhaComPausaObrigatoria
                ? "AUDITORIA_REMOTA_OBRIGATORIA"
                : "",

        resultados,
    };
}
/*
 * ============================================================
 * SAFE_SCAN_UPLOAD_MASSA_ADAPTER_EXECUTOR_UNITARIO_V1
 *
 * Traduz o retorno estruturado do executor unitário para o
 * contrato sucesso/erro esperado pelo orquestrador sequencial.
 *
 * Nenhuma persistência é conhecida ou executada diretamente.
 * ============================================================
 */
export async function executarAlvoViaExecutorUnitarioUploadMassa({
    resultado = null,
    alvo = null,
    executarPersistencia = null,

    validarPreflightAntesPersistencia =
        null,

    auditarFalhaPersistencia =
        null,

    signal =
        null,

    habilitado = false,

    executarUnitario =
        executarPlanoPersistenciaPrincipalUploadMassa,
} = {}) {
    if (
        typeof executarUnitario !==
        "function"
    ) {
        throw new Error(
            "EXECUTOR_UNITARIO_AUSENTE"
        );
    }

    const saida =
        await executarUnitario({
            resultado,
            executarPersistencia,

            validarPreflightAntesPersistencia,

            auditarFalhaPersistencia,

            signal,

            habilitado,
            alvo,
            interromperNoErro:
                true,
        });

    const resultados =
        Array.isArray(
            saida?.resultados
        )
            ? saida.resultados
            : [];

    const primeiro =
        resultados[0] ||
        null;

    const sucessoConfirmado =
        saida?.chamadas ===
            1 &&
        primeiro?.sucesso ===
            true;

    if (
        !sucessoConfirmado
    ) {
        const mensagem =
            String(
                primeiro?.erro ||
                primeiro?.codigo ||
                saida?.motivo ||
                "EXECUCAO_UNITARIA_NAO_CONFIRMADA"
            ).trim();

        const erroExecucao =
            new Error(
                mensagem
            );

        erroExecucao.codigo =
            textoSeguro(
                primeiro?.codigo
            ) ||
            "EXECUCAO_UNITARIA_NAO_CONFIRMADA";

        Object.assign(
            erroExecucao,
            obterMetadadosFalhaPersistenciaUploadMassa(
                primeiro
            )
        );

        throw erroExecucao;
    }

    return {
        alvo:
            saida?.alvo ||
            alvo ||
            null,

        codigo:
            primeiro?.codigo ||
            "EXECUTOR_CONCLUIDO",

        retorno:
            primeiro?.retorno ??
            null,

        saidaUnitario:
            saida,
    };
}
/*
 * ============================================================
 * SAFE_SCAN_UPLOAD_MASSA_PIPELINE_EXECUCAO_V1
 *
 * Compõe as camadas já testadas:
 *
 * fila
 *   -> orquestrador sequencial
 *   -> adapter
 *   -> executor unitário
 *
 * Gate false encerra antes de qualquer chamada unitária.
 * ============================================================
 */
export async function executarFilaViaExecutorUnitarioUploadMassa({
    resultado = null,
    fila = [],
    executarPersistencia = null,

    validarPreflightAntesPersistencia =
        null,

    auditarFalhaPersistencia =
        null,

    signal =
        null,

    habilitado = false,
    interromperNoErro = false,

    executarUnitario =
        executarPlanoPersistenciaPrincipalUploadMassa,
} = {}) {
    const alvos =
        Array.isArray(
            fila
        )
            ? fila
            : [];

    if (
        habilitado !==
        true
    ) {
        return {
            executorDisponivel:
                typeof executarUnitario ===
                "function",

            totalFila:
                alvos.length,

            tentados:
                0,

            sucessos:
                0,

            falhas:
                0,

            interrompidoPorErro:
                false,

            motivo:
                "GATE_DESABILITADO",

            resultados:
                [],
        };
    }

    if (
        typeof executarUnitario !==
        "function"
    ) {
        return {
            executorDisponivel:
                false,

            totalFila:
                alvos.length,

            tentados:
                0,

            sucessos:
                0,

            falhas:
                0,

            interrompidoPorErro:
                false,

            motivo:
                "EXECUTOR_UNITARIO_AUSENTE",

            resultados:
                [],
        };
    }

    return executarFilaAlvosPersistenciaPrincipalUploadMassa({
        fila:
            alvos,

        interromperNoErro,

        executarAlvo:
            (alvo) =>
                executarAlvoViaExecutorUnitarioUploadMassa({
                    resultado,
                    alvo,
                    executarPersistencia,

                    validarPreflightAntesPersistencia,

                    auditarFalhaPersistencia,

                    signal,

                    habilitado:
                        true,
                    executarUnitario,
                }),
    });
}
/*
 * ============================================================
 * SAFE_SCAN_UPLOAD_MASSA_PREFLIGHT_FINGERPRINT_V1
 *
 * Snapshot do estado autorizado quando o plano foi criado.
 *
 * NÃO é payload documental.
 * NÃO consulta banco.
 * NÃO executa persistência.
 *
 * NOVO PRINCIPAL:
 * - espera ausência do slot empresa + competência + tipo.
 *
 * NOVA VERSÃO:
 * - espera que item/versão/hash atuais continuem iguais ao
 *   estado histórico que originou a decisão.
 * ============================================================
 */
function criarPreflightPersistenciaPrincipalUploadMassa({
    item = null,
    avaliacao = null,
} = {}) {
    const identidade =
        avaliacao?.identidade ||
        obterIdentidadePersistivel(
            item
        );

    const acao =
        textoSeguro(
            avaliacao?.acao
        );

    const empresaId =
        textoSeguro(
            identidade?.empresaId
        );

    const competencia =
        textoSeguro(
            identidade?.competencia
        );

    const tipoDocumento =
        textoSeguro(
            identidade?.tipoDocumento
        ).toLowerCase();

    const chaveValida =
        PADRAO_UUID.test(
            empresaId
        ) &&
        PADRAO_COMPETENCIA.test(
            competencia
        ) &&
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(
            tipoDocumento
        );

    if (!chaveValida) {
        return null;
    }

    const chaveLogica = {
        empresaId,
        competencia,
        tipoDocumento,
    };

    if (
        acao ===
        CERTIDAO_UPLOAD_MASSA_ACAO_PERSISTENCIA
            .PERSISTIR_NOVO_PRINCIPAL
    ) {
        return {
            versao:
                1,

            expectativa:
                "ITEM_AUSENTE",

            chaveLogica,

            documentoAtual:
                null,
        };
    }

    if (
        acao !==
        CERTIDAO_UPLOAD_MASSA_ACAO_PERSISTENCIA
            .PERSISTIR_NOVA_VERSAO
    ) {
        return null;
    }

    const conflito =
        obterConflitoLogico(
            item
        );

    const documentoAtual =
        conflito?.documentoAtual ||
        {};

    const itemId =
        textoSeguro(
            documentoAtual?.itemId ||
            documentoAtual?.item_id
        );

    const versaoId =
        textoSeguro(
            documentoAtual?.versaoId ||
            documentoAtual?.versaoAtualId ||
            documentoAtual?.versao_atual_id ||
            documentoAtual?.id
        );

    const numeroVersao =
        Math.trunc(
            numeroSeguro(
                documentoAtual?.numeroVersao ||
                documentoAtual?.numero_versao
            )
        );

    const hashSha256 =
        textoSeguro(
            documentoAtual?.hashSha256 ||
            documentoAtual?.hash_sha256
        ).toLowerCase();

    const fingerprintValida =
        PADRAO_UUID.test(
            itemId
        ) &&
        PADRAO_UUID.test(
            versaoId
        ) &&
        numeroVersao > 0 &&
        PADRAO_HASH_SHA256.test(
            hashSha256
        );

    if (!fingerprintValida) {
        return null;
    }

    return {
        versao:
            1,

        expectativa:
            "VERSAO_ATUAL_IGUAL",

        chaveLogica,

        documentoAtual: {
            itemId,
            versaoId,
            numeroVersao,
            hashSha256,
        },
    };
}
/*
 * ============================================================
 * SAFE_SCAN_UPLOAD_MASSA_GUARD_CONFLITO_MULTIPLO_LOTE_V1
 *
 * Guard puro contra colisão lógica dentro do mesmo lote.
 *
 * Uma colisão existe somente quando dois ou mais alvos
 * executáveis apontam para a mesma chave:
 *
 * empresaId + competencia + tipoDocumento
 *
 * e possuem SHAs NOVOS diferentes.
 *
 * Regra fail-safe:
 * - nenhum alvo conflitante ganha por ordem;
 * - todos os envolvidos vão para revisão;
 * - payload e preflight executáveis são removidos;
 * - a fila posterior não recebe esses itens.
 *
 * Esta função:
 * - NÃO consulta banco;
 * - NÃO executa Supabase;
 * - NÃO executa Storage;
 * - NÃO executa RPC;
 * - NÃO muta o array recebido.
 * ============================================================
 */
function aplicarGuardConflitoMultiploLotePlanoPersistenciaPrincipal(
    plano = []
) {
    const itensPlano =
        Array.isArray(
            plano
        )
            ? plano
            : [];

    const acoesExecutaveis =
        new Set([
            CERTIDAO_UPLOAD_MASSA_ACAO_PERSISTENCIA
                .PERSISTIR_NOVO_PRINCIPAL,

            CERTIDAO_UPLOAD_MASSA_ACAO_PERSISTENCIA
                .PERSISTIR_NOVA_VERSAO,
        ]);

    const grupos =
        new Map();

    for (
        const itemPlano of
        itensPlano
    ) {
        const indice =
            itemPlano?.indice;

        const acao =
            textoSeguro(
                itemPlano?.acao
            );

        if (
            !Number.isInteger(
                indice
            ) ||
            indice < 0 ||
            !acoesExecutaveis.has(
                acao
            )
        ) {
            continue;
        }

        const chaveLogica =
            itemPlano
                ?.preflight
                ?.chaveLogica ||
            {};

        const empresaId =
            textoSeguro(
                chaveLogica?.empresaId
            );

        const competencia =
            textoSeguro(
                chaveLogica?.competencia
            );

        const tipoDocumento =
            textoSeguro(
                chaveLogica?.tipoDocumento
            ).toLowerCase();

        const hashSha256 =
            textoSeguro(
                itemPlano
                    ?.payload
                    ?.arquivo
                    ?.hashSha256
            ).toLowerCase();

        const identidadeValida =
            PADRAO_UUID.test(
                empresaId
            ) &&
            PADRAO_COMPETENCIA.test(
                competencia
            ) &&
            PADRAO_TIPO_DOCUMENTO.test(
                tipoDocumento
            ) &&
            PADRAO_HASH_SHA256.test(
                hashSha256
            );

        if (!identidadeValida) {
            continue;
        }

        /*
         * Os três campos são previamente validados e não admitem
         * o separador "|", portanto a representação é estável.
         */
        const chaveGrupo =
            [
                empresaId,
                competencia,
                tipoDocumento,
            ].join("|");

        let grupo =
            grupos.get(
                chaveGrupo
            );

        if (!grupo) {
            grupo = {
                chaveLogica: {
                    empresaId,
                    competencia,
                    tipoDocumento,
                },

                hashes:
                    new Set(),

                indices:
                    new Set(),
            };

            grupos.set(
                chaveGrupo,
                grupo
            );
        }

        grupo.hashes.add(
            hashSha256
        );

        grupo.indices.add(
            indice
        );
    }

    const conflitosPorIndice =
        new Map();

    for (
        const grupo of
        grupos.values()
    ) {
        /*
         * Um mesmo SHA não caracteriza colisão lógica entre
         * documentos diferentes. Duplicidade exata possui guard
         * próprio anterior no pipeline.
         */
        if (
            grupo.hashes.size <= 1 ||
            grupo.indices.size <= 1
        ) {
            continue;
        }

        const hashesSha256 =
            Array.from(
                grupo.hashes
            ).sort();

        const quantidadeAlvos =
            grupo.indices.size;

        for (
            const indice of
            grupo.indices
        ) {
            conflitosPorIndice.set(
                indice,
                {
                    chaveLogica:
                        grupo.chaveLogica,

                    hashesSha256,

                    quantidadeAlvos,
                }
            );
        }
    }

    if (
        conflitosPorIndice.size ===
        0
    ) {
        return itensPlano;
    }

    return itensPlano.map(
        (itemPlano) => {
            const conflito =
                conflitosPorIndice.get(
                    itemPlano?.indice
                );

            if (!conflito) {
                return itemPlano;
            }

            return {
                ...itemPlano,

                acao:
                    CERTIDAO_UPLOAD_MASSA_ACAO_PERSISTENCIA
                        .AGUARDAR_REVISAO,

                codigo:
                    "CONFLITO_MULTIPLO_LOTE",

                /*
                 * O alvo deixa de ser executável.
                 */
                payload:
                    null,

                preflight:
                    null,

                /*
                 * Metadado somente de controle/revisão.
                 * Não faz parte do payload persistido.
                 */
                conflitoLote: {
                    codigo:
                        "CONFLITO_MULTIPLO_LOTE",

                    acaoOriginal:
                        textoSeguro(
                            itemPlano?.acao
                        ),

                    chaveLogica: {
                        ...conflito.chaveLogica,
                    },

                    hashesSha256: [
                        ...conflito.hashesSha256,
                    ],

                    quantidadeAlvos:
                        conflito.quantidadeAlvos,
                },
            };
        }
    );
}
export function criarPlanoPersistenciaPrincipalUploadMassa({
    resultado = null,
} = {}) {
    const itens =
        Array.isArray(
            resultado?.itens
        )
            ? resultado.itens
            : [];

    const planoInicial =
        itens.map(
            (
                item,
                indice
            ) => {
                const avaliacao =
                    avaliarItemPrincipalPersistenciaUploadMassa(
                        item
                    );

                if (!avaliacao.elegivel) {
                    return {
                        indice,
                        acao:
                            avaliacao.acao,
                        codigo:
                            avaliacao.codigo,
                        payload:
                            null,
                    };
                }

                const preflight =
                    criarPreflightPersistenciaPrincipalUploadMassa({
                        item,
                        avaliacao,
                    });

                /*
                 * Alvo executável sem snapshot de preflight
                 * íntegro nunca entra na fila de escrita.
                 */
                if (!preflight) {
                    return {
                        indice,

                        acao:
                            CERTIDAO_UPLOAD_MASSA_ACAO_PERSISTENCIA
                                .AGUARDAR_REVISAO,

                        codigo:
                            avaliacao.acao ===
                            CERTIDAO_UPLOAD_MASSA_ACAO_PERSISTENCIA
                                .PERSISTIR_NOVA_VERSAO
                                ? "FINGERPRINT_HISTORICO_INVALIDA"
                                : "CHAVE_LOGICA_PERSISTENCIA_INVALIDA",

                        payload:
                            null,

                        preflight:
                            null,
                    };
                }

                return {
                    indice,

                    acao:
                        avaliacao.acao,

                    codigo:
                        avaliacao.codigo,

                    payload:
                        criarPayloadPrincipalUploadMassa(
                            item
                        ),

                    preflight,
                };
            }
        );

    /*
     * Guard intralote aplicado somente depois de todos os itens
     * terem sido avaliados individualmente.
     *
     * Isto impede que ordem de chegada escolha um vencedor.
     */
    const plano =
        aplicarGuardConflitoMultiploLotePlanoPersistenciaPrincipal(
            planoInicial
        );
    const contar =
        (acao) =>
            plano.filter(
                (item) =>
                    item?.acao ===
                    acao
            ).length;

    const persistirNovo =
        contar(
            CERTIDAO_UPLOAD_MASSA_ACAO_PERSISTENCIA
                .PERSISTIR_NOVO_PRINCIPAL
        );

    const persistirNovaVersao =
        contar(
            CERTIDAO_UPLOAD_MASSA_ACAO_PERSISTENCIA
                .PERSISTIR_NOVA_VERSAO
        );

    return {
        versao:
            1,

        persistenciaExecutada:
            false,

        itens:
            plano,

        resumo: {
            total:
                plano.length,

            elegiveis:
                persistirNovo +
                persistirNovaVersao,

            novosPrincipais:
                persistirNovo,

            novasVersoes:
                persistirNovaVersao,

            manterAtual:
                contar(
                    CERTIDAO_UPLOAD_MASSA_ACAO_PERSISTENCIA
                        .MANTER_ATUAL
                ),

            aguardandoDecisao:
                contar(
                    CERTIDAO_UPLOAD_MASSA_ACAO_PERSISTENCIA
                        .AGUARDAR_DECISAO
                ),

            aguardandoRevisao:
                contar(
                    CERTIDAO_UPLOAD_MASSA_ACAO_PERSISTENCIA
                        .AGUARDAR_REVISAO
                ),

            duplicadosIgnorados:
                contar(
                    CERTIDAO_UPLOAD_MASSA_ACAO_PERSISTENCIA
                        .IGNORAR_DUPLICADO
                ),

            complementaresIgnorados:
                contar(
                    CERTIDAO_UPLOAD_MASSA_ACAO_PERSISTENCIA
                        .IGNORAR_COMPLEMENTAR
                ),

            invalidos:
                contar(
                    CERTIDAO_UPLOAD_MASSA_ACAO_PERSISTENCIA
                        .BLOQUEAR_DADOS_INVALIDOS
                ),
        },
    };
}