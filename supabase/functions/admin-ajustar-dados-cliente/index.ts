import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

type JsonRecord = Record<string, unknown>;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

class HttpError extends Error {
  status: number;
  code: string;

  constructor(
    status: number,
    code: string,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
  }
}

function response(
  status: number,
  body: JsonRecord,
) {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        ...CORS,
        "Content-Type": "application/json; charset=utf-8",
      },
    },
  );
}

function record(
  value: unknown,
): JsonRecord {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return {};
  }

  return value as JsonRecord;
}

function text(
  value: unknown,
  maxLength = 1000,
) {
  if (
    typeof value !== "string" &&
    typeof value !== "number"
  ) {
    return "";
  }

  return String(value)
    .replace(/\0/g, "")
    .trim()
    .slice(0, maxLength);
}

function normalizedEmail(
  value: unknown,
) {
  return text(
    value,
    254,
  ).toLowerCase();
}

function validEmail(
  value: string,
) {
  return (
    value.length >= 3 &&
    value.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(value)
  );
}

function validUuid(
  value: string,
) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    .test(value);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(
      "ok",
      {
        headers: CORS,
      },
    );
  }

  try {
    if (req.method !== "POST") {
      throw new HttpError(
        405,
        "METODO_INVALIDO",
        "Método não permitido.",
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";

    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (
      !supabaseUrl ||
      !anonKey ||
      !serviceRole
    ) {
      throw new HttpError(
        500,
        "CONFIGURACAO_INVALIDA",
        "Configuração interna indisponível.",
      );
    }

    const authorization = req.headers.get("authorization") || "";

    if (
      !authorization
        .toLowerCase()
        .startsWith("bearer ")
    ) {
      throw new HttpError(
        401,
        "SESSAO_AUSENTE",
        "Sessão autenticada obrigatória.",
      );
    }

    const userClient = createClient(
      supabaseUrl,
      anonKey,
      {
        global: {
          headers: {
            Authorization: authorization,
          },
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );

    const adminClient = createClient(
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
      data: callerAuth,
      error: callerAuthError,
    } = await userClient.auth
      .getUser();

    if (
      callerAuthError ||
      !callerAuth?.user?.id
    ) {
      throw new HttpError(
        401,
        "SESSAO_INVALIDA",
        "Sessão inválida.",
      );
    }

    const {
      data: isGlobalAdmin,
      error: globalAdminError,
    } = await userClient.rpc(
      "usuario_admin_global",
    );

    if (
      globalAdminError ||
      isGlobalAdmin !== true
    ) {
      throw new HttpError(
        403,
        "CONTA_MESTRE_OBRIGATORIA",
        "Apenas a Conta Mestre pode ajustar dados do cliente.",
      );
    }

    const body = record(
      await req.json(),
    );

    const tenantId = text(
      body.tenantId ??
        body.tenant_id,
      80,
    );

    const userId = text(
      body.userId ??
        body.user_id,
      80,
    );

    const empresaId = text(
      body.empresaId ??
        body.empresa_id,
      80,
    );

    const adminNome = text(
      body.adminNome ??
        body.admin_nome,
      160,
    );

    const adminEmail = normalizedEmail(
      body.adminEmail ??
        body.admin_email,
    );

    const adminFuncao = text(
      body.adminFuncao ??
        body.admin_funcao,
      160,
    );

    const empresaNome = text(
      body.empresaNome ??
        body.empresa_nome,
      220,
    );

    const empresaRazaoSocial = text(
      body.empresaRazaoSocial ??
        body.empresa_razao_social,
      260,
    );

    const empresaResponsavel = text(
      body.empresaResponsavel ??
        body.empresa_responsavel,
      180,
    );

    const empresaEmail = normalizedEmail(
      body.empresaEmail ??
        body.empresa_email,
    );

    if (
      !validUuid(tenantId) ||
      !validUuid(userId) ||
      !validUuid(empresaId)
    ) {
      throw new HttpError(
        400,
        "IDENTIFICADOR_INVALIDO",
        "Identificador inválido.",
      );
    }

    if (
      !adminNome ||
      !empresaNome ||
      !validEmail(adminEmail)
    ) {
      throw new HttpError(
        400,
        "DADOS_INVALIDOS",
        "Nome, empresa e e-mail de acesso válidos são obrigatórios.",
      );
    }

    if (
      empresaEmail &&
      !validEmail(empresaEmail)
    ) {
      throw new HttpError(
        400,
        "EMAIL_EMPRESA_INVALIDO",
        "E-mail da empresa inválido.",
      );
    }

    const {
      data: membership,
      error: membershipError,
    } = await adminClient
      .from("tenant_memberships")
      .select(
        "id,tenant_id,user_id,papel,status",
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
      throw new HttpError(
        404,
        "MEMBERSHIP_NAO_LOCALIZADA",
        "Membership do cliente não localizada.",
      );
    }

    const membershipRole = text(
      membership.papel,
      60,
    ).toLowerCase();

    const membershipStatus = text(
      membership.status,
      60,
    ).toLowerCase();

    if (
      (
        membershipRole !== "admin" &&
        membershipRole !== "administrador"
      ) ||
      membershipStatus !== "ativo"
    ) {
      throw new HttpError(
        403,
        "MEMBERSHIP_INVALIDA",
        "O ajuste exige Administrador ativo do cliente.",
      );
    }

    const [
      systemProfileResult,
      empresaResult,
      targetAuthResult,
    ] = await Promise.all([
      adminClient
        .from("usuarios_permissoes_sistema")
        .select(
          "email,acesso_global,excluido",
        )
        .eq(
          "user_id",
          userId,
        )
        .eq(
          "excluido",
          false,
        )
        .maybeSingle(),

      adminClient
        .from("empresas")
        .select(
          "id,tenant_id,nome,razao_social,cnpj,responsavel,email",
        )
        .eq(
          "id",
          empresaId,
        )
        .eq(
          "tenant_id",
          tenantId,
        )
        .maybeSingle(),

      adminClient.auth.admin
        .getUserById(
          userId,
        ),
    ]);

    if (
      systemProfileResult.error ||
      empresaResult.error ||
      targetAuthResult.error
    ) {
      throw new HttpError(
        500,
        "VALIDACAO_INDISPONIVEL",
        "Não foi possível validar o alvo da alteração.",
      );
    }

    const systemProfile = systemProfileResult.data;

    const targetCompany = empresaResult.data;

    const targetAuth = targetAuthResult.data?.user;

    if (!systemProfile) {
      throw new HttpError(
        404,
        "PERFIL_NAO_LOCALIZADO",
        "Perfil SafeScan do cliente não localizado.",
      );
    }

    if (!targetCompany?.id) {
      throw new HttpError(
        404,
        "EMPRESA_NAO_LOCALIZADA",
        "Empresa não pertence ao cliente informado.",
      );
    }

    if (!targetAuth?.id) {
      throw new HttpError(
        404,
        "AUTH_NAO_LOCALIZADO",
        "Usuário Auth não localizado.",
      );
    }

    if (
      systemProfile.acesso_global === true
    ) {
      throw new HttpError(
        403,
        "ALVO_GLOBAL_BLOQUEADO",
        "Conta Mestre ou usuário global não pode ser alterado por este fluxo.",
      );
    }

    const appMetadata = record(
      targetAuth.app_metadata,
    );

    const globalByMetadata = appMetadata.acesso_global === true ||
      appMetadata.admin_global === true ||
      appMetadata.conta_mestre === true;

    if (globalByMetadata) {
      throw new HttpError(
        403,
        "ALVO_GLOBAL_BLOQUEADO",
        "Conta Mestre ou usuário global não pode ser alterado por este fluxo.",
      );
    }

    const authEmailBefore = normalizedEmail(
      targetAuth.email,
    );

    const profileEmailBefore = normalizedEmail(
      systemProfile.email,
    );

    if (
      !validEmail(authEmailBefore) ||
      !validEmail(profileEmailBefore)
    ) {
      throw new HttpError(
        409,
        "EMAIL_ATUAL_INVALIDO",
        "O cadastro atual do cliente possui e-mail inválido.",
      );
    }

    if (
      authEmailBefore !==
        profileEmailBefore
    ) {
      throw new HttpError(
        409,
        "EMAIL_DIVERGENTE",
        "O e-mail do Auth e do perfil SafeScan estão divergentes. Corrija a inconsistência antes de continuar.",
      );
    }

    const {
      data: emailDisponivel,
      error: emailDisponivelError,
    } = await userClient.rpc(
      "admin_validar_email_cliente_tenant",
      {
        p_user_id: userId,
        p_admin_email: adminEmail,
      },
    );

    if (emailDisponivelError) {
      throw new HttpError(
        500,
        "VALIDACAO_EMAIL_INDISPONIVEL",
        "Não foi possível validar a disponibilidade do e-mail.",
      );
    }

    if (emailDisponivel !== true) {
      throw new HttpError(
        409,
        "EMAIL_JA_CADASTRADO",
        "Este e-mail já está cadastrado no SafeScan para outro usuário. Informe outro e-mail de acesso.",
      );
    }
    const emailChanged = authEmailBefore !==
      adminEmail;

    const userMetadataBefore = record(
      targetAuth.user_metadata,
    );

    const authPayload: {
      email?: string;
      email_confirm?: boolean;
      user_metadata: JsonRecord;
    } = {
      user_metadata: {
        ...userMetadataBefore,
        nome: adminNome,
        funcao: adminFuncao,
      },
    };

    if (emailChanged) {
      authPayload.email = adminEmail;

      authPayload.email_confirm = true;
    }

    const {
      data: authUpdated,
      error: authUpdateError,
    } = await adminClient.auth.admin
      .updateUserById(
        userId,
        authPayload,
      );

    if (
      authUpdateError ||
      !authUpdated?.user?.id
    ) {
      throw new HttpError(
        409,
        "AUTH_NAO_ATUALIZADO",
        authUpdateError?.message ||
          "Não foi possível atualizar o login do cliente.",
      );
    }

    const {
      data: persisted,
      error: persistenceError,
    } = await userClient.rpc(
      "admin_atualizar_dados_cliente_tenant",
      {
        p_tenant_id: tenantId,
        p_user_id: userId,
        p_empresa_id: empresaId,
        p_admin_nome: adminNome,
        p_admin_email: adminEmail,
        p_admin_funcao: adminFuncao || null,
        p_empresa_nome: empresaNome,
        p_razao_social: empresaRazaoSocial ||
          null,
        p_responsavel: empresaResponsavel ||
          null,
        p_empresa_email: empresaEmail ||
          null,
      },
    );

    if (persistenceError) {
      const rollbackPayload: {
        email?: string;
        email_confirm?: boolean;
        user_metadata: JsonRecord;
      } = {
        user_metadata: userMetadataBefore,
      };

      if (emailChanged) {
        rollbackPayload.email = authEmailBefore;

        rollbackPayload.email_confirm = true;
      }

      const rollback = await adminClient.auth.admin
        .updateUserById(
          userId,
          rollbackPayload,
        );

      if (rollback.error) {
        throw new HttpError(
          500,
          "ROLLBACK_AUTH_FALHOU",
          "A persistência falhou e o Auth não pôde ser restaurado automaticamente.",
        );
      }

      throw new HttpError(
        500,
        "PERSISTENCIA_FALHOU",
        persistenceError.message ||
          "Não foi possível persistir os dados do cliente.",
      );
    }

    const persistedRow = Array.isArray(persisted) ? persisted[0] : persisted;

    return response(
      200,
      {
        ok: true,
        userId,
        membershipId: text(
          membership.id,
          80,
        ),
        emailAlterado: persistedRow?.email_alterado ===
          true,
        primeiroAcessoReenvioNecessario:
          persistedRow?.primeiro_acesso_reenvio_necessario ===
            true,
      },
    );
  } catch (error) {
    const handled = error instanceof HttpError ? error : new HttpError(
      500,
      "ERRO_INTERNO",
      error instanceof Error ? error.message : "Erro interno.",
    );

    return response(
      handled.status,
      {
        ok: false,
        codigo: handled.code,
        erro: handled.message,
      },
    );
  }
});
