import {
    CERTIDAO_MENSAL_EVENTO,
    CERTIDAO_MENSAL_ORIGEM_ITEM,
    CERTIDAO_MENSAL_STATUS_CONSULTA_OFICIAL,
    CERTIDAO_MENSAL_STATUS_ITEM,
    CERTIDAO_MENSAL_VERSAO_CONTRATO,
    normalizarCodigoTipoDocumentoCertidaoMensal,
    normalizarCompetenciaCertidaoMensal,
    obterDataReferenciaCertidaoMensal,
} from "../domain/certidaoMensalPersistenceContract.js";

const PADRAO_HASH_SHA256 =
    /^[a-f0-9]{64}$/;

function textoSeguro(
    valor
) {
    return String(
        valor ?? ""
    ).trim();
}

function numeroSeguro(
    valor,
    valorPadrao = 0
) {
    const numero =
        Number(valor);

    return Number.isFinite(numero)
        ? numero
        : valorPadrao;
}

function clonarJsonSeguro(
    valor,
    valorPadrao = null
) {
    if (
        valor === undefined ||
        valor === null
    ) {
        return valorPadrao;
    }

    try {
        return JSON.parse(
            JSON.stringify(valor)
        );
    }
    catch {
        return valorPadrao;
    }
}

function obterAvaliacaoDocumental(
    resultado
) {
    return (
        resultado
            ?.preAvaliacaoDocumental
            ?.avaliacao ||
        null
    );
}

function obterClassificacaoDocumental(
    resultado
) {
    return (
        resultado
            ?.preAvaliacaoDocumental
            ?.classificacao ||
        null
    );
}

function obterHashSha256(
    resultado
) {
    return textoSeguro(
        resultado
            ?.arquivo
            ?.hashSha256 ||
        resultado
            ?.arquivo
            ?.valor
    ).toLowerCase();
}

const CODIGOS_BLOQUEIO_PERSISTENCIA =
    new Set([
        "ARQUIVO_INCOMPATIVEL",
        "DIVERGENCIA_CNPJ",
        "FONTE_ESTADUAL_INCOMPATIVEL",
        "TIPO_DOCUMENTAL_DIVERGENTE",
    ]);

/* SAFESCAN-ISSQN-D10-STATUS-INICIAL */
export function resolverStatusInicialDocumentoCertidaoMensal({
    tipoDocumento,
    avaliacao,
} = {}) {
    const statusPadrao =
        CERTIDAO_MENSAL_STATUS_ITEM
            .EM_ANALISE;

    const tipoNormalizado =
        textoSeguro(
            tipoDocumento
        )
            .trim()
            .toLowerCase();

    if (tipoNormalizado !== "iss") {
        return statusPadrao;
    }

    const codigoAvaliacao =
        textoSeguro(
            avaliacao?.codigo
        )
            .trim()
            .toUpperCase();

    if (
        codigoAvaliacao !==
        "CERTIDAO_ISSQN_IDENTIFICADA"
    ) {
        return statusPadrao;
    }

    if (
        avaliacao?.documentoIncompativel === true ||
        avaliacao?.bloqueiaSubstituicao === true ||
        avaliacao?.requerConferenciaHumana === true
    ) {
        return statusPadrao;
    }

    const regras =
        Array.isArray(
            avaliacao?.regras
        )
            ? avaliacao.regras
            : [];

    const regrasDecisivas =
        regras.filter(
            (regra) =>
                textoSeguro(
                    regra?.codigo
                )
                    .trim()
                    .toUpperCase() !==
                "CONFERENCIA_FISCAL_MUNICIPAL"
        );

    const regrasAutomaticasAprovadas =
        regrasDecisivas.length > 0 &&
        regrasDecisivas.every(
            (regra) =>
                textoSeguro(
                    regra?.status
                )
                    .trim()
                    .toUpperCase() ===
                "APROVADA"
        );

    return regrasAutomaticasAprovadas
        ? CERTIDAO_MENSAL_STATUS_ITEM.CONFORME
        : statusPadrao;
}

export function resultadoLaboratorioCertidaoPodeSerPersistido(
    resultado
) {
    const avaliacao =
        obterAvaliacaoDocumental(
            resultado
        );

    return Boolean(
        resultado?.sucesso &&
        !avaliacao?.documentoIncompativel &&
        !avaliacao?.bloqueiaSubstituicao &&
        !CODIGOS_BLOQUEIO_PERSISTENCIA
            .has(
                avaliacao?.codigo
            )
    );
}

