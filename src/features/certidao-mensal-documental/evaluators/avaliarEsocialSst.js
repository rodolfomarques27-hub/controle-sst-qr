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

function normalizarDataDocumento(
    valor
) {
    const texto =
        textoSeguro(
            valor
        );

    let correspondencia =
        texto.match(
            /\b(0?[1-9]|[12]\d|3[01])[/.:-](0?[1-9]|1[0-2])[/.:-](20\d{2})\b/
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

    correspondencia =
        texto.match(
            /\b(20\d{2})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])\b/
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

function competenciaDeDataDocumento(
    valor
) {
    const data =
        normalizarDataDocumento(
            valor
        );

    const correspondencia =
        /^(\d{2})\/(\d{2})\/(20\d{2})$/
            .exec(
                data
            );

    if (!correspondencia) {
        return "";
    }

    return (
        correspondencia[2] +
        "/" +
        correspondencia[3]
    );
}

function extrairCompetenciaDeclarada(
    texto
) {
    const conteudo =
        normalizarBusca(
            texto
        );

    const padroes = [
        /COMPETENCIA\s*[:\-]?\s*(0?[1-9]|1[0-2])\s*[/.:-]\s*(20\d{2})/,
        /MES\s+DE\s+REFERENCIA\s*[:\-]?\s*(0?[1-9]|1[0-2])\s*[/.:-]\s*(20\d{2})/,
        /REFERENCIA\s*[:\-]?\s*(0?[1-9]|1[0-2])\s*[/.:-]\s*(20\d{2})/,
        /MES\s*\/\s*ANO\s*[:\-]?\s*(0?[1-9]|1[0-2])\s*[/.:-]\s*(20\d{2})/,
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
                    "\\s*[:=\\-]?\\s*" +
                    "(" +
                    "(?:0?[1-9]|[12]\\d|3[01])" +
                    "[/.:-]" +
                    "(?:0?[1-9]|1[0-2])" +
                    "[/.:-]" +
                    "20\\d{2}" +
                    "|" +
                    "20\\d{2}" +
                    "-" +
                    "(?:0[1-9]|1[0-2])" +
                    "-" +
                    "(?:0[1-9]|[12]\\d|3[01])" +
                    ")"
                )
            );

        const correspondencia =
            conteudo.match(
                padrao
            );

        const data =
            normalizarDataDocumento(
                correspondencia?.[1]
            );

        if (data) {
            return data;
        }
    }

    return "";
}

function extrairIdentificadores({
    texto,
    marcadores,
}) {
    const conteudo =
        normalizarBusca(
            texto
        );

    const encontrados =
        new Set();

    for (
        const marcador of
        marcadores
    ) {
        const padrao =
            new RegExp(
                (
                    marcador +
                    "\\s*[:=\\-]?\\s*" +
                    "([A-Z0-9][A-Z0-9./\\-]{4,100})"
                ),
                "g"
            );

        for (
            const correspondencia of
            conteudo.matchAll(
                padrao
            )
        ) {
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
                encontrados.add(
                    candidato
                );
            }
        }
    }

    return [
        ...encontrados,
    ];
}

