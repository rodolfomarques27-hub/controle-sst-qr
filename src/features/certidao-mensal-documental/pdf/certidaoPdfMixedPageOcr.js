import {
    carregarPdfJsDocumental,
} from "../../../services/documentosOcrPdfJsService.js";

import {
    reconhecerTextoCanvasComOcrComOrientacao,
} from "../../../services/documentosOcrVisualService.js";

const MAXIMO_PAGINAS_PDF_REPARO =
    20;

const MAXIMO_PAGINAS_OCR_REPARO =
    4;

function textoSeguro(
    valor
) {
    return String(
        valor ??
        ""
    ).trim();
}

function obterPaginasPresentesNoTexto(
    texto
) {
    const paginas =
        new Set();

    const conteudo =
        textoSeguro(
            texto
        );

    if (!conteudo) {
        return paginas;
    }

    const padrao =
        /P[aá]gina\s+(\d+)\s*:/gi;

    for (
        const correspondencia of
        conteudo.matchAll(
            padrao
        )
    ) {
        const numero =
            Number(
                correspondencia?.[1] ||
                0
            );

        if (
            Number.isInteger(numero) &&
            numero > 0
        ) {
            paginas.add(
                numero
            );
        }
    }

    return paginas;
}

function identificarPaginasSemTexto({
    texto,
    paginasLidas,
    totalPaginas,
}) {
    const total =
        Number(
            totalPaginas ||
            0
        );

    const lidas =
        Number(
            paginasLidas ||
            0
        );

    if (
        !Number.isInteger(total) ||
        total < 2 ||
        total > MAXIMO_PAGINAS_PDF_REPARO ||
        lidas !== total
    ) {
        return [];
    }

    const presentes =
        obterPaginasPresentesNoTexto(
            texto
        );

    if (
        presentes.size ===
        0
    ) {
        return [];
    }

    const ausentes =
        [];

    for (
        let pagina = 1;
        pagina <= total;
        pagina += 1
    ) {
        if (
            !presentes.has(
                pagina
            )
        ) {
            ausentes.push(
                pagina
            );
        }
    }

    if (
        ausentes.length === 0 ||
        ausentes.length >
            MAXIMO_PAGINAS_OCR_REPARO
    ) {
        return [];
    }

    return ausentes;
}

async function executarOcrPagina({
    pdf,
    numeroPagina,
}) {
    if (
        typeof document ===
        "undefined"
    ) {
        return {
            texto:
                "",
            confianca:
                0,
        };
    }

    const pagina =
        await pdf.getPage(
            numeroPagina
        );

    const viewportBase =
        pagina.getViewport({
            scale:
                1,
        });

    const escalaBase =
        2.0;

    const escalaLargura =
        viewportBase.width
            ? 1900 /
                viewportBase.width
            : escalaBase;

    const escalaAltura =
        viewportBase.height
            ? 2700 /
                viewportBase.height
            : escalaBase;

    const escala =
        Math.max(
            1.6,
            Math.min(
                escalaBase,
                escalaLargura,
                escalaAltura
            )
        );

    const viewport =
        pagina.getViewport({
            scale:
                escala,
        });

    const canvas =
        document.createElement(
            "canvas"
        );

    const contexto =
        canvas.getContext(
            "2d",
            {
                willReadFrequently:
                    true,
                alpha:
                    false,
            }
        );

    if (!contexto) {
        return {
            texto:
                "",
            confianca:
                0,
        };
    }

    canvas.width =
        Math.max(
            1,
            Math.ceil(
                viewport.width
            )
        );

    canvas.height =
        Math.max(
            1,
            Math.ceil(
                viewport.height
            )
        );

    contexto.fillStyle =
        "#ffffff";

    contexto.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    await pagina.render({
        canvasContext:
            contexto,
        viewport,
    }).promise;

    await new Promise(
        (resolve) =>
            setTimeout(
                resolve,
                0
            )
    );

    const resultado =
        await reconhecerTextoCanvasComOcrComOrientacao(
            canvas
        );

    const texto =
        textoSeguro(
            resultado?.texto
        )
            .replace(
                /\s+/g,
                " "
            )
            .trim();

    const confianca =
        Number(
            resultado?.confianca ||
            0
        );

    try {
        if (
            resultado?.canvasAnalise &&
            resultado.canvasAnalise !==
                canvas
        ) {
            resultado.canvasAnalise.width =
                1;

            resultado.canvasAnalise.height =
                1;
        }

        canvas.width =
            1;

        canvas.height =
            1;
    }
    catch {
        // Liberação de memória sem bloquear o fluxo.
    }

    return {
        texto,
        confianca,
    };
}

