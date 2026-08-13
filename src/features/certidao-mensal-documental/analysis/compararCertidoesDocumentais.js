const TIPOS_SUPORTADOS =
    Object.freeze({
        "cnd-federal": {
            id: "cnd-federal",
            titulo: "CND Federal",
            rotuloIdentificador:
                "Código de controle",
        },
        "cndt-trabalhista": {
            id: "cndt-trabalhista",
            titulo: "CNDT",
            rotuloIdentificador:
                "Número da certidão",
        },
        "crf-fgts": {
            id: "crf-fgts",
            titulo: "CRF FGTS",
            rotuloIdentificador:
                "Número de certificação",
        },
    });

function textoSeguro(valor) {
    return String(valor ?? "").trim();
}

function somenteDigitos(valor) {
    return textoSeguro(valor)
        .replace(/\D/g, "");
}

function cnpjsIguais(
    primeiro,
    segundo
) {
    const a =
        somenteDigitos(primeiro);

    const b =
        somenteDigitos(segundo);

    return Boolean(
        a.length === 14 &&
        a === b
    );
}

function obterTipoDocumento(
    resultado
) {
    const classificacao =
        resultado
            ?.preAvaliacaoDocumental
            ?.classificacao;

    const avaliacao =
        resultado
            ?.preAvaliacaoDocumental
            ?.avaliacao;

    const classificacaoId =
        textoSeguro(
            classificacao?.id
        );

    if (
        TIPOS_SUPORTADOS[
            classificacaoId
        ]
    ) {
        return TIPOS_SUPORTADOS[
            classificacaoId
        ];
    }

    const identificado =
        textoSeguro(
            avaliacao
                ?.documentoIdentificado
        );

    if (identificado === "CND Federal") {
        return TIPOS_SUPORTADOS[
            "cnd-federal"
        ];
    }

    if (identificado === "CNDT") {
        return TIPOS_SUPORTADOS[
            "cndt-trabalhista"
        ];
    }

    return null;
}

function dataBrParaPartes(
    valor
) {
    const correspondencia =
        textoSeguro(valor).match(
            /^(\d{2})\/(\d{2})\/(\d{4})$/
        );

    if (!correspondencia) {
        return null;
    }

    return {
        ano:
            Number(
                correspondencia[3]
            ),
        mes:
            Number(
                correspondencia[2]
            ),
        dia:
            Number(
                correspondencia[1]
            ),
    };
}

function horaParaPartes(
    valor
) {
    const correspondencia =
        textoSeguro(valor).match(
            /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/
        );

    if (!correspondencia) {
        return {
            hora: 0,
            minuto: 0,
            segundo: 0,
        };
    }

    return {
        hora:
            Number(
                correspondencia[1]
            ),
        minuto:
            Number(
                correspondencia[2]
            ),
        segundo:
            Number(
                correspondencia[3] || 0
            ),
    };
}

function dataHoraBrParaNumero(
    data,
    hora = ""
) {
    const dataPartes =
        dataBrParaPartes(
            data
        );

    if (!dataPartes) {
        return 0;
    }

    const horaPartes =
        horaParaPartes(
            hora
        );

    return Date.UTC(
        dataPartes.ano,
        dataPartes.mes - 1,
        dataPartes.dia,
        horaPartes.hora,
        horaPartes.minuto,
        horaPartes.segundo
    );
}

function abreviarHash(
    valor
) {
    const hash =
        textoSeguro(valor);

    if (!hash) {
        return "Não calculado";
    }

    return hash.length > 16
        ? `${hash.slice(0, 16)}…`
        : hash;
}

function montarIdentificadorDocumento({
    tipo,
    avaliacao,
}) {
    if (
        tipo?.id ===
        "cndt-trabalhista"
    ) {
        const numero =
            textoSeguro(
                avaliacao
                    ?.numeroCertidao
            );

        const ano =
            textoSeguro(
                avaliacao
                    ?.anoCertidao
            );

        if (numero && ano) {
            return `${numero}/${ano}`;
        }
    }

    return textoSeguro(
        avaliacao
            ?.codigoControle
    );
}

