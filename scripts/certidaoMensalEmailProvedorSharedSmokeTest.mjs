import assert from "node:assert/strict";
import {
    createHash,
} from "node:crypto";
import {
    readFileSync,
} from "node:fs";

const raiz =
    new URL(
        "../",
        import.meta.url,
    );

function ler(
    relativo,
) {
    return readFileSync(
        new URL(
            relativo,
            raiz,
        ),
        "utf8",
    );
}

function quantidade(
    texto,
    regex,
) {
    return (
        texto.match(
            regex,
        ) || []
    ).length;
}

function sha256(
    texto,
) {
    return createHash(
        "sha256",
    )
        .update(
            Buffer.from(
                texto,
                "utf8",
            ),
        )
        .digest(
            "hex",
        )
        .toUpperCase();
}

const email =
    ler(
        "supabase/functions/enviar-certidao-mensal-documental/email.ts",
    );

const index =
    ler(
        "supabase/functions/enviar-certidao-mensal-documental/index.ts",
    );

const visual =
    ler(
        "scripts/certidaoMensalEmailVisualSimplesSmokeTest.ts",
    );

const shared =
    ler(
        "supabase/functions/_shared/emailProvedorResolver.ts",
    );

const entradaCertidao =
    email +
    "\n" +
    index;

for (
    const proibido of
    [
        /\bGMAIL_USER\b/i,
        /\bGMAIL_APP_PASSWORD\b/i,
        /smtp\.gmail\.com/i,
        /npm:nodemailer/i,
        /\.createTransport\s*\(/i,
        /\bgmailUser\b/i,
    ]
) {
    assert.doesNotMatch(
        entradaCertidao,
        proibido,
        "A Certidão não pode manter Gmail/Nodemailer/createTransport direto.",
    );
}

assert.equal(
    quantidade(
        email,
        /\bresolverTransportadorEmailParaEnvio\b/g,
    ),
    2,
    "O resolver central deve existir somente no import e na chamada operacional de email.ts.",
);

assert.match(
    email,
    /\.\.\/_shared\/emailProvedorResolver\.ts/,
    "email.ts deve importar o shared resolver E3.",
);

assert.equal(
    quantidade(
        email,
        /\.sendMail\s*\(/g,
    ),
    1,
    "A Certidão deve manter exatamente uma chamada real sendMail.",
);

assert.equal(
    quantidade(
        index,
        /\.sendMail\s*\(/g,
    ),
    0,
    "index.ts deve apenas orquestrar o envio.",
);

assert.match(
    index,
    /await\s+criarTransportadorEmail\s*\(\s*adminClient\s*,/s,
    "index.ts deve resolver o provedor com o adminClient.",
);

assert.match(
    index,
    /fecharTransportadorEmail\s*\(\s*provedorEmail\s*,?\s*\)/s,
    "O transportador deve ser fechado ao final do fluxo.",
);

assert.match(
    email,
    /remetenteEmail:\s*provedorEmail\.remetenteEmail/s,
    "O endereço real do From deve vir do provedor central/resolvido.",
);

assert.match(
    email,
    /configuracao\.responderPara\s*\|\|\s*responderParaPadrao/s,
    "O reply-to específico da Certidão deve preceder o reply-to padrão do provedor.",
);

assert.match(
    email,
    /classificarErroResolvedor/,
    "Falhas do resolvedor devem ser classificadas.",
);

assert.match(
    email,
    /classificarErroEnvio/,
    "Falhas SMTP devem ser classificadas antes de sair do módulo.",
);

assert.match(
    email,
    /SMTP_NAO_CONFIGURADO/,
);

assert.match(
    email,
    /ENVIO_RECUSADO/,
);

assert.match(
    email,
    /ENVIO_TIMEOUT/,
);

assert.match(
    email,
    /PROVEDOR_INDISPONIVEL/,
);

assert.doesNotMatch(
    visual,
    /\bgmailUser\b/,
    "O smoke visual também deve abandonar a nomenclatura Gmail.",
);

assert.equal(
    sha256(
        shared,
    ),
    "B115DD08126C8C0A2C100C75856BDFE6933FC9CC122BABDB659890289F52C679",
    "O shared resolver E3 não pode ser alterado pela migração da Certidão.",
);

console.log(
    "CERTIDAO_EMAIL_PROVIDER_E4M2M1R1_SHARED_SMOKE_OK",
);

console.log(
    "Validado: shared resolver, ausência de Gmail direto, sender central, reply-to, sendMail único, fechamento do transportador e classificação segura de erros.",
);

console.log(
    "Nenhum SMTP, e-mail, Vault, secret, banco ou deploy foi executado.",
);
