export const CONSOLIDACAO_COLABORADOR_HISTORICO_SCHEMA_VERSION =
    "consolidacao-colaborador-historico-v1";

export const CONSOLIDACAO_COLABORADOR_ACAO_GERADO =
    "CONSOLIDACAO_COLABORADOR_GERADO";

export const CONSOLIDACAO_COLABORADOR_TABELA_AUDITORIA =
    "colaboradores";

function textoSeguro(valor) {
    return String(valor ?? "").trim();
}

function inteiroSeguro(
    valor,
    fallback = 0
) {
    const numero =
        Number(valor);

    return Number.isFinite(numero)
        ? Math.trunc(numero)
        : fallback;
}

function primeiroTexto(
    objeto,
    campos = []
) {
    for (const campo of campos) {
        const valor =
            textoSeguro(
                objeto?.[campo]
            );

        if (valor) {
            return valor;
        }
    }

    return "";
}

function validarEstruturaHistorico(
    estruturaExportacao
) {
    if (
        !estruturaExportacao ||
        typeof estruturaExportacao !==
            "object"
    ) {
        throw new Error(
            "Histórico da Consolidação: Estrutura de Exportação ausente."
        );
    }

    const exportacao =
        estruturaExportacao
            ?.exportacao;

    if (
        !exportacao ||
        typeof exportacao !==
            "object"
    ) {
        throw new Error(
            "Histórico da Consolidação: bloco exportacao ausente."
        );
    }

    if (
        exportacao
            ?.podeGerar !==
        true
    ) {
        throw new Error(
            "Histórico da Consolidação: seleção não está liberada para geração."
        );
    }

    const selecaoId =
        textoSeguro(
            exportacao
                ?.selecaoId
        );

    if (!selecaoId) {
        throw new Error(
            "Histórico da Consolidação: selecaoId ausente."
        );
    }

    const colaboradorId =
        textoSeguro(
            estruturaExportacao
                ?.colaborador
                ?.id
        );

    if (!colaboradorId) {
        throw new Error(
            "Histórico da Consolidação: colaborador sem identificador canônico."
        );
    }

    return {
        exportacao,
        selecaoId,
        colaboradorId,
    };
}

function validarResultadoZipHistorico({
    resultadoZip,
    selecaoId,
} = {}) {
    if (
        !resultadoZip ||
        typeof resultadoZip !==
            "object"
    ) {
        throw new Error(
            "Histórico da Consolidação: resultado ZIP ausente."
        );
    }

    const selecaoIdZip =
        textoSeguro(
            resultadoZip
                ?.selecaoId
        );

    if (
        !selecaoIdZip ||
        selecaoIdZip !==
            selecaoId
    ) {
        throw new Error(
            "Histórico da Consolidação: seleção do ZIP diverge da seleção canônica."
        );
    }

    const nomeArquivo =
        textoSeguro(
            resultadoZip
                ?.nomeArquivo
        );

    if (!nomeArquivo) {
        throw new Error(
            "Histórico da Consolidação: nome do ZIP ausente."
        );
    }

    return {
        selecaoIdZip,
        nomeArquivo,
    };
}

