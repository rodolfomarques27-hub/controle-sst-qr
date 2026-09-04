import { treinamentosBase } from "../../../constants/treinamentosConstants.js";
import {
    avaliarTreinamentosColaborador,
    calcularVencimentoTreinamento,
    statusDocumento,
} from "../../../services/colaboradorDocumentosService.js";

export const CONSOLIDACAO_COLABORADOR_STRUCTURE_SCHEMA_VERSION =
    "consolidacao-colaborador-structure-v1";

export const CONSOLIDACAO_COLABORADOR_OBRA_STATUS =
    Object.freeze({
        RESOLVIDA_EXPLICITA:
            "RESOLVIDA_EXPLICITA",
        RESOLVIDA_UNICA:
            "RESOLVIDA_UNICA",
        SEM_OBRA_ATIVA:
            "SEM_OBRA_ATIVA",
        AMBIGUA:
            "AMBIGUA",
        CONTEXTO_INVALIDO:
            "CONTEXTO_INVALIDO",
    });

export const CONSOLIDACAO_COLABORADOR_CATEGORIAS =
    Object.freeze({
        DOCUMENTOS_PESSOAIS:
            Object.freeze({
                chave:
                    "DOCUMENTOS_PESSOAIS",
                rotulo:
                    "Documentos pessoais / cadastrais",
                pasta:
                    "01_DOCUMENTOS_PESSOAIS",
                ordem:
                    1,
            }),

        ASO:
            Object.freeze({
                chave:
                    "ASO",
                rotulo:
                    "ASO",
                pasta:
                    "02_ASO",
                ordem:
                    2,
            }),

        ORDEM_DE_SERVICO:
            Object.freeze({
                chave:
                    "ORDEM_DE_SERVICO",
                rotulo:
                    "Ordem de Serviço",
                pasta:
                    "03_ORDEM_DE_SERVICO",
                ordem:
                    3,
            }),

        EPI:
            Object.freeze({
                chave:
                    "EPI",
                rotulo:
                    "Ficha de EPI",
                pasta:
                    "04_EPI",
                ordem:
                    4,
            }),

        TREINAMENTOS:
            Object.freeze({
                chave:
                    "TREINAMENTOS",
                rotulo:
                    "Treinamentos",
                pasta:
                    "05_TREINAMENTOS",
                ordem:
                    5,
            }),
    });

function textoSeguro(valor = "") {
    return String(
        valor ?? ""
    ).trim();
}

function chaveTexto(valor = "") {
    return textoSeguro(
        valor
    )
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .toLowerCase()
        .replace(
            /[^a-z0-9]+/g,
            "_"
        )
        .replace(
            /^_+|_+$/g,
            ""
        );
}

function codigoTreinamentoSeguro(
    valor
) {
    const numero =
        Number(
            valor
        );

    return (
        Number.isInteger(numero) &&
        numero > 0
    )
        ? numero
        : null;
}

function obterTreinamentoCatalogo(
    codigo
) {
    const id =
        codigoTreinamentoSeguro(
            codigo
        );

    if (!id) {
        return null;
    }

    return (
        treinamentosBase.find(
            (item) =>
                Number(item?.id) ===
                id
        ) ||
        null
    );
}

export function obterCategoriaConsolidacaoPorCodigo(
    codigo
) {
    const id =
        codigoTreinamentoSeguro(
            codigo
        );

    if (id === 21) {
        return CONSOLIDACAO_COLABORADOR_CATEGORIAS
            .DOCUMENTOS_PESSOAIS;
    }

    if (id === 22) {
        return CONSOLIDACAO_COLABORADOR_CATEGORIAS
            .ASO;
    }

    if (id === 15) {
        return CONSOLIDACAO_COLABORADOR_CATEGORIAS
            .ORDEM_DE_SERVICO;
    }

    if (id === 14) {
        return CONSOLIDACAO_COLABORADOR_CATEGORIAS
            .EPI;
    }

    return CONSOLIDACAO_COLABORADOR_CATEGORIAS
        .TREINAMENTOS;
}

function reduzirStatusTemporal(
    status = {}
) {
    return {
        chave:
            textoSeguro(
                status?.chave
            ) ||
            "indefinido",

        texto:
            textoSeguro(
                status?.texto
            ) ||
            "Indefinido",
    };
}

