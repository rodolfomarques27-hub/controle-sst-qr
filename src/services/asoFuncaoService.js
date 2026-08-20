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

function calcularDistanciaEdicaoFuncaoAso(
    valorA = "",
    valorB = ""
) {
    const origem =
        String(
            valorA ||
            ""
        );

    const destino =
        String(
            valorB ||
            ""
        );

    if (!origem) {
        return destino.length;
    }

    if (!destino) {
        return origem.length;
    }

    let linhaAnterior =
        Array.from(
            {
                length:
                    destino.length +
                    1,
            },
            (_, indice) =>
                indice
        );

    for (
        let indiceOrigem = 1;
        indiceOrigem <= origem.length;
        indiceOrigem += 1
    ) {
        const linhaAtual = [
            indiceOrigem,
        ];

        for (
            let indiceDestino = 1;
            indiceDestino <= destino.length;
            indiceDestino += 1
        ) {
            const custo =
                origem[
                    indiceOrigem -
                    1
                ] ===
                destino[
                    indiceDestino -
                    1
                ]
                    ? 0
                    : 1;

            linhaAtual[
                indiceDestino
            ] =
                Math.min(
                    linhaAnterior[
                        indiceDestino
                    ] +
                        1,
                    linhaAtual[
                        indiceDestino -
                        1
                    ] +
                        1,
                    linhaAnterior[
                        indiceDestino -
                        1
                    ] +
                        custo
                );
        }

        linhaAnterior =
            linhaAtual;
    }

    return linhaAnterior[
        destino.length
    ];
}

function residuoPareceRuidoOcrFuncaoAso(
    valor = ""
) {
    const tokens =
        normalizarFuncaoAso(
            valor
        )
            .split(" ")
            .filter(Boolean);

    if (!tokens.length) {
        return false;
    }

    return tokens.every(
        (token) =>
            /\d/.test(token) ||
            token.length <= 2
    );
}

function avaliarCorrespondenciaTermoFuncaoAso({
    textoNormalizado = "",
    termo = "",
} = {}) {
    const termoNormalizado =
        normalizarFuncaoAso(
            termo
        );

    if (
        !textoNormalizado ||
        !termoNormalizado
    ) {
        return null;
    }

    /*
     * Caso 1 — correspondência exata.
     */
    if (
        textoNormalizado ===
        termoNormalizado
    ) {
        return {
            tipo:
                "exata",
            pontuacao:
                4000 +
                termoNormalizado.length,
            termoNormalizado,
        };
    }

    /*
     * Caso 2 — variação gráfica mínima.
     */
    const tokensTexto =
        textoNormalizado
            .split(" ")
            .filter(Boolean);

    const tokensTermo =
        termoNormalizado
            .split(" ")
            .filter(Boolean);

    if (
        textoNormalizado.length >= 5 &&
        termoNormalizado.length >= 5 &&
        tokensTexto.length ===
            tokensTermo.length &&
        Math.abs(
            textoNormalizado.length -
            termoNormalizado.length
        ) <= 1
    ) {
        const distancia =
            calcularDistanciaEdicaoFuncaoAso(
                textoNormalizado,
                termoNormalizado
            );

        if (distancia <= 1) {
            return {
                tipo:
                    "variacao_grafica",
                pontuacao:
                    3000 +
                    termoNormalizado.length,
                termoNormalizado,
            };
        }
    }

    /*
     * Caso 3 — função válida seguida apenas de
     * pequeno resíduo típico de OCR.
     */
    if (
        termoNormalizado.length >= 4 &&
        textoNormalizado.startsWith(
            `${termoNormalizado} `
        )
    ) {
        const residuo =
            textoNormalizado
                .slice(
                    termoNormalizado.length
                )
                .trim();

        if (
            residuoPareceRuidoOcrFuncaoAso(
                residuo
            )
        ) {
            return {
                tipo:
                    "ruido_ocr_residual",
                pontuacao:
                    2000 +
                    termoNormalizado.length,
                termoNormalizado,
            };
        }
    }

    return null;
}

