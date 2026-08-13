import type {
    AssinaturaInline,
    ConfiguracaoEnvio,
    ContextoEnvio,
    DocumentoSnapshot,
    JsonRecord,
    SupabaseClientAny,
} from "./types.ts";

import {
    ErroHttp,
    booleanoSeguro,
    emailValido,
    formatarCompetencia,
    mensagemErro,
    normalizarEmail,
    normalizarListaEmails,
    numeroInteiro,
    objetoSeguro,
    textoSeguro,
} from "./utils.ts";

import {
    classificarVigenciaContratual,
} from "./vigencia.js";

import {
    listarPendenciasCobraveisCompetencia,
    montarChecklistEfetivoCompetencia,
} from "../_shared/certidaoMensalRegraCompetencia.js";

const LIMITE_MENSAGEM_MAXIMO =
    18 * 1024 * 1024;

const BUCKET_DOCUMENTOS =
    "certidao-mensal-documentos" as const;

const BUCKET_ASSINATURAS =
    "assinaturas-email-sst";

const CAMINHO_ASSINATURA =
    "modelos/certidao_mensal_documental/assinatura";

const TAMANHO_MAXIMO_ASSINATURA =
    2 * 1024 * 1024;

function erroIndicaAusente(
    error: unknown,
) {
    const registro =
        objetoSeguro(error);

    const status =
        numeroInteiro(
            registro.statusCode ??
                registro.status,
        );

    const codigo =
        textoSeguro(
            registro.code,
            100,
        ).toLowerCase();

    const mensagem =
        mensagemErro(error)
            .toLowerCase();

    return (
        status === 404 ||
        codigo === "404" ||
        codigo === "not_found" ||
        codigo === "object_not_found" ||
        mensagem.includes(
            "not found",
        )
    );
}

/*
 * SAFESCAN-E3.3-EMAIL-RESOLVEDOR-CENTRAL
 *
 * O e-mail não decide status documental por conta própria.
 * Ele reconstrói o mesmo universo de versões utilizado pelo
 * resolvedor central D5.3 e delega a classificação ao domínio
 * compartilhado byte a byte com a aplicação.
 */
