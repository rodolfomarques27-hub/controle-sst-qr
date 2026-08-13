const CODIGOS_QUE_BLOQUEIAM_CONFORMIDADE =
    new Set([
        "DIVERGENCIA_CNPJ",
        "DOCUMENTO_VENCIDO",
        "DATA_EMISSAO_FUTURA",
        "CERTIDAO_POSITIVA",
        "TIPO_DOCUMENTAL_DIVERGENTE",
    ]);

export const CNDT_FONTE_OFICIAL =
    Object.freeze({
        id: "tst-cndt",
        orgao:
            "Tribunal Superior do Trabalho",
        modo:
            "validacao_oficial_assistida",
        urlPortal:
            "https://www.tst.jus.br/certidao1",
        custoExterno: false,
        automatizado: false,
        preenchimentoAutomatico: false,
        captchaAutomatizado: false,
        dadosPersistidos: false,
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
    };
}

function motivoBloqueio(
    codigo
) {
    switch (codigo) {
        case "DIVERGENCIA_CNPJ":
            return (
                "O CNPJ da CNDT não corresponde " +
                "à empresa selecionada."
            );

        case "DOCUMENTO_VENCIDO":
            return "A CNDT está vencida.";

        case "DATA_EMISSAO_FUTURA":
            return (
                "A data de emissão apresenta " +
                "inconsistência."
            );

        case "CERTIDAO_POSITIVA":
            return (
                "A CNDT é positiva sem efeitos " +
                "de negativa."
            );

        case "TIPO_DOCUMENTAL_DIVERGENTE":
            return (
                "O arquivo não corresponde " +
                "a uma CNDT."
            );

        default:
            return "";
    }
}

export function montarValidacaoAssistidaCndt(
    avaliacao = {}
) {
    if (
        textoSeguro(
            avaliacao.documentoIdentificado
        ) !== "CNDT"
    ) {
        return {
            disponivel: false,
            fonte: CNDT_FONTE_OFICIAL,
            campos: [],
        };
    }

    const cnpj =
        somenteDigitos(
            avaliacao.cnpjDocumento ||
            avaliacao.cnpjEsperado
        );

    const numero =
        somenteDigitos(
            avaliacao.numeroCertidao
        );

    const ano =
        somenteDigitos(
            avaliacao.anoCertidao
        );

    const codigo =
        textoSeguro(
            avaliacao.codigo
        );

    return {
        disponivel:
            Boolean(
                cnpj.length === 14 &&
                numero &&
                ano.length === 4
            ),
        fonte:
            CNDT_FONTE_OFICIAL,
        cnpj,
        numero,
        ano,
        campos: [
            criarCampo(
                "CNPJ da CNDT",
                cnpj
            ),
            criarCampo(
                "Número da certidão",
                numero
            ),
            criarCampo(
                "Ano da certidão",
                ano
            ),
            criarCampo(
                "Data de emissão",
                avaliacao
                    ?.dadosTemporais
                    ?.dataEmissao
            ),
            criarCampo(
                "Data de validade",
                avaliacao
                    ?.dadosTemporais
                    ?.dataValidade
            ),
            criarCampo(
                "Natureza",
                avaliacao
                    ?.natureza
                    ?.rotulo
            ),
        ],
        bloqueiaConformidade:
            CODIGOS_QUE_BLOQUEIAM_CONFORMIDADE
                .has(codigo),
        motivoBloqueio:
            motivoBloqueio(
                codigo
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

export async function copiarCampoCndt(
    valor
) {
    const texto =
        textoSeguro(valor);

    if (!texto) {
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
                .writeText(texto);

            return true;
        }
        catch {
            return copiarComElementoTemporario(
                texto
            );
        }
    }

    return copiarComElementoTemporario(
        texto
    );
}