import {
    criarNomeArquivoResumoConsolidacaoColaborador,
    montarHtmlRelatorioConsolidacaoColaborador,
} from "./consolidacaoColaboradorRelatorioHtmlService.js";

export const CONSOLIDACAO_COLABORADOR_RELATORIO_PDF_SCHEMA_VERSION =
    "consolidacao-colaborador-relatorio-pdf-v1";

const PDF_LARGURA_MM =
    297;

const PDF_ALTURA_MM =
    210;

const ESCALA_RENDERIZACAO =
    1.5;

const TOLERANCIA_OVERFLOW_PX =
    2;

const TIMEOUT_CARREGAMENTO_MS =
    15000;

const TIMEOUT_CAPTURA_PAGINA_MS =
    30000;

const TEMPO_ESTABILIZACAO_LAYOUT_MS =
    60;

function textoSeguro(
    valor
) {
    return String(
        valor ?? ""
    ).trim();
}

function aguardarComTimeout({
    promise,
    timeoutMs,
    mensagem,
}) {
    let timeoutId =
        null;

    return Promise.race([
        promise,

        new Promise(
            (
                _resolve,
                reject
            ) => {
                timeoutId =
                    setTimeout(
                        () => {
                            reject(
                                new Error(
                                    mensagem
                                )
                            );
                        },
                        timeoutMs
                    );
            }
        ),
    ]).finally(
        () => {
            if (
                timeoutId !==
                null
            ) {
                clearTimeout(
                    timeoutId
                );
            }
        }
    );
}

/* ============================================================
   G9.2-R9M.3 — TOTAL DE PÁGINAS SOMENTE DO ROOT
   ============================================================ */

/*
 * Não procurar data-total-paginas no HTML inteiro.
 *
 * O CSS contém seletores como:
 *
 * .relatorio-root[data-total-paginas="1"]
 *
 * e uma busca global pode interpretar esse valor como
 * quantidade física do relatório.
 *
 * A fonte canônica é exclusivamente:
 *
 * <main data-consolidacao-relatorio ... data-total-paginas="N">
 */

function extrairTotalPaginasHtml(
    html
) {
    const textoHtml =
        String(
            html ?? ""
        );

    const raiz =
        textoHtml.match(
            /<main\b[^>]*\bdata-consolidacao-relatorio\b[^>]*>/i
        )?.[0];

    const match =
        raiz?.match(
            /\bdata-total-paginas="(\d+)"/i
        );

    const total =
        Number(
            match?.[1]
        );

    if (
        !Number.isInteger(
            total
        ) ||
        total <=
            0
    ) {
        throw new Error(
            "O renderer HTML não informou uma quantidade válida de páginas no elemento raiz do relatório."
        );
    }

    return total;
}

export function prepararRelatorioPdfConsolidacaoColaborador({
    estruturaExportacao,
    heroUrl,
} = {}) {
    const heroTratado =
        textoSeguro(
            heroUrl
        );

    if (!heroTratado) {
        throw new Error(
            "Hero oficial do relatório não informado."
        );
    }

    const html =
        montarHtmlRelatorioConsolidacaoColaborador({
            estruturaExportacao,
            heroUrl:
                heroTratado,
        });

    const nomeArquivo =
        criarNomeArquivoResumoConsolidacaoColaborador(
            estruturaExportacao
        );

    const totalPaginas =
        extrairTotalPaginasHtml(
            html
        );

    return {
        schemaVersion:
            CONSOLIDACAO_COLABORADOR_RELATORIO_PDF_SCHEMA_VERSION,

        html,

        nomeArquivo,

        totalPaginas,

        selecaoId:
            estruturaExportacao
                ?.exportacao
                ?.selecaoId ||
            null,

        heroUrl:
            heroTratado,
    };
}

function criarFrameRenderizacao() {
    const iframe =
        document.createElement(
            "iframe"
        );

    iframe.setAttribute(
        "aria-hidden",
        "true"
    );

    iframe.setAttribute(
        "tabindex",
        "-1"
    );

    iframe.style.position =
        "fixed";

    iframe.style.left =
        "-20000px";

    iframe.style.top =
        "0";

    iframe.style.width =
        "1200px";

    iframe.style.height =
        "900px";

    iframe.style.border =
        "0";

    iframe.style.margin =
        "0";

    iframe.style.padding =
        "0";

    iframe.style.opacity =
        "0";

    iframe.style.pointerEvents =
        "none";

    iframe.style.zIndex =
        "-2147483647";

    return iframe;
}

async function carregarHtmlNoFrame({
    iframe,
    html,
}) {
    const carregamento =
        new Promise(
            (
                resolve,
                reject
            ) => {
                iframe.onload =
                    () => {
                        const documento =
                            iframe.contentDocument;

                        const raiz =
                            documento?.querySelector(
                                "[data-consolidacao-relatorio]"
                            );

                        const paginas =
                            documento?.querySelectorAll(
                                "[data-pagina-relatorio]"
                            ).length ||
                            0;

                        if (
                            !raiz ||
                            paginas <=
                                0
                        ) {
                            return;
                        }

                        resolve();
                    };

                iframe.onerror =
                    () =>
                        reject(
                            new Error(
                                "Falha ao carregar o documento temporário do relatório."
                            )
                        );
            }
        );

    iframe.srcdoc =
        html;

    document.body.appendChild(
        iframe
    );

    await aguardarComTimeout({
        promise:
            carregamento,

        timeoutMs:
            TIMEOUT_CARREGAMENTO_MS,

        mensagem:
            "Tempo excedido ao carregar o documento temporário do relatório.",
    });

    const documento =
        iframe.contentDocument;

    if (
        !documento ||
        !documento.body
    ) {
        throw new Error(
            "Documento temporário do relatório não ficou acessível."
        );
    }

    return documento;
}

