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

function normalizarEspacos(
    valor
) {
    return textoSeguro(
        valor
    ).replace(
        /\s+/g,
        " "
    );
}

function criarDataIso({
    dia,
    mes,
    ano,
}) {
    const diaNumero =
        Number(
            dia
        );

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
            diaNumero
        ) ||
        !Number.isInteger(
            mesNumero
        ) ||
        !Number.isInteger(
            anoNumero
        ) ||
        anoNumero < 2000 ||
        anoNumero > 2100 ||
        mesNumero < 1 ||
        mesNumero > 12 ||
        diaNumero < 1 ||
        diaNumero > 31
    ) {
        return "";
    }

    const data =
        new Date(
            Date.UTC(
                anoNumero,
                mesNumero - 1,
                diaNumero
            )
        );

    if (
        data.getUTCFullYear() !==
            anoNumero ||
        data.getUTCMonth() + 1 !==
            mesNumero ||
        data.getUTCDate() !==
            diaNumero
    ) {
        return "";
    }

    return (
        String(
            anoNumero
        ) +
        "-" +
        String(
            mesNumero
        ).padStart(
            2,
            "0"
        ) +
        "-" +
        String(
            diaNumero
        ).padStart(
            2,
            "0"
        )
    );
}

function converterDataTextoParaIso(
    valor
) {
    const correspondencia =
        /^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](20\d{2})$/
            .exec(
                textoSeguro(
                    valor
                )
            );

    if (!correspondencia) {
        return "";
    }

    return criarDataIso({
        dia:
            correspondencia[1],

        mes:
            correspondencia[2],

        ano:
            correspondencia[3],
    });
}

function formatarDataIso(
    valor
) {
    const correspondencia =
        /^(20\d{2})-(\d{2})-(\d{2})$/
            .exec(
                textoSeguro(
                    valor
                )
            );

    if (!correspondencia) {
        return "";
    }

    return (
        correspondencia[3] +
        "/" +
        correspondencia[2] +
        "/" +
        correspondencia[1]
    );
}

function obterDataReferenciaIso(
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
            data.getUTCFullYear()
        ) +
        "-" +
        String(
            data.getUTCMonth() + 1
        ).padStart(
            2,
            "0"
        ) +
        "-" +
        String(
            data.getUTCDate()
        ).padStart(
            2,
            "0"
        )
    );
}

function extrairDatasJanela(
    texto
) {
    const datas =
        texto.match(
            /\b\d{1,2}[\/.\-]\d{1,2}[\/.\-]20\d{2}\b/g
        ) || [];

    return datas
        .map(
            (data) => ({
                texto:
                    data,

                iso:
                    converterDataTextoParaIso(
                        data
                    ),
            })
        )
        .filter(
            (data) =>
                Boolean(
                    data.iso
                )
        );
}