function obterStatusTemporalDocumento({
    certificado = {},
    treinamentoCatalogo = null,
} = {}) {
    if (
        treinamentoCatalogo
    ) {
        const semValidade =
            treinamentoCatalogo
                .validadePadrao ===
                null ||
            Number(
                treinamentoCatalogo
                    .validadePadrao
            ) === 0;

        return reduzirStatusTemporal(
            statusDocumento(
                certificado?.vencimento ||
                    "",
                semValidade
            )
        );
    }

    /*
     * Fail-closed:
     *
     * Código desconhecido nunca herda o fallback
     * genérico de 365 dias de obterTreinamento().
     *
     * Se existe vencimento persistido, podemos
     * avaliar somente aquela data real.
     */
    if (
        textoSeguro(
            certificado?.vencimento
        )
    ) {
        return reduzirStatusTemporal(
            statusDocumento(
                certificado.vencimento,
                false
            )
        );
    }

    return {
        chave:
            "regra_nao_reconhecida",
        texto:
            "Regra não reconhecida",
    };
}

function criarAlerta({
    codigo,
    nivel = "informacao",
    mensagem,
    certificadoId = null,
    treinamentoCodigo = null,
} = {}) {
    return {
        codigo:
            textoSeguro(
                codigo
            ),

        nivel:
            textoSeguro(
                nivel
            ) ||
            "informacao",

        mensagem:
            textoSeguro(
                mensagem
            ),

        certificadoId:
            certificadoId ||
            null,

        treinamentoCodigo:
            codigoTreinamentoSeguro(
                treinamentoCodigo
            ),
    };
}

function normalizarVerificacao(
    item = {}
) {
    return {
        id:
            item?.id ||
            null,

        statusVerificacao:
            textoSeguro(
                item?.status_verificacao ||
                item?.statusVerificacao
            ),

        nivelRisco:
            textoSeguro(
                item?.nivel_risco ||
                item?.nivelRisco
            ),

        scoreRisco:
            Number.isFinite(
                Number(
                    item?.score_risco ??
                    item?.scoreRisco
                )
            )
                ? Number(
                    item?.score_risco ??
                    item?.scoreRisco
                )
                : null,

        resumo:
            textoSeguro(
                item?.resumo
            ),

        origemAnalise:
            textoSeguro(
                item?.origem_analise ||
                item?.origemAnalise
            ),

        createdAt:
            textoSeguro(
                item?.created_at ||
                item?.createdAt
            ),

        updatedAt:
            textoSeguro(
                item?.updated_at ||
                item?.updatedAt
            ),
    };
}

function criarIndiceVerificacoes(
    verificacoes = []
) {
    const indice =
        new Map();

    const ordenadas =
        (
            Array.isArray(
                verificacoes
            )
                ? verificacoes
                : []
        )
            .filter(Boolean)
            .sort(
                (a, b) => {
                    const dataA =
                        textoSeguro(
                            a?.created_at ||
                            a?.createdAt
                        );

                    const dataB =
                        textoSeguro(
                            b?.created_at ||
                            b?.createdAt
                        );

                    return dataB.localeCompare(
                        dataA
                    );
                }
            );

    ordenadas.forEach(
        (item) => {
            const documentoId =
                textoSeguro(
                    item?.documento_id ||
                    item?.documentoId
                );

            if (
                !documentoId ||
                indice.has(
                    documentoId
                )
            ) {
                return;
            }

            indice.set(
                documentoId,
                normalizarVerificacao(
                    item
                )
            );
        }
    );

    return indice;
}

function normalizarEvidencia(
    item = {}
) {
    const arquivoUrl =
        textoSeguro(
            item?.arquivoUrl ||
            item?.arquivo_url
        );

    const historica =
        item?.historica === true;

    const reconhecida =
        item?.tipoEvidenciaReconhecido !==
        false;

    return {
        id:
            item?.id ||
            null,

        certificadoOrigemId:
            item?.certificadoOrigemId ||
            item?.certificado_origem_id ||
            null,

        treinamentoCodigo:
            codigoTreinamentoSeguro(
                item?.treinamentoCodigo ??
                item?.treinamento_codigo
            ),

        tipoEvidencia:
            textoSeguro(
                item?.tipoEvidencia ||
                item?.tipo_evidencia
            ),

        tipoEvidenciaReconhecido:
            reconhecida,

        principal:
            item?.principal === true,

        historica,

        arquivoUrl,

        arquivoNomeOriginal:
            textoSeguro(
                item?.arquivoNome ||
                item?.arquivo_nome
            ),

        arquivoSha256:
            textoSeguro(
                item?.arquivoSha256 ||
                item?.arquivo_sha256
            ),

        arquivoSubstitutoUrl:
            textoSeguro(
                item?.arquivoSubstitutoUrl ||
                item?.arquivo_substituto_url
            ),

        origem:
            textoSeguro(
                item?.origem
            ),

        bucket:
            "certificados-treinamentos",

        selecionavel:
            Boolean(
                arquivoUrl
            ) &&
            !historica,

        selecionadoPadrao:
            Boolean(
                arquivoUrl
            ) &&
            !historica,
    };
}

