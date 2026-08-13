export const CERTIDAO_MENSAL_POLITICA_DOCUMENTAL =
    Object.freeze({
        COMPETENCIA_MENSAL:
            "COMPETENCIA_MENSAL",
        VALIDADE:
            "VALIDADE",
        AUTOMATICO:
            "AUTOMATICO",
    });

export const CERTIDAO_MENSAL_STATUS_EFETIVO =
    Object.freeze({
        PENDENTE:
            "PENDENTE",
        ENVIADO:
            "ENVIADO",
        EM_ANALISE:
            "EM_ANALISE",
        CONFORME:
            "CONFORME",
        NAO_CONFORME:
            "NAO_CONFORME",
        REENVIO_SOLICITADO:
            "REENVIO_SOLICITADO",
        VENCIDO:
            "VENCIDO",
        DISPENSADO:
            "DISPENSADO",
        AUTOMATICO:
            "AUTOMATICO",
        NAO_APLICAVEL:
            "NAO_APLICAVEL",
    });

const DOCUMENTOS = [
    {
        tipoDocumento:
            "cnd-federal",
        titulo:
            "CND Federal",
        origem:
            "UPLOAD",
        politica:
            CERTIDAO_MENSAL_POLITICA_DOCUMENTAL
                .VALIDADE,
    },
    {
        tipoDocumento:
            "cnd-estadual",
        titulo:
            "CND Estadual",
        origem:
            "UPLOAD",
        politica:
            CERTIDAO_MENSAL_POLITICA_DOCUMENTAL
                .VALIDADE,
    },
    {
        tipoDocumento:
            "cnd-municipal",
        titulo:
            "CND Municipal",
        origem:
            "UPLOAD",
        politica:
            CERTIDAO_MENSAL_POLITICA_DOCUMENTAL
                .VALIDADE,
    },
    {
        tipoDocumento:
            "crf-fgts",
        titulo:
            "CRF FGTS",
        origem:
            "UPLOAD",
        politica:
            CERTIDAO_MENSAL_POLITICA_DOCUMENTAL
                .VALIDADE,
    },
    {
        tipoDocumento:
            "fgts",
        titulo:
            "FGTS",
        origem:
            "UPLOAD",
        politica:
            CERTIDAO_MENSAL_POLITICA_DOCUMENTAL
                .COMPETENCIA_MENSAL,
    },
    {
        tipoDocumento:
            "cndt-trabalhista",
        titulo:
            "CNDT (Trabalhista)",
        origem:
            "UPLOAD",
        politica:
            CERTIDAO_MENSAL_POLITICA_DOCUMENTAL
                .VALIDADE,
    },
    {
        tipoDocumento:
            "falencia-concordata",
        titulo:
            "Falência e Concordata",
        origem:
            "UPLOAD",
        politica:
            CERTIDAO_MENSAL_POLITICA_DOCUMENTAL
                .VALIDADE,
    },
    {
        tipoDocumento:
            "cadastro-tce-ceis",
        titulo:
            "Cadastro TCE / CEIS",
        origem:
            "UPLOAD",
        politica:
            CERTIDAO_MENSAL_POLITICA_DOCUMENTAL
                .VALIDADE,
    },
    {
        tipoDocumento:
            "folha-pagamento",
        titulo:
            "Folha de Pagamento e Comprovantes",
        origem:
            "UPLOAD",
        politica:
            CERTIDAO_MENSAL_POLITICA_DOCUMENTAL
                .COMPETENCIA_MENSAL,
    },
    {
        tipoDocumento:
            "folha-ponto",
        titulo:
            "Espelho de Ponto",
        origem:
            "UPLOAD",
        politica:
            CERTIDAO_MENSAL_POLITICA_DOCUMENTAL
                .COMPETENCIA_MENSAL,
    },
    {
        tipoDocumento:
            "va-vt",
        titulo:
            "VA / VT",
        origem:
            "UPLOAD",
        politica:
            CERTIDAO_MENSAL_POLITICA_DOCUMENTAL
                .COMPETENCIA_MENSAL,
    },
    {
        tipoDocumento:
            "seguro-vida",
        titulo:
            "Seguro de Vida",
        origem:
            "UPLOAD",
        politica:
            CERTIDAO_MENSAL_POLITICA_DOCUMENTAL
                .VALIDADE,
    },
    {
        tipoDocumento:
            "inss-dctfweb",
        titulo:
            "INSS / DCTFWeb",
        origem:
            "UPLOAD",
        politica:
            CERTIDAO_MENSAL_POLITICA_DOCUMENTAL
                .COMPETENCIA_MENSAL,
    },
    {
        tipoDocumento:
            "iss",
        titulo:
            "ISSQN",
        origem:
            "UPLOAD",
        politica:
            CERTIDAO_MENSAL_POLITICA_DOCUMENTAL
                .VALIDADE,
    },
    {
        tipoDocumento:
            "esocial",
        titulo:
            "eSocial SST",
        origem:
            "UPLOAD",
        politica:
            CERTIDAO_MENSAL_POLITICA_DOCUMENTAL
                .COMPETENCIA_MENSAL,
    },
    {
        tipoDocumento:
            "relacao-empregados",
        titulo:
            "Relação de Empregados",
        origem:
            "SISTEMA",
        politica:
            CERTIDAO_MENSAL_POLITICA_DOCUMENTAL
                .AUTOMATICO,
    },
    {
        tipoDocumento:
            "aso-pcmso",
        titulo:
            "ASO + PCMSO",
        origem:
            "SISTEMA",
        politica:
            CERTIDAO_MENSAL_POLITICA_DOCUMENTAL
                .AUTOMATICO,
    },
];

