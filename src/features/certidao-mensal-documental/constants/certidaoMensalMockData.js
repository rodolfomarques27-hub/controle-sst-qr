export const COMPETENCIA_CERTIDAO_MENSAL_DEMO = "07/2026";

export const RESUMO_GERAL_CERTIDAO_DEMO = Object.freeze({
    contratadasFiscalizadas: 38,
    pendenciasCriticas: 7,
    certidoesValidas: 31,
    emAnalise: 4,
    pendentes: 3,
    vencidas: 0,
    ultimaAtualizacao: "24/05/2026 08:45",
    conformidadeMes: 82,
    validosResumo: "31 de 38 válidos",
});

export const STATUS_DOCUMENTAL = Object.freeze({
    confirmado: {
        rotulo: "Confirmado",
        classe: "is-confirmado",
    },
    emAnalise: {
        rotulo: "Em análise",
        classe: "is-em-analise",
    },
    pendente: {
        rotulo: "Pendente",
        classe: "is-pendente",
    },
    vencido: {
        rotulo: "Vencido",
        classe: "is-vencido",
    },
});

export const EMPRESAS_FISCALIZADAS_DEMO = Object.freeze([
    {
        id: "alpha",
        nome: "Alpha Serviços Ltda.",
        cnpj: "12.345.678/0001-90",
        pendencias: 0,
        status: "confirmado",
    },
    {
        id: "brava",
        nome: "Brava Facilities Ltda.",
        cnpj: "22.345.678/0001-91",
        pendencias: 2,
        status: "emAnalise",
    },
    {
        id: "conecta",
        nome: "Conecta Segurança Ltda.",
        cnpj: "32.345.678/0001-92",
        pendencias: 3,
        status: "vencido",
    },
    {
        id: "delta",
        nome: "Delta Engenharia Ltda.",
        cnpj: "42.345.678/0001-93",
        pendencias: 1,
        status: "pendente",
    },
    {
        id: "exito",
        nome: "Êxito Serviços Terceirizados Ltda.",
        cnpj: "52.345.678/0001-94",
        pendencias: 0,
        status: "confirmado",
    },
    {
        id: "fortes",
        nome: "Fortes Transportes Ltda.",
        cnpj: "62.345.678/0001-95",
        pendencias: 0,
        status: "confirmado",
    },
    {
        id: "gama",
        nome: "Gama Manutenção Industrial Ltda.",
        cnpj: "72.345.678/0001-96",
        pendencias: 2,
        status: "vencido",
    },
    {
        id: "higicontrol",
        nome: "Higicontrol Serviços Ltda.",
        cnpj: "82.345.678/0001-97",
        pendencias: 0,
        status: "confirmado",
    },
]);

