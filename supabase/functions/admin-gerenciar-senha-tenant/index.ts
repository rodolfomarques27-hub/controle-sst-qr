import {
  createClient,
} from "https://esm.sh/@supabase/supabase-js@2.106.0";

import {
  resolverTransportadorEmailParaEnvio,
  type TransportadorEmailResolvido,
} from "../_shared/emailProvedorResolver.ts";

type Registro = Record<string, unknown>;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":
    "POST, OPTIONS",
};

class ErroHttp extends Error {
  status: number;
  codigo: string;
  publico: boolean;

  constructor(
    status: number,
    codigo: string,
    mensagem: string,
    publico = status < 500,
  ) {
    super(mensagem);

    this.name = "ErroHttp";
    this.status = status;
    this.codigo = codigo;
    this.publico = publico;
  }
}

function criarClienteSupabase(
  supabaseUrl: string,
  chave: string,
  authorization = "",
) {
  return createClient(
    supabaseUrl,
    chave,
    {
      ...(authorization
        ? {
          global: {
            headers: {
              Authorization: authorization,
            },
          },
        }
        : {}),
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}

type ClienteSupabase =
  ReturnType<
    typeof criarClienteSupabase
  >;

function criarClienteRpcEmail(
  adminClient: ClienteSupabase,
): Parameters<
  typeof resolverTransportadorEmailParaEnvio
>[0] {
  return {
    rpc: async (
      nome,
      parametros,
    ) => {
      const resultado =
        await adminClient.rpc(
          nome,
          parametros,
        );

      return {
        data: resultado.data,
        error: resultado.error,
      };
    },
  };
}

function resposta(
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
        ...CORS,
        "Content-Type":
          "application/json; charset=utf-8",
        "Cache-Control":
          "no-store",
      },
    },
  );
}

function objeto(
  valor: unknown,
): Registro {
  if (
    !valor ||
    typeof valor !== "object" ||
    Array.isArray(valor)
  ) {
    return {};
  }

  return valor as Registro;
}

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

  return String(
    valor,
  )
    .replace(
      /\0/g,
      "",
    )
    .trim()
    .slice(
      0,
      limite,
    );
}

function email(
  valor: unknown,
) {
  return texto(
    valor,
    254,
  ).toLowerCase();
}

function emailValido(
  valor: string,
) {
  return Boolean(
    valor &&
    valor.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(
      valor,
    )
  );
}

function uuidValido(
  valor: string,
) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    .test(
      valor,
    );
}

function senhaTemporariaValida(
  valor: string,
) {
  return Boolean(
    valor.length >= 12 &&
    /[a-z]/.test(valor) &&
    /[A-Z]/.test(valor) &&
    /[0-9]/.test(valor) &&
    /[^A-Za-z0-9]/.test(valor)
  );
}

function htmlSeguro(
  valor: unknown,
) {
  return texto(
    valor,
    10000,
  )
    .replace(
      /&/g,
      "&amp;",
    )
    .replace(
      /</g,
      "&lt;",
    )
    .replace(
      />/g,
      "&gt;",
    )
    .replace(
      /"/g,
      "&quot;",
    )
    .replace(
      /'/g,
      "&#039;",
    );
}

function nomeCabecalho(
  valor: unknown,
) {
  return texto(
    valor,
    120,
  )
    .replace(
      /[\r\n]+/g,
      " ",
    )
    .replace(
      /"/g,
      "'",
    );
}

/*
 * Mantém o mesmo contrato de separação já empregado
 * pelo primeiro acesso do tenant.
 */
