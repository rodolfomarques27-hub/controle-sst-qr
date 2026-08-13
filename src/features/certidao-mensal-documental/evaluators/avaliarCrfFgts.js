import {
    avaliarDataEmissaoDocumental,
    avaliarValidadeDocumental,
} from "../analysis/certidaoDocumentDateUtils.js";
import {
    cnpjsSaoIguais,
    formatarCnpj,
} from "../analysis/certidaoDocumentTextUtils.js";
import {
    extrairDadosCrf,
} from "../analysis/certidaoCrfTextUtils.js";

function criarRegra({
    codigo,
    titulo,
    status,
    mensagem,
}) {
    return {
        codigo,
        titulo,
        status,
        mensagem,
    };
}

function criarNaturezaCrf() {
    return {
        codigo:
            "REGULARIDADE_FGTS",
        rotulo:
            "Regularidade do FGTS",
    };
}

function obterResultadoPrincipal({
    cnpjDocumento,
    cnpjEsperado,
    numeroCertificacao,
    dadosTemporais,
    prazoValidadeDias,
}) {
    if (!cnpjDocumento) {
        return {
            codigo:
                "CRF_DADOS_INCOMPLETOS",
            nivel:
                "INCONCLUSIVA",
            rotulo:
                "CNPJ não identificado",
            mensagem:
                "O CRF foi reconhecido, mas o CNPJ não pôde ser extraído com segurança.",
        };
    }

    if (
        !cnpjsSaoIguais(
            cnpjDocumento,
            cnpjEsperado
        )
    ) {
        return {
            codigo:
                "DIVERGENCIA_CNPJ",
            nivel:
                "REPROVADA",
            rotulo:
                "Divergência de CNPJ",
            mensagem:
                "O CRF pertence a uma empresa diferente da empresa selecionada.",
        };
    }

    if (
        !numeroCertificacao ||
        !dadosTemporais.dataEmissao ||
        !dadosTemporais.dataValidade
    ) {
        return {
            codigo:
                "CRF_DADOS_INCOMPLETOS",
            nivel:
                "INCONCLUSIVA",
            rotulo:
                "Dados obrigatórios incompletos",
            mensagem:
                "O CRF foi identificado, mas número, emissão ou validade não foram extraídos integralmente.",
        };
    }

    if (
        dadosTemporais
            .situacaoValidade
            .codigo ===
        "VENCIDA"
    ) {
        return {
            codigo:
                "CRF_VENCIDO",
            nivel:
                "REPROVADA",
            rotulo:
                "CRF vencido",
            mensagem:
                "O Certificado de Regularidade do FGTS está vencido.",
        };
    }

    if (
        prazoValidadeDias !== 30
    ) {
        return {
            codigo:
                "CRF_PRAZO_DIVERGENTE",
            nivel:
                "ALERTA",
            rotulo:
                "Prazo documental divergente",
            mensagem:
                "O intervalo identificado no CRF não corresponde ao prazo esperado de 30 dias.",
        };
    }

    return {
        codigo:
            "COMPATIVEL_VALIDACAO_CAIXA",
        nivel:
            "ALERTA",
        rotulo:
            "CRF compatível para consulta oficial",
        mensagem:
            "O CRF corresponde à empresa selecionada e está vigente. A autenticidade ainda deve ser confirmada na CAIXA.",
    };
}

