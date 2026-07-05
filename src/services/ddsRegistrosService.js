const textoSeguroDds = (valor = "") => String(valor ?? "").trim();

const somenteDataIsoDds = (valor = "") => {
    const texto = textoSeguroDds(valor);
    if (!texto) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) return texto;

    const data = new Date(texto);
    if (Number.isNaN(data.getTime())) return "";

    return data.toISOString().slice(0, 10);
};

const normalizarObjetoDds = (valor = {}) => {
    if (!valor || typeof valor !== "object" || Array.isArray(valor)) {
        return {};
    }

    return valor;
};

export function montarUrlConferenciaDds({ token = "", origem = "" } = {}) {
    const tokenSeguro = textoSeguroDds(token);
    const origemFinal = textoSeguroDds(origem) ||
        (typeof window !== "undefined" ? window.location.origin : "");

    const params = new URLSearchParams();

    if (tokenSeguro) {
        params.set("dds", tokenSeguro);
    }

    const consulta = params.toString();
    return `${origemFinal}/${consulta ? `?${consulta}` : ""}`;
}

export function obterTokenDdsPublicoUrl() {
    if (typeof window === "undefined") return "";

    const buscas = [
        window.location.search || "",
        window.location.hash?.includes("?") ? window.location.hash.slice(window.location.hash.indexOf("?")) : "",
    ];

    for (const busca of buscas) {
        const params = new URLSearchParams(busca);
        const token = textoSeguroDds(params.get("dds") || params.get("token_dds") || params.get("tokenDds"));

        if (token) return token;
    }

    return "";
}

export function normalizarRegistroDdsParaBanco(registro = {}) {
    const codigo = textoSeguroDds(registro.codigo);
    const periodoInicio = somenteDataIsoDds(registro.periodoInicio || registro.periodo_inicio);
    const periodoFim = somenteDataIsoDds(registro.periodoFim || registro.periodo_fim);

    if (!codigo) {
        throw new Error("Código do DDS não informado.");
    }

    if (!periodoInicio || !periodoFim) {
        throw new Error("Período do DDS não informado.");
    }

    return {
        codigo,
        token_publico: textoSeguroDds(registro.tokenPublico || registro.token_publico) || undefined,
        empresa_id: textoSeguroDds(registro.empresaId || registro.empresa_id) || null,
        obra_id: textoSeguroDds(registro.obraId || registro.obra_id) || null,
        empresa_nome: textoSeguroDds(registro.empresaNome || registro.empresa_nome || registro.empresa),
        obra_nome: textoSeguroDds(registro.obraNome || registro.obra_nome || registro.obra || registro.obraSetor),
        periodo_inicio: periodoInicio,
        periodo_fim: periodoFim,
        responsavel_nome: textoSeguroDds(registro.responsavelNome || registro.responsavel_nome || registro.responsavel),
        fiscal_idealiza: textoSeguroDds(registro.fiscalIdealiza || registro.fiscal_idealiza),
        lider_encarregado: textoSeguroDds(registro.liderEncarregado || registro.lider_encarregado || registro.encarregado),
        dados: normalizarObjetoDds(registro.dados),
        status: textoSeguroDds(registro.status) || "Ativo",
    };
}

export function normalizarRegistroDdsBanco(registro = {}) {
    const tokenPublico = textoSeguroDds(registro.token_publico || registro.tokenPublico);

    return {
        id: registro.id || "",
        codigo: textoSeguroDds(registro.codigo),
        tokenPublico,
        urlConferencia: montarUrlConferenciaDds({ token: tokenPublico }),
        empresaId: registro.empresa_id || "",
        obraId: registro.obra_id || "",
        empresaNome: textoSeguroDds(registro.empresa_nome),
        obraNome: textoSeguroDds(registro.obra_nome),
        periodoInicio: registro.periodo_inicio || "",
        periodoFim: registro.periodo_fim || "",
        responsavelNome: textoSeguroDds(registro.responsavel_nome),
        fiscalIdealiza: textoSeguroDds(registro.fiscal_idealiza),
        liderEncarregado: textoSeguroDds(registro.lider_encarregado),
        dados: normalizarObjetoDds(registro.dados),
        status: textoSeguroDds(registro.status) || "Ativo",
        criadoEm: registro.created_at || "",
        atualizadoEm: registro.updated_at || "",
    };
}