function resolverFuncaoCanonicaAso({
    valor = "",
    matrizesFuncao = [],
} = {}) {
    const funcaoInformada =
        String(
            valor ||
            ""
        ).trim();

    const textoNormalizado =
        normalizarFuncaoAso(
            funcaoInformada
        );

    const resultadoVazio = {
        localizada: false,
        ambigua: false,
        funcaoCanonica: "",
        chaveCanonica: "",
        termoCorrespondente: "",
        tipoCorrespondencia: "",
    };

    if (
        !textoNormalizado ||
        !Array.isArray(
            matrizesFuncao
        ) ||
        !matrizesFuncao.length
    ) {
        return resultadoVazio;
    }

    const candidatos = [];

    for (
        const matriz of
        matrizesFuncao
    ) {
        if (
            !matriz ||
            matriz.chave === "geral"
        ) {
            continue;
        }

        const termos =
            Array.from(
                new Set(
                    [
                        matriz.rotulo,
                        ...(
                            Array.isArray(
                                matriz.termos
                            )
                                ? matriz.termos
                                : []
                        ),
                    ]
                        .map(
                            (item) =>
                                String(
                                    item ||
                                    ""
                                ).trim()
                        )
                        .filter(Boolean)
                )
            );

        let melhor =
            null;

        for (
            const termo of termos
        ) {
            const correspondencia =
                avaliarCorrespondenciaTermoFuncaoAso({
                    textoNormalizado,
                    termo,
                });

            if (!correspondencia) {
                continue;
            }

            if (
                !melhor ||
                correspondencia.pontuacao >
                    melhor.pontuacao
            ) {
                melhor = {
                    ...correspondencia,
                    termo,
                };
            }
        }

        if (!melhor) {
            continue;
        }

        candidatos.push({
            chave:
                String(
                    matriz.chave ||
                    ""
                ).trim(),

            rotulo:
                String(
                    matriz.rotulo ||
                    ""
                ).trim(),

            ...melhor,
        });
    }

    candidatos.sort(
        (a, b) =>
            b.pontuacao -
            a.pontuacao
    );

    const principal =
        candidatos[0] ||
        null;

    if (!principal) {
        return resultadoVazio;
    }

    const segundo =
        candidatos[1] ||
        null;

    const ambigua =
        Boolean(
            segundo &&
            segundo.pontuacao ===
                principal.pontuacao &&
            segundo.chave !==
                principal.chave
        );

    if (ambigua) {
        return {
            ...resultadoVazio,
            ambigua: true,
        };
    }

    return {
        localizada: true,
        ambigua: false,

        funcaoCanonica:
            principal.rotulo ||
            funcaoInformada,

        chaveCanonica:
            principal.chave,

        termoCorrespondente:
            principal.termo,

        tipoCorrespondencia:
            principal.tipo,
    };
}

