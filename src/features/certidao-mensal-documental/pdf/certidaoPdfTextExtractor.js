import {
    validarArquivoCertidaoPdf,
} from "./certidaoPdfFileValidator";
import {
    decodificarCamadaTextualGfd,
} from "./certidaoPdfGfdTextDecoder.js";
import {
    carregarPdfJsDocumental,
} from "../../../services/documentosOcrPdfJsService.js";
import {
    complementarPdfMistoCertidao,
} from "./certidaoPdfMixedPageOcr.js";

async function extrairTextoEstruturalGfdPdfJs(
    arquivo
) {
    if (
        !arquivo ||
        typeof arquivo.arrayBuffer !==
            "function"
    ) {
        return {
            texto: "",
            paginasLidas: 0,
            totalPaginas: 0,
            avisos: [],
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
                pdf?.numPages || 0
            );

        if (!totalPaginas) {
            return {
                texto: "",
                paginasLidas: 0,
                totalPaginas: 0,
                avisos: [],
            };
        }

        const paginas =
            [];

        for (
            let numeroPagina = 1;
            numeroPagina <= totalPaginas;
            numeroPagina += 1
        ) {
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

            const textoPagina =
                (
                    Array.isArray(
                        conteudo?.items
                    )
                        ? conteudo.items
                        : []
                )
                    .map(
                        (item) =>
                            String(
                                item?.str || ""
                            )
                    )
                    .filter(Boolean)
                    .join(" ");

            paginas.push(
                (
                    `Página ${numeroPagina}: ` +
                    textoPagina
                )
            );
        }

        return {
            texto:
                paginas.join(" "),
            paginasLidas:
                paginas.length,
            totalPaginas,
            avisos: [
                (
                    "A estrutura textual bruta do PDF.js " +
                    "foi preservada temporariamente para " +
                    "decodificação local da GFD."
                ),
                (
                    "O conteúdo estrutural bruto não foi " +
                    "salvo, enviado ou persistido."
                ),
            ],
        };
    }
    catch (error) {
        return {
            texto: "",
            paginasLidas: 0,
            totalPaginas: 0,
            avisos: [
                (
                    "A leitura estrutural complementar da " +
                    "GFD não pôde ser concluída: " +
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

function normalizarAvisos(avisos = []) {
    return [
        ...new Set(
            (
                Array.isArray(avisos)
                    ? avisos
                    : []
            )
                .map((aviso) =>
                    String(aviso || "").trim()
                )
                .filter(Boolean)
        ),
    ];
}

function classificarMetodoLeitura(
    tipoLeitura = ""
) {
    switch (
        String(tipoLeitura || "")
            .trim()
            .toLowerCase()
    ) {
        case "pdf_texto_local":
            return "camada_textual_pdf";

        case "ocr_imagem_local":
            return "ocr_local_tesseract";

        case "pdf_sem_texto_legivel":
            return "pdf_sem_texto_confiavel";

        case "nome_arquivo":
            return "somente_nome_arquivo";

        default:
            return "leitura_local_indeterminada";
    }
}

export async function extrairTextoCertidaoPdfLocal(
    arquivo,
    {
        validacaoArquivo = null,
    } = {}
) {
    const validacao =
        validacaoArquivo?.valido
            ? validacaoArquivo
            : await validarArquivoCertidaoPdf(
                arquivo
            );

    const {
        executarLeituraDocumentalLocal,
    } = await import(
        "../../../services/documentosOcrService"
    );

    if (
        typeof executarLeituraDocumentalLocal !==
        "function"
    ) {
        throw new Error(
            "O leitor documental local não está disponível."
        );
    }

    const leitura =
        await executarLeituraDocumentalLocal({
            arquivo,
            arquivoNome:
                validacao.nomeOriginal,
            mimeType:
                validacao.mimeType,
            usarOcrQuandoTextoPdfSuspeito:
                true,
        });

    const textoExtraidoOriginal =
        String(
            leitura?.textoExtraido || ""
        ).trim();

    const complementoPdfMisto =
        await complementarPdfMistoCertidao({
            arquivo,
            textoExtraido:
                textoExtraidoOriginal,
            paginasLidas:
                Number(leitura?.paginasLidas || 0),
            totalPaginas:
                Number(leitura?.totalPaginas || 0),
            tipoLeitura:
                leitura?.tipoLeitura || "",
        });

    const textoExtraidoComComplemento =
        String(
            complementoPdfMisto?.texto ||
            textoExtraidoOriginal
        ).trim();

    const decodificacaoGfdInicial =
        decodificarCamadaTextualGfd(
            textoExtraidoComComplemento
        );

    let decodificacaoGfd =
        decodificacaoGfdInicial;

    let leituraEstruturalGfd =
        null;

    if (
        decodificacaoGfdInicial
            ?.aplicada
    ) {
        leituraEstruturalGfd =
            await extrairTextoEstruturalGfdPdfJs(
                arquivo
            );

        const textoEstrutural =
            String(
                leituraEstruturalGfd
                    ?.texto || ""
            ).trim();

        if (textoEstrutural) {
            const decodificacaoEstrutural =
                decodificarCamadaTextualGfd(
                    textoEstrutural
                );

            if (
                decodificacaoEstrutural
                    ?.aplicada
            ) {
                decodificacaoGfd =
                    decodificacaoEstrutural;
            }
        }
    }

    const textoExtraido =
        String(
            decodificacaoGfd?.texto ||
            textoExtraidoComComplemento
        ).trim();

    const tipoLeitura =
        String(
            leitura?.tipoLeitura || ""
        ).trim();

    const erro =
        String(
            leitura?.erro || ""
        ).trim();

    const avisos =
        normalizarAvisos([
            ...(validacao.avisos || []),
            ...(leitura?.avisos || []),
            ...(leituraEstruturalGfd
                ?.avisos || []),
            ...(complementoPdfMisto
                ?.avisos || []),
            ...(decodificacaoGfd
                ?.avisos || []),
        ]);

    return {
        sucesso:
            Boolean(
                leitura?.executado &&
                !erro
            ),
        executado:
            Boolean(leitura?.executado),
        tipoLeitura,
        metodo:
            complementoPdfMisto?.aplicada
                ? "pdf_ocr_misto_local"
                : classificarMetodoLeitura(
                    tipoLeitura
                ),
        arquivoNome:
            validacao.nomeOriginal,
        mimeType:
            validacao.mimeType,
        extensao:
            validacao.extensao,
        textoExtraido,
        textoPrevia:
            decodificacaoGfd?.aplicada
                ? textoExtraido
                : String(
                    leitura?.textoPrevia ||
                    textoExtraido ||
                    ""
                ).trim(),
        resumo:
            String(
                leitura?.resumo || ""
            ).trim(),
        resumoTextual:
            String(
                leitura?.resumoTextual || ""
            ).trim(),
        camposExtraidos:
            Array.isArray(
                leitura?.camposExtraidos
            )
                ? leitura.camposExtraidos
                : [],
        datasEncontradas:
            Array.isArray(
                leitura?.datasEncontradas
            )
                ? leitura.datasEncontradas
                : [],
        datasRelevantesClassificadas:
            Array.isArray(
                leitura
                    ?.datasRelevantesClassificadas
            )
                ? leitura
                    .datasRelevantesClassificadas
                : [],
        paginasLidas:
            Number(
                leitura?.paginasLidas || 0
            ),
        totalPaginas:
            Number(
                leitura?.totalPaginas || 0
            ),
        confianca:
            Number(
                leitura?.confianca || 0
            ),
        textoLimitado:
            Boolean(
                leitura?.textoLimitado
            ),
        comparacaoDatasPermitida:
            Boolean(
                leitura
                    ?.comparacaoDatasPermitida
            ),
        quantidadeCaracteres:
            textoExtraido.length,
        avisos,
        erro,
        custoExterno: false,
        persistido: false,
    };
}