export function normalizarConsultaPublicaDds(resposta = {}) {
    return {
        ok: Boolean(resposta.ok),
        tipo: textoSeguroDds(resposta.tipo || "dds"),
        mensagem: textoSeguroDds(resposta.mensagem),
        codigo: textoSeguroDds(resposta.codigo),
        empresa: textoSeguroDds(resposta.empresa),
        obra: textoSeguroDds(resposta.obra),
        periodoInicio: textoSeguroDds(resposta.periodoInicio),
        periodoFim: textoSeguroDds(resposta.periodoFim),
        responsavel: textoSeguroDds(resposta.responsavel),
        fiscalIdealiza: textoSeguroDds(resposta.fiscalIdealiza),
        liderEncarregado: textoSeguroDds(resposta.liderEncarregado),
        status: textoSeguroDds(resposta.status),
        geradoEm: resposta.geradoEm || "",
        atualizadoEm: resposta.atualizadoEm || "",
        autenticidade: normalizarObjetoDds(resposta.autenticidade),
    };
}

export async function salvarRegistroDds({ supabase, registro = {} } = {}) {
    if (!supabase) {
        throw new Error("Cliente Supabase não informado.");
    }

    const payload = normalizarRegistroDdsParaBanco(registro);

    const { data, error } = await supabase
        .from("dds_registros")
        .upsert(payload, { onConflict: "codigo" })
        .select(`
            id,
            codigo,
            token_publico,
            empresa_id,
            obra_id,
            empresa_nome,
            obra_nome,
            periodo_inicio,
            periodo_fim,
            responsavel_nome,
            fiscal_idealiza,
            lider_encarregado,
            dados,
            status,
            created_at,
            updated_at
        `)
        .single();

    if (error) {
        throw new Error(error.message || "Não foi possível salvar o registro do DDS.");
    }

    return normalizarRegistroDdsBanco(data);
}

export async function carregarRegistroDdsPorCodigo({ supabase, codigo = "" } = {}) {
    if (!supabase) {
        throw new Error("Cliente Supabase não informado.");
    }

    const codigoSeguro = textoSeguroDds(codigo);

    if (!codigoSeguro) {
        throw new Error("Código do DDS não informado.");
    }

    const { data, error } = await supabase
        .from("dds_registros")
        .select(`
            id,
            codigo,
            token_publico,
            empresa_id,
            obra_id,
            empresa_nome,
            obra_nome,
            periodo_inicio,
            periodo_fim,
            responsavel_nome,
            fiscal_idealiza,
            lider_encarregado,
            dados,
            status,
            created_at,
            updated_at
        `)
        .eq("codigo", codigoSeguro)
        .maybeSingle();

    if (error) {
        throw new Error(error.message || "Não foi possível carregar o registro do DDS.");
    }

    return data ? normalizarRegistroDdsBanco(data) : null;
}

export async function consultarDdsPublico({ supabase, token = "" } = {}) {
    if (!supabase) {
        throw new Error("Cliente Supabase não informado.");
    }

    const tokenSeguro = textoSeguroDds(token);

    if (!tokenSeguro) {
        throw new Error("Token público do DDS não informado.");
    }

    const { data, error } = await supabase.rpc("consulta_publica_dds", {
        p_token: tokenSeguro,
    });

    if (error) {
        throw new Error(error.message || "Não foi possível consultar a autenticidade do DDS.");
    }

    return normalizarConsultaPublicaDds(data || {});
}