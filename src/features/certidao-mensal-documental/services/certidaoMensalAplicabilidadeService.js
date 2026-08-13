const RPC_DEFINIR_APLICABILIDADE =
    "definir_aplicabilidade_esocial_certidao_mensal";

function textoSeguro(valor) {
    return String(
        valor ?? "",
    ).trim();
}

function normalizarCompetencia(valor) {
    const texto =
        textoSeguro(valor);

    if (
        /^\d{4}-(0[1-9]|1[0-2])-01$/
            .test(texto)
    ) {
        return texto;
    }

    const br =
        /^(0[1-9]|1[0-2])\/(\d{4})$/
            .exec(texto);

    if (br) {
        return (
            br[2] +
            "-" +
            br[1] +
            "-01"
        );
    }

    throw new Error(
        "Competencia invalida para aplicabilidade do eSocial SST."
    );
}

function validarCliente(cliente) {
    if (
        !cliente ||
        typeof cliente.from !==
            "function" ||
        typeof cliente.rpc !==
            "function"
    ) {
        throw new Error(
            "Cliente Supabase indisponivel."
        );
    }

    return cliente;
}

export async function buscarAplicabilidadeEsocialCertidaoMensal({
    clienteSupabase,
    empresaId,
    competencia,
} = {}) {
    const cliente =
        validarCliente(
            clienteSupabase
        );

    const empresaIdSeguro =
        textoSeguro(
            empresaId
        );

    if (!empresaIdSeguro) {
        return {
            competencia: null,
            item: null,
            suporteAplicabilidade:
                false,
        };
    }

    const competenciaIso =
        normalizarCompetencia(
            competencia
        );

    const respostaCompetencia =
        await cliente
            .from(
                "certidao_mensal_competencias"
            )
            .select(
                "id,empresa_id,competencia,status"
            )
            .eq(
                "empresa_id",
                empresaIdSeguro
            )
            .eq(
                "competencia",
                competenciaIso
            )
            .maybeSingle();

    if (
        respostaCompetencia?.error
    ) {
        throw respostaCompetencia.error;
    }

    const registroCompetencia =
        respostaCompetencia?.data ||
        null;

    if (!registroCompetencia?.id) {
        return {
            competencia:
                registroCompetencia,

            item:
                null,

            suporteAplicabilidade:
                false,
        };
    }

    const selectNovo =
        [
            "id",
            "competencia_id",
            "tipo_documento",
            "titulo",
            "origem",
            "status",
            "versao_atual_id",
            "aplicabilidade",
            "aplicabilidade_motivo",
            "aplicabilidade_definida_em",
            "aplicabilidade_definida_por",
            "atualizado_em",
        ].join(",");

    const respostaNova =
        await cliente
            .from(
                "certidao_mensal_itens"
            )
            .select(
                selectNovo
            )
            .eq(
                "competencia_id",
                registroCompetencia.id
            )
            .eq(
                "tipo_documento",
                "esocial"
            )
            .maybeSingle();

    if (
        !respostaNova?.error
    ) {
        return {
            competencia:
                registroCompetencia,

            item:
                respostaNova?.data ||
                null,

            suporteAplicabilidade:
                Boolean(
                    respostaNova?.data?.id
                ),
        };
    }

    /*
     * Compatibilidade antes da migration candidata.
     * O banco atual ainda nao possui as colunas novas.
     */
    const respostaLegada =
        await cliente
            .from(
                "certidao_mensal_itens"
            )
            .select(
                [
                    "id",
                    "competencia_id",
                    "tipo_documento",
                    "titulo",
                    "origem",
                    "status",
                    "versao_atual_id",
                    "atualizado_em",
                ].join(",")
            )
            .eq(
                "competencia_id",
                registroCompetencia.id
            )
            .eq(
                "tipo_documento",
                "esocial"
            )
            .maybeSingle();

    if (
        respostaLegada?.error
    ) {
        throw respostaLegada.error;
    }

    return {
        competencia:
            registroCompetencia,

        item:
            respostaLegada?.data
                ? {
                    ...respostaLegada.data,

                    aplicabilidade:
                        "PENDENTE_DEFINICAO",

                    aplicabilidade_motivo:
                        null,

                    aplicabilidade_definida_em:
                        null,

                    aplicabilidade_definida_por:
                        null,
                }
                : null,

        suporteAplicabilidade:
            false,
    };
}

export async function definirAplicabilidadeEsocialCertidaoMensal({
    clienteSupabase,
    itemId,
    aplicabilidade,
    motivo = "",
} = {}) {
    const cliente =
        validarCliente(
            clienteSupabase
        );

    const itemIdSeguro =
        textoSeguro(
            itemId
        );

    if (!itemIdSeguro) {
        throw new Error(
            "Item eSocial SST nao localizado."
        );
    }

    const decisao =
        textoSeguro(
            aplicabilidade
        ).toUpperCase();

    if (
        decisao !==
            "APLICAVEL" &&
        decisao !==
            "NAO_APLICAVEL"
    ) {
        throw new Error(
            "Aplicabilidade eSocial SST invalida."
        );
    }

    const motivoSeguro =
        textoSeguro(
            motivo
        );

    if (
        decisao ===
            "NAO_APLICAVEL" &&
        !motivoSeguro
    ) {
        throw new Error(
            "Informe o motivo da nao aplicabilidade."
        );
    }

    if (
        motivoSeguro.length >
        500
    ) {
        throw new Error(
            "O motivo deve possuir no maximo 500 caracteres."
        );
    }

    const resposta =
        await cliente.rpc(
            RPC_DEFINIR_APLICABILIDADE,
            {
                p_item_id:
                    itemIdSeguro,

                p_aplicabilidade:
                    decisao,

                p_motivo:
                    motivoSeguro ||
                    null,
            }
        );

    if (resposta?.error) {
        throw resposta.error;
    }

    return (
        resposta?.data ||
        null
    );
}
