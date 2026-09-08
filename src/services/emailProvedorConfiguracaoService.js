const FUNCAO_ADMIN_PROVEDOR_EMAIL =
    "admin-gerenciar-provedor-email";

function textoSeguro(valor) {
    return typeof valor === "string"
        ? valor.trim()
        : "";
}

function objetoPlano(valor) {
    return Boolean(valor) &&
        typeof valor === "object" &&
        !Array.isArray(valor);
}

function contextoErroSeguro(error) {
    const candidatos = [
        error?.context?.json,
        error?.context?.body,
        error?.context?.data,
    ];

    return candidatos.find(objetoPlano) || null;
}

function criarErroProvider(error, data) {
    const contexto =
        contextoErroSeguro(error);

    const mensagem =
        textoSeguro(data?.erro) ||
        textoSeguro(contexto?.erro) ||
        textoSeguro(data?.error) ||
        textoSeguro(contexto?.error) ||
        textoSeguro(error?.message) ||
        "Não foi possível consultar o provedor de e-mail.";

    const erro =
        new Error(mensagem);

    erro.codigo =
        textoSeguro(data?.codigo) ||
        textoSeguro(contexto?.codigo) ||
        "ERRO_INTERNO";

    return erro;
}

function numeroOuNulo(valor) {
    if (
        valor === null ||
        valor === undefined ||
        valor === ""
    ) {
        return null;
    }

    const numero =
        Number(valor);

    return Number.isFinite(numero)
        ? numero
        : null;
}

export function normalizarConfiguracaoProvedorEmail(
    configuracao = null,
) {
    if (!objetoPlano(configuracao)) {
        return null;
    }

    return {
        id:
            textoSeguro(configuracao.id) ||
            null,

        chave:
            textoSeguro(configuracao.chave) ||
            null,

        provedor:
            textoSeguro(configuracao.provedor)
                .toUpperCase() ||
            null,

        host:
            textoSeguro(configuracao.host) ||
            null,

        porta:
            numeroOuNulo(configuracao.porta),

        modoSeguranca:
            textoSeguro(
                configuracao.modoSeguranca,
            ).toUpperCase() ||
            null,

        usuarioSmtp:
            textoSeguro(
                configuracao.usuarioSmtp,
            ) ||
            null,

        remetenteEmail:
            textoSeguro(
                configuracao.remetenteEmail,
            ).toLowerCase() ||
            null,

        remetenteNomePadrao:
            textoSeguro(
                configuracao.remetenteNomePadrao,
            ) ||
            null,

        responderParaPadrao:
            textoSeguro(
                configuracao.responderParaPadrao,
            ).toLowerCase() ||
            null,

        ativo:
            configuracao.ativo === true,

        credencialConfigurada:
            configuracao.credencialConfigurada ===
            true,

        ultimoTesteStatus:
            textoSeguro(
                configuracao.ultimoTesteStatus,
            ).toUpperCase() ||
            "NAO_TESTADO",

        ultimoTesteCodigo:
            textoSeguro(
                configuracao.ultimoTesteCodigo,
            ) ||
            null,

        ultimoTesteEm:
            textoSeguro(
                configuracao.ultimoTesteEm,
            ) ||
            null,

        ultimoTestePor:
            textoSeguro(
                configuracao.ultimoTestePor,
            ) ||
            null,

        versao:
            numeroOuNulo(configuracao.versao),

        atualizadoEm:
            textoSeguro(
                configuracao.atualizadoEm,
            ) ||
            null,

        atualizadoPor:
            textoSeguro(
                configuracao.atualizadoPor,
            ) ||
            null,
    };
}

async function invocarAdministracaoProvedorEmail({
    supabase,
    acao,
    payload = {},
} = {}) {
    if (!supabase?.functions?.invoke) {
        throw new Error(
            "Cliente Supabase não informado para administrar o provedor de e-mail.",
        );
    }

    const {
        data,
        error,
    } =
        await supabase.functions.invoke(
            FUNCAO_ADMIN_PROVEDOR_EMAIL,
            {
                body: {
                    ...payload,
                    acao,
                },
            },
        );

    if (
        error ||
        data?.ok === false
    ) {
        throw criarErroProvider(
            error,
            data,
        );
    }

    return objetoPlano(data)
        ? data
        : {};
}

function normalizarVersaoEsperada(valor) {
    if (
        valor === null ||
        valor === undefined ||
        valor === ""
    ) {
        return null;
    }

    const numero =
        Number(valor);

    if (
        !Number.isInteger(numero) ||
        numero < 1
    ) {
        throw new Error(
            "Versão da configuração do provedor inválida.",
        );
    }

    return numero;
}