function chaveFisicaEvidencia(
    evidencia = {}
) {
    if (
        evidencia
            .arquivoSha256
    ) {
        return (
            "sha256:" +
            evidencia
                .arquivoSha256
        );
    }

    if (
        evidencia
            .arquivoUrl
    ) {
        return (
            "url:" +
            evidencia
                .arquivoUrl
        );
    }

    if (
        evidencia.id
    ) {
        return (
            "id:" +
            evidencia.id
        );
    }

    return "";
}

function criarMapaEvidencias(
    evidencias = []
) {
    const mapa =
        new Map();

    (
        Array.isArray(
            evidencias
        )
            ? evidencias
            : []
    )
        .filter(Boolean)
        .filter(
            (item) =>
                item?.historica !==
                true
        )
        .forEach(
            (item) => {
                const evidencia =
                    normalizarEvidencia(
                        item
                    );

                const certificadoId =
                    textoSeguro(
                        evidencia
                            .certificadoOrigemId
                    );

                if (
                    !certificadoId
                ) {
                    return;
                }

                const atuais =
                    mapa.get(
                        certificadoId
                    ) ||
                    [];

                const chave =
                    chaveFisicaEvidencia(
                        evidencia
                    );

                const duplicada =
                    Boolean(
                        chave
                    ) &&
                    atuais.some(
                        (registro) =>
                            chaveFisicaEvidencia(
                                registro
                            ) ===
                            chave
                    );

                if (
                    !duplicada
                ) {
                    atuais.push(
                        evidencia
                    );
                }

                mapa.set(
                    certificadoId,
                    atuais
                );
            }
        );

    return mapa;
}

function criarEvidenciaFallbackCertificado(
    certificado = {}
) {
    const arquivoUrl =
        textoSeguro(
            certificado
                ?.arquivoUrl
        );

    if (
        !arquivoUrl
    ) {
        return null;
    }

    return {
        id:
            `fallback-certificado-${certificado.id}`,

        certificadoOrigemId:
            certificado?.id ||
            null,

        treinamentoCodigo:
            codigoTreinamentoSeguro(
                certificado
                    ?.treinamentoId
            ),

        tipoEvidencia:
            "documento_principal_legado",

        tipoEvidenciaReconhecido:
            true,

        principal:
            true,

        historica:
            false,

        arquivoUrl,

        arquivoNomeOriginal:
            textoSeguro(
                certificado
                    ?.arquivo
            ),

        arquivoSha256:
            "",

        arquivoSubstitutoUrl:
            "",

        origem:
            "certificados_fallback",

        bucket:
            "certificados-treinamentos",

        selecionavel:
            true,

        selecionadoPadrao:
            true,

        fallbackControlado:
            true,
    };
}

function obterEvidenciasDocumento({
    certificado = {},
    mapaEvidencias,
} = {}) {
    const certificadoId =
        textoSeguro(
            certificado?.id
        );

    const atuais =
        certificadoId
            ? (
                mapaEvidencias.get(
                    certificadoId
                ) ||
                []
            )
            : [];

    if (
        atuais.length > 0
    ) {
        return atuais;
    }

    const fallback =
        criarEvidenciaFallbackCertificado(
            certificado
        );

    return fallback
        ? [fallback]
        : [];
}

function normalizarVinculoObra(
    vinculo = {}
) {
    const obra =
        vinculo?.obra ||
        vinculo?.obras ||
        {};

    const id =
        textoSeguro(
            obra?.id ||
            vinculo?.obra_id ||
            vinculo?.obraId
        );

    const statusVinculo =
        chaveTexto(
            vinculo?.status
        );

    const statusObra =
        chaveTexto(
            obra?.status
        );

    return {
        vinculoId:
            vinculo?.id ||
            null,

        id:
            id ||
            null,

        nome:
            textoSeguro(
                obra?.nome
            ) ||
            "Obra sem nome",

        status:
            textoSeguro(
                obra?.status
            ),

        tipoVinculo:
            textoSeguro(
                vinculo?.tipo_vinculo ||
                vinculo?.tipoVinculo
            ),

        ativo:
            statusVinculo ===
                "ativa" &&
            statusObra ===
                "ativa",
    };
}

