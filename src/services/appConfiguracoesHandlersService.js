import { salvarLimitesCarregamentoSistema } from "../constants/sistemaLimitesConstants";

export function atualizarLimitesCarregamentoSistemaAppService({
    novosLimites,
    setLimitesCarregamentoSistema,
}) {
    const normalizados = salvarLimitesCarregamentoSistema(novosLimites);
    setLimitesCarregamentoSistema(normalizados);
    return normalizados;
}