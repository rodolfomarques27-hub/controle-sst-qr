export const PERFIS_USUARIOS_PERMISSOES_PLANEJADOS = [
    {
        chave: "administrador",
        perfil: "Administrador",
        descricao: "Acesso amplo ao sistema, configurações, auditoria, limpeza de arquivos e gestão de permissões.",
    },
    {
        chave: "tecnico_sst",
        perfil: "Técnico SST",
        descricao: "Rotina operacional de empresas, colaboradores, treinamentos, documentos e QR Code.",
    },
    {
        chave: "auditor",
        perfil: "Auditor",
        descricao: "Foco em auditorias de campo, evidências, registros, relatórios e consulta de conformidade.",
    },
    {
        chave: "gestor",
        perfil: "Gestor",
        descricao: "Acompanhamento de indicadores, relatórios, pendências e status das empresas/colaboradores.",
    },
    {
        chave: "consulta",
        perfil: "Consulta",
        descricao: "Visualização controlada, sem permissão para editar, excluir, limpar arquivos ou alterar configurações.",
    },
    {
        chave: "bloqueado",
        perfil: "Bloqueado",
        descricao: "Usuário mantido no cadastro para rastreabilidade, mas sem acesso operacional ao sistema.",
    },
];

export const MODULOS_USUARIOS_PERMISSOES = [
    { chave: "dashboard_sst", modulo: "Dashboard SST" },
    { chave: "empresas", modulo: "Empresas" },
    { chave: "colaboradores", modulo: "Colaboradores" },
    { chave: "treinamentos", modulo: "Treinamentos" },
    { chave: "qr_code", modulo: "QR Code" },
    { chave: "dashboard_auditoria", modulo: "Dashboard Auditoria" },
    { chave: "nova_auditoria", modulo: "Nova Auditoria" },
    { chave: "auditoria_sistema", modulo: "Auditoria do Sistema" },
    { chave: "configuracoes", modulo: "Configurações" },
    { chave: "storage", modulo: "Storage" },
    { chave: "relatorios", modulo: "Relatórios" },
];

export const MODULOS_USUARIOS_PERMISSOES_PLANEJADOS = MODULOS_USUARIOS_PERMISSOES.map((item) => item.modulo);

export const ACOES_USUARIOS_PERMISSOES = [
    { chave: "visualizar", acao: "Visualizar" },
    { chave: "cadastrar", acao: "Cadastrar" },
    { chave: "editar", acao: "Editar" },
    { chave: "excluir", acao: "Excluir" },
    { chave: "upload", acao: "Upload" },
    { chave: "exportar", acao: "Exportar" },
    { chave: "limpar_arquivos", acao: "Limpar arquivos" },
    { chave: "gerenciar_permissoes", acao: "Gerenciar permissões" },
];

export const ACOES_USUARIOS_PERMISSOES_PLANEJADAS = ACOES_USUARIOS_PERMISSOES.map((item) => item.acao);

export const PERMISSOES_PADRAO_USUARIOS_POR_PERFIL = [
    {
        chave: "administrador",
        perfil: "Administrador",
        nivel: "Acesso total planejado",
        resumo: "Perfil para gestão completa do sistema, permissões, configurações, Auditoria do Sistema e limpeza de Storage.",
        modulosLiberados: MODULOS_USUARIOS_PERMISSOES_PLANEJADOS,
        acoesLiberadas: ACOES_USUARIOS_PERMISSOES_PLANEJADAS,
        acoesRestritas: [],
        observacao: "Deve ser usado apenas para responsáveis pela administração do sistema.",
    },
    {
        chave: "tecnico_sst",
        perfil: "Técnico SST",
        nivel: "Operação SST",
        resumo: "Perfil operacional para rotina de empresas, colaboradores, treinamentos, documentos, QR Code e auditorias de campo.",
        modulosLiberados: [
            "Dashboard SST",
            "Empresas",
            "Colaboradores",
            "Treinamentos",
            "QR Code",
            "Dashboard Auditoria",
            "Nova Auditoria",
            "Relatórios",
        ],
        acoesLiberadas: ["Visualizar", "Cadastrar", "Editar", "Upload", "Exportar"],
        acoesRestritas: ["Excluir", "Limpar arquivos", "Gerenciar permissões", "Configurações críticas", "Auditoria do Sistema"],
        observacao: "Exclusões e limpeza de arquivos devem ficar protegidas para evitar perda de dados.",
    },
    {
        chave: "auditor",
        perfil: "Auditor",
        nivel: "Auditoria operacional",
        resumo: "Perfil focado em auditorias, evidências, consulta de conformidade e relatórios, sem administração do sistema.",
        modulosLiberados: ["Dashboard Auditoria", "Nova Auditoria", "QR Code", "Relatórios"],
        acoesLiberadas: ["Visualizar", "Cadastrar", "Upload", "Exportar"],
        acoesRestritas: ["Editar cadastros base", "Excluir", "Limpar arquivos", "Gerenciar permissões", "Configurações"],
        observacao: "Pode registrar auditorias e evidências, mas não deve alterar cadastros estruturais.",
    },
    {
        chave: "gestor",
        perfil: "Gestor",
        nivel: "Acompanhamento",
        resumo: "Perfil para acompanhamento gerencial de indicadores, status, pendências e relatórios consolidados.",
        modulosLiberados: ["Dashboard SST", "Dashboard Auditoria", "Empresas", "Colaboradores", "Treinamentos", "QR Code", "Relatórios"],
        acoesLiberadas: ["Visualizar", "Exportar"],
        acoesRestritas: ["Cadastrar", "Editar", "Excluir", "Upload", "Limpar arquivos", "Gerenciar permissões", "Configurações"],
        observacao: "Indicado para consulta estratégica sem alteração de dados operacionais.",
    },
    {
        chave: "consulta",
        perfil: "Consulta",
        nivel: "Somente leitura",
        resumo: "Perfil para consulta controlada de informações sem permissão para modificar dados.",
        modulosLiberados: ["Dashboard SST", "Empresas", "Colaboradores", "Treinamentos", "QR Code", "Relatórios"],
        acoesLiberadas: ["Visualizar"],
        acoesRestritas: ["Cadastrar", "Editar", "Excluir", "Upload", "Exportar", "Limpar arquivos", "Gerenciar permissões", "Configurações"],
        observacao: "Uso recomendado para visualização simples e acompanhamento sem risco operacional.",
    },
    {
        chave: "bloqueado",
        perfil: "Bloqueado",
        nivel: "Sem acesso operacional",
        resumo: "Usuário mantido para rastreabilidade, mas sem acesso às rotinas do sistema.",
        modulosLiberados: [],
        acoesLiberadas: [],
        acoesRestritas: ACOES_USUARIOS_PERMISSOES_PLANEJADAS,
        observacao: "Deve impedir acesso operacional quando os bloqueios reais forem ativados.",
    },
];
