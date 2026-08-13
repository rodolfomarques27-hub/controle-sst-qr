const TIPOS_CNPJ_EMPRESA =
    new Set([
        "MATRIZ",
        "FILIAL",
        "OUTRO",
    ]);

const SITUACOES_CNPJ_EMPRESA =
    new Set([
        "ATIVO",
        "HISTORICO",
    ]);

function somenteDigitos(
    valor = ""
) {
    return String(
        valor ?? ""
    ).replace(
        /\D/g,
        ""
    );
}

export function normalizarCnpjEmpresa(
    valor = ""
) {
    const cnpj =
        somenteDigitos(
            valor
        );

    return cnpj.length === 14
        ? cnpj
        : "";
}

export function formatarCnpjEmpresa(
    valor = ""
) {
    const cnpj =
        normalizarCnpjEmpresa(
            valor
        );

    if (!cnpj) {
        return "";
    }

    return cnpj.replace(
        /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
        "$1.$2.$3/$4-$5"
    );
}

function normalizarTipo(
    valor = "OUTRO"
) {
    const tipo =
        String(
            valor || ""
        )
            .trim()
            .toUpperCase();

    return TIPOS_CNPJ_EMPRESA.has(
        tipo
    )
        ? tipo
        : "OUTRO";
}

function normalizarSituacao(
    valor = "ATIVO"
) {
    const situacao =
        String(
            valor || ""
        )
            .trim()
            .toUpperCase();

    return SITUACOES_CNPJ_EMPRESA.has(
        situacao
    )
        ? situacao
        : "ATIVO";
}

function textoOuNull(
    valor
) {
    const texto =
        String(
            valor ?? ""
        ).trim();

    return texto || null;
}

function dataOuNull(
    valor
) {
    const data =
        String(
            valor ?? ""
        ).trim();

    return /^\d{4}-\d{2}-\d{2}$/.test(
        data
    )
        ? data
        : null;
}

export function normalizarVinculoCnpjEmpresa(
    registro = {}
) {
    return {
        id:
            registro.id || "",

        empresaId:
            registro.empresa_id ||
            registro.empresaId ||
            "",

        cnpj:
            normalizarCnpjEmpresa(
                registro.cnpj
            ),

        cnpjFormatado:
            formatarCnpjEmpresa(
                registro.cnpj
            ),

        principal:
            registro.principal ===
            true,

        tipo:
            normalizarTipo(
                registro.tipo
            ),

        situacao:
            normalizarSituacao(
                registro.situacao
            ),

        vigenciaInicio:
            registro.vigencia_inicio ||
            registro.vigenciaInicio ||
            "",

        vigenciaFim:
            registro.vigencia_fim ||
            registro.vigenciaFim ||
            "",

        razaoSocialDocumental:
            registro
                .razao_social_documental ||
            registro
                .razaoSocialDocumental ||
            "",

        observacao:
            registro.observacao || "",

        criadoEm:
            registro.criado_em ||
            registro.criadoEm ||
            "",

        atualizadoEm:
            registro.atualizado_em ||
            registro.atualizadoEm ||
            "",
    };
}

export async function listarCnpjsEmpresa({
    supabase,
    empresaId,
}) {
    if (!supabase) {
        throw new Error(
            "Cliente Supabase não informado."
        );
    }

    if (!empresaId) {
        return [];
    }

    const {
        data,
        error,
    } = await supabase
        .from("empresas_cnpjs")
        .select(
            [
                "id",
                "empresa_id",
                "cnpj",
                "principal",
                "tipo",
                "situacao",
                "vigencia_inicio",
                "vigencia_fim",
                "razao_social_documental",
                "observacao",
                "criado_em",
                "atualizado_em",
            ].join(", ")
        )
        .eq(
            "empresa_id",
            empresaId
        )
        .order(
            "principal",
            {
                ascending: false,
            }
        )
        .order(
            "situacao",
            {
                ascending: true,
            }
        )
        .order(
            "cnpj",
            {
                ascending: true,
            }
        );

    if (error) {
        throw new Error(
            `Erro ao carregar CNPJs vinculados: ${error.message}`
        );
    }

    return (
        data || []
    ).map(
        normalizarVinculoCnpjEmpresa
    );
}

