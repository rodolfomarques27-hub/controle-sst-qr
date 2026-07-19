// Infraestrutura visual compartilhada pelos fluxos documental e DDS.
import { normalizarTextoVerificacao } from "../utils/documentosVerificacaoUtils";
import { limparTextoPossivelDocumento } from "./documentosOcrUtils";

async function carregarTesseractDocumental() {
    try {
        return await import("tesseract.js");
    } catch (error) {
        throw new Error(`OCR local indisponível: ${error?.message || "não foi possível carregar tesseract.js"}.`);
    }
}

function obterBboxPalavraOcr(palavra = {}) {
    const bbox = palavra?.bbox || palavra?.box || palavra?.boundingBox || null;

    if (!bbox) return null;

    const x0 = Number(bbox.x0 ?? bbox.left ?? bbox.x ?? 0);
    const y0 = Number(bbox.y0 ?? bbox.top ?? bbox.y ?? 0);
    const x1 = Number(bbox.x1 ?? (bbox.left !== undefined && bbox.width !== undefined ? bbox.left + bbox.width : 0));
    const y1 = Number(bbox.y1 ?? (bbox.top !== undefined && bbox.height !== undefined ? bbox.top + bbox.height : 0));

    if (![x0, y0, x1, y1].every(Number.isFinite)) return null;
    if (x1 <= x0 || y1 <= y0) return null;

    return { x0, y0, x1, y1 };
}

function agruparPalavrasOcrEmLinhas(palavras = [], canvas = null) {
    const largura = Number(canvas?.width || 0) || 1;
    const altura = Number(canvas?.height || 0) || 1;
    const registros = (Array.isArray(palavras) ? palavras : [])
        .map((palavra) => {
            const texto = limparTextoPossivelDocumento(palavra?.text || palavra?.symbol || "");
            const bbox = obterBboxPalavraOcr(palavra);

            if (!texto || !bbox) return null;

            return {
                texto,
                x0: bbox.x0,
                y0: bbox.y0,
                x1: bbox.x1,
                y1: bbox.y1,
                yCentro: (bbox.y0 + bbox.y1) / 2,
            };
        })
        .filter(Boolean)
        .sort((a, b) => a.yCentro - b.yCentro || a.x0 - b.x0);

    const linhas = [];
    const toleranciaBase = Math.max(8, altura * 0.008);

    registros.forEach((palavra) => {
        const ultima = linhas[linhas.length - 1];
        const tolerancia = Math.max(toleranciaBase, (palavra.y1 - palavra.y0) * 0.65);

        if (ultima && Math.abs(ultima.yCentro - palavra.yCentro) <= tolerancia) {
            ultima.palavras.push(palavra);
            ultima.y0 = Math.min(ultima.y0, palavra.y0);
            ultima.y1 = Math.max(ultima.y1, palavra.y1);
            ultima.x0 = Math.min(ultima.x0, palavra.x0);
            ultima.x1 = Math.max(ultima.x1, palavra.x1);
            ultima.yCentro = (ultima.yCentro * (ultima.palavras.length - 1) + palavra.yCentro) / ultima.palavras.length;
            return;
        }

        linhas.push({
            palavras: [palavra],
            x0: palavra.x0,
            y0: palavra.y0,
            x1: palavra.x1,
            y1: palavra.y1,
            yCentro: palavra.yCentro,
        });
    });

    return linhas.map((linha, indice) => {
        const palavrasLinha = linha.palavras.sort((a, b) => a.x0 - b.x0);
        const texto = limparTextoPossivelDocumento(palavrasLinha.map((palavra) => palavra.texto).join(" "));

        return {
            indice,
            texto,
            texto_normalizado: normalizarTextoVerificacao(texto),
            x0: Number((linha.x0 / largura).toFixed(4)),
            x1: Number((linha.x1 / largura).toFixed(4)),
            y0: Number((linha.y0 / altura).toFixed(4)),
            y1: Number((linha.y1 / altura).toFixed(4)),
            yCentro: Number((linha.yCentro / altura).toFixed(4)),
        };
    }).filter((linha) => linha.texto);
}

