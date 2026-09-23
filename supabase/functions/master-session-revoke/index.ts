import {
  createClient,
} from "https://esm.sh/@supabase/supabase-js@2.106.0";

const ORIGENS = new Set([
  "http://127.0.0.1:5173",
  "http://localhost:5173",
  "https://admin.safescanbrasil.com.br",
]);

type Escopo =
  | "others"
  | "global";

function corsHeaders(
  origin: string,
) {
  return {
    "Access-Control-Allow-Origin":
      origin,

    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",

    "Access-Control-Allow-Methods":
      "POST, OPTIONS",

    "Content-Type":
      "application/json; charset=utf-8",

    "Cache-Control":
      "no-store",

    "Vary":
      "Origin",
  };
}

function resposta(
  origin: string,
  status: number,
  body: Record<string, unknown>,
) {
  return new Response(
    JSON.stringify(
      body,
    ),
    {
      status,
      headers:
        corsHeaders(
          origin,
        ),
    },
  );
}

function decodificarJwt(
  token: string,
) {
  const partes =
    token.split(
      ".",
    );

  if (
    partes.length !==
    3
  ) {
    throw new Error(
      "JWT_INVALIDO",
    );
  }

  const payload =
    partes[1]
      .replace(
        /-/g,
        "+",
      )
      .replace(
        /_/g,
        "/",
      );

  const preenchido =
    payload +
    "=".repeat(
      (
        4 -
        (
          payload.length %
          4
        )
      ) %
      4,
    );

  return JSON.parse(
    atob(
      preenchido,
    ),
  );
}

