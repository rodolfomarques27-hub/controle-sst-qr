import {
    cnpjsSaoIguais,
    extrairCnpjsDocumento,
    extrairRazaoSocialDocumento,
    formatarCnpj,
    normalizarTextoDocumental,
    somenteDigitos,
} from "../analysis/certidaoDocumentTextUtils.js";
import {
    avaliarDataEmissaoDocumental,
    avaliarValidadeDocumental,
    extrairDadosTemporaisCndFederal,
} from "../analysis/certidaoDocumentDateUtils.js";

function identificarNaturezaCndFederal(
    texto = ""
) {
    const normalizado =
        normalizarTextoDocumental(texto);

    if (
        normalizado.includes(
            "CERTIDAO POSITIVA COM EFEITOS DE NEGATIVA"
        )
    ) {
        return {
            codigo:
                "POSITIVA_COM_EFEITOS_DE_NEGATIVA",
            rotulo:
                "Positiva com efeitos de negativa",
            documentalmenteCompativel: true,
        };
    }

    if (
        normalizado.includes(
            "CERTIDAO NEGATIVA"
        )
    ) {
        return {
            codigo: "NEGATIVA",
            rotulo: "Negativa",
            documentalmenteCompativel: true,
        };
    }

    if (
        normalizado.includes(
            "CERTIDAO POSITIVA"
        )
    ) {
        return {
            codigo: "POSITIVA",
            rotulo: "Positiva",
            documentalmenteCompativel: false,
        };
    }

    return {
        codigo: "NAO_IDENTIFICADA",
        rotulo: "Não identificada",
        documentalmenteCompativel: false,
    };
}

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

function montarResultado({
    codigo,
    nivel,
    rotulo,
    mensagem,
    requerConsultaOficial,
    documentoEsperado,
    classificacao,
    empresaEsperada,
    cnpjEsperado,
    razaoSocialDocumento,
    cnpjDocumento,
    natureza,
    dadosTemporais,
    situacaoEmissao,
    situacaoValidade,
    regras,
}) {
    return {
        aplicavel: true,
        codigo,
        nivel,
        rotulo,
        mensagem,
        requerConferenciaHumana: true,
        requerConsultaOficial,
        documentoEsperado:
            documentoEsperado?.titulo ||
            "CND Federal",
        documentoIdentificado:
            classificacao?.titulo ||
            "Não identificado",
        empresaEsperada:
            empresaEsperada?.nome || "",
        cnpjEsperado:
            formatarCnpj(cnpjEsperado),
        razaoSocialDocumento,
        cnpjDocumento:
            formatarCnpj(cnpjDocumento),
        natureza,
        codigoControle:
            dadosTemporais.codigoControle,
        dadosTemporais: {
            dataEmissao:
                dadosTemporais.dataEmissaoBr,
            dataEmissaoIso:
                dadosTemporais.dataEmissaoIso,
            horaEmissao:
                dadosTemporais.horaEmissao,
            dataValidade:
                dadosTemporais.dataValidadeBr,
            dataValidadeIso:
                dadosTemporais.dataValidadeIso,
            situacaoEmissao,
            situacaoValidade,
        },
        regras,
    };
}

