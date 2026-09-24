import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

import {
  ErroResolvedorEmail,
  resolverTransportadorEmailParaEnvio,
  type TransportadorEmailResolvido,
} from "../_shared/emailProvedorResolver.ts";

type Registro = Record<string, unknown>;

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

type ClienteSupabase = ReturnType<typeof criarClienteSupabase>;

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
      const resultado = await adminClient.rpc(
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

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const TABELA_ESTADO = "tenant_primeiro_acesso_admin";

const TABELA_ENVIOS = "tenant_primeiro_acesso_envios";

const URL_SAFESCAN = "https://www.safescanbrasil.com.br/";

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
    super(
      mensagem,
    );

    this.name = "ErroHttp";

    this.status = status;

    this.codigo = codigo;

    this.publico = publico;
  }
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
        "Content-Type": "application/json; charset=utf-8",
      },
    },
  );
}

function objeto(
  valor: unknown,
): Registro {
  return (
      valor &&
      typeof valor === "object" &&
      !Array.isArray(
        valor,
      )
    )
    ? valor as Registro
    : {};
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
  return (
    valor.length >= 3 &&
    valor.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/i
      .test(
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
    )
    .trim();
}

function primeiroRegistro(
  valor: unknown,
): Registro | null {
  if (
    Array.isArray(
      valor,
    )
  ) {
    const primeiro = valor[0];

    return (
        primeiro &&
        typeof primeiro === "object"
      )
      ? primeiro as Registro
      : null;
  }

  return (
      valor &&
      typeof valor === "object"
    )
    ? valor as Registro
    : null;
}

function classificarErroProvedor(
  erro: unknown,
) {
  if (
    erro instanceof
      ErroResolvedorEmail
  ) {
    if (
      erro.codigo ===
        "PROVEDOR_NAO_CONFIGURADO" ||
      erro.codigo ===
        "PROVEDOR_CENTRAL_INVALIDO"
    ) {
      return "SMTP_NAO_CONFIGURADO";
    }

    return "PROVEDOR_INDISPONIVEL";
  }

  return "PROVEDOR_INDISPONIVEL";
}

function classificarErroEnvio(
  erro: unknown,
) {
  const codigo = texto(
    objeto(
      erro,
    ).code,
    80,
  ).toUpperCase();

  if (
    codigo.includes(
      "TIMEOUT",
    ) ||
    codigo.includes(
      "ETIMEDOUT",
    )
  ) {
    return "ENVIO_TIMEOUT";
  }

  return "ENVIO_RECUSADO";
}

async function registrarAuditoria(
  adminClient: ClienteSupabase,
  {
    usuarioId,
    usuarioEmail,
    acao,
    tenantId,
    targetUserId,
    membershipId,
    tentativaNumero,
    codigo,
  }: {
    usuarioId: string | null;
    usuarioEmail: string | null;
    acao: string;
    tenantId: string;
    targetUserId?: string;
    membershipId?: string;
    tentativaNumero?: number;
    codigo?: string;
  },
) {
  const dados: Registro = {
    tenantId,
  };

  if (
    targetUserId
  ) {
    dados.targetUserId = targetUserId;
  }

  if (
    membershipId
  ) {
    dados.membershipId = membershipId;
  }

  if (
    tentativaNumero
  ) {
    dados.tentativaNumero = tentativaNumero;
  }

  if (
    codigo
  ) {
    dados.codigo = codigo;
  }

  await adminClient
    .from(
      "auditoria_sistema",
    )
    .insert({
      usuario_id: usuarioId,
      usuario_email: usuarioEmail,
      acao,
      tabela: TABELA_ESTADO,
      registro_id: tenantId,
      descricao: "Fluxo de primeiro acesso do Administrador do Cliente.",
      dados,
    });
}

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

  const autorizacaoGlobal = (
    autorizacaoResultado.data ??
      []
  ).some(
    (
      linha,
    ) => {
      const perfil = texto(
        linha.perfil,
        60,
      ).toLowerCase();

      return (
        linha.acesso_global ===
          true ||
        perfil ===
          "admin" ||
        perfil ===
          "administrador"
      );
    },
  );

  if (
    autorizacaoGlobal
  ) {
    return true;
  }

  const appMetadata = objeto(
    authResultado
      .data
      ?.user
      ?.app_metadata,
  );

  return (
    appMetadata.acesso_global ===
      true ||
    appMetadata.admin_global ===
      true ||
    appMetadata.conta_mestre ===
      true
  );
}

