// Relatório visual de colaboradores e treinamentos.
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import heroColaboradoresTreinamentosObrasUrl from "../../assets/heroes/relatorios/hero-pendencias-treinamentos-obras-v1.png";
import {
    classeStatusRelatorio,
    escaparHTML,
    ICONES_RELATORIO_COLABORADORES,
    prepararColaboradoresRelatorio,
} from "./relatorioColaboradoresUtils";

const PDF_LARGURA_MM = 297;
const PDF_ALTURA_MM = 210;
const ESCALA_RENDERIZACAO = 1.5;
const TOLERANCIA_OVERFLOW_PX = 2;

function limparListaRelatorio(lista = []) {
    if (!Array.isArray(lista)) {
        const texto = String(lista || "").trim();
        return texto ? [texto] : [];
    }

    return lista
        .map((item) => {
            if (typeof item === "string") return item.trim();
            if (item?.nome) return String(item.nome).trim();
            if (item?.treinamento?.nome) return String(item.treinamento.nome).trim();
            return String(item || "").trim();
        })
        .filter(Boolean);
}

function limitarListaRelatorio(lista = []) {
    const itens =
        limparListaRelatorio(
            lista
        );

    /*
     * G2-C10D-D1
     *
     * O detalhamento documental deve exibir
     * todos os treinamentos da categoria.
     */
    return {
        itens,
        restantes: 0,
        total: itens.length,
    };
}

function obterIniciaisEmpresa(nome = "") {
    const partes = String(nome || "Empresa")
        .split(/\s+/)
        .map((item) => item.trim())
        .filter(Boolean);

    if (!partes.length) return "SST";

    return partes
        .slice(0, 2)
        .map((item) => item[0])
        .join("")
        .toUpperCase();
}

/* =============================================================
   G2-C10D-D4 — SUBCONTRATADA SEPARADA

   O helper mantém `nome` por compatibilidade com o detalhamento,
   mas passa a fornecer também:

   - nomePrincipal
   - subcontratada

   Assim o contexto superior não precisa mais usar "Sub.:"
   como título da empresa.
   ============================================================= */

function obterEmpresaCompactaRelatorio(colaborador = {}, empresaPadrao = "") {
    const empresaExibicao =
        String(
            colaborador.empresaExibicao ||
            ""
        ).trim();

    const correspondenciaSubcontratada =
        empresaExibicao.match(
            /subcontratada\s*:\s*([^/|;]+)/i
        );

    const subcontratada =
        String(
            correspondenciaSubcontratada?.[1] ||
            ""
        ).trim();

    /*
     * Quando empresaExibicao vier no padrão:
     *
     * RIBEIRO AQUINO / Subcontratada: CONSTRUPAV
     *
     * recuperamos também a empresa principal diretamente
     * da parte anterior ao marcador.
     */
    const trechoPrincipalEmpresaExibicao =
        correspondenciaSubcontratada
            ? empresaExibicao
                  .slice(
                      0,
                      correspondenciaSubcontratada.index
                  )
                  .replace(
                      /[\s/|:;•-]+$/g,
                      ""
                  )
                  .trim()
            : "";

    const nomePrincipalCompleto =
        String(
            trechoPrincipalEmpresaExibicao ||
            colaborador.empresaNome ||
            colaborador.empresa ||
            empresaPadrao ||
            "-"
        ).trim() ||
        "-";

    /*
     * Compatibilidade:
     * o detalhe que já utilizava `nome` continua recebendo
     * a representação anterior da subcontratada.
     */
    const nomeDetalheCompleto =
        String(
            subcontratada ||
            colaborador.empresaNome ||
            colaborador.empresa ||
            empresaPadrao ||
            "-"
        ).trim() ||
        "-";

    const compactarNome =
        (
            nomeOriginal,
            limiteDireto = 20,
            limiteMontagem = 18
        ) => {
            const nome =
                String(
                    nomeOriginal ||
                    "-"
                ).trim() ||
                "-";

            if (
                nome.length <=
                limiteDireto
            ) {
                return nome;
            }

            const palavras =
                nome
                    .split(
                        /\s+/
                    )
                    .filter(Boolean);

            let nomeCurto =
                "";

            for (
                const palavra of palavras
            ) {
                const candidato =
                    nomeCurto
                        ? `${nomeCurto} ${palavra}`
                        : palavra;

                if (
                    candidato.length >
                    limiteMontagem
                ) {
                    break;
                }

                nomeCurto =
                    candidato;
            }

            return (
                nomeCurto ||
                palavras[0] ||
                nome
            );
        };

    const nomePrincipal =
        compactarNome(
            nomePrincipalCompleto
        );

    const nomeDetalhe =
        compactarNome(
            nomeDetalheCompleto
        );

    /*
     * G2-C10D-D4-R1 — CONTRATADA PELA
     *
     * Quando existir subcontratada:
     *
     * empresa do card  = subcontratada
     * contratada pela  = empresa principal
     *
     * Exemplo:
     * CONSTRUPAV
     * Contratada pela: RIBEIRO AQUINO
     */
    const nomeEmpresaCard =
        subcontratada
            ? compactarNome(
                  subcontratada
              )
            : nomePrincipal;

    const contratadaPela =
        subcontratada
            ? nomePrincipalCompleto
            : "";

    return {
        rotulo: "Empresa",

        /*
         * Compatibilidade do detalhamento preservada.
         */
        nome:
            subcontratada
                ? `Sub.: ${nomeDetalhe}`
                : nomeDetalhe,

        nomePrincipal,

        subcontratada,

        nomeEmpresaCard,

        contratadaPela,
    };
}

