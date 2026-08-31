export const CERT2_DOCUMENTO_CANONICO_VERSAO =
    "CERT2_DOCUMENTO_CANONICO_V1";

const PADRAO_SHA256 =
    /^[a-f0-9]{64}$/;

function textoSeguro(
    valor = ""
) {
    return String(
        valor ?? ""
    ).trim();
}

function numeroSeguro(
    valor,
    padrao = 0
) {
    const numero =
        Number(
            valor
        );

    return Number.isFinite(
        numero
    )
        ? numero
        : padrao;
}

function listaUnica(
    valores = []
) {
    return [
        ...new Set(
            (
                Array.isArray(
                    valores
                )
                    ? valores
                    : []
            )
                .map(
                    textoSeguro
                )
                .filter(
                    Boolean
                )
        ),
    ];
}

function paginasUnicas(
    leitura = {}
) {
    const qualidade =
        leitura
            ?.qualidadeTexto ||
        {};

    const fontes = [
        qualidade
            ?.ocrAdaptativoCert2
            ?.paginasPdfJs,
        qualidade
            ?.ocrAdaptativoCert2
            ?.paginasOcr,
        qualidade
            ?.ocrAdaptativoIndividualCert2
            ?.paginasPdfJs,
        qualidade
            ?.ocrAdaptativoIndividualCert2
            ?.paginasOcr,
    ];

    return [
        ...new Set(
            fontes
                .flatMap(
                    (itens) =>
                        Array.isArray(
                            itens
                        )
                            ? itens
                            : []
                )
                .map(
                    Number
                )
                .filter(
                    (pagina) =>
                        Number.isInteger(
                            pagina
                        ) &&
                        pagina > 0
                )
        ),
    ].sort(
        (a, b) => a - b
    );
}

function obterHashSha256(
    hash = null
) {
    const valor =
        textoSeguro(
            typeof hash ===
                "string"
                ? hash
                : (
                    hash?.sha256 ||
                    hash?.hashSha256 ||
                    hash?.valor
                )
        )
            .toLowerCase();

    return PADRAO_SHA256
        .test(
            valor
        )
        ? valor
        : "";
}

function obterDadosTemporais(
    resolucao = {}
) {
    const avaliacao =
        resolucao
            ?.avaliacao ||
        {};

    const semantica =
        resolucao
            ?.analiseSemantica
            ?.temporalidade ||
        {};

    const dados =
        avaliacao
            ?.dadosTemporais ||
        {};

    const dadosInss =
        avaliacao
            ?.dadosInssDctfweb ||
        {};

    const validadeFim =
        textoSeguro(
            dados
                ?.dataValidadeIso ||
            semantica
                ?.validadeFim
        );

    return {
        emissao:
            textoSeguro(
                dados
                    ?.dataEmissaoIso ||
                semantica
                    ?.dataEmissao
            ),

        validadeInicio:
            textoSeguro(
                semantica
                    ?.validadeInicio
            ),

        validadeFim:
            validadeFim,

        validade:
            validadeFim,

        vencimento:
            textoSeguro(
                dadosInss
                    ?.vencimento
            ),

        periodoApuracao:
            textoSeguro(
                dadosInss
                    ?.competencia ||
                semantica
                    ?.competenciaDocumental ||
                resolucao
                    ?.destino
                    ?.competenciaDocumento
            ),

        periodoInicio:
            textoSeguro(
                semantica
                    ?.periodoInicio
            ),

        periodoFim:
            textoSeguro(
                semantica
                    ?.periodoFim
            ),
    };
}

function criarMensagensAvaliacao(
    resolucao = {}
) {
    const motivos =
        Array.isArray(
            resolucao
                ?.motivos
        )
            ? resolucao
                .motivos
            : [];

    return listaUnica([
        resolucao
            ?.avaliacao
            ?.mensagem,
        ...motivos.map(
            (motivo) =>
                motivo
                    ?.mensagem
        ),
    ]);
}