export function calcularAssinaturaVisualFaixa(canvas, faixa = {}) {
    if (!canvas || typeof canvas.getContext !== "function") {
        return { assinaturaVisual: false, densidade: 0, origem: faixa.origem || "sem_canvas" };
    }

    const contexto = canvas.getContext("2d", { willReadFrequently: true });

    if (!contexto) {
        return { assinaturaVisual: false, densidade: 0, origem: faixa.origem || "sem_contexto_canvas" };
    }

    const largura = canvas.width || 1;
    const altura = canvas.height || 1;
    const xInicio = Math.max(0, Math.floor(Number(faixa.x0 || 0) * largura));
    const xFim = Math.min(largura, Math.ceil(Number(faixa.x1 || 1) * largura));
    const yInicio = Math.max(0, Math.floor(Number(faixa.y0 || 0) * altura));
    const yFim = Math.min(altura, Math.ceil(Number(faixa.y1 || 1) * altura));
    const larguraRecorte = Math.max(1, xFim - xInicio);
    const alturaRecorte = Math.max(1, yFim - yInicio);

    if (larguraRecorte < 8 || alturaRecorte < 6) {
        return {
            assinaturaVisual: false,
            densidade: 0,
            origem: faixa.origem || "recorte_insuficiente",
            larguraRecorte,
            alturaRecorte,
        };
    }

    try {
        const dados = contexto.getImageData(xInicio, yInicio, larguraRecorte, alturaRecorte).data;
        let pixelsRelevantes = 0;
        let pixelsTinta = 0;
        let pixelsAzuis = 0;
        const colunasComTinta = new Set();
        const linhasComTinta = new Set();

        for (let y = 0; y < alturaRecorte; y += 1) {
            for (let x = 0; x < larguraRecorte; x += 1) {
                // Ignora bordas do recorte para reduzir falso positivo por linha da tabela.
                if (x < 3 || y < 3 || x > larguraRecorte - 4 || y > alturaRecorte - 4) continue;

                const i = (y * larguraRecorte + x) * 4;
                const r = dados[i];
                const g = dados[i + 1];
                const b = dados[i + 2];
                const a = dados[i + 3];

                if (a < 40) continue;

                pixelsRelevantes += 1;

                const luma = (0.299 * r) + (0.587 * g) + (0.114 * b);
                const diferencaCanais = Math.max(r, g, b) - Math.min(r, g, b);
                const azulCaneta = b > r + 10 && b > g + 2 && b < 248;
                const tracoEscuro = luma < 165 && diferencaCanais > 4;
                const tintaProvavel = azulCaneta || tracoEscuro;

                if (tintaProvavel) {
                    pixelsTinta += 1;
                    if (azulCaneta) pixelsAzuis += 1;
                    colunasComTinta.add(Math.floor(x / 4));
                    linhasComTinta.add(Math.floor(y / 3));
                }
            }
        }

        const densidade = pixelsRelevantes ? pixelsTinta / pixelsRelevantes : 0;
        const densidadeAzul = pixelsRelevantes ? pixelsAzuis / pixelsRelevantes : 0;
        const espalhamentoHorizontal = colunasComTinta.size / Math.max(1, Math.ceil(larguraRecorte / 4));
        const espalhamentoVertical = linhasComTinta.size / Math.max(1, Math.ceil(alturaRecorte / 3));
        const assinaturaVisual = (
            densidadeAzul > 0.00045 ||
            (densidade > 0.0024 && espalhamentoHorizontal > 0.018 && espalhamentoVertical > 0.04) ||
            (densidade > 0.0042 && espalhamentoHorizontal > 0.012)
        );

        return {
            assinaturaVisual,
            densidade: Number(densidade.toFixed(4)),
            densidadeAzul: Number(densidadeAzul.toFixed(4)),
            espalhamentoHorizontal: Number(espalhamentoHorizontal.toFixed(4)),
            espalhamentoVertical: Number(espalhamentoVertical.toFixed(4)),
            larguraRecorte,
            alturaRecorte,
            origem: faixa.origem || "analise_visual_faixa",
        };
    } catch {
        return { assinaturaVisual: false, densidade: 0, origem: faixa.origem || "erro_leitura_canvas" };
    }
}

