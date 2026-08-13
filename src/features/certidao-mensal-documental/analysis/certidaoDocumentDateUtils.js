const MILISSEGUNDOS_POR_DIA =
    24 * 60 * 60 * 1000;

function obterPrimeiroValor(
    texto,
    padroes
) {
    const conteudo =
        String(texto || "");

    for (const padrao of padroes) {
        const correspondencia =
            conteudo.match(padrao);

        const valor =
            String(
                correspondencia?.[1] || ""
            ).trim();

        if (valor) {
            return valor;
        }
    }

    return "";
}

export function converterDataBrParaIso(
    valor = ""
) {
    const correspondencia =
        String(valor || "")
            .trim()
            .match(
                /^(\d{2})\/(\d{2})\/(\d{4})$/
            );

    if (!correspondencia) {
        return "";
    }

    const dia =
        Number(correspondencia[1]);

    const mes =
        Number(correspondencia[2]);

    const ano =
        Number(correspondencia[3]);

    const data =
        new Date(
            Date.UTC(
                ano,
                mes - 1,
                dia
            )
        );

    if (
        data.getUTCFullYear() !== ano ||
        data.getUTCMonth() !== mes - 1 ||
        data.getUTCDate() !== dia
    ) {
        return "";
    }

    return [
        String(ano).padStart(4, "0"),
        String(mes).padStart(2, "0"),
        String(dia).padStart(2, "0"),
    ].join("-");
}

export function formatarDataIsoParaBr(
    valor = ""
) {
    const correspondencia =
        String(valor || "")
            .trim()
            .match(
                /^(\d{4})-(\d{2})-(\d{2})$/
            );

    if (!correspondencia) {
        return "";
    }

    return [
        correspondencia[3],
        correspondencia[2],
        correspondencia[1],
    ].join("/");
}

export function extrairDadosTemporaisCndFederal(
    texto = ""
) {
    const horaEmissaoBr =
        obterPrimeiroValor(
            texto,
            [
                /EMITIDA?\s+[ÀA]S?\s+(\d{1,2}:\d{2}(?::\d{2})?)\s+DO\s+DIA/i,
                /HORA\s+DE\s+EMISS[AÃ]O\s*:?\s*(\d{1,2}:\d{2}(?::\d{2})?)/i,
            ]
        );

    const horaEmissao =
        horaEmissaoBr
            ? horaEmissaoBr
                .split(":")
                .map((parte) =>
                    String(parte).padStart(2, "0")
                )
                .join(":")
            : "";

    const dataEmissaoBr =
        obterPrimeiroValor(
            texto,
            [
                /EMITIDA?\s+[ÀA]S?\s+\d{1,2}:\d{2}(?::\d{2})?\s+DO\s+DIA\s+(\d{2}\/\d{2}\/\d{4})/i,
                /EMITIDA?\s+EM\s+(\d{2}\/\d{2}\/\d{4})/i,
                /DATA\s+DE\s+EMISS[AÃ]O\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i,
                /EMISS[AÃ]O\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i,
            ]
        );

    const dataValidadeBr =
        obterPrimeiroValor(
            texto,
            [
                /V[AÁ]LIDA\s+AT[EÉ]\s+(\d{2}\/\d{2}\/\d{4})/i,
                /DATA\s+DE\s+VALIDADE\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i,
                /VALIDADE\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i,
            ]
        );

    const codigoControle =
        obterPrimeiroValor(
            texto,
            [
                /C[ÓO]DIGO\s+DE\s+CONTROLE(?:\s+DA\s+CERTID[AÃ]O)?\s*:?\s*([A-Z0-9][A-Z0-9.\-]{7,79})/i,
                /C[ÓO]D\.\s+CONTROLE\s*:?\s*([A-Z0-9][A-Z0-9.\-]{7,79})/i,
            ]
        )
            .replace(/[.;,:]+$/, "")
            .toUpperCase();

    const dataEmissaoIso =
        converterDataBrParaIso(
            dataEmissaoBr
        );

    const dataValidadeIso =
        converterDataBrParaIso(
            dataValidadeBr
        );

    return {
        horaEmissao,
        dataEmissaoBr:
            dataEmissaoIso
                ? formatarDataIsoParaBr(
                    dataEmissaoIso
                )
                : "",
        dataEmissaoIso,
        dataValidadeBr:
            dataValidadeIso
                ? formatarDataIsoParaBr(
                    dataValidadeIso
                )
                : "",
        dataValidadeIso,
        codigoControle,
    };
}

