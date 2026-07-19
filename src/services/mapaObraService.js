const VERSAO_SNAPSHOT_MAPA_OBRA = 1;

function exigirSupabase(supabase) {
    if (!supabase) {
        throw new Error("Supabase não informado para o serviço de mapas.");
    }
}

function textoSeguro(valor) {
    return String(valor || "").trim();
}

function textoOuNulo(valor) {
    const texto = textoSeguro(valor);
    return texto || null;
}

function numeroOuNulo(valor) {
    if (valor === null || valor === undefined || valor === "") {
        return null;
    }

    const numero = Number(valor);
    return Number.isFinite(numero) ? numero : null;
}

function percentualSeguro(valor, padrao = 50) {
    const numero = Number(valor);

    if (!Number.isFinite(numero)) {
        return padrao;
    }

    return Math.max(0, Math.min(100, numero));
}

function clonarJson(valor) {
    return JSON.parse(JSON.stringify(valor ?? {}));
}

function objetoJson(valor) {
    return Boolean(
        valor &&
        typeof valor === "object" &&
        !Array.isArray(valor),
    );
}

function contemDataUrl(valor) {
    if (typeof valor === "string") {
        return /^data:/i.test(valor.trim());
    }

    if (Array.isArray(valor)) {
        return valor.some(contemDataUrl);
    }

    if (objetoJson(valor)) {
        return Object.values(valor).some(contemDataUrl);
    }

    return false;
}

function normalizarReferenciaImagem(imagem) {
    if (!objetoJson(imagem)) {
        return null;
    }

    const referencia = clonarJson(imagem);

    if (contemDataUrl(referencia)) {
        throw new Error(
            "O mapa possui imagem local em Data URL. Envie a planta ao Storage antes de salvar no Supabase.",
        );
    }

    const caminho = textoSeguro(referencia.path);

    if (caminho) {
        referencia.path = caminho;
        delete referencia.url;
    }

    return referencia;
}

function normalizarItemBanco(item = {}) {
    return {
        ...item,
        id: item.id || "",
        pontoId: item.ponto_id || item.pontoId || "",
        extintorId: item.extintor_id || item.extintorId || "",
        x: percentualSeguro(item.posicao_x ?? item.x),
        y: percentualSeguro(item.posicao_y ?? item.y),
    };
}

function normalizarPontoBanco(ponto = {}) {
    const itens = Array.isArray(ponto.itens)
        ? ponto.itens.map(normalizarItemBanco)
        : [];

    const plantaDetalhada = ponto.plantaDetalhada ||
        (ponto.planta_detalhada_path
            ? {
                path: ponto.planta_detalhada_path,
            }
            : null);

    return {
        ...ponto,
        id: ponto.id || "",
        mapaId: ponto.mapa_id || ponto.mapaId || "",
        empresaId: ponto.empresa_id || ponto.empresaId || "",
        x: percentualSeguro(ponto.posicao_x ?? ponto.x),
        y: percentualSeguro(ponto.posicao_y ?? ponto.y),
        token: ponto.token_publico || ponto.token || "",
        plantaDetalhada,
        itens,
    };
}

export function criarSnapshotMapaObra(mapa = {}) {
    if (!objetoJson(mapa)) {
        throw new Error("Mapa inválido para criação do snapshot.");
    }

    const snapshot = clonarJson(mapa);

    const camposSomenteBanco = [
        "id",
        "mapaId",
        "obra_id",
        "empresa_id",
        "imagem_path",
        "imagem_tipo",
        "largura_original",
        "altura_original",
        "criado_por",
        "criado_em",
        "atualizado_em",
        "snapshot",
        "snapshot_versao",
    ];

    camposSomenteBanco.forEach((campo) => {
        delete snapshot[campo];
    });

    snapshot.empresaId = textoSeguro(
        mapa.empresaId || mapa.empresa_id,
    );

    snapshot.empresaNome = textoSeguro(mapa.empresaNome);

    snapshot.obraId = textoSeguro(
        mapa.obraId || mapa.obra_id,
    );

    snapshot.obraNome = textoSeguro(
        mapa.obraNome || mapa.nome,
    );

    snapshot.planta = normalizarReferenciaImagem(mapa.planta);

    snapshot.pontos = Array.isArray(mapa.pontos)
        ? mapa.pontos.map((ponto) => {
            const proximo = clonarJson(ponto);

            proximo.plantaDetalhada = normalizarReferenciaImagem(
                ponto?.plantaDetalhada,
            );

            return proximo;
        })
        : [];

    snapshot.alertas = Array.isArray(mapa.alertas)
        ? clonarJson(mapa.alertas)
        : [];

    snapshot.tiposAlertaPersonalizados = Array.isArray(
        mapa.tiposAlertaPersonalizados,
    )
        ? Array.from(
            new Set(
                mapa.tiposAlertaPersonalizados
                    .map((tipo) => textoSeguro(tipo))
                    .filter(Boolean),
            ),
        )
        : [];

    if (contemDataUrl(snapshot)) {
        throw new Error(
            "O snapshot do mapa contém Data URL. Envie todas as imagens ao Storage antes de salvar.",
        );
    }

    return snapshot;
}

