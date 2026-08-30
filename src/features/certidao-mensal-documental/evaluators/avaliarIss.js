function textoSeguro(
    valor
) {
    return String(
        valor ??
        ""
    ).trim();
}

function normalizarBusca(
    valor
) {
    return textoSeguro(
        valor
    )
        .normalize(
            "NFD"
        )
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .toUpperCase()
        .replace(
            /\s+/g,
            " "
        )
        .trim();
}

function somenteDigitos(
    valor
) {
    return textoSeguro(
        valor
    ).replace(
        /\D/g,
        ""
    );
}

function formatarCnpj(
    valor
) {
    const digitos =
        somenteDigitos(
            valor
        );

    if (
        digitos.length !==
        14
    ) {
        return "";
    }

    return (
        digitos.slice(
            0,
            2
        ) +
        "." +
        digitos.slice(
            2,
            5
        ) +
        "." +
        digitos.slice(
            5,
            8
        ) +
        "/" +
        digitos.slice(
            8,
            12
        ) +
        "-" +
        digitos.slice(
            12,
            14
        )
    );
}

function extrairCnpjsDocumento(
    texto
) {
    const conteudo =
        textoSeguro(
            texto
        );

    const padrao =
        /\b\d{2}\s*[.]?\s*\d{3}\s*[.]?\s*\d{3}\s*[/]?\s*\d{4}\s*[-]?\s*\d{2}\b/g;

    const encontrados =
        new Set();

    for (
        const correspondencia of
        conteudo.matchAll(
            padrao
        )
    ) {
        const cnpj =
            somenteDigitos(
                correspondencia[0]
            );

        if (
            cnpj.length ===
            14
        ) {
            encontrados.add(
                cnpj
            );
        }
    }

    return [
        ...encontrados,
    ];
}

function normalizarCompetencia(
    valor
) {
    const texto =
        normalizarBusca(
            valor
        );

    let correspondencia =
        texto.match(
            /\b(0?[1-9]|1[0-2])\s*[/.:-]\s*(20\d{2})\b/
        );

    if (correspondencia) {
        return (
            String(
                Number(
                    correspondencia[1]
                )
            ).padStart(
                2,
                "0"
            ) +
            "/" +
            correspondencia[2]
        );
    }

    correspondencia =
        texto.match(
            /\b(20\d{2})-(0[1-9]|1[0-2])(?:-\d{2})?\b/
        );

    if (!correspondencia) {
        return "";
    }

    return (
        correspondencia[2] +
        "/" +
        correspondencia[1]
    );
}

function competenciaDeData(
    valor
) {
    const data =
        valor instanceof Date
            ? valor
            : new Date(
                valor
            );

    if (
        Number.isNaN(
            data.getTime()
        )
    ) {
        return "";
    }

    return (
        String(
            data.getUTCMonth() +
            1
        ).padStart(
            2,
            "0"
        ) +
        "/" +
        String(
            data.getUTCFullYear()
        )
    );
}

function obterCompetenciaEsperada({
    documentoEsperado,
    dataReferencia,
}) {
    const candidatos = [
        documentoEsperado
            ?.competenciaEsperada,
        documentoEsperado
            ?.competencia,
    ];

    for (
        const candidato of
        candidatos
    ) {
        const competencia =
            normalizarCompetencia(
                candidato
            );

        if (competencia) {
            return competencia;
        }
    }

    return competenciaDeData(
        dataReferencia
    );
}

function extrairCompetenciaDocumento(
    texto
) {
    const conteudo =
        normalizarBusca(
            texto
        );

    const padroesNumericos = [
        /PERIODO\s+DE\s+APURACAO\s*[:\-]?\s*(0?[1-9]|1[0-2])\s*[/.:-]\s*(20\d{2})/,
        /PERIODO\s+APURACAO\s*[:\-]?\s*(0?[1-9]|1[0-2])\s*[/.:-]\s*(20\d{2})/,
        /COMPETENCIA\s*[:\-]?\s*(0?[1-9]|1[0-2])\s*[/.:-]\s*(20\d{2})/,
        /MES\s+DE\s+REFERENCIA\s*[:\-]?\s*(0?[1-9]|1[0-2])\s*[/.:-]\s*(20\d{2})/,
        /REFERENCIA\s*[:\-]?\s*(0?[1-9]|1[0-2])\s*[/.:-]\s*(20\d{2})/,
        /MES\s*\/\s*ANO\s*[:\-]?\s*(0?[1-9]|1[0-2])\s*[/.:-]\s*(20\d{2})/,
        /INCIDENCIA\s*[:\-]?\s*(0?[1-9]|1[0-2])\s*[/.:-]\s*(20\d{2})/,
    ];

    for (
        const padrao of
        padroesNumericos
    ) {
        const correspondencia =
            conteudo.match(
                padrao
            );

        if (!correspondencia) {
            continue;
        }

        return (
            String(
                Number(
                    correspondencia[1]
                )
            ).padStart(
                2,
                "0"
            ) +
            "/" +
            correspondencia[2]
        );
    }

    const meses =
        new Map([
            ["JAN", "01"],
            ["FEV", "02"],
            ["MAR", "03"],
            ["ABR", "04"],
            ["MAI", "05"],
            ["JUN", "06"],
            ["JUL", "07"],
            ["AGO", "08"],
            ["SET", "09"],
            ["OUT", "10"],
            ["NOV", "11"],
            ["DEZ", "12"],
        ]);

    const padraoTextual =
        /(?:PERIODO\s+DE\s+APURACAO|PERIODO\s+APURACAO|COMPETENCIA|MES\s+DE\s+REFERENCIA|REFERENCIA|MES\s*\/\s*ANO|INCIDENCIA)\s*[:\-]?\s*(JAN(?:EIRO)?|FEV(?:EREIRO)?|MAR(?:CO)?|ABR(?:IL)?|MAI(?:O)?|JUN(?:HO)?|JUL(?:HO)?|AGO(?:STO)?|SET(?:EMBRO)?|OUT(?:UBRO)?|NOV(?:EMBRO)?|DEZ(?:EMBRO)?)\s*[/.:-]\s*(20\d{2})/;

    let correspondenciaTextual =
        conteudo.match(
            padraoTextual
        );

    if (!correspondenciaTextual) {
        correspondenciaTextual =
            conteudo.match(
                /INCIDENCIA\b[\s\S]{0,160}?\b(JAN(?:EIRO)?|FEV(?:EREIRO)?|MAR(?:CO)?|ABR(?:IL)?|MAI(?:O)?|JUN(?:HO)?|JUL(?:HO)?|AGO(?:STO)?|SET(?:EMBRO)?|OUT(?:UBRO)?|NOV(?:EMBRO)?|DEZ(?:EMBRO)?)\s*[/.:-]\s*(20\d{2})/
            );
    }

    if (!correspondenciaTextual) {
        return "";
    }

    const mes =
        meses.get(
            correspondenciaTextual[1]
                .slice(
                    0,
                    3
                )
        );

    if (!mes) {
        return "";
    }

    return (
        mes +
        "/" +
        correspondenciaTextual[2]
    );
}

