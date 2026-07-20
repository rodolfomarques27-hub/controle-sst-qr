import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

type JsonObject = Record<string, unknown>;

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonResponse = (
    status: number,
    body: Record<string, unknown>,
) =>
    new Response(
        JSON.stringify(body),
        {
            status,
            headers: {
                ...corsHeaders,
                "Content-Type":
                    "application/json; charset=utf-8",
            },
        },
    );

function texto(valor: unknown) {
    return String(valor ?? "").trim();
}

function objeto(valor: unknown): JsonObject {
    return Boolean(
        valor &&
        typeof valor === "object" &&
        !Array.isArray(valor),
    )
        ? valor as JsonObject
        : {};
}

function listaObjetos(valor: unknown): JsonObject[] {
    return Array.isArray(valor)
        ? valor.filter(
            (item) =>
                item &&
                typeof item === "object" &&
                !Array.isArray(item),
        ) as JsonObject[]
        : [];
}

function numeroSeguro(
    valor: unknown,
    padrao = 50,
) {
    const numero = Number(valor);

    return Number.isFinite(numero)
        ? numero
        : padrao;
}

function identificadorEhUuid(
    valor: unknown,
) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        texto(valor),
    );
}

function normalizarExtintorPublico(
    registro: JsonObject,
) {
    return {
        id: texto(registro.id),
        referenciaLocal:
            texto(registro.referencia_local),
        codigo: texto(registro.codigo),
        localizacao:
            texto(registro.localizacao),
        tipo: texto(registro.tipo),
        capacidade:
            texto(registro.capacidade),
        status:
            texto(registro.status) ||
            "Ativo",
        situacaoOperacional:
            texto(
                registro.situacao_operacional,
            ) || "Em operação",
        pontoId:
            texto(registro.ponto_id),
        pontoReferenciaLocal:
            texto(
                registro.ponto_referencia_local,
            ),
        atualizadoEm:
            texto(registro.atualizado_em),
    };
}

async function consultarExtintoresDoPonto(
    supabaseAdmin: ReturnType<typeof createClient>,
    {
        obraId,
        pontoId = "",
        pontoReferenciaLocal = "",
        referencias = [],
    }: {
        obraId: string;
        pontoId?: string;
        pontoReferenciaLocal?: string;
        referencias?: string[];
    },
) {
    const idObra = texto(obraId);

    if (!idObra) {
        return [];
    }

    const referenciasSeguras =
        Array.from(
            new Set(
                referencias
                    .map(texto)
                    .filter(Boolean),
            ),
        ).slice(0, 200);

    const idsRemotos =
        referenciasSeguras.filter(
            identificadorEhUuid,
        );

    const referenciasLocais =
        referenciasSeguras.filter(
            (referencia) =>
                !identificadorEhUuid(
                    referencia,
                ),
        );

    const campos =
        "id, referencia_local, codigo, localizacao, tipo, capacidade, status, situacao_operacional, ponto_id, ponto_referencia_local, atualizado_em";

    const consultas: Array<
        PromiseLike<{
            data: unknown;
            error: unknown;
        }>
    > = [];

    const criarConsulta = () =>
        supabaseAdmin
            .from("extintores")
            .select(campos)
            .eq("obra_id", idObra);

    const idPonto = texto(pontoId);

    if (identificadorEhUuid(idPonto)) {
        consultas.push(
            criarConsulta().eq(
                "ponto_id",
                idPonto,
            ),
        );
    }

    const referenciaPonto =
        texto(pontoReferenciaLocal) ||
        (
            idPonto &&
            !identificadorEhUuid(idPonto)
                ? idPonto
                : ""
        );

    if (referenciaPonto) {
        consultas.push(
            criarConsulta().eq(
                "ponto_referencia_local",
                referenciaPonto,
            ),
        );
    }

    if (idsRemotos.length) {
        consultas.push(
            criarConsulta().in(
                "id",
                idsRemotos,
            ),
        );
    }

    if (referenciasLocais.length) {
        consultas.push(
            criarConsulta().in(
                "referencia_local",
                referenciasLocais,
            ),
        );
    }

    if (!consultas.length) {
        return [];
    }

    const registrosPorId =
        new Map<string, JsonObject>();

    for (const consulta of consultas) {
        const {
            data,
            error,
        } = await consulta;

        if (error) {
            throw error;
        }

        listaObjetos(data).forEach(
            (registro) => {
                const id = texto(
                    registro.id,
                );

                if (id) {
                    registrosPorId.set(
                        id,
                        registro,
                    );
                }
            },
        );
    }

    return Array.from(
        registrosPorId.values(),
    )
        .map(normalizarExtintorPublico)
        .sort((a, b) =>
            a.codigo.localeCompare(
                b.codigo,
                "pt-BR",
                {
                    numeric: true,
                    sensitivity: "base",
                },
            )
        );
}

async function urlAssinada(
    supabaseAdmin: ReturnType<typeof createClient>,
    caminho: string,
) {
    const caminhoSeguro = texto(caminho);

    if (!caminhoSeguro) {
        return "";
    }

    const { data, error } =
        await supabaseAdmin.storage
            .from("mapas-obras")
            .createSignedUrl(
                caminhoSeguro,
                60 * 10,
            );

    if (error) {
        throw error;
    }

    return data?.signedUrl || "";
}

