const UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function textoSeguroSelecao(valor) {
    return String(
        valor || ""
    ).trim();
}

function normalizarStatusSelecao(valor) {
    return textoSeguroSelecao(
        valor
    ).toLocaleLowerCase(
        "pt-BR"
    );
}

function validarUuidSelecao(
    valor,
    campo
) {
    const tratado =
        textoSeguroSelecao(
            valor
        );

    if (
        !UUID_PATTERN.test(
            tratado
        )
    ) {
        throw new Error(
            `${campo} inválido para seleção da Consolidação.`
        );
    }

    return tratado;
}

export function normalizarObrasAtivasEmpresaConsolidacao(
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
    ).forEach(
        (
            vinculo
        ) => {
            const obra =
                vinculo?.obra ||
                null;

            const vinculoAtivo =
                normalizarStatusSelecao(
                    vinculo?.status
                ) ===
                "ativa";

            const obraAtiva =
                normalizarStatusSelecao(
                    obra?.status
                ) ===
                "ativa";

            const obraId =
                textoSeguroSelecao(
                    obra?.id ||
                    vinculo?.obra_id ||
                    vinculo?.obraId
                );

            if (
                !vinculoAtivo ||
                !obraAtiva ||
                !obraId
            ) {
                return;
            }

            if (
                mapa.has(
                    obraId
                )
            ) {
                return;
            }

            mapa.set(
                obraId,
                {
                    id:
                        obraId,

                    nome:
                        textoSeguroSelecao(
                            obra?.nome
                        ) ||
                        "Obra sem nome",

                    vinculoId:
                        textoSeguroSelecao(
                            vinculo?.id
                        ) ||
                        null,

                    tipoVinculo:
                        textoSeguroSelecao(
                            vinculo?.tipo_vinculo ||
                            vinculo?.tipoVinculo
                        ) ||
                        null,
                }
            );
        }
    );

    return [
        ...mapa.values(),
    ].sort(
        (
            primeiro,
            segundo
        ) =>
            primeiro.nome.localeCompare(
                segundo.nome,
                "pt-BR"
            )
    );
}

export async function listarObrasAtivasEmpresaConsolidacaoService({
    supabase,
    empresaId,
}) {
    if (
        !supabase ||
        typeof supabase.from !==
            "function"
    ) {
        throw new Error(
            "Cliente Supabase não disponível para consultar obras da Consolidação."
        );
    }

    const empresaUuid =
        validarUuidSelecao(
            empresaId,
            "Empresa"
        );

    const {
        data,
        error,
    } =
        await supabase
            .from(
                "empresas_obras"
            )
            .select(
                "id,empresa_id,obra_id,status,tipo_vinculo,obra:obras(id,nome,status)"
            )
            .eq(
                "empresa_id",
                empresaUuid
            );

    if (error) {
        throw new Error(
            `Não foi possível consultar as obras da empresa: ${error.message}`
        );
    }

    return normalizarObrasAtivasEmpresaConsolidacao(
        data
    );
}