function normalizarDataReferencia(
    dataReferencia
) {
    const textoReferencia =
        typeof dataReferencia === "string"
            ? dataReferencia.trim()
            : "";

    const dataCivilInformada =
        textoReferencia.match(
            /^(\d{4})-(\d{2})-(\d{2})$/
        );

    if (dataCivilInformada) {
        const ano =
            Number(
                dataCivilInformada[1]
            );

        const mes =
            Number(
                dataCivilInformada[2]
            );

        const dia =
            Number(
                dataCivilInformada[3]
            );

        const dataValidacao =
            new Date(
                Date.UTC(
                    ano,
                    mes - 1,
                    dia
                )
            );

        if (
            dataValidacao.getUTCFullYear() === ano &&
            dataValidacao.getUTCMonth() ===
                mes - 1 &&
            dataValidacao.getUTCDate() === dia
        ) {
            return {
                ano,
                mes,
                dia,
            };
        }
    }

    const data =
        dataReferencia instanceof Date
            ? new Date(
                dataReferencia.getTime()
            )
            : new Date(
                dataReferencia ||
                Date.now()
            );

    const dataValida =
        Number.isNaN(
            data.getTime()
        )
            ? new Date()
            : data;

    return {
        ano:
            dataValida.getFullYear(),
        mes:
            dataValida.getMonth() + 1,
        dia:
            dataValida.getDate(),
    };
}

function dataIsoParaUtc(
    dataIso = ""
) {
    const correspondencia =
        String(dataIso || "")
            .match(
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

export function avaliarValidadeDocumental(
    dataValidadeIso,
    dataReferencia = new Date()
) {
    const validadeUtc =
        dataIsoParaUtc(
            dataValidadeIso
        );

    if (validadeUtc === null) {
        return {
            codigo:
                "NAO_IDENTIFICADA",
            rotulo:
                "Validade não identificada",
            valida: false,
            vencida: false,
            venceHoje: false,
            diasRestantes: null,
        };
    }

    const referencia =
        normalizarDataReferencia(
            dataReferencia
        );

    const hojeUtc =
        Date.UTC(
            referencia.ano,
            referencia.mes - 1,
            referencia.dia
        );

    const diasRestantes =
        Math.round(
            (
                validadeUtc -
                hojeUtc
            ) /
            MILISSEGUNDOS_POR_DIA
        );

    if (diasRestantes < 0) {
        return {
            codigo: "VENCIDA",
            rotulo: "Vencida",
            valida: false,
            vencida: true,
            venceHoje: false,
            diasRestantes,
        };
    }

    if (diasRestantes === 0) {
        return {
            codigo: "VENCE_HOJE",
            rotulo: "Vence hoje",
            valida: true,
            vencida: false,
            venceHoje: true,
            diasRestantes,
        };
    }

    return {
        codigo: "VALIDA",
        rotulo: "Válida",
        valida: true,
        vencida: false,
        venceHoje: false,
        diasRestantes,
    };
}

export function avaliarDataEmissaoDocumental(
    dataEmissaoIso,
    dataReferencia = new Date()
) {
    const emissaoUtc =
        dataIsoParaUtc(
            dataEmissaoIso
        );

    if (emissaoUtc === null) {
        return {
            codigo:
                "NAO_IDENTIFICADA",
            rotulo:
                "Emissão não identificada",
            valida: false,
            futura: false,
        };
    }

    const referencia =
        normalizarDataReferencia(
            dataReferencia
        );

    const hojeUtc =
        Date.UTC(
            referencia.ano,
            referencia.mes - 1,
            referencia.dia
        );

    if (emissaoUtc > hojeUtc) {
        return {
            codigo: "FUTURA",
            rotulo:
                "Data de emissão futura",
            valida: false,
            futura: true,
        };
    }

    return {
        codigo: "VALIDA",
        rotulo:
            "Data de emissão válida",
        valida: true,
        futura: false,
    };
}