// ============================================================
// ============================================================
// SAFE_SCAN_OCR_ADAPTATIVO_EVIDENCIA_CERT2_V1
//
// OCR complementar direcionado quando a resolução documental
// detecta ausência de evidência crítica.
//
// Regras:
// - exclusivo do CERT2;
// - não altera OCR compartilhado;
// - não altera o PDF;
// - não usa nome/pasta como evidência;
// - no máximo 6 páginas em PDF curto;
// - em PDF maior, somente 1, 2, penúltima e última;
// - o texto OCR é apenas candidato: a camada de resolução decide
//   posteriormente se houve melhora documental real.
// ============================================================

const MAXIMO_PAGINAS_CURTAS_OCR_ADAPTATIVO_CERT2 =
    6;

const MAXIMO_TOTAL_PAGINAS_OCR_ADAPTATIVO_CERT2 =
    160;

function selecionarPaginasOcrAdaptativoCert2(
    totalPaginas
) {
    const total =
        Number(
            totalPaginas ||
            0
        );

    if (
        !Number.isInteger(total) ||
        total <= 0
    ) {
        return [];
    }

    if (
        total <=
        MAXIMO_PAGINAS_CURTAS_OCR_ADAPTATIVO_CERT2
    ) {
        return Array.from(
            {
                length:
                    total,
            },
            (
                _,
                indice
            ) =>
                indice + 1
        );
    }

    return Array.from(
        new Set([
            1,
            2,
            total - 1,
            total,
        ])
    )
        .filter(
            (pagina) =>
                Number.isInteger(
                    pagina
                ) &&
                pagina >= 1 &&
                pagina <= total
        );
}

// ============================================================
// SAFE_SCAN_PDFJS_COMPETENCIA_ADAPTATIVA_CERT2_F10D_R2
//
// Executado somente para déficit explícito de competência.
// PDF.js precede OCR visual.
// Filename, pasta e competência esperada não são evidência.
// ============================================================

const PADROES_COMPETENCIA_FORTE_PDFJS_CERT2 =
    Object.freeze([
        {
            codigo:
                "PERIODO_DE_APURACAO",

            regex:
                /PERIODO\s+DE\s+APURACAO\s*[:\-]?\s*(0?[1-9]|1[0-2])\s*[/.:-]\s*(20\d{2})/,
        },
        {
            codigo:
                "PERIODO_APURACAO",

            regex:
                /PERIODO\s+APURACAO\s*[:\-]?\s*(0?[1-9]|1[0-2])\s*[/.:-]\s*(20\d{2})/,
        },
        {
            codigo:
                "COMPETENCIA",

            regex:
                /COMPETENCIA\s*[:\-]?\s*(0?[1-9]|1[0-2])\s*[/.:-]\s*(20\d{2})/,
        },
        {
            codigo:
                "MES_DE_REFERENCIA",

            regex:
                /MES\s+DE\s+REFERENCIA\s*[:\-]?\s*(0?[1-9]|1[0-2])\s*[/.:-]\s*(20\d{2})/,
        },
        {
            codigo:
                "REFERENCIA",

            regex:
                /REFERENCIA\s*[:\-]?\s*(0?[1-9]|1[0-2])\s*[/.:-]\s*(20\d{2})/,
        },
        {
            codigo:
                "PA",

            regex:
                /\bPA\s*[:\-]?\s*(0?[1-9]|1[0-2])\s*[/.:-]\s*(20\d{2})/,
        },
    ]);

function normalizarBuscaCompetenciaPdfJsCert2(
    valor
) {
    return textoSeguro(
        valor
    )
        .normalize(
            "NFD"
        )
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .toUpperCase()
        .replace(
            /\s+/g,
            " "
        )
        .trim();
}

function formatarCompetenciaPdfJsCert2(
    mes,
    ano
) {
    const numeroMes =
        Number(mes);

    const numeroAno =
        Number(ano);

    if (
        !Number.isInteger(numeroMes) ||
        numeroMes < 1 ||
        numeroMes > 12 ||
        !Number.isInteger(numeroAno) ||
        numeroAno < 2000 ||
        numeroAno > 2100
    ) {
        return "";
    }

    return (
        String(numeroMes)
            .padStart(
                2,
                "0"
            ) +
        "/" +
        String(numeroAno)
    );
}

