import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PERFIS_VALIDOS = new Set([
  "administrador",
  "tecnico_sst",
  "auditor",
  "gestor",
  "consulta",
  "bloqueado",
]);

const PAPEIS_TENANT_VALIDOS = new Set([
  "administrador",
  "gestor",
  "tecnico_sst",
  "auditor",
  "consulta",
]);

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function respostaJson(status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function normalizarTexto(valor: unknown) {
  return String(valor ?? "").trim();
}

function normalizarEmail(valor: unknown) {
  return normalizarTexto(valor).toLowerCase();
}

function normalizarBooleano(valor: unknown) {
  return valor === true || valor === "true";
}

function normalizarPerfil(valor: unknown) {
  const perfil = normalizarTexto(valor || "consulta")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_");

  if (perfil === "admin") return "administrador";

  if (
    perfil === "tecnico_de_seguranca" ||
    perfil === "tecnico_seguranca"
  ) {
    return "tecnico_sst";
  }

  return PERFIS_VALIDOS.has(perfil)
    ? perfil
    : "consulta";
}

function normalizarPapelTenant(
  valor: unknown,
  perfilFallback: string
) {
  const bruto =
    normalizarTexto(valor) ||
    perfilFallback ||
    "consulta";

  const normalizado =
    normalizarPerfil(bruto);

  if (
    normalizado === "bloqueado" ||
    !PAPEIS_TENANT_VALIDOS.has(normalizado)
  ) {
    return "consulta";
  }

  return normalizado;
}

function ehUuid(valor: string) {
  return UUID_REGEX.test(
    normalizarTexto(valor)
  );
}

function extrairPermissao(data: unknown) {
  return Array.isArray(data)
    ? data[0]
    : data;
}

function normalizarObjetoJson(valor: unknown) {
  if (
    valor &&
    typeof valor === "object" &&
    !Array.isArray(valor)
  ) {
    return valor as Record<string, unknown>;
  }

  return {};
}

function usuarioPodeCriarLogin(permissao: any) {
  const ativo =
    normalizarBooleano(
      permissao?.ativo
    );

  const bloqueado =
    normalizarBooleano(
      permissao?.bloqueado
    );

  const perfil =
    normalizarPerfil(
      permissao?.perfil
    );

  const acessoGlobal =
    normalizarBooleano(
      permissao?.acesso_global
    );

  const permissoes =
    normalizarObjetoJson(
      permissao?.permissoes
    );

  const acoesCriticas =
    normalizarObjetoJson(
      permissoes?.acoesCriticas
    );

  const modulos =
    normalizarObjetoJson(
      permissoes?.modulos
    );

  const acessosApp =
    normalizarObjetoJson(
      modulos?.acessos_app
    );

  const configuracoes =
    normalizarObjetoJson(
      modulos?.configuracoes
    );

  const podeGerenciarAcessos =
    normalizarBooleano(
      acoesCriticas?.gerenciar_permissoes
    ) ||
    normalizarBooleano(
      acessosApp?.gerenciar_permissoes
    ) ||
    normalizarBooleano(
      configuracoes?.gerenciar_permissoes
    );

  return Boolean(
    ativo &&
    !bloqueado &&
    (
      perfil === "administrador" ||
      acessoGlobal ||
      podeGerenciarAcessos
    )
  );
}

async function localizarUsuarioAuthPorEmail(
  adminClient: any,
  email: string
) {
  let page = 1;
  const perPage = 1000;

  while (page <= 20) {
    const {
      data,
      error,
    } =
      await adminClient.auth.admin.listUsers({
        page,
        perPage,
      });

    if (error) throw error;

    const usuarios =
      data?.users || [];

    const encontrado =
      usuarios.find(
        (usuario: any) =>
          normalizarEmail(
            usuario?.email
          ) === email
      );

    if (encontrado) {
      return encontrado;
    }

    if (
      usuarios.length < perPage
    ) {
      break;
    }

    page += 1;
  }

  return null;
}

async function usuarioAlvoEhGlobal(
  adminClient: any,
  userId: string
) {
  const {
    data: autorizacoes,
    error: autorizacoesError,
  } =
    await adminClient
      .from(
        "auditoria_usuarios_autorizados"
      )
      .select(
        "ativo, acesso_global, perfil"
      )
      .eq(
        "user_id",
        userId
      );

  if (autorizacoesError) {
    throw autorizacoesError;
  }

  const autorizadoGlobal =
    (
      autorizacoes || []
    ).some(
      (item: any) =>
        normalizarBooleano(
          item?.ativo
        ) &&
        (
          normalizarBooleano(
            item?.acesso_global
          ) ||
          [
            "admin",
            "administrador",
          ].includes(
            normalizarTexto(
              item?.perfil
            ).toLowerCase()
          )
        )
    );

  if (autorizadoGlobal) {
    return true;
  }

  const {
    data: permissoes,
    error: permissoesError,
  } =
    await adminClient
      .from(
        "usuarios_permissoes_sistema"
      )
      .select(
        "acesso_global, perfil, pode_gerenciar_permissoes, permissoes"
      )
      .eq(
        "user_id",
        userId
      );

  if (permissoesError) {
    throw permissoesError;
  }

  return (
    permissoes || []
  ).some(
    (item: any) => {
      const json =
        normalizarObjetoJson(
          item?.permissoes
        );

      const acoesCriticas =
        normalizarObjetoJson(
          json?.acoesCriticas
        );

      const modulos =
        normalizarObjetoJson(
          json?.modulos
        );

      const acessosApp =
        normalizarObjetoJson(
          modulos?.acessos_app
        );

      return Boolean(
        normalizarBooleano(
          item?.acesso_global
        ) ||
        normalizarTexto(
          item?.perfil
        ).toLowerCase() ===
          "administrador" ||
        normalizarBooleano(
          item?.pode_gerenciar_permissoes
        ) ||
        normalizarBooleano(
          acoesCriticas?.gerenciar_permissoes
        ) ||
        normalizarBooleano(
          acessosApp?.gerenciar_permissoes
        )
      );
    }
  );
}

function extrairMensagemErroSeguro(
  error: unknown,
  fallback: string
) {
  if (
    error &&
    typeof error === "object" &&
    "message" in error
  ) {
    const mensagem =
      (error as {
        message?: unknown;
      }).message;

    if (
      typeof mensagem === "string" &&
      mensagem.trim()
    ) {
      return mensagem.trim();
    }
  }

  return fallback;
}

async function carregarEmpresaTenant(
  adminClient: any,
  tenantId: string,
  empresaId: string
) {
  if (!empresaId) {
    return null;
  }

  const {
    data,
    error,
  } =
    await adminClient
      .from("empresas")
      .select(
        "id, tenant_id, nome"
      )
      .eq(
        "id",
        empresaId
      )
      .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(
      "A empresa selecionada não existe."
    );
  }

  if (
    normalizarTexto(
      data.tenant_id
    ) !== tenantId
  ) {
    throw new Error(
      "A empresa selecionada não pertence ao tenant informado."
    );
  }

  return data;
}