function deduplicarObras(
    vinculos = []
) {
    const mapa =
        new Map();

    (
        Array.isArray(
            vinculos
        )
            ? vinculos
            : []
    )
        .map(
            normalizarVinculoObra
        )
        .filter(
            (item) =>
                Boolean(
                    item.id
                )
        )
        .forEach(
            (item) => {
                const existente =
                    mapa.get(
                        item.id
                    );

                if (
                    !existente ||
                    (
                        item.ativo &&
                        !existente.ativo
                    )
                ) {
                    mapa.set(
                        item.id,
                        item
                    );
                }
            }
        );

    return Array.from(
        mapa.values()
    );
}

export function resolverObraConsolidacaoColaborador({
    vinculosObra = [],
    obraContextoId = null,
} = {}) {
    const todas =
        deduplicarObras(
            vinculosObra
        );

    const ativas =
        todas.filter(
            (item) =>
                item.ativo
        );

    const contexto =
        textoSeguro(
            obraContextoId
        );

    if (
        contexto
    ) {
        const encontrada =
            todas.find(
                (item) =>
                    item.id ===
                    contexto
            );

        if (
            encontrada?.ativo
        ) {
            return {
                status:
                    CONSOLIDACAO_COLABORADOR_OBRA_STATUS
                        .RESOLVIDA_EXPLICITA,

                id:
                    encontrada.id,

                nome:
                    encontrada.nome,

                origemResolucao:
                    "contexto_explicito",

                candidatos:
                    ativas,
            };
        }

        return {
            status:
                CONSOLIDACAO_COLABORADOR_OBRA_STATUS
                    .CONTEXTO_INVALIDO,

            id:
                null,

            nome:
                null,

            origemResolucao:
                "contexto_explicito_invalido",

            candidatos:
                ativas,
        };
    }

    if (
        ativas.length === 0
    ) {
        return {
            status:
                CONSOLIDACAO_COLABORADOR_OBRA_STATUS
                    .SEM_OBRA_ATIVA,

            id:
                null,

            nome:
                null,

            origemResolucao:
                "sem_vinculo_ativo",

            candidatos:
                [],
        };
    }

    if (
        ativas.length === 1
    ) {
        return {
            status:
                CONSOLIDACAO_COLABORADOR_OBRA_STATUS
                    .RESOLVIDA_UNICA,

            id:
                ativas[0].id,

            nome:
                ativas[0].nome,

            origemResolucao:
                "vinculo_unico",

            candidatos:
                ativas,
        };
    }

    return {
        status:
            CONSOLIDACAO_COLABORADOR_OBRA_STATUS
                .AMBIGUA,

        id:
            null,

        nome:
            null,

        origemResolucao:
            "multiplos_vinculos_ativos",

        candidatos:
            ativas,
    };
}

function criarAlertasStatusTemporal({
    statusTemporal,
    certificadoId,
    treinamentoCodigo,
    nomeDocumento,
} = {}) {
    const chave =
        textoSeguro(
            statusTemporal?.chave
        );

    if (
        chave ===
        "vencido"
    ) {
        return [
            criarAlerta({
                codigo:
                    "DOCUMENTO_VENCIDO",
                nivel:
                    "critico",
                mensagem:
                    `${nomeDocumento} está vencido.`,
                certificadoId,
                treinamentoCodigo,
            }),
        ];
    }

    if (
        chave ===
        "vencendo"
    ) {
        return [
            criarAlerta({
                codigo:
                    "DOCUMENTO_A_VENCER",
                nivel:
                    "atencao",
                mensagem:
                    `${nomeDocumento} está a vencer em até 30 dias.`,
                certificadoId,
                treinamentoCodigo,
            }),
        ];
    }

    if (
        chave ===
        "semdata"
    ) {
        return [
            criarAlerta({
                codigo:
                    "DOCUMENTO_SEM_DATA",
                nivel:
                    "atencao",
                mensagem:
                    `${nomeDocumento} não possui data de vencimento utilizável.`,
                certificadoId,
                treinamentoCodigo,
            }),
        ];
    }

    if (
        chave ===
        "regra_nao_reconhecida"
    ) {
        return [
            criarAlerta({
                codigo:
                    "REGRA_DOCUMENTAL_NAO_RECONHECIDA",
                nivel:
                    "atencao",
                mensagem:
                    `${nomeDocumento} não possui regra de validade reconhecida pelo catálogo atual.`,
                certificadoId,
                treinamentoCodigo,
            }),
        ];
    }

    return [];
}