async function consultarSnapshot(
    supabaseAdmin: ReturnType<typeof createClient>,
    token: string,
) {
    const { data, error } =
        await supabaseAdmin
            .from("mapas_obras")
            .select(
                "id, obra_id, nome, descricao, imagem_path, status, atualizado_em, snapshot, snapshot_versao",
            )
            .eq("status", "Ativo")
            .contains(
                "snapshot",
                {
                    pontos: [
                        {
                            token,
                        },
                    ],
                },
            )
            .order(
                "atualizado_em",
                {
                    ascending: false,
                },
            )
            .limit(1);

    if (error) {
        throw error;
    }

    const registro =
        Array.isArray(data)
            ? data[0]
            : null;

    if (!registro) {
        return null;
    }

    const snapshot =
        objeto(registro.snapshot);

    const ponto =
        listaObjetos(
            snapshot.pontos,
        ).find((item) => (
            texto(item.token) === token &&
            texto(
                item.status || "Ativo",
            ).toLowerCase() === "ativo"
        ));

    if (!ponto) {
        return null;
    }

    const plantaGeral =
        objeto(snapshot.planta);

    const plantaDetalhada =
        objeto(
            ponto.plantaDetalhada,
        );

    const caminhoGeral =
        texto(plantaGeral.path) ||
        texto(registro.imagem_path);

    const caminhoDetalhado =
        texto(plantaDetalhada.path);

    const [
        plantaGeralUrl,
        plantaDetalhadaUrl,
    ] = await Promise.all([
        urlAssinada(
            supabaseAdmin,
            caminhoGeral,
        ),
        urlAssinada(
            supabaseAdmin,
            caminhoDetalhado,
        ),
    ]);

    const plantaGeralPublica =
        plantaGeralUrl
            ? {
                ...plantaGeral,
                path: undefined,
                url: plantaGeralUrl,
            }
            : null;

    const plantaDetalhadaPublica =
        plantaDetalhadaUrl
            ? {
                ...plantaDetalhada,
                path: undefined,
                url:
                    plantaDetalhadaUrl,
            }
            : null;

    const pontoPublico: JsonObject = {
        ...ponto,
        token: undefined,
        extintores: undefined,
        x: numeroSeguro(
            ponto.x ??
            ponto.posicao_x,
        ),
        y: numeroSeguro(
            ponto.y ??
            ponto.posicao_y,
        ),
        plantaDetalhada:
            plantaDetalhadaPublica,
        plantaDetalhadaUrl,
    };

    const itens =
        Array.isArray(ponto.itens)
            ? ponto.itens
            : Array.isArray(
                ponto.pontosInternosPlanta,
            )
                ? ponto.pontosInternosPlanta
                : [];

    const referenciasExtintores =
        Array.from(
            new Set(
                [
                    ...(
                        Array.isArray(
                            ponto.extintores,
                        )
                            ? ponto.extintores
                            : []
                    ),
                    ...Object.keys(
                        objeto(
                            ponto.extintorPosicoes,
                        ),
                    ),
                ]
                    .map(texto)
                    .filter(Boolean),
            ),
        );

    const extintores =
        await consultarExtintoresDoPonto(
            supabaseAdmin,
            {
                obraId:
                    texto(registro.obra_id),
                pontoId:
                    texto(ponto.id),
                pontoReferenciaLocal:
                    texto(
                        ponto.referenciaLocal ||
                        ponto.referencia_local,
                    ),
                referencias:
                    referenciasExtintores,
            },
        );

    const itensPublicos =
        listaObjetos(itens).filter(
            (item) =>
                !texto(
                    item.extintorId ||
                    item.extintor_id,
                ),
        );

    return {
        ponto: pontoPublico,
        mapa: {
            nome:
                texto(registro.nome) ||
                texto(snapshot.obraNome) ||
                "Mapa da obra",
            obraNome:
                texto(snapshot.obraNome) ||
                texto(registro.nome),
            descricao:
                texto(registro.descricao) ||
                texto(snapshot.descricao),
            atualizadoEm:
                registro.atualizado_em ||
                snapshot.atualizadoEm ||
                "",
            planta:
                plantaGeralPublica,
            plantaGeralUrl,
            snapshotVersao:
                registro.snapshot_versao ||
                1,
        },
        itens: itensPublicos,
        extintores,
        origem: "snapshot",
    };
}

