// G2-C10D-G7-R1 — Relatório isolado de Pendências Cadastrais.
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

import heroPendenciasCadastraisUrl from "../../assets/heroes/relatorios/hero-pendencias-treinamentos-obras-v1.png";

import {
    CAMPOS_PENDENCIAS_CADASTRAIS,
} from "./relatorioPendenciasCadastraisUtils.js";

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

function textoSeguro(
    valor,
    fallback = "-"
) {
    const texto =
        String(
            valor ??
            ""
        ).trim();

    return texto || fallback;
}

function nomeColaborador(
    colaborador = {}
) {
    return textoSeguro(
        colaborador.nome ||
            colaborador.nomeCompleto ||
            colaborador.nome_completo,
        "Nome não informado"
    );
}

function nomeEmpresa(
    colaborador = {}
) {
    return textoSeguro(
        colaborador.empresa ||
            colaborador.empresaNome ||
            colaborador.empresa_nome ||
            colaborador.empresaExibicao ||
            colaborador.empresa_exibicao,
        "Empresa não informada"
    );
}

function funcaoColaborador(
    colaborador = {}
) {
    return textoSeguro(
        colaborador.funcao ||
            colaborador.funcaoNome ||
            colaborador.funcao_nome,
        "Função não informada"
    );
}

function camposAuditados(
    camposSelecionados = []
) {
    const selecionados =
        new Set(
            Array.isArray(
                camposSelecionados
            )
                ? camposSelecionados
                : []
        );

    return CAMPOS_PENDENCIAS_CADASTRAIS.filter(
        (campo) =>
            selecionados.has(
                campo.chave
            )
    );
}

function chips(
    itens = [],
    classe = ""
) {
    return itens
        .map(
            (item) =>
                `<span class="chip ${classe}">${escaparHTML(item)}</span>`
        )
        .join("");
}

function filtrosChips(
    filtros = {}
) {
    const itens =
        [];

    const busca =
        String(
            filtros.busca ||
            ""
        ).trim();

    if (busca) {
        itens.push(
            `Busca: ${busca}`
        );
    }

    itens.push(
        `Empresa: ${textoSeguro(
            filtros.empresa,
            "Todas"
        )}`
    );

    itens.push(
        `Classificação: ${textoSeguro(
            filtros.classificacao,
            "Todos"
        )}`
    );

    const filtroRapido =
        String(
            filtros.filtroRapido ||
            ""
        ).trim();

    if (filtroRapido) {
        itens.push(
            `Filtro rápido: ${filtroRapido}`
        );
    }

    return chips(
        itens,
        "chip--filtro"
    );
}

function camposChips(
    camposSelecionados = []
) {
    return chips(
        camposAuditados(
            camposSelecionados
        ).map(
            (campo) =>
                campo.rotulo
        ),
        "chip--campo"
    );
}

function avaliacoesOrdenadas(
    avaliacoes = []
) {
    return [
        ...(
            Array.isArray(
                avaliacoes
            )
                ? avaliacoes
                : []
        ),
    ].sort(
        (
            a,
            b
        ) => {
            const porEmpresa =
                nomeEmpresa(
                    a?.colaborador
                ).localeCompare(
                    nomeEmpresa(
                        b?.colaborador
                    ),
                    "pt-BR",
                    {
                        sensitivity:
                            "base",
                    }
                );

            if (porEmpresa !== 0) {
                return porEmpresa;
            }

            return nomeColaborador(
                a?.colaborador
            ).localeCompare(
                nomeColaborador(
                    b?.colaborador
                ),
                "pt-BR",
                {
                    sensitivity:
                        "base",
                }
            );
        }
    );
}

function obterQrUltimaImpressaoEmCadastral(
    colaborador = {}
) {
    return String(
        colaborador.qrUltimaImpressaoEm ||
        colaborador.qr_ultima_impressao_em ||
        ""
    ).trim();
}

function formatarQrUltimaImpressaoCadastral(
    valor = ""
) {
    const texto =
        String(
            valor ||
            ""
        ).trim();

    if (!texto) {
        return "";
    }

    const data =
        new Date(
            texto
        );

    if (
        Number.isNaN(
            data.getTime()
        )
    ) {
        return "";
    }

    return data.toLocaleString(
        "pt-BR",
        {
            dateStyle:
                "short",

            timeStyle:
                "short",
        }
    );
}

function montarLinhas(
    avaliacoes = [],
    mostrarQr = false
) {
    return avaliacoesOrdenadas(
        avaliacoes
    )
        .map(
            (
                avaliacao,
                indice
            ) => {
                const colaborador =
                    avaliacao?.colaborador ||
                    {};

                const pendencias =
                    Array.isArray(
                        avaliacao?.pendencias
                    )
                        ? avaliacao.pendencias
                        : [];

                const qrUltimaImpressaoEm =
                    mostrarQr
                        ? obterQrUltimaImpressaoEmCadastral(
                            colaborador
                        )
                        : null;

                const qrImpresso =
                    mostrarQr &&
                    Boolean(
                        qrUltimaImpressaoEm
                    );

                const qrData =
                    qrImpresso
                        ? formatarQrUltimaImpressaoCadastral(
                            qrUltimaImpressaoEm
                        )
                        : "";

                const qrClasse =
                    qrImpresso
                        ? "qr-impresso-celula--sim"
                        : "qr-impresso-celula--nao";

                const qrConteudo =
                    mostrarQr
                        ? qrImpresso
                            ? `SIM${qrData ? `<br>${qrData}` : ""}`
                            : "NÃO"
                        : "";

                const qrCelulaHtml =
                    mostrarQr
                        ? `
                            <td
                                class="centro qr-impresso-celula ${qrClasse}"
                            >
                                <span class="qr-impresso-texto">
                                    ${qrConteudo}
                                </span>
                            </td>
                        `
                        : "";

                const pendenciasHtml =
                    pendencias.length
                        ? chips(
                            pendencias.map(
                                (pendencia) =>
                                    textoSeguro(
                                        pendencia?.rotulo,
                                        "Campo não identificado"
                                    )
                            ),
                            "chip--pendencia"
                        )
                        : `
                            <span class="chip chip--neutro">
                                -
                            </span>
                        `;

                return `
                    <tr>
                        <td class="centro">
    <div class="celula-cadastral celula-cadastral--centro celula-cadastral--ajuste-optico">
        ${indice + 1}
    </div>
</td>

                        <td>
    <div class="celula-cadastral celula-cadastral--colaborador celula-cadastral--ajuste-optico">
        <strong>
                                ${escaparHTML(
                                    nomeColaborador(
                                        colaborador
                                    )
                                )}
                            </strong>
    </div>
</td>

                        <td>
    <div class="celula-cadastral celula-cadastral--funcao celula-cadastral--ajuste-optico">
        ${escaparHTML(
                                funcaoColaborador(
                                    colaborador
                                )
                            )}
    </div>
</td>

                        <td>
    <div class="celula-cadastral celula-cadastral--empresa celula-cadastral--ajuste-optico">
        ${escaparHTML(
                                nomeEmpresa(
                                    colaborador
                                )
                            )}
    </div>
</td>

                        <td>
    <div class="celula-cadastral celula-cadastral--pendencias celula-cadastral--ajuste-optico">
        <div class="chips-pendencias">
                                ${pendenciasHtml}
                            </div>
    </div>
</td>

                        ${qrCelulaHtml}<td class="centro qtd">
    <div class="celula-cadastral celula-cadastral--centro celula-cadastral--qtd">
        ${Number(
                                avaliacao?.quantidade ||
                                pendencias.length ||
                                0
                            )}
    </div>
</td>
                    </tr>
                `;
            }
        )
        .join("");
}

function montarLogoContratanteCadastral(
    contratanteCabecalho = null
) {
    const contratante =
        contratanteCabecalho &&
        typeof contratanteCabecalho ===
            "object"
            ? contratanteCabecalho
            : {
                nome:
                    "Idealiza Cidades",

                logoUrl:
                    "",
            };

    const nome =
        textoSeguro(
            contratante.nome ||
            contratante.razaoSocial ||
            contratante.razao_social,
            "Idealiza Cidades"
        );

    const logoUrl =
        String(
            contratante.logoUrl ||
            contratante.logo_url ||
            ""
        ).trim();

    if (logoUrl) {
        return `
            <img
                class="marca-contratante-cadastral__imagem"
                src="${escaparHTML(
                    logoUrl
                )}"
                alt="Logo ${escaparHTML(
                    nome
                )}"
                crossorigin="anonymous"
            />
        `;
    }

    const iniciais =
        nome
            .split(/\s+/)
            .filter(Boolean)
            .slice(
                0,
                2
            )
            .map(
                (parte) =>
                    parte.charAt(
                        0
                    )
            )
            .join("")
            .toUpperCase() ||
        "IC";

    return `
        <span class="marca-contratante-cadastral__fallback">
            ${escaparHTML(
                iniciais
            )}
        </span>
    `;
}

function montarHero(
    titulo,
    contratanteCabecalho = null
) {
    const nomeContratante =
        textoSeguro(
            contratanteCabecalho?.nome ||
            contratanteCabecalho?.razaoSocial ||
            contratanteCabecalho?.razao_social,
            "Idealiza Cidades"
        );

    return `
        <header
            class="hero-cadastral"
            data-hero-cadastral
            style="
                background-image:
                    linear-gradient(
                        108deg,
                        rgba(4, 25, 34, .88) 0%,
                        rgba(5, 61, 49, .76) 48%,
                        rgba(7, 131, 62, .58) 100%
                    ),
                    url('${escaparHTML(
                        heroPendenciasCadastraisUrl
                    )}');
            "
        >
            <div
                class="marca-safescan-cadastral"
                aria-label="SafeScan Brasil"
            >
                <svg
                    class="marca-safescan-cadastral__simbolo"
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

                <span class="marca-safescan-cadastral__texto">
                    <strong>
                        SAFESCAN
                    </strong>

                    <small>
                        BRASIL
                    </small>
                </span>
            </div>

            <div class="hero-textos">
                <span>
                    CONFERÊNCIA CADASTRAL
                </span>

                <h1>
                    ${escaparHTML(
                        titulo
                    )}
                </h1>

                <p>
                    Informações não preenchidas e controle operacional de QR
                </p>
            </div>

            <div
                class="marca-contratante-cadastral"
                aria-label="Contratante: ${escaparHTML(
                    nomeContratante
                )}"
                title="Contratante: ${escaparHTML(
                    nomeContratante
                )}"
            >
                ${montarLogoContratanteCadastral(
                    contratanteCabecalho
                )}
            </div>
        </header>
    `;
}

function montarCabecalhoContinuacao(
    titulo
) {
    return `
        <header
            class="cabecalho-continuacao"
            data-cabecalho-continuacao
        >
            <div class="cabecalho-continuacao__marca">
                <strong>
                    SAFESCAN
                </strong>

                <small>
                    BRASIL
                </small>
            </div>

            <div class="cabecalho-continuacao__titulo">
                <span>
                    CONFERÊNCIA CADASTRAL
                </span>

                <strong>
                    ${escaparHTML(
                        titulo
                    )}
                </strong>
            </div>

            <em>
                CONTINUAÇÃO
            </em>
        </header>
    `;
}

