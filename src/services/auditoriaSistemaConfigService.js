export const CHAVE_CONFIG_EVENTOS_AUDITORIA_SISTEMA = "auditoriaSistemaEventosVerificados";

export const EVENTOS_AUDITORIA_SISTEMA_PADRAO = [
    {
        chave: "ACESSO",
        label: "Acesso ao sistema",
        categoria: "Acesso",
        descricao: "Registra entrada no sistema e eventos gerais de acesso.",
    },
    {
        chave: "ACESSO_TELA",
        label: "Troca de tela",
        categoria: "Navegação",
        descricao: "Registra quando o usuário acessa as telas do sistema.",
    },
    {
        chave: "ACESSO_QR_INTERNO",
        label: "Consulta QR interna",
        categoria: "QR Code",
        descricao: "Registra abertura de QR Code de colaborador dentro do sistema.",
    },
    {
        chave: "ACESSO_AUDITORIA",
        label: "Acesso à Auditoria de sistema",
        categoria: "Permissão",
        descricao: "Registra liberação e acesso à área restrita da Auditoria de sistema.",
    },
    {
        chave: "BLOQUEIO_AUDITORIA",
        label: "Bloqueio da Auditoria de sistema",
        categoria: "Permissão",
        descricao: "Registra bloqueio manual da Auditoria de sistema.",
    },
    {
        chave: "ATUALIZAR_DASHBOARD_SST",
        label: "Atualização do Dashboard SST",
        categoria: "Dashboard",
        descricao: "Registra atualização manual das informações do Dashboard SST.",
    },
    {
        chave: "INSERT",
        label: "Inclusões no banco",
        categoria: "Banco de dados",
        descricao: "Registra novos cadastros e novos registros salvos.",
    },
    {
        chave: "UPDATE",
        label: "Alterações no banco",
        categoria: "Banco de dados",
        descricao: "Registra alterações em registros existentes.",
    },
    {
        chave: "DELETE",
        label: "Exclusões no banco",
        categoria: "Banco de dados",
        descricao: "Registra exclusões de registros do sistema.",
    },
    {
        chave: "DELETE_STORAGE",
        label: "Exclusão de arquivo no Storage",
        categoria: "Storage",
        descricao: "Registra remoção de arquivos armazenados sem vínculo ou por limpeza.",
    },
];

export function normalizarChaveAcaoAuditoria(acao) {
    return String(acao || "")
        .trim()
        .toUpperCase()
        .replace(/\s+/g, "_");
}

export function obterConfiguracaoEventosAuditoriaSistema() {
    const padrao = EVENTOS_AUDITORIA_SISTEMA_PADRAO.reduce((acc, evento) => {
        acc[evento.chave] = true;
        return acc;
    }, {});

    if (typeof window === "undefined") {
        return padrao;
    }

    try {
        const salvo = JSON.parse(window.localStorage.getItem(CHAVE_CONFIG_EVENTOS_AUDITORIA_SISTEMA) || "null");

        if (!salvo || typeof salvo !== "object") {
            return padrao;
        }

        return { ...padrao, ...salvo };
    } catch {
        return padrao;
    }
}

export function salvarConfiguracaoEventosAuditoriaSistema(configuracao) {
    if (typeof window === "undefined") {
        return;
    }

    window.localStorage.setItem(
        CHAVE_CONFIG_EVENTOS_AUDITORIA_SISTEMA,
        JSON.stringify(configuracao || {})
    );
}

export function auditoriaEventoHabilitado(acao, configuracao = null) {
    const chave = normalizarChaveAcaoAuditoria(acao);
    const config = configuracao || obterConfiguracaoEventosAuditoriaSistema();

    return config[chave] !== false;
}

export function montarEventosAuditoriaSistema(registros = [], configuracao = null) {
    const config = configuracao || obterConfiguracaoEventosAuditoriaSistema();
    const mapa = new Map();

    EVENTOS_AUDITORIA_SISTEMA_PADRAO.forEach((evento) => {
        mapa.set(evento.chave, {
            ...evento,
            total: 0,
            habilitado: config[evento.chave] !== false,
            origem: "padrao",
        });
    });

    registros.forEach((registro) => {
        const chave = normalizarChaveAcaoAuditoria(registro?.acao);
        if (!chave) return;

        const existente = mapa.get(chave);

        if (existente) {
            mapa.set(chave, {
                ...existente,
                total: existente.total + 1,
                habilitado: config[chave] !== false,
            });
            return;
        }

        mapa.set(chave, {
            chave,
            label: chave.replace(/_/g, " ").toLowerCase().replace(/(^|\s)\S/g, (letra) => letra.toUpperCase()),
            categoria: "Evento identificado",
            descricao: "Evento encontrado no histórico da Auditoria de sistema.",
            total: 1,
            habilitado: config[chave] !== false,
            origem: "historico",
        });
    });

    return Array.from(mapa.values()).sort((a, b) => {
        const categoria = String(a.categoria || "").localeCompare(String(b.categoria || ""), "pt-BR");
        if (categoria !== 0) return categoria;
        return String(a.label || a.chave).localeCompare(String(b.label || b.chave), "pt-BR");
    });
}
