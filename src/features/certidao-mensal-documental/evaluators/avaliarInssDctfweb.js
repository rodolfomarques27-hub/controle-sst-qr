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
        const digitos =
            somenteDigitos(
                correspondencia[0]
            );

        if (
            digitos.length ===
            14
        ) {
            encontrados.add(
                digitos
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

    const padroes = [
        /PERIODO\s+DE\s+APURACAO\s*[:\-]?\s*(0?[1-9]|1[0-2])\s*[/.:-]\s*(20\d{2})/,
        /PERIODO\s+APURACAO\s*[:\-]?\s*(0?[1-9]|1[0-2])\s*[/.:-]\s*(20\d{2})/,
        /COMPETENCIA\s*[:\-]?\s*(0?[1-9]|1[0-2])\s*[/.:-]\s*(20\d{2})/,
        /MES\s+DE\s+REFERENCIA\s*[:\-]?\s*(0?[1-9]|1[0-2])\s*[/.:-]\s*(20\d{2})/,
        /REFERENCIA\s*[:\-]?\s*(0?[1-9]|1[0-2])\s*[/.:-]\s*(20\d{2})/,
        /\bPA\s*[:\-]?\s*(0?[1-9]|1[0-2])\s*[/.:-]\s*(20\d{2})/,
    ];

    for (
        const padrao of
        padroes
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

    return "";
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
                    "([A-Z0-9][A-Z0-9./\\-]{3,60})"
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

    const limparRazaoSocial =
        (valor) =>
            textoSeguro(
                valor
            )
                .replace(
                    /\s+/g,
                    " "
                )
                .replace(
                    /^[\s:;\-]+|[\s:;\-]+$/g,
                    ""
                )
                .trim();

    /*
     * Primeiro preservamos as formas explícitas.
     *
     * DCTFWeb, recibos e alguns DARFs podem fornecer
     * NOME EMPRESARIAL, RAZAO SOCIAL ou CONTRIBUINTE.
     */
    const padroesRotulados = [
        /NOME\s+EMPRESARIAL\s*[:\-]\s*(.{3,120}?)(?=\s+(?:CNPJ|DCTFWEB|PERIODO|COMPETENCIA|RECIBO|DATA|NUMERO)\b|$)/,
        /RAZAO\s+SOCIAL\s*[:\-]\s*(.{3,120}?)(?=\s+(?:CNPJ|DCTFWEB|PERIODO|COMPETENCIA|RECIBO|DATA|NUMERO)\b|$)/,
        /CONTRIBUINTE\s*[:\-]\s*(.{3,120}?)(?=\s+(?:CNPJ|DCTFWEB|PERIODO|COMPETENCIA|RECIBO|DATA|NUMERO)\b|$)/,
    ];

    for (
        const padrao of
        padroesRotulados
    ) {
        const correspondencia =
            conteudo.match(
                padrao
            );

        const valor =
            limparRazaoSocial(
                correspondencia?.[1]
            );

        if (valor) {
            return valor;
        }
    }

    /*
     * Fallback exclusivo para DARF.
     *
     * A camada textual de alguns documentos da Receita
     * apresenta:
     *
     * CNPJ + razão social + Período de Apuração
     *
     * sem preservar o rótulo visual "Razão Social".
     *
     * O fallback fica restrito ao DARF para evitar
     * interpretar qualquer texto posterior a um CNPJ
     * em documentos de outra natureza.
     */
    const documentoDarf =
        Boolean(
            conteudo.includes(
                "DOCUMENTO DE ARRECADACAO DE RECEITAS FEDERAIS"
            ) ||
            /\bDARF\b/.test(
                conteudo
            )
        );

    if (!documentoDarf) {
        return "";
    }

    const padraoCnpjRazaoSocial =
        /(?:\bCNPJ\b\s*[:\-]?\s*)?\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b\s+(?:RAZAO\s+SOCIAL\s*[:\-]?\s*)?([A-Z][A-Z0-9&.,'()\/\- ]{2,120}?)(?=\s+(?:PERIODO\s+DE\s+APURACAO|PERIODO\s+APURACAO|DATA\s+DE\s+VENCIMENTO|DATA\s+VENCIMENTO|VENCIMENTO|NUMERO\s+DO\s+DOCUMENTO|NUMERO\s+DOCUMENTO|OBSERVACOES|VALOR\s+TOTAL|COMPOSICAO\s+DO\s+DOCUMENTO|COMPETENCIA)\b|$)/;

    const correspondencia =
        conteudo.match(
            padraoCnpjRazaoSocial
        );

    const valor =
        limparRazaoSocial(
            correspondencia?.[1]
        );

    if (!valor) {
        return "";
    }

    /*
     * Proteções adicionais:
     * o candidato precisa conter conteúdo nominal e
     * não pode começar por outro campo conhecido do DARF.
     */
    const iniciosInvalidos = [
        "PERIODO DE APURACAO",
        "PERIODO APURACAO",
        "DATA DE VENCIMENTO",
        "VENCIMENTO",
        "NUMERO DO DOCUMENTO",
        "NUMERO DOCUMENTO",
        "OBSERVACOES",
        "VALOR TOTAL",
        "COMPOSICAO DO DOCUMENTO",
        "COMPETENCIA",
    ];

    if (
        iniciosInvalidos.some(
            (inicio) =>
                valor.startsWith(
                    inicio
                )
        )
    ) {
        return "";
    }

    if (
        !/[A-Z]{2}/.test(
            valor
        )
    ) {
        return "";
    }

    return valor;
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

    const nomeDctfweb =
        Boolean(
            conteudo.includes(
                "DCTFWEB"
            ) ||
            conteudo.includes(
                "DCTF WEB"
            ) ||
            conteudo.includes(
                "DECLARACAO DE DEBITOS E CREDITOS TRIBUTARIOS FEDERAIS"
            )
        );

    const reciboEntrega =
        conteudo.includes(
            "RECIBO DE ENTREGA"
        );

    const possuiDarf =
        Boolean(
            conteudo.includes(
                "DOCUMENTO DE ARRECADACAO DE RECEITAS FEDERAIS"
            ) ||
            /\bDARF\b/.test(
                conteudo
            )
        );

    const marcadoresPrevidenciarios = [
        "CONTRIBUICOES PREVIDENCIARIAS",
        "CONTRIBUICAO PREVIDENCIARIA",
        "DEBITOS PREVIDENCIARIOS",
        "DEBITO PREVIDENCIARIO",
        "PREVIDENCIARIO",
        "CP SEGURADOS",
        "CP PATRONAL",
    ];

    const previdenciario =
        marcadoresPrevidenciarios.some(
            (marcador) =>
                conteudo.includes(
                    marcador
                )
        );

    const declaracaoDctfweb =
        Boolean(
            nomeDctfweb &&
            (
                reciboEntrega ||
                conteudo.includes(
                    "DECLARACAO"
                ) ||
                conteudo.includes(
                    "PERIODO DE APURACAO"
                ) ||
                conteudo.includes(
                    "NUMERO DO RECIBO"
                )
            )
        );

    const darfDctfweb =
        Boolean(
            possuiDarf &&
            (
                nomeDctfweb ||
                previdenciario
            )
        );

    let variante = "";

    if (
        declaracaoDctfweb &&
        reciboEntrega
    ) {
        variante =
            "Recibo de Entrega da DCTFWeb";
    }
    else if (
        declaracaoDctfweb
    ) {
        variante =
            "DCTFWeb";
    }
    else if (
        darfDctfweb
    ) {
        variante =
            "DARF Previdenciário / DCTFWeb";
    }

    return {
        reconhecido:
            Boolean(
                declaracaoDctfweb ||
                darfDctfweb
            ),
        declaracaoDctfweb,
        darfDctfweb,
        reciboEntrega,
        previdenciario,
        variante,
    };
}

function criarDadosTemporais({
    competencia,
    dataTransmissao,
}) {
    return {
        dataEmissao:
            dataTransmissao ||
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
                dataTransmissao
                    ? "LOCALIZADA"
                    : "NAO_IDENTIFICADA",
            rotulo:
                dataTransmissao
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

export function avaliarInssDctfweb({
    textoExtraido = "",
    classificacao = null,
    documentoEsperado = null,
    empresaEsperada = null,
    dataReferencia = new Date(),
} = {}) {
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

    const cnpjSecundario =
        Boolean(
            cnpjVinculoEncontrado &&
            !cnpjVinculoEncontrado
                ?.principal
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

    const numeroRecibo =
        extrairIdentificador({
            texto:
                textoExtraido,
            marcadores: [
                "NUMERO\\s+DO\\s+RECIBO",
                "N\\.?\\s+DO\\s+RECIBO",
                "RECIBO",
            ],
        });

    const numeroDocumento =
        extrairIdentificador({
            texto:
                textoExtraido,
            marcadores: [
                "NUMERO\\s+DO\\s+DOCUMENTO",
                "NUMERO\\s+DOCUMENTO",
            ],
        });

    const dataTransmissao =
        extrairDataPorMarcadores({
            texto:
                textoExtraido,
            marcadores: [
                "DATA\\s+DA\\s+TRANSMISSAO",
                "DATA\\s+DE\\s+TRANSMISSAO",
                "DATA\\s+DA\\s+ENTREGA",
                "DATA\\s+DE\\s+ENTREGA",
                "TRANSMITIDA\\s+EM",
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
        "INSS_DCTFWEB_IDENTIFICADO";

    let nivel =
        "ATENCAO";

    let rotulo =
        "INSS / DCTFWeb identificado";

    let mensagem =
        "Documento previdenciário reconhecido. Conferir os dados antes da confirmação.";

    if (
        !estrutura.reconhecido
    ) {
        codigo =
            "ARQUIVO_INCOMPATIVEL";

        nivel =
            "BLOQUEIO";

        rotulo =
            "Documento incompatível";

        mensagem =
            "O arquivo não apresenta estrutura suficiente de DCTFWeb ou DARF previdenciário.";
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
            "O CNPJ localizado no documento não pertence à empresa selecionada.";
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
            "O documento foi reconhecido, mas o período de apuração ou competência não pôde ser identificado com segurança.";
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
                "INSS / DCTFWeb da competência " +
                competenciaDocumento +
                " identificado. O documento deverá ser salvo nessa competência, independentemente do mês aberto na tela."
            );
    }
    else if (
        estrutura.darfDctfweb &&
        !estrutura.declaracaoDctfweb
    ) {
        codigo =
            "DARF_PREVIDENCIARIO_IDENTIFICADO";

        nivel =
            "ATENCAO";

        rotulo =
            "DARF previdenciário identificado";

        mensagem =
            "DARF previdenciário reconhecido. O pagamento e a vinculação à DCTFWeb devem ser conferidos manualmente.";
    }
    else {
        codigo =
            "DCTFWEB_IDENTIFICADA";

        nivel =
            "ATENCAO";

        rotulo =
            "DCTFWeb identificada";

        mensagem =
            "DCTFWeb reconhecida. A transmissão, os débitos previdenciários e eventual recolhimento devem ser conferidos manualmente.";
    }

    const regras = [
        {
            codigo:
                "TIPO_DOCUMENTAL",
            titulo:
                "INSS / DCTFWeb",
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
                    : "Estrutura de DCTFWeb ou DARF previdenciário não localizada.",
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
                        : cnpjSecundario
                            ? "ATENCAO"
                            : "APROVADA",
            mensagem:
                !possuiCnpjDocumento
                    ? "CNPJ não localizado automaticamente; conferir no documento."
                    : !possuiCnpjEsperado
                        ? "A empresa selecionada não possui CNPJ disponível para comparação."
                        : divergenciaCnpj
                            ? "O CNPJ do documento não está vinculado à empresa selecionada."
                            : cnpjSecundario
                                ? "O CNPJ localizado está vinculado à empresa, porém não é o CNPJ principal. Conferir a centralização da DCTFWeb na matriz."
                                : "CNPJ principal da empresa localizado no documento.",
        },
        {
            codigo:
                "RECIBO_TRANSMISSAO",
            titulo:
                "Transmissão / recibo",
            status:
                estrutura.declaracaoDctfweb &&
                numeroRecibo
                    ? "APROVADA"
                    : "ATENCAO",
            mensagem:
                estrutura.declaracaoDctfweb &&
                numeroRecibo
                    ? (
                        "Número de recibo localizado: " +
                        numeroRecibo +
                        "."
                    )
                    : estrutura.declaracaoDctfweb
                        ? "DCTFWeb reconhecida, mas o número do recibo não foi localizado automaticamente."
                        : "DARF localizado; a declaração/transmissão correspondente deve ser conferida separadamente.",
        },
        {
            codigo:
                "CONFERENCIA_PREVIDENCIARIA",
            titulo:
                "Conferência previdenciária",
            status:
                "ATENCAO",
            mensagem:
                "A identificação automática não substitui a conferência humana dos débitos previdenciários, transmissão e pagamento.",
        },
    ];

    const cnpjDocumento =
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
            "INSS / DCTFWeb",
        documentoIdentificado:
            estrutura.variante ||
            "INSS / DCTFWeb",
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
            numeroRecibo ||
            numeroDocumento ||
            competenciaDocumento ||
            "",
        dadosTemporais:
            criarDadosTemporais({
                competencia:
                    competenciaDocumento,
                dataTransmissao,
            }),
        dadosInssDctfweb: {
            variante:
                estrutura.variante,
            competencia:
                competenciaDocumento,
            competenciaEsperada,
            competenciaConfere,
            numeroRecibo,
            numeroDocumento,
            dataTransmissao,
            vencimento,
            declaracaoDctfweb:
                estrutura.declaracaoDctfweb,
            darfDctfweb:
                estrutura.darfDctfweb,
            previdenciario:
                estrutura.previdenciario,
        },
        regras,
        classificacao:
            classificacao ||
            null,
    };
}