async function usuarioEhGlobal(
  adminClient: ClienteSupabase,
  userId: string,
) {
  const [
    permissaoResultado,
    autorizacaoResultado,
    authResultado,
  ] = await Promise.all([
    adminClient
      .from(
        "usuarios_permissoes_sistema",
      )
      .select(
        "acesso_global",
      )
      .eq(
        "user_id",
        userId,
      )
      .eq(
        "acesso_global",
        true,
      )
      .limit(
        1,
      ),

    adminClient
      .from(
        "auditoria_usuarios_autorizados",
      )
      .select(
        "acesso_global,perfil,ativo",
      )
      .eq(
        "user_id",
        userId,
      )
      .eq(
        "ativo",
        true,
      )
      .limit(
        10,
      ),

    adminClient
      .auth
      .admin
      .getUserById(
        userId,
      ),
  ]);

  if (
    permissaoResultado.error ||
    autorizacaoResultado.error ||
    authResultado.error
  ) {
    throw new ErroHttp(
      500,
      "VALIDACAO_GLOBAL_INDISPONIVEL",
      "Não foi possível validar a separação entre cliente e Conta Mestre.",
      false,
    );
  }

  if (
    (
      permissaoResultado.data ??
      []
    ).length > 0
  ) {
    return true;
  }

  const autorizadoComoGlobal =
    (
      autorizacaoResultado.data ??
      []
    ).some(
      (
        linha: Registro,
      ) => {
        const perfil =
          texto(
            linha.perfil,
            60,
          ).toLowerCase();

        return (
          linha.acesso_global === true ||
          perfil === "admin" ||
          perfil === "administrador"
        );
      },
    );

  if (
    autorizadoComoGlobal
  ) {
    return true;
  }

  const appMetadata =
    objeto(
      authResultado
        .data
        ?.user
        ?.app_metadata,
    );

  return (
    appMetadata.acesso_global === true ||
    appMetadata.admin_global === true ||
    appMetadata.conta_mestre === true
  );
}

async function registrarAuditoriaSolicitacao(
  adminClient: ClienteSupabase,
  {
    executorId,
    executorEmail,
    tenantId,
    targetUserId,
    membershipId,
    acao,
  }: {
    executorId: string;
    executorEmail: string | null;
    tenantId: string;
    targetUserId: string;
    membershipId: string;
    acao: string;
  },
) {
  const {
    error,
  } =
    await adminClient
      .from(
        "auditoria_sistema",
      )
      .insert({
        usuario_id:
          executorId,

        usuario_email:
          executorEmail,

        acao,

        tabela:
          "tenant_memberships",

        registro_id:
          membershipId,

        descricao:
          "Gerenciamento administrativo de senha do tenant.",

        dados: {
          tenantId,
          targetUserId,
          membershipId,
          solicitadoEm:
            new Date()
              .toISOString(),
        },
      });

  if (
    error
  ) {
    throw new ErroHttp(
      500,
      "AUDITORIA_NAO_REGISTRADA",
      "Não foi possível registrar a auditoria da operação.",
      false,
    );
  }
}

