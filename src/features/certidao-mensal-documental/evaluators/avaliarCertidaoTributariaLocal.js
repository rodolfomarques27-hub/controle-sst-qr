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
    converterDataBrParaIso,
} from "../analysis/certidaoDocumentDateUtils.js";

function textoSeguro(valor) {
    return String(valor ?? "").trim();
}

function normalizarDataBr(valor) {
    const match =
        /^(\d{1,2})[\/.-](\d{1,2})[\/.-]((?:19|20)\d{2})$/
            .exec(
                textoSeguro(valor)
            );

    if (!match) {
        return "";
    }

    return (
        match[1].padStart(2, "0") +
        "/" +
        match[2].padStart(2, "0") +
        "/" +
        match[3]
    );
}

function extrairPrimeiraData(
    texto,
    padroes
) {
    const conteudo =
        textoSeguro(texto)
            .replace(/\s+/g, " ");

    for (const padrao of padroes) {
        const match =
            padrao.exec(conteudo);

        const data =
            normalizarDataBr(
                match?.[1]
            );

        if (data) {
            return data;
        }
    }

    return "";
}

function extrairCodigoControle(
    texto
) {
    const conteudo =
        textoSeguro(texto)
            .replace(/\s+/g, " ");

    const padroes = [
        /C[ÓO]DIGO\s+(?:DE\s+)?CONTROLE\s*[:\-]?\s*([A-Z0-9][A-Z0-9.\-\/]{5,80})/i,
        /C[ÓO]DIGO\s+(?:DE\s+)?AUTENTICIDADE\s*[:\-]?\s*([A-Z0-9][A-Z0-9.\-\/]{5,80})/i,
        /AUTENTICIDADE\s*[:\-]?\s*([A-Z0-9][A-Z0-9.\-\/]{5,80})/i,
        /CHAVE\s+PARA\s+VALIDA[CÇ][AÃ]O\s*[:\-]?\s*([A-Z0-9][A-Z0-9.\-\/]{5,80})/i,
    ];

    for (const padrao of padroes) {
        const match =
            padrao.exec(conteudo);

        const valor =
            textoSeguro(
                match?.[1]
            );

        if (valor) {
            return valor;
        }
    }

    return "";
}


function extrairCnpjBaseDocumento(
    texto
) {
    const conteudo =
        textoSeguro(
            texto
        ).replace(
            /\s+/g,
            " "
        );

    const match =
        /\bCNPJ\s+BASE\s*[:\-]?\s*(\d{2}(?:\.\d{3}){2}|\d{8})(?![\d\/.-])/i.exec(
            conteudo
        );

    const digitos =
        somenteDigitos(
            match?.[1]
        );

    return digitos.length === 8
        ? digitos
        : "";
}

function formatarCnpjBase(
    valor
) {
    const digitos =
        somenteDigitos(
            valor
        );

    if (digitos.length !== 8) {
        return "";
    }

    return (
        digitos.slice(0, 2) +
        "." +
        digitos.slice(2, 5) +
        "." +
        digitos.slice(5, 8)
    );
}

function extrairHoraEmissao(
    texto
) {
    const conteudo =
        textoSeguro(
            texto
        ).replace(
            /\s+/g,
            " "
        );

    const padroes = [
        /DATA\s+E\s+HORA\s+DA\s+EMISS[AÃ]O\s*[:\-]?\s*\d{1,2}[\/.-]\d{1,2}[\/.-](?:19|20)\d{2}\s+(\d{1,2}:\d{2}(?::\d{2})?)/i,
        /CERTID[AÃ]O\s+CONCEDID[AO]\s+(?:NO\s+DIA|EM)\s*[:\-]?\s*\d{1,2}[\/.-]\d{1,2}[\/.-](?:19|20)\d{2}\s+(?:[ÀA]S\s+)?(\d{1,2}:\d{2}(?::\d{2})?)/i,
    ];

    for (const padrao of padroes) {
        const match =
            padrao.exec(
                conteudo
            );

        const hora =
            textoSeguro(
                match?.[1]
            );

        if (hora) {
            return hora;
        }
    }

    return "";
}

