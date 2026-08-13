import {
    converterDataBrParaIso,
    formatarDataIsoParaBr,
} from "./certidaoDocumentDateUtils.js";

const MILISSEGUNDOS_POR_DIA =
    24 * 60 * 60 * 1000;

function textoSeguro(valor) {
    return String(valor ?? "").trim();
}

function obterPrimeiroValor(
    texto,
    padroes
) {
    const conteudo =
        textoSeguro(texto);

    for (const padrao of padroes) {
        const correspondencia =
            conteudo.match(padrao);

        const valor =
            textoSeguro(
                correspondencia?.[1]
            );

        if (valor) {
            return valor;
        }
    }

    return "";
}

function normalizarHora(
    valor
) {
    const partes =
        textoSeguro(valor)
            .split(":")
            .filter(Boolean);

    if (
        partes.length !== 2 &&
        partes.length !== 3
    ) {
        return "";
    }

    const normalizadas =
        partes.map((parte) =>
            String(parte).padStart(2, "0")
        );

    if (normalizadas.length === 2) {
        normalizadas.push("00");
    }

    return normalizadas.join(":");
}

function converterDataIsoParaUtc(
    valor
) {
    const correspondencia =
        textoSeguro(valor).match(
            /^(\d{4})-(\d{2})-(\d{2})$/
        );

    if (!correspondencia) {
        return null;
    }

    return Date.UTC(
        Number(correspondencia[1]),
        Number(correspondencia[2]) - 1,
        Number(correspondencia[3])
    );
}

export function calcularDiasEntreDatasIso(
    inicioIso,
    fimIso
) {
    const inicio =
        converterDataIsoParaUtc(
            inicioIso
        );

    const fim =
        converterDataIsoParaUtc(
            fimIso
        );

    if (
        inicio === null ||
        fim === null
    ) {
        return null;
    }

    return Math.round(
        (fim - inicio) /
        MILISSEGUNDOS_POR_DIA
    );
}

export function extrairDadosCndt(
    texto = ""
) {
    const conteudo =
        textoSeguro(texto);

    const numeroAno =
        conteudo.match(
            /CERTID[AÃ]O(?:\s+N[ÚU]MERO|\s+N[º°O.]?)?\s*:?\s*(\d{4,24})\s*\/\s*(\d{4})/i
        ) ||
        conteudo.match(
            /N[º°O.]?\s*:?\s*(\d{4,24})\s*\/\s*(\d{4})/i
        );

    const numeroCertidao =
        textoSeguro(
            numeroAno?.[1]
        );

    const anoCertidao =
        textoSeguro(
            numeroAno?.[2]
        );

    const dataEmissaoBr =
        obterPrimeiroValor(
            conteudo,
            [
                /EXPEDI[CÇ][AÃ]O\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i,
                /EMITIDA?\s+EM\s+(\d{2}\/\d{2}\/\d{4})/i,
                /DATA\s+DE\s+EMISS[AÃ]O\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i,
            ]
        );

    const horaEmissao =
        normalizarHora(
            obterPrimeiroValor(
                conteudo,
                [
                    /EXPEDI[CÇ][AÃ]O\s*:?\s*\d{2}\/\d{2}\/\d{4}\s*,?\s*[ÀA]S?\s*(\d{1,2}:\d{2}(?::\d{2})?)/i,
                    /HORA\s+DE\s+EMISS[AÃ]O\s*:?\s*(\d{1,2}:\d{2}(?::\d{2})?)/i,
                ]
            )
        );

    const dataValidadeBr =
        obterPrimeiroValor(
            conteudo,
            [
                /VALIDADE\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i,
                /V[AÁ]LIDA\s+AT[EÉ]\s+(\d{2}\/\d{2}\/\d{4})/i,
            ]
        );

    const dataEmissaoIso =
        converterDataBrParaIso(
            dataEmissaoBr
        );

    const dataValidadeIso =
        converterDataBrParaIso(
            dataValidadeBr
        );

    const duracaoValidadeDias =
        calcularDiasEntreDatasIso(
            dataEmissaoIso,
            dataValidadeIso
        );

    return {
        numeroCertidao,
        anoCertidao,
        numeroCompleto:
            numeroCertidao &&
            anoCertidao
                ? `${numeroCertidao}/${anoCertidao}`
                : "",
        dataEmissao:
            dataEmissaoIso
                ? formatarDataIsoParaBr(
                    dataEmissaoIso
                )
                : "",
        dataEmissaoIso,
        horaEmissao,
        dataValidade:
            dataValidadeIso
                ? formatarDataIsoParaBr(
                    dataValidadeIso
                )
                : "",
        dataValidadeIso,
        duracaoValidadeDias,
    };
}