async function carregarContextoAlvo(
  adminClient: ClienteSupabase,
  tenantId: string,
  userId: string,
) {
  const {
    data: tenant,
    error: tenantError,
  } =
    await adminClient
      .from(
        "tenants",
      )
      .select(
        "id,slug,status",
      )
      .eq(
        "id",
        tenantId,
      )
      .maybeSingle();

  if (
    tenantError ||
    !tenant
  ) {
    throw new ErroHttp(
      404,
      "TENANT_NAO_ENCONTRADO",
      "Cliente não localizado.",
    );
  }

  const tenantSlug =
    texto(
      tenant.slug,
      100,
    ).toLowerCase();

  const tenantStatus =
    texto(
      tenant.status,
      30,
    ).toLowerCase();

  if (
    tenantStatus !== "ativo" ||
    !tenantSlug
  ) {
    throw new ErroHttp(
      409,
      "TENANT_INATIVO",
      "O cliente precisa estar ativo para gerenciar a senha.",
    );
  }

  const {
    data: membership,
    error: membershipError,
  } =
    await adminClient
      .from(
        "tenant_memberships",
      )
      .select(
        "id,user_id,papel,status",
      )
      .eq(
        "tenant_id",
        tenantId,
      )
      .eq(
        "user_id",
        userId,
      )
      .maybeSingle();

  if (
    membershipError ||
    !membership
  ) {
    throw new ErroHttp(
      404,
      "MEMBERSHIP_NAO_ENCONTRADA",
      "Membership administrativa não localizada.",
    );
  }

  const papel =
    texto(
      membership.papel,
      60,
    ).toLowerCase();

  const status =
    texto(
      membership.status,
      40,
    ).toLowerCase();

  if (
    (
      papel !== "admin" &&
      papel !== "administrador"
    ) ||
    status !== "ativo"
  ) {
    throw new ErroHttp(
      409,
      "MEMBERSHIP_INVALIDA",
      "A operação exige membership administrativa ativa.",
    );
  }

  const membershipId =
    texto(
      membership.id,
      80,
    );

  if (
    !uuidValido(
      membershipId,
    )
  ) {
    throw new ErroHttp(
      409,
      "MEMBERSHIP_INVALIDA",
      "Identificador da membership está inválido.",
    );
  }

  if (
    await usuarioEhGlobal(
      adminClient,
      userId,
    )
  ) {
    throw new ErroHttp(
      403,
      "ALVO_GLOBAL_BLOQUEADO",
      "Conta Mestre ou usuário global não pode ser alvo desta operação.",
    );
  }

  const {
    data: authData,
    error: authError,
  } =
    await adminClient
      .auth
      .admin
      .getUserById(
        userId,
      );

  const targetUser =
    authData
      ?.user;

  const targetEmail =
    email(
      targetUser
        ?.email,
    );

  if (
    authError ||
    !targetUser?.id ||
    !emailValido(
      targetEmail,
    )
  ) {
    throw new ErroHttp(
      409,
      "AUTH_INVALIDO",
      "Usuário Auth do administrador não está válido.",
    );
  }

  return {
    tenantSlug,
    membershipId,
    targetUser,
    targetEmail,
  };
}

async function carregarHostnameTenant(
  adminClient: ClienteSupabase,
  tenantId: string,
) {
  const {
    data,
    error,
  } =
    await adminClient
      .from(
        "tenant_domains",
      )
      .select(
        "hostname,status,verificado_em",
      )
      .eq(
        "tenant_id",
        tenantId,
      )
      .eq(
        "principal",
        true,
      )
      .maybeSingle();

  if (
    error ||
    !data
  ) {
    throw new ErroHttp(
      409,
      "DOMINIO_NAO_PRONTO",
      "O domínio principal do cliente não está disponível.",
    );
  }

  const status =
    texto(
      data.status,
      30,
    ).toLowerCase();

  const hostname =
    texto(
      data.hostname,
      253,
    ).toLowerCase();

  if (
    status !== "ativo" ||
    !data.verificado_em ||
    !hostname
  ) {
    throw new ErroHttp(
      409,
      "DOMINIO_NAO_PRONTO",
      "O domínio principal do cliente ainda não está ativo e verificado.",
    );
  }

  if (
    !hostname.endsWith(
      ".safescanbrasil.com.br",
    )
  ) {
    throw new ErroHttp(
      409,
      "DOMINIO_INVALIDO",
      "O domínio principal não pertence à infraestrutura SafeScan.",
    );
  }

  return hostname;
}