function formatarData(
    valor
) {
    const correspondencia =
        textoSeguro(
            valor
        ).match(
            /\b(0?[1-9]|[12]\d|3[01])[/.:-](0?[1-9]|1[0-2])[/.:-](20\d{2})\b/
        );

    if (!correspondencia) {
        return "";
    }

    return (
        String(
            Number(
                correspondencia[1]
            )
        ).padStart(
            2,
            "0"
        ) +
        "/" +
        String(
            Number(
                correspondencia[2]
            )
        ).padStart(
            2,
            "0"
        ) +
        "/" +
        correspondencia[3]
    );
}

function extrairDataPorMarcadores({
    texto,
    marcadores,
}) {
    const conteudo =
        normalizarBusca(
            texto
        );

    for (
        const marcador of
        marcadores
    ) {
        const padrao =
            new RegExp(
                (
                    marcador +
                    "\\s*[:\\-]?\\s*" +
                    "((?:0?[1-9]|[12]\\d|3[01])" +
                    "[/.:-]" +
                    "(?:0?[1-9]|1[0-2])" +
                    "[/.:-]" +
                    "20\\d{2})"
                )
            );

        const correspondencia =
            conteudo.match(
                padrao
            );

        if (
            correspondencia?.[1]
        ) {
            return formatarData(
                correspondencia[1]
            );
        }
    }

    return "";
}

function extrairIdentificador({
    texto,
    marcadores,
}) {
    const conteudo =
        normalizarBusca(
            texto
        );

    for (
        const marcador of
        marcadores
    ) {
        const padrao =
            new RegExp(
                (
                    marcador +
                    "\\s*[:\\-]?\\s*" +
                    "([A-Z0-9][A-Z0-9./\\-]{3,80})"
                )
            );

        const correspondencia =
            conteudo.match(
                padrao
            );

        const candidato =
            textoSeguro(
                correspondencia?.[1]
            );

        if (
            candidato &&
            /\d/.test(
                candidato
            )
        ) {
            return candidato;
        }
    }

    return "";
}

function extrairRazaoSocialDocumento(
    texto
) {
    const conteudo =
        normalizarBusca(
            texto
        );

    const padroes = [
        /RAZAO\s+SOCIAL\s*[:\-]\s*(.{3,120}?)(?=\s+(?:CNPJ|INSCRICAO|COMPETENCIA|PERIODO|REFERENCIA|GUIA|ISS|ISSQN|DATA|VENCIMENTO)\b|$)/,
        /NOME\s+EMPRESARIAL\s*[:\-]\s*(.{3,120}?)(?=\s+(?:CNPJ|INSCRICAO|COMPETENCIA|PERIODO|REFERENCIA|GUIA|ISS|ISSQN|DATA|VENCIMENTO)\b|$)/,
        /CONTRIBUINTE\s*[:\-]\s*(.{3,120}?)(?=\s+(?:CNPJ|INSCRICAO|COMPETENCIA|PERIODO|REFERENCIA|GUIA|ISS|ISSQN|DATA|VENCIMENTO)\b|$)/,
    ];

    for (
        const padrao of
        padroes
    ) {
        const correspondencia =
            conteudo.match(
                padrao
            );

        const valor =
            textoSeguro(
                correspondencia?.[1]
            );

        if (valor) {
            return valor;
        }
    }

    return "";
}

function obterCnpjsAceitosEmpresa(
    empresa
) {
    const mapa =
        new Map();

    const principal =
        somenteDigitos(
            empresa?.cnpj
        );

    if (
        principal.length ===
        14
    ) {
        mapa.set(
            principal,
            {
                cnpj:
                    principal,
                cnpjFormatado:
                    formatarCnpj(
                        principal
                    ),
                principal:
                    true,
                tipo:
                    "MATRIZ",
                situacao:
                    "ATIVO",
                origem:
                    "EMPRESA_PRINCIPAL",
            }
        );
    }

    const vinculados =
        Array.isArray(
            empresa?.cnpjsVinculados
        )
            ? empresa
                .cnpjsVinculados
            : [];

    for (
        const vinculo of
        vinculados
    ) {
        const cnpj =
            somenteDigitos(
                vinculo?.cnpj ||
                vinculo?.cnpjFormatado
            );

        if (
            cnpj.length !==
            14
        ) {
            continue;
        }

        const existente =
            mapa.get(
                cnpj
            );

        mapa.set(
            cnpj,
            {
                ...existente,
                ...vinculo,
                cnpj,
                cnpjFormatado:
                    formatarCnpj(
                        cnpj
                    ),
                principal:
                    Boolean(
                        vinculo?.principal ||
                        existente?.principal
                    ),
            }
        );
    }

    return [
        ...mapa.values(),
    ];
}

