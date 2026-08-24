/*
 * ================================================================
 * SAFE_SCAN_AUTORIZACAO_COMPLEMENTAR_PURA_D2_R1T_R4A_R3
 *
 * Decisão humana puramente em memória para complementares
 * individuais do upload em massa.
 *
 * Nenhuma persistência é executada por este módulo.
 * ================================================================
 */

const PADRAO_UUID =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PADRAO_COMPETENCIA =
    /^\d{4}-(0[1-9]|1[0-2])-01$/;

export const CERTIDAO_UPLOAD_MASSA_DECISAO_AUTORIZACAO_COMPLEMENTAR =
    Object.freeze({
        AUTORIZAR_INCLUSAO:
            "AUTORIZAR_INCLUSAO",

        NAO_INCLUIR:
            "NAO_INCLUIR",
    });

export const CERTIDAO_UPLOAD_MASSA_ESTADO_AUTORIZACAO_COMPLEMENTAR =
    Object.freeze({
        FORA_ESCOPO:
            "FORA_ESCOPO",

        BLOQUEADO:
            "BLOQUEADO",

        AGUARDAR_CLASSIFICACAO:
            "AGUARDAR_CLASSIFICACAO",

        AGUARDAR_AUTORIZACAO:
            "AGUARDAR_AUTORIZACAO",

        AUTORIZADO_EM_MEMORIA:
            "AUTORIZADO_EM_MEMORIA",

        NAO_INCLUIR_EM_MEMORIA:
            "NAO_INCLUIR_EM_MEMORIA",

        AUTORIZACAO_OBSOLETA:
            "AUTORIZACAO_OBSOLETA",
    });

function textoSeguro(
    valor
) {
    return String(
        valor ?? ""
    ).trim();
}

function normalizarEstadoAutorizacao(
    estado
) {
    const decisoes =
        estado?.decisoes &&
        typeof estado.decisoes ===
            "object" &&
        !Array.isArray(
            estado.decisoes
        )
            ? estado.decisoes
            : {};

    return {
        versao:
            1,

        decisoes,

        persistenciaExecutada:
            false,

        executorHabilitado:
            false,

        autorizadoPersistir:
            false,
    };
}

function obterSnapshotPlano(
    itemPlano
) {
    const dados =
        itemPlano
            ?.dadosComplementares ||
        {};

    return {
        indice:
            Number.isInteger(
                itemPlano?.indice
            )
                ? itemPlano.indice
                : null,

        empresaId:
            textoSeguro(
                dados?.empresaId ||
                itemPlano?.empresaId
            ),

        competencia:
            textoSeguro(
                dados?.competencia ||
                itemPlano?.competencia
            ),

        colaboradorId:
            textoSeguro(
                dados?.colaboradorId ||
                itemPlano?.colaboradorId
            ),

        tipoEvidencia:
            textoSeguro(
                dados?.tipoEvidencia ||
                itemPlano?.tipoEvidencia
            ).toUpperCase(),
    };
}

function snapshotValido(
    snapshot
) {
    return (
        Number.isInteger(
            snapshot?.indice
        ) &&
        PADRAO_UUID.test(
            snapshot?.empresaId ||
            ""
        ) &&
        PADRAO_COMPETENCIA.test(
            snapshot?.competencia ||
            ""
        ) &&
        PADRAO_UUID.test(
            snapshot?.colaboradorId ||
            ""
        ) &&
        (
            snapshot?.tipoEvidencia ===
                "PAGAMENTO_SALARIAL" ||
            snapshot?.tipoEvidencia ===
                "ADIANTAMENTO_SALARIAL"
        )
    );
}

function criarFingerprint(
    snapshot
) {
    if (
        !snapshotValido(
            snapshot
        )
    ) {
        return "";
    }

    return [
        snapshot.indice,
        snapshot.empresaId,
        snapshot.competencia,
        snapshot.colaboradorId,
        snapshot.tipoEvidencia,
    ].join("|");
}

function obterEstadoEstrutural(
    itemPlano
) {
    return textoSeguro(
        itemPlano?.estado
    ).toUpperCase();
}

