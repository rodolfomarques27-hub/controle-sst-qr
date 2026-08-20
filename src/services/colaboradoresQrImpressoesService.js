function normalizarIdsColaboradores(colaboradorIds = []) {
    const ids =
        Array.isArray(colaboradorIds)
            ? colaboradorIds
            : [];

    return [
        ...new Set(
            ids
                .map((id) =>
                    String(id || "").trim()
                )
                .filter(Boolean)
        ),
    ];
}

export async function registrarImpressaoQrColaboradores({
    supabaseClient,
    colaboradorIds = [],
    origem = "INDIVIDUAL",
    loteId = null,
} = {}) {
    if (
        !supabaseClient ||
        typeof supabaseClient.rpc !== "function"
    ) {
        throw new Error(
            "Cliente Supabase indisponível para registrar a impressão."
        );
    }

    const ids =
        normalizarIdsColaboradores(
            colaboradorIds
        );

    if (!ids.length) {
        throw new Error(
            "Nenhum colaborador informado para registrar a impressão."
        );
    }

    const origemNormalizada =
        String(origem || "")
            .trim()
            .toUpperCase();

    if (
        ![
            "INDIVIDUAL",
            "LOTE",
        ].includes(origemNormalizada)
    ) {
        throw new Error(
            "Origem de impressão inválida."
        );
    }

    if (
        origemNormalizada === "INDIVIDUAL" &&
        ids.length !== 1
    ) {
        throw new Error(
            "A impressão individual deve conter exatamente um colaborador."
        );
    }

    const {
        data,
        error,
    } =
        await supabaseClient.rpc(
            "registrar_impressao_qr_colaboradores",
            {
                p_colaborador_ids: ids,
                p_origem: origemNormalizada,
                p_lote_id:
                    origemNormalizada === "LOTE"
                        ? loteId || null
                        : null,
            }
        );

    if (error) {
        throw new Error(
            error.message ||
            "Não foi possível registrar a impressão do QR Code."
        );
    }

    return Array.isArray(data)
        ? data
        : [];
}