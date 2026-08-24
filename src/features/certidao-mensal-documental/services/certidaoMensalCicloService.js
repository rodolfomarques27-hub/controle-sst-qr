export const CERTIDAO_MENSAL_CICLO_RPC =
    Object.freeze({
        OBTER_OU_CRIAR_COMPETENCIA:
            "obter_ou_criar_competencia_certidao_mensal",
        CONSOLIDAR_ITENS_AUTOMATICOS:
            "consolidar_itens_automaticos_certidao_mensal",
        CONSOLIDAR_RELACAO_EMPREGADOS:
            "consolidar_relacao_empregados_certidao_mensal",
        FECHAR_COMPETENCIA:
            "fechar_competencia_certidao_mensal",
        REABRIR_COMPETENCIA:
            "reabrir_competencia_certidao_mensal",
        LISTAR_HISTORICO_ANUAL:
            "listar_historico_anual_certidao_mensal",
    });

export const CERTIDAO_MENSAL_TIPOS_AUTOMATICOS =
    Object.freeze([
        "relacao-empregados",
        "aso-pcmso",
    ]);

const UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const STATUS_ITEM_PERMITIDOS =
    new Set([
        "PENDENTE",
        "ENVIADO",
        "EM_ANALISE",
        "CONFORME",
        "NAO_CONFORME",
        "REENVIO_SOLICITADO",
        "VENCIDO",
        "DISPENSADO",
    ]);

