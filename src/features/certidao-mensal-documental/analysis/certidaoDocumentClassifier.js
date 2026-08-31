import {
    normalizarTextoDocumental,
} from "./certidaoDocumentTextUtils.js";

import {
    analisarAssinaturaEstruturalCrf,
} from "./certidaoCrfTextUtils.js";

const DEFINICOES_DOCUMENTAIS =
    Object.freeze([
        {
            id: "cnd-federal",
            titulo: "CND Federal",
            conjuntosObrigatorios: [
                [
                    "TRIBUTOS FEDERAIS",
                    "DIVIDA ATIVA DA UNIAO",
                ],
            ],
        },
        {
            id: "fgts-digital-gfd",
            titulo: "Guia do FGTS Digital (GFD)",
            conjuntosObrigatorios: [
                [
                    "GUIA DO FGTS DIGITAL",
                    "COMPETENCIA",
                ],
            ],
        },
        {
            id: "ceat-trt",
            titulo: "CEAT (Ações Trabalhistas - TRT)",
            conjuntosObrigatorios: [
                [
                    "CERTIDAO ELETRONICA DE ACOES TRABALHISTAS",
                    "TRIBUNAL REGIONAL DO TRABALHO",
                ],
                [
                    "CERTIDAO ELETRONICA DE ACOES TRABALHISTAS",
                    "CEAT",
                ],
            ],
        },
        {
            id: "cndt-trabalhista",
            titulo: "CNDT",
            conjuntosObrigatorios: [
                [
                    "CERTIDAO NEGATIVA DE DEBITOS TRABALHISTAS",
                ],
                [
                    "CERTIDAO POSITIVA DE DEBITOS TRABALHISTAS",
                    "EFEITO DE NEGATIVA",
                ],
                [
                    "CERTIDAO POSITIVA DE DEBITOS TRABALHISTAS",
                    "EFEITOS DE NEGATIVA",
                ],
                [
                    "CERTIDAO POSITIVA COM EFEITOS DE NEGATIVA",
                    "DEBITOS TRABALHISTAS",
                ],
            ],
        },
        {
            id: "cnd-estadual",
            titulo: "CND Estadual",
            conjuntosObrigatorios: [
                [
                    "CERTIDAO",
                    "DEBITOS ESTADUAIS",
                ],
                [
                    "CERTIDAO",
                    "DEBITOS TRIBUTARIOS",
                    "ESTADO",
                ],
                [
                    "CERTIDAO",
                    "DIVIDA ATIVA",
                    "ESTADO",
                ],
                [
                    "CERTIDAO",
                    "SECRETARIA DA FAZENDA",
                    "DEBITOS",
                ],
                [
                    "CERTIDAO",
                    "PROCURADORIA GERAL DO ESTADO",
                    "DIVIDA ATIVA",
                ],
                [
                    "SECRETARIA DA FAZENDA",
                    "ESTADO",
                    "NAO CONSTAM DEBITOS",
                    "DIVIDA ATIVA",
                ],
                [
                    "SECRETARIA DA FAZENDA",
                    "ESTADO",
                    "PENDENTES DE INSCRICAO NA DIVIDA ATIVA",
                ],
            ],
        },
        {
            id: "cnd-municipal",
            titulo: "CND Municipal",
            conjuntosObrigatorios: [
                [
                    "CERTIDAO",
                    "DEBITOS MUNICIPAIS",
                ],
                [
                    "CERTIDAO",
                    "FAZENDA MUNICIPAL",
                    "DEBITOS",
                ],
                [
                    "CERTIDAO",
                    "PREFEITURA",
                    "DEBITOS",
                ],
            ],
        },
    ]);

function localizarConjuntoDocumental(
    normalizado,
    definicao
) {
    const conjuntos =
        Array.isArray(
            definicao?.conjuntosObrigatorios
        )
            ? definicao.conjuntosObrigatorios
            : [];

    return (
        conjuntos.find(
            (conjunto) =>
                Array.isArray(conjunto) &&
                conjunto.length > 0 &&
                conjunto.every(
                    (termo) =>
                        normalizado.includes(
                            termo
                        )
                )
        ) ||
        null
    );
}

export function classificarDocumentoCertidao(
    texto = ""
) {
    const normalizado =
        normalizarTextoDocumental(
            texto
        );

    // SAFE_SCAN_CERT2_R14_A3_CRF_ASSINATURA_ESTRUTURAL_V2
    //
    // O CRF e reconhecido por valores documentais extraiveis,
    // nao pela presenca simultanea de rotulos de um layout unico.
    // A assinatura permanece fail-closed: titulo estrutural,
    // CNPJ, intervalo de validade e numero de certificacao sao
    // obrigatorios. Nome de arquivo e mencao isolada nao participam.
    const assinaturaCrf =
        analisarAssinaturaEstruturalCrf(
            texto
        );

    if (
        assinaturaCrf
            .reconhecido
    ) {
        return {
            identificado: true,
            id:
                "crf-fgts",
            titulo:
                "CRF FGTS",
            confianca:
                assinaturaCrf
                    .confianca,
            evidencias: [
                ...assinaturaCrf
                    .evidencias,
            ],
        };
    }

    for (
        const definicao of
        DEFINICOES_DOCUMENTAIS
    ) {
        const conjunto =
            localizarConjuntoDocumental(
                normalizado,
                definicao
            );

        if (!conjunto) {
            continue;
        }

        return {
            identificado: true,
            id:
                definicao.id,
            titulo:
                definicao.titulo,
            confianca: 95,
            evidencias:
                [...conjunto],
        };
    }

    return {
        identificado: false,
        id:
            "nao-identificado",
        titulo:
            "Documento não identificado",
        confianca: 0,
        evidencias: [],
    };
}