function extrairPrazoValidadeDias(
    texto
) {
    const conteudo =
        textoSeguro(
            texto
        ).replace(
            /\s+/g,
            " "
        );

    const match =
        /\bVALIDADE\s*[:\-]?\s*(\d{1,4})(?:\s*\([^)]+\))?\s+DIAS?\s*,?\s*(?:CONTADOS?\s+DA|A\s+CONTAR\s+DA|CONTADOS?\s+A\s+PARTIR\s+DA)\s+EMISS[AÃ]O\b/i.exec(
            conteudo
        );

    if (!match) {
        return null;
    }

    const dias =
        Number.parseInt(
            match[1],
            10
        );

    if (
        !Number.isInteger(dias) ||
        dias < 1 ||
        dias > 3660
    ) {
        return null;
    }

    return dias;
}

function extrairPrazoValidadeMeses(
    texto
) {
    const conteudo =
        textoSeguro(
            texto
        ).replace(
            /\s+/g,
            " "
        );

    const match =
        /\bVALIDADE\s*[:\-]?\s*(\d{1,3})(?:\s*\([^)]+\))?\s+MESES?\s*,?\s*(?:CONTADOS?\s+DA\s+DATA\s+DE\s+SUA\s+EXPEDI[CÇ][AÃ]O|CONTADOS?\s+DA\s+EXPEDI[CÇ][AÃ]O|A\s+CONTAR\s+DA\s+DATA\s+DE\s+SUA\s+EXPEDI[CÇ][AÃ]O|A\s+CONTAR\s+DA\s+EXPEDI[CÇ][AÃ]O|CONTADOS?\s+DA\s+EMISS[AÃ]O|A\s+CONTAR\s+DA\s+EMISS[AÃ]O)\b/i.exec(
            conteudo
        );

    if (!match) {
        return null;
    }

    const meses =
        Number.parseInt(
            match[1],
            10
        );

    if (
        !Number.isInteger(
            meses
        ) ||
        meses < 1 ||
        meses > 120
    ) {
        return null;
    }

    return meses;
}

function adicionarMesesCalendarioDataIso(
    dataIso,
    quantidadeMeses
) {
    const match =
        /^((?:19|20)\d{2})-(\d{2})-(\d{2})$/.exec(
            textoSeguro(
                dataIso
            )
        );

    if (
        !match ||
        !Number.isInteger(
            quantidadeMeses
        )
    ) {
        return "";
    }

    const anoInicial =
        Number(
            match[1]
        );

    const mesInicial =
        Number(
            match[2]
        ) - 1;

    const diaInicial =
        Number(
            match[3]
        );

    const indiceMesDestino =
        mesInicial +
        quantidadeMeses;

    const anoDestino =
        anoInicial +
        Math.floor(
            indiceMesDestino /
            12
        );

    const mesDestino =
        (
            (
                indiceMesDestino %
                12
            ) +
            12
        ) %
        12;

    const ultimoDiaDestino =
        new Date(
            Date.UTC(
                anoDestino,
                mesDestino + 1,
                0
            )
        ).getUTCDate();

    const diaDestino =
        Math.min(
            diaInicial,
            ultimoDiaDestino
        );

    return (
        String(
            anoDestino
        ).padStart(
            4,
            "0"
        ) +
        "-" +
        String(
            mesDestino + 1
        ).padStart(
            2,
            "0"
        ) +
        "-" +
        String(
            diaDestino
        ).padStart(
            2,
            "0"
        )
    );
}

function adicionarDiasDataIso(
    dataIso,
    quantidadeDias
) {
    const match =
        /^((?:19|20)\d{2})-(\d{2})-(\d{2})$/.exec(
            textoSeguro(
                dataIso
            )
        );

    if (
        !match ||
        !Number.isInteger(
            quantidadeDias
        )
    ) {
        return "";
    }

    const data =
        new Date(
            Date.UTC(
                Number(match[1]),
                Number(match[2]) - 1,
                Number(match[3])
            )
        );

    data.setUTCDate(
        data.getUTCDate() +
        quantidadeDias
    );

    return data
        .toISOString()
        .slice(
            0,
            10
        );
}

function converterDataIsoParaBr(
    dataIso
) {
    const match =
        /^((?:19|20)\d{2})-(\d{2})-(\d{2})$/.exec(
            textoSeguro(
                dataIso
            )
        );

    if (!match) {
        return "";
    }

    return (
        match[3] +
        "/" +
        match[2] +
        "/" +
        match[1]
    );
}

