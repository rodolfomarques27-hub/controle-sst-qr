import {
    DOCUMENTOS_CERTIDAO_MENSAL_BASE,
} from "../constants/certidaoMensalConstants.js";

export const CERTIDAO_MENSAL_PERFIL_DOCUMENTAL_CONTRATO_VERSAO =
    1;

export const CERTIDAO_MENSAL_EXIGENCIA_PADRAO =
    true;

const DOCUMENTOS_POR_ID =
    new Map(
        DOCUMENTOS_CERTIDAO_MENSAL_BASE.map(
            (documento) => [
                documento.id,
                documento,
            ]
        )
    );

function textoSeguro(
    valor
) {
    return String(
        valor ?? ""
    ).trim();
}

export function normalizarCompetenciaPerfilDocumental(
    valor
) {
    const texto =
        textoSeguro(
            valor
        );

    const iso =
        /^(\d{4})-(0[1-9]|1[0-2])-01$/
            .exec(
                texto
            );

    if (iso) {
        return texto;
    }

    const mensal =
        /^(0[1-9]|1[0-2])\/(\d{4})$/
            .exec(
                texto
            );

    if (!mensal) {
        return "";
    }

    return (
        mensal[2] +
        "-" +
        mensal[1] +
        "-01"
    );
}

export function normalizarRegraExigenciaDocumental(
    regra = {}
) {
    const tipoDocumento =
        textoSeguro(
            regra.tipoDocumento ??
            regra.tipo_documento
        );

    const competenciaInicio =
        normalizarCompetenciaPerfilDocumental(
            regra.competenciaInicio ??
            regra.competencia_inicio
        );

    if (
        !DOCUMENTOS_POR_ID.has(
            tipoDocumento
        ) ||
        !competenciaInicio ||
        typeof regra.exigido !==
            "boolean"
    ) {
        return null;
    }

    return {
        id:
            textoSeguro(
                regra.id
            ) ||
            null,

        empresaId:
            textoSeguro(
                regra.empresaId ??
                regra.empresa_id
            ) ||
            null,

        tipoDocumento,

        exigido:
            regra.exigido,

        competenciaInicio,

        motivo:
            textoSeguro(
                regra.motivo
            ),

        criadoEm:
            textoSeguro(
                regra.criadoEm ??
                regra.criado_em
            ),

        atualizadoEm:
            textoSeguro(
                regra.atualizadoEm ??
                regra.atualizado_em
            ),
    };
}

export function resolverExigenciaDocumentoNaCompetencia({
    empresaId = "",
    tipoDocumento,
    competencia,
    regras = [],
}) {
    const empresaIdNormalizada =
        textoSeguro(
            empresaId
        );

    const tipoDocumentoNormalizado =
        textoSeguro(
            tipoDocumento
        );

    const competenciaNormalizada =
        normalizarCompetenciaPerfilDocumental(
            competencia
        );

    if (
        !DOCUMENTOS_POR_ID.has(
            tipoDocumentoNormalizado
        )
    ) {
        throw new Error(
            "Tipo documental desconhecido no perfil mensal."
        );
    }

    if (!competenciaNormalizada) {
        throw new Error(
            "Competência inválida no perfil documental."
        );
    }

    const candidatas =
        (
            Array.isArray(
                regras
            )
                ? regras
                : []
        )
            .map(
                normalizarRegraExigenciaDocumental
            )
            .filter(Boolean)
            .filter(
                (regra) =>
                    regra.tipoDocumento ===
                        tipoDocumentoNormalizado &&
                    regra.competenciaInicio <=
                        competenciaNormalizada &&
                    (
                        !empresaIdNormalizada ||
                        regra.empresaId ===
                            empresaIdNormalizada
                    )
            )
            .sort(
                (a, b) =>
                    b.competenciaInicio
                        .localeCompare(
                            a.competenciaInicio
                        )
            );

    const regraAplicavel =
        candidatas[0] ||
        null;

    if (!regraAplicavel) {
        return {
            exigido:
                CERTIDAO_MENSAL_EXIGENCIA_PADRAO,

            origem:
                "PADRAO_GLOBAL",

            regra:
                null,
        };
    }

    return {
        exigido:
            regraAplicavel.exigido,

        origem:
            "CONFIGURACAO_EMPRESA",

        regra:
            regraAplicavel,
    };
}

export function montarPerfilDocumentalCompetencia({
    empresaId = "",
    competencia,
    regras = [],
}) {
    const competenciaNormalizada =
        normalizarCompetenciaPerfilDocumental(
            competencia
        );

    if (!competenciaNormalizada) {
        throw new Error(
            "Competência inválida para montagem do perfil documental."
        );
    }

    const documentos =
        DOCUMENTOS_CERTIDAO_MENSAL_BASE.map(
            (documento) => {
                const resolucao =
                    resolverExigenciaDocumentoNaCompetencia({
                        empresaId,
                        tipoDocumento:
                            documento.id,
                        competencia:
                            competenciaNormalizada,
                        regras,
                    });

                return {
                    ...documento,

                    exigido:
                        resolucao.exigido,

                    origemExigencia:
                        resolucao.origem,

                    regraExigencia:
                        resolucao.regra,
                };
            }
        );

    const documentosExigiveis =
        documentos.filter(
            (documento) =>
                documento.exigido
        );

    const documentosNaoExigiveis =
        documentos.filter(
            (documento) =>
                !documento.exigido
        );

    const documentosExternosExigiveis =
        documentosExigiveis.filter(
            (documento) =>
                !documento.origemSistema
        );

    return {
        contratoVersao:
            CERTIDAO_MENSAL_PERFIL_DOCUMENTAL_CONTRATO_VERSAO,

        empresaId:
            textoSeguro(
                empresaId
            ),

        competencia:
            competenciaNormalizada,

        documentos,

        documentosExigiveis,

        documentosNaoExigiveis,

        idsExigiveis:
            documentosExigiveis.map(
                (documento) =>
                    documento.id
            ),

        totalCatalogo:
            documentos.length,

        totalExigiveis:
            documentosExigiveis.length,

        totalNaoExigiveis:
            documentosNaoExigiveis.length,

        totalExternosExigiveis:
            documentosExternosExigiveis.length,
    };
}

export function documentoEhExigidoNaCompetencia({
    empresaId = "",
    tipoDocumento,
    competencia,
    regras = [],
}) {
    return resolverExigenciaDocumentoNaCompetencia({
        empresaId,
        tipoDocumento,
        competencia,
        regras,
    }).exigido;
}