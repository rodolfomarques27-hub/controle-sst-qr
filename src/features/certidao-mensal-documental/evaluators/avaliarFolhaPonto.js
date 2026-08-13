import {
    extrairCnpjsDocumento,
} from "../analysis/certidaoDocumentTextUtils.js";
import {
    obterCnpjsAceitosEmpresa,
} from "../../../services/empresaCnpjsService.js";

function textoSeguro(
    valor
) {
    return String(
        valor ??
        ""
    ).trim();
}

function normalizarTexto(
    valor
) {
    return textoSeguro(
        valor
    )
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .replace(
            /\s+/g,
            " "
        )
        .trim()
        .toUpperCase();
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
        digitos.slice(0, 2) +
        "." +
        digitos.slice(2, 5) +
        "." +
        digitos.slice(5, 8) +
        "/" +
        digitos.slice(8, 12) +
        "-" +
        digitos.slice(12, 14)
    );
}

function obterIntervaloCompetencia(
    competencia
) {
    const correspondencia =
        /^(\d{2})\/(\d{4})$/.exec(
            textoSeguro(
                competencia
            ).trim()
        );

    if (!correspondencia) {
        return null;
    }

    const mes =
        Number(
            correspondencia[1]
        );

    const ano =
        Number(
            correspondencia[2]
        );

    if (
        mes < 1 ||
        mes > 12 ||
        !Number.isInteger(ano)
    ) {
        return null;
    }

    return {
        inicio:
            Date.UTC(
                ano,
                mes - 1,
                1
            ),

        fim:
            Date.UTC(
                ano,
                mes,
                0,
                23,
                59,
                59,
                999
            ),
    };
}

function converterDataIsoParaUtc(
    valor
) {
    const correspondencia =
        /^(\d{4})-(\d{2})-(\d{2})$/.exec(
            textoSeguro(
                valor
            ).trim()
        );

    if (!correspondencia) {
        return null;
    }

    return Date.UTC(
        Number(correspondencia[1]),
        Number(correspondencia[2]) - 1,
        Number(correspondencia[3])
    );
}

