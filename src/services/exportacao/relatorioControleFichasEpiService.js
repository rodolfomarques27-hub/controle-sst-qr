import {
    aplicarFiltrosControleFichasEpi,
    obterFiltrosControleFichasEpiParaExibicao,
} from "./relatorioControleFichasEpiFiltros";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

import heroControleFichasEpiUrl from "../../assets/heroes/relatorios/hero-pendencias-treinamentos-obras-v1.png";

const PDF_LARGURA_MM = 297;
const PDF_ALTURA_MM = 210;

const ESCALA_RENDERIZACAO = 1.7;

const TOLERANCIA_OVERFLOW_PX = 2;
const FOLGA_RODAPE_PX = 5;

const ID_FICHA_EPI = 14;

/*
 * EPI-CTRL-G3-A-R1
 *
 * Critério administrativo interno:
 * revisão gerencial após 12 meses.
 *
 * NÃO representa:
 * - validade legal da ficha;
 * - validade do CA;
 * - validade física do EPI.
 */
const MESES_REVISAO_CONTROLE_EPI = 12;

function escaparHTML(valor = "") {
    return String(valor ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function textoSeguro(
    valor,
    fallback = "-"
) {
    const texto =
        String(
            valor ?? ""
        ).trim();

    return texto || fallback;
}

function obterNomeContratante(
    contratante = {}
) {
    return textoSeguro(
        contratante?.nome ||
            contratante?.razaoSocial ||
            contratante?.razao_social ||
            contratante?.nomeFantasia ||
            contratante?.nome_fantasia,
        "Contratante"
    );
}

function formatarDataBr(
    valor = ""
) {
    const texto =
        String(
            valor || ""
        ).trim();

    if (!texto) {
        return "-";
    }

    const iso =
        texto.match(
            /^(\d{4})-(\d{2})-(\d{2})/
        );

    if (iso) {
        return (
            `${iso[3]}/${iso[2]}/${iso[1]}`
        );
    }

    const br =
        texto.match(
            /^(\d{2})\/(\d{2})\/(\d{4})/
        );

    if (br) {
        return (
            `${br[1]}/${br[2]}/${br[3]}`
        );
    }

    const data =
        new Date(
            texto
        );

    if (
        !Number.isNaN(
            data.getTime()
        )
    ) {
        return new Intl.DateTimeFormat(
            "pt-BR",
            {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
            }
        ).format(
            data
        );
    }

    return texto;
}

function formatarDataHoraEmissao(
    data = new Date()
) {
    const dataObj =
        data instanceof Date
            ? data
            : new Date(
                data
            );

    const segura =
        Number.isNaN(
            dataObj.getTime()
        )
            ? new Date()
            : dataObj;

    return new Intl.DateTimeFormat(
        "pt-BR",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        }
    ).format(
        segura
    );
}

function converterDataDocumentalEpi(
    valor = ""
) {
    const texto =
        String(
            valor || ""
        ).trim();

    if (!texto) {
        return null;
    }

    const iso =
        texto.match(
            /^(\d{4})-(\d{2})-(\d{2})/
        );

    if (iso) {
        return new Date(
            Date.UTC(
                Number(iso[1]),
                Number(iso[2]) - 1,
                Number(iso[3])
            )
        );
    }

    const br =
        texto.match(
            /^(\d{2})\/(\d{2})\/(\d{4})/
        );

    if (br) {
        return new Date(
            Date.UTC(
                Number(br[3]),
                Number(br[2]) - 1,
                Number(br[1])
            )
        );
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
        return null;
    }

    return new Date(
        Date.UTC(
            data.getFullYear(),
            data.getMonth(),
            data.getDate()
        )
    );
}

function adicionarMesesUtc(
    data,
    meses
) {
    if (
        !(data instanceof Date) ||
        Number.isNaN(
            data.getTime()
        )
    ) {
        return null;
    }

    const totalMeses =
        data.getUTCMonth() +
        meses;

    const anoDestino =
        data.getUTCFullYear() +
        Math.floor(
            totalMeses /
            12
        );

    const mesDestino =
        (
            totalMeses %
            12 +
            12
        ) %
        12;

    const ultimoDiaDestino =
        new Date(
            Date.UTC(
                anoDestino,
                mesDestino + 1,
                0
            )
        ).getUTCDate();

    const diaDestino =
        Math.min(
            data.getUTCDate(),
            ultimoDiaDestino
        );

    return new Date(
        Date.UTC(
            anoDestino,
            mesDestino,
            diaDestino
        )
    );
}

function avaliarControle12mEpi(
    dataFicha = "",
    referencia = new Date()
) {
    const dataDocumento =
        converterDataDocumentalEpi(
            dataFicha
        );

    if (!dataDocumento) {
        return {
            texto: "-",
            revisar: false,
        };
    }

    const limite =
        adicionarMesesUtc(
            dataDocumento,
            MESES_REVISAO_CONTROLE_EPI
        );

    const dataReferencia =
        new Date(
            Date.UTC(
                referencia.getFullYear(),
                referencia.getMonth(),
                referencia.getDate()
            )
        );

    const revisar =
        Boolean(
            limite &&
            dataReferencia.getTime() >
                limite.getTime()
        );

    return {
        texto:
            revisar
                ? "REVISAR"
                : "EM DIA",

        revisar,
    };
}
function idDocumento(
    item = {}
) {
    return Number(
        item?.treinamentoId ??
            item?.treinamento_id ??
            item?.treinamentoCodigo ??
            item?.treinamento_codigo ??
            0
    );
}

function localizarFichaEpi(
    colaborador = {}
) {
    if (
        colaborador?.fichaEpi &&
        typeof colaborador.fichaEpi ===
            "object"
    ) {
        return colaborador.fichaEpi;
    }

    const documentos =
        Array.isArray(
            colaborador?.treinamentos
        )
            ? colaborador.treinamentos
            : [];

    return (
        documentos.find(
            (item) =>
                idDocumento(
                    item
                ) ===
                ID_FICHA_EPI
        ) ||
        null
    );
}

function dataDocumentalFicha(
    ficha = {}
) {
    return textoSeguro(
        ficha?.realizado ||
            ficha?.data_realizacao ||
            ficha?.dataRealizacao,
        ""
    );
}

function possuiArquivoFicha(
    ficha = {}
) {
    const candidato =
        ficha?.arquivoUrl ||
        ficha?.arquivo_url ||
        ficha?.urlArquivo ||
        ficha?.url_arquivo ||
        ficha?.documentoUrl ||
        ficha?.documento_url ||
        ficha?.arquivo ||
        ficha?.url ||
        "";

    if (
        typeof candidato ===
        "string"
    ) {
        return Boolean(
            candidato.trim()
        );
    }

    return Boolean(
        candidato
    );
}

function normalizarSituacaoFicha({
    possuiRegistro = false,
    possuiArquivo = false,
    dataFicha = "",
} = {}) {
    if (
        !possuiRegistro
    ) {
        return "PENDENTE";
    }

    if (
        !possuiArquivo ||
        !String(
            dataFicha || ""
        ).trim()
    ) {
        return "REVISAR";
    }

    return "CONFORME";
}

function descricaoArquivoFicha({
    possuiRegistro = false,
    possuiArquivo = false,
} = {}) {
    if (
        !possuiRegistro
    ) {
        return "NÃO CADASTRADA";
    }

    if (
        !possuiArquivo
    ) {
        return "SEM ARQUIVO";
    }

    return "LOCALIZADA";
}

function prepararColaboradorEpi(
    colaborador = {}
) {
    const ficha =
        localizarFichaEpi(
            colaborador
        );

    const possuiRegistro =
        Boolean(
            ficha ||
            colaborador?.possuiRegistroFichaEpi
        );

    const possuiArquivo =
        typeof colaborador?.possuiArquivoFichaEpi ===
            "boolean"
            ? colaborador.possuiArquivoFichaEpi
            : Boolean(
                ficha &&
                possuiArquivoFicha(
                    ficha
                )
            );

    const dataFicha =
        textoSeguro(
            colaborador?.dataFichaEpi ||
                dataDocumentalFicha(
                    ficha || {}
                ),
            ""
        );

    const situacao =
        normalizarSituacaoFicha({
            possuiRegistro,
            possuiArquivo,
            dataFicha,
        });

    const controle12m =
        avaliarControle12mEpi(
            dataFicha
        );

    return {
        nome:
            textoSeguro(
                colaborador?.nome ||
                    colaborador?.colaborador,
                "Nome não informado"
            ),

        funcao:
            textoSeguro(
                colaborador?.funcao ||
                    colaborador?.cargo,
                "-"
            ),

        empresa:
            textoSeguro(
                colaborador?.empresaNome ||
                    colaborador?.empresa,
                "Empresa não informada"
            ),

        possuiRegistro,
        possuiArquivo,

        fichaTexto:
            descricaoArquivoFicha({
                possuiRegistro,
                possuiArquivo,
            }),

        dataFicha,

        dataFichaAnterior:
            textoSeguro(
                colaborador?.dataFichaEpiAnterior,
                ""
            ),

        situacao,

        controle12m:
            controle12m.texto,

        controle12mRevisar:
            controle12m.revisar,
    };
}

function prepararListaColaboradores(
    colaboradores = []
) {
    return (
        Array.isArray(
            colaboradores
        )
            ? colaboradores
            : []
    )
        .map(
            prepararColaboradorEpi
        )
        .sort(
            (a, b) =>
                a.nome.localeCompare(
                    b.nome,
                    "pt-BR",
                    {
                        sensitivity:
                            "base",
                    }
                )
        );
}

function calcularResumo(
    colaboradores = []
) {
    const total =
        colaboradores.length;

    const conformes =
        colaboradores.filter(
            (item) =>
                item.situacao ===
                "CONFORME"
        ).length;

    const revisar =
        colaboradores.filter(
            (item) =>
                item.situacao ===
                "REVISAR"
        ).length;

    const pendentes =
        colaboradores.filter(
            (item) =>
                item.situacao ===
                "PENDENTE"
        ).length;

    const revisarControle =
        colaboradores.filter(
            (item) =>
                item.controle12mRevisar
        ).length;

    /*
     * Cobertura permanece exclusivamente documental.
     *
     * Controle 12M não transforma uma ficha conforme
     * em pendente.
     */
    const cobertura =
        total > 0
            ? Math.round(
                (
                    conformes /
                    total
                ) *
                    100
            )
            : 0;

    return {
        total,
        conformes,
        revisar,
        pendentes,
        revisarControle,
        cobertura,
    };
}

function montarMarcaSafeScan() {
    return `
        <div
            class="marca-safescan"
            aria-label="SafeScan Brasil"
        >
            <svg
                class="marca-safescan__simbolo"
                viewBox="0 0 48 48"
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

            <span
                class="marca-safescan__texto"
            >
                <strong>
                    SAFESCAN
                </strong>

                <small>
                    BRASIL
                </small>
            </span>
        </div>
    `;
}

function montarMarcaContratanteEpi(
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

    if (
        contratante.logoUrl
    ) {
        return `
            <span
                class="hero-epi__contratante-box"
            >
                <img
                    class="hero-epi__contratante-img"
                    src="${escaparHTML(
                        contratante.logoUrl
                    )}"
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
                hero-epi__contratante-box
                hero-epi__contratante-box--texto
            "
        >
            ${escaparHTML(
                obterNomeContratante(
                    contratante
                )
            )}
        </span>
    `;
}
function montarHero({
    titulo,
    contratanteCabecalho,
}) {
    return `
        <header
            class="hero-epi"
        >
            <img
                class="hero-epi__fundo"
                src="${escaparHTML(
                    heroControleFichasEpiUrl
                )}"
                alt=""
            />

            <div
                class="hero-epi__overlay"
            ></div>

            <div
                class="hero-epi__conteudo"
            >
                <div
                    class="hero-epi__marca"
                >
                    ${montarMarcaSafeScan()}
                </div>

                <div
                    class="hero-epi__titulo"
                >
                    <span>
                        CONTROLE DOCUMENTAL · NR-06
                    </span>

                    <h1>
                        ${escaparHTML(
                            titulo
                        )}
                    </h1>

                    <p>
                        Conferência das fichas de fornecimento de Equipamentos de Proteção Individual
                    </p>
                </div>

                <div
                    class="hero-epi__contratante"
                    aria-label="Contratante: ${escaparHTML(
                        obterNomeContratante(
                            contratanteCabecalho
                        )
                    )}"
                >
                    ${montarMarcaContratanteEpi(
                        contratanteCabecalho
                    )}
                </div>
            </div>
        </header>
    `;
}

function montarCabecalhoContinuacao(
    titulo
) {
    return `
        <header
            class="cabecalho-continuacao-epi"
        >
            <div>
                ${montarMarcaSafeScan()}
            </div>

            <div
                class="cabecalho-continuacao-epi__titulo"
            >
                <span>
                    CONTROLE DOCUMENTAL
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

function montarKpis(
    resumo = {}
) {
    const itens = [
        [
            "TOTAL DE COLABORADORES",
            resumo.total,
        ],
        [
            "CONFORMES",
            resumo.conformes,
        ],
        [
            "PENDENTES",
            resumo.pendentes,
        ],
        [
            "REVISAR CONTROLE",
            resumo.revisarControle,
        ],
        [
            "COBERTURA",
            `${resumo.cobertura}%`,
        ],
    ];

    return `
        <section
            class="kpis-epi"
        >
            ${itens
                .map(
                    ([rotulo, valor]) => `
                        <div
                            class="kpi-epi"
                        >
                            <span>
                                ${escaparHTML(
                                    rotulo
                                )}
                            </span>

                            <strong>
                                ${escaparHTML(
                                    valor
                                )}
                            </strong>
                        </div>
                    `
                )
                .join("")}
        </section>
    `;
}

function montarFiltros(
    filtros = {},
    resumo = {}
) {
    void resumo;

    const itens = [
        [
            "Busca",
            filtros?.busca ||
                "-",
        ],
        [
            "Empresa",
            filtros?.empresa ||
                "Todas",
        ],
        [
            "Classificação",
            filtros?.classificacao ||
                "Todos",
        ],
    ];

    return `
        <section
            class="filtros-epi"
        >
            <span
                class="filtros-epi__rotulo"
            >
                FILTROS
            </span>

            ${itens
                .map(
                    (
                        [rotulo, valor]
                    ) => `
                        <span
                            class="filtro-epi-inline"
                        >
                            <small>
                                ${escaparHTML(
                                    rotulo
                                )}
                            </small>

                            <strong>
                                ${escaparHTML(
                                    valor
                                )}
                            </strong>
                        </span>
                    `
                )
                .join("")}
        </section>
    `;
}
function classeSituacao(
    situacao = ""
) {
    if (
        situacao ===
        "CONFORME"
    ) {
        return "situacao-epi--conforme";
    }

    if (
        situacao ===
        "REVISAR"
    ) {
        return "situacao-epi--revisar";
    }

    return "situacao-epi--pendente";
}

function classeFicha(
    item = {}
) {
    if (
        !item.possuiRegistro
    ) {
        return "ficha-epi--pendente";
    }

    if (
        !item.possuiArquivo
    ) {
        return "ficha-epi--revisar";
    }

    return "ficha-epi--ok";
}

function classeControle12m(
    item = {}
) {
    if (
        !item?.dataFicha
    ) {
        return "controle-epi--neutro";
    }

    if (
        item.controle12mRevisar
    ) {
        return "controle-epi--revisar";
    }

    return "controle-epi--emdia";
}

function montarLinhas(
    colaboradores = []
) {
    return colaboradores
        .map(
            (
                item,
                indice
            ) => `
                <tr>
                    <td>
                        <div
                            class="celula-epi"
                        >
                            ${indice + 1}
                        </div>
                    </td>

                    <td>
                        <div
                            class="celula-epi celula-epi--forte"
                        >
                            ${escaparHTML(
                                item.nome
                            )}
                        </div>
                    </td>

                    <td>
                        <div
                            class="celula-epi"
                        >
                            ${escaparHTML(
                                item.funcao
                            )}
                        </div>
                    </td>

                    <td>
                        <div
                            class="celula-epi"
                        >
                            ${escaparHTML(
                                item.empresa
                            )}
                        </div>
                    </td>

                    <td>
                        <div
                            class="celula-epi ficha-epi ${classeFicha(
                                item
                            )}"
                        >
                            ${escaparHTML(
                                item.fichaTexto
                            )}
                        </div>
                    </td>

                    <td>
                        <div
                            class="celula-epi versao-epi versao-epi--antiga"
                        >
                            ${escaparHTML(
                                item.dataFichaAnterior
                                    ? formatarDataBr(
                                        item.dataFichaAnterior
                                    )
                                    : "-"
                            )}
                        </div>
                    </td>

                    <td>
                        <div
                            class="celula-epi versao-epi versao-epi--atual"
                        >
                            ${escaparHTML(
                                item.dataFicha
                                    ? formatarDataBr(
                                        item.dataFicha
                                    )
                                    : "-"
                            )}
                        </div>
                    </td>

                    <td>
                        <div
                            class="celula-epi situacao-epi ${classeSituacao(
                                item.situacao
                            )}"
                        >
                            ${escaparHTML(
                                item.situacao
                            )}
                        </div>
                    </td>

                    <td>
                        <div
                            class="celula-epi controle-epi ${classeControle12m(
                                item
                            )}"
                        >
                            ${escaparHTML(
                                item.controle12m
                            )}
                        </div>
                    </td>
                </tr>
            `
        )
        .join("");
}

function montarTabela(
    colaboradores = []
) {
    return `
        <table
            class="tabela-epi"
        >
            <colgroup>
                <col style="width:3.5%">
                <col style="width:20%">
                <col style="width:11.5%">
                <col style="width:17%">
                <col style="width:9.5%">
                <col style="width:10%">
                <col style="width:10%">
                <col style="width:8.5%">
                <col style="width:10%">
            </colgroup>

            <thead>
                <tr>
                    <th>
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
                        FICHA DE EPI
                    </th>

                    <th>
                        VERSÃO ANTERIOR
                    </th>

                    <th>
                        VERSÃO ATUAL
                    </th>

                    <th>
                        SITUAÇÃO
                    </th>

                    <th>
                        CONTROLE 12M
                    </th>
                </tr>
            </thead>

            <tbody>
                ${montarLinhas(
                    colaboradores
                )}
            </tbody>
        </table>
    `;
}

function montarRodape(
    dataEmissao
) {
    return `
        <footer
            class="rodape-epi"
        >
            <span>
                Gerado pelo SafeScan Brasil
            </span>

            <span>
                ${escaparHTML(
                    dataEmissao
                )}
            </span>

            <span
                class="rodape-epi__pagina"
            >
                Página 1 de 1
            </span>
        </footer>
    `;
}

function montarPaginaInicial({
    titulo,
    contratanteCabecalho,
    colaboradores,
    filtros,
    resumo,
    dataEmissao,
}) {
    return `
        <section
            class="pagina-relatorio pagina-relatorio--epi pagina-relatorio--epi-inicial"
        >
            ${montarHero({
                titulo,
                contratanteCabecalho,
            })}

            ${montarKpis(
                resumo
            )}

            ${montarFiltros(
                filtros,
                resumo
            )}

            <main
                class="corpo-epi"
            >
                ${montarTabela(
                    colaboradores
                )}
            </main>

            ${montarRodape(
                dataEmissao
            )}
        </section>
    `;
}

function montarPaginaContinuacao({
    titulo,
    dataEmissao,
}) {
    return `
        <section
            class="pagina-relatorio pagina-relatorio--epi pagina-relatorio--continuacao pagina-relatorio--epi-continuacao"
        >
            ${montarCabecalhoContinuacao(
                titulo
            )}

            <main
                class="corpo-epi corpo-epi--continuacao"
            >
                ${montarTabela([])}
            </main>

            ${montarRodape(
                dataEmissao
            )}
        </section>
    `;
}

function montarCss() {
    return `
        * {
            box-sizing: border-box;
        }

        html,
        body {
            margin: 0;
            padding: 0;

            background: #e9eef0;

            color: #17211c;

            font-family:
                Arial,
                Helvetica,
                sans-serif;

            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }

        body {
            padding: 8mm 0;
        }

        .pagina-relatorio--epi {
            width: ${PDF_LARGURA_MM}mm;
            height: ${PDF_ALTURA_MM}mm;

            min-width: ${PDF_LARGURA_MM}mm;
            min-height: ${PDF_ALTURA_MM}mm;

            max-width: ${PDF_LARGURA_MM}mm;
            max-height: ${PDF_ALTURA_MM}mm;

            margin: 0 auto 8mm;

            padding:
                6mm
                7mm
                5mm;

            overflow: hidden;

            display: flex;

            flex-direction: column;

            gap: 2mm;

            background: #ffffff;
        }

        .hero-epi {
            position: relative;

            height: 21.5mm;
            min-height: 21.5mm;

            overflow: hidden;

            border-radius: 2.4mm;

            background: #0a271d;
        }

        .hero-epi__fundo,
        .hero-epi__overlay {
            position: absolute;

            inset: 0;

            width: 100%;
            height: 100%;
        }

        .hero-epi__fundo {
            object-fit: cover;

            object-position:
                center
                60%;

            filter:
                saturate(1.06)
                contrast(1.03);
        }

        .hero-epi__overlay {
            background:
                linear-gradient(
                    100deg,
                    rgba(4, 25, 34, .84),
                    rgba(5, 61, 49, .68) 54%,
                    rgba(7, 115, 58, .54)
                );
        }

        .hero-epi__conteudo {
            position: relative;

            z-index: 2;

            height: 100%;

            display: grid;

            grid-template-columns:
                28%
                48%
                24%;

            align-items: center;

            gap: 2mm;

            padding:
                2.8mm
                4.4mm;
        }

        .marca-safescan {
            display: inline-flex;

            align-items: center;

            gap: 1.7mm;

            color: #ffffff;
        }

        .marca-safescan__simbolo {
            width: 8.5mm;
            height: 8.5mm;

            flex:
                0
                0
                8.5mm;
        }

        .marca-safescan__texto {
            display: flex;

            flex-direction: column;

            line-height: .9;
        }

        .marca-safescan__texto strong {
            font-size: 3.6mm;

            letter-spacing: .04em;

            font-weight: 900;
        }

        .marca-safescan__texto small {
            margin-top: 1mm;

            font-size: 1.55mm;

            letter-spacing: .31em;

            font-weight: 800;

            opacity: .78;
        }

        .hero-epi__titulo {
            min-width: 0;

            text-align: center;

            color: #ffffff;
        }

        .hero-epi__titulo span {
            display: block;

            margin-bottom: 1.1mm;

            color: #6ee7b7;

            font-size: 1.65mm;

            letter-spacing: .18em;

            font-weight: 900;
        }

        .hero-epi__titulo h1 {
            margin: 0;

            font-size: 4.35mm;

            line-height: 1.03;

            font-weight: 950;

            letter-spacing: -.02em;
        }

        .hero-epi__titulo p {
            margin:
                1.25mm
                0
                0;

            font-size: 1.72mm;

            line-height: 1.2;

            font-weight: 700;

            color:
                rgba(
                    255,
                    255,
                    255,
                    .78
                );
        }

        .hero-epi__contratante {
            min-width: 0;

            width: 100%;

            max-width: 55mm;

            justify-self: end;

            padding-left: 3mm;

            display: flex;

            flex-direction: column;

            align-items: flex-end;

            justify-content: center;

            gap: 1.2mm;

            border-left:
                .25mm
                solid
                rgba(
                    255,
                    255,
                    255,
                    .28
                );

            text-align: right;

            color: #ffffff;
        }

        .hero-epi__contratante small {
            display: block;

            margin: 0;

            color: #6ee7b7;

            font-size: 1.45mm;

            line-height: 1;

            letter-spacing: .16em;

            font-weight: 900;
        }

        .hero-epi__contratante-box {
            min-width: 0;

            min-height: 9.5mm;

            max-width: 45mm;

            padding:
                .85mm
                1.4mm;

            display: inline-flex;

            align-items: center;

            justify-content: center;

            overflow: hidden;

            border:
                .18mm
                solid
                rgba(
                    255,
                    255,
                    255,
                    .76
                );

            border-radius: 1.6mm;

            background:
                rgba(
                    255,
                    255,
                    255,
                    .96
                );

            box-shadow:
                0
                .6mm
                2.4mm
                rgba(
                    0,
                    0,
                    0,
                    .14
                );
        }

        .hero-epi__contratante-img {
            display: block;

            width: auto;

            height: auto;

            max-width: 41mm;

            max-height: 8mm;

            object-fit: contain;

            object-position:
                center
                center;
        }

        .hero-epi__contratante-box--texto {
            color: #0b6848;

            font-size: 2.35mm;

            line-height: 1.05;

            font-weight: 950;

            letter-spacing: .02em;

            text-align: center;
        }


        .kpis-epi {
            display: grid;

            grid-template-columns:
                repeat(
                    5,
                    minmax(0, 1fr)
                );

            gap: 2mm;
        }

        .kpi-epi {
            min-height: 13.2mm;

            padding:
                2.2mm
                3mm;

            display: flex;

            align-items: center;

            justify-content:
                space-between;

            gap: 2mm;

            border:
                .18mm
                solid
                #dce7e1;

            border-radius: 2.3mm;

            background: #f8fbf9;
        }

        .kpi-epi span {
            color: #52645c;

            font-size: 1.55mm;

            line-height: 1.1;

            font-weight: 900;

            letter-spacing: .04em;
        }

        .kpi-epi strong {
            color: #0b6848;

            font-size: 4.2mm;

            line-height: 1;

            font-weight: 950;
        }

        .filtros-epi {
            min-height: 8.2mm;

            margin:
                0
                0
                1.8mm;

            padding:
                1.05mm
                1.25mm;

            display: grid;

            grid-template-columns:
                13mm
                repeat(
                    4,
                    minmax(
                        0,
                        1fr
                    )
                )
                minmax(
                    0,
                    2.25fr
                );

            align-items: stretch;

            gap: 1mm;

            border:
                .3mm
                solid
                #d8e3de;

            border-radius: 1.9mm;

            background: #f6faf8;

            flex:
                0
                0
                auto;
        }

        .filtros-epi__rotulo {
            min-height: 5.2mm;

            display: flex;

            align-items: center;

            justify-content: center;

            color: #123f34;

            font-size: 1.8mm;

            line-height: 1;

            font-weight: 950;

            letter-spacing: .055em;

            text-align: center;
        }

        .filtro-epi-inline {
            min-width: 0;

            min-height: 5.2mm;

            padding:
                .6mm
                .8mm;

            display: flex;

            flex-direction: column;

            align-items: center;

            justify-content: center;

            gap: .5mm;

            overflow: hidden;

            border:
                .25mm
                solid
                #d8e3de;

            border-radius: 1.25mm;

            background: #ffffff;

            text-align: center;
        }

        .filtro-epi-inline small {
            width: 100%;

            color: #62706a;

            font-size: 1.35mm;

            line-height: 1;

            font-weight: 850;

            text-transform: uppercase;

            text-align: center;

            white-space: nowrap;
        }

        .filtro-epi-inline strong {
            width: 100%;

            min-width: 0;

            color: #20362c;

            font-size: 1.62mm;

            line-height: 1.08;

            font-weight: 900;

            text-align: center;

            white-space: nowrap;

            overflow: hidden;

            text-overflow: ellipsis;
        }

        .filtro-epi-inline--controle strong {
            font-size: 1.52mm;

            line-height: 1.12;

            white-space: normal;

            overflow: visible;

            text-overflow: clip;
        }


        .corpo-epi {
            min-height: 0;

            flex:
                1
                1
                auto;

            overflow: visible;
        }

        .tabela-epi {
            width: 100%;

            border-collapse: collapse;

            table-layout: fixed;

            border:
                .18mm
                solid
                #cfdad4;

            background: #ffffff;
        }

        .tabela-epi th,
        .tabela-epi td {
            border-right:
                .16mm
                solid
                #d8e1dc;

            border-bottom:
                .16mm
                solid
                #d8e1dc;
        }

        .tabela-epi th:last-child,
        .tabela-epi td:last-child {
            border-right: 0;
        }

        .tabela-epi tbody tr:last-child td {
            border-bottom: 0;
        }

        .tabela-epi th {
            height: 7.6mm;

            padding: 1mm;

            vertical-align: middle;

            background: #eaf4ee;

            color: #263a31;

            font-size: 1.65mm;

            line-height: 1.08;

            font-weight: 950;

            letter-spacing: .035em;

            text-align: center;
        }

        .tabela-epi th.centro,
        .tabela-epi td.centro {
            text-align: center;
        }

        .tabela-epi td {
            padding: 0;

            vertical-align: middle;

            color: #27342d;

            font-size: 1.72mm;

            line-height: 1.15;

            font-weight: 650;

            overflow-wrap: normal;

            word-break: normal;
        }

        /*
         * Padrão permanente:
         *
         * TD controla:
         * - largura;
         * - bordas;
         * - geometria da tabela.
         *
         * Wrapper controla:
         * - padding;
         * - respiro;
         * - alinhamento;
         * - compensação óptica.
         */
        .celula-epi {
            box-sizing: border-box;

            min-height: 6.4mm;

            padding:
                .82mm
                1mm;

            display: flex;

            align-items: center;

            transform: none;
        }

        .celula-epi--centro {
            justify-content: center;

            text-align: center;
        }

        .celula-epi--forte {
            font-weight: 850;

            color: #17251e;
        }

        .ficha-epi,
        .situacao-epi {
            font-size: 1.55mm;

            font-weight: 950;

            letter-spacing: .025em;
        }

        .ficha-epi--ok,
        .situacao-epi--conforme {
            color: #08784f;
        }

        .ficha-epi--pendente,
        .situacao-epi--pendente {
            color: #be123c;
        }

        .ficha-epi--revisar,
        .situacao-epi--revisar {
            color: #a16207;
        }

        /*
         * EPI-CTRL-G3-A-R1
         *
         * Controle de 12 meses:
         * critério administrativo interno.
         *
         * Não altera a situação documental.
         */
        .controle-epi {
            font-size: 1.48mm;

            font-weight: 950;

            letter-spacing: .02em;
        }

        .controle-epi--emdia {
            color: #08784f;
        }

        .controle-epi--revisar {
            color: #a16207;
        }

        .controle-epi--neutro {
            color: #718078;
        }
        .cabecalho-continuacao-epi {
            min-height: 10.2mm;
            height: 10.2mm;

            display: grid;

            grid-template-columns:
                30%
                minmax(0, 1fr)
                24%;

            align-items: center;

            gap: 2mm;

            padding:
                1.45mm
                3mm;

            overflow: hidden;

            border-radius: 2mm;

            background:
                linear-gradient(
                    108deg,
                    rgba(4, 25, 34, .96),
                    rgba(5, 61, 49, .92) 52%,
                    rgba(7, 115, 58, .86)
                ),
                url("${heroControleFichasEpiUrl}");

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

        .cabecalho-continuacao-epi
        .marca-safescan__simbolo {
            width: 5.8mm;
            height: 5.8mm;

            flex-basis: 5.8mm;
        }

        .cabecalho-continuacao-epi
        .marca-safescan__texto strong {
            font-size: 2.35mm;
        }

        .cabecalho-continuacao-epi
        .marca-safescan__texto small {
            margin-top: .55mm;

            font-size: 1mm;
        }

        .cabecalho-continuacao-epi__titulo {
            min-width: 0;

            text-align: center;
        }

        .cabecalho-continuacao-epi__titulo span {
            display: block;

            margin-bottom: .3mm;

            color: #6ee7b7;

            font-size: 1.05mm;

            line-height: 1;

            letter-spacing: .13em;

            font-weight: 900;
        }

        .cabecalho-continuacao-epi__titulo strong {
            display: block;

            margin: 0;

            color: #ffffff;

            font-size: 2.15mm;

            line-height: 1.05;

            font-weight: 950;

            white-space: nowrap;

            overflow: visible;
        }

        .cabecalho-continuacao-epi em {
            justify-self: end;

            color:
                rgba(
                    255,
                    255,
                    255,
                    .84
                );

            font-size: 1.35mm;

            line-height: 1;

            letter-spacing: .11em;

            font-style: normal;

            font-weight: 900;

            white-space: nowrap;
        }

        .corpo-epi--continuacao {
            margin-top: .2mm;
        }

        .rodape-epi {
            min-height: 5.8mm;

            flex:
                0
                0
                5.8mm;

            display: grid;

            grid-template-columns:
                1fr
                auto
                1fr;

            align-items: center;

            gap: 2mm;

            padding-top: 1.2mm;

            border-top:
                .16mm
                solid
                #d9e2dd;

            color: #718078;

            font-size: 1.35mm;

            line-height: 1;

            font-weight: 700;
        }

        .rodape-epi span:nth-child(2) {
            text-align: center;
        }

        .rodape-epi span:last-child {
            text-align: right;

            color: #385247;

            font-weight: 900;
        }

        @page {
            size: A4 landscape;

            margin: 0;
        }

        @media print {
            html,
            body {
                width: ${PDF_LARGURA_MM}mm;

                margin: 0;
                padding: 0;

                background: #ffffff;
            }

            .pagina-relatorio--epi {
                margin: 0;

                page-break-after: always;

                break-after: page;
            }

            .pagina-relatorio--epi:last-child {
                page-break-after: auto;

                break-after: auto;
            }
        }
    `;
}

function montarDocumentoHtml({
    titulo,
    contratanteCabecalho,
    colaboradores,
    filtros,
    resumo,
    dataEmissao,
}) {
    return `<!doctype html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8" />

    <meta
        name="viewport"
        content="width=device-width, initial-scale=1"
    />

    <title>
        ${escaparHTML(
            titulo
        )}
    </title>

    <style>
        ${montarCss()}

        /* =====================================================
           EPI-B5-R2-R1-R2-F2
           AJUSTE FINAL DO RELATÓRIO DE CONTROLE DE FICHAS EPI
           ===================================================== */

        .hero-epi {
            height: 21.5mm;
            min-height: 21.5mm;

            border-radius: 2.4mm;
        }

        .hero-epi__fundo {
            object-position:
                center
                60%;
        }

        .hero-epi__conteudo {
            height: 100%;

            grid-template-columns:
                28%
                48%
                24%;

            align-items: center;

            gap: 2mm;

            padding:
                2mm
                4.4mm;
        }

        .marca-safescan__simbolo {
            width: 7.2mm;
            height: 7.2mm;

            flex:
                0
                0
                7.2mm;
        }

        .marca-safescan__texto strong {
            font-size: 3mm;
        }

        .marca-safescan__texto small {
            margin-top: .65mm;

            font-size: 1.2mm;
        }

        .hero-epi__titulo {
            text-align: center;

            transform:
                translateY(
                    -1.4mm
                );
        }

        .hero-epi__titulo span {
            margin-bottom: .7mm;

            font-size: 1.4mm;
        }

        .hero-epi__titulo h1 {
            margin: 0;

            font-size: 4.55mm;

            line-height: 1.04;

            letter-spacing: -.026em;

            white-space: nowrap;
        }

        .hero-epi__titulo p {
            margin:
                1mm
                0
                0;

            font-size: 1.7mm;

            line-height: 1.05;
        }

        .hero-epi__contratante {
            width: auto;
            max-width: none;

            justify-self: end;

            padding-left: 0;

            display: flex;

            flex-direction: row;

            align-items: center;
            justify-content: flex-end;

            gap: 0;

            border-left: 0;

            text-align: right;
        }

        .hero-epi__contratante-box {
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

            overflow: hidden;

            background:
                rgba(
                    255,
                    255,
                    255,
                    .97
                );

            border:
                .55mm
                solid
                rgba(
                    255,
                    255,
                    255,
                    .98
                );

            border-radius: 1.65mm;

            box-shadow:
                0
                .8mm
                2.5mm
                rgba(
                    0,
                    0,
                    0,
                    .12
                );
        }

        .hero-epi__contratante-img {
            display: block;

            max-width: 21mm;
            max-height: 7.5mm;

            object-fit: contain;
        }

        .tabela-epi th {
            height: 7.2mm;

            padding:
                .8mm
                .55mm;

            vertical-align: middle;

            font-size: 1.48mm;

            line-height: 1.08;

            letter-spacing: .025em;

            text-align: center;
        }

        .tabela-epi td {
            padding: 0;

            vertical-align: middle;

            text-align: center;
        }

        .celula-epi {
            box-sizing: border-box;

            width: 100%;
            min-height: 6.2mm;

            padding:
                .72mm
                .65mm;

            display: flex;

            align-items: center;
            justify-content: center;

            text-align: center;

            transform:
                translateY(
                    -.65mm
                );
        }

        .tabela-epi
        tbody
        td:nth-child(2)
        .celula-epi {
            transform:
                translateY(
                    -1.15mm
                );
        }

        .tabela-epi
        tbody
        td:nth-child(3)
        .celula-epi,
        .tabela-epi
        tbody
        td:nth-child(4)
        .celula-epi {
            transform:
                translateY(
                    -.9mm
                );
        }

        .versao-epi {
            font-variant-numeric:
                tabular-nums;

            font-weight: 800;
        }

        .versao-epi--antiga {
            color: #58675f;
        }

        .versao-epi--atual {
            color: #123f34;

            font-weight: 900;
        }


        /* =====================================================
           EPI-B5-R2-R1-R3-A2
           PADRÃO APROVADO — SOMENTE HERO / KPIs / FILTROS
           ===================================================== */

        /*
         * HERO
         *
         * Geometria da família aprovada:
         * SafeScan à esquerda;
         * título no centro;
         * contratante à direita.
         */

        .hero-epi {
            height: 21.5mm;
            min-height: 21.5mm;

            margin:
                0
                0
                2.2mm;

            overflow: hidden;

            border:
                1px
                solid
                rgba(
                    255,
                    255,
                    255,
                    .18
                );

            border-radius: 2.8mm;

            background: #0a271d;
        }

        .hero-epi__fundo {
            object-fit: cover;

            object-position:
                center
                60%;

            filter: none;
        }

        .hero-epi__overlay {
            background:
                linear-gradient(
                    108deg,
                    rgba(
                        4,
                        25,
                        34,
                        .82
                    )
                    0%,
                    rgba(
                        5,
                        61,
                        49,
                        .70
                    )
                    48%,
                    rgba(
                        7,
                        131,
                        62,
                        .56
                    )
                    100%
                );
        }

        .hero-epi__conteudo {
            height: 100%;

            display: grid;

            grid-template-columns:
                minmax(
                    35mm,
                    .92fr
                )
                minmax(
                    0,
                    1.65fr
                )
                minmax(
                    22mm,
                    .58fr
                );

            align-items: center;

            gap: 3mm;

            padding:
                2.6mm
                3.4mm;
        }

        .hero-epi__marca {
            min-width: 0;

            display: flex;

            align-items: center;
        }

        .hero-epi__titulo {
            min-width: 0;

            text-align: center;

            color: #ffffff;

            transform:
                translateY(
                    -1.4mm
                );
        }

        .hero-epi__titulo h1 {
            margin: 0;

            font-size: 4.55mm;

            line-height: 1.04;

            font-weight: 950;

            letter-spacing: -.026em;

            white-space: nowrap;
        }

        /*
         * LOGO DA CONTRATANTE
         *
         * Moldura branca justa.
         * Nada de caixa branca larga.
         */

        .hero-epi__contratante {
            min-width: 0;

            width: auto;
            max-width: none;

            padding-left: 0;

            display: flex;

            flex-direction: row;

            align-items: center;
            justify-content: flex-end;

            gap: 0;

            border-left: 0;

            text-align: right;
        }

        .hero-epi__contratante small {
            display: none;
        }

        .hero-epi__contratante-box {
            width: auto;

            min-width: 0;
            max-width: 23mm;

            height: auto;

            min-height: 0;
            max-height: 9.5mm;

            padding:
                1mm;

            display: flex;

            align-items: center;
            justify-content: center;

            overflow: hidden;

            background:
                rgba(
                    255,
                    255,
                    255,
                    .97
                );

            border: 0;

            border-radius: 1.65mm;

            box-shadow:
                0
                .8mm
                2.5mm
                rgba(
                    0,
                    0,
                    0,
                    .12
                );
        }

        .hero-epi__contratante-img {
            display: block;

            width: auto;
            height: auto;

            max-width: 21mm;
            max-height: 7.5mm;

            object-fit: contain;

            object-position:
                center
                center;
        }

        .hero-epi__contratante-box--texto {
            color: #123f34;

            font-size: 2.3mm;

            line-height: 1;

            font-weight: 950;

            letter-spacing: .05em;

            text-align: center;
        }

        /*
         * BALÕES / KPIs
         *
         * Preserva os 5 indicadores e sua identidade.
         * Ajuste somente de densidade e centro óptico.
         */

        .kpis-epi {
            display: grid;

            grid-template-columns:
                repeat(
                    5,
                    minmax(
                        0,
                        1fr
                    )
                );

            gap: 1.5mm;

            margin:
                0
                0
                2mm;
        }

        .kpi-epi {
            min-height: 11.2mm;

            padding:
                1.6mm
                2.4mm;

            display: flex;

            align-items: center;

            justify-content:
                space-between;

            gap: 1.5mm;

            border:
                .18mm
                solid
                #dce7e1;

            border-radius: 2.3mm;

            background: #f8fbf9;
        }

        .kpi-epi span {
            display: flex;

            min-height: 100%;

            align-items: center;

            color: #52645c;

            font-size: 1.55mm;

            line-height: 1.08;

            font-weight: 900;

            letter-spacing: .035em;

            transform:
                translateY(
                    -.15mm
                );
        }

        .kpi-epi strong {
            display: flex;

            align-items: center;

            color: #0b6848;

            font-size: 4mm;

            line-height: 1;

            font-weight: 950;

            font-variant-numeric:
                tabular-nums;

            transform:
                translateY(
                    -.2mm
                );
        }

        /*
         * FILTROS
         *
         * Mesmo contrato aprovado, adaptado aos
         * três filtros definidos para este relatório:
         *
         * BUSCA | EMPRESA | CLASSIFICAÇÃO
         */

        .filtros-epi {
            min-height: 10mm;

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
                    3,
                    minmax(
                        0,
                        1fr
                    )
                );

            align-items: center;

            gap: 1.15mm;

            background: #f6faf8;

            border:
                .3mm
                solid
                #d8e3de;

            border-radius: 1.9mm;
        }

        .filtros-epi__rotulo {
            min-height: 6.8mm;

            display: flex;

            align-items: center;
            justify-content: center;

            color: #123f34;

            font-size: 1.95mm;

            line-height: 1;

            font-weight: 950;

            letter-spacing: .055em;

            text-align: center;

            transform: none;
        }

        .filtro-epi-inline {
            min-width: 0;
            min-height: 6.8mm;

            padding:
                .75mm
                .8mm;

            display: flex;

            flex-direction: row;

            align-items: center;
            justify-content: center;

            gap: 1.1mm;

            overflow: visible;

            text-align: center;

            background: #ffffff;

            border:
                .25mm
                solid
                #d8e3de;

            border-radius: 1.25mm;

            transform: none;
        }

        .filtro-epi-inline small {
            width: auto;

            flex:
                0
                0
                auto;

            display: inline-flex;

            align-items: center;

            padding:
                .15mm
                0;

            color: #62706a;

            font-size: 1.55mm;

            line-height: 1.25;

            font-weight: 850;

            text-transform: uppercase;

            text-align: center;

            white-space: nowrap;
        }

        .filtro-epi-inline strong {
            width: auto;

            flex:
                0
                1
                auto;

            display: inline-flex;

            align-items: center;

            justify-content: center;

            padding:
                .15mm
                0;

            min-width: 0;

            margin-top: 0;

            color: #17231f;

            font-size: 1.95mm;

            line-height: 1.25;

            font-weight: 950;

            text-align: center;

            white-space: nowrap;

            overflow: visible;

            text-overflow: clip;
        }
        .filtro-epi-inline {
            align-items: baseline;
            justify-content: center;
            gap: .55mm;
        }

        .filtro-epi-inline small,
        .filtro-epi-inline strong {
            margin: 0;
            padding: 0;
            line-height: 1.05;
            display: block;
            align-items: baseline;
        }

        .filtro-epi-inline small {
            flex: 0 0 auto;

            white-space: nowrap;
        }

        .filtro-epi-inline strong {
            flex: 0 0 auto;

            white-space: nowrap;
            justify-content: flex-start;
        }

        .filtro-epi-inline small::after {
            content: ":";
            margin-left: .25mm;
        }


        /*
         * Classe antiga específica do Controle 12M.
         * O Controle 12M não pertence mais ao bloco de filtros.
         */

        .filtro-epi-inline--controle {
            display: none;
        }

        /* =====================================================
           EPI-B5-R2-R1-R4-KPI
           KPI — HIERARQUIA + CENTRALIZAÇÃO ÓPTICA + CORES
           ===================================================== */

        .kpis-epi {
            gap: 2mm;
        }

        .kpi-epi {
            min-height: 13.2mm;

            padding:
                1.7mm
                2.1mm;

            display: flex;

            flex-direction: row;

            align-items: center;
            justify-content: center;

            gap: 3.2mm;

            text-align: center;

            border-radius: 2.3mm;
        }

        .kpi-epi span {
            margin: 0;

            color: inherit;

            font-size: 1.9mm;

            line-height: 1.05;

            font-weight: 950;

            letter-spacing: .025em;

            text-align: center;

            white-space: nowrap;
        }

        .kpi-epi strong {
            margin: 0;

            color: inherit;

            font-size: 4.6mm;

            line-height: 1;

            font-weight: 950;

            letter-spacing: -.025em;

            text-align: center;

            font-variant-numeric:
                tabular-nums;

            white-space: nowrap;
        }

        /* TOTAL DE COLABORADORES */
        .kpis-epi .kpi-epi:nth-child(1) {
            color: #174a72;

            background: #eef6ff;

            border:
                .22mm
                solid
                #c7dff2;
        }

        /* CONFORMES */
        .kpis-epi .kpi-epi:nth-child(2) {
            color: #08784f;

            background: #ecfdf5;

            border:
                .22mm
                solid
                #b7ead3;
        }

        /* PENDENTES */
        .kpis-epi .kpi-epi:nth-child(3) {
            color: #be123c;

            background: #fff1f2;

            border:
                .22mm
                solid
                #fecdd3;
        }

        /* REVISAR CONTROLE */
        .kpis-epi .kpi-epi:nth-child(4) {
            color: #a16207;

            background: #fffbeb;

            border:
                .22mm
                solid
                #f7dc88;
        }

        /* COBERTURA */
        .kpis-epi .kpi-epi:nth-child(5) {
            color: #0f766e;

            background: #ecfeff;

            border:
                .22mm
                solid
                #a5e6e7;
        }
        /* =====================================================
           EPI-B5-R2-R1-R4-KPI-A2-R1
           RÓTULO + NÚMERO HORIZONTAL E CENTRALIZADOS
           ===================================================== */

        .kpi-epi {
            flex-direction: row;

            align-items: center;
            justify-content: center;

            gap: 1.6mm;

            text-align: center;
        }

        .kpi-epi span {
            width: auto;

            display: inline-flex;

            align-items: center;
            justify-content: center;

            margin: 0;

            line-height: 1;

            text-align: center;

            white-space: nowrap;

            transform: none;
        }

        .kpi-epi strong {
            width: auto;

            display: inline-flex;

            align-items: center;
            justify-content: center;

            margin: 0;

            line-height: 1;

            text-align: center;

            white-space: nowrap;

            transform: translateY(-0.55mm);
        }
