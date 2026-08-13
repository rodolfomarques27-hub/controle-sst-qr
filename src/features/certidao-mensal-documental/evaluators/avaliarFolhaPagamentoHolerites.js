import {
    extrairCnpjsDocumento,
    extrairRazaoSocialDocumento,
    formatarCnpj,
} from "../analysis/certidaoDocumentTextUtils.js";

function somenteDigitos(
    valor
) {
    return String(
        valor || ""
    ).replace(
        /\D/g,
        ""
    );
}

function normalizarTexto(
    valor
) {
    return String(
        valor || ""
    )
        .normalize("NFD")
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

function normalizarCompetencia(
    valor
) {
    const texto =
        String(
            valor || ""
        ).trim();

    let resultado =
        texto.match(
            /^(\d{4})-(0[1-9]|1[0-2])(?:-\d{2})?$/
        );

    if (resultado) {
        return (
            resultado[2] +
            "/" +
            resultado[1]
        );
    }

    resultado =
        texto.match(
            /^(0[1-9]|1[0-2])\/(\d{4})$/
        );

    if (resultado) {
        return (
            resultado[1] +
            "/" +
            resultado[2]
        );
    }

    return "";
}

function extrairCompetenciaDocumento(
    texto
) {
    const normalizado =
        normalizarTexto(
            texto
        );

    const padroesPrioritarios =
        [
            /(?:EXTRATO MENSAL|FOLHA MENSAL|FOLHA DE PAGAMENTO|RESUMO DA FOLHA|RESUMO DE FOLHA)\s*(?:[:\-]?\s*)(0[1-9]|1[0-2])\s*[\/\-]\s*(20\d{2})/,
            /\b(0[1-9]|1[0-2])\s*[\/\-]\s*(20\d{2})\b\s*(?:EXTRATO MENSAL|FOLHA MENSAL|FOLHA DE PAGAMENTO|RESUMO DA FOLHA|RESUMO DE FOLHA)/,
        ];

    for (
        const padrao of
        padroesPrioritarios
    ) {
        const resultado =
            normalizado.match(
                padrao
            );

        if (resultado) {
            return (
                resultado[1] +
                "/" +
                resultado[2]
            );
        }
    }

    const ancorada =
        normalizado.match(
            /(?:COMPETENCIA|REFERENCIA|PERIODO|MES\/ANO)\s*(?:[:\-]?\s*)(0[1-9]|1[0-2])\s*[\/\-]\s*(20\d{2})/
        );

    if (ancorada) {
        return (
            ancorada[1] +
            "/" +
            ancorada[2]
        );
    }

    const encontradas =
        [
            ...normalizado.matchAll(
                /\b(0[1-9]|1[0-2])\s*\/\s*(20\d{2})\b/g
            ),
        ]
            .map(
                (item) =>
                    item[1] +
                    "/" +
                    item[2]
            );

    const unicas =
        [
            ...new Set(
                encontradas
            ),
        ];

    return unicas.length === 1
        ? unicas[0]
        : "";
}

function contarOcorrencias(
    texto,
    marcador
) {
    if (
        !texto ||
        !marcador
    ) {
        return 0;
    }

    return Math.max(
        0,
        texto
            .split(
                marcador
            )
            .length -
        1
    );
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

function criarDadosTemporais({
    textoExtraido = "",
    competenciaDocumento = "",
} = {}) {
    const textoOriginal =
        String(
            textoExtraido ?? ""
        );

    const correspondenciaEmissao =
        /\bEMISS(?:ÃO|AO)\s*:?\s*(\d{2})\/(\d{2})\/(\d{4})\b/i
            .exec(
                textoOriginal
            );

    const correspondenciaHora =
        /\bHORAS?\s*:?\s*([0-2]\d:[0-5]\d(?::[0-5]\d)?)\b/i
            .exec(
                textoOriginal
            );

    const dataEmissao =
        correspondenciaEmissao
            ? (
                correspondenciaEmissao[1] +
                "/" +
                correspondenciaEmissao[2] +
                "/" +
                correspondenciaEmissao[3]
            )
            : "";

    const dataEmissaoIso =
        correspondenciaEmissao
            ? (
                correspondenciaEmissao[3] +
                "-" +
                correspondenciaEmissao[2] +
                "-" +
                correspondenciaEmissao[1]
            )
            : "";

    const competenciaMensal =
        normalizarCompetencia(
            competenciaDocumento
        );

    const validadeMensal =
        competenciaMensal
            ? `Mensal · ${competenciaMensal}`
            : "Mensal";

    return {
        dataEmissao,

        dataEmissaoIso,

        horaEmissao:
            correspondenciaHora?.[1] ||
            "",

        dataValidade:
            validadeMensal,

        dataValidadeIso:
            "",

        situacaoEmissao: {
            codigo:
                dataEmissao
                    ? "LOCALIZADA"
                    : "NAO_LOCALIZADA",

            rotulo:
                dataEmissao
                    ? "Localizada"
                    : "Não localizada",
        },

        situacaoValidade: {
            codigo:
                "MENSAL",

            rotulo:
                validadeMensal,

            diasRestantes:
                null,
        },
    };
}

export function avaliarFolhaPagamentoHolerites({
    textoExtraido,
    classificacao,
    documentoEsperado,
    empresaEsperada,
}) {
    const texto =
        normalizarTexto(
            textoExtraido
        );

    const marcadoresFolhaDiretos =
        [
            "FOLHA DE PAGAMENTO",
            "FOLHA MENSAL",
            "RESUMO DA FOLHA",
            "RESUMO DE FOLHA",
            "TOTAL DA FOLHA",
            "RELATORIO DE FOLHA",
        ];

    const indicadoresFolhaDiretos =
        marcadoresFolhaDiretos
            .filter(
                (marcador) =>
                    texto.includes(
                        marcador
                    )
            );

    const marcadoresConteudoFolha =
        [
            "PROVENTOS",
            "DESCONTOS",
            "BASE INSS",
            "BASE FGTS",
            "VALOR FGTS",
            "SALARIO",
            "LIQUIDO",
        ];

    const indicadoresConteudoFolha =
        marcadoresConteudoFolha
            .filter(
                (marcador) =>
                    texto.includes(
                        marcador
                    )
            );

    const extratoMensalLocalizado =
        texto.includes(
            "EXTRATO MENSAL"
        );

    /*
     * A variante é determinada pelo conteúdo do documento,
     * e não pelo nome do arquivo ou pelo CNPJ da empresa.
     *
     * Isso permite que empresas diferentes utilizem formatos
     * distintos sem criar uma regra codificada para cada empresa.
     */
    const varianteFolha =
        extratoMensalLocalizado
            ? "Extrato Mensal"
            : texto.includes(
                "FOLHA MENSAL"
            )
                ? "Folha Mensal"
                : texto.includes(
                    "FOLHA DE PAGAMENTO"
                )
                    ? "Folha de Pagamento"
                    : (
                        texto.includes(
                            "RESUMO DA FOLHA"
                        ) ||
                        texto.includes(
                            "RESUMO DE FOLHA"
                        )
                    )
                        ? "Resumo da Folha"
                        : texto.includes(
                            "TOTAL DA FOLHA"
                        )
                            ? "Total da Folha"
                            : texto.includes(
                                "RELATORIO DE FOLHA"
                            )
                                ? "Relatório de Folha"
                                : "";

    const indicadoresFolha =
        [
            ...new Set([
                ...indicadoresFolhaDiretos,
                ...(
                    extratoMensalLocalizado
                        ? [
                            "EXTRATO MENSAL",
                        ]
                        : []
                ),
                ...indicadoresConteudoFolha,
            ]),
        ];

    /*
     * Holerite / contracheque:
     * documento individual de remuneração.
     *
     * Ele pode acompanhar a folha, porém não é condição
     * para reconhecer o documento principal.
     */
    const marcadoresHolerite =
        [
            "HOLERITE",
            "CONTRACHEQUE",
            "RECIBO DE PAGAMENTO",
            "DEMONSTRATIVO DE PAGAMENTO",
        ];

    const indicadoresHolerite =
        marcadoresHolerite
            .filter(
                (marcador) =>
                    texto.includes(
                        marcador
                    )
            );

    /*
     * Comprovante de pagamento:
     * evidência financeira complementar.
     *
     * Não deve ser confundido com holerite e também não
     * substitui a Folha de Pagamento.
     */
    const marcadoresComprovantePagamento =
        [
            "COMPROVANTE DE PAGAMENTO DE SALARIO",
            "PAGAMENTO DE SALARIOS",
            "PAGAMENTO DE SALARIO",
        ];

    const indicadoresComprovantePagamento =
        marcadoresComprovantePagamento
            .filter(
                (marcador) =>
                    texto.includes(
                        marcador
                    )
            );

    const folhaLocalizada =
        indicadoresFolhaDiretos.length >
            0 ||
        (
            extratoMensalLocalizado &&
            indicadoresConteudoFolha.length >=
                2
        );

    const holeritesLocalizados =
        indicadoresHolerite.length >
        0;

    const comprovantesPagamentoLocalizados =
        indicadoresComprovantePagamento.length >
        0;

    const quantidadeHoleritesEstimada =
        Math.max(
            0,
            ...marcadoresHolerite.map(
                (marcador) =>
                    contarOcorrencias(
                        texto,
                        marcador
                    )
            )
        );

    const competenciaDocumento =
        extrairCompetenciaDocumento(
            textoExtraido
        );

    const competenciaEsperada =
        normalizarCompetencia(
            documentoEsperado
                ?.competenciaEsperada ||
            documentoEsperado
                ?.competencia ||
            ""
        );

    const competenciaConfere =
        competenciaDocumento &&
        competenciaEsperada
            ? (
                competenciaDocumento ===
                competenciaEsperada
            )
            : null;

    const cnpjEsperadoDigitos =
        somenteDigitos(
            empresaEsperada?.cnpj
        );

    const cnpjsEncontrados =
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
            );

    const possuiCnpjDocumento =
        cnpjsEncontrados.length >
        0;

    const cnpjConfere =
        cnpjEsperadoDigitos &&
        possuiCnpjDocumento
            ? cnpjsEncontrados
                .includes(
                    cnpjEsperadoDigitos
                )
            : null;

    const cnpjDocumentoDigitos =
        (
            cnpjConfere
                ? cnpjEsperadoDigitos
                : cnpjsEncontrados[0]
        ) ||
        "";

    const razaoSocialDocumento =
        extrairRazaoSocialDocumento(
            textoExtraido
        );

    /*
     * O documento principal deste item é a Folha de Pagamento.
     *
     * Holerites e comprovantes de pagamento são complementares
     * e não condicionam a identificação da folha.
     */
    const pacoteCompleto =
        folhaLocalizada;

    const divergenciaCnpj =
        cnpjConfere ===
        false;

    const divergenciaCompetencia =
        competenciaConfere ===
        false;

    let codigo;
    let nivel;
    let rotulo;
    let mensagem;

    if (
        divergenciaCnpj ||
        divergenciaCompetencia
    ) {
        codigo =
            "DIVERGENCIA_FOLHA_PAGAMENTO";

        nivel =
            "REPROVADA";

        rotulo =
            "Divergência objetiva localizada";

        mensagem =
            "A Folha de Pagamento possui dados incompatíveis com a empresa ou competência selecionada.";
    }
    else if (
        !folhaLocalizada
    ) {
        codigo =
            "EVIDENCIA_FOLHA_INSUFICIENTE";

        nivel =
            "INCONCLUSIVA";

        if (
            comprovantesPagamentoLocalizados
        ) {
            rotulo =
                "Comprovante localizado sem a folha";

            mensagem =
                "Foram encontrados comprovantes de pagamento salarial, mas eles não substituem a Folha de Pagamento da competência.";
        }
        else if (
            holeritesLocalizados
        ) {
            rotulo =
                "Holerites localizados sem a folha";

            mensagem =
                "Foram encontrados Holerites ou Contracheques, mas a Folha de Pagamento principal não foi identificada.";
        }
        else {
            rotulo =
                "Folha de Pagamento não identificada";

            mensagem =
                "O texto extraído não contém evidências suficientes para reconhecer a Folha de Pagamento da competência.";
        }
    }
    else {
        /*
         * Os nomes dos códigos abaixo são preservados temporariamente
         * por compatibilidade com o contrato existente.
         *
         * A regra funcional, entretanto, já é exclusivamente baseada
         * na localização da Folha de Pagamento.
         */
        codigo =
            (
                cnpjConfere === true &&
                (
                    competenciaConfere ===
                        true ||
                    competenciaConfere ===
                        null
                )
            )
                ? "FOLHA_HOLERITES_PRONTO_CONFERENCIA"
                : "FOLHA_HOLERITES_CONFERENCIA";

        nivel =
            "ALERTA";

        rotulo =
            "Folha localizada — conferência humana";

        mensagem =
            (
                varianteFolha
                    ? `${varianteFolha} reconhecido como Folha de Pagamento. `
                    : "Folha de Pagamento reconhecida. "
            ) +
            "CNPJ e competência foram pré-conferidos quando disponíveis. A conferência salarial e a decisão final permanecem humanas.";
    }

    const regras = [
        criarRegra(
            "PACOTE_FOLHA_HOLERITES",
            "Folha de Pagamento",
            folhaLocalizada
                ? "APROVADA"
                : "REPROVADA",
            folhaLocalizada
                ? (
                    varianteFolha
                        ? `${varianteFolha} reconhecido como documento principal da Folha de Pagamento.`
                        : "Folha de Pagamento reconhecida como documento principal."
                )
                : comprovantesPagamentoLocalizados
                    ? "Comprovantes salariais foram encontrados, mas não substituem a Folha de Pagamento."
                    : holeritesLocalizados
                        ? "Holerites foram encontrados, mas não substituem a Folha de Pagamento."
                        : "Folha de Pagamento não identificada automaticamente."
        ),

        criarRegra(
            "CNPJ_EMPRESA",
            "CNPJ da empresa",
            cnpjConfere ===
                true
                ? "APROVADA"
                : cnpjConfere ===
                    false
                    ? "REPROVADA"
                    : "ALERTA",
            cnpjConfere ===
                true
                ? "O CNPJ esperado foi localizado no documento."
                : cnpjConfere ===
                    false
                    ? "O CNPJ esperado não corresponde aos CNPJs localizados no documento."
                    : "Não foi possível confirmar automaticamente o CNPJ da empresa."
        ),

        criarRegra(
            "COMPETENCIA_MENSAL",
            "Competência mensal",
            competenciaConfere ===
                true
                ? "APROVADA"
                : competenciaConfere ===
                    false
                    ? "REPROVADA"
                    : "ALERTA",
            competenciaConfere ===
                true
                ? `Competência ${competenciaDocumento} compatível com a competência selecionada.`
                : competenciaConfere ===
                    false
                    ? `Competência localizada (${competenciaDocumento}) diverge da competência esperada (${competenciaEsperada}).`
                    : "A competência não pôde ser confirmada automaticamente."
        ),

        criarRegra(
            "CONFERENCIA_HUMANA_FOLHA",
            "Conferência humana",
            "ALERTA",
            "A quantidade de empregados, valores salariais, descontos, líquidos e efetivo pagamento devem permanecer sujeitos à conferência humana."
        ),
    ];

    return {
        aplicavel:
            true,

        documentoIncompativel:
            false,

        bloqueiaSubstituicao:
            false,

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
            "Folha de Pagamento e Comprovantes",

        documentoIdentificado:
            folhaLocalizada
                ? "Folha de Pagamento"
                : comprovantesPagamentoLocalizados
                    ? "Comprovantes de Pagamento Salarial"
                    : holeritesLocalizados
                        ? "Holerites / Contracheques"
                        : (
                            classificacao?.titulo ||
                            "Documento não identificado"
                        ),

        empresaEsperada:
            empresaEsperada?.nome ||
            "",

        cnpjEsperado:
            formatarCnpj(
                cnpjEsperadoDigitos
            ),

        razaoSocialDocumento,

        cnpjDocumento:
            formatarCnpj(
                cnpjDocumentoDigitos
            ),

        natureza: {
            codigo:
                "FOLHA_PAGAMENTO_HOLERITES",
            rotulo:
                "Folha de Pagamento e Comprovantes",
        },

        codigoControle:
            competenciaDocumento ||
            competenciaEsperada ||
            "",

        dadosTemporais:
            criarDadosTemporais({
                textoExtraido,
                competenciaDocumento,
            }),

        dadosFolhaPagamento: {
            folhaLocalizada,
            holeritesLocalizados,
            comprovantesPagamentoLocalizados,

            varianteFolha,

            quantidadeHoleritesEstimada,

            competencia:
                competenciaDocumento,

            competenciaEsperada,

            competenciaConfere,

            cnpj:
                formatarCnpj(
                    cnpjDocumentoDigitos
                ),

            cnpjEsperado:
                formatarCnpj(
                    cnpjEsperadoDigitos
                ),

            cnpjConfere,

            razaoSocial:
                razaoSocialDocumento,

            indicadoresFolha,

            indicadoresHolerite,

            pacoteCompleto,

            exigeConfirmacaoHumana:
                true,
        },

        regras,
    };
}