function avaliarVigenciaVinculoCnpj(
    vinculo,
    competencia
) {
    if (!vinculo) {
        return null;
    }

    if (vinculo.principal === true) {
        return true;
    }

    const intervalo =
        obterIntervaloCompetencia(
            competencia
        );

    const inicio =
        converterDataIsoParaUtc(
            vinculo.vigenciaInicio
        );

    const fim =
        converterDataIsoParaUtc(
            vinculo.vigenciaFim
        );

    const situacao =
        textoSeguro(
            vinculo.situacao
        )
            .trim()
            .toUpperCase();

    if (
        inicio === null &&
        fim === null
    ) {
        return situacao === "HISTORICO"
            ? null
            : true;
    }

    if (!intervalo) {
        return null;
    }

    const iniciouAteFimCompetencia =
        inicio === null ||
        inicio <= intervalo.fim;

    const terminouDepoisInicioCompetencia =
        fim === null ||
        fim >= intervalo.inicio;

    return (
        iniciouAteFimCompetencia &&
        terminouDepoisInicioCompetencia
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
        anoNumero > 2200
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

function extrairCompetenciaDocumento(
    texto
) {
    const conteudo =
        normalizarTexto(
            texto
        );

    const padroesDiretos = [
        /COMPETENCIA(?:\s+DE)?\s*[:\-]?\s*(0?[1-9]|1[0-2])[\/.\-](20\d{2})/,
        /MES\s+DE\s+REFERENCIA\s*[:\-]?\s*(0?[1-9]|1[0-2])[\/.\-](20\d{2})/,
        /REFERENCIA\s*[:\-]?\s*(0?[1-9]|1[0-2])[\/.\-](20\d{2})/,
        /MES\/ANO\s*[:\-]?\s*(0?[1-9]|1[0-2])[\/.\-](20\d{2})/,
    ];

    for (
        const padrao of
        padroesDiretos
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

    /*
     * Muitos espelhos não utilizam a palavra "competência",
     * mas informam um período completo.
     *
     * Ex.:
     * Período de apuração:
     * 01/06/2026 a 30/06/2026
     */
    /*
     * Espelhos de Ponto podem utilizar ciclos que atravessam
     * dois meses civis.
     *
     * Exemplo real:
     *
     * Período de 11/12/2025 até 15/01/2026
     *
     * Nesse cenário, a competência corresponde ao mês de
     * fechamento do período: 01/2026.
     *
     * Para evitar inferências indevidas, somente períodos
     * válidos, cronologicamente crescentes e com até 45 dias
     * são utilizados para determinar a competência.
     */
    const periodo =
        conteudo.match(
            /PERIODO(?:\s+DE(?:\s+APURACAO)?)?\s*[:\-]?\s*(\d{1,2})\/(0?[1-9]|1[0-2])\/(20\d{2})\s*(?:A|ATE|-)\s*(\d{1,2})\/(0?[1-9]|1[0-2])\/(20\d{2})/
        );

    if (periodo) {
        const diaInicial =
            Number(
                periodo[1]
            );

        const mesInicial =
            Number(
                periodo[2]
            );

        const anoInicial =
            Number(
                periodo[3]
            );

        const diaFinal =
            Number(
                periodo[4]
            );

        const mesFinal =
            Number(
                periodo[5]
            );

        const anoFinal =
            Number(
                periodo[6]
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
            inicioValido &&
            fimValido &&
            fimUtc >= inicioUtc
                ? (
                    Math.floor(
                        (
                            fimUtc -
                            inicioUtc
                        ) /
                        86400000
                    ) +
                    1
                )
                : 0;

        if (
            duracaoDias >= 1 &&
            duracaoDias <= 45
        ) {
            return normalizarCompetencia(
                mesFinal,
                anoFinal
            );
        }
    }
    return "";
}

function obterCompetenciaEsperada({
    documentoEsperado,
    dataReferencia,
}) {
    const direta =
        textoSeguro(
            documentoEsperado
                ?.competenciaEsperada
        );

    const correspondencia =
        /^(0[1-9]|1[0-2])\/(20\d{2})$/
            .exec(
                direta
            );

    if (correspondencia) {
        return direta;
    }

    const data =
        dataReferencia instanceof Date
            ? dataReferencia
            : new Date(
                dataReferencia
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

function formatarDataPonto(
    dia,
    mes,
    ano
) {
    return (
        String(
            dia
        ).padStart(
            2,
            "0"
        ) +
        "/" +
        String(
            mes
        ).padStart(
            2,
            "0"
        ) +
        "/" +
        String(
            ano
        )
    );
}

function extrairPeriodoApurado(
    texto
) {
    const conteudo =
        normalizarTexto(
            texto
        );

    const correspondencia =
        conteudo.match(
            /PERIODO(?:\s+DE(?:\s+APURACAO)?)?\s*[:\-]?\s*(\d{1,2})\/(0?[1-9]|1[0-2])\/(20\d{2})\s*(?:A|ATE|-)\s*(\d{1,2})\/(0?[1-9]|1[0-2])\/(20\d{2})/
        );

    if (!correspondencia) {
        return {
            inicio: "",
            fim: "",
            rotulo: "",
        };
    }

    const diaInicial =
        Number(
            correspondencia[1]
        );

    const mesInicial =
        Number(
            correspondencia[2]
        );

    const anoInicial =
        Number(
            correspondencia[3]
        );

    const diaFinal =
        Number(
            correspondencia[4]
        );

    const mesFinal =
        Number(
            correspondencia[5]
        );

    const anoFinal =
        Number(
            correspondencia[6]
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
        return {
            inicio: "",
            fim: "",
            rotulo: "",
        };
    }

    const inicioFormatado =
        formatarDataPonto(
            diaInicial,
            mesInicial,
            anoInicial
        );

    const fimFormatado =
        formatarDataPonto(
            diaFinal,
            mesFinal,
            anoFinal
        );

    return {
        inicio:
            inicioFormatado,

        fim:
            fimFormatado,

        rotulo:
            (
                inicioFormatado +
                " a " +
                fimFormatado
            ),
    };
}

function extrairRazaoSocialDocumento(
    texto
) {
    const conteudo =
        textoSeguro(
            texto
        )
            .replace(
                /\s+/g,
                " "
            )
            .trim();

    if (!conteudo) {
        return "";
    }

    const correspondencia =
        /EMPREGADOR\s*:\s*(.+?)(?=\s+CNPJ\s*:|\s+ENDERE[CÇ]O\s*:|\s+EMPREGADO\s*:|\s+DATA\s+DE\s+ADMISS[AÃ]O\s*:|$)/i.exec(
            conteudo
        );

    if (!correspondencia) {
        return "";
    }

    return textoSeguro(
        correspondencia[1]
    )
        .replace(
            /\s+/g,
            " "
        )
        .trim();
}

function avaliarEstruturaPonto(
    texto
) {
    const conteudo =
        normalizarTexto(
            texto
        );

    const marcadoresFortes = [
        "ESPELHO DE PONTO",
        "ESPELHO DO PONTO",
        "FOLHA DE PONTO",
        "CARTAO DE PONTO",
        "REGISTRO DE PONTO",
        "CONTROLE DE PONTO",
        "PONTO ELETRONICO",
    ];

    const marcadorForte =
        marcadoresFortes.some(
            (marcador) =>
                conteudo.includes(
                    marcador
                )
        );

    const marcadoresJornada = [
        "ENTRADA",
        "SAIDA",
        "INTERVALO",
        "JORNADA",
        "HORAS TRABALHADAS",
        "HORAS NORMAIS",
        "HORAS EXTRAS",
    ];

    const quantidadeMarcadores =
        marcadoresJornada.filter(
            (marcador) =>
                conteudo.includes(
                    marcador
                )
        ).length;

    return {
        reconhecido:
            Boolean(
                marcadorForte ||
                quantidadeMarcadores >=
                    3
            ),

        marcadorForte,

        quantidadeMarcadores,
    };
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

export function avaliarFolhaPonto({
    textoExtraido,
    classificacao = null,
    documentoEsperado = null,
    empresaEsperada = null,
    dataReferencia = new Date(),
} = {}) {
    const estrutura =
        avaliarEstruturaPonto(
            textoExtraido
        );

    const competenciaDocumento =
        extrairCompetenciaDocumento(
            textoExtraido
        );

    const periodoApurado =
        extrairPeriodoApurado(
            textoExtraido
        );

    const razaoSocialExtraida =
        extrairRazaoSocialDocumento(
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
                [],
        });

    const vinculosEncontrados =
        cnpjsAceitos
            .filter(
                (vinculo) =>
                    cnpjsEncontrados
                        .includes(
                            somenteDigitos(
                                vinculo.cnpj
                            )
                        )
            )
            .map(
                (vinculo) => ({
                    vinculo,

                    vigente:
                        avaliarVigenciaVinculoCnpj(
                            vinculo,
                            competenciaDocumento
                        ),
                })
            );

    const vinculoValido =
        vinculosEncontrados.find(
            (item) =>
                item.vigente ===
                true
        ) || null;

    const vinculoIndeterminado =
        vinculosEncontrados.find(
            (item) =>
                item.vigente ===
                null
        ) || null;

    const cnpjVinculoEncontrado =
        (
            vinculoValido ||
            vinculoIndeterminado ||
            vinculosEncontrados[0] ||
            null
        )?.vinculo ||
        null;

    const cnpjEncontrado =
        formatarCnpj(
            cnpjVinculoEncontrado?.cnpj ||
            cnpjsEncontrados[0] ||
            ""
        );

    const cnpjEsperado =
        formatarCnpj(
            empresaEsperada?.cnpj ||
            empresaEsperada?.cnpjCpf ||
            empresaEsperada?.cnpj_cpf ||
            ""
        );

    const possuiCnpjDocumento =
        cnpjsEncontrados.length >
        0;

    const possuiCnpjEsperado =
        cnpjsAceitos.length >
        0;

    const cnpjConfere =
        !possuiCnpjDocumento ||
        !possuiCnpjEsperado
            ? null
            : vinculoValido
                ? true
                : vinculoIndeterminado
                    ? null
                    : false;

    const cnpjVinculadoForaVigencia =
        Boolean(
            possuiCnpjDocumento &&
            possuiCnpjEsperado &&
            vinculosEncontrados.length > 0 &&
            !vinculoValido &&
            !vinculoIndeterminado
        );

    const cnpjVinculadoSemVigencia =
        Boolean(
            possuiCnpjDocumento &&
            possuiCnpjEsperado &&
            vinculoIndeterminado
        );

    const divergenciaCnpj =
        Boolean(
            cnpjConfere === false &&
            vinculosEncontrados.length === 0
        );

    const cnpjBloqueado =
        Boolean(
            divergenciaCnpj ||
            cnpjVinculadoForaVigencia ||
            cnpjVinculadoSemVigencia
        );

    const competenciaAusente =
        estrutura.reconhecido &&
        !competenciaDocumento;

    const documentoIncompativel =
        Boolean(
            !estrutura.reconhecido ||
            cnpjBloqueado
        );

    /*
     * Competência divergente NÃO bloqueia.
     *
     * Isso é proposital:
     * o documento deve ser salvo na competência que
     * efetivamente consta no próprio Espelho de Ponto.
     *
     * Competência ausente, por outro lado, bloqueia o
     * salvamento para impedir classificação silenciosa
     * no mês selecionado na interface.
     */
    const bloqueiaSubstituicao =
        Boolean(
            documentoIncompativel ||
            competenciaAusente
        );

    let codigo =
        "FOLHA_PONTO_IDENTIFICADA";

    let mensagem =
        "Espelho de Ponto identificado. A conferência humana permanece obrigatória.";

    if (!estrutura.reconhecido) {
        codigo =
            "ARQUIVO_INCOMPATIVEL";

        mensagem =
            "O conteúdo não apresenta estrutura suficiente de Espelho de Ponto.";
    }
    else if (cnpjVinculadoForaVigencia) {
        codigo =
            "CNPJ_VINCULADO_FORA_VIGENCIA";

        mensagem =
            "O CNPJ localizado pertence à empresa selecionada, porém o vínculo não cobre a competência identificada no Espelho de Ponto.";
    }
    else if (cnpjVinculadoSemVigencia) {
        codigo =
            "CNPJ_VINCULADO_SEM_VIGENCIA";

        mensagem =
            "O CNPJ localizado está vinculado historicamente à empresa, mas não possui vigência suficiente para validar automaticamente esta competência.";
    }
    else if (divergenciaCnpj) {
        codigo =
            "DIVERGENCIA_CNPJ";

        mensagem =
            "O CNPJ localizado no Espelho de Ponto diverge da empresa selecionada.";
    }
    else if (!competenciaDocumento) {
        codigo =
            "COMPETENCIA_DOCUMENTAL_NAO_IDENTIFICADA";

        mensagem =
            "O Espelho de Ponto foi reconhecido, mas a competência não pôde ser determinada com segurança.";
    }
    else if (
        competenciaConfere ===
        false
    ) {
        codigo =
            "COMPETENCIA_DOCUMENTAL_REDIRECIONADA";

        mensagem =
            (
                "Espelho de Ponto da competência " +
                competenciaDocumento +
                " identificado. O documento deverá ser salvo nessa competência, independentemente do mês aberto na tela."
            );
    }

    const regras = [
        {
            id:
                "TIPO_DOCUMENTO",

            titulo:
                "Espelho de Ponto",

            status:
                estrutura.reconhecido
                    ? "APROVADA"
                    : "REPROVADA",

            detalhe:
                estrutura.reconhecido
                    ? "Estrutura documental de controle de jornada localizada."
                    : "Estrutura de controle de jornada não localizada.",
        },
        {
            id:
                "COMPETENCIA",

            titulo:
                "Competência documental",

            status:
                !competenciaDocumento
                    ? "ATENCAO"
                    : competenciaConfere ===
                        false
                        ? "REDIRECIONAR"
                        : "APROVADA",

            detalhe:
                competenciaDocumento
                    ? (
                        "Competência localizada: " +
                        competenciaDocumento +
                        "."
                    )
                    : "Competência não identificada com segurança.",
        },
        {
            id:
                "CNPJ",

            titulo:
                "CNPJ da empresa",

            status:
                cnpjConfere ===
                    false
                    ? "REPROVADA"
                    : cnpjConfere ===
                        true
                        ? "APROVADA"
                        : "ATENCAO",

            detalhe:
                cnpjEncontrado
                    ? (
                        "CNPJ localizado: " +
                        cnpjEncontrado +
                        "."
                    )
                    : "CNPJ não localizado no texto extraído.",
        },
    ];

    return {
        codigo,

        mensagem,

        observacao:
            mensagem,

        documentoEsperado:
            textoSeguro(
                documentoEsperado
                    ?.titulo ||
                "Espelho de Ponto"
            ),

        documentoIdentificado:
            estrutura.reconhecido
                ? "Espelho de Ponto"
                : (
                    classificacao
                        ?.rotulo ||
                    classificacao
                        ?.nome ||
                    "Documento não identificado"
                ),

        natureza: {
            codigo:
                estrutura.reconhecido
                    ? "CONTROLE_JORNADA"
                    : "NAO_IDENTIFICADA",

            rotulo:
                estrutura.reconhecido
                    ? "Espelho de Ponto / Controle de Jornada"
                    : "Não identificado",
        },

        documentoIncompativel,

        bloqueiaSubstituicao,

        aprovadoAutomaticamente:
            false,

        requerConferenciaHumana:
            true,

        codigoControle:
            competenciaDocumento,

        empresaEsperada:
            textoSeguro(
                empresaEsperada?.nome ||
                ""
            ),

        razaoSocialDocumento:
            razaoSocialExtraida,

        cnpjDocumento:
            cnpjEncontrado,

        cnpjsDocumento:
            cnpjsEncontrados.map(
                formatarCnpj
            ),

        cnpjsEsperados:
            cnpjsAceitos.map(
                (vinculo) =>
                    vinculo.cnpjFormatado ||
                    formatarCnpj(
                        vinculo.cnpj
                    )
            ),

        cnpjVinculoEncontrado,

        cnpjEsperado,

        cnpjEncontrado,

        cnpjConfere,

        competenciaDocumento,

        competenciaEsperada,

        competenciaConfere,

        dadosTemporais:
            criarDadosTemporais(
                competenciaDocumento
            ),

        dadosFolhaPonto: {
            competencia:
                competenciaDocumento,

            periodoInicio:
                periodoApurado.inicio,

            periodoFim:
                periodoApurado.fim,

            periodoApurado:
                periodoApurado.rotulo,

            competenciaDocumento,

            competenciaEsperada,

            competenciaConfere,

            cnpjEsperado,

            cnpjEncontrado,

            cnpjConfere,

            estruturaReconhecida:
                estrutura.reconhecido,

            marcadorForte:
                estrutura.marcadorForte,

            quantidadeMarcadoresJornada:
                estrutura
                    .quantidadeMarcadores,
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
