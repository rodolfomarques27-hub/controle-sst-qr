import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const repo = process.cwd();

const rapidPath = path.join(
  repo,
  "supabase/functions/rapid-api/index.ts",
);

const sharedPath = path.join(
  repo,
  "supabase/functions/_shared/emailProvedorResolver.ts",
);

const rapid =
  fs.readFileSync(
    rapidPath,
    "utf8",
  );

const shared =
  fs.readFileSync(
    sharedPath,
    "utf8",
  );

function fail(message) {
  throw new Error(
    `RAPID_API_E4M3_P1_R1_SMOKE_FAIL: ${message}`,
  );
}

function assert(condition, message) {
  if (!condition) {
    fail(message);
  }
}

function count(pattern, source = rapid) {
  return (
    source.match(pattern) || []
  ).length;
}

const sharedHash =
  crypto
    .createHash("sha256")
    .update(
      fs.readFileSync(sharedPath),
    )
    .digest("hex")
    .toUpperCase();

assert(
  sharedHash ===
    "B115DD08126C8C0A2C100C75856BDFE6933FC9CC122BABDB659890289F52C679",
  `shared resolver mudou: ${sharedHash}`,
);

for (
  const [label, pattern] of [
    ["GMAIL_USER", /\bGMAIL_USER\b/gi],
    ["GMAIL_APP_PASSWORD", /\bGMAIL_APP_PASSWORD\b/gi],
    ["smtp.gmail.com", /smtp\.gmail\.com/gi],
    ["npm:nodemailer", /npm:nodemailer/gi],
    ["createTransport", /\.createTransport\s*\(/g],
    ["gmailUser", /\bgmailUser\b/g],
    ["gmailAppPassword", /\bgmailAppPassword\b/g],
  ]
) {
  assert(
    count(pattern) === 0,
    `${label} ainda aparece no rapid-api`,
  );
}

assert(
  count(
    /\.sendMail\s*\(/g,
  ) === 1,
  "rapid-api deve manter exatamente um sendMail",
);

assert(
  rapid.includes(
    'from "../_shared/emailProvedorResolver.ts"',
  ),
  "import do shared resolver ausente",
);

assert(
  count(
    /resolverTransportadorEmailParaEnvio/g,
  ) >= 2,
  "resolver central não foi importado/chamado",
);

assert(
  /resolverTransportadorEmailParaEnvio\s*\(\s*supabaseAdmin\s*,/s
    .test(rapid),
  "resolver não recebe supabaseAdmin",
);

assert(
  /provedorEmail\.transportador\.sendMail\s*\(/s
    .test(rapid),
  "sendMail não usa transportador resolvido",
);

assert(
  rapid.includes(
    "provedorEmail.remetenteEmail",
  ),
  "From não usa remetente central",
);

assert(
  rapid.includes(
    "provedorEmail.responderParaPadrao",
  ),
  "reply-to do provider ausente",
);

assert(
  rapid.includes(
    "nomeRemetenteFallback",
  ),
  "fallback do nome do remetente ausente",
);

assert(
  /catch\s*\(error\)\s*\{\s*throw normalizarErroProvedorEmail\(\s*error,\s*"RESOLVER"/s
    .test(rapid),
  "erro do resolver não é sanitizado",
);

assert(
  /catch\s*\(error\)\s*\{\s*throw normalizarErroProvedorEmail\(\s*error,\s*"ENVIAR"/s
    .test(rapid),
  "erro SMTP não é sanitizado",
);

assert(
  /finally\s*\{\s*fecharTransportadorEmail\(\s*provedorEmail/s
    .test(rapid),
  "close não está em finally",
);

for (
  const contrato of [
    "obter_modelo_email_sst_para_envio",
    "carregarAssinaturaEmailSst",
    "TIPOS_MODELO_EMAIL_SST",
    "Não foi possível concluir o envio do e-mail SST.",
    "assinaturaEmail",
    "destinatario",
    "assuntoFinal",
    "tipoModeloTratado",
  ]
) {
  assert(
    rapid.includes(contrato),
    `contrato funcional removido: ${contrato}`,
  );
}

assert(
  shared.includes(
    "LEGADO_GMAIL",
  ),
  "fallback legado ausente no shared",
);

assert(
  shared.includes(
    "PROVEDOR_NAO_CONFIGURADO",
  ),
  "código seguro ausente no shared",
);

console.log(
  "RAPID_API_EMAIL_PROVIDER_E4M3P1R1_SHARED_SMOKE_OK",
);