function converterCompetenciaMensalParaIso(
    valor
) {
    const correspondencia =
        /^(0[1-9]|1[0-2])\/(\d{4})$/
            .exec(
                textoSeguro(
                    valor
                )
            );

    if (!correspondencia) {
        return "";
    }

    return (
        correspondencia[2] +
        "-" +
        correspondencia[1] +
        "-01"
    );
}

function resolverCompetenciaPersistenciaDocumento({
    tipoDocumento,
    competenciaNormalizada,
    avaliacao,
}) {
    if (
        tipoDocumento ===
        "crf-fgts"
    ) {
        const dataEmissaoIso =
            textoSeguro(
                avaliacao
                    ?.dadosTemporais
                    ?.dataEmissaoIso
            );

        const correspondencia =
            /^(\d{4})-(0[1-9]|1[0-2])-\d{2}$/
                .exec(
                    dataEmissaoIso
                );

        if (!correspondencia) {
            return competenciaNormalizada;
        }

        return (
            correspondencia[1] +
            "-" +
            correspondencia[2] +
            "-01"
        );
    }

    if (
        tipoDocumento ===
        "fgts"
    ) {
        const competenciaFgts =
            converterCompetenciaMensalParaIso(
                avaliacao
                    ?.dadosFgts
                    ?.competencia
            );

        return (
            competenciaFgts ||
            competenciaNormalizada
        );
    }

    /*
     * Folha de Pagamento é documento de competência mensal.
     *
     * Quando o próprio PDF informa uma competência segura,
     * a persistência deve utilizar essa competência documental,
     * e não necessariamente o mês que estava aberto na tela.
     *
     * Exemplo:
     * tela 07/2026 + Extrato Mensal 06/2026
     * => salvar em 06/2026.
     */
    if (
        tipoDocumento ===
        "folha-pagamento"
    ) {
        const competenciaFolha =
            converterCompetenciaMensalParaIso(
                avaliacao
                    ?.dadosFolhaPagamento
                    ?.competencia
            );

        return (
            competenciaFolha ||
            competenciaNormalizada
        );
    }
    /*
     * Espelho de Ponto é documento de competência mensal.
     *
     * A competência identificada no próprio documento
     * define o mês de persistência.
     *
     * A ausência de competência é bloqueada pelo avaliador,
     * impedindo o uso silencioso do mês aberto na interface.
     */
    if (
        tipoDocumento ===
        "folha-ponto"
    ) {
        const competenciaFolhaPonto =
            converterCompetenciaMensalParaIso(
                avaliacao
                    ?.dadosFolhaPonto
                    ?.competencia
            );

        return (
            competenciaFolhaPonto ||
            competenciaNormalizada
        );
    }

    /*
     * VA / VT é documento de competência mensal.
     *
     * A competência segura extraída do documento prevalece
     * sobre o mês aberto na interface.
     *
     * Documentos sem competência identificável são bloqueados
     * pelo avaliador e não chegam à persistência.
     */
    if (
        tipoDocumento ===
        "va-vt"
    ) {
        const competenciaVaVt =
            converterCompetenciaMensalParaIso(
                avaliacao
                    ?.dadosVaVt
                    ?.competencia
            );

        return (
            competenciaVaVt ||
            competenciaNormalizada
        );
    }

    if (
        tipoDocumento ===
        "inss-dctfweb"
    ) {
        const competenciaInssDctfweb =
            converterCompetenciaMensalParaIso(
                avaliacao
                    ?.dadosInssDctfweb
                    ?.competencia
            );

        return (
            competenciaInssDctfweb ||
            competenciaNormalizada
        );
    }

    /*
     * ISS é documento de competência mensal.
     *
     * Quando a competência é localizada com segurança
     * no próprio documento, ela define o mês de persistência.
     */
    if (
        tipoDocumento ===
        "iss"
    ) {
        /*
         * Certidão de ISSQN / Taxa de Licença usa política
         * documental por VALIDADE.
         *
         * Sua competência de origem é o mês da emissão,
         * exatamente como ocorre com os demais documentos
         * controlados por validade.
         *
         * Exemplo real:
         * emissão 19/01/2026 -> origem 2026-01-01.
         *
         * A validade até 18/07/2026 é tratada posteriormente
         * pela regra documental de competência, sem transformar
         * a certidão em documento mensal.
         */
        const certidaoIssqn =
            Boolean(
                avaliacao
                    ?.dadosIss
                    ?.certidaoIssqn
            );

        if (
            certidaoIssqn
        ) {
            const dataEmissaoIssqn =
                String(
                    avaliacao
                        ?.dadosTemporais
                        ?.dataEmissaoIso ||
                    ""
                ).trim();

            const correspondenciaEmissaoIssqn =
                /^(\d{4})-(0[1-9]|1[0-2])-\d{2}$/
                    .exec(
                        dataEmissaoIssqn
                    );

            if (
                !correspondenciaEmissaoIssqn
            ) {
                throw new Error(
                    "Não foi possível determinar a competência de origem da Certidão ISSQN pela data de emissão."
                );
            }

            return (
                correspondenciaEmissaoIssqn[1] +
                "-" +
                correspondenciaEmissaoIssqn[2] +
                "-01"
            );
        }

        /*
         * Compatibilidade:
         * guia, recolhimento ou comprovante mensal de ISSQN
         * continuam usando a competência fiscal do documento.
         */
        const competenciaIss =
            converterCompetenciaMensalParaIso(
                avaliacao
                    ?.dadosIss
                    ?.competencia
            );

        return (
            competenciaIss ||
            competenciaNormalizada
        );
    }

    /*
     * eSocial SST é controlado por competência de fiscalização.
     * Quando o recibo permite identificar com segurança o mês
     * do evento, esse mês define a competência de persistência.
     */
    if (
        tipoDocumento ===
        "esocial"
    ) {
        const competenciaEsocial =
            converterCompetenciaMensalParaIso(
                avaliacao
                    ?.dadosEsocial
                    ?.competencia
            );

        return (
            competenciaEsocial ||
            competenciaNormalizada
        );
    }

    return competenciaNormalizada;
}