async function enviarRedefinicao({
  adminClient,
  authUser,
  tenantId,
  userId,
}: {
  adminClient: ClienteSupabase;
  authUser: {
    id: string;
    email?: string | null;
  };
  tenantId: string;
  userId: string;
}) {
  const contexto =
    await carregarContextoAlvo(
      adminClient,
      tenantId,
      userId,
    );

  const hostname =
    await carregarHostnameTenant(
      adminClient,
      tenantId,
    );

  const urlBaseTenant =
    "https://" +
    hostname;

  /*
   * Auditoria registra somente executor/alvo/tenant/horário.
   * Link Auth, token e credenciais não entram no registro.
   */
  await registrarAuditoriaSolicitacao(
    adminClient,
    {
      executorId:
        authUser.id,

      executorEmail:
        email(
          authUser.email,
        ) || null,

      tenantId,

      targetUserId:
        userId,

      membershipId:
        contexto.membershipId,

      acao:
        "TENANT_PASSWORD_RECOVERY_REQUESTED",
    },
  );

  /*
   * O Auth retorna ao domínio público SafeScan.
   * recovery_host identifica exclusivamente o ambiente
   * para o redirecionamento após a nova senha.
   */
  const redirectTo =
    urlBaseTenant +
    "?password_recovery=1" +
    "&tenant=" +
    encodeURIComponent(
      contexto.tenantSlug,
    ) +
    "&recovery_host=" +
    encodeURIComponent(
      hostname,
    );

  const {
    data: linkData,
    error: linkError,
  } =
    await adminClient
      .auth
      .admin
      .generateLink({
        type:
          "recovery",

        email:
          contexto.targetEmail,

        options: {
          redirectTo,
        },
      });

  const actionUrl =
    texto(
      linkData
        ?.properties
        ?.action_link,
      5000,
    );

  if (
    linkError ||
    !actionUrl
  ) {
    throw new ErroHttp(
      500,
      "LINK_NAO_GERADO",
      "Não foi possível gerar o link seguro de redefinição.",
      false,
    );
  }

  /*
   * Anti-scanner:
   * o action_link Auth fica somente no fragmento.
   * O fragmento não é enviado ao servidor HTTP.
   */
  const linkSeguro =
    urlBaseTenant +
    "?password_recovery_confirmar=1" +
    "&tenant=" +
    encodeURIComponent(
      contexto.tenantSlug,
    ) +
    "&recovery_host=" +
    encodeURIComponent(
      hostname,
    ) +
    "#confirmation_url=" +
    encodeURIComponent(
      actionUrl,
    );

  let provedor:
    TransportadorEmailResolvido;

  try {
    provedor =
      await resolverTransportadorEmailParaEnvio(
        criarClienteRpcEmail(
          adminClient,
        ),
        {
          canal:
            "PLATAFORMA",

          nomeRemetenteFallback:
            "SafeScan Brasil",
        },
      );
  }
  catch {
    throw new ErroHttp(
      502,
      "PROVEDOR_INDISPONIVEL",
      "O serviço institucional de e-mail está indisponível.",
    );
  }

  const assunto =
    "SafeScan Brasil — redefinição de senha";

  const textoEmail = [
    "Olá,",
    "",
    "Foi solicitada uma redefinição de senha para o seu acesso ao SafeScan Brasil.",
    "",
    "Use o link seguro abaixo para continuar:",
    linkSeguro,
    "",
    "O link exigirá uma confirmação adicional antes de abrir a autenticação.",
    "",
    "Se você não esperava esta solicitação, ignore esta mensagem.",
  ].join(
    "\n",
  );

  const htmlEmail = `
<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:24px;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width:600px;background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;">
            <tr>
              <td style="padding:28px;">
                <div style="font-size:12px;font-weight:800;letter-spacing:.08em;color:#059669;text-transform:uppercase;">
                  SafeScan Brasil
                </div>

                <h1 style="font-size:22px;margin:10px 0 14px;color:#0f172a;">
                  Redefinição de senha
                </h1>

                <p style="font-size:14px;line-height:1.6;color:#475569;">
                  Foi solicitada uma redefinição de senha para o seu acesso.
                </p>

                <p style="margin:24px 0;">
                  <a
                    href="${htmlSeguro(linkSeguro)}"
                    style="display:inline-block;padding:13px 20px;border-radius:12px;background:#059669;color:#ffffff;text-decoration:none;font-weight:800;"
                  >
                    Redefinir senha
                  </a>
                </p>

                <p style="font-size:12px;line-height:1.6;color:#64748b;">
                  Antes da alteração da senha, você verá uma confirmação adicional de segurança.
                </p>

                <p style="font-size:12px;line-height:1.6;color:#64748b;">
                  Se você não esperava esta solicitação, ignore esta mensagem.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`.trim();

  try {
    await provedor
      .transportador
      .sendMail({
        from:
          `"${nomeCabecalho(
            provedor.remetenteNomePadrao ||
            "SafeScan Brasil",
          )}" <${provedor.remetenteEmail}>`,

        to:
          contexto.targetEmail,

        subject:
          assunto,

        text:
          textoEmail,

        html:
          htmlEmail,

        ...(provedor.responderParaPadrao
          ? {
            replyTo:
              provedor.responderParaPadrao,
          }
          : {}),
      });
  }
  catch {
    throw new ErroHttp(
      502,
      "ENVIO_RECUSADO",
      "Não foi possível entregar o e-mail de redefinição.",
    );
  }
  finally {
    try {
      provedor
        .transportador
        ?.close?.();
    }
    catch {
      // Fechamento best-effort.
    }
  }

  return resposta(
    200,
    {
      ok:
        true,

      mensagem:
        "Link de redefinição enviado para o e-mail atual do administrador.",
    },
  );
}

