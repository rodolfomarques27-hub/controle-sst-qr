import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BUCKET = "auditorias-campo";
const MAX_FILE_BYTES = 4 * 1024 * 1024;
const MAX_REMOVE_PATHS = 10;

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

function limparSegmento(valor: unknown, fallback = "sem-identificacao") {
  const seguro = texto(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._~-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 140);

  return seguro || fallback;
}

function limparNomeBase(nome: unknown) {
  const seguro = texto(nome)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);

  const semExtensao = seguro.replace(/\.[^.]+$/, "");

  return semExtensao || "foto-auditoria";
}

function bytesFromBase64(base64: string) {
  const valor = texto(base64);

  const limpo =
    valor.includes(",")
      ? valor.split(",").pop() || ""
      : valor;

  if (!limpo) {
    throw new Error("Conteúdo da imagem não informado.");
  }

  if (limpo.length > 6 * 1024 * 1024) {
    throw new Error("Imagem excede o limite aceito para processamento.");
  }

  const binario = atob(limpo);
  const bytes = new Uint8Array(binario.length);

  for (let index = 0; index < binario.length; index += 1) {
    bytes[index] = binario.charCodeAt(index);
  }

  return bytes;
}

function extensaoMime(mime: string) {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";

  return "";
}

function assinaturaImagemValida(
  bytes: Uint8Array,
  mime: string,
) {
  if (mime === "image/jpeg") {
    return (
      bytes.length >= 3 &&
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[2] === 0xff
    );
  }

  if (mime === "image/png") {
    return (
      bytes.length >= 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    );
  }

  if (mime === "image/webp") {
    return (
      bytes.length >= 12 &&
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    );
  }

  return false;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return jsonResponse(
      {
        ok: false,
        erro: "Método não permitido.",
      },
      405,
    );
  }

  try {
    const supabaseUrl =
      Deno.env.get("SUPABASE_URL") || "";

    const serviceRoleKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse(
        {
          ok: false,
          erro: "Secrets do Supabase não configuradas na Edge Function.",
        },
        500,
      );
    }

    const body =
      await req.json().catch(() => ({}));

    const acao =
      texto(body?.acao).toLowerCase();

    const tokenAuditoria =
      texto(
        body?.tokenAuditoria ||
        body?.token_auditoria ||
        body?.token
      );

    const senha =
      texto(
        body?.senha ||
        body?.senhaAuditoria ||
        body?.senha_auditoria
      );

    if (!tokenAuditoria) {
      return jsonResponse(
        {
          ok: false,
          erro: "Token público da auditoria não informado.",
        },
        400,
      );
    }

    if (
      tokenAuditoria.length > 200 ||
      !/^[A-Za-z0-9._~-]+$/.test(tokenAuditoria)
    ) {
      return jsonResponse(
        {
          ok: false,
          erro: "Formato do token público inválido.",
        },
        400,
      );
    }

    const supabase =
      createClient(
        supabaseUrl,
        serviceRoleKey,
        {
          auth: {
            persistSession: false,
          },
        },
      );

    const {
      data: validacao,
      error: erroValidacao,
    } =
      await supabase.rpc(
        "validar_acesso_auditoria_publica",
        {
          p_token: tokenAuditoria,
          p_senha: senha,
        },
      );

    if (erroValidacao) {
      return jsonResponse(
        {
          ok: false,
          erro: "Não foi possível validar o acesso à auditoria.",
        },
        500,
      );
    }

    if (
      !validacao ||
      validacao?.autorizado !== true ||
      validacao?.ok !== true
    ) {
      return jsonResponse(
        {
          ok: false,
          erro:
            texto(validacao?.mensagem) ||
            "Acesso não autorizado à auditoria.",
        },
        401,
      );
    }

    const prefixoAutorizado =
      `auditorias-publicas/${tokenAuditoria}/`;

    if (acao === "upload") {
      const arquivo =
        body?.arquivo &&
        typeof body.arquivo === "object" &&
        !Array.isArray(body.arquivo)
          ? body.arquivo
          : null;

      if (!arquivo) {
        return jsonResponse(
          {
            ok: false,
            erro: "Arquivo da auditoria não informado.",
          },
          400,
        );
      }

      const mime =
        texto(arquivo.tipo).toLowerCase();

      const extensao =
        extensaoMime(mime);

      if (!extensao) {
        return jsonResponse(
          {
            ok: false,
            erro: "Somente imagens JPG, JPEG, PNG ou WEBP são permitidas.",
          },
          415,
        );
      }

      let bytes: Uint8Array;

      try {
        bytes =
          bytesFromBase64(
            texto(arquivo.base64)
          );
      } catch (error) {
        return jsonResponse(
          {
            ok: false,
            erro:
              error instanceof Error
                ? error.message
                : "Imagem inválida.",
          },
          400,
        );
      }

      if (
        bytes.length === 0 ||
        bytes.length > MAX_FILE_BYTES
      ) {
        return jsonResponse(
          {
            ok: false,
            erro: "Imagem fora do tamanho permitido.",
          },
          413,
        );
      }

      if (!assinaturaImagemValida(bytes, mime)) {
        return jsonResponse(
          {
            ok: false,
            erro: "O conteúdo do arquivo não corresponde a uma imagem permitida.",
          },
          415,
        );
      }

      const referencia =
        limparSegmento(
          body?.referencia,
          `auditoria-${crypto.randomUUID()}`
        );

      const tipo =
        limparSegmento(
          body?.tipo,
          "foto"
        );

      const nomeBase =
        limparNomeBase(
          arquivo.nome
        );

      const nomeArquivo =
        `${tipo}-${crypto.randomUUID()}-${nomeBase}.${extensao}`;

      const caminho =
        `${prefixoAutorizado}${referencia}/${nomeArquivo}`;

      const { error: erroUpload } =
        await supabase.storage
          .from(BUCKET)
          .upload(
            caminho,
            bytes,
            {
              contentType: mime,
              upsert: false,
            },
          );

      if (erroUpload) {
        return jsonResponse(
          {
            ok: false,
            erro: "Não foi possível gravar a foto da auditoria.",
          },
          500,
        );
      }

      return jsonResponse({
        ok: true,
        caminho,
      });
    }

    if (acao === "remove") {
      const caminhos: string[] =
        Array.from(
          new Set<string>(
            (
              Array.isArray(body?.caminhos)
                ? body.caminhos
                : []
            )
              .map(
                (item: unknown): string =>
                  texto(item)
              )
              .filter(
                (item: string): boolean =>
                  item.length > 0
              )
          )
        );

      if (caminhos.length === 0) {
        return jsonResponse({
          ok: true,
          removidos: 0,
        });
      }

      if (caminhos.length > MAX_REMOVE_PATHS) {
        return jsonResponse(
          {
            ok: false,
            erro: "Quantidade de arquivos para remoção excede o limite.",
          },
          400,
        );
      }

      const caminhoInvalido =
        caminhos.find((caminho) => {
          return (
            !caminho.startsWith(prefixoAutorizado) ||
            caminho.includes("..") ||
            caminho.includes("\\")
          );
        });

      if (caminhoInvalido) {
        return jsonResponse(
          {
            ok: false,
            erro: "Caminho de arquivo fora do escopo autorizado.",
          },
          403,
        );
      }

      const { error: erroRemove } =
        await supabase.storage
          .from(BUCKET)
          .remove(caminhos);

      if (erroRemove) {
        return jsonResponse(
          {
            ok: false,
            erro: "Não foi possível remover os arquivos pendentes da auditoria.",
          },
          500,
        );
      }

      return jsonResponse({
        ok: true,
        removidos: caminhos.length,
      });
    }

    return jsonResponse(
      {
        ok: false,
        erro: "Ação não suportada.",
      },
      400,
    );
  } catch {
    return jsonResponse(
      {
        ok: false,
        erro: "Falha interna ao processar o Storage público da auditoria.",
      },
      500,
    );
  }
});