function criarAlertaVerificacao({
    verificacao,
    certificadoId,
    treinamentoCodigo,
    nomeDocumento,
} = {}) {
    if (
        !verificacao
    ) {
        return [];
    }

    const chave =
        chaveTexto(
            verificacao
                .statusVerificacao
        );

    if (
        !chave ||
        [
            "aprovado",
            "aprovada",
            "conforme",
            "ok",
        ].includes(
            chave
        )
    ) {
        return [];
    }

    const nivel =
        (
            chave.includes(
                "bloque"
            ) ||
            chave.includes(
                "suspeit"
            )
        )
            ? "critico"
            : "atencao";

    return [
        criarAlerta({
            codigo:
                "VERIFICACAO_DOCUMENTAL_REQUER_ATENCAO",
            nivel,
            mensagem:
                `${nomeDocumento}: conferência documental em "${verificacao.statusVerificacao}".`,
            certificadoId,
            treinamentoCodigo,
        }),
    ];
}

function criarDocumentoEstrutura({
    certificado,
    obrigatoriosMatriz,
    adicionaisEnviados,
    mapaEvidencias,
    indiceVerificacoes,
} = {}) {
    const treinamentoCodigo =
        codigoTreinamentoSeguro(
            certificado
                ?.treinamentoId
        );

    const treinamentoCatalogo =
        obterTreinamentoCatalogo(
            treinamentoCodigo
        );

    const categoria =
        obterCategoriaConsolidacaoPorCodigo(
            treinamentoCodigo
        );

    const nomeDocumento =
        textoSeguro(
            treinamentoCatalogo
                ?.nome
        ) ||
        textoSeguro(
            certificado
                ?.nomeTreinamento
        ) ||
        textoSeguro(
            certificado
                ?.tipoTreinamento
        ) ||
        "Documento não identificado";

    /*
     * ============================================================
     * C8B — VENCIMENTO EFETIVO DERIVADO DO CATÁLOGO
     * ============================================================
     *
     * Prioridade:
     *
     * 1. vencimento persistido no certificado;
     *
     * 2. se não houver vencimento persistido:
     *    realização + validadePadrao do catálogo reconhecido;
     *
     * 3. regra sem validade continua sem vencimento;
     *
     * 4. código desconhecido continua fail-closed.
     * ============================================================
     */

    const dataRealizacao =
        textoSeguro(
            certificado
                ?.realizado
        );

    const dataVencimentoPersistida =
        textoSeguro(
            certificado
                ?.vencimento
        );

    const validadePadraoDias =
        treinamentoCatalogo
            ? Number(
                treinamentoCatalogo
                    ?.validadePadrao
            )
            : 0;

    const podeCalcularVencimento =
        Boolean(
            dataRealizacao
        ) &&
        Number.isFinite(
            validadePadraoDias
        ) &&
        validadePadraoDias > 0;

    const dataVencimentoCalculada =
        !dataVencimentoPersistida &&
        podeCalcularVencimento
            ? calcularVencimentoTreinamento(
                treinamentoCodigo,
                dataRealizacao
            )
            : "";

    const dataVencimentoEfetiva =
        dataVencimentoPersistida ||
        dataVencimentoCalculada;

    const statusTemporal =
        obterStatusTemporalDocumento({
            certificado: {
                ...(certificado || {}),

                vencimento:
                    dataVencimentoEfetiva,
            },

            treinamentoCatalogo,
        });

    const verificacaoDocumental =
        indiceVerificacoes.get(
            textoSeguro(
                certificado?.id
            )
        ) ||
        null;

    const evidenciasAtuais =
        obterEvidenciasDocumento({
            certificado,
            mapaEvidencias,
        });

    const selecionavel =
        evidenciasAtuais.some(
            (item) =>
                item.selecionavel
        );

    const alertas =
        [
            ...criarAlertasStatusTemporal({
                statusTemporal,
                certificadoId:
                    certificado?.id ||
                    null,
                treinamentoCodigo,
                nomeDocumento,
            }),

            ...criarAlertaVerificacao({
                verificacao:
                    verificacaoDocumental,
                certificadoId:
                    certificado?.id ||
                    null,
                treinamentoCodigo,
                nomeDocumento,
            }),
        ];

    if (
        !selecionavel
    ) {
        alertas.push(
            criarAlerta({
                codigo:
                    "ARQUIVO_FISICO_INDISPONIVEL",
                nivel:
                    "critico",
                mensagem:
                    `${nomeDocumento} possui registro lógico, mas nenhuma evidência física atual acessível para exportação.`,
                certificadoId:
                    certificado?.id ||
                    null,
                treinamentoCodigo,
            })
        );
    }

    return {
        certificadoId:
            certificado?.id ||
            null,

        colaboradorId:
            certificado
                ?.colaboradorId ||
            null,

        treinamentoCodigo,

        tipoTreinamento:
            textoSeguro(
                certificado
                    ?.tipoTreinamento
            ),

        nomeTreinamento:
            nomeDocumento,

        categoriaConsolidacao:
            categoria.chave,

        categoriaRotulo:
            categoria.rotulo,

        pastaBase:
            categoria.pasta,

        categoriaOrdem:
            categoria.ordem,

        dataRealizacao,

        dataVencimento:
            dataVencimentoEfetiva,

        regraCatalogoReconhecida:
            Boolean(
                treinamentoCatalogo
            ),

        obrigatorioMatriz:
            Boolean(
                treinamentoCodigo &&
                obrigatoriosMatriz.has(
                    treinamentoCodigo
                )
            ),

        adicionalEnviado:
            Boolean(
                treinamentoCodigo &&
                adicionaisEnviados.has(
                    treinamentoCodigo
                )
            ),

        statusTemporal,

        verificacaoDocumental,

        evidenciasAtuais,

        selecionavel,

        selecionadoPadrao:
            selecionavel,

        alertas,
    };
}

