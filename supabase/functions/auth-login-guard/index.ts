import {
  createClient,
} from "https://esm.sh/@supabase/supabase-js@2.106.0";

type Registro = Record<string, unknown>;

const MENSAGEM_LOGIN =
  "Não foi possível entrar. Confira as credenciais ou aguarde alguns minutos antes de tentar novamente.";

const MENSAGEM_SEGURANCA =
  "Não foi possível concluir a verificação de segurança. Tente novamente.";

const ORIGENS_DEV = new Set([
  "http://127.0.0.1:5173",
  "http://localhost:5173",
]);

function texto(
  valor: unknown,
  limite = 1000,
) {
  if (
    typeof valor !== "string" &&
    typeof valor !== "number"
  ) {
    return "";
  }

  return String(valor)
    .replace(/\0/g, "")
    .trim()
    .slice(0, limite);
}

function emailNormalizado(
  valor: unknown,
) {
  return texto(
    valor,
    254,
  ).toLowerCase();
}

function origemPermitida(
  origin: string,
) {
  if (
    ORIGENS_DEV.has(
      origin,
    )
  ) {
    return true;
  }

  try {
    const url =
      new URL(
        origin,
      );

    if (
      url.protocol !==
      "https:"
    ) {
      return false;
    }

    const hostname =
      url.hostname
        .toLowerCase();

    return (
      hostname ===
        "safescanbrasil.com.br" ||
      hostname.endsWith(
        ".safescanbrasil.com.br",
      )
    );
  } catch {
    return false;
  }
}

function cors(
  origin: string,
) {
  return {
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
  };
}

function resposta(
  origin: string,
  status: number,
  dados: Registro,
) {
  return new Response(
    JSON.stringify(
      dados,
    ),
    {
      status,
      headers: {
        ...cors(
          origin,
        ),
        "Content-Type":
          "application/json; charset=utf-8",
      },
    },
  );
}

function respostaErro(
  origin: string,
  status: number,
  codigo: string,
  mensagem =
    MENSAGEM_LOGIN,
  metadados:
    Registro = {},
) {
  return resposta(
    origin,
    status,
    {
      ok:
        false,
      codigo,
      mensagem,
      ...metadados,
    },
  );
}

function erroInvalidCredentials(
  error: unknown,
) {
  const registro =
    (
      error &&
      typeof error === "object"
    )
      ? error as Registro
      : {};

  const codigo =
    texto(
      registro.code,
      120,
    )
      .toLowerCase();

  const mensagem =
    texto(
      registro.message,
      600,
    )
      .toLowerCase();

  return (
    codigo ===
      "invalid_credentials" ||
    mensagem.includes(
      "invalid login credentials",
    )
  );
}

function erroCaptcha(
  error: unknown,
) {
  const registro =
    (
      error &&
      typeof error === "object"
    )
      ? error as Registro
      : {};

  const codigo =
    texto(
      registro.code,
      120,
    )
      .toLowerCase();

  const mensagem =
    texto(
      registro.message,
      600,
    )
      .toLowerCase();

  return (
    codigo.includes(
      "captcha",
    ) ||
    mensagem.includes(
      "captcha",
    )
  );
}

function erroBan(
  error: unknown,
) {
  const registro =
    (
      error &&
      typeof error === "object"
    )
      ? error as Registro
      : {};

  const codigo =
    texto(
      registro.code,
      120,
    )
      .toLowerCase();

  const mensagem =
    texto(
      registro.message,
      600,
    )
      .toLowerCase();

  return (
    codigo.includes(
      "banned",
    ) ||
    mensagem.includes(
      "banned",
    )
  );
}

function primeiroRegistro(
  valor: unknown,
) {
  if (
    Array.isArray(
      valor,
    )
  ) {
    return (
      valor[0] &&
      typeof valor[0] ===
        "object"
    )
      ? valor[0] as Registro
      : {};
  }

  if (
    valor &&
    typeof valor ===
      "object"
  ) {
    return valor as Registro;
  }

  return {};
}

function bloqueioAtivo(
  blockedUntil: unknown,
) {
  const valor =
    texto(
      blockedUntil,
      100,
    );

  if (!valor) {
    return false;
  }

  const millis =
    Date.parse(
      valor,
    );

  return (
    Number.isFinite(
      millis,
    ) &&
    millis >
      Date.now()
  );
}

function numeroInteiroSeguro(
  valor: unknown,
) {
  const numero =
    Number(
      valor,
    );

  if (
    !Number.isInteger(
      numero,
    ) ||
    numero < 0
  ) {
    return 0;
  }

  return numero;
}

function minutosBloqueioPorEstado(
  estado: Registro,
) {
  const nivel =
    numeroInteiroSeguro(
      estado.blocks_today,
    );

  if (nivel === 1) {
    return 15;
  }

  if (nivel === 2) {
    return 30;
  }

  if (nivel >= 3) {
    return 60;
  }

  return 0;
}

