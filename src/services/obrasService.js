import { supabase } from "../lib/supabaseClient";

/*
 * SAFE_SCAN_OBRAS_CONTRATANTE_SERVICE_V1
 *
 * Modelo transitório e compatível:
 *
 * - Antes da migration:
 *   campos novos podem não existir;
 *   o service recua para o schema legado.
 *
 * - Depois da migration:
 *   fiscal_contratante,
 *   tecnico_seguranca_contratante e
 *   tipo_vinculo passam a ser persistidos normalmente.
 *
 * Os campos legados da Idealiza permanecem sincronizados
 * nesta fase para não quebrar consumidores antigos.
 */

export const TIPOS_VINCULO_EMPRESA_OBRA =
    Object.freeze({
        CONTRATANTE: "Contratante",
        EXECUTORA: "Executora",
    });


function normalizarTextoObra(valor) {
    return String(
        valor || ""
    ).trim();
}


function normalizarCepObra(valor) {
    return normalizarTextoObra(
        valor
    )
        .replace(
            /\D/g,
            ""
        )
        .slice(
            0,
            8
        );
}


function mensagemErroSupabase(error = {}) {
    return String(
        error?.message ||
        error?.details ||
        error?.hint ||
        ""
    ).toLowerCase();
}


function erroDeColunaNaoExistente(
    error = {},
    colunas = []
) {
    const texto =
        mensagemErroSupabase(
            error
        );

    const mencionaColuna =
        colunas.some(
            (coluna) =>
                texto.includes(
                    String(
                        coluna
                    ).toLowerCase()
                )
        );

    if (!mencionaColuna) {
        return false;
    }

    return (
        texto.includes("column") ||
        texto.includes("coluna") ||
        texto.includes("schema") ||
        texto.includes("does not exist") ||
        texto.includes("não existe") ||
        texto.includes("nao existe") ||
        texto.includes("could not find")
    );
}


function erroCamposContratanteNaoExistem(
    error = {}
) {
    return erroDeColunaNaoExistente(
        error,
        [
            "fiscal_contratante",
            "tecnico_seguranca_contratante",
        ]
    );
}


function erroCamposComplementaresObraNaoExistem(
    error = {}
) {
    return erroDeColunaNaoExistente(
        error,
        [
            "cep",
            "numero_obra",
            "numero_endereco",
            "tecnico_seguranca_idealiza",
        ]
    );
}


function erroTipoVinculoNaoExiste(
    error = {}
) {
    return erroDeColunaNaoExistente(
        error,
        [
            "tipo_vinculo",
        ]
    );
}


function removerCamposContratantePayloadObra(
    payload = {}
) {
    const restante = {
        ...payload,
    };

    delete restante.fiscal_contratante;
    delete restante.tecnico_seguranca_contratante;

    return restante;
}


function removerCamposComplementaresPayloadObra(
    payload = {}
) {
    const restante = {
        ...payload,
    };

    delete restante.cep;
    delete restante.numero_obra;
    delete restante.numero_endereco;
    delete restante.tecnico_seguranca_idealiza;

    return restante;
}


function removerTipoVinculoPayload(
    payload = {}
) {
    const restante = {
        ...payload,
    };

    delete restante.tipo_vinculo;

    return restante;
}


function normalizarStatusObra(status) {
    const texto =
        normalizarTextoObra(
            status
        );

    return texto === "Inativa"
        ? "Inativa"
        : "Ativa";
}


function normalizarTipoVinculoEmpresaObra(
    valor,
    fallback =
        TIPOS_VINCULO_EMPRESA_OBRA.EXECUTORA
) {
    const texto =
        normalizarTextoObra(
            valor
        );

    if (!texto) {
        return fallback;
    }

    const chave =
        texto.toLocaleLowerCase(
            "pt-BR"
        );

    if (
        chave ===
        "contratante"
    ) {
        return TIPOS_VINCULO_EMPRESA_OBRA
            .CONTRATANTE;
    }

    if (
        chave ===
        "executora"
    ) {
        return TIPOS_VINCULO_EMPRESA_OBRA
            .EXECUTORA;
    }

    throw new Error(
        `Tipo de vínculo inválido: ${texto}.`
    );
}


