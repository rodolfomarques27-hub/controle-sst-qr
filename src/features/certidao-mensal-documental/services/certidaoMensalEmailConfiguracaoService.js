import { supabase } from "../../../lib/supabaseClient";

export const RPC_CONFIGURACAO_EMAIL_CERTIDAO_MENSAL =
    Object.freeze({
        LISTAR:
            "listar_configuracoes_email_certidao_mensal_tenant",

        SALVAR:
            "salvar_configuracao_email_certidao_mensal_tenant",

        EXCLUIR:
            "excluir_configuracao_email_certidao_mensal_tenant",
    });

const EDGE_PROVEDOR_EMAIL_TENANT =
    "admin-gerenciar-provedor-email-tenant";

const REGEX_UUID_TENANT =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const CONFIGURACAO_EMAIL_TENANT_SEGURA_PADRAO =
    Object.freeze({
        tenantId: null,
        modoEnvio: "DESATIVADO",
        provedor: null,
        remetenteEmail: null,
        credencialConfigurada: false,
        ultimoTesteStatus: "NAO_APLICAVEL",
        ultimoTesteCodigo: null,
        ultimoTesteEm: null,
        safescanGerenciadoDisponivel: false,
    });

export const LIMITES_CONFIGURACAO_EMAIL_CERTIDAO_MENSAL =
    Object.freeze({
        DESTINATARIOS: 10,
        COPIAS: 10,
        EMAIL: 254,
        NOME_REMETENTE: 120,
        ASSUNTO: 180,
        CORPO: 10000,
    });

export const CONFIGURACAO_EMAIL_CERTIDAO_MENSAL_PADRAO =
    Object.freeze({
        id: null,
        escopo: "GLOBAL",
        empresaId: null,
        ativo: false,
        destinatarios: [],
        copias: [],
        responderPara: "",
        nomeRemetente: "SafeScan Brasil",
        assuntoModelo:
            "Pendências documentais — {{empresa_nome}} — {{competencia}}",

        corpoModelo: [
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
        estrategiaExcedente: "DIVIDIR_EM_PARTES",
        limiteMensagemBytes: 18 * 1024 * 1024,
        versao: 1,
        atualizadoEm: null,
        atualizadoPor: null,
    });

function textoSeguro(valor) {
    return typeof valor === "string"
        ? valor.trim()
        : "";
}

function criarErroConfiguracaoEmail(
    erroOriginal,
    mensagem,
) {
    const erro = new Error(mensagem);

    erro.name =
        "CertidaoMensalEmailConfiguracaoError";

    erro.codigo =
        textoSeguro(erroOriginal?.code);

    erro.detalhes =
        textoSeguro(
            erroOriginal?.details ||
                erroOriginal?.message,
        );

    erro.cause =
        erroOriginal || null;

    return erro;
}

function tenantIdObrigatorio(valor) {
    const tenantId =
        textoSeguro(valor)
            .toLowerCase();

    if (
        !REGEX_UUID_TENANT.test(
            tenantId,
        )
    ) {
        throw criarErroConfiguracaoEmail(
            null,
            "Tenant inválido para a configuração de e-mail das Certidões Mensais.",
        );
    }

    return tenantId;
}

function normalizarConfiguracaoEmailTenantSegura(
    registro,
) {
    if (
        !registro ||
        typeof registro !== "object"
    ) {
        return {
            ...CONFIGURACAO_EMAIL_TENANT_SEGURA_PADRAO,
        };
    }

    return {
        tenantId:
            textoSeguro(
                registro.tenantId ||
                    registro.tenant_id,
            ) ||
            null,

        modoEnvio:
            (
                textoSeguro(
                    registro.modoEnvio ||
                        registro.modo_envio,
                ) ||
                "DESATIVADO"
            ).toUpperCase(),

        provedor:
            textoSeguro(
                registro.provedor,
            ) ||
            null,

        remetenteEmail:
            normalizarEmailCertidaoMensal(
                registro.remetenteEmail ||
                    registro.remetente_email,
            ) ||
            null,

        credencialConfigurada:
            registro.credencialConfigurada ===
                true ||
            registro.credencial_configurada ===
                true,

        ultimoTesteStatus:
            (
                textoSeguro(
                    registro.ultimoTesteStatus ||
                        registro.ultimo_teste_status,
                ) ||
                "NAO_APLICAVEL"
            ).toUpperCase(),

        ultimoTesteCodigo:
            textoSeguro(
                registro.ultimoTesteCodigo ||
                    registro.ultimo_teste_codigo,
            ) ||
            null,

        ultimoTesteEm:
            registro.ultimoTesteEm ||
            registro.ultimo_teste_em ||
            null,

        safescanGerenciadoDisponivel:
            registro.safescanGerenciadoDisponivel ===
                true ||
            registro.safescan_gerenciado_disponivel ===
                true,
    };
}

export function normalizarEmailCertidaoMensal(valor) {
    return textoSeguro(valor).toLowerCase();
}

export function emailCertidaoMensalValido(valor) {
    const email =
        normalizarEmailCertidaoMensal(valor);

    if (
        !email ||
        email.length >
            LIMITES_CONFIGURACAO_EMAIL_CERTIDAO_MENSAL.EMAIL
    ) {
        return false;
    }

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email,
    );
}