export function detectarLinhasHorizontaisTabelaPresenca(canvas, opcoes = {}) {
    if (!canvas || typeof canvas.getContext !== "function") return [];

    const contexto = canvas.getContext("2d", { willReadFrequently: true });
    if (!contexto) return [];

    const largura = canvas.width || 1;
    const altura = canvas.height || 1;
    const xInicio = Math.floor(largura * 0.06);
    const xFim = Math.floor(largura * 0.94);
    const yInicioNormalizado = Number.isFinite(Number(opcoes?.yInicio)) ? Number(opcoes.yInicio) : 0.52;
    const yFimNormalizado = Number.isFinite(Number(opcoes?.yFim)) ? Number(opcoes.yFim) : 0.98;
    const yInicioSeguro = Math.max(0.05, Math.min(0.9, yInicioNormalizado));
    const yFimSeguro = Math.max(yInicioSeguro + 0.05, Math.min(0.99, yFimNormalizado));
    const yInicio = Math.floor(altura * yInicioSeguro);
    const yFim = Math.floor(altura * yFimSeguro);
    const larguraRegiao = Math.max(1, xFim - xInicio);
    const alturaRegiao = Math.max(1, yFim - yInicio);
    const candidatos = [];

    try {
        // Importante para performance: pegar a região da tabela uma única vez.
        // A versão anterior fazia milhares de getImageData(1x1), o que travava o Chrome.
        const dados = contexto.getImageData(xInicio, yInicio, larguraRegiao, alturaRegiao).data;
        const passoX = Math.max(7, Math.floor(larguraRegiao / 150));
        const passoY = 2;

        for (let yLocal = 0; yLocal < alturaRegiao; yLocal += passoY) {
            let escuros = 0;
            let total = 0;

            for (let xLocal = 0; xLocal < larguraRegiao; xLocal += passoX) {
                const i = (yLocal * larguraRegiao + xLocal) * 4;
                const r = dados[i];
                const g = dados[i + 1];
                const b = dados[i + 2];
                const a = dados[i + 3];

                if (a < 40) continue;

                const luma = (0.299 * r) + (0.587 * g) + (0.114 * b);
                total += 1;
                if (luma < 125) escuros += 1;
            }

            const proporcao = total ? escuros / total : 0;
            if (proporcao >= 0.14) {
                candidatos.push({ y: yInicio + yLocal, proporcao });
            }
        }
    } catch {
        return [];
    }

    const grupos = [];
    candidatos.forEach((candidato) => {
        const ultimo = grupos[grupos.length - 1];
        if (ultimo && candidato.y - ultimo.fim <= 5) {
            ultimo.fim = candidato.y;
            ultimo.pontos.push(candidato);
            return;
        }
        grupos.push({ inicio: candidato.y, fim: candidato.y, pontos: [candidato] });
    });

    const linhas = grupos
        .map((grupo) => ({
            y: Math.round((grupo.inicio + grupo.fim) / 2),
            proporcao: Math.max(...grupo.pontos.map((ponto) => ponto.proporcao)),
            alturaGrupo: grupo.fim - grupo.inicio + 1,
        }))
        .filter((linha) => linha.proporcao >= 0.17 || linha.alturaGrupo >= 3)
        .sort((a, b) => a.y - b.y);

    return linhas.reduce((lista, linha) => {
        const anterior = lista[lista.length - 1];
        if (anterior && Math.abs(linha.y - anterior.y) < 10) {
            if (linha.proporcao > anterior.proporcao) lista[lista.length - 1] = linha;
            return lista;
        }
        lista.push(linha);
        return lista;
    }, []);
}

export function detectarAssinaturasTabelaPresenca(canvas, opcoes = {}) {
    const linhas = detectarLinhasHorizontaisTabelaPresenca(canvas, opcoes);
    const altura = canvas?.height || 1;

    if (!linhas.length || linhas.length < 4) return [];

    // Em listas padrão, a primeira faixa é o cabeçalho da tabela e as seguintes são linhas numeradas.
    const resultados = [];
    const maxLinhas = Math.min(Number(opcoes?.maxLinhas || 20), linhas.length - 1);
    const indiceInicial = Number.isInteger(Number(opcoes?.indiceInicial)) ? Number(opcoes.indiceInicial) : 1;
    const x0Assinatura = Number.isFinite(Number(opcoes?.x0)) ? Number(opcoes.x0) : 0.64;
    const x1Assinatura = Number.isFinite(Number(opcoes?.x1)) ? Number(opcoes.x1) : 0.925;

    for (let indice = indiceInicial; indice < maxLinhas; indice += 1) {
        const superior = linhas[indice];
        const inferior = linhas[indice + 1];
        if (!superior || !inferior) continue;

        const alturaLinhaPx = inferior.y - superior.y;
        if (alturaLinhaPx < 12) continue;

        const y0 = (superior.y + Math.max(3, alturaLinhaPx * 0.14)) / altura;
        const y1 = (inferior.y - Math.max(3, alturaLinhaPx * 0.12)) / altura;
        const assinatura = calcularAssinaturaVisualFaixa(canvas, {
            x0: x0Assinatura,
            x1: x1Assinatura,
            y0,
            y1,
            origem: "analise_visual_linha_tabela_presenca",
        });

        resultados.push({
            numeroLinha: indice,
            y0: Number(y0.toFixed(4)),
            y1: Number(y1.toFixed(4)),
            yCentro: Number(((y0 + y1) / 2).toFixed(4)),
            assinatura_visual: assinatura.assinaturaVisual,
            assinatura_densidade: assinatura.densidade,
            assinatura_densidade_azul: assinatura.densidadeAzul || 0,
            assinatura_espalhamento_horizontal: assinatura.espalhamentoHorizontal || 0,
            assinatura_espalhamento_vertical: assinatura.espalhamentoVertical || 0,
            assinatura_origem: assinatura.origem,
        });
    }

    return resultados;
}