export function avaliarCrfFgts({
    textoExtraido,
    classificacao,
    documentoEsperado,
    empresaEsperada,
    dataReferencia = new Date(),
}) {
    const tipoCorreto =
        classificacao?.id ===
        "crf-fgts";

    const dadosCrf =
        extrairDadosCrf(
            textoExtraido
        );

    const cnpjEsperado =
        formatarCnpj(
            empresaEsperada?.cnpj
        );

    const cnpjDocumento =
        formatarCnpj(
            dadosCrf.cnpjDocumento
        );

    const situacaoEmissao =
        avaliarDataEmissaoDocumental(
            dadosCrf.dataEmissaoIso,
            dataReferencia
        );

    const situacaoValidade =
        avaliarValidadeDocumental(
            dadosCrf.dataValidadeIso,
            dataReferencia
        );

    const dadosTemporais = {
        dataEmissao:
            dadosCrf.dataEmissaoBr,
        dataEmissaoIso:
            dadosCrf.dataEmissaoIso,
        horaEmissao:
            "",
        dataValidade:
            dadosCrf.dataValidadeBr,
        dataValidadeIso:
            dadosCrf.dataValidadeIso,
        situacaoEmissao,
        situacaoValidade,
        dataEmissaoInferida:
            dadosCrf.dataEmissaoInferida,
    };

    const cnpjIdentificado =
        Boolean(
            cnpjDocumento
        );

    const cnpjConfere =
        cnpjIdentificado &&
        cnpjsSaoIguais(
            cnpjDocumento,
            cnpjEsperado
        );

    const numeroIdentificado =
        Boolean(
            dadosCrf.numeroCertificacao
        );

    const emissaoIdentificada =
        Boolean(
            dadosCrf.dataEmissaoIso
        );

    const validadeIdentificada =
        Boolean(
            dadosCrf.dataValidadeIso
        );

    const prazoCorreto =
        dadosCrf.prazoValidadeDias ===
        30;

    const regras = [
        criarRegra({
            codigo:
                "TIPO_DOCUMENTAL",
            titulo:
                "Tipo documental",
            status:
                tipoCorreto
                    ? "APROVADA"
                    : "REPROVADA",
            mensagem:
                tipoCorreto
                    ? "O conteúdo é compatível com um CRF do FGTS."
                    : "O PDF não corresponde a um CRF do FGTS.",
        }),
        criarRegra({
            codigo:
                "CONFERENCIA_CNPJ",
            titulo:
                "Conferência de CNPJ",
            status:
                !cnpjIdentificado
                    ? "INCONCLUSIVA"
                    : (
                        cnpjConfere
                            ? "APROVADA"
                            : "REPROVADA"
                    ),
            mensagem:
                !cnpjIdentificado
                    ? "O CNPJ não foi identificado no CRF."
                    : (
                        cnpjConfere
                            ? "O CNPJ do CRF corresponde à empresa selecionada."
                            : "O CNPJ do CRF pertence a outra empresa."
                    ),
        }),
        criarRegra({
            codigo:
                "NUMERO_CERTIFICACAO",
            titulo:
                "Número de certificação",
            status:
                numeroIdentificado
                    ? "APROVADA"
                    : "INCONCLUSIVA",
            mensagem:
                numeroIdentificado
                    ? (
                        "Certificação nº " +
                        dadosCrf.numeroCertificacao +
                        "."
                    )
                    : "O número de certificação não foi identificado.",
        }),
        criarRegra({
            codigo:
                "DATA_EMISSAO",
            titulo:
                "Data de emissão",
            status:
                !emissaoIdentificada
                    ? "INCONCLUSIVA"
                    : (
                        situacaoEmissao.codigo ===
                        "FUTURA"
                            ? "REPROVADA"
                            : "APROVADA"
                    ),
            mensagem:
                !emissaoIdentificada
                    ? "A data inicial do CRF não foi identificada."
                    : (
                        dadosCrf.dataEmissaoInferida
                            ? (
                                "Emissão considerada a partir do início da validade em " +
                                dadosCrf.dataEmissaoBr +
                                "."
                            )
                            : (
                                "Emissão identificada em " +
                                dadosCrf.dataEmissaoBr +
                                "."
                            )
                    ),
        }),
        criarRegra({
            codigo:
                "VALIDADE_DOCUMENTAL",
            titulo:
                "Validade documental",
            status:
                !validadeIdentificada
                    ? "INCONCLUSIVA"
                    : (
                        situacaoValidade.codigo ===
                        "VENCIDA"
                            ? "REPROVADA"
                            : "APROVADA"
                    ),
            mensagem:
                !validadeIdentificada
                    ? "A validade do CRF não foi identificada."
                    : (
                        situacaoValidade.codigo ===
                        "VENCIDA"
                            ? (
                                "CRF vencido em " +
                                dadosCrf.dataValidadeBr +
                                "."
                            )
                            : (
                                "CRF válido até " +
                                dadosCrf.dataValidadeBr +
                                "."
                            )
                    ),
        }),
        criarRegra({
            codigo:
                "PRAZO_OFICIAL_30_DIAS",
            titulo:
                "Prazo oficial de 30 dias",
            status:
                dadosCrf.prazoValidadeDias ===
                null
                    ? "INCONCLUSIVA"
                    : (
                        prazoCorreto
                            ? "APROVADA"
                            : "REPROVADA"
                    ),
            mensagem:
                dadosCrf.prazoValidadeDias ===
                null
                    ? "Não foi possível calcular o período do CRF."
                    : (
                        prazoCorreto
                            ? "O intervalo inclusivo do CRF corresponde a 30 dias."
                            : (
                                "O intervalo identificado possui " +
                                dadosCrf.prazoValidadeDias +
                                " dia(s)."
                            )
                    ),
        }),
    ];

    const resultadoPrincipal =
        obterResultadoPrincipal({
            cnpjDocumento,
            cnpjEsperado,
            numeroCertificacao:
                dadosCrf.numeroCertificacao,
            dadosTemporais,
            prazoValidadeDias:
                dadosCrf.prazoValidadeDias,
        });

    return {
        aplicavel:
            tipoCorreto,
        documentoIncompativel:
            false,
        bloqueiaSubstituicao:
            false,
        ...resultadoPrincipal,
        requerConferenciaHumana:
            true,
        requerConsultaOficial:
            true,
        documentoEsperado:
            documentoEsperado?.titulo ||
            "CRF FGTS",
        documentoIdentificado:
            classificacao?.titulo ||
            "CRF FGTS",
        empresaEsperada:
            empresaEsperada?.nome ||
            "",
        cnpjEsperado,
        razaoSocialDocumento:
            dadosCrf.razaoSocialDocumento,
        cnpjDocumento,
        natureza:
            criarNaturezaCrf(),
        numeroCertidao:
            dadosCrf.numeroCertificacao,
        anoCertidao:
            dadosCrf.dataEmissaoIso
                ?.slice(0, 4) ||
            "",
        codigoControle:
            dadosCrf.numeroCertificacao,
        dadosTemporais,
        prazoValidadeDias:
            dadosCrf.prazoValidadeDias,
        regras,
    };
}