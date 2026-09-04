import {
    definirFuncoesTreinamentosRemotas,
    normalizarCertificado,
    normalizarColaborador,
} from "../../../services/colaboradorDocumentosService.js";

import {
    listarEvidenciasCertificadosEmLoteService,
} from "../../../services/certificadosEvidenciasService.js";

import {
    carregarFuncoesTreinamentosRemotas,
} from "../../../services/funcoesTreinamentosService.js";

import {
    criarEstruturaBaseConsolidacaoColaborador,
} from "../domain/consolidacaoColaboradorStructure.js";

function textoSeguro(valor = "") {
    return String(
        valor ?? ""
    ).trim();
}

function validarSupabase(
    supabase
) {
    if (
        !supabase ||
        typeof supabase.from !==
            "function"
    ) {
        throw new Error(
            "Cliente Supabase não informado para a Consolidação do Colaborador."
        );
    }
}

function validarUuid(
    valor,
    rotulo = "UUID"
) {
    const uuid =
        textoSeguro(
            valor
        )
            .toLowerCase();

    if (
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
            uuid
        )
    ) {
        throw new Error(
            `${rotulo} inválido.`
        );
    }

    return uuid;
}

async function carregarColaboradorComEmpresa({
    supabase,
    colaboradorId,
} = {}) {
    const {
        data,
        error,
    } =
        await supabase
            .from(
                "colaboradores"
            )
            .select(`
                id,
                empresa_id,
                nome,
                funcao,
                matricula,
                matricula_esocial,
                cpf,
                codigo_funcionario,
                status,
                status_mobilizacao,
                data_admissao,
                data_desligamento,
                data_demissao,
                treinamentos_removidos,
                treinamentos_adicionais,
                empresa:empresas(
                    id,
                    nome,
                    cnpj,
                    tipo_empresa,
                    empresa_pai_id,
                    status
                )
            `)
            .eq(
                "id",
                colaboradorId
            )
            .maybeSingle();

    if (error) {
        throw new Error(
            `Erro ao carregar colaborador da Consolidação: ${error.message}`
        );
    }

    if (!data) {
        throw new Error(
            "Colaborador não localizado ou sem acesso autorizado."
        );
    }

    const empresaBruta =
        data?.empresa ||
        null;

    const colaborador =
        normalizarColaborador({
            ...data,
            empresas:
                empresaBruta,
        });

    return {
        colaborador,
        empresaBruta,
    };
}

async function carregarEmpresaPai({
    supabase,
    empresaPaiId,
} = {}) {
    if (
        !textoSeguro(
            empresaPaiId
        )
    ) {
        return null;
    }

    const {
        data,
        error,
    } =
        await supabase
            .from(
                "empresas"
            )
            .select(
                "id, nome"
            )
            .eq(
                "id",
                empresaPaiId
            )
            .maybeSingle();

    if (error) {
        throw new Error(
            `Erro ao carregar empresa principal da Consolidação: ${error.message}`
        );
    }

    return data || null;
}

async function carregarCertificadosColaborador({
    supabase,
    colaboradorId,
} = {}) {
    const {
        data,
        error,
    } =
        await supabase
            .from(
                "certificados"
            )
            .select(`
                id,
                colaborador_id,
                treinamento_id,
                treinamento_codigo,
                tipo_treinamento,
                nome_treinamento,
                data_realizacao,
                data_vencimento,
                arquivo_url,
                arquivo_nome,
                status_validacao,
                observacao,
                created_at
            `)
            .eq(
                "colaborador_id",
                colaboradorId
            )
            .order(
                "created_at",
                {
                    ascending:
                        true,
                }
            );

    if (error) {
        throw new Error(
            `Erro ao carregar documentos do colaborador: ${error.message}`
        );
    }

    return (
        Array.isArray(
            data
        )
            ? data
            : []
    ).map(
        normalizarCertificado
    );
}

async function carregarVinculosObraEmpresa({
    supabase,
    empresaId,
} = {}) {
    if (
        !textoSeguro(
            empresaId
        )
    ) {
        return [];
    }

    const {
        data,
        error,
    } =
        await supabase
            .from(
                "empresas_obras"
            )
            .select(`
                id,
                empresa_id,
                obra_id,
                status,
                tipo_vinculo,
                obra:obras(
                    id,
                    nome,
                    status
                )
            `)
            .eq(
                "empresa_id",
                empresaId
            );

    if (error) {
        throw new Error(
            `Erro ao carregar vínculos de obra da Consolidação: ${error.message}`
        );
    }

    return Array.isArray(
        data
    )
        ? data
        : [];
}