</style>
</head>

<body>
    ${montarPaginaInicial({
        titulo,
        contratanteCabecalho,
        colaboradores,
        filtros,
        resumo,
        dataEmissao,
    })}
</body>
</html>`;
}

function paginaTemOverflow(
    pagina
) {
    if (!pagina) {
        return false;
    }

    const tabela =
        pagina.querySelector(
            ".tabela-epi"
        );

    const rodape =
        pagina.querySelector(
            ".rodape-epi"
        );

    if (
        !tabela ||
        !rodape
    ) {
        return (
            pagina.scrollHeight >
            pagina.clientHeight +
                TOLERANCIA_OVERFLOW_PX
        );
    }

    const tabelaRect =
        tabela.getBoundingClientRect();

    const rodapeRect =
        rodape.getBoundingClientRect();

    const tabelaInvadiuRodape =
        tabelaRect.bottom >
        rodapeRect.top -
            FOLGA_RODAPE_PX;

    const paginaExcedeuAltura =
        pagina.scrollHeight >
        pagina.clientHeight +
            TOLERANCIA_OVERFLOW_PX;

    return (
        tabelaInvadiuRodape ||
        paginaExcedeuAltura
    );
}

function criarPaginaContinuacao(
    documento,
    {
        titulo,
        dataEmissao,
    }
) {
    const recipiente =
        documento.createElement(
            "div"
        );

    recipiente.innerHTML =
        montarPaginaContinuacao({
            titulo,
            dataEmissao,
        }).trim();

    return recipiente.firstElementChild;
}

function obterFolgaUtilPagina(
    pagina
) {
    if (!pagina) {
        return 0;
    }

    const tabela =
        pagina.querySelector(
            ".tabela-epi"
        );

    const rodape =
        pagina.querySelector(
            ".rodape-epi"
        );

    if (
        !tabela ||
        !rodape
    ) {
        return 0;
    }

    const tabelaRect =
        tabela.getBoundingClientRect();

    const rodapeRect =
        rodape.getBoundingClientRect();

    return Math.max(
        0,
        rodapeRect.top -
            tabelaRect.bottom -
            FOLGA_RODAPE_PX
    );
}

function rebalancearPaginasContinuacao(
    documento
) {
    const paginas =
        Array.from(
            documento.querySelectorAll(
                ".pagina-relatorio--epi-continuacao"
            )
        );

    if (
        paginas.length < 2
    ) {
        return;
    }

    /*
     * Não igualamos quantidade de registros.
     *
     * O algoritmo compara espaço branco físico real
     * entre páginas de continuação.
     */
    for (
        let indice =
            paginas.length - 1;
        indice > 0;
        indice -= 1
    ) {
        const anterior =
            paginas[indice - 1];

        const atual =
            paginas[indice];

        const tbodyAnterior =
            anterior.querySelector(
                ".tabela-epi tbody"
            );

        const tbodyAtual =
            atual.querySelector(
                ".tabela-epi tbody"
            );

        if (
            !tbodyAnterior ||
            !tbodyAtual
        ) {
            continue;
        }

        let guarda = 0;

        while (
            tbodyAnterior.rows.length > 1
        ) {
            guarda += 1;

            if (
                guarda > 100
            ) {
                throw new Error(
                    "Rebalanceamento físico do relatório de EPI excedeu o limite de segurança."
                );
            }

            const folgaAnterior =
                obterFolgaUtilPagina(
                    anterior
                );

            const folgaAtual =
                obterFolgaUtilPagina(
                    atual
                );

            if (
                folgaAtual <=
                folgaAnterior + 4
            ) {
                break;
            }

            const diferencaAntes =
                Math.abs(
                    folgaAtual -
                    folgaAnterior
                );

            const linha =
                tbodyAnterior.rows[
                    tbodyAnterior.rows.length - 1
                ];

            tbodyAtual.insertBefore(
                linha,
                tbodyAtual.firstChild
            );

            if (
                paginaTemOverflow(
                    atual
                )
            ) {
                tbodyAnterior.appendChild(
                    linha
                );

                break;
            }

            const novaFolgaAnterior =
                obterFolgaUtilPagina(
                    anterior
                );

            const novaFolgaAtual =
                obterFolgaUtilPagina(
                    atual
                );

            const diferencaDepois =
                Math.abs(
                    novaFolgaAtual -
                    novaFolgaAnterior
                );

            if (
                diferencaDepois >=
                diferencaAntes - 1
            ) {
                tbodyAnterior.appendChild(
                    linha
                );

                break;
            }
        }
    }
}
function paginarRelatorio(
    documento,
    {
        titulo,
        dataEmissao,
    }
) {
    let paginaAtual =
        documento.querySelector(
            ".pagina-relatorio--epi-inicial"
        );

    if (!paginaAtual) {
        throw new Error(
            "Página inicial do relatório de EPI não foi localizada."
        );
    }

    let guarda = 0;

    while (
        paginaTemOverflow(
            paginaAtual
        )
    ) {
        guarda += 1;

        if (guarda > 200) {
            throw new Error(
                "Paginação do relatório de EPI excedeu o limite de segurança."
            );
        }

        const tbodyAtual =
            paginaAtual.querySelector(
                ".tabela-epi tbody"
            );

        if (
            !tbodyAtual ||
            tbodyAtual.rows.length <= 1
        ) {
            break;
        }

        const paginaNova =
            criarPaginaContinuacao(
                documento,
                {
                    titulo,
                    dataEmissao,
                }
            );

        const tbodyNovo =
            paginaNova.querySelector(
                ".tabela-epi tbody"
            );

        if (!tbodyNovo) {
            throw new Error(
                "Tabela de continuação do relatório de EPI não foi localizada."
            );
        }

        paginaAtual.after(
            paginaNova
        );

        /*
         * Move fisicamente a última linha da página que
         * estourou para o início da continuação.
         *
         * A medição é real no DOM.
         *
         * Não existe:
         * - chunk de 10;
         * - chunk de 20;
         * - redução automática de fonte.
         */
        while (
            paginaTemOverflow(
                paginaAtual
            ) &&
            tbodyAtual.rows.length > 1
        ) {
            const ultimaLinha =
                tbodyAtual.rows[
                    tbodyAtual.rows.length - 1
                ];

            tbodyNovo.insertBefore(
                ultimaLinha,
                tbodyNovo.firstChild
            );
        }

        if (
            tbodyNovo.rows.length === 0
        ) {
            paginaNova.remove();

            break;
        }

        paginaAtual =
            paginaNova;
    }

    /*
     * Primeiro:
     * paginação por limite físico.
     *
     * Depois:
     * balanceamento somente entre continuações,
     * também pela geometria física real.
     */
    rebalancearPaginasContinuacao(
        documento
    );

    const paginas =
        Array.from(
            documento.querySelectorAll(
                ".pagina-relatorio--epi"
            )
        );

    paginas.forEach(
        (
            pagina,
            indice
        ) => {
            const numero =
                pagina.querySelector(
                    ".rodape-epi__pagina"
                );

            if (numero) {
                numero.textContent =
                    `Página ${indice + 1} de ${paginas.length}`;
            }
        }
    );

    return paginas;
}

function aguardarImagem(
    imagem
) {
    if (
        !imagem ||
        imagem.complete
    ) {
        return Promise.resolve();
    }

    return new Promise(
        (resolve) => {
            const finalizar =
                () => resolve();

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

async function aguardarRecursos(
    documento
) {
    if (
        documento?.fonts?.ready
    ) {
        await documento.fonts.ready;
    }

    const imagens =
        Array.from(
            documento?.images ||
            []
        );

    await Promise.all(
        imagens.map(
            aguardarImagem
        )
    );

    await new Promise(
        (resolve) =>
            requestAnimationFrame(
                () =>
                    requestAnimationFrame(
                        resolve
                    )
            )
    );
}

async function baixarPaginasComoPdf({
    paginas,
    nomeArquivo,
}) {
    const pdf =
        new jsPDF({
            orientation: "landscape",

            unit: "mm",

            format: "a4",

            compress: true,
        });

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
                "landscape"
            );
        }

        const canvas =
            await html2canvas(
                pagina,
                {
                    scale:
                        ESCALA_RENDERIZACAO,

                    useCORS: true,

                    backgroundColor:
                        "#ffffff",

                    logging: false,

                    windowWidth:
                        pagina.scrollWidth,

                    windowHeight:
                        pagina.scrollHeight,
                }
            );

        const imagem =
            canvas.toDataURL(
                "image/jpeg",
                0.95
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
        nomeArquivo
    );
}

export async function baixarRelatorioControleFichasEpiPDF({
    nomeArquivo =
        "relatorio-controle-fichas-epi.pdf",

    titulo =
        "Relatório de Controle de Fichas de EPI",

    contratanteCabecalho =
        null,

    colaboradores =
        [],

    filtros =
        {},
} = {}) {
    if (
        typeof document ===
        "undefined"
    ) {
        throw new Error(
            "O relatório de controle de fichas de EPI exige ambiente de navegador."
        );
    }

    const listaPreparada =
        prepararListaColaboradores(
            colaboradores
        );

    /*
     * EPI-FILTROS-3
     *
     * O filtro específico da ficha de EPI é aplicado
     * SOMENTE depois da normalização canônica.
     *
     * Assim:
     * - situação EPI não duplica regra da tela;
     * - KPIs usam exatamente a lista filtrada;
     * - paginação usa exatamente a lista filtrada.
     */
    const lista =
        aplicarFiltrosControleFichasEpi(
            listaPreparada,
            filtros
        );

    const filtrosEpiExibicao =
        obterFiltrosControleFichasEpiParaExibicao(
            filtros
        );

    if (!lista.length) {
        return false;
    }

    const resumo =
        calcularResumo(
            lista
        );

    const dataEmissao =
        formatarDataHoraEmissao(
            new Date()
        );

    const html =
        montarDocumentoHtml({
            titulo,
            contratanteCabecalho,
            colaboradores:
                lista,
            filtros:
                filtrosEpiExibicao,
            resumo,
            dataEmissao,
        });

    const iframe =
        document.createElement(
            "iframe"
        );

    iframe.setAttribute(
        "aria-hidden",
        "true"
    );

    iframe.style.position =
        "fixed";

    iframe.style.left =
        "-100000px";

    iframe.style.top =
        "0";

    iframe.style.width =
        "1400px";

    iframe.style.height =
        "1000px";

    iframe.style.border =
        "0";

    iframe.style.opacity =
        "0";

    iframe.style.pointerEvents =
        "none";

    document.body.appendChild(
        iframe
    );

    try {
        const documento =
            iframe.contentDocument;

        if (!documento) {
            throw new Error(
                "Não foi possível preparar o documento isolado do relatório de EPI."
            );
        }

        documento.open();

        documento.write(
            html
        );

        documento.close();

        await aguardarRecursos(
            documento
        );

        const paginas =
            paginarRelatorio(
                documento,
                {
                    titulo,
                    dataEmissao,
                }
            );

        await aguardarRecursos(
            documento
        );

        const overflowRestante =
            paginas.find(
                paginaTemOverflow
            );

        if (
            overflowRestante
        ) {
            throw new Error(
                "O relatório de EPI ainda possui overflow físico após a paginação."
            );
        }

        await baixarPaginasComoPdf({
            paginas,
            nomeArquivo,
        });

        return true;
    }
    finally {
        iframe.remove();
    }
}