export const CERTIDAO_MENSAL_DOCUMENTOS =
    Object.freeze(
        DOCUMENTOS.map(
            (documento) =>
                Object.freeze({
                    ...documento,
                }),
        ),
    );

export const CERTIDAO_MENSAL_DOCUMENTOS_EXTERNOS =
    Object.freeze(
        CERTIDAO_MENSAL_DOCUMENTOS.filter(
            (documento) =>
                documento.origem ===
                "UPLOAD",
        ),
    );

export const CERTIDAO_MENSAL_DOCUMENTOS_AUTOMATICOS =
    Object.freeze(
        CERTIDAO_MENSAL_DOCUMENTOS.filter(
            (documento) =>
                documento.origem ===
                "SISTEMA",
        ),
    );

const STATUS_CONFORMES =
    new Set([
        "CONFORME",
        "CONFIRMADO",
        "APROVADO",
    ]);

const STATUS_VALIDOS =
    new Set(
        Object.values(
            CERTIDAO_MENSAL_STATUS_EFETIVO,
        ),
    );

function textoSeguro(
    valor,
    limite = 300,
) {
    return String(
        valor ?? "",
    )
        .trim()
        .slice(
            0,
            limite,
        );
}

function objetoSeguro(
    valor,
) {
    return (
        valor &&
        typeof valor === "object" &&
        !Array.isArray(valor)
    )
        ? valor
        : {};
}

export function normalizarCompetenciaRegraMensal(
    valor,
) {
    const texto =
        textoSeguro(
            valor,
            30,
        );

    let correspondencia =
        /^(\d{4})-(0[1-9]|1[0-2])(?:-01)?$/
            .exec(
                texto,
            );

    if (correspondencia) {
        return (
            correspondencia[1] +
            "-" +
            correspondencia[2] +
            "-01"
        );
    }

    correspondencia =
        /^(0[1-9]|1[0-2])\/(\d{4})$/
            .exec(
                texto,
            );

    if (correspondencia) {
        return (
            correspondencia[2] +
            "-" +
            correspondencia[1] +
            "-01"
        );
    }

    throw new Error(
        "A competência deve usar MM/AAAA, AAAA-MM ou AAAA-MM-01.",
    );
}

export function obterUltimoDiaCompetencia(
    competencia,
) {
    const normalizada =
        normalizarCompetenciaRegraMensal(
            competencia,
        );

    const ano =
        Number(
            normalizada.slice(
                0,
                4,
            ),
        );

    const mes =
        Number(
            normalizada.slice(
                5,
                7,
            ),
        );

    const ultimoDia =
        new Date(
            Date.UTC(
                ano,
                mes,
                0,
            ),
        );

    return ultimoDia
        .toISOString()
        .slice(
            0,
            10,
        );
}

function normalizarDataIso(
    valor,
) {
    const texto =
        textoSeguro(
            valor,
            40,
        );

    const correspondencia =
        /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])/
            .exec(
                texto,
            );

    return correspondencia
        ? correspondencia[0]
        : "";
}

export function obterDefinicaoDocumentoCompetencia(
    tipoDocumento,
) {
    const tipo =
        textoSeguro(
            tipoDocumento,
            100,
        ).toLowerCase();

    const definicao =
        CERTIDAO_MENSAL_DOCUMENTOS.find(
            (documento) =>
                documento.tipoDocumento ===
                tipo,
        );

    if (!definicao) {
        throw new Error(
            `Tipo documental inválido: ${tipo || "vazio"}.`,
        );
    }

    return definicao;
}

