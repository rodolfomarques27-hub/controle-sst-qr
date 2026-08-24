/*
 * ============================================================
 * SAFE_SCAN_PLANO_COMPLEMENTAR_INDIVIDUAL_D2_R1T_R3
 *
 * Plano estrutural puro e somente em memória.
 *
 * ELEGIVEL significa:
 * - estrutura documental suficiente;
 * - colaborador cadastrado;
 * - natureza financeira conhecida;
 * - item principal resolvido.
 *
 * ELEGIVEL NÃO significa:
 * - autorização de persistência;
 * - execução;
 * - upload;
 * - abertura do R9.
 * ============================================================
 */

export const CERTIDAO_UPLOAD_MASSA_ESTADO_PLANO_COMPLEMENTAR =
    Object.freeze({
        ELEGIVEL:
            "ELEGIVEL",

        AGUARDAR_CLASSIFICACAO_FINANCEIRA:
            "AGUARDAR_CLASSIFICACAO_FINANCEIRA",

        AGUARDAR_ITEM_PRINCIPAL:
            "AGUARDAR_ITEM_PRINCIPAL",

        BLOQUEADO_COLABORADOR:
            "BLOQUEADO_COLABORADOR",

        FORA_ESCOPO_COMPLEMENTAR_INDIVIDUAL:
            "FORA_ESCOPO_COMPLEMENTAR_INDIVIDUAL",
    });

export const CERTIDAO_UPLOAD_MASSA_TIPO_EVIDENCIA_COMPLEMENTAR_INDIVIDUAL =
    Object.freeze({
        PAGAMENTO_SALARIAL:
            "PAGAMENTO_SALARIAL",

        ADIANTAMENTO_SALARIAL:
            "ADIANTAMENTO_SALARIAL",
    });

const TIPOS_EVIDENCIA_PERMITIDOS =
    new Set(
        Object.values(
            CERTIDAO_UPLOAD_MASSA_TIPO_EVIDENCIA_COMPLEMENTAR_INDIVIDUAL
        )
    );

const PADRAO_UUID =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PADRAO_COMPETENCIA =
    /^\d{4}-(0[1-9]|1[0-2])-01$/;

function textoSeguro(
    valor = ""
) {
    return String(
        valor ?? ""
    ).trim();
}

function normalizarUuid(
    valor = ""
) {
    const normalizado =
        textoSeguro(
            valor
        ).toLowerCase();

    return PADRAO_UUID.test(
        normalizado
    )
        ? normalizado
        : "";
}

function normalizarCompetencia(
    valor = ""
) {
    const normalizado =
        textoSeguro(
            valor
        );

    return PADRAO_COMPETENCIA.test(
        normalizado
    )
        ? normalizado
        : "";
}

function normalizarTipoEvidencia(
    valor = ""
) {
    return textoSeguro(
        valor
    ).toUpperCase();
}

function normalizarTipoDocumento(
    valor = ""
) {
    return textoSeguro(
        valor
    ).toLowerCase();
}

function obterVinculoFolha(
    item = null
) {
    return item
        ?.resolucao
        ?.vinculoFolha ||
        {};
}

function obterIdentificacaoColaborador(
    item = null
) {
    return item
        ?.resolucao
        ?.identificacaoColaborador ||
        item
            ?.identificacaoColaborador ||
        {};
}

function adicionarCandidato({
    candidatos,
    itemId,
    origem,
} = {}) {
    const id =
        normalizarUuid(
            itemId
        );

    if (!id) {
        return;
    }

    candidatos.push({
        itemId:
            id,

        origem:
            textoSeguro(
                origem
            ),
    });
}

function coletarItemPrincipalMemoria({
    itemPrincipal,
    candidatos,
} = {}) {
    const resolucao =
        itemPrincipal
            ?.resolucao ||
        {};

    const conflito =
        itemPrincipal
            ?.conflitoLogico ||
        resolucao
            ?.conflitoLogico ||
        {};

    adicionarCandidato({
        candidatos,

        itemId:
            itemPrincipal
                ?.historico
                ?.itemId ||
            itemPrincipal
                ?.historico
                ?.item_id,

        origem:
            "ITEM_PRINCIPAL_MEMORIA_HISTORICO",
    });

    adicionarCandidato({
        candidatos,

        itemId:
            resolucao
                ?.historico
                ?.itemId ||
            resolucao
                ?.historico
                ?.item_id,

        origem:
            "ITEM_PRINCIPAL_MEMORIA_HISTORICO",
    });

    adicionarCandidato({
        candidatos,

        itemId:
            conflito
                ?.documentoAtual
                ?.itemId ||
            conflito
                ?.documentoAtual
                ?.item_id,

        origem:
            "ITEM_PRINCIPAL_MEMORIA_CONFLITO",
    });
}