async function resolverChecklistEfetivoEnvio({
    adminClient,
    empresaId,
    competencia,
    competenciaStatus,
    itensPersistidos,
}: {
    adminClient: SupabaseClientAny;
    empresaId: string;
    competencia: string;
    competenciaStatus: string;
    itensPersistidos: JsonRecord[];
}) {
    const {
        data:
            competenciasData,
        error:
            competenciasError,
    } =
        await adminClient
            .from(
                "certidao_mensal_competencias",
            )
            .select(
                "id, empresa_id, competencia, status",
            )
            .eq(
                "empresa_id",
                empresaId,
            );

    if (competenciasError) {
        throw new ErroHttp(
            500,
            mensagemErro(
                competenciasError,
            ),
        );
    }

    const competencias =
        Array.isArray(
            competenciasData,
        )
            ? competenciasData.map(
                objetoSeguro,
            )
            : [];

    const competenciaPorId =
        new Map<
            string,
            JsonRecord
        >();

    for (
        const registro of
        competencias
    ) {
        const id =
            textoSeguro(
                registro.id,
                50,
            );

        if (id) {
            competenciaPorId.set(
                id,
                registro,
            );
        }
    }

    const competenciasIds =
        Array.from(
            competenciaPorId.keys(),
        );

    if (
        competenciasIds.length ===
        0
    ) {
        return montarChecklistEfetivoCompetencia({
            competencia,
            versoes:
                [],
            itensPersistidos,
            competenciaFechada:
                competenciaStatus
                    .toUpperCase() ===
                "FECHADA",
        });
    }

    const {
        data:
            itensHistoricosData,
        error:
            itensHistoricosError,
    } =
        await adminClient
            .from(
                "certidao_mensal_itens",
            )
            .select(
                "id, competencia_id, tipo_documento, status, versao_atual_id",
            )
            .in(
                "competencia_id",
                competenciasIds,
            );

    if (itensHistoricosError) {
        throw new ErroHttp(
            500,
            mensagemErro(
                itensHistoricosError,
            ),
        );
    }

    const itensHistoricos =
        Array.isArray(
            itensHistoricosData,
        )
            ? itensHistoricosData.map(
                objetoSeguro,
            )
            : [];

    const itemPorId =
        new Map<
            string,
            JsonRecord
        >();

    for (
        const item of
        itensHistoricos
    ) {
        const id =
            textoSeguro(
                item.id,
                50,
            );

        if (id) {
            itemPorId.set(
                id,
                item,
            );
        }
    }

    const itensIds =
        Array.from(
            itemPorId.keys(),
        );

    let versoesBase:
        JsonRecord[] =
            [];

    if (
        itensIds.length >
        0
    ) {
        const {
            data:
                versoesData,
            error:
                versoesError,
        } =
            await adminClient
                .from(
                    "certidao_mensal_versoes",
                )
                .select(
                    "id, item_id, numero_versao, status_resultado, diagnostico, criado_em",
                )
                .in(
                    "item_id",
                    itensIds,
                );

        if (versoesError) {
            throw new ErroHttp(
                500,
                mensagemErro(
                    versoesError,
                ),
            );
        }

        versoesBase =
            Array.isArray(
                versoesData,
            )
                ? versoesData.map(
                    objetoSeguro,
                )
                : [];
    }

    const versoes =
        versoesBase.map(
            (versao) => {
                const itemId =
                    textoSeguro(
                        versao.item_id,
                        50,
                    );

                const item =
                    itemPorId.get(
                        itemId,
                    ) ||
                    {};

                const competenciaId =
                    textoSeguro(
                        item.competencia_id,
                        50,
                    );

                const competenciaItem =
                    competenciaPorId.get(
                        competenciaId,
                    ) ||
                    {};

                const versaoId =
                    textoSeguro(
                        versao.id,
                        50,
                    );

                const versaoAtualId =
                    textoSeguro(
                        item.versao_atual_id,
                        50,
                    );

                const statusVersao =
                    (
                        versaoAtualId &&
                        versaoAtualId ===
                            versaoId
                    )
                        ? textoSeguro(
                            item.status,
                            50,
                        )
                        : textoSeguro(
                            versao.status_resultado,
                            50,
                        );

                return {
                    ...versao,

                    tipoDocumento:
                        textoSeguro(
                            item.tipo_documento,
                            120,
                        ),

                    competenciaDocumento:
                        textoSeguro(
                            competenciaItem
                                .competencia,
                            20,
                        ),

                    status:
                        statusVersao,

                    item: {
                        ...item,

                        competencia:
                            textoSeguro(
                                competenciaItem
                                    .competencia,
                                20,
                            ),
                    },
                };
            },
        );

    return montarChecklistEfetivoCompetencia({
        competencia,
        versoes,
        itensPersistidos,
        competenciaFechada:
            competenciaStatus
                .toUpperCase() ===
            "FECHADA",
    });
}

