const TABELA_MOVIMENTACOES_COLABORADORES =
    "colaboradores_movimentacoes";

const RPCS_MOVIMENTACAO_COLABORADOR =
    Object.freeze({
        DESLIGAMENTO_OPERACIONAL:
            "desligar_colaborador_operacao",

        DEMISSAO:
            "demitir_colaborador",

        REMOBILIZACAO:
            "remobilizar_colaborador",

        READMISSAO:
            "readmitir_colaborador",

        REGULARIZACAO_DEMISSAO_LEGADA:
            "regularizar_demissao_legada_colaborador",

        CORRECAO_INATIVACAO_LEGADA:
            "corrigir_inativacao_legada_colaborador",
    });

const TIPOS_MOVIMENTACAO_COM_STATUS_NOVO =
    new Set([
        "REMOBILIZACAO",
        "READMISSAO",
        "CORRECAO_INATIVACAO_LEGADA",
    ]);

const STATUS_MOBILIZACAO_PROIBIDOS =
    new Set([
        "desmobilizado",
        "inativo",
    ]);

const CAMPOS_HISTORICO_MOVIMENTACOES =
    [
        "id",
        "colaborador_id",
        "empresa_id",
        "tipo_movimentacao",
        "data_evento",
        "status_anterior",
        "status_novo",
        "status_mobilizacao_anterior",
        "status_mobilizacao_novo",
        "data_admissao_anterior",
        "data_admissao_nova",
        "data_desligamento_anterior",
        "data_desligamento_nova",
        "data_demissao_anterior",
        "data_demissao_nova",
        "motivo",
        "observacao",
        "usuario_id",
        "usuario_email",
        "created_at",
    ].join(", ");

function criarErroMovimentacao({
    mensagem,
    codigo = "",
    detalhe = "",
    causa = null,
}) {
    const erro =
        new Error(
            String(
                mensagem ||
                "Não foi possível concluir a movimentação do colaborador."
            )
        );

    erro.code =
        String(
            codigo ||
            ""
        );

    erro.details =
        String(
            detalhe ||
            ""
        );

    if (causa) {
        erro.cause =
            causa;
    }

    return erro;
}

function validarClienteRpc(supabase) {
    if (
        !supabase ||
        typeof supabase.rpc !== "function"
    ) {
        throw criarErroMovimentacao({
            mensagem:
                "Cliente Supabase inválido para movimentação do colaborador.",

            codigo:
                "CLIENTE_SUPABASE_INVALIDO",
        });
    }
}

function validarClienteConsulta(supabase) {
    if (
        !supabase ||
        typeof supabase.from !== "function"
    ) {
        throw criarErroMovimentacao({
            mensagem:
                "Cliente Supabase inválido para consulta do histórico.",

            codigo:
                "CLIENTE_SUPABASE_INVALIDO",
        });
    }
}

function normalizarTexto(valor = "") {
    return String(
        valor ||
        ""
    ).trim();
}

function normalizarTextoComparacao(valor = "") {
    return normalizarTexto(
        valor
    ).toLocaleLowerCase(
        "pt-BR"
    );
}

export function validarDataDemissaoReadmissao({
    dataDemissao = "",
    data_demissao = "",
} = {}) {
    const dataFormal =
        normalizarTexto(
            dataDemissao ||
            data_demissao
        );

    if (dataFormal) {
        return dataFormal;
    }

    throw criarErroMovimentacao({
        mensagem:
            "Readmissão indisponível: vínculo histórico sem data formal de demissão.",

        codigo:
            "READMISSAO_LEGADO_SEM_DATA_DEMISSAO",
    });
}

function validarUuidObrigatorio(
    valor,
    campo
) {
    const texto =
        normalizarTexto(
            valor
        );

    const uuidValido =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            texto
        );

    if (!uuidValido) {
        throw criarErroMovimentacao({
            mensagem:
                `${campo} inválido.`,

            codigo:
                "PARAMETRO_INVALIDO",
        });
    }

    return texto;
}

function validarDataIsoObrigatoria(
    valor,
    campo
) {
    const texto =
        normalizarTexto(
            valor
        );

    const formatoValido =
        /^\d{4}-\d{2}-\d{2}$/.test(
            texto
        );

    const data =
        formatoValido
            ? new Date(
                `${texto}T12:00:00`
            )
            : null;

    if (
        !formatoValido ||
        !data ||
        Number.isNaN(
            data.getTime()
        )
    ) {
        throw criarErroMovimentacao({
            mensagem:
                `${campo} inválida. Utilize o formato AAAA-MM-DD.`,

            codigo:
                "PARAMETRO_INVALIDO",
        });
    }

    const ano =
        String(
            data.getFullYear()
        ).padStart(
            4,
            "0"
        );

    const mes =
        String(
            data.getMonth() + 1
        ).padStart(
            2,
            "0"
        );

    const dia =
        String(
            data.getDate()
        ).padStart(
            2,
            "0"
        );

    if (
        `${ano}-${mes}-${dia}` !==
        texto
    ) {
        throw criarErroMovimentacao({
            mensagem:
                `${campo} inválida.`,

            codigo:
                "PARAMETRO_INVALIDO",
        });
    }

    return texto;
}

