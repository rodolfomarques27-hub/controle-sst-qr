// Fluxo de leitura e conferência OCR específico do DDS.

export function criarFluxoLeituraDds({
    normalizarTextoVerificacao,
    limparTextoPossivelDocumento,
    carregarPdfJsDocumental,
    calcularAssinaturaVisualFaixa,
    detectarAssinaturasDocumento,
    detectarAssinaturasTabelaPresenca,
    detectarLinhasHorizontaisTabelaPresenca,
    montarLinhasOcrComAssinatura,
    reconhecerTextoCanvasComOcrComOrientacao,
    arquivoPossuiArrayBuffer,
    obterNomeArquivo,
    obterMimeArquivo,
    obterExtensaoArquivo,
    limitarTextoParaSalvar,
    extrairDatasTextoDocumental,
    montarPreviaTextoDocumento,
    executarLeituraDocumentalLocal,
} = {}) {
    function detectarXVisualFaixaDds(canvas, faixa = {}) {
        if (!canvas || typeof canvas.getContext !== "function") {
            return { xVisual: false, origem: "sem_canvas" };
        }

        const contexto = canvas.getContext("2d", { willReadFrequently: true });

        if (!contexto) {
            return { xVisual: false, origem: "sem_contexto_canvas" };
        }

        const largura = canvas.width || 1;
        const altura = canvas.height || 1;
        const xInicio = Math.max(0, Math.floor(Number(faixa.x0 || 0) * largura));
        const xFim = Math.min(largura, Math.ceil(Number(faixa.x1 || 1) * largura));
        const yInicio = Math.max(0, Math.floor(Number(faixa.y0 || 0) * altura));
        const yFim = Math.min(altura, Math.ceil(Number(faixa.y1 || 1) * altura));
        const larguraRecorte = Math.max(1, xFim - xInicio);
        const alturaRecorte = Math.max(1, yFim - yInicio);

        if (larguraRecorte < 10 || alturaRecorte < 8) {
            return {
                xVisual: false,
                densidade: 0,
                densidadeEscura: 0,
                densidadeAzul: 0,
                proporcaoPrincipal: 0,
                proporcaoSecundaria: 0,
                centroRatio: 0,
                diagonaisBalanceadas: false,
                quadrantesAtivos: 0,
                origem: "recorte_insuficiente",
            };
        }

        try {
            const dados = contexto.getImageData(xInicio, yInicio, larguraRecorte, alturaRecorte).data;

            let pixelsX = 0;
            let pixelsAzuis = 0;
            let total = 0;
            let diagonalPrincipal = 0;
            let diagonalSecundaria = 0;
            let centro = 0;

            const colunas = new Set();
            const linhas = new Set();
            const quadrantes = [0, 0, 0, 0];

            for (let y = 2; y < alturaRecorte - 2; y += 1) {
                for (let x = 2; x < larguraRecorte - 2; x += 1) {
                    const i = (y * larguraRecorte + x) * 4;
                    const r = dados[i];
                    const g = dados[i + 1];
                    const b = dados[i + 2];

                    total += 1;

                    const azulCaneta = b > 70 && b > r * 1.12 && b > g * 0.82 && r < 190 && g < 205;
                    if (azulCaneta) pixelsAzuis += 1;

                    const media = (r + g + b) / 3;
                    const diferencaCanais = Math.max(r, g, b) - Math.min(r, g, b);

                    // Padrão oficial: X de ausência deve ser escuro/preto/neutro.
                    // Marca azul é tratada como rubrica/presença, não como ausência.
                    const escuroNeutro = (
                        media < 155 &&
                        diferencaCanais <= 70 &&
                        !(b > r * 1.18 && b > g * 0.92)
                    );

                    const escuroForte = r < 115 && g < 115 && b < 145;

                    if (!escuroNeutro && !escuroForte) continue;

                    pixelsX += 1;
                    colunas.add(x);
                    linhas.add(y);

                    const nx = larguraRecorte > 1 ? x / (larguraRecorte - 1) : 0;
                    const ny = alturaRecorte > 1 ? y / (alturaRecorte - 1) : 0;

                    if (Math.abs(ny - nx) <= 0.14) diagonalPrincipal += 1;
                    if (Math.abs(ny - (1 - nx)) <= 0.14) diagonalSecundaria += 1;
                    if (nx >= 0.30 && nx <= 0.70 && ny >= 0.30 && ny <= 0.70) centro += 1;

                    if (nx < 0.5 && ny < 0.5) quadrantes[0] += 1;
                    else if (nx >= 0.5 && ny < 0.5) quadrantes[1] += 1;
                    else if (nx < 0.5 && ny >= 0.5) quadrantes[2] += 1;
                    else quadrantes[3] += 1;
                }
            }

            const densidade = total ? pixelsX / total : 0;
            const densidadeEscura = densidade;
            const densidadeAzul = total ? pixelsAzuis / total : 0;
            const espalhamentoHorizontal = larguraRecorte ? colunas.size / larguraRecorte : 0;
            const espalhamentoVertical = alturaRecorte ? linhas.size / alturaRecorte : 0;
            const proporcaoPrincipal = pixelsX ? diagonalPrincipal / pixelsX : 0;
            const proporcaoSecundaria = pixelsX ? diagonalSecundaria / pixelsX : 0;
            const centroRatio = pixelsX ? centro / pixelsX : 0;
            const diagonaisBalanceadas = Math.abs(proporcaoPrincipal - proporcaoSecundaria) <= 0.18;
            const quadrantesAtivos = quadrantes.filter((valor) => valor >= 2).length;

            const xVisual = Boolean(
                pixelsX >= 8 &&
                densidade >= 0.003 &&
                densidade <= 0.18 &&
                densidadeAzul <= 0.035 &&
                espalhamentoHorizontal >= 0.11 &&
                espalhamentoVertical >= 0.13 &&
                proporcaoPrincipal >= 0.08 &&
                proporcaoSecundaria >= 0.08 &&
                (
                    centroRatio >= 0.035 ||
                    quadrantesAtivos >= 3
                ) &&
                diagonaisBalanceadas
            );

            return {
                xVisual,
                densidade,
                densidadeEscura,
                densidadeAzul,
                espalhamentoHorizontal,
                espalhamentoVertical,
                proporcaoPrincipal,
                proporcaoSecundaria,
                centroRatio,
                diagonaisBalanceadas,
                quadrantesAtivos,
                origem: "analise_visual_x_dds_preto_escuro",
            };
        } catch {
            return {
                xVisual: false,
                densidade: 0,
                densidadeEscura: 0,
                densidadeAzul: 0,
                proporcaoPrincipal: 0,
                proporcaoSecundaria: 0,
                centroRatio: 0,
                diagonaisBalanceadas: false,
                quadrantesAtivos: 0,
                origem: "erro_analise_visual_x_dds",
            };
        }
    }

    function detectarMarcacoesDdsPorDia(canvas, opcoes = {}) {
        const linhas = detectarLinhasHorizontaisTabelaPresenca(canvas, opcoes);
        const altura = canvas?.height || 1;

        if (!linhas.length || linhas.length < 4) return [];

        const resultados = [];
        const maxLinhas = Math.min(Number(opcoes?.maxLinhas || 65), linhas.length - 1);
        const indiceInicial = Number.isInteger(Number(opcoes?.indiceInicial)) ? Number(opcoes.indiceInicial) : 1;
        const x0Dias = Number.isFinite(Number(opcoes?.x0Dias)) ? Number(opcoes.x0Dias) : 0.49;
        const x1Dias = Number.isFinite(Number(opcoes?.x1Dias)) ? Number(opcoes.x1Dias) : 0.913;
        const x0Semanal = Number.isFinite(Number(opcoes?.x0Semanal)) ? Number(opcoes.x0Semanal) : 0.925;
        const x1Semanal = Number.isFinite(Number(opcoes?.x1Semanal)) ? Number(opcoes.x1Semanal) : 0.965;
        const quantidadeDias = Math.max(1, Number(opcoes?.quantidadeDias || 7));
        const larguraDia = (x1Dias - x0Dias) / quantidadeDias;

        const analisarCelula = ({ x0, x1, y0, y1, diaIndice, tipoMarcacao }) => {
            const assinatura = calcularAssinaturaVisualFaixa(canvas, {
                x0,
                x1,
                y0,
                y1,
                origem: `analise_visual_dds_${tipoMarcacao}`,
            });

            const analiseX = detectarXVisualFaixaDds(canvas, { x0, x1, y0, y1 });

            const densidade = Number(assinatura.densidade || 0);
            const densidadeAzul = Number(assinatura.densidadeAzul || 0);
            const espalhamentoHorizontal = Number(assinatura.espalhamentoHorizontal || 0);
            const espalhamentoVertical = Number(assinatura.espalhamentoVertical || 0);

            const pareceTracoSimples =
                espalhamentoHorizontal >= 0.22 &&
                espalhamentoVertical <= 0.09 &&
                densidadeAzul < 0.018;

            const assinaturaVisualDds = tipoMarcacao === "semana_completa"
                ? Boolean(assinatura.assinaturaVisual || densidade >= 0.020 || densidadeAzul >= 0.010)
                : Boolean(
                    !analiseX.xVisual &&
                    (
                        assinatura.assinaturaVisual ||
                        (
                            !pareceTracoSimples &&
                            densidadeAzul >= 0.0035 &&
                            espalhamentoHorizontal >= 0.045 &&
                            espalhamentoVertical >= 0.055
                        ) ||
                        (
                            !pareceTracoSimples &&
                            densidade >= 0.006 &&
                            espalhamentoHorizontal >= 0.04 &&
                            espalhamentoVertical >= 0.06
                        )
                    )
                );

            return {
                diaIndice,
                tipoMarcacao,
                x0: Number(x0.toFixed(4)),
                x1: Number(x1.toFixed(4)),
                y0: Number(y0.toFixed(4)),
                y1: Number(y1.toFixed(4)),
                yCentro: Number(((y0 + y1) / 2).toFixed(4)),
                assinatura_visual: assinaturaVisualDds,
                assinatura_visual_base: assinatura.assinaturaVisual,
                assinatura_densidade: densidade,
                assinatura_densidade_azul: densidadeAzul,
                assinatura_espalhamento_horizontal: espalhamentoHorizontal,
                assinatura_espalhamento_vertical: espalhamentoVertical,
                assinatura_parece_traco_simples: pareceTracoSimples,
                x_visual: tipoMarcacao === "dia" ? Boolean(analiseX.xVisual) : false,
                x_densidade: Number(analiseX.densidade || 0),
                x_densidade_escura: Number(analiseX.densidadeEscura || 0),
                x_densidade_azul: Number(analiseX.densidadeAzul || 0),
                x_proporcao_diagonal_principal: Number(analiseX.proporcaoPrincipal || 0),
                x_proporcao_diagonal_secundaria: Number(analiseX.proporcaoSecundaria || 0),
                x_centro_ratio: Number(analiseX.centroRatio || 0),
                x_diagonais_balanceadas: Boolean(analiseX.diagonaisBalanceadas),
                x_quadrantes_ativos: Number(analiseX.quadrantesAtivos || 0),
                x_escuro_forte: Boolean(analiseX.xEscuroForte),
                x_azul_formato: Boolean(analiseX.xAzulFormato),
                assinatura_origem: assinatura.origem,
                grade_calibrada_dds: true,
            };
        };

        for (let indice = indiceInicial; indice < maxLinhas; indice += 1) {
            const superior = linhas[indice];
            const inferior = linhas[indice + 1];

            if (!superior || !inferior) continue;

            const alturaLinhaPx = inferior.y - superior.y;

            if (alturaLinhaPx < 12) continue;

            const y0 = (superior.y + Math.max(2, alturaLinhaPx * 0.08)) / altura;
            const y1 = (inferior.y - Math.max(2, alturaLinhaPx * 0.08)) / altura;

            for (let diaIndice = 0; diaIndice < quantidadeDias; diaIndice += 1) {
                const margemX = Math.max(0.002, larguraDia * 0.05);
                const x0 = x0Dias + (larguraDia * diaIndice) + margemX;
                const x1 = x0Dias + (larguraDia * (diaIndice + 1)) - margemX;

                resultados.push({
                    numeroLinha: indice,
                    ...analisarCelula({
                        x0,
                        x1,
                        y0,
                        y1,
                        diaIndice,
                        tipoMarcacao: "dia",
                    }),
                });
            }

            resultados.push({
                numeroLinha: indice,
                ...analisarCelula({
                    x0: x0Semanal,
                    x1: x1Semanal,
                    y0,
                    y1,
                    diaIndice: quantidadeDias,
                    tipoMarcacao: "semana_completa",
                }),
            });
        }

        return resultados;
    }

    function normalizarTextoDdsScanner(valor = "") {
        return normalizarTextoVerificacao(String(valor || ""))
            .replace(/[^a-z0-9]+/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    }

    function gerarVariacoesCodigoDds(codigo = "") {
        const bruto = String(codigo || "").trim();
        const normalizado = normalizarTextoDdsScanner(bruto);
        const semSeparadores = normalizado.replace(/\s+/g, "");

        return Array.from(new Set([
            bruto,
            normalizado,
            semSeparadores,
            bruto.replace(/-/g, " "),
            bruto.replace(/-/g, ""),
            bruto.replace(/^DDS/i, "DDS "),
        ].map((item) => normalizarTextoDdsScanner(item)).filter((item) => item.length >= 5)));
    }

    function pontuarTextoDdsScanner(texto = "", contextoDds = {}) {
        const normalizado = normalizarTextoDdsScanner(texto);
        const indicios = [];
        let score = 0;

        if (!normalizado) {
            return { score: 0, indicios, encontrouCodigo: false, termosLocalizados: 0 };
        }

        const contem = (valor = "") => {
            const termo = normalizarTextoDdsScanner(valor);
            return termo.length >= 3 && normalizado.includes(termo);
        };

        const codigos = gerarVariacoesCodigoDds(contextoDds?.codigo || contextoDds?.codigoEsperado || "");
        const encontrouCodigo = codigos.some((codigo) => codigo && normalizado.includes(codigo));

        if (encontrouCodigo) {
            score += 45;
            indicios.push("codigo_dds");
        }

        const termosFortes = [
            ["dds", 12],
            ["dds semanal", 18],
            ["dialogo diario de seguranca", 18],
            ["dialogo de seguranca", 14],
            ["diario de seguranca", 14],
            ["safescan", 12],
            ["lista de presenca", 12],
            ["participantes", 10],
            ["codigo safescan", 10],
            ["obra", 6],
            ["periodo", 6],
            ["responsavel", 5],
        ];

        let termosLocalizados = 0;

        for (const [termo, peso] of termosFortes) {
            if (contem(termo)) {
                score += peso;
                termosLocalizados += 1;
                indicios.push(`termo:${termo}`);
            }
        }

        const empresa = contextoDds?.empresaNome || contextoDds?.empresa || "";
        const obra = contextoDds?.obraNome || contextoDds?.obra || "";
        const periodoInicio = contextoDds?.periodoInicio || "";
        const periodoFim = contextoDds?.periodoFim || "";

        if (empresa && contem(empresa)) {
            score += 14;
            indicios.push("empresa");
        }

        if (obra && contem(obra)) {
            score += 12;
            indicios.push("obra");
        }

        if (periodoInicio && contem(periodoInicio)) {
            score += 8;
            indicios.push("periodo_inicio");
        }

        if (periodoFim && contem(periodoFim)) {
            score += 8;
            indicios.push("periodo_fim");
        }

        const participantes = Array.isArray(contextoDds?.participantes) ? contextoDds.participantes : [];
        const amostraParticipantes = participantes.slice(0, 80);
        let participantesLocalizados = 0;

        for (const participante of amostraParticipantes) {
            const codigo = participante?.codigoSafescan || participante?.codigoSafeScan || participante?.codigoFuncionario || participante?.codigo || "";
            const nome = participante?.nome || "";

            if ((codigo && contem(codigo)) || (nome && contem(nome))) {
                participantesLocalizados += 1;
            }
        }

        if (participantesLocalizados > 0) {
            score += Math.min(20, participantesLocalizados * 4);
            indicios.push(`participantes:${participantesLocalizados}`);
        }

        const tokens = normalizado.match(/[a-z0-9]{3,}/g) || [];
        score += Math.min(15, Math.floor(tokens.length / 8));

        return {
            score: Math.max(0, Math.min(100, Math.round(score))),
            indicios,
            encontrouCodigo,
            termosLocalizados,
            participantesLocalizados,
        };
    }

    async function extrairTextoPdfDdsComOcrDirecionado(buffer, contextoDds = {}) {
        const avisos = [];

        if (!buffer || !buffer.byteLength || typeof document === "undefined") {
            return {
                texto: "",
                linhasOcr: [],
                paginasLidas: 0,
                totalPaginas: 0,
                assinaturasTabela: [],
                assinaturasDocumento: [],
                marcacoesDdsDias: [],
                confianca: 0,
                diagnosticoDdsOcr: {
                    score: 0,
                    origem: "dds_ocr_nao_executado",
                },
                avisos,
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
                    linhasOcr: [],
                    paginasLidas: 0,
                    totalPaginas: 0,
                    assinaturasTabela: [],
                    assinaturasDocumento: [],
                marcacoesDdsDias: [],
                    confianca: 0,
                    diagnosticoDdsOcr: {
                        score: 0,
                        origem: "dds_pdf_sem_paginas",
                    },
                    avisos: ["OCR direcionado DDS não encontrou páginas no PDF."],
                };
            }

            const paginas = totalPaginas <= 6 ? Array.from({ length: totalPaginas }, (_, indice) => indice + 1) : Array.from(new Set([1, 2, totalPaginas - 1, totalPaginas].filter((pagina) => pagina >= 1 && pagina <= totalPaginas)));
            const tentativas = [];

            async function executarPagina(numeroPagina) {
                const pagina = await pdf.getPage(numeroPagina);
                const viewportBase = pagina.getViewport({ scale: 1 });
                const escalaBase = 2.25;
                const limiteLargura = 2400;
                const limiteAltura = 1800;
                const escalaMaximaPorLargura = viewportBase.width ? limiteLargura / viewportBase.width : escalaBase;
                const escalaMaximaPorAltura = viewportBase.height ? limiteAltura / viewportBase.height : escalaBase;
                const escalaSegura = Math.max(1.5, Math.min(escalaBase, escalaMaximaPorLargura, escalaMaximaPorAltura));
                const viewport = pagina.getViewport({ scale: escalaSegura });
                const canvas = document.createElement("canvas");
                const contexto = canvas.getContext("2d", { willReadFrequently: true, alpha: false });

                if (!contexto) {
                    avisos.push(`OCR direcionado DDS não conseguiu preparar canvas da página ${numeroPagina}.`);
                    return;
                }

                canvas.width = Math.ceil(viewport.width);
                canvas.height = Math.ceil(viewport.height);
                contexto.fillStyle = "#ffffff";
                contexto.fillRect(0, 0, canvas.width, canvas.height);

                await pagina.render({ canvasContext: contexto, viewport }).promise;
                await new Promise((resolve) => setTimeout(resolve, 0));

                const resultadoOcr = await reconhecerTextoCanvasComOcrComOrientacao(canvas, extrairDatasTextoDocumental);
                const canvasAnalise = resultadoOcr?.canvasAnalise || canvas;
                const texto = limparTextoPossivelDocumento(resultadoOcr?.texto || "");
                const pontuacao = pontuarTextoDdsScanner(texto, contextoDds);
                const textoNormalizadoOcr = normalizarTextoVerificacao(texto);

                const linhasOcr = montarLinhasOcrComAssinatura(canvasAnalise, resultadoOcr?.palavras || [])
                    .map((linha) => ({
                        ...linha,
                        pagina: numeroPagina,
                        rotacao: resultadoOcr?.rotacao || 0,
                        texto: linha?.texto ? `DDS pág. ${numeroPagina}: ${linha.texto}` : linha?.texto,
                    }));

                const pareceDds = pontuacao.score >= 25 || /dds|dialogo|diálogo|safescan|lista de presenca|lista de presença/.test(textoNormalizadoOcr);
                const assinaturasTabela = pareceDds
                    ? detectarAssinaturasTabelaPresenca(canvasAnalise, { yInicio: 0.28, x0: 0.60, x1: 0.98, maxLinhas: 65 })
                        .map((assinatura) => ({ ...assinatura, pagina: numeroPagina, rotacao: resultadoOcr?.rotacao || 0 }))
                    : [];

                const marcacoesDdsDias = pareceDds
                    ? detectarMarcacoesDdsPorDia(canvasAnalise, {
                        yInicio: 0.44,
                        x0Dias: 0.49,
                        x1Dias: 0.913,
                        quantidadeDias: 7,
                        maxLinhas: 65,
                    }).map((marcacao) => ({ ...marcacao, pagina: numeroPagina, rotacao: resultadoOcr?.rotacao || 0 }))
                    : [];

                const assinaturasDocumento = detectarAssinaturasDocumento(canvasAnalise, numeroPagina, textoNormalizadoOcr)
                    .map((assinatura) => ({ ...assinatura, rotacao: resultadoOcr?.rotacao || 0 }));

                tentativas.push({
                    pagina: numeroPagina,
                    texto,
                    linhasOcr,
                    assinaturasTabela,
                    marcacoesDdsDias,
                    assinaturasDocumento,
                    confianca: Number(resultadoOcr?.confianca || 0),
                    rotacao: resultadoOcr?.rotacao || 0,
                    score: pontuacao.score,
                    pontuacao,
                });

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

            for (const numeroPagina of paginas) {
                await executarPagina(numeroPagina);
            }

            try {
                await pdf.destroy();
            } catch {
                // Liberação de memória sem bloquear o fluxo.
            }

            const ordenadas = tentativas.sort((a, b) => {
                const scoreA = Number(a.score || 0) + Math.min(20, Number(a.confianca || 0) / 5);
                const scoreB = Number(b.score || 0) + Math.min(20, Number(b.confianca || 0) / 5);
                return scoreB - scoreA;
            });

            const melhor = ordenadas[0] || null;
            const textoFinal = limparTextoPossivelDocumento(
                ordenadas
                    .filter((item) => item?.texto)
                    .slice(0, 2)
                    .map((item) => `Página ${item.pagina}: ${item.texto}`)
                    .join(" ")
            );

            const linhasOcr = ordenadas.flatMap((item) => item?.linhasOcr || []).slice(0, 120);
            const assinaturasTabela = ordenadas.flatMap((item) => item?.assinaturasTabela || []).slice(0, 60);
            const marcacoesDdsDias = ordenadas.flatMap((item) => item?.marcacoesDdsDias || []).slice(0, 520);
            const assinaturasDocumento = ordenadas.flatMap((item) => item?.assinaturasDocumento || []).slice(0, 30);
            const score = Number(melhor?.score || 0);

            avisos.push(`OCR direcionado DDS analisou página(s) ${paginas.join(", ")} em resolução ampliada para buscar código/cabeçalho do DDS.`);

            if (melhor?.rotacao) {
                avisos.push(`OCR direcionado DDS selecionou leitura com rotação ${melhor.rotacao}° na página ${melhor.pagina}.`);
            }

            if (score < 35) {
                avisos.push("OCR direcionado DDS não encontrou código/cabeçalho com segurança suficiente.");
            }

            return {
                texto: textoFinal,
                linhasOcr,
                paginasLidas: paginas.length,
                totalPaginas,
                assinaturasTabela,
                marcacoesDdsDias,
                assinaturasDocumento,
                confianca: Number(melhor?.confianca || 0),
                diagnosticoDdsOcr: {
                    score,
                    pagina: melhor?.pagina || 0,
                    rotacao: melhor?.rotacao || 0,
                    encontrouCodigo: Boolean(melhor?.pontuacao?.encontrouCodigo),
                    termosLocalizados: Number(melhor?.pontuacao?.termosLocalizados || 0),
                    participantesLocalizados: Number(melhor?.pontuacao?.participantesLocalizados || 0),
                    indicios: melhor?.pontuacao?.indicios || [],
                    origem: "dds_ocr_direcionado",
                },
                avisos,
            };
        } catch (error) {
            return {
                texto: "",
                linhasOcr: [],
                paginasLidas: 0,
                totalPaginas: 0,
                assinaturasTabela: [],
                assinaturasDocumento: [],
                marcacoesDdsDias: [],
                confianca: 0,
                diagnosticoDdsOcr: {
                    score: 0,
                    origem: "dds_ocr_erro",
                },
                avisos: [`OCR direcionado DDS indisponível: ${error?.message || "erro desconhecido"}.`],
            };
        }
    }

    async function executarLeituraDdsLocal({
        arquivo = null,
        arquivoNome = "",
        mimeType = "",
        contextoDds = {},
    } = {}) {
        const leituraBase = await executarLeituraDocumentalLocal({ arquivo, arquivoNome, mimeType });
        const nome = obterNomeArquivo(arquivo, arquivoNome);
        const mime = obterMimeArquivo(arquivo, mimeType);
        const extensao = obterExtensaoArquivo({ arquivo, arquivoNome: nome });

        const textoBase = [
            leituraBase?.textoExtraido || "",
            leituraBase?.textoPrevia || "",
            ...((leituraBase?.linhasOcr || []).map((linha) => linha?.texto || "")),
        ].join(" ");

        const pontuacaoBase = pontuarTextoDdsScanner(textoBase, contextoDds);
        let leituraDirecionada = null;

        if (arquivoPossuiArrayBuffer(arquivo) && (mime === "application/pdf" || extensao === "pdf")) {
            try {
                const buffer = await arquivo.arrayBuffer();
                leituraDirecionada = await extrairTextoPdfDdsComOcrDirecionado(buffer, contextoDds);
            } catch (error) {
                leituraDirecionada = {
                    texto: "",
                    linhasOcr: [],
                    paginasLidas: 0,
                    totalPaginas: leituraBase?.totalPaginas || 0,
                    assinaturasTabela: [],
                    assinaturasDocumento: [],
                marcacoesDdsDias: [],
                    confianca: 0,
                    diagnosticoDdsOcr: {
                        score: 0,
                        origem: "dds_ocr_erro",
                    },
                    avisos: [`OCR direcionado DDS falhou: ${error?.message || "erro desconhecido"}.`],
                };
            }
        }

        const pontuacaoDirecionada = leituraDirecionada?.diagnosticoDdsOcr || {
            ...pontuacaoBase,
            origem: "leitura_base",
        };

        const scoreBase = Number(pontuacaoBase?.score || 0);
        const scoreDirecionado = Number(pontuacaoDirecionada?.score || 0);
        const textoDirecionado = limparTextoPossivelDocumento(leituraDirecionada?.texto || "");
        const deveUsarDirecionada = Boolean(
            textoDirecionado &&
            (
                scoreDirecionado >= Math.max(28, scoreBase + 8) ||
                pontuacaoDirecionada.encontrouCodigo ||
                scoreDirecionado >= 45
            )
        );

        if (!deveUsarDirecionada) {
            return {
                ...leituraBase,
                diagnosticoDdsOcr: {
                    score: scoreBase,
                    pagina: 0,
                    rotacao: 0,
                    encontrouCodigo: Boolean(pontuacaoBase?.encontrouCodigo),
                    termosLocalizados: Number(pontuacaoBase?.termosLocalizados || 0),
                    participantesLocalizados: Number(pontuacaoBase?.participantesLocalizados || 0),
                    indicios: pontuacaoBase?.indicios || [],
                    origem: "leitura_base",
                    scoreDirecionado,
                },
                avisos: [
                    ...(leituraBase?.avisos || []),
                    ...(leituraDirecionada?.avisos || []),
                    "Leitura direcionada DDS executada como apoio, mas a leitura base permaneceu como referência principal.",
                ],
            };
        }

        const textoSeguro = limitarTextoParaSalvar(textoDirecionado);
        const confiancaBase = Number(leituraBase?.confianca || 0);
        const confiancaDirecionada = Number(leituraDirecionada?.confianca || 0);
        const confiancaFinal = Math.max(
            confiancaBase,
            Math.min(92, Math.round((confiancaDirecionada + scoreDirecionado) / 2))
        );

        return {
            ...leituraBase,
            tipoLeitura: "dds_ocr_direcionado",
            textoExtraido: textoSeguro,
            textoPrevia: montarPreviaTextoDocumento(textoSeguro),
            linhasOcr: Array.isArray(leituraDirecionada?.linhasOcr) ? leituraDirecionada.linhasOcr.slice(0, 120) : [],
            assinaturasTabela: Array.isArray(leituraDirecionada?.assinaturasTabela) ? leituraDirecionada.assinaturasTabela.slice(0, 60) : [],
            marcacoesDdsDias: Array.isArray(leituraDirecionada?.marcacoesDdsDias) ? leituraDirecionada.marcacoesDdsDias.slice(0, 520) : [],
            assinaturasDocumento: Array.isArray(leituraDirecionada?.assinaturasDocumento) ? leituraDirecionada.assinaturasDocumento.slice(0, 30) : [],
            paginasLidas: leituraDirecionada?.paginasLidas || leituraBase?.paginasLidas || 0,
            totalPaginas: leituraDirecionada?.totalPaginas || leituraBase?.totalPaginas || 0,
            confianca: confiancaFinal,
            diagnosticoDdsOcr: {
                ...pontuacaoDirecionada,
                score: scoreDirecionado,
                scoreBase,
                origem: "dds_ocr_direcionado",
            },
            avisos: [
                ...(leituraBase?.avisos || []),
                ...(leituraDirecionada?.avisos || []),
                `Leitura direcionada DDS selecionada com score ${scoreDirecionado}/100.`,
            ],
        };
    }

    return {
        executarLeituraDdsLocal,
    };
}