function extrairVigenciaDocumento(
    texto
) {
    const conteudo =
        normalizarTextoDocumental(
            texto
        );

    const padroesIntervalo = [
        /VIGENCIA(?:\s+(?:DO|DA)\s+(?:SEGURO|APOLICE|CERTIFICADO))?\s*[:\-]?\s*(\d{1,2}[\/.\-]\d{1,2}[\/.\-]20\d{2})\s*(?:A|ATE|-)\s*(\d{1,2}[\/.\-]\d{1,2}[\/.\-]20\d{2})/,
        /PERIODO\s+DE\s+(?:VIGENCIA|COBERTURA|SEGURO)\s*[:\-]?\s*(\d{1,2}[\/.\-]\d{1,2}[\/.\-]20\d{2})\s*(?:A|ATE|-)\s*(\d{1,2}[\/.\-]\d{1,2}[\/.\-]20\d{2})/,
        /COBERTURA\s+(?:DE|ENTRE)\s*(\d{1,2}[\/.\-]\d{1,2}[\/.\-]20\d{2})\s*(?:A|ATE|-)\s*(\d{1,2}[\/.\-]\d{1,2}[\/.\-]20\d{2})/,
    ];

    for (
        const padrao of
        padroesIntervalo
    ) {
        const correspondencia =
            conteudo.match(
                padrao
            );

        if (!correspondencia) {
            continue;
        }

        const inicioIso =
            converterDataTextoParaIso(
                correspondencia[1]
            );

        const fimIso =
            converterDataTextoParaIso(
                correspondencia[2]
            );

        if (
            inicioIso &&
            fimIso &&
            inicioIso <=
                fimIso
        ) {
            return {
                inicioIso,
                fimIso,
                inicio:
                    formatarDataIso(
                        inicioIso
                    ),
                fim:
                    formatarDataIso(
                        fimIso
                    ),
            };
        }
    }

    /*
     * Algumas apólices possuem texto intermediário entre as duas
     * datas ("a partir das 24 horas...", "até às 24 horas...").
     * Nesses casos procuramos as duas primeiras datas dentro de
     * uma janela curta iniciada no marcador documental.
     */
    const marcadores = [
        "VIGENCIA",
        "PERIODO DE VIGENCIA",
        "PERIODO DE COBERTURA",
        "PERIODO DO SEGURO",
    ];

    for (
        const marcador of
        marcadores
    ) {
        const indice =
            conteudo.indexOf(
                marcador
            );

        if (indice < 0) {
            continue;
        }

        const janela =
            conteudo.slice(
                indice,
                indice + 420
            );

        const datas =
            extrairDatasJanela(
                janela
            );

        if (
            datas.length >=
            2 &&
            datas[0].iso <=
                datas[1].iso
        ) {
            return {
                inicioIso:
                    datas[0].iso,

                fimIso:
                    datas[1].iso,

                inicio:
                    formatarDataIso(
                        datas[0].iso
                    ),

                fim:
                    formatarDataIso(
                        datas[1].iso
                    ),
            };
        }
    }

    const padroesInicio = [
        /INICIO\s+(?:DA|DE)\s+VIGENCIA\s*[:\-]?\s*(\d{1,2}[\/.\-]\d{1,2}[\/.\-]20\d{2})/,
        /VIGENCIA\s+INICIAL\s*[:\-]?\s*(\d{1,2}[\/.\-]\d{1,2}[\/.\-]20\d{2})/,
        /INICIO\s+DA\s+COBERTURA\s*[:\-]?\s*(\d{1,2}[\/.\-]\d{1,2}[\/.\-]20\d{2})/,
    ];

    const padroesFim = [
        /FIM\s+(?:DA|DE)\s+VIGENCIA\s*[:\-]?\s*(\d{1,2}[\/.\-]\d{1,2}[\/.\-]20\d{2})/,
        /TERMINO\s+(?:DA|DE)\s+VIGENCIA\s*[:\-]?\s*(\d{1,2}[\/.\-]\d{1,2}[\/.\-]20\d{2})/,
        /VIGENCIA\s+FINAL\s*[:\-]?\s*(\d{1,2}[\/.\-]\d{1,2}[\/.\-]20\d{2})/,
        /FIM\s+DA\s+COBERTURA\s*[:\-]?\s*(\d{1,2}[\/.\-]\d{1,2}[\/.\-]20\d{2})/,
        /VALIDADE\s+ATE\s*[:\-]?\s*(\d{1,2}[\/.\-]\d{1,2}[\/.\-]20\d{2})/,
    ];

    let inicioIso =
        "";

    let fimIso =
        "";

    for (
        const padrao of
        padroesInicio
    ) {
        const correspondencia =
            conteudo.match(
                padrao
            );

        if (correspondencia) {
            inicioIso =
                converterDataTextoParaIso(
                    correspondencia[1]
                );

            break;
        }
    }

    for (
        const padrao of
        padroesFim
    ) {
        const correspondencia =
            conteudo.match(
                padrao
            );

        if (correspondencia) {
            fimIso =
                converterDataTextoParaIso(
                    correspondencia[1]
                );

            break;
        }
    }

    if (
        inicioIso &&
        fimIso &&
        inicioIso >
            fimIso
    ) {
        return {
            inicioIso:
                "",

            fimIso:
                "",

            inicio:
                "",

            fim:
                "",
        };
    }

    return {
        inicioIso,

        fimIso,

        inicio:
            formatarDataIso(
                inicioIso
            ),

        fim:
            formatarDataIso(
                fimIso
            ),
    };
}