export function avaliarCndFederal({
    textoExtraido,
    classificacao,
    documentoEsperado,
    empresaEsperada,
    dataReferencia = new Date(),
}) {
    const cnpjsEncontrados =
        extrairCnpjsDocumento(
            textoExtraido
        );

    const cnpjDocumento =
        cnpjsEncontrados[0] || "";

    const cnpjEsperado =
        somenteDigitos(
            empresaEsperada?.cnpj
        );

    const razaoSocialDocumento =
        extrairRazaoSocialDocumento(
            textoExtraido
        );

    const natureza =
        identificarNaturezaCndFederal(
            textoExtraido
        );

    const dadosTemporais =
        extrairDadosTemporaisCndFederal(
            textoExtraido
        );

    const situacaoEmissao =
        avaliarDataEmissaoDocumental(
            dadosTemporais.dataEmissaoIso,
            dataReferencia
        );

    const situacaoValidade =
        avaliarValidadeDocumental(
            dadosTemporais.dataValidadeIso,
            dataReferencia
        );

    const tipoCorreto =
        classificacao?.id ===
        "cnd-federal";

    const possuiCnpjDocumento =
        cnpjDocumento.length === 14;

    const cnpjConfere =
        cnpjsSaoIguais(
            cnpjDocumento,
            cnpjEsperado
        );

    const possuiCodigoControle =
        Boolean(
            dadosTemporais.codigoControle
        );

    const regras = [
        criarRegra({
            codigo: "TIPO_DOCUMENTAL",
            titulo: "Tipo documental",
            status:
                tipoCorreto
                    ? "APROVADA"
                    : "REPROVADA",
            mensagem:
                tipoCorreto
                    ? "O conteúdo é compatível com uma CND Federal."
                    : "O conteúdo não corresponde ao documento selecionado.",
        }),
        criarRegra({
            codigo: "CNPJ_DOCUMENTO",
            titulo: "Conferência de CNPJ",
            status:
                !possuiCnpjDocumento
                    ? "INCONCLUSIVA"
                    : cnpjConfere
                        ? "APROVADA"
                        : "REPROVADA",
            mensagem:
                !possuiCnpjDocumento
                    ? "Nenhum CNPJ confiável foi localizado no PDF."
                    : cnpjConfere
                        ? "O CNPJ do PDF corresponde à empresa selecionada."
                        : "O CNPJ do PDF pertence a outra empresa.",
        }),
        criarRegra({
            codigo: "NATUREZA_CERTIDAO",
            titulo: "Natureza da certidão",
            status:
                natureza.documentalmenteCompativel
                    ? "APROVADA"
                    : natureza.codigo ===
                        "NAO_IDENTIFICADA"
                        ? "INCONCLUSIVA"
                        : "REPROVADA",
            mensagem:
                natureza.documentalmenteCompativel
                    ? `Natureza identificada: ${natureza.rotulo}.`
                    : natureza.codigo ===
                        "NAO_IDENTIFICADA"
                        ? "A natureza da certidão não foi identificada."
                        : "Foi identificada certidão positiva sem efeito de negativa.",
        }),
        criarRegra({
            codigo: "DATA_EMISSAO",
            titulo: "Data de emissão",
            status:
                situacaoEmissao.codigo ===
                "FUTURA"
                    ? "REPROVADA"
                    : situacaoEmissao.codigo ===
                        "NAO_IDENTIFICADA"
                        ? "INCONCLUSIVA"
                        : "APROVADA",
            mensagem:
                situacaoEmissao.codigo ===
                "FUTURA"
                    ? "A data de emissão encontrada está no futuro."
                    : situacaoEmissao.codigo ===
                        "NAO_IDENTIFICADA"
                        ? "A data de emissão não foi identificada."
                        : `Emissão identificada em ${dadosTemporais.dataEmissaoBr}.`,
        }),
        criarRegra({
            codigo: "VALIDADE_DOCUMENTO",
            titulo: "Validade documental",
            status:
                situacaoValidade.vencida
                    ? "REPROVADA"
                    : situacaoValidade.codigo ===
                        "NAO_IDENTIFICADA"
                        ? "INCONCLUSIVA"
                        : "APROVADA",
            mensagem:
                situacaoValidade.vencida
                    ? `Documento vencido em ${dadosTemporais.dataValidadeBr}.`
                    : situacaoValidade.codigo ===
                        "NAO_IDENTIFICADA"
                        ? "A data de validade não foi identificada."
                        : situacaoValidade.venceHoje
                            ? "O documento vence hoje."
                            : `Documento válido por mais ${situacaoValidade.diasRestantes} dia(s).`,
        }),
        criarRegra({
            codigo: "CODIGO_CONTROLE",
            titulo: "Código de controle",
            status:
                possuiCodigoControle
                    ? "APROVADA"
                    : "INCONCLUSIVA",
            mensagem:
                possuiCodigoControle
                    ? "Código de controle localizado no documento."
                    : "O código de controle não foi identificado.",
        }),
    ];

    const dadosResultado = {
        documentoEsperado,
        classificacao,
        empresaEsperada,
        cnpjEsperado,
        razaoSocialDocumento,
        cnpjDocumento,
        natureza,
        dadosTemporais,
        situacaoEmissao,
        situacaoValidade,
        regras,
    };

    if (!tipoCorreto) {
        return montarResultado({
            ...dadosResultado,
            codigo:
                "TIPO_DOCUMENTAL_DIVERGENTE",
            nivel: "REPROVADA",
            rotulo: "Documento divergente",
            mensagem:
                "O PDF não corresponde à CND Federal selecionada.",
            requerConsultaOficial: false,
        });
    }

    if (
        possuiCnpjDocumento &&
        cnpjEsperado &&
        !cnpjConfere
    ) {
        return montarResultado({
            ...dadosResultado,
            codigo: "DIVERGENCIA_CNPJ",
            nivel: "REPROVADA",
            rotulo: "Divergência de CNPJ",
            mensagem:
                "O documento pertence a uma empresa diferente da empresa selecionada.",
            requerConsultaOficial: false,
        });
    }

    if (
        situacaoEmissao.codigo ===
        "FUTURA"
    ) {
        return montarResultado({
            ...dadosResultado,
            codigo:
                "DATA_EMISSAO_FUTURA",
            nivel: "REPROVADA",
            rotulo:
                "Data de emissão inconsistente",
            mensagem:
                "O documento possui uma data de emissão posterior à data atual.",
            requerConsultaOficial: false,
        });
    }

    if (situacaoValidade.vencida) {
        return montarResultado({
            ...dadosResultado,
            codigo: "DOCUMENTO_VENCIDO",
            nivel: "REPROVADA",
            rotulo: "Documento vencido",
            mensagem:
                `A validade documental terminou em ${dadosTemporais.dataValidadeBr}.`,
            requerConsultaOficial: false,
        });
    }

    if (
        natureza.codigo ===
        "POSITIVA"
    ) {
        return montarResultado({
            ...dadosResultado,
            codigo: "CERTIDAO_POSITIVA",
            nivel: "REPROVADA",
            rotulo: "Certidão positiva",
            mensagem:
                "A certidão é positiva e não foi identificado efeito de negativa.",
            requerConsultaOficial: true,
        });
    }

    if (
        !possuiCnpjDocumento ||
        natureza.codigo ===
            "NAO_IDENTIFICADA" ||
        situacaoValidade.codigo ===
            "NAO_IDENTIFICADA"
    ) {
        return montarResultado({
            ...dadosResultado,
            codigo:
                "AVALIACAO_INCONCLUSIVA",
            nivel: "INCONCLUSIVA",
            rotulo:
                "Avaliação inconclusiva",
            mensagem:
                "Nem todos os campos obrigatórios foram identificados com segurança.",
            requerConsultaOficial: true,
        });
    }

    return montarResultado({
        ...dadosResultado,
        codigo:
            "COMPATIVEL_CONSULTA_OFICIAL",
        nivel: "ALERTA",
        rotulo:
            "Compatível — consultar fonte oficial",
        mensagem:
            possuiCodigoControle
                ? "Tipo, CNPJ, natureza e validade são compatíveis. A autenticidade deve ser confirmada na fonte oficial."
                : "Os dados principais são compatíveis, mas o código de controle não foi localizado. A conferência oficial permanece necessária.",
        requerConsultaOficial: true,
    });
}