async function consultarLegado(
    supabaseAdmin: ReturnType<typeof createClient>,
    token: string,
) {
    const {
        data: ponto,
        error: erroPonto,
    } = await supabaseAdmin
        .from("mapas_pontos")
        .select(
            "id, nome, tipo, descricao, posicao_x, posicao_y, icone, cor, status, token_publico, planta_detalhada_path, atualizado_em, mapas_obras!inner(obra_id, nome, descricao, imagem_path, status, atualizado_em)",
        )
        .eq("token_publico", token)
        .eq("status", "Ativo")
        .eq(
            "mapas_obras.status",
            "Ativo",
        )
        .maybeSingle();

    if (erroPonto) {
        throw erroPonto;
    }

    if (!ponto) {
        return null;
    }

    const {
        data: itens,
        error: erroItens,
    } = await supabaseAdmin
        .from("mapas_itens")
        .select(
            "nome, tipo, descricao, posicao_x, posicao_y, icone, cor, status, numero_identificacao, extintor_id, data_inspecao, proxima_inspecao, data_validade, observacao",
        )
        .eq("ponto_id", ponto.id)
        .eq("status", "Ativo");

    if (erroItens) {
        throw erroItens;
    }

    const obra =
        Array.isArray(ponto.mapas_obras)
            ? ponto.mapas_obras[0]
            : ponto.mapas_obras;

    const itensNormalizados =
        listaObjetos(itens);

    const referenciasExtintores =
        itensNormalizados
            .map((item) =>
                texto(item.extintor_id),
            )
            .filter(Boolean);

    const extintores =
        await consultarExtintoresDoPonto(
            supabaseAdmin,
            {
                obraId:
                    texto(obra?.obra_id),
                pontoId:
                    texto(ponto.id),
                referencias:
                    referenciasExtintores,
            },
        );

    const extintorPosicoes =
        Object.fromEntries(
            itensNormalizados
                .filter((item) =>
                    texto(item.extintor_id)
                )
                .map((item) => [
                    texto(item.extintor_id),
                    {
                        x: numeroSeguro(
                            item.posicao_x,
                        ),
                        y: numeroSeguro(
                            item.posicao_y,
                        ),
                    },
                ]),
        );

    const itensPublicos =
        itensNormalizados.filter(
            (item) =>
                !texto(item.extintor_id),
        );

    const [
        plantaGeralUrl,
        plantaDetalhadaUrl,
    ] = await Promise.all([
        urlAssinada(
            supabaseAdmin,
            obra?.imagem_path || "",
        ),
        urlAssinada(
            supabaseAdmin,
            ponto.planta_detalhada_path || "",
        ),
    ]);

    return {
        ponto: {
            nome: ponto.nome,
            tipo: ponto.tipo,
            descricao: ponto.descricao,
            x: ponto.posicao_x,
            y: ponto.posicao_y,
            icone: ponto.icone,
            cor: ponto.cor,
            status: ponto.status,
            atualizadoEm:
                ponto.atualizado_em,
            plantaDetalhadaUrl,
            extintorPosicoes,
        },
        mapa: {
            nome:
                obra?.nome ||
                "Mapa da obra",
            obraNome:
                obra?.nome ||
                "Mapa da obra",
            descricao:
                obra?.descricao ||
                "",
            atualizadoEm:
                obra?.atualizado_em ||
                "",
            plantaGeralUrl,
        },
        itens: itensPublicos,
        extintores,
        origem: "legado",
    };
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(
            "ok",
            {
                headers: corsHeaders,
            },
        );
    }

    if (req.method !== "POST") {
        return jsonResponse(
            405,
            {
                ok: false,
                erro:
                    "Método não permitido. Use POST.",
            },
        );
    }

    try {
        const supabaseUrl =
            Deno.env.get(
                "SUPABASE_URL",
            );

        const serviceRoleKey =
            Deno.env.get(
                "SUPABASE_SERVICE_ROLE_KEY",
            );

        if (
            !supabaseUrl ||
            !serviceRoleKey
        ) {
            return jsonResponse(
                500,
                {
                    ok: false,
                    erro:
                        "Configuração da função incompleta.",
                },
            );
        }

        const corpo =
            await req
                .json()
                .catch(() => ({}));

        const token =
            texto(corpo?.token);

        if (
            !token ||
            token.length > 160
        ) {
            return jsonResponse(
                400,
                {
                    ok: false,
                    erro:
                        "Token QR inválido.",
                },
            );
        }

        const supabaseAdmin =
            createClient(
                supabaseUrl,
                serviceRoleKey,
                {
                    auth: {
                        persistSession:
                            false,
                        autoRefreshToken:
                            false,
                    },
                },
            );

        const resultadoSnapshot =
            await consultarSnapshot(
                supabaseAdmin,
                token,
            );

        if (resultadoSnapshot) {
            return jsonResponse(
                200,
                {
                    ok: true,
                    ...resultadoSnapshot,
                    expiresIn:
                        60 * 10,
                },
            );
        }

        const resultadoLegado =
            await consultarLegado(
                supabaseAdmin,
                token,
            );

        if (resultadoLegado) {
            return jsonResponse(
                200,
                {
                    ok: true,
                    ...resultadoLegado,
                    expiresIn:
                        60 * 10,
                },
            );
        }

        return jsonResponse(
            404,
            {
                ok: false,
                erro:
                    "Ponto QR não localizado.",
            },
        );
    } catch (error) {
        return jsonResponse(
            500,
            {
                ok: false,
                erro:
                    error instanceof Error
                        ? error.message
                        : String(error),
            },
        );
    }
});