async function marcarFalha(
  adminClient: ClienteSupabase,
  {
    envioId,
    tenantId,
    userId,
    codigo,
    tentativaNumero,
    executorId,
  }: {
    envioId: string;
    tenantId: string;
    userId: string;
    codigo: string;
    tentativaNumero: number;
    executorId: string;
  },
) {
  const agora = new Date()
    .toISOString();

  await Promise.all([
    adminClient
      .from(
        TABELA_ENVIOS,
      )
      .update({
        status: "FALHA",
        erro_codigo: codigo,
        atualizado_em: agora,
      })
      .eq(
        "id",
        envioId,
      ),

    adminClient
      .from(
        TABELA_ESTADO,
      )
      .update({
        status: "falha",
        envio_tentativas: tentativaNumero,
        ultimo_erro_codigo: codigo,
        atualizado_por: executorId,
        atualizado_em: agora,
      })
      .eq(
        "tenant_id",
        tenantId,
      )
      .eq(
        "user_id",
        userId,
      ),
  ]);
}

async function executarEnvio({
  userClient,
  adminClient,
  authUser,
  body,
}: {
  userClient: ClienteSupabase;
  adminClient: ClienteSupabase;
  authUser: {
    id: string;
    email?: string | null;
  };
  body: Registro;
}) {
  const {
    data: adminGlobal,
    error: adminGlobalError,
  } = await userClient.rpc(
    "usuario_admin_global",
  );

  if (
    adminGlobalError ||
    adminGlobal !== true
  ) {
    throw new ErroHttp(
      403,
      "PERMISSAO_NEGADA",
      "Apenas a Conta Mestre pode enviar o primeiro acesso do cliente.",
    );
  }

  const tenantId = texto(
    body.tenantId ??
      body.tenant_id,
    80,
  );

  const userId = texto(
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
    throw new ErroHttp(
      400,
      "CONFIGURACAO_INVALIDA",
      "Tenant ou usuário inválido.",
    );
  }

  const {
    data: tenant,
    error: tenantError,
  } = await adminClient
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

  const tenantSlug = texto(
    tenant.slug,
    100,
  ).toLowerCase();

  if (
    texto(
        tenant.status,
        30,
      ).toLowerCase() !==
      "ativo" ||
    !tenantSlug
  ) {
    throw new ErroHttp(
      409,
      "TENANT_INATIVO",
      "O cliente precisa estar ativo antes do primeiro acesso.",
    );
  }

  const {
    data: dominio,
    error: dominioError,
  } = await adminClient
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
    dominioError ||
    !dominio ||
    texto(
        dominio.status,
        30,
      ).toLowerCase() !==
      "ativo" ||
    !dominio.verificado_em
  ) {
    throw new ErroHttp(
      409,
      "DOMINIO_NAO_PRONTO",
      "O domínio principal do cliente ainda não está ativo e verificado.",
    );
  }

  const hostname = texto(
    dominio.hostname,
    253,
  ).toLowerCase();

  if (
    !hostname ||
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

  const {
    data: membership,
    error: membershipError,
  } = await adminClient
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
      "Membership do Administrador do Cliente não localizada.",
    );
  }

  const papel = texto(
    membership.papel,
    60,
  ).toLowerCase();

  const statusMembership = texto(
    membership.status,
    40,
  ).toLowerCase();

  if (
    !(
      papel ===
        "admin" ||
      papel ===
        "administrador"
    ) ||
    statusMembership !==
      "ativo"
  ) {
    throw new ErroHttp(
      409,
      "MEMBERSHIP_INVALIDA",
      "O primeiro acesso exige membership administrativa ativa.",
    );
  }

  const membershipId = texto(
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
      "Identificador da membership do cliente está inválido.",
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
      "Conta Mestre ou usuário global não pode participar deste fluxo.",
    );
  }

  const {
    data: targetAuth,
    error: targetAuthError,
  } = await adminClient
    .auth
    .admin
    .getUserById(
      userId,
    );

  const destinatario = email(
    targetAuth
      ?.user
      ?.email,
  );

  if (
    targetAuthError ||
    !targetAuth?.user?.id ||
    !emailValido(
      destinatario,
    )
  ) {
    throw new ErroHttp(
      409,
      "AUTH_INVALIDO",
      "Usuário Auth do Administrador do Cliente não está válido.",
    );
  }

  const {
    data: estadoAnterior,
    error: estadoAnteriorError,
  } = await adminClient
    .from(
      TABELA_ESTADO,
    )
    .select(
      "id,status,envio_tentativas",
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
    estadoAnteriorError
  ) {
    throw new ErroHttp(
      500,
      "ERRO_INTERNO",
      "Não foi possível consultar o estado do primeiro acesso.",
      false,
    );
  }

  if (
    estadoAnterior?.status ===
      "concluido"
  ) {
    throw new ErroHttp(
      409,
      "PRIMEIRO_ACESSO_CONCLUIDO",
      "O Administrador do Cliente já concluiu o primeiro acesso.",
    );
  }

  const tentativaNumero = Number(
    estadoAnterior
      ?.envio_tentativas ??
      0,
  ) + 1;

  if (
    !Number.isInteger(
      tentativaNumero,
    ) ||
    tentativaNumero < 1 ||
    tentativaNumero > 100
  ) {
    throw new ErroHttp(
      409,
      "LIMITE_REENVIO",
      "Limite de tentativas de primeiro acesso atingido.",
    );
  }

  const executorEmail = email(
    authUser.email,
  ) ||
    null;

  const agora = new Date()
    .toISOString();

  const {
    data: historico,
    error: historicoError,
  } = await adminClient
    .from(
      TABELA_ENVIOS,
    )
    .insert({
      tenant_id: tenantId,
      user_id: userId,
      membership_id: membershipId,
      destinatario_email: destinatario,
      tentativa_numero: tentativaNumero,
      status: "PREPARANDO",
      solicitado_por: authUser.id,
      solicitado_por_email: executorEmail,
      atualizado_em: agora,
    })
    .select(
      "id",
    )
    .single();

  if (
    historicoError ||
    !historico?.id
  ) {
    throw new ErroHttp(
      500,
      "HISTORICO_NAO_INICIADO",
      "Não foi possível iniciar o histórico do primeiro acesso.",
      false,
    );
  }

  const envioId = String(
    historico.id,
  );

  const {
    error: estadoInicialError,
  } = await adminClient
    .from(
      TABELA_ESTADO,
    )
    .upsert(
      {
        tenant_id: tenantId,
        user_id: userId,
        membership_id: membershipId,
        email: destinatario,
        status: "nao_enviado",
        envio_tentativas: tentativaNumero,
        ultimo_erro_codigo: null,
        criado_por: authUser.id,
        atualizado_por: authUser.id,
        atualizado_em: agora,
      },
      {
        onConflict: "tenant_id,user_id",
      },
    );

  if (
    estadoInicialError
  ) {
    await marcarFalha(
      adminClient,
      {
        envioId,
        tenantId,
        userId,
        codigo: "ERRO_INTERNO",
        tentativaNumero,
        executorId: authUser.id,
      },
    );

    throw new ErroHttp(
      500,
      "ERRO_INTERNO",
      "Não foi possível preparar o estado do primeiro acesso.",
      false,
    );
  }

  const redirectTo = URL_SAFESCAN +
    "?primeiro_acesso=1" +
    "&tenant=" +
    encodeURIComponent(
      tenantSlug,
    );

  const {
    data: linkData,
    error: linkError,
  } = await adminClient
    .auth
    .admin
    .generateLink({
      type: "recovery",
      email: destinatario,
      options: {
        redirectTo,
      },
    });

  const acaoUrl = texto(
    linkData
      ?.properties
      ?.action_link,
    5000,
  );

  if (
    linkError ||
    !acaoUrl
  ) {
    await marcarFalha(
      adminClient,
      {
        envioId,
        tenantId,
        userId,
        codigo: "LINK_NAO_GERADO",
        tentativaNumero,
        executorId: authUser.id,
      },
    );

    await registrarAuditoria(
      adminClient,
      {
        usuarioId: authUser.id,
        usuarioEmail: executorEmail,
        acao: "TENANT_FIRST_ACCESS_LINK_FAILED",
        tenantId,
        targetUserId: userId,
        membershipId: String(
          membershipId,
        ),
        tentativaNumero,
        codigo: "LINK_NAO_GERADO",
      },
    );

    throw new ErroHttp(
      500,
      "LINK_NAO_GERADO",
      "Não foi possível gerar o link seguro de primeiro acesso.",
      false,
    );
  }

  /*
   * O link Auth de uso único NÃO fica diretamente no botão do e-mail.
   *
   * O primeiro clique abre o domínio SafeScan.
   * O link Auth fica somente no fragmento (#) da URL, que não é enviado
   * ao servidor HTTP. A tela pública deve lê-lo em memória e limpar
   * imediatamente o fragmento da barra de endereço.
   * A tela exibirá um botão explícito "Continuar".
   * Somente esse segundo clique navegará para o link Auth.
   *
   * Isso reduz consumo acidental por scanners corporativos e evita
   * exposição do link Auth em access logs do servidor.
   */
  const linkSeguro = URL_SAFESCAN +
    "?primeiro_acesso_confirmar=1" +
    "&tenant=" +
    encodeURIComponent(
      tenantSlug,
    ) +
    "#confirmation_url=" +
    encodeURIComponent(
      acaoUrl,
    );

  let provedor: TransportadorEmailResolvido;

  try {
    provedor = await resolverTransportadorEmailParaEnvio(
      criarClienteRpcEmail(
        adminClient,
      ),
      {
        nomeRemetenteFallback: "SafeScan Brasil",
      },
    );
  } catch (erro) {
    const codigo = classificarErroProvedor(
      erro,
    );

    await marcarFalha(
      adminClient,
      {
        envioId,
        tenantId,
        userId,
        codigo,
        tentativaNumero,
        executorId: authUser.id,
      },
    );

    await registrarAuditoria(
      adminClient,
      {
        usuarioId: authUser.id,
        usuarioEmail: executorEmail,
        acao: "TENANT_FIRST_ACCESS_EMAIL_FAILED",
        tenantId,
        targetUserId: userId,
        membershipId: String(
          membershipId,
        ),
        tentativaNumero,
        codigo,
      },
    );

    throw new ErroHttp(
      502,
      codigo,
      "Serviço de e-mail indisponível para primeiro acesso.",
    );
  }

  const {
    error: enviandoError,
  } = await adminClient
    .from(
      TABELA_ENVIOS,
    )
    .update({
      status: "ENVIANDO",
      atualizado_em: new Date()
        .toISOString(),
    })
    .eq(
      "id",
      envioId,
    );

  if (
    enviandoError
  ) {
    try {
      provedor
        .transportador
        ?.close?.();
    } catch {
      // Fechamento best-effort.
    }

    await marcarFalha(
      adminClient,
      {
        envioId,
        tenantId,
        userId,
        codigo: "ERRO_INTERNO",
        tentativaNumero,
        executorId: authUser.id,
      },
    );

    throw new ErroHttp(
      500,
      "ERRO_INTERNO",
      "Não foi possível iniciar o envio rastreável.",
      false,
    );
  }

  const ambienteUrl = `https://${hostname}`;

  const assunto = "SafeScan Brasil — seu primeiro acesso está pronto";

  const textoEmail = [
    "Olá,",
    "",
    "Seu primeiro passo para uma gestão de SST mais eficiente começa aqui.",
    "",
    "O ambiente SafeScan da sua empresa está pronto para uso.",
    "Centralize equipes, documentos, treinamentos e evidências em um único ambiente, com mais organização, agilidade e rastreabilidade.",
    "",
    "Use o link seguro abaixo para criar sua senha e concluir seu primeiro acesso:",
    "",
    linkSeguro,
    "",
    `Ambiente da empresa: ${ambienteUrl}`,
    "",
    "Seu acesso é individual e protegido.",
    "Antes de criar sua senha, a página SafeScan solicitará uma confirmação adicional de segurança.",
    "",
    "Se você não reconhece este convite, não prossiga.",
    "",
    "SafeScan Brasil",
    "Gestão de SST mais organizada, ágil e rastreável.",
  ].join(
    "\n",
  );

  const htmlEmail = `
<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:0;background:#f2f6f4;font-family:Arial,Helvetica,sans-serif;color:#17201c;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#f2f6f4;margin:0;padding:0;">
      <tr>
        <td align="center" style="padding:32px 14px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:640px;background:#ffffff;border:1px solid #dfe8e3;border-radius:20px;overflow:hidden;">

            <tr>
              <td
                bgcolor="#06291d"
                background="https://www.safescanbrasil.com.br/email/primeiro-acesso-hero.png"
                style="background-color:#06291d;background-image:linear-gradient(90deg,rgba(3,35,24,.98) 0%,rgba(3,35,24,.91) 50%,rgba(3,35,24,.50) 100%),url('https://www.safescanbrasil.com.br/email/primeiro-acesso-hero.png');background-size:cover;background-position:center right;background-repeat:no-repeat;padding:0;"
              >
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="padding:30px 32px 32px;">

                      <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td width="42" height="42" align="center" valign="middle" style="width:42px;height:42px;border:1px solid #1d6b50;border-radius:12px;background:#0a3b2a;color:#6ee7b7;font-size:20px;font-weight:700;">
                            &#10003;
                          </td>

                          <td style="padding-left:14px;">
                            <div style="font-size:11px;font-weight:800;letter-spacing:1.8px;color:#6ee7b7;">
                              SAFESCAN BRASIL
                            </div>
                          </td>
                        </tr>
                      </table>

                      <div style="margin-top:20px;font-size:28px;line-height:1.18;font-weight:800;color:#ffffff;">
                        Seu primeiro passo para uma gestão de SST mais eficiente
                      </div>

                      <div style="margin-top:12px;max-width:500px;font-size:14px;line-height:1.6;color:#d7f4e8;">
                        Mais organização, agilidade e rastreabilidade para a rotina da sua empresa.
                      </div>

                      <div style="margin-top:18px;width:64px;height:4px;background:#10d99a;border-radius:4px;font-size:0;line-height:0;">
                        &nbsp;
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:32px;">

                <p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#27342e;">
                  Olá,
                </p>

                <p style="margin:0 0 10px;font-size:18px;line-height:1.5;font-weight:700;color:#10251c;">
                  Seu ambiente SafeScan está pronto.
                </p>

                <p style="margin:0 0 24px;font-size:14px;line-height:1.75;color:#526159;">
                  A partir de agora, sua empresa conta com um ambiente preparado para centralizar equipes, documentos, treinamentos e evidências, tornando a gestão de SST mais organizada e rastreável.
                </p>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;margin:0 0 26px;background:#f7faf8;border:1px solid #e1ebe6;border-radius:14px;">
                  <tr>
                    <td style="padding:17px 18px;">

                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td width="22" valign="top" style="width:22px;color:#059669;font-size:15px;font-weight:700;">
                            &#10003;
                          </td>
                          <td style="padding-bottom:10px;font-size:13px;line-height:1.5;color:#34463d;">
                            Equipes e documentos centralizados
                          </td>
                        </tr>

                        <tr>
                          <td width="22" valign="top" style="width:22px;color:#059669;font-size:15px;font-weight:700;">
                            &#10003;
                          </td>
                          <td style="padding-bottom:10px;font-size:13px;line-height:1.5;color:#34463d;">
                            Treinamentos e evidências organizados
                          </td>
                        </tr>

                        <tr>
                          <td width="22" valign="top" style="width:22px;color:#059669;font-size:15px;font-weight:700;">
                            &#10003;
                          </td>
                          <td style="font-size:13px;line-height:1.5;color:#34463d;">
                            Mais rastreabilidade para a gestão de SST
                          </td>
                        </tr>
                      </table>

                    </td>
                  </tr>
                </table>

                <p style="margin:0 0 12px;font-size:14px;line-height:1.7;color:#526159;">
                  Para começar, crie sua senha individual e conclua o primeiro acesso:
                </p>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;margin:0 0 12px;">
                  <tr>
                    <td align="center" style="padding:4px 0;">
                      <a
                        href="${htmlSeguro(linkSeguro)}"
                        style="display:inline-block;background:#079b70;color:#ffffff;text-decoration:none;font-size:14px;font-weight:800;padding:14px 28px;border-radius:11px;"
                      >
                        Criar meu acesso
                      </a>
                    </td>
                  </tr>
                </table>

                <p style="margin:0 0 26px;text-align:center;font-size:11px;line-height:1.6;color:#849189;">
                  Antes da criação da senha, você verá uma etapa adicional de confirmação de segurança.
                </p>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;margin:0 0 24px;background:#f8faf9;border:1px solid #e3ebe7;border-radius:12px;">
                  <tr>
                    <td style="padding:15px 17px;">
                      <div style="font-size:10px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:#849189;">
                        Ambiente da empresa
                      </div>

                      <div style="margin-top:5px;font-size:13px;font-weight:700;line-height:1.5;color:#23372d;word-break:break-all;">
                        ${htmlSeguro(ambienteUrl)}
                      </div>
                    </td>
                  </tr>
                </table>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#fffaf0;border:1px solid #f3dfaa;border-radius:12px;">
                  <tr>
                    <td style="padding:15px 17px;">
                      <div style="font-size:10px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:#9a6b16;">
                        Segurança
                      </div>

                      <div style="margin-top:6px;font-size:12px;line-height:1.65;color:#6c5a38;">
                        Seu acesso é individual e protegido. Se você não reconhece este convite, não utilize o botão acima.
                      </div>
                    </td>
                  </tr>
                </table>

              </td>
            </tr>

            <tr>
              <td align="center" style="border-top:1px solid #e8eeeb;background:#fafcfb;padding:20px 24px;">
                <div style="font-size:11px;font-weight:700;color:#65756c;">
                  SafeScan Brasil
                </div>

                <div style="margin-top:4px;font-size:10px;line-height:1.5;color:#97a39c;">
                  Gestão de SST mais organizada, ágil e rastreável.
                </div>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`.trim();
  let resultadoEnvio: {
    messageId?: unknown;
  };

  try {
    resultadoEnvio = await provedor
      .transportador
      .sendMail({
        from: `"${
          nomeCabecalho(
            provedor
              .remetenteNomePadrao ||
              "SafeScan Brasil",
          )
        }" <${provedor.remetenteEmail}>`,

        to: destinatario,

        subject: assunto,

        text: textoEmail,

        html: htmlEmail,

        ...(provedor
            .responderParaPadrao
          ? {
            replyTo: provedor
              .responderParaPadrao,
          }
          : {}),
      });
  } catch (erro) {
    const codigo = classificarErroEnvio(
      erro,
    );

    await marcarFalha(
      adminClient,
      {
        envioId,
        tenantId,
        userId,
        codigo,
        tentativaNumero,
        executorId: authUser.id,
      },
    );

    await registrarAuditoria(
      adminClient,
      {
        usuarioId: authUser.id,
        usuarioEmail: executorEmail,
        acao: "TENANT_FIRST_ACCESS_EMAIL_FAILED",
        tenantId,
        targetUserId: userId,
        membershipId: String(
          membershipId,
        ),
        tentativaNumero,
        codigo,
      },
    );

    throw new ErroHttp(
      502,
      codigo,
      "Não foi possível entregar o e-mail de primeiro acesso.",
    );
  } finally {
    try {
      provedor
        .transportador
        ?.close?.();
    } catch {
      // Fechamento best-effort.
    }
  }

  const agoraFinal = new Date()
    .toISOString();

  const messageId = texto(
    resultadoEnvio
      ?.messageId,
    500,
  ) ||
    null;

  const [
    historicoFinal,
    estadoFinal,
  ] = await Promise.all([
    adminClient
      .from(
        TABELA_ENVIOS,
      )
      .update({
        status: "ENVIADO",
        erro_codigo: null,
        provedor_mensagem_id: messageId,
        enviado_em: agoraFinal,
        atualizado_em: agoraFinal,
      })
      .eq(
        "id",
        envioId,
      ),

    adminClient
      .from(
        TABELA_ESTADO,
      )
      .upsert(
        {
          tenant_id: tenantId,
          user_id: userId,
          membership_id: membershipId,
          email: destinatario,
          status: "enviado",
          envio_tentativas: tentativaNumero,
          ultimo_envio_em: agoraFinal,
          concluido_em: null,
          ultimo_erro_codigo: null,
          criado_por: authUser.id,
          atualizado_por: authUser.id,
          atualizado_em: agoraFinal,
        },
        {
          onConflict: "tenant_id,user_id",
        },
      ),
  ]);

  if (
    historicoFinal.error ||
    estadoFinal.error
  ) {
    throw new ErroHttp(
      500,
      "HISTORICO_INCOMPLETO",
      "O e-mail foi aceito pelo provedor, mas o histórico não pôde ser concluído.",
      false,
    );
  }

  await registrarAuditoria(
    adminClient,
    {
      usuarioId: authUser.id,
      usuarioEmail: executorEmail,
      acao: "TENANT_FIRST_ACCESS_EMAIL_SENT",
      tenantId,
      targetUserId: userId,
      membershipId: String(
        membershipId,
      ),
      tentativaNumero,
    },
  );

  return resposta(
    200,
    {
      ok: true,
      status: "enviado",
      tentativaNumero,
    },
  );
}

