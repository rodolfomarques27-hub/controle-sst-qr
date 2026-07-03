export async function obterFotoColaboradorQrPorEdgeFunction({ supabase, tokenConsulta } = {}) {
    const tokenSeguro = String(tokenConsulta || "").trim();

    if (!tokenSeguro) return "";

    try {
        const { data, error } = await supabase.functions.invoke("gerar-foto-colaborador-qr", {
            body: { token: tokenSeguro },
        });

        if (error || data?.ok === false) {
            console.warn(
                "Erro ao obter foto pública do colaborador via Edge Function:",
                error?.message || data?.erro || "Falha ao gerar URL assinada da foto."
            );
            return "";
        }

        return data?.signedUrl || data?.fotoUrl || "";
    } catch (error) {
        console.warn("Falha inesperada ao obter foto pública do colaborador:", error?.message || error);
        return "";
    }
}

export async function normalizarConsultaPublicaComFoto({ supabase, dadosConsulta, tokenQr } = {}) {
    if (!dadosConsulta?.colaborador) return dadosConsulta;

    const colaboradorConsulta = dadosConsulta.colaborador || {};
    const fotoOriginal =
        colaboradorConsulta.fotoUrl ||
        colaboradorConsulta.foto_url ||
        colaboradorConsulta.foto ||
        "";

    const fotoEhUrlFinal = /^https?:\/\//i.test(String(fotoOriginal || "")) || String(fotoOriginal || "").startsWith("blob:");
    const fotoAssinada = fotoEhUrlFinal
        ? fotoOriginal
        : await obterFotoColaboradorQrPorEdgeFunction({ supabase, tokenConsulta: tokenQr });

    return {
        ...dadosConsulta,
        colaborador: {
            ...colaboradorConsulta,
            fotoUrl: fotoAssinada || "",
            fotoNome: colaboradorConsulta.fotoNome || colaboradorConsulta.foto_nome || "",
            codigoFuncionario:
                colaboradorConsulta.codigoFuncionario ||
                colaboradorConsulta.codigo_funcionario ||
                "",
            statusMobilizacao:
                colaboradorConsulta.statusMobilizacao ||
                colaboradorConsulta.status_mobilizacao ||
                "",
            token: colaboradorConsulta.token || colaboradorConsulta.token_qr || tokenQr,
        },
    };
}

export async function carregarConsultaPublicaQrService({ supabase, tokenQr } = {}) {
    const tokenSeguro = String(tokenQr || "").trim();

    if (!tokenSeguro) {
        throw new Error("Token do QR Code não informado.");
    }

    const { data, error } = await supabase.rpc("consulta_publica_qr", {
        token_param: tokenSeguro,
    });

    if (error) {
        throw new Error(`Erro ao carregar consulta pública: ${error.message}`);
    }

    return normalizarConsultaPublicaComFoto({
        supabase,
        dadosConsulta: data,
        tokenQr: tokenSeguro,
    });
}

export async function validarContatoEmergenciaQrService({ supabase, tokenQr, senha } = {}) {
    const tokenSeguro = String(tokenQr || "").trim();
    const senhaSegura = String(senha || "").trim();

    if (!tokenSeguro) {
        throw new Error("Token do QR Code não informado.");
    }

    if (!senhaSegura) {
        throw new Error("Informe a senha/PIN de emergência.");
    }

    const { data, error } = await supabase.rpc("validar_contato_emergencia_qr", {
        p_token: tokenSeguro,
        p_senha: senhaSegura,
    });

    if (error) {
        throw new Error(error.message || "Erro ao validar contato de emergência.");
    }

    if (!data?.ok || !data?.autorizado) {
        throw new Error(data?.mensagem || "Senha/PIN de emergência inválida.");
    }

    return data;
}