export function validarResultadoDocumentoCanonicoCert2(
    resultado
) {
    const erros = [];

    if (
        !resultado ||
        typeof resultado !==
            "object"
    ) {
        erros.push(
            "RESULTADO_AUSENTE"
        );

        return {
            valido:
                false,
            erros,
        };
    }

    if (
        resultado
            .versaoContrato !==
        CERT2_DOCUMENTO_CANONICO_VERSAO
    ) {
        erros.push(
            "VERSAO_CONTRATO_INVALIDA"
        );
    }

    if (
        !textoSeguro(
            resultado
                ?.classificacao
                ?.id
        )
    ) {
        erros.push(
            "CLASSIFICACAO_SEM_ID"
        );
    }

    const hash =
        textoSeguro(
            resultado
                ?.rastreabilidade
                ?.hashSha256
        );

    if (
        hash &&
        !PADRAO_SHA256.test(
            hash
        )
    ) {
        erros.push(
            "HASH_SHA256_INVALIDO"
        );
    }

    if (
        resultado
            ?.seguranca
            ?.somenteAnalise !==
            true ||
        resultado
            ?.seguranca
            ?.persistenciaAutorizada !==
            false ||
        resultado
            ?.persistenciaAutomatica !==
            false ||
        resultado
            ?.persistido !==
            false
    ) {
        erros.push(
            "INVARIANTE_PERSISTENCIA_VIOLADA"
        );
    }

    return {
        valido:
            erros.length === 0,
        erros,
    };
}