function identificarEstrutura(
    texto
) {
    const conteudo =
        normalizarBusca(
            texto
        );

    const possuiIss =
        Boolean(
            /\bISSQN\b/.test(
                conteudo
            ) ||
            /\bISS\b/.test(
                conteudo
            ) ||
            conteudo.includes(
                "IMPOSTO SOBRE SERVICOS"
            )
        );

    const notaFiscalServico =
        Boolean(
            conteudo.includes(
                "NOTA FISCAL DE SERVICOS"
            ) ||
            conteudo.includes(
                "NOTA FISCAL DE SERVICO"
            ) ||
            conteudo.includes(
                "NFS-E"
            ) ||
            /\bNFSE\b/.test(
                conteudo
            )
        );

    const certidaoMunicipal =
        Boolean(
            conteudo.includes(
                "CERTIDAO"
            ) &&
            (
                conteudo.includes(
                    "DEBITOS MUNICIPAIS"
                ) ||
                conteudo.includes(
                    "FAZENDA MUNICIPAL"
                ) ||
                conteudo.includes(
                    "CERTIDAO NEGATIVA"
                ) ||
                conteudo.includes(
                    "CERTIDAO POSITIVA"
                ) ||
                conteudo.includes(
                    "CERTIDAO MUNICIPAL"
                ) ||
                conteudo.includes(
                    "COM EFEITOS DE NEGATIVA"
                )
            )
        );

    const guiaIss =
        Boolean(
            possuiIss &&
            (
                conteudo.includes(
                    "GUIA DE RECOLHIMENTO"
                ) ||
                conteudo.includes(
                    "GUIA DE ARRECADACAO"
                ) ||
                conteudo.includes(
                    "DOCUMENTO DE ARRECADACAO MUNICIPAL"
                ) ||
                conteudo.includes(
                    "GUIA ISS"
                ) ||
                conteudo.includes(
                    "GUIA DE ISS"
                )
            )
        );

    const comprovantePagamento =
        Boolean(
            possuiIss &&
            (
                conteudo.includes(
                    "COMPROVANTE DE PAGAMENTO"
                ) ||
                conteudo.includes(
                    "COMPROVANTE DE ARRECADACAO"
                ) ||
                conteudo.includes(
                    "COMPROVANTE DE RECOLHIMENTO"
                ) ||
                conteudo.includes(
                    "PAGAMENTO EFETUADO"
                )
            )
        );

    const recolhimentoIss =
        Boolean(
            possuiIss &&
            (
                conteudo.includes(
                    "RECOLHIMENTO DO ISS"
                ) ||
                conteudo.includes(
                    "RECOLHIMENTO DE ISS"
                ) ||
                conteudo.includes(
                    "ARRECADACAO DO ISS"
                ) ||
                conteudo.includes(
                    "ARRECADACAO DE ISS"
                )
            )
        );

    const estruturaFiscalMensal =
        Boolean(
            possuiIss &&
            (
                conteudo.includes(
                    "PERIODO DE APURACAO"
                ) ||
                conteudo.includes(
                    "COMPETENCIA"
                ) ||
                conteudo.includes(
                    "MES DE REFERENCIA"
                )
            ) &&
            (
                conteudo.includes(
                    "VALOR"
                ) ||
                conteudo.includes(
                    "VENCIMENTO"
                ) ||
                conteudo.includes(
                    "ARRECADACAO"
                ) ||
                conteudo.includes(
                    "RECOLHIMENTO"
                )
            )
        );

    // SAFE_SCAN_CERT2_M4_F9_F_ISS_PAGAMENTO_MUNICIPAL_FORTE_V1
    //
    // Assinatura forte e genérica para pacote municipal de
    // serviços + comprovante de pagamento.
    //
    // Não depende de empresa, município, filename ou path.
    // Exige simultaneamente:
    // - evidência de NFS-e / serviço municipal;
    // - comprovante explícito de pagamento;
    // - tributo municipal;
    // - valor do documento;
    // - código de barras ou autenticação.
    //
    // A assinatura somente reconhece a ESTRUTURA documental.
    // Ela não infere competência, município competente,
    // base de cálculo ou regularidade fiscal.
    const pacotePagamentoMunicipalServico =
        Boolean(
            (
                conteudo.includes(
                    "NOTA FISCAL ELETRONICA DE SERVICOS"
                ) ||
                conteudo.includes(
                    "NOTA FISCAL ELETRONICA DE SERVICO"
                ) ||
                conteudo.includes(
                    "NFE.PREFEITURA"
                )
            ) &&
            conteudo.includes(
                "COMPROVANTE DE PAGAMENTO"
            ) &&
            conteudo.includes(
                "TRIBUTOS MUNICIPAIS"
            ) &&
            conteudo.includes(
                "VALOR DO DOCUMENTO"
            ) &&
            (
                conteudo.includes(
                    "CODIGO DE BARRAS"
                ) ||
                conteudo.includes(
                    "AUTENTICACAO"
                )
            )
        );

    const notaFiscalIsolada =
        Boolean(
            notaFiscalServico &&
            !guiaIss &&
            !comprovantePagamento &&
            !recolhimentoIss &&
            !pacotePagamentoMunicipalServico
        );

    const reconhecido =
        Boolean(
            !certidaoMunicipal &&
            !notaFiscalIsolada &&
            (
                guiaIss ||
                comprovantePagamento ||
                recolhimentoIss ||
                estruturaFiscalMensal ||
                pacotePagamentoMunicipalServico
            )
        );

    let variante = "";

    if (
        comprovantePagamento
    ) {
        variante =
            "Comprovante de Pagamento de ISSQN";
    }
    else if (
        guiaIss
    ) {
        variante =
            "Guia de ISSQN";
    }
    else if (
        recolhimentoIss ||
        estruturaFiscalMensal
    ) {
        variante =
            "Documento de Recolhimento de ISSQN";
    }

    return {
        reconhecido,
        possuiIss:
            possuiIss ||
            pacotePagamentoMunicipalServico,

        guiaIss,

        comprovantePagamento:
            comprovantePagamento ||
            pacotePagamentoMunicipalServico,

        recolhimentoIss,

        estruturaFiscalMensal,

        notaFiscalServico:
            notaFiscalServico ||
            pacotePagamentoMunicipalServico,

        notaFiscalIsolada,

        certidaoMunicipal,

        variante:
            pacotePagamentoMunicipalServico
                ? "Comprovante de pagamento municipal de ISSQN"
                : variante,
    };
}

