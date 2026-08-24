/*
 * ==================================================================
 * SAFE_SCAN_EXECUTOR_COMPLEMENTAR_DRY_RUN_D2_R1T_R4E
 *
 * Converte somente candidatos complementares já elegíveis e
 * explicitamente autorizados em memória em uma intenção de payload.
 *
 * Não executa persistência.
 * ==================================================================
 */

const PADRAO_UUID =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PADRAO_COMPETENCIA =
    /^\d{4}-(0[1-9]|1[0-2])-01$/;

const LIMITE_PDF_BYTES =
    25 * 1024 * 1024;

const TIPOS_EVIDENCIA_PERMITIDOS =
    new Set([
        "PAGAMENTO_SALARIAL",
        "ADIANTAMENTO_SALARIAL",
    ]);

export const CERTIDAO_UPLOAD_MASSA_ESTADO_DRY_RUN_COMPLEMENTAR =
    Object.freeze({
        CANDIDATO_ESTRUTURAL:
            "CANDIDATO_ESTRUTURAL",

        NAO_EXECUTAR:
            "NAO_EXECUTAR",
    });

function textoSeguro(
    valor
) {
    return String(
        valor ?? ""
    ).trim();
}

function normalizarUuid(
    valor
) {
    const texto =
        textoSeguro(
            valor
        );

    return PADRAO_UUID.test(
        texto
    )
        ? texto
        : "";
}

function normalizarCompetencia(
    valor
) {
    const texto =
        textoSeguro(
            valor
        );

    return PADRAO_COMPETENCIA.test(
        texto
    )
        ? texto
        : "";
}

function normalizarTipoEvidencia(
    valor
) {
    const tipo =
        textoSeguro(
            valor
        ).toUpperCase();

    return TIPOS_EVIDENCIA_PERMITIDOS.has(
        tipo
    )
        ? tipo
        : "";
}

function planoPossuiGateAberto(
    plano
) {
    return Boolean(
        plano?.persistenciaExecutada ===
            true ||
        plano?.executorHabilitado ===
            true ||
        plano?.autorizadoPersistir ===
            true
    );
}

function itemPossuiGateAberto(
    item
) {
    return Boolean(
        item?.executavel ===
            true ||
        item?.autorizadoPersistir ===
            true ||
        item?.persistenciaExecutada ===
            true ||
        item?.executorHabilitado ===
            true
    );
}

function validarArquivoPdfDryRun(
    arquivo
) {
    if (!arquivo) {
        return {
            valido:
                false,

            codigo:
                "ARQUIVO_ORIGINAL_AUSENTE",
        };
    }

    const nome =
        textoSeguro(
            arquivo?.name
        );

    const mime =
        textoSeguro(
            arquivo?.type
        ).toLowerCase();

    const tamanho =
        Number(
            arquivo?.size
        );

    if (!/\.pdf$/i.test(nome)) {
        return {
            valido:
                false,

            codigo:
                "ARQUIVO_ORIGINAL_NAO_PDF",
        };
    }

    if (
        mime !==
        "application/pdf"
    ) {
        return {
            valido:
                false,

            codigo:
                "MIME_ORIGINAL_NAO_PDF",
        };
    }

    if (
        !Number.isFinite(
            tamanho
        ) ||
        tamanho <= 0 ||
        tamanho >
            LIMITE_PDF_BYTES
    ) {
        return {
            valido:
                false,

            codigo:
                "TAMANHO_ARQUIVO_INVALIDO",
        };
    }

    if (
        typeof arquivo.arrayBuffer !==
        "function"
    ) {
        return {
            valido:
                false,

            codigo:
                "ARQUIVO_SEM_ARRAY_BUFFER",
        };
    }

    return {
        valido:
            true,

        codigo:
            "ARQUIVO_PDF_VALIDO",
    };
}

function criarMapaUnicoPorIndice(
    itens
) {
    const mapa =
        new Map();

    const duplicados =
        new Set();

    for (
        const item of
        Array.isArray(itens)
            ? itens
            : []
    ) {
        const indice =
            Number(
                item?.indice
            );

        if (
            !Number.isInteger(
                indice
            ) ||
            indice < 0
        ) {
            continue;
        }

        if (
            mapa.has(
                indice
            )
        ) {
            duplicados.add(
                indice
            );

            continue;
        }

        mapa.set(
            indice,
            item
        );
    }

    return {
        mapa,
        duplicados,
    };
}

