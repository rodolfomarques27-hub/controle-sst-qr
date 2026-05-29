export const ITENS_REVISAO_SUPABASE_SISTEMA = [
    {
        chave: "tabelas-principais",
        grupo: "Tabelas",
        nivel: "info",
        label: "Tabelas principais do sistema",
        descricao: "Conferir colaboradores, empresas, documentos_empresas, auditoria_sistema, auditorias_campo, emails_enviados e auditoria_sistema_configuracoes.",
        recomendacao: "Validar se as colunas usadas pelo App existem no Supabase e se não há tabelas duplicadas ou obsoletas.",
    },
    {
        chave: "rls-habilitado",
        grupo: "RLS",
        nivel: "alerta",
        label: "RLS habilitado nas tabelas sensíveis",
        descricao: "Tabelas com dados de colaboradores, documentos, auditorias e configurações precisam de Row Level Security conferido.",
        recomendacao: "No Supabase, revisar se o RLS está ativo e se as policies permitem somente o acesso esperado para usuários autenticados e fluxos públicos controlados.",
    },
    {
        chave: "rpc-auditoria-publica",
        grupo: "RPC",
        nivel: "alerta",
        label: "RPC da Auditoria pública",
        descricao: "A validação real do acesso público deve continuar centralizada na função validar_acesso_auditoria_publica.",
        recomendacao: "Conferir token, senha, retorno da função e se a RPC não expõe dados além do necessário para abrir a auditoria pública.",
    },
    {
        chave: "rpc-salvar-auditoria",
        grupo: "RPC",
        nivel: "alerta",
        label: "RPC de salvamento da Auditoria pública",
        descricao: "A função salvar_auditoria_campo_publica deve aceitar somente payload validado e token ativo.",
        recomendacao: "Testar envio público sem login, com token inválido e com token válido para confirmar comportamento esperado.",
    },
    {
        chave: "buckets-privados",
        grupo: "Storage",
        nivel: "alerta",
        label: "Buckets privados e URLs assinadas",
        descricao: "certificados-treinamentos, documentos-empresas, contratos-empresas, fotos-colaboradores e auditorias-campo devem permanecer privados.",
        recomendacao: "Evitar getPublicUrl em arquivos sensíveis. Usar createSignedUrl quando o arquivo precisar ser aberto temporariamente.",
    },
    {
        chave: "indices-performance",
        grupo: "Performance",
        nivel: "info",
        label: "Índices para consultas frequentes",
        descricao: "Históricos, dashboards e auditorias usam ordenação por created_at e filtros por empresa, status, tipo e usuário.",
        recomendacao: "Avaliar índices em created_at, empresa_id, colaborador_id, status e tipo conforme as consultas mais usadas no sistema.",
    },
    {
        chave: "edge-email",
        grupo: "Edge Function",
        nivel: "info",
        label: "Edge Function de e-mail",
        descricao: "A função de alerta ao TST deve continuar registrando sucesso/falha em emails_enviados.",
        recomendacao: "Conferir variáveis de ambiente da função, logs de execução e destinatários usados por empresa.",
    },
    {
        chave: "configuracoes-sistema",
        grupo: "Configurações",
        nivel: "ok",
        label: "Configurações operacionais centralizadas",
        descricao: "Eventos da Auditoria de sistema, limites de carregamento e parâmetros de Auditoria pública passaram a ficar organizados na tela Configurações.",
        recomendacao: "Manter alterações críticas documentadas e testar após qualquer mudança de limite, token ou evento auditado.",
    },
];

const CLASSES_RESUMO_SUPABASE = {
    ok: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    atencao: "bg-orange-50 text-orange-700 ring-orange-200",
    critico: "bg-red-50 text-red-700 ring-red-200",
    info: "bg-blue-50 text-blue-700 ring-blue-200",
};

export function avaliarRevisaoSupabaseSistema() {
    return ITENS_REVISAO_SUPABASE_SISTEMA;
}

export function calcularResumoRevisaoSupabaseSistema(itens = ITENS_REVISAO_SUPABASE_SISTEMA) {
    const criticos = itens.filter((item) => item.nivel === "critico").length;
    const alertas = itens.filter((item) => item.nivel === "alerta").length;

    if (criticos > 0) {
        return {
            texto: "Crítico",
            detalhe: `${criticos} ponto(s) crítico(s) para revisar`,
            classe: CLASSES_RESUMO_SUPABASE.critico,
        };
    }

    if (alertas > 0) {
        return {
            texto: "Atenção",
            detalhe: `${alertas} ponto(s) exigem conferência no Supabase`,
            classe: CLASSES_RESUMO_SUPABASE.atencao,
        };
    }

    return {
        texto: "Organizado",
        detalhe: "Checklist técnico sem alertas críticos",
        classe: CLASSES_RESUMO_SUPABASE.ok,
    };
}

export function montarChecklistRevisaoSupabaseSistemaTexto(itens = ITENS_REVISAO_SUPABASE_SISTEMA) {
    const linhas = [
        "CHECKLIST - REVISÃO SUPABASE / RLS / RPC / BUCKETS",
        "",
        ...itens.flatMap((item, index) => [
            `${index + 1}. [${String(item.nivel || "info").toUpperCase()}] ${item.label}`,
            `Grupo: ${item.grupo}`,
            `Verificar: ${item.descricao}`,
            `Recomendação: ${item.recomendacao}`,
            "",
        ]),
    ];

    return linhas.join("\n");
}