function converterListaEmails(valor) {
    if (Array.isArray(valor)) {
        return valor;
    }

    if (typeof valor === "string") {
        return valor.split(/[;,\n]/);
    }

    return [];
}

export function normalizarListaEmailsCertidaoMensal(
    valor,
    limite,
    rotulo,
) {
    const emails =
        converterListaEmails(valor)
            .map(normalizarEmailCertidaoMensal)
            .filter(Boolean);

    const emailsUnicos =
        [...new Set(emails)];

    if (emailsUnicos.length > limite) {
        throw criarErroConfiguracaoEmail(
            null,
            `${rotulo} permite no máximo ${limite} endereço(s).`,
        );
    }

    const emailInvalido =
        emailsUnicos.find(
            (email) =>
                !emailCertidaoMensalValido(email),
        );

    if (emailInvalido) {
        throw criarErroConfiguracaoEmail(
            null,
            `Endereço de e-mail inválido em ${rotulo}: ${emailInvalido}`,
        );
    }

    return emailsUnicos;
}

function normalizarRegistroConfiguracao(registro) {
    if (
        !registro ||
        typeof registro !== "object"
    ) {
        return {
            ...CONFIGURACAO_EMAIL_CERTIDAO_MENSAL_PADRAO,
        };
    }

    return {
        id:
            textoSeguro(registro.id) ||
            null,

        escopo:
            textoSeguro(registro.escopo) ||
            "GLOBAL",

        empresaId:
            textoSeguro(registro.empresa_id) ||
            null,

        ativo:
            registro.ativo === true,


        destinatarios:
            Array.isArray(registro.destinatarios)
                ? registro.destinatarios
                      .map(
                          normalizarEmailCertidaoMensal,
                      )
                      .filter(Boolean)
                : [],

        copias:
            Array.isArray(registro.copias)
                ? registro.copias
                      .map(
                          normalizarEmailCertidaoMensal,
                      )
                      .filter(Boolean)
                : [],

        responderPara:
            normalizarEmailCertidaoMensal(
                registro.responder_para,
            ),

        nomeRemetente:
            textoSeguro(
                registro.nome_remetente,
            ) ||
            CONFIGURACAO_EMAIL_CERTIDAO_MENSAL_PADRAO
                .nomeRemetente,

        assuntoModelo:
            textoSeguro(
                registro.assunto_modelo,
            ) ||
            CONFIGURACAO_EMAIL_CERTIDAO_MENSAL_PADRAO
                .assuntoModelo,

        corpoModelo:
            textoSeguro(
                registro.corpo_modelo,
            ) ||
            CONFIGURACAO_EMAIL_CERTIDAO_MENSAL_PADRAO
                .corpoModelo,



        estrategiaExcedente:
            textoSeguro(
                registro.estrategia_excedente,
            ) ||
            "DIVIDIR_EM_PARTES",

        limiteMensagemBytes:
            Number(
                registro.limite_mensagem_bytes,
            ) ||
            18 * 1024 * 1024,

        versao:
            Number(registro.versao) || 1,

        atualizadoEm:
            registro.atualizado_em || null,

        atualizadoPor:
            textoSeguro(
                registro.atualizado_por,
            ) ||
            null,
    };
}

