import {
    classificarDocumentoCertidao,
} from "./certidaoDocumentClassifier.js";
import {
    extrairCnpjsDocumento,
    extrairRazaoSocialDocumento,
    formatarCnpj,
} from "./certidaoDocumentTextUtils.js";
import {
    avaliarCndFederal,
} from "../evaluators/avaliarCndFederal.js";
import {
    avaliarCndt,
} from "../evaluators/avaliarCndt.js";
import {
    avaliarCrfFgts,
} from "../evaluators/avaliarCrfFgts.js";
import {
    avaliarCertidaoTributariaLocal,
} from "../evaluators/avaliarCertidaoTributariaLocal.js";
import {
    avaliarFgtsDigitalGfd,
} from "../evaluators/avaliarFgtsDigitalGfd.js";
import {
    avaliarFolhaPagamentoHolerites,
} from "../evaluators/avaliarFolhaPagamentoHolerites.js";
import {
    avaliarFolhaPonto,
} from "../evaluators/avaliarFolhaPonto.js";
import {
    avaliarVaVt,
} from "../evaluators/avaliarVaVt.js";
import {
    avaliarSeguroVida,
} from "../evaluators/avaliarSeguroVida.js";
import {
    avaliarInssDctfweb,
} from "../evaluators/avaliarInssDctfweb.js";
import {
    avaliarIss,
} from "../evaluators/avaliarIss.js";
import {
    avaliarEsocialSst,
} from "../evaluators/avaliarEsocialSst.js";

const DOCUMENTOS_COM_TRAVA_ESTRUTURAL =
    new Set([
        "cnd-federal",
        "cndt-trabalhista",
        "crf-fgts",
        "cnd-estadual",
        "cnd-municipal",
    ]);

const DOCUMENTOS_ACEITOS_POR_OBRIGACAO =
    Object.freeze({
        fgts:
            new Set([
                "fgts-digital-gfd",
            ]),
    });

function criarDadosTemporaisVazios() {
    return {
        dataEmissao: "",
        horaEmissao: "",
        dataValidade: "",
        situacaoEmissao: {
            codigo: "NAO_AVALIADA",
            rotulo: "Não avaliada",
        },
        situacaoValidade: {
            codigo: "NAO_AVALIADA",
            rotulo: "Não avaliada",
            diasRestantes: null,
        },
    };
}

function criarResultadoArquivoIncompativel({
    classificacao,
    documentoEsperado,
    empresaEsperada,
}) {
    const documentoIdentificado =
        classificacao?.titulo ||
        "Documento não identificado";

    const documentoEsperadoTitulo =
        documentoEsperado?.titulo ||
        "Documento selecionado";

    return {
        aplicavel: false,
        documentoIncompativel: true,
        bloqueiaSubstituicao: true,
        codigo: "ARQUIVO_INCOMPATIVEL",
        nivel: "REPROVADA",
        rotulo: "Arquivo incompatível",
        mensagem:
            (
                `${documentoIdentificado} não corresponde ` +
                `a ${documentoEsperadoTitulo}.`
            ),
        requerConferenciaHumana: false,
        requerConsultaOficial: false,
        documentoEsperado:
            documentoEsperadoTitulo,
        documentoIdentificado,
        empresaEsperada:
            empresaEsperada?.nome || "",
        cnpjEsperado:
            formatarCnpj(
                empresaEsperada?.cnpj
            ),
        razaoSocialDocumento: "",
        cnpjDocumento: "",
        natureza: {
            codigo: "NAO_AVALIADA",
            rotulo: "Não avaliada",
        },
        codigoControle: "",
        dadosTemporais:
            criarDadosTemporaisVazios(),
        regras: [
            {
                codigo:
                    "TIPO_DOCUMENTAL_INCOMPATIVEL",
                titulo:
                    "Tipo documental",
                status:
                    "REPROVADA",
                mensagem:
                    (
                        `Era esperado ${documentoEsperadoTitulo}, ` +
                        `mas o arquivo foi classificado como ` +
                        `${documentoIdentificado}.`
                    ),
            },
        ],
    };
}

function criarResultadoGenerico({
    classificacao,
    documentoEsperado,
    empresaEsperada,
    textoExtraido,
}) {
    const cnpjDocumento =
        extrairCnpjsDocumento(
            textoExtraido
        )[0] || "";

    return {
        aplicavel: false,
        documentoIncompativel: false,
        bloqueiaSubstituicao: false,
        codigo:
            "AVALIADOR_ESPECIFICO_PENDENTE",
        nivel: "INCONCLUSIVA",
        rotulo:
            "Avaliador específico ainda não implementado",
        mensagem:
            "O documento foi identificado, mas suas regras específicas serão adicionadas em uma próxima etapa.",
        requerConferenciaHumana: true,
        requerConsultaOficial: false,
        documentoEsperado:
            documentoEsperado?.titulo || "",
        documentoIdentificado:
            classificacao.titulo,
        empresaEsperada:
            empresaEsperada?.nome || "",
        cnpjEsperado:
            formatarCnpj(
                empresaEsperada?.cnpj
            ),
        razaoSocialDocumento:
            extrairRazaoSocialDocumento(
                textoExtraido
            ),
        cnpjDocumento:
            formatarCnpj(
                cnpjDocumento
            ),
        natureza: {
            codigo: "NAO_AVALIADA",
            rotulo: "Não avaliada",
        },
        codigoControle: "",
        dadosTemporais:
            criarDadosTemporaisVazios(),
        regras: [],
    };
}