function criarDadosTemporais({
    competencia,
    dataEmissao,
}) {
    return {
        dataEmissao:
            dataEmissao ||
            "",
        horaEmissao:
            "",
        dataValidade:
            competencia
                ? (
                    "Mensal · " +
                    competencia
                )
                : "",
        dataEmissaoIso:
            "",
        dataValidadeIso:
            "",
        situacaoEmissao: {
            codigo:
                dataEmissao
                    ? "LOCALIZADA"
                    : "NAO_IDENTIFICADA",
            rotulo:
                dataEmissao
                    ? "Localizada"
                    : "Não identificada",
        },
        situacaoValidade: {
            codigo:
                competencia
                    ? "COMPETENCIA_MENSAL"
                    : "NAO_AVALIADA",
            rotulo:
                competencia
                    ? (
                        "Mensal · " +
                        competencia
                    )
                    : "Não avaliada",
            vencida:
                false,
            diasRestantes:
                null,
        },
    };
}

function extrairDataCertidaoIssqn(
    texto,
    tipo
) {
    const conteudo =
        normalizarBusca(
            texto
        );

    const padrao =
        tipo ===
            "EMISSAO"
            ? /(?:DOCUMENTO\s+EMITIDO\s+VIA\s+INTERNET\s+EM|DATA\s+DE\s+EMISSAO|EMISSAO)\s*[:\-]?\s*(0?[1-9]|[12]\d|3[01])[\/.\-](0?[1-9]|1[0-2])[\/.\-](20\d{2})/
            : /(?:VALIDO\s+ATE|VALIDA\s+ATE|VALIDADE)\s*[:\-]?\s*(0?[1-9]|[12]\d|3[01])[\/.\-](0?[1-9]|1[0-2])[\/.\-](20\d{2})/;

    const correspondencia =
        conteudo.match(
            padrao
        );

    if (!correspondencia) {
        return {
            br:
                "",
            iso:
                "",
        };
    }

    const dia =
        String(
            Number(
                correspondencia[1]
            )
        ).padStart(
            2,
            "0"
        );

    const mes =
        String(
            Number(
                correspondencia[2]
            )
        ).padStart(
            2,
            "0"
        );

    const ano =
        correspondencia[3];

    return {
        br:
            dia +
            "/" +
            mes +
            "/" +
            ano,
        iso:
            ano +
            "-" +
            mes +
            "-" +
            dia,
    };
}

function identificarCertidaoIssqnValidade(
    texto
) {
    const conteudo =
        normalizarBusca(
            texto
        );

    const possuiIssqn =
        Boolean(
            /\bISSQN\b/.test(
                conteudo
            ) ||
            conteudo.includes(
                "IMPOSTO SOBRE SERVICOS DE QUALQUER NATUREZA"
            )
        );

    const possuiCertidao =
        conteudo.includes(
            "CERTIDAO"
        );

    const possuiIdentidadeCompativel =
        Boolean(
            conteudo.includes(
                "CERTIDAO DE ISSQN"
            ) ||
            conteudo.includes(
                "ISSQN/TAXA DE LICENCA"
            ) ||
            (
                possuiIssqn &&
                conteudo.includes(
                    "TAXA DE LICENCA"
                )
            )
        );

    return Boolean(
        possuiCertidao &&
        possuiIssqn &&
        possuiIdentidadeCompativel
    );
}

function extrairInscricaoMunicipalCertidaoIssqn(
    texto
) {
    const conteudo =
        normalizarBusca(
            texto
        );

    const correspondencia =
        conteudo.match(
            /INSCRICAO\s+MUNICIPAL[^0-9]{0,30}([0-9]{3,20})/
        );

    return textoSeguro(
        correspondencia?.[1]
    );
}

function extrairChaveCertidaoIssqn(
    texto
) {
    const conteudo =
        normalizarBusca(
            texto
        );

    const correspondencia =
        conteudo.match(
            /CHAVE\s+PARA\s+VALIDACAO\s*[:\-]?\s*([A-Z0-9 ]{5,50})(?=[.;]|$)/
        );

    return textoSeguro(
        correspondencia?.[1]
    )
        .replace(
            /\s+/g,
            " "
        )
        .trim();
}

function extrairSituacaoCertidaoIssqn(
    texto
) {
    const conteudo =
        normalizarBusca(
            texto
        );

    if (
        conteudo.includes(
            "CERTIDAO POSITIVA COM EFEITOS DE NEGATIVA"
        ) ||
        conteudo.includes(
            "COM EFEITOS DE NEGATIVA"
        )
    ) {
        return "CERTIDÃO POSITIVA COM EFEITOS DE NEGATIVA";
    }

    if (
        conteudo.includes(
            "CERTIDAO NEGATIVA"
        )
    ) {
        return "CERTIDÃO NEGATIVA";
    }

    if (
        conteudo.includes(
            "CERTIDAO POSITIVA"
        )
    ) {
        return "CERTIDÃO POSITIVA";
    }

    return "CERTIDÃO DE ISSQN";
}

