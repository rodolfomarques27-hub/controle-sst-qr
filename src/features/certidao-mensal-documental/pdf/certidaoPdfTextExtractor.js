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
    repararCamadaTextualSuspeitaCertidao,
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

// SAFE_SCAN_QUALIDADE_TEXTO_CERTIDAO_V1_BEGIN
function avaliarQualidadeTextoCertidao(
    texto = ""
) {
    const normalizado =
        String(
            texto ||
            ""
        )
            .normalize("NFD")
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

    const semEspacos =
        normalizado.replace(
            /\s+/g,
            ""
        );

    if (!semEspacos) {
        return {
            suspeita: false,
            quantidadeCaracteres: 0,
            quantidadeUnidades: 0,
            palavrasLongas: 0,
            palavrasComVogal: 0,
            marcadoresSemanticos: 0,
            proporcaoAlfanumerica: 0,
            proporcaoSimbolos: 0,
            proporcaoUnidadesCurtas: 0,
            proporcaoPalavrasComVogal: 0,
        };
    }

    const alfanumericos =
        (
            semEspacos.match(
                /[A-Z0-9]/g
            ) ||
            []
        ).length;

    const simbolos =
        Math.max(
            0,
            semEspacos.length -
                alfanumericos
        );

    const unidades =
        normalizado
            .split(" ")
            .filter(Boolean);

    const palavras =
        normalizado.match(
            /\b[A-Z]{3,}\b/g
        ) ||
        [];

    const palavrasComVogal =
        palavras.filter(
            (palavra) =>
                /[AEIOU]/.test(
                    palavra
                )
        );

    const unidadesCurtas =
        unidades.filter(
            (unidade) =>
                unidade
                    .replace(
                        /[^A-Z0-9]/g,
                        ""
                    )
                    .length <=
                2
        );

    const marcadores =
        [
            "CERTIDAO",
            "CNPJ",
            "CPF",
            "EMPRESA",
            "PAGAMENTO",
            "SALARIO",
            "FOLHA",
            "COMPETENCIA",
            "BANCO",
            "VALOR",
            "FGTS",
            "INSS",
            "TRABALH",
            "VALIDADE",
            "EMISSAO",
            "SISPAG",
            "TRANSFERENCIA",
            "CONTA",
            "BENEFICIARIO",
            "FAVORECIDO",
        ];

    const marcadoresSemanticos =
        marcadores.filter(
            (marcador) =>
                normalizado.includes(
                    marcador
                )
        ).length;

    const proporcaoAlfanumerica =
        semEspacos.length
            ? alfanumericos /
                semEspacos.length
            : 0;

    const proporcaoSimbolos =
        semEspacos.length
            ? simbolos /
                semEspacos.length
            : 0;

    const proporcaoUnidadesCurtas =
        unidades.length
            ? unidadesCurtas.length /
                unidades.length
            : 0;

    const proporcaoPalavrasComVogal =
        palavras.length
            ? palavrasComVogal.length /
                palavras.length
            : 0;

    const possuiVolumeMinimo =
        normalizado.length >=
        80;

    const poucaSemantica =
        marcadoresSemanticos <
        2;

    const estruturaSuspeita =
        (
            proporcaoAlfanumerica <
            0.62
        ) ||
        (
            proporcaoSimbolos >
            0.30
        ) ||
        (
            unidades.length >=
                24 &&
            palavras.length <
                8
        ) ||
        (
            unidades.length >=
                24 &&
            proporcaoUnidadesCurtas >
                0.55 &&
            palavras.length <
                12
        ) ||
        (
            palavras.length >=
                8 &&
            proporcaoPalavrasComVogal <
                0.35
        );

    return {
        suspeita:
            Boolean(
                possuiVolumeMinimo &&
                poucaSemantica &&
                estruturaSuspeita
            ),

        quantidadeCaracteres:
            normalizado.length,

        quantidadeUnidades:
            unidades.length,

        palavrasLongas:
            palavras.length,

        palavrasComVogal:
            palavrasComVogal.length,

        marcadoresSemanticos,

        proporcaoAlfanumerica:
            Number(
                proporcaoAlfanumerica
                    .toFixed(4)
            ),

        proporcaoSimbolos:
            Number(
                proporcaoSimbolos
                    .toFixed(4)
            ),

        proporcaoUnidadesCurtas:
            Number(
                proporcaoUnidadesCurtas
                    .toFixed(4)
            ),

        proporcaoPalavrasComVogal:
            Number(
                proporcaoPalavrasComVogal
                    .toFixed(4)
            ),
    };
}
// SAFE_SCAN_QUALIDADE_TEXTO_CERTIDAO_V1_END

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

    const textoAntesCorrecao =
        String(
            decodificacaoGfd?.texto ||
            textoExtraidoComComplemento
        ).trim();

    const qualidadeAntesCorrecao =
        avaliarQualidadeTextoCertidao(
            textoAntesCorrecao
        );

    const textoOriginalInsuficiente =
        Number(
            qualidadeAntesCorrecao
                ?.quantidadeCaracteres ||
            0
        ) <
        80;

    let reparoCamadaSuspeita =
        null;

    const tipoLeituraOriginal =
        String(
            leitura?.tipoLeitura ||
            ""
        )
            .trim()
            .toLowerCase();

    if (
        tipoLeituraOriginal ===
            "pdf_texto_local" &&
        !decodificacaoGfd?.aplicada &&
        (
            qualidadeAntesCorrecao
                .suspeita ||
            textoOriginalInsuficiente
        )
    ) {
        reparoCamadaSuspeita =
            await repararCamadaTextualSuspeitaCertidao({
                arquivo,
            });
    }

    const textoOcrCorretivo =
        String(
            reparoCamadaSuspeita
                ?.texto ||
            ""
        ).trim();

    const qualidadeOcrCorretivo =
        avaliarQualidadeTextoCertidao(
            textoOcrCorretivo
        );

    const reparoOcrAceito =
        Boolean(
            reparoCamadaSuspeita
                ?.aplicada &&
            textoOcrCorretivo &&
            !qualidadeOcrCorretivo
                .suspeita &&
            qualidadeOcrCorretivo
                .palavrasLongas >=
                4 &&
            (
                !textoOriginalInsuficiente ||
                qualidadeOcrCorretivo
                    .quantidadeCaracteres >=
                    80
            )
        );

    const textoExtraido =
        reparoOcrAceito
            ? textoOcrCorretivo
            : textoAntesCorrecao;

    const tipoLeitura =
        reparoOcrAceito
            ? "ocr_imagem_local"
            : String(
                leitura?.tipoLeitura ||
                ""
            ).trim();

    const avisosQualidade =
        [];

    if (
        textoOriginalInsuficiente
    ) {
        avisosQualidade.push(
            (
                "A Certidão detectou camada textual insuficiente e acionou " +
                "o fallback OCR local exclusivo deste módulo."
            )
        );
    }

    if (
        qualidadeAntesCorrecao
            .suspeita
    ) {
        avisosQualidade.push(
            (
                "A Certidão detectou uma camada textual não vazia, porém semanticamente suspeita " +
                "e tentou um fallback OCR local isolado deste módulo."
            )
        );
    }

    if (reparoOcrAceito) {
        avisosQualidade.push(
            (
                "O OCR corretivo apresentou estrutura textual superior à camada PDF.js suspeita " +
                "e passou a ser usado somente para a análise técnica."
            )
        );
    }
    else if (
        qualidadeAntesCorrecao
            .suspeita &&
        reparoCamadaSuspeita
    ) {
        avisosQualidade.push(
            (
                "O fallback OCR não apresentou texto suficientemente melhor; " +
                "a leitura original foi mantida e o documento continua sujeito à revisão."
            )
        );
    }

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
            ...(reparoCamadaSuspeita
                ?.avisos || []),
            ...avisosQualidade,
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
            reparoOcrAceito
                ? "ocr_local_tesseract"
                : complementoPdfMisto?.aplicada
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
            reparoOcrAceito ||
            decodificacaoGfd?.aplicada
                ? textoExtraido
                : String(
                    leitura?.textoPrevia ||
                    textoExtraido ||
                    ""
                ).trim(),
        resumo:
            reparoOcrAceito
                ? ""
                : String(
                    leitura?.resumo ||
                    ""
                ).trim(),
        resumoTextual:
            reparoOcrAceito
                ? ""
                : String(
                    leitura?.resumoTextual ||
                    ""
                ).trim(),
        camposExtraidos:
            reparoOcrAceito
                ? []
                : Array.isArray(
                    leitura?.camposExtraidos
                )
                    ? leitura.camposExtraidos
                    : [],
        datasEncontradas:
            reparoOcrAceito
                ? []
                : Array.isArray(
                    leitura?.datasEncontradas
                )
                    ? leitura.datasEncontradas
                    : [],
        datasRelevantesClassificadas:
            reparoOcrAceito
                ? []
                : Array.isArray(
                    leitura
                        ?.datasRelevantesClassificadas
                )
                    ? leitura
                        .datasRelevantesClassificadas
                    : [],
        paginasLidas:
            reparoOcrAceito
                ? Number(
                    reparoCamadaSuspeita
                        ?.paginasOcr
                        ?.length ||
                    0
                )
                : Number(
                    leitura?.paginasLidas ||
                    0
                ),
        totalPaginas:
            reparoOcrAceito
                ? Number(
                    reparoCamadaSuspeita
                        ?.totalPaginas ||
                    0
                )
                : Number(
                    leitura?.totalPaginas ||
                    0
                ),
        confianca:
            reparoOcrAceito
                ? Number(
                    reparoCamadaSuspeita
                        ?.confiancaOcr ||
                    0
                )
                : Number(
                    leitura?.confianca ||
                    0
                ),
        textoLimitado:
            reparoOcrAceito
                ? false
                : Boolean(
                    leitura?.textoLimitado
                ),
        comparacaoDatasPermitida:
            reparoOcrAceito
                ? false
                : Boolean(
                    leitura
                        ?.comparacaoDatasPermitida
                ),
        quantidadeCaracteres:
            textoExtraido.length,
        qualidadeTexto: {
            camadaSuspeitaDetectada:
                qualidadeAntesCorrecao
                    .suspeita,
            textoInsuficienteDetectado:
                textoOriginalInsuficiente,
            correcaoOcrAplicada:
                reparoOcrAceito,
            antes:
                qualidadeAntesCorrecao,
            depois:
                reparoOcrAceito
                    ? qualidadeOcrCorretivo
                    : qualidadeAntesCorrecao,
        },
        avisos,
        erro,
        custoExterno: false,
        persistido: false,
    };
}