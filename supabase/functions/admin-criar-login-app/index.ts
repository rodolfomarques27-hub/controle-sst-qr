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
  if (perfil === "tecnico_de_seguranca" || perfil === "tecnico_seguranca") return "tecnico_sst";

  return PERFIS_VALIDOS.has(perfil) ? perfil : "consulta";
}

function extrairPermissao(data: unknown) {
  return Array.isArray(data) ? data[0] : data;
}

function usuarioPodeCriarLogin(permissao: any) {
  const ativo = normalizarBooleano(permissao?.ativo);
  const bloqueado = normalizarBooleano(permissao?.bloqueado);
  const perfil = normalizarPerfil(permissao?.perfil);
  const acessoGlobal = normalizarBooleano(permissao?.acesso_global);
  const permissoes = permissao?.permissoes && typeof permissao.permissoes === "object"
    ? permissao.permissoes
    : {};

  const acoesCriticas = permissoes?.acoesCriticas && typeof permissoes.acoesCriticas === "object"
    ? permissoes.acoesCriticas
    : {};
  const modulos = permissoes?.modulos && typeof permissoes.modulos === "object"
    ? permissoes.modulos
    : {};

  const podeGerenciarAcessos =
    normalizarBooleano(acoesCriticas?.gerenciar_permissoes) ||
    normalizarBooleano(modulos?.acessos_app?.gerenciar_permissoes) ||
    normalizarBooleano(modulos?.configuracoes?.gerenciar_permissoes);

  return Boolean(
    ativo &&
    !bloqueado &&
    (perfil === "administrador" || acessoGlobal || podeGerenciarAcessos)
  );
}