export function compararFuncaoAsoComCadastro({
    tipoDocumento = "",
    funcaoDocumento = "",
    funcaoDocumentoNormalizada = "",
    funcaoDocumentoConfianca = "",
    funcaoDocumentoOrigem = "",
    funcaoCadastro = "",
    matrizesFuncao = [],
} = {}) {
    const aplicavel =
        documentoEhAso({
            tipoDocumento,
        });

    const funcaoDocumentoBruta =
        String(
            funcaoDocumento ||
            ""
        ).trim();

    const funcaoCadastroBruta =
        String(
            funcaoCadastro ||
            ""
        ).trim();

    const funcaoAsoNormalizada =
        String(
            funcaoDocumentoNormalizada ||
            normalizarFuncaoAso(
                funcaoDocumentoBruta
            )
        ).trim();

    const funcaoSistemaNormalizada =
        normalizarFuncaoAso(
            funcaoCadastroBruta
        );

    const reconhecimentoDocumento =
        resolverFuncaoCanonicaAso({
            valor:
                funcaoDocumentoBruta ||
                funcaoAsoNormalizada,

            matrizesFuncao,
        });

    const reconhecimentoCadastro =
        resolverFuncaoCanonicaAso({
            valor:
                funcaoCadastroBruta,

            matrizesFuncao,
        });

    const documentoReconhecido =
        Boolean(
            reconhecimentoDocumento.localizada &&
            !reconhecimentoDocumento.ambigua
        );

    const cadastroReconhecido =
        Boolean(
            reconhecimentoCadastro.localizada &&
            !reconhecimentoCadastro.ambigua
        );

    const equivalenteTextual =
        Boolean(
            funcaoSistemaNormalizada &&
            funcaoAsoNormalizada ===
                funcaoSistemaNormalizada
        );

    const resultadoBase = {
        aplicavel,

        /*
         * OCR bruto é evidência documental.
         * Mantê-lo para auditoria, nunca como
         * valor automaticamente persistível.
         */
        funcaoDocumento:
            funcaoDocumentoBruta,

        funcaoDocumentoOriginal:
            funcaoDocumentoBruta,

        funcaoDocumentoNormalizada:
            funcaoAsoNormalizada,

        funcaoDocumentoCanonica:
            documentoReconhecido
                ? reconhecimentoDocumento.funcaoCanonica
                : "",

        funcaoDocumentoChaveCanonica:
            documentoReconhecido
                ? reconhecimentoDocumento.chaveCanonica
                : "",

        funcaoDocumentoReconhecida:
            documentoReconhecido,

        funcaoDocumentoAmbigua:
            Boolean(
                reconhecimentoDocumento.ambigua
            ),

        reconhecimentoCanonico:
            documentoReconhecido
                ? reconhecimentoDocumento.tipoCorrespondencia
                : "",

        termoCanonicoCorrespondente:
            documentoReconhecido
                ? reconhecimentoDocumento.termoCorrespondente
                : "",

        funcaoCadastro:
            funcaoCadastroBruta,

        funcaoCadastroNormalizada:
            funcaoSistemaNormalizada,

        funcaoCadastroCanonica:
            cadastroReconhecido
                ? reconhecimentoCadastro.funcaoCanonica
                : "",

        funcaoCadastroChaveCanonica:
            cadastroReconhecido
                ? reconhecimentoCadastro.chaveCanonica
                : "",

        confianca:
            funcaoDocumentoConfianca ||
            "",

        origem:
            funcaoDocumentoOrigem ||
            "",

        equivalente: false,
        divergencia: false,
        requerConfirmacao: false,

        requerRevisaoManual:
            false,

        bloqueiaAtualizacao:
            false,
    };

    if (!aplicavel) {
        return {
            ...resultadoBase,
            status:
                "nao_aplicavel",
        };
    }

    if (!funcaoAsoNormalizada) {
        return {
            ...resultadoBase,
            status:
                "funcao_aso_nao_localizada",
        };
    }

    /*
     * Mesmo sem catálogo, igualdade textual exata
     * continua sendo uma equivalência segura.
     */
    if (equivalenteTextual) {
        return {
            ...resultadoBase,
            status:
                "equivalente",
            equivalente: true,
        };
    }

    /*
     * OCR que não corresponde inequivocamente a uma
     * função conhecida não pode alterar o cadastro.
     */
    if (!documentoReconhecido) {
        return {
            ...resultadoBase,

            status:
                reconhecimentoDocumento.ambigua
                    ? "funcao_aso_ambigua"
                    : "funcao_aso_revisao_manual",

            requerRevisaoManual:
                true,

            bloqueiaAtualizacao:
                true,
        };
    }

    /*
     * Colaborador ainda sem função:
     * pode haver atualização, mas somente porque a
     * função do documento foi reconhecida no catálogo.
     */
    if (!funcaoSistemaNormalizada) {
        return {
            ...resultadoBase,

            status:
                "cadastro_sem_funcao",

            divergencia:
                true,

            requerConfirmacao:
                true,
        };
    }

    const equivalenteCanonico =
        Boolean(
            cadastroReconhecido &&
            reconhecimentoDocumento.chaveCanonica ===
                reconhecimentoCadastro.chaveCanonica
        );

    if (equivalenteCanonico) {
        return {
            ...resultadoBase,

            status:
                "equivalente",

            equivalente:
                true,
        };
    }

    return {
        ...resultadoBase,

        status:
            "divergente",

        divergencia:
            true,

        requerConfirmacao:
            true,
    };
}