function resolucaoExigeCompetenciaPdfJsCert2(
    resolucao
) {
    const motivos =
        Array.isArray(
            resolucao?.motivos
        )
            ? resolucao.motivos
            : [];

    const codigos =
        new Set(
            motivos.map(
                (motivo) =>
                    textoSeguro(
                        motivo?.codigo
                    )
                        .toUpperCase()
                        .trim()
            )
        );

    return Boolean(
        codigos.has(
            "COMPETENCIA_DOCUMENTAL_NAO_IDENTIFICADA"
        ) ||
        codigos.has(
            "COMPETENCIA_NAO_IDENTIFICADA"
        )
    );
}

async function lerTextoPaginaCompetenciaPdfJsCert2(
    pdf,
    numeroPagina
) {
    try {
        const pagina =
            await pdf.getPage(
                numeroPagina
            );

        const conteudo =
            await pagina.getTextContent({
                includeMarkedContent:
                    false,

                disableNormalization:
                    false,
            });

        return textoSeguro(
            (
                conteudo?.items ||
                []
            )
                .map(
                    (item) =>
                        textoSeguro(
                            item?.str
                        )
                )
                .filter(Boolean)
                .join(" ")
        )
            .replace(
                /\s+/g,
                " "
            )
            .trim();
    }
    catch {
        return "";
    }
}

async function localizarCompetenciaFortePdfJsCert2({
    pdf,
    totalPaginas,
}) {
    const total =
        Math.min(
            Number(
                totalPaginas ||
                0
            ),
            MAXIMO_TOTAL_PAGINAS_OCR_ADAPTATIVO_CERT2
        );

    if (
        !Number.isInteger(total) ||
        total <= 0
    ) {
        return {
            encontrada:
                false,
        };
    }

    const registros =
        [];

    for (
        let numeroPagina = 1;
        numeroPagina <= total;
        numeroPagina += 1
    ) {
        const texto =
            await lerTextoPaginaCompetenciaPdfJsCert2(
                pdf,
                numeroPagina
            );

        if (!texto) {
            continue;
        }

        registros.push({
            numeroPagina,

            texto,

            normalizado:
                normalizarBuscaCompetenciaPdfJsCert2(
                    texto
                ),
        });
    }

    for (
        const padrao of
        PADROES_COMPETENCIA_FORTE_PDFJS_CERT2
    ) {
        for (
            const registro of
            registros
        ) {
            const match =
                registro
                    .normalizado
                    .match(
                        padrao.regex
                    );

            if (!match) {
                continue;
            }

            const competencia =
                formatarCompetenciaPdfJsCert2(
                    match[1],
                    match[2]
                );

            if (!competencia) {
                continue;
            }

            return {
                encontrada:
                    true,

                competencia,

                pagina:
                    registro.numeroPagina,

                marcador:
                    padrao.codigo,

                textoPagina:
                    registro.texto,
            };
        }
    }

    return {
        encontrada:
            false,
    };
}