function resolverConfiguracao(
    valor: unknown,
): ConfiguracaoEnvio {
    const config =
        objetoSeguro(valor);

    if (
        Object.keys(config).length === 0
    ) {
        throw new ErroHttp(
            409,
            "Nenhuma configuração de envio foi localizada.",
        );
    }

    if (
        !booleanoSeguro(
            config.ativo,
            false,
        )
    ) {
        throw new ErroHttp(
            409,
            "O envio da Certidão Mensal está desativado.",
        );
    }

    const escopo =
        textoSeguro(
            config.escopo,
            20,
        ) === "EMPRESA"
            ? "EMPRESA"
            : "GLOBAL";

    const destinatarios =
        normalizarListaEmails(
            config.destinatarios,
            10,
            "destinatários",
        );

    const copias =
        normalizarListaEmails(
            config.copias,
            10,
            "cópias",
        );

    const responderPara =
        normalizarEmail(
            config.responderPara,
        );

    if (
        responderPara &&
        !emailValido(
            responderPara,
        )
    ) {
        throw new ErroHttp(
            422,
            "O endereço de resposta configurado é inválido.",
        );
    }

    const nomeRemetente =
        textoSeguro(
            config.nomeRemetente,
            120,
        ) ||
        "SafeScan Brasil";

    const assuntoModeloConfigurado =
        textoSeguro(
            config.assuntoModelo,
            180,
        );

    const assuntoModelo =
        assuntoModeloConfigurado ===
            "Documentação mensal — {{empresa_nome}} — {{competencia}}"
            ? "Pendências documentais — {{empresa_nome}} — {{competencia}}"
            : assuntoModeloConfigurado;

    const corpoModeloConfigurado =
        textoSeguro(
            config.corpoModelo,
            10000,
        );

    const corpoModeloLegado =
        [
            "{{saudacao}},",
            "",
            "Segue a documentação mensal da empresa {{empresa_nome}},",
            "referente à competência {{competencia}}.",
            "",
            "{{resumo}}",
            "",
            "{{itens}}",
        ].join("\n");

    const corpoModeloPadrao =
        [
            "{{saudacao}},",
            "",
            "Durante a conferência da documentação mensal da empresa {{empresa_nome}},",
            "referente à competência {{competencia}}, foram identificadas as pendências abaixo:",
            "",
            "{{itens}}",
            "",
            "Solicitamos a regularização dos itens relacionados e o envio dos documentos faltantes ou corrigidos pelo canal habitual.",
            "",
            "Total de pendências identificadas: {{total_pendencias}}.",
            "",
            "Em caso de dúvida, responda a este e-mail.",
        ].join("\n");

    const corpoModelo =
        corpoModeloConfigurado ===
            corpoModeloLegado
            ? corpoModeloPadrao
            : corpoModeloConfigurado;

    if (
        !assuntoModelo ||
        !corpoModelo
    ) {
        throw new ErroHttp(
            422,
            "Assunto e corpo do e-mail são obrigatórios.",
        );
    }

    const estrategiaExcedente =
        textoSeguro(
            config.estrategiaExcedente,
            50,
        );

    if (
        estrategiaExcedente !==
        "DIVIDIR_EM_PARTES"
    ) {
        throw new ErroHttp(
            422,
            "Estratégia de excedente não suportada.",
        );
    }

    const limiteConfigurado =
        numeroInteiro(
            config.limiteMensagemBytes,
            LIMITE_MENSAGEM_MAXIMO,
        );

    const limiteMensagemBytes =
        Math.min(
            Math.max(
                limiteConfigurado,
                1024 * 1024,
            ),
            LIMITE_MENSAGEM_MAXIMO,
        );

    return {
        id:
            textoSeguro(
                config.id,
                50,
            ) ||
            null,

        escopo,

        versao:
            numeroInteiro(
                config.versao,
                0,
            ) ||
            null,


        destinatarios,
        copias,
        responderPara,
        nomeRemetente,
        assuntoModelo,
        corpoModelo,

        anexarPdfs:
            false,

        estrategiaExcedente:
            "DIVIDIR_EM_PARTES",

        limiteMensagemBytes,
    };
}