function extrairResumoResultado(
    resultado
) {
    const avaliacao =
        resultado
            ?.preAvaliacaoDocumental
            ?.avaliacao;

    const tipo =
        obterTipoDocumento(
            resultado
        );

    if (
        !resultado?.sucesso ||
        !avaliacao ||
        !tipo ||
        avaliacao.documentoIncompativel
    ) {
        return null;
    }

    const dadosTemporais =
        avaliacao
            ?.dadosTemporais ||
        {};

    return {
        tipo,
        nomeArquivo:
            textoSeguro(
                resultado
                    ?.arquivo
                    ?.nomeOriginal
            ),
        hashSha256:
            textoSeguro(
                resultado
                    ?.arquivo
                    ?.hashSha256
            ),
        hashAbreviado:
            abreviarHash(
                resultado
                    ?.arquivo
                    ?.hashSha256
            ),
        documentoIdentificado:
            textoSeguro(
                avaliacao
                    ?.documentoIdentificado
            ),
        empresaEsperada:
            textoSeguro(
                avaliacao
                    ?.empresaEsperada
            ),
        cnpjEsperado:
            textoSeguro(
                avaliacao
                    ?.cnpjEsperado
            ),
        cnpjDocumento:
            textoSeguro(
                avaliacao
                    ?.cnpjDocumento
            ),
        natureza:
            textoSeguro(
                avaliacao
                    ?.natureza
                    ?.rotulo
            ),
        identificadorDocumento:
            montarIdentificadorDocumento({
                tipo,
                avaliacao,
            }),
        dataEmissao:
            textoSeguro(
                dadosTemporais
                    ?.dataEmissao
            ),
        horaEmissao:
            textoSeguro(
                dadosTemporais
                    ?.horaEmissao
            ),
        dataValidade:
            textoSeguro(
                dadosTemporais
                    ?.dataValidade
            ),
        situacaoValidade:
            textoSeguro(
                dadosTemporais
                    ?.situacaoValidade
                    ?.codigo
            ),
        codigoAvaliacao:
            textoSeguro(
                avaliacao
                    ?.codigo
            ),
        rotuloAvaliacao:
            textoSeguro(
                avaliacao
                    ?.rotulo
            ),
    };
}

function criarCampoComparacao(
    rotulo,
    anterior,
    atual
) {
    const valorAnterior =
        textoSeguro(anterior) ||
        "Não identificado";

    const valorAtual =
        textoSeguro(atual) ||
        "Não identificado";

    return {
        rotulo,
        anterior:
            valorAnterior,
        atual:
            valorAtual,
        alterado:
            valorAnterior !==
            valorAtual,
    };
}

function formatarEmissao(
    resumo
) {
    return [
        resumo.dataEmissao,
        resumo.horaEmissao,
    ]
        .filter(Boolean)
        .join(" ");
}

function documentoEstaVigente(
    codigo
) {
    return (
        codigo === "VALIDA" ||
        codigo === "VENCE_HOJE"
    );
}

