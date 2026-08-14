export const ORDEM_TELAS_INICIAIS_PERMITIDAS_APP = Object.freeze([
    "dashboard",
    "auditoriaCampo",
    "novaAuditoriaCampo",
    "qr",
    "empresas",
    "colaboradores",
    "treinamentos",
    "certidaoMensalDocumental",
    "dds",
    "aniversariantes",
    "auditoria",
    "acessosApp",
    "configuracoes",
    "roteiro",
]);

export const ORDEM_REDIRECIONAMENTO_TELAS_PERMITIDAS = Object.freeze([
    "dashboard",
    "vistoriaExtintores",
    "mapaObra",
    "mapaObraVisualizacao",
    "extintores",
    "auditoriaCampo",
    "novaAuditoriaCampo",
    "qr",
    "empresas",
    "colaboradores",
    "treinamentos",
    "certidaoMensalDocumental",
    "dds",
    "aniversariantes",
    "auditoria",
    "acessosApp",
    "configuracoes",
    "roteiro",
]);

export const ROTULOS_TELAS_ACESSO_BLOQUEADO = Object.freeze({
    dashboard: "Dashboard SST",
    vistoriaExtintores: "Vistoria de extintores",
    mapaObra: "Mapa da Obra",
    mapaObraVisualizacao: "Mapa da Obra - Consulta",
    extintores: "Extintores",
    novaAuditoriaCampo: "Nova Auditoria",
    auditoriaCampo: "Dashboard Auditoria",
    empresas: "Empresas",
    colaboradores: "Colaboradores",
    aniversariantes: "Aniversariantes",
    treinamentos: "Treinamentos",
    certidaoMensalDocumental: "Certidões Mensais",
    dds: "DDS",
    qr: "QR Code",
    auditoria: "Auditoria do Sistema",
    acessosApp: "Acessos do App",
    configuracoes: "Configurações",
    roteiro: "Manuais",
});

const CARREGADORES_MODULOS_TELAS = Object.freeze({
    dashboard: () => import("../components/dashboard/Dashboard"),
    extintores: () => import("../components/extintores/ExtintoresPage"),
    vistoriaExtintores: () =>
        import("../components/extintores/VistoriaExtintoresPage"),
    mapaObra: () => import("../components/mapa/MapaObraPage"),
    mapaObraVisualizacao: () =>
        import("../components/mapa/MapaObraVisualizacaoPage"),
    auditoriaCampo: () =>
        import("../components/auditoria/DashboardAuditoriaCampo"),
    novaAuditoriaCampo: () =>
        import("../components/auditoria/NovaAuditoriaCampoDireta"),
    empresas: () => import("../components/empresas/EmpresasPage"),
    colaboradores: () =>
        import("../components/colaboradores/ColaboradoresPage"),
    aniversariantes: () =>
        import("../components/aniversariantes/AniversariantesPage"),
    treinamentos: () =>
        import("../components/treinamentos/TreinamentosPage"),
    certidaoMensalDocumental: () =>
        import("../features/certidao-mensal-documental/pages/CertidaoMensalDocumentalPage"),
    dds: () => import("../components/dds/DdsPage"),
    qr: () => import("../components/qr/ConsultaQR"),
    auditoria: () =>
        import("../components/auditoria/RelatorioAuditoria"),
    acessosApp: () =>
        import("../components/acessos/AcessosAppPage"),
    configuracoes: () =>
        import("../components/configuracoes/ConfiguracoesSistema"),
    roteiro: () => import("../components/Requisitos"),
});

export function precarregarModuloTelaSistema(tela = "") {
    const carregador = CARREGADORES_MODULOS_TELAS[tela];

    return carregador ? carregador() : Promise.resolve();
}
