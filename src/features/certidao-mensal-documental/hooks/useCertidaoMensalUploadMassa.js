
import {
    listarEvidenciasAtivasCertidaoMensal,
} from "../services/certidaoMensalEvidenciaPersistenceService.js";

import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import {
    listarCnpjsEmpresa,
} from "../../../services/empresaCnpjsService.js";

import {
    aplicarGuardConflitoLogicoHistorico,
    aplicarGuardDuplicidadeExataHistorico,
    processarArquivosCertidaoEmLote,
    resolverItemSingularRevisaoHistorica,
} from "../services/certidaoMensalUploadMassaService.js";
import {
    criarDiagnosticoPersistencia,
    criarFilaAlvosPersistenciaPrincipalUploadMassa,
    criarPlanoPersistenciaPrincipalUploadMassa,
    executarFilaViaExecutorUnitarioUploadMassa,
    executarPlanoPersistenciaPrincipalUploadMassa,
} from "../services/certidaoMensalUploadMassaPersistencePlanService.js";
import {
    criarUrlAssinadaPdfCertidaoMensal,
} from "../services/certidaoMensalDocumentPersistenceService.js";

import {
    criarCertidaoMensalRevisaoHistoricaSingleFlight,
} from "../services/certidaoMensalRevisaoHistoricaSingleFlightService.js";

import {
    criarPlanoComplementarIndividualUploadMassa,
} from "../services/certidaoMensalUploadMassaComplementarPlanService.js";

import {
    aplicarDecisaoAutorizacaoComplementarUploadMassa,
    criarEstadoAutorizacaoComplementarUploadMassa,
    criarPlanoAutorizacaoComplementarUploadMassa,
    limparDecisaoAutorizacaoComplementarUploadMassa,
} from "../services/certidaoMensalUploadMassaComplementarAuthorizationService.js";

import {
    criarPlanoExecucaoComplementarDryRun,
} from "../services/certidaoMensalUploadMassaComplementarDryRunService.js";

import {
    resolverDestinoEvidenciaComplementarUploadMassa,
} from "../services/certidaoMensalUploadMassaComplementarDestinoService.js";

// ============================================================
// SAFE_SCAN_UPLOAD_MASSA_HOOK_V1
//
// Orquestração React do upload em massa.
//
// Responsabilidades:
// - preparar CNPJs vinculados de todas as empresas candidatas;
// - iniciar o motor sequencial;
// - receber progresso;
// - cancelar operação;
// - impedir resposta antiga de sobrescrever operação nova.
//
// NÃO:
// - altera competência da página;
// - persiste documento;
// - decide destino manualmente.
// ============================================================

export const CERTIDAO_UPLOAD_MASSA_ESTADO =
    Object.freeze({
        OCIOSO:
            "OCIOSO",

        PREPARANDO_EMPRESAS:
            "PREPARANDO_EMPRESAS",

        PROCESSANDO:
            "PROCESSANDO",

        CONCLUIDO:
            "CONCLUIDO",

        CANCELADO:
            "CANCELADO",

        FALHA:
            "FALHA",
    });

function criarEstadoInicial() {
    return {
        status:
            CERTIDAO_UPLOAD_MASSA_ESTADO
                .OCIOSO,

        processando:
            false,

        progresso:
            null,

        resultado:
            null,

        resumo:
            null,

        /*
         * SAFE_SCAN_COMPLEMENTAR_SNAPSHOT_STATE_D2_R1T_R2A_R3
         *
         * Snapshot read-only da consulta histórica
         * já realizada durante o processamento.
         */
        documentosAtuaisComplementar:
            [],

        erro:
            "",

        operacaoId:
            0,
    };
}

function textoSeguro(
    valor = ""
) {
    return String(
        valor ?? ""
    ).trim();
}

function criarErroCancelamento() {
    const erro =
        new Error(
            "Processamento do lote cancelado."
        );

    erro.name =
        "AbortError";

    erro.codigo =
        "CERTIDAO_UPLOAD_MASSA_CANCELADO";

    return erro;
}

function verificarCancelamento(
    signal
) {
    if (signal?.aborted) {
        throw criarErroCancelamento();
    }
}

function normalizarListaArquivos(
    arquivos
) {
    if (!arquivos) {
        return [];
    }

    try {
        return Array.from(
            arquivos
        ).filter(Boolean);
    }
    catch {
        return [];
    }
}

function normalizarEmpresasCandidatas(
    empresas
) {
    const lista =
        Array.isArray(
            empresas
        )
            ? empresas
            : [];

    const mapa =
        new Map();

    for (
        const empresa of
        lista
    ) {
        const empresaId =
            textoSeguro(
                empresa?.id
            );

        if (
            !empresaId ||
            mapa.has(
                empresaId
            )
        ) {
            continue;
        }

        mapa.set(
            empresaId,
            empresa
        );
    }

    return Array.from(
        mapa.values()
    );
}

async function prepararEmpresasParaLote({
    supabase,
    empresas,
    signal,
}) {
    if (
        !supabase ||
        typeof supabase.from !==
            "function"
    ) {
        throw new Error(
            "Cliente Supabase indisponível para preparar os CNPJs vinculados das empresas."
        );
    }

    const candidatas =
        normalizarEmpresasCandidatas(
            empresas
        );

    if (!candidatas.length) {
        throw new Error(
            "Nenhuma empresa candidata está disponível para identificar os documentos do lote."
        );
    }

    const preparadas =
        [];

    /*
     * Preparação sequencial intencional:
     *
     * - reduz rajadas de consultas;
     * - permite verificar cancelamento entre empresas;
     * - reproduz a cautela do upload unitário existente.
     */
    for (
        const empresa of
        candidatas
    ) {
        verificarCancelamento(
            signal
        );

        const empresaId =
            textoSeguro(
                empresa?.id
            );

        try {
            const cnpjsVinculados =
                await listarCnpjsEmpresa({
                    supabase,
                    empresaId,
                });

            verificarCancelamento(
                signal
            );

            preparadas.push({
                ...empresa,

                cnpjsVinculados:
                    Array.isArray(
                        cnpjsVinculados
                    )
                        ? cnpjsVinculados
                        : [],
            });
        }
        catch (erro) {
            const nome =
                textoSeguro(
                    empresa?.nome
                ) ||
                empresaId;

            throw new Error(
                (
                    `Não foi possível preparar os CNPJs vinculados de ${nome}. ` +
                    `O lote não será analisado para evitar associação incorreta de empresa. ` +
                    `${textoSeguro(erro?.message)}`
                ).trim(),
                {
                    cause: erro,
                }
            );
        }
    }

    return preparadas;
}

// ============================================================
// SAFE_SCAN_UPLOAD_MASSA_HISTORICO_SHA_V1
//
// Camada read-only entre motor local e preview final.
//
// Faz UMA consulta por lote de hashes.
// Não salva arquivo.
// Não cria versão.
// Não altera item documental.
// ============================================================

const PADRAO_HASH_SHA256_UPLOAD_HISTORICO =
    /^[a-f0-9]{64}$/;

function normalizarHashUploadHistorico(
    valor
) {
    const hash =
        textoSeguro(
            valor
        ).toLowerCase();

    return PADRAO_HASH_SHA256_UPLOAD_HISTORICO.test(
        hash
    )
        ? hash
        : "";
}

function coletarHashesCanonicosUploadHistorico(
    resultado
) {
    const itens =
        Array.isArray(
            resultado?.itens
        )
            ? resultado.itens
            : [];

    return [
        ...new Set(
            itens
                .filter(
                    (item) =>
                        item
                            ?.duplicidade
                            ?.codigo !==
                        "DUPLICADO_EXATO_LOTE"
                )
                .map(
                    (item) =>
                        normalizarHashUploadHistorico(
                            item
                                ?.hash
                                ?.sha256
                        )
                )
                .filter(
                    Boolean
                )
        ),
    ];
}

function criarErroCancelamentoHistoricoUpload() {
    const erro =
        new Error(
            "Consulta do histórico documental cancelada."
        );

    erro.name =
        "AbortError";

    return erro;
}

async function consultarVersoesDuplicadasUploadHistorico({
    supabase,
    resultado,
    signal,
}) {
    if (
        signal?.aborted
    ) {
        throw criarErroCancelamentoHistoricoUpload();
    }

    if (
        !supabase ||
        typeof supabase.from !==
            "function"
    ) {
        throw new Error(
            "Cliente Supabase indisponível para verificar a duplicidade no histórico documental."
        );
    }

    const hashes =
        coletarHashesCanonicosUploadHistorico(
            resultado
        );

    if (!hashes.length) {
        return [];
    }

    /*
     * Persistências oficiais já normalizam o SHA-256 em lowercase.
     *
     * Incluímos também uppercase no filtro para cobrir registros
     * históricos legados sem depender da capitalização do texto.
     */
    const valoresConsulta =
        [
            ...new Set(
                hashes.flatMap(
                    (hash) => [
                        hash,
                        hash.toUpperCase(),
                    ]
                )
            ),
        ];

    let consulta =
        supabase
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
                    "status_resultado",
                    "diagnostico",
                    "payload",
                    "bucket_id",
                    "caminho_storage",
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
        typeof consulta.abortSignal ===
            "function"
    ) {
        consulta =
            consulta.abortSignal(
                signal
            );
    }

    const resposta =
        await consulta;

    if (
        signal?.aborted
    ) {
        throw criarErroCancelamentoHistoricoUpload();
    }

    if (resposta?.error) {
        throw new Error(
            (
                "Não foi possível verificar o histórico documental antes da revisão do lote. " +
                textoSeguro(
                    resposta.error?.message
                )
            ).trim()
        );
    }

    return Array.isArray(
        resposta?.data
    )
        ? resposta.data
        : [];
}


// ============================================================
// SAFE_SCAN_UPLOAD_MASSA_CONFLITO_LOGICO_V1
//
// Consulta somente leitura.
//
// Resolve versão atual por:
// empresa + competência + tipo principal.
//
// Não salva.
// Não cria versão.
// Não altera complementares.
// ============================================================