function inferirTipoVinculoBanco(
    vinculo = {}
) {
    const tipoInformado =
        normalizarTextoObra(
            vinculo.tipo_vinculo ||
            vinculo.tipoVinculo
        );

    if (tipoInformado) {
        return normalizarTipoVinculoEmpresaObra(
            tipoInformado
        );
    }

    /*
     * Compatibilidade temporária antes da migration A1.
     *
     * O banco atual ainda não possui tipo_vinculo.
     * Durante essa janela, os vínculos históricos da
     * IDEALIZA CIDADES são reconhecidos como Contratante.
     *
     * Depois da migration, este fallback deixa de participar,
     * porque tipo_vinculo virá explicitamente do banco.
     */
    const nomeEmpresa =
        normalizarTextoObra(
            vinculo?.empresa?.nome
        )
            .toLocaleUpperCase(
                "pt-BR"
            );

    if (
        nomeEmpresa ===
        "IDEALIZA CIDADES"
    ) {
        return TIPOS_VINCULO_EMPRESA_OBRA
            .CONTRATANTE;
    }

    return TIPOS_VINCULO_EMPRESA_OBRA
        .EXECUTORA;
}


function obterDadosContratanteObra(
    obra = {}
) {
    const fiscalContratante =
        normalizarTextoObra(
            obra.fiscalContratante ||
            obra.fiscal_contratante ||
            obra.fiscalIdealiza ||
            obra.fiscal_idealiza
        );

    const tecnicoSegurancaContratante =
        normalizarTextoObra(
            obra.tecnicoSegurancaContratante ||
            obra.tecnico_seguranca_contratante ||
            obra.tecnicoSegurancaIdealiza ||
            obra.tecnico_seguranca_idealiza
        );

    return {
        fiscalContratante,
        tecnicoSegurancaContratante,
    };
}


function montarPayloadObra(
    obra = {}
) {
    const {
        fiscalContratante,
        tecnicoSegurancaContratante,
    } =
        obterDadosContratanteObra(
            obra
        );

    return {
        nome:
            normalizarTextoObra(
                obra.nome
            ),

        cep:
            normalizarCepObra(
                obra.cep
            ),

        numero_obra:
            normalizarTextoObra(
                obra.numeroObra ||
                obra.numero_obra
            ),

        cidade:
            normalizarTextoObra(
                obra.cidade
            ),

        uf:
            normalizarTextoObra(
                obra.uf
            ).toUpperCase(),

        endereco:
            normalizarTextoObra(
                obra.endereco
            ),

        numero_endereco:
            normalizarTextoObra(
                obra.numeroEndereco ||
                obra.numero_endereco
            ),

        fiscal_contratante:
            fiscalContratante,

        tecnico_seguranca_contratante:
            tecnicoSegurancaContratante,

        /*
         * Compatibilidade temporária.
         */
        fiscal_idealiza:
            fiscalContratante,

        tecnico_seguranca_idealiza:
            tecnicoSegurancaContratante,

        lider_encarregado:
            normalizarTextoObra(
                obra.liderEncarregado ||
                obra.lider_encarregado
            ),

        status:
            normalizarStatusObra(
                obra.status
            ),

        observacoes:
            normalizarTextoObra(
                obra.observacoes
            ),
    };
}


function montarPayloadVinculoEmpresaObra(
    vinculo = {},
    {
        incluirTipoPadrao = true,
    } = {}
) {
    const payload = {
        empresa_id:
            normalizarTextoObra(
                vinculo.empresaId ||
                vinculo.empresa_id
            ),

        obra_id:
            normalizarTextoObra(
                vinculo.obraId ||
                vinculo.obra_id
            ),

        status:
            normalizarStatusObra(
                vinculo.status
            ),

        observacoes:
            normalizarTextoObra(
                vinculo.observacoes
            ),
    };

    const tipoInformado =
        normalizarTextoObra(
            vinculo.tipoVinculo ||
            vinculo.tipo_vinculo
        );

    if (tipoInformado) {
        payload.tipo_vinculo =
            normalizarTipoVinculoEmpresaObra(
                tipoInformado
            );
    } else if (incluirTipoPadrao) {
        payload.tipo_vinculo =
            TIPOS_VINCULO_EMPRESA_OBRA
                .EXECUTORA;
    }

    return payload;
}