function criarNaoExecutar({
    indice = null,
    codigo,
    estadoEstrutural = "",
    estadoAutorizacao = "",
} = {}) {
    return {
        indice,

        estado:
            CERTIDAO_UPLOAD_MASSA_ESTADO_DRY_RUN_COMPLEMENTAR
                .NAO_EXECUTAR,

        codigo:
            textoSeguro(
                codigo
            ) ||
            "DRY_RUN_NAO_EXECUTAR",

        estadoEstrutural:
            textoSeguro(
                estadoEstrutural
            ),

        estadoAutorizacao:
            textoSeguro(
                estadoAutorizacao
            ),

        payloadIntencao:
            null,

        dryRun:
            true,

        executavel:
            false,

        autorizadoPersistir:
            false,
    };
}

function avaliarCandidato({
    itemEstrutural,
    itemAutorizacao,
    arquivo,
    gatePlanoAberto,
    indiceDuplicadoEstrutural,
    indiceDuplicadoAutorizacao,
} = {}) {
    const indice =
        Number.isInteger(
            itemEstrutural?.indice
        )
            ? itemEstrutural.indice
            : null;

    const estadoEstrutural =
        textoSeguro(
            itemEstrutural?.estado
        ).toUpperCase();

    const codigoEstrutural =
        textoSeguro(
            itemEstrutural?.codigo
        ).toUpperCase();

    const estadoAutorizacao =
        textoSeguro(
            itemAutorizacao?.estado
        ).toUpperCase();

    const rejeitar =
        (codigo) =>
            criarNaoExecutar({
                indice,
                codigo,
                estadoEstrutural,
                estadoAutorizacao,
            });

    if (gatePlanoAberto) {
        return rejeitar(
            "GATE_UPSTREAM_INESPERADAMENTE_ABERTO"
        );
    }

    if (
        indiceDuplicadoEstrutural
    ) {
        return rejeitar(
            "INDICE_ESTRUTURAL_DUPLICADO"
        );
    }

    if (
        indiceDuplicadoAutorizacao
    ) {
        return rejeitar(
            "INDICE_AUTORIZACAO_DUPLICADO"
        );
    }

    if (
        estadoEstrutural !==
            "ELEGIVEL" ||
        itemEstrutural
            ?.elegivelEstrutural !==
            true
    ) {
        return rejeitar(
            codigoEstrutural ===
                "COMPLEMENTAR_JA_PERSISTIDO"
                ? "COMPLEMENTAR_JA_PERSISTIDO"
                : "ESTRUTURA_NAO_ELEGIVEL"
        );
    }

    if (
        itemPossuiGateAberto(
            itemEstrutural
        )
    ) {
        return rejeitar(
            "GATE_ESTRUTURAL_INESPERADAMENTE_ABERTO"
        );
    }

    if (!itemAutorizacao) {
        return rejeitar(
            "AUTORIZACAO_NAO_LOCALIZADA"
        );
    }

    if (
        itemPossuiGateAberto(
            itemAutorizacao
        )
    ) {
        return rejeitar(
            "GATE_AUTORIZACAO_INESPERADAMENTE_ABERTO"
        );
    }

    if (
        estadoAutorizacao !==
            "AUTORIZADO_EM_MEMORIA" ||
        itemAutorizacao
            ?.decisaoHumanaAutorizada !==
            true ||
        itemAutorizacao
            ?.autorizacaoObsoleta ===
            true ||
        itemAutorizacao
            ?.autorizavel !==
            true
    ) {
        return rejeitar(
            "REVISAO_HUMANA_NAO_AUTORIZADA"
        );
    }

    const dados =
        itemEstrutural
            ?.dadosComplementares;

    if (
        !dados ||
        typeof dados !==
            "object" ||
        Array.isArray(
            dados
        )
    ) {
        return rejeitar(
            "DADOS_COMPLEMENTARES_AUSENTES"
        );
    }

    const itemId =
        normalizarUuid(
            dados?.itemId
        );

    const empresaId =
        normalizarUuid(
            dados?.empresaId
        );

    const competencia =
        normalizarCompetencia(
            dados?.competencia
        );

    const tipoEvidencia =
        normalizarTipoEvidencia(
            dados?.tipoEvidencia
        );

    const colaboradorId =
        normalizarUuid(
            dados?.colaboradorId
        );

    if (!itemId) {
        return rejeitar(
            "ITEM_ID_INVALIDO"
        );
    }

    if (!empresaId) {
        return rejeitar(
            "EMPRESA_ID_INVALIDO"
        );
    }

    if (!competencia) {
        return rejeitar(
            "COMPETENCIA_INVALIDA"
        );
    }

    if (!tipoEvidencia) {
        return rejeitar(
            "TIPO_EVIDENCIA_INVALIDO"
        );
    }

    if (!colaboradorId) {
        return rejeitar(
            "COLABORADOR_ID_INVALIDO"
        );
    }

    const identidadeTopLevelValida =
        normalizarUuid(
            itemEstrutural?.itemId
        ) ===
            itemId &&
        normalizarUuid(
            itemEstrutural?.empresaId
        ) ===
            empresaId &&
        normalizarCompetencia(
            itemEstrutural?.competencia
        ) ===
            competencia &&
        normalizarTipoEvidencia(
            itemEstrutural?.tipoEvidencia
        ) ===
            tipoEvidencia &&
        normalizarUuid(
            itemEstrutural?.colaboradorId
        ) ===
            colaboradorId;

    if (!identidadeTopLevelValida) {
        return rejeitar(
            "DADOS_ESTRUTURAIS_DIVERGENTES"
        );
    }

    const arquivoValidado =
        validarArquivoPdfDryRun(
            arquivo
        );

    if (!arquivoValidado.valido) {
        return rejeitar(
            arquivoValidado.codigo
        );
    }

    return {
        indice,

        estado:
            CERTIDAO_UPLOAD_MASSA_ESTADO_DRY_RUN_COMPLEMENTAR
                .CANDIDATO_ESTRUTURAL,

        codigo:
            "DRY_RUN_CANDIDATO_ESTRUTURAL",

        estadoEstrutural,

        estadoAutorizacao,

        payloadIntencao: {
            arquivo,
            itemId,
            empresaId,
            competencia,
            tipoEvidencia,
            colaboradorId,
        },

        dryRun:
            true,

        executavel:
            false,

        autorizadoPersistir:
            false,
    };
}