function obterAlvoConflitoLogicoUpload(
    item
) {
    const resolucao =
        item?.resolucao ||
        {};

    const duplicidade =
        textoSeguro(
            item
                ?.duplicidade
                ?.codigo
        );

    const ehDuplicidadeExata =
        duplicidade ===
            "DUPLICADO_EXATO_LOTE" ||
        duplicidade ===
            "DUPLICADO_EXATO_HISTORICO";

    /*
     * SAFE_SCAN_HISTORICO_DUPLICADO_COMO_ALVO_READ_ONLY_F3
     *
     * Um PDF principal já identificado como duplicidade exata
     * continua BLOQUEADO para persistência, porém sua identidade
     * empresa + competência + tipo ainda é necessária para
     * consultar o item principal que já existe no histórico.
     *
     * Esta exceção existe somente nesta coleta read-only.
     * O guard de conflito lógico continua ignorando duplicidades
     * exatas e nenhum executor/persistência é habilitado aqui.
     */
    if (
        item?.erro ||
        resolucao?.complementar ===
            true ||
        resolucao?.politica ===
            "COMPLEMENTAR" ||
        (
            resolucao?.status ===
                "BLOQUEADO" &&
            !ehDuplicidadeExata
        ) ||
        resolucao
            ?.empresa
            ?.status !==
            "IDENTIFICADA"
    ) {
        return null;
    }

    const empresaId =
        textoSeguro(
            resolucao
                ?.empresa
                ?.id
        );

    const competenciaIso =
        textoSeguro(
            resolucao
                ?.destino
                ?.competenciaIso
        );

    const tipoDocumento =
        textoSeguro(
            resolucao
                ?.tipoDocumento ||
            resolucao
                ?.tipoClassificador
        ).toLowerCase();

    const hashSha256 =
        normalizarHashUploadHistorico(
            item
                ?.hash
                ?.sha256
        );

    if (
        !empresaId ||
        !/^\d{4}-(0[1-9]|1[0-2])-01$/.test(
            competenciaIso
        ) ||
        !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(
            tipoDocumento
        ) ||
        !hashSha256
    ) {
        return null;
    }

    return {
        chave:
            [
                empresaId,
                competenciaIso,
                tipoDocumento,
            ].join("|"),

        empresaId,
        competenciaIso,
        tipoDocumento,
        hashSha256,
    };
}

function coletarAlvosConflitoLogicoUpload(
    resultado
) {
    const itens =
        Array.isArray(
            resultado?.itens
        )
            ? resultado.itens
            : [];

    const mapa =
        new Map();

    for (
        const item of
        itens
    ) {
        const alvo =
            obterAlvoConflitoLogicoUpload(
                item
            );

        if (
            alvo &&
            !mapa.has(
                alvo.chave
            )
        ) {
            mapa.set(
                alvo.chave,
                alvo
            );
        }
    }

    return [
        ...mapa.values(),
    ];
}

function criarAbortConflitoLogicoUpload() {
    const erro =
        new Error(
            "Consulta de conflito lógico documental cancelada."
        );

    erro.name =
        "AbortError";

    return erro;
}

function aplicarAbortSignalConflito(
    consulta,
    signal
) {
    if (
        signal &&
        typeof consulta?.abortSignal ===
            "function"
    ) {
        return consulta.abortSignal(
            signal
        );
    }

    return consulta;
}

async function consultarDocumentosAtuaisConflitoLogicoUpload({
    supabase,
    resultado,
    signal,
}) {
    if (signal?.aborted) {
        throw criarAbortConflitoLogicoUpload();
    }

    if (
        !supabase ||
        typeof supabase.from !==
            "function"
    ) {
        throw new Error(
            "Cliente Supabase indisponível para verificar conflitos lógicos."
        );
    }

    const alvos =
        coletarAlvosConflitoLogicoUpload(
            resultado
        );

    if (!alvos.length) {
        return [];
    }

    const empresaIds =
        [
            ...new Set(
                alvos.map(
                    (alvo) =>
                        alvo.empresaId
                )
            ),
        ];

    const competencias =
        [
            ...new Set(
                alvos.map(
                    (alvo) =>
                        alvo.competenciaIso
                )
            ),
        ];

    const tipos =
        [
            ...new Set(
                alvos.map(
                    (alvo) =>
                        alvo.tipoDocumento
                )
            ),
        ];

    const chavesAlvo =
        new Set(
            alvos.map(
                (alvo) =>
                    alvo.chave
            )
        );

    let consultaCompetencias =
        supabase
            .from(
                "certidao_mensal_competencias"
            )
            .select(
                "id,empresa_id,competencia"
            )
            .in(
                "empresa_id",
                empresaIds
            )
            .in(
                "competencia",
                competencias
            )
            .limit(
                5000
            );

    consultaCompetencias =
        aplicarAbortSignalConflito(
            consultaCompetencias,
            signal
        );

    const respostaCompetencias =
        await consultaCompetencias;

    if (signal?.aborted) {
        throw criarAbortConflitoLogicoUpload();
    }

    if (respostaCompetencias?.error) {
        throw new Error(
            "Não foi possível consultar competências para verificar conflito lógico: " +
            (
                respostaCompetencias
                    .error
                    ?.message ||
                "erro desconhecido"
            )
        );
    }

    const mapaCompetencias =
        new Map();

    for (
        const competencia of
        (
            Array.isArray(
                respostaCompetencias?.data
            )
                ? respostaCompetencias.data
                : []
        )
    ) {
        const id =
            textoSeguro(
                competencia?.id
            );

        const empresaId =
            textoSeguro(
                competencia
                    ?.empresa_id
            );

        const competenciaIso =
            textoSeguro(
                competencia
                    ?.competencia
            );

        const parEsperado =
            alvos.some(
                (alvo) =>
                    alvo.empresaId ===
                        empresaId &&
                    alvo.competenciaIso ===
                        competenciaIso
            );

        if (
            id &&
            parEsperado
        ) {
            mapaCompetencias.set(
                id,
                {
                    empresaId,
                    competenciaIso,
                }
            );
        }
    }

    const competenciaIds =
        [
            ...mapaCompetencias.keys(),
        ];

    if (!competenciaIds.length) {
        return [];
    }

    let consultaItens =
        supabase
            .from(
                "certidao_mensal_itens"
            )
            .select(
                "id,competencia_id,tipo_documento,versao_atual_id"
            )
            .in(
                "competencia_id",
                competenciaIds
            )
            .in(
                "tipo_documento",
                tipos
            )
            .limit(
                5000
            );

    consultaItens =
        aplicarAbortSignalConflito(
            consultaItens,
            signal
        );

    const respostaItens =
        await consultaItens;

    if (signal?.aborted) {
        throw criarAbortConflitoLogicoUpload();
    }

    if (respostaItens?.error) {
        throw new Error(
            "Não foi possível consultar itens para verificar conflito lógico: " +
            (
                respostaItens
                    .error
                    ?.message ||
                "erro desconhecido"
            )
        );
    }

    const itensAtuais =
        [];

    for (
        const item of
        (
            Array.isArray(
                respostaItens?.data
            )
                ? respostaItens.data
                : []
        )
    ) {
        const competencia =
            mapaCompetencias.get(
                textoSeguro(
                    item?.competencia_id
                )
            );

        if (!competencia) {
            continue;
        }

        const tipoDocumento =
            textoSeguro(
                item?.tipo_documento
            ).toLowerCase();

        const chave =
            [
                competencia.empresaId,
                competencia.competenciaIso,
                tipoDocumento,
            ].join("|");

        if (
            !chavesAlvo.has(
                chave
            )
        ) {
            continue;
        }

        const versaoAtualId =
            textoSeguro(
                item?.versao_atual_id
            );

        if (!versaoAtualId) {
            continue;
        }

        itensAtuais.push({
            itemId:
                textoSeguro(
                    item?.id
                ),

            versaoAtualId,

            empresaId:
                competencia.empresaId,

            competenciaIso:
                competencia.competenciaIso,

            tipoDocumento,
        });
    }

    if (!itensAtuais.length) {
        return [];
    }

    const versaoIds =
        [
            ...new Set(
                itensAtuais.map(
                    (item) =>
                        item.versaoAtualId
                )
            ),
        ];

    let consultaVersoes =
        supabase
            .from(
                "certidao_mensal_versoes"
            )
            .select(
                "id,item_id,numero_versao,hash_sha256,nome_original,criado_em"
            )
            .in(
                "id",
                versaoIds
            )
            .limit(
                5000
            );

    consultaVersoes =
        aplicarAbortSignalConflito(
            consultaVersoes,
            signal
        );

    const respostaVersoes =
        await consultaVersoes;

    if (signal?.aborted) {
        throw criarAbortConflitoLogicoUpload();
    }

    if (respostaVersoes?.error) {
        throw new Error(
            "Não foi possível consultar versões para verificar conflito lógico: " +
            (
                respostaVersoes
                    .error
                    ?.message ||
                "erro desconhecido"
            )
        );
    }

    const versoesPorId =
        new Map();

    for (
        const versao of
        (
            Array.isArray(
                respostaVersoes?.data
            )
                ? respostaVersoes.data
                : []
        )
    ) {
        versoesPorId.set(
            textoSeguro(
                versao?.id
            ),
            versao
        );
    }

    const documentosAtuais =
        [];

    for (
        const item of
        itensAtuais
    ) {
        const versao =
            versoesPorId.get(
                item.versaoAtualId
            );

        if (!versao) {
            throw new Error(
                "O histórico retornou um item com versão atual inacessível. A análise foi interrompida para evitar uma decisão incompleta."
            );
        }

        documentosAtuais.push({
            empresaId:
                item.empresaId,

            competenciaIso:
                item.competenciaIso,

            tipoDocumento:
                item.tipoDocumento,

            itemId:
                item.itemId,

            versaoId:
                textoSeguro(
                    versao?.id
                ),

            numeroVersao:
                Number(
                    versao
                        ?.numero_versao
                ) || null,

            hashSha256:
                normalizarHashUploadHistorico(
                    versao
                        ?.hash_sha256
                ),

            nomeOriginal:
                textoSeguro(
                    versao
                        ?.nome_original
                ),

            criadoEm:
                textoSeguro(
                    versao
                        ?.criado_em
                ),
        });
    }

    return documentosAtuais;
}

// ============================================================
// SAFE_SCAN_CONFLITO_LOGICO_DECISAO_MEMORIA_V1
//
// Guarda somente a decisão humana no resultado persistente
// em memória do upload.
//
// NÃO persiste.
// NÃO cria versão.
// NÃO altera REVISAR.
// ============================================================

export function aplicarDecisaoConflitoLogicoUploadMassa({
    resultado = null,
    indiceItem = -1,
    decisao = "",
} = {}) {
    const itens =
        Array.isArray(
            resultado?.itens
        )
            ? resultado.itens
            : null;

    const indice =
        Number(
            indiceItem
        );

    if (
        !itens ||
        !Number.isInteger(
            indice
        ) ||
        indice < 0 ||
        indice >= itens.length
    ) {
        return resultado;
    }

    const item =
        itens[indice] ||
        {};

    const resolucao =
        item?.resolucao ||
        {};

    const conflito =
        item?.conflitoLogico ||
        resolucao
            ?.conflitoLogico ||
        null;

    if (
        conflito?.codigo !==
        "CONFLITO_LOGICO_VERSAO"
    ) {
        return resultado;
    }

    const escolha =
        String(
            decisao ||
            ""
        ).trim();

    const permitidas =
        Array.isArray(
            conflito?.decisoesPermitidas
        )
            ? conflito
                .decisoesPermitidas
            : [];

    if (
        !permitidas.includes(
            escolha
        )
    ) {
        return resultado;
    }

    const conflitoAtualizado = {
        ...conflito,

        decisao:
            escolha,

        persistenciaPermitida:
            false,
    };

    const itemAtualizado = {
        ...item,

        conflitoLogico:
            conflitoAtualizado,

        resolucao: {
            ...resolucao,

            status:
                "REVISAR",

            conflitoLogico:
                conflitoAtualizado,

            persistenciaAutomatica:
                false,

            persistido:
                false,
        },

        persistido:
            false,
    };

    const proximosItens =
        [...itens];

    proximosItens[indice] =
        itemAtualizado;

    return {
        ...resultado,

        itens:
            proximosItens,

        persistenciaExecutada:
            false,
    };
}