export function normalizarObraBanco(
    obra = {}
) {
    const fiscalContratante =
        obra.fiscal_contratante ||
        obra.fiscalContratante ||
        obra.fiscal_idealiza ||
        obra.fiscalIdealiza ||
        "";

    const tecnicoSegurancaContratante =
        obra.tecnico_seguranca_contratante ||
        obra.tecnicoSegurancaContratante ||
        obra.tecnico_seguranca_idealiza ||
        obra.tecnicoSegurancaIdealiza ||
        "";

    return {
        id:
            obra.id || "",

        nome:
            obra.nome || "",

        cep:
            obra.cep || "",

        numeroObra:
            obra.numero_obra ||
            obra.numeroObra ||
            "",

        numero_obra:
            obra.numero_obra ||
            obra.numeroObra ||
            "",

        cidade:
            obra.cidade || "",

        uf:
            obra.uf || "",

        endereco:
            obra.endereco || "",

        numeroEndereco:
            obra.numero_endereco ||
            obra.numeroEndereco ||
            "",

        numero_endereco:
            obra.numero_endereco ||
            obra.numeroEndereco ||
            "",

        fiscalContratante:
            fiscalContratante,

        fiscal_contratante:
            fiscalContratante,

        tecnicoSegurancaContratante:
            tecnicoSegurancaContratante,

        tecnico_seguranca_contratante:
            tecnicoSegurancaContratante,

        /*
         * Aliases legados.
         */
        fiscalIdealiza:
            fiscalContratante,

        fiscal_idealiza:
            fiscalContratante,

        tecnicoSegurancaIdealiza:
            tecnicoSegurancaContratante,

        tecnico_seguranca_idealiza:
            tecnicoSegurancaContratante,

        liderEncarregado:
            obra.lider_encarregado ||
            obra.liderEncarregado ||
            "",

        lider_encarregado:
            obra.lider_encarregado ||
            obra.liderEncarregado ||
            "",

        status:
            normalizarStatusObra(
                obra.status
            ),

        observacoes:
            obra.observacoes || "",

        criadoPor:
            obra.criado_por || "",

        atualizadoPor:
            obra.atualizado_por || "",

        createdAt:
            obra.created_at || "",

        updatedAt:
            obra.updated_at || "",
    };
}


export function normalizarVinculoEmpresaObraBanco(
    vinculo = {}
) {
    const obraNormalizada =
        vinculo.obra
            ? normalizarObraBanco(
                vinculo.obra
            )
            : null;

    const empresa =
        vinculo.empresa ||
        null;

    const tipoVinculo =
        inferirTipoVinculoBanco(
            {
                ...vinculo,
                empresa,
            }
        );

    return {
        id:
            vinculo.id || "",

        empresaId:
            vinculo.empresa_id ||
            vinculo.empresaId ||
            "",

        empresa_id:
            vinculo.empresa_id ||
            vinculo.empresaId ||
            "",

        obraId:
            vinculo.obra_id ||
            vinculo.obraId ||
            obraNormalizada?.id ||
            "",

        obra_id:
            vinculo.obra_id ||
            vinculo.obraId ||
            obraNormalizada?.id ||
            "",

        tipoVinculo,

        tipo_vinculo:
            tipoVinculo,

        status:
            normalizarStatusObra(
                vinculo.status
            ),

        observacoes:
            vinculo.observacoes ||
            "",

        obra:
            obraNormalizada,

        empresa,

        criadoPor:
            vinculo.criado_por ||
            "",

        atualizadoPor:
            vinculo.atualizado_por ||
            "",

        createdAt:
            vinculo.created_at ||
            "",

        updatedAt:
            vinculo.updated_at ||
            "",
    };
}


export async function listarObras() {
    const {
        data,
        error,
    } =
        await supabase
            .from(
                "obras"
            )
            .select("*")
            .order(
                "nome",
                {
                    ascending: true,
                }
            );

    if (error) {
        console.error(
            "Erro ao listar obras:",
            error
        );

        throw error;
    }

    return (
        data ||
        []
    ).map(
        normalizarObraBanco
    );
}


