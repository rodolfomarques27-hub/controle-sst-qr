import assert from "node:assert/strict";

import {
    montarMensagemEmail,
} from "../supabase/functions/enviar-certidao-mensal-documental/email.ts";

const corpoOriginal =
    [
        "Olá,",
        "",
        "Durante a conferência da documentação mensal da empresa RIBEIRO AQUINO,",
        "referente à competência 07/2026, foram identificadas as pendências abaixo:",
        "",
        "1. CND Federal — Documento pendente",
        "2. CRF FGTS — Documento pendente",
        "3. FGTS — Documento pendente",
        "4. CNDT (Trabalhista) — Documento pendente",
        "5. CND Estadual — Documento pendente",
        "6. CND Municipal — Documento pendente",
        "7. Falência e Concordata — Documento pendente",
        "8. Cadastro TCE / CEIS — Documento pendente",
        "9. Folha de Pagamento e Comprovantes — Documento pendente",
        "10. Espelho de Ponto — Documento pendente",
        "11. VA / VT — Documento pendente",
        "12. Seguro de Vida — Documento pendente",
        "13. INSS / DCTFWeb — Documento pendente",
        "14. ISSQN — Documento pendente",
        "15. eSocial SST — Documento pendente",
        "",
        "Solicitamos a regularização dos itens relacionados e o envio dos documentos faltantes ou corrigidos pelo canal habitual.",
        "",
        "Total de pendências identificadas: 15.",
        "",
        "Em caso de dúvida, responda a este e-mail.",
    ].join("\n");
const configuracao = {
    id:
        null,

    escopo:
        "GLOBAL" as const,

    versao:
        6,

    destinatarios: [
        "destinatario@example.com",
    ],

    copias: [],

    responderPara:
        "",

    nomeRemetente:
        "SafeScan Brasil",

    assuntoModelo:
        "Pendências documentais — {{empresa_nome}} — {{competencia}}",

    corpoModelo:
        corpoOriginal,

    anexarPdfs:
        false,

    estrategiaExcedente:
        "DIVIDIR_EM_PARTES" as const,

    limiteMensagemBytes:
        24_000_000,
};

const parte = {
    id:
        "11111111-1111-4111-8111-111111111111",

    numero:
        1,

    total:
        1,

    assunto:
        "Pendências documentais — RIBEIRO AQUINO — 07/2026",

    documentos: [],

    tamanhoAnexosBytes:
        0,
};

const mensagem =
    montarMensagemEmail({
        gmailUser:
            "safescan@example.com",

        configuracao,

        destinatarios:
            configuracao.destinatarios,

        copias: [],

        parte,

        corpo:
            corpoOriginal,

        anexos: [],

        assinatura:
            null,
    });

assert.equal(
    mensagem.attachments,
    undefined,
    "O visual simples não pode adicionar anexos.",
);

assert.match(
    mensagem.html,
    /<!doctype html>/i,
    "O e-mail deve possuir HTML completo.",
);

assert.match(
    mensagem.html,
    /max-width:720px/,
    "O e-mail deve manter largura tradicional e legível.",
);

assert.doesNotMatch(
    mensagem.html,
    /SAFESCAN BRASIL|background-color:#0d5368|border-radius:1[04]px|box-shadow:/i,
    "O e-mail não pode usar banner, cartão geral ou aparência de peça gráfica.",
);

assert.match(
    mensagem.html,
    /Pendências identificadas/,
    "A lista deve receber um título discreto.",
);

assert.match(
    mensagem.html,
    /border-bottom:2px solid #16856f/,
    "O título deve usar somente uma linha verde discreta.",
);

assert.match(
    mensagem.html,
    /<strong[^>]*>RIBEIRO AQUINO<\/strong>/,
    "O nome da empresa deve aparecer em negrito.",
);

assert.match(
    mensagem.html,
    /<strong[^>]*>07\/2026<\/strong>/,
    "A competência deve aparecer em negrito.",
);

assert.match(
    mensagem.html,
    /<ol[^>]*>/,
    "Os documentos devem permanecer em uma lista tradicional.",
);

assert.doesNotMatch(
    mensagem.html,
    /<table|<svg|https?:\/\//i,
    "O corpo não pode depender de cartões, imagens, tabelas ou recursos externos.",
);

