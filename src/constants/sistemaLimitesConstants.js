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

export const DESCRICOES_LIMITES_CARREGAMENTO_SISTEMA = [
    {
        chave: "auditoriaSistema",
        label: "Auditoria de sistema",
        valor: LIMITE_AUDITORIA_SISTEMA_INICIAL,
        detalhe: "registros iniciais",
    },
    {
        chave: "emailsEnviados",
        label: "E-mails enviados",
        valor: LIMITE_EMAILS_ENVIADOS_INICIAL,
        detalhe: "registros iniciais",
    },
    {
        chave: "auditoriasCampo",
        label: "Auditorias de campo",
        valor: LIMITE_AUDITORIAS_CAMPO_INICIAL,
        detalhe: "registros iniciais",
    },
    {
        chave: "qrcodesCampo",
        label: "QR Codes de campo",
        valor: LIMITE_QRCODES_CAMPO_POR_CARGA,
        detalhe: "registros por carga",
    },
];
