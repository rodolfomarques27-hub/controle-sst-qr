import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

import {
  criarTransportadorSmtp,
  normalizarConfiguracaoSmtpPrivada,
} from "../_shared/emailProvedorResolver.ts";

type Registro = Record<string, unknown>;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ACOES = new Set(["obter", "salvar", "testar", "desativar"]);
const CAMPOS_IDENTIDADE_PROIBIDOS = [
  "userId",
  "user_id",
  "executorId",
  "executor_id",
] as const;
const PROVEDORES = new Set([
  "GMAIL_SMTP",
  "MICROSOFT_365_SMTP",
  "SMTP_PERSONALIZADO",
]);
const MODOS_SEGURANCA = new Set(["TLS_IMPLICITO", "STARTTLS"]);
const CODIGOS_SMTP = new Set([
  "SMTP_AUTENTICACAO_FALHOU",
  "SMTP_TIMEOUT",
  "SMTP_CONEXAO_FALHOU",
  "SMTP_TLS_FALHOU",
  "SMTP_TESTE_FALHOU",
]);
const REGEX_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

function resposta(status: number, dados: Registro) {
  return new Response(JSON.stringify(dados), {
    status,
    headers: {
      ...CORS,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function objeto(valor: unknown): Registro {
  return valor && typeof valor === "object" && !Array.isArray(valor)
    ? valor as Registro
    : {};
}

function primeiroRegistro(valor: unknown): Registro | null {
  if (Array.isArray(valor)) {
    const primeiro = valor[0];
    return primeiro && typeof primeiro === "object"
      ? primeiro as Registro
      : null;
  }

  return valor && typeof valor === "object"
    ? valor as Registro
    : null;
}

function texto(valor: unknown, limite = 1000) {
  if (typeof valor !== "string" && typeof valor !== "number") {
    return "";
  }

  return String(valor).replace(/\0/g, "").trim().slice(0, limite);
}

function inteiroOuNulo(valor: unknown) {
  if (valor === null || valor === undefined || valor === "") {
    return null;
  }

  const numero = Number(valor);
  return Number.isInteger(numero) ? numero : null;
}

function booleano(valor: unknown) {
  return valor === true || valor === "true";
}

function emailValido(valor: string) {
  return (
    valor.length >= 3 &&
    valor.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(valor)
  );
}

function normalizarAcao(valor: unknown) {
  return texto(valor, 50).toLowerCase();
}

function normalizarProvedor(valor: unknown) {
  return texto(valor, 80).toUpperCase();
}

function normalizarModo(valor: unknown) {
  return texto(valor, 50).toUpperCase();
}

function tenantIdObrigatorio(valor: unknown) {
  const tenantId = texto(valor, 100).toLowerCase();

  if (!REGEX_UUID.test(tenantId)) {
    throw new ErroHttp(
      400,
      "TENANT_INVALIDO",
      "Tenant não informado ou inválido.",
    );
  }

  return tenantId;
}

function versaoOpcional(valor: unknown) {
  if (valor === null || valor === undefined || valor === "") {
    return null;
  }

  const versao = inteiroOuNulo(valor);

  if (versao === null || versao < 1) {
    throw new ErroHttp(
      400,
      "CONFIGURACAO_INVALIDA",
      "Versão da configuração inválida.",
    );
  }

  return versao;
}

function versaoObrigatoria(valor: unknown) {
  const versao = versaoOpcional(valor);

  if (versao === null) {
    throw new ErroHttp(
      400,
      "CONFIGURACAO_INVALIDA",
      "Versão da configuração obrigatória.",
    );
  }

  return versao;
}

function credencialOpcional(valor: unknown) {
  if (valor === null || valor === undefined || valor === "") {
    return null;
  }

  if (typeof valor !== "string" || valor.length < 1 || valor.length > 500) {
    throw new ErroHttp(
      400,
      "CONFIGURACAO_INVALIDA",
      "Credencial SMTP inválida.",
    );
  }

  // Write-only: não aplicar trim(), não registrar e não devolver.
  return valor;
}

function rejeitarIdentidadeDoCliente(corpo: Registro) {
  const campo = CAMPOS_IDENTIDADE_PROIBIDOS.find((nome) =>
    Object.prototype.hasOwnProperty.call(corpo, nome)
  );

  if (campo) {
    throw new ErroHttp(
      400,
      "CONFIGURACAO_INVALIDA",
      "Identidade de usuário não pode ser informada pelo cliente.",
    );
  }
}

function parametrosConexao(corpo: Registro) {
  const provedor = normalizarProvedor(corpo.provedor);

  if (!PROVEDORES.has(provedor)) {
    throw new ErroHttp(
      400,
      "CONFIGURACAO_INVALIDA",
      "Provedor de e-mail inválido.",
    );
  }

  let modo = normalizarModo(corpo.modoSeguranca ?? corpo.modo_seguranca);
  let host = texto(corpo.host, 253).toLowerCase();
  let porta = inteiroOuNulo(corpo.porta);

  if (provedor === "GMAIL_SMTP") {
    if (!MODOS_SEGURANCA.has(modo)) {
      modo = "TLS_IMPLICITO";
    }

    host = "smtp.gmail.com";
    porta = modo === "TLS_IMPLICITO" ? 465 : 587;
  } else if (provedor === "MICROSOFT_365_SMTP") {
    host = "smtp.office365.com";
    porta = 587;
    modo = "STARTTLS";
  } else {
    if (!MODOS_SEGURANCA.has(modo)) {
      throw new ErroHttp(
        400,
        "CONFIGURACAO_INVALIDA",
        "Modo de segurança SMTP inválido.",
      );
    }

    if (!host || porta === null || porta < 1 || porta > 65535) {
      throw new ErroHttp(
        400,
        "CONFIGURACAO_INVALIDA",
        "Informe host e porta válidos para o SMTP personalizado.",
      );
    }
  }

  return { provedor, host, porta, modo };
}

function descricaoErro(
  erro: unknown,
  campos: Array<[string, number]>,
) {
  const registro = objeto(erro);
  const descricao = campos
    .map(([campo, limite]) => texto(registro[campo], limite))
    .join(" ")
    .toLowerCase();

  return { registro, descricao };
}

function contemAlgum(descricao: string, termos: string[]) {
  return termos.some((termo) => descricao.includes(termo));
}

function erroParecePermissao(erro: unknown) {
  const { registro, descricao } = descricaoErro(erro, [
    ["message", 500],
    ["details", 500],
  ]);

  return (
    registro.code === "42501" ||
    contemAlgum(descricao, [
      "permissão",
      "permissao",
      "sem permissão",
      "sem permissao",
    ])
  );
}

function erroPareceConfiguracaoInvalida(erro: unknown) {
  const { registro } = descricaoErro(erro, [
    ["message", 500],
    ["details", 500],
  ]);

  return registro.code === "22023";
}

function erroPareceConflito(erro: unknown) {
  const { descricao } = descricaoErro(erro, [
    ["message", 700],
    ["details", 700],
    ["hint", 500],
  ]);

  return contemAlgum(descricao, [
    "versão",
    "versao",
    "mudou",
    "alterada",
    "durante o teste",
  ]);
}

function erroPareceNaoConfigurado(erro: unknown) {
  const { descricao } = descricaoErro(erro, [
    ["message", 700],
    ["details", 700],
  ]);

  return contemAlgum(descricao, [
    "configuração smtp pessoal não localizada",
    "configuracao smtp pessoal nao localizada",
    "configuração smtp pessoal incompleta",
    "configuracao smtp pessoal incompleta",
    "credencial smtp própria",
    "credencial smtp propria",
  ]);
}

function erroRpc(erro: unknown, mensagem: string) {
  if (erroParecePermissao(erro)) {
    return new ErroHttp(
      403,
      "PERMISSAO_NEGADA",
      "Sem permissão para executar esta operação.",
    );
  }

  if (erroPareceConfiguracaoInvalida(erro)) {
    return new ErroHttp(
      400,
      "CONFIGURACAO_INVALIDA",
      texto(objeto(erro).message, 500) ||
        "A configuração informada é inválida.",
    );
  }

  if (erroPareceConflito(erro)) {
    return new ErroHttp(
      409,
      "CONFLITO_VERSAO",
      "A configuração foi alterada. Atualize os dados antes de continuar.",
    );
  }

  if (erroPareceNaoConfigurado(erro)) {
    return new ErroHttp(
      409,
      "PROVEDOR_NAO_CONFIGURADO",
      "Configure e salve uma credencial SMTP antes de continuar.",
    );
  }

  return new ErroHttp(500, "ERRO_INTERNO", mensagem, false);
}

function classificarErroSmtp(erro: unknown) {
  const { descricao } = descricaoErro(erro, [
    ["code", 100],
    ["responseCode", 100],
    ["command", 100],
    ["message", 700],
    ["response", 700],
  ]);

  const classificacoes = [
    {
      codigo: "SMTP_TIMEOUT",
      termos: ["timeout", "etimedout"],
    },
    {
      codigo: "SMTP_AUTENTICACAO_FALHOU",
      termos: ["535", "invalid login", "authentication", "credential", "eauth"],
    },
    {
      codigo: "SMTP_TLS_FALHOU",
      termos: ["certificate", "tls", "ssl"],
    },
    {
      codigo: "SMTP_CONEXAO_FALHOU",
      termos: [
        "econn",
        "enotfound",
        "eai_again",
        "network",
        "refused",
        "connect",
      ],
    },
  ];

  for (const classificacao of classificacoes) {
    if (contemAlgum(descricao, classificacao.termos)) {
      return classificacao.codigo;
    }
  }

  return "SMTP_TESTE_FALHOU";
}

function codigoSmtpSeguro(valor: string) {
  return CODIGOS_SMTP.has(valor) ? valor : "SMTP_TESTE_FALHOU";
}

function normalizarConfiguracaoSegura(valor: unknown) {
  const linha = primeiroRegistro(valor);

  if (!linha) {
    return null;
  }

  return {
    tenantId: texto(linha.tenant_id, 100) || null,
    userId: texto(linha.user_id, 100) || null,
    ativo: booleano(linha.ativo),
    provedor: texto(linha.provedor, 80) || null,
    host: texto(linha.host, 253) || null,
    porta: Number(linha.porta) || null,
    modoSeguranca: texto(linha.modo_seguranca, 40) || null,
    usuarioSmtp: texto(linha.usuario_smtp, 320) || null,
    remetenteEmail: texto(linha.remetente_email, 254) || null,
    remetenteNomePadrao: texto(linha.remetente_nome_padrao, 120) || null,
    responderParaPadrao: texto(linha.responder_para_padrao, 254) || null,
    credencialConfigurada: booleano(linha.credencial_configurada),
    ultimoTesteStatus: texto(linha.ultimo_teste_status, 40) || "NAO_TESTADO",
    ultimoTesteCodigo: texto(linha.ultimo_teste_codigo, 80) || null,
    ultimoTesteEm: texto(linha.ultimo_teste_em, 100) || null,
    ultimoTestePor: texto(linha.ultimo_teste_por, 100) || null,
    versao: Number(linha.versao) || null,
  };
}

async function obterConfiguracaoSegura(
  userClient: any,
  tenantId: string,
) {
  const { data, error } = await userClient.rpc(
    "usuario_obter_configuracao_email",
    { p_tenant_id: tenantId },
  );

  if (error) {
    throw erroRpc(
      error,
      "Não foi possível consultar a configuração pessoal de e-mail.",
    );
  }

  return normalizarConfiguracaoSegura(data);
}

async function acaoSalvar(
  corpo: Registro,
  tenantId: string,
  userClient: any,
) {
  const conexao = parametrosConexao(corpo);
  const usuarioSmtp = texto(
    corpo.usuarioSmtp ?? corpo.usuario_smtp,
    320,
  );
  const remetenteEmail = texto(
    corpo.remetenteEmail ?? corpo.remetente_email,
    254,
  ).toLowerCase();
  const remetenteNomePadrao = texto(
    corpo.remetenteNomePadrao ?? corpo.remetente_nome_padrao,
    120,
  );
  const responderParaPadrao = texto(
    corpo.responderParaPadrao ?? corpo.responder_para_padrao,
    254,
  ).toLowerCase();
  const versaoEsperada = versaoOpcional(
    corpo.versaoEsperada ?? corpo.versao_esperada,
  );
  const credencialNova = credencialOpcional(
    corpo.credencialNova ?? corpo.credencial_nova,
  );

  if (!usuarioSmtp || !emailValido(remetenteEmail) || !remetenteNomePadrao) {
    throw new ErroHttp(
      400,
      "CONFIGURACAO_INVALIDA",
      "Preencha os dados obrigatórios do provedor próprio.",
    );
  }

  if (responderParaPadrao && !emailValido(responderParaPadrao)) {
    throw new ErroHttp(
      400,
      "CONFIGURACAO_INVALIDA",
      "E-mail de resposta inválido.",
    );
  }

  const atual = await obterConfiguracaoSegura(userClient, tenantId);

  if (!atual && !credencialNova) {
    throw new ErroHttp(
      400,
      "CONFIGURACAO_INVALIDA",
      "Informe a credencial SMTP na primeira configuração.",
    );
  }

  const { error } = await userClient.rpc(
    "usuario_salvar_configuracao_email",
    {
      p_tenant_id: tenantId,
      p_provedor: conexao.provedor,
      p_host: conexao.host,
      p_porta: conexao.porta,
      p_modo_seguranca: conexao.modo,
      p_usuario_smtp: usuarioSmtp,
      p_remetente_email: remetenteEmail,
      p_remetente_nome_padrao: remetenteNomePadrao,
      p_responder_para_padrao: responderParaPadrao || null,
      p_credencial_nova: credencialNova,
      p_versao_esperada: versaoEsperada,
    },
  );

  if (error) {
    throw erroRpc(
      error,
      "Não foi possível salvar a configuração SMTP pessoal.",
    );
  }

  const configuracao = await obterConfiguracaoSegura(userClient, tenantId);

  return resposta(200, {
    ok: true,
    acao: "salvar",
    tenantId,
    configuracao,
  });
}

async function acaoTestar(
  tenantId: string,
  userId: string,
  adminClient: any,
  userClient: any,
) {
  const seguraAntes = await obterConfiguracaoSegura(userClient, tenantId);

  if (!seguraAntes || !seguraAntes.credencialConfigurada) {
    throw new ErroHttp(
      409,
      "PROVEDOR_NAO_CONFIGURADO",
      "Configure uma credencial SMTP pessoal antes de executar o teste.",
    );
  }

  const {
    data: configuracaoData,
    error: configuracaoError,
  } = await adminClient.rpc(
    "backend_obter_configuracao_email_usuario_para_teste",
    {
      p_tenant_id: tenantId,
      p_user_id: userId,
    },
  );

  if (configuracaoError) {
    throw erroRpc(
      configuracaoError,
      "Não foi possível preparar o teste SMTP pessoal.",
    );
  }

  const configuracao = normalizarConfiguracaoSmtpPrivada(
    configuracaoData,
    "USUARIO_CLIENTE",
  );

  if (!configuracao) {
    throw new ErroHttp(
      409,
      "PROVEDOR_NAO_CONFIGURADO",
      "Configure uma credencial SMTP pessoal antes de executar o teste.",
    );
  }

  let transportador: any = null;
  let codigoFalha: string | null = null;

  try {
    transportador = await criarTransportadorSmtp(configuracao);
    await transportador.verify();
  } catch (erro) {
    codigoFalha = codigoSmtpSeguro(classificarErroSmtp(erro));
  } finally {
    try {
      transportador?.close?.();
    } catch {
      // Fechamento best-effort sem log de credencial ou erro bruto.
    }
  }

  const statusTeste = codigoFalha ? "REPROVADO" : "APROVADO";

  const { error: registrarError } = await adminClient.rpc(
    "backend_registrar_teste_email_usuario",
    {
      p_tenant_id: tenantId,
      p_user_id: userId,
      p_status: statusTeste,
      p_codigo: codigoFalha,
      p_versao_esperada: configuracao.versao,
      p_executor_id: userId,
    },
  );

  if (registrarError) {
    throw erroRpc(
      registrarError,
      "Não foi possível registrar o resultado do teste SMTP pessoal.",
    );
  }

  const configuracaoSegura =
    await obterConfiguracaoSegura(userClient, tenantId);

  return resposta(200, {
    ok: true,
    acao: "testar",
    tenantId,
    teste: {
      status: statusTeste,
      codigo: codigoFalha,
    },
    configuracao: configuracaoSegura,
  });
}

async function acaoDesativar(
  corpo: Registro,
  tenantId: string,
  userClient: any,
) {
  const versaoEsperada = versaoObrigatoria(
    corpo.versaoEsperada ?? corpo.versao_esperada,
  );

  const { error } = await userClient.rpc(
    "usuario_desativar_configuracao_email",
    {
      p_tenant_id: tenantId,
      p_versao_esperada: versaoEsperada,
    },
  );

  if (error) {
    throw erroRpc(
      error,
      "Não foi possível desativar a configuração SMTP pessoal.",
    );
  }

  const configuracao = await obterConfiguracaoSegura(userClient, tenantId);

  return resposta(200, {
    ok: true,
    acao: "desativar",
    tenantId,
    configuracao,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  if (req.method !== "POST") {
    return resposta(405, {
      ok: false,
      codigo: "CONFIGURACAO_INVALIDA",
      erro: "Método não permitido.",
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!supabaseUrl || !anonKey || !serviceRole) {
      throw new ErroHttp(
        500,
        "ERRO_INTERNO",
        "Configuração interna indisponível.",
        false,
      );
    }

    const authorization = req.headers.get("Authorization") || "";

    if (!authorization.toLowerCase().startsWith("bearer ")) {
      throw new ErroHttp(
        401,
        "PERMISSAO_NEGADA",
        "Usuário não autenticado.",
      );
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: authorization,
        },
      },
    });

    const adminClient = createClient(supabaseUrl, serviceRole, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const {
      data: authData,
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !authData?.user) {
      throw new ErroHttp(
        401,
        "PERMISSAO_NEGADA",
        "Usuário autenticado não identificado.",
      );
    }

    let corpo: Registro;

    try {
      corpo = objeto(await req.json());
    } catch {
      throw new ErroHttp(
        400,
        "CONFIGURACAO_INVALIDA",
        "JSON inválido.",
      );
    }

    rejeitarIdentidadeDoCliente(corpo);

    const acao = normalizarAcao(corpo.acao);

    if (!ACOES.has(acao)) {
      throw new ErroHttp(
        400,
        "CONFIGURACAO_INVALIDA",
        "Ação de configuração de e-mail inválida.",
      );
    }

    const tenantId = tenantIdObrigatorio(
      corpo.tenantId ?? corpo.tenant_id,
    );

    if (acao === "obter") {
      const configuracao = await obterConfiguracaoSegura(
        userClient,
        tenantId,
      );

      return resposta(200, {
        ok: true,
        acao: "obter",
        tenantId,
        configuracao,
      });
    }

    if (acao === "salvar") {
      return await acaoSalvar(corpo, tenantId, userClient);
    }

    if (acao === "testar") {
      return await acaoTestar(
        tenantId,
        authData.user.id,
        adminClient,
        userClient,
      );
    }

    return await acaoDesativar(corpo, tenantId, userClient);
  } catch (erro) {
    const tratado = erro instanceof ErroHttp
      ? erro
      : new ErroHttp(
        500,
        "ERRO_INTERNO",
        "Não foi possível concluir a configuração pessoal de e-mail.",
        false,
      );

    return resposta(tratado.status, {
      ok: false,
      codigo: tratado.codigo,
      erro: tratado.publico
        ? tratado.message
        : "Não foi possível concluir a operação.",
    });
  }
});