async function definirSenhaTemporaria({
  adminClient,
  authUser,
  tenantId,
  userId,
  senhaTemporaria,
}: {
  adminClient: ClienteSupabase;
  authUser: {
    id: string;
    email?: string | null;
  };
  tenantId: string;
  userId: string;
  senhaTemporaria: string;
}) {
  if (
    !senhaTemporariaValida(
      senhaTemporaria,
    )
  ) {
    throw new ErroHttp(
      400,
      "SENHA_TEMPORARIA_INVALIDA",
      "A senha temporária deve possuir pelo menos 12 caracteres e incluir maiúscula, minúscula, número e caractere especial.",
    );
  }

  const contexto =
    await carregarContextoAlvo(
      adminClient,
      tenantId,
      userId,
    );

  await registrarAuditoriaSolicitacao(
    adminClient,
    {
      executorId:
        authUser.id,

      executorEmail:
        email(
          authUser.email,
        ) || null,

      tenantId,

      targetUserId:
        userId,

      membershipId:
        contexto.membershipId,

      acao:
        "TENANT_TEMP_PASSWORD_REQUESTED",
    },
  );

  const metadataAnterior =
    objeto(
      contexto
        .targetUser
        .app_metadata,
    );

  const {
    error: updateError,
  } =
    await adminClient
      .auth
      .admin
      .updateUserById(
        userId,
        {
          password:
            senhaTemporaria,

          app_metadata: {
            ...metadataAnterior,

            precisa_trocar_senha:
              true,
          },
        },
      );

  if (
    updateError
  ) {
    throw new ErroHttp(
      500,
      "AUTH_NAO_ATUALIZADO",
      "Não foi possível definir a senha temporária.",
      false,
    );
  }

  const {
    error: marcarError,
  } =
    await adminClient.rpc(
      "admin_marcar_login_app_criado_sistema",
      {
        p_email:
          contexto.targetEmail,

        p_user_id:
          userId,

        p_precisa_trocar_senha:
          true,
      },
    );

  /*
   * A senha Auth pode já ter sido alterada neste ponto.
   * Por isso não devemos repetir automaticamente a operação
   * caso a sincronização de compatibilidade falhe.
   */
  if (
    marcarError
  ) {
    return resposta(
      500,
      {
        ok:
          false,

        parcial:
          true,

        codigo:
          "FLAG_TROCA_OBRIGATORIA_NAO_ATUALIZADA",

        erro:
          "A credencial foi atualizada, mas a sincronização de troca obrigatória não foi concluída. Verifique o estado antes de repetir a operação.",
      },
    );
  }

  return resposta(
    200,
    {
      ok:
        true,

      mensagem:
        "Senha temporária definida. O administrador deverá criar uma nova senha no próximo acesso.",
    },
  );
}