// SAFE_SCAN_I4C_C2_TENANT_METADATA_START
function montarMetadataTenantCriacao({
  nome,
  fotoUrl,
  criadoPor,
}: {
  nome: string;
  fotoUrl: string;
  criadoPor: string;
}) {
  return {
    nome,
    foto_url: fotoUrl,
    origem: "controle-sst-qr",
    criado_por: criadoPor,
  };
}

function montarMetadataTenantAtualizacao({
  usuarioAuth,
  nome,
  fotoUrl,
  atualizadoPor,
}: {
  usuarioAuth: any;
  nome: string;
  fotoUrl: string;
  atualizadoPor: string;
}) {
  /*
   * SAFE_SCAN_I4C_C2_1_METADATA_ALLOWLIST
   *
   * No fluxo tenant, Auth metadata não é fonte de autorização.
   * Reconstruir somente identidade transversal e descartar
   * qualquer papel, empresa, tenant ou permissão legados.
   */
  const metadataAnterior =
    normalizarObjetoJson(
      usuarioAuth?.user_metadata
    );

  const origemAnterior =
    normalizarTexto(
      metadataAnterior?.origem
    );

  const criadoPorAnterior =
    normalizarTexto(
      metadataAnterior?.criado_por
    );

  return {
    nome,
    foto_url:
      fotoUrl,
    origem:
      origemAnterior ||
      "controle-sst-qr",
    ...(criadoPorAnterior
      ? {
          criado_por:
            criadoPorAnterior,
        }
      : {}),
    atualizado_por:
      atualizadoPor,
  };
}
// SAFE_SCAN_I4C_C2_TENANT_METADATA_END

