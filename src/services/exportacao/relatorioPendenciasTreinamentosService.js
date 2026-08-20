// Relatório de pendências de treinamentos com layout e paginação próprios.
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import heroPendenciasTreinamentosObrasUrl from "../../assets/heroes/relatorios/hero-pendencias-treinamentos-obras-v1.png";

const PDF_LARGURA_MM = 297;
const PDF_ALTURA_MM = 210;
const ESCALA_RENDERIZACAO = 1.5;
const TOLERANCIA_OVERFLOW_PX = 2;

function escaparHTML(valor) {
    return String(valor ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function agruparPendenciasPorEmpresaRelatorio(pendencias = []) {
    const mapa = new Map();

    pendencias.forEach((pendencia) => {
        const empresaNome =
            String(
                pendencia.empresaNome ||
                pendencia.empresa ||
                "Empresa não informada"
            ).trim() || "Empresa não informada";

        const chave =
            String(
                pendencia.empresaId ||
                empresaNome
            )
                .trim()
                .toLowerCase();

        if (!mapa.has(chave)) {
            mapa.set(chave, {
                id: pendencia.empresaId || chave,
                nome: empresaNome,
                cnpj: pendencia.empresaCnpj || "",
                responsavel: pendencia.empresaResponsavel || "",
                logoUrl: pendencia.empresaLogoUrl || "",
                pendencias: [],
            });
        }

        const empresa = mapa.get(chave);

        empresa.cnpj =
            empresa.cnpj ||
            pendencia.empresaCnpj ||
            "";

        empresa.responsavel =
            empresa.responsavel ||
            pendencia.empresaResponsavel ||
            "";

        empresa.logoUrl =
            empresa.logoUrl ||
            pendencia.empresaLogoUrl ||
            "";

        empresa.pendencias.push(pendencia);
    });

    return Array
        .from(mapa.values())
        .sort((a, b) => a.nome.localeCompare(b.nome));
}

function chavePendenciaRelatorio(situacao = "") {
    const texto =
        String(situacao || "")
            .toLowerCase();

    if (texto.includes("vencido")) return "vencido";
    if (texto.includes("vencer")) return "vencendo";
    if (texto.includes("pend")) return "pendente";

    return "outro";
}

function classePendenciaRelatorio(situacao = "") {
    const chave =
        chavePendenciaRelatorio(situacao);

    if (chave === "vencido") return "status-critico";
    if (chave === "vencendo") return "status-alerta";
    if (chave === "pendente") return "status-info";

    return "status-neutro";
}

function calcularResumoPendenciasRelatorio(pendencias = []) {
    const colaboradoresUnicos =
        new Set();

    const funcoesUnicas =
        new Set();

    return pendencias.reduce(
        (acc, pendencia) => {
            const chave =
                chavePendenciaRelatorio(
                    pendencia.situacao
                );

            acc.total += 1;

            if (chave === "pendente") {
                acc.pendentes += 1;
            }

            if (chave === "vencido") {
                acc.vencidos += 1;
            }

            if (chave === "vencendo") {
                acc.vencendo += 1;
            }

            if (
                pendencia.colaboradorId ||
                pendencia.colaborador ||
                pendencia.codigo
            ) {
                colaboradoresUnicos.add(
                    String(
                        pendencia.colaboradorId ||
                        pendencia.codigo ||
                        pendencia.colaborador
                    )
                );
            }

            if (pendencia.funcao) {
                funcoesUnicas.add(
                    String(pendencia.funcao)
                );
            }

            acc.colaboradores =
                colaboradoresUnicos.size;

            acc.funcoes =
                funcoesUnicas.size;

            return acc;
        },
        {
            total: 0,
            pendentes: 0,
            vencidos: 0,
            vencendo: 0,
            colaboradores: 0,
            funcoes: 0,
        }
    );
}

const ICONES_PENDENCIAS = {
    escudo: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3 5 6v5c0 4.6 2.9 8.8 7 10 4.1-1.2 7-5.4 7-10V6l-7-3Z"/>
            <path d="m9.5 12 1.8 1.8 3.7-4"/>
        </svg>
    `,

    empresa: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 21h18"/>
            <path d="M8 21V9.2c0-.8.46-1.52 1.18-1.86L14 5l4.82 2.34C19.54 7.68 20 8.4 20 9.2V21"/>
            <path d="M4.5 21v-7.4c0-.73.39-1.4 1.02-1.76L8 10.45"/>
            <path d="M11 10.5h1.2M15 10.5h1.2M11 13.5h1.2M15 13.5h1.2M13 21v-3.2h3V21"/>
        </svg>
    `,

    cnpj: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="5" y="3" width="14" height="18" rx="2"/>
            <path d="M9 8h6M9 12h6M9 16h3"/>
        </svg>
    `,

    responsavel: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="8" r="4"/>
            <path d="M4 21c1.8-4 5-6 8-6s6.2 2 8 6"/>
        </svg>
    `,

    data: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="4" y="5" width="16" height="16" rx="2"/>
            <path d="M16 3v4M8 3v4M4 10h16"/>
        </svg>
    `,

    sistema: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3 5 6v5c0 4.6 2.9 8.8 7 10 4.1-1.2 7-5.4 7-10V6l-7-3Z"/>
            <path d="m9.5 12 1.8 1.8 3.7-4"/>
        </svg>
    `,

    total: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3ZM8 11c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3Z"/>
            <path d="M8 13c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13Z"/>
        </svg>
    `,

    pendente: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M1 21h22L12 2 1 21Z"/>
            <path d="M12 9v5M12 17h.01"/>
        </svg>
    `,

    vencido: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="4" y="5" width="16" height="16" rx="2"/>
            <path d="M16 3v4M8 3v4M4 10h16M9 14l6 6M15 14l-6 6"/>
        </svg>
    `,

    vencer: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="9"/>
            <path d="M12 7v6l4 2"/>
        </svg>
    `,

    colaboradores: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="8" r="4"/>
            <path d="M4 21c1.8-4 5-6 8-6s6.2 2 8 6"/>
        </svg>
    `,

    funcoes: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 7h16v13H4z"/>
            <path d="M9 7V4h6v3M4 11h16M10 14h4"/>
        </svg>
    `,
};

function montarCartaoResumoRelatorio({
    icone,
    titulo,
    valor,
    classe,
}) {
    return `
        <article class="resumo-card ${classe}">
            <span class="resumo-card__icone">
                ${icone}
            </span>

            <span class="resumo-card__texto">
                <small>
                    ${escaparHTML(titulo)}
                </small>

                <strong>
                    ${escaparHTML(valor)}
                </strong>
            </span>
        </article>
    `;
}
function obterIniciaisEmpresaPendenciasRelatorio(
    nome = ""
) {
    const partes =
        String(nome || "")
            .trim()
            .split(/\s+/)
            .filter(Boolean);

    const iniciais =
        partes
            .slice(0, 2)
            .map((parte) => parte.charAt(0))
            .join("")
            .toUpperCase();

    return iniciais || "EM";
}

function montarLogoEmpresaPendenciasRelatorio(
    empresa = {}
) {
    if (empresa.logoUrl) {
        return `
            <img
                class="empresa-logo__imagem"
                src="${escaparHTML(empresa.logoUrl)}"
                alt="Logo ${escaparHTML(
                    empresa.nome ||
                    "Empresa"
                )}"
            />
        `;
    }

    return `
        <span class="empresa-logo__iniciais">
            ${escaparHTML(
                obterIniciaisEmpresaPendenciasRelatorio(
                    empresa.nome
                )
            )}
        </span>
    `;
}

function montarCabecalhoEmpresaPendenciasRelatorio(
    contratanteCabecalho = null,
    dataEmissao = "",
    titulo = "Relatório de pendências de treinamentos"
) {
    return `
        <header
            class="cabecalho-relatorio"
            title="Emitido em ${escaparHTML(dataEmissao)}"
        >
            <div
                class="marca-safescan"
                aria-label="SafeScan Brasil"
            >
                <svg
                    class="marca-safescan__simbolo"
                    viewBox="0 0 48 48"
                    role="img"
                    aria-hidden="true"
                >
                    <rect
                        x="3"
                        y="3"
                        width="42"
                        height="42"
                        rx="12"
                        fill="none"
                        stroke="#ffffff"
                        stroke-width="3.5"
                    />

                    <path
                        d="M14 25.5 21 32l13-17"
                        fill="none"
                        stroke="#ffffff"
                        stroke-width="4"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    />
                </svg>

                <span class="marca-safescan__texto">
                    <strong>SAFESCAN</strong>
                    <small>BRASIL</small>
                </span>
            </div>

            <div class="titulo-relatorio">
                <h1 data-titulo-relatorio>
                    ${escaparHTML(titulo)}
                </h1>

                <p data-subtitulo-relatorio>
                    Visão de pendências por empresa e colaborador
                </p>
            </div>

            <div
                class="marca-contratante"
                aria-label="Contratante: ${escaparHTML(
                    contratanteCabecalho?.nome ||
                    "Idealiza Cidades"
                )}"
                title="Contratante: ${escaparHTML(
                    contratanteCabecalho?.nome ||
                    "Idealiza Cidades"
                )}"
            >
                ${montarLogoEmpresaPendenciasRelatorio(
                    contratanteCabecalho &&
                    typeof contratanteCabecalho === "object"
                        ? contratanteCabecalho
                        : {
                            nome: "Idealiza Cidades",
                            logoUrl: "",
                        }
                )}
            </div>
        </header>
    `;
}
function montarFiltrosPendenciasTreinamentosRelatorio(
    filtros = {}
) {
    return `
        <section
            class="filtros-pendencias"
            data-remover-continuacao
        >
            <span class="filtros-pendencias__rotulo">
                Filtros
            </span>

            <div class="filtro-inline">
                <small>Busca</small>
                <strong>
                    ${escaparHTML(
                        filtros.busca ||
                        "-"
                    )}
                </strong>
            </div>

            <div class="filtro-inline">
                <small>Empresa</small>
                <strong>
                    ${escaparHTML(
                        filtros.empresa ||
                        "Todas"
                    )}
                </strong>
            </div>

            <div class="filtro-inline">
                <small>Classificação</small>
                <strong>
                    ${escaparHTML(
                        filtros.classificacao ||
                        "Todos"
                    )}
                </strong>
            </div>

            <div class="filtro-inline">
                <small>Colaboradores</small>
                <strong>
                    ${escaparHTML(
                        filtros.colaboradoresFiltrados ||
                        "-"
                    )}
                </strong>
            </div>

            <div class="filtro-inline">
                <small>Pendências</small>
                <strong>
                    ${escaparHTML(
                        filtros.pendenciasEncontradas ||
                        "-"
                    )}
                </strong>
            </div>
        </section>
    `;
}
function montarTabelaPendenciasTreinamentosRelatorio(
    linhasTabela = ""
) {
    return `
        <section class="bloco-tabela">

            <div class="bloco-tabela__topo">

                <h2>
                    <span class="bloco-tabela__titulo-principal">
                        Lista de pendências:
                    </span>

                    <span class="bloco-tabela__titulo-detalhe">
                        (Treinamentos pendentes, vencidos ou a vencer conforme a matriz aplicada por função).
                    </span>
                </h2>

            </div>

            <table class="tabela-pendencias-treinamentos">

                <colgroup>
                    <col class="col-numero" />
                    <col class="col-colaborador" />
                    <col class="col-funcao" />
                    <col class="col-treinamento" />
                    <col class="col-situacao" />
                    <col class="col-vencimento" />

                </colgroup>

                <thead>
                    <tr>
                        <th><span>#</span></th>
                        <th><span>Colaborador</span></th>
                        <th><span>Função</span></th>
                        <th><span>Treinamento</span></th>
                        <th><span>Situação</span></th>
                        <th><span>Vencimento</span></th>

                    </tr>
                </thead>

                <tbody data-corpo-pendencias>
                    ${
                        linhasTabela ||
                        `
                            <tr>
                                <td colspan="6">
                                    Nenhuma pendência encontrada.
                                </td>
                            </tr>
                        `
                    }
                </tbody>

            </table>

        </section>
    `;
}

function montarRodapePendenciasRelatorio(
    dataEmissao = ""
) {
    return `
        <footer class="rodape-relatorio">
            <span>
                Gerado pelo SafeScan Brasil
            </span>

            <span>
                ${escaparHTML(dataEmissao)}
            </span>

            <span data-rodape-pagina>
                Paginação automática
            </span>
        </footer>
    `;
}
function montarPaginaEmpresaPendenciasRelatorio(
    empresa = {},
    contratanteCabecalho = null,
    indiceEmpresa = 0,
    dataEmissao = "",
    filtros = {},
    titulo = ""
) {
    const pendenciasEmpresa =
        Array.isArray(empresa.pendencias)
            ? empresa.pendencias
            : [];

    const resumo =
        calcularResumoPendenciasRelatorio(
            pendenciasEmpresa
        );

    const linhasTabela =
        pendenciasEmpresa
            .map(
                (pendencia, indice) => `
                    <tr data-registro-pendencia="1">
                        <td>
                            <span class="celula-numero-optica">
                                ${indice + 1}
                            </span>
                        </td>

                        <td class="texto-forte">
                            <span class="celula-conteudo-optico">
                                ${escaparHTML(
                                    pendencia.colaborador ||
                                    "-"
                                )}
                            </span>
                        </td>

                        <td>
                            <span class="celula-conteudo-optico">
                                ${escaparHTML(
                                    pendencia.funcao ||
                                    "-"
                                )}
                            </span>
                        </td>

                        <td class="texto-forte">
                            <span class="celula-conteudo-optico">
                                ${escaparHTML(
                                    pendencia.treinamento ||
                                    "-"
                                )}
                            </span>
                        </td>

                        <td>
                            <span
                                class="
                                    celula-conteudo-optico
                                    status-texto
                                    ${classePendenciaRelatorio(
                                        pendencia.situacao
                                    )}
                                "
                            >
                                ${escaparHTML(
                                    pendencia.situacao ||
                                    "-"
                                )}
                            </span>
                        </td>

                        <td>
                            <span class="celula-conteudo-optico">
                                ${escaparHTML(
                                    pendencia.vencimento ||
                                    "-"
                                )}
                            </span>
                        </td>


                    </tr>
                `
            )
            .join("");

    const empresaCnpj =
        empresa.cnpj
            ? ` • ${escaparHTML(empresa.cnpj)}`
            : "";

    return `
        <section
            class="pagina-relatorio"
            data-pagina-pendencias="1"
            data-pagina-origem="1"
            data-empresa-indice="${indiceEmpresa}"
        >
            ${montarCabecalhoEmpresaPendenciasRelatorio(
                contratanteCabecalho,
                dataEmissao,
                titulo
            )}

            <section class="resumo-pendencias">
                <article class="resumo-contexto-empresa">
                    <span class="resumo-contexto-logo">
                        ${montarLogoEmpresaPendenciasRelatorio(
                            empresa
                        )}
                    </span>

                    <span class="resumo-contexto-texto">
                        <strong>
                            ${escaparHTML(
                                empresa.nome ||
                                "-"
                            )}
                        </strong>

                        <small>
                            CNPJ${empresaCnpj || " • -"}
                        </small>

                        <span>
                            ${escaparHTML(
                                resumo.colaboradores
                            )}
                            colaborador(es)
                        </span>
                    </span>
                </article>

                ${montarCartaoResumoRelatorio({
                    icone:
                        ICONES_PENDENCIAS.total,

                    titulo:
                        "Total",

                    valor:
                        resumo.total,

                    classe:
                        "resumo-card--total",
                })}

                ${montarCartaoResumoRelatorio({
                    icone:
                        ICONES_PENDENCIAS.pendente,

                    titulo:
                        "Pendentes",

                    valor:
                        resumo.pendentes,

                    classe:
                        "resumo-card--pendente",
                })}

                ${montarCartaoResumoRelatorio({
                    icone:
                        ICONES_PENDENCIAS.vencido,

                    titulo:
                        "Vencidos",

                    valor:
                        resumo.vencidos,

                    classe:
                        "resumo-card--vencido",
                })}

                ${montarCartaoResumoRelatorio({
                    icone:
                        ICONES_PENDENCIAS.vencer,

                    titulo:
                        "A vencer",

                    valor:
                        resumo.vencendo,

                    classe:
                        "resumo-card--vencer",
                })}
            </section>

            ${montarFiltrosPendenciasTreinamentosRelatorio(
                filtros
            )}

            ${montarTabelaPendenciasTreinamentosRelatorio(
                linhasTabela
            )}

            ${montarRodapePendenciasRelatorio(
                dataEmissao
            )}
        </section>
    `;
}
function paginaTemOverflow(pagina) {
    return (
        pagina.scrollHeight >
            pagina.clientHeight +
            TOLERANCIA_OVERFLOW_PX ||
        pagina.scrollWidth >
            pagina.clientWidth +
            TOLERANCIA_OVERFLOW_PX
    );
}

function criarPaginaContinuacao(paginaAtual) {
    const clone =
        paginaAtual.cloneNode(true);

    clone.dataset.paginaOrigem =
        "0";

    clone.classList.add(
        "pagina-relatorio--continuacao"
    );

    clone
        .querySelectorAll(
            "[data-remover-continuacao]"
        )
        .forEach(
            (elemento) =>
                elemento.remove()
        );

    const marcador =
        clone.querySelector(
            "[data-marcador-relatorio]"
        );

    if (marcador) {
        marcador.textContent =
            "Continuação";
    }

    const subtitulo =
        clone.querySelector(
            "[data-subtitulo-relatorio]"
        );

    if (subtitulo) {
        subtitulo.textContent =
            "Continuação automática conforme a capacidade física da folha A4.";
    }

    const corpo =
        clone.querySelector(
            "[data-corpo-pendencias]"
        );

    if (!corpo) {
        throw new Error(
            "Tabela de continuação do relatório não encontrada."
        );
    }

    corpo.innerHTML =
        "";

    paginaAtual.insertAdjacentElement(
        "afterend",
        clone
    );

    return clone;
}

function paginarEmpresaPendencias(
    paginaInicial
) {
    let paginaAtual =
        paginaInicial;

    let seguranca =
        0;

    while (
        paginaTemOverflow(
            paginaAtual
        )
    ) {
        seguranca += 1;

        if (seguranca > 100) {
            throw new Error(
                "Paginação interrompida por excesso de páginas de continuação."
            );
        }

        const corpoAtual =
            paginaAtual.querySelector(
                "[data-corpo-pendencias]"
            );

        if (!corpoAtual) {
            throw new Error(
                "Corpo da tabela de pendências não encontrado."
            );
        }

        let paginaSeguinte =
            paginaAtual.nextElementSibling;

        const mesmaEmpresa =
            paginaSeguinte
                ?.dataset
                ?.empresaIndice ===
            paginaAtual
                .dataset
                .empresaIndice;

        const ehPaginaPendencias =
            paginaSeguinte
                ?.dataset
                ?.paginaPendencias ===
            "1";

        const ehContinuacao =
            paginaSeguinte
                ?.dataset
                ?.paginaOrigem ===
            "0";

        if (
            !paginaSeguinte ||
            !mesmaEmpresa ||
            !ehPaginaPendencias ||
            !ehContinuacao
        ) {
            paginaSeguinte =
                criarPaginaContinuacao(
                    paginaAtual
                );
        }

        const corpoSeguinte =
            paginaSeguinte.querySelector(
                "[data-corpo-pendencias]"
            );

        if (!corpoSeguinte) {
            throw new Error(
                "Corpo da tabela da página seguinte não encontrado."
            );
        }

        let movimentos =
            0;

        while (
            paginaTemOverflow(
                paginaAtual
            )
        ) {
            const ultimaLinha =
                corpoAtual.lastElementChild;

            if (!ultimaLinha) {
                break;
            }

            corpoSeguinte.insertBefore(
                ultimaLinha,
                corpoSeguinte.firstElementChild
            );

            movimentos += 1;

            if (movimentos > 10000) {
                throw new Error(
                    "Paginação interrompida por excesso de movimentações de linhas."
                );
            }
        }

        if (
            paginaTemOverflow(
                paginaAtual
            )
        ) {
            throw new Error(
                "Cabeçalho ou conteúdo fixo excede a capacidade física da folha A4."
            );
        }

        if (
            !corpoSeguinte.children.length
        ) {
            throw new Error(
                "A paginação criou uma página de continuação sem registros."
            );
        }

        paginaAtual =
            paginaSeguinte;
    }
}

function paginarRelatorioPendenciasTreinamentos(
    documento
) {
    const paginasOriginais =
        Array.from(
            documento.querySelectorAll(
                '[data-pagina-pendencias="1"][data-pagina-origem="1"]'
            )
        );

    if (!paginasOriginais.length) {
        throw new Error(
            "Nenhuma página de pendências foi encontrada para paginação."
        );
    }

    paginasOriginais.forEach(
        (pagina) =>
            paginarEmpresaPendencias(
                pagina
            )
    );

    const paginasFinais =
        Array.from(
            documento.querySelectorAll(
                '[data-pagina-pendencias="1"]'
            )
        );

    paginasFinais.forEach(
        (pagina, indice) => {
            if (
                paginaTemOverflow(
                    pagina
                )
            ) {
                throw new Error(
                    `Overflow residual detectado na página ${indice + 1}.`
                );
            }

            const rodapePagina =
                pagina.querySelector(
                    "[data-rodape-pagina]"
                );

            if (rodapePagina) {
                rodapePagina.textContent =
                    `Página ${indice + 1} de ${paginasFinais.length}`;
            }
        }
    );

    return paginasFinais;
}

async function aguardarImagensRelatorio(
    documento,
    tempoMaximo = 6000
) {
    const imagens =
        Array.from(
            documento?.images ||
            []
        );

    if (!imagens.length) {
        return;
    }

    const carregamentos =
        imagens.map(
            (imagem) => {
                if (imagem.complete) {
                    return Promise.resolve();
                }

                return new Promise(
                    (resolve) => {
                        const finalizar =
                            () =>
                                resolve();

                        imagem.addEventListener(
                            "load",
                            finalizar,
                            {
                                once: true,
                            }
                        );

                        imagem.addEventListener(
                            "error",
                            finalizar,
                            {
                                once: true,
                            }
                        );
                    }
                );
            }
        );

    await Promise.race([
        Promise.all(
            carregamentos
        ),
        new Promise(
            (resolve) =>
                setTimeout(
                    resolve,
                    tempoMaximo
                )
        ),
    ]);
}

async function aguardarLayoutRelatorio(
    janela
) {
    await new Promise(
        (resolve) =>
            janela.setTimeout(
                resolve,
                100
            )
    );

    await new Promise(
        (resolve) =>
            janela.requestAnimationFrame(
                () =>
                    janela.requestAnimationFrame(
                        resolve
                    )
            )
    );
}

async function baixarRelatorioPendenciasHtmlComoPdf({
    html,
    nomeArquivo,
}) {
    const iframe =
        document.createElement(
            "iframe"
        );

    iframe.style.position =
        "fixed";

    iframe.style.left =
        "-10000px";

    iframe.style.top =
        "0";

    iframe.style.width = "1300px";

    iframe.style.height = "950px";

    iframe.style.border =
        "0";

    iframe.style.background =
        "#ffffff";

    iframe.style.pointerEvents =
        "none";

    iframe.style.zIndex =
        "-1";

    iframe.setAttribute(
        "aria-hidden",
        "true"
    );

    document.body.appendChild(
        iframe
    );

    try {
        const janela =
            iframe.contentWindow;

        const documento =
            janela?.document;

        if (
            !janela ||
            !documento
        ) {
            throw new Error(
                "Documento temporário do relatório indisponível."
            );
        }

        documento.open();
        documento.write(html);
        documento.close();

        await aguardarLayoutRelatorio(
            janela
        );

        try {
            await documento
                .fonts
                ?.ready;
        } catch {
            // Fontes do sistema.
        }

        await aguardarImagensRelatorio(
            documento,
            6000
        );

        await aguardarLayoutRelatorio(
            janela
        );

        const paginas =
            paginarRelatorioPendenciasTreinamentos(
                documento
            );

        await aguardarLayoutRelatorio(
            janela
        );

        const pdf =
            new jsPDF("l", "mm", "a4");

        for (
            let indice = 0;
            indice < paginas.length;
            indice += 1
        ) {
            const pagina =
                paginas[indice];

            if (
                paginaTemOverflow(
                    pagina
                )
            ) {
                throw new Error(
                    `A página ${indice + 1} excedeu o limite físico antes da captura.`
                );
            }

            const larguraPx =
                Math.max(
                    1,
                    Math.ceil(
                        pagina.clientWidth
                    )
                );

            const alturaPx =
                Math.max(
                    1,
                    Math.ceil(
                        pagina.clientHeight
                    )
                );

            const canvas =
                await html2canvas(
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
                            larguraPx,

                        height:
                            alturaPx,

                        windowWidth:
                            Math.max(larguraPx, 1300),

                        windowHeight:
                            Math.max(alturaPx, 950),

                        scrollX:
                            0,

                        scrollY:
                            0,
                    }
                );

            if (indice > 0) {
                pdf.addPage();
            }

            const imagem =
                canvas.toDataURL(
                    "image/jpeg",
                    0.92
                );

            pdf.addImage(
                imagem,
                "JPEG",
                0,
                0,
                PDF_LARGURA_MM,
                PDF_ALTURA_MM,
                undefined,
                "FAST"
            );
        }

        pdf.save(
            nomeArquivo.endsWith(
                ".pdf"
            )
                ? nomeArquivo
                : `${nomeArquivo}.pdf`
        );
    } catch (error) {
        console.error(
            "Erro ao gerar relatório de pendências de treinamentos em PDF:",
            error
        );

        alert(
            "Não foi possível gerar o PDF de pendências sem cortes. Recarregue a página e tente novamente."
        );

        return false;
    } finally {
        iframe.remove();
    }

    return true;
}

export async function baixarRelatorioPendenciasTreinamentosPDF({
    nomeArquivo =
        "relatorio-pendencias-treinamentos.pdf",

    pendencias =
        [],

    titulo =
        "Relatório de pendências de treinamentos",

    contratanteCabecalho =
        null,

    filtros =
        {},
} = {}) {
    const dataEmissao =
        new Date()
            .toLocaleString(
                "pt-BR",
                {
                    dateStyle:
                        "short",

                    timeStyle:
                        "short",
                }
            );

    const empresas =
        agruparPendenciasPorEmpresaRelatorio(
            pendencias
        );

    if (!empresas.length) {
        alert(
            "Nenhuma pendência encontrada para gerar o relatório."
        );

        return;
    }

    const conteudo =
        empresas
            .map(
                (
                    empresa,
                    indice
                ) =>
                    montarPaginaEmpresaPendenciasRelatorio(
                        empresa,
                        contratanteCabecalho,
                        indice,
                        dataEmissao,
                        filtros,
                        titulo
                    )
            )
            .join("");

    const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>${escaparHTML(titulo)}</title>

<style>
    :root {
        color-scheme: light;

        font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;

        color: #10251c;
        background: #edf2ef;
    }

    * {
        box-sizing: border-box;
    }

    html,
    body {
        margin: 0;
        padding: 0;
        min-height: 100%;
        background: #edf2ef;
    }

    body {
        padding: 0;
    }

    .pagina-relatorio {
        width: 297mm;
        height: 210mm;
        min-height: 210mm;

        margin:
            0
            auto
            6mm;

        display: grid;

        grid-template-rows:
            21mm
            auto
            auto
            minmax(0, 1fr)
            6mm;

        gap: 2.4mm;

        overflow: hidden;

        padding:
            7mm
            8mm
            5mm;

        background:
            #ffffff;

        color:
            #10251c;

        border:
            0;

        border-radius:
            0;

        box-shadow:
            none;

        -webkit-print-color-adjust:
            exact;

        print-color-adjust:
            exact;
    }

    .pagina-relatorio--continuacao {
        grid-template-rows:
            21mm
            auto
            minmax(0, 1fr)
            6mm;
    }

    /* =========================================================
       CABEÇALHO — ASSINATURA VISUAL DO RELATÓRIO ANUAL
       Base própria deste relatório.
       ========================================================= */

    .cabecalho-relatorio {
        width: 100%;
        height: 21mm;
        min-height: 21mm;

        display: grid;

        grid-template-columns:
            58mm
            minmax(0, 1fr)
            27mm;

        align-items:
            center;

        gap:
            5mm;

        overflow:
            hidden;

        padding:
            0
            5mm;

        border-radius:
            2.5mm;

        color:
            #ffffff;

        background-color:
            #063e32;

        background-image:
            linear-gradient(
                108deg,
                rgba(4, 25, 34, 0.82) 0%,
                rgba(5, 61, 49, 0.70) 48%,
                rgba(7, 131, 62, 0.56) 100%
            ),
            url("${heroPendenciasTreinamentosObrasUrl}");

        background-repeat:
            no-repeat,
            no-repeat;

        background-position:
            center,
            center 60%;

        background-size:
            cover,
            cover;
    }

    .marca-safescan {
        min-width: 0;

        display: flex;

        align-items:
            center;

        justify-content:
            flex-start;

        gap:
            2.5mm;
    }

    .marca-safescan__simbolo {
        width:
            12mm;

        height:
            12mm;

        flex:
            0
            0
            12mm;
    }

    .marca-safescan__texto {
        min-width: 0;

        display:
            grid;

        line-height:
            1;
    }

    .marca-safescan__texto strong {
        color:
            #ffffff;

        font-size:
            4.8mm;

        font-weight:
            900;

        letter-spacing:
            0.025em;
    }

    .marca-safescan__texto small {
        margin-top:
            1mm;

        color:
            #ffffff;

        font-size:
            2.2mm;

        font-weight:
            750;

        letter-spacing:
            0.18em;
    }

    .titulo-relatorio {
        min-width:
            0;

        height:
            100%;

        display:
            flex;

        flex-direction:
            column;

        align-items:
            center;

        justify-content:
            center;

        overflow:
            hidden;

        text-align:
            center;
    }

    .titulo-relatorio h1 {
        max-width:
            100%;

        margin:
            0;

        color:
            #ffffff;

        font-size:
            5mm;

        line-height:
            1.05;

        font-weight:
            900;

        letter-spacing:
            -0.03em;

        white-space:
            nowrap;
    }

    .titulo-relatorio p {
        margin:
            1mm
            0
            0;

        color:
            #ffffff;

        font-size:
            2.7mm;

        line-height:
            1;

        font-weight:
            650;

        opacity:
            0.92;
    }

    .marca-contratante {
        width:
            auto;

        max-width:
            27mm;

        height:
            11.8mm;

        min-width:
            0;

        display:
            flex;

        align-items:
            center;

        justify-content:
            center;

        justify-self:
            end;

        overflow:
            hidden;

        padding:
            0.6mm
            0.8mm;

        border:
            0.2mm
            solid
            rgba(
                217,
                226,
                236,
                0.78
            );

        border-radius:
            1.5mm;

        background:
            rgba(
                255,
                255,
                255,
                0.96
            );
    }

    .marca-contratante .empresa-logo__imagem {
        display:
            block;

        width:
            auto;

        height:
            100%;

        max-width:
            25mm;

        max-height:
            100%;

        object-fit:
            contain;
    }

    .marca-contratante .empresa-logo__iniciais {
        display:
            flex;

        width:
            100%;

        height:
            100%;

        align-items:
            center;

        justify-content:
            center;

        color:
            #0b5f33;

        font-size:
            4mm;

        font-weight:
            900;
    }

    /* =========================================================
       RESUMO — MESMA LINGUAGEM DO ANUAL
       ========================================================= */

    .resumo-pendencias {
        min-height:
            12mm;

        display:
            grid;

        grid-template-columns:
            minmax(0, 1.65fr)
            repeat(
                4,
                minmax(0, 0.78fr)
            );

        gap:
            3mm;
    }

    .resumo-contexto-empresa {
        min-width:
            0;

        min-height:
            12mm;

        display:
            grid;

        grid-template-columns:
            8.5mm
            minmax(0, 1fr);

        align-items:
            center;

        gap:
            1.6mm;

        overflow:
            hidden;

        padding:
            1mm
            2mm;

        border:
            0.3mm
            solid
            #cddbd3;

        border-left:
            1mm
            solid
            #0b8a45;

        border-radius:
            2mm;

        background:
            linear-gradient(
                90deg,
                #ffffff,
                #f7fbf9
            );
    }

    .resumo-contexto-logo {
        width:
            8mm;

        height:
            8mm;

        display:
            grid;

        place-items:
            center;

        overflow:
            hidden;

        border:
            0.25mm
            solid
            #cbd9d1;

        border-radius:
            1.4mm;

        background:
            #ffffff;
    }

    .resumo-contexto-logo .empresa-logo__imagem {
        width:
            84%;

        height:
            84%;

        object-fit:
            contain;
    }

    .resumo-contexto-logo .empresa-logo__iniciais {
        width:
            100%;

        height:
            100%;

        display:
            grid;

        place-items:
            center;

        color:
            #ffffff;

        background:
            linear-gradient(
                135deg,
                #08763a,
                #13a14a
            );

        font-size:
            2.7mm;

        font-weight:
            950;
    }

    .resumo-contexto-texto {
        min-width:
            0;

        display:
            flex;

        flex-direction:
            column;

        justify-content:
            center;
    }

    .resumo-contexto-texto > small {
        color:
            #587067;

        font-size:
            1.45mm;

        line-height:
            1.05;

        font-weight:
            900;

        letter-spacing:
            0.02em;

        overflow-wrap:
            anywhere;
    }

    .resumo-contexto-texto > strong {
        margin-top:
            0.35mm;

        color:
            #102b21;

        font-size:
            2.45mm;

        line-height:
            1.05;

        font-weight:
            950;

        overflow-wrap:
            anywhere;

        word-break:
            break-word;
    }

    .resumo-contexto-texto > span {
        margin-top:
            0.35mm;

        color:
            #52655c;

        font-size:
            1.45mm;

        line-height:
            1.08;

        font-weight:
            700;

        overflow-wrap:
            anywhere;
    }

    .resumo-card {
        min-width:
            0;

        min-height:
            12mm;

        display:
            grid;

        grid-template-columns:
            minmax(0, 1fr)
            auto
            minmax(0, 1fr);

        align-items:
            center;

        overflow:
            hidden;

        border:
            0.25mm
            solid
            transparent;

        border-radius:
            2mm;

        padding:
            1.3mm
            2.4mm;

        color:
            #ffffff;

        box-shadow:
            0
            0.7mm
            1.8mm
            rgba(
                20,
                48,
                35,
                0.12
            );
    }

    .resumo-card--total {
        border-color:
            #174b41;

        background:
            linear-gradient(
                110deg,
                #092631,
                #0b4a3e
            );
    }

    .resumo-card--pendente {
        border-color:
            #db1823;

        background:
            linear-gradient(
                110deg,
                #d90f1c,
                #f2222c
            );
    }

    .resumo-card--vencido {
        border-color:
            #a50f18;

        background:
            linear-gradient(
                110deg,
                #94121a,
                #c51b25
            );
    }

    .resumo-card--vencer {
        border-color:
            #b7791f;

        background:
            linear-gradient(
                110deg,
                #9b651a,
                #d5962a
            );
    }

    .resumo-card__icone {
        grid-column:
            1;

        width:
            4.8mm;

        height:
            4.8mm;

        justify-self:
            start;

        color:
            #ffffff;
    }

    .resumo-card__icone svg {
        display:
            block;

        width:
            4.4mm;

        height:
            4.4mm;

        color:
            #ffffff;

        fill:
            none;

        stroke:
            currentColor;
    }

    .resumo-card__texto {
        grid-column:
            2;

        min-width:
            0;

        display:
            flex;

        width:
            max-content;

        max-width:
            100%;

        align-items:
            baseline;

        justify-content:
            center;

        justify-self:
            center;

        gap:
            0.9mm;

        color:
            #ffffff;

        white-space:
            nowrap;
    }

    .resumo-card__texto small {
        color:
            #ffffff;

        font-size:
            1.85mm;

        line-height:
            1;

        font-weight:
            800;
    }

    .resumo-card__texto strong {
        color:
            #ffffff;

        font-size:
            3.2mm;

        line-height:
            1;

        font-weight:
            950;
    }

    /* =========================================================
       FILTROS — DISCRETOS, SEM CRIAR OUTRO CARD PRINCIPAL
       ========================================================= */

    .filtros-pendencias {
        min-width:
            0;

        min-height:
            5mm;

        display:
            grid;

        grid-template-columns:
            auto
            repeat(
                5,
                minmax(0, 1fr)
            );

        align-items:
            center;

        gap:
            2mm;

        padding:
            0.8mm
            2mm;

        border:
            0.25mm
            solid
            #d5e0da;

        border-radius:
            1.6mm;

        background:
            #f7faf8;
    }

    .filtros-pendencias__rotulo {
        color:
            #0b5f33;

        font-size:
            1.65mm;

        font-weight:
            950;

        text-transform:
            uppercase;
    }

    .filtro-inline {
        min-width:
            0;

        display:
            flex;

        align-items:
            center;

        justify-content:
            center;

        gap:
            0.9mm;

        padding-left:
            1.5mm;

        text-align:
            center;

        white-space:
            nowrap;

        border-left:
            0.25mm
            solid
            #d9e3de;
    }

    .filtro-inline small {
        flex:
            0
            0
            auto;

        color:
            #6b7d74;

        font-size:
            1.4mm;

        font-weight:
            700;
    }

    .filtro-inline strong {
        min-width:
            0;

        color:
            #21392e;

        font-size:
            1.55mm;

        line-height:
            1.08;

        font-weight:
            850;

        overflow-wrap:
            anywhere;

        word-break:
            break-word;
    }

    /* =========================================================
       TABELA
       ========================================================= */

    .bloco-tabela {
        min-width:
            0;

        min-height:
            0;

        overflow:
            visible;

        border:
            0.3mm
            solid
            #cddbd3;

        border-left:
            1mm
            solid
            #0b8a45;

        border-radius:
            2mm;

        background:
            #ffffff;
    }

    .bloco-tabela__topo {
        min-height:
            7mm;

        display:
            flex;

        align-items:
            center;

        justify-content:
            space-between;

        gap:
            3mm;

        padding:
            1mm
            2mm;

        border-bottom:
            0.25mm
            solid
            #d9e3de;

        background:
            linear-gradient(
                90deg,
                #ffffff,
                #f7faf8
            );
    }

    .bloco-tabela__topo h2 {
        margin:
            0;

        color:
            #173327;

        font-size:
            2.25mm;

        line-height:
            1;

        font-weight:
            950;

        text-transform:
            uppercase;
    }

    .bloco-tabela__topo p {
        margin:
            0.55mm
            0
            0;

        color:
            #607168;

        font-size:
            1.55mm;

        line-height:
            1.1;
    }

    .bloco-tabela__topo > span {
        flex:
            0
            0
            auto;

        color:
            #0b7c40;

        font-size:
            1.55mm;

        font-weight:
            950;

        text-transform:
            uppercase;
    }

    .tabela-pendencias-treinamentos {
        width:
            100%;

        border-collapse:
            collapse;

        table-layout:
            fixed;

        font-size:
            1.8mm;
    }

    /* =========================================================
       G2-C9C-R1 — 6 COLUNAS = 100%
       ========================================================= */

    .tabela-pendencias-treinamentos .col-numero {
        width:
            4.10%;
    }

    .tabela-pendencias-treinamentos .col-colaborador {
        width:
            23.39%;
    }

    .tabela-pendencias-treinamentos .col-funcao {
        width:
            16.37%;
    }

    .tabela-pendencias-treinamentos .col-treinamento {
        width:
            29.24%;
    }

    .tabela-pendencias-treinamentos .col-situacao {
        width:
            12.86%;
    }

    .tabela-pendencias-treinamentos .col-vencimento {
        width:
            14.04%;
    }

    .tabela-pendencias-treinamentos thead th {
        padding:
            1.35mm
            1mm;

        border-right:
            0.25mm
            solid
            #d9e3de;

        border-bottom:
            0.25mm
            solid
            #c7d6ce;

        color:
            #173327;

        background:
            #e8f0ec;

        text-align:
            center;

        vertical-align:
            middle;

        font-size:
            1.7mm;

        line-height:
            1;

        font-weight:
            950;

        text-transform:
            uppercase;
    }

    .tabela-pendencias-treinamentos thead th:last-child {
        border-right:
            0;
    }

    .tabela-pendencias-treinamentos tbody tr:nth-child(even) {
        background:
            #fbfdfc;
    }

    .tabela-pendencias-treinamentos tbody td {
        padding:
            1.15mm
            1mm;

        border-right:
            0.25mm
            solid
            #d9e3de;

        border-bottom:
            0.25mm
            solid
            #d9e3de;

        color:
            #263a31;

        text-align:
            center;

        vertical-align:
            middle;

        line-height:
            1.12;

        white-space:
            normal;

        overflow-wrap:
            anywhere;

        word-break:
            break-word;
    }

    .tabela-pendencias-treinamentos tbody td:last-child {
        border-right:
            0;
    }

    .tabela-pendencias-treinamentos tbody tr:last-child td {
        border-bottom:
            0;
    }

    .tabela-pendencias-treinamentos .texto-forte {
        color:
            #173327;

        text-align:
            left;

        font-weight:
            850;
    }

    .status-texto {
        font-weight:
            950;
    }

    .status-texto.status-info {
        color:
            #e31320;
    }

    .status-texto.status-critico {
        color:
            #b1121b;
    }

    .status-texto.status-alerta {
        color:
            #b7791f;
    }

    .status-texto.status-neutro {
        color:
            #64748b;
    }

    /* =========================================================
       RODAPÉ — MESMO CONTRATO DO ANUAL
       ========================================================= */

    .rodape-relatorio {
        min-width:
            0;

        height:
            6mm;

        display:
            grid;

        grid-template-columns:
            1fr
            auto
            auto;

        align-items:
            center;

        gap:
            5mm;

        padding-top:
            1.4mm;

        border-top:
            0.25mm
            solid
            #d5e0da;

        color:
            #63736a;

        font-size:
            1.9mm;

        line-height:
            1;

        font-weight:
            750;
    }

    .rodape-relatorio span:last-child {
        text-align:
            right;
    }

    /* =========================================================
       G2-C3B — REFINAMENTO VISUAL FINAL
       Mantém a arquitetura/layout landscape aprovado.
       ========================================================= */

    .pagina-relatorio {
        gap: 2mm;
    }

    /* G2-C4A — HERO */
    /* G2-C4B — HERO */
    .titulo-relatorio {
        /*
         * Não altera o eixo horizontal.
         * Apenas compensa opticamente o conjunto
         * título + subtítulo, que estava baixo.
         */
        transform: translateY(-1.8mm);
    }

    .titulo-relatorio h1 {
        font-size: 5.5mm;
        line-height: 1.04;
        letter-spacing: -0.028em;
    }

    .titulo-relatorio p {
        margin-top: 1.2mm;
        font-size: 3mm;
        line-height: 1.05;
    }

    .marca-contratante {
        /*
         * Fundo branco somente como realce.
         * Sem caixa grande ao redor da marca.
         */
        width: fit-content;
        max-width: 23.4mm;
        height: auto;
        min-height: 0;

        padding:
            0.22mm
            0.3mm;

        border-radius:
            0.8mm;
    }

    .marca-contratante .empresa-logo__imagem {
        display: block;

        width: auto;
        height: auto;

        max-width: 22.6mm;
        max-height: 9.8mm;
    }

    .marca-contratante .empresa-logo__iniciais {
        font-size: 4.2mm;
    }

    .resumo-contexto-texto > small {
        font-size: 1.75mm;
        line-height: 1.08;
    }

    /* G2-C5B — CARD EMPRESA — COMPOSIÇÃO FINAL */
    /* G2-C5E — CARD EMPRESA — 3 LINHAS */
    .resumo-contexto-texto {
        transform: translateY(-1.60mm);
    }

    .resumo-contexto-texto > strong {
        display: block;

        min-width: 0;
        max-width: 100%;

        margin-top: -0.05mm;

        color: #0c291e;

        font-size: 3.1mm;
        line-height: 1;

        font-weight: 950;
        letter-spacing: -0.025em;

        white-space: nowrap;
    }

    .resumo-contexto-texto > small {
        display: block;

        min-width: 0;
        max-width: 100%;

        margin-top: 0.42mm;

        color: #52655c;

        font-size: 1.95mm;
        line-height: 1;

        font-weight: 760;

        white-space: nowrap;
    }

    .resumo-contexto-texto > span {
        display: block;

        min-width: 0;
        max-width: 100%;

        margin-top: 0.32mm;

        color: #52655c;

        font-size: 1.95mm;
        line-height: 1;

        font-weight: 760;

        white-space: nowrap;
    }

    /* =========================================================
       G2-C6D — ALINHAMENTO ÓPTICO REAL
       Ajuste independente das métricas dos glifos.
       Ícones permanecem governados exclusivamente pelo CSS-base.
       ========================================================= */

    .resumo-card__texto {
        gap: 2mm;

        align-items: center;
        justify-content: center;

        align-self: center;
        justify-self: center;

        text-align: center;

        white-space: nowrap;

        transform: translateY(-2.10mm);
    }

    .resumo-card__texto small {
        font-size: 3.35mm;
        line-height: 1;

        font-weight: 900;
        letter-spacing: 0.01em;

        text-transform: uppercase;

        transform: translateY(0.55mm);
    }

    .resumo-card__texto strong {
        font-size: 5.6mm;
        line-height: 1;

        font-weight: 980;

        transform: translateY(-0.55mm);
    }

    /* =========================================================
       G2-C7B-R1 — FILTROS CENTRALIZADOS
       Regra SafeScan: centro horizontal + vertical.
       ========================================================= */

    .filtros-pendencias {
        min-height: 7.4mm;

        padding-top: 1.05mm;
        padding-bottom: 1.05mm;

        align-items: center;
    }

    .filtros-pendencias__rotulo {
        display: flex;

        align-items: center;
        justify-content: center;

        align-self: center;

        font-size: 2.25mm;
        line-height: 1;

        font-weight: 950;

        transform: translateY(-1.4mm);
    }

    .filtro-inline {
        min-height: 4.8mm;

        align-items: center;
        justify-content: center;

        align-self: center;

        text-align: center;

        transform: translateY(-1.4mm);
    }

    .filtro-inline small {
        font-size: 2.05mm;
        line-height: 1;

        font-weight: 800;

        white-space: nowrap;
    }

    .filtro-inline strong {
        font-size: 2.3mm;
        line-height: 1;

        font-weight: 900;

        white-space: nowrap;
    }

    .bloco-tabela {
        align-self: start;
        height: auto;
    }

    /* =========================================================
       G2-C8D — TOPO CENTRALIZADO
       Centro horizontal + centro óptico vertical.
       ========================================================= */

    .bloco-tabela__topo {
        min-height: 7.6mm;

        padding-top: 1.15mm;
        padding-bottom: 1.15mm;

        display: flex;

        align-items: center;
        justify-content: center;
    }

    .bloco-tabela__topo h2 {
        width: 100%;

        margin: 0;

        display: flex;

        align-items: baseline;
        justify-content: center;

        gap: 1mm;

        line-height: 1;

        text-align: center;

        white-space: nowrap;

        transform: translateY(-1.55mm);
    }

    .bloco-tabela__titulo-principal {
        font-size: 3.15mm;
        line-height: 1;

        font-weight: 950;

        text-transform: uppercase;
    }

    .bloco-tabela__titulo-detalhe {
        font-size: 2.25mm;
        line-height: 1;

        font-weight: 800;

        text-transform: uppercase;
    }

    .tabela-pendencias-treinamentos {
        font-size: 2.1mm;
    }

    /* =========================================================
       G2-C8C — CENTRO ÓPTICO REAL DO THEAD
       Células preservadas; somente os glifos sobem.
       ========================================================= */

    .tabela-pendencias-treinamentos thead th {
        height: 7mm;

        padding: 0;

        font-size: 2.35mm;
        line-height: 1;

        font-weight: 950;

        text-align: center;
        vertical-align: middle;

        text-transform: uppercase;
    }

    .tabela-pendencias-treinamentos thead th > span {
        display: flex;

        width: 100%;
        height: 7mm;

        box-sizing: border-box;

        padding:
            1mm
            1.05mm;

        align-items: center;
        justify-content: center;

        text-align: center;

        line-height: 1;

        white-space: nowrap;

        transform: translateY(-0.90mm);
    }

    .tabela-pendencias-treinamentos tbody td {
        padding: 1.35mm 1.05mm;
        font-size: 2.1mm;
        line-height: 1.16;
    }

    /* =========================================================
       G2-C9E — AJUSTE FINAL
       - coluna #: correção somente vertical
       - coluna Treinamento: centralização horizontal
       - demais colunas preservadas
       ========================================================= */

    .tabela-pendencias-treinamentos .celula-conteudo-optico {
        display: block;
        width: 100%;
    }

    /* Coluna # — corrigir somente a posição vertical */
    .tabela-pendencias-treinamentos tbody td:first-child {
        padding-top: 0.55mm;
        padding-bottom: 2.15mm;
    }

    .tabela-pendencias-treinamentos
    tbody td:first-child
    .celula-numero-optica {
        display: block;
        width: 100%;
        transform: translateY(-0.80mm);
    }

    /* Colaborador */
    .tabela-pendencias-treinamentos
    tbody td:nth-child(2)
    .celula-conteudo-optico {
        transform: translateY(-1.60mm);
    }

    /* Função */
    .tabela-pendencias-treinamentos
    tbody td:nth-child(3)
    .celula-conteudo-optico {
        transform: translateY(-1.60mm);
    }

    /* Treinamento */
    .tabela-pendencias-treinamentos
    tbody td:nth-child(4) {
        text-align: center;
    }

    .tabela-pendencias-treinamentos
    tbody td:nth-child(4)
    .celula-conteudo-optico {
        transform: translateY(-1.80mm);
    }

    /* Situação */
    .tabela-pendencias-treinamentos
    tbody td:nth-child(5)
    .celula-conteudo-optico {
        transform: translateY(-1.65mm);
    }

    /* Vencimento */
    .tabela-pendencias-treinamentos
    tbody td:nth-child(6)
    .celula-conteudo-optico {
        transform: translateY(-1.80mm);
    }

    .tabela-pendencias-treinamentos .texto-forte {
        font-weight: 900;
    }

    .status-texto {
        font-size: 2.05mm;
        font-weight: 950;
    }


    /* =========================================================
       CONT-HERO-G2 — MINI-HERO DE CONTINUAÇÃO
       Relatório de Pendências de Treinamentos

       Página 1:
       - Hero integral preservado.

       Páginas 2+:
       - mesma imagem institucional;
       - SafeScan à esquerda;
       - contexto + título ao centro;
       - CONTINUAÇÃO à direita;
       - geometria compacta para preservar área útil.
       ========================================================= */

    .pagina-relatorio--continuacao
    .cabecalho-relatorio {
        box-sizing: border-box;

        width: 100%;

        min-height: 9.5mm;
        height: 9.5mm;

        margin: 0;

        padding:
            1.1mm
            3.5mm;

        display: grid;

        grid-template-columns:
            35mm
            minmax(0, 1fr)
            30mm;

        align-items: center;

        column-gap: 3mm;

        border: 0;

        border-radius: 2.2mm;

        box-shadow: none;

        overflow: hidden;

        background-color:
            #063e32;

        background-image:
            linear-gradient(
                108deg,
                rgba(4, 25, 34, 0.88) 0%,
                rgba(5, 61, 49, 0.76) 48%,
                rgba(7, 131, 62, 0.62) 100%
            ),
            url("${heroPendenciasTreinamentosObrasUrl}");

        background-repeat:
            no-repeat,
            no-repeat;

        background-position:
            center,
            center 60%;

        background-size:
            cover,
            cover;
    }

    .pagina-relatorio--continuacao
    .marca-safescan {
        min-width: 0;

        height: 100%;

        display: flex;

        align-items: center;
        justify-content: flex-start;

        gap: 1mm;

        transform: none;
    }

    .pagina-relatorio--continuacao
    .marca-safescan__simbolo {
        width: 5.2mm;
        height: 5.2mm;

        flex:
            0
            0
            5.2mm;
    }

    .pagina-relatorio--continuacao
    .marca-safescan__texto {
        min-width: 0;

        display: grid;

        line-height: 1;

        transform: none;
    }

    .pagina-relatorio--continuacao
    .marca-safescan__texto strong {
        margin: 0;

        color: #ffffff;

        font-size: 2.05mm;
        line-height: 1;

        font-weight: 950;

        letter-spacing: 0.025em;
    }

    .pagina-relatorio--continuacao
    .marca-safescan__texto small {
        margin:
            0.20mm
            0
            0;

        color:
            rgba(
                255,
                255,
                255,
                0.92
            );

        font-size: 0.95mm;
        line-height: 1;

        font-weight: 850;

        letter-spacing: 0.17em;
    }

    .pagina-relatorio--continuacao
    .titulo-relatorio {
        min-width: 0;

        height: 100%;

        display: flex;

        flex-direction: column;

        align-items: center;
        justify-content: center;

        gap: 0.22mm;

        text-align: center;

        transform: none;
    }

    .pagina-relatorio--continuacao
    .titulo-relatorio::before {
        content:
            "PENDÊNCIAS DE TREINAMENTOS";

        display: block;

        margin: 0;

        color: #6ee7b7;

        font-size: 1.05mm;
        line-height: 1;

        font-weight: 950;

        letter-spacing: 0.13em;

        text-transform: uppercase;

        white-space: nowrap;
    }

    .pagina-relatorio--continuacao
    .titulo-relatorio h1 {
        max-width: 100%;

        margin: 0;

        color: #ffffff;

        font-size: 2.45mm;
        line-height: 1.05;

        font-weight: 950;

        letter-spacing: -0.01em;

        text-align: center;

        white-space: nowrap;

        overflow: hidden;

        text-overflow: ellipsis;

        transform: none;
    }

    .pagina-relatorio--continuacao
    .titulo-relatorio p {
        display: none !important;
    }

    .pagina-relatorio--continuacao
    .marca-contratante {
        min-width: 0;

        height: 100%;

        padding: 0;

        display: flex;

        align-items: center;
        justify-content: flex-end;

        background: transparent;

        border: 0;

        box-shadow: none;

        transform: none;
    }

    .pagina-relatorio--continuacao
    .marca-contratante > * {
        display: none !important;
    }

    .pagina-relatorio--continuacao
    .marca-contratante::after {
        content:
            "CONTINUAÇÃO";

        display: block;

        color:
            rgba(
                255,
                255,
                255,
                0.86
            );

        font-size: 1.20mm;
        line-height: 1;

        font-weight: 950;

        letter-spacing: 0.13em;

        white-space: nowrap;
    }
    @page {
        size: A4 landscape;
        margin: 0;
    }

    @media print {
        html,
        body {
            width:
                297mm;

            min-height:
                auto;

            background:
                #ffffff;
        }

        body {
            padding:
                0;
        }

        .pagina-relatorio {
            width:
                297mm;

            height:
                210mm;

            min-height:
                210mm;

            margin:
                0;

            border:
                0;

            border-radius:
                0;

            box-shadow:
                none;

            break-after:
                page;

            page-break-after:
                always;
        }

        .pagina-relatorio:last-child {
            break-after:
                auto;

            page-break-after:
                auto;
        }
    }
</style>
</head>

<body>
${conteudo}
</body>

</html>`;

    await baixarRelatorioPendenciasHtmlComoPdf({
        html,
        nomeArquivo,
    });
}