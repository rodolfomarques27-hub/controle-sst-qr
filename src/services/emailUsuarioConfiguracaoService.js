const EDGE = "gerenciar-provedor-email-usuario";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ERROS = {
    PERMISSAO_NEGADA: "Você não tem permissão para esta operação.",
    TENANT_INVALIDO: "Tenant inválido. Atualize a página.",
    CONFIGURACAO_INVALIDA: "Revise os dados da configuração.",
    CONFLITO_VERSAO: "Configuração alterada em outra sessão. Atualize antes de continuar.",
    PROVEDOR_NAO_CONFIGURADO: "Configure uma credencial antes de testar.",
    ERRO_INTERNO: "Serviço de e-mail temporariamente indisponível.",
};

function validarTenant(tenantId) {
    const id = String(tenantId ?? "").trim().toLowerCase();
    if (!UUID.test(id)) throw new Error("Tenant inválido.");
    return id;
}

async function executar(client, tenantId, acao, dados = {}) {
    const id = validarTenant(tenantId);
    if (typeof client?.functions?.invoke !== "function") {
        throw new Error("Sessão autenticada indisponível.");
    }

    let resposta;
    try {
        resposta = await client.functions.invoke(EDGE, {
            body: { acao, tenantId: id, ...dados },
        });
    } catch {
        throw new Error("Falha de comunicação com o serviço SMTP.");
    }

    if (resposta?.error) {
        throw new Error("Falha de autenticação ou comunicação. Verifique sua sessão.");
    }

    const data = resposta?.data;
    if (data?.ok !== true) {
        throw new Error(ERROS[data?.codigo] || "Operação SMTP não concluída.");
    }

    if (data.tenantId !== id) {
        throw new Error("Tenant retornado não corresponde ao ambiente atual.");
    }

    const valor = data.configuracao;
    const configuracao = valor && typeof valor === "object" && !Array.isArray(valor)
        ? {
            ativo: valor.ativo === true,
            provedor: String(valor.provedor || ""),
            host: String(valor.host || ""),
            porta: Number(valor.porta) || null,
            modoSeguranca: String(valor.modoSeguranca || ""),
            usuarioSmtp: String(valor.usuarioSmtp || ""),
            remetenteEmail: String(valor.remetenteEmail || ""),
            remetenteNomePadrao: String(valor.remetenteNomePadrao || ""),
            responderParaPadrao: String(valor.responderParaPadrao || ""),
            credencialConfigurada: valor.credencialConfigurada === true,
            ultimoTesteStatus: String(valor.ultimoTesteStatus || "NAO_TESTADO"),
            ultimoTesteEm: valor.ultimoTesteEm || null,
            versao: Number(valor.versao) || null,
        }
        : null;

    return {
        configuracao,
        teste: data.teste
            ? {
                status: String(data.teste.status || ""),
                codigo: String(data.teste.codigo || ""),
            }
            : null,
    };
}

export async function obterEmailUsuario(client, tenantId) {
    return (await executar(client, tenantId, "obter")).configuracao;
}

export async function salvarEmailUsuario(client, tenantId, form, senha, versao) {
    return (await executar(client, tenantId, "salvar", {
        provedor: form.provedor,
        host: form.host,
        porta: Number(form.porta),
        modoSeguranca: form.modoSeguranca,
        usuarioSmtp: form.usuarioSmtp.trim(),
        remetenteEmail: form.remetenteEmail.trim(),
        remetenteNomePadrao: form.remetenteNomePadrao.trim(),
        responderParaPadrao: form.responderParaPadrao.trim(),
        credencialNova: senha || null,
        versaoEsperada: versao ?? null,
    })).configuracao;
}

export async function testarEmailUsuario(client, tenantId) {
    return executar(client, tenantId, "testar");
}

export async function desativarEmailUsuario(client, tenantId, versao) {
    if (!Number.isInteger(versao) || versao < 1) {
        throw new Error("Versão inválida. Atualize os dados.");
    }
    return (await executar(client, tenantId, "desativar", {
        versaoEsperada: versao,
    })).configuracao;
}