export function criarEventoHistoricoConsolidacaoColaborador({
    estruturaExportacao,
    resultadoZip,
} = {}) {
    const {
        selecaoId,
        colaboradorId,
    } =
        validarEstruturaHistorico(
            estruturaExportacao
        );

    const {
        nomeArquivo,
    } =
        validarResultadoZipHistorico({
            resultadoZip,
            selecaoId,
        });

    const colaborador =
        estruturaExportacao
            ?.colaborador ||
        {};

    const empresa =
        estruturaExportacao
            ?.empresa ||
        {};

    const obra =
        estruturaExportacao
            ?.obra ||
        {};

    const colaboradorNome =
        primeiroTexto(
            colaborador,
            [
                "nomeCompleto",
                "nome_completo",
                "nome",
            ]
        ) ||
        "Colaborador";

    const empresaId =
        textoSeguro(
            empresa?.id
        ) ||
        null;

    const empresaNome =
        primeiroTexto(
            empresa,
            [
                "nome",
                "razaoSocial",
                "razao_social",
                "nomeFantasia",
                "nome_fantasia",
            ]
        ) ||
        null;

    const obraId =
        textoSeguro(
            obra?.id
        ) ||
        null;

    const obraNome =
        primeiroTexto(
            obra,
            [
                "nome",
                "descricao",
            ]
        ) ||
        null;

    const resumoPdf =
        resultadoZip
            ?.resumoPdf &&
        typeof resultadoZip
            .resumoPdf ===
            "object"
            ? {
                caminhoRelativo:
                    textoSeguro(
                        resultadoZip
                            .resumoPdf
                            ?.caminhoRelativo
                    ) ||
                    null,

                nomeArquivo:
                    textoSeguro(
                        resultadoZip
                            .resumoPdf
                            ?.nomeArquivo
                    ) ||
                    null,

                totalPaginas:
                    inteiroSeguro(
                        resultadoZip
                            .resumoPdf
                            ?.totalPaginas
                    ),

                tamanhoBytes:
                    inteiroSeguro(
                        resultadoZip
                            .resumoPdf
                            ?.tamanhoBytes
                    ),
            }
            : null;

    const dados = {
        schemaVersion:
            CONSOLIDACAO_COLABORADOR_HISTORICO_SCHEMA_VERSION,

        selecaoId,

        planoId:
            textoSeguro(
                resultadoZip
                    ?.planoId
            ) ||
            null,

        colaboradorId,
        colaboradorNome,

        empresaId,
        empresaNome,

        obraId,
        obraNome,

        nomeArquivo,

        totalDocumentos:
            inteiroSeguro(
                resultadoZip
                    ?.totalDocumentos
            ),

        totalArquivos:
            inteiroSeguro(
                resultadoZip
                    ?.totalArquivos
            ),

        totalEntradas:
            inteiroSeguro(
                resultadoZip
                    ?.totalEntradas
            ),

        totalPastas:
            inteiroSeguro(
                resultadoZip
                    ?.totalPastas
            ),

        tamanhoBytesZip:
            inteiroSeguro(
                resultadoZip
                    ?.tamanhoBytesZip
            ),

        tamanhoBytesConteudo:
            inteiroSeguro(
                resultadoZip
                    ?.tamanhoBytesConteudo
            ),

        resumoPdf,

        estrategia:
            textoSeguro(
                resultadoZip
                    ?.estrategia
            ) ||
            null,

        statusDownload:
            "INICIADO",
    };

    return {
        schemaVersion:
            CONSOLIDACAO_COLABORADOR_HISTORICO_SCHEMA_VERSION,

        acao:
            CONSOLIDACAO_COLABORADOR_ACAO_GERADO,

        tabela:
            CONSOLIDACAO_COLABORADOR_TABELA_AUDITORIA,

        descricao:
            `Consolidação documental gerado / download iniciado: ${colaboradorNome}`,

        registroId:
            colaboradorId,

        dados,
    };
}

export async function registrarHistoricoConsolidacaoColaboradorService({
    registrarAuditoria,
    estruturaExportacao,
    resultadoZip,
} = {}) {
    const evento =
        criarEventoHistoricoConsolidacaoColaborador({
            estruturaExportacao,
            resultadoZip,
        });

    if (
        typeof registrarAuditoria !==
        "function"
    ) {
        return {
            ok: false,
            registrado: false,
            motivo:
                "auditoria_indisponivel",
            evento,
        };
    }

    const retorno =
        await registrarAuditoria(
            evento.acao,
            evento.tabela,
            evento.descricao,
            evento.registroId,
            evento.dados
        );

    return {
        ok:
            retorno === true,

        registrado:
            retorno === true,

        motivo:
            retorno === true
                ? ""
                : "auditoria_nao_registrada",

        evento,
    };
}

function objetoAuditoriaSeguro(
    valor
) {
    if (
        valor &&
        typeof valor ===
            "object" &&
        !Array.isArray(
            valor
        )
    ) {
        return valor;
    }

    if (
        typeof valor ===
        "string"
    ) {
        try {
            const convertido =
                JSON.parse(
                    valor
                );

            if (
                convertido &&
                typeof convertido ===
                    "object" &&
                !Array.isArray(
                    convertido
                )
            ) {
                return convertido;
            }
        }
        catch {
            return {};
        }
    }

    return {};
}