function textoSeguro(
    valor,
    limite = 2000,
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

function normalizarUuid(
    valor,
    rotulo,
) {
    const uuid =
        textoSeguro(
            valor,
            60,
        );

    if (!UUID_PATTERN.test(uuid)) {
        throw new Error(
            `${rotulo} inválido.`,
        );
    }

    return uuid;
}

function normalizarAno(
    valor,
) {
    const ano =
        Number(
            valor,
        );

    if (
        !Number.isInteger(ano) ||
        ano < 2000 ||
        ano > 2100
    ) {
        throw new Error(
            "O ano informado é inválido.",
        );
    }

    return ano;
}

function normalizarCompetenciaCiclo(
    valor,
) {
    const competencia =
        textoSeguro(
            valor,
            30,
        );

    if (
        !/^\d{4}-(0[1-9]|1[0-2])-01$/.test(
            competencia,
        )
    ) {
        throw new Error(
            "A competência deve representar o primeiro dia do mês.",
        );
    }

    return competencia;
}

function normalizarMotivo(
    valor,
) {
    const motivo =
        textoSeguro(
            valor,
            1000,
        );

    if (motivo.length < 5) {
        throw new Error(
            "Informe um motivo válido para reabrir a competência.",
        );
    }

    return motivo;
}

function normalizarStatusItem(
    valor,
) {
    const status =
        textoSeguro(
            valor,
            40,
        ).toUpperCase();

    if (!STATUS_ITEM_PERMITIDOS.has(status)) {
        throw new Error(
            `Status inválido para item automático: ${status || "vazio"}.`,
        );
    }

    return status;
}

function normalizarItemAutomatico(
    item,
) {
    if (
        !item ||
        typeof item !== "object" ||
        Array.isArray(item)
    ) {
        throw new Error(
            "Item automático inválido.",
        );
    }

    const tipoDocumento =
        textoSeguro(
            item.tipoDocumento,
            80,
        ).toLowerCase();

    if (
        !CERTIDAO_MENSAL_TIPOS_AUTOMATICOS.includes(
            tipoDocumento,
        )
    ) {
        throw new Error(
            `Tipo automático inválido: ${tipoDocumento || "vazio"}.`,
        );
    }

    const titulo =
        textoSeguro(
            item.titulo,
            200,
        );

    if (!titulo) {
        throw new Error(
            `O título do item ${tipoDocumento} é obrigatório.`,
        );
    }

    const snapshot =
        (
            item.snapshot &&
            typeof item.snapshot === "object" &&
            !Array.isArray(item.snapshot)
        )
            ? item.snapshot
            : {};

    return {
        tipoDocumento,
        titulo,
        status:
            normalizarStatusItem(
                item.status,
            ),
        snapshot,
    };
}

function normalizarItensAutomaticos(
    itens,
) {
    if (
        !Array.isArray(itens) ||
        itens.length !==
            CERTIDAO_MENSAL_TIPOS_AUTOMATICOS.length
    ) {
        throw new Error(
            "Informe exatamente os dois itens automáticos da competência.",
        );
    }

    const normalizados =
        itens.map(
            normalizarItemAutomatico,
        );

    const tipos =
        new Set(
            normalizados.map(
                (item) =>
                    item.tipoDocumento,
            ),
        );

    if (
        tipos.size !==
            CERTIDAO_MENSAL_TIPOS_AUTOMATICOS.length ||
        CERTIDAO_MENSAL_TIPOS_AUTOMATICOS.some(
            (tipo) =>
                !tipos.has(tipo),
        )
    ) {
        throw new Error(
            "Os itens automáticos devem conter Relação de Empregados e ASO + PCMSO.",
        );
    }

    return normalizados;
}

function obterMensagemErro(
    erro,
    fallback,
) {
    return (
        textoSeguro(
            erro?.message,
        ) ||
        textoSeguro(
            erro?.details,
        ) ||
        textoSeguro(
            erro?.hint,
        ) ||
        fallback
    );
}

function criarErroCiclo(
    mensagem,
    {
        codigo = "",
        rpc = "",
        causa = null,
    } = {},
) {
    const erro =
        new Error(
            textoSeguro(
                mensagem,
            ) ||
            "Não foi possível concluir a operação da competência.",
        );

    erro.name =
        "CertidaoMensalCicloError";

    erro.codigo =
        textoSeguro(
            codigo,
            100,
        );

    erro.rpc =
        textoSeguro(
            rpc,
            150,
        );

    erro.cause =
        causa;

    return erro;
}

function validarClienteSupabase(
    clienteSupabase,
) {
    if (
        !clienteSupabase ||
        typeof clienteSupabase.rpc !==
            "function"
    ) {
        throw new Error(
            "Cliente Supabase inválido para o ciclo das Certidões Mensais.",
        );
    }

    return clienteSupabase;
}

async function executarRpc(
    cliente,
    rpc,
    parametros,
    mensagemFallback,
) {
    try {
        const {
            data,
            error,
        } =
            await cliente.rpc(
                rpc,
                parametros,
            );

        if (error) {
            throw criarErroCiclo(
                obterMensagemErro(
                    error,
                    mensagemFallback,
                ),
                {
                    codigo:
                        error.code,
                    rpc,
                    causa:
                        error,
                },
            );
        }

        return data;
    }
    catch (erro) {
        if (
            erro?.name ===
            "CertidaoMensalCicloError"
        ) {
            throw erro;
        }

        throw criarErroCiclo(
            obterMensagemErro(
                erro,
                mensagemFallback,
            ),
            {
                codigo:
                    erro?.code,
                rpc,
                causa:
                    erro,
            },
        );
    }
}

function formatarCompetenciaHistorico(
    valor,
) {
    const texto =
        textoSeguro(
            valor,
            30,
        );

    const correspondencia =
        /^(\d{4})-(\d{2})-(\d{2})/.exec(
            texto,
        );

    if (!correspondencia) {
        return texto;
    }

    return (
        `${correspondencia[2]}/` +
        correspondencia[1]
    );
}

function normalizarResumo(
    valor,
) {
    if (
        valor &&
        typeof valor === "object" &&
        !Array.isArray(valor)
    ) {
        return valor;
    }

    return {};
}

function normalizarSnapshotAutomaticoPersistido(
    valor,
) {
    if (
        valor &&
        typeof valor === "object" &&
        !Array.isArray(valor)
    ) {
        return valor;
    }

    return {};
}

function normalizarItemAutomaticoPersistido(
    registro,
) {
    if (
        !registro ||
        typeof registro !== "object" ||
        Array.isArray(registro)
    ) {
        return null;
    }

    const tipoDocumento =
        textoSeguro(
            registro.tipo_documento,
            80,
        ).toLowerCase();

    if (
        !CERTIDAO_MENSAL_TIPOS_AUTOMATICOS.includes(
            tipoDocumento,
        )
    ) {
        return null;
    }

    const origem =
        textoSeguro(
            registro.origem,
            40,
        ).toUpperCase();

    if (origem !== "SISTEMA") {
        return null;
    }

    return {
        id:
            normalizarUuid(
                registro.id,
                "Identificador do item automático",
            ),
        competenciaId:
            normalizarUuid(
                registro.competencia_id,
                "Identificador da competência do item automático",
            ),
        tipoDocumento,
        titulo:
            textoSeguro(
                registro.titulo,
                200,
            ),
        origem,
        status:
            normalizarStatusItem(
                registro.status,
            ),
        snapshotAutomatico:
            normalizarSnapshotAutomaticoPersistido(
                registro.snapshot_automatico,
            ),
        atualizadoEm:
            textoSeguro(
                registro.atualizado_em,
                60,
            ),
    };
}

export function normalizarHistoricoAnualCertidaoMensal(
    registros,
) {
    if (!Array.isArray(registros)) {
        return [];
    }

    return registros.map(
        (registro) => ({
            competenciaId:
                textoSeguro(
                    registro?.competencia_id,
                    60,
                ),
            competencia:
                textoSeguro(
                    registro?.competencia,
                    30,
                ),
            competenciaLabel:
                formatarCompetenciaHistorico(
                    registro?.competencia,
                ),
            fechadoEm:
                textoSeguro(
                    registro?.fechado_em,
                    60,
                ),
            fechadoPor:
                textoSeguro(
                    registro?.fechado_por,
                    60,
                ),
            resumo:
                normalizarResumo(
                    registro?.resumo,
                ),
        }),
    );
}

export function criarServicoCicloCertidaoMensal({
    clienteSupabase,
} = {}) {
    const cliente =
        validarClienteSupabase(
            clienteSupabase,
        );

    async function obterCompetenciaExistente({
        empresaId,
        competencia,
    } = {}) {
        const empresaIdNormalizado =
            normalizarUuid(
                empresaId,
                "Identificador da empresa",
            );

        const competenciaNormalizada =
            normalizarCompetenciaCiclo(
                competencia,
            );

        if (
            typeof cliente.from !==
            "function"
        ) {
            throw new Error(
                "Cliente Supabase sem suporte à leitura da competência.",
            );
        }

        const resposta =
            await cliente
                .from(
                    "certidao_mensal_competencias",
                )
                .select(
                    [
                        "id",
                        "empresa_id",
                        "competencia",
                        "status",
                        "contrato_versao",
                        "fechado_em",
                        "fechado_por",
                        "atualizado_em",
                    ].join(","),
                )
                .eq(
                    "empresa_id",
                    empresaIdNormalizado,
                )
                .eq(
                    "competencia",
                    competenciaNormalizada,
                )
                .maybeSingle();

        if (resposta?.error) {
            throw resposta.error;
        }

        const registro =
            resposta?.data ||
            null;

        if (!registro?.id) {
            return null;
        }

        return {
            competenciaId:
                textoSeguro(
                    registro.id,
                    60,
                ),

            empresaId:
                textoSeguro(
                    registro.empresa_id,
                    60,
                ),

            competencia:
                textoSeguro(
                    registro.competencia,
                    30,
                ),

            status:
                textoSeguro(
                    registro.status,
                    40,
                ),

            contratoVersao:
                Number(
                    registro.contrato_versao,
                ) || 0,

            criada:
                false,

            reutilizada:
                true,

            fechadoEm:
                registro.fechado_em ||
                null,

            fechadoPor:
                registro.fechado_por ||
                null,

            atualizadoEm:
                registro.atualizado_em ||
                null,
        };
    }

    async function obterOuCriarCompetencia({
        empresaId,
        competencia,
    } = {}) {
        const empresaIdNormalizado =
            normalizarUuid(
                empresaId,
                "Identificador da empresa",
            );

        const competenciaNormalizada =
            normalizarCompetenciaCiclo(
                competencia,
            );

        const resultado =
            await executarRpc(
                cliente,
                CERTIDAO_MENSAL_CICLO_RPC
                    .OBTER_OU_CRIAR_COMPETENCIA,
                {
                    p_empresa_id:
                        empresaIdNormalizado,
                    p_competencia:
                        competenciaNormalizada,
                },
                "Não foi possível iniciar a competência.",
            );

        return normalizarResumo(
            resultado,
        );
    }

    async function listarItensAutomaticos({
        competenciaId,
    } = {}) {
        const competenciaIdNormalizado =
            normalizarUuid(
                competenciaId,
                "Identificador da competência",
            );

        if (
            typeof cliente.from !==
            "function"
        ) {
            throw new Error(
                "Cliente Supabase sem suporte à leitura dos itens automáticos.",
            );
        }

        let resposta;

        try {
            resposta =
                await cliente
                    .from(
                        "certidao_mensal_itens",
                    )
                    .select(
                        [
                            "id",
                            "competencia_id",
                            "tipo_documento",
                            "titulo",
                            "origem",
                            "status",
                            "snapshot_automatico",
                            "atualizado_em",
                        ].join(","),
                    )
                    .eq(
                        "competencia_id",
                        competenciaIdNormalizado,
                    )
                    .eq(
                        "origem",
                        "SISTEMA",
                    )
                    .in(
                        "tipo_documento",
                        CERTIDAO_MENSAL_TIPOS_AUTOMATICOS,
                    )
                    .order(
                        "tipo_documento",
                        {
                            ascending: true,
                        },
                    );
        }
        catch (erro) {
            throw criarErroCiclo(
                obterMensagemErro(
                    erro,
                    "Não foi possível carregar os itens automáticos da competência.",
                ),
                {
                    codigo:
                        erro?.code,
                    causa:
                        erro,
                },
            );
        }

        if (resposta?.error) {
            throw criarErroCiclo(
                obterMensagemErro(
                    resposta.error,
                    "Não foi possível carregar os itens automáticos da competência.",
                ),
                {
                    codigo:
                        resposta.error.code,
                    causa:
                        resposta.error,
                },
            );
        }

        return (
            Array.isArray(
                resposta?.data,
            )
                ? resposta.data
                : []
        )
            .map(
                normalizarItemAutomaticoPersistido,
            )
            .filter(Boolean);
    }

    async function consolidarRelacaoEmpregados({
        competenciaId,
        item,
    } = {}) {
        const competenciaIdNormalizado =
            normalizarUuid(
                competenciaId,
                "Identificador da competência",
            );

        const itemNormalizado =
            normalizarItemAutomatico(
                item,
            );

        if (
            itemNormalizado.tipoDocumento !==
            "relacao-empregados"
        ) {
            throw new Error(
                "A consolidação parcial aceita somente a Relação de Empregados.",
            );
        }

        const resultado =
            await executarRpc(
                cliente,
                CERTIDAO_MENSAL_CICLO_RPC
                    .CONSOLIDAR_RELACAO_EMPREGADOS,
                {
                    p_competencia_id:
                        competenciaIdNormalizado,
                    p_item:
                        itemNormalizado,
                },
                "Não foi possível consolidar a Relação de Empregados.",
            );

        return normalizarResumo(
            resultado,
        );
    }
    async function consolidarItensAutomaticos({
        competenciaId,
        itens,
    } = {}) {
        const competenciaIdNormalizado =
            normalizarUuid(
                competenciaId,
                "Identificador da competência",
            );

        const itensNormalizados =
            normalizarItensAutomaticos(
                itens,
            );

        const resultado =
            await executarRpc(
                cliente,
                CERTIDAO_MENSAL_CICLO_RPC
                    .CONSOLIDAR_ITENS_AUTOMATICOS,
                {
                    p_competencia_id:
                        competenciaIdNormalizado,
                    p_itens:
                        itensNormalizados,
                },
                "Não foi possível consolidar os itens automáticos.",
            );

        return normalizarResumo(
            resultado,
        );
    }

    async function fecharCompetencia({
        competenciaId,
    } = {}) {
        const competenciaIdNormalizado =
            normalizarUuid(
                competenciaId,
                "Identificador da competência",
            );

        const resultado =
            await executarRpc(
                cliente,
                CERTIDAO_MENSAL_CICLO_RPC
                    .FECHAR_COMPETENCIA,
                {
                    p_competencia_id:
                        competenciaIdNormalizado,
                },
                "Não foi possível fechar a competência.",
            );

        return normalizarResumo(
            resultado,
        );
    }

    async function reabrirCompetencia({
        competenciaId,
        motivo,
    } = {}) {
        const competenciaIdNormalizado =
            normalizarUuid(
                competenciaId,
                "Identificador da competência",
            );

        const motivoNormalizado =
            normalizarMotivo(
                motivo,
            );

        const resultado =
            await executarRpc(
                cliente,
                CERTIDAO_MENSAL_CICLO_RPC
                    .REABRIR_COMPETENCIA,
                {
                    p_competencia_id:
                        competenciaIdNormalizado,
                    p_motivo:
                        motivoNormalizado,
                },
                "Não foi possível reabrir a competência.",
            );

        return normalizarResumo(
            resultado,
        );
    }

    async function listarHistoricoAnual({
        empresaId,
        ano,
    } = {}) {
        const empresaIdNormalizado =
            normalizarUuid(
                empresaId,
                "Identificador da empresa",
            );

        const anoNormalizado =
            normalizarAno(
                ano,
            );

        const resultado =
            await executarRpc(
                cliente,
                CERTIDAO_MENSAL_CICLO_RPC
                    .LISTAR_HISTORICO_ANUAL,
                {
                    p_empresa_id:
                        empresaIdNormalizado,
                    p_ano:
                        anoNormalizado,
                },
                "Não foi possível carregar o histórico anual.",
            );

        return normalizarHistoricoAnualCertidaoMensal(
            resultado,
        );
    }

    return Object.freeze({
        obterCompetenciaExistente,
        obterOuCriarCompetencia,
        listarItensAutomaticos,
        consolidarRelacaoEmpregados,
        consolidarItensAutomaticos,
        fecharCompetencia,
        reabrirCompetencia,
        listarHistoricoAnual,
    });
}
