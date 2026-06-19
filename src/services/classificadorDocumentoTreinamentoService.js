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


const PALAVRAS_COLETIVO_TREINAMENTO_ETAPA2 = [
    "lista de presenca",
    "lista presenca",
    "nome funcao assinatura",
    "nome funcao",
    "carga horaria",
    "instrutor",
    "participado do treinamento",
    "treinamento coletivo",
];

const PALAVRAS_INDIVIDUAL_TREINAMENTO_ETAPA2 = [
    "aso",
    "atestado de saude ocupacional",
    "ordem de servico",
    "ficha de epi",
    "ficha de registro",
    "certificado individual",
];

const FUNCOES_LISTA_PRESENCA_ETAPA2 = [
    "ajudante",
    "pedreiro",
    "lider",
    "motorista",
    "encarregado",
    "greidista",
    "op de maq",
    "op de maquina",
    "op de betoneira",
    "aux adm",
    "carpinteiro",
];

function normalizarTextoClassificacaoEtapa2(valor = "") {
    return String(valor || "")
        .normalize("NFD")
        .replace(new RegExp("[\\u0300-\\u036f]", "g"), "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .split(/\s+/)
        .filter(Boolean)
        .join(" ")
        .trim();
}

function contarTermosClassificacaoEtapa2(texto = "", termos = []) {
    const base = normalizarTextoClassificacaoEtapa2(texto);

    return termos.reduce((total, termo) => {
        const termoNormalizado = normalizarTextoClassificacaoEtapa2(termo);
        return base.includes(termoNormalizado) ? total + 1 : total;
    }, 0);
}

function contarLinhasNumeradasListaEtapa2(texto = "") {
    const linhas = String(texto || "").split(/\r?\n/);
    let total = 0;

    for (const linha of linhas) {
        const normalizada = normalizarTextoClassificacaoEtapa2(linha);
        const partes = normalizada.split(" ").filter(Boolean);
        const primeiro = partes[0] || "";

        if (/^[0-9]{1,2}$/.test(primeiro) && partes.length >= 3) {
            total += 1;
        }
    }

    return total;
}

function contemFuncaoDeListaEtapa2(texto = "") {
    const base = normalizarTextoClassificacaoEtapa2(texto);

    return FUNCOES_LISTA_PRESENCA_ETAPA2.some((funcao) =>
        base.includes(normalizarTextoClassificacaoEtapa2(funcao))
    );
}

export function classificarTipoDocumentoTreinamentoEtapa2({
    nomeArquivo = "",
    texto = "",
    textoOcr = "",
    tipoDetectado = "",
} = {}) {
    const conteudo = [nomeArquivo, texto, textoOcr, tipoDetectado]
        .filter(Boolean)
        .join(" ");

    const base = normalizarTextoClassificacaoEtapa2(conteudo);
    const linhasNumeradas = contarLinhasNumeradasListaEtapa2([texto, textoOcr].filter(Boolean).join("\n"));
    const temCabecalhoLista = base.includes("nome funcao") || base.includes("nome funcao assinatura");
    const temTermoGeral = base.includes("geral");
    const temFuncaoLista = contemFuncaoDeListaEtapa2(conteudo);

    const pontosColetivo =
        contarTermosClassificacaoEtapa2(conteudo, PALAVRAS_COLETIVO_TREINAMENTO_ETAPA2) +
        linhasNumeradas +
        ((temCabecalhoLista || linhasNumeradas >= 2) && temFuncaoLista ? 2 : 0) +
        (temTermoGeral ? 2 : 0);

    const pontosIndividual =
        contarTermosClassificacaoEtapa2(conteudo, PALAVRAS_INDIVIDUAL_TREINAMENTO_ETAPA2);

    const tipoDocumento =
        pontosColetivo >= 4 && pontosColetivo >= pontosIndividual
            ? "coletivo"
            : pontosIndividual >= 1 && pontosIndividual >= pontosColetivo
                ? "individual"
                : "indefinido";

    return {
        tipoDocumento,
        perfil: tipoDocumento === "coletivo"
            ? "lista_presenca"
            : tipoDocumento === "individual"
                ? "documento_individual"
                : "indefinido",
        pontosColetivo,
        pontosIndividual,
        confianca: tipoDocumento === "coletivo"
            ? Math.min(95, 50 + pontosColetivo * 5)
            : tipoDocumento === "individual"
                ? Math.min(95, 60 + pontosIndividual * 10)
                : 40,
        motivo: tipoDocumento === "coletivo"
            ? "Documento possui sinais de lista de presenca/coletivo."
            : tipoDocumento === "individual"
                ? "Documento possui sinais de documento individual."
                : "Nao foi possivel classificar com seguranca.",
    };
}

export const __classificadorTreinamentoEtapa2Interno = {
    normalizarTextoClassificacaoEtapa2,
    contarLinhasNumeradasListaEtapa2,
    contarTermosClassificacaoEtapa2,
};

function tokensNomeColaboradorEtapa4(nome = "") {
    return normalizarTextoClassificacaoEtapa2(nome)
        .split(" ")
        .map((token) => token.trim())
        .filter((token) =>
            token.length >= 2 &&
            !["de", "da", "do", "das", "dos", "e"].includes(token)
        );
}

function compactarTextoEtapa4(valor = "") {
    return normalizarTextoClassificacaoEtapa2(valor).replace(/\s+/g, "");
}

function distanciaLevenshteinEtapa4(a = "", b = "") {
    const origem = String(a || "");
    const destino = String(b || "");

    if (origem === destino) return 0;
    if (!origem.length) return destino.length;
    if (!destino.length) return origem.length;

    const matriz = Array.from({ length: origem.length + 1 }, () =>
        Array(destino.length + 1).fill(0)
    );

    for (let i = 0; i <= origem.length; i += 1) matriz[i][0] = i;
    for (let j = 0; j <= destino.length; j += 1) matriz[0][j] = j;

    for (let i = 1; i <= origem.length; i += 1) {
        for (let j = 1; j <= destino.length; j += 1) {
            const custo = origem[i - 1] === destino[j - 1] ? 0 : 1;

            matriz[i][j] = Math.min(
                matriz[i - 1][j] + 1,
                matriz[i][j - 1] + 1,
                matriz[i - 1][j - 1] + custo
            );
        }
    }

    return matriz[origem.length][destino.length];
}

function tokenParecidoEtapa4(tokenBusca = "", tokenTexto = "") {
    const busca = normalizarTextoClassificacaoEtapa2(tokenBusca);
    const texto = normalizarTextoClassificacaoEtapa2(tokenTexto);

    if (!busca || !texto) return false;
    if (texto === busca) return true;
    if (texto.includes(busca) && busca.length >= 4) return true;
    if (busca.includes(texto) && texto.length >= 4) return true;

    const distancia = distanciaLevenshteinEtapa4(busca, texto);
    const limite = busca.length <= 5 ? 1 : 2;

    return distancia <= limite;
}

function localizarTokensNomeNoTextoEtapa4(tokens = [], texto = "") {
    const base = normalizarTextoClassificacaoEtapa2(texto);
    const palavrasTexto = base.split(" ").filter(Boolean);

    return tokens.map((token) => {
        const direto = base.includes(token);
        const parecido = palavrasTexto.some((palavra) => tokenParecidoEtapa4(token, palavra));

        return {
            token,
            encontrado: direto || parecido,
            direto,
            parecido: !direto && parecido,
        };
    });
}

export function analisarColaboradorDocumentoColetivoEtapa4({
    nomeColaborador = "",
    texto = "",
    textoOcr = "",
} = {}) {
    const conteudo = [texto, textoOcr].filter(Boolean).join("\n");
    const tokens = tokensNomeColaboradorEtapa4(nomeColaborador);
    const baseCompactada = compactarTextoEtapa4(conteudo);

    if (!tokens.length) {
        return {
            localizado: false,
            provavel: false,
            confianca: 0,
            nomeReferencia: nomeColaborador,
            nomeExtraido: "",
            motivo: "Nome do colaborador vazio ou invalido.",
            tokensEncontrados: [],
        };
    }

    const primeiroNome = tokens[0] || "";
    const sobrenomes = tokens.slice(1);

    const tokensAnalisados = localizarTokensNomeNoTextoEtapa4(tokens, conteudo);
    const tokensEncontrados = tokensAnalisados
        .filter((item) => item.encontrado)
        .map((item) => item.token);

    const primeiroEncontrado = tokensAnalisados.some((item) =>
        item.token === primeiroNome && item.encontrado
    );

    const sobrenomesEncontrados = sobrenomes.filter((sobrenome) =>
        tokensAnalisados.some((item) => item.token === sobrenome && item.encontrado)
    );

    const primeiroSobrenomeCompactado = primeiroNome && sobrenomes[0]
        ? primeiroNome + sobrenomes[0]
        : "";

    const nomeCompactoPrimeiroSobrenome =
        Boolean(primeiroSobrenomeCompactado) &&
        baseCompactada.includes(primeiroSobrenomeCompactado);

    const nomeParcialForte =
        primeiroEncontrado &&
        sobrenomesEncontrados.length >= 1;

    const confianca =
        nomeCompactoPrimeiroSobrenome ? 95 :
        nomeParcialForte ? 90 :
        tokensEncontrados.length >= 2 ? 75 :
        tokensEncontrados.length === 1 ? 45 :
        0;

    const localizado = confianca >= 75;
    const provavel = confianca >= 45;

    return {
        localizado,
        provavel,
        confianca,
        nomeReferencia: nomeColaborador,
        nomeExtraido: localizado || provavel
            ? [primeiroNome, ...sobrenomesEncontrados].filter(Boolean).join(" ").toUpperCase()
            : "",
        motivo: nomeCompactoPrimeiroSobrenome
            ? "Colaborador localizado por nome compacto em lista coletiva."
            : nomeParcialForte
                ? "Colaborador localizado por primeiro nome e sobrenome forte em lista coletiva."
                : tokensEncontrados.length
                    ? "Parte do nome do colaborador foi localizada no documento coletivo."
                    : "Nome do colaborador nao localizado no documento coletivo.",
        tokensEncontrados,
        tokensAnalisados,
    };
}