export function normalizarStatusRegraCompetencia(
    valor,
) {
    const status =
        textoSeguro(
            valor,
            60,
        )
            .normalize(
                "NFD",
            )
            .replace(
                /[\u0300-\u036f]/g,
                "",
            )
            .replace(
                /[^A-Za-z0-9]+/g,
                "_",
            )
            .replace(
                /^_+|_+$/g,
                "",
            )
            .toUpperCase();

    if (
        STATUS_CONFORMES.has(
            status,
        )
    ) {
        return CERTIDAO_MENSAL_STATUS_EFETIVO
            .CONFORME;
    }

    return STATUS_VALIDOS.has(
        status,
    )
        ? status
        : CERTIDAO_MENSAL_STATUS_EFETIVO
            .PENDENTE;
}

const CODIGOS_REGRAS_TEMPORAIS_RECALCULADAS =
    new Set([
        "VALIDADE_DOCUMENTO",
    ]);

function resolverStatusTecnicoVersao({
    statusPersistido,
    politica,
    avaliacao,
    dataEmissao,
    dataValidade,
} = {}) {
    /*
     * EM_ANALISE mantém o comportamento técnico homologado.
     *
     * REENVIO_SOLICITADO somente pode ser reclassificado
     * documentalmente em itens regidos por VALIDADE.
     *
     * Documentos de COMPETENCIA_MENSAL permanecem presos ao
     * status operacional persistido.
     */
    const statusPermiteRecalculoTecnico =
        statusPersistido ===
            CERTIDAO_MENSAL_STATUS_EFETIVO
                .EM_ANALISE ||
        (
            politica ===
                CERTIDAO_MENSAL_POLITICA_DOCUMENTAL
                    .VALIDADE &&
            statusPersistido ===
                CERTIDAO_MENSAL_STATUS_EFETIVO
                    .REENVIO_SOLICITADO
        );

    if (!statusPermiteRecalculoTecnico) {
        return statusPersistido;
    }

    if (
        !dataEmissao ||
        !dataValidade
    ) {
        return statusPersistido;
    }

    const regras =
        Array.isArray(
            avaliacao?.regras,
        )
            ? avaliacao.regras
            : [];

    const regrasTecnicas =
        regras.filter(
            (regra) =>
                !CODIGOS_REGRAS_TEMPORAIS_RECALCULADAS
                    .has(
                        textoSeguro(
                            regra?.codigo,
                            80,
                        ).toUpperCase(),
                    ),
        );

    if (
        regrasTecnicas.length ===
        0
    ) {
        return statusPersistido;
    }

    const todasAprovadas =
        regrasTecnicas.every(
            (regra) =>
                textoSeguro(
                    regra?.status,
                    40,
                ).toUpperCase() ===
                "APROVADA",
        );

    return todasAprovadas
        ? CERTIDAO_MENSAL_STATUS_EFETIVO
            .CONFORME
        : statusPersistido;
}

function normalizarVersaoDocumento(
    valor,
    politica = "",
) {
    const versao =
        objetoSeguro(
            valor,
        );

    const item =
        objetoSeguro(
            versao.item,
        );

    const diagnostico =
        objetoSeguro(
            versao.diagnostico,
        );

    const avaliacao =
        objetoSeguro(
            diagnostico.avaliacao ||
            versao.avaliacao,
        );

    const dadosTemporais =
        objetoSeguro(
            avaliacao.dadosTemporais ||
            versao.dadosTemporais,
        );

    const tipoDocumento =
        textoSeguro(
            versao.tipoDocumento ||
            versao.tipo_documento ||
            item.tipoDocumento ||
            item.tipo_documento,
            100,
        ).toLowerCase();

    let competencia;

    const competenciaOriginal =
        versao.competenciaDocumento ||
        versao.competencia_documento ||
        versao.competencia ||
        item.competencia;

    try {
        competencia =
            normalizarCompetenciaRegraMensal(
                competenciaOriginal,
            );
    }
    catch {
        competencia =
            "";
    }

    const dataEmissao =
        normalizarDataIso(
            versao.dataEmissaoIso ||
            versao.data_emissao ||
            dadosTemporais.dataEmissaoIso,
        );

    const dataValidade =
        normalizarDataIso(
            versao.dataValidadeIso ||
            versao.data_validade ||
            dadosTemporais.dataValidadeIso,
        );

    const statusPersistido =
        normalizarStatusRegraCompetencia(
            versao.status ||
            versao.statusItem ||
            versao.status_resultado ||
            item.status,
        );

    const statusEfetivo =
        resolverStatusTecnicoVersao({
            statusPersistido,
            politica,
            avaliacao,
            dataEmissao,
            dataValidade,
        });

    return {
        tipoDocumento,
        competencia,
        status:
            statusEfetivo,
        versaoId:
            textoSeguro(
                versao.versaoId ||
                versao.id,
                60,
            ),
        numeroVersao:
            Number(
                versao.numeroVersao ||
                versao.numero_versao ||
                0,
            ) || 0,
        criadoEm:
            textoSeguro(
                versao.criadoEm ||
                versao.criado_em,
                60,
            ),
        dataEmissao,
        dataValidade,
        registroOriginal:
            versao,
    };
}