function avaliarEstruturaSeguroVida(
    texto
) {
    const conteudo =
        normalizarTextoDocumental(
            texto
        );

    const marcadoresFortes = [
        "SEGURO DE VIDA",
        "SEGURO VIDA",
        "VIDA EM GRUPO",
        "SEGURO DE VIDA EM GRUPO",
        "SEGURO COLETIVO DE PESSOAS",
        "SEGURO DE PESSOAS COLETIVO",
        "CERTIFICADO INDIVIDUAL DE SEGURO",
    ];

    const marcadoresApoio = [
        "APOLICE",
        "SEGURADORA",
        "ESTIPULANTE",
        "SUBESTIPULANTE",
        "VIGENCIA",
        "CAPITAL SEGURADO",
        "COBERTURA",
        "COBERTURAS",
        "CERTIFICADO",
        "PREMIO",
        "SEGURADO",
    ];

    const evidenciasFortes =
        marcadoresFortes.filter(
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

    const reconhecido =
        Boolean(
            evidenciasFortes.length >
                0 &&
            evidenciasApoio.length >
                0
        );

    let natureza =
        "SEGURO_VIDA";

    let naturezaRotulo =
        "Seguro de Vida";

    if (
        conteudo.includes(
            "CERTIFICADO INDIVIDUAL DE SEGURO"
        )
    ) {
        natureza =
            "CERTIFICADO_INDIVIDUAL";

        naturezaRotulo =
            "Certificado Individual de Seguro de Vida";
    }
    else if (
        conteudo.includes(
            "VIDA EM GRUPO"
        ) ||
        conteudo.includes(
            "SEGURO COLETIVO DE PESSOAS"
        ) ||
        conteudo.includes(
            "SEGURO DE PESSOAS COLETIVO"
        )
    ) {
        natureza =
            "SEGURO_VIDA_GRUPO";

        naturezaRotulo =
            "Seguro de Vida em Grupo";
    }

    return {
        reconhecido,
        natureza,
        naturezaRotulo,
        evidenciasFortes,
        evidenciasApoio,
    };
}

function extrairNumeroApolice(
    texto
) {
    const conteudo =
        normalizarTextoDocumental(
            texto
        );

    /*
     * Priorizar formatos explícitos antes do formato genérico.
     *
     * Exemplos aceitos:
     * - NÚMERO DA APÓLICE: 123456
     * - APÓLICE NÚMERO: 123456
     * - APÓLICE Nº 123456
     * - APÓLICE N° 123456
     * - APÓLICE N. 123456
     * - APÓLICE NO 123456
     * - APÓLICE NRO 123456
     * - APÓLICE: 123456
     * - APÓLICE 123456
     *
     * O identificador precisa conter pelo menos um dígito.
     * Isso evita capturar palavras de títulos como
     * "APÓLICE DE SEGURO DE VIDA".
     */
    const identificador =
        "([A-Z0-9./\\-]*\\d[A-Z0-9./\\-]*)";

    const padroes = [
        new RegExp(
            (
                "NUMERO\\s+DA\\s+APOLICE" +
                "\\s*[:\\-]?\\s*" +
                identificador
            )
        ),

        new RegExp(
            (
                "APOLICE\\s+NUMERO" +
                "\\s*[:\\-]?\\s*" +
                identificador
            )
        ),

        new RegExp(
            (
                "APOLICE\\s+" +
                "N(?:[.]?[º°]|[.]|O|RO[.]?)?" +
                "\\s*[:\\-]?\\s*" +
                identificador
            )
        ),

        new RegExp(
            (
                "APOLICE\\s*[:\\-]\\s*" +
                identificador
            )
        ),

        new RegExp(
            (
                "APOLICE\\s+" +
                identificador
            )
        ),
    ];

    for (
        const padrao of
        padroes
    ) {
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
            candidato.length <=
                41 &&
            /\d/.test(
                candidato
            )
        ) {
            return candidato;
        }
    }

    return "";
}
function extrairCampoDocumental({
    texto,
    marcadores,
}) {
    const conteudo =
        normalizarEspacos(
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
                    "(.{3,180}?)" +
                    "(?=\\s+(?:CNPJ|CPF|AP[ÓO]LICE|VIG[EÊ]NCIA|SEGURADORA|ESTIPULANTE|SUBESTIPULANTE|SEGURADO|COBERTURA|CAPITAL|ENDERE[CÇ]O)\\b|$)"
                ),
                "i"
            );

        const correspondencia =
            conteudo.match(
                padrao
            );

        const valor =
            normalizarEspacos(
                correspondencia?.[1]
            );

        if (valor) {
            return valor;
        }
    }

    return "";
}