function coletarHistoricoDocumentosAtuais({
    documentosAtuais,
    empresaId,
    competencia,
    candidatos,
} = {}) {
    const documentos =
        Array.isArray(
            documentosAtuais
        )
            ? documentosAtuais
            : [];

    for (
        const documento of
        documentos
    ) {
        if (
            normalizarUuid(
                documento?.empresaId ||
                documento?.empresa_id
            ) !==
                empresaId ||
            normalizarCompetencia(
                documento?.competenciaIso ||
                documento?.competencia
            ) !==
                competencia ||
            normalizarTipoDocumento(
                documento?.tipoDocumento ||
                documento?.tipo_documento
            ) !==
                "folha-pagamento"
        ) {
            continue;
        }

        adicionarCandidato({
            candidatos,

            itemId:
                documento?.itemId ||
                documento?.item_id,

            origem:
                "HISTORICO_DOCUMENTOS_ATUAIS",
        });
    }
}

function coletarRetornoPersistenciaPrincipal({
    resultadoPersistenciaPrincipal,
    folhaIndice,
    candidatos,
} = {}) {
    const resultados =
        Array.isArray(
            resultadoPersistenciaPrincipal
        )
            ? resultadoPersistenciaPrincipal
            : Array.isArray(
                resultadoPersistenciaPrincipal
                    ?.resultados
            )
                ? resultadoPersistenciaPrincipal
                    .resultados
                : [];

    for (
        const resultado of
        resultados
    ) {
        if (
            Number(
                resultado?.indice
            ) !==
                folhaIndice ||
            resultado?.sucesso !==
                true
        ) {
            continue;
        }

        const retornosConhecidos = [
            resultado?.retorno,

            resultado
                ?.retorno
                ?.retorno,

            resultado
                ?.retorno
                ?.saidaUnitario
                ?.resultados?.[0]
                ?.retorno,
        ];

        for (
            const retorno of
            retornosConhecidos
        ) {
            adicionarCandidato({
                candidatos,

                itemId:
                    retorno
                        ?.registro
                        ?.itemId ||
                    retorno
                        ?.registro
                        ?.item_id,

                origem:
                    "RETORNO_PERSISTENCIA_PRINCIPAL",
            });
        }
    }
}

function normalizarFolhaIndice(
    valor
) {
    if (
        valor === null ||
        valor === undefined ||
        textoSeguro(
            valor
        ) ===
            ""
    ) {
        return null;
    }

    const indice =
        Number(
            valor
        );

    return (
        Number.isInteger(
            indice
        ) &&
        indice >= 0
    )
        ? indice
        : null;
}

function resolverItemPrincipal({
    itens,
    vinculoFolha,
    documentosAtuais,
    resultadoPersistenciaPrincipal,
} = {}) {
    const folhaIndice =
        normalizarFolhaIndice(
            vinculoFolha
                ?.folhaIndice
        );

    const empresaId =
        normalizarUuid(
            vinculoFolha
                ?.empresaId
        );

    const competencia =
        normalizarCompetencia(
            vinculoFolha
                ?.competenciaIso
        );

    const candidatos =
        [];

    if (
        folhaIndice !==
            null &&
        folhaIndice <
            itens.length
    ) {
        coletarItemPrincipalMemoria({
            itemPrincipal:
                itens[
                    folhaIndice
                ],

            candidatos,
        });
    }

    coletarHistoricoDocumentosAtuais({
        documentosAtuais,
        empresaId,
        competencia,
        candidatos,
    });

    if (
        folhaIndice !==
        null
    ) {
        coletarRetornoPersistenciaPrincipal({
            resultadoPersistenciaPrincipal,
            folhaIndice,
            candidatos,
        });
    }

    const porId =
        new Map();

    for (
        const candidato of
        candidatos
    ) {
        const existente =
            porId.get(
                candidato.itemId
            );

        if (existente) {
            existente.origens =
                [
                    ...new Set([
                        ...existente.origens,
                        candidato.origem,
                    ]),
                ];

            continue;
        }

        porId.set(
            candidato.itemId,
            {
                itemId:
                    candidato.itemId,

                origens: [
                    candidato.origem,
                ],
            }
        );
    }

    const unicos =
        Array.from(
            porId.values()
        );

    if (unicos.length === 1) {
        return {
            itemId:
                unicos[0].itemId,

            origem:
                unicos[0]
                    .origens
                    .join("+"),

            divergencia:
                false,

            candidatos:
                unicos,
        };
    }

    return {
        itemId:
            "",

        origem:
            "",

        divergencia:
            unicos.length > 1,

        candidatos:
            unicos,
    };
}