export async function enriquecerTextoCertidaoPorOcrAdaptativo({
    arquivo,
    textoExtraido = "",
    resolucao = null,
} = {}) {
    const textoBase =
        textoSeguro(
            textoExtraido
        );

    const base = {
        aplicada:
            false,

        texto:
            textoBase,

        textoOcr:
            "",

        paginasOcr:
            [],

        totalPaginas:
            0,

        confiancaOcr:
            null,

        avisos:
            [],
    };

    if (
        !arquivo ||
        typeof arquivo.arrayBuffer !==
            "function"
    ) {
        return base;
    }

    const ocrVisualDisponivel =
        typeof document !==
        "undefined";

    let tarefaPdf =
        null;

    try {
        const pdfjsLib =
            await carregarPdfJsDocumental();

        const buffer =
            await arquivo.arrayBuffer();

        tarefaPdf =
            pdfjsLib.getDocument({
                data:
                    new Uint8Array(
                        buffer.slice(0)
                    ),

                disableFontFace:
                    true,

                useSystemFonts:
                    true,

                verbosity:
                    0,
            });

        const pdf =
            await tarefaPdf.promise;

        const totalPaginas =
            Number(
                pdf?.numPages ||
                0
            );

        if (!totalPaginas) {
            return {
                ...base,

                avisos: [
                    "OCR adaptativo CERT2 não encontrou páginas no PDF.",
                ],
            };
        }

        if (
            totalPaginas >
            MAXIMO_TOTAL_PAGINAS_OCR_ADAPTATIVO_CERT2
        ) {
            return {
                ...base,

                totalPaginas,

                avisos: [
                    "OCR adaptativo CERT2 bloqueado por limite de páginas para preservar performance.",
                ],
            };
        }

        if (
            resolucaoExigeCompetenciaPdfJsCert2(
                resolucao
            )
        ) {
            const evidenciaCompetencia =
                await localizarCompetenciaFortePdfJsCert2({
                    pdf,
                    totalPaginas,
                });

            if (
                evidenciaCompetencia
                    ?.encontrada ===
                    true &&
                evidenciaCompetencia
                    ?.textoPagina
            ) {
                const textoPagina =
                    (
                        "Página " +
                        evidenciaCompetencia.pagina +
                        ": " +
                        evidenciaCompetencia.textoPagina
                    );

                const texto =
                    [
                        textoBase,
                        textoPagina,
                    ]
                        .filter(Boolean)
                        .join(" ")
                        .trim();

                return {
                    aplicada:
                        Boolean(
                            texto &&
                            texto !==
                                textoBase
                        ),

                    texto,

                    textoOcr:
                        "",

                    paginasOcr:
                        [],

                    totalPaginas,

                    confiancaOcr:
                        null,

                    fonteEnriquecimento:
                        "PDFJS_COMPETENCIA_FORTE",

                    competenciaPdfJs:
                        evidenciaCompetencia
                            .competencia,

                    paginasPdfJs: [
                        evidenciaCompetencia
                            .pagina,
                    ],

                    marcadorPdfJs:
                        evidenciaCompetencia
                            .marcador,

                    avisos: [
                        (
                            "PDF.js localizou evidência explícita de competência " +
                            evidenciaCompetencia.competencia +
                            " na página " +
                            evidenciaCompetencia.pagina +
                            "."
                        ),
                    ],
                };
            }
        }

        if (!ocrVisualDisponivel) {
            return {
                ...base,

                totalPaginas,

                avisos: [
                    "PDF.js não encontrou competência explícita e o OCR visual adaptativo exige navegador.",
                ],
            };
        }

        const paginasSelecionadas =
            selecionarPaginasOcrAdaptativoCert2(
                totalPaginas
            );

        const textos =
            [];

        const paginasOcr =
            [];

        const confiancas =
            [];

        for (
            const numeroPagina of
            paginasSelecionadas
        ) {
            const leituraPagina =
                await executarOcrPagina({
                    pdf,
                    numeroPagina,
                });

            const textoPagina =
                textoSeguro(
                    leituraPagina
                        ?.texto
                );

            if (!textoPagina) {
                continue;
            }

            textos.push(
                (
                    "Página " +
                    numeroPagina +
                    ": " +
                    textoPagina
                )
            );

            paginasOcr.push(
                numeroPagina
            );

            const confianca =
                Number(
                    leituraPagina
                        ?.confianca
                );

            if (
                Number.isFinite(
                    confianca
                ) &&
                confianca > 0
            ) {
                confiancas.push(
                    confianca
                );
            }
        }

        if (
            textos.length ===
            0
        ) {
            return {
                ...base,

                totalPaginas,

                avisos: [
                    "OCR adaptativo CERT2 executado, mas não encontrou texto utilizável nas páginas selecionadas.",
                ],
            };
        }

        const textoOcr =
            textos
                .join(" ")
                .trim();

        const texto =
            [
                textoBase,
                textoOcr,
            ]
                .filter(Boolean)
                .join(" ")
                .trim();

        const confiancaOcr =
            confiancas.length
                ? Math.round(
                    confiancas.reduce(
                        (
                            soma,
                            valor
                        ) =>
                            soma +
                            valor,
                        0
                    ) /
                    confiancas.length
                )
                : null;

        return {
            aplicada:
                Boolean(
                    textoOcr
                ),

            texto,

            textoOcr,

            paginasOcr,

            totalPaginas,

            confiancaOcr,

            avisos: [
                (
                    "OCR adaptativo CERT2 executado em página(s): " +
                    paginasOcr.join(", ") +
                    "."
                ),
                "O texto OCR foi tratado apenas como evidência candidata; a resolução documental continua sendo a autoridade final.",
            ],
        };
    }
    catch (error) {
        return {
            ...base,

            avisos: [
                (
                    "Falha no OCR adaptativo CERT2: " +
                    String(
                        error?.message ||
                        "erro desconhecido"
                    ) +
                    "."
                ),
            ],
        };
    }
    finally {
        if (
            tarefaPdf &&
            typeof tarefaPdf.destroy ===
                "function"
        ) {
            try {
                await tarefaPdf.destroy();
            }
            catch {
                // Liberação sem interferir na análise.
            }
        }
    }
}

