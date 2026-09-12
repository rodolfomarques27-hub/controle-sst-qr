const TABELA_CONDICOES_TEMPORARIAS =
    "colaboradores_condicoes_temporarias";

const RPC_INICIAR_CONDICAO_TEMPORARIA =
    "iniciar_condicao_temporaria_colaborador";

const RPC_REGISTRAR_RETORNO =
    "registrar_retorno_condicao_temporaria_colaborador";

const TAMANHO_LOTE_IDS =
    100;

export const TIPOS_CONDICAO_TEMPORARIA =
    Object.freeze([
        Object.freeze({
            codigo: "FERIAS",
            rotulo: "Férias",
        }),
        Object.freeze({
            codigo: "AFASTAMENTO_MEDICO",
            rotulo: "Afastamento médico",
        }),
        Object.freeze({
            codigo: "AFASTAMENTO_INSS_PREVIDENCIARIO",
            rotulo: "Afastamento INSS — comum/previdenciário",
        }),
        Object.freeze({
            codigo: "AFASTAMENTO_INSS_ACIDENTE_TRABALHO",
            rotulo: "Afastamento INSS — acidente de trabalho",
        }),
        Object.freeze({
            codigo: "LICENCA_MATERNIDADE",
            rotulo: "Licença maternidade",
        }),
        Object.freeze({
            codigo: "LICENCA_PATERNIDADE",
            rotulo: "Licença paternidade",
        }),
        Object.freeze({
            codigo: "AFASTAMENTO_ADMINISTRATIVO",
            rotulo: "Licença/afastamento administrativo",
        }),
        Object.freeze({
            codigo: "OUTRO_AFASTAMENTO",
            rotulo: "Outro afastamento",
        }),
    ]);

const TIPOS_CONDICAO_POR_CODIGO =
    new Map(
        TIPOS_CONDICAO_TEMPORARIA.map(
            (item) => [
                item.codigo,
                item,
            ]
        )
    );

const CAMPOS_CONDICAO_TEMPORARIA =
    [
        "id",
        "colaborador_id",
        "empresa_id",
        "tipo",
        "data_inicio",
        "data_fim_prevista",
        "data_retorno",
        "motivo",
        "observacao",
        "registrado_por",
        "registrado_por_email",
        "created_at",
        "retorno_registrado_por",
        "retorno_registrado_por_email",
        "retorno_registrado_em",
        "updated_at",
    ].join(", ");

function normalizarTexto(valor = "") {
    return String(
        valor ??
        ""
    ).trim();
}

function normalizarTextoComparacao(valor = "") {
    return normalizarTexto(
        valor
    )
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .toLowerCase();
}