function criarBase({
    item,
    indice,
} = {}) {
    const vinculoFolha =
        obterVinculoFolha(
            item
        );

    return {
        indice,

        estado:
            CERTIDAO_UPLOAD_MASSA_ESTADO_PLANO_COMPLEMENTAR
                .FORA_ESCOPO_COMPLEMENTAR_INDIVIDUAL,

        codigo:
            "FORA_ESCOPO_COMPLEMENTAR_INDIVIDUAL",

        elegivelEstrutural:
            false,

        executavel:
            false,

        autorizadoPersistir:
            false,

        colaboradorId:
            "",

        empresaId:
            normalizarUuid(
                vinculoFolha
                    ?.empresaId
            ),

        competencia:
            normalizarCompetencia(
                vinculoFolha
                    ?.competenciaIso
            ),

        tipoEvidencia:
            normalizarTipoEvidencia(
                vinculoFolha
                    ?.tipoEvidencia ||
                item
                    ?.resolucao
                    ?.evidenciaComplementar
                    ?.tipo
            ),

        itemId:
            "",

        origemItemId:
            "",

        candidatosItemId:
            [],

        folha: {
            indice:
                normalizarFolhaIndice(
                    vinculoFolha
                        ?.folhaIndice
                ),

            hashSha256:
                textoSeguro(
                    vinculoFolha
                        ?.folhaHash
                ).toLowerCase(),
        },

        dadosComplementares:
            null,
    };
}