export async function adicionarObra(
    obra = {}
) {
    const payload =
        montarPayloadObra(
            obra
        );

    let payloadTentativa =
        payload;

    let {
        data,
        error,
    } =
        await supabase
            .from(
                "obras"
            )
            .insert(
                payloadTentativa
            )
            .select()
            .single();


    if (
        error &&
        erroCamposContratanteNaoExistem(
            error
        )
    ) {
        console.warn(
            "Campos genéricos da contratante ainda não existem em obras. Usando temporariamente os campos legados."
        );

        payloadTentativa =
            removerCamposContratantePayloadObra(
                payloadTentativa
            );

        ({
            data,
            error,
        } =
            await supabase
                .from(
                    "obras"
                )
                .insert(
                    payloadTentativa
                )
                .select()
                .single());
    }


    if (
        error &&
        erroCamposComplementaresObraNaoExistem(
            error
        )
    ) {
        console.warn(
            "Campos complementares de obras ainda não existem. Salvando com payload compatível."
        );

        payloadTentativa =
            removerCamposComplementaresPayloadObra(
                payloadTentativa
            );

        ({
            data,
            error,
        } =
            await supabase
                .from(
                    "obras"
                )
                .insert(
                    payloadTentativa
                )
                .select()
                .single());
    }


    if (error) {
        console.error(
            "Erro ao adicionar obra:",
            error
        );

        throw error;
    }

    return normalizarObraBanco(
        data
    );
}


export async function atualizarObra(
    obra = {}
) {
    const id =
        normalizarTextoObra(
            obra.id
        );

    if (!id) {
        throw new Error(
            "ID da obra não informado para atualização."
        );
    }

    const payload =
        montarPayloadObra(
            obra
        );

    let payloadTentativa =
        payload;

    let {
        data,
        error,
    } =
        await supabase
            .from(
                "obras"
            )
            .update(
                payloadTentativa
            )
            .eq(
                "id",
                id
            )
            .select()
            .single();


    if (
        error &&
        erroCamposContratanteNaoExistem(
            error
        )
    ) {
        console.warn(
            "Campos genéricos da contratante ainda não existem em obras. Atualizando temporariamente os campos legados."
        );

        payloadTentativa =
            removerCamposContratantePayloadObra(
                payloadTentativa
            );

        ({
            data,
            error,
        } =
            await supabase
                .from(
                    "obras"
                )
                .update(
                    payloadTentativa
                )
                .eq(
                    "id",
                    id
                )
                .select()
                .single());
    }


    if (
        error &&
        erroCamposComplementaresObraNaoExistem(
            error
        )
    ) {
        console.warn(
            "Campos complementares de obras ainda não existem. Atualizando com payload compatível."
        );

        payloadTentativa =
            removerCamposComplementaresPayloadObra(
                payloadTentativa
            );

        ({
            data,
            error,
        } =
            await supabase
                .from(
                    "obras"
                )
                .update(
                    payloadTentativa
                )
                .eq(
                    "id",
                    id
                )
                .select()
                .single());
    }


    if (error) {
        console.error(
            "Erro ao atualizar obra:",
            error
        );

        throw error;
    }

    return normalizarObraBanco(
        data
    );
}


export async function excluirObra(
    id
) {
    const obraId =
        normalizarTextoObra(
            id
        );

    if (!obraId) {
        throw new Error(
            "ID da obra obrigatorio para excluir."
        );
    }

    const {
        error,
    } =
        await supabase
            .from(
                "obras"
            )
            .delete()
            .eq(
                "id",
                obraId
            );

    if (error) {
        console.error(
            "Erro ao excluir obra:",
            error
        );

        throw error;
    }

    return true;
}


export async function listarVinculosEmpresasObras() {
    const {
        data,
        error,
    } =
        await supabase
            .from(
                "empresas_obras"
            )
            .select(`
                *,
                empresa:empresas(id, nome, status),
                obra:obras(*)
            `)
            .order(
                "created_at",
                {
                    ascending: false,
                }
            );

    if (error) {
        console.error(
            "Erro ao listar vinculos empresa/obra:",
            error
        );

        throw error;
    }

    return (
        data ||
        []
    ).map(
        normalizarVinculoEmpresaObraBanco
    );
}