async function carregarVerificacoesCertificados({
    supabase,
    certificadoIds = [],
} = {}) {
    const ids =
        Array.from(
            new Set(
                (
                    Array.isArray(
                        certificadoIds
                    )
                        ? certificadoIds
                        : []
                )
                    .map(
                        textoSeguro
                    )
                    .filter(Boolean)
            )
        );

    if (
        ids.length === 0
    ) {
        return [];
    }

    const {
        data,
        error,
    } =
        await supabase
            .from(
                "verificacoes_documentais"
            )
            .select(`
                id,
                documento_id,
                status_verificacao,
                nivel_risco,
                score_risco,
                resumo,
                origem_analise,
                created_at,
                updated_at
            `)
            .eq(
                "origem_tipo",
                "certificado"
            )
            .eq(
                "origem_tabela",
                "certificados"
            )
            .in(
                "documento_id",
                ids
            )
            .order(
                "created_at",
                {
                    ascending:
                        false,
                }
            );

    if (error) {
        throw new Error(
            `Erro ao carregar verificações documentais da Consolidação: ${error.message}`
        );
    }

    return Array.isArray(
        data
    )
        ? data
        : [];
}

async function carregarMatrizRemota({
    supabase,
} = {}) {
    const resultado =
        await carregarFuncoesTreinamentosRemotas({
            supabase,
        });

    /*
     * O Consolidação não deve calcular pendências com
     * matriz incompleta quando existe uma fonte
     * remota canônica esperada.
     */
    if (
        !resultado
            ?.disponivel
    ) {
        throw new Error(
            resultado?.motivo ||
            "Matriz remota de funções e treinamentos indisponível."
        );
    }

    definirFuncoesTreinamentosRemotas(
        resultado.funcoes ||
        []
    );

    return resultado.funcoes ||
        [];
}

function normalizarEmpresa({
    empresaBruta,
    empresaPai,
} = {}) {
    if (
        !empresaBruta
    ) {
        return null;
    }

    return {
        id:
            empresaBruta.id ||
            null,

        nome:
            textoSeguro(
                empresaBruta.nome
            ),

        cnpj:
            textoSeguro(
                empresaBruta.cnpj
            ),

        tipoEmpresa:
            textoSeguro(
                empresaBruta
                    .tipo_empresa
            ),

        empresaPaiId:
            empresaBruta
                .empresa_pai_id ||
            null,

        empresaPaiNome:
            textoSeguro(
                empresaPai?.nome
            ),
    };
}

/*
 * Fundação read-only da Consolidação.
 *
 * Este serviço:
 * - não escreve em banco;
 * - não altera Storage;
 * - não gera ZIP;
 * - não gera PDF;
 * - não registra histórico;
 * - não recalcula validade persistida;
 * - respeita RLS do usuário autenticado.
 */
export async function carregarEstruturaBaseConsolidacaoColaboradorService({
    supabase,
    colaboradorId,
    obraContextoId = null,
} = {}) {
    validarSupabase(
        supabase
    );

    const id =
        validarUuid(
            colaboradorId,
            "UUID do colaborador"
        );

    const obraContexto =
        textoSeguro(
            obraContextoId
        )
            ? validarUuid(
                obraContextoId,
                "UUID da obra de contexto"
            )
            : null;

    const [
        contextoColaborador,
        funcoesRemotas,
    ] =
        await Promise.all([
            carregarColaboradorComEmpresa({
                supabase,
                colaboradorId:
                    id,
            }),

            carregarMatrizRemota({
                supabase,
            }),
        ]);

    const {
        colaborador,
        empresaBruta,
    } =
        contextoColaborador;

    const empresaId =
        empresaBruta?.id ||
        colaborador
            ?.empresaId ||
        null;

    const [
        certificados,
        vinculosObra,
        empresaPai,
    ] =
        await Promise.all([
            carregarCertificadosColaborador({
                supabase,
                colaboradorId:
                    id,
            }),

            carregarVinculosObraEmpresa({
                supabase,
                empresaId,
            }),

            carregarEmpresaPai({
                supabase,
                empresaPaiId:
                    empresaBruta
                        ?.empresa_pai_id ||
                    null,
            }),
        ]);

    const certificadoIds =
        certificados
            .map(
                (item) =>
                    item?.id
            )
            .filter(Boolean);

    const [
        evidencias,
        verificacoes,
    ] =
        await Promise.all([
            listarEvidenciasCertificadosEmLoteService({
                supabase,
                certificadoIds,
                incluirHistoricas:
                    false,
            }),

            carregarVerificacoesCertificados({
                supabase,
                certificadoIds,
            }),
        ]);

    const empresa =
        normalizarEmpresa({
            empresaBruta,
            empresaPai,
        });

    const estrutura =
        criarEstruturaBaseConsolidacaoColaborador({
            colaborador,
            empresa,
            vinculosObra,
            obraContextoId:
                obraContexto,
            certificados,
            evidencias,
            verificacoes,
        });

    return {
        estrutura,

        diagnostico: {
            somenteLeitura:
                true,

            funcoesRemotasCarregadas:
                funcoesRemotas.length,

            certificadosCarregados:
                certificados.length,

            evidenciasAtuaisCarregadas:
                evidencias.length,

            verificacoesCarregadas:
                verificacoes.length,

            vinculosObraCarregados:
                vinculosObra.length,
        },
    };
}
