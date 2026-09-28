import { supabase } from "../lib/supabaseClient";

export const CANAIS_EMAIL_SST_EMPRESA =
    Object.freeze({
        DOCUMENTOS:
            "DOCUMENTOS",

        TREINAMENTOS:
            "TREINAMENTOS",

        // R22_E3_D2B_AUDITORIA_CUTOVER
        AUDITORIA:
            "AUDITORIA",
    });

export const MODULO_POR_CANAL_EMAIL_SST_EMPRESA =
    Object.freeze({
        [CANAIS_EMAIL_SST_EMPRESA.DOCUMENTOS]:
            "gestao_documental_sst",

        [CANAIS_EMAIL_SST_EMPRESA.TREINAMENTOS]:
            "treinamentos",

        [CANAIS_EMAIL_SST_EMPRESA.AUDITORIA]:
            "auditoria_campo",
    });

export const RPC_EMAIL_SST_CANAL_EMPRESA =
    Object.freeze({
        LISTAR:
            "listar_configuracoes_email_sst_empresa_tenant",

        SALVAR:
            "salvar_configuracao_email_sst_empresa_tenant",
    });

function textoSeguro(valor) {
    return typeof valor === "string"
        ? valor.trim()
        : "";
}

function criarErroEmailSstCanalEmpresa(
    erroOriginal,
    mensagem,
) {
    const erro =
        new Error(mensagem);

    erro.name =
        "EmailSstCanalEmpresaError";

    erro.codigo =
        textoSeguro(
            erroOriginal?.code,
        );

    erro.detalhes =
        textoSeguro(
            erroOriginal?.details ||
                erroOriginal?.message,
        );

    erro.cause =
        erroOriginal || null;

    return erro;
}

export function normalizarCanalEmailSstEmpresa(
    canal,
) {
    const normalizado =
        textoSeguro(canal)
            .toUpperCase();

    return Object.prototype.hasOwnProperty.call(
        MODULO_POR_CANAL_EMAIL_SST_EMPRESA,
        normalizado,
    )
        ? normalizado
        : "";
}

export function obterModuloPorCanalEmailSstEmpresa(
    canal,
) {
    const canalNormalizado =
        normalizarCanalEmailSstEmpresa(
            canal,
        );

    return canalNormalizado
        ? MODULO_POR_CANAL_EMAIL_SST_EMPRESA[
              canalNormalizado
          ]
        : "";
}

export function normalizarEmailSstCanalEmpresa(
    valor,
) {
    return textoSeguro(valor)
        .toLowerCase();
}

export function emailSstCanalEmpresaValido(
    valor,
) {
    const email =
        normalizarEmailSstCanalEmpresa(
            valor,
        );

    return Boolean(
        email &&
            email.length <= 254 &&
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                email,
            ),
    );
}

function normalizarRegistro(
    registro,
) {
    if (
        !registro ||
        typeof registro !== "object"
    ) {
        return null;
    }

    const canal =
        normalizarCanalEmailSstEmpresa(
            registro.canal,
        );

    if (!canal) {
        return null;
    }

    return {
        id:
            textoSeguro(
                registro.id,
            ) || null,

        tenantId:
            textoSeguro(
                registro.tenant_id,
            ) || null,

        empresaId:
            textoSeguro(
                registro.empresa_id,
            ) || null,

        canal,

        moduloChave:
            obterModuloPorCanalEmailSstEmpresa(
                canal,
            ),

        ativo:
            registro.ativo === true,

        responsavel:
            textoSeguro(
                registro.responsavel,
            ),

        email:
            normalizarEmailSstCanalEmpresa(
                registro.email,
            ),

        versao:
            Number(
                registro.versao,
            ) || 1,

        criadoPor:
            textoSeguro(
                registro.criado_por,
            ) || null,

        atualizadoPor:
            textoSeguro(
                registro.atualizado_por,
            ) || null,

        criadoEm:
            registro.criado_em ||
            null,

        atualizadoEm:
            registro.atualizado_em ||
            null,
    };
}

function validarContexto({
    tenantId,
    empresaId = "",
    canal = "",
    exigirEmpresa = false,
    exigirCanal = false,
}) {
    const tenantIdNormalizado =
        textoSeguro(
            tenantId,
        );

    if (!tenantIdNormalizado) {
        throw criarErroEmailSstCanalEmpresa(
            null,
            "Tenant não informado para configuração de e-mail SST.",
        );
    }

    const empresaIdNormalizado =
        textoSeguro(
            empresaId,
        );

    if (
        exigirEmpresa &&
        !empresaIdNormalizado
    ) {
        throw criarErroEmailSstCanalEmpresa(
            null,
            "Empresa não informada para configuração de e-mail SST.",
        );
    }

    const canalNormalizado =
        normalizarCanalEmailSstEmpresa(
            canal,
        );

    if (
        exigirCanal &&
        !canalNormalizado
    ) {
        throw criarErroEmailSstCanalEmpresa(
            null,
            "Canal de e-mail SST inválido.",
        );
    }

    return {
        tenantId:
            tenantIdNormalizado,

        empresaId:
            empresaIdNormalizado,

        canal:
            canalNormalizado,
    };
}