// SAFE_SCAN_OCR_CAMADA_SUSPEITA_CERTIDAO_V1
//
// OCR corretivo exclusivo da Certidão Mensal.
// Não altera OCR compartilhado e não altera o PDF original.
// ============================================================

export async function repararCamadaTextualSuspeitaCertidao({
    arquivo,
} = {}) {
    const base = {
        aplicada: false,
        texto: "",
        paginasOcr: [],
        totalPaginas: 0,
        confiancaOcr: null,
        avisos: [],
    };

    if (
        !arquivo ||
        typeof arquivo.arrayBuffer !==
            "function"
    ) {
        return base;
    }

    if (
        typeof document ===
        "undefined"
    ) {
        return {
            ...base,
            avisos: [
                "O reparo OCR de camada textual suspeita exige execução no navegador.",
            ],
        };
    }

    let tarefaPdf =
        null;

    try {
        const pdfjsLib =
            await carregarPdfJsDocumental();

        const buffer =
            await arquivo.arrayBuffer();

        tarefaPdf =
            pdfjsLib.getDocument({
                data:
                    new Uint8Array(
                        buffer.slice(0)
                    ),
                disableFontFace:
                    true,
                useSystemFonts:
                    true,
                verbosity:
                    0,
            });

        const pdf =
            await tarefaPdf.promise;

        const totalPaginas =
            Number(
                pdf?.numPages ||
                0
            );

        if (!totalPaginas) {
            return {
                ...base,
                avisos: [
                    "O reparo OCR exclusivo da Certidão não encontrou páginas no PDF.",
                ],
            };
        }

        if (
            totalPaginas >
            2
        ) {
            return {
                ...base,
                totalPaginas,
                avisos: [
                    (
                        "A camada textual parece suspeita, mas a substituição integral por OCR " +
                        "foi bloqueada porque o PDF possui mais de 2 páginas."
                    ),
                    (
                        "O bloqueio evita substituir documento extenso por leitura OCR parcial."
                    ),
                ],
            };
        }

        const textos =
            [];

        const paginasOcr =
            [];

        const confiancas =
            [];

        for (
            let numeroPagina = 1;
            numeroPagina <= totalPaginas;
            numeroPagina += 1
        ) {
            const leituraPagina =
                await executarOcrPagina({
                    pdf,
                    numeroPagina,
                });

            if (
                !leituraPagina.texto
            ) {
                continue;
            }

            textos.push(
                (
                    "Página " +
                    numeroPagina +
                    ": " +
                    leituraPagina.texto
                )
            );

            paginasOcr.push(
                numeroPagina
            );

            if (
                Number.isFinite(
                    leituraPagina.confianca
                ) &&
                leituraPagina.confianca >
                    0
            ) {
                confiancas.push(
                    leituraPagina.confianca
                );
            }
        }

        if (
            textos.length !==
            totalPaginas
        ) {
            return {
                ...base,
                totalPaginas,
                paginasOcr,
                avisos: [
                    (
                        "O OCR exclusivo da Certidão não conseguiu obter texto utilizável " +
                        "em todas as páginas do PDF suspeito."
                    ),
                    (
                        "A camada textual original foi mantida para conferência humana."
                    ),
                ],
            };
        }

        const confiancaOcr =
            confiancas.length
                ? Math.round(
                    confiancas.reduce(
                        (
                            soma,
                            valor
                        ) =>
                            soma +
                            valor,
                        0
                    ) /
                    confiancas.length
                )
                : null;

        return {
            aplicada: true,

            texto:
                textos
                    .join(" ")
                    .trim(),

            paginasOcr,

            totalPaginas,

            confiancaOcr,

            avisos: [
                (
                    "OCR corretivo exclusivo da Certidão executado em " +
                    paginasOcr.length +
                    " página(s)."
                ),
                (
                    "O PDF original não foi alterado; somente a camada técnica de leitura " +
                    "foi substituída quando o OCR apresentou texto utilizável."
                ),
            ],
        };
    }
    catch (error) {
        return {
            ...base,
            avisos: [
                (
                    "Falha no reparo OCR exclusivo da Certidão: " +
                    String(
                        error?.message ||
                        "erro desconhecido"
                    ) +
                    "."
                ),
            ],
        };
    }
    finally {
        if (
            tarefaPdf &&
            typeof tarefaPdf.destroy ===
                "function"
        ) {
            try {
                await tarefaPdf.destroy();
            }
            catch {
                // Liberação sem interferir na leitura.
            }
        }
    }
}

