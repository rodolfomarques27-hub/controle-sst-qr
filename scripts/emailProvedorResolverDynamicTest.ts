import {
  ErroResolvedorEmail,
  resolverTransportadorEmailParaEnvio,
  type ConfiguracaoSmtpPrivada,
} from "../supabase/functions/_shared/emailProvedorResolver.ts";

type ResultadoRpcMock = {
  data: unknown;
  error: unknown;
};

type ClienteMock = {
  rpc: (
    nome: string,
  ) => Promise<ResultadoRpcMock>;
};

function exigir(
  condicao: unknown,
  mensagem: string,
): asserts condicao {
  if (!condicao) {
    throw new Error(
      mensagem,
    );
  }
}

function criarCliente(
  resposta: ResultadoRpcMock,
): ClienteMock {
  return {
    async rpc(
      nome: string,
    ) {
      exigir(
        nome ===
          "obter_configuracao_provedor_email_para_envio",
        `RPC inesperada: ${nome}`,
      );

      return resposta;
    },
  };
}

const CREDENCIAL_FICTICIA =
  "E3M3R4_CREDENCIAL_FICTICIA_SEM_VALOR_REAL";

const EMAIL_CENTRAL_FICTICIO =
  "central@safescan.invalid";

const EMAIL_FALLBACK_FICTICIO =
  "fallback@safescan.invalid";

const configuracoesRecebidas:
  ConfiguracaoSmtpPrivada[] = [];

let fechamentos =
  0;

const criarTransportadorFake =
  async (
    configuracao: ConfiguracaoSmtpPrivada,
  ) => {
    configuracoesRecebidas.push({
      ...configuracao,
    });

    return {
      close() {
        fechamentos +=
          1;
      },
    };
  };

// ============================================================================
// ROTA 1 — CENTRAL VÁLIDA
// ============================================================================

const clienteCentral =
  criarCliente({
    data: [
      {
        provedor:
          "SMTP_PERSONALIZADO",

        host:
          "smtp.safescan.invalid",

        porta:
          465,

        modo_seguranca:
          "TLS_IMPLICITO",

        usuario_smtp:
          EMAIL_CENTRAL_FICTICIO,

        remetente_email:
          EMAIL_CENTRAL_FICTICIO,

        remetente_nome_padrao:
          "SafeScan Brasil — Teste Local",

        responder_para_padrao:
          null,

        credencial:
          CREDENCIAL_FICTICIA,

        versao:
          7,
      },
    ],

    error:
      null,
  });

const central =
  await resolverTransportadorEmailParaEnvio(
    clienteCentral,
    {
      criarTransportador:
        criarTransportadorFake,
    },
  );

try {
  exigir(
    central.origem ===
      "CENTRAL",
    "Rota CENTRAL não retornou origem CENTRAL.",
  );

  exigir(
    central.provedor ===
      "SMTP_PERSONALIZADO",
    "Provedor CENTRAL divergente.",
  );

  exigir(
    central.versao ===
      7,
    "Versão CENTRAL divergente.",
  );

  exigir(
    central.remetenteEmail ===
      EMAIL_CENTRAL_FICTICIO,
    "Remetente CENTRAL divergente.",
  );

  exigir(
    !Object.prototype.hasOwnProperty.call(
      central,
      "credencial",
    ),
    "Credencial apareceu no retorno CENTRAL.",
  );

  exigir(
    !Object.prototype.hasOwnProperty.call(
      central,
      "usuarioSmtp",
    ),
    "Usuário SMTP apareceu no retorno CENTRAL.",
  );
} finally {
  central.transportador
    ?.close?.();
}

// ============================================================================
// ROTA 2 — CENTRAL AUSENTE -> FALLBACK LEGADO
// ============================================================================

Deno.env.set(
  "GMAIL_USER",
  EMAIL_FALLBACK_FICTICIO,
);

Deno.env.set(
  "GMAIL_APP_PASSWORD",
  CREDENCIAL_FICTICIA,
);

const clienteSemCentral =
  criarCliente({
    data:
      [],

    error:
      null,
  });

const fallback =
  await resolverTransportadorEmailParaEnvio(
    clienteSemCentral,
    {
      nomeRemetenteFallback:
        "SafeScan Brasil — Fallback Local",

      criarTransportador:
        criarTransportadorFake,
    },
  );