function criarErroCondicaoTemporaria({
    mensagem,
    codigo = "",
    detalhe = "",
    causa = null,
}) {
    const erro =
        new Error(
            normalizarTexto(
                mensagem
            ) ||
            "Não foi possível processar a condição temporária do colaborador."
        );

    erro.code =
        normalizarTexto(
            codigo
        );

    erro.details =
        normalizarTexto(
            detalhe
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
        throw criarErroCondicaoTemporaria({
            mensagem:
                "Cliente Supabase inválido para condição temporária.",
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
        throw criarErroCondicaoTemporaria({
            mensagem:
                "Cliente Supabase inválido para consulta de condições temporárias.",
            codigo:
                "CLIENTE_SUPABASE_INVALIDO",
        });
    }
}

function validarUuidObrigatorio(
    valor,
    campo
) {
    const texto =
        normalizarTexto(
            valor
        );

    const valido =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            texto
        );

    if (!valido) {
        throw criarErroCondicaoTemporaria({
            mensagem:
                `${campo} inválido.`,
            codigo:
                "PARAMETRO_INVALIDO",
        });
    }

    return texto;
}

function dataIsoValida(valor = "") {
    const texto =
        normalizarTexto(
            valor
        );

    const match =
        texto.match(
            /^(\d{4})-(\d{2})-(\d{2})$/
        );

    if (!match) {
        return false;
    }

    const ano =
        Number(
            match[1]
        );

    const mes =
        Number(
            match[2]
        );

    const dia =
        Number(
            match[3]
        );

    const data =
        new Date(
            Date.UTC(
                ano,
                mes - 1,
                dia
            )
        );

    return (
        data.getUTCFullYear() === ano &&
        data.getUTCMonth() + 1 === mes &&
        data.getUTCDate() === dia
    );
}

function validarDataIsoObrigatoria(
    valor,
    campo
) {
    const texto =
        normalizarTexto(
            valor
        );

    if (!dataIsoValida(texto)) {
        throw criarErroCondicaoTemporaria({
            mensagem:
                `${campo} inválida. Utilize o formato AAAA-MM-DD.`,
            codigo:
                "PARAMETRO_INVALIDO",
        });
    }

    return texto;
}

function validarDataIsoOpcional(
    valor,
    campo
) {
    const texto =
        normalizarTexto(
            valor
        );

    if (!texto) {
        return null;
    }

    return validarDataIsoObrigatoria(
        texto,
        campo
    );
}

function obterDataIsoLocal(
    data = new Date()
) {
    if (
        typeof data === "string"
    ) {
        return validarDataIsoObrigatoria(
            data,
            "Data de referência"
        );
    }

    if (
        !(data instanceof Date) ||
        Number.isNaN(
            data.getTime()
        )
    ) {
        throw criarErroCondicaoTemporaria({
            mensagem:
                "Data de referência inválida.",
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

    return `${ano}-${mes}-${dia}`;
}

function normalizarTipoCondicao(
    valor
) {
    const codigo =
        normalizarTexto(
            valor
        ).toUpperCase();

    if (
        !TIPOS_CONDICAO_POR_CODIGO.has(
            codigo
        )
    ) {
        throw criarErroCondicaoTemporaria({
            mensagem:
                "Tipo de condição temporária inválido.",
            codigo:
                "TIPO_CONDICAO_TEMPORARIA_INVALIDO",
        });
    }

    return codigo;
}

function validarMotivoOpcional(
    valor
) {
    const motivo =
        normalizarTexto(
            valor
        );

    if (!motivo) {
        return null;
    }

    if (
        motivo.length < 3 ||
        motivo.length > 500
    ) {
        throw criarErroCondicaoTemporaria({
            mensagem:
                "O motivo deve possuir entre 3 e 500 caracteres.",
            codigo:
                "PARAMETRO_INVALIDO",
        });
    }

    return motivo;
}

function validarObservacaoOpcional(
    valor
) {
    const observacao =
        normalizarTexto(
            valor
        );

    if (!observacao) {
        return null;
    }

    if (
        observacao.length > 2000
    ) {
        throw criarErroCondicaoTemporaria({
            mensagem:
                "A observação deve possuir no máximo 2.000 caracteres.",
            codigo:
                "PARAMETRO_INVALIDO",
        });
    }

    return observacao;
}

function normalizarResultadoRpc(
    data,
    operacaoEsperada
) {
    const resultado =
        Array.isArray(data)
            ? data[0]
            : data;

    if (
        !resultado ||
        typeof resultado !== "object" ||
        !resultado.condicao
    ) {
        throw criarErroCondicaoTemporaria({
            mensagem:
                "A condição temporária foi respondida em um formato inesperado.",
            codigo:
                "RESPOSTA_RPC_INVALIDA",
        });
    }

    return {
        condicao:
            normalizarCondicaoTemporaria(
                resultado.condicao
            ),

        tipoOperacao:
            normalizarTexto(
                resultado.tipo_operacao ||
                operacaoEsperada
            ),
    };
}

function dividirEmLotes(
    itens = [],
    tamanho = TAMANHO_LOTE_IDS
) {
    const lotes = [];

    for (
        let indice = 0;
        indice < itens.length;
        indice += tamanho
    ) {
        lotes.push(
            itens.slice(
                indice,
                indice + tamanho
            )
        );
    }

    return lotes;
}

function obterCondicaoAnexada(
    colaborador = {}
) {
    return (
        colaborador?.condicaoTemporaria ||
        colaborador?.condicao_temporaria ||
        colaborador?.condicaoTemporariaAtual ||
        colaborador?.condicao_temporaria_atual ||
        null
    );
}

export function obterRotuloTipoCondicaoTemporaria(
    tipo
) {
    const codigo =
        normalizarTexto(
            tipo
        ).toUpperCase();

    return (
        TIPOS_CONDICAO_POR_CODIGO.get(
            codigo
        )?.rotulo ||
        codigo ||
        "Condição temporária"
    );
}

export function normalizarCondicaoTemporaria(
    item = {}
) {
    const tipo =
        normalizarTexto(
            item.tipo ||
            item.tipoCondicao ||
            item.tipo_condicao
        ).toUpperCase();

    return {
        id:
            item.id ||
            "",

        colaboradorId:
            item.colaboradorId ||
            item.colaborador_id ||
            "",

        empresaId:
            item.empresaId ||
            item.empresa_id ||
            "",

        tipo,

        tipoRotulo:
            obterRotuloTipoCondicaoTemporaria(
                tipo
            ),

        dataInicio:
            item.dataInicio ||
            item.data_inicio ||
            "",

        dataFimPrevista:
            item.dataFimPrevista ||
            item.data_fim_prevista ||
            "",

        dataRetorno:
            item.dataRetorno ||
            item.data_retorno ||
            "",

        motivo:
            item.motivo ||
            "",

        observacao:
            item.observacao ||
            "",

        registradoPor:
            item.registradoPor ||
            item.registrado_por ||
            "",

        registradoPorEmail:
            item.registradoPorEmail ||
            item.registrado_por_email ||
            "",

        criadoEm:
            item.criadoEm ||
            item.created_at ||
            "",

        retornoRegistradoPor:
            item.retornoRegistradoPor ||
            item.retorno_registrado_por ||
            "",

        retornoRegistradoPorEmail:
            item.retornoRegistradoPorEmail ||
            item.retorno_registrado_por_email ||
            "",

        retornoRegistradoEm:
            item.retornoRegistradoEm ||
            item.retorno_registrado_em ||
            "",

        atualizadoEm:
            item.atualizadoEm ||
            item.updated_at ||
            "",
    };
}

export function obterCondicaoTemporariaVigente(
    colaborador = {},
    dataReferencia = new Date()
) {
    const origem =
        obterCondicaoAnexada(
            colaborador
        );

    if (!origem) {
        return null;
    }

    const condicao =
        normalizarCondicaoTemporaria(
            origem
        );

    if (
        !dataIsoValida(
            condicao.dataInicio
        )
    ) {
        return null;
    }

    const referencia =
        obterDataIsoLocal(
            dataReferencia
        );

    if (
        condicao.dataInicio >
        referencia
    ) {
        return null;
    }

    if (
        condicao.dataRetorno &&
        dataIsoValida(
            condicao.dataRetorno
        ) &&
        condicao.dataRetorno <=
            referencia
    ) {
        return null;
    }

    return condicao;
}

export function colaboradorTemCondicaoTemporariaVigente(
    colaborador = {},
    dataReferencia = new Date()
) {
    return Boolean(
        obterCondicaoTemporariaVigente(
            colaborador,
            dataReferencia
        )
    );
}

export function colaboradorDisponivelOperacionalmente(
    colaborador = {},
    dataReferencia = new Date()
) {
    const status =
        normalizarTextoComparacao(
            colaborador.status ||
            colaborador.situacao ||
            colaborador.situacaoCadastro
        );

    const mobilizacao =
        normalizarTextoComparacao(
            colaborador.statusMobilizacao ||
            colaborador.status_mobilizacao ||
            colaborador.situacaoMobilizacao
        );

    if (status !== "ativo") {
        return false;
    }

    if (
        mobilizacao.includes(
            "desmobilizado"
        ) ||
        mobilizacao.includes(
            "inativo"
        )
    ) {
        return false;
    }

    return !colaboradorTemCondicaoTemporariaVigente(
        colaborador,
        dataReferencia
    );
}

export function obterMensagemErroCondicaoTemporaria(
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
        ].includes(
            codigo
        )
    ) {
        return (
            "A estrutura de férias e afastamentos ainda " +
            "não foi instalada ou atualizada no banco."
        );
    }

    if (codigo === "42501") {
        return (
            normalizarTexto(
                erro?.message
            ) ||
            "Usuário sem permissão para registrar esta condição temporária."
        );
    }

    if (codigo === "23505") {
        return (
            normalizarTexto(
                erro?.message
            ) ||
            "O colaborador já possui uma condição temporária aberta."
        );
    }

    return (
        normalizarTexto(
            erro?.message
        ) ||
        "Não foi possível processar a condição temporária do colaborador."
    );
}

export async function iniciarCondicaoTemporariaColaborador({
    supabase,
    colaboradorId,
    tipo,
    dataInicio,
    dataFimPrevista = "",
    motivo = "",
    observacao = "",
}) {
    validarClienteRpc(
        supabase
    );

    const inicio =
        validarDataIsoObrigatoria(
            dataInicio,
            "Data de início"
        );

    const fimPrevisto =
        validarDataIsoOpcional(
            dataFimPrevista,
            "Previsão de término"
        );

    if (
        fimPrevisto &&
        fimPrevisto < inicio
    ) {
        throw criarErroCondicaoTemporaria({
            mensagem:
                "A previsão de término não pode ser anterior ao início.",
            codigo:
                "PARAMETRO_INVALIDO",
        });
    }

    const parametros = {
        p_colaborador_id:
            validarUuidObrigatorio(
                colaboradorId,
                "Identificador do colaborador"
            ),

        p_tipo:
            normalizarTipoCondicao(
                tipo
            ),

        p_data_inicio:
            inicio,

        p_data_fim_prevista:
            fimPrevisto,

        p_motivo:
            validarMotivoOpcional(
                motivo
            ),

        p_observacao:
            validarObservacaoOpcional(
                observacao
            ),
    };

    const {
        data,
        error,
    } =
        await supabase.rpc(
            RPC_INICIAR_CONDICAO_TEMPORARIA,
            parametros
        );

    if (error) {
        throw criarErroCondicaoTemporaria({
            mensagem:
                obterMensagemErroCondicaoTemporaria(
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
        "INICIO_CONDICAO_TEMPORARIA"
    );
}

export async function registrarRetornoCondicaoTemporariaColaborador({
    supabase,
    colaboradorId,
    dataRetorno,
}) {
    validarClienteRpc(
        supabase
    );

    const parametros = {
        p_colaborador_id:
            validarUuidObrigatorio(
                colaboradorId,
                "Identificador do colaborador"
            ),

        p_data_retorno:
            validarDataIsoObrigatoria(
                dataRetorno,
                "Data de retorno"
            ),
    };

    const {
        data,
        error,
    } =
        await supabase.rpc(
            RPC_REGISTRAR_RETORNO,
            parametros
        );

    if (error) {
        throw criarErroCondicaoTemporaria({
            mensagem:
                obterMensagemErroCondicaoTemporaria(
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
        "RETORNO_CONDICAO_TEMPORARIA"
    );
}

export async function listarCondicoesTemporariasAbertasPorColaboradores({
    supabase,
    colaboradorIds = [],
}) {
    validarClienteConsulta(
        supabase
    );

    const ids =
        [
            ...new Set(
                (Array.isArray(
                    colaboradorIds
                )
                    ? colaboradorIds
                    : []
                )
                    .filter(Boolean)
                    .map(
                        (id) =>
                            validarUuidObrigatorio(
                                id,
                                "Identificador do colaborador"
                            )
                    )
            ),
        ];

    if (ids.length === 0) {
        return [];
    }

    const acumulado = [];

    for (
        const lote of
        dividirEmLotes(
            ids
        )
    ) {
        const {
            data,
            error,
        } =
            await supabase
                .from(
                    TABELA_CONDICOES_TEMPORARIAS
                )
                .select(
                    CAMPOS_CONDICAO_TEMPORARIA
                )
                .in(
                    "colaborador_id",
                    lote
                )
                .is(
                    "data_retorno",
                    null
                )
                .order(
                    "data_inicio",
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
                );

        if (error) {
            throw criarErroCondicaoTemporaria({
                mensagem:
                    obterMensagemErroCondicaoTemporaria(
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

        acumulado.push(
            ...(
                Array.isArray(data)
                    ? data
                    : []
            )
        );
    }

    return acumulado
        .map(
            normalizarCondicaoTemporaria
        )
        .sort(
            (a, b) => {
                const porData =
                    String(
                        b.dataInicio
                    ).localeCompare(
                        String(
                            a.dataInicio
                        )
                    );

                if (porData !== 0) {
                    return porData;
                }

                return String(
                    b.criadoEm
                ).localeCompare(
                    String(
                        a.criadoEm
                    )
                );
            }
        );
}

export async function listarCondicoesTemporariasColaborador({
    supabase,
    colaboradorId,
    limite = 200,
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
                1000
            )
            : 200;

    const {
        data,
        error,
    } =
        await supabase
            .from(
                TABELA_CONDICOES_TEMPORARIAS
            )
            .select(
                CAMPOS_CONDICAO_TEMPORARIA
            )
            .eq(
                "colaborador_id",
                id
            )
            .order(
                "data_inicio",
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
        throw criarErroCondicaoTemporaria({
            mensagem:
                obterMensagemErroCondicaoTemporaria(
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
        normalizarCondicaoTemporaria
    );
}

export function agruparCondicoesTemporariasAbertasPorColaborador(
    condicoes = []
) {
    return (
        Array.isArray(
            condicoes
        )
            ? condicoes
            : []
    ).reduce(
        (
            acumulador,
            item
        ) => {
            const condicao =
                normalizarCondicaoTemporaria(
                    item
                );

            if (
                !condicao.colaboradorId ||
                condicao.dataRetorno
            ) {
                return acumulador;
            }

            if (
                !acumulador[
                    condicao.colaboradorId
                ]
            ) {
                acumulador[
                    condicao.colaboradorId
                ] =
                    condicao;
            }

            return acumulador;
        },
        {}
    );
}
