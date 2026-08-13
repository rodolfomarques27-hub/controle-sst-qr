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
} from "../analysis/certidaoDocumentDateUtils.js";
import {
    extrairDadosCndt,
} from "../analysis/certidaoCndtTextUtils.js";

function identificarNaturezaCndt(
    texto
) {
    const normalizado =
        normalizarTextoDocumental(
            texto
        );

    if (
        normalizado.includes(
            "CERTIDAO POSITIVA COM EFEITO DE NEGATIVA"
        ) ||
        normalizado.includes(
            "CERTIDAO POSITIVA COM EFEITOS DE NEGATIVA"
        )
    ) {
        return {
            codigo:
                "POSITIVA_COM_EFEITOS_DE_NEGATIVA",
            rotulo:
                "Positiva com efeitos de negativa",
            compativel: true,
        };
    }

    if (
        normalizado.includes(
            "CERTIDAO NEGATIVA DE DEBITOS TRABALHISTAS"
        )
    ) {
        return {
            codigo: "NEGATIVA",
            rotulo: "Negativa",
            compativel: true,
        };
    }

    if (
        normalizado.includes(
            "CERTIDAO POSITIVA DE DEBITOS TRABALHISTAS"
        )
    ) {
        return {
            codigo: "POSITIVA",
            rotulo: "Positiva",
            compativel: false,
        };
    }

    return {
        codigo: "NAO_IDENTIFICADA",
        rotulo: "Não identificada",
        compativel: false,
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
    dadosCndt,
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
            "CNDT",
        documentoIdentificado:
            classificacao?.titulo ||
            "Não identificado",
        empresaEsperada:
            empresaEsperada?.nome || "",
        cnpjEsperado:
            formatarCnpj(
                cnpjEsperado
            ),
        razaoSocialDocumento,
        cnpjDocumento:
            formatarCnpj(
                cnpjDocumento
            ),
        natureza,
        numeroCertidao:
            dadosCndt.numeroCertidao,
        anoCertidao:
            dadosCndt.anoCertidao,
        codigoControle:
            dadosCndt.numeroCompleto,
        dadosTemporais: {
            dataEmissao:
                dadosCndt.dataEmissao,
            dataEmissaoIso:
                dadosCndt.dataEmissaoIso,
            horaEmissao:
                dadosCndt.horaEmissao,
            dataValidade:
                dadosCndt.dataValidade,
            dataValidadeIso:
                dadosCndt.dataValidadeIso,
            duracaoValidadeDias:
                dadosCndt.duracaoValidadeDias,
            situacaoEmissao,
            situacaoValidade,
        },
        regras,
    };
}