export async function listarConfiguracoesEmailSstEmpresaTenant({
    tenantId,
    supabaseClient = supabase,
}) {
    const contexto =
        validarContexto({
            tenantId,
        });

    if (!supabaseClient) {
        throw criarErroEmailSstCanalEmpresa(
            null,
            "Cliente Supabase não disponível.",
        );
    }

    const {
        data,
        error,
    } =
        await supabaseClient.rpc(
            RPC_EMAIL_SST_CANAL_EMPRESA
                .LISTAR,
            {
                p_tenant_id:
                    contexto.tenantId,
            },
        );

    if (error) {
        throw criarErroEmailSstCanalEmpresa(
            error,
            "Não foi possível carregar as configurações independentes de e-mail SST.",
        );
    }

    return (
        Array.isArray(data)
            ? data
            : []
    )
        .map(
            normalizarRegistro,
        )
        .filter(Boolean);
}

export async function salvarConfiguracaoEmailSstEmpresaTenant({
    tenantId,
    empresaId,
    canal,
    ativo = false,
    responsavel = "",
    email = "",
    supabaseClient = supabase,
}) {
    const contexto =
        validarContexto({
            tenantId,
            empresaId,
            canal,
            exigirEmpresa:
                true,
            exigirCanal:
                true,
        });

    if (!supabaseClient) {
        throw criarErroEmailSstCanalEmpresa(
            null,
            "Cliente Supabase não disponível.",
        );
    }

    const emailNormalizado =
        normalizarEmailSstCanalEmpresa(
            email,
        );

    if (
        emailNormalizado &&
        !emailSstCanalEmpresaValido(
            emailNormalizado,
        )
    ) {
        throw criarErroEmailSstCanalEmpresa(
            null,
            "Informe um e-mail válido para o canal SST.",
        );
    }

    if (
        ativo === true &&
        !emailNormalizado
    ) {
        throw criarErroEmailSstCanalEmpresa(
            null,
            "Uma configuração ativa precisa possuir e-mail destinatário.",
        );
    }

    const {
        data,
        error,
    } =
        await supabaseClient.rpc(
            RPC_EMAIL_SST_CANAL_EMPRESA
                .SALVAR,
            {
                p_tenant_id:
                    contexto.tenantId,

                p_empresa_id:
                    contexto.empresaId,

                p_canal:
                    contexto.canal,

                p_ativo:
                    ativo === true,

                p_responsavel:
                    textoSeguro(
                        responsavel,
                    ) || null,

                p_email:
                    emailNormalizado ||
                    null,
            },
        );

    if (error) {
        throw criarErroEmailSstCanalEmpresa(
            error,
            "Não foi possível salvar a configuração independente de e-mail SST.",
        );
    }

    return normalizarRegistro(
        Array.isArray(data)
            ? data[0]
            : data,
    );
}

// R22_E3_C5D_AUDITORIA_ULTIMA_ATUALIZACAO
export async function obterUltimaAtualizacaoAuditoriaEmpresaTenant({
    tenantId,
    empresaId,
    supabaseClient = null,
} = {}) {
    const tenantIdSeguro =
        String(
            tenantId
            ??
            ""
        ).trim();

    const empresaIdSeguro =
        String(
            empresaId
            ??
            ""
        ).trim();

    if (
        !tenantIdSeguro
        ||
        !empresaIdSeguro
    ) {
        throw new Error(
            "Tenant e empresa são obrigatórios para consultar a última atualização da Auditoria."
        );
    }

    if (
        !supabaseClient
        ||
        typeof supabaseClient.rpc !==
            "function"
    ) {
        throw new Error(
            "Cliente Supabase indisponível para consultar a última atualização da Auditoria."
        );
    }

    const {
        data,
        error,
    } =
        await supabaseClient.rpc(
            "obter_ultima_atualizacao_auditoria_empresa_tenant",
            {
                p_tenant_id:
                    tenantIdSeguro,

                p_empresa_id:
                    empresaIdSeguro,
            }
        );

    if (error) {
        throw new Error(
            error.message
            ||
            "Não foi possível consultar a última atualização da Auditoria."
        );
    }

    return (
        data
        ||
        null
    );
}