async function localizarUsuarioAuthPorEmail(adminClient: any, email: string) {
  let page = 1;
  const perPage = 1000;

  while (page <= 20) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });

    if (error) throw error;

    const usuarios = data?.users || [];
    const encontrado = usuarios.find((usuario: any) => normalizarEmail(usuario?.email) === email);

    if (encontrado) return encontrado;
    if (usuarios.length < perPage) break;

    page += 1;
  }

  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return respostaJson(405, {
      ok: false,
      erro: "Método não permitido. Use POST.",
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    return respostaJson(500, {
      ok: false,
      erro: "Variáveis SUPABASE_URL, SUPABASE_ANON_KEY ou SUPABASE_SERVICE_ROLE_KEY não configuradas na Edge Function.",
    });
  }

  const authorization = req.headers.get("Authorization") || "";

  if (!authorization.toLowerCase().startsWith("bearer ")) {
    return respostaJson(401, {
      ok: false,
      erro: "Usuário não autenticado. Faça login como administrador antes de criar acesso.",
    });
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { Authorization: authorization },
    },
  });

  const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data: authAtual, error: authError } = await userClient.auth.getUser();

  if (authError || !authAtual?.user) {
    return respostaJson(401, {
      ok: false,
      erro: authError?.message || "Não foi possível identificar o usuário autenticado.",
    });
  }

  const { data: permissaoData, error: permissaoError } = await userClient.rpc("usuario_permissao_sistema_atual");

  if (permissaoError) {
    return respostaJson(403, {
      ok: false,
      erro: permissaoError.message || "Não foi possível validar a permissão administrativa do usuário atual.",
    });
  }

  const permissaoAtual = extrairPermissao(permissaoData);

  if (!usuarioPodeCriarLogin(permissaoAtual)) {
    return respostaJson(403, {
      ok: false,
      erro: "Sem permissão para criar login do app. Ação restrita a administrador ou usuário com gerenciamento de permissões.",
    });
  }

  let body: any = {};

  try {
    body = await req.json();
  } catch {
    return respostaJson(400, {
      ok: false,
      erro: "Corpo da requisição inválido. Envie JSON.",
    });
  }

  const nome = normalizarTexto(body?.nome);
  const email = normalizarEmail(body?.email);
  const funcao = normalizarTexto(body?.funcao);
  const perfil = normalizarPerfil(body?.perfil);
  const senhaTemporaria = String(body?.senhaTemporaria ?? body?.senha_temporaria ?? "");
  const ativo = perfil === "bloqueado" ? false : normalizarBooleano(body?.ativo ?? true);
  const bloqueado = perfil === "bloqueado" ? true : normalizarBooleano(body?.bloqueado ?? false);
  const acessoGlobal = perfil === "administrador" ? normalizarBooleano(body?.acessoGlobal ?? body?.acesso_global ?? false) : false;
  const observacao = normalizarTexto(body?.observacao);
  const resetarSenhaTemporaria = normalizarBooleano(body?.resetarSenhaTemporaria ?? body?.resetar_senha_temporaria ?? false);

  if (!email || !email.includes("@")) {
    return respostaJson(400, {
      ok: false,
      erro: "Informe um e-mail válido para criar o login.",
    });
  }

  if (!nome) {
    return respostaJson(400, {
      ok: false,
      erro: "Informe o nome da pessoa.",
    });
  }

  if (!PERFIS_VALIDOS.has(perfil)) {
    return respostaJson(400, {
      ok: false,
      erro: "Perfil inválido para criação de acesso.",
    });
  }

  if (senhaTemporaria.length < 6) {
    return respostaJson(400, {
      ok: false,
      erro: "A senha temporária deve ter pelo menos 6 caracteres.",
    });
  }

  if (bloqueado && acessoGlobal) {
    return respostaJson(400, {
      ok: false,
      erro: "Usuário bloqueado não pode receber acesso global.",
    });
  }

  let usuarioAuth = null;
  let loginCriado = false;
  let senhaAtualizada = false;

  try {
    usuarioAuth = await localizarUsuarioAuthPorEmail(adminClient, email);

    if (!usuarioAuth) {
      const { data: novoUsuario, error: criarError } = await adminClient.auth.admin.createUser({
        email,
        password: senhaTemporaria,
        email_confirm: true,
        user_metadata: {
          nome,
          funcao,
          perfil,
          origem: "controle-sst-qr",
          criado_por: authAtual.user.id,
        },
        app_metadata: {
          precisa_trocar_senha: true,
          criado_por_configuracoes: authAtual.user.id,
        },
      });

      if (criarError) throw criarError;

      usuarioAuth = novoUsuario?.user || null;
      loginCriado = Boolean(usuarioAuth?.id);
    } else if (resetarSenhaTemporaria) {
      const { data: usuarioAtualizado, error: atualizarSenhaError } = await adminClient.auth.admin.updateUserById(usuarioAuth.id, {
        password: senhaTemporaria,
        user_metadata: {
          ...(usuarioAuth.user_metadata || {}),
          nome,
          funcao,
          perfil,
          atualizado_por: authAtual.user.id,
        },
        app_metadata: {
          ...(usuarioAuth.app_metadata || {}),
          precisa_trocar_senha: true,
          senha_temporaria_redefinida_por: authAtual.user.id,
        },
      });

      if (atualizarSenhaError) throw atualizarSenhaError;

      usuarioAuth = usuarioAtualizado?.user || usuarioAuth;
      senhaAtualizada = true;
    }

    const observacaoComHistorico = [
      observacao,
      loginCriado ? "Login criado no Supabase Auth pela Edge Function admin-criar-login-app." : "Login já existia no Supabase Auth.",
      senhaAtualizada ? "Senha temporária redefinida pela administração." : "",
    ]
      .filter(Boolean)
      .join(" | ");

    const { data: permissaoSalva, error: salvarPermissaoError } = await userClient.rpc("admin_salvar_usuario_permissao_sistema", {
      p_email: email,
      p_nome: nome,
      p_funcao: funcao,
      p_perfil: perfil,
      p_ativo: ativo,
      p_bloqueado: bloqueado,
      p_acesso_global: acessoGlobal,
      p_observacao: observacaoComHistorico,
    });

    if (salvarPermissaoError) {
      if (loginCriado && usuarioAuth?.id) {
        await adminClient.auth.admin.deleteUser(usuarioAuth.id);
      }

      return respostaJson(500, {
        ok: false,
        erro: salvarPermissaoError.message || "Login criado, mas não foi possível salvar a permissão. A criação foi revertida quando possível.",
      });
    }

    let permissaoAtualizada = Array.isArray(permissaoSalva) ? permissaoSalva[0] : permissaoSalva;

    if ((loginCriado || senhaAtualizada) && usuarioAuth?.id) {
      const { data: permissaoLogin, error: marcarLoginError } = await userClient.rpc("admin_marcar_login_app_criado_sistema", {
        p_email: email,
        p_user_id: usuarioAuth.id,
        p_precisa_trocar_senha: true,
      });

      if (marcarLoginError) {
        return respostaJson(500, {
          ok: false,
          erro: marcarLoginError.message || "Login criado, mas não foi possível marcar a troca obrigatória de senha no sistema.",
        });
      }

      permissaoAtualizada = Array.isArray(permissaoLogin) ? permissaoLogin[0] : permissaoLogin;
    }

    return respostaJson(200, {
      ok: true,
      mensagem: loginCriado
        ? "Login criado no Supabase Auth e permissão salva. O usuário deve trocar a senha temporária no primeiro acesso."
        : senhaAtualizada
          ? "Login já existia. Senha temporária redefinida e permissão atualizada."
          : "Login já existia no Supabase Auth. Permissão atualizada.",
      loginCriado,
      loginJaExistia: !loginCriado,
      senhaTemporariaDefinida: loginCriado || senhaAtualizada,
      precisaTrocarSenha: Boolean(permissaoAtualizada?.precisa_trocar_senha ?? (loginCriado || senhaAtualizada)),
      usuario: {
        id: usuarioAuth?.id || null,
        email,
        nome,
        funcao,
        perfil,
        ativo,
        bloqueado,
        acessoGlobal,
      },
      permissao: permissaoAtualizada,
    });
  } catch (error) {
    return respostaJson(500, {
      ok: false,
      erro: error?.message || "Não foi possível criar o login do app.",
    });
  }
});