function montarResumo(
    resumo,
    camposSelecionados
) {
    return `
        <section
            class="resumo-cadastral"
            data-resumo-cadastral
        >
            <article>
                <span>
                    COLABORADORES ANALISADOS
                </span>

                <strong>
                    ${Number(
                        resumo?.colaboradoresAnalisados ||
                            0
                    )}
                </strong>
            </article>

            <article class="resumo--laranja">
                <span>
                    CADASTROS INCOMPLETOS
                </span>

                <strong>
                    ${Number(
                        resumo?.cadastrosComPendencia ||
                            0
                    )}
                </strong>
            </article>

            <article class="resumo--vermelho">
                <span>
                    INFORMAÇÕES FALTANTES
                </span>

                <strong>
                    ${Number(
                        resumo?.totalPendencias ||
                            0
                    )}
                </strong>
            </article>

            <article class="resumo--azul">
                <span>
                    CAMPOS VERIFICADOS
                </span>

                <strong>
                    ${
                        Array.isArray(
                            camposSelecionados
                        )
                            ? camposSelecionados.length
                            : 0
                    }
                </strong>
            </article>
        </section>
    `;
}

function temFiltroQrCadastral(
    filtrosQrSelecionados = []
) {
    const estados =
        Array.isArray(
            filtrosQrSelecionados
        )
            ? filtrosQrSelecionados
            : [];

    return estados.some(
        (estado) =>
            [
                "impresso",
                "sem_impressao",
            ].includes(
                estado
            )
    );
}

function filtrosQrChips(
    filtrosQrSelecionados = []
) {
    const estados =
        Array.isArray(
            filtrosQrSelecionados
        )
            ? filtrosQrSelecionados
            : [];

    const itens =
        [];

    if (
        estados.includes(
            "impresso"
        )
    ) {
        itens.push(
            "QR impresso"
        );
    }

    if (
        estados.includes(
            "sem_impressao"
        )
    ) {
        itens.push(
            "Sem impressão confirmada"
        );
    }

    /*
     * QR não selecionado:
     *
     * nenhuma mensagem substituta deve aparecer.
     *
     * Não mostrar:
     * - "Sem restrição por QR";
     * - painel QR;
     * - qualquer informação operacional de QR.
     */
    if (!itens.length) {
        return "";
    }

    return chips(
        itens,
        "chip--qr"
    );
}

function montarFiltros(
    filtros,
    camposSelecionados,
    filtrosQrSelecionados = []
) {
    const camposHtml =
        Array.isArray(
            camposSelecionados
        ) &&
        camposSelecionados.length
            ? camposChips(
                camposSelecionados
            )
            : `
                <span class="chip chip--neutro">
                    Nenhuma informação cadastral
                </span>
            `;

    const mostrarQr =
        temFiltroQrCadastral(
            filtrosQrSelecionados
        );

    const classeSemQr =
        mostrarQr
            ? ""
            : " filtros-cadastrais--sem-qr";

    const qrPainelHtml =
        mostrarQr
            ? `
                <div class="divisor"></div>

                <div class="filtros-cadastrais__qr">
                    <span class="titulo-filtro">
                        CONTROLE DE IMPRESSÃO QR
                    </span>

                    <div class="chips">
                        ${filtrosQrChips(
                            filtrosQrSelecionados
                        )}
                    </div>
                </div>
            `
            : "";

    return `
        <section
            class="filtros-cadastrais${classeSemQr}"
            data-filtros-cadastrais
            data-qr-visivel="${mostrarQr ? "1" : "0"}"
        >
            <div>
                <span class="titulo-filtro">
                    FILTROS DA TELA
                </span>

                <div class="chips">
                    ${filtrosChips(
                        filtros
                    )}
                </div>
            </div>

            <div class="divisor"></div>

            <div class="filtros-cadastrais__informacoes">
                <span class="titulo-filtro">
                    INFORMAÇÕES VERIFICADAS
                </span>

                <div class="chips">
                    ${camposHtml}
                </div>
            </div>

            ${qrPainelHtml}
        </section>
    `;
}
function montarTabela(
    avaliacoes,
    mostrarQr = false
) {
    /*
     * Com QR:
     *
     * 3 + 18 + 14 + 17 + 36 + 8 + 4 = 100%
     *
     * Sem QR:
     *
     * 3 + 18 + 14 + 17 + 44 + 4 = 100%
     *
     * Os 8% liberados pela coluna QR são entregues
     * integralmente a INFORMAÇÕES FALTANTES.
     */
    const larguraPendencias =
        mostrarQr
            ? 44
            : 52;

    const colunaQrHtml =
        mostrarQr
            ? `<col style="width:8%">`
            : "";

    const cabecalhoQrHtml =
        mostrarQr
            ? `
                <th class="centro qr-impresso-cabecalho">
                    <span class="qr-impresso-texto">
                        QR IMPRESSO
                    </span>
                </th>
            `
            : "";

    return `
        <section class="tabela-area">
            <table class="tabela-cadastral">
                <colgroup>
                    <col style="width:3%">
                    <col style="width:18%">
                    <col style="width:11%">
                    <col style="width:12%">
                    <col style="width:${larguraPendencias}%">
                    ${colunaQrHtml}
                    <col style="width:4%">
                </colgroup>

                <thead>
                    <tr>
                        <th class="centro">
                            #
                        </th>

                        <th>
                            COLABORADOR
                        </th>

                        <th>
                            FUNÇÃO
                        </th>

                        <th>
                            EMPRESA
                        </th>

                        <th>
                            INFORMAÇÕES FALTANTES
                        </th>

                        ${cabecalhoQrHtml}

                        <th class="centro">
                            QTD.
                        </th>
                    </tr>
                </thead>

                <tbody data-corpo-cadastral>
                    ${montarLinhas(
                        avaliacoes,
                        mostrarQr
                    )}
                </tbody>
            </table>
        </section>
    `;
}

function montarRodape(
    dataEmissao = ""
) {
    return `
        <footer class="rodape-cadastral">
            <span class="rodape-cadastral__marca">
                Gerado pelo SafeScan Brasil
            </span>

            <span class="rodape-cadastral__data">
                ${escaparHTML(
                    dataEmissao
                )}
            </span>

            <strong data-rodape-pagina>
                Página - de -
            </strong>
        </footer>
    `;
}

function montarPaginaInicial({
    titulo,
    dataEmissao,
    resumo,
    camposSelecionados,
    filtrosQrSelecionados,
    filtros,
    contratanteCabecalho,
}) {
    const mostrarQr =
        temFiltroQrCadastral(
            filtrosQrSelecionados
        );

    return `
        <section
            class="pagina-relatorio"
            data-pagina-cadastral="1"
        >
            ${montarHero(
                titulo,
                contratanteCabecalho
            )}

            ${montarCabecalhoContinuacao(
                titulo
            )}

            ${montarResumo(
                resumo,
                camposSelecionados
            )}

            ${montarFiltros(
                filtros,
                camposSelecionados,
                filtrosQrSelecionados
            )}

            ${montarTabela(
                resumo?.avaliacoes ||
                    [],
                mostrarQr
            )}

            ${montarRodape(
                dataEmissao
            )}
        </section>
    `;
}

function paginaTemOverflow(
    pagina
) {
    if (!pagina) {
        return false;
    }

    if (
        pagina.scrollHeight >
            pagina.clientHeight +
                TOLERANCIA_OVERFLOW_PX ||
        pagina.scrollWidth >
            pagina.clientWidth +
                TOLERANCIA_OVERFLOW_PX
    ) {
        return true;
    }

    const area =
        pagina.querySelector(
            ".tabela-area"
        );

    const ultimaLinha =
        pagina.querySelector(
            "[data-corpo-cadastral] tr:last-child"
        );

    if (
        !area ||
        !ultimaLinha
    ) {
        return false;
    }

    return (
        ultimaLinha
            .getBoundingClientRect()
            .bottom >
        area
            .getBoundingClientRect()
            .bottom -
            TOLERANCIA_OVERFLOW_PX
    );
}

function criarPaginaContinuacao(
    paginaAtual
) {
    const clone =
        paginaAtual.cloneNode(
            true
        );

    clone.classList.add(
        "pagina-relatorio--continuacao"
    );

    clone
        .querySelector(
            "[data-hero-cadastral]"
        )
        ?.remove();

    clone
        .querySelector(
            "[data-resumo-cadastral]"
        )
        ?.remove();

    clone
        .querySelector(
            "[data-filtros-cadastrais]"
        )
        ?.remove();

    const corpo =
        clone.querySelector(
            "[data-corpo-cadastral]"
        );

    if (!corpo) {
        throw new Error(
            "Corpo da tabela cadastral não encontrado na continuação."
        );
    }

    corpo.innerHTML =
        "";

    paginaAtual.after(
        clone
    );

    return clone;
}

function paginarRelatorio(
    documento
) {
    const paginaInicial =
        documento.querySelector(
            '[data-pagina-cadastral="1"]'
        );

    if (!paginaInicial) {
        throw new Error(
            "Página inicial do relatório cadastral não encontrada."
        );
    }

    let paginaAtual =
        paginaInicial;

    let seguranca =
        0;

    while (paginaAtual) {
        while (
            paginaTemOverflow(
                paginaAtual
            )
        ) {
            seguranca +=
                1;

            if (
                seguranca >
                1000
            ) {
                throw new Error(
                    "Paginação cadastral interrompida pelo limite de segurança."
                );
            }

            const corpoAtual =
                paginaAtual.querySelector(
                    "[data-corpo-cadastral]"
                );

            if (!corpoAtual) {
                throw new Error(
                    "Corpo da tabela cadastral não localizado."
                );
            }

            const linhas =
                Array.from(
                    corpoAtual.children
                );

            if (
                linhas.length <=
                1
            ) {
                throw new Error(
                    "Uma única linha cadastral excede o espaço físico da página."
                );
            }

            let proximaPagina =
                paginaAtual.nextElementSibling;

            if (
                !proximaPagina ||
                !proximaPagina.matches(
                    '[data-pagina-cadastral="1"]'
                )
            ) {
                proximaPagina =
                    criarPaginaContinuacao(
                        paginaAtual
                    );
            }

            const corpoSeguinte =
                proximaPagina.querySelector(
                    "[data-corpo-cadastral]"
                );

            if (!corpoSeguinte) {
                throw new Error(
                    "Corpo da página cadastral seguinte não localizado."
                );
            }

            corpoSeguinte.insertBefore(
                corpoAtual.lastElementChild,
                corpoSeguinte.firstElementChild
            );
        }

        paginaAtual =
            paginaAtual.nextElementSibling;
    }

    const paginas =
        Array.from(
            documento.querySelectorAll(
                '[data-pagina-cadastral="1"]'
            )
        );

    paginas.forEach(
        (
            pagina,
            indice
        ) => {
            if (
                paginaTemOverflow(
                    pagina
                )
            ) {
                throw new Error(
                    `Overflow residual detectado na página ${indice + 1}.`
                );
            }

            const rodape =
                pagina.querySelector(
                    "[data-rodape-pagina]"
                );

            if (!rodape) {
                throw new Error(
                    `Rodapé cadastral não localizado na página ${indice + 1}.`
                );
            }

            rodape.textContent =
                `Página ${indice + 1} de ${paginas.length}`;
        }
    );

    return paginas;
}