// SAFE_SCAN_CERT2_M4_F8_F_TRANSICAO_TEXTUAL_NATIVA_PDF_LONGO_V1
//
// Recuperação CERT2-only de transição textual nativa em PDF longo.
//
// Alguns PDFs longos possuem páginas iniciais sem camada textual,
// seguidas por um bloco intermediário com texto documental nativo,
// enquanto o leitor compartilhado pode chegar primeiro às páginas
// finais e interromper a busca ao localizar uma data documental.
//
// Esta recuperação:
// - não executa OCR;
// - não usa nome/caminho do arquivo;
// - preserva integralmente o texto já extraído;
// - só atua em PDF longo parcialmente lido;
// - procura o bloco textual nativo imediatamente anterior à
//   primeira página já presente no corpus;
// - limita a janela e a quantidade de caracteres por performance.
const MAXIMO_PAGINAS_BUSCA_TRANSICAO_NATIVA_CERT2 =
    160;

const MAXIMO_PAGINAS_JANELA_TRANSICAO_NATIVA_CERT2 =
    10;

const LIMITE_CARACTERES_TRANSICAO_NATIVA_CERT2 =
    12000;

async function lerTextoNativoPaginaCertidao(
    pdf,
    numeroPagina
) {
    const pagina =
        await pdf.getPage(
            numeroPagina
        );

    const conteudo =
        await pagina
            .getTextContent();

    return conteudo.items
        .map(
            (item) =>
                String(
                    item?.str ||
                    ""
                )
        )
        .filter(Boolean)
        .join(" ")
        .replace(
            /\s+/g,
            " "
        )
        .trim();
}

