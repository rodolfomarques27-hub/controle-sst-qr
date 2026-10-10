type Registro = Record<string, unknown>;

type ResultadoRpc = {
  data: unknown;
  error: unknown;
};

type ClienteRpcPrivado = {
  rpc: (
    nome: string,
    parametros?: Record<string, unknown>,
  ) => PromiseLike<ResultadoRpc>;
};

export type OrigemProvedorEmail =
  | "CENTRAL"
  | "LEGADO_GMAIL"
  | "TENANT_CLIENTE"
  | "USUARIO_CLIENTE";

export type CanalEmail =
  | "PLATAFORMA"
  | "TENANT";

export type ModoEnvioTenant =
  | "SAFESCAN_GERENCIADO"
  | "PROVEDOR_CLIENTE"
  | "DESATIVADO";

export type ModoSegurancaEmail =
  | "TLS_IMPLICITO"
  | "STARTTLS";

export type ConfiguracaoSmtpPrivada = {
  origem: OrigemProvedorEmail;
  provedor: string;
  host: string;
  porta: number;
  modoSeguranca: ModoSegurancaEmail;
  usuarioSmtp: string;
  remetenteEmail: string;
  remetenteNomePadrao: string;
  responderParaPadrao: string | null;
  credencial: string;
  versao: number | null;
};

export type CriadorTransportadorSmtp = (
  configuracao: ConfiguracaoSmtpPrivada,
) => Promise<any>;

export type OpcoesResolverEmail = {
  canal?: CanalEmail;
  tenantId?: string;
  actorUserId?: string;
  nomeRemetenteFallback?: string;
  criarTransportador?: CriadorTransportadorSmtp;
};

export type TransportadorEmailResolvido = {
  transportador: any;
  origem: OrigemProvedorEmail;
  provedor: string;
  remetenteEmail: string;
  remetenteNomePadrao: string;
  responderParaPadrao: string | null;
  versao: number | null;
};

export class ErroResolvedorEmail extends Error {
  codigo: string;

  constructor(
    codigo: string,
    mensagem: string,
  ) {
    super(
      mensagem,
    );

    this.name =
      "ErroResolvedorEmail";

    this.codigo =
      codigo;
  }
}

const PROVEDORES = new Set([
  "GMAIL_SMTP",
  "MICROSOFT_365_SMTP",
  "SMTP_PERSONALIZADO",
]);

const MODOS_SEGURANCA = new Set([
  "TLS_IMPLICITO",
  "STARTTLS",
]);

function primeiroRegistro(
  valor: unknown,
): Registro | null {
  if (
    Array.isArray(
      valor,
    )
  ) {
    const primeiro =
      valor[0];

    return (
      primeiro &&
      typeof primeiro ===
        "object"
    )
      ? primeiro as Registro
      : null;
  }

  return (
    valor &&
    typeof valor ===
      "object"
  )
    ? valor as Registro
    : null;
}