Deno.serve(
  async (
    req,
  ) => {
    const origin =
      req.headers.get(
        "Origin",
      ) || "";

    if (
      !ORIGENS.has(
        origin,
      )
    ) {
      return new Response(
        "Origem nao autorizada.",
        {
          status:
            403,
        },
      );
    }

    if (
      req.method ===
      "OPTIONS"
    ) {
      return resposta(
        origin,
        200,
        {
          ok:
            true,
        },
      );
    }

    if (
      req.method !==
      "POST"
    ) {
      return resposta(
        origin,
        405,
        {
          ok:
            false,
          error:
            "METHOD_NOT_ALLOWED",
        },
      );
    }

    const authorization =
      req.headers.get(
        "Authorization",
      ) || "";

    if (
      !authorization.startsWith(
        "Bearer ",
      )
    ) {
      return resposta(
        origin,
        401,
        {
          ok:
            false,
          error:
            "AUTH_REQUIRED",
        },
      );
    }

    const accessToken =
      authorization
        .slice(
          "Bearer ".length,
        )
        .trim();

    let scope:
      Escopo;

    try {
      const body =
        await req.json();

      const recebido =
        String(
          body?.scope ||
          "",
        )
          .trim()
          .toLowerCase();

      if (
        recebido !==
          "others" &&
        recebido !==
          "global"
      ) {
        throw new Error(
          "INVALID_SCOPE",
        );
      }

      scope =
        recebido;
    }
    catch {
      return resposta(
        origin,
        400,
        {
          ok:
            false,
          error:
            "INVALID_SCOPE",
        },
      );
    }

    const supabaseUrl =
      Deno.env.get(
        "SUPABASE_URL",
      ) || "";

    const anonKey =
      Deno.env.get(
        "SUPABASE_ANON_KEY",
      ) || "";

    const serviceRoleKey =
      Deno.env.get(
        "SUPABASE_SERVICE_ROLE_KEY",
      ) || "";

    if (
      !supabaseUrl ||
      !anonKey ||
      !serviceRoleKey
    ) {
      console.error(
        "MASTER_SESSION_ENV_MISSING",
      );

      return resposta(
        origin,
        500,
        {
          ok:
            false,
          error:
            "SERVER_CONFIGURATION",
        },
      );
    }

    const caller =
      createClient(
        supabaseUrl,
        anonKey,
        {
          auth: {
            persistSession:
              false,
            autoRefreshToken:
              false,
            detectSessionInUrl:
              false,
          },

          global: {
            headers: {
              Authorization:
                `Bearer ${accessToken}`,
            },
          },
        },
      );

    const admin =
      createClient(
        supabaseUrl,
        serviceRoleKey,
        {
          auth: {
            persistSession:
              false,
            autoRefreshToken:
              false,
            detectSessionInUrl:
              false,
          },
        },
      );

    const {
      data:
        userData,
      error:
        userError,
    } =
      await caller.auth
        .getUser(
          accessToken,
        );

    if (
      userError ||
      !userData?.user?.id
    ) {
      return resposta(
        origin,
        401,
        {
          ok:
            false,
          error:
            "INVALID_SESSION",
        },
      );
    }

    let payload:
      Record<string, unknown>;

    try {
      payload =
        decodificarJwt(
          accessToken,
        );
    }
    catch {
      return resposta(
        origin,
        401,
        {
          ok:
            false,
          error:
            "INVALID_SESSION",
        },
      );
    }

    const sessionId =
      String(
        payload
          ?.session_id ||
        "",
      );

    const aal =
      String(
        payload
          ?.aal ||
        "",
      );

    const sub =
      String(
        payload
          ?.sub ||
        "",
      );

    if (
      sub !==
        userData.user.id ||
      !sessionId ||
      aal !==
        "aal2"
    ) {
      return resposta(
        origin,
        403,
        {
          ok:
            false,
          error:
            "AAL2_REQUIRED",
        },
      );
    }

    const {
      data:
        adminGlobal,
      error:
        adminGlobalError,
    } =
      await caller.rpc(
        "usuario_admin_global",
      );

    if (
      adminGlobalError ||
      adminGlobal !==
        true
    ) {
      return resposta(
        origin,
        403,
        {
          ok:
            false,
          error:
            "MASTER_ACCESS_REQUIRED",
        },
      );
    }

    const {
      data:
        estadoAnterior,
      error:
        estadoAnteriorError,
    } =
      await admin
        .from(
          "conta_mestre_seguranca",
        )
        .select(
          "user_id,sessoes_revogadas_em,sessao_preservada_id",
        )
        .eq(
          "user_id",
          userData.user.id,
        )
        .maybeSingle();

    if (
      estadoAnteriorError ||
      !estadoAnterior
    ) {
      console.error(
        "MASTER_SESSION_SECURITY_ROW_MISSING",
        estadoAnteriorError?.message ||
          "",
      );

      return resposta(
        origin,
        500,
        {
          ok:
            false,
          error:
            "SECURITY_STATE_UNAVAILABLE",
        },
      );
    }

    const cutoff =
      new Date()
        .toISOString();

    const sessaoPreservada =
      scope ===
        "others"
        ? sessionId
        : null;

    const {
      error:
        cutoffError,
    } =
      await admin
        .from(
          "conta_mestre_seguranca",
        )
        .update({
          sessoes_revogadas_em:
            cutoff,

          sessao_preservada_id:
            sessaoPreservada,

          atualizado_em:
            cutoff,
        })
        .eq(
          "user_id",
          userData.user.id,
        );

    if (cutoffError) {
      console.error(
        "MASTER_SESSION_CUTOFF_FAILED",
        cutoffError.message,
      );

      return resposta(
        origin,
        500,
        {
          ok:
            false,
          error:
            "CUTOFF_FAILED",
        },
      );
    }

    const logoutUrl =
      new URL(
        "/auth/v1/logout",
        supabaseUrl,
      );

    logoutUrl.searchParams.set(
      "scope",
      scope,
    );

    const logoutResponse =
      await fetch(
        logoutUrl,
        {
          method:
            "POST",

          headers: {
            Authorization:
              `Bearer ${accessToken}`,

            apikey:
              anonKey,

            "Content-Type":
              "application/json",
          },
        },
      );

    if (
      !logoutResponse.ok
    ) {
      console.error(
        "MASTER_SESSION_AUTH_REVOKE_FAILED",
        logoutResponse.status,
      );

      const {
        error:
          rollbackError,
      } =
        await admin
          .from(
            "conta_mestre_seguranca",
          )
          .update({
            sessoes_revogadas_em:
              estadoAnterior
                .sessoes_revogadas_em,

            sessao_preservada_id:
              estadoAnterior
                .sessao_preservada_id,

            atualizado_em:
              new Date()
                .toISOString(),
          })
          .eq(
            "user_id",
            userData.user.id,
          );

      if (rollbackError) {
        console.error(
          "MASTER_SESSION_ROLLBACK_FAILED",
          rollbackError.message,
        );
      }

      return resposta(
        origin,
        502,
        {
          ok:
            false,
          error:
            "AUTH_REVOKE_FAILED",
        },
      );
    }

    return resposta(
      origin,
      200,
      {
        ok:
          true,

        scope,

        currentSessionPreserved:
          scope ===
          "others",
      },
    );
  },
);
