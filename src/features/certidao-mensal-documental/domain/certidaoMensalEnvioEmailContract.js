const UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const EMAIL_PATTERN =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const CHAVE_IDEMPOTENCIA_PATTERN =
    /^[A-Za-z0-9:_-]{16,120}$/;

export const CERTIDAO_MENSAL_EMAIL_FUNCTION_NAME =
    "enviar-certidao-mensal-documental";

export const CERTIDAO_MENSAL_EMAIL_BUCKET =
    "certidao-mensal-documentos";

export const CERTIDAO_MENSAL_EMAIL_CONFIG_SCOPE =
    Object.freeze({
        GLOBAL:
            "GLOBAL",
        EMPRESA:
            "EMPRESA",
    });

export const CERTIDAO_MENSAL_EMAIL_SEND_STATUS =
    Object.freeze({
        PREPARANDO:
            "PREPARANDO",
        ENVIANDO:
            "ENVIANDO",
        ENVIADO:
            "ENVIADO",
        PARCIAL:
            "PARCIAL",
        ERRO:
            "ERRO",
    });

export const CERTIDAO_MENSAL_EMAIL_OVERFLOW_STRATEGY =
    Object.freeze({
        DIVIDIR_EM_PARTES:
            "DIVIDIR_EM_PARTES",
    });

export const CERTIDAO_MENSAL_EMAIL_LIMITS =
    Object.freeze({
        destinatarios:
            10,
        copias:
            10,
        assunto:
            180,
        corpo:
            10000,
        nomeRemetente:
            120,
        responderPara:
            254,
        documentos:
            50,
        bytesPorMensagem:
            18 * 1024 * 1024,
    });

export const CERTIDAO_MENSAL_EMAIL_TEMPLATE_VARIABLES =
    Object.freeze([
        "saudacao",
        "empresa_nome",
        "empresa_cnpj",
        "competencia",
        "resumo",
        "itens",
        "total_documentos",
        "total_pendencias",
    ]);

export const CERTIDAO_MENSAL_EMAIL_DEFAULT_CONFIG =
    Object.freeze({
        ativo:
            false,

        destinatarios:
            [],
        copias:
            [],
        responderPara:
            "",
        nomeRemetente:
            "SafeScan Brasil",
        assuntoModelo:
            "Pendências documentais — {{empresa_nome}} — {{competencia}}",
        corpoModelo:
            [
                "{{saudacao}},",
                "",
                "Durante a conferência da documentação mensal da empresa {{empresa_nome}},",
                "referente à competência {{competencia}}, foram identificadas as pendências abaixo:",
                "",
                "{{itens}}",
                "",
                "Solicitamos a regularização dos itens relacionados e o envio dos documentos faltantes ou corrigidos pelo canal habitual.",
                "",
                "Total de pendências identificadas: {{total_pendencias}}.",
                "",
                "Em caso de dúvida, responda a este e-mail.",
            ].join("\n"),
        estrategiaExcedente:
            CERTIDAO_MENSAL_EMAIL_OVERFLOW_STRATEGY
                .DIVIDIR_EM_PARTES,
        limiteMensagemBytes:
            CERTIDAO_MENSAL_EMAIL_LIMITS
                .bytesPorMensagem,
    });

function normalizarTexto(
    valor,
    limite
) {
    const texto =
        String(
            valor || ""
        ).trim();

    if (
        Number.isInteger(limite) &&
        limite > 0 &&
        texto.length > limite
    ) {
        throw new Error(
            `Texto excede o limite de ${limite} caracteres.`
        );
    }

    return texto;
}

function validarEmail(
    email
) {
    return EMAIL_PATTERN.test(
        String(
            email || ""
        ).trim()
    );
}