export async function adicionarCnpjEmpresa({
    supabase,
    empresaId,
    cnpj,
    tipo = "FILIAL",
    situacao = "ATIVO",
    vigenciaInicio = null,
    vigenciaFim = null,
    razaoSocialDocumental = "",
    observacao = "",
}) {
    if (!supabase) {
        throw new Error(
            "Cliente Supabase não informado."
        );
    }

    if (!empresaId) {
        throw new Error(
            "Empresa não informada."
        );
    }

    const cnpjNormalizado =
        normalizarCnpjEmpresa(
            cnpj
        );

    if (!cnpjNormalizado) {
        throw new Error(
            "Informe um CNPJ válido com 14 dígitos."
        );
    }

    const inicio =
        dataOuNull(
            vigenciaInicio
        );

    const fim =
        dataOuNull(
            vigenciaFim
        );

    if (
        inicio &&
        fim &&
        fim < inicio
    ) {
        throw new Error(
            "A vigência final não pode ser anterior à vigência inicial."
        );
    }

    const payload = {
        empresa_id:
            empresaId,

        cnpj:
            cnpjNormalizado,

        /*
         * O principal continua sendo controlado por empresas.cnpj.
         *
         * Vínculos adicionais criados nesta tela nunca assumem
         * automaticamente a posição de principal.
         */
        principal:
            false,

        tipo:
            normalizarTipo(
                tipo
            ),

        situacao:
            normalizarSituacao(
                situacao
            ),

        vigencia_inicio:
            inicio,

        vigencia_fim:
            fim,

        razao_social_documental:
            textoOuNull(
                razaoSocialDocumental
            ),

        observacao:
            textoOuNull(
                observacao
            ),

        atualizado_em:
            new Date()
                .toISOString(),
    };

    const {
        data,
        error,
    } = await supabase
        .from("empresas_cnpjs")
        .insert(
            payload
        )
        .select()
        .single();

    if (error) {
        if (
            error.code ===
            "23505"
        ) {
            throw new Error(
                "Este CNPJ já está vinculado a uma empresa."
            );
        }

        throw new Error(
            `Erro ao adicionar CNPJ vinculado: ${error.message}`
        );
    }

    return normalizarVinculoCnpjEmpresa(
        data
    );
}

export async function atualizarCnpjEmpresa({
    supabase,
    vinculoId,
    empresaId,
    tipo,
    situacao,
    vigenciaInicio = null,
    vigenciaFim = null,
    razaoSocialDocumental = "",
    observacao = "",
}) {
    if (!supabase) {
        throw new Error(
            "Cliente Supabase não informado."
        );
    }

    if (
        !vinculoId ||
        !empresaId
    ) {
        throw new Error(
            "Vínculo de CNPJ não informado."
        );
    }

    const inicio =
        dataOuNull(
            vigenciaInicio
        );

    const fim =
        dataOuNull(
            vigenciaFim
        );

    if (
        inicio &&
        fim &&
        fim < inicio
    ) {
        throw new Error(
            "A vigência final não pode ser anterior à vigência inicial."
        );
    }

    const {
        data: existente,
        error: erroLeitura,
    } = await supabase
        .from("empresas_cnpjs")
        .select(
            "id, empresa_id, principal"
        )
        .eq(
            "id",
            vinculoId
        )
        .eq(
            "empresa_id",
            empresaId
        )
        .maybeSingle();

    if (erroLeitura) {
        throw new Error(
            `Erro ao conferir vínculo de CNPJ: ${erroLeitura.message}`
        );
    }

    if (!existente) {
        throw new Error(
            "O vínculo de CNPJ não foi localizado."
        );
    }

    const payload = {
        tipo:
            normalizarTipo(
                tipo
            ),

        situacao:
            normalizarSituacao(
                situacao
            ),

        vigencia_inicio:
            inicio,

        vigencia_fim:
            fim,

        razao_social_documental:
            textoOuNull(
                razaoSocialDocumental
            ),

        observacao:
            textoOuNull(
                observacao
            ),

        atualizado_em:
            new Date()
                .toISOString(),
    };

    /*
     * O CNPJ principal também pode receber classificação MATRIZ/FILIAL
     * e dados de vigência, mas permanece principal.
     *
     * Este serviço não troca o CNPJ numérico do principal.
     */
    const {
        data,
        error,
    } = await supabase
        .from("empresas_cnpjs")
        .update(
            payload
        )
        .eq(
            "id",
            vinculoId
        )
        .eq(
            "empresa_id",
            empresaId
        )
        .select()
        .single();

    if (error) {
        throw new Error(
            `Erro ao atualizar CNPJ vinculado: ${error.message}`
        );
    }

    return normalizarVinculoCnpjEmpresa(
        data
    );
}