export function detectarAssinaturasDocumento(canvas, numeroPagina = 1, textoNormalizadoPagina = "") {
    if (!canvas || typeof canvas.getContext !== "function") return [];

    const texto = normalizarTextoVerificacao(textoNormalizadoPagina);
    const documentoComAssinaturaIndividual = /ordem de servico|ordem de serviço|seguranca e saude do trabalho|segurança e saúde do trabalho|assinatura do empregado|registro de empregado|ficha de registro|empregado|data de admissao|data de admissão|controle de entrega de epi|entrega de epi|equipamento de protecao individual|equipamento de proteção individual|declaracao de recebimento|declaração de recebimento|atestado de saude ocupacional|atestado de saúde ocupacional|aso|assinado digitalmente|icp-brasil|participante/.test(texto);

    if (!documentoComAssinaturaIndividual) return [];

    const faixas = [
        {
            tipo: "assinatura_empregado",
            rotulo: "Assinatura do empregado",
            x0: 0.07,
            x1: 0.43,
            y0: 0.66,
            y1: 0.90,
        },
        {
            tipo: "assinatura_responsavel",
            rotulo: "Assinatura do responsável/TST",
            x0: 0.43,
            x1: 0.88,
            y0: 0.66,
            y1: 0.90,
        },
        {
            tipo: "assinatura_rodape",
            rotulo: "Assinatura no rodapé do documento",
            x0: 0.06,
            x1: 0.92,
            y0: 0.60,
            y1: 0.92,
        },
    ];

    return faixas.map((faixa) => {
        const assinatura = calcularAssinaturaVisualFaixa(canvas, {
            ...faixa,
            origem: `assinatura_documento_${faixa.tipo}`,
        });

        return {
            pagina: numeroPagina,
            tipo: faixa.tipo,
            rotulo: faixa.rotulo,
            assinatura_visual: assinatura.assinaturaVisual,
            assinatura_densidade: assinatura.densidade,
            assinatura_densidade_azul: assinatura.densidadeAzul || 0,
            assinatura_espalhamento_horizontal: assinatura.espalhamentoHorizontal || 0,
            assinatura_espalhamento_vertical: assinatura.espalhamentoVertical || 0,
            assinatura_origem: assinatura.origem,
            largura_recorte: assinatura.larguraRecorte || null,
            altura_recorte: assinatura.alturaRecorte || null,
        };
    }).filter((item) => item.assinatura_visual || item.tipo === "assinatura_empregado");
}

export function montarLinhasOcrComAssinatura(canvas, palavras = []) {
    // Mantém a posição das linhas do OCR para localizar colaborador/data/treinamento,
    // mas não varre assinatura em todas as linhas. A assinatura é analisada só nas faixas
    // da tabela de presença, reduzindo travamento em PDFs escaneados.
    return agruparPalavrasOcrEmLinhas(palavras, canvas)
        .map((linha) => ({
            ...linha,
            assinatura_visual: null,
            assinatura_densidade: null,
            assinatura_densidade_azul: null,
            assinatura_espalhamento_horizontal: null,
            assinatura_espalhamento_vertical: null,
            assinatura_origem: "assinatura_avaliada_por_tabela_quando_aplicavel",
        }))
        .slice(0, 120);
}