function agruparPorEmpresaRelatorio(colaboradores = []) {
    const mapa = new Map();

    colaboradores.forEach((colaborador) => {
        const empresaNome = String(colaborador.empresaNome || colaborador.empresa || "Empresa não informada").trim() || "Empresa não informada";
        const chave = String(colaborador.empresaId || empresaNome).trim().toLowerCase();

        const empresaCompacta =
            obterEmpresaCompactaRelatorio(
                colaborador,
                empresaNome
            );

        if (!mapa.has(chave)) {
            mapa.set(chave, {
                id:
                    colaborador.empresaId ||
                    chave,

                /*
                 * O título representa a empresa real
                 * à qual os colaboradores pertencem.
                 *
                 * Havendo subcontratada:
                 * CONSTRUPAV
                 */
                nome:
                    empresaCompacta.nomeEmpresaCard ||
                    empresaNome ||
                    empresaCompacta.nome,

                rotulo:
                    empresaCompacta.rotulo,

                contratadaPela:
                    empresaCompacta.contratadaPela ||
                    "",

                subcontratada:
                    empresaCompacta.subcontratada ||
                    "",

                cnpj:
                    colaborador.empresaCnpj ||
                    "",

                responsavel:
                    colaborador.empresaResponsavel ||
                    "",

                logoUrl:
                    colaborador.empresaLogoUrl ||
                    "",

                colaboradores: [],
            });
        }

        const empresa =
            mapa.get(
                chave
            );

        empresa.cnpj =
            empresa.cnpj ||
            colaborador.empresaCnpj ||
            "";

        empresa.responsavel =
            empresa.responsavel ||
            colaborador.empresaResponsavel ||
            "";

        empresa.logoUrl =
            empresa.logoUrl ||
            colaborador.empresaLogoUrl ||
            "";

        empresa.subcontratada =
            empresa.subcontratada ||
            empresaCompacta.subcontratada ||
            "";

        empresa.contratadaPela =
            empresa.contratadaPela ||
            empresaCompacta.contratadaPela ||
            "";

        empresa.colaboradores.push(
            colaborador
        );
    });

    /* =============================================================
       G2-C10D-D4-R2-R2 — HIERARQUIA CONTRATUAL

       Cada empresa contratada forma um grupo.

       Dentro do grupo:
       1. contratada principal;
       2. subcontratadas;
       3. subcontratadas em ordem alfabética.

       Exemplo:
       RIBEIRO AQUINO
       CONSTRUPAV
       OUTRA SUBCONTRATADA
       ============================================================= */

    return Array.from(
        mapa.values()
    ).sort(
        (
            a,
            b
        ) => {
            const aEhSubcontratada =
                Boolean(
                    String(
                        a.contratadaPela ||
                        ""
                    ).trim()
                );

            const bEhSubcontratada =
                Boolean(
                    String(
                        b.contratadaPela ||
                        ""
                    ).trim()
                );

            /*
             * Raiz contratual.
             *
             * Principal:
             * usa o próprio nome.
             *
             * Subcontratada:
             * usa "contratadaPela".
             */
            const raizContratualA =
                String(
                    aEhSubcontratada
                        ? a.contratadaPela
                        : a.nome
                )
                    .replace(
                        /\s+/g,
                        " "
                    )
                    .trim();

            const raizContratualB =
                String(
                    bEhSubcontratada
                        ? b.contratadaPela
                        : b.nome
                )
                    .replace(
                        /\s+/g,
                        " "
                    )
                    .trim();

            const comparacaoRaiz =
                raizContratualA.localeCompare(
                    raizContratualB,
                    "pt-BR",
                    {
                        sensitivity:
                            "base",
                    }
                );

            if (
                comparacaoRaiz !==
                0
            ) {
                return comparacaoRaiz;
            }

            /*
             * Dentro da MESMA relação contratual:
             * empresa principal sempre primeiro.
             */
            if (
                aEhSubcontratada !==
                bEhSubcontratada
            ) {
                return aEhSubcontratada
                    ? 1
                    : -1;
            }

            /*
             * Depois, subcontratadas em ordem alfabética.
             */
            return String(
                a.nome ||
                ""
            ).localeCompare(
                String(
                    b.nome ||
                    ""
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

function calcularResumoEmpresaRelatorio(colaboradores = []) {
    return colaboradores.reduce(
        (acc, colaborador) => {
            const status = String(colaborador.statusGeral || "").toLowerCase();

            acc.total += 1;
            acc.pendentes += Number(colaborador.pendentes?.length || colaborador.pendentesTotal || 0) || 0;
            acc.vencidos += Number(colaborador.vencidos?.length || colaborador.vencidosTotal || 0) || 0;
            acc.vencendo += Number(colaborador.vencendo?.length || colaborador.vencendoTotal || 0) || 0;

            if (status.includes("liberado")) acc.liberados += 1;
            else if (status.includes("pend")) acc.comPendencia += 1;
            else if (status.includes("bloque")) acc.bloqueados += 1;
            else if (status.includes("análise") || status.includes("analise")) acc.emAnalise += 1;

            return acc;
        },
        {
            total: 0,
            liberados: 0,
            comPendencia: 0,
            bloqueados: 0,
            emAnalise: 0,
            pendentes: 0,
            vencidos: 0,
            vencendo: 0,
        }
    );
}

function montarListaHtmlRelatorio(lista = [], vazio = "Nenhum item.") {
    const resumo = limitarListaRelatorio(lista, 6);

    if (!resumo.itens.length) {
        return `<p class="lista-vazia">${escaparHTML(vazio)}</p>`;
    }

    return [
        "<ul>",
        ...resumo.itens.map((item) => `<li>${escaparHTML(item)}</li>`),

        "</ul>",
    ].join("");
}

/* =============================================================
   G2-C10D-C1 — TOPO VISUAL PRÓPRIO
   Hero, empresa e KPIs pertencem somente a este relatório.
   ============================================================= */

function montarLogoEmpresaHtml(empresa = {}) {
    if (empresa.logoUrl) {
        return `
            <img
                class="contexto-empresa-colaboradores__logo-img"
                src="${escaparHTML(empresa.logoUrl)}"
                alt="Logo ${escaparHTML(empresa.nome || "empresa")}"
            />
        `;
    }

    return `
        <span class="contexto-empresa-colaboradores__logo-fallback">
            ${escaparHTML(
                obterIniciaisEmpresa(
                    empresa.nome ||
                    "Empresa"
                )
            )}
        </span>
    `;
}

function montarMarcaContratanteColaboradoresTreinamentos(
    contratanteCabecalho = null
) {
    const contratante =
        contratanteCabecalho &&
        typeof contratanteCabecalho === "object"
            ? contratanteCabecalho
            : {
                  nome: "Idealiza Cidades",
                  logoUrl: "",
              };

    if (contratante.logoUrl) {
        return `
            <span class="hero-colaboradores__contratante-box">
                <img
                    class="hero-colaboradores__contratante-img"
                    src="${escaparHTML(contratante.logoUrl)}"
                    alt="${escaparHTML(
                        contratante.nome ||
                        "Idealiza Cidades"
                    )}"
                />
            </span>
        `;
    }

    return `
        <span
            class="
                hero-colaboradores__contratante-box
                hero-colaboradores__contratante-box--texto
            "
        >
            IDEALIZA
        </span>
    `;
}

function montarCabecalhoColaboradoresTreinamentos(
    contratanteCabecalho = null,
    dataEmissao = "",
    titulo = "Relatório de colaboradores e treinamentos"
) {
    const nomeContratante =
        contratanteCabecalho?.nome ||
        "Idealiza Cidades";

    return `
        <header
            class="cabecalho-colaboradores-treinamentos"
            title="Emitido em ${escaparHTML(dataEmissao)}"
        >
            <div
                class="hero-colaboradores__safescan"
                aria-label="SafeScan Brasil"
            >
                <svg
                    class="hero-colaboradores__simbolo"
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

                <span class="hero-colaboradores__marca-texto">
                    <strong>SAFESCAN</strong>
                    <small>BRASIL</small>
                </span>
            </div>

            <div class="hero-colaboradores__titulo">
                <h1>
                    ${escaparHTML(titulo)}
                </h1>

                <p>
                    Visão consolidada por empresa,
                    colaborador e situação dos treinamentos
                </p>
            </div>

            <div
                class="hero-colaboradores__contratante"
                aria-label="Contratante: ${escaparHTML(
                    nomeContratante
                )}"
                title="Contratante: ${escaparHTML(
                    nomeContratante
                )}"
            >
                ${montarMarcaContratanteColaboradoresTreinamentos(
                    contratanteCabecalho
                )}

                <span
                    class="hero-colaboradores__continuacao"
                    aria-hidden="true"
                >
                    CONTINUAÇÃO
                </span>
            </div>
        </header>
    `;
}

function obterClasseNomeEmpresaColaboradoresTreinamentos(
    nome = ""
) {
    const tamanho =
        String(
            nome ||
            ""
        ).trim().length;

    if (tamanho >= 52) {
        return "contexto-empresa-colaboradores__nome--muito-longo";
    }

    if (tamanho >= 38) {
        return "contexto-empresa-colaboradores__nome--longo";
    }

    return "";
}

function montarContextoEmpresaColaboradoresTreinamentos(
    empresa = {},
    totalColaboradores = 0
) {
    const cnpj =
        empresa.cnpj ||
        "-";

    const classeNome =
        obterClasseNomeEmpresaColaboradoresTreinamentos(
            empresa.nome
        );

    const contratadaPela =
        String(
            empresa.contratadaPela ||
            ""
        ).trim();

    const contratadaPelaHtml =
        contratadaPela
            ? `
                <span
                    class="contexto-empresa-colaboradores__contratada-pela"
                >
                    <strong>
                        Contratada pela:
                    </strong>

                    ${escaparHTML(
                        contratadaPela
                    )}
                </span>
            `
            : "";

    return `
        <section
            class="contexto-empresa-colaboradores"
            data-topo-colaboradores="empresa"
        >
            <span class="contexto-empresa-colaboradores__logo">
                ${montarLogoEmpresaHtml(empresa)}
            </span>

            <span class="contexto-empresa-colaboradores__texto">
                <strong
                    class="
                        contexto-empresa-colaboradores__nome
                        ${classeNome}
                    "
                >
                    ${escaparHTML(
                        empresa.nome ||
                        "-"
                    )}
                </strong>

                <small>
                    CNPJ • ${escaparHTML(cnpj)}
                </small>

                <span>
                    ${escaparHTML(totalColaboradores)}
                    colaborador(es)
                </span>

                ${contratadaPelaHtml}
            </span>
        </section>
    `;
}

function montarKpiColaboradoresTreinamentos({
    icone = "",
    titulo = "",
    valor = 0,
    classe = "",
} = {}) {
    return `
        <article
            class="
                kpi-colaboradores
                ${classe}
            "
        >
            <span class="kpi-colaboradores__icone">
                ${icone}
            </span>

            <span class="kpi-colaboradores__texto">
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
function montarRodapeColaboradoresTreinamentos() {
    return `
        <footer class="rodape-colaboradores-treinamentos">
            <span class="rodape-colaboradores-treinamentos__marca">
                SafeScan Brasil
            </span>

            <span class="rodape-colaboradores-treinamentos__descricao">
                Relatório de colaboradores e treinamentos
            </span>

            <span class="rodape-colaboradores-treinamentos__pagina">
                Página - de -
            </span>
        </footer>
    `;
}
function montarFiltrosColaboradoresTreinamentosRelatorio(
    filtros = {}
) {
    const itens = [
        [
            "Busca",
            filtros.busca ||
            "-"
        ],
        [
            "Empresa",
            filtros.empresa ||
            "Todas"
        ],
        [
            "Classificação",
            filtros.classificacao ||
            "Todos"
        ],
        [
            "Colaboradores",
            filtros.colaboradoresFiltrados ||
            "-"
        ],
    ];

    return `
        <section
            class="filtros-colaboradores-treinamentos"
            data-topo-colaboradores="filtros"
        >
            <span class="filtros-colaboradores-treinamentos__rotulo">
                FILTROS
            </span>

            ${itens
                .map(
                    ([label, valor]) => `
                        <span class="filtro-colaboradores-inline">
                            <small>
                                ${escaparHTML(label)}
                            </small>

                            <strong>
                                ${escaparHTML(valor)}
                            </strong>
                        </span>
                    `
                )
                .join("")}
        </section>
    `;
}
function montarSecaoEmpresaRelatorio(
    empresa = {},
    contratanteCabecalho = null,
    indiceEmpresa = 0,
    dataEmissao = "",
    filtros = {},
    titulo = "Relatório de colaboradores e treinamentos"
) {
    const colaboradoresEmpresa = Array.isArray(empresa.colaboradores) ? empresa.colaboradores : [];
    const resumo = calcularResumoEmpresaRelatorio(colaboradoresEmpresa);
    const linhasTabela = colaboradoresEmpresa.map((colaborador, indice) => `
        <tr>
            <td>
                <span class="celula-conteudo-optico-colaboradores">
                    ${indice + 1}
                </span>
            </td>

            <td class="texto-forte">
                <span class="celula-conteudo-optico-colaboradores">
                    ${escaparHTML(colaborador.nome || "-")}
                </span>
            </td>

            <td>
                <span class="celula-conteudo-optico-colaboradores">
                    ${escaparHTML(colaborador.funcao || "-")}
                </span>
            </td>

            <td>
                <span
                    class="
                        celula-conteudo-optico-colaboradores
                        badge
                        ${classeStatusRelatorio(colaborador.statusMobilizacao)}
                    "
                >
                    ${escaparHTML(colaborador.statusMobilizacao || "-")}
                </span>
            </td>

            <td>
                <span
                    class="
                        celula-conteudo-optico-colaboradores
                        badge
                        ${classeStatusRelatorio(colaborador.statusGeral)}
                    "
                >
                    ${escaparHTML(colaborador.statusGeral || "-")}
                </span>
            </td>

            <td>
                <span class="celula-conteudo-optico-colaboradores">
                    ${Number(colaborador.pendentes?.length || colaborador.pendentesTotal || 0) || 0}
                </span>
            </td>

            <td>
                <span class="celula-conteudo-optico-colaboradores">
                    ${Number(colaborador.vencidos?.length || colaborador.vencidosTotal || 0) || 0}
                </span>
            </td>

            <td>
                <span class="celula-conteudo-optico-colaboradores">
                    ${Number(colaborador.vencendo?.length || colaborador.vencendoTotal || 0) || 0}
                </span>
            </td>
        </tr>
    `);

    const montarTabelaResumo = (linhas = []) => `
        <table class="tabela-resumo-colaboradores">
            <colgroup>
                <col class="col-numero" />
                <col class="col-colaborador" />
                <col class="col-funcao" />
                <col class="col-situacao" />
                <col class="col-status" />
                <col class="col-pendentes" />
                <col class="col-vencidos" />
                <col class="col-vencer" />
            </colgroup>
            <thead>
                <tr>
                    <th><div class="th-conteudo">#</div></th>
                    <th><div class="th-conteudo">Colaborador</div></th>
                    <th><div class="th-conteudo">Função</div></th>
                    <th><div class="th-conteudo">Situação na obra</div></th>
                    <th><div class="th-conteudo">Status geral</div></th>
                    <th><div class="th-conteudo">Pendentes</div></th>
                    <th><div class="th-conteudo">Vencidos</div></th>
                    <th><div class="th-conteudo">A vencer</div></th>
                </tr>
            </thead>
            <tbody>
                ${linhas.join("") || `<tr><td colspan="8">Nenhum colaborador encontrado.</td></tr>`}
            </tbody>
        </table>
    `;

    const limitePrimeiraPaginaResumo = Number.POSITIVE_INFINITY;
    const limiteContinuacaoResumo = Number.POSITIVE_INFINITY;
    const linhasPrimeiraPagina = linhasTabela.slice(0, limitePrimeiraPaginaResumo);
    const paginasContinuacaoResumo = [];
    for (
        let indice = limitePrimeiraPaginaResumo;
        indice < linhasTabela.length;
        indice += limiteContinuacaoResumo
    ) {
        paginasContinuacaoResumo.push(`
            <section class="pagina-relatorio quebra-pagina pagina-relatorio--resumo-continuacao">
                <section class="bloco bloco--resumo-continuacao">
                    <h2>Resumo por colaborador - continuação</h2>
                    ${montarTabelaResumo(linhasTabela.slice(indice, indice + limiteContinuacaoResumo))}
                </section>
                ${montarRodapeColaboradoresTreinamentos()}
            </section>
        `);
    }

    const cartoesDetalhes = colaboradoresEmpresa.map((colaborador, indice) => {
        const validos = limparListaRelatorio(colaborador.validos);
        const pendentes = limparListaRelatorio(colaborador.pendentes);
        const vencidos = limparListaRelatorio(colaborador.vencidos);
        const vencendo = limparListaRelatorio(colaborador.vencendo);

        const fotoColaborador = colaborador.fotoUrl
            ? `<img src="${escaparHTML(colaborador.fotoUrl)}" alt="Foto ${escaparHTML(colaborador.nome || "colaborador")}" />`
            : escaparHTML(obterIniciaisEmpresa(colaborador.nome || "C"));
        const empresaCompacta = obterEmpresaCompactaRelatorio(colaborador, empresa.nome);

        return `
                    <section class="detalhe-colaborador detalhe-colaborador--compacto">
                        <div class="detalhe-topo">
                            <div class="numero-colaborador">
                                <svg viewBox="0 0 26 26" aria-hidden="true" focusable="false">
                                    <rect x="0" y="0" width="26" height="26" rx="7"></rect>
                                    <text x="13" y="13" dominant-baseline="central" text-anchor="middle">${indice + 1}</text>
                                </svg>
                            </div>
                            <div class="avatar-colaborador ${colaborador.fotoUrl ? "avatar-colaborador--foto" : ""}">${fotoColaborador}</div>
                            <div class="detalhe-identificacao">
                                <h3>${escaparHTML(colaborador.nome || "-")}</h3>
                                <p><strong>Código:</strong> ${escaparHTML(colaborador.codigo || "-")}</p>
                                <p><strong>Função:</strong> ${escaparHTML(colaborador.funcao || "-")}</p>
                                <p><strong>Matriz aplicada:</strong> ${escaparHTML(colaborador.matriz || "-")}</p>
                            </div>
                            <div class="detalhe-status">
                                <div class="detalhe-status-linha detalhe-status-linha--empresa">
                                    <strong>${escaparHTML(empresaCompacta.rotulo)}:</strong>
                                    <span>${escaparHTML(empresaCompacta.nome)}</span>
                                </div>
                                <div class="detalhe-status-linha">
                                    <strong>Situação na obra:</strong>
                                    <span class="detalhe-status-valor ${classeStatusRelatorio(colaborador.statusMobilizacao)}">${escaparHTML(colaborador.statusMobilizacao || "-")}</span>
                                </div>
                                <div class="detalhe-status-linha">
                                    <strong>Status geral:</strong>
                                    <span class="detalhe-status-valor ${classeStatusRelatorio(colaborador.statusGeral)}">${escaparHTML(colaborador.statusGeral || "-")}</span>
                                </div>
                            </div>
                        </div>
                        <div class="detalhe-grids">
                            <div class="lista-card lista-card-ok">
                                <h4>✅ Válidos (${validos.length})</h4>
                                ${montarListaHtmlRelatorio(validos, "Nenhum treinamento válido.")}
                            </div>
                            <div class="lista-card lista-card-pendente">
                                <h4>⚠️ Pendentes (${pendentes.length})</h4>
                                ${montarListaHtmlRelatorio(pendentes, "Nenhuma pendência.")}
                            </div>
                            <div class="lista-card lista-card-vencido">
                                <h4>🔒 Vencidos (${vencidos.length})</h4>
                                ${montarListaHtmlRelatorio(vencidos, "Nenhum treinamento vencido.")}
                            </div>
                            <div class="lista-card lista-card-vencendo">
                                <h4>◷ A vencer (${vencendo.length})</h4>
                                ${montarListaHtmlRelatorio(vencendo, "Nenhum treinamento a vencer.")}
                            </div>
                        </div>
                    </section>
        `;
    });

    const detalhes = [];
    for (let indice = 0; indice < cartoesDetalhes.length; indice += 3) {
        detalhes.push(`
            <section class="pagina-relatorio quebra-pagina pagina-relatorio--detalhe-colaborador">
                ${montarCabecalhoColaboradoresTreinamentos(contratanteCabecalho, dataEmissao, "Detalhamento de colaborador e treinamentos")}
                <section class="bloco bloco-detalhamento bloco-detalhamento--pagina-dupla">
                    <h2>Detalhamento</h2>
                    <div class="detalhes-duplos">
                        ${cartoesDetalhes.slice(indice, indice + 3).join("")}
                    </div>
                </section>
                ${montarRodapeColaboradoresTreinamentos()}
            </section>
        `);
    }

    return `
        <section class="pagina-relatorio ${indiceEmpresa > 0 ? "quebra-pagina" : ""}">
            ${montarCabecalhoColaboradoresTreinamentos(
                contratanteCabecalho,
                dataEmissao,
                titulo
            )}

            <section
                class="resumo-geral-colaboradores"
                data-topo-colaboradores="resumo"
            >
                ${montarContextoEmpresaColaboradoresTreinamentos(
                    empresa,
                    resumo.total
                )}

                <div class="resumo-colaboradores-grid">
                    ${montarKpiColaboradoresTreinamentos({
                        icone: ICONES_RELATORIO_COLABORADORES.total,
                        titulo: "Total",
                        valor: resumo.total,
                        classe: "kpi-colaboradores--total",
                    })}

                    ${montarKpiColaboradoresTreinamentos({
                        icone: ICONES_RELATORIO_COLABORADORES.liberados,
                        titulo: "Liberados",
                        valor: resumo.liberados,
                        classe: "kpi-colaboradores--ok",
                    })}

                    ${montarKpiColaboradoresTreinamentos({
                        icone: ICONES_RELATORIO_COLABORADORES.pendencia,
                        titulo: "Com pendência",
                        valor: resumo.comPendencia,
                        classe: "kpi-colaboradores--alerta",
                    })}

                    ${montarKpiColaboradoresTreinamentos({
                        icone: ICONES_RELATORIO_COLABORADORES.bloqueados,
                        titulo: "Bloqueados",
                        valor: resumo.bloqueados,
                        classe: "kpi-colaboradores--critico",
                    })}

                    ${montarKpiColaboradoresTreinamentos({
                        icone: ICONES_RELATORIO_COLABORADORES.analise,
                        titulo: "Em análise",
                        valor: resumo.emAnalise,
                        classe: "kpi-colaboradores--analise",
                    })}

                    ${montarKpiColaboradoresTreinamentos({
                        icone: ICONES_RELATORIO_COLABORADORES.vencidos,
                        titulo: "Vencidos",
                        valor: resumo.vencidos,
                        classe: "kpi-colaboradores--vencido",
                    })}

                    ${montarKpiColaboradoresTreinamentos({
                        icone: ICONES_RELATORIO_COLABORADORES.vencer,
                        titulo: "A vencer",
                        valor: resumo.vencendo,
                        classe: "kpi-colaboradores--vencer",
                    })}
                </div>
            </section>

            ${indiceEmpresa === 0
                ? montarFiltrosColaboradoresTreinamentosRelatorio(
                      filtros
                  )
                : ""}

            <section class="bloco">
                <h2>Resumo por colaborador</h2>
                ${montarTabelaResumo(linhasPrimeiraPagina)}
            </section>

            ${montarRodapeColaboradoresTreinamentos()}
        </section>
        ${paginasContinuacaoResumo.join("")}
        ${detalhes.join("") || `
            <section class="pagina-relatorio quebra-pagina">
                ${montarCabecalhoColaboradoresTreinamentos(contratanteCabecalho, dataEmissao, "Detalhamento de colaborador e treinamentos")}
                <section class="bloco bloco-detalhamento"><h2>Detalhamento</h2><p class="lista-vazia">Nenhum colaborador para detalhar.</p></section>
                ${montarRodapeColaboradoresTreinamentos()}
            </section>
        `}
    `;
}



function paginaColaboradoresTreinamentosTemOverflow(pagina) {
    return (
        pagina.scrollHeight >
            pagina.clientHeight +
            TOLERANCIA_OVERFLOW_PX ||
        pagina.scrollWidth >
            pagina.clientWidth +
            TOLERANCIA_OVERFLOW_PX
    );
}

async function aguardarImagensColaboradoresTreinamentos(
    documento,
    tempoMaximo = 6000
) {
    const imagens =
        Array.from(
            documento.images ||
            []
        );

    await Promise.all(
        imagens.map(
            (imagem) =>
                new Promise(
                    (resolve) => {
                        if (imagem.complete) {
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

                        setTimeout(
                            finalizar,
                            tempoMaximo
                        );
                    }
                )
        )
    );
}

async function aguardarLayoutColaboradoresTreinamentos(
    janela
) {
    if (janela.document?.fonts?.ready) {
        try {
            await janela.document.fonts.ready;
        } catch {
            // Fontes de sistema podem não expor Promise utilizável.
        }
    }

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

/* =============================================================
   G2-C10D-B1 — PAGINAÇÃO DINÂMICA
   ============================================================= */

function paginaColaboradoresTreinamentosTemOverflowVertical(
    pagina
) {
    return (
        pagina.scrollHeight >
        pagina.clientHeight +
            TOLERANCIA_OVERFLOW_PX
    );
}

function paginaColaboradoresTreinamentosTemOverflowHorizontal(
    pagina
) {
    return (
        pagina.scrollWidth >
        pagina.clientWidth +
            TOLERANCIA_OVERFLOW_PX
    );
}

function criarContinuacaoResumoColaboradoresTreinamentos(
    paginaAtual
) {
    const clone =
        paginaAtual.cloneNode(
            true
        );

    clone.classList.add(
        "quebra-pagina",
        "pagina-relatorio--resumo-continuacao"
    );

    const tabela =
        clone.querySelector(
            ".tabela-resumo-colaboradores"
        );

    const blocoResumo =
        tabela?.closest(
            ".bloco"
        );

    if (
        !tabela ||
        !blocoResumo
    ) {
        throw new Error(
            "Não foi possível criar uma página de continuação do resumo."
        );
    }

    const cabecalho =
        clone.querySelector(
            ".cabecalho-colaboradores-treinamentos"
        );

    if (!cabecalho) {
        throw new Error(
            "Cabeçalho da continuação do resumo não foi identificado."
        );
    }

    const rodape =
        clone.lastElementChild;

    if (
        !rodape ||
        rodape === blocoResumo
    ) {
        throw new Error(
            "Rodapé da continuação do resumo não foi identificado."
        );
    }

    Array.from(
        clone.children
    ).forEach(
        (filho) => {
            if (
                filho !== cabecalho &&
                filho !== blocoResumo &&
                filho !== rodape
            ) {
                filho.remove();
            }
        }
    );

    const nomeEmpresa =
        paginaAtual.dataset.empresaNome ||
        paginaAtual
            .querySelector(
                ".contexto-empresa-colaboradores__nome"
            )
            ?.textContent
            ?.trim() ||
        "Empresa";

    /*
     * O clone recebe o nome para permitir continuação
     * de continuação sem perder o contexto da empresa.
     */
    clone.dataset.empresaNome =
        nomeEmpresa;

    const titulo =
        blocoResumo.querySelector(
            "h2"
        );

    if (titulo) {
        titulo.textContent =
            `Resumo por colaborador - continuação - ${nomeEmpresa}`;
    }

    const tbody =
        tabela.querySelector(
            "tbody"
        );

    if (!tbody) {
        throw new Error(
            "TBODY da continuação do resumo não foi localizado."
        );
    }

    tbody.innerHTML =
        "";

    paginaAtual.insertAdjacentElement(
        "afterend",
        clone
    );

    return clone;
}

function obterProximaPaginaResumoColaboradoresTreinamentos(
    paginaAtual
) {
    const proxima =
        paginaAtual.nextElementSibling;

    if (
        proxima?.classList?.contains(
            "pagina-relatorio--resumo-continuacao"
        ) &&
        proxima.querySelector(
            ".tabela-resumo-colaboradores"
        )
    ) {
        return proxima;
    }

    return criarContinuacaoResumoColaboradoresTreinamentos(
        paginaAtual
    );
}

/* =============================================================
   G2-C10D-C3F — LINHA INTEIRA

   Uma linha só permanece na página se seu bounding box
   estiver INTEIRO dentro da área física do bloco de resumo.
   ============================================================= */

const MARGEM_SEGURANCA_RESUMO_PX = 3;

function paginaResumoColaboradoresTreinamentosPrecisaRebalancear(
    pagina
) {
    const tabela =
        pagina.querySelector(
            ".tabela-resumo-colaboradores"
        );

    if (!tabela) {
        return false;
    }

    const bloco =
        tabela.closest(
            ".bloco"
        );

    const tbody =
        tabela.querySelector(
            "tbody"
        );

    if (
        !bloco ||
        !tbody
    ) {
        throw new Error(
            "Não foi possível medir a área física do resumo."
        );
    }

    const linhas =
        Array.from(
            tbody.children
        );

    if (!linhas.length) {
        return false;
    }

    const ultimaLinha =
        linhas[
            linhas.length - 1
        ];

    const limiteBloco =
        bloco.getBoundingClientRect();

    const limiteLinha =
        ultimaLinha.getBoundingClientRect();

    /*
     * Não basta scrollHeight da página.
     * O bloco usa overflow:hidden e pode esconder
     * uma TR sem aumentar o scrollHeight externo.
     *
     * A linha só é aceita se terminar completamente
     * antes do limite inferior útil.
     */
    return (
        limiteLinha.bottom >
        limiteBloco.bottom -
            MARGEM_SEGURANCA_RESUMO_PX
    );
}
function paginarResumoColaboradoresTreinamentos(
    documento
) {
    let pagina =
        documento.querySelector(
            ".pagina-relatorio"
        );

    let operacoes =
        0;

    while (pagina) {
        const tabela =
            pagina.querySelector(
                ".tabela-resumo-colaboradores"
            );

        if (tabela) {
            if (
                paginaColaboradoresTreinamentosTemOverflowHorizontal(
                    pagina
                )
            ) {
                throw new Error(
                    "Overflow horizontal detectado em página de resumo."
                );
            }

            while (
                paginaResumoColaboradoresTreinamentosPrecisaRebalancear(
                    pagina
                )
            ) {
                operacoes +=
                    1;

                if (
                    operacoes >
                    1000
                ) {
                    throw new Error(
                        "Limite de segurança da paginação do resumo excedido."
                    );
                }

                const tbody =
                    tabela.querySelector(
                        "tbody"
                    );

                const linhas =
                    tbody
                        ? Array.from(
                              tbody.children
                          )
                        : [];

                if (
                    !linhas.length
                ) {
                    throw new Error(
                        "A estrutura fixa da página de resumo excede a folha mesmo sem linhas."
                    );
                }

                const linha =
                    linhas[
                        linhas.length -
                            1
                    ];

                const proxima =
                    obterProximaPaginaResumoColaboradoresTreinamentos(
                        pagina
                    );

                const tbodyProximo =
                    proxima.querySelector(
                        ".tabela-resumo-colaboradores tbody"
                    );

                if (!tbodyProximo) {
                    throw new Error(
                        "TBODY da próxima página de resumo não foi localizado."
                    );
                }

                tbodyProximo.insertBefore(
                    linha,
                    tbodyProximo.firstChild
                );
            }
        }

        pagina =
            pagina.nextElementSibling;
    }
}

function criarContinuacaoDetalheColaboradoresTreinamentos(
    paginaAtual
) {
    const clone =
        paginaAtual.cloneNode(
            true
        );

    clone.classList.add(
        "quebra-pagina",
        "pagina-relatorio--detalhe-colaborador"
    );

    const grade =
        clone.querySelector(
            ".detalhes-duplos"
        );

    if (!grade) {
        throw new Error(
            "Grade do detalhamento não foi localizada."
        );
    }

    grade.innerHTML =
        "";

    paginaAtual.insertAdjacentElement(
        "afterend",
        clone
    );

    return clone;
}

function obterProximaPaginaDetalheColaboradoresTreinamentos(
    paginaAtual
) {
    const proxima =
        paginaAtual.nextElementSibling;

    if (
        proxima?.classList?.contains(
            "pagina-relatorio--detalhe-colaborador"
        )
    ) {
        return proxima;
    }

    return criarContinuacaoDetalheColaboradoresTreinamentos(
        paginaAtual
    );
}

/* =============================================================
   G2-C10D-D1 — DETALHAMENTO DINAMICO

   Máximo de três colaboradores.

   Se três não couberem, o último cartão inteiro
   é movido para a próxima página.

   O processo se repete:
   3 -> 2 -> 1.

   Nunca cortar foto, identificação ou treinamentos.
   ============================================================= */

const MAX_COLABORADORES_DETALHE_POR_PAGINA =
    4;

function paginaDetalheColaboradoresTreinamentosPrecisaRebalancear(
    pagina
) {
    const grade =
        pagina.querySelector(
            ".detalhes-duplos"
        );

    if (!grade) {
        throw new Error(
            "Grade do detalhamento não localizada para medição."
        );
    }

    const quantidadeCartoes =
        grade.children.length;

    return (
        quantidadeCartoes >
            MAX_COLABORADORES_DETALHE_POR_PAGINA ||
        paginaColaboradoresTreinamentosTemOverflowVertical(
            pagina
        )
    );
}
function paginarDetalhesColaboradoresTreinamentos(
    documento
) {
    let pagina =
        documento.querySelector(
            ".pagina-relatorio"
        );

    let operacoes =
        0;

    while (pagina) {
        if (
            pagina.classList.contains(
                "pagina-relatorio--detalhe-colaborador"
            )
        ) {
            if (
                paginaColaboradoresTreinamentosTemOverflowHorizontal(
                    pagina
                )
            ) {
                throw new Error(
                    "Overflow horizontal detectado em página de detalhamento."
                );
            }

            while (
                paginaDetalheColaboradoresTreinamentosPrecisaRebalancear(
                    pagina
                )
            ) {
                operacoes +=
                    1;

                if (
                    operacoes >
                    1000
                ) {
                    throw new Error(
                        "Limite de segurança da paginação do detalhamento excedido."
                    );
                }

                const grade =
                    pagina.querySelector(
                        ".detalhes-duplos"
                    );

                const cartoes =
                    grade
                        ? Array.from(
                              grade.children
                          )
                        : [];

                if (
                    cartoes.length <=
                    1
                ) {
                    throw new Error(
                        "Um cartão individual de colaborador excede sozinho a página."
                    );
                }

                const cartao =
                    cartoes[
                        cartoes.length -
                            1
                    ];

                const proxima =
                    obterProximaPaginaDetalheColaboradoresTreinamentos(
                        pagina
                    );

                const gradeProxima =
                    proxima.querySelector(
                        ".detalhes-duplos"
                    );

                if (!gradeProxima) {
                    throw new Error(
                        "Grade da próxima página de detalhamento não foi localizada."
                    );
                }

                gradeProxima.insertBefore(
                    cartao,
                    gradeProxima.firstChild
                );
            }
        }

        pagina =
            pagina.nextElementSibling;
    }
}

function paginarColaboradoresTreinamentosPorAlturaReal(
    documento
) {
    paginarResumoColaboradoresTreinamentos(
        documento
    );

    paginarDetalhesColaboradoresTreinamentos(
        documento
    );
}
/* =============================================================
   G2-C10D-C3G — EMPRESA E PAGINACAO
   ============================================================= */

function numerarPaginasColaboradoresTreinamentos(
    documento
) {
    const paginas =
        Array.from(
            documento.querySelectorAll(
                ".pagina-relatorio"
            )
        );

    const totalPaginas =
        paginas.length;

    if (!totalPaginas) {
        throw new Error(
            "Não existem páginas físicas para numerar."
        );
    }

    paginas.forEach(
        (
            pagina,
            indice
        ) => {
            const numeroPagina =
                pagina.querySelector(
                    ".rodape-colaboradores-treinamentos__pagina"
                );

            if (!numeroPagina) {
                throw new Error(
                    `Rodapé sem campo de paginação na página ${indice + 1}.`
                );
            }

            numeroPagina.textContent =
                `Página ${indice + 1} de ${totalPaginas}`;
        }
    );
}
/* =============================================================
   G2-C10D-C3H — FECHAR RESUMO

   IMPORTANTE:
   esta função roda somente DEPOIS que a paginação por altura
   física já terminou.

   Portanto, reduzir visualmente o bloco aqui não influencia
   a decisão sobre quantas linhas cabem em cada página.
   ============================================================= */

function fecharBlocosResumoColaboradoresTreinamentos(
    documento
) {
    const paginasResumo =
        Array.from(
            documento.querySelectorAll(
                ".pagina-relatorio"
            )
        ).filter(
            (pagina) =>
                Boolean(
                    pagina.querySelector(
                        ".tabela-resumo-colaboradores"
                    )
                )
        );

    paginasResumo.forEach(
        (pagina) => {
            const tabela =
                pagina.querySelector(
                    ".tabela-resumo-colaboradores"
                );

            const bloco =
                tabela?.closest(
                    ".bloco"
                );

            if (!bloco) {
                throw new Error(
                    "Bloco do resumo não localizado durante o fechamento final."
                );
            }

            const linhas =
                tabela.querySelectorAll(
                    "tbody tr"
                );

            /*
             * Não compactar um bloco sem linhas reais.
             */
            if (!linhas.length) {
                return;
            }

            bloco.classList.add(
                "bloco--resumo-finalizado"
            );

            pagina.classList.add(
                "pagina-relatorio--resumo-finalizado"
            );
        }
    );
}
/* =============================================================
   G2-C10D-D2 — CONTINUACAO COMPACTA

   Primeira página do detalhamento de cada empresa:
   - mantém Hero.

   Demais páginas consecutivas da mesma empresa:
   - escondem Hero;
   - usam título compacto:
     DETALHAMENTO - CONTINUAÇÃO - EMPRESA
   ============================================================= */

/* =============================================================
   G2-C10D-D3 — EMPRESA REAL E QUATRO
   ============================================================= */

function extrairNomeEmpresaDoCartaoDetalhe(
    cartao
) {
    if (!cartao) {
        return "";
    }

    const textoCompleto =
        String(
            cartao.textContent || ""
        )
            .replace(
                /\s+/g,
                " "
            )
            .trim();

    const correspondencia =
        textoCompleto.match(
            /(?:^|\s)Empresa\s*:\s*(.+?)(?=\s+(?:Situação na obra|Status geral)\s*:|$)/i
        );

    const nome =
        correspondencia?.[1]
            ?.trim() ||
        "";

    if (
        !nome ||
        /^Empresa$/i.test(
            nome
        )
    ) {
        return "";
    }

    return nome;
}

function obterEmpresaPaginaDetalheColaboradoresTreinamentos(
    pagina
) {
    const primeiroCartao =
        pagina.querySelector(
            ".detalhe-colaborador"
        );

    const nomeExtraido =
        extrairNomeEmpresaDoCartaoDetalhe(
            primeiroCartao
        );

    if (nomeExtraido) {
        pagina.dataset.empresaNome =
            nomeExtraido;

        return nomeExtraido;
    }

    return (
        pagina.dataset.empresaNome ||
        "Empresa"
    );
}

function normalizarChaveEmpresaDetalhe(
    nomeEmpresa = ""
) {
    return String(
        nomeEmpresa || ""
    )
        .replace(
            /\s+/g,
            " "
        )
        .trim()
        .toLocaleUpperCase(
            "pt-BR"
        );
}

function normalizarPaginasDetalheColaboradoresTreinamentos(
    documento
) {
    const paginas =
        Array.from(
            documento.querySelectorAll(
                ".pagina-relatorio--detalhe-colaborador"
            )
        );

    paginas.forEach(
        (
            pagina,
            indicePagina
        ) => {
            const nomeEmpresa =
                obterEmpresaPaginaDetalheColaboradoresTreinamentos(
                    pagina
                );

            pagina.dataset.empresaNome =
                nomeEmpresa;

            const ehPrimeiraPaginaDetalhe =
                indicePagina === 0;

            pagina.classList.toggle(
                "pagina-relatorio--detalhe-inicial",
                ehPrimeiraPaginaDetalhe
            );

            pagina.classList.toggle(
                "pagina-relatorio--detalhe-continuacao",
                !ehPrimeiraPaginaDetalhe
            );

            const titulo =
                pagina.querySelector(
                    ".bloco-detalhamento h2"
                );

            if (titulo) {
                titulo.textContent =
                    ehPrimeiraPaginaDetalhe
                        ? "Detalhamento"
                        : `Detalhamento - continuação - ${nomeEmpresa}`;
            }
        }
    );
}

function compactarContinuacoesDetalheAteQuatro(
    documento
) {
    const paginas =
        Array.from(
            documento.querySelectorAll(
                ".pagina-relatorio--detalhe-colaborador"
            )
        );

    /*
     * Página 0 possui Hero e permanece com a composição
     * inicial de três colaboradores.
     *
     * Continuações compactas tentam quatro.
     */
    for (
        let indicePagina = 1;
        indicePagina < paginas.length;
        indicePagina += 1
    ) {
        const pagina =
            paginas[
                indicePagina
            ];

        const grade =
            pagina.querySelector(
                ".detalhes-duplos"
            );

        if (!grade) {
            continue;
        }

        const empresaAtual =
            normalizarChaveEmpresaDetalhe(
                obterEmpresaPaginaDetalheColaboradoresTreinamentos(
                    pagina
                )
            );

        while (
            grade.children.length <
                MAX_COLABORADORES_DETALHE_POR_PAGINA
        ) {
            const proximaPagina =
                paginas[
                    indicePagina + 1
                ];

            if (!proximaPagina) {
                break;
            }

            const empresaProxima =
                normalizarChaveEmpresaDetalhe(
                    obterEmpresaPaginaDetalheColaboradoresTreinamentos(
                        proximaPagina
                    )
                );

            /*
             * Nunca misturar empresas.
             */
            if (
                empresaAtual !==
                empresaProxima
            ) {
                break;
            }

            const proximaGrade =
                proximaPagina.querySelector(
                    ".detalhes-duplos"
                );

            if (!proximaGrade) {
                break;
            }

            const primeiroCartao =
                proximaGrade.firstElementChild;

            if (!primeiroCartao) {
                proximaPagina.remove();

                paginas.splice(
                    indicePagina + 1,
                    1
                );

                continue;
            }

            /*
             * Move sempre o cartão completo.
             */
            grade.appendChild(
                primeiroCartao
            );

            if (
                !proximaGrade.children.length
            ) {
                proximaPagina.remove();

                paginas.splice(
                    indicePagina + 1,
                    1
                );
            }
        }
    }
}
async function baixarRelatorioColaboradoresTreinamentosIsolado({
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
            position: "fixed",
            left: "-100000px",
            top: "0",
            width: "297mm",
            height: "210mm",
            border: "0",
            opacity: "0",
            pointerEvents: "none",
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

        if (!documento || !janela) {
            throw new Error(
                "Não foi possível criar o ambiente isolado do relatório."
            );
        }

        documento.open();
        documento.write(
            html
        );
        documento.close();

        await aguardarImagensColaboradoresTreinamentos(
            documento
        );

        await aguardarLayoutColaboradoresTreinamentos(
            janela
        );

        normalizarPaginasDetalheColaboradoresTreinamentos(
            documento
        );

        compactarContinuacoesDetalheAteQuatro(
            documento
        );

        await aguardarLayoutColaboradoresTreinamentos(
            janela
        );

        /*
         * Autoridade física final:
         * se quatro não couberem, o motor retira o último
         * cartão completo até a página caber.
         */
        paginarColaboradoresTreinamentosPorAlturaReal(
            documento
        );

        normalizarPaginasDetalheColaboradoresTreinamentos(
            documento
        );

        await aguardarLayoutColaboradoresTreinamentos(
            janela
        );
        /*
         * Paginação já está congelada neste ponto.
         * Agora o retângulo do resumo pode fechar na última TR.
         */
        fecharBlocosResumoColaboradoresTreinamentos(
            documento
        );

        await aguardarLayoutColaboradoresTreinamentos(
            janela
        );

        numerarPaginasColaboradoresTreinamentos(
            documento
        );

        /*
         * Aguarda o layout do texto Página X de Y
         * antes da inspeção física final.
         */
        await aguardarLayoutColaboradoresTreinamentos(
            janela
        );

        const paginas =
            Array.from(
                documento.querySelectorAll(
                    ".pagina-relatorio"
                )
            );

        if (!paginas.length) {
            throw new Error(
                "Nenhuma página do relatório foi encontrada."
            );
        }

        paginas.forEach(
            (pagina, indice) => {
                if (
                    paginaColaboradoresTreinamentosTemOverflow(
                        pagina
                    )
                ) {
                    throw new Error(
                        `Overflow físico detectado na página ${indice + 1}.`
                    );
                }

                if (
                    pagina.clientWidth <= 0 ||
                    pagina.clientHeight <= 0
                ) {
                    throw new Error(
                        `Dimensão física inválida na página ${indice + 1}.`
                    );
                }
            }
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

            if (indice > 0) {
                pdf.addPage(
                    "a4",
                    "l"
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
                            larguraPx,
                        windowHeight:
                            alturaPx,
                    }
                );

            const imagem =
                canvas.toDataURL(
                    "image/jpeg",
                    0.94
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
            "Erro ao gerar relatório isolado de colaboradores e treinamentos:",
            error
        );

        alert(
            "Não foi possível gerar o PDF de colaboradores e treinamentos sem cortes. Recarregue a página e tente novamente."
        );

        return false;
    } finally {
        iframe.remove();
    }

    return true;
}
export async function baixarRelatorioColaboradoresTreinamentosPDF({
    nomeArquivo = "relatorio-colaboradores-treinamentos.pdf",
    colaboradores = [],
    titulo = "Relatório de colaboradores e treinamentos",
    contratanteCabecalho = null,
    filtros = {},
} = {}) {
    const dataEmissao = new Date().toLocaleDateString("pt-BR");
    const colaboradoresPreparados = await prepararColaboradoresRelatorio(colaboradores);
    const empresas = agruparPorEmpresaRelatorio(colaboradoresPreparados);

    if (!empresas.length) {
        alert("Nenhum colaborador encontrado para gerar o relatório.");
        return;
    }

    const conteudo =
        empresas
            .map(
                (
                    empresa,
                    indice
                ) =>
                    montarSecaoEmpresaRelatorio(
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
        --azul: #064fae;
        --azul-escuro: #032b63;
        --linha: #d9e3f2;
        --texto: #0f172a;
        --suave: #f8fbff;
        --verde: #078a42;
        --laranja: #f28c00;
        --vermelho: #e01414;
        --roxo: #6d28d9;
    }

    * { box-sizing: border-box; }
    body {
        margin: 0;
        background: #eef4fb;
        color: var(--texto);
        font-family: Arial, Helvetica, sans-serif;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
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

        overflow: hidden;

        display: flex;
        flex-direction: column;

        background: #ffffff;

        border:
            0.3mm
            solid
            #d8e3de;

        border-radius: 2.6mm;

        box-shadow:
            0
            2mm
            6mm
            rgba(11, 47, 39, 0.10);

        position: relative;
    }

    .quebra-pagina { page-break-before: always; }

    .cabecalho-relatorio {
        display: grid;
        gap: 10px;
        margin-bottom: 14px;
        padding-top: 2px;
    }

    .cabecalho-relatorio--aniversariantes {
        gap: 9px;
    }


    .cabecalho-relatorio--padrao-institucional {
        gap: 8px;
        margin-bottom: 12px;
    }

    .marca-pdf-padrao {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        text-align: left;
        color: #07162f;
    }

    .marca-pdf-icone {
        width: 28px;
        height: 28px;
        display: grid;
        place-items: center;
        flex: 0 0 auto;
        color: #07162f;
    }

    .marca-pdf-icone svg {
        width: 28px;
        height: 28px;
        display: block;
        fill: none;
        stroke: currentColor;
        stroke-width: 1.9;
        stroke-linecap: round;
        stroke-linejoin: round;
    }

    .marca-pdf-icone svg * {
        fill: none;
        stroke: currentColor;
        stroke-width: 1.9;
        stroke-linecap: round;
        stroke-linejoin: round;
    }

    .marca-pdf-textos h1 {
        margin: 0;
        color: #07162f;
        font-size: 29px;
        line-height: 1;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        font-weight: 900;
    }

    .marca-pdf-textos p {
        margin: 3px 0 0;
        color: #334155;
        font-size: 7.8px;
        line-height: 1;
        font-weight: 900;
        letter-spacing: 0.28em;
        text-align: center;
        text-transform: uppercase;
    }

    .linha-pdf-padrao {
        height: 2px;
        width: 100%;
        border-radius: 999px;
        background: #07162f;
        box-shadow: 0 4px 0 #07162f;
        margin: 2px 0 8px;
    }

    .titulo-pdf-padrao {
        min-height: 30px;
        display: grid;
        align-content: center;
        justify-items: center;
        text-align: center;
        border-bottom: 2px solid #07162f;
        padding: 5px 18px 7px;
    }

    .titulo-pdf-padrao h2 {
        margin: 0;
        color: var(--azul);
        font-size: 15px;
        line-height: 1.15;
        font-weight: 900;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        white-space: normal;
    }

    .titulo-pdf-padrao p {
        margin: 2px 0 0;
        color: #64748b;
        font-size: 6.7px;
        line-height: 1.2;
        font-weight: 800;
    }

    .dados-empresa--padrao-pdf {
        margin-top: 3px;
    }

    .marca-relatorio-controle {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        text-align: left;
        flex-wrap: nowrap;
    }

    .escudo-controle-sst-relatorio {
        width: 34px;
        height: 34px;
        display: grid;
        place-items: center;
        flex: 0 0 auto;
        color: #07162f;
        background: transparent;
        border: 0;
        border-radius: 0;
        box-shadow: none;
    }

    .escudo-controle-sst-relatorio svg {
        width: 30px;
        height: 30px;
        display: block;
        fill: none;
        stroke: currentColor;
        stroke-width: 1.9;
        stroke-linecap: round;
        stroke-linejoin: round;
    }

    .marca-relatorio-controle__textos h1 {
        margin: 0;
        color: #07162f;
        font-size: 31px;
        line-height: 1.02;
        letter-spacing: 0.035em;
        text-transform: uppercase;
        font-weight: 900;
    }

    .data-emissao-cabecalho {
        display: inline-flex;
        align-items: baseline;
        gap: 3px;
        min-height: auto;
        margin-left: 3px;
        padding: 0 0 0 8px;
        border: 0;
        border-left: 1px solid #e2e8f0;
        border-radius: 0;
        background: transparent;
        color: #94a3b8;
        white-space: nowrap;
        transform: translateY(1px);
    }

    .data-emissao-cabecalho strong {
        display: inline;
        margin: 0;
        color: #94a3b8;
        font-size: 5.8px;
        line-height: 1;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.025em;
    }

    .data-emissao-cabecalho em {
        display: inline;
        margin: 0;
        color: #64748b;
        font-style: normal;
        font-size: 6.8px;
        line-height: 1;
        font-weight: 700;
    }

    .titulo-relatorio-cabecalho--aniversariantes {
        margin-top: 0;
    }

    .cabecalho-relatorio--modelo-aprovado .marca-empresa {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 16px;
        text-align: left;
    }

    .empresa-logo-img {
        width: 74px;
        height: 74px;
        object-fit: contain;
        border-radius: 10px;
    }

    .empresa-logo-fallback {
        width: 74px;
        height: 74px;
        display: grid;
        place-items: center;
        border: 3px solid var(--azul);
        color: var(--azul);
        border-radius: 16px;
        font-size: 26px;
        font-weight: 900;
    }

    .marca-empresa-textos {
        min-width: 0;
    }

    .marca-empresa h1 {
        margin: 0;
        color: #07162f;
        font-size: 31px;
        line-height: 1.02;
        letter-spacing: 0.035em;
        text-transform: uppercase;
    }

    .marca-empresa p {
        margin: 4px 0 0;
        color: var(--azul);
        font-size: 16px;
        font-weight: 900;
        letter-spacing: 0.16em;
        text-transform: uppercase;
    }

    .titulo-relatorio-cabecalho {
        display: grid;
        grid-template-columns: minmax(70px, 1fr) auto minmax(70px, 1fr);
        align-items: center;
        gap: 16px;
        margin-top: 2px;
    }

    .titulo-relatorio-cabecalho span {
        height: 2px;
        border-radius: 999px;
        background: linear-gradient(90deg, transparent, var(--azul), transparent);
    }

    .titulo-relatorio-cabecalho strong {
        color: #07162f;
        font-size: 15px;
        font-weight: 900;
        letter-spacing: 0.02em;
        text-transform: uppercase;
        white-space: nowrap;
    }

    .dados-empresa {
        display: grid;
        grid-template-columns: 1.08fr 1.28fr 1.42fr 0.96fr 0.98fr;
        gap: 0;
        align-items: center;
        border-bottom: 1px solid var(--linha);
        padding: 8px 0 10px;
    }

    .dados-empresa__item {
        display: grid;
        grid-template-columns: 20px minmax(0, 1fr);
        gap: 1px 7px;
        align-items: center;
        border-right: 1px solid var(--linha);
        min-height: 36px;
        padding: 0 9px;
        overflow: visible;
    }

    .dados-empresa__item:first-child {
        padding-left: 0;
    }

    .dados-empresa__item:last-child {
        border-right: 0;
        padding-right: 0;
    }

    .dados-empresa span {
        grid-row: span 2;
        display: grid;
        place-items: center;
        color: var(--azul);
    }

    .dados-empresa span svg {
        width: 20px;
        height: 20px;
        display: block;
        fill: none;
        stroke: currentColor;
        stroke-width: 1.85;
        stroke-linecap: round;
        stroke-linejoin: round;
    }

    .dados-empresa span svg * {
        fill: none;
        stroke: currentColor;
        stroke-width: 1.85;
        stroke-linecap: round;
        stroke-linejoin: round;
    }

    .dados-empresa strong {
        display: block;
        min-width: 0;
        font-size: 7.9px;
        line-height: 1.05;
        color: #334155;
        white-space: nowrap;
    }

    .dados-empresa em {
        display: block;
        min-width: 0;
        font-style: normal;
        font-size: 7.9px;
        line-height: 1.08;
        font-weight: 800;
        color: #0f172a;
        white-space: nowrap;
    }

    .dados-empresa__item--cnpj {
        grid-template-columns: 20px minmax(0, 1fr);
        padding-left: 9px;
        padding-right: 9px;
    }

    .dados-empresa__item--cnpj em {
        font-size: 7.9px;
        letter-spacing: -0.025em;
    }

    .dados-empresa__item--data {
        grid-template-columns: 20px minmax(0, 1fr);
        padding-left: 10px;
        padding-right: 10px;
    }

    .dados-empresa__item--data strong,
    .dados-empresa__item--data em {
        font-size: 8.4px;
    }

    .bloco {
        border: 1px solid var(--linha);
        border-radius: 14px;
        margin-top: 8px;
        overflow: hidden;
        background: #fff;
    }

    .bloco h2 {
        min-height: 34px;
        margin: 0;
        padding: 0 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--azul);
        font-size: 13px;
        text-align: center;
        text-transform: uppercase;
        letter-spacing: 0.02em;
        line-height: 1.1;
        background: #f8fbff;
        border-bottom: 1px solid var(--linha);
    }

    .kpis {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 8px;
        padding: 10px;
    }

    .kpi {
        min-height: 82px;
        display: grid;
        place-items: center;
        text-align: center;
        border: 1px solid var(--linha);
        border-radius: 10px;
        padding: 7px 5px;
        background: #fff;
    }

    .kpi-icone {
        display: grid;
        place-items: center;
        width: 24px;
        height: 24px;
        margin-bottom: 3px;
        color: var(--azul);
    }

    .kpi-icone svg {
        width: 24px;
        height: 24px;
        fill: currentColor;
        display: block;
    }

    .kpi-titulo {
        min-height: 20px;
        font-size: 8.7px;
        font-weight: 800;
    }

    .kpi-valor {
        font-size: 22px;
        font-weight: 900;
        color: #0f172a;
    }

    .kpi-total .kpi-icone,
    .kpi-info .kpi-icone { color: var(--azul); }

    .kpi-ok .kpi-icone { color: var(--verde); }
    .kpi-alerta .kpi-icone { color: var(--laranja); }
    .kpi-critico .kpi-icone,
    .kpi-vencido .kpi-icone { color: var(--vermelho); }
    .kpi-vencendo .kpi-icone { color: var(--roxo); }

    table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
        font-size: 10px;
    }

    .tabela-resumo-colaboradores .col-numero { width: 4%; }
    .tabela-resumo-colaboradores .col-colaborador { width: 27%; }
    .tabela-resumo-colaboradores .col-funcao { width: 15%; }
    .tabela-resumo-colaboradores .col-situacao { width: 13%; }
    .tabela-resumo-colaboradores .col-status { width: 17%; }
    .tabela-resumo-colaboradores .col-pendentes { width: 8%; }
    .tabela-resumo-colaboradores .col-vencidos { width: 8%; }
    .tabela-resumo-colaboradores .col-vencer { width: 8%; }

    thead tr {
        height: 46px;
    }

    thead th {
        background: linear-gradient(180deg, #075bbd, #033f88);
        color: #fff;
        height: 46px;
        padding: 0;
        border-right: 1px solid rgba(255,255,255,0.25);
        text-align: center;
        vertical-align: middle;
        line-height: 1;
        white-space: normal;
        overflow: hidden;
    }

    .th-conteudo {
        width: 100%;
        height: 46px;
        min-height: 46px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0 8px;
        box-sizing: border-box;
        text-align: center;
        line-height: 1.08;
        font-size: 9.4px;
        font-weight: 900;
        white-space: normal;
        overflow: hidden;
    }

    .tabela-resumo-colaboradores th:nth-child(6) .th-conteudo,
    .tabela-resumo-colaboradores th:nth-child(7) .th-conteudo,
    .tabela-resumo-colaboradores th:nth-child(8) .th-conteudo {
        padding-left: 10px;
        padding-right: 10px;
        font-size: 9px;
    }

    tbody td {
        height: 36px;
        padding: 7px 8px;
        border-bottom: 1px solid var(--linha);
        border-right: 1px solid var(--linha);
        text-align: center;
        vertical-align: middle;
        overflow: hidden;
        overflow-wrap: anywhere;
    }

    .tabela-resumo-colaboradores tbody td:nth-child(6),
    .tabela-resumo-colaboradores tbody td:nth-child(7),
    .tabela-resumo-colaboradores tbody td:nth-child(8) {
        padding-left: 10px;
        padding-right: 10px;
    }

    .tabela-resumo-colaboradores tbody .badge {
        display: inline;
        min-width: 0;
        margin-left: 0;
        margin-right: 0;
        padding: 0;
        background: transparent !important;
        border: 0 !important;
        border-radius: 0 !important;
        box-shadow: none !important;
        text-align: center;
        font-size: 10px;
        font-weight: 900;
        line-height: inherit;
        white-space: nowrap;
    }

    .tabela-resumo-colaboradores tbody td:nth-child(4) .badge,
    .tabela-resumo-colaboradores tbody td:nth-child(5) .badge {
        min-width: 0;
        padding: 0;
        background: transparent !important;
        border: 0 !important;
        border-radius: 0 !important;
    }

    tbody tr:nth-child(even) { background: #fbfdff; }

    .texto-forte {
        font-weight: 800;
        text-align: left;
        line-height: 1.15;
        overflow-wrap: anywhere;
    }

    .badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        padding: 4px 8px;
        font-size: 9px;
        font-weight: 900;
        white-space: nowrap;
    }

    .status-ok { background: #e9f9ef; color: var(--verde); }
    .status-alerta { background: #fff4df; color: var(--laranja); }
    .status-critico { background: #fff0f0; color: var(--vermelho); }
    .status-info { background: #eef5ff; color: var(--azul); }
    .status-neutro { background: #f1f5f9; color: #475569; }

    .bloco-detalhamento {
        border: 0;
        overflow: visible;
    }



    .pagina-relatorio--detalhe-colaborador {
        page-break-before: always;
    }

    .bloco-detalhamento--pagina-unica {
        margin-top: 10px;
    }

    .bloco-detalhamento--pagina-dupla {
        margin-top: 8px;
    }

    .detalhes-duplos {
        display: grid;
        grid-template-rows: repeat(3, minmax(0, auto));
        gap: 8px;
    }

    .pagina-relatorio--resumo-continuacao {
        display: flex;
        flex-direction: column;
    }

    .bloco--resumo-continuacao {
        margin-top: 0;
    }

    .pagina-relatorio--resumo-continuacao .rodape-relatorio {
        margin-top: auto;
    }

    .pagina-relatorio--resumo-continuacao .tabela-resumo-colaboradores tbody td {
        height: 34px;
        padding-top: 5px;
        padding-bottom: 5px;
    }

    .detalhe-colaborador--pagina-unica {
        margin-top: 0;
        page-break-inside: avoid;
    }

    .detalhe-colaborador--compacto {
        margin-top: 0;
    }

    .detalhe-colaborador--compacto .detalhe-topo {
        grid-template-columns: 30px 48px minmax(215px, 0.92fr) minmax(330px, 1.45fr);
        gap: 8px;
        padding: 8px 10px;
    }

    .detalhe-colaborador--compacto .avatar-colaborador {
        width: 48px;
        height: 48px;
    }

    .detalhe-colaborador--compacto .detalhe-identificacao h3 {
        margin-bottom: 3px;
        font-size: 14px;
    }

    .detalhe-colaborador--compacto .detalhe-identificacao p,
    .detalhe-colaborador--compacto .detalhe-status-linha {
        font-size: 9px;
        line-height: 1.18;
    }

    .detalhe-colaborador--compacto .detalhe-grids {
        gap: 8px;
        padding: 8px 10px;
    }

    .detalhe-colaborador--compacto .lista-card {
        min-height: 104px;
        padding: 8px;
    }

    .detalhe-colaborador--compacto .lista-card h4 {
        margin-bottom: 5px;
        font-size: 9px;
    }

    .detalhe-colaborador--compacto .lista-card li {
        margin-bottom: 3px;
        font-size: 7.5px;
        line-height: 1.22;
    }

    .detalhe-colaborador--compacto .lista-vazia {
        font-size: 8px;
    }
    .detalhe-colaborador {
        border: 1px solid var(--linha);
        border-radius: 14px;
        margin-top: 12px;
        overflow: hidden;
        page-break-inside: avoid;
        background: #fff;
    }

    .detalhe-topo {
        display: grid;
        grid-template-columns: 34px 58px minmax(215px, 0.92fr) minmax(330px, 1.45fr);
        gap: 10px;
        align-items: center;
        padding: 12px;
        background: #fbfdff;
        border-bottom: 1px solid var(--linha);
    }

    .numero-colaborador {
        width: 26px;
        height: 26px;
        display: block;
        align-self: center;
        justify-self: center;
        padding: 0;
        line-height: 0;
    }

    .numero-colaborador svg {
        width: 26px;
        height: 26px;
        display: block;
        overflow: visible;
    }

    .numero-colaborador rect {
        fill: var(--azul);
    }

    .numero-colaborador text {
        fill: #fff;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 14px;
        font-weight: 900;
        line-height: 1;
    }

    .avatar-colaborador {
        width: 58px;
        height: 58px;
        display: grid;
        place-items: center;
        border-radius: 999px;
        background: #e2e8f0;
        color: #475569;
        font-weight: 900;
        font-size: 18px;
        overflow: hidden;
        border: 1px solid #d8e2ef;
    }

    .avatar-colaborador img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
    }

    .avatar-colaborador--foto {
        background: #fff;
        color: transparent;
    }

    .detalhe-identificacao {
        min-width: 0;
    }

    .detalhe-identificacao h3 {
        margin: 0 0 6px;
        color: var(--azul);
        font-size: 15px;
        text-transform: uppercase;
    }

    .detalhe-identificacao p,
    .detalhe-status p {
        margin: 3px 0;
        font-size: 10px;
    }

    .detalhe-status {
        display: grid;
        gap: 6px;
        border-left: 1px solid var(--linha);
        padding-left: 12px;
        min-width: 0;
        overflow: visible;
    }

    .detalhe-status-linha {
        display: flex;
        align-items: baseline;
        gap: 6px;
        min-width: 0;
        max-width: 100%;
        white-space: nowrap;
        font-size: 10px;
        line-height: 1.25;
        overflow: visible;
    }

    .detalhe-status-linha strong {
        flex: 0 0 auto;
        display: inline-block;
        font-weight: 900;
        color: #0f172a;
        white-space: nowrap;
    }

    .detalhe-status-linha span {
        flex: 0 1 auto;
        display: inline-block;
        min-width: 0;
        font-weight: 800;
        white-space: nowrap;
        overflow: visible;
        text-overflow: clip;
    }

    .detalhe-status-linha--empresa span {
        max-width: none;
        overflow: visible;
        text-overflow: clip;
    }

    .detalhe-status-valor {
        background: transparent !important;
        border: 0 !important;
        border-radius: 0 !important;
        padding: 0 !important;
        box-shadow: none !important;
        font-weight: 900 !important;
    }

    .detalhe-status-valor.status-ok { color: var(--verde) !important; }
    .detalhe-status-valor.status-alerta { color: var(--laranja) !important; }
    .detalhe-status-valor.status-critico { color: var(--vermelho) !important; }
    .detalhe-status-valor.status-info { color: var(--azul) !important; }
    .detalhe-status-valor.status-neutro { color: #475569 !important; }

    .detalhe-grids {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 10px;
        padding: 12px;
    }

    .lista-card {
        min-height: 132px;
        border: 1px solid var(--linha);
        border-radius: 10px;
        padding: 10px;
        background: #fff;
    }

    .lista-card h4 {
        margin: 0 0 8px;
        font-size: 11px;
        text-transform: uppercase;
    }

    .lista-card ul {
        margin: 0;
        padding-left: 16px;
    }

    .lista-card li {
        margin-bottom: 5px;
        font-size: 9px;
        line-height: 1.32;
    }

    .lista-card-ok h4 { color: var(--verde); }
    .lista-card-pendente h4 { color: var(--laranja); }
    .lista-card-vencido h4 { color: var(--vermelho); }
    .lista-card-vencendo h4 { color: var(--roxo); }

    .lista-vazia {
        margin: 0;
        color: #475569;
        font-size: 9px;
        line-height: 1.35;
    }

    .mais-itens {
        color: var(--azul);
        font-weight: 900;
    }

    .rodape-relatorio {
        display: flex;
        justify-content: space-between;
        margin-top: 14px;
        padding: 10px 14px;
        color: #fff;
        background: linear-gradient(90deg, #032b63, #075bbd);
        border-radius: 0 0 12px 12px;
        font-size: 11px;
        font-weight: 800;
    }


    /* =========================================================
       G2-C10D-C1 — TOPO VISUAL PRÓPRIO
       Não reutiliza layout de outro relatório.
       Somente a linguagem visual e o asset são de referência.
       ========================================================= */

    .cabecalho-colaboradores-treinamentos {
        min-height: 20mm;
        margin: 0 0 2.2mm;
        padding: 2.6mm 3.4mm;

        display: grid;
        grid-template-columns:
            minmax(35mm, 0.92fr)
            minmax(0, 1.65fr)
            minmax(22mm, 0.58fr);

        align-items: center;
        gap: 3mm;

        color: #ffffff;

        border:
            1px
            solid
            rgba(255, 255, 255, 0.18);

        border-radius: 2.8mm;
        overflow: hidden;

        background:
            linear-gradient(
                108deg,
                rgba(4, 25, 34, 0.82) 0%,
                rgba(5, 61, 49, 0.70) 48%,
                rgba(7, 131, 62, 0.56) 100%
            ),
            url("${heroColaboradoresTreinamentosObrasUrl}");

        background-repeat:
            no-repeat,
            no-repeat;

        background-position:
            center,
            center 60%;

        background-size:
            cover,
            cover;

        box-shadow:
            0
            1.5mm
            4mm
            rgba(11, 47, 39, 0.14);
    }

    .hero-colaboradores__safescan {
        min-width: 0;

        display: flex;
        align-items: center;
        justify-content: flex-start;

        gap: 2mm;
    }

    .hero-colaboradores__simbolo {
        width: 8.5mm;
        height: 8.5mm;

        flex:
            0
            0
            8.5mm;
    }

    .hero-colaboradores__marca-texto {
        min-width: 0;

        display: grid;
        align-content: center;

        line-height: 1;
    }

    .hero-colaboradores__marca-texto strong {
        color: #ffffff;

        font-size: 3.1mm;
        line-height: 1;

        font-weight: 950;
        letter-spacing: 0.025em;
    }

    .hero-colaboradores__marca-texto small {
        margin-top: 0.75mm;

        color: rgba(255, 255, 255, 0.94);

        font-size: 1.55mm;
        line-height: 1;

        font-weight: 800;
        letter-spacing: 0.18em;
    }

    .hero-colaboradores__titulo {
        min-width: 0;

        display: grid;
        align-content: center;
        justify-items: center;

        text-align: center;

        transform: translateY(-0.2mm);
    }

    .hero-colaboradores__titulo h1 {
        width: 100%;

        margin: 0;

        color: #ffffff;

        font-size: 3.45mm;
        line-height: 1.05;

        font-weight: 950;
        letter-spacing: -0.018em;

        text-align: center;

        white-space: normal;
        overflow-wrap: anywhere;
    }

    .hero-colaboradores__titulo p {
        margin:
            1.15mm
            0
            0;

        color: rgba(255, 255, 255, 0.92);

        font-size: 1.7mm;
        line-height: 1.14;

        font-weight: 750;

        text-align: center;
    }

    .hero-colaboradores__contratante {
        min-width: 0;

        display: flex;
        align-items: center;
        justify-content: flex-end;
    }

    .hero-colaboradores__contratante-box {
        min-width: 17mm;
        max-width: 25mm;

        min-height: 9mm;
        max-height: 11mm;

        padding:
            1.25mm
            1.7mm;

        display: flex;
        align-items: center;
        justify-content: center;

        background: rgba(255, 255, 255, 0.97);

        border:
            0.55mm
            solid
            rgba(255, 255, 255, 0.98);

        border-radius: 1.65mm;

        box-shadow:
            0
            0.8mm
            2.5mm
            rgba(0, 0, 0, 0.12);
    }

    .hero-colaboradores__contratante-img {
        display: block;

        max-width: 21mm;
        max-height: 7.5mm;

        object-fit: contain;
    }

    .hero-colaboradores__contratante-box--texto {
        color: #123f34;

        font-size: 2.3mm;
        line-height: 1;

        font-weight: 950;
        letter-spacing: 0.05em;
    }

    .resumo-geral-colaboradores {
        margin: 0 0 2mm;

        display: grid;
        gap: 1.5mm;

        flex:
            0
            0
            auto;
    }

    .contexto-empresa-colaboradores {
        min-height: 11mm;

        padding:
            1.45mm
            2.2mm;

        display: grid;
        grid-template-columns:
            8.5mm
            minmax(0, 1fr);

        align-items: center;
        gap: 2.1mm;

        background:
            linear-gradient(
                90deg,
                #f5faf7 0%,
                #ffffff 100%
            );

        border:
            0.3mm
            solid
            #cfe1d8;

        border-left:
            1.15mm
            solid
            #1d6d53;

        border-radius: 2.2mm;
    }

    .contexto-empresa-colaboradores__logo {
        width: 8mm;
        height: 8mm;

        display: flex;
        align-items: center;
        justify-content: center;

        overflow: hidden;

        background: #ffffff;

        border:
            0.25mm
            solid
            #d8e3de;

        border-radius: 1.65mm;
    }

    .contexto-empresa-colaboradores__logo-img {
        display: block;

        width: 100%;
        height: 100%;

        padding: 0.55mm;

        object-fit: contain;
    }

    .contexto-empresa-colaboradores__logo-fallback {
        width: 100%;
        height: 100%;

        display: flex;
        align-items: center;
        justify-content: center;

        color: #ffffff;

        background:
            linear-gradient(
                145deg,
                #123f34,
                #2f8f6b
            );

        font-size: 2.35mm;
        line-height: 1;

        font-weight: 950;
    }

    .contexto-empresa-colaboradores__texto {
        min-width: 0;

        display: grid;
        align-content: center;

        gap: 0.65mm;

        transform: translateY(-0.1mm);
    }

    .contexto-empresa-colaboradores__nome {
        min-width: 0;

        color: #123f34;

        font-size: 2.75mm;
        line-height: 1;

        font-weight: 950;
        letter-spacing: -0.012em;

        white-space: nowrap;
    }

    .contexto-empresa-colaboradores__nome--longo {
        font-size: 2.3mm;
        letter-spacing: -0.025em;
    }

    .contexto-empresa-colaboradores__nome--muito-longo {
        font-size: 1.95mm;
        letter-spacing: -0.035em;
    }

    .contexto-empresa-colaboradores__texto small {
        color: #62706a;

        font-size: 1.65mm;
        line-height: 1;

        font-weight: 800;
    }

    .contexto-empresa-colaboradores__texto > span {
        color: #1d6d53;

        font-size: 1.75mm;
        line-height: 1;

        font-weight: 900;
    }

    .resumo-colaboradores-grid {
        display: grid;

        grid-template-columns:
            repeat(
                7,
                minmax(
                    0,
                    1fr
                )
            );

        gap: 1.15mm;
    }

    .kpi-colaboradores {
        min-width: 0;
        min-height: 10.4mm;

        padding:
            1.15mm
            1.05mm;

        display: grid;

        grid-template-columns:
            4.2mm
            minmax(0, 1fr);

        align-items: center;
        gap: 0.75mm;

        color: #ffffff;

        border-radius: 1.8mm;

        overflow: hidden;
    }

    .kpi-colaboradores__icone {
        width: 3.8mm;
        height: 3.8mm;

        display: flex;
        align-items: center;
        justify-content: center;

        opacity: 0.96;
    }

    .kpi-colaboradores__icone svg {
        width: 3.7mm;
        height: 3.7mm;
    }

    .kpi-colaboradores__texto {
        min-width: 0;

        display: grid;
        align-content: center;
        justify-items: center;

        gap: 0.35mm;

        text-align: center;

        transform: translateY(-0.15mm);
    }

    .kpi-colaboradores__texto small {
        width: 100%;

        color: inherit;

        font-size: 1.55mm;
        line-height: 1.02;

        font-weight: 950;

        text-transform: uppercase;
        text-align: center;

        white-space: normal;
    }

    .kpi-colaboradores__texto strong {
        color: inherit;

        font-size: 3.3mm;
        line-height: 1;

        font-weight: 950;

        text-align: center;
    }

    .kpi-colaboradores--total {
        background:
            linear-gradient(
                145deg,
                #123f34,
                #185748
            );
    }

    .kpi-colaboradores--ok {
        background:
            linear-gradient(
                145deg,
                #157347,
                #20895a
            );
    }

    .kpi-colaboradores--alerta {
        background:
            linear-gradient(
                145deg,
                #b56c12,
                #d28a22
            );
    }

    .kpi-colaboradores--critico {
        background:
            linear-gradient(
                145deg,
                #9f251d,
                #c5362a
            );
    }

    .kpi-colaboradores--analise {
        background:
            linear-gradient(
                145deg,
                #1f5d8f,
                #3278aa
            );
    }

    .kpi-colaboradores--vencido {
        background:
            linear-gradient(
                145deg,
                #7f1d1d,
                #a92525
            );
    }

    .kpi-colaboradores--vencer {
        background:
            linear-gradient(
                145deg,
                #8d6113,
                #b9851d
            );
    }

    .filtros-colaboradores-treinamentos {
        min-height: 7.4mm;

        margin:
            0
            0
            2mm;

        padding:
            1mm
            1.4mm;

        display: grid;

        grid-template-columns:
            12mm
            repeat(
                4,
                minmax(
                    0,
                    1fr
                )
            );

        align-items: center;
        gap: 1.15mm;

        background: #f6faf8;

        border:
            0.3mm
            solid
            #d8e3de;

        border-radius: 1.9mm;

        flex:
            0
            0
            auto;
    }

    .filtros-colaboradores-treinamentos__rotulo {
        min-height: 4.8mm;

        display: flex;
        align-items: center;
        justify-content: center;

        color: #123f34;

        font-size: 1.9mm;
        line-height: 1;

        font-weight: 950;
        letter-spacing: 0.055em;

        text-align: center;
    }

    .filtro-colaboradores-inline {
        min-width: 0;
        min-height: 4.8mm;

        padding:
            0.65mm
            0.8mm;

        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;

        text-align: center;

        background: #ffffff;

        border:
            0.25mm
            solid
            #d8e3de;

        border-radius: 1.25mm;
    }

    .filtro-colaboradores-inline small {
        width: 100%;

        color: #62706a;

        font-size: 1.45mm;
        line-height: 1;

        font-weight: 850;

        text-transform: uppercase;
        text-align: center;
    }

    .filtro-colaboradores-inline strong {
        width: 100%;

        margin-top: 0.45mm;

        color: #17231f;

        font-size: 1.72mm;
        line-height: 1;

        font-weight: 950;

        text-align: center;

        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }


    /* =========================================================
       G2-C10D-C2 — RESET LANDSCAPE
       Base visual horizontal do relatório de Colaboradores.
       Mantém os dados e elimina a aparência azul antiga.
       ========================================================= */

    .pagina-relatorio {
        width: 297mm;
        height: 210mm;
        min-height: 210mm;

        gap: 1.55mm;

        padding:
            5.5mm
            6mm
            4.5mm;

        background: #ffffff;
    }

    .cabecalho-colaboradores-treinamentos {
        min-height: 20mm;

        margin:
            0;

        flex:
            0
            0
            auto;
    }

    /* ---------------------------------------------------------
       EMPRESA + 7 INDICADORES NA MESMA FAIXA HORIZONTAL
       --------------------------------------------------------- */

    .resumo-geral-colaboradores {
        margin: 0;

        display: grid;

        grid-template-columns:
            minmax(
                50mm,
                0.95fr
            )
            minmax(
                0,
                3.55fr
            );

        align-items: stretch;

        gap: 1.4mm;

        flex:
            0
            0
            auto;
    }

    .contexto-empresa-colaboradores {
        min-height: 11.5mm;
        height: 100%;

        padding:
            1.25mm
            1.8mm;

        border-left:
            1.1mm
            solid
            #1d6d53;
    }

    .contexto-empresa-colaboradores__logo {
        width: 7.7mm;
        height: 7.7mm;
    }

    .contexto-empresa-colaboradores__nome {
        color: #123f34;
    }

    .resumo-colaboradores-grid {
        min-height: 11.5mm;
        height: 100%;

        grid-template-columns:
            repeat(
                7,
                minmax(
                    0,
                    1fr
                )
            );

        gap: 0.9mm;
    }

    .kpi-colaboradores {
        min-height: 11.5mm;

        padding:
            1mm
            0.8mm;

        grid-template-columns:
            3.8mm
            minmax(
                0,
                1fr
            );

        gap: 0.5mm;

        border-radius: 1.6mm;
    }

    .kpi-colaboradores__icone,
    .kpi-colaboradores__icone svg {
        width: 3.35mm;
        height: 3.35mm;
    }

    .kpi-colaboradores__texto small {
        font-size: 1.35mm;
        line-height: 1.02;
    }

    .kpi-colaboradores__texto strong {
        font-size: 3mm;
    }

    /* ---------------------------------------------------------
       FILTROS
       --------------------------------------------------------- */

    .filtros-colaboradores-treinamentos {
        min-height: 7mm;

        margin: 0;

        padding:
            0.9mm
            1.25mm;

        grid-template-columns:
            12mm
            repeat(
                4,
                minmax(
                    0,
                    1fr
                )
            );

        gap: 1mm;

        background: #f6faf8;

        border-color: #d8e3de;

        flex:
            0
            0
            auto;
    }

    .filtro-colaboradores-inline {
        min-height: 4.6mm;
    }

    .filtro-colaboradores-inline small {
        font-size: 1.35mm;
    }

    .filtro-colaboradores-inline strong {
        font-size: 1.58mm;
    }

    /* ---------------------------------------------------------
       BLOCO / TÍTULOS — REMOVE AZUL LEGADO
       --------------------------------------------------------- */

    .bloco {
        margin: 0;

        min-height: 0;

        flex:
            1
            1
            auto;

        overflow: hidden;

        background: #ffffff;

        border:
            0.28mm
            solid
            #d8e3de;

        border-radius: 1.9mm;
    }

    .bloco h2 {
        min-height: 6.5mm;

        margin: 0;

        padding:
            0
            2mm;

        display: flex;
        align-items: center;
        justify-content: center;

        color: #123f34 !important;

        background: #f3f8f5 !important;

        border-bottom:
            0.3mm
            solid
            #d8e3de;

        font-size: 2.35mm;
        line-height: 1;

        font-weight: 950;

        letter-spacing: 0.035em;

        text-transform: uppercase;
        text-align: center;
    }

    /* ---------------------------------------------------------
       TABELA RESUMO
       --------------------------------------------------------- */

    .tabela-resumo-colaboradores {
        width: 100%;

        border-collapse: collapse;
        table-layout: fixed;

        color: #17231f;

        font-size: 1.55mm;
    }

    .tabela-resumo-colaboradores .col-numero {
        width: 4%;
    }

    .tabela-resumo-colaboradores .col-colaborador {
        width: 28%;
    }

    .tabela-resumo-colaboradores .col-funcao {
        width: 17%;
    }

    .tabela-resumo-colaboradores .col-situacao {
        width: 13%;
    }

    .tabela-resumo-colaboradores .col-status {
        width: 14%;
    }

    .tabela-resumo-colaboradores .col-pendentes,
    .tabela-resumo-colaboradores .col-vencidos,
    .tabela-resumo-colaboradores .col-vencer {
        width: 8%;
    }

    .tabela-resumo-colaboradores thead tr {
        height: 8mm;
    }

    .tabela-resumo-colaboradores thead th {
        height: 8mm;

        padding: 0;

        color: #ffffff !important;

        background: #123f34 !important;

        border-right:
            0.25mm
            solid
            rgba(
                255,
                255,
                255,
                0.22
            );

        border-bottom: 0;

        text-align: center;
        vertical-align: middle;
    }

    .tabela-resumo-colaboradores thead th:last-child {
        border-right: 0;
    }

    .tabela-resumo-colaboradores .th-conteudo {
        width: 100%;
        height: 8mm;

        padding:
            0
            1mm;

        display: flex;
        align-items: center;
        justify-content: center;

        color: #ffffff;

        font-size: 1.65mm;
        line-height: 1.05;

        font-weight: 950;

        text-align: center;

        text-transform: uppercase;
    }

    .tabela-resumo-colaboradores tbody td {
        height: 6.15mm;

        padding:
            0.9mm
            1.25mm;

        color: #26352f;

        background: #ffffff;

        border-right:
            0.25mm
            solid
            #d8e3de;

        border-bottom:
            0.25mm
            solid
            #d8e3de;

        font-size: 1.55mm;
        line-height: 1.12;

        vertical-align: middle;
        text-align: center;

        overflow: hidden;
        overflow-wrap: anywhere;
    }

    .tabela-resumo-colaboradores tbody tr:nth-child(even) td {
        background: #f9fcfa;
    }

    .tabela-resumo-colaboradores tbody td:last-child {
        border-right: 0;
    }

    .tabela-resumo-colaboradores .texto-forte {
        color: #17231f;

        font-size: 1.65mm;
        line-height: 1.08;

        font-weight: 900;

        text-align: left;
    }

    .tabela-resumo-colaboradores tbody .badge {
        padding: 0 !important;

        background: transparent !important;

        border: 0 !important;
        border-radius: 0 !important;

        box-shadow: none !important;

        font-size: 1.55mm;
        line-height: 1.05;

        font-weight: 950;

        text-align: center;
    }

    /* ---------------------------------------------------------
       CONTINUAÇÃO DO RESUMO
       --------------------------------------------------------- */

    .pagina-relatorio--resumo-continuacao {
        display: flex;
        flex-direction: column;

        gap: 1.55mm;
    }

    .pagina-relatorio--resumo-continuacao
    .bloco--resumo-continuacao {
        margin: 0;

        flex:
            1
            1
            auto;
    }

    .pagina-relatorio--resumo-continuacao
    .tabela-resumo-colaboradores
    tbody td {
        height: 6.05mm;

        padding-top: 0.8mm;
        padding-bottom: 0.8mm;
    }

    /* ---------------------------------------------------------
       DETALHAMENTO HORIZONTAL
       --------------------------------------------------------- */

    .pagina-relatorio--detalhe-colaborador {
        display: flex;
        flex-direction: column;

        gap: 1.55mm;
    }

    .bloco-detalhamento,
    .bloco-detalhamento--pagina-dupla {
        margin: 0;

        min-height: 0;

        display: flex;
        flex-direction: column;

        flex:
            1
            1
            auto;
    }

    .detalhes-duplos {
        min-height: 0;

        padding: 1.8mm;

        display: grid;

        grid-template-rows:
            repeat(
                2,
                minmax(
                    0,
                    1fr
                )
            );

        gap: 2mm;

        flex:
            1
            1
            auto;
    }

    .detalhe-colaborador,
    .detalhe-colaborador--compacto {
        min-height: 0;

        margin: 0;

        display: grid;

        grid-template-rows:
            auto
            minmax(
                0,
                1fr
            );

        overflow: hidden;

        background: #ffffff;

        border:
            0.3mm
            solid
            #d8e3de;

        border-radius: 1.9mm;

        box-shadow: none;

        page-break-inside: avoid;
    }

    .detalhe-colaborador .detalhe-topo,
    .detalhe-colaborador--compacto .detalhe-topo {
        min-height: 16mm;

        padding:
            1.8mm
            2.2mm;

        display: grid;

        grid-template-columns:
            7mm
            12mm
            minmax(
                56mm,
                1.05fr
            )
            minmax(
                58mm,
                1fr
            );

        align-items: center;

        gap: 1.8mm;

        background: #f7faf8;

        border-bottom:
            0.28mm
            solid
            #d8e3de;
    }

    .numero-colaborador,
    .detalhe-colaborador--compacto .numero-colaborador {
        width: 6.5mm;
        height: 6.5mm;
    }

    .numero-colaborador svg {
        width: 6.5mm;
        height: 6.5mm;
    }

    .numero-colaborador rect {
        fill: #1d6d53 !important;
    }

    .numero-colaborador text {
        fill: #ffffff;

        font-size: 2.45mm;

        font-weight: 950;
    }

    .avatar-colaborador,
    .detalhe-colaborador--compacto .avatar-colaborador {
        width: 11.5mm;
        height: 11.5mm;

        border:
            0.3mm
            solid
            #d8e3de;

        background: #e9f4ef;

        color: #123f34;

        font-size: 3.1mm;
    }

    .avatar-colaborador img {
        width: 100%;
        height: 100%;

        object-fit: cover;
    }

    .detalhe-identificacao {
        min-width: 0;
    }

    .detalhe-identificacao h3,
    .detalhe-colaborador--compacto
    .detalhe-identificacao h3 {
        margin:
            0
            0
            0.65mm;

        color: #123f34 !important;

        font-size: 2.55mm;
        line-height: 1.02;

        font-weight: 950;

        text-transform: uppercase;
    }

    .detalhe-identificacao p,
    .detalhe-colaborador--compacto
    .detalhe-identificacao p,
    .detalhe-status-linha,
    .detalhe-colaborador--compacto
    .detalhe-status-linha {
        margin:
            0.35mm
            0;

        color: #26352f;

        font-size: 1.55mm;
        line-height: 1.12;
    }

    .detalhe-status {
        min-width: 0;

        padding-left: 2.2mm;

        display: grid;

        align-content: center;

        gap: 0.75mm;

        border-left:
            0.3mm
            solid
            #d8e3de;
    }

    .detalhe-status-linha {
        align-items: center;

        gap: 1mm;
    }

    .detalhe-status-linha strong {
        color: #17231f;

        font-weight: 900;
    }

    .detalhe-grids,
    .detalhe-colaborador--compacto
    .detalhe-grids {
        min-height: 0;

        padding:
            1.6mm
            1.8mm
            1.8mm;

        display: grid;

        grid-template-columns:
            repeat(
                4,
                minmax(
                    0,
                    1fr
                )
            );

        gap: 1.4mm;
    }

    .lista-card,
    .detalhe-colaborador--compacto
    .lista-card {
        min-height: 0;

        padding:
            1.45mm
            1.55mm;

        overflow: hidden;

        background: #ffffff;

        border:
            0.25mm
            solid
            #d8e3de;

        border-radius: 1.45mm;
    }

    .lista-card h4,
    .detalhe-colaborador--compacto
    .lista-card h4 {
        margin:
            0
            0
            0.9mm;

        font-size: 1.65mm;
        line-height: 1.05;

        font-weight: 950;

        text-transform: uppercase;
    }

    .lista-card ul {
        margin:
            0;

        padding-left: 3.2mm;
    }

    .lista-card li,
    .detalhe-colaborador--compacto
    .lista-card li {
        margin-bottom: 0.45mm;

        color: #26352f;

        font-size: 1.35mm;
        line-height: 1.14;
    }

    .lista-card .mais-itens {
        color: #1d6d53;

        font-weight: 950;
    }

    .lista-vazia,
    .detalhe-colaborador--compacto
    .lista-vazia {
        margin: 0;

        color: #62706a;

        font-size: 1.4mm;
        line-height: 1.16;
    }

    /* ---------------------------------------------------------
       RODAPÉ PRÓPRIO — SEM FAIXA AZUL
       --------------------------------------------------------- */

    .rodape-colaboradores-treinamentos {
        min-height: 5mm;

        margin-top: auto;

        padding-top: 1.2mm;

        display: flex;
        align-items: flex-end;
        justify-content: space-between;

        gap: 4mm;

        flex:
            0
            0
            auto;

        color: #62706a;

        border-top:
            0.28mm
            solid
            #d8e3de;

        font-size: 1.35mm;
        line-height: 1;

        font-weight: 750;
    }

    .rodape-colaboradores-treinamentos__marca {
        color: #123f34;

        font-weight: 950;
    }

    .rodape-colaboradores-treinamentos__descricao {
        text-align: right;
    }


    /* =========================================================
       G2-C10D-C3 — RÉGUA VISUAL PENDÊNCIAS
       Adaptação proporcional ao relatório de Colaboradores.
       Regra: centro visual horizontal + vertical.
       ========================================================= */

    /* ---------------------------------------------------------
       HERO
       O título é mais comprido que o de Pendências:
       a escala foi aumentada sem forçar quebra de linha.
       --------------------------------------------------------- */

    .cabecalho-colaboradores-treinamentos {
        min-height: 21.5mm;
    }

    .hero-colaboradores__titulo {
        align-content: center;
        justify-content: center;

        transform:
            translateY(
                -1.4mm
            );
    }

    .hero-colaboradores__titulo h1 {
        font-size: 4.55mm;
        line-height: 1.04;

        font-weight: 950;

        letter-spacing: -0.026em;

        white-space: nowrap;
    }

    .hero-colaboradores__titulo p {
        margin-top: 1.1mm;

        font-size: 2.35mm;
        line-height: 1.05;

        font-weight: 800;
    }

    /* ---------------------------------------------------------
       EMPRESA — mesma hierarquia de 3 linhas de Pendências
       --------------------------------------------------------- */

    .resumo-geral-colaboradores {
        grid-template-columns:
            minmax(
                54mm,
                1fr
            )
            minmax(
                0,
                3.45fr
            );

        gap: 1.35mm;
    }

    .contexto-empresa-colaboradores,
    .resumo-colaboradores-grid {
        min-height: 13mm;
        height: 13mm;
    }

    .contexto-empresa-colaboradores {
        grid-template-columns:
            9mm
            minmax(
                0,
                1fr
            );

        padding:
            1.3mm
            1.8mm;

        gap: 1.8mm;
    }

    .contexto-empresa-colaboradores__logo {
        width: 8.5mm;
        height: 8.5mm;
    }

    .contexto-empresa-colaboradores__texto {
        gap: 0;

        align-content: center;
        justify-content: center;

        transform:
            translateY(
                -1.15mm
            );
    }

    .contexto-empresa-colaboradores__nome {
        margin: 0;

        color: #0c291e;

        font-size: 3.1mm;
        line-height: 1;

        font-weight: 950;
    }

    .contexto-empresa-colaboradores__nome--longo {
        font-size: 2.65mm;
    }

    .contexto-empresa-colaboradores__nome--muito-longo {
        font-size: 2.3mm;
    }

    .contexto-empresa-colaboradores__texto small {
        display: block;

        margin-top: 0.42mm;

        color: #52655c;

        font-size: 1.95mm;
        line-height: 1;

        font-weight: 850;
    }

    .contexto-empresa-colaboradores__texto > span {
        display: block;

        margin-top: 0.32mm;

        color: #52655c;

        font-size: 1.95mm;
        line-height: 1;

        font-weight: 900;
    }

    /* ---------------------------------------------------------
       7 KPIs
       Mesma composição título + número do relatório-base.
       Escala adaptada porque existem sete colunas.
       --------------------------------------------------------- */

    .resumo-colaboradores-grid {
        gap: 0.9mm;
    }

    .kpi-colaboradores {
        min-height: 13mm;
        height: 13mm;

        padding:
            1mm
            0.8mm;

        align-items: center;
    }

    .kpi-colaboradores__texto {
        display: flex;
        flex-direction: row;

        width: max-content;
        max-width: 100%;

        align-items: center;
        justify-content: center;

        align-self: center;
        justify-self: center;

        gap: 0.9mm;

        text-align: center;

        white-space: nowrap;

        transform:
            translateY(
                -1.25mm
            );
    }

    .kpi-colaboradores__texto small {
        width: auto;

        font-size: 1.9mm;
        line-height: 1;

        font-weight: 900;

        letter-spacing: 0.005em;

        text-transform: uppercase;

        white-space: nowrap;

        transform:
            translateY(
                0.35mm
            );
    }

    .kpi-colaboradores__texto strong {
        font-size: 4.5mm;
        line-height: 1;

        font-weight: 980;

        white-space: nowrap;

        transform:
            translateY(
                -0.35mm
            );
    }

    /* ---------------------------------------------------------
       FILTROS — composição horizontal da régua final
       --------------------------------------------------------- */

    .filtros-colaboradores-treinamentos {
        min-height: 8.2mm;

        padding-top: 1.05mm;
        padding-bottom: 1.05mm;

        align-items: center;

        grid-template-columns:
            13mm
            repeat(
                4,
                minmax(
                    0,
                    1fr
                )
            );
    }

    .filtros-colaboradores-treinamentos__rotulo {
        min-height: 4.8mm;

        display: flex;

        align-items: center;
        justify-content: center;

        align-self: center;

        font-size: 2.25mm;
        line-height: 1;

        font-weight: 950;

        transform:
            translateY(
                -1.4mm
            );
    }

    .filtro-colaboradores-inline {
        min-height: 4.8mm;

        padding:
            0.55mm
            0.8mm;

        flex-direction: row;

        align-items: center;
        justify-content: center;

        align-self: center;

        gap: 0.9mm;

        text-align: center;

        transform:
            translateY(
                -1.4mm
            );
    }

    .filtro-colaboradores-inline small {
        width: auto;

        flex:
            0
            0
            auto;

        font-size: 2.05mm;
        line-height: 1;

        font-weight: 800;

        white-space: nowrap;
    }

    .filtro-colaboradores-inline strong {
        width: auto;

        min-width: 0;

        margin-top: 0;

        font-size: 2.3mm;
        line-height: 1;

        font-weight: 900;

        white-space: nowrap;

        overflow: hidden;
        text-overflow: ellipsis;
    }

    /* ---------------------------------------------------------
       TÍTULO DO BLOCO
       --------------------------------------------------------- */

    .bloco h2 {
        box-sizing: border-box;

        min-height: 7.2mm;
        height: 7.2mm;

        padding:
            0
            2mm
            0.65mm;

        color: #123f34 !important;

        background: #f3f8f5 !important;

        font-size: 2.75mm;
        line-height: 1;

        font-weight: 950;

        letter-spacing: 0.035em;

        text-align: center;

        border-bottom:
            0.3mm
            solid
            #c7d6ce;
    }

    /* ---------------------------------------------------------
       TABELA — régua final de Pendências
       --------------------------------------------------------- */

    .tabela-resumo-colaboradores thead tr {
        height: 7mm;
    }

    .tabela-resumo-colaboradores thead th {
        height: 7mm;

        padding: 0;

        color: #173327 !important;

        background: #f3f8f5 !important;

        border-right:
            0.25mm
            solid
            #d9e3de;

        border-bottom:
            0.25mm
            solid
            #c7d6ce;

        text-align: center;
        vertical-align: middle;
    }

    .tabela-resumo-colaboradores thead th:last-child {
        border-right: 0;
    }

    .tabela-resumo-colaboradores .th-conteudo {
        box-sizing: border-box;

        width: 100%;
        height: 7mm;

        padding:
            1mm
            1.05mm;

        display: flex;

        align-items: center;
        justify-content: center;

        color: #173327 !important;

        font-size: 2.35mm;
        line-height: 1;

        font-weight: 950;

        text-align: center;

        text-transform: uppercase;

        transform:
            translateY(
                -0.90mm
            );
    }

    .tabela-resumo-colaboradores tbody tr:nth-child(even) td {
        background: #fbfdfc;
    }

    .tabela-resumo-colaboradores tbody td {
        height: auto;

        padding:
            1.35mm
            1.05mm;

        color: #263a31;

        font-size: 2.1mm;
        line-height: 1.16;

        vertical-align: middle;

        border-right:
            0.25mm
            solid
            #d9e3de;

        border-bottom:
            0.25mm
            solid
            #d9e3de;
    }

    .tabela-resumo-colaboradores tbody td:last-child {
        border-right: 0;
    }

    .tabela-resumo-colaboradores tbody tr:last-child td {
        border-bottom: 0;
    }

    .tabela-resumo-colaboradores .texto-forte {
        color: #173327;

        font-size: 2.1mm;
        line-height: 1.16;

        font-weight: 900;

        text-align: left;
    }

    .tabela-resumo-colaboradores tbody .badge {
        display: block;

        width: 100%;

        margin: 0;

        padding: 0 !important;

        background: transparent !important;

        border: 0 !important;
        border-radius: 0 !important;

        box-shadow: none !important;

        font-size: 2.05mm;
        line-height: 1;

        font-weight: 950;

        text-align: center;

        white-space: nowrap;
    }

    /* ---------------------------------------------------------
       CENTRALIZAÇÃO ÓPTICA REAL
       Eixo horizontal atual é preservado.
       Somente o eixo vertical é compensado.
       --------------------------------------------------------- */

    .tabela-resumo-colaboradores
    .celula-conteudo-optico-colaboradores {
        display: block;

        width: 100%;
    }

    /*
     * Coluna #:
     * reproduz o mesmo princípio aprovado em Pendências.
     * Não altera centralização horizontal.
     */
    .tabela-resumo-colaboradores
    tbody td:first-child {
        padding-top:
            0.55mm;

        padding-bottom:
            2.15mm;
    }

    /* Colaborador */
    .tabela-resumo-colaboradores
    tbody td:nth-child(2)
    .celula-conteudo-optico-colaboradores {
        transform:
            translateY(
                -1.45mm
            );
    }

    /* Função */
    .tabela-resumo-colaboradores
    tbody td:nth-child(3)
    .celula-conteudo-optico-colaboradores {
        transform:
            translateY(
                -1.45mm
            );
    }

    /* Situação na obra */
    .tabela-resumo-colaboradores
    tbody td:nth-child(4)
    .celula-conteudo-optico-colaboradores {
        transform:
            translateY(
                -1.25mm
            );
    }

    /* Status geral */
    .tabela-resumo-colaboradores
    tbody td:nth-child(5)
    .celula-conteudo-optico-colaboradores {
        transform:
            translateY(
                -1.25mm
            );
    }

    /* Pendentes */
    .tabela-resumo-colaboradores
    tbody td:nth-child(6)
    .celula-conteudo-optico-colaboradores {
        transform:
            translateY(
                -1.45mm
            );
    }

    /* Vencidos */
    .tabela-resumo-colaboradores
    tbody td:nth-child(7)
    .celula-conteudo-optico-colaboradores {
        transform:
            translateY(
                -1.45mm
            );
    }

    /* A vencer */
    .tabela-resumo-colaboradores
    tbody td:nth-child(8)
    .celula-conteudo-optico-colaboradores {
        transform:
            translateY(
                -1.45mm
            );
    }

    /*
     * Continuação:
     * deixa de usar o antigo height/padding em pixels.
     * A paginação dinâmica decidirá quantas linhas cabem.
     */
    .pagina-relatorio--resumo-continuacao
    .tabela-resumo-colaboradores
    tbody td {
        height: auto;

        padding:
            1.35mm
            1.05mm;
    }

    .pagina-relatorio--resumo-continuacao
    .tabela-resumo-colaboradores
    tbody td:first-child {
        padding-top:
            0.55mm;

        padding-bottom:
            2.15mm;
    }


    /* =========================================================
       G2-C10D-C3A — REFINAMENTO DA PRIMEIRA PÁGINA

       1. Empresa: texto à esquerda e junto ao logo.
       2. Filtros: eliminar corte vertical.
       3. Tabela: redistribuir larguras e manter headers em 1 linha.
       4. Contratante: reduzir fundo branco.
       ========================================================= */

    /* ---------------------------------------------------------
       EMPRESA
       Centro vertical preservado.
       Eixo horizontal passa a ser explicitamente à esquerda.
       --------------------------------------------------------- */

    .contexto-empresa-colaboradores {
        grid-template-columns:
            8.5mm
            minmax(
                0,
                1fr
            );

        column-gap: 1mm;
    }

    .contexto-empresa-colaboradores__texto {
        width: 100%;

        align-content: center;
        justify-content: stretch;

        justify-items: start;

        text-align: left;

        transform:
            translateY(
                -1.15mm
            );
    }

    .contexto-empresa-colaboradores__nome,
    .contexto-empresa-colaboradores__texto small,
    .contexto-empresa-colaboradores__texto > span {
        width: 100%;

        text-align: left;
    }

    /* ---------------------------------------------------------
       FILTROS
       O C3 utilizava -1.4mm, valor adequado à referência de
       Pendências, porém excessivo neste componente.
       --------------------------------------------------------- */

    .filtros-colaboradores-treinamentos {
        min-height: 9.2mm;

        padding-top: 1.35mm;
        padding-bottom: 1.35mm;

        overflow: visible;

        align-items: center;
    }

    .filtros-colaboradores-treinamentos__rotulo {
        min-height: 5.2mm;

        overflow: visible;

        transform:
            translateY(
                -0.55mm
            );
    }

    .filtro-colaboradores-inline {
        min-height: 5.2mm;

        padding-top: 0.7mm;
        padding-bottom: 0.7mm;

        overflow: visible;

        align-items: center;
        justify-content: center;

        transform:
            translateY(
                -0.55mm
            );
    }

    .filtro-colaboradores-inline small,
    .filtro-colaboradores-inline strong {
        line-height: 1.05;

        overflow: visible;
    }

    /* ---------------------------------------------------------
       TABELA
       Reduz Colaborador e distribui largura para os demais.
       Total = 100%.
       --------------------------------------------------------- */

    .tabela-resumo-colaboradores .col-numero {
        width: 4%;
    }

    .tabela-resumo-colaboradores .col-colaborador {
        width: 23%;
    }

    .tabela-resumo-colaboradores .col-funcao {
        width: 16%;
    }

    .tabela-resumo-colaboradores .col-situacao {
        width: 15%;
    }

    .tabela-resumo-colaboradores .col-status {
        width: 15%;
    }

    .tabela-resumo-colaboradores .col-pendentes,
    .tabela-resumo-colaboradores .col-vencidos,
    .tabela-resumo-colaboradores .col-vencer {
        width: 9%;
    }

    .tabela-resumo-colaboradores .th-conteudo {
        padding-left: 0.65mm;
        padding-right: 0.65mm;

        white-space: nowrap;

        overflow: visible;

        word-break: normal;
        overflow-wrap: normal;
    }

    /* ---------------------------------------------------------
       LOGO DA CONTRATANTE
       Reduz somente o realce branco.
       --------------------------------------------------------- */

    .hero-colaboradores__contratante-box {
        width: 13.5mm;
        min-width: 13.5mm;
        max-width: 13.5mm;

        height: 8.2mm;
        min-height: 8.2mm;
        max-height: 8.2mm;

        padding:
            0.45mm
            0.65mm;

        border-radius: 1.25mm;
    }

    .hero-colaboradores__contratante-img {
        max-width: 10.5mm;
        max-height: 5.6mm;
    }


    /* =========================================================
       G2-C10D-C3B — THEAD E FILTROS

       Medição da captura:
       - eixo horizontal dos filtros já está correto;
       - texto está aproximadamente 4–6 px abaixo do centro;
       - label e valor precisam compartilhar baseline.

       Portanto:
       - NÃO deslocar horizontalmente;
       - ampliar folga vertical;
       - alinhar conteúdo pela baseline;
       - mover o conjunto somente no eixo Y.
       ========================================================= */

    /* ---------------------------------------------------------
       THEAD
       As quebras <br /> foram removidas do HTML.
       --------------------------------------------------------- */

    .tabela-resumo-colaboradores
    .th-conteudo {
        white-space: nowrap;

        word-break: normal;
        overflow-wrap: normal;

        line-height: 1;

        text-align: center;
    }

    /* ---------------------------------------------------------
       FILTROS — centro estrutural + centro óptico
       --------------------------------------------------------- */

    .filtros-colaboradores-treinamentos {
        min-height: 9.8mm;

        padding-top: 1.35mm;
        padding-bottom: 1.35mm;

        align-items: center;

        overflow: visible;
    }

    .filtros-colaboradores-treinamentos__rotulo {
        box-sizing: border-box;

        min-height: 5.8mm;
        height: 5.8mm;

        margin: 0;
        padding: 0;

        display: flex;

        align-items: center;
        justify-content: center;

        align-self: center;

        line-height: 1;

        text-align: center;

        overflow: visible;

        /*
         * Compensação somente vertical.
         * A caixa maior impede o corte visto anteriormente.
         */
        transform:
            translateY(
                -1.55mm
            );
    }

    .filtro-colaboradores-inline {
        box-sizing: border-box;

        min-height: 5.8mm;
        height: 5.8mm;

        margin: 0;

        padding:
            0.65mm
            0.9mm;

        display: flex;

        flex-direction: row;

        /*
         * Baseline comum corrige diferenças ópticas
         * entre label e valor com fontes diferentes.
         */
        align-items: baseline;
        justify-content: center;

        align-self: center;

        gap: 0.9mm;

        text-align: center;

        overflow: visible;

        /*
         * NÃO altera eixo X.
         * Somente sobe o conjunto até o centro visual.
         */
        transform:
            translateY(
                -1.55mm
            );
    }

    .filtro-colaboradores-inline small {
        display: inline-block;

        width: auto;

        flex:
            0
            0
            auto;

        margin: 0;
        padding: 0;

        font-size: 2.05mm;
        line-height: 1;

        font-weight: 800;

        white-space: nowrap;

        text-align: center;

        overflow: visible;

        transform: none;
    }

    .filtro-colaboradores-inline strong {
        display: inline-block;

        width: auto;

        min-width: 0;

        margin: 0;
        padding: 0;

        font-size: 2.3mm;
        line-height: 1;

        font-weight: 900;

        white-space: nowrap;

        text-align: center;

        overflow: visible;

        transform: none;
    }


    /* =========================================================
       G2-C10D-C3C — FILTRO ÚNICO + THEAD COMPACTO
       ========================================================= */

    /* ---------------------------------------------------------
       FILTROS
       Uma faixa externa.
       Nenhum balão interno.
       --------------------------------------------------------- */

    .filtros-colaboradores-treinamentos {
        box-sizing: border-box;

        min-height: 7.4mm;
        height: 7.4mm;

        margin: 0;

        padding:
            0
            1.35mm;

        display: grid;

        grid-template-columns:
            13mm
            repeat(
                4,
                minmax(
                    0,
                    1fr
                )
            );

        align-items: center;

        gap: 0;

        overflow: hidden;

        background: #f6faf8;

        border:
            0.3mm
            solid
            #d8e3de;

        border-radius: 1.9mm;
    }

    .filtros-colaboradores-treinamentos__rotulo {
        box-sizing: border-box;

        width: 100%;
        height: 100%;

        margin: 0;
        padding: 0;

        display: flex;

        align-items: center;
        justify-content: flex-start;

        color: #123f34;

        font-size: 2.25mm;
        line-height: 1;

        font-weight: 950;

        letter-spacing: 0.035em;

        text-align: left;

        transform:
            translateY(
                -0.15mm
            );
    }

    .filtro-colaboradores-inline {
        box-sizing: border-box;

        width: 100%;
        height: 4.6mm;
        min-height: 4.6mm;

        margin: 0;
        padding:
            0
            1.4mm;

        display: flex;

        flex-direction: row;

        align-items: center;
        justify-content: center;

        align-self: center;

        gap: 0.55mm;

        text-align: center;

        white-space: nowrap;

        /*
         * REMOVE O BALÃO INTERNO
         */
        background: transparent !important;

        border: 0 !important;
        border-radius: 0 !important;

        box-shadow: none !important;

        overflow: visible;

        transform:
            translateY(
                -0.15mm
            );
    }

    /*
     * Divisores entre Busca / Empresa /
     * Classificação / Colaboradores.
     */
    .filtro-colaboradores-inline +
    .filtro-colaboradores-inline {
        border-left:
            0.25mm
            solid
            #d8e3de !important;
    }

    .filtro-colaboradores-inline small {
        display: inline-block;

        width: auto;

        margin: 0;
        padding: 0;

        flex:
            0
            0
            auto;

        color: #52655c;

        font-size: 2.05mm;
        line-height: 1;

        font-weight: 850;

        text-transform: uppercase;

        text-align: center;

        white-space: nowrap;

        overflow: visible;

        transform: none;
    }

    /*
     * Formato final:
     * EMPRESA : Todas
     */
    .filtro-colaboradores-inline small::after {
        content: " :";
    }

    .filtro-colaboradores-inline strong {
        display: inline-block;

        width: auto;

        min-width: 0;

        margin: 0;
        padding: 0;

        color: #17231f;

        font-size: 2.3mm;
        line-height: 1;

        font-weight: 900;

        text-align: center;

        white-space: nowrap;

        overflow: visible;

        transform: none;
    }

    /* ---------------------------------------------------------
       THEAD
       Reduzir o espaço branco mantendo:
       - mesma fonte
       - mesma largura
       - títulos em uma linha
       --------------------------------------------------------- */

    .tabela-resumo-colaboradores thead tr {
        height: 5.8mm;
    }

    .tabela-resumo-colaboradores thead th {
        height: 5.8mm;

        padding: 0;

        vertical-align: middle;
    }

    .tabela-resumo-colaboradores
    .th-conteudo {
        box-sizing: border-box;

        width: 100%;
        height: 5.8mm;

        padding:
            0
            0.65mm;

        display: flex;

        align-items: center;
        justify-content: center;

        font-size: 2.35mm;
        line-height: 1;

        font-weight: 950;

        white-space: nowrap;

        text-align: center;

        word-break: normal;
        overflow-wrap: normal;

        transform:
            translateY(
                -0.45mm
            );
    }


    /* =========================================================
       G2-C10D-C3D — FECHAMENTO PAGINA 1
       ========================================================= */

    /* ---------------------------------------------------------
       1. FILTROS
       Somente o rótulo FILTROS estava visualmente ~1 px baixo.
       Os quatro itens permanecem exatamente onde estão.
       --------------------------------------------------------- */

    .filtros-colaboradores-treinamentos__rotulo {
        transform:
            translateY(
                -0.45mm
            );
    }

    /*
     * Os itens já estão opticamente corretos.
     * Explicitamos o valor para impedir herança posterior.
     */
    .filtro-colaboradores-inline {
        transform:
            translateY(
                -0.15mm
            );
    }

    /* ---------------------------------------------------------
       2. THEAD MAIS COMPACTO
       5.8 mm -> 4.2 mm

       Fonte 2.35 mm PRESERVADA.
       Larguras PRESERVADAS.
       Uma linha PRESERVADA.
       --------------------------------------------------------- */

    .tabela-resumo-colaboradores
    thead tr {
        height: 4.2mm;
    }

    .tabela-resumo-colaboradores
    thead th {
        height: 4.2mm;

        padding: 0;

        vertical-align: middle;
    }

    .tabela-resumo-colaboradores
    .th-conteudo {
        box-sizing: border-box;

        width: 100%;
        height: 4.2mm;

        padding:
            0
            0.6mm;

        display: flex;

        align-items: center;
        justify-content: center;

        font-size: 2.35mm;
        line-height: 1;

        font-weight: 950;

        white-space: nowrap;

        text-align: center;

        word-break: normal;
        overflow-wrap: normal;

        /*
         * Menor compensação porque a faixa agora
         * é significativamente mais baixa.
         */
        transform:
            translateY(
                -0.20mm
            );
    }

    /* ---------------------------------------------------------
       3. LOGO IDEALIZA
       - logo útil maior
       - caixa praticamente quadrada
       - branco fino: ~0.8 mm por lado
       --------------------------------------------------------- */

    .hero-colaboradores__contratante-box {
        box-sizing: border-box;

        width: 8.8mm;
        min-width: 8.8mm;
        max-width: 8.8mm;

        height: 8.8mm;
        min-height: 8.8mm;
        max-height: 8.8mm;

        padding: 0.55mm;

        display: flex;

        align-items: center;
        justify-content: center;

        background:
            rgba(
                255,
                255,
                255,
                0.98
            );

        border:
            0.25mm
            solid
            rgba(
                255,
                255,
                255,
                0.98
            );

        border-radius: 0.9mm;

        overflow: hidden;
    }

    .hero-colaboradores__contratante-img {
        display: block;

        width: 7.2mm;
        height: 7.2mm;

        max-width: 7.2mm;
        max-height: 7.2mm;

        object-fit: contain;

        margin: 0;
        padding: 0;
    }


    /* =========================================================
       G2-C10D-C3E — LOGO E PREENCHIMENTO

       LOGO:
       - presença equivalente à referência de Pendências;
       - branco máximo aproximado: 0.8 mm por lado;
       - alinhado à direita e ao centro vertical do Hero.

       RESUMO:
       - limites 14/26 foram neutralizados no JS;
       - paginação B1 define a quantidade pela altura física real.
       ========================================================= */

    .hero-colaboradores__contratante {
        display: flex;

        align-items: center;
        justify-content: flex-end;

        align-self: center;
        justify-self: stretch;

        padding-right: 0.4mm;

        transform: none;
    }

    .hero-colaboradores__contratante-box {
        box-sizing: border-box;

        width: 11.6mm;
        min-width: 11.6mm;
        max-width: 11.6mm;

        height: 11.6mm;
        min-height: 11.6mm;
        max-height: 11.6mm;

        margin: 0;

        padding: 0.55mm;

        display: flex;

        align-items: center;
        justify-content: center;

        background:
            rgba(
                255,
                255,
                255,
                0.98
            );

        border:
            0.25mm
            solid
            rgba(
                255,
                255,
                255,
                0.98
            );

        border-radius: 1.05mm;

        overflow: hidden;

        box-shadow:
            0
            0.65mm
            1.8mm
            rgba(
                0,
                0,
                0,
                0.10
            );
    }

    .hero-colaboradores__contratante-img {
        display: block;

        width: 10mm;
        height: 10mm;

        min-width: 10mm;
        min-height: 10mm;

        max-width: 10mm;
        max-height: 10mm;

        margin: 0;
        padding: 0;

        object-fit: contain;
    }


    /* =========================================================
       G2-C10D-C3G — RODAPÉ + EMPRESA NA CONTINUAÇÃO
       ========================================================= */

    .rodape-colaboradores-treinamentos {
        display: grid;

        grid-template-columns:
            minmax(0, 1fr)
            auto
            minmax(0, 1fr);

        align-items: end;

        column-gap: 4mm;
    }

    .rodape-colaboradores-treinamentos__marca {
        justify-self: start;

        text-align: left;
    }

    .rodape-colaboradores-treinamentos__descricao {
        justify-self: center;

        text-align: center;

        white-space: nowrap;
    }

    .rodape-colaboradores-treinamentos__pagina {
        justify-self: end;

        color: #123f34;

        font-weight: 900;

        text-align: right;

        white-space: nowrap;
    }

    .pagina-relatorio--resumo-continuacao
    .bloco h2 {
        padding-left: 3mm;
        padding-right: 3mm;

        font-size: 2.55mm;

        white-space: nowrap;

        overflow: hidden;
        text-overflow: ellipsis;
    }


    /* =========================================================
       G2-C10D-C3H — FECHAMENTO VISUAL DO RESUMO

       Só entra após o JS confirmar que a paginação terminou.
       ========================================================= */

    .bloco--resumo-finalizado {
        min-height: 0 !important;
        height: auto !important;

        flex:
            0
            0
            auto !important;

        align-self: stretch;

        overflow: hidden;
    }

    .pagina-relatorio--resumo-continuacao
    .bloco--resumo-finalizado {
        min-height: 0 !important;
        height: auto !important;

        flex:
            0
            0
            auto !important;
    }

    .bloco--resumo-finalizado
    .tabela-resumo-colaboradores {
        margin: 0;
    }

    /*
     * A borda externa do .bloco agora passa imediatamente
     * depois da última linha real.
     */
    .bloco--resumo-finalizado
    .tabela-resumo-colaboradores
    tbody tr:last-child td {
        border-bottom: 0;
    }


    /* =========================================================
       G2-C10D-D1 — DETALHAMENTO COM ALTURA REAL

       Até 3 colaboradores.
       A altura física define 3, 2 ou 1.
       ========================================================= */

    .pagina-relatorio--detalhe-colaborador
    .bloco-detalhamento,
    .pagina-relatorio--detalhe-colaborador
    .bloco-detalhamento--pagina-dupla {
        min-height: 0;

        height: auto;

        margin: 0;

        flex:
            0
            0
            auto;

        overflow: visible;
    }

    .pagina-relatorio--detalhe-colaborador
    .detalhes-duplos {
        min-height: 0;

        height: auto;

        padding:
            1.15mm
            1.35mm;

        display: grid;

        grid-template-rows: none;
        grid-auto-rows: auto;

        align-content: start;

        gap: 1.25mm;

        flex:
            0
            0
            auto;
    }

    .pagina-relatorio--detalhe-colaborador
    .detalhe-colaborador,
    .pagina-relatorio--detalhe-colaborador
    .detalhe-colaborador--compacto {
        min-height: 0;

        height: auto;

        margin: 0;

        align-self: start;

        display: grid;

        grid-template-rows:
            auto
            auto;

        page-break-inside: avoid;
        break-inside: avoid;

        overflow: hidden;
    }

    .pagina-relatorio--detalhe-colaborador
    .detalhe-colaborador
    .detalhe-topo,
    .pagina-relatorio--detalhe-colaborador
    .detalhe-colaborador--compacto
    .detalhe-topo {
        min-height: 14.5mm;

        padding:
            1.25mm
            1.8mm;

        gap: 1.55mm;
    }

    .pagina-relatorio--detalhe-colaborador
    .detalhe-grids,
    .pagina-relatorio--detalhe-colaborador
    .detalhe-colaborador--compacto
    .detalhe-grids {
        min-height: 0;

        height: auto;

        padding:
            1.05mm
            1.35mm
            1.25mm;

        gap: 1mm;

        align-items: start;
    }

    .pagina-relatorio--detalhe-colaborador
    .lista-card,
    .pagina-relatorio--detalhe-colaborador
    .detalhe-colaborador--compacto
    .lista-card {
        min-height: 0;

        height: auto;

        padding:
            1.05mm
            1.2mm;

        align-self: start;

        overflow: visible;
    }

    .pagina-relatorio--detalhe-colaborador
    .lista-card h4,
    .pagina-relatorio--detalhe-colaborador
    .detalhe-colaborador--compacto
    .lista-card h4 {
        margin:
            0
            0
            0.55mm;

        font-size: 1.65mm;
        line-height: 1.05;
    }

    .pagina-relatorio--detalhe-colaborador
    .lista-card li,
    .pagina-relatorio--detalhe-colaborador
    .detalhe-colaborador--compacto
    .lista-card li {
        margin-bottom: 0.28mm;

        font-size: 1.35mm;
        line-height: 1.12;

        break-inside: avoid;
    }

    .pagina-relatorio--detalhe-colaborador
    .lista-card li:last-child {
        margin-bottom: 0;
    }


    /* =========================================================
       G2-C10D-D2 — BALÕES IGUAIS + CONTINUAÇÃO COMPACTA
       ========================================================= */

    /* ---------------------------------------------------------
       QUATRO BALÕES COM A MESMA ALTURA

       A altura da linha continua sendo determinada
       pelo maior conteúdo.

       Os outros três cartões apenas se estendem até
       a mesma altura. Não cria espaço vertical novo.
       --------------------------------------------------------- */

    .pagina-relatorio--detalhe-colaborador
    .detalhe-grids {
        align-items: stretch;
    }

    .pagina-relatorio--detalhe-colaborador
    .lista-card,
    .pagina-relatorio--detalhe-colaborador
    .detalhe-colaborador--compacto
    .lista-card {
        box-sizing: border-box;

        min-height: 0;

        height: auto;

        align-self: stretch;

        overflow: visible;
    }

    /* ---------------------------------------------------------
       PRIMEIRA PÁGINA DA EMPRESA
       Hero permanece exatamente como está.
       --------------------------------------------------------- */

    .pagina-relatorio--detalhe-inicial
    .cabecalho-colaboradores-treinamentos {
        display: grid;
    }

    /* ---------------------------------------------------------
       CONTINUAÇÃO DO DETALHAMENTO
       Mesmo conceito usado no resumo por colaborador.
       --------------------------------------------------------- */

    .pagina-relatorio--detalhe-continuacao
    .cabecalho-colaboradores-treinamentos {
        display: none !important;
    }

    .pagina-relatorio--detalhe-continuacao
    .bloco-detalhamento,
    .pagina-relatorio--detalhe-continuacao
    .bloco-detalhamento--pagina-dupla {
        margin-top: 0;

        min-height: 0;

        height: auto;
    }

    .pagina-relatorio--detalhe-continuacao
    .bloco-detalhamento h2 {
        box-sizing: border-box;

        min-height: 7.2mm;
        height: 7.2mm;

        margin: 0;

        padding:
            0
            3mm
            0.55mm;

        display: flex;

        align-items: center;
        justify-content: center;

        color: #123f34;

        background: #f3f8f5;

        border-bottom:
            0.3mm
            solid
            #c7d6ce;

        font-size: 2.55mm;
        line-height: 1;

        font-weight: 950;

        letter-spacing: 0.025em;

        text-align: center;

        text-transform: uppercase;

        white-space: nowrap;

        overflow: hidden;
        text-overflow: ellipsis;
    }


    /* =========================================================
       G2-C10D-D4 — SUBCONTRATADA ABAIXO DOS COLABORADORES
       ========================================================= */

    .contexto-empresa-colaboradores__subcontratada {
        box-sizing: border-box;

        display: block;

        width: 100%;

        margin-top: 0.28mm;

        padding: 0;

        color: #52655c !important;

        font-size: 1.65mm !important;
        line-height: 1 !important;

        font-weight: 800 !important;

        text-align: left;

        white-space: nowrap;

        overflow: hidden;
        text-overflow: ellipsis;
    }

    .contexto-empresa-colaboradores__subcontratada strong {
        color: #123f34;

        font-weight: 950;
    }


    /* =========================================================
       G2-C10D-D4-R2-R2 — CARD CONTRATUAL SEM CORTE
       ========================================================= */

    /*
     * A faixa deixa de possuir altura física fixa.
     * 17 mm é apenas o mínimo.
     */
    .resumo-colaboradores-grid {
        box-sizing: border-box;

        min-height: 17mm !important;
        height: auto !important;

        align-items: stretch !important;

        overflow: visible !important;
    }

    /*
     * Card da empresa acompanha o conteúdo real.
     */
    .contexto-empresa-colaboradores {
        box-sizing: border-box;

        min-height: 17mm !important;
        height: auto !important;

        padding:
            0.75mm
            1.8mm !important;

        align-self: stretch;

        overflow: visible !important;
    }

    /*
     * Os indicadores acompanham a altura da mesma linha,
     * mantendo todos os cartões nivelados.
     */
    .kpi-colaboradores {
        box-sizing: border-box;

        min-height: 17mm !important;
        height: auto !important;

        align-self: stretch;

        overflow: hidden;
    }

    /*
     * O conteúdo é centralizado estruturalmente.
     * Não há mais translateY negativo para compensar
     * uma altura antiga insuficiente.
     */
    .contexto-empresa-colaboradores__texto {
        box-sizing: border-box;

        min-width: 0;
        min-height: 0;

        height: auto;

        display: flex !important;
        flex-direction: column;

        align-items: flex-start;
        justify-content: center;

        gap: 0 !important;

        transform: none !important;

        overflow: visible !important;
    }

    .contexto-empresa-colaboradores__nome {
        flex:
            0
            0
            auto;

        width: 100%;

        margin: 0 !important;

        text-align: left;
    }

    .contexto-empresa-colaboradores__texto small {
        flex:
            0
            0
            auto;

        width: 100%;

        margin:
            0.18mm
            0
            0 !important;

        text-align: left;

        overflow: visible !important;
    }

    .contexto-empresa-colaboradores__texto > span {
        flex:
            0
            0
            auto;

        width: 100%;

        margin:
            0.14mm
            0
            0 !important;

        text-align: left;
    }

    /*
     * Informação contratual obrigatória.
     *
     * Nunca:
     * - cortar;
     * - esconder;
     * - aplicar ellipsis.
     *
     * Se necessário, quebra em duas linhas
     * e o card cresce.
     */
    .contexto-empresa-colaboradores__texto
    > .contexto-empresa-colaboradores__contratada-pela {
        box-sizing: border-box;

        display: block;

        width: 100%;
        max-width: 100%;

        min-height: 0;
        height: auto;

        margin:
            0.14mm
            0
            0 !important;

        padding: 0;

        color: #52655c;

        font-size: 1.55mm !important;
        line-height: 1.08 !important;

        font-weight: 800;

        text-align: left;

        white-space: normal !important;

        overflow: visible !important;

        text-overflow: clip !important;

        overflow-wrap: anywhere;

        word-break: normal;
    }

    .contexto-empresa-colaboradores__contratada-pela strong {
        color: #123f34;

        font-weight: 950;
    }

    /* =========================================================
       CONT-HERO-G2 — MINI-HERO DE CONTINUAÇÃO
       Relatório de Colaboradores / Treinamentos

       Aplica somente:
       - continuação do resumo;
       - continuação do detalhamento.

       A página inicial de cada contexto permanece intacta.
       ========================================================= */

    .pagina-relatorio--resumo-continuacao
    .cabecalho-colaboradores-treinamentos,
    .pagina-relatorio--detalhe-continuacao
    .cabecalho-colaboradores-treinamentos {
        box-sizing: border-box;

        width: 100%;

        min-height: 9.5mm;
        height: 9.5mm;

        margin: 0;

        padding:
            1.1mm
            3.5mm;

        display: grid !important;

        grid-template-columns:
            35mm
            minmax(0, 1fr)
            30mm;

        align-items: center;

        column-gap: 3mm;

        flex:
            0
            0
            9.5mm;

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
            url("${heroColaboradoresTreinamentosObrasUrl}");

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

    .pagina-relatorio--resumo-continuacao
    .hero-colaboradores__safescan,
    .pagina-relatorio--detalhe-continuacao
    .hero-colaboradores__safescan {
        min-width: 0;

        height: 100%;

        display: flex;

        align-items: center;
        justify-content: flex-start;

        gap: 1mm;

        transform: none;
    }

    .pagina-relatorio--resumo-continuacao
    .hero-colaboradores__simbolo,
    .pagina-relatorio--detalhe-continuacao
    .hero-colaboradores__simbolo {
        width: 5.2mm;
        height: 5.2mm;

        flex:
            0
            0
            5.2mm;
    }

    .pagina-relatorio--resumo-continuacao
    .hero-colaboradores__marca-texto,
    .pagina-relatorio--detalhe-continuacao
    .hero-colaboradores__marca-texto {
        min-width: 0;

        display: grid;

        line-height: 1;

        transform: none;
    }

    .pagina-relatorio--resumo-continuacao
    .hero-colaboradores__marca-texto strong,
    .pagina-relatorio--detalhe-continuacao
    .hero-colaboradores__marca-texto strong {
        margin: 0;

        color: #ffffff;

        font-size: 2.05mm;
        line-height: 1;

        font-weight: 950;

        letter-spacing: 0.025em;
    }

    .pagina-relatorio--resumo-continuacao
    .hero-colaboradores__marca-texto small,
    .pagina-relatorio--detalhe-continuacao
    .hero-colaboradores__marca-texto small {
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

    .pagina-relatorio--resumo-continuacao
    .hero-colaboradores__titulo,
    .pagina-relatorio--detalhe-continuacao
    .hero-colaboradores__titulo {
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

    .pagina-relatorio--resumo-continuacao
    .hero-colaboradores__titulo::before,
    .pagina-relatorio--detalhe-continuacao
    .hero-colaboradores__titulo::before {
        content:
            "COLABORADORES E TREINAMENTOS";

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

    .pagina-relatorio--resumo-continuacao
    .hero-colaboradores__titulo h1,
    .pagina-relatorio--detalhe-continuacao
    .hero-colaboradores__titulo h1 {
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

    .pagina-relatorio--resumo-continuacao
    .hero-colaboradores__titulo p,
    .pagina-relatorio--detalhe-continuacao
    .hero-colaboradores__titulo p {
        display: none !important;
    }

    .pagina-relatorio--resumo-continuacao
    .hero-colaboradores__contratante,
    .pagina-relatorio--detalhe-continuacao
    .hero-colaboradores__contratante {
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

    .pagina-relatorio--resumo-continuacao
    .hero-colaboradores__contratante > *,
    .pagina-relatorio--detalhe-continuacao
    .hero-colaboradores__contratante > * {
        display: none !important;
    }

    .pagina-relatorio--resumo-continuacao
    .hero-colaboradores__contratante::after,
    .pagina-relatorio--detalhe-continuacao
    .hero-colaboradores__contratante::after {
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

    /* =========================================================
       CONT-HERO-G2-R1 — RASTER-SAFE

       CORREÇÕES:
       1. título não pode ser cortado;
       2. geometria herdada do Hero integral é zerada;
       3. CONTINUAÇÃO passa a ser DOM real;
       4. altura física do mini-Hero continua 9.5mm;
       5. página 1 permanece inalterada.
       ========================================================= */

    .hero-colaboradores__continuacao {
        display: none;
    }

    .pagina-relatorio--resumo-continuacao
    .cabecalho-colaboradores-treinamentos,
    .pagina-relatorio--detalhe-continuacao
    .cabecalho-colaboradores-treinamentos {
        box-sizing: border-box !important;

        min-height: 9.5mm !important;
        height: 9.5mm !important;
        max-height: 9.5mm !important;

        padding:
            1mm
            3.5mm !important;

        overflow: hidden !important;
    }

    /* ---------------------------------------------------------
       COLUNA CENTRAL

       Zera qualquer min-height / padding / transform herdado
       do Hero integral.
       --------------------------------------------------------- */

    .pagina-relatorio--resumo-continuacao
    .hero-colaboradores__titulo,
    .pagina-relatorio--detalhe-continuacao
    .hero-colaboradores__titulo {
        box-sizing: border-box !important;

        min-width: 0 !important;

        min-height: 0 !important;
        height: auto !important;
        max-height: none !important;

        margin: 0 !important;
        padding: 0 !important;

        display: flex !important;

        flex-direction: column !important;

        align-items: center !important;
        justify-content: center !important;

        align-self: center !important;
        justify-self: stretch !important;

        gap: 0.25mm !important;

        overflow: visible !important;

        text-align: center !important;

        transform: none !important;
    }

    /* Contexto superior pequeno */
    .pagina-relatorio--resumo-continuacao
    .hero-colaboradores__titulo::before,
    .pagina-relatorio--detalhe-continuacao
    .hero-colaboradores__titulo::before {
        box-sizing: border-box !important;

        display: block !important;

        min-height: 0 !important;
        height: auto !important;

        margin: 0 !important;
        padding: 0 !important;

        color: #6ee7b7 !important;

        font-size: 0.95mm !important;
        line-height: 1 !important;

        font-weight: 950 !important;

        letter-spacing: 0.12em !important;

        white-space: nowrap !important;

        transform: none !important;
    }

    /* Título principal — NÃO PODE SER CORTADO */
    .pagina-relatorio--resumo-continuacao
    .hero-colaboradores__titulo h1,
    .pagina-relatorio--detalhe-continuacao
    .hero-colaboradores__titulo h1 {
        box-sizing: border-box !important;

        display: block !important;

        width: auto !important;
        max-width: 100% !important;

        min-height: 0 !important;
        height: auto !important;
        max-height: none !important;

        margin: 0 !important;
        padding: 0 !important;

        color: #ffffff !important;

        font-size: 2.25mm !important;
        line-height: 1.08 !important;

        font-weight: 950 !important;

        letter-spacing: -0.01em !important;

        text-align: center !important;

        white-space: nowrap !important;

        overflow: visible !important;

        text-overflow: clip !important;

        transform: none !important;
    }

    .pagina-relatorio--resumo-continuacao
    .hero-colaboradores__titulo p,
    .pagina-relatorio--detalhe-continuacao
    .hero-colaboradores__titulo p {
        display: none !important;

        margin: 0 !important;
        padding: 0 !important;

        min-height: 0 !important;
        height: 0 !important;
    }

    /* ---------------------------------------------------------
       LADO DIREITO

       Não depender de ::after para conteúdo relevante no PDF.
       html2canvas recebe um elemento DOM real.
       --------------------------------------------------------- */

    .pagina-relatorio--resumo-continuacao
    .hero-colaboradores__contratante,
    .pagina-relatorio--detalhe-continuacao
    .hero-colaboradores__contratante {
        box-sizing: border-box !important;

        min-width: 0 !important;

        min-height: 0 !important;
        height: 100% !important;

        margin: 0 !important;
        padding: 0 !important;

        display: flex !important;

        align-items: center !important;
        justify-content: flex-end !important;

        overflow: visible !important;

        background: transparent !important;

        border: 0 !important;

        box-shadow: none !important;

        transform: none !important;
    }

    .pagina-relatorio--resumo-continuacao
    .hero-colaboradores__contratante > *,
    .pagina-relatorio--detalhe-continuacao
    .hero-colaboradores__contratante > * {
        display: none !important;
    }

    .pagina-relatorio--resumo-continuacao
    .hero-colaboradores__contratante
    .hero-colaboradores__continuacao,
    .pagina-relatorio--detalhe-continuacao
    .hero-colaboradores__contratante
    .hero-colaboradores__continuacao {
        display: block !important;

        min-width: 0 !important;

        margin: 0 !important;
        padding: 0 !important;

        color:
            rgba(
                255,
                255,
                255,
                0.90
            ) !important;

        font-size: 1.15mm !important;
        line-height: 1 !important;

        font-weight: 950 !important;

        letter-spacing: 0.12em !important;

        text-align: right !important;

        white-space: nowrap !important;

        overflow: visible !important;

        transform: none !important;
    }

    /* Desativa o rótulo antigo por pseudo-elemento */
    .pagina-relatorio--resumo-continuacao
    .hero-colaboradores__contratante::after,
    .pagina-relatorio--detalhe-continuacao
    .hero-colaboradores__contratante::after {
        content: none !important;

        display: none !important;
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

            padding:
                5.5mm
                6mm
                4.5mm;

            border: 0;
            border-radius: 0;

            box-shadow: none;

            page-break-after: always;
        }

        .pagina-relatorio:last-child {
            break-after: auto;
            page-break-after: auto;
        }

        .quebra-pagina {
            page-break-before: always;
        }
    }
</style>
</head>
<body>
${conteudo}
</body>
</html>`;

    return baixarRelatorioColaboradoresTreinamentosIsolado({
        html,
        nomeArquivo,
    });
}