export function prepararMapaObraBanco(mapa = {}) {
    const obraId = textoSeguro(
        mapa.obra_id || mapa.obraId,
    );

    if (!obraId) {
        throw new Error("Obra não informada para salvar o mapa.");
    }

    const snapshot = criarSnapshotMapaObra(mapa);

    return {
        empresa_id: textoOuNulo(
            mapa.empresa_id || mapa.empresaId,
        ),
        obra_id: obraId,
        nome:
            textoSeguro(mapa.nome) ||
            textoSeguro(mapa.obraNome) ||
            "Mapa da obra",
        descricao: textoOuNulo(mapa.descricao),
        imagem_path: textoOuNulo(
            mapa.imagem_path || mapa.planta?.path,
        ),
        imagem_tipo: textoOuNulo(
            mapa.imagem_tipo || mapa.planta?.tipo,
        ),
        largura_original: numeroOuNulo(
            mapa.largura_original ||
            mapa.planta?.larguraOriginal,
        ),
        altura_original: numeroOuNulo(
            mapa.altura_original ||
            mapa.planta?.alturaOriginal,
        ),
        status: textoSeguro(mapa.status) || "Ativo",
        snapshot,
        snapshot_versao: VERSAO_SNAPSHOT_MAPA_OBRA,
    };
}

export function normalizarMapaObraBanco(registro = {}) {
    const snapshot = objetoJson(registro.snapshot)
        ? clonarJson(registro.snapshot)
        : {};

    const pontos = Array.isArray(snapshot.pontos)
        ? snapshot.pontos
        : Array.isArray(registro.pontos)
            ? registro.pontos.map(normalizarPontoBanco)
            : [];

    const planta = snapshot.planta ||
        (registro.imagem_path
            ? {
                path: registro.imagem_path,
                tipo: registro.imagem_tipo || "",
                larguraOriginal: registro.largura_original || null,
                alturaOriginal: registro.altura_original || null,
            }
            : null);

    return {
        ...snapshot,
        id: registro.id || "",
        mapaId: registro.id || "",
        empresaId: textoSeguro(
            snapshot.empresaId || registro.empresa_id,
        ),
        empresaNome: textoSeguro(snapshot.empresaNome),
        obraId: textoSeguro(
            snapshot.obraId || registro.obra_id,
        ),
        obraNome:
            textoSeguro(snapshot.obraNome) ||
            textoSeguro(registro.nome),
        planta,
        pontos,
        alertas: Array.isArray(snapshot.alertas)
            ? snapshot.alertas
            : [],
        tiposAlertaPersonalizados: Array.isArray(
            snapshot.tiposAlertaPersonalizados,
        )
            ? snapshot.tiposAlertaPersonalizados
            : [],
        descricao:
            snapshot.descricao ??
            registro.descricao ??
            "",
        status:
            textoSeguro(snapshot.status) ||
            textoSeguro(registro.status) ||
            "Ativo",
        snapshotVersao:
            Number(registro.snapshot_versao) ||
            VERSAO_SNAPSHOT_MAPA_OBRA,
    };
}

function pontoParaBanco(ponto = {}) {
    const mapaId = textoSeguro(
        ponto.mapa_id || ponto.mapaId,
    );

    if (!mapaId) {
        throw new Error("Mapa não informado para salvar o ponto.");
    }

    const token = textoSeguro(
        ponto.token_publico || ponto.token,
    );

    if (!token) {
        throw new Error("Token público não informado para salvar o ponto.");
    }

    return {
        mapa_id: mapaId,
        empresa_id: textoOuNulo(
            ponto.empresa_id || ponto.empresaId,
        ),
        nome: textoSeguro(ponto.nome) || "Ponto sem nome",
        tipo: textoSeguro(ponto.tipo) || "Outro ponto",
        descricao: textoOuNulo(ponto.descricao),
        posicao_x: percentualSeguro(
            ponto.posicao_x ?? ponto.x,
        ),
        posicao_y: percentualSeguro(
            ponto.posicao_y ?? ponto.y,
        ),
        icone: textoOuNulo(ponto.icone),
        cor: textoOuNulo(ponto.cor),
        status: textoSeguro(ponto.status) || "Ativo",
        token_publico: token,
        planta_detalhada_path: textoOuNulo(
            ponto.planta_detalhada_path ||
            ponto.plantaDetalhada?.path,
        ),
    };
}

