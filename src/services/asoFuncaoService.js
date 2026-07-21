const ROTULO_FUNCAO_ASO =
    String.raw`(?:cargo\s*\/\s*fun[cç][aã]o|fun[cç][aã]o\s*\/\s*cargo|fun[cç][aã]o|cargo|ocupa[cç][aã]o)`;

const ROTULO_CAMPO_POSTERIOR_ASO =
    String.raw`(?:setor|departamento|empresa|empregador|unidade|cpf|rg|matr[ií]cula|admiss[aã]o|data|nascimento|exame|riscos?|m[eé]dico|crm|resultado|aptid[aã]o|apto|inapto)`;

function normalizarTextoBaseAso(valor = "") {
    return String(valor || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[ºª]/g, " ")
        .replace(/[^a-z0-9]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function expandirAbreviacoesFuncaoAso(valor = "") {
    return String(valor || "")
        .replace(/\badm\b/g, "administrativo")
        .replace(/\badmin\b/g, "administrativo")
        .replace(/\badmvo\b/g, "administrativo")
        .replace(/\baux\b/g, "auxiliar")
        .replace(/\bassist\b/g, "assistente")
        .replace(/\bcoord\b/g, "coordenador")
        .replace(/\bencar\b/g, "encarregado")
        .replace(/\beng\b/g, "engenheiro")
        .replace(/\btec\b/g, "tecnico")
        .replace(/\boper\b/g, "operador")
        .replace(/\bop\b/g, "operador")
        .replace(/\bserv\b/g, "servente")
        .replace(/\s+/g, " ")
        .trim();
}

export function normalizarFuncaoAso(valor = "") {
    return expandirAbreviacoesFuncaoAso(
        normalizarTextoBaseAso(valor)
    );
}

function documentoEhAso({
    tipoDocumento = "",
    texto = "",
} = {}) {
    const base = normalizarTextoBaseAso(
        `${tipoDocumento} ${String(texto || "").slice(0, 2500)}`
    );

    return (
        /\baso\b/.test(base) ||
        base.includes("atestado de saude ocupacional")
    );
}

function linhaComecaComOutroCampoAso(valor = "") {
    const texto = normalizarTextoBaseAso(valor);

    return new RegExp(
        `^(?:${ROTULO_CAMPO_POSTERIOR_ASO})\\b`,
        "i"
    ).test(texto);
}

function limparFuncaoExtraidaAso(valor = "") {
    const texto = String(valor || "")
        .split(
            new RegExp(
                `\\s+(?=${ROTULO_CAMPO_POSTERIOR_ASO}\\s*(?::|\\-|–|—))`,
                "i"
            )
        )[0]
        .split(
            /\s+(?=(?:resultado|setor|departamento|cpf|rg|matr[ií]cula|admiss[aã]o|nascimento|exame|riscos?|aptid[aã]o|apto|inapto)\b)/i
        )[0]
        .split(/\s+\|\s+/)[0]
        .replace(/^[\s:;,\-–—|]+/, "")
        .replace(/[\s:;,\-–—|.]+$/, "")
        .replace(/\s+/g, " ")
        .trim();

    const normalizada = normalizarFuncaoAso(texto);

    if (!texto || !normalizada) return null;
    if (texto.length < 2 || texto.length > 100) return null;

    if (
        [
            "funcao",
            "cargo",
            "ocupacao",
            "nao informado",
            "nao informada",
            "sem informacao",
        ].includes(normalizada)
    ) {
        return null;
    }

    if (
        /^(cpf|rg|matricula|empresa|setor|data|exame|risco|apto|inapto)\b/.test(
            normalizada
        )
    ) {
        return null;
    }

    const tokens = normalizada.split(" ").filter(Boolean);

    if (tokens.length === 0 || tokens.length > 12) {
        return null;
    }

    return {
        funcaoOriginal: texto,
        funcaoNormalizada: normalizada,
    };
}

function normalizarLinhasOcrAso(linhasOcr = []) {
    return Array.isArray(linhasOcr)
        ? linhasOcr
            .map((linha, indice) => ({
                indice,
                texto: String(
                    linha?.texto ||
                    linha?.text ||
                    ""
                ).trim(),
                yCentro: Number(
                    linha?.yCentro ??
                    linha?.y_centro ??
                    linha?.y0 ??
                    indice
                ),
                x0: Number(linha?.x0 ?? 0),
            }))
            .filter((linha) => linha.texto)
            .sort((a, b) => {
                const diferencaY = a.yCentro - b.yCentro;

                if (Math.abs(diferencaY) > 0.002) {
                    return diferencaY;
                }

                return a.x0 - b.x0;
            })
        : [];
}

function extrairFuncaoPorLinhasAso(linhasOcr = []) {
    const linhas = normalizarLinhasOcrAso(linhasOcr);

    if (!linhas.length) return null;

    const regexMesmaLinha = new RegExp(
        `\\b${ROTULO_FUNCAO_ASO}\\b(?:\\s*(?::|\\-|–|—)\\s*|\\s+)(.+)$`,
        "i"
    );

    const regexSomenteRotulo = new RegExp(
        `^\\s*${ROTULO_FUNCAO_ASO}\\s*(?::|\\-|–|—)?\\s*$`,
        "i"
    );

    for (let indice = 0; indice < linhas.length; indice += 1) {
        const linha = linhas[indice];
        const correspondencia = linha.texto.match(regexMesmaLinha);

        if (correspondencia?.[1]) {
            const resultado = limparFuncaoExtraidaAso(
                correspondencia[1]
            );

            if (resultado) {
                return {
                    ...resultado,
                    confianca: "alta",
                    origem: "linha_ocr_mesma_linha",
                };
            }
        }

        if (!regexSomenteRotulo.test(linha.texto)) {
            continue;
        }

        for (
            let deslocamento = 1;
            deslocamento <= 3;
            deslocamento += 1
        ) {
            const candidata = linhas[indice + deslocamento];

            if (!candidata?.texto) break;

            if (linhaComecaComOutroCampoAso(candidata.texto)) {
                break;
            }

            const resultado = limparFuncaoExtraidaAso(
                candidata.texto
            );

            if (resultado) {
                return {
                    ...resultado,
                    confianca: "media",
                    origem: "linha_ocr_seguinte",
                };
            }
        }
    }

    return null;
}

function extrairFuncaoPorTextoAso(texto = "") {
    const conteudo = String(texto || "");

    if (!conteudo.trim()) return null;

    const padroes = [
        {
            regex: new RegExp(
                `\\b${ROTULO_FUNCAO_ASO}\\b\\s*(?::|\\-|–|—)\\s*([^\\r\\n]{2,140})`,
                "i"
            ),
            confianca: "alta",
            origem: "texto_campo_rotulado",
        },
        {
            regex: new RegExp(
                `\\b${ROTULO_FUNCAO_ASO}\\b\\s+([^\\r\\n]{2,140})`,
                "i"
            ),
            confianca: "media",
            origem: "texto_campo_sem_separador",
        },
    ];

    for (const padrao of padroes) {
        const correspondencia =
            conteudo.match(padrao.regex);

        if (!correspondencia?.[1]) {
            continue;
        }

        const resultado = limparFuncaoExtraidaAso(
            correspondencia[1]
        );

        if (!resultado) {
            continue;
        }

        return {
            ...resultado,
            confianca: padrao.confianca,
            origem: padrao.origem,
        };
    }

    return null;
}

export function extrairFuncaoAsoDocumento({
    tipoDocumento = "",
    texto = "",
    linhasOcr = [],
} = {}) {
    const aplicavel = documentoEhAso({
        tipoDocumento,
        texto,
    });

    if (!aplicavel) {
        return {
            aplicavel: false,
            localizado: false,
            funcaoOriginal: "",
            funcaoNormalizada: "",
            confianca: "",
            origem: "",
        };
    }

    const resultado =
        extrairFuncaoPorLinhasAso(linhasOcr) ||
        extrairFuncaoPorTextoAso(texto);

    return {
        aplicavel: true,
        localizado: Boolean(resultado?.funcaoNormalizada),
        funcaoOriginal: resultado?.funcaoOriginal || "",
        funcaoNormalizada: resultado?.funcaoNormalizada || "",
        confianca: resultado?.confianca || "",
        origem: resultado?.origem || "",
    };
}

export function compararFuncaoAsoComCadastro({
    tipoDocumento = "",
    funcaoDocumento = "",
    funcaoDocumentoNormalizada = "",
    funcaoDocumentoConfianca = "",
    funcaoDocumentoOrigem = "",
    funcaoCadastro = "",
} = {}) {
    const aplicavel = documentoEhAso({
        tipoDocumento,
    });

    const funcaoAsoNormalizada =
        funcaoDocumentoNormalizada ||
        normalizarFuncaoAso(funcaoDocumento);

    const funcaoSistemaNormalizada =
        normalizarFuncaoAso(funcaoCadastro);

    const resultadoBase = {
        aplicavel,
        funcaoDocumento: String(funcaoDocumento || "").trim(),
        funcaoDocumentoNormalizada: funcaoAsoNormalizada,
        funcaoCadastro: String(funcaoCadastro || "").trim(),
        funcaoCadastroNormalizada: funcaoSistemaNormalizada,
        confianca: funcaoDocumentoConfianca || "",
        origem: funcaoDocumentoOrigem || "",
        equivalente: false,
        divergencia: false,
        requerConfirmacao: false,
    };

    if (!aplicavel) {
        return {
            ...resultadoBase,
            status: "nao_aplicavel",
        };
    }

    if (!funcaoAsoNormalizada) {
        return {
            ...resultadoBase,
            status: "funcao_aso_nao_localizada",
        };
    }

    if (!funcaoSistemaNormalizada) {
        return {
            ...resultadoBase,
            status: "cadastro_sem_funcao",
            divergencia: true,
            requerConfirmacao: true,
        };
    }

    const equivalente =
        funcaoAsoNormalizada === funcaoSistemaNormalizada;

    return {
        ...resultadoBase,
        status: equivalente ? "equivalente" : "divergente",
        equivalente,
        divergencia: !equivalente,
        requerConfirmacao: !equivalente,
    };
}
