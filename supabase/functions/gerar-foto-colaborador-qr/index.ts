import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonResponse = (status: number, body: Record<string, unknown>) =>
    new Response(JSON.stringify(body), {
        status,
        headers: {
            ...corsHeaders,
            "Content-Type": "application/json; charset=utf-8",
        },
    });

const normalizarCaminhoFoto = (valor: unknown) => {
    const texto = String(valor || "").trim();

    if (!texto) return "";

    try {
        if (/^https?:\/\//i.test(texto)) {
            const url = new URL(texto);
            const partes = decodeURIComponent(url.pathname).split("/fotos-colaboradores/");
            return (partes[1] || "").replace(/^\/+/, "");
        }
    } catch {
        // Se a URL vier em formato inválido, tenta tratar como caminho simples abaixo.
    }

    return texto
        .replace(/^\/+/, "")
        .replace(/^fotos-colaboradores\//, "")
        .replace(/^public\/fotos-colaboradores\//, "")
        .replace(/^sign\/fotos-colaboradores\//, "")
        .trim();
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    if (req.method !== "POST") {
        return jsonResponse(405, {
            ok: false,
            erro: "Método não permitido. Use POST.",
        });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

        if (!supabaseUrl || !serviceRoleKey) {
            return jsonResponse(500, {
                ok: false,
                erro: "Variáveis SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configuradas.",
            });
        }

        const corpo = await req.json().catch(() => ({}));
        const token = String(corpo?.token || "").trim();

        if (!token) {
            return jsonResponse(400, {
                ok: false,
                erro: "Token QR não informado.",
            });
        }

        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
            },
        });

        const { data: colaborador, error: erroColaborador } = await supabaseAdmin
            .from("colaboradores")
            .select("id, nome, token_qr, foto_url, foto_nome, status, status_mobilizacao")
            .eq("token_qr", token)
            .maybeSingle();

        if (erroColaborador) {
            return jsonResponse(500, {
                ok: false,
                erro: erroColaborador.message,
            });
        }

        if (!colaborador) {
            return jsonResponse(404, {
                ok: false,
                erro: "Token QR não localizado.",
            });
        }

        const caminhoFoto = normalizarCaminhoFoto(colaborador.foto_url);

        if (!caminhoFoto) {
            return jsonResponse(200, {
                ok: true,
                semFoto: true,
                signedUrl: "",
                fotoUrl: "",
                fotoNome: colaborador.foto_nome || "",
            });
        }

        const { data: urlAssinada, error: erroUrlAssinada } = await supabaseAdmin.storage
            .from("fotos-colaboradores")
            .createSignedUrl(caminhoFoto, 60 * 10);

        if (erroUrlAssinada) {
            return jsonResponse(500, {
                ok: false,
                erro: erroUrlAssinada.message,
            });
        }

        return jsonResponse(200, {
            ok: true,
            signedUrl: urlAssinada?.signedUrl || "",
            fotoUrl: urlAssinada?.signedUrl || "",
            fotoNome: colaborador.foto_nome || "",
            expiresIn: 60 * 10,
        });
    } catch (error) {
        return jsonResponse(500, {
            ok: false,
            erro: error instanceof Error ? error.message : String(error),
        });
    }
});