function minutosProximoBloqueioPorEstado(
  estado: Registro,
) {
  const bloqueiosAnteriores =
    numeroInteiroSeguro(
      estado.blocks_today,
    );

  if (bloqueiosAnteriores === 0) {
    return 15;
  }

  if (bloqueiosAnteriores === 1) {
    return 30;
  }

  return 60;
}

function mensagemUltimaTentativa(
  bloqueioMinutos: number,
) {
  return (
    "Atenção: resta 1 tentativa antes do bloqueio temporário de " +
    bloqueioMinutos +
    " minutos."
  );
}

async function resolverUsuarioId(
  admin: ReturnType<
    typeof createClient
  >,
  email: string,
) {
  const {
    data,
    error,
  } =
    await admin.rpc(
      "password_auth_guard_resolver_usuario_email",
      {
        p_email:
          email,
      },
    );

  if (error) {
    throw new Error(
      "LOGIN_GUARD_USER_RESOLUTION_FAILED",
    );
  }

  const userId =
    texto(
      data,
      80,
    );

  return userId;
}

async function obterEstado(
  admin: ReturnType<
    typeof createClient
  >,
  userId: string,
) {
  const {
    data,
    error,
  } =
    await admin.rpc(
      "password_auth_guard_status",
      {
        p_user_id:
          userId,
      },
    );

  if (error) {
    throw new Error(
      "LOGIN_GUARD_STATUS_FAILED",
    );
  }

  return primeiroRegistro(
    data,
  );
}

async function registrarResultado(
  admin: ReturnType<
    typeof createClient
  >,
  userId: string,
  valid: boolean,
) {
  const {
    data,
    error,
  } =
    await admin.rpc(
      "hook_password_verification_attempt",
      {
        event: {
          user_id:
            userId,
          valid,
        },
      },
    );

  if (error) {
    throw new Error(
      "LOGIN_GUARD_STATE_UPDATE_FAILED",
    );
  }

  return primeiroRegistro(
    data,
  );
}