function gerarSenhaBootstrapTenant() {
  const bytes = new Uint8Array(
    24,
  );

  crypto.getRandomValues(
    bytes,
  );

  const base = Array.from(
    bytes,
  )
    .map(
      (byte) =>
        byte
          .toString(
            16,
          )
          .padStart(
            2,
            "0",
          ),
    )
    .join("");

  return `${base}Aa1!`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(
      "ok",
      {
        headers: corsHeaders,
      }
    );
  }

  if (req.method !== "POST") {
    return respostaJson(
      405,
      {
        ok: false,
        erro:
          "Método não permitido. Use POST.",
      }
    );
  }

  const supabaseUrl =
    Deno.env.get(
      "SUPABASE_URL"
    ) || "";

  const supabaseAnonKey =
    Deno.env.get(
      "SUPABASE_ANON_KEY"
    ) || "";

  const supabaseServiceRoleKey =
    Deno.env.get(
      "SUPABASE_SERVICE_ROLE_KEY"
    ) || "";

  if (
    !supabaseUrl ||
    !supabaseAnonKey ||
    !supabaseServiceRoleKey
  ) {
    return respostaJson(
      500,
      {
        ok: false,
        erro:
          "Variáveis SUPABASE_URL, SUPABASE_ANON_KEY ou SUPABASE_SERVICE_ROLE_KEY não configuradas na Edge Function.",
      }
    );
  }

  const authorization =
    req.headers.get(
      "Authorization"
    ) || "";

  if (
    !authorization
      .toLowerCase()
      .startsWith("bearer ")
  ) {
    return respostaJson(
      401,
      {
        ok: false,
        erro:
          "Usuário não autenticado. Faça login como administrador antes de criar acesso.",
      }
    );
  }

  const userClient =
    createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        global: {
          headers: {
            Authorization:
              authorization,
          },
        },
      }
    );

  const adminClient =
    createClient(
      supabaseUrl,
      supabaseServiceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

  const {
    data: authAtual,
    error: authError,
  } =
    await userClient.auth.getUser();

  if (
    authError ||
    !authAtual?.user
  ) {
    return respostaJson(
      401,
      {
        ok: false,
        erro:
          authError?.message ||
          "Não foi possível identificar o usuário autenticado.",
      }
    );
  }

  /*
   * SAFE_SCAN_I4C_C2_EDGE_V10
   *
   * O corpo precisa ser conhecido antes da autorização específica,
   * porque tenantId decide entre o gate tenant e o fluxo global.
   */
  let body: any = {};

  try {
    body =
      await req.json();
  } catch {
    return respostaJson(
      400,
      {
        ok: false,
        erro:
          "Corpo da requisição inválido. Envie JSON.",
      }
    );
  }

  const tenantId =
    normalizarTexto(
      body?.tenantId ??
      body?.tenant_id
    );

  const empresaId =
    normalizarTexto(
      body?.empresaId ??
      body?.empresa_id
    );

  const modoTenant =
    Boolean(
      tenantId
    );

  if (
    modoTenant &&
    !ehUuid(tenantId)
  ) {
    return respostaJson(
      400,
      {
        ok: false,
        erro:
          "tenantId inválido.",
      }
    );
  }

  if (
    empresaId &&
    !ehUuid(empresaId)
  ) {
    return respostaJson(
      400,
      {
        ok: false,
        erro:
          "empresaId inválido.",
      }
    );
  }

  /*
   * Autorização dual-mode:
   * - tenantId => gate canônico de administração do tenant;
   * - sem tenantId => comportamento administrativo legado.
   */
  if (modoTenant) {
    const {
      data: podeGerenciarTenant,
      error: gateTenantError,
    } =
      await userClient.rpc(
        "usuario_pode_gerenciar_tenant",
        {
          p_tenant_id:
            tenantId,
        }
      );

    if (gateTenantError) {
      return respostaJson(
        403,
        {
          ok: false,
          erro:
            gateTenantError.message ||
            "Não foi possível validar a administração deste tenant.",
        }
      );
    }

    if (
      podeGerenciarTenant !== true
    ) {
      return respostaJson(
        403,
        {
          ok: false,
          erro:
            "Sem permissão para administrar acessos deste tenant.",
        }
      );
    }
  } else {
    const {
      data: permissaoData,
      error: permissaoError,
    } =
      await userClient.rpc(
        "usuario_permissao_sistema_atual"
      );

    if (permissaoError) {
      return respostaJson(
        403,
        {
          ok: false,
          erro:
            permissaoError.message ||
            "Não foi possível validar a permissão administrativa do usuário atual.",
        }
      );
    }

    const permissaoAtual =
      extrairPermissao(
        permissaoData
      );

    if (
      !usuarioPodeCriarLogin(
        permissaoAtual
      )
    ) {
      return respostaJson(
        403,
        {
          ok: false,
          erro:
            "Sem permissão para criar login do app. Ação restrita a administrador ou usuário com gerenciamento de permissões.",
        }
      );
    }
  }

  const nome =
    normalizarTexto(
      body?.nome
    );

  const email =
    normalizarEmail(
      body?.email
    );

  const funcao =
    normalizarTexto(
      body?.funcao
    );

  const empresaInformada =
    normalizarTexto(
      body?.empresa
    );

  const fotoUrl =
    normalizarTexto(
      body?.fotoUrl ??
      body?.foto_url
    );

  const perfil =
    normalizarPerfil(
      body?.perfil
    );

  const senhaTemporariaRecebida = String(
    body?.senhaTemporaria ??
      body?.senha_temporaria ??
      "",
  );

  const senhaTemporaria = modoTenant &&
      !senhaTemporariaRecebida
    ? gerarSenhaBootstrapTenant()
    : senhaTemporariaRecebida;

  const ativo =
    perfil === "bloqueado"
      ? false
      : normalizarBooleano(
          body?.ativo ??
          true
        );

  const bloqueado =
    perfil === "bloqueado"
      ? true
      : normalizarBooleano(
          body?.bloqueado ??
          false
        );

  const acessoGlobalSolicitado =
    perfil === "administrador"
      ? normalizarBooleano(
          body?.acessoGlobal ??
          body?.acesso_global ??
          false
        )
      : false;

  const acessoGlobal =
    modoTenant
      ? false
      : acessoGlobalSolicitado;

  const observacao =
    normalizarTexto(
      body?.observacao
    );

  const resetarSenhaTemporaria =
    normalizarBooleano(
      body?.resetarSenhaTemporaria ??
      body?.resetar_senha_temporaria ??
      false
    );

  const papelTenant =
    normalizarPapelTenant(
      body?.papel,
      perfil
    );

  const statusTenant =
    bloqueado
      ? "suspenso"
      : ativo
        ? "ativo"
        : "pendente";

  const permissoesTenant =
    normalizarObjetoJson(
      body?.permissoes
    );

  if (
    !email ||
    !email.includes("@")
  ) {
    return respostaJson(
      400,
      {
        ok: false,
        erro:
          "Informe um e-mail válido para criar o login.",
      }
    );
  }

  if (!nome) {
    return respostaJson(
      400,
      {
        ok: false,
        erro:
          "Informe o nome da pessoa.",
      }
    );
  }

  if (
    !PERFIS_VALIDOS.has(
      perfil
    )
  ) {
    return respostaJson(
      400,
      {
        ok: false,
        erro:
          "Perfil inválido para criação de acesso.",
      }
    );
  }

  if (
    senhaTemporaria.length < 6
  ) {
    return respostaJson(
      400,
      {
        ok: false,
        erro:
          "A senha temporária deve ter pelo menos 6 caracteres.",
      }
    );
  }

  if (
    bloqueado &&
    acessoGlobal
  ) {
    return respostaJson(
      400,
      {
        ok: false,
        erro:
          "Usuário bloqueado não pode receber acesso global.",
      }
    );
  }

  if (
    modoTenant &&
    acessoGlobalSolicitado
  ) {
    return respostaJson(
      400,
      {
        ok: false,
        erro:
          "Acesso global SafeScan não pode ser concedido pelo fluxo tenant.",
      }
    );
  }

  if (
    modoTenant &&
    statusTenant === "ativo" &&
    papelTenant !== "administrador" &&
    !empresaId
  ) {
    return respostaJson(
      400,
      {
        ok: false,
        erro:
          "Usuário tenant ativo não administrador exige empresaId.",
      }
    );
  }

  let empresaTenant: any =
    null;

  if (
    modoTenant &&
    empresaId
  ) {
    try {
      empresaTenant =
        await carregarEmpresaTenant(
          adminClient,
          tenantId,
          empresaId
        );
    } catch (error) {
      return respostaJson(
        400,
        {
          ok: false,
          erro:
            extrairMensagemErroSeguro(
              error,
              "Não foi possível validar a empresa do tenant."
            ),
        }
      );
    }
  }

  const empresaEfetiva =
    modoTenant
      ? normalizarTexto(
          empresaTenant?.nome
        )
      : empresaInformada;

  let usuarioAuth: any =
    null;

  let loginCriado =
    false;

  let senhaAtualizada =
    false;

  let metadataTenantAnterior:
    Record<string, unknown> | null =
      null;

  let metadataTenantSanitizada =
    false;

  let persistenciaPrincipalConcluida =
    false;

  const compensarAuthAntesPersistencia =
    async () => {
      if (
        persistenciaPrincipalConcluida
      ) {
        return false;
      }

      if (
        loginCriado &&
        usuarioAuth?.id
      ) {
        try {
          const {
            error: excluirAuthError,
          } =
            await adminClient.auth.admin.deleteUser(
              usuarioAuth.id
            );

          if (excluirAuthError) {
            console.error(
              "SAFE_SCAN_I4C_C2_2_AUTH_COMPENSATION_DELETE_FAILED",
              excluirAuthError
            );

            return true;
          }

          return false;
        } catch (compensacaoError: any) {
          console.error(
            "SAFE_SCAN_I4C_C2_2_AUTH_COMPENSATION_DELETE_THROW",
            compensacaoError
          );

          return true;
        }
      }

      if (
        !modoTenant &&
        senhaAtualizada &&
        !loginCriado
      ) {
        console.error(
          "SAFE_SCAN_I4C_C2_2_GLOBAL_EXISTING_PASSWORD_NOT_ROLLBACKABLE"
        );

        return true;
      }

      if (
        modoTenant &&
        metadataTenantSanitizada &&
        usuarioAuth?.id &&
        metadataTenantAnterior
      ) {
        try {
          const {
            error: restaurarMetadataError,
          } =
            await adminClient.auth.admin.updateUserById(
              usuarioAuth.id,
              {
                user_metadata:
                  metadataTenantAnterior,
              }
            );

          if (restaurarMetadataError) {
            console.error(
              "SAFE_SCAN_I4C_C2_2_AUTH_METADATA_ROLLBACK_FAILED",
              restaurarMetadataError
            );

            return true;
          }

          return false;
        } catch (compensacaoError: any) {
          console.error(
            "SAFE_SCAN_I4C_C2_2_AUTH_METADATA_ROLLBACK_THROW",
            compensacaoError
          );

          return true;
        }
      }

      return false;
    };

  try {
    usuarioAuth =
      await localizarUsuarioAuthPorEmail(
        adminClient,
        email
      );

    /*
     * Antes de redefinir senha de Auth já existente no fluxo tenant,
     * bloquear alvo global para evitar mutação lateral desnecessária.
     */
    if (
      modoTenant &&
      usuarioAuth?.id
    ) {
      const alvoGlobal =
        await usuarioAlvoEhGlobal(
          adminClient,
          usuarioAuth.id
        );

      if (alvoGlobal) {
        return respostaJson(
          409,
          {
            ok: false,
            erro:
              "Administrador global SafeScan deve ser gerenciado pelo fluxo global.",
          }
        );
      }
    }

    if (!usuarioAuth) {
      const userMetadata =
        modoTenant
          ? montarMetadataTenantCriacao({
              nome,
              fotoUrl,
              criadoPor:
                authAtual.user.id,
            })
          : {
              nome,
              funcao,
              empresa:
                empresaEfetiva,
              foto_url:
                fotoUrl,
              perfil,
              origem:
                "controle-sst-qr",
              criado_por:
                authAtual.user.id,
            };

      const {
        data: novoUsuario,
        error: criarError,
      } =
        await adminClient
          .auth
          .admin
          .createUser({
            email,
            password:
              senhaTemporaria,
            email_confirm:
              true,
            user_metadata:
              userMetadata,
            app_metadata: {
              precisa_trocar_senha:
                true,
              criado_por_configuracoes:
                authAtual.user.id,
            },
          });

      if (criarError) {
        throw criarError;
      }

      usuarioAuth =
        novoUsuario?.user ||
        null;

      loginCriado =
        Boolean(
          usuarioAuth?.id
        );
    } else if (modoTenant) {
      metadataTenantAnterior = {
        ...normalizarObjetoJson(
          usuarioAuth?.user_metadata
        ),
      };

      const userMetadata =
        montarMetadataTenantAtualizacao({
          usuarioAuth,
          nome,
          fotoUrl,
          atualizadoPor:
            authAtual.user.id,
        });

      const {
        data: usuarioSanitizado,
        error: sanitizarMetadataError,
      } =
        await adminClient.auth.admin.updateUserById(
          usuarioAuth.id,
          {
            user_metadata:
              userMetadata,
          }
        );

      if (sanitizarMetadataError) {
        throw sanitizarMetadataError;
      }

      usuarioAuth =
        usuarioSanitizado?.user ||
        usuarioAuth;

      metadataTenantSanitizada =
        true;
    } else if (
      resetarSenhaTemporaria
    ) {
      const userMetadata =
        modoTenant
          ? montarMetadataTenantAtualizacao({
              usuarioAuth,
              nome,
              fotoUrl,
              atualizadoPor:
                authAtual.user.id,
            })
          : {
              ...(usuarioAuth.user_metadata || {}),
              nome,
              funcao,
              empresa:
                empresaEfetiva,
              foto_url:
                fotoUrl,
              perfil,
              atualizado_por:
                authAtual.user.id,
            };

      const {
        data: usuarioAtualizado,
        error: atualizarSenhaError,
      } =
        await adminClient
          .auth
          .admin
          .updateUserById(
            usuarioAuth.id,
            {
              password:
                senhaTemporaria,
              user_metadata:
                userMetadata,
              app_metadata: {
                ...(usuarioAuth.app_metadata || {}),
                precisa_trocar_senha:
                  true,
                senha_temporaria_redefinida_por:
                  authAtual.user.id,
              },
            }
          );

      if (
        atualizarSenhaError
      ) {
        throw atualizarSenhaError;
      }

      usuarioAuth =
        usuarioAtualizado?.user ||
        usuarioAuth;

      senhaAtualizada =
        true;
    }

    if (!usuarioAuth?.id) {
      throw new Error(
        "Não foi possível obter o user_id real do Supabase Auth."
      );
    }

    const observacaoComHistorico =
      [
        observacao,
        modoTenant
          ? `Escopo tenant: ${tenantId}.`
          : "",
        loginCriado
          ? "Login criado no Supabase Auth pela Edge Function admin-criar-login-app."
          : "Login já existia no Supabase Auth.",
        modoTenant &&
        resetarSenhaTemporaria &&
        !loginCriado
          ? "Redefinição de senha temporária solicitada pela administração."
          : senhaAtualizada
            ? "Senha temporária redefinida pela administração."
            : "",
      ]
        .filter(Boolean)
        .join(" | ");

    let permissaoSalva: any =
      null;

    let salvarPermissaoError: any =
      null;

    if (modoTenant) {
      const resultadoTenant =
        await userClient.rpc(
          "admin_salvar_usuario_tenant_sistema",
          {
            p_tenant_id:
              tenantId,
            p_user_id:
              usuarioAuth.id,
            p_email:
              email,
            p_nome:
              nome,
            p_funcao:
              funcao,
            p_papel:
              papelTenant,
            p_status:
              statusTenant,
            p_empresa_id:
              empresaId || null,
            p_empresa:
              empresaEfetiva,
            p_foto_url:
              fotoUrl,
            p_observacao:
              observacaoComHistorico,
            p_permissoes:
              permissoesTenant,
          }
        );

      permissaoSalva =
        resultadoTenant.data;

      salvarPermissaoError =
        resultadoTenant.error;
    } else {
      const resultadoGlobal =
        await userClient.rpc(
          "admin_salvar_usuario_permissao_sistema",
          {
            p_email:
              email,
            p_nome:
              nome,
            p_funcao:
              funcao,
            p_empresa:
              empresaEfetiva,
            p_foto_url:
              fotoUrl,
            p_perfil:
              perfil,
            p_ativo:
              ativo,
            p_bloqueado:
              bloqueado,
            p_acesso_global:
              acessoGlobal,
            p_observacao:
              observacaoComHistorico,
            p_empresa_id:
              empresaId || null,
          }
        );

      permissaoSalva =
        resultadoGlobal.data;

      salvarPermissaoError =
        resultadoGlobal.error;
    }

    if (salvarPermissaoError) {
      /*
       * SAFE_SCAN_I4C_C2_2_PRE_PERSISTENCE_COMPENSATION
       *
       * Antes da persistência principal:
       * - Auth novo pode ser removido;
       * - Auth existente tenant pode ter somente o user_metadata
       *   restaurado para o snapshot anterior.
       * A senha de Auth existente ainda NÃO foi alterada neste ponto.
       */
      const compensacaoAuthFalhou =
        await compensarAuthAntesPersistencia();

      return respostaJson(
        500,
        {
          ok: false,
          parcial:
            compensacaoAuthFalhou,
          compensacaoAuthFalhou,
          erro:
            salvarPermissaoError.message ||
            (
              modoTenant
                ? "Não foi possível salvar a membership do tenant. A compensação do Auth foi executada quando necessária."
                : "Não foi possível salvar a permissão. A compensação do Auth foi executada quando necessária."
            ),
        }
      );
    }

    persistenciaPrincipalConcluida =
      true;

    /*
     * SAFE_SCAN_I4C_C2_2_TENANT_PASSWORD_AFTER_PERSISTENCE
     *
     * No tenant, redefinir senha somente depois que a membership
     * foi persistida. Isso evita alterar a senha de Auth existente
     * e depois falhar no save principal.
     */
    if (
      modoTenant &&
      !loginCriado &&
      resetarSenhaTemporaria &&
      usuarioAuth?.id
    ) {
      const {
        data: usuarioAtualizado,
        error: atualizarSenhaError,
      } =
        await adminClient.auth.admin.updateUserById(
          usuarioAuth.id,
          {
            password:
              senhaTemporaria,
            app_metadata: {
              ...(usuarioAuth.app_metadata || {}),
              precisa_trocar_senha:
                true,
              senha_temporaria_redefinida_por:
                authAtual.user.id,
            },
          }
        );

      if (atualizarSenhaError) {
        return respostaJson(
          500,
          {
            ok: false,
            parcial: true,
            persistenciaConcluida: true,
            metadataTenantSanitizada:
              metadataTenantSanitizada,
            senhaTemporariaDefinida:
              false,
            erro:
              atualizarSenhaError.message ||
              "A membership do tenant foi salva, mas não foi possível redefinir a senha temporária do usuário existente.",
          }
        );
      }

      usuarioAuth =
        usuarioAtualizado?.user ||
        usuarioAuth;

      senhaAtualizada =
        true;
    }

    /*
     * Em tenant, este objeto é a membership real devolvida
     * pela RPC tenant-scoped. Não substituir pela linha legada.
     */
    let permissaoAtualizada =
      extrairPermissao(
        permissaoSalva
      );

    if (
      (
        loginCriado ||
        senhaAtualizada
      ) &&
      usuarioAuth?.id
    ) {
      const {
        data: permissaoLogin,
        error: marcarLoginError,
      } =
        await adminClient.rpc(
          "admin_marcar_login_app_criado_sistema",
          {
            p_email:
              email,
            p_user_id:
              usuarioAuth.id,
            p_precisa_trocar_senha:
              true,
          }
        );

      if (marcarLoginError) {
        /*
         * SAFE_SCAN_I4C_C2_2_POST_PERSISTENCE_PARTIAL
         *
         * Neste ponto Auth + membership/permissão já foram persistidos.
         * Não fingir rollback que não existe entre Auth e Postgres.
         */
        return respostaJson(
          500,
          {
            ok: false,
            parcial: true,
            persistenciaConcluida: true,
            authConcluido:
              Boolean(
                loginCriado ||
                senhaAtualizada
              ),
            erro:
              marcarLoginError.message ||
              "O acesso principal foi persistido, mas não foi possível marcar a troca obrigatória de senha no registro legado.",
          }
        );
      }

      /*
       * GLOBAL:
       * preserva exatamente o comportamento legado.
       *
       * TENANT:
       * a RPC acima serve só para compatibilidade de login/senha;
       * a autorização real continua sendo a membership.
       */
      if (!modoTenant) {
        permissaoAtualizada =
          extrairPermissao(
            permissaoLogin
          );
      }
    }

    const precisaTrocarSenha =
      modoTenant
        ? Boolean(
            loginCriado ||
            senhaAtualizada
          )
        : Boolean(
            permissaoAtualizada
              ?.precisa_trocar_senha ??
            (
              loginCriado ||
              senhaAtualizada
            )
          );

    return respostaJson(
      200,
      {
        ok: true,
        escopo:
          modoTenant
            ? "tenant"
            : "global",
        mensagem:
          loginCriado
            ? (
                modoTenant
                  ? "Login criado no Supabase Auth e membership do tenant salva. O usuário deve trocar a senha temporária no primeiro acesso."
                  : "Login criado no Supabase Auth e permissão salva. O usuário deve trocar a senha temporária no primeiro acesso."
              )
            : senhaAtualizada
              ? (
                  modoTenant
                    ? "Login já existia. Senha temporária redefinida e membership do tenant atualizada."
                    : "Login já existia. Senha temporária redefinida e permissão atualizada."
                )
              : (
                  modoTenant
                    ? "Login já existia no Supabase Auth. Membership do tenant atualizada."
                    : "Login já existia no Supabase Auth. Permissão atualizada."
                ),
        loginCriado,
        loginJaExistia:
          !loginCriado,
        senhaTemporariaDefinida:
          loginCriado ||
          senhaAtualizada,
        precisaTrocarSenha,
        usuario: {
          id:
            usuarioAuth?.id ||
            null,
          email,
          nome,
          funcao,
          empresa:
            empresaEfetiva,
          empresaId:
            empresaId ||
            null,
          tenantId:
            modoTenant
              ? tenantId
              : null,
          perfil,
          papel:
            modoTenant
              ? papelTenant
              : null,
          membershipStatus:
            modoTenant
              ? statusTenant
              : null,
          ativo,
          bloqueado,
          acessoGlobal:
            modoTenant
              ? false
              : acessoGlobal,
        },
        permissao:
          permissaoAtualizada,
      }
    );
  } catch (error) {
    const compensacaoAuthFalhou =
      await compensarAuthAntesPersistencia();

    return respostaJson(
      500,
      {
        ok: false,
        parcial:
          persistenciaPrincipalConcluida ||
          compensacaoAuthFalhou,
        persistenciaConcluida:
          persistenciaPrincipalConcluida,
        compensacaoAuthFalhou,
        erro:
          extrairMensagemErroSeguro(
            error,
            "Não foi possível criar o login do app."
          ),
      }
    );
  }
});