async function recuperarTransicaoTextualNativaPdfLongoCertidao({
    arquivo,
    textoExtraido = "",
    paginasLidas = 0,
    totalPaginas = 0,
} = {}) {
    const textoBase =
        textoSeguro(
            textoExtraido
        );

    const total =
        Number(
            totalPaginas ||
            0
        );

    const lidas =
        Number(
            paginasLidas ||
            0
        );

    const base = {
        aplicada:
            false,

        texto:
            textoBase,

        paginasNativas:
            [],

        totalPaginas:
            total,

        avisos:
            [],
    };

    if (
        !arquivo ||
        typeof arquivo.arrayBuffer !==
            "function" ||
        !textoBase ||
        !Number.isInteger(
            total
        ) ||
        total <=
            MAXIMO_PAGINAS_PDF_REPARO ||
        !Number.isFinite(
            lidas
        ) ||
        lidas >= total
    ) {
        return base;
    }

    const paginasPresentes =
        Array.from(
            obterPaginasPresentesNoTexto(
                textoBase
            )
        )
            .map(
                (pagina) =>
                    Number(
                        pagina
                    )
            )
            .filter(
                (pagina) =>
                    Number.isInteger(
                        pagina
                    ) &&
                    pagina >= 1 &&
                    pagina <= total
            )
            .sort(
                (
                    a,
                    b
                ) =>
                    a - b
            );

    if (
        paginasPresentes.length ===
            0
    ) {
        return base;
    }

    const primeiraPaginaPresente =
        paginasPresentes[0];

    if (
        primeiraPaginaPresente <=
            1
    ) {
        return base;
    }

    const limiteInferior =
        Math.max(
            1,
            primeiraPaginaPresente -
                MAXIMO_PAGINAS_BUSCA_TRANSICAO_NATIVA_CERT2
        );

    let tarefaPdf =
        null;

    try {
        const pdfjsLib =
            await carregarPdfJsDocumental();

        const buffer =
            await arquivo.arrayBuffer();

        tarefaPdf =
            pdfjsLib.getDocument({
                data:
                    new Uint8Array(
                        buffer.slice(
                            0
                        )
                    ),

                disableFontFace:
                    true,

                useSystemFonts:
                    true,

                verbosity:
                    0,
            });

        const pdf =
            await tarefaPdf.promise;

        const totalReal =
            Number(
                pdf?.numPages ||
                0
            );

        if (
            !totalReal ||
            totalReal !==
                total
        ) {
            return base;
        }

        const cache =
            new Map();

        let encontrouBloco =
            false;

        let inicioBloco =
            0;

        let fimBloco =
            0;

        for (
            let numeroPagina =
                primeiraPaginaPresente -
                1;
            numeroPagina >=
                limiteInferior;
            numeroPagina -= 1
        ) {
            const textoPagina =
                await lerTextoNativoPaginaCertidao(
                    pdf,
                    numeroPagina
                );

            cache.set(
                numeroPagina,
                textoPagina
            );

            if (
                !encontrouBloco
            ) {
                if (
                    !textoPagina
                ) {
                    continue;
                }

                encontrouBloco =
                    true;

                inicioBloco =
                    numeroPagina;

                fimBloco =
                    numeroPagina;

                continue;
            }

            if (
                !textoPagina
            ) {
                break;
            }

            inicioBloco =
                numeroPagina;
        }

        if (
            !encontrouBloco ||
            !inicioBloco ||
            !fimBloco
        ) {
            return base;
        }

        const fimJanela =
            Math.min(
                fimBloco,
                inicioBloco +
                    MAXIMO_PAGINAS_JANELA_TRANSICAO_NATIVA_CERT2 -
                    1
            );

        const complementos =
            [];

        const paginasNativas =
            [];

        let caracteres =
            0;

        for (
            let numeroPagina =
                inicioBloco;
            numeroPagina <=
                fimJanela;
            numeroPagina += 1
        ) {
            let textoPagina =
                cache.get(
                    numeroPagina
                );

            if (
                textoPagina ===
                undefined
            ) {
                textoPagina =
                    await lerTextoNativoPaginaCertidao(
                        pdf,
                        numeroPagina
                    );
            }

            if (
                !textoPagina
            ) {
                continue;
            }

            const blocoCompleto =
                (
                    "Página " +
                    numeroPagina +
                    ": " +
                    textoPagina
                );

            const restante =
                LIMITE_CARACTERES_TRANSICAO_NATIVA_CERT2 -
                caracteres;

            if (
                restante <= 0
            ) {
                break;
            }

            const bloco =
                blocoCompleto.length >
                restante
                    ? blocoCompleto.slice(
                        0,
                        restante
                    )
                    : blocoCompleto;

            if (
                !bloco
            ) {
                break;
            }

            complementos.push(
                bloco
            );

            paginasNativas.push(
                numeroPagina
            );

            caracteres +=
                bloco.length;
        }

        if (
            complementos.length ===
                0
        ) {
            return base;
        }

        return {
            aplicada:
                true,

            texto: [
                textoBase,
                ...complementos,
            ]
                .filter(Boolean)
                .join(" ")
                .trim(),

            paginasNativas,

            totalPaginas:
                total,

            avisos: [
                "PDF longo parcialmente textual: o CERT2 recuperou a região textual nativa imediatamente anterior ao corpus inicialmente selecionado.",
                (
                    "Páginas nativas complementares: " +
                    paginasNativas.join(
                        ", "
                    ) +
                    "."
                ),
                "Nenhum OCR foi executado nesta recuperação; a camada textual original foi preservada.",
            ],
        };
    }
    catch (error) {
        return {
            ...base,

            avisos: [
                (
                    "Falha na recuperação da transição textual nativa do PDF longo: " +
                    String(
                        error?.message ||
                        "erro desconhecido"
                    ) +
                    "."
                ),
            ],
        };
    }
    finally {
        if (
            tarefaPdf &&
            typeof tarefaPdf.destroy ===
                "function"
        ) {
            try {
                await tarefaPdf.destroy();
            }
            catch {
                // Liberação sem interferir na leitura.
            }
        }
    }
}

