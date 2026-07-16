import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonResponse = (status: number, body: Record<string, unknown>) => new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
});

async function urlAssinada(supabaseAdmin: ReturnType<typeof createClient>, caminho: string) {
    if (!caminho) return "";
    const { data, error } = await supabaseAdmin.storage.from("mapas-obras").createSignedUrl(caminho, 60 * 10);
    if (error) throw error;
    return data?.signedUrl || "";
}

serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return jsonResponse(405, { ok: false, erro: "Método não permitido. Use POST." });

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        if (!supabaseUrl || !serviceRoleKey) return jsonResponse(500, { ok: false, erro: "Configuração da função incompleta." });

        const corpo = await req.json().catch(() => ({}));
        const token = String(corpo?.token || "").trim();
        if (!token || token.length > 160) return jsonResponse(400, { ok: false, erro: "Token QR inválido." });

        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
        const { data: ponto, error: erroPonto } = await supabaseAdmin
            .from("mapas_pontos")
            .select("id, nome, tipo, descricao, posicao_x, posicao_y, icone, cor, status, token_publico, planta_detalhada_path, atualizado_em, mapas_obras!inner(nome, descricao, imagem_path, status, atualizado_em)")
            .eq("token_publico", token)
            .eq("status", "Ativo")
            .eq("mapas_obras.status", "Ativo")
            .maybeSingle();

        if (erroPonto) return jsonResponse(500, { ok: false, erro: erroPonto.message });
        if (!ponto) return jsonResponse(404, { ok: false, erro: "Ponto QR não localizado." });

        const { data: itens, error: erroItens } = await supabaseAdmin
            .from("mapas_itens")
            .select("nome, tipo, descricao, posicao_x, posicao_y, icone, cor, status, numero_identificacao, data_inspecao, proxima_inspecao, data_validade, observacao")
            .eq("ponto_id", ponto.id)
            .eq("status", "Ativo");

        if (erroItens) return jsonResponse(500, { ok: false, erro: erroItens.message });

        const obra = Array.isArray(ponto.mapas_obras) ? ponto.mapas_obras[0] : ponto.mapas_obras;
        const [plantaGeralUrl, plantaDetalhadaUrl] = await Promise.all([
            urlAssinada(supabaseAdmin, obra?.imagem_path || ""),
            urlAssinada(supabaseAdmin, ponto.planta_detalhada_path || ""),
        ]);

        return jsonResponse(200, {
            ok: true,
            ponto: { nome: ponto.nome, tipo: ponto.tipo, descricao: ponto.descricao, x: ponto.posicao_x, y: ponto.posicao_y, icone: ponto.icone, cor: ponto.cor, status: ponto.status, atualizadoEm: ponto.atualizado_em, plantaDetalhadaUrl },
            mapa: { nome: obra?.nome || "Mapa da obra", descricao: obra?.descricao || "", atualizadoEm: obra?.atualizado_em || "", plantaGeralUrl },
            itens: itens || [],
            expiresIn: 60 * 10,
        });
    } catch (error) {
        return jsonResponse(500, { ok: false, erro: error instanceof Error ? error.message : String(error) });
    }
});