function validarConfiguracaoParaSalvar(dados) {
    const empresaId =
        textoSeguro(dados?.empresaId) ||
        null;

    const ativo =
        dados?.ativo === true;


    const destinatarios =
        normalizarListaEmailsCertidaoMensal(
            dados?.destinatarios,
            LIMITES_CONFIGURACAO_EMAIL_CERTIDAO_MENSAL
                .DESTINATARIOS,
            "destinatários",
        );

    const copias =
        normalizarListaEmailsCertidaoMensal(
            dados?.copias,
            LIMITES_CONFIGURACAO_EMAIL_CERTIDAO_MENSAL
                .COPIAS,
            "cópias",
        );

    const destinatariosSet =
        new Set(destinatarios);

    const emailsRepetidosEntreParaECopia =
        copias.filter((email) =>
            destinatariosSet.has(email),
        );

    if (
        emailsRepetidosEntreParaECopia.length >
        0
    ) {
        throw criarErroConfiguracaoEmail(
            null,
            `Remova os endereços repetidos entre "Destinatários das Certidões Mensais" e "Cópia (CC)": ${emailsRepetidosEntreParaECopia.join(", ")}.`,
        );
    }

    const responderPara =
        normalizarEmailCertidaoMensal(
            dados?.responderPara,
        );

    if (
        responderPara &&
        !emailCertidaoMensalValido(
            responderPara,
        )
    ) {
        throw criarErroConfiguracaoEmail(
            null,
            "O endereço de resposta é inválido.",
        );
    }

    const nomeRemetente =
        textoSeguro(dados?.nomeRemetente);

    if (
        !nomeRemetente ||
        nomeRemetente.length >
            LIMITES_CONFIGURACAO_EMAIL_CERTIDAO_MENSAL
                .NOME_REMETENTE ||
        /[\r\n]/.test(nomeRemetente)
    ) {
        throw criarErroConfiguracaoEmail(
            null,
            "O nome do remetente é inválido.",
        );
    }

    const assuntoModelo =
        textoSeguro(dados?.assuntoModelo);

    if (
        !assuntoModelo ||
        assuntoModelo.length >
            LIMITES_CONFIGURACAO_EMAIL_CERTIDAO_MENSAL
                .ASSUNTO ||
        /[\r\n]/.test(assuntoModelo)
    ) {
        throw criarErroConfiguracaoEmail(
            null,
            "O assunto do e-mail é inválido.",
        );
    }

    const corpoModelo =
        textoSeguro(dados?.corpoModelo);

    if (
        !corpoModelo ||
        corpoModelo.length >
            LIMITES_CONFIGURACAO_EMAIL_CERTIDAO_MENSAL
                .CORPO
    ) {
        throw criarErroConfiguracaoEmail(
            null,
            "O corpo do e-mail é inválido.",
        );
    }

    if (
        !/\{\{\s*itens\s*\}\}/i.test(
            corpoModelo,
        )
    ) {
        throw criarErroConfiguracaoEmail(
            null,
            "O corpo do e-mail precisa conter a variável {{itens}}.",
        );
    }

    if (
        ativo &&
        destinatarios.length === 0
    ) {
        throw criarErroConfiguracaoEmail(
            null,
            "Informe ao menos um destinatário para ativar a configuração.",
        );
    }

    return {
        empresaId,
        ativo,
        destinatarios,
        copias,
        responderPara,
        nomeRemetente,
        assuntoModelo,
        corpoModelo,

    };
}

export async function listarConfiguracoesEmailCertidaoMensal(
    tenantId,
) {
    const tenantIdNormalizado =
        tenantIdObrigatorio(
            tenantId,
        );

    const { data, error } =
        await supabase.rpc(
            RPC_CONFIGURACAO_EMAIL_CERTIDAO_MENSAL
                .LISTAR,
            {
                p_tenant_id:
                    tenantIdNormalizado,
            },
        );

    if (error) {
        throw criarErroConfiguracaoEmail(
            error,
            "Não foi possível carregar as configurações de e-mail das Certidões Mensais.",
        );
    }

    return Array.isArray(data)
        ? data.map(
              normalizarRegistroConfiguracao,
          )
        : [];
}