export function criarResultadoDocumentoCanonicoCert2({
    leitura = {},
    resolucao = {},
    hash = null,
    validacao = null,
    erro = "",
} = {}) {
    const semantica =
        resolucao
            ?.analiseSemantica ||
        {};

    const documentoSemantico =
        semantica
            ?.documento ||
        {};

    const empresaSemantica =
        semantica
            ?.identidadeEmpresarial ||
        {};

    const temporalidade =
        semantica
            ?.temporalidade ||
        {};

    const avaliacao =
        resolucao
            ?.avaliacao ||
        {};

    const classificacaoId =
        textoSeguro(
            documentoSemantico
                ?.familia ||
            resolucao
                ?.tipoDocumento ||
            "nao-identificado"
        );

    const tituloClassificacao =
        textoSeguro(
            documentoSemantico
                ?.titulo ||
            resolucao
                ?.titulo ||
            "Documento não identificado"
        );

    const documentoIdentificado =
        textoSeguro(
            avaliacao
                ?.documentoIdentificado
        );

    const resultado = {
        versaoContrato:
            CERT2_DOCUMENTO_CANONICO_VERSAO,

        status:
            textoSeguro(
                resolucao
                    ?.status ||
                "BLOQUEADO"
            ),

        politica:
            textoSeguro(
                resolucao
                    ?.politica
            ),

        leitura: {
            metodo:
                textoSeguro(
                    leitura
                        ?.metodo ||
                    leitura
                        ?.tipoLeitura ||
                    "texto_pre_extraido"
                ),

            texto:
                textoSeguro(
                    leitura
                        ?.textoExtraido
                ),

            caracteres:
                numeroSeguro(
                    leitura
                        ?.quantidadeCaracteres,
                    textoSeguro(
                        leitura
                            ?.textoExtraido
                    ).length
                ),

            paginas:
                numeroSeguro(
                    leitura
                        ?.totalPaginas
                ),

            paginasLidas:
                numeroSeguro(
                    leitura
                        ?.paginasLidas
                ),

            paginasProcessadas:
                paginasUnicas(
                    leitura
                ),

            confianca:
                numeroSeguro(
                    leitura
                        ?.confianca
                ),

            avisos:
                listaUnica(
                    leitura
                        ?.avisos
                ),
        },

        classificacao: {
            id:
                classificacaoId,

            titulo:
                tituloClassificacao,

            variante:
                documentoIdentificado &&
                documentoIdentificado !==
                    tituloClassificacao
                    ? documentoIdentificado
                    : "",

            tipoClassificador:
                textoSeguro(
                    documentoSemantico
                        ?.subtipo ||
                    resolucao
                        ?.tipoClassificador ||
                    classificacaoId
                ),

            tipoCatalogo:
                textoSeguro(
                    resolucao
                        ?.tipoDocumento ||
                    classificacaoId
                ),

            confianca:
                numeroSeguro(
                    resolucao
                        ?.confianca ||
                    semantica
                        ?.confianca
                ),

            evidencias:
                listaUnica(
                    semantica
                        ?.evidencias
                        ?.classificacao
                ),

            complementar:
                resolucao
                    ?.complementar ===
                    true,
        },

        empresa: {
            status:
                textoSeguro(
                    empresaSemantica
                        ?.status ||
                    resolucao
                        ?.empresa
                        ?.status ||
                    "NAO_AVALIADA"
                ),

            empresaId:
                textoSeguro(
                    empresaSemantica
                        ?.empresaId ||
                    resolucao
                        ?.empresa
                        ?.id
                ),

            empresaNome:
                textoSeguro(
                    empresaSemantica
                        ?.empresaNome ||
                    resolucao
                        ?.empresa
                        ?.nome
                ),

            cnpjEncontrado:
                textoSeguro(
                    empresaSemantica
                        ?.cnpjCorrespondente ||
                    resolucao
                        ?.empresa
                        ?.cnpjCorrespondente
                ),

            cnpjsDocumento:
                listaUnica(
                    empresaSemantica
                        ?.cnpjsDocumento ||
                    resolucao
                        ?.empresa
                        ?.cnpjsDocumento
                ),

            metodo:
                textoSeguro(
                    empresaSemantica
                        ?.metodoIdentificacao ||
                    resolucao
                        ?.empresa
                        ?.metodoIdentificacao
                ),

            evidencias:
                listaUnica(
                    semantica
                        ?.evidencias
                        ?.empresa ||
                    resolucao
                        ?.empresa
                        ?.evidencias
                ),
        },

        competencia: {
            valor:
                textoSeguro(
                    temporalidade
                        ?.competenciaDocumental ||
                    resolucao
                        ?.destino
                        ?.competenciaDocumento
                ),

            armazenamentoIso:
                textoSeguro(
                    temporalidade
                        ?.competenciaArmazenamento ||
                    resolucao
                        ?.destino
                        ?.competenciaIso
                ),

            fonte:
                textoSeguro(
                    resolucao
                        ?.destino
                        ?.fonte
                ),

            confianca:
                numeroSeguro(
                    resolucao
                        ?.confianca ||
                    semantica
                        ?.confianca
                ),
        },

        temporal:
            obterDadosTemporais(
                resolucao
            ),

        avaliacao: {
            codigo:
                textoSeguro(
                    avaliacao
                        ?.codigo ||
                    resolucao
                        ?.status ||
                    "BLOQUEADO"
                ),

            nivel:
                textoSeguro(
                    avaliacao
                        ?.nivel
                ),

            mensagens:
                criarMensagensAvaliacao(
                    resolucao
                ),

            documentoIncompativel:
                avaliacao
                    ?.documentoIncompativel ===
                    true,

            requerConferenciaHumana:
                avaliacao
                    ?.requerConferenciaHumana ===
                    true ||
                resolucao
                    ?.status !==
                    "PRONTO",

            bloqueiaPersistencia:
                true,

            regras:
                Array.isArray(
                    avaliacao
                        ?.regras
                )
                    ? avaliacao
                        .regras
                    : [],
        },

        rastreabilidade: {
            hash:
                obterHashSha256(
                    hash
                ),

            hashSha256:
                obterHashSha256(
                    hash
                ),

            versaoMotor:
                CERT2_DOCUMENTO_CANONICO_VERSAO,

            versaoSemantica:
                textoSeguro(
                    semantica
                        ?.versao
                ),

            estrategiaLeitura:
                textoSeguro(
                    leitura
                        ?.metodo ||
                    leitura
                        ?.tipoLeitura ||
                    "texto_pre_extraido"
                ),
        },

        seguranca: {
            somenteAnalise:
                true,

            persistenciaAutorizada:
                false,

            failClosed:
                true,

            motivoBloqueioPersistencia:
                "MOTOR_CANONICO_A2_SOMENTE_ANALISE",
        },

        validacaoArquivo:
            validacao ||
            null,

        erro:
            textoSeguro(
                erro
            ),

        persistenciaAutomatica:
            false,

        persistido:
            false,

        compatibilidade: {
            resolucaoLote:
                resolucao,
        },
    };

    const validacaoContrato =
        validarResultadoDocumentoCanonicoCert2(
            resultado
        );

    if (!validacaoContrato.valido) {
        throw new Error(
            (
                "Resultado documental canônico inválido: " +
                validacaoContrato
                    .erros
                    .join(", ")
            )
        );
    }

    return resultado;
}