function ordenarDocumentos(
    documentos = []
) {
    return [
        ...documentos,
    ].sort(
        (a, b) => {
            if (
                a.categoriaOrdem !==
                b.categoriaOrdem
            ) {
                return (
                    a.categoriaOrdem -
                    b.categoriaOrdem
                );
            }

            const codigoA =
                Number(
                    a.treinamentoCodigo ||
                    99999
                );

            const codigoB =
                Number(
                    b.treinamentoCodigo ||
                    99999
                );

            if (
                codigoA !==
                codigoB
            ) {
                return (
                    codigoA -
                    codigoB
                );
            }

            return String(
                a.nomeTreinamento ||
                ""
            ).localeCompare(
                String(
                    b.nomeTreinamento ||
                    ""
                ),
                "pt-BR"
            );
        }
    );
}

function criarAusenciasObrigatorias({
    avaliacao,
    documentos = [],
} = {}) {
    if (
        !avaliacao ||
        avaliacao
            .foraControleOperacional
    ) {
        return [];
    }

    /*
     * ============================================================
     * C6B — PRESENÇA DOCUMENTAL PREVALECE SOBRE FLAG DA MATRIZ
     * ============================================================
     *
     * A matriz informa se o requisito foi considerado realizado,
     * porém item.realizado não pode, isoladamente, transformar
     * um documento efetivamente existente em AUSENTE.
     *
     * REGRA:
     *
     * 1. realizado === true
     *    -> não é ausência.
     *
     * 2. realizado !== true, mas existe documento lógico com o
     *    mesmo treinamentoCodigo
     *    -> não é ausência.
     *
     * 3. o documento pode estar vencido, a vencer, possuir
     *    ressalva documental ou estar sem arquivo físico:
     *    -> continua sendo documento existente;
     *    -> os respectivos alertas permanecem responsáveis
     *       por representar esses problemas.
     *
     * 4. somente sem realizado E sem documento correspondente
     *    -> ausência obrigatória real.
     * ============================================================
     */

    const codigosDocumentosExistentes =
        new Set(
            (
                Array.isArray(
                    documentos
                )
                    ? documentos
                    : []
            )
                .map(
                    (documento) =>
                        codigoTreinamentoSeguro(
                            documento
                                ?.treinamentoCodigo
                        )
                )
                .filter(Boolean)
        );

    return (
        Array.isArray(
            avaliacao
                .itensObrigatoriosMatriz
        )
            ? avaliacao
                .itensObrigatoriosMatriz
            : []
    )
        .filter(
            (item) => {
                if (
                    item
                        ?.realizado
                ) {
                    return false;
                }

                const treinamentoCodigo =
                    codigoTreinamentoSeguro(
                        item
                            ?.treinamento
                            ?.id
                    );

                const possuiDocumento =
                    Boolean(
                        treinamentoCodigo
                    ) &&
                    codigosDocumentosExistentes
                        .has(
                            treinamentoCodigo
                        );

                if (possuiDocumento) {
                    return false;
                }

                return true;
            }
        )
        .map(
            (item) => {
                const treinamentoCodigo =
                    codigoTreinamentoSeguro(
                        item
                            ?.treinamento
                            ?.id
                    );

                const categoria =
                    obterCategoriaConsolidacaoPorCodigo(
                        treinamentoCodigo
                    );

                return {
                    treinamentoCodigo,

                    nome:
                        textoSeguro(
                            item
                                ?.treinamento
                                ?.nome
                        ) ||
                        "Documento obrigatório",

                    categoriaConsolidacao:
                        categoria.chave,

                    categoriaRotulo:
                        categoria.rotulo,

                    pastaBase:
                        categoria.pasta,

                    status:
                        "AUSENTE",

                    obrigatorioMatriz:
                        true,

                    selecionavel:
                        false,
                };
            }
        );
}

