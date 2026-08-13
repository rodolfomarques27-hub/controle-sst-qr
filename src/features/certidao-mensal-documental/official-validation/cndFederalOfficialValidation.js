const CODIGOS_QUE_BLOQUEIAM_CONFORMIDADE =
    new Set([
        "DIVERGENCIA_CNPJ",
        "DOCUMENTO_VENCIDO",
        "DATA_EMISSAO_FUTURA",
        "CERTIDAO_POSITIVA",
        "TIPO_DOCUMENTAL_DIVERGENTE",
    ]);

export const CND_FEDERAL_FONTE_OFICIAL =
    Object.freeze({
        id: "rfb-pgfn-certidoes-atuais",
        orgao:
            "Receita Federal do Brasil / PGFN",
        modo:
            "consulta_oficial_assistida_por_cnpj",
        urlPortalAtual:
            "https://servicos.receitafederal.gov.br/servico/certidoes",
        custoExterno: false,
        automatizado: false,
        preenchimentoAutomatico: false,
        captchaAutomatizado: false,
        dadosPersistidos: false,
        validadorLegadoHabilitado: false,
    });

function textoSeguro(valor) {
    return String(valor ?? "").trim();
}

function somenteDigitos(valor) {
    return textoSeguro(valor)
        .replace(/\D/g, "");
}

function criarCampo(
    rotulo,
    valor
) {
    const valorSeguro =
        textoSeguro(valor);

    return {
        rotulo,
        valor:
            valorSeguro ||
            "Não identificado",
        identificado:
            Boolean(valorSeguro),
    };
}

function obterMotivoBloqueio(
    codigo
) {
    switch (codigo) {
        case "DIVERGENCIA_CNPJ":
            return (
                "O CNPJ do PDF não corresponde " +
                "à empresa selecionada."
            );

        case "DOCUMENTO_VENCIDO":
            return (
                "O documento está vencido e não " +
                "pode atender à competência."
            );

        case "DATA_EMISSAO_FUTURA":
            return (
                "A data de emissão apresenta " +
                "inconsistência temporal."
            );

        case "CERTIDAO_POSITIVA":
            return (
                "Foi identificada certidão positiva " +
                "sem efeitos de negativa."
            );

        case "TIPO_DOCUMENTAL_DIVERGENTE":
            return (
                "O arquivo não corresponde à " +
                "CND Federal selecionada."
            );

        default:
            return "";
    }
}

export function normalizarCnpjPortalCndFederal(
    valor
) {
    const digitos =
        somenteDigitos(valor);

    return digitos.length === 14
        ? digitos
        : "";
}

export function montarConsultaOficialAssistidaCndFederal(
    avaliacao = {}
) {
    const documentoIdentificado =
        textoSeguro(
            avaliacao.documentoIdentificado
        );

    if (
        documentoIdentificado !==
        "CND Federal"
    ) {
        return {
            disponivel: false,
            fonte:
                CND_FEDERAL_FONTE_OFICIAL,
            campos: [],
            cnpjPortal: "",
            bloqueiaConformidade: false,
            motivoBloqueio: "",
        };
    }

    const cnpjDocumento =
        somenteDigitos(
            avaliacao.cnpjDocumento
        );

    const cnpjEsperado =
        somenteDigitos(
            avaliacao.cnpjEsperado
        );

    const cnpjConsulta =
        cnpjDocumento ||
        cnpjEsperado;

    const cnpjPortal =
        normalizarCnpjPortalCndFederal(
            cnpjConsulta
        );

    const codigoControle =
        textoSeguro(
            avaliacao.codigoControle
        );

    const dataEmissao =
        textoSeguro(
            avaliacao
                ?.dadosTemporais
                ?.dataEmissao
        );

    const horaEmissao =
        textoSeguro(
            avaliacao
                ?.dadosTemporais
                ?.horaEmissao
        );

    const dataValidade =
        textoSeguro(
            avaliacao
                ?.dadosTemporais
                ?.dataValidade
        );

    const natureza =
        textoSeguro(
            avaliacao
                ?.natureza
                ?.rotulo
        );

    const campos = [
        criarCampo(
            "CNPJ do PDF",
            cnpjConsulta
        ),
        criarCampo(
            "Código de controle",
            codigoControle
        ),
        criarCampo(
            "Data de emissão",
            dataEmissao
        ),
        criarCampo(
            "Hora de emissão",
            horaEmissao
        ),
        criarCampo(
            "Data de validade",
            dataValidade
        ),
        criarCampo(
            "Natureza",
            natureza
        ),
    ];

    const codigoAvaliacao =
        textoSeguro(
            avaliacao.codigo
        );

    const bloqueiaConformidade =
        CODIGOS_QUE_BLOQUEIAM_CONFORMIDADE
            .has(codigoAvaliacao);

    return {
        disponivel:
            Boolean(cnpjPortal),
        fonte:
            CND_FEDERAL_FONTE_OFICIAL,
        campos,
        cnpjConsulta,
        cnpjPortal,
        cnpjPortalDisponivel:
            Boolean(cnpjPortal),
        codigoControle,
        dataEmissao,
        horaEmissao,
        dataValidade,
        natureza,
        bloqueiaConformidade,
        motivoBloqueio:
            obterMotivoBloqueio(
                codigoAvaliacao
            ),
    };
}

function copiarComElementoTemporario(
    texto
) {
    if (
        typeof document === "undefined"
    ) {
        return false;
    }

    const area =
        document.createElement(
            "textarea"
        );

    area.value = texto;
    area.setAttribute(
        "readonly",
        ""
    );

    area.style.position = "fixed";
    area.style.left = "-9999px";
    area.style.opacity = "0";

    document.body.appendChild(area);
    area.select();

    let copiado = false;

    try {
        copiado =
            document.execCommand(
                "copy"
            );
    }
    finally {
        document.body.removeChild(area);
    }

    return copiado;
}

export async function copiarDadosConsultaCndFederal(
    texto
) {
    const conteudo =
        textoSeguro(texto);

    if (!conteudo) {
        return false;
    }

    if (
        typeof navigator !== "undefined" &&
        navigator.clipboard &&
        typeof navigator
            .clipboard
            .writeText === "function"
    ) {
        try {
            await navigator
                .clipboard
                .writeText(conteudo);

            return true;
        }
        catch {
            return copiarComElementoTemporario(
                conteudo
            );
        }
    }

    return copiarComElementoTemporario(
        conteudo
    );
}