export function normalizarListaEmails(
    valor,
    limite
) {
    const registros =
        Array.isArray(valor)
            ? valor
            : String(
                valor || ""
            ).split(
                /[;,\n]/
            );

    const emails =
        [
            ...new Set(
                registros
                    .map(
                        (registro) =>
                            String(
                                registro || ""
                            )
                                .trim()
                                .toLowerCase()
                    )
                    .filter(Boolean)
            ),
        ];

    if (
        Number.isInteger(limite) &&
        limite > 0 &&
        emails.length > limite
    ) {
        throw new Error(
            `Quantidade máxima de e-mails excedida: ${limite}.`
        );
    }

    const emailInvalido =
        emails.find(
            (email) =>
                !validarEmail(
                    email
                )
        );

    if (emailInvalido) {
        throw new Error(
            `Endereço de e-mail inválido: ${emailInvalido}`
        );
    }

    return emails;
}

export function normalizarConfiguracaoEnvioCertidaoMensal(
    configuracao = {}
) {
    const ativo =
        Boolean(
            configuracao.ativo
        );


    const destinatarios =
        normalizarListaEmails(
            configuracao.destinatarios,
            CERTIDAO_MENSAL_EMAIL_LIMITS
                .destinatarios
        );

    const copias =
        normalizarListaEmails(
            configuracao.copias,
            CERTIDAO_MENSAL_EMAIL_LIMITS
                .copias
        );

    const responderPara =
        normalizarTexto(
            configuracao.responderPara,
            CERTIDAO_MENSAL_EMAIL_LIMITS
                .responderPara
        );

    if (
        responderPara &&
        !validarEmail(
            responderPara
        )
    ) {
        throw new Error(
            "O endereço de resposta é inválido."
        );
    }

    const nomeRemetente =
        normalizarTexto(
            configuracao.nomeRemetente ||
                CERTIDAO_MENSAL_EMAIL_DEFAULT_CONFIG
                    .nomeRemetente,
            CERTIDAO_MENSAL_EMAIL_LIMITS
                .nomeRemetente
        );

    const assuntoModelo =
        normalizarTexto(
            configuracao.assuntoModelo ||
                CERTIDAO_MENSAL_EMAIL_DEFAULT_CONFIG
                    .assuntoModelo,
            CERTIDAO_MENSAL_EMAIL_LIMITS
                .assunto
        );

    const corpoModelo =
        normalizarTexto(
            configuracao.corpoModelo ||
                CERTIDAO_MENSAL_EMAIL_DEFAULT_CONFIG
                    .corpoModelo,
            CERTIDAO_MENSAL_EMAIL_LIMITS
                .corpo
        );

    if (
        ativo &&
        destinatarios.length === 0
    ) {
        throw new Error(
            "A configuração ativa precisa de ao menos um destinatário."
        );
    }

    return {
        ativo,
        destinatarios,
        copias,
        responderPara,
        nomeRemetente,
        assuntoModelo,
        corpoModelo,

        estrategiaExcedente:
            CERTIDAO_MENSAL_EMAIL_OVERFLOW_STRATEGY
                .DIVIDIR_EM_PARTES,
        limiteMensagemBytes:
            CERTIDAO_MENSAL_EMAIL_LIMITS
                .bytesPorMensagem,
    };
}

export function criarSolicitacaoEnvioCertidaoMensal({
    competenciaId,
    chaveIdempotencia,
} = {}) {
    const competenciaNormalizada =
        String(
            competenciaId || ""
        ).trim();

    if (
        !UUID_PATTERN.test(
            competenciaNormalizada
        )
    ) {
        throw new Error(
            "Competência persistida inválida para envio."
        );
    }

    const chaveNormalizada =
        String(
            chaveIdempotencia || ""
        ).trim();

    if (
        !CHAVE_IDEMPOTENCIA_PATTERN.test(
            chaveNormalizada
        )
    ) {
        throw new Error(
            "Chave de idempotência inválida para envio."
        );
    }

    return {
        competenciaId:
            competenciaNormalizada,
        chaveIdempotencia:
            chaveNormalizada,
    };
}