function validarMotivoObrigatorio(
    valor
) {
    const motivo =
        normalizarTexto(
            valor
        );

    if (
        motivo.length < 3 ||
        motivo.length > 500
    ) {
        throw criarErroMovimentacao({
            mensagem:
                "Informe um motivo entre 3 e 500 caracteres.",

            codigo:
                "PARAMETRO_INVALIDO",
        });
    }

    return motivo;
}

function validarObservacao(
    valor
) {
    const observacao =
        normalizarTexto(
            valor
        );

    if (
        observacao.length > 2000
    ) {
        throw criarErroMovimentacao({
            mensagem:
                "A observação deve possuir no máximo 2.000 caracteres.",

            codigo:
                "PARAMETRO_INVALIDO",
        });
    }

    return observacao ||
        null;
}

function validarStatusMobilizacaoNovo(
    valor
) {
    const status =
        normalizarTexto(
            valor
        );

    if (!status) {
        throw criarErroMovimentacao({
            mensagem:
                "Informe a nova situação operacional do colaborador.",

            codigo:
                "PARAMETRO_INVALIDO",
        });
    }

    if (
        STATUS_MOBILIZACAO_PROIBIDOS.has(
            normalizarTextoComparacao(
                status
            )
        )
    ) {
        throw criarErroMovimentacao({
            mensagem:
                "A nova situação operacional não pode ser Desmobilizado ou Inativo.",

            codigo:
                "PARAMETRO_INVALIDO",
        });
    }

    return status;
}

function prepararParametrosMovimentacao({
    tipoMovimentacao,
    colaboradorId,
    dataEvento,
    motivo,
    observacao,
    statusMobilizacaoNovo,
}) {
    const tipo =
        normalizarTexto(
            tipoMovimentacao
        ).toUpperCase();

    const rpc =
        RPCS_MOVIMENTACAO_COLABORADOR[
            tipo
        ];

    if (!rpc) {
        throw criarErroMovimentacao({
            mensagem:
                "Tipo de movimentação não suportado.",

            codigo:
                "TIPO_MOVIMENTACAO_INVALIDO",
        });
    }

    const parametros = {
        p_colaborador_id:
            validarUuidObrigatorio(
                colaboradorId,
                "Identificador do colaborador"
            ),

        p_data_evento:
            validarDataIsoObrigatoria(
                dataEvento,
                "Data do evento"
            ),

        p_motivo:
            validarMotivoObrigatorio(
                motivo
            ),

        p_observacao:
            validarObservacao(
                observacao
            ),
    };

    if (
        TIPOS_MOVIMENTACAO_COM_STATUS_NOVO.has(
            tipo
        )
    ) {
        parametros.p_status_mobilizacao_novo =
            validarStatusMobilizacaoNovo(
                statusMobilizacaoNovo
            );
    }

    return {
        tipo,
        rpc,
        parametros,
    };
}

function normalizarResultadoRpc(
    data,
    tipoEsperado
) {
    const resultado =
        Array.isArray(data)
            ? data[0]
            : data;

    if (
        !resultado ||
        typeof resultado !== "object" ||
        !resultado.colaborador
    ) {
        throw criarErroMovimentacao({
            mensagem:
                "A movimentação foi respondida em um formato inesperado.",

            codigo:
                "RESPOSTA_RPC_INVALIDA",
        });
    }

    return {
        colaborador:
            resultado.colaborador,

        movimentacaoId:
            normalizarTexto(
                resultado.movimentacao_id
            ),

        tipoMovimentacao:
            normalizarTexto(
                resultado.tipo_movimentacao ||
                tipoEsperado
            ).toUpperCase(),
    };
}