function normalizarCredencialNova(valor) {
    if (
        valor === null ||
        valor === undefined ||
        valor === ""
    ) {
        return null;
    }

    if (
        typeof valor !== "string"
    ) {
        throw new Error(
            "Credencial SMTP inválida.",
        );
    }

    if (
        valor.length > 500
    ) {
        throw new Error(
            "A credencial SMTP excede o limite permitido.",
        );
    }

    /*
     * Não aplicar trim().
     * A credencial é write-only e deve ser preservada exatamente
     * como foi digitada.
     */
    return valor;
}

function montarPayloadSalvar(
    configuracao,
    credencialNova,
) {
    if (!objetoPlano(configuracao)) {
        throw new Error(
            "Configuração do provedor não informada.",
        );
    }

    return {
        provedor:
            textoSeguro(
                configuracao.provedor,
            ).toUpperCase() ||
            null,

        host:
            textoSeguro(
                configuracao.host,
            ).toLowerCase() ||
            null,

        porta:
            numeroOuNulo(
                configuracao.porta,
            ),

        modoSeguranca:
            textoSeguro(
                configuracao.modoSeguranca,
            ).toUpperCase() ||
            null,

        usuarioSmtp:
            textoSeguro(
                configuracao.usuarioSmtp,
            ) ||
            null,

        remetenteEmail:
            textoSeguro(
                configuracao.remetenteEmail,
            ).toLowerCase() ||
            null,

        remetenteNomePadrao:
            textoSeguro(
                configuracao.remetenteNomePadrao,
            ) ||
            null,

        responderParaPadrao:
            textoSeguro(
                configuracao.responderParaPadrao,
            ).toLowerCase() ||
            null,

        versaoEsperada:
            normalizarVersaoEsperada(
                configuracao.versao,
            ),

        credencialNova:
            normalizarCredencialNova(
                credencialNova,
            ),
    };
}

function normalizarResultadoTeste(
    teste,
) {
    if (!objetoPlano(teste)) {
        return null;
    }

    return {
        status:
            textoSeguro(
                teste.status,
            ).toUpperCase() ||
            null,

        codigo:
            textoSeguro(
                teste.codigo,
            ) ||
            null,
    };
}

export async function obterConfiguracaoProvedorEmailService({
    supabase,
} = {}) {
    const data =
        await invocarAdministracaoProvedorEmail({
            supabase,
            acao:
                "obter",
        });

    return normalizarConfiguracaoProvedorEmail(
        data?.configuracao,
    );
}

export async function salvarConfiguracaoProvedorEmailService({
    supabase,
    configuracao,
    credencialNova = null,
} = {}) {
    const data =
        await invocarAdministracaoProvedorEmail({
            supabase,
            acao:
                "salvar",

            payload:
                montarPayloadSalvar(
                    configuracao,
                    credencialNova,
                ),
        });

    return normalizarConfiguracaoProvedorEmail(
        data?.configuracao,
    );
}

export async function testarConfiguracaoProvedorEmailService({
    supabase,
} = {}) {
    const data =
        await invocarAdministracaoProvedorEmail({
            supabase,
            acao:
                "testar",
        });

    return {
        configuracao:
            normalizarConfiguracaoProvedorEmail(
                data?.configuracao,
            ),

        teste:
            normalizarResultadoTeste(
                data?.teste,
            ),
    };
}

export async function ativarConfiguracaoProvedorEmailService({
    supabase,
    versaoEsperada,
} = {}) {
    const versao =
        normalizarVersaoEsperada(
            versaoEsperada,
        );

    if (versao === null) {
        throw new Error(
            "Não existe versão válida para ativar o provedor.",
        );
    }

    const data =
        await invocarAdministracaoProvedorEmail({
            supabase,
            acao:
                "ativar",

            payload: {
                versaoEsperada:
                    versao,
            },
        });

    return normalizarConfiguracaoProvedorEmail(
        data?.configuracao,
    );
}

export async function desativarConfiguracaoProvedorEmailService({
    supabase,
    versaoEsperada,
} = {}) {
    const versao =
        normalizarVersaoEsperada(
            versaoEsperada,
        );

    if (versao === null) {
        throw new Error(
            "Não existe versão válida para desativar o provedor.",
        );
    }

    const data =
        await invocarAdministracaoProvedorEmail({
            supabase,
            acao:
                "desativar",

            payload: {
                versaoEsperada:
                    versao,
            },
        });

    return normalizarConfiguracaoProvedorEmail(
        data?.configuracao,
    );
}