export function criarPayloadDocumentoCertidaoMensal({
    arquivo,
    resultado,
    empresa,
    documento,
    competencia,
    usuarioId = null,
    geradoEm =
        new Date().toISOString(),
}) {
    if (!arquivo) {
        throw new Error(
            "O arquivo PDF é obrigatório para preparar a persistência."
        );
    }

    if (
        !resultadoLaboratorioCertidaoPodeSerPersistido(
            resultado
        )
    ) {
        throw new Error(
            "O resultado do laboratório não está apto para persistência."
        );
    }

    const empresaId =
        textoSeguro(
            empresa?.id
        );

    if (!empresaId) {
        throw new Error(
            "A empresa selecionada não possui identificador."
        );
    }

    const tipoDocumento =
        normalizarCodigoTipoDocumentoCertidaoMensal(
            documento?.id ||
            documento?.tipoDocumento ||
            documento?.tipo_documento
        );

    const competenciaNormalizada =
        normalizarCompetenciaCertidaoMensal(
            competencia
        );

    const hashSha256 =
        obterHashSha256(
            resultado
        );

    if (
        !PADRAO_HASH_SHA256.test(
            hashSha256
        )
    ) {
        throw new Error(
            "O resultado não possui um hash SHA-256 válido."
        );
    }

    const avaliacao =
        obterAvaliacaoDocumental(
            resultado
        );

    const competenciaPersistencia =
        resolverCompetenciaPersistenciaDocumento({
            tipoDocumento,
            competenciaNormalizada,
            avaliacao,
        });

    const classificacao =
        obterClassificacaoDocumental(
            resultado
        );

    const leitura =
        resultado?.leitura || null;

    const requerConsultaOficial =
        Boolean(
            avaliacao
                ?.requerConsultaOficial
        );

    return {
        contratoVersao:
            CERTIDAO_MENSAL_VERSAO_CONTRATO,
        competencia:
            competenciaPersistencia,
        dataReferencia:
            obterDataReferenciaCertidaoMensal(
                competenciaPersistencia
            ),
        empresa: {
            id: empresaId,
            nome:
                textoSeguro(
                    empresa?.nome
                ),
            cnpj:
                textoSeguro(
                    empresa?.cnpj
                ),
        },
        item: {
            tipoDocumento,
            titulo:
                textoSeguro(
                    documento?.titulo
                ),
            origem:
                CERTIDAO_MENSAL_ORIGEM_ITEM
                    .UPLOAD,
            statusInicial:
                    resolverStatusInicialDocumentoCertidaoMensal({
                        tipoDocumento,
                        avaliacao,
                    }),
        },
        arquivo: {
            nomeOriginal:
                textoSeguro(
                    arquivo?.name ||
                    resultado
                        ?.arquivo
                        ?.nomeOriginal
                ),
            mimeType:
                textoSeguro(
                    arquivo?.type ||
                    resultado
                        ?.arquivo
                        ?.mimeType ||
                    "application/pdf"
                ),
            tamanhoBytes:
                numeroSeguro(
                    arquivo?.size ||
                    resultado
                        ?.arquivo
                        ?.tamanhoBytes
                ),
            hashAlgoritmo:
                "SHA-256",
            hashSha256,
            hashCalculadoEm:
                textoSeguro(
                    resultado
                        ?.arquivo
                        ?.calculadoEm
                ),
        },
        diagnostico: {
            leitura: {
                metodo:
                    textoSeguro(
                        leitura?.metodo
                    ),
                totalPaginas:
                    numeroSeguro(
                        leitura
                            ?.totalPaginas
                    ),
                paginasLidas:
                    numeroSeguro(
                        leitura
                            ?.paginasLidas
                    ),
                confianca:
                    numeroSeguro(
                        leitura
                            ?.confianca
                    ),
                quantidadeCaracteres:
                    numeroSeguro(
                        leitura
                            ?.quantidadeCaracteres
                    ),
                textoExtraido:
                    textoSeguro(
                        leitura
                            ?.textoExtraido
                    ),
            },
            classificacao:
                clonarJsonSeguro(
                    classificacao,
                    {}
                ),
            avaliacao:
                clonarJsonSeguro(
                    avaliacao,
                    {}
                ),
            avaliacaoTecnica:
                clonarJsonSeguro(
                    resultado
                        ?.avaliacaoTecnica,
                    {}
                ),
            avisos:
                Array.isArray(
                    resultado?.avisos
                )
                    ? resultado.avisos.map(
                        textoSeguro
                    )
                    : [],
        },
        consultaOficial: {
            requerida:
                requerConsultaOficial,
            status:
                requerConsultaOficial
                    ? CERTIDAO_MENSAL_STATUS_CONSULTA_OFICIAL
                        .PENDENTE
                    : CERTIDAO_MENSAL_STATUS_CONSULTA_OFICIAL
                        .NAO_APLICAVEL,
        },
        auditoria: {
            tipoEvento:
                CERTIDAO_MENSAL_EVENTO
                    .DOCUMENTO_ENVIADO,
            usuarioId:
                textoSeguro(
                    usuarioId
                ) || null,
            geradoEm:
                textoSeguro(
                    geradoEm
                ),
        },
    };
}

