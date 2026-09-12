import {
    listarMovimentacoesColaborador,
} from "./colaboradoresMovimentacoesService.js";

import {
    listarCondicoesTemporariasColaborador,
} from "./colaboradoresCondicoesTemporariasService.js";

const ROTULOS_MOVIMENTACAO =
    Object.freeze({
        ADMISSAO:
            "Admissão registrada",

        DESLIGAMENTO_OPERACIONAL:
            "Desmobilização da obra",

        REMOBILIZACAO:
            "Remobilização",

        DEMISSAO:
            "Demissão registrada",

        READMISSAO:
            "Readmissão registrada",

        CORRECAO_CADASTRAL:
            "Correção cadastral",

        REGULARIZACAO_DEMISSAO_LEGADA:
            "Regularização de demissão legada",

        CORRECAO_INATIVACAO_LEGADA:
            "Correção de inativação legada",
    });

function textoSeguro(
    valor = ""
) {
    return String(
        valor ??
        ""
    ).trim();
}

function dataIsoSegura(
    valor = ""
) {
    const texto =
        textoSeguro(
            valor
        );

    const correspondencia =
        texto.match(
            /^(\d{4}-\d{2}-\d{2})/
        );

    return correspondencia?.[1] ||
        "";
}

function timestampSeguro(
    valor = ""
) {
    const timestamp =
        Date.parse(
            textoSeguro(
                valor
            )
        );

    return Number.isFinite(
        timestamp
    )
        ? timestamp
        : 0;
}

function criarChaveFallback({
    origem,
    tipo,
    dataReferencia,
    indice,
} = {}) {
    return [
        textoSeguro(
            origem
        ) ||
            "EVENTO",

        textoSeguro(
            tipo
        ) ||
            "SEM_TIPO",

        dataIsoSegura(
            dataReferencia
        ) ||
            "SEM_DATA",

        String(
            indice
        ),
    ].join(
        ":"
    );
}

function criarEventoMovimentacao(
    movimentacao = {},
    indice = 0
) {
    const tipo =
        textoSeguro(
            movimentacao
                ?.tipoMovimentacao
        ).toUpperCase();

    const dataReferencia =
        dataIsoSegura(
            movimentacao
                ?.dataEvento
        ) ||
        dataIsoSegura(
            movimentacao
                ?.criadoEm
        );

    const id =
        textoSeguro(
            movimentacao?.id
        );

    return Object.freeze({
        chave:
            id
                ? `movimentacao:${id}`
                : criarChaveFallback({
                    origem:
                        "MOVIMENTACAO",

                    tipo,

                    dataReferencia,

                    indice,
                }),

        origem:
            "MOVIMENTACAO",

        categoria:
            "VINCULO_OBRA",

        tipo:
            tipo ||
            "MOVIMENTACAO",

        titulo:
            ROTULOS_MOVIMENTACAO[
                tipo
            ] ||
            "Movimentação profissional",

        dataReferencia,

        instanteRegistro:
            textoSeguro(
                movimentacao
                    ?.criadoEm
            ),

        responsavelEmail:
            textoSeguro(
                movimentacao
                    ?.usuarioEmail
            ),

        motivo:
            textoSeguro(
                movimentacao
                    ?.motivo
            ),

        observacao:
            textoSeguro(
                movimentacao
                    ?.observacao
            ),

        dados:
            Object.freeze({
                statusAnterior:
                    textoSeguro(
                        movimentacao
                            ?.statusAnterior
                    ),

                statusNovo:
                    textoSeguro(
                        movimentacao
                            ?.statusNovo
                    ),

                statusMobilizacaoAnterior:
                    textoSeguro(
                        movimentacao
                            ?.statusMobilizacaoAnterior
                    ),

                statusMobilizacaoNovo:
                    textoSeguro(
                        movimentacao
                            ?.statusMobilizacaoNovo
                    ),

                dataAdmissaoAnterior:
                    dataIsoSegura(
                        movimentacao
                            ?.dataAdmissaoAnterior
                    ),

                dataAdmissaoNova:
                    dataIsoSegura(
                        movimentacao
                            ?.dataAdmissaoNova
                    ),

                dataDesligamentoAnterior:
                    dataIsoSegura(
                        movimentacao
                            ?.dataDesligamentoAnterior
                    ),

                dataDesligamentoNova:
                    dataIsoSegura(
                        movimentacao
                            ?.dataDesligamentoNova
                    ),

                dataDemissaoAnterior:
                    dataIsoSegura(
                        movimentacao
                            ?.dataDemissaoAnterior
                    ),

                dataDemissaoNova:
                    dataIsoSegura(
                        movimentacao
                            ?.dataDemissaoNova
                    ),
            }),
    });
}