export async function complementarPdfMistoCertidao({
    arquivo,
    textoExtraido = "",
    paginasLidas = 0,
    totalPaginas = 0,
    tipoLeitura = "",
} = {}) {
    const base = {
        aplicada:
            false,
        texto:
            textoSeguro(
                textoExtraido
            ),
        paginasOcr:
            [],
        confiancaOcr:
            null,
        avisos:
            [],
    };

    if (
        !arquivo ||
        typeof arquivo.arrayBuffer !==
            "function" ||
        String(
            tipoLeitura ||
            ""
        )
            .trim()
            .toLowerCase() !==
            "pdf_texto_local"
    ) {
        return base;
    }

    const transicaoNativa =
        await recuperarTransicaoTextualNativaPdfLongoCertidao({
            arquivo,

            textoExtraido,

            paginasLidas,

            totalPaginas,
        });

    if (
        transicaoNativa
            ?.aplicada ===
        true
    ) {
        return {
            ...base,

            /*
             * Esta recuperação usa somente a camada textual nativa.
             * aplicada continua false para não rotular o método
             * como pdf_ocr_misto_local.
             */
            aplicada:
                false,

            complementoNativo:
                true,

            texto:
                textoSeguro(
                    transicaoNativa
                        .texto
                ),

            paginasNativas:
                Array.isArray(
                    transicaoNativa
                        ?.paginasNativas
                )
                    ? [
                        ...transicaoNativa
                            .paginasNativas,
                    ]
                    : [],

            avisos:
                Array.isArray(
                    transicaoNativa
                        ?.avisos
                )
                    ? [
                        ...transicaoNativa
                            .avisos,
                    ]
                    : [],
        };
    }

    const paginasSemTexto =
        identificarPaginasSemTexto({
            texto:
                textoExtraido,
            paginasLidas,
            totalPaginas,
        });

    if (
        paginasSemTexto.length ===
        0
    ) {
        return base;
    }

    if (
        typeof document ===
        "undefined"
    ) {
        return {
            ...base,
            avisos: [
                "PDF misto detectado, mas o OCR complementar exige execução no navegador.",
            ],
        };
    }

    let tarefaPdf =
        null;

    try {
        const pdfjsLib =
            await carregarPdfJsDocumental();

        const buffer =
            await arquivo.arrayBuffer();

        tarefaPdf =
            pdfjsLib.getDocument({
                data:
                    new Uint8Array(
                        buffer.slice(
                            0
                        )
                    ),
                disableFontFace:
                    true,
                useSystemFonts:
                    true,
                verbosity:
                    0,
            });

        const pdf =
            await tarefaPdf.promise;

        const complementos =
            [];

        const paginasOcr =
            [];

        const confiancas =
            [];

        for (
            const numeroPagina of
            paginasSemTexto
        ) {
            const leituraPagina =
                await executarOcrPagina({
                    pdf,
                    numeroPagina,
                });

            if (
                !leituraPagina.texto
            ) {
                continue;
            }

            complementos.push(
                (
                    `Página ${numeroPagina}: ` +
                    leituraPagina.texto
                )
            );

            paginasOcr.push(
                numeroPagina
            );

            if (
                Number.isFinite(
                    leituraPagina.confianca
                ) &&
                leituraPagina.confianca >
                    0
            ) {
                confiancas.push(
                    leituraPagina.confianca
                );
            }
        }

        if (
            complementos.length ===
            0
        ) {
            return {
                ...base,
                avisos: [
                    "Página sem camada textual detectada, porém o OCR complementar não encontrou texto utilizável.",
                ],
            };
        }

        const confiancaOcr =
            confiancas.length
                ? Math.round(
                    confiancas.reduce(
                        (
                            soma,
                            valor
                        ) =>
                            soma +
                            valor,
                        0
                    ) /
                    confiancas.length
                )
                : null;

        return {
            aplicada:
                true,
            texto:
                [
                    textoSeguro(
                        textoExtraido
                    ),
                    ...complementos,
                ]
                    .filter(Boolean)
                    .join(" ")
                    .trim(),
            paginasOcr,
            confiancaOcr,
            avisos: [
                (
                    "PDF misto detectado. OCR complementar executado somente na(s) página(s) sem camada textual: " +
                    paginasOcr.join(", ") +
                    "."
                ),
                "A camada textual original foi preservada.",
                "O OCR complementar pertence exclusivamente ao módulo Certidões Mensais.",
            ],
        };
    }
    catch (error) {
        return {
            ...base,
            avisos: [
                (
                    "Falha no OCR complementar exclusivo da Certidão: " +
                    String(
                        error?.message ||
                        "erro desconhecido"
                    ) +
                    "."
                ),
            ],
        };
    }
    finally {
        if (
            tarefaPdf &&
            typeof tarefaPdf.destroy ===
                "function"
        ) {
            try {
                await tarefaPdf.destroy();
            }
            catch {
                // Liberação sem interferir no diagnóstico.
            }
        }
    }
}