async function aguardarImagem(
    imagem
) {
    if (
        imagem.complete
    ) {
        if (
            imagem.naturalWidth >
            0
        ) {
            return;
        }

        throw new Error(
            "Uma imagem do relatório não pôde ser carregada."
        );
    }

    await aguardarComTimeout({
        promise:
            new Promise(
                (
                    resolve,
                    reject
                ) => {
                    imagem.addEventListener(
                        "load",
                        resolve,
                        {
                            once:
                                true,
                        }
                    );

                    imagem.addEventListener(
                        "error",
                        () =>
                            reject(
                                new Error(
                                    "Uma imagem do relatório não pôde ser carregada."
                                )
                            ),
                        {
                            once:
                                true,
                        }
                    );
                }
            ),

        timeoutMs:
            TIMEOUT_CARREGAMENTO_MS,

        mensagem:
            "Tempo excedido ao carregar uma imagem do relatório.",
    });
}

async function aguardarRecursosDocumento(
    documento
) {
    const imagens =
        Array.from(
            documento.images ||
            []
        );

    await Promise.all(
        imagens.map(
            aguardarImagem
        )
    );

    if (
        documento.fonts
            ?.ready
    ) {
        await aguardarComTimeout({
            promise:
                documento.fonts.ready,

            timeoutMs:
                TIMEOUT_CARREGAMENTO_MS,

            mensagem:
                "Tempo excedido ao aguardar as fontes do relatório.",
        });
    }

    await new Promise(
        (
            resolve
        ) => {
            setTimeout(
                resolve,
                TEMPO_ESTABILIZACAO_LAYOUT_MS
            );
        }
    );
}

function validarElementoDentro({
    elemento,
    limite,
    mensagem,
}) {
    if (
        !elemento ||
        !limite
    ) {
        return;
    }

    const elementoRect =
        elemento.getBoundingClientRect();

    const limiteRect =
        limite.getBoundingClientRect();

    if (
        elementoRect.right >
            limiteRect.right +
                TOLERANCIA_OVERFLOW_PX ||
        elementoRect.bottom >
            limiteRect.bottom +
                TOLERANCIA_OVERFLOW_PX ||
        elementoRect.left <
            limiteRect.left -
                TOLERANCIA_OVERFLOW_PX ||
        elementoRect.top <
            limiteRect.top -
                TOLERANCIA_OVERFLOW_PX
    ) {
        throw new Error(
            mensagem
        );
    }
}