function formatarDataHoraHistorico(
    valor
) {
    const texto =
        textoSeguro(
            valor
        );

    if (!texto) {
        return "-";
    }

    const data =
        new Date(
            texto
        );

    if (
        Number.isNaN(
            data.getTime()
        )
    ) {
        return texto;
    }

    return new Intl.DateTimeFormat(
        "pt-BR",
        {
            dateStyle:
                "short",

            timeStyle:
                "short",
        }
    ).format(
        data
    );
}

function normalizarRegistroHistoricoConsolidacao(
    registro
) {
    const dados =
        objetoAuditoriaSeguro(
            registro?.dados
        );

    return {
        id:
            textoSeguro(
                registro?.id
            ),

        createdAt:
            textoSeguro(
                registro?.created_at
            ),

        dataHoraRotulo:
            formatarDataHoraHistorico(
                registro?.created_at
            ),

        usuarioEmail:
            textoSeguro(
                registro?.usuario_email
            ) ||
            "Usuário não identificado",

        acao:
            textoSeguro(
                registro?.acao
            ),

        tabela:
            textoSeguro(
                registro?.tabela
            ),

        registroId:
            textoSeguro(
                registro?.registro_id
            ),

        descricao:
            textoSeguro(
                registro?.descricao
            ),

        schemaVersion:
            textoSeguro(
                dados?.schemaVersion
            ) ||
            null,

        selecaoId:
            textoSeguro(
                dados?.selecaoId
            ) ||
            null,

        planoId:
            textoSeguro(
                dados?.planoId
            ) ||
            null,

        colaboradorNome:
            textoSeguro(
                dados?.colaboradorNome
            ) ||
            null,

        empresaNome:
            textoSeguro(
                dados?.empresaNome
            ) ||
            null,

        obraNome:
            textoSeguro(
                dados?.obraNome
            ) ||
            null,

        nomeArquivo:
            textoSeguro(
                dados?.nomeArquivo
            ) ||
            "Arquivo ZIP",

        totalDocumentos:
            inteiroSeguro(
                dados?.totalDocumentos
            ),

        totalArquivos:
            inteiroSeguro(
                dados?.totalArquivos
            ),

        totalEntradas:
            inteiroSeguro(
                dados?.totalEntradas
            ),

        totalPastas:
            inteiroSeguro(
                dados?.totalPastas
            ),

        tamanhoBytesZip:
            inteiroSeguro(
                dados?.tamanhoBytesZip
            ),

        tamanhoBytesConteudo:
            inteiroSeguro(
                dados?.tamanhoBytesConteudo
            ),

        estrategia:
            textoSeguro(
                dados?.estrategia
            ) ||
            null,

        statusDownload:
            textoSeguro(
                dados?.statusDownload
            ) ||
            "INICIADO",
    };
}

export async function carregarHistoricoConsolidacaoColaboradorService({
    supabase,
    colaboradorId,
    limite = 10,
} = {}) {
    const idTratado =
        textoSeguro(
            colaboradorId
        );

    if (!idTratado) {
        return {
            registros: [],
            existeMais: false,
            limite: 0,
        };
    }

    if (
        !supabase ||
        typeof supabase.from !==
            "function"
    ) {
        throw new Error(
            "Histórico da Consolidação: cliente Supabase indisponível para leitura."
        );
    }

    const limiteSeguro =
        Math.min(
            25,
            Math.max(
                1,
                inteiroSeguro(
                    limite,
                    10
                )
            )
        );

    const {
        data,
        error,
    } =
        await supabase
            .from(
                "auditoria_sistema"
            )
            .select(
                "id, created_at, usuario_email, acao, tabela, registro_id, descricao, dados"
            )
            .eq(
                "acao",
                CONSOLIDACAO_COLABORADOR_ACAO_GERADO
            )
            .eq(
                "tabela",
                CONSOLIDACAO_COLABORADOR_TABELA_AUDITORIA
            )
            .eq(
                "registro_id",
                idTratado
            )
            .order(
                "created_at",
                {
                    ascending:
                        false,
                }
            )
            .limit(
                limiteSeguro +
                    1
            );

    if (error) {
        throw error;
    }

    const registrosBrutos =
        Array.isArray(
            data
        )
            ? data
            : [];

    const registros =
        registrosBrutos
            .slice(
                0,
                limiteSeguro
            )
            .map(
                normalizarRegistroHistoricoConsolidacao
            );

    return {
        registros,

        existeMais:
            registrosBrutos.length >
            limiteSeguro,

        limite:
            limiteSeguro,
    };
}