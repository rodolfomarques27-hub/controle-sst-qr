import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

import {
  criarTransportadorSmtp,
  ErroResolvedorEmail,
  normalizarConfiguracaoSmtpPrivada,
  resolverTransportadorEmailParaEnvio,
  type ConfiguracaoSmtpPrivada,
} from "../_shared/emailProvedorResolver.ts";

type Registro = Record<string, unknown>;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":
    "POST, OPTIONS",
};

const ACOES = new Set([
  "obter",
  "migrar_legado",
  "salvar",
  "testar",
  "ativar",
  "desativar",
]);

const PROVEDORES = new Set([
  "GMAIL_SMTP",
  "MICROSOFT_365_SMTP",
  "SMTP_PERSONALIZADO",
]);

const MODOS_SEGURANCA = new Set([
  "TLS_IMPLICITO",
  "STARTTLS",
]);

const CODIGOS_SMTP = new Set([
  "SMTP_AUTENTICACAO_FALHOU",
  "SMTP_TIMEOUT",
  "SMTP_CONEXAO_FALHOU",
  "SMTP_TLS_FALHOU",
  "SMTP_TESTE_FALHOU",
]);

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

    this.name =
      "ErroHttp";

    this.status =
      status;

    this.codigo =
      codigo;

    this.publico =
      publico;
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
        "Content-Type":
          "application/json; charset=utf-8",
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
    !Array.isArray(valor)
  )
    ? valor as Registro
    : {};
}