export async function listarObrasPorEmpresa(
    empresaId
) {
    const idEmpresa =
        normalizarTextoObra(
            empresaId
        );

    if (!idEmpresa) {
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
                *,
                obra:obras(*)
            `)
            .eq(
                "empresa_id",
                idEmpresa
            )
            .eq(
                "status",
                "Ativa"
            );

    if (error) {
        console.error(
            "Erro ao listar obras por empresa:",
            error
        );

        throw error;
    }

    return (
        data ||
        []
    )
        .map(
            normalizarVinculoEmpresaObraBanco
        )
        .map(
            (vinculo) =>
                vinculo.obra
        )
        .filter(
            Boolean
        )
        .filter(
            (obra) =>
                obra.status !==
                "Inativa"
        )
        .sort(
            (
                a,
                b
            ) =>
                String(
                    a.nome ||
                    ""
                ).localeCompare(
                    String(
                        b.nome ||
                        ""
                    ),
                    "pt-BR"
                )
        );
}


export async function vincularEmpresaObra(
    empresaId,
    obraId,
    dados = {}
) {
    const payload =
        montarPayloadVinculoEmpresaObra(
            {
                ...dados,
                empresaId,
                obraId,
            },
            {
                incluirTipoPadrao: true,
            }
        );

    if (!payload.empresa_id) {
        throw new Error(
            "Empresa obrigatoria para vincular obra."
        );
    }

    if (!payload.obra_id) {
        throw new Error(
            "Obra obrigatoria para vincular empresa."
        );
    }

    let payloadTentativa =
        payload;

    let {
        data,
        error,
    } =
        await supabase
            .from(
                "empresas_obras"
            )
            .insert(
                payloadTentativa
            )
            .select(`
                *,
                empresa:empresas(id, nome, status),
                obra:obras(*)
            `)
            .single();


    if (
        error &&
        erroTipoVinculoNaoExiste(
            error
        )
    ) {
        console.warn(
            "tipo_vinculo ainda não existe em empresas_obras. Salvando vínculo em modo legado."
        );

        payloadTentativa =
            removerTipoVinculoPayload(
                payloadTentativa
            );

        ({
            data,
            error,
        } =
            await supabase
                .from(
                    "empresas_obras"
                )
                .insert(
                    payloadTentativa
                )
                .select(`
                    *,
                    empresa:empresas(id, nome, status),
                    obra:obras(*)
                `)
                .single());
    }


    if (error) {
        console.error(
            "Erro ao vincular empresa e obra:",
            error
        );

        throw error;
    }

    return normalizarVinculoEmpresaObraBanco(
        data
    );
}


export async function atualizarVinculoEmpresaObra(
    vinculo = {}
) {
    const id =
        normalizarTextoObra(
            vinculo.id
        );

    const payload =
        montarPayloadVinculoEmpresaObra(
            vinculo,
            {
                /*
                 * Em update parcial, ausência do tipo não pode
                 * transformar uma Contratante em Executora.
                 */
                incluirTipoPadrao: false,
            }
        );

    if (!id) {
        throw new Error(
            "ID do vinculo obrigatorio para atualizar."
        );
    }

    if (!payload.empresa_id) {
        delete payload.empresa_id;
    }

    if (!payload.obra_id) {
        delete payload.obra_id;
    }

    let payloadTentativa =
        payload;

    let {
        data,
        error,
    } =
        await supabase
            .from(
                "empresas_obras"
            )
            .update(
                payloadTentativa
            )
            .eq(
                "id",
                id
            )
            .select(`
                *,
                empresa:empresas(id, nome, status),
                obra:obras(*)
            `)
            .single();


    if (
        error &&
        erroTipoVinculoNaoExiste(
            error
        )
    ) {
        console.warn(
            "tipo_vinculo ainda não existe em empresas_obras. Atualizando vínculo em modo legado."
        );

        payloadTentativa =
            removerTipoVinculoPayload(
                payloadTentativa
            );

        ({
            data,
            error,
        } =
            await supabase
                .from(
                    "empresas_obras"
                )
                .update(
                    payloadTentativa
                )
                .eq(
                    "id",
                    id
                )
                .select(`
                    *,
                    empresa:empresas(id, nome, status),
                    obra:obras(*)
                `)
                .single());
    }


    if (error) {
        console.error(
            "Erro ao atualizar vinculo empresa/obra:",
            error
        );

        throw error;
    }

    return normalizarVinculoEmpresaObraBanco(
        data
    );
}


export async function excluirVinculoEmpresaObra(
    id
) {
    const vinculoId =
        normalizarTextoObra(
            id
        );

    if (!vinculoId) {
        throw new Error(
            "ID do vinculo obrigatorio para excluir."
        );
    }

    const {
        error,
    } =
        await supabase
            .from(
                "empresas_obras"
            )
            .delete()
            .eq(
                "id",
                vinculoId
            );

    if (error) {
        console.error(
            "Erro ao excluir vinculo empresa/obra:",
            error
        );

        throw error;
    }

    return true;
}