function extrairRazaoSocialDocumento(
    texto
) {
    const conteudo =
        normalizarBusca(
            texto
        );

    const padroes = [
        /NOME\s+EMPRESARIAL\s*[:\-]\s*(.{3,120}?)(?=\s+(?:CNPJ|EVENTO|ESOCIAL|RECIBO|PROTOCOLO|CPF|MATRICULA|DATA)\b|$)/,
        /RAZAO\s+SOCIAL\s*[:\-]\s*(.{3,120}?)(?=\s+(?:CNPJ|EVENTO|ESOCIAL|RECIBO|PROTOCOLO|CPF|MATRICULA|DATA)\b|$)/,
        /EMPREGADOR\s*[:\-]\s*(.{3,120}?)(?=\s+(?:CNPJ|EVENTO|ESOCIAL|RECIBO|PROTOCOLO|CPF|MATRICULA|DATA)\b|$)/,
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

function normalizarDataIsoVinculo(
    valor
) {
    const correspondencia =
        /^(\d{4})-(\d{2})-(\d{2})/
            .exec(
                textoSeguro(
                    valor
                )
            );

    if (!correspondencia) {
        return "";
    }

    const dataIso =
        (
            correspondencia[1] +
            "-" +
            correspondencia[2] +
            "-" +
            correspondencia[3]
        );

    const data =
        new Date(
            dataIso +
            "T00:00:00Z"
        );

    if (
        Number.isNaN(
            data.getTime()
        ) ||
        data
            .toISOString()
            .slice(
                0,
                10
            ) !==
            dataIso
    ) {
        return "";
    }

    return dataIso;
}

function obterIntervaloCompetencia(
    valor
) {
    const correspondencia =
        /^(0[1-9]|1[0-2])\/(20\d{2})$/
            .exec(
                textoSeguro(
                    valor
                )
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

    const mesTexto =
        String(
            mes
        ).padStart(
            2,
            "0"
        );

    const ultimoDia =
        new Date(
            Date.UTC(
                ano,
                mes,
                0
            )
        ).getUTCDate();

    return {
        inicio:
            (
                String(
                    ano
                ) +
                "-" +
                mesTexto +
                "-01"
            ),

        fim:
            (
                String(
                    ano
                ) +
                "-" +
                mesTexto +
                "-" +
                String(
                    ultimoDia
                ).padStart(
                    2,
                    "0"
                )
            ),
    };
}

function avaliarVigenciaCnpjVinculado({
    vinculo,
    competencia,
}) {
    const resultadoBase = {
        historico:
            false,

        semVigencia:
            false,

        foraVigencia:
            false,

        vigenciaInicio:
            "",

        vigenciaFim:
            "",
    };

    if (
        !vinculo ||
        vinculo?.principal
    ) {
        return resultadoBase;
    }

    const situacao =
        normalizarBusca(
            vinculo?.situacao
        );

    if (
        situacao !==
        "HISTORICO"
    ) {
        return resultadoBase;
    }

    const intervaloCompetencia =
        obterIntervaloCompetencia(
            competencia
        );

    if (!intervaloCompetencia) {
        return {
            ...resultadoBase,
            historico:
                true,
        };
    }

    const vigenciaInicio =
        normalizarDataIsoVinculo(
            vinculo?.vigencia_inicio ||
            vinculo?.vigenciaInicio
        );

    const vigenciaFim =
        normalizarDataIsoVinculo(
            vinculo?.vigencia_fim ||
            vinculo?.vigenciaFim
        );

    if (
        !vigenciaInicio ||
        !vigenciaFim ||
        vigenciaInicio >
            vigenciaFim
    ) {
        return {
            ...resultadoBase,

            historico:
                true,

            semVigencia:
                true,

            vigenciaInicio,

            vigenciaFim,
        };
    }

    const sobrepoeCompetencia =
        (
            vigenciaInicio <=
                intervaloCompetencia.fim &&
            vigenciaFim >=
                intervaloCompetencia.inicio
        );

    return {
        ...resultadoBase,

        historico:
            true,

        foraVigencia:
            !sobrepoeCompetencia,

        vigenciaInicio,

        vigenciaFim,
    };
}

const DEFINICOES_EVENTOS =
    Object.freeze([
        Object.freeze({
            codigo:
                "S-2210",
            titulo:
                "Comunicação de Acidente de Trabalho",
            identificadores: [
                /\bS[\s-]*2210\b/,
                /\bEVTCAT\b/,
                /COMUNICACAO\s+DE\s+ACIDENTE\s+DE\s+TRABALHO/,
            ],
            marcadoresData: [
                "DATA\\s+DO\\s+ACIDENTE",
                "DATA\\s+ACIDENTE",
                "DTACID",
            ],
        }),
        Object.freeze({
            codigo:
                "S-2220",
            titulo:
                "Monitoramento da Saúde do Trabalhador",
            identificadores: [
                /\bS[\s-]*2220\b/,
                /\bEVTMONIT\b/,
                /MONITORAMENTO\s+DA\s+SAUDE\s+DO\s+TRABALHADOR/,
            ],
            marcadoresData: [
                "DATA\\s+DO\\s+ASO",
                "DATA\\s+ASO",
                "DATA\\s+DO\\s+EXAME",
                "DTASO",
            ],
        }),
        Object.freeze({
            codigo:
                "S-2240",
            titulo:
                "Condições Ambientais do Trabalho",
            identificadores: [
                /\bS[\s-]*2240\b/,
                /\bEVTEXPRISCO\b/,
                /CONDICOES\s+AMBIENTAIS\s+DO\s+TRABALHO/,
            ],
            marcadoresData: [
                "DATA\\s+DE\\s+INICIO\\s+DA\\s+CONDICAO",
                "INICIO\\s+DA\\s+CONDICAO",
                "DTINICONDICAO",
                "DATA\\s+DE\\s+INICIO",
            ],
        }),
    ]);

function identificarEventos(
    texto
) {
    const conteudo =
        normalizarBusca(
            texto
        );

    return DEFINICOES_EVENTOS
        .filter(
            (definicao) =>
                definicao
                    .identificadores
                    .some(
                        (padrao) =>
                            padrao.test(
                                conteudo
                            )
                    )
        )
        .map(
            (definicao) => {
                const dataEvento =
                    extrairDataPorMarcadores({
                        texto,
                        marcadores:
                            definicao
                                .marcadoresData,
                    });

                return {
                    codigo:
                        definicao.codigo,
                    titulo:
                        definicao.titulo,
                    dataEvento,
                    competencia:
                        competenciaDeDataDocumento(
                            dataEvento
                        ),
                };
            }
        );
}

function identificarEstrutura(
    texto
) {
    const conteudo =
        normalizarBusca(
            texto
        );

    const eventos =
        identificarEventos(
            texto
        );

    const numerosRecibo =
        extrairIdentificadores({
            texto,
            marcadores: [
                "NUMERO\\s+DO\\s+RECIBO",
                "N\\.?\\s+DO\\s+RECIBO",
                "NRRECIBO",
            ],
        });

    const idsEvento =
        extrairIdentificadores({
            texto,
            marcadores: [
                "ID\\s+DO\\s+EVENTO",
                "IDENTIFICADOR\\s+DO\\s+EVENTO",
                "IDEVENTO",
            ],
        });

    const protocolos =
        extrairIdentificadores({
            texto,
            marcadores: [
                "NUMERO\\s+DO\\s+PROTOCOLO",
                "PROTOCOLO",
            ],
        });

    const possuiComprovacaoRecepcao =
        Boolean(
            numerosRecibo.length >
                0 ||
            idsEvento.length >
                0 ||
            protocolos.length >
                0 ||
            (
                conteudo.includes(
                    "ESOCIAL"
                ) &&
                (
                    conteudo.includes(
                        "RECIBO DO EVENTO"
                    ) ||
                    conteudo.includes(
                        "RECIBO DE ENTREGA"
                    )
                )
            )
        );

    const reconhecido =
        Boolean(
            eventos.length >
                0 &&
            possuiComprovacaoRecepcao
        );

    return {
        reconhecido,
        eventos,
        numerosRecibo,
        idsEvento,
        protocolos,
        possuiComprovacaoRecepcao,
    };
}

function resolverCompetenciaDocumento({
    texto,
    eventos,
}) {
    const competenciaDeclarada =
        extrairCompetenciaDeclarada(
            texto
        );

    if (competenciaDeclarada) {
        return {
            competencia:
                competenciaDeclarada,
            origem:
                "COMPETENCIA_DECLARADA",
            ambigua:
                false,
            competenciasEventos: [
                ...new Set(
                    eventos
                        .map(
                            (evento) =>
                                evento
                                    .competencia
                        )
                        .filter(
                            Boolean
                        )
                ),
            ],
        };
    }

    const competenciasEventos =
        [
            ...new Set(
                eventos
                    .map(
                        (evento) =>
                            evento.competencia
                    )
                    .filter(
                        Boolean
                    )
            ),
        ];

    if (
        competenciasEventos.length ===
        1
    ) {
        return {
            competencia:
                competenciasEventos[0],
            origem:
                "DATA_EVENTO",
            ambigua:
                false,
            competenciasEventos,
        };
    }

    return {
        competencia:
            "",
        origem:
            "",
        ambigua:
            competenciasEventos.length >
                1,
        competenciasEventos,
    };
}

function criarDadosTemporais({
    competencia,
    dataRecepcao,
}) {
    return {
        dataEmissao:
            dataRecepcao ||
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
                dataRecepcao
                    ? "LOCALIZADA"
                    : "NAO_IDENTIFICADA",
            rotulo:
                dataRecepcao
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

export function avaliarEsocialSst({
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

    const resolucaoCompetencia =
        resolverCompetenciaDocumento({
            texto:
                textoExtraido,
            eventos:
                estrutura.eventos,
        });

    const competenciaDocumento =
        resolucaoCompetencia
            .competencia;

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

    const vigenciaCnpjVinculado =
        avaliarVigenciaCnpjVinculado({
            vinculo:
                cnpjVinculoEncontrado,

            competencia:
                competenciaDocumento,
        });

    const cnpjVinculadoSemVigencia =
        Boolean(
            vigenciaCnpjVinculado
                .semVigencia
        );

    const cnpjVinculadoForaVigencia =
        Boolean(
            vigenciaCnpjVinculado
                .foraVigencia
        );

    const divergenciaCnpj =
        Boolean(
            cnpjConfere ===
            false
        );

    const competenciaAusente =
        Boolean(
            estrutura.reconhecido &&
            !competenciaDocumento &&
            !resolucaoCompetencia
                .ambigua
        );

    const competenciaAmbigua =
        Boolean(
            estrutura.reconhecido &&
            resolucaoCompetencia
                .ambigua
        );

    const documentoIncompativel =
        Boolean(
            !estrutura.reconhecido ||
            divergenciaCnpj
        );

    const bloqueiaSubstituicao =
        Boolean(
            documentoIncompativel ||
            cnpjVinculadoSemVigencia ||
            cnpjVinculadoForaVigencia ||
            competenciaAusente ||
            competenciaAmbigua
        );

    const dataRecepcao =
        extrairDataPorMarcadores({
            texto:
                textoExtraido,
            marcadores: [
                "DATA\\s+DA\\s+RECEPCAO",
                "DATA\\s+DE\\s+RECEPCAO",
                "DATA\\s+DE\\s+TRANSMISSAO",
                "DATA\\s+DO\\s+ENVIO",
                "DATA\\s+DE\\s+ENVIO",
                "RECEBIDO\\s+EM",
            ],
        });

    const codigosEventos =
        estrutura.eventos.map(
            (evento) =>
                evento.codigo
        );

    const cobertura =
        codigosEventos.join(
            " + "
        );

    let codigo =
        "ESOCIAL_SST_IDENTIFICADO";

    let nivel =
        "ATENCAO";

    let rotulo =
        "eSocial SST identificado";

    let mensagem =
        "Recibo de evento SST do eSocial reconhecido. A aplicabilidade e o conteúdo do evento devem ser conferidos manualmente.";

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
            estrutura.eventos.length >
                0 &&
            !estrutura
                .possuiComprovacaoRecepcao
        ) {
            mensagem =
                "Há referência a evento SST do eSocial, porém não foi localizada estrutura suficiente de recibo, protocolo ou identificação de recepção do evento.";
        }
        else {
            mensagem =
                "O arquivo não apresenta estrutura suficiente de recibo dos eventos S-2210, S-2220 ou S-2240.";
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
        cnpjVinculadoSemVigencia
    ) {
        codigo =
            "CNPJ_VINCULADO_SEM_VIGENCIA";

        nivel =
            "BLOQUEIO";

        rotulo =
            "Vigência do CNPJ não definida";

        mensagem =
            (
                "O CNPJ localizado pertence ao histórico da empresa, " +
                "mas não possui período de vigência completo para validar " +
                "a competência " +
                competenciaDocumento +
                "."
            );
    }
    else if (
        cnpjVinculadoForaVigencia
    ) {
        codigo =
            "CNPJ_VINCULADO_FORA_VIGENCIA";

        nivel =
            "BLOQUEIO";

        rotulo =
            "CNPJ fora da vigência";

        mensagem =
            (
                "O CNPJ localizado pertence ao histórico da empresa, " +
                "porém sua vigência não alcança a competência " +
                competenciaDocumento +
                "."
            );
    }
    else if (
        competenciaAmbigua
    ) {
        codigo =
            "COMPETENCIA_DOCUMENTAL_AMBIGUA";

        nivel =
            "BLOQUEIO";

        rotulo =
            "Competência ambígua";

        mensagem =
            (
                "Foram identificados eventos SST pertencentes a competências diferentes (" +
                resolucaoCompetencia
                    .competenciasEventos
                    .join(", ") +
                "). O arquivo deve ser separado ou conferido antes da persistência."
            );
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
            "O recibo de eSocial SST foi reconhecido, mas não foi possível determinar sua competência por campo declarado ou data do evento.";
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
                "Evento eSocial SST da competência " +
                competenciaDocumento +
                " identificado. O documento deverá ser salvo nessa competência, independentemente do mês aberto na tela."
            );
    }

    const regras = [
        {
            codigo:
                "TIPO_DOCUMENTAL",
            titulo:
                "eSocial SST",
            status:
                estrutura.reconhecido
                    ? "APROVADA"
                    : "REPROVADA",
            mensagem:
                estrutura.reconhecido
                    ? (
                        "Recibo ou protocolo reconhecido para: " +
                        cobertura +
                        "."
                    )
                    : estrutura.eventos.length >
                        0
                        ? "Evento SST mencionado, porém sem evidência suficiente de recibo/protocolo."
                        : "Eventos S-2210, S-2220 ou S-2240 não foram localizados.",
        },
        {
            codigo:
                "COMPETENCIA",
            titulo:
                "Competência documental",
            status:
                competenciaAmbigua ||
                !competenciaDocumento
                    ? "REPROVADA"
                    : competenciaConfere ===
                        false
                        ? "ATENCAO"
                        : "APROVADA",
            mensagem:
                competenciaAmbigua
                    ? (
                        "Mais de uma competência foi identificada: " +
                        resolucaoCompetencia
                            .competenciasEventos
                            .join(", ") +
                        "."
                    )
                    : !competenciaDocumento
                        ? "Competência não localizada com segurança."
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
                                " via " +
                                (
                                    resolucaoCompetencia
                                        .origem ===
                                        "COMPETENCIA_DECLARADA"
                                        ? "campo declarado"
                                        : "data do evento"
                                ) +
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
                        : cnpjVinculadoSemVigencia ||
                            cnpjVinculadoForaVigencia
                            ? "REPROVADA"
                            : cnpjSecundario
                                ? "ATENCAO"
                                : "APROVADA",
            mensagem:
                !possuiCnpjDocumento
                    ? "CNPJ não localizado automaticamente; conferir o empregador no recibo."
                    : !possuiCnpjEsperado
                        ? "A empresa selecionada não possui CNPJ disponível para comparação."
                        : divergenciaCnpj
                            ? "Os CNPJs encontrados não estão vinculados à empresa selecionada."
                            : cnpjVinculadoSemVigencia
                                ? (
                                    "O CNPJ histórico está vinculado à empresa, mas não possui período de vigência completo para validar a competência " +
                                    competenciaDocumento +
                                    "."
                                )
                                : cnpjVinculadoForaVigencia
                                    ? (
                                        "O CNPJ histórico está vinculado à empresa, porém sua vigência não alcança a competência " +
                                        competenciaDocumento +
                                        "."
                                    )
                                    : cnpjSecundario
                                        ? "Foi localizado um CNPJ vinculado à empresa e válido para a competência analisada."
                                        : "CNPJ principal da empresa localizado no documento.",
        },
        {
            codigo:
                "RECIBO_PROTOCOLO",
            titulo:
                "Recibo / protocolo",
            status:
                (
                    estrutura
                        .numerosRecibo
                        .length >
                        0 ||
                    estrutura
                        .idsEvento
                        .length >
                        0 ||
                    estrutura
                        .protocolos
                        .length >
                        0
                )
                    ? "APROVADA"
                    : "ATENCAO",
            mensagem:
                estrutura
                    .numerosRecibo
                    .length >
                    0
                    ? (
                        "Número de recibo localizado: " +
                        estrutura
                            .numerosRecibo[0] +
                        "."
                    )
                    : estrutura
                        .idsEvento
                        .length >
                        0
                        ? (
                            "Identificador do evento localizado: " +
                            estrutura
                                .idsEvento[0] +
                            "."
                        )
                        : estrutura
                            .protocolos
                            .length >
                            0
                            ? (
                                "Protocolo localizado: " +
                                estrutura
                                    .protocolos[0] +
                                "."
                            )
                            : "Estrutura de recibo localizada, mas o identificador não foi extraído automaticamente.",
        },
        {
            codigo:
                "COBERTURA_EVENTOS_SST",
            titulo:
                "Eventos comprovados",
            status:
                estrutura.eventos.length >
                    0
                    ? "ATENCAO"
                    : "REPROVADA",
            mensagem:
                estrutura.eventos.length >
                    0
                    ? (
                        "Eventos localizados: " +
                        cobertura +
                        ". A ausência dos demais eventos não reprova automaticamente o documento, pois a aplicabilidade é definida por competência."
                    )
                    : "Nenhum evento SST aplicável ao item foi identificado.",
        },
        {
            codigo:
                "CONFERENCIA_ESOCIAL_SST",
            titulo:
                "Conferência eSocial SST",
            status:
                "ATENCAO",
            mensagem:
                "A análise automática identifica a evidência enviada, mas não determina quais eventos deveriam existir na competência nem substitui a conferência humana da transmissão.",
        },
    ];

    const cnpjDocumento =
        somenteDigitos(
            cnpjVinculoEncontrado
                ?.cnpj
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
            "eSocial SST",
        documentoIdentificado:
            cobertura
                ? (
                    "eSocial SST · " +
                    cobertura
                )
                : "eSocial SST",
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
        cnpjVinculadoSemVigencia,
        cnpjVinculadoForaVigencia,
        vigenciaCnpjVinculado,
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
            estrutura.numerosRecibo[0] ||
            estrutura.idsEvento[0] ||
            estrutura.protocolos[0] ||
            competenciaDocumento ||
            "",
        dadosTemporais:
            criarDadosTemporais({
                competencia:
                    competenciaDocumento,
                dataRecepcao,
            }),
        dadosEsocial: {
            competencia:
                competenciaDocumento,
            competenciaEsperada,
            competenciaConfere,
            origemCompetencia:
                resolucaoCompetencia
                    .origem,
            competenciasEventos:
                resolucaoCompetencia
                    .competenciasEventos,
            eventos:
                estrutura.eventos,
            codigosEventos,
            cobertura,
            numeroRecibo:
                estrutura
                    .numerosRecibo[0] ||
                "",
            numerosRecibo:
                estrutura
                    .numerosRecibo,
            idsEvento:
                estrutura
                    .idsEvento,
            protocolos:
                estrutura
                    .protocolos,
            dataRecepcao,
            s2210:
                codigosEventos.includes(
                    "S-2210"
                ),
            s2220:
                codigosEventos.includes(
                    "S-2220"
                ),
            s2240:
                codigosEventos.includes(
                    "S-2240"
                ),
        },
        regras,
        classificacao:
            classificacao ||
            null,
    };
}