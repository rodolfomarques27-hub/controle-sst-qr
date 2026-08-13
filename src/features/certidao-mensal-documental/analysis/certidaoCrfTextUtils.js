import {
    converterDataBrParaIso,
} from "./certidaoDocumentDateUtils.js";
import {
    extrairCnpjsDocumento,
    extrairRazaoSocialDocumento,
    formatarCnpj,
} from "./certidaoDocumentTextUtils.js";

const MILISSEGUNDOS_POR_DIA =
    24 * 60 * 60 * 1000;

function textoSeguro(
    valor
) {
    return String(
        valor ?? ""
    ).trim();
}

function extrairPrimeiroGrupo(
    texto,
    padroes
) {
    const conteudo =
        textoSeguro(texto);

    for (const padrao of padroes) {
        const correspondencia =
            conteudo.match(
                padrao
            );

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

function dataIsoParaUtc(
    valor
) {
    const correspondencia =
        textoSeguro(valor).match(
            /^(\d{4})-(\d{2})-(\d{2})$/
        );

    if (!correspondencia) {
        return null;
    }

    const ano =
        Number(
            correspondencia[1]
        );

    const mes =
        Number(
            correspondencia[2]
        );

    const dia =
        Number(
            correspondencia[3]
        );

    const dataUtc =
        Date.UTC(
            ano,
            mes - 1,
            dia
        );

    const validacao =
        new Date(
            dataUtc
        );

    if (
        validacao.getUTCFullYear() !== ano ||
        validacao.getUTCMonth() !==
            mes - 1 ||
        validacao.getUTCDate() !== dia
    ) {
        return null;
    }

    return dataUtc;
}

function extrairRazaoSocialCrf(
    texto = ""
) {
    const conteudo =
        textoSeguro(
            texto
        );

    const razaoSocialEspecifica =
        extrairPrimeiroGrupo(
            conteudo,
            [
                /RAZ[AÃ]O\s+SOCIAL\s*:\s*(.{3,180}?)(?=\s+(?:ENDERE(?:Ç|C)O|CNPJ|INSCRI(?:Ç|C)[AÃ]O|VALIDADE|CERTIFICA(?:Ç|C)[AÃ]O)\s*:|$)/i,
            ]
        )
            .replace(/\s+/g, " ")
            .trim();

    if (razaoSocialEspecifica) {
        return razaoSocialEspecifica;
    }

    return extrairRazaoSocialDocumento(
        conteudo
    );
}

export function calcularPrazoInclusivoCrf({
    dataInicioIso,
    dataFimIso,
}) {
    const inicioUtc =
        dataIsoParaUtc(
            dataInicioIso
        );

    const fimUtc =
        dataIsoParaUtc(
            dataFimIso
        );

    if (
        inicioUtc === null ||
        fimUtc === null ||
        fimUtc < inicioUtc
    ) {
        return null;
    }

    return (
        Math.round(
            (
                fimUtc -
                inicioUtc
            ) /
            MILISSEGUNDOS_POR_DIA
        ) +
        1
    );
}

export function extrairDadosCrf(
    texto = ""
) {
    const conteudo =
        textoSeguro(texto);

    const numeroCertificacao =
        extrairPrimeiroGrupo(
            conteudo,
            [
                /CERTIFICA(?:Ç|C)[AÃ]O\s+N[ÚU]MERO\s*:?\s*([0-9][0-9.\-\/\s]{15,39})/i,
                /N[ÚU]MERO\s+DA\s+CERTIFICA(?:Ç|C)[AÃ]O\s*:?\s*([0-9][0-9.\-\/\s]{15,39})/i,
                /CERTIFICADO\s+N[º°O.]?\s*:?\s*([0-9][0-9.\-\/\s]{15,39})/i,
            ]
        )
            .replace(/\D/g, "");

    const validadeIntervalo =
        conteudo.match(
            /VALIDADE(?:\s+DO\s+CERTIFICADO)?\s*:?\s*(\d{2}\/\d{2}\/\d{4})\s*(?:A|AT[ÉE]|[-–—])\s*(\d{2}\/\d{2}\/\d{4})/i
        );

    const dataInicioValidadeBr =
        textoSeguro(
            validadeIntervalo?.[1]
        );

    const dataFimValidadeBr =
        textoSeguro(
            validadeIntervalo?.[2]
        );

    const dataEmissaoExplicitaBr =
        extrairPrimeiroGrupo(
            conteudo,
            [
                /DATA\s+DE\s+EMISS[AÃ]O\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i,
                /EMISS[AÃ]O\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i,
                /EMITID[AO]\s+EM\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i,
            ]
        );

    const dataEmissaoBr =
        dataEmissaoExplicitaBr ||
        dataInicioValidadeBr;

    const dataEmissaoIso =
        converterDataBrParaIso(
            dataEmissaoBr
        );

    const dataValidadeIso =
        converterDataBrParaIso(
            dataFimValidadeBr
        );

    const cnpjDocumento =
        extrairCnpjsDocumento(
            conteudo
        )[0] || "";

    const prazoValidadeDias =
        calcularPrazoInclusivoCrf({
            dataInicioIso:
                converterDataBrParaIso(
                    dataInicioValidadeBr
                ),
            dataFimIso:
                dataValidadeIso,
        });

    return {
        cnpjDocumento:
            formatarCnpj(
                cnpjDocumento
            ),
        razaoSocialDocumento:
            extrairRazaoSocialCrf(
                conteudo
            ),
        numeroCertificacao,
        dataInicioValidadeBr,
        dataFimValidadeBr,
        dataEmissaoBr,
        dataEmissaoIso,
        dataValidadeBr:
            dataFimValidadeBr,
        dataValidadeIso,
        dataEmissaoInferida:
            Boolean(
                !dataEmissaoExplicitaBr &&
                dataInicioValidadeBr
            ),
        prazoValidadeDias,
    };
}