function normalizarMovimentacaoHistorico(
    item = {}
) {
    return {
        id:
            item.id ||
            "",

        colaboradorId:
            item.colaborador_id ||
            "",

        empresaId:
            item.empresa_id ||
            "",

        tipoMovimentacao:
            item.tipo_movimentacao ||
            "",

        dataEvento:
            item.data_evento ||
            "",

        statusAnterior:
            item.status_anterior ||
            "",

        statusNovo:
            item.status_novo ||
            "",

        statusMobilizacaoAnterior:
            item.status_mobilizacao_anterior ||
            "",

        statusMobilizacaoNovo:
            item.status_mobilizacao_novo ||
            "",

        dataAdmissaoAnterior:
            item.data_admissao_anterior ||
            "",

        dataAdmissaoNova:
            item.data_admissao_nova ||
            "",

        dataDesligamentoAnterior:
            item.data_desligamento_anterior ||
            "",

        dataDesligamentoNova:
            item.data_desligamento_nova ||
            "",

        dataDemissaoAnterior:
            item.data_demissao_anterior ||
            "",

        dataDemissaoNova:
            item.data_demissao_nova ||
            "",

        motivo:
            item.motivo ||
            "",

        observacao:
            item.observacao ||
            "",

        usuarioId:
            item.usuario_id ||
            "",

        usuarioEmail:
            item.usuario_email ||
            "",

        criadoEm:
            item.created_at ||
            "",
    };
}

export function obterMensagemErroMovimentacaoColaborador(
    erro = {}
) {
    const codigo =
        normalizarTexto(
            erro?.code
        ).toUpperCase();

    if (
        [
            "PGRST202",
            "PGRST205",
            "42P01",
            "42703",
            "42883",
        ].includes(codigo)
    ) {
        return (
            "A estrutura de movimentações de colaboradores ainda " +
            "não foi instalada ou atualizada no banco."
        );
    }

    if (codigo === "42501") {
        return (
            normalizarTexto(
                erro?.message
            ) ||
            "Usuário sem permissão para movimentar este colaborador."
        );
    }

    return (
        normalizarTexto(
            erro?.message
        ) ||
        "Não foi possível concluir a movimentação do colaborador."
    );
}

async function executarMovimentacaoColaborador({
    supabase,
    tipoMovimentacao,
    colaboradorId,
    dataEvento,
    motivo,
    observacao = "",
    statusMobilizacaoNovo = "",
}) {
    validarClienteRpc(
        supabase
    );

    const {
        tipo,
        rpc,
        parametros,
    } =
        prepararParametrosMovimentacao({
            tipoMovimentacao,
            colaboradorId,
            dataEvento,
            motivo,
            observacao,
            statusMobilizacaoNovo,
        });

    const {
        data,
        error,
    } =
        await supabase.rpc(
            rpc,
            parametros
        );

    if (error) {
        throw criarErroMovimentacao({
            mensagem:
                obterMensagemErroMovimentacaoColaborador(
                    error
                ),

            codigo:
                error.code,

            detalhe:
                error.details ||
                error.hint ||
                "",

            causa:
                error,
        });
    }

    return normalizarResultadoRpc(
        data,
        tipo
    );
}

export async function desligarColaboradorOperacao({
    supabase,
    colaboradorId,
    dataEvento,
    motivo,
    observacao = "",
}) {
    return executarMovimentacaoColaborador({
        supabase,
        tipoMovimentacao:
            "DESLIGAMENTO_OPERACIONAL",

        colaboradorId,
        dataEvento,
        motivo,
        observacao,
    });
}

export async function demitirColaborador({
    supabase,
    colaboradorId,
    dataEvento,
    motivo,
    observacao = "",
}) {
    return executarMovimentacaoColaborador({
        supabase,
        tipoMovimentacao:
            "DEMISSAO",

        colaboradorId,
        dataEvento,
        motivo,
        observacao,
    });
}

export async function remobilizarColaborador({
    supabase,
    colaboradorId,
    dataEvento,
    motivo,
    observacao = "",
    statusMobilizacaoNovo,
}) {
    return executarMovimentacaoColaborador({
        supabase,
        tipoMovimentacao:
            "REMOBILIZACAO",

        colaboradorId,
        dataEvento,
        motivo,
        observacao,
        statusMobilizacaoNovo,
    });
}

export async function readmitirColaborador({
    supabase,
    colaboradorId,
    dataEvento,
    motivo,
    observacao = "",
    statusMobilizacaoNovo,
    dataDemissao = "",
}) {
    validarDataDemissaoReadmissao({
        dataDemissao,
    });

    return executarMovimentacaoColaborador({
        supabase,
        tipoMovimentacao:
            "READMISSAO",

        colaboradorId,
        dataEvento,
        motivo,
        observacao,
        statusMobilizacaoNovo,
    });
}