function validarPaginaSemOverflow({
    pagina,
    indicePagina,
}) {
    /*
     * ============================================================
     * G9.2-PDF-DIAG-003 — TELEMETRIA REAL DO OVERFLOW A4
     * ============================================================
     *
     * Esta instrumentação NÃO altera o layout nem a regra de
     * bloqueio. Apenas descreve exatamente qual dimensão física
     * excedeu a página e mede os principais blocos internos.
     */

    const paginaRect =
        pagina.getBoundingClientRect();

    /*
     * ============================================================
     * G9.2-PDF-DIAG-005 — CSS COMPUTADO REAL
     * ============================================================
     */

    const janelaDocumento =
        pagina.ownerDocument
            ?.defaultView ||
        window;

    const rootRelatorio =
        pagina.closest(
            ".relatorio-root"
        );

    const estiloPagina =
        janelaDocumento.getComputedStyle(
            pagina
        );

    const estiloRoot =
        rootRelatorio
            ? janelaDocumento.getComputedStyle(
                  rootRelatorio
              )
            : null;

    const hero =
        pagina.querySelector(
            ".hero-relatorio"
        );

    const tabela =
        pagina.querySelector(
            ".tabela-container"
        );

    const conteudo =
        pagina.querySelector(
            ".conteudo-relatorio"
        );

    const observacoes =
        pagina.querySelector(
            ".observacoes-documentais"
        );

    const rodapeBloco =
        pagina.querySelector(
            ".rodape-relatorio-bloco"
        );

    const rodape =
        pagina.querySelector(
            ".rodape-relatorio"
        );

    const medirElemento = (
        elemento
    ) => {
        if (!elemento) {
            return null;
        }

        const rect =
            elemento.getBoundingClientRect();

        return {
            clientWidth:
                elemento.clientWidth,

            clientHeight:
                elemento.clientHeight,

            scrollWidth:
                elemento.scrollWidth,

            scrollHeight:
                elemento.scrollHeight,

            rectWidth:
                Number(
                    rect.width.toFixed(3)
                ),

            rectHeight:
                Number(
                    rect.height.toFixed(3)
                ),

            top:
                Number(
                    rect.top.toFixed(3)
                ),

            bottom:
                Number(
                    rect.bottom.toFixed(3)
                ),
        };
    };

    const excessoHorizontal =
        Math.max(
            0,
            pagina.scrollWidth -
                pagina.clientWidth
        );

    const excessoVertical =
        Math.max(
            0,
            pagina.scrollHeight -
                pagina.clientHeight
        );

    if (
        excessoHorizontal >
            TOLERANCIA_OVERFLOW_PX ||
        excessoVertical >
            TOLERANCIA_OVERFLOW_PX
    ) {
        const diagnostico = {
            pagina:
                indicePagina,

            seletorPaginaUnica: {
                dataTotalPaginas:
                    rootRelatorio
                        ?.dataset
                        ?.totalPaginas ||
                    null,

                seletorCasa:
                    Boolean(
                        rootRelatorio
                            ?.matches(
                                '.relatorio-root[data-total-paginas="1"]'
                            )
                    ),
            },

            cssPagina: {
                display:
                    estiloPagina.display,

                boxSizing:
                    estiloPagina.boxSizing,

                width:
                    estiloPagina.width,

                height:
                    estiloPagina.height,

                minHeight:
                    estiloPagina.minHeight,

                maxHeight:
                    estiloPagina.maxHeight,

                gridTemplateRows:
                    estiloPagina.gridTemplateRows,

                rowGap:
                    estiloPagina.rowGap,

                columnGap:
                    estiloPagina.columnGap,

                paddingTop:
                    estiloPagina.paddingTop,

                paddingRight:
                    estiloPagina.paddingRight,

                paddingBottom:
                    estiloPagina.paddingBottom,

                paddingLeft:
                    estiloPagina.paddingLeft,

                overflowX:
                    estiloPagina.overflowX,

                overflowY:
                    estiloPagina.overflowY,
            },

            cssRoot: estiloRoot
                ? {
                      display:
                          estiloRoot.display,

                      gap:
                          estiloRoot.gap,

                      padding:
                          estiloRoot.padding,
                  }
                : null,

            viewportPagina: {
                clientWidth:
                    pagina.clientWidth,

                clientHeight:
                    pagina.clientHeight,

                scrollWidth:
                    pagina.scrollWidth,

                scrollHeight:
                    pagina.scrollHeight,

                rectWidth:
                    Number(
                        paginaRect.width.toFixed(
                            3
                        )
                    ),

                rectHeight:
                    Number(
                        paginaRect.height.toFixed(
                            3
                        )
                    ),
            },

            excesso: {
                horizontalPx:
                    excessoHorizontal,

                verticalPx:
                    excessoVertical,
            },

            hero:
                medirElemento(
                    hero
                ),

            conteudo:
                medirElemento(
                    conteudo
                ),

            tabela:
                medirElemento(
                    tabela
                ),

            observacoes:
                medirElemento(
                    observacoes
                ),

            rodapeBloco:
                medirElemento(
                    rodapeBloco
                ),

            rodape:
                medirElemento(
                    rodape
                ),
        };

        console.error(
            "[CONSOLIDACAO PDF][A4 OVERFLOW]",
            diagnostico
        );

        throw new Error(
            `Página ${indicePagina} excedeu os limites físicos A4. ` +
            `Excesso horizontal=${excessoHorizontal}px; ` +
            `vertical=${excessoVertical}px. ` +
            `TotalPaginasDOM=${rootRelatorio?.dataset?.totalPaginas || "?"}; ` +
            `Seletor1Pagina=${rootRelatorio?.matches('.relatorio-root[data-total-paginas="1"]') ? "SIM" : "NAO"}. ` +
            `CSS pagina: gridRows=${estiloPagina.gridTemplateRows}; ` +
            `rowGap=${estiloPagina.rowGap}; ` +
            `padding=${estiloPagina.paddingTop}/${estiloPagina.paddingRight}/${estiloPagina.paddingBottom}/${estiloPagina.paddingLeft}; ` +
            `Página client=${pagina.clientWidth}x${pagina.clientHeight}px; ` +
            `scroll=${pagina.scrollWidth}x${pagina.scrollHeight}px. ` +
            `Conteúdo=${conteudo?.clientWidth || 0}x${conteudo?.clientHeight || 0}px / ` +
            `scroll=${conteudo?.scrollWidth || 0}x${conteudo?.scrollHeight || 0}px. ` +
            `Tabela=${tabela?.clientWidth || 0}x${tabela?.clientHeight || 0}px / ` +
            `scroll=${tabela?.scrollWidth || 0}x${tabela?.scrollHeight || 0}px. ` +
            `Atenções=${observacoes?.clientWidth || 0}x${observacoes?.clientHeight || 0}px / ` +
            `scroll=${observacoes?.scrollWidth || 0}x${observacoes?.scrollHeight || 0}px. ` +
            `RodapéBloco=${rodapeBloco?.clientWidth || 0}x${rodapeBloco?.clientHeight || 0}px / ` +
            `scroll=${rodapeBloco?.scrollWidth || 0}x${rodapeBloco?.scrollHeight || 0}px.`
        );
    }

    const linhas =
        Array.from(
            pagina.querySelectorAll(
                "[data-documento-relatorio]"
            )
        );

    const ultimaLinha =
        linhas.at(
            -1
        );

    if (
        tabela &&
        ultimaLinha
    ) {
        validarElementoDentro({
            elemento:
                ultimaLinha,

            limite:
                tabela,

            mensagem:
                `Página ${indicePagina} cortou conteúdo da tabela documental.`,
        });
    }

    if (rodape) {
        validarElementoDentro({
            elemento:
                rodape,

            limite:
                pagina,

            mensagem:
                `Página ${indicePagina} cortou o rodapé do relatório.`,
        });
    }
}
function prepararPaginaParaCaptura(
    pagina
) {
    pagina.style.borderRadius =
        "0";

    pagina.style.boxShadow =
        "none";

    pagina.style.margin =
        "0";
}

