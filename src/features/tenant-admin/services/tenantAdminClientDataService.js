import {
    supabase,
} from "../../../lib/supabaseClient.js";

function texto(valor) {
    return String(
        valor ?? ""
    ).trim();
}

function email(valor) {
    return texto(
        valor
    ).toLowerCase();
}

function mensagemErroConhecido({
    codigo,
    mensagem,
} = {}) {
    const codigoNormalizado =
        texto(
            codigo
        )
            .trim()
            .toUpperCase();

    const mensagemNormalizada =
        texto(
            mensagem
        );

    const mensagemLower =
        mensagemNormalizada
            .toLowerCase();

    const emailDuplicado =
        codigoNormalizado ===
            "AUTH_NAO_ATUALIZADO" &&
        (
            mensagemLower.includes(
                "already been registered"
            ) ||
            mensagemLower.includes(
                "already registered"
            ) ||
            mensagemLower.includes(
                "already exists"
            ) ||
            mensagemLower.includes(
                "email address has already"
            )
        );

    if (
        emailDuplicado
    ) {
        return (
            "Este e-mail já está cadastrado no SafeScan para outro usuário. " +
            "Informe outro e-mail de acesso."
        );
    }

    if (
        codigoNormalizado ===
        "EMAIL_DIVERGENTE"
    ) {
        return (
            "O e-mail do login e o e-mail do perfil estão diferentes. " +
            "Atualize os dados antes de continuar."
        );
    }

    if (
        codigoNormalizado ===
        "ALVO_GLOBAL_BLOQUEADO"
    ) {
        return (
            "Este usuário possui acesso global ou pertence à Conta Mestre " +
            "e não pode ser alterado por este fluxo."
        );
    }

    if (
        codigoNormalizado ===
        "MEMBERSHIP_NAO_LOCALIZADA"
    ) {
        return (
            "O vínculo deste administrador com o cliente não foi localizado."
        );
    }

    if (
        codigoNormalizado ===
        "EMPRESA_NAO_LOCALIZADA"
    ) {
        return (
            "A empresa selecionada não pertence a este cliente."
        );
    }

    if (
        mensagemNormalizada
    ) {
        return mensagemNormalizada;
    }

    return "";
}

async function extrairMensagemErroEdge(
    error,
    data
) {
    const mensagemData =
        mensagemErroConhecido({
            codigo:
                data?.codigo,

            mensagem:
                data?.erro,
        });

    if (
        mensagemData
    ) {
        return mensagemData;
    }

    const contexto =
        error?.context;

    if (
        contexto &&
        typeof contexto.json ===
            "function"
    ) {
        try {
            const resposta =
                typeof contexto.clone ===
                    "function"
                    ? contexto.clone()
                    : contexto;

            const payload =
                await resposta.json();

            const mensagemPayload =
                mensagemErroConhecido({
                    codigo:
                        payload?.codigo,

                    mensagem:
                        payload?.erro ||
                        payload?.error ||
                        payload?.message,
                });

            if (
                mensagemPayload
            ) {
                return mensagemPayload;
            }
        }
        catch {
            // Se o body não for JSON, seguimos para os fallbacks.
        }
    }

    const mensagemGenerica =
        texto(
            error?.message
        );

    if (
        mensagemGenerica &&
        !mensagemGenerica
            .toLowerCase()
            .includes(
                "non-2xx status code"
            )
    ) {
        return mensagemGenerica;
    }

    return (
        "Não foi possível salvar os dados do cliente. " +
        "O servidor recusou a alteração."
    );
}

export async function salvarDadosClienteTenantAdminService({
    tenantId,
    userId,
    empresaId,
    adminNome,
    adminEmail,
    adminFuncao,
    empresaNome,
    empresaRazaoSocial,
    empresaResponsavel,
    empresaEmail,
} = {}) {
    const {
        data,
        error,
    } =
        await supabase.functions.invoke(
            "admin-ajustar-dados-cliente",
            {
                body: {
                    tenantId:
                        texto(
                            tenantId
                        ),

                    userId:
                        texto(
                            userId
                        ),

                    empresaId:
                        texto(
                            empresaId
                        ),

                    adminNome:
                        texto(
                            adminNome
                        ),

                    adminEmail:
                        email(
                            adminEmail
                        ),

                    adminFuncao:
                        texto(
                            adminFuncao
                        ),

                    empresaNome:
                        texto(
                            empresaNome
                        ),

                    empresaRazaoSocial:
                        texto(
                            empresaRazaoSocial
                        ),

                    empresaResponsavel:
                        texto(
                            empresaResponsavel
                        ),

                    empresaEmail:
                        email(
                            empresaEmail
                        ),
                },
            }
        );

    if (
        error ||
        data?.ok !== true
    ) {
        const mensagem =
            await extrairMensagemErroEdge(
                error,
                data
            );

        throw new Error(
            mensagem
        );
    }

    return {
        ok:
            true,

        userId:
            texto(
                data.userId
            ),

        membershipId:
            texto(
                data.membershipId
            ),

        emailAlterado:
            data.emailAlterado ===
            true,

        primeiroAcessoReenvioNecessario:
            data.primeiroAcessoReenvioNecessario ===
            true,
    };
}