async function executarConclusao({
  userClient,
  adminClient,
  authUser,
  body,
}: {
  userClient: ClienteSupabase;
  adminClient: ClienteSupabase;
  authUser: {
    id: string;
    email?: string | null;
    app_metadata?: Registro;
  };
  body: Registro;
}) {
  const tenantSlug = texto(
    body.tenantSlug ??
      body.tenant_slug,
    100,
  ).toLowerCase();

  if (
    !tenantSlug
  ) {
    throw new ErroHttp(
      400,
      "TENANT_INVALIDO",
      "Tenant do primeiro acesso não informado.",
    );
  }

  if (
    await usuarioEhGlobal(
      adminClient,
      authUser.id,
    )
  ) {
    throw new ErroHttp(
      403,
      "ALVO_GLOBAL_BLOQUEADO",
      "Conta Mestre ou usuário global não pode concluir primeiro acesso de cliente.",
    );
  }

  const {
    data: tenant,
    error: tenantError,
  } = await adminClient
    .from(
      "tenants",
    )
    .select(
      "id,slug,status",
    )
    .eq(
      "slug",
      tenantSlug,
    )
    .maybeSingle();

  if (
    tenantError ||
    !tenant ||
    texto(
        tenant.status,
        30,
      ).toLowerCase() !==
      "ativo"
  ) {
    throw new ErroHttp(
      403,
      "TENANT_INVALIDO",
      "Ambiente do cliente não está disponível.",
    );
  }

  const tenantId = String(
    tenant.id,
  );

  const {
    data: membership,
    error: membershipError,
  } = await adminClient
    .from(
      "tenant_memberships",
    )
    .select(
      "id,papel,status",
    )
    .eq(
      "tenant_id",
      tenantId,
    )
    .eq(
      "user_id",
      authUser.id,
    )
    .maybeSingle();

  if (
    membershipError ||
    !membership
  ) {
    throw new ErroHttp(
      403,
      "MEMBERSHIP_INVALIDA",
      "Usuário não pertence ao cliente informado.",
    );
  }

  const papel = texto(
    membership.papel,
    60,
  ).toLowerCase();

  if (
    !(
      papel ===
        "admin" ||
      papel ===
        "administrador"
    ) ||
    texto(
        membership.status,
        40,
      ).toLowerCase() !==
      "ativo"
  ) {
    throw new ErroHttp(
      403,
      "MEMBERSHIP_INVALIDA",
      "Usuário não possui membership administrativa ativa.",
    );
  }

  const membershipId = texto(
    membership.id,
    80,
  );

  if (
    !uuidValido(
      membershipId,
    )
  ) {
    throw new ErroHttp(
      403,
      "MEMBERSHIP_INVALIDA",
      "Identificador da membership do cliente está inválido.",
    );
  }

  const {
    data: estado,
    error: estadoError,
  } = await adminClient
    .from(
      TABELA_ESTADO,
    )
    .select(
      "id,status",
    )
    .eq(
      "tenant_id",
      tenantId,
    )
    .eq(
      "user_id",
      authUser.id,
    )
    .eq(
      "membership_id",
      membershipId,
    )
    .maybeSingle();

  if (
    estadoError ||
    !estado ||
    estado.status !==
      "enviado"
  ) {
    throw new ErroHttp(
      403,
      "CONVITE_INVALIDO",
      "Convite de primeiro acesso não está válido para conclusão.",
    );
  }

  const authAtual = await adminClient
    .auth
    .admin
    .getUserById(
      authUser.id,
    );

  if (
    authAtual.error ||
    !authAtual.data?.user
  ) {
    throw new ErroHttp(
      500,
      "AUTH_INDISPONIVEL",
      "Não foi possível validar o usuário Auth.",
      false,
    );
  }

  const metadataAnterior = objeto(
    authAtual
      .data
      .user
      .app_metadata,
  );

  const {
    error: metadataError,
  } = await adminClient
    .auth
    .admin
    .updateUserById(
      authUser.id,
      {
        app_metadata: {
          ...metadataAnterior,
          precisa_trocar_senha: false,
          primeiro_acesso_cliente_concluido: true,
        },
      },
    );

  if (
    metadataError
  ) {
    throw new ErroHttp(
      500,
      "AUTH_METADATA_NAO_ATUALIZADA",
      "Não foi possível concluir o estado de autenticação.",
      false,
    );
  }

  const {
    data: conclusao,
    error: conclusaoError,
  } = await userClient.rpc(
    "cliente_concluir_primeiro_acesso",
    {
      p_tenant_slug: tenantSlug,
    },
  );

  if (
    conclusaoError
  ) {
    const rollbackMetadata = await adminClient
      .auth
      .admin
      .updateUserById(
        authUser.id,
        {
          app_metadata: metadataAnterior,
        },
      );

    if (
      rollbackMetadata.error
    ) {
      throw new ErroHttp(
        500,
        "ROLLBACK_AUTH_METADATA_FALHOU",
        "Falha ao concluir o primeiro acesso e ao restaurar o estado Auth.",
        false,
      );
    }

    throw new ErroHttp(
      403,
      "CONCLUSAO_NEGADA",
      conclusaoError.message ||
        "Não foi possível concluir o primeiro acesso.",
    );
  }

  const linha = primeiroRegistro(
    conclusao,
  );

  if (
    !linha ||
    linha.ok !==
      true
  ) {
    throw new ErroHttp(
      500,
      "CONCLUSAO_INCOMPLETA",
      "A conclusão não retornou confirmação válida.",
      false,
    );
  }

  return resposta(
    200,
    {
      ok: true,
      status: "concluido",
      tenantSlug: texto(
        linha.tenant_slug,
        100,
      ),
      hostname: texto(
        linha.hostname,
        253,
      ),
    },
  );
}

