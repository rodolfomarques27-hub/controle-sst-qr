// Infraestrutura de leitura de PDF e imagem usada pelo OCR documental.
import { normalizarTextoVerificacao } from "../utils/documentosVerificacaoUtils";
import { limparTextoPossivelDocumento } from "./documentosOcrUtils";
import { carregarPdfJsDocumental } from "./documentosOcrPdfJsService";
import {
    detectarAssinaturasDocumento,
    detectarAssinaturasTabelaPresenca,
    montarLinhasOcrComAssinatura,
    reconhecerTextoCanvasComOcrComOrientacao,
} from "./documentosOcrVisualService";

export function criarInfraestruturaLeituraDocumental({
    LIMITE_MAIOR_LADO_OCR_IMAGEM,
    arquivoPossuiArrayBuffer,
    decodificarBytes,
    textoParecePdfBrutoOuImagemEmbutida,
    textoPossuiConteudoDocumentoConfiavel,
    extrairDatasTextoDocumental,
} = {}) {
    function unescapePdfLiteral(valor = "") {
        return String(valor || "")
            .replace(/\\n/g, " ")
            .replace(/\\r/g, " ")
            .replace(/\\t/g, " ")
            .replace(/\\b/g, " ")
            .replace(/\\f/g, " ")
            .replace(/\\([()\\])/g, "$1")
            .replace(/\\([0-7]{1,3})/g, (_, octal) => {
                try {
                    return String.fromCharCode(parseInt(octal, 8));
                } catch {
                    return " ";
                }
            });
    }

    function extrairStringsLiteraisPdf(textoPdf = "") {
        const bruto = String(textoPdf || "");
        const resultados = [];
        let atual = "";
        let dentro = false;
        let escape = false;
        let profundidade = 0;

        for (let indice = 0; indice < bruto.length; indice += 1) {
            const caractere = bruto[indice];

            if (!dentro) {
                if (caractere === "(") {
                    dentro = true;
                    profundidade = 1;
                    atual = "";
                    escape = false;
                }
                continue;
            }

            if (escape) {
                atual += `\\${caractere}`;
                escape = false;
                continue;
            }

            if (caractere === "\\") {
                escape = true;
                continue;
            }

            if (caractere === "(") {
                profundidade += 1;
                atual += caractere;
                continue;
            }

            if (caractere === ")") {
                profundidade -= 1;

                if (profundidade <= 0) {
                    const limpo = limparTextoPossivelDocumento(unescapePdfLiteral(atual));

                    if (
                        limpo.length >= 2 &&
                        !textoParecePdfBrutoOuImagemEmbutida(limpo) &&
                        (/[a-zA-ZÀ-ÿ]/.test(limpo) || /\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}/.test(limpo)) &&
                        !/^[A-Za-z0-9+/=]{28,}$/.test(limpo)
                    ) {
                        resultados.push(limpo);
                    }

                    dentro = false;
                    atual = "";
                    escape = false;
                    profundidade = 0;
                    continue;
                }
            }

            atual += caractere;
        }

        return resultados;
    }

    function extrairTextoLegivelPdf(bytes) {
        const textoUtf8 = decodificarBytes(bytes, "utf-8");
        const textoWin1252 = decodificarBytes(bytes, "windows-1252");
        const bruto = textoWin1252.length > textoUtf8.length ? textoWin1252 : textoUtf8;

        const stringsPdf = extrairStringsLiteraisPdf(bruto);
        const textoExtraido = limparTextoPossivelDocumento(stringsPdf.join(" "));

        if (textoPossuiConteudoDocumentoConfiavel(textoExtraido)) {
            return textoExtraido;
        }

        return "";
    }

    async function lerTextoPaginaPdfJs(pdf, numeroPagina) {
        const pagina = await pdf.getPage(numeroPagina);
        const conteudo = await pagina.getTextContent({
            includeMarkedContent: false,
            disableNormalization: false,
        });

        return limparTextoPossivelDocumento(
            (conteudo?.items || [])
                .map((item) => item?.str || "")
                .filter(Boolean)
                .join(" ")
        );
    }


    function carregarImagemParaOcr(arquivo) {
        return new Promise((resolve, reject) => {
            if (!arquivo || typeof URL === "undefined" || typeof Image === "undefined") {
                reject(new Error("Imagem local indisponÃ­vel para OCR no navegador."));
                return;
            }

            const url = URL.createObjectURL(arquivo);
            const imagem = new Image();

            imagem.onload = () => {
                URL.revokeObjectURL(url);
                resolve(imagem);
            };

            imagem.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error("NÃ£o foi possÃ­vel carregar a imagem para OCR local."));
            };

            imagem.src = url;
        });
    }

    function desenharImagemEmCanvasOcr(imagem) {
        if (!imagem || typeof document === "undefined") {
            throw new Error("Canvas indisponÃ­vel para OCR local da imagem.");
        }

        const larguraOriginal = Number(imagem.naturalWidth || imagem.width || 0);
        const alturaOriginal = Number(imagem.naturalHeight || imagem.height || 0);

        if (!larguraOriginal || !alturaOriginal) {
            throw new Error("Imagem sem dimensÃµes vÃ¡lidas para OCR local.");
        }

        const maiorLado = Math.max(larguraOriginal, alturaOriginal);
        const escala = Math.min(1, LIMITE_MAIOR_LADO_OCR_IMAGEM / maiorLado);
        const largura = Math.max(1, Math.round(larguraOriginal * escala));
        const altura = Math.max(1, Math.round(alturaOriginal * escala));
        const canvas = document.createElement("canvas");
        const contexto = canvas.getContext("2d", { willReadFrequently: true, alpha: false });

        if (!contexto) {
            throw new Error("NÃ£o foi possÃ­vel preparar o canvas para OCR local da imagem.");
        }

        canvas.width = largura;
        canvas.height = altura;
        contexto.fillStyle = "#ffffff";
        contexto.fillRect(0, 0, largura, altura);
        contexto.drawImage(imagem, 0, 0, largura, altura);

        return {
            canvas,
            redimensionada: escala < 1,
            larguraOriginal,
            alturaOriginal,
            largura,
            altura,
        };
    }

    async function extrairTextoImagemComOcr({ arquivo = null, arquivoNome = "", mimeType = "", extensao = "" } = {}) {
        const avisos = [];

        if (!arquivoPossuiArrayBuffer(arquivo)) {
            return {
                texto: "",
                paginasLidas: 0,
                totalPaginas: 0,
                linhasOcr: [],
                assinaturasTabela: [],
                assinaturasDocumento: [],
                marcacoesDdsDias: [],
                confianca: 0,
                avisos: ["Imagem sem arquivo local para executar OCR."],
            };
        }

        if (typeof document === "undefined") {
            return {
                texto: "",
                paginasLidas: 0,
                totalPaginas: 0,
                linhasOcr: [],
                assinaturasTabela: [],
                assinaturasDocumento: [],
                marcacoesDdsDias: [],
                confianca: 0,
                avisos: ["OCR de imagem nÃ£o executado fora do navegador."],
            };
        }

        try {
            const imagem = await carregarImagemParaOcr(arquivo);
            const dadosCanvas = desenharImagemEmCanvasOcr(imagem);

            if (dadosCanvas.redimensionada) {
                avisos.push(
                    `Imagem redimensionada de ${dadosCanvas.larguraOriginal}x${dadosCanvas.alturaOriginal} para ${dadosCanvas.largura}x${dadosCanvas.altura} antes do OCR, para preservar performance.`
                );
            }

            const resultadoOcr = await reconhecerTextoCanvasComOcrComOrientacao(dadosCanvas.canvas, extrairDatasTextoDocumental);
            const canvasAnalise = resultadoOcr?.canvasAnalise || dadosCanvas.canvas;
            const textoOcr = limparTextoPossivelDocumento(resultadoOcr?.texto || "");
            const linhasOcr = montarLinhasOcrComAssinatura(canvasAnalise, resultadoOcr?.palavras || [])
                .map((linha) => ({
                    ...linha,
                    pagina: 1,
                    rotacao: resultadoOcr?.rotacao || 0,
                    texto: linha?.texto ? `Imagem: ${linha.texto}` : linha?.texto,
                }));
            const textoNormalizadoOcr = normalizarTextoVerificacao(textoOcr);
            const assinaturasDocumento = detectarAssinaturasDocumento(canvasAnalise, 1, textoNormalizadoOcr)
                .map((assinatura) => ({ ...assinatura, rotacao: resultadoOcr?.rotacao || 0 }));

            if (resultadoOcr?.rotacao) {
                avisos.push(`OCR local corrigiu orientaÃ§Ã£o da imagem em ${resultadoOcr.rotacao}Â°.`);
            }

            avisos.push("OCR local executado na imagem usando tesseract.js, sem API paga.");

            try {
                if (resultadoOcr?.canvasAnalise && resultadoOcr.canvasAnalise !== dadosCanvas.canvas) {
                    resultadoOcr.canvasAnalise.width = 1;
                    resultadoOcr.canvasAnalise.height = 1;
                }
                dadosCanvas.canvas.width = 1;
                dadosCanvas.canvas.height = 1;
            } catch {
                // LiberaÃ§Ã£o de memÃ³ria sem bloquear o fluxo.
            }

            if (textoPossuiConteudoDocumentoConfiavel(textoOcr)) {
                return {
                    texto: textoOcr,
                    paginasLidas: 1,
                    totalPaginas: 1,
                    linhasOcr,
                    assinaturasTabela: [],
                    assinaturasDocumento,
                    confianca: Number(resultadoOcr?.confianca || 0),
                    avisos,
                };
            }

            return {
                texto: "",
                paginasLidas: 1,
                totalPaginas: 1,
                linhasOcr,
                assinaturasTabela: [],
                assinaturasDocumento,
                confianca: Number(resultadoOcr?.confianca || 0),
                avisos: [
                    ...avisos,
                    `OCR local executado, mas nÃ£o encontrou texto documental confiÃ¡vel na imagem ${arquivoNome || extensao || mimeType || ""}.`,
                ],
            };
        } catch (error) {
            return {
                texto: "",
                paginasLidas: 0,
                totalPaginas: 0,
                linhasOcr: [],
                assinaturasTabela: [],
                assinaturasDocumento: [],
                marcacoesDdsDias: [],
                confianca: 0,
                avisos: [`OCR local da imagem indisponÃ­vel: ${error?.message || "erro desconhecido"}.`],
            };
        }
    }

    async function extrairTextoPrimeiraPaginaPdfComOcr(buffer) {
        if (!buffer || !buffer.byteLength) {
            return {
                texto: "",
                paginasLidas: 0,
                totalPaginas: 0,
                avisos: [],
                linhasOcr: [],
                assinaturasTabela: [],
                assinaturasDocumento: [],
                marcacoesDdsDias: [],
            };
        }

        if (typeof document === "undefined") {
            return {
                texto: "",
                paginasLidas: 0,
                totalPaginas: 0,
                avisos: ["OCR de imagem não executado fora do navegador."],
                linhasOcr: [],
                assinaturasTabela: [],
                assinaturasDocumento: [],
                marcacoesDdsDias: [],
            };
        }

        try {
            const pdfjsLib = await carregarPdfJsDocumental();
            const tarefa = pdfjsLib.getDocument({
                data: new Uint8Array(buffer.slice(0)),
                disableFontFace: true,
                useSystemFonts: true,
                verbosity: 0,
            });

            const pdf = await tarefa.promise;
            const totalPaginas = Number(pdf?.numPages || 0);

            if (!totalPaginas) {
                return {
                    texto: "",
                    paginasLidas: 0,
                    totalPaginas: 0,
                    avisos: ["OCR local não encontrou páginas no PDF."],
                    linhasOcr: [],
                    assinaturasTabela: [],
                    assinaturasDocumento: [],
                marcacoesDdsDias: [],
                };
            }

            const paginasParaOcr = Array.from(new Set([1, totalPaginas].filter((numero) => numero >= 1 && numero <= totalPaginas))).slice(0, 2);
            const textosPaginas = [];
            const linhasOcrGerais = [];
            const assinaturasTabelaGerais = [];
            const assinaturasDocumentoGerais = [];
            const avisos = [];

            async function executarOcrPagina(numeroPagina) {
                const pagina = await pdf.getPage(numeroPagina);
                const viewportBase = pagina.getViewport({ scale: 1 });

                /*
                 * PDFs escaneados de ASO possuem campos pequenos na parte
                 * superior da pagina. Uma renderizacao proxima de 110 DPI
                 * nao oferece definicao suficiente para o Tesseract localizar
                 * campos como Funcao, Setor e Resultado.
                 *
                 * A resolucao ampliada e usada somente no fallback de OCR,
                 * quando o PDF nao possui camada de texto pesquisavel.
                 */
                const escalaBase = numeroPagina === 1 ? 2.35 : 2.0;
                const escalaMaximaPorLargura = viewportBase.width
                    ? 1900 / viewportBase.width
                    : escalaBase;
                const escalaMaximaPorAltura = viewportBase.height
                    ? 2700 / viewportBase.height
                    : escalaBase;
                const escalaSegura = Math.max(
                    1.65,
                    Math.min(
                        escalaBase,
                        escalaMaximaPorLargura,
                        escalaMaximaPorAltura
                    )
                );
                const viewport = pagina.getViewport({
                    scale: escalaSegura,
                });
                const canvas = document.createElement("canvas");
                const contexto = canvas.getContext("2d", { willReadFrequently: true });

                if (!contexto) {
                    avisos.push(`OCR local não conseguiu preparar o canvas da página ${numeroPagina}.`);
                    return;
                }

                canvas.width = Math.ceil(viewport.width);
                canvas.height = Math.ceil(viewport.height);

                await pagina.render({ canvasContext: contexto, viewport }).promise;
                await new Promise((resolve) => setTimeout(resolve, 0));

                const resultadoOcr = await reconhecerTextoCanvasComOcrComOrientacao(canvas, extrairDatasTextoDocumental);
                const canvasAnalise = resultadoOcr?.canvasAnalise || canvas;
                const textoOcr = resultadoOcr?.texto || "";
                const linhasOcr = montarLinhasOcrComAssinatura(canvasAnalise, resultadoOcr?.palavras || [])
                    .map((linha) => ({
                        ...linha,
                        pagina: numeroPagina,
                        rotacao: resultadoOcr?.rotacao || 0,
                        texto: linha?.texto ? `Página ${numeroPagina}: ${linha.texto}` : linha?.texto,
                    }));
                await new Promise((resolve) => setTimeout(resolve, 0));

                const textoNormalizadoOcr = normalizarTextoVerificacao(textoOcr);
                const pareceListaComAssinatura = /nome do colaborador|nome\s+cargo\s+assinatura|nome\s+assinatura|assinatura|declaro ter participado|lista de presenca|lista de presença|dialogo de seguranca|diálogo de segurança|integra[cç][aã]o|nr\s*[-º]?\s*(?:11|12|17|18|21|25|26)|manuseio de materiais|movimentacao|movimentação/.test(textoNormalizadoOcr);
                const pareceListaSimplesSuperior = Boolean(
                    /lista de presenca|lista de presença|dialogo de seguranca|diálogo de segurança/.test(textoNormalizadoOcr) &&
                    /nome\s+assinatura|nome[\s\S]{0,80}assinatura/.test(textoNormalizadoOcr) &&
                    !/conteudo programatico|conteúdo programático|declaro ter participado|nr\s*[-º]?\s*(?:11|12|17|18|21|25|26)/.test(textoNormalizadoOcr)
                );
                const opcoesAssinaturaTabela = pareceListaSimplesSuperior
                    ? { yInicio: 0.22, x0: 0.42, x1: 0.94, maxLinhas: 45 }
                    : {};
                const assinaturasTabela = pareceListaComAssinatura
                    ? detectarAssinaturasTabelaPresenca(canvasAnalise, opcoesAssinaturaTabela).map((assinatura) => ({ ...assinatura, pagina: numeroPagina, rotacao: resultadoOcr?.rotacao || 0 }))
                    : [];
                const assinaturasDocumento = detectarAssinaturasDocumento(canvasAnalise, numeroPagina, textoNormalizadoOcr)
                    .map((assinatura) => ({ ...assinatura, rotacao: resultadoOcr?.rotacao || 0 }));

                if (resultadoOcr?.rotacao) {
                    avisos.push(`OCR local corrigiu orientação da página ${numeroPagina} em ${resultadoOcr.rotacao}° para ler certificado digitalizado de lado.`);
                }

                if (textoOcr) {
                    textosPaginas.push(`Página ${numeroPagina}: ${textoOcr}`);
                }

                linhasOcrGerais.push(...linhasOcr);
                assinaturasTabelaGerais.push(...assinaturasTabela);
                assinaturasDocumentoGerais.push(...assinaturasDocumento);

                try {
                    if (resultadoOcr?.canvasAnalise && resultadoOcr.canvasAnalise !== canvas) {
                        resultadoOcr.canvasAnalise.width = 1;
                        resultadoOcr.canvasAnalise.height = 1;
                    }
                    canvas.width = 1;
                    canvas.height = 1;
                } catch {
                    // Liberação de memória sem bloquear o fluxo.
                }

                await new Promise((resolve) => setTimeout(resolve, 0));
            }

            for (const numeroPagina of paginasParaOcr) {
                await executarOcrPagina(numeroPagina);
            }

            try {
                await pdf.destroy();
            } catch {
                // Liberação de memória sem bloquear o fluxo.
            }

            const textoOcrFinal = limparTextoPossivelDocumento(textosPaginas.join(" "));
            const paginasLidas = paginasParaOcr.length;

            if (paginasParaOcr.length > 1) {
                avisos.push(`OCR local executado na primeira e na última página do PDF escaneado/imagem (${paginasParaOcr.join(", ")}).`);
            } else {
                avisos.push("OCR local executado na primeira página do PDF escaneado/imagem.");
            }

            if (textoPossuiConteudoDocumentoConfiavel(textoOcrFinal)) {
                return {
                    texto: textoOcrFinal,
                    paginasLidas,
                    totalPaginas,
                    linhasOcr: linhasOcrGerais,
                    assinaturasTabela: assinaturasTabelaGerais,
                    assinaturasDocumento: assinaturasDocumentoGerais,
                    avisos,
                };
            }

            return {
                texto: "",
                paginasLidas,
                totalPaginas,
                linhasOcr: linhasOcrGerais,
                assinaturasTabela: assinaturasTabelaGerais,
                assinaturasDocumento: assinaturasDocumentoGerais,
                avisos: [
                    ...avisos,
                    "OCR local executado, mas não encontrou texto documental confiável nas páginas analisadas.",
                ],
            };
        } catch (error) {
            return {
                texto: "",
                paginasLidas: 0,
                totalPaginas: 0,
                avisos: [`OCR local de imagem indisponível: ${error?.message || "erro desconhecido"}.`],
                linhasOcr: [],
                assinaturasTabela: [],
                assinaturasDocumento: [],
                marcacoesDdsDias: [],
            };
        }
    }

    return {
        extrairTextoLegivelPdf,
        lerTextoPaginaPdfJs,
        extrairTextoImagemComOcr,
        extrairTextoPrimeiraPaginaPdfComOcr,
    };
}
