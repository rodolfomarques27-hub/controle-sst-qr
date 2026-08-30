import {
    normalizarTextoDocumental,
} from "./certidaoDocumentTextUtils.js";

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
        // SAFE_SCAN_CERT2_M4_F5_E_CRF_ASSINATURA_FORTE_V1
        //
        // CRF deve ser reconhecido pela estrutura do certificado
        // efetivamente emitido para o empregador.
        //
        // A simples menção a "CRF - FGTS" em checklist, controle
        // interno ou relação de certidões não satisfaz esta regra.
        //
        // Fail-closed:
        // - exige identificação empresarial documental;
        // - exige validade;
        // - exige evidência institucional ou declaração material
        //   de regularidade perante o Fundo.
        {
            id: "crf-fgts",
            titulo: "CRF FGTS",
            conjuntosObrigatorios: [
                [
                    "CERTIFICADO DE REGULARIDADE",
                    "FGTS",
                    "INSCRICAO",
                    "RAZAO SOCIAL",
                    "VALIDADE",
                    "CAIXA ECONOMICA FEDERAL",
                ],
                [
                    "CERTIFICADO DE REGULARIDADE",
                    "FGTS",
                    "INSCRICAO",
                    "RAZAO SOCIAL",
                    "VALIDADE",
                    "SITUACAO REGULAR PERANTE O FUNDO",
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