function obterCodigoEstrutural(
    itemPlano
) {
    return textoSeguro(
        itemPlano?.codigo
    ).toUpperCase();
}

function avaliarGateRevisao(
    itemPlano
) {
    const estado =
        obterEstadoEstrutural(
            itemPlano
        );

    const codigo =
        obterCodigoEstrutural(
            itemPlano
        );

    if (
        estado ===
        "FORA_ESCOPO_COMPLEMENTAR_INDIVIDUAL"
    ) {
        return {
            autorizavel:
                false,

            estado:
                CERTIDAO_UPLOAD_MASSA_ESTADO_AUTORIZACAO_COMPLEMENTAR
                    .FORA_ESCOPO,

            codigo:
                "FORA_ESCOPO_COMPLEMENTAR",
        };
    }

    if (
        estado ===
        "BLOQUEADO_COLABORADOR"
    ) {
        return {
            autorizavel:
                false,

            estado:
                CERTIDAO_UPLOAD_MASSA_ESTADO_AUTORIZACAO_COMPLEMENTAR
                    .BLOQUEADO,

            codigo:
                "COLABORADOR_NAO_AUTORIZAVEL",
        };
    }

    if (
        estado ===
        "AGUARDAR_CLASSIFICACAO_FINANCEIRA"
    ) {
        return {
            autorizavel:
                false,

            estado:
                CERTIDAO_UPLOAD_MASSA_ESTADO_AUTORIZACAO_COMPLEMENTAR
                    .AGUARDAR_CLASSIFICACAO,

            codigo:
                "CLASSIFICACAO_FINANCEIRA_PENDENTE",
        };
    }

    if (
        estado ===
            "AGUARDAR_ITEM_PRINCIPAL" &&
        codigo ===
            "ITEM_PRINCIPAL_DIVERGENTE"
    ) {
        return {
            autorizavel:
                false,

            estado:
                CERTIDAO_UPLOAD_MASSA_ESTADO_AUTORIZACAO_COMPLEMENTAR
                    .BLOQUEADO,

            codigo:
                "ITEM_PRINCIPAL_DIVERGENTE",
        };
    }

    if (
        estado !==
            "AGUARDAR_ITEM_PRINCIPAL" &&
        estado !==
            "ELEGIVEL"
    ) {
        return {
            autorizavel:
                false,

            estado:
                CERTIDAO_UPLOAD_MASSA_ESTADO_AUTORIZACAO_COMPLEMENTAR
                    .BLOQUEADO,

            codigo:
                "ESTADO_ESTRUTURAL_NAO_AUTORIZAVEL",
        };
    }

    const snapshot =
        obterSnapshotPlano(
            itemPlano
        );

    if (
        !snapshotValido(
            snapshot
        )
    ) {
        return {
            autorizavel:
                false,

            estado:
                CERTIDAO_UPLOAD_MASSA_ESTADO_AUTORIZACAO_COMPLEMENTAR
                    .BLOQUEADO,

            codigo:
                "SNAPSHOT_AUTORIZACAO_INVALIDO",
        };
    }

    return {
        autorizavel:
            true,

        snapshot,

        fingerprint:
            criarFingerprint(
                snapshot
            ),
    };
}

export function criarEstadoAutorizacaoComplementarUploadMassa() {
    return normalizarEstadoAutorizacao(
        null
    );
}

