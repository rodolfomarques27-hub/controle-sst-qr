export const PERFIS_USUARIOS_PERMISSOES_PLANEJADOS = [
    {
        perfil: "Administrador",
        descricao: "Acesso amplo ao sistema, configurações, auditoria, limpeza de arquivos e gestão de permissões.",
    },
    {
        perfil: "Técnico SST",
        descricao: "Rotina operacional de empresas, colaboradores, treinamentos, documentos e QR Code.",
    },
    {
        perfil: "Auditor",
        descricao: "Foco em auditorias de campo, evidências, registros, relatórios e consulta de conformidade.",
    },
    {
        perfil: "Gestor",
        descricao: "Acompanhamento de indicadores, relatórios, pendências e status das empresas/colaboradores.",
    },
    {
        perfil: "Consulta",
        descricao: "Visualização controlada, sem permissão para editar, excluir, limpar arquivos ou alterar configurações.",
    },
    {
        perfil: "Bloqueado",
        descricao: "Usuário mantido no cadastro para rastreabilidade, mas sem acesso operacional ao sistema.",
    },
];

export const MODULOS_USUARIOS_PERMISSOES_PLANEJADOS = [
    "Dashboard SST",
    "Empresas",
    "Colaboradores",
    "Treinamentos",
    "QR Code",
    "Dashboard Auditoria",
    "Nova Auditoria",
    "Auditoria do Sistema",
    "Configurações",
    "Storage",
    "Relatórios",
];

export const ACOES_USUARIOS_PERMISSOES_PLANEJADAS = [
    "Visualizar",
    "Cadastrar",
    "Editar",
    "Excluir",
    "Upload",
    "Exportar",
    "Limpar arquivos",
    "Gerenciar permissões",
];