async function carregarDependenciasPdf() {
    const [
        html2canvasModulo,
        jsPdfModulo,
    ] =
        await Promise.all([
            import(
                "html2canvas"
            ),

            import(
                "jspdf"
            ),
        ]);

    const html2canvas =
        html2canvasModulo
            ?.default;

    const jsPDF =
        jsPdfModulo
            ?.default ||
        jsPdfModulo
            ?.jsPDF;

    if (
        typeof html2canvas !==
        "function"
    ) {
        throw new Error(
            "html2canvas não ficou disponível para geração do relatório."
        );
    }

    if (
        typeof jsPDF !==
        "function"
    ) {
        throw new Error(
            "jsPDF não ficou disponível para geração do relatório."
        );
    }

    return {
        html2canvas,
        jsPDF,
    };
}

export async function criarPdfConsolidacaoColaboradorService({
    estruturaExportacao,
    heroUrl,
} = {}) {
    const preparado =
        prepararRelatorioPdfConsolidacaoColaborador({
            estruturaExportacao,
            heroUrl,
        });

    if (
        typeof document ===
            "undefined" ||
        !document.body
    ) {
        throw new Error(
            "A geração física do PDF requer execução no navegador."
        );
    }

    const iframe =
        criarFrameRenderizacao();

    try {
        const documento =
            await carregarHtmlNoFrame({
                iframe,

                html:
                    preparado.html,
            });

        await aguardarRecursosDocumento(
            documento
        );

        const paginas =
            Array.from(
                documento.querySelectorAll(
                    "[data-pagina-relatorio]"
                )
            );

        if (
            paginas.length !==
            preparado.totalPaginas
        ) {
            throw new Error(
                `Quantidade física de páginas divergente: HTML=${preparado.totalPaginas}; DOM=${paginas.length}.`
            );
        }

        const {
            html2canvas,
            jsPDF,
        } =
            await carregarDependenciasPdf();

        const pdf =
            new jsPDF(
                "l",
                "mm",
                "a4"
            );

        for (
            let indice = 0;
            indice <
            paginas.length;
            indice += 1
        ) {
            const pagina =
                paginas[indice];

            prepararPaginaParaCaptura(
                pagina
            );
            /*
             * ====================================================
             * R12.10-LAYOUT-SEMANTICO-ATENCOES
             * ====================================================
             *
             * PADRÃO:
             *
             * Linha 1:
             * NR-XX Nome do documento
             *
             * Linha 2:
             * motivo / situação
             *
             * Exemplo:
             *
             * NR-07 ASO - Atestado de Saúde Ocupacional
             * Está vencido.
             *
             * Também corrige o recuo horizontal de TODOS os cards.
             * ====================================================
             */

            {
                const itensAtencoesR1210 =
                    Array.from(
                        pagina.querySelectorAll(
                            ".observacoes-documentais__item"
                        )
                    );

                const separarTituloEDetalheR1210 =
                    (
                        tituloOriginal,
                        detalheOriginal
                    ) => {
                        const titulo =
                            String(
                                tituloOriginal ?? ""
                            ).trim();

                        const detalhe =
                            String(
                                detalheOriginal ?? ""
                            ).trim();

                        if (!titulo) {
                            return {
                                titulo,
                                detalhe,
                            };
                        }

                        /*
                         * =================================================
                         * VENCIDO / VENCIDA
                         * =================================================
                         *
                         * ANTES:
                         *
                         * NR-07 ASO - Atestado ... está vencido.
                         *
                         * DEPOIS:
                         *
                         * NR-07 ASO - Atestado ...
                         * Está vencido.
                         */
                        const vencido =
                            titulo.match(
                                /^(.+?)\s+est[aá]\s+vencid([oa])(?:\.\s*)?$/i
                            );

                        if (
                            vencido?.[1]
                        ) {
                            return {
                                titulo:
                                    vencido[1].trim(),

                                detalhe:
                                    vencido[2]
                                        .toLowerCase() === "a"
                                        ? "Está vencida."
                                        : "Está vencido.",
                            };
                        }

                        /*
                         * =================================================
                         * AUSENTE
                         * =================================================
                         */
                        const ausente =
                            titulo.match(
                                /^(.+?)\s+est[aá]\s+ausente(?:\.\s*)?$/i
                            );

                        if (
                            ausente?.[1]
                        ) {
                            return {
                                titulo:
                                    ausente[1].trim(),

                                detalhe:
                                    "Está ausente.",
                            };
                        }

                        /*
                         * =================================================
                         * A VENCER
                         * =================================================
                         */
                        const aVencer =
                            titulo.match(
                                /^(.+?)\s+est[aá]\s+(?:pr[oó]ximo\s+do\s+vencimento|a\s+vencer)(?:\.\s*)?$/i
                            );

                        if (
                            aVencer?.[1]
                        ) {
                            return {
                                titulo:
                                    aVencer[1].trim(),

                                detalhe:
                                    "Está próximo do vencimento.",
                            };
                        }

                        /*
                         * =================================================
                         * AUSÊNCIA OBRIGATÓRIA
                         * =================================================
                         *
                         * Caso já esteja no padrão correto, preserva.
                         */
                        const ausenciaObrigatoria =
                            titulo.match(
                                /^Documento\s+obrigat[oó]rio\s+ausente\s*:\s*(.+?)(?:\.\s*)?$/i
                            );

                        if (
                            ausenciaObrigatoria?.[1]
                        ) {
                            return {
                                titulo:
                                    ausenciaObrigatoria[1].trim(),

                                detalhe:
                                    "Documento obrigatório ausente",
                            };
                        }

                        return {
                            titulo,
                            detalhe,
                        };
                    };

                for (
                    const itemAtencao of itensAtencoesR1210
                ) {
                    const ponto =
                        itemAtencao.querySelector(
                            ".observacoes-documentais__ponto"
                        );

                    const conteudo =
                        itemAtencao.querySelector(
                            ".observacoes-documentais__conteudo"
                        );

                    const titulo =
                        itemAtencao.querySelector(
                            ".observacoes-documentais__documento"
                        );

                    const detalhe =
                        itemAtencao.querySelector(
                            ".observacoes-documentais__detalhe"
                        );

                    const estado =
                        itemAtencao.querySelector(
                            ".observacoes-documentais__estado"
                        );

                    if (
                        !conteudo ||
                        !titulo ||
                        !detalhe ||
                        !estado
                    ) {
                        continue;
                    }


                    /*
                     * =================================================
                     * 1. SEMÂNTICA DO CONTEÚDO
                     * =================================================
                     */

                    const separado =
                        separarTituloEDetalheR1210(
                            titulo.textContent,
                            detalhe.textContent
                        );

                    titulo.textContent =
                        separado.titulo;

                    detalhe.textContent =
                        separado.detalhe;

                    /*
                     * =================================================
                     * 2. GRID — TODOS OS CARDS PARA A ESQUERDA
                     * =================================================
                     *
                     * O diagnóstico real mediu:
                     *
                     * 14.3576px | conteúdo | status
                     *
                     * A primeira coluna era a antiga bolinha.
                     *
                     * Agora:
                     *
                     * conteúdo | status
                     */

                    itemAtencao.style.setProperty(
                        "display",
                        "grid",
                        "important"
                    );

                    itemAtencao.style.setProperty(
                        "grid-template-columns",
                        "minmax(0, 1fr) auto",
                        "important"
                    );

                    itemAtencao.style.setProperty(
                        "align-items",
                        "center",
                        "important"
                    );

                    itemAtencao.style.setProperty(
                        "width",
                        "100%",
                        "important"
                    );

                    itemAtencao.style.setProperty(
                        "box-sizing",
                        "border-box",
                        "important"
                    );

                    /*
                     * Pequeno respiro após a divisória.
                     */
                    itemAtencao.style.setProperty(
                        "padding-left",
                        "0.8mm",
                        "important"
                    );

                    itemAtencao.style.setProperty(
                        "padding-right",
                        "0.8mm",
                        "important"
                    );

                    itemAtencao.style.setProperty(
                        "column-gap",
                        "1mm",
                        "important"
                    );

                    /*
                     * =================================================
                     * 3. BOLINHA — SEM ESPAÇO RESERVADO
                     * =================================================
                     */

                    if (ponto) {
                        ponto.style.setProperty(
                            "display",
                            "none",
                            "important"
                        );

                        ponto.style.setProperty(
                            "width",
                            "0",
                            "important"
                        );

                        ponto.style.setProperty(
                            "height",
                            "0",
                            "important"
                        );

                        ponto.style.setProperty(
                            "margin",
                            "0",
                            "important"
                        );
                    }

                    /*
                     * =================================================
                     * 4. BLOCO DAS DUAS LINHAS
                     * =================================================
                     */

                    conteudo.style.setProperty(
                        "grid-column",
                        "1 / 2",
                        "important"
                    );

                    conteudo.style.setProperty(
                        "display",
                        "flex",
                        "important"
                    );

                    conteudo.style.setProperty(
                        "flex-direction",
                        "column",
                        "important"
                    );

                    conteudo.style.setProperty(
                        "align-items",
                        "flex-start",
                        "important"
                    );

                    conteudo.style.setProperty(
                        "justify-content",
                        "center",
                        "important"
                    );

                    conteudo.style.setProperty(
                        "justify-self",
                        "stretch",
                        "important"
                    );

                                        /*
                     * R12.11-CENTRO-VERTICAL
                     *
                     * O bloco ocupa toda a altura disponível
                     * da célula. O justify-content:center já
                     * existente centraliza NR + detalhe
                     * verticalmente dentro do retângulo.
                     */
                    conteudo.style.setProperty(
                        "align-self",
                        "stretch",
                        "important"
                    );

                    conteudo.style.setProperty(
                        "height",
                        "100%",
                        "important"
                    );

                    conteudo.style.setProperty(
                        "box-sizing",
                        "border-box",
                        "important"
                    );

                    conteudo.style.setProperty(
                        "width",
                        "100%",
                        "important"
                    );

                    /*
                     * Espaço claro entre NR e motivo.
                     */
                    conteudo.style.setProperty(
                        "row-gap",
                        "0.9mm",
                        "important"
                    );

                    conteudo.style.setProperty(
                        "column-gap",
                        "0",
                        "important"
                    );

                    conteudo.style.setProperty(
                        "margin",
                        "0",
                        "important"
                    );

                    conteudo.style.setProperty(
                        "padding",
                        "0",
                        "important"
                    );

                    /*
                     * Remove todos os deslocamentos antigos.
                     */
                    conteudo.style.setProperty(
                        "position",
                        "static",
                        "important"
                    );

                    conteudo.style.setProperty(
                        "left",
                        "auto",
                        "important"
                    );

                    conteudo.style.setProperty(
                        "right",
                        "auto",
                        "important"
                    );

                    conteudo.style.setProperty(
                        "top",
                        "auto",
                        "important"
                    );

                    conteudo.style.setProperty(
                        "bottom",
                        "auto",
                        "important"
                    );

                    conteudo.style.setProperty(
                        "transform",
                        "none",
                        "important"
                    );

                    /*
                     * =================================================
                     * 5. TÍTULO
                     * =================================================
                     */

                    titulo.style.setProperty(
                        "display",
                        "block",
                        "important"
                    );

                    titulo.style.setProperty(
                        "margin",
                        "0",
                        "important"
                    );

                    titulo.style.setProperty(
                        "padding",
                        "0",
                        "important"
                    );

                    titulo.style.setProperty(
                        "white-space",
                        "nowrap",
                        "important"
                    );

                    titulo.style.setProperty(
                        "text-align",
                        "left",
                        "important"
                    );

                    /*
                     * =================================================
                     * 6. DETALHE
                     * =================================================
                     */

                    detalhe.style.setProperty(
                        "display",
                        "block",
                        "important"
                    );

                    detalhe.style.setProperty(
                        "margin",
                        "0",
                        "important"
                    );

                    detalhe.style.setProperty(
                        "margin-top",
                        "0",
                        "important"
                    );

                    detalhe.style.setProperty(
                        "padding",
                        "0",
                        "important"
                    );

                    detalhe.style.setProperty(
                        "white-space",
                        "nowrap",
                        "important"
                    );

                    detalhe.style.setProperty(
                        "text-align",
                        "left",
                        "important"
                    );

                    /*
                     * =================================================
                     * 7. STATUS
                     * =================================================
                     */

                    estado.style.setProperty(
                        "grid-column",
                        "2 / 3",
                        "important"
                    );

                    estado.style.setProperty(
                        "justify-self",
                        "end",
                        "important"
                    );

                    estado.style.setProperty(
                        "align-self",
                        "center",
                        "important"
                    );

                    estado.style.setProperty(
                        "margin-left",
                        "0",
                        "important"
                    );

                    estado.style.setProperty(
                        "margin-right",
                        "0",
                        "important"
                    );

                    estado.style.setProperty(
                        "white-space",
                        "nowrap",
                        "important"
                    );
                }
            }

                        /*
             * ============================================================
             * C4A — VALIDAÇÃO DE OVERFLOW RESTAURADA
             * ============================================================
             *
             * Proteção estrutural antes da captura.
             *
             * Não altera layout.
             * Não altera posição.
             * Não altera texto.
             * ============================================================
             */
            validarPaginaSemOverflow({
                pagina,

                indicePagina:
                    indice +
                    1,
            });
/*
             * ============================================================
             * R12.16-CENTRO-OPTICO-FINAL
             * ============================================================
             *
             * O box do conteúdo já está geometricamente centralizado.
             *
             * A correção abaixo compensa SOMENTE a diferença óptica
             * causada pelas métricas tipográficas das duas linhas.
             *
             * Medição visual atual:
             * - centro do retângulo: ~70,5px
             * - centro visível do texto: ~73,8px
             * - correção: aproximadamente -3,3px
             *
             * NÃO altera X.
             * ============================================================
             */

            for (
                const itemR1216 of pagina.querySelectorAll(
                    ".observacoes-documentais__item"
                )
            ) {
                const conteudoR1216 =
                    itemR1216.querySelector(
                        ".observacoes-documentais__conteudo"
                    );

                if (!conteudoR1216) {
                    continue;
                }

                /*
                 * ÚNICA ALTERAÇÃO VISUAL.
                 *
                 * SUBIR 3,3px.
                 */
                conteudoR1216.style.setProperty(
                    "transform",
                    "translateY(-3.3px)",
                    "important"
                );
            }

            /*
             * ============================================================
             * R12.17C-VISIBLE-TEXT-PTBR
             * ============================================================
             *
             * Normalização exclusivamente de TEXT NODES visíveis.
             *
             * Não altera atributos, classes, slugs ou regras de negócio.
             * ============================================================
             */

            {
                const documentoR1217C =
                    pagina.ownerDocument;

                const janelaR1217C =
                    documentoR1217C.defaultView;

                if (janelaR1217C) {
                    const preservarCaixaR1217C =
                        (
                            original,
                            corrigido
                        ) => {
                            const origem =
                                String(
                                    original ?? ""
                                );

                            if (
                                origem &&
                                origem ===
                                    origem.toUpperCase()
                            ) {
                                return corrigido
                                    .toUpperCase();
                            }

                            const primeira =
                                origem.charAt(0);

                            if (
                                primeira &&
                                primeira ===
                                    primeira.toUpperCase() &&
                                primeira !==
                                    primeira.toLowerCase()
                            ) {
                                return (
                                    corrigido
                                        .charAt(0)
                                        .toUpperCase() +
                                    corrigido.slice(1)
                                );
                            }

                            return corrigido;
                        };

                    const corrigirTextoR1217C =
                        (
                            valor
                        ) => {
                            let texto =
                                String(
                                    valor ?? ""
                                );

                            /*
                             * =================================================
                             * FRASES
                             * =================================================
                             */

                            const frasesR1217C =
                                [
                                    [
                                        /\besta vencido\b/gi,
                                        "está vencido",
                                    ],
                                    [
                                        /\besta vencida\b/gi,
                                        "está vencida",
                                    ],
                                    [
                                        /\besta ausente\b/gi,
                                        "está ausente",
                                    ],
                                    [
                                        /\besta a vencer\b/gi,
                                        "está a vencer",
                                    ],
                                    [
                                        /\besta proximo do vencimento\b/gi,
                                        "está próximo do vencimento",
                                    ],
                                    [
                                        /\besta proxima do vencimento\b/gi,
                                        "está próxima do vencimento",
                                    ],
                                ];

                            for (
                                const [
                                    regexR1217C,
                                    corrigidoR1217C,
                                ] of frasesR1217C
                            ) {
                                texto =
                                    texto.replace(
                                        regexR1217C,
                                        (
                                            encontradoR1217C
                                        ) =>
                                            preservarCaixaR1217C(
                                                encontradoR1217C,
                                                corrigidoR1217C
                                            )
                                    );
                            }

                            /*
                             * =================================================
                             * VOCABULÁRIO
                             * =================================================
                             */

                            const palavrasR1217C =
                                [
                                    [
                                        /\batencao\b/gi,
                                        "atenção",
                                    ],
                                    [
                                        /\batencoes\b/gi,
                                        "atenções",
                                    ],
                                    [
                                        /\bconferencia\b/gi,
                                        "conferência",
                                    ],
                                    [
                                        /\bemissao\b/gi,
                                        "emissão",
                                    ],
                                    [
                                        /\bsituacao\b/gi,
                                        "situação",
                                    ],
                                    [
                                        /\brealizacao\b/gi,
                                        "realização",
                                    ],
                                    [
                                        /\bintegracao\b/gi,
                                        "integração",
                                    ],
                                    [
                                        /\bmobilizacao\b/gi,
                                        "mobilização",
                                    ],
                                    [
                                        /\bfuncao\b/gi,
                                        "função",
                                    ],
                                    [
                                        /\bconstrucao\b/gi,
                                        "construção",
                                    ],
                                    [
                                        /\bsaude\b/gi,
                                        "saúde",
                                    ],
                                    [
                                        /\bmaquinas\b/gi,
                                        "máquinas",
                                    ],
                                    [
                                        /\bsinalizacao\b/gi,
                                        "sinalização",
                                    ],
                                    [
                                        /\bceu\b/gi,
                                        "céu",
                                    ],
                                    [
                                        /\bresiduos\b/gi,
                                        "resíduos",
                                    ],
                                    [
                                        /\bevidencias\b/gi,
                                        "evidências",
                                    ],
                                    [
                                        /\bselecao\b/gi,
                                        "seleção",
                                    ],
                                    [
                                        /\brelatorio\b/gi,
                                        "relatório",
                                    ],
                                    [
                                        /\bconsolidacao\b/gi,
                                        "consolidação",
                                    ],
                                    [
                                        /\bpagina\b/gi,
                                        "página",
                                    ],
                                    [
                                        /\bpaginas\b/gi,
                                        "páginas",
                                    ],
                                    [
                                        /\bhistorico\b/gi,
                                        "histórico",
                                    ],
                                    [
                                        /\bobrigatorio\b/gi,
                                        "obrigatório",
                                    ],
                                    [
                                        /\bobrigatoria\b/gi,
                                        "obrigatória",
                                    ],
                                    [
                                        /\bcertidao\b/gi,
                                        "certidão",
                                    ],
                                    [
                                        /\bmovimentacao\b/gi,
                                        "movimentação",
                                    ],
                                ];

                            for (
                                const [
                                    regexR1217C,
                                    corrigidoR1217C,
                                ] of palavrasR1217C
                            ) {
                                texto =
                                    texto.replace(
                                        regexR1217C,
                                        (
                                            encontradoR1217C
                                        ) =>
                                            preservarCaixaR1217C(
                                                encontradoR1217C,
                                                corrigidoR1217C
                                            )
                                    );
                            }

                            return texto;
                        };

                    /*
                     * =====================================================
                     * PERCORRER SOMENTE NÓS DE TEXTO
                     * =====================================================
                     */

                    const walkerR1217C =
                        documentoR1217C.createTreeWalker(
                            pagina,
                            janelaR1217C
                                .NodeFilter
                                .SHOW_TEXT
                        );

                    const alteracoesR1217C =
                        [];

                    let nodeR1217C =
                        walkerR1217C.nextNode();

                    while (nodeR1217C) {
                        const parentR1217C =
                            nodeR1217C.parentElement;

                        const tagR1217C =
                            parentR1217C
                                ?.tagName
                                ?.toUpperCase();

                        /*
                         * Nunca modificar código/estilo.
                         */
                        const ignorarR1217C =
                            tagR1217C === "STYLE" ||
                            tagR1217C === "SCRIPT" ||
                            tagR1217C === "NOSCRIPT" ||
                            tagR1217C === "TEXTAREA";

                        if (!ignorarR1217C) {
                            const antesR1217C =
                                nodeR1217C.nodeValue ?? "";

                            const depoisR1217C =
                                corrigirTextoR1217C(
                                    antesR1217C
                                );

                            if (
                                depoisR1217C !==
                                antesR1217C
                            ) {
                                nodeR1217C.nodeValue =
                                    depoisR1217C;

                                if (import.meta.env.DEV) {
                                    alteracoesR1217C.push({
                                        antes:
                                            antesR1217C.trim(),

                                        depois:
                                            depoisR1217C.trim(),
                                    });
                                }
                            }
                        }

                        nodeR1217C =
                            walkerR1217C.nextNode();
                    }

                    /*
                     * =====================================================
                     * AUDITORIA DO TEXTO VISÍVEL RESULTANTE
                     * =====================================================
                     */

                    if (import.meta.env.DEV) {
                        const textoFinalR1217C =
                            pagina.innerText ?? "";

                        const suspeitosR1217C =
                            [
                                "atencao",
                                "atencoes",
                                "conferencia",
                                "emissao",
                                "situacao",
                                "esta vencido",
                                "esta vencida",
                                "esta ausente",
                                "integracao",
                                "mobilizacao",
                                "construcao",
                                "saude",
                                "maquinas",
                                "sinalizacao",
                                "residuos",
                            ].filter(
                                (
                                    termoR1217C
                                ) =>
                                    textoFinalR1217C
                                        .toLowerCase()
                                        .includes(
                                            termoR1217C
                                        )
                            );

                        console.log(
                            "[SafeScan][PTBR-R12.17C]",
                            {
                                alteracoes:
                                    alteracoesR1217C,

                                suspeitosRestantes:
                                    suspeitosR1217C,
                            }
                        );
                    }
                }
            }

            const canvas =
                await aguardarComTimeout({
                    promise:
                        html2canvas(
                            pagina,
                            {
                                scale:
                                    ESCALA_RENDERIZACAO,

                                useCORS:
                                    true,

                                allowTaint:
                                    false,

                                backgroundColor:
                                    "#ffffff",

                                logging:
                                    false,

                                width:
                                    pagina.scrollWidth,

                                height:
                                    pagina.scrollHeight,

                                windowWidth:
                                    Math.max(
                                        pagina.scrollWidth,
                                        1123
                                    ),

                                windowHeight:
                                    Math.max(
                                        pagina.scrollHeight,
                                        794
                                    ),
                            }
                        ),

                    timeoutMs:
                        TIMEOUT_CAPTURA_PAGINA_MS,

                    mensagem:
                        `Tempo excedido ao capturar a página ${indice + 1} do relatório PDF.`,
                });

            if (
                !canvas ||
                canvas.width <=
                    0 ||
                canvas.height <=
                    0
            ) {
                throw new Error(
                    `Página ${indice + 1} não produziu uma captura válida.`
                );
            }

            if (
                indice >
                0
            ) {
                pdf.addPage(
                    "a4",
                    "l"
                );
            }

            const imagem =
                canvas.toDataURL(
                    "image/png"
                );

            if (
                !imagem.startsWith(
                    "data:image/png"
                )
            ) {
                throw new Error(
                    `Página ${indice + 1} não produziu uma imagem PNG válida.`
                );
            }

            pdf.addImage(
                imagem,
                "PNG",
                0,
                0,
                PDF_LARGURA_MM,
                PDF_ALTURA_MM,
                undefined,
                "FAST"
            );
        }

        const blob =
            pdf.output(
                "blob"
            );

        if (
            !(blob instanceof Blob) ||
            blob.size <=
                0
        ) {
            throw new Error(
                "jsPDF não produziu um Blob PDF válido."
            );
        }

        return {
            schemaVersion:
                CONSOLIDACAO_COLABORADOR_RELATORIO_PDF_SCHEMA_VERSION,

            blob,

            nomeArquivo:
                preparado
                    .nomeArquivo,

            totalPaginas:
                paginas.length,

            selecaoId:
                preparado
                    .selecaoId,

            mimeType:
                "application/pdf",

            tamanhoBytes:
                blob.size,
        };
    }
    finally {
        iframe.remove();
    }
}
