const ERROS_HTTP = Object.freeze({
    400: "Revise os dados informados na configuração SMTP.",
    401: "Sua sessão expirou. Entre novamente no sistema.",
    403: "Você não tem permissão para configurar o e-mail desta empresa.",
    404: "Serviço SMTP não encontrado. Contate o suporte.",
    409: "A configuração foi alterada. Atualize antes de continuar.",
    422: "Os dados do provedor SMTP não foram aceitos.",
    429: "Muitas tentativas. Aguarde antes de tentar novamente.",
    500: "Não foi possível concluir a operação SMTP. Tente novamente mais tarde.",
    502: "O serviço SMTP está temporariamente indisponível.",
    503: "O serviço SMTP está temporariamente indisponível.",
    504: "O serviço SMTP demorou para responder. Tente novamente.",
});

const ERROS_CODIGO = Object.freeze({
    PERMISSAO_NEGADA: ERROS_HTTP[403],
    CONFIGURACAO_INVALIDA: ERROS_HTTP[400],
    CONFLITO_VERSAO: ERROS_HTTP[409],
    PROVEDOR_NAO_CONFIGURADO:
        "Configure uma credencial SMTP antes de executar o teste.",
    ERRO_INTERNO: ERROS_HTTP[500],
});

const ERROS_TESTE = Object.freeze({
    SMTP_AUTENTICACAO_FALHOU:
        "O servidor recusou a credencial SMTP. Confira o usuário e a senha de aplicativo.",
    SMTP_TIMEOUT:
        "O servidor SMTP demorou para responder. Verifique a rede e tente novamente.",
    SMTP_CONEXAO_FALHOU:
        "Não foi possível conectar ao servidor SMTP. Confira host, porta e rede.",
    SMTP_TLS_FALHOU:
        "Falha na conexão segura SMTP. Confira o tipo de segurança e a porta.",
    SMTP_TESTE_FALHOU:
        "Não foi possível validar a conexão SMTP. Confira as configurações.",
});

const ERRO_GENERICO =
    "Não foi possível concluir a operação SMTP. Tente novamente ou contate o suporte.";

const ERRO_REDE =
    "Não foi possível conectar ao serviço de e-mail. Verifique a conexão e tente novamente.";

export function mensagemFalhaEmailTenant(status, codigo) {
    const numero = Number(status);

    if (numero === 401 || numero === 403) {
        return ERROS_HTTP[numero];
    }

    const chave = String(codigo ?? "").trim().toUpperCase();

    if (Object.hasOwn(ERROS_CODIGO, chave)) {
        return ERROS_CODIGO[chave];
    }

    return ERROS_HTTP[numero] || ERRO_GENERICO;
}

export async function mensagemErroEdgeEmailTenant(erro) {
    const contexto = erro?.context;

    if (!contexto || typeof contexto.status !== "number") {
        return ERRO_REDE;
    }

    let codigo = null;

    try {
        if (typeof contexto.json === "function") {
            const corpo = await contexto.json();
            codigo = corpo?.codigo;
        }
    } catch {
        // Resposta invalida: nunca exibir corpo bruto ou credenciais.
    }

    return mensagemFalhaEmailTenant(contexto.status, codigo);
}

export function mensagemTesteEmailTenant(codigo) {
    const chave = String(codigo ?? "").trim().toUpperCase();

    return ERROS_TESTE[chave] || ERROS_TESTE.SMTP_TESTE_FALHOU;
}