const posicoesHtml =
    [
        "CND Federal",
        "CRF FGTS",
        "FGTS",
        "CNDT (Trabalhista)",
        "CND Estadual",
        "CND Municipal",
        "Falência e Concordata",
        "Cadastro TCE / CEIS",
        "Folha de Pagamento e Comprovantes",
        "Espelho de Ponto",
        "VA / VT",
        "Seguro de Vida",
        "INSS / DCTFWeb",
        "ISSQN",
        "eSocial SST",
    ].map(
        (titulo) =>
            mensagem.html.indexOf(
                titulo,
            ),
    );
assert.ok(
    posicoesHtml.every(
        (posicao) =>
            posicao >= 0,
    ),
    "Todos os quinze documentos devem aparecer no HTML.",
);

assert.deepEqual(
    [...posicoesHtml].sort(
        (a, b) =>
            a - b,
    ),
    posicoesHtml,
    "Os documentos devem aparecer na ordem canônica do sistema.",
);

const posicoesTexto =
    [
        "1. CND Federal",
        "2. CRF FGTS",
        "3. FGTS",
        "4. CNDT (Trabalhista)",
        "5. CND Estadual",
        "6. CND Municipal",
        "7. Falência e Concordata",
        "8. Cadastro TCE / CEIS",
        "9. Folha de Pagamento e Comprovantes",
        "10. Espelho de Ponto",
        "11. VA / VT",
        "12. Seguro de Vida",
        "13. INSS / DCTFWeb",
        "14. ISSQN",
        "15. eSocial SST",
    ].map(
        (titulo) =>
            mensagem.text.indexOf(
                titulo,
            ),
    );
assert.ok(
    posicoesTexto.every(
        (posicao) =>
            posicao >= 0,
    ),
    "A versão textual também deve usar a ordem canônica.",
);

assert.match(
    mensagem.html,
    /color:#9a5b08;font-weight:600/,
    "O status deve receber cor discreta e legível.",
);

assert.match(
    mensagem.html,
    /Total de pendências identificadas:<\/strong>\s*<strong[^>]*>15<\/strong>/,
    "O total deve aparecer em negrito sem cartão visual.",
);

assert.doesNotMatch(
    mensagem.html,
    /<script/i,
    "O HTML não pode conter scripts.",
);

const assinatura = {
    bytes:
        new Uint8Array([
            137,
            80,
            78,
            71,
        ]),

    contentType:
        "image/png" as const,

    filename:
        "assinatura.png",

    cid:
        "assinatura-safescan",
};

const mensagemComAssinatura =
    montarMensagemEmail({
        gmailUser:
            "safescan@example.com",

        configuracao,

        destinatarios:
            configuracao.destinatarios,

        copias: [],

        parte,

        corpo:
            corpoOriginal,

        anexos: [],

        assinatura,
    });

assert.equal(
    mensagemComAssinatura.attachments?.length,
    1,
    "Somente a assinatura já existente pode permanecer incorporada.",
);

assert.equal(
    mensagemComAssinatura.attachments?.[0]?.contentDisposition,
    "inline",
    "A assinatura deve permanecer inline, sem PDF documental.",
);

assert.match(
    mensagemComAssinatura.html,
    /cid:assinatura-safescan/,
    "A assinatura existente deve continuar vinculada pelo CID.",
);

const mensagemEscapada =
    montarMensagemEmail({
        gmailUser:
            "safescan@example.com",

        configuracao,

        destinatarios:
            configuracao.destinatarios,

        copias: [],

        parte,

        corpo:
            corpoOriginal.replace(
                "RIBEIRO AQUINO",
                "RIBEIRO <script>alert(1)</script>",
            ),

        anexos: [],

        assinatura:
            null,
    });

assert.doesNotMatch(
    mensagemEscapada.html,
    /<script>alert/i,
    "Conteúdo variável deve permanecer escapado.",
);

assert.match(
    mensagemEscapada.html,
    /&lt;script&gt;/,
    "Caracteres perigosos devem ser convertidos para entidades HTML.",
);

console.log(
    "CERTIDÃO MENSAL — VISUAL SIMPLES DO E-MAIL APROVADO",
);

console.log(
    "Cenários validados: formato tradicional, espaçamento, negrito, cores discretas, ordem documental, ausência de imagens decorativas, assinatura inline e segurança HTML.",
);

console.log(
    "Nenhum e-mail real, PDF, SQL ou deploy foi executado.",
);