/*
 * ============================================================
 * SAFE_SCAN_SISPAG_CLASSIFICACAO_MEMORIA_D2_R1S4
 *
 * SISPAG representa o CANAL bancário e não a natureza da verba.
 *
 * A natureza financeira só pode ser definida por decisão humana:
 * - PAGAMENTO_SALARIAL
 * - ADIANTAMENTO_SALARIAL
 *
 * Regras:
 * - alteração somente em memória;
 * - exige associação financeira já marcada como pendente/manual;
 * - exige colaborador LOCALIZADO;
 * - BLOQUEADO permanece intocável;
 * - não altera REVISAR para PRONTO;
 * - não habilita persistência automática;
 * - não chama Supabase, Storage ou RPC.
 * ============================================================
 */
export function aplicarClassificacaoFinanceiraSispagUploadMassa({
    resultado = null,
    indiceItem = -1,
    tipoEvidencia = "",
} = {}) {
    const itens =
        Array.isArray(
            resultado?.itens
        )
            ? resultado.itens
            : null;

    const indice =
        Number(
            indiceItem
        );

    if (
        !itens ||
        !Number.isInteger(
            indice
        ) ||
        indice < 0 ||
        indice >= itens.length
    ) {
        return resultado;
    }

    const item =
        itens[indice] ||
        {};

    const resolucao =
        item?.resolucao ||
        {};

    if (
        textoSeguro(
            resolucao?.status
        ).toUpperCase() ===
        "BLOQUEADO"
    ) {
        return resultado;
    }

    const identificacaoColaborador =
        resolucao
            ?.identificacaoColaborador ||
        item
            ?.identificacaoColaborador ||
        {};

    if (
        textoSeguro(
            identificacaoColaborador
                ?.status
        ).toUpperCase() !==
        "LOCALIZADO"
    ) {
        return resultado;
    }

    const vinculoFolha =
        resolucao
            ?.vinculoFolha ||
        {};

    const tipoEvidenciaFinanceiraAtual =
        textoSeguro(
            vinculoFolha
                ?.tipoEvidencia
        ).toUpperCase();

    const classificacaoAplicavel =
        vinculoFolha
            ?.classificacaoFinanceiraPendente ===
            true ||
        vinculoFolha
            ?.classificacaoFinanceiraManual ===
            true ||
        tipoEvidenciaFinanceiraAtual ===
            "PAGAMENTO_SALARIAL" ||
        tipoEvidenciaFinanceiraAtual ===
            "ADIANTAMENTO_SALARIAL";

    if (!classificacaoAplicavel) {
        return resultado;
    }

    const escolha =
        textoSeguro(
            tipoEvidencia
        ).toUpperCase();

    const permitidas =
        new Set([
            "PAGAMENTO_SALARIAL",
            "ADIANTAMENTO_SALARIAL",
        ]);

    if (
        !permitidas.has(
            escolha
        )
    ) {
        return resultado;
    }

    const itemAtualizado = {
        ...item,

        resolucao: {
            ...resolucao,

            vinculoFolha: {
                ...vinculoFolha,

                tipoEvidencia:
                    escolha,

                classificacaoFinanceiraPendente:
                    false,

                classificacaoFinanceiraManual:
                    true,
            },

            evidenciaComplementar: {
                ...(
                    resolucao
                        ?.evidenciaComplementar ||
                    {}
                ),

                tipo:
                    escolha,

                persistenciaExecutada:
                    false,
            },

            /*
             * A decisão humana classifica a natureza da evidência,
             * mas NÃO conclui a revisão documental.
             */
            persistenciaAutomatica:
                false,

            persistido:
                false,
        },

        persistido:
            false,
    };

    const proximosItens =
        [...itens];

    proximosItens[indice] =
        itemAtualizado;

    return {
        ...resultado,

        itens:
            proximosItens,

        persistenciaExecutada:
            false,
    };
}

/*
 * ============================================================
 * SAFE_SCAN_F2_WIRING_EVIDENCE_ADAPTER_CONTROLADO
 *
 * Adapter real conectado ao contrato, porém a persistência
 * complementar permanece deliberadamente bloqueada.
 * ============================================================
 */


// ============================================================
// SAFE_SCAN_CERT2_R11_SNAPSHOT_COLABORADORES
//
// Consulta read-only própria do CERT2 no início de cada lote.
// Não usa status/mobilização como filtro.
// O array React nunca é tratado como prova de inexistência.
// ============================================================

const CERT2_R11_TAMANHO_PAGINA_COLABORADORES =
    500;

function congelarColaboradorSnapshotCert2R11(
    colaborador = {}
) {
    return Object.freeze({
        id:
            colaborador?.id ||
            null,

        nome:
            colaborador?.nome ||
            "",

        cpf:
            colaborador?.cpf ||
            "",

        matricula:
            colaborador?.matricula ||
            "",

        matricula_esocial:
            colaborador?.matricula_esocial ||
            "",

        matriculaEsocial:
            colaborador?.matricula_esocial ||
            "",

        codigo_funcionario:
            colaborador?.codigo_funcionario ||
            "",

        empresa_id:
            colaborador?.empresa_id ||
            null,

        empresaId:
            colaborador?.empresa_id ||
            null,
    });
}

function criarSnapshotConsultaColaboradoresCert2R11({
    status,
    colaboradores = [],
    detalhe = "",
    quantidadeContexto = 0,
}) {
    const lista =
        Object.freeze(
            (
                Array.isArray(
                    colaboradores
                )
                    ? colaboradores
                    : []
            ).map(
                congelarColaboradorSnapshotCert2R11
            )
        );

    return Object.freeze({
        status,

        colaboradores:
            lista,

        detalhe:
            String(
                detalhe ||
                ""
            ),

        quantidade:
            lista.length,

        quantidadeContexto:
            Number.isFinite(
                quantidadeContexto
            )
                ? quantidadeContexto
                : 0,
    });
}

async function consultarSnapshotColaboradoresCert2R11({
    supabase,
    signal,
    colaboradoresContexto = [],
}) {
    const quantidadeContexto =
        Array.isArray(
            colaboradoresContexto
        )
            ? colaboradoresContexto.length
            : 0;

    if (
        !supabase ||
        typeof supabase.from !==
            "function"
    ) {
        return criarSnapshotConsultaColaboradoresCert2R11({
            status:
                "CONSULTA_INCONCLUSIVA",

            detalhe:
                "Cliente Supabase indisponível para confirmar o cadastro de colaboradores.",

            quantidadeContexto,
        });
    }

    const acumulados =
        [];

    let inicio =
        0;

    try {
        while (true) {
            verificarCancelamento(
                signal
            );

            const fim =
                inicio +
                CERT2_R11_TAMANHO_PAGINA_COLABORADORES -
                1;

            const {
                data,
                error,
            } =
                await supabase
                    .from(
                        "colaboradores"
                    )
                    .select(
                        "id,nome,cpf,matricula,matricula_esocial,codigo_funcionario,empresa_id"
                    )
                    .order(
                        "id",
                        {
                            ascending:
                                true,
                        }
                    )
                    .range(
                        inicio,
                        fim
                    );

            if (error) {
                return criarSnapshotConsultaColaboradoresCert2R11({
                    status:
                        "CONSULTA_INCONCLUSIVA",

                    detalhe:
                        "Não foi possível confirmar a base de colaboradores do SafeScan: " +
                        String(
                            error?.message ||
                            "erro de leitura do banco"
                        ),

                    quantidadeContexto,
                });
            }

            const lote =
                Array.isArray(
                    data
                )
                    ? data.filter(
                        Boolean
                    )
                    : [];

            acumulados.push(
                ...lote
            );

            if (
                lote.length <
                CERT2_R11_TAMANHO_PAGINA_COLABORADORES
            ) {
                break;
            }

            inicio +=
                lote.length;

            if (
                inicio >
                100000
            ) {
                return criarSnapshotConsultaColaboradoresCert2R11({
                    status:
                        "CONSULTA_INCONCLUSIVA",

                    detalhe:
                        "A consulta de colaboradores excedeu o limite defensivo do CERT2 e foi interrompida sem concluir a base.",

                    quantidadeContexto,
                });
            }
        }

        verificarCancelamento(
            signal
        );

        return criarSnapshotConsultaColaboradoresCert2R11({
            status:
                "BASE_CONFIRMADA",

            colaboradores:
                acumulados,

            detalhe:
                "Base de colaboradores consultada diretamente pelo CERT2 para esta operação.",

            quantidadeContexto,
        });
    }
    catch (error) {
        if (
            error?.name ===
            "AbortError"
        ) {
            throw error;
        }

        return criarSnapshotConsultaColaboradoresCert2R11({
            status:
                "CONSULTA_INCONCLUSIVA",

            detalhe:
                "Não foi possível concluir a consulta de colaboradores do SafeScan: " +
                String(
                    error?.message ||
                    "erro inesperado de leitura"
                ),

            quantidadeContexto,
        });
    }
}