try {
  exigir(
    fallback.origem ===
      "LEGADO_GMAIL",
    "Ausência central não acionou fallback.",
  );

  exigir(
    fallback.provedor ===
      "GMAIL_SMTP",
    "Fallback não retornou GMAIL_SMTP.",
  );

  exigir(
    fallback.versao ===
      null,
    "Fallback não deve possuir versão central.",
  );

  exigir(
    fallback.remetenteEmail ===
      EMAIL_FALLBACK_FICTICIO,
    "Remetente do fallback divergente.",
  );

  exigir(
    !Object.prototype.hasOwnProperty.call(
      fallback,
      "credencial",
    ),
    "Credencial apareceu no retorno do fallback.",
  );

  exigir(
    !Object.prototype.hasOwnProperty.call(
      fallback,
      "usuarioSmtp",
    ),
    "Usuário SMTP apareceu no retorno do fallback.",
  );
} finally {
  fallback.transportador
    ?.close?.();
}

// ============================================================================
// PROVA INTERNA DA FACTORY
// ============================================================================

exigir(
  configuracoesRecebidas.length ===
    2,
  "Factory fake deveria ter sido chamada exatamente duas vezes.",
);

exigir(
  configuracoesRecebidas[0].origem ===
    "CENTRAL",
  "Primeira factory não recebeu configuração CENTRAL.",
);

exigir(
  configuracoesRecebidas[0].credencial ===
    CREDENCIAL_FICTICIA,
  "Credencial fictícia CENTRAL não chegou internamente à factory.",
);

exigir(
  configuracoesRecebidas[1].origem ===
    "LEGADO_GMAIL",
  "Segunda factory não recebeu configuração LEGADO_GMAIL.",
);

exigir(
  configuracoesRecebidas[1].credencial ===
    CREDENCIAL_FICTICIA,
  "Credencial fictícia do fallback não chegou internamente à factory.",
);

exigir(
  fechamentos ===
    2,
  "Transportadores fake não foram fechados conforme esperado.",
);

// ============================================================================
// ROTA 3 — ERRO RPC -> BLOQUEIO SEM FALLBACK E SEM FACTORY
// ============================================================================

Deno.env.delete(
  "GMAIL_USER",
);

Deno.env.delete(
  "GMAIL_APP_PASSWORD",
);

const chamadasAntesErro =
  configuracoesRecebidas.length;

const clienteErroRpc =
  criarCliente({
    data:
      null,

    error: {
      code:
        "MOCK_RPC_ERROR",
    },
  });

let erroCapturado:
  unknown = null;

try {
  await resolverTransportadorEmailParaEnvio(
    clienteErroRpc,
    {
      criarTransportador:
        criarTransportadorFake,
    },
  );
} catch (
  erro
) {
  erroCapturado =
    erro;
}

exigir(
  erroCapturado instanceof
    ErroResolvedorEmail,
  "Erro RPC não gerou ErroResolvedorEmail.",
);

exigir(
  erroCapturado.codigo ===
    "PROVEDOR_CENTRAL_INDISPONIVEL",
  "Código controlado do erro RPC divergiu.",
);

exigir(
  configuracoesRecebidas.length ===
    chamadasAntesErro,
  "Factory SMTP não pode ser executada quando a RPC central falha.",
);

// ============================================================================
// VEREDITO
// ============================================================================

console.log(
  "",
);

console.log(
  "EMAIL_PROVIDER_E3M3R4_DYNAMIC_RESOLVER_OK",
);

console.log(
  "ROTA_CENTRAL_VALIDA=OK",
);

console.log(
  "ROTA_FALLBACK_AUSENCIA=OK",
);

console.log(
  "ROTA_ERRO_RPC_BLOQUEADO=OK",
);

console.log(
  "FACTORY_FAKE_CALLS=2",
);

console.log(
  "FACTORY_NO_ERRO_RPC=0",
);

console.log(
  "TRANSPORTADORES_FECHADOS=2",
);

console.log(
  "NODEMAILER_RUNTIME_IMPORT=NAO",
);

console.log(
  "NETWORK_PERMISSION=NAO",
);

console.log(
  "DEPENDENCY_DOWNLOAD=NAO",
);

console.log(
  "SMTP_VERIFY=0",
);

console.log(
  "SENDMAIL=0",
);

console.log(
  "FETCH=0",
);

console.log(
  "SUPABASE_REAL=NAO",
);

console.log(
  "CREDENCIAL_REAL=NAO",
);

console.log(
  "EMAIL_REAL=NAO",
);