function extrairDadosTemporais(
    texto
) {
    const dataEmissaoBr =
        extrairPrimeiraData(
            texto,
            [
                /DATA\s+E\s+HORA\s+DA\s+EMISS[AÃ]O\s*[:\-]?\s*(\d{1,2}[\/.-]\d{1,2}[\/.-](?:19|20)\d{2})/i,
                /(?:DATA\s+(?:DA|DE)\s+)?EMISS[AÃ]O\s*[:\-]?\s*(\d{1,2}[\/.-]\d{1,2}[\/.-](?:19|20)\d{2})/i,
                /EMITID[AO]\s+EM\s*[:\-]?\s*(\d{1,2}[\/.-]\d{1,2}[\/.-](?:19|20)\d{2})/i,
                /EXPEDID[AO]\s+EM\s*[:\-]?\s*(\d{1,2}[\/.-]\d{1,2}[\/.-](?:19|20)\d{2})/i,
                /GERAD[AO]\s+EM\s*[:\-]?\s*(\d{1,2}[\/.-]\d{1,2}[\/.-](?:19|20)\d{2})/i,
                /CERTID[AÃ]O\s+CONCEDID[AO]\s+(?:NO\s+DIA|EM)\s*[:\-]?\s*(\d{1,2}[\/.-]\d{1,2}[\/.-](?:19|20)\d{2})/i,
            ]
        );

    const dataEmissaoIso =
        dataEmissaoBr
            ? converterDataBrParaIso(
                dataEmissaoBr
            )
            : "";

    const dataValidadeExplicitaBr =
        extrairPrimeiraData(
            texto,
            [
                /(?:DATA\s+(?:DA|DE)\s+)?VALIDADE\s*[:\-]?\s*(?:AT[ÉE]\s*)?(\d{1,2}[\/.-]\d{1,2}[\/.-](?:19|20)\d{2})/i,
                /V[AÁ]LID[AO]\s+AT[ÉE]\s*[:\-]?\s*(\d{1,2}[\/.-]\d{1,2}[\/.-](?:19|20)\d{2})/i,
                /V[AÁ]LIDA\s+AT[ÉE]\s*[:\-]?\s*(\d{1,2}[\/.-]\d{1,2}[\/.-](?:19|20)\d{2})/i,
                /VENCIMENTO\s*[:\-]?\s*(\d{1,2}[\/.-]\d{1,2}[\/.-](?:19|20)\d{2})/i,
            ]
        );

    const dataValidadeExplicitaIso =
        dataValidadeExplicitaBr
            ? converterDataBrParaIso(
                dataValidadeExplicitaBr
            )
            : "";

    const prazoValidadeDias =
        extrairPrazoValidadeDias(
            texto
        );

    const prazoValidadeMeses =
        extrairPrazoValidadeMeses(
            texto
        );

    const possuiPrazoDias =
        Number.isInteger(
            prazoValidadeDias
        );

    const possuiPrazoMeses =
        Number.isInteger(
            prazoValidadeMeses
        );

    const prazoValidadeAmbiguo =
        possuiPrazoDias &&
        possuiPrazoMeses;

    const dataValidadeCalculadaPorMesesIso =
        !dataValidadeExplicitaIso &&
        dataEmissaoIso &&
        !prazoValidadeAmbiguo &&
        possuiPrazoMeses
            ? adicionarMesesCalendarioDataIso(
                dataEmissaoIso,
                prazoValidadeMeses
            )
            : "";

    const dataValidadeCalculadaPorDiasIso =
        !dataValidadeExplicitaIso &&
        dataEmissaoIso &&
        !prazoValidadeAmbiguo &&
        !dataValidadeCalculadaPorMesesIso &&
        possuiPrazoDias
            ? adicionarDiasDataIso(
                dataEmissaoIso,
                prazoValidadeDias
            )
            : "";

    const dataValidadeCalculadaIso =
        dataValidadeCalculadaPorMesesIso ||
        dataValidadeCalculadaPorDiasIso;

    const dataValidadeIso =
        dataValidadeExplicitaIso ||
        dataValidadeCalculadaIso;

    const dataValidadeBr =
        dataValidadeExplicitaBr ||
        converterDataIsoParaBr(
            dataValidadeCalculadaIso
        );

    const validadeCalculadaPorPrazo =
        Boolean(
            dataValidadeCalculadaIso
        );

    const unidadePrazoValidade =
        dataValidadeCalculadaPorMesesIso
            ? "MESES"
            : dataValidadeCalculadaPorDiasIso
                ? "DIAS"
                : "";

    return {
        dataEmissaoBr,
        dataEmissaoIso,
        horaEmissao:
            extrairHoraEmissao(
                texto
            ),
        dataValidadeBr,
        dataValidadeIso,
        prazoValidadeDias,
        prazoValidadeMeses,
        prazoValidadeAmbiguo,
        unidadePrazoValidade,
        validadeCalculadaPorPrazo,
        origemValidade:
            dataValidadeExplicitaIso
                ? "DATA_EXPLICITA"
                : validadeCalculadaPorPrazo
                    ? "PRAZO_DECLARADO"
                    : "",
        codigoControle:
            extrairCodigoControle(
                texto
            ),
    };
}