function texto(
  valor: unknown,
  limite = 1000,
) {
  if (
    typeof valor !==
      "string" &&
    typeof valor !==
      "number"
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

export function normalizarConfiguracaoSmtpPrivada(
  valor: unknown,
  origem: OrigemProvedorEmail = "CENTRAL",
): ConfiguracaoSmtpPrivada | null {
  const linha =
    primeiroRegistro(
      valor,
    );

  if (!linha) {
    return null;
  }

  const provedor =
    texto(
      linha.provedor,
      80,
    ).toUpperCase();

  const host =
    texto(
      linha.host,
      253,
    ).toLowerCase();

  const porta =
    Number(
      linha.porta,
    );

  const modoSeguranca =
    texto(
      linha.modo_seguranca,
      40,
    ).toUpperCase();

  const usuarioSmtp =
    texto(
      linha.usuario_smtp,
      320,
    );

  const remetenteEmail =
    texto(
      linha.remetente_email,
      254,
    ).toLowerCase();

  const remetenteNomePadrao =
    textoCabecalho(
      linha.remetente_nome_padrao,
      120,
    );

  const responderParaPadrao =
    texto(
      linha.responder_para_padrao,
      254,
    ).toLowerCase() ||
    null;

  const credencial =
    typeof linha.credencial ===
      "string"
      ? linha.credencial
      : "";

  const versaoNumero =
    Number(
      linha.versao,
    );

  const versao =
    Number.isInteger(
      versaoNumero,
    ) &&
    versaoNumero >= 1
      ? versaoNumero
      : null;

  if (
    !PROVEDORES.has(
      provedor,
    ) ||
    !host ||
    !Number.isInteger(
      porta,
    ) ||
    porta < 1 ||
    porta > 65535 ||
    !MODOS_SEGURANCA.has(
      modoSeguranca,
    ) ||
    !usuarioSmtp ||
    !emailValido(
      remetenteEmail,
    ) ||
    !remetenteNomePadrao ||
    !credencial ||
    (
      responderParaPadrao !==
        null &&
      !emailValido(
        responderParaPadrao,
      )
    ) ||
    (
      origem !==
        "LEGADO_GMAIL" &&
      versao ===
        null
    )
  ) {
    return null;
  }

  return {
    origem,
    provedor,
    host,
    porta,

    modoSeguranca:
      modoSeguranca as
        ModoSegurancaEmail,

    usuarioSmtp,
    remetenteEmail,
    remetenteNomePadrao,
    responderParaPadrao,
    credencial,
    versao,
  };
}

export async function criarTransportadorSmtp(
  configuracao: ConfiguracaoSmtpPrivada,
) {
  const moduloNodemailer =
    await import(
      "npm:nodemailer@6.9.16"
    );

  const nodemailer =
    (
      moduloNodemailer.default ??
      moduloNodemailer
    ) as any;

  const secure =
    configuracao.modoSeguranca ===
      "TLS_IMPLICITO";

  return nodemailer.createTransport({
    host:
      configuracao.host,

    port:
      configuracao.porta,

    secure,

    requireTLS:
      configuracao.modoSeguranca ===
        "STARTTLS",

    auth: {
      user:
        configuracao.usuarioSmtp,

      pass:
        configuracao.credencial,
    },

    connectionTimeout:
      15000,

    greetingTimeout:
      15000,

    socketTimeout:
      15000,

    tls: {
      minVersion:
        "TLSv1.2",
    },
  });
}

async function montarTransportadorResolvido(
  configuracao: ConfiguracaoSmtpPrivada,
  criarTransportador: CriadorTransportadorSmtp,
): Promise<TransportadorEmailResolvido> {
  const transportador =
    await criarTransportador(
      configuracao,
    );

  return {
    transportador,

    origem:
      configuracao.origem,

    provedor:
      configuracao.provedor,

    remetenteEmail:
      configuracao.remetenteEmail,

    remetenteNomePadrao:
      configuracao.remetenteNomePadrao,

    responderParaPadrao:
      configuracao.responderParaPadrao,

    versao:
      configuracao.versao,
  };
}

function normalizarModoEnvioTenant(
  valor: unknown,
): ModoEnvioTenant | null {
  const modo =
    texto(
      valor,
      40,
    ).toUpperCase();

  if (
    modo ===
      "SAFESCAN_GERENCIADO" ||
    modo ===
      "PROVEDOR_CLIENTE" ||
    modo ===
      "DESATIVADO"
  ) {
    return modo as ModoEnvioTenant;
  }

  return null;
}

async function resolverTransportadorPlataforma(
  adminClient: ClienteRpcPrivado,
  opcoes: OpcoesResolverEmail,
  criarTransportador: CriadorTransportadorSmtp,
): Promise<TransportadorEmailResolvido> {
  let resultado:
    ResultadoRpc;

  try {
    resultado =
      await adminClient.rpc(
        "obter_configuracao_provedor_email_para_envio",
      );
  } catch {
    throw new ErroResolvedorEmail(
      "PROVEDOR_CENTRAL_INDISPONIVEL",
      "Não foi possível consultar o provedor central de e-mail.",
    );
  }

  if (
    resultado.error
  ) {
    throw new ErroResolvedorEmail(
      "PROVEDOR_CENTRAL_INDISPONIVEL",
      "Não foi possível consultar o provedor central de e-mail.",
    );
  }

  const linhaCentral =
    primeiroRegistro(
      resultado.data,
    );

  if (
    linhaCentral
  ) {
    const configuracaoCentral =
      normalizarConfiguracaoSmtpPrivada(
        linhaCentral,
        "CENTRAL",
      );

    if (
      !configuracaoCentral
    ) {
      throw new ErroResolvedorEmail(
        "PROVEDOR_CENTRAL_INVALIDO",
        "A configuração central de e-mail está inconsistente.",
      );
    }

    return await montarTransportadorResolvido(
      configuracaoCentral,
      criarTransportador,
    );
  }

  const gmailUser =
    (
      Deno.env.get(
        "GMAIL_USER",
      ) || ""
    ).trim();

  const gmailPassword =
    Deno.env.get(
      "GMAIL_APP_PASSWORD",
    ) || "";

  if (
    !emailValido(
      gmailUser,
    ) ||
    !gmailPassword
  ) {
    throw new ErroResolvedorEmail(
      "PROVEDOR_NAO_CONFIGURADO",
      "Nenhum provedor de e-mail operacional está configurado.",
    );
  }

  const nomeRemetenteFallback =
    textoCabecalho(
      opcoes.nomeRemetenteFallback ??
        "SafeScan Brasil",
      120,
    ) ||
    "SafeScan Brasil";

  const configuracaoLegada:
    ConfiguracaoSmtpPrivada = {
      origem:
        "LEGADO_GMAIL",

      provedor:
        "GMAIL_SMTP",

      host:
        "smtp.gmail.com",

      porta:
        465,

      modoSeguranca:
        "TLS_IMPLICITO",

      usuarioSmtp:
        gmailUser,

      remetenteEmail:
        gmailUser,

      remetenteNomePadrao:
        nomeRemetenteFallback,

      responderParaPadrao:
        null,

      credencial:
        gmailPassword,

      versao:
        null,
    };

  return await montarTransportadorResolvido(
    configuracaoLegada,
    criarTransportador,
  );
}

async function resolverTransportadorTenantCliente(
  linhaTenant: Registro,
  criarTransportador: CriadorTransportadorSmtp,
): Promise<TransportadorEmailResolvido> {
  const configuracaoTenant =
    normalizarConfiguracaoSmtpPrivada(
      linhaTenant,
      "TENANT_CLIENTE",
    );

  if (
    !configuracaoTenant
  ) {
    throw new ErroResolvedorEmail(
      "PROVEDOR_TENANT_INVALIDO",
      "A configuração do provedor de e-mail do tenant está inconsistente ou ainda não foi aprovada.",
    );
  }

  return await montarTransportadorResolvido(
    configuracaoTenant,
    criarTransportador,
  );
}

async function resolverTransportadorTenant(
  adminClient: ClienteRpcPrivado,
  tenantId: string,
  opcoes: OpcoesResolverEmail,
  criarTransportador: CriadorTransportadorSmtp,
): Promise<TransportadorEmailResolvido> {
  const tenantIdNormalizado =
    texto(
      tenantId,
      80,
    );

  if (
    !tenantIdNormalizado
  ) {
    throw new ErroResolvedorEmail(
      "PROVEDOR_TENANT_INDISPONIVEL",
      "O tenant necessário para resolver o provedor de e-mail não foi informado.",
    );
  }

  let resultadoTenant:
    ResultadoRpc;

  try {
    resultadoTenant =
      await adminClient.rpc(
        "backend_obter_configuracao_email_tenant_para_envio",
        {
          p_tenant_id:
            tenantIdNormalizado,
        },
      );
  } catch {
    throw new ErroResolvedorEmail(
      "PROVEDOR_TENANT_INDISPONIVEL",
      "Não foi possível consultar o provedor de e-mail do tenant.",
    );
  }

  if (
    resultadoTenant.error
  ) {
    throw new ErroResolvedorEmail(
      "PROVEDOR_TENANT_INDISPONIVEL",
      "Não foi possível consultar o provedor de e-mail do tenant.",
    );
  }

  const linhaTenant =
    primeiroRegistro(
      resultadoTenant.data,
    );

  if (
    !linhaTenant
  ) {
    throw new ErroResolvedorEmail(
      "PROVEDOR_NAO_CONFIGURADO",
      "O tenant não possui configuração de e-mail operacional.",
    );
  }

  const modoEnvio =
    normalizarModoEnvioTenant(
      linhaTenant.modo_envio,
    );

  if (
    !modoEnvio
  ) {
    throw new ErroResolvedorEmail(
      "PROVEDOR_TENANT_INVALIDO",
      "O modo de envio configurado para o tenant é inválido.",
    );
  }

  if (
    modoEnvio ===
      "DESATIVADO"
  ) {
    throw new ErroResolvedorEmail(
      "PROVEDOR_NAO_CONFIGURADO",
      "O envio operacional de e-mail está desativado para este tenant.",
    );
  }

  if (
    modoEnvio ===
      "SAFESCAN_GERENCIADO"
  ) {
    return await resolverTransportadorPlataforma(
      adminClient,
      opcoes,
      criarTransportador,
    );
  }

  return await resolverTransportadorTenantCliente(
    linhaTenant,
    criarTransportador,
  );
}

export async function resolverTransportadorEmailParaEnvio(
  adminClient: ClienteRpcPrivado,
  opcoes: OpcoesResolverEmail = {},
): Promise<TransportadorEmailResolvido> {
  const criarTransportador =
    opcoes.criarTransportador ??
    criarTransportadorSmtp;

  const canal =
    opcoes.canal ??
    "PLATAFORMA";

  if (
    canal ===
      "PLATAFORMA"
  ) {
    return await resolverTransportadorPlataforma(
      adminClient,
      opcoes,
      criarTransportador,
    );
  }

  if (
    canal ===
      "TENANT"
  ) {
    const tenantId =
      texto(
        opcoes.tenantId,
        80,
      );

    return await resolverTransportadorTenant(
      adminClient,
      tenantId,
      opcoes,
      criarTransportador,
    );
  }

  throw new ErroResolvedorEmail(
    "CANAL_EMAIL_INVALIDO",
    "O canal de e-mail solicitado é inválido.",
  );
}