async function aguardarImagensCadastrais(
    documento,
    tempoMaximo = 6000
) {
    const imagens =
        Array.from(
            documento?.images ||
            []
        );

    await Promise.all(
        imagens.map(
            (imagem) =>
                new Promise(
                    (resolve) => {
                        if (
                            imagem.complete
                        ) {
                            resolve();
                            return;
                        }

                        let finalizado =
                            false;

                        const finalizar =
                            () => {
                                if (finalizado) {
                                    return;
                                }

                                finalizado =
                                    true;

                                resolve();
                            };

                        imagem.addEventListener(
                            "load",
                            finalizar,
                            {
                                once:
                                    true,
                            }
                        );

                        imagem.addEventListener(
                            "error",
                            finalizar,
                            {
                                once:
                                    true,
                            }
                        );

                        setTimeout(
                            finalizar,
                            tempoMaximo
                        );
                    }
                )
        )
    );
}

async function aguardarLayout(
    janela
) {
    const documento =
        janela?.document;

    if (!documento) {
        return;
    }

    if (
        documento.fonts?.ready
    ) {
        await documento.fonts.ready;
    }

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

function montarHTML({
    titulo,
    dataEmissao,
    resumo,
    camposSelecionados,
    filtrosQrSelecionados,
    filtros,
    contratanteCabecalho,
}) {
    const conteudo =
        montarPaginaInicial({
            titulo,
            dataEmissao,
            resumo,
            camposSelecionados,
            filtrosQrSelecionados,
            filtros,
            contratanteCabecalho,
        });

    return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">

<style>
* {
    box-sizing: border-box;
}

html,
body {
    margin: 0;
    padding: 0;

    font-family:
        Arial,
        Helvetica,
        sans-serif;

    color: #0f172a;
    background: #e2e8f0;
}

body {
    padding: 8mm 0;
}

.pagina-relatorio {
    width: 297mm;
    height: 210mm;
    min-height: 210mm;

    margin:
        0
        auto
        6mm;

    padding:
        5.5mm
        6mm
        4.5mm;

    display: grid;

    grid-template-rows:
        20mm
        auto
        auto
        minmax(0, 1fr)
        6mm;

    gap: 2mm;

    overflow: hidden;

    background: #ffffff;

    border-radius: 3mm;

    box-shadow:
        0
        2mm
        8mm
        rgba(15, 23, 42, .14);

    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
}

.pagina-relatorio--continuacao {
    grid-template-rows:
        13mm
        minmax(0, 1fr)
        6mm;
}

.hero-cadastral {
    min-width: 0;
    min-height: 20mm;

    display: flex;
    align-items: center;
    justify-content: space-between;

    gap: 6mm;

    padding:
        2.6mm
        4mm;

    border-radius: 3mm;

    background-size: cover;
    background-position: center 60%;

    color: #ffffff;

    overflow: hidden;
}

.hero-identidade {
    min-width: 0;

    display: flex;
    align-items: center;

    gap: 3mm;
}

.hero-icone {
    width: 11mm;
    height: 11mm;

    flex:
        0
        0
        11mm;

    display: grid;
    place-items: center;

    border:
        .35mm
        solid
        rgba(255, 255, 255, .22);

    border-radius: 3mm;

    background:
        rgba(255, 255, 255, .10);

    color: #5eead4;

    font-size: 5mm;
    font-weight: 900;
}

.hero-textos {
    min-width: 0;
}

.hero-textos > span {
    display: block;

    margin-bottom: .8mm;

    color: #5eead4;

    font-size: 2.25mm;
    font-weight: 900;

    letter-spacing: .14em;
}

.hero-textos h1 {
    margin: 0;

    font-size: 5mm;
    line-height: 1.02;

    letter-spacing: -.025em;
}

.hero-textos p {
    margin:
        1mm
        0
        0;

    color: #cbd5e1;

    font-size: 2.35mm;
    font-weight: 700;
}

.hero-emissao {
    flex:
        0
        0
        auto;

    min-width: 28mm;

    padding:
        2.4mm
        3mm;

    border:
        .3mm
        solid
        rgba(255, 255, 255, .16);

    border-radius: 2.5mm;

    background:
        rgba(2, 6, 23, .42);

    text-align: center;
}

.hero-emissao span {
    display: block;

    color: #94a3b8;

    font-size: 1.8mm;
    font-weight: 900;

    letter-spacing: .12em;
}

.hero-emissao strong {
    display: block;

    margin-top: 1mm;

    color: #ffffff;

    font-size: 2.55mm;
}

.cabecalho-continuacao {
    display: none;
}

.pagina-relatorio--continuacao
.cabecalho-continuacao {
    display: flex;

    align-items: center;
    justify-content: space-between;

    gap: 4mm;

    min-height: 13mm;

    padding:
        2.5mm
        3.5mm;

    border:
        .3mm
        solid
        #dbe4ee;

    border-radius: 2.5mm;

    background:
        linear-gradient(
            135deg,
            #f8fafc,
            #eef6f4
        );
}

.cabecalho-continuacao span {
    display: block;

    color: #059669;

    font-size: 1.8mm;
    font-weight: 900;

    letter-spacing: .12em;
}

.cabecalho-continuacao strong {
    display: block;

    margin-top: .6mm;

    color: #0f172a;

    font-size: 3.2mm;
}

.cabecalho-continuacao em {
    color: #64748b;

    font-size: 2.1mm;
    font-style: normal;
    font-weight: 800;
}

.resumo-cadastral {
    display: grid;

    grid-template-columns:
        repeat(
            4,
            minmax(0, 1fr)
        );

    gap: 2mm;
}

.resumo-cadastral article {
    min-width: 0;
    min-height: 15mm;

    display: flex;
    align-items: center;
    justify-content: space-between;

    gap: 3mm;

    padding:
        2.2mm
        3mm;

    border:
        .3mm
        solid
        #dbe4ee;

    border-radius: 2.5mm;

    background: #f8fafc;
}

.resumo-cadastral article span {
    max-width: 70%;

    color: #64748b;

    font-size: 1.75mm;
    font-weight: 900;

    line-height: 1.15;

    letter-spacing: .05em;
}

.resumo-cadastral article strong {
    flex:
        0
        0
        auto;

    color: #0f172a;

    font-size: 5.8mm;
    line-height: 1;
}

.resumo--laranja {
    border-color: #fed7aa !important;
    background: #fff7ed !important;
}

.resumo--laranja span,
.resumo--laranja strong {
    color: #c2410c !important;
}

.resumo--vermelho {
    border-color: #fecdd3 !important;
    background: #fff1f2 !important;
}

.resumo--vermelho span,
.resumo--vermelho strong {
    color: #be123c !important;
}

.resumo--azul {
    border-color: #bfdbfe !important;
    background: #eff6ff !important;
}

.resumo--azul span,
.resumo--azul strong {
    color: #1d4ed8 !important;
}

.filtros-cadastrais {
    min-width: 0;

    display: grid;

    grid-template-columns:
        minmax(0, .8fr)
        .3mm
        minmax(0, 1.2fr);

    gap: 2.5mm;

    padding:
        2mm
        2.5mm;

    border:
        .3mm
        solid
        #dbe4ee;

    border-radius: 2.5mm;

    background: #f8fafc;
}

.filtros-cadastrais > div {
    min-width: 0;
}

.filtros-cadastrais > div:not(.divisor) {
    display: flex;
    flex-direction: column;

    /*
     * Centraliza título + chips no eixo vertical
     * sem modificar alinhamento horizontal.
     */
    justify-content: center;
}

.titulo-filtro {
    display: block;

    margin-bottom: 1.3mm;

    color: #94a3b8;

    font-size: 1.65mm;
    font-weight: 900;

    letter-spacing: .12em;
}

.divisor {
    width: .3mm;
    background: #dbe4ee;
}

.chips,
.chips-pendencias {
    display: flex;
    flex-wrap: wrap;

    /*
     * Mantém os balões visualmente no centro
     * da altura disponível.
     */
    align-items: center;

    gap: 1mm;
}

.chips-pendencias {
    min-height: 3.6mm;

    align-content: center;

    /*
     * Compactação somente dos chips de pendências.
     * Os chips de filtros/campos/QR permanecem intactos.
     */
    gap: .6mm;
}

.chip {
    display: inline-flex;

    /*
     * Centralização interna do texto do balão.
     */
    align-items: center;
    justify-content: center;

    min-height: 4.4mm;

    padding:
        .65mm
        1.5mm;

    border-radius: 999px;

    font-size: 1.72mm;
    font-weight: 800;

    line-height: 1.05;
}

.chip--filtro {
    border:
        .25mm
        solid
        #cbd5e1;

    background: #ffffff;
    color: #334155;
}

.chip--campo {
    border:
        .25mm
        solid
        #a7f3d0;

    background: #ecfdf5;
    color: #047857;
}

.chip--pendencia {
    min-height: 3.6mm;

    padding:
        .45mm
        1mm;

    border:
        .25mm
        solid
        #fecdd3;

    background: #fff1f2;
    color: #be123c;

    font-size: 1.65mm;
}

.tabela-area {
    min-height: 0;

    overflow: hidden;

    border:
        .3mm
        solid
        #dbe4ee;

    border-radius: 2.5mm;

    background: #ffffff;
}

.tabela-cadastral {
    width: 100%;

    border-collapse: collapse;

    table-layout: fixed;
}

.tabela-cadastral thead {
    display: table-header-group;
}

/* G2-C10D-G9 — CENTRALIZAÇÃO VERTICAL */
.tabela-cadastral th {
    height: 7.2mm;

    padding:
        1.5mm
        1.6mm;

    border-bottom:
        .3mm
        solid
        #cbd5e1;

    background: #eef6f4;
    color: #315b50;

    font-size: 1.7mm;
    font-weight: 900;

    text-align: left;

    /*
     * Centralização vertical explícita.
     * Não depender do comportamento padrão do navegador.
     */
    vertical-align: middle;

    line-height: 1.1;

    letter-spacing: .045em;
}

.tabela-cadastral td {
    min-height: 7mm;

    padding:
        1.45mm
        1.6mm;

    border-bottom:
        .22mm
        solid
        #e2e8f0;

    /*
     * Centro vertical real para texto,
     * nomes, função, empresa e quantidade.
     */
    vertical-align: middle;

    color: #334155;

    font-size: 1.85mm;
    font-weight: 650;

    line-height: 1.2;

    overflow-wrap: anywhere;
}

.tabela-cadastral tbody tr:nth-child(even) {
    background: #fbfdfe;
}

.tabela-cadastral tr:last-child td {
    border-bottom: 0;
}

.tabela-cadastral td strong {
    color: #0f172a;

    font-weight: 900;
}

.centro {
    text-align: center;
}

.qtd {
    color: #be123c !important;

    font-size: 2.3mm !important;
    font-weight: 900 !important;
}

.rodape-cadastral {
    min-height: 6mm;

    display: flex;
    align-items: center;
    justify-content: space-between;

    gap: 4mm;

    padding-top: 1mm;

    border-top:
        .3mm
        solid
        #e2e8f0;

    color: #64748b;

    font-size: 1.75mm;
    font-weight: 700;
}

.rodape-cadastral strong {
    color: #334155;
}

/* =========================================================
   G18-A2.3 — PADRÃO INSTITUCIONAL CADASTRAL
   ========================================================= */

.hero-cadastral {
    width: 100%;
    height: 20mm;
    min-height: 20mm;

    display: grid;

    grid-template-columns:
        54mm
        minmax(0, 1fr)
        54mm;

    align-items: center;

    gap: 4mm;

    padding:
        2.4mm
        4mm;

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

.marca-safescan-cadastral {
    min-width: 0;

    display: flex;
    align-items: center;
    justify-content: flex-start;

    gap: 2.5mm;
}

.marca-safescan-cadastral__simbolo {
    width: 11.5mm;
    height: 11.5mm;

    flex:
        0
        0
        11.5mm;
}

.marca-safescan-cadastral__texto {
    min-width: 0;

    display: grid;

    line-height: 1;
}

.marca-safescan-cadastral__texto strong {
    color: #ffffff;

    font-size: 4.5mm;
    font-weight: 900;

    letter-spacing: .025em;
}

.marca-safescan-cadastral__texto small {
    margin-top: .9mm;

    color: rgba(255, 255, 255, .90);

    font-size: 2mm;
    font-weight: 800;

    letter-spacing: .18em;
}

.hero-cadastral .hero-textos {
    min-width: 0;
    height: 100%;

    display: flex;
    flex-direction: column;

    align-items: center;
    justify-content: center;

    text-align: center;

    overflow: hidden;
}

.hero-cadastral .hero-textos > span {
    margin: 0 0 .7mm;

    color: #6ee7b7;

    font-size: 1.7mm;
    font-weight: 900;

    letter-spacing: .15em;
}

.hero-cadastral .hero-textos h1 {
    max-width: 100%;

    margin: 0;

    color: #ffffff;

    font-size: 4.45mm;
    line-height: 1.04;

    font-weight: 900;

    text-align: center;

    overflow-wrap: anywhere;
}

.hero-cadastral .hero-textos p {
    max-width: 100%;

    margin:
        .75mm
        0
        0;

    color:
        rgba(
            255,
            255,
            255,
            .84
        );

    font-size: 1.8mm;
    line-height: 1.1;

    font-weight: 700;

    text-align: center;
}

.marca-contratante-cadastral {
    justify-self: end;
    align-self: center;

    width: auto;
    max-width: 34mm;
    height: auto;
    min-height: 9.7mm;

    display: inline-flex;
    align-items: center;
    justify-content: center;

    padding:
        .55mm
        .8mm;

    border-radius: 1.8mm;

    background:
        rgba(
            255,
            255,
            255,
            .97
        );

    box-shadow:
        0
        .55mm
        1.6mm
        rgba(
            2,
            6,
            23,
            .14
        );

    overflow: hidden;
}

.marca-contratante-cadastral__imagem {
    display: block;

    width: auto;
    height: 8.5mm;

    max-width: 31mm;
    max-height: 8.5mm;

    object-fit: contain;
}

.marca-contratante-cadastral__fallback {
    color: #0f5132;

    font-size: 4mm;
    font-weight: 900;
}

/* ---------------------------------------------------------
   CONTINUAÇÃO
   --------------------------------------------------------- */

.pagina-relatorio--continuacao
.cabecalho-continuacao {
    min-width: 0;
    min-height: 13mm;

    display: grid;

    grid-template-columns:
        40mm
        minmax(0, 1fr)
        40mm;

    align-items: center;

    gap: 4mm;

    padding:
        1.8mm
        3.5mm;

    border: 0;

    border-radius: 2.5mm;

    background-image:
        linear-gradient(
            108deg,
            rgba(4, 25, 34, .92) 0%,
            rgba(5, 61, 49, .80) 48%,
            rgba(7, 131, 62, .64) 100%
        ),
        url("${heroPendenciasCadastraisUrl}");

    background-repeat:
        no-repeat,
        no-repeat;

    background-position:
        center,
        center 60%;

    background-size:
        cover,
        cover;

    color: #ffffff;
}

.cabecalho-continuacao__marca {
    display: flex;

    align-items: baseline;

    gap: 1mm;
}

.cabecalho-continuacao__marca strong {
    margin: 0;

    color: #ffffff;

    font-size: 2.7mm;
    line-height: 1;

    font-weight: 900;
}

.cabecalho-continuacao__marca small {
    color: #a7f3d0;

    font-size: 1.35mm;

    font-weight: 900;

    letter-spacing: .13em;
}

.cabecalho-continuacao__titulo {
    min-width: 0;

    display: flex;
    flex-direction: column;

    align-items: center;
    justify-content: center;

    text-align: center;
}

.cabecalho-continuacao__titulo span {
    margin: 0 0 .35mm;

    color: #6ee7b7;

    font-size: 1.35mm;

    font-weight: 900;

    letter-spacing: .13em;
}

.cabecalho-continuacao__titulo strong {
    max-width: 100%;

    margin: 0;

    color: #ffffff;

    font-size: 2.75mm;
    line-height: 1.05;

    font-weight: 900;

    overflow-wrap: anywhere;
}

.pagina-relatorio--continuacao
.cabecalho-continuacao em {
    justify-self: end;

    color:
        rgba(
            255,
            255,
            255,
            .88
        );

    font-size: 1.55mm;

    font-style: normal;
    font-weight: 900;

    letter-spacing: .08em;
}

/* ---------------------------------------------------------
   FILTROS
   --------------------------------------------------------- */

.filtros-cadastrais {
    grid-template-columns:
        minmax(0, 1fr)
        .3mm
        minmax(0, 1.15fr)
        .3mm
        minmax(0, .85fr);
}

.chip--qr {
    border:
        .25mm
        solid
        #6ee7b7;

    background: #ecfdf5;
    color: #047857;
}

.chip--neutro {
    border:
        .25mm
        solid
        #dbe4ee;

    background: #ffffff;
    color: #64748b;
}

/* =========================================================
   CAD-QUALIDADE-3
   PADRÃO ÓPTICO — KPIs + FILTROS + CHIPS SUPERIORES

   Regra:
   - não confiar apenas em center/middle;
   - compensar baseline real da fonte;
   - reservar área física para tipografia legível;
   - centralizar linhas incompletas de chips;
   - não reduzir texto para fazê-lo caber.
   ========================================================= */

/* ---------------------------------------------------------
   KPIs — CONJUNTO RÓTULO + NÚMERO
   --------------------------------------------------------- */

.resumo-cadastral article {
    min-height: 16.5mm;

    display: flex;
    align-items: center;
    justify-content: center;

    gap: 5.5mm;

    padding:
        2.35mm
        3.2mm;

    box-sizing: border-box;

    text-align: center;
}

.resumo-cadastral article > span {
    min-width: 0;
    max-width: 72%;

    display: flex;
    align-items: center;
    justify-content: center;

    margin: 0;

    font-size: 2.15mm;
    font-weight: 900;

    line-height: 1.02;
    letter-spacing: .045em;

    text-align: center;

    /*
     * Compensação óptica leve.
     * Corrige o desenho dos glifos sem deslocar o card.
     */
    transform: translateY(-0.15mm);
}

.resumo-cadastral article > strong {
    flex:
        0
        0
        auto;

    min-width: 8mm;
    min-height: 7mm;

    display: flex;
    align-items: center;
    justify-content: center;

    margin: 0;

    font-size: 6.25mm;
    font-weight: 950;

    line-height: .92;

    text-align: center;

    /*
     * Números grandes possuem maior peso visual inferior.
     * A compensação coloca o glifo no centro óptico real.
     */
    transform: translateY(-0.45mm);
}


/* ---------------------------------------------------------
   FAIXA DOS TRÊS PAINÉIS

   A faixa é redistribuída porque o painel central possui
   muito mais conteúdo que os laterais.

   O ganho de largura permite aumentar a fonte dos chips
   sem comprimi-los artificialmente.
   --------------------------------------------------------- */

.filtros-cadastrais {
    min-height: 21.5mm;

    grid-template-columns:
        minmax(0, .85fr)
        .3mm
        minmax(0, 1.35fr)
        .3mm
        minmax(0, .80fr);

    gap: 1.8mm;

    padding:
        2.15mm
        2.5mm;

    box-sizing: border-box;
}


/* ---------------------------------------------------------
   TODOS OS TRÊS PAINÉIS
   --------------------------------------------------------- */

.filtros-cadastrais > div:not(.divisor) {
    min-width: 0;

    display: flex;
    flex-direction: column;

    align-items: center;
    justify-content: center;

    text-align: center;
}


/* ---------------------------------------------------------
   TÍTULOS DOS PAINÉIS
   --------------------------------------------------------- */

.filtros-cadastrais .titulo-filtro {
    display: block;

    width: 100%;

    margin:
        0
        0
        1.55mm;

    color: #94a3b8;

    font-size: 1.95mm;
    font-weight: 950;

    line-height: 1;

    letter-spacing: .10em;

    text-align: center;

    transform: translateY(-0.10mm);
}


/* ---------------------------------------------------------
   CONJUNTO DE CHIPS
   --------------------------------------------------------- */

.filtros-cadastrais .chips {
    width: 100%;
    min-width: 0;

    display: flex;
    flex-wrap: wrap;

    align-items: center;
    align-content: center;
    justify-content: center;

    column-gap: .95mm;
    row-gap: .85mm;

    margin: 0;

    text-align: center;
}


/* ---------------------------------------------------------
   CHIPS SUPERIORES

   IMPORTANTE:
   este seletor está limitado a .filtros-cadastrais.

   NÃO altera .chip--pendencia da tabela.

   O padding inferior maior que o superior é proposital:
   desloca o desenho visual dos glifos levemente para cima,
   mantendo o balão no mesmo eixo.
   --------------------------------------------------------- */

.filtros-cadastrais .chip {
    min-height: 5.2mm;

    box-sizing: border-box;

    display: inline-flex;

    align-items: center;
    justify-content: center;

    padding:
        .30mm
        1.35mm
        .90mm;

    font-size: 2.05mm;
    font-weight: 850;

    line-height: 1;

    text-align: center;

    white-space: nowrap;
}


/* ---------------------------------------------------------
   GARANTIA DE QUE O PAINEL CENTRAL CONTINUA CENTRALIZADO
   CASO CAD-CENTRO-2 JÁ ESTEJA PRESENTE.
   --------------------------------------------------------- */

.filtros-cadastrais__informacoes {
    align-items: center;
    justify-content: center;

    text-align: center;
}

.filtros-cadastrais__informacoes .chips {
    width: 100%;

    justify-content: center;
}

/* =========================================================
   CAD-QUALIDADE-4
   AJUSTE ÓPTICO FINAL — KPIs / PAINÉIS / CHIPS
   ========================================================= */


/* ---------------------------------------------------------
   KPIs

   O layout flex já centraliza as caixas.
   Aqui ajustamos o CENTRO ÓPTICO REAL dos glifos.

   O número sobe um pouco mais que o rótulo porque,
   visualmente, sua massa tipográfica permanece mais baixa.
   --------------------------------------------------------- */

.resumo-cadastral article {
    min-height: 16.5mm;

    display: flex;
    align-items: center;
    justify-content: center;

    gap: 5.2mm;

    padding:
        2.2mm
        3.2mm;

    box-sizing: border-box;

    text-align: center;
}

.resumo-cadastral article > span {
    display: flex;
    align-items: center;
    justify-content: center;

    margin: 0;

    font-size: 2.15mm;
    font-weight: 900;

    line-height: 1;

    text-align: center;

    transform: translateY(-0.05mm);
}

.resumo-cadastral article > strong {
    display: flex;
    align-items: center;
    justify-content: center;

    margin: 0;

    min-width: 8mm;

    font-size: 6.25mm;
    font-weight: 950;

    line-height: .90;

    text-align: center;

    /*
     * Compensação óptica do número.
     *
     * Não move o card.
     * Não muda a altura.
     * Move somente o desenho visual do número.
     */
    transform: translateY(-0.85mm);
}


/* ---------------------------------------------------------
   DISTRIBUIÇÃO DOS TRÊS PAINÉIS

   ANTES:
   painel esquerdo grande demais;
   painel central insuficiente;
   12 informações em 3 linhas.

   AGORA:
   esquerda  ~20%
   centro    ~57%
   direita   ~22%

   Isso mantém os dois chips laterais legíveis
   e entrega largura real ao conjunto de 12 campos.
   --------------------------------------------------------- */

.filtros-cadastrais {
    min-height: 20mm;

    grid-template-columns:
        minmax(0, .62fr)
        .3mm
        minmax(0, 1.76fr)
        .3mm
        minmax(0, .68fr);

    gap: 1.25mm;

    padding:
        1.85mm
        2.15mm;

    box-sizing: border-box;
}


/* ---------------------------------------------------------
   PAINÉIS
   --------------------------------------------------------- */

.filtros-cadastrais > div:not(.divisor) {
    min-width: 0;

    display: flex;
    flex-direction: column;

    align-items: center;
    justify-content: center;

    text-align: center;
}


/* ---------------------------------------------------------
   TÍTULOS
   --------------------------------------------------------- */

.filtros-cadastrais .titulo-filtro {
    display: block;

    width: 100%;

    margin:
        0
        0
        1.15mm;

    font-size: 1.95mm;
    font-weight: 950;

    line-height: 1;

    letter-spacing: .09em;

    text-align: center;

    transform: translateY(-0.05mm);
}


/* ---------------------------------------------------------
   ÁREA DOS CHIPS

   Cada linha é centralizada.
   Se a segunda linha tiver menos chips,
   ela continua centrada no painel.
   --------------------------------------------------------- */

.filtros-cadastrais .chips {
    width: 100%;
    min-width: 0;

    display: flex;
    flex-wrap: wrap;

    align-items: center;
    align-content: center;
    justify-content: center;

    column-gap: .72mm;
    row-gap: .72mm;

    margin: 0;

    text-align: center;
}


/* ---------------------------------------------------------
   CHIPS SUPERIORES — CENTRO ÓPTICO

   IMPORTANTE:

   O problema anterior era:
   - caixa centralizada;
   - texto visualmente baixo.

   Agora:
   - altura física explícita;
   - fonte maior;
   - padding inferior propositalmente maior;
   - align-items:center continua ativo;
   - o CONTENT BOX fica levemente acima do centro geométrico;
   - isso corrige a massa visual baixa dos glifos.

   Somente chips dentro de .filtros-cadastrais.
   Não atinge chip de pendência da tabela.
   --------------------------------------------------------- */

.filtros-cadastrais .chip {
    height: 5.65mm;
    min-height: 5.65mm;

    box-sizing: border-box;

    display: inline-flex;

    align-items: center;
    justify-content: center;

    /*
     * Centro óptico:
     *
     * top    = 0
     * bottom = 1.20mm
     *
     * O texto sobe dentro do balão;
     * o balão permanece exatamente no lugar.
     */
    padding:
        0
        1.35mm
        1.20mm;

    font-size: 2.12mm;
    font-weight: 850;

    line-height: 1;

    text-align: center;

    white-space: nowrap;
}


/* ---------------------------------------------------------
   PAINEL CENTRAL

   Reforço para funcionar tanto com quanto sem
   a classe adicionada no CAD-CENTRO-2.
   --------------------------------------------------------- */

.filtros-cadastrais__informacoes {
    min-width: 0;

    align-items: center;
    justify-content: center;

    text-align: center;
}

.filtros-cadastrais__informacoes .chips {
    width: 100%;

    justify-content: center;
}

/* =========================================================
   CAD-TEXTO-5

   DECISÃO VISUAL:
   A faixa superior cadastral não utiliza mais cápsulas.

   Os itens passam a ser texto simples separados por " / ".

   Exemplo:
   Foto / CPF / Nome / Empresa / Função / Telefone

   IMPORTANTE:
   .chip--pendencia da TABELA permanece intacto.
   ========================================================= */


/* ---------------------------------------------------------
   FAIXA SUPERIOR
   --------------------------------------------------------- */

.filtros-cadastrais {
    min-height: 15.5mm;

    grid-template-columns:
        minmax(0, .60fr)
        .3mm
        minmax(0, 1.82fr)
        .3mm
        minmax(0, .74fr);

    gap: 1.35mm;

    padding:
        1.65mm
        2.15mm;

    box-sizing: border-box;
}


/* ---------------------------------------------------------
   PAINÉIS
   --------------------------------------------------------- */

.filtros-cadastrais > div:not(.divisor) {
    min-width: 0;

    display: flex;
    flex-direction: column;

    align-items: center;
    justify-content: center;

    text-align: center;
}


/* ---------------------------------------------------------
   TÍTULOS
   --------------------------------------------------------- */

.filtros-cadastrais .titulo-filtro {
    display: block;

    width: 100%;

    margin:
        0
        0
        1.15mm;

    color: #94a3b8;

    font-size: 1.90mm;
    font-weight: 950;

    line-height: 1;

    letter-spacing: .09em;

    text-align: center;

    transform: none;
}


/* ---------------------------------------------------------
   LISTA DE VALORES

   Deixa de ser flex de balões.
   Passa a ser fluxo de texto inline.
   --------------------------------------------------------- */

.filtros-cadastrais .chips {
    display: block;

    width: 100%;
    min-width: 0;

    margin: 0;
    padding: 0;

    color: #334155;

    font-size: 2.20mm;
    font-weight: 800;

    line-height: 1.65;

    text-align: center;
}


/* ---------------------------------------------------------
   ITENS

   Mantemos a classe .chip apenas para preservar o HTML
   e o vínculo com os dados.

   Visualmente NÃO É MAIS CHIP.
   --------------------------------------------------------- */

.filtros-cadastrais .chip,
.filtros-cadastrais .chip--campo,
.filtros-cadastrais .chip--filtro,
.filtros-cadastrais .chip--qr {
    display: inline;

    width: auto;
    height: auto;
    min-width: 0;
    min-height: 0;

    margin: 0;
    padding: 0;

    border: 0;
    border-radius: 0;

    background: transparent;
    box-shadow: none;

    color: #334155;

    font-size: inherit;
    font-weight: inherit;

    line-height: inherit;

    text-align: center;

    white-space: nowrap;

    transform: none;
}


/* ---------------------------------------------------------
   SEPARADOR ENTRE ITENS

   Não existe separador depois do último item.
   --------------------------------------------------------- */

.filtros-cadastrais .chip:not(:last-child)::after {
    content: " / ";

    color: #94a3b8;

    font-weight: 700;

    white-space: pre;
}

.filtros-cadastrais .chip:last-child::after {
    content: "";
}


/* ---------------------------------------------------------
   GARANTIA EXTRA:
   nenhum estado visual antigo de cápsula sobrevive.
   --------------------------------------------------------- */

.filtros-cadastrais .chip--campo,
.filtros-cadastrais .chip--filtro,
.filtros-cadastrais .chip--qr {
    border-color: transparent;
    background-color: transparent;
}


/* ---------------------------------------------------------
   PAINEL CENTRAL

   Continua sendo o maior painel da faixa.
   --------------------------------------------------------- */

.filtros-cadastrais__informacoes {
    min-width: 0;

    align-items: center;
    justify-content: center;

    text-align: center;
}

.filtros-cadastrais__informacoes .chips {
    width: 100%;

    text-align: center;
}

/* =========================================================
   CAD-TEXTO-5-R1

   CORREÇÃO DE WRAPPING DO TEXTO SIMPLES

   O visual permanece SEM BALÕES.

   Mudança:
   - container = flex-wrap;
   - cada texto = item flex indivisível;
   - quebra somente ENTRE campos;
   - linhas ficam centralizadas;
   - nenhum overflow horizontal.
   ========================================================= */


/* ---------------------------------------------------------
   CONTAINER DOS TEXTOS
   --------------------------------------------------------- */

.filtros-cadastrais .chips {
    width: 100%;
    min-width: 0;

    display: flex;
    flex-wrap: wrap;

    align-items: center;
    align-content: center;
    justify-content: center;

    column-gap: 0;
    row-gap: .65mm;

    margin: 0;
    padding: 0;

    overflow: visible;

    text-align: center;
}


/* ---------------------------------------------------------
   CADA INFORMAÇÃO

   Continua SEM fundo, SEM borda e SEM cápsula.

   O inline-flex serve somente para que o navegador
   entenda cada informação como uma unidade de quebra.

   Exemplo:
   "Data de nascimento"

   permanece inteiro.
   --------------------------------------------------------- */

.filtros-cadastrais .chip,
.filtros-cadastrais .chip--campo,
.filtros-cadastrais .chip--filtro,
.filtros-cadastrais .chip--qr {
    flex:
        0
        0
        auto;

    display: inline-flex;

    align-items: center;
    justify-content: center;

    width: auto;
    height: auto;

    min-width: 0;
    min-height: 0;

    margin: 0;
    padding: 0;

    border: 0;
    border-radius: 0;

    background: transparent;
    background-color: transparent;

    box-shadow: none;

    color: #334155;

    font-size: 2.10mm;
    font-weight: 800;

    line-height: 1.20;

    text-align: center;

    white-space: nowrap;

    transform: none;

    overflow: visible;
}


/* ---------------------------------------------------------
   BARRA ENTRE OS CAMPOS

   A barra pertence ao item anterior.
   O navegador pode quebrar após cada unidade completa.
   --------------------------------------------------------- */

.filtros-cadastrais .chip:not(:last-child)::after {
    content: " / ";

    display: inline;

    margin:
        0
        .60mm;

    color: #94a3b8;

    font-size: 2.10mm;
    font-weight: 700;

    line-height: 1;

    white-space: pre;
}

.filtros-cadastrais .chip:last-child::after {
    content: "";

    margin: 0;
}


/* ---------------------------------------------------------
   INFORMAÇÕES VERIFICADAS

   Garantia específica contra clipping horizontal.
   --------------------------------------------------------- */

.filtros-cadastrais__informacoes {
    min-width: 0;

    overflow: visible;
}

.filtros-cadastrais__informacoes .chips {
    width: 100%;
    max-width: 100%;

    flex-wrap: wrap;

    justify-content: center;

    overflow: visible;
}

/* =========================================================
   CAD-TEXTO-5-R2

   AJUSTE PONTUAL DE LARGURA

   Objetivo:
   manter Empresa + Classificação sem quebra
   no cenário de nome empresarial longo.

   Nenhuma outra característica visual é alterada.
   ========================================================= */

.filtros-cadastrais {
    grid-template-columns:
        minmax(0, .95fr)
        .3mm
        minmax(0, 1.47fr)
        .3mm
        minmax(0, .74fr);
}


/* ---------------------------------------------------------
   FILTROS DA TELA

   Mantém Empresa e Classificação como unidades indivisíveis
   e tenta mantê-las na mesma linha enquanto houver espaço.
   --------------------------------------------------------- */

.filtros-cadastrais > div:first-child .chips {
    width: 100%;

    flex-wrap: nowrap;

    justify-content: center;

    overflow: visible;
}

.filtros-cadastrais > div:first-child .chip {
    flex:
        0
        0
        auto;

    white-space: nowrap;
}

/* =========================================================
   CAD-TEXTO-5-R3

   REGRA PERMANENTE — EMPRESA LONGA

   Não utilizar limite arbitrário de caracteres.

   A decisão é feita pela largura física REAL do painel.

   CURTA:
   Empresa / Classificação

   LONGA:
   Empresa longa /
   Classificação

   MUITO LONGA:
   Empresa muito longa pode quebrar
   somente entre palavras.

   Nunca cortar.
   Nunca ellipsis.
   Nunca sair do painel.
   ========================================================= */


/* ---------------------------------------------------------
   PAINEL DE FILTROS

   Retira o nowrap rígido criado no R2.
   O navegador passa a decidir a quebra pela largura real.
   --------------------------------------------------------- */

.filtros-cadastrais > div:first-child .chips {
    width: 100%;
    max-width: 100%;
    min-width: 0;

    display: flex;
    flex-wrap: wrap;

    align-items: center;
    align-content: center;
    justify-content: center;

    column-gap: 0;
    row-gap: .55mm;

    padding:
        0
        .85mm;

    box-sizing: border-box;

    overflow: visible;

    text-align: center;
}


/* ---------------------------------------------------------
   EMPRESA — PRIMEIRO ITEM

   flex-basis:auto:
   usa primeiro a largura natural do nome.

   Se Empresa + Classificação ultrapassarem o painel,
   a Classificação migra automaticamente para a próxima linha.

   max-width:100%:
   impede a Empresa de ultrapassar o painel.

   white-space:normal:
   permite que um nome EXCEPCIONALMENTE longo quebre
   por palavras somente quando necessário.
   --------------------------------------------------------- */

.filtros-cadastrais
> div:first-child
.chip:first-child {
    flex:
        0
        1
        auto;

    max-width: 100%;

    white-space: normal;

    overflow-wrap: normal;
    word-break: normal;
    hyphens: none;

    line-height: 1.25;

    text-align: center;

    overflow: visible;
}


/* ---------------------------------------------------------
   CLASSIFICAÇÃO — SEGUNDO ITEM

   Permanece indivisível.

   Se não houver espaço ao lado da Empresa,
   desce inteira para a próxima linha.
   --------------------------------------------------------- */

.filtros-cadastrais
> div:first-child
.chip:nth-child(2) {
    flex:
        0
        0
        auto;

    white-space: nowrap;

    line-height: 1.20;

    text-align: center;
}


/* ---------------------------------------------------------
   PROTEÇÃO CONTRA CLIPPING

   Nenhum descendente do painel esquerdo pode
   ultrapassar fisicamente sua área.
   --------------------------------------------------------- */

.filtros-cadastrais > div:first-child {
    min-width: 0;

    overflow: visible;
}

.filtros-cadastrais
> div:first-child
.chip:first-child {
    box-sizing: border-box;
}


/* ---------------------------------------------------------
   NÃO REDUZIR TIPOGRAFIA

   Mantemos o padrão de texto aprovado.
   A geometria deve absorver nomes maiores.
   --------------------------------------------------------- */

.filtros-cadastrais
> div:first-child
.chip {
    font-size: 2.10mm;

    font-weight: 800;
}

/* =========================================================
   CAD-QR-COND-2

   QR NÃO SELECIONADO:
   a faixa superior passa de três painéis para dois.

   Mantemos exatamente a largura total disponível:
   .95 + 2.21 = 3.16

   O espaço anteriormente reservado ao painel QR
   é absorvido por INFORMAÇÕES VERIFICADAS.
   ========================================================= */

.filtros-cadastrais.filtros-cadastrais--sem-qr {
    grid-template-columns:
        minmax(0, .95fr)
        .3mm
        minmax(0, 2.21fr);
}

.filtros-cadastrais--sem-qr
.filtros-cadastrais__informacoes {
    min-width: 0;

    width: 100%;
}


/*
 * QR selecionado mantém a configuração atual de três painéis.
 *
 * QR não selecionado não possui:
 * - painel;
 * - divisor;
 * - texto substituto.
 */

/* =========================================================
   CAD-PEND-TEXTO-1

   INFORMAÇÕES FALTANTES — TEXTO PURO

   Mantemos o HTML atual para não tocar na lógica dos dados.

   Visualmente:
   - remove cápsulas;
   - remove fundo;
   - remove borda;
   - remove arredondamento;
   - mantém cor de alerta;
   - adiciona separador " / ";
   - quebra somente entre itens.
   ========================================================= */


/* ---------------------------------------------------------
   CONTAINER DAS PENDÊNCIAS
   --------------------------------------------------------- */

.tabela-cadastral .chips-pendencias {
    width: 100%;
    min-width: 0;

    display: flex;
    flex-wrap: wrap;

    align-items: center;
    align-content: center;
    justify-content: flex-start;

    column-gap: 0;
    row-gap: .45mm;

    margin: 0;
    padding: 0;

    overflow: visible;

    text-align: left;
}


/* ---------------------------------------------------------
   CADA INFORMAÇÃO FALTANTE

   A classe continua se chamando chip--pendencia
   por compatibilidade interna.

   Visualmente NÃO É MAIS UM CHIP.
   --------------------------------------------------------- */

.tabela-cadastral
.chips-pendencias
.chip--pendencia {
    flex:
        0
        0
        auto;

    display: inline-flex;

    align-items: center;
    justify-content: flex-start;

    width: auto;
    height: auto;

    min-width: 0;
    min-height: 0;

    margin: 0;
    padding: 0;

    border: 0;
    border-radius: 0;

    background: transparent;
    background-color: transparent;

    box-shadow: none;

    color: #be123c;

    font-size: 1.78mm;
    font-weight: 800;

    line-height: 1.24;

    text-align: left;

    white-space: nowrap;

    transform: none;

    overflow: visible;
}


/* ---------------------------------------------------------
   SEPARADOR

   Cada item recebe "/" depois dele,
   exceto o último.

   A barra pertence ao item anterior para que
   a quebra ocorra SOMENTE entre pendências.
   --------------------------------------------------------- */

.tabela-cadastral
.chips-pendencias
.chip--pendencia:not(:last-child)::after {
    content: " / ";

    display: inline;

    margin:
        0
        .48mm;

    color: #94a3b8;

    font-size: 1.72mm;
    font-weight: 700;

    line-height: 1;

    white-space: pre;
}

.tabela-cadastral
.chips-pendencias
.chip--pendencia:last-child::after {
    content: "";

    margin: 0;
}


/* ---------------------------------------------------------
   GARANTIA CONTRA HERANÇA DO VISUAL ANTIGO
   --------------------------------------------------------- */

.tabela-cadastral
.chips-pendencias
.chip.chip--pendencia {
    border-color: transparent;

    background: transparent;
    background-color: transparent;

    box-shadow: none;
}


/* ---------------------------------------------------------
   ITEM NEUTRO

   Se uma linha excepcionalmente vier sem pendências,
   o "-" permanece simples e sem cápsula.
   --------------------------------------------------------- */

.tabela-cadastral
.chips-pendencias
.chip--neutro {
    display: inline;

    min-width: 0;
    min-height: 0;

    padding: 0;
    margin: 0;

    border: 0;
    border-radius: 0;

    background: transparent;

    color: #64748b;

    font-size: 1.78mm;
    font-weight: 700;

    line-height: 1.20;
}

/* =========================================================
   CAD-TABELA-GEO-1

   GEOMETRIA DA TABELA + SEPARADORES DE REGISTROS
   ========================================================= */


/* ---------------------------------------------------------
   LINHA FINA ENTRE CADA REGISTRO

   A linha pertence às células da própria linha,
   garantindo continuidade visual em toda a tabela.

   Não altera altura fixa.
   Não altera paginação.
   --------------------------------------------------------- */

.tabela-cadastral tbody tr:not(:last-child) td {
    border-bottom:
        0.16mm
        solid
        #d8e1e7;
}


/* ---------------------------------------------------------
   ÚLTIMA LINHA

   Não cria linha artificial antes do rodapé/espaço livre.
   --------------------------------------------------------- */

.tabela-cadastral tbody tr:last-child td {
    border-bottom: 0;
}

/* =========================================================
   CAD-TABELA-GEO-2
   SEPARADORES + ALINHAMENTO DA COLUNA QTD.
   ========================================================= */


/* ---------------------------------------------------------
   1. LINHA HORIZONTAL ENTRE REGISTROS

   A versão anterior ficou clara demais no PDF.

   Esta continua fina, porém com contraste suficiente
   para separar visualmente cada colaborador.
   --------------------------------------------------------- */

.tabela-cadastral tbody tr:not(:last-child) > td {
    border-bottom:
        0.20mm
        solid
        #cbd5dc !important;
}


/* Último registro da página não recebe traço artificial. */
.tabela-cadastral tbody tr:last-child > td {
    border-bottom: 0 !important;
}


/* ---------------------------------------------------------
   2. SEPARADOR VERTICAL ANTES DA QTD.

   Funciona nos dois modos:

   QR OFF:
   Informações Faltantes | QTD.

   QR ON:
   QR Impresso | QTD.
   --------------------------------------------------------- */

.tabela-cadastral thead th:last-child,
.tabela-cadastral tbody td.qtd {
    border-left:
        0.18mm
        solid
        #d3dde3 !important;
}


/* ---------------------------------------------------------
   3. CABEÇALHO QTD.

   O centro do texto passa a coincidir com o centro real
   da última coluna.
   --------------------------------------------------------- */

.tabela-cadastral thead th:last-child {
    box-sizing: border-box;

    padding-left: .45mm !important;
    padding-right: .45mm !important;

    text-align: center !important;
    vertical-align: middle !important;

    line-height: 1 !important;
}


/* ---------------------------------------------------------
   4. NÚMEROS QTD.

   Remove qualquer alinhamento herdado à direita.

   Padding horizontal idêntico dos dois lados.
   Vertical-align middle para linhas de uma ou duas alturas.
   --------------------------------------------------------- */

.tabela-cadastral tbody td.qtd {
    box-sizing: border-box;

    padding-left: .45mm !important;
    padding-right: .45mm !important;

    text-align: center !important;
    vertical-align: middle !important;

    line-height: 1 !important;

    font-variant-numeric: tabular-nums;
}


/* ---------------------------------------------------------
   Proteção adicional contra regras genéricas do relatório.
   --------------------------------------------------------- */

.tabela-cadastral tbody tr > td.qtd:last-child {
    text-align: center !important;
}

/* =========================================================
   CAD-TABELA-GEO-3

   GRADE COMPLETA + EMPRESA ADAPTATIVA
   ========================================================= */


/* ---------------------------------------------------------
   GRADE VERTICAL

   Cria separação fina entre TODAS as colunas.
   --------------------------------------------------------- */

.tabela-cadastral thead th,
.tabela-cadastral tbody td {
    border-right:
        0.16mm
        solid
        #d5dee4 !important;
}


/* Não duplicar linha na extremidade direita. */
.tabela-cadastral thead th:last-child,
.tabela-cadastral tbody td:last-child {
    border-right: 0 !important;
}


/* ---------------------------------------------------------
   GRADE HORIZONTAL

   Todas as linhas da tabela passam a possuir
   separação horizontal explícita.
   --------------------------------------------------------- */

.tabela-cadastral thead th {
    border-bottom:
        0.20mm
        solid
        #bccdc5 !important;
}

.tabela-cadastral tbody tr > td {
    border-bottom:
        0.18mm
        solid
        #d5dee4 !important;
}


/*
 * Mantemos inclusive o fechamento da última linha
 * para formar uma grade visual completa.
 */
.tabela-cadastral tbody tr:last-child > td {
    border-bottom:
        0.18mm
        solid
        #d5dee4 !important;
}


/* ---------------------------------------------------------
   EMPRESA — REGRA ADAPTATIVA POR ESPAÇO FÍSICO

   A coluna é propositalmente compacta.

   Empresa curta:
   RIBEIRO AQUINO

   permanece em uma linha.

   Empresa longa:
   CONSTRUPAV CONSTRUÇÃO E
   PAVIMENTAÇÃO

   quebra somente nos espaços naturais das palavras.
   --------------------------------------------------------- */

.tabela-cadastral thead th:nth-child(4),
.tabela-cadastral tbody td:nth-child(4) {
    min-width: 0;

    white-space: normal !important;

    overflow-wrap: normal;
    word-break: normal;
    hyphens: none;

    text-overflow: clip;

    box-sizing: border-box;
}


/*
 * Nome empresarial usa a largura física disponível
 * sem invadir a coluna de pendências.
 */
.tabela-cadastral tbody td:nth-child(4) {
    padding-left: 1.05mm;
    padding-right: .70mm;

    line-height: 1.10;

    text-wrap: balance;
}


/* ---------------------------------------------------------
   INFORMAÇÕES FALTANTES

   Reduzimos o padding esquerdo para que a informação
   comece visualmente mais perto de Função/Empresa.
   --------------------------------------------------------- */

.tabela-cadastral thead th:nth-child(5),
.tabela-cadastral tbody td:nth-child(5) {
    padding-left: 1.05mm !important;
    padding-right: .85mm !important;
}


/* ---------------------------------------------------------
   QTD.

   Mantém o gate anterior:
   cabeçalho e números perfeitamente centralizados.
   --------------------------------------------------------- */

.tabela-cadastral thead th:last-child,
.tabela-cadastral tbody td.qtd {
    text-align: center !important;
    vertical-align: middle !important;

    padding-left: .45mm !important;
    padding-right: .45mm !important;
}

/* =========================================================
   CAD-QR-ALIGN-1

   CENTRALIZAÇÃO ÓPTICA DA COLUNA QR
   ========================================================= */


/* ---------------------------------------------------------
   CABEÇALHO + CÉLULAS

   A própria célula continua sendo célula de tabela.
   Não utilizamos display:flex no TD/TH para não interferir
   no algoritmo de layout da tabela.
   --------------------------------------------------------- */

.tabela-cadastral .qr-impresso-cabecalho,
.tabela-cadastral .qr-impresso-celula {
    box-sizing: border-box;

    padding-left: .45mm !important;
    padding-right: .45mm !important;

    text-align: center !important;
    vertical-align: middle !important;
}


/* ---------------------------------------------------------
   WRAPPER INTERNO

   width:100% garante centro horizontal real.

   translateY corrige somente o baseline visual,
   sem mover borda, coluna ou linha da tabela.
   --------------------------------------------------------- */

.tabela-cadastral .qr-impresso-texto {
    display: block;

    width: 100%;

    margin: 0;
    padding: 0;

    line-height: 1.05;

    text-align: center;

    transform: translateY(-0.32mm);
}


/* ---------------------------------------------------------
   CABEÇALHO

   Compensação levemente menor porque o peso tipográfico
   do título é diferente do conteúdo SIM/NÃO.
   --------------------------------------------------------- */

.tabela-cadastral
.qr-impresso-cabecalho
.qr-impresso-texto {
    transform: translateY(-0.18mm);
}


/* ---------------------------------------------------------
   SIM / NÃO / DATA

   A data, quando existir, permanece no mesmo bloco central.
   --------------------------------------------------------- */

.tabela-cadastral
.qr-impresso-celula
.qr-impresso-texto {
    white-space: normal;

    text-align: center;
}

/* =========================================================
   CAD-LINHA-V-1

   CENTRALIZAÇÃO VERTICAL ADAPTATIVA

   REGRA:
   o maior conteúdo define a altura física da linha.

   As demais células são centralizadas nessa altura,
   sem compensação fixa.

   Resultado:
   espaço superior ~= espaço inferior.
   ========================================================= */


/* ---------------------------------------------------------
   REGRA BASE DE TODAS AS CÉLULAS DO CORPO
   --------------------------------------------------------- */

.tabela-cadastral tbody td {
    box-sizing: border-box;

    vertical-align: middle !important;
}


/* ---------------------------------------------------------
   PADDING VERTICAL SIMÉTRICO

   Não alterar padding horizontal já definido
   nos gates de geometria.
   --------------------------------------------------------- */

.tabela-cadastral tbody td {
    padding-top: .82mm !important;
    padding-bottom: .82mm !important;
}


/* ---------------------------------------------------------
   INFORMAÇÕES FALTANTES

   O bloco interno não possui margem vertical.

   Uma ou duas linhas permanecem como um único conjunto
   centralizado pela própria célula.
   --------------------------------------------------------- */

.tabela-cadastral
tbody
td:nth-child(5)
.chips-pendencias {
    margin-top: 0 !important;
    margin-bottom: 0 !important;

    padding-top: 0 !important;
    padding-bottom: 0 !important;

    transform: none !important;
}


/* ---------------------------------------------------------
   CADA ITEM DA LISTA DE PENDÊNCIAS

   Nenhum item recebe deslocamento vertical.
   --------------------------------------------------------- */

.tabela-cadastral
tbody
td:nth-child(5)
.chip--pendencia {
    margin-top: 0 !important;
    margin-bottom: 0 !important;

    padding-top: 0 !important;
    padding-bottom: 0 !important;

    transform: none !important;

    line-height: 1.22;
}


/* ---------------------------------------------------------
   EMPRESA

   Se quebrar em 2 linhas, participa naturalmente
   da altura da linha e permanece centralizada.
   --------------------------------------------------------- */

.tabela-cadastral tbody td:nth-child(4) {
    vertical-align: middle !important;
}


/* ---------------------------------------------------------
   COLABORADOR E FUNÇÃO

   Permanecem no centro mesmo quando Empresa ou
   Informações Faltantes provocam uma linha mais alta.
   --------------------------------------------------------- */

.tabela-cadastral tbody td:nth-child(2),
.tabela-cadastral tbody td:nth-child(3) {
    vertical-align: middle !important;
}


/* ---------------------------------------------------------
   QR

   IMPORTANTE:
   preservamos CAD-QR-ALIGN-1.

   A célula é centralizada pela tabela;
   o wrapper qr-impresso-texto mantém sua compensação óptica.
   --------------------------------------------------------- */

.tabela-cadastral tbody td.qr-impresso-celula {
    vertical-align: middle !important;
}


/* ---------------------------------------------------------
   QTD.
   --------------------------------------------------------- */

.tabela-cadastral tbody td.qtd {
    vertical-align: middle !important;
}


/* ---------------------------------------------------------
   ALTURA DAS LINHAS

   Nunca fixar altura.

   A linha cresce apenas quando seu conteúdo precisar.
   --------------------------------------------------------- */

.tabela-cadastral tbody tr {
    height: auto !important;
}

/* ---------------------------------------------------------
   QR IMPRESSO
   --------------------------------------------------------- */

.qr-impresso-celula {
    vertical-align: middle;
    text-align: center;

    font-size: 6.25pt;
    font-weight: 900;
    line-height: 1.22;

    white-space: normal;
    word-break: normal;

    color: #475569;
}

.qr-impresso-celula--sim {
    color: #047857;
}

.qr-impresso-celula--nao {
    color: #475569;
}
/* ---------------------------------------------------------
   RODAPÉ 3 ZONAS
   --------------------------------------------------------- */

.rodape-cadastral {
    min-height: 6mm;

    display: grid;

    grid-template-columns:
        minmax(0, 1fr)
        auto
        minmax(0, 1fr);

    align-items: center;

    gap: 4mm;

    padding-top: 1mm;

    border-top:
        .3mm
        solid
        #e2e8f0;

    color: #64748b;

    font-size: 1.7mm;
    line-height: 1;

    font-weight: 700;
}

.rodape-cadastral__marca {
    justify-self: start;
}

.rodape-cadastral__data {
    justify-self: center;

    text-align: center;

    white-space: nowrap;
}

.rodape-cadastral strong {
    justify-self: end;

    color: #334155;

    text-align: right;

    white-space: nowrap;
}

@page {
    size: A4 landscape;
    margin: 0;
}

@media print {
    html,
    body {
        width: 297mm;

        min-height: auto;

        margin: 0;
        padding: 0;

        background: #ffffff;
    }

    .pagina-relatorio {
        width: 297mm;
        height: 210mm;
        min-height: 210mm;

        margin: 0;

        border: 0;
        border-radius: 0;

        box-shadow: none;

        break-after: page;
        page-break-after: always;
    }

    .pagina-relatorio:last-child {
        break-after: auto;
        page-break-after: auto;
    }
}

/* =========================================================
   G18-A2.4-R1 — GEOMETRIA DAS PÁGINAS DE CONTINUAÇÃO

   Reaproveitamento físico de ~12 mm sem redução tipográfica.
   ========================================================= */

.pagina-relatorio--continuacao {
    padding:
        3mm
        6mm
        3mm;

    grid-template-rows:
        9.5mm
        minmax(0, 1fr)
        4mm;

    gap:
        .75mm;
}

.pagina-relatorio--continuacao
.cabecalho-continuacao {
    box-sizing:
        border-box;

    min-height:
        9.5mm;

    height:
        9.5mm;

    padding:
        1.1mm
        3.5mm;
}

.pagina-relatorio--continuacao
.rodape-cadastral {
    box-sizing:
        border-box;

    min-height:
        4mm;

    height:
        4mm;

    padding-top:
        .3mm;
}

/* =========================================================
   CAD-LINHA-V-2

   AJUSTE ÓPTICO FINAL

   Igualdade visual não é necessariamente igualdade
   matemática de padding por causa das métricas da fonte.

   Soma vertical preservada:

   ANTES
   .82 + .82 = 1.64mm

   AGORA
   .48 + 1.16 = 1.64mm

   Resultado:
   conteúdo sobe opticamente ~.34mm
   sem aumentar nem comprimir a linha.
   ========================================================= */


/* ---------------------------------------------------------
   COLUNAS DE CONTEÚDO

   1 = #
   2 = COLABORADOR
   3 = FUNÇÃO
   4 = EMPRESA
   5 = INFORMAÇÕES FALTANTES

   QR e QTD ficam fora.
   --------------------------------------------------------- */

.tabela-cadastral
tbody
td:nth-child(-n+5) {
    padding-top: .48mm !important;
    padding-bottom: 1.16mm !important;

    vertical-align: middle !important;
}


/* ---------------------------------------------------------
   PENDÊNCIAS

   Um conjunto com 1 ou 2 linhas recebe a mesma
   compensação através da célula.

   Não mover individualmente os itens.
   --------------------------------------------------------- */

.tabela-cadastral
tbody
td:nth-child(5)
.chips-pendencias {
    margin-top: 0 !important;
    margin-bottom: 0 !important;

    padding-top: 0 !important;
    padding-bottom: 0 !important;

    transform: none !important;
}

.tabela-cadastral
tbody
td:nth-child(5)
.chip--pendencia {
    margin-top: 0 !important;
    margin-bottom: 0 !important;

    padding-top: 0 !important;
    padding-bottom: 0 !important;

    transform: none !important;
}


/* ---------------------------------------------------------
   QR

   NÃO recebe CAD-LINHA-V-2.

   Mantém CAD-QR-ALIGN-1.
   --------------------------------------------------------- */

.tabela-cadastral
tbody
td.qr-impresso-celula {
    padding-top: .82mm !important;
    padding-bottom: .82mm !important;

    vertical-align: middle !important;
}


/* ---------------------------------------------------------
   QTD.

   NÃO recebe CAD-LINHA-V-2.

   Mantém centralização já aprovada.
   --------------------------------------------------------- */

.tabela-cadastral
tbody
td.qtd {
    padding-top: .82mm !important;
    padding-bottom: .82mm !important;

    vertical-align: middle !important;
}

/* =========================================================
   CAD-LINHA-V-3

   NORMALIZAÇÃO ESTRUTURAL DE CENTRALIZAÇÃO

   Não dependemos mais de padding assimétrico aplicado
   diretamente ao TD.

   Cada célula principal possui um wrapper próprio.
   ========================================================= */


/* ---------------------------------------------------------
   TD continua sendo TABLE-CELL.

   Zeramos somente o padding vertical herdado dos gates
   anteriores.

   O espaço vertical passa a pertencer ao wrapper.
   --------------------------------------------------------- */

.tabela-cadastral tbody td {
    padding-top: 0 !important;
    padding-bottom: 0 !important;

    vertical-align: middle !important;
}


/* ---------------------------------------------------------
   WRAPPER PADRÃO

   Padding matematicamente simétrico.
   A compensação óptica será aplicada ao wrapper completo,
   e não à geometria da célula.
   --------------------------------------------------------- */

.tabela-cadastral .celula-cadastral {
    box-sizing: border-box;

    display: block;

    width: 100%;

    margin: 0;

    padding-top: .82mm;
    padding-bottom: .82mm;

    vertical-align: middle;
}


/* ---------------------------------------------------------
   COMPENSAÇÃO ÓPTICA

   Aplicada igualmente em:
   # / Colaborador / Função / Empresa / Pendências.

   A estrutura da linha permanece simétrica.

   Apenas a pintura do conteúdo sobe levemente para compensar
   a massa inferior dos glifos renderizados no PDF.
   --------------------------------------------------------- */

.tabela-cadastral
.celula-cadastral--ajuste-optico {
    transform: translateY(-0.35mm);
}


/* ---------------------------------------------------------
   COLABORADOR

   Remove comportamento de linha inline do STRONG.
   --------------------------------------------------------- */

.tabela-cadastral
.celula-cadastral--colaborador
strong {
    display: block;

    margin: 0;

    line-height: 1.08;
}


/* ---------------------------------------------------------
   FUNÇÃO
   --------------------------------------------------------- */

.tabela-cadastral
.celula-cadastral--funcao {
    line-height: 1.10;
}


/* ---------------------------------------------------------
   EMPRESA

   Continua podendo quebrar somente entre palavras.
   --------------------------------------------------------- */

.tabela-cadastral
.celula-cadastral--empresa {
    white-space: normal;

    overflow-wrap: normal;
    word-break: normal;
    hyphens: none;

    line-height: 1.10;
}


/* ---------------------------------------------------------
   INFORMAÇÕES FALTANTES

   O bloco inteiro é centralizado como uma unidade.
   Uma linha ou duas linhas usam exatamente a mesma regra.
   --------------------------------------------------------- */

.tabela-cadastral
.celula-cadastral--pendencias {
    line-height: 1.16;
}

.tabela-cadastral
.celula-cadastral--pendencias
.chips-pendencias {
    width: 100%;

    margin-top: 0 !important;
    margin-bottom: 0 !important;

    padding-top: 0 !important;
    padding-bottom: 0 !important;

    transform: none !important;
}


/* ---------------------------------------------------------
   CENTRO
   --------------------------------------------------------- */

.tabela-cadastral
.celula-cadastral--centro {
    text-align: center;
}


/* ---------------------------------------------------------
   QTD.

   QTD já possuía alinhamento aprovado.

   Recebe somente estrutura interna e padding simétrico.
   Não recebe translateY das demais colunas.
   --------------------------------------------------------- */

.tabela-cadastral
td.qtd {
    padding-top: 0 !important;
    padding-bottom: 0 !important;

    vertical-align: middle !important;
}

.tabela-cadastral
.celula-cadastral--qtd {
    padding-top: .82mm;
    padding-bottom: .82mm;

    text-align: center;

    transform: none;
}


/* ---------------------------------------------------------
   QR

   QR continua usando CAD-QR-ALIGN-1.

   Como o padding global dos TDs foi zerado acima,
   restauramos seu espaço vertical próprio.
   --------------------------------------------------------- */

.tabela-cadastral
td.qr-impresso-celula {
    padding-top: .82mm !important;
    padding-bottom: .82mm !important;

    vertical-align: middle !important;
}


/* ---------------------------------------------------------
   ALTURA NATURAL

   Nunca fixar altura da linha.
   --------------------------------------------------------- */

.tabela-cadastral tbody tr {
    height: auto !important;
}
</style>
</head>

<body>
    ${conteudo}
</body>
</html>`;
}

async function baixarHTMLComoPdf({
    html,
    nomeArquivo,
}) {
    const iframe =
        document.createElement(
            "iframe"
        );

    iframe.setAttribute(
        "aria-hidden",
        "true"
    );

    Object.assign(
        iframe.style,
        {
            position:
                "fixed",

            left:
                "-100000px",

            top:
                "0",

            width:
                "1200px",

            height:
                "900px",

            border:
                "0",

            opacity:
                "0",

            pointerEvents:
                "none",
        }
    );

    document.body.appendChild(
        iframe
    );

    try {
        const documento =
            iframe.contentDocument;

        const janela =
            iframe.contentWindow;

        if (
            !documento ||
            !janela
        ) {
            throw new Error(
                "Iframe de renderização do PDF cadastral indisponível."
            );
        }

        documento.open();

        documento.write(
            html
        );

        documento.close();

        await aguardarImagensCadastrais(
            documento
        );

        await aguardarLayout(
            janela
        );

        const paginas =
            paginarRelatorio(
                documento
            );

        await aguardarLayout(
            janela
        );

        const pdf =
            new jsPDF(
                "l",
                "mm",
                "a4"
            );

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
                    `A página cadastral ${indice + 1} excedeu a área física antes da captura.`
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

                        backgroundColor:
                            "#ffffff",

                        useCORS:
                            true,

                        logging:
                            false,

                        width:
                            larguraPx,

                        height:
                            alturaPx,

                        windowWidth:
                            larguraPx,

                        windowHeight:
                            alturaPx,

                        scrollX:
                            0,

                        scrollY:
                            0,
                    }
                );

            if (
                indice >
                0
            ) {
                pdf.addPage(
                    "a4",
                    "l"
                );
            }

            pdf.addImage(
                canvas.toDataURL(
                    "image/jpeg",
                    0.96
                ),
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

        return true;
    } catch (error) {
        console.error(
            "Erro ao gerar Relatório de Pendências Cadastrais:",
            error
        );

        alert(
            "Não foi possível gerar o PDF de pendências cadastrais sem cortes. Recarregue a página e tente novamente."
        );

        return false;
    } finally {
        iframe.remove();
    }
}

export async function baixarRelatorioPendenciasCadastraisPDF({
    nomeArquivo =
        "relatorio-pendencias-cadastrais.pdf",

    titulo =
        "Relatório de Pendências Cadastrais",

    resumo =
        null,

    camposSelecionados =
        [],

    filtrosQrSelecionados =
        [],

    contratanteCabecalho =
        null,

    filtros =
        {},
} = {}) {
    /*
     * O serviço usa diretamente resumo.avaliacoes,
     * já calculado pelo modal.
     *
     * Nenhuma função de consolidação cadastral
     * é executada neste serviço.
     */

    const temCamposSelecionados =
        Array.isArray(
            camposSelecionados
        ) &&
        camposSelecionados.length >
            0;

    const filtrosQrValidos =
        Array.isArray(
            filtrosQrSelecionados
        )
            ? filtrosQrSelecionados.filter(
                (estado) =>
                    [
                        "impresso",
                        "sem_impressao",
                    ].includes(
                        estado
                    )
            )
            : [];

    const temFiltroQrSelecionado =
        filtrosQrValidos.length >
        0;

    /*
     * Critério válido:
     *
     * - pelo menos um campo cadastral;
     * OU
     * - pelo menos um estado operacional de QR.
     *
     * O resumo já vem pronto do modal.
     * O renderer não recalcula pendências.
     */
    if (
        !temCamposSelecionados &&
        !temFiltroQrSelecionado
    ) {
        alert(
            "Selecione pelo menos uma informação ou um estado de QR para gerar o relatório."
        );

        return false;
    }

    if (
        !resumo ||
        !Array.isArray(
            resumo.avaliacoes
        ) ||
        resumo.avaliacoes.length ===
            0
    ) {
        alert(
            "Nenhuma pendência cadastral foi encontrada para os filtros selecionados."
        );

        return false;
    }

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

    return baixarHTMLComoPdf({
        html:
            montarHTML({
                titulo,
                dataEmissao,
                resumo,
                camposSelecionados,
                filtrosQrSelecionados:
                    filtrosQrValidos,
                filtros,
                contratanteCabecalho,
            }),

        nomeArquivo,
    });
}