function itemParaBanco(item = {}) {
    const pontoId = textoSeguro(
        item.ponto_id || item.pontoId,
    );

    if (!pontoId) {
        throw new Error("Ponto não informado para salvar o item.");
    }

    return {
        ponto_id: pontoId,
        nome: textoSeguro(item.nome) || "Item sem nome",
        tipo: textoSeguro(item.tipo) || "Outro item",
        numero_identificacao: textoOuNulo(
            item.numero_identificacao ||
            item.numeroIdentificacao,
        ),
        extintor_id: textoOuNulo(
            item.extintor_id || item.extintorId,
        ),
        posicao_x: percentualSeguro(
            item.posicao_x ?? item.x,
        ),
        posicao_y: percentualSeguro(
            item.posicao_y ?? item.y,
        ),
        metadados: objetoJson(item.metadados)
            ? clonarJson(item.metadados)
            : {},
        status: textoSeguro(item.status) || "Ativo",
    };
}

export async function listarMapasObraService({
    supabase,
    obraId = "",
} = {}) {
    exigirSupabase(supabase);

    let consulta = supabase
        .from("mapas_obras")
        .select(
            "*, pontos:mapas_pontos(*, itens:mapas_itens(*))",
        )
        .order("atualizado_em", {
            ascending: false,
        });

    if (obraId) {
        consulta = consulta.eq("obra_id", obraId);
    }

    const { data, error } = await consulta;

    if (error) {
        throw error;
    }

    return Array.isArray(data)
        ? data.map(normalizarMapaObraBanco)
        : [];
}

export async function salvarMapaObraService({
    supabase,
    mapa,
} = {}) {
    exigirSupabase(supabase);

    const payload = prepararMapaObraBanco(mapa);
    const id = textoSeguro(mapa?.id || mapa?.mapaId);

    const consulta = id
        ? supabase
            .from("mapas_obras")
            .update({
                ...payload,
                atualizado_em: new Date().toISOString(),
            })
            .eq("id", id)
            .select()
            .single()
        : supabase
            .from("mapas_obras")
            .upsert(payload, {
                onConflict: "obra_id,nome",
                ignoreDuplicates: false,
            })
            .select()
            .single();

    const { data, error } = await consulta;

    if (error) {
        throw error;
    }

    return normalizarMapaObraBanco(data);
}

export async function salvarPontoMapaObraService({
    supabase,
    ponto,
} = {}) {
    exigirSupabase(supabase);

    const payload = pontoParaBanco(ponto);
    const id = textoSeguro(ponto?.id);

    const consulta = id
        ? supabase
            .from("mapas_pontos")
            .update({
                ...payload,
                atualizado_em: new Date().toISOString(),
            })
            .eq("id", id)
            .select()
            .single()
        : supabase
            .from("mapas_pontos")
            .insert(payload)
            .select()
            .single();

    const { data, error } = await consulta;

    if (error) {
        throw error;
    }

    return data;
}

export async function salvarItemMapaObraService({
    supabase,
    item,
} = {}) {
    exigirSupabase(supabase);

    const payload = itemParaBanco(item);
    const id = textoSeguro(item?.id);

    const consulta = id
        ? supabase
            .from("mapas_itens")
            .update({
                ...payload,
                atualizado_em: new Date().toISOString(),
            })
            .eq("id", id)
            .select()
            .single()
        : supabase
            .from("mapas_itens")
            .insert(payload)
            .select()
            .single();

    const { data, error } = await consulta;

    if (error) {
        throw error;
    }

    return data;
}

export async function consultarPontoMapaPublicoService({
    supabase,
    token,
} = {}) {
    exigirSupabase(supabase);

    const tokenSeguro = textoSeguro(token);

    if (!tokenSeguro) {
        throw new Error("Token público do mapa não informado.");
    }

    const { data, error } = await supabase.rpc(
        "consulta_publica_ponto_mapa",
        {
            token_param: tokenSeguro,
        },
    );

    if (error) {
        throw error;
    }

    return data;
}

export async function consultarPontoMapaEdgeService({
    supabase,
    token,
} = {}) {
    exigirSupabase(supabase);

    const tokenSeguro = textoSeguro(token);

    if (!tokenSeguro) {
        throw new Error("Token público do mapa não informado.");
    }

    const { data, error } = await supabase.functions.invoke(
        "consulta-ponto-mapa",
        {
            body: {
                token: tokenSeguro,
            },
        },
    );

    if (error) {
        throw error;
    }

    return data;
}
