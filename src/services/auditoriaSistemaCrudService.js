import { auditoriaEventoHabilitado } from "./auditoriaSistemaConfigService";
import { normalizarRegistrosAuditoriasCampo } from "./appHelpersService";
import { obterOrigemAcesso } from "../utils/sstUtils";

export async function carregarAuditoriaSistemaService({ supabase, limite }) {
    const limiteSeguro = Math.max(1, Number(limite) || 300);

    const { data, error } = await supabase
        .from("auditoria_sistema")
        .select("id, created_at, usuario_email, acao, tabela, registro_id, descricao, dados")
        .order("created_at", { ascending: false })
        .limit(limiteSeguro + 1);

    if (error) {
        throw error;
    }

    const registrosBrutos = data || [];
    const registros = registrosBrutos.slice(0, limiteSeguro);

    return {
        registros,
        existeMais: registrosBrutos.length > limiteSeguro,
    };
}

export async function carregarMaisAuditoriaSistemaService({ supabase, offsetAtual = 0, limite }) {
    const limiteSeguro = Math.max(1, Number(limite) || 300);
    const offsetSeguro = Math.max(0, Number(offsetAtual) || 0);

    const { data, error } = await supabase
        .from("auditoria_sistema")
        .select("id, created_at, usuario_email, acao, tabela, registro_id, descricao, dados")
        .order("created_at", { ascending: false })
        .range(offsetSeguro, offsetSeguro + limiteSeguro);

    if (error) {
        throw error;
    }

    const registrosBrutos = data || [];
    const registros = registrosBrutos.slice(0, limiteSeguro);

    return {
        registros,
        existeMais: registrosBrutos.length > limiteSeguro,
    };
}

export async function carregarEmailsEnviadosService({ supabase, limite }) {
    const { data, error } = await supabase
        .from("emails_enviados")
        .select("id, empresa_id, colaborador_id, documento_id, destinatario, assunto, tipo_alerta, documento, status_envio, erro, data_envio, enviado_por")
        .order("data_envio", { ascending: false })
        .limit(limite);

    if (error) {
        throw error;
    }

    return data || [];
}

export async function carregarAuditoriasCampoService({ supabase, limite }) {
    const { data, error } = await supabase
        .from("auditorias_campo")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limite + 1);

    if (error) {
        throw error;
    }

    const registrosBrutos = data || [];
    const registrosVisiveis = registrosBrutos.slice(0, limite);

    return {
        auditorias: normalizarRegistrosAuditoriasCampo(registrosVisiveis),
        existeMais: registrosBrutos.length > limite,
    };
}

export async function carregarMaisAuditoriasCampoService({ supabase, offsetAtual = 0, limite }) {
    const { data, error } = await supabase
        .from("auditorias_campo")
        .select("*")
        .order("created_at", { ascending: false })
        .range(offsetAtual, offsetAtual + limite);

    if (error) {
        throw error;
    }

    const registrosBrutos = data || [];
    const registrosVisiveis = registrosBrutos.slice(0, limite);

    return {
        auditorias: normalizarRegistrosAuditoriasCampo(registrosVisiveis),
        existeMais: registrosBrutos.length > limite,
    };
}

export async function registrarEmailEnviadoService({
    supabase,
    usuario,
    empresaId = null,
    colaboradorId = null,
    documentoId = null,
    destinatario = "",
    assunto = "",
    tipoAlerta = "",
    documento = "",
    statusEnvio = "",
    erro = "",
} = {}) {
    const payload = {
        empresa_id: empresaId || null,
        colaborador_id: colaboradorId || null,
        documento_id: documentoId || null,
        destinatario: destinatario || null,
        assunto: assunto || null,
        tipo_alerta: tipoAlerta || null,
        documento: documento || null,
        status_envio: statusEnvio || "Registrado",
        erro: erro || null,
        data_envio: new Date().toISOString(),
        enviado_por: usuario?.email || null,
    };

    const { error } = await supabase.from("emails_enviados").insert(payload);

    if (error) {
        console.warn("Erro ao registrar histórico de e-mail:", error.message);
        return { ok: false, payload, error };
    }

    return { ok: true, payload, error: null };
}

export async function registrarAuditoriaSistemaService({
    supabase,
    usuario,
    acao,
    tabela,
    descricao,
    registroId = null,
    dados = {},
} = {}) {
    if (!usuario?.email) return false;

    const acaoNormalizada = String(acao || "").trim().toUpperCase();
    const deveRegistrarSempre = acaoNormalizada === "CONFIGURACAO_EVENTOS_AUDITORIA_ALTERADA";

    if (!deveRegistrarSempre && !auditoriaEventoHabilitado(acao)) return false;

    const { error } = await supabase.from("auditoria_sistema").insert({
        usuario_id: usuario.id || null,
        usuario_email: usuario.email,
        acao,
        tabela,
        registro_id: registroId ? String(registroId) : null,
        descricao,
        dados: {
            ...(dados || {}),
            origemAcesso: obterOrigemAcesso(),
        },
    });

    if (error) {
        console.warn("Erro ao registrar auditoria do sistema:", error.message);
        return false;
    }

    return true;
}