function criarEventosCondicaoTemporaria(
    condicao = {},
    indice = 0
) {
    const eventos = [];

    const id =
        textoSeguro(
            condicao?.id
        );

    const tipo =
        textoSeguro(
            condicao?.tipo
        ).toUpperCase();

    const tipoRotulo =
        textoSeguro(
            condicao
                ?.tipoRotulo
        ) ||
        "Condição temporária";

    const dataInicio =
        dataIsoSegura(
            condicao
                ?.dataInicio
        );

    const dataFimPrevista =
        dataIsoSegura(
            condicao
                ?.dataFimPrevista
        );

    const dataRetorno =
        dataIsoSegura(
            condicao
                ?.dataRetorno
        );

    const motivo =
        textoSeguro(
            condicao
                ?.motivo
        );

    const observacao =
        textoSeguro(
            condicao
                ?.observacao
        );

    if (dataInicio) {
        eventos.push(
            Object.freeze({
                chave:
                    id
                        ? `condicao:${id}:inicio`
                        : criarChaveFallback({
                            origem:
                                "CONDICAO_TEMPORARIA_INICIO",

                            tipo,

                            dataReferencia:
                                dataInicio,

                            indice,
                        }),

                origem:
                    "CONDICAO_TEMPORARIA",

                categoria:
                    "INDISPONIBILIDADE_TEMPORARIA",

                tipo:
                    "CONDICAO_INICIO",

                tipoCondicao:
                    tipo,

                titulo:
                    `Início — ${tipoRotulo}`,

                dataReferencia:
                    dataInicio,

                instanteRegistro:
                    textoSeguro(
                        condicao
                            ?.criadoEm
                    ),

                responsavelEmail:
                    textoSeguro(
                        condicao
                            ?.registradoPorEmail
                    ),

                motivo,

                observacao,

                dados:
                    Object.freeze({
                        tipoRotulo,

                        dataFimPrevista,

                        dataRetorno,
                    }),
            })
        );
    }

    if (dataRetorno) {
        eventos.push(
            Object.freeze({
                chave:
                    id
                        ? `condicao:${id}:retorno`
                        : criarChaveFallback({
                            origem:
                                "CONDICAO_TEMPORARIA_RETORNO",

                            tipo,

                            dataReferencia:
                                dataRetorno,

                            indice,
                        }),

                origem:
                    "CONDICAO_TEMPORARIA",

                categoria:
                    "INDISPONIBILIDADE_TEMPORARIA",

                tipo:
                    "CONDICAO_RETORNO",

                tipoCondicao:
                    tipo,

                titulo:
                    `Retorno — ${tipoRotulo}`,

                dataReferencia:
                    dataRetorno,

                instanteRegistro:
                    textoSeguro(
                        condicao
                            ?.retornoRegistradoEm ||
                        condicao
                            ?.atualizadoEm ||
                        condicao
                            ?.criadoEm
                    ),

                responsavelEmail:
                    textoSeguro(
                        condicao
                            ?.retornoRegistradoPorEmail ||
                        condicao
                            ?.registradoPorEmail
                    ),

                motivo,

                observacao,

                dados:
                    Object.freeze({
                        tipoRotulo,

                        dataInicio,

                        dataFimPrevista,
                    }),
            })
        );
    }

    return eventos;
}

function compararEventosHistorico(
    a,
    b
) {
    const porData =
        textoSeguro(
            b?.dataReferencia
        ).localeCompare(
            textoSeguro(
                a?.dataReferencia
            )
        );

    if (porData !== 0) {
        return porData;
    }

    const porRegistro =
        timestampSeguro(
            b?.instanteRegistro
        ) -
        timestampSeguro(
            a?.instanteRegistro
        );

    if (porRegistro !== 0) {
        return porRegistro;
    }

    return textoSeguro(
        a?.chave
    ).localeCompare(
        textoSeguro(
            b?.chave
        ),
        "pt-BR"
    );
}

export function montarHistoricoProfissionalColaborador({
    movimentacoes = [],
    condicoes = [],
} = {}) {
    const listaMovimentacoes =
        Array.isArray(
            movimentacoes
        )
            ? movimentacoes
            : [];

    const listaCondicoes =
        Array.isArray(
            condicoes
        )
            ? condicoes
            : [];

    const eventosMovimentacoes =
        listaMovimentacoes.map(
            criarEventoMovimentacao
        );

    const eventosCondicoes =
        listaCondicoes.flatMap(
            criarEventosCondicaoTemporaria
        );

    const eventos =
        [
            ...eventosMovimentacoes,
            ...eventosCondicoes,
        ].sort(
            compararEventosHistorico
        );

    return Object.freeze({
        eventos:
            Object.freeze(
                eventos
            ),

        total:
            eventos.length,

        totalMovimentacoes:
            eventosMovimentacoes.length,

        totalCondicoes:
            listaCondicoes.length,

        totalEventosCondicoes:
            eventosCondicoes.length,

        readOnly:
            true,
    });
}

export async function carregarHistoricoProfissionalColaborador({
    supabase,
    colaboradorId,
    limiteMovimentacoes = 100,
    limiteCondicoes = 200,
} = {}) {
    const id =
        textoSeguro(
            colaboradorId
        );

    if (!id) {
        return montarHistoricoProfissionalColaborador();
    }

    const [
        movimentacoes,
        condicoes,
    ] =
        await Promise.all([
            listarMovimentacoesColaborador({
                supabase,
                colaboradorId:
                    id,
                limite:
                    limiteMovimentacoes,
            }),

            listarCondicoesTemporariasColaborador({
                supabase,
                colaboradorId:
                    id,
                limite:
                    limiteCondicoes,
            }),
        ]);

    return montarHistoricoProfissionalColaborador({
        movimentacoes,
        condicoes,
    });
}