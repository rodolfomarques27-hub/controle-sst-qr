import {
    extrairCnpjsDocumento,
    extrairRazaoSocialDocumento,
    formatarCnpj,
    normalizarTextoDocumental,
} from "../analysis/certidaoDocumentTextUtils.js";

import {
    obterCnpjsAceitosEmpresa,
} from "../../../services/empresaCnpjsService.js";

function textoSeguro(
    valor
) {
    return String(
        valor ?? ""
    ).trim();
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

function normalizarCompetencia(
    mes,
    ano
) {
    const mesNumero =
        Number(
            mes
        );

    const anoNumero =
        Number(
            ano
        );

    if (
        !Number.isInteger(
            mesNumero
        ) ||
        mesNumero < 1 ||
        mesNumero > 12 ||
        !Number.isInteger(
            anoNumero
        ) ||
        anoNumero < 2000 ||
        anoNumero > 2100
    ) {
        return "";
    }

    return (
        String(
            mesNumero
        ).padStart(
            2,
            "0"
        ) +
        "/" +
        String(
            anoNumero
        )
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

    return normalizarCompetencia(
        data.getUTCMonth() + 1,
        data.getUTCFullYear()
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
        const correspondencia =
            /^(0?[1-9]|1[0-2])\/(20\d{2})$/
                .exec(
                    textoSeguro(
                        candidato
                    )
                );

        if (correspondencia) {
            return normalizarCompetencia(
                correspondencia[1],
                correspondencia[2]
            );
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
        normalizarTextoDocumental(
            texto
        );

    const padroes = [
        /COMPETENCIA(?:\s+DO\s+BENEFICIO)?\s*[:\-]?\s*(0?[1-9]|1[0-2])[\/.\-](20\d{2})/,
        /MES\s+DE\s+REFERENCIA\s*[:\-]?\s*(0?[1-9]|1[0-2])[\/.\-](20\d{2})/,
        /REFERENCIA\s*[:\-]?\s*(0?[1-9]|1[0-2])[\/.\-](20\d{2})/,
        /MES\/ANO\s*[:\-]?\s*(0?[1-9]|1[0-2])[\/.\-](20\d{2})/,
        /MES\s+DO\s+BENEFICIO\s*[:\-]?\s*(0?[1-9]|1[0-2])[\/.\-](20\d{2})/,
        /MES\s+DE\s+BENEFICIO\s*[:\-]?\s*(0?[1-9]|1[0-2])[\/.\-](20\d{2})/,
        /MES\s+DE\s+UTILIZACAO\s*[:\-]?\s*(0?[1-9]|1[0-2])[\/.\-](20\d{2})/,
        /PERIODO\s*[:\-]?\s*(0?[1-9]|1[0-2])[\/.\-](20\d{2})/,
    ];

    for (
        const padrao of
        padroes
    ) {
        const correspondencia =
            conteudo.match(
                padrao
            );

        if (correspondencia) {
            return normalizarCompetencia(
                correspondencia[1],
                correspondencia[2]
            );
        }
    }

    const periodoCompleto =
        conteudo.match(
            /PERIODO(?:\s+DE(?:\s+APURACAO|\s+UTILIZACAO|\s+BENEFICIO)?)?\s*[:\-]?\s*(\d{1,2})\/(0?[1-9]|1[0-2])\/(20\d{2})\s*(?:A|ATE|-)\s*(\d{1,2})\/(0?[1-9]|1[0-2])\/(20\d{2})/
        );

    if (!periodoCompleto) {
        return "";
    }

    const diaInicial =
        Number(
            periodoCompleto[1]
        );

    const mesInicial =
        Number(
            periodoCompleto[2]
        );

    const anoInicial =
        Number(
            periodoCompleto[3]
        );

    const diaFinal =
        Number(
            periodoCompleto[4]
        );

    const mesFinal =
        Number(
            periodoCompleto[5]
        );

    const anoFinal =
        Number(
            periodoCompleto[6]
        );

    const inicioUtc =
        Date.UTC(
            anoInicial,
            mesInicial - 1,
            diaInicial
        );

    const fimUtc =
        Date.UTC(
            anoFinal,
            mesFinal - 1,
            diaFinal
        );

    const inicio =
        new Date(
            inicioUtc
        );

    const fim =
        new Date(
            fimUtc
        );

    const inicioValido =
        (
            inicio.getUTCFullYear() ===
                anoInicial &&
            inicio.getUTCMonth() + 1 ===
                mesInicial &&
            inicio.getUTCDate() ===
                diaInicial
        );

    const fimValido =
        (
            fim.getUTCFullYear() ===
                anoFinal &&
            fim.getUTCMonth() + 1 ===
                mesFinal &&
            fim.getUTCDate() ===
                diaFinal
        );

    const duracaoDias =
        Math.floor(
            (
                fimUtc -
                inicioUtc
            ) /
            86400000
        ) + 1;

    if (
        !inicioValido ||
        !fimValido ||
        fimUtc < inicioUtc ||
        duracaoDias < 1 ||
        duracaoDias > 45
    ) {
        return "";
    }

    return normalizarCompetencia(
        mesFinal,
        anoFinal
    );
}

function avaliarEstruturaVaVt(
    texto
) {
    const conteudo =
        normalizarTextoDocumental(
            texto
        );

    const marcadoresVa = [
        "VALE ALIMENTACAO",
        "AUXILIO ALIMENTACAO",
        "VALE REFEICAO",
        "AUXILIO REFEICAO",
        "BENEFICIO ALIMENTACAO",
        "BENEFICIO REFEICAO",
    ];

    const marcadoresVt = [
        "VALE TRANSPORTE",
        "AUXILIO TRANSPORTE",
        "BENEFICIO TRANSPORTE",
        "RECARGA DE TRANSPORTE",
        "CREDITO DE TRANSPORTE",
    ];

    const marcadoresApoio = [
        "BENEFICIARIO",
        "BENEFICIARIOS",
        "PEDIDO",
        "RECARGA",
        "CREDITO",
        "CARTAO",
        "RELATORIO",
        "RELACAO",
        "LISTAGEM",
        "COMPROVANTE",
        "COLABORADOR",
        "FUNCIONARIO",
        "MATRICULA",
        "CPF",
        "VALOR TOTAL",
        "QUANTIDADE",
    ];

    const marcadoresFolhaPagamento = [
        "FOLHA DE PAGAMENTO",
        "FOLHA MENSAL",
        "PROVENTOS",
        "DESCONTOS",
        "BASE INSS",
        "BASE FGTS",
    ];

    const evidenciasVa =
        marcadoresVa.filter(
            (marcador) =>
                conteudo.includes(
                    marcador
                )
        );

    const evidenciasVt =
        marcadoresVt.filter(
            (marcador) =>
                conteudo.includes(
                    marcador
                )
        );

    const evidenciasApoio =
        marcadoresApoio.filter(
            (marcador) =>
                conteudo.includes(
                    marcador
                )
        );

    const evidenciasFolha =
        marcadoresFolhaPagamento.filter(
            (marcador) =>
                conteudo.includes(
                    marcador
                )
        );

    const vaLocalizado =
        evidenciasVa.length >
        0;

    const vtLocalizado =
        evidenciasVt.length >
        0;

    const beneficioLocalizado =
        vaLocalizado ||
        vtLocalizado;

    /*
     * Evita classificar Folha de Pagamento apenas porque
     * nela aparece um desconto/provento de Vale Transporte
     * ou Vale Alimentação.
     *
     * Documento de benefício deve possuir também evidência
     * estrutural de relação, pedido, crédito, beneficiário,
     * cartão, comprovante ou informação equivalente.
     */
    const reconhecido =
        Boolean(
            beneficioLocalizado &&
            evidenciasApoio.length >
                0 &&
            (
                evidenciasFolha.length <
                    2 ||
                evidenciasApoio.some(
                    (marcador) =>
                        [
                            "BENEFICIARIO",
                            "BENEFICIARIOS",
                            "PEDIDO",
                            "RECARGA",
                            "CARTAO",
                            "COMPROVANTE",
                        ].includes(
                            marcador
                        )
                )
            )
        );

    let cobertura =
        "";

    if (
        vaLocalizado &&
        vtLocalizado
    ) {
        cobertura =
            "VA_VT";
    }
    else if (vaLocalizado) {
        cobertura =
            "VA";
    }
    else if (vtLocalizado) {
        cobertura =
            "VT";
    }

    return {
        reconhecido,
        vaLocalizado,
        vtLocalizado,
        cobertura,
        evidenciasVa,
        evidenciasVt,
        evidenciasApoio,
        evidenciasFolha,
    };
}

function obterRotuloCobertura(
    cobertura
) {
    if (
        cobertura ===
        "VA_VT"
    ) {
        return (
            "Vale-Alimentação / Refeição " +
            "e Vale-Transporte"
        );
    }

    if (
        cobertura ===
        "VA"
    ) {
        return (
            "Vale-Alimentação / Refeição"
        );
    }

    if (
        cobertura ===
        "VT"
    ) {
        return "Vale-Transporte";
    }

    return "Não identificada";
}

function criarDadosTemporais(
    competencia
) {
    return {
        dataEmissao:
            "",

        dataEmissaoIso:
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

        dataValidadeIso:
            "",

        situacaoEmissao: {
            codigo:
                "NAO_APLICAVEL",

            rotulo:
                "Documento mensal",
        },

        situacaoValidade: {
            codigo:
                competencia
                    ? "MENSAL"
                    : "NAO_IDENTIFICADA",

            rotulo:
                competencia
                    ? (
                        "Mensal · " +
                        competencia
                    )
                    : "Competência não identificada",

            diasRestantes:
                null,
        },
    };
}

export function avaliarVaVt({
    textoExtraido,
    classificacao = null,
    documentoEsperado = null,
    empresaEsperada = null,
    dataReferencia = new Date(),
} = {}) {
    const estrutura =
        avaliarEstruturaVaVt(
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

    const cnpjsEncontrados =
        [
            ...new Set(
                extrairCnpjsDocumento(
                    textoExtraido
                )
                    .map(
                        somenteDigitos
                    )
                    .filter(
                        (cnpj) =>
                            cnpj.length ===
                            14
                    )
            ),
        ];

    const cnpjsAceitos =
        obterCnpjsAceitosEmpresa({
            empresa:
                empresaEsperada,

            vinculos:
                empresaEsperada
                    ?.cnpjsVinculados ||
                empresaEsperada
                    ?.cnpjs_vinculados ||
                [],
        });

    const cnpjVinculoEncontrado =
        cnpjsAceitos.find(
            (vinculo) =>
                cnpjsEncontrados.includes(
                    somenteDigitos(
                        vinculo?.cnpj
                    )
                )
        ) ||
        null;

    const cnpjEsperado =
        formatarCnpj(
            empresaEsperada?.cnpj
        );

    const cnpjEncontrado =
        cnpjVinculoEncontrado
            ? (
                cnpjVinculoEncontrado
                    .cnpjFormatado ||
                formatarCnpj(
                    cnpjVinculoEncontrado
                        .cnpj
                )
            )
            : formatarCnpj(
                cnpjsEncontrados[0] ||
                ""
            );

    const cnpjConfere =
        cnpjVinculoEncontrado
            ? true
            : cnpjsEncontrados.length >
                0
                ? false
                : null;

    const documentoIncompativel =
        !estrutura.reconhecido;

    const competenciaAusente =
        Boolean(
            estrutura.reconhecido &&
            !competenciaDocumento
        );

    const cnpjNaoConfirmado =
        Boolean(
            estrutura.reconhecido &&
            cnpjConfere !==
                true
        );

    const coberturaCompleta =
        estrutura.cobertura ===
        "VA_VT";

    const bloqueiaSubstituicao =
        Boolean(
            documentoIncompativel ||
            competenciaAusente ||
            cnpjNaoConfirmado
        );

    let codigo =
        "VA_VT_IDENTIFICADO";

    if (documentoIncompativel) {
        codigo =
            "ARQUIVO_INCOMPATIVEL";
    }
    else if (competenciaAusente) {
        codigo =
            "COMPETENCIA_DOCUMENTAL_NAO_IDENTIFICADA";
    }
    else if (cnpjNaoConfirmado) {
        codigo =
            "DIVERGENCIA_CNPJ";
    }
    else if (
        competenciaConfere ===
        false
    ) {
        codigo =
            "COMPETENCIA_DOCUMENTAL_REDIRECIONADA";
    }
    else if (!coberturaCompleta) {
        codigo =
            "VA_VT_EVIDENCIA_PARCIAL";
    }

    let nivel =
        "APROVADA";

    if (
        documentoIncompativel ||
        cnpjNaoConfirmado
    ) {
        nivel =
            "REPROVADA";
    }
    else if (
        competenciaAusente ||
        competenciaConfere ===
            false ||
        !coberturaCompleta
    ) {
        nivel =
            "ATENCAO";
    }

    let rotulo =
        "VA / VT identificado";

    let mensagem =
        competenciaDocumento
            ? (
                "Documento de VA / VT da competência " +
                competenciaDocumento +
                " identificado."
            )
            : (
                "Documento de VA / VT identificado."
            );

    if (documentoIncompativel) {
        rotulo =
            "Arquivo incompatível";

        mensagem =
            "O conteúdo não apresenta estrutura documental suficiente de VA ou VT.";
    }
    else if (competenciaAusente) {
        rotulo =
            "Competência não identificada";

        mensagem =
            "O documento de VA / VT foi reconhecido, mas a competência mensal não pôde ser identificada com segurança.";
    }
    else if (cnpjNaoConfirmado) {
        rotulo =
            "Empresa não confirmada";

        mensagem =
            "O documento de VA / VT foi reconhecido, mas nenhum CNPJ vinculado à empresa selecionada foi confirmado.";
    }
    else if (
        competenciaConfere ===
        false
    ) {
        rotulo =
            "Competência diferente da tela";

        mensagem =
            (
                "VA / VT da competência " +
                competenciaDocumento +
                " identificado. O documento deverá ser salvo nessa competência, independentemente do mês aberto na tela."
            );
    }
    else if (!coberturaCompleta) {
        rotulo =
            "Evidência parcial de VA / VT";

        mensagem =
            (
                obterRotuloCobertura(
                    estrutura.cobertura
                ) +
                " identificado para " +
                competenciaDocumento +
                ". A outra modalidade poderá ser complementada documentalmente."
            );
    }

    const razaoSocialDocumento =
        extrairRazaoSocialDocumento(
            textoExtraido
        );

    const regras = [
        {
            codigo:
                "TIPO_DOCUMENTAL",

            titulo:
                "Documento de VA / VT",

            status:
                estrutura.reconhecido
                    ? "APROVADA"
                    : "REPROVADA",

            mensagem:
                estrutura.reconhecido
                    ? "Estrutura documental de benefício identificada."
                    : "Não foram identificados elementos suficientes de VA ou VT.",
        },
        {
            codigo:
                competenciaDocumento
                    ? (
                        competenciaConfere ===
                            false
                            ? "COMPETENCIA_DOCUMENTAL_REDIRECIONADA"
                            : "COMPETENCIA_DOCUMENTAL"
                    )
                    : "COMPETENCIA_DOCUMENTAL_NAO_IDENTIFICADA",

            titulo:
                "Competência documental",

            status:
                !competenciaDocumento
                    ? "REPROVADA"
                    : competenciaConfere ===
                        false
                        ? "REDIRECIONAR"
                        : "APROVADA",

            mensagem:
                !competenciaDocumento
                    ? "Competência mensal não localizada."
                    : competenciaConfere ===
                        false
                        ? (
                            "Documento pertence à competência " +
                            competenciaDocumento +
                            " e será direcionado para esse mês."
                        )
                        : (
                            "Competência " +
                            competenciaDocumento +
                            " confirmada."
                        ),
        },
        {
            codigo:
                "CNPJ_EMPRESA",

            titulo:
                "CNPJ da empresa",

            status:
                cnpjConfere ===
                    true
                    ? "APROVADA"
                    : "REPROVADA",

            mensagem:
                cnpjConfere ===
                    true
                    ? (
                        "CNPJ " +
                        cnpjEncontrado +
                        " está vinculado à empresa selecionada."
                    )
                    : cnpjsEncontrados.length >
                        0
                        ? "Nenhum CNPJ encontrado no documento está vinculado à empresa selecionada."
                        : "CNPJ da empresa não foi localizado no documento.",
        },
        {
            codigo:
                "COBERTURA_VA_VT",

            titulo:
                "Cobertura dos benefícios",

            status:
                coberturaCompleta
                    ? "APROVADA"
                    : estrutura.reconhecido
                        ? "ATENCAO"
                        : "REPROVADA",

            mensagem:
                coberturaCompleta
                    ? "VA e VT foram identificados no mesmo documento."
                    : estrutura.reconhecido
                        ? (
                            obterRotuloCobertura(
                                estrutura.cobertura
                            ) +
                            " identificado. Evidência complementar poderá ser necessária."
                        )
                        : "Cobertura de VA / VT não identificada.",
        },
    ];

    return {
        aplicavel:
            estrutura.reconhecido,

        classificacao,

        documentoEsperado:
            documentoEsperado
                ?.titulo ||
            "VA / VT",

        documentoIdentificado:
            estrutura.reconhecido
                ? "VA / VT"
                : "Documento não identificado",

        documentoIncompativel,

        bloqueiaSubstituicao,

        aprovadoAutomaticamente:
            false,

        requerConferenciaHumana:
            true,

        requerConsultaOficial:
            false,

        codigo,

        nivel,

        rotulo,

        mensagem,

        codigoControle:
            competenciaDocumento,

        empresaEsperada:
            textoSeguro(
                empresaEsperada?.nome
            ),

        razaoSocialDocumento,

        cnpjDocumento:
            cnpjEncontrado,

        cnpjsDocumento:
            cnpjsEncontrados.map(
                formatarCnpj
            ),

        cnpjsEsperados:
            cnpjsAceitos.map(
                (vinculo) =>
                    vinculo
                        ?.cnpjFormatado ||
                    formatarCnpj(
                        vinculo?.cnpj
                    )
            ),

        cnpjVinculoEncontrado,

        cnpjEsperado,

        cnpjEncontrado,

        cnpjConfere,

        competenciaDocumento,

        competenciaEsperada,

        competenciaConfere,

        natureza: {
            codigo:
                estrutura.cobertura ||
                "NAO_IDENTIFICADA",

            rotulo:
                obterRotuloCobertura(
                    estrutura.cobertura
                ),
        },

        dadosTemporais:
            criarDadosTemporais(
                competenciaDocumento
            ),

        dadosVaVt: {
            competencia:
                competenciaDocumento,

            competenciaDocumento,

            competenciaEsperada,

            competenciaConfere,

            cobertura:
                estrutura.cobertura,

            coberturaRotulo:
                obterRotuloCobertura(
                    estrutura.cobertura
                ),

            coberturaCompleta,

            vaLocalizado:
                estrutura.vaLocalizado,

            vtLocalizado:
                estrutura.vtLocalizado,

            cnpjEsperado,

            cnpjEncontrado,

            cnpjConfere,

            evidenciasVa:
                estrutura.evidenciasVa,

            evidenciasVt:
                estrutura.evidenciasVt,

            evidenciasApoio:
                estrutura.evidenciasApoio,
        },

        regras,

        statusGeral:
            documentoIncompativel
                ? "REPROVADO"
                : bloqueiaSubstituicao
                    ? "ATENCAO"
                    : "CONFERENCIA_MANUAL",
    };
}