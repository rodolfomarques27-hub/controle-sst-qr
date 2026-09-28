import assert from "node:assert/strict";
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

const email =
    ler(
        "supabase/functions/enviar-certidao-mensal-documental/email.ts",
    );

const index =
    ler(
        "supabase/functions/enviar-certidao-mensal-documental/index.ts",
    );

const dados =
    ler(
        "supabase/functions/enviar-certidao-mensal-documental/dados.ts",
    );

const types =
    ler(
        "supabase/functions/enviar-certidao-mensal-documental/types.ts",
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
    "O resolver compartilhado deve existir somente no import e na chamada operacional de email.ts.",
);

assert.match(
    email,
    /\.\.\/_shared\/emailProvedorResolver\.ts/,
    "email.ts deve importar o shared resolver.",
);

assert.match(
    email,
    /canal:\s*"TENANT"/,
    "A Certidão deve resolver obrigatoriamente o canal TENANT.",
);

assert.match(
    email,
    /tenantId,\s*\n\s*nomeRemetenteFallback/s,
    "criarTransportadorEmail deve exigir tenantId antes do nome do remetente.",
);

assert.match(
    email,
    /canal:\s*"TENANT",\s*\n\s*tenantId,/s,
    "O tenantId deve ser encaminhado explicitamente ao resolver.",
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
    /await\s+criarTransportadorEmail\s*\(\s*adminClient\s*,\s*contexto\.tenantId\s*,/s,
    "index.ts deve propagar o tenantId do contexto ao resolver.",
);

assert.match(
    index,
    /fecharTransportadorEmail\s*\(\s*provedorEmail\s*,?\s*\)/s,
    "O transportador deve ser fechado ao final do fluxo.",
);

assert.match(
    dados,
    /id,\s*nome,\s*cnpj,\s*tenant_id,\s*tipo_empresa/,
    "A empresa da competência deve carregar tenant_id.",
);

assert.match(
    dados,
    /const tenantId\s*=/,
    "O contexto deve normalizar o tenantId da empresa.",
);

assert.match(
    dados,
    /competenciaId,\s*\n\s*empresaId,\s*\n\s*tenantId,/s,
    "O ContextoEnvio deve retornar o tenantId.",
);

assert.match(
    types,
    /tenantId:\s*string;/,
    "ContextoEnvio deve tipar tenantId explicitamente.",
);

assert.match(
    email,
    /remetenteEmail:\s*provedorEmail\.remetenteEmail/s,
    "O endereço real do From deve vir do provedor resolvido.",
);

assert.match(
    email,
    /configuracao\.responderPara\s*\|\|\s*responderParaPadrao/s,
    "O reply-to específico da Certidão deve preceder o reply-to padrão do provedor.",
);

assert.match(
    email,
    /PROVEDOR_TENANT_INVALIDO/,
    "Falha de configuração do tenant deve ser classificada de forma segura.",
);

assert.match(
    email,
    /PROVEDOR_TENANT_INDISPONIVEL/,
    "Falha de resolução do tenant deve ser classificada de forma segura.",
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

assert.match(
    shared,
    /backend_obter_configuracao_email_tenant_para_envio/,
    "Resolver compartilhado deve conhecer o contrato backend do tenant.",
);

assert.match(
    shared,
    /TENANT_CLIENTE/,
    "Resolver compartilhado deve distinguir a origem do provedor do cliente.",
);

console.log(
    "CERTIDAO_EMAIL_PROVIDER_R22B_TENANT_SMOKE_OK",
);

console.log(
    "Validado: tenant_id da empresa, canal TENANT, shared resolver, ausência de Gmail direto, sender resolvido, reply-to, sendMail único, fechamento do transportador e classificação segura de erros.",
);

console.log(
    "Nenhum SMTP, e-mail, Vault, secret, banco ou deploy foi executado.",
);
