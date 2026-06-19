function normalizarClassificadorDocumento(valor = "") {
    return String(valor || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function contemClassificador(texto = "", termos = []) {
    return termos.some((termo) => texto.includes(normalizarClassificadorDocumento(termo)));
}

function contemPalavraClassificador(texto = "", palavra = "") {
    const termo = normalizarClassificadorDocumento(palavra);
    if (!termo) return false;

    return texto.split(" ").includes(termo);
}

function possuiPadraoNr(texto = "") {
    return /\bnr\s*0?\d+|\bnr0?\d+\b/.test(texto);
}

function possuiNomeProvavelPessoa(texto = "") {
    const termosIgnorados = new Set([
        "nr",
        "aso",
        "certif",
        "certificado",
        "treinamento",
        "seguranca",
        "maquinas",
        "equipamentos",
        "geral",
        "empresa",
        "integracao",
        "lista",
        "presenca",
        "atestado",
        "saude",
        "ocupacional",
        "ficha",
        "registro",
        "epi",
        "epis",
        "ordem",
        "servico",
        "ribeiro",
        "aquino",
        "residuos",
        "trabalhos",
        "fundacoes",
        "escavacoes",
        "protetor",
        "solar",
        "sinalizacao",
        "transito",
    ]);

    const tokens = texto
        .split(" ")
        .filter((token) => token.length >= 3 && !termosIgnorados.has(token) && !/^\d+$/.test(token));

    return tokens.length >= 2;
}

export function classificarDocumentoTreinamentoArquivo({
    arquivo = null,
    nomeArquivo = "",
    texto = "",
    treinamento = null,
    sugestaoData = null,
} = {}) {
    const nome = normalizarClassificadorDocumento(
        nomeArquivo ||
        arquivo?.name ||
        arquivo?.nome ||
        arquivo?.filename ||
        ""
    );

    const textoBase = normalizarClassificadorDocumento([
        nome,
        texto,
        sugestaoData?.texto,
        sugestaoData?.mensagem,
        treinamento?.nome,
        treinamento?.titulo,
    ].filter(Boolean).join(" "));

    const ehAso = contemClassificador(textoBase, [
        "aso",
        "atestado de saude ocupacional",
    ]);

    const ehFichaEpi = /\bficha\s+(de\s+)?epi(s)?\b/.test(textoBase) ||
        contemClassificador(textoBase, [
            "controle de entrega de epi",
            "entrega de epi",
            "equipamento de protecao individual",
        ]);

    const ehFichaRegistro = /\bficha\s+(de\s+)?reg(istro)?\b/.test(textoBase) ||
        contemClassificador(textoBase, [
            "ficha de registro",
            "registro de empregado",
            "clt",
            "esocial",
        ]);

    const ehOrdemServico = contemClassificador(textoBase, [
        "ordem de servico",
        "ordem servico",
    ]) || (
        contemPalavraClassificador(nome, "os") &&
        possuiNomeProvavelPessoa(nome)
    );

    const ehListaPorNome = (
        contemPalavraClassificador(textoBase, "geral") ||
        contemClassificador(textoBase, [
            "lista de presenca",
            "lista presenca",
            "coletivo",
        ])
    );

    const ehListaPorEstrutura = (
        textoBase.includes("nome funcao assinatura") ||
        (textoBase.includes("nome funcao") && textoBase.includes("assinatura")) ||
        textoBase.includes("declaro ter participado")
    );

    const ehIntegracaoGeral = contemClassificador(textoBase, [
        "integracao de seguranca",
        "integracao",
    ]) && contemClassificador(textoBase, [
        "empresa",
        "ribeiro aquino",
        "geral",
    ]);

    const ehTreinamentoColetivo = (
        possuiPadraoNr(textoBase) &&
        contemClassificador(textoBase, [
            "geral",
            "treinamento",
            "seguranca",
            "ergonomia",
            "maquinas",
            "equipamentos",
            "meio ambiente",
            "residuos",
            "protetor solar",
            "creme de protecao",
            "escavacoes",
            "fundacoes",
            "sinalizacao",
            "transito",
            "transporte",
            "movimentacao",
            "obra",
            "construcao",
        ])
    );

    const ehCertificadoIndividual = contemClassificador(textoBase, [
        "certif",
        "certificado",
        "certificado de treinamento",
        "certificamos que",
    ]) && possuiNomeProvavelPessoa(textoBase) && !ehListaPorNome && !ehListaPorEstrutura;

    const ehIndividualForte = ehAso || ehFichaEpi || ehFichaRegistro || ehOrdemServico || ehCertificadoIndividual;

    if (
        (ehListaPorNome || ehListaPorEstrutura || ehIntegracaoGeral || ehTreinamentoColetivo) &&
        !ehIndividualForte
    ) {
        return {
            tipo: "lista_presenca",
            label: "Lista de presença / coletivo",
            confianca: ehListaPorEstrutura ? 95 : 85,
            motivo: ehListaPorEstrutura
                ? "Estrutura de lista com nome, função e assinatura detectada."
                : "Arquivo com características de treinamento coletivo/lista geral.",
        };
    }

    if (ehIndividualForte) {
        return {
            tipo: "individual",
            label: "Documento individual",
            confianca: ehAso || ehFichaEpi || ehFichaRegistro || ehOrdemServico ? 95 : 80,
            motivo: ehAso
                ? "ASO/atestado identificado no arquivo."
                : ehFichaEpi
                    ? "Ficha/controle de EPI individual identificado."
                    : ehFichaRegistro
                        ? "Ficha de registro individual identificada."
                        : ehOrdemServico
                            ? "Ordem de serviço individual identificada."
                            : "Certificado individual com nome provável de colaborador.",
        };
    }

    if (ehListaPorNome || ehListaPorEstrutura || ehIntegracaoGeral || ehTreinamentoColetivo) {
        return {
            tipo: "lista_presenca",
            label: "Lista de presença / coletivo",
            confianca: ehListaPorEstrutura ? 95 : 85,
            motivo: ehListaPorEstrutura
                ? "Estrutura de lista com nome, função e assinatura detectada."
                : "Arquivo com características de treinamento coletivo/lista geral.",
        };
    }

    return {
        tipo: "indefinido",
        label: "Revisar tipo do documento",
        confianca: 40,
        motivo: "Não foi possível confirmar se o arquivo é individual ou lista coletiva.",
    };
}