async function garantirBanAuth(
  admin: ReturnType<
    typeof createClient
  >,
  userId: string,
  blockedUntil: unknown,
) {
  const alvoTexto =
    texto(
      blockedUntil,
      100,
    );

  const alvo =
    Date.parse(
      alvoTexto,
    );

  if (
    !Number.isFinite(
      alvo,
    ) ||
    alvo <=
      Date.now()
  ) {
    return;
  }

  const {
    data:
      usuarioData,
    error:
      usuarioError,
  } =
    await admin.auth.admin
      .getUserById(
        userId,
      );

  if (
    usuarioError ||
    !usuarioData?.user
  ) {
    throw new Error(
      "LOGIN_GUARD_USER_READ_FAILED",
    );
  }

  const banAtual =
    Date.parse(
      texto(
        usuarioData.user
          ?.banned_until,
        100,
      ),
    );

  if (
    Number.isFinite(
      banAtual,
    ) &&
    banAtual >=
      alvo - 1000
  ) {
    return;
  }

  const segundos =
    Math.max(
      1,
      Math.ceil(
        (
          alvo -
          Date.now()
        ) /
        1000,
      ),
    );

  const {
    error:
      banError,
  } =
    await admin.auth.admin
      .updateUserById(
        userId,
        {
          ban_duration:
            String(
              segundos,
            ) +
            "s",
        },
      );

  if (banError) {
    throw new Error(
      "LOGIN_GUARD_BAN_FAILED",
    );
  }
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
      !origemPermitida(
        origin,
      )
    ) {
      return new Response(
        "Origem não autorizada.",
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
      return new Response(
        null,
        {
          status:
            204,
          headers:
            cors(
              origin,
            ),
        },
      );
    }

    if (
      req.method !==
      "POST"
    ) {
      return respostaErro(
        origin,
        405,
        "method_not_allowed",
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
        "LOGIN_GUARD_ENV_MISSING",
      );

      return respostaErro(
        origin,
        503,
        "service_unavailable",
      );
    }

    let payload:
      Registro;

    try {
      payload =
        (
          await req.json()
        ) as Registro;
    } catch {
      return respostaErro(
        origin,
        400,
        "invalid_request",
      );
    }

    const email =
      emailNormalizado(
        payload.email,
      );

    const password =
      typeof payload.password ===
        "string"
        ? payload.password
            .slice(
              0,
              1024,
            )
        : "";

    const captchaToken =
      texto(
        payload.captchaToken,
        4096,
      );

    if (
      !email ||
      !email.includes(
        "@",
      ) ||
      !password ||
      !captchaToken
    ) {
      return respostaErro(
        origin,
        400,
        "invalid_request",
      );
    }

    const admin =
      createClient(
        supabaseUrl,
        serviceRole,
        {
          auth: {
            persistSession:
              false,
            autoRefreshToken:
              false,
          },
        },
      );

    const authClient =
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
        },
      );

    try {
      const userIdAntes =
        await resolverUsuarioId(
          admin,
          email,
        );

      if (
        userIdAntes
      ) {
        const estadoAntes =
          await obterEstado(
            admin,
            userIdAntes,
          );

        if (
          bloqueioAtivo(
            estadoAntes
              .blocked_until,
          )
        ) {
          await garantirBanAuth(
            admin,
            userIdAntes,
            estadoAntes
              .blocked_until,
          );

          return respostaErro(
            origin,
            429,
            "login_blocked",
            MENSAGEM_LOGIN,
            {
              bloqueio_minutos:
                minutosBloqueioPorEstado(
                  estadoAntes,
                ),
            },
          );
        }
      }

      const {
        data:
          authData,
        error:
          authError,
      } =
        await authClient.auth
          .signInWithPassword(
            {
              email,
              password,
              options: {
                captchaToken,
              },
            },
          );

      if (authError) {
        if (
          erroCaptcha(
            authError,
          )
        ) {
          return respostaErro(
            origin,
            400,
            "captcha_invalid",
            MENSAGEM_SEGURANCA,
          );
        }

        if (
          erroBan(
            authError,
          )
        ) {
          let bloqueioMinutos =
            0;

          if (userIdAntes) {
            const estadoBan =
              await obterEstado(
                admin,
                userIdAntes,
              );

            bloqueioMinutos =
              minutosBloqueioPorEstado(
                estadoBan,
              );
          }

          return respostaErro(
            origin,
            429,
            "login_blocked",
            MENSAGEM_LOGIN,
            {
              bloqueio_minutos:
                bloqueioMinutos,
            },
          );
        }

        if (
          erroInvalidCredentials(
            authError,
          )
        ) {
          if (
            userIdAntes
          ) {
            const resultado =
              await registrarResultado(
                admin,
                userIdAntes,
                false,
              );

            const estadoDepois =
              await obterEstado(
                admin,
                userIdAntes,
              );

            const decisao =
              texto(
                resultado.decision,
                40,
              )
                .toLowerCase();

            if (
              decisao ===
              "reject"
            ) {
              if (
                bloqueioAtivo(
                  estadoDepois
                    .blocked_until,
                )
              ) {
                await garantirBanAuth(
                  admin,
                  userIdAntes,
                  estadoDepois
                    .blocked_until,
                );
              }

              return respostaErro(
                origin,
                429,
                "login_blocked",
                MENSAGEM_LOGIN,
                {
                  bloqueio_minutos:
                    minutosBloqueioPorEstado(
                      estadoDepois,
                    ),
                },
              );
            }

            const falhas =
              numeroInteiroSeguro(
                estadoDepois
                  .failure_count,
              );

            if (falhas === 4) {
              const proximoBloqueioMinutos =
                minutosProximoBloqueioPorEstado(
                  estadoDepois,
                );

              return respostaErro(
                origin,
                401,
                "login_last_attempt",
                mensagemUltimaTentativa(
                  proximoBloqueioMinutos,
                ),
                {
                  tentativas_restantes:
                    1,

                  bloqueio_minutos:
                    proximoBloqueioMinutos,
                },
              );
            }
          }

          return respostaErro(
            origin,
            401,
            "login_invalid",
          );
        }

        console.error(
          "LOGIN_GUARD_AUTH_ERROR",
          {
            code:
              texto(
                (
                  authError as unknown as
                    Registro
                ).code,
                120,
              ),
          },
        );

        return respostaErro(
          origin,
          503,
          "service_unavailable",
        );
      }

      const userId =
        texto(
          authData?.user?.id,
          80,
        );

      const accessToken =
        texto(
          authData
            ?.session
            ?.access_token,
          12000,
        );

      const refreshToken =
        texto(
          authData
            ?.session
            ?.refresh_token,
          12000,
        );

      if (
        !userId ||
        !accessToken ||
        !refreshToken
      ) {
        return respostaErro(
          origin,
          503,
          "session_unavailable",
        );
      }

      await registrarResultado(
        admin,
        userId,
        true,
      );

      return resposta(
        origin,
        200,
        {
          ok:
            true,

          session: {
            access_token:
              accessToken,

            refresh_token:
              refreshToken,
          },
        },
      );
    } catch (
      error
    ) {
      console.error(
        "LOGIN_GUARD_INTERNAL_ERROR",
        {
          code:
            texto(
              (
                error as unknown as
                  Registro
              )?.message,
              160,
            ),
        },
      );

      return respostaErro(
        origin,
        503,
        "service_unavailable",
      );
    }
  },
);
