export const ESTADOS_AUDITORIA_ACESSO_EMPRESA =
    Object.freeze({
        CONFIRMADO:
            "CONFIRMADO",

        NEGADO:
            "NEGADO",

        INDETERMINADO:
            "INDETERMINADO",
    });

export const CERTIDAO_MENSAL_RPC_ACESSO_EMPRESA =
    "certidao_mensal_usuario_pode_acessar_empresa";

const PADRAO_UUID =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function textoSeguro(
    valor
) {
    return String(
        valor ??
        ""
    ).trim();
}

function normalizarEmpresaId(
    valor
) {
    const empresaId =
        textoSeguro(
            valor
        ).toLowerCase();

    return PADRAO_UUID.test(
        empresaId
    )
        ? empresaId
        : "";
}

function normalizarErro(
    error
) {
    if (!error) {
        return null;
    }

    const status =
        Number(
            error?.status ??
            error?.statusCode ??
            error?.httpStatusCode
        );

    return Object.freeze({
        codigo:
            textoSeguro(
                error?.code ||
                error?.name ||
                error?.error
            ),

        mensagem:
            textoSeguro(
                error?.message
            ),

        statusHttp:
            Number.isInteger(
                status
            ) &&
            status >= 100 &&
            status <= 599
                ? status
                : null,
    });
}

function resposta({
    estadoAcesso,
    codigo,
    motivo,
    empresaId = "",
    erro = null,
} = {}) {
    const confirmado =
        estadoAcesso ===
        ESTADOS_AUDITORIA_ACESSO_EMPRESA
            .CONFIRMADO;

    return Object.freeze({
        versao:
            1,

        leituraConcluida:
            true,

        estadoAcesso,
        codigo,
        motivo,
        empresaId,

        confirmado,

        provaAcessoEmpresa:
            confirmado
                ? Object.freeze({
                    confirmado:
                        true,

                    empresaId,

                    fonte:
                        "RPC_CERTIDAO_MENSAL_USUARIO_PODE_ACESSAR_EMPRESA",
                })
                : null,

        erro:
            normalizarErro(
                erro
            ),
    });
}

export function criarCertidaoMensalUploadMassaAuditoriaAcessoEmpresaReader({
    clienteSupabase = null,
} = {}) {
    if (
        !clienteSupabase ||
        typeof clienteSupabase.rpc !==
            "function"
    ) {
        throw new Error(
            "Cliente Supabase inválido para reader de acesso à empresa."
        );
    }

    async function lerProvaAcessoEmpresaCertidaoMensal({
        empresaId = "",
    } = {}) {
        const empresa =
            normalizarEmpresaId(
                empresaId
            );

        if (!empresa) {
            return resposta({
                estadoAcesso:
                    ESTADOS_AUDITORIA_ACESSO_EMPRESA
                        .INDETERMINADO,

                codigo:
                    "AUDITORIA_ACESSO_EMPRESA_ID_INVALIDO",

                motivo:
                    "EMPRESA_ID_INVALIDO",
            });
        }

        let retorno;

        try {
            retorno =
                await clienteSupabase.rpc(
                    CERTIDAO_MENSAL_RPC_ACESSO_EMPRESA,
                    {
                        p_empresa_id:
                            empresa,
                    }
                );
        }
        catch (error) {
            return resposta({
                estadoAcesso:
                    ESTADOS_AUDITORIA_ACESSO_EMPRESA
                        .INDETERMINADO,

                codigo:
                    "AUDITORIA_ACESSO_EMPRESA_RPC_THROW",

                motivo:
                    "LEITURA_DE_AUTORIZACAO_FALHOU",

                empresaId:
                    empresa,

                erro:
                    error,
            });
        }

        if (
            !retorno ||
            typeof retorno !==
                "object"
        ) {
            return resposta({
                estadoAcesso:
                    ESTADOS_AUDITORIA_ACESSO_EMPRESA
                        .INDETERMINADO,

                codigo:
                    "AUDITORIA_ACESSO_EMPRESA_RESPOSTA_INVALIDA",

                motivo:
                    "RPC_NAO_RETORNOU_CONTRATO_VALIDO",

                empresaId:
                    empresa,
            });
        }

        if (retorno.error) {
            return resposta({
                estadoAcesso:
                    ESTADOS_AUDITORIA_ACESSO_EMPRESA
                        .INDETERMINADO,

                codigo:
                    "AUDITORIA_ACESSO_EMPRESA_RPC_FALHOU",

                motivo:
                    "SUPABASE_RECUSOU_LEITURA_DE_AUTORIZACAO",

                empresaId:
                    empresa,

                erro:
                    retorno.error,
            });
        }

        if (
            retorno.data ===
            true
        ) {
            return resposta({
                estadoAcesso:
                    ESTADOS_AUDITORIA_ACESSO_EMPRESA
                        .CONFIRMADO,

                codigo:
                    "AUDITORIA_ACESSO_EMPRESA_CONFIRMADO",

                motivo:
                    "SESSAO_ATUAL_PODE_ACESSAR_EMPRESA",

                empresaId:
                    empresa,
            });
        }

        if (
            retorno.data ===
            false
        ) {
            return resposta({
                estadoAcesso:
                    ESTADOS_AUDITORIA_ACESSO_EMPRESA
                        .NEGADO,

                codigo:
                    "AUDITORIA_ACESSO_EMPRESA_NEGADO",

                motivo:
                    "SESSAO_ATUAL_NAO_PODE_ACESSAR_EMPRESA",

                empresaId:
                    empresa,
            });
        }

        return resposta({
            estadoAcesso:
                ESTADOS_AUDITORIA_ACESSO_EMPRESA
                    .INDETERMINADO,

            codigo:
                "AUDITORIA_ACESSO_EMPRESA_BOOLEAN_INVALIDO",

            motivo:
                "RPC_NAO_RETORNOU_BOOLEAN",

            empresaId:
                empresa,
        });
    }

    return Object.freeze({
        lerProvaAcessoEmpresaCertidaoMensal,
    });
}