function compararVersoesMaisRecentes(
    a,
    b,
) {
    if (
        a.competencia !==
        b.competencia
    ) {
        return b.competencia.localeCompare(
            a.competencia,
        );
    }

    if (
        a.numeroVersao !==
        b.numeroVersao
    ) {
        return b.numeroVersao -
            a.numeroVersao;
    }

    return b.criadoEm.localeCompare(
        a.criadoEm,
    );
}

/*
 * Documentos controlados por VALIDADE podem possuir duas ou
 * mais certidões válidas na mesma competência.
 *
 * Exemplo:
 *
 *   Certidão A:
 *     emissão 19/01/2026
 *     validade 18/07/2026
 *
 *   Certidão B:
 *     emissão 10/07/2026
 *     validade futura
 *
 * Em JUL/2026 ambas intersectam a competência.
 * A referência efetiva deve ser a certidão de emissão mais
 * recente, sem excluir ou sobrescrever o histórico da anterior.
 *
 * Quando a data de emissão não estiver disponível, preservamos
 * o critério legado de competência, versão e criação.
 */
function compararVersoesValidadeMaisRecentes(
    a,
    b,
) {
    const emissaoA =
        normalizarDataIso(
            a?.dataEmissao,
        );

    const emissaoB =
        normalizarDataIso(
            b?.dataEmissao,
        );

    if (
        emissaoA &&
        emissaoB &&
        emissaoA !==
            emissaoB
    ) {
        return emissaoB.localeCompare(
            emissaoA,
        );
    }

    if (
        emissaoA &&
        !emissaoB
    ) {
        return -1;
    }

    if (
        !emissaoA &&
        emissaoB
    ) {
        return 1;
    }

    return compararVersoesMaisRecentes(
        a,
        b,
    );
}

function avaliarVersaoConforme(
    versao,
    definicao,
    competencia,
) {
    const primeiroDia =
        normalizarCompetenciaRegraMensal(
            competencia,
        );

    const ultimoDia =
        obterUltimoDiaCompetencia(
            competencia,
        );

    if (
        definicao.politica !==
            CERTIDAO_MENSAL_POLITICA_DOCUMENTAL
                .COMPETENCIA_MENSAL &&
        versao.dataEmissao &&
        versao.dataEmissao >
            ultimoDia
    ) {
        return {
            atende:
                false,
            motivo:
                "EMISSAO_POSTERIOR_A_COMPETENCIA",
        };
    }

    const statusPermiteClassificacaoVencido =
        versao.status ===
            CERTIDAO_MENSAL_STATUS_EFETIVO
                .CONFORME ||
        versao.status ===
            CERTIDAO_MENSAL_STATUS_EFETIVO
                .REENVIO_SOLICITADO;

    if (
        definicao.politica ===
            CERTIDAO_MENSAL_POLITICA_DOCUMENTAL
                .VALIDADE &&
        statusPermiteClassificacaoVencido &&
        versao.dataValidade &&
        versao.dataValidade <
            primeiroDia
    ) {
        return {
            atende:
                false,
            herdado:
                versao.competencia !==
                competencia,
            motivo:
                "DOCUMENTO_VENCIDO_ANTES_DA_COMPETENCIA",
            statusEfetivo:
                CERTIDAO_MENSAL_STATUS_EFETIVO
                    .VENCIDO,
        };
    }

    if (
        versao.status !==
        CERTIDAO_MENSAL_STATUS_EFETIVO
            .CONFORME
    ) {
        return {
            atende:
                false,
            motivo:
                "STATUS_NAO_CONFORME",
        };
    }

    if (
        definicao.politica ===
        CERTIDAO_MENSAL_POLITICA_DOCUMENTAL
            .COMPETENCIA_MENSAL
    ) {
        return versao.competencia ===
            competencia
            ? {
                atende:
                    true,
                herdado:
                    false,
                motivo:
                    "COMPETENCIA_MENSAL_CORRETA",
            }
            : {
                atende:
                    false,
                motivo:
                    "COMPETENCIA_MENSAL_DIVERGENTE",
            };
    }

    if (!versao.competencia) {
        return {
            atende:
                false,
            motivo:
                "DOCUMENTO_SEM_COMPETENCIA_DE_ORIGEM",
        };
    }

    if (
        versao.competencia >
            competencia &&
        !versao.dataEmissao
    ) {
        return {
            atende:
                false,
            motivo:
                "DOCUMENTO_POSTERIOR_SEM_EMISSAO_COMPROVADA",
        };
    }

    /*
     * Documentos com política de validade atendem uma competência
     * quando existe interseção entre:
     *
     *   [data de emissão, data de validade]
     *
     * e
     *
     *   [primeiro dia, último dia da competência].
     *
     * Assim, uma certidão válida até 22/03 atende MAR/2026.
     * Ela deixa de atender somente a partir de ABR/2026.
     */

    if (!versao.dataValidade) {
        return versao.competencia ===
            competencia
            ? {
                atende:
                    true,
                herdado:
                    false,
                motivo:
                    "DOCUMENTO_DA_COMPETENCIA_SEM_PROPAGACAO",
            }
            : {
                atende:
                    false,
                motivo:
                    "DOCUMENTO_SEM_VALIDADE_PROPAGAVEL",
            };
    }

    if (
        versao.dataValidade <
        primeiroDia
    ) {
        return {
            atende:
                false,
            motivo:
                "DOCUMENTO_VENCIDO_ANTES_DA_COMPETENCIA",
        };
    }

    const herdado =
        versao.competencia !==
        competencia;

    return {
        atende:
            true,
        herdado,
        motivo:
            herdado
                ? (
                    versao.competencia >
                    competencia
                        ? "DOCUMENTO_POSTERIOR_VALIDO_NA_COMPETENCIA"
                        : "DOCUMENTO_ANTERIOR_AINDA_VALIDO"
                )
                : "DOCUMENTO_DA_COMPETENCIA",
    };
}

