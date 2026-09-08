import {
  readFileSync,
} from "node:fs";

const arquivo =
  new URL(
    "../supabase/functions/_shared/emailProvedorResolver.ts",
    import.meta.url,
  );

const fonte =
  readFileSync(
    arquivo,
    "utf8",
  );

function exigir(
  condicao,
  mensagem,
) {
  if (!condicao) {
    throw new Error(
      mensagem,
    );
  }
}

function ocorrencias(
  padrao,
) {
  return (
    fonte.match(
      padrao,
    ) || []
  ).length;
}

const obrigatorios = [
  "obter_configuracao_provedor_email_para_envio",
  "resolverTransportadorEmailParaEnvio",
  "normalizarConfiguracaoSmtpPrivada",
  "criarTransportadorSmtp",
  "CriadorTransportadorSmtp",
  "criarTransportador?: CriadorTransportadorSmtp",
  "opcoes.criarTransportador ??",
  "montarTransportadorResolvido",
  "CENTRAL",
  "LEGADO_GMAIL",
  "GMAIL_USER",
  "GMAIL_APP_PASSWORD",
  "smtp.gmail.com",
  "PROVEDOR_CENTRAL_INDISPONIVEL",
  "PROVEDOR_CENTRAL_INVALIDO",
  "PROVEDOR_NAO_CONFIGURADO",
  "TLS_IMPLICITO",
  "STARTTLS",
  "createTransport",
];

for (
  const marcador of
  obrigatorios
) {
  exigir(
    fonte.includes(
      marcador,
    ),
    `Marcador obrigatório ausente: ${marcador}`,
  );
}

const proibidos = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "localStorage",
  "sessionStorage",
  "VITE_",
];

for (
  const marcador of
  proibidos
) {
  exigir(
    !fonte.includes(
      marcador,
    ),
    `Referência proibida no resolver: ${marcador}`,
  );
}

exigir(
  ocorrencias(
    /\bcreateTransport\s*\(/g,
  ) === 1,
  "Esperado exatamente um createTransport no resolver.",
);

exigir(
  ocorrencias(
    /\bsendMail\s*\(/g,
  ) === 0,
  "O resolver não pode enviar e-mail.",
);

exigir(
  ocorrencias(
    /\bconsole\./g,
  ) === 0,
  "O resolver não pode escrever console.*.",
);

exigir(
  ocorrencias(
    /\bGMAIL_USER\b/g,
  ) === 1,
  "Esperada exatamente uma referência ao secret GMAIL_USER.",
);

exigir(
  ocorrencias(
    /\bGMAIL_APP_PASSWORD\b/g,
  ) === 1,
  "Esperada exatamente uma referência ao secret GMAIL_APP_PASSWORD.",
);

exigir(
  ocorrencias(
    /criarTransportador:\s*CriadorTransportadorSmtp/g,
  ) === 1,
  "Montador deve receber exatamente uma factory explícita.",
);

exigir(
  ocorrencias(
    /criarTransportador,\s*\n\s*\);/g,
  ) === 2,
  "As duas rotas SMTP devem encaminhar a factory selecionada.",
);

const inicioResultado =
  fonte.indexOf(
    "async function montarTransportadorResolvido",
  );

const fimResultado =
  fonte.indexOf(
    "export async function resolverTransportadorEmailParaEnvio",
  );

exigir(
  inicioResultado >= 0 &&
    fimResultado > inicioResultado,
  "Contrato de retorno não localizado.",
);

const trechoResultado =
  fonte.slice(
    inicioResultado,
    fimResultado,
  );

exigir(
  !/\bcredencial\s*:/.test(
    trechoResultado,
  ),
  "Credencial não pode aparecer no resultado operacional.",
);

exigir(
  !/\busuarioSmtp\s*:/.test(
    trechoResultado,
  ),
  "Usuário SMTP não deve aparecer no resultado operacional.",
);

const posicaoErroRpc =
  fonte.indexOf(
    "if (\n    resultado.error",
  );

const posicaoFallback =
  fonte.indexOf(
    'Deno.env.get(\n        "GMAIL_USER"',
  );

exigir(
  posicaoErroRpc >= 0 &&
    posicaoFallback > posicaoErroRpc,
  "Erro da RPC deve ser tratado antes do fallback.",
);

exigir(
  fonte.endsWith(
    "\n",
  ),
  "Resolver deve terminar com LF.",
);

exigir(
  !fonte.endsWith(
    "\n\n",
  ),
  "Resolver deve possuir exatamente um LF final.",
);

console.log(
  "",
);

console.log(
  "EMAIL_PROVIDER_E3M3R4_SHARED_RESOLVER_SMOKE_OK",
);

console.log(
  "FACTORY_PADRAO_PRODUCAO=SIM",
);

console.log(
  "FACTORY_INJETAVEL_TESTE=SIM",
);

console.log(
  "CENTRAL_RPC=1",
);

console.log(
  "CREATE_TRANSPORT_SHARED=1",
);

console.log(
  "SENDMAIL_SHARED=0",
);

console.log(
  "CONSOLE_SHARED=0",
);

console.log(
  "LEGACY_GMAIL_FALLBACK=SIM",
);

console.log(
  "FALLBACK_EM_ERRO_RPC=NAO",
);

console.log(
  "CREDENCIAL_NO_RETORNO=0",
);

console.log(
  "SUPABASE_REAL=NAO",
);

console.log(
  "EMAIL_REAL=NAO",
);