function extrairSeguradora(
    texto
) {
    return extrairCampoDocumental({
        texto,

        marcadores: [
            "SEGURADORA",
            "COMPANHIA SEGURADORA",
        ],
    });
}

function extrairEstipulante(
    texto
) {
    return extrairCampoDocumental({
        texto,

        marcadores: [
            "SUBESTIPULANTE",
            "ESTIPULANTE",
            "CONTRATANTE",
        ],
    });
}

function criarDadosTemporais({
    vigenciaInicio,
    vigenciaInicioIso,
    vigenciaFim,
    vigenciaFimIso,
    dataReferenciaIso,
}) {
    const vencida =
        Boolean(
            vigenciaFimIso &&
            dataReferenciaIso &&
            dataReferenciaIso >
                vigenciaFimIso
        );

    const futura =
        Boolean(
            vigenciaInicioIso &&
            dataReferenciaIso &&
            dataReferenciaIso <
                vigenciaInicioIso
        );

    let codigoValidade =
        "NAO_IDENTIFICADA";

    let rotuloValidade =
        "Vigência não identificada";

    if (vencida) {
        codigoValidade =
            "VENCIDA";

        rotuloValidade =
            "Vencida";
    }
    else if (futura) {
        codigoValidade =
            "FUTURA";

        rotuloValidade =
            "Ainda não vigente";
    }
    else if (vigenciaFimIso) {
        codigoValidade =
            "VIGENTE";

        rotuloValidade =
            "Vigente";
    }

    return {
        /*
         * Início da vigência não é data de emissão.
         * Não preencher emissão artificialmente.
         */
        dataEmissao:
            "",

        dataEmissaoIso:
            "",

        horaEmissao:
            "",

        dataValidade:
            vigenciaFim,

        dataValidadeIso:
            vigenciaFimIso,

        situacaoEmissao: {
            codigo:
                "NAO_IDENTIFICADA",

            rotulo:
                "Não identificada",
        },

        situacaoValidade: {
            codigo:
                codigoValidade,

            rotulo:
                rotuloValidade,

            vencida,

            futura,

            diasRestantes:
                null,

            vigenciaInicio,

            vigenciaInicioIso,
        },
    };
}