export function aplicarDecisaoAutorizacaoComplementarUploadMassa({
    estadoAutorizacao = null,
    itemPlano = null,
    decisao = "",
} = {}) {
    const estadoAtual =
        normalizarEstadoAutorizacao(
            estadoAutorizacao
        );

    const gate =
        avaliarGateRevisao(
            itemPlano
        );

    if (!gate.autorizavel) {
        return estadoAtual;
    }

    const decisaoSegura =
        textoSeguro(
            decisao
        ).toUpperCase();

    if (
        decisaoSegura !==
            CERTIDAO_UPLOAD_MASSA_DECISAO_AUTORIZACAO_COMPLEMENTAR
                .AUTORIZAR_INCLUSAO &&
        decisaoSegura !==
            CERTIDAO_UPLOAD_MASSA_DECISAO_AUTORIZACAO_COMPLEMENTAR
                .NAO_INCLUIR
    ) {
        return estadoAtual;
    }

    const chave =
        String(
            gate.snapshot.indice
        );

    return {
        ...estadoAtual,

        decisoes: {
            ...estadoAtual.decisoes,

            [chave]: {
                decisao:
                    decisaoSegura,

                fingerprint:
                    gate.fingerprint,

                indice:
                    gate.snapshot.indice,

                empresaId:
                    gate.snapshot.empresaId,

                competencia:
                    gate.snapshot.competencia,

                colaboradorId:
                    gate.snapshot.colaboradorId,

                tipoEvidencia:
                    gate.snapshot.tipoEvidencia,

                origem:
                    "REVISAO_HUMANA_UPLOAD_MASSA",

                executavel:
                    false,

                autorizadoPersistir:
                    false,
            },
        },

        persistenciaExecutada:
            false,

        executorHabilitado:
            false,

        autorizadoPersistir:
            false,
    };
}

export function limparDecisaoAutorizacaoComplementarUploadMassa({
    estadoAutorizacao = null,
    indice = null,
} = {}) {
    const estadoAtual =
        normalizarEstadoAutorizacao(
            estadoAutorizacao
        );

    if (
        !Number.isInteger(
            indice
        )
    ) {
        return estadoAtual;
    }

    const chave =
        String(
            indice
        );

    if (
        !Object.prototype.hasOwnProperty.call(
            estadoAtual.decisoes,
            chave
        )
    ) {
        return estadoAtual;
    }

    const decisoes = {
        ...estadoAtual.decisoes,
    };

    delete decisoes[
        chave
    ];

    return {
        ...estadoAtual,

        decisoes,

        persistenciaExecutada:
            false,

        executorHabilitado:
            false,

        autorizadoPersistir:
            false,
    };
}

function avaliarItemAutorizacao({
    itemPlano,
    estadoAutorizacao,
} = {}) {
    const gate =
        avaliarGateRevisao(
            itemPlano
        );

    const base = {
        indice:
            Number.isInteger(
                itemPlano?.indice
            )
                ? itemPlano.indice
                : null,

        estadoEstrutural:
            obterEstadoEstrutural(
                itemPlano
            ),

        codigoEstrutural:
            obterCodigoEstrutural(
                itemPlano
            ),

        autorizavel:
            gate.autorizavel ===
            true,

        decisaoHumanaAutorizada:
            false,

        executavel:
            false,

        autorizadoPersistir:
            false,
    };

    if (!gate.autorizavel) {
        return {
            ...base,

            estado:
                gate.estado,

            codigo:
                gate.codigo,

            decisao:
                null,

            autorizacaoObsoleta:
                false,
        };
    }

    const estadoAtual =
        normalizarEstadoAutorizacao(
            estadoAutorizacao
        );

    const registro =
        estadoAtual.decisoes[
            String(
                gate.snapshot.indice
            )
        ] ||
        null;

    if (!registro) {
        return {
            ...base,

            estado:
                CERTIDAO_UPLOAD_MASSA_ESTADO_AUTORIZACAO_COMPLEMENTAR
                    .AGUARDAR_AUTORIZACAO,

            codigo:
                "REVISAO_HUMANA_PENDENTE",

            decisao:
                null,

            autorizacaoObsoleta:
                false,

            snapshot:
                gate.snapshot,
        };
    }

    if (
        textoSeguro(
            registro?.fingerprint
        ) !==
        gate.fingerprint
    ) {
        return {
            ...base,

            estado:
                CERTIDAO_UPLOAD_MASSA_ESTADO_AUTORIZACAO_COMPLEMENTAR
                    .AUTORIZACAO_OBSOLETA,

            codigo:
                "REVISAO_HUMANA_OBSOLETA",

            decisao:
                null,

            autorizacaoObsoleta:
                true,

            snapshot:
                gate.snapshot,
        };
    }

    const decisao =
        textoSeguro(
            registro?.decisao
        ).toUpperCase();

    if (
        decisao ===
        CERTIDAO_UPLOAD_MASSA_DECISAO_AUTORIZACAO_COMPLEMENTAR
            .AUTORIZAR_INCLUSAO
    ) {
        return {
            ...base,

            estado:
                CERTIDAO_UPLOAD_MASSA_ESTADO_AUTORIZACAO_COMPLEMENTAR
                    .AUTORIZADO_EM_MEMORIA,

            codigo:
                "REVISAO_HUMANA_AUTORIZADA",

            decisao,

            decisaoHumanaAutorizada:
                true,

            autorizacaoObsoleta:
                false,

            snapshot:
                gate.snapshot,

            registroAutorizacao:
                registro,
        };
    }

    if (
        decisao ===
        CERTIDAO_UPLOAD_MASSA_DECISAO_AUTORIZACAO_COMPLEMENTAR
            .NAO_INCLUIR
    ) {
        return {
            ...base,

            estado:
                CERTIDAO_UPLOAD_MASSA_ESTADO_AUTORIZACAO_COMPLEMENTAR
                    .NAO_INCLUIR_EM_MEMORIA,

            codigo:
                "REVISAO_HUMANA_NAO_INCLUIR",

            decisao,

            decisaoHumanaAutorizada:
                false,

            autorizacaoObsoleta:
                false,

            snapshot:
                gate.snapshot,

            registroAutorizacao:
                registro,
        };
    }

    return {
        ...base,

        estado:
            CERTIDAO_UPLOAD_MASSA_ESTADO_AUTORIZACAO_COMPLEMENTAR
                .AGUARDAR_AUTORIZACAO,

        codigo:
            "DECISAO_HUMANA_INVALIDA",

        decisao:
            null,

        autorizacaoObsoleta:
            false,

        snapshot:
            gate.snapshot,
    };
}