function criarAlertasObra(
    obra
) {
    if (
        obra.status ===
        CONSOLIDACAO_COLABORADOR_OBRA_STATUS
            .AMBIGUA
    ) {
        return [
            criarAlerta({
                codigo:
                    "OBRA_AMBIGUA",
                nivel:
                    "critico",
                mensagem:
                    "A empresa possui mais de uma obra ativa. Selecione explicitamente a obra antes da geração da consolidação.",
            }),
        ];
    }

    if (
        obra.status ===
        CONSOLIDACAO_COLABORADOR_OBRA_STATUS
            .CONTEXTO_INVALIDO
    ) {
        return [
            criarAlerta({
                codigo:
                    "CONTEXTO_OBRA_INVALIDO",
                nivel:
                    "critico",
                mensagem:
                    "A obra informada não corresponde a um vínculo ativo válido da empresa do colaborador.",
            }),
        ];
    }

    if (
        obra.status ===
        CONSOLIDACAO_COLABORADOR_OBRA_STATUS
            .SEM_OBRA_ATIVA
    ) {
        return [
            criarAlerta({
                codigo:
                    "SEM_OBRA_ATIVA",
                nivel:
                    "informacao",
                mensagem:
                    "A empresa do colaborador não possui obra ativa vinculada.",
            }),
        ];
    }

    return [];
}

function criarBloqueios(
    obra
) {
    if (
        obra.status ===
        CONSOLIDACAO_COLABORADOR_OBRA_STATUS
            .AMBIGUA
    ) {
        return [
            {
                codigo:
                    "OBRA_AMBIGUA",
                mensagem:
                    "Seleção explícita de obra obrigatória.",
            },
        ];
    }

    if (
        obra.status ===
        CONSOLIDACAO_COLABORADOR_OBRA_STATUS
            .CONTEXTO_INVALIDO
    ) {
        return [
            {
                codigo:
                    "CONTEXTO_OBRA_INVALIDO",
                mensagem:
                    "O contexto da obra não é válido para este colaborador.",
            },
        ];
    }

    return [];
}