function avaliarItem({
    item,
    indice,
    itens,
    documentosAtuais,
    resultadoPersistenciaPrincipal,
} = {}) {
    const base =
        criarBase({
            item,
            indice,
        });

    const resolucao =
        item?.resolucao ||
        {};

    const vinculoFolha =
        obterVinculoFolha(
            item
        );

    const complementarIndividual =
        resolucao?.complementar ===
            true &&
        vinculoFolha?.associado ===
            true &&
        textoSeguro(
            vinculoFolha?.fonte
        ).toUpperCase() ===
            "VINCULO_FOLHA_LOTE";

    if (!complementarIndividual) {
        return base;
    }

    if (
        resolucao
            ?.evidenciaComplementar
            ?.persistenciaExecutada ===
        true
    ) {
        return {
            ...base,

            codigo:
                "COMPLEMENTAR_JA_PERSISTIDO",
        };
    }

    if (
        !base.empresaId ||
        !base.competencia
    ) {
        return {
            ...base,

            codigo:
                "VINCULO_FOLHA_DADOS_INVALIDOS",
        };
    }

    const identificacaoColaborador =
        obterIdentificacaoColaborador(
            item
        );

    const colaboradorId =
        normalizarUuid(
            identificacaoColaborador
                ?.id
        );

    if (
        textoSeguro(
            resolucao?.status
        ).toUpperCase() ===
            "BLOQUEADO" ||
        textoSeguro(
            identificacaoColaborador
                ?.status
        ).toUpperCase() !==
            "LOCALIZADO" ||
        !colaboradorId
    ) {
        return {
            ...base,

            estado:
                CERTIDAO_UPLOAD_MASSA_ESTADO_PLANO_COMPLEMENTAR
                    .BLOQUEADO_COLABORADOR,

            codigo:
                "COLABORADOR_NAO_ELEGIVEL_COMPLEMENTAR",

            colaboradorId,
        };
    }

    const tipoEvidencia =
        base.tipoEvidencia;

    if (
        vinculoFolha
            ?.classificacaoFinanceiraPendente ===
            true ||
        !TIPOS_EVIDENCIA_PERMITIDOS.has(
            tipoEvidencia
        )
    ) {
        return {
            ...base,

            estado:
                CERTIDAO_UPLOAD_MASSA_ESTADO_PLANO_COMPLEMENTAR
                    .AGUARDAR_CLASSIFICACAO_FINANCEIRA,

            codigo:
                "CLASSIFICACAO_FINANCEIRA_PENDENTE",

            colaboradorId,
        };
    }

    const principal =
        resolverItemPrincipal({
            itens,
            vinculoFolha,
            documentosAtuais,
            resultadoPersistenciaPrincipal,
        });

    if (!principal.itemId) {
        return {
            ...base,

            estado:
                CERTIDAO_UPLOAD_MASSA_ESTADO_PLANO_COMPLEMENTAR
                    .AGUARDAR_ITEM_PRINCIPAL,

            codigo:
                principal.divergencia
                    ? "ITEM_PRINCIPAL_DIVERGENTE"
                    : "ITEM_PRINCIPAL_AINDA_INDISPONIVEL",

            colaboradorId,

            candidatosItemId:
                principal
                    .candidatos,
        };
    }

    return {
        ...base,

        estado:
            CERTIDAO_UPLOAD_MASSA_ESTADO_PLANO_COMPLEMENTAR
                .ELEGIVEL,

        codigo:
            "COMPLEMENTAR_ESTRUTURALMENTE_ELEGIVEL",

        elegivelEstrutural:
            true,

        executavel:
            false,

        autorizadoPersistir:
            false,

        colaboradorId,

        itemId:
            principal.itemId,

        origemItemId:
            principal.origem,

        candidatosItemId:
            principal
                .candidatos,

        dadosComplementares: {
            itemId:
                principal.itemId,

            empresaId:
                base.empresaId,

            competencia:
                base.competencia,

            tipoEvidencia,

            colaboradorId,
        },
    };
}

export function criarPlanoComplementarIndividualUploadMassa({
    resultado = null,
    documentosAtuais = [],
    resultadoPersistenciaPrincipal = null,
} = {}) {
    const itens =
        Array.isArray(
            resultado?.itens
        )
            ? resultado.itens
            : [];

    const itensPlano =
        itens.map(
            (item, indice) =>
                avaliarItem({
                    item,
                    indice,
                    itens,
                    documentosAtuais,
                    resultadoPersistenciaPrincipal,
                })
        );

    const contar =
        (estado) =>
            itensPlano.filter(
                (item) =>
                    item.estado ===
                    estado
            ).length;

    const foraEscopo =
        contar(
            CERTIDAO_UPLOAD_MASSA_ESTADO_PLANO_COMPLEMENTAR
                .FORA_ESCOPO_COMPLEMENTAR_INDIVIDUAL
        );

    return {
        versao:
            1,

        itens:
            itensPlano,

        resumo: {
            totalItens:
                itensPlano.length,

            totalComplementaresIndividuais:
                itensPlano.length -
                foraEscopo,

            elegiveisEstruturais:
                contar(
                    CERTIDAO_UPLOAD_MASSA_ESTADO_PLANO_COMPLEMENTAR
                        .ELEGIVEL
                ),

            aguardandoClassificacaoFinanceira:
                contar(
                    CERTIDAO_UPLOAD_MASSA_ESTADO_PLANO_COMPLEMENTAR
                        .AGUARDAR_CLASSIFICACAO_FINANCEIRA
                ),

            aguardandoItemPrincipal:
                contar(
                    CERTIDAO_UPLOAD_MASSA_ESTADO_PLANO_COMPLEMENTAR
                        .AGUARDAR_ITEM_PRINCIPAL
                ),

            bloqueadosColaborador:
                contar(
                    CERTIDAO_UPLOAD_MASSA_ESTADO_PLANO_COMPLEMENTAR
                        .BLOQUEADO_COLABORADOR
                ),

            foraEscopo,
        },

        persistenciaExecutada:
            false,

        executorHabilitado:
            false,

        autorizadoPersistir:
            false,
    };
}