export function useCertidaoMensalUploadMassa({
    supabase = null,
    empresas = [],
    colaboradores = [],

    /*
     * SAFE_SCAN_UPLOAD_MASSA_HOOK_EXECUTOR_PERSISTENCIA_V1
     *
     * Provider atual não fornece estes parâmetros.
     */
    executorPersistenciaPrincipal =
        null,

    validarPreflightPersistenciaPrincipal =
        null,

    auditorPersistenciaPrincipal =
        null,

    habilitarPersistenciaPrincipal =
        false,
} = {}) {
    const [
        estado,
        setEstado,
    ] =
        useState(
            criarEstadoInicial
        );

    /*
     * SAFE_SCAN_AUTORIZACAO_COMPLEMENTAR_HOOK_STATE_D2_R1T_R4B
     *
     * Estado exclusivamente em memória.
     * Não autoriza persistência.
     */
    const [
        estadoAutorizacaoComplementar,
        setEstadoAutorizacaoComplementar,
    ] =
        useState(
            criarEstadoAutorizacaoComplementarUploadMassa
        );

    /*
     * SAFE_SCAN_SNAPSHOT_ARQUIVOS_ORIGINAIS_STATE_D2_R1T_R4F
     *
     * Snapshot posicional do lote normalizado.
     * Nenhum arquivo é persistido aqui.
     */
    const [
        arquivosOriginaisLote,
        setArquivosOriginaisLote,
    ] =
        useState(
            () =>
                Object.freeze(
                    []
                )
        );

    const operacaoRef =
        useRef(
            0
        );

    /*
     * SAFE_SCAN_CERT2_M2_A3_REVISAO_SINGLE_FLIGHT
     *
     * A trava mora no núcleo do executor, e não apenas na UI.
     * A instância permanece estável entre renders do mesmo hook.
     */
    const revisaoHistoricaSingleFlightRef =
        useRef(
            null
        );

    if (
        revisaoHistoricaSingleFlightRef
            .current ===
        null
    ) {
        revisaoHistoricaSingleFlightRef
            .current =
                criarCertidaoMensalRevisaoHistoricaSingleFlight();
    }

    const abortControllerRef =
        useRef(
            null
        );

    const montadoRef =
        useRef(
            false
        );

    useEffect(
        () => {
            montadoRef.current =
                true;

            return () => {
                montadoRef.current =
                    false;

                if (
                    abortControllerRef
                        .current &&
                    !abortControllerRef
                        .current
                        .signal
                        .aborted
                ) {
                    abortControllerRef
                        .current
                        .abort();
                }
            };
        },
        []
    );

    const operacaoAindaValida =
        useCallback(
            (
                operacaoId,
                signal
            ) =>
                Boolean(
                    montadoRef.current &&
                    operacaoRef.current ===
                        operacaoId &&
                    !signal?.aborted
                ),
            []
        );

    const cancelar =
        useCallback(
            () => {
                const controller =
                    abortControllerRef
                        .current;

                if (
                    controller &&
                    !controller
                        .signal
                        .aborted
                ) {
                    controller.abort();
                }

                /*
                 * Incrementar invalida callbacks e promises
                 * pertencentes à execução anterior.
                 */
                operacaoRef.current +=
                    1;

                abortControllerRef
                    .current =
                    null;

                if (!montadoRef.current) {
                    return;
                }

                setEstado(
                    (atual) => {
                        if (
                            !atual
                                .processando
                        ) {
                            return atual;
                        }

                        return {
                            ...atual,

                            status:
                                CERTIDAO_UPLOAD_MASSA_ESTADO
                                    .CANCELADO,

                            processando:
                                false,

                            erro:
                                "",

                            operacaoId:
                                operacaoRef
                                    .current,
                        };
                    }
                );
            },
            []
        );

    const limpar =
        useCallback(
            () => {
                const controller =
                    abortControllerRef
                        .current;

                if (
                    controller &&
                    !controller
                        .signal
                        .aborted
                ) {
                    controller.abort();
                }

                operacaoRef.current +=
                    1;

                abortControllerRef
                    .current =
                    null;

                if (
                    montadoRef.current
                ) {
                    /*
                     * SAFE_SCAN_AUTORIZACAO_COMPLEMENTAR_RESET_LIMPAR_D2_R1T_R4B
                     */
                    /*
                     * SAFE_SCAN_SNAPSHOT_ARQUIVOS_ORIGINAIS_RESET_LIMPAR_D2_R1T_R4F
                     */
                    setArquivosOriginaisLote(
                        Object.freeze(
                            []
                        )
                    );

                    setEstadoAutorizacaoComplementar(
                        criarEstadoAutorizacaoComplementarUploadMassa()
                    );

                    setEstado(
                        criarEstadoInicial()
                    );
                }
            },
            []
        );

    const definirDecisaoConflitoLogico =
        useCallback(
            (
                indiceItem,
                decisao
            ) => {
                if (
                    !montadoRef.current
                ) {
                    return;
                }

                setEstado(
                    (atual) => {
                        if (
                            atual?.processando ||
                            !atual?.resultado
                        ) {
                            return atual;
                        }

                        const resultadoAtualizado =
                            aplicarDecisaoConflitoLogicoUploadMassa({
                                resultado:
                                    atual.resultado,

                                indiceItem,

                                decisao,
                            });

                        if (
                            resultadoAtualizado ===
                            atual.resultado
                        ) {
                            return atual;
                        }

                        return {
                            ...atual,

                            resultado:
                                resultadoAtualizado,
                        };
                    }
                );
            },
            []
        );

    /*
     * ============================================================
     * SAFE_SCAN_SISPAG_CLASSIFICACAO_HOOK_D2_R1S4
     *
     * Ponte React para a decisão humana puramente em memória.
     * ============================================================
     */
    const definirClassificacaoFinanceiraSispag =
        useCallback(
            (
                indiceItem,
                tipoEvidencia
            ) => {
                if (
                    !montadoRef.current
                ) {
                    return;
                }

                setEstado(
                    (atual) => {
                        if (
                            atual?.processando ||
                            !atual?.resultado
                        ) {
                            return atual;
                        }

                        const resultadoAtualizado =
                            aplicarClassificacaoFinanceiraSispagUploadMassa({
                                resultado:
                                    atual.resultado,

                                indiceItem,

                                tipoEvidencia,
                            });

                        if (
                            resultadoAtualizado ===
                            atual.resultado
                        ) {
                            return atual;
                        }

                        return {
                            ...atual,

                            resultado:
                                resultadoAtualizado,
                        };
                    }
                );
            },
            []
        );
    const executarPersistenciaPrincipalControlada =
        useCallback(
            async ({
                /*
                 * SAFE_SCAN_UPLOAD_MASSA_HOOK_ALVO_UNICO_V1
                 *
                 * Sem alvo documental explícito:
                 * zero execução.
                 */
                alvo =
                    null,

                interromperNoErro =
                    true,
            } = {}) => {
                if (
                    !montadoRef.current ||
                    estado?.processando ||
                    !estado?.resultado
                ) {
                    return null;
                }

                return executarPlanoPersistenciaPrincipalUploadMassa({
                    resultado:
                        estado.resultado,

                    executarPersistencia:
                        executorPersistenciaPrincipal,

                    validarPreflightAntesPersistencia:
                        validarPreflightPersistenciaPrincipal,

                    auditarFalhaPersistencia:
                        auditorPersistenciaPrincipal,

                    habilitado:
                        habilitarPersistenciaPrincipal ===
                        true,

                    alvo,

                    interromperNoErro,
                });
            },
            [
                estado.processando,
                estado.resultado,
                executorPersistenciaPrincipal,
                validarPreflightPersistenciaPrincipal,
                auditorPersistenciaPrincipal,
                habilitarPersistenciaPrincipal,
            ]
        );

    /*
     * ============================================================
     * SAFE_SCAN_UPLOAD_MASSA_HOOK_LOTE_CONTROLADO_V1
     *
     * Ponte React para o pipeline multidocumento já testado.
     *
     * Não substitui o executor unitário.
     * Não abre gate.
     * Não altera resultado.
     * Não executa sem resultado concluído.
     * ============================================================
     */
    const executarPersistenciaPrincipalLoteControlado =
        useCallback(
            async ({
                interromperNoErro =
                    false,
            } = {}) => {
                if (
                    !montadoRef.current ||
                    estado?.processando ||
                    !estado?.resultado
                ) {
                    return null;
                }

                const plano =
                    criarPlanoPersistenciaPrincipalUploadMassa({
                        resultado:
                            estado.resultado,
                    });

                const fila =
                    criarFilaAlvosPersistenciaPrincipalUploadMassa({
                        plano,
                    });

                return executarFilaViaExecutorUnitarioUploadMassa({
                    resultado:
                        estado.resultado,

                    fila,

                    executarPersistencia:
                        executorPersistenciaPrincipal,

                    validarPreflightAntesPersistencia:
                        validarPreflightPersistenciaPrincipal,

                    auditarFalhaPersistencia:
                        auditorPersistenciaPrincipal,

                    habilitado:
                        habilitarPersistenciaPrincipal ===
                        true,

                    interromperNoErro,
                });
            },
            [
                estado.processando,
                estado.resultado,
                executorPersistenciaPrincipal,
                validarPreflightPersistenciaPrincipal,
                auditorPersistenciaPrincipal,
                habilitarPersistenciaPrincipal,
            ]
        );
    const processarArquivos =
        useCallback(
            async (
                arquivos,
                {
                    dataReferencia =
                        new Date(),
                } = {}
            ) => {
                const lista =
                    normalizarListaArquivos(
                        arquivos
                    );

                /*
                 * SAFE_SCAN_AUTORIZACAO_COMPLEMENTAR_RESET_NOVO_LOTE_D2_R1T_R4B
                 *
                 * Todo novo processamento nasce sem decisões
                 * herdadas do lote anterior.
                 */
                if (
                    montadoRef.current
                ) {
                    /*
                     * SAFE_SCAN_SNAPSHOT_ARQUIVOS_ORIGINAIS_NOVO_LOTE_D2_R1T_R4F
                     */
                    setArquivosOriginaisLote(
                        Object.freeze(
                            [
                                ...lista,
                            ]
                        )
                    );

                    setEstadoAutorizacaoComplementar(
                        criarEstadoAutorizacaoComplementarUploadMassa()
                    );
                }

                if (!lista.length) {
                    if (
                        montadoRef.current
                    ) {
                        setEstado({
                            ...criarEstadoInicial(),

                            status:
                                CERTIDAO_UPLOAD_MASSA_ESTADO
                                    .FALHA,

                            erro:
                                "Selecione pelo menos um PDF para iniciar a análise.",
                        });
                    }

                    return null;
                }

                const controllerAnterior =
                    abortControllerRef
                        .current;

                if (
                    controllerAnterior &&
                    !controllerAnterior
                        .signal
                        .aborted
                ) {
                    controllerAnterior
                        .abort();
                }

                const operacaoId =
                    operacaoRef.current +
                    1;

                operacaoRef.current =
                    operacaoId;

                const controller =
                    new AbortController();

                abortControllerRef
                    .current =
                    controller;

                const {
                    signal,
                } =
                    controller;

                if (
                    montadoRef.current
                ) {
                    setEstado({
                        documentosAtuaisComplementar:
                            [],

                        status:
                            CERTIDAO_UPLOAD_MASSA_ESTADO
                                .PREPARANDO_EMPRESAS,

                        processando:
                            true,

                        progresso: {
                            status:
                                "PREPARANDO_EMPRESAS",

                            percentual:
                                0,

                            indice:
                                -1,

                            total:
                                lista.length,

                            processados:
                                0,

                            nomeArquivo:
                                "",

                            mensagem:
                                "Preparando empresas e CNPJs vinculados para análise do lote.",
                        },

                        resultado:
                            null,

                        resumo:
                            null,

                        erro:
                            "",

                        operacaoId,
                    });
                }

                try {
                    const empresasPreparadas =
                        await prepararEmpresasParaLote({
                            supabase,
                            empresas,
                            signal,
                        });

                    if (
                        !operacaoAindaValida(
                            operacaoId,
                            signal
                        )
                    ) {
                        return null;
                    }

                    setEstado(
                        (atual) => ({
                            ...atual,

                            status:
                                CERTIDAO_UPLOAD_MASSA_ESTADO
                                    .PROCESSANDO,

                            progresso: {
                                status:
                                    "INICIANDO_LOTE",

                                percentual:
                                    0,

                                indice:
                                    -1,

                                total:
                                    lista.length,

                                processados:
                                    0,

                                nomeArquivo:
                                    "",

                                mensagem:
                                    `Empresas preparadas. Iniciando análise de ${lista.length} documento(s).`,
                            },
                        })
                    );

                    const snapshotColaboradoresCert2 =
                        await consultarSnapshotColaboradoresCert2R11({
                            supabase,
                            signal,

                            colaboradoresContexto:
                                colaboradores,
                        });

                    if (
                        !operacaoAindaValida(
                            operacaoId,
                            signal
                        )
                    ) {
                        return null;
                    }

                    const resultadoLocal =
                        await processarArquivosCertidaoEmLote({
                            arquivos:
                                lista,

                            empresas:
                                empresasPreparadas,

                            colaboradores:
                                snapshotColaboradoresCert2
                                    .colaboradores,

                            estadoConsultaColaboradores:
                                snapshotColaboradoresCert2
                                    .status,

                            detalheConsultaColaboradores:
                                snapshotColaboradoresCert2
                                    .detalhe,

                            /*
                             * Não recebemos competencia da página.
                             *
                             * O mês aberto nunca é usado como
                             * fallback do upload em massa.
                             */
                            dataReferencia,

                            signal,

                            onProgress:
                                (
                                    progresso
                                ) => {
                                    if (
                                        !operacaoAindaValida(
                                            operacaoId,
                                            signal
                                        )
                                    ) {
                                        return;
                                    }

                                    setEstado(
                                        (atual) => ({
                                            ...atual,

                                            status:
                                                CERTIDAO_UPLOAD_MASSA_ESTADO
                                                    .PROCESSANDO,

                                            processando:
                                                true,

                                            progresso,
                                        })
                                    );
                                },
                        });

                    if (
                        !operacaoAindaValida(
                            operacaoId,
                            signal
                        )
                    ) {
                        return null;
                    }

                    /*
                     * O motor local terminou, mas o preview ainda não
                     * pode ser liberado antes da conferência de hash
                     * contra versões já persistidas.
                     */
                    if (
                        !operacaoAindaValida(
                            operacaoId,
                            signal
                        )
                    ) {
                        return null;
                    }

                    setEstado(
                        (atual) => ({
                            ...atual,

                            status:
                                CERTIDAO_UPLOAD_MASSA_ESTADO
                                    .PROCESSANDO,

                            processando:
                                true,

                            progresso: {
                                ...(
                                    atual.progresso ||
                                    {}
                                ),

                                status:
                                    "CONSULTANDO_HISTORICO",

                                percentual:
                                    100,

                                total:
                                    lista.length,

                                processados:
                                    lista.length,

                                nomeArquivo:
                                    "",

                                mensagem:
                                    "Verificando se algum PDF já existe no histórico documental.",
                            },
                        })
                    );

                    const versoesHistorico =
                        await consultarVersoesDuplicadasUploadHistorico({
                            supabase,

                            resultado:
                                resultadoLocal,

                            signal,
                        });

                    if (
                        !operacaoAindaValida(
                            operacaoId,
                            signal
                        )
                    ) {
                        return null;
                    }

                    const resultadoGuardHistorico =
                        aplicarGuardDuplicidadeExataHistorico({
                            itens:
                                resultadoLocal
                                    ?.itens ||
                                [],

                            versoes:
                                versoesHistorico,
                        });

                    const resultadoAposDuplicidade = {
                        ...resultadoLocal,

                        ...resultadoGuardHistorico,

                        persistenciaExecutada:
                            false,
                    };

                    if (
                        !operacaoAindaValida(
                            operacaoId,
                            signal
                        )
                    ) {
                        return null;
                    }

                    const documentosAtuaisConflito =
                        await consultarDocumentosAtuaisConflitoLogicoUpload({
                            supabase,

                            resultado:
                                resultadoAposDuplicidade,

                            signal,
                        });

                    if (
                        !operacaoAindaValida(
                            operacaoId,
                            signal
                        )
                    ) {
                        return null;
                    }

                    const resultadoConflitoLogico =
                        aplicarGuardConflitoLogicoHistorico({
                            itens:
                                resultadoAposDuplicidade
                                    ?.itens ||
                                [],

                            documentosAtuais:
                                documentosAtuaisConflito,
                        });

                    const resultado = {
                        ...resultadoLocal,

                        ...resultadoGuardHistorico,

                        ...resultadoConflitoLogico,

                        persistenciaExecutada:
                            false,
                    };

                    abortControllerRef
                        .current =
                        null;

                    setEstado({
                        documentosAtuaisComplementar:
                            Array.isArray(
                                documentosAtuaisConflito
                            )
                                ? [
                                    ...documentosAtuaisConflito,
                                ]
                                : [],

                        status:
                            CERTIDAO_UPLOAD_MASSA_ESTADO
                                .CONCLUIDO,

                        processando:
                            false,

                        progresso: {
                            status:
                                "CONCLUIDO_LOTE",

                            percentual:
                                100,

                            indice:
                                lista.length -
                                1,

                            total:
                                lista.length,

                            processados:
                                lista.length,

                            nomeArquivo:
                                "",

                            mensagem:
                                "Análise do lote concluída e pronta para revisão.",
                        },

                        resultado,

                        resumo:
                            resultado
                                ?.resumo ||
                            null,

                        erro:
                            "",

                        operacaoId,
                    });

                    return resultado;
                }
                catch (erro) {
                    if (
                        !montadoRef.current ||
                        operacaoRef.current !==
                            operacaoId
                    ) {
                        return null;
                    }

                    abortControllerRef
                        .current =
                        null;

                    const cancelado =
                        Boolean(
                            signal.aborted ||
                            erro?.name ===
                                "AbortError" ||
                            erro?.codigo ===
                                "CERTIDAO_UPLOAD_MASSA_CANCELADO"
                        );

                    setEstado({
                        status:
                            cancelado
                                ? CERTIDAO_UPLOAD_MASSA_ESTADO
                                    .CANCELADO
                                : CERTIDAO_UPLOAD_MASSA_ESTADO
                                    .FALHA,

                        processando:
                            false,

                        progresso:
                            null,

                        resultado:
                            null,

                        resumo:
                            null,

                        erro:
                            cancelado
                                ? ""
                                : (
                                    textoSeguro(
                                        erro?.message
                                    ) ||
                                    "Não foi possível analisar o lote documental."
                                ),

                        operacaoId,
                    });

                    if (cancelado) {
                        return null;
                    }

                    throw erro;
                }
            },
            [
                colaboradores,
                empresas,
                operacaoAindaValida,
                supabase,
            ]
        );

    /*
     * SAFE_SCAN_COMPLEMENTAR_HOOK_READ_ONLY_D2_R1T_R2A_R3
     *
     * Derivação pura.
     * Sem I/O.
     * Sem executor.
     * Sem autorização de persistência.
     */
    const {
        documentosAtuaisComplementar:
            documentosAtuaisComplementarInternos =
                [],

        ...estadoPublico
    } =
        estado;

    /*
     * SAFE_SCAN_AUTORIZACAO_COMPLEMENTAR_DERIVACAO_D2_R1T_R4B
     *
     * Dois níveis independentes:
     *
     * 1. plano estrutural complementar;
     * 2. decisão humana exclusivamente em memória.
     *
     * Nenhum deles executa persistência.
     */
    const planoComplementarIndividual =
        useMemo(
            () =>
                criarPlanoComplementarIndividualUploadMassa({
                    resultado:
                        estado.resultado,

                    documentosAtuais:
                        Array.isArray(
                            documentosAtuaisComplementarInternos
                        )
                            ? documentosAtuaisComplementarInternos
                            : [],
                }),
            [
                estado.resultado,
                documentosAtuaisComplementarInternos,
            ]
        );

    const planoAutorizacaoComplementar =
        useMemo(
            () =>
                criarPlanoAutorizacaoComplementarUploadMassa({
                    planoComplementarIndividual,

                    estadoAutorizacao:
                        estadoAutorizacaoComplementar,
                }),
            [
                planoComplementarIndividual,
                estadoAutorizacaoComplementar,
            ]
        );

    /*
     * SAFE_SCAN_DRY_RUN_COMPLEMENTAR_DERIVACAO_D2_R1T_R4F
     *
     * Somente memória.
     * Nenhum executor ou persistência.
     */
    const planoExecucaoComplementarDryRun =
        useMemo(
            () =>
                criarPlanoExecucaoComplementarDryRun({
                    planoComplementarIndividual,

                    planoAutorizacaoComplementar,

                    arquivosOriginais:
                        arquivosOriginaisLote,
                }),
            [
                planoComplementarIndividual,
                planoAutorizacaoComplementar,
                arquivosOriginaisLote,
            ]
        );

    /*
     * SAFE_SCAN_AUTORIZACAO_COMPLEMENTAR_CALLBACKS_D2_R1T_R4B
     *
     * API pública do Hook, ainda sem consumo pelo Panel.
     */
    const definirDecisaoAutorizacaoComplementar =
        useCallback(
            (
                indiceItem,
                decisao
            ) => {
                if (
                    !montadoRef.current ||
                    estado.processando
                ) {
                    return;
                }

                const indice =
                    Number(
                        indiceItem
                    );

                if (
                    !Number.isInteger(
                        indice
                    )
                ) {
                    return;
                }

                const itemPlano =
                    (
                        Array.isArray(
                            planoComplementarIndividual
                                ?.itens
                        )
                            ? planoComplementarIndividual
                                .itens
                            : []
                    ).find(
                        (item) =>
                            Number(
                                item?.indice
                            ) ===
                            indice
                    ) ||
                    null;

                if (!itemPlano) {
                    return;
                }

                setEstadoAutorizacaoComplementar(
                    (atual) =>
                        aplicarDecisaoAutorizacaoComplementarUploadMassa({
                            estadoAutorizacao:
                                atual,

                            itemPlano,

                            decisao,
                        })
                );
            },
            [
                estado.processando,
                planoComplementarIndividual,
            ]
        );

    const limparDecisaoAutorizacaoComplementar =
        useCallback(
            (
                indiceItem
            ) => {
                if (
                    !montadoRef.current ||
                    estado.processando
                ) {
                    return;
                }

                const indice =
                    Number(
                        indiceItem
                    );

                if (
                    !Number.isInteger(
                        indice
                    )
                ) {
                    return;
                }

                setEstadoAutorizacaoComplementar(
                    (atual) =>
                        limparDecisaoAutorizacaoComplementarUploadMassa({
                            estadoAutorizacao:
                                atual,

                            indice,
                        })
                );
            },
            [
                estado.processando,
            ]
        );

    /*
     * ============================================================
     * SAFE_SCAN_F2_CALLBACK_DESTINO_COMPLEMENTAR_READ_ONLY
     *
     * Consulta explícita e stateless.
     *
     * Não usa useEffect.
     * Não possui useState próprio.
     * Não chama setState.
     * Não executa RPC.
     * Não acessa Storage.
     * ============================================================
     */
    const consultarDestinosComplementaresReadOnly =
        useCallback(
            async ({
                planoDryRun =
                    planoExecucaoComplementarDryRun,

                resultado =
                    estado.resultado,
            } = {}) => {
                const itensDryRun =
                    Array.isArray(
                        planoDryRun?.itens
                    )
                        ? planoDryRun.itens
                        : [];

                const candidatos =
                    itensDryRun.filter(
                        (item) =>
                            item?.estado ===
                            "CANDIDATO_ESTRUTURAL"
                    );

                const criarResumo =
                    (
                        itensResolvidos,
                        consultasExecutadas
                    ) => {
                        const lista =
                            Array.isArray(
                                itensResolvidos
                            )
                                ? itensResolvidos
                                : [];

                        const contar =
                            (destino) =>
                                lista.filter(
                                    (item) =>
                                        item?.destino ===
                                        destino
                                ).length;

                        return Object.freeze({
                            totalCandidatos:
                                candidatos.length,

                            resolvidos:
                                lista.length,

                            novaEvidencia:
                                contar(
                                    "NOVA_EVIDENCIA"
                                ),

                            backfillEvidenciaExistente:
                                contar(
                                    "BACKFILL_EVIDENCIA_EXISTENTE"
                                ),

                            jaAssociada:
                                contar(
                                    "JA_ASSOCIADA"
                                ),

                            bloqueados:
                                contar(
                                    "BLOQUEADO"
                                ),

                            consultasExecutadas:
                                consultasExecutadas,
                        });
                    };

                if (!candidatos.length) {
                    return Object.freeze({
                        somenteLeitura:
                            true,

                        status:
                            "SEM_CANDIDATOS",

                        erro:
                            "",

                        itens:
                            Object.freeze(
                                []
                            ),

                        resumo:
                            criarResumo(
                                [],
                                0
                            ),

                        executavel:
                            false,

                        autorizadoPersistir:
                            false,

                        persistenciaExecutada:
                            false,

                        chamouRpc:
                            false,

                        chamouStorage:
                            false,
                    });
                }

                let consultasExecutadas =
                    0;

                try {
                    const itensResultado =
                        Array.isArray(
                            resultado?.itens
                        )
                            ? resultado.itens
                            : [];

                    const contextos =
                        candidatos.map(
                            (candidato) => {
                                const indice =
                                    Number(
                                        candidato?.indice
                                    );

                                const itemResultado =
                                    itensResultado.find(
                                        (
                                            item,
                                            posicao
                                        ) => {
                                            const indiceResultado =
                                                Number.isInteger(
                                                    item?.indice
                                                )
                                                    ? item.indice
                                                    : posicao;

                                            return (
                                                indiceResultado ===
                                                indice
                                            );
                                        }
                                    ) ||
                                    null;

                                /*
                                 * SHA já calculado pelo motor.
                                 * Zero recálculo.
                                 */
                                const hashSha256 =
                                    textoSeguro(
                                        itemResultado
                                            ?.hash
                                            ?.sha256
                                    ).toLowerCase();

                                const itemId =
                                    textoSeguro(
                                        candidato
                                            ?.payloadIntencao
                                            ?.itemId
                                    );

                                /*
                                 * Preflight puro.
                                 *
                                 * Se estrutura/hash forem inválidos,
                                 * não há motivo para consultar banco.
                                 */
                                const preflight =
                                    resolverDestinoEvidenciaComplementarUploadMassa({
                                        candidatoDryRun:
                                            candidato,

                                        hashSha256,

                                        evidenciasAtivas:
                                            [],
                                    });

                                return {
                                    candidato,
                                    hashSha256,
                                    itemId,
                                    preflight,
                                };
                            }
                        );

                    const itemIdsParaConsulta =
                        [
                            ...new Set(
                                contextos
                                    .filter(
                                        ({
                                            itemId,
                                            preflight,
                                        }) =>
                                            Boolean(
                                                itemId &&
                                                preflight
                                                    ?.destino !==
                                                    "BLOQUEADO"
                                            )
                                    )
                                    .map(
                                        ({
                                            itemId,
                                        }) =>
                                            itemId
                                    )
                            ),
                        ];

                    const evidenciasPorItem =
                        new Map();

                    for (
                        const itemId
                        of itemIdsParaConsulta
                    ) {
                        const evidencias =
                            await listarEvidenciasAtivasCertidaoMensal({
                                itemId,

                                clienteSupabase:
                                    supabase,
                            });

                        consultasExecutadas +=
                            1;

                        evidenciasPorItem.set(
                            itemId,
                            Array.isArray(
                                evidencias
                            )
                                ? evidencias
                                : []
                        );
                    }

                    const resolvidos =
                        contextos.map(
                            ({
                                candidato,
                                hashSha256,
                                itemId,
                                preflight,
                            }) => {
                                if (
                                    preflight
                                        ?.destino ===
                                    "BLOQUEADO"
                                ) {
                                    return preflight;
                                }

                                return resolverDestinoEvidenciaComplementarUploadMassa({
                                    candidatoDryRun:
                                        candidato,

                                    hashSha256,

                                    evidenciasAtivas:
                                        evidenciasPorItem
                                            .get(
                                                itemId
                                            ) ||
                                        [],
                                });
                            }
                        );

                    return Object.freeze({
                        somenteLeitura:
                            true,

                        status:
                            "CONCLUIDO",

                        erro:
                            "",

                        itens:
                            Object.freeze([
                                ...resolvidos,
                            ]),

                        resumo:
                            criarResumo(
                                resolvidos,
                                consultasExecutadas
                            ),

                        executavel:
                            false,

                        autorizadoPersistir:
                            false,

                        persistenciaExecutada:
                            false,

                        chamouRpc:
                            false,

                        chamouStorage:
                            false,
                    });
                }
                catch (error) {
                    /*
                     * Falha de SELECT é fail-closed.
                     *
                     * Nunca converter falha de leitura em
                     * "não existe evidência".
                     */
                    return Object.freeze({
                        somenteLeitura:
                            true,

                        status:
                            "FALHA_LEITURA",

                        erro:
                            textoSeguro(
                                error?.message
                            ) ||
                            "Não foi possível consultar as evidências complementares existentes.",

                        itens:
                            Object.freeze(
                                []
                            ),

                        resumo:
                            criarResumo(
                                [],
                                consultasExecutadas
                            ),

                        executavel:
                            false,

                        autorizadoPersistir:
                            false,

                        persistenciaExecutada:
                            false,

                        chamouRpc:
                            false,

                        chamouStorage:
                            false,
                    });
                }
            },
            [
                planoExecucaoComplementarDryRun,
                estado.resultado,
                supabase,
            ]
        );
    /*
     * ============================================================
     * SAFE_SCAN_COMPLEMENTAR_FLUXO_COMBINADO_R5
     *
     * Ação única da revisão:
     *
     * PRINCIPAIS
     *     ↓
     * resolve itemId da Folha
     *     ↓
     * rederiva complementares
     *     ↓
     * preflight read-only
     *     ↓
     * somente NOVA_EVIDENCIA
     *
     * BACKFILL nunca é executado aqui.
     * JA_ASSOCIADA nunca duplica.
     * BLOQUEADO nunca executa.
     * ============================================================
     */
    // ============================================================
    // SAFE_SCAN_REVISAR_DOCUMENTO_SALVO_WRITE_R10
    //
    // Corrige SOMENTE o diagnóstico da versão histórica existente.
    // O PDF, SHA, Storage, item e número da versão são preservados.
    // ============================================================
    const salvarAnaliseCorrigidaDocumentoSalvo =
        useCallback(
            async ({
                versaoId,
            } = {}) => {
                /*
                 * SAFE_SCAN_CERT2_M2_A3_REVISAO_SINGLE_FLIGHT_EXECUTOR
                 *
                 * Segunda invocação simultânea falha aqui,
                 * antes de alcançar a RPC de escrita.
                 */
                return revisaoHistoricaSingleFlightRef
                    .current
                    .executar(
                        async () => {
                if (
                    estado.processando
                ) {
                    throw new Error(
                        "Aguarde o processamento atual terminar antes de salvar a análise corrigida."
                    );
                }

                if (
                    !supabase ||
                    typeof supabase.rpc !==
                        "function"
                ) {
                    throw new Error(
                        "Cliente Supabase indisponível para salvar a análise corrigida."
                    );
                }

                const ehObjeto =
                    (valor) =>
                        Boolean(
                            valor &&
                            typeof valor ===
                                "object" &&
                            !Array.isArray(
                                valor
                            )
                        );

                const normalizarCompetencia =
                    (valor) => {
                        const texto =
                            textoSeguro(
                                valor
                            );

                        const correspondencia =
                            /^(\d{4})-(\d{2})(?:-\d{2})?$/
                                .exec(
                                    texto
                                );

                        return correspondencia
                            ? (
                                correspondencia[1] +
                                "-" +
                                correspondencia[2] +
                                "-01"
                            )
                            : texto;
                    };

                const normalizarJsonComparavel =
                    (valor) => {
                        if (
                            Array.isArray(
                                valor
                            )
                        ) {
                            return valor.map(
                                normalizarJsonComparavel
                            );
                        }

                        if (
                            ehObjeto(
                                valor
                            )
                        ) {
                            return Object
                                .keys(
                                    valor
                                )
                                .sort()
                                .reduce(
                                    (
                                        acumulado,
                                        chave
                                    ) => {
                                        acumulado[chave] =
                                            normalizarJsonComparavel(
                                                valor[chave]
                                            );

                                        return acumulado;
                                    },
                                    {}
                                );
                        }

                        return valor;
                    };

                const jsonEquivalente =
                    (
                        primeiro,
                        segundo
                    ) => {
                        try {
                            return (
                                JSON.stringify(
                                    normalizarJsonComparavel(
                                        primeiro
                                    )
                                ) ===
                                JSON.stringify(
                                    normalizarJsonComparavel(
                                        segundo
                                    )
                                )
                            );
                        }
                        catch {
                            return false;
                        }
                    };

                const versaoAlvo =
                    textoSeguro(
                        versaoId
                    );

                if (
                    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
                        versaoAlvo
                    )
                ) {
                    throw new Error(
                        "Versão histórica inválida para revisão."
                    );
                }

                const itens =
                    Array.isArray(
                        estado
                            ?.resultado
                            ?.itens
                    )
                        ? estado.resultado.itens
                        : [];

                const itemAlvo =
                    itens.find(
                        (item) =>
                            textoSeguro(
                                item
                                    ?.duplicidade
                                    ?.codigo
                            ) ===
                                "DUPLICADO_EXATO_HISTORICO" &&
                            textoSeguro(
                                item
                                    ?.duplicidade
                                    ?.historico
                                    ?.versaoId
                            ) ===
                                versaoAlvo
                    ) ||
                    null;

                if (!itemAlvo) {
                    throw new Error(
                        "O documento histórico não está mais disponível no resultado atual do lote."
                    );
                }

                /*
                 * ========================================================
                 * SAFE_SCAN_CERT2_M3_A7_REVISAO_USA_SNAPSHOT_SINGULAR
                 *
                 * itemAlvo:
                 * - permanece como fonte dos metadados históricos;
                 * - permanece como fonte da identidade protegida;
                 * - permanece no optimistic guard.
                 *
                 * itemSingularAlvo:
                 * - é usado SOMENTE para gerar o novo diagnóstico
                 *   analítico.
                 *
                 * Nenhum fallback para o item pós-lote é permitido.
                 * ========================================================
                 */
                const itensSingulares =
                    Array.isArray(
                        estado
                            ?.resultado
                            ?.itensSingulares
                    )
                        ? estado.resultado.itensSingulares
                        : [];

                const itemSingularAlvo =
                    resolverItemSingularRevisaoHistorica({
                        itensSingulares,
                        itemAlvo,
                    });

                const historico =
                    itemAlvo
                        ?.duplicidade
                        ?.historico ||
                    {};

                const payloadHistorico =
                    ehObjeto(
                        historico?.payload
                    )
                        ? historico.payload
                        : {};

                const diagnosticoEsperado =
                    ehObjeto(
                        historico?.diagnostico
                    )
                        ? historico.diagnostico
                        : ehObjeto(
                            payloadHistorico
                                ?.diagnostico
                        )
                            ? payloadHistorico.diagnostico
                            : null;

                if (
                    !diagnosticoEsperado
                ) {
                    throw new Error(
                        "O diagnóstico histórico não está disponível para o optimistic guard da revisão."
                    );
                }

                const itemId =
                    textoSeguro(
                        historico?.itemId
                    );

                const numeroVersao =
                    Number(
                        historico?.numeroVersao
                    );

                const empresaId =
                    textoSeguro(
                        itemAlvo
                            ?.resolucao
                            ?.empresa
                            ?.id
                    );

                const competenciaIso =
                    normalizarCompetencia(
                        itemAlvo
                            ?.resolucao
                            ?.destino
                            ?.competenciaIso
                    );

                const tipoDocumento =
                    textoSeguro(
                        itemAlvo
                            ?.resolucao
                            ?.tipoDocumento
                    ).toLowerCase();

                const hashSha256 =
                    normalizarHashUploadHistorico(
                        itemAlvo
                            ?.duplicidade
                            ?.hashSha256 ||
                        itemAlvo
                            ?.hash
                            ?.sha256
                    );

                const statusResultado =
                    textoSeguro(
                        historico
                            ?.statusResultado
                    );

                if (
                    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
                        itemId
                    ) ||
                    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
                        empresaId
                    ) ||
                    !/^\d{4}-(0[1-9]|1[0-2])-01$/.test(
                        competenciaIso
                    ) ||
                    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(
                        tipoDocumento
                    ) ||
                    !/^[a-f0-9]{64}$/.test(
                        hashSha256
                    ) ||
                    !Number.isInteger(
                        numeroVersao
                    ) ||
                    numeroVersao <= 0 ||
                    !statusResultado
                ) {
                    throw new Error(
                        "A identidade protegida da versão histórica está incompleta. A correção foi bloqueada."
                    );
                }

                const empresaSalvaId =
                    textoSeguro(
                        payloadHistorico
                            ?.empresa
                            ?.id
                    );

                const competenciaSalva =
                    normalizarCompetencia(
                        payloadHistorico
                            ?.competencia
                    );

                const tipoSalvo =
                    textoSeguro(
                        payloadHistorico
                            ?.item
                            ?.tipoDocumento ||
                        diagnosticoEsperado
                            ?.classificacao
                            ?.tipoDocumento
                    ).toLowerCase();

                if (
                    (
                        empresaSalvaId &&
                        empresaSalvaId !==
                            empresaId
                    ) ||
                    (
                        competenciaSalva &&
                        competenciaSalva !==
                            competenciaIso
                    ) ||
                    (
                        tipoSalvo &&
                        tipoSalvo !==
                            tipoDocumento
                    )
                ) {
                    throw new Error(
                        "A análise atual mudou empresa, competência ou tipo documental. Esta é uma revisão estrutural e não pode ser aplicada por este fluxo."
                    );
                }

                const diagnosticoAtual =
                    criarDiagnosticoPersistencia(
                        itemSingularAlvo
                    );

                /*
                 * O guard SHA altera resolucao.status para BLOQUEADO.
                 * Não persistimos esse estado operacional como diagnóstico.
                 *
                 * Atualizamos somente as áreas analíticas produzidas
                 * pelo analisador atual e preservamos resolucaoLote
                 * e qualquer metadado histórico adicional.
                 */
                const diagnosticoNovo = {
                    ...diagnosticoEsperado,

                    leitura:
                        diagnosticoAtual
                            ?.leitura ||
                        null,

                    classificacao:
                        diagnosticoAtual
                            ?.classificacao ||
                        null,

                    avaliacao:
                        diagnosticoAtual
                            ?.avaliacao ??
                        null,
                };

                const controladorRevisao =
                    typeof AbortController ===
                    "function"
                        ? new AbortController()
                        : null;

                let requisicaoRevisao =
                    supabase.rpc(
                        "revisar_certidao_mensal_versao_existente",
                        {
                            p_versao_id:
                                versaoAlvo,

                            p_item_id:
                                itemId,

                            p_numero_versao:
                                numeroVersao,

                            p_hash_sha256:
                                hashSha256,

                            p_empresa_id:
                                empresaId,

                            p_competencia:
                                competenciaIso,

                            p_tipo_documento:
                                tipoDocumento,

                            p_status_resultado_esperado:
                                statusResultado,

                            p_diagnostico_esperado:
                                diagnosticoEsperado,

                            p_diagnostico_novo:
                                diagnosticoNovo,
                        }
                    );

                if (
                    !controladorRevisao ||
                    typeof requisicaoRevisao
                        ?.abortSignal !==
                        "function"
                ) {
                    throw new Error(
                        "O cliente Supabase não oferece cancelamento seguro para esta revisão. A gravação foi bloqueada antes do envio."
                    );
                }

                requisicaoRevisao =
                    requisicaoRevisao
                        .abortSignal(
                            controladorRevisao
                                .signal
                        );

                const temporizadorRevisao =
                    setTimeout(
                        () => {
                            controladorRevisao
                                .abort();
                        },
                        20000
                    );

                let resposta =
                    null;

                let erroTransporte =
                    null;

                try {
                    resposta =
                        await requisicaoRevisao;
                }
                catch (error) {
                    erroTransporte =
                        error;
                }
                finally {
                    clearTimeout(
                        temporizadorRevisao
                    );
                }

                const respostaExpirou =
                    controladorRevisao
                        .signal
                        .aborted ===
                    true;

                let retorno =
                    null;

                if (
                    respostaExpirou
                ) {
                    /*
                     * SAFE_SCAN_REVISAR_DOCUMENTO_SALVO_RECONCILIACAO_R14_B1
                     *
                     * O abort do cliente nao comprova rollback no servidor.
                     * Portanto, depois do timeout da unica chamada de escrita,
                     * fazemos SOMENTE leituras por uma janela limitada.
                     *
                     * Nao existe retry automatico da RPC de escrita.
                     */
                    const prazoConfirmacao =
                        Date.now() +
                        15000;

                    /*
                     * SAFE_SCAN_CERT2_M2_A4_RECONCILIACAO_LIMITADA
                     *
                     * A reconciliação continua estritamente read-only.
                     *
                     * Limite físico:
                     * - no máximo 6 ciclos;
                     * - 2 SELECTs paralelos por ciclo;
                     * - no máximo 12 leituras por operação expirada.
                     *
                     * Nenhuma nova RPC de escrita é disparada.
                     */
                    const maxTentativasConfirmacao =
                        6;

                    const intervaloTentativasConfirmacaoMs =
                        2500;

                    let tentativasConfirmacao =
                        0;

                    let conflitoAnalise =
                        false;

                    let ultimoErroConfirmacao =
                        null;

                    while (
                        Date.now() <
                        prazoConfirmacao &&
                        !retorno &&
                        tentativasConfirmacao <
                            maxTentativasConfirmacao
                    ) {
                        tentativasConfirmacao +=
                            1;

                        const controladorTentativa =
                            typeof AbortController ===
                            "function"
                                ? new AbortController()
                                : null;

                        if (!controladorTentativa) {
                            throw new Error(
                                "A resposta do salvamento expirou e a confirmação segura não está disponível. Reabra o documento antes de tentar novamente."
                            );
                        }

                        let consultaVersao =
                            supabase
                                .from(
                                    "certidao_mensal_versoes"
                                )
                                .select(
                                    "id,item_id,numero_versao,hash_sha256,status_resultado,diagnostico,payload"
                                )
                                .eq(
                                    "id",
                                    versaoAlvo
                                )
                                .eq(
                                    "item_id",
                                    itemId
                                )
                                .maybeSingle();

                        let consultaItem =
                            supabase
                                .from(
                                    "certidao_mensal_itens"
                                )
                                .select(
                                    "id,versao_atual_id,tipo_documento"
                                )
                                .eq(
                                    "id",
                                    itemId
                                )
                                .maybeSingle();

                        if (
                            typeof consultaVersao
                                ?.abortSignal !==
                                "function" ||
                            typeof consultaItem
                                ?.abortSignal !==
                                "function"
                        ) {
                            throw new Error(
                                "A resposta do salvamento expirou e o cliente não permite confirmar o resultado com timeout seguro. Reabra o documento antes de tentar novamente."
                            );
                        }

                        consultaVersao =
                            consultaVersao
                                .abortSignal(
                                    controladorTentativa
                                        .signal
                                );

                        consultaItem =
                            consultaItem
                                .abortSignal(
                                    controladorTentativa
                                        .signal
                                );

                        const temporizadorTentativa =
                            setTimeout(
                                () => {
                                    controladorTentativa
                                        .abort();
                                },
                                3000
                            );

                        let respostaVersao =
                            null;

                        let respostaItem =
                            null;

                        let erroTentativa =
                            null;

                        try {
                            [
                                respostaVersao,
                                respostaItem,
                            ] =
                                await Promise.all([
                                    consultaVersao,
                                    consultaItem,
                                ]);
                        }
                        catch (error) {
                            erroTentativa =
                                error;

                            ultimoErroConfirmacao =
                                error;
                        }
                        finally {
                            clearTimeout(
                                temporizadorTentativa
                            );
                        }

                        const leituraFalhou =
                            controladorTentativa
                                .signal
                                .aborted ===
                                true ||
                            Boolean(
                                erroTentativa
                            ) ||
                            Boolean(
                                respostaVersao
                                    ?.error
                            ) ||
                            Boolean(
                                respostaItem
                                    ?.error
                            ) ||
                            !respostaVersao
                                ?.data ||
                            !respostaItem
                                ?.data;

                        if (leituraFalhou) {
                            if (
                                Date.now() <
                                    prazoConfirmacao &&
                                tentativasConfirmacao <
                                    maxTentativasConfirmacao
                            ) {
                                await new Promise(
                                    (resolver) =>
                                        setTimeout(
                                            resolver,
                                            intervaloTentativasConfirmacaoMs
                                        )
                                );

                                continue;
                            }

                            break;
                        }

                        const versaoConfirmada =
                            respostaVersao
                                .data;

                        const itemConfirmado =
                            respostaItem
                                .data;

                        const identidadeBaseConfirmada =
                            textoSeguro(
                                versaoConfirmada
                                    ?.id
                            ) ===
                                versaoAlvo &&
                            textoSeguro(
                                versaoConfirmada
                                    ?.item_id
                            ) ===
                                itemId &&
                            Number(
                                versaoConfirmada
                                    ?.numero_versao
                            ) ===
                                numeroVersao &&
                            normalizarHashUploadHistorico(
                                versaoConfirmada
                                    ?.hash_sha256
                            ) ===
                                hashSha256 &&
                            textoSeguro(
                                versaoConfirmada
                                    ?.status_resultado
                            ) ===
                                statusResultado &&
                            textoSeguro(
                                itemConfirmado
                                    ?.id
                            ) ===
                                itemId &&
                            textoSeguro(
                                itemConfirmado
                                    ?.tipo_documento
                            )
                                .toLowerCase() ===
                                tipoDocumento;

                        if (!identidadeBaseConfirmada) {
                            conflitoAnalise =
                                true;

                            break;
                        }

                        /*
                         * SAFE_SCAN_REVISAO_ANALITICA_HISTORICA_A4
                         *
                         * A versao selecionada pode ser historica.
                         * versao_atual_id e apenas observado para
                         * rastreabilidade; nunca e requisito de sucesso
                         * e nunca e alterado por esta operacao.
                         */
                        const versaoEraAtual =
                            textoSeguro(
                                itemConfirmado
                                    ?.versao_atual_id
                            ) ===
                            versaoAlvo;

                        const diagnosticoNovoConfirmado =
                            jsonEquivalente(
                                versaoConfirmada
                                    ?.diagnostico,
                                diagnosticoNovo
                            ) &&
                            jsonEquivalente(
                                versaoConfirmada
                                    ?.payload
                                    ?.diagnostico,
                                diagnosticoNovo
                            );

                        if (diagnosticoNovoConfirmado) {
                            retorno = {
                                alterado:
                                    true,

                                versaoId:
                                    versaoAlvo,

                                itemId,

                                numeroVersao,

                                versaoEraAtual,

                                auditoriaId:
                                    "",

                                confirmadoAposTimeout:
                                    true,
                            };

                            break;
                        }

                        const diagnosticoAindaEsperado =
                            jsonEquivalente(
                                versaoConfirmada
                                    ?.diagnostico,
                                diagnosticoEsperado
                            ) &&
                            jsonEquivalente(
                                versaoConfirmada
                                    ?.payload
                                    ?.diagnostico,
                                diagnosticoEsperado
                            );

                        if (!diagnosticoAindaEsperado) {
                            conflitoAnalise =
                                true;

                            break;
                        }

                        if (
                            Date.now() <
                                prazoConfirmacao &&
                            tentativasConfirmacao <
                                maxTentativasConfirmacao
                        ) {
                            await new Promise(
                                (resolver) =>
                                    setTimeout(
                                        resolver,
                                        intervaloTentativasConfirmacaoMs
                                    )
                            );
                        }
                    }

                    if (conflitoAnalise) {
                        throw new Error(
                            "A análise salva mudou enquanto esta revisão estava aberta. Feche e reabra a comparação antes de tentar novamente."
                        );
                    }

                    if (!retorno) {
                        const detalheLeitura =
                            textoSeguro(
                                ultimoErroConfirmacao
                                    ?.message
                            );

                        throw new Error(
                            (
                                "O servidor não confirmou o salvamento dentro da janela de reconciliação. " +
                                "A gravação pode ter sido concluída; feche e reabra o documento antes de qualquer nova tentativa. " +
                                detalheLeitura
                            ).trim()
                        );
                    }
                }
                else {
                    if (
                        erroTransporte
                    ) {
                        throw erroTransporte;
                    }

                    if (
                        resposta?.error
                    ) {
                        throw new Error(
                            (
                                "Não foi possível salvar a análise corrigida. " +
                                textoSeguro(
                                    resposta
                                        .error
                                        ?.message
                                )
                            ).trim()
                        );
                    }

                    retorno =
                        Array.isArray(
                            resposta?.data
                        )
                            ? resposta.data[0]
                            : resposta?.data;
                }

                // SAFE_SCAN_CERT2_P15_NOOP_HOOK_FAIL_CLOSED
                // O estado local só pode assumir o novo diagnóstico depois
                // de confirmação explícita de alteração pela RPC.
                if (
                    retorno
                        ?.alterado !==
                    true
                ) {
                    throw new Error(
                        "O servidor não confirmou uma nova alteração. Feche e reabra a comparação antes de considerar a revisão atualizada."
                    );
                }

                /*
                 * Atualização local somente DEPOIS do RPC PASS.
                 * O item continua DUPLICADO_EXATO_HISTORICO / BLOQUEADO.
                 * Apenas o snapshot analítico histórico é atualizado.
                 */
                setEstado(
                    (atual) => {
                        const resultadoAtual =
                            atual?.resultado;

                        const itensAtuais =
                            Array.isArray(
                                resultadoAtual
                                    ?.itens
                            )
                                ? resultadoAtual.itens
                                : [];

                        let encontrou =
                            false;

                        const itensAtualizados =
                            itensAtuais.map(
                                (candidato) => {
                                    const historicoCandidato =
                                        candidato
                                            ?.duplicidade
                                            ?.historico;

                                    if (
                                        textoSeguro(
                                            historicoCandidato
                                                ?.versaoId
                                        ) !==
                                            versaoAlvo
                                    ) {
                                        return candidato;
                                    }

                                    encontrou =
                                        true;

                                    const payloadAnterior =
                                        ehObjeto(
                                            historicoCandidato
                                                ?.payload
                                        )
                                            ? historicoCandidato.payload
                                            : null;

                                    return {
                                        ...candidato,

                                        duplicidade: {
                                            ...candidato
                                                .duplicidade,

                                            historico: {
                                                ...historicoCandidato,

                                                diagnostico:
                                                    diagnosticoNovo,

                                                payload:
                                                    payloadAnterior
                                                        ? {
                                                            ...payloadAnterior,

                                                            diagnostico:
                                                                diagnosticoNovo,
                                                        }
                                                        : payloadAnterior,
                                            },
                                        },
                                    };
                                }
                            );

                        if (!encontrou) {
                            return atual;
                        }

                        return {
                            ...atual,

                            resultado: {
                                ...resultadoAtual,

                                itens:
                                    itensAtualizados,
                            },
                        };
                    }
                );

                return Object.freeze({
                    alterado:
                        retorno
                            ?.alterado ===
                        true,

                    versaoId:
                        textoSeguro(
                            retorno
                                ?.versaoId ||
                            versaoAlvo
                        ),

                    itemId:
                        textoSeguro(
                            retorno
                                ?.itemId ||
                            itemId
                        ),

                    numeroVersao:
                        Number(
                            retorno
                                ?.numeroVersao ||
                            numeroVersao
                        ) ||
                        numeroVersao,

                    auditoriaId:
                        textoSeguro(
                            retorno
                                ?.auditoriaId
                        ),

                    confirmadoAposTimeout:
                        retorno
                            ?.confirmadoAposTimeout ===
                        true,
                });
                        }
                    );
            },
            [
                estado.processando,
                estado.resultado,
                supabase,
            ]
        );
    // ============================================================
    // SAFE_SCAN_DUPLICADO_HISTORICO_OPEN_READ_ONLY_R6
    // ============================================================
    const criarUrlDocumentoHistoricoReadOnly =
        useCallback(
            async ({
                caminhoStorage,
            } = {}) => {
                const caminho =
                    textoSeguro(
                        caminhoStorage
                    );

                if (!caminho) {
                    throw new Error(
                        "O documento existente não possui caminho de Storage disponível."
                    );
                }

                return criarUrlAssinadaPdfCertidaoMensal({
                    caminhoStorage:
                        caminho,

                    duracaoSegundos:
                        600,
                });
            },
            []
        );

    return {
        ...estadoPublico,

        planoComplementarIndividual,

        planoAutorizacaoComplementar,

        planoExecucaoComplementarDryRun,

        consultarDestinosComplementaresReadOnly,

        salvarAnaliseCorrigidaDocumentoSalvo,

        criarUrlDocumentoHistoricoReadOnly,

        executarEvidenciaComplementarUploadMassaControlada:
            async () =>
                Object.freeze({
                    permitido:
                        false,

                    estado:
                        "BLOQUEADO",

                    codigo:
                        "GATE_PERSISTENCIA_COMPLEMENTAR_FECHADO",

                    indice:
                        null,

                    payload:
                        null,

                    chamouAdapter:
                        false,

                    persistenciaExecutada:
                        false,

                    quantidadeExecutada:
                        0,
                }),
        temResultado:
            Boolean(
                estado.resultado
            ),

        persistenciaPrincipalHabilitada:
            Boolean(
                habilitarPersistenciaPrincipal ===
                    true &&
                typeof executorPersistenciaPrincipal ===
                    "function"
            ),

        preflightPersistenciaPrincipalDisponivel:
            typeof validarPreflightPersistenciaPrincipal ===
            "function",

        auditoriaPersistenciaPrincipalDisponivel:
            typeof auditorPersistenciaPrincipal ===
            "function",

        executarPersistenciaPrincipalControlada,

        executarPersistenciaPrincipalLoteControlado,
        processarArquivos,

        definirDecisaoConflitoLogico,



        definirClassificacaoFinanceiraSispag,

        definirDecisaoAutorizacaoComplementar,

        limparDecisaoAutorizacaoComplementar,

        cancelar,

        limpar,
    };
}
