const FUNCAO_LOGIN_GUARD =
    "auth-login-guard";

const MENSAGEM_LOGIN =
    "Não foi possível entrar. Confira as credenciais ou aguarde alguns minutos antes de tentar novamente.";

const MENSAGEM_SEGURANCA =
    "Não foi possível concluir a verificação de segurança. Tente novamente.";

function mensagemUltimaTentativa(
    bloqueioMinutos = 0
) {
    const minutos =
        Number(
            bloqueioMinutos
        );

    const duracao =
        minutos === 30
            ? 30
            : minutos === 60
                ? 60
                : 15;

    return (
        "Atenção: resta 1 tentativa antes do bloqueio temporário de " +
        duracao +
        " minutos."
    );
}

function textoSeguro(
    valor,
    limite = 1000
) {
    return String(
        valor ??
        ""
    )
        .replace(
            /\0/g,
            ""
        )
        .trim()
        .slice(
            0,
            limite
        );
}

function criarErro(
    codigo,
    mensagem,
    status = 0,
    metadados = {}
) {
    const error =
        new Error(
            mensagem ||
            MENSAGEM_LOGIN
        );

    error.code =
        textoSeguro(
            codigo,
            120
        )
            .toLowerCase();

    error.status =
        Number(
            status
        ) || 0;

    const tentativasRestantes =
        Number(
            metadados?.tentativasRestantes
        );

    error.tentativasRestantes =
        (
            Number.isInteger(
                tentativasRestantes
            ) &&
            tentativasRestantes >= 0
        )
            ? tentativasRestantes
            : 0;

    const bloqueioMinutos =
        Number(
            metadados?.bloqueioMinutos
        );

    error.bloqueioMinutos =
        (
            bloqueioMinutos === 15 ||
            bloqueioMinutos === 30 ||
            bloqueioMinutos === 60
        )
            ? bloqueioMinutos
            : 0;

    return error;
}

async function extrairErroFuncao(
    error
) {
    let payload =
        null;

    try {
        if (
            error?.context &&
            typeof error.context.json ===
                "function"
        ) {
            payload =
                await error.context
                    .json();
        }
    }
    catch {
        payload =
            null;
    }

    return {
        codigo:
            textoSeguro(
                payload?.codigo ||
                error?.code,
                120
            )
                .toLowerCase(),

        mensagem:
            textoSeguro(
                payload?.mensagem,
                800
            ),

        status:
            Number(
                payload?.status ||
                error?.status
            ) || 0,

        tentativasRestantes:
            Number(
                payload?.tentativas_restantes
            ) || 0,

        bloqueioMinutos:
            Number(
                payload?.bloqueio_minutos
            ) || 0,
    };
}

function mensagemPublica(
    codigo,
    mensagem,
    bloqueioMinutos = 0
) {
    if (
        codigo ===
        "captcha_invalid"
    ) {
        return (
            mensagem ||
            MENSAGEM_SEGURANCA
        );
    }

    if (
        codigo ===
        "login_last_attempt"
    ) {
        return mensagemUltimaTentativa(
            bloqueioMinutos
        );
    }

    if (
        codigo ===
        "login_blocked"
    ) {
        const minutos =
            Number(
                bloqueioMinutos
            );

        if (
            minutos === 15 ||
            minutos === 30 ||
            minutos === 60
        ) {
            return (
                "Acesso temporariamente bloqueado por " +
                minutos +
                " minutos após várias tentativas incorretas. " +
                "Aguarde ou utilize “Esqueci minha senha”."
            );
        }

        return (
            "Acesso temporariamente bloqueado após várias tentativas incorretas. " +
            "Aguarde o período de segurança ou utilize “Esqueci minha senha”."
        );
    }

    return MENSAGEM_LOGIN;
}

export async function autenticarSenhaComGuardService({
    supabase,
    email,
    password,
    captchaToken,
} = {}) {
    if (
        !supabase?.functions ||
        typeof supabase.functions.invoke !==
            "function" ||
        !supabase?.auth ||
        typeof supabase.auth.setSession !==
            "function"
    ) {
        throw criarErro(
            "service_unavailable",
            "O serviço de autenticação está indisponível."
        );
    }

    const emailSeguro =
        textoSeguro(
            email,
            254
        )
            .toLowerCase();

    const senha =
        String(
            password ??
            ""
        );

    const captcha =
        textoSeguro(
            captchaToken,
            4096
        );

    if (
        !emailSeguro ||
        !senha ||
        !captcha
    ) {
        throw criarErro(
            "invalid_request",
            MENSAGEM_LOGIN
        );
    }

    const {
        data,
        error,
    } =
        await supabase.functions
            .invoke(
                FUNCAO_LOGIN_GUARD,
                {
                    body: {
                        email:
                            emailSeguro,

                        password:
                            senha,

                        captchaToken:
                            captcha,
                    },
                }
            );

    if (error) {
        const detalhes =
            await extrairErroFuncao(
                error
            );

        throw criarErro(
            detalhes.codigo ||
            "login_guard_error",
            mensagemPublica(
                detalhes.codigo,
                detalhes.mensagem,
                detalhes.bloqueioMinutos
            ),
            detalhes.status,
            {
                tentativasRestantes:
                    detalhes.tentativasRestantes,

                bloqueioMinutos:
                    detalhes.bloqueioMinutos,
            }
        );
    }

    if (
        data?.ok !==
        true
    ) {
        const codigo =
            textoSeguro(
                data?.codigo,
                120
            )
                .toLowerCase();

        const tentativasRestantes =
            Number(
                data?.tentativas_restantes
            ) || 0;

        const bloqueioMinutos =
            Number(
                data?.bloqueio_minutos
            ) || 0;

        throw criarErro(
            codigo ||
            "login_guard_error",
            mensagemPublica(
                codigo,
                textoSeguro(
                    data?.mensagem,
                    800
                ),
                bloqueioMinutos
            ),
            0,
            {
                tentativasRestantes,
                bloqueioMinutos,
            }
        );
    }

    const accessToken =
        textoSeguro(
            data
                ?.session
                ?.access_token,
            12000
        );

    const refreshToken =
        textoSeguro(
            data
                ?.session
                ?.refresh_token,
            12000
        );

    if (
        !accessToken ||
        !refreshToken
    ) {
        throw criarErro(
            "session_unavailable",
            MENSAGEM_LOGIN
        );
    }

    const {
        data:
            sessionData,
        error:
            sessionError,
    } =
        await supabase.auth
            .setSession({
                access_token:
                    accessToken,

                refresh_token:
                    refreshToken,
            });

    if (
        sessionError ||
        !sessionData
            ?.session
            ?.user
            ?.id
    ) {
        throw criarErro(
            "session_unavailable",
            MENSAGEM_LOGIN
        );
    }

    return {
        session:
            sessionData.session,

        user:
            sessionData.session.user,
    };
}

export {
    MENSAGEM_LOGIN as MENSAGEM_LOGIN_GUARD,
};