Deno.serve(
  async (
    req,
  ) => {
    if (
      req.method === "OPTIONS"
    ) {
      return new Response(
        "ok",
        {
          headers:
            CORS,
        },
      );
    }

    if (
      req.method !== "POST"
    ) {
      return resposta(
        405,
        {
          ok:
            false,

          erro:
            "Método não permitido.",
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
      return resposta(
        500,
        {
          ok:
            false,

          erro:
            "Configuração interna indisponível.",
        },
      );
    }

    const authorization =
      req.headers.get(
        "Authorization",
      ) || "";

    if (
      !authorization
        .toLowerCase()
        .startsWith(
          "bearer ",
        )
    ) {
      return resposta(
        401,
        {
          ok:
            false,

          erro:
            "Sessão autenticada obrigatória.",
        },
      );
    }

    const userClient =
      criarClienteSupabase(
        supabaseUrl,
        anonKey,
        authorization,
      );

    const adminClient =
      criarClienteSupabase(
        supabaseUrl,
        serviceRoleKey,
      );

    const {
      data: authData,
      error: authError,
    } =
      await userClient.auth
        .getUser();

    if (
      authError ||
      !authData?.user?.id
    ) {
      return resposta(
        401,
        {
          ok:
            false,

          erro:
            "Sessão inválida.",
        },
      );
    }

    const {
      data: adminGlobal,
      error: adminGlobalError,
    } =
      await userClient.rpc(
        "usuario_admin_global",
      );

    if (
      adminGlobalError ||
      adminGlobal !== true
    ) {
      return resposta(
        403,
        {
          ok:
            false,

          erro:
            "Apenas a Conta Mestre pode gerenciar a senha do administrador do cliente.",
        },
      );
    }

    let body:
      Registro;

    try {
      body =
        objeto(
          await req.json(),
        );
    }
    catch {
      return resposta(
        400,
        {
          ok:
            false,

          erro:
            "Payload inválido.",
        },
      );
    }

    const modo =
      texto(
        body.modo,
        60,
      ).toLowerCase();

    const tenantId =
      texto(
        body.tenantId ??
        body.tenant_id,
        80,
      );

    const userId =
      texto(
        body.userId ??
        body.user_id,
        80,
      );

    if (
      !uuidValido(
        tenantId,
      ) ||
      !uuidValido(
        userId,
      )
    ) {
      return resposta(
        400,
        {
          ok:
            false,

          erro:
            "Cliente ou administrador inválido.",
        },
      );
    }

    try {
      if (
        modo ===
        "enviar_redefinicao"
      ) {
        return await enviarRedefinicao({
          adminClient,
          authUser:
            authData.user,
          tenantId,
          userId,
        });
      }

      if (
        modo ===
        "definir_senha_temporaria"
      ) {
        const senhaTemporaria =
          String(
            body.senhaTemporaria ??
            body.senha_temporaria ??
            ""
          );

        return await definirSenhaTemporaria({
          adminClient,
          authUser:
            authData.user,
          tenantId,
          userId,
          senhaTemporaria,
        });
      }

      throw new ErroHttp(
        400,
        "MODO_INVALIDO",
        "Operação de senha inválida.",
      );
    }
    catch (
      erro
    ) {
      const tratado =
        erro instanceof ErroHttp
          ? erro
          : new ErroHttp(
            500,
            "ERRO_INTERNO",
            "Falha interna no gerenciamento de senha.",
            false,
          );

      return resposta(
        tratado.status,
        {
          ok:
            false,

          codigo:
            tratado.codigo,

          erro:
            tratado.publico
              ? tratado.message
              : "Não foi possível concluir a operação de senha.",
        },
      );
    }
  },
);