export function compararCertidoesDocumentais({
    resultadoAnterior,
    resultadoAtual,
}) {
    const anterior =
        extrairResumoResultado(
            resultadoAnterior
        );

    const atual =
        extrairResumoResultado(
            resultadoAtual
        );

    if (!anterior || !atual) {
        return {
            disponivel: false,
            codigo:
                "COMPARACAO_NAO_DISPONIVEL",
            nivel:
                "INCONCLUSIVA",
            rotulo:
                "Comparação não disponível",
            mensagem:
                "São necessários dois diagnósticos documentais concluídos.",
            campos: [],
        };
    }

    if (
        anterior.tipo.id !==
        atual.tipo.id
    ) {
        return {
            disponivel: false,
            codigo:
                "TIPOS_DOCUMENTAIS_DIFERENTES",
            nivel:
                "INCONCLUSIVA",
            rotulo:
                "Documentos incompatíveis",
            mensagem:
                "A comparação exige dois documentos do mesmo tipo.",
            campos: [],
        };
    }

    const tipo =
        atual.tipo;

    const mesmoArquivo =
        Boolean(
            anterior.hashSha256 &&
            anterior.hashSha256 ===
                atual.hashSha256
        );

    const atualPertenceEmpresa =
        cnpjsIguais(
            atual.cnpjDocumento,
            atual.cnpjEsperado
        );

    const atualVigente =
        documentoEstaVigente(
            atual.situacaoValidade
        );

    const emissaoAnterior =
        dataHoraBrParaNumero(
            anterior.dataEmissao,
            anterior.horaEmissao
        );

    const emissaoAtual =
        dataHoraBrParaNumero(
            atual.dataEmissao,
            atual.horaEmissao
        );

    const validadeAnterior =
        dataHoraBrParaNumero(
            anterior.dataValidade
        );

    const validadeAtual =
        dataHoraBrParaNumero(
            atual.dataValidade
        );

    const emissaoMaisRecente =
        Boolean(
            emissaoAtual &&
            (
                !emissaoAnterior ||
                emissaoAtual >
                    emissaoAnterior
            )
        );

    const validadeMaisRecente =
        Boolean(
            validadeAtual &&
            (
                !validadeAnterior ||
                validadeAtual >
                    validadeAnterior
            )
        );

    let codigo =
        "COMPARACAO_INCONCLUSIVA";

    let nivel =
        "INCONCLUSIVA";

    let rotulo =
        "Comparação inconclusiva";

    let mensagem =
        "Os arquivos foram comparados, mas a decisão exige conferência humana.";

    if (mesmoArquivo) {
        codigo =
            "ARQUIVO_REPETIDO";

        nivel =
            "ALERTA";

        rotulo =
            "Mesmo arquivo selecionado";

        mensagem =
            "O segundo PDF possui o mesmo hash SHA-256 do documento anterior.";
    }
    else if (!atualPertenceEmpresa) {
        codigo =
            "ATUALIZADO_MAS_DIVERGENTE";

        nivel =
            "REPROVADA";

        rotulo =
            "Documento atualizado, mas ainda divergente";

        mensagem =
            (
                "O novo PDF é diferente e mais recente, " +
                "porém continua pertencendo a outra empresa."
            );
    }
    else if (!atualVigente) {
        codigo =
            "ATUALIZADO_MAS_VENCIDO";

        nivel =
            "REPROVADA";

        rotulo =
            "Novo documento ainda vencido";

        mensagem =
            (
                "O arquivo foi alterado, mas a validade " +
                "atual não atende à competência."
            );
    }
    else {
        codigo =
            "ATUALIZADO_COMPATIVEL";

        nivel =
            "ALERTA";

        rotulo =
            "Documento atualizado e compatível";

        mensagem =
            (
                "O novo PDF pertence à empresa selecionada " +
                "e está vigente. A decisão final ainda " +
                "exige conferência humana."
            );
    }

    return {
        disponivel: true,
        tipoDocumento:
            tipo.id,
        tituloDocumento:
            tipo.titulo,
        rotuloIdentificador:
            tipo.rotuloIdentificador,
        codigo,
        nivel,
        rotulo,
        mensagem,
        mesmoArquivo,
        atualPertenceEmpresa,
        atualVigente,
        emissaoMaisRecente,
        validadeMaisRecente,
        anterior,
        atual,
        campos: [
            criarCampoComparacao(
                "Arquivo",
                anterior.nomeArquivo,
                atual.nomeArquivo
            ),
            criarCampoComparacao(
                "CNPJ do PDF",
                anterior.cnpjDocumento,
                atual.cnpjDocumento
            ),
            criarCampoComparacao(
                tipo.rotuloIdentificador,
                anterior
                    .identificadorDocumento,
                atual
                    .identificadorDocumento
            ),
            criarCampoComparacao(
                "Natureza",
                anterior.natureza,
                atual.natureza
            ),
            criarCampoComparacao(
                "Emissão",
                formatarEmissao(
                    anterior
                ),
                formatarEmissao(
                    atual
                )
            ),
            criarCampoComparacao(
                "Validade",
                anterior.dataValidade,
                atual.dataValidade
            ),
            criarCampoComparacao(
                "SHA-256",
                anterior.hashAbreviado,
                atual.hashAbreviado
            ),
        ],
    };
}

export function compararCertidoesCndFederal(
    parametros
) {
    return compararCertidoesDocumentais(
        parametros
    );
}