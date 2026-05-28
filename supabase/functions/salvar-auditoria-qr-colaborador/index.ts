import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function texto(valor: unknown) {
  return String(valor ?? "").trim();
}

function limparNomeArquivo(nome: string) {
  return texto(nome)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 140) || "foto-auditoria.jpg";
}

function bytesFromBase64(base64: string) {
  const limpo = texto(base64).includes(",") ? texto(base64).split(",").pop() || "" : texto(base64);
  const binario = atob(limpo);
  const bytes = new Uint8Array(binario.length);

  for (let index = 0; index < binario.length; index += 1) {
    bytes[index] = binario.charCodeAt(index);
  }

  return bytes;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ ok: false, erro: "Método não permitido." }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ ok: false, erro: "Secrets do Supabase não configuradas na Edge Function." }, 500);
    }

    const body = await req.json().catch(() => ({}));
    const tokenAuditoria = texto(body.tokenAuditoria || body.token_auditoria || body.token || "TOKEN-AUDITORIA-CAMPO-2026");
    const senha = texto(body.senha || body.senhaAuditoria || body.senha_auditoria);
    const tokenQr = texto(body.tokenQr || body.token_qr || body?.auditoria?.token_qr);
    const auditoria = body.auditoria || {};
    const desvio = body.desvio || null;
    const fotos = body.fotos || {};

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    if (!tokenQr) {
      return jsonResponse({ ok: false, erro: "Token QR do colaborador não informado." }, 400);
    }

    const { data: tokenData, error: tokenError } = await supabase
      .from("auditoria_tokens_publicos")
      .select("id, empresa_id, token, senha_acesso, requer_senha, ativo, data_expiracao")
      .eq("token", tokenAuditoria)
      .eq("ativo", true)
      .maybeSingle();

    if (tokenError) {
      return jsonResponse({ ok: false, erro: tokenError.message }, 500);
    }

    if (!tokenData) {
      return jsonResponse({ ok: false, erro: "Token público da auditoria inválido ou inativo." }, 401);
    }

    if (tokenData.data_expiracao) {
      const hoje = new Date();
      const expiracao = new Date(`${tokenData.data_expiracao}T23:59:59`);
      if (expiracao < hoje) {
        return jsonResponse({ ok: false, erro: "Token público da auditoria expirado." }, 401);
      }
    }

    if ((tokenData.requer_senha ?? true) && texto(tokenData.senha_acesso) !== senha) {
      return jsonResponse({ ok: false, erro: "Senha inválida para salvar a auditoria." }, 401);
    }

    const { data: colaborador, error: colaboradorError } = await supabase
      .from("colaboradores")
      .select("*")
      .eq("token_qr", tokenQr)
      .maybeSingle();

    if (colaboradorError) {
      return jsonResponse({ ok: false, erro: colaboradorError.message }, 500);
    }

    if (!colaborador) {
      return jsonResponse({ ok: false, erro: "Colaborador não encontrado para o token QR informado." }, 404);
    }

    const auditoriaId = crypto.randomUUID();
    const auditoriaPayload = {
      ...auditoria,
      id: auditoriaId,
      colaborador_id: colaborador.id,
      empresa_id: auditoria.empresa_id || colaborador.empresa_id || tokenData.empresa_id || null,
      token_qr: tokenQr,
      colaborador_nome: auditoria.colaborador_nome || colaborador.nome || "",
      empresa_nome: auditoria.empresa_nome || colaborador.empresa_nome || colaborador.empresa || "",
      funcao: auditoria.funcao || colaborador.funcao || "",
      origem: auditoria.origem || "QR Code do colaborador",
      created_at: new Date().toISOString(),
    };

    const { data: auditoriaCriada, error: auditoriaError } = await supabase
      .from("auditorias_campo")
      .insert(auditoriaPayload)
      .select("*")
      .single();

    if (auditoriaError) {
      return jsonResponse({ ok: false, erro: auditoriaError.message }, 500);
    }

    async function uploadFoto(foto: any, tipo: "antes" | "depois") {
      if (!foto?.base64) return "";

      const nomeArquivo = `${tipo}-${Date.now()}-${limparNomeArquivo(foto.nome || "foto-auditoria.jpg")}`;
      const caminho = `auditorias-publicas/qr-colaborador/${auditoriaId}/${nomeArquivo}`;
      const bytes = bytesFromBase64(foto.base64);

      const { error } = await supabase.storage
        .from("auditorias-campo")
        .upload(caminho, bytes, {
          contentType: texto(foto.tipo) || "image/jpeg",
          upsert: true,
        });

      if (error) throw error;

      return caminho;
    }

    let desvioCriado = null;

    if (desvio) {
      let fotoAntesUrl = "";
      let fotoDepoisUrl = "";

      try {
        fotoAntesUrl = await uploadFoto(fotos.antes, "antes");
        fotoDepoisUrl = await uploadFoto(fotos.depois, "depois");
      } catch (error) {
        return jsonResponse({ ok: false, erro: `Erro ao enviar foto da auditoria: ${error?.message || String(error)}` }, 500);
      }

      const desvioPayload = {
        ...desvio,
        id: crypto.randomUUID(),
        auditoria_id: auditoriaId,
        colaborador_id: colaborador.id,
        empresa_id: auditoriaPayload.empresa_id,
        foto_antes_url: fotoAntesUrl,
        foto_depois_url: fotoDepoisUrl,
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("auditoria_campo_desvios")
        .insert(desvioPayload)
        .select("*")
        .single();

      if (error) {
        return jsonResponse({ ok: false, erro: error.message }, 500);
      }

      desvioCriado = data;
    }

    return jsonResponse({
      ok: true,
      mensagem: "Auditoria registrada com sucesso.",
      auditoria: auditoriaCriada,
      desvio: desvioCriado,
    });
  } catch (error) {
    return jsonResponse({ ok: false, erro: error?.message || String(error) }, 500);
  }
});