export function avaliarSeguroVida({
    textoExtraido,
    classificacao = null,
    documentoEsperado = null,
    empresaEsperada = null,
    dataReferencia = new Date(),
} = {}) {
    const estrutura =
        avaliarEstruturaSeguroVida(
            textoExtraido
        );

    const vigencia =
        extrairVigenciaDocumento(
            textoExtraido
        );

    const dataReferenciaIso =
        obterDataReferenciaIso(
            dataReferencia
        );

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

    const cnpjDocumento =
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

    const vigenciaNaoIdentificada =
        Boolean(
            estrutura.reconhecido &&
            !vigencia.fimIso
        );

    const documentoFuturo =
        Boolean(
            estrutura.reconhecido &&
            vigencia.inicioIso &&
            dataReferenciaIso &&
            dataReferenciaIso <
                vigencia.inicioIso
        );

    const documentoVencido =
        Boolean(
            estrutura.reconhecido &&
            vigencia.fimIso &&
            dataReferenciaIso &&
            dataReferenciaIso >
                vigencia.fimIso
        );

    const divergenciaCnpj =
        Boolean(
            estrutura.reconhecido &&
            cnpjConfere ===
                false
        );

    const bloqueiaSubstituicao =
        Boolean(
            documentoIncompativel ||
            vigenciaNaoIdentificada ||
            documentoFuturo ||
            documentoVencido ||
            divergenciaCnpj
        );

    let codigo =
        "SEGURO_VIDA_IDENTIFICADO";

    if (documentoIncompativel) {
        codigo =
            "ARQUIVO_INCOMPATIVEL";
    }
    else if (divergenciaCnpj) {
        codigo =
            "DIVERGENCIA_CNPJ";
    }
    else if (vigenciaNaoIdentificada) {
        codigo =
            "VIGENCIA_DOCUMENTAL_NAO_IDENTIFICADA";
    }
    else if (documentoFuturo) {
        codigo =
            "DOCUMENTO_FORA_VIGENCIA";
    }
    else if (documentoVencido) {
        codigo =
            "DOCUMENTO_VENCIDO";
    }

    let nivel =
        "APROVADA";

    if (bloqueiaSubstituicao) {
        nivel =
            "REPROVADA";
    }
    else if (
        cnpjConfere ===
        null
    ) {
        nivel =
            "ATENCAO";
    }

    let rotulo =
        "Seguro de Vida identificado";

    let mensagem =
        (
            estrutura.naturezaRotulo +
            " identificado"
        );

    if (
        vigencia.inicio &&
        vigencia.fim
    ) {
        mensagem +=
            (
                ", com vigência de " +
                vigencia.inicio +
                " a " +
                vigencia.fim +
                "."
            );
    }
    else if (vigencia.fim) {
        mensagem +=
            (
                ", válido até " +
                vigencia.fim +
                "."
            );
    }
    else {
        mensagem +=
            ".";
    }

    if (documentoIncompativel) {
        rotulo =
            "Arquivo incompatível";

        mensagem =
            "O conteúdo não apresenta estrutura documental suficiente de Seguro de Vida.";
    }
    else if (divergenciaCnpj) {
        rotulo =
            "Empresa divergente";

        mensagem =
            "O Seguro de Vida foi reconhecido, porém o CNPJ localizado não está vinculado à empresa selecionada.";
    }
    else if (vigenciaNaoIdentificada) {
        rotulo =
            "Vigência não identificada";

        mensagem =
            "O Seguro de Vida foi reconhecido, mas não foi possível identificar com segurança a data final de vigência.";
    }
    else if (documentoFuturo) {
        rotulo =
            "Seguro ainda não vigente";

        mensagem =
            (
                "A cobertura inicia em " +
                vigencia.inicio +
                " e ainda não atende à data de referência selecionada."
            );
    }
    else if (documentoVencido) {
        rotulo =
            "Seguro vencido";

        mensagem =
            (
                "A vigência do Seguro de Vida terminou em " +
                vigencia.fim +
                " e não atende à data de referência selecionada."
            );
    }
    else if (
        cnpjConfere ===
        null
    ) {
        rotulo =
            "Seguro identificado · conferir empresa";

        mensagem +=
            " O PDF não apresentou CNPJ confirmável; a vinculação da empresa deverá ser conferida manualmente.";
    }

    const numeroApolice =
        extrairNumeroApolice(
            textoExtraido
        );

    const seguradora =
        extrairSeguradora(
            textoExtraido
        );

    const estipulante =
        extrairEstipulante(
            textoExtraido
        );

    const razaoSocialDocumento =
        estipulante ||
        extrairRazaoSocialDocumento(
            textoExtraido
        );

    const dadosTemporais =
        criarDadosTemporais({
            vigenciaInicio:
                vigencia.inicio,

            vigenciaInicioIso:
                vigencia.inicioIso,

            vigenciaFim:
                vigencia.fim,

            vigenciaFimIso:
                vigencia.fimIso,

            dataReferenciaIso,
        });

    const regras = [
        {
            codigo:
                "TIPO_DOCUMENTAL",

            titulo:
                "Seguro de Vida",

            status:
                estrutura.reconhecido
                    ? "APROVADA"
                    : "REPROVADA",

            mensagem:
                estrutura.reconhecido
                    ? (
                        estrutura.naturezaRotulo +
                        " reconhecido pela estrutura documental."
                    )
                    : "Não foram identificados elementos suficientes de Seguro de Vida.",
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
                    : cnpjConfere ===
                        false
                        ? "REPROVADA"
                        : "ATENCAO",

            mensagem:
                cnpjConfere ===
                    true
                    ? (
                        "CNPJ " +
                        cnpjDocumento +
                        " está vinculado à empresa selecionada."
                    )
                    : cnpjConfere ===
                        false
                        ? "O CNPJ encontrado não está vinculado à empresa selecionada."
                        : "Nenhum CNPJ confirmável foi localizado; conferir manualmente o estipulante/empresa.",
        },
        {
            codigo:
                "VALIDADE_DOCUMENTO",

            titulo:
                "Vigência do seguro",

            status:
                vigenciaNaoIdentificada ||
                documentoFuturo ||
                documentoVencido
                    ? "REPROVADA"
                    : "APROVADA",

            mensagem:
                vigenciaNaoIdentificada
                    ? "Data final de vigência não localizada."
                    : documentoFuturo
                        ? (
                            "Cobertura inicia em " +
                            vigencia.inicio +
                            "."
                        )
                        : documentoVencido
                            ? (
                                "Cobertura encerrada em " +
                                vigencia.fim +
                                "."
                            )
                            : (
                                (
                                    vigencia.inicio
                                        ? (
                                            "Cobertura de " +
                                            vigencia.inicio +
                                            " a "
                                        )
                                        : "Cobertura válida até "
                                ) +
                                vigencia.fim +
                                "."
                            ),
        },
        {
            codigo:
                "APOLICE_SEGURO",

            titulo:
                "Apólice / certificado",

            status:
                numeroApolice
                    ? "APROVADA"
                    : "ATENCAO",

            mensagem:
                numeroApolice
                    ? (
                        "Identificador localizado: " +
                        numeroApolice +
                        "."
                    )
                    : "Número da apólice/certificado não localizado automaticamente; conferir no documento.",
        },
    ];

    return {
        aplicavel:
            estrutura.reconhecido,

        classificacao,

        documentoEsperado:
            documentoEsperado
                ?.titulo ||
            "Seguro de Vida",

        documentoIdentificado:
            estrutura.reconhecido
                ? estrutura.naturezaRotulo
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
            numeroApolice,

        empresaEsperada:
            textoSeguro(
                empresaEsperada?.nome
            ),

        razaoSocialDocumento,

        cnpjDocumento,

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

        cnpjConfere,

        natureza: {
            codigo:
                estrutura.natureza,

            rotulo:
                estrutura.naturezaRotulo,
        },

        dadosTemporais,

        dadosSeguroVida: {
            numeroApolice,

            seguradora,

            estipulante,

            vigenciaInicio:
                vigencia.inicio,

            vigenciaInicioIso:
                vigencia.inicioIso,

            vigenciaFim:
                vigencia.fim,

            vigenciaFimIso:
                vigencia.fimIso,

            dataReferenciaIso,

            cnpjEsperado,

            cnpjDocumento,

            cnpjConfere,

            evidenciasFortes:
                estrutura.evidenciasFortes,

            evidenciasApoio:
                estrutura.evidenciasApoio,
        },

        regras,

        statusGeral:
            bloqueiaSubstituicao
                ? "REPROVADO"
                : "CONFERENCIA_MANUAL",
    };
}