export function criarEstruturaBaseConsolidacaoColaborador({
    colaborador,
    empresa = null,
    vinculosObra = [],
    obraContextoId = null,
    certificados = [],
    evidencias = [],
    verificacoes = [],
    geradoEm = null,
} = {}) {
    if (
        !textoSeguro(
            colaborador?.id
        )
    ) {
        throw new Error(
            "Colaborador inválido para o Estrutura da Consolidação."
        );
    }

    const certificadosSeguros =
        (
            Array.isArray(
                certificados
            )
                ? certificados
                : []
        )
            .filter(Boolean);

    const avaliacao =
        avaliarTreinamentosColaborador({
            ...colaborador,
            treinamentos:
                certificadosSeguros,
        });

    const obrigatoriosMatriz =
        new Set(
            (
                Array.isArray(
                    avaliacao
                        ?.itensObrigatoriosMatriz
                )
                    ? avaliacao
                        .itensObrigatoriosMatriz
                    : []
            )
                .map(
                    (item) =>
                        codigoTreinamentoSeguro(
                            item
                                ?.treinamento
                                ?.id
                        )
                )
                .filter(Boolean)
        );

    const adicionaisEnviados =
        new Set(
            (
                Array.isArray(
                    avaliacao
                        ?.itensAdicionaisEnviados
                )
                    ? avaliacao
                        .itensAdicionaisEnviados
                    : []
            )
                .map(
                    (item) =>
                        codigoTreinamentoSeguro(
                            item
                                ?.treinamento
                                ?.id
                        )
                )
                .filter(Boolean)
        );

    const mapaEvidencias =
        criarMapaEvidencias(
            evidencias
        );

    const indiceVerificacoes =
        criarIndiceVerificacoes(
            verificacoes
        );

    const documentos =
        ordenarDocumentos(
            certificadosSeguros.map(
                (certificado) =>
                    criarDocumentoEstrutura({
                        certificado,
                        obrigatoriosMatriz,
                        adicionaisEnviados,
                        mapaEvidencias,
                        indiceVerificacoes,
                    })
            )
        );

    const ausenciasObrigatorias =
        criarAusenciasObrigatorias({
            avaliacao,
            documentos,
        });

    const obra =
        resolverObraConsolidacaoColaborador({
            vinculosObra,
            obraContextoId,
        });

    const alertas =
        [
            ...criarAlertasObra(
                obra
            ),

            ...documentos.flatMap(
                (item) =>
                    item.alertas
            ),

            ...ausenciasObrigatorias.map(
                (item) =>
                    criarAlerta({
                        codigo:
                            "DOCUMENTO_OBRIGATORIO_AUSENTE",
                        nivel:
                            "atencao",
                        mensagem:
                            `${item.nome} está ausente.`,
                        treinamentoCodigo:
                            item
                                .treinamentoCodigo,
                    })
            ),
        ];

    if (
        avaliacao
            ?.foraControleOperacional
    ) {
        alertas.push(
            criarAlerta({
                codigo:
                    "COLABORADOR_FORA_CONTROLE_OPERACIONAL",
                nivel:
                    "informacao",
                mensagem:
                    `Colaborador em situação histórica: ${avaliacao.situacaoHistorica || "fora do controle operacional atual"}.`,
            })
        );
    }

    const bloqueios =
        criarBloqueios(
            obra
        );

    const totalEvidenciasAtuais =
        documentos.reduce(
            (
                total,
                item
            ) =>
                total +
                item
                    .evidenciasAtuais
                    .length,
            0
        );

    const totalArquivosSelecionadosPadrao =
        documentos.reduce(
            (
                total,
                item
            ) =>
                total +
                item
                    .evidenciasAtuais
                    .filter(
                        (evidencia) =>
                            evidencia
                                .selecionadoPadrao
                    )
                    .length,
            0
        );

    return {
        schemaVersion:
            CONSOLIDACAO_COLABORADOR_STRUCTURE_SCHEMA_VERSION,

        geradoEm:
            textoSeguro(
                geradoEm
            ) ||
            new Date()
                .toISOString(),

        colaborador: {
            id:
                colaborador.id,

            codigoFuncionario:
                textoSeguro(
                    colaborador
                        .codigoFuncionario
                ),

            nome:
                textoSeguro(
                    colaborador
                        .nome
                ),

            cpf:
                textoSeguro(
                    colaborador
                        .cpf
                ),

            matriculaEsocial:
                textoSeguro(
                    colaborador
                        .matriculaEsocial
                ),

            funcao:
                textoSeguro(
                    colaborador
                        .funcao
                ),

            dataAdmissao:
                textoSeguro(
                    colaborador
                        .dataAdmissao
                ),

            status:
                textoSeguro(
                    colaborador
                        .status
                ),

            statusMobilizacao:
                textoSeguro(
                    colaborador
                        .statusMobilizacao
                ),
        },

        empresa:
            empresa
                ? {
                    id:
                        empresa.id ||
                        null,

                    nome:
                        textoSeguro(
                            empresa.nome
                        ),

                    cnpj:
                        textoSeguro(
                            empresa.cnpj
                        ),

                    tipoEmpresa:
                        textoSeguro(
                            empresa
                                .tipoEmpresa
                        ),

                    empresaPaiId:
                        empresa
                            .empresaPaiId ||
                        null,

                    empresaPaiNome:
                        textoSeguro(
                            empresa
                                .empresaPaiNome
                        ),
                }
                : null,

        obra,

        documentos,

        ausenciasObrigatorias,

        alertas,

        estatisticas: {
            totalDocumentosLogicos:
                documentos.length,

            totalEvidenciasAtuais,

            totalArquivosSelecionadosPadrao,

            totalAusenciasObrigatorias:
                ausenciasObrigatorias
                    .length,

            totalVencidos:
                documentos.filter(
                    (item) =>
                        item
                            .statusTemporal
                            .chave ===
                        "vencido"
                ).length,

            totalAVencer:
                documentos.filter(
                    (item) =>
                        item
                            .statusTemporal
                            .chave ===
                        "vencendo"
                ).length,

            totalSemValidade:
                documentos.filter(
                    (item) =>
                        item
                            .statusTemporal
                            .chave ===
                        "semvalidade"
                ).length,

            totalSemData:
                documentos.filter(
                    (item) =>
                        item
                            .statusTemporal
                            .chave ===
                        "semdata"
                ).length,

            totalRegraNaoReconhecida:
                documentos.filter(
                    (item) =>
                        item
                            .statusTemporal
                            .chave ===
                        "regra_nao_reconhecida"
                ).length,

            totalBloqueios:
                bloqueios.length,
        },

        controleOperacional: {
            foraControleOperacional:
                Boolean(
                    avaliacao
                        ?.foraControleOperacional
                ),

            situacaoHistorica:
                textoSeguro(
                    avaliacao
                        ?.situacaoHistorica
                ),
        },

        bloqueios,
    };
}