function identificarNatureza(
    texto
) {
    const normalizado =
        normalizarTextoDocumental(
            texto
        );

    if (
        normalizado.includes(
            "CERTIDAO POSITIVA COM EFEITOS DE NEGATIVA"
        ) ||
        normalizado.includes(
            "CERTIDAO POSITIVA COM EFEITO DE NEGATIVA"
        )
    ) {
        return {
            codigo:
                "POSITIVA_COM_EFEITOS_DE_NEGATIVA",
            rotulo:
                "Positiva com efeitos de negativa",
            documentalmenteCompativel:
                true,
        };
    }

    if (
        normalizado.includes(
            "CERTIDAO NEGATIVA"
        )
    ) {
        return {
            codigo:
                "NEGATIVA",
            rotulo:
                "Negativa",
            documentalmenteCompativel:
                true,
        };
    }

    const negativaSefazDebitosNaoInscritos =
        normalizado.includes(
            "SECRETARIA DA FAZENDA"
        ) &&
        normalizado.includes(
            "DEBITOS TRIBUTARIOS NAO INSCRITOS NA DIVIDA ATIVA"
        ) &&
        normalizado.includes(
            "NAO CONSTAM DEBITOS DECLARADOS OU APURADOS PENDENTES DE INSCRICAO NA DIVIDA ATIVA"
        );

    if (
        negativaSefazDebitosNaoInscritos
    ) {
        return {
            codigo:
                "NEGATIVA",
            rotulo:
                "Negativa",
            documentalmenteCompativel:
                true,
        };
    }

    const contextoMunicipal =
        normalizado.includes(
            "DEBITOS MUNICIPAIS"
        ) ||
        normalizado.includes(
            "PREFEITURA"
        ) ||
        normalizado.includes(
            "SECRETARIA MUNICIPAL"
        );

    const negativaMunicipalSemDebitos =
        contextoMunicipal &&
        /CERTIFICA E DA FE.{0,180}NAO CONSTA(?:\(M\)|M)?.{0,180}DEBITO(?:\(S\))?/i.test(
            normalizado
        );

    if (
        negativaMunicipalSemDebitos
    ) {
        return {
            codigo:
                "NEGATIVA",
            rotulo:
                "Negativa",
            documentalmenteCompativel:
                true,
        };
    }

    if (
        normalizado.includes(
            "CERTIDAO POSITIVA"
        )
    ) {
        return {
            codigo:
                "POSITIVA",
            rotulo:
                "Positiva",
            documentalmenteCompativel:
                false,
        };
    }

    return {
        codigo:
            "NAO_IDENTIFICADA",
        rotulo:
            "Não identificada",
        documentalmenteCompativel:
            false,
    };
}

