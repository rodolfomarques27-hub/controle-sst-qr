export const GRUPOS_COMERCIAIS_SAFESCAN =
    Object.freeze({
        PLANO_BASE:
            "plano_base",

        ADICIONAL:
            "adicional",
    });

export const MATRIZ_COMERCIAL_MODULOS_SAFESCAN =
    Object.freeze({
        nucleo_safescan:
            Object.freeze({
                chave:
                    "nucleo_safescan",

                nome:
                    "Núcleo SafeScan",

                grupo:
                    GRUPOS_COMERCIAIS_SAFESCAN
                        .PLANO_BASE,

                obrigatorioPlanoBase:
                    true,

                gerenciavelContrato:
                    false,

                telas:
                    Object.freeze([
                        "dashboard",
                        "empresas",
                        "colaboradores",
                        "aniversariantes",
                    ]),

                capacidades:
                    Object.freeze([
                        "dashboard.base",
                        "empresas.cadastro_basico",
                        "obras.cadastro_basico",
                        "colaboradores.cadastro_basico",
                        "aniversariantes.gestao",
                        "armazenamento",
                        "acessos_app",
                        "configuracoes_basicas",
                        "manuais",
                    ]),
            }),

        treinamentos:
            Object.freeze({
                chave:
                    "treinamentos",

                nome:
                    "Gestão de Treinamentos",

                grupo:
                    GRUPOS_COMERCIAIS_SAFESCAN
                        .PLANO_BASE,

                obrigatorioPlanoBase:
                    true,

                gerenciavelContrato:
                    false,

                telas:
                    Object.freeze([
                        "treinamentos",
                    ]),

                capacidades:
                    Object.freeze([
                        "treinamentos.gestao",
                        "treinamentos.certificados",
                        "treinamentos.validade",
                        "treinamentos.pendencias",
                        "colaboradores.treinamentos",
                        "colaboradores.certificados",
                    ]),
            }),

        gestao_documental_sst:
            Object.freeze({
                chave:
                    "gestao_documental_sst",

                nome:
                    "Gestão Documental SST",

                grupo:
                    GRUPOS_COMERCIAIS_SAFESCAN
                        .PLANO_BASE,

                obrigatorioPlanoBase:
                    true,

                gerenciavelContrato:
                    false,

                telas:
                    Object.freeze([]),

                capacidades:
                    Object.freeze([
                        "empresas.documentos",
                        "colaboradores.documentos",
                        "documentos.upload",
                        "documentos.ocr",
                        "documentos.analise",
                        "documentos.validade",
                        "documentos.pendencias",
                        "documentos.historico",
                        "documentos.alertas",
                        "documentos.bloqueios",
                    ]),
            }),

        dds:
            Object.freeze({
                chave:
                    "dds",

                nome:
                    "DDS",

                grupo:
                    GRUPOS_COMERCIAIS_SAFESCAN
                        .ADICIONAL,

                obrigatorioPlanoBase:
                    false,

                gerenciavelContrato:
                    true,

                telas:
                    Object.freeze([
                        "dds",
                    ]),

                capacidades:
                    Object.freeze([
                        "dds.gestao",
                        "dds.participacoes",
                        "dds.horas",
                        "dds.publico",
                    ]),
            }),

        certidao_mensal_documental:
            Object.freeze({
                chave:
                    "certidao_mensal_documental",

                nome:
                    "Certidão Mensal Documental",

                grupo:
                    GRUPOS_COMERCIAIS_SAFESCAN
                        .ADICIONAL,

                obrigatorioPlanoBase:
                    false,

                gerenciavelContrato:
                    true,

                telas:
                    Object.freeze([
                        "certidaoMensalDocumental",
                    ]),

                capacidades:
                    Object.freeze([
                        "certidao_mensal.gestao",
                        "certidao_mensal.competencias",
                        "certidao_mensal.email",
                    ]),
            }),

        consolidacao_documental:
            Object.freeze({
                chave:
                    "consolidacao_documental",

                nome:
                    "Consolidação Documental",

                grupo:
                    GRUPOS_COMERCIAIS_SAFESCAN
                        .ADICIONAL,

                obrigatorioPlanoBase:
                    false,

                gerenciavelContrato:
                    true,

                telas:
                    Object.freeze([
                        "consolidacaoColaborador",
                    ]),

                capacidades:
                    Object.freeze([
                        "consolidacao_documental.gestao",
                        "consolidacao_documental.exportacao",
                    ]),
            }),

        auditoria_campo:
            Object.freeze({
                chave:
                    "auditoria_campo",

                nome:
                    "Auditoria de Campo",

                grupo:
                    GRUPOS_COMERCIAIS_SAFESCAN
                        .ADICIONAL,

                obrigatorioPlanoBase:
                    false,

                gerenciavelContrato:
                    true,

                telas:
                    Object.freeze([
                        "auditoriaCampo",
                        "novaAuditoriaCampo",
                    ]),

                capacidades:
                    Object.freeze([
                        "auditoria_campo.gestao",
                        "auditoria_campo.desvios",
                        "auditoria_campo.evidencias",
                        "auditoria_campo.publico",
                    ]),
            }),

        extintores:
            Object.freeze({
                chave:
                    "extintores",

                nome:
                    "Gestão de Extintores",

                grupo:
                    GRUPOS_COMERCIAIS_SAFESCAN
                        .ADICIONAL,

                obrigatorioPlanoBase:
                    false,

                gerenciavelContrato:
                    true,

                telas:
                    Object.freeze([
                        "extintores",
                        "vistoriaExtintores",
                    ]),

                capacidades:
                    Object.freeze([
                        "extintores.gestao",
                        "extintores.inspecoes",
                        "extintores.manutencoes",
                        "extintores.qr_operacional",
                        "extintores.publico",
                    ]),
            }),

        mapa_obra:
            Object.freeze({
                chave:
                    "mapa_obra",

                nome:
                    "Mapa da Obra",

                grupo:
                    GRUPOS_COMERCIAIS_SAFESCAN
                        .ADICIONAL,

                obrigatorioPlanoBase:
                    false,

                gerenciavelContrato:
                    true,

                telas:
                    Object.freeze([
                        "mapaObra",
                        "mapaObraVisualizacao",
                    ]),

                capacidades:
                    Object.freeze([
                        "mapa_obra.gestao",
                        "mapa_obra.pontos",
                        "mapa_obra.visualizacao",
                        "mapa_obra.publico",
                    ]),
            }),

        qr_code:
            Object.freeze({
                chave:
                    "qr_code",

                nome:
                    "QR Code",

                grupo:
                    GRUPOS_COMERCIAIS_SAFESCAN
                        .ADICIONAL,

                obrigatorioPlanoBase:
                    false,

                gerenciavelContrato:
                    true,

                telas:
                    Object.freeze([
                        "qr",
                    ]),

                capacidades:
                    Object.freeze([
                        "qr_code.colaboradores",
                        "qr_code.consulta_publica",
                        "qr_code.emergencia",
                    ]),
            }),

        relatorios:
            Object.freeze({
                chave:
                    "relatorios",

                nome:
                    "Relatórios",

                grupo:
                    GRUPOS_COMERCIAIS_SAFESCAN
                        .ADICIONAL,

                obrigatorioPlanoBase:
                    false,

                gerenciavelContrato:
                    true,

                telas:
                    Object.freeze([]),

                capacidades:
                    Object.freeze([
                        "relatorios.dashboard",
                        "relatorios.gerenciais",
                        "relatorios.exportacoes_avancadas",
                    ]),
            }),
    });