export function criarItensExternosPendentesCompetencia() {
    return CERTIDAO_MENSAL_DOCUMENTOS_EXTERNOS.map(
        (documento) => ({
            tipoDocumento:
                documento.tipoDocumento,
            titulo:
                documento.titulo,
            origem:
                "UPLOAD",
            status:
                CERTIDAO_MENSAL_STATUS_EFETIVO
                    .PENDENTE,
            requerConsultaOficial:
                false,
            statusConsultaOficial:
                "NAO_APLICAVEL",
            versaoAtualId:
                null,
        }),
    );
}

export function resolverDocumentoNaCompetencia({
    tipoDocumento,
    competencia,
    versoes = [],
    itemPersistido = null,
    competenciaFechada = false,
} = {}) {
    const definicao =
        obterDefinicaoDocumentoCompetencia(
            tipoDocumento,
        );

    const competenciaNormalizada =
        normalizarCompetenciaRegraMensal(
            competencia,
        );

    const item =
        objetoSeguro(
            itemPersistido,
        );

    if (
        competenciaFechada &&
        Object.keys(item).length > 0
    ) {
        return {
            tipoDocumento:
                definicao.tipoDocumento,
            titulo:
                definicao.titulo,
            status:
                normalizarStatusRegraCompetencia(
                    item.status,
                ),
            origemResolucao:
                "HISTORICO_FECHADO",
            herdado:
                Boolean(
                    item.herdado ||
                    item.versaoOrigemId,
                ),
            versao:
                item.versao ||
                null,
            motivo:
                "COMPETENCIA_FECHADA_PRESERVADA",
        };
    }

    if (
        definicao.politica ===
        CERTIDAO_MENSAL_POLITICA_DOCUMENTAL
            .AUTOMATICO
    ) {
        return {
            tipoDocumento:
                definicao.tipoDocumento,
            titulo:
                definicao.titulo,
            status:
                normalizarStatusRegraCompetencia(
                    item.status ||
                    CERTIDAO_MENSAL_STATUS_EFETIVO
                        .AUTOMATICO,
                ),
            origemResolucao:
                "SISTEMA",
            herdado:
                false,
            versao:
                null,
            motivo:
                "ITEM_AUTOMATICO",
        };
    }

    const compararCandidatas =
        definicao.politica ===
            CERTIDAO_MENSAL_POLITICA_DOCUMENTAL
                .VALIDADE
            ? compararVersoesValidadeMaisRecentes
            : compararVersoesMaisRecentes;

    const candidatas =
        (Array.isArray(versoes)
            ? versoes
            : [])
            .map(
                (versao) =>
                    normalizarVersaoDocumento(
                        versao,
                        definicao.politica,
                    ),
            )
            .filter(
                (versao) =>
                    versao.tipoDocumento ===
                    definicao.tipoDocumento,
            )
            .sort(
                compararCandidatas,
            );

    /*
     * SAFESCAN-VALIDADE-DOCUMENTO-MAIS-RECENTE-20260811
     *
     * Para documentos regidos por VALIDADE, o documento corrente
     * é definido pela emissão documental mais recente aplicável
     * à competência consultada.
     *
     * O status NÃO é promovido artificialmente para CONFORME.
     * Uma certidão recém-enviada pode continuar EM_ANALISE.
     *
     * Isso impede que uma certidão antiga CONFORME reapareça
     * somente porque a renovação mais recente ainda depende
     * de conferência humana.
     */
    if (
        definicao.politica ===
            CERTIDAO_MENSAL_POLITICA_DOCUMENTAL
                .VALIDADE &&
        candidatas.length > 0
    ) {
        const candidatasAplicaveis =
            candidatas.filter(
                (candidata) => {
                    /*
                     * Uma versão armazenada em competência futura
                     * não pode alterar retroativamente competência
                     * anterior.
                     */
                    if (
                        candidata.competencia &&
                        candidata.competencia >
                            competenciaNormalizada &&
                        !candidata.dataEmissao
                    ) {
                        return false;
                    }

                    const avaliacaoCandidata =
                        avaliarVersaoConforme(
                            candidata,
                            definicao,
                            competenciaNormalizada,
                        );

                    return (
                        avaliacaoCandidata.motivo !==
                        "EMISSAO_POSTERIOR_A_COMPETENCIA"
                    );
                }
            );

        if (
            candidatasAplicaveis.length === 0
        ) {
            return {
                tipoDocumento:
                    definicao.tipoDocumento,
                titulo:
                    definicao.titulo,
                status:
                    "PENDENTE",
                origemResolucao:
                    "SEM_DOCUMENTO_APLICAVEL",
                herdado:
                    false,
                versao:
                    null,
                motivo:
                    "EMISSAO_POSTERIOR_A_COMPETENCIA",
            };
        }

        /*
         * `candidatas` já está ordenado pelo comparador
         * específico de VALIDADE, que prioriza emissão.
         */
        /*
         * SAFESCAN-VALIDADE-EMPATE-PREFERE-COMPETENCIA-ALVO-D13
         *
         * A emissão documental continua sendo o critério principal.
         * Em empate de emissão, uma candidata pertencente à própria
         * competência consultada deve prevalecer sobre cópias da
         * mesma referência armazenadas em competências diferentes.
         */
        /*
         * SAFESCAN-VALIDADE-DUPLICATA-HASH-NAO-FUTURA-D14
         *
         * A emissão continua sendo o critério documental principal.
         *
         * Quando a candidata mais recente possui uma cópia byte a byte
         * idêntica, identificada pelo SHA-256, armazenada em competência
         * que não está no futuro da competência consultada, essa ocorrência
         * não futura deve prevalecer sobre a cópia futura.
         *
         * Hashes diferentes não são tratados como o mesmo documento,
         * mesmo quando a data de emissão coincide.
         */
        const candidataMaisRecente =
            candidatasAplicaveis[0];

        const emissaoMaisRecente =
            candidataMaisRecente
                ?.dataEmissao ||
            "";

        const obterHashCandidata =
            (candidata) =>
                textoSeguro(
                    candidata
                        ?.registroOriginal
                        ?.hash_sha256 ||
                    candidata
                        ?.registroOriginal
                        ?.hashSha256,
                    128,
                ).toLowerCase();

        const hashMaisRecente =
            obterHashCandidata(
                candidataMaisRecente,
            );

        const candidataMesmaEmissaoDaCompetencia =
            emissaoMaisRecente
                ? (
                    candidatasAplicaveis.find(
                        (candidata) =>
                            candidata.dataEmissao ===
                                emissaoMaisRecente &&
                            candidata.competencia ===
                                competenciaNormalizada,
                    ) ||
                    null
                )
                : null;

        const candidataDuplicataNaoFutura =
            hashMaisRecente &&
            emissaoMaisRecente
                ? (
                    candidatasAplicaveis.find(
                        (candidata) =>
                            candidata.dataEmissao ===
                                emissaoMaisRecente &&
                            Boolean(
                                candidata.competencia
                            ) &&
                            candidata.competencia <=
                                competenciaNormalizada &&
                            obterHashCandidata(
                                candidata
                            ) ===
                                hashMaisRecente,
                    ) ||
                    null
                )
                : null;

        const atualValidade =
            candidataMesmaEmissaoDaCompetencia ||
            candidataDuplicataNaoFutura ||
            candidataMaisRecente;

        const avaliacaoAtualValidade =
            avaliarVersaoConforme(
                atualValidade,
                definicao,
                competenciaNormalizada,
            );

        const herdadoValidade =
            atualValidade.competencia !==
            competenciaNormalizada;

        const origemValidade =
            herdadoValidade
                ? "COMPETENCIA_ANTERIOR"
                : "COMPETENCIA_ATUAL";

        if (
            avaliacaoAtualValidade.atende
        ) {
            return {
                tipoDocumento:
                    definicao.tipoDocumento,
                titulo:
                    definicao.titulo,
                status:
                    CERTIDAO_MENSAL_STATUS_EFETIVO
                        .CONFORME,
                origemResolucao:
                    origemValidade,
                herdado:
                    herdadoValidade,
                versao:
                    atualValidade
                        .registroOriginal,
                motivo:
                    avaliacaoAtualValidade
                        .motivo,
            };
        }

        const statusAtualValidade =
            avaliacaoAtualValidade
                .statusEfetivo ||
            (
                atualValidade.status ===
                    CERTIDAO_MENSAL_STATUS_EFETIVO
                        .CONFORME
                    ? CERTIDAO_MENSAL_STATUS_EFETIVO
                        .VENCIDO
                    : atualValidade.status
            ) ||
            "PENDENTE";

        return {
            tipoDocumento:
                definicao.tipoDocumento,
            titulo:
                definicao.titulo,
            status:
                statusAtualValidade,
            origemResolucao:
                origemValidade,
            herdado:
                herdadoValidade,
            versao:
                atualValidade
                    .registroOriginal,
            motivo:
                avaliacaoAtualValidade
                    .motivo,
        };
    }
    const candidatasDaCompetencia =
        candidatas.filter(
            (versao) =>
                versao.competencia ===
                competenciaNormalizada,
        );

    let fallbackCompetenciaAtual =
        null;

    if (
        candidatasDaCompetencia.length > 0
    ) {
        const atual =
            candidatasDaCompetencia[0];

        const avaliacao =
            avaliarVersaoConforme(
                atual,
                definicao,
                competenciaNormalizada,
            );

        if (avaliacao.atende) {
            return {
                tipoDocumento:
                    definicao.tipoDocumento,
                titulo:
                    definicao.titulo,
                status:
                    CERTIDAO_MENSAL_STATUS_EFETIVO
                        .CONFORME,
                origemResolucao:
                    "COMPETENCIA_ATUAL",
                herdado:
                    false,
                versao:
                    atual.registroOriginal,
                motivo:
                    avaliacao.motivo,
            };
        }

        if (
            avaliacao.motivo ===
            "EMISSAO_POSTERIOR_A_COMPETENCIA"
        ) {
            fallbackCompetenciaAtual = {
                tipoDocumento:
                    definicao.tipoDocumento,
                titulo:
                    definicao.titulo,
                status:
                    "PENDENTE",
                origemResolucao:
                    "SEM_DOCUMENTO_APLICAVEL",
                herdado:
                    false,
                versao:
                    null,
                motivo:
                    avaliacao.motivo,
            };
        }
        else {
            const statusAtual =
                avaliacao.statusEfetivo ||
                (
                    atual.status ===
                        CERTIDAO_MENSAL_STATUS_EFETIVO
                            .CONFORME
                        ? CERTIDAO_MENSAL_STATUS_EFETIVO
                            .VENCIDO
                        : atual.status
                );

            fallbackCompetenciaAtual = {
                tipoDocumento:
                    definicao.tipoDocumento,
                titulo:
                    definicao.titulo,
                status:
                    statusAtual,
                origemResolucao:
                    "COMPETENCIA_ATUAL",
                herdado:
                    false,
                versao:
                    atual.registroOriginal,
                motivo:
                    avaliacao.motivo,
            };
        }

        /*
         * Documentos mensais mantêm a regra histórica:
         * a versão da própria competência continua soberana.
         *
         * Documentos regidos por VALIDADE seguem adiante para
         * procurar uma certidão válida mais recente. Somente se
         * nenhuma outra versão atender é que este fallback será
         * utilizado.
         */
        if (
            definicao.politica !==
            CERTIDAO_MENSAL_POLITICA_DOCUMENTAL
                .VALIDADE
        ) {
            return fallbackCompetenciaAtual;
        }
    }

    if (
        definicao.politica ===
        CERTIDAO_MENSAL_POLITICA_DOCUMENTAL
            .VALIDADE
    ) {
        for (const candidata of candidatas) {
            const avaliacao =
                avaliarVersaoConforme(
                    candidata,
                    definicao,
                    competenciaNormalizada,
                );

            if (
                avaliacao.atende &&
                avaliacao.herdado
            ) {
                return {
                    tipoDocumento:
                        definicao.tipoDocumento,
                    titulo:
                        definicao.titulo,
                    status:
                        CERTIDAO_MENSAL_STATUS_EFETIVO
                            .CONFORME,
                    origemResolucao:
                        candidata.competencia >
                            competenciaNormalizada
                            ? "COMPETENCIA_POSTERIOR_POR_VALIDADE"
                            : "COMPETENCIA_ANTERIOR",
                    herdado:
                        true,
                    versao:
                        candidata.registroOriginal,
                    motivo:
                        avaliacao.motivo,
                };
            }
        }
    }

    /*
     * Se nenhuma certidão válida mais recente foi encontrada,
     * preserva-se a versão própria já existente como fallback.
     */
    if (fallbackCompetenciaAtual) {
        return fallbackCompetenciaAtual;
    }

    if (
        definicao.politica ===
        CERTIDAO_MENSAL_POLITICA_DOCUMENTAL
            .VALIDADE
    ) {
        for (
            const candidata of
            candidatas
        ) {
            const avaliacaoVencimento =
                avaliarVersaoConforme(
                    candidata,
                    definicao,
                    competenciaNormalizada,
                );

            if (
                avaliacaoVencimento
                    .statusEfetivo ===
                CERTIDAO_MENSAL_STATUS_EFETIVO
                    .VENCIDO
            ) {
                return {
                    tipoDocumento:
                        definicao.tipoDocumento,
                    titulo:
                        definicao.titulo,
                    status:
                        CERTIDAO_MENSAL_STATUS_EFETIVO
                            .VENCIDO,
                    origemResolucao:
                        "DOCUMENTO_EXPIRADO",
                    herdado:
                        candidata.competencia !==
                        competenciaNormalizada,
                    versao:
                        candidata.registroOriginal,
                    motivo:
                        avaliacaoVencimento
                            .motivo,
                };
            }
        }
    }

    return {
        tipoDocumento:
            definicao.tipoDocumento,
        titulo:
            definicao.titulo,
        status:
            normalizarStatusRegraCompetencia(
                item.status ||
                CERTIDAO_MENSAL_STATUS_EFETIVO
                    .PENDENTE,
            ),
        origemResolucao:
            "SEM_EVIDENCIA_APLICAVEL",
        herdado:
            false,
        versao:
            null,
        motivo:
            "DOCUMENTO_NAO_APRESENTADO",
    };
}