function identificarFonteOficial(
    texto,
    tipoDocumento
) {
    const normalizado =
        normalizarTextoDocumental(
            texto
        );

    if (
        tipoDocumento ===
        "cnd-estadual"
    ) {
        if (
            normalizado.includes(
                "NAO INSCRITOS NA DIVIDA ATIVA"
            ) ||
            normalizado.includes(
                "SECRETARIA DA FAZENDA"
            ) ||
            normalizado.includes(
                "SECRETARIA DE ESTADO DA FAZENDA"
            ) ||
            /\bSEFAZ\b/.test(
                normalizado
            )
        ) {
            return {
                codigo: "SEFAZ",
                rotulo:
                    "Secretaria da Fazenda estadual",
                identificada: true,
            };
        }

        if (
            normalizado.includes(
                "PROCURADORIA GERAL DO ESTADO"
            ) ||
            /\bPGE\b/.test(
                normalizado
            ) ||
            normalizado.includes(
                "DIVIDA ATIVA DO ESTADO"
            )
        ) {
            return {
                codigo: "PGE",
                rotulo:
                    "Procuradoria-Geral do Estado / Dívida Ativa",
                identificada: true,
            };
        }

        return {
            codigo:
                "ESTADUAL_NAO_IDENTIFICADA",
            rotulo:
                "Órgão estadual não identificado",
            identificada: false,
        };
    }

    if (
        tipoDocumento ===
        "cnd-municipal"
    ) {
        if (
            normalizado.includes(
                "PREFEITURA"
            ) ||
            normalizado.includes(
                "SECRETARIA MUNICIPAL"
            ) ||
            normalizado.includes(
                "FAZENDA MUNICIPAL"
            )
        ) {
            return {
                codigo:
                    "MUNICIPIO",
                rotulo:
                    "Fazenda / Prefeitura municipal",
                identificada: true,
            };
        }

        return {
            codigo:
                "MUNICIPAL_NAO_IDENTIFICADA",
            rotulo:
                "Órgão municipal não identificado",
            identificada: false,
        };
    }

    return {
        codigo:
            "NAO_APLICAVEL",
        rotulo:
            "Não aplicável",
        identificada: false,
    };
}

function criarRegra(
    codigo,
    titulo,
    status,
    mensagem
) {
    return {
        codigo,
        titulo,
        status,
        mensagem,
    };
}

function descreverPrazoValidadeDeclarado(
    dadosTemporais
) {
    if (
        dadosTemporais
            ?.unidadePrazoValidade ===
            "MESES" &&
        Number.isInteger(
            dadosTemporais
                ?.prazoValidadeMeses
        )
    ) {
        return (
            dadosTemporais
                .prazoValidadeMeses +
            " meses explicitamente declarado no documento"
        );
    }

    if (
        dadosTemporais
            ?.unidadePrazoValidade ===
            "DIAS" &&
        Number.isInteger(
            dadosTemporais
                ?.prazoValidadeDias
        )
    ) {
        return (
            dadosTemporais
                .prazoValidadeDias +
            " dias explicitamente declarado no documento"
        );
    }

    return (
        "período explicitamente declarado no documento"
    );
}

function montarResultado({
    codigo,
    nivel,
    rotulo,
    mensagem,
    documentoEsperado,
    classificacao,
    empresaEsperada,
    cnpjEsperado,
    razaoSocialDocumento,
    cnpjDocumento,
    natureza,
    fonteOficial,
    dadosTemporais,
    situacaoEmissao,
    situacaoValidade,
    regras,
    requerConsultaOficial,
}) {
    const documentoIncompativel =
        codigo ===
            "FONTE_ESTADUAL_INCOMPATIVEL";

    const bloqueiaSubstituicao =
        documentoIncompativel ||
        codigo ===
            "DIVERGENCIA_CNPJ";

    return {
        aplicavel: true,
        documentoIncompativel,
        bloqueiaSubstituicao,
        codigo,
        nivel,
        rotulo,
        mensagem,
        requerConferenciaHumana:
            true,
        requerConsultaOficial,
        documentoEsperado:
            documentoEsperado?.titulo ||
            "",
        documentoIdentificado:
            classificacao?.titulo ||
            "",
        empresaEsperada:
            empresaEsperada?.nome ||
            "",

        cnpjEsperado:
            formatarCnpj(
                cnpjEsperado
            ),
        razaoSocialDocumento,
        cnpjDocumento:
            cnpjDocumento.length === 8
                ? formatarCnpjBase(
                    cnpjDocumento
                )
                : formatarCnpj(
                    cnpjDocumento
                ),
        cnpjDocumentoTipo:
            cnpjDocumento.length === 8
                ? "CNPJ_BASE"
                : cnpjDocumento.length === 14
                    ? "CNPJ_COMPLETO"
                    : "",

        natureza,
        fonteOficial,
        codigoControle:
            dadosTemporais
                .codigoControle,

        dadosTemporais: {
            dataEmissao:
                dadosTemporais
                    .dataEmissaoBr,
            dataEmissaoIso:
                dadosTemporais
                    .dataEmissaoIso,
            horaEmissao:
                dadosTemporais
                    .horaEmissao,
            dataValidade:
                dadosTemporais
                    .dataValidadeBr,
            dataValidadeIso:
                dadosTemporais
                    .dataValidadeIso,
            prazoValidadeDias:
                dadosTemporais
                    .prazoValidadeDias,
            prazoValidadeMeses:
                dadosTemporais
                    .prazoValidadeMeses,
            prazoValidadeAmbiguo:
                dadosTemporais
                    .prazoValidadeAmbiguo,
            unidadePrazoValidade:
                dadosTemporais
                    .unidadePrazoValidade,
            validadeCalculadaPorPrazo:
                dadosTemporais
                    .validadeCalculadaPorPrazo,
            origemValidade:
                dadosTemporais
                    .origemValidade,
            situacaoEmissao,
            situacaoValidade,
        },

        regras,
    };
}