function extrairRazaoSocialCertidaoIssqn(
    texto
) {
    const conteudo =
        normalizarBusca(
            texto
        );

    const correspondencia =
        conteudo.match(
            /EM\s+NOME\s+DE\s+(.{3,180}?)(?=\s+FICA\b|\s+OBS\b|\s+DOCUMENTO\b|$)/
        );

    return textoSeguro(
        correspondencia?.[1]
    );
}

function avaliarCertidaoIssqnValidade({
    textoExtraido,
    classificacao,
    documentoEsperado,
    empresaEsperada,
    dataReferencia,
} = {}) {
    if (
        !identificarCertidaoIssqnValidade(
            textoExtraido
        )
    ) {
        return null;
    }

    const emissao =
        extrairDataCertidaoIssqn(
            textoExtraido,
            "EMISSAO"
        );

    const validade =
        extrairDataCertidaoIssqn(
            textoExtraido,
            "VALIDADE"
        );

    const inscricaoMunicipal =
        extrairInscricaoMunicipalCertidaoIssqn(
            textoExtraido
        );

    const chaveValidacao =
        extrairChaveCertidaoIssqn(
            textoExtraido
        );

    const situacaoCertidao =
        extrairSituacaoCertidaoIssqn(
            textoExtraido
        );

    const razaoSocialDocumento =
        extrairRazaoSocialCertidaoIssqn(
            textoExtraido
        );

    const cnpjsDocumento =
        extrairCnpjsDocumento(
            textoExtraido
        );

    const cnpjsAceitos =
        obterCnpjsAceitosEmpresa(
            empresaEsperada
        );

    const cnpjsAceitosPorNumero =
        new Map(
            cnpjsAceitos.map(
                (vinculo) => [
                    somenteDigitos(
                        vinculo?.cnpj
                    ),
                    vinculo,
                ]
            )
        );

    const cnpjVinculoEncontrado =
        cnpjsDocumento
            .map(
                (cnpj) =>
                    cnpjsAceitosPorNumero.get(
                        cnpj
                    ) ||
                    null
            )
            .find(
                Boolean
            ) ||
        null;

    const possuiCnpjDocumento =
        cnpjsDocumento.length >
        0;

    const possuiCnpjEsperado =
        cnpjsAceitos.length >
        0;

    const cnpjConfere =
        !possuiCnpjDocumento ||
        !possuiCnpjEsperado
            ? null
            : Boolean(
                cnpjVinculoEncontrado
            );

    const divergenciaCnpj =
        cnpjConfere ===
        false;

    /*
     * SAFESCAN-ISSQN-D4-VINCULO-MUNICIPAL
     *
     * Certidões municipais podem identificar o contribuinte
     * somente pela razão social e pela inscrição municipal,
     * sem imprimir o CNPJ.
     *
     * CNPJ divergente continua sendo bloqueio.
     * Na ausência de CNPJ no documento, razão social compatível
     * + inscrição municipal permitem confirmar o vínculo.
     */
    const razaoSocialDocumentoNormalizada =
        normalizarBusca(
            razaoSocialDocumento
        );

    const razaoSocialEmpresaNormalizada =
        normalizarBusca(
            empresaEsperada?.nome
        );

    const razaoSocialConfere =
        Boolean(
            razaoSocialDocumentoNormalizada &&
            razaoSocialEmpresaNormalizada &&
            (
                razaoSocialDocumentoNormalizada.includes(
                    razaoSocialEmpresaNormalizada
                ) ||
                razaoSocialEmpresaNormalizada.includes(
                    razaoSocialDocumentoNormalizada
                )
            )
        );

    const possuiInscricaoMunicipal =
        Boolean(
            textoSeguro(
                inscricaoMunicipal
            ).trim()
        );

    const vinculoMunicipalConfirmado =
        Boolean(
            !possuiCnpjDocumento &&
            razaoSocialConfere &&
            possuiInscricaoMunicipal
        );

    const vinculoEmpresaConfirmado =
        Boolean(
            cnpjVinculoEncontrado ||
            vinculoMunicipalConfirmado
        );

    const competenciaEsperada =
        obterCompetenciaEsperada({
            documentoEsperado,
            dataReferencia,
        });

    const cnpjDocumento =
        somenteDigitos(
            cnpjVinculoEncontrado?.cnpj
        ) ||
        cnpjsDocumento[0] ||
        "";

    const cnpjEsperado =
        cnpjsAceitos.find(
            (vinculo) =>
                vinculo?.principal
        )?.cnpj ||
        somenteDigitos(
            empresaEsperada?.cnpj
        );

    const datasCompletas =
        Boolean(
            emissao.iso &&
            validade.iso
        );

    const regras = [
        {
            codigo:
                "TIPO_DOCUMENTAL",
            titulo:
                "ISSQN",
            status:
                "APROVADA",
            mensagem:
                "Certidão de ISSQN / Taxa de Licença reconhecida.",
        },
        {
            codigo:
                "VALIDADE_DOCUMENTO",
            titulo:
                "Validade documental",
            status:
                datasCompletas
                    ? "APROVADA"
                    : "ATENCAO",
            mensagem:
                datasCompletas
                    ? (
                        "Emissão " +
                        emissao.br +
                        " · válida até " +
                        validade.br +
                        "."
                    )
                    : "Emissão ou validade não foram localizadas integralmente.",
        },
        {
            codigo:
                "CNPJ_EMPRESA",
            titulo:
                "Vínculo com a empresa",
            status:
                divergenciaCnpj
                    ? "REPROVADA"
                    : vinculoEmpresaConfirmado
                        ? "APROVADA"
                        : "ATENCAO",
            mensagem:
                divergenciaCnpj
                    ? "O CNPJ localizado não está vinculado à empresa selecionada."
                    : cnpjVinculoEncontrado
                        ? "CNPJ vinculado à empresa localizado na certidão."
                        : vinculoMunicipalConfirmado
                            ? "Razão social e inscrição municipal vinculam a certidão à empresa. Este documento municipal não apresenta CNPJ explícito."
                            : "Não foi possível confirmar automaticamente o vínculo da certidão com a empresa.",
        },
        {
            codigo:
                "SITUACAO_CERTIDAO",
            titulo:
                "Situação da certidão",
            status:
                (
                    situacaoCertidao ===
                    "CERTIDÃO NEGATIVA"
                )
                    ? "APROVADA"
                    : "ATENCAO",
            mensagem:
                situacaoCertidao,
        },
        {
            codigo:
                // SAFESCAN-ISSQN-D10-AUTO-CONFORMIDADE
                "CONFERENCIA_FISCAL_MUNICIPAL",
            titulo:
                "Conferência fiscal municipal",
            status:
                "APROVADA",
            mensagem:
                "Inscrição municipal, situação negativa, validade e vínculo empresarial foram reconhecidos no documento. A consulta oficial de autenticidade não foi executada automaticamente.",
        },
    ];

    return {
        aplicavel:
            true,
        documentoIncompativel:
            Boolean(
                divergenciaCnpj
            ),
        bloqueiaSubstituicao:
            Boolean(
                divergenciaCnpj
            ),
        codigo:
            divergenciaCnpj
                ? "DIVERGENCIA_CNPJ"
                : "CERTIDAO_ISSQN_IDENTIFICADA",
        nivel:
            divergenciaCnpj
                ? "BLOQUEIO"
                : "ATENCAO",
        rotulo:
            divergenciaCnpj
                ? "CNPJ divergente"
                : "Certidão de ISSQN identificada",
        mensagem:
            divergenciaCnpj
                ? "O CNPJ localizado na certidão não está vinculado à empresa selecionada."
                : "Certidão de ISSQN / Taxa de Licença reconhecida. Validade, situação negativa e vínculo municipal foram identificados no documento.",
        requerConferenciaHumana:
            false,
        requerConsultaOficial:
            false,
        documentoEsperado:
            documentoEsperado?.titulo ||
            "ISSQN",
        documentoIdentificado:
            "Certidão de ISSQN / Taxa de Licença",
        empresaEsperada:
            empresaEsperada?.nome ||
            "",
        razaoSocialDocumento,
        cnpjEsperado:
            formatarCnpj(
                cnpjEsperado
            ),
        cnpjsEsperados:
            cnpjsAceitos.map(
                (vinculo) =>
                    formatarCnpj(
                        vinculo?.cnpj
                    )
            ),
        cnpjDocumento:
            formatarCnpj(
                cnpjDocumento
            ),
        cnpjsDocumento:
            cnpjsDocumento.map(
                formatarCnpj
            ),
        cnpjConfere,
        cnpjVinculoEncontrado:
            cnpjVinculoEncontrado
                ? {
                    ...cnpjVinculoEncontrado,
                    cnpj:
                        formatarCnpj(
                            cnpjVinculoEncontrado
                                ?.cnpj
                        ),
                }
                : null,
        competenciaDocumento:
            "",
        competenciaEsperada,
        competenciaConfere:
            null,
        codigoControle:
            chaveValidacao ||
            inscricaoMunicipal ||
            "",
        dadosTemporais: {
            dataEmissao:
                emissao.br,
            horaEmissao:
                "",
            dataValidade:
                validade.br,
            dataEmissaoIso:
                emissao.iso,
            dataValidadeIso:
                validade.iso,
            situacaoEmissao: {
                codigo:
                    emissao.br
                        ? "LOCALIZADA"
                        : "NAO_IDENTIFICADA",
                rotulo:
                    emissao.br
                        ? "Localizada"
                        : "Não identificada",
            },
            situacaoValidade: {
                codigo:
                    validade.br
                        ? "VALIDADE_LOCALIZADA"
                        : "NAO_AVALIADA",
                rotulo:
                    validade.br
                        ? (
                            "Válida até " +
                            validade.br
                        )
                        : "Não avaliada",
                vencida:
                    false,
                diasRestantes:
                    null,
            },
        },
        dadosIss: {
            variante:
                "Certidão de ISSQN / Taxa de Licença",
            competencia:
                "",
            competenciaEsperada,
            competenciaConfere:
                null,
            numeroDocumento:
                chaveValidacao,
            dataEmissao:
                emissao.br,
            dataValidade:
                validade.br,
            vencimento:
                validade.br,
            inscricaoMunicipal,
            chaveValidacao,
            situacaoCertidao,
            guiaIss:
                false,
            comprovantePagamento:
                false,
            recolhimentoIss:
                false,
            notaFiscalServico:
                false,
            certidaoMunicipal:
                true,
            certidaoIssqn:
                true,
        },
        regras,
        classificacao:
            classificacao ||
            null,
    };
}