export const DOCUMENTOS_COMPETENCIA_DEMO = Object.freeze([
    {
        id: "cnd-federal",
        numero: 1,
        titulo: "CND Federal",
        subtitulo: "Receita Federal",
        acaoLabel: "Enviar",
        detalhePrincipal: "Válida até 12/09/2026",
        detalheSecundario: "Cód. controle: 7F3B.9C2A.8E1D",
        status: "confirmado",
        arquivoNome: "CND Federal - 12.345.678_0001-90.pdf",
        pagina: "1 / 1",
        zoom: "100%",
        documentoOficialTitulo:
            "CERTIDÃO NEGATIVA DE DÉBITOS RELATIVOS AOS TRIBUTOS FEDERAIS E À DÍVIDA ATIVA DA UNIÃO",
        camposExtraidos: [
            { rotulo: "Nome / Razão social", valor: "ALPHA SERVIÇOS LTDA." },
            { rotulo: "CNPJ", valor: "12.345.678/0001-90" },
            { rotulo: "Data de emissão", valor: "24/05/2026" },
            { rotulo: "Validade", valor: "12/09/2026" },
            { rotulo: "Código de controle", valor: "7F3B.9C2A.8E1D" },
        ],
        regras: [
            { texto: "Validade CNDT 180 dias", resultado: "aprovada" },
            { texto: "Validade CRF 30 dias", resultado: "aprovada" },
            { texto: "Cruzamento de competência", resultado: "aprovada" },
            { texto: "Conferência de CNPJ", resultado: "aprovada" },
        ],
    },
    {
        id: "crf-fgts",
        numero: 2,
        titulo: "CRF FGTS",
        subtitulo: "CAIXA",
        acaoLabel: "Enviar",
        detalhePrincipal: "Validade 24/07/2026",
        detalheSecundario: "Inscrição: 12.345.678/0001-90",
        status: "confirmado",
        arquivoNome: "CRF FGTS - 12.345.678_0001-90.pdf",
        pagina: "1 / 1",
        zoom: "100%",
        documentoOficialTitulo:
            "CERTIFICADO DE REGULARIDADE DO FGTS",
        camposExtraidos: [
            { rotulo: "Inscrição", valor: "12.345.678/0001-90" },
            { rotulo: "Razão social", valor: "ALPHA SERVIÇOS LTDA." },
            { rotulo: "Emissão", valor: "24/06/2026" },
            { rotulo: "Validade", valor: "24/07/2026" },
            { rotulo: "Fonte oficial", valor: "Consulta CAIXA pendente" },
        ],
        regras: [
            { texto: "Validade do CRF dentro do período", resultado: "aprovada" },
            { texto: "Consulta na CAIXA ainda recomendada", resultado: "alerta" },
            { texto: "Conferência de CNPJ", resultado: "aprovada" },
        ],
    },
    {
        id: "fgts",
        numero: 3,
        titulo: "FGTS",
        subtitulo: "GFD + comprovante de pagamento",
        acaoLabel: "Enviar",
        detalhePrincipal: "Competência 07/2026",
        detalheSecundario:
            "Guia, pagamento e conferência humana",
        status: "pendente",
        arquivoNome: "",
        pagina: "-",
        zoom: "100%",
        documentoOficialTitulo:
            "GUIA DO FGTS DIGITAL",
        camposExtraidos: [
            {
                rotulo: "Competência",
                valor: "Aguardando documento",
            },
            {
                rotulo: "Vencimento",
                valor: "Aguardando documento",
            },
            {
                rotulo: "Total da guia",
                valor: "Aguardando documento",
            },
            {
                rotulo: "Pagamento",
                valor: "Não conferido",
            },
        ],
        regras: [
            {
                texto:
                    "GFD deve corresponder à competência selecionada",
                resultado:
                    "alerta",
            },
            {
                texto:
                    "Guia e comprovante são evidências distintas",
                resultado:
                    "alerta",
            },
            {
                texto:
                    "Quitação exige conferência humana",
                resultado:
                    "alerta",
            },
        ],
    },
    {
        id: "cndt-trabalhista",
        numero: 4,
        titulo: "CNDT (Trabalhista)",
        subtitulo: "Tribunal Superior do Trabalho",
        acaoLabel: "Enviar",
        detalhePrincipal: "Validade 23/09/2026",
        detalheSecundario: "Nº: 12345678/2026",
        status: "confirmado",
        arquivoNome: "CNDT - 12.345.678_0001-90.pdf",
        pagina: "1 / 1",
        zoom: "100%",
        documentoOficialTitulo:
            "CERTIDÃO NEGATIVA DE DÉBITOS TRABALHISTAS",
        camposExtraidos: [
            { rotulo: "Razão social", valor: "ALPHA SERVIÇOS LTDA." },
            { rotulo: "CNPJ", valor: "12.345.678/0001-90" },
            { rotulo: "Emissão", valor: "27/03/2026" },
            { rotulo: "Validade", valor: "23/09/2026" },
            { rotulo: "Número", valor: "12345678/2026" },
        ],
        regras: [
            { texto: "Prazo de 180 dias localizado", resultado: "aprovada" },
            { texto: "Conferência no TST ainda recomendada", resultado: "alerta" },
            { texto: "Conferência de CNPJ", resultado: "aprovada" },
        ],
    },
    {
        id: "cnd-estadual",
        numero: 5,
        titulo: "CND Estadual",
        subtitulo: "Fazenda Estadual",
        acaoLabel: "Enviar",
        detalhePrincipal: "Válida até 05/08/2026",
        detalheSecundario: "Cód. controle: 9A1B.2C3D.4E5F",
        status: "emAnalise",
        arquivoNome: "CND Estadual - 12.345.678_0001-90.pdf",
        pagina: "1 / 1",
        zoom: "100%",
        documentoOficialTitulo:
            "CERTIDÃO NEGATIVA DE DÉBITOS ESTADUAIS",
        camposExtraidos: [
            { rotulo: "Razão social", valor: "ALPHA SERVIÇOS LTDA." },
            { rotulo: "CNPJ", valor: "12.345.678/0001-90" },
            { rotulo: "Emissão", valor: "07/06/2026" },
            { rotulo: "Validade", valor: "05/08/2026" },
            { rotulo: "Código", valor: "9A1B.2C3D.4E5F" },
        ],
        regras: [
            { texto: "Dados essenciais localizados", resultado: "aprovada" },
            { texto: "Autenticidade depende do portal estadual", resultado: "alerta" },
        ],
    },
    {
        id: "cnd-municipal",
        numero: 6,
        titulo: "CND Municipal",
        subtitulo: "Prefeitura",
        acaoLabel: "Enviar",
        detalhePrincipal: "Válida até 31/07/2026",
        detalheSecundario: "Cód. autenticidade: 5566-7788",
        status: "confirmado",
        arquivoNome: "CND Municipal - 12.345.678_0001-90.pdf",
        pagina: "1 / 1",
        zoom: "100%",
        documentoOficialTitulo:
            "CERTIDÃO NEGATIVA DE DÉBITOS MUNICIPAIS",
        camposExtraidos: [
            { rotulo: "Município", valor: "São José dos Campos/SP" },
            { rotulo: "Razão social", valor: "ALPHA SERVIÇOS LTDA." },
            { rotulo: "CNPJ", valor: "12.345.678/0001-90" },
            { rotulo: "Validade", valor: "31/07/2026" },
            { rotulo: "Autenticidade", valor: "5566-7788" },
        ],
        regras: [
            { texto: "Documento municipal localizado", resultado: "aprovada" },
            { texto: "Consulta depende do município emissor", resultado: "alerta" },
        ],
    },
    {
        id: "falencia-concordata",
        numero: 7,
        titulo: "Falência e Concordata",
        subtitulo: "TJSP",
        acaoLabel: "Enviar",
        detalhePrincipal: "Válida até 20/08/2026",
        detalheSecundario: "Origem: TJSP",
        status: "confirmado",
        arquivoNome: "Falência e Concordata - 12.345.678_0001-90.pdf",
        pagina: "1 / 1",
        zoom: "100%",
        documentoOficialTitulo:
            "CERTIDÃO DE FALÊNCIA, CONCORDATA E RECUPERAÇÃO JUDICIAL",
        camposExtraidos: [
            { rotulo: "Origem", valor: "TJSP" },
            { rotulo: "Razão social", valor: "ALPHA SERVIÇOS LTDA." },
            { rotulo: "CNPJ", valor: "12.345.678/0001-90" },
            { rotulo: "Validade", valor: "20/08/2026" },
            { rotulo: "Situação", valor: "Nada consta" },
        ],
        regras: [
            { texto: "Dados principais localizados", resultado: "aprovada" },
            { texto: "Conferência da origem judicial", resultado: "aprovada" },
        ],
    },
    {
        id: "cadastro-tce-ceis",
        numero: 8,
        titulo: "Cadastro TCE / CEIS",
        subtitulo: "Consulta de sanções",
        acaoLabel: "Enviar",
        detalhePrincipal: "Situação: Regular",
        detalheSecundario: "Data consulta: 24/05/2026",
        status: "vencido",
        arquivoNome: "Cadastro TCE CEIS - 12.345.678_0001-90.pdf",
        pagina: "1 / 1",
        zoom: "100%",
        documentoOficialTitulo:
            "CONSULTA DE SANÇÕES E IMPEDIMENTOS",
        camposExtraidos: [
            { rotulo: "Situação", valor: "Regular" },
            { rotulo: "Consulta realizada", valor: "24/05/2026" },
            { rotulo: "Empresa", valor: "ALPHA SERVIÇOS LTDA." },
            { rotulo: "CNPJ", valor: "12.345.678/0001-90" },
            { rotulo: "Observação", valor: "Necessita atualização" },
        ],
        regras: [
            { texto: "Consulta localizada", resultado: "aprovada" },
            { texto: "Data da consulta precisa ser renovada", resultado: "reprovada" },
        ],
    },
    {
        id: "relacao-empregados",
        numero: 9,
        titulo: "Relação de Empregados",
        subtitulo: "Composição da equipe",
        acaoLabel: "Enviar",
        detalhePrincipal: "Total: 142 colaboradores",
        detalheSecundario: "Atualizado em 23/05/2026",
        status: "emAnalise",
        arquivoNome: "Relação de Empregados - 12.345.678_0001-90.pdf",
        pagina: "1 / 1",
        zoom: "100%",
        documentoOficialTitulo:
            "RELAÇÃO DE EMPREGADOS ALOCADOS",
        camposExtraidos: [
            { rotulo: "Total", valor: "142 colaboradores" },
            { rotulo: "Empresa", valor: "ALPHA SERVIÇOS LTDA." },
            { rotulo: "Atualização", valor: "23/05/2026" },
            { rotulo: "Origem", valor: "Controle interno" },
            { rotulo: "Observação", valor: "Conferência humana recomendada" },
        ],
        regras: [
            { texto: "Quantidade de colaboradores identificada", resultado: "aprovada" },
            { texto: "Necessita cruzamento com folha e ponto", resultado: "alerta" },
        ],
    },
    {
        id: "aso-pcmso",
        numero: 10,
        titulo: "ASO + PCMSO",
        subtitulo: "Saúde ocupacional",
        acaoLabel: "Enviar",
        detalhePrincipal: "ASO: 142 | PCMSO: Vigente",
        detalheSecundario: "Validade PCMSO: 18/12/2026",
        status: "pendente",
        arquivoNome: "ASO PCMSO - 12.345.678_0001-90.pdf",
        pagina: "1 / 1",
        zoom: "100%",
        documentoOficialTitulo:
            "CONTROLE DE APTIDÃO E VIGÊNCIA DO PCMSO",
        camposExtraidos: [
            { rotulo: "ASOs", valor: "142 aptos" },
            { rotulo: "PCMSO", valor: "Vigente" },
            { rotulo: "Validade", valor: "18/12/2026" },
            { rotulo: "Empresa", valor: "ALPHA SERVIÇOS LTDA." },
            { rotulo: "Situação", valor: "Aguardando conferência" },
        ],
        regras: [
            { texto: "Vigência do PCMSO localizada", resultado: "aprovada" },
            { texto: "Necessário revisar ASOs por colaborador", resultado: "alerta" },
        ],
    },
]);