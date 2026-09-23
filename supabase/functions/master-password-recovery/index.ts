import {
  createClient,
} from "https://esm.sh/@supabase/supabase-js@2.106.0";

const MENSAGEM =
  "Se o e-mail estiver cadastrado, enviaremos um link seguro para redefinir a senha. Verifique também a caixa de spam.";

const REDIRECTS: Record<string, string> = {
  "http://127.0.0.1:5173":
    "http://127.0.0.1:5173/admin",

  "http://localhost:5173":
    "http://localhost:5173/admin",

  "https://admin.safescanbrasil.com.br":
    "https://admin.safescanbrasil.com.br/admin",
};

function resposta(
  origin: string,
  status = 200,
) {
  return new Response(
    JSON.stringify({
      ok: true,
      mensagem: MENSAGEM,
    }),
    {
      status,
      headers: {
        "Content-Type":
          "application/json; charset=utf-8",

        "Access-Control-Allow-Origin":
          origin,

        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type",

        "Access-Control-Allow-Methods":
          "POST, OPTIONS",

        "Cache-Control":
          "no-store",

        "Vary":
          "Origin",
      },
    },
  );
}

Deno.serve(async (req) => {
  const origin =
    req.headers.get("Origin") || "";

  const redirectTo =
    REDIRECTS[origin];

  if (!redirectTo) {
    return new Response(
      "Origem nao autorizada.",
      {
        status: 403,
      },
    );
  }

  if (req.method === "OPTIONS") {
    return resposta(origin);
  }

  if (req.method !== "POST") {
    return new Response(
      "Metodo nao permitido.",
      {
        status: 405,
      },
    );
  }

  let email = "";

  try {
    const body =
      await req.json();

    email =
      String(
        body?.email || "",
      )
        .trim()
        .toLowerCase();
  } catch {
    return resposta(origin);
  }

  if (
    !email ||
    !email.includes("@")
  ) {
    return resposta(origin);
  }

  const supabaseUrl =
    Deno.env.get(
      "SUPABASE_URL",
    ) || "";

  const anonKey =
    Deno.env.get(
      "SUPABASE_ANON_KEY",
    ) || "";

  const serviceRole =
    Deno.env.get(
      "SUPABASE_SERVICE_ROLE_KEY",
    ) || "";

  if (
    !supabaseUrl ||
    !anonKey ||
    !serviceRole
  ) {
    console.error(
      "MASTER_RECOVERY_ENV_MISSING",
    );

    return resposta(origin);
  }

  const admin =
    createClient(
      supabaseUrl,
      serviceRole,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );

  const {
    data: permissoes,
    error: permissoesError,
  } =
    await admin
      .from(
        "usuarios_permissoes_sistema",
      )
      .select(
        "user_id",
      )
      .eq(
        "email",
        email,
      )
      .eq(
        "ativo",
        true,
      )
      .eq(
        "bloqueado",
        false,
      )
      .eq(
        "excluido",
        false,
      )
      .eq(
        "acesso_global",
        true,
      )
      .is(
        "empresa_id",
        null,
      )
      .limit(1);

  if (
    permissoesError ||
    !permissoes?.length
  ) {
    return resposta(origin);
  }

  const userId =
    permissoes[0].user_id;

  const {
    data: autorizacoes,
    error: autorizacoesError,
  } =
    await admin
      .from(
        "auditoria_usuarios_autorizados",
      )
      .select(
        "user_id",
      )
      .eq(
        "user_id",
        userId,
      )
      .eq(
        "ativo",
        true,
      )
      .eq(
        "acesso_global",
        true,
      )
      .is(
        "empresa_id",
        null,
      )
      .limit(1);

  if (
    autorizacoesError ||
    !autorizacoes?.length
  ) {
    return resposta(origin);
  }

  const auth =
    createClient(
      supabaseUrl,
      anonKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );

  const {
    error: resetError,
  } =
    await auth.auth
      .resetPasswordForEmail(
        email,
        {
          redirectTo,
        },
      );

  if (resetError) {
    console.error(
      "MASTER_RECOVERY_SEND_FAILED",
      resetError.message,
    );
  }

  return resposta(origin);
});