export function avaliarCertidaoTributariaLocal({
    textoExtraido,
    classificacao,
    documentoEsperado,
    empresaEsperada,
    tipoDocumento =
        documentoEsperado?.id ||
        "",
    dataReferencia =
        new Date(),
}) {
    const tipoEsperado =
        textoSeguro(
            tipoDocumento
        ).toLowerCase();

    if (
        ![
            "cnd-estadual",
            "cnd-municipal",
        ].includes(
            tipoEsperado
        )
    ) {
        throw new Error(
            "Avaliador aceita apenas CND Estadual ou CND Municipal."
        );
    }


    const cnpjDocumentoCompleto =
        extrairCnpjsDocumento(
            textoExtraido
        )[0] || "";

    const cnpjBaseDocumento =
        extrairCnpjBaseDocumento(
            textoExtraido
        );

    const cnpjDocumento =
        cnpjDocumentoCompleto ||
        cnpjBaseDocumento;

    const cnpjEsperado =
        somenteDigitos(
            empresaEsperada?.cnpj
        );

    const cnpjDocumentoEhBase =
        !cnpjDocumentoCompleto &&
        cnpjBaseDocumento.length ===
            8;

    const cnpjConfere =
        cnpjDocumentoEhBase
            ? (
                cnpjEsperado.length ===
                    14 &&
                cnpjDocumento ===
                    cnpjEsperado.slice(
                        0,
                        8
                    )
            )
            : cnpjsSaoIguais(
                cnpjDocumento,
                cnpjEsperado
            );

    const possuiCnpjDocumento =
        cnpjDocumento.length === 14 ||
        cnpjDocumentoEhBase;

    const razaoSocialDocumento =
        extrairRazaoSocialDocumento(
            textoExtraido
        );

    const natureza =
        identificarNatureza(
            textoExtraido
        );

    const fonteOficial =
        identificarFonteOficial(
            textoExtraido,
            tipoEsperado
        );

    const fonteOficialCompativel =
        fonteOficial.identificada &&
        !(
            tipoEsperado ===
                "cnd-estadual" &&
            fonteOficial.codigo ===
                "PGE"
        );

    const dadosTemporais =
        extrairDadosTemporais(
            textoExtraido
        );

    const situacaoEmissao =
        avaliarDataEmissaoDocumental(
            dadosTemporais
                .dataEmissaoIso,
            dataReferencia
        );

    const situacaoValidade =
        avaliarValidadeDocumental(
            dadosTemporais
                .dataValidadeIso,
            dataReferencia
        );

    const possuiEmissao =
        Boolean(
            dadosTemporais
                .dataEmissaoIso
        );

    const possuiValidade =
        Boolean(
            dadosTemporais
                .dataValidadeIso
        );

    const tipoCorreto =
        classificacao?.id ===
        tipoEsperado;

    const regras = [
        criarRegra(
            "TIPO_DOCUMENTAL",
            "Tipo documental",
            tipoCorreto
                ? "APROVADA"
                : "REPROVADA",
            tipoCorreto
                ? "O conteúdo corresponde à certidão selecionada."
                : "O conteúdo não corresponde à certidão selecionada."
        ),


        criarRegra(
            "CNPJ_DOCUMENTO",
            "Conferência de CNPJ",
            !possuiCnpjDocumento
                ? "INCONCLUSIVA"
                : cnpjConfere
                    ? "APROVADA"
                    : "REPROVADA",
            !possuiCnpjDocumento
                ? "Nenhum CNPJ confiável foi localizado."
                : cnpjDocumentoEhBase &&
                    cnpjConfere
                    ? (
                        "O CNPJ Base " +
                        formatarCnpjBase(
                            cnpjDocumento
                        ) +
                        " corresponde à raiz do CNPJ cadastrado " +
                        formatarCnpj(
                            cnpjEsperado
                        ) +
                        "."
                    )
                    : cnpjDocumentoEhBase
                        ? (
                            "O CNPJ Base " +
                            formatarCnpjBase(
                                cnpjDocumento
                            ) +
                            " não corresponde à raiz do CNPJ cadastrado " +
                            formatarCnpj(
                                cnpjEsperado
                            ) +
                            "."
                        )
                        : cnpjConfere
                            ? "O CNPJ corresponde à empresa selecionada."
                            : "O CNPJ pertence a outra empresa."
        ),

        criarRegra(
            "NATUREZA_CERTIDAO",
            "Natureza da certidão",
            natureza.documentalmenteCompativel
                ? "APROVADA"
                : natureza.codigo ===
                    "NAO_IDENTIFICADA"
                    ? "INCONCLUSIVA"
                    : "REPROVADA",
            natureza.documentalmenteCompativel
                ? `Natureza identificada: ${natureza.rotulo}.`
                : natureza.codigo ===
                    "NAO_IDENTIFICADA"
                    ? "A natureza não foi identificada."
                    : "Certidão positiva sem efeito de negativa."
        ),

        criarRegra(
            "ORGAO_EMISSOR",
            "Órgão emissor",
            !fonteOficial.identificada
                ? "INCONCLUSIVA"
                : fonteOficialCompativel
                    ? "APROVADA"
                    : "REPROVADA",
            !fonteOficial.identificada
                ? "O órgão emissor não foi identificado."
                : fonteOficialCompativel
                    ? `Origem identificada: ${fonteOficial.rotulo}.`
                    : "Foi identificada certidão da PGE / Dívida Ativa. Para este item é exigida a certidão estadual emitida pela Secretaria da Fazenda referente aos débitos tributários não inscritos na Dívida Ativa."
        ),

        criarRegra(
            "DATA_EMISSAO",
            "Data de emissão",
            situacaoEmissao.codigo ===
                "FUTURA"
                ? "REPROVADA"
                : possuiEmissao
                    ? "APROVADA"
                    : "INCONCLUSIVA",
            situacaoEmissao.codigo ===
                "FUTURA"
                ? "A emissão é posterior à data de referência."
                : possuiEmissao
                    ? `Emissão identificada em ${dadosTemporais.dataEmissaoBr}.`
                    : "A emissão não foi identificada."
        ),


        criarRegra(
            "VALIDADE_DOCUMENTO",
            "Validade documental",
            situacaoValidade.vencida
                ? "REPROVADA"
                : possuiValidade
                    ? "APROVADA"
                    : "INCONCLUSIVA",
            situacaoValidade.vencida
                ? dadosTemporais
                    .validadeCalculadaPorPrazo
                    ? (
                        "Documento vencido em " +
                        dadosTemporais.dataValidadeBr +
                        "; validade calculada a partir do prazo de " +
                        descreverPrazoValidadeDeclarado(
                            dadosTemporais
                        ) +
                        "."
                    )
                    : (
                        "Documento vencido em " +
                        dadosTemporais.dataValidadeBr +
                        "."
                    )
                : possuiValidade
                    ? dadosTemporais
                        .validadeCalculadaPorPrazo
                        ? (
                            "Validade inferida/calculada até " +
                            dadosTemporais.dataValidadeBr +
                            " a partir do prazo de " +
                            descreverPrazoValidadeDeclarado(
                                dadosTemporais
                            ) +
                            "."
                        )
                        : (
                            "Validade identificada até " +
                            dadosTemporais.dataValidadeBr +
                            "."
                        )
                    : "A validade final não foi identificada."
        ),

        criarRegra(
            "CONSULTA_OFICIAL",
            "Consulta à fonte oficial",
            "INCONCLUSIVA",
            "A autenticidade e a situação fiscal devem ser confirmadas na fonte oficial."
        ),
    ];

    const base = {
        documentoEsperado,
        classificacao,
        empresaEsperada,
        cnpjEsperado,
        razaoSocialDocumento,
        cnpjDocumento,
        natureza,
        fonteOficial,
        dadosTemporais,
        situacaoEmissao,
        situacaoValidade,
        regras,
    };

    if (!tipoCorreto) {
        return montarResultado({
            ...base,
            codigo:
                "TIPO_DOCUMENTAL_DIVERGENTE",
            nivel:
                "REPROVADA",
            rotulo:
                "Documento divergente",
            mensagem:
                "O PDF não corresponde à certidão selecionada.",
            requerConsultaOficial:
                false,
        });
    }

    if (
        possuiCnpjDocumento &&
        cnpjEsperado &&
        !cnpjConfere
    ) {
        return montarResultado({
            ...base,
            codigo:
                "DIVERGENCIA_CNPJ",
            nivel:
                "REPROVADA",
            rotulo:
                "Divergência de CNPJ",
            mensagem:
                "O documento pertence a outra empresa.",
            requerConsultaOficial:
                false,
        });
    }

    if (
        tipoEsperado ===
            "cnd-estadual" &&
        fonteOficial.codigo ===
            "PGE"
    ) {
        return montarResultado({
            ...base,
            codigo:
                "FONTE_ESTADUAL_INCOMPATIVEL",
            nivel:
                "REPROVADA",
            rotulo:
                "Certidão estadual incompatível",
            mensagem:
                "Foi identificada uma certidão da PGE / Dívida Ativa. Para o item CND Estadual é exigida a certidão emitida pela Secretaria da Fazenda referente aos débitos tributários não inscritos na Dívida Ativa.",
            requerConsultaOficial:
                false,
        });
    }

    if (
        situacaoEmissao.codigo ===
        "FUTURA"
    ) {
        return montarResultado({
            ...base,
            codigo:
                "DATA_EMISSAO_FUTURA",
            nivel:
                "REPROVADA",
            rotulo:
                "Data de emissão inconsistente",
            mensagem:
                "A emissão é posterior à competência avaliada.",
            requerConsultaOficial:
                false,
        });
    }

    if (
        situacaoValidade.vencida
    ) {
        return montarResultado({
            ...base,
            codigo:
                "DOCUMENTO_VENCIDO",
            nivel:
                "REPROVADA",
            rotulo:
                "Documento vencido",
            mensagem:
                `A validade terminou em ${dadosTemporais.dataValidadeBr}.`,
            requerConsultaOficial:
                false,
        });
    }

    if (
        natureza.codigo ===
        "POSITIVA"
    ) {
        return montarResultado({
            ...base,
            codigo:
                "CERTIDAO_POSITIVA",
            nivel:
                "REPROVADA",
            rotulo:
                "Certidão positiva",
            mensagem:
                "Não foi identificado efeito de negativa.",
            requerConsultaOficial:
                true,
        });
    }

    if (
        !possuiCnpjDocumento ||
        natureza.codigo ===
            "NAO_IDENTIFICADA" ||
        !fonteOficial.identificada ||
        !possuiEmissao ||
        !possuiValidade
    ) {
        return montarResultado({
            ...base,
            codigo:
                "AVALIACAO_INCONCLUSIVA",
            nivel:
                "INCONCLUSIVA",
            rotulo:
                "Avaliação inconclusiva",
            mensagem:
                "Nem todos os dados obrigatórios foram identificados com segurança.",
            requerConsultaOficial:
                true,
        });
    }

    return montarResultado({
        ...base,
        codigo:
            "COMPATIVEL_CONSULTA_OFICIAL",
        nivel:
            "ALERTA",
        rotulo:
            "Compatível — conferir fonte oficial",
        mensagem:
            "Tipo, CNPJ, natureza, órgão emissor, emissão e validade são compatíveis. A confirmação oficial permanece obrigatória.",
        requerConsultaOficial:
            true,
    });
}