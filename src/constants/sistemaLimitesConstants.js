export const CHAVE_STORAGE_LIMITES_CARREGAMENTO_SISTEMA = "sstLimitesCarregamentoSistema";

export const LIMITE_AUDITORIA_SISTEMA_INICIAL = 300;
export const LIMITE_EMAILS_ENVIADOS_INICIAL = 200;
export const LIMITE_AUDITORIAS_CAMPO_INICIAL = 500;
export const LIMITE_QRCODES_CAMPO_POR_CARGA = 50;

export const LIMITES_CARREGAMENTO_SISTEMA = {
    auditoriaSistema: LIMITE_AUDITORIA_SISTEMA_INICIAL,
    emailsEnviados: LIMITE_EMAILS_ENVIADOS_INICIAL,
    auditoriasCampo: LIMITE_AUDITORIAS_CAMPO_INICIAL,
    qrcodesCampo: LIMITE_QRCODES_CAMPO_POR_CARGA,
};

export const LIMITES_MINIMOS_CARREGAMENTO_SISTEMA = {
    auditoriaSistema: 50,
    emailsEnviados: 50,
    auditoriasCampo: 50,
    qrcodesCampo: 10,
};

export const LIMITES_MAXIMOS_CARREGAMENTO_SISTEMA = {
    auditoriaSistema: 2000,
    emailsEnviados: 1000,
    auditoriasCampo: 3000,
    qrcodesCampo: 500,
};

export const DESCRICOES_LIMITES_CARREGAMENTO_SISTEMA = [
    {
        chave: "auditoriaSistema",
        label: "Auditoria de sistema",
        valor: LIMITE_AUDITORIA_SISTEMA_INICIAL,
        detalhe: "registros iniciais",
        ajuda: "Quantidade carregada ao abrir a Auditoria de sistema.",
    },
    {
        chave: "emailsEnviados",
        label: "E-mails enviados",
        valor: LIMITE_EMAILS_ENVIADOS_INICIAL,
        detalhe: "registros iniciais",
        ajuda: "Quantidade carregada no histórico de e-mails da Auditoria de sistema.",
    },
    {
        chave: "auditoriasCampo",
        label: "Auditorias de campo",
        valor: LIMITE_AUDITORIAS_CAMPO_INICIAL,
        detalhe: "registros iniciais",
        ajuda: "Quantidade carregada no Dashboard Auditoria Campo.",
    },
    {
        chave: "qrcodesCampo",
        label: "QR Codes de campo",
        valor: LIMITE_QRCODES_CAMPO_POR_CARGA,
        detalhe: "registros por carga",
        ajuda: "Quantidade carregada por clique na lista de QR Codes de campo.",
    },
];

const limitarNumero = (valor, minimo, maximo, padrao) => {
    const numero = Number.parseInt(valor, 10);

    if (!Number.isFinite(numero)) {
        return padrao;
    }

    return Math.min(maximo, Math.max(minimo, numero));
};

export function normalizarLimitesCarregamentoSistema(limites = {}) {
    return {
        auditoriaSistema: limitarNumero(
            limites.auditoriaSistema,
            LIMITES_MINIMOS_CARREGAMENTO_SISTEMA.auditoriaSistema,
            LIMITES_MAXIMOS_CARREGAMENTO_SISTEMA.auditoriaSistema,
            LIMITES_CARREGAMENTO_SISTEMA.auditoriaSistema
        ),
        emailsEnviados: limitarNumero(
            limites.emailsEnviados,
            LIMITES_MINIMOS_CARREGAMENTO_SISTEMA.emailsEnviados,
            LIMITES_MAXIMOS_CARREGAMENTO_SISTEMA.emailsEnviados,
            LIMITES_CARREGAMENTO_SISTEMA.emailsEnviados
        ),
        auditoriasCampo: limitarNumero(
            limites.auditoriasCampo,
            LIMITES_MINIMOS_CARREGAMENTO_SISTEMA.auditoriasCampo,
            LIMITES_MAXIMOS_CARREGAMENTO_SISTEMA.auditoriasCampo,
            LIMITES_CARREGAMENTO_SISTEMA.auditoriasCampo
        ),
        qrcodesCampo: limitarNumero(
            limites.qrcodesCampo,
            LIMITES_MINIMOS_CARREGAMENTO_SISTEMA.qrcodesCampo,
            LIMITES_MAXIMOS_CARREGAMENTO_SISTEMA.qrcodesCampo,
            LIMITES_CARREGAMENTO_SISTEMA.qrcodesCampo
        ),
    };
}

export function carregarLimitesCarregamentoSistema() {
    if (typeof window === "undefined") {
        return LIMITES_CARREGAMENTO_SISTEMA;
    }

    try {
        const salvo = JSON.parse(window.localStorage.getItem(CHAVE_STORAGE_LIMITES_CARREGAMENTO_SISTEMA) || "null");
        return normalizarLimitesCarregamentoSistema(salvo || LIMITES_CARREGAMENTO_SISTEMA);
    } catch {
        return LIMITES_CARREGAMENTO_SISTEMA;
    }
}

export function salvarLimitesCarregamentoSistema(limites = {}) {
    const normalizados = normalizarLimitesCarregamentoSistema(limites);

    if (typeof window !== "undefined") {
        window.localStorage.setItem(CHAVE_STORAGE_LIMITES_CARREGAMENTO_SISTEMA, JSON.stringify(normalizados));
    }

    return normalizados;
}

export function restaurarLimitesCarregamentoSistemaPadrao() {
    return salvarLimitesCarregamentoSistema(LIMITES_CARREGAMENTO_SISTEMA);
}