export async function carregarContextoEnvio(
    adminClient: SupabaseClientAny,
    competenciaId: string,
): Promise<ContextoEnvio> {
    const {
        data: competenciaData,
        error: competenciaError,
    } =
        await adminClient
            .from(
                "certidao_mensal_competencias",
            )
            .select(
                "id, empresa_id, competencia, status",
            )
            .eq(
                "id",
                competenciaId,
            )
            .maybeSingle();

    if (competenciaError) {
        throw new ErroHttp(
            500,
            mensagemErro(
                competenciaError,
            ),
        );
    }

    const competencia =
        objetoSeguro(
            competenciaData,
        );

    const empresaId =
        textoSeguro(
            competencia.empresa_id,
            50,
        );

    if (!empresaId) {
        throw new ErroHttp(
            404,
            "Competência não localizada.",
        );
    }

    const {
        data: empresaData,
        error: empresaError,
    } =
        await adminClient
            .from("empresas")
            .select(
                "id, nome, cnpj, tipo_empresa, data_inicio_contrato, data_fim_contrato",
            )
            .eq(
                "id",
                empresaId,
            )
            .maybeSingle();

    if (empresaError) {
        throw new ErroHttp(
            500,
            mensagemErro(
                empresaError,
            ),
        );
    }

    const empresa =
        objetoSeguro(
            empresaData,
        );

    if (
        !textoSeguro(
            empresa.id,
            50,
        )
    ) {
        throw new ErroHttp(
            404,
            "Empresa da competência não localizada.",
        );
    }

    const vigencia =
        classificarVigenciaContratual({
            tipoEmpresa:
                empresa.tipo_empresa,

            dataInicioContrato:
                empresa.data_inicio_contrato,

            dataFimContrato:
                empresa.data_fim_contrato,

            competencia:
                competencia.competencia,
        });

    if (!vigencia.permitida) {
        throw new ErroHttp(
            409,
            vigencia.mensagem,
        );
    }

    const {
        data: configData,
        error: configError,
    } =
        await adminClient.rpc(
            "obter_configuracao_email_certidao_mensal_para_envio",
            {
                p_empresa_id:
                    empresaId,
            },
        );

    if (configError) {
        throw new ErroHttp(
            500,
            mensagemErro(
                configError,
            ),
        );
    }

    const configuracao =
        resolverConfiguracao(
            configData,
        );

    const {
        data: itensData,
        error: itensError,
    } =
        await adminClient
            .from(
                "certidao_mensal_itens",
            )
            .select(
                "id, competencia_id, tipo_documento, titulo, status, aplicabilidade, versao_atual_id",
            )
            .eq(
                "competencia_id",
                competenciaId,
            )

            .order(
                "titulo",
                {
                    ascending:
                        true,
                },
            );

    if (itensError) {
        throw new ErroHttp(
            500,
            mensagemErro(
                itensError,
            ),
        );
    }

    const itens =
        Array.isArray(itensData)
            ? itensData.map(
                objetoSeguro,
            )
            : [];

    const checklistEfetivo =
        await resolverChecklistEfetivoEnvio({
            adminClient,
            empresaId,

            competencia:
                textoSeguro(
                    competencia.competencia,
                    20,
                ),

            competenciaStatus:
                textoSeguro(
                    competencia.status,
                    50,
                ),

            itensPersistidos:
                itens,
        });

    const checklistEfetivoPorTipo =
        new Map(
            checklistEfetivo.map(
                (item) => [
                    textoSeguro(
                        item?.tipoDocumento,
                        120,
                    )
                        .trim()
                        .toLowerCase(),

                    objetoSeguro(
                        item,
                    ),
                ],
            ),
        );

    /*
     * SAFESCAN-E3.8-EMAIL-ACAO-EXTERNA
     *
     * EM_ANALISE representa trabalho interno de conferência.
     * A contratada não deve receber cobrança enquanto o
     * documento já enviado estiver aguardando análise.
     *
     * Esta regra é exclusiva da notificação por e-mail.
     * O resolvedor central D5.3 permanece inalterado.
     */
    const pendenciasCobraveisPorTipo =
        new Set(
            listarPendenciasCobraveisCompetencia(
                checklistEfetivo,
            )
                .filter(
                    (item) =>
                        textoSeguro(
                            item?.status,
                            50,
                        )
                            .trim()
                            .toUpperCase() !==
                        "EM_ANALISE",
                )
                .map(
                    (item) =>
                        textoSeguro(
                            item?.tipoDocumento,
                            120,
                        )
                            .trim()
                            .toLowerCase(),
                ),
        );

    const competenciaPerfil =
        textoSeguro(
            competencia.competencia,
            20,
        );

    if (!competenciaPerfil) {
        throw new ErroHttp(
            409,
            "A competência não possui data válida para resolver a exigibilidade documental.",
        );
    }

    const tiposDocumentos =
        Array.from(
            new Set(
                itens
                    .map(
                        (item) =>
                            textoSeguro(
                                item.tipo_documento,
                                120,
                            )
                                .trim()
                                .toLowerCase(),
                    )
                    .filter(Boolean),
            ),
        );

    const exigibilidadePorTipo =
        new Map<string, boolean>();

    await Promise.all(
        tiposDocumentos.map(
            async (tipoDocumento) => {
                const {
                    data: exigidoData,
                    error: exigidoError,
                } =
                    await adminClient.rpc(
                        "certidao_mensal_documento_exigido_na_competencia",
                        {
                            p_empresa_id:
                                empresaId,
                            p_tipo_documento:
                                tipoDocumento,
                            p_competencia:
                                competenciaPerfil,
                        },
                    );

                if (exigidoError) {
                    throw new ErroHttp(
                        500,
                        (
                            "Falha ao resolver a exigibilidade documental de " +
                            tipoDocumento +
                            ": " +
                            mensagemErro(
                                exigidoError,
                            )
                        ),
                    );
                }

                exigibilidadePorTipo.set(
                    tipoDocumento,
                    exigidoData !== false,
                );
            },
        ),
    );

    const itensPendentes =
        itens.filter(
            (item) => {
                const tipoDocumento =
                    textoSeguro(
                        item.tipo_documento,
                        120,
                    )
                        .trim()
                        .toLowerCase();

                const exigido =
                    exigibilidadePorTipo.get(
                        tipoDocumento,
                    ) ?? true;

                if (!exigido) {
                    return false;
                }

                /*
                 * C4_APLICABILIDADE_ESOCIAL_COBRANCA
                 *
                 * Aplicabilidade é dimensão separada de status.
                 * Apenas eSocial explicitamente APLICAVEL pode
                 * entrar na cobrança da contratada.
                 */
                if (
                    tipoDocumento ===
                    "esocial"
                ) {
                    const aplicabilidade =
                        (
                            textoSeguro(
                                item.aplicabilidade,
                                50,
                            )
                                .trim()
                                .toUpperCase() ||
                            "PENDENTE_DEFINICAO"
                        );

                    if (
                        aplicabilidade !==
                        "APLICAVEL"
                    ) {
                        return false;
                    }
                }

                return pendenciasCobraveisPorTipo
                    .has(
                        tipoDocumento,
                    );
            },
        );

    if (itensPendentes.length === 0) {
        throw new ErroHttp(
            409,
            "A competência não possui pendências documentais para notificação.",
        );
    }

    if (itensPendentes.length > 50) {
        throw new ErroHttp(
            422,
            "A competência ultrapassa o limite de 50 pendências por notificação.",
        );
    }

    const versoesIds =
        itensPendentes
            .map(
                (item) =>
                    textoSeguro(
                        item.versao_atual_id,
                        50,
                    ),
            )
            .filter(Boolean);

    const versaoPorId =
        new Map<
            string,
            JsonRecord
        >();

    if (versoesIds.length > 0) {
        const {
            data: versoesData,
            error: versoesError,
        } =
            await adminClient
                .from(
                    "certidao_mensal_versoes",
                )
                .select(
                    "id, item_id, numero_versao, bucket_id, caminho_storage, nome_original, mime_type, tamanho_bytes, hash_sha256, total_paginas, status_resultado",
                )
                .in(
                    "id",
                    versoesIds,
                );

        if (versoesError) {
            throw new ErroHttp(
                500,
                mensagemErro(
                    versoesError,
                ),
            );
        }

        for (
            const valor of
            Array.isArray(versoesData)
                ? versoesData
                : []
        ) {
            const versao =
                objetoSeguro(valor);

            const id =
                textoSeguro(
                    versao.id,
                    50,
                );

            if (id) {
                versaoPorId.set(
                    id,
                    versao,
                );
            }
        }
    }

    const documentos: DocumentoSnapshot[] =
        itensPendentes.map(
            (
                item,
                indice,
            ) => {
                const itemId =
                    textoSeguro(
                        item.id,
                        50,
                    );

                const versaoId =
                    textoSeguro(
                        item.versao_atual_id,
                        50,
                    );

                const tipoDocumento =
                    textoSeguro(
                        item.tipo_documento,
                        120,
                    );

                const tipoDocumentoNormalizado =
                    tipoDocumento
                        .trim()
                        .toLowerCase();

                const resolucaoEfetiva =
                    checklistEfetivoPorTipo.get(
                        tipoDocumentoNormalizado,
                    ) ||
                    {};

                const titulo =
                    textoSeguro(
                        resolucaoEfetiva.titulo ||
                            item.titulo,
                        300,
                    ) ||
                    "Documento";

                const statusItem =
                    textoSeguro(
                        resolucaoEfetiva.status ||
                            item.status,
                        50,
                    ).toUpperCase() ||
                    "PENDENTE";

                if (!itemId) {
                    throw new ErroHttp(
                        409,
                        `O item documental "${titulo}" não recebeu identificador válido.`,
                    );
                }

                if (!versaoId) {
                    return {
                        ordem:
                            indice + 1,

                        itemId,
                        possuiVersao:
                            false,

                        versaoId:
                            "",

                        tipoDocumento,
                        titulo,
                        statusItem,

                        numeroVersao:
                            0,

                        bucket:
                            BUCKET_DOCUMENTOS,

                        caminhoStorage:
                            "",

                        nomeArquivo:
                            "",

                        tipoMime:
                            "application/pdf",

                        tamanhoBytes:
                            0,

                        hashSha256:
                            "",

                        totalPaginas:
                            null,
                    };
                }

                const versao =
                    versaoPorId.get(
                        versaoId,
                    );

                if (!versao) {
                    throw new ErroHttp(
                        409,
                        `A versão atual do documento "${titulo}" não foi localizada.`,
                    );
                }

                const versaoItemId =
                    textoSeguro(
                        versao.item_id,
                        50,
                    );

                const bucket =
                    textoSeguro(
                        versao.bucket_id,
                        100,
                    );

                const tipoMime =
                    textoSeguro(
                        versao.mime_type,
                        100,
                    );

                const caminhoStorage =
                    textoSeguro(
                        versao.caminho_storage,
                        1000,
                    );

                const tamanhoBytes =
                    numeroInteiro(
                        versao.tamanho_bytes,
                    );

                const numeroVersao =
                    numeroInteiro(
                        versao.numero_versao,
                    );

                const hashSha256 =
                    textoSeguro(
                        versao.hash_sha256,
                        64,
                    ).toLowerCase();

                const prefixoEmpresa =
                    `${empresaId}/`;

                if (
                    versaoItemId !==
                        itemId ||
                    bucket !==
                        BUCKET_DOCUMENTOS ||
                    tipoMime !==
                        "application/pdf" ||
                    !caminhoStorage.startsWith(
                        prefixoEmpresa,
                    ) ||
                    tamanhoBytes <= 0 ||
                    numeroVersao <= 0 ||
                    !/^[0-9a-f]{64}$/.test(
                        hashSha256,
                    )
                ) {
                    throw new ErroHttp(
                        409,
                        `Metadados inválidos no documento "${titulo}".`,
                    );
                }

                return {
                    ordem:
                        indice + 1,

                    itemId,
                    possuiVersao:
                        true,

                    versaoId,
                    tipoDocumento,
                    titulo,
                    statusItem,
                    numeroVersao,

                    bucket:
                        BUCKET_DOCUMENTOS,

                    caminhoStorage,

                    nomeArquivo:
                        textoSeguro(
                            versao.nome_original,
                            300,
                        ),

                    tipoMime:
                        "application/pdf",

                    tamanhoBytes,
                    hashSha256,

                    totalPaginas:
                        numeroInteiro(
                            versao.total_paginas,
                            0,
                        ) ||
                        null,
                };
            },
        );


    const destinatariosSet =
        new Set(
            configuracao.destinatarios,
        );


    const destinatarios =
        Array.from(
            destinatariosSet,
        );

    if (destinatarios.length === 0) {
        throw new ErroHttp(
            422,
            "Nenhum destinatário válido foi resolvido para o envio.",
        );
    }

    if (destinatarios.length > 10) {
        throw new ErroHttp(
            422,
            "O envio possui mais de 10 destinatários no campo Para.",
        );
    }

    const copias =
        configuracao.copias
            .filter(
                (email) =>
                    !destinatariosSet.has(
                        email,
                    ),
            );

    const totalPendencias =
        documentos.length;

    const competenciaTexto =
        formatarCompetencia(
            competencia.competencia,
        );

    const empresaNome =
        textoSeguro(
            empresa.nome,
            300,
        ) ||
        "Empresa";

    const empresaCnpj =
        textoSeguro(
            empresa.cnpj,
            30,
        );

    const rotulosStatus =
        new Map<string, string>([
            [
                "REENVIO_SOLICITADO",
                "Reenvio solicitado",
            ],
            [
                "NAO_CONFORME",
                "Documento não conforme",
            ],
            [
                "VENCIDO",
                "Documento vencido",
            ],
            [
                "PENDENTE",
                "Documento pendente",
            ],
            [
                "AGUARDANDO_DOCUMENTO",
                "Documento não apresentado",
            ],
            [
                "EM_ANALISE",
                "Em análise",
            ],
        ]);

    const itensTexto =
        documentos
            .map(
                (
                    documento,
                    indice,
                ) => {
                    const status =
                        documento.statusItem
                            .toUpperCase();

                    const rotulo =
                        rotulosStatus.get(
                            status,
                        ) ||
                        status
                            .toLowerCase()
                            .replaceAll(
                                "_",
                                " ",
                            )
                            .replace(
                                /^./,
                                (letra) =>
                                    letra.toUpperCase(),
                            );

                    return (
                        `${indice + 1}. ` +
                        `${documento.titulo} — ${rotulo}`
                    );
                },
            )
            .join("\n");

    const resumo =
        totalPendencias === 1
            ? "Foi identificada 1 pendência documental."
            : `Foram identificadas ${totalPendencias} pendências documentais.`;

    return {
        competenciaId,
        empresaId,
        empresaNome,
        empresaCnpj,

        competencia:
            competenciaTexto,

        configuracao,
        destinatarios,
        copias,
        documentos,
        totalPendencias,

        variaveis: {
            saudacao:
                "Olá",

            empresa_nome:
                empresaNome,

            empresa_cnpj:
                empresaCnpj,

            competencia:
                competenciaTexto,

            resumo,

            itens:
                itensTexto,

            total_documentos:
                String(
                    documentos.length,
                ),

            total_pendencias:
                String(
                    totalPendencias,
                ),
        },
    };
}

