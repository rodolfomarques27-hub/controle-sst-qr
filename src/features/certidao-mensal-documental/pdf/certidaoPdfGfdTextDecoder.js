const CARACTERES_ESPECIAIS_GFD =
    Object.freeze({
        "_": "Z",
        "[": "V",
        "^": "Y",
        "¤": "À",
        "¥": "Á",
        "§": "Ã",
        "«": "Ç",
        "\u00ad": "É",
        "®": "Ê",
        "±": "Í",
        "·": "Ó",
        "¹": "Õ",
        "¾": "Ú",
    });

const ASSINATURAS_CODIFICADAS_GFD =
    Object.freeze([
        /,\+\)/,
        /,ZNF/,
        /\+,98/,
        /\)NLNYFQ/,
        /9TYFQ\s+IF\s+,ZNF/,
        /WJHTQMJW/,
        /\(TRUJY/,
    ]);

function contarAssinaturasCodificadas(
    texto = ""
) {
    const conteudo =
        String(
            texto || ""
        );

    return ASSINATURAS_CODIFICADAS_GFD
        .reduce(
            (total, padrao) =>
                total +
                (
                    padrao.test(
                        conteudo
                    )
                        ? 1
                        : 0
                ),
            0
        );
}

function pareceCamadaTextualGfdCodificada(
    texto = ""
) {
    const conteudo =
        String(
            texto || ""
        ).trim();

    if (!conteudo) {
        return false;
    }

    return (
        contarAssinaturasCodificadas(
            conteudo
        ) >= 2
    );
}

function decodificarCaractereGfd(
    caractere
) {
    if (
        Object.prototype.hasOwnProperty.call(
            CARACTERES_ESPECIAIS_GFD,
            caractere
        )
    ) {
        return CARACTERES_ESPECIAIS_GFD[
            caractere
        ];
    }

    const codigo =
        caractere.charCodeAt(
            0
        );

    if (
        codigo >= 5 &&
        codigo <= 31
    ) {
        return String.fromCharCode(
            codigo + 27
        );
    }

    if (
        codigo >= 38 &&
        codigo <= 63
    ) {
        return String.fromCharCode(
            codigo + 27
        );
    }

    if (
        codigo >= 65 &&
        codigo <= 90
    ) {
        return String.fromCharCode(
            codigo - 5
        );
    }

    return caractere;
}

function normalizarTextoDecodificadoGfd(
    texto = ""
) {
    return String(
        texto || ""
    )
        .replace(
            /\s+/g,
            " "
        )
        .replace(
            /\bGFD\s*-\s*GUIA\s+DO\s+FGTS\s+DIGITAL\b/gi,
            "GFD - GUIA DO FGTS DIGITAL"
        )
        .replace(
            /\bTOTAL\s+DA\s+GUIA\s*:\s*/gi,
            "TOTAL DA GUIA: "
        )
        .trim();
}

function decodificarBlocoGfd(
    texto = ""
) {
    const decodificado =
        Array.from(
            String(
                texto || ""
            )
        )
            .map(
                decodificarCaractereGfd
            )
            .join("");

    return normalizarTextoDecodificadoGfd(
        decodificado
    );
}

function textoDecodificadoEhGfd(
    texto = ""
) {
    const normalizado =
        String(
            texto || ""
        )
            .normalize(
                "NFD"
            )
            .replace(
                /[\u0300-\u036f]/g,
                ""
            )
            .replace(
                /\s+/g,
                " "
            )
            .trim()
            .toUpperCase();

    return Boolean(
        normalizado.includes(
            "GUIA DO FGTS DIGITAL"
        ) &&
        normalizado.includes(
            "FGTS"
        )
    );
}

function transformarPaginasMarcadas(
    texto = ""
) {
    const conteudo =
        String(
            texto || ""
        );

    const paginasDecodificadas =
        [];

    const transformado =
        conteudo.replace(
            /P[aá]gina\s+(\d+):\s*([\s\S]*?)(?=\s+P[aá]gina\s+\d+:|$)/gi,
            (
                trechoCompleto,
                numeroPagina,
                textoPagina
            ) => {
                if (
                    !pareceCamadaTextualGfdCodificada(
                        textoPagina
                    )
                ) {
                    return trechoCompleto;
                }

                const decodificado =
                    decodificarBlocoGfd(
                        textoPagina
                    );

                if (
                    !textoDecodificadoEhGfd(
                        decodificado
                    )
                ) {
                    return trechoCompleto;
                }

                paginasDecodificadas.push(
                    Number(
                        numeroPagina
                    )
                );

                return (
                    `Página ${numeroPagina}: ` +
                    decodificado
                );
            }
        );

    return {
        texto:
            transformado,
        paginasDecodificadas,
    };
}

export function decodificarCamadaTextualGfd(
    texto = ""
) {
    const conteudo =
        String(
            texto || ""
        ).trim();

    if (!conteudo) {
        return {
            texto: "",
            aplicada: false,
            paginasDecodificadas: [],
            avisos: [],
        };
    }

    const paginas =
        transformarPaginasMarcadas(
            conteudo
        );

    if (
        paginas
            .paginasDecodificadas
            .length > 0
    ) {
        return {
            texto:
                paginas.texto,
            aplicada:
                true,
            paginasDecodificadas:
                paginas.paginasDecodificadas,
            avisos: [
                (
                    "A camada textual codificada da Guia " +
                    "do FGTS Digital foi decodificada " +
                    "localmente, sem API externa."
                ),
                (
                    "Somente a página com a assinatura " +
                    "estrutural da GFD foi transformada. " +
                    "As demais páginas permaneceram intactas."
                ),
            ],
        };
    }

    if (
        pareceCamadaTextualGfdCodificada(
            conteudo
        )
    ) {
        const decodificado =
            decodificarBlocoGfd(
                conteudo
            );

        if (
            textoDecodificadoEhGfd(
                decodificado
            )
        ) {
            return {
                texto:
                    decodificado,
                aplicada:
                    true,
                paginasDecodificadas: [
                    1,
                ],
                avisos: [
                    (
                        "A camada textual codificada da Guia " +
                        "do FGTS Digital foi decodificada " +
                        "localmente, sem API externa."
                    ),
                ],
            };
        }
    }

    return {
        texto:
            conteudo,
        aplicada:
            false,
        paginasDecodificadas: [],
        avisos: [],
    };
}