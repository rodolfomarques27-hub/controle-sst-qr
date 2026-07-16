function exigirSupabase(supabase) {
    if (!supabase) throw new Error("Supabase não informado para o serviço de mapas.");
}

function mapaParaBanco(mapa = {}) {
    const { id, pontos, empresaNome, obraNome, planta, ...resto } = mapa;
    return {
        ...resto,
        ...(id ? { id } : {}),
        obra_id: mapa.obra_id || mapa.obraId,
        nome: mapa.nome || obraNome || "Mapa da obra",
        descricao: mapa.descricao || null,
        imagem_path: mapa.imagem_path || planta?.path || null,
        imagem_tipo: mapa.imagem_tipo || planta?.tipo || null,
        status: mapa.status || "Ativo",
    };
}

function pontoParaBanco(ponto = {}) {
    const { id, itens, extintores, plantaDetalhada, ...resto } = ponto;
    return {
        ...resto,
        ...(id ? { id } : {}),
        mapa_id: ponto.mapa_id || ponto.mapaId,
        empresa_id: ponto.empresa_id || ponto.empresaId || null,
        posicao_x: ponto.posicao_x ?? ponto.x ?? 50,
        posicao_y: ponto.posicao_y ?? ponto.y ?? 50,
        token_publico: ponto.token_publico || ponto.token,
        planta_detalhada_path: ponto.planta_detalhada_path || plantaDetalhada?.path || null,
        status: ponto.status || "Ativo",
    };
}

function itemParaBanco(item = {}) {
    const { id, ...resto } = item;
    return {
        ...resto,
        ...(id ? { id } : {}),
        ponto_id: item.ponto_id || item.pontoId,
        extintor_id: item.extintor_id || item.extintorId || null,
        posicao_x: item.posicao_x ?? item.x ?? 50,
        posicao_y: item.posicao_y ?? item.y ?? 50,
        status: item.status || "Ativo",
    };
}

export async function listarMapasObraService({ supabase, obraId = "" } = {}) {
    exigirSupabase(supabase);
    let consulta = supabase.from("mapas_obras").select("*, pontos:mapas_pontos(*, itens:mapas_itens(*))").order("atualizado_em", { ascending: false });
    if (obraId) consulta = consulta.eq("obra_id", obraId);
    const { data, error } = await consulta;
    if (error) throw error;
    return data || [];
}

export async function salvarMapaObraService({ supabase, mapa } = {}) {
    exigirSupabase(supabase);
    const { id, pontos, ...payload } = mapaParaBanco(mapa);
    const consulta = id ? supabase.from("mapas_obras").update({ ...payload, atualizado_em: new Date().toISOString() }).eq("id", id).select().single() : supabase.from("mapas_obras").insert(payload).select().single();
    const { data, error } = await consulta;
    if (error) throw error;
    return data;
}

export async function salvarPontoMapaObraService({ supabase, ponto } = {}) {
    exigirSupabase(supabase);
    const { id, itens, ...payload } = pontoParaBanco(ponto);
    const consulta = id ? supabase.from("mapas_pontos").update({ ...payload, atualizado_em: new Date().toISOString() }).eq("id", id).select().single() : supabase.from("mapas_pontos").insert(payload).select().single();
    const { data, error } = await consulta;
    if (error) throw error;
    return data;
}

export async function salvarItemMapaObraService({ supabase, item } = {}) {
    exigirSupabase(supabase);
    const { id, ...payload } = itemParaBanco(item);
    const consulta = id ? supabase.from("mapas_itens").update({ ...payload, atualizado_em: new Date().toISOString() }).eq("id", id).select().single() : supabase.from("mapas_itens").insert(payload).select().single();
    const { data, error } = await consulta;
    if (error) throw error;
    return data;
}

export async function consultarPontoMapaPublicoService({ supabase, token } = {}) {
    exigirSupabase(supabase);
    const tokenSeguro = String(token || "").trim();
    if (!tokenSeguro) throw new Error("Token público do mapa não informado.");
    const { data, error } = await supabase.rpc("consulta_publica_ponto_mapa", { token_param: tokenSeguro });
    if (error) throw error;
    return data;
}

export async function consultarPontoMapaEdgeService({ supabase, token } = {}) {
    exigirSupabase(supabase);
    const tokenSeguro = String(token || "").trim();
    if (!tokenSeguro) throw new Error("Token público do mapa não informado.");
    const { data, error } = await supabase.functions.invoke("consulta-ponto-mapa", {
        body: { token: tokenSeguro },
    });
    if (error) throw error;
    return data;
}