export function criarPlanoAutorizacaoComplementarUploadMassa({
    planoComplementarIndividual = null,
    estadoAutorizacao = null,
} = {}) {
    const itensEstruturais =
        Array.isArray(
            planoComplementarIndividual
                ?.itens
        )
            ? planoComplementarIndividual.itens
            : [];

    const itens =
        itensEstruturais.map(
            (itemPlano) =>
                avaliarItemAutorizacao({
                    itemPlano,
                    estadoAutorizacao,
                })
        );

    const contar =
        (estado) =>
            itens.filter(
                (item) =>
                    item.estado ===
                    estado
            ).length;

    return {
        versao:
            1,

        itens,

        resumo: {
            totalItens:
                itens.length,

            aguardandoAutorizacao:
                contar(
                    CERTIDAO_UPLOAD_MASSA_ESTADO_AUTORIZACAO_COMPLEMENTAR
                        .AGUARDAR_AUTORIZACAO
                ),

            autorizadosEmMemoria:
                contar(
                    CERTIDAO_UPLOAD_MASSA_ESTADO_AUTORIZACAO_COMPLEMENTAR
                        .AUTORIZADO_EM_MEMORIA
                ),

            naoIncluirEmMemoria:
                contar(
                    CERTIDAO_UPLOAD_MASSA_ESTADO_AUTORIZACAO_COMPLEMENTAR
                        .NAO_INCLUIR_EM_MEMORIA
                ),

            autorizacoesObsoletas:
                contar(
                    CERTIDAO_UPLOAD_MASSA_ESTADO_AUTORIZACAO_COMPLEMENTAR
                        .AUTORIZACAO_OBSOLETA
                ),

            aguardandoClassificacao:
                contar(
                    CERTIDAO_UPLOAD_MASSA_ESTADO_AUTORIZACAO_COMPLEMENTAR
                        .AGUARDAR_CLASSIFICACAO
                ),

            bloqueados:
                contar(
                    CERTIDAO_UPLOAD_MASSA_ESTADO_AUTORIZACAO_COMPLEMENTAR
                        .BLOQUEADO
                ),

            foraEscopo:
                contar(
                    CERTIDAO_UPLOAD_MASSA_ESTADO_AUTORIZACAO_COMPLEMENTAR
                        .FORA_ESCOPO
                ),
        },

        persistenciaExecutada:
            false,

        executorHabilitado:
            false,

        autorizadoPersistir:
            false,
    };
}
