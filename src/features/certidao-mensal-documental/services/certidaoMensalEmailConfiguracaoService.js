import { supabase } from "../../../lib/supabaseClient";

export const RPC_CONFIGURACAO_EMAIL_CERTIDAO_MENSAL =
    Object.freeze({
        LISTAR:
            "admin_listar_configuracoes_email_certidao_mensal",

        SALVAR:
            "admin_salvar_configuracao_email_certidao_mensal",

        EXCLUIR:
            "admin_excluir_configuracao_email_certidao_mensal",
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
            `Remova os endereços repetidos entre "Destinatários da Certidão Mensal" e "Cópia (CC)": ${emailsRepetidosEntreParaECopia.join(", ")}.`,
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

export async function listarConfiguracoesEmailCertidaoMensal() {
    const { data, error } =
        await supabase.rpc(
            RPC_CONFIGURACAO_EMAIL_CERTIDAO_MENSAL
                .LISTAR,
        );

    if (error) {
        throw criarErroConfiguracaoEmail(
            error,
            "Não foi possível carregar as configurações de e-mail da Certidão Mensal.",
        );
    }

    return Array.isArray(data)
        ? data.map(
              normalizarRegistroConfiguracao,
          )
        : [];
}

export async function salvarConfiguracaoEmailCertidaoMensal(
    dados,
) {
    const configuracao =
        validarConfiguracaoParaSalvar(
            dados,
        );

    const { data, error } =
        await supabase.rpc(
            RPC_CONFIGURACAO_EMAIL_CERTIDAO_MENSAL
                .SALVAR,
            {
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
            "Não foi possível salvar a configuração de e-mail da Certidão Mensal.",
        );
    }

    return normalizarRegistroConfiguracao(
        Array.isArray(data)
            ? data[0]
            : data,
    );
}

export async function excluirConfiguracaoEmailCertidaoMensal(
    empresaId,
) {
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
