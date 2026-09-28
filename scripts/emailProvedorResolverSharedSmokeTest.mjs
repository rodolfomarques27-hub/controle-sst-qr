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
  "backend_obter_configuracao_email_tenant_para_envio",
  "resolverTransportadorEmailParaEnvio",
  "resolverTransportadorPlataforma",
  "resolverTransportadorTenant",
  "resolverTransportadorTenantCliente",
  "normalizarConfiguracaoSmtpPrivada",
  "normalizarModoEnvioTenant",
  "criarTransportadorSmtp",
  "CriadorTransportadorSmtp",
  "OpcoesResolverEmail",
  "PLATAFORMA",
  "TENANT",
  "CENTRAL",
  "LEGADO_GMAIL",
  "TENANT_CLIENTE",
  "SAFESCAN_GERENCIADO",
  "PROVEDOR_CLIENTE",
  "DESATIVADO",
  "GMAIL_USER",
  "GMAIL_APP_PASSWORD",
  "smtp.gmail.com",
  "PROVEDOR_CENTRAL_INDISPONIVEL",
  "PROVEDOR_CENTRAL_INVALIDO",
  "PROVEDOR_TENANT_INDISPONIVEL",
  "PROVEDOR_TENANT_INVALIDO",
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
    /"obter_configuracao_provedor_email_para_envio"/g,
  ) === 1,
  "RPC central deve ser consultada exatamente uma vez no resolver.",
);

exigir(
  ocorrencias(
    /"backend_obter_configuracao_email_tenant_para_envio"/g,
  ) === 1,
  "RPC do tenant deve ser consultada exatamente uma vez no resolver.",
);

exigir(
  ocorrencias(
    /montarTransportadorResolvido\s*\([\s\S]*?criarTransportador,\s*\n\s*\);/g,
  ) === 3,
  "As três chamadas reais de montarTransportadorResolvido devem encaminhar a factory selecionada.",
);

const inicioResultado =
  fonte.indexOf(
    "async function montarTransportadorResolvido",
  );

const fimResultado =
  fonte.indexOf(
    "function normalizarModoEnvioTenant",
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

const inicioPlataforma =
  fonte.indexOf(
    "async function resolverTransportadorPlataforma",
  );

const inicioTenantCliente =
  fonte.indexOf(
    "async function resolverTransportadorTenantCliente",
  );

exigir(
  inicioPlataforma >= 0 &&
    inicioTenantCliente > inicioPlataforma,
  "Bloco da plataforma não localizado.",
);

const trechoPlataforma =
  fonte.slice(
    inicioPlataforma,
    inicioTenantCliente,
  );

exigir(
  trechoPlataforma.includes(
    "GMAIL_USER",
  ) &&
    trechoPlataforma.includes(
      "GMAIL_APP_PASSWORD",
    ),
  "Fallback legado deve permanecer restrito ao canal da plataforma.",
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
  "EMAIL_PROVIDER_R22B_SHARED_RESOLVER_SMOKE_OK",
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
  "TENANT_RPC=1",
);

console.log(
  "CANAIS=PLATAFORMA,TENANT",
);

console.log(
  "ORIGEM_TENANT_CLIENTE=SIM",
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
  "LEGACY_GMAIL_FALLBACK=PLATAFORMA",
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