function primeiroRegistro(
  valor: unknown,
): Registro | null {
  if (
    Array.isArray(valor)
  ) {
    const primeiro =
      valor[0];

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

function textoCabecalho(
  valor: unknown,
  limite = 200,
) {
  return texto(
    valor,
    limite,
  )
    .replace(
      /[\r\n]+/g,
      " ",
    )
    .trim();
}

function booleano(
  valor: unknown,
) {
  return (
    valor === true ||
    valor === "true"
  );
}

function inteiroOuNulo(
  valor: unknown,
) {
  if (
    valor === null ||
    valor === undefined ||
    valor === ""
  ) {
    return null;
  }

  const numero =
    Number(
      valor,
    );

  return Number.isInteger(
    numero,
  )
    ? numero
    : null;
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

function codigoSmtpSeguro(
  valor: string,
) {
  return CODIGOS_SMTP.has(
    valor,
  )
    ? valor
    : "SMTP_TESTE_FALHOU";
}

function normalizarConfiguracaoSegura(
  valor: unknown,
) {
  const linha =
    primeiroRegistro(
      valor,
    );

  if (!linha) {
    return null;
  }

  return {
    id:
      texto(
        linha.id,
        100,
      ) || null,

    chave:
      texto(
        linha.chave,
        60,
      ) || null,

    provedor:
      texto(
        linha.provedor,
        80,
      ) || null,

    host:
      texto(
        linha.host,
        253,
      ) || null,

    porta:
      Number(
        linha.porta,
      ) || null,

    modoSeguranca:
      texto(
        linha.modo_seguranca,
        40,
      ) || null,

    usuarioSmtp:
      texto(
        linha.usuario_smtp,
        320,
      ) || null,

    remetenteEmail:
      texto(
        linha.remetente_email,
        254,
      ) || null,

    remetenteNomePadrao:
      texto(
        linha.remetente_nome_padrao,
        120,
      ) || null,

    responderParaPadrao:
      texto(
        linha.responder_para_padrao,
        254,
      ) || null,

    ativo:
      booleano(
        linha.ativo,
      ),

    credencialConfigurada:
      booleano(
        linha.credencial_configurada,
      ),

    ultimoTesteStatus:
      texto(
        linha.ultimo_teste_status,
        40,
      ) || "NAO_TESTADO",

    ultimoTesteCodigo:
      texto(
        linha.ultimo_teste_codigo,
        80,
      ) || null,

    ultimoTesteEm:
      texto(
        linha.ultimo_teste_em,
        100,
      ) || null,

    ultimoTestePor:
      texto(
        linha.ultimo_teste_por,
        100,
      ) || null,

    versao:
      Number(
        linha.versao,
      ) || null,

    atualizadoEm:
      texto(
        linha.atualizado_em,
        100,
      ) || null,

    atualizadoPor:
      texto(
        linha.atualizado_por,
        100,
      ) || null,
  };
}

function normalizarAcao(
  valor: unknown,
) {
  return texto(
    valor,
    50,
  ).toLowerCase();
}

function normalizarProvedor(
  valor: unknown,
) {
  return texto(
    valor,
    80,
  ).toUpperCase();
}

function normalizarModo(
  valor: unknown,
) {
  return texto(
    valor,
    40,
  ).toUpperCase();
}

function parametrosConexao(
  corpo: Registro,
) {
  const provedor =
    normalizarProvedor(
      corpo.provedor,
    );

  if (
    !PROVEDORES.has(
      provedor,
    )
  ) {
    throw new ErroHttp(
      400,
      "CONFIGURACAO_INVALIDA",
      "Provedor de e-mail inválido.",
    );
  }

  let modo =
    normalizarModo(
      corpo.modoSeguranca ??
        corpo.modo_seguranca,
    );

  let host =
    texto(
      corpo.host,
      253,
    ).toLowerCase();

  let porta =
    inteiroOuNulo(
      corpo.porta,
    );

  if (
    provedor ===
      "GMAIL_SMTP"
  ) {
    if (
      !MODOS_SEGURANCA.has(
        modo,
      )
    ) {
      modo =
        "TLS_IMPLICITO";
    }

    host =
      "smtp.gmail.com";

    porta =
      modo ===
        "TLS_IMPLICITO"
        ? 465
        : 587;
  } else if (
    provedor ===
      "MICROSOFT_365_SMTP"
  ) {
    host =
      "smtp.office365.com";

    porta =
      587;

    modo =
      "STARTTLS";
  } else {
    if (
      !MODOS_SEGURANCA.has(
        modo,
      )
    ) {
      throw new ErroHttp(
        400,
        "CONFIGURACAO_INVALIDA",
        "Modo de segurança SMTP inválido.",
      );
    }

    if (
      !host ||
      porta === null
    ) {
      throw new ErroHttp(
        400,
        "CONFIGURACAO_INVALIDA",
        "Informe host e porta do SMTP personalizado.",
      );
    }
  }

  return {
    provedor,
    host,
    porta,
    modo,
  };
}

function versaoObrigatoria(
  valor: unknown,
) {
  const versao =
    inteiroOuNulo(
      valor,
    );

  if (
    versao === null ||
    versao < 1
  ) {
    throw new ErroHttp(
      400,
      "CONFIGURACAO_INVALIDA",
      "Versão da configuração inválida.",
    );
  }

  return versao;
}

function erroPareceConflito(
  erro: unknown,
) {
  const registro =
    objeto(
      erro,
    );

  const descricao =
    [
      texto(
        registro.message,
        500,
      ),
      texto(
        registro.details,
        500,
      ),
      texto(
        registro.hint,
        500,
      ),
    ]
      .join(
        " ",
      )
      .toLowerCase();

  return (
    descricao.includes(
      "versão",
    ) ||
    descricao.includes(
      "versao",
    ) ||
    descricao.includes(
      "mudou",
    ) ||
    descricao.includes(
      "alterada",
    )
  );
}

function erroRpc(
  erro: unknown,
  mensagem: string,
) {
  if (
    erroPareceConflito(
      erro,
    )
  ) {
    return new ErroHttp(
      409,
      "CONFLITO_VERSAO",
      "A configuração foi alterada. Atualize os dados antes de continuar.",
    );
  }

  return new ErroHttp(
    500,
    "ERRO_INTERNO",
    mensagem,
    false,
  );
}

function classificarErroSmtp(
  erro: unknown,
) {
  const registro =
    objeto(
      erro,
    );

  const descricao =
    [
      texto(
        registro.code,
        100,
      ),
      texto(
        registro.message,
        500,
      ),
      texto(
        registro.response,
        500,
      ),
      texto(
        registro.responseCode,
        100,
      ),
      texto(
        registro.command,
        100,
      ),
    ]
      .join(
        " ",
      )
      .toLowerCase();

  if (
    descricao.includes(
      "timeout",
    ) ||
    descricao.includes(
      "etimedout",
    )
  ) {
    return "SMTP_TIMEOUT";
  }

  if (
    descricao.includes(
      "535",
    ) ||
    descricao.includes(
      "invalid login",
    ) ||
    descricao.includes(
      "authentication",
    ) ||
    descricao.includes(
      "credential",
    ) ||
    descricao.includes(
      "eauth",
    )
  ) {
    return "SMTP_AUTENTICACAO_FALHOU";
  }

  if (
    descricao.includes(
      "certificate",
    ) ||
    descricao.includes(
      "tls",
    ) ||
    descricao.includes(
      "ssl",
    )
  ) {
    return "SMTP_TLS_FALHOU";
  }

  if (
    descricao.includes(
      "econn",
    ) ||
    descricao.includes(
      "enotfound",
    ) ||
    descricao.includes(
      "eai_again",
    ) ||
    descricao.includes(
      "network",
    ) ||
    descricao.includes(
      "refused",
    ) ||
    descricao.includes(
      "connect",
    )
  ) {
    return "SMTP_CONEXAO_FALHOU";
  }

  return "SMTP_TESTE_FALHOU";
}

async function podeGerenciar(
  userClient: any,
) {
  const {
    data,
    error,
  } =
    await userClient.rpc(
      "usuario_pode_gerenciar_provedor_email",
    );

  if (error) {
    return false;
  }

  if (
    data === true
  ) {
    return true;
  }

  if (
    Array.isArray(
      data,
    )
  ) {
    return (
      data[0] === true
    );
  }

  return false;
}

async function obterConfiguracaoSegura(
  userClient: any,
) {
  const {
    data,
    error,
  } =
    await userClient.rpc(
      "admin_obter_configuracao_provedor_email",
    );

  if (error) {
    throw new ErroHttp(
      500,
      "ERRO_INTERNO",
      "Não foi possível consultar a configuração do provedor.",
      false,
    );
  }

  return normalizarConfiguracaoSegura(
    data,
  );
}

async function obterConfiguracaoLegadaParaMigracao():
  Promise<ConfiguracaoSmtpPrivada | null> {
  const capturadas:
    ConfiguracaoSmtpPrivada[] =
      [];

  try {
    await resolverTransportadorEmailParaEnvio(
      {
        rpc:
          async () => ({
            data:
              null,

            error:
              null,
          }),
      },
      {
        nomeRemetenteFallback:
          "SafeScan Brasil",

        criarTransportador:
          async (
            configuracao,
          ) => {
            capturadas.push(
              configuracao,
            );

            return {
              close() {
                // transportador fake: nenhuma conexão SMTP
              },
            };
          },
      },
    );
  } catch (
    erro
  ) {
    if (
      erro instanceof
        ErroResolvedorEmail &&
      erro.codigo ===
        "PROVEDOR_NAO_CONFIGURADO"
    ) {
      return null;
    }

    throw new ErroHttp(
      500,
      "ERRO_INTERNO",
      "Não foi possível preparar a migração segura do provedor atual.",
      false,
    );
  }

  const configuracao =
    capturadas[0] ??
    null;

  if (
    !configuracao ||
    configuracao.origem !==
      "LEGADO_GMAIL"
  ) {
    return null;
  }

  return configuracao;
}

async function acaoMigrarLegado(
  adminClient: any,
  userClient: any,
  executorId: string,
) {
  const existente =
    await obterConfiguracaoSegura(
      userClient,
    );

  if (existente) {
    throw new ErroHttp(
      409,
      "PROVEDOR_JA_CONFIGURADO",
      "Já existe uma configuração central. A importação automática foi bloqueada.",
    );
  }

  const configuracaoLegada =
    await obterConfiguracaoLegadaParaMigracao();

  if (!configuracaoLegada) {
    throw new ErroHttp(
      409,
      "PROVEDOR_LEGADO_INDISPONIVEL",
      "A configuração Gmail atualmente utilizada não está disponível para migração.",
    );
  }

  const {
    error,
  } =
    await adminClient.rpc(
      "backend_salvar_configuracao_provedor_email",
      {
        p_provedor:
          configuracaoLegada.provedor,

        p_host:
          configuracaoLegada.host,

        p_porta:
          configuracaoLegada.porta,

        p_modo_seguranca:
          configuracaoLegada.modoSeguranca,

        p_usuario_smtp:
          configuracaoLegada.usuarioSmtp,

        p_remetente_email:
          configuracaoLegada.remetenteEmail,

        p_remetente_nome_padrao:
          configuracaoLegada.remetenteNomePadrao,

        p_responder_para_padrao:
          configuracaoLegada.responderParaPadrao,

        p_credencial_nova:
          configuracaoLegada.credencial,

        p_versao_esperada:
          null,

        p_executor_id:
          executorId,
      },
    );

  if (error) {
    throw erroRpc(
      error,
      "Não foi possível importar a configuração Gmail atualmente utilizada.",
    );
  }

  const configuracao =
    await obterConfiguracaoSegura(
      userClient,
    );

  if (
    !configuracao ||
    configuracao.ativo ||
    !configuracao.credencialConfigurada ||
    configuracao.ultimoTesteStatus !==
      "NAO_TESTADO"
  ) {
    throw new ErroHttp(
      500,
      "ERRO_INTERNO",
      "A configuração importada não ficou no estado seguro esperado.",
      false,
    );
  }

  return resposta(
    200,
    {
      ok:
        true,

      acao:
        "migrar_legado",

      configuracao,
    },
  );
}
async function acaoSalvar(
  corpo: Registro,
  adminClient: any,
  userClient: any,
  executorId: string,
) {
  const conexao =
    parametrosConexao(
      corpo,
    );

  const usuarioSmtp =
    texto(
      corpo.usuarioSmtp ??
        corpo.usuario_smtp,
      320,
    );

  const remetenteEmail =
    texto(
      corpo.remetenteEmail ??
        corpo.remetente_email,
      254,
    ).toLowerCase();

  const remetenteNomePadrao =
    textoCabecalho(
      corpo.remetenteNomePadrao ??
        corpo.remetente_nome_padrao ??
        "SafeScan Brasil",
      120,
    );

  const responderParaPadrao =
    texto(
      corpo.responderParaPadrao ??
        corpo.responder_para_padrao,
      254,
    ).toLowerCase() ||
    null;

  const versaoEsperada =
    inteiroOuNulo(
      corpo.versaoEsperada ??
        corpo.versao_esperada,
    );

  const credencialRecebida =
    corpo.credencialNova ??
    corpo.credencial_nova;

  const credencialNova =
    typeof credencialRecebida ===
      "string" &&
    credencialRecebida.length > 0
      ? credencialRecebida
      : null;

  if (
    !usuarioSmtp ||
    !emailValido(
      remetenteEmail,
    ) ||
    !remetenteNomePadrao
  ) {
    throw new ErroHttp(
      400,
      "CONFIGURACAO_INVALIDA",
      "Preencha os dados obrigatórios do provedor.",
    );
  }

  if (
    responderParaPadrao &&
    !emailValido(
      responderParaPadrao,
    )
  ) {
    throw new ErroHttp(
      400,
      "CONFIGURACAO_INVALIDA",
      "E-mail de resposta inválido.",
    );
  }

  if (
    credencialNova &&
    credencialNova.length > 500
  ) {
    throw new ErroHttp(
      400,
      "CONFIGURACAO_INVALIDA",
      "A credencial excede o limite permitido.",
    );
  }

  const {
    error,
  } =
    await adminClient.rpc(
      "backend_salvar_configuracao_provedor_email",
      {
        p_provedor:
          conexao.provedor,

        p_host:
          conexao.host,

        p_porta:
          conexao.porta,

        p_modo_seguranca:
          conexao.modo,

        p_usuario_smtp:
          usuarioSmtp,

        p_remetente_email:
          remetenteEmail,

        p_remetente_nome_padrao:
          remetenteNomePadrao,

        p_responder_para_padrao:
          responderParaPadrao,

        p_credencial_nova:
          credencialNova,

        p_versao_esperada:
          versaoEsperada,

        p_executor_id:
          executorId,
      },
    );

  if (error) {
    throw erroRpc(
      error,
      "Não foi possível salvar a configuração do provedor.",
    );
  }

  const configuracao =
    await obterConfiguracaoSegura(
      userClient,
    );

  return resposta(
    200,
    {
      ok:
        true,

      acao:
        "salvar",

      configuracao,
    },
  );
}

async function acaoTestar(
  adminClient: any,
  userClient: any,
  executorId: string,
) {
  const {
    data:
      configuracaoData,

    error:
      configuracaoError,
  } =
    await adminClient.rpc(
      "backend_obter_configuracao_provedor_email_para_teste",
    );

  if (
    configuracaoError
  ) {
    throw new ErroHttp(
      500,
      "ERRO_INTERNO",
      "Não foi possível preparar o teste do provedor.",
      false,
    );
  }

  const configuracao =
    normalizarConfiguracaoSmtpPrivada(
      configuracaoData,
    );

  if (!configuracao) {
    throw new ErroHttp(
      409,
      "PROVEDOR_NAO_CONFIGURADO",
      "Configure uma credencial SMTP antes de executar o teste.",
    );
  }

  let transportador:
    any = null;

  let codigoFalha:
    string | null =
      null;

  try {
    transportador =
      await criarTransportadorSmtp(
        configuracao,
      );

    await transportador
      .verify();
  } catch (
    erro
  ) {
    codigoFalha =
      codigoSmtpSeguro(
        classificarErroSmtp(
          erro,
        ),
      );
  } finally {
    try {
      transportador
        ?.close?.();
    } catch {
      // fechamento best-effort sem log de erro bruto
    }
  }

  const statusTeste =
    codigoFalha
      ? "REPROVADO"
      : "APROVADO";

  const {
    error:
      registrarError,
  } =
    await adminClient.rpc(
      "backend_registrar_teste_provedor_email",
      {
        p_status:
          statusTeste,

        p_codigo:
          codigoFalha,

        p_versao_esperada:
          configuracao.versao,

        p_executor_id:
          executorId,
      },
    );

  if (
    registrarError
  ) {
    throw erroRpc(
      registrarError,
      "Não foi possível registrar o resultado do teste.",
    );
  }

  const configuracaoSegura =
    await obterConfiguracaoSegura(
      userClient,
    );

  return resposta(
    200,
    {
      ok:
        true,

      acao:
        "testar",

      teste: {
        status:
          statusTeste,

        codigo:
          codigoFalha,
      },

      configuracao:
        configuracaoSegura,
    },
  );
}

async function acaoAtivar(
  corpo: Registro,
  adminClient: any,
  userClient: any,
  executorId: string,
) {
  const versao =
    versaoObrigatoria(
      corpo.versaoEsperada ??
        corpo.versao_esperada,
    );

  const {
    error,
  } =
    await adminClient.rpc(
      "backend_ativar_provedor_email",
      {
        p_versao_esperada:
          versao,

        p_executor_id:
          executorId,
      },
    );

  if (error) {
    throw erroRpc(
      error,
      "Não foi possível ativar o provedor.",
    );
  }

  const configuracao =
    await obterConfiguracaoSegura(
      userClient,
    );

  return resposta(
    200,
    {
      ok:
        true,

      acao:
        "ativar",

      configuracao,
    },
  );
}

async function acaoDesativar(
  corpo: Registro,
  adminClient: any,
  userClient: any,
  executorId: string,
) {
  const versao =
    versaoObrigatoria(
      corpo.versaoEsperada ??
        corpo.versao_esperada,
    );

  const {
    error,
  } =
    await adminClient.rpc(
      "backend_desativar_provedor_email",
      {
        p_versao_esperada:
          versao,

        p_executor_id:
          executorId,
      },
    );

  if (error) {
    throw erroRpc(
      error,
      "Não foi possível desativar o provedor.",
    );
  }

  const configuracao =
    await obterConfiguracaoSegura(
      userClient,
    );

  return resposta(
    200,
    {
      ok:
        true,

      acao:
        "desativar",

      configuracao,
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
          headers:
            CORS,
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
          ok:
            false,

          codigo:
            "CONFIGURACAO_INVALIDA",

          erro:
            "Método não permitido.",
        },
      );
    }

    try {
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
        throw new ErroHttp(
          500,
          "ERRO_INTERNO",
          "Configuração interna indisponível.",
          false,
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
        throw new ErroHttp(
          401,
          "PERMISSAO_NEGADA",
          "Usuário não autenticado.",
        );
      }

      const userClient =
        createClient(
          supabaseUrl,
          anonKey,
          {
            global: {
              headers: {
                Authorization:
                  authorization,
              },
            },
          },
        );

      const adminClient =
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

      const {
        data:
          authData,

        error:
          authError,
      } =
        await userClient
          .auth
          .getUser();

      if (
        authError ||
        !authData?.user
      ) {
        throw new ErroHttp(
          401,
          "PERMISSAO_NEGADA",
          "Usuário autenticado não identificado.",
        );
      }

      const permitido =
        await podeGerenciar(
          userClient,
        );

      if (
        !permitido
      ) {
        throw new ErroHttp(
          403,
          "PERMISSAO_NEGADA",
          "Sem permissão para gerenciar o provedor de e-mail.",
        );
      }

      let corpo:
        Registro;

      try {
        corpo =
          objeto(
            await req.json(),
          );
      } catch {
        throw new ErroHttp(
          400,
          "CONFIGURACAO_INVALIDA",
          "JSON inválido.",
        );
      }

      const acao =
        normalizarAcao(
          corpo.acao,
        );

      if (
        !ACOES.has(
          acao,
        )
      ) {
        throw new ErroHttp(
          400,
          "CONFIGURACAO_INVALIDA",
          "Ação administrativa inválida.",
        );
      }

      if (
        acao ===
          "obter"
      ) {
        const configuracao =
          await obterConfiguracaoSegura(
            userClient,
          );

        return resposta(
          200,
          {
            ok:
              true,

            acao:
              "obter",

            configuracao,
          },
        );
      }

      if (
        acao ===
          "migrar_legado"
      ) {
        return await acaoMigrarLegado(
          adminClient,
          userClient,
          authData.user.id,
        );
      }

      if (
        acao ===
          "salvar"
      ) {
        return await acaoSalvar(
          corpo,
          adminClient,
          userClient,
          authData.user.id,
        );
      }

      if (
        acao ===
          "testar"
      ) {
        return await acaoTestar(
          adminClient,
          userClient,
          authData.user.id,
        );
      }

      if (
        acao ===
          "ativar"
      ) {
        return await acaoAtivar(
          corpo,
          adminClient,
          userClient,
          authData.user.id,
        );
      }

      return await acaoDesativar(
        corpo,
        adminClient,
        userClient,
        authData.user.id,
      );
    } catch (
      erro
    ) {
      const tratado =
        erro instanceof
          ErroHttp
          ? erro
          : new ErroHttp(
              500,
              "ERRO_INTERNO",
              "Falha interna na central de provedor.",
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
              : "Não foi possível concluir a operação do provedor de e-mail.",
        },
      );
    }
  },
);