export async function salvarConfiguracaoEmailCertidaoMensal(
    tenantId,
    dados,
) {
    const tenantIdNormalizado =
        tenantIdObrigatorio(
            tenantId,
        );

    const configuracao =
        validarConfiguracaoParaSalvar(
            dados,
        );

    const { data, error } =
        await supabase.rpc(
            RPC_CONFIGURACAO_EMAIL_CERTIDAO_MENSAL
                .SALVAR,
            {
                p_tenant_id:
                    tenantIdNormalizado,

                p_empresa_id:
                    configuracao.empresaId,

                p_ativo:
                    configuracao.ativo,

                p_usar_email_empresa:
                    false,

                p_destinatarios:
                    configuracao.destinatarios,

                p_copias:
                    configuracao.copias,

                p_responder_para:
                    configuracao.responderPara ||
                    null,

                p_nome_remetente:
                    configuracao.nomeRemetente,

                p_assunto_modelo:
                    configuracao.assuntoModelo,

                p_corpo_modelo:
                    configuracao.corpoModelo,

                p_anexar_pdfs:
                    false,
            },
        );

    if (error) {
        throw criarErroConfiguracaoEmail(
            error,
            "Não foi possível salvar a configuração de e-mail das Certidões Mensais.",
        );
    }

    return normalizarRegistroConfiguracao(
        Array.isArray(data)
            ? data[0]
            : data,
    );
}

export async function excluirConfiguracaoEmailCertidaoMensal(
    tenantId,
    empresaId,
) {
    const tenantIdNormalizado =
        tenantIdObrigatorio(
            tenantId,
        );

    const empresaIdNormalizado =
        textoSeguro(empresaId);

    if (!empresaIdNormalizado) {
        throw criarErroConfiguracaoEmail(
            null,
            "Informe a empresa cuja configuração específica será excluída.",
        );
    }

    const { data, error } =
        await supabase.rpc(
            RPC_CONFIGURACAO_EMAIL_CERTIDAO_MENSAL
                .EXCLUIR,
            {
                p_tenant_id:
                    tenantIdNormalizado,

                p_empresa_id:
                    empresaIdNormalizado,
            },
        );

    if (error) {
        throw criarErroConfiguracaoEmail(
            error,
            "Não foi possível excluir a configuração específica da empresa.",
        );
    }

    return data === true;
}

export async function obterConfiguracaoEmailTenantSegura(
    tenantId,
) {
    const tenantIdNormalizado =
        tenantIdObrigatorio(
            tenantId,
        );

    const {
        data,
        error,
    } =
        await supabase.functions.invoke(
            EDGE_PROVEDOR_EMAIL_TENANT,
            {
                body: {
                    acao:
                        "obter",

                    tenantId:
                        tenantIdNormalizado,
                },
            },
        );

    if (error) {
        throw criarErroConfiguracaoEmail(
            error,
            "Não foi possível consultar o status seguro do provedor de e-mail deste tenant.",
        );
    }

    if (
        data?.ok !==
        true
    ) {
        throw criarErroConfiguracaoEmail(
            {
                code:
                    textoSeguro(
                        data?.codigo,
                    ),

                message:
                    textoSeguro(
                        data?.erro,
                    ),
            },
            "Não foi possível consultar o status seguro do provedor de e-mail deste tenant.",
        );
    }

    return normalizarConfiguracaoEmailTenantSegura(
        data?.configuracao,
    );
}

export function resolverConfiguracaoEmailCertidaoMensal(
    configuracoes,
    empresaId,
) {
    const lista =
        Array.isArray(configuracoes)
            ? configuracoes
            : [];

    const empresaIdNormalizado =
        textoSeguro(empresaId);

    const configuracaoEmpresa =
        empresaIdNormalizado
            ? lista.find(
                  (configuracao) =>
                      configuracao.escopo ===
                          "EMPRESA" &&
                      configuracao.empresaId ===
                          empresaIdNormalizado,
              )
            : null;

    if (configuracaoEmpresa) {
        return configuracaoEmpresa;
    }

    return (
        lista.find(
            (configuracao) =>
                configuracao.escopo ===
                    "GLOBAL" &&
                !configuracao.empresaId,
        ) || {
            ...CONFIGURACAO_EMAIL_CERTIDAO_MENSAL_PADRAO,
        }
    );
}