function deveRecusarAntesDoAvaliador({
    documentoEsperado,
    classificacao,
}) {
    const documentoEsperadoId =
        String(
            documentoEsperado?.id || ""
        ).trim();

    const documentosAceitos =
        DOCUMENTOS_ACEITOS_POR_OBRIGACAO[
            documentoEsperadoId
        ];

    if (documentosAceitos) {
        return (
            !classificacao?.identificado ||
            !documentosAceitos.has(
                classificacao.id
            )
        );
    }

    if (
        !DOCUMENTOS_COM_TRAVA_ESTRUTURAL
            .has(documentoEsperadoId)
    ) {
        return false;
    }

    return (
        !classificacao?.identificado ||
        classificacao.id !==
            documentoEsperadoId
    );
}

export function executarPreAvaliacaoDocumental({
    textoExtraido,
    documentoEsperado,
    empresaEsperada,
    dataReferencia = new Date(),
}) {
    const classificacao =
        classificarDocumentoCertidao(
            textoExtraido
        );

    if (
        deveRecusarAntesDoAvaliador({
            documentoEsperado,
            classificacao,
        })
    ) {
        return {
            classificacao,
            avaliacao:
                criarResultadoArquivoIncompativel({
                    classificacao,
                    documentoEsperado,
                    empresaEsperada,
                }),
        };
    }

    if (
        documentoEsperado?.id ===
        "cnd-federal"
    ) {
        return {
            classificacao,
            avaliacao:
                avaliarCndFederal({
                    textoExtraido,
                    classificacao,
                    documentoEsperado,
                    empresaEsperada,
                    dataReferencia,
                }),
        };
    }

    if (
        documentoEsperado?.id ===
        "cndt-trabalhista"
    ) {
        return {
            classificacao,
            avaliacao:
                avaliarCndt({
                    textoExtraido,
                    classificacao,
                    documentoEsperado,
                    empresaEsperada,
                    dataReferencia,
                }),
        };
    }

    if (
        documentoEsperado?.id ===
        "crf-fgts"
    ) {
        return {
            classificacao,
            avaliacao:
                avaliarCrfFgts({
                    textoExtraido,
                    classificacao,
                    documentoEsperado,
                    empresaEsperada,
                    dataReferencia,
                }),
        };
    }

    if (
        documentoEsperado?.id ===
            "cnd-estadual" ||
        documentoEsperado?.id ===
            "cnd-municipal"
    ) {
        return {
            classificacao,
            avaliacao:
                avaliarCertidaoTributariaLocal({
                    textoExtraido,
                    classificacao,
                    documentoEsperado,
                    empresaEsperada,
                    tipoDocumento:
                        documentoEsperado.id,
                    dataReferencia,
                }),
        };
    }

    if (
        documentoEsperado?.id ===
            "folha-pagamento"
    ) {
        return {
            classificacao,
            avaliacao:
                avaliarFolhaPagamentoHolerites({
                    textoExtraido,
                    classificacao,
                    documentoEsperado,
                    empresaEsperada,
                    dataReferencia,
                }),
        };
    }

    if (
        documentoEsperado?.id ===
            "folha-ponto"
    ) {
        return {
            classificacao,
            avaliacao:
                avaliarFolhaPonto({
                    textoExtraido,
                    classificacao,
                    documentoEsperado,
                    empresaEsperada,
                    dataReferencia,
                }),
        };
    }
    if (
        documentoEsperado?.id ===
            "va-vt"
    ) {
        return {
            classificacao,
            avaliacao:
                avaliarVaVt({
                    textoExtraido,
                    classificacao,
                    documentoEsperado,
                    empresaEsperada,
                    dataReferencia,
                }),
        };
    }

    if (
        documentoEsperado?.id ===
            "seguro-vida"
    ) {
        return {
            classificacao,
            avaliacao:
                avaliarSeguroVida({
                    textoExtraido,
                    classificacao,
                    documentoEsperado,
                    empresaEsperada,
                    dataReferencia,
                }),
        };
    }

    if (
        documentoEsperado?.id ===
            "inss-dctfweb"
    ) {
        return {
            classificacao,
            avaliacao:
                avaliarInssDctfweb({
                    textoExtraido,
                    classificacao,
                    documentoEsperado,
                    empresaEsperada,
                    dataReferencia,
                }),
        };
    }

    if (
        documentoEsperado?.id ===
            "iss"
    ) {
        return {
            classificacao,
            avaliacao:
                avaliarIss({
                    textoExtraido,
                    classificacao,
                    documentoEsperado,
                    empresaEsperada,
                    dataReferencia,
                }),
        };
    }

    if (
        documentoEsperado?.id ===
            "esocial"
    ) {
        return {
            classificacao,
            avaliacao:
                avaliarEsocialSst({
                    textoExtraido,
                    classificacao,
                    documentoEsperado,
                    empresaEsperada,
                    dataReferencia,
                }),
        };
    }

    if (
        documentoEsperado?.id ===
            "fgts" &&
        classificacao?.id ===
            "fgts-digital-gfd"
    ) {
        return {
            classificacao,
            avaliacao:
                avaliarFgtsDigitalGfd({
                    textoExtraido,
                    classificacao,
                    documentoEsperado,
                    empresaEsperada,
                    dataReferencia,
                }),
        };
    }

    return {
        classificacao,
        avaliacao:
            criarResultadoGenerico({
                classificacao,
                documentoEsperado,
                empresaEsperada,
                textoExtraido,
            }),
    };
}