export async function regularizarDemissaoLegadaColaborador({
    supabase,
    colaboradorId,
    dataEvento,
    motivo,
    observacao = "",
}) {
    return executarMovimentacaoColaborador({
        supabase,
        tipoMovimentacao:
            "REGULARIZACAO_DEMISSAO_LEGADA",
        colaboradorId,
        dataEvento,
        motivo,
        observacao,
    });
}

export async function corrigirInativacaoLegadaColaborador({
    supabase,
    colaboradorId,
    dataEvento,
    motivo,
    observacao = "",
    statusMobilizacaoNovo,
}) {
    return executarMovimentacaoColaborador({
        supabase,
        tipoMovimentacao:
            "CORRECAO_INATIVACAO_LEGADA",
        colaboradorId,
        dataEvento,
        motivo,
        observacao,
        statusMobilizacaoNovo,
    });
}

export async function listarMovimentacoesEmpresa({
    supabase,
    empresaId,
    limite = 5000,
}) {
    validarClienteConsulta(
        supabase
    );

    const id =
        validarUuidObrigatorio(
            empresaId,
            "Identificador da empresa"
        );

    const limiteNumerico =
        Number(
            limite
        );

    const limiteSeguro =
        Number.isInteger(
            limiteNumerico
        )
            ? Math.min(
                Math.max(
                    limiteNumerico,
                    1
                ),
                10000
            )
            : 5000;

    const tamanhoPagina =
        Math.min(
            500,
            limiteSeguro
        );

    const acumulado = [];

    let inicio =
        0;

    while (
        acumulado.length <
        limiteSeguro
    ) {
        const fim =
            Math.min(
                inicio +
                    tamanhoPagina -
                    1,
                limiteSeguro -
                    1
            );

        const {
            data,
            error,
        } =
            await supabase
                .from(
                    TABELA_MOVIMENTACOES_COLABORADORES
                )
                .select(
                    CAMPOS_HISTORICO_MOVIMENTACOES
                )
                .eq(
                    "empresa_id",
                    id
                )
                .order(
                    "data_evento",
                    {
                        ascending:
                            true,
                    }
                )
                .order(
                    "created_at",
                    {
                        ascending:
                            true,
                    }
                )
                .order(
                    "id",
                    {
                        ascending:
                            true,
                    }
                )
                .range(
                    inicio,
                    fim
                );

        if (error) {
            throw criarErroMovimentacao({
                mensagem:
                    obterMensagemErroMovimentacaoColaborador(
                        error
                    ),

                codigo:
                    error.code,

                detalhe:
                    error.details ||
                    error.hint ||
                    "",

                causa:
                    error,
            });
        }

        const lote =
            Array.isArray(
                data
            )
                ? data
                : [];

        acumulado.push(
            ...lote
        );

        const quantidadeEsperada =
            fim -
            inicio +
            1;

        if (
            lote.length <
            quantidadeEsperada
        ) {
            break;
        }

        inicio =
            fim +
            1;
    }

    return acumulado.map(
        normalizarMovimentacaoHistorico
    );
}

export async function listarMovimentacoesColaborador({
    supabase,
    colaboradorId,
    limite = 100,
}) {
    validarClienteConsulta(
        supabase
    );

    const id =
        validarUuidObrigatorio(
            colaboradorId,
            "Identificador do colaborador"
        );

    const limiteNumerico =
        Number(
            limite
        );

    const limiteSeguro =
        Number.isInteger(
            limiteNumerico
        )
            ? Math.min(
                Math.max(
                    limiteNumerico,
                    1
                ),
                500
            )
            : 100;

    const {
        data,
        error,
    } =
        await supabase
            .from(
                TABELA_MOVIMENTACOES_COLABORADORES
            )
            .select(
                CAMPOS_HISTORICO_MOVIMENTACOES
            )
            .eq(
                "colaborador_id",
                id
            )
            .order(
                "data_evento",
                {
                    ascending:
                        false,
                }
            )
            .order(
                "created_at",
                {
                    ascending:
                        false,
                }
            )
            .limit(
                limiteSeguro
            );

    if (error) {
        throw criarErroMovimentacao({
            mensagem:
                obterMensagemErroMovimentacaoColaborador(
                    error
                ),

            codigo:
                error.code,

            detalhe:
                error.details ||
                error.hint ||
                "",

            causa:
                error,
        });
    }

    return (
        Array.isArray(data)
            ? data
            : []
    ).map(
        normalizarMovimentacaoHistorico
    );
}

export const CONTRATO_MOVIMENTACOES_COLABORADORES =
    Object.freeze({
        tabela:
            TABELA_MOVIMENTACOES_COLABORADORES,

        rpcs:
            RPCS_MOVIMENTACAO_COLABORADOR,

        limiteMaximoHistorico:
            500,
    });