export const APRESENTACAO_PLANO_BASE_SAFESCAN =
    Object.freeze({
        nome:
            "Plano Base SafeScan",

        descricao:
            "Gestão completa de pessoas, treinamentos e documentação SST, com controle de validade, pendências e análise documental.",

        modulosTecnicos:
            Object.freeze([
                "nucleo_safescan",
                "treinamentos",
                "gestao_documental_sst",
            ]),

        secoes:
            Object.freeze([
                Object.freeze({
                    titulo:
                        "Gestão operacional",

                    itens:
                        Object.freeze([
                            "Dashboard SST",
                            "Empresas — cadastro básico",
                            "Cadastro de Obras",
                            "Colaboradores — cadastro, função e vínculo",
                            "Aniversariantes",
                            "Armazenamento e configurações básicas — conforme perfil",
                        ]),
                }),

                Object.freeze({
                    titulo:
                        "Gestão de Treinamentos",

                    itens:
                        Object.freeze([
                            "Cadastro e gestão de treinamentos",
                            "Matriz de treinamentos por função",
                            "Certificados",
                            "Validades e vencimentos",
                            "Pendências de treinamento",
                            "Evidências de capacitação",
                        ]),
                }),

                Object.freeze({
                    titulo:
                        "Gestão Documental SST",

                    itens:
                        Object.freeze([
                            "Documentos da empresa e dos colaboradores",
                            "PGR, PCMSO e LTCAT",
                            "ASO, Ficha de Registro, Ficha de EPI e Ordem de Serviço",
                            "OCR e análise documental",
                            "Validades, vencimentos e pendências",
                            "Histórico, alertas e acompanhamento documental",
                        ]),
                }),
            ]),
    });
function chaveSeguraModulo(
    valor = ""
) {
    return String(
        valor ||
        ""
    )
        .trim()
        .toLowerCase();
}

export function obterDefinicaoComercialModuloSafeScan(
    chaveModulo = ""
) {
    const chave =
        chaveSeguraModulo(
            chaveModulo
        );

    return (
        MATRIZ_COMERCIAL_MODULOS_SAFESCAN[
            chave
        ] ||
        null
    );
}

export function moduloPlanoBaseSafeScan(
    chaveModulo = ""
) {
    return (
        obterDefinicaoComercialModuloSafeScan(
            chaveModulo
        )?.grupo ===
        GRUPOS_COMERCIAIS_SAFESCAN
            .PLANO_BASE
    );
}

export function moduloAdicionalSafeScan(
    chaveModulo = ""
) {
    return (
        obterDefinicaoComercialModuloSafeScan(
            chaveModulo
        )?.grupo ===
        GRUPOS_COMERCIAIS_SAFESCAN
            .ADICIONAL
    );
}

export function telaPlanoBaseSafeScan(
    tela = ""
) {
    const telaSegura =
        String(
            tela ||
            ""
        ).trim();

    if (!telaSegura) {
        return false;
    }

    return Object
        .values(
            MATRIZ_COMERCIAL_MODULOS_SAFESCAN
        )
        .some(
            (modulo) =>
                modulo.grupo ===
                    GRUPOS_COMERCIAIS_SAFESCAN
                        .PLANO_BASE
                &&
                modulo.telas.includes(
                    telaSegura
                )
        );
}

export function listarModulosPlanoBaseSafeScan() {
    return Object
        .values(
            MATRIZ_COMERCIAL_MODULOS_SAFESCAN
        )
        .filter(
            (modulo) =>
                modulo.grupo ===
                GRUPOS_COMERCIAIS_SAFESCAN
                    .PLANO_BASE
        );
}

export function listarModulosAdicionaisSafeScan() {
    return Object
        .values(
            MATRIZ_COMERCIAL_MODULOS_SAFESCAN
        )
        .filter(
            (modulo) =>
                modulo.grupo ===
                GRUPOS_COMERCIAIS_SAFESCAN
                    .ADICIONAL
        );
}