export function avaliarCndt({
    textoExtraido,
    classificacao,
    documentoEsperado,
    empresaEsperada,
    dataReferencia = new Date(),
}) {
    const cnpjDocumento =
        extrairCnpjsDocumento(
            textoExtraido
        )[0] || "";

    const cnpjEsperado =
        somenteDigitos(
            empresaEsperada?.cnpj
        );

    const razaoSocialDocumento =
        extrairRazaoSocialDocumento(
            textoExtraido
        );

    const natureza =
        identificarNaturezaCndt(
            textoExtraido
        );

    const dadosCndt =
        extrairDadosCndt(
            textoExtraido
        );

    const situacaoEmissao =
        avaliarDataEmissaoDocumental(
            dadosCndt.dataEmissaoIso,
            dataReferencia
        );

    const situacaoValidade =
        avaliarValidadeDocumental(
            dadosCndt.dataValidadeIso,
            dataReferencia
        );

    const tipoCorreto =
        classificacao?.id ===
        "cndt-trabalhista";

    const possuiCnpj =
        somenteDigitos(
            cnpjDocumento
        ).length === 14;

    const cnpjConfere =
        cnpjsSaoIguais(
            cnpjDocumento,
            cnpjEsperado
        );

    const possuiNumero =
        Boolean(
            dadosCndt.numeroCertidao &&
            dadosCndt.anoCertidao
        );

    const prazo180Dias =
        dadosCndt.duracaoValidadeDias ===
        180;

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
                    ? "O conteúdo é compatível com uma CNDT."
                    : "O PDF não corresponde à CNDT selecionada.",
        }),
        criarRegra({
            codigo: "CNPJ_DOCUMENTO",
            titulo: "Conferência de CNPJ",
            status:
                !possuiCnpj
                    ? "INCONCLUSIVA"
                    : cnpjConfere
                        ? "APROVADA"
                        : "REPROVADA",
            mensagem:
                !possuiCnpj
                    ? "Nenhum CNPJ confiável foi localizado."
                    : cnpjConfere
                        ? "O CNPJ corresponde à empresa selecionada."
                        : "O CNPJ pertence a outra empresa.",
        }),
        criarRegra({
            codigo: "NATUREZA_CNDT",
            titulo: "Natureza da CNDT",
            status:
                natureza.compativel
                    ? "APROVADA"
                    : natureza.codigo ===
                        "NAO_IDENTIFICADA"
                        ? "INCONCLUSIVA"
                        : "REPROVADA",
            mensagem:
                natureza.codigo ===
                    "NAO_IDENTIFICADA"
                    ? "A natureza da certidão não foi identificada."
                    : `Natureza identificada: ${natureza.rotulo}.`,
        }),
        criarRegra({
            codigo: "NUMERO_CERTIDAO",
            titulo: "Número da certidão",
            status:
                possuiNumero
                    ? "APROVADA"
                    : "INCONCLUSIVA",
            mensagem:
                possuiNumero
                    ? `Certidão nº ${dadosCndt.numeroCompleto}.`
                    : "Número e ano da certidão não foram identificados.",
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
                    ? "A data de emissão está no futuro."
                    : situacaoEmissao.codigo ===
                        "NAO_IDENTIFICADA"
                        ? "A data de emissão não foi identificada."
                        : `Emissão identificada em ${dadosCndt.dataEmissao}.`,
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
                    ? `Documento vencido em ${dadosCndt.dataValidade}.`
                    : situacaoValidade.codigo ===
                        "NAO_IDENTIFICADA"
                        ? "A validade não foi identificada."
                        : situacaoValidade.venceHoje
                            ? "O documento vence hoje."
                            : `Documento válido por mais ${situacaoValidade.diasRestantes} dia(s).`,
        }),
        criarRegra({
            codigo: "PRAZO_180_DIAS",
            titulo: "Prazo oficial de 180 dias",
            status:
                dadosCndt.duracaoValidadeDias ===
                null
                    ? "INCONCLUSIVA"
                    : prazo180Dias
                        ? "APROVADA"
                        : "INCONCLUSIVA",
            mensagem:
                dadosCndt.duracaoValidadeDias ===
                null
                    ? "Não foi possível calcular o prazo da certidão."
                    : prazo180Dias
                        ? "O intervalo entre emissão e validade é de 180 dias."
                        : `O intervalo identificado foi de ${dadosCndt.duracaoValidadeDias} dia(s) e deve ser conferido no TST.`,
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
        dadosCndt,
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
                "O PDF não corresponde à CNDT selecionada.",
            requerConsultaOficial: false,
        });
    }

    if (
        possuiCnpj &&
        cnpjEsperado &&
        !cnpjConfere
    ) {
        return montarResultado({
            ...dadosResultado,
            codigo: "DIVERGENCIA_CNPJ",
            nivel: "REPROVADA",
            rotulo: "Divergência de CNPJ",
            mensagem:
                "A CNDT pertence a uma empresa diferente da empresa selecionada.",
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
                "A data de emissão da CNDT é posterior à data atual.",
            requerConsultaOficial: false,
        });
    }

    if (situacaoValidade.vencida) {
        return montarResultado({
            ...dadosResultado,
            codigo: "DOCUMENTO_VENCIDO",
            nivel: "REPROVADA",
            rotulo: "CNDT vencida",
            mensagem:
                `A validade terminou em ${dadosCndt.dataValidade}.`,
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
            rotulo: "CNDT positiva",
            mensagem:
                "Foi identificada certidão positiva sem efeitos de negativa.",
            requerConsultaOficial: true,
        });
    }

    if (
        !possuiCnpj ||
        !possuiNumero ||
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
                "Nem todos os campos obrigatórios da CNDT foram identificados.",
            requerConsultaOficial: true,
        });
    }

    if (!prazo180Dias) {
        return montarResultado({
            ...dadosResultado,
            codigo:
                "PRAZO_VALIDADE_DIVERGENTE",
            nivel: "INCONCLUSIVA",
            rotulo:
                "Prazo de validade divergente",
            mensagem:
                "O prazo identificado não corresponde a 180 dias e deve ser conferido no TST.",
            requerConsultaOficial: true,
        });
    }

    return montarResultado({
        ...dadosResultado,
        codigo:
            "COMPATIVEL_VALIDACAO_TST",
        nivel: "ALERTA",
        rotulo:
            "Compatível — validar no TST",
        mensagem:
            "Tipo, CNPJ, natureza e validade são compatíveis. A autenticidade ainda deve ser confirmada no TST.",
        requerConsultaOficial: true,
    });
}