export async function excluirCnpjEmpresa({
    supabase,
    vinculoId,
    empresaId,
}) {
    if (!supabase) {
        throw new Error(
            "Cliente Supabase não informado."
        );
    }

    if (
        !vinculoId ||
        !empresaId
    ) {
        throw new Error(
            "Vínculo de CNPJ não informado."
        );
    }

    const {
        data: existente,
        error: erroLeitura,
    } = await supabase
        .from("empresas_cnpjs")
        .select(
            "id, principal"
        )
        .eq(
            "id",
            vinculoId
        )
        .eq(
            "empresa_id",
            empresaId
        )
        .maybeSingle();

    if (erroLeitura) {
        throw new Error(
            `Erro ao conferir vínculo de CNPJ: ${erroLeitura.message}`
        );
    }

    if (!existente) {
        throw new Error(
            "O vínculo de CNPJ não foi localizado."
        );
    }

    if (
        existente.principal ===
        true
    ) {
        throw new Error(
            "O CNPJ principal não pode ser excluído por esta ação."
        );
    }

    const {
        error,
    } = await supabase
        .from("empresas_cnpjs")
        .delete()
        .eq(
            "id",
            vinculoId
        )
        .eq(
            "empresa_id",
            empresaId
        );

    if (error) {
        throw new Error(
            `Erro ao excluir CNPJ vinculado: ${error.message}`
        );
    }

    return true;
}

/*
 * Contrato documental comum.
 *
 * Esta função será reutilizada pela Certidão Mensal.
 */
export function obterCnpjsAceitosEmpresa({
    empresa = null,
    vinculos = [],
} = {}) {
    const mapa =
        new Map();

    const cnpjPrincipal =
        normalizarCnpjEmpresa(
            empresa?.cnpj
        );

    if (cnpjPrincipal) {
        mapa.set(
            cnpjPrincipal,
            {
                cnpj:
                    cnpjPrincipal,

                cnpjFormatado:
                    formatarCnpjEmpresa(
                        cnpjPrincipal
                    ),

                principal:
                    true,

                tipo:
                    "OUTRO",

                situacao:
                    "ATIVO",

                vigenciaInicio:
                    "",

                vigenciaFim:
                    "",

                origem:
                    "EMPRESAS",
            }
        );
    }

    for (
        const registro of
        vinculos || []
    ) {
        const vinculo =
            normalizarVinculoCnpjEmpresa(
                registro
            );

        if (!vinculo.cnpj) {
            continue;
        }

        mapa.set(
            vinculo.cnpj,
            {
                ...vinculo,

                origem:
                    "EMPRESAS_CNPJS",
            }
        );
    }

    return Array.from(
        mapa.values()
    );
}