export function criarPayloadTentativaRecusadaCertidaoMensal({
    resultado,
    empresa,
    documento,
    competencia,
    usuarioId = null,
    geradoEm =
        new Date().toISOString(),
}) {
    const tentativa =
        resultado?.tentativaRecusada ||
        null;

    if (!tentativa) {
        throw new Error(
            "O resultado não possui tentativa recusada."
        );
    }

    const empresaId =
        textoSeguro(
            empresa?.id
        );

    if (!empresaId) {
        throw new Error(
            "A empresa selecionada não possui identificador."
        );
    }

    return {
        contratoVersao:
            CERTIDAO_MENSAL_VERSAO_CONTRATO,
        tipoEvento:
            CERTIDAO_MENSAL_EVENTO
                .DOCUMENTO_RECUSADO,
        empresaId,
        competencia:
            normalizarCompetenciaCertidaoMensal(
                competencia
            ),
        tipoDocumentoEsperado:
            normalizarCodigoTipoDocumentoCertidaoMensal(
                documento?.id ||
                documento?.tipoDocumento ||
                documento?.tipo_documento
            ),
        tentativa: {
            codigo:
                textoSeguro(
                    tentativa?.codigo
                ),
            nomeArquivo:
                textoSeguro(
                    tentativa
                        ?.nomeArquivo
                ),
            tamanhoBytes:
                numeroSeguro(
                    tentativa
                        ?.tamanhoBytes
                ),
            hashSha256:
                textoSeguro(
                    tentativa
                        ?.hashSha256
                ).toLowerCase(),
            documentoEsperado:
                textoSeguro(
                    tentativa
                        ?.documentoEsperado
                ),
            documentoIdentificado:
                textoSeguro(
                    tentativa
                        ?.documentoIdentificado
                ),
            classificacaoId:
                textoSeguro(
                    tentativa
                        ?.classificacaoId
                ),
            mensagem:
                textoSeguro(
                    tentativa
                        ?.mensagem
                ),
            recusadoEm:
                textoSeguro(
                    tentativa
                        ?.recusadoEm
                ) ||
                textoSeguro(
                    geradoEm
                ),
        },
        usuarioId:
            textoSeguro(
                usuarioId
            ) || null,
        geradoEm:
            textoSeguro(
                geradoEm
            ),
    };
}
