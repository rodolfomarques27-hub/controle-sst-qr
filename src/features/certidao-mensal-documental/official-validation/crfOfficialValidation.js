const CODIGOS_QUE_MANTEM_PENDENCIA =
    new Set([
        "DIVERGENCIA_CNPJ",
        "CRF_VENCIDO",
        "CRF_DADOS_INCOMPLETOS",
        "CRF_PRAZO_DIVERGENTE",
    ]);

export const CRF_FONTE_OFICIAL =
    Object.freeze({
        id:
            "caixa-regularidade-empregador",
        orgao:
            "CAIXA Econômica Federal",
        documento:
            "Certificado de Regularidade do FGTS",
        modo:
            "consulta_oficial_assistida",
        urlPortal:
            "https://consulta-crf.caixa.gov.br/consultacrf/pages/consultaEmpregador.jsf",
        custoExterno:
            false,
        automatizado:
            false,
        preenchimentoAutomatico:
            false,
        captchaAutomatizado:
            false,
        dadosPersistidos:
            false,
    });

function textoSeguro(
    valor
) {
    return String(
        valor ?? ""
    ).trim();
}

function somenteDigitos(
    valor
) {
    return textoSeguro(
        valor
    ).replace(
        /\D/g,
        ""
    );
}

function criarCampo(
    rotulo,
    valor
) {
    const valorSeguro =
        textoSeguro(
            valor
        );

    return {
        rotulo,
        valor:
            valorSeguro ||
            "Não identificado",
    };
}

function obterMotivoPendencia(
    codigo
) {
    switch (codigo) {
        case "DIVERGENCIA_CNPJ":
            return (
                "O CNPJ do CRF não corresponde " +
                "à empresa selecionada."
            );

        case "CRF_VENCIDO":
            return (
                "O CRF analisado está vencido."
            );

        case "CRF_DADOS_INCOMPLETOS":
            return (
                "Nem todos os dados obrigatórios " +
                "foram identificados no PDF."
            );

        case "CRF_PRAZO_DIVERGENTE":
            return (
                "O período documental identificado " +
                "não corresponde ao prazo esperado."
            );

        default:
            return "";
    }
}

export function montarValidacaoAssistidaCrf(
    avaliacao = {}
) {
    const documentoIdentificado =
        textoSeguro(
            avaliacao
                ?.documentoIdentificado
        );

    if (
        documentoIdentificado !==
        "CRF FGTS"
    ) {
        return {
            disponivel:
                false,
            fonte:
                CRF_FONTE_OFICIAL,
            campos: [],
        };
    }

    const cnpj =
        somenteDigitos(
            avaliacao
                ?.cnpjDocumento
        );

    const numeroCertificacao =
        textoSeguro(
            avaliacao
                ?.numeroCertidao ||
            avaliacao
                ?.codigoControle
        );

    const codigoAvaliacao =
        textoSeguro(
            avaliacao
                ?.codigo
        );

    return {
        disponivel:
            true,
        fonte:
            CRF_FONTE_OFICIAL,
        cnpj,
        cnpjConsultavel:
            cnpj.length === 14,
        numeroCertificacao,
        campos: [
            criarCampo(
                "CNPJ do CRF",
                cnpj
            ),
            criarCampo(
                "Número de certificação",
                numeroCertificacao
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
                "Razão social",
                avaliacao
                    ?.razaoSocialDocumento
            ),
            criarCampo(
                "Natureza",
                avaliacao
                    ?.natureza
                    ?.rotulo
            ),
        ],
        mantemPendencia:
            CODIGOS_QUE_MANTEM_PENDENCIA
                .has(
                    codigoAvaliacao
                ),
        motivoPendencia:
            obterMotivoPendencia(
                codigoAvaliacao
            ),
    };
}

function copiarComElementoTemporario(
    texto
) {
    if (
        typeof document ===
        "undefined"
    ) {
        return false;
    }

    const area =
        document.createElement(
            "textarea"
        );

    area.value =
        texto;

    area.setAttribute(
        "readonly",
        ""
    );

    area.style.position =
        "fixed";

    area.style.left =
        "-9999px";

    area.style.opacity =
        "0";

    document.body.appendChild(
        area
    );

    area.select();

    let copiado =
        false;

    try {
        copiado =
            document.execCommand(
                "copy"
            );
    }
    finally {
        document.body.removeChild(
            area
        );
    }

    return copiado;
}

export async function copiarCampoCrf(
    valor
) {
    const texto =
        textoSeguro(
            valor
        );

    if (!texto) {
        return false;
    }

    if (
        typeof navigator !==
            "undefined" &&
        navigator.clipboard &&
        typeof navigator
            .clipboard
            .writeText ===
            "function"
    ) {
        try {
            await navigator
                .clipboard
                .writeText(
                    texto
                );

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