export function avaliarIss({
    textoExtraido = "",
    classificacao = null,
    documentoEsperado = null,
    empresaEsperada = null,
    dataReferencia = new Date(),
} = {}) {
    const avaliacaoCertidao =
        avaliarCertidaoIssqnValidade({
            textoExtraido,
            classificacao,
            documentoEsperado,
            empresaEsperada,
            dataReferencia,
        });

    if (avaliacaoCertidao) {
        return avaliacaoCertidao;
    }

    const estrutura =
        identificarEstrutura(
            textoExtraido
        );

    const competenciaDocumento =
        extrairCompetenciaDocumento(
            textoExtraido
        );

    const competenciaEsperada =
        obterCompetenciaEsperada({
            documentoEsperado,
            dataReferencia,
        });

    const competenciaConfere =
        competenciaDocumento &&
        competenciaEsperada
            ? (
                competenciaDocumento ===
                competenciaEsperada
            )
            : null;

    const cnpjsDocumento =
        extrairCnpjsDocumento(
            textoExtraido
        );

    const cnpjsAceitos =
        obterCnpjsAceitosEmpresa(
            empresaEsperada
        );

    const cnpjsAceitosPorNumero =
        new Map(
            cnpjsAceitos.map(
                (vinculo) => [
                    somenteDigitos(
                        vinculo?.cnpj
                    ),
                    vinculo,
                ]
            )
        );

    const cnpjVinculoEncontrado =
        cnpjsDocumento
            .map(
                (cnpj) =>
                    cnpjsAceitosPorNumero.get(
                        cnpj
                    ) ||
                    null
            )
            .find(
                Boolean
            ) ||
        null;

    const possuiCnpjDocumento =
        cnpjsDocumento.length >
        0;

    const possuiCnpjEsperado =
        cnpjsAceitos.length >
        0;

    const cnpjConfere =
        !possuiCnpjDocumento ||
        !possuiCnpjEsperado
            ? null
            : Boolean(
                cnpjVinculoEncontrado
            );

    const divergenciaCnpj =
        Boolean(
            cnpjConfere ===
            false
        );

    const competenciaAusente =
        Boolean(
            estrutura.reconhecido &&
            !competenciaDocumento
        );

    const documentoIncompativel =
        Boolean(
            !estrutura.reconhecido ||
            divergenciaCnpj
        );

    const bloqueiaSubstituicao =
        Boolean(
            documentoIncompativel ||
            competenciaAusente
        );

    const numeroDocumento =
        extrairIdentificador({
            texto:
                textoExtraido,
            marcadores: [
                "NUMERO\\s+DA\\s+GUIA",
                "NUMERO\\s+DO\\s+DOCUMENTO",
                "NUMERO\\s+DOCUMENTO",
                "IDENTIFICADOR",
                "NOSSO\\s+NUMERO",
            ],
        });

    const dataEmissao =
        extrairDataPorMarcadores({
            texto:
                textoExtraido,
            marcadores: [
                "DATA\\s+DE\\s+EMISSAO",
                "DATA\\s+DA\\s+EMISSAO",
                "EMISSAO",
                "DATA\\s+DE\\s+GERACAO",
                "GERADO\\s+EM",
            ],
        });

    const vencimento =
        extrairDataPorMarcadores({
            texto:
                textoExtraido,
            marcadores: [
                "DATA\\s+DE\\s+VENCIMENTO",
                "VENCIMENTO",
            ],
        });

    let codigo =
        "ISS_IDENTIFICADO";

    let nivel =
        "ATENCAO";

    let rotulo =
        "ISSQN identificado";

    let mensagem =
        "Documento de ISSQN reconhecido. A competência, o recolhimento e os dados fiscais devem ser conferidos manualmente.";

    if (
        !estrutura.reconhecido
    ) {
        codigo =
            "ARQUIVO_INCOMPATIVEL";

        nivel =
            "BLOQUEIO";

        rotulo =
            "Documento incompatível";

        if (
            estrutura.notaFiscalIsolada
        ) {
            mensagem =
                "Foi localizada uma Nota Fiscal de Serviços, mas ela não comprova sozinha o documento mensal de ISSQN esperado.";
        }
        else if (
            estrutura.certidaoMunicipal
        ) {
            mensagem =
                "Foi localizada uma certidão municipal, mas ela não substitui o documento mensal de ISSQN.";
        }
        else {
            mensagem =
                "O arquivo não apresenta estrutura suficiente de guia, recolhimento ou comprovante de ISSQN.";
        }
    }
    else if (
        divergenciaCnpj
    ) {
        codigo =
            "DIVERGENCIA_CNPJ";

        nivel =
            "BLOQUEIO";

        rotulo =
            "CNPJ divergente";

        mensagem =
            "Nenhum dos CNPJs localizados no documento está vinculado à empresa selecionada.";
    }
    else if (
        competenciaAusente
    ) {
        codigo =
            "COMPETENCIA_DOCUMENTAL_NAO_IDENTIFICADA";

        nivel =
            "BLOQUEIO";

        rotulo =
            "Competência não identificada";

        mensagem =
            "O documento de ISSQN foi reconhecido, mas sua competência mensal não pôde ser identificada com segurança.";
    }
    else if (
        competenciaConfere ===
        false
    ) {
        codigo =
            "COMPETENCIA_DOCUMENTAL_REDIRECIONADA";

        nivel =
            "ATENCAO";

        rotulo =
            "Competência diferente da tela";

        mensagem =
            (
                "ISSQN da competência " +
                competenciaDocumento +
                " identificado. O documento deverá ser salvo nessa competência, independentemente do mês aberto na tela."
            );
    }
    else if (
        estrutura.comprovantePagamento
    ) {
        codigo =
            "COMPROVANTE_PAGAMENTO_ISS_IDENTIFICADO";

        nivel =
            "ATENCAO";

        rotulo =
            "Comprovante de pagamento de ISSQN identificado";

        mensagem =
            "Comprovante relacionado ao ISSQN reconhecido. Conferir manualmente a competência, o contribuinte, o município e a quitação.";
    }
    else if (
        estrutura.guiaIss
    ) {
        codigo =
            "GUIA_ISS_IDENTIFICADA";

        nivel =
            "ATENCAO";

        rotulo =
            "Guia de ISSQN identificada";

        mensagem =
            "Guia de ISSQN reconhecida. Conferir manualmente os dados fiscais e a situação do recolhimento.";
    }

    const regras = [
        {
            codigo:
                "TIPO_DOCUMENTAL",
            titulo:
                "ISSQN",
            status:
                estrutura.reconhecido
                    ? "APROVADA"
                    : "REPROVADA",
            mensagem:
                estrutura.reconhecido
                    ? (
                        "Estrutura reconhecida como " +
                        estrutura.variante +
                        "."
                    )
                    : estrutura.notaFiscalIsolada
                        ? "NFS-e isolada não é aceita automaticamente como documento mensal de ISSQN."
                        : estrutura.certidaoMunicipal
                            ? "CND Municipal não substitui a evidência mensal de ISSQN."
                            : "Estrutura de ISSQN não localizada.",
        },
        {
            codigo:
                "COMPETENCIA",
            titulo:
                "Competência documental",
            status:
                !competenciaDocumento
                    ? "REPROVADA"
                    : competenciaConfere ===
                        false
                        ? "ATENCAO"
                        : "APROVADA",
            mensagem:
                !competenciaDocumento
                    ? "Competência mensal não localizada."
                    : competenciaConfere ===
                        false
                        ? (
                            "Documento pertence à competência " +
                            competenciaDocumento +
                            " e será redirecionado para esse mês."
                        )
                        : (
                            "Competência localizada: " +
                            competenciaDocumento +
                            "."
                        ),
        },
        {
            codigo:
                "CNPJ_EMPRESA",
            titulo:
                "CNPJ da empresa",
            status:
                !possuiCnpjDocumento ||
                !possuiCnpjEsperado
                    ? "ATENCAO"
                    : divergenciaCnpj
                        ? "REPROVADA"
                        : "APROVADA",
            mensagem:
                !possuiCnpjDocumento
                    ? "CNPJ não localizado automaticamente; conferir o contribuinte no documento."
                    : !possuiCnpjEsperado
                        ? "A empresa selecionada não possui CNPJ disponível para comparação."
                        : divergenciaCnpj
                            ? "Os CNPJs encontrados não estão vinculados à empresa selecionada."
                            : cnpjVinculoEncontrado?.principal
                                ? "CNPJ principal da empresa localizado no documento."
                                : "CNPJ vinculado à empresa localizado no documento.",
        },
        {
            codigo:
                "RECOLHIMENTO_ISS",
            titulo:
                "Guia / recolhimento",
            status:
                estrutura.comprovantePagamento
                    ? "APROVADA"
                    : "ATENCAO",
            mensagem:
                estrutura.comprovantePagamento
                    ? "Foi localizado conteúdo compatível com comprovante de pagamento de ISSQN."
                    : estrutura.guiaIss
                        ? "Guia localizada; a efetiva quitação deve ser conferida manualmente."
                        : "Documento fiscal reconhecido; conferir manualmente a situação do recolhimento.",
        },
        {
            codigo:
                "CONFERENCIA_FISCAL_MUNICIPAL",
            titulo:
                "Conferência fiscal municipal",
            status:
                "ATENCAO",
            mensagem:
                "A análise automática não confirma município competente, base de cálculo, retenção, valor devido ou efetiva quitação. A conferência humana permanece obrigatória.",
        },
    ];

    const cnpjDocumento =
        somenteDigitos(
            cnpjVinculoEncontrado?.cnpj
        ) ||
        cnpjsDocumento[0] ||
        "";

    const cnpjEsperado =
        cnpjsAceitos.find(
            (vinculo) =>
                vinculo?.principal
        )?.cnpj ||
        somenteDigitos(
            empresaEsperada?.cnpj
        );

    return {
        aplicavel:
            true,
        documentoIncompativel,
        bloqueiaSubstituicao,
        codigo,
        nivel,
        rotulo,
        mensagem,
        requerConferenciaHumana:
            true,
        requerConsultaOficial:
            false,
        documentoEsperado:
            documentoEsperado?.titulo ||
            "ISSQN",
        documentoIdentificado:
            estrutura.certidaoMunicipal
                ? "Certidão Municipal"
                : estrutura.notaFiscalIsolada
                    ? "NFS-e / Nota Fiscal de Serviços"
                    : estrutura.variante ||
                        "ISSQN",
        empresaEsperada:
            empresaEsperada?.nome ||
            "",
        razaoSocialDocumento:
            extrairRazaoSocialDocumento(
                textoExtraido
            ),
        cnpjEsperado:
            formatarCnpj(
                cnpjEsperado
            ),
        cnpjsEsperados:
            cnpjsAceitos.map(
                (vinculo) =>
                    formatarCnpj(
                        vinculo?.cnpj
                    )
            ),
        cnpjDocumento:
            formatarCnpj(
                cnpjDocumento
            ),
        cnpjsDocumento:
            cnpjsDocumento.map(
                formatarCnpj
            ),
        cnpjConfere,
        cnpjVinculoEncontrado:
            cnpjVinculoEncontrado
                ? {
                    ...cnpjVinculoEncontrado,
                    cnpj:
                        formatarCnpj(
                            cnpjVinculoEncontrado
                                ?.cnpj
                        ),
                }
                : null,
        competenciaDocumento,
        competenciaEsperada,
        competenciaConfere,
        codigoControle:
            numeroDocumento ||
            competenciaDocumento ||
            "",
        dadosTemporais:
            criarDadosTemporais({
                competencia:
                    competenciaDocumento,
                dataEmissao,
            }),
        dadosIss: {
            variante:
                estrutura.variante,
            competencia:
                competenciaDocumento,
            competenciaEsperada,
            competenciaConfere,
            numeroDocumento,
            dataEmissao,
            vencimento,
            guiaIss:
                estrutura.guiaIss,
            comprovantePagamento:
                estrutura.comprovantePagamento,
            recolhimentoIss:
                estrutura.recolhimentoIss,
            notaFiscalServico:
                estrutura.notaFiscalServico,
            certidaoMunicipal:
                estrutura.certidaoMunicipal,
        },
        regras,
        classificacao:
            classificacao ||
            null,
    };
}