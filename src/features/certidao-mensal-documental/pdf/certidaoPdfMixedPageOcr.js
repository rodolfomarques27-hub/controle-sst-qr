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