import { normalizarAuditoriaCampo } from "./auditoriaCampoService";

export function registroAuditoriaCampoTemConteudo(item = {}) {
    return Boolean(
        item.numero_auditoria ||
        item.tipo_auditoria ||
        item.titulo ||
        item.area ||
        item.local ||
        item.maquina_equipamento ||
        item.situacao_encontrada
    );
}

export function normalizarRegistrosAuditoriasCampo(registros = []) {
    return (registros || [])
        .filter(registroAuditoriaCampoTemConteudo)
        .map((item) =>
            normalizarAuditoriaCampo({
                ...item,
                desvios: Array.isArray(item.desvios) ? item.desvios : [],
            })
        );
}