export function criarPlanoExecucaoComplementarDryRun({
    planoComplementarIndividual = null,
    planoAutorizacaoComplementar = null,
    arquivosOriginais = [],
} = {}) {
    const itensEstruturais =
        Array.isArray(
            planoComplementarIndividual
                ?.itens
        )
            ? planoComplementarIndividual.itens
            : [];

    const itensAutorizacao =
        Array.isArray(
            planoAutorizacaoComplementar
                ?.itens
        )
            ? planoAutorizacaoComplementar.itens
            : [];

    const arquivos =
        Array.isArray(
            arquivosOriginais
        )
            ? arquivosOriginais
            : [];

    const estruturalPorIndice =
        criarMapaUnicoPorIndice(
            itensEstruturais
        );

    const autorizacaoPorIndice =
        criarMapaUnicoPorIndice(
            itensAutorizacao
        );

    const gatePlanoAberto =
        planoPossuiGateAberto(
            planoComplementarIndividual
        ) ||
        planoPossuiGateAberto(
            planoAutorizacaoComplementar
        );

    const indices =
        [
            ...estruturalPorIndice
                .mapa
                .keys(),
        ].sort(
            (a, b) =>
                a - b
        );

    const itens =
        indices.map(
            (indice) =>
                avaliarCandidato({
                    itemEstrutural:
                        estruturalPorIndice
                            .mapa
                            .get(
                                indice
                            ),

                    itemAutorizacao:
                        autorizacaoPorIndice
                            .mapa
                            .get(
                                indice
                            ) ||
                        null,

                    arquivo:
                        arquivos[
                            indice
                        ] ||
                        null,

                    gatePlanoAberto,

                    indiceDuplicadoEstrutural:
                        estruturalPorIndice
                            .duplicados
                            .has(
                                indice
                            ),

                    indiceDuplicadoAutorizacao:
                        autorizacaoPorIndice
                            .duplicados
                            .has(
                                indice
                            ),
                })
        );

    const candidatosEstruturais =
        itens.filter(
            (item) =>
                item.estado ===
                CERTIDAO_UPLOAD_MASSA_ESTADO_DRY_RUN_COMPLEMENTAR
                    .CANDIDATO_ESTRUTURAL
        ).length;

    return {
        versao:
            1,

        dryRun:
            true,

        itens,

        resumo: {
            totalItens:
                itens.length,

            candidatosEstruturais,

            naoExecutar:
                itens.length -
                candidatosEstruturais,
        },

        persistenciaExecutada:
            false,

        executorHabilitado:
            false,

        autorizadoPersistir:
            false,

        chamouServicoPersistencia:
            false,

        chamouStorage:
            false,

        chamouRpc:
            false,
    };
}