Deno.serve(
  async (
    req,
  ) => {
    if (
      req.method ===
        "OPTIONS"
    ) {
      return new Response(
        "ok",
        {
          headers: CORS,
        },
      );
    }

    if (
      req.method !==
        "POST"
    ) {
      return resposta(
        405,
        {
          ok: false,
          codigo: "METODO_INVALIDO",
          erro: "Método não permitido.",
        },
      );
    }

    const supabaseUrl = Deno.env.get(
      "SUPABASE_URL",
    ) ||
      "";

    const anonKey = Deno.env.get(
      "SUPABASE_ANON_KEY",
    ) ||
      "";

    const serviceRoleKey = Deno.env.get(
      "SUPABASE_SERVICE_ROLE_KEY",
    ) ||
      "";

    if (
      !supabaseUrl ||
      !anonKey ||
      !serviceRoleKey
    ) {
      return resposta(
        500,
        {
          ok: false,
          codigo: "CONFIGURACAO_INVALIDA",
          erro: "Configuração interna indisponível.",
        },
      );
    }

    const authorization = req.headers.get(
      "Authorization",
    ) ||
      "";

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
          ok: false,
          codigo: "NAO_AUTENTICADO",
          erro: "Sessão autenticada obrigatória.",
        },
      );
    }

    const userClient = criarClienteSupabase(
      supabaseUrl,
      anonKey,
      authorization,
    );

    const adminClient = criarClienteSupabase(
      supabaseUrl,
      serviceRoleKey,
    );

    const {
      data: authData,
      error: authError,
    } = await userClient
      .auth
      .getUser();

    if (
      authError ||
      !authData?.user?.id
    ) {
      return resposta(
        401,
        {
          ok: false,
          codigo: "NAO_AUTENTICADO",
          erro: "Sessão inválida.",
        },
      );
    }

    let body: Registro;

    try {
      body = objeto(
        await req.json(),
      );
    } catch {
      return resposta(
        400,
        {
          ok: false,
          codigo: "JSON_INVALIDO",
          erro: "Payload inválido.",
        },
      );
    }

    const modo = texto(
      body.modo,
      40,
    ).toLowerCase();

    try {
      if (
        modo ===
          "enviar"
      ) {
        return await executarEnvio({
          userClient,
          adminClient,
          authUser: authData.user,
          body,
        });
      }

      if (
        modo ===
          "concluir"
      ) {
        return await executarConclusao({
          userClient,
          adminClient,
          authUser: authData.user,
          body,
        });
      }

      throw new ErroHttp(
        400,
        "MODO_INVALIDO",
        "Modo de operação inválido.",
      );
    } catch (erro) {
      const tratado = erro instanceof ErroHttp ? erro : new ErroHttp(
        500,
        "ERRO_INTERNO",
        "Falha interna no primeiro acesso.",
        false,
      );

      return resposta(
        tratado.status,
        {
          ok: false,
          codigo: tratado.codigo,
          erro: tratado.publico
            ? tratado.message
            : "Não foi possível concluir a operação de primeiro acesso.",
        },
      );
    }
  },
);
