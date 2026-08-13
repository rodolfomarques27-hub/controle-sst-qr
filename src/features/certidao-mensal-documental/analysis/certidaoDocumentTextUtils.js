export function normalizarTextoDocumental(
    texto = ""
) {
    return String(texto || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .toUpperCase();
}

export function somenteDigitos(
    valor = ""
) {
    return String(valor || "")
        .replace(/\D/g, "");
}

export function formatarCnpj(
    valor = ""
) {
    const digitos =
        somenteDigitos(valor);

    if (digitos.length !== 14) {
        return String(valor || "").trim();
    }

    return digitos.replace(
        /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
        "$1.$2.$3/$4-$5"
    );
}

export function extrairCnpjsDocumento(
    texto = ""
) {
    const correspondencias =
        String(texto || "").match(
            /\b\d{2}\s*\.?\s*\d{3}\s*\.?\s*\d{3}\s*\/?\s*\d{4}\s*-?\s*\d{2}\b/g
        ) || [];

    const cnpjs =
        correspondencias
            .map((valor) =>
                somenteDigitos(valor)
            )
            .filter((valor) =>
                valor.length === 14
            );

    return [
        ...new Set(cnpjs),
    ];
}

export function extrairRazaoSocialDocumento(
    texto = ""
) {
    const conteudo =
        String(texto || "");

    const padroes = [
        /(?:NOME|RAZ[AÃ]O SOCIAL)\s*:\s*(.{3,180}?)(?=\s+CNPJ\s*:|\r?\n|$)/i,
        /CONTRIBUINTE\s*:\s*(.{3,180}?)(?=\s+CNPJ\s*:|\r?\n|$)/i,
    ];

    for (const padrao of padroes) {
        const correspondencia =
            conteudo.match(padrao);

        const valor =
            String(
                correspondencia?.[1] || ""
            )
                .replace(/\s+/g, " ")
                .trim();

        if (valor) {
            return valor;
        }
    }

    return "";
}

export function cnpjsSaoIguais(
    primeiro,
    segundo
) {
    const a =
        somenteDigitos(primeiro);

    const b =
        somenteDigitos(segundo);

    return Boolean(
        a.length === 14 &&
        a === b
    );
}