function calcularScoreTextoOcrOrientacao(texto = "", extrairDatas = null) {
    const limpo = limparTextoPossivelDocumento(texto);
    const normalizado = normalizarTextoVerificacao(limpo);
    const tokens = normalizado.match(/[a-z0-9]{3,}/g) || [];
    const datasExtraidas = typeof extrairDatas === "function"
        ? extrairDatas(limpo, "ocr_orientacao")
        : [];
    const datas = Array.isArray(datasExtraidas) ? datasExtraidas.length : 0;
    const termos = [
        "certificado", "treinamento", "lista", "presenca", "presença", "ordem", "servico", "serviço",
        "registro", "empregado", "aso", "atestado", "saude", "saúde", "ocupacional", "empresa", "cnpj",
        "cpf", "colaborador", "nome", "funcao", "função", "assinatura", "ribeiro", "aquino", "data",
        "admissao", "admissão", "epi", "ergonomia", "maquinas", "máquinas", "sinalizacao", "sinalização",
        "dds", "dialogo", "diálogo", "diario", "diário", "seguranca", "segurança", "semanal",
        "safescan", "participantes", "obra", "setor", "presenca", "presença", "folha", "conferencia", "conferência"
    ].reduce((total, termo) => total + (normalizado.includes(normalizarTextoVerificacao(termo)) ? 1 : 0), 0);

    return Math.min(100, tokens.length + termos * 8 + datas * 12 + Math.min(18, Math.floor(limpo.length / 80)));
}

function criarCanvasRotacionado(canvas, graus = 0) {
    if (!canvas || typeof document === "undefined") return canvas;

    const angulo = Number(graus || 0);
    if (!angulo) return canvas;

    const radianos = (angulo * Math.PI) / 180;
    const larguraOrigem = canvas.width || 1;
    const alturaOrigem = canvas.height || 1;
    const rotacionado = document.createElement("canvas");
    const trocaDimensao = Math.abs(angulo) % 180 === 90;

    rotacionado.width = trocaDimensao ? alturaOrigem : larguraOrigem;
    rotacionado.height = trocaDimensao ? larguraOrigem : alturaOrigem;

    const contexto = rotacionado.getContext("2d", { willReadFrequently: true });
    if (!contexto) return canvas;

    contexto.save();
    contexto.translate(rotacionado.width / 2, rotacionado.height / 2);
    contexto.rotate(radianos);
    contexto.drawImage(canvas, -larguraOrigem / 2, -alturaOrigem / 2);
    contexto.restore();

    return rotacionado;
}

export async function reconhecerTextoCanvasComOcrComOrientacao(canvas, extrairDatas = null) {
    const tentativas = [];
    const primeira = await reconhecerTextoCanvasComOcr(canvas);

    tentativas.push({
        ...primeira,
        canvasAnalise: canvas,
        rotacao: 0,
        scoreOrientacao: calcularScoreTextoOcrOrientacao(primeira?.texto || "", extrairDatas),
    });

    if (tentativas[0].scoreOrientacao >= 34) {
        return tentativas[0];
    }

    for (const rotacao of [90, 180, 270]) {
        const canvasRotacionado = criarCanvasRotacionado(canvas, rotacao);
        if (!canvasRotacionado || canvasRotacionado === canvas) continue;

        try {
            const resultado = await reconhecerTextoCanvasComOcr(canvasRotacionado);
            tentativas.push({
                ...resultado,
                canvasAnalise: canvasRotacionado,
                rotacao,
                scoreOrientacao: calcularScoreTextoOcrOrientacao(resultado?.texto || "", extrairDatas),
            });
        } catch {
            try {
                canvasRotacionado.width = 1;
                canvasRotacionado.height = 1;
            } catch {
                // Não bloquear a análise se não conseguir liberar o canvas.
            }
        }
    }

    return tentativas.sort((a, b) => Number(b.scoreOrientacao || 0) - Number(a.scoreOrientacao || 0))[0] || tentativas[0];
}

async function reconhecerTextoCanvasComOcr(canvas) {
    const moduloTesseract = await carregarTesseractDocumental();
    const reconhecer = moduloTesseract?.recognize || moduloTesseract?.default?.recognize;

    if (typeof reconhecer !== "function") {
        throw new Error("OCR local indisponível: função recognize não encontrada.");
    }

    const avisoOriginal = typeof console !== "undefined" ? console.warn : null;

    try {
        if (avisoOriginal) {
            console.warn = (...args) => {
                const texto = args.map((arg) => String(arg || "")).join(" ");
                if (
                    texto.includes("Image too small to scale") ||
                    texto.includes("Line cannot be recognized")
                ) {
                    return;
                }
                avisoOriginal(...args);
            };
        }

        const resultado = await reconhecer(canvas, "por", {
            logger: () => {},
            tessedit_pageseg_mode: "6",
            preserve_interword_spaces: "1",
        });

        return {
            texto: limparTextoPossivelDocumento(resultado?.data?.text || ""),
            palavras: Array.isArray(resultado?.data?.words) ? resultado.data.words : [],
            confianca: Number(resultado?.data?.confidence || 0),
        };
    } finally {
        if (avisoOriginal) {
            console.warn = avisoOriginal;
        }
    }
}