export function montarChecklistEfetivoCompetencia({
    competencia,
    versoes = [],
    itensPersistidos = [],
    competenciaFechada = false,
} = {}) {
    const itensPorTipo =
        new Map(
            (Array.isArray(itensPersistidos)
                ? itensPersistidos
                : [])
                .map(
                    (item) => [
                        textoSeguro(
                            item?.tipoDocumento ||
                            item?.tipo_documento,
                            100,
                        ).toLowerCase(),
                        item,
                    ],
                ),
        );

    return CERTIDAO_MENSAL_DOCUMENTOS.map(
        (documento) =>
            resolverDocumentoNaCompetencia({
                tipoDocumento:
                    documento.tipoDocumento,
                competencia,
                versoes,
                itemPersistido:
                    itensPorTipo.get(
                        documento.tipoDocumento,
                    ) || null,
                competenciaFechada,
            }),
    );
}

export function listarPendenciasCobraveisCompetencia(
    checklist,
) {
    const statusNaoCobraveis =
        new Set([
            CERTIDAO_MENSAL_STATUS_EFETIVO
                .CONFORME,
            CERTIDAO_MENSAL_STATUS_EFETIVO
                .DISPENSADO,
            CERTIDAO_MENSAL_STATUS_EFETIVO
                .AUTOMATICO,
            CERTIDAO_MENSAL_STATUS_EFETIVO
                .NAO_APLICAVEL,
        ]);

    return (Array.isArray(checklist)
        ? checklist
        : [])
        .filter(
            (item) => {
                const definicao =
                    obterDefinicaoDocumentoCompetencia(
                        item?.tipoDocumento,
                    );

                return (
                    definicao.origem ===
                        "UPLOAD" &&
                    !statusNaoCobraveis.has(
                        normalizarStatusRegraCompetencia(
                            item?.status,
                        ),
                    )
                );
            },
        );
}