export async function carregarAssinaturaInline(
    adminClient: SupabaseClientAny,
): Promise<AssinaturaInline | null> {
    const {
        data,
        error,
    } =
        await adminClient.storage
            .from(
                BUCKET_ASSINATURAS,
            )
            .download(
                CAMINHO_ASSINATURA,
            );

    if (error) {
        if (
            erroIndicaAusente(
                error,
            )
        ) {
            return null;
        }

        throw new ErroHttp(
            500,
            mensagemErro(error),
        );
    }

    if (!data) {
        return null;
    }

    const bytes =
        new Uint8Array(
            await data.arrayBuffer(),
        );

    if (
        bytes.length === 0 ||
        bytes.length >
            TAMANHO_MAXIMO_ASSINATURA
    ) {
        throw new ErroHttp(
            409,
            "A assinatura configurada possui tamanho inválido.",
        );
    }

    const png =
        bytes.length >= 8 &&
        bytes[0] === 0x89 &&
        bytes[1] === 0x50 &&
        bytes[2] === 0x4e &&
        bytes[3] === 0x47;

    const jpeg =
        bytes.length >= 3 &&
        bytes[0] === 0xff &&
        bytes[1] === 0xd8 &&
        bytes[2] === 0xff;

    if (
        !png &&
        !jpeg
    ) {
        throw new ErroHttp(
            409,
            "A assinatura configurada não é PNG nem JPEG.",
        );
    }

    return {
        bytes,

        contentType:
            png
                ? "image/png"
                : "image/jpeg",

        filename:
            png
                ? "assinatura-certidao-mensal.png"
                : "assinatura-certidao-mensal.jpg",

        cid:
            "assinatura-certidao-mensal@safescanbrasil",
    };
}
